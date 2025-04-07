class QRHandler {
    static async generateQRCode(data, elementId) {
        return new QRious({
            element: document.getElementById(elementId),
            value: data,
            size: 200,
            level: 'H', // Haute correction d'erreur
            background: 'white',
            foreground: 'black',
            padding: 16
        });
    }

    static async createTicketImage(ticket) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Taille du canvas
        canvas.width = 600;
        canvas.height = 800;
        
        // Fond blanc
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Style du titre
        ctx.fillStyle = '#1C1CAD';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        
        // Titre
        ctx.fillText('BILLET OFFICIEL - JO 2024', canvas.width / 2, 100);
        
        // Informations du match
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        const teams = `${ticket.match.team_home || 'À déterminer'} vs ${ticket.match.team_away || 'À déterminer'}`;
        ctx.fillText(teams, canvas.width / 2, 150);
        
        // Stade et date
        const date = new Date(ticket.match.start).toLocaleString('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short'
        });
        ctx.fillText(`Stade: ${ticket.match.stadium}`, canvas.width / 2, 200);
        ctx.fillText(`Date: ${date}`, canvas.width / 2, 250);
        
        // Catégorie et prix
        ctx.fillText(`Catégorie: ${ticket.category}`, canvas.width / 2, 300);
        ctx.fillText(`Prix: ${ticket.price}€`, canvas.width / 2, 350);

        // Générer le QR Code - SIMPLIFIÉ : on utilise seulement l'ID du ticket
        const qrCanvas = document.createElement('canvas');
        const qrData = ticket.id; // Utiliser seulement l'ID du ticket
        new QRious({
            element: qrCanvas,
            value: qrData,
            size: 250,
            level: 'H'
        });

        // Dessiner le QR Code
        ctx.drawImage(qrCanvas, (canvas.width - 250) / 2, 400, 250, 250);
        
        // Informations légales
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Ce billet est unique et ne peut être utilisé qu\'une seule fois.', canvas.width / 2, 700);
        ctx.fillText('Billet officiel des Jeux Olympiques Paris 2024', canvas.width / 2, 730);
        
        // ID du billet
        ctx.font = '12px Arial';
        ctx.fillText(`ID: ${ticket.id}`, canvas.width / 2, 760);

        return canvas;
    }

    static async downloadTicket(ticketId, ticket) {
        const canvas = await this.createTicketImage(ticket);
        
        const link = document.createElement('a');
        link.download = `JO2024-Ticket-${ticketId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    static async showTicketModal(ticket) {
        console.log('Affichage du ticket:', ticket);
    
        // Créer le modal de visualisation de billet
        const modalContainer = document.createElement('div');
        modalContainer.className = 'ticket-view-modal';
        modalContainer.innerHTML = `
            <div class="ticket-view-content">
                <span class="close-ticket-view">&times;</span>
                <div class="ticket-view-header">
                    <h2>Billet Olympiques Paris 2024</h2>
                </div>
                <div class="ticket-view-body">
                    <div class="ticket-match-info">
                        <div class="match-teams">
                            <span class="team">${ticket.match.team_home}</span>
                            <span class="vs">VS</span>
                            <span class="team">${ticket.match.team_away}</span>
                        </div>
                        <div class="match-details">
                            <p><strong>Stade :</strong> ${ticket.match.stadium}</p>
                            <p><strong>Date :</strong> ${new Date(ticket.match.start).toLocaleString('fr-FR')}</p>
                            <p><strong>Catégorie :</strong> <span class="ticket-category">${ticket.category}</span></p>
                            <p><strong>Prix :</strong> ${ticket.price}€</p>
                        </div>
                    </div>
                    <div class="ticket-qr-code">
                        <canvas id="ticket-qr-canvas" width="250" height="250"></canvas>
                    </div>
                </div>
                <div class="ticket-view-actions">
                    <button id="download-ticket-btn">
                        <span class="download-icon">⬇️</span> Télécharger le billet
                    </button>
                </div>
            </div>
        `;
    
        // Ajouter des styles dynamiques
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .ticket-view-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
    
            .ticket-view-content {
                background-color: white;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                position: relative;
            }
    
            .ticket-view-header {
                background-color: #1C1CAD;
                color: white;
                padding: 15px;
                text-align: center;
                border-top-left-radius: 12px;
                border-top-right-radius: 12px;
            }
    
            .ticket-view-body {
                display: flex;
                flex-direction: column;
                padding: 20px;
                gap: 20px;
            }
    
            .ticket-match-info {
                flex: 1;
            }
    
            .match-teams {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #eee;
                padding-bottom: 10px;
            }
    
            .match-teams .team {
                font-weight: bold;
                font-size: 1.2em;
            }
    
            .match-teams .vs {
                color: #FF2C55;
                font-weight: bold;
            }
    
            .match-details p {
                margin-bottom: 10px;
                color: #333;
            }
    
            .ticket-category {
                font-weight: bold;
                color: #1C1CAD;
            }
    
            .ticket-qr-code {
                display: flex;
                justify-content: center;
                align-items: center;
                background-color: #f4f4f4;
                padding: 20px;
                border-radius: 8px;
            }
    
            .ticket-view-actions {
                padding: 15px;
                text-align: center;
                border-top: 1px solid #eee;
            }
    
            #download-ticket-btn {
                background-color: #1C1CAD;
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                width: 100%;
                transition: background-color 0.3s ease;
            }
    
            #download-ticket-btn:hover {
                background-color: #1515a0;
            }
    
            .close-ticket-view {
                position: absolute;
                top: 15px;
                right: 15px;
                font-size: 24px;
                color: white;
                cursor: pointer;
                z-index: 10;
            }
        `;
    
        document.head.appendChild(styleElement);
        document.body.appendChild(modalContainer);
    
        // Générer le QR Code
        const qrCanvas = document.getElementById('ticket-qr-canvas');
        console.log('Génération du QR code avec ID:', ticket.id);
    
        try {
            new QRious({
                element: qrCanvas,
                value: ticket.id, // Utiliser uniquement l'ID du ticket
                size: 250,
                level: 'H'
            });
        } catch (error) {
            console.error('Erreur lors de la génération du QR Code:', error);
            const qrContainer = qrCanvas.parentElement;
            qrContainer.innerHTML = '<p>Impossible de générer le QR Code</p>';
        }
    
        // Fermeture du modal
        const closeBtn = modalContainer.querySelector('.close-ticket-view');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modalContainer);
            document.head.removeChild(styleElement);
        });
    
        // Bouton de téléchargement
        const downloadBtn = modalContainer.querySelector('#download-ticket-btn');
        downloadBtn.addEventListener('click', () => {
            this.downloadTicket(ticket.id, ticket);
        });
    }
}

// Fonction globale pour afficher les détails d'un ticket
function handleTicket(ticketId, ticketElement) {
    console.log('handleTicket appelé', ticketId, ticketElement);
    
    try {
        // Extraire les informations du ticket à partir du DOM
        const ticket = {
            id: ticketId,
            match: {
                team_home: ticketElement.querySelector('h3').textContent.split(' vs ')[0],
                team_away: ticketElement.querySelector('h3').textContent.split(' vs ')[1],
                stadium: ticketElement.querySelector('.ticket-details p:nth-child(1)').textContent.split(': ')[1],
                start: ticketElement.querySelector('.ticket-details p:nth-child(2)').textContent.split(': ')[1]
            },
            category: ticketElement.querySelector('.ticket-category').textContent,
            price: ticketElement.querySelector('.ticket-details p:nth-child(3)').textContent.split(': ')[1]
        };

        console.log('Ticket à afficher:', ticket);
        QRHandler.showTicketModal(ticket);
    } catch (error) {
        console.error('Erreur lors de la récupération des informations du ticket:', error);
        alert('Impossible de charger les détails du ticket');
    }
}