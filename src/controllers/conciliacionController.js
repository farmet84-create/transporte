'use strict';

const { pool } = require('../config/database');
const { ok, error, nuevoUuid } = require('../utils/helpers');

const limpiarFecha = (f) => (f ? f.toString().substring(0, 10) : null);

// GET /api/conciliacion — listar con filtros (día o rango mensual, banco, cliente, estado)
async function listar(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { fecha, fecha_inicio, fecha_fin, banco, cliente, estado } = req.query;

    let where = 'WHERE c.empresa_id = ? AND c.eliminado_en IS NULL';
    const params = [empresaId];
    if (fecha)        { where += ' AND DATE(c.fecha) = ?';        params.push(fecha); }
    if (fecha_inicio) { where += ' AND DATE(c.fecha) >= ?';       params.push(fecha_inicio); }
    if (fecha_fin)    { where += ' AND DATE(c.fecha) <= ?';       params.push(fecha_fin); }
    if (banco)        { where += ' AND c.banco = ?';              params.push(banco); }
    if (cliente)      { where += ' AND c.cliente LIKE ?';         params.push(`%${cliente}%`); }
    if (estado)       { where += ' AND c.estado = ?';             params.push(estado); }

    const [rows] = await pool.query(
      `SELECT c.id, c.uuid,
          DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha,
          DATE_FORMAT(c.fecha, '%H:%i')    AS hora,
          c.banco, c.cliente, c.comprobante, c.valor, c.estado,
          c.reviso, c.autorizo, c.observaciones
       FROM conciliacion_bancaria c
       ${where}
       ORDER BY c.fecha DESC, c.id DESC`,
      params
    );

    return ok(res, rows);
  } catch (err) { next(err); }
}

// POST /api/conciliacion — registrar transferencia (fecha/hora automáticas)
async function crear(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { banco, cliente, comprobante, valor, estado, reviso, autorizo, observaciones, fecha } = req.body;

    if (!valor || parseFloat(valor) <= 0) return error(res, 'Ingresa un valor válido', 400);
    if (!banco) return error(res, 'Selecciona el banco', 400);

    // fecha/hora: por defecto ahora; si envían fecha manual se respeta (con hora actual)
    const usarFecha = fecha ? `${limpiarFecha(fecha)} ${new Date().toTimeString().substring(0,8)}` : null;

    const [result] = await pool.query(
      `INSERT INTO conciliacion_bancaria
        (uuid, empresa_id, fecha, banco, cliente, comprobante, valor, estado, reviso, autorizo, observaciones, creado_por)
       VALUES (?, ?, ${usarFecha ? '?' : 'NOW()'}, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      usarFecha
        ? [nuevoUuid(), empresaId, usarFecha, banco, cliente || null, comprobante || null, parseFloat(valor), estado || 'pendiente', reviso || null, autorizo || null, observaciones || null, req.usuario.id]
        : [nuevoUuid(), empresaId, banco, cliente || null, comprobante || null, parseFloat(valor), estado || 'pendiente', reviso || null, autorizo || null, observaciones || null, req.usuario.id]
    );

    const [nuevo] = await pool.query(
      `SELECT id, DATE_FORMAT(fecha,'%Y-%m-%d') AS fecha, DATE_FORMAT(fecha,'%H:%i') AS hora,
              banco, cliente, comprobante, valor, estado, reviso, autorizo, observaciones
       FROM conciliacion_bancaria WHERE id = ?`, [result.insertId]
    );
    return ok(res, nuevo[0], 'Transferencia registrada', 201);
  } catch (err) { next(err); }
}

// PUT /api/conciliacion/:id — editar (ej: cambiar estado a autorizada)
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const { banco, cliente, comprobante, valor, estado, reviso, autorizo, observaciones } = req.body;

    const [rows] = await pool.query(
      `SELECT * FROM conciliacion_bancaria WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL`,
      [id, empresaId]
    );
    if (!rows.length) return error(res, 'Registro no encontrado', 404);
    const a = rows[0];

    await pool.query(
      `UPDATE conciliacion_bancaria SET
        banco = ?, cliente = ?, comprobante = ?, valor = ?, estado = ?,
        reviso = ?, autorizo = ?, observaciones = ?, actualizado_en = NOW()
       WHERE id = ?`,
      [
        banco || a.banco, cliente ?? a.cliente, comprobante ?? a.comprobante,
        valor != null ? parseFloat(valor) : a.valor, estado || a.estado,
        reviso ?? a.reviso, autorizo ?? a.autorizo, observaciones ?? a.observaciones, id
      ]
    );
    return ok(res, null, 'Registro actualizado');
  } catch (err) { next(err); }
}

// DELETE /api/conciliacion/:id
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    await pool.query(
      `UPDATE conciliacion_bancaria SET eliminado_en = NOW() WHERE id = ? AND empresa_id = ?`,
      [id, empresaId]
    );
    return ok(res, null, 'Registro eliminado');
  } catch (err) { next(err); }
}

// GET /api/conciliacion/resumen — dashboard con totales (mismos filtros)
async function resumen(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { fecha, fecha_inicio, fecha_fin, banco, cliente, estado } = req.query;

    let where = 'WHERE c.empresa_id = ? AND c.eliminado_en IS NULL';
    const params = [empresaId];
    if (fecha)        { where += ' AND DATE(c.fecha) = ?';  params.push(fecha); }
    if (fecha_inicio) { where += ' AND DATE(c.fecha) >= ?'; params.push(fecha_inicio); }
    if (fecha_fin)    { where += ' AND DATE(c.fecha) <= ?'; params.push(fecha_fin); }
    if (banco)        { where += ' AND c.banco = ?';        params.push(banco); }
    if (cliente)      { where += ' AND c.cliente LIKE ?';   params.push(`%${cliente}%`); }
    if (estado)       { where += ' AND c.estado = ?';       params.push(estado); }

    // Totales generales
    const [[tot]] = await pool.query(
      `SELECT COUNT(*) AS total_registros, COALESCE(SUM(c.valor),0) AS total_valor
       FROM conciliacion_bancaria c ${where}`, params);

    // Por banco
    const [porBanco] = await pool.query(
      `SELECT c.banco, COUNT(*) AS cantidad, COALESCE(SUM(c.valor),0) AS valor
       FROM conciliacion_bancaria c ${where}
       GROUP BY c.banco ORDER BY valor DESC`, params);

    // Por estado
    const [porEstado] = await pool.query(
      `SELECT c.estado, COUNT(*) AS cantidad, COALESCE(SUM(c.valor),0) AS valor
       FROM conciliacion_bancaria c ${where}
       GROUP BY c.estado`, params);

    // Por día (para el gráfico de evolución diaria)
    const [porDia] = await pool.query(
      `SELECT DATE_FORMAT(c.fecha,'%Y-%m-%d') AS dia, COALESCE(SUM(c.valor),0) AS valor, COUNT(*) AS cantidad
       FROM conciliacion_bancaria c ${where}
       GROUP BY DATE_FORMAT(c.fecha,'%Y-%m-%d') ORDER BY dia ASC`, params);

    return ok(res, {
      total_registros: tot.total_registros,
      total_valor:     parseFloat(tot.total_valor || 0),
      por_banco:       porBanco,
      por_estado:      porEstado,
      por_dia:         porDia,
    });
  } catch (err) { next(err); }
}

module.exports = { listar, crear, actualizar, eliminar, resumen };
