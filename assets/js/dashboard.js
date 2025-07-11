document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('bingoToken');
    const user = JSON.parse(localStorage.getItem('bingoUser'));
    const API_URL = 'http://localhost:5000/api';

    // ---- Protección de la Ruta ----
    // Si no hay token, no se puede estar aquí. ¡Fuera!
    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }

    // ---- Mostrar Información del Usuario ----
    document.getElementById('username-display').textContent = user.username;

    // ---- Lógica de Logout ----
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('bingoToken');
        localStorage.removeItem('bingoUser');
        window.location.href = 'index.html';
    });

    // ---- Lógica para Crear Sala ----
    const createRoomBtn = document.getElementById('create-room-btn');
    createRoomBtn.addEventListener('click', async () => {
        try {
            const res = await fetch(`${API_URL}/rooms`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}` // ¡Enviamos el token para la autenticación!
                }
            });

            if (!res.ok) {
                throw new Error('No se pudo crear la sala');
            }

            const room = await res.json();
            // Redirigimos a la sala de juego, pasando el código en la URL
            window.location.href = `room.html?code=${room.roomCode}`;
        } catch (error) {
            alert(error.message);
        }
    });
    
    // ---- Lógica para Unirse a Sala ----
    const joinRoomForm = document.getElementById('join-room-form');
    joinRoomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomCode = document.getElementById('room-code-input').value.toUpperCase();

        if (!roomCode) {
            return alert('Por favor, introduce un código de sala');
        }

        try {
            const res = await fetch(`${API_URL}/rooms/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ roomCode })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'No se pudo unir a la sala');
            }
            
            // Redirigimos a la sala de juego
            window.location.href = `room.html?code=${roomCode}`;

        } catch (error) {
            alert(error.message);
        }
    });

    const myRoomsList = document.getElementById('my-rooms-list');

    const fetchMyRooms = async () => {
        try {
            const res = await fetch(`${API_URL}/rooms`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const rooms = await res.json();
            
            myRoomsList.innerHTML = ''; 
            if (rooms.length === 0) {
                myRoomsList.innerHTML = '<p class="text-gray-400">No perteneces a ninguna sala todavía.</p>';
            } else {
                rooms.forEach(room => {
                    const isHost = room.host.toString() === user.id; // Comprobamos si somos el anfitrión

                    const roomCard = document.createElement('div'); // Cambiamos de <a> a <div>
                    roomCard.className = 'block bg-gray-800 p-4 rounded-lg';
                    roomCard.innerHTML = `
                        <div class="flex justify-between items-center">
                            <a href="room.html?code=${room.roomCode}">
                                <h3 class="font-bold text-lg hover:text-cyan-400">${room.roomCode}</h3>
                                <p class="text-sm text-gray-400">Estado: ${room.status}</p>
                            </a>
                            <div class="flex gap-2">
                                <button data-action="leave" data-id="${room._id}" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-sm">Salir</button>
                                ${isHost ? `<button data-action="delete" data-id="${room._id}" class="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm">Borrar</button>` : ''}
                            </div>
                        </div>
                    `;
                    myRoomsList.appendChild(roomCard);
                });
            }
        } catch (error) {
            console.error("Error al cargar mis salas", error);
        }
    };

    // Añadimos un único event listener para toda la lista de salas
    myRoomsList.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const roomId = e.target.dataset.id;

        if (!action || !roomId) return;

        if (action === 'leave') {
            if (confirm('¿Seguro que quieres salir de esta sala?')) {
                try {
                    await fetch(`${API_URL}/rooms/${roomId}/leave`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    fetchMyRooms(); // Refrescamos la lista
                } catch (error) {
                    alert('Error al salir de la sala');
                }
            }
        }

        if (action === 'delete') {
            if (confirm('¿Seguro que quieres borrar esta sala para SIEMPRE? Esta acción no se puede deshacer.')) {
                 try {
                    await fetch(`${API_URL}/rooms/${roomId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    fetchMyRooms(); // Refrescamos la lista
                } catch (error) {
                    alert('Error al borrar la sala');
                }
            }
        }
    });

    fetchMyRooms();
});