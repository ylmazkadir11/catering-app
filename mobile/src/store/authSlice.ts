// =============================================
// Auth State Slice - Kullanıcı kimlik doğrulama durumu
// =============================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types';

// Auth state tipi
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Başlangıç durumu
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

// Auth slice oluşturma
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Giriş yapıldığında kullanıcı ve token'ı kaydet
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },

    // Çıkış yapıldığında state'i temizle
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },

    // Kullanıcı bilgilerini güncelle (profil güncellemesi sonrası)
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
});

// Action'ları dışa aktar
export const { setCredentials, logout, updateUser } = authSlice.actions;

// Selector'ları dışa aktar
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectCurrentToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;

export default authSlice.reducer;
