// =============================================
// Malzemeler Ekranı - Malzeme & Stok Listesi
// Arama, filtreleme, kritik stok gösterimi
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
import { Searchbar, FAB, Chip, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useGetMaterialsQuery } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import StockStatusBadge from '../../components/common/StockStatusBadge';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorMessage from '../../components/common/ErrorMessage';
import type { Material } from '../../types';

const CATEGORIES = ['Tümü', 'Et & Tavuk', 'Sebze & Meyve', 'Bakliyat', 'Süt Ürünleri', 'Baharat & Sos', 'Kuru Gıda'];

const MaterialsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { canEditMaterial } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useGetMaterialsQuery({
    search: search || undefined,
    category: selectedCategory !== 'Tümü' ? selectedCategory : undefined,
    lowStock: onlyLowStock ? true : undefined,
  });

  const materials = data?.data || [];

  const renderItem = ({ item }: { item: Material }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('MaterialDetail', { id: item.id, name: item.name })}
    >
      <Surface style={styles.materialCard} elevation={1}>
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.materialName}>{item.name}</Text>
            {item.category ? <Text style={styles.categoryText}>{item.category}</Text> : null}
          </View>
          <StockStatusBadge
            status={
              item.current_stock <= 0
                ? 'OUT_OF_STOCK'
                : item.current_stock < item.minimum_stock
                ? 'CRITICAL'
                : 'NORMAL'
            }
          />
        </View>

        <View style={styles.stockDetails}>
          <View style={styles.stockColumn}>
            <Text style={styles.stockLabel}>Mevcut Stok</Text>
            <Text style={styles.stockValue}>
              {parseFloat(String(item.current_stock)).toFixed(2)} {item.unit_abbr || item.unit?.abbreviation || ''}
            </Text>
          </View>
          <View style={styles.stockDivider} />
          <View style={styles.stockColumn}>
            <Text style={styles.stockLabel}>Kritik Seviye</Text>
            <Text style={styles.stockValue}>
              {parseFloat(String(item.minimum_stock)).toFixed(2)} {item.unit_abbr || item.unit?.abbreviation || ''}
            </Text>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Arama Çubuğu */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Malzeme ara..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#FF6B35"
        />
      </View>

      {/* Kategori ve Filtre Çipleri */}
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

      {/* Kritik Stok Hızlı Filtre */}
      <View style={styles.quickFilterBar}>
        <TouchableOpacity
          style={[styles.filterToggle, onlyLowStock && styles.filterToggleActive]}
          onPress={() => setOnlyLowStock(!onlyLowStock)}
        >
          <Ionicons
            name={onlyLowStock ? 'warning' : 'warning-outline'}
            size={18}
            color={onlyLowStock ? '#D32F2F' : '#757575'}
          />
          <Text style={[styles.filterToggleText, onlyLowStock && styles.filterToggleTextActive]}>
            Sadece Kritik Stok ({materials.filter(m => m.current_stock < m.minimum_stock).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Malzeme Listesi */}
      {isError ? (
        <ErrorMessage message="Malzemeler yüklenemedi." onRetry={refetch} />
      ) : (
        <FlatList
          data={materials}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} colors={['#FF6B35']} />}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>Malzeme bulunamadı.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Malzeme Ekleme FAB Butonu (Sadece Admin ve Depo) */}
      {canEditMaterial && (
        <FAB
          icon="plus"
          style={styles.fab}
          color="#FFFFFF"
          onPress={() => navigation.navigate('MaterialForm')}
        />
      )}

      {isLoading && <LoadingOverlay message="Malzemeler getiriliyor..." />}
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
  quickFilterBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
    alignSelf: 'flex-start',
  },
  filterToggleActive: {
    backgroundColor: '#FFEBEE',
  },
  filterToggleText: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '500',
  },
  filterToggleTextActive: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  categoryText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  stockDetails: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  stockColumn: {
    flex: 1,
    alignItems: 'center',
  },
  stockDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
  },
  stockLabel: {
    fontSize: 11,
    color: '#757575',
    marginBottom: 2,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
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

export default MaterialsScreen;

