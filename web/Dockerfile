# 1. Aşama: Uygulamayı Derleme
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 2. Aşama: Nginx ile Yayınlama
FROM nginx:alpine

# Derlenen dosyaları kopyala
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx ayarını ekle
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

