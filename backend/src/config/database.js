// =====================================================
// src/config/database.js
// PostgreSQL bağlantı havuzu (connection pool) yapılandırması
// pg.Pool kullanarak verimli veritabanı bağlantısı sağlar
// =====================================================

require('dotenv').config();
const { Pool } = require('pg');

// Ortam değişkenlerinden veritabanı yapılandırmasını oluştur
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'catering_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
  ...poolConfig,
  // Maksimum bağlantı sayısı
  max: 20,
  // Boşta bağlantının ne kadar süre bekleyeceği (ms)
  idleTimeoutMillis: 30000,
  // Bağlantı kurma zaman aşımı (ms)
  connectionTimeoutMillis: 5000,
});

// Havuz hata olaylarını dinle
pool.on('error', (err, client) => {
  console.error('PostgreSQL havuzunda beklenmeyen hata:', err);
});

// Bağlantıyı test et
pool.connect((err, client, done) => {
  if (err) {
    console.error('Veritabanına bağlanılamadı:', err.message);
  } else {
    console.log('PostgreSQL veritabanına başarıyla bağlandı');
    done();
  }
});

/**
 * Basit sorgu çalıştırma fonksiyonu
 * @param {string} text - SQL sorgusu
 * @param {Array} params - Sorgu parametreleri
 * @returns {Promise<QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    // Geliştirme modunda sorgu sürelerini logla
    if (process.env.NODE_ENV === 'development') {
      console.log('Sorgu çalıştırıldı:', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    console.error('Veritabanı sorgu hatası:', {
      message: err.message,
      query: text.substring(0, 200),
      params: params,
    });
    throw err;
  }
};

/**
 * Transaction için bağlantı istemcisi döndürür
 * Kullanımdan sonra client.release() çağrılmalıdır
 * @returns {Promise<PoolClient>}
 */
const getClient = async () => {
  const client = await pool.connect();
  // Orijinal query fonksiyonunu sarmalayarak hataları logla
  const originalQuery = client.query.bind(client);
  client.query = async (text, params) => {
    try {
      return await originalQuery(text, params);
    } catch (err) {
      console.error('Transaction sorgu hatası:', {
        message: err.message,
        query: typeof text === 'string' ? text.substring(0, 200) : text,
      });
      throw err;
    }
  };
  return client;
};

module.exports = { query, getClient, pool };
