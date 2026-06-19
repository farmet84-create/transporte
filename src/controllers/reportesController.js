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
          SUM(total_costos)                 AS total_costos,
          SUM(utilidad_neta)                AS total_utilidad,
          ROUND(AVG(rentabilidad_pct), 2)   AS rentabilidad_promedio,
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
              SUM(utilidad_neta) AS total_utilidad,
              ROUND(AVG(rentabilidad_pct),2) AS rentabilidad_promedio
       FROM viajes
       WHERE empresa_id = ? AND YEAR(fecha_salida) = ? AND MONTH(fecha_salida) = ?
         AND eliminado_en IS NULL`,
      [empresaId, anioAnterior, mesAnterior]
    );

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
// Incluye: costos del viaje + costos operación mensual vehículo + salario conductor + costos admin
async function rentabilidadPorVehiculo(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { anio, mes, placa } = req.query;

    let where = 'WHERE v.empresa_id = ? AND v.eliminado_en IS NULL AND v.estado = "completado"';
    const params = [empresaId];
    if (anio)  { where += ' AND YEAR(v.fecha_salida) = ?';  params.push(parseInt(anio)); }
    if (mes)   { where += ' AND MONTH(v.fecha_salida) = ?'; params.push(parseInt(mes)); }
    if (placa) { where += ' AND vh.placa LIKE ?';           params.push(`%${placa.toUpperCase()}%`); }

    // 1. Datos base de viajes por vehículo
    const [viajes] = await pool.query(
      `SELECT
          vh.id AS vehiculo_id,
          vh.placa,
          CONCAT(vh.marca,' ',vh.modelo) AS vehiculo,
          YEAR(v.fecha_salida)  AS anio,
          MONTH(v.fecha_salida) AS mes,
          COUNT(v.id)                     AS total_viajes,
          SUM(v.km_recorridos)            AS total_km,
          SUM(v.valor_flete_cobrado)      AS total_ingresos,
          SUM(v.total_gastos_directos)    AS total_gastos_directos,
          SUM(v.costo_admin_aplicado)     AS total_costo_admin_viajes,
          -- Conductor más frecuente del vehículo en el mes
          (SELECT c2.id FROM viajes v2
           INNER JOIN conductores c2 ON c2.id = v2.conductor_id
           WHERE v2.vehiculo_id = vh.id AND v2.empresa_id = v.empresa_id
             AND YEAR(v2.fecha_salida) = YEAR(v.fecha_salida)
             AND MONTH(v2.fecha_salida) = MONTH(v.fecha_salida)
             AND v2.eliminado_en IS NULL
           GROUP BY c2.id ORDER BY COUNT(*) DESC LIMIT 1
          ) AS conductor_id_principal
       FROM viajes v
       INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
       ${where}
       GROUP BY vh.id, vh.placa, vh.marca, vh.modelo,
                YEAR(v.fecha_salida), MONTH(v.fecha_salida)
       ORDER BY total_ingresos DESC`,
      params
    );

    // 2. Para cada vehículo, obtener costos mensuales y salario conductor
    const resultado = await Promise.all(viajes.map(async (v) => {
      // Costo operación mensual del vehículo
      const [[costoOp]] = await pool.query(
        `SELECT COALESCE(SUM(
            llantas + mantenimiento_preventivo + mantenimiento_correctivo +
            aceites_filtros + depreciacion + seguros + soat + tecnomecanica +
            impuestos + otros
          ), 0) AS total_operacion
         FROM costos_operacion_mensual
         WHERE empresa_id = ? AND vehiculo_id = ? AND anio = ? AND mes = ?`,
        [empresaId, v.vehiculo_id, v.anio, v.mes]
      );

      // Costos administrativos del mes (prorrateados por número de viajes del vehículo)
      const [[costoAdm]] = await pool.query(
        `SELECT COALESCE(salarios_conductores + prestaciones_sociales + seguridad_social +
            administracion + contabilidad + arrendamiento + servicios_publicos +
            comunicaciones + otros, 0) AS total_admin,
            COALESCE(total_viajes_mes, 1) AS total_viajes_mes
         FROM costos_administrativos_mensual
         WHERE empresa_id = ? AND anio = ? AND mes = ?
         LIMIT 1`,
        [empresaId, v.anio, v.mes]
      );

      // Salario + prestaciones del conductor principal
      let costoConduc = 0;
      if (v.conductor_id_principal) {
        const [[conduc]] = await pool.query(
          `SELECT COALESCE(salario_base, 0) + COALESCE(auxilio_transporte, 0) + COALESCE(comisiones, 0) AS total_nomina
           FROM conductores WHERE id = ?`,
          [v.conductor_id_principal]
        );
        costoConduc = parseFloat(conduc?.total_nomina || 0);
      }

      const costoOperacionMensual = parseFloat(costoOp?.total_operacion || 0);
      const totalViajesMes        = parseInt(costoAdm?.total_viajes_mes || 1);
      const costoAdminProrrateo   = parseFloat(costoAdm?.total_admin || 0) / totalViajesMes * parseInt(v.total_viajes);
      const costoGastoDirectos    = parseFloat(v.total_gastos_directos || 0);

      // Total costos completo
      const totalCostosCompleto = costoGastoDirectos + costoOperacionMensual + costoConduc + costoAdminProrrateo;
      const totalIngresos       = parseFloat(v.total_ingresos || 0);
      const utilidadReal        = totalIngresos - totalCostosCompleto;
      const rentabilidadReal    = totalIngresos > 0
        ? parseFloat(((utilidadReal / totalIngresos) * 100).toFixed(2))
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
        // Desglose de costos
        costos_gastos_directos:   costoGastoDirectos,
        costos_operacion_mensual: costoOperacionMensual,
        costos_conductor:         costoConduc,
        costos_admin_prorrateo:   parseFloat(costoAdminProrrateo.toFixed(2)),
        total_costos:             parseFloat(totalCostosCompleto.toFixed(2)),
        // Utilidad y rentabilidad REAL
        total_utilidad:           parseFloat(utilidadReal.toFixed(2)),
        rentabilidad_promedio_pct: rentabilidadReal,
      };
    }));

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
          COALESCE(c.salario_base, 0) + COALESCE(c.auxilio_transporte, 0) + COALESCE(c.comisiones, 0) AS costo_nomina,
          COUNT(v.id)                       AS total_viajes,
          SUM(v.km_recorridos)              AS total_km,
          SUM(v.valor_flete_cobrado)        AS total_ingresos,
          SUM(v.total_gastos_directos)      AS total_gastos_directos,
          SUM(v.total_costos)               AS total_costos_viajes,
          SUM(v.utilidad_neta)              AS total_utilidad,
          ROUND(AVG(v.rentabilidad_pct),2)  AS rentabilidad_promedio_pct
       FROM viajes v
       INNER JOIN conductores c ON c.id = v.conductor_id
       ${where}
       GROUP BY c.id, c.nombres, c.apellidos, c.numero_documento,
                c.salario_base, c.auxilio_transporte, c.comisiones
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
};
