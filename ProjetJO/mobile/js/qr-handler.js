class QRHandler {
    static async generateQRCode(ticketId, elementId) {
        try {
            return new QRious({
                element: document.getElementById(elementId),
                value: ticketId,
                size: 200,
                level: 'H',
                background: 'white',
                foreground: 'black',
                padding: 16
            });
        } catch (error) {
            console.error('Erreur lors de la génération du QR code:', error);
            throw error;
        }
    }

    static async createTicketImage(ticket) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 600;
        canvas.height = 800;
        
        try {
            // Fond blanc
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            // Configuration du titre
            ctx.fillStyle = '#1C1CAD';
            ctx.font = 'bold 30px Paris2024';
            ctx.textAlign = 'center';
            
            // Titre
            ctx.fillText('BILLET OFFICIEL - JO 2024', canvas.width / 2, 100);
            
            // Équipes
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.fillText(`${ticket.match.team_home} vs ${ticket.match.team_away}`, canvas.width / 2, 150);
            
            // Stade
            ctx.fillText(`Stade: ${ticket.match.stadium}`, canvas.width / 2, 200);
            
            // Date formatée
            const date = new Date(ticket.match.start).toLocaleString('fr-FR', {
                dateStyle: 'long',
                timeStyle: 'short'
            });
            ctx.fillText(`Date: ${date}`, canvas.width / 2, 250);
            
            // Catégorie et prix
            ctx.fillText(`Catégorie: ${ticket.category}`, canvas.width / 2, 300);
            ctx.fillText(`Prix: ${ticket.price}€`, canvas.width / 2, 350);
    
            // QR Code
            const qrCanvas = document.createElement('canvas');
            new QRious({
                element: qrCanvas,
                value: ticket.id,
                size: 200,
                level: 'H'
            });
            
            // Centrer le QR code
            ctx.drawImage(qrCanvas, (canvas.width - 200) / 2, 400, 200, 200);
            
            // Texte légal et informations
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('Ce billet est unique et ne peut être utilisé qu\'une seule fois.', canvas.width / 2, 650);
            ctx.fillText('Billet officiel des Jeux Olympiques Paris 2024', canvas.width / 2, 680);
            
            // ID du billet
            ctx.font = '12px Arial';
            ctx.fillText(`ID: ${ticket.id}`, canvas.width / 2, 710);
    
            return canvas;
        } catch (error) {
            console.error('Erreur lors de la création du ticket:', error);
            throw error;
        }
    }

    static downloadTicket(ticket) {
        try {
            // Validation de base
            if (!ticket || !ticket.id) {
                throw new Error('Données du ticket invalides');
            }

            // Récupérer la valeur du QR Code
            const qrContainer = document.getElementById('ticket-qr-container');
            if (!qrContainer) {
                throw new Error('Conteneur du QR Code non trouvé');
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 600;
            canvas.height = 800;
            
            // Fond blanc
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Styles de police
            ctx.fillStyle = '#1C1CAD';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            
            // Titre
            ctx.fillText('BILLET OFFICIEL - JO 2024', canvas.width / 2, 100);
            
            // Informations du match
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.fillText(`${ticket.match.team_home} vs ${ticket.match.team_away}`, canvas.width / 2, 150);
            ctx.fillText(`Stade: ${ticket.match.stadium}`, canvas.width / 2, 200);
            
            // Date formatée
            const date = new Date(ticket.match.start).toLocaleString('fr-FR', {
                dateStyle: 'long',
                timeStyle: 'short'
            });
            ctx.fillText(`Date: ${date}`, canvas.width / 2, 250);
            
            // Catégorie et prix
            ctx.fillText(`Catégorie: ${ticket.category}`, canvas.width / 2, 300);
            ctx.fillText(`Prix: ${ticket.price}€`, canvas.width / 2, 350);

            // QR Code
            const qrCanvas = document.createElement('canvas');
            new QRious({
                element: qrCanvas,
                value: ticket.id,
                size: 200,
                level: 'H'
            });
            
            // Dessiner le QR Code
            ctx.drawImage(qrCanvas, (canvas.width - 200) / 2, 400, 200, 200);
            
            // Texte légal
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('Ce billet est unique et ne peut être utilisé qu\'une seule fois.', canvas.width / 2, 650);
            ctx.fillText('Billet officiel des Jeux Olympiques Paris 2024', canvas.width / 2, 680);
            
            // ID du billet
            ctx.font = '12px Arial';
            ctx.fillText(`ID: ${ticket.id}`, canvas.width / 2, 710);

            // Téléchargement
            const link = document.createElement('a');
            link.download = `Ticket-${ticket.match.team_home}-${ticket.match.team_away}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            return true;
        } catch (error) {
            console.error('Erreur de téléchargement:', error);
            alert(`Impossible de télécharger le billet : ${error.message}`);
            return false;
        }
    }

    static showTicketModal(ticket) {
        console.log('Affichage du ticket:', ticket);
        
        const modalContainer = document.createElement('div');
        modalContainer.className = 'ticket-view-modal';
        modalContainer.innerHTML = `
            <div class="ticket-view-content">
                <span class="close-ticket-view">&times;</span>
                <div class="ticket-view-header">
                    <h2>Détails du Billet</h2>
                </div>
                <div class="ticket-view-body">
                    <div class="ticket-match-details">
                        <div class="match-teams">
                            <span class="team home">${ticket.match.team_home || 'À déterminer'}</span>
                            <span class="vs">VS</span>
                            <span class="team away">${ticket.match.team_away || 'À déterminer'}</span>
                        </div>
                        <div class="match-info">
                            <div class="info-row">
                                <span class="label">Stade</span>
                                <span class="value">${ticket.match.stadium || 'Non défini'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Date</span>
                                <span class="value">${ticket.match.start || 'Non définie'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Catégorie</span>
                                <span class="value category">${ticket.category || 'Non définie'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Prix</span>
                                <span class="value price">${ticket.price || 'Non défini'}€</span>
                            </div>
                        </div>
                    </div>
                    <div class="ticket-qr-code">
                        <div id="ticket-qr-container"></div>
                    </div>
                </div>
                <div class="ticket-view-actions">
                    <button id="download-ticket-btn">
                        <i>⬇️</i> Télécharger le billet
                    </button>
                </div>
            </div>
        `;
    
        document.body.appendChild(modalContainer);
    
        // Génération du QR Code
        try {
            new QRious({
                element: document.getElementById('ticket-qr-container'),
                value: ticket.id,
                size: 200,
                level: 'H'
            });
        } catch (error) {
            console.error('Erreur QR Code:', error);
            document.getElementById('ticket-qr-container').innerHTML = '<p>Erreur QR Code</p>';
        }
    
        // Gestion de la fermeture de la modale
        modalContainer.querySelector('.close-ticket-view').onclick = () => {
            document.body.removeChild(modalContainer);
        };
    
        // Gestion du téléchargement du billet
        modalContainer.querySelector('#download-ticket-btn').onclick = () => {
            console.log('Tentative de téléchargement avec le ticket:', ticket);
            
            // Passer explicitement un objet avec toutes les propriétés nécessaires
            this.downloadTicket({
                id: ticket.id,
                match: {
                    team_home: ticket.match.team_home || 'À déterminer',
                    team_away: ticket.match.team_away || 'À déterminer',
                    stadium: ticket.match.stadium || 'Non défini',
                    start: ticket.match.start || 'Non définie'
                },
                category: ticket.category || 'Non définie',
                price: ticket.price || 0
            });
        };
    }
    
    static downloadTicket(ticket) {
        try {
            console.log('Téléchargement du ticket:', ticket);
    
            // Validation de base
            if (!ticket || !ticket.id) {
                throw new Error('Données du ticket invalides');
            }
    
            // Création du canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 600;
            canvas.height = 800;
            
            // Fond blanc
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            // Configuration du titre
            ctx.fillStyle = '#1C1CAD';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            
            // Titre
            ctx.fillText('BILLET OFFICIEL - JO 2024', canvas.width / 2, 100);
            
            // Équipes
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.fillText(`${ticket.match.team_home} vs ${ticket.match.team_away}`, canvas.width / 2, 150);
            
            // Stade
            ctx.fillText(`Stade: ${ticket.match.stadium}`, canvas.width / 2, 200);
            
            // Date formatée
            ctx.fillText(`Date: ${ticket.match.start}`, canvas.width / 2, 250);
            
            // Catégorie et prix
            ctx.fillText(`Catégorie: ${ticket.category}`, canvas.width / 2, 300);
            ctx.fillText(`Prix: ${ticket.price}€`, canvas.width / 2, 350);
    
            // QR Code
            const qrCanvas = document.createElement('canvas');
            new QRious({
                element: qrCanvas,
                value: ticket.id,
                size: 200,
                level: 'H'
            });
            
            // Dessiner le QR Code
            ctx.drawImage(qrCanvas, (canvas.width - 200) / 2, 400, 200, 200);
            
            // Texte légal
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('Ce billet est unique et ne peut être utilisé qu\'une seule fois.', canvas.width / 2, 650);
            ctx.fillText('Billet officiel des Jeux Olympiques Paris 2024', canvas.width / 2, 680);
            
            // ID du billet
            ctx.font = '12px Arial';
            ctx.fillText(`ID: ${ticket.id}`, canvas.width / 2, 710);
    
            // Conversion du canvas en image
            const dataUrl = canvas.toDataURL('image/png');
    
            // Création du lien de téléchargement
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Billet-${ticket.match.team_home}-${ticket.match.team_away}.png`;
            
            // Ajout du lien au document
            document.body.appendChild(link);
            
            // Déclenchement du téléchargement
            link.click();
            
            // Suppression du lien
            document.body.removeChild(link);
    
            return true;
        } catch (error) {
            console.error('Erreur de téléchargement:', error);
            alert(`Impossible de télécharger le billet : ${error.message}`);
            return false;
        }
    }
}

// Fonction utilitaire pour extraire les données du ticket
function extractTicketData(ticketContainer) {
    if (!ticketContainer) {
        throw new Error('Conteneur de ticket non trouvé');
    }

    return {
        id: ticketContainer.dataset.ticketId,
        match: {
            team_home: ticketContainer.querySelector('.ticket-header h3')?.textContent.split(' vs ')[0]?.trim(),
            team_away: ticketContainer.querySelector('.ticket-header h3')?.textContent.split(' vs ')[1]?.trim(),
            stadium: ticketContainer.querySelector('.ticket-details p:nth-child(1)')?.textContent.split(': ')[1]?.trim(),
            start: ticketContainer.querySelector('.ticket-details p:nth-child(2)')?.textContent.split(': ')[1]?.trim()
        },
        category: ticketContainer.querySelector('.ticket-category')?.textContent.trim(),
        price: parseFloat(ticketContainer.querySelector('.ticket-details p:nth-child(3)')?.textContent.split(': ')[1]?.trim()),
    };
}

function handleTicket(ticketId, ticketContainer) {
    try {
        // Log des informations de débogage
        console.log("ID du ticket:", ticketId);
        console.log("Conteneur du ticket:", ticketContainer);

        // Vérification des sélecteurs
        const teamElements = ticketContainer.querySelectorAll('.ticket-header h3');
        console.log("Éléments d'équipe:", teamElements);

        if (!ticketContainer) {
            console.error('Conteneur de ticket non trouvé');
            throw new Error('Conteneur de ticket manquant');
        }

        // Extraction détaillée des données
        const teamText = ticketContainer.querySelector('.ticket-header h3')?.textContent || '';
        console.log("Texte de l'équipe:", teamText);

        const [teamHome, teamAway] = teamText.split(' vs ').map(team => team.trim());
        
        const ticket = {
            id: ticketId,
            match: {
                team_home: teamHome,
                team_away: teamAway,
                stadium: ticketContainer.querySelector('.ticket-details p:nth-child(1)')?.textContent.replace('Stade:', '').trim(),
                start: ticketContainer.querySelector('.ticket-details p:nth-child(2)')?.textContent.replace('Date:', '').trim()
            },
            category: ticketContainer.querySelector('.ticket-category')?.textContent.trim(),
            price: parseFloat(ticketContainer.querySelector('.ticket-details p:nth-child(3)')?.textContent.replace('Prix:', '').replace('€', '').trim())
        };

        // Log du ticket extrait
        console.log("Ticket extrait:", ticket);

        // Vérification des données
        if (!ticket.id) {
            throw new Error('ID de ticket invalide');
        }

        // Appeler la méthode de QRHandler pour afficher le ticket
        QRHandler.showTicketModal(ticket);

    } catch (error) {
        console.error('Erreur détaillée lors du traitement du ticket:', error);
        
        // Message d'erreur plus informatif
        alert(`Erreur de chargement du billet : ${error.message}. 
Veuillez vérifier :
- Êtes-vous connecté ?
- Le billet existe-t-il toujours ?
- Y a-t-il un problème de chargement des données ?`);
    }
}

// Export des fonctions et de la classe si nécessaire
export { QRHandler, handleTicket, extractTicketData };