import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, UserCheck, Edit2, Trash2, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { conductoresAPI } from '../services/api'
import { formatCOP, formatFecha } from '../utils/format'

const TIPOS_DOC = ['CC','CE','PA','NIT','TI']
const TIPOS_CONTRATO = ['indefinido','fijo','prestacion_servicios','otro']

const FORM_INICIAL = {
  nombres:'', apellidos:'', tipo_documento:'CC', numero_documento:'',
  telefono:'', email:'', direccion:'', ciudad:'',
  numero_licencia:'', categoria_licencia:'', vencimiento_licencia:'',
  fecha_ingreso:'', tipo_contrato:'indefinido',
  salario_base:'', auxilio_transporte:'', comisiones:'', observaciones:''
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function FormConductor({ inicial, onGuardar, onCancelar, cargando }) {
  const [form, setForm] = useState(inicial || FORM_INICIAL)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Nombres *</label>
          <input value={form.nombres} onChange={e => set('nombres', e.target.value)} className="input" placeholder="Juan Carlos" />
        </div>
        <div>
          <label className="label">Apellidos *</label>
          <input value={form.apellidos} onChange={e => set('apellidos', e.target.value)} className="input" placeholder="Pérez García" />
        </div>
        <div>
          <label className="label">Tipo documento</label>
          <select value={form.tipo_documento} onChange={e => set('tipo_documento', e.target.value)} className="input">
            {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Número documento *</label>
          <input value={form.numero_documento} onChange={e => set('numero_documento', e.target.value)} className="input" placeholder="12345678" />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input value={form.telefono} onChange={e => set('telefono', e.target.value)} className="input" placeholder="3001234567" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Ciudad</label>
          <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)} className="input" placeholder="Bogotá" />
        </div>
        <div>
          <label className="label">Dirección</label>
          <input value={form.direccion} onChange={e => set('direccion', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">N° Licencia</label>
          <input value={form.numero_licencia} onChange={e => set('numero_licencia', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Categoría licencia</label>
          <input value={form.categoria_licencia} onChange={e => set('categoria_licencia', e.target.value)} className="input" placeholder="C2, C3..." />
        </div>
        <div>
          <label className="label">Vencimiento licencia</label>
          <input type="date" value={form.vencimiento_licencia} onChange={e => set('vencimiento_licencia', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Fecha ingreso</label>
          <input type="date" value={form.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Tipo contrato</label>
          <select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)} className="input">
            {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Salario base</label>
          <input type="number" value={form.salario_base} onChange={e => set('salario_base', e.target.value)} className="input" placeholder="3000000" />
        </div>
        <div>
          <label className="label">Auxilio transporte</label>
          <input type="number" value={form.auxilio_transporte} onChange={e => set('auxilio_transporte', e.target.value)} className="input" placeholder="200000" />
        </div>
        <div>
          <label className="label">Comisiones</label>
          <input type="number" value={form.comisiones} onChange={e => set('comisiones', e.target.value)} className="input" placeholder="0" />
        </div>
      </div>
      <div>
        <label className="label">Observaciones</label>
        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2} className="input resize-none" />
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

export default function Conductores() {
  const [conductores, setConductores] = useState([])
  const [total, setTotal]             = useState(0)
  const [cargando, setCargando]       = useState(true)
  const [guardando, setGuardando]     = useState(false)
  const [busqueda, setBusqueda]       = useState('')
  const [modal, setModal]             = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await conductoresAPI.listar({ limite: 100 })
      const datos = res.data.datos || []
      const filtrados = busqueda
        ? datos.filter(c => `${c.nombres} ${c.apellidos} ${c.numero_documento}`.toLowerCase().includes(busqueda.toLowerCase()))
        : datos
      setConductores(filtrados)
      setTotal(res.data.paginacion?.total || datos.length)
    } catch {
      toast.error('Error cargando conductores')
    } finally {
      setCargando(false)
    }
  }, [busqueda])

  useEffect(() => { cargar() }, [cargar])

  const guardarNuevo = async (form) => {
    if (!form.nombres || !form.apellidos || !form.numero_documento) {
      toast.error('Nombres, apellidos y documento son requeridos')
      return
    }
    setGuardando(true)
    try {
      await conductoresAPI.crear(form)
      toast.success('Conductor creado correctamente')
      setModal(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al crear conductor')
    } finally {
      setGuardando(false)
    }
  }

  const guardarEdicion = async (form) => {
    setGuardando(true)
    try {
      await conductoresAPI.actualizar(modal.id, {
        nombres: form.nombres, apellidos: form.apellidos,
        telefono: form.telefono, email: form.email,
        ciudad: form.ciudad, direccion: form.direccion,
        numero_licencia: form.numero_licencia,
        categoria_licencia: form.categoria_licencia,
        vencimiento_licencia: form.vencimiento_licencia || null,
        fecha_ingreso: form.fecha_ingreso || null,
        tipo_contrato: form.tipo_contrato,
        salario_base: parseFloat(form.salario_base || 0),
        auxilio_transporte: parseFloat(form.auxilio_transporte || 0),
        observaciones: form.observaciones
      })
      toast.success('Conductor actualizado')
      setModal(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al actualizar')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (c) => {
    if (!confirm(`¿Eliminar al conductor ${c.nombres} ${c.apellidos}?`)) return
    try {
      await conductoresAPI.eliminar(c.id)
      toast.success('Conductor eliminado')
      cargar()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conductores</h1>
          <p className="text-gray-500 text-sm">{total} conductores registrados</p>
        </div>
        <button onClick={() => setModal('nuevo')} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo conductor
        </button>
      </div>

      <div className="card p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="input pl-9" />
          </div>
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="btn-secondary text-sm">Limpiar</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b">
                <th className="px-5 py-3 text-left font-medium">Conductor</th>
                <th className="px-5 py-3 text-left font-medium">Documento</th>
                <th className="px-5 py-3 text-left font-medium">Teléfono</th>
                <th className="px-5 py-3 text-left font-medium">Licencia</th>
                <th className="px-5 py-3 text-left font-medium">Vencimiento</th>
                <th className="px-5 py-3 text-right font-medium">Salario</th>
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
              ) : conductores.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                  No hay conductores.{' '}
                  <button onClick={() => setModal('nuevo')} className="text-primary-600 hover:underline">
                    Agregar el primero
                  </button>
                </td></tr>
              ) : conductores.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{c.nombres} {c.apellidos}</p>
                    <p className="text-gray-400 text-xs">{c.ciudad || '—'}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    <span className="text-xs text-gray-400">{c.tipo_documento} </span>
                    {c.numero_documento}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.telefono || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {c.numero_licencia || '—'}
                    {c.categoria_licencia && <span className="ml-1 badge-blue">{c.categoria_licencia}</span>}
                  </td>
                  <td className="px-5 py-3">
                    {c.vencimiento_licencia ? (
                      <span className={new Date(c.vencimiento_licencia) < new Date() ? 'text-red-500 font-medium' : 'text-gray-600'}>
                        {formatFecha(c.vencimiento_licencia)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{formatCOP(c.salario_base)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={c.activo ? 'badge-green' : 'badge-red'}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setModal(c)}
                        className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => eliminar(c)}
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
      </div>

      {modal === 'nuevo' && (
        <Modal titulo="Nuevo conductor" onClose={() => setModal(null)}>
          <FormConductor onGuardar={guardarNuevo} onCancelar={() => setModal(null)} cargando={guardando} />
        </Modal>
      )}
      {modal && modal !== 'nuevo' && (
        <Modal titulo={`Editar — ${modal.nombres} ${modal.apellidos}`} onClose={() => setModal(null)}>
          <FormConductor inicial={modal} onGuardar={guardarEdicion} onCancelar={() => setModal(null)} cargando={guardando} />
        </Modal>
      )}
    </div>
  )
}
