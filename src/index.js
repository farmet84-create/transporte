'use strict';

require('dotenv').config();
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const { connectDB } = require('./config/database');
const logger       = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const routes       = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// ─── Seguridad ────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

// ─── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}))

// ─── Rate limiting — solo escrituras ─────────────────────
const limiterEscritura = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization
    if (auth?.startsWith('Bearer ')) return auth.substring(7, 40)
    return req.ip
  },
  skip: (req) => req.method === 'GET' || req.method === 'OPTIONS',
  message: { ok: false, mensaje: 'Demasiadas operaciones, espera un momento' },
})
app.use('/api', limiterEscritura)

// ─── Body parser ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Cache headers ────────────────────────────────────────
app.use('/api/reportes', (req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'private, max-age=60')
  next()
})
app.use('/api/alertas', (req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'private, max-age=300')
  next()
})

// ─── Health check ─────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const { pool } = require('./config/database')
    const conn = await pool.getConnection()
    await conn.ping()
    conn.release()
    res.json({ ok: true, db: 'connected', ts: new Date().toISOString() })
  } catch {
    res.status(500).json({ ok: false, db: 'error' })
  }
})

// ─── Rutas API ────────────────────────────────────────────
app.use('/api', routes)

// ─── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: `Ruta no encontrada: ${req.method} ${req.path}` })
})

// ─── Error handler ────────────────────────────────────────
app.use(errorHandler)

// ─── Iniciar servidor ─────────────────────────────────────
const start = async () => {
  await connectDB()
  app.listen(PORT, () => {
    logger.info(`🚀 Servidor en puerto ${PORT}`)
  })
}

start().catch(err => {
  logger.error('Error iniciando servidor:', err)
  process.exit(1)
})

// ─── Errores no capturados ────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Error no manejado:', { mensaje: reason?.message, stack: reason?.stack })
})

process.on('SIGTERM', async () => {
  logger.info('Cerrando servidor...')
  const { pool } = require('./config/database')
  await pool.end()
  process.exit(0)
})
