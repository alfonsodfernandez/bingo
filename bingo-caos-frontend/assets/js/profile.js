document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('bingoToken');
    const API_URL = 'https://bingo-nr15.onrender.com/api';

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (!token || !userId) {
        window.location.href = 'index.html';
        return;
    }

    const profileHeader = document.getElementById('profile-header');
    const profileContent = document.getElementById('profile-content');

    const fetchUserProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error('No se pudo cargar el perfil');
            }

            const profile = await res.json();
            
            profileHeader.textContent = `Perfil de ${profile.username}`;
            
            const winRate = profile.gamesPlayed > 0 ? ((profile.wins / profile.gamesPlayed) * 100).toFixed(1) : 0;
            const joinDate = new Date(profile.createdAt).toLocaleDateString('es-ES');

            profileContent.innerHTML = `
                <h2 class="text-4xl font-bold text-cyan-400">${profile.username}</h2>
                <p class="text-gray-400 mt-2">Miembro desde: ${joinDate}</p>
                <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <p class="text-gray-400 text-sm">Partidas Jugadas</p>
                        <p class="text-3xl font-bold">${profile.gamesPlayed}</p>
                    </div>
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <p class="text-gray-400 text-sm">Victorias</p>
                        <p class="text-3xl font-bold">${profile.wins}</p>
                    </div>
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <p class="text-gray-400 text-sm">Ratio de Victoria</p>
                        <p class="text-3xl font-bold">${winRate}%</p>
                    </div>
                </div>
            `;

        } catch (error) {
            profileContent.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    };

    fetchUserProfile();
});