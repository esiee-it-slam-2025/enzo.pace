document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById("scanner-video");
    const fileSelector = document.getElementById("file-selector");
    const resultDiv = document.getElementById("result");
    const restartButton = document.getElementById("restartScanner");

    let isScannerActive = true;
    let qrScanner = null;
    let lastScannedCode = null;
    let scanTimeout = null;

    // Configuration optimisée pour une meilleure détection
    const qrConfig = {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment', // Utiliser la caméra arrière sur mobile
    };

    // Initialiser le scanner avec la configuration optimisée
    try {
        qrScanner = new QrScanner(
            video,
            (result) => {
                const scannedData = result.data || result;
                // Éviter les scans multiples du même code
                if (lastScannedCode !== scannedData) {
                    lastScannedCode = scannedData;
                    handleScanResult(scannedData);
                    
                    // Réinitialiser après 3 secondes pour permettre un nouveau scan
                    clearTimeout(scanTimeout);
                    scanTimeout = setTimeout(() => {
                        lastScannedCode = null;
                    }, 3000);
                }
            },
            qrConfig
        );

        // Démarrer le scanner
        qrScanner.start()
            .then(() => {
                console.log("Scanner démarré avec succès");
                restartButton.textContent = "OFF";
                displayResult(
                    "Scanner actif",
                    "Le scanner est prêt à lire un QR code. Placez le QR code bien au centre de l'écran.",
                    true
                );
            })
            .catch((error) => {
                console.error("Erreur de démarrage du scanner:", error);
                restartButton.textContent = "ON";
                displayResult(
                    "Erreur",
                    "Impossible d'accéder à la caméra. Veuillez vérifier les permissions.<br>Vous pouvez toujours utiliser l'option d'upload d'image.",
                    false
                );
            });
    } catch (error) {
        console.error("Erreur lors de l'initialisation du scanner:", error);
    }

    // Gestion du bouton de redémarrage
    restartButton.addEventListener("click", () => {
        if (qrScanner) {
            if (isScannerActive) {
                qrScanner.stop();
                restartButton.textContent = "ON";
                isScannerActive = false;
                displayResult(
                    "Scanner désactivé",
                    "Cliquez sur ON pour réactiver le scanner de QR code.",
                    false
                );
            } else {
                qrScanner.start().then(() => {
                    restartButton.textContent = "OFF";
                    isScannerActive = true;
                    displayResult(
                        "Scanner actif",
                        "Le scanner est prêt à lire un QR code. Placez le QR code bien au centre de l'écran.",
                        true
                    );
                }).catch(error => {
                    console.error("Erreur lors de la réactivation du scanner:", error);
                    displayResult(
                        "Erreur",
                        "Impossible de réactiver la caméra. Veuillez rafraîchir la page.",
                        false
                    );
                });
            }
        }
    });

    // Gestion de la sélection de fichier
    fileSelector.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Afficher un message de traitement
        displayResult(
            "Traitement en cours",
            "Analyse de l'image en cours...",
            true
        );

        console.log("Fichier sélectionné:", file.name, file.type);

        // Créer un objet URL pour l'image
        const imageUrl = URL.createObjectURL(file);
        const image = new Image();
        
        image.onload = () => {
            QrScanner.scanImage(image)
                .then(result => {
                    console.log("QR code détecté dans l'image:", result);
                    handleScanResult(result);
                    URL.revokeObjectURL(imageUrl); // Libérer la mémoire
                })
                .catch(error => {
                    console.error("Erreur de scan du fichier:", error);
                    displayResult(
                        "Erreur",
                        "Impossible de lire le QR code depuis cette image. Assurez-vous que l'image est claire et que le QR code est visible.",
                        false
                    );
                    URL.revokeObjectURL(imageUrl); // Libérer la mémoire
                });
        };
        
        image.onerror = () => {
            console.error("Erreur lors du chargement de l'image");
            displayResult(
                "Erreur",
                "Format d'image non supporté ou image corrompue.",
                false
            );
            URL.revokeObjectURL(imageUrl); // Libérer la mémoire
        };
        
        image.src = imageUrl;
    });

    // Fonction pour traiter le résultat du scan
    async function handleScanResult(scanData) {
        try {
            // S'assurer qu'on a des données valides
            if (!scanData || typeof scanData !== 'string' || scanData.trim() === '') {
                displayResult("Erreur", "QR code non valide - Aucune donnée détectée", false);
                return;
            }
            
            console.log("QR Code scanné:", scanData);
            
            // Extraire l'ID du ticket de manière plus robuste
            let ticketId = scanData.trim();
            
            // Gérer différents formats possibles
            if (scanData.includes('ID:')) {
                try {
                    ticketId = scanData.split('|')[0].split(':')[1].trim();
                } catch (e) {
                    console.error("Erreur d'extraction de l'ID du format complexe:", e);
                }
            }
            
            console.log("ID du ticket extrait:", ticketId);
            
            // Appel de l'API pour vérifier le billet
            displayResult(
                "Vérification",
                "Vérification du billet en cours...",
                true
            );
            
// Appel de l'API pour vérifier le billet
const response = await fetch(`http://127.0.0.1:8000/api/tickets/verify/${ticketId}`, {
    method: 'GET',
    headers: {
        'Accept': 'application/json'
    }
});

            console.log("Réponse de l'API - Statut:", response.status);
            
            const responseText = await response.text();
            console.log("Contenu de la réponse:", responseText);
            
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${responseText}`);
            }

            let ticketDetails;
            try {
                ticketDetails = JSON.parse(responseText);
            } catch (e) {
                console.error("Erreur lors du parsing JSON:", e);
                throw new Error("Format de réponse invalide");
            }

            console.log("Détails du billet:", ticketDetails);

            if (ticketDetails.valid) {
                // Formatter correctement la date
                const eventDate = new Date(ticketDetails.ticket.match.start);
                const formattedDate = eventDate.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                displayResult(
                    "Billet Valide",
                    `
                    <div class="ticket-info">
                        <p><strong>Événement:</strong> ${ticketDetails.ticket.match.name}</p>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Stade:</strong> ${ticketDetails.ticket.match.stadium}</p>
                        <p><strong>Catégorie:</strong> ${ticketDetails.ticket.category}</p>
                        <p><strong>Prix:</strong> ${ticketDetails.ticket.price}€</p>
                        <p><strong>Propriétaire:</strong> ${ticketDetails.ticket.user}</p>
                        ${ticketDetails.ticket.used !== undefined ? 
                            `<p><strong>Statut:</strong> ${ticketDetails.ticket.used ? 
                                '<span style="color: #d9534f;">Déjà utilisé</span>' : 
                                '<span style="color: #5cb85c;">Première utilisation</span>'}</p>` : ''}
                    </div>
                    `,
                    true
                );
            } else {
                displayResult("Billet Non Valide", "Ce billet n'est pas valide : " + (ticketDetails.message || "Raison inconnue"), false);
            }
        } catch (error) {
            console.error("Erreur lors de la vérification du billet:", error);
            displayResult("Erreur", "⚠️ ÉCHEC DE VÉRIFICATION ! ⚠️<br>" + error.message, false);
        }
    }

    // Fonction pour afficher le résultat avec support HTML
    function displayResult(title, message, isValid) {
        resultDiv.className = isValid ? "valid" : "invalid";
        resultDiv.innerHTML = `
            <h2>${title}</h2>
            <div class="result-content">${message}</div>
        `;
    }
});