import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { suscripcionAPI } from '../services/api'
import { CreditCard, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatFecha(f) {
  if (!f) return '—'
  const [y, m, d] = f.slice(0, 10).split('-')
  return `${d} ${MESES[parseInt(m)]} ${y}`
}

export default function Suscripcion() {
  const [estado, setEstado]     = useState(null)
  const [pagos, setPagos]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [pagando, setPagando]   = useState(false)
  const [searchParams]          = useSearchParams()

  useEffect(() => {
    const resultado = searchParams.get('pago')
    if (resultado === 'exitoso') toast.success('¡Pago realizado! Tu suscripción se activará en unos momentos.')
    if (resultado === 'fallido') toast.error('El pago no fue procesado. Intenta de nuevo.')
    if (resultado === 'pendiente') toast('Pago pendiente de confirmación.', { icon: '⏳' })
  }, [])

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      setCargando(true)
      const [rEstado, rPagos] = await Promise.all([
        suscripcionAPI.obtenerEstado(),
        suscripcionAPI.listarPagos(),
      ])
      setEstado(rEstado.data.datos)
      setPagos(rPagos.data.datos || [])
    } catch {
      toast.error('Error cargando datos de suscripción')
    } finally {
      setCargando(false)
    }
  }

  async function handlePagar() {
    try {
      setPagando(true)
      const r = await suscripcionAPI.generarPago()
      const url = r.data.datos?.init_point || r.data.datos?.sandbox_init_point
      if (url) window.location.href = url
    } catch {
      toast.error('Error generando link de pago')
      setPagando(false)
    }
  }

  const diasRestantes = estado?.dias_restantes ?? 0
  const bloqueado     = estado?.estado === 'bloqueado'
  const porVencer     = !bloqueado && diasRestantes <= 5
  const colorEstado   = bloqueado ? '#ef4444' : porVencer ? '#f59e0b' : '#22c55e'

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <p style={{ color: '#6b7280' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Suscripción</h1>

      <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: `1px solid ${colorEstado}30`, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Estado de suscripción
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: `${colorEstado}15`, color: colorEstado, fontWeight: 700, fontSize: 14 }}>
                {bloqueado ? <XCircle size={14} /> : porVencer ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                {bloqueado ? 'Bloqueada' : porVencer ? `Vence en ${diasRestantes} días` : 'Activa'}
              </span>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px' }}>
              <div>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Precio mensual</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '2px 0 0' }}>$395 USD</p>
              </div>
              {estado?.fecha_vencimiento && (
                <div>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Vencimiento</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '2px 0 0' }}>
                    {formatFecha(estado.fecha_vencimiento)}
                  </p>
                </div>
              )}
            </div>
          </div>
          <button onClick={handlePagar} disabled={pagando} style={{ padding: '12px 24px', background: pagando ? '#d1d5db' : '#009ee3', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: pagando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <CreditCard size={18} />
            {pagando ? 'Redirigiendo...' : bloqueado ? 'Reactivar suscripción' : 'Renovar ahora'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #f1f5f9' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Historial de pagos</h2>
        {pagos.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Sin pagos registrados aún</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['Fecha', 'Periodo', 'Monto', 'Estado'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagos.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px', color: '#374151' }}>{formatFecha(p.fecha_pago)}</td>
                    <td style={{ padding: '12px', color: '#374151' }}>{formatFecha(p.periodo_desde)} — {formatFecha(p.periodo_hasta)}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#111827' }}>${p.monto_usd} USD</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: p.estado === 'aprobado' ? '#f0fdf4' : '#fef2f2', color: p.estado === 'aprobado' ? '#15803d' : '#dc2626' }}>
                        {p.estado === 'aprobado' ? 'Aprobado' : p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
