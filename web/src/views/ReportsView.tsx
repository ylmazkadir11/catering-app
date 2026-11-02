import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  FileSpreadsheet, 
  Layers,
  Search
} from 'lucide-react';
import { api } from '../api';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<'daily' | 'consumption' | 'mealCost' | 'perPerson' | 'monthly'>('daily');
  
  // Filters
  const today = new Date().toISOString().split('T')[0];
  const [singleDate, setSingleDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [reportType, singleDate, startDate, endDate, selectedYear, selectedMonth]);

  const loadReport = async () => {
    setIsLoading(true);
    setReportData(null);
    try {
      let res;
      if (reportType === 'daily') {
        res = await api.reports.dailyMaterials(singleDate);
      } else if (reportType === 'consumption') {
        res = await api.reports.materialConsumption(startDate, endDate);
      } else if (reportType === 'mealCost') {
        res = await api.reports.mealCost(startDate, endDate);
      } else if (reportType === 'perPerson') {
        res = await api.reports.perPersonCost(startDate, endDate);
      } else if (reportType === 'monthly') {
        res = await api.reports.monthlyExpense(selectedYear, selectedMonth);
      }
      if (res?.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Rapor yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'excel') => {
    setDownloadingFormat(format);
    try {
      let endpoint = '';
      let filename = `rapor-${reportType}-${Date.now()}`;

      if (reportType === 'daily') {
        endpoint = `/reports/daily-materials?date=${singleDate}&format=${format}`;
        filename = `gunluk-malzeme-${singleDate}`;
      } else if (reportType === 'consumption') {
        endpoint = `/reports/material-consumption?startDate=${startDate}&endDate=${endDate}&format=${format}`;
        filename = `malzeme-tuketimi-${startDate}_${endDate}`;
      } else if (reportType === 'mealCost') {
        endpoint = `/reports/meal-cost?startDate=${startDate}&endDate=${endDate}&format=${format}`;
        filename = `yemek-maliyeti-${startDate}_${endDate}`;
      } else if (reportType === 'perPerson') {
        endpoint = `/reports/per-person-cost?startDate=${startDate}&endDate=${endDate}&format=${format}`;
        filename = `kisi-basi-maliyet-${startDate}_${endDate}`;
      } else if (reportType === 'monthly') {
        endpoint = `/reports/monthly-expense?year=${selectedYear}&month=${selectedMonth}&format=${format}`;
        filename = `aylik-gider-${selectedYear}-${selectedMonth}`;
      }

      await api.reports.downloadFile(endpoint, `${filename}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
    } catch (err: any) {
      alert(err.message || 'İndirme başarısız oldu.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const reportTabs = [
    { id: 'daily', label: 'Günlük Malzeme' },
    { id: 'consumption', label: 'Dönemsel Tüketim' },
    { id: 'mealCost', label: 'Yemek Maliyetleri' },
    { id: 'perPerson', label: 'Kişi Başı Maliyet' },
    { id: 'monthly', label: 'Aylık Toplam Gider' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Başlık & İndirme Butonları */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Raporlar & Maliyet Analizi</h1>
          <p className="text-slate-500 text-sm mt-1">Hammadde tüketimi, yemek ve kişi başı maliyetler, PDF ve Excel çıktıları</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloadingFormat !== null}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            {downloadingFormat === 'pdf' ? 'İndiriliyor...' : 'PDF İndir'}
          </button>
          <button
            onClick={() => handleDownload('excel')}
            disabled={downloadingFormat !== null}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {downloadingFormat === 'excel' ? 'İndiriliyor...' : 'Excel İndir'}
          </button>
        </div>
      </div>

      {/* Rapor Türü Tabları */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-1">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              reportType === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tarih ve Parametre Filtreleri */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        {reportType === 'daily' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Seçili Tarih:</span>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        )}

        {(reportType === 'consumption' || reportType === 'mealCost' || reportType === 'perPerson') && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Başlangıç:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Bitiş:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
        )}

        {reportType === 'monthly' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Yıl:</span>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Ay:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2026, m - 1).toLocaleString('tr-TR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Rapor Veri Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Rapor hazırlanıyor...</div>
        ) : !reportData ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            Seçilen kriterlere uygun veri bulunamadı.
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Günlük Malzeme Raporu */}
            {reportType === 'daily' && (
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-3">
                  {singleDate} Tarihinde Tüketilen Malzemeler
                </h3>
                {Array.isArray(reportData) && reportData.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                      <tr>
                        <th className="p-3">Malzeme</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Tüketilen Miktar</th>
                        <th className="p-3 text-right">Toplam Maliyet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map((row: any, i: number) => (
                        <tr key={i}>
                          <td className="p-3 font-semibold text-slate-900">{row.materialName}</td>
                          <td className="p-3 text-slate-500">{row.category}</td>
                          <td className="p-3 font-bold text-slate-800">{row.totalQuantity} {row.unitAbbr}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{Number(row.totalCost || 0).toFixed(2)} ₺</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">Bu tarihte herhangi bir üretim/malzeme tüketimi gerçekleşmemiş.</p>
                )}
              </div>
            )}

            {/* 2. Malzeme Tüketim Raporu */}
            {reportType === 'consumption' && (
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-3">
                  {startDate} - {endDate} Arası Malzeme Tüketim Dökümü
                </h3>
                {Array.isArray(reportData) && reportData.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                      <tr>
                        <th className="p-3">Malzeme</th>
                        <th className="p-3">Toplam Miktar</th>
                        <th className="p-3 text-right">Toplam Maliyet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map((row: any, i: number) => (
                        <tr key={i}>
                          <td className="p-3 font-semibold text-slate-900">{row.materialName}</td>
                          <td className="p-3 font-bold text-slate-800">{row.totalQuantity} {row.unitAbbr}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{Number(row.totalCost || 0).toFixed(2)} ₺</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">Seçilen aralıkta tüketim verisi bulunmuyor.</p>
                )}
              </div>
            )}

            {/* 3. Yemek Maliyet Raporu */}
            {reportType === 'mealCost' && (
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-3">
                  Yemek Bazlı Üretim ve Maliyet İstatistiği
                </h3>
                {Array.isArray(reportData) && reportData.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                      <tr>
                        <th className="p-3">Yemek Adı</th>
                        <th className="p-3">Toplam Üretilen Porsiyon</th>
                        <th className="p-3">Toplam Maliyet</th>
                        <th className="p-3 text-right">Ortalama Porsiyon Maliyeti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map((row: any, i: number) => (
                        <tr key={i}>
                          <td className="p-3 font-semibold text-slate-900">{row.recipeName}</td>
                          <td className="p-3 font-bold text-slate-800">{row.totalPortions} Porsiyon</td>
                          <td className="p-3 text-slate-700">{Number(row.totalCost || 0).toFixed(2)} ₺</td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            {Number(row.avgCostPerPortion || 0).toFixed(2)} ₺
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">Veri bulunmuyor.</p>
                )}
              </div>
            )}

            {/* 4. Kişi Başı Maliyet Raporu */}
            {reportType === 'perPerson' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-semibold block">Toplam Üretim</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">
                      {reportData.totalPortions || 0} Kişi
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-semibold block">Toplam Maliyet</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">
                      {Number(reportData.totalCost || 0).toFixed(2)} ₺
                    </span>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-xs text-emerald-700 font-semibold block">Kişi Başı Ortalama</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block">
                      {Number(reportData.costPerPerson || 0).toFixed(2)} ₺
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Aylık Gider Özeti */}
            {reportType === 'monthly' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-semibold block">Dönem Fatura Girişleri</span>
                    <span className="text-3xl font-black text-slate-900 mt-2 block">
                      {Number(reportData.totalPurchases || 0).toFixed(2)} ₺
                    </span>
                    <p className="text-xs text-slate-400 mt-1">Alınan hammadde toplamı</p>
                  </div>
                  <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-xs text-emerald-800 font-semibold block">Fiili Mutfak Tüketim Gideri</span>
                    <span className="text-3xl font-black text-emerald-600 mt-2 block">
                      {Number(reportData.totalConsumption || 0).toFixed(2)} ₺
                    </span>
                    <p className="text-xs text-emerald-700/80 mt-1">Yemeklerde kullanılan malzeme maliyeti</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

