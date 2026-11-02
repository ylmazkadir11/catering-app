/**
 * Veritabanı Migration Scripti
 * ==============================
 * SQL migration dosyasını okuyup PostgreSQL'de çalıştırır.
 * Kullanım: node src/utils/migrate.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrate() {
  const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME     || 'catering_db',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
      };

  const pool = new Pool(poolConfig);

  const client = await pool.connect();

  try {
    console.log('🚀 Migration başlatılıyor...');

    // SQL dosyasını oku
    const sqlPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration dosyası bulunamadı: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Transaction başlat
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ Migration başarıyla tamamlandı!');

    // Admin kullanıcısı oluştur (yoksa)
    const bcrypt = require('bcryptjs');
    const adminCheck = await client.query(
      `SELECT id FROM users WHERE username = 'admin'`
    );

    if (adminCheck.rows.length === 0) {
      const adminRoleRes = await client.query(
        `SELECT id FROM roles WHERE name = 'admin'`
      );
      if (adminRoleRes.rows.length > 0) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        await client.query(
          `INSERT INTO users (username, email, password_hash, full_name, role_id)
           VALUES ('admin', 'admin@catering.local', $1, 'Sistem Yöneticisi', $2)`,
          [hashedPassword, adminRoleRes.rows[0].id]
        );
        console.log('✅ Varsayılan admin kullanıcısı oluşturuldu (admin/admin123)');
      }
    }

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration hatası:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
