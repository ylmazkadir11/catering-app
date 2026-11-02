import React, { useState, useEffect } from 'react';
import { Ruler, Plus, Edit3, Trash2, X, AlertCircle } from 'lucide-react';
import { api } from '../api';
import { Unit } from '../types';
import { useAuth } from '../context/AuthContext';

export const UnitsView: React.FC = () => {
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    setIsLoading(true);
    try {
      const res = await api.units.list();
      if (res?.data) setUnits(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = () => {
    setEditingUnit(null);
    setName('');
    setAbbreviation('');
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (u: Unit) => {
    setEditingUnit(u);
    setName(u.name);
    setAbbreviation(u.abbreviation);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !abbreviation.trim()) {
      setError('Birim adı ve kısaltması zorunludur.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUnit) {
        await api.units.update(editingUnit.id, { name: name.trim(), abbreviation: abbreviation.trim() });
      } else {
        await api.units.create({ name: name.trim(), abbreviation: abbreviation.trim() });
      }
      setIsModalOpen(false);
      loadUnits();
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, uName: string) => {
    if (!window.confirm(`"${uName}" birimini silmek istediğinize emin misiniz?`)) return;
    try {
      await api.units.delete(id);
      loadUnits();
    } catch (err: any) {
      alert(err.message || 'Silinemedi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ölçü Birimleri</h1>
          <p className="text-slate-500 text-sm mt-1">Malzeme ve reçetelerde kullanılan ağırlık, hacim ve adet tanımları</p>
        </div>
        {(user?.role?.name === 'admin' || user?.role?.name === 'depot') && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni Birim Ekle
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-w-2xl">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-100">
            <tr>
              <th className="py-4 px-6">Birim Adı</th>
              <th className="py-4 px-4">Kısaltma</th>
              <th className="py-4 px-6 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-slate-400">Yükleniyor...</td>
              </tr>
            ) : units.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-slate-400">Kayıtlı birim bulunamadı.</td>
              </tr>
            ) : (
              units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-4 px-6 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono font-bold text-xs rounded-lg">
                      {u.abbreviation}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right space-x-1">
                    {(user?.role?.name === 'admin' || user?.role?.name === 'depot') && (
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {user?.role?.name === 'admin' && (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUnit ? 'Birimi Düzenle' : 'Yeni Ölçü Birimi'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Birim Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kilogram, Adet, Porsiyon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kısaltma</label>
                <input
                  type="text"
                  required
                  placeholder="kg, ad, pors"
                  value={abbreviation}
                  onChange={(e) => setAbbreviation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
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
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

