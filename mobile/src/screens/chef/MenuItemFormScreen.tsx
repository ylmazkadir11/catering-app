// =============================================
// Menüye Yemek Ekleme / Düzenleme Ekranı
// Öğüne göre yemek seçimi ve maksimum limit kontrolü
// Sabah (5), Öğle (5), Akşam (5), Ara Öğün (3)
// =============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Searchbar, Button, Checkbox, Surface } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  useGetRecipesQuery,
  useGetMenusQuery,
  useCreateMenuMutation,
  useUpdateMenuMutation,
} from '../../services/api';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import { getMealTypeLabel } from '../../utils/formatters';
import type { MealType } from '../../types';

const MenuItemFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { menuDate, mealType, currentItems = [], maxLimit = 5 } = route.params;

  const [search, setSearch] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>(
    currentItems.map((item: any) => item.recipe_id)
  );

  const { data: recipesData, isLoading: isRecipesLoading } = useGetRecipesQuery({ search });
  const { data: menusData, refetch: refetchMenus } = useGetMenusQuery({ date: menuDate });

  const [createMenu, { isLoading: isCreating }] = useCreateMenuMutation();
  const [updateMenu, { isLoading: isUpdating }] = useUpdateMenuMutation();

  const recipes = recipesData?.data || [];
  const existingMenu = menusData?.data?.[0];

  const toggleSelect = (recipeId: string) => {
    if (selectedRecipeIds.includes(recipeId)) {
      setSelectedRecipeIds((prev) => prev.filter((id) => id !== recipeId));
    } else {
      if (selectedRecipeIds.length >= maxLimit) {
        Alert.alert(
          'Limit Aşıldı',
          `${getMealTypeLabel(mealType)} için en fazla ${maxLimit} çeşit yemek seçebilirsiniz.`
        );
        return;
      }
      setSelectedRecipeIds((prev) => [...prev, recipeId]);
    }
  };

  const handleSave = async () => {
    try {
      if (existingMenu) {
        // Mevcut menünün diğer öğünlerdeki yemeklerini koru, bu öğündekileri güncelle
        const otherMealItems = (existingMenu.items || [])
          .filter((i) => i.meal_type !== mealType)
          .map((i) => ({ meal_type: i.meal_type, recipe_id: i.recipe_id, sort_order: i.sort_order }));

        const newMealItems = selectedRecipeIds.map((recipe_id, idx) => ({
          meal_type: mealType as MealType,
          recipe_id,
          sort_order: idx,
        }));

        await updateMenu({
          id: existingMenu.id,
          data: {
            items: [...otherMealItems, ...newMealItems],
          },
        }).unwrap();
      } else {
        // Yeni menü oluştur
        const items = selectedRecipeIds.map((recipe_id, idx) => ({
          meal_type: mealType as MealType,
          recipe_id,
          sort_order: idx,
        }));

        await createMenu({
          menu_date: menuDate,
          items,
        }).unwrap();
      }

      await refetchMenus();
      Alert.alert('Başarılı', 'Menü yemekleri güncellendi.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Hata', err.data?.message || 'Menü kaydedilemedi.');
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <View style={styles.container}>
      {/* Üst Bilgilendirme */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>{getMealTypeLabel(mealType)} Menüsü</Text>
          <Text style={styles.limitText}>
            Seçilen: {selectedRecipeIds.length} / {maxLimit}
          </Text>
        </View>
        <Text style={styles.headerSub}>Tarih: {menuDate}</Text>
      </Surface>

      {/* Arama Çubuğu */}
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Yemek reçetelerinde ara..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#FF6B35"
        />
      </View>

      {/* Reçete Listesi */}
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedRecipeIds.includes(item.id);
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleSelect(item.id)}
            >
              <Surface
                style={[styles.recipeCard, isSelected && styles.selectedCard]}
                elevation={1}
              >
                <Checkbox
                  status={isSelected ? 'checked' : 'unchecked'}
                  onPress={() => toggleSelect(item.id)}
                  color="#FF6B35"
                />
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeName}>{item.name}</Text>
                  {item.category && <Text style={styles.categoryText}>{item.category}</Text>}
                </View>
              </Surface>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !isRecipesLoading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="book-outline" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>Reçete bulunamadı.</Text>
            </View>
          ) : null
        }
      />

      {/* Alt Onay Çubuğu */}
      <Surface style={styles.footer} elevation={4}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          buttonColor="#FF6B35"
          style={styles.saveBtn}
        >
          Seçilen Yemekleri Kaydet ({selectedRecipeIds.length})
        </Button>
      </Surface>

      {(isRecipesLoading || isSaving) && <LoadingOverlay message="İşlem yapılıyor..." />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#212121',
  },
  limitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
  },
  headerSub: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  searchBarContainer: {
    padding: 12,
  },
  searchbar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    elevation: 1,
  },
  searchInput: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  selectedCard: {
    backgroundColor: '#FFF8F5',
    borderColor: '#FFD6C9',
    borderWidth: 1,
  },
  recipeInfo: {
    marginLeft: 8,
    flex: 1,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  categoryText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    color: '#9E9E9E',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 4,
  },
});

export default MenuItemFormScreen;

