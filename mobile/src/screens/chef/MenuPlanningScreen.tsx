// =============================================
// Menü Planlama Ekranı - Günlük 4 Öğün Yönetimi
// Sabah (max 5), Öğle (max 5), Akşam (max 5), Ara Öğün (max 3)
// Menü Onaylama / Onay Kaldırma Mekanizması
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Surface, Button, Chip, Card, IconButton, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

import {
  useGetMenusQuery,
  useApproveMenuMutation,
  useUnapproveMenuMutation,
  useDeleteMenuMutation,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getMealTypeLabel } from '../../utils/formatters';
import type { MealType, MenuItem } from '../../types';

const MEAL_CONFIGS: { type: MealType; label: string; maxLimit: number; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'breakfast', label: 'Sabah Kahvaltısı', maxLimit: 5, icon: 'sunny-outline' },
  { type: 'lunch', label: 'Öğle Yemeği', maxLimit: 5, icon: 'restaurant-outline' },
  { type: 'dinner', label: 'Akşam Yemeği', maxLimit: 5, icon: 'moon-outline' },
  { type: 'snack', label: 'Ara Öğün', maxLimit: 3, icon: 'cafe-outline' },
];

const MenuPlanningScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { canEditMenu } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Seçilen tarihe ait menüyü getir
  const { data, isLoading, refetch, isFetching } = useGetMenusQuery({ date: selectedDate });
  const [approveMenu, { isLoading: isApproving }] = useApproveMenuMutation();
  const [unapproveMenu, { isLoading: isUnapproving }] = useUnapproveMenuMutation();

  const menuList = data?.data || [];
  const currentMenu = menuList.length > 0 ? menuList[0] : null;

  // Gün değiştirme
  const changeDay = (days: number) => {
    const current = new Date(selectedDate);
    const updated = days > 0 ? addDays(current, days) : subDays(current, Math.abs(days));
    setSelectedDate(format(updated, 'yyyy-MM-dd'));
  };

  const handleApprove = async () => {
    if (!currentMenu) return;
    try {
      await approveMenu(currentMenu.id).unwrap();
      Alert.alert('Başarılı', 'Menü onaylandı! Artık üretime başlanabilir.');
      refetch();
    } catch (err: any) {
      Alert.alert('Hata', err.data?.message || 'Menü onaylanamadı.');
    }
  };

  const handleUnapprove = async () => {
    if (!currentMenu) return;
    try {
      await unapproveMenu(currentMenu.id).unwrap();
      Alert.alert('Başarılı', 'Menü onayı kaldırıldı.');
      refetch();
    } catch (err: any) {
      Alert.alert('Hata', err.data?.message || 'Onay kaldırılamadı.');
    }
  };

  // Öğüne ait yemekleri filtrele
  const getItemsForMeal = (mealType: MealType): MenuItem[] => {
    if (!currentMenu?.items) return [];
    return currentMenu.items.filter((i) => i.meal_type === mealType);
  };

  const isActionLoading = isApproving || isUnapproving;

  return (
    <View style={styles.container}>
      {/* Tarih Seçici Çubuğu */}
      <Surface style={styles.dateSelector} elevation={2}>
        <TouchableOpacity onPress={() => changeDay(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={24} color="#FF6B35" />
        </TouchableOpacity>
        <View style={styles.dateInfoBox}>
          <Text style={styles.dateText}>
            {format(new Date(selectedDate), 'dd MMMM yyyy, EEEE', { locale: tr })}
          </Text>
          <Text style={styles.dateSubText}>
            {selectedDate === new Date().toISOString().split('T')[0] ? 'Bugün' : selectedDate}
          </Text>
        </View>
        <TouchableOpacity onPress={() => changeDay(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </Surface>

      {/* Menü Durumu & Butonlar */}
      <View style={styles.statusBar}>
        <View style={styles.statusBadgeRow}>
          <Text style={styles.statusLabel}>Menü Durumu:</Text>
          <Chip
            style={[
              styles.statusChip,
              currentMenu?.is_approved ? styles.approvedChip : styles.draftChip,
            ]}
            textStyle={[
              styles.statusChipText,
              currentMenu?.is_approved ? styles.approvedText : styles.draftText,
            ]}
          >
            {currentMenu?.is_approved ? '✅ ONAYLANDI' : '📝 TASLAK (Onaysız)'}
          </Chip>
        </View>

        {canEditMenu && currentMenu && (
          <View style={styles.actionButtonsRow}>
            {currentMenu.is_approved ? (
              <Button
                mode="outlined"
                onPress={handleUnapprove}
                textColor="#D32F2F"
                style={styles.unapproveBtn}
              >
                Onayı Kaldır
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleApprove}
                buttonColor="#2E7D32"
                style={styles.approveBtn}
              >
                Menüyü Onayla
              </Button>
            )}
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} colors={['#FF6B35']} />}
      >
        {/* 4 Öğün Kartları */}
        {MEAL_CONFIGS.map((config) => {
          const mealItems = getItemsForMeal(config.type);
          const isFull = mealItems.length >= config.maxLimit;

          return (
            <Surface key={config.type} style={styles.mealCard} elevation={1}>
              {/* Öğün Başlığı */}
              <View style={styles.mealHeader}>
                <View style={styles.mealTitleRow}>
                  <Ionicons name={config.icon} size={22} color="#FF6B35" />
                  <Text style={styles.mealTitle}>{config.label}</Text>
                </View>
                <Text style={styles.mealLimitBadge}>
                  {mealItems.length} / {config.maxLimit} Çeşit
                </Text>
              </View>

              {/* Yemek Listesi */}
              <View style={styles.mealItemList}>
                {mealItems.length > 0 ? (
                  mealItems.map((item, idx) => (
                    <View key={item.id || idx} style={styles.foodRow}>
                      <View style={styles.foodBullet} />
                      <Text style={styles.foodName}>
                        {item.recipe?.name || item.recipe_name || 'Tanımsız Yemek'}
                      </Text>
                      {item.recipe?.category && (
                        <Text style={styles.foodCategory}>{item.recipe.category}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noFoodText}>Henüz yemek eklenmemiş.</Text>
                )}
              </View>

              {/* Yemek Ekle Butonu (Menü onaylı değilse ve limit dolmadıysa) */}
              {canEditMenu && !currentMenu?.is_approved && (
                <Button
                  mode="text"
                  icon="plus"
                  textColor="#FF6B35"
                  disabled={isFull}
                  onPress={() =>
                    navigation.navigate('MenuItemForm', {
                      menuDate: selectedDate,
                      mealType: config.type,
                      currentItems: mealItems,
                      maxLimit: config.maxLimit,
                    })
                  }
                  style={styles.addFoodBtn}
                >
                  {isFull ? 'Limit Doldu (Maksimum ' + config.maxLimit + ')' : 'Yemek Ekle / Değiştir'}
                </Button>
              )}
            </Surface>
          );
        })}
      </ScrollView>

      {(isLoading || isActionLoading) && <LoadingOverlay message="İşlem yapılıyor..." />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateArrow: {
    padding: 6,
  },
  dateInfoBox: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  dateSubText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: '#616161',
  },
  statusChip: {
    height: 28,
  },
  approvedChip: {
    backgroundColor: '#E8F5E9',
  },
  draftChip: {
    backgroundColor: '#FFF8E1',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  approvedText: {
    color: '#2E7D32',
  },
  draftText: {
    color: '#F57F17',
  },
  actionButtonsRow: {
    flexDirection: 'row',
  },
  approveBtn: {
    borderRadius: 8,
  },
  unapproveBtn: {
    borderColor: '#D32F2F',
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  mealLimitBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
  },
  mealItemList: {
    paddingVertical: 10,
    gap: 8,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  foodBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    marginRight: 10,
  },
  foodName: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
    flex: 1,
  },
  foodCategory: {
    fontSize: 11,
    color: '#757575',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noFoodText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  addFoodBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
});

export default MenuPlanningScreen;

