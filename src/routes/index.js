'use strict';

const { Router } = require('express');
const { autenticar, autorizar } = require('../middlewares/auth');

const auth      = require('../controllers/authController');
const vehiculos = require('../controllers/vehiculosController');
const viajes    = require('../controllers/viajesController');
const costos    = require('../controllers/costosController');
const reportes  = require('../controllers/reportesController');
const admin     = require('../controllers/adminController');
const { pool }  = require('../config/database');

const router = Router();

// ─── AUTH ────────────────────────────────────────────────
router.post('/auth/login',            auth.login);
router.get ('/auth/me',               autenticar, auth.perfil);
router.put ('/auth/cambiar-password', autenticar, auth.cambiarPassword);

// ─── VEHÍCULOS ───────────────────────────────────────────
router.get   ('/vehiculos',     autenticar, vehiculos.listar);
router.get   ('/vehiculos/:id', autenticar, vehiculos.obtener);
router.post  ('/vehiculos',     autenticar, autorizar('admin','operador'), vehiculos.crear);
router.put   ('/vehiculos/:id', autenticar, autorizar('admin','operador'), vehiculos.actualizar);
router.delete('/vehiculos/:id', autenticar, autorizar('admin'), vehiculos.eliminar);

// ─── CONDUCTORES ─────────────────────────────────────────
router.get('/conductores', autenticar, async (req, res, next) => {
  try {
    const empresaId = req.usuario.empresa_id;
    const { activo, limite = 100, pagina = 1 } = req.query;
    let where = 'WHERE empresa_id = ? AND eliminado_en IS NULL';
    const params = [empresaId];
    if (activo !== undefined) { where += ' AND activo = ?'; params.push(activo === 'true' ? 1 : 0); }
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM conductores ${where}`, params);
    const [rows] = await pool.query(
      `SELECT id, uuid, nombres, apellidos, tipo_documento, numero_documento,
              telefono, email, numero_licencia, categoria_licencia,
              vencimiento_licencia, salario_base, activo
       FROM conductores ${where} ORDER BY nombres ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limite), offset]
    );
    res.json({ ok: true, datos: rows, paginacion: { total, pagina: parseInt(pagina), limite: parseInt(limite) } });
  } catch(err) { next(err); }
});

router.get('/conductores/:id', autenticar, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM conductores WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL',
      [req.params.id, req.usuario.empresa_id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Conductor no encontrado' });
    res.json({ ok: true, datos: rows[0] });
  } catch(err) { next(err); }
});

router.post('/conductores', autenticar, autorizar('admin','operador'), async (req, res, next) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const empresaId = req.usuario.empresa_id;
    const { nombres, apellidos, tipo_documento, numero_documento, telefono, email,
            direccion, ciudad, numero_licencia, categoria_licencia, vencimiento_licencia,
            fecha_ingreso, tipo_contrato, salario_base, auxilio_transporte, observaciones } = req.body;
    const [result] = await pool.query(
      `INSERT INTO conductores (uuid, empresa_id, nombres, apellidos, tipo_documento,
        numero_documento, telefono, email, direccion, ciudad, numero_licencia,
        categoria_licencia, vencimiento_licencia, fecha_ingreso, tipo_contrato,
        salario_base, auxilio_transporte, observaciones, creado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), empresaId, nombres, apellidos, tipo_documento || 'CC',
       numero_documento, telefono||null, email||null, direccion||null, ciudad||null,
       numero_licencia||null, categoria_licencia||null, vencimiento_licencia||null,
       fecha_ingreso||null, tipo_contrato||null,
       parseFloat(salario_base||0), parseFloat(auxilio_transporte||0),
       observaciones||null, req.usuario.id]
    );
    const [nuevo] = await pool.query('SELECT * FROM conductores WHERE id = ?', [result.insertId]);
    res.status(201).json({ ok: true, mensaje: 'Conductor creado', datos: nuevo[0] });
  } catch(err) { next(err); }
});

router.put('/conductores/:id', autenticar, autorizar('admin','operador'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const campos = req.body;
    const sets = Object.keys(campos).map(k => `${k} = ?`).join(', ');
    await pool.query(`UPDATE conductores SET ${sets}, actualizado_en = NOW() WHERE id = ? AND empresa_id = ?`,
      [...Object.values(campos), id, req.usuario.empresa_id]);
    const [rows] = await pool.query('SELECT * FROM conductores WHERE id = ?', [id]);
    res.json({ ok: true, mensaje: 'Conductor actualizado', datos: rows[0] });
  } catch(err) { next(err); }
});

router.delete('/conductores/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await pool.query('UPDATE conductores SET eliminado_en = NOW(), activo = 0 WHERE id = ? AND empresa_id = ?',
      [req.params.id, req.usuario.empresa_id]);
    res.json({ ok: true, mensaje: 'Conductor eliminado' });
  } catch(err) { next(err); }
});

// ─── CLIENTES ────────────────────────────────────────────
router.get('/clientes', autenticar, async (req, res, next) => {
  try {
    const empresaId = req.usuario.empresa_id;
    const { activo, limite = 100, pagina = 1 } = req.query;
    let where = 'WHERE empresa_id = ? AND eliminado_en IS NULL';
    const params = [empresaId];
    if (activo !== undefined) { where += ' AND activo = ?'; params.push(activo === 'true' ? 1 : 0); }
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM clientes ${where}`, params);
    const [rows] = await pool.query(
      `SELECT id, uuid, razon_social, nit, nombre_contacto, telefono, email,
              ciudad, departamento, dias_credito, activo
       FROM clientes ${where} ORDER BY razon_social ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limite), offset]
    );
    res.json({ ok: true, datos: rows, paginacion: { total, pagina: parseInt(pagina), limite: parseInt(limite) } });
  } catch(err) { next(err); }
});

router.get('/clientes/:id', autenticar, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM clientes WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL',
      [req.params.id, req.usuario.empresa_id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });
    res.json({ ok: true, datos: rows[0] });
  } catch(err) { next(err); }
});

router.post('/clientes', autenticar, autorizar('admin','operador'), async (req, res, next) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const empresaId = req.usuario.empresa_id;
    const { razon_social, nit, nombre_contacto, telefono, email,
            direccion, ciudad, departamento, dias_credito, limite_credito, observaciones } = req.body;
    const [result] = await pool.query(
      `INSERT INTO clientes (uuid, empresa_id, razon_social, nit, nombre_contacto,
        telefono, email, direccion, ciudad, departamento, dias_credito, limite_credito,
        observaciones, creado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), empresaId, razon_social, nit||null, nombre_contacto||null,
       telefono||null, email||null, direccion||null, ciudad||null, departamento||null,
       parseInt(dias_credito||0), parseFloat(limite_credito||0),
       observaciones||null, req.usuario.id]
    );
    const [nuevo] = await pool.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    res.status(201).json({ ok: true, mensaje: 'Cliente creado', datos: nuevo[0] });
  } catch(err) { next(err); }
});

router.put('/clientes/:id', autenticar, autorizar('admin','operador'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const campos = req.body;
    const sets = Object.keys(campos).map(k => `${k} = ?`).join(', ');
    await pool.query(`UPDATE clientes SET ${sets}, actualizado_en = NOW() WHERE id = ? AND empresa_id = ?`,
      [...Object.values(campos), id, req.usuario.empresa_id]);
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
    res.json({ ok: true, mensaje: 'Cliente actualizado', datos: rows[0] });
  } catch(err) { next(err); }
});

router.delete('/clientes/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await pool.query('UPDATE clientes SET eliminado_en = NOW(), activo = 0 WHERE id = ? AND empresa_id = ?',
      [req.params.id, req.usuario.empresa_id]);
    res.json({ ok: true, mensaje: 'Cliente eliminado' });
  } catch(err) { next(err); }
});

// ─── VIAJES ──────────────────────────────────────────────
router.get   ('/viajes',                       autenticar, viajes.listar);
router.get   ('/viajes/:id',                   autenticar, viajes.obtener);
router.get   ('/viajes/:id/rentabilidad',      autenticar, viajes.rentabilidad);
router.post  ('/viajes',                       autenticar, autorizar('admin','operador'), viajes.crear);
router.put   ('/viajes/:id',                   autenticar, autorizar('admin','operador'), viajes.actualizar);
router.put   ('/viajes/:id/estado',            autenticar, autorizar('admin','operador'), viajes.cambiarEstado);
router.post  ('/viajes/:id/gastos',            autenticar, autorizar('admin','operador'), viajes.agregarGasto);
router.delete('/viajes/:id/gastos/:gastoId',   autenticar, autorizar('admin','operador'), viajes.eliminarGasto);
router.post  ('/viajes/:id/combustible',       autenticar, autorizar('admin','operador'), viajes.agregarCombustible);
router.delete('/viajes/:id/combustible/:cId',  autenticar, autorizar('admin','operador'), viajes.eliminarCombustible);
router.delete('/viajes/:id',                   autenticar, autorizar('admin','operador'), viajes.eliminarViaje);

// ─── COSTOS ──────────────────────────────────────────────
router.get ('/costos/operacion',       autenticar, costos.listarOperacion);
router.post('/costos/operacion',       autenticar, autorizar('admin','contador'), costos.guardarOperacion);
router.get ('/costos/administrativos', autenticar, costos.listarAdministrativos);
router.post('/costos/administrativos', autenticar, autorizar('admin','contador'), costos.guardarAdministrativos);

// ─── REPORTES ────────────────────────────────────────────
router.get('/reportes/dashboard',              autenticar, reportes.dashboard);
router.get('/reportes/rentabilidad-vehiculo',  autenticar, reportes.rentabilidadPorVehiculo);
router.get('/reportes/rentabilidad-conductor', autenticar, reportes.rentabilidadPorConductor);
router.get('/reportes/rentabilidad-cliente',   autenticar, reportes.rentabilidadPorCliente);
router.get('/reportes/evolucion-mensual',      autenticar, reportes.evolucionMensual);

// ─── ADMIN ───────────────────────────────────────────────
router.get ('/admin/usuarios',     autenticar, autorizar('admin'), admin.listarUsuarios);
router.post('/admin/usuarios',     autenticar, autorizar('admin'), admin.crearUsuario);
router.put ('/admin/usuarios/:id', autenticar, autorizar('admin'), admin.actualizarUsuario);
router.get ('/admin/auditoria',    autenticar, autorizar('admin'), admin.listarAuditoria);

module.exports = router;
