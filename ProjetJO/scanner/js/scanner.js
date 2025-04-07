document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById("scanner-video");
    const fileSelector = document.getElementById("file-selector");
    const resultDiv = document.getElementById("result");
    const restartButton = document.getElementById("restartScanner");

    // Vérifier si QrScanner est défini
    if (typeof QrScanner === 'undefined') {
        console.error("La bibliothèque QR Scanner n'est pas chargée");
        document.getElementById("scanner-container").style.display = "none";
        displayResult(
            "Mode upload uniquement",
            "Le scanner par caméra n'est pas disponible. Utilisez le bouton ci-dessous pour charger une image de QR code.",
            true
        );
    } else {
        initializeScanner();
    }

    function initializeScanner() {
        let isScannerActive = true;
        let qrScanner = null;
        let lastScannedCode = null;
        let scanTimeout = null;

        try {
            qrScanner = new QrScanner(
                video,
                (result) => {
                    const scannedData = result.data || result;
                    if (lastScannedCode !== scannedData) {
                        lastScannedCode = scannedData;
                        handleScanResult(scannedData);
                        clearTimeout(scanTimeout);
                        scanTimeout = setTimeout(() => {
                            lastScannedCode = null;
                        }, 3000);
                    }
                },
                {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    preferredCamera: 'environment'
                }
            );

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
                        "Erreur caméra",
                        "Impossible d'accéder à la caméra. Veuillez vérifier les permissions.<br>Vous pouvez toujours utiliser l'option d'upload d'image.",
                        false
                    );
                });

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
        } catch (error) {
            console.error("Erreur lors de l'initialisation du scanner:", error);
            document.getElementById("scanner-container").style.display = "none";
            displayResult(
                "Mode upload uniquement",
                "Le scanner par caméra n'est pas disponible. Utilisez le bouton ci-dessous pour charger une image de QR code.",
                true
            );
        }
    }

    // Gestion de la sélection de fichier (fonctionne même si la caméra ne fonctionne pas)
    fileSelector.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        displayResult(
            "Traitement en cours",
            "Analyse de l'image en cours...",
            true
        );

        console.log("Fichier sélectionné:", file.name, file.type);

        const imageUrl = URL.createObjectURL(file);
        const image = new Image();
        
        image.onload = () => {
            // Vérifier si QrScanner est défini et a la fonction scanImage
            if (typeof QrScanner !== 'undefined' && typeof QrScanner.scanImage === 'function') {
                QrScanner.scanImage(image)
                    .then(result => {
                        console.log("QR code détecté dans l'image:", result);
                        handleScanResult(result);
                    })
                    .catch(error => {
                        console.error("Erreur de scan du fichier:", error);
                        displayResult(
                            "Erreur",
                            "Impossible de lire le QR code depuis cette image. Assurez-vous que l'image est claire et que le QR code est visible.",
                            false
                        );
                    })
                    .finally(() => {
                        URL.revokeObjectURL(imageUrl);
                    });
            } else {
                console.error("QrScanner.scanImage n'est pas disponible");
                displayResult(
                    "Erreur",
                    "La fonction de scan d'image n'est pas disponible. Vérifiez que la bibliothèque QR Scanner est correctement chargée.",
                    false
                );
                URL.revokeObjectURL(imageUrl);
            }
        };
        
        image.onerror = () => {
            console.error("Erreur lors du chargement de l'image");
            displayResult(
                "Erreur",
                "Format d'image non supporté ou image corrompue.",
                false
            );
            URL.revokeObjectURL(imageUrl);
        };
        
        image.src = imageUrl;
    });

    // Fonction pour traiter le résultat du scan
    async function handleScanResult(scanData) {
        try {
            console.log("QR Code scanné:", scanData);
            
            // S'assurer qu'on a des données valides
            if (!scanData || typeof scanData !== 'string' || scanData.trim() === '') {
                displayResult("Erreur", "QR code non valide - Aucune donnée détectée", false);
                return;
            }
            
            // Extraire l'ID du ticket
            let ticketId = scanData.trim();
            console.log("ID du ticket après trim:", ticketId);
            
            // Appel de l'API pour vérifier le billet
            displayResult(
                "Vérification",
                "Vérification du billet en cours...",
                true
            );
            
            try {
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
        } catch (error) {
            console.error("Erreur générale:", error);
            displayResult("Erreur", "Une erreur inattendue s'est produite: " + error.message, false);
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