// controllers/roomController.js
const GameRoom = require('../models/GameRoom');

// Función para generar un código de sala aleatorio y corto
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const createRoom = async (req, res) => {
  try {
    const newRoom = await GameRoom.create({
      roomCode: generateRoomCode(),
      host: req.user._id, // req.user es añadido por nuestro middleware 'protect'
      players: [req.user._id],
    });
    res.status(201).json(newRoom);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la sala', error: error.message });
  }
};

const joinRoom = async (req, res) => {
    const { roomCode } = req.body;
  
    if (!roomCode) {
      return res.status(400).json({ message: 'Se requiere un código de sala' });
    }
  
    try {
      const room = await GameRoom.findOne({ roomCode: roomCode.toUpperCase() });
  
      if (!room) {
        return res.status(404).json({ message: 'Sala no encontrada' });
      }
  
      // Añadir jugador si no está ya en la sala
      if (!room.players.includes(req.user._id)) {
        room.players.push(req.user._id);
        await room.save();
      }
      
      const populatedRoom = await GameRoom.findById(room._id).populate('host players', 'username');
      res.status(200).json(populatedRoom);
  
    } catch (error) {
      res.status(500).json({ message: 'Error al unirse a la sala', error: error.message });
    }
  };

const getRoomDetails = async (req, res) => {
    try {
        const room = await GameRoom.findOne({ roomCode: req.params.code.toUpperCase() })
                                  .populate('host', 'username _id') // <-- El cambio está aquí
                                  .populate('players', 'username');
        if (!room) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
};

const getUserRooms = async (req, res) => {
    try {
        const rooms = await GameRoom.find({ players: req.user._id }).sort({ updatedAt: -1 });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las salas' });
    }
};

const leaveRoom = async (req, res) => {
    try {
        const room = await GameRoom.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }

        // Quita al usuario del array de jugadores
        room.players.pull(req.user._id);

        // Si la sala se queda vacía, la borramos
        if (room.players.length === 0) {
            await GameRoom.findByIdAndDelete(req.params.id);
            return res.status(200).json({ message: 'Has salido y la sala ha sido eliminada por estar vacía' });
        }
        
        // Si el que se va es el anfitrión, asignamos al siguiente jugador como nuevo anfitrión
        if (room.host.toString() === req.user._id.toString()) {
            room.host = room.players[0]; 
        }

        await room.save();
        res.status(200).json({ message: 'Has salido de la sala' });

    } catch (error) {
        res.status(500).json({ message: 'Error al salir de la sala' });
    }
};

const deleteRoom = async (req, res) => {
    try {
        const room = await GameRoom.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }

        // Verificación de seguridad: solo el anfitrión puede borrar la sala
        if (room.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'No tienes permiso para borrar esta sala' });
        }

        await GameRoom.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Sala eliminada correctamente' });

    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la sala' });
    }
};

// Actualiza la línea de exports al final del archivo
module.exports = {
  createRoom,
  joinRoom,
  getRoomDetails,
  getUserRooms,
  leaveRoom,
  deleteRoom
};