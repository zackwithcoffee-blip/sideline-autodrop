// ==UserScript==
// @name         FCLM ICQA Calmcodes
// @namespace    Calm Codes
// @version      5.0
// @description  Panel de calmcodes ICQA + Batch ToT submission (merged & fixed)
// @author       juagarcm (basado en Learning MAD9, bjonatan@, jeflaber@, delmkies)
// @match        https://fclm-portal.amazon.com/employee/timeDetails?warehouseId=MAD7&employeeId=*
// @match        https://fclm-portal.amazon.com/employee/*
// @icon         https://fclm-portal.amazon.com/resources/images/icon.jpg
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    // Break times per shift
    const SHIFT_BREAKS = {
        early: ["10:45-11:15"],
        late:  ["19:45-20:15"],
        night: ["03:30-04:00"]
    };
    const BREAKS_ENABLED = true;

    // Auto-detect shift from the page's start/end hours
    function detectShift() {
        const startHour = parseInt(document.getElementById("startHour")?.value || "0");
        if (startHour >= 5 && startHour < 13) return "early";
        if (startHour >= 13 && startHour < 21) return "late";
        return "night";
    }

    function getActiveBreaks() {
        return SHIFT_BREAKS[detectShift()] || [];
    }



    // ═══════════════════════════════════════════════════════════════
    // CALMCODES CATEGORIES
    // ═══════════════════════════════════════════════════════════════

    const categories = [
        {
            id: 1,
            title: 'ICQA LEADS',
            color: '#3498db',
            icon: '🏡',
            items: [
                { label: 'ICQA Lead', code: 'ICQALQA', icon: '👨‍👦‍👦' },
                { label: 'Team Connect', code: 'OPSEMPENG', icon: '👨‍👩‍👧‍👧' },
                { label: 'Enfermería', code: 'SFTAMOI', icon: '💉' },
                { label: 'CAPEX8', code: 'SPPROJ8', icon: '⬅️' },
                { label: 'Huddle', code: 'WWHUDDLE', icon: '📍' },
                { label: 'ICQA 5S', code: 'ICQA5S', icon: '🏫' },
                { label: 'Facilities 5S', code: 'FC5S', icon: '🏰' },
                { label: 'ISTOP', code: 'ISTOP', icon: '🟡' },
                { label: 'MASTER STOP', code: 'MSTOP', icon: '🔴' }
            ]
        },
        {
            id: 2,
            title: 'Tareas indi',
            color: '#5dade2',
            icon: '🚀',
            items: [
                { label: 'Amnesty', code: 'ICQAAM', icon: '🛒' },
                { label: 'Damage Collection', code: 'ICQADMP', icon: '💩' },
                { label: 'Wrangling', code: 'VRWL', icon: '👍' },
                { label: 'Waste Out', code: 'DONWASPRO', icon: '🧺' },
                { label: 'SIOC', code: 'DCSUP', icon: '📦' },
            ]
        },
        {
            id: 3,
            title: 'Instructores',
            color: '#e67e22',
            icon: '👨‍🏫',
            items: [
                { label: 'Peer Trainer', code: 'ICQAPT', icon: '👨‍🏫' },
                { label: 'Trainee', code: 'ICQATR', icon: '🎓' },
                { label: 'ICQA IST', code: 'ICQAIC', icon: '⚖️' },
            ]
        },
        {
            id: 4,
            title: 'ICQA PS',
            color: '#e67e22',
            icon: '🧑‍💻',
            items: [
                { label: 'PS ICQA', code: 'QARSH', icon: '🦉' },
                { label: 'Sweeper', code: 'ICQAPSS', icon: '🧹' },
                { label: 'PG', code: 'ICQAPSR', icon: '❤️‍🔥' },
                { label: 'Aging', code: 'ICQAPSO', icon: '⛏️' },
                { label: 'POUT', code: 'PSTOPS', icon: '🚚' },
                { label: 'TT Andon', code: 'ICQAPST', icon: '🚦' },
                { label: 'Pick Consolidation', code: 'BINCON', icon: '💪' },
            ]
        },
        {
            id: 5,
            title: 'Audits',
            color: '#52be80',
            icon: '📸',
            items: [
                { label: 'Audits OB', code: 'ICQAXSP', icon: '🦅' },
                { label: 'Audits ICQA', code: 'ICQAQA', icon: '🦆' },
            ]
        }
    ];

    // ═══════════════════════════════════════════════════════════════
    // STYLES (Time Checker V2 design language)
    // ═══════════════════════════════════════════════════════════════

    GM_addStyle(`
        /* ─── Toggle Button ─── */
        #toggleMenuBtn {
            position: fixed !important;
            bottom: 15px !important;
            right: 15px !important;
            z-index: 10000 !important;
            background: #001f3f !important;
            color: white !important;
            border: 1px solid rgba(255,255,255,0.15) !important;
            border-radius: 50% !important;
            width: 45px !important;
            height: 45px !important;
            font-size: 20px !important;
            cursor: pointer !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
            transition: transform 0.2s, box-shadow 0.2s, filter 0.2s !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: 'Roboto', sans-serif !important;
        }
        #toggleMenuBtn:hover {
            transform: scale(1.05) !important;
            box-shadow: 0 6px 16px rgba(0,0,0,0.5) !important;
            filter: brightness(1.1) !important;
        }

        /* ─── Main Panel ─── */
        #learningPanel {
            position: fixed !important;
            bottom: 70px !important;
            right: 15px !important;
            z-index: 9999 !important;
            background: rgba(13, 31, 60, 0.96) !important;
            border: 1px solid #001f3f !important;
            border-radius: 6px !important;
            padding: 10px !important;
            width: 319px !important;
            max-height: 82vh !important;
            overflow-y: auto !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
            display: none;
            font-family: 'Roboto', sans-serif !important;
        }
        #learningPanel.visible {
            display: block !important;
            animation: panelFadeIn 0.2s ease;
        }
        @keyframes panelFadeIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ─── Panel Title ─── */
        .panel-title {
            font-size: 9px !important;
            font-weight: bold !important;
            color: white !important;
            text-align: center !important;
            padding: 5px 0 !important;
            letter-spacing: 1.5px !important;
            text-transform: uppercase !important;
            border-bottom: 1px solid rgba(255,255,255,0.1) !important;
            margin-bottom: 8px !important;
            font-family: 'Roboto', sans-serif !important;
        }

        /* ─── Category Buttons ─── */
        .category-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            background: #001f3f !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            border-left: 3px solid !important;
            color: white !important;
            padding: 7px 10px !important;
            cursor: pointer !important;
            border-radius: 5px !important;
            margin-bottom: 4px !important;
            font-size: 11px !important;
            font-weight: bold !important;
            letter-spacing: 0.8px !important;
            width: 100% !important;
            transition: transform 0.2s, box-shadow 0.2s, filter 0.2s !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
            font-family: 'Roboto', sans-serif !important;
        }
        .category-btn:hover {
            transform: scale(1.02) !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4) !important;
            filter: brightness(1.1) !important;
        }
        .category-btn.active {
            filter: brightness(1.15) !important;
        }

        .category-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .category-number {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            color: #000;
            font-weight: bold;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .category-icon { font-size: 15px; }
        .category-arrow {
            font-size: 9px;
            transition: transform 0.2s ease;
            color: rgba(255,255,255,0.6);
        }
        .category-arrow.expanded { transform: rotate(90deg); }

        /* ─── Subcategories ─── */
        .subcategories {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            margin-bottom: 2px;
        }
        .subcategories.expanded { max-height: 600px; }

        /* ─── Item Buttons (Calmcodes) ─── */
        .btn-learning {
            display: flex !important;
            align-items: center !important;
            background: #001f3f !important;
            border: none !important;
            color: white !important;
            padding: 6px 10px !important;
            cursor: pointer !important;
            border-radius: 5px !important;
            margin: 3px 0 3px 12px !important;
            font-size: 13px !important;
            font-weight: bold !important;
            width: calc(100% - 12px) !important;
            transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
            font-family: 'Roboto', sans-serif !important;
            letter-spacing: 0.5px !important;
        }
        .btn-learning:hover {
            transform: scale(1.03) !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4) !important;
            background: #003366 !important;
        }
        .btn-learning:active {
            transform: scale(0.97) !important;
            opacity: 0.8 !important;
        }
        .btn-icon { margin-right: 8px; font-size: 14px; }

        /* ─── Scrollbar ─── */
        #learningPanel::-webkit-scrollbar { width: 3px; }
        #learningPanel::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); }
        #learningPanel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }

        /* ═══════════════════════════════════════════════════════════
           TOT BATCH SECTION (Time Checker V2 style)
           ═══════════════════════════════════════════════════════════ */

        .tot-section {
            margin-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 8px;
        }

        .tot-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            color: #ecf0f1;
            font-family: 'Courier New', monospace;
        }
        .tot-table th {
            background: rgba(0, 31, 63, 0.85);
            padding: 4px 3px;
            text-align: center;
            font-size: 9px;
            font-weight: bold;
            color: white;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .tot-table td {
            padding: 3px 3px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            font-weight: 600;
        }
        .tot-table tr {
            transition: background 0.2s, transform 0.1s;
        }
        .tot-table tr:hover {
            background: rgba(255,255,255,0.05);
        }
        .tot-table tr.tot-break {
            background: rgba(255, 60, 60, 0.12);
            border-left: 2px solid #ff3c3c;
        }
        .tot-table tr.tot-submitted {
            background: rgba(46, 204, 113, 0.12);
            border-left: 2px solid #2ecc71;
        }
        .tot-table input[type="checkbox"] {
            width: 13px;
            height: 13px;
            cursor: pointer;
            accent-color: #2ecc71;
        }

        /* ─── ToT Controls ─── */
        .tot-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 6px;
        }
        .tot-controls select {
            flex: 1;
            min-width: 0;
            padding: 5px 6px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 5px;
            border: 1px solid rgba(255,255,255,0.1);
            background: #001f3f;
            color: white;
            font-family: 'Roboto', sans-serif;
            letter-spacing: 0.3px;
            cursor: pointer;
            transition: border-color 0.2s;
        }
        .tot-controls select:hover {
            border-color: rgba(255,255,255,0.25);
        }
        .tot-controls select:focus {
            outline: none;
            border-color: rgba(255,255,255,0.4);
        }

        /* ─── ToT Buttons ─── */
        .tot-btn {
            padding: 6px 12px;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s, filter 0.2s;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            font-family: 'Roboto', sans-serif;
            color: white;
        }
        .tot-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            filter: brightness(1.1);
        }
        .tot-btn:active {
            transform: scale(0.95);
            opacity: 0.85;
        }
        .tot-btn-submit { background: #0d6b3d !important; }
        .tot-btn-submit:hover { background: #11854c !important; }
        .tot-btn-select { background: #001f3f !important; }
        .tot-btn-select:hover { background: #003366 !important; }
        .tot-btn-prev { background: #001f3f !important; }
        .tot-btn-prev:hover { background: #003366 !important; }

        /* ─── ToT Messages ─── */
        .tot-message {
            font-size: 10px;
            font-weight: bold;
            color: rgba(255,255,255,0.6);
            margin-top: 5px;
            min-height: 14px;
            font-family: 'Courier New', monospace;
            letter-spacing: 0.3px;
        }
        .tot-message.error { color: rgb(255, 60, 60); }
        .tot-message.success { color: rgb(46, 204, 113); }

        .tot-selected-info {
            font-size: 10px;
            font-weight: 900;
            color: #ecf0f1;
            font-family: 'Courier New', monospace;
            text-align: center;
            padding: 3px 0;
            transition: color 0.5s ease;
        }

        /* ─── Pulse animation ─── */
        @keyframes pulse-dot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.6; }
        }
        .tot-refresh-dot {
            display: inline-block;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background-color: #2ecc71;
            animation: pulse-dot 2s infinite;
            margin-left: 6px;
            vertical-align: middle;
        }
    `);

    // ═══════════════════════════════════════════════════════════════
    // CALMCODES LOGIC
    // ═══════════════════════════════════════════════════════════════

    function sendCalm(calmCode) {
        const badge = document.evaluate(
            "//dt[text()='Badge']/following-sibling::dd",
            document, null,
            XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue?.textContent.trim();

        if (!badge) {
            alert("❌ Error: No se encuentra el Badge ID");
            return;
        }

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://fcmenu-dub-regionalized.corp.amazon.com/do/laborTrackingKiosk',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: new URLSearchParams({
                warehouseId: 'MAD7',
                calmCode: calmCode,
                trackingBadgeId: badge
            }).toString(),
            onload: () => {
                console.log(`✅ ${calmCode}`);
                location.reload();
            },
            onerror: () => alert('❌ Error al loguear')
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // TOT BATCH LOGIC (Fixed - No Vue.js dependency)
    // ═══════════════════════════════════════════════════════════════

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    function getFormAction() {
        const form = document.querySelector('form[action*="timeDetails"], form[action*="ppaTimeDetails"]');
        if (form) return form.getAttribute('action');
        return window.location.pathname;
    }

    function getTotParams() {
        const editables = document.getElementsByClassName('editable');
        const editablesArray = [];

        for (let i = 0; i < editables.length; i++) {
            if (!editables[i].className.includes("example") &&
                editables[i].parentNode.hasAttribute("onclick") &&
                editables[i].parentNode.attributes.onclick.nodeValue.startsWith("firePopup")) {
                editablesArray.push(editables[i]);
            }
        }

        const parseFire = function(args) {
            try {
                return eval(args.replace('firePopup(', '[').replace(');', ']').replace('\t', '').replace('\n', ''));
            } catch(e) {
                console.log('[ToT] Error parsing firePopup:', e);
                return null;
            }
        };

        const totParams = [];
        editablesArray.forEach(ed => {
            const parsed = parseFire(ed.parentNode.attributes.onclick.nodeValue);
            if (parsed) totParams.push(parsed);
        });

        return { editablesArray, totParams };
    }

    function getProcessOptions() {
        const select = document.getElementById('newLaborProcessId');
        if (!select) return [];
        return [...select.options].map(opt => ({ value: opt.value, label: opt.text }));
    }

    function fetchFunctions(processId, callback) {
        try {
            if (pageWindow.jediClient) {
                pageWindow.jediClient.getAllLaborFunctionsForLaborProcessId({
                    ServiceName: 'FCLMJobEntryDomainInformationService',
                    data: { laborProcessId: processId },
                    Method: 'GetAllLaborFunctionsForLaborProcessId',
                    success: callback
                });
            } else {
                console.log('[ToT] jediClient not available');
                callback({ laborFunctions: [] });
            }
        } catch(e) {
            console.log('[ToT] Error fetching functions:', e);
            callback({ laborFunctions: [] });
        }
    }

    function getDuration(date1, date2) {
        const d1 = new Date(date1);
        const d2 = date2 && date2.length > 0 ? new Date(date2) : new Date();
        return Math.abs((d2 - d1) / 60000);
    }

    function detectBreak(totStart, totEnd) {
        if (!BREAKS_ENABLED) return "";
        const BREAKS = getActiveBreaks();
        const start = new Date(totStart);
        const end = new Date(totEnd);
        const dayRollover = !(start.getDate() === end.getDate() &&
                              start.getMonth() === end.getMonth() &&
                              start.getFullYear() === end.getFullYear());

        const barrange = [[start.getHours(), start.getMinutes()], [end.getHours(), end.getMinutes()]];
        const rangeDuration = (tr) => (tr[1][0] - tr[0][0]) * 60 + (tr[1][1] - tr[0][1]);

        for (const brk of BREAKS) {
            const parts = brk.split('-');
            const breakrange = [parts[0].split(':').map(Number), parts[1].split(':').map(Number)];

            if (!dayRollover) {
                const min = (breakrange[0][0] < barrange[0][0] ||
                    (breakrange[0][0] === barrange[0][0] && breakrange[0][1] < barrange[0][1]))
                    ? breakrange : barrange;
                const max = (min === breakrange) ? barrange : breakrange;

                if (min[1][0] < max[0][0] || (min[1][0] === max[0][0] && min[1][1] < max[0][1])) {
                    continue;
                }

                const intersect = [
                    [max[0][0], max[0][1]],
                    (min[1][0] < max[1][0] || (min[1][0] === max[1][0] && min[1][1] < max[1][1])) ? min[1] : max[1]
                ];

                if (rangeDuration(intersect) >= (rangeDuration(breakrange) - 5)) {
                    return "🔴 " + parts[0];
                }
            }
        }
        return "";
    }

    function getColorForDuration(minutes) {
        // Red (short/bad) → Green (long), same gradient logic as SIOC dashboard
        const percentage = Math.min(minutes / 60, 1);
        const red = Math.round(255 * (1 - percentage));
        const green = Math.round(180 * percentage);
        return `rgb(${red}, ${green}, 0)`;
    }

    function submitTotBatch(tots, processId, functionId, processOptions, onResponse) {
        const empId = document.getElementById("employeeId")?.value;
        const whId = document.getElementById("warehouseId")?.value;
        const startDate = document.getElementById("startDate")?.value;
        const startHour = document.getElementById("startHour")?.value;
        const startMinute = document.getElementById("startMinute")?.value;
        const endDate = document.getElementById("endDate")?.value;
        const endHour = document.getElementById("endHour")?.value;
        const endMinute = document.getElementById("endMinute")?.value;

        const formAction = getFormAction();
        const $ = pageWindow.jQuery || pageWindow.$;

        if (!$) {
            console.error('[ToT] jQuery not available on page');
            onResponse(null, -1, 'jQuery not available on page');
            return;
        }

        tots.forEach(function(tot) {
            const enc = encodeURIComponent;
            let line = "startDate=" + enc(startDate) + "&startHour=" + enc(startHour) +
                       "&startMinute=" + enc(startMinute) + "&endDate=" + enc(endDate) +
                       "&endHour=" + enc(endHour) + "&endMinute=" + enc(endMinute) +
                       "&employeeId=" + enc(empId) + "&warehouseId=" + enc(whId) +
                       "&laborFuncStartTime=" + enc(tot.startTime) +
                       "&laborFuncEndTime=" + enc(tot.endTime) +
                       "&newLaborProcessId=" + enc(processId) +
                       "&newLaborFunctionId=" + enc(functionId);

            if (window.location.pathname.includes("ppa")) {
                line = line.replace("warehouseId", "oldWarehouseId");
                const loc = line.search("&newLaborProcessId");
                line = line.slice(0, loc) + "&warehouseId=" + enc(whId) + line.slice(loc);
                const loc2 = line.search("&newLaborFunctionId");
                line = line.slice(0, loc2) + "&newJobRole=" + functionId.replaceAll(" ", "+");
            }

            $.ajax({
                url: formAction,
                type: 'POST',
                data: line,
                success: function(response) {
                    onResponse(response, tot.index, null);
                },
                error: function(xhr, status, error) {
                    onResponse(null, tot.index, error || status);
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // UI CREATION
    // ═══════════════════════════════════════════════════════════════

    function createPanel() {
        if (document.getElementById('learningPanel')) return;

        // Toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggleMenuBtn';
        toggleBtn.innerHTML = '⚡';
        document.body.appendChild(toggleBtn);

        // Main panel
        const panel = document.createElement('div');
        panel.id = 'learningPanel';

        // Title
        const title = document.createElement('div');
        title.className = 'panel-title';
        title.textContent = 'ICQA TOOLS';
        panel.appendChild(title);

        // ─── Calmcodes Section ───
        categories.forEach(category => {
            const categoryBtn = document.createElement('button');
            categoryBtn.className = 'category-btn';
            categoryBtn.style.borderLeftColor = category.color;
            categoryBtn.innerHTML = `
                <div class="category-left">
                    <span class="category-number" style="background-color: ${category.color};">
                        ${category.id}
                    </span>
                    <span class="category-icon">${category.icon}</span>
                    <span>${category.title}</span>
                </div>
                <span class="category-arrow">▶</span>
            `;

            const subcategoriesDiv = document.createElement('div');
            subcategoriesDiv.className = 'subcategories';

            category.items.forEach(item => {
                const btn = document.createElement('button');
                btn.className = 'btn-learning';
                btn.innerHTML = `<span class="btn-icon">${item.icon}</span><span>${item.label}</span>`;
                btn.onclick = () => sendCalm(item.code);
                subcategoriesDiv.appendChild(btn);
            });

            categoryBtn.addEventListener('click', () => {
                const arrow = categoryBtn.querySelector('.category-arrow');
                const isExpanded = subcategoriesDiv.classList.contains('expanded');

                // Close other categories
                document.querySelectorAll('.subcategories.expanded').forEach(sub => {
                    if (sub !== subcategoriesDiv) {
                        sub.classList.remove('expanded');
                        sub.previousElementSibling.querySelector('.category-arrow').classList.remove('expanded');
                        sub.previousElementSibling.classList.remove('active');
                    }
                });

                if (isExpanded) {
                    subcategoriesDiv.classList.remove('expanded');
                    arrow.classList.remove('expanded');
                    categoryBtn.classList.remove('active');
                } else {
                    subcategoriesDiv.classList.add('expanded');
                    arrow.classList.add('expanded');
                    categoryBtn.classList.add('active');
                }
            });

            panel.appendChild(categoryBtn);
            panel.appendChild(subcategoriesDiv);
        });

        // ─── ToT Batch Section ───
        const totSection = document.createElement('div');
        totSection.className = 'tot-section';
        totSection.id = 'totBatchSection';

        const { editablesArray, totParams } = getTotParams();

        if (totParams.length > 0) {
            // ToT Header
            let totalDuration = 0;
            totParams.forEach(p => { totalDuration += getDuration(p[1], p[3]); });

            const totHeader = document.createElement('div');
            totHeader.className = 'panel-title';
            totHeader.style.marginTop = '4px';
            totHeader.innerHTML = `TOT BATCH <span class="tot-refresh-dot"></span>`;
            totSection.appendChild(totHeader);

            // Summary line
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'tot-selected-info';
            summaryDiv.textContent = `${totParams.length} barras · ${Math.round(totalDuration)}m total`;
            totSection.appendChild(summaryDiv);

            // ToT Table
            const table = document.createElement('table');
            table.className = 'tot-table';
            table.innerHTML = `<thead><tr>
                <th>✓</th><th>INI</th><th>FIN</th><th>MIN</th><th>BRK</th><th>PROC</th>
            </tr></thead>`;
            const tbody = document.createElement('tbody');
            tbody.id = 'totTableBody';

            // State
            const totState = {
                selected: new Array(totParams.length).fill(false),
                submitted: new Set(),
                processId: localStorage.getItem("totProcess") || "-1",
                functionId: localStorage.getItem("totFunction") || "-1",
                functionOptions: []
            };

            totParams.forEach((tot, idx) => {
                const tr = document.createElement('tr');
                tr.id = `tot-row-${idx}`;

                const startTime = tot[1];
                const endTime = tot[3];
                const duration = Math.round(getDuration(startTime, endTime));
                const breakLabel = detectBreak(startTime, endTime);
                const process = tot[4] || '';
                const func = tot[5] || '';

                if (breakLabel) tr.classList.add('tot-break');

                const fmtTime = (t) => {
                    if (!t || t.length === 0) return '--:--';
                    const d = new Date(t);
                    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
                };

                const durationColor = getColorForDuration(duration);

                tr.innerHTML = `
                    <td><input type="checkbox" data-idx="${idx}"></td>
                    <td>${fmtTime(startTime)}</td>
                    <td>${fmtTime(endTime)}</td>
                    <td style="color:${durationColor};font-weight:900;">${duration}</td>
                    <td style="font-size:9px">${breakLabel}</td>
                    <td style="font-size:8px;color:rgba(255,255,255,0.5)">${process ? process.substring(0,8) : ''}</td>
                `;
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            totSection.appendChild(table);

            // Selected info
            const selectedInfo = document.createElement('div');
            selectedInfo.className = 'tot-selected-info';
            selectedInfo.id = 'totSelectedInfo';
            totSection.appendChild(selectedInfo);

            // Controls: Process & Function
            const controls = document.createElement('div');
            controls.className = 'tot-controls';

            const processSelect = document.createElement('select');
            processSelect.id = 'totProcessSelect';
            const processOptions = getProcessOptions();
            processOptions.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                if (opt.value === totState.processId) o.selected = true;
                processSelect.appendChild(o);
            });

            const functionSelect = document.createElement('select');
            functionSelect.id = 'totFunctionSelect';
            functionSelect.innerHTML = '<option value="-1">FUNCIÓN...</option>';

            controls.appendChild(processSelect);
            controls.appendChild(functionSelect);
            totSection.appendChild(controls);

            // Buttons row
            const btnRow = document.createElement('div');
            btnRow.className = 'tot-controls';
            btnRow.style.marginTop = '6px';

            const selectAllBtn = document.createElement('button');
            selectAllBtn.className = 'tot-btn tot-btn-select';
            selectAllBtn.textContent = '☑ ALL';

            const prevTaskBtn = document.createElement('button');
            prevTaskBtn.className = 'tot-btn tot-btn-prev';
            prevTaskBtn.textContent = '⏮ PREV';

            const submitBtn = document.createElement('button');
            submitBtn.className = 'tot-btn tot-btn-submit';
            submitBtn.textContent = '▶ SEND';

            btnRow.appendChild(selectAllBtn);
            btnRow.appendChild(prevTaskBtn);
            btnRow.appendChild(submitBtn);
            totSection.appendChild(btnRow);

            // Message
            const msgDiv = document.createElement('div');
            msgDiv.className = 'tot-message';
            msgDiv.id = 'totMessage';
            totSection.appendChild(msgDiv);

            // ─── Event Handlers ───

            tbody.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const idx = parseInt(e.target.dataset.idx);
                    totState.selected[idx] = e.target.checked;
                    updateSelectedInfo();
                }
            });

            function updateSelectedInfo() {
                let total = 0;
                let count = 0;
                totState.selected.forEach((sel, i) => {
                    if (sel) {
                        total += getDuration(totParams[i][1], totParams[i][3]);
                        count++;
                    }
                });
                const info = document.getElementById('totSelectedInfo');
                if (info) {
                    if (count > 0) {
                        info.textContent = `${count} sel · ${Math.round(total)}m`;
                        info.style.color = '#2ecc71';
                    } else {
                        info.textContent = '';
                    }
                }
            }

            selectAllBtn.addEventListener('click', () => {
                const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');
                const allChecked = totState.selected.every(s => s);
                checkboxes.forEach(cb => {
                    cb.checked = !allChecked;
                    totState.selected[parseInt(cb.dataset.idx)] = !allChecked;
                });
                updateSelectedInfo();
            });

            processSelect.addEventListener('change', () => {
                totState.processId = processSelect.value;
                functionSelect.innerHTML = '<option value="-1">CARGANDO...</option>';

                if (window.location.pathname.includes("ppaTimeDetails")) {
                    try {
                        const selectedLabel = processOptions.find(x => x.value === totState.processId)?.label;
                        if (pageWindow.processes && pageWindow.processes[selectedLabel]) {
                            const funclist = pageWindow.processes[selectedLabel].attributes.job_role.sort();
                            functionSelect.innerHTML = '<option value="-1">FUNCIÓN...</option>';
                            funclist.forEach(f => {
                                const o = document.createElement('option');
                                o.value = f;
                                o.textContent = f;
                                functionSelect.appendChild(o);
                            });
                        }
                    } catch(e) { console.log('[ToT] PPA functions error:', e); }
                } else {
                    fetchFunctions(totState.processId, (result) => {
                        functionSelect.innerHTML = '<option value="-1">FUNCIÓN...</option>';
                        if (result && result.laborFunctions) {
                            totState.functionOptions = result.laborFunctions.sort((a, b) =>
                                a.laborFunctionName > b.laborFunctionName ? 1 : -1
                            );
                            totState.functionOptions.forEach(f => {
                                const o = document.createElement('option');
                                o.value = f.laborFunctionId;
                                o.textContent = f.laborFunctionName;
                                if (f.laborFunctionId.toString() === localStorage.getItem("totFunction")) {
                                    o.selected = true;
                                }
                                functionSelect.appendChild(o);
                            });
                        }
                    });
                }
            });

            functionSelect.addEventListener('change', () => {
                totState.functionId = functionSelect.value;
            });

            prevTaskBtn.addEventListener('click', () => {
                for (let i = editablesArray.length - 1; i >= 0; i--) {
                    if (editablesArray[i].parentElement?.parentElement?.className === "function-seg edited") {
                        const lcp = totParams[i][4];
                        const lcf = totParams[i][5];
                        const procOpt = processOptions.find(o => o.label === lcp);
                        if (procOpt) {
                            processSelect.value = procOpt.value;
                            totState.processId = procOpt.value;
                            processSelect.dispatchEvent(new Event('change'));
                            setTimeout(() => {
                                const funcOpts = functionSelect.options;
                                for (let j = 0; j < funcOpts.length; j++) {
                                    if (funcOpts[j].textContent === lcf) {
                                        functionSelect.value = funcOpts[j].value;
                                        totState.functionId = funcOpts[j].value;
                                        break;
                                    }
                                }
                            }, 1500);
                        }
                        document.getElementById('totMessage').textContent = `✅ ${lcp} / ${lcf}`;
                        document.getElementById('totMessage').className = 'tot-message success';
                        return;
                    }
                }
                document.getElementById('totMessage').textContent = '⚠ No prev task found';
                document.getElementById('totMessage').className = 'tot-message error';
            });

            submitBtn.addEventListener('click', () => {
                const msg = document.getElementById('totMessage');
                const selectedProcess = processSelect.value;
                const selectedFunction = functionSelect.value;

                if (!selectedProcess || selectedProcess === "-1" || selectedProcess <= 0) {
                    msg.textContent = '⚠ SELECT PROCESS';
                    msg.className = 'tot-message error';
                    return;
                }
                if (!selectedFunction || selectedFunction === "-1") {
                    msg.textContent = '⚠ SELECT FUNCTION';
                    msg.className = 'tot-message error';
                    return;
                }

                const toSubmit = [];
                totState.selected.forEach((sel, i) => {
                    if (sel && !totState.submitted.has(i)) {
                        toSubmit.push({
                            startTime: totParams[i][1],
                            endTime: totParams[i][3],
                            index: i
                        });
                    }
                });

                if (toSubmit.length === 0) {
                    msg.textContent = '⚠ SELECT BARS';
                    msg.className = 'tot-message error';
                    return;
                }

                localStorage.setItem("totProcess", selectedProcess);
                localStorage.setItem("totFunction", selectedFunction);

                msg.textContent = `▶ SENDING ${toSubmit.length}...`;
                msg.className = 'tot-message';

                submitTotBatch(toSubmit, selectedProcess, selectedFunction, processOptions,
                    function(response, totIndex, error) {
                        if (error) {
                            msg.textContent = `✗ ERR #${totIndex}: ${error}`;
                            msg.className = 'tot-message error';
                            return;
                        }

                        const params = totParams[totIndex];
                        if (response && params.slice(0, 4).every(x => response.includes(x))) {
                            totState.submitted.add(totIndex);
                            const row = document.getElementById(`tot-row-${totIndex}`);
                            if (row) {
                                row.classList.add('tot-submitted');
                                const procLabel = processOptions.find(x => x.value === selectedProcess)?.label || '';
                                const funcLabel = functionSelect.options[functionSelect.selectedIndex]?.textContent || '';
                                row.cells[5].textContent = (procLabel + '/' + funcLabel).substring(0, 16);
                            }
                            msg.textContent = `✓ ${totState.submitted.size}/${toSubmit.length} DONE`;
                            msg.className = 'tot-message success';
                        } else {
                            let errorStr = 'UNEXPECTED RESPONSE';
                            if (response && response.indexOf('<div class=" error-message message">') !== -1) {
                                errorStr = response.split('<div class=" error-message message">')[1]
                                    .split('</div>')[0].trim().split(' ').slice(1).join(' ');
                            }
                            msg.textContent = `✗ #${totIndex}: ${errorStr.substring(0, 30)}`;
                            msg.className = 'tot-message error';
                            console.log('[ToT] Error response for bar', totIndex, response);
                        }
                    }
                );
            });

            // Initial function load
            if (totState.processId && totState.processId !== "-1") {
                setTimeout(() => processSelect.dispatchEvent(new Event('change')), 500);
            }

        } else {
            const noTot = document.createElement('div');
            noTot.className = 'panel-title';
            noTot.style.marginTop = '4px';
            noTot.style.opacity = '0.4';
            noTot.textContent = 'NO EDITABLE TOT BARS';
            totSection.appendChild(noTot);
        }

        panel.appendChild(totSection);
        document.body.appendChild(panel);

        // Toggle
        toggleBtn.addEventListener('click', () => {
            const isVisible = panel.classList.toggle('visible');
            toggleBtn.innerHTML = isVisible ? '✕' : '⚡';
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createPanel);
    } else {
        createPanel();
    }

})();

