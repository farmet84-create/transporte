import { useState, useEffect, useCallback } from 'react'
import { Users, Shield, Activity, Plus, Edit2, Trash2, X, Save, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { formatFecha, formatHora } from '../utils/format'

const ROLES = [
  { value: 'admin',        label: 'Administrador',  color: 'bg-purple-100 text-purple-700', desc: 'Acceso total al sistema' },
  { value: 'operador',     label: 'Operador',        color: 'bg-blue-100 text-blue-700',    desc: 'Registra viajes y gestiona flota' },
  { value: 'contador',     label: 'Contador',        color: 'bg-green-100 text-green-700',  desc: 'Gestiona costos y ve reportes' },
  { value: 'visualizador', label: 'Visualizador',    color: 'bg-gray-100 text-gray-700',    desc: 'Solo lectura' },
]

const MODULOS = [
  { key: 'viajes',      label: 'Viajes' },
  { key: 'vehiculos',   label: 'Vehículos' },
  { key: 'conductores', label: 'Conductores' },
  { key: 'clientes',    label: 'Clientes' },
  { key: 'costos',      label: 'Costos mensuales' },
  { key: 'reportes',    label: 'Reportes' },
  { key: 'admin',       label: 'Administración' },
]

const ACCIONES_LABEL = {
  INSERT: { label: 'Creó',    color: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'Editó',   color: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'Eliminó', color: 'bg-red-100 text-red-700' },
  LOGIN:  { label: 'Ingresó', color: 'bg-purple-100 text-purple-700' },
  LOGOUT: { label: 'Salió',   color: 'bg-gray-100 text-gray-700' },
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── USUARIOS ──────────────────────────────────────────────
function TabUsuarios() {
  const [usuarios, setUsuarios]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [modal, setModal]         = useState(null)
  const [verPass, setVerPass]     = useState(false)
  const [form, setForm] = useState({ nombre:'', apellido:'', email:'', password:'', rol:'operador', activo:1 })
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }))

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.get('/admin/usuarios')
      setUsuarios(res.data.datos || [])
    } catch { toast.error('Error cargando usuarios') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.nombre || !form.email) { toast.error('Nombre y email son requeridos'); return }
    if (modal === 'nuevo' && !form.password) { toast.error('La contraseña es requerida'); return }
    setGuardando(true)
    try {
      if (modal === 'nuevo') {
        await api.post('/admin/usuarios', form)
        toast.success('Usuario creado correctamente')
      } else {
        await api.put(`/admin/usuarios/${modal.id}`, form)
        toast.success('Usuario actualizado')
      }
      setModal(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar')
    } finally { setGuardando(false) }
  }

  const toggleActivo = async (u) => {
    try {
      await api.put(`/admin/usuarios/${u.id}`, { activo: u.activo ? 0 : 1 })
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
      cargar()
    } catch { toast.error('Error al actualizar') }
  }

  const abrirEditar = (u) => {
    setForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, password: '', rol: u.rol, activo: u.activo })
    setModal(u)
  }

  const abrirNuevo = () => {
    setForm({ nombre:'', apellido:'', email:'', password:'', rol:'operador', activo:1 })
    setModal('nuevo')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{usuarios.length} usuarios registrados</p>
        <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* Tabla usuarios */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b">
              <th className="px-5 py-3 text-left font-medium">Usuario</th>
              <th className="px-5 py-3 text-left font-medium">Email</th>
              <th className="px-5 py-3 text-left font-medium">Rol</th>
              <th className="px-5 py-3 text-center font-medium">Estado</th>
              <th className="px-5 py-3 text-left font-medium">Último acceso</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">Cargando...</td></tr>
            ) : usuarios.map(u => {
              const rol = ROLES.find(r => r.value === u.rol)
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                        {u.nombre?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.nombre} {u.apellido}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${rol?.color}`}>
                      {rol?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggleActivo(u)}
                      className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {u.ultimo_acceso ? `${formatFecha(u.ultimo_acceso)} ${formatHora(u.ultimo_acceso)}` : 'Nunca'}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => abrirEditar(u)}
                      className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <Modal titulo={modal === 'nuevo' ? 'Nuevo usuario' : `Editar — ${modal.nombre}`} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre *</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className="input" placeholder="Juan" />
              </div>
              <div>
                <label className="label">Apellido</label>
                <input value={form.apellido} onChange={e => set('apellido', e.target.value)} className="input" placeholder="Pérez" />
              </div>
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" placeholder="juan@empresa.com" />
            </div>
            <div>
              <label className="label">{modal === 'nuevo' ? 'Contraseña *' : 'Nueva contraseña (dejar vacío para no cambiar)'}</label>
              <div className="relative">
                <input type={verPass ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="input pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setVerPass(!verPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {verPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Rol *</label>
              <select value={form.rol} onChange={e => set('rol', e.target.value)} className="input">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── ROLES Y PERMISOS ──────────────────────────────────────
function TabPermisos() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Permisos por defecto de cada rol en el sistema.</p>
      {ROLES.map(rol => (
        <div key={rol.value} className="card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${rol.color}`}>{rol.label}</span>
            <span className="text-sm text-gray-500">{rol.desc}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Módulo</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Ver</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Crear</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Editar</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MODULOS.map(mod => {
                  const perms = getPermisosPorRol(rol.value, mod.key)
                  return (
                    <tr key={mod.key} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-700">{mod.label}</td>
                      {['ver','crear','editar','eliminar'].map(accion => (
                        <td key={accion} className="px-4 py-2 text-center">
                          {perms[accion]
                            ? <span className="text-green-500 font-bold">✓</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function getPermisosPorRol(rol, modulo) {
  const matriz = {
    admin:        { ver:1, crear:1, editar:1, eliminar:1 },
    operador:     { ver:1, crear: modulo !== 'costos' && modulo !== 'admin' ? 1:0, editar: modulo !== 'costos' && modulo !== 'admin' ? 1:0, eliminar:0 },
    contador:     { ver:1, crear: modulo === 'costos' ? 1:0, editar: modulo === 'costos' ? 1:0, eliminar:0 },
    visualizador: { ver: modulo !== 'admin' ? 1:0, crear:0, editar:0, eliminar:0 },
  }
  return matriz[rol] || { ver:0, crear:0, editar:0, eliminar:0 }
}

// ─── AUDITORÍA ─────────────────────────────────────────────
function TabAuditoria() {
  const [logs, setLogs]         = useState([])
  const [cargando, setCargando] = useState(true)
  const [pagina, setPagina]     = useState(1)
  const [total, setTotal]       = useState(0)
  const [expandido, setExpandido] = useState(null)
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroAccion, setFiltroAccion]   = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await api.get('/admin/auditoria', {
        params: { pagina, limite: 20, usuario: filtroUsuario, accion: filtroAccion }
      })
      setLogs(res.data.datos || [])
      setTotal(res.data.paginacion?.total || 0)
    } catch { toast.error('Error cargando auditoría') }
    finally { setCargando(false) }
  }, [pagina, filtroUsuario, filtroAccion])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card p-4 flex gap-3">
        <input value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}
          placeholder="Filtrar por usuario..." className="input flex-1 text-sm" />
        <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)} className="input w-40 text-sm">
          <option value="">Todas las acciones</option>
          <option value="INSERT">Creaciones</option>
          <option value="UPDATE">Ediciones</option>
          <option value="DELETE">Eliminaciones</option>
          <option value="LOGIN">Ingresos</option>
        </select>
      </div>

      <p className="text-sm text-gray-500">{total} registros de auditoría</p>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b">
              <th className="px-5 py-3 text-left font-medium">Fecha / Hora</th>
              <th className="px-5 py-3 text-left font-medium">Usuario</th>
              <th className="px-5 py-3 text-left font-medium">Acción</th>
              <th className="px-5 py-3 text-left font-medium">Tabla</th>
              <th className="px-5 py-3 text-left font-medium">IP</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">No hay registros</td></tr>
            ) : logs.map((log, i) => {
              const accion = ACCIONES_LABEL[log.accion] || { label: log.accion, color: 'bg-gray-100 text-gray-700' }
              return (
                <>
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      <p>{formatFecha(log.creado_en)}</p>
                      <p className="text-gray-400">{formatHora(log.creado_en)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{log.usuario_nombre}</p>
                      <p className="text-gray-400 text-xs">{log.usuario_rol}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${accion.color}`}>
                        {accion.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{log.tabla}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs font-mono">{log.ip}</td>
                    <td className="px-5 py-3">
                      {log.dato_antes || log.dato_despues ? (
                        <button onClick={() => setExpandido(expandido === i ? null : i)}
                          className="text-primary-600 hover:text-primary-800">
                          {expandido === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  {expandido === i && (log.dato_antes || log.dato_despues) && (
                    <tr key={`${log.id}-detail`} className="bg-gray-50">
                      <td colSpan={6} className="px-5 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.dato_antes && (
                            <div>
                              <p className="font-semibold text-red-600 mb-1">Antes:</p>
                              <pre className="bg-red-50 p-2 rounded text-red-700 overflow-auto max-h-32 text-xs">
                                {JSON.stringify(JSON.parse(log.dato_antes), null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.dato_despues && (
                            <div>
                              <p className="font-semibold text-green-600 mb-1">Después:</p>
                              <pre className="bg-green-50 p-2 rounded text-green-700 overflow-auto max-h-32 text-xs">
                                {JSON.stringify(JSON.parse(log.dato_despues), null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>

        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t text-sm text-gray-500">
            <span>Mostrando {logs.length} de {total}</span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p-1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">← Anterior</button>
              <button disabled={pagina * 20 >= total} onClick={() => setPagina(p => p+1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState('usuarios')

  const tabs = [
    { id: 'usuarios',  label: 'Usuarios',         icon: Users },
    { id: 'permisos',  label: 'Roles y permisos',  icon: Shield },
    { id: 'auditoria', label: 'Log de auditoría',  icon: Activity },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="text-gray-500 text-sm">Gestión de usuarios, roles y auditoría del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'usuarios'  && <TabUsuarios />}
      {tab === 'permisos'  && <TabPermisos />}
      {tab === 'auditoria' && <TabAuditoria />}
    </div>
  )
}
