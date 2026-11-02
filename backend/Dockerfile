FROM node:20-alpine

WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm install

# Uygulama kodunu kopyala
COPY . .

# Port'u dışarı aç
EXPOSE 3000

# Uygulamayı başlat
CMD ["npm", "start"]

