// =============================================
// Catering Yönetim Sistemi - RTK Query API Servisi
// Tüm backend endpoint'leri burada tanımlanmıştır
// =============================================

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User,
  Unit,
  Material,
  Batch,
  Invoice,
  Recipe,
  Menu,
  MenuItem,
  Production,
  ProductionItem,
  StockMovement,
  Log,
  Notification,
  DashboardStats,
  DashboardAlert,
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  MealType,
  ProductionCalculateRequest,
  ReportFilter,
} from '../types';

// API'nin temel URL'i
const BASE_URL = 'http://localhost:3000/api';

// RTK Query base query - her isteğe token ekler
const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: async (headers) => {
    // AsyncStorage'dan token'ı al
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// Ana API servisi
export const cateringApi = createApi({
  reducerPath: 'cateringApi',
  baseQuery: baseQueryWithAuth,
  // Cache etiketleri - mutation'lardan sonra otomatik yenileme için
  tagTypes: [
    'Auth',
    'Users',
    'Units',
    'Materials',
    'Batches',
    'Invoices',
    'Recipes',
    'Menus',
    'Productions',
    'Reports',
    'Dashboard',
    'Logs',
    'Notifications',
    'StockMovements',
  ],
  endpoints: (builder) => ({
    // ===================== AUTH =====================
    // Kullanıcı girişi
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Kullanıcı çıkışı
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    // Mevcut kullanıcı bilgisi
    getMe: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),

    // Profil güncelleme
    updateProfile: builder.mutation<User, Partial<User>>({
      query: (data) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Şifre değiştirme
    changePassword: builder.mutation<void, { old_password: string; new_password: string }>({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'PUT',
        body: data,
      }),
    }),

    // FCM token güncelleme (bildirimler için)
    updateFCMToken: builder.mutation<void, { fcm_token: string }>({
      query: (data) => ({
        url: '/auth/fcm-token',
        method: 'PUT',
        body: data,
      }),
    }),

    // ===================== USERS =====================
    // Kullanıcı listesi
    getUsers: builder.query<User[], { page?: number; search?: string } | void>({
      query: (params) => ({
        url: '/users',
        params: params || {},
      }),
      providesTags: ['Users'],
    }),

    // Kullanıcı detayı
    getUserById: builder.query<User, number>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'Users', id }],
    }),

    // Kullanıcı oluşturma
    createUser: builder.mutation<User, Partial<User> & { password: string }>({
      query: (data) => ({
        url: '/users',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),

    // Kullanıcı güncelleme
    updateUser: builder.mutation<User, { id: number; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),

    // Kullanıcı silme
    deleteUser: builder.mutation<void, number>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Users'],
    }),

    // ===================== UNITS =====================
    // Birim listesi
    getUnits: builder.query<Unit[], void>({
      query: () => '/units',
      providesTags: ['Units'],
    }),

    // Birim oluşturma
    createUnit: builder.mutation<Unit, Partial<Unit>>({
      query: (data) => ({
        url: '/units',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Units'],
    }),

    // Birim güncelleme
    updateUnit: builder.mutation<Unit, { id: number; data: Partial<Unit> }>({
      query: ({ id, data }) => ({
        url: `/units/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Units'],
    }),

    // Birim silme
    deleteUnit: builder.mutation<void, number>({
      query: (id) => ({
        url: `/units/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Units'],
    }),

    // ===================== MATERIALS =====================
    // Malzeme listesi (filtrelerle)
    getMaterials: builder.query<Material[], { search?: string; category?: string; critical_only?: boolean } | void>({
      query: (params) => ({
        url: '/materials',
        params: params || {},
      }),
      providesTags: ['Materials'],
    }),

    // Malzeme detayı
    getMaterialById: builder.query<Material, number>({
      query: (id) => `/materials/${id}`,
      providesTags: (result, error, id) => [{ type: 'Materials', id }],
    }),

    // Malzeme oluşturma
    createMaterial: builder.mutation<Material, Partial<Material>>({
      query: (data) => ({
        url: '/materials',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Materials', 'Dashboard'],
    }),

    // Malzeme güncelleme
    updateMaterial: builder.mutation<Material, { id: number; data: Partial<Material> }>({
      query: ({ id, data }) => ({
        url: `/materials/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Materials', 'Dashboard'],
    }),

    // Malzeme silme
    deleteMaterial: builder.mutation<void, number>({
      query: (id) => ({
        url: `/materials/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Materials', 'Dashboard'],
    }),

    // Malzemenin partileri
    getMaterialBatches: builder.query<Batch[], number>({
      query: (materialId) => `/materials/${materialId}/batches`,
      providesTags: ['Batches'],
    }),

    // Malzemenin stok hareketleri
    getMaterialMovements: builder.query<StockMovement[], number>({
      query: (materialId) => `/materials/${materialId}/movements`,
      providesTags: ['StockMovements'],
    }),

    // ===================== INVOICES =====================
    // Fatura listesi
    getInvoices: builder.query<Invoice[], { start_date?: string; end_date?: string } | void>({
      query: (params) => ({
        url: '/invoices',
        params: params || {},
      }),
      providesTags: ['Invoices'],
    }),

    // Fatura detayı
    getInvoiceById: builder.query<Invoice, number>({
      query: (id) => `/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Invoices', id }],
    }),

    // Fatura oluşturma
    createInvoice: builder.mutation<Invoice, Partial<Invoice>>({
      query: (data) => ({
        url: '/invoices',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Invoices', 'Materials', 'Batches', 'Dashboard'],
    }),

    // Fatura güncelleme
    updateInvoice: builder.mutation<Invoice, { id: number; data: Partial<Invoice> }>({
      query: ({ id, data }) => ({
        url: `/invoices/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Invoices', 'Materials', 'Batches'],
    }),

    // Fatura silme
    deleteInvoice: builder.mutation<void, number>({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Invoices', 'Materials'],
    }),

    // ===================== RECIPES =====================
    // Reçete listesi
    getRecipes: builder.query<Recipe[], { search?: string; category?: string } | void>({
      query: (params) => ({
        url: '/recipes',
        params: params || {},
      }),
      providesTags: ['Recipes'],
    }),

    // Reçete detayı
    getRecipeById: builder.query<Recipe, number>({
      query: (id) => `/recipes/${id}`,
      providesTags: (result, error, id) => [{ type: 'Recipes', id }],
    }),

    // Reçete oluşturma
    createRecipe: builder.mutation<Recipe, Partial<Recipe>>({
      query: (data) => ({
        url: '/recipes',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Recipes'],
    }),

    // Reçete güncelleme
    updateRecipe: builder.mutation<Recipe, { id: number; data: Partial<Recipe> }>({
      query: ({ id, data }) => ({
        url: `/recipes/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Recipes'],
    }),

    // Reçete silme
    deleteRecipe: builder.mutation<void, number>({
      query: (id) => ({
        url: `/recipes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Recipes'],
    }),

    // ===================== MENUS =====================
    // Menü listesi
    getMenus: builder.query<Menu[], { start_date?: string; end_date?: string } | void>({
      query: (params) => ({
        url: '/menus',
        params: params || {},
      }),
      providesTags: ['Menus'],
    }),

    // Menü detayı
    getMenuById: builder.query<Menu, number>({
      query: (id) => `/menus/${id}`,
      providesTags: (result, error, id) => [{ type: 'Menus', id }],
    }),

    // Menü oluşturma
    createMenu: builder.mutation<Menu, Partial<Menu>>({
      query: (data) => ({
        url: '/menus',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Menus'],
    }),

    // Menü güncelleme
    updateMenu: builder.mutation<Menu, { id: number; data: Partial<Menu> }>({
      query: ({ id, data }) => ({
        url: `/menus/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Menus'],
    }),

    // Menü silme
    deleteMenu: builder.mutation<void, number>({
      query: (id) => ({
        url: `/menus/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Menus'],
    }),

    // Menü onaylama
    approveMenu: builder.mutation<Menu, number>({
      query: (id) => ({
        url: `/menus/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['Menus'],
    }),

    // Menü onayını kaldırma
    unapproveMenu: builder.mutation<Menu, number>({
      query: (id) => ({
        url: `/menus/${id}/unapprove`,
        method: 'POST',
      }),
      invalidatesTags: ['Menus'],
    }),

    // ===================== PRODUCTIONS =====================
    // Üretim listesi
    getProductions: builder.query<Production[], { date?: string; status?: string } | void>({
      query: (params) => ({
        url: '/productions',
        params: params || {},
      }),
      providesTags: ['Productions'],
    }),

    // Üretim detayı
    getProductionById: builder.query<Production, number>({
      query: (id) => `/productions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Productions', id }],
    }),

    // Üretim hesaplama
    calculateProduction: builder.mutation<ProductionItem[], ProductionCalculateRequest>({
      query: (data) => ({
        url: '/productions/calculate',
        method: 'POST',
        body: data,
      }),
    }),

    // Üretim oluşturma
    createProduction: builder.mutation<Production, Partial<Production>>({
      query: (data) => ({
        url: '/productions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Productions', 'Dashboard'],
    }),

    // Üretim güncelleme
    updateProduction: builder.mutation<Production, { id: number; data: Partial<Production> }>({
      query: ({ id, data }) => ({
        url: `/productions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Productions'],
    }),

    // Üretim onaylama
    confirmProduction: builder.mutation<Production, number>({
      query: (id) => ({
        url: `/productions/${id}/confirm`,
        method: 'POST',
      }),
      invalidatesTags: ['Productions', 'Materials', 'Dashboard'],
    }),

    // Üretim iptali
    cancelProduction: builder.mutation<Production, number>({
      query: (id) => ({
        url: `/productions/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['Productions', 'Dashboard'],
    }),

    // Üretim raporu URL'i (PDF/Excel indirme için)
    getProductionReport: builder.query<{ url: string }, { id: number; format: 'pdf' | 'excel' }>({
      query: ({ id, format }) => `/productions/${id}/report?format=${format}`,
    }),

    // ===================== REPORTS =====================
    // Günlük malzeme listesi raporu URL'i
    getDailyMaterialsReport: builder.query<{ url: string }, { date: string; format: 'pdf' | 'excel' }>({
      query: ({ date, format }) => `/reports/daily-materials?date=${date}&format=${format}`,
    }),

    // Malzeme tüketimi raporu URL'i
    getMaterialConsumptionReport: builder.query<{ url: string }, { start_date: string; end_date: string; format: 'pdf' | 'excel' }>({
      query: ({ start_date, end_date, format }) =>
        `/reports/material-consumption?start_date=${start_date}&end_date=${end_date}&format=${format}`,
    }),

    // Yemek bazlı maliyet raporu URL'i
    getMealCostReport: builder.query<{ url: string }, { start_date: string; end_date: string; format: 'pdf' | 'excel' }>({
      query: ({ start_date, end_date, format }) =>
        `/reports/meal-cost?start_date=${start_date}&end_date=${end_date}&format=${format}`,
    }),

    // Kişi başı maliyet raporu URL'i
    getPerPersonCostReport: builder.query<{ url: string }, { start_date: string; end_date: string; format: 'pdf' | 'excel' }>({
      query: ({ start_date, end_date, format }) =>
        `/reports/per-person-cost?start_date=${start_date}&end_date=${end_date}&format=${format}`,
    }),

    // Ay sonu gider raporu URL'i
    getMonthlyExpenseReport: builder.query<{ url: string }, { month: number; year: number; format: 'pdf' | 'excel' }>({
      query: ({ month, year, format }) =>
        `/reports/monthly-expense?month=${month}&year=${year}&format=${format}`,
    }),

    // ===================== DASHBOARD =====================
    // Dashboard istatistikleri
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/dashboard/stats',
      providesTags: ['Dashboard'],
    }),

    // Dashboard uyarıları
    getDashboardAlerts: builder.query<DashboardAlert[], void>({
      query: () => '/dashboard/alerts',
      providesTags: ['Dashboard'],
    }),

    // ===================== LOGS =====================
    // Log listesi (sayfalama destekli)
    getLogs: builder.query<PaginatedResponse<Log>, { page?: number; user_id?: number; action?: string; start_date?: string; end_date?: string } | void>({
      query: (params) => ({
        url: '/logs',
        params: params || {},
      }),
      providesTags: ['Logs'],
    }),

    // ===================== NOTIFICATIONS =====================
    // Bildirim listesi
    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      providesTags: ['Notifications'],
    }),

    // Bildirimi okundu işaretle
    markNotificationRead: builder.mutation<void, number>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Tüm bildirimleri okundu işaretle
    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Bildirim silme
    deleteNotification: builder.mutation<void, number>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

// Hook'ları dışa aktar
export const {
  // Auth
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useUpdateFCMTokenMutation,
  // Users
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  // Units
  useGetUnitsQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  // Materials
  useGetMaterialsQuery,
  useGetMaterialByIdQuery,
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useDeleteMaterialMutation,
  useGetMaterialBatchesQuery,
  useGetMaterialMovementsQuery,
  // Invoices
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  // Recipes
  useGetRecipesQuery,
  useGetRecipeByIdQuery,
  useCreateRecipeMutation,
  useUpdateRecipeMutation,
  useDeleteRecipeMutation,
  // Menus
  useGetMenusQuery,
  useGetMenuByIdQuery,
  useCreateMenuMutation,
  useUpdateMenuMutation,
  useDeleteMenuMutation,
  useApproveMenuMutation,
  useUnapproveMenuMutation,
  // Productions
  useGetProductionsQuery,
  useGetProductionByIdQuery,
  useCalculateProductionMutation,
  useCreateProductionMutation,
  useUpdateProductionMutation,
  useConfirmProductionMutation,
  useCancelProductionMutation,
  useGetProductionReportQuery,
  // Reports
  useGetDailyMaterialsReportQuery,
  useGetMaterialConsumptionReportQuery,
  useGetMealCostReportQuery,
  useGetPerPersonCostReportQuery,
  useGetMonthlyExpenseReportQuery,
  // Dashboard
  useGetDashboardStatsQuery,
  useGetDashboardAlertsQuery,
  // Logs
  useGetLogsQuery,
  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} = cateringApi;
