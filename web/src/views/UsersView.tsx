import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit3, Trash2, Key, Check, X, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { User } from '../types';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'chef' | 'depot'>('chef');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.users.list();
      if (res?.data) setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('chef');
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.fullName);
    setEmail(u.email);
    setPassword('');
    setRole(u.role?.name || 'chef');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !fullName.trim()) {
      setError('Kullanıcı adı ve ad soyad zorunludur.');
      return;
    }

    if (!editingUser && !password.trim()) {
      setError('Yeni kullanıcı için şifre girilmelidir.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim() || `${username.trim()}@catering.local`,
        role,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      if (editingUser) {
        await api.users.update(editingUser.id, payload);
      } else {
        await api.users.create(payload);
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Kullanıcı kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    try {
      await api.users.delete(id);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Silinemedi.');
    }
  };

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Sistem Yöneticisi', color: 'bg-purple-50 text-purple-700' },
    chef: { label: 'Mutfak Şefi', color: 'bg-amber-50 text-amber-700' },
    depot: { label: 'Depo Sorumlusu', color: 'bg-blue-50 text-blue-700' },
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kullanıcı & Yetki Yönetimi</h1>
          <p className="text-slate-500 text-sm mt-1">Sistem personelleri, rol tanımları ve hesap erişimleri</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yeni Kullanıcı Ekle
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="py-4 px-6">Ad Soyad</th>
                <th className="py-4 px-4">Kullanıcı Adı</th>
                <th className="py-4 px-4">E-Posta</th>
                <th className="py-4 px-4">Rol / Yetki</th>
                <th className="py-4 px-6 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">Yükleniyor...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">Kayıtlı kullanıcı bulunamadı.</td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleBadge = roleLabels[u.role?.name] || { label: u.role?.name, color: 'bg-slate-100 text-slate-700' };
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6 font-bold text-slate-900">{u.fullName}</td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">@{u.username}</td>
                      <td className="py-4 px-4 text-slate-500 text-xs">{u.email}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Düzenle / Şifre Değiştir"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            onClick={() => handleDelete(u.id, u.fullName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Sil"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Tanımla'}
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ad Soyad</label>
                <input
                  type="text"
                  required
                  placeholder="Ahmet Yılmaz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kullanıcı Adı</label>
                <input
                  type="text"
                  required
                  placeholder="ahmetyilmaz"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-Posta</label>
                <input
                  type="email"
                  placeholder="ahmet@catering.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {editingUser ? 'Yeni Şifre (Değiştirmeyecekseniz boş bırakın)' : 'Şifre *'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Yetki Rolü</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                >
                  <option value="admin">Sistem Yöneticisi (Admin - Tam Yetki)</option>
                  <option value="chef">Mutfak Şefi (Reçete, Menü, Üretim)</option>
                  <option value="depot">Depo Sorumlusu (Malzeme, Fatura, Stok)</option>
                </select>
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

