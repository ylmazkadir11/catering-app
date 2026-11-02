import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Utensils, 
  ArrowRight, 
  X,
  ChefHat,
  Users,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { Menu, Recipe } from '../types';
import { useAuth } from '../context/AuthContext';

interface MenusViewProps {
  onNavigateToProductions?: () => void;
}

export const MenusView: React.FC<MenusViewProps> = ({ onNavigateToProductions }) => {
  const { user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Menu Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [menuType, setMenuType] = useState('lunch');
  const [targetPortions, setTargetPortions] = useState('150');
  const [notes, setNotes] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [menuRes, recRes] = await Promise.all([
        api.menus.list(),
        api.recipes.list(),
      ]);
      if (menuRes?.data) setMenus(menuRes.data);
      if (recRes?.data) setRecipes(recRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecipeSelection = (recipeId: string) => {
    if (selectedRecipeIds.includes(recipeId)) {
      setSelectedRecipeIds(selectedRecipeIds.filter(id => id !== recipeId));
    } else {
      setSelectedRecipeIds([...selectedRecipeIds, recipeId]);
    }
  };

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (selectedRecipeIds.length === 0) {
      setFormError('Lütfen menüye en az bir yemek / reçete ekleyin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date,
        menuType,
        targetPortions: parseInt(targetPortions) || 100,
        notes: notes.trim() || undefined,
        recipes: selectedRecipeIds.map((id, index) => ({
          recipeId: id,
          sortOrder: index + 1
        }))
      };

      await api.menus.create(payload);
      setIsModalOpen(false);
      setSelectedRecipeIds([]);
      setNotes('');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Menü oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleApprove = async (menu: Menu) => {
    try {
      if (menu.isApproved) {
        await api.menus.unapprove(menu.id);
      } else {
        await api.menus.approve(menu.id);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu menüyü silmek istediğinize emin misiniz?')) return;
    try {
      await api.menus.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Silinemedi.');
    }
  };

  const handleCreateProductionFromMenu = async (menu: Menu) => {
    try {
      await api.productions.createFromMenu({
        menuId: menu.id,
        productionDate: menu.date,
        portions: menu.targetPortions
      });
      alert('✅ Menü için üretim emirleri başarıyla oluşturuldu!');
      if (onNavigateToProductions) onNavigateToProductions();
    } catch (err: any) {
      alert(err.message || 'Üretim emri oluşturulamadı.');
    }
  };

  const menuTypeLabels: Record<string, string> = {
    lunch: 'Öğle Yemeği',
    dinner: 'Akşam Yemeği',
    breakfast: 'Kahvaltı',
    event: 'Özel Davet / Tabldot'
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Menü Planlama & Takvim</h1>
          <p className="text-slate-500 text-sm mt-1">Günlük yemek menüleri, onay süreçleri ve tek tıkla üretime aktarım</p>
        </div>
        {(user?.role?.name === 'admin' || user?.role?.name === 'chef') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl text-sm transition shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            Yeni Menü Planla
          </button>
        )}
      </div>

      {/* Menü Listesi */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100">
            Yükleniyor...
          </div>
        ) : menus.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100">
            <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            Planlanmış menü bulunmuyor.
          </div>
        ) : (
          menus.map((m) => (
            <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex flex-col items-center justify-center font-bold">
                    <span className="text-[10px] uppercase">
                      {new Date(m.date).toLocaleDateString('tr-TR', { month: 'short' })}
                    </span>
                    <span className="text-lg leading-none">
                      {new Date(m.date).getDate()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {menuTypeLabels[m.menuType] || m.menuType}
                      </h3>
                      {m.isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Onaylandı
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                          <AlertCircle className="w-3.5 h-3.5" /> Taslak (Onay Bekliyor)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                      <span>Tarih: {new Date(m.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {m.targetPortions} Kişilik
                      </span>
                    </p>
                  </div>
                </div>

                {/* Eylem Butonları */}
                <div className="flex flex-wrap items-center gap-2">
                  {(user?.role?.name === 'admin' || user?.role?.name === 'chef') && (
                    <>
                      <button
                        onClick={() => handleToggleApprove(m)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                          m.isApproved
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {m.isApproved ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {m.isApproved ? 'Onayı Kaldır' : 'Menüyü Onayla'}
                      </button>

                      {m.isApproved && (
                        <button
                          onClick={() => handleCreateProductionFromMenu(m)}
                          className="px-3 py-1.5 bg-navy-500 hover:bg-navy-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Utensils className="w-3.5 h-3.5" />
                          Üretim Emri Aç
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Menü Yemekleri */}
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {m.items && m.items.length > 0 ? (
                    m.items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white shadow-xs text-brand-600 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {item.recipeName || 'Yemek'}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">
                            {item.recipeCategory || 'Kategori'} {item.costPerPortion ? `• ${Number(item.costPerPortion).toFixed(1)} ₺` : ''}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 col-span-full">Menüye henüz yemek atanmamış.</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Yeni Menü Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Yeni Günlük Menü Planla</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            )}

            <form onSubmit={handleCreateMenu} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tarih</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Öğün / Menü Türü</label>
                  <select
                    value={menuType}
                    onChange={(e) => setMenuType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="lunch">Öğle Yemeği</option>
                    <option value="dinner">Akşam Yemeği</option>
                    <option value="breakfast">Kahvaltı</option>
                    <option value="event">Özel Tabldot / Davet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hedef Kişi Sayısı</label>
                  <input
                    type="number"
                    required
                    value={targetPortions}
                    onChange={(e) => setTargetPortions(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Özel Notlar</label>
                <input
                  type="text"
                  placeholder="Diyet menüsü, vip konuklar vb."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Yemek Reçeteleri Seçimi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Menüye Dahil Edilecek Yemekler ({selectedRecipeIds.length} seçili)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-xl">
                  {recipes.map((rec) => {
                    const isSelected = selectedRecipeIds.includes(rec.id);
                    return (
                      <div
                        key={rec.id}
                        onClick={() => toggleRecipeSelection(rec.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-50 border-brand-300 text-brand-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{rec.name}</p>
                          <span className="text-[10px] text-slate-400 font-normal">{rec.category}</span>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-brand-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-sm"
                >
                  {isSubmitting ? 'Oluşturuluyor...' : 'Menüyü Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

