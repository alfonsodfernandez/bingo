// routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const { createRoom, joinRoom, getRoomDetails, getUserRooms, leaveRoom, deleteRoom } = require('../controllers/roomController'); // <-- Actualiza la importación
const { protect } = require('../middleware/authMiddleware'); // Importamos al guardián

// Aplicamos el middleware 'protect'. Solo los usuarios logueados podrán acceder.
router.post('/', protect, createRoom);
router.get('/', protect, getUserRooms); // <-- Añade esta ruta (la raíz de /api/rooms)
router.post('/join', protect, joinRoom);
router.get('/details/:code', protect, getRoomDetails); // <-- Añade esta nueva ruta
router.post('/:id/leave', protect, leaveRoom);   // <-- AÑADE ESTA LÍNEA
router.delete('/:id', protect, deleteRoom);    // <-- AÑADE ESTA LÍNEA

module.exports = router;