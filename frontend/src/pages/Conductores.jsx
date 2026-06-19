'use strict';

const { pool } = require('../config/database');
const {
  ok, error, nuevoUuid, paginar, respuestaPaginada,
  registrarAuditoria, generarNumeroViaje
} = require('../utils/helpers');

// GET /api/viajes
async function listar(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { pagina, limite, offset } = paginar(req.query);
    const { placa, conductor_id, cliente_id, estado, fecha_inicio, fecha_fin } = req.query;

    let joins  = `INNER JOIN vehiculos  vh ON vh.id = v.vehiculo_id
                  INNER JOIN conductores c  ON c.id  = v.conductor_id
                  INNER JOIN clientes   cl ON cl.id  = v.cliente_id`;
    let where  = `WHERE v.empresa_id = ? AND v.eliminado_en IS NULL`;
    const params = [empresaId];

    if (placa)        { where += ' AND vh.placa LIKE ?';     params.push(`%${placa.toUpperCase()}%`); }
    if (conductor_id) { where += ' AND v.conductor_id = ?';  params.push(conductor_id); }
    if (cliente_id)   { where += ' AND v.cliente_id = ?';    params.push(cliente_id); }
    if (estado)       { where += ' AND v.estado = ?';        params.push(estado); }
    if (fecha_inicio) { where += ' AND v.fecha_salida >= ?'; params.push(fecha_inicio); }
    if (fecha_fin)    { where += ' AND v.fecha_salida <= ?'; params.push(fecha_fin); }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM viajes v ${joins} ${where}`, params
    );

    const [rows] = await pool.query(
      `SELECT v.id, v.uuid, v.numero_viaje, v.fecha_salida, v.hora_salida,
          v.fecha_llegada, v.hora_llegada, v.km_recorridos,
          v.origen, v.destino, v.estado,
          v.numero_manifiesto, v.tipo_carga, v.peso_carga_kg,
          v.valor_manifiesto, v.anticipo, v.descuento_manifiesto, v.saldo_manifiesto,
          v.valor_flete_cobrado, v.total_ingresos, v.total_costos,
          v.utilidad_bruta, v.utilidad_neta, v.rentabilidad_pct,
          v.facturado, v.creado_en,
          vh.placa, vh.marca, vh.modelo,
          CONCAT(c.nombres,' ',c.apellidos) AS conductor,
          cl.razon_social AS cliente
       FROM viajes v ${joins} ${where}
       ORDER BY v.fecha_salida DESC, v.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );

    return respuestaPaginada(res, rows, total, pagina, limite);
  } catch (err) { next(err); }
}

// GET /api/viajes/:id
async function obtener(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT v.*,
          vh.placa, vh.marca, vh.modelo, vh.tipo AS tipo_vehiculo,
          vh.rendimiento_km_galon,
          CONCAT(c.nombres,' ',c.apellidos) AS conductor,
          c.numero_documento, c.telefono AS telefono_conductor,
          cl.razon_social AS nombre_cliente, cl.nit AS nit_cliente,
          r.nombre AS ruta_nombre
       FROM viajes v
       INNER JOIN vehiculos   vh ON vh.id = v.vehiculo_id
       INNER JOIN conductores  c ON c.id  = v.conductor_id
       INNER JOIN clientes    cl ON cl.id = v.cliente_id
       LEFT  JOIN rutas        r ON r.id  = v.ruta_id
       WHERE v.id = ? AND v.empresa_id = ? AND v.eliminado_en IS NULL`,
      [req.params.id, req.usuario.empresa_id]
    );

    if (!rows.length) return error(res, 'Viaje no encontrado', 404);

    const [gastos] = await pool.query(
      `SELECT id, categoria, descripcion, valor, cantidad, unidad, proveedor, fecha
       FROM gastos_viaje
       WHERE viaje_id = ? AND eliminado_en IS NULL
       ORDER BY categoria, fecha`,
      [req.params.id]
    );

    const [combustible] = await pool.query(
      `SELECT id, uuid, nombre_estacion, km_inicial, km_final, km_recorridos,
              valor_galon, rendimiento_km_galon, galones_gastados, valor_total, fecha, observaciones
       FROM combustible_viaje
       WHERE viaje_id = ? AND eliminado_en IS NULL
       ORDER BY fecha, id`,
      [req.params.id]
    );

    // Lista de clientes para permitir cambio en edición
    const [clientes] = await pool.query(
      `SELECT id, razon_social, nit FROM clientes
       WHERE empresa_id = ? AND eliminado_en IS NULL AND activo = 1
       ORDER BY razon_social`,
      [req.usuario.empresa_id]
    );

    return ok(res, { ...rows[0], gastos, combustible, clientes });
  } catch (err) { next(err); }
}

// POST /api/viajes
async function crear(req, res, next) {
  try {
    const empresaId = req.usuario.empresa_id;
    const {
      vehiculo_id, conductor_id, cliente_id, ruta_id,
      origen, destino, fecha_salida, hora_salida, fecha_llegada, hora_llegada,
      km_recorridos, numero_manifiesto, fecha_manifiesto, tipo_carga, peso_carga_kg,
      valor_manifiesto, anticipo, descuento_manifiesto,
      valor_flete_cobrado, otros_ingresos, observaciones
    } = req.body;

    const anio = new Date(fecha_salida).getFullYear();
    const mes  = new Date(fecha_salida).getMonth() + 1;

    const [[costoOp]]    = await pool.query(
      `SELECT COALESCE(costo_por_km, 0) AS costo_por_km FROM costos_operacion_mensual
       WHERE vehiculo_id = ? AND anio = ? AND mes = ?`,
      [vehiculo_id, anio, mes]
    );
    const [[costoAdmin]] = await pool.query(
      `SELECT COALESCE(costo_por_viaje, 0) AS costo_por_viaje FROM costos_administrativos_mensual
       WHERE empresa_id = ? AND anio = ? AND mes = ?`,
      [empresaId, anio, mes]
    );

    const costoKm         = parseFloat(costoOp?.costo_por_km    || 0);
    const costoAdminViaje = parseFloat(costoAdmin?.costo_por_viaje || 0);
    const kmNum           = parseFloat(km_recorridos || 0);
    const uuid            = nuevoUuid();
    const numeroViaje     = await generarNumeroViaje(empresaId);

    const [result] = await pool.query(
      `INSERT INTO viajes (
          uuid, empresa_id, numero_viaje,
          vehiculo_id, conductor_id, cliente_id, ruta_id,
          origen, destino, fecha_salida, hora_salida, fecha_llegada, hora_llegada,
          km_recorridos, numero_manifiesto, fecha_manifiesto, tipo_carga, peso_carga_kg,
          valor_manifiesto, anticipo, descuento_manifiesto,
          valor_flete_cobrado, otros_ingresos,
          total_gastos_directos, costo_km_aplicado, total_costo_operacion_km,
          costo_admin_aplicado, estado, creado_por
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)`,
      [
        uuid, empresaId, numeroViaje,
        vehiculo_id, conductor_id, cliente_id, ruta_id || null,
        origen, destino, fecha_salida, hora_salida, fecha_llegada || null, hora_llegada || null,
        kmNum, numero_manifiesto || null, fecha_manifiesto || null,
        tipo_carga || null, peso_carga_kg || null,
        parseFloat(valor_manifiesto || 0),
        parseFloat(anticipo || 0),
        parseFloat(descuento_manifiesto || 0),
        parseFloat(valor_flete_cobrado || 0),
        parseFloat(otros_ingresos || 0),
        costoKm, kmNum * costoKm, costoAdminViaje, 'programado', req.usuario.id
      ]
    );

    const [nuevo] = await pool.query(
      `SELECT v.*, vh.placa, CONCAT(c.nombres,' ',c.apellidos) AS conductor,
              cl.razon_social AS cliente
       FROM viajes v
       INNER JOIN vehiculos   vh ON vh.id = v.vehiculo_id
       INNER JOIN conductores  c ON c.id  = v.conductor_id
       INNER JOIN clientes    cl ON cl.id = v.cliente_id
       WHERE v.id = ?`, [result.insertId]
    );

    return ok(res, nuevo[0], 'Viaje registrado correctamente', 201);
  } catch (err) { next(err); }
}

// PUT /api/viajes/:id — actualizar datos completos del viaje
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const [antes] = await pool.query(
      `SELECT * FROM viajes WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL`,
      [id, empresaId]
    );
    if (!antes.length) return error(res, 'Viaje no encontrado', 404);

    const {
      cliente_id, origen, destino, fecha_salida, hora_salida,
      fecha_llegada, hora_llegada, km_recorridos,
      numero_manifiesto, fecha_manifiesto, tipo_carga,
      peso_carga_kg, valor_manifiesto, anticipo, descuento_manifiesto,
      valor_flete_cobrado, otros_ingresos, observaciones
    } = req.body;

    const kmNum = parseFloat(km_recorridos || antes[0].km_recorridos);

    await pool.query(
      `UPDATE viajes SET
        cliente_id = ?,
        origen = ?, destino = ?,
        fecha_salida = ?, hora_salida = ?,
        fecha_llegada = ?, hora_llegada = ?,
        km_recorridos = ?,
        total_costo_operacion_km = ? * costo_km_aplicado,
        numero_manifiesto = ?, fecha_manifiesto = ?,
        tipo_carga = ?, peso_carga_kg = ?,
        valor_manifiesto = ?,
        anticipo = ?,
        descuento_manifiesto = ?,
        valor_flete_cobrado = ?,
        otros_ingresos = ?,
        observaciones = ?,
        actualizado_en = NOW(), actualizado_por = ?
       WHERE id = ? AND empresa_id = ?`,
      [
        cliente_id            || antes[0].cliente_id,
        origen                || antes[0].origen,
        destino               || antes[0].destino,
        fecha_salida          || antes[0].fecha_salida,
        hora_salida           || antes[0].hora_salida,
        fecha_llegada         || null,
        hora_llegada          || null,
        kmNum, kmNum,
        numero_manifiesto     || null,
        fecha_manifiesto      || null,
        tipo_carga            || null,
        parseFloat(peso_carga_kg        || 0) || null,
        parseFloat(valor_manifiesto     || 0),
        parseFloat(anticipo             || 0),
        parseFloat(descuento_manifiesto || 0),
        parseFloat(valor_flete_cobrado  || 0),
        parseFloat(otros_ingresos       || 0),
        observaciones || null,
        req.usuario.id, id, empresaId
      ]
    );

    const [actualizado] = await pool.query(
      `SELECT v.*, vh.placa, CONCAT(c.nombres,' ',c.apellidos) AS conductor,
              cl.razon_social AS nombre_cliente
       FROM viajes v
       INNER JOIN vehiculos   vh ON vh.id = v.vehiculo_id
       INNER JOIN conductores  c ON c.id  = v.conductor_id
       INNER JOIN clientes    cl ON cl.id = v.cliente_id
       WHERE v.id = ?`, [id]
    );

    return ok(res, actualizado[0], 'Viaje actualizado');
  } catch (err) { next(err); }
}

// PUT /api/viajes/:id/estado
async function cambiarEstado(req, res, next) {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const empresaId = req.usuario.empresa_id;

    const estadosValidos = ['programado','en_curso','completado','cancelado','liquidado'];
    if (!estadosValidos.includes(estado))
      return error(res, `Estado inválido`, 400);

    const [rows] = await pool.query(
      `SELECT id FROM viajes WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL`,
      [id, empresaId]
    );
    if (!rows.length) return error(res, 'Viaje no encontrado', 404);

    await pool.query(
      `UPDATE viajes SET estado = ?, actualizado_en = NOW(), actualizado_por = ? WHERE id = ?`,
      [estado, req.usuario.id, id]
    );

    if (estado === 'completado') {
      const [viajeData] = await pool.query(`SELECT fecha_salida FROM viajes WHERE id = ?`, [id]);
      const anio = new Date(viajeData[0].fecha_salida).getFullYear();
      const mes  = new Date(viajeData[0].fecha_salida).getMonth() + 1;
      await pool.query(
        `UPDATE costos_administrativos_mensual
         SET total_viajes_mes = (
           SELECT COUNT(*) FROM viajes
           WHERE empresa_id = ? AND YEAR(fecha_salida) = ? AND MONTH(fecha_salida) = ?
           AND estado = 'completado' AND eliminado_en IS NULL
         )
         WHERE empresa_id = ? AND anio = ? AND mes = ?`,
        [empresaId, anio, mes, empresaId, anio, mes]
      );
    }

    return ok(res, { id, estado }, 'Estado actualizado');
  } catch (err) { next(err); }
}

// POST /api/viajes/:id/gastos
async function agregarGasto(req, res, next) {
  try {
    const viajeId   = req.params.id;
    const empresaId = req.usuario.empresa_id;
    const { categoria, descripcion, valor, cantidad, unidad, proveedor, fecha } = req.body;

    const [viaje] = await pool.query(
      `SELECT id FROM viajes WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL`,
      [viajeId, empresaId]
    );
    if (!viaje.length) return error(res, 'Viaje no encontrado', 404);

    const uuid = nuevoUuid();
    const [result] = await pool.query(
      `INSERT INTO gastos_viaje
        (uuid, empresa_id, viaje_id, categoria, descripcion, valor, cantidad, unidad, proveedor, fecha, creado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [uuid, empresaId, viajeId, categoria, descripcion || null,
       parseFloat(valor), parseFloat(cantidad || 1), unidad || null,
       proveedor || null, fecha, req.usuario.id]
    );

    await recalcularGastosDirectos(viajeId);
    const [nuevo] = await pool.query(`SELECT * FROM gastos_viaje WHERE id = ?`, [result.insertId]);
    return ok(res, nuevo[0], 'Gasto registrado', 201);
  } catch (err) { next(err); }
}

// DELETE /api/viajes/:id/gastos/:gastoId
async function eliminarGasto(req, res, next) {
  try {
    const { id: viajeId, gastoId } = req.params;
    await pool.query(
      `UPDATE gastos_viaje SET eliminado_en = NOW() WHERE id = ? AND viaje_id = ?`,
      [gastoId, viajeId]
    );
    await recalcularGastosDirectos(viajeId);
    return ok(res, null, 'Gasto eliminado');
  } catch (err) { next(err); }
}

// POST /api/viajes/:id/combustible
async function agregarCombustible(req, res, next) {
  try {
    const viajeId   = req.params.id;
    const empresaId = req.usuario.empresa_id;
    const { nombre_estacion, km_inicial, km_final, valor_galon, fecha, observaciones } = req.body;

    const [viajeData] = await pool.query(
      `SELECT v.vehiculo_id, vh.rendimiento_km_galon
       FROM viajes v
       INNER JOIN vehiculos vh ON vh.id = v.vehiculo_id
       WHERE v.id = ? AND v.empresa_id = ?`,
      [viajeId, empresaId]
    );
    if (!viajeData.length) return error(res, 'Viaje no encontrado', 404);

    const rendimiento = parseFloat(viajeData[0].rendimiento_km_galon || 0);
    if (rendimiento === 0)
      return error(res, 'El vehículo no tiene rendimiento km/galón. Actualízalo primero en Vehículos.', 400);

    const uuid = nuevoUuid();
    const [result] = await pool.query(
      `INSERT INTO combustible_viaje
        (uuid, empresa_id, viaje_id, nombre_estacion, km_inicial, km_final,
         valor_galon, rendimiento_km_galon, fecha, observaciones, creado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [uuid, empresaId, viajeId, nombre_estacion,
       parseFloat(km_inicial), parseFloat(km_final),
       parseFloat(valor_galon), rendimiento,
       fecha, observaciones || null, req.usuario.id]
    );

    const [nuevo] = await pool.query(
      `SELECT * FROM combustible_viaje WHERE id = ?`, [result.insertId]
    );
    return ok(res, nuevo[0], 'Carga de combustible registrada', 201);
  } catch (err) { next(err); }
}

// DELETE /api/viajes/:id/combustible/:cId
async function eliminarCombustible(req, res, next) {
  try {
    const { id: viajeId, cId } = req.params;
    await pool.query(
      `UPDATE combustible_viaje SET eliminado_en = NOW() WHERE id = ? AND viaje_id = ?`,
      [cId, viajeId]
    );
    return ok(res, null, 'Registro eliminado');
  } catch (err) { next(err); }
}

// DELETE /api/viajes/:id
async function eliminarViaje(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const [rows] = await pool.query(
      `SELECT id FROM viajes WHERE id = ? AND empresa_id = ? AND eliminado_en IS NULL`,
      [id, empresaId]
    );
    if (!rows.length) return error(res, 'Viaje no encontrado', 404);
    await pool.query(
      `UPDATE viajes SET eliminado_en = NOW(), actualizado_por = ? WHERE id = ?`,
      [req.usuario.id, id]
    );
    return ok(res, null, 'Viaje eliminado');
  } catch (err) { next(err); }
}

async function recalcularGastosDirectos(viajeId) {
  await pool.query(
    `UPDATE viajes
     SET total_gastos_directos = (
       SELECT COALESCE(SUM(valor), 0) FROM gastos_viaje
       WHERE viaje_id = ? AND eliminado_en IS NULL
     ), actualizado_en = NOW()
     WHERE id = ?`,
    [viajeId, viajeId]
  );
}

// GET /api/viajes/:id/rentabilidad
async function rentabilidad(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT v.numero_viaje, v.fecha_salida, v.origen, v.destino,
          v.km_recorridos, vh.placa,
          v.valor_manifiesto, v.anticipo, v.descuento_manifiesto, v.saldo_manifiesto,
          v.valor_flete_cobrado, v.total_ingresos,
          v.total_gastos_directos   AS bloque1_gastos_directos,
          v.costo_km_aplicado,
          v.total_costo_operacion_km AS bloque2_costo_operacion,
          v.costo_admin_aplicado    AS bloque3_costo_admin,
          v.total_costos, v.utilidad_bruta, v.utilidad_neta, v.rentabilidad_pct,
          CONCAT(c.nombres,' ',c.apellidos) AS conductor,
          cl.razon_social AS cliente
       FROM viajes v
       INNER JOIN vehiculos   vh ON vh.id = v.vehiculo_id
       INNER JOIN conductores  c ON c.id  = v.conductor_id
       INNER JOIN clientes    cl ON cl.id = v.cliente_id
       WHERE v.id = ? AND v.empresa_id = ?`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (!rows.length) return error(res, 'Viaje no encontrado', 404);
    return ok(res, rows[0]);
  } catch (err) { next(err); }
}

module.exports = {
  listar, obtener, crear, actualizar, cambiarEstado,
  agregarGasto, eliminarGasto,
  agregarCombustible, eliminarCombustible,
  rentabilidad, eliminarViaje
};
