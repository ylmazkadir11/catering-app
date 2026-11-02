/**
 * Malzeme & Stok Yönetimi Route'ları
 * =====================================
 * Malzeme tanımlama, minimum stok belirleme,
 * parti takibi ve stok hareketleri.
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');

const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');
const { checkLowStock } = require('../services/notificationService');

router.use(authenticate);

// GET /api/materials - Malzeme listesi (Arama, kategori ve kritik stok filtresi ile)
router.get('/', async (req, res, next) => {
  try {
    const { search, category, lowStock } = req.query;

    let conditions = ['m.is_active = TRUE'];
    let values = [];
    let idx = 1;

    if (search) {
      conditions.push(`m.name ILIKE $${idx++}`);
      values.push(`%${search}%`);
    }

    if (category) {
      conditions.push(`m.category = $${idx++}`);
      values.push(category);
    }

    if (lowStock === 'true') {
      conditions.push(`m.current_stock < m.minimum_stock`);
    }

    const result = await db.query(
      `SELECT m.*, u.name AS unit_name, u.abbreviation AS unit_abbr,
              CASE
                WHEN m.current_stock <= 0 THEN 'OUT_OF_STOCK'
                WHEN m.current_stock < m.minimum_stock THEN 'CRITICAL'
                ELSE 'NORMAL'
              END AS stock_status
       FROM materials m
       JOIN units u ON u.id = m.unit_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.name ASC`,
      values
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/materials/:id - Tek malzeme detayı
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT m.*, u.name AS unit_name, u.abbreviation AS unit_abbr,
              CASE
                WHEN m.current_stock <= 0 THEN 'OUT_OF_STOCK'
                WHEN m.current_stock < m.minimum_stock THEN 'CRITICAL'
                ELSE 'NORMAL'
              END AS stock_status
       FROM materials m
       JOIN units u ON u.id = m.unit_id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Malzeme bulunamadı.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/materials - Yeni malzeme tanımla (Admin veya Depo)
router.post(
  '/',
  authorize('admin', 'depot'),
  [
    body('name').trim().notEmpty().withMessage('Malzeme adı zorunlu'),
    body('unit_id').isInt().withMessage('Geçerli bir birim seçiniz'),
    body('minimum_stock').isFloat({ min: 0 }).withMessage('Minimum stok negatif olamaz'),
    body('category').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { name, category, unit_id, minimum_stock } = req.body;

      const existing = await db.query(`SELECT id FROM materials WHERE LOWER(name) = LOWER($1)`, [name]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Bu malzeme adı zaten mevcut.' });
      }

      const insertRes = await db.query(
        `INSERT INTO materials (name, category, unit_id, minimum_stock, current_stock, created_by)
         VALUES ($1, $2, $3, $4, 0, $5)
         RETURNING *`,
        [name, category || null, unit_id, minimum_stock || 0, req.user.id]
      );

      const newMaterial = insertRes.rows[0];
      await logAction(req.user.id, req.user.username, 'CREATE_MATERIAL', 'material', newMaterial.id, null, newMaterial, req.ip);

      res.status(201).json({
        success: true,
        message: 'Malzeme başarıyla oluşturuldu.',
        data: newMaterial,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/materials/:id - Malzeme güncelle (Admin veya Depo)
router.put(
  '/:id',
  authorize('admin', 'depot'),
  [
    body('name').optional().trim().notEmpty().withMessage('Malzeme adı boş olamaz'),
    body('unit_id').optional().isInt().withMessage('Geçerli bir birim seçiniz'),
    body('minimum_stock').optional().isFloat({ min: 0 }).withMessage('Minimum stok negatif olamaz'),
    body('category').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { id } = req.params;
      const { name, category, unit_id, minimum_stock } = req.body;

      const oldRes = await db.query(`SELECT * FROM materials WHERE id = $1`, [id]);
      if (oldRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Malzeme bulunamadı.' });
      }

      const updateRes = await db.query(
        `UPDATE materials
         SET name = COALESCE($1, name),
             category = COALESCE($2, category),
             unit_id = COALESCE($3, unit_id),
             minimum_stock = COALESCE($4, minimum_stock),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [name, category, unit_id, minimum_stock, id]
      );

      const updated = updateRes.rows[0];
      await logAction(req.user.id, req.user.username, 'UPDATE_MATERIAL', 'material', id, oldRes.rows[0], updated, req.ip);

      // Kritik stok kontrolü tetikle
      if (parseFloat(updated.current_stock) < parseFloat(updated.minimum_stock)) {
        checkLowStock().catch(() => {});
      }

      res.json({ success: true, message: 'Malzeme güncellendi.', data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/materials/:id - Malzeme sil (Soft Delete)
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const oldRes = await db.query(`SELECT * FROM materials WHERE id = $1`, [id]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Malzeme bulunamadı.' });
    }

    await db.query(`UPDATE materials SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [id]);
    await logAction(req.user.id, req.user.username, 'DELETE_MATERIAL', 'material', id, oldRes.rows[0], { is_active: false }, req.ip);

    res.json({ success: true, message: 'Malzeme pasife alındı.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/materials/:id/batches - Malzemeye ait partiler (FIFO görünümü)
router.get('/:id/batches', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT b.*, i.invoice_no, i.supplier_name
       FROM batches b
       LEFT JOIN invoices i ON i.id = b.invoice_id
       WHERE b.material_id = $1
       ORDER BY b.entry_date ASC, b.created_at ASC`,
      [id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/materials/:id/movements - Stok hareketleri (Giriş / Çıkış)
router.get('/:id/movements', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT sm.*, u.full_name AS created_by_name
       FROM stock_movements sm
       LEFT JOIN users u ON u.id = sm.created_by
       WHERE sm.material_id = $1
       ORDER BY sm.created_at DESC`,
      [id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

