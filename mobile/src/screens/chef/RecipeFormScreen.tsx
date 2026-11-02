// =============================================
// Reçete Form Ekranı - Yemek & Kişi Başı Gramaj Tanımlama
// =============================================

import React, { useState, useEffect } from 'react';
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
import { TextInput, Button, Surface, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  useCreateRecipeMutation,
  useUpdateRecipeMutation,
  useGetRecipeByIdQuery,
  useGetMaterialsQuery,
} from '../../services/api';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import LoadingOverlay from '../../components/common/LoadingOverlay';

interface RecipeItemRow {
  material_id: string;
  quantity: number;
  unit_id: number;
  unit_name?: string;
  notes?: string;
}

const RecipeFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const recipeParam = route.params?.recipe;

  // Reçete detayını yükle (düzenleme modunda)
  const { data: recipeDetailData, isLoading: isDetailLoading } = useGetRecipeByIdQuery(
    recipeParam?.id,
    { skip: !recipeParam?.id }
  );

  const { data: materialsData, isLoading: isMaterialsLoading } = useGetMaterialsQuery({});
  const [createRecipe, { isLoading: isCreating }] = useCreateRecipeMutation();
  const [updateRecipe, { isLoading: isUpdating }] = useUpdateRecipeMutation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<RecipeItemRow[]>([
    {
      material_id: '',
      quantity: 0,
      unit_id: 1,
    },
  ]);

  // Düzenleme verilerini forma yükle
  useEffect(() => {
    const rec = recipeDetailData?.data || recipeParam;
    if (rec) {
      setName(rec.name || '');
      setCategory(rec.category || '');
      setDescription(rec.description || '');
      if (rec.items && rec.items.length > 0) {
        setItems(
          rec.items.map((i: any) => ({
            material_id: i.material_id,
            quantity: parseFloat(String(i.quantity)),
            unit_id: i.unit_id,
            unit_name: i.unit_name || i.unit?.name,
            notes: i.notes || '',
          }))
        );
      }
    }
  }, [recipeDetailData, recipeParam]);

  const materials = materialsData?.data || [];
  const materialOptions = materials.map((m) => ({
    label: `${m.name} (${m.unit_abbr || m.unit?.abbreviation || ''})`,
    value: m.id,
  }));

  // Malzeme seçildiğinde birimini otomatik eşle
  const handleSelectMaterial = (index: number, matId: string) => {
    const selectedMat = materials.find((m) => m.id === matId);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        material_id: matId,
        unit_id: selectedMat?.unit_id || 1,
        unit_name: selectedMat?.unit_abbr || selectedMat?.unit?.abbreviation || '',
      };
      return copy;
    });
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        material_id: '',
        quantity: 0,
        unit_id: 1,
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) {
      Alert.alert('Uyarı', 'Reçetede en az bir malzeme bulunmalıdır.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, qty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: qty };
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen yemek adını giriniz.');
      return;
    }

    // Malzemeleri kontrol et
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.material_id) {
        Alert.alert('Hata', `${i + 1}. satırda malzeme seçilmemiş.`);
        return;
      }
      if (!it.quantity || it.quantity <= 0) {
        Alert.alert('Hata', `${i + 1}. satırda kişi başı miktar sıfırdan büyük olmalıdır.`);
        return;
      }
    }

    try {
      const payload = {
        name: name.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        items: items.map((it) => ({
          material_id: it.material_id,
          quantity: parseFloat(String(it.quantity)),
          unit_id: it.unit_id,
          notes: it.notes || undefined,
        })),
      };

      if (recipeParam?.id) {
        await updateRecipe({ id: recipeParam.id, data: payload }).unwrap();
        Alert.alert('Başarılı', 'Reçete güncellendi.');
      } else {
        await createRecipe(payload).unwrap();
        Alert.alert('Başarılı', 'Reçete oluşturuldu.');
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Hata', err.data?.message || err.message || 'İşlem gerçekleştirilemedi.');
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Üst Yemek Bilgileri */}
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.cardTitle}>
            {recipeParam?.id ? 'Reçeteyi Düzenle' : 'Yeni Yemek & Reçete Tanımla'}
          </Text>

          <TextInput
            label="Yemek Adı *"
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#FF6B35"
          />

          <TextInput
            label="Kategori (Örn: Çorba, Ana Yemek, Tatlı)"
            mode="outlined"
            value={category}
            onChangeText={setCategory}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#FF6B35"
          />

          <TextInput
            label="Açıklama / Pişirme Talimatı"
            mode="outlined"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#FF6B35"
          />
        </Surface>

        {/* Reçete Malzemeleri Bölümü */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Reçete Malzemeleri ({items.length})</Text>
            <Text style={styles.sectionSubtitle}>Gramajlar kişi başı olarak girilir.</Text>
          </View>
          <Button
            mode="contained-tonal"
            icon="plus"
            onPress={addRow}
            textColor="#FF6B35"
            style={styles.addRowBtn}
          >
            Malzeme Ekle
          </Button>
        </View>

        {items.map((item, index) => (
          <Surface key={index} style={styles.itemRowCard} elevation={1}>
            <View style={styles.itemRowHeader}>
              <Text style={styles.rowBadgeText}>Malzeme #{index + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeRow(index)}>
                  <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                </TouchableOpacity>
              )}
            </View>

            {/* Malzeme Seçimi */}
            <SearchableDropdown
              label="Malzeme *"
              placeholder="Tanımlı malzeme seçin..."
              options={materialOptions}
              selectedValue={item.material_id}
              onSelect={(val) => handleSelectMaterial(index, String(val))}
            />

            <View style={styles.rowTwoCols}>
              <TextInput
                label="Kişi Başı Miktar *"
                mode="outlined"
                keyboardType="numeric"
                value={item.quantity ? String(item.quantity) : ''}
                onChangeText={(val) => updateQuantity(index, parseFloat(val) || 0)}
                style={[styles.input, { flex: 2 }]}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
              <View style={styles.unitDisplayBox}>
                <Text style={styles.unitDisplayLabel}>Birim</Text>
                <Text style={styles.unitDisplayText}>{item.unit_name || '-'}</Text>
              </View>
            </View>
          </Surface>
        ))}

        {/* Kaydet Butonu */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSaving}
          disabled={isSaving}
          buttonColor="#FF6B35"
          style={styles.submitBtn}
        >
          Reçeteyi Kaydet
        </Button>
      </ScrollView>

      {(isSaving || isDetailLoading) && <LoadingOverlay message="Kaydediliyor..." />}
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
  sectionSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
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
    alignItems: 'center',
    gap: 12,
  },
  unitDisplayBox: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    height: 50,
    justifyContent: 'center',
  },
  unitDisplayLabel: {
    fontSize: 10,
    color: '#757575',
  },
  unitDisplayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
  },
  submitBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 12,
  },
});

export default RecipeFormScreen;

