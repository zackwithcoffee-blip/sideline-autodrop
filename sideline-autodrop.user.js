
// ==UserScript==
// @name         Sideline autodrop + Edit + DPT + Pandash V3
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  Automatically drops containers from within the Sideline app and opens Edit Items
// @author       juagarcm
// @match        https://aft-poirot-website-dub.dub.proxy.amazon.com/*
// @grant        GM_xmlhttpRequest
// @connect      aft-moveapp-dub-dub.dub.proxy.amazon.com
// @connect      aft-qt-eu.aka.amazon.com
// @connect      wave.qubit.amazon.dev
// @connect      pandash.amazon.com
// ==/UserScript==

(function() {
    'use strict';

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes swipeUpBounce {
            0% {
                transform: translate(-50%, 100px);
                opacity: 0;
            }
            60% {
                transform: translate(-50%, -20px);
                opacity: 1;
            }
            80% {
                transform: translate(-50%, 5px);
            }
            100% {
                transform: translate(-50%, 0);
                opacity: 1;
            }
        }
        @keyframes swipeDown {
            0% {
                transform: translate(-50%, 0);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, 100px);
                opacity: 0;
            }
        }
        @keyframes checkmarkDraw {
            0% {
                stroke-dashoffset: 50;
            }
            100% {
                stroke-dashoffset: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Function to show animated success checkmark
    function showSuccessCheckmark() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, 100px);
            z-index: 999999;
            animation: swipeUpBounce 0.5s ease-out forwards;
        `;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '60');
        svg.setAttribute('viewBox', '0 0 100 100');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', '45');
        circle.setAttribute('fill', '#00AA00');

        const checkmark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        checkmark.setAttribute('d', 'M30 50 L42 62 L70 34');
        checkmark.setAttribute('stroke', 'white');
        checkmark.setAttribute('stroke-width', '8');
        checkmark.setAttribute('fill', 'none');
        checkmark.setAttribute('stroke-linecap', 'round');
        checkmark.setAttribute('stroke-linejoin', 'round');
        checkmark.setAttribute('stroke-dasharray', '50');
        checkmark.setAttribute('stroke-dashoffset', '50');
        checkmark.style.animation = 'checkmarkDraw 0.3s ease-out 0.2s forwards';

        svg.appendChild(circle);
        svg.appendChild(checkmark);
        notification.appendChild(svg);
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'swipeDown 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 700);
    }

    // Create TOP RIGHT container - STACKED VERTICALLY
    const topRightContainer = document.createElement('div');
    topRightContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: flex-end;
    `;

    // Create Ready to Stow button (circle with checkmark that expands to pill on hover)
    const readyToStowButton = document.createElement('button');
    readyToStowButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; margin-top: -2px;">✔</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; margin-left: 5px;">R2S</span>';
    readyToStowButton.style.cssText = `
        width: 45px;
        height: 45px;
        background-color: #00AA00;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        overflow: hidden;
        white-space: nowrap;
        padding: 0;
    `;

    let isReadyHovering = false;

    readyToStowButton.addEventListener('mouseenter', () => {
        isReadyHovering = true;
        const emoji = readyToStowButton.querySelector('.emoji');
        const text = readyToStowButton.querySelector('.text');

        readyToStowButton.style.width = '130px';
        readyToStowButton.style.borderRadius = '22.5px';
        readyToStowButton.style.padding = '0 16px';
        readyToStowButton.style.justifyContent = 'flex-start';

        emoji.style.opacity = '0';
        emoji.style.width = '0';
        emoji.style.transition = 'all 0.2s ease';

        setTimeout(() => {
            if (isReadyHovering) {
                text.style.display = 'inline';
                text.style.opacity = '1';
                text.style.transition = 'opacity 0.2s ease';
            }
        }, 100);
    });

    readyToStowButton.addEventListener('mouseleave', () => {
        isReadyHovering = false;
        const emoji = readyToStowButton.querySelector('.emoji');
        const text = readyToStowButton.querySelector('.text');

        text.style.opacity = '0';
        setTimeout(() => {
            text.style.display = 'none';
            emoji.style.opacity = '1';
            emoji.style.width = 'auto';
        }, 100);

        readyToStowButton.style.width = '45px';
        readyToStowButton.style.borderRadius = '50%';
        readyToStowButton.style.padding = '0';
        readyToStowButton.style.justifyContent = 'center';
    });

    readyToStowButton.addEventListener('click', () => {
        dropTote('dz-P-READYTOSTOW', readyToStowButton);
    });

    // Create Recycle button (circle with recycle emoji that expands to pill on hover)
    const recycleButton = document.createElement('button');
    recycleButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; font-size: 25px;">♻️</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; margin-left: 2px;">RECYCLE</span>';
    recycleButton.style.cssText = `
        width: 45px;
        height: 45px;
        background-color: #FFC107;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        overflow: hidden;
        white-space: nowrap;
        padding: 0;
    `;

    let isRecycleHovering = false;

    recycleButton.addEventListener('mouseenter', () => {
        isRecycleHovering = true;
        const emoji = recycleButton.querySelector('.emoji');
        const text = recycleButton.querySelector('.text');

        recycleButton.style.width = '130px';
        recycleButton.style.borderRadius = '22.5px';
        recycleButton.style.padding = '0 16px';
        recycleButton.style.justifyContent = 'flex-start';

        emoji.style.opacity = '0';
        emoji.style.width = '0';
        emoji.style.transition = 'all 0.2s ease';

        setTimeout(() => {
            if (isRecycleHovering) {
                text.style.display = 'inline';
                text.style.opacity = '1';
                text.style.transition = 'opacity 0.2s ease';
            }
        }, 100);
    });

    recycleButton.addEventListener('mouseleave', () => {
        isRecycleHovering = false;
        const emoji = recycleButton.querySelector('.emoji');
        const text = recycleButton.querySelector('.text');

        text.style.opacity = '0';
        setTimeout(() => {
            text.style.display = 'none';
            emoji.style.opacity = '1';
            emoji.style.width = 'auto';
        }, 100);

        recycleButton.style.width = '45px';
        recycleButton.style.borderRadius = '50%';
        recycleButton.style.padding = '0';
        recycleButton.style.justifyContent = 'center';
    });

    recycleButton.addEventListener('click', () => {
        dropTote('dz-P-RECYCLE', recycleButton);
    });

    // Create Edit to Pending button (circle with hand emoji that expands to pill on hover)
    const editToPendingButton = document.createElement('button');
    editToPendingButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; font-size: 28px;position: relative; top: -2px;">✋</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; margin-left: 5px;">PENDING</span>';
    editToPendingButton.style.cssText = `
        width: 45px;
        height: 45px;
        background-color: #FF5722;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        overflow: hidden;
        white-space: nowrap;
        padding: 0;
    `;

    let isEditHovering = false;

    editToPendingButton.addEventListener('mouseenter', () => {
        isEditHovering = true;
        const emoji = editToPendingButton.querySelector('.emoji');
        const text = editToPendingButton.querySelector('.text');

        editToPendingButton.style.width = '170px';
        editToPendingButton.style.borderRadius = '22.5px';
        editToPendingButton.style.padding = '0 16px';
        editToPendingButton.style.justifyContent = 'flex-start';

        emoji.style.opacity = '0';
        emoji.style.width = '0';
        emoji.style.transition = 'all 0.2s ease';

        setTimeout(() => {
            if (isEditHovering) {
                text.style.display = 'inline';
                text.style.opacity = '1';
                text.style.transition = 'opacity 0.2s ease';
            }
        }, 100);
    });

    editToPendingButton.addEventListener('mouseleave', () => {
        isEditHovering = false;
        const emoji = editToPendingButton.querySelector('.emoji');
        const text = editToPendingButton.querySelector('.text');

        text.style.opacity = '0';
        setTimeout(() => {
            text.style.display = 'none';
            emoji.style.opacity = '1';
            emoji.style.width = 'auto';
        }, 100);

        editToPendingButton.style.width = '45px';
        editToPendingButton.style.borderRadius = '50%';
        editToPendingButton.style.padding = '0';
        editToPendingButton.style.justifyContent = 'center';
    });

    editToPendingButton.addEventListener('click', () => {
        editItemsToPendingResearch(editToPendingButton);
    });

    // Create DPT button (circle with emoji that expands to pill on hover)
    const dptButton = document.createElement('button');
    dptButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; margin-top: -2px; font-size: 28px;position: relative; top: -3px;">💩</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; margin-left: 5px;">DPT</span>';
    dptButton.style.cssText = `
        width: 45px;
        height: 45px;
        background-color: #FFB366;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        overflow: hidden;
        white-space: nowrap;
        padding: 0;
    `;

    let isDptHovering = false;

    dptButton.addEventListener('mouseenter', () => {
        isDptHovering = true;
        const emoji = dptButton.querySelector('.emoji');
        const text = dptButton.querySelector('.text');

        dptButton.style.width = '90px';
        dptButton.style.borderRadius = '22.5px';
        dptButton.style.padding = '0 12px';
        dptButton.style.justifyContent = 'flex-start';

        emoji.style.opacity = '0';
        emoji.style.width = '0';
        emoji.style.transition = 'all 0.2s ease';

        setTimeout(() => {
            if (isDptHovering) {
                text.style.display = 'inline';
                text.style.opacity = '1';
                text.style.transition = 'opacity 0.2s ease';
            }
        }, 100);
    });

    dptButton.addEventListener('mouseleave', () => {
        isDptHovering = false;
        const emoji = dptButton.querySelector('.emoji');
        const text = dptButton.querySelector('.text');

        text.style.opacity = '0';
        setTimeout(() => {
            text.style.display = 'none';
            emoji.style.opacity = '1';
            emoji.style.width = 'auto';
        }, 100);

        dptButton.style.width = '45px';
        dptButton.style.borderRadius = '50%';
        dptButton.style.padding = '0';
        dptButton.style.justifyContent = 'center';
    });

    dptButton.addEventListener('click', () => {
        const dptUrl = 'https://wave.qubit.amazon.dev/DPT/queue-initiation';
        window.open(dptUrl, '_blank');
        console.log('DPT opened');
    });

    // Create Pandash button (circle with panda emoji that expands to pill on hover)
    const pandashButton = document.createElement('button');
    pandashButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; font-size: 28px;">🐼</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; font-size: 20px; margin-left: 5px;">PANDASH</span>';
    pandashButton.style.cssText = `
        width: 45px;
        height: 45px;
        background-color: #98D8C8;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        overflow: hidden;
        white-space: nowrap;
        padding: 0;
    `;

    let isPandashHovering = false;

    pandashButton.addEventListener('mouseenter', () => {
        isPandashHovering = true;
        const emoji = pandashButton.querySelector('.emoji');
        const text = pandashButton.querySelector('.text');

        pandashButton.style.width = '130px';
        pandashButton.style.borderRadius = '22.5px';
        pandashButton.style.padding = '0 12px';
        pandashButton.style.justifyContent = 'flex-start';

        emoji.style.opacity = '0';
        emoji.style.width = '0';
        emoji.style.transition = 'all 0.2s ease';

        setTimeout(() => {
            if (isPandashHovering) {
                text.style.display = 'inline';
                text.style.opacity = '1';
                text.style.transition = 'opacity 0.2s ease';
            }
        }, 100);
    });

    pandashButton.addEventListener('mouseleave', () => {
        isPandashHovering = false;
        const emoji = pandashButton.querySelector('.emoji');
        const text = pandashButton.querySelector('.text');

        text.style.opacity = '0';
        setTimeout(() => {
            text.style.display = 'none';
            emoji.style.opacity = '1';
            emoji.style.width = 'auto';
        }, 100);

        pandashButton.style.width = '45px';
        pandashButton.style.borderRadius = '50%';
        pandashButton.style.padding = '0';
        pandashButton.style.justifyContent = 'center';
    });

    pandashButton.addEventListener('click', () => {
        const pandashUrl = 'https://pandash.amazon.com/';
        window.open(pandashUrl, '_blank');
        console.log('Pandash opened');
    });

    // Create EXCEPCIONES button - BOTTOM LEFT (circular with truck emoji)

const excepcionesButton = document.createElement('button');
excepcionesButton.innerHTML = '<span class="emoji" style="display: flex; align-items: center; justify-content: center; font-size: 28px;transform: scaleX(-1); position: absolute; left: 1;">🚚</span><span class="text" style="display: none; font-family: Roboto, sans-serif; font-weight: bold; opacity: 0; position: absolute; left: 16px; ">EXCEPCIONES</span>';
excepcionesButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 10000;
    width: 45px;
    height: 45px;
    background-color: #003366;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
    overflow: hidden;
    white-space: nowrap;
    padding: 0;
`;

let isExcepcionesHovering = false;
let isExcepcionesExpanded = false;

// Function to expand the button with truck animation
function expandButton() {
    const emoji = excepcionesButton.querySelector('.emoji');
    const text = excepcionesButton.querySelector('.text');

    excepcionesButton.style.width = '200px';
    excepcionesButton.style.borderRadius = '22.5px';
    excepcionesButton.style.padding = '0 16px';
    excepcionesButton.style.justifyContent = 'flex-start';

    emoji.style.transition = 'transform 0.8s ease, opacity 0.1s ease 0.55s';
    emoji.style.transform = 'scaleX(-1) translateX(-190px)';

    text.style.display = 'block';
    text.style.transition = 'opacity 0.3s ease 0.1s';
    text.style.opacity = '1';

    setTimeout(() => {
        emoji.style.opacity = '0';
    }, 350);
}
// Function to collapse the button with reverse animation
function collapseButton() {
    const emoji = excepcionesButton.querySelector('.emoji');
    const text = excepcionesButton.querySelector('.text');

    text.style.transition = 'opacity 0.2s ease';
    text.style.opacity = '0';

    emoji.style.opacity = '1';
    emoji.style.transition = 'transform 0.6s ease, opacity 0.1s ease';
    emoji.style.transform = 'scaleX(-1) translateX(0)';

    setTimeout(() => {
        text.style.display = 'none';
    }, 400);

    excepcionesButton.style.width = '45px';
    excepcionesButton.style.borderRadius = '50%';
    excepcionesButton.style.padding = '0';
    excepcionesButton.style.justifyContent = 'center';
}

// Click event to toggle the expanded state
excepcionesButton.addEventListener('click', () => {
    isExcepcionesExpanded = !isExcepcionesExpanded;

    if (isExcepcionesExpanded) {
        expandButton();
    } else {
        collapseButton();
    }
});

excepcionesButton.addEventListener('mouseenter', () => {
    isExcepcionesHovering = true;
    if (!isExcepcionesExpanded) {
        expandButton();
    }
});

excepcionesButton.addEventListener('mouseleave', () => {
    isExcepcionesHovering = false;
    if (!isExcepcionesExpanded) {
        collapseButton();
    }
});



    // Create button container for other 8 buttons - BOTTOM LEFT (slightly above)
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        position: fixed;
        bottom: 75px;
        left: 20px;
        z-index: 9999;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        max-width: 800px;
        opacity: 0;
        transform: scale(0.8);
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    // Toggle state for EXCEPCIONES button
    let isExpanded = false;

    // EXCEPCIONES button click handler
    excepcionesButton.addEventListener('click', () => {
        isExpanded = !isExpanded;

        if (isExpanded) {
            buttonContainer.style.opacity = '1';
            buttonContainer.style.transform = 'scale(1)';
            buttonContainer.style.pointerEvents = 'auto';
            excepcionesButton.style.opacity = '0.5';
            excepcionesButton.style.transform = 'scale(0.9)';
        } else {
            buttonContainer.style.opacity = '0';
            buttonContainer.style.transform = 'scale(0.8)';
            buttonContainer.style.pointerEvents = 'none';
            excepcionesButton.style.opacity = '1';
            excepcionesButton.style.transform = 'scale(1)';
        }
    });

    // Button configurations for exception buttons (now pill-shaped)
    const otherButtons = [
        { text: 'CUBIS', dropzone: 'dz-P-PendingCubisSW', color: '#003366' },
        { text: 'UNPLANNED', dropzone: 'dz-P-UnplannedPrepP3', color: '#003366' },
        { text: 'POUT SW', dropzone: 'dz-P-ProblemOutSW', color: '#003366' },
        { text: 'POUT P1', dropzone: 'dz-ProblemOutP1', color: '#003366' },
        { text: 'REMOVE', dropzone: 'dz-P-RemoveSW', color: '#003366' },
        { text: 'DAMAGE', dropzone: 'dz-P-DamageSW', color: '#003366' },
        { text: 'TT P3', dropzone: 'dz-R-TTP3', color: '#003366' },
        { text: 'TT P1', dropzone: 'dz-P-TTP1', color: '#003366' }
    ];

    // Function to create a pill-shaped button
    function createButton(config) {
        const button = document.createElement('button');
        button.textContent = config.text;
        button.style.cssText = `
            padding: 12px 16px;
            background-color: ${config.color};
            color: ${config.textColor || 'white'};
            border: none;
            border-radius: 22.5px;
            cursor: pointer;
            font-family: 'Roboto', Arial, sans-serif;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: all 0.3s;
            white-space: nowrap;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        });

        button.addEventListener('click', () => {
            dropTote(config.dropzone, button);
        });

        return button;
    }

    function getSourceToteId() {
        const toteElement = document.getElementById('source-container-label');
        if (toteElement && toteElement.textContent.trim()) {
            return toteElement.textContent.trim();
        }
        return null;
    }

    function getDestinationToteId() {
        const spans = document.querySelectorAll('span[id^="destination-container-detail-"]');
        for (let span of spans) {
            const toteId = span.textContent.trim();
            if (toteId && toteId.length > 0) {
                return toteId;
            }
        }
        return null;
    }

    function getToteIdToDrop() {
        const destinationTote = getDestinationToteId();
        const sourceTote = getSourceToteId();

        if (destinationTote) {
            console.log('Found destination tote:', destinationTote);
            return { toteId: destinationTote, isDestination: true };
        } else if (sourceTote) {
            console.log('No destination tote, using source tote:', sourceTote);
            return { toteId: sourceTote, isDestination: false };
        }
        return null;
    }

    function getCsrfToken() {
        const metaTag = document.querySelector('meta[name="anti-csrftoken-a2z"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        return null;
    }

    function getSessionId() {
        const metaTag = document.querySelector('meta[name="session-id"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        return null;
    }

    function makeApiCall(url, payload, csrfToken, sessionId) {
        return new Promise((resolve, reject) => {
            const headers = {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
            };

            if (csrfToken) {
                headers['anti-csrftoken-a2z'] = csrfToken;
            }
            if (sessionId) {
                headers['X-AMZ-SESSION-ID'] = sessionId;
            }

            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                headers: headers,
                data: JSON.stringify(payload),
                onload: function(response) {
                    console.log('API Response:', response.status, response.responseText);
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response);
                    } else {
                        reject(response);
                    }
                },
                onerror: function(error) {
                    console.error('API Error:', error);
                    reject(error);
                },
                ontimeout: function() {
                    reject(new Error('Timeout'));
                },
                timeout: 15000
            });
        });
    }

    // Function to open Edit Items with tote ID from Sideline page
    function editItemsToPendingResearch(buttonElement) {
        const toteInfo = getToteIdToDrop();

        if (!toteInfo) {
            alert('No se encontró ID de tote. Por favor, escanea un tote primero.');
            return;
        }

        const toteId = toteInfo.toteId;
        const toteLocation = toteInfo.isDestination ? 'destino' : 'origen';

        const editItemsUrl = `https://aft-qt-eu.aka.amazon.com/app/edititems?experience=Desktop&containerId=${encodeURIComponent(toteId)}`;

        const newWindow = window.open(editItemsUrl, '_blank');

        if (!newWindow) {
            alert('No se pudo abrir Edit Items. Por favor, permite ventanas emergentes y vuelve a intentar.');
            return;
        }

        console.log(`Edit Items opened for tote ${toteId} (${toteLocation})`);
    }

    async function dropTote(dropzone, buttonElement) {
        const toteInfo = getToteIdToDrop();

        if (!toteInfo) {
            alert('No se encontró ID de tote. Por favor, escanea un tote primero.');
            return;
        }

        const toteId = toteInfo.toteId;
        const toteLocation = toteInfo.isDestination ? 'destino' : 'origen';

        buttonElement.disabled = true;
        const originalText = buttonElement.textContent;
        const originalColor = buttonElement.style.backgroundColor;
        buttonElement.textContent = 'Procesando...';
        buttonElement.style.backgroundColor = '#666666';

        try {
            const csrfToken = getCsrfToken();
            const sessionId = getSessionId();

            buttonElement.textContent = 'Validando...';
            console.log(`Step 1: Validating tote from ${toteLocation}:`, toteId);

                       const getContainerUrl = 'https://aft-moveapp-dub-dub.dub.proxy.amazon.com/api/get-container';
            const getContainerPayload = {
                scannableId: toteId,
                palletCheckRequired: "false"
            };

            const step1Response = await makeApiCall(getContainerUrl, getContainerPayload, csrfToken, sessionId);
            console.log('Step 1 success:', step1Response.responseText);

            await new Promise(resolve => setTimeout(resolve, 500));

            buttonElement.textContent = 'Moviendo...';
            console.log('Step 2: Moving to destination:', dropzone);

            const moveContainerUrl = 'https://aft-moveapp-dub-dub.dub.proxy.amazon.com/api/move-container';
            const moveContainerPayload = {
                sourceScannableId: null,
                destinationScannableId: dropzone,
                containerScannableId: toteId,
                confirmed: "true"
            };

            const step2Response = await makeApiCall(moveContainerUrl, moveContainerPayload, csrfToken, sessionId);
            console.log('Step 2 success:', step2Response.responseText);

            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.backgroundColor = originalColor;

            showSuccessCheckmark();
            console.log(`✓ Tote ${toteId} (${toteLocation}) movido a ${dropzone}`);

        } catch (error) {
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.backgroundColor = originalColor;

            console.error('Error completo:', error);
            const errorMsg = error.responseText || error.statusText || error.message || 'Error desconocido';
            alert(`Error: No se pudo mover el tote.
Status: ${error.status || 'desconocido'}
Detalles: ${errorMsg}
Revisa la consola (F12) para más información.`);
        }
    }

    topRightContainer.appendChild(readyToStowButton);
    topRightContainer.appendChild(recycleButton);
    topRightContainer.appendChild(editToPendingButton);
    topRightContainer.appendChild(dptButton);
    topRightContainer.appendChild(pandashButton);

    otherButtons.forEach(config => {
        const button = createButton(config);
        buttonContainer.appendChild(button);
    });

    document.body.appendChild(topRightContainer);
    document.body.appendChild(excepcionesButton);
    document.body.appendChild(buttonContainer);

    console.log('Sideline Auto-Drop script loaded successfully');
})();
