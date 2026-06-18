'use strict';

const { pool } = require('../config/database');
const { ok, error } = require('../utils/helpers');

// GET /api/reportes/dashboard — KPIs del mes actual
async function dashboard(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();
    const mes  = parseInt(req.query.mes)  || new Date().getMonth() + 1;

    // KPIs del mes
    const [[kpis]] = await pool.query(
      `SELECT
          COUNT(*)                          AS total_viajes,
          SUM(km_recorridos)                AS total_km,
          SUM(valor_flete_cobrado)          AS total_ingresos,
          SUM(total_costos)                 AS total_costos,
          SUM(utilidad_neta)                AS total_utilidad,
          ROUND(AVG(rentabilidad_pct), 2)   AS rentabilidad_promedio,
          SUM(CASE WHEN rentabilidad_pct >= 20 THEN 1 ELSE 0 END) AS viajes_rentables,
          SUM(CASE WHEN rentabilidad_pct < 0  THEN 1 ELSE 0 END)  AS viajes_perdida
       FROM viajes
       WHERE empresa_id = ?
         AND YEAR(fecha_salida) = ? AND MONTH(fecha_salida) = ?
         AND eliminado_en IS NULL`,
      [empresaId, anio, mes]
    );

    // Comparativo mes anterior
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anioAnterior = mes === 1 ? anio - 1 : anio;

    const [[kpisAnt]] = await pool.query(
      `SELECT
          SUM(valor_flete_cobrado) AS total_ingresos,
          SUM(utilidad_neta)       AS total_utilidad,
          ROUND(AVG(rentabilidad_pct), 2) AS rentabilidad_promedio
       FROM viajes
       WHERE empresa_id = ?
         AND YEAR(fecha_salida) = ? AND MONTH(fecha_salida) = ?
         AND eliminado_en IS NULL`,
      [empresaId, anioAnterior, mesAnterior]
    );

    // Top 5 vehículos por rentabilidad
    const [topVehiculos] = await pool.query(
      `SELECT vh.placa, CONCAT(vh.marca,' ',vh.modelo) AS vehiculo,
              COUNT(v.id) AS viajes,
              SUM(v.utilidad_neta) AS utilidad,
              ROUND(AVG(v.rentabilidad_pct), 2) AS rentabilidad_pct
       FROM viajes v
       INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
       WHERE v.empresa_id = ? AND YEAR(v.fecha_salida) = ? AND MONTH(v.fecha_salida) = ?
         AND v.estado = 'completado' AND v.eliminado_en IS NULL
       GROUP BY vh.id, vh.placa, vh.marca, vh.modelo
       ORDER BY rentabilidad_pct DESC
       LIMIT 5`,
      [empresaId, anio, mes]
    );

    // Top 5 clientes por ingresos
    const [topClientes] = await pool.query(
      `SELECT cl.razon_social AS cliente,
              COUNT(v.id) AS viajes,
              SUM(v.valor_flete_cobrado) AS total_facturado,
              ROUND(AVG(v.rentabilidad_pct), 2) AS rentabilidad_pct
       FROM viajes v
       INNER JOIN clientes cl ON cl.id = v.cliente_id
       WHERE v.empresa_id = ? AND YEAR(v.fecha_salida) = ? AND MONTH(v.fecha_salida) = ?
         AND v.eliminado_en IS NULL
       GROUP BY cl.id, cl.razon_social
       ORDER BY total_facturado DESC
       LIMIT 5`,
      [empresaId, anio, mes]
    );

    // Últimos 10 viajes
    const [ultimosViajes] = await pool.query(
      `SELECT v.id, v.numero_viaje, v.fecha_salida, v.origen, v.destino,
              v.valor_flete_cobrado, v.utilidad_neta, v.rentabilidad_pct, v.estado,
              vh.placa, CONCAT(c.nombres,' ',c.apellidos) AS conductor
       FROM viajes v
       INNER JOIN vehiculos   vh ON vh.id = v.vehiculo_id
       INNER JOIN conductores  c ON c.id  = v.conductor_id
       WHERE v.empresa_id = ? AND v.eliminado_en IS NULL
       ORDER BY v.fecha_salida DESC, v.id DESC
       LIMIT 10`,
      [empresaId]
    );

    // Viajes por estado del mes
    const [porEstado] = await pool.query(
      `SELECT estado, COUNT(*) AS total
       FROM viajes
       WHERE empresa_id = ? AND YEAR(fecha_salida) = ? AND MONTH(fecha_salida) = ?
         AND eliminado_en IS NULL
       GROUP BY estado`,
      [empresaId, anio, mes]
    );

    return ok(res, {
      periodo: { anio, mes },
      kpis: {
        ...kpis,
        variacion_ingresos:      calcularVariacion(kpis.total_ingresos, kpisAnt.total_ingresos),
        variacion_utilidad:      calcularVariacion(kpis.total_utilidad, kpisAnt.total_utilidad),
        variacion_rentabilidad:  calcularVariacion(kpis.rentabilidad_promedio, kpisAnt.rentabilidad_promedio),
      },
      top_vehiculos: topVehiculos,
      top_clientes:  topClientes,
      ultimos_viajes: ultimosViajes,
      viajes_por_estado: porEstado,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reportes/rentabilidad-por-vehiculo
async function rentabilidadPorVehiculo(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { anio, mes, placa } = req.query;

    let where = 'WHERE v.empresa_id = ? AND v.eliminado_en IS NULL AND v.estado = "completado"';
    const params = [empresaId];

    if (anio)  { where += ' AND YEAR(v.fecha_salida) = ?';  params.push(anio); }
    if (mes)   { where += ' AND MONTH(v.fecha_salida) = ?'; params.push(mes); }
    if (placa) { where += ' AND vh.placa LIKE ?';           params.push(`%${placa.toUpperCase()}%`); }

    const [rows] = await pool.query(
      `SELECT
          vh.id AS vehiculo_id, vh.placa,
          CONCAT(vh.marca,' ',vh.modelo) AS vehiculo,
          YEAR(v.fecha_salida) AS anio, MONTH(v.fecha_salida) AS mes,
          COUNT(v.id)                        AS total_viajes,
          SUM(v.km_recorridos)               AS total_km,
          SUM(v.valor_flete_cobrado)         AS total_ingresos,
          SUM(v.total_gastos_directos)       AS total_gastos_directos,
          SUM(v.total_costo_operacion_km)    AS total_costo_operacion,
          SUM(v.costo_admin_aplicado)        AS total_costo_admin,
          SUM(v.total_costos)                AS total_costos,
          SUM(v.utilidad_neta)               AS total_utilidad,
          ROUND(AVG(v.rentabilidad_pct), 2)  AS rentabilidad_promedio_pct,
          MIN(v.rentabilidad_pct)            AS rentabilidad_min,
          MAX(v.rentabilidad_pct)            AS rentabilidad_max
       FROM viajes v
       INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
       ${where}
       GROUP BY vh.id, vh.placa, vh.marca, vh.modelo,
                YEAR(v.fecha_salida), MONTH(v.fecha_salida)
       ORDER BY rentabilidad_promedio_pct DESC`,
      params
    );

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/reportes/rentabilidad-por-conductor
async function rentabilidadPorConductor(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { anio, mes } = req.query;

    let where = 'WHERE v.empresa_id = ? AND v.eliminado_en IS NULL AND v.estado = "completado"';
    const params = [empresaId];
    if (anio) { where += ' AND YEAR(v.fecha_salida) = ?';  params.push(anio); }
    if (mes)  { where += ' AND MONTH(v.fecha_salida) = ?'; params.push(mes); }

    const [rows] = await pool.query(
      `SELECT
          c.id AS conductor_id,
          CONCAT(c.nombres,' ',c.apellidos) AS conductor,
          c.numero_documento,
          COUNT(v.id)                       AS total_viajes,
          SUM(v.km_recorridos)              AS total_km,
          SUM(v.valor_flete_cobrado)        AS total_ingresos,
          SUM(v.utilidad_neta)              AS total_utilidad,
          ROUND(AVG(v.rentabilidad_pct),2)  AS rentabilidad_promedio_pct
       FROM viajes v
       INNER JOIN conductores c ON c.id = v.conductor_id
       ${where}
       GROUP BY c.id, c.nombres, c.apellidos, c.numero_documento
       ORDER BY rentabilidad_promedio_pct DESC`,
      params
    );

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/reportes/rentabilidad-por-cliente
async function rentabilidadPorCliente(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { anio, mes } = req.query;

    let where = 'WHERE v.empresa_id = ? AND v.eliminado_en IS NULL';
    const params = [empresaId];
    if (anio) { where += ' AND YEAR(v.fecha_salida) = ?';  params.push(anio); }
    if (mes)  { where += ' AND MONTH(v.fecha_salida) = ?'; params.push(mes); }

    const [rows] = await pool.query(
      `SELECT
          cl.id AS cliente_id, cl.razon_social AS cliente, cl.nit,
          COUNT(v.id)                       AS total_viajes,
          SUM(v.valor_flete_cobrado)        AS total_facturado,
          SUM(v.total_costos)               AS total_costos,
          SUM(v.utilidad_neta)              AS total_utilidad,
          ROUND(AVG(v.rentabilidad_pct),2)  AS rentabilidad_promedio_pct
       FROM viajes v
       INNER JOIN clientes cl ON cl.id = v.cliente_id
       ${where}
       GROUP BY cl.id, cl.razon_social, cl.nit
       ORDER BY total_facturado DESC`,
      params
    );

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/reportes/evolucion-mensual — gráfico de tendencia anual
async function evolucionMensual(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const [rows] = await pool.query(
      `SELECT
          MONTH(fecha_salida)              AS mes,
          COUNT(*)                         AS total_viajes,
          SUM(valor_flete_cobrado)         AS total_ingresos,
          SUM(total_costos)                AS total_costos,
          SUM(utilidad_neta)               AS total_utilidad,
          ROUND(AVG(rentabilidad_pct), 2)  AS rentabilidad_promedio
       FROM viajes
       WHERE empresa_id = ? AND YEAR(fecha_salida) = ?
         AND estado = 'completado' AND eliminado_en IS NULL
       GROUP BY MONTH(fecha_salida)
       ORDER BY mes ASC`,
      [empresaId, anio]
    );

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

function calcularVariacion(actual, anterior) {
  if (!anterior || anterior === 0) return null;
  return parseFloat(((actual - anterior) / Math.abs(anterior) * 100).toFixed(2));
}

module.exports = {
  dashboard,
  rentabilidadPorVehiculo,
  rentabilidadPorConductor,
  rentabilidadPorCliente,
  evolucionMensual,
};
