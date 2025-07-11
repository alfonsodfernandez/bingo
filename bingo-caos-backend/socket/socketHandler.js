// socket/socketHandler.js
const GameRoom = require('../models/GameRoom');
const User = require('../models/User');

// Un mapa para almacenar el estado en vivo de cada sala (no se guarda en DB, es temporal)
const liveGameStates = new Map();

// Función para barajar un array (Algoritmo Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const socketHandler = (io) => {
  // Necesitamos un mapa para saber qué socket corresponde a cada usuario
  const userSocketMap = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Nuevo cliente conectado en sockets: ${socket.id}`);

    socket.on('joinRoom', async ({ roomCode, userId }) => { // El cliente ahora enviará su ID
      try {
        socket.join(roomCode);
        userSocketMap.set(userId, socket.id); // Guardamos la relación usuario -> socket
        console.log(`🙋‍♂️ Usuario ${userId} con socket ${socket.id} se unió a la sala ${roomCode}`);
        
        const room = await GameRoom.findOne({ roomCode }).populate('players', 'username').populate('host', 'username _id');
        if (room) {
            // Esto actualiza la lista de jugadores para todos
            io.to(roomCode).emit('updatePlayerList', room.players);
            // Esto actualiza el botón del anfitrión para todos
            io.to(roomCode).emit('roomStateUpdated', room);

            // --- LÓGICA MEJORADA PARA RECONEXIÓN! ---
            if (room.status === 'active') {
                const gameState = liveGameStates.get(roomCode);
                const myCardData = room.player_cards.find(pc => pc.userId.toString() === userId);

                // Si encontramos estado y un cartón para este jugador, le enviamos todo.
                if (gameState && myCardData) {
                    socket.emit('rejoinState', {
                        myCard: myCardData.card,
                        controlPanelEvents: room.eventList,
                        markedEvents: room.markedEvents,
                        gameState: gameState
                    });
                }
            }
        }
      } catch (error) {
        console.error(`Error al unirse a la sala ${roomCode}:`, error);
      }
    });

    // 2. EVENTO PARA AÑADIR UNA IDEA AL BINGO
    // Un jugador envía una nueva idea para el cartón.
    socket.on('addEventIdea', async ({ roomCode, ideaText, authorName }) => {
      try {
        const room = await GameRoom.findOne({ roomCode });
        if (room && room.status === 'waiting') { // Solo se pueden añadir ideas si el juego no ha empezado
          const newEvent = { text: ideaText, author: authorName };
          room.eventList.push(newEvent);
          await room.save();

          // ¡CAMBIO CLAVE!
          // Volvemos a popular los datos y enviamos el objeto de la sala completo
          const updatedRoom = await GameRoom.findOne({ roomCode }).populate('players', 'username').populate('host', 'username _id');

          // Usaremos un nuevo evento para evitar confusiones
          io.to(roomCode).emit('roomStateUpdated', updatedRoom);
          io.to(roomCode).emit('newGameEventMessage', {
              text: `"${ideaText}" fue añadido por ${authorName}.`
          });
        }
      } catch (error) {
        console.error('Error al añadir evento:', error);
      }
    });

    // ¡NUEVO EVENTO PARA INICIAR EL JUEGO!
    socket.on('startGame', async ({ roomCode, userId }) => {
      try {
        const room = await GameRoom.findOne({ roomCode }).populate('players', 'username');
        if (room && room.host.toString() === userId && room.status === 'waiting') {
          room.status = 'active';

          // ¡NUEVO! Inicializamos el estado en vivo del juego para esta sala
          const initialPlayerStats = room.players.map(p => ({
            id: p._id.toString(),
            username: p.username,
            checkedCount: 1, // El comodín empieza marcado
            hasLine: false,
            hasBingo: false,
          }));
          liveGameStates.set(roomCode, {
            eventLog: [],
            playerStats: initialPlayerStats,
          });

          const allEvents = room.eventList;
          room.player_cards = []; // Limpiamos los cartones antiguos

          // Generar y GUARDAR cartones para cada jugador
          room.players.forEach(player => {
            const shuffledEvents = shuffleArray([...allEvents]);
            const cardEvents = shuffledEvents.slice(0, 24).map(e => ({ text: e.text }));
            // Guardamos el cartón en la base de datos
            room.player_cards.push({ userId: player._id, card: cardEvents });

            const playerSocketId = userSocketMap.get(player._id.toString());
            if (playerSocketId) {
              io.to(playerSocketId).emit('yourCard', cardEvents);
            }
          });
          await room.save(); // ¡Guardamos todo!
          
          // Anunciamos a todos que el juego ha comenzado
          io.to(roomCode).emit('gameStarted', {
            controlPanelEvents: allEvents,
            initialStats: liveGameStates.get(roomCode)
          });
        }
      } catch (error) {
        console.error('Error al iniciar el juego:', error);
      }
    });

    // ¡CAMBIO CLAVE! Ahora enviamos también el usuario que marcó el evento
    socket.on('markEvent', async ({ roomCode, eventText, user }) => { // <-- Añadimos async
        try {
            // Guardamos el evento marcado en la base de datos
            await GameRoom.findOneAndUpdate(
                { roomCode },
                { $addToSet: { markedEvents: { text: eventText, author: user.username } } }
            );

            const gameState = liveGameStates.get(roomCode);
            if (gameState) {
                // Añadimos al log de eventos
                gameState.eventLog.unshift({ user: user.username, event: eventText, time: new Date() });
                // Lo mantenemos corto para no sobrecargar
                if (gameState.eventLog.length > 20) gameState.eventLog.pop();
            }
            // Reenviamos el evento marcado con el autor
            io.to(roomCode).emit('eventWasMarked', { eventText, author: user.username });
        } catch (error) {
            console.error("Error al marcar evento:", error);
        }
    });

    // ¡NUEVO! Evento para actualizar el contador de casillas marcadas
    socket.on('updateMyCheckedCount', ({ roomCode, userId, count }) => {
        const gameState = liveGameStates.get(roomCode);
        if (gameState) {
            const playerStat = gameState.playerStats.find(p => p.id === userId);
            if (playerStat) {
                playerStat.checkedCount = count;
                io.to(roomCode).emit('statsUpdated', gameState);
            }
        }
    });

    // ¡NUEVOS LISTENERS DE VICTORIA!
    socket.on('iGotLine', ({ roomCode, user }) => {
        // Cuando el cliente dice que tiene línea, confiamos y lo notificamos.
        // La lógica para no repetirlo ya está en el navegador del cliente.
        console.log(`[INFO] Notificando LÍNEA para ${user.username} en la sala ${roomCode}`);
        
        // Actualizamos el estado para que se refleje en las estadísticas
        const gameState = liveGameStates.get(roomCode);
        if (gameState) {
            const playerStat = gameState.playerStats.find(p => p.id === user.id);
            if (playerStat) {
                playerStat.hasLine = true;
            }
            io.to(roomCode).emit('statsUpdated', gameState);
        }
        
        io.to(roomCode).emit('playerGotLine', user);
        io.to(roomCode).emit('newGameEventMessage', { text: `🎉 ¡${user.username} ha cantado LÍNEA! 🎉` });
    });

    socket.on('iGotBingo', async ({ roomCode, user }) => {
        // Cuando el cliente dice que tiene BINGO, confiamos y terminamos la partida.
        try {
            const room = await GameRoom.findOne({ roomCode });
            // Comprobamos que la partida no haya terminado ya, para evitar ganadores múltiples
            if (room && room.status !== 'finished') {
                console.log(`[INFO] Notificando BINGO para ${user.username} en la sala ${roomCode}`);
                
                // Actualizamos la base de datos
                room.status = 'finished';
                room.winner = user.id;
                await room.save();
                
                // Actualizamos estadísticas de los jugadores
                await User.findByIdAndUpdate(user.id, { $inc: { wins: 1 } });
                await User.updateMany({ _id: { $in: room.players } }, { $inc: { gamesPlayed: 1 } });

                // Notificamos a todos
                io.to(roomCode).emit('newGameEventMessage', { text: `🏆 ¡BINGO! ${user.username} ha ganado la partida. 🏆` });
                io.to(roomCode).emit('gameOver', { winner: user });

                // Borramos la sala después de un tiempo
                setTimeout(async () => {
                    await GameRoom.findOneAndDelete({ roomCode });
                    liveGameStates.delete(roomCode);
                    console.log(`Sala ${roomCode} eliminada por fin de partida.`);
                }, 15000);
            }
        } catch (error) {
            console.error('Error al procesar el bingo:', error);
        }
    });

    // ¡NUEVO EVENTO PARA GESTIONAR EL CHAT!
    socket.on('sendChatMessage', ({ roomCode, message, user }) => {
        // El servidor retransmite el mensaje a todos en la sala.
        // Incluimos el objeto 'user' para saber quién lo envió.
        io.to(roomCode).emit('newChatMessage', { message, user });
    });

    socket.on('disconnect', () => {
        // Limpiar el mapa cuando un usuario se desconecta
        for (let [key, value] of userSocketMap.entries()) {
            if (value === socket.id) {
                userSocketMap.delete(key);
                break;
            }
        }
        console.log(`💨 Cliente de socket desconectado: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;