// ==UserScript==
// @name         SIPS Alert
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Monitors SIPS Top Offenders via OpenSearch API and shows persistent alerts on any page
// @author       juagarcm
// @match        https://moc.prod.atlas-opensearch.qubit.amazon.dev/*
// @match        https://fclm-portal.amazon.com/*
// @match        https://*.amazon.com/*
// @match        https://*.amazon.dev/*
// @match        https://*.corp.amazon.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      moc.prod.atlas-opensearch.qubit.amazon.dev
// ==/UserScript==

(function() {
    'use strict';

    const SIPS_THRESHOLD = 100;
    const MAX_ITEMS = 7;
    const CHECK_INTERVAL = 900000; // 15 minutes
    const FC = 'MAD7';

    // Track if alert was manually closed
    var alertManuallyClosed = false;
    var currentAlertItems = null;

    console.log('[SIPS Monitor] Script loaded at ' + new Date().toISOString());

    // ─────────────────────────────────────────────────────────────────────────
    // STYLES
    // ─────────────────────────────────────────────────────────────────────────
    GM_addStyle(`
        .sips-alert-overlay {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483647;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #e74c3c;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(231, 76, 60, 0.4), 0 0 20px rgba(231, 76, 60, 0.2);
            padding: 16px 24px;
            min-width: 300px;
            max-width: 500px;
            font-family: 'Roboto', 'Segoe UI', sans-serif;
            animation: sips-slide-in 0.4s ease-out;
        }
        @keyframes sips-slide-in {
            from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .sips-alert-header {
            font-size: 16px;
            font-weight: bold;
            color: #e74c3c;
            text-align: center;
            margin-bottom: 12px;
            letter-spacing: 1px;
        }
        .sips-alert-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sips-alert-item:last-child {
            border-bottom: none;
        }
        .sips-alert-asin {
            color: #3498db;
            text-decoration: underline;
            cursor: pointer;
            font-weight: bold;
            font-size: 13px;
            transition: color 0.2s;
        }
        .sips-alert-asin:hover {
            color: #5dade2;
        }
        .sips-alert-units {
            color: #e74c3c;
            font-weight: bold;
            font-size: 13px;
        }
        .sips-alert-close {
            position: absolute;
            top: 8px;
            right: 12px;
            color: #95a5a6;
            font-size: 18px;
            cursor: pointer;
            font-weight: bold;
            transition: color 0.2s;
            line-height: 1;
        }
        .sips-alert-close:hover {
            color: #e74c3c;
        }

        /* SIPS OK notification */
        .sips-ok-notification {
            position: fixed;
            top: 0;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
            z-index: 2147483647;
            background: linear-gradient(135deg, #1a472a 0%, #2d6b3f 100%);
            border: 2px solid #2ecc71;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 4px 16px rgba(46, 204, 113, 0.4);
            padding: 10px 24px;
            font-family: 'Roboto', 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: bold;
            color: #2ecc71;
            letter-spacing: 1px;
            animation: sips-ok-in 0.5s ease-out forwards;
        }
        .sips-ok-notification.sips-ok-out {
            animation: sips-ok-out 0.5s ease-in forwards;
        }
        @keyframes sips-ok-in {
            0% { transform: translateX(-50%) translateY(-100%); }
            70% { transform: translateX(-50%) translateY(8px); }
            85% { transform: translateX(-50%) translateY(-3px); }
            100% { transform: translateX(-50%) translateY(0); }
        }
        @keyframes sips-ok-out {
            0% { transform: translateX(-50%) translateY(0); }
            30% { transform: translateX(-50%) translateY(8px); }
            100% { transform: translateX(-50%) translateY(-100%); }
        }
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // SHIFT TIME RANGE
    // ─────────────────────────────────────────────────────────────────────────
    function getShiftTimeRange() {
        var now = new Date();
        var hour = now.getHours();
        var startDate, endDate;

        if (hour >= 7 && hour < 15) {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);
        } else if (hour >= 15 && hour < 23) {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0, 0);
        } else {
            if (hour >= 23) {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0, 0);
                var tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                endDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 7, 0, 0);
            } else {
                var yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
            }
        }

        return {
            from: startDate.toISOString(),
            to: endDate.toISOString()
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SIPS OK NOTIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    function showSIPSOK() {
        var existing = document.getElementById('sips-ok-notification');
        if (existing) existing.remove();

        var notification = document.createElement('div');
        notification.id = 'sips-ok-notification';
        notification.className = 'sips-ok-notification';
        notification.textContent = '✅ SIPS OK ✅';
        document.body.appendChild(notification);

        // Auto-dismiss after 3 seconds with exit animation
        setTimeout(function() {
            notification.classList.add('sips-ok-out');
            setTimeout(function() {
                if (notification.parentElement) notification.remove();
            }, 500);
        }, 3000);

        console.log('[SIPS Monitor] SIPS OK shown');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ALERT DISPLAY
    // ─────────────────────────────────────────────────────────────────────────
    function showAlert(sipsItems) {
        var existing = document.getElementById('sips-alert-container');
        if (existing) existing.remove();

        alertManuallyClosed = false;
        currentAlertItems = sipsItems;

        var container = document.createElement('div');
        container.id = 'sips-alert-container';
        container.className = 'sips-alert-overlay';

        var closeBtn = document.createElement('span');
        closeBtn.className = 'sips-alert-close';
        closeBtn.textContent = '✕';
        closeBtn.onclick = function() {
            container.remove();
            alertManuallyClosed = true;
            currentAlertItems = null;
            GM_setValue('sips_dismissed', JSON.stringify(sipsItems.map(function(i) { return i.asin; })));
            console.log('[SIPS Monitor] Alert manually closed');
        };
        container.appendChild(closeBtn);

        var header = document.createElement('div');
        header.className = 'sips-alert-header';
        header.textContent = '🚨 Alerta SIPS 🚨';
        container.appendChild(header);

        sipsItems.forEach(function(item) {
            var row = document.createElement('div');
            row.className = 'sips-alert-item';

            var asinLink = document.createElement('a');
            asinLink.className = 'sips-alert-asin';
            asinLink.textContent = item.asin;
            asinLink.href = 'https://qi-fcresearch-eu.corp.amazon.com/' + FC + '/search?query=' + item.asin;
            asinLink.target = '_blank';
            asinLink.onclick = function(e) { e.stopPropagation(); };

            var units = document.createElement('span');
            units.className = 'sips-alert-units';
            units.textContent = item.units + ' uds';

            row.appendChild(asinLink);
            row.appendChild(units);
            container.appendChild(row);
        });

        document.body.appendChild(container);
        console.log('[SIPS Monitor] Alert shown with ' + sipsItems.length + ' items');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PERSISTENCE: Re-insert alert if DOM removes it
    // ─────────────────────────────────────────────────────────────────────────
    function ensureAlertPersists() {
        if (alertManuallyClosed || !currentAlertItems) return;

        var existing = document.getElementById('sips-alert-container');
        if (!existing && currentAlertItems) {
            console.log('[SIPS Monitor] Alert was removed by page, re-inserting...');
            showAlert(currentAlertItems);
        }
    }

    // Check every 2 seconds if alert was removed by the page
    setInterval(ensureAlertPersists, 2000);

    // ─────────────────────────────────────────────────────────────────────────
    // DISMISS LOGIC
    // ─────────────────────────────────────────────────────────────────────────
        function shouldShowAlert(newItems) {
        var dismissedRaw = GM_getValue('sips_dismissed', '[]');
        var dismissed = [];
        try { dismissed = JSON.parse(dismissedRaw); } catch(e) {}

        // Check if the current set of ASINs is DIFFERENT from what was dismissed
        var currentASINs = newItems.map(function(i) { return i.asin; }).sort().join(',');
        var dismissedASINs = dismissed.sort().join(',');

        // If the set is exactly the same, don't show again
        if (currentASINs === dismissedASINs) {
            return false;
        }

        // If there's any new ASIN not in dismissed, show alert
        var hasNew = newItems.some(function(item) {
            return dismissed.indexOf(item.asin) === -1;
        });

        return hasNew;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // QUERY OPENSEARCH API
    // ─────────────────────────────────────────────────────────────────────────
        function checkSIPS() {
        // Avoid multiple tabs checking at the same time
        var lastCheck = GM_getValue('sips_last_check', 0);
        if (Date.now() - lastCheck < 60000) { // If checked less than 1 min ago, skip
            console.log('[SIPS Monitor] Recently checked by another tab, skipping');
            return;
        }
        GM_setValue('sips_last_check', Date.now());
        var timeRange = getShiftTimeRange();
        console.log('[SIPS Monitor] Checking SIPS from ' + timeRange.from + ' to ' + timeRange.to);

        var queryBody = JSON.stringify({
            "size": 0,
            "query": {
                "bool": {
                    "must": [
                        {
                            "query_string": {
                                "query": "warehouse_id:" + FC,
                                "analyze_wildcard": true,
                                "time_zone": "Europe/Madrid"
                            }
                        }
                    ],
                    "filter": [
                        {
                            "bool": {
                                "should": [
                                    {
                                        "match": {
                                            "type": "STOW_SIPS_OVER_AND_SHORT"
                                        }
                                    }
                                ],
                                "minimum_should_match": 1
                            }
                        },
                        {
                            "range": {
                                "timestamp": {
                                    "gte": timeRange.from,
                                    "lte": timeRange.to,
                                    "format": "strict_date_optional_time"
                                }
                            }
                        }
                    ]
                }
            },
            "aggs": {
                "2": {
                    "terms": {
                        "field": "fnsku.keyword",
                        "order": {
                            "1": "desc"
                        },
                        "size": 10
                    },
                    "aggs": {
                        "1": {
                            "sum": {
                                "field": "quantity"
                            }
                        },
                        "3": {
                            "terms": {
                                "field": "symptoms",
                                "order": {
                                    "1": "desc"
                                },
                                "size": 4
                            },
                            "aggs": {
                                "1": {
                                    "sum": {
                                        "field": "quantity"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://moc.prod.atlas-opensearch.qubit.amazon.dev/_dashboards/api/console/proxy?path=atlas*/_search&method=POST',
            headers: {
                'Content-Type': 'application/json',
                'osd-xsrf': 'true'
            },
            data: queryBody,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        var data = JSON.parse(response.responseText);
                        var buckets = data.aggregations && data.aggregations['2'] && data.aggregations['2'].buckets;

                        if (buckets && buckets.length > 0) {
                            var alertItems = [];

                            buckets.forEach(function(bucket) {
                                var fnsku = bucket.key;
                                var totalQuantity = bucket['1'].value;

                                var symptoms = bucket['3'] && bucket['3'].buckets || [];
                                symptoms.forEach(function(symptom) {
                                    var symptomQty = symptom['1'].value;

                                    if (symptomQty > SIPS_THRESHOLD) {
                                        alertItems.push({
                                            asin: fnsku,
                                            units: Math.round(symptomQty)
                                        });
                                    }
                                });
                            });

                            // Deduplicate: keep highest per ASIN
                            var asinMap = {};
                            alertItems.forEach(function(item) {
                                if (!asinMap[item.asin] || item.units > asinMap[item.asin].units) {
                                    asinMap[item.asin] = item;
                                }
                            });

                            var processed = Object.values(asinMap);
                            processed.sort(function(a, b) { return b.units - a.units; });
                            processed = processed.slice(0, MAX_ITEMS);

                            if (processed.length > 0) {
                                console.log('[SIPS Monitor] ' + processed.length + ' top offenders above threshold');
                                GM_setValue('sips_alerts', JSON.stringify({ items: processed, timestamp: Date.now() }));

                                if (shouldShowAlert(processed)) {
                                    showAlert(processed);
                                } else {
                                    console.log('[SIPS Monitor] All ASINs already dismissed');
                                    showSIPSOK();
                                }
                            } else {
                                console.log('[SIPS Monitor] No SIPS above threshold (' + SIPS_THRESHOLD + ')');
                                GM_setValue('sips_alerts', JSON.stringify({ items: [], timestamp: Date.now() }));
                                showSIPSOK();
                            }
                        } else {
                            console.log('[SIPS Monitor] No buckets in response');
                            showSIPSOK();
                        }
                    } catch (e) {
                        console.log('[SIPS Monitor] Error parsing response: ' + e.message);
                    }
                } else {
                    console.log('[SIPS Monitor] API request failed (status: ' + response.status + ')');
                    console.log('[SIPS Monitor] Response: ' + response.responseText.substring(0, 500));
                }
            },
            onerror: function(err) {
                console.log('[SIPS Monitor] Connection error');
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CROSS-TAB SYNC
    // ─────────────────────────────────────────────────────────────────────────
    function setupCrossTabListener() {
        GM_addValueChangeListener('sips_alerts', function(name, oldValue, newValue, remote) {
            if (!remote) return;

            try {
                var data = JSON.parse(newValue);
                if (data.items && data.items.length > 0) {
                    if (shouldShowAlert(data.items)) {
                        showAlert(data.items);
                        console.log('[SIPS Monitor] Alert received from another tab');
                    }
                }
            } catch(e) {}
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST COMMANDS
    // ─────────────────────────────────────────────────────────────────────────
    unsafeWindow.testSIPSAlert = function() {
        GM_setValue('sips_dismissed', '[]');
        alertManuallyClosed = false;
        showAlert([
            { asin: 'X001R5ZQ8V', units: 450 },
            { asin: 'B00C2ICYPC', units: 320 },
            { asin: 'X0018B6JAD', units: 280 }
        ]);
    };

    unsafeWindow.testSIPSOK = function() {
        showSIPSOK();
    };

    unsafeWindow.testSIPSCheck = function() {
        GM_setValue('sips_dismissed', '[]');
        alertManuallyClosed = false;
        checkSIPS();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────────────────
    function init() {
        setupCrossTabListener();

        // Reset dismissed list every 8 hours (new shift)
        var lastReset = GM_getValue('sips_last_reset', 0);
        if (Date.now() - lastReset > 28800000) {
            GM_setValue('sips_dismissed', '[]');
            GM_setValue('sips_last_reset', Date.now());
            console.log('[SIPS Monitor] Dismissed list reset (new shift)');
        }

        // First check after 5 seconds
        setTimeout(checkSIPS, 5000);

        // Then check every 15 minutes
        setInterval(checkSIPS, CHECK_INTERVAL);

        console.log('[SIPS Monitor] Monitoring started, checking every ' + (CHECK_INTERVAL / 60000) + ' min');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
