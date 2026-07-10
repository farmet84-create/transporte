import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import Layout       from './components/layout/Layout'
import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Viajes       from './pages/Viajes'
import NuevoViaje   from './pages/NuevoViaje'
import DetalleViaje from './pages/DetalleViaje'
import CuentasCobrar from './pages/CuentasCobrar'
import Vehiculos    from './pages/Vehiculos'
import Conductores  from './pages/Conductores'
import Clientes     from './pages/Clientes'
import Costos       from './pages/Costos'
import Reportes     from './pages/Reportes'
import Admin        from './pages/Admin'
import Alertas      from './pages/Alertas'
import Suscripcion  from './pages/Suscripcion'
import BloqueoSuscripcion from './components/BloqueoSuscripcion'

function Privada({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [bloqueo, setBloqueo] = useState(null)

  useEffect(() => {
    const handler = (e) => setBloqueo(e.detail)
    window.addEventListener('suscripcion:bloqueada', handler)
    return () => window.removeEventListener('suscripcion:bloqueada', handler)
  }, [])

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { borderRadius: '10px', fontSize: '14px' }
      }} />
      {bloqueo && <BloqueoSuscripcion detalle={bloqueo} />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Privada><Layout /></Privada>}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/viajes"       element={<Viajes />} />
          <Route path="/viajes/nuevo" element={<NuevoViaje />} />
          <Route path="/viajes/:id"   element={<DetalleViaje />} />
          <Route path="/cuentas-cobrar" element={<CuentasCobrar />} />
          <Route path="/vehiculos"    element={<Vehiculos />} />
          <Route path="/conductores"  element={<Conductores />} />
          <Route path="/clientes"     element={<Clientes />} />
          <Route path="/costos"       element={<Costos />} />
          <Route path="/reportes"     element={<Reportes />} />
          <Route path="/admin"        element={<Admin />} />
          <Route path="/alertas"      element={<Alertas />} />
          <Route path="/suscripcion"  element={<Suscripcion />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
