// =============================================
// Reçeteler Ekranı - Yemek & Reçete Listesi
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Searchbar, FAB, Surface, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useGetRecipesQuery } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorMessage from '../../components/common/ErrorMessage';
import type { Recipe } from '../../types';

const CATEGORIES = ['Tümü', 'Çorba', 'Ana Yemek', 'Pilav & Makarna', 'Salata & Meze', 'Tatlı', 'Kahvaltılık', 'İçecek'];

const RecipesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { canEditMenu } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');

  const { data, isLoading, isError, refetch, isFetching } = useGetRecipesQuery({
    search: search || undefined,
    category: selectedCategory !== 'Tümü' ? selectedCategory : undefined,
  });

  const recipes = data?.data || [];

  const renderItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('RecipeForm', { recipe: item })}
    >
      <Surface style={styles.recipeCard} elevation={1}>
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.recipeName}>{item.name}</Text>
            {item.category && <Text style={styles.categoryBadge}>{item.category}</Text>}
          </View>
          <View style={styles.itemCountBadge}>
            <Ionicons name="basket-outline" size={14} color="#FF6B35" />
            <Text style={styles.itemCountText}>{item.item_count || item.items?.length || 0} Malzeme</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </Surface>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Arama Çubuğu */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Yemek / Reçete ara..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#FF6B35"
        />
      </View>

      {/* Kategori Çipleri */}
      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCategory === item}
              onPress={() => setSelectedCategory(item)}
              style={[styles.categoryChip, selectedCategory === item && styles.selectedChip]}
              textStyle={[styles.chipText, selectedCategory === item && styles.selectedChipText]}
              showSelectedOverlay
            >
              {item}
            </Chip>
          )}
        />
      </View>

      {/* Reçeteler Listesi */}
      {isError ? (
        <ErrorMessage message="Reçeteler yüklenemedi." onRetry={refetch} />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} colors={['#FF6B35']} />}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>Reçete bulunamadı.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Yeni Reçete Ekleme FAB */}
      {canEditMenu && (
        <FAB
          icon="plus"
          label="Yeni Reçete"
          style={styles.fab}
          color="#FFFFFF"
          onPress={() => navigation.navigate('RecipeForm')}
        />
      )}

      {isLoading && <LoadingOverlay message="Reçeteler yükleniyor..." />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchbar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    elevation: 1,
  },
  searchInput: {
    fontSize: 14,
  },
  chipsRow: {
    paddingVertical: 8,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  selectedChip: {
    backgroundColor: '#FFF3EE',
    borderColor: '#FF6B35',
  },
  chipText: {
    fontSize: 12,
    color: '#616161',
  },
  selectedChipText: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  categoryBadge: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  itemCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemCountText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 13,
    color: '#616161',
    marginTop: 8,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9E9E9E',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: '#FF6B35',
  },
});

export default RecipesScreen;

