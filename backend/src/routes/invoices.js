/**
 * Faturalı Malzeme Girişi Route'ları
 * =====================================
 * Malzeme girişi fatura bazlı yapılır.
 * Otomatik birim fiyat hesaplama (toplam / miktar).
 * Batch ve stok hareketi oluşturma, mevcut stok güncelleme.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');

router.use(authenticate);

// GET /api/invoices - Fatura listesi
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let conditions = ['1=1'];
    let values = [];
    let idx = 1;

    if (startDate) {
      conditions.push(`i.invoice_date >= $${idx++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`i.invoice_date <= $${idx++}`);
      values.push(endDate);
    }

    const result = await db.query(
      `SELECT i.*, u.full_name AS created_by_name,
              COUNT(b.id) AS batch_count
       FROM invoices i
       LEFT JOIN users u ON u.id = i.created_by
       LEFT JOIN batches b ON b.invoice_id = i.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY i.id, u.full_name
       ORDER BY i.invoice_date DESC, i.created_at DESC`,
      values
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/:id - Fatura detayı ve partileri
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoiceRes = await db.query(
      `SELECT i.*, u.full_name AS created_by_name
       FROM invoices i
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.id = $1`,
      [id]
    );

    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Fatura bulunamadı.' });
    }

    const batchesRes = await db.query(
      `SELECT b.*, m.name AS material_name, u.abbreviation AS unit_abbr
       FROM batches b
       JOIN materials m ON m.id = b.material_id
       JOIN units u ON u.id = m.unit_id
       WHERE b.invoice_id = $1
       ORDER BY b.created_at ASC`,
      [id]
    );

    const invoice = invoiceRes.rows[0];
    invoice.batches = batchesRes.rows;

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// POST /api/invoices - Yeni faturalı malzeme girişi (Admin veya Depo)
router.post(
  '/',
  authorize('admin', 'depot'),
  [
    body('invoice_no').trim().notEmpty().withMessage('Fatura numarası zorunlu'),
    body('invoice_date').isISO8601().withMessage('Geçerli bir fatura tarihi giriniz (YYYY-MM-DD)'),
    body('items').isArray({ min: 1 }).withMessage('En az bir malzeme girişi yapılmalıdır'),
    body('items.*.material_id').isUUID().withMessage('Geçerli malzeme seçiniz'),
    body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('Miktar sıfırdan büyük olmalı'),
    body('items.*.total_price').isFloat({ min: 0 }).withMessage('Toplam fiyat negatif olamaz'),
  ],
  async (req, res, next) => {
    const client = await db.getClient();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
      }

      const { invoice_no, supplier_name, invoice_date, notes, items } = req.body;

      // Fatura no mükerrerlik kontrolü
      const checkRes = await db.query(`SELECT id FROM invoices WHERE invoice_no = $1`, [invoice_no]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Bu fatura numarası ile daha önce giriş yapılmış.' });
      }

      await client.query('BEGIN');

      // Toplam fatura tutarını hesapla
      const invoiceTotal = items.reduce((acc, it) => acc + parseFloat(it.total_price || 0), 0);

      // Fatura kaydı oluştur
      const invRes = await client.query(
        `INSERT INTO invoices (invoice_no, supplier_name, invoice_date, total_amount, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [invoice_no, supplier_name || null, invoice_date, invoiceTotal, notes || null, req.user.id]
      );
      const invoice = invRes.rows[0];

      const createdBatches = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const qty = parseFloat(item.quantity);
        const totalPrice = parseFloat(item.total_price);
        const unitPrice = qty > 0 ? totalPrice / qty : 0; // Birim fiyat otomatik hesaplama!
        const batchNumber = item.batch_number || `${invoice_no}-P${i + 1}`;
        const expiryDate = item.expiry_date || null;

        // Batch oluştur
        const batchRes = await client.query(
          `INSERT INTO batches
             (material_id, invoice_id, batch_number, entry_date, expiry_date,
              quantity_entered, quantity_remaining, unit_price, total_price, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            item.material_id,
            invoice.id,
            batchNumber,
            invoice_date,
            expiryDate,
            qty,
            qty,
            unitPrice,
            totalPrice,
            req.user.id
          ]
        );
        const batch = batchRes.rows[0];
        createdBatches.push(batch);

        // Stok hareketi kaydı (in)
        await client.query(
          `INSERT INTO stock_movements
             (material_id, batch_id, movement_type, quantity, unit_price, total_cost,
              reference_type, invoice_id, created_by)
           VALUES ($1, $2, 'in', $3, $4, $5, 'invoice', $6, $7)`,
          [item.material_id, batch.id, qty, unitPrice, totalPrice, invoice.id, req.user.id]
        );

        // Malzeme toplam stok miktarını artır
        await client.query(
          `UPDATE materials
           SET current_stock = current_stock + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [qty, item.material_id]
        );
      }

      await client.query('COMMIT');

      await logAction(
        req.user.id,
        req.user.username,
        'CREATE_INVOICE_ENTRY',
        'invoice',
        invoice.id,
        null,
        { invoice_no, supplier_name, total: invoiceTotal, itemsCount: items.length },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Fatura ve malzeme girişleri başarıyla kaydedildi.',
        data: {
          invoice,
          batches: createdBatches,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

// DELETE /api/invoices/:id - Faturayı sil/iptal et (Eğer partiler henüz tüketilmediyse)
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;

    // Fatura partilerini kontrol et: Kalan miktar giriş miktarına eşit olmalı
    const batchesRes = await client.query(
      `SELECT * FROM batches WHERE invoice_id = $1`,
      [id]
    );

    if (batchesRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Fatura bulunamadı.' });
    }

    for (const b of batchesRes.rows) {
      if (parseFloat(b.quantity_entered) !== parseFloat(b.quantity_remaining)) {
        return res.status(400).json({
          success: false,
          message: 'Bu faturadaki malzemelerden üretime çıkış yapılmış. Fatura silinemez!',
        });
      }
    }

    await client.query('BEGIN');

    // Her malzemenin stoğunu geri düş
    for (const b of batchesRes.rows) {
      await client.query(
        `UPDATE materials
         SET current_stock = current_stock - $1,
             updated_at = NOW()
         WHERE id = $2`,
        [b.quantity_entered, b.material_id]
      );
    }

    // Hareketleri ve partileri sil
    await client.query(`DELETE FROM stock_movements WHERE invoice_id = $1`, [id]);
    await client.query(`DELETE FROM batches WHERE invoice_id = $1`, [id]);
    await client.query(`DELETE FROM invoices WHERE id = $1`, [id]);

    await client.query('COMMIT');

    await logAction(req.user.id, req.user.username, 'DELETE_INVOICE', 'invoice', id, null, null, req.ip);

    res.json({ success: true, message: 'Fatura ve stok girişleri iptal edildi.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;

