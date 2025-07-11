// 1. IMPORTACIONES
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const friendsRoutes = require('./routes/friendsRoutes');
const socketHandler = require('./socket/socketHandler');

// 2. INICIALIZACIÓN
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 4. CONEXIÓN A LA BASE DE DATOS (MÉTODO MEJORADO)
mongoose.connect(process.env.MONGO_URI, {
    // Estas opciones son las mejores prácticas para evitar advertencias de deprecación
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB Atlas'))
.catch((err) => console.error('❌ Error al conectar a MongoDB:', err));


// 5. RUTAS
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/friends', friendsRoutes);

app.get('/', (req, res) => {
  res.send('<h1>¡El servidor del Bingo del Caos Colectivo está funcionando!</h1>');
});

// 6. LÓGICA DE SOCKET.IO
socketHandler(io);

// 7. INICIAR EL SERVIDOR
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});