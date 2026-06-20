import { useState, useEffect } from 'react'
import { Save, Truck, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { costosAPI, vehiculosAPI } from '../services/api'
import { formatCOP } from '../utils/format'

const hoy = new Date()
const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const OP_INICIAL = {
  llantas:0, mantenimiento_preventivo:0, mantenimiento_correctivo:0,
  aceites_filtros:0, depreciacion:0, seguros:0, soat:0,
  tecnomecanica:0, impuestos:0, otros:0, km_recorridos_mes:0, observaciones:''
}

const ADM_INICIAL = {
  salarios_conductores:0, prestaciones:0, seguridad_social:0,
  administracion:0, contabilidad:0, arrendamiento:0,
  servicios_publicos:0, comunicaciones:0, otros:0, observaciones:''
}

// Solo estos campos se suman — evita sumar id, vehiculo_id, anio, mes, etc.
const CAMPOS_COSTO_OP = [
  'llantas','mantenimiento_preventivo','mantenimiento_correctivo',
  'aceites_filtros','depreciacion','seguros','soat',
  'tecnomecanica','impuestos','otros'
]
const CAMPOS_COSTO_ADM = [
  'salarios_conductores','prestaciones','seguridad_social',
  'administracion','contabilidad','arrendamiento',
  'servicios_publicos','comunicaciones','otros'
]

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
  const [tab, setTab]               = useState('operacion')
  const [anio, setAnio]             = useState(hoy.getFullYear())
  const [mes, setMes]               = useState(hoy.getMonth() + 1)
  const [vehiculos, setVehiculos]   = useState([])
  const [vehiculoId, setVehiculoId] = useState('')
  const [formOp, setFormOp]         = useState(OP_INICIAL)
  const [formAdm, setFormAdm]       = useState(ADM_INICIAL)
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
    if (!vehiculoId || tab !== 'operacion') return
    setCargando(true)
    costosAPI.listarOperacion({ vehiculo_id: vehiculoId, anio, mes })
      .then(r => {
        if (r.data.datos?.length > 0) setFormOp(r.data.datos[0])
        else setFormOp(OP_INICIAL)
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [vehiculoId, anio, mes, tab])

  useEffect(() => {
    if (tab !== 'administrativos') return
    setCargando(true)
    costosAPI.listarAdministrativos({ anio, mes })
      .then(r => {
        if (r.data.datos?.length > 0) setFormAdm(r.data.datos[0])
        else setFormAdm(ADM_INICIAL)
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [anio, mes, tab])

  // ✅ FIX: solo suma campos de costo, no id/vehiculo_id/anio/mes/etc.
  const totalOp  = CAMPOS_COSTO_OP.reduce((s, k) => s + (parseFloat(formOp[k]) || 0), 0)
  const totalAdm = CAMPOS_COSTO_ADM.reduce((s, k) => s + (parseFloat(formAdm[k]) || 0), 0)
  const costoKm  = formOp.km_recorridos_mes > 0 ? totalOp / formOp.km_recorridos_mes : 0

  const guardarOperacion = async () => {
    if (!vehiculoId) { toast.error('Selecciona un vehículo'); return }
    setGuardando(true)
    try {
      await costosAPI.guardarOperacion({ ...formOp, vehiculo_id: vehiculoId, anio, mes })
      toast.success('Costos de operación guardados')
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const guardarAdministrativos = async () => {
    setGuardando(true)
    try {
      await costosAPI.guardarAdministrativos({ ...formAdm, anio, mes })
      toast.success('Costos administrativos guardados')
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>Costos mensuales</h1>
        <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>Registra los costos fijos para calcular la rentabilidad real</p>
      </div>

      {/* Selector periodo */}
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
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setTab('operacion')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:500, border:'1px solid', cursor:'pointer', background: tab==='operacion'?'#4f46e5':'#fff', color: tab==='operacion'?'#fff':'#374151', borderColor: tab==='operacion'?'#4f46e5':'#d1d5db' }}>
            <Truck style={{ width:15, height:15 }} /> Operación por vehículo
          </button>
          <button onClick={() => setTab('administrativos')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:500, border:'1px solid', cursor:'pointer', background: tab==='administrativos'?'#4f46e5':'#fff', color: tab==='administrativos'?'#fff':'#374151', borderColor: tab==='administrativos'?'#4f46e5':'#d1d5db' }}>
            <Building2 style={{ width:15, height:15 }} /> Administrativos
          </button>
        </div>
      </div>

      {/* ── OPERACIÓN POR VEHÍCULO ── */}
      {tab === 'operacion' && (
        <div className="card p-5">
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
            <div>
              <h2 style={{ fontWeight:700, fontSize:15, color:'#111827', margin:0 }}>Costos de operación — {MESES[mes]} {anio}</h2>
              <p style={{ fontSize:12, color:'#6b7280', margin:'2px 0 0' }}>Bloque 2 — se prorratean por km recorrido</p>
            </div>
            <select value={vehiculoId} onChange={e => setVehiculoId(e.target.value)} className="input" style={{ minWidth:200 }}>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
            </select>
          </div>

          {cargando ? (
            <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
              <div style={{ width:28, height:28, border:'4px solid #e0e7ff', borderTop:'4px solid #4f46e5', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginBottom:16 }}>
                <CampoMonto label="Llantas"                  campo="llantas"                  form={formOp} setForm={setFormOp} />
                <CampoMonto label="Mant. preventivo"         campo="mantenimiento_preventivo" form={formOp} setForm={setFormOp} />
                <CampoMonto label="Mant. correctivo"         campo="mantenimiento_correctivo" form={formOp} setForm={setFormOp} />
                <CampoMonto label="Aceites y filtros"        campo="aceites_filtros"          form={formOp} setForm={setFormOp} />
                <CampoMonto label="Depreciación"             campo="depreciacion"             form={formOp} setForm={setFormOp} />
                <CampoMonto label="Seguros"                  campo="seguros"                  form={formOp} setForm={setFormOp} />
                <CampoMonto label="SOAT"                     campo="soat"                     form={formOp} setForm={setFormOp} />
                <CampoMonto label="Tecnomecánica"            campo="tecnomecanica"            form={formOp} setForm={setFormOp} />
                <CampoMonto label="Impuestos"                campo="impuestos"                form={formOp} setForm={setFormOp} />
                <CampoMonto label="Otros"                    campo="otros"                    form={formOp} setForm={setFormOp} />
                <div>
                  <label className="label">Km recorridos el mes</label>
                  <input type="number" value={formOp.km_recorridos_mes}
                    onChange={e => setFormOp(f => ({ ...f, km_recorridos_mes: parseFloat(e.target.value) || 0 }))}
                    className="input" placeholder="0" />
                </div>
              </div>

              {/* Resumen */}
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:16, marginBottom:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, textAlign:'center' }}>
                  <div>
                    <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>Total costos operación</p>
                    <p style={{ fontWeight:800, fontSize:18, color:'#111827', margin:'4px 0 0' }}>{formatCOP(totalOp)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>Km recorridos</p>
                    <p style={{ fontWeight:800, fontSize:18, color:'#111827', margin:'4px 0 0' }}>{formOp.km_recorridos_mes} km</p>
                  </div>
                  <div>
                    <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>Costo por km</p>
                    <p style={{ fontWeight:800, fontSize:20, color:'#4f46e5', margin:'4px 0 0' }}>{formatCOP(costoKm)}/km</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label className="label">Observaciones</label>
                <textarea value={formOp.observaciones}
                  onChange={e => setFormOp(f => ({ ...f, observaciones: e.target.value }))}
                  rows={2} className="input resize-none" />
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={guardarOperacion} disabled={guardando} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Save style={{ width:15, height:15 }} />
                  {guardando ? 'Guardando...' : 'Guardar costos de operación'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ADMINISTRATIVOS ── */}
      {tab === 'administrativos' && (
        <div className="card p-5">
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontWeight:700, fontSize:15, color:'#111827', margin:0 }}>Costos administrativos — {MESES[mes]} {anio}</h2>
            <p style={{ fontSize:12, color:'#6b7280', margin:'2px 0 0' }}>Bloque 3 — se prorratean entre todos los viajes del mes</p>
          </div>

          {cargando ? (
            <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
              <div style={{ width:28, height:28, border:'4px solid #e0e7ff', borderTop:'4px solid #4f46e5', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginBottom:16 }}>
                <CampoMonto label="Salarios conductores"  campo="salarios_conductores" form={formAdm} setForm={setFormAdm} />
                <CampoMonto label="Prestaciones sociales" campo="prestaciones"         form={formAdm} setForm={setFormAdm} />
                <CampoMonto label="Seguridad social"      campo="seguridad_social"     form={formAdm} setForm={setFormAdm} />
                <CampoMonto label="Administración"        campo="administracion"       form={formAdm} setForm={setFormAdm} />
                <CampoMonto label="Contabilidad"          campo="contabilidad"         form={formAdm} setForm={setFormAdm} />
                <CampoMonto label="Arrendamiento"         campo="arrendamiento"        form={formAdm} setForm={setFormAdm} />
                <CampoMonto label="Servicios públicos"    campo="servicios_publicos"   form={formAdm} setForm={setFormAdm} />
                <CampoMonto label="Comunicaciones"        campo="comunicaciones"       form={formAdm} setForm={setFormAdm} />
                <CampoMonto label="Otros"                 campo="otros"               form={formAdm} setForm={setFormAdm} />
              </div>

              {/* Resumen */}
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:16, marginBottom:16, textAlign:'center' }}>
                <p style={{ fontSize:12, color:'#6b7280', margin:0 }}>Total costos administrativos del mes</p>
                <p style={{ fontWeight:800, fontSize:24, color:'#111827', margin:'6px 0 4px' }}>{formatCOP(totalAdm)}</p>
                <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Se dividirá entre el número de viajes completados en {MESES[mes]}</p>
              </div>

              <div style={{ marginBottom:16 }}>
                <label className="label">Observaciones</label>
                <textarea value={formAdm.observaciones}
                  onChange={e => setFormAdm(f => ({ ...f, observaciones: e.target.value }))}
                  rows={2} className="input resize-none" />
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={guardarAdministrativos} disabled={guardando} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Save style={{ width:15, height:15 }} />
                  {guardando ? 'Guardando...' : 'Guardar costos administrativos'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
