 import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Truck, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { vehiculosAPI } from '../services/api'
import { formatNum, formatFecha } from '../utils/format'

const TIPOS        = ['camion','tracto','furgon','doble_troque','minimula','otro']
const COMBUSTIBLES = ['diesel','gasolina','gas','electrico','hibrido']
const FORM_INICIAL = {
  placa:'', marca:'', modelo:'', anio: new Date().getFullYear(),
  tipo:'camion', tipo_combustible:'diesel',
  capacidad_carga_kg:'', rendimiento_km_galon:'',
  soat_vencimiento:'', soat_aseguradora:'', soat_numero_poliza:'',
  tecnomecanica_vencimiento:'', tecnomecanica_numero:'',
  numero_motor:'', numero_chasis:'', color:'', propietario:'', observaciones:''
}

const diasParaVencer = (fecha) => {
  if (!fecha) return null
  const diff = Math.ceil((new Date(fecha) - new Date()) / (1000*60*60*24))
  return diff
}

const BadgeVencimiento = ({ fecha }) => {
  if (!fecha) return <span style={{ fontSize:12, color:'#9ca3af' }}>Sin registrar</span>
  const dias = diasParaVencer(fecha)
  if (dias < 0) return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <AlertTriangle style={{ width:12, height:12, color:'#dc2626' }} />
      <span style={{ fontSize:12, color:'#dc2626', fontWeight:500 }}>Vencido</span>
    </div>
  )
  if (dias <= 30) return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <AlertTriangle style={{ width:12, height:12, color:'#d97706' }} />
      <span style={{ fontSize:12, color:'#d97706', fontWeight:500 }}>Vence en {dias}d</span>
    </div>
  )
  return <span style={{ fontSize:12, color:'#15803d' }}>{formatFecha(fecha)}</span>
}

// ── Modal ─────────────────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)' }} />
      <div style={{ position:'relative', background:'#fff', borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #f1f5f9', position:'sticky', top:0, background:'#fff', zIndex:10 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#111827', margin:0 }}>{titulo}</h2>
          <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', padding:6, borderRadius:8 }}>
            <X style={{ width:18, height:18, color:'#6b7280' }} />
          </button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Formulario vehículo ───────────────────────────────────
function FormVehiculo({ inicial, onGuardar, onCancelar, cargando }) {
  const [form, setForm] = useState(inicial || FORM_INICIAL)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const Field = ({ label, children }) => (
    <div>
      <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>{label}</label>
      {children}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Datos básicos */}
      <div>
        <p style={{ fontSize:13, fontWeight:700, color:'#374151', borderBottom:'1px solid #f1f5f9', paddingBottom:6, marginBottom:12 }}>Datos del vehículo</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
          <Field label="Placa *">
            <input value={form.placa} onChange={e => set('placa', e.target.value.toUpperCase())}
              placeholder="ABC123" className="input font-mono uppercase" maxLength={10} />
          </Field>
          <Field label="Tipo *">
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="input">
              {TIPOS.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select>
          </Field>
          <Field label="Marca *">
            <input value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="Kenworth, Hino..." className="input" />
          </Field>
          <Field label="Modelo *">
            <input value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="T800, FC..." className="input" />
          </Field>
          <Field label="Año *">
            <input type="number" value={form.anio} onChange={e => set('anio', e.target.value)} min="1990" max="2030" className="input" />
          </Field>
          <Field label="Combustible">
            <select value={form.tipo_combustible} onChange={e => set('tipo_combustible', e.target.value)} className="input">
              {COMBUSTIBLES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Capacidad (kg)">
            <input type="number" value={form.capacidad_carga_kg} onChange={e => set('capacidad_carga_kg', e.target.value)} placeholder="35000" className="input" />
          </Field>
          <Field label="Rendimiento (km/gal)">
            <input type="number" step="0.1" value={form.rendimiento_km_galon} onChange={e => set('rendimiento_km_galon', e.target.value)} placeholder="8.5" className="input" />
          </Field>
          <Field label="Color">
            <input value={form.color} onChange={e => set('color', e.target.value)} className="input" />
          </Field>
          <Field label="Propietario">
            <input value={form.propietario} onChange={e => set('propietario', e.target.value)} placeholder="Si es de tercero" className="input" />
          </Field>
          <Field label="N° Motor">
            <input value={form.numero_motor} onChange={e => set('numero_motor', e.target.value)} className="input" />
          </Field>
          <Field label="N° Chasis">
            <input value={form.numero_chasis} onChange={e => set('numero_chasis', e.target.value)} className="input" />
          </Field>
        </div>
      </div>

      {/* SOAT */}
      <div>
        <p style={{ fontSize:13, fontWeight:700, color:'#374151', borderBottom:'1px solid #f1f5f9', paddingBottom:6, marginBottom:12 }}>🛡️ SOAT</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
          <Field label="Vencimiento SOAT">
            <input type="date" value={form.soat_vencimiento||''} onChange={e => set('soat_vencimiento', e.target.value)} className="input" />
          </Field>
          <Field label="Aseguradora">
            <input value={form.soat_aseguradora||''} onChange={e => set('soat_aseguradora', e.target.value)} placeholder="Sura, Bolívar..." className="input" />
          </Field>
          <Field label="N° Póliza">
            <input value={form.soat_numero_poliza||''} onChange={e => set('soat_numero_poliza', e.target.value)} className="input" />
          </Field>
        </div>
      </div>

      {/* Tecnomecánica */}
      <div>
        <p style={{ fontSize:13, fontWeight:700, color:'#374151', borderBottom:'1px solid #f1f5f9', paddingBottom:6, marginBottom:12 }}>🔧 Tecnomecánica</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
          <Field label="Vencimiento">
            <input type="date" value={form.tecnomecanica_vencimiento||''} onChange={e => set('tecnomecanica_vencimiento', e.target.value)} className="input" />
          </Field>
          <Field label="N° Certificado">
            <input value={form.tecnomecanica_numero||''} onChange={e => set('tecnomecanica_numero', e.target.value)} className="input" />
          </Field>
        </div>
      </div>

      <div>
        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Observaciones</label>
        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2} className="input resize-none" />
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onCancelar} className="btn-secondary">Cancelar</button>
        <button onClick={() => onGuardar(form)} disabled={cargando} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Save style={{ width:14, height:14 }} />
          {cargando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────
export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [total, setTotal]         = useState(0)
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda]   = useState('')
  const [modal, setModal]         = useState(null)
  const [pagina, setPagina]       = useState(1)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = { pagina, limite:20 }
      if (busqueda) params.placa = busqueda
      const res = await vehiculosAPI.listar(params)
      setVehiculos(res.data.datos || [])
      setTotal(res.data.paginacion?.total || 0)
    } catch { toast.error('Error cargando vehículos') }
    finally { setCargando(false) }
  }, [pagina, busqueda])

  useEffect(() => { cargar() }, [cargar])

  const guardarNuevo = async (form) => {
    if (!form.placa || !form.marca || !form.modelo) { toast.error('Placa, marca y modelo son requeridos'); return }
    setGuardando(true)
    try {
      await vehiculosAPI.crear(form)
      toast.success('Vehículo creado')
      setModal(null); cargar()
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al crear') }
    finally { setGuardando(false) }
  }

  const guardarEdicion = async (form) => {
    setGuardando(true)
    try {
      await vehiculosAPI.actualizar(modal.id, form)
      toast.success('Vehículo actualizado')
      setModal(null); cargar()
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al actualizar') }
    finally { setGuardando(false) }
  }

  const eliminar = async (v) => {
    if (!confirm(`¿Eliminar el vehículo ${v.placa}?`)) return
    try { await vehiculosAPI.eliminar(v.id); toast.success('Eliminado'); cargar() }
    catch { toast.error('Error al eliminar') }
  }

  const alertas = vehiculos.filter(v => {
    const ds = diasParaVencer(v.soat_vencimiento)
    const dt = diasParaVencer(v.tecnomecanica_vencimiento)
    return (ds !== null && ds <= 30) || (dt !== null && dt <= 30)
  }).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>Vehículos</h1>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4, flexWrap:'wrap' }}>
            <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>{total} vehículos</p>
            {alertas > 0 && (
              <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#d97706', fontWeight:600, background:'#fffbeb', padding:'2px 10px', borderRadius:20, border:'1px solid #fde68a' }}>
                <AlertTriangle style={{ width:12, height:12 }} />
                {alertas} documentos por vencer
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setModal('nuevo')} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
          <Plus style={{ width:14, height:14 }} />
          <span className="hidden sm:inline">Nuevo vehículo</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* ── Búsqueda ── */}
      <div style={{ background:'#fff', borderRadius:12, padding:14, border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1, position:'relative' }}>
            <Truck style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:15, height:15, color:'#9ca3af' }} />
            <input value={busqueda}
              onChange={e => { setBusqueda(e.target.value.toUpperCase()); setPagina(1) }}
              placeholder="Buscar por placa..."
              className="input font-mono uppercase" style={{ paddingLeft:34, fontSize:13 }} />
          </div>
          <button onClick={cargar} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <Search style={{ width:14, height:14 }} />
            <span className="hidden sm:inline">Buscar</span>
          </button>
          {busqueda && (
            <button onClick={() => { setBusqueda(''); setPagina(1) }} className="btn-secondary" style={{ fontSize:13 }}>
              <X style={{ width:14, height:14 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Cargando ── */}
      {cargando && (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div style={{ width:32, height:32, border:'4px solid #e0e7ff', borderTop:'4px solid #4f46e5', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
        </div>
      )}

      {/* ── Vista móvil: cards ── */}
      {!cargando && (
        <div className="lg:hidden" style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {vehiculos.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>
              No hay vehículos.{' '}
              <button onClick={() => setModal('nuevo')} style={{ color:'#4f46e5', background:'none', border:'none', cursor:'pointer', fontSize:13 }}>Agregar el primero</button>
            </div>
          ) : vehiculos.map(v => {
            const dsSoat = diasParaVencer(v.soat_vencimiento)
            const dtTec  = diasParaVencer(v.tecnomecanica_vencimiento)
            const alerta = (dsSoat !== null && dsSoat <= 30) || (dtTec !== null && dtTec <= 30)
            return (
              <div key={v.id} style={{ background:'#fff', borderRadius:14, border:`1px solid ${alerta?'#fde68a':'#f1f5f9'}`, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:16, color:'#111827', background:'#f3f4f6', padding:'3px 10px', borderRadius:8 }}>{v.placa}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:11, fontWeight:600, background: v.activo?'#dcfce7':'#fee2e2', color: v.activo?'#15803d':'#dc2626', padding:'2px 8px', borderRadius:20 }}>
                      {v.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                <p style={{ fontWeight:600, fontSize:14, color:'#111827', margin:'0 0 2px' }}>{v.marca} {v.modelo}</p>
                <p style={{ fontSize:12, color:'#6b7280', margin:'0 0 10px' }}>Año {v.anio} · {v.tipo?.replace('_',' ')} · {v.tipo_combustible}</p>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                  <div style={{ background:'#f9fafb', borderRadius:8, padding:'8px 10px' }}>
                    <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>Capacidad</p>
                    <p style={{ fontSize:13, fontWeight:600, color:'#111827', margin:'2px 0 0' }}>{v.capacidad_carga_kg ? `${formatNum(v.capacidad_carga_kg)} kg` : '—'}</p>
                  </div>
                  <div style={{ background:'#f9fafb', borderRadius:8, padding:'8px 10px' }}>
                    <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>Rendimiento</p>
                    <p style={{ fontSize:13, fontWeight:600, color:'#111827', margin:'2px 0 0' }}>{v.rendimiento_km_galon ? `${v.rendimiento_km_galon} km/gal` : '—'}</p>
                  </div>
                </div>

                <div style={{ borderTop:'1px solid #f3f4f6', paddingTop:10, marginBottom:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  <div>
                    <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 2px' }}>🛡️ SOAT</p>
                    <BadgeVencimiento fecha={v.soat_vencimiento} />
                    {v.soat_aseguradora && <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{v.soat_aseguradora}</p>}
                  </div>
                  <div>
                    <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 2px' }}>🔧 Tecnomecánica</p>
                    <BadgeVencimiento fecha={v.tecnomecanica_vencimiento} />
                  </div>
                </div>

                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button onClick={() => setModal(v)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'#eff6ff', border:'none', borderRadius:8, cursor:'pointer', color:'#4f46e5', fontSize:13, fontWeight:500 }}>
                    <Edit2 style={{ width:13, height:13 }} /> Editar
                  </button>
                  <button onClick={() => eliminar(v)}
                    style={{ padding:'7px 10px', background:'#fef2f2', border:'none', borderRadius:8, cursor:'pointer', color:'#dc2626' }}>
                    <Trash2 style={{ width:14, height:14 }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Vista desktop: tabla ── */}
      {!cargando && (
        <div className="hidden lg:block" style={{ background:'#fff', borderRadius:14, border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#1f2937' }}>
                  {['Placa','Vehículo','Tipo','Capacidad','Km/Gal','🛡️ SOAT','🔧 Tecnomecánica','Estado',''].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'#d1d5db', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehiculos.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>
                    No hay vehículos. <button onClick={() => setModal('nuevo')} style={{ color:'#4f46e5', background:'none', border:'none', cursor:'pointer' }}>Agregar el primero</button>
                  </td></tr>
                ) : vehiculos.map(v => (
                  <tr key={v.id} style={{ borderBottom:'1px solid #f3f4f6' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ fontFamily:'monospace', fontWeight:700, background:'#f3f4f6', padding:'3px 8px', borderRadius:6, fontSize:12, color:'#111827' }}>{v.placa}</span>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <p style={{ fontWeight:600, color:'#111827', margin:0 }}>{v.marca} {v.modelo}</p>
                      <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>Año {v.anio}</p>
                    </td>
                    <td style={{ padding:'10px 16px', color:'#374151', textTransform:'capitalize' }}>{v.tipo?.replace('_',' ')}</td>
                    <td style={{ padding:'10px 16px', color:'#374151' }}>{v.capacidad_carga_kg ? `${formatNum(v.capacidad_carga_kg)} kg` : '—'}</td>
                    <td style={{ padding:'10px 16px', color:'#374151' }}>{v.rendimiento_km_galon ? `${v.rendimiento_km_galon} km/gal` : '—'}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <BadgeVencimiento fecha={v.soat_vencimiento} />
                      {v.soat_aseguradora && <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{v.soat_aseguradora}</p>}
                    </td>
                    <td style={{ padding:'10px 16px' }}><BadgeVencimiento fecha={v.tecnomecanica_vencimiento} /></td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:600, background: v.activo?'#dcfce7':'#fee2e2', color: v.activo?'#15803d':'#dc2626', padding:'3px 10px', borderRadius:20 }}>
                        {v.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                        <button onClick={() => setModal(v)} style={{ padding:'5px', background:'transparent', border:'none', borderRadius:6, cursor:'pointer', color:'#4f46e5' }}>
                          <Edit2 style={{ width:15, height:15 }} />
                        </button>
                        <button onClick={() => eliminar(v)} style={{ padding:'5px', background:'transparent', border:'none', borderRadius:6, cursor:'pointer', color:'#ef4444' }}>
                          <Trash2 style={{ width:15, height:15 }} />
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
              <span>Mostrando {vehiculos.length} de {total}</span>
              <div style={{ display:'flex', gap:8 }}>
                <button disabled={pagina===1} onClick={() => setPagina(p=>p-1)} className="btn-secondary" style={{ fontSize:12, opacity:pagina===1?0.4:1 }}>← Anterior</button>
                <button disabled={pagina*20>=total} onClick={() => setPagina(p=>p+1)} className="btn-secondary" style={{ fontSize:12, opacity:pagina*20>=total?0.4:1 }}>Siguiente →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {modal === 'nuevo' && (
        <Modal titulo="Nuevo vehículo" onClose={() => setModal(null)}>
          <FormVehiculo onGuardar={guardarNuevo} onCancelar={() => setModal(null)} cargando={guardando} />
        </Modal>
      )}
      {modal && modal !== 'nuevo' && (
        <Modal titulo={`Editar — ${modal.placa}`} onClose={() => setModal(null)}>
          <FormVehiculo inicial={modal} onGuardar={guardarEdicion} onCancelar={() => setModal(null)} cargando={guardando} />
        </Modal>
      )}
    </div>
  )
}
