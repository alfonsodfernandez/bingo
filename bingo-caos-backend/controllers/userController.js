// controllers/userController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Función para generar un token de autenticación (JWT)
const generateToken = (id) => {
  // El token se firma con un "secreto" que solo el servidor conoce
  // y tiene una fecha de caducidad de 30 días.
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Registrar un nuevo usuario
// @route   POST /api/users/register
const registerUser = async (req, res) => {
  const { username, password } = req.body;

  // Validación simple de entrada
  if (!username || !password) {
    return res.status(400).json({ message: 'Por favor, añade todos los campos' });
  }

  try {
    // Comprobar si el usuario ya existe en la base de datos
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    }

    // Crear el nuevo usuario en la base de datos
    // La contraseña se encripta automáticamente gracias al 'pre-save hook' en el modelo User
    const user = await User.create({
      username,
      password,
    });

    // Si el usuario se crea correctamente, se envía una respuesta con sus datos y un token
    if (user) {
      res.status(201).json({
        _id: user.id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Autenticar (iniciar sesión) un usuario
// @route   POST /api/users/login
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Buscar al usuario por su nombre de usuario
    const user = await User.findOne({ username });

    // Si se encuentra el usuario, comparar la contraseña enviada con la encriptada en la DB
    if (user && (await bcrypt.compare(password, user.password))) {
      // Si las contraseñas coinciden, se envía una respuesta con sus datos y un nuevo token
      res.json({
        _id: user.id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      // Si el usuario no existe o la contraseña es incorrecta
      res.status(401).json({ message: 'Credenciales inválidas' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// @desc    Obtener el perfil público de un usuario
// @route   GET /api/users/:id
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); // Excluimos la contraseña

        if (user) {
            res.json({
                _id: user._id,
                username: user.username,
                gamesPlayed: user.gamesPlayed,
                wins: user.wins,
                createdAt: user.createdAt
                // No enviamos la lista de amigos ni las solicitudes por privacidad
            });
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile, // <-- Añade la nueva función
};