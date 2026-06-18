import { useState, useEffect } from 'react'
import { Save, DollarSign, Truck, Building2 } from 'lucide-react'
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
  const [tab, setTab]           = useState('operacion')
  const [anio, setAnio]         = useState(hoy.getFullYear())
  const [mes, setMes]           = useState(hoy.getMonth() + 1)
  const [vehiculos, setVehiculos] = useState([])
  const [vehiculoId, setVehiculoId] = useState('')
  const [formOp, setFormOp]     = useState(OP_INICIAL)
  const [formAdm, setFormAdm]   = useState(ADM_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    vehiculosAPI.listar({ activo: true, limite: 100 })
      .then(r => {
        setVehiculos(r.data.datos || [])
        if (r.data.datos?.length > 0) setVehiculoId(r.data.datos[0].id)
      })
      .catch(() => toast.error('Error cargando vehículos'))
  }, [])

  // Cargar costos existentes al cambiar vehículo/mes
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

  const totalOp = Object.entries(formOp)
    .filter(([k]) => !['km_recorridos_mes','observaciones'].includes(k))
    .reduce((s, [,v]) => s + (parseFloat(v) || 0), 0)

  const costoKm = formOp.km_recorridos_mes > 0 ? totalOp / formOp.km_recorridos_mes : 0

  const totalAdm = Object.entries(formAdm)
    .filter(([k]) => k !== 'observaciones')
    .reduce((s, [,v]) => s + (parseFloat(v) || 0), 0)

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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Costos mensuales</h1>
        <p className="text-gray-500 text-sm">Registra los costos fijos para calcular la rentabilidad real</p>
      </div>

      {/* Selector periodo */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Año</label>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} className="input w-28">
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Mes</label>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="input w-40">
            {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('operacion')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'operacion' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            <Truck className="w-4 h-4" /> Operación por vehículo
          </button>
          <button onClick={() => setTab('administrativos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'administrativos' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            <Building2 className="w-4 h-4" /> Administrativos
          </button>
        </div>
      </div>

      {/* BLOQUE 2 — Operación por vehículo */}
      {tab === 'operacion' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900">Costos de operación — {MESES[mes]} {anio}</h2>
              <p className="text-gray-500 text-xs mt-0.5">Bloque 2 — se prorratean por km recorrido</p>
            </div>
            <select value={vehiculoId} onChange={e => setVehiculoId(e.target.value)} className="input w-56">
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
            </select>
          </div>

          {cargando ? <p className="text-gray-400 text-sm">Cargando...</p> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <CampoMonto label="Llantas"                   campo="llantas"                   form={formOp} setForm={setFormOp} />
                <CampoMonto label="Mantenimiento preventivo"  campo="mantenimiento_preventivo"  form={formOp} setForm={setFormOp} />
                <CampoMonto label="Mantenimiento correctivo"  campo="mantenimiento_correctivo"  form={formOp} setForm={setFormOp} />
                <CampoMonto label="Aceites y filtros"         campo="aceites_filtros"           form={formOp} setForm={setFormOp} />
                <CampoMonto label="Depreciación"              campo="depreciacion"              form={formOp} setForm={setFormOp} />
                <CampoMonto label="Seguros"                   campo="seguros"                   form={formOp} setForm={setFormOp} />
                <CampoMonto label="SOAT"                      campo="soat"                      form={formOp} setForm={setFormOp} />
                <CampoMonto label="Tecnomecánica"             campo="tecnomecanica"             form={formOp} setForm={setFormOp} />
                <CampoMonto label="Impuestos"                 campo="impuestos"                 form={formOp} setForm={setFormOp} />
                <CampoMonto label="Otros"                     campo="otros"                     form={formOp} setForm={setFormOp} />
                <div>
                  <label className="label">Km recorridos el mes</label>
                  <input type="number" value={formOp.km_recorridos_mes}
                    onChange={e => setFormOp(f => ({ ...f, km_recorridos_mes: parseFloat(e.target.value) || 0 }))}
                    className="input" placeholder="0" />
                </div>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total costos operación</p>
                    <p className="font-bold text-gray-900 text-lg">{formatCOP(totalOp)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Km recorridos</p>
                    <p className="font-bold text-gray-900 text-lg">{formOp.km_recorridos_mes} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Costo por km</p>
                    <p className="font-bold text-primary-600 text-xl">{formatCOP(costoKm)}/km</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="label">Observaciones</label>
                <textarea value={formOp.observaciones}
                  onChange={e => setFormOp(f => ({ ...f, observaciones: e.target.value }))}
                  rows={2} className="input resize-none" />
              </div>

              <div className="flex justify-end">
                <button onClick={guardarOperacion} disabled={guardando} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {guardando ? 'Guardando...' : 'Guardar costos de operación'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* BLOQUE 3 — Administrativos */}
      {tab === 'administrativos' && (
        <div className="card p-5">
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">Costos administrativos — {MESES[mes]} {anio}</h2>
            <p className="text-gray-500 text-xs mt-0.5">Bloque 3 — se prorratean entre todos los viajes del mes</p>
          </div>

          {cargando ? <p className="text-gray-400 text-sm">Cargando...</p> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
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

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Total costos administrativos del mes</p>
                  <p className="font-bold text-gray-900 text-2xl">{formatCOP(totalAdm)}</p>
                  <p className="text-xs text-gray-400 mt-1">Se dividirá entre el número de viajes completados en {MESES[mes]}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="label">Observaciones</label>
                <textarea value={formAdm.observaciones}
                  onChange={e => setFormAdm(f => ({ ...f, observaciones: e.target.value }))}
                  rows={2} className="input resize-none" />
              </div>

              <div className="flex justify-end">
                <button onClick={guardarAdministrativos} disabled={guardando} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
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
