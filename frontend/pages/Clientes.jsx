import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Users, Edit2, Trash2, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { clientesAPI } from '../services/api'
import { formatCOP } from '../utils/format'

const FORM_INICIAL = {
  razon_social:'', nit:'', nombre_contacto:'',
  telefono:'', email:'', direccion:'',
  ciudad:'', departamento:'',
  dias_credito: 0, limite_credito: 0, observaciones:''
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

function FormCliente({ inicial, onGuardar, onCancelar, cargando }) {
  const [form, setForm] = useState(inicial || FORM_INICIAL)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Razón social *</label>
          <input value={form.razon_social} onChange={e => set('razon_social', e.target.value)}
            placeholder="Empresa SAS" className="input" />
        </div>
        <div>
          <label className="label">NIT</label>
          <input value={form.nit} onChange={e => set('nit', e.target.value)}
            placeholder="900123456-1" className="input" />
        </div>
        <div>
          <label className="label">Nombre contacto</label>
          <input value={form.nombre_contacto} onChange={e => set('nombre_contacto', e.target.value)}
            placeholder="Juan Pérez" className="input" />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
            placeholder="3001234567" className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Ciudad</label>
          <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)}
            placeholder="Bogotá" className="input" />
        </div>
        <div>
          <label className="label">Departamento</label>
          <input value={form.departamento} onChange={e => set('departamento', e.target.value)}
            placeholder="Cundinamarca" className="input" />
        </div>
        <div>
          <label className="label">Días de crédito</label>
          <input type="number" value={form.dias_credito} onChange={e => set('dias_credito', e.target.value)}
            placeholder="30" className="input" />
        </div>
        <div>
          <label className="label">Límite de crédito</label>
          <input type="number" value={form.limite_credito} onChange={e => set('limite_credito', e.target.value)}
            placeholder="5000000" className="input" />
        </div>
        <div className="col-span-2">
          <label className="label">Dirección</label>
          <input value={form.direccion} onChange={e => set('direccion', e.target.value)} className="input" />
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

export default function Clientes() {
  const [clientes, setClientes]     = useState([])
  const [total, setTotal]           = useState(0)
  const [cargando, setCargando]     = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [busqueda, setBusqueda]     = useState('')
  const [modal, setModal]           = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await clientesAPI.listar({ limite: 100 })
      const datos = res.data.datos || []
      const filtrados = busqueda
        ? datos.filter(c => `${c.razon_social} ${c.nit}`.toLowerCase().includes(busqueda.toLowerCase()))
        : datos
      setClientes(filtrados)
      setTotal(res.data.paginacion?.total || datos.length)
    } catch {
      toast.error('Error cargando clientes')
    } finally {
      setCargando(false)
    }
  }, [busqueda])

  useEffect(() => { cargar() }, [cargar])

  const guardarNuevo = async (form) => {
    if (!form.razon_social) { toast.error('La razón social es requerida'); return }
    setGuardando(true)
    try {
      await clientesAPI.crear(form)
      toast.success('Cliente creado correctamente')
      setModal(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al crear cliente')
    } finally {
      setGuardando(false)
    }
  }

  const guardarEdicion = async (form) => {
    setGuardando(true)
    try {
      await clientesAPI.actualizar(modal.id, form)
      toast.success('Cliente actualizado')
      setModal(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al actualizar')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (c) => {
    if (!confirm(`¿Eliminar el cliente ${c.razon_social}?`)) return
    try {
      await clientesAPI.eliminar(c.id)
      toast.success('Cliente eliminado')
      cargar()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm">{total} clientes registrados</p>
        </div>
        <button onClick={() => setModal('nuevo')} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo cliente
        </button>
      </div>

      <div className="card p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o NIT..."
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
                <th className="px-5 py-3 text-left font-medium">Empresa</th>
                <th className="px-5 py-3 text-left font-medium">NIT</th>
                <th className="px-5 py-3 text-left font-medium">Contacto</th>
                <th className="px-5 py-3 text-left font-medium">Ciudad</th>
                <th className="px-5 py-3 text-right font-medium">Crédito</th>
                <th className="px-5 py-3 text-center font-medium">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-2" />
                  Cargando...
                </td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  No hay clientes.{' '}
                  <button onClick={() => setModal('nuevo')} className="text-primary-600 hover:underline">
                    Agregar el primero
                  </button>
                </td></tr>
              ) : clientes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{c.razon_social}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 font-mono text-xs">{c.nit || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">
                    <p>{c.nombre_contacto || '—'}</p>
                    {c.telefono && <p className="text-xs text-gray-400">{c.telefono}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.ciudad || '—'}</td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {c.dias_credito > 0 ? `${c.dias_credito} días` : 'Contado'}
                  </td>
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
        <Modal titulo="Nuevo cliente" onClose={() => setModal(null)}>
          <FormCliente onGuardar={guardarNuevo} onCancelar={() => setModal(null)} cargando={guardando} />
        </Modal>
      )}
      {modal && modal !== 'nuevo' && (
        <Modal titulo={`Editar — ${modal.razon_social}`} onClose={() => setModal(null)}>
          <FormCliente inicial={modal} onGuardar={guardarEdicion} onCancelar={() => setModal(null)} cargando={guardando} />
        </Modal>
      )}
    </div>
  )
}
