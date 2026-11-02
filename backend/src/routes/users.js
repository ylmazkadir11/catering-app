/**
 * Kullanıcı Yönetimi Route'ları (Sadece Admin)
 * ============================================
 * Kullanıcı listeleme, oluşturma, güncelleme ve silme (soft delete).
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');

// Tüm kullanıcı işlemleri için kimlik doğrulama ve Admin rolü zorunlu
router.use(authenticate, authorize('admin'));

// GET /api/users - Kullanıcı listesi
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login, u.created_at,
              r.id AS role_id, r.name AS role_name, r.description AS role_description
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ORDER BY u.created_at DESC`
    );

    const formattedUsers = result.rows.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      role: {
        id: user.role_id,
        name: user.role_name,
        description: user.role_description,
      },
    }));

    res.json({ success: true, data: formattedUsers });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - Tek kullanıcı detayı
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.last_login, u.created_at,
              r.id AS role_id, r.name AS role_name, r.description AS role_description
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        role: {
          id: user.role_id,
          name: user.role_name,
          description: user.role_description,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users - Yeni kullanıcı oluştur
router.post(
  '/',
  [
    body('username').trim().notEmpty().withMessage('Kullanıcı adı zorunlu'),
    body('email').isEmail().withMessage('Geçerli bir e-posta adresi giriniz'),
    body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı'),
    body('full_name').trim().notEmpty().withMessage('Ad soyad zorunlu'),
    body('role_id').isInt().withMessage('Geçerli bir rol seçiniz'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { username, email, password, full_name, role_id } = req.body;

      // Kullanıcı adı ve e-posta mükerrerlik kontrolü
      const checkRes = await db.query(
        `SELECT id FROM users WHERE username = $1 OR email = $2`,
        [username, email]
      );
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı veya e-posta zaten kullanımda.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const insertRes = await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, full_name, role_id, created_at`,
        [username, email, passwordHash, full_name, role_id]
      );

      const newUser = insertRes.rows[0];
      await logAction(req.user.id, req.user.username, 'CREATE_USER', 'user', newUser.id, null, { username, email, full_name, role_id }, req.ip);

      res.status(201).json({
        success: true,
        message: 'Kullanıcı başarıyla oluşturuldu.',
        data: newUser,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/users/:id - Kullanıcı güncelle
router.put(
  '/:id',
  [
    body('full_name').optional().trim().notEmpty().withMessage('Ad soyad boş olamaz'),
    body('email').optional().isEmail().withMessage('Geçerli bir e-posta adresi giriniz'),
    body('role_id').optional().isInt().withMessage('Geçerli bir rol seçiniz'),
    body('is_active').optional().isBoolean().withMessage('Geçerli bir aktiflik durumu belirtiniz'),
    body('password').optional().isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { id } = req.params;
      const { full_name, email, role_id, is_active, password } = req.body;

      const oldRes = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
      if (oldRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
      }
      const oldUser = oldRes.rows[0];

      const updates = [];
      const values = [];
      let idx = 1;

      if (full_name !== undefined) { updates.push(`full_name = $${idx++}`); values.push(full_name); }
      if (email !== undefined) { updates.push(`email = $${idx++}`); values.push(email); }
      if (role_id !== undefined) { updates.push(`role_id = $${idx++}`); values.push(role_id); }
      if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active); }
      if (password) {
        const hash = await bcrypt.hash(password, 12);
        updates.push(`password_hash = $${idx++}`);
        values.push(hash);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'Güncellenecek alan bulunamadı.' });
      }

      values.push(id);
      await db.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        values
      );

      await logAction(req.user.id, req.user.username, 'UPDATE_USER', 'user', id, oldUser, req.body, req.ip);

      res.json({ success: true, message: 'Kullanıcı başarıyla güncellendi.' });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/users/:id - Kullanıcıyı pasife al (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Kendi hesabınızı devre dışı bırakamazsınız.' });
    }

    const userRes = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    await db.query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [id]);

    await logAction(req.user.id, req.user.username, 'DEACTIVATE_USER', 'user', id, { is_active: true }, { is_active: false }, req.ip);

    res.json({ success: true, message: 'Kullanıcı devre dışı bırakıldı.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

