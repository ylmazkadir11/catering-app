/**
 * Menü Planlama Route'ları
 * ===========================
 * Günlük 4 öğün: Sabah, Öğle, Akşam (maks 5 çeşit), Ara Öğün (maks 3 çeşit).
 * Onay mekanizması ve üretim entegrasyonu.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');

router.use(authenticate);

// Maksimum yemek sayısı kısıtlamaları
const MEAL_LIMITS = {
  breakfast: 5,
  lunch: 5,
  dinner: 5,
  snack: 3,
};

// GET /api/menus - Menü listesi (Tarih aralığına göre)
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, date } = req.query;

    let conditions = ['1=1'];
    let values = [];
    let idx = 1;

    if (date) {
      conditions.push(`m.menu_date = $${idx++}`);
      values.push(date);
    } else {
      if (startDate) {
        conditions.push(`m.menu_date >= $${idx++}`);
        values.push(startDate);
      }
      if (endDate) {
        conditions.push(`m.menu_date <= $${idx++}`);
        values.push(endDate);
      }
    }

    const result = await db.query(
      `SELECT m.*, u.full_name AS approved_by_name,
              COUNT(mi.id) AS total_items
       FROM menus m
       LEFT JOIN users u ON u.id = m.approved_by
       LEFT JOIN menu_items mi ON mi.menu_id = m.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY m.id, u.full_name
       ORDER BY m.menu_date DESC`,
      values
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/menus/:id - Menü detayı ve öğünlere göre yemekler
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const menuRes = await db.query(
      `SELECT m.*, u.full_name AS approved_by_name
       FROM menus m
       LEFT JOIN users u ON u.id = m.approved_by
       WHERE m.id = $1`,
      [id]
    );

    if (menuRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Menü bulunamadı.' });
    }

    const itemsRes = await db.query(
      `SELECT mi.*, r.name AS recipe_name, r.category AS recipe_category
       FROM menu_items mi
       JOIN recipes r ON r.id = mi.recipe_id
       WHERE mi.menu_id = $1
       ORDER BY mi.meal_type, mi.sort_order ASC`,
      [id]
    );

    const menu = menuRes.rows[0];
    menu.items = itemsRes.rows;

    res.json({ success: true, data: menu });
  } catch (err) {
    next(err);
  }
});

// POST /api/menus - Yeni menü planı oluştur (Admin veya Şef)
router.post(
  '/',
  authorize('admin', 'chef'),
  [
    body('menu_date').isISO8601().withMessage('Geçerli bir menü tarihi giriniz (YYYY-MM-DD)'),
    body('items').isArray().withMessage('Menü kalemleri listesi zorunlu'),
  ],
  async (req, res, next) => {
    const client = await db.getClient();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { menu_date, notes, items } = req.body;

      // Aynı tarihe ait menü var mı kontrol et
      const checkRes = await db.query(`SELECT id FROM menus WHERE menu_date = $1`, [menu_date]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Bu tarihe ait zaten bir menü planı mevcut.' });
      }

      // Öğün limitlerini kontrol et
      const mealCounts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
      for (const item of items) {
        if (!MEAL_LIMITS[item.meal_type]) {
          return res.status(400).json({ success: false, message: `Geçersiz öğün tipi: ${item.meal_type}` });
        }
        mealCounts[item.meal_type]++;
        if (mealCounts[item.meal_type] > MEAL_LIMITS[item.meal_type]) {
          return res.status(400).json({
            success: false,
            message: `${item.meal_type} öğünü için maksimum ${MEAL_LIMITS[item.meal_type]} çeşit seçilebilir!`,
          });
        }
      }

      await client.query('BEGIN');

      const menuRes = await client.query(
        `INSERT INTO menus (menu_date, notes, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [menu_date, notes || null, req.user.id]
      );
      const menu = menuRes.rows[0];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await client.query(
          `INSERT INTO menu_items (menu_id, meal_type, recipe_id, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [menu.id, it.meal_type, it.recipe_id, it.sort_order || i]
        );
      }

      await client.query('COMMIT');

      await logAction(
        req.user.id,
        req.user.username,
        'CREATE_MENU',
        'menu',
        menu.id,
        null,
        { menu_date, itemsCount: items.length },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Menü başarıyla oluşturuldu.',
        data: menu,
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

// PUT /api/menus/:id - Menü güncelle (Onaylanmamışsa)
router.put(
  '/:id',
  authorize('admin', 'chef'),
  async (req, res, next) => {
    const client = await db.getClient();
    try {
      const { id } = req.params;
      const { notes, items } = req.body;

      const oldRes = await db.query(`SELECT * FROM menus WHERE id = $1`, [id]);
      if (oldRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Menü bulunamadı.' });
      }

      const currentMenu = oldRes.rows[0];
      if (currentMenu.is_approved) {
        return res.status(400).json({
          success: false,
          message: 'Onaylanmış menü doğrudan değiştirilemez. Önce onayı kaldırınız.',
        });
      }

      if (items && Array.isArray(items)) {
        const mealCounts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
        for (const item of items) {
          if (!MEAL_LIMITS[item.meal_type]) {
            return res.status(400).json({ success: false, message: `Geçersiz öğün: ${item.meal_type}` });
          }
          mealCounts[item.meal_type]++;
          if (mealCounts[item.meal_type] > MEAL_LIMITS[item.meal_type]) {
            return res.status(400).json({
              success: false,
              message: `${item.meal_type} için maksimum ${MEAL_LIMITS[item.meal_type]} çeşit seçilebilir!`,
            });
          }
        }
      }

      await client.query('BEGIN');

      await client.query(
        `UPDATE menus SET notes = COALESCE($1, notes), updated_at = NOW() WHERE id = $2`,
        [notes, id]
      );

      if (items && Array.isArray(items)) {
        await client.query(`DELETE FROM menu_items WHERE menu_id = $1`, [id]);
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          await client.query(
            `INSERT INTO menu_items (menu_id, meal_type, recipe_id, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [id, it.meal_type, it.recipe_id, it.sort_order || i]
          );
        }
      }

      await client.query('COMMIT');

      await logAction(req.user.id, req.user.username, 'UPDATE_MENU', 'menu', id, currentMenu, req.body, req.ip);

      res.json({ success: true, message: 'Menü güncellendi.' });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

// POST /api/menus/:id/approve - Menüyü Onayla (Admin veya Şef)
router.post('/:id/approve', authorize('admin', 'chef'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const menuRes = await db.query(`SELECT * FROM menus WHERE id = $1`, [id]);
    if (menuRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Menü bulunamadı.' });
    }

    if (menuRes.rows[0].is_approved) {
      return res.status(400).json({ success: false, message: 'Menü zaten onaylanmış.' });
    }

    // Menüde yemek var mı kontrolü
    const itemsCheck = await db.query(`SELECT COUNT(*) FROM menu_items WHERE menu_id = $1`, [id]);
    if (parseInt(itemsCheck.rows[0].count) === 0) {
      return res.status(400).json({ success: false, message: 'Boş menü onaylanamaz. Lütfen yemek ekleyin.' });
    }

    await db.query(
      `UPDATE menus
       SET is_approved = TRUE,
           approved_by = $1,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [req.user.id, id]
    );

    await logAction(
      req.user.id,
      req.user.username,
      'APPROVE_MENU',
      'menu',
      id,
      { is_approved: false },
      { is_approved: true },
      req.ip
    );

    res.json({ success: true, message: 'Menü başarıyla onaylandı. Artık üretime geçilebilir.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/menus/:id/unapprove - Menü Onayını Kaldır (Eğer üretim yapılmadıysa)
router.post('/:id/unapprove', authorize('admin', 'chef'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Bağlı onaylanmış üretim var mı?
    const prodCheck = await db.query(
      `SELECT id FROM productions WHERE menu_id = $1 AND status = 'confirmed'`,
      [id]
    );

    if (prodCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu menüye ait onaylanmış üretim bulunmaktadır. Menü onayı kaldırılamaz!',
      });
    }

    await db.query(
      `UPDATE menus
       SET is_approved = FALSE,
           approved_by = NULL,
           approved_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await logAction(
      req.user.id,
      req.user.username,
      'UNAPPROVE_MENU',
      'menu',
      id,
      { is_approved: true },
      { is_approved: false },
      req.ip
    );

    res.json({ success: true, message: 'Menü onayı kaldırıldı.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/menus/:id - Menü Sil
router.delete('/:id', authorize('admin', 'chef'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const prodCheck = await db.query(`SELECT id FROM productions WHERE menu_id = $1`, [id]);
    if (prodCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu menüye bağlı üretim kayıtları olduğu için silinemez.',
      });
    }

    const menuRes = await db.query(`SELECT * FROM menus WHERE id = $1`, [id]);
    if (menuRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Menü bulunamadı.' });
    }

    await db.query(`DELETE FROM menus WHERE id = $1`, [id]);
    await logAction(req.user.id, req.user.username, 'DELETE_MENU', 'menu', id, menuRes.rows[0], null, req.ip);

    res.json({ success: true, message: 'Menü silindi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

