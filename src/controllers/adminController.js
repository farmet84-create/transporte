'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { ok, error, nuevoUuid, paginar, respuestaPaginada } = require('../utils/helpers');

// GET /api/admin/usuarios
async function listarUsuarios(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const [rows] = await pool.query(
      `SELECT id, uuid, nombre, apellido, email, rol, activo, ultimo_acceso, creado_en
       FROM usuarios
       WHERE empresa_id = ? AND eliminado_en IS NULL
       ORDER BY nombre ASC`,
      [empresaId]
    );
    return ok(res, rows);
  } catch (err) { next(err); }
}

// POST /api/admin/usuarios
async function crearUsuario(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { nombre, apellido, email, password, rol } = req.body;

    if (!nombre || !email || !password) return error(res, 'Nombre, email y contraseña son requeridos', 400);

    const rolesValidos = ['admin','operador','contador','visualizador'];
    if (!rolesValidos.includes(rol)) return error(res, 'Rol inválido', 400);

    const [existe] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? AND empresa_id = ? AND eliminado_en IS NULL',
      [email, empresaId]
    );
    if (existe.length) return error(res, 'Ya existe un usuario con ese email', 400);

    const hash = await bcrypt.hash(password, 12);
    const uuid = nuevoUuid();

    const [result] = await pool.query(
      `INSERT INTO usuarios (uuid, empresa_id, nombre, apellido, email, password_hash, rol, creado_por)
       VALUES (?,?,?,?,?,?,?,?)`,
      [uuid, empresaId, nombre, apellido || '', email, hash, rol, req.usuario.id]
    );

    const [nuevo] = await pool.query(
      'SELECT id, uuid, nombre, apellido, email, rol, activo, creado_en FROM usuarios WHERE id = ?',
      [result.insertId]
    );
    return ok(res, nuevo[0], 'Usuario creado correctamente', 201);
  } catch (err) { next(err); }
}

// PUT /api/admin/usuarios/:id
async function actualizarUsuario(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const { nombre, apellido, email, password, rol, activo } = req.body;

    const [rows] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL',
      [id, empresaId]
    );
    if (!rows.length) return error(res, 'Usuario no encontrado', 404);

    let hash = null;
    if (password && password.trim() !== '') {
      hash = await bcrypt.hash(password, 12);
    }

    await pool.query(
      `UPDATE usuarios SET
        nombre = COALESCE(?, nombre),
        apellido = COALESCE(?, apellido),
        email = COALESCE(?, email),
        rol = COALESCE(?, rol),
        activo = COALESCE(?, activo),
        ${hash ? 'password_hash = ?,' : ''}
        actualizado_en = NOW()
       WHERE id = ? AND empresa_id = ?`,
      hash
        ? [nombre||null, apellido||null, email||null, rol||null, activo??null, hash, id, empresaId]
        : [nombre||null, apellido||null, email||null, rol||null, activo??null, id, empresaId]
    );

    const [actualizado] = await pool.query(
      'SELECT id, uuid, nombre, apellido, email, rol, activo FROM usuarios WHERE id = ?',
      [id]
    );
    return ok(res, actualizado[0], 'Usuario actualizado');
  } catch (err) { next(err); }
}

// GET /api/admin/auditoria
async function listarAuditoria(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { pagina, limite, offset } = paginar(req.query);
    const { usuario, accion } = req.query;

    let where = 'WHERE a.empresa_id = ?';
    const params = [empresaId];

    if (usuario) { where += ' AND (u.nombre LIKE ? OR u.email LIKE ?)'; params.push(`%${usuario}%`, `%${usuario}%`); }
    if (accion)  { where += ' AND a.accion = ?'; params.push(accion); }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${where}`, params
    );

    const [rows] = await pool.query(
      `SELECT a.id, a.tabla, a.accion, a.ip, a.creado_en,
              a.dato_antes, a.dato_despues,
              CONCAT(u.nombre, ' ', COALESCE(u.apellido,'')) AS usuario_nombre,
              u.email AS usuario_email, u.rol AS usuario_rol
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${where}
       ORDER BY a.creado_en DESC
       LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );

    return respuestaPaginada(res, rows, total, pagina, limite);
  } catch (err) { next(err); }
}

module.exports = { listarUsuarios, crearUsuario, actualizarUsuario, listarAuditoria };
