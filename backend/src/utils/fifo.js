// =====================================================
// src/utils/fifo.js
// FIFO (İlk Giren İlk Çıkar) Stok Düşme Algoritması
// Üretim onayı sırasında malzeme stoğunu FIFO mantığıyla düşer
// =====================================================

/**
 * FIFO yöntemiyle stoktan malzeme düşer
 * @param {PoolClient} client - Transaction içindeki veritabanı istemcisi
 * @param {number} materialId - Malzeme ID'si
 * @param {number} requiredQty - Düşülmesi gereken miktar
 * @param {number} productionId - İlgili üretim ID'si
 * @param {number} createdBy - İşlemi yapan kullanıcı ID'si
 * @returns {Promise<{totalCost: number, usedBatches: Array}>} Toplam maliyet ve kullanılan partiler
 * @throws {Error} Yeterli stok yoksa hata fırlatır
 */
const deductStock = async (client, materialId, requiredQty, productionId, createdBy) => {
  // Toplam maliyet ve kullanılan parti bilgilerini sakla
  let totalCost = 0;
  let remainingQty = requiredQty;
  const usedBatches = [];

  // Malzeme bilgisini al
  const materialResult = await client.query(
    'SELECT id, name, current_stock, unit_id FROM materials WHERE id = $1 FOR UPDATE',
    [materialId]
  );

  if (materialResult.rows.length === 0) {
    throw new Error(`Malzeme bulunamadı: ID ${materialId}`);
  }

  const material = materialResult.rows[0];

  // Toplam mevcut stoğu kontrol et
  if (parseFloat(material.current_stock) < requiredQty) {
    throw new Error(
      `Yetersiz stok: '${material.name}' için ${requiredQty} birim gerekli, ` +
      `mevcut stok: ${material.current_stock} birim`
    );
  }

  // FIFO: entry_date ASC sırasıyla bitmemiş partileri çek
  // Satır kilitleme (FOR UPDATE) ile eş zamanlı işlemlerde tutarlılık sağla
  const batchesResult = await client.query(
    `SELECT id, batch_number, quantity, remaining_quantity, unit_price, 
            entry_date, expiry_date, invoice_id
     FROM batches
     WHERE material_id = $1 AND is_exhausted = false AND remaining_quantity > 0
     ORDER BY entry_date ASC, id ASC
     FOR UPDATE`,
    [materialId]
  );

  const batches = batchesResult.rows;

  // Toplam mevcut miktarı doğrula (teorik kontrol)
  const totalAvailable = batches.reduce((sum, b) => sum + parseFloat(b.remaining_quantity), 0);
  if (totalAvailable < requiredQty) {
    throw new Error(
      `Parti stokları tutarsız: '${material.name}' için ${requiredQty} birim gerekli, ` +
      `partilerde toplam: ${totalAvailable.toFixed(3)} birim`
    );
  }

  // Her partiden sırayla düş
  for (const batch of batches) {
    if (remainingQty <= 0) break;

    const batchRemaining = parseFloat(batch.remaining_quantity);
    const unitPrice = parseFloat(batch.unit_price);

    // Bu partiden ne kadar alınacak?
    const deductFromBatch = Math.min(batchRemaining, remainingQty);
    const batchCost = deductFromBatch * unitPrice;

    totalCost += batchCost;
    remainingQty -= deductFromBatch;

    // Yeni kalan miktarı hesapla
    const newRemaining = batchRemaining - deductFromBatch;
    const isExhausted = newRemaining <= 0.0001; // Kayan nokta hassasiyeti için tolerans

    // Partiyi güncelle
    await client.query(
      `UPDATE batches 
       SET remaining_quantity = $1, is_exhausted = $2, updated_at = NOW()
       WHERE id = $3`,
      [isExhausted ? 0 : newRemaining, isExhausted, batch.id]
    );

    // Stok hareketi kaydı oluştur (çıkış)
    await client.query(
      `INSERT INTO stock_movements 
         (material_id, batch_id, movement_type, quantity, unit_price, total_cost, 
          production_id, created_by, notes, created_at)
       VALUES ($1, $2, 'out', $3, $4, $5, $6, $7, $8, NOW())`,
      [
        materialId,
        batch.id,
        deductFromBatch,
        unitPrice,
        batchCost,
        productionId,
        createdBy,
        `FIFO stok düşme - Parti: ${batch.batch_number || batch.id}`,
      ]
    );

    // Kullanılan parti bilgisini kaydet
    usedBatches.push({
      batchId: batch.id,
      batchNumber: batch.batch_number,
      deductedQty: deductFromBatch,
      unitPrice,
      cost: batchCost,
      wasExhausted: isExhausted,
    });
  }

  // materials.current_stock'u güncelle
  await client.query(
    `UPDATE materials 
     SET current_stock = current_stock - $1, updated_at = NOW()
     WHERE id = $2`,
    [requiredQty, materialId]
  );

  return {
    totalCost: parseFloat(totalCost.toFixed(4)),
    usedBatches,
    materialId,
    materialName: material.name,
    deductedQty: requiredQty,
  };
};

module.exports = { deductStock };
