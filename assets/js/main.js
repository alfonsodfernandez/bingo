document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    const loginErrorEl = document.getElementById('login-error');
    const registerErrorEl = document.getElementById('register-error');

    const API_URL = 'https://bingo-nr15.onrender.com/api'; // La URL base de nuestro backend

    // --- Lógica para alternar entre formularios ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // --- Lógica de Registro ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        
        try {
            const res = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Error en el registro');
            }

            // Si el registro es exitoso, guardamos los datos y redirigimos
            localStorage.setItem('bingoToken', data.token);
            localStorage.setItem('bingoUser', JSON.stringify({ id: data._id, username: data.username }));
            window.location.href = 'dashboard.html'; // Próxima página que crearemos

        } catch (err) {
            registerErrorEl.textContent = err.message;
            registerErrorEl.classList.remove('hidden');
        }
    });

    // --- Lógica de Inicio de Sesión ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
         try {
            const res = await fetch(`${API_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            // Guardamos los datos y redirigimos
            localStorage.setItem('bingoToken', data.token);
            localStorage.setItem('bingoUser', JSON.stringify({ id: data._id, username: data.username }));
            window.location.href = 'dashboard.html'; // Próxima página

        } catch (err) {
            loginErrorEl.textContent = err.message;
            loginErrorEl.classList.remove('hidden');
        }
    });
});