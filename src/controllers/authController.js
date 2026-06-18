'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool }   = require('../config/database');
const { ok, error, registrarAuditoria } = require('../utils/helpers');
const logger = require('../config/logger');

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Buscar usuario activo con su empresa
    const [rows] = await pool.query(
      `SELECT u.id, u.uuid, u.nombre, u.apellido, u.email, u.password_hash,
              u.rol, u.activo, u.empresa_id,
              e.nombre AS empresa_nombre, e.activo AS empresa_activa
       FROM usuarios u
       INNER JOIN empresas e ON e.id = u.empresa_id
       WHERE u.email = ? AND u.eliminado_en IS NULL
       LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return error(res, 'Credenciales inválidas', 401);
    }

    const usuario = rows[0];

    if (!usuario.activo || !usuario.empresa_activa) {
      return error(res, 'Usuario o empresa inactiva', 401);
    }

    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return error(res, 'Credenciales inválidas', 401);
    }

    // Generar token JWT
    const payload = {
      id:          usuario.id,
      uuid:        usuario.uuid,
      empresa_id:  usuario.empresa_id,
      rol:         usuario.rol,
      email:       usuario.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    // Actualizar último acceso
    await pool.query(
      `UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?`,
      [usuario.id]
    );

    await registrarAuditoria({
      empresaId:  usuario.empresa_id,
      usuarioId:  usuario.id,
      tabla:      'usuarios',
      registroId: usuario.id,
      accion:     'LOGIN',
      ip:         req.ip,
      userAgent:  req.headers['user-agent'],
    });

    logger.info('Login exitoso', { email, empresa_id: usuario.empresa_id });

    return ok(res, {
      token,
      usuario: {
        id:             usuario.id,
        nombre:         `${usuario.nombre} ${usuario.apellido}`,
        email:          usuario.email,
        rol:            usuario.rol,
        empresa_id:     usuario.empresa_id,
        empresa_nombre: usuario.empresa_nombre,
      }
    }, 'Login exitoso');

  } catch (err) {
    next(err);
  }
}

// POST /api/auth/cambiar-password
async function cambiarPassword(req, res, next) {
  try {
    const { password_actual, password_nuevo } = req.body;
    const usuarioId = req.usuario.id;

    const [rows] = await pool.query(
      `SELECT password_hash FROM usuarios WHERE id = ?`,
      [usuarioId]
    );

    const ok_actual = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!ok_actual) {
      return error(res, 'La contraseña actual es incorrecta', 400);
    }

    const hash = await bcrypt.hash(password_nuevo, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await pool.query(
      `UPDATE usuarios SET password_hash = ?, actualizado_en = NOW() WHERE id = ?`,
      [hash, usuarioId]
    );

    return ok(res, null, 'Contraseña actualizada correctamente');
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function perfil(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.uuid, u.nombre, u.apellido, u.email, u.rol,
              u.telefono, u.avatar_url, u.ultimo_acceso,
              e.id AS empresa_id, e.nombre AS empresa_nombre,
              e.nit, e.ciudad, e.logo_url, e.moneda
       FROM usuarios u
       INNER JOIN empresas e ON e.id = u.empresa_id
       WHERE u.id = ?`,
      [req.usuario.id]
    );
    return ok(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, cambiarPassword, perfil };
