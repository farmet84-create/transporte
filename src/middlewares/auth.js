'use strict';

const jwt    = require('jsonwebtoken');
const logger = require('../config/logger');

// Verificar token JWT en cada request protegido
function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ ok: false, mensaje: 'Token requerido' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, empresa_id, rol, email }
    next();
  } catch (error) {
    logger.warn('Token inválido', { error: error.message, ip: req.ip });
    return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado' });
  }
}

// Verificar que el usuario tiene el rol requerido
function autorizar(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso denegado. Roles permitidos: ${roles.join(', ')}`
      });
    }
    next();
  };
}

// Verificar que el recurso pertenece a la empresa del usuario (multiempresa)
function mismaEmpresa(req, res, next) {
  const empresaId = parseInt(req.params.empresaId || req.body.empresa_id);
  if (empresaId && empresaId !== req.usuario.empresa_id) {
    return res.status(403).json({ ok: false, mensaje: 'Acceso denegado' });
  }
  next();
}

module.exports = { autenticar, autorizar, mismaEmpresa };
