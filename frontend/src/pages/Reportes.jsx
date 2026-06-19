import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import {
  TrendingUp, TrendingDown, Truck, Users, Building2, Download,
  Brain, RefreshCw, DollarSign, BarChart2, Target, Star
} from 'lucide-react'
import { reportesAPI } from '../services/api'
import { formatCOP, colorRentabilidad } from '../utils/format'
import toast from 'react-hot-toast'

const hoy  = new Date()
const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const COLORES = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6']

// ─── Estilos de texto forzados ────────────────────────────
const TX = { color: '#111827' }          // títulos principales
const TX2 = { color: '#374151' }         // texto secundario
const TX3 = { color: '#6b7280' }         // texto terciario/labels

// ─── Descarga CSV ─────────────────────────────────────────
const descargarCSV = (datos, columnas, nombre) => {
  if (!datos?.length) { toast.error('Sin datos'); return }
  const enc   = columnas.map(c => c.label).join(',')
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
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, fontSize:12, boxShadow:'0 4px 16px rgba(0,0,0,0.10)' }}>
      <p style={{ fontWeight:700, color:'#111827', marginBottom:6 }}>{MESES[label] || label}</p>
      {payload.map((p,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:p.color }} />
          <span style={{ color:'#374151' }}>{p.name}:</span>
          <span style={{ fontWeight:600, color:p.color }}>{formatCOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const TooltipPct = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12, fontSize:12, boxShadow:'0 4px 16px rgba(0,0,0,0.10)' }}>
      <p style={{ fontWeight:700, color:'#111827', marginBottom:4 }}>{MESES[label] || label}</p>
      <p style={{ color:'#6366f1', fontWeight:600 }}>{parseFloat(payload[0].value||0).toFixed(1)}%</p>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────
const KPI = ({ label, valor, sub, color='gray', icon:Icon, trend }) => {
  const colors = {
    blue:   { bg:'#eff6ff', text:'#1d4ed8', icon:'#3b82f6' },
    green:  { bg:'#f0fdf4', text:'#15803d', icon:'#22c55e' },
    red:    { bg:'#fef2f2', text:'#dc2626', icon:'#ef4444' },
    purple: { bg:'#faf5ff', text:'#7c3aed', icon:'#8b5cf6' },
    gray:   { bg:'#f9fafb', text:'#111827', icon:'#6b7280' },
  }
  const c = colors[color] || colors.gray
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
        <div style={{ width:36, height:36, borderRadius:12, background:c.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon style={{ width:18, height:18, color:c.icon }} />
        </div>
      </div>
      <p style={{ fontSize:22, fontWeight:900, color:c.text, lineHeight:1.2 }}>{valor}</p>
      {sub && <p style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{sub}</p>}
      {trend !== undefined && (
        <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:8, fontSize:12, fontWeight:500, color: trend >= 0 ? '#16a34a' : '#dc2626' }}>
          {trend >= 0 ? <TrendingUp style={{ width:12, height:12 }}/> : <TrendingDown style={{ width:12, height:12 }}/>}
          {trend >= 0 ? '+' : ''}{parseFloat(trend).toFixed(1)}% vs mes anterior
        </div>
      )}
    </div>
  )
}

// ─── Card wrapper con título ──────────────────────────────
const ChartCard = ({ title, children, action }) => (
  <div className="card p-5">
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
      <h3 style={{ fontWeight:700, fontSize:15, ...TX }}>{title}</h3>
      {action}
    </div>
    {children}
  </div>
)

// ─── Botón CSV ────────────────────────────────────────────
const BtnCSV = ({ onClick }) => (
  <button onClick={onClick}
    style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:8, padding:'4px 10px', background:'transparent', cursor:'pointer' }}
    onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'}
    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
    <Download style={{ width:12, height:12 }} /> Descargar CSV
  </button>
)

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
      const GROQ_KEY = import.meta.env.VITE_GROQ_KEY
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Eres un consultor financiero experto en empresas de transporte de carga en Colombia. Analiza estos datos de rentabilidad y dame 5 recomendaciones estratégicas concretas y accionables para mejorar la rentabilidad del negocio. Sé específico con los números. Responde en español, de forma clara y directa. Usa emojis para hacer la lectura más fácil.\n\n${resumen}`
          }],
          max_tokens: 1000,
          temperature: 0.7
        })
      })
      const data = await response.json()
      const texto = data.choices?.[0]?.message?.content || 'No se pudieron generar recomendaciones'
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'#f3e8ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Brain style={{ width:20, height:20, color:'#7c3aed' }} />
          </div>
          <div>
            <h3 style={{ fontWeight:700, fontSize:15, color:'#111827', margin:0 }}>Análisis con Inteligencia Artificial</h3>
            <p style={{ fontSize:12, color:'#6b7280', margin:0, marginTop:2 }}>Recomendaciones estratégicas basadas en tus datos reales</p>
          </div>
        </div>
        <button onClick={generar} disabled={cargando}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10, background: cargando ? '#a78bfa' : '#7c3aed', color:'#fff', fontSize:13, fontWeight:500, border:'none', cursor: cargando ? 'not-allowed' : 'pointer', transition:'background 0.2s' }}>
          {cargando
            ? <><RefreshCw style={{ width:14, height:14, animation:'spin 1s linear infinite' }} /> Analizando...</>
            : <><Brain style={{ width:14, height:14 }} /> {generado ? 'Regenerar' : 'Generar análisis'}</>}
        </button>
      </div>

      {!generado && !cargando && (
        <div style={{ border:'2px dashed #ddd6fe', borderRadius:12, padding:32, textAlign:'center' }}>
          <Brain style={{ width:48, height:48, color:'#c4b5fd', margin:'0 auto 12px' }} />
          <p style={{ color:'#6b7280', fontSize:14, margin:0 }}>
            Haz clic en <strong style={{ color:'#7c3aed' }}>"Generar análisis"</strong> para obtener recomendaciones personalizadas basadas en los datos de tu empresa
          </p>
        </div>
      )}

      {cargando && (
        <div style={{ border:'2px dashed #ddd6fe', borderRadius:12, padding:32, textAlign:'center' }}>
          <div style={{ width:40, height:40, border:'4px solid #e9d5ff', borderTop:'4px solid #7c3aed', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 12px' }} />
          <p style={{ color:'#6b7280', fontSize:14, margin:0 }}>Analizando datos y generando recomendaciones...</p>
        </div>
      )}

      {recomendaciones && !cargando && (
        <div style={{ background:'#faf5ff', borderRadius:12, padding:20, border:'1px solid #e9d5ff' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Star style={{ width:16, height:16, color:'#7c3aed' }} />
            <p style={{ fontSize:14, fontWeight:600, color:'#6d28d9', margin:0 }}>Recomendaciones estratégicas</p>
          </div>
          <div style={{ fontSize:14, color:'#1f2937', whiteSpace:'pre-wrap', lineHeight:1.7 }}>
            {recomendaciones}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tabla reutilizable ───────────────────────────────────
const TablaHeader = ({ cols }) => (
  <thead>
    <tr style={{ background:'#1f2937' }}>
      {cols.map(h => (
        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'#d1d5db', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
      ))}
    </tr>
  </thead>
)

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
      const e  = rEvol.data.datos || []
      const v  = rVeh.data.datos  || []
      const c  = rCon.data.datos  || []
      const cl = rCli.data.datos  || []
      setEvolucion(e); setVehiculos(v); setConductores(c); setClientes(cl)
      setDatosIA({ evolucion: e, vehiculos: v, conductores: c, clientes: cl })
    } catch { toast.error('Error cargando datos') }
    finally { setCargando(false) }
  }, [anio, mes, placaFiltro])

  useEffect(() => { cargar() }, [cargar])

  const mesActual   = evolucion.find(e => parseInt(e.mes) === mes)
  const mesAnterior = evolucion.find(e => parseInt(e.mes) === mes - 1)
  const totalAnio   = evolucion.reduce((acc, e) => ({
    ingresos: acc.ingresos + parseFloat(e.total_ingresos || 0),
    costos:   acc.costos   + parseFloat(e.total_costos   || 0),
    utilidad: acc.utilidad + parseFloat(e.total_utilidad || 0),
    viajes:   acc.viajes   + parseInt(e.total_viajes      || 0),
  }), { ingresos:0, costos:0, utilidad:0, viajes:0 })

  const rentAnio = totalAnio.ingresos > 0
    ? (totalAnio.utilidad / totalAnio.ingresos * 100).toFixed(1) : '0.0'

  const pieClientes = clientes.slice(0,6).map((c,i) => ({
    name:  c.cliente?.split(' ').slice(0,2).join(' '),
    value: parseFloat(c.total_facturado || 0),
    fill:  COLORES[i]
  }))

  const tabs = [
    { id:'dashboard',   label:'Dashboard',   icon:BarChart2 },
    { id:'vehiculos',   label:'Vehículos',   icon:Truck },
    { id:'conductores', label:'Conductores', icon:Users },
    { id:'clientes',    label:'Clientes',    icon:Building2 },
    { id:'ia',          label:'IA',          icon:Brain },
  ]

  const tickStyle = { fontSize:10, fill:'#374151' }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', margin:0 }}>Reportes de rentabilidad</h1>
          <p style={{ fontSize:13, color:'#6b7280', margin:0, marginTop:2 }}>Panel analítico para toma de decisiones estratégicas</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} className="input w-24 text-sm">
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="input w-36 text-sm">
            {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <button onClick={cargar} disabled={cargando}
            className="p-2 rounded-lg border text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', borderBottom:'2px solid #e5e7eb', paddingBottom:0 }}>
        {tabs.map(({ id, label, icon:Icon }) => {
          const active = tab === id
          const isIA   = id === 'ia'
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'10px 16px', fontSize:13, fontWeight:500,
                borderBottom: active ? `2px solid ${isIA ? '#7c3aed' : '#4f46e5'}` : '2px solid transparent',
                color: active ? (isIA ? '#7c3aed' : '#4f46e5') : '#6b7280',
                background:'transparent', border:'none', cursor:'pointer',
                transition:'color 0.15s', marginBottom:-2
              }}>
              <Icon style={{ width:15, height:15 }} />
              {label}
              {isIA && <span style={{ fontSize:10, background:'#f3e8ff', color:'#7c3aed', padding:'2px 6px', borderRadius:20, fontWeight:700 }}>IA</span>}
            </button>
          )
        })}
      </div>

      {cargando ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240 }}>
          <div style={{ width:40, height:40, border:'4px solid #e0e7ff', borderTop:'4px solid #4f46e5', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* ─── TAB DASHBOARD ─── */}
          {tab === 'dashboard' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI label={`Ingresos ${anio}`} icon={DollarSign} color="blue"
                  valor={formatCOP(totalAnio.ingresos)} sub={`${totalAnio.viajes} viajes en el año`} />
                <KPI label={`Utilidad ${anio}`} icon={TrendingUp} color={totalAnio.utilidad >= 0 ? 'green' : 'red'}
                  valor={formatCOP(totalAnio.utilidad)} sub={`Costos: ${formatCOP(totalAnio.costos)}`} />
                <KPI label="Rentabilidad anual" icon={Target} color="purple"
                  valor={`${rentAnio}%`} sub="Utilidad / Ingresos" />
                <KPI label={`Mes: ${MESES[mes]}`} icon={BarChart2} color="blue"
                  valor={formatCOP(mesActual?.total_ingresos || 0)}
                  sub={`Utilidad: ${formatCOP(mesActual?.total_utilidad || 0)}`}
                  trend={mesAnterior?.total_ingresos > 0
                    ? ((mesActual?.total_ingresos - mesAnterior?.total_ingresos) / mesAnterior?.total_ingresos * 100)
                    : undefined} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard title={`Ingresos vs Utilidad ${anio}`}
                  action={
                    <BtnCSV onClick={() => descargarCSV(
                      evolucion.map(e=>({...e,mes:MESES[e.mes]})),
                      [{key:'mes',label:'Mes'},{key:'total_ingresos',label:'Ingresos'},{key:'total_costos',label:'Costos'},{key:'total_utilidad',label:'Utilidad'}],
                      `evolucion-${anio}`)} />
                  }>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={evolucion}>
                      <defs>
                        <linearGradient id="gradIngr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gradUtil" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={tickStyle} />
                      <YAxis tickFormatter={v => `$${(v/1000000).toFixed(0)}M`} tick={tickStyle} />
                      <Tooltip content={<TooltipCOP />} />
                      <Legend wrapperStyle={{ fontSize:12, color:'#374151' }} />
                      <Area type="monotone" dataKey="total_ingresos" name="Ingresos" stroke="#6366f1" fill="url(#gradIngr)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="total_utilidad" name="Utilidad"  stroke="#22c55e" fill="url(#gradUtil)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Rentabilidad % mensual">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={evolucion}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={tickStyle} />
                      <YAxis tickFormatter={v => `${v}%`} tick={tickStyle} />
                      <Tooltip content={<TooltipPct />} />
                      <Line type="monotone" dataKey="rentabilidad_promedio" name="Rentabilidad %"
                        stroke="#6366f1" strokeWidth={3}
                        dot={{ fill:'#6366f1', r:5, strokeWidth:2, stroke:'#fff' }}
                        activeDot={{ r:7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard title="Ingresos vs Costos por mes">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={evolucion} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={tickStyle} />
                      <YAxis tickFormatter={v => `$${(v/1000000).toFixed(0)}M`} tick={tickStyle} />
                      <Tooltip content={<TooltipCOP />} />
                      <Legend wrapperStyle={{ fontSize:12, color:'#374151' }} />
                      <Bar dataKey="total_ingresos" name="Ingresos" fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey="total_costos"   name="Costos"   fill="#f87171" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title={`Participación por cliente — ${MESES[mes]}`}>
                  {pieClientes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieClientes} cx="40%" cy="50%" outerRadius={80}
                          dataKey="value" nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                          labelLine={false}>
                          {pieClientes.map((e,i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip formatter={v => formatCOP(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:180, color:'#9ca3af', fontSize:13 }}>Sin datos en {MESES[mes]}</div>
                  )}
                </ChartCard>
              </div>
            </div>
          )}

          {/* ─── TAB VEHÍCULOS ─── */}
          {tab === 'vehiculos' && (
            <div className="space-y-5">
              <div className="card p-4 flex items-center gap-4">
                <div className="flex-1">
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Filtrar por vehículo</label>
                  <select value={placaFiltro} onChange={e => setPlacaFiltro(e.target.value)} className="input">
                    <option value="">Todos los vehículos</option>
                    {listaVehiculos.map(v => (
                      <option key={v.id} value={v.placa}>{v.placa} — {v.marca} {v.modelo}</option>
                    ))}
                  </select>
                </div>
                {placaFiltro && (
                  <button onClick={() => setPlacaFiltro('')}
                    style={{ marginTop:20, padding:'6px 12px', fontSize:13, color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, background:'transparent', cursor:'pointer' }}>
                    Limpiar filtro
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard title={`Utilidad por vehículo — ${MESES[mes]}`}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={vehiculos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={tickStyle} />
                      <YAxis type="category" dataKey="placa" tick={{ fontSize:11, fontWeight:600, fill:'#374151' }} width={60} />
                      <Tooltip formatter={v => formatCOP(v)} />
                      <Bar dataKey="total_utilidad" name="Utilidad" radius={[0,4,4,0]}>
                        {vehiculos.map((e,i) => <Cell key={i} fill={parseFloat(e.total_utilidad) >= 0 ? '#22c55e' : '#ef4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Rentabilidad % por vehículo">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={vehiculos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={v => `${v}%`} tick={tickStyle} />
                      <YAxis type="category" dataKey="placa" tick={{ fontSize:11, fontWeight:600, fill:'#374151' }} width={60} />
                      <Tooltip formatter={v => `${parseFloat(v).toFixed(1)}%`} />
                      <Bar dataKey="rentabilidad_promedio_pct" name="Rentabilidad %" radius={[0,4,4,0]}>
                        {vehiculos.map((e,i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <div className="card overflow-hidden">
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:0 }}>Detalle por vehículo — {MESES[mes]} {anio}</h3>
                  <BtnCSV onClick={() => descargarCSV(vehiculos,
                    [{key:'placa',label:'Placa'},{key:'vehiculo',label:'Vehículo'},{key:'total_viajes',label:'Viajes'},{key:'total_km',label:'Km'},{key:'total_ingresos',label:'Ingresos'},{key:'total_costos',label:'Costos'},{key:'total_utilidad',label:'Utilidad'},{key:'rentabilidad_promedio_pct',label:'Rentabilidad %'}],
                    `vehiculos-${MESES[mes]}-${anio}`)} />
                </div>
                <div className="overflow-x-auto">
                  <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
                    <TablaHeader cols={['Placa','Vehículo','Viajes','Km','Ingresos','Costos','Utilidad','Rentabilidad']} />
                    <tbody>
                      {vehiculos.length === 0
                        ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>Sin datos para {MESES[mes]}</td></tr>
                        : vehiculos.map((v,i) => (
                        <tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}
                          onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'10px 16px' }}>
                            <span style={{ fontFamily:'monospace', fontWeight:700, background:'#f3f4f6', padding:'2px 8px', borderRadius:6, fontSize:12, color:'#111827' }}>{v.placa}</span>
                          </td>
                          <td style={{ padding:'10px 16px', fontWeight:500, color:'#111827' }}>{v.vehiculo}</td>
                          <td style={{ padding:'10px 16px', textAlign:'center', color:'#374151' }}>{v.total_viajes}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', color:'#374151' }}>{parseInt(v.total_km||0).toLocaleString('es-CO')}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:500, color:'#1d4ed8' }}>{formatCOP(v.total_ingresos)}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', color:'#dc2626' }}>{formatCOP(v.total_costos)}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color: parseFloat(v.total_utilidad) >= 0 ? '#15803d' : '#dc2626' }}>
                            {formatCOP(v.total_utilidad)}
                          </td>
                          <td style={{ padding:'10px 16px', textAlign:'right' }}>
                            <span style={{ fontWeight:700, fontSize:14 }} className={colorRentabilidad(v.rentabilidad_promedio_pct)}>
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
              <ChartCard title={`Utilidad generada por conductor — ${MESES[mes]}`}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={conductores} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={tickStyle} />
                    <YAxis type="category" dataKey="conductor"
                      tickFormatter={v => v?.split(' ')[0]} tick={{ fontSize:11, fill:'#374151' }} width={80} />
                    <Tooltip formatter={v => formatCOP(v)} />
                    <Bar dataKey="total_utilidad" name="Utilidad" radius={[0,4,4,0]}>
                      {conductores.map((e,i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="card overflow-hidden">
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:0 }}>Detalle por conductor — {MESES[mes]} {anio}</h3>
                  <BtnCSV onClick={() => descargarCSV(conductores,
                    [{key:'conductor',label:'Conductor'},{key:'numero_documento',label:'Documento'},{key:'total_viajes',label:'Viajes'},{key:'total_km',label:'Km'},{key:'total_ingresos',label:'Ingresos'},{key:'total_utilidad',label:'Utilidad'},{key:'rentabilidad_promedio_pct',label:'Rentabilidad %'}],
                    `conductores-${MESES[mes]}-${anio}`)} />
                </div>
                <div className="overflow-x-auto">
                  <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
                    <TablaHeader cols={['Conductor','Documento','Viajes','Km','Ingresos','Utilidad','Rentabilidad']} />
                    <tbody>
                      {conductores.length === 0
                        ? <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>Sin datos para {MESES[mes]}</td></tr>
                        : conductores.map((c,i) => (
                        <tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}
                          onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'10px 16px', fontWeight:600, color:'#111827' }}>{c.conductor}</td>
                          <td style={{ padding:'10px 16px', color:'#6b7280', fontSize:12 }}>{c.numero_documento}</td>
                          <td style={{ padding:'10px 16px', textAlign:'center', color:'#374151' }}>{c.total_viajes}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', color:'#374151' }}>{parseInt(c.total_km||0).toLocaleString('es-CO')}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:500, color:'#1d4ed8' }}>{formatCOP(c.total_ingresos)}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color: parseFloat(c.total_utilidad) >= 0 ? '#15803d' : '#dc2626' }}>
                            {formatCOP(c.total_utilidad)}
                          </td>
                          <td style={{ padding:'10px 16px', textAlign:'right' }}>
                            <span style={{ fontWeight:700, fontSize:14 }} className={colorRentabilidad(c.rentabilidad_promedio_pct)}>
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
                <ChartCard title={`Facturación por cliente — ${MESES[mes]}`}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={clientes.slice(0,8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={tickStyle} />
                      <YAxis type="category" dataKey="cliente"
                        tickFormatter={v => v?.split(' ')[0]} tick={{ fontSize:10, fill:'#374151' }} width={80} />
                      <Tooltip formatter={v => formatCOP(v)} />
                      <Bar dataKey="total_facturado" name="Facturado" radius={[0,4,4,0]}>
                        {clientes.map((e,i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Distribución de ingresos">
                  {pieClientes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pieClientes} cx="45%" cy="50%" innerRadius={50} outerRadius={90}
                          dataKey="value" nameKey="name" paddingAngle={3}>
                          {pieClientes.map((e,i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip formatter={v => formatCOP(v)} />
                        <Legend wrapperStyle={{ fontSize:12, color:'#374151' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:180, color:'#9ca3af', fontSize:13 }}>Sin datos</div>
                  )}
                </ChartCard>
              </div>

              <div className="card overflow-hidden">
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:0 }}>Detalle por cliente — {MESES[mes]} {anio}</h3>
                  <BtnCSV onClick={() => descargarCSV(clientes,
                    [{key:'cliente',label:'Cliente'},{key:'nit',label:'NIT'},{key:'total_viajes',label:'Viajes'},{key:'total_facturado',label:'Facturado'},{key:'total_costos',label:'Costos'},{key:'total_utilidad',label:'Utilidad'},{key:'rentabilidad_promedio_pct',label:'Rentabilidad %'}],
                    `clientes-${MESES[mes]}-${anio}`)} />
                </div>
                <div className="overflow-x-auto">
                  <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
                    <TablaHeader cols={['Cliente','NIT','Viajes','Facturado','Costos','Utilidad','Rentabilidad']} />
                    <tbody>
                      {clientes.length === 0
                        ? <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>Sin datos para {MESES[mes]}</td></tr>
                        : clientes.map((c,i) => (
                        <tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}
                          onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'10px 16px', fontWeight:600, color:'#111827' }}>{c.cliente}</td>
                          <td style={{ padding:'10px 16px', color:'#6b7280', fontSize:12 }}>{c.nit || '—'}</td>
                          <td style={{ padding:'10px 16px', textAlign:'center', color:'#374151' }}>{c.total_viajes}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:600, color:'#4f46e5' }}>{formatCOP(c.total_facturado)}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', color:'#dc2626' }}>{formatCOP(c.total_costos)}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color: parseFloat(c.total_utilidad) >= 0 ? '#15803d' : '#dc2626' }}>
                            {formatCOP(c.total_utilidad)}
                          </td>
                          <td style={{ padding:'10px 16px', textAlign:'right' }}>
                            <span style={{ fontWeight:700, fontSize:14 }} className={colorRentabilidad(c.rentabilidad_promedio_pct)}>
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
