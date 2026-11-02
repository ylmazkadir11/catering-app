// =============================================
// Catering Yönetim Sistemi - TypeScript Tip Tanımlamaları
// Tüm backend modelleriyle uyumlu
// =============================================

// Kullanıcı tipi
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  is_active?: boolean;
}

// Rol tipi
export interface Role {
  id: number;
  name: string;
  description: string;
}

// Ölçü birimi tipi
export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
}

// Malzeme tipi
export interface Material {
  id: number;
  name: string;
  category: string;
  unit_id: number;
  unit?: Unit;
  minimum_stock: number;
  current_stock: number;
  is_active: boolean;
}

// Parti (batch) tipi
export interface Batch {
  id: number;
  material_id: number;
  invoice_id: number;
  batch_number: string;
  entry_date: string;
  expiry_date?: string;
  quantity_entered: number;
  quantity_remaining: number;
  unit_price: number;
  total_price: number;
  is_exhausted: boolean;
}

// Fatura girişi (parti oluşturmak için)
export interface BatchInput {
  material_id: number;
  quantity: number;
  total_price: number;
  expiry_date?: string;
  unit_price?: number;
}

// Fatura tipi
export interface Invoice {
  id: number;
  invoice_no: string;
  supplier_name: string;
  invoice_date: string;
  total_amount: number;
  notes?: string;
  batches?: BatchInput[];
}

// Reçete tipi
export interface Recipe {
  id: number;
  name: string;
  category: string;
  description?: string;
  is_active: boolean;
  items?: RecipeItem[];
}

// Reçete kalemi tipi
export interface RecipeItem {
  id: number;
  recipe_id: number;
  material_id: number;
  material?: Material;
  quantity: number;
  unit_id: number;
  unit?: Unit;
}

// Öğün tipi
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Menü tipi
export interface Menu {
  id: number;
  menu_date: string;
  is_approved: boolean;
  approved_by?: number;
  approved_at?: string;
  items?: MenuItem[];
}

// Menü kalemi tipi
export interface MenuItem {
  id: number;
  menu_id: number;
  meal_type: MealType;
  recipe_id: number;
  recipe?: Recipe;
  sort_order: number;
}

// Üretim tipi
export interface Production {
  id: number;
  menu_id: number;
  production_date: string;
  meal_type: MealType;
  person_count: number;
  status: ProductionStatus;
  confirmed_by?: number;
  confirmed_at?: string;
  report_generated: boolean;
  items?: ProductionItem[];
}

// Üretim durumu
export type ProductionStatus = 'draft' | 'confirmed' | 'cancelled';

// Üretim kalemi tipi
export interface ProductionItem {
  id: number;
  production_id: number;
  material_id: number;
  material?: Material;
  calculated_qty: number;
  actual_qty: number;
  unit_id: number;
  unit?: Unit;
  total_cost: number;
}

// Stok hareketi tipi
export interface StockMovement {
  id: number;
  material_id: number;
  movement_type: 'in' | 'out';
  quantity: number;
  unit_price: number;
  total_cost: number;
  reference_type: string;
  created_at: string;
}

// Log tipi
export interface Log {
  id: number;
  user_id: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id: number;
  old_data?: any;
  new_data?: any;
  created_at: string;
}

// Bildirim tipi
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// Dashboard istatistikleri
export interface DashboardStats {
  totalMaterials: number;
  criticalStock: number;
  todayProductions: number;
  unreportedCount: number;
  expiringBatches: number;
}

// Dashboard uyarıları
export interface DashboardAlert {
  type: 'critical_stock' | 'expiring_batch';
  material_id?: number;
  batch_id?: number;
  material_name?: string;
  current_stock?: number;
  minimum_stock?: number;
  expiry_date?: string;
  days_remaining?: number;
}

// Genel API cevap tipi
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Sayfalama tipi
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Login isteği tipi
export interface LoginRequest {
  username: string;
  password: string;
}

// Login cevap tipi
export interface LoginResponse {
  token: string;
  user: User;
}

// Rapor filtre tipleri
export interface ReportFilter {
  date?: string;
  start_date?: string;
  end_date?: string;
  month?: number;
  year?: number;
}

// Üretim hesaplama isteği
export interface ProductionCalculateRequest {
  menu_id: number;
  meal_type: MealType;
  person_count: number;
}
