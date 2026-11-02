/**
 * İşlem Logları Route'ları (Sadece Admin)
 * =========================================
 * Sistemdeki tüm işlemlerin tarih, kullanıcı adı ve detaylarıyla listelenmesi.
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

// GET /api/logs - Log kayıtlarını filtreli ve sayfalı listele
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, userId, entityType, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['1=1'];
    let values = [];
    let idx = 1;

    if (action) {
      conditions.push(`l.action ILIKE $${idx++}`);
      values.push(`%${action}%`);
    }

    if (userId) {
      conditions.push(`l.user_id = $${idx++}`);
      values.push(userId);
    }

    if (entityType) {
      conditions.push(`l.entity_type = $${idx++}`);
      values.push(entityType);
    }

    if (startDate) {
      conditions.push(`l.created_at >= $${idx++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`l.created_at <= $${idx++}`);
      values.push(endDate);
    }

    const countRes = await db.query(
      `SELECT COUNT(*) FROM logs l WHERE ${conditions.join(' AND ')}`,
      values
    );

    values.push(parseInt(limit), offset);
    const result = await db.query(
      `SELECT l.*, u.full_name AS user_full_name
       FROM logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

