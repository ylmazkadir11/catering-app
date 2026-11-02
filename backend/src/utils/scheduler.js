/**
 * Zamanlanmış Görevler (Cron Jobs)
 * ===================================
 * node-cron ile periyodik kontrol ve bildirim görevleri.
 */

const cron = require('node-cron');
const {
  checkLowStock,
  checkExpiringBatches,
  checkUnreportedProductions
} = require('../services/notificationService');

/**
 * Tüm zamanlanmış görevleri başlatır
 */
function startScheduler() {
  console.log('⏰ Zamanlanmış görevler başlatılıyor...');

  // Her 6 saatte bir: Kritik stok kontrolü
  cron.schedule('0 */6 * * *', async () => {
    console.log('[CRON] Kritik stok kontrolü başladı...');
    await checkLowStock();
  });

  // Her 6 saatte bir: Son kullanma tarihi kontrolü
  cron.schedule('30 */6 * * *', async () => {
    console.log('[CRON] Son kullanma tarihi kontrolü başladı...');
    await checkExpiringBatches();
  });

  // Her gece 23:00: Rapor alınmamış üretim kontrolü
  cron.schedule('0 23 * * *', async () => {
    console.log('[CRON] Rapor alınmamış üretim kontrolü başladı...');
    await checkUnreportedProductions();
  });

  // Uygulama başlarken ilk kontrolü hemen yap (opsiyonel, geliştirme için)
  if (process.env.NODE_ENV === 'development') {
    setTimeout(async () => {
      console.log('[INIT] İlk kontroller çalıştırılıyor...');
      await checkLowStock();
      await checkExpiringBatches();
    }, 5000); // 5 sn sonra
  }

  console.log('✅ Zamanlanmış görevler aktif');
}

module.exports = { startScheduler };

