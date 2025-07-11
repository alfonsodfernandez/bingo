// routes/friendsRoutes.js
const express = require('express');
const router = express.Router();
const { 
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest,
    getMyFriendsAndRequests
} = require('../controllers/friendsController');
const { protect } = require('../middleware/authMiddleware');

// Todas las rutas están protegidas
router.get('/', protect, getMyFriendsAndRequests); // Ruta para obtener todo
router.post('/request', protect, sendFriendRequest);
router.post('/accept', protect, acceptFriendRequest);
router.post('/reject', protect, rejectFriendRequest);

module.exports = router;