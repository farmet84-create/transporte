import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://transporte-production-cb7a.up.railway.app'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    if (err.response?.status === 403 && err.response?.data?.bloqueado === true) {
      window.dispatchEvent(new CustomEvent('suscripcion:bloqueada', {
        detail: err.response.data
      }))
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login:  (data) => api.post('/auth/login', data),
  perfil: ()     => api.get('/auth/me'),
}

export const vehiculosAPI = {
  listar:     (params)   => api.get('/vehiculos', { params }),
  obtener:    (id)       => api.get(`/vehiculos/${id}`),
  crear:      (data)     => api.post('/vehiculos', data),
  actualizar: (id, data) => api.put(`/vehiculos/${id}`, data),
  eliminar:   (id)       => api.delete(`/vehiculos/${id}`),
  costoKm:    (id)       => api.get(`/vehiculos/${id}/costo-km`),
}

export const conductoresAPI = {
  listar:     (params)   => api.get('/conductores', { params }),
  obtener:    (id)       => api.get(`/conductores/${id}`),
  crear:      (data)     => api.post('/conductores', data),
  actualizar: (id, data) => api.put(`/conductores/${id}`, data),
  eliminar:   (id)       => api.delete(`/conductores/${id}`),
}

export const clientesAPI = {
  listar:     (params)   => api.get('/clientes', { params }),
  obtener:    (id)       => api.get(`/clientes/${id}`),
  crear:      (data)     => api.post('/clientes', data),
  actualizar: (id, data) => api.put(`/clientes/${id}`, data),
  eliminar:   (id)       => api.delete(`/clientes/${id}`),
}

export const viajesAPI = {
  listar:             (params)      => api.get('/viajes', { params }),
  obtener:            (id)          => api.get(`/viajes/${id}`),
  rentabilidad:       (id)          => api.get(`/viajes/${id}/rentabilidad`),
  crear:              (data)        => api.post('/viajes', data),
  actualizar:         (id, data)    => api.put(`/viajes/${id}`, data),
  cambiarEstado:      (id, estado)  => api.put(`/viajes/${id}/estado`, { estado }),
  eliminar:           (id)          => api.delete(`/viajes/${id}`),
  agregarGasto:       (id, data)    => api.post(`/viajes/${id}/gastos`, data),
  eliminarGasto:      (id, gastoId) => api.delete(`/viajes/${id}/gastos/${gastoId}`),
  agregarGastoPreop:  (id, data)    => api.post(`/viajes/${id}/gastos-preop`, data),
  eliminarGastoPreop: (id, gastoId) => api.delete(`/viajes/${id}/gastos-preop/${gastoId}`),
  agregarCombustible: (id, data)    => api.post(`/viajes/${id}/combustible`, data),
  eliminarCombustible:(id, cId)     => api.delete(`/viajes/${id}/combustible/${cId}`),
}

export const costosAPI = {
  listarVehiculo:         (params) => api.get('/costos/vehiculo', { params }),
  guardarVehiculo:        (data)   => api.post('/costos/vehiculo', data),
  listarOperacion:        (params) => api.get('/costos/operacion', { params }),
  guardarOperacion:       (data)   => api.post('/costos/operacion', data),
  listarAdministrativos:  (params) => api.get('/costos/administrativos', { params }),
  guardarAdministrativos: (data)   => api.post('/costos/administrativos', data),
}

export const reportesAPI = {
  dashboard:        (params) => api.get('/reportes/dashboard', { params }),
  porVehiculo:      (params) => api.get('/reportes/rentabilidad-vehiculo', { params }),
  porConductor:     (params) => api.get('/reportes/rentabilidad-conductor', { params }),
  porCliente:       (params) => api.get('/reportes/rentabilidad-cliente', { params }),
  evolucionMensual: (params) => api.get('/reportes/evolucion-mensual', { params }),
}

export const suscripcionAPI = {
  obtenerEstado:  ()  => api.get('/suscripcion'),
  generarPago:    ()  => api.post('/suscripcion/generar-pago'),
  listarPagos:    ()  => api.get('/suscripcion/pagos'),
}

export default api
