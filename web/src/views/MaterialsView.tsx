import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  Layers, 
  Edit3, 
  Trash2, 
  Sliders, 
  X,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  Upload,
  Download
} from 'lucide-react';
import { api } from '../api';
import { Material, MaterialBatch, Unit } from '../types';
import { useAuth } from '../context/AuthContext';
import { downloadMaterialTemplate, parseExcelFile } from '../utils/excel';

export const MaterialsView: React.FC = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedBatchesMaterial, setSelectedBatchesMaterial] = useState<Material | null>(null);
  const [batches, setBatches] = useState<MaterialBatch[]>([]);
  const [adjustingMaterial, setAdjustingMaterial] = useState<Material | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Kuru Gıda');
  const [formUnitId, setFormUnitId] = useState<number>(1);
  const [formMinStock, setFormMinStock] = useState('10');
  const [formCriticalStock, setFormCriticalStock] = useState('5');
  const [formBarcode, setFormBarcode] = useState('');
  const [formError, setFormError] = useState('');

  // Stock Adjustment form states
  const [adjType, setAdjType] = useState('adjustment_in');
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Excel Import states
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<any[]>([]);
  const [excelImporting, setExcelImporting] = useState(false);
  const [excelMsg, setExcelMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [matRes, unitRes] = await Promise.all([
        api.materials.list({ category: categoryFilter || undefined }),
        api.units.list(),
      ]);
      if (matRes?.data) setMaterials(matRes.data);
      if (unitRes?.data) {
        setUnits(unitRes.data);
        if (unitRes.data.length > 0 && !formUnitId) {
          setFormUnitId(unitRes.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingMaterial(null);
    setFormName('');
    setFormCategory('Kuru Gıda');
    setFormUnitId(units[0]?.id || 1);
    setFormMinStock('10');
    setFormCriticalStock('5');
    setFormBarcode('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (mat: Material) => {
    setEditingMaterial(mat);
    setFormName(mat.name);
    setFormCategory(mat.category);
    setFormUnitId(mat.unitId);
    setFormMinStock(mat.minStock.toString());
    setFormCriticalStock(mat.criticalStock.toString());
    setFormBarcode(mat.barcode || '');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Malzeme adı zorunludur.');
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        category: formCategory,
        unitId: Number(formUnitId),
        minStock: parseFloat(formMinStock) || 0,
        criticalStock: parseFloat(formCriticalStock) || 0,
        barcode: formBarcode.trim() || undefined,
      };

      if (editingMaterial) {
        await api.materials.update(editingMaterial.id, payload);
      } else {
        await api.materials.create(payload);
      }

      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Kayıt sırasında hata oluştu.');
    }
  };

  const handleDeleteMaterial = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" malzemesini silmek istediğinizden emin misiniz?`)) return;
    try {
      await api.materials.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Silinemedi.');
    }
  };

  const viewBatches = async (mat: Material) => {
    setSelectedBatchesMaterial(mat);
    try {
      const res = await api.materials.getBatches(mat.id);
      setBatches(res?.data || []);
    } catch (err) {
      console.error(err);
      setBatches([]);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMaterial) return;
    setAdjSubmitting(true);
    try {
      await api.materials.adjustStock({
        materialId: adjustingMaterial.id,
        quantity: parseFloat(adjQuantity),
        movementType: adjType,
        reason: adjReason,
      });
      setAdjustingMaterial(null);
      setAdjQuantity('');
      setAdjReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Stok düzeltilemedi.');
    } finally {
      setAdjSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelMsg(null);
    try {
      const rows = await parseExcelFile(file);
      if (!rows || rows.length === 0) {
        setExcelMsg({ type: 'error', text: 'Dosya boş veya format okunamadı.' });
        return;
      }
      setExcelPreviewData(rows);
    } catch (err: any) {
      setExcelMsg({ type: 'error', text: 'Excel dosyası işlenirken hata oluştu: ' + (err.message || '') });
    }
  };

  const handleExecuteImport = async () => {
    if (excelPreviewData.length === 0) return;
    setExcelImporting(true);
    setExcelMsg(null);

    let successCount = 0;
    let failCount = 0;

    for (const row of excelPreviewData) {
      const name = (row['Malzeme Adı'] || row['Malzeme'] || row['name'] || '').toString().trim();
      if (!name) continue;

      const category = (row['Kategori'] || row['category'] || 'Kuru Gıda').toString().trim();
      const unitStr = (row['Birim'] || row['Ölçü Birimi'] || row['unit'] || 'kg').toString().trim().toLowerCase();
      const minStock = parseFloat(row['Min Stok'] || row['Minimum Stok'] || row['minStock'] || 0) || 0;
      const criticalStock = parseFloat(row['Kritik Stok'] || row['criticalStock'] || 0) || 0;
      const barcode = (row['Barkod'] || row['barcode'] || '').toString().trim();

      // Find matching unit by abbreviation or name
      const matchedUnit = units.find(
        u => u.abbreviation.toLowerCase() === unitStr || u.name.toLowerCase() === unitStr
      ) || units[0];

      try {
        await api.materials.create({
          name,
          category,
          unitId: matchedUnit?.id || 1,
          minStock,
          criticalStock,
          barcode: barcode || undefined,
        });
        successCount++;
      } catch (err) {
        console.error('Import row failed:', name, err);
        failCount++;
      }
    }

    setExcelImporting(false);
    if (successCount > 0) {
      setExcelMsg({
        type: 'success',
        text: `Başarıyla ${successCount} adet malzeme eklendi.${failCount > 0 ? ` (${failCount} adet hata verdi veya zaten mevcuttu)` : ''}`
      });
      loadData();
      setExcelPreviewData([]);
    } else {
      setExcelMsg({
        type: 'error',
        text: `Malzemeler eklenemedi. Zaten mevcut olabilir veya veri formatı uyuşmuyor.`
      });
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = ['Tümü', 'Et & Tavuk', 'Bakliyat', 'Kuru Gıda', 'Sebze & Meyve', 'Süt & Şarküteri', 'Baharat & Sos', 'İçecek', 'Temizlik & Ambalaj'];

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stok & Malzeme Yönetimi</h1>
          <p className="text-slate-500 text-sm mt-1">Hammadde listesi, parti takibi, SKT kontrolleri ve depo seviyeleri</p>
        </div>
        {(user?.role?.name === 'admin' || user?.role?.name === 'depot') && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setIsExcelModalOpen(true);
                setExcelPreviewData([]);
                setExcelMsg(null);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition shadow-sm"
              title="Excel İle Toplu Yükleme"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel'den Yükle
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl text-sm transition shadow-sm shadow-brand-500/20"
            >
              <Plus className="w-4 h-4" />
              Yeni Malzeme Ekle
            </button>
          </div>
        )}
      </div>

      {/* Arama & Kategori Filtreleri */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Malzeme adı veya kategori ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === 'Tümü' ? '' : cat)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  (cat === 'Tümü' && !categoryFilter) || categoryFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Malzeme Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="py-4 px-6">Malzeme Adı</th>
                <th className="py-4 px-4">Kategori</th>
                <th className="py-4 px-4">Mevcut Stok</th>
                <th className="py-4 px-4">Birim</th>
                <th className="py-4 px-4">Kritik Sınır</th>
                <th className="py-4 px-4">Durum</th>
                <th className="py-4 px-6 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">Yükleniyor...</td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    Kayıtlı malzeme bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((mat) => {
                  const isCritical = mat.currentStock <= mat.criticalStock;
                  const isLow = mat.currentStock <= mat.minStock && !isCritical;
                  return (
                    <tr key={mat.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {mat.name}
                        {mat.barcode && (
                          <span className="block text-xs font-normal text-slate-400 mt-0.5">
                            Barkod: {mat.barcode}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                          {mat.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900 text-base">
                        {mat.currentStock}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {mat.unitAbbr || mat.unitName || 'adet'}
                      </td>
                      <td className="py-4 px-4 text-slate-500 text-xs">
                        Kritik: {mat.criticalStock} / Min: {mat.minStock}
                      </td>
                      <td className="py-4 px-4">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Kritik
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">
                            Azalıyor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            Yeterli
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-1">
                        <button
                          onClick={() => viewBatches(mat)}
                          title="Partileri (Lotları) Gör"
                          className="p-2 text-slate-500 hover:text-navy-500 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        {(user?.role?.name === 'admin' || user?.role?.name === 'depot') && (
                          <>
                            <button
                              onClick={() => setAdjustingMaterial(mat)}
                              title="Stok Düzeltmesi Yap"
                              className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(mat)}
                              title="Düzenle"
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {user?.role?.name === 'admin' && (
                          <button
                            onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                            title="Sil"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Malzeme Ekle/Düzenle Modalı */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingMaterial ? 'Malzemeyi Düzenle' : 'Yeni Malzeme Ekle'}
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Malzeme Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Dana Kuşbaşı, Baldo Pirinç"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {categories.filter(c => c !== 'Tümü').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ölçü Birimi</label>
                  <select
                    value={formUnitId}
                    onChange={(e) => setFormUnitId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Minimum Stok</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kritik Stok Uyarısı</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCriticalStock}
                    onChange={(e) => setFormCriticalStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Barkod (İsteğe Bağlı)</label>
                <input
                  type="text"
                  placeholder="8690000000000"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-sm shadow-brand-500/20"
                >
                  {editingMaterial ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partiler (Lots) Modalı */}
      {selectedBatchesMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedBatchesMaterial.name}</h3>
                <p className="text-xs text-slate-500">Mevcut Partiler, Giriş Fiyatları ve SKT Tarihleri</p>
              </div>
              <button 
                onClick={() => setSelectedBatchesMaterial(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {batches.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Bu malzemeye ait aktif parti (stok lotu) bulunmuyor. Fatura girişi yaparak yeni parti ekleyebilirsiniz.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Parti No</th>
                      <th className="p-3">Kalan / Başlangıç</th>
                      <th className="p-3">Birim Fiyat</th>
                      <th className="p-3">Son Kullanma (SKT)</th>
                      <th className="p-3">Tedarikçi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map((b) => (
                      <tr key={b.id}>
                        <td className="p-3 font-semibold text-slate-900">{b.batchNumber}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {b.quantity} / {b.initialQuantity} {selectedBatchesMaterial.unitAbbr}
                        </td>
                        <td className="p-3 text-emerald-600 font-semibold">{b.unitPrice} ₺</td>
                        <td className="p-3 text-slate-600">
                          {new Date(b.expiryDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="p-3 text-slate-400">{b.supplier || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedBatchesMaterial(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manuel Stok Düzeltme Modalı */}
      {adjustingMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Stok Düzeltmesi</h3>
                <p className="text-xs text-slate-500">{adjustingMaterial.name} ({adjustingMaterial.unitAbbr})</p>
              </div>
              <button 
                onClick={() => setAdjustingMaterial(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">İşlem Türü</label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="adjustment_in">Sayım Fazlası (Stok Ekle)</option>
                  <option value="adjustment_out">Sayım Eksiği (Stok Düş)</option>
                  <option value="waste">Zayi / Fire / Bozulma (Stok Düş)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Miktar ({adjustingMaterial.unitAbbr})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={adjQuantity}
                  onChange={(e) => setAdjQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Açıklama / Sebep</label>
                <textarea
                  rows={2}
                  placeholder="Haftalık sayım düzeltmesi, dökülme vb."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingMaterial(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={adjSubmitting}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-sm"
                >
                  {adjSubmitting ? 'Uygulanıyor...' : 'Düzeltmeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel İle Malzeme Yükleme Modalı */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Excel'den Toplu Malzeme Yükle</h3>
              </div>
              <button 
                onClick={() => setIsExcelModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {excelMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                excelMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {excelMsg.text}
              </div>
            )}

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Şablon İndirme Alanı */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase">1. Excel Şablonunu İndirin</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Örnek sütunları ve veri formatını içeren şablonu indirip doldurun.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadMaterialTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-xs"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  Şablonu İndir (.xlsx)
                </button>
              </div>

              {/* Dosya Yükleme Alanı */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">2. Doldurulan Dosyayı Seçin</h4>
                <label className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-brand-50/20 transition">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-700">Excel veya CSV dosyası seçin</span>
                  <span className="text-xs text-slate-400 mt-1">.xlsx, .xls veya .csv formatı</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Önizleme Tablosu */}
              {excelPreviewData.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">
                    Yüklenecek Malzemeler ({excelPreviewData.length} kayıt bulundu)
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0">
                        <tr>
                          <th className="p-2.5">Malzeme Adı</th>
                          <th className="p-2.5">Kategori</th>
                          <th className="p-2.5">Birim</th>
                          <th className="p-2.5">Min Stok</th>
                          <th className="p-2.5">Kritik Stok</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {excelPreviewData.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-semibold text-slate-900">
                              {row['Malzeme Adı'] || row['Malzeme'] || row['name']}
                            </td>
                            <td className="p-2.5 text-slate-600">{row['Kategori'] || row['category']}</td>
                            <td className="p-2.5 text-slate-600">{row['Birim'] || row['unit']}</td>
                            <td className="p-2.5 text-slate-600">{row['Min Stok'] || 0}</td>
                            <td className="p-2.5 text-slate-600">{row['Kritik Stok'] || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Kapat
              </button>
              {excelPreviewData.length > 0 && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={excelImporting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {excelImporting ? 'Kaydediliyor...' : `${excelPreviewData.length} Malzemeyi Depoya Aktar`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

