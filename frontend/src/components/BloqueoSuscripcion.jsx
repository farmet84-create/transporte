import { useState } from 'react'
import { suscripcionAPI } from '../services/api'
import { Lock, CreditCard } from 'lucide-react'

export default function BloqueoSuscripcion() {
  const [cargando, setCargando] = useState(false)

  const handlePagar = async () => {
    try {
      setCargando(true)
      const r = await suscripcionAPI.generarPago()
      const url = r.data.datos?.init_point || r.data.datos?.sandbox_init_point
      if (url) window.location.href = url
    } catch {
      setCargando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(9,13,27,0.97)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', padding: 24,
    }}>
      <div style={{
        background: '#111827', borderRadius: 20, padding: '40px 32px',
        maxWidth: 440, width: '100%', textAlign: 'center',
        border: '1px solid rgba(239,68,68,0.3)',
        boxShadow: '0 0 40px rgba(239,68,68,0.1)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Lock style={{ width: 32, height: 32, color: '#ef4444' }} />
        </div>
        <h2 style={{ color: '#ffffff', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
          Suscripción vencida
        </h2>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
          Tu acceso ha sido suspendido por falta de pago.<br />
          Realiza el pago para recuperar el acceso de inmediato.
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 12,
          padding: 16, marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 4px' }}>Suscripción mensual</p>
          <p style={{ color: '#ffffff', fontSize: 28, fontWeight: 900, margin: 0 }}>$395 USD</p>
        </div>
        <button
          onClick={handlePagar}
          disabled={cargando}
          style={{
            width: '100%', padding: '14px 24px',
            background: cargando ? '#374151' : '#009ee3',
            color: '#ffffff', border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: cargando ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <CreditCard style={{ width: 20, height: 20 }} />
          {cargando ? 'Redirigiendo...' : 'Pagar con MercadoPago'}
        </button>
        <p style={{ color: '#4b5563', fontSize: 11, marginTop: 16 }}>
          Pago seguro procesado por MercadoPago
        </p>
      </div>
    </div>
  )
}
