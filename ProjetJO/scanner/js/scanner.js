document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById("scanner-video");
    const fileSelector = document.getElementById("file-selector");
    const resultDiv = document.getElementById("result");
    const restartButton = document.getElementById("restartScanner");

    let isScannerActive = true;

    const qrScanner = new QrScanner(
        video,
        (result) => {
            handleScanResult(result);
            qrScanner.stop();
            isScannerActive = false;
            restartButton.textContent = "ON";
        },
        {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
        }
    );

    // Démarrer le scanner
    qrScanner
        .start()
        .then(() => {
            console.log("Scanner démarré avec succès");
            displayResult(
                "Scanner actif",
                "Le scanner est prêt à lire un QR code.",
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

    // Gestion du bouton de redémarrage
    restartButton.addEventListener("click", () => {
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
                "Le scanner est prêt à lire un QR code.",
                true
            );
        }
    });

    // Gestion de la sélection de fichier
    fileSelector.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        QrScanner.scanImage(file)
            .then((result) => {
                handleScanResult(result);
            })
            .catch((error) => {
                console.error("Erreur de scan du fichier:", error);
                displayResult(
                    "Erreur",
                    "Impossible de lire le QR code depuis cette image.",
                    false
                );
            });
    });

    // Fonction pour traiter le résultat du scan
    async function handleScanResult(result) {
        const scanData = result.data || result;
        console.log("QR Code scanné:", scanData);

        try {
            // Extraction de l'UUID du QR code si nécessaire
            let ticketId = scanData;
            if (scanData.includes('Ticket ID:')) {
                ticketId = scanData.replace('Ticket ID:', '').trim();
            }
            
            // Vérification de la validité de l'UUID
            if (!isValidUUID(ticketId)) {
                displayResult("Erreur", "QR code invalide - Format incorrect", false);
                return;
            }

            // Appel de l'API pour vérifier le billet
            const response = await fetch(`http://127.0.0.1:8000/api/tickets/verify/${ticketId}`, {
                credentials: "include",
                headers: {
                    Accept: "application/json",
                }
            });

            if (!response.ok) {
                throw new Error("Impossible de vérifier le billet");
            }

            const ticketDetails = await response.json();

            if (ticketDetails.valid) {
                displayResult(
                    "Billet Valide",
                    `
                    Événement: ${ticketDetails.ticket.event.name}
                    Date: ${new Date(ticketDetails.ticket.event.start).toLocaleDateString('fr-FR')}
                    Stade: ${ticketDetails.ticket.event.stadium.name}
                    Catégorie: ${ticketDetails.ticket.category}
                    Prix: ${ticketDetails.ticket.price}€
                    Propriétaire: ${ticketDetails.ticket.user}
                    `,
                    true
                );
            } else {
                displayResult("Erreur", "Billet invalide", false);
            }
        } catch (error) {
            console.error("Erreur lors de la vérification du billet:", error);
            displayResult("Erreur", "⚠️ BILLET NON VALIDE ! ⚠️", false);
        }
    }

    // Fonction pour afficher le résultat
    function displayResult(title, message, isValid) {
        resultDiv.className = isValid ? "valid" : "invalid";
        resultDiv.innerHTML = `
            <h2>${title}</h2>
            <pre>${message}</pre>
        `;
    }

    // Fonction pour vérifier si une chaîne est un UUID valide
    function isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid) || /^[0-9a-f]{32}$/i.test(uuid);
    }
});