import React, { useState } from 'react';
import { Utensils, Lock, User, ArrowRight, Shield, ChefHat, Boxes, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuick = async (role: 'admin' | 'chef' | 'depo') => {
    setError('');
    setIsLoading(true);
    try {
      await quickLogin(role);
    } catch (err: any) {
      setError(err.message || 'Hızlı giriş yapılamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-navy-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Logo & Başlık */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-brand-500/25">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">CateringPro</h1>
          <p className="text-sm text-slate-400">
            Restoran & Kurumsal Mutfak Yönetim Platformu
          </p>
        </div>

        {/* Form Kartı */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hesabınıza Giriş Yapın</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sisteme erişmek için kullanıcı bilgilerinizi giriniz</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Kullanıcı Adı veya E-Posta
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="admin veya chef"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Hızlı Giriş Butonları */}
          <div className="pt-4 border-t border-slate-100">
            <span className="block text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              ⚡ Hızlı Test & Demo Girişi
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuick('admin')}
                disabled={isLoading}
                className="p-2.5 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-100 rounded-xl text-center transition group"
              >
                <Shield className="w-4 h-4 text-purple-600 mx-auto mb-1 group-hover:scale-110 transition" />
                <span className="block text-[11px] font-bold text-slate-800">Admin</span>
                <span className="block text-[9px] text-slate-400">admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('chef')}
                disabled={isLoading}
                className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-100 rounded-xl text-center transition group"
              >
                <ChefHat className="w-4 h-4 text-amber-600 mx-auto mb-1 group-hover:scale-110 transition" />
                <span className="block text-[11px] font-bold text-slate-800">Şef</span>
                <span className="block text-[9px] text-slate-400">chef123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('depo')}
                disabled={isLoading}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-100 rounded-xl text-center transition group"
              >
                <Boxes className="w-4 h-4 text-blue-600 mx-auto mb-1 group-hover:scale-110 transition" />
                <span className="block text-[11px] font-bold text-slate-800">Depo</span>
                <span className="block text-[9px] text-slate-400">depo123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

