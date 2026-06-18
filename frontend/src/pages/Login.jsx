import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { authAPI } from '../services/api'
import useAuthStore from '../store/authStore'

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
      toast.success(`Welcome, ${usuario.nombre.split(' ')[0]}`)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Login error'
      toast.error(msg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#090d1b' }}>
      <div className="w-full max-w-md">

        {/* Marca */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">WaappLatam</h1>
          <p className="text-sm mt-2" style={{ color: '#6b7280' }}>
            Freight Profitability System
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl shadow-2xl p-8" style={{ backgroundColor: '#111827' }}>
          <h2 className="text-lg font-semibold text-white mb-6">Sign in</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#9ca3af' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b7280' }} />
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
                  })}
                  type="email"
                  placeholder="admin@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-white border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#9ca3af' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b7280' }} />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={verPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-white border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setVerPass(!verPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#6b7280' }}>
                  {verPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={cargando}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50 mt-2"
              style={{ backgroundColor: '#4f46e5' }}>
              {cargando ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#374151' }}>
          © 2026 WaappLatam — Freight Profitability System
        </p>
      </div>
    </div>
  )
}
