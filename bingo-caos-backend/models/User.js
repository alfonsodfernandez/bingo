// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'El nombre de usuario es obligatorio'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  // --- ¡NUEVOS CAMPOS PARA AMIGOS! ---
  friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
  }],
  sentFriendRequests: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
  }],
  receivedFriendRequests: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
  }]
}, {
  timestamps: true // Añade automáticamente los campos createdAt y updatedAt
});

// Encriptar la contraseña antes de guardar el documento
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);