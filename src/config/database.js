'use strict';

const mysql = require('mysql2/promise');

// Pool de conexiones — reutiliza conexiones en lugar de crear una nueva por request
const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT) || 3306,
  database:           process.env.DB_NAME,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  connectionLimit:    parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  timezone:           '+00:00',
  charset:            'utf8mb4',
  waitForConnections: true,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 30000,
});

// Verificar conexión al iniciar
async function verificarConexion() {
  try {
    const conn = await pool.getConnection();
    console.log(`✅ Base de datos conectada: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    conn.release();
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    process.exit(1);
  }
}

module.exports = { pool, verificarConexion };
