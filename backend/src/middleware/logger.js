/**
 * İşlem Loglama Middleware
 * ==========================
 * Sistemdeki tüm önemli işlemleri logs tablosuna kaydeder.
 * Her log kaydında: tarih, kullanıcı adı, yapılan işlem bilgisi yer alır.
 */

const db = require('../config/database');

/**
 * İşlem logunu veritabanına kaydeder
 *
 * @param {string|null} userId - Kullanıcı UUID
 * @param {string} username - Kullanıcı adı (snapshot)
 * @param {string} action - İşlem kodu (örn: 'CREATE_MATERIAL', 'APPROVE_MENU')
 * @param {string|null} entityType - Etkilenen tablo/varlık (örn: 'material', 'menu')
 * @param {string|null} entityId - Etkilenen kayıt UUID
 * @param {object|null} oldData - Değişiklik öncesi veri
 * @param {object|null} newData - Değişiklik sonrası veri
 * @param {string|null} ipAddress - Kullanıcı IP adresi
 * @returns {Promise<void>}
 */
const logAction = async (
  userId,
  username,
  action,
  entityType = null,
  entityId = null,
  oldData = null,
  newData = null,
  ipAddress = null
) => {
  try {
    await db.query(
      `INSERT INTO logs
         (user_id, username, action, entity_type, entity_id, old_data, new_data, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        username,
        action,
        entityType,
        entityId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress
      ]
    );
  } catch (err) {
    // Log hatası ana işlemi engellememeli, sadece konsola yaz
    console.error('Log kaydı hatası:', err.message);
  }
};

/**
 * Request log middleware - her isteği konsola loglar
 * (Geliştirme ortamında kullanışlı)
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = req.user ? `[${req.user.username}]` : '[anonim]';
    console.log(
      `${new Date().toISOString()} ${user} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });
  next();
};

module.exports = { logAction, requestLogger };
