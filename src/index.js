'use strict';

require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const { connectDB } = require('./config/database');
const logger    = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const routes    = require('./routes');

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
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

app.use(errorHandler);

const start = async () => {
  await connectDB();
  app.listen(PORT, () => logger.info(`🚀 Servidor en puerto ${PORT}`));
};

start().catch(err => {
  logger.error('Error iniciando:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Error no manejado:', { mensaje: reason?.message });
});
