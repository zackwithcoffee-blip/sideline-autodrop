
// ==UserScript==
// @name         Sideline autodrop + Edit
// @namespace    http://tampermonkey.net/
// @version      6.3
// @description  Automatically drops containers from within the Sideline app and opens Edit Items
// @author       juagarcm
// @match        https://aft-poirot-website-dub.dub.proxy.amazon.com/*
// @grant        GM_xmlhttpRequest
// @connect      aft-moveapp-dub-dub.dub.proxy.amazon.com
// @connect      aft-qt-eu.aka.amazon.com
// ==/UserScript==

(function() {
    'use strict';

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes swipeUpBounce {
            0% {
                transform: translate(-50%, 100px);
                opacity: 0;
            }
            60% {
                transform: translate(-50%, -20px);
                opacity: 1;
            }
            80% {
                transform: translate(-50%, 5px);
            }
            100% {
                transform: translate(-50%, 0);
                opacity: 1;
            }
        }
        @keyframes swipeDown {
            0% {
                transform: translate(-50%, 0);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, 100px);
                opacity: 0;
            }
        }
        @keyframes checkmarkDraw {
            0% {
                stroke-dashoffset: 50;
            }
            100% {
                stroke-dashoffset: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Function to show animated success checkmark
    function showSuccessCheckmark() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, 100px);
            z-index: 999999;
            animation: swipeUpBounce 0.5s ease-out forwards;
        `;

        // Create SVG checkmark - smaller and simpler
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '60');
        svg.setAttribute('viewBox', '0 0 100 100');

        // Green circle background
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', '45');
        circle.setAttribute('fill', '#00AA00');

        // White checkmark
        const checkmark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        checkmark.setAttribute('d', 'M30 50 L42 62 L70 34');
        checkmark.setAttribute('stroke', 'white');
        checkmark.setAttribute('stroke-width', '8');
        checkmark.setAttribute('fill', 'none');
        checkmark.setAttribute('stroke-linecap', 'round');
        checkmark.setAttribute('stroke-linejoin', 'round');
        checkmark.setAttribute('stroke-dasharray', '50');
        checkmark.setAttribute('stroke-dashoffset', '50');
        checkmark.style.animation = 'checkmarkDraw 0.3s ease-out 0.2s forwards';

        svg.appendChild(circle);
        svg.appendChild(checkmark);
        notification.appendChild(svg);
        document.body.appendChild(notification);

        // Remove after 0.7 seconds with swipe down animation
        setTimeout(() => {
            notification.style.animation = 'swipeDown 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 700);
    }

    // Create TOP RIGHT container for Ready to Stow and Recycle - STACKED VERTICALLY
    const topRightContainer = document.createElement('div');
    topRightContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;

    // Create EXCEPCIONES button - BOTTOM LEFT
    const excepcionesButton = document.createElement('button');
    excepcionesButton.textContent = 'EXCEPCIONES';
    excepcionesButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 10000;
        padding: 12px 24px;
        background-color: #003366;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Roboto', Arial, sans-serif;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: all 0.3s;
    `;

    // Create button container for other 8 buttons - BOTTOM LEFT (slightly above)
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        position: fixed;
        bottom: 70px;
        left: 20px;
        z-index: 9999;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        max-width: 800px;
        opacity: 0;
        transform: scale(0.8);
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    // Toggle state for EXCEPCIONES button
    let isExpanded = false;

    // EXCEPCIONES button click handler
    excepcionesButton.addEventListener('click', () => {
        isExpanded = !isExpanded;

        if (isExpanded) {
            buttonContainer.style.opacity = '1';
            buttonContainer.style.transform = 'scale(1)';
            buttonContainer.style.pointerEvents = 'auto';
            excepcionesButton.style.opacity = '0.5';
            excepcionesButton.style.transform = 'scale(0.9)';
        } else {
            buttonContainer.style.opacity = '0';
            buttonContainer.style.transform = 'scale(0.8)';
            buttonContainer.style.pointerEvents = 'none';
            excepcionesButton.style.opacity = '1';
            excepcionesButton.style.transform = 'scale(1)';
        }
    });

    // Button configurations
    const topRightButtons = [
        { text: 'READY TO STOW', dropzone: 'dz-P-READYTOSTOW', color: '#00AA00' },
        { text: 'RECYCLE', dropzone: 'dz-P-RECYCLE', color: '#FFC107', textColor: 'black' },
        { text: 'EDIT TO PENDING', action: 'editToPending', color: '#FF5722' }
    ];

    const otherButtons = [
        { text: 'CUBIS', dropzone: 'dz-P-PendingCubisSW', color: '#003366' },
        { text: 'UNPLANNED', dropzone: 'dz-P-UnplannedPrepP3', color: '#003366' },
        { text: 'POUT SW', dropzone: 'dz-P-ProblemOutSW', color: '#003366' },
        { text: 'POUT P1', dropzone: 'dz-ProblemOutP1', color: '#003366' },
        { text: 'REMOVE', dropzone: 'dz-P-RemoveSW', color: '#003366' },
        { text: 'DAMAGE', dropzone: 'dz-P-DamageSW', color: '#003366' },
        { text: 'TT P3', dropzone: 'dz-R-TTP3', color: '#003366' },
        { text: 'TT P1', dropzone: 'dz-P-TTP1', color: '#003366' }
    ];

    // Function to create a button
    function createButton(config) {
        const button = document.createElement('button');
        button.textContent = config.text;
        button.style.cssText = `
            padding: 12px 16px;
            background-color: ${config.color};
            color: ${config.textColor || 'white'};
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: 'Roboto', Arial, sans-serif;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: all 0.3s;
            white-space: nowrap;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        });

        button.addEventListener('click', () => {
            if (config.action === 'editToPending') {
                editItemsToPendingResearch(button);
            } else {
                dropTote(config.dropzone, button);
            }
        });

        return button;
    }

    function getSourceToteId() {
        const toteElement = document.getElementById('source-container-label');
        if (toteElement && toteElement.textContent.trim()) {
            return toteElement.textContent.trim();
        }
        return null;
    }

    function getDestinationToteId() {
        const spans = document.querySelectorAll('span[id^="destination-container-detail-"]');
        for (let span of spans) {
            const toteId = span.textContent.trim();
            if (toteId && toteId.length > 0) {
                return toteId;
            }
        }
        return null;
    }

    function getToteIdToDrop() {
        const destinationTote = getDestinationToteId();
        const sourceTote = getSourceToteId();

        if (destinationTote) {
            console.log('Found destination tote:', destinationTote);
            return { toteId: destinationTote, isDestination: true };
        } else if (sourceTote) {
            console.log('No destination tote, using source tote:', sourceTote);
            return { toteId: sourceTote, isDestination: false };
        }
        return null;
    }

    function getCsrfToken() {
        const metaTag = document.querySelector('meta[name="anti-csrftoken-a2z"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        return null;
    }

    function getSessionId() {
        const metaTag = document.querySelector('meta[name="session-id"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        return null;
    }

    function makeApiCall(url, payload, csrfToken, sessionId) {
        return new Promise((resolve, reject) => {
            const headers = {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
            };

            if (csrfToken) {
                headers['anti-csrftoken-a2z'] = csrfToken;
            }
            if (sessionId) {
                headers['X-AMZ-SESSION-ID'] = sessionId;
            }

            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                headers: headers,
                data: JSON.stringify(payload),
                onload: function(response) {
                    console.log('API Response:', response.status, response.responseText);
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response);
                    } else {
                        reject(response);
                    }
                },
                onerror: function(error) {
                    console.error('API Error:', error);
                    reject(error);
                },
                ontimeout: function() {
                    reject(new Error('Timeout'));
                },
                timeout: 15000
            });
        });
    }

    // Function to open Edit Items with tote ID from Sideline page
    function editItemsToPendingResearch(buttonElement) {
        const toteInfo = getToteIdToDrop();

        if (!toteInfo) {
            alert('No se encontró ID de tote. Por favor, escanea un tote primero.');
            return;
        }

        const toteId = toteInfo.toteId;
        const toteLocation = toteInfo.isDestination ? 'destino' : 'origen';

        // Open Edit Items with the container ID from Sideline page
        const editItemsUrl = `https://aft-qt-eu.aka.amazon.com/app/edititems?experience=Desktop&containerId=${encodeURIComponent(toteId)}`;

        const newWindow = window.open(editItemsUrl, '_blank');

        if (!newWindow) {
            alert('No se pudo abrir Edit Items. Por favor, permite ventanas emergentes y vuelve a intentar.');
            return;
        }

        console.log(`Edit Items opened for tote ${toteId} (${toteLocation})`);
    }

    async function dropTote(dropzone, buttonElement) {
        const toteInfo = getToteIdToDrop();

        if (!toteInfo) {
            alert('No se encontró ID de tote. Por favor, escanea un tote primero.');
            return;
        }

        const toteId = toteInfo.toteId;
        const toteLocation = toteInfo.isDestination ? 'destino' : 'origen';

        buttonElement.disabled = true;
        const originalText = buttonElement.textContent;
        const originalColor = buttonElement.style.backgroundColor;
        buttonElement.textContent = 'Procesando...';
        buttonElement.style.backgroundColor = '#666666';

        try {
            const csrfToken = getCsrfToken();
            const sessionId = getSessionId();

            buttonElement.textContent = 'Validando...';
            console.log(`Step 1: Validating tote from ${toteLocation}:`, toteId);

            const getContainerUrl = 'https://aft-moveapp-dub-dub.dub.proxy.amazon.com/api/get-container';
            const getContainerPayload = {
                scannableId: toteId,
                palletCheckRequired: "false"
            };

            const step1Response = await makeApiCall(getContainerUrl, getContainerPayload, csrfToken, sessionId);
            console.log('Step 1 success:', step1Response.responseText);

            await new Promise(resolve => setTimeout(resolve, 500));

            buttonElement.textContent = 'Moviendo...';
            console.log('Step 2: Moving to destination:', dropzone);

            const moveContainerUrl = 'https://aft-moveapp-dub-dub.dub.proxy.amazon.com/api/move-container';
            const moveContainerPayload = {
                sourceScannableId: null,
                destinationScannableId: dropzone,
                containerScannableId: toteId,
                confirmed: "true"
            };

            const step2Response = await makeApiCall(moveContainerUrl, moveContainerPayload, csrfToken, sessionId);
            console.log('Step 2 success:', step2Response.responseText);

            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.backgroundColor = originalColor;

            // Show fast animated checkmark
            showSuccessCheckmark();
            console.log(`✓ Tote ${toteId} (${toteLocation}) movido a ${dropzone}`);

        } catch (error) {
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.backgroundColor = originalColor;

            console.error('Error completo:', error);
            const errorMsg = error.responseText || error.statusText || error.message || 'Error desconocido';
            alert(`Error: No se pudo mover el tote.
Status: ${error.status || 'desconocido'}
Detalles: ${errorMsg}
Revisa la consola (F12) para más información.`);
        }
    }

    topRightButtons.forEach(config => {
        const button = createButton(config);
        topRightContainer.appendChild(button);
    });

    otherButtons.forEach(config => {
        const button = createButton(config);
        buttonContainer.appendChild(button);
    });

    document.body.appendChild(topRightContainer);
    document.body.appendChild(excepcionesButton);
    document.body.appendChild(buttonContainer);

    console.log('Sideline Auto-Drop script loaded successfully');
})();

