// =============================================
// Dosya İndirme Yardımcı Fonksiyonları
// PDF/Excel dosyalarını indir ve paylaş
// =============================================

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://localhost:3000/api';

// İndirme durumu callback tipi
type ProgressCallback = (progress: number) => void;

/**
 * API'den dosya indir ve paylaşım diyaloğu göster
 * @param endpoint - API endpoint yolu (örn: /reports/daily-materials)
 * @param filename - Kaydedilecek dosya adı
 * @param format - Dosya formatı (pdf veya excel)
 * @param onProgress - İlerleme callback'i (0-100)
 */
export const downloadAndShare = async (
  endpoint: string,
  filename: string,
  format: 'pdf' | 'excel',
  onProgress?: ProgressCallback
): Promise<boolean> => {
  try {
    // Token'ı al
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Oturum açık değil');
    }

    // Dosya uzantısı
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    // Geçici dosya yolu
    const fileUri = FileSystem.documentDirectory + `${filename}.${extension}`;

    // Dosyayı indir
    const downloadResumable = FileSystem.createDownloadResumable(
      `${BASE_URL}${endpoint}`,
      fileUri,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: mimeType,
        },
      },
      (downloadProgress) => {
        if (onProgress) {
          const progress =
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
          onProgress(Math.round(progress));
        }
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (!result || result.status !== 200) {
      throw new Error('Dosya indirilemedi');
    }

    // Paylaşım mümkün mü kontrol et
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Paylaşım bu cihazda desteklenmiyor');
    }

    // Paylaşım diyaloğunu göster
    await Sharing.shareAsync(result.uri, {
      mimeType,
      dialogTitle: `${filename} Dosyasını Paylaş`,
      UTI: format === 'pdf' ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet',
    });

    return true;
  } catch (error) {
    console.error('Dosya indirme hatası:', error);
    throw error;
  }
};

/**
 * Üretim raporunu indir
 */
export const downloadProductionReport = async (
  productionId: number,
  format: 'pdf' | 'excel',
  onProgress?: ProgressCallback
): Promise<boolean> => {
  return downloadAndShare(
    `/productions/${productionId}/report?format=${format}`,
    `uretim-raporu-${productionId}`,
    format,
    onProgress
  );
};

/**
 * Günlük malzeme listesini indir
 */
export const downloadDailyMaterialsReport = async (
  date: string,
  format: 'pdf' | 'excel',
  onProgress?: ProgressCallback
): Promise<boolean> => {
  return downloadAndShare(
    `/reports/daily-materials?date=${date}&format=${format}`,
    `gunluk-malzeme-${date}`,
    format,
    onProgress
  );
};

/**
 * Malzeme tüketim raporunu indir
 */
export const downloadMaterialConsumptionReport = async (
  startDate: string,
  endDate: string,
  format: 'pdf' | 'excel',
  onProgress?: ProgressCallback
): Promise<boolean> => {
  return downloadAndShare(
    `/reports/material-consumption?start_date=${startDate}&end_date=${endDate}&format=${format}`,
    `malzeme-tuketim-${startDate}-${endDate}`,
    format,
    onProgress
  );
};

/**
 * Yemek bazlı maliyet raporunu indir
 */
export const downloadMealCostReport = async (
  startDate: string,
  endDate: string,
  format: 'pdf' | 'excel',
  onProgress?: ProgressCallback
): Promise<boolean> => {
  return downloadAndShare(
    `/reports/meal-cost?start_date=${startDate}&end_date=${endDate}&format=${format}`,
    `yemek-maliyet-${startDate}-${endDate}`,
    format,
    onProgress
  );
};

/**
 * Kişi başı maliyet raporunu indir
 */
export const downloadPerPersonCostReport = async (
  startDate: string,
  endDate: string,
  format: 'pdf' | 'excel',
  onProgress?: ProgressCallback
): Promise<boolean> => {
  return downloadAndShare(
    `/reports/per-person-cost?start_date=${startDate}&end_date=${endDate}&format=${format}`,
    `kisi-basi-maliyet-${startDate}-${endDate}`,
    format,
    onProgress
  );
};

/**
 * Ay sonu gider raporunu indir
 */
export const downloadMonthlyExpenseReport = async (
  month: number,
  year: number,
  format: 'pdf' | 'excel',
  onProgress?: ProgressCallback
): Promise<boolean> => {
  return downloadAndShare(
    `/reports/monthly-expense?month=${month}&year=${year}&format=${format}`,
    `ay-sonu-gider-${year}-${month}`,
    format,
    onProgress
  );
};
