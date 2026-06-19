'use strict';

require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { connectDB } = require('./config/database');
const logger     = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const routes     = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// Rate limiting — aumentado para soportar múltiples usuarios
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000,                  // 1000 peticiones por ventana (antes era 100)
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, mensaje: 'Demasiadas peticiones, intenta en unos minutos' },
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger de peticiones
app.use((req, res, next) => {
  res.on('finish', () => {
    logger.info(`${req.ip} - - "${req.method} ${req.path} HTTP/1.1" ${res.statusCode} ${res.get('Content-Length') || '-'} "${res.get('Referer') || '-'}" "${req.get('User-Agent') || '-'}"`);
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// Rutas API
app.use('/api', routes);

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Error handler
app.use(errorHandler);

// Iniciar
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`🚀 Servidor corriendo en puerto ${PORT} [${process.env.NODE_ENV}]`);
    logger.info(`📋 Health: http://localhost:${PORT}/health`);
    logger.info(`🔌 API:    http://localhost:${PORT}/api`);
  });
};

start().catch(err => {
  logger.error('Error iniciando servidor:', err);
  process.exit(1);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Error no manejado', { mensaje: reason?.message || reason, stack: reason?.stack });
});
