'use strict';

const crypto = require('crypto');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { pool }    = require('../config/database');
const { ok, error, nuevoUuid } = require('../utils/helpers');
const logger      = require('../config/logger');

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// GET /api/suscripcion
async function obtenerEstado(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;

    const [rows] = await pool.query(
      `SELECT s.*,
        DATEDIFF(s.fecha_vencimiento, CURDATE()) AS dias_restantes
       FROM suscripciones s
       WHERE s.empresa_id = ?`,
      [empresaId]
    );

    if (!rows.length) {
      return ok(res, { estado: 'sin_suscripcion', dias_restantes: 0, precio_usd: 395.00 });
    }

    return ok(res, rows[0]);
  } catch (err) { next(err); }
}

// POST /api/suscripcion/generar-pago
async function generarPago(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;

    const [rows] = await pool.query(
      'SELECT * FROM suscripciones WHERE empresa_id = ?',
      [empresaId]
    );

    const appUrl     = process.env.APP_URL     || 'https://transporte-frontend.up.railway.app';
    const backendUrl = process.env.BACKEND_URL || 'https://transporte-production-cb7a.up.railway.app';

    const preference = new Preference(mp);
    const result = await preference.create({
      body: {
        items: [{
          id: `suscripcion-${empresaId}`,
          title: 'Suscripción mensual — Sistema de Transporte',
          quantity: 1,
          unit_price: 395,
          currency_id: 'USD',
        }],
        back_urls: {
          success: `${appUrl}/suscripcion?pago=exitoso`,
          failure: `${appUrl}/suscripcion?pago=fallido`,
          pending: `${appUrl}/suscripcion?pago=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${backendUrl}/api/suscripcion/webhook`,
        metadata: { empresa_id: empresaId },
      },
    });

    if (rows.length) {
      await pool.query(
        'UPDATE suscripciones SET mp_preference_id = ?, actualizado_en = NOW() WHERE empresa_id = ?',
        [result.id, empresaId]
      );
    }

    return ok(res, {
      preference_id:      result.id,
      init_point:         result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (err) { next(err); }
}

// GET /api/suscripcion/pagos
async function listarPagos(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;

    const [rows] = await pool.query(
      `SELECT id, mp_payment_id, monto_usd, estado, fecha_pago,
              periodo_desde, periodo_hasta, creado_en
       FROM pagos
       WHERE empresa_id = ?
       ORDER BY creado_en DESC
       LIMIT 24`,
      [empresaId]
    );

    return ok(res, rows);
  } catch (err) { next(err); }
}

// POST /api/suscripcion/webhook — público, sin JWT
async function webhook(req, res, next) {
  try {
    // Validar firma de MercadoPago
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (secret) {
      const xSignature = req.headers['x-signature'] || '';
      const xRequestId = req.headers['x-request-id'] || '';
      const dataId     = req.query?.['data.id'] || req.body?.data?.id || '';
      const manifest   = `id:${dataId};request-id:${xRequestId};ts:${xSignature.split(',').find(p => p.startsWith('ts='))?.split('=')[1] || ''};`;
      const ts         = xSignature.split(',').find(p => p.startsWith('ts='))?.split('=')[1];
      const v1         = xSignature.split(',').find(p => p.startsWith('v1='))?.split('=')[1];
      const expected   = crypto.createHmac('sha256', secret).update(`id:${dataId};request-id:${xRequestId};ts:${ts};`).digest('hex');
      if (!v1 || v1 !== expected) {
        logger.warn('Webhook MP: firma inválida', { xSignature, dataId });
        return res.status(200).json({ ok: true }); // 200 para que MP no reintente
      }
    }

    const { type, data } = req.body;

    if (type !== 'payment' || !data?.id) {
      return res.status(200).json({ ok: true });
    }

    // Verificar con la API de MP (nunca confiar solo en el webhook)
    const paymentApi = new Payment(mp);
    const pago = await paymentApi.get({ id: data.id });

    if (pago.status !== 'approved') {
      logger.info('Webhook MP: pago no aprobado', { payment_id: data.id, status: pago.status });
      return res.status(200).json({ ok: true });
    }

    const empresaId = pago.metadata?.empresa_id;
    if (!empresaId) {
      logger.warn('Webhook MP: sin empresa_id en metadata', { payment_id: data.id });
      return res.status(200).json({ ok: true });
    }

    // Evitar duplicados
    const [existe] = await pool.query(
      'SELECT id FROM pagos WHERE mp_payment_id = ?',
      [String(data.id)]
    );
    if (existe.length) return res.status(200).json({ ok: true });

    // Registrar pago
    const hoy = new Date();
    const periodoDesde = hoy.toISOString().slice(0, 10);
    const fechaHasta   = new Date(hoy);
    fechaHasta.setDate(fechaHasta.getDate() + 30);
    const periodoHasta = fechaHasta.toISOString().slice(0, 10);

    await pool.query(
      `INSERT INTO pagos (uuid, empresa_id, mp_payment_id, monto_usd, estado, fecha_pago, periodo_desde, periodo_hasta)
       VALUES (?, ?, ?, ?, 'aprobado', NOW(), ?, ?)`,
      [nuevoUuid(), empresaId, String(data.id), pago.transaction_amount || 395, periodoDesde, periodoHasta]
    );

    // Renovar/activar suscripción
    const [subs] = await pool.query(
      'SELECT fecha_vencimiento FROM suscripciones WHERE empresa_id = ?',
      [empresaId]
    );

    if (subs.length) {
      const base = subs[0].fecha_vencimiento > periodoDesde ? subs[0].fecha_vencimiento : periodoDesde;
      await pool.query(
        `UPDATE suscripciones
         SET estado = 'activo',
             fecha_vencimiento = DATE_ADD(?, INTERVAL 30 DAY),
             mp_preference_id = NULL,
             actualizado_en = NOW()
         WHERE empresa_id = ?`,
        [base, empresaId]
      );
    } else {
      await pool.query(
        `INSERT INTO suscripciones (uuid, empresa_id, estado, precio_usd, fecha_inicio, fecha_vencimiento)
         VALUES (?, ?, 'activo', 395.00, ?, ?)`,
        [nuevoUuid(), empresaId, periodoDesde, periodoHasta]
      );
    }

    logger.info('Webhook MP: suscripción renovada', { empresa_id: empresaId, payment_id: data.id });
    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('Webhook MP error', { err: err.message });
    return res.status(200).json({ ok: true }); // Siempre 200 a MP
  }
}

module.exports = { obtenerEstado, generarPago, listarPagos, webhook };
