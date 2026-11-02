/**
 * Yemek & Reçete Yönetimi Route'ları
 * =====================================
 * Yemek ve reçete tanımlama, kişi başı gramaj girme,
 * reçete kalemlerini yönetme.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');

router.use(authenticate);

// GET /api/recipes - Reçete listesi
router.get('/', async (req, res, next) => {
  try {
    const { search, category } = req.query;

    let conditions = ['r.is_active = TRUE'];
    let values = [];
    let idx = 1;

    if (search) {
      conditions.push(`r.name ILIKE $${idx++}`);
      values.push(`%${search}%`);
    }

    if (category) {
      conditions.push(`r.category = $${idx++}`);
      values.push(category);
    }

    const result = await db.query(
      `SELECT r.*, COUNT(ri.id) AS item_count
       FROM recipes r
       LEFT JOIN recipe_items ri ON ri.recipe_id = r.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY r.id
       ORDER BY r.name ASC`,
      values
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/recipes/:id - Reçete detayı ve malzemeleri
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const recipeRes = await db.query(
      `SELECT * FROM recipes WHERE id = $1 AND is_active = TRUE`,
      [id]
    );

    if (recipeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reçete bulunamadı.' });
    }

    const itemsRes = await db.query(
      `SELECT ri.*, m.name AS material_name, m.current_stock,
              u.name AS unit_name, u.abbreviation AS unit_abbr
       FROM recipe_items ri
       JOIN materials m ON m.id = ri.material_id
       JOIN units u ON u.id = ri.unit_id
       WHERE ri.recipe_id = $1
       ORDER BY m.name ASC`,
      [id]
    );

    const recipe = recipeRes.rows[0];
    recipe.items = itemsRes.rows;

    res.json({ success: true, data: recipe });
  } catch (err) {
    next(err);
  }
});

// POST /api/recipes - Yeni reçete oluştur (Admin veya Şef)
router.post(
  '/',
  authorize('admin', 'chef'),
  [
    body('name').trim().notEmpty().withMessage('Yemek adı zorunlu'),
    body('items').isArray({ min: 1 }).withMessage('En az bir malzeme eklenmelidir'),
    body('items.*.material_id').isUUID().withMessage('Geçerli malzeme seçiniz'),
    body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('Kişi başı miktar sıfırdan büyük olmalı'),
    body('items.*.unit_id').isInt().withMessage('Geçerli birim seçiniz'),
  ],
  async (req, res, next) => {
    const client = await db.getClient();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { name, category, description, items } = req.body;

      // Yemek adı mükerrerlik kontrolü
      const checkRes = await db.query(`SELECT id FROM recipes WHERE LOWER(name) = LOWER($1) AND is_active = TRUE`, [name]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Bu yemek adı zaten tanımlı.' });
      }

      await client.query('BEGIN');

      const recRes = await client.query(
        `INSERT INTO recipes (name, category, description, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, category || null, description || null, req.user.id]
      );
      const recipe = recRes.rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO recipe_items (recipe_id, material_id, quantity, unit_id, notes)
           VALUES ($1, $2, $3, $4, $5)`,
          [recipe.id, item.material_id, item.quantity, item.unit_id, item.notes || null]
        );
      }

      await client.query('COMMIT');

      await logAction(
        req.user.id,
        req.user.username,
        'CREATE_RECIPE',
        'recipe',
        recipe.id,
        null,
        { name, category, itemsCount: items.length },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Reçete başarıyla oluşturuldu.',
        data: recipe,
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

// PUT /api/recipes/:id - Reçete güncelle (Admin veya Şef)
router.put(
  '/:id',
  authorize('admin', 'chef'),
  [
    body('name').optional().trim().notEmpty().withMessage('Yemek adı boş olamaz'),
    body('items').optional().isArray({ min: 1 }).withMessage('En az bir malzeme eklenmelidir'),
  ],
  async (req, res, next) => {
    const client = await db.getClient();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { id } = req.params;
      const { name, category, description, items } = req.body;

      const oldRes = await db.query(`SELECT * FROM recipes WHERE id = $1`, [id]);
      if (oldRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Reçete bulunamadı.' });
      }

      await client.query('BEGIN');

      const recRes = await client.query(
        `UPDATE recipes
         SET name = COALESCE($1, name),
             category = COALESCE($2, category),
             description = COALESCE($3, description),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [name, category, description, id]
      );

      if (items && items.length > 0) {
        // Eski kalemleri temizle ve yenilerini ekle
        await client.query(`DELETE FROM recipe_items WHERE recipe_id = $1`, [id]);
        for (const item of items) {
          await client.query(
            `INSERT INTO recipe_items (recipe_id, material_id, quantity, unit_id, notes)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, item.material_id, item.quantity, item.unit_id, item.notes || null]
          );
        }
      }

      await client.query('COMMIT');

      await logAction(req.user.id, req.user.username, 'UPDATE_RECIPE', 'recipe', id, oldRes.rows[0], req.body, req.ip);

      res.json({ success: true, message: 'Reçete güncellendi.', data: recRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

// DELETE /api/recipes/:id - Reçeteyi pasife al
router.delete('/:id', authorize('admin', 'chef'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const oldRes = await db.query(`SELECT * FROM recipes WHERE id = $1`, [id]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reçete bulunamadı.' });
    }

    await db.query(`UPDATE recipes SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [id]);
    await logAction(req.user.id, req.user.username, 'DELETE_RECIPE', 'recipe', id, oldRes.rows[0], { is_active: false }, req.ip);

    res.json({ success: true, message: 'Reçete pasife alındı.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

