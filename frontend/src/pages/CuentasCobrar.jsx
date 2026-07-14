import { useState, useEffect, useCallback } from 'react'
import { X, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { cuentasAPI, clientesAPI } from '../services/api'
import { formatCOP, formatFecha } from '../utils/format'

export default function CuentasCobrar() {
  const [filas, setFilas]         = useState([])
  const [clientes, setClientes]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [filtros, setFiltros]     = useState({ cliente_id:'', fecha_inicio:'', fecha_fin:'' })

  useEffect(() => {
    clientesAPI.listar({ limite:100 }).then(r => setClientes(r.data.datos||[])).catch(()=>{})
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await cuentasAPI.listar(filtros)
      setFilas(res.data.datos || [])
    } catch { toast.error('Error cargando cuentas por cobrar') }
    finally { setCargando(false) }
  }, [filtros])

  useEffect(() => { cargar() }, [cargar])

  const setCampo = (id, campo, valor) => {
    setFilas(fs => fs.map(f => f.id === id ? { ...f, [campo]: valor } : f))
  }

  const guardarFila = async (fila) => {
    try {
      await cuentasAPI.actualizar(fila.id, {
        fecha_pago_anticipo: fila.fecha_pago_anticipo || null,
        banco_anticipo:      fila.banco_anticipo || null,
        fecha_pago_saldo:    fila.fecha_pago_saldo || null,
        banco_saldo:         fila.banco_saldo || null,
      })
      toast.success('Guardado', { duration: 1200 })
    } catch { toast.error('Error al guardar') }
  }

  const hayFiltros = Object.values(filtros).some(v => v !== '')
  // Saldo = el mismo "Saldo a pagar" del viaje (Manifiesto − Retenciones − Descuentos − Anticipo)
  const saldoDe = (f) => parseFloat(f.saldo_manifiesto || 0)

  const totalAnticipos = filas.reduce((s, f) => s + parseFloat(f.anticipo || 0), 0)
  const totalSaldos    = filas.reduce((s, f) => s + saldoDe(f), 0)

  const thStyle = { padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#d1d5db', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap' }
  const tdStyle = { padding:'8px 12px', fontSize:13, whiteSpace:'nowrap' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Wallet style={{ width:20, height:20, color:'#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>Saldos y cuentas por cobrar</h1>
          <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>Se alimenta automáticamente con cada viaje registrado</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <p style={{ fontWeight:600, fontSize:14, color:'#111827', margin:0 }}>Filtros</p>
          {hayFiltros && (
            <button onClick={() => setFiltros({ cliente_id:'', fecha_inicio:'', fecha_fin:'' })}
              style={{ fontSize:12, color:'#dc2626', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <X style={{ width:12, height:12 }} /> Limpiar
            </button>
          )}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:10 }}>
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

      {/* Totales */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10 }}>
        {[
          { label:'Registros',       valor: filas.length,             color:'#111827' },
          { label:'Total anticipos', valor: formatCOP(totalAnticipos), color:'#1d4ed8' },
          { label:'Total saldos',    valor: formatCOP(totalSaldos),    color:'#b45309' },
        ].map((k,i) => (
          <div key={i} className="card" style={{ padding:'12px 16px', textAlign:'center' }}>
            <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>{k.label}</p>
            <p style={{ fontSize:17, fontWeight:800, color:k.color, margin:'4px 0 0' }}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
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
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>N° Manifiesto</th>
                  <th style={{ ...thStyle, textAlign:'right' }}>Anticipo</th>
                  <th style={thStyle}>Fecha pago</th>
                  <th style={thStyle}>Banco</th>
                  <th style={{ ...thStyle, textAlign:'right' }}>Saldo</th>
                  <th style={thStyle}>Fecha pago</th>
                  <th style={thStyle}>Banco</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:13 }}>
                    No hay viajes registrados con estos filtros
                  </td></tr>
                ) : filas.map(f => (
                  <tr key={f.id} style={{ borderBottom:'1px solid #f3f4f6' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight:600, color:'#111827' }}>{f.cliente}</span>
                      <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{f.numero_viaje} · {formatFecha(f.fecha_salida)}</p>
                    </td>
                    <td style={{ ...tdStyle, fontWeight:600, color:'#374151' }}>{f.numero_manifiesto || '—'}</td>
                    <td style={{ ...tdStyle, textAlign:'right', fontWeight:600, color:'#1d4ed8' }}>{formatCOP(f.anticipo)}</td>
                    <td style={tdStyle}>
                      <input type="date" value={f.fecha_pago_anticipo || ''}
                        onChange={e => setCampo(f.id, 'fecha_pago_anticipo', e.target.value)}
                        onBlur={() => guardarFila(filas.find(x => x.id === f.id))}
                        className="input" style={{ fontSize:12, width:140, padding:'4px 8px' }} />
                    </td>
                    <td style={tdStyle}>
                      <input value={f.banco_anticipo || ''} placeholder="Banco"
                        onChange={e => setCampo(f.id, 'banco_anticipo', e.target.value)}
                        onBlur={() => guardarFila(filas.find(x => x.id === f.id))}
                        className="input" style={{ fontSize:12, width:130, padding:'4px 8px' }} />
                    </td>
                    <td style={{ ...tdStyle, textAlign:'right', fontWeight:700, color: saldoDe(f) >= 0 ? '#15803d' : '#dc2626' }}>{formatCOP(saldoDe(f))}</td>
                    <td style={tdStyle}>
                      <input type="date" value={f.fecha_pago_saldo || ''}
                        onChange={e => setCampo(f.id, 'fecha_pago_saldo', e.target.value)}
                        onBlur={() => guardarFila(filas.find(x => x.id === f.id))}
                        className="input" style={{ fontSize:12, width:140, padding:'4px 8px' }} />
                    </td>
                    <td style={tdStyle}>
                      <input value={f.banco_saldo || ''} placeholder="Banco"
                        onChange={e => setCampo(f.id, 'banco_saldo', e.target.value)}
                        onBlur={() => guardarFila(filas.find(x => x.id === f.id))}
                        className="input" style={{ fontSize:12, width:130, padding:'4px 8px' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
