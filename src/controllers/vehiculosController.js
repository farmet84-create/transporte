'use strict';

const { pool } = require('../config/database');
const { ok, error, nuevoUuid, paginar, respuestaPaginada } = require('../utils/helpers');

// GET /api/vehiculos
async function listar(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { pagina, limite, offset } = paginar(req.query);
    const { placa, activo } = req.query;

    let where = 'WHERE empresa_id = ? AND eliminado_en IS NULL';
    const params = [empresaId];
    if (placa)  { where += ' AND placa LIKE ?'; params.push(`%${placa.toUpperCase()}%`); }
    if (activo !== undefined) { where += ' AND activo = ?'; params.push(activo === 'true' ? 1 : 0); }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM vehiculos ${where}`, params
    );
    const [rows] = await pool.query(
      `SELECT id, uuid, placa, marca, modelo, anio, tipo, tipo_combustible,
              capacidad_carga_kg, rendimiento_km_galon,
              soat_vencimiento, soat_aseguradora, soat_numero_poliza,
              tecnomecanica_vencimiento, tecnomecanica_numero,
              numero_motor, numero_chasis, color, propietario, activo, observaciones
       FROM vehiculos ${where} ORDER BY placa ASC LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );
    return respuestaPaginada(res, rows, total, pagina, limite);
  } catch (err) { next(err); }
}

// GET /api/vehiculos/:id
async function obtener(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM vehiculos WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (!rows.length) return error(res, 'Vehículo no encontrado', 404);
    return ok(res, rows[0]);
  } catch (err) { next(err); }
}

// POST /api/vehiculos
async function crear(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const {
      placa, marca, modelo, anio, tipo, tipo_combustible,
      capacidad_carga_kg, rendimiento_km_galon,
      soat_vencimiento, soat_aseguradora, soat_numero_poliza,
      tecnomecanica_vencimiento, tecnomecanica_numero,
      numero_motor, numero_chasis, color, propietario, observaciones
    } = req.body;

    if (!placa || !marca || !modelo) return error(res, 'Placa, marca y modelo son requeridos', 400);

    const [existe] = await pool.query(
      'SELECT id FROM vehiculos WHERE placa = ? AND empresa_id = ? AND eliminado_en IS NULL',
      [placa.toUpperCase(), empresaId]
    );
    if (existe.length) return error(res, `Ya existe un vehículo con la placa ${placa}`, 400);

    const uuid = nuevoUuid();
    const [result] = await pool.query(
      `INSERT INTO vehiculos (
        uuid, empresa_id, placa, marca, modelo, anio, tipo, tipo_combustible,
        capacidad_carga_kg, rendimiento_km_galon,
        soat_vencimiento, soat_aseguradora, soat_numero_poliza,
        tecnomecanica_vencimiento, tecnomecanica_numero,
        numero_motor, numero_chasis, color, propietario, observaciones, creado_por
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        uuid, empresaId, placa.toUpperCase(), marca, modelo,
        parseInt(anio || new Date().getFullYear()),
        tipo || 'camion', tipo_combustible || 'diesel',
        parseFloat(capacidad_carga_kg || 0) || null,
        parseFloat(rendimiento_km_galon || 0) || null,
        soat_vencimiento || null, soat_aseguradora || null, soat_numero_poliza || null,
        tecnomecanica_vencimiento || null, tecnomecanica_numero || null,
        numero_motor || null, numero_chasis || null,
        color || null, propietario || null, observaciones || null,
        req.usuario.id
      ]
    );
    const [nuevo] = await pool.query('SELECT * FROM vehiculos WHERE id = ?', [result.insertId]);
    return ok(res, nuevo[0], 'Vehículo creado correctamente', 201);
  } catch (err) { next(err); }
}

// PUT /api/vehiculos/:id
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const [rows] = await pool.query(
      'SELECT id FROM vehiculos WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL',
      [id, empresaId]
    );
    if (!rows.length) return error(res, 'Vehículo no encontrado', 404);

    const {
      placa, marca, modelo, anio, tipo, tipo_combustible,
      capacidad_carga_kg, rendimiento_km_galon,
      soat_vencimiento, soat_aseguradora, soat_numero_poliza,
      tecnomecanica_vencimiento, tecnomecanica_numero,
      numero_motor, numero_chasis, color, propietario, observaciones, activo
    } = req.body;

    await pool.query(
      `UPDATE vehiculos SET
        placa = COALESCE(?, placa),
        marca = COALESCE(?, marca),
        modelo = COALESCE(?, modelo),
        anio = COALESCE(?, anio),
        tipo = COALESCE(?, tipo),
        tipo_combustible = COALESCE(?, tipo_combustible),
        capacidad_carga_kg = ?,
        rendimiento_km_galon = ?,
        soat_vencimiento = ?,
        soat_aseguradora = ?,
        soat_numero_poliza = ?,
        tecnomecanica_vencimiento = ?,
        tecnomecanica_numero = ?,
        numero_motor = ?,
        numero_chasis = ?,
        color = ?,
        propietario = ?,
        observaciones = ?,
        activo = COALESCE(?, activo),
        actualizado_en = NOW()
       WHERE id = ? AND empresa_id = ?`,
      [
        placa?.toUpperCase() || null, marca || null, modelo || null,
        anio ? parseInt(anio) : null, tipo || null, tipo_combustible || null,
        parseFloat(capacidad_carga_kg || 0) || null,
        parseFloat(rendimiento_km_galon || 0) || null,
        soat_vencimiento || null, soat_aseguradora || null, soat_numero_poliza || null,
        tecnomecanica_vencimiento || null, tecnomecanica_numero || null,
        numero_motor || null, numero_chasis || null,
        color || null, propietario || null, observaciones || null,
        activo !== undefined ? activo : null,
        id, empresaId
      ]
    );

    const [actualizado] = await pool.query('SELECT * FROM vehiculos WHERE id = ?', [id]);
    return ok(res, actualizado[0], 'Vehículo actualizado');
  } catch (err) { next(err); }
}

// DELETE /api/vehiculos/:id
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const [rows] = await pool.query(
      'SELECT id FROM vehiculos WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL',
      [id, empresaId]
    );
    if (!rows.length) return error(res, 'Vehículo no encontrado', 404);
    await pool.query(
      'UPDATE vehiculos SET eliminado_en = NOW(), activo = 0 WHERE id = ?', [id]
    );
    return ok(res, null, 'Vehículo eliminado');
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
