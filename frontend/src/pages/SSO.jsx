import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import useAuthStore from '../store/authStore'

export default function SSO() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { login } = useAuthStore()

  useEffect(() => {
    const token = params.get('token')
    if (!token) { navigate('/login'); return }

    authAPI.ssoConsumir(token)
      .then(res => {
        const { token: jwt, usuario } = res.data.datos
        login(jwt, usuario)
        navigate('/dashboard')
      })
      .catch(() => {
        toast.error('No se pudo iniciar sesión automáticamente')
        navigate('/login')
      })
  }, [])

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a' }}>
      <div style={{ width:36, height:36, border:'4px solid #1f2937', borderTop:'4px solid #4f46e5', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  )
}
