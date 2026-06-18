'use strict';

const { pool } = require('../config/database');
const { ok, error, nuevoUuid, paginar, respuestaPaginada, registrarAuditoria } = require('../utils/helpers');

// GET /api/vehiculos — listar con filtro por placa
async function listar(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { pagina, limite, offset } = paginar(req.query);
    const { placa, tipo, activo } = req.query;

    let where = 'WHERE empresa_id = ? AND eliminado_en IS NULL';
    const params = [empresaId];

    if (placa) {
      where += ' AND placa LIKE ?';
      params.push(`%${placa.toUpperCase()}%`);
    }
    if (tipo)   { where += ' AND tipo = ?';   params.push(tipo); }
    if (activo !== undefined) { where += ' AND activo = ?'; params.push(activo === 'true' ? 1 : 0); }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM vehiculos ${where}`, params
    );

    const [rows] = await pool.query(
      `SELECT id, uuid, placa, marca, modelo, anio, tipo,
              capacidad_carga_kg, capacidad_carga_m3,
              tipo_combustible, rendimiento_km_galon,
              propietario, color, activo, observaciones,
              creado_en, actualizado_en
       FROM vehiculos ${where}
       ORDER BY placa ASC
       LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );

    return respuestaPaginada(res, rows, total, pagina, limite);
  } catch (err) {
    next(err);
  }
}

// GET /api/vehiculos/:id
async function obtener(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT v.*,
              (SELECT ROUND(AVG(rentabilidad_pct), 2)
               FROM viajes WHERE vehiculo_id = v.id AND estado = 'completado'
               AND eliminado_en IS NULL) AS rentabilidad_promedio_pct,
              (SELECT COUNT(*) FROM viajes
               WHERE vehiculo_id = v.id AND eliminado_en IS NULL) AS total_viajes
       FROM vehiculos v
       WHERE v.id = ? AND v.empresa_id = ? AND v.eliminado_en IS NULL`,
      [req.params.id, req.usuario.empresa_id]
    );

    if (!rows.length) return error(res, 'Vehículo no encontrado', 404);
    return ok(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/vehiculos
async function crear(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const {
      placa, marca, modelo, anio, tipo,
      capacidad_carga_kg, capacidad_carga_m3,
      numero_motor, numero_chasis, color, propietario,
      tipo_combustible, rendimiento_km_galon, observaciones
    } = req.body;

    const uuid = nuevoUuid();

    const [result] = await pool.query(
      `INSERT INTO vehiculos
        (uuid, empresa_id, placa, marca, modelo, anio, tipo,
         capacidad_carga_kg, capacidad_carga_m3, numero_motor, numero_chasis,
         color, propietario, tipo_combustible, rendimiento_km_galon,
         observaciones, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid, empresaId, placa.toUpperCase().trim(), marca, modelo, anio, tipo,
        capacidad_carga_kg || null, capacidad_carga_m3 || null,
        numero_motor || null, numero_chasis || null,
        color || null, propietario || null, tipo_combustible || 'diesel',
        rendimiento_km_galon || null, observaciones || null,
        req.usuario.id
      ]
    );

    await registrarAuditoria({
      empresaId, usuarioId: req.usuario.id,
      tabla: 'vehiculos', registroId: result.insertId,
      accion: 'INSERT', datoDespues: req.body,
      ip: req.ip, userAgent: req.headers['user-agent']
    });

    const [nuevo] = await pool.query(`SELECT * FROM vehiculos WHERE id = ?`, [result.insertId]);
    return ok(res, nuevo[0], 'Vehículo creado correctamente', 201);
  } catch (err) {
    next(err);
  }
}

// PUT /api/vehiculos/:id
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const [antes] = await pool.query(
      `SELECT * FROM vehiculos WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL`,
      [id, empresaId]
    );
    if (!antes.length) return error(res, 'Vehículo no encontrado', 404);

    const {
      placa, marca, modelo, anio, tipo,
      capacidad_carga_kg, capacidad_carga_m3,
      numero_motor, numero_chasis, color, propietario,
      tipo_combustible, rendimiento_km_galon, activo, observaciones
    } = req.body;

    await pool.query(
      `UPDATE vehiculos SET
        placa = ?, marca = ?, modelo = ?, anio = ?, tipo = ?,
        capacidad_carga_kg = ?, capacidad_carga_m3 = ?,
        numero_motor = ?, numero_chasis = ?, color = ?,
        propietario = ?, tipo_combustible = ?, rendimiento_km_galon = ?,
        activo = ?, observaciones = ?, actualizado_en = NOW()
       WHERE id = ? AND empresa_id = ?`,
      [
        placa?.toUpperCase().trim() || antes[0].placa,
        marca || antes[0].marca, modelo || antes[0].modelo,
        anio  || antes[0].anio,  tipo  || antes[0].tipo,
        capacidad_carga_kg ?? antes[0].capacidad_carga_kg,
        capacidad_carga_m3 ?? antes[0].capacidad_carga_m3,
        numero_motor  || antes[0].numero_motor,
        numero_chasis || antes[0].numero_chasis,
        color || antes[0].color, propietario || antes[0].propietario,
        tipo_combustible || antes[0].tipo_combustible,
        rendimiento_km_galon ?? antes[0].rendimiento_km_galon,
        activo !== undefined ? (activo ? 1 : 0) : antes[0].activo,
        observaciones || antes[0].observaciones,
        id, empresaId
      ]
    );

    await registrarAuditoria({
      empresaId, usuarioId: req.usuario.id,
      tabla: 'vehiculos', registroId: id,
      accion: 'UPDATE', datoAntes: antes[0], datoDespues: req.body,
      ip: req.ip, userAgent: req.headers['user-agent']
    });

    const [actualizado] = await pool.query(`SELECT * FROM vehiculos WHERE id = ?`, [id]);
    return ok(res, actualizado[0], 'Vehículo actualizado');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/vehiculos/:id — soft delete
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const [rows] = await pool.query(
      `SELECT id FROM vehiculos WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL`,
      [id, empresaId]
    );
    if (!rows.length) return error(res, 'Vehículo no encontrado', 404);

    await pool.query(
      `UPDATE vehiculos SET eliminado_en = NOW(), activo = 0 WHERE id = ?`,
      [id]
    );

    await registrarAuditoria({
      empresaId, usuarioId: req.usuario.id,
      tabla: 'vehiculos', registroId: id, accion: 'DELETE',
      ip: req.ip, userAgent: req.headers['user-agent']
    });

    return ok(res, null, 'Vehículo eliminado');
  } catch (err) {
    next(err);
  }
}

// GET /api/vehiculos/:id/costo-km — costo/km del mes actual
async function costoKmActual(req, res, next) {
  try {
    const { id } = req.params;
    const anio = new Date().getFullYear();
    const mes  = new Date().getMonth() + 1;

    const [rows] = await pool.query(
      `SELECT * FROM costos_operacion_mensual
       WHERE vehiculo_id = ? AND anio = ? AND mes = ?`,
      [id, anio, mes]
    );

    return ok(res, rows[0] || null, rows.length ? 'OK' : 'Sin costos registrados para este mes');
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, costoKmActual };
