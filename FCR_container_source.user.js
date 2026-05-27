// ==UserScript==
// @name         FC Research Container Source
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Helps visualize the source of a container.
// @author       juagarcm
// @match        https://qifcr.eu.aftx.amazonoperations.app/*
// @match        https://qi-fcresearch-eu.corp.amazon.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function log(msg) {
        console.log(`[${new Date().toISOString()}] [Source Column] ${msg}`);
    }

    setTimeout(() => {
        log('Script activated after 1s delay');
        log(`Current URL: ${window.location.href}`);
        init();
    }, 1000);

    function waitForElement(selector, callback, maxAttempts = 50) {
        let attempts = 0;
        log(`Waiting for element: ${selector}`);
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            attempts++;
            if (element) {
                clearInterval(interval);
                log(`Found element: ${selector} (after ${attempts} attempts)`);
                callback(element);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                log(`TIMEOUT: Could not find element: ${selector} after ${maxAttempts} attempts`);
            }
        }, 500);
    }

    function checkContainerHistoryForTSI() {
        const containerHistoryTable = document.querySelector('#table-container-history');
        log(`Container history table found: ${!!containerHistoryTable}`);

        if (!containerHistoryTable) return null;

        const rows = containerHistoryTable.querySelectorAll('tbody tr');
        log(`Container history rows found: ${rows.length}`);

        const headers = containerHistoryTable.querySelectorAll('thead th');
        let oldContainerIndex = -1;
        headers.forEach((header, index) => {
            if (header.id === 'container-history-old-container' || header.textContent.includes('Contenedor antiguo')) {
                oldContainerIndex = index;
                log(`Found "Contenedor antiguo" at index ${index}`);
            }
        });

        for (let row of rows) {
            const cells = row.querySelectorAll('td');

            if (oldContainerIndex >= 0 && cells[oldContainerIndex]) {
                const text = cells[oldContainerIndex].textContent.trim().toLowerCase();
                if (text.match(/^pk-x-/)) {
                    log(`MATCH FOUND: "${text}" → TSI`);
                    return 'TSI';
                }
            } else {
                for (let cell of cells) {
                    const text = cell.textContent.trim().toLowerCase();
                    if (text.match(/^pk-x-/)) {
                        log(`MATCH FOUND (fallback): "${text}" → TSI`);
                        return 'TSI';
                    }
                }
            }
        }

        log('No pk-x- pattern found → NVF');
        return 'NVF';
    }

    function addSourceColumn() {
        log('Attempting to add Source column...');

        const inventoryTable = document.querySelector('#table-inventory');
        if (!inventoryTable) {
            log('Inventory table not found');
            return;
        }

        if (document.querySelector('[data-source-added]')) {
            log('Source column already exists, skipping');
            return;
        }

        const cantidadHeader = document.querySelector('#inventory-quantity');
        if (!cantidadHeader) {
            log('Cantidad header not found');
            return;
        }

        const headerRow = cantidadHeader.closest('tr');
        const allHeaders = Array.from(headerRow.querySelectorAll('th'));
        const cantidadPosition = allHeaders.indexOf(cantidadHeader);
        log(`Cantidad header position: ${cantidadPosition}`);

        // Determine the source (TSI or NVF)
        const source = checkContainerHistoryForTSI();
        log(`Determined source: ${source}`);

        // Add Source cell to each row after the Cantidad cell
        const rows = inventoryTable.querySelectorAll('tbody tr');
        log(`Inventory table body rows: ${rows.length}`);

        rows.forEach((row, i) => {
            const cells = Array.from(row.querySelectorAll('td'));

            if (cells.length > cantidadPosition && cells[cantidadPosition]) {
                const cantidadCell = cells[cantidadPosition];
                const sourceCell = document.createElement('td');
                sourceCell.textContent = source || 'N/A';
                sourceCell.style.fontWeight = 'bold';
                sourceCell.style.textAlign = 'center';
                sourceCell.setAttribute('data-source-added', 'true');

                if (source === 'TSI') {
                    sourceCell.style.backgroundColor = '#d4edda';
                    sourceCell.style.color = '#155724';
                } else if (source === 'NVF') {
                    sourceCell.style.backgroundColor = '#fff3cd';
                    sourceCell.style.color = '#856404';
                }

                cantidadCell.parentNode.insertBefore(sourceCell, cantidadCell.nextSibling);
                log(`  Row ${i}: Source cell added after Cantidad cell (${source})`);
            } else {
                log(`  Row ${i}: Could not find Cantidad cell at position ${cantidadPosition}`);
            }
        });

        log('Source column addition complete!');
    }

    function init() {
        log('Initializing...');

        waitForElement('#table-inventory', () => {
            log('Inventory table detected, now waiting for container history...');
            waitForElement('#table-container-history', () => {
                log('Both tables detected, adding Source column in 1.5s...');
                setTimeout(addSourceColumn, 1500);
            });
        });

        const observer = new MutationObserver(() => {
            const inventoryTable = document.querySelector('#table-inventory');
            const containerHistoryTable = document.querySelector('#table-container-history');

            if (inventoryTable && containerHistoryTable && !document.querySelector('[data-source-added]')) {
                log('MutationObserver: Tables detected without Source column, re-adding...');
                setTimeout(addSourceColumn, 1000);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        log('MutationObserver attached');
    }

})();

