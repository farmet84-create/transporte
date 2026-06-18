'use strict';

const { pool } = require('../config/database');
const { ok, error, nuevoUuid, registrarAuditoria } = require('../utils/helpers');

// ─── COSTOS DE OPERACIÓN POR VEHÍCULO ───────────────────────

// GET /api/costos/operacion — listar por vehículo y mes
async function listarOperacion(req, res, next) {
  try {
    const { vehiculo_id, anio, mes } = req.query;
    const empresaId = req.usuario.empresa_id;

    let where = 'WHERE com.empresa_id = ?';
    const params = [empresaId];

    if (vehiculo_id) { where += ' AND com.vehiculo_id = ?'; params.push(vehiculo_id); }
    if (anio)        { where += ' AND com.anio = ?';        params.push(anio); }
    if (mes)         { where += ' AND com.mes = ?';         params.push(mes); }

    const [rows] = await pool.query(
      `SELECT com.*, v.placa, CONCAT(v.marca,' ',v.modelo) AS vehiculo
       FROM costos_operacion_mensual com
       INNER JOIN vehiculos v ON v.id = com.vehiculo_id
       ${where}
       ORDER BY com.anio DESC, com.mes DESC, v.placa ASC`,
      params
    );

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/costos/operacion — registrar o actualizar costos del mes
async function guardarOperacion(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const {
      vehiculo_id, anio, mes,
      llantas, mantenimiento_preventivo, mantenimiento_correctivo,
      aceites_filtros, depreciacion, seguros, soat,
      tecnomecanica, impuestos, otros, km_recorridos_mes, observaciones
    } = req.body;

    // Verificar si ya existe registro para ese vehículo/mes
    const [existe] = await pool.query(
      `SELECT id FROM costos_operacion_mensual
       WHERE vehiculo_id = ? AND anio = ? AND mes = ?`,
      [vehiculo_id, anio, mes]
    );

    if (existe.length) {
      // Actualizar
      await pool.query(
        `UPDATE costos_operacion_mensual SET
          llantas = ?, mantenimiento_preventivo = ?, mantenimiento_correctivo = ?,
          aceites_filtros = ?, depreciacion = ?, seguros = ?, soat = ?,
          tecnomecanica = ?, impuestos = ?, otros = ?,
          km_recorridos_mes = ?, observaciones = ?, actualizado_en = NOW()
         WHERE vehiculo_id = ? AND anio = ? AND mes = ?`,
        [
          llantas || 0, mantenimiento_preventivo || 0, mantenimiento_correctivo || 0,
          aceites_filtros || 0, depreciacion || 0, seguros || 0, soat || 0,
          tecnomecanica || 0, impuestos || 0, otros || 0,
          km_recorridos_mes || 0, observaciones || null,
          vehiculo_id, anio, mes
        ]
      );

      const [actualizado] = await pool.query(
        `SELECT * FROM costos_operacion_mensual WHERE vehiculo_id = ? AND anio = ? AND mes = ?`,
        [vehiculo_id, anio, mes]
      );
      return ok(res, actualizado[0], 'Costos de operación actualizados');

    } else {
      // Insertar
      const uuid = nuevoUuid();
      const [result] = await pool.query(
        `INSERT INTO costos_operacion_mensual
          (uuid, empresa_id, vehiculo_id, anio, mes,
           llantas, mantenimiento_preventivo, mantenimiento_correctivo,
           aceites_filtros, depreciacion, seguros, soat,
           tecnomecanica, impuestos, otros, km_recorridos_mes, observaciones, creado_por)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          uuid, empresaId, vehiculo_id, anio, mes,
          llantas || 0, mantenimiento_preventivo || 0, mantenimiento_correctivo || 0,
          aceites_filtros || 0, depreciacion || 0, seguros || 0, soat || 0,
          tecnomecanica || 0, impuestos || 0, otros || 0,
          km_recorridos_mes || 0, observaciones || null, req.usuario.id
        ]
      );

      const [nuevo] = await pool.query(
        `SELECT * FROM costos_operacion_mensual WHERE id = ?`,
        [result.insertId]
      );
      return ok(res, nuevo[0], 'Costos de operación registrados', 201);
    }
  } catch (err) {
    next(err);
  }
}

// ─── COSTOS ADMINISTRATIVOS MENSUALES ───────────────────────

// GET /api/costos/administrativos
async function listarAdministrativos(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { anio, mes } = req.query;

    let where = 'WHERE empresa_id = ?';
    const params = [empresaId];
    if (anio) { where += ' AND anio = ?'; params.push(anio); }
    if (mes)  { where += ' AND mes = ?';  params.push(mes); }

    const [rows] = await pool.query(
      `SELECT * FROM costos_administrativos_mensual ${where}
       ORDER BY anio DESC, mes DESC`,
      params
    );

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/costos/administrativos — registrar o actualizar
async function guardarAdministrativos(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const {
      anio, mes,
      salarios_conductores, prestaciones, seguridad_social,
      administracion, contabilidad, arrendamiento,
      servicios_publicos, comunicaciones, otros, observaciones
    } = req.body;

    // Calcular viajes completados del mes para el prorrateo
    const [[{ total_viajes }]] = await pool.query(
      `SELECT COUNT(*) AS total_viajes FROM viajes
       WHERE empresa_id = ? AND YEAR(fecha_salida) = ? AND MONTH(fecha_salida) = ?
       AND estado = 'completado' AND eliminado_en IS NULL`,
      [empresaId, anio, mes]
    );

    const [existe] = await pool.query(
      `SELECT id FROM costos_administrativos_mensual WHERE empresa_id = ? AND anio = ? AND mes = ?`,
      [empresaId, anio, mes]
    );

    const valores = [
      salarios_conductores || 0, prestaciones || 0, seguridad_social || 0,
      administracion || 0, contabilidad || 0, arrendamiento || 0,
      servicios_publicos || 0, comunicaciones || 0, otros || 0,
      total_viajes, observaciones || null
    ];

    if (existe.length) {
      await pool.query(
        `UPDATE costos_administrativos_mensual SET
          salarios_conductores=?, prestaciones=?, seguridad_social=?,
          administracion=?, contabilidad=?, arrendamiento=?,
          servicios_publicos=?, comunicaciones=?, otros=?,
          total_viajes_mes=?, observaciones=?, actualizado_en=NOW()
         WHERE empresa_id=? AND anio=? AND mes=?`,
        [...valores, empresaId, anio, mes]
      );

      const [act] = await pool.query(
        `SELECT * FROM costos_administrativos_mensual WHERE empresa_id=? AND anio=? AND mes=?`,
        [empresaId, anio, mes]
      );
      return ok(res, act[0], 'Costos administrativos actualizados');

    } else {
      const uuid = nuevoUuid();
      const [result] = await pool.query(
        `INSERT INTO costos_administrativos_mensual
          (uuid, empresa_id, anio, mes,
           salarios_conductores, prestaciones, seguridad_social,
           administracion, contabilidad, arrendamiento,
           servicios_publicos, comunicaciones, otros,
           total_viajes_mes, observaciones, creado_por)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uuid, empresaId, anio, mes, ...valores, req.usuario.id]
      );

      const [nuevo] = await pool.query(
        `SELECT * FROM costos_administrativos_mensual WHERE id=?`,
        [result.insertId]
      );
      return ok(res, nuevo[0], 'Costos administrativos registrados', 201);
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarOperacion, guardarOperacion,
  listarAdministrativos, guardarAdministrativos
};
