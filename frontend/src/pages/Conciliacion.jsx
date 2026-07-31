import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Landmark, Plus, Trash2, X, Calendar, CalendarRange } from 'lucide-react'
import toast from 'react-hot-toast'
import { conciliacionAPI } from '../services/api'
import { formatCOP, formatFecha } from '../utils/format'

const hoy = new Date()
// Fecha LOCAL (Colombia), no UTC — toISOString() adelanta el día en la noche
const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

const BANCOS = ['Nequi', 'Bancolombia', 'Davivienda', 'Otro']
const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: '#b45309', bg: '#fffbeb' },
  { value: 'revisada',  label: 'Revisada',  color: '#1d4ed8', bg: '#eff6ff' },
  { value: 'autorizada',label: 'Autorizada',color: '#15803d', bg: '#f0fdf4' },
]
const COLOR_BANCO = { Nequi: '#7c3aed', Bancolombia: '#f59e0b', Davivienda: '#dc2626', Otro: '#6b7280' }
const estadoInfo = (e) => ESTADOS.find(x => x.value === e) || ESTADOS[0]

const GASTO_INICIAL = { banco: 'Nequi', cliente: '', comprobante: '', valor: '', estado: 'revisada', reviso: '', autorizo: '', observaciones: '' }

export default function Conciliacion() {
  const [modo, setModo]       = useState('diario') // 'diario' | 'mensual'
  const [filtros, setFiltros] = useState({ fecha: hoyStr, fecha_inicio: primerDiaMes, fecha_fin: hoyStr, banco: '', cliente: '', estado: '' })
  const [registros, setRegistros] = useState([])
  const [resumen, setResumen]     = useState(null)
  const [nuevo, setNuevo]         = useState(GASTO_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando]   = useState(true)

  // Los parámetros que se envían según el modo
  const paramsActivos = useCallback(() => {
    const p = { banco: filtros.banco, cliente: filtros.cliente, estado: filtros.estado }
    if (modo === 'diario') p.fecha = filtros.fecha
    else { p.fecha_inicio = filtros.fecha_inicio; p.fecha_fin = filtros.fecha_fin }
    Object.keys(p).forEach(k => !p[k] && delete p[k])
    return p
  }, [modo, filtros])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const p = paramsActivos()
      const [rReg, rRes] = await Promise.all([
        conciliacionAPI.listar(p),
        conciliacionAPI.resumen(p),
      ])
      setRegistros(rReg.data.datos || [])
      setResumen(rRes.data.datos || null)
    } catch { toast.error('Error cargando conciliación') }
    finally { setCargando(false) }
  }, [paramsActivos])

  useEffect(() => { cargar() }, [cargar])

  const agregar = async () => {
    if (!nuevo.valor || parseFloat(nuevo.valor) <= 0) { toast.error('Ingresa un valor válido'); return }
    setGuardando(true)
    try {
      await conciliacionAPI.crear(nuevo)
      toast.success('Transferencia registrada')
      setNuevo(GASTO_INICIAL)
      cargar()
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al registrar') }
    finally { setGuardando(false) }
  }

  const cambiarEstado = async (r, estado) => {
    try { await conciliacionAPI.actualizar(r.id, { estado }); cargar() }
    catch { toast.error('Error al actualizar') }
  }

  const eliminar = async (r) => {
    if (!confirm(`¿Eliminar la transferencia de ${formatCOP(r.valor)}?`)) return
    try { await conciliacionAPI.eliminar(r.id); toast.success('Eliminado'); cargar() }
    catch { toast.error('Error al eliminar') }
  }

  const dataBanco  = (resumen?.por_banco || []).map(b => ({ name: b.banco, value: parseFloat(b.valor), cantidad: b.cantidad }))
  const dataDia    = (resumen?.por_dia || []).map(d => ({ dia: d.dia?.substring(5), valor: parseFloat(d.valor) }))
  const totalPend  = (resumen?.por_estado || []).find(e => e.estado === 'pendiente')
  const totalAut   = (resumen?.por_estado || []).find(e => e.estado === 'autorizada')
  const totalRev   = (resumen?.por_estado || []).find(e => e.estado === 'revisada')

  const th = { padding:'9px 10px', textAlign:'left', fontSize:11, fontWeight:600, color:'#d1d5db', textTransform:'uppercase', whiteSpace:'nowrap' }
  const td = { padding:'8px 10px', fontSize:13, whiteSpace:'nowrap' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Landmark style={{ width:20, height:20, color:'#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>Conciliación bancaria</h1>
          <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>Registra una vez — la conciliación, reportes y gráficos se generan solos</p>
        </div>
      </div>

      {/* Formulario de ingreso */}
      <div className="card p-5">
        <p style={{ fontWeight:700, fontSize:14, color:'#111827', margin:'0 0 12px' }}>Registrar transferencia revisada / autorizada</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12, alignItems:'end' }}>
          <div>
            <label className="label">Valor ($)</label>
            <input type="number" value={nuevo.valor} onChange={e => setNuevo(n => ({ ...n, valor: e.target.value }))} placeholder="0" className="input" />
          </div>
          <div>
            <label className="label">Banco</label>
            <select value={nuevo.banco} onChange={e => setNuevo(n => ({ ...n, banco: e.target.value }))} className="input">
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cliente</label>
            <input value={nuevo.cliente} onChange={e => setNuevo(n => ({ ...n, cliente: e.target.value }))} placeholder="Nombre" className="input" />
          </div>
          <div>
            <label className="label">Comprobante</label>
            <input value={nuevo.comprobante} onChange={e => setNuevo(n => ({ ...n, comprobante: e.target.value }))} placeholder="N° / ref" className="input" />
          </div>
          <div>
            <label className="label">Estado</label>
            <select value={nuevo.estado} onChange={e => setNuevo(n => ({ ...n, estado: e.target.value }))} className="input">
              {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Autorizó</label>
            <input value={nuevo.autorizo} onChange={e => setNuevo(n => ({ ...n, autorizo: e.target.value }))} placeholder="Opcional" className="input" />
          </div>
          <button onClick={agregar} disabled={guardando} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', height:42 }}>
            <Plus style={{ width:16, height:16 }} /> {guardando ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
        <p style={{ fontSize:11, color:'#9ca3af', margin:'10px 0 0' }}>La fecha y la hora se toman automáticamente al registrar.</p>
      </div>

      {/* Selector de modo + filtros */}
      <div className="card p-4" style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end' }}>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => setModo('diario')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, fontSize:13, fontWeight:500, border:'1px solid', cursor:'pointer', background: modo==='diario'?'#4f46e5':'#fff', color: modo==='diario'?'#fff':'#374151', borderColor: modo==='diario'?'#4f46e5':'#d1d5db' }}>
            <Calendar style={{ width:15, height:15 }} /> Diario
          </button>
          <button onClick={() => setModo('mensual')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, fontSize:13, fontWeight:500, border:'1px solid', cursor:'pointer', background: modo==='mensual'?'#4f46e5':'#fff', color: modo==='mensual'?'#fff':'#374151', borderColor: modo==='mensual'?'#4f46e5':'#d1d5db' }}>
            <CalendarRange style={{ width:15, height:15 }} /> Mensual / rango
          </button>
        </div>

        {modo === 'diario' ? (
          <div>
            <label className="label">Fecha</label>
            <input type="date" value={filtros.fecha} onChange={e => setFiltros(f => ({ ...f, fecha: e.target.value }))} className="input" />
          </div>
        ) : (
          <>
            <div>
              <label className="label">Desde</label>
              <input type="date" value={filtros.fecha_inicio} onChange={e => setFiltros(f => ({ ...f, fecha_inicio: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" value={filtros.fecha_fin} onChange={e => setFiltros(f => ({ ...f, fecha_fin: e.target.value }))} className="input" />
            </div>
          </>
        )}
        <div>
          <label className="label">Banco</label>
          <select value={filtros.banco} onChange={e => setFiltros(f => ({ ...f, banco: e.target.value }))} className="input">
            <option value="">Todos</option>
            {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))} className="input">
            <option value="">Todos</option>
            {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Cliente</label>
          <input value={filtros.cliente} onChange={e => setFiltros(f => ({ ...f, cliente: e.target.value }))} placeholder="Buscar" className="input" />
        </div>
      </div>

      {/* Dashboard de totales */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10 }}>
        {[
          { label: modo==='diario' ? 'Total del día' : 'Total del período', valor: formatCOP(resumen?.total_valor || 0), color:'#4f46e5' },
          { label:'N° transferencias', valor: resumen?.total_registros || 0, color:'#111827' },
          { label:'Autorizadas', valor: formatCOP(totalAut?.valor || 0), color:'#15803d' },
          { label:'Revisadas', valor: formatCOP(totalRev?.valor || 0), color:'#1d4ed8' },
          { label:'Pendientes', valor: formatCOP(totalPend?.valor || 0), color:'#b45309' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding:'12px 16px', textAlign:'center' }}>
            <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>{k.label}</p>
            <p style={{ fontSize:16, fontWeight:800, color:k.color, margin:'4px 0 0', overflow:'hidden', textOverflow:'ellipsis' }}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14 }} className="lg:grid-cols-2">
        <div className="card p-4">
          <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:'0 0 12px' }}>Distribución por banco</h3>
          {dataBanco.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataBanco} cx="45%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                  {dataBanco.map((e, i) => <Cell key={i} fill={COLOR_BANCO[e.name] || '#6b7280'} />)}
                </Pie>
                <Tooltip formatter={v => formatCOP(v)} />
                <Legend wrapperStyle={{ fontSize:12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontSize:13 }}>Sin datos</div>}
        </div>
        <div className="card p-4">
          <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:'0 0 12px' }}>Transferencias por día</h3>
          {dataDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dia" tick={{ fontSize:10, fill:'#374151' }} />
                <YAxis tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={{ fontSize:10, fill:'#374151' }} width={42} />
                <Tooltip formatter={v => formatCOP(v)} />
                <Bar dataKey="valor" name="Valor" fill="#4f46e5" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontSize:13 }}>Sin datos</div>}
        </div>
      </div>

      {/* Tabla de registros */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9' }}>
          <h3 style={{ fontWeight:700, fontSize:14, color:'#111827', margin:0 }}>
            Registro de transferencias {cargando && <span style={{ fontSize:11, color:'#9ca3af' }}>· cargando...</span>}
          </h3>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#1f2937' }}>
                <th style={th}>Fecha</th><th style={th}>Hora</th><th style={th}>Banco</th>
                <th style={th}>Cliente</th><th style={th}>Comprobante</th>
                <th style={{ ...th, textAlign:'right' }}>Valor</th><th style={th}>Estado</th>
                <th style={th}>Autorizó</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>No hay transferencias registradas con estos filtros</td></tr>
              ) : registros.map(r => {
                const si = estadoInfo(r.estado)
                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                    <td style={td}>{formatFecha(r.fecha)}</td>
                    <td style={{ ...td, color:'#6b7280' }}>{r.hora}</td>
                    <td style={td}><span style={{ fontWeight:600, color: COLOR_BANCO[r.banco] || '#374151' }}>{r.banco}</span></td>
                    <td style={td}>{r.cliente || '—'}</td>
                    <td style={{ ...td, color:'#6b7280' }}>{r.comprobante || '—'}</td>
                    <td style={{ ...td, textAlign:'right', fontWeight:700, color:'#111827' }}>{formatCOP(r.valor)}</td>
                    <td style={td}>
                      <select value={r.estado} onChange={e => cambiarEstado(r, e.target.value)}
                        style={{ fontSize:12, fontWeight:700, padding:'3px 8px', borderRadius:20, border:'none', cursor:'pointer', color: si.color, background: si.bg }}>
                        {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={{ ...td, color:'#6b7280' }}>{r.autorizo || '—'}</td>
                    <td style={td}>
                      <button onClick={() => eliminar(r)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#dc2626' }}>
                        <Trash2 style={{ width:15, height:15 }} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
