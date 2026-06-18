'use strict';

const { Router } = require('express');
const { autenticar, autorizar } = require('../middlewares/auth');

// Controladores
const auth      = require('../controllers/authController');
const vehiculos = require('../controllers/vehiculosController');
const viajes    = require('../controllers/viajesController');
const costos    = require('../controllers/costosController');
const reportes  = require('../controllers/reportesController');

const router = Router();

// ─── AUTENTICACIÓN (público) ──────────────────────────────
router.post('/auth/login',            auth.login);
router.get ('/auth/me',               autenticar, auth.perfil);
router.put ('/auth/cambiar-password', autenticar, auth.cambiarPassword);

// ─── VEHÍCULOS ────────────────────────────────────────────
router.get ('/vehiculos',              autenticar, vehiculos.listar);
router.get ('/vehiculos/:id',          autenticar, vehiculos.obtener);
router.get ('/vehiculos/:id/costo-km', autenticar, vehiculos.costoKmActual);
router.post('/vehiculos',              autenticar, autorizar('admin','operador'), vehiculos.crear);
router.put ('/vehiculos/:id',          autenticar, autorizar('admin','operador'), vehiculos.actualizar);
router.delete('/vehiculos/:id',        autenticar, autorizar('admin'), vehiculos.eliminar);

// ─── VIAJES ──────────────────────────────────────────────
router.get ('/viajes',                         autenticar, viajes.listar);
router.get ('/viajes/:id',                     autenticar, viajes.obtener);
router.get ('/viajes/:id/rentabilidad',        autenticar, viajes.rentabilidad);
router.post('/viajes',                         autenticar, autorizar('admin','operador'), viajes.crear);
router.put ('/viajes/:id/estado',              autenticar, autorizar('admin','operador'), viajes.cambiarEstado);
router.post('/viajes/:id/gastos',              autenticar, autorizar('admin','operador'), viajes.agregarGasto);
router.delete('/viajes/:id/gastos/:gastoId',   autenticar, autorizar('admin','operador'), viajes.eliminarGasto);

// ─── COSTOS MENSUALES ────────────────────────────────────
router.get ('/costos/operacion',        autenticar, costos.listarOperacion);
router.post('/costos/operacion',        autenticar, autorizar('admin','contador'), costos.guardarOperacion);
router.get ('/costos/administrativos',  autenticar, costos.listarAdministrativos);
router.post('/costos/administrativos',  autenticar, autorizar('admin','contador'), costos.guardarAdministrativos);

// ─── REPORTES Y DASHBOARD ────────────────────────────────
router.get('/reportes/dashboard',               autenticar, reportes.dashboard);
router.get('/reportes/rentabilidad-vehiculo',   autenticar, reportes.rentabilidadPorVehiculo);
router.get('/reportes/rentabilidad-conductor',  autenticar, reportes.rentabilidadPorConductor);
router.get('/reportes/rentabilidad-cliente',    autenticar, reportes.rentabilidadPorCliente);
router.get('/reportes/evolucion-mensual',       autenticar, reportes.evolucionMensual);

module.exports = router;
