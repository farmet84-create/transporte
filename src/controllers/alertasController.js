'use strict';

const { pool } = require('../config/database');
const { ok } = require('../utils/helpers');

// Función central que genera todas las alertas
async function obtenerAlertas(empresaId) {
  const hoy = new Date();
  const alertas = [];

  // ─── VEHÍCULOS ───────────────────────────────────────────
  const [vehiculos] = await pool.query(
    `SELECT id, placa, marca, modelo,
            soat_vencimiento, tecnomecanica_vencimiento
     FROM vehiculos
     WHERE empresa_id = ? AND activo = 1 AND eliminado_en IS NULL`,
    [empresaId]
  );

  for (const v of vehiculos) {
    const nombre = `${v.placa} — ${v.marca} ${v.modelo}`

    // SOAT
    if (!v.soat_vencimiento) {
      alertas.push({ tipo: 'danger', categoria: 'vehiculo', icono: '🛡️',
        titulo: 'SOAT sin registrar', descripcion: `${nombre} no tiene SOAT registrado`,
        vehiculo_id: v.id, placa: v.placa })
    } else {
      const dias = Math.ceil((new Date(v.soat_vencimiento) - hoy) / 86400000)
      if (dias < 0)
        alertas.push({ tipo: 'danger', categoria: 'vehiculo', icono: '🛡️',
          titulo: 'SOAT VENCIDO', descripcion: `${nombre} — SOAT venció hace ${Math.abs(dias)} días`,
          vehiculo_id: v.id, placa: v.placa, dias })
      else if (dias <= 30)
        alertas.push({ tipo: dias <= 10 ? 'danger' : 'warning', categoria: 'vehiculo', icono: '🛡️',
          titulo: `SOAT vence en ${dias} días`, descripcion: `${nombre}`,
          vehiculo_id: v.id, placa: v.placa, dias })
    }

    // Tecnomecánica
    if (!v.tecnomecanica_vencimiento) {
      alertas.push({ tipo: 'warning', categoria: 'vehiculo', icono: '🔧',
        titulo: 'Tecnomecánica sin registrar', descripcion: `${nombre} no tiene tecnomecánica registrada`,
        vehiculo_id: v.id, placa: v.placa })
    } else {
      const dias = Math.ceil((new Date(v.tecnomecanica_vencimiento) - hoy) / 86400000)
      if (dias < 0)
        alertas.push({ tipo: 'danger', categoria: 'vehiculo', icono: '🔧',
          titulo: 'Tecnomecánica VENCIDA', descripcion: `${nombre} — venció hace ${Math.abs(dias)} días`,
          vehiculo_id: v.id, placa: v.placa, dias })
      else if (dias <= 30)
        alertas.push({ tipo: dias <= 10 ? 'danger' : 'warning', categoria: 'vehiculo', icono: '🔧',
          titulo: `Tecnomecánica vence en ${dias} días`, descripcion: `${nombre}`,
          vehiculo_id: v.id, placa: v.placa, dias })
    }
  }

  // ─── MANTENIMIENTO (semáforo) ────────────────────────────
  try {
    const [mant] = await pool.query(
      `SELECT m.semaforo, m.pendientes, m.proximo_mant_fecha, m.proximo_mant_km,
              v.placa, v.marca, v.modelo
       FROM mantenimiento_vehiculo m
       INNER JOIN vehiculos v ON v.id = m.vehiculo_id
       WHERE m.empresa_id = ? AND v.activo = 1 AND v.eliminado_en IS NULL
         AND m.semaforo IN ('rojo','amarillo')`,
      [empresaId]
    );
    for (const m of mant) {
      const nombre = `${m.placa} — ${m.marca} ${m.modelo}`
      const detalle = m.pendientes ? m.pendientes : 'Próximo mantenimiento pendiente'
      alertas.push({
        tipo: m.semaforo === 'rojo' ? 'danger' : 'warning',
        categoria: 'vehiculo', icono: '🔧',
        titulo: m.semaforo === 'rojo' ? 'Mantenimiento URGENTE' : 'Mantenimiento próximo',
        descripcion: `${nombre} — ${detalle}`,
        placa: m.placa,
      })
    }
  } catch (e) { /* tabla aún no creada */ }

  // ─── CONDUCTORES ─────────────────────────────────────────
  const [conductores] = await pool.query(
    `SELECT id, nombres, apellidos, numero_licencia, vencimiento_licencia
     FROM conductores
     WHERE empresa_id = ? AND activo = 1 AND eliminado_en IS NULL`,
    [empresaId]
  );

  for (const c of conductores) {
    const nombre = `${c.nombres} ${c.apellidos}`
    if (!c.vencimiento_licencia) {
      alertas.push({ tipo: 'info', categoria: 'conductor', icono: '🪪',
        titulo: 'Licencia sin registrar', descripcion: `${nombre} no tiene fecha de vencimiento de licencia`,
        conductor_id: c.id })
    } else {
      const dias = Math.ceil((new Date(c.vencimiento_licencia) - hoy) / 86400000)
      if (dias < 0)
        alertas.push({ tipo: 'danger', categoria: 'conductor', icono: '🪪',
          titulo: 'Licencia VENCIDA', descripcion: `${nombre} — venció hace ${Math.abs(dias)} días`,
          conductor_id: c.id, dias })
      else if (dias <= 30)
        alertas.push({ tipo: dias <= 10 ? 'danger' : 'warning', categoria: 'conductor', icono: '🪪',
          titulo: `Licencia vence en ${dias} días`, descripcion: `${nombre}`,
          conductor_id: c.id, dias })
    }
  }

  // ─── VIAJES ──────────────────────────────────────────────
  const [viajesProgr] = await pool.query(
    `SELECT v.id, v.numero_viaje, v.fecha_salida, v.estado,
            vh.placa, CONCAT(c.nombres,' ',c.apellidos) AS conductor
     FROM viajes v
     INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
     INNER JOIN conductores c ON c.id = v.conductor_id
     WHERE v.empresa_id = ? AND v.eliminado_en IS NULL
       AND v.estado IN ('programado','en_curso')`,
    [empresaId]
  );

  for (const v of viajesProgr) {
    const dias = Math.ceil((hoy - new Date(v.fecha_salida)) / 86400000)
    if (v.estado === 'programado' && dias > 3)
      alertas.push({ tipo: 'warning', categoria: 'viaje', icono: '🚛',
        titulo: `Viaje programado hace ${dias} días`, descripcion: `${v.numero_viaje} — ${v.placa} / ${v.conductor}`,
        viaje_id: v.id })
    if (v.estado === 'en_curso' && dias > 5)
      alertas.push({ tipo: 'warning', categoria: 'viaje', icono: '🚛',
        titulo: `Viaje en curso hace ${dias} días`, descripcion: `${v.numero_viaje} — ${v.placa} / ${v.conductor}`,
        viaje_id: v.id })
  }

  // Viajes con rentabilidad negativa
  const [viajesPerdida] = await pool.query(
    `SELECT v.id, v.numero_viaje, v.utilidad_bruta, vh.placa
     FROM viajes v
     INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
     WHERE v.empresa_id = ? AND v.eliminado_en IS NULL
       AND v.estado = 'completado' AND v.utilidad_bruta < 0
       AND v.fecha_salida >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [empresaId]
  );

  for (const v of viajesPerdida) {
    alertas.push({ tipo: 'danger', categoria: 'financiero', icono: '📉',
      titulo: 'Viaje con pérdida', descripcion: `${v.numero_viaje} — ${v.placa} perdió $${Math.abs(v.utilidad_bruta).toLocaleString('es-CO')}`,
      viaje_id: v.id })
  }

  // ─── COSTOS ──────────────────────────────────────────────
  const anio = hoy.getFullYear()
  const mes  = hoy.getMonth() + 1

  const [costosOp] = await pool.query(
    `SELECT COUNT(*) AS total FROM costos_operacion_mensual
     WHERE empresa_id = ? AND anio = ? AND mes = ?`,
    [empresaId, anio, mes]
  );
  if (costosOp[0].total === 0)
    alertas.push({ tipo: 'info', categoria: 'financiero', icono: '💰',
      titulo: 'Sin costos de operación', descripcion: `No has registrado costos de operación para este mes` })

  const [costosAdm] = await pool.query(
    `SELECT COUNT(*) AS total FROM costos_administrativos_mensual
     WHERE empresa_id = ? AND anio = ? AND mes = ?`,
    [empresaId, anio, mes]
  );
  if (costosAdm[0].total === 0)
    alertas.push({ tipo: 'info', categoria: 'financiero', icono: '🏢',
      titulo: 'Sin costos administrativos', descripcion: `No has registrado costos administrativos para este mes` })

  // Ordenar: danger primero, luego warning, luego info
  const orden = { danger: 0, warning: 1, info: 2 }
  alertas.sort((a, b) => orden[a.tipo] - orden[b.tipo])

  return alertas
}

// GET /api/alertas
async function listar(req, res, next) {
  try {
    const alertas = await obtenerAlertas(req.usuario.empresa_id)
    return ok(res, {
      alertas,
      resumen: {
        total:   alertas.length,
        danger:  alertas.filter(a => a.tipo === 'danger').length,
        warning: alertas.filter(a => a.tipo === 'warning').length,
        info:    alertas.filter(a => a.tipo === 'info').length,
      }
    })
  } catch (err) { next(err); }
}

module.exports = { listar };
