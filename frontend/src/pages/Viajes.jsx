import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Truck, Trash2, Filter, X } from 'lucide-react'
import { viajesAPI } from '../services/api'
import { formatCOP, formatPct, formatFecha, colorRentabilidad, badgeEstado, labelEstado } from '../utils/format'
import toast from 'react-hot-toast'

const ESTADOS = ['','programado','en_curso','completado','cancelado','liquidado']

export default function Viajes() {
  const [viajes, setViajes]     = useState([])
  const [total, setTotal]       = useState(0)
  const [cargando, setCargando] = useState(true)
  const [pagina, setPagina]     = useState(1)
  const [filtros, setFiltros]   = useState({ placa:'', estado:'', fecha_inicio:'', fecha_fin:'' })
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const eliminar = async (v, e) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`¿Eliminar el viaje ${v.numero_viaje}? Esta acción no se puede deshacer.`)) return
    try {
      await viajesAPI.eliminar(v.id)
      toast.success('Viaje eliminado')
      cargar()
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al eliminar') }
  }

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = { pagina, limite:20, ...filtros }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const res = await viajesAPI.listar(params)
      setViajes(res.data.datos)
      setTotal(res.data.paginacion.total)
    } catch { toast.error('Error cargando viajes') }
    finally { setCargando(false) }
  }, [pagina, filtros])

  useEffect(() => { cargar() }, [cargar])

  const hayFiltros = Object.values(filtros).some(v => v !== '')
  const limpiar = () => { setFiltros({ placa:'', estado:'', fecha_inicio:'', fecha_fin:'' }); setPagina(1) }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>Viajes</h1>
          <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>{total} viajes registrados</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, fontSize:13, fontWeight:500, border:'1px solid', borderColor: mostrarFiltros||hayFiltros?'#4f46e5':'#d1d5db', background: mostrarFiltros||hayFiltros?'#4f46e5':'#fff', color: mostrarFiltros||hayFiltros?'#fff':'#374151', cursor:'pointer' }}>
            <Filter style={{ width:14, height:14 }} />
            <span className="hidden sm:inline">Filtros</span>
            {hayFiltros && <span style={{ background:'#fff', color:'#4f46e5', fontSize:10, borderRadius:20, padding:'1px 5px', fontWeight:700 }}>!</span>}
          </button>
          <Link to="/viajes/nuevo" className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <Plus style={{ width:14, height:14 }} />
            <span className="hidden sm:inline">Nuevo viaje</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        </div>
      </div>

      {/* ── Panel filtros ── */}
      {mostrarFiltros && (
        <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ fontWeight:600, fontSize:14, color:'#111827', margin:0 }}>Filtrar viajes</p>
            {hayFiltros && (
              <button onClick={limpiar} style={{ fontSize:12, color:'#dc2626', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                <X style={{ width:12, height:12 }} /> Limpiar
              </button>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10 }}>
            <div>
              <label className="label">Placa</label>
              <div style={{ position:'relative' }}>
                <Truck style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'#9ca3af' }} />
                <input value={filtros.placa} onChange={e => setFiltros(f=>({...f, placa:e.target.value.toUpperCase()}))}
                  placeholder="ABC123" className="input font-mono uppercase" style={{ paddingLeft:32, fontSize:13 }} />
              </div>
            </div>
            <div>
              <label className="label">Estado</label>
              <select value={filtros.estado} onChange={e => setFiltros(f=>({...f, estado:e.target.value}))} className="input" style={{ fontSize:13 }}>
                {ESTADOS.map(e => <option key={e} value={e}>{e ? labelEstado(e) : 'Todos'}</option>)}
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
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button onClick={() => { setPagina(1); cargar() }} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
              <Search style={{ width:14, height:14 }} /> Buscar
            </button>
          </div>
        </div>
      )}

      {/* ── Cargando ── */}
      {cargando && (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div style={{ width:32, height:32, border:'4px solid #e0e7ff', borderTop:'4px solid #4f46e5', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
        </div>
      )}

      {/* ── Vista móvil: cards ── */}
      {!cargando && (
        <div className="lg:hidden" style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {viajes.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>
              No se encontraron viajes.{' '}
              <Link to="/viajes/nuevo" style={{ color:'#4f46e5' }}>Crear el primero</Link>
            </div>
          ) : viajes.map(v => (
            <div key={v.id} style={{ background:'#fff', borderRadius:14, border:'1px solid #f1f5f9', padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              {/* Fila 1: número + estado */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <Link to={`/viajes/${v.id}`} style={{ fontWeight:700, fontSize:15, color:'#4f46e5', textDecoration:'none' }}>{v.numero_viaje}</Link>
                  <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{formatFecha(v.fecha_salida)}</p>
                </div>
                <span className={badgeEstado(v.estado)}>{labelEstado(v.estado)}</span>
              </div>

              {/* Fila 2: placa + ruta */}
              <div style={{ display:'flex', gap:10, marginBottom:10, flexWrap:'wrap' }}>
                <span style={{ fontFamily:'monospace', fontWeight:700, background:'#f3f4f6', padding:'3px 10px', borderRadius:6, fontSize:12, color:'#111827' }}>{v.placa}</span>
                <span style={{ fontSize:12, color:'#374151', alignSelf:'center' }}>{v.origen} → {v.destino}</span>
              </div>

              {/* Fila 3: conductor + cliente */}
              <p style={{ fontSize:12, color:'#6b7280', margin:'0 0 10px' }}>
                🧑 {v.conductor} · 🏢 {v.cliente}
              </p>

              {/* Fila 4: cifras */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'10px 0', borderTop:'1px solid #f3f4f6' }}>
                <div style={{ textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>Flete</p>
                  <p style={{ fontSize:13, fontWeight:700, color:'#1d4ed8', margin:'2px 0 0' }}>{formatCOP(v.valor_flete_cobrado)}</p>
                </div>
                <div style={{ textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>Utilidad</p>
                  <p style={{ fontSize:13, fontWeight:700, color: v.utilidad_neta>=0?'#15803d':'#dc2626', margin:'2px 0 0' }}>{formatCOP(v.utilidad_neta)}</p>
                </div>
                <div style={{ textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>Rent.</p>
                  <p style={{ fontSize:14, fontWeight:800, margin:'2px 0 0' }} className={colorRentabilidad(v.rentabilidad_pct)}>{formatPct(v.rentabilidad_pct)}</p>
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display:'flex', gap:8, marginTop:10, justifyContent:'flex-end' }}>
                <Link to={`/viajes/${v.id}`} style={{ fontSize:13, color:'#4f46e5', fontWeight:600, textDecoration:'none', padding:'6px 14px', background:'#eff6ff', borderRadius:8 }}>Ver detalle →</Link>
                <button onClick={(e) => eliminar(v, e)}
                  style={{ padding:'6px 10px', background:'#fef2f2', border:'none', borderRadius:8, cursor:'pointer', color:'#dc2626' }}>
                  <Trash2 style={{ width:15, height:15 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Vista desktop: tabla ── */}
      {!cargando && (
        <div className="hidden lg:block" style={{ background:'#fff', borderRadius:14, border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#1f2937' }}>
                  {['Viaje / Fecha','Placa / Conductor','Ruta','Cliente','Flete','Utilidad','Rent.','Estado',''].map((h,i) => (
                    <th key={i} style={{ padding:'10px 16px', textAlign:['Flete','Utilidad','Rent.'].includes(h)?'right':h==='Estado'?'center':'left', fontSize:11, fontWeight:600, color:'#d1d5db', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viajes.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>
                    No se encontraron viajes. <Link to="/viajes/nuevo" style={{ color:'#4f46e5' }}>Crear el primero</Link>
                  </td></tr>
                ) : viajes.map(v => (
                  <tr key={v.id} style={{ borderBottom:'1px solid #f3f4f6' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 16px' }}>
                      <Link to={`/viajes/${v.id}`} style={{ fontWeight:600, color:'#4f46e5', textDecoration:'none' }}>{v.numero_viaje}</Link>
                      <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{formatFecha(v.fecha_salida)}</p>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ fontFamily:'monospace', fontWeight:700, background:'#f3f4f6', padding:'2px 7px', borderRadius:5, fontSize:11 }}>{v.placa}</span>
                      <p style={{ fontSize:11, color:'#6b7280', margin:'3px 0 0' }}>{v.conductor}</p>
                    </td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:'#374151' }}>{v.origen} → {v.destino}</td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:'#6b7280' }}>{v.cliente}</td>
                    <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:500, color:'#111827' }}>{formatCOP(v.valor_flete_cobrado)}</td>
                    <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color: v.utilidad_neta>=0?'#15803d':'#dc2626' }}>{formatCOP(v.utilidad_neta)}</td>
                    <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:800 }}>
                      <span className={colorRentabilidad(v.rentabilidad_pct)}>{formatPct(v.rentabilidad_pct)}</span>
                    </td>
                    <td style={{ padding:'10px 16px', textAlign:'center' }}>
                      <span className={badgeEstado(v.estado)}>{labelEstado(v.estado)}</span>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                        <Link to={`/viajes/${v.id}`} style={{ fontSize:12, color:'#4f46e5', fontWeight:500, textDecoration:'none' }}>Ver →</Link>
                        <button onClick={(e) => eliminar(v,e)}
                          style={{ padding:'4px', background:'transparent', border:'none', borderRadius:6, cursor:'pointer', color:'#ef4444' }}>
                          <Trash2 style={{ width:14, height:14 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderTop:'1px solid #f1f5f9', fontSize:13, color:'#6b7280' }}>
              <span>Mostrando {viajes.length} de {total}</span>
              <div style={{ display:'flex', gap:8 }}>
                <button disabled={pagina===1} onClick={() => setPagina(p=>p-1)} className="btn-secondary" style={{ fontSize:12, padding:'5px 12px', opacity:pagina===1?0.4:1 }}>← Anterior</button>
                <button disabled={pagina*20>=total} onClick={() => setPagina(p=>p+1)} className="btn-secondary" style={{ fontSize:12, padding:'5px 12px', opacity:pagina*20>=total?0.4:1 }}>Siguiente →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paginación móvil */}
      {!cargando && total > 20 && (
        <div className="lg:hidden" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, color:'#6b7280' }}>
          <span>{viajes.length} de {total}</span>
          <div style={{ display:'flex', gap:8 }}>
            <button disabled={pagina===1} onClick={() => setPagina(p=>p-1)} className="btn-secondary" style={{ fontSize:12, opacity:pagina===1?0.4:1 }}>← Ant.</button>
            <button disabled={pagina*20>=total} onClick={() => setPagina(p=>p+1)} className="btn-secondary" style={{ fontSize:12, opacity:pagina*20>=total?0.4:1 }}>Sig. →</button>
          </div>
        </div>
      )}
    </div>
  )
}
