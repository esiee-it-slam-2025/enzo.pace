let cart = [];

function addToCart(matchId, category, quantity, matchInfo) {
    if (!currentUser) {
        showNotification("Veuillez vous connecter pour ajouter des billets au panier", "error");
        return;
    }

    if (!matchId || !category || !quantity) {
        showNotification("Informations du billet incomplètes", "error");
        return;
    }

    if (matchInfo.is_finished) {
        showNotification("Ce match est terminé, vous ne pouvez plus acheter de billets", "error");
        return;
    }

    const prices = {
        'Silver': 100,
        'Gold': 200,
        'Platinum': 300
    };

    if (!prices[category]) {
        showNotification("Catégorie de billet invalide", "error");
        return;
    }

    const cartItem = {
        matchId,
        category,
        quantity: parseInt(quantity),
        price: prices[category],
        matchInfo
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
            </div>
            <div class="cart-item-actions">
                <p class="item-total">${itemTotal}€</p>
                <button onclick="removeFromCart(${index})" class="remove-btn">Supprimer</button>
            </div>
        `;
        cartItems.appendChild(cartItemDiv);
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
        cart = cart.filter(item => !item.matchInfo.is_finished);
        updateCartCount();
        saveCart();
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

    try {
        // Parcourir chaque ticket dans le panier
        for (const item of cart) {
            for (let i = 0; i < item.quantity; i++) {
                const response = await fetch('http://127.0.0.1:8000/api/tickets/buy/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        match_id: item.matchId,
                        category: item.category,
                        price: item.price
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || "Erreur lors de l'achat");
                }
            }
        }

        showNotification("Achat effectué avec succès !", "success");
        clearCart();
        closeModal('cart-modal');
        
        // Recharger les billets après l'achat
        await loadUserTickets();

    } catch (error) {
        console.error('Erreur lors de l\'achat:', error);
        showNotification(error.message || "Erreur lors de l'achat", "error");
    }
}

document.getElementById('cart-btn')?.addEventListener('click', () => {
    document.getElementById('cart-modal').style.display = 'block';
    displayCart();
});

document.getElementById('checkout-btn')?.addEventListener('click', checkout);