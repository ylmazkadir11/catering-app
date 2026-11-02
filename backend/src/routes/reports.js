/**
 * Raporlama Route'ları
 * =======================
 * Günlük malzeme listesi, tüketim, yemek maliyeti,
 * kişi başı maliyet ve ay sonu gider raporları (JSON, PDF, Excel).
 */

const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');

router.use(authenticate);

// Yardımcı: Yanıtı formata göre gönder (JSON, PDF, Excel)
async function sendReportResponse(res, reportData, reportType, format, filename, req) {
  await logAction(req.user.id, req.user.username, 'GENERATE_REPORT', 'report', null, null, { reportType, format }, req.ip);

  if (format === 'pdf') {
    const pdfBuffer = await reportService.exportToPDF(reportData, reportType);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    return res.send(pdfBuffer);
  }

  if (format === 'excel') {
    const excelBuffer = await reportService.exportToExcel(reportData, reportType);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(excelBuffer);
  }

  return res.json({ success: true, data: reportData });
}

// 1. GET /api/reports/daily-materials - Günlük kullanılan malzeme listesi
router.get('/daily-materials', async (req, res, next) => {
  try {
    const { date = new Date().toISOString().split('T')[0], format = 'json' } = req.query;
    const reportData = await reportService.generateDailyMaterialReport(date);
    await sendReportResponse(res, reportData, 'daily-materials', format, `gunluk-malzeme-${date}`, req);
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/reports/material-consumption - Tarih aralığına göre malzeme tüketimi
router.get('/material-consumption', async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Başlangıç ve bitiş tarihleri zorunlu.' });
    }
    const reportData = await reportService.generateMaterialConsumptionReport(startDate, endDate);
    await sendReportResponse(res, reportData, 'material-consumption', format, `malzeme-tuketimi-${startDate}_${endDate}`, req);
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/reports/meal-cost - Tarih aralığına göre yemek bazlı maliyet
router.get('/meal-cost', async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Başlangıç ve bitiş tarihleri zorunlu.' });
    }
    const reportData = await reportService.generateMealCostReport(startDate, endDate);
    await sendReportResponse(res, reportData, 'meal-cost', format, `yemek-maliyeti-${startDate}_${endDate}`, req);
  } catch (err) {
    next(err);
  }
});

// 4. GET /api/reports/per-person-cost - Kişi başı maliyet
router.get('/per-person-cost', async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Başlangıç ve bitiş tarihleri zorunlu.' });
    }
    const reportData = await reportService.generatePerPersonCostReport(startDate, endDate);
    await sendReportResponse(res, reportData, 'per-person-cost', format, `kisi-basi-maliyet-${startDate}_${endDate}`, req);
  } catch (err) {
    next(err);
  }
});

// 5. GET /api/reports/monthly-expense - Ay sonu toplam gider
router.get('/monthly-expense', async (req, res, next) => {
  try {
    const today = new Date();
    const { year = today.getFullYear(), month = today.getMonth() + 1, format = 'json' } = req.query;
    const reportData = await reportService.generateMonthlyExpenseReport(parseInt(year), parseInt(month));
    await sendReportResponse(res, reportData, 'monthly-expense', format, `aylik-gider-${year}-${month}`, req);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

