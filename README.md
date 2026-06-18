# Sistema de Rentabilidad de Transporte — API

API REST para el control de rentabilidad de fletes y operaciones de transporte de carga.

## Stack
- Node.js 18+ · Express 4 · MySQL 8 (Hostinger) · JWT · Railway

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd transporte-rentabilidad-api

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con los datos reales de Hostinger

# 4. Iniciar en desarrollo
npm run dev
```

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| DB_HOST | Host MySQL Hostinger |
| DB_NAME | Nombre de la base de datos |
| DB_USER | Usuario MySQL |
| DB_PASSWORD | Contraseña MySQL |
| JWT_SECRET | Secreto JWT (mínimo 64 caracteres) |

## Endpoints principales

### Autenticación
```
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/cambiar-password
```

### Vehículos
```
GET    /api/vehiculos?placa=ABC123
GET    /api/vehiculos/:id
GET    /api/vehiculos/:id/costo-km
POST   /api/vehiculos
PUT    /api/vehiculos/:id
DELETE /api/vehiculos/:id
```

### Viajes
```
GET    /api/viajes?placa=ABC&estado=completado&fecha_inicio=2026-06-01
GET    /api/viajes/:id
GET    /api/viajes/:id/rentabilidad
POST   /api/viajes
PUT    /api/viajes/:id/estado
POST   /api/viajes/:id/gastos
DELETE /api/viajes/:id/gastos/:gastoId
```

### Costos mensuales
```
GET    /api/costos/operacion?vehiculo_id=1&anio=2026&mes=6
POST   /api/costos/operacion
GET    /api/costos/administrativos?anio=2026&mes=6
POST   /api/costos/administrativos
```

### Reportes y dashboard
```
GET    /api/reportes/dashboard?anio=2026&mes=6
GET    /api/reportes/rentabilidad-vehiculo?anio=2026&mes=6&placa=ABC
GET    /api/reportes/rentabilidad-conductor?anio=2026&mes=6
GET    /api/reportes/rentabilidad-cliente?anio=2026&mes=6
GET    /api/reportes/evolucion-mensual?anio=2026
```

## Deploy en Railway

1. Subir código a GitHub
2. Conectar repositorio en Railway
3. Agregar variables de entorno en Railway → Variables
4. Railway detecta `railway.toml` y despliega automáticamente

## Fórmula de rentabilidad

```
Utilidad neta = Flete cobrado
              - Gastos directos del viaje        (Bloque 1)
              - (Km × Costo/km del vehículo)     (Bloque 2)
              - Costo administrativo prorrateado  (Bloque 3)

Rentabilidad % = (Utilidad neta / Flete cobrado) × 100
```
