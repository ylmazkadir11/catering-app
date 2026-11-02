// =============================================
// Redux Store - Ana state yönetimi
// authSlice ve notificationSlice birleştirilmiştir
// =============================================

import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { cateringApi } from '../services/api';

// Bildirim state tipi
interface NotificationState {
  unreadCount: number;
}

// Bildirim başlangıç durumu
const notificationInitialState: NotificationState = {
  unreadCount: 0,
};

// Bildirim slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState: notificationInitialState,
  reducers: {
    // Okunmamış bildirim sayısını güncelle
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    // Okunmamış sayısını artır
    incrementUnread: (state) => {
      state.unreadCount += 1;
    },
    // Okunmamış sayısını sıfırla
    resetUnread: (state) => {
      state.unreadCount = 0;
    },
  },
});

export const { setUnreadCount, incrementUnread, resetUnread } = notificationSlice.actions;

// Ana Redux Store yapılandırması
export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationSlice.reducer,
    // RTK Query reducer'ı
    [cateringApi.reducerPath]: cateringApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Büyük state serializasyon uyarılarını önle
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(cateringApi.middleware),
});

// TypeScript için tip tanımlamaları
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
