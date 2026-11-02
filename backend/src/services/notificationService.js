// =====================================================
// src/services/notificationService.js
// Bildirim servisi - Stok, son kullanma tarihi ve üretim bildirimleri
// Firebase FCM entegrasyonu ile push notification gönderir
// =====================================================

const db = require('../config/database');
const { sendMulticastNotification } = require('../config/firebase');

/**
 * Belirli roldeki kullanıcıların FCM tokenlarını getirir
 * @param {string[]} roles - Hedef roller dizisi
 * @returns {Promise<string[]>} FCM token listesi
 */
const getUserFCMTokens = async (roles) => {
  try {
    const placeholders = roles.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.query(
      `SELECT fcm_token FROM users 
       WHERE role IN (${placeholders}) AND is_active = true AND fcm_token IS NOT NULL`,
      roles
    );
    return result.rows.map((r) => r.fcm_token).filter(Boolean);
  } catch (err) {
    console.error('FCM token getirme hatası:', err.message);
    return [];
  }
};

/**
 * Bildirimi veritabanına kaydeder
 * @param {number[]} userIds - Bildirim gönderilecek kullanıcı ID'leri
 * @param {string} type - Bildirim tipi
 * @param {string} title - Başlık
 * @param {string} body - İçerik
 * @param {Object} data - Ek veri
 */
const saveNotificationsToDb = async (userIds, type, title, body, data = {}) => {
  try {
    for (const userId of userIds) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, body, data, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, type, title, body, JSON.stringify(data)]
      );
    }
  } catch (err) {
    console.error('Bildirim veritabanına kaydedilemedi:', err.message);
  }
};

/**
 * Kritik stok seviyesinin altına düşen malzemeleri kontrol eder
 * Admin ve depot kullanıcılarına FCM bildirimi gönderir
 */
const checkLowStock = async () => {
  console.log('[Bildirim] Düşük stok kontrolü başlatılıyor...');
  try {
    const result = await db.query(
      `SELECT m.id, m.name, m.current_stock, m.critical_stock_level, u.abbreviation as unit
       FROM materials m
       LEFT JOIN units u ON m.unit_id = u.id
       WHERE m.is_active = true 
         AND m.current_stock <= m.critical_stock_level
         AND m.critical_stock_level > 0
       ORDER BY (m.current_stock / NULLIF(m.critical_stock_level, 0)) ASC`
    );

    if (result.rows.length === 0) {
      console.log('[Bildirim] Düşük stoklu malzeme yok');
      return;
    }

    console.log('[Bildirim] ' + result.rows.length + ' adet düşük stoklu malzeme bulundu');

    const usersResult = await db.query(
      `SELECT id, fcm_token FROM users 
       WHERE role IN ('admin', 'depot') AND is_active = true`
    );
    const userIds = usersResult.rows.map((u) => u.id);
    const tokens = usersResult.rows.map((u) => u.fcm_token).filter(Boolean);

    for (const material of result.rows) {
      const title = 'Dusuk Stok Uyarisi';
      const body = material.name + ': Mevcut stok ' + material.current_stock + ' ' + (material.unit || '') + ', kritik seviye: ' + material.critical_stock_level + ' ' + (material.unit || '');
      const data = {
        type: 'low_stock',
        materialId: String(material.id),
        materialName: material.name,
        currentStock: String(material.current_stock),
        criticalLevel: String(material.critical_stock_level),
      };

      if (tokens.length > 0) {
        await sendMulticastNotification(tokens, title, body, data);
      }

      if (userIds.length > 0) {
        await saveNotificationsToDb(userIds, 'low_stock', title, body, data);
      }
    }

    console.log('[Bildirim] Düşük stok bildirimleri gönderildi');
  } catch (err) {
    console.error('[Bildirim] Düşük stok kontrolü hatası:', err.message);
  }
};

/**
 * Son kullanma tarihi yaklaşan partileri kontrol eder
 * Varsayılan: 30 gün içinde son kullanma tarihi gelecek olanlar
 */
const checkExpiringBatches = async () => {
  console.log('[Bildirim] Son kullanma tarihi kontrolü başlatılıyor...');
  try {
    const alertDays = parseInt(process.env.EXPIRY_ALERT_DAYS) || 30;

    const result = await db.query(
      `SELECT b.id, b.batch_number, b.expiry_date, b.remaining_quantity,
              m.name as material_name, u.abbreviation as unit,
              (b.expiry_date - CURRENT_DATE) as days_until_expiry
       FROM batches b
       JOIN materials m ON b.material_id = m.id
       LEFT JOIN units u ON m.unit_id = u.id
       WHERE b.is_exhausted = false
         AND b.expiry_date IS NOT NULL
         AND b.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($1 || ' days')::INTERVAL)
       ORDER BY b.expiry_date ASC`,
      [alertDays]
    );

    if (result.rows.length === 0) {
      console.log('[Bildirim] Son kullanma tarihi yaklaşan parti yok');
      return;
    }

    console.log('[Bildirim] ' + result.rows.length + ' adet son kullanma tarihi yaklaşan parti bulundu');

    const usersResult = await db.query(
      `SELECT id, fcm_token FROM users 
       WHERE role IN ('admin', 'depot') AND is_active = true`
    );
    const userIds = usersResult.rows.map((u) => u.id);
    const tokens = usersResult.rows.map((u) => u.fcm_token).filter(Boolean);

    for (const batch of result.rows) {
      const title = 'Son Kullanma Tarihi Uyarisi';
      const body = batch.material_name + ' (Parti: ' + (batch.batch_number || batch.id) + '): ' + batch.days_until_expiry + ' gun icinde son kullanma tarihi dolacak. Kalan: ' + batch.remaining_quantity + ' ' + (batch.unit || '');
      const data = {
        type: 'expiring_batch',
        batchId: String(batch.id),
        materialName: batch.material_name,
        expiryDate: String(batch.expiry_date),
        daysUntilExpiry: String(batch.days_until_expiry),
      };

      if (tokens.length > 0) {
        await sendMulticastNotification(tokens, title, body, data);
      }

      if (userIds.length > 0) {
        await saveNotificationsToDb(userIds, 'expiring_batch', title, body, data);
      }
    }

    console.log('[Bildirim] Son kullanma tarihi bildirimleri gönderildi');
  } catch (err) {
    console.error('[Bildirim] Son kullanma tarihi kontrolü hatası:', err.message);
  }
};

/**
 * Rapor alınmamış onaylı üretimleri kontrol eder
 */
const checkUnreportedProductions = async () => {
  console.log('[Bildirim] Raporlanmamış üretim kontrolü başlatılıyor...');
  try {
    const result = await db.query(
      `SELECT p.id, p.production_date, p.meal_type, p.person_count,
              m.menu_date
       FROM productions p
       JOIN menus m ON p.menu_id = m.id
       WHERE p.status = 'confirmed'
         AND p.report_generated = false
         AND p.production_date < CURRENT_DATE
       ORDER BY p.production_date ASC`
    );

    if (result.rows.length === 0) {
      console.log('[Bildirim] Raporlanmamış üretim yok');
      return;
    }

    console.log('[Bildirim] ' + result.rows.length + ' adet raporlanmamış üretim bulundu');

    const usersResult = await db.query(
      `SELECT id, fcm_token FROM users 
       WHERE role IN ('admin', 'chef') AND is_active = true`
    );
    const userIds = usersResult.rows.map((u) => u.id);
    const tokens = usersResult.rows.map((u) => u.fcm_token).filter(Boolean);

    const title = 'Raporlanmamis Uretim Uyarisi';
    const body = result.rows.length + ' adet onayli uretim icin rapor alinmamis. Lutfen kontrol edin.';
    const data = {
      type: 'unreported_production',
      count: String(result.rows.length),
      productionIds: result.rows.map((p) => String(p.id)).join(','),
    };

    if (tokens.length > 0) {
      await sendMulticastNotification(tokens, title, body, data);
    }

    if (userIds.length > 0) {
      await saveNotificationsToDb(userIds, 'unreported_production', title, body, data);
    }

    console.log('[Bildirim] Raporlanmamış üretim bildirimleri gönderildi');
  } catch (err) {
    console.error('[Bildirim] Raporlanmamış üretim kontrolü hatası:', err.message);
  }
};

module.exports = {
  checkLowStock,
  checkExpiringBatches,
  checkUnreportedProductions,
  getUserFCMTokens,
  saveNotificationsToDb,
};
