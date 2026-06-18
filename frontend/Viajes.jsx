import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Filter, Truck } from 'lucide-react'
import { viajesAPI } from '../services/api'
import { formatCOP, formatPct, formatFecha, colorRentabilidad, badgeEstado, labelEstado } from '../utils/format'
import toast from 'react-hot-toast'

const ESTADOS = ['','programado','en_curso','completado','cancelado','liquidado']

export default function Viajes() {
  const [viajes, setViajes]     = useState([])
  const [total, setTotal]       = useState(0)
  const [cargando, setCargando] = useState(true)
  const [pagina, setPagina]     = useState(1)
  const [filtros, setFiltros]   = useState({ placa: '', estado: '', fecha_inicio: '', fecha_fin: '' })

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = { pagina, limite: 20, ...filtros }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const res = await viajesAPI.listar(params)
      setViajes(res.data.datos)
      setTotal(res.data.paginacion.total)
    } catch {
      toast.error('Error cargando viajes')
    } finally {
      setCargando(false)
    }
  }, [pagina, filtros])

  useEffect(() => { cargar() }, [cargar])

  const buscar = (e) => {
    e.preventDefault()
    setPagina(1)
    cargar()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Viajes</h1>
          <p className="text-gray-500 text-sm">{total} viajes registrados</p>
        </div>
        <Link to="/viajes/nuevo" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo viaje
        </Link>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <form onSubmit={buscar} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-36">
            <label className="label">Buscar por placa</label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={filtros.placa}
                onChange={e => setFiltros(f => ({ ...f, placa: e.target.value.toUpperCase() }))}
                placeholder="ABC123"
                className="input pl-9 font-mono uppercase"
              />
            </div>
          </div>
          <div className="min-w-36">
            <label className="label">Estado</label>
            <select value={filtros.estado}
              onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
              className="input">
              {ESTADOS.map(e => (
                <option key={e} value={e}>{e ? labelEstado(e) : 'Todos'}</option>
              ))}
            </select>
          </div>
          <div className="min-w-36">
            <label className="label">Desde</label>
            <input type="date" value={filtros.fecha_inicio}
              onChange={e => setFiltros(f => ({ ...f, fecha_inicio: e.target.value }))}
              className="input" />
          </div>
          <div className="min-w-36">
            <label className="label">Hasta</label>
            <input type="date" value={filtros.fecha_fin}
              onChange={e => setFiltros(f => ({ ...f, fecha_fin: e.target.value }))}
              className="input" />
          </div>
          <button type="submit" className="btn-primary flex items-center gap-2 text-sm h-[38px]">
            <Search className="w-4 h-4" /> Buscar
          </button>
          <button type="button" onClick={() => { setFiltros({ placa:'',estado:'',fecha_inicio:'',fecha_fin:'' }); setPagina(1) }}
            className="btn-secondary text-sm h-[38px]">
            Limpiar
          </button>
        </form>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b">
                <th className="px-4 py-3 text-left font-medium">Viaje / Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Placa / Conductor</th>
                <th className="px-4 py-3 text-left font-medium">Ruta</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-right font-medium">Flete</th>
                <th className="px-4 py-3 text-right font-medium">Utilidad</th>
                <th className="px-4 py-3 text-right font-medium">Rent.</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-2" />
                  Cargando...
                </td></tr>
              ) : viajes.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  No se encontraron viajes.{' '}
                  <Link to="/viajes/nuevo" className="text-primary-600 hover:underline">Crear el primero</Link>
                </td></tr>
              ) : viajes.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/viajes/${v.id}`} className="font-semibold text-primary-600 hover:underline block">
                      {v.numero_viaje}
                    </Link>
                    <span className="text-gray-400 text-xs">{formatFecha(v.fecha_salida)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                      {v.placa}
                    </span>
                    <p className="text-gray-500 text-xs mt-1">{v.conductor}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <span className="font-medium">{v.origen}</span>
                    <span className="text-gray-400"> → </span>
                    <span className="font-medium">{v.destino}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{v.cliente}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCOP(v.valor_flete_cobrado)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${v.utilidad_neta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCOP(v.utilidad_neta)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-base ${colorRentabilidad(v.rentabilidad_pct)}`}>
                      {formatPct(v.rentabilidad_pct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={badgeEstado(v.estado)}>{labelEstado(v.estado)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/viajes/${v.id}`}
                      className="text-xs text-primary-600 hover:underline font-medium">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
            <span>Mostrando {viajes.length} de {total}</span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">
                ← Anterior
              </button>
              <button disabled={pagina * 20 >= total} onClick={() => setPagina(p => p + 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
