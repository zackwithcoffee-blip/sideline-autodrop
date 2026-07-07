// ==UserScript==
// @name         FCLM Portal - ICQA PS Dashboard
// @namespace    http://tampermonkey.net/
// @version      10.7
// @description  ICQA PS floating dashboard: Stow HC, Counters (CC/SRC/SBC), Net0, Andons (FC Andon + Wave), Andon Tracker, Resolved Stats
// @author       juagarcm
// @match        https://fclm-portal.amazon.com/reports/functionRollup*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @connect      dachs.corp.amazon.com
// @connect      fc-andons-eu.corp.amazon.com
// @connect      wave.qubit.amazon.dev
// @connect      vantage.amazon.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const FC = 'MAD7';
    const ZONES = ['paKivaA02', 'paKivaA03', 'paKivaA04'];
    const FLOOR_LABELS = { paKivaA02: 'P2', paKivaA03: 'P3', paKivaA04: 'P4' };
    const WAVE_API = `https://wave.qubit.amazon.dev/api/proxy?iam-proxy/5u91tf0tz0/us-east-1/staffing-metrics?warehouseId=${FC}&userType=ICQA-ANDONS`;
    const REFRESH_INTERVAL = 600000;

    const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

    let collapsed = false;
    let stowExpanded = false;
    let counterExpanded = false;
    let loginExpanded = false;
    let trackedLogins = JSON.parse(GM_getValue('icqaps_logins', '[]'));

    let net0Count = '---', net0Floors = {};
    let andonCount = '---', andonFloors = {};
    let stowCount = '---', stowFloors = { P2: 0, P3: 0, P4: 0 };
    let counterTotal = 0;
    let counterFloors = { P2: { CC: [], SRC: [], SBC: [] }, P3: { CC: [], SRC: [], SBC: [] }, P4: { CC: [], SRC: [], SBC: [] } };
    let loginAndonCounts = {};
    let resolvedShiftTotal = 0, resolvedShiftNoIssue = 0, resolvedByAA = {};

    console.log('[ICQA PS] v9.5 loaded');

    const CSS = `
        #icqaps {
            position: fixed; top: 306px; right: 20px; z-index: 99999;
            background: rgba(13,31,60,0.94); border: 1px solid #001f3f;
            border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            width: 141px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            overflow: visible; transition: transform 0.2s, box-shadow 0.2s;
        }
        #icqaps:hover { transform: scale(1.03); box-shadow: 0 6px 16px rgba(0,0,0,0.5); }
        #icqaps-header {
            font-size: 9px; font-weight: bold; color: #fff;
            background: rgba(0,31,63,0.85); border-bottom: 1px solid rgba(255,255,255,0.1);
            text-align: center; padding: 5px 0; letter-spacing: 1.5px;
            text-transform: uppercase; cursor: pointer; user-select: none;
        }
        #icqaps-arrow { font-size: 7px; margin-left: 3px; display: inline-block; transition: transform 0.3s; }
        #icqaps-body { transition: max-height 0.3s ease, opacity 0.3s ease; max-height: 700px; opacity: 1; overflow: visible; }
        #icqaps-body.collapsed { max-height: 0; opacity: 0; overflow: hidden; }

        .icqaps-stow { border-bottom: 1px solid rgba(255,255,255,0.1); }
        .icqaps-stow-hdr {
            display: flex; align-items: center; justify-content: space-between;
            padding: 4px 8px; cursor: pointer; user-select: none;
        }
        .icqaps-stow-hdr:hover { background: rgba(255,255,255,0.03); }
        .icqaps-stow-label { font-size: 8px; color: #bdc3c7; letter-spacing: 1px; }
        .icqaps-stow-val { font-size: 13px; font-weight: 900; font-family: 'Courier New', monospace; }
        .icqaps-stow-body { max-height: 0; overflow: hidden; transition: max-height 0.3s; }
        .icqaps-stow-body.expanded { max-height: 150px; }
        .icqaps-stow-floor { display: flex; align-items: center; justify-content: space-between; padding: 3px 10px; }
        .icqaps-stow-floor-label { font-size: 10px; color: #ccc; font-weight: bold; }
        .icqaps-stow-floor-val { font-size: 12px; font-weight: 900; font-family: 'Courier New', monospace; }

        .icqaps-counters { border-bottom: 1px solid rgba(255,255,255,0.1); }
        .icqaps-counters-hdr {
            display: flex; align-items: center; justify-content: space-between;
            padding: 4px 8px; cursor: pointer; user-select: none; position: relative;
        }
        .icqaps-counters-hdr:hover { background: rgba(255,255,255,0.03); }
        .icqaps-counters-label { font-size: 8px; color: #bdc3c7; letter-spacing: 1px; }
        .icqaps-counters-total { font-size: 13px; font-weight: 900; color: #fff; font-family: 'Courier New', monospace; }
        .icqaps-counters-body { max-height: 0; overflow: hidden; transition: max-height 0.3s; }
        .icqaps-counters-body.expanded { max-height: 200px; overflow: visible; }
        .icqaps-floor-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 3px 10px; position: relative; cursor: default;
        }
        .icqaps-floor-label { font-size: 10px; color: #ccc; font-weight: bold; }
        .icqaps-floor-val { font-size: 12px; font-weight: 900; color: #fff; font-family: 'Courier New', monospace; }

        .icqaps-floor-tip {
            display: none; position: absolute; bottom: calc(100% + 2px); left: 50%;
            transform: translateX(-60%);
            background: rgba(0,0,0,0.94); border: 1px solid rgba(255,255,255,0.2);
            border-radius: 5px; padding: 8px 10px; min-width: 180px;
            z-index: 100001; box-shadow: 0 4px 12px rgba(0,0,0,0.6); white-space: nowrap;
            pointer-events: auto;
        }
        .icqaps-floor-tip-title {
            color: #fff; font-size: 9px; font-weight: bold; margin-bottom: 4px;
            border-bottom: 1px solid #333; padding-bottom: 3px;
            display: flex; align-items: center; justify-content: space-between;
        }
        .icqaps-floor-tip-section {
            display: flex; align-items: center; gap: 5px;
            color: #f39c12; font-size: 9px; font-weight: bold; margin-top: 5px;
        }
        .icqaps-floor-tip-login { color: #ccc; font-size: 11px; padding: 1px 0 1px 6px; display: flex; justify-content: space-between; align-items: center; }
        .icqaps-floor-tip-time { font-size: 9px; font-weight: bold; font-family: 'Courier New', monospace; margin-left: 8px; }
        .icqaps-copy-btn {
            display: inline-flex; align-items: center; justify-content: center;
            color: #888; cursor: pointer; padding: 1px; border-radius: 2px;
            transition: color 0.2s, background 0.2s;
        }
        .icqaps-copy-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .icqaps-copy-btn.copied { color: #2ecc71; }
        .icqaps-copy-all-btn {
            display: inline-flex; align-items: center; gap: 3px;
            color: #888; cursor: pointer; padding: 1px 4px; border-radius: 2px;
            font-size: 8px; font-weight: bold; letter-spacing: 0.5px;
            transition: color 0.2s, background 0.2s;
        }
        .icqaps-copy-all-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .icqaps-copy-all-btn.copied { color: #2ecc71; }

        .icqaps-row { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .icqaps-cell {
            flex: 1; text-align: center; padding: 6px 4px;
            position: relative; cursor: pointer;
        }
        .icqaps-cell:first-child { border-right: 1px solid rgba(255,255,255,0.15); }
        .icqaps-cell-label { font-size: 7px; color: #bdc3c7; letter-spacing: 0.5px; margin-bottom: 2px; }
        .icqaps-cell-val { font-size: 16px; font-weight: 900; font-family: 'Courier New', monospace; }

        .icqaps-notif {
            position: absolute; top: -4px; right: -4px;
            width: 12px; height: 12px; border-radius: 50%;
            background: #e74c3c; border: 2px solid rgba(13,31,60,0.94);
            display: none; z-index: 100001;
        }
        .icqaps-notif.visible { display: block; }

        .icqaps-tip {
            display: none; position: absolute; bottom: calc(100% + 4px);
            background: rgba(0,0,0,0.92); border: 1px solid rgba(255,255,255,0.2);
            border-radius: 5px; padding: 8px 12px; white-space: nowrap;
            z-index: 100000; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }
        #icqaps-andon-tip {
            pointer-events: auto; max-height: 300px; overflow-y: auto; min-width: 150px;
        }
        .icqaps-tip-row { display: flex; justify-content: space-between; gap: 16px; padding: 3px 0; }
        .icqaps-tip-label { color: #bdc3c7; font-weight: bold; font-size: 11px; }
        .icqaps-tip-val { font-weight: 900; font-family: 'Courier New', monospace; font-size: 14px; }

        .icqaps-logins { padding: 0; }
        .icqaps-logins-hdr {
            display: flex; align-items: center; justify-content: space-between;
            padding: 4px 8px; cursor: pointer; user-select: none;
        }
        .icqaps-logins-hdr:hover { background: rgba(255,255,255,0.03); }
        .icqaps-logins-label { font-size: 8px; color: #bdc3c7; letter-spacing: 1px; }
        .icqaps-logins-count { font-size: 10px; color: #f39c12; font-weight: bold; }
        .icqaps-logins-body { max-height: 0; overflow: hidden; transition: max-height 0.3s; }
        .icqaps-logins-body.expanded { max-height: 250px; overflow-y: auto; }
        .icqaps-login-input-row { display: flex; gap: 3px; padding: 4px 6px; }
        .icqaps-login-input {
            flex: 1; min-width: 0; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
            border-radius: 3px; color: #fff; font-size: 9px; padding: 3px 4px; outline: none;
            font-family: 'Courier New', monospace;
        }
        .icqaps-login-input::placeholder { color: rgba(255,255,255,0.3); }
        .icqaps-login-input:focus { border-color: rgba(52,152,219,0.6); }
        .icqaps-login-add {
            background: rgba(46,204,113,0.2); border: 1px solid rgba(46,204,113,0.4);
            border-radius: 3px; color: #2ecc71; font-size: 10px; font-weight: bold;
            padding: 2px 6px; cursor: pointer;
        }
        .icqaps-login-add:hover { background: rgba(46,204,113,0.35); }
        .icqaps-login-item { display: flex; align-items: center; justify-content: space-between; padding: 2px 8px; }
        .icqaps-login-left { display: flex; align-items: center; gap: 5px; }
        .icqaps-login-name { font-size: 9px; color: #bdc3c7; font-weight: bold; }
        .icqaps-login-val { font-size: 12px; font-weight: 900; font-family: 'Courier New', monospace; }
        .icqaps-login-rm { font-size: 8px; color: #e74c3c; cursor: pointer; opacity: 0.6; font-weight: bold; }
        .icqaps-login-rm:hover { opacity: 1; }

        .icqaps-dot {
            position: absolute; top: 4px; right: 5px; width: 5px; height: 5px;
            border-radius: 50%; background: #2ecc71; animation: icqaps-pulse 2s infinite;
        }
        .icqaps-dot.loading { background: #f39c12; }
        @keyframes icqaps-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
    `;

    function stowColor(n) { if (n === '---' || n === 0) return '#666'; if (n <= 50) return '#27ae60'; if (n <= 80) return '#f1c40f'; if (n <= 100) return '#e67e22'; return '#e74c3c'; }
    function net0Color(n) { if (n === '---') return '#95a5a6'; if (n === 0) return '#2ecc71'; if (n <= 6) return '#f1c40f'; if (n <= 15) return '#e67e22'; return '#e74c3c'; }
    function andonColor(n) { if (n === '---') return '#95a5a6'; if (n <= 30) return '#2ecc71'; if (n <= 50) return '#f1c40f'; if (n <= 70) return '#e67e22'; return '#e74c3c'; }
    function loginColor(n) { if (n === 0) return '#95a5a6'; if (n <= 3) return '#2ecc71'; if (n <= 6) return '#f1c40f'; if (n <= 10) return '#e67e22'; return '#e74c3c'; }
    function timeColor(mins) { if (mins <= 80) return '#2ecc71'; if (mins <= 100) return '#f1c40f'; if (mins <= 120) return '#e67e22'; return '#e74c3c'; }

    function formatLoggedTime(sessionStartEpoch) {
        if (!sessionStartEpoch) return null;
        const nowEpoch = Date.now() / 1000;
        const diffSecs = Math.max(0, nowEpoch - sessionStartEpoch);
        const hours = Math.floor(diffSecs / 3600);
        const mins = Math.floor((diffSecs % 3600) / 60);
        return { text: `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}`, totalMins: Math.floor(diffSecs / 60) };
    }

    function copyLogins(logins, btnEl) {
        const text = logins.map(c => c.login).join('\n');
        GM_setClipboard(text, 'text');
        btnEl.classList.add('copied');
        setTimeout(() => btnEl.classList.remove('copied'), 1500);
    }

    function copyAllLogins(data, btnEl) {
        const allLogins = [...(data.CC || []), ...(data.SRC || []), ...(data.SBC || [])];
        const text = allLogins.map(c => c.login).join('\n');
        GM_setClipboard(text, 'text');
        btnEl.classList.add('copied');
        setTimeout(() => btnEl.classList.remove('copied'), 1500);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH: NET0
    // ═══════════════════════════════════════════════════════════════════════════
    function fetchNet0() {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://dachs.corp.amazon.com/audit_aggregator?warehouse_id=${FC}&research=false&_=${Date.now()}`,
                headers: { 'Accept': 'application/json, text/javascript, */*; q=0.01', 'X-Requested-With': 'XMLHttpRequest' },
                onload: r => {
                    try {
                        const json = JSON.parse(r.responseText);
                        if (json.data && Array.isArray(json.data)) {
                            net0Count = json.data.length;
                            net0Floors = {};
                            json.data.forEach(item => { const f = item[2]; if (f) net0Floors[f] = (net0Floors[f] || 0) + 1; });
                        } else { net0Count = '---'; net0Floors = {}; }
                    } catch(e) { net0Count = '---'; net0Floors = {}; }
                    resolve();
                },
                onerror: () => { net0Count = '---'; net0Floors = {}; resolve(); }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH: ANDONS (FC Andon API - for total count + creator tracking)
    // ═══════════════════════════════════════════════════════════════════════════
    const ANDON_SYMPTOMS = [
        'Ambiguous Asin','Multiple Scannable Barcodes','Misstickered FBA Item','Broken Set',
        'No Scannable Barcode','Incorrect Binding','Damaged Item','Master Pack',
        'Invalid Cycle Count Result','Bin does not Exist','Multiple ASIN on Pallet',
        'Suspect Theft','No Scannable Bin Label','Unsafe to Count','Incorrect Title','No Bin Divider'
    ];

    const RESOLVED_SYMPTOMS = [
        'Ambiguous Asin','Multiple Scannable Barcodes','Misstickered FBA Item','Broken Set',
        'No Scannable Barcode','Incorrect Binding','Damaged Item','Master Pack',
        'Invalid Cycle Count Result','Bin does not Exist','Multiple ASIN on Pallet',
        'Suspect Theft','No Scannable Bin Label','Unsafe to Count','Incorrect Title','No Bin Divider',
        'Unexpected Container Overage'
    ];

    function fetchAndons() {
        const end = new Date();
        const start = new Date(); start.setDate(start.getDate() - 7);
        const startISO = start.toISOString().replace(/\.\d{3}Z$/, '.000Z');
        const endISO = end.toISOString().replace(/\.\d{3}Z$/, '.999Z');

        const promises = ANDON_SYMPTOMS.map(symptom => new Promise(resolve => {
            const url = `https://fc-andons-eu.corp.amazon.com/api/problems/${FC}/Bin%20Item%20Defects?symptom=${encodeURIComponent(symptom)}&resolved=false&startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}&maxResults=100`;
            GM_xmlhttpRequest({
                method: 'GET', url, headers: { 'Accept': 'application/json' },
                onload: r => { try { resolve(JSON.parse(r.responseText).problems || []); } catch(e) { resolve([]); } },
                onerror: () => resolve([])
            });
        }));

        return Promise.all(promises).then(results => {
            let total = 0;
            loginAndonCounts = {};
            trackedLogins.forEach(l => { loginAndonCounts[l] = 0; });
            results.forEach(problems => {
                total += problems.length;
                problems.forEach(p => {
                    const user = p.createdByUser;
                    if (user && loginAndonCounts.hasOwnProperty(user)) loginAndonCounts[user]++;
                });
            });
            andonCount = total;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH: ANDON FLOORS (Wave API - for per-floor breakdown)
    // ═══════════════════════════════════════════════════════════════════════════
    function fetchAndonFloors() {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: WAVE_API,
                headers: { 'Accept': 'application/json' },
                onload: r => {
                    try {
                        const json = JSON.parse(r.responseText);
                        andonFloors = {};
                        for (const plant in json) {
                            if (json[plant] && json[plant].PHYSICAL) {
                                const count = parseInt(json[plant].PHYSICAL, 10);
                                andonFloors[plant] = count;
                            }
                        }
                        console.log('[ICQA PS] Andon floors (Wave):', andonFloors);
                    } catch(e) { andonFloors = {}; }
                    resolve();
                },
                onerror: () => { andonFloors = {}; resolve(); }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SHIFT BOUNDARIES (Madrid local time → UTC epoch seconds)
    // ═══════════════════════════════════════════════════════════════════════════
    function getShiftBoundaries() {
        const now = new Date();
        const madridNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
        const hour = madridNow.getHours();
        const y = madridNow.getFullYear(), m = madridNow.getMonth(), d = madridNow.getDate();

        const utcNow = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const offsetHours = Math.round((madridNow - utcNow) / 3600000);

        let startH, endH, endDayOffset = 0;

        if (hour >= 7 && hour < 15) {
            startH = 7; endH = 15;
        } else if (hour >= 15 && hour < 23) {
            startH = 15; endH = 23;
        } else if (hour >= 23) {
            startH = 23; endH = 7; endDayOffset = 1;
        } else {
            startH = 23; endH = 7;
            const startEpoch = Date.UTC(y, m, d - 1, startH - offsetHours, 0, 0) / 1000;
            const endEpoch = Date.UTC(y, m, d, endH - offsetHours, 0, 0) / 1000;
            return { startEpoch, endEpoch };
        }

        const startEpoch = Date.UTC(y, m, d, startH - offsetHours, 0, 0) / 1000;
        const endEpoch = Date.UTC(y, m, d + endDayOffset, endH - offsetHours, 0, 0) / 1000;
        return { startEpoch, endEpoch };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH: RESOLVED ANDONS (for current shift)
    // ═══════════════════════════════════════════════════════════════════════════
    function fetchResolvedAndons() {
        const { startEpoch, endEpoch } = getShiftBoundaries();
        console.log(`[ICQA PS] Shift boundaries: ${new Date(startEpoch*1000).toISOString()} → ${new Date(endEpoch*1000).toISOString()}`);

        const qStart = new Date((startEpoch - 7 * 86400) * 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z');
        const qEnd = new Date(Date.now() + 3600000).toISOString().replace(/\.\d{3}Z$/, '.999Z');

        const fetchAllPages = (symptom) => {
            return new Promise(resolve => {
                let allProblems = [];
                const fetchPage = (token) => {
                    let url = `https://fc-andons-eu.corp.amazon.com/api/problems/${FC}/Bin%20Item%20Defects?symptom=${encodeURIComponent(symptom)}&resolved=true&startDate=${encodeURIComponent(qStart)}&endDate=${encodeURIComponent(qEnd)}&maxResults=100`;
                    if (token) url += `&nextToken=${encodeURIComponent(token)}`;

                    GM_xmlhttpRequest({
                        method: 'GET', url, headers: { 'Accept': 'application/json' },
                        onload: r => {
                            try {
                                const json = JSON.parse(r.responseText);
                                const problems = json.problems || [];
                                allProblems = allProblems.concat(problems);
                                if (json.token) {
                                    fetchPage(json.token);
                                } else {
                                    resolve(allProblems);
                                }
                            } catch(e) {
                                resolve(allProblems);
                            }
                        },
                        onerror: () => resolve(allProblems)
                    });
                };
                fetchPage(null);
            });
        };

        const promises = RESOLVED_SYMPTOMS.map(symptom => fetchAllPages(symptom));

        return Promise.all(promises).then(results => {
            let total = 0, noIssue = 0;
            const byAA = {};
            let skippedDuplicates = 0;
            results.forEach(problems => {
                problems.forEach(p => {
                    // Skip auto-resolved duplicates (WAVE resolves these with null assignedUser)
                    if (!p.assignedUser) {
                        skippedDuplicates++;
                        return;
                    }

                    let resolvedAt = null;
                    if (typeof p.lastUpdatedDate === 'number') {
                        resolvedAt = p.lastUpdatedDate;
                    } else if (p.lastUpdatedDate && typeof p.lastUpdatedDate === 'object') {
                        resolvedAt = p.lastUpdatedDate.parsedValue;
                        if (!resolvedAt && p.lastUpdatedDate.rawValue) {
                            resolvedAt = new Date(p.lastUpdatedDate.rawValue).getTime() / 1000;
                        }
                    }
                    if (resolvedAt && resolvedAt > 10000000000) resolvedAt = resolvedAt / 1000;

                    if (resolvedAt && resolvedAt >= startEpoch && resolvedAt < endEpoch) {
                        total++;
                        const isNoIssue = p.rootCause === 'No Issue';
                        if (isNoIssue) noIssue++;
                        const aa = p.assignedUser;
                        if (!byAA[aa]) byAA[aa] = { total: 0, noIssue: 0 };
                        byAA[aa].total++;
                        if (isNoIssue) byAA[aa].noIssue++;
                    }
                });
            });
            resolvedShiftTotal = total;
            resolvedShiftNoIssue = noIssue;
            resolvedByAA = byAA;

            if (skippedDuplicates > 0) {
                console.log(`[ICQA PS] Skipped ${skippedDuplicates} auto-resolved duplicates (no assignedUser)`);
            }
            console.log(`[ICQA PS] Resolved: in shift: ${total}, No Issue: ${noIssue}, AAs: ${Object.keys(byAA).length}`);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH: STOW
    // ═══════════════════════════════════════════════════════════════════════════
    function fetchStow() {
        return new Promise(resolve => {
            const url = `https://vantage.amazon.com/api/eu-west-1/fulfillment?dataset=station_work%2Fstation_staffing_summary_counts&warehouse=${FC}&zone=${ZONES.join(',')}`;
            GM_xmlhttpRequest({
                method: 'GET', url, headers: { 'Accept': 'application/json' },
                onload: r => {
                    try {
                        const data = JSON.parse(r.responseText);
                        let total = 0;
                        stowFloors = { P2: 0, P3: 0, P4: 0 };
                        data.forEach(z => { const s = z.stow || 0; total += s; const fl = FLOOR_LABELS[z.zone]; if (fl) stowFloors[fl] = s; });
                        stowCount = total;
                    } catch(e) { stowCount = '---'; stowFloors = { P2: 0, P3: 0, P4: 0 }; }
                    resolve();
                },
                onerror: () => { stowCount = '---'; stowFloors = { P2: 0, P3: 0, P4: 0 }; resolve(); }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH: COUNTERS (with session_start_time for logged hours)
    // ═══════════════════════════════════════════════════════════════════════════
    function fetchCounters() {
        const mapPromises = ZONES.map(zone => new Promise(resolve => {
            const url = `https://vantage.amazon.com/api/eu-west-1/fulfillment?dataset=station_map%2Fstations_with_station_metrics&podGapLookBackInMinutes=15&warehouse=${FC}&zone=${zone}`;
            GM_xmlhttpRequest({
                method: 'GET', url, headers: { 'Accept': 'application/json' },
                onload: r => { try { resolve({ zone, data: JSON.parse(r.responseText) }); } catch(e) { resolve({ zone, data: [] }); } },
                onerror: () => resolve({ zone, data: [] })
            });
        }));

        const assocPromise = new Promise(resolve => {
            const url = `https://vantage.amazon.com/api/eu-west-1/fulfillment?dataset=station_work%2Fstations_with_associate_metrics&warehouse=${FC}&zone=${ZONES.join(',')}`;
            GM_xmlhttpRequest({
                method: 'GET', url, headers: { 'Accept': 'application/json' },
                onload: r => { try { resolve(JSON.parse(r.responseText)); } catch(e) { resolve([]); } },
                onerror: () => resolve([])
            });
        });

        return Promise.all([Promise.all(mapPromises), assocPromise]).then(([mapResults, assocs]) => {
            const counterStations = {};
            mapResults.forEach(({ zone, data }) => {
                const floorLabel = FLOOR_LABELS[zone];
                data.forEach(station => {
                    const mode = station.station_mode;
                    if (mode === 'SRC' || mode === 'SBC') {
                        counterStations[station.id] = { mode, floor: floorLabel };
                    }
                });
            });

            return new Promise(resolve => {
                const url = `https://vantage.amazon.com/api/eu-west-1/fulfillment?dataset=station_work%2Fstations_with_station_metrics&warehouse=${FC}&zone=${ZONES.join(',')}`;
                GM_xmlhttpRequest({
                    method: 'GET', url, headers: { 'Accept': 'application/json' },
                    onload: r => {
                        try {
                            JSON.parse(r.responseText).forEach(s => {
                                const opMode = s.operating_mode || '';
                                if (opMode.includes('Cycle Count') && !counterStations[s.station_id]) {
                                    const fl = FLOOR_LABELS[s.floor] || '';
                                    if (fl) counterStations[s.station_id] = { mode: 'CC', floor: fl };
                                }
                            });
                        } catch(e) {}
                        resolve();
                    },
                    onerror: () => resolve()
                });
            }).then(() => {
                counterFloors = { P2: { CC: [], SRC: [], SBC: [] }, P3: { CC: [], SRC: [], SBC: [] }, P4: { CC: [], SRC: [], SBC: [] } };
                counterTotal = 0;

                assocs.forEach(a => {
                    if (counterStations[a.station_id]) {
                        const info = counterStations[a.station_id];
                        if (counterFloors[info.floor] && counterFloors[info.floor][info.mode]) {
                            counterFloors[info.floor][info.mode].push({
                                login: a.user_id,
                                name: a.user_name,
                                sessionStart: a.session_start_time || null
                            });
                            counterTotal++;
                        }
                    }
                });
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREATE DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════════
    function createDashboard() {
        if (document.getElementById('icqaps')) return;
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        const dash = document.createElement('div');
        dash.id = 'icqaps';
        dash.innerHTML = `
            <div class="icqaps-dot" id="icqaps-dot"></div>
            <div class="icqaps-notif" id="icqaps-notif"></div>
            <div id="icqaps-header">ICQA PS <span id="icqaps-arrow">▼</span></div>
            <div id="icqaps-body">
                <div class="icqaps-stow">
                    <div class="icqaps-stow-hdr" id="icqaps-stow-hdr">
                        <span class="icqaps-stow-label">STOW</span>
                        <span class="icqaps-stow-val" id="icqaps-stow">---</span>
                    </div>
                    <div class="icqaps-stow-body" id="icqaps-stow-body"></div>
                </div>
                <div class="icqaps-counters">
                    <div class="icqaps-counters-hdr" id="icqaps-counters-hdr">
                        <span class="icqaps-counters-label">COUNTERS</span>
                        <span class="icqaps-counters-total" id="icqaps-counters-total">---</span>
                        <div class="icqaps-floor-tip" id="icqaps-ftip-total"></div>
                    </div>
                    <div class="icqaps-counters-body" id="icqaps-counters-body"></div>
                </div>
                <div class="icqaps-row">
                    <div class="icqaps-cell" id="icqaps-net0-cell">
                        <div class="icqaps-cell-label">NET0</div>
                        <div class="icqaps-cell-val" id="icqaps-net0">---</div>
                        <div class="icqaps-tip" id="icqaps-net0-tip" style="left:-4px;"></div>
                    </div>
                    <div class="icqaps-cell" id="icqaps-andon-cell">
                        <div class="icqaps-cell-label">ANDON</div>
                        <div class="icqaps-cell-val" id="icqaps-andon">---</div>
                        <div class="icqaps-tip" id="icqaps-andon-tip" style="right:-4px;"></div>
                    </div>
                </div>
                <div class="icqaps-logins">
                    <div class="icqaps-logins-hdr" id="icqaps-logins-hdr">
                        <span class="icqaps-logins-label">ANDON TRACKER</span>
                        <span class="icqaps-logins-count" id="icqaps-logins-count">(${trackedLogins.length})</span>
                    </div>
                    <div class="icqaps-logins-body" id="icqaps-logins-body">
                        <div class="icqaps-login-input-row">
                            <input class="icqaps-login-input" id="icqaps-login-input" placeholder="add login..." />
                            <div class="icqaps-login-add" id="icqaps-login-add">+</div>
                        </div>
                        <div id="icqaps-login-list"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dash);

        document.getElementById('icqaps-header').onclick = () => {
            collapsed = !collapsed;
            document.getElementById('icqaps-body').classList.toggle('collapsed', collapsed);
            document.getElementById('icqaps-arrow').style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        };

        document.getElementById('icqaps-stow-hdr').onclick = () => {
            stowExpanded = !stowExpanded;
            document.getElementById('icqaps-stow-body').classList.toggle('expanded', stowExpanded);
        };

        const countersHdr = document.getElementById('icqaps-counters-hdr');
        const totalTip = document.getElementById('icqaps-ftip-total');
        countersHdr.onclick = () => {
            counterExpanded = !counterExpanded;
            document.getElementById('icqaps-counters-body').classList.toggle('expanded', counterExpanded);
        };
        countersHdr.onmouseenter = () => { updateTotalCounterTip(); totalTip.style.display = 'block'; };
        countersHdr.onmouseleave = () => { if (!totalTip.matches(':hover')) totalTip.style.display = 'none'; };
        totalTip.onmouseleave = () => { totalTip.style.display = 'none'; };

        const net0Cell = document.getElementById('icqaps-net0-cell');
        net0Cell.onmouseenter = () => { updateNet0Tip(); document.getElementById('icqaps-net0-tip').style.display = 'block'; };
        net0Cell.onmouseleave = () => { document.getElementById('icqaps-net0-tip').style.display = 'none'; };
        net0Cell.onclick = () => window.open('https://dachs.corp.amazon.com/bincheck', '_blank');

        const andonCell = document.getElementById('icqaps-andon-cell');
        const andonTip = document.getElementById('icqaps-andon-tip');
        andonCell.onmouseenter = () => { updateAndonTip(); andonTip.style.display = 'block'; };
        andonCell.onmouseleave = () => { if (!andonTip.matches(':hover')) andonTip.style.display = 'none'; };
        andonTip.onmouseleave = () => { andonTip.style.display = 'none'; };
        andonCell.onclick = () => window.open('https://wave.qubit.amazon.dev/command-center/ICQA-ANDONS', '_blank');

        document.getElementById('icqaps-logins-hdr').onclick = () => {
            loginExpanded = !loginExpanded;
            document.getElementById('icqaps-logins-body').classList.toggle('expanded', loginExpanded);
        };
        document.getElementById('icqaps-login-add').onclick = handleAddLogin;
        document.getElementById('icqaps-login-input').onkeydown = e => { if (e.key === 'Enter') handleAddLogin(); };
        document.getElementById('icqaps-login-input').onclick = e => e.stopPropagation();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOGIN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    function handleAddLogin() {
        const input = document.getElementById('icqaps-login-input');
        const login = input.value.trim().toLowerCase();
        if (login && !trackedLogins.includes(login)) {
            trackedLogins.push(login);
            GM_setValue('icqaps_logins', JSON.stringify(trackedLogins));
            input.value = '';
            fetchAndons().then(updateUI);
        }
    }

    function removeLogin(login) {
        trackedLogins = trackedLogins.filter(l => l !== login);
        GM_setValue('icqaps_logins', JSON.stringify(trackedLogins));
        delete loginAndonCounts[login];
        updateUI();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE UI
    // ═══════════════════════════════════════════════════════════════════════════
    function updateUI() {
        const stowEl = document.getElementById('icqaps-stow');
        stowEl.textContent = stowCount;
        stowEl.style.color = stowColor(stowCount);

        const stowBody = document.getElementById('icqaps-stow-body');
        stowBody.innerHTML = ['P4', 'P3', 'P2'].map(floor => {
            const val = stowFloors[floor] || 0;
            return `<div class="icqaps-stow-floor"><span class="icqaps-stow-floor-label">${floor}</span><span class="icqaps-stow-floor-val" style="color:${stowColor(val)}">${val}</span></div>`;
        }).join('');

        const net0El = document.getElementById('icqaps-net0');
        net0El.textContent = net0Count;
        net0El.style.color = net0Color(net0Count);
        document.getElementById('icqaps-notif').classList.toggle('visible', net0Count !== '---' && net0Count > 0);

        const andonEl = document.getElementById('icqaps-andon');
        andonEl.textContent = andonCount;
        andonEl.style.color = andonColor(andonCount);

        document.getElementById('icqaps-counters-total').textContent = counterTotal;

        const cBody = document.getElementById('icqaps-counters-body');
        cBody.innerHTML = ['P4', 'P3', 'P2'].map(floor => {
            const fd = counterFloors[floor] || { CC: [], SRC: [], SBC: [] };
            const floorTotal = fd.CC.length + fd.SRC.length + fd.SBC.length;
            return `<div class="icqaps-floor-row" data-floor="${floor}">
                <span class="icqaps-floor-label">${floor}</span>
                <span class="icqaps-floor-val">${floorTotal}</span>
                <div class="icqaps-floor-tip" id="icqaps-ftip-${floor}"></div>
            </div>`;
        }).join('');

        cBody.querySelectorAll('.icqaps-floor-row').forEach(row => {
            const floor = row.dataset.floor;
            const tip = document.getElementById(`icqaps-ftip-${floor}`);
            row.onmouseenter = () => { updateFloorTip(floor); tip.style.display = 'block'; };
            row.onmouseleave = () => { if (!tip.matches(':hover')) tip.style.display = 'none'; };
            tip.onmouseleave = () => { tip.style.display = 'none'; };
        });

        document.getElementById('icqaps-logins-count').textContent = `(${trackedLogins.length})`;
        const list = document.getElementById('icqaps-login-list');
        const sorted = trackedLogins.slice().sort((a, b) => (loginAndonCounts[b] || 0) - (loginAndonCounts[a] || 0));
        list.innerHTML = sorted.map(login => {
            const count = loginAndonCounts[login] || 0;
            return `<div class="icqaps-login-item">
                <div class="icqaps-login-left">
                    <span class="icqaps-login-rm" data-login="${login}">✕</span>
                    <span class="icqaps-login-name">${login}</span>
                </div>
                <span class="icqaps-login-val" style="color:${loginColor(count)}">${count}</span>
            </div>`;
        }).join('');
        list.querySelectorAll('.icqaps-login-rm').forEach(btn => {
            btn.onclick = e => { e.stopPropagation(); removeLogin(btn.dataset.login); };
        });
    }

    function updateNet0Tip() {
        const tip = document.getElementById('icqaps-net0-tip');
        tip.innerHTML = [{ key: 'paKivaA04', label: 'P4' }, { key: 'paKivaA03', label: 'P3' }, { key: 'paKivaA02', label: 'P2' }].map(p => {
            const val = net0Floors[p.key] || 0;
            return `<div class="icqaps-tip-row"><span class="icqaps-tip-label">${p.label}</span><span class="icqaps-tip-val" style="color:${net0Color(val)}">${val}</span></div>`;
        }).join('');
    }

    function updateAndonTip() {
        const tip = document.getElementById('icqaps-andon-tip');

        const floorHtml = [{ key: 'paKivaA04', label: 'P4' }, { key: 'paKivaA03', label: 'P3' }, { key: 'paKivaA02', label: 'P2' }].map(p => {
            const val = andonFloors[p.key] || 0;
            return `<div style="display:flex; justify-content:space-between; gap:10px; padding:2px 0;">
                <span style="color:#bdc3c7; font-weight:bold; font-size:11px;">${p.label}</span>
                <span style="font-weight:900; font-family:'Courier New',monospace; font-size:14px; color:${andonColor(val)};">${val}</span>
            </div>`;
        }).join('');

        let resolvedHtml = `
            <div style="display:flex; justify-content:space-between; gap:10px; padding:3px 0;">
                <span style="color:#2ecc71; font-weight:bold; font-size:10px;">CLOSED</span>
                <span style="font-weight:900; font-family:'Courier New',monospace; font-size:15px; color:#2ecc71;">${resolvedShiftTotal}</span>
            </div>
            <div style="display:flex; justify-content:space-between; gap:10px; padding:3px 0;">
                <span style="color:#e74c3c; font-weight:bold; font-size:10px;">NO ISSUE</span>
                <span style="font-weight:900; font-family:'Courier New',monospace; font-size:15px; color:#e74c3c;">${resolvedShiftNoIssue}</span>
            </div>`;

        const aaEntries = Object.entries(resolvedByAA).sort((a, b) => b[1].total - a[1].total);
        let aaListHtml = '';
        if (aaEntries.length > 0) {
            aaEntries.forEach(([aa, data]) => {
                const noIssueStr = data.noIssue > 0 ? ` <span style="color:#e74c3c; font-size:9px;">(${data.noIssue} NI)</span>` : '';
                aaListHtml += `<div style="display:flex; align-items:center; justify-content:space-between; padding:2px 0; gap:20px;">
                    <span style="color:#bdc3c7; font-size:11px; font-weight:bold;">${aa}</span>
                    <span style="font-weight:900; font-family:'Courier New',monospace; font-size:12px; color:#2ecc71; white-space:nowrap;">${data.total}${noIssueStr}</span>
                </div>`;
            });
        }

        tip.innerHTML = `
            <div style="display:flex; gap:12px;">
                <div style="min-width:60px; border-right:1px solid rgba(255,255,255,0.15); padding-right:10px;">
                    <div style="color:#fff; font-size:8px; font-weight:bold; letter-spacing:1px; margin-bottom:4px; text-align:center;">OPEN</div>
                    ${floorHtml}
                </div>
                <div style="min-width:100px; display:flex; flex-direction:column;">
                    <div style="color:#fff; font-size:8px; font-weight:bold; letter-spacing:1px; margin-bottom:4px; text-align:center;">RESOLVED</div>
                    ${resolvedHtml}
                    <div style="border-top:1px solid rgba(255,255,255,0.1); margin-top:4px; padding-top:4px; max-height:160px; overflow-y:auto;">
                        ${aaListHtml || '<span style="color:#666; font-size:10px;">No AAs yet</span>'}
                    </div>
                </div>
            </div>`;
    }

    function buildCounterTipHtml(title, data) {
        const allLogins = [...(data.CC || []), ...(data.SRC || []), ...(data.SBC || [])];
        let html = `<div class="icqaps-floor-tip-title">
            <span>${title}</span>
            <span class="icqaps-copy-all-btn" data-action="copy-all">${COPY_ICON} ALL</span>
        </div>`;
        const types = ['CC', 'SRC', 'SBC'];
        let hasAny = false;

        types.forEach(type => {
            const logins = data[type] || [];
            if (logins.length > 0) {
                hasAny = true;
                html += `<div class="icqaps-floor-tip-section">
                    <span>${type} (${logins.length})</span>
                    <span class="icqaps-copy-btn" data-type="${type}" data-title="${title}">${COPY_ICON}</span>
                </div>`;
                logins.forEach(c => {
                    const timeInfo = formatLoggedTime(c.sessionStart);
                    const timeHtml = timeInfo
                        ? `<span class="icqaps-floor-tip-time" style="color:${timeColor(timeInfo.totalMins)}">${timeInfo.text}</span>`
                        : `<span class="icqaps-floor-tip-time" style="color:#555;">--:--</span>`;
                    html += `<div class="icqaps-floor-tip-login"><span>· ${c.login}</span>${timeHtml}</div>`;
                });
            }
        });

        if (!hasAny) html += `<div class="icqaps-floor-tip-login" style="color:#666;">No counters</div>`;
        return html;
    }

    function attachCopyListeners(tipEl, data) {
        // Copy per type
        tipEl.querySelectorAll('.icqaps-copy-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                const logins = data[type] || [];
                copyLogins(logins, btn);
            };
        });
        // Copy ALL
        tipEl.querySelectorAll('.icqaps-copy-all-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                copyAllLogins(data, btn);
            };
        });
    }

    function updateTotalCounterTip() {
        const tip = document.getElementById('icqaps-ftip-total');
        const allData = { CC: [], SRC: [], SBC: [] };
        ['P2', 'P3', 'P4'].forEach(floor => {
            const fd = counterFloors[floor] || { CC: [], SRC: [], SBC: [] };
            allData.CC = allData.CC.concat(fd.CC);
            allData.SRC = allData.SRC.concat(fd.SRC);
            allData.SBC = allData.SBC.concat(fd.SBC);
        });
        tip.innerHTML = buildCounterTipHtml('All Counters', allData);
        attachCopyListeners(tip, allData);
    }

    function updateFloorTip(floor) {
        const tip = document.getElementById(`icqaps-ftip-${floor}`);
        const fd = counterFloors[floor] || { CC: [], SRC: [], SBC: [] };
        tip.innerHTML = buildCounterTipHtml(`${floor} Counters`, fd);
        attachCopyListeners(tip, fd);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REFRESH & INIT
    // ═══════════════════════════════════════════════════════════════════════════
    async function refreshAll() {
        const dot = document.getElementById('icqaps-dot');
        if (dot) dot.classList.add('loading');
        await Promise.all([fetchNet0(), fetchAndons(), fetchAndonFloors(), fetchResolvedAndons(), fetchStow(), fetchCounters()]);
        updateUI();
        if (dot) dot.classList.remove('loading');
    }

    function init() {
        createDashboard();
        setTimeout(refreshAll, 1000);
        setInterval(refreshAll, REFRESH_INTERVAL);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

