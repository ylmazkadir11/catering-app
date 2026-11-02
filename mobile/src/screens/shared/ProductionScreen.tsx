// =============================================
// Üretim Modülü Ekranı - En Kritik Modül
// Tarih Seçimi -> Onaylı Menü -> Kişi Sayısı -> Otomatik Gramaj Hesabı
// Manuel Düzeltme -> FIFO ile Stok Düşümü -> PDF/Excel Rapor İndirme
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Surface, TextInput, Button, SegmentedButtons, Dialog, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

import {
  useGetMenusQuery,
  useCalculateProductionMutation,
  useCreateProductionMutation,
  useConfirmProductionMutation,
  useGetProductionReportQuery,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { downloadReportFile } from '../../utils/fileDownload';
import { formatCurrency, getMealTypeLabel } from '../../utils/formatters';
import type { MealType } from '../../types';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Sabah' },
  { value: 'lunch', label: 'Öğle' },
  { value: 'dinner', label: 'Akşam' },
  { value: 'snack', label: 'Ara Öğün' },
];

const ProductionScreen: React.FC = () => {
  const { canEditMenu } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const [personCount, setPersonCount] = useState<number>(100);

  // Hesaplanan Malzeme Listesi (Kullanıcı manuel olarak düzeltebilir)
  const [calculatedItems, setCalculatedItems] = useState<any[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [confirmedProductionId, setConfirmedProductionId] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Tarihteki Menüyü Getir
  const { data: menuData, isLoading: isMenuLoading } = useGetMenusQuery({ date: selectedDate });
  const currentMenu = menuData?.data?.[0];

  const [calculateProduction, { isLoading: isCalculating }] = useCalculateProductionMutation();
  const [createProduction, { isLoading: isCreating }] = useCreateProductionMutation();
  const [confirmProduction, { isLoading: isConfirming }] = useConfirmProductionMutation();

  const changeDay = (days: number) => {
    const current = new Date(selectedDate);
    const updated = days > 0 ? addDays(current, days) : subDays(current, Math.abs(days));
    setSelectedDate(format(updated, 'yyyy-MM-dd'));
    setIsCalculated(false);
    setCalculatedItems([]);
  };

  // 1. İhtiyaç Duyulan Malzemeleri Hesapla (Reçete × Kişi Sayısı)
  const handleCalculate = async () => {
    if (!currentMenu) {
      Alert.alert('Uyarı', 'Bu tarihe ait menü bulunmamaktadır.');
      return;
    }

    if (!currentMenu.is_approved) {
      Alert.alert('Kritik Uyarı', 'Menü henüz ONAYLANMAMIŞTIR! Menü onaylanmadan üretim hesaplanamaz ve stok düşülemez.');
      return;
    }

    if (!personCount || personCount <= 0) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir kişi sayısı giriniz.');
      return;
    }

    try {
      const res = await calculateProduction({
        menuId: currentMenu.id,
        mealType: selectedMeal,
        personCount: Number(personCount),
      }).unwrap();

      if (res.success && res.data) {
        setCalculatedItems(res.data.items || []);
        setIsCalculated(true);
      }
    } catch (err: any) {
      Alert.alert('Hesaplama Hatası', err.data?.message || 'Malzeme hesabı yapılamadı.');
    }
  };

  // Manuel düzeltme: Kullanıcı fiili miktarı değiştirebilir
  const handleActualQtyChange = (index: number, newQty: number) => {
    setCalculatedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], actual_qty: newQty };
      return copy;
    });
  };

  // 2. Üretimi Onayla ve FIFO Stok Düşümü Yap
  const handleExecuteProduction = async () => {
    setConfirmDialogVisible(false);

    try {
      // Önce taslak üretimi oluştur
      const createRes = await createProduction({
        menu_id: currentMenu!.id,
        meal_type: selectedMeal,
        person_count: Number(personCount),
        items: calculatedItems.map((it) => ({
          material_id: it.material_id,
          calculated_qty: it.calculated_qty,
          actual_qty: it.actual_qty,
          unit_id: it.unit_id,
        })),
      }).unwrap();

      const productionId = createRes.data.id;

      // Ardından FIFO ile stok düşümünü onayla
      await confirmProduction(productionId).unwrap();

      setConfirmedProductionId(productionId);
      setReportModalVisible(true);
      setIsCalculated(false);
      setCalculatedItems([]);
    } catch (err: any) {
      Alert.alert('Üretim Onay Hatası', err.data?.message || 'Üretim onaylanamadı. Yeterli stok olmayabilir.');
    }
  };

  // 3. Rapor İndir (PDF / Excel)
  const handleDownloadReport = async (formatType: 'pdf' | 'excel') => {
    if (!confirmedProductionId) return;

    try {
      const url = `http://localhost:3000/api/productions/${confirmedProductionId}/report?format=${formatType}`;
      await downloadReportFile(url, `uretim-raporu-${selectedDate}-${selectedMeal}.${formatType === 'pdf' ? 'pdf' : 'xlsx'}`);
      setReportModalVisible(false);
    } catch (err: any) {
      Alert.alert('İndirme Hatası', err.message || 'Rapor indirilemedi.');
    }
  };

  const isExecuting = isCreating || isConfirming;

  return (
    <View style={styles.container}>
      {/* Tarih Seçici */}
      <Surface style={styles.dateBar} elevation={2}>
        <TouchableOpacity onPress={() => changeDay(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={24} color="#FF6B35" />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateTitle}>
            {format(new Date(selectedDate), 'dd MMMM yyyy, EEEE', { locale: tr })}
          </Text>
          <Text style={styles.dateSubTitle}>
            {currentMenu
              ? currentMenu.is_approved
                ? '✅ Menü Onaylı'
                : '⚠️ Menü Onaysız (Üretim Yapılamaz)'
              : '❌ Menü Yok'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => changeDay(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </Surface>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Parametre Giriş Kartı */}
        <Surface style={styles.configCard} elevation={1}>
          <Text style={styles.configTitle}>Üretim Parametreleri</Text>

          {/* Öğün Seçimi */}
          <Text style={styles.fieldLabel}>Öğün Seçiniz</Text>
          <SegmentedButtons
            value={selectedMeal}
            onValueChange={(val) => {
              setSelectedMeal(val as MealType);
              setIsCalculated(false);
            }}
            buttons={MEAL_TYPES.map((m) => ({
              value: m.value,
              label: m.label,
            }))}
            theme={{ colors: { secondaryContainer: '#FFF3EE', onSecondaryContainer: '#FF6B35' } }}
            style={styles.segmented}
          />

          {/* Kişi Sayısı */}
          <Text style={styles.fieldLabel}>Yemek Yiyecek Kişi Sayısı</Text>
          <TextInput
            mode="outlined"
            keyboardType="numeric"
            value={String(personCount)}
            onChangeText={(val) => {
              setPersonCount(parseInt(val) || 0);
              setIsCalculated(false);
            }}
            outlineColor="#E0E0E0"
            activeOutlineColor="#FF6B35"
            style={styles.input}
            right={<TextInput.Affix text="Kişi" />}
          />

          {/* Hesapla Butonu */}
          <Button
            mode="contained"
            icon="calculator"
            onPress={handleCalculate}
            loading={isCalculating}
            disabled={isCalculating || !currentMenu?.is_approved}
            buttonColor="#FF6B35"
            style={styles.calcBtn}
          >
            Gereken Malzemeleri Hesapla
          </Button>

          {!currentMenu?.is_approved && (
            <Text style={styles.menuWarningText}>
              ⚠️ Üretim yapabilmek için önce Şef veya Admin tarafından menünün onaylanması gerekir.
            </Text>
          )}
        </Surface>

        {/* Hesaplanan Malzemeler Listesi & Manuel Düzeltme */}
        {isCalculated && (
          <Surface style={styles.resultsCard} elevation={2}>
            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.resultsTitle}>Gerekli Malzeme Listesi</Text>
                <Text style={styles.resultsSub}>
                  Sistem gramajları hesapladı. İhtiyaç halinde değerleri manuel düzeltebilirsiniz.
                </Text>
              </View>
            </View>

            {calculatedItems.map((item, index) => {
              const isShortage = item.stock_warning || item.current_stock < item.actual_qty;

              return (
                <View key={item.material_id} style={[styles.itemRow, isShortage && styles.itemRowShortage]}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.material_name}</Text>
                    <Text style={styles.stockInfo}>
                      Mevcut Stok: {parseFloat(String(item.current_stock)).toFixed(2)} {item.unit_abbr}
                    </Text>
                    {isShortage && (
                      <Text style={styles.warningStockText}>
                        ⚠️ Yetersiz Stok! ({parseFloat(String(item.actual_qty)).toFixed(2)} {item.unit_abbr} gerekli)
                      </Text>
                    )}
                  </View>

                  <View style={styles.itemInputs}>
                    <Text style={styles.calcQtyLabel}>
                      Hesaplanan: {parseFloat(String(item.calculated_qty)).toFixed(2)} {item.unit_abbr}
                    </Text>
                    <TextInput
                      mode="outlined"
                      keyboardType="numeric"
                      dense
                      value={String(item.actual_qty)}
                      onChangeText={(val) => handleActualQtyChange(index, parseFloat(val) || 0)}
                      style={styles.actualInput}
                      outlineColor={isShortage ? '#D32F2F' : '#E0E0E0'}
                      activeOutlineColor="#FF6B35"
                      right={<TextInput.Affix text={item.unit_abbr} />}
                    />
                  </View>
                </View>
              );
            })}

            {/* Üretimi Onayla ve İptal Butonları */}
            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                textColor="#D32F2F"
                onPress={() => {
                  setIsCalculated(false);
                  setCalculatedItems([]);
                }}
                style={styles.cancelBtn}
              >
                İptal Et
              </Button>

              <Button
                mode="contained"
                buttonColor="#2E7D32"
                onPress={() => setConfirmDialogVisible(true)}
                loading={isExecuting}
                disabled={isExecuting}
                style={styles.confirmBtn}
              >
                Üretimi Onayla (Stok Düş)
              </Button>
            </View>
          </Surface>
        )}
      </ScrollView>

      {/* Çift Onay Dialogu */}
      <ConfirmDialog
        visible={confirmDialogVisible}
        title="Üretimi Onaylıyor Musunuz?"
        message={`Seçilen ${personCount} kişilik üretim için malzemeler FIFO (İlk Giren İlk Çıkar) prensibiyle mevcut stoktan otomatik düşülecektir. Bu işlem geri alınamaz.`}
        confirmText="Evet, Üretimi Başlat"
        cancelText="Vazgeç"
        confirmColor="#2E7D32"
        onConfirm={handleExecuteProduction}
        onCancel={() => setConfirmDialogVisible(false)}
      />

      {/* Başarılı Üretim Sonrası Rapor İndirme Dialogu */}
      <Portal>
        <Dialog visible={reportModalVisible} onDismiss={() => setReportModalVisible(false)}>
          <Dialog.Title>✅ Üretim Başarıyla Tamamlandı</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Stoklar FIFO ile düşüldü ve işlem loglandı. Kullanılan malzeme raporunu hemen indirmek ister misiniz?
            </Text>
            <View style={styles.reportButtonsRow}>
              <Button
                mode="contained"
                icon="file-pdf-box"
                buttonColor="#D32F2F"
                onPress={() => handleDownloadReport('pdf')}
                style={styles.downloadBtn}
              >
                PDF İndir
              </Button>
              <Button
                mode="contained"
                icon="file-excel-box"
                buttonColor="#2E7D32"
                onPress={() => handleDownloadReport('excel')}
                style={styles.downloadBtn}
              >
                Excel İndir
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReportModalVisible(false)} textColor="#757575">
              Daha Sonra
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {(isMenuLoading || isExecuting) && <LoadingOverlay message="İşlem yapılıyor..." />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateArrow: {
    padding: 6,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  dateSubTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#616161',
    marginTop: 8,
    marginBottom: 6,
  },
  segmented: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  calcBtn: {
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 4,
  },
  menuWarningText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 10,
    lineHeight: 18,
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  resultsHeader: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  resultsSub: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  itemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemRowShortage: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  itemInfo: {
    marginBottom: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  stockInfo: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  warningStockText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: 'bold',
    marginTop: 2,
  },
  itemInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcQtyLabel: {
    fontSize: 12,
    color: '#757575',
  },
  actualInput: {
    width: 140,
    height: 40,
    backgroundColor: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    borderColor: '#D32F2F',
  },
  confirmBtn: {
    borderRadius: 8,
  },
  dialogText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    marginBottom: 16,
  },
  reportButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  downloadBtn: {
    flex: 1,
    borderRadius: 8,
  },
});

export default ProductionScreen;

