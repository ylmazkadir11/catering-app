/**
 * Rapor Servisi
 * ==============
 * PDF ve Excel formatında raporlar üretir.
 * pdfkit ve exceljs kütüphanelerini kullanır.
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../config/database');

// ─────────────────────────────────────────────
// VERİ TOPLAMA FONKSİYONLARI
// ─────────────────────────────────────────────

/**
 * Günlük kullanılan malzeme listesi
 * @param {string} date - YYYY-MM-DD
 */
async function generateDailyMaterialReport(date) {
  const result = await db.query(
    `SELECT mat.name AS material_name, u.name AS unit_name, u.abbreviation AS unit_abbr,
            SUM(pi.actual_qty) AS total_qty,
            SUM(pi.total_cost) AS total_cost,
            COUNT(DISTINCT p.id) AS production_count
     FROM production_items pi
     JOIN productions p ON p.id = pi.production_id
     JOIN materials mat ON mat.id = pi.material_id
     JOIN units u ON u.id = pi.unit_id
     WHERE p.production_date = $1
       AND p.status = 'confirmed'
     GROUP BY mat.name, u.name, u.abbreviation
     ORDER BY mat.name`,
    [date]
  );

  return {
    title: `Günlük Malzeme Kullanım Raporu - ${date}`,
    date,
    items: result.rows,
    total_cost: result.rows.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0)
  };
}

/**
 * Tarih aralığına göre malzeme tüketimi
 */
async function generateMaterialConsumptionReport(startDate, endDate) {
  const result = await db.query(
    `SELECT mat.name AS material_name, mat.category,
            u.abbreviation AS unit_abbr,
            SUM(pi.actual_qty) AS total_qty,
            SUM(pi.total_cost) AS total_cost,
            COUNT(DISTINCT p.production_date) AS active_days
     FROM production_items pi
     JOIN productions p ON p.id = pi.production_id
     JOIN materials mat ON mat.id = pi.material_id
     JOIN units u ON u.id = pi.unit_id
     WHERE p.production_date BETWEEN $1 AND $2
       AND p.status = 'confirmed'
     GROUP BY mat.name, mat.category, u.abbreviation
     ORDER BY total_cost DESC`,
    [startDate, endDate]
  );

  return {
    title: `Malzeme Tüketim Raporu - ${startDate} / ${endDate}`,
    startDate,
    endDate,
    items: result.rows,
    total_cost: result.rows.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0)
  };
}

/**
 * Tarih aralığına göre yemek bazlı maliyet
 */
async function generateMealCostReport(startDate, endDate) {
  const result = await db.query(
    `SELECT r.name AS recipe_name, r.category,
            COUNT(DISTINCT p.id) AS production_count,
            SUM(p.person_count) AS total_persons,
            SUM(pi.total_cost) AS total_cost,
            CASE WHEN SUM(p.person_count) > 0
                 THEN SUM(pi.total_cost) / SUM(p.person_count)
                 ELSE 0 END AS cost_per_person
     FROM menu_items mi
     JOIN recipes r ON r.id = mi.recipe_id
     JOIN menus m ON m.id = mi.menu_id
     JOIN productions p ON p.menu_id = m.id AND p.meal_type = mi.meal_type
     JOIN production_items pi ON pi.production_id = p.id
     WHERE p.production_date BETWEEN $1 AND $2
       AND p.status = 'confirmed'
     GROUP BY r.name, r.category
     ORDER BY total_cost DESC`,
    [startDate, endDate]
  );

  return {
    title: `Yemek Bazlı Maliyet Raporu - ${startDate} / ${endDate}`,
    startDate,
    endDate,
    items: result.rows
  };
}

/**
 * Kişi başı maliyet raporu
 */
async function generatePerPersonCostReport(startDate, endDate) {
  const result = await db.query(
    `SELECT p.production_date,
            p.meal_type,
            p.person_count,
            SUM(pi.total_cost) AS total_cost,
            CASE WHEN p.person_count > 0
                 THEN SUM(pi.total_cost) / p.person_count
                 ELSE 0 END AS cost_per_person
     FROM productions p
     JOIN production_items pi ON pi.production_id = p.id
     WHERE p.production_date BETWEEN $1 AND $2
       AND p.status = 'confirmed'
     GROUP BY p.production_date, p.meal_type, p.person_count
     ORDER BY p.production_date, p.meal_type`,
    [startDate, endDate]
  );

  const totalPersons = result.rows.reduce((sum, r) => sum + parseInt(r.person_count), 0);
  const totalCost = result.rows.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0);

  return {
    title: `Kişi Başı Maliyet Raporu - ${startDate} / ${endDate}`,
    startDate,
    endDate,
    items: result.rows,
    total_persons: totalPersons,
    total_cost: totalCost,
    average_cost_per_person: totalPersons > 0 ? totalCost / totalPersons : 0
  };
}

/**
 * Ay sonu toplam gider raporu
 */
async function generateMonthlyExpenseReport(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const result = await db.query(
    `SELECT
       SUM(pi.total_cost) AS total_expense,
       COUNT(DISTINCT p.id) AS production_count,
       SUM(p.person_count) AS total_persons,
       COUNT(DISTINCT p.production_date) AS active_days
     FROM productions p
     JOIN production_items pi ON pi.production_id = p.id
     WHERE p.production_date BETWEEN $1 AND $2
       AND p.status = 'confirmed'`,
    [startDate, endDate]
  );

  // Günlük kırılım
  const dailyResult = await db.query(
    `SELECT p.production_date, SUM(pi.total_cost) AS daily_cost, SUM(p.person_count) AS persons
     FROM productions p
     JOIN production_items pi ON pi.production_id = p.id
     WHERE p.production_date BETWEEN $1 AND $2
       AND p.status = 'confirmed'
     GROUP BY p.production_date
     ORDER BY p.production_date`,
    [startDate, endDate]
  );

  const summary = result.rows[0];

  return {
    title: `${year} Yılı ${month}. Ay Gider Raporu`,
    year: parseInt(year),
    month: parseInt(month),
    startDate,
    endDate,
    total_expense: parseFloat(summary.total_expense || 0),
    production_count: parseInt(summary.production_count || 0),
    total_persons: parseInt(summary.total_persons || 0),
    active_days: parseInt(summary.active_days || 0),
    daily_breakdown: dailyResult.rows
  };
}

// ─────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────

/**
 * Rapor verilerini PDF'e dönüştür
 * @param {object} reportData - Rapor verisi
 * @param {string} reportType - Rapor tipi
 * @returns {Promise<Buffer>} PDF buffer
 */
async function exportToPDF(reportData, reportType) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Font (Latin karakterler için)
    // Türkçe karakter desteği için system font kullan
    try {
      doc.font('Helvetica');
    } catch (e) { /* default */ }

    // Başlık
    doc.fontSize(16).fillColor('#333333').text(reportData.title, { align: 'center' });
    doc.moveDown(0.5);

    // Alt başlık bilgiler
    doc.fontSize(10).fillColor('#666666');
    doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'right' });
    doc.moveDown(1);

    // İçerik - rapor tipine göre
    if (reportType === 'production') {
      _renderProductionPDF(doc, reportData);
    } else {
      _renderGenericTablePDF(doc, reportData);
    }

    doc.end();
  });
}

function _renderProductionPDF(doc, data) {
  doc.fontSize(11).fillColor('#000000');

  // Üst bilgiler
  doc.text(`Tarih: ${data.production_date}`);
  doc.text(`Öğün: ${data.meal_type}`);
  doc.text(`Kişi Sayısı: ${data.person_count}`);
  if (data.confirmed_by) doc.text(`Onaylayan: ${data.confirmed_by}`);
  doc.moveDown(1);

  // Malzeme tablosu
  doc.fontSize(12).fillColor('#FF6B35').text('Kullanılan Malzemeler', { underline: true });
  doc.moveDown(0.5);

  if (data.items && data.items.length > 0) {
    // Tablo başlığı
    doc.fontSize(9).fillColor('#ffffff')
      .rect(40, doc.y, 515, 18).fill('#FF6B35');
    doc.fillColor('#ffffff')
      .text('Malzeme', 45, doc.y - 14)
      .text('Hesaplanan', 200, doc.y - 14, { width: 100, align: 'right' })
      .text('Kullanılan', 310, doc.y - 14, { width: 100, align: 'right' })
      .text('Maliyet (₺)', 420, doc.y - 14, { width: 120, align: 'right' });
    doc.moveDown(0.3);

    data.items.forEach((item, idx) => {
      const y = doc.y;
      if (idx % 2 === 0) {
        doc.rect(40, y, 515, 16).fill('#f5f5f5');
      }
      doc.fillColor('#333333').fontSize(9)
        .text(item.material_name, 45, y + 3)
        .text(`${parseFloat(item.calculated_qty).toFixed(2)} ${item.unit_abbr}`, 200, y + 3, { width: 100, align: 'right' })
        .text(`${parseFloat(item.actual_qty).toFixed(2)} ${item.unit_abbr}`, 310, y + 3, { width: 100, align: 'right' })
        .text(`₺${parseFloat(item.total_cost || 0).toFixed(2)}`, 420, y + 3, { width: 120, align: 'right' });
      doc.moveDown(0.9);
    });

    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#FF6B35')
      .text(`Toplam Maliyet: ₺${parseFloat(data.total_cost || 0).toFixed(2)}`, { align: 'right' });
  } else {
    doc.fontSize(10).fillColor('#666666').text('Malzeme bulunamadı.');
  }
}

function _renderGenericTablePDF(doc, data) {
  doc.fontSize(10).fillColor('#333333');

  if (data.items && data.items.length > 0) {
    const keys = Object.keys(data.items[0]);
    const colWidth = Math.min(515 / keys.length, 150);

    // Başlık satırı
    const headerY = doc.y;
    doc.rect(40, headerY, 515, 18).fill('#FF6B35');
    keys.forEach((key, i) => {
      doc.fillColor('#ffffff').fontSize(8)
        .text(key.replace(/_/g, ' ').toUpperCase(), 45 + i * colWidth, headerY + 4, { width: colWidth - 5 });
    });
    doc.moveDown(1);

    data.items.forEach((item, idx) => {
      if (doc.y > 750) { doc.addPage(); } // Sayfa sonu kontrolü
      const rowY = doc.y;
      if (idx % 2 === 0) doc.rect(40, rowY, 515, 16).fill('#f9f9f9');
      keys.forEach((key, i) => {
        const val = item[key] !== null && item[key] !== undefined ? String(item[key]) : '-';
        doc.fillColor('#333333').fontSize(8)
          .text(val, 45 + i * colWidth, rowY + 3, { width: colWidth - 5 });
      });
      doc.moveDown(0.9);
    });

    if (data.total_cost !== undefined) {
      doc.moveDown(0.5).fontSize(11).fillColor('#FF6B35')
        .text(`Toplam: ₺${parseFloat(data.total_cost).toFixed(2)}`, { align: 'right' });
    }
  } else {
    doc.text('Veri bulunamadı.');
  }
}

// ─────────────────────────────────────────────
// EXCEL EXPORT
// ─────────────────────────────────────────────

/**
 * Rapor verilerini Excel'e dönüştür
 * @param {object} reportData - Rapor verisi
 * @param {string} reportType - Rapor tipi
 * @returns {Promise<Buffer>} Excel buffer
 */
async function exportToExcel(reportData, reportType) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Catering Yönetim Sistemi';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Rapor', {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
  });

  // Başlık stili
  const titleStyle = {
    font: { bold: true, size: 14, color: { argb: 'FF333333' } },
    alignment: { horizontal: 'center' }
  };

  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } },
    alignment: { horizontal: 'center' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  };

  const evenRowStyle = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
  };

  // Başlık
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = reportData.title;
  titleCell.style = titleStyle;

  worksheet.addRow([`Tarih: ${new Date().toLocaleDateString('tr-TR')}`]);
  worksheet.addRow([]);

  if (reportType === 'production') {
    _renderProductionExcel(worksheet, reportData, headerStyle, evenRowStyle);
  } else {
    _renderGenericTableExcel(worksheet, reportData, headerStyle, evenRowStyle);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

function _renderProductionExcel(worksheet, data, headerStyle, evenRowStyle) {
  // Üst bilgiler
  worksheet.addRow(['Tarih:', data.production_date]);
  worksheet.addRow(['Öğün:', data.meal_type]);
  worksheet.addRow(['Kişi Sayısı:', data.person_count]);
  if (data.confirmed_by) worksheet.addRow(['Onaylayan:', data.confirmed_by]);
  worksheet.addRow([]);

  // Tablo başlığı
  const headerRow = worksheet.addRow(['Malzeme', 'Birim', 'Hesaplanan Miktar', 'Kullanılan Miktar', 'Birim Fiyat', 'Maliyet (₺)']);
  headerRow.eachCell(cell => { cell.style = headerStyle; });

  if (data.items) {
    data.items.forEach((item, idx) => {
      const row = worksheet.addRow([
        item.material_name,
        item.unit_abbr,
        parseFloat(item.calculated_qty || 0),
        parseFloat(item.actual_qty || 0),
        parseFloat(item.unit_price || 0),
        parseFloat(item.total_cost || 0)
      ]);
      if (idx % 2 === 0) {
        row.eachCell(cell => {
          cell.style = { ...cell.style, ...evenRowStyle };
        });
      }
    });

    // Toplam satırı
    const totalRow = worksheet.addRow(['', '', '', '', 'TOPLAM:', data.total_cost || 0]);
    totalRow.eachCell(cell => {
      cell.style = { font: { bold: true } };
    });
  }

  // Kolon genişlikleri
  worksheet.columns = [
    { key: 'name', width: 25 },
    { key: 'unit', width: 10 },
    { key: 'calc', width: 18 },
    { key: 'actual', width: 18 },
    { key: 'price', width: 14 },
    { key: 'cost', width: 14 }
  ];
}

function _renderGenericTableExcel(worksheet, data, headerStyle, evenRowStyle) {
  if (!data.items || data.items.length === 0) {
    worksheet.addRow(['Veri bulunamadı.']);
    return;
  }

  const keys = Object.keys(data.items[0]);
  const headerRow = worksheet.addRow(keys.map(k => k.replace(/_/g, ' ').toUpperCase()));
  headerRow.eachCell(cell => { cell.style = headerStyle; });

  data.items.forEach((item, idx) => {
    const row = worksheet.addRow(keys.map(k => item[k]));
    if (idx % 2 === 0) {
      row.eachCell(cell => { cell.style = { ...cell.style, ...evenRowStyle }; });
    }
  });

  if (data.total_cost !== undefined) {
    worksheet.addRow([]);
    const totalRow = worksheet.addRow(['TOPLAM:', data.total_cost]);
    totalRow.eachCell(cell => { cell.style = { font: { bold: true } }; });
  }

  worksheet.columns = keys.map(() => ({ width: 18 }));
}

module.exports = {
  generateDailyMaterialReport,
  generateMaterialConsumptionReport,
  generateMealCostReport,
  generatePerPersonCostReport,
  generateMonthlyExpenseReport,
  exportToPDF,
  exportToExcel
};

