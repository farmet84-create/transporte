'use strict';

const { v4: uuidv4 } = require('uuid');
const { pool }       = require('../config/database');

// Respuesta estándar exitosa
const ok = (res, datos = null, mensaje = 'OK', status = 200) =>
  res.status(status).json({ ok: true, mensaje, datos });

// Respuesta de error controlada
const error = (res, mensaje = 'Error', status = 400, errores = null) =>
  res.status(status).json({ ok: false, mensaje, ...(errores && { errores }) });

// Generar UUID v4
const nuevoUuid = () => uuidv4();

// Generar número de viaje correlativo por empresa
async function generarNumeroViaje(empresaId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM viajes WHERE empresa_id = ?`,
    [empresaId]
  );
  const correlativo = String(rows[0].total + 1).padStart(5, '0');
  const anio = new Date().getFullYear();
  return `VJ-${anio}-${correlativo}`;
}

// Registrar en auditoría
async function registrarAuditoria({ empresaId, usuarioId, tabla, registroId, accion, datoAntes, datoDespues, ip, userAgent }) {
  try {
    await pool.query(
      `INSERT INTO auditoria (empresa_id, usuario_id, tabla, registro_id, accion, datos_antes, datos_despues, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresaId, usuarioId, tabla, registroId, accion,
        datoAntes   ? JSON.stringify(datoAntes)   : null,
        datoDespues ? JSON.stringify(datoDespues) : null,
        ip, userAgent
      ]
    );
  } catch (err) {
    // La auditoría nunca debe romper el flujo principal
    require('../config/logger').error('Error en auditoría', { err: err.message });
  }
}

// Construir cláusula de paginación
function paginar(query = {}) {
  const pagina  = Math.max(1, parseInt(query.pagina)  || 1);
  const limite  = Math.min(100, parseInt(query.limite) || 20);
  const offset  = (pagina - 1) * limite;
  return { pagina, limite, offset };
}

// Formatear respuesta paginada
function respuestaPaginada(res, datos, total, pagina, limite) {
  return res.json({
    ok: true,
    datos,
    paginacion: {
      total,
      pagina,
      limite,
      paginas: Math.ceil(total / limite),
    }
  });
}

module.exports = {
  ok,
  error,
  nuevoUuid,
  generarNumeroViaje,
  registrarAuditoria,
  paginar,
  respuestaPaginada,
};
