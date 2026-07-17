'use strict';

const { pool } = require('../config/database');
const { ok, error } = require('../utils/helpers');

// GET /api/reportes/dashboard
async function dashboard(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();
    const mes  = parseInt(req.query.mes)  || new Date().getMonth() + 1;

    const [[kpis]] = await pool.query(
      `SELECT
          COUNT(*)                          AS total_viajes,
          SUM(km_recorridos)                AS total_km,
          SUM(valor_flete_cobrado)          AS total_ingresos,
          SUM(total_gastos_directos)        AS total_gastos,
          SUM(CASE WHEN rentabilidad_pct >= 20 THEN 1 ELSE 0 END) AS viajes_rentables,
          SUM(CASE WHEN rentabilidad_pct < 0  THEN 1 ELSE 0 END)  AS viajes_perdida
       FROM viajes
       WHERE empresa_id = ? AND YEAR(fecha_salida) = ? AND MONTH(fecha_salida) = ?
         AND eliminado_en IS NULL`,
      [empresaId, anio, mes]
    );

    const mesAnterior  = mes === 1 ? 12 : mes - 1;
    const anioAnterior = mes === 1 ? anio - 1 : anio;

    const [[kpisAnt]] = await pool.query(
      `SELECT SUM(valor_flete_cobrado) AS total_ingresos,
              SUM(total_gastos_directos) AS total_gastos
       FROM viajes
       WHERE empresa_id = ? AND YEAR(fecha_salida) = ? AND MONTH(fecha_salida) = ?
         AND eliminado_en IS NULL`,
      [empresaId, anioAnterior, mesAnterior]
    );

    // Costos mensuales fijos de TODAS las placas del mes (y del mes anterior para la variación)
    const costosFijosDelMes = async (a, m) => {
      try {
        const [[cf]] = await pool.query(
          `SELECT COALESCE(SUM(total_costos_mes), 0) AS total
           FROM costos_vehiculo_mensual WHERE empresa_id = ? AND anio = ? AND mes = ?`,
          [empresaId, a, m]
        );
        return parseFloat(cf.total || 0);
      } catch (e) { return 0; }
    };
    const costosFijos    = await costosFijosDelMes(anio, mes);
    const costosFijosAnt = await costosFijosDelMes(anioAnterior, mesAnterior);

    // Fórmulas: Utilidad = Fletes − Gastos viajes − Costos mensuales todas las placas
    const ingresos    = parseFloat(kpis.total_ingresos || 0);
    const gastos      = parseFloat(kpis.total_gastos || 0);
    const costosTotal = gastos + costosFijos;
    const utilidad    = ingresos - costosTotal;
    kpis.total_costos          = costosTotal;
    kpis.total_utilidad        = utilidad;
    kpis.margen_pct            = ingresos    > 0 ? parseFloat(((utilidad / ingresos) * 100).toFixed(2)) : 0;
    kpis.rentabilidad_promedio = costosTotal > 0 ? parseFloat(((utilidad / costosTotal) * 100).toFixed(2)) : 0;

    const ingresosAnt = parseFloat(kpisAnt.total_ingresos || 0);
    const gastosAnt   = parseFloat(kpisAnt.total_gastos || 0);
    const utilidadAnt = ingresosAnt - gastosAnt - costosFijosAnt;
    kpisAnt.total_utilidad        = utilidadAnt;
    kpisAnt.rentabilidad_promedio = (gastosAnt + costosFijosAnt) > 0
      ? parseFloat(((utilidadAnt / (gastosAnt + costosFijosAnt)) * 100).toFixed(2)) : 0;

    const [topVehiculos] = await pool.query(
      `SELECT vh.placa, CONCAT(vh.marca,' ',vh.modelo) AS vehiculo,
              COUNT(v.id) AS viajes, SUM(v.utilidad_neta) AS utilidad,
              ROUND(AVG(v.rentabilidad_pct),2) AS rentabilidad_pct
       FROM viajes v INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
       WHERE v.empresa_id = ? AND YEAR(v.fecha_salida) = ? AND MONTH(v.fecha_salida) = ?
         AND v.estado = 'completado' AND v.eliminado_en IS NULL
       GROUP BY vh.id ORDER BY rentabilidad_pct DESC LIMIT 5`,
      [empresaId, anio, mes]
    );

    const [topClientes] = await pool.query(
      `SELECT cl.razon_social AS cliente, COUNT(v.id) AS viajes,
              SUM(v.valor_flete_cobrado) AS total_facturado,
              ROUND(AVG(v.rentabilidad_pct),2) AS rentabilidad_pct
       FROM viajes v INNER JOIN clientes cl ON cl.id = v.cliente_id
       WHERE v.empresa_id = ? AND YEAR(v.fecha_salida) = ? AND MONTH(v.fecha_salida) = ?
         AND v.eliminado_en IS NULL
       GROUP BY cl.id ORDER BY total_facturado DESC LIMIT 5`,
      [empresaId, anio, mes]
    );

    const [ultimosViajes] = await pool.query(
      `SELECT v.id, v.numero_viaje, v.fecha_salida, v.origen, v.destino,
              v.valor_flete_cobrado, v.utilidad_neta, v.rentabilidad_pct, v.estado,
              vh.placa, CONCAT(c.nombres,' ',c.apellidos) AS conductor
       FROM viajes v
       INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
       INNER JOIN conductores c ON c.id = v.conductor_id
       WHERE v.empresa_id = ? AND v.eliminado_en IS NULL
       ORDER BY v.fecha_salida DESC, v.id DESC LIMIT 10`,
      [empresaId]
    );

    const [porEstado] = await pool.query(
      `SELECT estado, COUNT(*) AS total FROM viajes
       WHERE empresa_id = ? AND YEAR(fecha_salida) = ? AND MONTH(fecha_salida) = ?
         AND eliminado_en IS NULL GROUP BY estado`,
      [empresaId, anio, mes]
    );

    return ok(res, {
      periodo: { anio, mes },
      kpis: {
        ...kpis,
        variacion_ingresos:     calcularVariacion(kpis.total_ingresos, kpisAnt.total_ingresos),
        variacion_utilidad:     calcularVariacion(kpis.total_utilidad, kpisAnt.total_utilidad),
        variacion_rentabilidad: calcularVariacion(kpis.rentabilidad_promedio, kpisAnt.rentabilidad_promedio),
      },
      top_vehiculos:     topVehiculos,
      top_clientes:      topClientes,
      ultimos_viajes:    ultimosViajes,
      viajes_por_estado: porEstado,
    });
  } catch (err) { next(err); }
}

// GET /api/reportes/rentabilidad-vehiculo
// Calcula igual que Excel: gastos directos + costos manifiesto (descuento)
async function rentabilidadPorVehiculo(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { anio, mes, placa } = req.query;

    let where = 'WHERE v.empresa_id = ? AND v.eliminado_en IS NULL AND v.estado = "completado"';
    const params = [empresaId];
    if (anio)  { where += ' AND YEAR(v.fecha_salida) = ?';  params.push(parseInt(anio)); }
    if (mes)   { where += ' AND MONTH(v.fecha_salida) = ?'; params.push(parseInt(mes)); }
    if (placa) { where += ' AND vh.placa LIKE ?';           params.push(`%${placa.toUpperCase()}%`); }

    const anioNum = parseInt(anio) || new Date().getFullYear()
    const mesNum  = parseInt(mes)  || new Date().getMonth() + 1

    const [viajes] = await pool.query(
      `SELECT
          vh.id AS vehiculo_id,
          vh.placa,
          CONCAT(vh.marca,' ',vh.modelo) AS vehiculo,
          ? AS anio,
          ? AS mes,
          COUNT(v.id)                        AS total_viajes,
          SUM(v.km_recorridos)               AS total_km,
          SUM(v.valor_flete_cobrado)         AS total_ingresos,
          SUM(v.total_gastos_directos)       AS total_gastos_directos,
          SUM(COALESCE(v.descuento_manifiesto, 0)) AS total_descuento_manifiesto
       FROM viajes v
       INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
       ${where}
       GROUP BY vh.id, vh.placa, vh.marca, vh.modelo
       ORDER BY total_ingresos DESC`,
      [anioNum, mesNum, ...params]
    );

    // Costos fijos del mes por vehículo (operación + administrativos)
    const costosFijos = {};
    try {
      const [cf] = await pool.query(
        `SELECT vehiculo_id, total_operacion, total_administrativos, total_costos_mes
         FROM costos_vehiculo_mensual
         WHERE empresa_id = ? AND anio = ? AND mes = ?`,
        [empresaId, anioNum, mesNum]
      );
      cf.forEach(c => { costosFijos[c.vehiculo_id] = c; });
    } catch (e) { /* tabla aún no creada */ }

    const resultado = viajes.map((v) => {
      const totalIngresos        = parseFloat(v.total_ingresos || 0)
      const costoGastoDirectos   = parseFloat(v.total_gastos_directos || 0)
      const costoManifiesto      = parseFloat(v.total_descuento_manifiesto || 0)
      const cfv                  = costosFijos[v.vehiculo_id] || {}
      const costosOperacionMes   = parseFloat(cfv.total_operacion || 0)
      const costosAdminMes       = parseFloat(cfv.total_administrativos || 0)
      const costosFijosMes       = parseFloat(cfv.total_costos_mes || 0)
      // TOTAL COSTOS = gastos directos + manifiesto + costos fijos del mes (op + admin)
      const totalCostos          = costoGastoDirectos + costoManifiesto + costosFijosMes
      const utilidad             = totalIngresos - totalCostos
      const margen               = totalIngresos > 0
        ? parseFloat(((utilidad / totalIngresos) * 100).toFixed(2))
        : 0
      const rentabilidad         = totalCostos > 0
        ? parseFloat(((utilidad / totalCostos) * 100).toFixed(2))
        : 0

      return {
        vehiculo_id:              v.vehiculo_id,
        placa:                    v.placa,
        vehiculo:                 v.vehiculo,
        anio:                     v.anio,
        mes:                      v.mes,
        total_viajes:             v.total_viajes,
        total_km:                 v.total_km,
        total_ingresos:           totalIngresos,
        costos_gastos_directos:   costoGastoDirectos,
        costos_manifiesto:        costoManifiesto,
        costos_operacion_mes:     costosOperacionMes,
        costos_administrativos_mes: costosAdminMes,
        costos_fijos_mes:         costosFijosMes,
        total_costos:             parseFloat(totalCostos.toFixed(2)),
        total_utilidad:           parseFloat(utilidad.toFixed(2)),
        rentabilidad_promedio_pct: margen,  // % Margen = Utilidad / Flete
      }
    })

    return ok(res, resultado);
  } catch (err) { next(err); }
}

// GET /api/reportes/rentabilidad-conductor
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
          SUM(v.total_gastos_directos)      AS total_gastos_directos,
          SUM(COALESCE(v.descuento_manifiesto,0)) AS total_descuento_manifiesto,
          SUM(v.total_gastos_directos + COALESCE(v.descuento_manifiesto,0)) AS total_costos,
          SUM(v.valor_flete_cobrado - v.total_gastos_directos - COALESCE(v.descuento_manifiesto,0)) AS total_utilidad,
          ROUND(AVG((v.valor_flete_cobrado - v.total_gastos_directos - COALESCE(v.descuento_manifiesto,0)) / NULLIF(v.valor_flete_cobrado,0) * 100), 2) AS rentabilidad_promedio_pct
       FROM viajes v
       INNER JOIN conductores c ON c.id = v.conductor_id
       ${where}
       GROUP BY c.id, c.nombres, c.apellidos, c.numero_documento
       ORDER BY rentabilidad_promedio_pct DESC`,
      params
    );

    return ok(res, rows);
  } catch (err) { next(err); }
}

// GET /api/reportes/rentabilidad-cliente
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
          SUM(v.total_gastos_directos + COALESCE(v.descuento_manifiesto,0)) AS total_costos,
          SUM(v.valor_flete_cobrado - v.total_gastos_directos - COALESCE(v.descuento_manifiesto,0)) AS total_utilidad,
          ROUND(AVG((v.valor_flete_cobrado - v.total_gastos_directos - COALESCE(v.descuento_manifiesto,0)) / NULLIF(v.valor_flete_cobrado,0) * 100), 2) AS rentabilidad_promedio_pct
       FROM viajes v
       INNER JOIN clientes cl ON cl.id = v.cliente_id
       ${where}
       GROUP BY cl.id, cl.razon_social, cl.nit
       ORDER BY total_facturado DESC`,
      params
    );

    return ok(res, rows);
  } catch (err) { next(err); }
}

// GET /api/reportes/evolucion-mensual
async function evolucionMensual(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    const [rows] = await pool.query(
      `SELECT
          MONTH(fecha_salida)              AS mes,
          COUNT(*)                         AS total_viajes,
          SUM(valor_flete_cobrado)         AS total_ingresos,
          SUM(total_gastos_directos + COALESCE(descuento_manifiesto,0)) AS total_costos,
          SUM(valor_flete_cobrado - total_gastos_directos - COALESCE(descuento_manifiesto,0)) AS total_utilidad,
          ROUND(AVG((valor_flete_cobrado - total_gastos_directos - COALESCE(descuento_manifiesto,0)) / NULLIF(valor_flete_cobrado,0) * 100), 2) AS rentabilidad_promedio
       FROM viajes
       WHERE empresa_id = ? AND YEAR(fecha_salida) = ?
         AND estado = 'completado' AND eliminado_en IS NULL
       GROUP BY MONTH(fecha_salida)
       ORDER BY mes ASC`,
      [empresaId, anio]
    );

    return ok(res, rows);
  } catch (err) { next(err); }
}

// GET /api/reportes/resumen — totales con filtros de placa, cliente y fechas
async function resumenFiltrado(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { placa, cliente_id, conductor_id, fecha_inicio, fecha_fin } = req.query;

    let where = 'WHERE v.empresa_id = ? AND v.eliminado_en IS NULL';
    const params = [empresaId];

    if (placa)        { where += ' AND vh.placa LIKE ?';       params.push(`%${placa.toUpperCase()}%`); }
    if (cliente_id)   { where += ' AND v.cliente_id = ?';      params.push(cliente_id); }
    if (conductor_id) { where += ' AND v.conductor_id = ?';    params.push(conductor_id); }
    if (fecha_inicio) { where += ' AND v.fecha_salida >= ?';   params.push(fecha_inicio); }
    if (fecha_fin)    { where += ' AND v.fecha_salida <= ?';   params.push(fecha_fin); }

    const [[t]] = await pool.query(
      `SELECT
          COUNT(*)                                  AS total_viajes,
          COALESCE(SUM(v.valor_flete_cobrado), 0)   AS total_fletes,
          COALESCE(SUM(v.total_gastos_directos), 0) AS total_gastos,
          COALESCE(SUM(v.saldo_manifiesto), 0)      AS total_saldos,
          COALESCE(SUM(v.km_recorridos), 0)         AS total_km
       FROM viajes v
       INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
       ${where}`,
      params
    );

    // Costos mensuales fijos de TODAS las placas registradas en los meses del período filtrado
    // (no solo las placas que tuvieron viajes)
    let costosFijos = 0;
    try {
      let cwhere = 'WHERE cvm.empresa_id = ?';
      const cparams = [empresaId];
      if (placa)        { cwhere += ' AND vh.placa LIKE ?'; cparams.push(`%${placa.toUpperCase()}%`); }
      if (fecha_inicio) {
        cwhere += " AND STR_TO_DATE(CONCAT(cvm.anio,'-',cvm.mes,'-01'),'%Y-%m-%d') >= STR_TO_DATE(CONCAT(YEAR(?),'-',MONTH(?),'-01'),'%Y-%m-%d')";
        cparams.push(fecha_inicio, fecha_inicio);
      }
      if (fecha_fin) {
        cwhere += " AND STR_TO_DATE(CONCAT(cvm.anio,'-',cvm.mes,'-01'),'%Y-%m-%d') <= ?";
        cparams.push(fecha_fin);
      }
      const [[cf]] = await pool.query(
        `SELECT COALESCE(SUM(cvm.total_costos_mes), 0) AS total_costos_fijos
         FROM costos_vehiculo_mensual cvm
         INNER JOIN vehiculos vh ON vh.id = cvm.vehiculo_id
         ${cwhere}`,
        cparams
      );
      costosFijos = parseFloat(cf.total_costos_fijos || 0);
    } catch (e) { /* tabla aún no creada */ }

    const fletes      = parseFloat(t.total_fletes || 0);
    const gastos      = parseFloat(t.total_gastos || 0);
    const costosTotal = gastos + costosFijos;
    const utilidad    = fletes - costosTotal;
    const margen       = fletes > 0      ? parseFloat(((utilidad / fletes) * 100).toFixed(2)) : 0;
    const rentabilidad = costosTotal > 0 ? parseFloat(((utilidad / costosTotal) * 100).toFixed(2)) : 0;

    return ok(res, {
      total_viajes:       t.total_viajes,
      total_fletes:       fletes,
      total_gastos:       gastos,
      total_costos_fijos: costosFijos,
      total_costos:       costosTotal,
      total_saldos:       parseFloat(t.total_saldos || 0),
      total_km:           parseFloat(t.total_km || 0),
      utilidad,
      margen_pct:       margen,
      rentabilidad_pct: rentabilidad,
    });
  } catch (err) { next(err); }
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
  resumenFiltrado,
};
