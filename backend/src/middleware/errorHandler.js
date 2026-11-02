/**
 * Global Hata Yönetim Middleware
 * ================================
 * Express.js global hata yakalama middleware'i.
 * Tüm hataları tutarlı JSON formatında döndürür.
 */

/**
 * Global error handler
 * Express'te 4 parametre olması error handler olduğunu belirtir
 */
const errorHandler = (err, req, res, next) => {
  // Varsayılan hata değerleri
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Sunucu hatası oluştu.';
  let errors = err.errors || [];

  // PostgreSQL hata kodlarını kontrol et
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        message = 'Bu kayıt zaten mevcut. Lütfen farklı değerler deneyin.';
        // Hangi alanın duplicate olduğunu bul
        if (err.detail) {
          const match = err.detail.match(/\((.+?)\)=\((.+?)\)/);
          if (match) {
            message = `"${match[2]}" değeri zaten kullanımda.`;
          }
        }
        break;

      case '23503': // Foreign key violation
        statusCode = 400;
        message = 'İlişkili kayıt bulunamadı veya silinemez (bağlı kayıtlar var).';
        break;

      case '23502': // Not null violation
        statusCode = 400;
        message = 'Zorunlu alan eksik.';
        break;

      case '23514': // Check constraint violation
        statusCode = 400;
        message = 'Geçersiz değer. Kısıtlama ihlali.';
        break;

      case '42P01': // Undefined table
        statusCode = 500;
        message = 'Veritabanı yapılandırma hatası.';
        break;
    }
  }

  // JWT hataları
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Geçersiz token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Oturum süresi doldu.';
  }

  // Validation hataları
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Doğrulama hatası.';
    errors = Object.values(err.errors || {}).map(e => e.message);
  }

  // Üretim ortamında stack trace gösterme
  const isDev = process.env.NODE_ENV === 'development';

  // Konsola logla
  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ERROR ${statusCode}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    ...(isDev && statusCode >= 500 ? { stack: err.stack } : {})
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint bulunamadı: ${req.method} ${req.originalUrl}`
  });
};

module.exports = { errorHandler, notFoundHandler };
