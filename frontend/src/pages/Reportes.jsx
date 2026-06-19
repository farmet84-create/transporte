 import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from 'recharts'
import {
  TrendingUp, TrendingDown, Truck, Users, Building2, Download,
  Brain, RefreshCw, DollarSign, BarChart2, Target, AlertTriangle, Star
} from 'lucide-react'
import { reportesAPI } from '../services/api'
import { formatCOP, colorRentabilidad } from '../utils/format'
import toast from 'react-hot-toast'

const hoy  = new Date()
const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const COLORES = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6']

// ─── Descarga CSV ─────────────────────────────────────────
const descargarCSV = (datos, columnas, nombre) => {
  if (!datos?.length) { toast.error('Sin datos'); return }
  const enc  = columnas.map(c => c.label).join(',')
  const filas = datos.map(r => columnas.map(c => {
    const v = r[c.key]
    return typeof v === 'string' && v.includes(',') ? `"${v}"` : (v ?? '')
  }).join(','))
  const blob = new Blob(['\ufeff' + [enc,...filas].join('\n')], { type:'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = `${nombre}.csv`; a.click()
  URL.revokeObjectURL(url)
  toast.success(`Descargado: ${nombre}.csv`)
}

// ─── Tooltips personalizados ──────────────────────────────
const TooltipCOP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-gray-700 dark:text-gray-200 mb-2">{MESES[label] || label}</p>
      {payload.map((p,i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600 dark:text-gray-300">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>{formatCOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const TooltipPct = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-gray-700 dark:text-gray-200 mb-1">{MESES[label] || label}</p>
      <p className="text-primary-600 font-semibold">{parseFloat(payload[0].value||0).toFixed(1)}%</p>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────
const KPI = ({ label, valor, sub, color='gray', icon:Icon, trend }) => {
  const colors = {
    blue:   { bg:'bg-blue-50 dark:bg-blue-900/20',   text:'text-blue-600',   icon:'text-blue-500' },
    green:  { bg:'bg-green-50 dark:bg-green-900/20', text:'text-green-600',  icon:'text-green-500' },
    red:    { bg:'bg-red-50 dark:bg-red-900/20',     text:'text-red-600',    icon:'text-red-500' },
    purple: { bg:'bg-purple-50 dark:bg-purple-900/20',text:'text-purple-600',icon:'text-purple-500' },
    gray:   { bg:'bg-gray-50 dark:bg-gray-700',      text:'text-gray-800 dark:text-gray-100', icon:'text-gray-500' },
  }
  const c = colors[color] || colors.gray
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg}`}>
          <Icon className={`w-4.5 h-4.5 ${c.icon}`} />
        </div>
      </div>
      <p className={`text-2xl font-black ${c.text}`}>{valor}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
          {trend >= 0 ? '+' : ''}{parseFloat(trend).toFixed(1)}% vs mes anterior
        </div>
      )}
    </div>
  )
}

// ─── Sección IA ───────────────────────────────────────────
function SeccionIA({ datos }) {
  const [recomendaciones, setRecomendaciones] = useState('')
  const [cargando, setCargando]               = useState(false)
  const [generado, setGenerado]               = useState(false)

  const generar = async () => {
    if (!datos) { toast.error('Carga primero los datos'); return }
    setCargando(true)
    setRecomendaciones('')
    try {
      const resumen = `
Datos de rentabilidad del sistema de transporte de carga:

EVOLUCIÓN ANUAL:
${datos.evolucion?.map(e => `- ${MESES[e.mes]}: Ingresos ${formatCOP(e.total_ingresos)}, Costos ${formatCOP(e.total_costos)}, Utilidad ${formatCOP(e.total_utilidad)}, Rentabilidad ${parseFloat(e.rentabilidad_promedio||0).toFixed(1)}%`).join('\n') || 'Sin datos'}

TOP VEHÍCULOS (mes actual):
${datos.vehiculos?.slice(0,5).map(v => `- ${v.placa} ${v.vehiculo}: ${v.total_viajes} viajes, Utilidad ${formatCOP(v.total_utilidad)}, Rentabilidad ${parseFloat(v.rentabilidad_promedio_pct||0).toFixed(1)}%`).join('\n') || 'Sin datos'}

TOP CONDUCTORES (mes actual):
${datos.conductores?.slice(0,5).map(c => `- ${c.conductor}: ${c.total_viajes} viajes, Utilidad ${formatCOP(c.total_utilidad)}, Rentabilidad ${parseFloat(c.rentabilidad_promedio_pct||0).toFixed(1)}%`).join('\n') || 'Sin datos'}

TOP CLIENTES (mes actual):
${datos.clientes?.slice(0,5).map(c => `- ${c.cliente}: ${c.total_viajes} viajes, Facturado ${formatCOP(c.total_facturado)}, Rentabilidad ${parseFloat(c.rentabilidad_promedio_pct||0).toFixed(1)}%`).join('\n') || 'Sin datos'}
`

      const GEMINI_KEY = 'AIzaSyBMzIZOvbq6yLi1o7DFP68SoVOOVIceLpQ'
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Eres un consultor financiero experto en empresas de transporte de carga en Colombia. Analiza estos datos de rentabilidad y dame 5 recomendaciones estratégicas concretas y accionables para mejorar la rentabilidad del negocio. Sé específico con los números. Responde en español, de forma clara y directa. Usa emojis para hacer la lectura más fácil.\n\n${resumen}`
              }]
            }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
          })
        }
      )

      const data = await response.json()
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudieron generar recomendaciones'
      setRecomendaciones(texto)
      setGenerado(true)
    } catch {
      toast.error('Error al generar recomendaciones')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Análisis con Inteligencia Artificial</h3>
            <p className="text-xs text-gray-500">Recomendaciones estratégicas basadas en tus datos reales</p>
          </div>
        </div>
        <button onClick={generar} disabled={cargando}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
          {cargando
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analizando...</>
            : <><Brain className="w-4 h-4" /> {generado ? 'Regenerar' : 'Generar análisis'}</>}
        </button>
      </div>

      {!generado && !cargando && (
        <div className="border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-xl p-8 text-center">
          <Brain className="w-12 h-12 text-purple-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Haz clic en <strong>"Generar análisis"</strong> para obtener recomendaciones personalizadas basadas en los datos de tu empresa
          </p>
        </div>
      )}

      {cargando && (
        <div className="border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-xl p-8 text-center">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Analizando datos y generando recomendaciones...</p>
        </div>
      )}

      {recomendaciones && !cargando && (
        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-5 border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Recomendaciones estratégicas</p>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {recomendaciones}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────
export default function Reportes() {
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes]   = useState(hoy.getMonth() + 1)
  const [tab, setTab]   = useState('dashboard')
  const [cargando, setCargando] = useState(false)
  const [placaFiltro, setPlacaFiltro]   = useState('')
  const [listaVehiculos, setListaVehiculos] = useState([])

  const [datosIA, setDatosIA]           = useState(null)
  const [evolucion, setEvolucion]       = useState([])
  const [vehiculos, setVehiculos]       = useState([])
  const [conductores, setConductores]   = useState([])
  const [clientes, setClientes]         = useState([])

  // Cargar lista de vehículos para el filtro
  useEffect(() => {
    import('../services/api').then(({ default: api }) => {
      api.get('/vehiculos', { params: { limite: 100 } })
        .then(r => setListaVehiculos(r.data.datos || []))
        .catch(() => {})
    })
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = { anio, mes }
      if (placaFiltro) params.placa = placaFiltro

      const [rEvol, rVeh, rCon, rCli] = await Promise.all([
        reportesAPI.evolucionMensual({ anio }),
        reportesAPI.porVehiculo(params),
        reportesAPI.porConductor({ anio, mes }),
        reportesAPI.porCliente({ anio, mes }),
      ])
      const e = rEvol.data.datos || []
      const v = rVeh.data.datos  || []
      const c = rCon.data.datos  || []
      const cl= rCli.data.datos  || []
      setEvolucion(e); setVehiculos(v); setConductores(c); setClientes(cl)
      setDatosIA({ evolucion: e, vehiculos: v, conductores: c, clientes: cl })
    } catch { toast.error('Error cargando datos') }
    finally { setCargando(false) }
  }, [anio, mes, placaFiltro])

  useEffect(() => { cargar() }, [cargar])

  // KPIs calculados de la evolución
  const mesActual  = evolucion.find(e => parseInt(e.mes) === mes)
  const mesAnterior= evolucion.find(e => parseInt(e.mes) === mes - 1)
  const totalAnio  = evolucion.reduce((acc, e) => ({
    ingresos:  acc.ingresos  + parseFloat(e.total_ingresos  || 0),
    costos:    acc.costos    + parseFloat(e.total_costos    || 0),
    utilidad:  acc.utilidad  + parseFloat(e.total_utilidad  || 0),
    viajes:    acc.viajes    + parseInt(e.total_viajes       || 0),
  }), { ingresos:0, costos:0, utilidad:0, viajes:0 })

  const rentAnio = totalAnio.ingresos > 0
    ? (totalAnio.utilidad / totalAnio.ingresos * 100).toFixed(1)
    : '0.0'

  // Datos para gráfico de pastel por cliente
  const pieClientes = clientes.slice(0,6).map((c,i) => ({
    name: c.cliente?.split(' ').slice(0,2).join(' '),
    value: parseFloat(c.total_facturado || 0),
    fill: COLORES[i]
  }))

  const tabs = [
    { id:'dashboard',   label:'Dashboard', icon:BarChart2 },
    { id:'vehiculos',   label:'Vehículos', icon:Truck },
    { id:'conductores', label:'Conductores', icon:Users },
    { id:'clientes',    label:'Clientes', icon:Building2 },
    { id:'ia',          label:'IA', icon:Brain },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{color:"var(--text-primary)"}}>Reportes de rentabilidad</h1>
          <p className="text-gray-500 text-sm">Panel analítico para toma de decisiones estratégicas</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} className="input w-24 text-sm">
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="input w-36 text-sm">
            {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <button onClick={cargar} disabled={cargando}
            className="p-2 rounded-lg border text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-gray-200 dark:border-gray-700 pb-0">
        {tabs.map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? id === 'ia' ? 'border-purple-600 text-purple-600' : 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
            {id === 'ia' && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">IA</span>}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ─── TAB DASHBOARD ─── */}
          {tab === 'dashboard' && (
            <div className="space-y-5">
              {/* KPIs año */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI label={`Ingresos ${anio}`} icon={DollarSign} color="blue"
                  valor={formatCOP(totalAnio.ingresos)}
                  sub={`${totalAnio.viajes} viajes en el año`} />
                <KPI label={`Utilidad ${anio}`} icon={TrendingUp} color={totalAnio.utilidad >= 0 ? 'green' : 'red'}
                  valor={formatCOP(totalAnio.utilidad)}
                  sub={`Costos: ${formatCOP(totalAnio.costos)}`} />
                <KPI label="Rentabilidad anual" icon={Target} color="purple"
                  valor={`${rentAnio}%`}
                  sub="Utilidad / Ingresos" />
                <KPI label={`Mes: ${MESES[mes]}`} icon={BarChart2} color="blue"
                  valor={formatCOP(mesActual?.total_ingresos || 0)}
                  sub={`Utilidad: ${formatCOP(mesActual?.total_utilidad || 0)}`}
                  trend={mesAnterior?.total_ingresos > 0
                    ? ((mesActual?.total_ingresos - mesAnterior?.total_ingresos) / mesAnterior?.total_ingresos * 100)
                    : undefined} />
              </div>

              {/* Gráficos principales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Área de ingresos vs utilidad */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Ingresos vs Utilidad {anio}</h3>
                    <button onClick={() => descargarCSV(evolucion.map(e=>({...e,mes:MESES[e.mes]})),
                      [{key:'mes',label:'Mes'},{key:'total_ingresos',label:'Ingresos'},{key:'total_costos',label:'Costos'},{key:'total_utilidad',label:'Utilidad'}],
                      `evolucion-${anio}`)}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 border border-green-200 px-2 py-1 rounded-lg">
                      <Download className="w-3 h-3" /> CSV
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={evolucion}>
                      <defs>
                        <linearGradient id="gradIngr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gradUtil" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={{ fontSize:10 }} />
                      <YAxis tickFormatter={v => `$${(v/1000000).toFixed(0)}M`} tick={{ fontSize:10 }} />
                      <Tooltip content={<TooltipCOP />} />
                      <Legend wrapperStyle={{ fontSize:11 }} />
                      <Area type="monotone" dataKey="total_ingresos" name="Ingresos" stroke="#6366f1" fill="url(#gradIngr)" strokeWidth={2} />
                      <Area type="monotone" dataKey="total_utilidad" name="Utilidad" stroke="#22c55e" fill="url(#gradUtil)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Rentabilidad mensual */}
                <div className="card p-5">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Rentabilidad % mensual</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={evolucion}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={{ fontSize:10 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize:10 }} />
                      <Tooltip content={<TooltipPct />} />
                      <Line type="monotone" dataKey="rentabilidad_promedio" name="Rentabilidad %"
                        stroke="#6366f1" strokeWidth={3}
                        dot={{ fill:'#6366f1', r:5, strokeWidth:2, stroke:'#fff' }}
                        activeDot={{ r:7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ingresos por mes (barras) + Pie clientes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card p-5">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Ingresos vs Costos por mes</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={evolucion} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={{ fontSize:10 }} />
                      <YAxis tickFormatter={v => `$${(v/1000000).toFixed(0)}M`} tick={{ fontSize:10 }} />
                      <Tooltip content={<TooltipCOP />} />
                      <Legend wrapperStyle={{ fontSize:11 }} />
                      <Bar dataKey="total_ingresos" name="Ingresos" fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey="total_costos"   name="Costos"   fill="#f87171" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card p-5">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Participación por cliente — {MESES[mes]}</h3>
                  {pieClientes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieClientes} cx="40%" cy="50%" outerRadius={80}
                          dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                          labelLine={false}>
                          {pieClientes.map((e,i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip formatter={v => formatCOP(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos en {MESES[mes]}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB VEHÍCULOS ─── */}
          {tab === 'vehiculos' && (
            <div className="space-y-5">
              {/* Filtro por vehículo */}
              <div className="card p-4 flex items-center gap-4">
                <div className="flex-1">
                  <label className="label">Filtrar por vehículo</label>
                  <select value={placaFiltro} onChange={e => setPlacaFiltro(e.target.value)} className="input">
                    <option value="">Todos los vehículos</option>
                    {listaVehiculos.map(v => (
                      <option key={v.id} value={v.placa}>{v.placa} — {v.marca} {v.modelo}</option>
                    ))}
                  </select>
                </div>
                {placaFiltro && (
                  <button onClick={() => setPlacaFiltro('')}
                    className="mt-5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    Limpiar filtro
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card p-5">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Utilidad por vehículo — {MESES[mes]}</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={vehiculos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={{ fontSize:10 }} />
                      <YAxis type="category" dataKey="placa" tick={{ fontSize:11, fontWeight:600 }} width={60} />
                      <Tooltip formatter={v => formatCOP(v)} />
                      <Bar dataKey="total_utilidad" name="Utilidad" radius={[0,4,4,0]}>
                        {vehiculos.map((e,i) => <Cell key={i} fill={parseFloat(e.total_utilidad) >= 0 ? '#22c55e' : '#ef4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card p-5">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Rentabilidad % por vehículo</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={vehiculos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize:10 }} />
                      <YAxis type="category" dataKey="placa" tick={{ fontSize:11, fontWeight:600 }} width={60} />
                      <Tooltip formatter={v => `${parseFloat(v).toFixed(1)}%`} />
                      <Bar dataKey="rentabilidad_promedio_pct" name="Rentabilidad %" radius={[0,4,4,0]}>
                        {vehiculos.map((e,i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">Detalle por vehículo — {MESES[mes]} {anio}</h3>
                  <button onClick={() => descargarCSV(vehiculos,
                    [{key:'placa',label:'Placa'},{key:'vehiculo',label:'Vehículo'},{key:'total_viajes',label:'Viajes'},{key:'total_km',label:'Km'},{key:'total_ingresos',label:'Ingresos'},{key:'total_costos',label:'Costos'},{key:'total_utilidad',label:'Utilidad'},{key:'rentabilidad_promedio_pct',label:'Rentabilidad %'}],
                    `vehiculos-${MESES[mes]}-${anio}`)}
                    className="flex items-center gap-1 text-xs text-green-600 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50">
                    <Download className="w-3 h-3" /> Descargar CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400 border-b">
                      {['Placa','Vehículo','Viajes','Km','Ingresos','Costos','Utilidad','Rentabilidad'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {vehiculos.length === 0
                        ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin datos para {MESES[mes]}</td></tr>
                        : vehiculos.map((v,i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100">
                          <td className="px-4 py-3"><span className="font-mono font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{v.placa}</span></td>
                          <td className="px-4 py-3 font-medium">{v.vehiculo}</td>
                          <td className="px-4 py-3 text-center">{v.total_viajes}</td>
                          <td className="px-4 py-3 text-right">{parseInt(v.total_km||0).toLocaleString('es-CO')}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCOP(v.total_ingresos)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCOP(v.total_costos)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={parseFloat(v.total_utilidad) >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                              {formatCOP(v.total_utilidad)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold text-sm ${colorRentabilidad(v.rentabilidad_promedio_pct)}`}>
                              {parseFloat(v.rentabilidad_promedio_pct||0).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB CONDUCTORES ─── */}
          {tab === 'conductores' && (
            <div className="space-y-5">
              <div className="card p-5">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Utilidad generada por conductor — {MESES[mes]}</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={conductores} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={{ fontSize:10 }} />
                    <YAxis type="category" dataKey="conductor"
                      tickFormatter={v => v?.split(' ')[0]} tick={{ fontSize:11 }} width={80} />
                    <Tooltip formatter={v => formatCOP(v)} />
                    <Bar dataKey="total_utilidad" name="Utilidad" radius={[0,4,4,0]}>
                      {conductores.map((e,i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">Detalle por conductor — {MESES[mes]} {anio}</h3>
                  <button onClick={() => descargarCSV(conductores,
                    [{key:'conductor',label:'Conductor'},{key:'numero_documento',label:'Documento'},{key:'total_viajes',label:'Viajes'},{key:'total_km',label:'Km'},{key:'total_ingresos',label:'Ingresos'},{key:'total_utilidad',label:'Utilidad'},{key:'rentabilidad_promedio_pct',label:'Rentabilidad %'}],
                    `conductores-${MESES[mes]}-${anio}`)}
                    className="flex items-center gap-1 text-xs text-green-600 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50">
                    <Download className="w-3 h-3" /> Descargar CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400 border-b">
                      {['Conductor','Documento','Viajes','Km','Ingresos','Utilidad','Rentabilidad'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {conductores.length === 0
                        ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin datos para {MESES[mes]}</td></tr>
                        : conductores.map((c,i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100">
                          <td className="px-4 py-3 font-medium">{c.conductor}</td>
                          <td className="px-4 py-3 text-gray-500">{c.numero_documento}</td>
                          <td className="px-4 py-3 text-center">{c.total_viajes}</td>
                          <td className="px-4 py-3 text-right">{parseInt(c.total_km||0).toLocaleString('es-CO')}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCOP(c.total_ingresos)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={parseFloat(c.total_utilidad) >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                              {formatCOP(c.total_utilidad)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${colorRentabilidad(c.rentabilidad_promedio_pct)}`}>
                              {parseFloat(c.rentabilidad_promedio_pct||0).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB CLIENTES ─── */}
          {tab === 'clientes' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card p-5">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Facturación por cliente — {MESES[mes]}</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={clientes.slice(0,8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={{ fontSize:10 }} />
                      <YAxis type="category" dataKey="cliente"
                        tickFormatter={v => v?.split(' ')[0]} tick={{ fontSize:10 }} width={80} />
                      <Tooltip formatter={v => formatCOP(v)} />
                      <Bar dataKey="total_facturado" name="Facturado" radius={[0,4,4,0]}>
                        {clientes.map((e,i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card p-5">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Distribución de ingresos</h3>
                  {pieClientes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pieClientes} cx="45%" cy="50%" innerRadius={50} outerRadius={90}
                          dataKey="value" nameKey="name" paddingAngle={3}>
                          {pieClientes.map((e,i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip formatter={v => formatCOP(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
                  )}
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">Detalle por cliente — {MESES[mes]} {anio}</h3>
                  <button onClick={() => descargarCSV(clientes,
                    [{key:'cliente',label:'Cliente'},{key:'nit',label:'NIT'},{key:'total_viajes',label:'Viajes'},{key:'total_facturado',label:'Facturado'},{key:'total_costos',label:'Costos'},{key:'total_utilidad',label:'Utilidad'},{key:'rentabilidad_promedio_pct',label:'Rentabilidad %'}],
                    `clientes-${MESES[mes]}-${anio}`)}
                    className="flex items-center gap-1 text-xs text-green-600 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50">
                    <Download className="w-3 h-3" /> Descargar CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400 border-b">
                      {['Cliente','NIT','Viajes','Facturado','Costos','Utilidad','Rentabilidad'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {clientes.length === 0
                        ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin datos para {MESES[mes]}</td></tr>
                        : clientes.map((c,i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100">
                          <td className="px-4 py-3 font-medium">{c.cliente}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{c.nit || '—'}</td>
                          <td className="px-4 py-3 text-center">{c.total_viajes}</td>
                          <td className="px-4 py-3 text-right font-medium text-primary-600">{formatCOP(c.total_facturado)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCOP(c.total_costos)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={parseFloat(c.total_utilidad) >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                              {formatCOP(c.total_utilidad)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${colorRentabilidad(c.rentabilidad_promedio_pct)}`}>
                              {parseFloat(c.rentabilidad_promedio_pct||0).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB IA ─── */}
          {tab === 'ia' && <SeccionIA datos={datosIA} />}
        </>
      )}
    </div>
  )
}
