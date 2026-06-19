import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, X, Bell } from 'lucide-react'
import api from '../services/api'

export default function AlertasBanner() {
  const [resumen, setResumen] = useState(null)
  const [cerrado, setCerrado] = useState(false)

  useEffect(() => {
    api.get('/alertas')
      .then(r => setResumen(r.data.datos?.resumen))
      .catch(() => {})
  }, [])

  if (cerrado || !resumen || resumen.total === 0) return null

  const color = resumen.danger > 0
    ? 'bg-red-50 border-red-200 text-red-800'
    : resumen.warning > 0
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-blue-50 border-blue-200 text-blue-800'

  return (
    <div className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${color}`}>
      <Bell className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 text-sm">
        <span className="font-semibold">{resumen.total} alertas activas — </span>
        {resumen.danger > 0 && <span className="text-red-700 font-bold">{resumen.danger} críticas </span>}
        {resumen.warning > 0 && <span className="text-amber-700">{resumen.warning} advertencias </span>}
        {resumen.info > 0 && <span className="text-blue-600">{resumen.info} informativas</span>}
      </div>
      <Link to="/alertas" className="text-xs font-semibold underline flex-shrink-0">
        Ver todas →
      </Link>
      <button onClick={() => setCerrado(true)} className="flex-shrink-0 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
