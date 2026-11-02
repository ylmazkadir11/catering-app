import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Utensils, 
  Clock, 
  TrendingUp, 
  PlusCircle, 
  FileText, 
  Calendar,
  ChefHat,
  Boxes,
  ArrowRight
} from 'lucide-react';
import { api } from '../api';
import { DashboardStats, Material, Production } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [criticalMaterials, setCriticalMaterials] = useState<Material[]>([]);
  const [recentProductions, setRecentProductions] = useState<Production[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, matRes, prodRes] = await Promise.all([
        api.dashboard.getStats().catch(() => ({ data: null })),
        api.materials.list({ lowStock: true }).catch(() => ({ data: [] })),
        api.productions.list({ limit: '5' }).catch(() => ({ data: [] })),
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      if (matRes?.data) setCriticalMaterials(matRes.data.slice(0, 5));
      if (prodRes?.data) setRecentProductions(prodRes.data.slice(0, 5));
    } catch (err) {
      console.error('Dashboard yüklenirken hata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık & Hızlı Eylemler */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Genel Bakış & Kontrol Paneli</h1>
          <p className="text-slate-500 text-sm mt-1">Catering mutfak operasyonları, stok durumu ve üretim özetleri</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('invoices')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl text-sm transition shadow-sm shadow-brand-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            Yeni Fatura Girişi
          </button>
          <button
            onClick={() => onNavigate('productions')}
            className="flex items-center gap-2 px-4 py-2 bg-navy-500 hover:bg-navy-700 text-white font-medium rounded-xl text-sm transition shadow-sm"
          >
            <Utensils className="w-4 h-4" />
            Üretim Başlat
          </button>
          <button
            onClick={() => onNavigate('menus')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
          >
            <Calendar className="w-4 h-4" />
            Menü Planı
          </button>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Toplam Malzeme</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">
              {isLoading ? '...' : stats?.totalMaterials ?? 0}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Depoda kayıtlı kalem</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Kritik Stok Uyarısı</p>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-2">
              {isLoading ? '...' : stats?.criticalStock ?? 0}
            </h3>
            <p className="text-xs text-amber-600/80 mt-1">Tükenmek üzere olan ürün</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Bugünkü Üretim</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">
              {isLoading ? '...' : stats?.todayProductions ?? 0}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Planlanan / pişen yemek</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <ChefHat className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">SKT Yaklaşan Partiler</p>
            <h3 className="text-3xl font-extrabold text-rose-600 mt-2">
              {isLoading ? '...' : stats?.expiringBatches ?? 0}
            </h3>
            <p className="text-xs text-rose-600/80 mt-1">30 gün içinde dolacak</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Alt Grid: Kritik Malzemeler & Son Üretimler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kritik Stok Listesi */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">Kritik Stok Uyarıları</h2>
            </div>
            <button 
              onClick={() => onNavigate('materials')}
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1"
            >
              Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {criticalMaterials.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-500 text-sm">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Kritik seviyede malzeme bulunmuyor. Depo stokları güvende!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {criticalMaterials.map((mat) => (
                <div key={mat.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{mat.name}</h4>
                    <p className="text-xs text-slate-400">{mat.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700">
                      {mat.currentStock} {mat.unitAbbr || 'birim'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Min: {mat.minStock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Son Üretimler / Planlar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-navy-500" />
              <h2 className="text-lg font-bold text-slate-900">Son Üretimler & Görevler</h2>
            </div>
            <button 
              onClick={() => onNavigate('productions')}
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1"
            >
              Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentProductions.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-500 text-sm">
              <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Henüz kayıtlı üretim emri bulunmuyor.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentProductions.map((prod) => (
                <div key={prod.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      {prod.recipeName || 'Menü Üretimi'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Tarih: {new Date(prod.productionDate).toLocaleDateString('tr-TR')} • {prod.portions} Porsiyon
                    </p>
                  </div>
                  <div>
                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg ${
                      prod.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : prod.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {prod.status === 'completed' ? 'Tamamlandı' : prod.status === 'in_progress' ? 'Hazırlanıyor' : 'Planlandı'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

