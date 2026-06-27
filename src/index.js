'use strict';
require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const { pool, verificarConexion } = require('./config/database');
const logger    = require('./config/logger');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const routes    = require('./routes');
const { iniciarCron } = require('./cron/suscripcionCron');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.json({ ok: true, db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.status(500).json({ ok: false, db: 'error' });
  }
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

const start = async () => {
  await verificarConexion();
  app.listen(PORT, () => logger.info(`🚀 Servidor en puerto ${PORT}`));
  iniciarCron();
};

start().catch(err => {
  logger.error('Error iniciando:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Error no manejado:', { mensaje: reason?.message });
});
