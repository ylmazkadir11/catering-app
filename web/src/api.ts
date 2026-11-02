const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('catering_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('catering_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('catering_token');
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle PDF or Excel download responses
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('spreadsheetml'))) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `İşlem başarısız (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { username?: string; email?: string; password: string }) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    getMe: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },

  // Dashboard
  dashboard: {
    getStats: () => request('/dashboard/stats'),
    getAlerts: () => request('/dashboard/alerts'),
  },

  // Units
  units: {
    list: () => request('/units'),
    create: (data: { name: string; abbreviation: string }) =>
      request('/units', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { name: string; abbreviation: string }) =>
      request(`/units/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/units/${id}`, { method: 'DELETE' }),
  },

  // Materials
  materials: {
    list: (params?: { search?: string; category?: string; lowStock?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.category) q.append('category', params.category);
      if (params?.lowStock) q.append('lowStock', 'true');
      return request(`/materials?${q.toString()}`);
    },
    get: (id: string) => request(`/materials/${id}`),
    create: (data: any) => request('/materials', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/materials/${id}`, { method: 'DELETE' }),
    getBatches: (id: string) => request(`/materials/${id}/batches`),
    getMovements: (id: string) => request(`/materials/${id}/movements`),
    adjustStock: (data: { materialId: string; quantity: number; movementType: string; reason?: string }) =>
      request('/materials/stock-adjustment', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Invoices
  invoices: {
    list: () => request('/invoices'),
    get: (id: string) => request(`/invoices/${id}`),
    create: (data: any) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/invoices/${id}`, { method: 'DELETE' }),
  },

  // Recipes
  recipes: {
    list: (category?: string) => request(`/recipes${category ? `?category=${encodeURIComponent(category)}` : ''}`),
    get: (id: string) => request(`/recipes/${id}`),
    create: (data: any) => request('/recipes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/recipes/${id}`, { method: 'DELETE' }),
  },

  // Menus
  menus: {
    list: (params?: { startDate?: string; endDate?: string }) => {
      const q = new URLSearchParams();
      if (params?.startDate) q.append('startDate', params.startDate);
      if (params?.endDate) q.append('endDate', params.endDate);
      return request(`/menus?${q.toString()}`);
    },
    get: (id: string) => request(`/menus/${id}`),
    create: (data: any) => request('/menus', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/menus/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    approve: (id: string) => request(`/menus/${id}/approve`, { method: 'POST' }),
    unapprove: (id: string) => request(`/menus/${id}/unapprove`, { method: 'POST' }),
    delete: (id: string) => request(`/menus/${id}`, { method: 'DELETE' }),
  },

  // Productions
  productions: {
    list: (params?: { date?: string; status?: string; limit?: string; page?: string }) => {
      const q = new URLSearchParams();
      if (params?.date) q.append('date', params.date);
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', params.limit);
      if (params?.page) q.append('page', params.page);
      return request(`/productions?${q.toString()}`);
    },
    get: (id: string) => request(`/productions/${id}`),
    create: (data: any) => request('/productions', { method: 'POST', body: JSON.stringify(data) }),
    createFromMenu: (data: any) => request('/productions/from-menu', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/productions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    complete: (id: string, data?: any) => request(`/productions/${id}/complete`, { method: 'POST', body: JSON.stringify(data || {}) }),
    cancel: (id: string, reason?: string) => request(`/productions/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    getReport: (id: string) => request(`/productions/${id}/report`),
  },

  // Reports
  reports: {
    dailyMaterials: (date: string, format = 'json') =>
      request(`/reports/daily-materials?date=${date}&format=${format}`),
    materialConsumption: (startDate: string, endDate: string, format = 'json') =>
      request(`/reports/material-consumption?startDate=${startDate}&endDate=${endDate}&format=${format}`),
    mealCost: (startDate: string, endDate: string, format = 'json') =>
      request(`/reports/meal-cost?startDate=${startDate}&endDate=${endDate}&format=${format}`),
    perPersonCost: (startDate: string, endDate: string, format = 'json') =>
      request(`/reports/per-person-cost?startDate=${startDate}&endDate=${endDate}&format=${format}`),
    monthlyExpense: (year: number, month: number, format = 'json') =>
      request(`/reports/monthly-expense?year=${year}&month=${month}&format=${format}`),
    
    // Download helper
    downloadFile: async (url: string, filename: string) => {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Rapor indirilemedi.');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    }
  },

  // Users (Admin)
  users: {
    list: () => request('/users'),
    get: (id: string) => request(`/users/${id}`),
    create: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
  },

  // Logs (Admin)
  logs: {
    list: (params?: { page?: number; limit?: number; action?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.action) q.append('action', params.action);
      return request(`/logs?${q.toString()}`);
    },
  },

  // Notifications
  notifications: {
    list: () => request('/notifications'),
    markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
    delete: (id: string) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },
};
