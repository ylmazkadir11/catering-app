import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  DollarSign, 
  PieChart, 
  X,
  ChefHat,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Download
} from 'lucide-react';
import { api } from '../api';
import { Recipe, Material } from '../types';
import { useAuth } from '../context/AuthContext';
import { downloadRecipeTemplate, parseExcelFile } from '../utils/excel';

export const RecipesView: React.FC = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Ana Yemek');
  const [portions, setPortions] = useState('10');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<any[]>([
    { materialId: '', quantity: '', wastePercentage: '0' }
  ]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);

  // Excel Import states
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<any[]>([]);
  const [excelImporting, setExcelImporting] = useState(false);
  const [excelMsg, setExcelMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const categories = ['Tümü', 'Çorba', 'Ana Yemek', 'Pilav & Makarna', 'Zeytinyağlı & Sebze', 'Salata', 'Tatlı', 'Kahvaltılık', 'İçecek'];

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [recRes, matRes] = await Promise.all([
        api.recipes.list(selectedCategory || undefined),
        api.materials.list(),
      ]);
      if (recRes?.data) setRecipes(recRes.data);
      if (matRes?.data) setMaterials(matRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingRecipe(null);
    setName('');
    setCategory('Ana Yemek');
    setPortions('10');
    setDescription('');
    setInstructions('');
    setIngredients([{ materialId: '', quantity: '', wastePercentage: '0' }]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (rec: Recipe) => {
    setEditingRecipe(rec);
    setName(rec.name);
    setCategory(rec.category);
    setPortions(rec.portions.toString());
    setDescription(rec.description || '');
    setInstructions(rec.instructions || '');
    if (rec.ingredients && rec.ingredients.length > 0) {
      setIngredients(rec.ingredients.map(ing => ({
        materialId: ing.materialId,
        quantity: ing.quantity.toString(),
        wastePercentage: (ing.wastePercentage || 0).toString()
      })));
    } else {
      setIngredients([{ materialId: '', quantity: '', wastePercentage: '0' }]);
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { materialId: '', quantity: '', wastePercentage: '0' }]);
  };

  const handleRemoveIngredient = (idx: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleIngredientChange = (idx: number, field: string, val: any) => {
    const updated = [...ingredients];
    updated[idx][field] = val;
    setIngredients(updated);
  };

  // Estimate costs based on warehouse material averageCost
  const calculateCosts = () => {
    let total = 0;
    ingredients.forEach(ing => {
      const mat = materials.find(m => m.id === ing.materialId);
      const qty = parseFloat(ing.quantity) || 0;
      const waste = parseFloat(ing.wastePercentage) || 0;
      const costPerUnit = mat?.averageCost || 0;
      const effectiveQty = qty * (1 + waste / 100);
      total += effectiveQty * costPerUnit;
    });
    const portionCount = parseFloat(portions) || 1;
    return {
      totalCost: total,
      costPerPortion: total / portionCount
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Yemek / reçete adı zorunludur.');
      return;
    }

    const validIngredients = ingredients.filter(i => i.materialId && parseFloat(i.quantity) > 0);
    if (validIngredients.length === 0) {
      setFormError('En az 1 adet malzeme ve miktar eklemelisiniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        portions: parseInt(portions) || 10,
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        ingredients: validIngredients.map(i => ({
          materialId: i.materialId,
          quantity: parseFloat(i.quantity),
          wastePercentage: parseFloat(i.wastePercentage) || 0,
        }))
      };

      if (editingRecipe) {
        await api.recipes.update(editingRecipe.id, payload);
      } else {
        await api.recipes.create(payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Kayıt başarısız oldu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, recName: string) => {
    if (!window.confirm(`"${recName}" reçetesini silmek istediğinize emin misiniz?`)) return;
    try {
      await api.recipes.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Silinemedi.');
    }
  };

  const viewDetail = async (id: string) => {
    try {
      const res = await api.recipes.get(id);
      setDetailRecipe(res?.data || null);
    } catch (err) {
      console.error(err);
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
      setExcelMsg({ type: 'error', text: 'Excel dosyası işlenirken hata: ' + (err.message || '') });
    }
  };

  const handleExecuteImport = async () => {
    if (excelPreviewData.length === 0) return;
    setExcelImporting(true);
    setExcelMsg(null);

    // Group rows by recipe name (so multiple ingredient rows merge into one recipe)
    const recipeGroups: Record<string, {
      name: string;
      category: string;
      portions: number;
      description?: string;
      instructions?: string;
      ingredients: Array<{ materialId: string; quantity: number; wastePercentage: number }>;
    }> = {};

    let missingMaterialsCount = 0;

    for (const row of excelPreviewData) {
      const recipeName = (row['Yemek Adı'] || row['Reçete Adı'] || row['Yemek'] || row['name'] || '').toString().trim();
      if (!recipeName) continue;

      if (!recipeGroups[recipeName]) {
        recipeGroups[recipeName] = {
          name: recipeName,
          category: (row['Kategori'] || row['category'] || 'Ana Yemek').toString().trim(),
          portions: parseInt(row['Standart Porsiyon'] || row['Porsiyon'] || row['portions'] || 10) || 10,
          description: (row['Açıklama'] || row['description'] || '').toString().trim() || undefined,
          instructions: (row['Pişirme Talimatı'] || row['instructions'] || '').toString().trim() || undefined,
          ingredients: []
        };
      }

      // Check ingredient
      const matName = (row['Malzeme Adı'] || row['Malzeme'] || row['material'] || '').toString().trim();
      const qty = parseFloat(row['Miktar'] || row['quantity'] || 0) || 0;
      const waste = parseFloat(row['Fire Oranı (%)'] || row['Fire'] || row['wastePercentage'] || 0) || 0;

      if (matName && qty > 0) {
        const matchedMat = materials.find(m => m.name.toLowerCase() === matName.toLowerCase());
        if (matchedMat) {
          recipeGroups[recipeName].ingredients.push({
            materialId: matchedMat.id,
            quantity: qty,
            wastePercentage: waste
          });
        } else {
          missingMaterialsCount++;
          console.warn(`Malzeme bulunamadı: ${matName}`);
        }
      }
    }

    let successCount = 0;
    let failCount = 0;

    for (const key of Object.keys(recipeGroups)) {
      const group = recipeGroups[key];
      if (group.ingredients.length === 0) {
        failCount++;
        continue;
      }

      try {
        await api.recipes.create({
          name: group.name,
          category: group.category,
          portions: group.portions,
          description: group.description,
          instructions: group.instructions,
          ingredients: group.ingredients,
        });
        successCount++;
      } catch (err) {
        console.error('Reçete ekleme hatası:', group.name, err);
        failCount++;
      }
    }

    setExcelImporting(false);
    if (successCount > 0) {
      setExcelMsg({
        type: 'success',
        text: `Başarıyla ${successCount} adet yemek reçetesi sisteme aktarıldı.${
          missingMaterialsCount > 0
            ? ` (${missingMaterialsCount} malzeme depoda bulunamadığı için atlandı)`
            : ''
        }`
      });
      loadData();
      setExcelPreviewData([]);
    } else {
      setExcelMsg({
        type: 'error',
        text: 'Reçeteler eklenemedi. Malzemelerin depoda kayıtlı olduğundan emin olun.'
      });
    }
  };

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  );

  const estimated = calculateCosts();

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reçeteler & Yemek Standartları</h1>
          <p className="text-slate-500 text-sm mt-1">Standart porsiyonlar, hammadde gramajları ve porsiyon maliyet hesapları</p>
        </div>
        {(user?.role?.name === 'admin' || user?.role?.name === 'chef') && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setIsExcelModalOpen(true);
                setExcelPreviewData([]);
                setExcelMsg(null);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition shadow-sm"
              title="Excel İle Toplu Reçete Yükleme"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel'den Yükle
            </button>
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl text-sm transition shadow-sm shadow-brand-500/20"
            >
              <Plus className="w-4 h-4" />
              Yeni Reçete Oluştur
            </button>
          </div>
        )}
      </div>

      {/* Arama & Kategoriler */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Reçete veya yemek adı ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === 'Tümü' ? '' : cat)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  (cat === 'Tümü' && !selectedCategory) || selectedCategory === cat
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

      {/* Reçeteler Grid Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Yükleniyor...</div>
        ) : filteredRecipes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
            <ChefHat className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            Henüz kayıtlı reçete bulunmuyor.
          </div>
        ) : (
          filteredRecipes.map((rec) => (
            <div key={rec.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg">
                    {rec.category}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {rec.portions} Porsiyon
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{rec.name}</h3>
                {rec.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">{rec.description}</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] text-slate-400 font-medium">Porsiyon Maliyeti</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {rec.costPerPortion ? Number(rec.costPerPortion).toFixed(2) : '-'} ₺
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => viewDetail(rec.id)}
                    className="p-2 text-slate-400 hover:text-navy-500 hover:bg-slate-100 rounded-lg transition"
                    title="İçeriği Gör"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {(user?.role?.name === 'admin' || user?.role?.name === 'chef') && (
                    <>
                      <button
                        onClick={() => openEditModal(rec)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Düzenle"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id, rec.name)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Yeni/Düzenle Reçete Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                {editingRecipe ? 'Reçeteyi Düzenle' : 'Yeni Reçete Hazırla'}
              </h3>
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

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Yemek / Reçete Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Dana Kavurma, Şehriyeli Pirinç Pilavı"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    {categories.filter(c => c !== 'Tümü').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Standart Porsiyon Sayısı</label>
                  <input
                    type="number"
                    required
                    value={portions}
                    onChange={(e) => setPortions(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Açıklama</label>
                  <input
                    type="text"
                    placeholder="Örn: Özel tereyağlı geleneksel tarif"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Malzemeler */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Reçete Malzemeleri (Gramaj & Fire)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Malzeme Ekle
                  </button>
                </div>

                <div className="space-y-2">
                  {ingredients.map((ing, i) => {
                    const selMat = materials.find(m => m.id === ing.materialId);
                    return (
                      <div key={i} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-5">
                          <select
                            required
                            value={ing.materialId}
                            onChange={(e) => handleIngredientChange(i, 'materialId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="">Malzeme seçiniz...</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.unitAbbr || 'birim'}) - {m.averageCost ? `${Number(m.averageCost).toFixed(2)} ₺` : '0 ₺'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.001"
                              required
                              placeholder="Miktar"
                              value={ing.quantity}
                              onChange={(e) => handleIngredientChange(i, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                            <span className="text-[11px] text-slate-500 font-semibold min-w-8">
                              {selMat?.unitAbbr || ''}
                            </span>
                          </div>
                        </div>
                        <div className="md:col-span-3">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Fire:</span>
                            <input
                              type="number"
                              step="1"
                              placeholder="0"
                              value={ing.wastePercentage}
                              onChange={(e) => handleIngredientChange(i, 'wastePercentage', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                            <span className="text-[11px] text-slate-500">%</span>
                          </div>
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(i)}
                            disabled={ingredients.length === 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pişirme Talimatı */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hazırlanış & Pişirme Talimatları</label>
                <textarea
                  rows={3}
                  placeholder="Pişirme adımları, ısı dereceleri vb."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Tahmini Maliyet Özeti */}
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-emerald-800 font-bold block">Depo Fiyatlarına Göre Tahmini Maliyet:</span>
                  <span className="text-emerald-600">Toplam {portions} porsiyon için yaklaşık tutar</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-emerald-700">
                    Toplam: {estimated.totalCost.toFixed(2)} ₺
                  </div>
                  <div className="text-xs font-bold text-emerald-800">
                    Porsiyon Başı: {estimated.costPerPortion.toFixed(2)} ₺
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
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
                  {isSubmitting ? 'Kaydediliyor...' : 'Reçeteyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reçete Detay Modalı */}
      {detailRecipe && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded">
                  {detailRecipe.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{detailRecipe.name}</h3>
                <p className="text-xs text-slate-500">{detailRecipe.portions} Porsiyon Standart</p>
              </div>
              <button 
                onClick={() => setDetailRecipe(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Malzeme Listesi</h4>
              <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl p-2 max-h-56 overflow-y-auto">
                {detailRecipe.ingredients?.map((ing, i) => (
                  <div key={i} className="py-2 px-2 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{ing.materialName}</span>
                    <span className="font-bold text-slate-900">
                      {ing.quantity} {ing.unitAbbr} {ing.wastePercentage ? `(%${ing.wastePercentage} fire)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {detailRecipe.instructions && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Pişirme Talimatları</h4>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl whitespace-pre-line">
                  {detailRecipe.instructions}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <div>
                <span className="text-[11px] text-slate-400 block">Porsiyon Maliyeti</span>
                <span className="text-base font-extrabold text-emerald-600">
                  {detailRecipe.costPerPortion ? Number(detailRecipe.costPerPortion).toFixed(2) : '-'} ₺
                </span>
              </div>
              <button
                onClick={() => setDetailRecipe(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel İle Reçete Yükleme Modalı */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Excel'den Toplu Yemek Reçetesi Yükle</h3>
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
                  <h4 className="text-xs font-bold text-slate-800 uppercase">1. Reçete Excel Şablonunu İndirin</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Yemek adı, porsiyon, malzeme adı, gramaj ve fire oranı sütunlarını içerir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadRecipeTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-xs"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  Şablonu İndir (.xlsx)
                </button>
              </div>

              {/* Dosya Seçim Alanı */}
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
                    Okunan Reçete Kalemleri ({excelPreviewData.length} satır)
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0">
                        <tr>
                          <th className="p-2.5">Yemek Adı</th>
                          <th className="p-2.5">Kategori</th>
                          <th className="p-2.5">Porsiyon</th>
                          <th className="p-2.5">Malzeme Adı</th>
                          <th className="p-2.5">Miktar</th>
                          <th className="p-2.5">Fire %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {excelPreviewData.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">
                              {row['Yemek Adı'] || row['Reçete Adı'] || row['name']}
                            </td>
                            <td className="p-2.5 text-slate-600">{row['Kategori'] || row['category']}</td>
                            <td className="p-2.5 text-slate-600">{row['Standart Porsiyon'] || row['Porsiyon'] || 10}</td>
                            <td className="p-2.5 font-semibold text-slate-800">
                              {row['Malzeme Adı'] || row['Malzeme'] || row['material']}
                            </td>
                            <td className="p-2.5 text-slate-600">{row['Miktar'] || 0} {row['Birim'] || ''}</td>
                            <td className="p-2.5 text-slate-600">%{row['Fire Oranı (%)'] || 0}</td>
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
                  {excelImporting ? 'Kaydediliyor...' : 'Reçeteleri Sisteme Aktar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

