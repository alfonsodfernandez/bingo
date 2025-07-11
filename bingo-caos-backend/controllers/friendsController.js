// controllers/friendsController.js
const User = require('../models/User');

// @desc    Buscar usuarios por nombre
// @route   GET /api/users/search?q=...
const searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json([]);
        }
        // Busca usuarios cuyo nombre de usuario contenga el texto de búsqueda (sin ser sensible a mayúsculas)
        // y que no sean el propio usuario que realiza la búsqueda.
        const users = await User.find({
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.user.id }
        }).select('username'); // Solo devolvemos el nombre de usuario

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor al buscar usuarios' });
    }
};

// @desc    Enviar una solicitud de amistad
// @route   POST /api/friends/request
const sendFriendRequest = async (req, res) => {
    const { recipientId } = req.body; // El ID del usuario al que enviamos la solicitud

    try {
        // Añadir el ID del destinatario a la lista de solicitudes enviadas del solicitante
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { sentFriendRequests: recipientId } });
        // Añadir el ID del solicitante a la lista de solicitudes recibidas del destinatario
        await User.findByIdAndUpdate(recipientId, { $addToSet: { receivedFriendRequests: req.user.id } });

        res.status(200).json({ message: 'Solicitud de amistad enviada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al enviar la solicitud' });
    }
};

// @desc    Aceptar una solicitud de amistad
// @route   POST /api/friends/accept
const acceptFriendRequest = async (req, res) => {
    const { requesterId } = req.body; // El ID del usuario que nos envió la solicitud

    try {
        // 1. Añadirse mutuamente a las listas de amigos
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { friends: requesterId } });
        await User.findByIdAndUpdate(requesterId, { $addToSet: { friends: req.user.id } });

        // 2. Limpiar las solicitudes de ambas partes
        await User.findByIdAndUpdate(req.user.id, { $pull: { receivedFriendRequests: requesterId } });
        await User.findByIdAndUpdate(requesterId, { $pull: { sentFriendRequests: req.user.id } });

        res.status(200).json({ message: 'Amistad aceptada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al aceptar la solicitud' });
    }
};

// @desc    Rechazar o cancelar una solicitud de amistad
// @route   POST /api/friends/reject
const rejectFriendRequest = async (req, res) => {
    const { otherUserId } = req.body; // El ID del otro usuario implicado

    try {
        // Simplemente limpiamos las solicitudes de ambas partes
        await User.findByIdAndUpdate(req.user.id, { 
            $pull: { receivedFriendRequests: otherUserId, sentFriendRequests: otherUserId } 
        });
        await User.findByIdAndUpdate(otherUserId, { 
            $pull: { receivedFriendRequests: req.user.id, sentFriendRequests: req.user.id } 
        });

        res.status(200).json({ message: 'Solicitud rechazada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al rechazar la solicitud' });
    }
};

// @desc    Obtener amigos y solicitudes pendientes del usuario actual
// @route   GET /api/friends
const getMyFriendsAndRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('friends', 'username')
            .populate('receivedFriendRequests', 'username');
        
        res.json({
            friends: user.friends,
            requests: user.receivedFriendRequests
        });
    } catch (error) {
         res.status(500).json({ message: 'Error al obtener los datos de amigos' });
    }
};

module.exports = {
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getMyFriendsAndRequests,
};