// ==UserScript==
// @name         FCLM Portal - Time Checker V2
// @namespace    http://tampermonkey.net/
// @version      9.5
// @description  Checks each AA's timeline for editable time segments and displays data dashboards. Filters break-time idle.
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
    // BREAK TIME CONFIGURATION
    // Idle segments that overlap these windows will NOT trigger a dot.
    //
    // Breaks:
    //   Early Shift: 10:45-11:15 → with 3min buffer: 10:42-11:18
    //   Late Shift:  19:45-20:15 → with 3min buffer: 19:42-20:18
    //   Night Shift: 03:30-04:00 → with 3min buffer: 03:27-04:03
    // ─────────────────────────────────────────────────────────────────────────
    const BREAK_WINDOWS = {
        early: { startMin: 10 * 60 + 42, endMin: 11 * 60 + 18 },  // 642 - 678
        late:  { startMin: 19 * 60 + 42, endMin: 20 * 60 + 18 },  // 1182 - 1218
        night: { startMin: 3 * 60 + 27,  endMin: 4 * 60 + 3 }     // 207 - 243
    };

    /**
     * Parses a time string from the timeline TD element.
     * Format: "MM/DD-HH:MM:SS" (e.g., "05/30-17:08:02")
     * Returns minutes since midnight (0-1439), or null if parsing fails.
     */
    function parseTimeFromTD(timeText) {
        if (!timeText) return null;
        var trimmed = timeText.trim();
        var dashIndex = trimmed.indexOf('-');
        if (dashIndex === -1) return null;
        var timePart = trimmed.substring(dashIndex + 1); // "HH:MM:SS"
        var parts = timePart.split(':');
        if (parts.length < 2) return null;
        var hours = parseInt(parts[0], 10);
        var minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
    }

    /**
     * Determines if an idle segment overlaps with the break window.
     *
     * @param {number} segStartMin - Segment start time in minutes since midnight
     * @param {number} segEndMin - Segment end time in minutes since midnight
     * @returns {boolean} true if the segment overlaps with break time
     */
    function isIdleDuringBreak(segStartMin, segEndMin) {
        var shift = detectShift();
        var breakWindow = BREAK_WINDOWS[shift];
        if (!breakWindow) return false;

        var breakStart = breakWindow.startMin;
        var breakEnd = breakWindow.endMin;

        // Handle night shift: segment might cross midnight
        if (shift === 'night') {
            var nightShiftStart = 23 * 60; // 1380

            var normSegStart = segStartMin >= nightShiftStart ? segStartMin - nightShiftStart : segStartMin + (1440 - nightShiftStart);
            var normSegEnd = segEndMin >= nightShiftStart ? segEndMin - nightShiftStart : segEndMin + (1440 - nightShiftStart);
            var normBreakStart = breakStart + (1440 - nightShiftStart);
            var normBreakEnd = breakEnd + (1440 - nightShiftStart);

            if (normSegEnd < normSegStart) normSegEnd += 1440;

            var overlaps = (normSegStart < normBreakEnd) && (normSegEnd > normBreakStart);

            if (overlaps) {
                console.log('[FCLM AA Time Checker] Break filter (night): idle ' +
                    Math.floor(segStartMin / 60) + ':' + String(segStartMin % 60).padStart(2, '0') +
                    ' - ' + Math.floor(segEndMin / 60) + ':' + String(segEndMin % 60).padStart(2, '0') +
                    ' overlaps with break window. Skipping.');
            }
            return overlaps;
        }

        // For early and late shifts: straightforward overlap check
        var overlaps = (segStartMin < breakEnd) && (segEndMin > breakStart);

        if (overlaps) {
            console.log('[FCLM AA Time Checker] Break filter (' + shift + '): idle ' +
                Math.floor(segStartMin / 60) + ':' + String(segStartMin % 60).padStart(2, '0') +
                ' - ' + Math.floor(segEndMin / 60) + ':' + String(segEndMin % 60).padStart(2, '0') +
                ' overlaps with break window. Skipping.');
        }

        return overlaps;
    }

    /**
     * Gets the start and end time (in minutes since midnight) from a segment's parent TR.
     * Reads the TD elements which contain timestamps like "05/30-17:08:02".
     *
     * TR structure:
     *   <td colspan="2">Label</td>       ← tds[0]
     *   <td>05/30-17:08:02</td>           ← tds[1] = START
     *   <td>05/30-17:42:58</td>           ← tds[2] = END
     *   <td class="rightAlign">34:55</td> ← tds[3] = DURATION
     *
     * @param {Element} parentTR - The parent TR element
     * @returns {{ startMin: number, endMin: number } | null}
     */
    function getSegmentTimes(parentTR) {
        if (!parentTR) return null;
        var tds = parentTR.querySelectorAll('td');
        if (tds.length < 3) return null;

        var startText = tds[1].textContent;
        var endText = tds[2].textContent;

        var startMin = parseTimeFromTD(startText);
        var endMin = parseTimeFromTD(endText);

        if (startMin === null || endMin === null) return null;
        return { startMin: startMin, endMin: endMin };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER: Parse number that may use comma as decimal separator
    // ─────────────────────────────────────────────────────────────────────────
    function parseLocalizedNumber(text) {
        if (!text) return NaN;
        var cleaned = text.trim();

        var hasDot = cleaned.indexOf('.') !== -1;
        var hasComma = cleaned.indexOf(',') !== -1;

        if (hasDot && hasComma) {
            if (cleaned.lastIndexOf('.') < cleaned.lastIndexOf(',')) {
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else {
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (hasComma && !hasDot) {
            var parts = cleaned.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
                cleaned = cleaned.replace(',', '.');
            } else if (parts.length === 2 && parts[1].length === 3) {
                cleaned = cleaned.replace(',', '');
            } else {
                cleaned = cleaned.replace(/,/g, '');
            }
        }

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
        if (value <= 43) {
            return 'rgb(0, 220, 0)';
        }
        var overAmount = Math.min((value - 43) / 17, 1);
        if (overAmount < 0.33) {
            var t = overAmount / 0.33;
            var r3 = Math.round(255 * t);
            return 'rgb(' + r3 + ', 220, 0)';
        } else if (overAmount < 0.66) {
            var t2 = (overAmount - 0.33) / 0.33;
            var g4 = Math.round(220 - 100 * t2);
            return 'rgb(255, ' + g4 + ', 0)';
        } else {
            var t3 = (overAmount - 0.66) / 0.34;
            var g5 = Math.round(120 - 90 * t3);
            return 'rgb(255, ' + g5 + ', 0)';
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
        return `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1002960&spanType=Week&startDateWeek=${dateString}&maxIntradayDays=1&startDateIntraday=${today}&startHourIntraday=15&startMinuteIntraday=0&endDateIntraday=${today}&endHourIntraday=23&endMinuteIntraday=0`;
    }

    function getBinconURL() {
        const weekStart = getWeekStartEncoded();
        const today = getTodayEncoded();
        const tomorrow = getTomorrowEncoded();
        const shift = detectShift();
        let startHour, endHour, startDate, endDate;
        if (shift === 'early') { startHour = 7; endHour = 15; startDate = today; endDate = today; }
        else if (shift === 'late') { startHour = 15; endHour = 23; startDate = today; endDate = today; }
        else { startHour = 23; endHour = 7; startDate = today; endDate = tomorrow; }
        return `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1003012&startDateDay=${today}&spanType=Week&startDateWeek=${weekStart}&maxIntradayDays=1&startDateIntraday=${startDate}&startHourIntraday=${startHour}&startMinuteIntraday=0&endDateIntraday=${endDate}&endHourIntraday=${endHour}&endMinuteIntraday=0`;
    }

    function getPoutURL() {
        const weekStart = getWeekStartEncoded();
        const today = getTodayEncoded();
        const tomorrow = getTomorrowEncoded();
        const shift = detectShift();
        let startHour, endHour, startDate, endDate;
        if (shift === 'early') { startHour = 7; endHour = 15; startDate = today; endDate = today; }
        else if (shift === 'late') { startHour = 15; endHour = 23; startDate = today; endDate = today; }
        else { startHour = 23; endHour = 7; startDate = today; endDate = tomorrow; }
        return `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1003018&spanType=Week&startDateWeek=${weekStart}&maxIntradayDays=1&startDateIntraday=${startDate}&startHourIntraday=${startHour}&startMinuteIntraday=0&endDateIntraday=${endDate}&endHourIntraday=${endHour}&endMinuteIntraday=0`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NAVIGATION BUTTONS
    // ─────────────────────────────────────────────────────────────────────────
    function createNavigationButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `position:fixed;top:80px;right:20px;z-index:10000;display:flex;gap:4px;width:142.5px;box-sizing:border-box;`;

        const btnStyle = `background-color:#001f3f;color:white;border:none;padding:5px 0;font-size:9px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;border-radius:5px;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.3);transition:background-color 0.3s;flex:1;`;

        const totButton = document.createElement('button');
        totButton.textContent = 'ToT';
        totButton.style.cssText = btnStyle;
        totButton.onmouseover = function() { this.style.backgroundColor = '#003366'; };
        totButton.onmouseout = function() { this.style.backgroundColor = '#001f3f'; };
        totButton.onclick = function() {
            const today = new Date();
            const dateString = `${today.getFullYear()}%2F${String(today.getMonth()+1).padStart(2,'0')}%2F${String(today.getDate()).padStart(2,'0')}`;
            window.open(`https://fclm-portal.amazon.com/reports/timeOnTask?reportFormat=HTML&warehouseId=MAD7&spanType=Day&startDateDay=${dateString}&maxIntradayDays=30&startHourIntraday=0&startMinuteIntraday=0&endHourIntraday=0&endMinuteIntraday=0`, '_blank');
        };

        const removeButton = document.createElement('button');
        removeButton.textContent = 'RMV';
        removeButton.style.cssText = btnStyle;
        removeButton.onmouseover = function() { this.style.backgroundColor = '#003366'; };
        removeButton.onmouseout = function() { this.style.backgroundColor = '#001f3f'; };
        removeButton.onclick = function() {
            const today = new Date();
            const dateString = `${today.getFullYear()}%2F${String(today.getMonth()+1).padStart(2,'0')}%2F${String(today.getDate()).padStart(2,'0')}`;
            window.open(`https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1002960&spanType=Day&startDateDay=${dateString}&maxIntradayDays=1&startDateIntraday=${dateString}&startHourIntraday=15&startMinuteIntraday=0&endDateIntraday=${dateString}&endHourIntraday=23&endMinuteIntraday=0`, '_blank');
        };

        buttonContainer.appendChild(totButton);
        buttonContainer.appendChild(removeButton);
        document.body.appendChild(buttonContainer);
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
        dashboard.style.cssText = `position:fixed;top:110px;right:20px;z-index:10000;background:rgba(13,31,60,0.92);border:1px solid #001f3f;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;flex-direction:column;overflow:hidden;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s,filter 0.2s;width:141px;`;

        let lastRefreshed = 'Not yet';
        dashboard.onmouseover = function() { this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 16px rgba(0,0,0,0.5)';this.style.filter='brightness(1.1)';this.title='Last refreshed: '+lastRefreshed; };
        dashboard.onmouseout = function() { this.style.transform='scale(1)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)';this.style.filter='brightness(1)'; };
        dashboard.onclick = function() { window.open(getCurrentWeekURL(), '_blank'); };
        dashboard._setRefreshed = function() { lastRefreshed = new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); };

        const refreshDot = document.createElement('div');
        refreshDot.className = 'fclm-refresh-dot';
        refreshDot.id = 'sioc-refresh-dot';
        dashboard.appendChild(refreshDot);

        const header = document.createElement('div');
        header.textContent = 'SIOC';
        header.style.cssText = `font-size:9px;font-weight:bold;color:white;background-color:rgba(0,31,63,0.85);border-bottom:1px solid rgba(255,255,255,0.1);width:100%;text-align:center;padding:5px 0;box-sizing:border-box;letter-spacing:1.5px;text-transform:uppercase;`;

        const bodyRow = document.createElement('div');
        bodyRow.style.cssText = `display:flex;flex-direction:row;width:100%;`;

        const hoursCell = document.createElement('div');
        hoursCell.style.cssText = `display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:1px solid rgba(255,255,255,0.15);flex:1;padding:6px 8px;`;
        const hoursValue = document.createElement('div');
        hoursValue.id = 'sioc-hours-value';
        hoursValue.style.cssText = `font-size:16px;font-weight:900;color:#ecf0f1;text-align:center;white-space:nowrap;line-height:1;font-family:'Courier New',monospace;`;
        hoursValue.innerHTML = '<span id="sioc-hours-number">---</span><span style="font-size:11px;font-weight:bold;color:#bdc3c7;">hrs.</span>';
        hoursCell.appendChild(hoursValue);

        const siocCell = document.createElement('div');
        siocCell.style.cssText = `display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:6px 8px;`;
        const valueDisplay = document.createElement('div');
        valueDisplay.id = 'sioc-value';
        valueDisplay.textContent = '---';
        valueDisplay.style.cssText = `font-size:19px;font-weight:900;color:rgb(255,30,30);transition:color 0.5s ease;text-align:center;font-family:'Courier New',monospace;`;
        siocCell.appendChild(valueDisplay);

        bodyRow.appendChild(hoursCell);
        bodyRow.appendChild(siocCell);
        dashboard.appendChild(header);
        dashboard.appendChild(bodyRow);
        document.body.appendChild(dashboard);

        siocValueElement = valueDisplay;
        hoursValueElement = document.getElementById('sioc-hours-number');
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
        dashboard.style.cssText = `position:fixed;top:176px;right:20px;z-index:10000;background:rgba(13,31,60,0.92);border:1px solid #001f3f;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;flex-direction:column;overflow:hidden;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s,filter 0.2s;width:141px;`;

        let lastRefreshed = 'Not yet';
        dashboard.onmouseover = function() { this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 16px rgba(0,0,0,0.5)';this.style.filter='brightness(1.1)';this.title='Last refreshed: '+lastRefreshed; };
        dashboard.onmouseout = function() { this.style.transform='scale(1)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)';this.style.filter='brightness(1)'; };
        dashboard.onclick = function() { window.open(getBinconURL(), '_blank'); };
        dashboard._setRefreshed = function() { lastRefreshed = new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); };

        const refreshDot = document.createElement('div');
        refreshDot.className = 'fclm-refresh-dot';
        refreshDot.id = 'bincon-refresh-dot';
        dashboard.appendChild(refreshDot);

        const header = document.createElement('div');
        header.textContent = 'BINCON';
        header.style.cssText = `font-size:9px;font-weight:bold;color:white;background-color:rgba(0,31,63,0.85);border-bottom:1px solid rgba(255,255,255,0.1);width:100%;text-align:center;padding:5px 0;box-sizing:border-box;letter-spacing:1.5px;text-transform:uppercase;`;

        const bodyRow = document.createElement('div');
        bodyRow.style.cssText = `display:flex;flex-direction:row;width:100%;align-items:center;justify-content:center;`;

        const binconCell = document.createElement('div');
        binconCell.style.cssText = `display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:6px 8px;overflow:hidden;min-width:0;`;
        const binconValueDiv = document.createElement('div');
        binconValueDiv.id = 'bincon-value';
        binconValueDiv.style.cssText = `font-size:16px;font-weight:900;color:rgb(255,140,0);transition:color 0.5s ease;text-align:center;white-space:nowrap;line-height:1;font-family:'Courier New',monospace;max-width:100%;overflow:hidden;`;
        binconValueDiv.innerHTML = '<span id="bincon-hours-number">---</span><span id="bincon-hrs-suffix" style="font-size:11px;font-weight:bold;color:#bdc3c7;">hrs.</span>';
        binconCell.appendChild(binconValueDiv);

        bodyRow.appendChild(binconCell);
        dashboard.appendChild(header);
        dashboard.appendChild(bodyRow);
        document.body.appendChild(dashboard);

        binconValueElement = document.getElementById('bincon-hours-number');
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
        dashboard.style.cssText = `position:fixed;top:240px;right:20px;z-index:10000;background:rgba(13,31,60,0.92);border:1px solid #001f3f;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;flex-direction:column;overflow:hidden;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s,filter 0.2s;width:141px;`;

        let lastRefreshed = 'Not yet';
        dashboard.onmouseover = function() { this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 16px rgba(0,0,0,0.5)';this.style.filter='brightness(1.1)';this.title='Last refreshed: '+lastRefreshed; };
        dashboard.onmouseout = function() { this.style.transform='scale(1)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)';this.style.filter='brightness(1)'; };
        dashboard.onclick = function() { window.open(getPoutURL(), '_blank'); };
        dashboard._setRefreshed = function() { lastRefreshed = new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); };

        const refreshDot = document.createElement('div');
        refreshDot.className = 'fclm-refresh-dot';
        refreshDot.id = 'pout-refresh-dot';
        dashboard.appendChild(refreshDot);

        const header = document.createElement('div');
        header.textContent = 'POUT';
        header.style.cssText = `font-size:9px;font-weight:bold;color:white;background-color:rgba(0,31,63,0.85);border-bottom:1px solid rgba(255,255,255,0.1);width:100%;text-align:center;padding:5px 0;box-sizing:border-box;letter-spacing:1.5px;text-transform:uppercase;`;

        const bodyRow = document.createElement('div');
        bodyRow.style.cssText = `display:flex;flex-direction:row;width:100%;align-items:center;justify-content:center;`;

        const poutCell = document.createElement('div');
        poutCell.style.cssText = `display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:6px 8px;`;
        const poutValueDiv = document.createElement('div');
        poutValueDiv.id = 'pout-value';
        poutValueDiv.style.cssText = `font-size:16px;font-weight:900;color:rgb(255,60,60);transition:color 0.5s ease;text-align:center;white-space:nowrap;line-height:1;font-family:'Courier New',monospace;`;
        poutValueDiv.innerHTML = '<span id="pout-hours-number">---</span><span id="pout-hrs-suffix" style="font-size:11px;font-weight:bold;color:#bdc3c7;">hrs.</span>';
        poutCell.appendChild(poutValueDiv);

        bodyRow.appendChild(poutCell);
        dashboard.appendChild(header);
        dashboard.appendChild(bodyRow);
        document.body.appendChild(dashboard);

        poutValueElement = document.getElementById('pout-hours-number');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH SIOC
    // ─────────────────────────────────────────────────────────────────────────
    function fetchSIOCValue() {
        const url = getCurrentWeekURL();
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
                            siocValueElement.style.color = getColorForValue(siocValue);
                            applyNAStyle(siocValueElement);
                            var siocDash = document.getElementById('sioc-dashboard');
                            if (siocDash && siocDash._setRefreshed) siocDash._setRefreshed();
                        }
                        if (hoursValue !== null && hoursValueElement) {
                            hoursValueElement.textContent = hoursValue.toFixed(1);
                            applyNAStyle(hoursValueElement);
                        } else if (hoursValueElement) {
                            hoursValueElement.textContent = 'N/A';
                            applyNAStyle(hoursValueElement);
                        }
                    }
                }
            },
            onerror: function() { console.log('[FCLM AA Time Checker] Error fetching SIOC data'); }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH BINCON
    // ─────────────────────────────────────────────────────────────────────────
    var BINCON_MANAGERS = ['barrios munoz,luna', 'puerto aranda,adrià'];

    function fetchBinconValue() {
        var url = getBinconURL();
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response.responseText, 'text/html');

                    var targetTable = null;
                    var byId = doc.getElementById('function-4300000158');
                    if (byId) { targetTable = byId; }
                    else {
                        doc.querySelectorAll('caption').forEach(function(caption) {
                            if (caption.textContent.includes('Bin Consolidation')) {
                                targetTable = caption.closest('table');
                            }
                        });
                    }

                    if (targetTable) {
                        var employeeRows = targetTable.querySelectorAll('tbody tr.empl-all');
                        var totalHours = 0;
                        var matchCount = 0;

                        employeeRows.forEach(function(row) {
                            if (row.style.display === 'none') return;
                            var cells = row.querySelectorAll('td');
                            if (cells.length < 9) return;
                            var managerText = cells[3].textContent.trim().toLowerCase();
                            var isTargetManager = BINCON_MANAGERS.some(function(m) { return managerText.includes(m); });
                            if (isTargetManager) {
                                var hoursText = cells[8].textContent.trim();
                                var hours = parseLocalizedNumber(hoursText);
                                if (!isNaN(hours)) { totalHours += hours; matchCount++; }
                            }
                        });

                        if (binconValueElement) {
                            binconValueElement.innerHTML = totalHours.toFixed(1) + '<span style="font-size:0.8em;font-weight:bold;color:#bdc3c7;">/40 </span>';
                            applyNAStyle(binconValueElement);
                            var color = getBinconColor(totalHours);
                            binconValueElement.style.color = color;
                            var suffixSpan = document.getElementById('bincon-hrs-suffix');
                            if (suffixSpan) suffixSpan.style.color = color;
                            var binconDash = document.getElementById('bincon-dashboard');
                            if (binconDash && binconDash._setRefreshed) binconDash._setRefreshed();
                        }
                    }
                }
            },
            onerror: function() { console.log('[FCLM AA Time Checker] Error fetching BINCON data'); }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH POUT
    // ─────────────────────────────────────────────────────────────────────────
    function fetchPoutValue() {
        var url = getPoutURL();
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
                        }
                    });

                    if (targetTable) {
                        var poutHours = null;
                        var totalRows = targetTable.querySelectorAll('tr.total.empl-all');

                        for (var i = 0; i < totalRows.length; i++) {
                            var row = totalRows[i];
                            if (row.style.display === 'none') continue;

                            var totalCells = row.querySelectorAll('td.size-total.highlighted');
                            for (var j = 0; j < totalCells.length; j++) {
                                var rawVal = totalCells[j].textContent.trim();
                                var parsed = parseLocalizedNumber(rawVal);
                                if (!isNaN(parsed) && (rawVal.includes('.') || rawVal.includes(','))) {
                                    poutHours = parsed;
                                    break;
                                }
                            }
                            if (poutHours !== null) break;
                        }

                        if (poutHours !== null && poutValueElement) {
                            poutValueElement.innerHTML = poutHours.toFixed(1) + '<span style="font-size:0.8em;font-weight:bold;color:#bdc3c7;">/40 </span>';
                            applyNAStyle(poutValueElement);
                            var color = getBinconColor(poutHours);
                            poutValueElement.style.color = color;
                            var suffixSpan = document.getElementById('pout-hrs-suffix');
                            if (suffixSpan) suffixSpan.style.color = color;
                            var poutDash = document.getElementById('pout-dashboard');
                            if (poutDash && poutDash._setRefreshed) poutDash._setRefreshed();
                        }
                    }
                }
            },
            onerror: function() { console.log('[FCLM AA Time Checker] Error fetching POUT data'); }
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
        }

        if (hasRedTimeOffTask) {
            var redIndicator = document.createElement('span');
            redIndicator.className = 'editable-time-indicator red-indicator';
            redIndicator.style.cssText = 'display:inline-block;width:12px;height:12px;background-color:#ff0000;border-radius:50%;margin-left:8px;box-shadow:0 0 8px rgba(255,0,0,0.8);animation:pulse-dot 1.5s infinite;vertical-align:middle;';
            redIndicator.title = 'This AA has >20 continuous minutes of editable Time off task';
            linkElement.appendChild(redIndicator);
        }
    }

    function calculateMinutesFromWidth(widthPercent) {
        return (widthPercent / 100) * 480;
    }

    function getParentTR(element) {
        var current = element;
        while (current && current.tagName !== 'TR' && current !== document.body) {
            current = current.parentElement;
        }
        if (current && current.tagName === 'TR') {
            return current;
        }
        return null;
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

                    allEditableSegments.forEach(function(segment) {
                        var parentTR = getParentTR(segment);
                        if (!parentTR) return;
                        var parentTRClasses = Array.from(parentTR.classList);

                        // Skip already-edited segments
                        if (parentTRClasses.includes('edited')) return;

                        // ── BREAK TIME FILTER ──
                        // Get the actual start/end times from the TR's TD elements
                        var segTimes = getSegmentTimes(parentTR);
                        if (segTimes && isIdleDuringBreak(segTimes.startMin, segTimes.endMin)) {
                            // This segment overlaps with break time → skip it
                            return;
                        }

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
                }
            },
            onerror: function() {
                console.log('[FCLM AA Time Checker] Error fetching timeline for employee ' + employeeId);
            }
        });
    }

    function scanEmployeeLinks() {
        var employeeLinks = document.querySelectorAll('a[href*="/employee/timeDetails"]');

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
        if (!submitRow) return;

        const buttonStyle = `display:inline-block;background-color:#001f3f;color:white;border:none;padding:6px 13px;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;border-radius:5px;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.3);transition:background-color 0.3s;text-decoration:none;font-family:'Roboto',sans-serif;white-space:nowrap;`;

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
                startHour = 7; endHour = 15;
            } else if (shift === 'late') {
                startDate = `${year}/${month}/${day}`;
                endDate = `${year}/${month}/${day}`;
                startHour = 15; endHour = 23;
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
                startHour = 23; endHour = 7;
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

        var wrapper = document.createElement('span');
        wrapper.style.cssText = `display:inline-flex;gap:6px;margin:0 auto;padding:0 20px;`;

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

        submitRow.style.display = 'flex';
        submitRow.style.alignItems = 'center';
        submitRow.style.justifyContent = 'space-between';

        var csvLink = submitRow.querySelector('a[data-click-metric="CSV"]');
        if (csvLink) {
            submitRow.insertBefore(wrapper, csvLink);
        } else {
            submitRow.appendChild(wrapper);
        }
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

