'use strict';

const { pool } = require('../config/database');
const { ok, error, nuevoUuid } = require('../utils/helpers');

const limpiarFecha = (f) => (f ? f.toString().substring(0, 10) : null);

// GET /api/mantenimiento — una fila por vehículo activo (crea la fila si no existe en memoria)
async function listar(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;

    const [rows] = await pool.query(
      `SELECT v.id AS vehiculo_id, v.placa, CONCAT(v.marca,' ',v.modelo) AS vehiculo,
              m.id AS mant_id, m.km_actual,
              DATE_FORMAT(m.proximo_mant_fecha, '%Y-%m-%d') AS proximo_mant_fecha,
              m.proximo_mant_km, m.pendientes, m.semaforo
       FROM vehiculos v
       LEFT JOIN mantenimiento_vehiculo m ON m.vehiculo_id = v.id
       WHERE v.empresa_id = ? AND v.activo = 1 AND v.eliminado_en IS NULL
       ORDER BY v.placa ASC`,
      [empresaId]
    );

    return ok(res, rows);
  } catch (err) { next(err); }
}

// POST /api/mantenimiento — guardar/actualizar mantenimiento de un vehículo
async function guardar(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { vehiculo_id, km_actual, proximo_mant_fecha, proximo_mant_km, pendientes, semaforo } = req.body;

    if (!vehiculo_id) return error(res, 'vehiculo_id requerido', 400);

    const sem = ['rojo', 'amarillo', 'verde'].includes(semaforo) ? semaforo : 'verde';

    const [existe] = await pool.query(
      `SELECT id FROM mantenimiento_vehiculo WHERE vehiculo_id = ?`, [vehiculo_id]
    );

    if (existe.length) {
      await pool.query(
        `UPDATE mantenimiento_vehiculo SET
          km_actual = ?, proximo_mant_fecha = ?, proximo_mant_km = ?,
          pendientes = ?, semaforo = ?, actualizado_en = NOW()
         WHERE vehiculo_id = ?`,
        [parseFloat(km_actual) || 0, limpiarFecha(proximo_mant_fecha),
         parseFloat(proximo_mant_km) || 0, pendientes || null, sem, vehiculo_id]
      );
    } else {
      await pool.query(
        `INSERT INTO mantenimiento_vehiculo
          (uuid, empresa_id, vehiculo_id, km_actual, proximo_mant_fecha, proximo_mant_km, pendientes, semaforo)
         VALUES (?,?,?,?,?,?,?,?)`,
        [nuevoUuid(), empresaId, vehiculo_id, parseFloat(km_actual) || 0,
         limpiarFecha(proximo_mant_fecha), parseFloat(proximo_mant_km) || 0, pendientes || null, sem]
      );
    }

    return ok(res, null, 'Mantenimiento guardado');
  } catch (err) { next(err); }
}

module.exports = { listar, guardar };
