// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile } = require('../controllers/userController'); // <-- Actualiza la importación
const { searchUsers } = require('../controllers/friendsController'); // <-- Importa la función de búsqueda
const { protect } = require('../middleware/authMiddleware'); // <-- Importa el protector

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/search', protect, searchUsers); // <-- AÑADE ESTA RUTA PROTEGIDA
router.get('/:id', protect, getUserProfile); // <-- AÑADE ESTA RUTA AL FINAL

module.exports = router;