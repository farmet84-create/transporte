import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import Layout       from './components/layout/Layout'
import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Viajes       from './pages/Viajes'
import NuevoViaje   from './pages/NuevoViaje'
import DetalleViaje from './pages/DetalleViaje'
import Vehiculos    from './pages/Vehiculos'
import Conductores  from './pages/Conductores'
import Clientes     from './pages/Clientes'
import Costos       from './pages/Costos'
import Reportes     from './pages/Reportes'
import Admin        from './pages/Admin'

function Privada({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { borderRadius: '10px', fontSize: '14px' }
      }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Privada><Layout /></Privada>}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/viajes"       element={<Viajes />} />
          <Route path="/viajes/nuevo" element={<NuevoViaje />} />
          <Route path="/viajes/:id"   element={<DetalleViaje />} />
          <Route path="/vehiculos"    element={<Vehiculos />} />
          <Route path="/conductores"  element={<Conductores />} />
          <Route path="/clientes"     element={<Clientes />} />
          <Route path="/costos"       element={<Costos />} />
          <Route path="/reportes"     element={<Reportes />} />
          <Route path="/admin"        element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
