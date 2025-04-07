let cart = [];

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

    // Vérifier si le match n'est pas terminé
    const matchDate = new Date(matchInfo.start);
    if (matchDate < new Date() || matchInfo.is_finished) {
        showNotification("Ce match est terminé, vous ne pouvez plus acheter de billets", "error");
        return;
    }

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

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

function displayCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    cartItems.innerHTML = '';

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Votre panier est vide</p>';
        cartTotal.textContent = '0€';
        return;
    }

    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const matchDate = new Date(item.matchInfo.start);
        const isMatchValid = matchDate > new Date() && !item.matchInfo.is_finished;

        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'cart-item';
        cartItemDiv.innerHTML = `
            <div class="cart-item-info">
                <h3>${item.matchInfo.team_home_name || 'À déterminer'} vs ${item.matchInfo.team_away_name || 'À déterminer'}</h3>
                <p>${item.matchInfo.stadium_name}</p>
                <p>${new Date(item.matchInfo.start).toLocaleString('fr-FR')}</p>
                <p>Catégorie : ${item.category}</p>
                <p>Quantité : ${item.quantity}</p>
                <p>Prix unitaire : ${item.price}€</p>
                ${!isMatchValid ? '<p class="error-text">Ce match n\'est plus disponible</p>' : ''}
            </div>
            <div class="cart-item-actions">
                <p class="item-total">${itemTotal}€</p>
                <button onclick="removeFromCart(${index})" class="remove-btn">Supprimer</button>
            </div>
        `;
        cartItems.appendChild(cartItemDiv);

        // Si le match n'est plus valide, on le supprime automatiquement après un délai
        if (!isMatchValid) {
            setTimeout(() => {
                removeFromCart(index);
                showNotification("Un match expiré a été retiré de votre panier", "info");
            }, 3000);
        }
    });

    cartTotal.textContent = `${total}€`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    saveCart();
    displayCart();
    showNotification("Article retiré du panier", "info");
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        // Nettoyer le panier des matchs expirés au chargement
        cart = cart.filter(item => {
            const matchDate = new Date(item.matchInfo.start);
            return matchDate > new Date() && !item.matchInfo.is_finished;
        });
        updateCartCount();
        saveCart(); // Sauvegarder le panier nettoyé
    }
}

function clearCart() {
    cart = [];
    updateCartCount();
    saveCart();
}

async function checkout() {
    if (!currentUser) {
        showNotification("Veuillez vous connecter pour finaliser votre achat", "error");
        return;
    }

    if (cart.length === 0) {
        showNotification("Votre panier est vide", "error");
        return;
    }

    // Vérifier si tous les matchs sont toujours valides
    const invalidMatches = cart.filter(item => {
        const matchDate = new Date(item.matchInfo.start);
        return matchDate <= new Date() || item.matchInfo.is_finished;
    });

    if (invalidMatches.length > 0) {
        showNotification("Certains matchs ne sont plus disponibles. Veuillez vérifier votre panier.", "error");
        displayCart(); // Rafraîchir l'affichage du panier
        return;
    }

    try {
        const API_URL = 'http://127.0.0.1:8000';

        const tickets = cart.map(item => ({
            match_id: item.matchId,
            category: item.category,
            price: item.price,
            quantity: item.quantity
        }));

        // Envoi de chaque ticket individuellement
        const purchasedTickets = [];
        for (const ticket of tickets) {
            for (let i = 0; i < ticket.quantity; i++) {
                const response = await fetch(`${API_URL}/api/tickets/buy/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        match_id: ticket.match_id,
                        category: ticket.category,
                        price: ticket.price
                    })
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.message || "Erreur lors de la validation de la commande");
                }

                purchasedTickets.push(responseData.ticket);
            }
        }

        showNotification("Commande validée avec succès !", "success");
        clearCart();
        closeModal('cart-modal');
        loadUserTickets();

    } catch (error) {
        console.error('Erreur détaillée:', error);
        showNotification(`Erreur lors de la validation de la commande : ${error.message}`, "error");
    }
}

// Event Listeners
document.getElementById('cart-btn')?.addEventListener('click', () => {
    document.getElementById('cart-modal').style.display = 'block';
    displayCart();
});

document.getElementById('checkout-btn')?.addEventListener('click', checkout);