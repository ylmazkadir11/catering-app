#!/bin/bash
# ================================================================
# CATERING YÖNETİM SİSTEMİ - TEK KOMUTLA VPS KURULUM SCRIPTI
# ================================================================

set -e

echo "🚀 Catering Yönetim Sistemi Kurulumu Başlatılıyor..."

# 1. Docker yüklü mü kontrol et, değilse kur
if ! command -v docker &> /dev/null; then
    echo "📦 Docker bulunamadı, kuruluyor..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker başarıyla kuruldu."
else
    echo "✅ Docker zaten kurulu."
fi

# 2. .env dosyasını kontrol et
if [ ! -f .env ]; then
    echo "⚙️ .env dosyası bulunamadı, .env.production.example üzerinden oluşturuluyor..."
    cp .env.production.example .env
    # Rastgele JWT_SECRET oluştur
    RANDOM_JWT=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
    sed -i "s/catering_super_secret_jwt_key_2026_xyz123_change_me/$RANDOM_JWT/" .env
    echo "✅ .env dosyası güvenli rastgele anahtar ile oluşturuldu."
fi

# 3. Docker Compose konteynerlerini derle ve ayağa kaldır
echo "🐳 Docker konteynerleri derleniyor ve başlatılıyor..."
docker compose down || true
docker compose up -d --build

echo ""
echo "🎉 TEBRİKLER! Catering Yönetim Sistemi Başarıyla Yayınlandı!"
echo "--------------------------------------------------------"
echo "🌐 Web Siteniz: http://$(curl -s ifconfig.me || echo 'SUNUCU_IP')"
echo "🔑 Varsayılan Giriş Bilgileri:"
echo "   - Admin: Kullanıcı adı: admin | Şifre: admin123"
echo "   - Şef:   Kullanıcı adı: chef  | Şifre: chef123"
echo "   - Depo:  Kullanıcı adı: depo  | Şifre: depo123"
echo "--------------------------------------------------------"
echo "Logları izlemek için: docker compose logs -f"

