document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN INICIAL Y ELEMENTOS DEL DOM ---
    const token = localStorage.getItem('bingoToken');
    const user = JSON.parse(localStorage.getItem('bingoUser'));
    const API_URL = 'http://localhost:5000/api';

    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResultsContainer = document.getElementById('search-results');
    const requestsListContainer = document.getElementById('requests-list');
    const friendsListContainer = document.getElementById('friends-list');

    // --- 2. FUNCIONES DE RENDERIZADO Y LÓGICA ---

    const loadFriendsData = async () => {
        try {
            const res = await fetch(`${API_URL}/friends`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            // Renderizar solicitudes pendientes
            requestsListContainer.innerHTML = '';
            if (data.requests && data.requests.length > 0) {
                data.requests.forEach(reqUser => {
                    const card = document.createElement('div');
                    card.className = 'bg-gray-700 p-3 rounded-md flex justify-between items-center';
                    card.innerHTML = `<span>${reqUser.username}</span><div class="flex gap-2"><button data-action="accept" data-id="${reqUser._id}" class="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded">Aceptar</button><button data-action="reject" data-id="${reqUser._id}" class="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded">Rechazar</button></div>`;
                    requestsListContainer.appendChild(card);
                });
            } else {
                requestsListContainer.innerHTML = '<p class="text-gray-400">No tienes solicitudes pendientes.</p>';
            }

            // Renderizar lista de amigos
            friendsListContainer.innerHTML = '';
            if (data.friends && data.friends.length > 0) {
                data.friends.forEach(friend => {
                    const card = document.createElement('div');
                    card.className = 'bg-gray-700 p-3 rounded-md flex justify-between items-center';
                    // ¡CAMBIO CLAVE! El nombre ahora es un enlace
                    card.innerHTML = `
                        <a href="profile.html?id=${friend._id}" class="hover:text-cyan-400 font-semibold">${friend.username}</a>
                        <button data-action="remove" data-id="${friend._id}" class="bg-gray-600 hover:bg-gray-500 text-white text-sm font-bold py-1 px-3 rounded">Eliminar</button>
                    `;
                    friendsListContainer.appendChild(card);
                });
            } else {
                friendsListContainer.innerHTML = '<p class="text-gray-400">Aún no tienes amigos. ¡Busca a alguien!</p>';
            }

        } catch (error) {
            console.error('Error al cargar datos de amigos:', error);
        }
    };

    const handleSearch = async () => {
        const query = searchInput.value;
        if (query.length < 2) {
            searchResultsContainer.innerHTML = '<p class="text-gray-400">Introduce al menos 2 caracteres para buscar.</p>';
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/search?q=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const results = await res.json();

            searchResultsContainer.innerHTML = '';
            if (results.length === 0) {
                searchResultsContainer.innerHTML = '<p class="text-gray-400">No se encontraron jugadores con ese nombre.</p>';
            } else {
                results.forEach(foundUser => {
                    const userCard = document.createElement('div');
                    userCard.className = 'bg-gray-700 p-3 rounded-md flex justify-between items-center';
                    userCard.innerHTML = `
                        <span>${foundUser.username}</span>
                        <button data-id="${foundUser._id}" class="add-friend-btn bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded">+</button>
                    `;
                    searchResultsContainer.appendChild(userCard);
                });
            }
        } catch (error) {
            console.error('Error al buscar usuarios:', error);
            searchResultsContainer.innerHTML = '<p class="text-red-500">Error al realizar la búsqueda.</p>';
        }
    };

    // --- 3. EVENT LISTENERS ---

    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keyup', e => e.key === 'Enter' && handleSearch());
    }
    
    // Listener para los resultados de búsqueda (enviar solicitud)
    if(searchResultsContainer) {
        searchResultsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('add-friend-btn')) {
                const button = e.target;
                const recipientId = button.dataset.id;

                try {
                    const res = await fetch(`${API_URL}/friends/request`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ recipientId })
                    });

                    if (!res.ok) throw new Error('No se pudo enviar la solicitud');

                    // Cambiamos el botón para dar feedback visual
                    button.textContent = 'Enviada';
                    button.disabled = true;
                    button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                    button.classList.add('bg-gray-500', 'cursor-not-allowed');

                } catch (error) {
                    console.error('Error al enviar la solicitud:', error);
                    alert('No se pudo enviar la solicitud de amistad.');
                }
            }
        });
    }

    // Listener para las listas de solicitudes y amigos
    const handleListClick = async (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        if (!action || !id) return;
        
        let endpoint = '';
        let body = {};

        if (action === 'accept') {
            endpoint = '/friends/accept';
            body = { requesterId: id };
        } else if (action === 'reject' || action === 'remove') {
            endpoint = '/friends/reject';
            body = { otherUserId: id };
        }

        if (endpoint) {
            try {
                await fetch(`${API_URL}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(body)
                });
                loadFriendsData();
            } catch (error) {
                alert('Hubo un error al procesar la acción.');
            }
        }
    };

    if (requestsListContainer) {
        requestsListContainer.addEventListener('click', handleListClick);
    }
    if (friendsListContainer) {
        friendsListContainer.addEventListener('click', handleListClick);
    }

    // --- 4. CARGA INICIAL DE DATOS ---
    loadFriendsData();
});