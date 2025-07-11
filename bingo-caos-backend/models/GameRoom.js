// models/GameRoom.js

const mongoose = require('mongoose');

const GameRoomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Esto crea una referencia al modelo User
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  eventList: [{
    text: String,
    author: String
  }],
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // ¡NUEVOS CAMPOS!
  player_cards: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    card: [{ text: String }]
  }],
  markedEvents: [{
    text: String,
    author: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.models.GameRoom || mongoose.model('GameRoom', GameRoomSchema);