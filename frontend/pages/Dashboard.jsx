import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Truck, DollarSign,
  Package, ArrowRight, AlertCircle
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { reportesAPI } from '../services/api'
import { formatCOP, formatPct, formatNum, colorRentabilidad, badgeEstado, labelEstado, formatFecha, nombreMes } from '../utils/format'

const hoy = new Date()
const anioActual = hoy.getFullYear()
const mesActual  = hoy.getMonth() + 1

function KpiCard({ label, valor, sub, icon: Icon, color = 'primary', trend }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50 text-green-600',
    red:     'bg-red-50 text-red-600',
    yellow:  'bg-yellow-50 text-yellow-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{valor}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend >= 0 ? '+' : ''}{trend}% vs mes anterior
        </div>
      )}
    </div>
  )
}

const TooltipCOP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-gray-700 mb-1">{nombreMes(label)}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatCOP(p.value)}</p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData]       = useState(null)
  const [evolucion, setEvol]  = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const [dashRes, evolRes] = await Promise.all([
          reportesAPI.dashboard({ anio: anioActual, mes: mesActual }),
          reportesAPI.evolucionMensual({ anio: anioActual }),
        ])
        setData(dashRes.data.datos)
        setEvol(evolRes.data.datos || [])
      } catch (err) {
        setError('Error cargando el dashboard')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Cargando dashboard...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
      <AlertCircle className="w-5 h-5 text-red-500" />
      <p className="text-red-700 text-sm">{error}</p>
    </div>
  )

  const kpis = data?.kpis || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{nombreMes(mesActual)} {anioActual}</p>
        </div>
        <Link to="/viajes/nuevo" className="btn-primary flex items-center gap-2 text-sm">
          <Package className="w-4 h-4" />
          Nuevo viaje
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos del mes"
          valor={formatCOP(kpis.total_ingresos)}
          icon={DollarSign} color="primary"
          trend={kpis.variacion_ingresos}
        />
        <KpiCard
          label="Utilidad neta"
          valor={formatCOP(kpis.total_utilidad)}
          icon={TrendingUp}
          color={kpis.total_utilidad >= 0 ? 'green' : 'red'}
          trend={kpis.variacion_utilidad}
        />
        <KpiCard
          label="Rentabilidad promedio"
          valor={formatPct(kpis.rentabilidad_promedio)}
          sub={`${kpis.viajes_rentables || 0} viajes rentables`}
          icon={TrendingUp}
          color={kpis.rentabilidad_promedio >= 15 ? 'green' : 'yellow'}
        />
        <KpiCard
          label="Total viajes"
          valor={formatNum(kpis.total_viajes)}
          sub={`${formatNum(kpis.total_km)} km recorridos`}
          icon={Truck} color="primary"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolución anual */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Evolución anual {anioActual}</h3>
          {evolucion.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={evolucion}>
                <defs>
                  <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gUtilidad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tickFormatter={nombreMes} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                <Tooltip content={<TooltipCOP />} />
                <Area type="monotone" dataKey="total_ingresos" name="Ingresos"
                  stroke="#6366f1" fill="url(#gIngresos)" strokeWidth={2} />
                <Area type="monotone" dataKey="total_utilidad" name="Utilidad"
                  stroke="#22c55e" fill="url(#gUtilidad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sin datos del año
            </div>
          )}
        </div>

        {/* Top vehículos */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top vehículos por rentabilidad</h3>
          {data?.top_vehiculos?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.top_vehiculos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="placa" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => [`${v}%`, 'Rentabilidad']} />
                <Bar dataKey="rentabilidad_pct" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sin viajes completados este mes
            </div>
          )}
        </div>
      </div>

      {/* Últimos viajes */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Últimos viajes</h3>
          <Link to="/viajes" className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Viaje</th>
                <th className="px-5 py-3 text-left font-medium">Placa</th>
                <th className="px-5 py-3 text-left font-medium">Ruta</th>
                <th className="px-5 py-3 text-left font-medium">Flete</th>
                <th className="px-5 py-3 text-left font-medium">Utilidad</th>
                <th className="px-5 py-3 text-left font-medium">Rent.</th>
                <th className="px-5 py-3 text-left font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.ultimos_viajes?.length > 0 ? data.ultimos_viajes.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/viajes/${v.id}`} className="font-medium text-primary-600 hover:underline">
                      {v.numero_viaje}
                    </Link>
                    <p className="text-gray-400 text-xs">{formatFecha(v.fecha_salida)}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono font-semibold text-gray-900">{v.placa}</span>
                    <p className="text-gray-400 text-xs">{v.conductor}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {v.origen} → {v.destino}
                  </td>
                  <td className="px-5 py-3 font-medium">{formatCOP(v.valor_flete_cobrado)}</td>
                  <td className="px-5 py-3">
                    <span className={`font-semibold ${v.utilidad_neta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCOP(v.utilidad_neta)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`font-bold ${colorRentabilidad(v.rentabilidad_pct)}`}>
                      {formatPct(v.rentabilidad_pct)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={badgeEstado(v.estado)}>{labelEstado(v.estado)}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                    No hay viajes registrados aún.{' '}
                    <Link to="/viajes/nuevo" className="text-primary-600 hover:underline">
                      Registrar el primero
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
