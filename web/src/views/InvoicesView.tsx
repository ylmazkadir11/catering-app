import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Eye, 
  Calendar, 
  DollarSign, 
  Building2, 
  X,
  PackagePlus,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { Invoice, Material } from '../types';
import { useAuth } from '../context/AuthContext';

export const InvoicesView: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Invoice Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([
    { materialId: '', batchNumber: '', expiryDate: '', quantity: '', unitPrice: '', vatRate: '1' }
  ]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const [invRes, matRes] = await Promise.all([
        api.invoices.list(),
        api.materials.list(),
      ]);
      if (invRes?.data) setInvoices(invRes.data);
      if (matRes?.data) setMaterials(matRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItemRow = () => {
    setItems([
      ...items,
      { materialId: '', batchNumber: '', expiryDate: '', quantity: '', unitPrice: '', vatRate: '1' }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    
    // Auto-fill batch number if empty when material changes
    if (field === 'materialId' && !updated[index].batchNumber) {
      const selMat = materials.find(m => m.id === value);
      const prefix = selMat ? selMat.name.substring(0, 3).toUpperCase() : 'LOT';
      const year = new Date().getFullYear();
      const rand = Math.floor(100 + Math.random() * 900);
      updated[index].batchNumber = `${prefix}-${year}-${rand}`;
    }

    setItems(updated);
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let vatTotal = 0;

    items.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const vat = parseFloat(item.vatRate) || 0;
      const rowNet = qty * price;
      const rowVat = (rowNet * vat) / 100;
      subtotal += rowNet;
      vatTotal += rowVat;
    });

    return {
      subtotal,
      vatTotal,
      grandTotal: subtotal + vatTotal
    };
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!supplier.trim() || !invoiceNumber.trim()) {
      setFormError('Tedarikçi ve fatura numarası zorunludur.');
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.materialId || !item.quantity || !item.unitPrice || !item.batchNumber || !item.expiryDate) {
        setFormError('Lütfen tüm fatura kalemlerindeki zorunlu alanları (Malzeme, Parti No, Miktar, Fiyat, SKT) eksiksiz doldurun.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        supplier: supplier.trim(),
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        notes: notes.trim() || undefined,
        items: items.map(item => ({
          materialId: item.materialId,
          batchNumber: item.batchNumber.trim(),
          expiryDate: item.expiryDate,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          vatRate: parseFloat(item.vatRate) || 0,
        }))
      };

      await api.invoices.create(payload);
      setIsModalOpen(false);
      // Reset form
      setSupplier('');
      setInvoiceNumber('');
      setNotes('');
      setItems([{ materialId: '', batchNumber: '', expiryDate: '', quantity: '', unitPrice: '', vatRate: '1' }]);
      loadInvoices();
    } catch (err: any) {
      setFormError(err.message || 'Fatura kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (id: string, num: string) => {
    if (!window.confirm(`"${num}" numaralı faturayı iptal edip silmek istediğinize emin misiniz? (İlgili stok girişleri geri alınacaktır)`)) return;
    try {
      await api.invoices.delete(id);
      loadInvoices();
    } catch (err: any) {
      alert(err.message || 'Fatura silinemedi.');
    }
  };

  const viewInvoiceDetail = async (id: string) => {
    try {
      const res = await api.invoices.get(id);
      setSelectedInvoice(res?.data || null);
    } catch (err) {
      console.error(err);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alış Faturaları & Stok Girişi</h1>
          <p className="text-slate-500 text-sm mt-1">Tedarikçi faturaları kaydı, otomatik parti ve stok oluşturma</p>
        </div>
        {(user?.role?.name === 'admin' || user?.role?.name === 'depot') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl text-sm transition shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            Yeni Fatura Girişi
          </button>
        )}
      </div>

      {/* Fatura Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="py-4 px-6">Fatura No</th>
                <th className="py-4 px-4">Tedarikçi</th>
                <th className="py-4 px-4">Tarih</th>
                <th className="py-4 px-4">Kalem</th>
                <th className="py-4 px-4">Toplam Tutar</th>
                <th className="py-4 px-6 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">Yükleniyor...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    Henüz kayıtlı fatura bulunmuyor.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-800">
                      {inv.supplier}
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      {new Date(inv.invoiceDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                        {inv.itemCount || (inv.items ? inv.items.length : '-')} Kalem
                      </span>
                    </td>
                    <td className="py-4 px-4 font-extrabold text-emerald-600 text-base">
                      {Number(inv.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="py-4 px-6 text-right space-x-1">
                      <button
                        onClick={() => viewInvoiceDetail(inv.id)}
                        className="p-2 text-slate-500 hover:text-navy-500 hover:bg-slate-100 rounded-lg transition"
                        title="Detayı Gör"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {user?.role?.name === 'admin' && (
                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Faturayı İptal Et / Sil"
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
      </div>

      {/* Yeni Fatura Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Yeni Alış Faturası Girişi</h3>
                <p className="text-xs text-slate-500">Fatura kalemleri kaydedildiğinde ilgili malzemelerin stokları otomatik artacaktır.</p>
              </div>
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

            <form onSubmit={handleSubmitInvoice} className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Üst Bilgiler */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tedarikçi Firma *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Özgıda A.Ş., Metro Market"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fatura Numarası *</label>
                  <input
                    type="text"
                    required
                    placeholder="GIB20260000001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fatura Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Kalemler */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Fatura Kalemleri</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Kalem Ekle
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const selMat = materials.find(m => m.id === item.materialId);
                    const rowNet = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                    const rowVat = (rowNet * (parseFloat(item.vatRate) || 0)) / 100;
                    const rowTotal = rowNet + rowVat;

                    return (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Malzeme</label>
                          <select
                            required
                            value={item.materialId}
                            onChange={(e) => handleItemChange(idx, 'materialId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="">Seçiniz...</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.unitAbbr || 'birim'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Parti / Lot No</label>
                          <input
                            type="text"
                            required
                            placeholder="LOT-2026-01"
                            value={item.batchNumber}
                            onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">SKT</label>
                          <input
                            type="date"
                            required
                            value={item.expiryDate}
                            onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Miktar {selMat?.unitAbbr ? `(${selMat.unitAbbr})` : ''}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">B. Fiyat (₺)</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">KDV %</label>
                          <select
                            value={item.vatRate}
                            onChange={(e) => handleItemChange(idx, 'vatRate', e.target.value)}
                            className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="0">%0</option>
                            <option value="1">%1</option>
                            <option value="10">%10</option>
                            <option value="20">%20</option>
                          </select>
                        </div>

                        <div className="md:col-span-1 text-right">
                          <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Tutar</span>
                          <span className="text-xs font-bold text-slate-800">
                            {rowTotal.toFixed(2)} ₺
                          </span>
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={items.length === 1}
                            className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fatura Alt Toplam Özeti */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-slate-400">
                  Toplam {items.length} kalem malzeme girişi yapılacak.
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <span className="block text-[11px] text-slate-400">Ara Toplam</span>
                    <span className="text-sm font-semibold">{totals.subtotal.toFixed(2)} ₺</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">KDV Toplamı</span>
                    <span className="text-sm font-semibold text-amber-400">+{totals.vatTotal.toFixed(2)} ₺</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Genel Toplam</span>
                    <span className="text-lg font-extrabold text-emerald-400">{totals.grandTotal.toFixed(2)} ₺</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-sm shadow-brand-500/20"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Faturayı ve Stokları Onayla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fatura Detay Modalı */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Fatura: {selectedInvoice.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedInvoice.supplier} • {new Date(selectedInvoice.invoiceDate).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Malzeme</th>
                    <th className="p-3">Parti No</th>
                    <th className="p-3">Miktar</th>
                    <th className="p-3">B. Fiyat</th>
                    <th className="p-3">KDV</th>
                    <th className="p-3 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items?.map((it, i) => (
                    <tr key={i}>
                      <td className="p-3 font-semibold text-slate-900">{it.materialName || 'Malzeme'}</td>
                      <td className="p-3 text-slate-600">{it.batchNumber}</td>
                      <td className="p-3 font-bold text-slate-800">{it.quantity}</td>
                      <td className="p-3">{it.unitPrice} ₺</td>
                      <td className="p-3">%{it.vatRate}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {it.totalPrice || (it.quantity * it.unitPrice).toFixed(2)} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Toplam Tutar: <span className="text-base font-extrabold text-emerald-600">{Number(selectedInvoice.totalAmount).toFixed(2)} ₺</span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
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

