	
// ==UserScript==
// @name         Sideline One for All
// @namespace    http://tampermonkey.net/
// @version      9.0
// @description  Combines autodrop/multidrop with SKU companion buttons (FCResearch, TTSIM, Diver)
// @author       juagarcm
// @match        https://aft-poirot-website-dub.dub.proxy.amazon.com/?tool=V3
// @match        https://aft-poirot-website.eu.aftx.amazonoperations.app/?tool=V3
// @grant        GM_xmlhttpRequest
// @connect      aft-moveapp-dub-dub.dub.proxy.amazon.com
// @connect      aft-qt-eu.aka.amazon.com
// @connect      wave.qubit.amazon.dev
// @connect      pandash.amazon.com
// ==/UserScript==

(function() {
    'use strict';

    console.log(`[${new Date().toISOString()}] Sideline All-in-One v9.0 initialized`);

    // ══════════════════════════════════════════════════════════════════════════════
    // ██  SECTION 1: SKU COMPANION BUTTONS (FCResearch, TTSIM, Diver)
    // ══════════════════════════════════════════════════════════════════════════════

    function isValidCode(code) {
        if (!code) return false;
        if (/^B0[A-Z0-9]{8}$/.test(code)) return true;
        if (/^X0[A-Z0-9]{8}$/.test(code)) return true;
        if (/^LPN[A-Z0-9]+$/.test(code)) return true;
        if (/^\d{10,13}$/.test(code)) return true;
        return false;
    }

    function getFNSKUFromTag(tag) {
        let text = tag.textContent || '';
        if (!text.trim() && tag.shadowRoot) {
            text = tag.shadowRoot.textContent || '';
        }
        const bold = tag.querySelector('b');
        if (bold) text = bold.textContent || '';

        const labelMatch = text.match(/(?:FNSKU|ASIN|LPN):\s*([A-Z0-9\-]+)/i);
        if (labelMatch) {
            const code = labelMatch[1].trim().toUpperCase();
            if (isValidCode(code)) return code;
        }

        const tokens = text.trim().split(/\s+/);
        for (const token of tokens) {
            const code = token.replace(/[^A-Z0-9\-]/gi, '').toUpperCase();
            if (isValidCode(code)) return code;
        }

        return null;
    }

    function createFCResearchButton(fnsku) {
        const button = document.createElement('button');
        button.style.cssText = `
            background-color: #87CEEB;
            border: 1px solid #5DADE2;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            font-size: 16.8px;
            cursor: pointer;
            margin-left: 1px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: background-color 0.2s, transform 0.1s;
            position: relative;
            top: 2px;
        `;
        const emoji = document.createElement('span');
        emoji.textContent = '🔎';
        emoji.style.cssText = `font-size: 20.16px; position: relative; top: -2px;`;
        button.appendChild(emoji);
        button.onmouseenter = () => { button.style.backgroundColor = '#5DADE2'; button.style.transform = 'scale(1.05)'; };
        button.onmouseleave = () => { button.style.backgroundColor = '#87CEEB'; button.style.transform = 'scale(1)'; };
        button.onclick = () => {
            window.open(`https://qi-fcresearch-eu.corp.amazon.com/MAD7/search?searchTerm=${fnsku}`, '_blank');
            console.log(`[${new Date().toISOString()}] Opened FCResearch for: ${fnsku}`);
        };
        button.title = `Search ${fnsku} in FCResearch`;
        return button;
    }

    function createTTSIMButton(fnsku) {
        const button = document.createElement('button');
        button.style.cssText = `
            background-color: #FF6B6B;
            border: 1px solid #E85555;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            font-size: 16.8px;
            cursor: pointer;
            margin-left: 3px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: background-color 0.2s, transform 0.1s;
            position: relative;
            top: 2px;
        `;
        const emoji = document.createElement('span');
        emoji.textContent = '🎫';
        emoji.style.cssText = `font-size: 20.16px; position: relative; top: -2px;`;
        button.appendChild(emoji);
        button.onmouseenter = () => { button.style.backgroundColor = '#E85555'; button.style.transform = 'scale(1.05)'; };
        button.onmouseleave = () => { button.style.backgroundColor = '#FF6B6B'; button.style.transform = 'scale(1)'; };
        button.onclick = () => {
            const query = {
                "AND": {
                    "keyword": `(${fnsku})`,
                    "status": {
                        "OR": [
                            "Assigned",
                            {"OR": ["Work In Progress", {"OR": ["Researching", {"OR": ["Pending", {"OR": ["Resolved", "Closed"]}]}]}]}
                        ]
                    }
                }
            };
            window.open(`https://t.corp.amazon.com/issues?q=${encodeURIComponent(JSON.stringify(query))}`, '_blank');
            console.log(`[${new Date().toISOString()}] Opened TTSIM for: ${fnsku}`);
        };
        button.title = `Search ${fnsku} in TTSIM`;
        return button;
    }

    function createDiverButton(fnsku) {
        const button = document.createElement('button');
        button.style.cssText = `
            background-color: #1E90FF;
            border: 1px solid #1270CC;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            font-size: 16.8px;
            cursor: pointer;
            margin-left: 3px;
            margin-right: 5px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: background-color 0.2s, transform 0.1s;
            position: relative;
            top: 2px;
        `;
        const emoji = document.createElement('span');
        emoji.textContent = '🤿';
        emoji.style.cssText = `font-size: 20.16px; position: relative; top: -2px;`;
        button.appendChild(emoji);
        button.onmouseenter = () => { button.style.backgroundColor = '#1270CC'; button.style.transform = 'scale(1.05)'; };
        button.onmouseleave = () => { button.style.backgroundColor = '#1E90FF'; button.style.transform = 'scale(1)'; };
        button.onclick = () => {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const fmt = d => d.toISOString().split('T')[0];
            const diverUrl = `https://diver.qts.amazon.dev/tools/transshipment/dashboards/transfer_details?destination_warehouse_id=MAD7&search=${fnsku}&source_warehouse_id=&start_date=${fmt(thirtyDaysAgo)}&end_date=${fmt(today)}`;
            window.open(diverUrl, '_blank');
            console.log(`[${new Date().toISOString()}] Opened Diver for: ${fnsku}`);
        };
        button.title = `Search ${fnsku} transshipments in Diver (last 30 days, any FC → MAD7)`;
        return button;
    }

    function insertSearchButtons() {
        const allTags = Array.from(document.querySelectorAll('alchemy-tag'));

        for (const tag of allTags) {
            const code = getFNSKUFromTag(tag);
            if (!code) continue;

            const markerId = `fcresearch-btn-${code}`;
            if (document.getElementById(markerId)) continue;

            tag.style.marginRight = '5px';
            tag.style.paddingRight = '3px';

            const parent = tag.parentNode;
            if (parent) {
                parent.style.gap = '5px';
                parent.style.paddingRight = '2px';
            }

            console.log(`[${new Date().toISOString()}] Inserting SKU buttons for: ${code}`);

            const fcBtn = createFCResearchButton(code);
            fcBtn.id = markerId;

            const ttBtn = createTTSIMButton(code);
            ttBtn.id = `ttsim-btn-${code}`;

            const diverBtn = createDiverButton(code);
            diverBtn.id = `diver-btn-${code}`;

            tag.parentNode.insertBefore(fcBtn, tag.nextSibling);
            tag.parentNode.insertBefore(ttBtn, fcBtn.nextSibling);
            tag.parentNode.insertBefore(diverBtn, ttBtn.nextSibling);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // ██  SECTION 2: AUTODROP + MULTIDROP
    // ══════════════════════════════════════════════════════════════════════════════

    let multidropQueue = [];
    let isMultidropMode = false;

    // Add animation styles
    const animStyle = document.createElement('style');
    animStyle.textContent = `
        @keyframes swipeUpBounce {
            0% { transform: translate(-50%, 100px); opacity: 0; }
            60% { transform: translate(-50%, -20px); opacity: 1; }
            80% { transform: translate(-50%, 5px); }
            100% { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes swipeDown {
            0% { transform: translate(-50%, 0); opacity: 1; }
            100% { transform: translate(-50%, 100px); opacity: 0; }
        }
        @keyframes checkmarkDraw {
            0% { stroke-dashoffset: 50; }
            100% { stroke-dashoffset: 0; }
        }
        .multidrop-badge {
            position: absolute; top: -5px; right: -5px;
            background-color: #FF0000; color: white; border-radius: 50%;
            width: 20px; height: 20px; font-size: 12px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            font-family: Roboto, sans-serif;
        }
        .multidrop-tote-item {
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 12px; margin: 4px 0; background-color: #f0f0f0;
            border-radius: 6px; font-family: Roboto, sans-serif; font-size: 14px;
        }
        .multidrop-tote-item .remove-btn {
            background: #ff4444; color: white; border: none; border-radius: 50%;
            width: 22px; height: 22px; cursor: pointer; font-size: 14px;
            display: flex; align-items: center; justify-content: center;
        }
        .multidrop-progress {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 10001; background: white; border-radius: 12px; padding: 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: Roboto, sans-serif;
            min-width: 300px; text-align: center;
        }
        .multidrop-progress .progress-bar {
            width: 100%; height: 8px; background: #e0e0e0;
            border-radius: 4px; margin: 12px 0; overflow: hidden;
        }
        .multidrop-progress .progress-fill {
            height: 100%; background: #9C27B0; border-radius: 4px;
            transition: width 0.3s ease;
        }
    `;
    document.head.appendChild(animStyle);

    function showSuccessCheckmark() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, 100px); z-index: 999999;
            animation: swipeUpBounce 0.5s ease-out forwards;
        `;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '60');
        svg.setAttribute('viewBox', '0 0 100 100');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', '45');
        circle.setAttribute('fill', '#00AA00');
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
        setTimeout(() => {
            notification.style.animation = 'swipeDown 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 700);
    }

    function updateMultidropBadge() {
        let badge = multidropButton.querySelector('.multidrop-badge');
        if (multidropQueue.length > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'multidrop-badge';
                multidropButton.style.position = 'relative';
                multidropButton.appendChild(badge);
            }
            badge.textContent = multidropQueue.length;
            isMultidropMode = true;
        } else {
            if (badge) badge.remove();
            isMultidropMode = false;
        }
    }

    function renderToteList() {
        const listContainer = document.getElementById('multidrop-tote-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        multidropQueue.forEach((tote, index) => {
            const item = document.createElement('div');
            item.className = 'multidrop-tote-item';
            item.innerHTML = `
                <span>${tote}</span>
                <button class="remove-btn" data-index="${index}">✕</button>
            `;
            item.querySelector('.remove-btn').addEventListener('click', () => {
                multidropQueue.splice(index, 1);
                renderToteList();
                updateMultidropBadge();
                updateToteCount();
            });
            listContainer.appendChild(item);
        });
    }

    function updateToteCount() {
        const countEl = document.getElementById('multidrop-count');
        if (countEl) {
            countEl.textContent = `${multidropQueue.length} tote(s) en cola`;
        }
    }

    // ─── API HELPERS ────────────────────────────────────────────────────────────

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
        if (metaTag) return metaTag.getAttribute('content');
        return null;
    }

    function getSessionId() {
        const metaTag = document.querySelector('meta[name="session-id"]');
        if (metaTag) return metaTag.getAttribute('content');
        return null;
    }

    function makeApiCall(url, payload, csrfToken, sessionId) {
        return new Promise((resolve, reject) => {
            const headers = {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
            };
            if (csrfToken) headers['anti-csrftoken-a2z'] = csrfToken;
            if (sessionId) headers['X-AMZ-SESSION-ID'] = sessionId;

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

    // ─── DROP FUNCTIONS ─────────────────────────────────────────────────────────

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
            const getContainerUrl = 'https://aft-moveapp-dub-dub.dub.proxy.amazon.com/api/get-container';
            const getContainerPayload = { scannableId: toteId, palletCheckRequired: "false" };
            await makeApiCall(getContainerUrl, getContainerPayload, csrfToken, sessionId);

            await new Promise(resolve => setTimeout(resolve, 500));

            buttonElement.textContent = 'Moviendo...';
            const moveContainerUrl = 'https://aft-moveapp-dub-dub.dub.proxy.amazon.com/api/move-container';
            const moveContainerPayload = {
                sourceScannableId: null,
                destinationScannableId: dropzone,
                containerScannableId: toteId,
                confirmed: "true"
            };
            await makeApiCall(moveContainerUrl, moveContainerPayload, csrfToken, sessionId);

            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.backgroundColor = originalColor;
            showSuccessCheckmark();
            console.log(`✓ Tote ${toteId} (${toteLocation}) movido a ${dropzone}`);

        } catch (error) {
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.backgroundColor = originalColor;
            const errorMsg = error.responseText || error.statusText || error.message || 'Error desconocido';
            alert(`Error: No se pudo mover el tote.
Status: ${error.status || 'desconocido'}
Detalles: ${errorMsg}
Revisa la consola (F12) para más información.`);
        }
    }

    async function dropAllMultidrop(dropzone, buttonElement) {
        if (multidropQueue.length === 0) return;
        const totalTotes = multidropQueue.length;
        const totesCopy = [...multidropQueue];

        const progressOverlay = document.createElement('div');
        progressOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0,0,0,0.5); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
        `;
        const progressBox = document.createElement('div');
        progressBox.className = 'multidrop-progress';
        progressBox.innerHTML = `
            <h3 style="margin: 0 0 8px 0; color: #9C27B0;">MULTIDROP en progreso</h3>
            <p id="multidrop-status" style="margin: 4px 0; color: #333;">Procesando 0/${totalTotes}...</p>
            <div class="progress-bar"><div class="progress-fill" id="multidrop-progress-fill" style="width: 0%"></div></div>
            <p id="multidrop-current" style="margin: 4px 0; font-size: 12px; color: #666;"></p>
            <p id="multidrop-errors" style="margin: 4px 0; font-size: 12px; color: #ff4444;"></p>
        `;
        progressOverlay.appendChild(progressBox);
        document.body.appendChild(progressOverlay);

        let successCount = 0;
        let errorCount = 0;
        let errors = [];

        for (let i = 0; i < totesCopy.length; i++) {
            const toteId = totesCopy[i];
            const statusEl = document.getElementById('multidrop-status');
            const fillEl = document.getElementById('multidrop-progress-fill');
            const currentEl = document.getElementById('multidrop-current');
            const errorsEl = document.getElementById('multidrop-errors');

            if (statusEl) statusEl.textContent = `Procesando ${i + 1}/${totalTotes}...`;
            if (currentEl) currentEl.textContent = `Tote actual: ${toteId}`;
            if (fillEl) fillEl.style.width = `${((i) / totalTotes) * 100}%`;

            try {
                const csrfToken = getCsrfToken();
                const sessionId = getSessionId();

                const getContainerUrl = 'https://aft-moveapp-dub-dub.dub.proxy.amazon.com/api/get-container';
                await makeApiCall(getContainerUrl, { scannableId: toteId, palletCheckRequired: "false" }, csrfToken, sessionId);

                await new Promise(resolve => setTimeout(resolve, 300));

                const moveContainerUrl = 'https://aft-moveapp-dub-dub.dub.proxy.amazon.com/api/move-container';
                await makeApiCall(moveContainerUrl, {
                    sourceScannableId: null,
                    destinationScannableId: dropzone,
                    containerScannableId: toteId,
                    confirmed: "true"
                }, csrfToken, sessionId);

                successCount++;
                console.log(`✓ Multidrop: Tote ${toteId} movido a ${dropzone} (${i + 1}/${totalTotes})`);
            } catch (error) {
                errorCount++;
                const errorMsg = error.responseText || error.statusText || error.message || 'Error desconocido';
                errors.push(`${toteId}: ${errorMsg}`);
                console.error(`✗ Multidrop error for ${toteId}:`, error);
                if (errorsEl) errorsEl.textContent = `Errores: ${errorCount}`;
            }

            if (fillEl) fillEl.style.width = `${((i + 1) / totalTotes) * 100}%`;
            if (i < totesCopy.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        multidropQueue = [];
        updateMultidropBadge();

        const statusEl = document.getElementById('multidrop-status');
        if (statusEl) {
            statusEl.textContent = `¡Completado! ${successCount}/${totalTotes} exitosos`;
            statusEl.style.color = '#00AA00';
        }
        if (errors.length > 0) {
            const errorsEl = document.getElementById('multidrop-errors');
            if (errorsEl) errorsEl.innerHTML = `<strong>Errores (${errorCount}):</strong><br>${errors.join('<br>')}`;
        }

        setTimeout(() => {
            progressOverlay.remove();
            if (successCount > 0) showSuccessCheckmark();
        }, errors.length > 0 ? 5000 : 2000);
    }

    function editItemsToPendingResearch(buttonElement) {
        const toteInfo = getToteIdToDrop();
        if (!toteInfo) {
            alert('No se encontró ID de tote. Por favor, escanea un tote primero.');
            return;
        }
        const toteId = toteInfo.toteId;
        const editItemsUrl = `https://aft-qt-eu.aka.amazon.com/app/edititems?experience=Desktop&containerId=${encodeURIComponent(toteId)}`;
        const newWindow = window.open(editItemsUrl, '_blank');
        if (!newWindow) {
            alert('No se pudo abrir Edit Items. Por favor, permite ventanas emergentes y vuelve a intentar.');
            return;
        }
        console.log(`Edit Items opened for tote ${toteId}`);
    }

    // ─── UI: TOP RIGHT BUTTONS ──────────────────────────────────────────────────

    const topRightContainer = document.createElement('div');
    topRightContainer.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        display: flex; flex-direction: column; gap: 10px; align-items: flex-end;
    `;

    // Ready to Stow button
    const readyToStowButton = document.createElement('button');
    readyToStowButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; margin-top: -2px;">✔</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; margin-left: 5px;">R2S</span>';
    readyToStowButton.style.cssText = `
        width: 45px; height: 45px; background-color: #00AA00; color: white;
        border: none; border-radius: 50%; cursor: pointer; font-size: 28px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;
        overflow: hidden; white-space: nowrap; padding: 0;
    `;

    let isReadyHovering = false;
    readyToStowButton.addEventListener('mouseenter', () => {
        isReadyHovering = true;
        const emoji = readyToStowButton.querySelector('.emoji');
        const text = readyToStowButton.querySelector('.text');
        readyToStowButton.style.width = '130px';
        readyToStowButton.style.borderRadius = '22.5px';
        readyToStowButton.style.padding = '0 16px';
        readyToStowButton.style.justifyContent = 'flex-start';
        emoji.style.opacity = '0'; emoji.style.width = '0'; emoji.style.transition = 'all 0.2s ease';
        setTimeout(() => { if (isReadyHovering) { text.style.display = 'inline'; text.style.opacity = '1'; text.style.transition = 'opacity 0.2s ease'; } }, 100);
    });
    readyToStowButton.addEventListener('mouseleave', () => {
        isReadyHovering = false;
        const emoji = readyToStowButton.querySelector('.emoji');
        const text = readyToStowButton.querySelector('.text');
        text.style.opacity = '0';
        setTimeout(() => { text.style.display = 'none'; emoji.style.opacity = '1'; emoji.style.width = 'auto'; }, 100);
        readyToStowButton.style.width = '45px'; readyToStowButton.style.borderRadius = '50%';
        readyToStowButton.style.padding = '0'; readyToStowButton.style.justifyContent = 'center';
    });
    readyToStowButton.addEventListener('click', () => {
        if (isMultidropMode && multidropQueue.length > 0) { dropAllMultidrop('dz-P-READYTOSTOW', readyToStowButton); }
        else { dropTote('dz-P-READYTOSTOW', readyToStowButton); }
    });

    // Recycle button
    const recycleButton = document.createElement('button');
    recycleButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; font-size: 25px;">♻️</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; margin-left: 2px;">RECYCLE</span>';
    recycleButton.style.cssText = `
        width: 45px; height: 45px; background-color: #FFC107; color: white;
        border: none; border-radius: 50%; cursor: pointer; font-size: 20px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;
        overflow: hidden; white-space: nowrap; padding: 0;
    `;

    let isRecycleHovering = false;
    recycleButton.addEventListener('mouseenter', () => {
        isRecycleHovering = true;
        const emoji = recycleButton.querySelector('.emoji');
        const text = recycleButton.querySelector('.text');
        recycleButton.style.width = '130px'; recycleButton.style.borderRadius = '22.5px';
        recycleButton.style.padding = '0 16px'; recycleButton.style.justifyContent = 'flex-start';
        emoji.style.opacity = '0'; emoji.style.width = '0'; emoji.style.transition = 'all 0.2s ease';
        setTimeout(() => { if (isRecycleHovering) { text.style.display = 'inline'; text.style.opacity = '1'; text.style.transition = 'opacity 0.2s ease'; } }, 100);
    });
    recycleButton.addEventListener('mouseleave', () => {
        isRecycleHovering = false;
        const emoji = recycleButton.querySelector('.emoji');
        const text = recycleButton.querySelector('.text');
        text.style.opacity = '0';
        setTimeout(() => { text.style.display = 'none'; emoji.style.opacity = '1'; emoji.style.width = 'auto'; }, 100);
        recycleButton.style.width = '45px'; recycleButton.style.borderRadius = '50%';
        recycleButton.style.padding = '0'; recycleButton.style.justifyContent = 'center';
    });
    recycleButton.addEventListener('click', () => {
        if (isMultidropMode && multidropQueue.length > 0) { dropAllMultidrop('dz-P-RECYCLE', recycleButton); }
        else { dropTote('dz-P-RECYCLE', recycleButton); }
    });

    // Edit to Pending button
    const editToPendingButton = document.createElement('button');
    editToPendingButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; font-size: 28px;position: relative; top: -2px;">✋</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; margin-left: 5px;">PENDING</span>';
    editToPendingButton.style.cssText = `
        width: 45px; height: 45px; background-color: #FF5722; color: white;
        border: none; border-radius: 50%; cursor: pointer; font-size: 24px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;
        overflow: hidden; white-space: nowrap; padding: 0;
    `;

    let isEditHovering = false;
    editToPendingButton.addEventListener('mouseenter', () => {
        isEditHovering = true;
        const emoji = editToPendingButton.querySelector('.emoji');
        const text = editToPendingButton.querySelector('.text');
        editToPendingButton.style.width = '170px'; editToPendingButton.style.borderRadius = '22.5px';
        editToPendingButton.style.padding = '0 16px'; editToPendingButton.style.justifyContent = 'flex-start';
        emoji.style.opacity = '0'; emoji.style.width = '0'; emoji.style.transition = 'all 0.2s ease';
        setTimeout(() => { if (isEditHovering) { text.style.display = 'inline'; text.style.opacity = '1'; text.style.transition = 'opacity 0.2s ease'; } }, 100);
    });
    editToPendingButton.addEventListener('mouseleave', () => {
        isEditHovering = false;
        const emoji = editToPendingButton.querySelector('.emoji');
        const text = editToPendingButton.querySelector('.text');
        text.style.opacity = '0';
        setTimeout(() => { text.style.display = 'none'; emoji.style.opacity = '1'; emoji.style.width = 'auto'; }, 100);
        editToPendingButton.style.width = '45px'; editToPendingButton.style.borderRadius = '50%';
        editToPendingButton.style.padding = '0'; editToPendingButton.style.justifyContent = 'center';
    });
    editToPendingButton.addEventListener('click', () => { editItemsToPendingResearch(editToPendingButton); });

    // DPT button
    const dptButton = document.createElement('button');
    dptButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; margin-top: -2px; font-size: 28px;position: relative; top: -3px;">💩</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; margin-left: 5px;">DPT</span>';
    dptButton.style.cssText = `
        width: 45px; height: 45px; background-color: #FFB366; color: white;
        border: none; border-radius: 50%; cursor: pointer; font-size: 24px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;
        overflow: hidden; white-space: nowrap; padding: 0;
    `;

    let isDptHovering = false;
    dptButton.addEventListener('mouseenter', () => {
        isDptHovering = true;
        const emoji = dptButton.querySelector('.emoji');
        const text = dptButton.querySelector('.text');
        dptButton.style.width = '90px'; dptButton.style.borderRadius = '22.5px';
        dptButton.style.padding = '0 12px'; dptButton.style.justifyContent = 'flex-start';
        emoji.style.opacity = '0'; emoji.style.width = '0'; emoji.style.transition = 'all 0.2s ease';
        setTimeout(() => { if (isDptHovering) { text.style.display = 'inline'; text.style.opacity = '1'; text.style.transition = 'opacity 0.2s ease'; } }, 100);
    });
    dptButton.addEventListener('mouseleave', () => {
        isDptHovering = false;
        const emoji = dptButton.querySelector('.emoji');
        const text = dptButton.querySelector('.text');
        text.style.opacity = '0';
        setTimeout(() => { text.style.display = 'none'; emoji.style.opacity = '1'; emoji.style.width = 'auto'; }, 100);
        dptButton.style.width = '45px'; dptButton.style.borderRadius = '50%';
        dptButton.style.padding = '0'; dptButton.style.justifyContent = 'center';
    });
    dptButton.addEventListener('click', () => {
        window.open('https://wave.qubit.amazon.dev/DPT/queue-initiation', '_blank');
        console.log('DPT opened');
    });

    // Pandash button
    const pandashButton = document.createElement('button');
    pandashButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; font-size: 28px;">🐼</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; font-size: 20px; margin-left: 5px;">PANDASH</span>';
    pandashButton.style.cssText = `
        width: 45px; height: 45px; background-color: #98D8C8; color: white;
        border: none; border-radius: 50%; cursor: pointer; font-size: 24px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;
        overflow: hidden; white-space: nowrap; padding: 0;
    `;

    let isPandashHovering = false;
    pandashButton.addEventListener('mouseenter', () => {
        isPandashHovering = true;
        const emoji = pandashButton.querySelector('.emoji');
        const text = pandashButton.querySelector('.text');
        pandashButton.style.width = '130px'; pandashButton.style.borderRadius = '22.5px';
        pandashButton.style.padding = '0 12px'; pandashButton.style.justifyContent = 'flex-start';
        emoji.style.opacity = '0'; emoji.style.width = '0'; emoji.style.transition = 'all 0.2s ease';
        setTimeout(() => { if (isPandashHovering) { text.style.display = 'inline'; text.style.opacity = '1'; text.style.transition = 'opacity 0.2s ease'; } }, 100);
    });
    pandashButton.addEventListener('mouseleave', () => {
        isPandashHovering = false;
        const emoji = pandashButton.querySelector('.emoji');
        const text = pandashButton.querySelector('.text');
        text.style.opacity = '0';
        setTimeout(() => { text.style.display = 'none'; emoji.style.opacity = '1'; emoji.style.width = 'auto'; }, 100);
        pandashButton.style.width = '45px'; pandashButton.style.borderRadius = '50%';
        pandashButton.style.padding = '0'; pandashButton.style.justifyContent = 'center';
    });
    pandashButton.addEventListener('click', () => {
        window.open('https://pandash.amazon.com/', '_blank');
        console.log('Pandash opened');
    });

    // MULTIDROP button
    const multidropButton = document.createElement('button');
    multidropButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold;">+</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; font-size: 16px; margin-left: 5px;">MULTIDROP</span>';
    multidropButton.style.cssText = `
        width: 45px; height: 45px; background-color: #9C27B0; color: white;
        border: none; border-radius: 50%; cursor: pointer; font-size: 24px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;
        overflow: hidden; white-space: nowrap; padding: 0; position: relative;
    `;

    let isMultidropHovering = false;
    multidropButton.addEventListener('mouseenter', () => {
        isMultidropHovering = true;
        const emoji = multidropButton.querySelector('.emoji');
        const text = multidropButton.querySelector('.text');
        multidropButton.style.width = '160px'; multidropButton.style.borderRadius = '22.5px';
        multidropButton.style.padding = '0 12px'; multidropButton.style.justifyContent = 'flex-start';
        emoji.style.opacity = '0'; emoji.style.width = '0'; emoji.style.transition = 'all 0.2s ease';
        setTimeout(() => { if (isMultidropHovering) { text.style.display = 'inline'; text.style.opacity = '1'; text.style.transition = 'opacity 0.2s ease'; } }, 100);
    });
    multidropButton.addEventListener('mouseleave', () => {
        isMultidropHovering = false;
        const emoji = multidropButton.querySelector('.emoji');
        const text = multidropButton.querySelector('.text');
        text.style.opacity = '0';
        setTimeout(() => { text.style.display = 'none'; emoji.style.opacity = '1'; emoji.style.width = 'auto'; }, 100);
        multidropButton.style.width = '45px'; multidropButton.style.borderRadius = '50%';
        multidropButton.style.padding = '0'; multidropButton.style.justifyContent = 'center';
    });

    // MULTIDROP panel
    const multidropPanel = document.createElement('div');
    multidropPanel.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 10000; width: 340px; background: white; border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2); padding: 16px; display: none;
        font-family: Roboto, sans-serif;
    `;
    multidropPanel.innerHTML = `
        <p id="multidrop-count" style="margin: 0 0 10px 0; font-size: 12px; color: #888;">0 tote(s) en cola</p>
        <div style="display: flex; gap: 6px; margin-bottom: 10px;">
            <input type="text" id="multidrop-input" placeholder="Escanea un tote y pulsa Enter" style="
                flex: 1; padding: 8px 12px; font-size: 14px; border: 1.5px solid #9C27B0;
                border-radius: 6px; outline: none; font-family: Roboto, sans-serif;
            "/>
            <button id="multidrop-add-btn" style="
                padding: 8px 12px; background: #9C27B0; color: white; border: none;
                border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;
                font-family: Roboto, sans-serif;
            ">+</button>
        </div>
        <div id="multidrop-tote-list" style="max-height: 180px; overflow-y: auto; margin-bottom: 10px;"></div>
        <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button id="multidrop-clear-btn" style="
                padding: 6px 12px; background: #ff4444; color: white; border: none;
                border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;
                font-family: Roboto, sans-serif;
            ">Limpiar</button>
            <button id="multidrop-close-btn" style="
                padding: 6px 12px; background: #4CAF50; color: white; border: none;
                border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;
                font-family: Roboto, sans-serif;
            ">Listo ✓</button>
        </div>
    `;

    const multidropOverlay = document.createElement('div');
    multidropOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.5); z-index: 9999; display: none;
    `;

    multidropButton.addEventListener('click', () => {
        multidropOverlay.style.display = 'block';
        multidropPanel.style.display = 'block';
        renderToteList();
        updateToteCount();
        setTimeout(() => { document.getElementById('multidrop-input').focus(); }, 100);
    });

    multidropOverlay.addEventListener('click', () => {
        multidropOverlay.style.display = 'none';
        multidropPanel.style.display = 'none';
    });

    multidropPanel.addEventListener('click', (e) => {
        if (e.target.id === 'multidrop-add-btn') addToteToQueue();
        if (e.target.id === 'multidrop-clear-btn') { multidropQueue = []; renderToteList(); updateMultidropBadge(); updateToteCount(); }
        if (e.target.id === 'multidrop-close-btn') { multidropOverlay.style.display = 'none'; multidropPanel.style.display = 'none'; }
    });

    multidropPanel.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addToteToQueue();
        if (e.key === 'Escape') { multidropOverlay.style.display = 'none'; multidropPanel.style.display = 'none'; }
    });

    function addToteToQueue() {
        const input = document.getElementById('multidrop-input');
        const value = input.value.trim();
        if (value && !multidropQueue.includes(value)) {
            multidropQueue.push(value);
            input.value = '';
            renderToteList();
            updateMultidropBadge();
            updateToteCount();
            input.focus();
        } else if (multidropQueue.includes(value)) {
            input.style.borderColor = '#ff4444';
            setTimeout(() => { input.style.borderColor = '#9C27B0'; }, 500);
            input.value = '';
            input.focus();
        }
    }

    document.body.appendChild(multidropOverlay);
    document.body.appendChild(multidropPanel);

    // ─── EXCEPCIONES BUTTON (BOTTOM LEFT) ───────────────────────────────────────

    const excepcionesButton = document.createElement('button');
    excepcionesButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; font-size: 28px;transform: scaleX(-1); position: absolute; left: 1;">🚚</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; opacity: 0; position: absolute; left: 16px; ">EXCEPCIONES</span>';
    excepcionesButton.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; z-index: 10000;
        width: 45px; height: 45px; background-color: #003366; color: white;
        border: none; border-radius: 50%; cursor: pointer; font-size: 24px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;
        overflow: hidden; white-space: nowrap; padding: 0;
    `;

    let isExcepcionesHovering = false;
    let isExcepcionesExpanded = false;

    function expandExcepcionesBtn() {
        const emoji = excepcionesButton.querySelector('.emoji');
        const text = excepcionesButton.querySelector('.text');
        excepcionesButton.style.width = '200px'; excepcionesButton.style.borderRadius = '22.5px';
        excepcionesButton.style.padding = '0 16px'; excepcionesButton.style.justifyContent = 'flex-start';
        emoji.style.transition = 'transform 0.8s ease, opacity 0.1s ease 0.55s';
        emoji.style.transform = 'scaleX(-1) translateX(-190px)';
        text.style.display = 'block'; text.style.transition = 'opacity 0.3s ease 0.1s'; text.style.opacity = '1';
        setTimeout(() => { emoji.style.opacity = '0'; }, 350);
    }

    function collapseExcepcionesBtn() {
        const emoji = excepcionesButton.querySelector('.emoji');
        const text = excepcionesButton.querySelector('.text');
        text.style.transition = 'opacity 0.2s ease'; text.style.opacity = '0';
        emoji.style.opacity = '1'; emoji.style.transition = 'transform 0.6s ease, opacity 0.1s ease';
        emoji.style.transform = 'scaleX(-1) translateX(0)';
        setTimeout(() => { text.style.display = 'none'; }, 400);
        excepcionesButton.style.width = '45px'; excepcionesButton.style.borderRadius = '50%';
        excepcionesButton.style.padding = '0'; excepcionesButton.style.justifyContent = 'center';
    }

    excepcionesButton.addEventListener('mouseenter', () => {
        isExcepcionesHovering = true;
        if (!isExcepcionesExpanded) expandExcepcionesBtn();
    });
    excepcionesButton.addEventListener('mouseleave', () => {
        isExcepcionesHovering = false;
        if (!isExcepcionesExpanded) collapseExcepcionesBtn();
    });

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        position: fixed; bottom: 75px; left: 20px; z-index: 9999;
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
        max-width: 800px; opacity: 0; transform: scale(0.8);
        pointer-events: none; transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    let isExpanded = false;

    excepcionesButton.addEventListener('click', () => {
        isExcepcionesExpanded = !isExcepcionesExpanded;
        isExpanded = !isExpanded;

        if (isExpanded) {
            expandExcepcionesBtn();
            buttonContainer.style.opacity = '1'; buttonContainer.style.transform = 'scale(1)';
            buttonContainer.style.pointerEvents = 'auto';
            excepcionesButton.style.opacity = '0.5'; excepcionesButton.style.transform = 'scale(0.9)';
        } else {
            collapseExcepcionesBtn();
            buttonContainer.style.opacity = '0'; buttonContainer.style.transform = 'scale(0.8)';
            buttonContainer.style.pointerEvents = 'none';
            excepcionesButton.style.opacity = '1'; excepcionesButton.style.transform = 'scale(1)';
        }
    });

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

    function createExceptionButton(config) {
        const button = document.createElement('button');
        button.textContent = config.text;
        button.style.cssText = `
            padding: 12px 16px; background-color: ${config.color};
            color: ${config.textColor || 'white'}; border: none; border-radius: 22.5px;
            cursor: pointer; font-family: 'Roboto', Arial, sans-serif;
            font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: all 0.3s; white-space: nowrap;
        `;
        button.addEventListener('mouseenter', () => { button.style.transform = 'scale(1.05)'; button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)'; });
        button.addEventListener('mouseleave', () => { button.style.transform = 'scale(1)'; button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)'; });
        button.addEventListener('click', () => {
            if (isMultidropMode && multidropQueue.length > 0) { dropAllMultidrop(config.dropzone, button); }
            else { dropTote(config.dropzone, button); }
        });
        return button;
    }

    // ─── ASSEMBLE UI ────────────────────────────────────────────────────────────

    topRightContainer.appendChild(readyToStowButton);
    topRightContainer.appendChild(recycleButton);
    topRightContainer.appendChild(editToPendingButton);
    topRightContainer.appendChild(dptButton);
    topRightContainer.appendChild(pandashButton);
    topRightContainer.appendChild(multidropButton);

    otherButtons.forEach(config => { buttonContainer.appendChild(createExceptionButton(config)); });

    document.body.appendChild(topRightContainer);
    document.body.appendChild(excepcionesButton);
    document.body.appendChild(buttonContainer);

    // ══════════════════════════════════════════════════════════════════════════════
    // ██  SECTION 3: OBSERVER & INIT
    // ══════════════════════════════════════════════════════════════════════════════

    const observer = new MutationObserver(function(mutations) {
        insertSearchButtons();
    });

    setTimeout(function() {
        observer.observe(document.body, { childList: true, subtree: true });
        insertSearchButtons();
        console.log(`[${new Date().toISOString()}] Observer started`);
    }, 2000);

    console.log(`[${new Date().toISOString()}] Sideline All-in-One fully loaded`);

})();

