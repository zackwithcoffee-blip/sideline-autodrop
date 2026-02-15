
// ==UserScript==
// @name         Auto Edit fixed
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  Automatizes Pending Research Process now with an amazing button
// @author       juagarcm
// @match        https://aft-qt-eu.aka.amazon.com/app/edititems*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('Edit Items Auto-Filler v3.5 loaded at:', new Date().toISOString());

    // Script state management - Load from localStorage
    let scriptEnabled = localStorage.getItem('autoEditScriptEnabled') !== 'false'; // Default to true
    let autoSubmitTimer = null;
    let lastInputValue = '';
    let hasAutoSubmitted = false;
    let investigacionClicked = false;
    let investigacionObserver = null;
    let inputObserver = null;
    let submitButtonObserver = null;
    let submitButtonClicked = false;
    let investigacionCheckAttempts = 0;
    const MAX_INVESTIGACION_CHECKS = 5;
    let initialCheckComplete = false;

    // Create toggle button
    function createToggleButton() {
        const toggleButton = document.createElement('div');
        toggleButton.id = 'script-toggle-button';
        toggleButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000000;
            cursor: pointer;
            user-select: none;
        `;

        const pill = document.createElement('div');
        pill.id = 'toggle-pill';

        // Set initial state based on localStorage
        const isEnabled = scriptEnabled;
        pill.style.cssText = `
            background: ${isEnabled ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'};
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-family: 'Roboto', Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            text-align: center;
            min-width: 60px;
        `;
        pill.textContent = isEnabled ? 'ON' : 'OFF';

        toggleButton.appendChild(pill);
        document.body.appendChild(toggleButton);

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes togglePulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            #toggle-pill:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 16px rgba(0,0,0,0.4);
            }
        `;
        document.head.appendChild(style);

        // Toggle functionality
        toggleButton.addEventListener('click', () => {
            scriptEnabled = !scriptEnabled;

            // Save state to localStorage
            localStorage.setItem('autoEditScriptEnabled', scriptEnabled.toString());

            pill.style.animation = 'togglePulse 0.3s ease';
            setTimeout(() => {
                pill.style.animation = '';
            }, 300);

            if (scriptEnabled) {
                pill.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
                pill.textContent = 'ON';
                createNotification('✓ Script activado', 'success');
                console.log('Script ENABLED - State saved to localStorage');

                // Restart monitoring if needed
                if (!hasAutoSubmitted) {
                    setupInputMonitor();
                    setupInvestigacionMonitor();
                    setupSubmitButtonMonitor();
                }
            } else {
                pill.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                pill.textContent = 'OFF';
                createNotification('✗ Script desactivado', 'warning');
                console.log('Script DISABLED - State saved to localStorage');

                // Clean up all observers
                cleanupObservers();
                if (autoSubmitTimer) {
                    clearTimeout(autoSubmitTimer);
                    autoSubmitTimer = null;
                }
            }
        });

        console.log('✓ Toggle button created with state:', scriptEnabled ? 'ON' : 'OFF');
    }

    function createNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const colors = {
            info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        };

        notification.style.cssText = `
            position: fixed;
            top: 80px;
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

    function checkForBlockingDDElements() {
        console.log('--- Checking for blocking DD elements ---');

        const ddElements = document.querySelectorAll('dd.a-list-item');

        for (let dd of ddElements) {
            const ddText = dd.textContent.trim();

            // Check for "Sku" or "Lote fechado"
            if (ddText === 'Sku' || ddText === 'Lote fechado') {
                console.log(`✗ BLOCKED: Found blocking DD element with text "${ddText}"`);
                createNotification(`✗ Script bloqueado: ${ddText} detectado`, 'warning');
                return true;
            }
        }

        console.log('✓ No blocking DD elements found');
        return false;
    }

    function checkForBlockingH1Elements() {
        console.log('--- Checking for blocking H1 elements ---');

        const h1Elements = document.querySelectorAll('h1.a-size-base');

        for (let h1 of h1Elements) {
            const h1Text = h1.textContent.trim();

            // Check for "Sku" or "Lote fechado"
            if (h1Text === 'Sku' || h1Text === 'Lote fechado') {
                console.log(`✗ BLOCKED: Found blocking H1 element with text "${h1Text}"`);
                createNotification(`✗ Script bloqueado: ${h1Text} detectado`, 'warning');
                return true;
            }
        }

        console.log('✓ No blocking H1 elements found');
        return false;
    }

    function checkForExactUnidadDD() {
        console.log('--- Checking for exact <dd class="a-list-item">Unidad</dd> ---');

        // First, verify that DT elements exist at all
        const dtElements = document.querySelectorAll('dt.a-list-item');

        if (dtElements.length === 0) {
            console.log('✗ No DT elements found at all - NOT activating');
            return false;
        }

        // Look for the exact pattern: dt "Modo:" followed by dd "Unidad"
        for (let dt of dtElements) {
            const dtText = dt.textContent.trim();

            if (dtText === 'Modo:') {
                const dd = dt.nextElementSibling;

                // Check if there IS a DD element and it says exactly "Unidad"
                if (dd &&
                    dd.tagName === 'DD' &&
                    dd.classList.contains('a-list-item') &&
                    dd.textContent.trim() === 'Unidad') {

                    console.log('✓ Found exact match: <dt>Modo:</dt> followed by <dd>Unidad</dd>');
                    return true;
                } else {
                    // Found "Modo:" but the DD is missing or has different text
                    console.log('✗ Found "Modo:" but DD is missing or has different value - NOT activating');
                    return false;
                }
            }
        }

        console.log('✗ "Modo:" DT element not found - NOT activating');
        return false;
    }

    function shouldScriptActivate() {
        if (!scriptEnabled) {
            console.log('Script is disabled by toggle');
            return false;
        }

        console.log('--- Checking activation conditions ---');

        // Block if "Sku" or "Lote fechado" DD exists
        if (checkForBlockingDDElements()) {
            return false;
        }

        // Block if "Sku" or "Lote fechado" H1 exists
        if (checkForBlockingH1Elements()) {
            return false;
        }

        // Block if h1 "Unidad" + p "Edita un producto..." exists
        const h1Elements = document.querySelectorAll('h1.a-size-base');
        for (let h1 of h1Elements) {
            if (h1.textContent.trim() === 'Unidad') {
                let nextElement = h1.nextElementSibling;
                let checkCount = 0;

                while (nextElement && checkCount < 3) {
                    if (nextElement.tagName === 'P' &&
                        nextElement.classList.contains('a-size-small') &&
                        nextElement.textContent.trim() === 'Edita un producto de un contenedor.') {

                        console.log('✗ BLOCKED: Single product edit mode detected');
                        return false;
                    }
                    nextElement = nextElement.nextElementSibling;
                    checkCount++;
                }
            }
        }

        // ONLY activate if the exact pattern exists
        // This is now the ONLY way to return true
        const hasExactPattern = checkForExactUnidadDD();

        if (hasExactPattern) {
            console.log('✓ ACTIVATED: Exact <dt>Modo:</dt><dd>Unidad</dd> pattern found');
            return true;
        } else {
            console.log('✗ NOT ACTIVATED: Required pattern not found');
            return false;
        }
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
        if (!scriptEnabled) return false;

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

            cleanupObservers();
            return true;
        }

        console.log('Submit button not found');
        return false;
    }

    function checkAndClickSubmitButton() {
        if (!scriptEnabled) return false;

        if (submitButtonClicked) {
            return true;
        }

        const submitButton = getSubmitButton();

        if (submitButton) {
            console.log('Found submit button, clicking in 0.7 seconds...');
            submitButtonClicked = true;

            createNotification('Botón detectado, enviando en 0.7s...', 'info');

            setTimeout(() => {
                if (!scriptEnabled) return;

                console.log('0.7 seconds elapsed, clicking submit button...');
                submitButton.click();
                submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                console.log('✓ Submit button auto-clicked!');
                createNotification('✓ Formulario enviado', 'success');

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
        if (!scriptEnabled) return;

        console.log('Setting up monitor for submit button...');

        if (checkAndClickSubmitButton()) {
            return;
        }

        let observerTimeout = null;
        submitButtonObserver = new MutationObserver((mutations) => {
            if (!scriptEnabled || observerTimeout) return;

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
        if (!scriptEnabled || investigacionClicked) {
            return true;
        }

        investigacionCheckAttempts++;
        console.log(`Checking for INVESTIGACIÓN_PENDIENTE element... (Attempt ${investigacionCheckAttempts}/${MAX_INVESTIGACION_CHECKS})`);

        const allElements = document.querySelectorAll('*');
        let targetElement = null;

        for (let element of allElements) {
            const directText = Array.from(element.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .join(' ');

            const fullText = element.textContent.trim();

            if ((directText.includes('Propietario:') && directText.includes('INVESTIGACIÓN_PENDIENTE')) ||
                (fullText === 'Propietario: INVESTIGACIÓN_PENDIENTE')) {

                if (element.tagName === 'LABEL' ||
                    element.classList.contains('a-radio') ||
                    element.classList.contains('a-radio-label') ||
                    element.closest('.a-radio')) {

                    targetElement = element;
                    console.log('Found target element:', element.tagName, element.className);
                    break;
                }

                if (element.tagName === 'P') {
                    const clickableParent = element.closest('label') ||
                                          element.closest('.a-radio') ||
                                          element.closest('[role="radio"]') ||
                                          element.parentElement;

                    if (clickableParent) {
                        targetElement = clickableParent;
                        console.log('Found clickable parent:', clickableParent.tagName, clickableParent.className);
                        break;
                    }
                }
            }
        }

        if (targetElement) {
            console.log('Found INVESTIGACIÓN_PENDIENTE element, clicking...');
            console.log('Element details:', {
                tag: targetElement.tagName,
                class: targetElement.className,
                text: targetElement.textContent.trim().substring(0, 100)
            });

            investigacionClicked = true;

            targetElement.click();
            targetElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

            const radioInput = targetElement.querySelector('input[type="radio"]');
            if (radioInput) {
                console.log('Found radio input, clicking it too');
                radioInput.click();
                radioInput.checked = true;
                radioInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            createNotification('✓ Clicked INVESTIGACIÓN_PENDIENTE', 'info');

            setTimeout(() => {
                if (!scriptEnabled) return;

                console.log('0.5 seconds elapsed, clicking submit button...');
                if (!clickSubmitButton()) {
                    setTimeout(clickSubmitButton, 500);
                }
            }, 500);

            return true;
        }

        console.log('INVESTIGACIÓN_PENDIENTE element not found in this check');

        if (investigacionCheckAttempts >= MAX_INVESTIGACION_CHECKS) {
            console.log('INVESTIGACIÓN_PENDIENTE not found after maximum attempts. Stopping search.');
            cleanupInvestigacionObserver();
            return false;
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

    function cleanupInvestigacionObserver() {
        if (investigacionObserver) {
            investigacionObserver.disconnect();
            investigacionObserver = null;
            console.log('INVESTIGACIÓN_PENDIENTE observer cleaned up');
        }
    }

    function setupInvestigacionMonitor() {
        if (!shouldScriptActivate()) {
            console.log('⚠️ Script NOT activated - conditions not met');
            return;
        }

        console.log('✓ Script ACTIVATED - Setting up monitor for INVESTIGACIÓN_PENDIENTE...');

        if (checkAndClickInvestigacionPendiente()) {
            return;
        }

        let checkCount = 0;
        const intervalId = setInterval(() => {
            if (!scriptEnabled) {
                clearInterval(intervalId);
                return;
            }

            checkCount++;
            console.log(`Periodic check #${checkCount} for INVESTIGACIÓN_PENDIENTE`);

            if (checkAndClickInvestigacionPendiente() || checkCount >= MAX_INVESTIGACION_CHECKS) {
                clearInterval(intervalId);
                console.log('Stopped periodic checks');
            }
        }, 1000);

        let observerTimeout = null;
        investigacionObserver = new MutationObserver((mutations) => {
            if (!scriptEnabled || observerTimeout) return;

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
        if (!scriptEnabled) return;

        if (autoSubmitTimer) {
            clearTimeout(autoSubmitTimer);
        }

        if (inputValue && inputValue !== lastInputValue && !hasAutoSubmitted) {
            console.log('Scheduling auto-submit in 1 second for value:', inputValue);
            createNotification('Tote detectado, enviando en 1 seg...', 'info');

            autoSubmitTimer = setTimeout(() => {
                if (!scriptEnabled) return;

                console.log('Auto-submit timer triggered');
                clickSubmitButton();
            }, 1000);

            lastInputValue = inputValue;
        }
    }

    function fillContainerInput(containerId) {
        if (!scriptEnabled) return false;

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
        if (!scriptEnabled) return;

        console.log('Setting up input monitor...');

        document.addEventListener('input', (e) => {
            if (!scriptEnabled) return;

            if (e.target.type === 'text' && !hasAutoSubmitted) {
                const newValue = e.target.value.trim();
                if (newValue && newValue !== lastInputValue) {
                    scheduleAutoSubmit(newValue);
                }
            }
        }, true);

        console.log('✓ Input monitor started');
    }

   async function performInitialCheck() {
    console.log('--- Performing initial 1-second wait and check ---');

    // Wait 1 second before doing anything
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('1 second elapsed, checking conditions...');

    // Check for blocking DD elements
    if (checkForBlockingDDElements()) {
        console.log('⚠️ Script will NOT activate due to blocking DD elements');
        initialCheckComplete = true;
        return false;
    }

    // Check for blocking H1 elements
    if (checkForBlockingH1Elements()) {
        console.log('⚠️ Script will NOT activate due to blocking H1 elements');
        initialCheckComplete = true;
        return false;
    }

    // NEW: Check if the required pattern exists
    if (!checkForExactUnidadDD()) {
        console.log('⚠️ Script will NOT activate - required <dt>Modo:</dt><dd>Unidad</dd> pattern not found');
        initialCheckComplete = true;
        return false;
    }

    console.log('✓ All checks passed - required pattern found');
    initialCheckComplete = true;
    return true;
}

    async function autoFill() {
        // Perform initial 1-second wait and check
        const canProceed = await performInitialCheck();

        if (!canProceed) {
            console.log('Script blocked from activating');
            return;
        }

        const containerId = getContainerIdFromUrl();

        if (!containerId) {
            console.log('No containerId in URL - setting up monitors');
            setupInputMonitor();
            setupInvestigacionMonitor();
            setupSubmitButtonMonitor();
            return;
        }

        console.log('Starting auto-fill process for:', containerId);

        await new Promise(resolve => setTimeout(resolve, 200));

        const filled = fillContainerInput(containerId);

        if (filled) {
            console.log('Container input filled successfully');
            createNotification(`✓ Tote: ${containerId}`, 'success');

            setTimeout(() => {
                if (!scriptEnabled) return;

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

    // Initialize toggle button when DOM is ready
    function initToggleButton() {
        if (document.body) {
            createToggleButton();
        } else {
            setTimeout(initToggleButton, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initToggleButton();
            setTimeout(autoFill, 500);
        });
    } else {
        initToggleButton();
        setTimeout(autoFill, 500);
    }

})();


