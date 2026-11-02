// =============================================
// Formatlama Yardımcı Fonksiyonları
// Tarih, para birimi, durum etiketleri vb.
// =============================================

import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { MealType, ProductionStatus } from '../types';

/**
 * Tarihi Türkçe formatta göster
 * @param date - ISO tarih dizesi veya Date nesnesi
 * @param dateFormat - Tarih formatı (varsayılan: dd MMMM yyyy)
 */
export const formatDate = (
  date: string | Date | null | undefined,
  dateFormat: string = 'dd MMMM yyyy'
): string => {
  if (!date) return '-';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return format(dateObj, dateFormat, { locale: tr });
  } catch {
    return '-';
  }
};

/**
 * Tarih ve saati Türkçe formatta göster
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  return formatDate(date, 'dd MMM yyyy HH:mm');
};

/**
 * API için tarih formatı (YYYY-MM-DD)
 */
export const formatDateForApi = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Para birimini Türk Lirası formatında göster
 * @param amount - Miktar (sayı)
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '₺0,00';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Miktarı birim ile birlikte göster
 * @param qty - Miktar
 * @param unit - Birim kısaltması
 */
export const formatQuantity = (qty: number | null | undefined, unit?: string): string => {
  if (qty === null || qty === undefined) return '-';
  const formattedQty = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(qty);
  return unit ? `${formattedQty} ${unit}` : formattedQty;
};

/**
 * Öğün tipini Türkçe etikete çevir
 */
export const getMealTypeLabel = (type: MealType): string => {
  const labels: Record<MealType, string> = {
    breakfast: 'Sabah Kahvaltısı',
    lunch: 'Öğle Yemeği',
    dinner: 'Akşam Yemeği',
    snack: 'Ara Öğün',
  };
  return labels[type] || type;
};

/**
 * Öğün tipi kısaltma etiketi
 */
export const getMealTypeShortLabel = (type: MealType): string => {
  const labels: Record<MealType, string> = {
    breakfast: 'Sabah',
    lunch: 'Öğle',
    dinner: 'Akşam',
    snack: 'Ara Öğün',
  };
  return labels[type] || type;
};

/**
 * Üretim durumunu Türkçe etikete çevir
 */
export const getStatusLabel = (status: ProductionStatus | string): string => {
  const labels: Record<string, string> = {
    draft: 'Taslak',
    confirmed: 'Onaylandı',
    cancelled: 'İptal Edildi',
  };
  return labels[status] || status;
};

/**
 * Üretim durumuna göre renk döndür
 */
export const getStatusColor = (status: ProductionStatus | string): string => {
  const colors: Record<string, string> = {
    draft: '#FF9800',      // Turuncu - taslak
    confirmed: '#4CAF50',  // Yeşil - onaylandı
    cancelled: '#F44336',  // Kırmızı - iptal
  };
  return colors[status] || '#9E9E9E';
};

/**
 * Stok durumuna göre renk döndür
 * @param current - Mevcut stok
 * @param minimum - Minimum stok
 */
export const getStockStatusColor = (current: number, minimum: number): string => {
  if (current <= 0) return '#F44336';       // Kırmızı - tükendi
  if (current <= minimum) return '#FF9800'; // Turuncu - kritik
  return '#4CAF50';                          // Yeşil - normal
};

/**
 * Stok durumu etiketi
 */
export const getStockStatusLabel = (current: number, minimum: number): string => {
  if (current <= 0) return 'Tükendi';
  if (current <= minimum) return 'Kritik';
  return 'Normal';
};

/**
 * Rol adını Türkçe etikete çevir
 */
export const getRoleLabel = (roleName: string): string => {
  const labels: Record<string, string> = {
    admin: 'Yönetici',
    chef: 'Şef',
    depot: 'Depo Görevlisi',
  };
  return labels[roleName] || roleName;
};

/**
 * Stok hareketi tipini Türkçe etikete çevir
 */
export const getMovementTypeLabel = (type: string): string => {
  return type === 'in' ? 'Giriş' : 'Çıkış';
};

/**
 * Stok hareketi tipine göre renk
 */
export const getMovementTypeColor = (type: string): string => {
  return type === 'in' ? '#4CAF50' : '#F44336';
};

/**
 * Ay adını Türkçe döndür
 */
export const getMonthName = (month: number): string => {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  return months[month - 1] || '';
};

/**
 * Son kullanma tarihine göre uyarı rengi
 * @param expiryDate - Son kullanma tarihi
 */
export const getExpiryColor = (expiryDate: string | undefined): string => {
  if (!expiryDate) return '#9E9E9E';
  try {
    const expiry = parseISO(expiryDate);
    const now = new Date();
    const daysRemaining = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) return '#F44336';   // Kırmızı - geçmiş
    if (daysRemaining <= 7) return '#FF9800';   // Turuncu - 7 gün içinde
    if (daysRemaining <= 30) return '#FFC107';  // Sarı - 30 gün içinde
    return '#4CAF50';                            // Yeşil - uzak tarih
  } catch {
    return '#9E9E9E';
  }
};
