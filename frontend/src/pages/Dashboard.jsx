import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { DollarSign, TrendingUp, Truck, BarChart2, X, Filter, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { reportesAPI, viajesAPI, vehiculosAPI, conductoresAPI, clientesAPI } from '../services/api'
import api from '../services/api'
import { formatCOP, formatPct, formatFecha, colorRentabilidad, badgeEstado, labelEstado } from '../utils/format'
import toast from 'react-hot-toast'
import AlertasBanner from '../components/AlertasBanner'

const hoy = new Date()
const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── KPI Card ──────────────────────────────────────────────
const KPI = ({ label, valor, sub, color = 'gray', icon: Icon }) => {
  const cfg = {
    green:  { bg: '#f0fdf4', text: '#15803d', icon: '#22c55e' },
    red:    { bg: '#fef2f2', text: '#dc2626', icon: '#ef4444' },
    blue:   { bg: '#eff6ff', text: '#1d4ed8', icon: '#3b82f6' },
    gray:   { bg: '#f9fafb', text: '#111827', icon: '#6b7280' },
  }[color] || { bg:'#f9fafb', text:'#111827', icon:'#6b7280' }

  return (
    <div style={{ background:'#fff', borderRadius:14, padding:'16px', border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:11, color:'#6b7280', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>{label}</p>
          <p style={{ fontSize:20, fontWeight:900, color:cfg.text, margin:'4px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{valor}</p>
          {sub && <p style={{ fontSize:11, color:'#9ca3af', margin:'3px 0 0' }}>{sub}</p>}
        </div>
        <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:10 }}>
          <Icon style={{ width:18, height:18, color:cfg.icon }} />
        </div>
      </div>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────
const TooltipCOP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:10, fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight:700, color:'#111827', margin:'0 0 4px' }}>{MESES[label] || label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, margin:'2px 0' }}>{p.name}: {formatCOP(p.value)}</p>
      ))}
    </div>
  )
}

// ── Fila de viaje (card en móvil, fila en desktop) ────────
const ViajeRow = ({ v }) => (
  <>
    {/* Vista móvil: card */}
    <div className="lg:hidden" style={{ background:'#fff', border:'1px solid #f1f5f9', borderRadius:12, padding:14, marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <Link to={`/viajes/${v.id}`} style={{ fontWeight:700, color:'#4f46e5', fontSize:14, textDecoration:'none' }}>
            {v.numero_viaje}
          </Link>
          <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{formatFecha(v.fecha_salida)}</p>
        </div>
        <span className={badgeEstado(v.estado)}>{labelEstado(v.estado)}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12 }}>
        <div>
          <span style={{ color:'#6b7280' }}>Placa: </span>
          <span style={{ fontFamily:'monospace', fontWeight:700, background:'#f3f4f6', padding:'1px 6px', borderRadius:4 }}>{v.placa}</span>
        </div>
        <div>
          <span style={{ color:'#6b7280' }}>Ruta: </span>
          <span style={{ color:'#111827', fontWeight:500 }}>{v.origen} → {v.destino}</span>
        </div>
        <div>
          <span style={{ color:'#6b7280' }}>Flete: </span>
          <span style={{ fontWeight:600, color:'#1d4ed8' }}>{formatCOP(v.valor_flete_cobrado)}</span>
        </div>
        <div>
          <span style={{ color:'#6b7280' }}>Utilidad: </span>
          <span style={{ fontWeight:700, color: v.utilidad_bruta >= 0 ? '#15803d' : '#dc2626' }}>{formatCOP(v.utilidad_bruta)}</span>
        </div>
      </div>
    </div>

    {/* Vista desktop: fila de tabla */}
    <tr className="hidden lg:table-row" style={{ borderBottom:'1px solid #f3f4f6' }}
      onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
      <td style={{ padding:'10px 16px' }}>
        <Link to={`/viajes/${v.id}`} style={{ fontWeight:600, color:'#4f46e5', fontSize:13, textDecoration:'none' }}>{v.numero_viaje}</Link>
        <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{formatFecha(v.fecha_salida)}</p>
      </td>
      <td style={{ padding:'10px 16px' }}>
        <span style={{ fontFamily:'monospace', fontWeight:700, background:'#f3f4f6', padding:'2px 7px', borderRadius:5, fontSize:11 }}>{v.placa}</span>
        <p style={{ fontSize:11, color:'#6b7280', margin:'3px 0 0' }}>{v.conductor}</p>
      </td>
      <td style={{ padding:'10px 16px', fontSize:12, color:'#374151' }}>{v.origen} → {v.destino}</td>
      <td style={{ padding:'10px 16px', fontSize:12, color:'#6b7280' }}>{v.cliente}</td>
      <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:500, color:'#111827', fontSize:13 }}>{formatCOP(v.valor_flete_cobrado)}</td>
      <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, fontSize:13, color: v.utilidad_bruta >= 0 ? '#15803d' : '#dc2626' }}>{formatCOP(v.utilidad_bruta)}</td>
      <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, fontSize:13 }}>
        <span className={colorRentabilidad(v.rentabilidad_pct)}>{parseFloat(v.rentabilidad_pct||0).toFixed(1)}%</span>
      </td>
      <td style={{ padding:'10px 16px', textAlign:'center' }}>
        <span className={badgeEstado(v.estado)}>{labelEstado(v.estado)}</span>
      </td>
    </tr>
  </>
)

export default function Dashboard() {
  const [anio, setAnio]       = useState(hoy.getFullYear())
  const [mes, setMes]         = useState(hoy.getMonth() + 1)
  const [filtros, setFiltros] = useState({ placa:'', conductor_id:'', cliente_id:'', fecha_inicio:'', fecha_fin:'' })
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [kpis, setKpis]           = useState(null)
  const [evolucion, setEvolucion] = useState([])
  const [viajes, setViajes]       = useState([])
  const [topVehiculos, setTopVehiculos] = useState([])
  const [resumenAlertas, setResumenAlertas] = useState(null)
  const [resumen, setResumen]     = useState(null)
  const [cargando, setCargando]   = useState(true)
  const [conductores, setConductores] = useState([])
  const [clientes, setClientes]       = useState([])
  const [listaVehiculos, setListaVehiculos] = useState([])

  useEffect(() => {
    conductoresAPI.listar({ limite:100 }).then(r => setConductores(r.data.datos||[])).catch(()=>{})
    clientesAPI.listar({ limite:100 }).then(r => setClientes(r.data.datos||[])).catch(()=>{})
    vehiculosAPI.listar({ activo:true, limite:100 }).then(r => setListaVehiculos(r.data.datos||[])).catch(()=>{})
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [resKpis, resEvol, resViajes, resTop, resResumen] = await Promise.all([
        reportesAPI.dashboard({ anio, mes }),
        reportesAPI.evolucionMensual({ anio }),
        viajesAPI.listar({ pagina:1, limite:10, ...filtros }),
        reportesAPI.porVehiculo({ anio, mes }),
        reportesAPI.resumen(filtros),
      ])
      setKpis(resKpis.data.datos?.kpis || null)
      setEvolucion(resEvol.data.datos || [])
      setViajes(resViajes.data.datos || [])
      setTopVehiculos(resTop.data.datos || [])
      setResumen(resResumen.data.datos || null)
    } catch { toast.error('Error cargando datos') }
    finally { setCargando(false) }
  }, [anio, mes, filtros])

  useEffect(() => { cargar() }, [cargar])

  const hayFiltros = Object.values(filtros).some(v => v !== '')
  const limpiarFiltros = () => setFiltros({ placa:'', conductor_id:'', cliente_id:'', fecha_inicio:'', fecha_fin:'' })
  const tickStyle = { fontSize:10, fill:'#374151' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>Dashboard</h1>
          <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>{MESES[mes]} {anio}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} className="input" style={{ width:80, fontSize:13 }}>
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="input" style={{ width:120, fontSize:13 }}>
            {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, fontSize:13, fontWeight:500, border:'1px solid', borderColor: mostrarFiltros||hayFiltros ? '#4f46e5' : '#d1d5db', background: mostrarFiltros||hayFiltros ? '#4f46e5' : '#fff', color: mostrarFiltros||hayFiltros ? '#fff' : '#374151', cursor:'pointer' }}>
            <Filter style={{ width:14, height:14 }} />
            Filtros
            {hayFiltros && <span style={{ background:'#fff', color:'#4f46e5', fontSize:10, borderRadius:20, padding:'1px 6px', fontWeight:700 }}>!</span>}
          </button>
          <Link to="/viajes/nuevo" className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <Plus style={{ width:14, height:14 }} /> Nuevo viaje
          </Link>
        </div>
      </div>

      <AlertasBanner resumen={resumenAlertas} />

      {/* ── Filtros ── */}
      {mostrarFiltros && (
        <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ fontWeight:600, fontSize:14, color:'#111827', margin:0 }}>Filtrar viajes</p>
            {hayFiltros && (
              <button onClick={limpiarFiltros} style={{ fontSize:12, color:'#dc2626', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                <X style={{ width:12, height:12 }} /> Limpiar
              </button>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10 }}>
            <div>
              <label className="label">Placa</label>
              <select value={filtros.placa} onChange={e => setFiltros(f=>({...f, placa:e.target.value}))} className="input" style={{ fontSize:13 }}>
                <option value="">Todas</option>
                {listaVehiculos.map(v => <option key={v.id} value={v.placa}>{v.placa} — {v.marca} {v.modelo}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Conductor</label>
              <select value={filtros.conductor_id} onChange={e => setFiltros(f=>({...f, conductor_id:e.target.value}))} className="input" style={{ fontSize:13 }}>
                <option value="">Todos</option>
                {conductores.map(c => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cliente</label>
              <select value={filtros.cliente_id} onChange={e => setFiltros(f=>({...f, cliente_id:e.target.value}))} className="input" style={{ fontSize:13 }}>
                <option value="">Todos</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Desde</label>
              <input type="date" value={filtros.fecha_inicio} onChange={e => setFiltros(f=>({...f, fecha_inicio:e.target.value}))} className="input" style={{ fontSize:13 }} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" value={filtros.fecha_fin} onChange={e => setFiltros(f=>({...f, fecha_fin:e.target.value}))} className="input" style={{ fontSize:13 }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Totales con filtros aplicados ── */}
      {hayFiltros && resumen && (
        <div style={{ background:'#eef2ff', borderRadius:14, padding:16, border:'2px solid #c7d2fe' }}>
          <p style={{ fontWeight:700, fontSize:14, color:'#3730a3', margin:'0 0 12px' }}>
            Totales del filtro aplicado
            {filtros.placa && ` — Placa: ${filtros.placa}`}
            {filtros.cliente_id && ` — Cliente: ${clientes.find(c => String(c.id) === String(filtros.cliente_id))?.razon_social || ''}`}
            {(filtros.fecha_inicio || filtros.fecha_fin) && ` — ${filtros.fecha_inicio || '...'} a ${filtros.fecha_fin || 'hoy'}`}
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10 }}>
            {[
              { label:'Nº viajes',        valor: resumen.total_viajes,                          color:'#111827' },
              { label:'Fletes cobrados',  valor: formatCOP(resumen.total_fletes),               color:'#1d4ed8' },
              { label:'Gastos del viaje', valor: formatCOP(resumen.total_gastos),               color:'#dc2626' },
              { label:'Costos mensuales', valor: formatCOP(resumen.total_costos_fijos),         color:'#dc2626' },
              { label:'Utilidad',         valor: formatCOP(resumen.utilidad),                   color: resumen.utilidad >= 0 ? '#15803d' : '#dc2626' },
              { label:'Margen',           valor: `${parseFloat(resumen.margen_pct||0).toFixed(1)}%`,       color:'#4f46e5' },
              { label:'Rentabilidad',     valor: `${parseFloat(resumen.rentabilidad_pct||0).toFixed(1)}%`, color:'#4f46e5' },
              { label:'Suma de saldos',   valor: formatCOP(resumen.total_saldos),               color:'#b45309' },
            ].map((k,i) => (
              <div key={i} style={{ background:'#fff', borderRadius:10, padding:'10px 12px', textAlign:'center', border:'1px solid #e0e7ff' }}>
                <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>{k.label}</p>
                <p style={{ fontSize:15, fontWeight:800, color:k.color, margin:'4px 0 0' }}>{k.valor}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs principales ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }} className="md:grid-cols-4">
        <KPI label="Ingresos del mes" icon={DollarSign} color="blue"
          valor={kpis ? formatCOP(parseFloat(kpis.total_ingresos||0)) : '—'}
          sub={kpis?.variacion_ingresos != null ? `${parseFloat(kpis.variacion_ingresos)>0?'↑':'↓'} ${Math.abs(parseFloat(kpis.variacion_ingresos)).toFixed(1)}%` : undefined} />
        <KPI label="Utilidad neta" icon={TrendingUp} color={parseFloat(kpis?.total_utilidad||0)>=0?'green':'red'}
          valor={kpis ? formatCOP(parseFloat(kpis.total_utilidad||0)) : '—'}
          sub={kpis?.variacion_utilidad != null ? `${parseFloat(kpis.variacion_utilidad)>0?'↑':'↓'} ${Math.abs(parseFloat(kpis.variacion_utilidad)).toFixed(1)}%` : undefined} />
        <KPI label="Rentabilidad" icon={BarChart2} color="blue"
          valor={kpis ? `${parseFloat(kpis.rentabilidad_promedio||0).toFixed(1)}%` : '—'}
          sub={kpis ? `${kpis.viajes_rentables||0} viajes rentables` : undefined} />
        <KPI label="Total viajes" icon={Truck} color="gray"
          valor={kpis ? kpis.total_viajes : '0'}
          sub={kpis ? `${parseFloat(kpis.total_km||0).toLocaleString('es-CO')} km` : '— km'} />
      </div>

      {/* ── KPIs secundarios ── */}
      {kpis && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }} className="md:grid-cols-4">
          {[
            { label:'Total costos (viajes + mensuales)', valor:formatCOP(parseFloat(kpis.total_costos||0)), color:'#dc2626' },
            { label:'Viajes completados', valor:kpis.viajes_rentables||0, color:'#15803d' },
            { label:'Viajes con pérdida', valor:kpis.viajes_perdida||0, color:'#dc2626' },
            { label:'Margen promedio', color:'#4f46e5', valor: `${parseFloat(kpis.margen_pct||0).toFixed(1)}%` },
          ].map((k,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:12, padding:'12px 16px', border:'1px solid #f1f5f9', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>{k.label}</p>
              <p style={{ fontSize:18, fontWeight:700, color:k.color, margin:'4px 0 0' }}>{k.valor}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Gráficos ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14 }} className="lg:grid-cols-2">
        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:'0 0 14px' }}>Evolución {anio} — Ingresos vs Utilidad</h3>
          {evolucion.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={evolucion} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={tickStyle} />
                <YAxis tickFormatter={v => `$${(v/1000000).toFixed(0)}M`} tick={tickStyle} width={45} />
                <Tooltip content={<TooltipCOP />} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="total_ingresos" name="Ingresos" fill="#6366f1" radius={[3,3,0,0]} />
                <Bar dataKey="total_costos"   name="Costos"   fill="#f87171" radius={[3,3,0,0]} />
                <Bar dataKey="total_utilidad" name="Utilidad" fill="#22c55e" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:180, color:'#9ca3af', fontSize:13 }}>Sin datos para {anio}</div>
          )}
        </div>

        <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:'0 0 14px' }}>Rentabilidad % mensual — {anio}</h3>
          {evolucion.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={evolucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tickFormatter={m => MESES[m]?.slice(0,3)} tick={tickStyle} />
                <YAxis tickFormatter={v => `${v}%`} tick={tickStyle} width={35} />
                <Tooltip formatter={v => [`${parseFloat(v).toFixed(1)}%`, 'Rentabilidad']} />
                <Line type="monotone" dataKey="rentabilidad_promedio" name="Rentabilidad %"
                  stroke="#6366f1" strokeWidth={2.5} dot={{ fill:'#6366f1', r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:180, color:'#9ca3af', fontSize:13 }}>Sin datos</div>
          )}
        </div>
      </div>

      {/* ── Top vehículos ── */}
      {topVehiculos.length > 0 && (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9' }}>
            <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:0 }}>Top vehículos — {MESES[mes]} {anio}</h3>
          </div>
          {/* Cards móvil */}
          <div className="lg:hidden" style={{ padding:12, display:'flex', flexDirection:'column', gap:8 }}>
            {topVehiculos.slice(0,5).map((v,i) => (
              <div key={i} style={{ background:'#f9fafb', borderRadius:10, padding:12, border:'1px solid #f1f5f9' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:700, background:'#e5e7eb', padding:'2px 8px', borderRadius:5, fontSize:12 }}>{v.placa}</span>
                  <span style={{ fontWeight:700, fontSize:14 }} className={colorRentabilidad(v.rentabilidad_promedio_pct)}>
                    {parseFloat(v.rentabilidad_promedio_pct||0).toFixed(1)}%
                  </span>
                </div>
                <p style={{ fontSize:12, color:'#374151', margin:'0 0 6px' }}>{v.vehiculo} · {v.total_viajes} viajes</p>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'#6b7280' }}>Ingresos: <strong style={{ color:'#1d4ed8' }}>{formatCOP(v.total_ingresos)}</strong></span>
                  <span style={{ fontSize:12, color:'#6b7280' }}>Utilidad: <strong style={{ color: v.total_utilidad>=0?'#15803d':'#dc2626' }}>{formatCOP(v.total_utilidad)}</strong></span>
                </div>
              </div>
            ))}
          </div>
          {/* Tabla desktop */}
          <div className="hidden lg:block" style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#1f2937' }}>
                  {['Placa','Vehículo','Viajes','Ingresos','Utilidad','Rentabilidad'].map(h => (
                    <th key={h} style={{ padding:'10px 18px', textAlign: h==='Ingresos'||h==='Utilidad'||h==='Rentabilidad'||h==='Viajes' ? 'right' : 'left', fontSize:11, fontWeight:600, color:'#d1d5db', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topVehiculos.slice(0,5).map((v,i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 18px' }}><span style={{ fontFamily:'monospace', fontWeight:700, background:'#f3f4f6', padding:'2px 8px', borderRadius:5, fontSize:11 }}>{v.placa}</span></td>
                    <td style={{ padding:'10px 18px', color:'#374151' }}>{v.vehiculo}</td>
                    <td style={{ padding:'10px 18px', textAlign:'right', color:'#374151' }}>{v.total_viajes}</td>
                    <td style={{ padding:'10px 18px', textAlign:'right', fontWeight:500, color:'#1d4ed8' }}>{formatCOP(v.total_ingresos)}</td>
                    <td style={{ padding:'10px 18px', textAlign:'right', fontWeight:700, color: v.total_utilidad>=0?'#15803d':'#dc2626' }}>{formatCOP(v.total_utilidad)}</td>
                    <td style={{ padding:'10px 18px', textAlign:'right', fontWeight:700 }}><span className={colorRentabilidad(v.rentabilidad_promedio_pct)}>{parseFloat(v.rentabilidad_promedio_pct||0).toFixed(1)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Últimos viajes ── */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:0 }}>
            {hayFiltros ? 'Viajes filtrados' : 'Últimos viajes'}
            {cargando && <span style={{ fontSize:11, color:'#9ca3af', marginLeft:8 }}>Cargando...</span>}
          </h3>
          <Link to="/viajes" style={{ fontSize:13, color:'#4f46e5', fontWeight:500, textDecoration:'none' }}>Ver todos →</Link>
        </div>

        {/* Cards en móvil */}
        <div className="lg:hidden" style={{ padding:12 }}>
          {viajes.length === 0 ? (
            <p style={{ textAlign:'center', color:'#9ca3af', padding:24, fontSize:13 }}>
              No hay viajes. <Link to="/viajes/nuevo" style={{ color:'#4f46e5' }}>Registrar el primero</Link>
            </p>
          ) : viajes.map(v => <ViajeRow key={v.id} v={v} />)}
        </div>

        {/* Tabla en desktop */}
        <div className="hidden lg:block" style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#1f2937' }}>
                {['Viaje / Fecha','Placa / Conductor','Ruta','Cliente','Flete','Utilidad','Rent.','Estado'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign: ['Flete','Utilidad','Rent.'].includes(h)?'right':['Estado'].includes(h)?'center':'left', fontSize:11, fontWeight:600, color:'#d1d5db', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viajes.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>
                  No hay viajes. <Link to="/viajes/nuevo" style={{ color:'#4f46e5' }}>Registrar el primero</Link>
                </td></tr>
              ) : viajes.map(v => <ViajeRow key={v.id} v={v} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
