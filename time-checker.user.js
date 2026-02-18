
// ==UserScript==
// @name         FCLM Portal - AA Editable Time Checker
// @namespace    http://tampermonkey.net/
// @version      3.6
// @description  Checks each AA's timeline for editable time segments
// @author       juagarcm
// @match        https://fclm-portal.amazon.com/reports/functionRollup*
// @grant        GM_xmlhttpRequest
// @connect      fclm-portal.amazon.com
// ==/UserScript==

(function() {
    'use strict';

    console.log('[FCLM AA Time Checker] Script loaded at ' + new Date().toISOString());

    const checkedEmployees = new Set();
    const employeeResults = new Map();

    // Create colored dot indicator for an employee link
    function addIndicatorToEmployee(linkElement, employeeId, hasBlueEditable, hasRedTimeOffTask) {
        // Remove existing indicators
        const existingIndicators = linkElement.querySelectorAll('.editable-time-indicator');
        existingIndicators.forEach(ind => ind.remove());

        // Add yellow dot for blue editable time
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

        // Add red dot for time off task > 20 continuous minutes
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

    // Add CSS animation
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse-dot {
                0%, 100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.3);
                    opacity: 0.6;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Calculate minutes from percentage width
    function calculateMinutesFromWidth(widthPercent) {
        const totalMinutes = 480; // 8 hours
        return (widthPercent / 100) * totalMinutes;
    }

    // Find parent TR element and check its classes
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

    // Check if an employee's timeline has editable segments
    function checkEmployeeTimeline(employeeId, timeDetailsUrl, linkElement) {
        if (checkedEmployees.has(employeeId)) {
            return;
        }

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

                    // Find all editable segments
                    const allEditableSegments = doc.querySelectorAll('p.time-segment.editable');

                    console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' has ' + allEditableSegments.length + ' total editable segments at ' + new Date().toISOString());

                    allEditableSegments.forEach((segment, index) => {
                        // Get parent TR classes
                        const parentTRClasses = getParentTRClasses(segment);

                        console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' segment ' + index + ' parent TR classes: [' + parentTRClasses.join(', ') + '] at ' + new Date().toISOString());

                        // Skip if already edited
                        if (parentTRClasses.includes('edited')) {
                            console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' segment ' + index + ' is ALREADY EDITED - skipping at ' + new Date().toISOString());
                            return;
                        }

                        // Check for Time off task FIRST (takes priority over indirect)
                        if (parentTRClasses.includes('timeOffTask')) {
                            // Black editable time (Time off task)
                            const style = segment.getAttribute('style') || '';
                            const widthMatch = style.match(/width:\s*([\d.]+)%/);
                            const width = widthMatch ? parseFloat(widthMatch[1]) : 0;
                            const minutes = calculateMinutesFromWidth(width);

                            console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' has TIME OFF TASK editable segment: ' + minutes.toFixed(1) + ' min (width: ' + width + '%) at ' + new Date().toISOString());

                            // Check if this single segment is > 20 minutes (continuous)
                            if (minutes > 20) {
                                hasRedTimeOffTask = true;
                                console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' has >20 CONTINUOUS minutes of TOT at ' + new Date().toISOString());
                            }
                        } else if (parentTRClasses.includes('function-seg') && parentTRClasses.includes('indirect')) {
                            // Blue editable time (indirect) - only if NOT timeOffTask
                            hasBlueEditable = true;
                            console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' has BLUE UNEDITED segment (indirect) at ' + new Date().toISOString());
                        }
                    });

                    console.log('[FCLM AA Time Checker] Employee ' + employeeId + ' SUMMARY - Blue unedited: ' + hasBlueEditable + ', Red TOT >20min: ' + hasRedTimeOffTask + ' at ' + new Date().toISOString());

                    if (hasBlueEditable || hasRedTimeOffTask) {
                        employeeResults.set(employeeId, {
                            hasBlueEditable: hasBlueEditable,
                            hasRedTimeOffTask: hasRedTimeOffTask
                        });
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

    // Find and check all employee links
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

    // Initialize the script
    function init() {
        console.log('[FCLM AA Time Checker] Initializing for URL: ' + window.location.href);

        addStyles();

        // Initial scan after page loads
        setTimeout(() => {
            scanEmployeeLinks();
        }, 2000);

        // Set up MutationObserver to detect new employee links
        const observer = new MutationObserver(function(mutations) {
            scanEmployeeLinks();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Periodic re-scan every 30 seconds
        setInterval(() => {
            scanEmployeeLinks();
        }, 30000);

        console.log('[FCLM AA Time Checker] Monitoring started at ' + new Date().toISOString());
    }

    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

