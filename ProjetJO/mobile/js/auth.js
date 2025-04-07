function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/login/', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
            updateAuthUI();
            closeModal('auth-modal');
            loadMatches();
            // Charger le panier si existant
            loadCart();
        } else {
            alert(data.message || "Erreur lors de la connexion");
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la connexion');
    }
}

async function handleRegister() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/register/', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
            switchForm('login');
        } else {
            alert(data.message || "Erreur lors de l'inscription");
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'inscription');
    }
}

async function handleLogout() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/logout/', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        if (response.ok) {
            currentUser = null;
            localStorage.removeItem('user');
            clearCart();
            updateAuthUI();
            loadMatches();
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la déconnexion');
    }
}

function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const ticketsBtn = document.getElementById('tickets-btn');
    const cartBtn = document.getElementById('cart-btn');
    const username = document.getElementById('username');

    if (currentUser) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        ticketsBtn.style.display = 'inline-block';
        cartBtn.style.display = 'inline-block';
        username.textContent = currentUser.username;
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
        ticketsBtn.style.display = 'none';
        cartBtn.style.display = 'none';
    }
}