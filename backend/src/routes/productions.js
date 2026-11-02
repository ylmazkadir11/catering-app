/**
 * Üretim Modülü Route'ları - EN KRİTİK MODÜL
 * =============================================
 * Menü onaylı olmadan üretim başlatılamaz.
 * Stok düşümü FIFO ile üretim onayında yapılır.
 */

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');

const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');
const { deductStock, estimateCost } = require('../utils/fifo');
const reportService = require('../services/reportService');

// Tüm route'lar için kimlik doğrulama gerekli
router.use(authenticate);

// ─────────────────────────────────────────────
// GET /api/productions - Üretim listesi
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, status, meal_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['1=1'];
    let values = [];
    let idx = 1;

    if (startDate) { conditions.push(`p.production_date >= $${idx++}`); values.push(startDate); }
    if (endDate)   { conditions.push(`p.production_date <= $${idx++}`); values.push(endDate); }
    if (status)    { conditions.push(`p.status = $${idx++}`);          values.push(status); }
    if (meal_type) { conditions.push(`p.meal_type = $${idx++}`);       values.push(meal_type); }

    const countRes = await db.query(
      `SELECT COUNT(*) FROM productions p WHERE ${conditions.join(' AND ')}`,
      values
    );

    values.push(parseInt(limit), offset);
    const result = await db.query(
      `SELECT p.*, m.menu_date,
              u1.full_name AS confirmed_by_name,
              u2.full_name AS created_by_name
       FROM productions p
       JOIN menus m ON m.id = p.menu_id
       LEFT JOIN users u1 ON u1.id = p.confirmed_by
       LEFT JOIN users u2 ON u2.id = p.created_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.production_date DESC, p.meal_type
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/productions/calculate
// Stok düşmeden malzeme listesi hesapla
// ─────────────────────────────────────────────
router.post(
  '/calculate',
  [
    body('menuId').isUUID().withMessage('Geçerli menü ID zorunlu'),
    body('mealType').isIn(['breakfast','lunch','dinner','snack']).withMessage('Geçerli öğün tipi zorunlu'),
    body('personCount').isInt({ min: 1 }).withMessage('Kişi sayısı en az 1 olmalı'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { menuId, mealType, personCount } = req.body;
      const count = parseInt(personCount);

      // Menüyü ve onay durumunu kontrol et
      const menuRes = await db.query(
        `SELECT id, menu_date, is_approved FROM menus WHERE id = $1`,
        [menuId]
      );

      if (menuRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Menü bulunamadı.' });
      }

      if (!menuRes.rows[0].is_approved) {
        return res.status(400).json({
          success: false,
          message: 'Menü henüz onaylanmamış. Üretim başlatmak için önce menüyü onaylayın.'
        });
      }

      // Öğüne ait yemeklerin reçetelerini ve malzemelerini getir
      const itemsRes = await db.query(
        `SELECT ri.material_id, SUM(ri.quantity) AS total_qty_per_person,
                ri.unit_id, m.name AS material_name, u.name AS unit_name,
                u.abbreviation AS unit_abbr, m.current_stock,
                mat.minimum_stock
         FROM menu_items mi
         JOIN recipe_items ri ON ri.recipe_id = mi.recipe_id
         JOIN materials m ON m.id = ri.material_id
         JOIN units u ON u.id = ri.unit_id
         LEFT JOIN materials mat ON mat.id = ri.material_id
         WHERE mi.menu_id = $1
           AND mi.meal_type = $2
           AND m.is_active = TRUE
         GROUP BY ri.material_id, ri.unit_id, m.name, u.name, u.abbreviation,
                  m.current_stock, mat.minimum_stock`,
        [menuId, mealType]
      );

      if (itemsRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Bu öğün için menüde yemek bulunamadı.`
        });
      }

      // Kişi sayısıyla çarp, tahmini maliyet hesapla
      const calculatedItems = [];
      let totalEstimatedCost = 0;

      for (const item of itemsRes.rows) {
        const requiredQty = parseFloat(item.total_qty_per_person) * count;
        const { estimatedCost, hasSufficientStock } = await estimateCost(item.material_id, requiredQty);

        totalEstimatedCost += estimatedCost;
        calculatedItems.push({
          material_id: item.material_id,
          material_name: item.material_name,
          unit_id: item.unit_id,
          unit_name: item.unit_name,
          unit_abbr: item.unit_abbr,
          qty_per_person: parseFloat(item.total_qty_per_person),
          calculated_qty: requiredQty,
          actual_qty: requiredQty, // Kullanıcı değiştirebilir
          current_stock: parseFloat(item.current_stock),
          estimated_cost: estimatedCost,
          has_sufficient_stock: hasSufficientStock,
          stock_warning: !hasSufficientStock
        });
      }

      res.json({
        success: true,
        data: {
          menu_date: menuRes.rows[0].menu_date,
          meal_type: mealType,
          person_count: count,
          items: calculatedItems,
          total_estimated_cost: totalEstimatedCost,
          has_stock_warning: calculatedItems.some(i => i.stock_warning)
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/productions - Taslak üretim oluştur
// ─────────────────────────────────────────────
router.post(
  '/',
  [
    body('menu_id').isUUID().withMessage('Menü ID zorunlu'),
    body('meal_type').isIn(['breakfast','lunch','dinner','snack']).withMessage('Geçerli öğün tipi zorunlu'),
    body('person_count').isInt({ min: 1 }).withMessage('Kişi sayısı en az 1 olmalı'),
    body('items').isArray({ min: 1 }).withMessage('Malzeme listesi zorunlu'),
  ],
  async (req, res, next) => {
    const client = await db.getClient();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { menu_id, meal_type, person_count, items, notes } = req.body;

      // Menü onay kontrolü
      const menuRes = await db.query(
        `SELECT id, menu_date, is_approved FROM menus WHERE id = $1`,
        [menu_id]
      );

      if (menuRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Menü bulunamadı.' });
      }

      if (!menuRes.rows[0].is_approved) {
        return res.status(400).json({
          success: false,
          message: 'Menü onaylanmadan üretim oluşturulamaz.'
        });
      }

      // Aynı menü + öğün için draft üretim var mı?
      const existing = await db.query(
        `SELECT id FROM productions WHERE menu_id = $1 AND meal_type = $2 AND status != 'cancelled'`,
        [menu_id, meal_type]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Bu öğün için zaten aktif bir üretim mevcut.'
        });
      }

      await client.query('BEGIN');

      // Üretim kaydı oluştur
      const prodRes = await client.query(
        `INSERT INTO productions
           (menu_id, production_date, meal_type, person_count, status, notes, created_by)
         VALUES ($1, $2, $3, $4, 'draft', $5, $6)
         RETURNING id`,
        [menu_id, menuRes.rows[0].menu_date, meal_type, person_count, notes || null, req.user.id]
      );

      const productionId = prodRes.rows[0].id;

      // Üretim kalemlerini kaydet
      for (const item of items) {
        await client.query(
          `INSERT INTO production_items
             (production_id, material_id, calculated_qty, actual_qty, unit_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            productionId,
            item.material_id,
            item.calculated_qty,
            item.actual_qty || item.calculated_qty,
            item.unit_id
          ]
        );
      }

      await client.query('COMMIT');

      await logAction(req.user.id, req.user.username, 'CREATE_PRODUCTION', 'production',
        productionId, null, { menu_id, meal_type, person_count }, req.ip);

      res.status(201).json({
        success: true,
        message: 'Üretim taslağı oluşturuldu.',
        data: { id: productionId }
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/productions/:id
// ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const prodRes = await db.query(
      `SELECT p.*, m.menu_date, m.is_approved AS menu_approved,
              u1.full_name AS confirmed_by_name,
              u2.full_name AS created_by_name
       FROM productions p
       JOIN menus m ON m.id = p.menu_id
       LEFT JOIN users u1 ON u1.id = p.confirmed_by
       LEFT JOIN users u2 ON u2.id = p.created_by
       WHERE p.id = $1`,
      [id]
    );

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Üretim bulunamadı.' });
    }

    // Üretim kalemlerini getir
    const itemsRes = await db.query(
      `SELECT pi.*, mat.name AS material_name, u.abbreviation AS unit_abbr, u.name AS unit_name
       FROM production_items pi
       JOIN materials mat ON mat.id = pi.material_id
       JOIN units u ON u.id = pi.unit_id
       WHERE pi.production_id = $1`,
      [id]
    );

    const production = prodRes.rows[0];
    production.items = itemsRes.rows;

    res.json({ success: true, data: production });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// PUT /api/productions/:id - Güncelle (sadece draft)
// ─────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { person_count, items, notes } = req.body;

    const prodRes = await db.query(
      `SELECT id, status FROM productions WHERE id = $1`,
      [id]
    );

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Üretim bulunamadı.' });
    }

    if (prodRes.rows[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Sadece taslak (draft) durumundaki üretimler güncellenebilir.'
      });
    }

    await client.query('BEGIN');

    if (person_count) {
      await client.query(
        `UPDATE productions SET person_count = $1, notes = $2, updated_at = NOW() WHERE id = $3`,
        [person_count, notes || null, id]
      );
    }

    // Kalemleri güncelle
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `UPDATE production_items
           SET actual_qty = $1, updated_at = NOW()
           WHERE production_id = $2 AND material_id = $3`,
          [item.actual_qty, id, item.material_id]
        );
      }
    }

    await client.query('COMMIT');

    await logAction(req.user.id, req.user.username, 'UPDATE_PRODUCTION', 'production',
      id, { status: 'draft' }, { person_count, notes }, req.ip);

    res.json({ success: true, message: 'Üretim güncellendi.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────
// POST /api/productions/:id/confirm - ÜRETİMİ ONAYLA (FIFO stok düş)
// ─────────────────────────────────────────────
router.post(
  '/:id/confirm',
  authorize('admin', 'chef'),
  async (req, res, next) => {
    const client = await db.getClient();
    try {
      const { id } = req.params;

      // Üretimi ve menü onay durumunu kontrol et
      const prodRes = await db.query(
        `SELECT p.*, m.is_approved AS menu_approved, m.menu_date
         FROM productions p
         JOIN menus m ON m.id = p.menu_id
         WHERE p.id = $1`,
        [id]
      );

      if (prodRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Üretim bulunamadı.' });
      }

      const production = prodRes.rows[0];

      // Menü onay kontrolü - KRİTİK KURAL
      if (!production.menu_approved) {
        return res.status(400).json({
          success: false,
          message: 'Menü onaylanmadan üretim onaylanamaz. Önce menüyü onaylayın.'
        });
      }

      if (production.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: `Üretim zaten "${production.status}" durumunda.`
        });
      }

      // Üretim kalemlerini al
      const itemsRes = await db.query(
        `SELECT pi.*, mat.name AS material_name
         FROM production_items pi
         JOIN materials mat ON mat.id = pi.material_id
         WHERE pi.production_id = $1`,
        [id]
      );

      if (itemsRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Üretim kalemleri bulunamadı.' });
      }

      await client.query('BEGIN');

      let totalProductionCost = 0;

      // Her malzeme için FIFO stok düş
      for (const item of itemsRes.rows) {
        try {
          const { totalCost } = await deductStock(
            client,
            item.material_id,
            item.actual_qty,
            id,
            req.user.id
          );

          totalProductionCost += totalCost;

          // Maliyet bilgisini production_items'a yaz
          await client.query(
            `UPDATE production_items SET total_cost = $1, updated_at = NOW()
             WHERE id = $2`,
            [totalCost, item.id]
          );
        } catch (stockErr) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Stok yetersiz: ${stockErr.message}`
          });
        }
      }

      // Üretimi onayla
      await client.query(
        `UPDATE productions
         SET status = 'confirmed',
             confirmed_by = $1,
             confirmed_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [req.user.id, id]
      );

      await client.query('COMMIT');

      await logAction(req.user.id, req.user.username, 'CONFIRM_PRODUCTION', 'production',
        id, { status: 'draft' }, { status: 'confirmed', total_cost: totalProductionCost }, req.ip);

      res.json({
        success: true,
        message: 'Üretim onaylandı. Stoklar FIFO prensibiyle düşürüldü.',
        data: {
          productionId: id,
          totalCost: totalProductionCost,
          confirmedAt: new Date().toISOString()
        }
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/productions/:id/cancel - İptal
// ─────────────────────────────────────────────
router.post('/:id/cancel', authorize('admin', 'chef'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const prodRes = await db.query(
      `SELECT id, status FROM productions WHERE id = $1`,
      [id]
    );

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Üretim bulunamadı.' });
    }

    if (prodRes.rows[0].status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Onaylanmış üretim iptal edilemez. Lütfen yöneticinize başvurun.'
      });
    }

    await db.query(
      `UPDATE productions
       SET status = 'cancelled',
           cancelled_by = $1,
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [req.user.id, id]
    );

    await logAction(req.user.id, req.user.username, 'CANCEL_PRODUCTION', 'production',
      id, { status: prodRes.rows[0].status }, { status: 'cancelled' }, req.ip);

    res.json({ success: true, message: 'Üretim iptal edildi.' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/productions/:id/report - Rapor indir
// ─────────────────────────────────────────────
router.get('/:id/report', async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'json'; // pdf, excel, json

    const prodRes = await db.query(
      `SELECT p.*, m.menu_date, m.is_approved AS menu_approved,
              u.full_name AS confirmed_by_name
       FROM productions p
       JOIN menus m ON m.id = p.menu_id
       LEFT JOIN users u ON u.id = p.confirmed_by
       WHERE p.id = $1 AND p.status = 'confirmed'`,
      [id]
    );

    if (prodRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Onaylanmış üretim bulunamadı.'
      });
    }

    const production = prodRes.rows[0];

    // Üretim kalemlerini getir
    const itemsRes = await db.query(
      `SELECT pi.*, mat.name AS material_name, u.abbreviation AS unit_abbr
       FROM production_items pi
       JOIN materials mat ON mat.id = pi.material_id
       JOIN units u ON u.id = pi.unit_id
       WHERE pi.production_id = $1
       ORDER BY mat.name`,
      [id]
    );

    production.items = itemsRes.rows;

    // Rapor alındı olarak işaretle
    await db.query(
      `UPDATE productions SET report_generated = TRUE, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await logAction(req.user.id, req.user.username, 'DOWNLOAD_PRODUCTION_REPORT', 'production',
      id, null, { format }, req.ip);

    if (format === 'json') {
      return res.json({ success: true, data: production });
    }

    // PDF veya Excel formatı
    const mealTypeLabels = {
      breakfast: 'Sabah',
      lunch: 'Öğle',
      dinner: 'Akşam',
      snack: 'Ara Öğün'
    };

    const reportData = {
      title: `Üretim Raporu - ${production.menu_date} ${mealTypeLabels[production.meal_type]}`,
      production_date: production.menu_date,
      meal_type: mealTypeLabels[production.meal_type],
      person_count: production.person_count,
      confirmed_by: production.confirmed_by_name,
      confirmed_at: production.confirmed_at,
      items: production.items,
      total_cost: production.items.reduce((sum, i) => sum + parseFloat(i.total_cost || 0), 0)
    };

    if (format === 'pdf') {
      const buffer = await reportService.exportToPDF(reportData, 'production');
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="uretim-raporu-${id.substring(0, 8)}.pdf"`
      });
      return res.send(buffer);
    }

    if (format === 'excel') {
      const buffer = await reportService.exportToExcel(reportData, 'production');
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="uretim-raporu-${id.substring(0, 8)}.xlsx"`
      });
      return res.send(buffer);
    }

    res.status(400).json({ success: false, message: 'Geçersiz format. pdf, excel veya json kullanın.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

