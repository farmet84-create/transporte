// Formatear moneda colombiana
export const formatCOP = (valor) => {
  if (valor === null || valor === undefined) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(valor)
}

// Formatear número con separador de miles
export const formatNum = (valor, decimales = 0) => {
  if (valor === null || valor === undefined) return '—'
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor)
}

// Formatear porcentaje
export const formatPct = (valor) => {
  if (valor === null || valor === undefined) return '—'
  return `${parseFloat(valor).toFixed(1)}%`
}

// Formatear fecha
export const formatFecha = (fecha) => {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

// Formatear hora
export const formatHora = (hora) => {
  if (!hora) return '—'
  return hora.substring(0, 5)
}

// Color de rentabilidad
export const colorRentabilidad = (pct) => {
  if (pct >= 20) return 'text-green-600'
  if (pct >= 10) return 'text-yellow-600'
  if (pct >= 0)  return 'text-orange-500'
  return 'text-red-600'
}

// Badge de rentabilidad
export const badgeRentabilidad = (pct) => {
  if (pct >= 20) return 'badge-green'
  if (pct >= 10) return 'badge-yellow'
  if (pct >= 0)  return 'badge-yellow'
  return 'badge-red'
}

// Badge de estado de viaje
export const badgeEstado = (estado) => {
  const map = {
    programado:  'badge-blue',
    en_curso:    'badge-yellow',
    completado:  'badge-green',
    cancelado:   'badge-red',
    liquidado:   'badge-gray',
  }
  return map[estado] || 'badge-gray'
}

export const labelEstado = (estado) => {
  const map = {
    programado: 'Programado',
    en_curso:   'En curso',
    completado: 'Completado',
    cancelado:  'Cancelado',
    liquidado:  'Liquidado',
  }
  return map[estado] || estado
}

// Nombre del mes
export const nombreMes = (mes) => {
  const meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return meses[mes] || ''
}
