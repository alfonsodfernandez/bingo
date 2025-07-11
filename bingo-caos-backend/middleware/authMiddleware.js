// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Obtiene el token del encabezado ('Bearer TOKEN')
      token = req.headers.authorization.split(' ')[1];

      // Verifica el token usando el secreto
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Obtiene el usuario del token y lo añade al objeto request (sin la contraseña)
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Pasa al siguiente controlador
    } catch (error) {
      res.status(401).json({ message: 'No autorizado, el token falló' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};

module.exports = { protect };