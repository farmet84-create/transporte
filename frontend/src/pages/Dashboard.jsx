import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { DollarSign, TrendingUp, Truck, BarChart2, Search, X, Filter } from 'lucide-react'
import { reportesAPI, viajesAPI, vehiculosAPI, conductoresAPI, clientesAPI } from '../services/api'
import { formatCOP, formatPct, formatFecha, colorRentabilidad, badgeEstado, labelEstado } from '../utils/format'
import toast from 'react-hot-toast'

const hoy = new Date()
const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const KPI = ({ label, valor, sub, color = 'gray', icon: Icon }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-black truncate ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : color === 'blue' ? 'text-primary-600' : 'text-gray-900'}`}>
          {valor}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 ${color === 'green' ? 'bg-green-50' : color === 'red' ? 'bg-red-50' : color === 'blue' ? 'bg-primary-50' : 'bg-gray-50'}`}>
        <Icon className={`w-5 h-5 ${color === 'green' ? 'text-green-500' : color === 'red' ? 'text-red-500' : color === 'blue' ? 'text-primary-500' : 'text-gray-400'}`} />
      </div>
    </div>
  </div>
)

const TooltipCOP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{MESES[label] || label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="mb-0.5">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatCOP(p.value) : `${p.value}%`}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [anio, setAnio]       = useState(hoy.getFullYear())
  const [mes, setMes]         = useState(hoy.getMonth() + 1)
  const [filtros, setFiltros] = useState({ placa: '', conductor_id: '', cliente_id: '', fecha_inicio: '', fecha_fin: '' })
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const [kpis, setKpis]           = useState(null)
  const [evolucion, setEvolucion] = useState([])
  const [viajes, setViajes]       = useState([])
  const [topVehiculos, setTopVehiculos] = useState([])
  const [cargando, setCargando]   = useState(true)

  const [vehiculos, setVehiculos]     = useState([])
  const [conductores, setConductores] = useState([])
  const [clientes, setClientes]       = useState([])

  // Cargar catálogos
  useEffect(() => {
    vehiculosAPI.listar({ limite: 100 }).then(r => setVehiculos(r.data.datos || [])).catch(() => {})
    conductoresAPI.listar({ limite: 100 }).then(r => setConductores(r.data.datos || [])).catch(() => {})
    clientesAPI.listar({ limite: 100 }).then(r => setClientes(r.data.datos || [])).catch(() => {})
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [resKpis, resEvol, resViajes, resTop] = await Promise.all([
        reportesAPI.dashboard({ anio, mes }),
        reportesAPI.evolucionMensual({ anio }),
        viajesAPI.listar({
          pagina: 1, limite: 10,
          ...filtros,
        }),
        reportesAPI.porVehiculo({ anio, mes }),
      ])
      setKpis(resKpis.data.datos?.kpis || null)
      setEvolucion(resEvol.data.datos || [])
      setViajes(resViajes.data.datos || [])
      setTopVehiculos(resTop.data.datos || [])
    } catch {
      toast.error('Error cargando datos')
    } finally {
      setCargando(false)
    }
  }, [anio, mes, filtros])

  useEffect(() => { cargar() }, [cargar])

  const limpiarFiltros = () => {
    setFiltros({ placa: '', conductor_id: '', cliente_id: '', fecha_inicio: '', fecha_fin: '' })
  }

  const hayFiltros = Object.values(filtros).some(v => v !== '')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">{MESES[mes]} {anio}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector año */}
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} className="input w-24 text-sm">
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {/* Selector mes */}
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="input w-36 text-sm">
            {MESES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          {/* Botón filtros */}
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${mostrarFiltros || hayFiltros ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" />
            Filtros
            {hayFiltros && <span className="bg-white text-primary-600 text-xs rounded-full px-1.5 font-bold">!</span>}
          </button>
          <Link to="/viajes/nuevo" className="btn-primary text-sm flex items-center gap-2">
            <Truck className="w-4 h-4" /> Nuevo viaje
          </Link>
        </div>
      </div>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-gray-900 text-sm">Filtrar viajes</p>
            {hayFiltros && (
              <button onClick={limpiarFiltros} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                <X className="w-3 h-3" /> Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="label">Placa</label>
              <input value={filtros.placa}
                onChange={e => setFiltros(f => ({ ...f, placa: e.target.value.toUpperCase() }))}
                placeholder="ABC123" className="input font-mono uppercase text-sm" />
            </div>
            <div>
              <label className="label">Conductor</label>
              <select value={filtros.conductor_id}
                onChange={e => setFiltros(f => ({ ...f, conductor_id: e.target.value }))}
                className="input text-sm">
                <option value="">Todos</option>
                {conductores.map(c => (
                  <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cliente</label>
              <select value={filtros.cliente_id}
                onChange={e => setFiltros(f => ({ ...f, cliente_id: e.target.value }))}
                className="input text-sm">
                <option value="">Todos</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.razon_social}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Desde</label>
              <input type="date" value={filtros.fecha_inicio}
                onChange={e => setFiltros(f => ({ ...f, fecha_inicio: e.target.value }))}
                className="input text-sm" />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" value={filtros.fecha_fin}
                onChange={e => setFiltros(f => ({ ...f, fecha_fin: e.target.value }))}
                className="input text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Ingresos del mes" icon={DollarSign} color="blue"
          valor={kpis ? formatCOP(parseFloat(kpis.total_ingresos || 0)) : '—'}
          sub={kpis?.variacion_ingresos != null ? `${parseFloat(kpis.variacion_ingresos) > 0 ? '↑' : '↓'} ${Math.abs(parseFloat(kpis.variacion_ingresos)).toFixed(1)}% vs mes anterior` : undefined} />
        <KPI label="Utilidad neta" icon={TrendingUp} color={parseFloat(kpis?.total_utilidad || 0) >= 0 ? 'green' : 'red'}
          valor={kpis ? formatCOP(parseFloat(kpis.total_utilidad || 0)) : '—'}
          sub={kpis?.variacion_utilidad != null ? `${parseFloat(kpis.variacion_utilidad) > 0 ? '↑' : '↓'} ${Math.abs(parseFloat(kpis.variacion_utilidad)).toFixed(1)}% vs mes anterior` : undefined} />
        <KPI label="Rentabilidad promedio" icon={BarChart2} color="blue"
          valor={kpis ? `${parseFloat(kpis.rentabilidad_promedio || 0).toFixed(1)}%` : '—'}
          sub={kpis ? `${kpis.viajes_rentables || 0} viajes rentables` : undefined} />
        <KPI label="Total viajes" icon={Truck} color="gray"
          valor={kpis ? kpis.total_viajes : '0'}
          sub={kpis ? `${parseFloat(kpis.total_km || 0).toLocaleString('es-CO')} km recorridos` : '— km recorridos'} />
      </div>

      {/* KPIs secundarios */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total costos</p>
            <p className="text-lg font-bold text-red-600">{formatCOP(parseFloat(kpis.total_costos || 0))}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Viajes completados</p>
            <p className="text-lg font-bold text-green-600">{kpis.viajes_rentables || 0}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Viajes con pérdida</p>
            <p className="text-lg font-bold text-red-500">{kpis.viajes_perdida || 0}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Margen promedio</p>
            <p className="text-lg font-bold text-primary-600">
              {parseFloat(kpis.total_ingresos || 0) > 0
                ? `${((parseFloat(kpis.total_utilidad) / parseFloat(kpis.total_ingresos)) * 100).toFixed(1)}%`
                : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Evolución anual */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Evolución {anio} — Ingresos vs Utilidad</h3>
          {evolucion.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={evolucion} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `$${(v/1000000).toFixed(0)}M`} tick={{ fontSize: 10 }} />
                <Tooltip content={<TooltipCOP />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total_ingresos" name="Ingresos"  fill="#6366f1" radius={[3,3,0,0]} />
                <Bar dataKey="total_costos"   name="Costos"    fill="#f87171" radius={[3,3,0,0]} />
                <Bar dataKey="total_utilidad" name="Utilidad"  fill="#22c55e" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos para {anio}</div>
          )}
        </div>

        {/* Rentabilidad mensual */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Rentabilidad % mensual — {anio}</h3>
          {evolucion.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${parseFloat(v).toFixed(1)}%`, 'Rentabilidad']} />
                <Line type="monotone" dataKey="rentabilidad_promedio" name="Rentabilidad %"
                  stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Top vehículos */}
      {topVehiculos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Top vehículos — {MESES[mes]} {anio}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b">
                  <th className="px-5 py-3 text-left font-medium">Placa</th>
                  <th className="px-5 py-3 text-left font-medium">Vehículo</th>
                  <th className="px-5 py-3 text-right font-medium">Viajes</th>
                  <th className="px-5 py-3 text-right font-medium">Ingresos</th>
                  <th className="px-5 py-3 text-right font-medium">Utilidad</th>
                  <th className="px-5 py-3 text-right font-medium">Rentabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topVehiculos.slice(0, 5).map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold bg-gray-100 px-2 py-0.5 rounded text-xs">{v.placa}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{v.vehiculo}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{v.total_viajes}</td>
                    <td className="px-5 py-3 text-right text-gray-900 font-medium">{formatCOP(v.total_ingresos)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={v.total_utilidad >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {formatCOP(v.total_utilidad)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-bold ${colorRentabilidad(v.rentabilidad_promedio_pct)}`}>
                        {parseFloat(v.rentabilidad_promedio_pct || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Últimos viajes */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            {hayFiltros ? 'Viajes filtrados' : 'Últimos viajes'}
            {cargando && <span className="ml-2 text-xs text-gray-400">Cargando...</span>}
          </h3>
          <Link to="/viajes" className="text-sm text-primary-600 hover:underline font-medium">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b">
                <th className="px-4 py-3 text-left font-medium">Viaje / Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Placa / Conductor</th>
                <th className="px-4 py-3 text-left font-medium">Ruta</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-right font-medium">Flete</th>
                <th className="px-4 py-3 text-right font-medium">Utilidad</th>
                <th className="px-4 py-3 text-right font-medium">Rent.</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {viajes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No hay viajes registrados.{' '}
                    <Link to="/viajes/nuevo" className="text-primary-600 hover:underline">Registrar el primero</Link>
                  </td>
                </tr>
              ) : viajes.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/viajes/${v.id}`} className="font-medium text-primary-600 hover:underline text-sm">
                      {v.numero_viaje}
                    </Link>
                    <p className="text-gray-400 text-xs">{formatFecha(v.fecha_salida)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-xs bg-gray-100 px-2 py-0.5 rounded">{v.placa}</span>
                    <p className="text-gray-500 text-xs mt-0.5">{v.conductor}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-sm">{v.origen} → {v.destino}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{v.cliente}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCOP(v.valor_flete_cobrado)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={v.utilidad_bruta >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {formatCOP(v.utilidad_bruta)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${colorRentabilidad(v.rentabilidad_pct)}`}>
                      {parseFloat(v.rentabilidad_pct || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={badgeEstado(v.estado)}>{labelEstado(v.estado)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
