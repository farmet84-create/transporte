import { useState } from 'react'
import {
  HelpCircle, ChevronDown, LayoutDashboard, FileText, Wallet, Truck,
  Wrench, UserCheck, Users, DollarSign, BarChart2, Bell, Settings, Calculator
} from 'lucide-react'

const SECCIONES = [
  {
    icon: LayoutDashboard, titulo: 'Dashboard',
    resumen: 'Vista general del negocio del mes.',
    puntos: [
      'Muestra los ingresos, la utilidad, la rentabilidad y el total de viajes del mes seleccionado (arriba a la derecha eliges año y mes).',
      'Usa el botón "Filtros" para ver totales por placa, cliente o rango de fechas: aparece un panel azul con fletes, gastos, costos mensuales, utilidad, margen, rentabilidad y suma de saldos.',
      'Más abajo verás gráficas de evolución del año y la lista de los últimos viajes.',
    ],
  },
  {
    icon: FileText, titulo: 'Viajes',
    resumen: 'Registro y control de todos los fletes.',
    puntos: [
      'Botón "Nuevo viaje": registra vehículo, conductor, cliente, origen/destino, tipo de viaje, kilómetros, manifiesto de carga (valor, flete, anticipo, retenciones, descuentos) y los gastos del viaje.',
      'El sistema calcula solo el "Saldo a pagar" del manifiesto y los kilómetros recorridos (km final − km inicial).',
      'En la lista puedes filtrar por placa, estado o fechas. La columna Manifiesto muestra el número, y verás flete, saldo, utilidad y rentabilidad de cada viaje.',
      'Al abrir un viaje (botón Ver), el administrador puede editarlo, cambiar su estado y agregar gastos o gastos pre operacionales.',
    ],
  },
  {
    icon: Wallet, titulo: 'Saldos y cuentas por cobrar',
    resumen: 'Control de cobros a clientes (solo administrador).',
    puntos: [
      'Se alimenta automáticamente: cada viaje registrado aparece como una fila.',
      'Columnas automáticas: Cliente, N° Manifiesto, Anticipo y Saldo (igual al Saldo a pagar del viaje).',
      'Tú registras manualmente la fecha de pago del anticipo y la fecha de pago del saldo; se guardan solas.',
      'Filtros por cliente, fechas y número de manifiesto. Arriba ves: total de saldos, anticipos al día (ya pagados) y anticipos pendientes de pago.',
    ],
  },
  {
    icon: Truck, titulo: 'Vehículos',
    resumen: 'Registro de la flota.',
    puntos: [
      'Crea y edita cada vehículo con placa, marca, modelo, tipo, rendimiento km/galón y fechas de vencimiento de SOAT y tecnomecánica.',
      'Las fechas de SOAT y tecnomecánica generan alertas automáticas cuando están por vencer o vencidas.',
    ],
  },
  {
    icon: Wrench, titulo: 'Mantenimiento',
    resumen: 'Semáforo de mantenimiento por vehículo.',
    puntos: [
      'Una fila por cada vehículo activo. Registras el km actual, la fecha y km del próximo mantenimiento y los pendientes.',
      'El semáforo lo eliges tú: 🟢 Verde (al día), 🟡 Amarillo (próximo) o 🔴 Rojo (urgente).',
      'Poner un vehículo en Amarillo o Rojo genera automáticamente una alerta en la sección de Alertas.',
    ],
  },
  {
    icon: UserCheck, titulo: 'Conductores',
    resumen: 'Registro de conductores.',
    puntos: [
      'Datos personales, documento, teléfono, licencia y su fecha de vencimiento.',
      'El vencimiento de la licencia genera alertas automáticas.',
    ],
  },
  {
    icon: Users, titulo: 'Clientes',
    resumen: 'Registro de clientes (dueños de la carga).',
    puntos: [
      'Razón social, NIT, contacto, teléfono, dirección, ciudad y días de crédito.',
      'Los clientes creados aparecen al registrar viajes y en los filtros de todo el sistema.',
    ],
  },
  {
    icon: DollarSign, titulo: 'Costos mensuales',
    resumen: 'Costos fijos por vehículo, cada mes.',
    puntos: [
      'Seleccionas año, mes y placa. Registras dos bloques por vehículo:',
      'Costos de operación: provisión mantenimiento, satelital, arriendo, parqueadero, cambio de aceite, gastos varios.',
      'Costos administrativos: SOAT, tecnomecánica, seguro, salarios, auxilio de transporte, bono, seguridad social, sistemas y otros.',
      'El total (operación + administrativos) se resta en los reportes para calcular la utilidad real del mes por placa.',
    ],
  },
  {
    icon: BarChart2, titulo: 'Reportes',
    resumen: 'Análisis de rentabilidad y recomendaciones con IA.',
    puntos: [
      'Pestaña Dashboard: resumen ejecutivo del mes con ingresos, gastos, costos mensuales de todas las placas, utilidad, margen, rentabilidad y saldos, más gráficas comparativas.',
      'Pestaña Clientes: facturación y rentabilidad por cliente.',
      'Pestaña IA: genera recomendaciones estratégicas automáticas basadas en tus datos.',
      'Cada indicador tiene un ícono ⓘ que al pasar el mouse explica de dónde sale el dato.',
    ],
  },
  {
    icon: Bell, titulo: 'Alertas',
    resumen: 'Avisos automáticos del sistema.',
    puntos: [
      'SOAT y tecnomecánica de vehículos por vencer o vencidos.',
      'Licencias de conductores por vencer.',
      'Mantenimientos en semáforo rojo o amarillo.',
      'Viajes con pérdida y meses sin costos registrados.',
    ],
  },
  {
    icon: Settings, titulo: 'Administración',
    resumen: 'Gestión de usuarios (solo administrador).',
    puntos: [
      'Crear usuarios con roles: administrador, operador, contador o visualizador.',
      'Cada rol tiene permisos distintos sobre las secciones del sistema.',
      'Registro de auditoría de las acciones realizadas.',
    ],
  },
]

const FORMULAS = [
  { nombre: 'Saldo a pagar (manifiesto)', formula: 'Valor manifiesto − Retenciones − Descuentos − Anticipo' },
  { nombre: 'Kilómetros recorridos', formula: 'Km final − Km inicial' },
  { nombre: 'Utilidad de un viaje', formula: 'Flete cobrado − Gastos del viaje' },
  { nombre: 'Margen', formula: '(Utilidad ÷ Flete cobrado) × 100' },
  { nombre: 'Rentabilidad', formula: '(Utilidad ÷ Gastos) × 100' },
  { nombre: 'Utilidad del mes (reportes)', formula: 'Fletes − Gastos de viajes − Costos mensuales de las placas' },
]

function Item({ s, abierto, onToggle }) {
  const Icon = s.icon
  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <button onClick={onToggle}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
        <div style={{ width:38, height:38, borderRadius:10, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon style={{ width:19, height:19, color:'#4f46e5' }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontWeight:700, fontSize:15, color:'#111827', margin:0 }}>{s.titulo}</p>
          <p style={{ fontSize:12, color:'#6b7280', margin:'2px 0 0' }}>{s.resumen}</p>
        </div>
        <ChevronDown style={{ width:18, height:18, color:'#9ca3af', flexShrink:0, transform: abierto ? 'rotate(180deg)' : 'none', transition:'transform .2s' }} />
      </button>
      {abierto && (
        <div style={{ padding:'0 16px 16px 66px' }}>
          <ul style={{ margin:0, paddingLeft:18, display:'flex', flexDirection:'column', gap:8 }}>
            {s.puntos.map((p, i) => (
              <li key={i} style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function Ayuda() {
  const [abierto, setAbierto] = useState(0)

  return (
    <div style={{ maxWidth:820, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <HelpCircle style={{ width:20, height:20, color:'#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>Ayuda — Cómo funciona el sistema</h1>
          <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>Guía de cada sección de la plataforma</p>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {SECCIONES.map((s, i) => (
          <Item key={i} s={s} abierto={abierto === i} onToggle={() => setAbierto(abierto === i ? -1 : i)} />
        ))}
      </div>

      {/* Fórmulas */}
      <div className="card" style={{ padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Calculator style={{ width:19, height:19, color:'#15803d' }} />
          </div>
          <div>
            <p style={{ fontWeight:700, fontSize:15, color:'#111827', margin:0 }}>Fórmulas del sistema</p>
            <p style={{ fontSize:12, color:'#6b7280', margin:'2px 0 0' }}>Cómo se calcula cada valor</p>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {FORMULAS.map((f, i) => (
            <div key={i} style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:6, padding:'8px 12px', background:'#f9fafb', borderRadius:8 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{f.nombre}</span>
              <span style={{ fontSize:13, color:'#4f46e5', fontWeight:500 }}>{f.formula}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
