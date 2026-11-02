// =============================================
// Faturalar Ekranı - Malzeme Giriş Faturaları Listesi
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
import { Surface, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useGetInvoicesQuery } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatDate, formatCurrency } from '../../utils/formatters';
import type { Invoice } from '../../types';

const InvoicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { canEditMaterial } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useGetInvoicesQuery();
  const invoices = data?.data || [];

  const renderItem = ({ item }: { item: Invoice }) => (
    <Surface style={styles.invoiceCard} elevation={1}>
      <View style={styles.cardHeader}>
        <View style={styles.invoiceNoRow}>
          <Ionicons name="receipt-outline" size={20} color="#FF6B35" />
          <Text style={styles.invoiceNo}>{item.invoice_no}</Text>
        </View>
        <Text style={styles.invoiceDate}>{formatDate(item.invoice_date)}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tedarikçi:</Text>
          <Text style={styles.infoValue}>{item.supplier_name || 'Belirtilmedi'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Giren Kalem Sayısı:</Text>
          <Text style={styles.infoValue}>{item.batch_count || 1} Parti</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Toplam Tutar:</Text>
          <Text style={styles.totalValue}>{formatCurrency(item.total_amount || 0)}</Text>
        </View>
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      {isError ? (
        <ErrorMessage message="Faturalar yüklenemedi." onRetry={refetch} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} colors={['#FF6B35']} />}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>Henüz fatura girişi yapılmamış.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Fatura Girişi Butonu */}
      {canEditMaterial && (
        <FAB
          icon="plus"
          label="Fatura Girişi Yap"
          style={styles.fab}
          color="#FFFFFF"
          onPress={() => navigation.navigate('InvoiceForm')}
        />
      )}

      {isLoading && <LoadingOverlay message="Faturalar getiriliyor..." />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  invoiceNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceNo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  invoiceDate: {
    fontSize: 12,
    color: '#757575',
  },
  cardBody: {
    marginTop: 10,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: '#757575',
  },
  infoValue: {
    fontSize: 13,
    color: '#212121',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF6B35',
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

export default InvoicesScreen;

