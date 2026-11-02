# 🚀 VPS Sunucusuna Kurulum & Yayınlama Rehberi

Bu rehber, **Catering Yönetim Sistemi**'ni herhangi bir Linux VPS sunucusuna (Hetzner, DigitalOcean, Linode, AWS EC2, vb.) kurup yayınlamanız için hazırlanmıştır.

---

## 📋 Gereksinimler
- **1 adet Linux VPS:** Ubuntu 22.04 veya 24.04 LTS (Minimum 1 GB RAM, önerilen 2 GB RAM).
- Bir alan adı (domain) - *Opsiyonel, doğrudan sunucu IP'si üzerinden de çalışır.*

---

## 🛠️ Adım Adım Kurulum

### 1. Sunucunuza SSH ile Bağlanın
Kendi bilgisayarınızdan terminali açın:
```bash
ssh root@SUNUCU_IP_ADRESI
```

---

### 2. Proje Dosyalarını Sunucuya Yükleyin

#### Yöntem A: Git ile (Önerilen)
Kendi GitHub/GitLab reponuz varsa:
```bash
git clone <REPO_LINKINIZ> catering-app
cd catering-app
```

#### Yöntem B: Kendi Bilgisayarınızdan Sunucuya Kopyalama (SCP)
Bilgisayarınızın terminalinden:
```bash
scp -r /home/kadir/Masaüstü/VS-CODE/catering-app root@SUNUCU_IP_ADRESI:/root/
```
Ardından sunucuda dizine girin:
```bash
cd /root/catering-app
```

---

### 3. Tek Komutla Kurulumu Başlatın ⚡
Projeye eklediğimiz otomatik kurulum scriptini çalıştırın:

```bash
chmod +x deploy.sh
./deploy.sh
```

Bu script sırasıyla:
1. Sunucuda Docker yoksa resmi Docker'ı kurar ve başlatır.
2. `.env` dosyasını oluşturur ve güvenli bir `JWT_SECRET` üretir.
3. PostgreSQL veritabanını, Backend API'sini ve React Web Frontend'ini (Nginx ile) ayağa kaldırır.
4. Veritabanı tablolarını ve varsayılan kullanıcıları otomatik yükler.

---

### 4. Tarayıcınızdan Açın! 🎉

Kurulum bittiğinde ekrana sunucu IP adresiniz gelecektir. Tarayıcınızdan:

👉 `http://SUNUCU_IP_ADRESI`

adresine gittiğinizde web siteniz canlı olarak açılacaktır!

**Giriş Bilgileri:**
- **Admin:** `admin` / `admin123`
- **Şef:** `chef` / `chef123`
- **Depo:** `depo` / `depo123`

---

## 🔒 Domain ve Ücretsiz SSL (HTTPS) Kurulumu (Opsiyonel)

Kendi alan adınızı (örneğin `catering.siteniz.com`) bağlamak ve `https://` yeşil kilit almak için:

1. Alan adı DNS yönetiminizden bir **A Kaydı** ekleyin:
   - Ad: `catering` (veya `@`)
   - Değer: `SUNUCU_IP_ADRESI`
2. Sunucuda Certbot kurup SSL alın:
   ```bash
   apt install -y certbot
   certbot certonly --standalone -d catering.siteniz.com
   ```
   *(Veya Cloudflare kullanıyorsanız "Flexible SSL" açarak tek tıkla HTTPS yapabilirsiniz).*

---

## ⚙️ Faydalı Komutlar

- **Logları canlı izleme:** `docker compose logs -f`
- **Sistemi durdurma:** `docker compose down`
- **Sistemi yeniden başlatma:** `docker compose restart`
- **Kod güncellendiğinde yeniden derleme:** `docker compose up -d --build`

