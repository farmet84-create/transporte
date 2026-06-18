'use strict';

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const { verificarConexion } = require('./config/database');
const logger                = require('./config/logger');
const routes                = require('./routes/index');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1)

// ─── SEGURIDAD ───────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Rate limiting global
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  message:  { ok: false, mensaje: 'Demasiadas solicitudes, intenta más tarde' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// Rate limiting estricto para login
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, mensaje: 'Demasiados intentos de login' },
}));

// ─── PARSERS ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── LOGGING HTTP ────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

// ─── HEALTH CHECK ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    ok:      true,
    sistema: 'Rentabilidad de Transporte API',
    version: '1.0.0',
    env:     process.env.NODE_ENV,
    hora:    new Date().toISOString(),
  });
});

// ─── RUTAS ───────────────────────────────────────────────
app.use('/api', routes);

// ─── ERRORES ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── INICIO ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3000;

async function iniciar() {
  await verificarConexion();
  app.listen(PORT, () => {
    logger.info(`🚀 Servidor corriendo en puerto ${PORT} [${process.env.NODE_ENV}]`);
    logger.info(`📋 Health: http://localhost:${PORT}/health`);
    logger.info(`🔌 API:    http://localhost:${PORT}/api`);
  });
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { err });
  process.exit(1);
});

iniciar();

module.exports = app;
