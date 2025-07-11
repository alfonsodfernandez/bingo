document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN INICIAL ---
    const token = localStorage.getItem('bingoToken');
    const user = JSON.parse(localStorage.getItem('bingoUser'));

    // Obtener el código de la sala desde la URL (ej: room.html?code=XYZ)
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('code');

    // Protección: si no hay datos, no se puede estar aquí.
    if (!token || !user || !roomCode) {
        window.location.href = 'index.html'; // Corregido: Sin barra inicial
        return;
    }

    document.getElementById('room-code-display').textContent = roomCode;

    // --- 2. CONEXIÓN CON SOCKET.IO ---
    const socket = io('http://localhost:5000'); // Conecta al servidor de sockets

    const hostControls = document.getElementById('host-controls');
    const startGameBtn = document.getElementById('start-game-btn');

    let hasCalledLine = false; // Para notificar la línea solo una vez

    // === BLOQUE DE FUNCIONES DE RENDERIZADO Y LÓGICA ===
    const checkWinConditions = () => {
        const cells = Array.from(gameArea.querySelectorAll('div > div'));
        if (cells.length !== 25) return;
        const isMarked = (index) => cells[index].dataset.marked === "true";
        const lines = [
            [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
            [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
            [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
        ];
        const isBingo = cells.every(cell => cell.dataset.marked === "true");
        if (isBingo) {
            socket.emit('iGotBingo', { roomCode, user });
            return;
        }
        if (!hasCalledLine) {
            for (const line of lines) {
                if (line.every(isMarked)) {
                    hasCalledLine = true;
                    socket.emit('iGotLine', { roomCode, user });
                    break;
                }
            }
        }
    };

    const renderBingoCard = (cardEvents) => {
        gameArea.innerHTML = '';
        const cardGrid = document.createElement('div');
        cardGrid.className = 'grid grid-cols-5 gap-2';
        cardEvents.forEach((event, index) => {
            const cell = document.createElement('div');
            cell.className = 'bg-gray-700 aspect-square flex items-center justify-center text-center p-2 rounded-md text-xs';
            cell.textContent = event.text;
            cell.dataset.marked = "false";
            if (index === 12) {
                cell.classList.remove('bg-gray-700');
                cell.classList.add('bg-cyan-600', 'font-bold');
                cell.dataset.marked = "true";
            }
            cardGrid.appendChild(cell);
        });
        gameArea.appendChild(cardGrid);
    };

    const renderControlPanel = (eventList) => {
        controlPanelContainer.classList.remove('hidden');
        controlPanel.innerHTML = '';
        eventList.forEach(event => {
            const button = document.createElement('button');
            button.textContent = event.text;
            button.dataset.eventtext = event.text;
            button.className = 'w-full text-left bg-gray-600 hover:bg-gray-500 p-2 rounded-md text-sm transition';
            button.addEventListener('click', () => {
                socket.emit('markEvent', { roomCode, eventText: event.text, user });
            });
            controlPanel.appendChild(button);
        });
    };

    const renderStats = (gameState) => {
        if (!gameState || !gameState.playerStats) {
            // Si no hay datos de estadísticas, no hacemos nada.
            return;
        }
        contentStats.innerHTML = '';
        
        gameState.playerStats.forEach(p => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'flex justify-between items-center text-sm mb-2';

            // --- DEFENSA CONTRA DATOS CORRUPTOS ---
            // Comprobamos si el jugador tiene un nombre de usuario.
            if (p && p.username) {
                playerDiv.innerHTML = `
                    <span>${p.username}</span>
                    <div class="flex items-center gap-2">
                        <span class="font-bold">${p.checkedCount || 0} / 25</span>
                        <span title="Línea" class="${p.hasLine ? 'text-yellow-400' : 'text-gray-600'}">●</span>
                        <span title="Bingo" class="${p.hasBingo ? 'text-green-400' : 'text-gray-600'}">★</span>
                    </div>
                `;
            } else {
                // Si no tiene nombre, mostramos un error en la consola y en la UI para saberlo.
                console.error("Error: Se recibió un jugador sin nombre de usuario:", p);
                playerDiv.innerHTML = `<span>Error de datos</span>`;
            }
            contentStats.appendChild(playerDiv);
        });
    };

    const renderLog = (gameState) => {
        if (!gameState) return;
        contentLog.innerHTML = '';
        gameState.eventLog.forEach(log => {
            const logEntry = document.createElement('p');
            logEntry.className = 'text-xs text-gray-400 mb-1';
            logEntry.innerHTML = `<strong class="text-cyan-500">${log.user}</strong> marcó "${log.event}"`;
            contentLog.appendChild(logEntry);
        });
    };

    const updateHostControls = (roomData) => {
        if (roomData && user && roomData.host && roomData.host._id === user.id && roomData.status === 'waiting') {
            hostControls.classList.remove('hidden');
            if (roomData.eventList.length < 24) {
                startGameBtn.disabled = true;
                startGameBtn.textContent = `Se necesitan ${24 - roomData.eventList.length} ideas más`;
                startGameBtn.classList.add('cursor-not-allowed', 'bg-gray-500');
            } else {
                startGameBtn.disabled = false;
                startGameBtn.textContent = 'Iniciar Juego';
                startGameBtn.classList.remove('cursor-not-allowed', 'bg-gray-500');
            }
        } else {
            hostControls.classList.add('hidden');
        }
    };

    // NUEVA: renderEventList
    const renderEventList = (events) => {
        const eventListEl = document.getElementById('event-list');
        if (!eventListEl) return;
        eventListEl.innerHTML = '';
        if (events) {
            events.forEach(event => {
                const li = document.createElement('li');
                li.textContent = `${event.text} (por ${event.author})`;
                eventListEl.appendChild(li);
            });
        }
    };

    const renderGameState = (room) => {
        renderEventList(room.eventList);
        updateHostControls(room);
        if (room.status === 'active') {
            const myCardData = room.player_cards.find(pc => pc.userId === user.id);
            if (myCardData) {
                const cardWithFreebie = [...myCardData.card];
                cardWithFreebie.splice(12, 0, { text: "COMODÍN" });
                renderBingoCard(cardWithFreebie);
                const cells = gameArea.querySelectorAll('div > div');
                cells.forEach(cell => {
                    if (room.markedEvents.some(markedEvent => markedEvent.text === cell.textContent)) {
                        cell.classList.remove('bg-gray-700');
                        cell.classList.add('bg-cyan-600', 'font-bold');
                        cell.dataset.marked = "true";
                    }
                });
            }
            renderControlPanel(room.eventList);
            const controlPanelButtons = controlPanel.querySelectorAll('button');
            controlPanelButtons.forEach(button => {
                if (room.markedEvents.some(markedEvent => markedEvent.text === button.dataset.eventtext)) {
                    button.disabled = true;
                    button.classList.remove('bg-gray-600', 'hover:bg-gray-500');
                    button.classList.add('bg-green-800', 'cursor-not-allowed', 'line-through');
                }
            });
        }
    };

    // Modificamos fetchRoomDetails para usar la nueva función
    const fetchRoomDetails = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/rooms/details/${roomCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const room = await res.json();
            // Esta función solo se encarga de mostrar el botón de empezar si aplica
            updateHostControls(room);
        } catch (error) {
            console.error("No se pudieron obtener los detalles de la sala", error);
        }
    };
    fetchRoomDetails();
    
    // REEMPLAZA el listener 'updateEventList' con este nuevo 'roomStateUpdated'
    socket.on('roomStateUpdated', (updatedRoom) => {
        renderEventList(updatedRoom.eventList);
        updateHostControls(updatedRoom);
    });

    // Event listener para el botón de iniciar juego
    startGameBtn.addEventListener('click', () => {
        socket.emit('startGame', { roomCode, userId: user.id });
    });

    // Cuando la conexión es exitosa, nos unimos a la sala
    socket.on('connect', () => {
        console.log('Conectado al servidor con ID:', socket.id);
        // Ahora enviamos también nuestro ID de usuario
        socket.emit('joinRoom', { roomCode, userId: user.id });
    });

    // --- RENDERIZADO Y LÓGICA DEL JUEGO ---
    const gameArea = document.getElementById('game-area');
    const controlPanelContainer = document.getElementById('control-panel-container');
    const controlPanel = document.getElementById('control-panel');

    // --- MANEJO DE PESTAÑAS ---
    const tabStats = document.getElementById('tab-stats');
    const tabLog = document.getElementById('tab-log');
    const contentStats = document.getElementById('content-stats');
    const contentLog = document.getElementById('content-log');

    tabStats.addEventListener('click', () => {
        contentStats.classList.remove('hidden');
        contentLog.classList.add('hidden');
        tabStats.classList.add('border-cyan-400', 'text-white');
        tabLog.classList.remove('border-cyan-400', 'text-white');
        tabLog.classList.add('text-gray-400');
    });

    tabLog.addEventListener('click', () => {
        contentLog.classList.remove('hidden');
        contentStats.classList.add('hidden');
        tabLog.classList.add('border-cyan-400', 'text-white');
        tabStats.classList.remove('border-cyan-400', 'text-white');
        tabStats.classList.add('text-gray-400');
    });

    // --- RENDERIZADO DE DATOS DEL JUEGO ---
    
    // Escuchamos la lista de jugadores actualizada
    socket.on('updatePlayerList', (players) => {
        const playerListEl = document.getElementById('player-list');
        playerListEl.innerHTML = ''; // Limpiamos la lista
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = `- ${player.username}`;
            playerListEl.appendChild(li);
        });
    });

    // ¡NUEVA LÓGICA PARA RECIBIR EL CARTÓN!
    socket.on('yourCard', (cardEvents) => {
        gameArea.innerHTML = ''; // Limpiamos el mensaje de "esperando"
        
        const cardGrid = document.createElement('div');
        cardGrid.className = 'grid grid-cols-5 gap-2';

        // Insertamos los 24 eventos y el comodín central
        cardEvents.splice(12, 0, { text: "COMODÍN" }); 

        cardEvents.forEach((event, index) => {
            const cell = document.createElement('div');
            cell.className = 'bg-gray-700 aspect-square flex items-center justify-center text-center p-2 rounded-md text-xs';
            cell.textContent = event.text;
            cell.dataset.marked = "false"; // Inicializamos
            if (index === 12) { // El comodín
                cell.classList.remove('bg-gray-700');
                cell.classList.add('bg-cyan-600', 'font-bold');
                cell.dataset.marked = "true"; // El comodín empieza marcado
            }
            cardGrid.appendChild(cell);
        });
        gameArea.appendChild(cardGrid);
    });

    // Cuando el juego empieza...
    socket.on('gameStarted', ({ controlPanelEvents, initialStats }) => {
        document.getElementById('add-idea-form').classList.add('hidden');
        document.getElementById('host-controls').classList.add('hidden');
        
        // ¡Mostramos y construimos el tablero de control!
        controlPanelContainer.classList.remove('hidden');
        controlPanel.innerHTML = ''; // Limpiamos por si acaso
        
        controlPanelEvents.forEach(event => {
            const button = document.createElement('button');
            button.textContent = event.text;
            // Usamos un atributo 'data' para identificar fácilmente el botón
            button.dataset.eventtext = event.text;
            button.className = 'w-full text-left bg-gray-600 hover:bg-gray-500 p-2 rounded-md text-sm transition';
            
            button.addEventListener('click', () => {
                // Al hacer clic, emitimos el evento al servidor
                socket.emit('markEvent', { roomCode, eventText: event.text, user });
            });

            controlPanel.appendChild(button);
        });
        
        renderStats(initialStats);
        renderLog(initialStats);
    });

    // ¡NUEVO LISTENER PARA CUANDO UN EVENTO ES MARCADO!
    socket.on('eventWasMarked', ({ eventText, author }) => {
        // 1. Marcar en el tablero de control
        const button = controlPanel.querySelector(`[data-eventtext="${eventText}"]`);
        if (button && !button.disabled) {
            button.disabled = true;
            button.classList.remove('bg-gray-600', 'hover:bg-gray-500');
            button.classList.add('bg-green-800', 'cursor-not-allowed', 'line-through');
        }

        // 2. Marcar en nuestro cartón de bingo personal
        const cells = gameArea.querySelectorAll('div > div'); // Selecciona todas las celdas
        cells.forEach(cell => {
            if (cell.textContent === eventText) {
                cell.classList.remove('bg-gray-700');
                cell.classList.add('bg-cyan-600', 'font-bold');
                cell.dataset.marked = "true"; // Marcamos la celda como "tachada"
            }
        });
        
        // Después de marcar, actualizamos nuestro contador
        const markedCount = Array.from(gameArea.querySelectorAll('div > div')).filter(c => c.dataset.marked === 'true').length;
        socket.emit('updateMyCheckedCount', { roomCode, userId: user.id, count: markedCount });
        
        // Después de marcar, comprobamos si hemos ganado
        checkWinConditions();
    });

    // ¡NUEVO! El listener principal que actualiza todo
    socket.on('statsUpdated', (gameState) => {
        renderStats(gameState);
        renderLog(gameState);
    });

    // ¡NUEVOS LISTENERS DE NOTIFICACIONES!
    socket.on('playerGotLine', (winningUser) => {
        // Muestra una notificación simple. Podrías usar una librería para algo más vistoso.
        if (winningUser.id === user.id) {
            alert("¡Has cantado LÍNEA!");
        } else {
            alert(`¡${winningUser.username} ha cantado LÍNEA!`);
        }
    });

    socket.on('gameOver', ({ winner }) => {
        // Deshabilita todo
        controlPanel.style.pointerEvents = 'none';
        controlPanel.style.opacity = '0.5';

        // Muestra el ganador
        const gameArea = document.getElementById('game-area');
        gameArea.innerHTML = `
            <div class="text-center">
                <h2 class="text-4xl font-bold text-yellow-400 mb-4">¡BINGO!</h2>
                <p class="text-2xl">El ganador es</p>
                <p class="text-5xl font-extrabold text-cyan-400 mt-2">${winner.username}</p>
            </div>
        `;
    });

    // --- 4. ENVIAR EVENTOS AL SERVIDOR ---

    // Manejar el envío del formulario de ideas
    const addIdeaForm = document.getElementById('add-idea-form');
    addIdeaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ideaInput = document.getElementById('idea-input');
        const ideaText = ideaInput.value;

        if (ideaText) {
            // Emitimos un evento al servidor con los datos de la nueva idea
            socket.emit('addEventIdea', { 
                roomCode, 
                ideaText, 
                authorName: user.username 
            });
            ideaInput.value = ''; // Limpiamos el campo
        }
    });

    // --- MANEJO DEL CHAT ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    // Listener para el formulario de chat
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value;
        if (message) {
            // Enviamos el mensaje al servidor
            socket.emit('sendChatMessage', { roomCode, message, user });
            chatInput.value = ''; // Limpiamos el input
        }
    });

    // Listener para recibir nuevos mensajes del servidor
    socket.on('newChatMessage', ({ message, user: messageUser }) => {
        const messageElement = document.createElement('p');
        messageElement.className = 'text-sm mb-1';
        // Mensaje de chat normal
        messageElement.innerHTML = `<strong class="text-cyan-400">${messageUser.username}:</strong> ${message}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    // ¡NUEVO LISTENER para eventos del juego!
    socket.on('newGameEventMessage', ({ text }) => {
        const eventElement = document.createElement('p');
        // Mensaje de evento con estilo diferente (itálica y otro color)
        eventElement.className = 'text-sm mb-1 text-yellow-300 italic';
        eventElement.textContent = text;
        chatMessages.appendChild(eventElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    // ¡NUEVO LISTENER PARA RECONECTARSE!
    socket.on('rejoinState', ({ myCard, controlPanelEvents, markedEvents, gameState }) => {
        console.log("Recibido estado de reconexión.");

        // 1. Ocultar formularios de inicio
        document.getElementById('add-idea-form').classList.add('hidden');
        document.getElementById('host-controls').classList.add('hidden');
        gameArea.innerHTML = '';

        // 2. Renderizar el cartón personal
        const cardWithFreebie = [...myCard];
        cardWithFreebie.splice(12, 0, { text: "COMODÍN" });
        renderBingoCard(cardWithFreebie);

        // 3. Renderizar el tablero de control
        renderControlPanel(controlPanelEvents);

        // 4. Marcar las casillas y botones que ya estaban marcados
        const cells = gameArea.querySelectorAll('div > div');
        const controlPanelButtons = controlPanel.querySelectorAll('button');

        markedEvents.forEach(marked => {
            // Marcar en el cartón
            cells.forEach(cell => {
                if (cell.textContent === marked.text) {
                    cell.classList.remove('bg-gray-700');
                    cell.classList.add('bg-cyan-600', 'font-bold');
                    cell.dataset.marked = "true";
                }
            });
            // Marcar en el tablero de control
            controlPanelButtons.forEach(button => {
                if (button.dataset.eventtext === marked.text) {
                    button.disabled = true;
                    button.classList.remove('bg-gray-600', 'hover:bg-gray-500');
                    button.classList.add('bg-green-800', 'cursor-not-allowed', 'line-through');
                }
            });
        });

        // 5. Renderizar las estadísticas y el log
        renderStats(gameState);
        renderLog(gameState);
    });

});