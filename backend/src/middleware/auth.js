/**
 * Auth Middleware - JWT Doğrulama ve Rol Kontrolü
 * =================================================
 * JWT token doğrulama ve role-based access control (RBAC)
 * middleware fonksiyonları.
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * JWT token doğrulama middleware
 * Authorization: Bearer <token> header'ından token alır
 */
const authenticate = async (req, res, next) => {
  try {
    // Header'dan token al
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Kimlik doğrulama gerekli. Token bulunamadı.'
      });
    }

    const token = authHeader.substring(7); // "Bearer " kısmını kaldır

    // Token doğrula
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' });
      }
      return res.status(401).json({ success: false, message: 'Geçersiz token.' });
    }

    // Kullanıcıyı veritabanından kontrol et
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.fcm_token,
              r.id AS role_id, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    const user = result.rows[0];

    // Aktiflik kontrolü
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Hesabınız devre dışı bırakılmış.' });
    }

    // req.user'a ekle (sonraki middleware'ler kullanabilir)
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      roleId: user.role_id,
      role: user.role_name,
      fcmToken: user.fcm_token
    };

    next();
  } catch (err) {
    console.error('Auth middleware hatası:', err);
    return res.status(500).json({ success: false, message: 'Kimlik doğrulama hatası.' });
  }
};

/**
 * Rol bazlı erişim kontrolü
 * @param {...string} roles - İzin verilen roller ('admin', 'chef', 'depot')
 * @returns Middleware fonksiyonu
 *
 * Kullanım: router.get('/admin-only', authenticate, authorize('admin'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Önce kimlik doğrulaması gerekli.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bu işlem için yetkiniz yok. Gerekli rol: ${roles.join(' veya ')}`
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
