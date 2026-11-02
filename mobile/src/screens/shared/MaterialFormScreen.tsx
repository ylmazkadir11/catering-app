// =============================================
// Malzeme Form Ekranı - Ekleme / Düzenleme
// React Hook Form + Yup doğrulaması ile
// =============================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, HelperText, Surface } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation, useRoute } from '@react-navigation/native';

import {
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useGetUnitsQuery,
} from '../../services/api';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import LoadingOverlay from '../../components/common/LoadingOverlay';

const materialSchema = yup.object().shape({
  name: yup.string().required('Malzeme adı zorunludur'),
  category: yup.string().optional(),
  unit_id: yup.number().required('Birim seçilmelidir').positive('Geçerli bir birim seçin'),
  minimum_stock: yup
    .number()
    .typeError('Sayısal bir değer giriniz')
    .required('Minimum stok zorunludur')
    .min(0, 'Minimum stok negatif olamaz'),
});

type MaterialFormData = yup.InferType<typeof materialSchema>;

const MaterialFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const editingMaterial = route.params?.material;

  const { data: unitsData, isLoading: isUnitsLoading } = useGetUnitsQuery();
  const [createMaterial, { isLoading: isCreating }] = useCreateMaterialMutation();
  const [updateMaterial, { isLoading: isUpdating }] = useUpdateMaterialMutation();

  const isSaving = isCreating || isUpdating;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MaterialFormData>({
    resolver: yupResolver(materialSchema),
    defaultValues: {
      name: editingMaterial?.name || '',
      category: editingMaterial?.category || '',
      unit_id: editingMaterial?.unit_id || (undefined as any),
      minimum_stock: editingMaterial?.minimum_stock ? parseFloat(editingMaterial.minimum_stock) : 0,
    },
  });

  const units = unitsData?.data || [];
  const unitOptions = units.map((u) => ({
    label: `${u.name} (${u.abbreviation})`,
    value: u.id,
  }));

  const onSubmit = async (formData: MaterialFormData) => {
    try {
      if (editingMaterial) {
        await updateMaterial({
          id: editingMaterial.id,
          data: formData,
        }).unwrap();
        Alert.alert('Başarılı', 'Malzeme başarıyla güncellendi.');
      } else {
        await createMaterial(formData).unwrap();
        Alert.alert('Başarılı', 'Yeni malzeme başarıyla tanımlandı.');
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Hata', err.data?.message || err.message || 'İşlem gerçekleştirilemedi.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.title}>
            {editingMaterial ? 'Malzemeyi Düzenle' : 'Yeni Malzeme Tanımla'}
          </Text>

          {/* Malzeme Adı */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Malzeme Adı *"
                mode="outlined"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.name}
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            )}
          />
          {errors.name && (
            <HelperText type="error" visible={!!errors.name}>
              {errors.name.message}
            </HelperText>
          )}

          {/* Kategori */}
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Kategori (Örn: Et, Sebze, Bakliyat)"
                mode="outlined"
                value={value || ''}
                onBlur={onBlur}
                onChangeText={onChange}
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            )}
          />

          {/* Birim Seçimi */}
          <View style={styles.dropdownContainer}>
            <Controller
              control={control}
              name="unit_id"
              render={({ field: { onChange, value } }) => (
                <SearchableDropdown
                  label="Ölçü Birimi *"
                  placeholder="Birim Seçiniz (kg, gr, lt, adet...)"
                  options={unitOptions}
                  selectedValue={value}
                  onSelect={(val) => onChange(Number(val))}
                  error={errors.unit_id?.message}
                />
              )}
            />
          </View>

          {/* Minimum Stok Seviyesi */}
          <Controller
            control={control}
            name="minimum_stock"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Kritik Minimum Stok Miktarı *"
                mode="outlined"
                keyboardType="numeric"
                value={String(value ?? '')}
                onBlur={onBlur}
                onChangeText={(text) => onChange(parseFloat(text) || 0)}
                error={!!errors.minimum_stock}
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            )}
          />
          {errors.minimum_stock && (
            <HelperText type="error" visible={!!errors.minimum_stock}>
              {errors.minimum_stock.message}
            </HelperText>
          )}

          <Text style={styles.infoHint}>
            💡 Stok bu seviyenin altına düştüğünde sistem otomatik bildirim ve uyarı üretir.
          </Text>

          {/* Butonlar */}
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelBtn}
              textColor="#757575"
            >
              İptal
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isSaving}
              disabled={isSaving}
              buttonColor="#FF6B35"
              style={styles.saveBtn}
            >
              Kaydet
            </Button>
          </View>
        </Surface>
      </ScrollView>

      {isSaving && <LoadingOverlay message="Kaydediliyor..." />}
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
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  input: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  infoHint: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    borderColor: '#BDBDBD',
  },
  saveBtn: {
    minWidth: 100,
  },
});

export default MaterialFormScreen;

