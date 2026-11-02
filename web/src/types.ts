export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: {
    id: number;
    name: 'admin' | 'chef' | 'depot';
    description?: string;
  };
  isActive?: boolean;
  createdAt?: string;
}

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
}

export interface MaterialBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  initialQuantity: number;
  unitPrice: number;
  supplier?: string;
  createdAt?: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  unitId: number;
  unitName?: string;
  unitAbbr?: string;
  currentStock: number;
  minStock: number;
  criticalStock: number;
  barcode?: string;
  averageCost?: number;
  totalValue?: number;
  batches?: MaterialBatch[];
}

export interface RecipeIngredient {
  id?: string;
  materialId: string;
  materialName?: string;
  unitName?: string;
  unitAbbr?: string;
  quantity: number;
  wastePercentage?: number;
  unitPrice?: number;
  totalCost?: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  portions: number;
  description?: string;
  instructions?: string;
  costPerPortion?: number;
  totalCost?: number;
  ingredients?: RecipeIngredient[];
}

export interface MenuItem {
  id?: string;
  recipeId: string;
  recipeName?: string;
  recipeCategory?: string;
  costPerPortion?: number;
  sortOrder?: number;
}

export interface Menu {
  id: string;
  date: string;
  menuType: string; // 'lunch' | 'dinner' | 'event' | etc.
  targetPortions: number;
  isApproved: boolean;
  totalCost?: number;
  costPerPerson?: number;
  items?: MenuItem[];
  notes?: string;
}

export interface Production {
  id: string;
  productionNumber?: string;
  recipeId?: string;
  recipeName?: string;
  menuId?: string;
  menuDate?: string;
  productionDate: string;
  portions: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  totalCost?: number;
  notes?: string;
  items?: Array<{
    materialId: string;
    materialName: string;
    plannedQuantity: number;
    actualQuantity: number;
    unitAbbr: string;
  }>;
}

export interface InvoiceItem {
  id?: string;
  materialId: string;
  materialName?: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplier: string;
  invoiceDate: string;
  totalAmount: number;
  vatAmount?: number;
  netAmount?: number;
  itemCount?: number;
  items?: InvoiceItem[];
  notes?: string;
  status?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalMaterials: number;
  criticalStock: number;
  todayProductions: number;
  unreportedCount: number;
  expiringBatches: number;
}

