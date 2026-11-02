// =============================================
// Dashboard Ekranı - Tüm Roller İçin Ortak Ana Sayfa
// İstatistik kartları, kritik uyarılar ve hızlı aksiyonlar
// =============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Surface, Chip, Card, IconButton, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useGetDashboardStatsQuery, useGetDashboardAlertsQuery } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingOverlay from '../../components/common/LoadingOverlay';

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout, getRoleName } = useAuth();

  const {
    data: statsData,
    isLoading: isStatsLoading,
    refetch: refetchStats,
    isFetching: isStatsFetching,
  } = useGetDashboardStatsQuery();

  const {
    data: alertsData,
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
    isFetching: isAlertsFetching,
  } = useGetDashboardAlertsQuery();

  const stats = statsData?.data || {
    totalMaterials: 0,
    criticalStock: 0,
    todayProductions: 0,
    unreportedCount: 0,
    expiringBatches: 0,
  };

  const alerts = alertsData?.data || {
    criticalStock: [],
    expiringBatches: [],
    unreportedProductions: [],
  };

  const isRefreshing = isStatsFetching || isAlertsFetching;

  const onRefresh = () => {
    refetchStats();
    refetchAlerts();
  };

  return (
    <View style={styles.container}>
      {/* Üst Karşılama Çubuğu */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerUser}>
          <Text style={styles.welcomeText}>Merhaba,</Text>
          <Text style={styles.userName}>{user?.fullName || user?.username}</Text>
          <Chip mode="outlined" style={styles.roleChip} textStyle={styles.roleChipText}>
            {getRoleName()}
          </Chip>
        </View>
        <IconButton
          icon="logout"
          iconColor="#FF6B35"
          size={24}
          onPress={logout}
          accessibilityLabel="Çıkış Yap"
        />
      </Surface>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#FF6B35']} />}
      >
        {/* İstatistik Kartları Grid */}
        <Text style={styles.sectionTitle}>Sistem Özeti</Text>
        <View style={styles.statsGrid}>
          {/* Toplam Malzeme */}
          <Surface style={styles.statCard} elevation={1}>
            <View style={[styles.statIconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="cube" size={22} color="#1E88E5" />
            </View>
            <Text style={styles.statNumber}>{stats.totalMaterials}</Text>
            <Text style={styles.statLabel}>Toplam Malzeme</Text>
          </Surface>

          {/* Kritik Stok */}
          <Surface style={[styles.statCard, stats.criticalStock > 0 && styles.statCardWarning]} elevation={1}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="alert-circle" size={22} color="#E53935" />
            </View>
            <Text style={[styles.statNumber, { color: '#E53935' }]}>{stats.criticalStock}</Text>
            <Text style={styles.statLabel}>Kritik Stok</Text>
          </Surface>

          {/* Bugünkü Üretim */}
          <Surface style={styles.statCard} elevation={1}>
            <View style={[styles.statIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="construct" size={22} color="#43A047" />
            </View>
            <Text style={styles.statNumber}>{stats.todayProductions}</Text>
            <Text style={styles.statLabel}>Bugünkü Üretim</Text>
          </Surface>

          {/* Rapor Bekleyen */}
          <Surface style={[styles.statCard, stats.unreportedCount > 0 && styles.statCardCaution]} elevation={1}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="document-text" size={22} color="#FB8C00" />
            </View>
            <Text style={[styles.statNumber, { color: '#FB8C00' }]}>{stats.unreportedCount}</Text>
            <Text style={styles.statLabel}>Rapor Bekleyen</Text>
          </Surface>
        </View>

        {/* ⚠️ Kritik Uyarılar Bölümü */}
        <Text style={styles.sectionTitle}>⚠️ Aktif Uyarı & Kontroller</Text>

        {/* 1. Kritik Stok Uyarıları */}
        {alerts.criticalStock && alerts.criticalStock.length > 0 && (
          <Card style={[styles.alertCard, { borderColor: '#FFCDD2' }]}>
            <Card.Title
              title="Kritik Stok Seviyesindeki Malzemeler"
              titleStyle={styles.alertCardTitle}
              left={(props) => <Ionicons name="warning" size={24} color="#D32F2F" />}
            />
            <Card.Content>
              {alerts.criticalStock.map((mat: any) => (
                <View key={mat.id} style={styles.alertItemRow}>
                  <Text style={styles.alertItemName}>{mat.name}</Text>
                  <Text style={styles.alertItemValue}>
                    Mevcut: <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>{mat.current_stock} {mat.unit}</Text> / Min: {mat.minimum_stock}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* 2. Son Kullanma Tarihi Yaklaşanlar */}
        {alerts.expiringBatches && alerts.expiringBatches.length > 0 && (
          <Card style={[styles.alertCard, { borderColor: '#FFE082' }]}>
            <Card.Title
              title="Son Kullanma Tarihi Yaklaşan Partiler (30 Gün)"
              titleStyle={styles.alertCardTitle}
              left={(props) => <Ionicons name="time" size={24} color="#F57C00" />}
            />
            <Card.Content>
              {alerts.expiringBatches.map((batch: any) => (
                <View key={batch.id} style={styles.alertItemRow}>
                  <Text style={styles.alertItemName}>{batch.material_name} (Parti: {batch.batch_number})</Text>
                  <Text style={styles.alertItemValue}>
                    Kalan: <Text style={{ color: '#F57C00', fontWeight: 'bold' }}>{batch.days_remaining} gün</Text> ({batch.quantity_remaining} {batch.unit})
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* 3. Rapor Alınmamış Üretimler */}
        {alerts.unreportedProductions && alerts.unreportedProductions.length > 0 && (
          <Card style={[styles.alertCard, { borderColor: '#B3E5FC' }]}>
            <Card.Title
              title="Raporu İndirilmemiş Onaylı Üretimler"
              titleStyle={styles.alertCardTitle}
              left={(props) => <Ionicons name="document-attach" size={24} color="#0288D1" />}
            />
            <Card.Content>
              {alerts.unreportedProductions.map((prod: any) => (
                <View key={prod.id} style={styles.alertItemRow}>
                  <Text style={styles.alertItemName}>Tarih: {prod.production_date} ({prod.meal_type})</Text>
                  <Text style={styles.alertItemValue}>
                    {prod.person_count} Kişilik Üretim
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Uyarı yoksa */}
        {alerts.criticalStock.length === 0 &&
         alerts.expiringBatches.length === 0 &&
         alerts.unreportedProductions.length === 0 && (
          <Surface style={styles.emptyAlertsBox} elevation={0}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
            <Text style={styles.emptyAlertsTitle}>Her Şey Yolunda!</Text>
            <Text style={styles.emptyAlertsSubtitle}>Kritik stok veya bekleyen uyarı bulunmuyor.</Text>
          </Surface>
        )}
      </ScrollView>

      {(isStatsLoading || isAlertsLoading) && !isRefreshing && (
        <LoadingOverlay message="Veriler yükleniyor..." />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerUser: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 12,
    color: '#757575',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  roleChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3EE',
    borderColor: '#FFD6C9',
    height: 24,
  },
  roleChipText: {
    fontSize: 10,
    color: '#FF6B35',
    fontWeight: '700',
    lineHeight: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#37474F',
    marginVertical: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statCardWarning: {
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFFAFA',
  },
  statCardCaution: {
    borderWidth: 1,
    borderColor: '#FFE0B2',
    backgroundColor: '#FFFCF7',
  },
  statIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#212121',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  alertCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  alertItemName: {
    fontSize: 13,
    color: '#212121',
    fontWeight: '500',
    flex: 1,
  },
  alertItemValue: {
    fontSize: 12,
    color: '#616161',
  },
  emptyAlertsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  emptyAlertsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 8,
  },
  emptyAlertsSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
});

export default DashboardScreen;

