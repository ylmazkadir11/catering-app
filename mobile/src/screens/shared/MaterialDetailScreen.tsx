// =============================================
// Malzeme Detay Ekranı - FIFO Partileri ve Stok Hareketleri
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Surface, SegmentedButtons, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  useGetMaterialByIdQuery,
  useGetMaterialBatchesQuery,
  useGetMaterialMovementsQuery,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import StockStatusBadge from '../../components/common/StockStatusBadge';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatDate, formatCurrency } from '../../utils/formatters';

const MaterialDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;
  const { canEditMaterial } = useAuth();

  const [activeTab, setActiveTab] = useState<'batches' | 'movements'>('batches');

  const {
    data: materialData,
    isLoading: isMatLoading,
    refetch: refetchMat,
    isFetching: isMatFetching,
  } = useGetMaterialByIdQuery(id);

  const {
    data: batchesData,
    isLoading: isBatchesLoading,
    refetch: refetchBatches,
    isFetching: isBatchesFetching,
  } = useGetMaterialBatchesQuery(id);

  const {
    data: movementsData,
    isLoading: isMovementsLoading,
    refetch: refetchMovements,
    isFetching: isMovementsFetching,
  } = useGetMaterialMovementsQuery(id);

  const material = materialData?.data;
  const batches = batchesData?.data || [];
  const movements = movementsData?.data || [];

  const isRefreshing = isMatFetching || isBatchesFetching || isMovementsFetching;

  const onRefresh = () => {
    refetchMat();
    refetchBatches();
    refetchMovements();
  };

  if (isMatLoading && !material) {
    return <LoadingOverlay message="Malzeme bilgileri yükleniyor..." />;
  }

  if (!material) {
    return <ErrorMessage message="Malzeme bulunamadı." onRetry={refetchMat} />;
  }

  return (
    <View style={styles.container}>
      {/* Üst Özet Kartı */}
      <Surface style={styles.headerCard} elevation={2}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#212121" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.materialName}>{material.name}</Text>
            <Text style={styles.categoryName}>{material.category || 'Kategori Belirtilmemiş'}</Text>
          </View>
          {canEditMaterial && (
            <IconButton
              icon="pencil"
              iconColor="#FF6B35"
              size={22}
              onPress={() => navigation.navigate('MaterialForm', { material })}
            />
          )}
        </View>

        {/* Stok Durum Metrikleri */}
        <View style={styles.metricRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Mevcut Stok</Text>
            <Text style={styles.metricValue}>
              {parseFloat(String(material.current_stock)).toFixed(2)} {material.unit_abbr || material.unit?.abbreviation}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Minimum Stok</Text>
            <Text style={styles.metricValue}>
              {parseFloat(String(material.minimum_stock)).toFixed(2)} {material.unit_abbr || material.unit?.abbreviation}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Durum</Text>
            <StockStatusBadge
              status={
                material.current_stock <= 0
                  ? 'OUT_OF_STOCK'
                  : material.current_stock < material.minimum_stock
                  ? 'CRITICAL'
                  : 'NORMAL'
              }
            />
          </View>
        </View>
      </Surface>

      {/* Sekme Seçici: Partiler / Hareketler */}
      <View style={styles.tabBar}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          buttons={[
            {
              value: 'batches',
              label: `FIFO Partileri (${batches.filter((b) => !b.is_exhausted).length})`,
              icon: 'layers-outline',
            },
            {
              value: 'movements',
              label: `Stok Hareketleri (${movements.length})`,
              icon: 'swap-horizontal',
            },
          ]}
          theme={{ colors: { secondaryContainer: '#FFF3EE', onSecondaryContainer: '#FF6B35' } }}
        />
      </View>

      {/* Sekme İçeriği */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#FF6B35']} />}
      >
        {activeTab === 'batches' ? (
          /* Partiler (FIFO) Listesi */
          batches.length > 0 ? (
            batches.map((batch) => (
              <Surface
                key={batch.id}
                style={[styles.itemCard, batch.is_exhausted && styles.exhaustedCard]}
                elevation={1}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.batchNoRow}>
                    <Ionicons name="barcode-outline" size={18} color="#FF6B35" />
                    <Text style={styles.batchTitle}>Parti: {batch.batch_number || 'Numarasız'}</Text>
                  </View>
                  <Text
                    style={[
                      styles.batchStatusBadge,
                      batch.is_exhausted ? styles.exhaustedBadge : styles.activeBadge,
                    ]}
                  >
                    {batch.is_exhausted ? 'Tükendi' : 'Aktif (Kullanımda)'}
                  </Text>
                </View>

                <View style={styles.itemDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Giriş Tarihi:</Text>
                    <Text style={styles.detailValue}>{formatDate(batch.entry_date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Son Kullanma:</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        batch.expiry_date ? { color: '#E65100', fontWeight: 'bold' } : {},
                      ]}
                    >
                      {batch.expiry_date ? formatDate(batch.expiry_date) : 'Belirtilmedi'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kalan / Giriş Miktarı:</Text>
                    <Text style={styles.detailValue}>
                      <Text style={{ fontWeight: 'bold', color: '#FF6B35' }}>
                        {parseFloat(String(batch.quantity_remaining)).toFixed(2)}
                      </Text>{' '}
                      / {parseFloat(String(batch.quantity_entered)).toFixed(2)}{' '}
                      {material.unit_abbr || material.unit?.abbreviation}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Birim Fiyat:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(batch.unit_price || 0)}</Text>
                  </View>
                </View>
              </Surface>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="layers-outline" size={40} color="#BDBDBD" />
              <Text style={styles.emptyText}>Henüz parti girişi yapılmamış.</Text>
            </View>
          )
        ) : (
          /* Stok Hareketleri Listesi */
          movements.length > 0 ? (
            movements.map((mov) => {
              const isOut = mov.movement_type === 'out';
              return (
                <Surface key={mov.id} style={styles.itemCard} elevation={1}>
                  <View style={styles.itemHeader}>
                    <View style={styles.movementTypeRow}>
                      <Ionicons
                        name={isOut ? 'arrow-up-circle' : 'arrow-down-circle'}
                        size={22}
                        color={isOut ? '#D32F2F' : '#388E3C'}
                      />
                      <Text
                        style={[
                          styles.movementTypeText,
                          { color: isOut ? '#D32F2F' : '#388E3C' },
                        ]}
                      >
                        {isOut ? 'Üretim Çıkışı (FIFO)' : 'Fatura Girişi'}
                      </Text>
                    </View>
                    <Text style={styles.movementDate}>{formatDate(mov.created_at)}</Text>
                  </View>

                  <View style={styles.itemDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Miktar:</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          { fontWeight: 'bold', color: isOut ? '#D32F2F' : '#388E3C' },
                        ]}
                      >
                        {isOut ? '-' : '+'}
                        {parseFloat(String(mov.quantity)).toFixed(2)}{' '}
                        {material.unit_abbr || material.unit?.abbreviation}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Birim Fiyat:</Text>
                      <Text style={styles.detailValue}>{formatCurrency(mov.unit_price || 0)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Toplam Tutar:</Text>
                      <Text style={styles.detailValue}>{formatCurrency(mov.total_cost || 0)}</Text>
                    </View>
                    {mov.created_by_name && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>İşlemi Yapan:</Text>
                        <Text style={styles.detailValue}>{mov.created_by_name}</Text>
                      </View>
                    )}
                  </View>
                </Surface>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="swap-horizontal" size={40} color="#BDBDBD" />
              <Text style={styles.emptyText}>Henüz stok hareketi yok.</Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitles: {
    flex: 1,
  },
  materialName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#212121',
  },
  categoryName: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  metricRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  metricLabel: {
    fontSize: 11,
    color: '#757575',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  tabBar: {
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  scrollList: {
    padding: 16,
    paddingBottom: 40,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  exhaustedCard: {
    backgroundColor: '#FAFAFA',
    opacity: 0.7,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  batchNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  batchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
  },
  batchStatusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  exhaustedBadge: {
    backgroundColor: '#EEEEEE',
    color: '#757575',
  },
  movementTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  movementTypeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  movementDate: {
    fontSize: 11,
    color: '#757575',
  },
  itemDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#757575',
  },
  detailValue: {
    fontSize: 12,
    color: '#212121',
    fontWeight: '500',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: '#9E9E9E',
  },
});

export default MaterialDetailScreen;

