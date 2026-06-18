'use strict';

const logger = require('../config/logger');

// Manejador de errores global — siempre al final del stack de middlewares
function errorHandler(err, req, res, next) {
  logger.error('Error no manejado', {
    mensaje:  err.message,
    stack:    err.stack,
    url:      req.originalUrl,
    metodo:   req.method,
    ip:       req.ip,
    usuario:  req.usuario?.id,
  });

  // Errores de validación de express-validator
  if (err.type === 'validation') {
    return res.status(400).json({ ok: false, mensaje: 'Datos inválidos', errores: err.errors });
  }

  // Errores de MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ ok: false, mensaje: 'El registro ya existe' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ ok: false, mensaje: 'Referencia inválida — registro relacionado no existe' });
  }

  // Error genérico
  const status = err.status || 500;
  const mensaje = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;

  res.status(status).json({ ok: false, mensaje });
}

// Ruta no encontrada
function notFound(req, res) {
  res.status(404).json({
    ok: false,
    mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}

module.exports = { errorHandler, notFound };
