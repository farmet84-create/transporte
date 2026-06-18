import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Truck, User, Building2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { viajesAPI } from '../services/api'
import { formatCOP, formatPct, formatFecha, formatHora, formatNum, colorRentabilidad, badgeEstado, labelEstado } from '../utils/format'

const ESTADOS = ['programado','en_curso','completado','cancelado','liquidado']

const FilaCosto = ({ label, valor, color = 'gray' }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-600">{label}</span>
    <span className={`font-semibold text-sm ${color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : 'text-gray-900'}`}>
      {formatCOP(valor)}
    </span>
  </div>
)

export default function DetalleViaje() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [viaje, setViaje]     = useState(null)
  const [rent, setRent]       = useState(null)
  const [cargando, setCargando] = useState(true)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      try {
        const [vRes, rRes] = await Promise.all([
          viajesAPI.obtener(id),
          viajesAPI.rentabilidad(id),
        ])
        setViaje(vRes.data.datos)
        setRent(rRes.data.datos)
      } catch {
        toast.error('Error cargando el viaje')
        navigate('/viajes')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id])

  const cambiarEstado = async (nuevoEstado) => {
    setCambiandoEstado(true)
    try {
      await viajesAPI.cambiarEstado(id, nuevoEstado)
      setViaje(v => ({ ...v, estado: nuevoEstado }))
      toast.success(`Estado actualizado: ${labelEstado(nuevoEstado)}`)
    } catch {
      toast.error('Error actualizando estado')
    } finally {
      setCambiandoEstado(false)
    }
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  if (!viaje) return null
  const r = rent?.desglose || {}
  const pct = parseFloat(viaje.rentabilidad_pct || 0)

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
        {/* Cambiar estado */}
        <select value={viaje.estado} onChange={e => cambiarEstado(e.target.value)}
          disabled={cambiandoEstado}
          className="input w-auto text-sm">
          {ESTADOS.map(e => <option key={e} value={e}>{labelEstado(e)}</option>)}
        </select>
      </div>

      {/* Rentabilidad destacada */}
      <div className={`card p-6 border-2 ${pct >= 15 ? 'border-green-200 bg-green-50' : pct >= 0 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">Flete cobrado</p>
            <p className="text-xl font-bold text-gray-900">{formatCOP(viaje.valor_flete_cobrado)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total costos</p>
            <p className="text-xl font-bold text-red-600">{formatCOP(viaje.total_costos)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Utilidad bruta</p>
            <p className={`text-xl font-bold ${viaje.utilidad_bruta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCOP(viaje.utilidad_bruta)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Utilidad neta</p>
            <p className={`text-xl font-bold ${viaje.utilidad_neta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCOP(viaje.utilidad_neta)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Rentabilidad</p>
            <div className="flex items-center justify-center gap-2">
              {pct >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
              <p className={`text-3xl font-black ${colorRentabilidad(pct)}`}>{formatPct(pct)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos del viaje */}
        <div className="lg:col-span-2 space-y-5">

          {/* Info general */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Información del viaje</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Vehículo</p>
                  <p className="font-mono font-bold text-gray-900">{viaje.placa}</p>
                  <p className="text-xs text-gray-500">{viaje.marca} {viaje.modelo}</p>
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
                  <p className="text-xs text-gray-500">NIT: {viaje.nit_cliente}</p>
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
          </div>

          {/* Manifiesto */}
          {viaje.numero_manifiesto && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Manifiesto de carga</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Número:</span> <span className="font-medium">{viaje.numero_manifiesto}</span></div>
                <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatFecha(viaje.fecha_manifiesto)}</span></div>
                <div><span className="text-gray-500">Tipo de carga:</span> <span className="font-medium">{viaje.tipo_carga || '—'}</span></div>
                <div><span className="text-gray-500">Peso:</span> <span className="font-medium">{viaje.peso_carga_kg ? `${formatNum(viaje.peso_carga_kg)} kg` : '—'}</span></div>
                <div><span className="text-gray-500">Valor manifiesto:</span> <span className="font-bold">{formatCOP(viaje.valor_manifiesto)}</span></div>
              </div>
            </div>
          )}

          {/* Gastos del viaje */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Gastos directos del viaje</h3>
              <Link to={`/viajes/${id}/gastos`} className="text-primary-600 text-sm hover:underline">
                + Agregar gasto
              </Link>
            </div>
            {viaje.gastos?.length > 0 ? (
              <div className="space-y-2">
                {viaje.gastos.map((g) => (
                  <div key={g.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
                    <div>
                      <span className="badge-blue capitalize">{g.categoria.replace(/_/g,' ')}</span>
                      {g.descripcion && <span className="text-gray-500 ml-2 text-xs">{g.descripcion}</span>}
                    </div>
                    <span className="font-semibold text-red-600">{formatCOP(g.valor)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold">
                  <span>Total gastos directos</span>
                  <span className="text-red-600">{formatCOP(viaje.total_gastos_directos)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No hay gastos registrados</p>
            )}
          </div>
        </div>

        {/* Desglose de rentabilidad */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Desglose de costos</h3>

            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ingresos</p>
              <FilaCosto label="Flete cobrado" valor={viaje.valor_flete_cobrado} color="green" />
              {viaje.otros_ingresos > 0 && <FilaCosto label="Otros ingresos" valor={viaje.otros_ingresos} />}
            </div>

            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bloque 1 — Gastos directos</p>
              <FilaCosto label="Total gastos viaje" valor={viaje.total_gastos_directos} color="red" />
            </div>

            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bloque 2 — Operación por km</p>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{formatNum(viaje.km_recorridos)} km × {formatCOP(viaje.costo_km_aplicado)}/km</span>
              </div>
              <FilaCosto label="Total costo operación" valor={viaje.total_costo_operacion_km} color="red" />
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bloque 3 — Administrativo</p>
              <FilaCosto label="Costo admin prorrateado" valor={viaje.costo_admin_aplicado} color="red" />
            </div>

            <div className="pt-3 border-t-2 border-gray-200 space-y-2">
              <FilaCosto label="Total costos" valor={viaje.total_costos} color="red" />
              <FilaCosto label="Utilidad bruta" valor={viaje.utilidad_bruta} color={viaje.utilidad_bruta >= 0 ? 'green' : 'red'} />
              <FilaCosto label="Utilidad neta" valor={viaje.utilidad_neta} color={viaje.utilidad_neta >= 0 ? 'green' : 'red'} />
              <div className="flex justify-between items-center py-2">
                <span className="font-bold text-gray-900">Rentabilidad</span>
                <span className={`font-black text-2xl ${colorRentabilidad(pct)}`}>{formatPct(pct)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
