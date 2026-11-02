import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  UtensilsCrossed, 
  Calendar, 
  Utensils, 
  BarChart3, 
  Ruler, 
  Users, 
  ShieldAlert, 
  LogOut, 
  Menu as MenuIcon, 
  X,
  ChefHat,
  ChevronDown
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { MaterialsView } from './views/MaterialsView';
import { InvoicesView } from './views/InvoicesView';
import { RecipesView } from './views/RecipesView';
import { MenusView } from './views/MenusView';
import { ProductionsView } from './views/ProductionsView';
import { ReportsView } from './views/ReportsView';
import { UnitsView } from './views/UnitsView';
import { UsersView } from './views/UsersView';
import { LogsView } from './views/LogsView';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout, quickLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white text-sm font-semibold">CateringPro Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginView />;
  }

  const role = user.role?.name; // 'admin' | 'chef' | 'depot'

  // Navigation items with role permissions
  const navItems = [
    { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard, roles: ['admin', 'chef', 'depot'] },
    { id: 'materials', label: 'Stok & Malzeme', icon: Package, roles: ['admin', 'chef', 'depot'] },
    { id: 'invoices', label: 'Faturalar (Giriş)', icon: FileText, roles: ['admin', 'depot'] },
    { id: 'recipes', label: 'Reçeteler & Yemek', icon: UtensilsCrossed, roles: ['admin', 'chef'] },
    { id: 'menus', label: 'Menü Planlama', icon: Calendar, roles: ['admin', 'chef'] },
    { id: 'productions', label: 'Üretim Yönetimi', icon: Utensils, roles: ['admin', 'chef'] },
    { id: 'reports', label: 'Maliyet & Raporlar', icon: BarChart3, roles: ['admin', 'chef', 'depot'] },
    { id: 'units', label: 'Ölçü Birimleri', icon: Ruler, roles: ['admin', 'depot'] },
    { id: 'users', label: 'Kullanıcılar', icon: Users, roles: ['admin'] },
    { id: 'logs', label: 'Sistem Logları', icon: ShieldAlert, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(role));

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Sistem Yöneticisi', color: 'bg-purple-100 text-purple-800' },
    chef: { label: 'Baş Şef', color: 'bg-amber-100 text-amber-800' },
    depot: { label: 'Depo Sorumlusu', color: 'bg-blue-100 text-blue-800' },
  };

  const userBadge = roleLabels[role] || { label: role, color: 'bg-slate-100 text-slate-800' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobil Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center font-bold text-base">
            🍽️
          </div>
          <span className="font-extrabold text-lg tracking-tight">CateringPro</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar (Masaüstü & Mobil Açılır) */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 z-40 flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="space-y-6">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-xl shadow-lg shadow-brand-500/30">
              🍽️
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white tracking-tight leading-tight">CateringPro</h2>
              <span className="text-[11px] text-slate-400 font-medium">Mutfak & Depo Sistemi</span>
            </div>
          </div>

          {/* Menü Öğeleri */}
          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profil & Hızlı Rol Değiştirici */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="px-3 py-2 bg-slate-800/60 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                {user.fullName}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${userBadge.color}`}>
                {userBadge.label}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">@{user.username}</span>

            {/* Hızlı Rol Geçiş Butonları */}
            <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Rol Değiştir:</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => quickLogin('admin')} 
                  title="Admin olarak geç" 
                  className={`px-1.5 py-0.5 rounded ${role === 'admin' ? 'bg-purple-600 text-white font-bold' : 'bg-slate-700 text-slate-300'}`}
                >
                  Admin
                </button>
                <button 
                  onClick={() => quickLogin('chef')} 
                  title="Şef olarak geç" 
                  className={`px-1.5 py-0.5 rounded ${role === 'chef' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-700 text-slate-300'}`}
                >
                  Şef
                </button>
                <button 
                  onClick={() => quickLogin('depo')} 
                  title="Depo olarak geç" 
                  className={`px-1.5 py-0.5 rounded ${role === 'depot' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-700 text-slate-300'}`}
                >
                  Depo
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Ana İçerik Alanı */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && <DashboardView onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'materials' && <MaterialsView />}
        {activeTab === 'invoices' && <InvoicesView />}
        {activeTab === 'recipes' && <RecipesView />}
        {activeTab === 'menus' && <MenusView onNavigateToProductions={() => setActiveTab('productions')} />}
        {activeTab === 'productions' && <ProductionsView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'units' && <UnitsView />}
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'logs' && <LogsView />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

