import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Truck, Edit2, Trash2, X, Save, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { vehiculosAPI } from '../services/api'
import { formatCOP, formatNum } from '../utils/format'

const TIPOS = ['camion','tracto','furgon','doble_troque','minimula','otro']
const COMBUSTIBLES = ['diesel','gasolina','gas','electrico','hibrido']

const FORM_INICIAL = {
  placa:'', marca:'', modelo:'', anio: new Date().getFullYear(),
  tipo:'tracto', tipo_combustible:'diesel',
  capacidad_carga_kg:'', rendimiento_km_galon:'',
  numero_motor:'', numero_chasis:'', color:'',
  propietario:'', observaciones:''
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function FormVehiculo({ inicial, onGuardar, onCancelar, cargando }) {
  const [form, setForm] = useState(inicial || FORM_INICIAL)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Placa *</label>
          <input value={form.placa} onChange={e => set('placa', e.target.value.toUpperCase())}
            placeholder="ABC123" className="input font-mono uppercase" maxLength={10} />
        </div>
        <div>
          <label className="label">Tipo *</label>
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="input">
            {TIPOS.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Marca *</label>
          <input value={form.marca} onChange={e => set('marca', e.target.value)}
            placeholder="Kenworth, Freightliner..." className="input" />
        </div>
        <div>
          <label className="label">Modelo *</label>
          <input value={form.modelo} onChange={e => set('modelo', e.target.value)}
            placeholder="T800, Columbia..." className="input" />
        </div>
        <div>
          <label className="label">Año *</label>
          <input type="number" value={form.anio} onChange={e => set('anio', e.target.value)}
            min="1990" max="2030" className="input" />
        </div>
        <div>
          <label className="label">Combustible</label>
          <select value={form.tipo_combustible} onChange={e => set('tipo_combustible', e.target.value)} className="input">
            {COMBUSTIBLES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Capacidad (kg)</label>
          <input type="number" value={form.capacidad_carga_kg} onChange={e => set('capacidad_carga_kg', e.target.value)}
            placeholder="35000" className="input" />
        </div>
        <div>
          <label className="label">Rendimiento (km/galón)</label>
          <input type="number" step="0.1" value={form.rendimiento_km_galon}
            onChange={e => set('rendimiento_km_galon', e.target.value)}
            placeholder="8.5" className="input" />
        </div>
        <div>
          <label className="label">N° Motor</label>
          <input value={form.numero_motor} onChange={e => set('numero_motor', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">N° Chasis</label>
          <input value={form.numero_chasis} onChange={e => set('numero_chasis', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Color</label>
          <input value={form.color} onChange={e => set('color', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Propietario</label>
          <input value={form.propietario} onChange={e => set('propietario', e.target.value)}
            placeholder="Si es vehículo de tercero" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Observaciones</label>
        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
          rows={2} className="input resize-none" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onCancelar} className="btn-secondary">Cancelar</button>
        <button onClick={() => onGuardar(form)} disabled={cargando} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {cargando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [total, setTotal]         = useState(0)
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda]   = useState('')
  const [modal, setModal]         = useState(null) // null | 'nuevo' | vehiculo
  const [pagina, setPagina]       = useState(1)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = { pagina, limite: 20 }
      if (busqueda) params.placa = busqueda
      const res = await vehiculosAPI.listar(params)
      setVehiculos(res.data.datos || [])
      setTotal(res.data.paginacion?.total || 0)
    } catch {
      toast.error('Error cargando vehículos')
    } finally {
      setCargando(false)
    }
  }, [pagina, busqueda])

  useEffect(() => { cargar() }, [cargar])

  const guardarNuevo = async (form) => {
    if (!form.placa || !form.marca || !form.modelo) {
      toast.error('Placa, marca y modelo son requeridos')
      return
    }
    setGuardando(true)
    try {
      await vehiculosAPI.crear(form)
      toast.success('Vehículo creado correctamente')
      setModal(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al crear vehículo')
    } finally {
      setGuardando(false)
    }
  }

  const guardarEdicion = async (form) => {
    setGuardando(true)
    try {
      await vehiculosAPI.actualizar(modal.id, form)
      toast.success('Vehículo actualizado')
      setModal(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al actualizar')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (v) => {
    if (!confirm(`¿Eliminar el vehículo ${v.placa}?`)) return
    try {
      await vehiculosAPI.eliminar(v.id)
      toast.success('Vehículo eliminado')
      cargar()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-gray-500 text-sm">{total} vehículos registrados</p>
        </div>
        <button onClick={() => setModal('nuevo')} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo vehículo
        </button>
      </div>

      {/* Búsqueda */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={busqueda}
              onChange={e => { setBusqueda(e.target.value.toUpperCase()); setPagina(1) }}
              placeholder="Buscar por placa..."
              className="input pl-9 font-mono uppercase" />
          </div>
          <button onClick={cargar} className="btn-primary flex items-center gap-2 text-sm">
            <Search className="w-4 h-4" /> Buscar
          </button>
          {busqueda && (
            <button onClick={() => { setBusqueda(''); setPagina(1) }} className="btn-secondary text-sm">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b">
                <th className="px-5 py-3 text-left font-medium">Placa</th>
                <th className="px-5 py-3 text-left font-medium">Vehículo</th>
                <th className="px-5 py-3 text-left font-medium">Tipo</th>
                <th className="px-5 py-3 text-left font-medium">Combustible</th>
                <th className="px-5 py-3 text-left font-medium">Capacidad</th>
                <th className="px-5 py-3 text-left font-medium">Propietario</th>
                <th className="px-5 py-3 text-center font-medium">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-2" />
                  Cargando...
                </td></tr>
              ) : vehiculos.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                  No hay vehículos registrados.{' '}
                  <button onClick={() => setModal('nuevo')} className="text-primary-600 hover:underline">
                    Agregar el primero
                  </button>
                </td></tr>
              ) : vehiculos.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">
                      {v.placa}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{v.marca} {v.modelo}</p>
                    <p className="text-gray-400 text-xs">Año {v.anio}</p>
                  </td>
                  <td className="px-5 py-3 capitalize text-gray-600">{v.tipo?.replace('_',' ')}</td>
                  <td className="px-5 py-3 capitalize text-gray-600">{v.tipo_combustible}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {v.capacidad_carga_kg ? `${formatNum(v.capacidad_carga_kg)} kg` : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{v.propietario || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={v.activo ? 'badge-green' : 'badge-red'}>
                      {v.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setModal(v)}
                        className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => eliminar(v)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t text-sm text-gray-500">
            <span>Mostrando {vehiculos.length} de {total}</span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">← Anterior</button>
              <button disabled={pagina * 20 >= total} onClick={() => setPagina(p => p + 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Siguiente →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo */}
      {modal === 'nuevo' && (
        <Modal titulo="Nuevo vehículo" onClose={() => setModal(null)}>
          <FormVehiculo
            onGuardar={guardarNuevo}
            onCancelar={() => setModal(null)}
            cargando={guardando}
          />
        </Modal>
      )}

      {/* Modal editar */}
      {modal && modal !== 'nuevo' && (
        <Modal titulo={`Editar — ${modal.placa}`} onClose={() => setModal(null)}>
          <FormVehiculo
            inicial={modal}
            onGuardar={guardarEdicion}
            onCancelar={() => setModal(null)}
            cargando={guardando}
          />
        </Modal>
      )}
    </div>
  )
}
