/**
 * Kimlik Doğrulama Route'ları
 * =============================
 * Login, logout, profil yönetimi ve FCM token güncelleme endpoint'leri.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Kullanıcı adı zorunlu'),
    body('password').notEmpty().withMessage('Şifre zorunlu'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Doğrulama hatası',
          errors: errors.array().map(e => e.msg)
        });
      }

      const { username, password } = req.body;

      // Kullanıcıyı bul
      const result = await db.query(
        `SELECT u.id, u.username, u.email, u.full_name, u.password_hash,
                u.is_active, u.fcm_token,
                r.id AS role_id, r.name AS role_name, r.description AS role_description
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.username = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
      }

      const user = result.rows[0];

      // Aktiflik kontrolü
      if (!user.is_active) {
        return res.status(401).json({ success: false, message: 'Hesabınız devre dışı bırakılmış.' });
      }

      // Şifre doğrula
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
      }

      // JWT token oluştur
      const token = jwt.sign(
        { userId: user.id, role: user.role_name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Son giriş tarihini güncelle
      await db.query(
        `UPDATE users SET last_login = NOW() WHERE id = $1`,
        [user.id]
      );

      // Log kaydı
      await logAction(user.id, user.username, 'LOGIN', 'user', user.id, null, null, req.ip);

      return res.json({
        success: true,
        message: 'Giriş başarılı',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: {
              id: user.role_id,
              name: user.role_name,
              description: user.role_description
            }
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await logAction(req.user.id, req.user.username, 'LOGOUT', 'user', req.user.id, null, null, req.ip);
    res.json({ success: true, message: 'Çıkış yapıldı.' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.last_login,
              r.id AS role_id, r.name AS role_name, r.description AS role_description
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    const u = result.rows[0];
    res.json({
      success: true,
      data: {
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.full_name,
        lastLogin: u.last_login,
        role: { id: u.role_id, name: u.role_name, description: u.role_description }
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// PUT /api/auth/me - Profil güncelle
// ─────────────────────────────────────────────
router.put(
  '/me',
  authenticate,
  [
    body('full_name').optional().trim().notEmpty().withMessage('Ad Soyad boş olamaz'),
    body('email').optional().isEmail().withMessage('Geçerli email girin'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { full_name, email } = req.body;

      // Mevcut verisi al (log için)
      const oldRes = await db.query(`SELECT full_name, email FROM users WHERE id = $1`, [req.user.id]);
      const oldData = oldRes.rows[0];

      const updates = [];
      const values = [];
      let idx = 1;

      if (full_name) { updates.push(`full_name = $${idx++}`); values.push(full_name); }
      if (email)     { updates.push(`email = $${idx++}`);     values.push(email);     }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'Güncellenecek alan belirtilmedi.' });
      }

      values.push(req.user.id);
      await db.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        values
      );

      await logAction(req.user.id, req.user.username, 'UPDATE_PROFILE', 'user', req.user.id,
        oldData, { full_name, email }, req.ip);

      res.json({ success: true, message: 'Profil güncellendi.' });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// PUT /api/auth/change-password
// ─────────────────────────────────────────────
router.put(
  '/change-password',
  authenticate,
  [
    body('current_password').notEmpty().withMessage('Mevcut şifre zorunlu'),
    body('new_password').isLength({ min: 6 }).withMessage('Yeni şifre en az 6 karakter olmalı'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { current_password, new_password } = req.body;

      // Mevcut şifreyi doğrula
      const result = await db.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [req.user.id]
      );

      const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Mevcut şifre hatalı.' });
      }

      const newHash = await bcrypt.hash(new_password, 12);
      await db.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newHash, req.user.id]
      );

      await logAction(req.user.id, req.user.username, 'CHANGE_PASSWORD', 'user', req.user.id,
        null, null, req.ip);

      res.json({ success: true, message: 'Şifre başarıyla değiştirildi.' });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────
// PUT /api/auth/fcm-token - FCM token güncelle
// ─────────────────────────────────────────────
router.put('/fcm-token', authenticate, async (req, res, next) => {
  try {
    const { fcm_token } = req.body;
    if (!fcm_token) {
      return res.status(400).json({ success: false, message: 'FCM token zorunlu.' });
    }

    await db.query(
      `UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE id = $2`,
      [fcm_token, req.user.id]
    );

    res.json({ success: true, message: 'FCM token güncellendi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

