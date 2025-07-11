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

// 3. CONFIGURACIÓN DE CORS (UNIFICADA)
const whiteList = [process.env.CLIENT_URL]; // La URL de tu frontend desde Render
const corsOptions = {
  origin: function (origin, callback) {
    // Para depuración: Muestra en los logs de Render quién está llamando
    console.log('Petición CORS desde el origen:', origin);

    // Permitir peticiones de nuestra whitelist y peticiones sin origen (como Postman)
    if (!origin || whiteList.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Error de Cors: Origen no permitido'));
    }
  }
};

// 4. MIDDLEWARE
app.use(cors(corsOptions)); // Usamos la configuración unificada para Express
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 5. INICIALIZACIÓN DE SOCKET.IO
const io = new Server(server, {
  cors: corsOptions // Usamos LA MISMA configuración unificada para Socket.IO
});

// 6. CONEXIÓN A LA BASE DE DATOS
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB Atlas'))
.catch((err) => console.error('❌ Error al conectar a MongoDB:', err));

// 7. RUTAS
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/friends', friendsRoutes);

app.get('/', (req, res) => {
  res.send('<h1>¡El servidor del Bingo del Caos Colectivo está funcionando!</h1>');
});

// 8. LÓGICA DE SOCKET.IO
socketHandler(io);

// 9. INICIAR EL SERVIDOR
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});