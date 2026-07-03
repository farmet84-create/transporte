'use strict';

const { pool } = require('../config/database');
const logger   = require('../config/logger');

async function verificarSuscripcion(req, res, next) {
  try {
    const empresaId = req.usuario?.empresa_id;
    if (!empresaId) return next();

    const [rows] = await pool.query(
      `SELECT estado, fecha_vencimiento,
              DATEDIFF(fecha_vencimiento, CURDATE()) AS dias_restantes
       FROM suscripciones WHERE empresa_id = ?`,
      [empresaId]
    );

    if (!rows.length) return next();

    const { estado, dias_restantes } = rows[0];

    if (estado === 'bloqueado') {
      return res.status(403).json({
        ok: false,
        bloqueado: true,
        dias_restantes,
        mensaje: 'Suscripción vencida. Realiza tu pago para continuar.',
      });
    }

    req.suscripcion = { estado, dias_restantes };
    next();
  } catch (err) {
    logger.error('verificarSuscripcion: error consultando BD', { err: err.message });
    return res.status(503).json({
      ok: false,
      mensaje: 'Servicio temporalmente no disponible. Intenta de nuevo.',
    });
  }
}

module.exports = { verificarSuscripcion };
