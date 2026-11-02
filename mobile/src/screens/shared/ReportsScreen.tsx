// =============================================
// Raporlar Ekranı - 5 Zorunlu Rapor & PDF / Excel İndirme
// 1. Günlük kullanılan malzeme listesi
// 2. Tarih aralığına göre malzeme tüketimi
// 3. Tarih aralığına göre yemek bazlı maliyet
// 4. Kişi başı maliyet
// 5. Ay sonu toplam gider
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Surface, TextInput, Button, Card, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { downloadReportFile } from '../../utils/fileDownload';
import LoadingOverlay from '../../components/common/LoadingOverlay';

const BASE_URL = 'http://localhost:3000/api';

const ReportsScreen: React.FC = () => {
  const [downloading, setDownloading] = useState(false);

  // Filtre durumları
  const today = new Date().toISOString().split('T')[0];
  const [dailyDate, setDailyDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));

  const handleDownload = async (
    endpoint: string,
    filename: string,
    format: 'pdf' | 'excel'
  ) => {
    try {
      setDownloading(true);
      const url = `${BASE_URL}/reports/${endpoint}&format=${format}`;
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      await downloadReportFile(url, `${filename}.${ext}`);
      Alert.alert('Başarılı', `${filename}.${ext} başarıyla indirildi.`);
    } catch (err: any) {
      Alert.alert('İndirme Hatası', err.message || 'Rapor dosyası indirilemedi.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Günlük Kullanılan Malzeme Listesi */}
        <Card style={styles.reportCard}>
          <Card.Title
            title="1. Günlük Kullanılan Malzeme Listesi"
            titleStyle={styles.cardTitle}
            left={() => <Ionicons name="calendar-outline" size={24} color="#FF6B35" />}
          />
          <Card.Content>
            <TextInput
              label="Tarih (YYYY-MM-DD)"
              mode="outlined"
              value={dailyDate}
              onChangeText={setDailyDate}
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#FF6B35"
            />
            <View style={styles.btnRow}>
              <Button
                mode="contained"
                icon="file-pdf-box"
                buttonColor="#D32F2F"
                onPress={() => handleDownload(`daily-materials?date=${dailyDate}`, `gunluk-malzeme-${dailyDate}`, 'pdf')}
                style={styles.downloadBtn}
              >
                PDF İndir
              </Button>
              <Button
                mode="contained"
                icon="file-excel-box"
                buttonColor="#2E7D32"
                onPress={() => handleDownload(`daily-materials?date=${dailyDate}`, `gunluk-malzeme-${dailyDate}`, 'excel')}
                style={styles.downloadBtn}
              >
                Excel İndir
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* 2. Tarih Aralığına Göre Malzeme Tüketimi */}
        <Card style={styles.reportCard}>
          <Card.Title
            title="2. Malzeme Tüketim Raporu"
            titleStyle={styles.cardTitle}
            left={() => <Ionicons name="stats-chart-outline" size={24} color="#FF6B35" />}
          />
          <Card.Content>
            <View style={styles.dateRow}>
              <TextInput
                label="Başlangıç Tarihi"
                mode="outlined"
                value={startDate}
                onChangeText={setStartDate}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
              <TextInput
                label="Bitiş Tarihi"
                mode="outlined"
                value={endDate}
                onChangeText={setEndDate}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            </View>
            <View style={styles.btnRow}>
              <Button
                mode="contained"
                icon="file-pdf-box"
                buttonColor="#D32F2F"
                onPress={() => handleDownload(`material-consumption?startDate=${startDate}&endDate=${endDate}`, `malzeme-tuketim-${startDate}_${endDate}`, 'pdf')}
                style={styles.downloadBtn}
              >
                PDF İndir
              </Button>
              <Button
                mode="contained"
                icon="file-excel-box"
                buttonColor="#2E7D32"
                onPress={() => handleDownload(`material-consumption?startDate=${startDate}&endDate=${endDate}`, `malzeme-tuketim-${startDate}_${endDate}`, 'excel')}
                style={styles.downloadBtn}
              >
                Excel İndir
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* 3. Yemek Bazlı Maliyet Raporu */}
        <Card style={styles.reportCard}>
          <Card.Title
            title="3. Yemek Bazlı Maliyet Raporu"
            titleStyle={styles.cardTitle}
            left={() => <Ionicons name="restaurant-outline" size={24} color="#FF6B35" />}
          />
          <Card.Content>
            <View style={styles.dateRow}>
              <TextInput
                label="Başlangıç Tarihi"
                mode="outlined"
                value={startDate}
                onChangeText={setStartDate}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
              <TextInput
                label="Bitiş Tarihi"
                mode="outlined"
                value={endDate}
                onChangeText={setEndDate}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            </View>
            <View style={styles.btnRow}>
              <Button
                mode="contained"
                icon="file-pdf-box"
                buttonColor="#D32F2F"
                onPress={() => handleDownload(`meal-cost?startDate=${startDate}&endDate=${endDate}`, `yemek-maliyeti-${startDate}_${endDate}`, 'pdf')}
                style={styles.downloadBtn}
              >
                PDF İndir
              </Button>
              <Button
                mode="contained"
                icon="file-excel-box"
                buttonColor="#2E7D32"
                onPress={() => handleDownload(`meal-cost?startDate=${startDate}&endDate=${endDate}`, `yemek-maliyeti-${startDate}_${endDate}`, 'excel')}
                style={styles.downloadBtn}
              >
                Excel İndir
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* 4. Kişi Başı Maliyet Raporu */}
        <Card style={styles.reportCard}>
          <Card.Title
            title="4. Kişi Başı Maliyet Raporu"
            titleStyle={styles.cardTitle}
            left={() => <Ionicons name="people-outline" size={24} color="#FF6B35" />}
          />
          <Card.Content>
            <View style={styles.dateRow}>
              <TextInput
                label="Başlangıç Tarihi"
                mode="outlined"
                value={startDate}
                onChangeText={setStartDate}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
              <TextInput
                label="Bitiş Tarihi"
                mode="outlined"
                value={endDate}
                onChangeText={setEndDate}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            </View>
            <View style={styles.btnRow}>
              <Button
                mode="contained"
                icon="file-pdf-box"
                buttonColor="#D32F2F"
                onPress={() => handleDownload(`per-person-cost?startDate=${startDate}&endDate=${endDate}`, `kisi-basi-maliyet-${startDate}_${endDate}`, 'pdf')}
                style={styles.downloadBtn}
              >
                PDF İndir
              </Button>
              <Button
                mode="contained"
                icon="file-excel-box"
                buttonColor="#2E7D32"
                onPress={() => handleDownload(`per-person-cost?startDate=${startDate}&endDate=${endDate}`, `kisi-basi-maliyet-${startDate}_${endDate}`, 'excel')}
                style={styles.downloadBtn}
              >
                Excel İndir
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* 5. Ay Sonu Toplam Gider Raporu */}
        <Card style={styles.reportCard}>
          <Card.Title
            title="5. Ay Sonu Toplam Gider Raporu"
            titleStyle={styles.cardTitle}
            left={() => <Ionicons name="cash-outline" size={24} color="#FF6B35" />}
          />
          <Card.Content>
            <View style={styles.dateRow}>
              <TextInput
                label="Yıl"
                mode="outlined"
                keyboardType="numeric"
                value={year}
                onChangeText={setYear}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
              <TextInput
                label="Ay (1-12)"
                mode="outlined"
                keyboardType="numeric"
                value={month}
                onChangeText={setMonth}
                style={[styles.input, { flex: 1 }]}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            </View>
            <View style={styles.btnRow}>
              <Button
                mode="contained"
                icon="file-pdf-box"
                buttonColor="#D32F2F"
                onPress={() => handleDownload(`monthly-expense?year=${year}&month=${month}`, `aylik-gider-${year}-${month}`, 'pdf')}
                style={styles.downloadBtn}
              >
                PDF İndir
              </Button>
              <Button
                mode="contained"
                icon="file-excel-box"
                buttonColor="#2E7D32"
                onPress={() => handleDownload(`monthly-expense?year=${year}&month=${month}`, `aylik-gider-${year}-${month}`, 'excel')}
                style={styles.downloadBtn}
              >
                Excel İndir
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {downloading && <LoadingOverlay message="Rapor hazırlanıyor ve indiriliyor..." />}
    </View>
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
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  downloadBtn: {
    flex: 1,
    borderRadius: 8,
  },
});

export default ReportsScreen;

