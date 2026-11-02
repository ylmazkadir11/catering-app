// =============================================
// Fatura Form Ekranı - Dinamik Çoklu Malzeme Girişi
// Birim fiyat otomatik hesaplama (Toplam Tutar / Miktar)
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Surface, IconButton, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  useCreateInvoiceMutation,
  useGetMaterialsQuery,
} from '../../services/api';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import { formatCurrency } from '../../utils/formatters';

interface InvoiceItemRow {
  material_id: string;
  quantity: number;
  total_price: number;
  expiry_date: string;
  batch_number: string;
}

const InvoiceFormScreen: React.FC = () => {
  const navigation = useNavigation();

  // Fatura Üst Bilgileri
  const [invoiceNo, setInvoiceNo] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Dinamik Malzeme Satırları
  const [items, setItems] = useState<InvoiceItemRow[]>([
    {
      material_id: '',
      quantity: 0,
      total_price: 0,
      expiry_date: '',
      batch_number: '',
    },
  ]);

  const { data: materialsData, isLoading: isMaterialsLoading } = useGetMaterialsQuery({});
  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  const materials = materialsData?.data || [];
  const materialOptions = materials.map((m) => ({
    label: `${m.name} (${m.unit_abbr || m.unit?.abbreviation || ''})`,
    value: m.id,
  }));

  // Satır Ekle
  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        material_id: '',
        quantity: 0,
        total_price: 0,
        expiry_date: '',
        batch_number: '',
      },
    ]);
  };

  // Satır Sil
  const removeRow = (index: number) => {
    if (items.length === 1) {
      Alert.alert('Uyarı', 'Faturada en az bir malzeme bulunmalıdır.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Satır Değerini Güncelle
  const updateRow = (index: number, field: keyof InvoiceItemRow, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Genel Fatura Toplamı
  const grandTotal = items.reduce((sum, it) => sum + (parseFloat(String(it.total_price)) || 0), 0);

  const handleSubmit = async () => {
    if (!invoiceNo.trim()) {
      Alert.alert('Hata', 'Lütfen fatura numarasını giriniz.');
      return;
    }

    if (!invoiceDate.trim()) {
      Alert.alert('Hata', 'Lütfen fatura tarihini giriniz.');
      return;
    }

    // Malzeme satırlarını doğrula
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.material_id) {
        Alert.alert('Hata', `${i + 1}. satırda malzeme seçilmemiş.`);
        return;
      }
      if (!it.quantity || it.quantity <= 0) {
        Alert.alert('Hata', `${i + 1}. satırda miktar sıfırdan büyük olmalıdır.`);
        return;
      }
      if (it.total_price < 0) {
        Alert.alert('Hata', `${i + 1}. satırda toplam tutar negatif olamaz.`);
        return;
      }
    }

    try {
      await createInvoice({
        invoice_no: invoiceNo.trim(),
        supplier_name: supplierName.trim() || undefined,
        invoice_date: invoiceDate.trim(),
        notes: notes.trim() || undefined,
        items: items.map((it, idx) => ({
          material_id: it.material_id,
          quantity: parseFloat(String(it.quantity)),
          total_price: parseFloat(String(it.total_price)),
          expiry_date: it.expiry_date.trim() || undefined,
          batch_number: it.batch_number.trim() || `${invoiceNo.trim()}-P${idx + 1}`,
        })),
      }).unwrap();

      Alert.alert('Başarılı', 'Fatura ve malzeme partileri başarıyla kaydedildi.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Hata', err.data?.message || err.message || 'Fatura kaydedilemedi.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Üst Bilgiler Kartı */}
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.cardTitle}>Fatura Bilgileri</Text>

          <TextInput
            label="Fatura No *"
            mode="outlined"
            value={invoiceNo}
            onChangeText={setInvoiceNo}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#FF6B35"
          />

          <TextInput
            label="Tedarikçi Adı"
            mode="outlined"
            value={supplierName}
            onChangeText={setSupplierName}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#FF6B35"
          />

          <TextInput
            label="Fatura Giriş Tarihi (YYYY-MM-DD) *"
            mode="outlined"
            value={invoiceDate}
            onChangeText={setInvoiceDate}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#FF6B35"
          />

          <TextInput
            label="Notlar / Açıklama"
            mode="outlined"
            value={notes}
            onChangeText={setNotes}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#FF6B35"
          />
        </Surface>

        {/* Malzemeler ve Partiler Bölümü */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Giriş Yapılacak Malzemeler ({items.length})</Text>
          <Button
            mode="contained-tonal"
            icon="plus"
            onPress={addRow}
            textColor="#FF6B35"
            style={styles.addRowBtn}
          >
            Satır Ekle
          </Button>
        </View>

        {items.map((item, index) => {
          const qty = parseFloat(String(item.quantity)) || 0;
          const total = parseFloat(String(item.total_price)) || 0;
          const calculatedUnitPrice = qty > 0 ? total / qty : 0;

          return (
            <Surface key={index} style={styles.itemRowCard} elevation={1}>
              <View style={styles.itemRowHeader}>
                <Text style={styles.rowBadgeText}>Kalem #{index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeRow(index)}>
                    <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Malzeme Seçimi */}
              <SearchableDropdown
                label="Malzeme Seç *"
                placeholder="Malzeme arayın..."
                options={materialOptions}
                selectedValue={item.material_id}
                onSelect={(val) => updateRow(index, 'material_id', String(val))}
              />

              <View style={styles.rowTwoCols}>
                <TextInput
                  label="Miktar *"
                  mode="outlined"
                  keyboardType="numeric"
                  value={item.quantity ? String(item.quantity) : ''}
                  onChangeText={(val) => updateRow(index, 'quantity', parseFloat(val) || 0)}
                  style={[styles.input, { flex: 1 }]}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#FF6B35"
                />
                <TextInput
                  label="Toplam Tutar (₺) *"
                  mode="outlined"
                  keyboardType="numeric"
                  value={item.total_price ? String(item.total_price) : ''}
                  onChangeText={(val) => updateRow(index, 'total_price', parseFloat(val) || 0)}
                  style={[styles.input, { flex: 1 }]}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#FF6B35"
                />
              </View>

              {/* Otomatik Hesaplanmış Birim Fiyat Gösterimi */}
              <View style={styles.autoCalcBox}>
                <Ionicons name="calculator-outline" size={16} color="#757575" />
                <Text style={styles.autoCalcText}>
                  Otomatik Birim Fiyat: <Text style={styles.calcHighlight}>{formatCurrency(calculatedUnitPrice)}</Text>
                </Text>
              </View>

              <View style={styles.rowTwoCols}>
                <TextInput
                  label="Son Kullanma Tarihi (YYYY-MM-DD)"
                  mode="outlined"
                  value={item.expiry_date}
                  onChangeText={(val) => updateRow(index, 'expiry_date', val)}
                  style={[styles.input, { flex: 1 }]}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#FF6B35"
                />
                <TextInput
                  label="Parti No (İsteğe Bağlı)"
                  mode="outlined"
                  value={item.batch_number}
                  onChangeText={(val) => updateRow(index, 'batch_number', val)}
                  style={[styles.input, { flex: 1 }]}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#FF6B35"
                />
              </View>
            </Surface>
          );
        })}

        {/* Toplam ve Kaydet Kartı */}
        <Surface style={styles.summaryCard} elevation={2}>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Fatura Genel Toplamı:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
          </View>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isCreating}
            disabled={isCreating}
            buttonColor="#FF6B35"
            style={styles.submitBtn}
          >
            Faturayı ve Partileri Onayla & Kaydet
          </Button>
        </Surface>
      </ScrollView>

      {isCreating && <LoadingOverlay message="Fatura ve stok partileri kaydediliyor..." />}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  input: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#37474F',
  },
  addRowBtn: {
    borderRadius: 8,
  },
  itemRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  itemRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 8,
  },
  autoCalcBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  autoCalcText: {
    fontSize: 12,
    color: '#5D4037',
  },
  calcHighlight: {
    fontWeight: 'bold',
    color: '#E65100',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF6B35',
  },
  submitBtn: {
    borderRadius: 8,
    paddingVertical: 4,
  },
});

export default InvoiceFormScreen;

