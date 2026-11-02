/**
 * Ana Sunucu Dosyası
 * ====================
 * Express.js uygulamasını başlatır, middleware'leri ve route'ları yapılandırır.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { startScheduler } = require('./utils/scheduler');

// Route'ları import et
const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
const unitsRoutes        = require('./routes/units');
const materialsRoutes    = require('./routes/materials');
const invoicesRoutes     = require('./routes/invoices');
const recipesRoutes      = require('./routes/recipes');
const menusRoutes        = require('./routes/menus');
const productionsRoutes  = require('./routes/productions');
const reportsRoutes      = require('./routes/reports');
const logsRoutes         = require('./routes/logs');
const notificationsRoutes = require('./routes/notifications');
const dashboardRoutes    = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// GLOBAL MIDDLEWARE'LER
// ─────────────────────────────────────────────

// Güvenlik header'ları
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS - React Native uygulaması için
app.use(cors({
  origin: '*', // Prodüksiyonda kısıtla
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// HTTP request logger (geliştirme ortamı)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// JSON body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Özel request logger
app.use(requestLogger);

// ─────────────────────────────────────────────
// ROUTE'LAR
// ─────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/units',         unitsRoutes);
app.use('/api/materials',     materialsRoutes);
app.use('/api/invoices',      invoicesRoutes);
app.use('/api/recipes',       recipesRoutes);
app.use('/api/menus',         menusRoutes);
app.use('/api/productions',   productionsRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/logs',          logsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard',     dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (en sonda olmalı)
app.use(errorHandler);

// ─────────────────────────────────────────────
// SUNUCUYU BAŞLAT
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Catering API Sunucusu başlatıldı`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Ortam: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);

  // Zamanlanmış görevleri başlat
  startScheduler();
});

module.exports = app;

