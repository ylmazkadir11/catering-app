/**
 * Ölçü Birimi Yönetimi Route'ları
 * ================================
 * ml, gr, adet, demet vb. birimlerin CRUD işlemleri.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');

router.use(authenticate);

// GET /api/units - Tüm birimleri listele
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`SELECT * FROM units ORDER BY name ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/units - Yeni birim tanımla (Admin veya Depo)
router.post(
  '/',
  authorize('admin', 'depot'),
  [
    body('name').trim().notEmpty().withMessage('Birim adı zorunlu'),
    body('abbreviation').trim().notEmpty().withMessage('Birim kısaltması zorunlu'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { name, abbreviation } = req.body;

      const existing = await db.query(`SELECT id FROM units WHERE LOWER(name) = LOWER($1)`, [name]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Bu birim adı zaten tanımlı.' });
      }

      const insertRes = await db.query(
        `INSERT INTO units (name, abbreviation, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, abbreviation, req.user.id]
      );

      const newUnit = insertRes.rows[0];
      await logAction(req.user.id, req.user.username, 'CREATE_UNIT', 'unit', String(newUnit.id), null, newUnit, req.ip);

      res.status(201).json({
        success: true,
        message: 'Birim başarıyla oluşturuldu.',
        data: newUnit,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/units/:id - Birim güncelle (Admin)
router.put(
  '/:id',
  authorize('admin'),
  [
    body('name').optional().trim().notEmpty().withMessage('Birim adı boş olamaz'),
    body('abbreviation').optional().trim().notEmpty().withMessage('Kısaltma boş olamaz'),
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, abbreviation } = req.body;

      const oldRes = await db.query(`SELECT * FROM units WHERE id = $1`, [id]);
      if (oldRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Birim bulunamadı.' });
      }

      const updateRes = await db.query(
        `UPDATE units
         SET name = COALESCE($1, name),
             abbreviation = COALESCE($2, abbreviation),
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [name, abbreviation, id]
      );

      await logAction(req.user.id, req.user.username, 'UPDATE_UNIT', 'unit', id, oldRes.rows[0], updateRes.rows[0], req.ip);

      res.json({ success: true, message: 'Birim güncellendi.', data: updateRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/units/:id - Birim sil (Admin)
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Kullanımda olan malzeme var mı kontrol et
    const usageCheck = await db.query(`SELECT id FROM materials WHERE unit_id = $1 LIMIT 1`, [id]);
    if (usageCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu birim malzemelerde kullanıldığı için silinemez.',
      });
    }

    const unitRes = await db.query(`SELECT * FROM units WHERE id = $1`, [id]);
    if (unitRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Birim bulunamadı.' });
    }

    await db.query(`DELETE FROM units WHERE id = $1`, [id]);
    await logAction(req.user.id, req.user.username, 'DELETE_UNIT', 'unit', id, unitRes.rows[0], null, req.ip);

    res.json({ success: true, message: 'Birim silindi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

