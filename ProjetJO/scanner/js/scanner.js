document.addEventListener('DOMContentLoaded', function() {
    const resultSection = document.getElementById('result-section');
    const resultContent = document.getElementById('result-content');
    const fileInput = document.getElementById('qr-input-file');

    // Gestionnaire d'événement pour l'upload de fichier
    fileInput.addEventListener('change', handleFile);

    // Configuration du lecteur de QR code
    const html5QrcodeScanner = new Html5Qrcode("reader");
    
    // Configurer la caméra (à décommenter quand on voudra l'utiliser)
    /*
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    */

    async function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Création d'une image depuis le fichier
            const img = await createImageFromFile(file);
            
            // Création d'un canvas pour l'image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Obtenir les données de l'image
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Détecter le QR code
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                // Vérifier si c'est un UUID valide
                if (isValidUUID(code.data)) {
                    console.log("QR Code détecté:", code.data);
                    await verifyTicket(code.data);
                } else {
                    showError("QR code non valide - Format incorrect");
                    console.log("Code détecté mais format invalide:", code.data);
                }
            } else {
                showError("Aucun QR code trouvé dans l'image");
                console.log("Aucun QR code détecté");
            }
        } catch (error) {
            showError("Erreur lors de la lecture du fichier");
            console.error("Erreur détaillée:", error);
        }
    }

    function isValidUUID(uuid) {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return regex.test(uuid);
    }

    function createImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    async function verifyTicket(ticketId) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/tickets/verify/${ticketId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (response.ok && data.valid) {
                showSuccess(data.ticket);
                playValidationSound('success');
            } else {
                showError("Ce billet n'est pas valide");
                playValidationSound('error');
            }
        } catch (error) {
            console.error("Erreur lors de la vérification:", error);
            showError("Erreur lors de la vérification du billet");
            playValidationSound('error');
        }
    }

    function showSuccess(ticket) {
        let date;
        try {
            date = new Date(ticket.match.start).toLocaleString('fr-FR', {
                dateStyle: 'long',
                timeStyle: 'short'
            });
        } catch (e) {
            date = "Date non disponible";
        }

        resultSection.className = 'success';
        resultContent.innerHTML = `
            <div class="valid-badge">✓ Billet Valide</div>
            <div class="ticket-details">
                <h3>Détails du match</h3>
                <p><strong>Match :</strong> ${ticket.match.team_home} vs ${ticket.match.team_away}</p>
                <p><strong>Stade :</strong> ${ticket.match.stadium}</p>
                <p><strong>Date :</strong> ${date}</p>
                <p><strong>Catégorie :</strong> ${ticket.category}</p>
                <p><strong>Propriétaire :</strong> ${ticket.user}</p>
            </div>
        `;
        resultSection.classList.remove('hidden');
    }

    function showError(message) {
        resultSection.className = 'error';
        resultContent.innerHTML = `
            <div class="error-badge">✗ Billet Non Valide</div>
            <p class="error-message">${message}</p>
        `;
        resultSection.classList.remove('hidden');
    }

    function playValidationSound(type) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (type === 'success') {
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            } else {
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1);
            }

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            console.log("Audio non disponible:", e);
        }
    }

    // Réinitialisation du champ de fichier après chaque scan
    function resetFileInput() {
        fileInput.value = '';
    }

    // Pour la future implémentation de la caméra
    function initCamera() {
        html5QrcodeScanner.start(
            { facingMode: "environment" },
            config,
            onScanSuccess
        ).catch(err => {
            console.error("Erreur lors du démarrage de la caméra:", err);
        });
    }

    function onScanSuccess(decodedText) {
        if (isValidUUID(decodedText)) {
            verifyTicket(decodedText);
        } else {
            showError("QR code non valide");
        }
    }
});