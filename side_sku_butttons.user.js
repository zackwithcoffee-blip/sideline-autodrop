
// ==UserScript==
// @name         Sideline FCResearch and TTSIM Search Buttons
// @namespace    http://tampermonkey.net/
// @version      4.5
// @description  Adds clickable buttons to search FNSKU in FCResearch, TTSIM and Diver. Checks if tote is reactive.WIP
// @author       juagarcm
// @match        https://aft-poirot-website.eu.aftx.amazonoperations.app/?tool=V3
// @connect      reactive-hunter.eu-aces.amazon.dev
// @connect      api.eu-west-1.cx-hunter.eu-aces.amazon.dev
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

(function() {
    'use strict';

    console.log(`[${new Date().toISOString()}] Sideline v3.9 initialized`);

    // ─── REACTIVE HUNTER ────────────────────────────────────────────────────────

    function getToteId() {
        const el = document.getElementById('source-container-label');
        if (el) {
            const tote = el.textContent.trim();
            if (tote.startsWith('tsX')) {
                console.log(`[${new Date().toISOString()}] Tote ID found: ${tote}`);
                return tote;
            }
        }
        console.log(`[${new Date().toISOString()}] No valid tote ID found`);
        return null;
    }

    function clearReactiveWarning() {
        const existing = document.getElementById('reactive-warning-badge');
        if (existing) existing.remove();
    }

    function showReactiveWarning(toteEl) {
        clearReactiveWarning();
        const badge = document.createElement('span');
        badge.id = 'reactive-warning-badge';
        badge.textContent = '☢️🚨';
        badge.style.cssText = `
            font-size: 1.4em;
            margin-left: 6px;
            vertical-align: middle;
            display: inline-block;
            animation: reactive-pulse 1s infinite alternate;
        `;
        if (!document.getElementById('reactive-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'reactive-pulse-style';
            style.textContent = `
                @keyframes reactive-pulse {
                    from { opacity: 1; transform: scale(1); }
                    to   { opacity: 0.6; transform: scale(1.15); }
                }
            `;
            document.head.appendChild(style);
        }
        toteEl.parentNode.insertBefore(badge, toteEl.nextSibling);
        console.log(`[${new Date().toISOString()}] Reactive warning displayed`);
    }

 function checkReactiveStatus() {
    const toteId = getToteId();
    if (!toteId) return;

    clearReactiveWarning();

    // Store tote ID in shared Tampermonkey storage
    GM_setValue('sideline_tote_check', toteId);
    GM_deleteValue('sideline_tote_result');

    console.log(`[${new Date().toISOString()}] Tote ${toteId} stored for reactive check`);

    // Poll for result written by the companion script (up to 10 seconds)
    let attempts = 0;
    const poll = setInterval(() => {
        attempts++;
        const result = GM_getValue('sideline_tote_result', null);
        if (result !== null) {
            clearInterval(poll);
            if (result === 'reactive') {
                console.log(`[${new Date().toISOString()}] Tote ${toteId} IS reactive!`);
                const toteEl = document.getElementById('source-container-label');
                if (toteEl) showReactiveWarning(toteEl);
            } else {
                console.log(`[${new Date().toISOString()}] Tote ${toteId} is NOT reactive`);
            }
        } else if (attempts >= 20) {
            clearInterval(poll);
            console.warn(`[${new Date().toISOString()}] Reactive check timed out — is the companion script running on Reactive Hunter?`);
        }
    }, 500);
}

    // ─── FNSKU BUTTONS ──────────────────────────────────────────────────────────


// ─── FNSKU BUTTONS ──────────────────────────────────────────────────────────

function isValidCode(code) {
    if (!code) return false;
    if (/^B0[A-Z0-9]{8}$/.test(code)) return true;   // ASIN
    if (/^X0[A-Z0-9]{8}$/.test(code)) return true;   // FNSKU X0
    if (/^LPN[A-Z0-9]+$/.test(code)) return true;    // LPN
    if (/^\d{10,13}$/.test(code)) return true;        // ISBN / EAN
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
        const oneMonthLater = new Date(today);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        const fmt = d => d.toISOString().split('T')[0];
        const diverUrl = `https://diver.qts.amazon.dev/tools/transshipment/dashboards/aging_transfers?destination_warehouse_id=&search=${fnsku}&source_warehouse_id=MAD7&startDate=${fmt(today)}&endDate=${fmt(oneMonthLater)}`;
        window.open(diverUrl, '_blank');
        console.log(`[${new Date().toISOString()}] Opened Diver for: ${fnsku}`);
    };
    button.title = `Search ${fnsku} transshipments in Diver (next 30 days)`;
    return button;
}

function insertSearchButtons() {
    const allTags = Array.from(document.querySelectorAll('alchemy-tag'));

    for (const tag of allTags) {
        const code = getFNSKUFromTag(tag);
        if (!code) continue;

        const markerId = `fcresearch-btn-${code}`;
        if (document.getElementById(markerId)) continue;

        // Strip spacing from the tag itself
        tag.style.marginRight = '5px';
        tag.style.paddingRight = '3px';

        // Strip spacing from the parent container too
        const parent = tag.parentNode;
        if (parent) {
            parent.style.gap = '5px';
            parent.style.paddingRight = '2px';
        }

        console.log(`[${new Date().toISOString()}] Inserting buttons for: ${code}`);

        const fcBtn = createFCResearchButton(code);
        fcBtn.id = markerId;

        const ttBtn = createTTSIMButton(code);
        ttBtn.id = `ttsim-btn-${code}`;

        const diverBtn = createDiverButton(code);
        diverBtn.id = `diver-btn-${code}`;

        tag.parentNode.insertBefore(fcBtn, tag.nextSibling);
        tag.parentNode.insertBefore(ttBtn, fcBtn.nextSibling);
        tag.parentNode.insertBefore(diverBtn, ttBtn.nextSibling);

        console.log(`[${new Date().toISOString()}] Buttons inserted for: ${code}`);
    }
}
    // ─── OBSERVER & INIT ────────────────────────────────────────────────────────

    let reactiveCheckTimeout = null;
    const observer = new MutationObserver(function(mutations) {
        insertSearchButtons();
        clearTimeout(reactiveCheckTimeout);
        reactiveCheckTimeout = setTimeout(() => {
            checkReactiveStatus();
        }, 800);
    });

    setTimeout(function() {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        insertSearchButtons();
        checkReactiveStatus();
        console.log(`[${new Date().toISOString()}] Observer started`);
    }, 2000);

})();

