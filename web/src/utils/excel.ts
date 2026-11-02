import * as XLSX from 'xlsx';

/**
 * Excel dosyasını indirir
 */
export function exportToExcelFile(data: any[], sheetName: string, fileName: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Malzeme Excel Şablonu İndir
 */
export function downloadMaterialTemplate() {
  const templateData = [
    {
      'Malzeme Adı': 'Dana Kuşbaşı',
      'Kategori': 'Et & Tavuk',
      'Birim': 'kg',
      'Min Stok': 20,
      'Kritik Stok': 5,
      'Barkod': '8690001001'
    },
    {
      'Malzeme Adı': 'Baldo Pirinç',
      'Kategori': 'Bakliyat',
      'Birim': 'kg',
      'Min Stok': 30,
      'Kritik Stok': 10,
      'Barkod': '8690001002'
    },
    {
      'Malzeme Adı': 'Ayçiçek Yağı',
      'Kategori': 'Kuru Gıda',
      'Birim': 'lt',
      'Min Stok': 15,
      'Kritik Stok': 5,
      'Barkod': '8690001003'
    },
    {
      'Malzeme Adı': 'Domates Salçası',
      'Kategori': 'Baharat & Sos',
      'Birim': 'kg',
      'Min Stok': 10,
      'Kritik Stok': 3,
      'Barkod': '8690001004'
    }
  ];

  exportToExcelFile(templateData, 'Malzemeler', 'malzeme_yukleme_sablonu');
}

/**
 * Reçete Excel Şablonu İndir
 * Reçeteler ve malzemeleri hiyerarşik veya satır bazında belirtilebilir
 */
export function downloadRecipeTemplate() {
  const templateData = [
    {
      'Yemek Adı': 'Dana Kavurma',
      'Kategori': 'Ana Yemek',
      'Standart Porsiyon': 10,
      'Açıklama': 'Geleneksel lokum kıvamında kavurma',
      'Malzeme Adı': 'Dana Kuşbaşı',
      'Miktar': 1.5,
      'Birim': 'kg',
      'Fire Oranı (%)': 5,
      'Pişirme Talimatı': 'Kısık ateşte kendi yağında 1.5 saat pişirin.'
    },
    {
      'Yemek Adı': 'Dana Kavurma',
      'Kategori': 'Ana Yemek',
      'Standart Porsiyon': 10,
      'Açıklama': 'Geleneksel lokum kıvamında kavurma',
      'Malzeme Adı': 'Ayçiçek Yağı',
      'Miktar': 0.1,
      'Birim': 'lt',
      'Fire Oranı (%)': 0,
      'Pişirme Talimatı': 'Kısık ateşte kendi yağında 1.5 saat pişirin.'
    },
    {
      'Yemek Adı': 'Pirinç Pilavı',
      'Kategori': 'Pilav & Makarna',
      'Standart Porsiyon': 10,
      'Açıklama': 'Tereyağlı tane tane pirinç pilavı',
      'Malzeme Adı': 'Baldo Pirinç',
      'Miktar': 1.0,
      'Birim': 'kg',
      'Fire Oranı (%)': 0,
      'Pişirme Talimatı': 'Pirinçleri ılık suda bekletip tereyağında kavurun.'
    },
    {
      'Yemek Adı': 'Pirinç Pilavı',
      'Kategori': 'Pilav & Makarna',
      'Standart Porsiyon': 10,
      'Açıklama': 'Tereyağlı tane tane pirinç pilavı',
      'Malzeme Adı': 'Ayçiçek Yağı',
      'Miktar': 0.15,
      'Birim': 'lt',
      'Fire Oranı (%)': 0,
      'Pişirme Talimatı': 'Pirinçleri ılık suda bekletip tereyağında kavurun.'
    }
  ];

  exportToExcelFile(templateData, 'Reçeteler', 'recete_yukleme_sablonu');
}

/**
 * Excel veya CSV dosyasını JSON listesine dönüştürür
 */
export async function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

