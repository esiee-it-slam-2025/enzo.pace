document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById("scanner-video");
    const fileSelector = document.getElementById("file-selector");
    const resultDiv = document.getElementById("result");
    const restartButton = document.getElementById("restartScanner");

    let isScannerActive = true;
    let qrScanner = null;

    // Configuration optimisée pour une meilleure détection
    const qrConfig = {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 5,  // Augmenter pour plus de tentatives par seconde
        preferredCamera: 'environment', // Utiliser la caméra arrière sur mobile
        calculateScanRegion: (videoElement) => {
            const scanRegion = {
                x: 0,
                y: 0,
                width: videoElement.videoWidth,
                height: videoElement.videoHeight,
                downScaledWidth: videoElement.videoWidth,
                downScaledHeight: videoElement.videoHeight,
            };
            return scanRegion;
        }
    };

    // Initialiser le scanner avec la configuration optimisée
    try {
        qrScanner = new QrScanner(
            video,
            (result) => {
                handleScanResult(result);
                // Ne pas arrêter le scanner immédiatement pour permettre plusieurs scans
                // qrScanner.stop();
                // isScannerActive = false;
                // restartButton.textContent = "ON";
            },
            qrConfig
        );

        // Démarrer le scanner
        qrScanner.start()
            .then(() => {
                console.log("Scanner démarré avec succès");
                displayResult(
                    "Scanner actif",
                    "Le scanner est prêt à lire un QR code. Placez le QR code bien au centre de l'écran.",
                    true
                );
            })
            .catch((error) => {
                console.error("Erreur de démarrage du scanner:", error);
                displayResult(
                    "Erreur",
                    "Impossible d'accéder à la caméra. Veuillez vérifier les permissions.",
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
            } else {
                qrScanner.start();
                restartButton.textContent = "OFF";
                isScannerActive = true;
                displayResult(
                    "Scanner actif",
                    "Le scanner est prêt à lire un QR code. Placez le QR code bien au centre de l'écran.",
                    true
                );
            }
        }
    });

    // Gestion de la sélection de fichier avec meilleure gestion d'erreur
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

        // Utiliser createImageBitmap pour un meilleur support des formats d'image
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            const imageData = e.target.result;
            
            // Créer une image pour vérifier si le fichier est valide
            const img = new Image();
            img.onload = () => {
                console.log("Image chargée, dimensions:", img.width, "x", img.height);
                
                // S'assurer que l'image a des dimensions valides
                if (img.width === 0 || img.height === 0) {
                    displayResult(
                        "Erreur",
                        "Image invalide ou corrompue.",
                        false
                    );
                    return;
                }
                
                // Utiliser QrScanner.scanImage avec options avancées
                QrScanner.scanImage(img, { returnDetailedScanResult: true, qrEngine: 'zxing' })
                    .then((result) => {
                        console.log("QR code détecté dans l'image:", result);
                        handleScanResult(result);
                    })
                    .catch((error) => {
                        console.error("Erreur de scan du fichier:", error);
                        displayResult(
                            "Erreur",
                            "Impossible de lire le QR code depuis cette image. Assurez-vous que l'image est claire et que le QR code est visible.",
                            false
                        );
                    });
            };
            
            img.onerror = () => {
                console.error("Erreur lors du chargement de l'image");
                displayResult(
                    "Erreur",
                    "Format d'image non supporté ou image corrompue.",
                    false
                );
            };
            
            img.src = imageData;
        };
        
        fileReader.onerror = () => {
            console.error("Erreur lors de la lecture du fichier");
            displayResult(
                "Erreur",
                "Impossible de lire le fichier sélectionné.",
                false
            );
        };
        
        fileReader.readAsDataURL(file);
    });

    // Fonction pour traiter le résultat du scan avec plus de robustesse
    async function handleScanResult(result) {
        try {
            // S'assurer qu'on a des données valides
            const scanData = result && (result.data || result);
            
            if (!scanData || typeof scanData !== 'string' || scanData.trim() === '') {
                displayResult("Erreur", "QR code non valide - Aucune donnée détectée", false);
                return;
            }
            
            console.log("QR Code scanné:", scanData);
            
            // Extraire l'ID du ticket (en gérant différents formats possibles)
            let ticketId = scanData.trim();
            
            // Gérer le cas où le QR code contient "ID:" ou autre préfixe
            if (scanData.includes('ID:')) {
                ticketId = scanData.split('ID:')[1].trim();
            } else if (scanData.includes('Ticket ID:')) {
                ticketId = scanData.split('Ticket ID:')[1].trim();
            }
            
            console.log("ID du ticket extrait:", ticketId);
            
            // Appel de l'API pour vérifier le billet
            displayResult(
                "Vérification",
                "Vérification du billet en cours...",
                true
            );
            
            const response = await fetch(`http://127.0.0.1:8000/api/tickets/verify/${ticketId}`, {
                credentials: "include",
                headers: {
                    Accept: "application/json",
                }
            });

            console.log("Réponse de l'API:", response.status);
            
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
                    </div>
                    `,
                    true
                );
            } else {
                displayResult("Erreur", "Billet invalide", false);
            }
        } catch (error) {
            console.error("Erreur lors de la vérification du billet:", error);
            displayResult("Erreur", "⚠️ BILLET NON VALIDE ! ⚠️<br>" + error.message, false);
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