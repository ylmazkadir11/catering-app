import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  Plus, 
  Play, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Calendar, 
  Users, 
  X,
  Clock,
  AlertTriangle,
  ChefHat
} from 'lucide-react';
import { api } from '../api';
import { Production, Recipe } from '../types';
import { useAuth } from '../context/AuthContext';

export const ProductionsView: React.FC = () => {
  const { user } = useAuth();
  const [productions, setProductions] = useState<Production[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Production Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipeId, setRecipeId] = useState('');
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [portions, setPortions] = useState('100');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Report Modal
  const [reportModalData, setReportModalData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, recRes] = await Promise.all([
        api.productions.list({ status: statusFilter || undefined }),
        api.recipes.list(),
      ]);
      if (prodRes?.data) setProductions(prodRes.data);
      if (recRes?.data) {
        setRecipes(recRes.data);
        if (recRes.data.length > 0 && !recipeId) {
          setRecipeId(recRes.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!recipeId) {
      setFormError('Lütfen bir reçete / yemek seçin.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.productions.create({
        recipeId,
        productionDate,
        portions: parseInt(portions) || 50,
        notes: notes.trim() || undefined,
      });

      setIsModalOpen(false);
      setNotes('');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Üretim oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await api.productions.update(id, { status: 'in_progress' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız');
    }
  };

  const handleComplete = async (id: string) => {
    if (!window.confirm('Bu üretimi tamamlamak istediğinize emin misiniz? Malzemeler FIFO (İlk Giren İlk Çıkar) kuralına göre depodan otomatik düşülecektir.')) return;
    try {
      await api.productions.complete(id);
      alert('✅ Üretim tamamlandı ve depo stokları güncellendi!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Üretim tamamlanırken hata oluştu (Yetersiz stok olabilir).');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('İptal sebebini giriniz:');
    if (reason === null) return;
    try {
      await api.productions.cancel(id, reason);
      loadData();
    } catch (err: any) {
      alert(err.message || 'İptal edilemedi.');
    }
  };

  const viewProductionReport = async (id: string) => {
    try {
      const res = await api.productions.getReport(id);
      setReportModalData(res?.data || null);
    } catch (err: any) {
      alert(err.message || 'Rapor yüklenemedi.');
    }
  };

  const statusBadges: Record<string, { label: string; color: string; icon: any }> = {
    planned: { label: 'Planlandı', color: 'bg-slate-100 text-slate-700', icon: Clock },
    in_progress: { label: 'Hazırlanıyor', color: 'bg-blue-50 text-blue-700', icon: Play },
    completed: { label: 'Tamamlandı (Stok Düşüldü)', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    cancelled: { label: 'İptal Edildi', color: 'bg-rose-50 text-rose-700', icon: XCircle },
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Üretim Yönetimi & Mutfak Operasyonu</h1>
          <p className="text-slate-500 text-sm mt-1">Yemek pişirme emirleri, porsiyonlama ve otomatik FIFO stok düşümü</p>
        </div>
        {(user?.role?.name === 'admin' || user?.role?.name === 'chef') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl text-sm transition shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            Yeni Üretim Emri
          </button>
        )}
      </div>

      {/* Durum Filtreleri */}
      <div className="flex gap-2 overflow-x-auto bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        {[
          { key: '', label: 'Tüm Görevler' },
          { key: 'planned', label: 'Planlandı' },
          { key: 'in_progress', label: 'Hazırlanıyor' },
          { key: 'completed', label: 'Tamamlandı' },
          { key: 'cancelled', label: 'İptal' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === tab.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Üretim Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="py-4 px-6">Yemek / Reçete</th>
                <th className="py-4 px-4">Tarih</th>
                <th className="py-4 px-4">Porsiyon</th>
                <th className="py-4 px-4">Durum</th>
                <th className="py-4 px-4">Toplam Maliyet</th>
                <th className="py-4 px-6 text-right">Eylemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">Yükleniyor...</td>
                </tr>
              ) : productions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    Kayıtlı üretim emri bulunamadı.
                  </td>
                </tr>
              ) : (
                productions.map((prod) => {
                  const badge = statusBadges[prod.status] || statusBadges.planned;
                  const Icon = badge.icon;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {prod.recipeName || 'Menü Üretimi'}
                        {prod.notes && (
                          <span className="block text-xs font-normal text-slate-400 mt-0.5">
                            Not: {prod.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {new Date(prod.productionDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {prod.portions} Porsiyon
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${badge.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {prod.totalCost ? `${Number(prod.totalCost).toFixed(2)} ₺` : '-'}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        {prod.status === 'completed' && (
                          <button
                            onClick={() => viewProductionReport(prod.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                            title="Tüketim Raporu"
                          >
                            Rapor
                          </button>
                        )}

                        {(user?.role?.name === 'admin' || user?.role?.name === 'chef') && (
                          <>
                            {prod.status === 'planned' && (
                              <button
                                onClick={() => handleStart(prod.id)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                              >
                                Başlat
                              </button>
                            )}

                            {prod.status === 'in_progress' && (
                              <button
                                onClick={() => handleComplete(prod.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                              >
                                Tamamla
                              </button>
                            )}

                            {(prod.status === 'planned' || prod.status === 'in_progress') && (
                              <button
                                onClick={() => handleCancel(prod.id)}
                                className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                              >
                                İptal
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeni Üretim Emri Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Yeni Üretim Emri Başlat</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pişirilecek Yemek / Reçete *</label>
                <select
                  required
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="">Seçiniz...</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Üretim Tarihi</label>
                  <input
                    type="date"
                    required
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Porsiyon Miktarı</label>
                  <input
                    type="number"
                    required
                    value={portions}
                    onChange={(e) => setPortions(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notlar / Mutfak Açıklaması</label>
                <textarea
                  rows={2}
                  placeholder="Öğlen servisi için saat 11:30 hazır olacak"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
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
                  {isSubmitting ? 'Oluşturuluyor...' : 'Emri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tüketim Raporu Modalı */}
      {reportModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Üretim Tüketim Raporu</h3>
                <p className="text-xs text-slate-500">Kullanılan hammaddeler ve düşülen partiler</p>
              </div>
              <button 
                onClick={() => setReportModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Malzeme</th>
                    <th className="p-3">Harcanan Miktar</th>
                    <th className="p-3">Birim Maliyet</th>
                    <th className="p-3 text-right">Toplam Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportModalData.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="p-3 font-semibold text-slate-900">{item.materialName}</td>
                      <td className="p-3 font-bold text-slate-700">{item.quantity} {item.unitAbbr}</td>
                      <td className="p-3">{item.unitCost ? `${item.unitCost} ₺` : '-'}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {item.totalCost ? `${Number(item.totalCost).toFixed(2)} ₺` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setReportModalData(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

