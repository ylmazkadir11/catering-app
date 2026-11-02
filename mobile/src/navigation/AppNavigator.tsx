// =============================================
// App Navigator - Ana navigasyon
// Kimlik doğrulama durumuna göre navigator seçer
// =============================================

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';

import { selectIsAuthenticated, selectCurrentUser } from '../store/authSlice';
import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';
import ChefNavigator from './ChefNavigator';
import DepotNavigator from './DepotNavigator';
import type { AppDispatch } from '../store';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

  if (!isAuthenticated) {
    // Giriş yapılmamış - login ekranını göster
    return <AuthNavigator />;
  }

  // Role göre navigator seç
  const roleName = currentUser?.role?.name;

  if (roleName === 'admin') {
    return <AdminNavigator />;
  } else if (roleName === 'chef') {
    return <ChefNavigator />;
  } else if (roleName === 'depot') {
    return <DepotNavigator />;
  }

  // Bilinmeyen rol - auth ekranına dön
  return <AuthNavigator />;
};

export default AppNavigator;
