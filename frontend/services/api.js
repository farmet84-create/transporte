import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://transporte-production-cb7a.up.railway.app'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Agregar token JWT a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Manejar errores globalmente
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── AUTH ───────────────────────────────────────────────
export const authAPI = {
  login:  (data) => api.post('/auth/login', data),
  perfil: ()     => api.get('/auth/me'),
}

// ─── VEHÍCULOS ──────────────────────────────────────────
export const vehiculosAPI = {
  listar:      (params) => api.get('/vehiculos', { params }),
  obtener:     (id)     => api.get(`/vehiculos/${id}`),
  crear:       (data)   => api.post('/vehiculos', data),
  actualizar:  (id, data) => api.put(`/vehiculos/${id}`, data),
  eliminar:    (id)     => api.delete(`/vehiculos/${id}`),
  costoKm:     (id)     => api.get(`/vehiculos/${id}/costo-km`),
}

// ─── CONDUCTORES ────────────────────────────────────────
export const conductoresAPI = {
  listar:  (params) => api.get('/conductores', { params }),
  obtener: (id)     => api.get(`/conductores/${id}`),
  crear:   (data)   => api.post('/conductores', data),
  actualizar: (id, data) => api.put(`/conductores/${id}`, data),
}

// ─── CLIENTES ───────────────────────────────────────────
export const clientesAPI = {
  listar:  (params) => api.get('/clientes', { params }),
  obtener: (id)     => api.get(`/clientes/${id}`),
  crear:   (data)   => api.post('/clientes', data),
  actualizar: (id, data) => api.put(`/clientes/${id}`, data),
}

// ─── VIAJES ─────────────────────────────────────────────
export const viajesAPI = {
  listar:        (params) => api.get('/viajes', { params }),
  obtener:       (id)     => api.get(`/viajes/${id}`),
  rentabilidad:  (id)     => api.get(`/viajes/${id}/rentabilidad`),
  crear:         (data)   => api.post('/viajes', data),
  cambiarEstado: (id, estado) => api.put(`/viajes/${id}/estado`, { estado }),
  agregarGasto:  (id, data)   => api.post(`/viajes/${id}/gastos`, data),
  eliminarGasto: (id, gastoId) => api.delete(`/viajes/${id}/gastos/${gastoId}`),
}

// ─── COSTOS ─────────────────────────────────────────────
export const costosAPI = {
  listarOperacion:       (params) => api.get('/costos/operacion', { params }),
  guardarOperacion:      (data)   => api.post('/costos/operacion', data),
  listarAdministrativos: (params) => api.get('/costos/administrativos', { params }),
  guardarAdministrativos:(data)   => api.post('/costos/administrativos', data),
}

// ─── REPORTES ───────────────────────────────────────────
export const reportesAPI = {
  dashboard:            (params) => api.get('/reportes/dashboard', { params }),
  porVehiculo:          (params) => api.get('/reportes/rentabilidad-vehiculo', { params }),
  porConductor:         (params) => api.get('/reportes/rentabilidad-conductor', { params }),
  porCliente:           (params) => api.get('/reportes/rentabilidad-cliente', { params }),
  evolucionMensual:     (params) => api.get('/reportes/evolucion-mensual', { params }),
}

export default api
