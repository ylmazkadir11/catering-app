// =============================================
// Kullanıcılar Ekranı - Admin Kullanıcı Yönetimi
// =============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Surface, FAB, Chip, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useGetUsersQuery, useDeleteUserMutation } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorMessage from '../../components/common/ErrorMessage';
import type { User } from '../../types';

const UsersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useGetUsersQuery();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const users = data?.data || [];

  const handleDelete = (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      Alert.alert('Uyarı', 'Kendi hesabınızı silemezsiniz.');
      return;
    }

    Alert.alert(
      'Kullanıcıyı Sil',
      `"${targetUser.fullName || targetUser.username}" kullanıcısını pasife almak istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Devre Dışı Bırak',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(targetUser.id).unwrap();
              Alert.alert('Başarılı', 'Kullanıcı hesabı devre dışı bırakıldı.');
              refetch();
            } catch (err: any) {
              Alert.alert('Hata', err.data?.message || 'Kullanıcı silinemedi.');
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (roleName?: string) => {
    switch (roleName) {
      case 'admin':
        return '#E53935';
      case 'chef':
        return '#FB8C00';
      case 'depot':
        return '#1E88E5';
      default:
        return '#757575';
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('UserForm', { user: item })}
    >
      <Surface style={styles.userCard} elevation={1}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={22} color="#FFFFFF" />
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName || item.username}</Text>
          <Text style={styles.userUsername}>@{item.username} • {item.email}</Text>
          <View style={styles.badgeRow}>
            <Chip
              style={[styles.roleChip, { backgroundColor: getRoleBadgeColor(item.role?.name) + '15' }]}
              textStyle={[styles.roleChipText, { color: getRoleBadgeColor(item.role?.name) }]}
            >
              {item.role?.description || item.role?.name?.toUpperCase()}
            </Chip>
            {!item.isActive && (
              <Chip style={styles.inactiveChip} textStyle={styles.inactiveChipText}>
                Pasif
              </Chip>
            )}
          </View>
        </View>

        {item.id !== currentUser?.id && (
          <IconButton
            icon="trash-can-outline"
            iconColor="#D32F2F"
            size={20}
            onPress={() => handleDelete(item)}
          />
        )}
      </Surface>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isError ? (
        <ErrorMessage message="Kullanıcılar yüklenemedi." onRetry={refetch} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} colors={['#FF6B35']} />}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>Kullanıcı bulunamadı.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Yeni Kullanıcı Ekle FAB */}
      <FAB
        icon="plus"
        label="Yeni Kullanıcı"
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => navigation.navigate('UserForm')}
      />

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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  userUsername: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  roleChip: {
    height: 24,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  inactiveChip: {
    height: 24,
    backgroundColor: '#FFEBEE',
  },
  inactiveChipText: {
    fontSize: 10,
    color: '#D32F2F',
    fontWeight: '700',
    lineHeight: 12,
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

export default UsersScreen;

