let currentUser = null;

document.addEventListener("DOMContentLoaded", function () {
    setupEventListeners();
    loadMatches();
    restoreUserSession();
    loadCart();
});

function setupEventListeners() {
    // Boutons d'authentification
    document.getElementById('login-btn').addEventListener('click', () => {
        document.getElementById('auth-modal').style.display = 'block';
        switchForm('login');
    });

    document.getElementById('register-btn').addEventListener('click', () => {
        document.getElementById('auth-modal').style.display = 'block';
        switchForm('register');
    });

    document.getElementById('tickets-btn')?.addEventListener('click', () => {
        document.getElementById('tickets-modal').style.display = 'block';
        loadUserTickets();
    });

    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // Gestion des modales
    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Fermeture des modales en cliquant en dehors
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Gestionnaire d'ajout au panier
    document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
        const category = document.querySelector('input[name="category"]:checked')?.value;
        const quantity = document.getElementById('quantity').value;
        const matchId = document.getElementById('match-details').dataset.matchId;
        const matchInfo = JSON.parse(document.getElementById('match-details').dataset.matchInfo);

        if (!category) {
            showNotification('Veuillez sélectionner une catégorie', 'error');
            return;
        }

        addToCart(matchId, category, quantity, matchInfo);
    });
}

function restoreUserSession() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
    }
}

async function loadMatches() {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/matches/");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const matches = await response.json();
        displayMatches(matches);
    } catch (error) {
        console.error("Erreur lors du chargement des matchs:", error);
        document.getElementById('matches').innerHTML = `
            <p class="error-message">Une erreur est survenue lors du chargement des matchs.</p>
        `;
    }
}

function displayMatches(matches) {
    const container = document.getElementById("matches");
    container.innerHTML = '';

    // Séparer les matchs en deux catégories
    const upcomingMatches = matches.filter(match => !match.is_finished);
    const finishedMatches = matches.filter(match => match.is_finished);

    // Créer la structure HTML
    container.innerHTML = `
        <div class="matches-container">
            <section class="matches-section upcoming-matches">
                <h2 class="section-title">Prochains Matchs</h2>
                <div class="matches-grid" id="upcoming-matches"></div>
            </section>
            
            <div class="matches-divider">
                <div class="divider-line"></div>
                <span class="divider-text">Matchs terminés</span>
                <div class="divider-line"></div>
            </div>
            
            <section class="matches-section finished-matches">
                <div class="matches-grid" id="finished-matches"></div>
            </section>
        </div>
    `;

    // Fonction pour créer une carte de match
    function createMatchCard(match) {
        const matchDiv = document.createElement("div");
        matchDiv.className = "match-card";
        
        const date = new Date(match.start).toLocaleString('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short'
        });

        matchDiv.innerHTML = `
            <div class="match-header">
                <span class="team">${match.team_home_name || 'À déterminer'}</span>
                <span class="vs">VS</span>
                <span class="team">${match.team_away_name || 'À déterminer'}</span>
            </div>
            <div class="match-info">
                <p class="stadium">${match.stadium_name}</p>
                <p class="date">${date}</p>
                ${match.score ? `
                    <div class="match-result">
                        <p class="score">Score : ${match.score}</p>
                        <p class="status">${match.match_status}</p>
                    </div>
                ` : ''}
            </div>
        `;

        if (!match.is_finished) {
            const buyButton = document.createElement('button');
            buyButton.className = 'buy-ticket-btn';
            buyButton.textContent = 'Acheter des billets';
            buyButton.addEventListener('click', () => openPurchaseModal(match));
            matchDiv.appendChild(buyButton);
        }

        return matchDiv;
    }

    // Afficher les matchs à venir
    const upcomingContainer = document.getElementById('upcoming-matches');
    upcomingMatches.forEach(match => {
        upcomingContainer.appendChild(createMatchCard(match));
    });

    // Afficher les matchs terminés
    const finishedContainer = document.getElementById('finished-matches');
    finishedMatches.forEach(match => {
        finishedContainer.appendChild(createMatchCard(match));
    });
}

function openPurchaseModal(match) {
    if (!currentUser) {
        const authModal = document.getElementById('auth-modal');
        const loginForm = document.getElementById('login-form');
        
        const alertMessage = document.createElement('div');
        alertMessage.className = 'login-alert';
        alertMessage.innerHTML = `
            <p class="alert-text">
                <i class="alert-icon">⚠️</i> 
                Vous devez être connecté pour acheter des billets
            </p>
        `;
        
        const existingAlert = loginForm.querySelector('.login-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        loginForm.insertBefore(alertMessage, loginForm.firstChild);
        authModal.style.display = 'block';
        return;
    }

    const matchDetails = document.getElementById('match-details');
    matchDetails.dataset.matchId = match.id;
    matchDetails.dataset.matchInfo = JSON.stringify(match);

    const date = new Date(match.start).toLocaleString('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short'
    });

    matchDetails.innerHTML = `
        <div class="match-header">
            <span class="team">${match.team_home_name || 'À déterminer'}</span>
            <span class="vs">VS</span>
            <span class="team">${match.team_away_name || 'À déterminer'}</span>
        </div>
        <div class="match-info">
            <p class="stadium">${match.stadium_name}</p>
            <p class="date">${date}</p>
        </div>
    `;

    document.getElementById('purchase-modal').style.display = 'block';
}

async function loadUserTickets() {
    if (!currentUser) return;

    try {
        const response = await fetch("http://127.0.0.1:8000/api/tickets/", {
            credentials: "include",
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        if (!response.ok) throw new Error('Erreur lors du chargement des billets');

        const tickets = await response.json();
        displayTickets(tickets);
    } catch (error) {
        console.error("Erreur:", error);
        alert("Impossible de charger vos billets");
    }
}

function displayTickets(tickets) {
    const container = document.getElementById('tickets-container');
    container.innerHTML = '';

    if (tickets.length === 0) {
        container.innerHTML = '<p class="no-tickets">Vous n\'avez pas encore de billets</p>';
        return;
    }

    tickets.forEach(ticket => {
        const ticketElement = document.createElement('div');
        ticketElement.className = 'ticket-card';
        ticketElement.dataset.ticketId = ticket.id;
        
        const date = new Date(ticket.match.start).toLocaleString('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short'
        });

        ticketElement.innerHTML = `
            <div class="ticket-header">
                <h3>${ticket.match.team_home || 'À déterminer'} vs ${ticket.match.team_away || 'À déterminer'}</h3>
                <span class="ticket-category ${ticket.category.toLowerCase()}">${ticket.category}</span>
            </div>
            <div class="ticket-details">
                <p><strong>Stade:</strong> ${ticket.match.stadium}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Prix:</strong> ${ticket.price}€</p>
            </div>
            <div class="qr-code" id="qr-${ticket.id}"></div>
            <button onclick="handleTicket('${ticket.id}', this.closest('.ticket-card'))" class="view-ticket-btn">Voir le billet</button>
        `;

        container.appendChild(ticketElement);
        QRHandler.generateQRCode(ticket.qr_code_data, `qr-${ticket.id}`);
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchForm(form) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (form === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}