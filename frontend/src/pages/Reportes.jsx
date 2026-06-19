import { useState, useEffect } from 'react'
import { BarChart2, TrendingUp, Truck, Users, Building2, Download } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'
import { reportesAPI } from '../services/api'
import { formatCOP, formatPct, formatNum, colorRentabilidad } from '../utils/format'
import toast from 'react-hot-toast'

const hoy = new Date()
const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ─── Función para descargar CSV ───────────────────────────
const descargarCSV = (datos, columnas, nombreArchivo) => {
  if (!datos?.length) { toast.error('No hay datos para exportar'); return }

  const encabezado = columnas.map(c => c.label).join(',')
  const filas = datos.map(row =>
    columnas.map(c => {
      const val = row[c.key]
      // Escapar comas y comillas en strings
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val ?? ''
    }).join(',')
  )

  const csv = [encabezado, ...filas].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${nombreArchivo}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success(`Descargado: ${nombreArchivo}.csv`)
}

const TooltipCOP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-gray-700 mb-1">{MESES[label] || label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatCOP(p.value)}</p>
      ))}
    </div>
  )
}

function BtnCSV({ onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 text-xs font-medium transition-colors">
      <Download className="w-3.5 h-3.5" />
      Descargar CSV
    </button>
  )
}

function TablaRentabilidad({ datos, columnas }) {
  if (!datos?.length) return (
    <div className="text-center py-10 text-gray-400 text-sm">Sin datos para el período seleccionado</div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b">
            {columnas.map(c => (
              <th key={c.key} className={`px-4 py-3 font-medium ${c.right ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {datos.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {columnas.map(c => (
                <td key={c.key} className={`px-4 py-3 ${c.right ? 'text-right' : ''}`}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Reportes() {
  const [tab, setTab]           = useState('evolucion')
  const [anio, setAnio]         = useState(hoy.getFullYear())
  const [mes, setMes]           = useState(hoy.getMonth() + 1)
  const [cargando, setCargando] = useState(false)
  const [evolucion, setEvolucion]     = useState([])
  const [vehiculos, setVehiculos]     = useState([])
  const [conductores, setConductores] = useState([])
  const [clientes, setClientes]       = useState([])

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        if (tab === 'evolucion') {
          const r = await reportesAPI.evolucionMensual({ anio })
          setEvolucion(r.data.datos || [])
        } else if (tab === 'vehiculos') {
          const r = await reportesAPI.porVehiculo({ anio, mes })
          setVehiculos(r.data.datos || [])
        } else if (tab === 'conductores') {
          const r = await reportesAPI.porConductor({ anio, mes })
          setConductores(r.data.datos || [])
        } else if (tab === 'clientes') {
          const r = await reportesAPI.porCliente({ anio, mes })
          setClientes(r.data.datos || [])
        }
      } catch { toast.error('Error cargando reporte') }
      finally { setCargando(false) }
    }
    cargar()
  }, [tab, anio, mes])

  // Columnas CSV para evolución anual
  const colsEvolucion = [
    { key: 'mes',                   label: 'Mes' },
    { key: 'total_viajes',          label: 'Viajes' },
    { key: 'total_ingresos',        label: 'Ingresos' },
    { key: 'total_costos',          label: 'Costos' },
    { key: 'total_utilidad',        label: 'Utilidad' },
    { key: 'rentabilidad_promedio', label: 'Rentabilidad %' },
  ]

  const colsVehiculos = [
    { key: 'placa',                     label: 'Placa' },
    { key: 'vehiculo',                  label: 'Vehículo' },
    { key: 'total_viajes',              label: 'Viajes' },
    { key: 'total_km',                  label: 'Km' },
    { key: 'total_ingresos',            label: 'Ingresos' },
    { key: 'total_costos',              label: 'Costos' },
    { key: 'total_utilidad',            label: 'Utilidad' },
    { key: 'rentabilidad_promedio_pct', label: 'Rentabilidad %' },
  ]

  const colsConductores = [
    { key: 'conductor',                 label: 'Conductor' },
    { key: 'numero_documento',          label: 'Documento' },
    { key: 'total_viajes',              label: 'Viajes' },
    { key: 'total_km',                  label: 'Km' },
    { key: 'total_ingresos',            label: 'Ingresos' },
    { key: 'total_utilidad',            label: 'Utilidad' },
    { key: 'rentabilidad_promedio_pct', label: 'Rentabilidad %' },
  ]

  const colsClientes = [
    { key: 'cliente',                   label: 'Cliente' },
    { key: 'nit',                       label: 'NIT' },
    { key: 'total_viajes',              label: 'Viajes' },
    { key: 'total_facturado',           label: 'Facturado' },
    { key: 'total_costos',              label: 'Costos' },
    { key: 'total_utilidad',            label: 'Utilidad' },
    { key: 'rentabilidad_promedio_pct', label: 'Rentabilidad %' },
  ]

  const tabs = [
    { id: 'evolucion',   label: 'Evolución anual',  icon: TrendingUp },
    { id: 'vehiculos',   label: 'Por vehículo',      icon: Truck },
    { id: 'conductores', label: 'Por conductor',     icon: Users },
    { id: 'clientes',    label: 'Por cliente',       icon: Building2 },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes de rentabilidad</h1>
        <p className="text-gray-500 text-sm">Análisis financiero por período, vehículo, conductor y cliente</p>
      </div>

      {/* Tabs y filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <div>
            <label className="label">Año</label>
            <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} className="input w-28">
              {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {tab !== 'evolucion' && (
            <div>
              <label className="label">Mes</label>
              <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="input w-40">
                {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Evolución anual */}
          {tab === 'evolucion' && (
            <div className="space-y-5">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Ingresos vs Costos vs Utilidad — {anio}</h3>
                  <BtnCSV onClick={() => descargarCSV(
                    evolucion.map(e => ({ ...e, mes: MESES[e.mes] })),
                    colsEvolucion,
                    `evolucion-anual-${anio}`
                  )} />
                </div>
                {evolucion.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={evolucion}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `$${(v/1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                      <Tooltip content={<TooltipCOP />} />
                      <Legend />
                      <Bar dataKey="total_ingresos" name="Ingresos"  fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey="total_costos"   name="Costos"    fill="#f87171" radius={[4,4,0,0]} />
                      <Bar dataKey="total_utilidad" name="Utilidad"  fill="#22c55e" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16 text-gray-400">Sin datos para {anio}</div>
                )}
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Rentabilidad promedio mensual — {anio}</h3>
                {evolucion.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={evolucion}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Rentabilidad']} />
                      <Line type="monotone" dataKey="rentabilidad_promedio" name="Rentabilidad %"
                        stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-10 text-gray-400">Sin datos</div>
                )}
              </div>
            </div>
          )}

          {/* Por vehículo */}
          {tab === 'vehiculos' && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Rentabilidad por vehículo — {MESES[mes]} {anio}</h3>
                <BtnCSV onClick={() => descargarCSV(vehiculos, colsVehiculos, `vehiculos-${MESES[mes]}-${anio}`)} />
              </div>
              <TablaRentabilidad datos={vehiculos} columnas={[
                { key: 'placa',       label: 'Placa',    render: v => <span className="font-mono font-bold bg-gray-100 px-2 py-0.5 rounded">{v}</span> },
                { key: 'vehiculo',    label: 'Vehículo' },
                { key: 'total_viajes',label: 'Viajes',   right: true },
                { key: 'total_km',    label: 'Km',       right: true, render: v => formatNum(v) },
                { key: 'total_ingresos', label: 'Ingresos', right: true, render: v => formatCOP(v) },
                { key: 'total_costos',   label: 'Costos',   right: true, render: v => <span className="text-red-600">{formatCOP(v)}</span> },
                { key: 'total_utilidad', label: 'Utilidad', right: true, render: v => <span className={v >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{formatCOP(v)}</span> },
                { key: 'rentabilidad_promedio_pct', label: 'Rentabilidad', right: true,
                  render: v => <span className={`font-bold ${colorRentabilidad(v)}`}>{parseFloat(v||0).toFixed(1)}%</span> },
              ]} />
            </div>
          )}

          {/* Por conductor */}
          {tab === 'conductores' && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Rentabilidad por conductor — {MESES[mes]} {anio}</h3>
                <BtnCSV onClick={() => descargarCSV(conductores, colsConductores, `conductores-${MESES[mes]}-${anio}`)} />
              </div>
              <TablaRentabilidad datos={conductores} columnas={[
                { key: 'conductor',   label: 'Conductor', render: v => <span className="font-medium">{v}</span> },
                { key: 'numero_documento', label: 'Documento' },
                { key: 'total_viajes',label: 'Viajes',   right: true },
                { key: 'total_km',    label: 'Km',       right: true, render: v => formatNum(v) },
                { key: 'total_ingresos', label: 'Ingresos', right: true, render: v => formatCOP(v) },
                { key: 'total_utilidad', label: 'Utilidad', right: true, render: v => <span className={v >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{formatCOP(v)}</span> },
                { key: 'rentabilidad_promedio_pct', label: 'Rentabilidad', right: true,
                  render: v => <span className={`font-bold ${colorRentabilidad(v)}`}>{parseFloat(v||0).toFixed(1)}%</span> },
              ]} />
            </div>
          )}

          {/* Por cliente */}
          {tab === 'clientes' && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Rentabilidad por cliente — {MESES[mes]} {anio}</h3>
                <BtnCSV onClick={() => descargarCSV(clientes, colsClientes, `clientes-${MESES[mes]}-${anio}`)} />
              </div>
              <TablaRentabilidad datos={clientes} columnas={[
                { key: 'cliente',     label: 'Cliente',   render: v => <span className="font-medium">{v}</span> },
                { key: 'nit',         label: 'NIT' },
                { key: 'total_viajes',label: 'Viajes',   right: true },
                { key: 'total_facturado', label: 'Facturado', right: true, render: v => formatCOP(v) },
                { key: 'total_costos',    label: 'Costos',    right: true, render: v => <span className="text-red-600">{formatCOP(v)}</span> },
                { key: 'total_utilidad',  label: 'Utilidad',  right: true, render: v => <span className={v >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{formatCOP(v)}</span> },
                { key: 'rentabilidad_promedio_pct', label: 'Rentabilidad', right: true,
                  render: v => <span className={`font-bold ${colorRentabilidad(v)}`}>{parseFloat(v||0).toFixed(1)}%</span> },
              ]} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
