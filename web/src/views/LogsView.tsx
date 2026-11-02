import React, { useState, useEffect } from 'react';
import { Shield, Clock, Search, RefreshCw, FileText } from 'lucide-react';
import { api } from '../api';
import { AuditLog } from '../types';

export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.logs.list({ page, limit: 25, action: actionFilter || undefined });
      if (res?.data) {
        setLogs(res.data.logs || res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sistem Denetim Logları</h1>
          <p className="text-slate-500 text-sm mt-1">Kullanıcı aktiviteleri, stok hareketleri ve veri değişiklik geçmişi</p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="py-4 px-6">Tarih & Saat</th>
                <th className="py-4 px-4">Kullanıcı</th>
                <th className="py-4 px-4">Eylem</th>
                <th className="py-4 px-4">Hedef</th>
                <th className="py-4 px-6">Detaylar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">Yükleniyor...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Henüz kayıtlı sistem logu bulunamadı.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      @{log.username}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-mono font-semibold rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {log.targetType}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 font-mono max-w-xs truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

