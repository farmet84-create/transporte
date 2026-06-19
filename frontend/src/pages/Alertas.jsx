import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Info, X, RefreshCw, Shield, Wrench, Truck, DollarSign, CreditCard } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const COLORES = {
  danger:  { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    icon: 'text-red-500' },
  warning: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',  icon: 'text-amber-500' },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   icon: 'text-blue-500' },
}

const CATEGORIAS = {
  vehiculo:   { label: 'Vehículos',   icon: Truck },
  conductor:  { label: 'Conductores', icon: CreditCard },
  viaje:      { label: 'Viajes',      icon: Truck },
  financiero: { label: 'Financiero',  icon: DollarSign },
}

export default function Alertas() {
  const [data, setData]         = useState(null)
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro]     = useState('todas')

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.get('/alertas')
      setData(res.data.datos)
    } catch {
      toast.error('Error cargando alertas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const alertas = data?.alertas || []
  const resumen = data?.resumen || {}

  const filtradas = filtro === 'todas' ? alertas
    : filtro === 'danger' || filtro === 'warning' || filtro === 'info'
      ? alertas.filter(a => a.tipo === filtro)
      : alertas.filter(a => a.categoria === filtro)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas del sistema</h1>
          <p className="text-gray-500 text-sm">
            {resumen.total > 0
              ? `${resumen.total} alertas activas — ${resumen.danger || 0} críticas, ${resumen.warning || 0} advertencias, ${resumen.info || 0} informativas`
              : 'Todo en orden'}
          </p>
        </div>
        <button onClick={cargar} disabled={cargando}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setFiltro('todas')}
          className={`card p-4 text-center transition-all ${filtro === 'todas' ? 'ring-2 ring-primary-500' : 'hover:shadow-md'}`}>
          <p className="text-2xl font-black text-gray-900">{resumen.total || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Total alertas</p>
        </button>
        <button onClick={() => setFiltro('danger')}
          className={`card p-4 text-center transition-all ${filtro === 'danger' ? 'ring-2 ring-red-500' : 'hover:shadow-md'}`}>
          <p className="text-2xl font-black text-red-600">{resumen.danger || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Críticas</p>
        </button>
        <button onClick={() => setFiltro('warning')}
          className={`card p-4 text-center transition-all ${filtro === 'warning' ? 'ring-2 ring-amber-500' : 'hover:shadow-md'}`}>
          <p className="text-2xl font-black text-amber-600">{resumen.warning || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Advertencias</p>
        </button>
        <button onClick={() => setFiltro('info')}
          className={`card p-4 text-center transition-all ${filtro === 'info' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}>
          <p className="text-2xl font-black text-blue-600">{resumen.info || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Informativas</p>
        </button>
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(CATEGORIAS).map(([key, { label }]) => (
          <button key={key} onClick={() => setFiltro(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtro === key ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Lista de alertas */}
      {cargando ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-700">
            {filtro === 'todas' ? '¡Todo en orden!' : 'Sin alertas en esta categoría'}
          </p>
          <p className="text-gray-400 text-sm mt-1">No hay alertas activas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((alerta, i) => {
            const c = COLORES[alerta.tipo]
            return (
              <div key={i} className={`card p-4 border-l-4 ${c.border} ${c.bg}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{alerta.icono}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
                        {alerta.tipo === 'danger' ? '⚠️ Crítico' : alerta.tipo === 'warning' ? '⚡ Advertencia' : 'ℹ️ Info'}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{alerta.categoria}</span>
                    </div>
                    <p className={`font-semibold text-sm ${c.text}`}>{alerta.titulo}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{alerta.descripcion}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {alerta.viaje_id && (
                      <Link to={`/viajes/${alerta.viaje_id}`}
                        className="text-xs text-primary-600 hover:underline font-medium">
                        Ver viaje →
                      </Link>
                    )}
                    {alerta.vehiculo_id && (
                      <Link to="/vehiculos"
                        className="text-xs text-primary-600 hover:underline font-medium">
                        Ver vehículo →
                      </Link>
                    )}
                    {alerta.conductor_id && (
                      <Link to="/conductores"
                        className="text-xs text-primary-600 hover:underline font-medium">
                        Ver conductor →
                      </Link>
                    )}
                    {alerta.categoria === 'financiero' && (
                      <Link to="/costos"
                        className="text-xs text-primary-600 hover:underline font-medium">
                        Ir a costos →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
