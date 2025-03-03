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
    if (!matches || matches.length === 0) {
        const container = document.getElementById("matches");
        container.innerHTML = '<p class="error-message">Aucun match disponible.</p>';
        return;
    }

    const container = document.getElementById("matches");
    container.innerHTML = '';

    // Séparer les matchs en deux catégories
    const upcomingMatches = matches.filter(match => !match.is_finished);
    const finishedMatches = matches.filter(match => match.is_finished);

    container.innerHTML = `
        <div class="matches-container">
            <section class="matches-section upcoming-matches">
                <h2 class="section-title">Prochains Matchs</h2>
                <div class="matches-grid" id="upcoming-matches"></div>
            </section>
            
            ${finishedMatches.length > 0 ? `
                <div class="matches-divider">
                    <div class="divider-line"></div>
                    <span class="divider-text">Matchs terminés</span>
                    <div class="divider-line"></div>
                </div>
                
                <section class="matches-section finished-matches">
                    <div class="matches-grid" id="finished-matches"></div>
                </section>
            ` : ''}
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
                ${match.is_finished ? `
                    <div class="match-result">
                        <p class="score">Score : ${match.score || '0 - 0'}</p>
                        <p class="status">${match.match_status}</p>
                    </div>
                ` : ''}
            </div>
            ${!match.is_finished ? `
                <button class="buy-ticket-btn" onclick="openPurchaseModal(${JSON.stringify(match).replace(/"/g, "'")})">
                    Acheter des billets
                </button>
            ` : ''}
        `;

        return matchDiv;
    }

    const upcomingContainer = document.getElementById('upcoming-matches');
    upcomingMatches.forEach(match => {
        upcomingContainer.appendChild(createMatchCard(match));
    });

    const finishedContainer = document.getElementById('finished-matches');
    if (finishedContainer) {
        finishedMatches.forEach(match => {
            finishedContainer.appendChild(createMatchCard(match));
        });
    }
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
    if (!currentUser) {
        console.log("Aucun utilisateur connecté");
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/tickets/", {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        // Ajout d'un log pour voir le statut de la réponse
        console.log("Statut de la réponse des tickets:", response.status);

        if (!response.ok) {
            // Log du contenu de l'erreur
            const errorText = await response.text();
            console.error("Erreur détaillée:", errorText);
            
            throw new Error(errorText || 'Erreur lors du chargement des billets');
        }

        const tickets = await response.json();
        
        // Log détaillé des billets
        console.log("Billets reçus:", tickets);

        if (tickets.length === 0) {
            console.log("Aucun billet trouvé pour cet utilisateur");
        }

        displayTickets(tickets);
    } catch (error) {
        console.error("Erreur lors du chargement des billets:", error);
        
        // Message d'erreur plus détaillé
        showNotification(`Impossible de charger vos billets : ${error.message}`, "error");
        
        const container = document.getElementById('tickets-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    Une erreur est survenue lors du chargement des billets. 
                    Détails : ${error.message}
                </div>
            `;
        }
    }
}

function displayTickets(tickets) {
    console.log("Début de displayTickets", tickets);
    const container = document.getElementById('tickets-container');
    
    if (!container) {
        console.error("Conteneur de tickets non trouvé");
        return;
    }

    container.innerHTML = '';

    if (!tickets || tickets.length === 0) {
        console.log("Aucun billet trouvé");
        container.innerHTML = '<p class="no-tickets">Vous n\'avez pas encore de billets</p>';
        return;
    }

    tickets.forEach(ticket => {
        console.log("Traitement du ticket:", ticket);

        const ticketElement = document.createElement('div');
        ticketElement.className = 'ticket-card';
        ticketElement.dataset.ticketId = ticket.id;  // Important : ajouter l'ID du ticket
        
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
            <button onclick="handleTicket('${ticket.id}', this.closest('.ticket-card'))" class="view-ticket-btn">
                Voir le billet
            </button>
        `;

        container.appendChild(ticketElement);
        
        // Génération du QR Code
        if (ticket.qr_code_data && typeof QRious !== 'undefined') {
            try {
                new QRious({
                    element: document.getElementById(`qr-${ticket.id}`),
                    value: ticket.qr_code_data,
                    size: 200,
                    level: 'H'
                });
            } catch (error) {
                console.error('Erreur lors de la génération du QR code:', error);
            }
        }
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

function handleTicket(ticketId, ticketContainer) {
    console.log("Début de handleTicket");
    console.log("ID du ticket:", ticketId);
    console.log("Conteneur du ticket:", ticketContainer);

    try {
        // Extraction des données du ticket
        const ticket = {
            id: ticketId,
            match: {
                team_home: ticketContainer.querySelector('.ticket-header h3')?.textContent.split('vs')[0]?.trim(),
                team_away: ticketContainer.querySelector('.ticket-header h3')?.textContent.split('vs')[1]?.trim(),
                stadium: ticketContainer.querySelector('.ticket-details p:nth-child(1)')?.textContent.replace('Stade:', '').trim(),
                start: ticketContainer.querySelector('.ticket-details p:nth-child(2)')?.textContent.replace('Date:', '').trim()
            },
            category: ticketContainer.querySelector('.ticket-category')?.textContent.trim(),
            price: parseFloat(ticketContainer.querySelector('.ticket-details p:nth-child(3)')?.textContent.replace('Prix:', '').replace('€', '').trim())
        };

        console.log("Ticket extrait:", ticket);

        // Création de la modale
        const modalContainer = document.createElement('div');
        modalContainer.className = 'ticket-view-modal';
        modalContainer.innerHTML = `
            <div class="ticket-view-content">
                <span class="close-ticket-view">&times;</span>
                <div class="ticket-view-header">
                    <h2>Détails du Billet</h2>
                </div>
                <div class="ticket-view-body">
                    <div class="ticket-match-info">
                        <div class="match-teams">
                            <span class="team">${ticket.match.team_home || 'Non défini'}</span>
                            <span class="vs">VS</span>
                            <span class="team">${ticket.match.team_away || 'Non défini'}</span>
                        </div>
                        <div class="match-details">
                            <p><strong>Stade :</strong> ${ticket.match.stadium || 'Non défini'}</p>
                            <p><strong>Date :</strong> ${ticket.match.start || 'Non définie'}</p>
                            <p><strong>Catégorie :</strong> ${ticket.category || 'Non définie'}</p>
                            <p><strong>Prix :</strong> ${ticket.price || 'Non défini'}€</p>
                        </div>
                    </div>
                    <div class="ticket-qr-code">
                        <div id="ticket-qr-container"></div>
                    </div>
                </div>
                <div class="ticket-view-actions">
                    <button id="download-ticket-btn">
                        <span class="download-icon">⬇️</span> Télécharger le billet
                    </button>
                </div>
            </div>
        `;

        // Ajouter des styles inline pour s'assurer que la modale est visible
        modalContainer.style.display = 'flex';
        modalContainer.style.opacity = '1';

        document.body.appendChild(modalContainer);

        // Génération du QR Code
        if (typeof QRious !== 'undefined') {
            new QRious({
                element: document.getElementById('ticket-qr-container'),
                value: ticket.id,
                size: 200,
                level: 'H'
            });
        } else {
            console.error('Bibliothèque QRious non chargée');
        }

        // Gestion de la fermeture de la modale
        const closeButton = modalContainer.querySelector('.close-ticket-view');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modalContainer);
        });

        // Gestion du téléchargement du billet
        const downloadButton = modalContainer.querySelector('#download-ticket-btn');
        downloadButton.addEventListener('click', () => {
            // Logique de téléchargement du billet
            console.log('Téléchargement du billet', ticket);
        });

    } catch (error) {
        console.error('Erreur détaillée:', error);
        alert(`Erreur de chargement du billet : ${error.message}`);
    }
}

