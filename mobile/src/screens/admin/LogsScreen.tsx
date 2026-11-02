// =============================================
// Sistem Logları Ekranı - Admin Denetim & İzleme
// Tüm işlemlerin tarih, kullanıcı ve detay kaydı
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Surface, Searchbar, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useGetLogsQuery } from '../../services/api';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatDate } from '../../utils/formatters';
import type { Log } from '../../types';

const LogsScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useGetLogsQuery({
    page,
    limit: 50,
    action: actionFilter || undefined,
  });

  const logs = data?.data || [];

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('CONFIRM')) {
      return { bg: '#E8F5E9', text: '#2E7D32' };
    }
    if (action.includes('DELETE') || action.includes('CANCEL')) {
      return { bg: '#FFEBEE', text: '#D32F2F' };
    }
    if (action.includes('UPDATE')) {
      return { bg: '#E3F2FD', text: '#1976D2' };
    }
    return { bg: '#FFF3E0', text: '#E65100' };
  };

  const renderItem = ({ item }: { item: Log }) => {
    const badgeColor = getActionBadgeColor(item.action);

    return (
      <Surface style={styles.logCard} elevation={1}>
        <View style={styles.logHeader}>
          <View style={styles.userRow}>
            <Ionicons name="person-circle-outline" size={20} color="#757575" />
            <Text style={styles.logUser}>{item.username}</Text>
          </View>
          <Text style={styles.logDate}>{formatDate(item.created_at)}</Text>
        </View>

        <View style={styles.actionRow}>
          <Chip
            style={[styles.actionChip, { backgroundColor: badgeColor.bg }]}
            textStyle={[styles.actionChipText, { color: badgeColor.text }]}
          >
            {item.action}
          </Chip>
          {item.entity_type && (
            <Text style={styles.entityText}>Varlık: {item.entity_type}</Text>
          )}
        </View>

        {/* Yeni veya Eski Veri Özeti */}
        {(item.new_data || item.old_data) && (
          <View style={styles.dataContainer}>
            {item.old_data && (
              <Text style={styles.dataText} numberOfLines={2}>
                <Text style={{ fontWeight: 'bold' }}>Önceki:</Text>{' '}
                {typeof item.old_data === 'string' ? item.old_data : JSON.stringify(item.old_data)}
              </Text>
            )}
            {item.new_data && (
              <Text style={styles.dataText} numberOfLines={2}>
                <Text style={{ fontWeight: 'bold' }}>Yeni:</Text>{' '}
                {typeof item.new_data === 'string' ? item.new_data : JSON.stringify(item.new_data)}
              </Text>
            )}
          </View>
        )}
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      {/* Arama / Filtreleme Çubuğu */}
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="İşleme göre filtrele (örn: LOGIN, CONFIRM)..."
          onChangeText={setActionFilter}
          value={actionFilter}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#FF6B35"
        />
      </View>

      {/* Log Listesi */}
      {isError ? (
        <ErrorMessage message="Log kayıtları yüklenemedi." onRetry={refetch} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} colors={['#FF6B35']} />}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="list-outline" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
              </View>
            ) : null
          }
        />
      )}

      {isLoading && <LoadingOverlay message="Loglar yükleniyor..." />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logUser: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
  },
  logDate: {
    fontSize: 11,
    color: '#757575',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  actionChip: {
    height: 24,
  },
  actionChipText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  entityText: {
    fontSize: 11,
    color: '#757575',
  },
  dataContainer: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    gap: 2,
  },
  dataText: {
    fontSize: 11,
    color: '#616161',
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
});

export default LogsScreen;

