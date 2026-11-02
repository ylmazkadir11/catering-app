// =============================================
// Birimler Ekranı - Ölçü Birimi Yönetimi
// ml, gr, adet, demet vb. birimlerin listelenmesi ve tanımlanması
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Surface, FAB, Dialog, Portal, TextInput, Button, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import {
  useGetUnitsQuery,
  useCreateUnitMutation,
  useDeleteUnitMutation,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorMessage from '../../components/common/ErrorMessage';
import type { Unit } from '../../types';

const UnitsScreen: React.FC = () => {
  const { canEditMaterial, isAdmin } = useAuth();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useGetUnitsQuery();
  const [createUnit, { isLoading: isCreating }] = useCreateUnitMutation();
  const [deleteUnit, { isLoading: isDeleting }] = useDeleteUnitMutation();

  const units = data?.data || [];

  const handleSaveUnit = async () => {
    if (!name.trim() || !abbreviation.trim()) {
      Alert.alert('Uyarı', 'Lütfen birim adını ve kısaltmasını doldurunuz.');
      return;
    }

    try {
      await createUnit({ name: name.trim(), abbreviation: abbreviation.trim() }).unwrap();
      setDialogVisible(false);
      setName('');
      setAbbreviation('');
      Alert.alert('Başarılı', 'Yeni ölçü birimi eklendi.');
    } catch (err: any) {
      Alert.alert('Hata', err.data?.message || err.message || 'Birim eklenemedi.');
    }
  };

  const handleDeleteUnit = (unit: Unit) => {
    Alert.alert(
      'Birimi Sil',
      `"${unit.name} (${unit.abbreviation})" birimini silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUnit(unit.id).unwrap();
              Alert.alert('Başarılı', 'Birim silindi.');
            } catch (err: any) {
              Alert.alert('Hata', err.data?.message || 'Birim kullanımda olduğu için silinemedi.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Unit }) => (
    <Surface style={styles.unitCard} elevation={1}>
      <View style={styles.unitIconCircle}>
        <Ionicons name="resize-outline" size={20} color="#FF6B35" />
      </View>
      <View style={styles.unitDetails}>
        <Text style={styles.unitName}>{item.name}</Text>
        <Text style={styles.unitAbbr}>Kısaltma: {item.abbreviation}</Text>
      </View>
      {isAdmin && (
        <IconButton
          icon="trash-can-outline"
          iconColor="#D32F2F"
          size={20}
          onPress={() => handleDeleteUnit(item)}
        />
      )}
    </Surface>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={units}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} colors={['#FF6B35']} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="resize-outline" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>Tanımlı ölçü birimi bulunmuyor.</Text>
            </View>
          ) : null
        }
      />

      {/* Yeni Birim Ekleme Dialogu */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Yeni Ölçü Birimi Ekle</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Birim Adı (Örn: Gram, Litre, Paket)"
              mode="outlined"
              value={name}
              onChangeText={setName}
              style={styles.dialogInput}
              outlineColor="#E0E0E0"
              activeOutlineColor="#FF6B35"
            />
            <TextInput
              label="Kısaltma (Örn: gr, lt, pkt, adet)"
              mode="outlined"
              value={abbreviation}
              onChangeText={setAbbreviation}
              style={styles.dialogInput}
              outlineColor="#E0E0E0"
              activeOutlineColor="#FF6B35"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} textColor="#757575">
              İptal
            </Button>
            <Button onPress={handleSaveUnit} loading={isCreating} textColor="#FF6B35">
              Ekle
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Birim Ekleme FAB (Admin ve Depo) */}
      {canEditMaterial && (
        <FAB
          icon="plus"
          style={styles.fab}
          color="#FFFFFF"
          onPress={() => setDialogVisible(true)}
        />
      )}

      {(isLoading || isDeleting) && <LoadingOverlay message="İşlem yapılıyor..." />}
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
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  unitIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unitDetails: {
    flex: 1,
  },
  unitName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  unitAbbr: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  dialogInput: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
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

export default UnitsScreen;

