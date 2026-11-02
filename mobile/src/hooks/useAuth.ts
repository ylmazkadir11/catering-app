// =============================================
// Auth Hook - Kimlik doğrulama yardımcı hook'u
// =============================================

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { selectCurrentUser, selectCurrentToken, selectIsAuthenticated, logout } from '../store/authSlice';
import { useLogoutMutation } from '../services/api';
import type { AppDispatch } from '../store';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [logoutMutation] = useLogoutMutation();

  // Kullanıcının belirtilen role sahip olup olmadığını kontrol et
  const hasRole = useCallback(
    (...roles: string[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role?.name || '');
    },
    [user]
  );

  // Admin mi?
  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);

  // Şef mi?
  const isChef = useCallback(() => hasRole('chef'), [hasRole]);

  // Depo görevlisi mi?
  const isDepot = useCallback(() => hasRole('depot'), [hasRole]);

  // Çıkış yap ve token'ı temizle
  const handleLogout = useCallback(async () => {
    try {
      // Backend'e çıkış isteği gönder
      await logoutMutation().unwrap();
    } catch (error) {
      // Backend hatası olsa bile local token'ı temizle
      console.log('Çıkış isteği başarısız, yerel token temizleniyor');
    } finally {
      // AsyncStorage'dan token'ı sil
      await AsyncStorage.removeItem('auth_token');
      // Redux state'ini temizle
      dispatch(logout());
    }
  }, [dispatch, logoutMutation]);

  return {
    user,
    token,
    isAuthenticated,
    hasRole,
    isAdmin,
    isChef,
    isDepot,
    logout: handleLogout,
  };
};
