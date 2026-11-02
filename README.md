# 🍽️ Catering Yönetim Sistemi

Restoran ve kurumsal mutfaklar için geliştirilmiş kapsamlı **Catering Yönetim Sistemi** mobil uygulaması.

---

## 📱 Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Web Frontend** | React 18 + Vite + Tailwind CSS + Lucide Icons |
| **Mobil Frontend** | React Native + Expo (SDK 51) |
| **Backend** | Node.js + Express.js |
| **Veritabanı** | PostgreSQL 16 |
| **Auth** | JWT + Role-based Access Control |
| **Bildirimler** | Firebase Cloud Messaging |
| **Export** | PDF (pdfkit) + Excel (exceljs) |
| **State Yönetimi** | Redux Toolkit + RTK Query |
| **Container** | Docker + Docker Compose |

---

## 👥 Kullanıcı Rolleri

| Rol | Yetkiler |
|-----|----------|
| **Admin** | Tüm yetkiler: kullanıcı yönetimi, sistem ayarları, raporlar, log görüntüleme |
| **Şef (Chef)** | Reçete, menü planlama, üretim yönetimi, raporlar |
| **Depo (Depot)** | Malzeme, fatura, stok yönetimi, raporlar |

---

## 🚀 Kurulum

### Ön Gereksinimler
- Node.js 20+
- Docker & Docker Compose
- Expo CLI (`npm install -g expo-cli`)
- PostgreSQL 16 (veya Docker)

### 1. Veritabanı & Backend (Docker ile)

```bash
cd catering-app

# .env dosyasını oluştur
cp backend/.env.example backend/.env
# .env dosyasını düzenle (JWT_SECRET, Firebase credentials vb.)

# Docker ile başlat
docker-compose up -d

# Log kontrol
docker-compose logs -f backend
```

### 2. Web Uygulaması (React + Vite)

```bash
cd catering-app/web

# Bağımlılıklar (ilk seferde kurulduysa atlayabilirsiniz)
npm install

# Geliştirme sunucusunu başlat
npm run dev
# Tarayıcıda http://localhost:5173 adresini açın
```

### 3. Backend (Manuel - Docker harici alternatif)

```bash
cd catering-app/backend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env
# .env'i düzenle

# Veritabanı migration
npm run migrate

# Geliştirme sunucusunu başlat
npm run dev
```

### 3. Mobile (React Native / Expo)

```bash
cd catering-app/mobile

# Bağımlılıkları yükle
npm install

# API URL'ini güncelle (src/services/api.ts)
# BASE_URL = 'http://YOUR_IP:3000/api'

# Expo başlat
npx expo start

# Android
npx expo start --android

# iOS
npx expo start --ios
```

---

## 📁 Proje Yapısı

```
catering-app/
├── backend/                    # Node.js + Express API
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # PostgreSQL şeması
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     # PostgreSQL bağlantısı
│   │   │   └── firebase.js     # FCM yapılandırması
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT doğrulama
│   │   │   ├── logger.js       # İşlem loglama
│   │   │   └── errorHandler.js # Hata yönetimi
│   │   ├── routes/
│   │   │   ├── auth.js         # Kimlik doğrulama
│   │   │   ├── users.js        # Kullanıcı yönetimi
│   │   │   ├── units.js        # Birim yönetimi
│   │   │   ├── materials.js    # Malzeme yönetimi
│   │   │   ├── invoices.js     # Fatura yönetimi
│   │   │   ├── recipes.js      # Reçete yönetimi
│   │   │   ├── menus.js        # Menü planlama
│   │   │   ├── productions.js  # Üretim modülü
│   │   │   ├── reports.js      # Raporlar
│   │   │   ├── logs.js         # Log görüntüleme
│   │   │   ├── notifications.js # Bildirimler
│   │   │   └── dashboard.js    # Dashboard
│   │   ├── services/
│   │   │   ├── notificationService.js  # FCM bildirimleri
│   │   │   └── reportService.js        # PDF/Excel export
│   │   ├── utils/
│   │   │   ├── fifo.js         # FIFO stok çıkışı
│   │   │   ├── migrate.js      # DB migration
│   │   │   └── scheduler.js    # Cron görevler
│   │   └── server.js           # Ana sunucu
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── mobile/                     # React Native + Expo
│   ├── src/
│   │   ├── types/index.ts      # TypeScript tipleri
│   │   ├── services/api.ts     # RTK Query API
│   │   ├── store/
│   │   │   ├── index.ts        # Redux store
│   │   │   └── authSlice.ts    # Auth state
│   │   ├── navigation/
│   │   │   ├── AppNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   ├── AdminNavigator.tsx
│   │   │   ├── ChefNavigator.tsx
│   │   │   └── DepotNavigator.tsx
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   └── LoginScreen.tsx
│   │   │   ├── shared/
│   │   │   │   ├── DashboardScreen.tsx
│   │   │   │   ├── MaterialsScreen.tsx
│   │   │   │   ├── MaterialFormScreen.tsx
│   │   │   │   ├── MaterialDetailScreen.tsx
│   │   │   │   ├── UnitsScreen.tsx
│   │   │   │   ├── ProductionScreen.tsx
│   │   │   │   └── ReportsScreen.tsx
│   │   │   ├── admin/
│   │   │   │   ├── UsersScreen.tsx
│   │   │   │   ├── UserFormScreen.tsx
│   │   │   │   └── LogsScreen.tsx
│   │   │   ├── chef/
│   │   │   │   ├── RecipesScreen.tsx
│   │   │   │   ├── RecipeFormScreen.tsx
│   │   │   │   ├── MenuPlanningScreen.tsx
│   │   │   │   └── MenuItemFormScreen.tsx
│   │   │   └── depot/
│   │   │       ├── InvoicesScreen.tsx
│   │   │       └── InvoiceFormScreen.tsx
│   │   ├── components/common/
│   │   │   ├── StockStatusBadge.tsx
│   │   │   ├── LoadingOverlay.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── SearchableDropdown.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useNotifications.ts
│   │   └── utils/
│   │       ├── fileDownload.ts
│   │       └── formatters.ts
│   ├── App.tsx
│   ├── app.json
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🗃️ Veritabanı Tabloları

| Tablo | Açıklama |
|-------|---------|
| `roles` | Kullanıcı rolleri (admin, chef, depot) |
| `users` | Sistem kullanıcıları |
| `units` | Ölçü birimleri (gr, ml, adet...) |
| `materials` | Malzeme kataloğu |
| `invoices` | Giriş faturaları |
| `batches` | Malzeme partileri (FIFO için) |
| `recipes` | Yemek reçeteleri |
| `recipe_items` | Reçete malzeme kalemleri (kişi başı) |
| `menus` | Günlük menüler |
| `menu_items` | Menü yemek kalemleri |
| `productions` | Üretim kayıtları |
| `production_items` | Üretim malzeme kullanımı |
| `stock_movements` | Stok giriş/çıkış hareketleri |
| `logs` | Sistem işlem logları |
| `notifications` | Kullanıcı bildirimleri |

---

## 📊 API Endpoint'leri

### Auth
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
PUT  /api/auth/me
PUT  /api/auth/change-password
PUT  /api/auth/fcm-token
```

### Malzemeler
```
GET    /api/materials
POST   /api/materials
GET    /api/materials/:id
PUT    /api/materials/:id
DELETE /api/materials/:id
GET    /api/materials/:id/batches
GET    /api/materials/:id/movements
```

### Üretim (FIFO + Menü Kontrolü)
```
POST /api/productions/calculate   # Stok düşmez, hesapla
POST /api/productions             # Taslak oluştur
PUT  /api/productions/:id         # Güncelle (draft)
POST /api/productions/:id/confirm # Onayla → FIFO stok düş
POST /api/productions/:id/cancel  # İptal
GET  /api/productions/:id/report  # PDF/Excel rapor
```

### Raporlar
```
GET /api/reports/daily-materials
GET /api/reports/material-consumption
GET /api/reports/meal-cost
GET /api/reports/per-person-cost
GET /api/reports/monthly-expense
```

---

## 🔐 Güvenlik Kuralları

1. ✅ Tüm işlemler `logs` tablosuna kaydedilir
2. ✅ Menü onaylanmadan **stok düşümü yapılamaz**
3. ✅ Üretim onaylanmadan **stok düşümü yapılamaz**
4. ✅ FIFO prensibi tüm stok çıkışlarında geçerlidir
5. ✅ Manuel düzeltmeler de log'a düşer

---

## ⚠️ Uyarı Sistemi (Otomatik)

| Durum | Bildirim |
|-------|---------|
| Stok kritik seviyenin altı | FCM + Dashboard uyarısı |
| Son kullanma tarihi ≤ 30 gün | FCM + Dashboard uyarısı |
| Üretim yapılmış, rapor alınmamış | Gece 23:00 otomatik bildirim |

---

## 📅 Menü Yapısı

| Öğün | Türkçe | Max Yemek |
|------|--------|-----------|
| `breakfast` | Sabah | 5 |
| `lunch` | Öğle | 5 |
| `dinner` | Akşam | 5 |
| `snack` | Ara Öğün | 3 |

