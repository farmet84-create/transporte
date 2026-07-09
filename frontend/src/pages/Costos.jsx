import { useState, useEffect } from 'react'
import { Save, Truck, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { costosAPI, vehiculosAPI } from '../services/api'
import { formatCOP } from '../utils/format'

const hoy = new Date()
const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CAMPOS_OP = [
  { campo: 'provision_mantenimiento', label: 'Provisión mantenimiento' },
  { campo: 'satelital',               label: 'Satelital' },
  { campo: 'arriendo',                label: 'Arriendo' },
  { campo: 'parqueadero',             label: 'Parqueadero' },
  { campo: 'cambio_aceite',           label: 'Cambio de aceite' },
  { campo: 'gastos_varios',           label: 'Gastos varios' },
]

const CAMPOS_ADM = [
  { campo: 'soat',                label: 'SOAT' },
  { campo: 'tecnomecanica',       label: 'Tecnomecánica' },
  { campo: 'seguro',              label: 'Seguro' },
  { campo: 'salario_conductor',   label: 'Salario conductor' },
  { campo: 'auxilio_transporte',  label: 'Auxilio de transporte' },
  { campo: 'bono_conductor',      label: 'Bono conductor' },
  { campo: 'seguridad_social',    label: 'Seguridad social' },
  { campo: 'salario_jefe_op',     label: 'Salario jefe op' },
  { campo: 'salario_analista',    label: 'Salario analista' },
  { campo: 'salario_coordinador', label: 'Salario coordinador' },
  { campo: 'sistemas_quirald',    label: 'Sistemas Quirald' },
  { campo: 'otros_gastos',        label: 'Otros gastos' },
]

const FORM_INICIAL = Object.fromEntries(
  [...CAMPOS_OP, ...CAMPOS_ADM].map(c => [c.campo, 0])
)
FORM_INICIAL.observaciones = ''

function CampoMonto({ label, campo, form, setForm }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" value={form[campo]}
        onChange={e => setForm(f => ({ ...f, [campo]: parseFloat(e.target.value) || 0 }))}
        className="input" placeholder="0" />
    </div>
  )
}

export default function Costos() {
  const [anio, setAnio]             = useState(hoy.getFullYear())
  const [mes, setMes]               = useState(hoy.getMonth() + 1)
  const [vehiculos, setVehiculos]   = useState([])
  const [vehiculoId, setVehiculoId] = useState('')
  const [form, setForm]             = useState(FORM_INICIAL)
  const [guardando, setGuardando]   = useState(false)
  const [cargando, setCargando]     = useState(false)

  useEffect(() => {
    vehiculosAPI.listar({ activo: true, limite: 100 })
      .then(r => {
        setVehiculos(r.data.datos || [])
        if (r.data.datos?.length > 0) setVehiculoId(r.data.datos[0].id)
      })
      .catch(() => toast.error('Error cargando vehículos'))
  }, [])

  useEffect(() => {
    if (!vehiculoId) return
    setCargando(true)
    costosAPI.listarVehiculo({ vehiculo_id: vehiculoId, anio, mes })
      .then(r => {
        if (r.data.datos?.length > 0) setForm({ ...FORM_INICIAL, ...r.data.datos[0] })
        else setForm(FORM_INICIAL)
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [vehiculoId, anio, mes])

  const totalOp  = CAMPOS_OP.reduce((s, c) => s + (parseFloat(form[c.campo]) || 0), 0)
  const totalAdm = CAMPOS_ADM.reduce((s, c) => s + (parseFloat(form[c.campo]) || 0), 0)
  const totalMes = totalOp + totalAdm

  const guardar = async () => {
    if (!vehiculoId) { toast.error('Selecciona un vehículo'); return }
    setGuardando(true)
    try {
      await costosAPI.guardarVehiculo({ ...form, vehiculo_id: vehiculoId, anio, mes })
      toast.success('Costos del vehículo guardados')
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const placaSel = vehiculos.find(v => String(v.id) === String(vehiculoId))?.placa || ''

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>Costos mensuales</h1>
        <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>Registra los costos fijos por vehículo — se restan en el reporte del mes para calcular la utilidad real</p>
      </div>

      {/* Selector periodo + placa */}
      <div className="card p-4" style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end' }}>
        <div>
          <label className="label">Año</label>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} className="input" style={{ width:100 }}>
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Mes</label>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="input" style={{ width:150 }}>
            {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Placa</label>
          <select value={vehiculoId} onChange={e => setVehiculoId(e.target.value)} className="input" style={{ minWidth:220 }}>
            {vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
          </select>
        </div>
      </div>

      {cargando ? (
        <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
          <div style={{ width:28, height:28, border:'4px solid #e0e7ff', borderTop:'4px solid #4f46e5', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* ── COSTOS DE OPERACIÓN ── */}
          <div className="card p-5">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <Truck style={{ width:18, height:18, color:'#4f46e5' }} />
              <div>
                <h2 style={{ fontWeight:700, fontSize:15, color:'#111827', margin:0 }}>Costos de operación — {placaSel} · {MESES[mes]} {anio}</h2>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14, marginBottom:12 }}>
              {CAMPOS_OP.map(c => (
                <CampoMonto key={c.campo} label={c.label} campo={c.campo} form={form} setForm={setForm} />
              ))}
            </div>
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'12px 16px', textAlign:'right' }}>
              <span style={{ fontSize:12, color:'#6b7280', marginRight:10 }}>Total costos de operación:</span>
              <span style={{ fontWeight:800, fontSize:17, color:'#1d4ed8' }}>{formatCOP(totalOp)}</span>
            </div>
          </div>

          {/* ── COSTOS ADMINISTRATIVOS ── */}
          <div className="card p-5">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <Building2 style={{ width:18, height:18, color:'#4f46e5' }} />
              <div>
                <h2 style={{ fontWeight:700, fontSize:15, color:'#111827', margin:0 }}>Costos administrativos — {placaSel} · {MESES[mes]} {anio}</h2>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14, marginBottom:12 }}>
              {CAMPOS_ADM.map(c => (
                <CampoMonto key={c.campo} label={c.label} campo={c.campo} form={form} setForm={setForm} />
              ))}
            </div>
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 16px', textAlign:'right' }}>
              <span style={{ fontSize:12, color:'#6b7280', marginRight:10 }}>Total costos administrativos:</span>
              <span style={{ fontWeight:800, fontSize:17, color:'#b45309' }}>{formatCOP(totalAdm)}</span>
            </div>
          </div>

          {/* ── RESUMEN + GUARDAR ── */}
          <div className="card p-5">
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:16, marginBottom:16, textAlign:'center' }}>
              <p style={{ fontSize:12, color:'#6b7280', margin:0 }}>Total costos del mes — {placaSel}</p>
              <p style={{ fontWeight:800, fontSize:24, color:'#15803d', margin:'6px 0 4px' }}>{formatCOP(totalMes)}</p>
              <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Operación {formatCOP(totalOp)} + Administrativos {formatCOP(totalAdm)} — se resta de la utilidad del mes en Reportes</p>
            </div>

            <div style={{ marginBottom:16 }}>
              <label className="label">Observaciones</label>
              <textarea value={form.observaciones || ''}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                rows={2} className="input resize-none" />
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={guardar} disabled={guardando} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Save style={{ width:15, height:15 }} />
                {guardando ? 'Guardando...' : 'Guardar costos del mes'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
