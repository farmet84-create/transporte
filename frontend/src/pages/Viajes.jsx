mport { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Search, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { viajesAPI, vehiculosAPI, conductoresAPI, clientesAPI } from '../services/api'
import { formatCOP } from '../utils/format'

const CATEGORIAS_GASTO = [
  { value: 'combustible',          label: 'Combustible (ACPM)' },
  { value: 'peajes',               label: 'Peajes' },
  { value: 'viaticos',             label: 'Viáticos conductor' },
  { value: 'parqueadero',          label: 'Parqueadero' },
  { value: 'lavado',               label: 'Lavado vehículo' },
  { value: 'adblue',               label: 'AdBlue' },
  { value: 'comision_carga',       label: 'Comisión por carga' },
  { value: 'descuento_manifiesto', label: 'Descuento manifiesto' },
  { value: 'cargue',               label: 'Cargue' },
  { value: 'descargue',            label: 'Descargue' },
  { value: 'retiro_bancario',      label: 'Retiro bancario' },
  { value: 'bascula',              label: 'Báscula' },
  { value: 'sobrepeso',            label: 'Sobrepeso' },
  { value: 'otro',                 label: 'Otro gasto' },
]


const CIUDADES = [
  'Apartadó','Arabia','Arauca','Armenia','Barrancabermeja','Barranquilla',
  'Bello','Bogotá','Bucaramanga','Buenaventura','Cali','Cartagena',
  'Caucasia','Chía','Cúcuta','Duitama','Espinal','Facatativá',
  'Florencia','Fusagasugá','Girardot','Ibagué','Inírida','Itagüí',
  'Leticia','Manizales','Medellín','Mitú','Mocoa','Montería',
  'Mosquera','Neiva','Palmira','Pasto','Pereira','Popayán',
  'Puerto Carreño','Puerto Inírida','Quibdó','Riohacha','San Andrés',
  'Santa Marta','Sincelejo','Soacha','Sogamoso','Soledad','Tunja',
  'Turbo','Valledupar','Villavicencio','Yopal','Zipaquirá'
].sort()

export default function NuevoViaje() {
  const navigate = useNavigate()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm()
  const [cargando, setCargando]     = useState(false)
  const [vehiculos, setVehiculos]   = useState([])
  const [conductores, setConductores] = useState([])
  const [clientes, setClientes]     = useState([])
  const [costoKm, setCostoKm]       = useState(null)
  const [gastos, setGastos]         = useState([])
  const [nuevoGasto, setNuevoGasto] = useState({ categoria: 'combustible', descripcion: '', valor: '', cantidad: 1 })
  const [buscandoPlaca, setBuscandoPlaca] = useState(false)

  const placaBusqueda = watch('placa_busqueda')
  const vehiculoId    = watch('vehiculo_id')
  const km            = watch('km_recorridos')

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [vRes, cRes, clRes] = await Promise.all([
          vehiculosAPI.listar({ activo: true, limite: 100 }),
          conductoresAPI.listar({ activo: true, limite: 100 }),
          clientesAPI.listar({ activo: true, limite: 100 }),
        ])
        setVehiculos(vRes.data.datos || [])
        setConductores(cRes.data.datos || [])
        setClientes(clRes.data.datos || [])
      } catch {
        toast.error('Error cargando catálogos')
      }
    }
    cargarCatalogos()
  }, [])

  // Buscar vehículo por placa
  const buscarPorPlaca = async () => {
    if (!placaBusqueda) return
    setBuscandoPlaca(true)
    try {
      const res = await vehiculosAPI.listar({ placa: placaBusqueda, limite: 5 })
      const encontrados = res.data.datos || []
      if (encontrados.length === 1) {
        setValue('vehiculo_id', encontrados[0].id)
        toast.success(`Vehículo encontrado: ${encontrados[0].placa} — ${encontrados[0].marca} ${encontrados[0].modelo}`)
        // Cargar costo/km del mes
        const costoRes = await vehiculosAPI.costoKm(encontrados[0].id)
        setCostoKm(costoRes.data.datos)
      } else if (encontrados.length === 0) {
        toast.error('No se encontró vehículo con esa placa')
      } else {
        setVehiculos(encontrados)
        toast('Selecciona el vehículo de la lista', { icon: '👇' })
      }
    } catch {
      toast.error('Error buscando vehículo')
    } finally {
      setBuscandoPlaca(false)
    }
  }

  // Cargar costo/km cuando se selecciona vehículo
  useEffect(() => {
    if (!vehiculoId) return
    vehiculosAPI.costoKm(vehiculoId).then(res => setCostoKm(res.data.datos)).catch(() => {})
  }, [vehiculoId])

  const totalGastos    = gastos.reduce((s, g) => s + parseFloat(g.valor || 0), 0)
  const costoOperacion = costoKm ? (parseFloat(km || 0) * parseFloat(costoKm.costo_por_km || 0)) : 0
  const flete          = parseFloat(watch('valor_flete_cobrado') || 0)
  const utilidadEstim  = flete - totalGastos - costoOperacion

  const agregarGasto = () => {
    if (!nuevoGasto.valor || parseFloat(nuevoGasto.valor) <= 0) {
      toast.error('Ingresa un valor válido para el gasto')
      return
    }
    setGastos(g => [...g, { ...nuevoGasto, id: Date.now() }])
    setNuevoGasto({ categoria: 'combustible', descripcion: '', valor: '', cantidad: 1 })
  }

  const onSubmit = async (data) => {
    if (!data.vehiculo_id) { toast.error('Selecciona un vehículo'); return }
    setCargando(true)
    try {
      // Crear el viaje
      const viajeRes = await viajesAPI.crear({
        vehiculo_id:        parseInt(data.vehiculo_id),
        conductor_id:       parseInt(data.conductor_id),
        cliente_id:         parseInt(data.cliente_id),
        origen:             data.origen,
        destino:            data.destino,
        fecha_salida:       data.fecha_salida,
        hora_salida:        data.hora_salida,
        fecha_llegada:      data.fecha_llegada || null,
        hora_llegada:       data.hora_llegada  || null,
        km_recorridos:      parseFloat(data.km_recorridos || 0),
        numero_manifiesto:  data.numero_manifiesto || null,
        fecha_manifiesto:   data.fecha_manifiesto  || null,
        tipo_carga:         data.tipo_carga         || null,
        peso_carga_kg:      parseFloat(data.peso_carga_kg || 0) || null,
        valor_manifiesto:   parseFloat(data.valor_manifiesto || 0),
        valor_flete_cobrado:parseFloat(data.valor_flete_cobrado || 0),
        otros_ingresos:     parseFloat(data.otros_ingresos || 0),
        observaciones:      data.observaciones || null,
      })

      const viajeId = viajeRes.data.datos.id

      // Agregar gastos
      for (const g of gastos) {
        await viajesAPI.agregarGasto(viajeId, {
          categoria:   g.categoria,
          descripcion: g.descripcion || null,
          valor:       parseFloat(g.valor),
          cantidad:    parseFloat(g.cantidad || 1),
          fecha:       data.fecha_salida,
        })
      }

      toast.success('Viaje registrado correctamente')
      navigate(`/viajes/${viajeId}`)
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error registrando el viaje')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo viaje</h1>
          <p className="text-gray-500 text-sm">Registrar flete y calcular rentabilidad</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* VEHÍCULO — búsqueda por placa */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            Vehículo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda por placa */}
            <div className="md:col-span-1">
              <label className="label">Buscar por placa</label>
              <div className="flex gap-2">
                <input {...register('placa_busqueda')}
                  placeholder="ABC123"
                  className="input font-mono uppercase flex-1"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarPorPlaca())}
                />
                <button type="button" onClick={buscarPorPlaca} disabled={buscandoPlaca}
                  className="btn-primary px-3">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="label">Vehículo</label>
              <select {...register('vehiculo_id', { required: 'Selecciona un vehículo' })} className="input">
                <option value="">— Seleccionar —</option>
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>
                ))}
              </select>
              {errors.vehiculo_id && <p className="text-red-500 text-xs mt-1">{errors.vehiculo_id.message}</p>}
            </div>
            <div>
              <label className="label">Conductor</label>
              <select {...register('conductor_id', { required: 'Selecciona un conductor' })} className="input">
                <option value="">— Seleccionar —</option>
                {conductores.map(c => (
                  <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>
                ))}
              </select>
              {errors.conductor_id && <p className="text-red-500 text-xs mt-1">{errors.conductor_id.message}</p>}
            </div>
          </div>
          {costoKm && (
            <div className="mt-3 bg-primary-50 border border-primary-200 rounded-lg px-4 py-2 text-sm text-primary-700">
              💡 Costo/km del mes: <strong>{formatCOP(costoKm.costo_por_km)}/km</strong>
              {' '}— Total operación estimada: <strong>{formatCOP(costoOperacion)}</strong>
            </div>
          )}
        </div>

        {/* TRAYECTO */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            Trayecto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Origen *</label>
              <select {...register('origen', { required: 'Campo requerido' })} className="input"><option value="">— Seleccionar —</option>{CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              {errors.origen && <p className="text-red-500 text-xs mt-1">{errors.origen.message}</p>}
            </div>
            <div>
              <label className="label">Destino *</label>
              <select {...register('destino', { required: 'Campo requerido' })} className="input"><option value="">— Seleccionar —</option>{CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              {errors.destino && <p className="text-red-500 text-xs mt-1">{errors.destino.message}</p>}
            </div>
            <div>
              <label className="label">Fecha de salida *</label>
              <input type="date" {...register('fecha_salida', { required: 'Campo requerido' })} className="input" />
              {errors.fecha_salida && <p className="text-red-500 text-xs mt-1">{errors.fecha_salida.message}</p>}
            </div>
            <div>
              <label className="label">Hora de salida *</label>
              <input type="time" {...register('hora_salida', { required: 'Campo requerido' })} className="input" />
              {errors.hora_salida && <p className="text-red-500 text-xs mt-1">{errors.hora_salida.message}</p>}
            </div>
            <div>
              <label className="label">Fecha de llegada</label>
              <input type="date" {...register('fecha_llegada')} className="input" />
            </div>
            <div>
              <label className="label">Hora de llegada</label>
              <input type="time" {...register('hora_llegada')} className="input" />
            </div>
            <div>
              <label className="label">Kilómetros recorridos</label>
              <input type="number" step="0.1" {...register('km_recorridos')} placeholder="900" className="input" />
            </div>
            <div>
              <label className="label">Cliente (dueño de la carga) *</label>
              <select {...register('cliente_id', { required: 'Selecciona un cliente' })} className="input">
                <option value="">— Seleccionar —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.razon_social}</option>
                ))}
              </select>
              {errors.cliente_id && <p className="text-red-500 text-xs mt-1">{errors.cliente_id.message}</p>}
            </div>
          </div>
        </div>

        {/* MANIFIESTO */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            Manifiesto de carga
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Número de manifiesto</label>
              <input {...register('numero_manifiesto')} placeholder="MF-2026-0001" className="input" />
            </div>
            <div>
              <label className="label">Fecha del manifiesto</label>
              <input type="date" {...register('fecha_manifiesto')} className="input" />
            </div>
            <div>
              <label className="label">Tipo de carga</label>
              <input {...register('tipo_carga')} placeholder="Ej: Mercancía general, alimentos..." className="input" />
            </div>
            <div>
              <label className="label">Peso (kg)</label>
              <input type="number" {...register('peso_carga_kg')} placeholder="15000" className="input" />
            </div>
            <div>
              <label className="label">Valor del manifiesto *</label>
              <input type="number" {...register('valor_manifiesto', { required: 'Campo requerido' })}
                placeholder="2500000" className="input" />
              {errors.valor_manifiesto && <p className="text-red-500 text-xs mt-1">{errors.valor_manifiesto.message}</p>}
            </div>
            <div>
              <label className="label">Flete cobrado al cliente *</label>
              <input type="number" {...register('valor_flete_cobrado', { required: 'Campo requerido' })}
                placeholder="2500000" className="input" />
              {errors.valor_flete_cobrado && <p className="text-red-500 text-xs mt-1">{errors.valor_flete_cobrado.message}</p>}
            </div>
          </div>
        </div>

        {/* GASTOS DEL VIAJE */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
            Gastos del viaje
          </h2>

          {/* Formulario agregar gasto */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="label">Categoría</label>
                <select value={nuevoGasto.categoria}
                  onChange={e => setNuevoGasto(g => ({ ...g, categoria: e.target.value }))}
                  className="input">
                  {CATEGORIAS_GASTO.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
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
                  placeholder="150000" className="input" />
              </div>
              <button type="button" onClick={agregarGasto}
                className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
          </div>

          {/* Lista de gastos */}
          {gastos.length > 0 ? (
            <div className="space-y-2">
              {gastos.map((g) => (
                <div key={g.id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="badge-blue">
                      {CATEGORIAS_GASTO.find(c => c.value === g.categoria)?.label || g.categoria}
                    </span>
                    {g.descripcion && <span className="text-gray-500 text-xs">{g.descripcion}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{formatCOP(g.valor)}</span>
                    <button type="button" onClick={() => setGastos(gs => gs.filter(x => x.id !== g.id))}
                      className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <span className="text-sm text-gray-500 mr-3">Total gastos directos:</span>
                <span className="font-bold text-gray-900">{formatCOP(totalGastos)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No hay gastos agregados aún</p>
          )}
        </div>

        {/* RESUMEN ESTIMADO */}
        {flete > 0 && (
          <div className="card p-5 bg-gray-900 text-white">
            <h2 className="font-semibold mb-4">Rentabilidad estimada</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-gray-400 text-xs mb-1">Flete cobrado</p>
                <p className="font-bold text-lg">{formatCOP(flete)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Gastos directos</p>
                <p className="font-bold text-lg text-red-400">{formatCOP(totalGastos)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Costo operación</p>
                <p className="font-bold text-lg text-orange-400">{formatCOP(costoOperacion)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Utilidad estimada</p>
                <p className={`font-bold text-xl ${utilidadEstim >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCOP(utilidadEstim)}
                </p>
                <p className="text-xs text-gray-400">
                  {flete > 0 ? `${((utilidadEstim / flete) * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Observaciones */}
        <div className="card p-5">
          <label className="label">Observaciones</label>
          <textarea {...register('observaciones')} rows={3}
            placeholder="Notas adicionales del viaje..."
            className="input resize-none" />
        </div>

        {/* Botones */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={cargando} className="btn-primary px-8">
            {cargando ? 'Guardando...' : 'Registrar viaje'}
          </button>
        </div>
      </form>
    </div>
  )
}
