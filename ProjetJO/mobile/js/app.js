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

function addToCart(matchId, category, quantity, matchInfo) {
    // Vérification de la connexion
    if (!currentUser) {
        showNotification("Veuillez vous connecter pour ajouter des billets au panier", "error");
        return;
    }

    // Validation des données
    if (!matchId || !category || !quantity) {
        showNotification("Informations du billet incomplètes", "error");
        return;
    }

    // Calculer le prix en fonction de la catégorie
    const prices = {
        'Silver': 100,
        'Gold': 200,
        'Platinum': 300
    };

    // Validation de la catégorie
    if (!prices[category]) {
        showNotification("Catégorie de billet invalide", "error");
        return;
    }

    const cartItem = {
        matchId,
        category,
        quantity: parseInt(quantity),
        price: prices[category],
        matchInfo,
        addedAt: new Date().toISOString() // Pour tracer quand l'item a été ajouté
    };

    cart.push(cartItem);
    updateCartCount();
    saveCart();
    closeModal('purchase-modal');
    showNotification("Billets ajoutés au panier !", "success");
}

async function loadUserTickets() {
    if (!currentUser) {
        console.log("Aucun utilisateur connecté, impossible de charger les billets");
        return;
    }

    try {
        console.log("Tentative de chargement des billets pour l'utilisateur", currentUser.username);
        
        const response = await fetch("http://127.0.0.1:8000/api/tickets/", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken")
            }
        });

        console.log("Statut de la réponse:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Erreur serveur:", errorText);
            throw new Error("Erreur lors du chargement des billets");
        }

        const tickets = await response.json();
        console.log("Billets reçus:", tickets);
        displayTickets(tickets);
    } catch (error) {
        console.error("Erreur:", error);
        const container = document.getElementById('tickets-container');
        if (container) {
            container.innerHTML = '<p class="error-message">Impossible de charger vos billets. Veuillez réessayer plus tard.</p>';
        }
    }
}

function displayTickets(tickets) {
    const container = document.getElementById('tickets-container');
    
    if (!container) {
        console.error("Conteneur de billets non trouvé");
        return;
    }
    
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p class="no-tickets">Vous n\'avez pas encore de billets.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    tickets.forEach(ticket => {
        const ticketElement = document.createElement('div');
        ticketElement.className = 'ticket-card';
        
        const formattedDate = new Date(ticket.match.start).toLocaleString('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short'
        });
        
        // Assurez-vous que l'ID est bien nettoyé
        const cleanId = ticket.id.replace(/[^a-zA-Z0-9]/g, '');
        
        ticketElement.innerHTML = `
            <h3>${ticket.match.team_home} vs ${ticket.match.team_away}</h3>
            <div class="ticket-details">
                <p>Stade: ${ticket.match.stadium}</p>
                <p>Date: ${formattedDate}</p>
                <p>Prix: ${ticket.price}€</p>
                <p>Catégorie: <span class="ticket-category">${ticket.category}</span></p>
            </div>
            <div class="qr-code">
                <canvas id="qr-${cleanId}"></canvas>
            </div>
            <button class="view-ticket-btn" onclick="handleTicket('${ticket.id}', this.parentElement)">
                Voir le billet
            </button>
        `;
        
        container.appendChild(ticketElement);
        
        // Attendre que le DOM soit mis à jour
        setTimeout(() => {
            try {
                const qrElement = document.getElementById(`qr-${cleanId}`);
                if (qrElement) {
                    // Utiliser directement l'ID du ticket comme donnée du QR code
                    new QRious({
                        element: qrElement,
                        value: ticket.id, // Utiliser directement l'ID
                        size: 150,
                        level: 'H', // Haute correction d'erreur
                        background: 'white',
                        foreground: 'black',
                        padding: 10
                    });
                } else {
                    console.error(`Élément QR non trouvé pour le ticket ${ticket.id}`);
                }
            } catch (error) {
                console.error(`Erreur lors de la génération du QR code pour le ticket ${ticket.id}:`, error);
            }
        }, 100);
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