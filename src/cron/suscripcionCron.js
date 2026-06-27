'use strict';

const cron   = require('node-cron');
const { pool }  = require('../config/database');
const logger = require('../config/logger');

function iniciarCron() {
  cron.schedule('5 0 * * *', async () => {
    try {
      const [result] = await pool.query(
        `UPDATE suscripciones
         SET estado = 'bloqueado', actualizado_en = NOW()
         WHERE estado = 'activo'
           AND fecha_vencimiento < CURDATE()`
      );
      if (result.affectedRows > 0) {
        logger.info(`Cron suscripcion: ${result.affectedRows} empresa(s) bloqueadas por vencimiento`);
      }
    } catch (err) {
      logger.error('Cron suscripcion error', { err: err.message });
    }
  }, {
    timezone: 'America/Bogota',
  });

  logger.info('Cron de suscripciones iniciado (00:05 America/Bogota)');
}

module.exports = { iniciarCron };
