// ==UserScript==
// @name         Auto Edit
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Automatizes Pending Research Process
// @author       juagarcm
// @match        https://aft-qt-eu.aka.amazon.com/app/edititems*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('Edit Items Auto-Filler v2.3 loaded at:', new Date().toISOString());

    let autoSubmitTimer = null;
    let lastInputValue = '';
    let hasAutoSubmitted = false;
    let investigacionClicked = false;
    let investigacionObserver = null;
    let inputObserver = null;
    let submitButtonObserver = null;
    let submitButtonClicked = false;

    function createNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const colors = {
            info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 999999;
            font-family: 'Roboto', Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;

        notification.innerHTML = `<div style="font-weight: bold;">${message}</div>`;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        if (!document.querySelector('style[data-notification-style]')) {
            style.setAttribute('data-notification-style', 'true');
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function getContainerIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const containerId = urlParams.get('containerId');
        console.log('Container ID from URL:', containerId);
        return containerId;
    }

    function getSubmitButton() {
        return document.querySelector('input[data-aft-tool-hotkey="return"][type="submit"]');
    }

    function clickSubmitButton() {
        if (hasAutoSubmitted) {
            console.log('Already auto-submitted, skipping');
            return false;
        }

        const submitButton = getSubmitButton();

        if (submitButton) {
            console.log('Auto-clicking submit button...');
            submitButton.click();
            hasAutoSubmitted = true;
            console.log('✓ Submit button clicked automatically!');
            createNotification('✓ Enviando automáticamente...', 'success');

            // Cleanup observers after successful submit
            cleanupObservers();
            return true;
        }

        console.log('Submit button not found');
        return false;
    }

    function checkAndClickSubmitButton() {
        if (submitButtonClicked) {
            return true;
        }

        const submitButton = getSubmitButton();

        if (submitButton) {
            console.log('Found submit button, clicking in 0.7 seconds...');
            submitButtonClicked = true;

            createNotification('Botón detectado, enviando en 0.7s...', 'info');

            setTimeout(() => {
                console.log('0.7 seconds elapsed, clicking submit button...');
                submitButton.click();
                submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                console.log('✓ Submit button auto-clicked!');
                createNotification('✓ Formulario enviado', 'success');

                // Cleanup after clicking
                if (submitButtonObserver) {
                    submitButtonObserver.disconnect();
                    submitButtonObserver = null;
                }
            }, 700);

            return true;
        }

        return false;
    }

    function setupSubmitButtonMonitor() {
        console.log('Setting up monitor for submit button...');

        // Check immediately
        if (checkAndClickSubmitButton()) {
            return;
        }

        // Throttled MutationObserver for submit button
        let observerTimeout = null;
        submitButtonObserver = new MutationObserver((mutations) => {
            if (observerTimeout) return;

            observerTimeout = setTimeout(() => {
                observerTimeout = null;

                if (checkAndClickSubmitButton()) {
                    submitButtonObserver.disconnect();
                    console.log('Submit button found and clicked, disconnecting observer');
                }
            }, 200);
        });

        submitButtonObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✓ Submit button monitor started');
    }

    function checkAndClickInvestigacionPendiente() {
        if (investigacionClicked) {
            return true;
        }

        console.log('Checking for INVESTIGACIÓN_PENDIENTE element...');

        const investigacionElement = Array.from(document.querySelectorAll('p.a-size-small')).find(p =>
            p.textContent.includes('INVESTIGACIÓN_PENDIENTE')
        );

        if (investigacionElement) {
            console.log('Found INVESTIGACIÓN_PENDIENTE element, clicking...');
            investigacionClicked = true;

            investigacionElement.click();
            investigacionElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            createNotification('✓ Clicked INVESTIGACIÓN_PENDIENTE', 'info');

            // Wait 1 second then click submit button
            setTimeout(() => {
                console.log('1 second elapsed, clicking submit button...');
                if (!clickSubmitButton()) {
                    setTimeout(clickSubmitButton, 500);
                }
            }, 1000);

            return true;
        }

        return false;
    }

    function cleanupObservers() {
        console.log('Cleaning up observers...');

        if (investigacionObserver) {
            investigacionObserver.disconnect();
            investigacionObserver = null;
        }

        if (inputObserver) {
            inputObserver.disconnect();
            inputObserver = null;
        }

        if (submitButtonObserver) {
            submitButtonObserver.disconnect();
            submitButtonObserver = null;
        }
    }

    function setupInvestigacionMonitor() {
        console.log('Setting up monitor for INVESTIGACIÓN_PENDIENTE element...');

        if (checkAndClickInvestigacionPendiente()) {
            return;
        }

        let checkCount = 0;
        const maxChecks = 10;

        const intervalId = setInterval(() => {
            checkCount++;
            console.log(`Check #${checkCount} for INVESTIGACIÓN_PENDIENTE`);

            if (checkAndClickInvestigacionPendiente() || checkCount >= maxChecks) {
                clearInterval(intervalId);
                console.log('Stopped periodic checks');
            }
        }, 1000);

        let observerTimeout = null;
        investigacionObserver = new MutationObserver((mutations) => {
            if (observerTimeout) return;

            observerTimeout = setTimeout(() => {
                observerTimeout = null;

                if (checkAndClickInvestigacionPendiente()) {
                    investigacionObserver.disconnect();
                    clearInterval(intervalId);
                    console.log('Element found, disconnecting observer');
                }
            }, 200);
        });

        investigacionObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✓ INVESTIGACIÓN_PENDIENTE monitor started');
    }

    function scheduleAutoSubmit(inputValue) {
        if (autoSubmitTimer) {
            clearTimeout(autoSubmitTimer);
        }

        if (inputValue && inputValue !== lastInputValue && !hasAutoSubmitted) {
            console.log('Scheduling auto-submit in 1 second for value:', inputValue);
            createNotification('Tote detectado, enviando en 1 seg...', 'info');

            autoSubmitTimer = setTimeout(() => {
                console.log('Auto-submit timer triggered');
                clickSubmitButton();
            }, 1000);

            lastInputValue = inputValue;
        }
    }

    function fillContainerInput(containerId) {
        console.log('Attempting to fill container input with:', containerId);

        const input = document.querySelector('input[name="containerId"]') ||
                     document.querySelector('input[type="text"]');

        if (input && input.value.trim() !== containerId) {
            console.log('Filling input with:', containerId);
            input.value = containerId;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            scheduleAutoSubmit(containerId);
            return true;
        }

        return false;
    }

    function setupInputMonitor() {
        console.log('Setting up input monitor...');

        document.addEventListener('input', (e) => {
            if (e.target.type === 'text' && !hasAutoSubmitted) {
                const newValue = e.target.value.trim();
                if (newValue && newValue !== lastInputValue) {
                    scheduleAutoSubmit(newValue);
                }
            }
        }, true);

        console.log('✓ Input monitor started');
    }

    async function autoFill() {
        const containerId = getContainerIdFromUrl();

        if (!containerId) {
            console.log('No containerId in URL - setting up monitors');
            setupInputMonitor();
            setupInvestigacionMonitor();
            setupSubmitButtonMonitor();
            return;
        }

        console.log('Starting auto-fill process for:', containerId);

        await new Promise(resolve => setTimeout(resolve, 1200));

        const filled = fillContainerInput(containerId);

        if (filled) {
            console.log('Container input filled successfully');
            createNotification(`✓ Tote: ${containerId}`, 'success');

            setTimeout(() => {
                const loadButton = Array.from(document.querySelectorAll('button')).find(btn =>
                    btn.textContent.toLowerCase().includes('load')
                );

                if (loadButton) {
                    console.log('Clicking load button');
                    loadButton.click();
                }
            }, 600);
        }

        setupInputMonitor();
        setupInvestigacionMonitor();
        setupSubmitButtonMonitor();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(autoFill, 500);
        });
    } else {
        setTimeout(autoFill, 500);
    }

})();