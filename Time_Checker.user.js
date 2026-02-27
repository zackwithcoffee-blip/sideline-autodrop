
// ==UserScript==
// @name         FCLM Portal - AA Editable Time Checker v8.5
// @namespace    http://tampermonkey.net/
// @version      8.5
// @description  Checks each AA's timeline for editable time segments and displays SIOC + BINCON + POUT dashboards.
// @author       juagarcm
// @match        https://fclm-portal.amazon.com/reports/functionRollup*
// @grant        GM_xmlhttpRequest
// @connect      fclm-portal.amazon.com
// ==/UserScript==

(function() {
    'use strict';

    // Global references for SIOC dashboard elements
    let siocValueElement = null;
    let siocUpdateTimeElement = null;
    let hoursValueElement = null;

    // Global references for BINCON dashboard elements
    let binconValueElement = null;
    let binconUpdateTimeElement = null;

    // Global references for POUT dashboard elements
    let poutValueElement = null;

    console.log('[FCLM AA Time Checker] Script loaded at ' + new Date().toISOString());

    const checkedEmployees = new Set();
    const employeeResults = new Map();

    // ─────────────────────────────────────────────────────────────────────────
    // SHIFT DETECTION
    // Detects current shift from URL params or current time.
    // Returns: 'early' (7-15), 'late' (15-23), 'night' (23-7)
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

        // Fallback: detect from current time
        const hour = new Date().getHours();
        if (hour >= 7 && hour < 15) return 'early';
        if (hour >= 15 && hour < 23) return 'late';
        return 'night';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COLOR FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    // SIOC color: red at 0, green at 420
    function getColorForValue(value) {
        const percentage = Math.min(value / 420, 1);
        const red = Math.round(255 * (1 - percentage));
        const green = Math.round(255 * percentage);
        return `rgb(${red}, ${green}, 0)`;
    }

    // BINCON/POUT color: dark amber/olive at 0, dark green at 40
    function getBinconColor(value) {
        const percentage = Math.min(value / 40, 1);
        // At 0%: dark amber rgb(180, 100, 0)
        // At 100%: dark green rgb(0, 150, 0)
        const red = Math.round(180 * (1 - percentage));
        const green = Math.round(100 + 50 * percentage); // 100 -> 150
        const blue = 0;
        return `rgb(${red}, ${green}, ${blue})`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    // Get current week's start date (Sunday) as YYYY%2FMM%2FDD
    function getWeekStartEncoded() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sunday
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        const year = startOfWeek.getFullYear();
        const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
        const day = String(startOfWeek.getDate()).padStart(2, '0');
        return `${year}%2F${month}%2F${day}`;
    }

    // Get today's date as YYYY%2FMM%2FDD
    function getTodayEncoded() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}%2F${month}%2F${day}`;
    }

    // Get tomorrow's date as YYYY%2FMM%2FDD (used for night shift end date)
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

    // Get current week's SIOC URL
    function getCurrentWeekURL() {
        const dateString = getWeekStartEncoded();
        const today = getTodayEncoded();
        console.log('[FCLM AA Time Checker] Week starts on: ' + dateString);
        return `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1002960&spanType=Week&startDateWeek=${dateString}&maxIntradayDays=1&startDateIntraday=${today}&startHourIntraday=15&startMinuteIntraday=0&endDateIntraday=${today}&endHourIntraday=23&endMinuteIntraday=0`;
    }

    // Get current week's BINCON URL — shift-aware intraday params
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
            // night
            startHour = 23; endHour = 7;
            startDate = today; endDate = tomorrow;
        }

        console.log('[FCLM AA Time Checker] BINCON shift: ' + shift + ', week start: ' + weekStart + ', today: ' + today);
        return `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1003012&startDateDay=${today}&spanType=Week&startDateWeek=${weekStart}&maxIntradayDays=1&startDateIntraday=${startDate}&startHourIntraday=${startHour}&startMinuteIntraday=0&endDateIntraday=${endDate}&endHourIntraday=${endHour}&endMinuteIntraday=0`;
    }

    // Get current week's POUT URL — shift-aware intraday params
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
            // night
            startHour = 23; endHour = 7;
            startDate = today; endDate = tomorrow;
        }

        console.log('[FCLM AA Time Checker] POUT shift: ' + shift + ', week start: ' + weekStart + ', today: ' + today);
        return `https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=MAD7&processId=1003018&spanType=Week&startDateWeek=${weekStart}&maxIntradayDays=1&startDateIntraday=${startDate}&startHourIntraday=${startHour}&startMinuteIntraday=0&endDateIntraday=${endDate}&endHourIntraday=${endHour}&endMinuteIntraday=0`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SIOC DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    function createSIOCDashboard() {
        const existingDashboard = document.getElementById('sioc-dashboard');
        if (existingDashboard) existingDashboard.remove();

        const dashboard = document.createElement('div');
        dashboard.id = 'sioc-dashboard';
        dashboard.style.cssText = `
            position: fixed;
            top: 133px;
            right: 20px;
            z-index: 10000;
            background-color: white;
            border: 1px solid #001f3f;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            min-width: 128px;
        `;

        dashboard.onmouseover = function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 3px 6px rgba(0,0,0,0.4)';
        };
        dashboard.onmouseout = function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        };
        dashboard.onclick = function() {
            window.open(getCurrentWeekURL(), '_blank');
        };

        const header = document.createElement('div');
        header.textContent = 'SIOC';
        header.style.cssText = `
            font-size: 10px;
            font-weight: bold;
            color: white;
            background-color: #001f3f;
            width: 100%;
            text-align: center;
            padding: 4.8px 0;
            box-sizing: border-box;
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
            border-right: 1px solid #001f3f;
            flex: 1;
            padding: 6.4px 8px;
        `;

        const hoursValue = document.createElement('div');
        hoursValue.id = 'sioc-hours-value';
        hoursValue.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            color: #001f3f;
            text-align: center;
            white-space: nowrap;
            line-height: 1;
        `;
        hoursValue.innerHTML = '<span id="sioc-hours-number">---</span><span style="font-size:12px;font-weight:bold;color:#001f3f;">hrs.</span>';
        hoursCell.appendChild(hoursValue);

        const siocCell = document.createElement('div');
        siocCell.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            padding: 6.4px 8px;
        `;

        const valueDisplay = document.createElement('div');
        valueDisplay.id = 'sioc-value';
        valueDisplay.textContent = '---';
        valueDisplay.style.cssText = `
            font-size: 19px;
            font-weight: bold;
            color: rgb(255, 0, 0);
            transition: color 0.5s ease;
            text-align: center;
        `;

        siocCell.appendChild(valueDisplay);
        bodyRow.appendChild(hoursCell);
        bodyRow.appendChild(siocCell);
        dashboard.appendChild(header);
        dashboard.appendChild(bodyRow);
        document.body.appendChild(dashboard);

        siocValueElement = valueDisplay;
        hoursValueElement = document.getElementById('sioc-hours-number');

        console.log('[FCLM AA Time Checker] SIOC dashboard (v8.5) created at ' + new Date().toISOString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BINCON DASHBOARD — positioned below SIOC
    // ─────────────────────────────────────────────────────────────────────────
    function createBinconDashboard() {
        const existingDashboard = document.getElementById('bincon-dashboard');
        if (existingDashboard) existingDashboard.remove();

        const dashboard = document.createElement('div');
        dashboard.id = 'bincon-dashboard';
        dashboard.style.cssText = `
            position: fixed;
            top: 199px;
            right: 20px;
            z-index: 10000;
            background-color: white;
            border: 1px solid #001f3f;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            min-width: 80px;
        `;

        dashboard.onmouseover = function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 3px 6px rgba(0,0,0,0.4)';
        };
        dashboard.onmouseout = function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        };
        dashboard.onclick = function() {
            window.open(getBinconURL(), '_blank');
        };

        const header = document.createElement('div');
        header.textContent = 'BINCON';
        header.style.cssText = `
            font-size: 10px;
            font-weight: bold;
            color: white;
            background-color: #001f3f;
            width: 100%;
            text-align: center;
            padding: 4.8px 0;
            box-sizing: border-box;
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
            padding: 6.4px 8px;
        `;

        const binconValueDiv = document.createElement('div');
        binconValueDiv.id = 'bincon-value';
        binconValueDiv.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            color: rgb(34, 176, 99);
            transition: color 0.5s ease;
            text-align: center;
            white-space: nowrap;
            line-height: 1;
        `;
        binconValueDiv.innerHTML = '<span id="bincon-hours-number">---</span><span id="bincon-hrs-suffix" style="font-size:12px;font-weight:bold;color:rgb(180,100,0);">hrs.</span>';

        binconCell.appendChild(binconValueDiv);
        bodyRow.appendChild(binconCell);
        dashboard.appendChild(header);
        dashboard.appendChild(bodyRow);
        document.body.appendChild(dashboard);

        binconValueElement = document.getElementById('bincon-hours-number');

        console.log('[FCLM AA Time Checker] BINCON dashboard (v8.5) created at ' + new Date().toISOString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POUT DASHBOARD — positioned below BINCON
    // ─────────────────────────────────────────────────────────────────────────
    function createPoutDashboard() {
        const existingDashboard = document.getElementById('pout-dashboard');
        if (existingDashboard) existingDashboard.remove();

        const dashboard = document.createElement('div');
        dashboard.id = 'pout-dashboard';
        dashboard.style.cssText = `
            position: fixed;
            top: 265px;
            right: 20px;
            z-index: 10000;
            background-color: white;
            border: 1px solid #001f3f;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            min-width: 80px;
        `;

        dashboard.onmouseover = function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 3px 6px rgba(0,0,0,0.4)';
        };
        dashboard.onmouseout = function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        };
        dashboard.onclick = function() {
            window.open(getPoutURL(), '_blank');
        };

        const header = document.createElement('div');
        header.textContent = 'POUT';
        header.style.cssText = `
            font-size: 10px;
            font-weight: bold;
            color: white;
            background-color: #001f3f;
            width: 100%;
            text-align: center;
            padding: 4.8px 0;
            box-sizing: border-box;
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
            padding: 6.4px 8px;
        `;

        const poutValueDiv = document.createElement('div');
        poutValueDiv.id = 'pout-value';
        poutValueDiv.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            color: rgb(180, 100, 0);
            transition: color 0.5s ease;
            text-align: center;
            white-space: nowrap;
            line-height: 1;
        `;
        poutValueDiv.innerHTML = '<span id="pout-hours-number">---</span><span id="pout-hrs-suffix" style="font-size:12px;font-weight:bold;color:rgb(180,100,0);">hrs.</span>';

        poutCell.appendChild(poutValueDiv);
        bodyRow.appendChild(poutCell);
        dashboard.appendChild(header);
        dashboard.appendChild(bodyRow);
        document.body.appendChild(dashboard);

        poutValueElement = document.getElementById('pout-hours-number');

        console.log('[FCLM AA Time Checker] POUT dashboard (v8.5) created at ' + new Date().toISOString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH SIOC
    // ─────────────────────────────────────────────────────────────────────────
    function fetchSIOCValue() {
        const url = getCurrentWeekURL();
        console.log('[FCLM AA Time Checker] Fetching SIOC value from: ' + url + ' at ' + new Date().toISOString());

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    console.log('[FCLM AA Time Checker] Successfully fetched SIOC page at ' + new Date().toISOString());

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');

                    let targetTable = null;
                    doc.querySelectorAll('caption').forEach(caption => {
                        if (caption.textContent.includes('ECR/FFP Testing') && caption.textContent.includes('4300018880')) {
                            targetTable = caption.closest('table');
                            console.log('[FCLM AA Time Checker] Found ECR/FFP Testing table at ' + new Date().toISOString());
                        }
                    });

                    if (targetTable) {
                        const totalRows = targetTable.querySelectorAll('tr.total.empl-all');
                        console.log('[FCLM AA Time Checker] Found ' + totalRows.length + ' empl-all total rows at ' + new Date().toISOString());

                        let siocValue = null;
                        let hoursValue = null;

                        for (let i = 0; i < totalRows.length; i++) {
                            const row = totalRows[i];
                            if (row.style.display === 'none') {
                                console.log('[FCLM AA Time Checker] Row ' + i + ' is hidden, skipping at ' + new Date().toISOString());
                                continue;
                            }

                            const allCells = row.querySelectorAll('td');
                            console.log('[FCLM AA Time Checker] Row ' + i + ' has ' + allCells.length + ' td cells at ' + new Date().toISOString());
                            allCells.forEach((cell, idx) => {
                                console.log('  Cell ' + idx + ': class="' + cell.className + '", value="' + cell.textContent.trim() + '"');
                            });

                            if (allCells.length >= 6) {
                                const siocText = allCells[5].textContent.trim();
                                const parsedSioc = parseInt(siocText.replace(/,/g, ''));
                                if (!isNaN(parsedSioc)) {
                                    siocValue = parsedSioc;
                                    console.log('[FCLM AA Time Checker] SIOC value (cell 5): ' + siocValue + ' at ' + new Date().toISOString());
                                }
                            }

                            if (allCells.length >= 5) {
                                const hoursText = allCells[4].textContent.trim();
                                const parsedHours = parseFloat(hoursText.replace(/,/g, ''));
                                if (!isNaN(parsedHours)) {
                                    hoursValue = parsedHours;
                                    console.log('[FCLM AA Time Checker] Hours invested (cell 4): ' + hoursValue + ' at ' + new Date().toISOString());
                                } else {
                                    console.log('[FCLM AA Time Checker] Could not parse hours from cell 4: "' + hoursText + '" at ' + new Date().toISOString());
                                }
                            }

                            if (siocValue !== null) break;
                        }

                        if (siocValue !== null && siocValueElement) {
                            siocValueElement.textContent = siocValue.toString();
                            siocValueElement.style.color = getColorForValue(siocValue);
                            console.log('[FCLM AA Time Checker] Dashboard SIOC updated to: ' + siocValue + ' at ' + new Date().toISOString());
                        } else if (!siocValueElement) {
                            console.log('[FCLM AA Time Checker] ERROR: siocValueElement is null! at ' + new Date().toISOString());
                        }

                        if (hoursValue !== null && hoursValueElement) {
                            hoursValueElement.textContent = hoursValue.toFixed(2);
                            console.log('[FCLM AA Time Checker] Dashboard HOURS updated to: ' + hoursValue + ' at ' + new Date().toISOString());
                        } else if (hoursValueElement) {
                            hoursValueElement.textContent = 'N/A';
                            console.log('[FCLM AA Time Checker] Could not read hours from cell 4 at ' + new Date().toISOString());
                        }

                    } else {
                        console.log('[FCLM AA Time Checker] Could not find ECR/FFP Testing table at ' + new Date().toISOString());
                    }
                } else {
                    console.log('[FCLM AA Time Checker] Failed to fetch SIOC data (status: ' + response.status + ') at ' + new Date().toISOString());
                }
            },
            onerror: function(error) {
                console.log('[FCLM AA Time Checker] Error fetching SIOC data at ' + new Date().toISOString());
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH BINCON
    // Managers: "Barrios Munoz,Luna" or "Puerto Aranda,Adrià"
    // Hours from td index 8 (size-total highlighted) in each employee row
    // ─────────────────────────────────────────────────────────────────────────
    const BINCON_MANAGERS = ['barrios munoz,luna', 'puerto aranda,adrià'];

    function fetchBinconValue() {
        const url = getBinconURL();
        console.log('[FCLM AA Time Checker] Fetching BINCON value from: ' + url + ' at ' + new Date().toISOString());

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');

                    let targetTable = null;
                    const byId = doc.getElementById('function-4300000158');
                    if (byId) {
                        targetTable = byId;
                        console.log('[FCLM AA Time Checker] Found BINCON table by ID at ' + new Date().toISOString());
                    } else {
                        doc.querySelectorAll('caption').forEach(caption => {
                            if (caption.textContent.includes('Bin Consolidation')) {
                                targetTable = caption.closest('table');
                                console.log('[FCLM AA Time Checker] Found BINCON table by caption at ' + new Date().toISOString());
                            }
                        });
                    }

                    if (targetTable) {
                        const employeeRows = targetTable.querySelectorAll('tbody tr.empl-all');
                        console.log('[FCLM AA Time Checker] BINCON: found ' + employeeRows.length + ' employee rows at ' + new Date().toISOString());

                        let totalHours = 0;
                        let matchCount = 0;

                        employeeRows.forEach((row, rowIdx) => {
                            if (row.style.display === 'none') return;

                            const cells = row.querySelectorAll('td');
                            // td columns: 0=Type, 1=ID, 2=Name, 3=Manager, 4=Small, 5=Medium, 6=Large, 7=HeavyBulky, 8=Total
                            if (cells.length < 9) return;

                            const managerText = cells[3].textContent.trim().toLowerCase();
                            const isTargetManager = BINCON_MANAGERS.some(m => managerText.includes(m));

                            console.log('[FCLM AA Time Checker] BINCON row ' + rowIdx + ': manager="' + managerText + '", match=' + isTargetManager);

                            if (isTargetManager) {
                                const hoursText = cells[8].textContent.trim().replace(/,/g, '');
                                const hours = parseFloat(hoursText);
                                if (!isNaN(hours)) {
                                    totalHours += hours;
                                    matchCount++;
                                    console.log('[FCLM AA Time Checker] BINCON: added ' + hours + ' hrs from row ' + rowIdx + ' (running total: ' + totalHours + ')');
                                }
                            }
                        });

                        console.log('[FCLM AA Time Checker] BINCON total: ' + totalHours.toFixed(2) + ' hrs from ' + matchCount + ' AAs at ' + new Date().toISOString());

                        if (binconValueElement) {
                            binconValueElement.textContent = totalHours.toFixed(2);
                        }
 
                        const color = getBinconColor(totalHours);
                        if (binconValueElement) binconValueElement.style.color = color;
                        const suffixSpan = document.getElementById('bincon-hrs-suffix');
                        if (suffixSpan) suffixSpan.style.color = color;

                        if (binconUpdateTimeElement) {
                            const now = new Date();
                            binconUpdateTimeElement.textContent = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
                        }

                    } else {
                        console.log('[FCLM AA Time Checker] Could not find Bin Consolidation table at ' + new Date().toISOString());
                    }
                } else {
                    console.log('[FCLM AA Time Checker] Failed to fetch BINCON data (status: ' + response.status + ') at ' + new Date().toISOString());
                }
            },
            onerror: function() {
                console.log('[FCLM AA Time Checker] Error fetching BINCON data at ' + new Date().toISOString());
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH POUT
    // Reads td.size-total.highlighted[data-column="8"] from the
    // TransferOut PSolve [4300006849] table total row
    // ─────────────────────────────────────────────────────────────────────────

function fetchPoutValue() {
    const url = getPoutURL();
    console.log('[FCLM AA Time Checker] Fetching POUT value from: ' + url + ' at ' + new Date().toISOString());

    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function(response) {
            if (response.status === 200) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, 'text/html');

                let targetTable = null;
                doc.querySelectorAll('caption').forEach(caption => {
                    if (caption.textContent.includes('TransferOut PSolve') && caption.textContent.includes('4300006849')) {
                        targetTable = caption.closest('table');
                        console.log('[FCLM AA Time Checker] Found POUT table at ' + new Date().toISOString());
                    }
                });

                if (targetTable) {
                    let poutHours = null;

                    // Find the first visible tr.total.empl-all row
                    const totalRows = targetTable.querySelectorAll('tr.total.empl-all');
                    console.log('[FCLM AA Time Checker] POUT: found ' + totalRows.length + ' total.empl-all rows');

                    for (let i = 0; i < totalRows.length; i++) {
                        const row = totalRows[i];
                        if (row.style.display === 'none') continue;

                        // Get all size-total highlighted cells in this row
                        const totalCells = row.querySelectorAll('td.size-total.highlighted');
                        console.log('[FCLM AA Time Checker] POUT total row ' + i + ': found ' + totalCells.length + ' size-total cells');

                        totalCells.forEach((cell, idx) => {
                            console.log('  Cell ' + idx + ': "' + cell.textContent.trim() + '"');
                        });

                        // The first cell is hours (e.g. 27.37), second is units (e.g. 391)
                        // We want the first decimal-looking value
                        for (let j = 0; j < totalCells.length; j++) {
                            const val = totalCells[j].textContent.trim().replace(/,/g, '');
                            const parsed = parseFloat(val);
                            if (!isNaN(parsed) && val.includes('.')) {
                                poutHours = parsed;
                                console.log('[FCLM AA Time Checker] POUT hours (cell ' + j + '): ' + poutHours + ' at ' + new Date().toISOString());
                                break;
                            }
                        }

                        if (poutHours !== null) break;
                    }

                    if (poutHours !== null && poutValueElement) {
                        poutValueElement.textContent = poutHours.toFixed(2);
                        const color = getBinconColor(poutHours);
                        poutValueElement.style.color = color;
                        const suffixSpan = document.getElementById('pout-hrs-suffix');
                        if (suffixSpan) suffixSpan.style.color = color;
                        console.log('[FCLM AA Time Checker] POUT dashboard updated to: ' + poutHours + ' at ' + new Date().toISOString());
                    } else {
                        console.log('[FCLM AA Time Checker] Could not find POUT value at ' + new Date().toISOString());
                    }
                } else {
                    console.log('[FCLM AA Time Checker] Could not find TransferOut PSolve table at ' + new Date().toISOString());
                }
            } else {
                console.log('[FCLM AA Time Checker] Failed to fetch POUT data (status: ' + response.status + ') at ' + new Date().toISOString());
            }
        },
        onerror: function() {
            console.log('[FCLM AA Time Checker] Error fetching POUT data at ' + new Date().toISOString());
        }
    });
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
            gap: 10px;
        `;

        const totButton = document.createElement('button');
        totButton.textContent = 'ToT';
        totButton.style.cssText = `
            background-color: #001f3f;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.3s;
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
            padding: 10px 20px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.3s;
        `;
        removeButton.onmouseover = function() { this.style.backgroundColor = '#003366'; };
        removeButton.onmouseout = function() { this.style.backgroundColor = '#001f3f'; };
        removeButton.onclick = function() { window.open(getCurrentWeekURL(), '_blank'); };

        buttonContainer.appendChild(totButton);
        buttonContainer.appendChild(removeButton);
        document.body.appendChild(buttonContainer);

        console.log('[FCLM AA Time Checker] Navigation buttons created at ' + new Date().toISOString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMPLOYEE INDICATORS
    // ─────────────────────────────────────────────────────────────────────────
    function addIndicatorToEmployee(linkElement, employeeId, hasBlueEditable, hasRedTimeOffTask) {
        const existingIndicators = linkElement.querySelectorAll('.editable-time-indicator');
        existingIndicators.forEach(ind => ind.remove());

        if (hasBlueEditable) {
            const yellowIndicator = document.createElement('span');
            yellowIndicator.className = 'editable-time-indicator yellow-indicator';
            yellowIndicator.style.cssText = `
                display: inline-block;
                width: 12px;
                height: 12px;
                background-color: #FFD700;
                border-radius: 50%;
                margin-left: 8px;
                box-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
                animation: pulse-dot 1.5s infinite;
                vertical-align: middle;
            `;
            yellowIndicator.title = 'This AA has unedited blue time segments';
            linkElement.appendChild(yellowIndicator);
            console.log('[FCLM AA Time Checker] Added yellow dot for employee ' + employeeId + ' at ' + new Date().toISOString());
        }

        if (hasRedTimeOffTask) {
            const redIndicator = document.createElement('span');
            redIndicator.className = 'editable-time-indicator red-indicator';
            redIndicator.style.cssText = `
                display: inline-block;
                width: 12px;
                height: 12px;
                background-color: #ff0000;
                border-radius: 50%;
                margin-left: 8px;
                box-shadow: 0 0 8px rgba(255, 0, 0, 0.8);
                animation: pulse-dot 1.5s infinite;
                vertical-align: middle;
            `;
            redIndicator.title = 'This AA has >20 continuous minutes of editable Time off task';
            linkElement.appendChild(redIndicator);
            console.log('[FCLM AA Time Checker] Added red dot for employee ' + employeeId + ' at ' + new Date().toISOString());
        }
    }

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse-dot {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }

    function calculateMinutesFromWidth(widthPercent) {
        const totalMinutes = 480;
        return (widthPercent / 100) * totalMinutes;
    }

    function getParentTRClasses(element) {
        let current = element;
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
        console.log('[FCLM AA Time Checker] Checking employee ' + employeeId + ' at ' + new Date().toISOString());

        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://fclm-portal.amazon.com' + timeDetailsUrl,
            onload: function(response) {
                if (response.status === 200) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');

                    let hasBlueEditable = false;
                    let hasRedTimeOffTask = false;

                    const allEditableSegments = doc.querySelectorAll('p.time-segment.editable');
                    console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' has ' + allEditableSegments.length + ' total editable segments at ' + new Date().toISOString());

                    allEditableSegments.forEach((segment, index) => {
                        const parentTRClasses = getParentTRClasses(segment);
                        console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' segment ' + index + ' parent TR classes: [' + parentTRClasses.join(', ') + '] at ' + new Date().toISOString());

                        if (parentTRClasses.includes('edited')) {
                            console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' segment ' + index + ' is ALREADY EDITED - skipping at ' + new Date().toISOString());
                            return;
                        }

                        if (parentTRClasses.includes('timeOffTask')) {
                            const style = segment.getAttribute('style') || '';
                            const widthMatch = style.match(/width:\s*([\d.]+)%/);
                            const width = widthMatch ? parseFloat(widthMatch[1]) : 0;
                            const minutes = calculateMinutesFromWidth(width);
                            console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' has TIME OFF TASK editable segment: ' + minutes.toFixed(1) + ' min at ' + new Date().toISOString());
                            if (minutes > 20) {
                                hasRedTimeOffTask = true;
                                console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' has >20 CONTINUOUS minutes of TOT at ' + new Date().toISOString());
                            }
                        } else if (parentTRClasses.includes('function-seg') && parentTRClasses.includes('indirect')) {
                            hasBlueEditable = true;
                            console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' has BLUE UNEDITED segment (indirect) at ' + new Date().toISOString());
                        }
                    });

                    console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' SUMMARY - Blue unedited: ' + hasBlueEditable + ', Red TOT >20min: ' + hasRedTimeOffTask + ' at ' + new Date().toISOString());

                    if (hasBlueEditable || hasRedTimeOffTask) {
                        employeeResults.set(employeeId, { hasBlueEditable, hasRedTimeOffTask });
                        addIndicatorToEmployee(linkElement, employeeId, hasBlueEditable, hasRedTimeOffTask);
                    } else {
                        console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' has no significant editable segments at ' + new Date().toISOString());
                    }
                } else {
                    console.log('[FCLM AA Time Checker] Failed to fetch timeline for employee ' + employeeId + ' (status: ' + response.status + ') at ' + new Date().toISOString());
                }
            },
            onerror: function(error) {
                console.log('[FCLM AA Time Checker] Error fetching timeline for employee ' + employeeId + ' at ' + new Date().toISOString());
            }
        });
    }

    function scanEmployeeLinks() {
        const employeeLinks = document.querySelectorAll('a[href*="/employee/timeDetails"]');
        console.log('[FCLM AA Time Checker] Found ' + employeeLinks.length + ' employee links at ' + new Date().toISOString());

        employeeLinks.forEach(link => {
            const href = link.getAttribute('href');
            const employeeIdMatch = href.match(/employeeId=(\d+)/);
            if (employeeIdMatch) {
                const employeeId = employeeIdMatch[1];
                checkEmployeeTimeline(employeeId, href, link);
            }
        });
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

        setTimeout(() => { fetchSIOCValue(); }, 500);
        setTimeout(() => { fetchBinconValue(); }, 800);
        setTimeout(() => { fetchPoutValue(); }, 1100);
        setTimeout(() => { scanEmployeeLinks(); }, 2000);

        const observer = new MutationObserver(function(mutations) {
            scanEmployeeLinks();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setInterval(() => { scanEmployeeLinks(); }, 30000);
        setInterval(() => { fetchSIOCValue(); }, 600000);
        setInterval(() => { fetchBinconValue(); }, 600000);
        setInterval(() => { fetchPoutValue(); }, 600000);

        console.log('[FCLM AA Time Checker] Monitoring started at ' + new Date().toISOString());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();


