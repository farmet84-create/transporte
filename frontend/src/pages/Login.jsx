import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { authAPI } from '../services/api'
import useAuthStore from '../store/authStore'

const LOGO = 'https://waappbusiness.com/wp-content/uploads/2026/01/cropped-walogo-blanco.png'

export default function Login() {
  const navigate  = useNavigate()
  const { login } = useAuthStore()
  const [verPass, setVerPass] = useState(false)
  const [cargando, setCargando] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setCargando(true)
    try {
      const res = await authAPI.login(data)
      const { token, usuario } = res.data.datos
      login(token, usuario)
      toast.success(`Bienvenido, ${usuario.nombre.split(' ')[0]}`)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al iniciar sesión'
      toast.error(msg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <img src={LOGO} alt="Logo TransportePro" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">TransportePro</h1>
          <p className="text-primary-200 text-sm mt-1">Sistema de rentabilidad de carga</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email */}
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('email', {
                    required: 'El correo es requerido',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' }
                  })}
                  type="email"
                  placeholder="admin@miempresa.com"
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password', { required: 'La contraseña es requerida' })}
                  type={verPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setVerPass(!verPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {verPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={cargando} className="btn-primary w-full mt-2">
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">
          © 2026 TransportePro — Sistema de rentabilidad
        </p>
      </div>
    </div>
  )
}
