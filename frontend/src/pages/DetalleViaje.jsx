 import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Truck, User, Building2, MapPin, Plus, Trash2, Edit2, Save, X, Fuel } from 'lucide-react'
import toast from 'react-hot-toast'
import { viajesAPI } from '../services/api'
import { formatCOP, formatFecha, formatHora, formatNum, badgeEstado, labelEstado } from '../utils/format'

const ESTADOS = ['programado','en_curso','completado','radicado','pendiente_pago','cancelado','liquidado']

const CATEGORIAS_GASTO = [
  { value: 'combustible',    label: 'Combustible (ACPM)' },
  { value: 'peajes',         label: 'Peajes' },
  { value: 'viaticos',       label: 'Viáticos conductor' },
  { value: 'parqueadero',    label: 'Parqueadero' },
  { value: 'lavado',         label: 'Lavado vehículo' },
  { value: 'adblue',         label: 'AdBlue' },
  { value: 'comision_carga', label: 'Comisión por carga' },
  { value: 'cargue',         label: 'Cargue' },
  { value: 'descargue',      label: 'Descargue' },
  { value: 'retiro_bancario',label: 'Retiro bancario' },
  { value: 'bascula',        label: 'Báscula' },
  { value: 'sobrepeso',      label: 'Sobrepeso' },
  { value: 'otro',           label: 'Otro gasto' },
]

const CIUDADES = [
  'Apartadó','Arauca','Armenia','Barrancabermeja','Barranquilla','Bello','Bogotá',
  'Bucaramanga','Buenaventura','Cali','Cartagena','Caucasia','Chía','Cúcuta',
  'Duitama','Espinal','Facatativá','Florencia','Fusagasugá','Girardot','Ibagué',
  'Itagüí','Leticia','Manizales','Medellín','Mitú','Mocoa','Montería','Mosquera',
  'Neiva','Palmira','Pasto','Pereira','Popayán','Puerto Carreño','Quibdó',
  'Riohacha','San Andrés','Santa Marta','Sincelejo','Soacha','Sogamoso','Soledad',
  'Tunja','Turbo','Valledupar','Villavicencio','Yopal','Zipaquirá'
].sort()

const FilaCosto = ({ label, valor, color = 'gray', sub }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
    <div>
      <span className="text-sm text-gray-600">{label}</span>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
    <span className={`font-semibold text-sm ${color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : 'text-gray-900'}`}>
      {formatCOP(valor)}
    </span>
  </div>
)

// FIX: extrae YYYY-MM-DD sin conversión de zona horaria
const soloFecha = (val) => {
  if (!val) return ''
  return val.substring(0, 10)
}

// FIX: extrae HH:MM sin conversión de zona horaria
const soloHora = (val) => {
  if (!val) return ''
  if (val.length <= 5) return val
  // Si viene como "HH:MM:SS" extraer solo HH:MM
  return val.substring(0, 5)
}

export default function DetalleViaje() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [viaje, setViaje]         = useState(null)
  const [cargando, setCargando]   = useState(true)
  const [editando, setEditando]   = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [formViaje, setFormViaje] = useState({})
  const setF = (k, v) => setFormViaje(f => ({ ...f, [k]: v }))

  const [nuevoGasto, setNuevoGasto]         = useState({ categoria: 'combustible', descripcion: '', valor: '', cantidad: 1 })
  const [agregandoGasto, setAgregandoGasto] = useState(false)

  const [nuevoGastoPreop, setNuevoGastoPreop]         = useState({ categoria: 'combustible', descripcion: '', valor: '', cantidad: 1 })
  const [agregandoGastoPreop, setAgregandoGastoPreop] = useState(false)

  const COMB_INICIAL = { nombre_estacion: '', km_inicial: '', km_final: '', valor_galon: '', fecha: new Date().toISOString().substring(0,10), observaciones: '' }
  const [nuevoComb, setNuevoComb]         = useState(COMB_INICIAL)
  const [agregandoComb, setAgregandoComb] = useState(false)

  const cargar = async () => {
    try {
      const res = await viajesAPI.obtener(id)
      setViaje(res.data.datos)
      setFormViaje(res.data.datos)
    } catch {
      toast.error('Error cargando el viaje')
      navigate('/viajes')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [id])

  // Total costos = solo gastos directos del viaje
  const flete         = parseFloat(viaje?.valor_flete_cobrado || 0)
  const totalCostos   = parseFloat(viaje?.total_gastos_directos || 0)
  const utilidadBruta = flete - totalCostos
  const margen        = flete > 0 ? (utilidadBruta / flete) * 100 : 0
  const rentabilidad  = totalCostos > 0 ? (utilidadBruta / totalCostos) * 100 : 0
  const colorPct = v => v >= 20 ? 'text-green-600' : v >= 10 ? 'text-yellow-600' : v >= 0 ? 'text-orange-500' : 'text-red-600'
  const bgPct    = v => v >= 20 ? 'border-green-200 bg-green-50' : v >= 0 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'

  const totalCombustible = (viaje?.combustible || []).reduce((s, c) => s + parseFloat(c.valor_total || 0), 0)
  const totalGalones     = (viaje?.combustible || []).reduce((s, c) => s + parseFloat(c.galones_gastados || 0), 0)

  const cambiarEstado = async (nuevoEstado) => {
    setCambiandoEstado(true)
    try {
      await viajesAPI.cambiarEstado(id, nuevoEstado)
      setViaje(v => ({ ...v, estado: nuevoEstado }))
      toast.success(`Estado: ${labelEstado(nuevoEstado)}`)
    } catch { toast.error('Error actualizando estado') }
    finally { setCambiandoEstado(false) }
  }

  const guardarViaje = async () => {
    setGuardando(true)
    try {
      await viajesAPI.actualizar(id, {
        cliente_id:           formViaje.cliente_id,
        origen:               formViaje.origen,
        destino:              formViaje.destino,
        fecha_salida:         soloFecha(formViaje.fecha_salida),
        hora_salida:          soloHora(formViaje.hora_salida),
        fecha_llegada:        soloFecha(formViaje.fecha_llegada) || null,
        hora_llegada:         soloHora(formViaje.hora_llegada) || null,
        km_recorridos:        formViaje.km_recorridos,
        numero_manifiesto:    formViaje.numero_manifiesto,
        fecha_manifiesto:     soloFecha(formViaje.fecha_manifiesto) || null,
        tipo_carga:           formViaje.tipo_carga,
        peso_carga_kg:        formViaje.peso_carga_kg,
        valor_manifiesto:     parseFloat(formViaje.valor_manifiesto || 0),
        anticipo:             parseFloat(formViaje.anticipo || 0),
        retenciones:          parseFloat(formViaje.retenciones || 0),
        descuento_manifiesto: parseFloat(formViaje.descuento_manifiesto || 0),
        valor_flete_cobrado:  parseFloat(formViaje.valor_flete_cobrado || 0),
        otros_ingresos:       parseFloat(formViaje.otros_ingresos || 0),
        observaciones:        formViaje.observaciones,
      })
      toast.success('Viaje actualizado')
      setEditando(false)
      cargar()
    } catch { toast.error('Error al guardar') }
    finally { setGuardando(false) }
  }

  const agregarGasto = async () => {
    if (!nuevoGasto.valor || parseFloat(nuevoGasto.valor) <= 0) { toast.error('Ingresa un valor válido'); return }
    setAgregandoGasto(true)
    try {
      await viajesAPI.agregarGasto(id, { ...nuevoGasto, valor: parseFloat(nuevoGasto.valor), fecha: soloFecha(viaje.fecha_salida) })
      toast.success('Gasto agregado')
      setNuevoGasto({ categoria: 'combustible', descripcion: '', valor: '', cantidad: 1 })
      cargar()
    } catch { toast.error('Error al agregar gasto') }
    finally { setAgregandoGasto(false) }
  }

  const eliminarGasto = async (gastoId) => {
    if (!confirm('¿Eliminar este gasto?')) return
    try {
      await viajesAPI.eliminarGasto(id, gastoId)
      toast.success('Gasto eliminado')
      cargar()
    } catch { toast.error('Error al eliminar') }
  }

  const agregarGastoPreop = async () => {
    if (!nuevoGastoPreop.valor || parseFloat(nuevoGastoPreop.valor) <= 0) { toast.error('Ingresa un valor válido'); return }
    setAgregandoGastoPreop(true)
    try {
      await viajesAPI.agregarGastoPreop(id, { ...nuevoGastoPreop, valor: parseFloat(nuevoGastoPreop.valor), fecha: soloFecha(viaje.fecha_salida) })
      toast.success('Gasto pre operacional agregado')
      setNuevoGastoPreop({ categoria: 'combustible', descripcion: '', valor: '', cantidad: 1 })
      cargar()
    } catch { toast.error('Error al agregar gasto') }
    finally { setAgregandoGastoPreop(false) }
  }

  const eliminarGastoPreop = async (gastoId) => {
    if (!confirm('¿Eliminar este gasto pre operacional?')) return
    try {
      await viajesAPI.eliminarGastoPreop(id, gastoId)
      toast.success('Gasto eliminado')
      cargar()
    } catch { toast.error('Error al eliminar') }
  }

  const totalGastosPreop = (viaje?.gastos_preop || []).reduce((s, g) => s + parseFloat(g.valor || 0), 0)

  const agregarCombustible = async () => {
    if (!nuevoComb.nombre_estacion) { toast.error('Ingresa el nombre de la estación'); return }
    if (!nuevoComb.km_inicial || !nuevoComb.km_final) { toast.error('Ingresa kilometraje inicial y final'); return }
    if (parseFloat(nuevoComb.km_final) <= parseFloat(nuevoComb.km_inicial)) { toast.error('El km final debe ser mayor al inicial'); return }
    if (!nuevoComb.valor_galon) { toast.error('Ingresa el valor del galón'); return }
    setAgregandoComb(true)
    try {
      await viajesAPI.agregarCombustible(id, nuevoComb)
      toast.success('Carga de combustible registrada')
      setNuevoComb(COMB_INICIAL)
      cargar()
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al registrar') }
    finally { setAgregandoComb(false) }
  }

  const eliminarCombustible = async (cId) => {
    if (!confirm('¿Eliminar este registro de combustible?')) return
    try {
      await viajesAPI.eliminarCombustible(id, cId)
      toast.success('Registro eliminado')
      cargar()
    } catch { toast.error('Error al eliminar') }
  }

  const kmComb       = nuevoComb.km_final && nuevoComb.km_inicial ? parseFloat(nuevoComb.km_final) - parseFloat(nuevoComb.km_inicial) : 0
  const rendViaje    = parseFloat(viaje?.rendimiento_km_galon || 0)
  const galonesEstim = rendViaje > 0 && kmComb > 0 ? (kmComb / rendViaje) : 0
  const valorEstim   = galonesEstim > 0 && nuevoComb.valor_galon ? galonesEstim * parseFloat(nuevoComb.valor_galon) : 0

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )
  if (!viaje) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{viaje.numero_viaje}</h1>
              <span className={badgeEstado(viaje.estado)}>{labelEstado(viaje.estado)}</span>
            </div>
            <p className="text-gray-500 text-sm">{formatFecha(viaje.fecha_salida)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditando(!editando)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${editando ? 'bg-gray-200 text-gray-700' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}>
            {editando ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            {editando ? 'Cancelar' : 'Editar viaje'}
          </button>
          <select value={viaje.estado} onChange={e => cambiarEstado(e.target.value)}
            disabled={cambiandoEstado} className="input w-auto text-sm">
            {ESTADOS.map(e => <option key={e} value={e}>{labelEstado(e)}</option>)}
          </select>
        </div>
      </div>

      {/* Indicadores */}
      <div className={`card p-6 border-2 ${bgPct(margen)}`}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">Flete cobrado</p>
            <p className="text-xl font-bold text-gray-900">{formatCOP(flete)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total costos</p>
            <p className="text-xl font-bold text-red-600">{formatCOP(totalCostos)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Utilidad bruta</p>
            <p className={`text-xl font-bold ${utilidadBruta >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(utilidadBruta)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Margen</p>
            <p className={`text-2xl font-black ${colorPct(margen)}`}>{margen.toFixed(1)}%</p>
            <p className="text-xs text-gray-400">Util. bruta / Flete</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Rentabilidad</p>
            <p className={`text-2xl font-black ${colorPct(rentabilidad)}`}>{rentabilidad.toFixed(1)}%</p>
            <p className="text-xs text-gray-400">Util. bruta / Costos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Info del viaje */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Información del viaje</h3>
              {editando && (
                <button onClick={guardarViaje} disabled={guardando}
                  className="btn-primary text-sm flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              )}
            </div>

            {editando ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Cliente</label>
                  <select value={formViaje.cliente_id} onChange={e => setF('cliente_id', e.target.value)} className="input">
                    <option value="">— Seleccionar cliente —</option>
                    {(viaje.clientes || []).map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Origen</label>
                  <input value={formViaje.origen || ''} onChange={e => setF('origen', e.target.value)}
                    placeholder="Ej: Bogotá" className="input" />
                </div>
                <div>
                  <label className="label">Destino</label>
                  <input value={formViaje.destino || ''} onChange={e => setF('destino', e.target.value)}
                    placeholder="Ej: Medellín" className="input" />
                </div>
                <div>
                  <label className="label">Fecha salida</label>
                  <input type="date" value={soloFecha(formViaje.fecha_salida)} onChange={e => setF('fecha_salida', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Hora salida</label>
                  <input type="time" value={soloHora(formViaje.hora_salida)} onChange={e => setF('hora_salida', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Fecha llegada</label>
                  <input type="date" value={soloFecha(formViaje.fecha_llegada)} onChange={e => setF('fecha_llegada', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Hora llegada</label>
                  <input type="time" value={soloHora(formViaje.hora_llegada)} onChange={e => setF('hora_llegada', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Km recorridos</label>
                  <input type="number" value={formViaje.km_recorridos} onChange={e => setF('km_recorridos', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Flete cobrado</label>
                  <input type="number" value={formViaje.valor_flete_cobrado} onChange={e => setF('valor_flete_cobrado', e.target.value)} className="input" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Vehículo</p>
                    <p className="font-mono font-bold text-gray-900">{viaje.placa}</p>
                    <p className="text-xs text-gray-500">{viaje.marca} {viaje.modelo}</p>
                    {viaje.rendimiento_km_galon && <p className="text-xs text-primary-600">{viaje.rendimiento_km_galon} km/galón</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Conductor</p>
                    <p className="font-medium text-gray-900">{viaje.conductor}</p>
                    <p className="text-xs text-gray-500">C.C. {viaje.numero_documento}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="font-medium text-gray-900">{viaje.nombre_cliente}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Ruta</p>
                    <p className="font-medium text-gray-900">{viaje.origen} → {viaje.destino}</p>
                    <p className="text-xs text-gray-500">{formatNum(viaje.km_recorridos)} km</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Salida</p>
                  <p className="font-medium text-gray-900">{formatFecha(viaje.fecha_salida)} {formatHora(viaje.hora_salida)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Llegada</p>
                  <p className="font-medium text-gray-900">
                    {viaje.fecha_llegada ? `${formatFecha(viaje.fecha_llegada)} ${formatHora(viaje.hora_llegada)}` : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* MANIFIESTO DE CARGA */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Manifiesto de carga</h3>
            {editando ? (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Número manifiesto</label>
                  <input value={formViaje.numero_manifiesto || ''} onChange={e => setF('numero_manifiesto', e.target.value)} className="input" /></div>
                <div><label className="label">Fecha manifiesto</label>
                  <input type="date" value={soloFecha(formViaje.fecha_manifiesto)} onChange={e => setF('fecha_manifiesto', e.target.value)} className="input" /></div>
                <div><label className="label">Tipo de carga</label>
                  <input value={formViaje.tipo_carga || ''} onChange={e => setF('tipo_carga', e.target.value)} className="input" /></div>
                <div><label className="label">Peso (kg)</label>
                  <input type="number" value={formViaje.peso_carga_kg || ''} onChange={e => setF('peso_carga_kg', e.target.value)} className="input" /></div>
                <div><label className="label">Valor manifiesto</label>
                  <input type="number" value={formViaje.valor_manifiesto || 0} onChange={e => setF('valor_manifiesto', e.target.value)} className="input" /></div>
                <div><label className="label">Flete cobrado al cliente</label>
                  <input type="number" value={formViaje.valor_flete_cobrado || 0} onChange={e => setF('valor_flete_cobrado', e.target.value)} className="input" /></div>
                <div><label className="label">Anticipo</label>
                  <input type="number" value={formViaje.anticipo || 0} onChange={e => setF('anticipo', e.target.value)} className="input" /></div>
                <div><label className="label">Retenciones</label>
                  <input type="number" value={formViaje.retenciones || 0} onChange={e => setF('retenciones', e.target.value)} className="input" /></div>
                <div className="md:col-span-2"><label className="label">Descuentos adicionales</label>
                  <input type="number" value={formViaje.descuento_manifiesto || 0} onChange={e => setF('descuento_manifiesto', e.target.value)} className="input" /></div>
                <div className="md:col-span-2">
                  <label className="label">Saldo a pagar (Manifiesto − Retenciones − Descuentos − Anticipo)</label>
                  <div className="input bg-gray-50 font-bold text-gray-900">
                    {formatCOP(
                      parseFloat(formViaje.valor_manifiesto||0)
                      - parseFloat(formViaje.retenciones||0)
                      - parseFloat(formViaje.descuento_manifiesto||0)
                      - parseFloat(formViaje.anticipo||0)
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Número:</span> <span className="font-medium">{viaje.numero_manifiesto || '—'}</span></div>
                <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatFecha(viaje.fecha_manifiesto)}</span></div>
                <div><span className="text-gray-500">Tipo de carga:</span> <span className="font-medium">{viaje.tipo_carga || '—'}</span></div>
                <div><span className="text-gray-500">Peso:</span> <span className="font-medium">{viaje.peso_carga_kg ? `${formatNum(viaje.peso_carga_kg)} kg` : '—'}</span></div>
                <div><span className="text-gray-500">Valor manifiesto:</span> <span className="font-bold">{formatCOP(viaje.valor_manifiesto)}</span></div>
                <div><span className="text-gray-500">Flete cobrado:</span> <span className="font-bold">{formatCOP(viaje.valor_flete_cobrado)}</span></div>
                <div><span className="text-gray-500">Anticipo:</span> <span className="font-semibold text-blue-600">{formatCOP(viaje.anticipo)}</span></div>
                <div><span className="text-gray-500">Retenciones:</span> <span className="font-semibold text-red-600">{formatCOP(viaje.retenciones)}</span></div>
                <div><span className="text-gray-500">Descuentos adicionales:</span> <span className="font-semibold text-red-600">{formatCOP(viaje.descuento_manifiesto)}</span></div>
                <div><span className="text-gray-500">Saldo a pagar:</span> <span className="font-bold text-green-600">{formatCOP(viaje.saldo_manifiesto)}</span></div>
              </div>
            )}
          </div>

          {/* GASTOS DEL VIAJE */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Gastos directos del viaje</h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Agregar gasto</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="label">Categoría</label>
                  <select value={nuevoGasto.categoria}
                    onChange={e => setNuevoGasto(g => ({ ...g, categoria: e.target.value }))}
                    className="input">
                    {CATEGORIAS_GASTO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <input value={nuevoGasto.descripcion}
                    onChange={e => setNuevoGasto(g => ({ ...g, descripcion: e.target.value }))}
                    placeholder="Opcional" className="input" />
                </div>
                <div>
                  <label className="label">Valor ($)</label>
                  <input type="number" value={nuevoGasto.valor}
                    onChange={e => setNuevoGasto(g => ({ ...g, valor: e.target.value }))}
                    placeholder="0" className="input" />
                </div>
                <button onClick={agregarGasto} disabled={agregandoGasto}
                  className="btn-primary flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  {agregandoGasto ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </div>

            {viaje.gastos?.length > 0 ? (
              <div className="space-y-2">
                {viaje.gastos.map(g => (
                  <div key={g.id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="badge-blue capitalize">{g.categoria.replace(/_/g,' ')}</span>
                      {g.descripcion && <span className="text-gray-500 text-xs">{g.descripcion}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-red-600">{formatCOP(g.valor)}</span>
                      <button onClick={() => eliminarGasto(g.id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t font-bold text-sm">
                  <span>Total gastos directos</span>
                  <span className="text-red-600">{formatCOP(viaje.total_gastos_directos)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">No hay gastos registrados</p>
            )}
          </div>

          {/* GASTOS PRE OPERACIONALES — informativo, no afecta rentabilidad */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Gastos pre operacionales</h3>
            <p className="text-xs text-gray-400 mb-4">Solo informativo — no afecta los costos ni la rentabilidad del viaje</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Agregar gasto</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="label">Categoría</label>
                  <select value={nuevoGastoPreop.categoria}
                    onChange={e => setNuevoGastoPreop(g => ({ ...g, categoria: e.target.value }))}
                    className="input">
                    {CATEGORIAS_GASTO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <input value={nuevoGastoPreop.descripcion}
                    onChange={e => setNuevoGastoPreop(g => ({ ...g, descripcion: e.target.value }))}
                    placeholder="Opcional" className="input" />
                </div>
                <div>
                  <label className="label">Valor ($)</label>
                  <input type="number" value={nuevoGastoPreop.valor}
                    onChange={e => setNuevoGastoPreop(g => ({ ...g, valor: e.target.value }))}
                    placeholder="0" className="input" />
                </div>
                <button onClick={agregarGastoPreop} disabled={agregandoGastoPreop}
                  className="btn-primary flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  {agregandoGastoPreop ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </div>

            {viaje.gastos_preop?.length > 0 ? (
              <div className="space-y-2">
                {viaje.gastos_preop.map(g => (
                  <div key={g.id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="badge-blue capitalize">{g.categoria.replace(/_/g,' ')}</span>
                      {g.descripcion && <span className="text-gray-500 text-xs">{g.descripcion}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{formatCOP(g.valor)}</span>
                      <button onClick={() => eliminarGastoPreop(g.id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t font-bold text-sm">
                  <span>Total gastos pre operacionales</span>
                  <span className="text-gray-900">{formatCOP(totalGastosPreop)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">No hay gastos registrados</p>
            )}
          </div>
        </div>

        {/* Desglose lateral */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Desglose de costos</h3>
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ingresos</p>
              <FilaCosto label="Flete cobrado" valor={viaje.valor_flete_cobrado} color="green" />
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Manifiesto</p>
              <FilaCosto label="Valor manifiesto" valor={viaje.valor_manifiesto} />
              <FilaCosto label="Anticipo" valor={viaje.anticipo} color="green" />
              <FilaCosto label="Retenciones" valor={viaje.retenciones} color="red" />
              <FilaCosto label="Descuentos adicionales" valor={viaje.descuento_manifiesto} color="red" />
              <FilaCosto label="Saldo a pagar" valor={viaje.saldo_manifiesto} color="green" />
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bloque 1 — Gastos directos</p>
              <FilaCosto label="Total gastos viaje" valor={viaje.total_gastos_directos} color="red" />
            </div>
            <div className="pt-3 border-t-2 border-gray-200 space-y-2">
              <FilaCosto label="Total costos" valor={totalCostos} color="red" />
              <FilaCosto label="Utilidad bruta" valor={utilidadBruta} color={utilidadBruta >= 0 ? 'green' : 'red'} />
            </div>
            <div className="mt-4 pt-3 border-t-2 border-gray-300 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 text-sm">Margen</span>
                  <p className="text-xs text-gray-400">Util. bruta / Flete</p>
                </div>
                <span className={`font-black text-2xl ${colorPct(margen)}`}>{margen.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 text-sm">Rentabilidad</span>
                  <p className="text-xs text-gray-400">Util. bruta / Costos</p>
                </div>
                <span className={`font-black text-2xl ${colorPct(rentabilidad)}`}>{rentabilidad.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
