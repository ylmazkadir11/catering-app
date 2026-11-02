/**
 * Bildirim Route'ları
 * ====================
 * Kullanıcı bildirimlerini listeleme, okundu işaretleme ve silme.
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/notifications - Kullanıcının bildirimleri
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );

    const unreadCountRes = await db.query(
      `SELECT COUNT(*) FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(unreadCountRes.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read - Bildirimi okundu yap
router.put('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    res.json({ success: true, message: 'Bildirim okundu olarak işaretlendi.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all - Tüm bildirimleri okundu yap
router.put('/read-all', async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ success: true, message: 'Tüm bildirimler okundu olarak işaretlendi.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id - Bildirim sil
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    res.json({ success: true, message: 'Bildirim silindi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

