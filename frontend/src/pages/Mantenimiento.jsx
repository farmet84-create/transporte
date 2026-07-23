import { useState, useEffect, useCallback } from 'react'
import { Wrench } from 'lucide-react'
import toast from 'react-hot-toast'
import { mantenimientoAPI } from '../services/api'

const SEMAFOROS = [
  { value: 'verde',    label: '🟢 Verde',    color: '#15803d', bg: '#f0fdf4' },
  { value: 'amarillo', label: '🟡 Amarillo', color: '#b45309', bg: '#fffbeb' },
  { value: 'rojo',     label: '🔴 Rojo',     color: '#dc2626', bg: '#fef2f2' },
]

export default function Mantenimiento() {
  const [filas, setFilas]       = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await mantenimientoAPI.listar()
      setFilas(res.data.datos || [])
    } catch { toast.error('Error cargando mantenimiento') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const setCampo = (vehiculo_id, campo, valor) => {
    setFilas(fs => fs.map(f => f.vehiculo_id === vehiculo_id ? { ...f, [campo]: valor } : f))
  }

  const guardarFila = async (f) => {
    try {
      await mantenimientoAPI.guardar({
        vehiculo_id:        f.vehiculo_id,
        km_actual:          f.km_actual || 0,
        proximo_mant_fecha: f.proximo_mant_fecha || null,
        proximo_mant_km:    f.proximo_mant_km || 0,
        pendientes:         f.pendientes || null,
        semaforo:           f.semaforo || 'verde',
      })
      toast.success('Guardado', { duration: 1200 })
    } catch { toast.error('Error al guardar') }
  }

  const semColor = (s) => SEMAFOROS.find(x => x.value === s) || SEMAFOROS[0]

  const rojos     = filas.filter(f => f.semaforo === 'rojo').length
  const amarillos = filas.filter(f => f.semaforo === 'amarillo').length

  const thStyle = { padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#d1d5db', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap' }
  const tdStyle = { padding:'8px 12px', fontSize:13, whiteSpace:'nowrap' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Wrench style={{ width:20, height:20, color:'#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>Mantenimiento de vehículos</h1>
          <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>El semáforo Rojo o Amarillo genera una alerta automática</p>
        </div>
      </div>

      {/* Resumen semáforos */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10 }}>
        {[
          { label:'Vehículos',       valor: filas.length, color:'#111827' },
          { label:'🔴 En rojo',      valor: rojos,        color:'#dc2626' },
          { label:'🟡 En amarillo',  valor: amarillos,    color:'#b45309' },
        ].map((k,i) => (
          <div key={i} className="card" style={{ padding:'12px 16px', textAlign:'center' }}>
            <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>{k.label}</p>
            <p style={{ fontSize:17, fontWeight:800, color:k.color, margin:'4px 0 0' }}>{k.valor}</p>
          </div>
        ))}
      </div>

      {cargando ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div style={{ width:32, height:32, border:'4px solid #e0e7ff', borderTop:'4px solid #4f46e5', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#1f2937' }}>
                  <th style={thStyle}>Placa</th>
                  <th style={{ ...thStyle, textAlign:'right' }}>Km actual</th>
                  <th style={thStyle}>Próx. mant. — Fecha</th>
                  <th style={{ ...thStyle, textAlign:'right' }}>Próx. mant. — Km</th>
                  <th style={thStyle}>Pendientes</th>
                  <th style={thStyle}>Semáforo</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>
                    No hay vehículos activos registrados
                  </td></tr>
                ) : filas.map(f => {
                  const sc = semColor(f.semaforo)
                  return (
                    <tr key={f.vehiculo_id} style={{ borderBottom:'1px solid #f3f4f6', background: sc.bg }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily:'monospace', fontWeight:700, background:'#fff', border:'1px solid #e5e7eb', padding:'2px 8px', borderRadius:6, fontSize:12 }}>{f.placa}</span>
                        <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{f.vehiculo}</p>
                      </td>
                      <td style={tdStyle}>
                        <input type="number" value={f.km_actual || ''} placeholder="0"
                          onChange={e => setCampo(f.vehiculo_id, 'km_actual', e.target.value)}
                          onBlur={() => guardarFila(filas.find(x => x.vehiculo_id === f.vehiculo_id))}
                          className="input" style={{ fontSize:12, width:110, padding:'4px 8px', textAlign:'right' }} />
                      </td>
                      <td style={tdStyle}>
                        <input type="date" value={f.proximo_mant_fecha || ''}
                          onChange={e => setCampo(f.vehiculo_id, 'proximo_mant_fecha', e.target.value)}
                          onBlur={() => guardarFila(filas.find(x => x.vehiculo_id === f.vehiculo_id))}
                          className="input" style={{ fontSize:12, width:140, padding:'4px 8px' }} />
                      </td>
                      <td style={tdStyle}>
                        <input type="number" value={f.proximo_mant_km || ''} placeholder="0"
                          onChange={e => setCampo(f.vehiculo_id, 'proximo_mant_km', e.target.value)}
                          onBlur={() => guardarFila(filas.find(x => x.vehiculo_id === f.vehiculo_id))}
                          className="input" style={{ fontSize:12, width:110, padding:'4px 8px', textAlign:'right' }} />
                      </td>
                      <td style={tdStyle}>
                        <input value={f.pendientes || ''} placeholder="Ej: cambio de llantas"
                          onChange={e => setCampo(f.vehiculo_id, 'pendientes', e.target.value)}
                          onBlur={() => guardarFila(filas.find(x => x.vehiculo_id === f.vehiculo_id))}
                          className="input" style={{ fontSize:12, width:200, padding:'4px 8px' }} />
                      </td>
                      <td style={tdStyle}>
                        <select value={f.semaforo || 'verde'}
                          onChange={e => { setCampo(f.vehiculo_id, 'semaforo', e.target.value); setTimeout(() => guardarFila({ ...filas.find(x => x.vehiculo_id === f.vehiculo_id), semaforo: e.target.value }), 0) }}
                          className="input" style={{ fontSize:12, padding:'4px 8px', fontWeight:700, color: sc.color }}>
                          {SEMAFOROS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
