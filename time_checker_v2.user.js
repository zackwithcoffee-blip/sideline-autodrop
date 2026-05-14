// ==UserScript==
// @name         FCLM Portal - Time Checker V2
// @namespace    http://tampermonkey.net/
// @version      9.0
// @description  Checks each AA's timeline for editable time segments and displays data dashboards.
// @author       juagarcm
// @match        https://fclm-portal.amazon.com/reports/functionRollup*
// @grant        GM_xmlhttpRequest
// @connect      fclm-portal.amazon.com
// ==/UserScript==

(function() {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // GLOBALS
    // ─────────────────────────────────────────────────────────────────────────
    let siocValueElement = null;
    let siocUpdateTimeElement = null;
    let hoursValueElement = null;
    let binconValueElement = null;
    let binconUpdateTimeElement = null;
    let poutValueElement = null;

    const checkedEmployees = new Set();
    const employeeResults = new Map();

    console.log('[FCLM AA Time Checker] Script loaded at ' + new Date().toISOString());

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER: Parse number that may use comma as decimal separator
    // Handles both "180,23" (European) and "1,234.56" (US thousands)
    // ─────────────────────────────────────────────────────────────────────────
    function parseLocalizedNumber(text) {
        if (!text) return NaN;
        var cleaned = text.trim();

        // If the string contains both dots and commas, determine which is the decimal separator
        var hasDot = cleaned.indexOf('.') !== -1;
        var hasComma = cleaned.indexOf(',') !== -1;

        if (hasDot && hasComma) {
            // If dot comes before comma: dot is thousands sep, comma is decimal (e.g. "1.234,56")
            if (cleaned.lastIndexOf('.') < cleaned.lastIndexOf(',')) {
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else {
                // Comma comes before dot: comma is thousands sep, dot is decimal (e.g. "1,234.56")
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (hasComma && !hasDot) {
            // Only comma present: check if it's a decimal separator
            // If there are digits after the comma and they are 1-2 digits (decimal), treat as decimal
            var parts = cleaned.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
                // Likely a decimal separator (e.g. "180,23")
                cleaned = cleaned.replace(',', '.');
            } else if (parts.length === 2 && parts[1].length === 3) {
                // Ambiguous: could be "1,234" (thousands) or "123,456" (decimal with 3 places)
                // In FCLM context with hours, treat as thousands separator
                cleaned = cleaned.replace(',', '');
            } else {
                // Multiple commas = thousands separators (e.g. "1,234,567")
                cleaned = cleaned.replace(/,/g, '');
            }
        }
        // If only dot present or neither, parseFloat handles it natively

        return parseFloat(cleaned);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STYLES
    // ─────────────────────────────────────────────────────────────────────────
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse-dot {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.6; }
            }
            @keyframes refresh-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.2; }
            }
            .fclm-refresh-dot {
                position: absolute;
                top: 4px;
                right: 5px;
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background-color: #2ecc71;
                animation: refresh-pulse 2s infinite;
            }
            .fclm-dashboard-card {
                position: relative;
            }
            .fclm-na-value {
                color: #95a5a6 !important;
                font-style: normal;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NA STYLE HELPER
    // ─────────────────────────────────────────────────────────────────────────
    function applyNAStyle(element) {
        if (element && element.textContent.trim() === '---') {
            element.classList.add('fclm-na-value');
        } else if (element) {
            element.classList.remove('fclm-na-value');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHIFT DETECTION
    // ─────────────────────────────────────────────────────────────────────────
    function detectShift() {
        const params = new URLSearchParams(window.location.search);
        const startHour = parseInt(params.get('startHourIntraday'));
        const endHour = parseInt(params.get('endHourIntraday'));

        if (!isNaN(startHour) && !isNaN(endHour)) {
            if (startHour === 7 && endHour === 15) return 'early';
            if (startHour === 15 && endHour === 23) return 'late';
            if (startHour === 23 || endHour === 7) return 'night';
        }

        const hour = new Date().getHours();
        if (hour >= 7 && hour < 15) return 'early';
        if (hour >= 15 && hour < 23) return 'late';
        return 'night';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COLOR FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    function getColorForValue(value) {
        const percentage = Math.min(value / 420, 1);
        const red = Math.round(255 * (1 - percentage));
        const green = Math.round(220 * percentage);
        return 'rgb(' + red + ', ' + green + ', 0)';
    }

    function getBinconColor(value) {
        // ── UNDER TARGET (0 → 40): Red → Green ──
        if (value <= 40) {
            var percentage = Math.min(value / 40, 1);
            if (percentage < 0.5) {
                var r = 255;
                var g = Math.round(140 * (percentage / 0.5));
                return 'rgb(' + r + ', ' + g + ', 0)';
            } else {
                var r2 = Math.round(255 * (1 - (percentage - 0.5) / 0.5));
                var g2 = Math.round(140 + 80 * ((percentage - 0.5) / 0.5));
                return 'rgb(' + r2 + ', ' + g2 + ', 0)';
            }
        }

        // ── BUFFER ZONE (40 → 43): Stay green ──
        if (value <= 43) {
            return 'rgb(0, 220, 0)';
        }

        // ── OVER CAP (43 → 60+): Green → Yellow → Orange → Red ──
        // Maps 43→60 as the full reverse gradient range
        var overAmount = Math.min((value - 43) / 17, 1); // 0 at 43h, 1 at 60h

        if (overAmount < 0.33) {
            // Green → Yellow (0,220,0) → (255,220,0)
            var t = overAmount / 0.33;
            var r3 = Math.round(255 * t);
            var g3 = 220;
            return 'rgb(' + r3 + ', ' + g3 + ', 0)';
        } else if (overAmount < 0.66) {
            // Yellow → Orange (255,220,0) → (255,120,0)
            var t2 = (overAmount - 0.33) / 0.33;
            var r4 = 255;
            var g4 = Math.round(220 - 100 * t2);
            return 'rgb(' + r4 + ', ' + g4 + ', 0)';
        } else {
            // Orange → Red (255,120,0) → (255,30,0)
            var t3 = (overAmount - 0.66) / 0.34;
            var r5 = 255;
            var g5 = Math.round(120 - 90 * t3);
            return 'rgb(' + r5 + ', ' + g5 + ', 0)';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────
    function getWeekStartEncoded() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        const year = startOfWeek.getFullYear();
        const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
        const day = String(startOfWeek.getDate()).padStart(2, '0');
        return `${year}%2F${month}%2F${day}`;
    }

    function getTodayEncoded() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}%2F${month}%2F${day}`;
    }

    function getTomorrowEncoded() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        return `${year}%2F${month}%2F${day}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // URL BUILDERS
    // ─────────────────────────────────────────────────────────────────────────
    function getCurrentWeekURL() {
        const dateString = getWeekStartEncoded();
        const today = getTodayEncoded();
        console.log('[FCLM AA Time Checker] Week starts on: ' + dateString);
        return `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1002960&spanType=Week&startDateWeek=${dateString}&maxIntradayDays=1&startDateIntraday=${today}&startHourIntraday=15&startMinuteIntraday=0&endDateIntraday=${today}&endHourIntraday=23&endMinuteIntraday=0`;
    }

    function getBinconURL() {
        const weekStart = getWeekStartEncoded();
        const today = getTodayEncoded();
        const tomorrow = getTomorrowEncoded();
        const shift = detectShift();
        let startHour, endHour, startDate, endDate;

        if (shift === 'early') {
            startHour = 7; endHour = 15;
            startDate = today; endDate = today;
        } else if (shift === 'late') {
            startHour = 15; endHour = 23;
            startDate = today; endDate = today;
        } else {
            startHour = 23; endHour = 7;
            startDate = today; endDate = tomorrow;
        }

        console.log('[FCLM AA Time Checker] BINCON shift: ' + shift);
        return `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1003012&startDateDay=${today}&spanType=Week&startDateWeek=${weekStart}&maxIntradayDays=1&startDateIntraday=${startDate}&startHourIntraday=${startHour}&startMinuteIntraday=0&endDateIntraday=${endDate}&endHourIntraday=${endHour}&endMinuteIntraday=0`;
    }

    function getPoutURL() {
        const weekStart = getWeekStartEncoded();
        const today = getTodayEncoded();
        const tomorrow = getTomorrowEncoded();
        const shift = detectShift();
        let startHour, endHour, startDate, endDate;

        if (shift === 'early') {
            startHour = 7; endHour = 15;
            startDate = today; endDate = today;
        } else if (shift === 'late') {
            startHour = 15; endHour = 23;
            startDate = today; endDate = today;
        } else {
            startHour = 23; endHour = 7;
            startDate = today; endDate = tomorrow;
        }

        console.log('[FCLM AA Time Checker] POUT shift: ' + shift);
        return `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1003018&spanType=Week&startDateWeek=${weekStart}&maxIntradayDays=1&startDateIntraday=${startDate}&startHourIntraday=${startHour}&startMinuteIntraday=0&endDateIntraday=${endDate}&endHourIntraday=${endHour}&endMinuteIntraday=0`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NAVIGATION BUTTONS
    // ─────────────────────────────────────────────────────────────────────────
    function createNavigationButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            gap: 4px;
            width: 142.5px;
            box-sizing: border-box;
        `;

        const totButton = document.createElement('button');
        totButton.textContent = 'ToT';
        totButton.style.cssText = `
            background-color: #001f3f;
            color: white;
            border: none;
            padding: 5px 0;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.3s;
            flex: 1;
        `;
        totButton.onmouseover = function() { this.style.backgroundColor = '#003366'; };
        totButton.onmouseout = function() { this.style.backgroundColor = '#001f3f'; };
        totButton.onclick = function() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateString = `${year}%2F${month}%2F${day}`;
            const url = `https://fclm-portal.amazon.com/reports/timeOnTask?reportFormat=HTML&warehouseId=MAD7&spanType=Day&startDateDay=${dateString}&maxIntradayDays=30&startHourIntraday=0&startMinuteIntraday=0&endHourIntraday=0&endMinuteIntraday=0`;
            window.open(url, '_blank');
        };

        const removeButton = document.createElement('button');
        removeButton.textContent = 'RMV';
        removeButton.style.cssText = `
            background-color: #001f3f;
            color: white;
            border: none;
            padding: 5px 0;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.3s;
            flex: 1;
        `;
        removeButton.onmouseover = function() { this.style.backgroundColor = '#003366'; };
        removeButton.onmouseout = function() { this.style.backgroundColor = '#001f3f'; };
        removeButton.onclick = function() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateString = `${year}%2F${month}%2F${day}`;
            const url = `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1002960&spanType=Day&startDateDay=${dateString}&maxIntradayDays=1&startDateIntraday=${dateString}&startHourIntraday=15&startMinuteIntraday=0&endDateIntraday=${dateString}&endHourIntraday=23&endMinuteIntraday=0`;
            window.open(url, '_blank');
        };

        buttonContainer.appendChild(totButton);
        buttonContainer.appendChild(removeButton);
        document.body.appendChild(buttonContainer);

        console.log('[FCLM AA Time Checker] Navigation buttons created at ' + new Date().toISOString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SIOC DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    function createSIOCDashboard() {
        const existingDashboard = document.getElementById('sioc-dashboard');
        if (existingDashboard) existingDashboard.remove();

        const dashboard = document.createElement('div');
        dashboard.id = 'sioc-dashboard';
        dashboard.className = 'fclm-dashboard-card';
        dashboard.style.cssText = `
            position: fixed;
            top: 110px;
            right: 20px;
            z-index: 10000;
            background: rgba(13, 31, 60, 0.92);
            border: 1px solid #001f3f;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
            width: 141px;
        `;

        let lastRefreshed = 'Not yet';
        dashboard.onmouseover = function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
            this.style.filter = 'brightness(1.1)';
            this.title = 'Last refreshed: ' + lastRefreshed;
        };
        dashboard.onmouseout = function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
            this.style.filter = 'brightness(1)';
        };
        dashboard.onclick = function() {
            window.open(getCurrentWeekURL(), '_blank');
        };
        dashboard._setRefreshed = function() {
            lastRefreshed = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        };

        const refreshDot = document.createElement('div');
        refreshDot.className = 'fclm-refresh-dot';
        refreshDot.id = 'sioc-refresh-dot';
        dashboard.appendChild(refreshDot);

        const header = document.createElement('div');
        header.textContent = 'SIOC';
        header.style.cssText = `
            font-size: 9px;
            font-weight: bold;
            color: white;
            background-color: rgba(0, 31, 63, 0.85);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            width: 100%;
            text-align: center;
            padding: 5px 0;
            box-sizing: border-box;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        `;

        const bodyRow = document.createElement('div');
        bodyRow.style.cssText = `
            display: flex;
            flex-direction: row;
            width: 100%;
        `;

        const hoursCell = document.createElement('div');
        hoursCell.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-right: 1px solid rgba(255,255,255,0.15);
            flex: 1;
            padding: 6px 8px;
        `;

        const hoursValue = document.createElement('div');
        hoursValue.id = 'sioc-hours-value';
        hoursValue.style.cssText = `
            font-size: 16px;
            font-weight: 900;
            color: #ecf0f1;
            text-align: center;
            white-space: nowrap;
            line-height: 1;
            font-family: 'Courier New', monospace;
        `;
        hoursValue.innerHTML = '<span id="sioc-hours-number">---</span><span style="font-size:11px;font-weight:bold;color:#bdc3c7;">hrs.</span>';
        hoursCell.appendChild(hoursValue);

        const siocCell = document.createElement('div');
        siocCell.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            padding: 6px 8px;
        `;

        const valueDisplay = document.createElement('div');
        valueDisplay.id = 'sioc-value';
        valueDisplay.textContent = '---';
        valueDisplay.style.cssText = `
            font-size: 19px;
            font-weight: 900;
            color: rgb(255, 30, 30);
            transition: color 0.5s ease;
            text-align: center;
            font-family: 'Courier New', monospace;
        `;

        siocCell.appendChild(valueDisplay);
        bodyRow.appendChild(hoursCell);
        bodyRow.appendChild(siocCell);
        dashboard.appendChild(header);
        dashboard.appendChild(bodyRow);
        document.body.appendChild(dashboard);

        siocValueElement = valueDisplay;
        hoursValueElement = document.getElementById('sioc-hours-number');

        console.log('[FCLM AA Time Checker] SIOC dashboard created at ' + new Date().toISOString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BINCON DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    function createBinconDashboard() {
        const existingDashboard = document.getElementById('bincon-dashboard');
        if (existingDashboard) existingDashboard.remove();

        const dashboard = document.createElement('div');
        dashboard.id = 'bincon-dashboard';
        dashboard.className = 'fclm-dashboard-card';
        dashboard.style.cssText = `
            position: fixed;
            top: 176px;
            right: 20px;
            z-index: 10000;
            background: rgba(13, 31, 60, 0.92);
            border: 1px solid #001f3f;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
            width: 141px;
        `;

        let lastRefreshed = 'Not yet';
        dashboard.onmouseover = function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
            this.style.filter = 'brightness(1.1)';
            this.title = 'Last refreshed: ' + lastRefreshed;
        };
        dashboard.onmouseout = function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
            this.style.filter = 'brightness(1)';
        };
        dashboard.onclick = function() {
            window.open(getBinconURL(), '_blank');
        };
        dashboard._setRefreshed = function() {
            lastRefreshed = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        };

        const refreshDot = document.createElement('div');
        refreshDot.className = 'fclm-refresh-dot';
        refreshDot.id = 'bincon-refresh-dot';
        dashboard.appendChild(refreshDot);

        const header = document.createElement('div');
        header.textContent = 'BINCON';
        header.style.cssText = `
            font-size: 9px;
            font-weight: bold;
            color: white;
            background-color: rgba(0, 31, 63, 0.85);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            width: 100%;
            text-align: center;
            padding: 5px 0;
            box-sizing: border-box;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        `;

        const bodyRow = document.createElement('div');
        bodyRow.style.cssText = `
            display: flex;
            flex-direction: row;
            width: 100%;
            align-items: center;
            justify-content: center;
        `;


        const binconCell = document.createElement('div');
        binconCell.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            padding: 6px 8px;
            overflow: hidden;
            min-width: 0;
        `;

        const binconValueDiv = document.createElement('div');
        binconValueDiv.id = 'bincon-value';
        binconValueDiv.style.cssText = `
           font-size: 16px;
           font-weight: 900;
           color: rgb(255, 140, 00);
           transition: color 0.5s ease;
           text-align: center;
           white-space: nowrap;
           line-height: 1;
           font-family: 'Courier New', monospace;
           max-width: 100%;
           overflow: hidden;
        `;


        binconValueDiv.innerHTML = '<span id="bincon-hours-number">---</span><span id="bincon-hrs-suffix" style="font-size:11px;font-weight:bold;color:#bdc3c7;">hrs.</span>';

        binconCell.appendChild(binconValueDiv);
        bodyRow.appendChild(binconCell);
        dashboard.appendChild(header);
        dashboard.appendChild(bodyRow);
        document.body.appendChild(dashboard);

        binconValueElement = document.getElementById('bincon-hours-number');

        console.log('[FCLM AA Time Checker] BINCON dashboard created at ' + new Date().toISOString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POUT DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    function createPoutDashboard() {
        const existingDashboard = document.getElementById('pout-dashboard');
        if (existingDashboard) existingDashboard.remove();

        const dashboard = document.createElement('div');
        dashboard.id = 'pout-dashboard';
        dashboard.className = 'fclm-dashboard-card';
        dashboard.style.cssText = `
            position: fixed;
            top: 240px;
            right: 20px;
            z-index: 10000;
            background: rgba(13, 31, 60, 0.92);
            border: 1px solid #001f3f;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
            width: 141px;
        `;

        let lastRefreshed = 'Not yet';
        dashboard.onmouseover = function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
            this.style.filter = 'brightness(1.1)';
            this.title = 'Last refreshed: ' + lastRefreshed;
        };
        dashboard.onmouseout = function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
            this.style.filter = 'brightness(1)';
        };
        dashboard.onclick = function() {
            window.open(getPoutURL(), '_blank');
        };
        dashboard._setRefreshed = function() {
            lastRefreshed = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        };

        const refreshDot = document.createElement('div');
        refreshDot.className = 'fclm-refresh-dot';
        refreshDot.id = 'pout-refresh-dot';
        dashboard.appendChild(refreshDot);

        const header = document.createElement('div');
        header.textContent = 'POUT';
        header.style.cssText = `
            font-size: 9px;
            font-weight: bold;
            color: white;
            background-color: rgba(0, 31, 63, 0.85);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            width: 100%;
            text-align: center;
            padding: 5px 0;
            box-sizing: border-box;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        `;

        const bodyRow = document.createElement('div');
        bodyRow.style.cssText = `
            display: flex;
            flex-direction: row;
            width: 100%;
            align-items: center;
            justify-content: center;
        `;

        const poutCell = document.createElement('div');
        poutCell.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            padding: 6px 8px;
        `;

        const poutValueDiv = document.createElement('div');
        poutValueDiv.id = 'pout-value';
        poutValueDiv.style.cssText = `
            font-size: 16px;
            font-weight: 900;
            color: rgb(255, 60, 60);
            transition: color 0.5s ease;
            text-align: center;
            white-space: nowrap;
            line-height: 1;
            font-family: 'Courier New', monospace;
        `;
        poutValueDiv.innerHTML = '<span id="pout-hours-number">---</span><span id="pout-hrs-suffix" style="font-size:11px;font-weight:bold;color:#bdc3c7;">hrs.</span>';

        poutCell.appendChild(poutValueDiv);
        bodyRow.appendChild(poutCell);
        dashboard.appendChild(header);
        dashboard.appendChild(bodyRow);
        document.body.appendChild(dashboard);

        poutValueElement = document.getElementById('pout-hours-number');

        console.log('[FCLM AA Time Checker] POUT dashboard created at ' + new Date().toISOString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH SIOC
    // ─────────────────────────────────────────────────────────────────────────
    function fetchSIOCValue() {
        const url = getCurrentWeekURL();
        console.log('[FCLM AA Time Checker] Fetching SIOC from: ' + url);

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');

                    let targetTable = null;
                    doc.querySelectorAll('caption').forEach(function(caption) {
                        if (caption.textContent.includes('ECR/FFP Testing') && caption.textContent.includes('4300018880')) {
                            targetTable = caption.closest('table');
                        }
                    });

                    if (targetTable) {
                        const totalRows = targetTable.querySelectorAll('tr.total.empl-all');
                        let siocValue = null;
                        let hoursValue = null;

                        for (var i = 0; i < totalRows.length; i++) {
                            var row = totalRows[i];
                            if (row.style.display === 'none') continue;

                            var allCells = row.querySelectorAll('td');

                            if (allCells.length >= 6) {
                                var siocText = allCells[5].textContent.trim();
                                var parsedSioc = parseInt(parseLocalizedNumber(siocText));
                                if (!isNaN(parsedSioc)) siocValue = parsedSioc;
                            }

                            if (allCells.length >= 5) {
                                var hoursText = allCells[4].textContent.trim();
                                var parsedHours = parseLocalizedNumber(hoursText);
                                if (!isNaN(parsedHours)) hoursValue = parsedHours;
                            }

                            if (siocValue !== null) break;
                        }


                        if (siocValue !== null && siocValueElement) {
                            siocValueElement.textContent = siocValue.toString();
                            if (siocValueElement.textContent === '---') siocValueElement.classList.add('fclm-na-value');
                            else siocValueElement.classList.remove('fclm-na-value');

                            siocValueElement.style.color = getColorForValue(siocValue);
                            applyNAStyle(siocValueElement);
                            var siocDash = document.getElementById('sioc-dashboard');
                            if (siocDash && siocDash._setRefreshed) siocDash._setRefreshed();
                            console.log('[FCLM AA Time Checker] SIOC updated to: ' + siocValue);
                        }

                        if (hoursValue !== null && hoursValueElement) {
                            hoursValueElement.textContent = hoursValue.toFixed(1);
                            applyNAStyle(hoursValueElement);
                        } else if (hoursValueElement) {
                            hoursValueElement.textContent = 'N/A';
                            applyNAStyle(hoursValueElement);
                        }
                    } else {
                        console.log('[FCLM AA Time Checker] Could not find ECR/FFP Testing table');
                    }
                } else {
                    console.log('[FCLM AA Time Checker] Failed to fetch SIOC (status: ' + response.status + ')');
                }
            },
            onerror: function() {
                console.log('[FCLM AA Time Checker] Error fetching SIOC data');
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH BINCON
    // ─────────────────────────────────────────────────────────────────────────
    var BINCON_MANAGERS = ['barrios munoz,luna', 'puerto aranda,adrià'];

    function fetchBinconValue() {
        var url = getBinconURL();
        console.log('[FCLM AA Time Checker] Fetching BINCON from: ' + url);

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response.responseText, 'text/html');

                    var targetTable = null;
                    var byId = doc.getElementById('function-4300000158');
                    if (byId) {
                        targetTable = byId;
                        console.log('[FCLM AA Time Checker] Found BINCON table by ID');
                    } else {
                        doc.querySelectorAll('caption').forEach(function(caption) {
                            if (caption.textContent.includes('Bin Consolidation')) {
                                targetTable = caption.closest('table');
                                console.log('[FCLM AA Time Checker] Found BINCON table by caption');
                            }
                        });
                    }

                    if (targetTable) {
                        var employeeRows = targetTable.querySelectorAll('tbody tr.empl-all');
                        var totalHours = 0;
                        var matchCount = 0;

                        employeeRows.forEach(function(row, rowIdx) {
                            if (row.style.display === 'none') return;
                            var cells = row.querySelectorAll('td');
                            if (cells.length < 9) return;

                            var managerText = cells[3].textContent.trim().toLowerCase();
                            var isTargetManager = BINCON_MANAGERS.some(function(m) { return managerText.includes(m); });

                            console.log('[FCLM AA Time Checker] BINCON row ' + rowIdx + ': manager="' + managerText + '", match=' + isTargetManager);

                            if (isTargetManager) {
                                var hoursText = cells[8].textContent.trim();
                                var hours = parseLocalizedNumber(hoursText);
                                if (!isNaN(hours)) {
                                    totalHours += hours;
                                    matchCount++;
                                    console.log('[FCLM AA Time Checker] BINCON: added ' + hours + ' hrs from row ' + rowIdx + ' (running total: ' + totalHours + ')');
                                }
                            }
                        });

                        console.log('[FCLM AA Time Checker] BINCON total: ' + totalHours.toFixed(2) + ' hrs from ' + matchCount + ' AAs');

                        if (binconValueElement) {
                            binconValueElement.innerHTML = totalHours.toFixed(1) + '<span style="font-size:0.8em; font-weight:bold; color:#bdc3c7;">/40 </span>';
                            applyNAStyle(binconValueElement);
                            var color = getBinconColor(totalHours);
                            binconValueElement.style.color = color;
                            var suffixSpan = document.getElementById('bincon-hrs-suffix');
                            if (suffixSpan) suffixSpan.style.color = color;
                            var binconDash = document.getElementById('bincon-dashboard');
                            if (binconDash && binconDash._setRefreshed) binconDash._setRefreshed();
                        }

                        if (binconUpdateTimeElement) {
                            var now = new Date();
                            binconUpdateTimeElement.textContent = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
                        }

                    } else {
                        console.log('[FCLM AA Time Checker] Could not find Bin Consolidation table');
                    }
                } else {
                    console.log('[FCLM AA Time Checker] Failed to fetch BINCON (status: ' + response.status + ')');
                }
            },
            onerror: function() {
                console.log('[FCLM AA Time Checker] Error fetching BINCON data');
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH POUT
    // ─────────────────────────────────────────────────────────────────────────
    function fetchPoutValue() {
        var url = getPoutURL();
        console.log('[FCLM AA Time Checker] Fetching POUT from: ' + url);

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response.responseText, 'text/html');

                    var targetTable = null;
                    doc.querySelectorAll('caption').forEach(function(caption) {
                        if (caption.textContent.includes('TransferOut PSolve') && caption.textContent.includes('4300006849')) {
                            targetTable = caption.closest('table');
                            console.log('[FCLM AA Time Checker] Found POUT table');
                        }
                    });

                    if (targetTable) {
                        var poutHours = null;
                        var totalRows = targetTable.querySelectorAll('tr.total.empl-all');
                        console.log('[FCLM AA Time Checker] POUT: found ' + totalRows.length + ' total.empl-all rows');

                        for (var i = 0; i < totalRows.length; i++) {
                            var row = totalRows[i];
                            if (row.style.display === 'none') continue;

                            var totalCells = row.querySelectorAll('td.size-total.highlighted');
                            console.log('[FCLM AA Time Checker] POUT total row ' + i + ': found ' + totalCells.length + ' size-total cells');

                            for (var j = 0; j < totalCells.length; j++) {
                                var rawVal = totalCells[j].textContent.trim();
                                var parsed = parseLocalizedNumber(rawVal);
                                if (!isNaN(parsed) && (rawVal.includes('.') || rawVal.includes(','))) {
                                    poutHours = parsed;
                                    console.log('[FCLM AA Time Checker] POUT hours (cell ' + j + '): ' + poutHours);
                                    break;
                                }
                            }

                            if (poutHours !== null) break;
                        }

                        if (poutHours !== null && poutValueElement) {
                            poutValueElement.innerHTML = poutHours.toFixed(1) + '<span style="font-size:0.8em; font-weight:bold; color:#bdc3c7;">/40 </span>';
                            applyNAStyle(poutValueElement);
                            var color = getBinconColor(poutHours);
                            poutValueElement.style.color = color;
                            var suffixSpan = document.getElementById('pout-hrs-suffix');
                            if (suffixSpan) suffixSpan.style.color = color;
                            var poutDash = document.getElementById('pout-dashboard');
                            if (poutDash && poutDash._setRefreshed) poutDash._setRefreshed();
                            console.log('[FCLM AA Time Checker] POUT updated to: ' + poutHours);
                        } else {
                            console.log('[FCLM AA Time Checker] Could not find POUT value');
                        }
                    } else {
                        console.log('[FCLM AA Time Checker] Could not find TransferOut PSolve table');
                    }
                } else {
                    console.log('[FCLM AA Time Checker] Failed to fetch POUT (status: ' + response.status + ')');
                }
            },
            onerror: function() {
                console.log('[FCLM AA Time Checker] Error fetching POUT data');
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMPLOYEE INDICATORS
    // ─────────────────────────────────────────────────────────────────────────
    function addIndicatorToEmployee(linkElement, employeeId, hasBlueEditable, hasRedTimeOffTask) {
        var existingIndicators = linkElement.querySelectorAll('.editable-time-indicator');
        existingIndicators.forEach(function(ind) { ind.remove(); });

        if (hasBlueEditable) {
            var yellowIndicator = document.createElement('span');
            yellowIndicator.className = 'editable-time-indicator yellow-indicator';
            yellowIndicator.style.cssText = 'display:inline-block;width:12px;height:12px;background-color:#FFD700;border-radius:50%;margin-left:8px;box-shadow:0 0 8px rgba(255,215,0,0.8);animation:pulse-dot 1.5s infinite;vertical-align:middle;';
            yellowIndicator.title = 'This AA has unedited blue time segments';
            linkElement.appendChild(yellowIndicator);
            console.log('[FCLM AA Time Checker] Added yellow dot for employee ' + employeeId);
        }

        if (hasRedTimeOffTask) {
            var redIndicator = document.createElement('span');
            redIndicator.className = 'editable-time-indicator red-indicator';
            redIndicator.style.cssText = 'display:inline-block;width:12px;height:12px;background-color:#ff0000;border-radius:50%;margin-left:8px;box-shadow:0 0 8px rgba(255,0,0,0.8);animation:pulse-dot 1.5s infinite;vertical-align:middle;';
            redIndicator.title = 'This AA has >20 continuous minutes of editable Time off task';
            linkElement.appendChild(redIndicator);
            console.log('[FCLM AA Time Checker] Added red dot for employee ' + employeeId);
        }
    }

    function calculateMinutesFromWidth(widthPercent) {
        return (widthPercent / 100) * 480;
    }

    function getParentTRClasses(element) {
        var current = element;
        while (current && current.tagName !== 'TR' && current !== document.body) {
            current = current.parentElement;
        }
        if (current && current.tagName === 'TR') {
            return Array.from(current.classList);
        }
        return [];
    }

    function checkEmployeeTimeline(employeeId, timeDetailsUrl, linkElement) {
        if (checkedEmployees.has(employeeId)) return;

        checkedEmployees.add(employeeId);
        console.log('[FCLM AA Time Checker] Checking employee ' + employeeId);

        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://fclm-portal.amazon.com' + timeDetailsUrl,
            onload: function(response) {
                if (response.status === 200) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response.responseText, 'text/html');

                    var hasBlueEditable = false;
                    var hasRedTimeOffTask = false;

                    var allEditableSegments = doc.querySelectorAll('p.time-segment.editable');

                    allEditableSegments.forEach(function(segment, index) {
                        var parentTRClasses = getParentTRClasses(segment);

                        if (parentTRClasses.includes('edited')) return;

                        if (parentTRClasses.includes('timeOffTask')) {
                            var style = segment.getAttribute('style') || '';
                            var widthMatch = style.match(/width:\s*([\d.]+)%/);
                            var width = widthMatch ? parseFloat(widthMatch[1]) : 0;
                            var minutes = calculateMinutesFromWidth(width);
                            if (minutes > 20) {
                                hasRedTimeOffTask = true;
                            }
                        } else if (parentTRClasses.includes('function-seg') && parentTRClasses.includes('indirect')) {
                            hasBlueEditable = true;
                        }
                    });

                    console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' - Blue: ' + hasBlueEditable + ', Red TOT: ' + hasRedTimeOffTask);

                    if (hasBlueEditable || hasRedTimeOffTask) {
                        employeeResults.set(employeeId, { hasBlueEditable: hasBlueEditable, hasRedTimeOffTask: hasRedTimeOffTask });
                        addIndicatorToEmployee(linkElement, employeeId, hasBlueEditable, hasRedTimeOffTask);
                    }
                } else {
                    console.log('[FCLM AA Time Checker] Failed to fetch timeline for employee ' + employeeId + ' (status: ' + response.status + ')');
                }
            },
            onerror: function() {
                console.log('[FCLM AA Time Checker] Error fetching timeline for employee ' + employeeId);
            }
        });
    }

    function scanEmployeeLinks() {
        var employeeLinks = document.querySelectorAll('a[href*="/employee/timeDetails"]');
        console.log('[FCLM AA Time Checker] Found ' + employeeLinks.length + ' employee links');

        employeeLinks.forEach(function(link) {
            var href = link.getAttribute('href');
            var employeeIdMatch = href.match(/employeeId=(\d+)/);
            if (employeeIdMatch) {
                var employeeId = employeeIdMatch[1];
                checkEmployeeTimeline(employeeId, href, link);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ICQA SHIFT BUTTONS
    // ─────────────────────────────────────────────────────────────────────────
    function createICQAButtons() {
        const submitRow = document.querySelector('td.cp-submit-row');
        if (!submitRow) {
            console.log('[FCLM AA Time Checker] Could not find cp-submit-row');
            return;
        }

           const buttonStyle = `
            display: inline-block;
            background-color: #001f3f;
            color: white;
            border: none;
            padding: 6px 13px;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.3s;
            text-decoration: none;
            font-family: 'Roboto', sans-serif;
            white-space: nowrap;
        `;

        function getShiftURL(shift) {
            const params = new URLSearchParams(window.location.search);
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');

            let startDate, endDate, startHour, endHour;

            if (shift === 'early') {
                startDate = `${year}/${month}/${day}`;
                endDate = `${year}/${month}/${day}`;
                startHour = 7;
                endHour = 15;
            } else if (shift === 'late') {
                startDate = `${year}/${month}/${day}`;
                endDate = `${year}/${month}/${day}`;
                startHour = 15;
                endHour = 23;
            } else {
                var currentHour = today.getHours();
                if (currentHour >= 23) {
                    var tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    startDate = `${year}/${month}/${day}`;
                    endDate = `${tomorrow.getFullYear()}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${String(tomorrow.getDate()).padStart(2, '0')}`;
                } else {
                    var yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    startDate = `${yesterday.getFullYear()}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${String(yesterday.getDate()).padStart(2, '0')}`;
                    endDate = `${year}/${month}/${day}`;
                }
                startHour = 23;
                endHour = 7;
            }

            var warehouseId = params.get('warehouseId') || 'MAD7';
            var processId = params.get('processId') || '1003030';

            return `?reportFormat=HTML&warehouseId=${warehouseId}&processId=${processId}&maxIntradayDays=1&spanType=Intraday&startDateIntraday=${encodeURIComponent(startDate)}&startHourIntraday=${startHour}&startMinuteIntraday=0&endDateIntraday=${encodeURIComponent(endDate)}&endHourIntraday=${endHour}&endMinuteIntraday=0`;
        }

        var shifts = [
            { label: 'ICQA ES', shift: 'early' },
            { label: 'ICQA LS', shift: 'late' },
            { label: 'ICQA NS', shift: 'night' }
        ];

        // Create a wrapper to center the buttons between legacy link and CSV
        var wrapper = document.createElement('span');
        wrapper.style.cssText = `
            display: inline-flex;
            gap: 6px;
            margin: 0 auto;
            padding: 0 20px;
        `;

        shifts.forEach(function(item) {
            var btn = document.createElement('a');
            btn.textContent = item.label;
            btn.style.cssText = buttonStyle;
            btn.onmouseover = function() { this.style.backgroundColor = '#003366'; };
            btn.onmouseout = function() { this.style.backgroundColor = '#001f3f'; };
            btn.onclick = function(e) {
                e.preventDefault();
                window.location.href = getShiftURL(item.shift);
            };
            wrapper.appendChild(btn);
        });

        // Make the row use flexbox to center the buttons between legacy and CSV/HTML
        submitRow.style.display = 'flex';
        submitRow.style.alignItems = 'center';
        submitRow.style.justifyContent = 'space-between';

        // Find CSV link and insert wrapper before it
        var csvLink = submitRow.querySelector('a[data-click-metric="CSV"]');
        if (csvLink) {
            submitRow.insertBefore(wrapper, csvLink);
        } else {
            submitRow.appendChild(wrapper);
        }

        console.log('[FCLM AA Time Checker] ICQA shift buttons created');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────────────────
    function init() {
        console.log('[FCLM AA Time Checker] Initializing for URL: ' + window.location.href);

        addStyles();
        createNavigationButtons();
        createSIOCDashboard();
        createBinconDashboard();
        createPoutDashboard();
        createICQAButtons();

        setTimeout(function() { fetchSIOCValue(); }, 500);
        setTimeout(function() { fetchBinconValue(); }, 800);
        setTimeout(function() { fetchPoutValue(); }, 1100);
        setTimeout(function() { scanEmployeeLinks(); }, 2000);

        var observer = new MutationObserver(function() {
            scanEmployeeLinks();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setInterval(function() { scanEmployeeLinks(); }, 30000);
        setInterval(function() { fetchSIOCValue(); }, 600000);
        setInterval(function() { fetchBinconValue(); }, 600000);
        setInterval(function() { fetchPoutValue(); }, 600000);

        console.log('[FCLM AA Time Checker] Monitoring started at ' + new Date().toISOString());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

