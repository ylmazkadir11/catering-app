/**
 * Dashboard & Uyarı Kontrol Route'ları
 * =====================================
 * Sistem genel özet istatistikleri ve aktif uyarılar:
 * 1. Kritik stok seviyesi altındaki malzemeler
 * 2. Son kullanma tarihi yaklaşan partiler (30 gün)
 * 3. Üretim yapılmış ama raporu alınmamış günler
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard/stats - Genel dashboard sayıları
router.get('/stats', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Toplam aktif malzeme
    const materialsCountRes = await db.query(
      `SELECT COUNT(*) FROM materials WHERE is_active = TRUE`
    );

    // 2. Kritik stok seviyesindeki malzeme sayısı
    const criticalStockRes = await db.query(
      `SELECT COUNT(*) FROM materials WHERE is_active = TRUE AND current_stock < minimum_stock`
    );

    // 3. Bugünkü üretim sayısı
    const todayProductionsRes = await db.query(
      `SELECT COUNT(*) FROM productions WHERE production_date = $1`,
      [today]
    );

    // 4. Onaylanmış ama raporu alınmamış üretim sayısı
    const unreportedRes = await db.query(
      `SELECT COUNT(*) FROM productions WHERE status = 'confirmed' AND report_generated = FALSE`
    );

    // 5. Son kullanma tarihi yaklaşan (30 gün) aktif parti sayısı
    const alertDays = parseInt(process.env.EXPIRY_ALERT_DAYS || '30');
    const expiringRes = await db.query(
      `SELECT COUNT(*) FROM batches
       WHERE is_exhausted = FALSE
         AND expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $1
         AND expiry_date >= CURRENT_DATE`,
      [alertDays]
    );

    res.json({
      success: true,
      data: {
        totalMaterials: parseInt(materialsCountRes.rows[0].count),
        criticalStock: parseInt(criticalStockRes.rows[0].count),
        todayProductions: parseInt(todayProductionsRes.rows[0].count),
        unreportedCount: parseInt(unreportedRes.rows[0].count),
        expiringBatches: parseInt(expiringRes.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/alerts - Aktif uyarı listesi
router.get('/alerts', async (req, res, next) => {
  try {
    const alertDays = parseInt(process.env.EXPIRY_ALERT_DAYS || '30');

    // 1. Kritik stok altındaki malzemeler
    const criticalStockItems = await db.query(
      `SELECT m.id, m.name, m.current_stock, m.minimum_stock, u.abbreviation AS unit
       FROM materials m
       JOIN units u ON u.id = m.unit_id
       WHERE m.is_active = TRUE AND m.current_stock < m.minimum_stock
       ORDER BY (m.minimum_stock - m.current_stock) DESC`
    );

    // 2. Son kullanma tarihi yaklaşan partiler
    const expiringBatches = await db.query(
      `SELECT b.id, m.name AS material_name, b.batch_number, b.expiry_date,
              b.quantity_remaining, u.abbreviation AS unit,
              (b.expiry_date - CURRENT_DATE) AS days_remaining
       FROM batches b
       JOIN materials m ON m.id = b.material_id
       JOIN units u ON u.id = m.unit_id
       WHERE b.is_exhausted = FALSE
         AND b.expiry_date IS NOT NULL
         AND b.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $1
         AND b.expiry_date >= CURRENT_DATE
       ORDER BY b.expiry_date ASC`,
      [alertDays]
    );

    // 3. Üretim yapılmış ama raporu alınmamış günler
    const unreportedProductions = await db.query(
      `SELECT p.id, p.production_date, p.meal_type, p.person_count, p.confirmed_at
       FROM productions p
       WHERE p.status = 'confirmed' AND p.report_generated = FALSE
       ORDER BY p.production_date DESC`
    );

    res.json({
      success: true,
      data: {
        criticalStock: criticalStockItems.rows,
        expiringBatches: expiringBatches.rows,
        unreportedProductions: unreportedProductions.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

