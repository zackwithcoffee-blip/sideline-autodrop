// ==UserScript==
// @name         Aging Hunter
// @namespace    http://tampermonkey.net/
// @version      12.0
// @description  Busca contenedores en Peculiar Inventory - Reportes consolidados multi-pestaña
// @author       manacost
// @match        https://peculiar-inventory-eu.aka.corp.amazon.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        storageKey: 'AH_history_v12',
        QUANTITY_COL: 2,
        OWNER_COL: 4,
        CONTAINER_COL: 5,
        LOCATION_COL: 7,
        LOCATION_TYPE_COL: 8,
        REMOTE_LOCATION_COL: 9,
        SEARCH_TIMEOUT: 800,
        REPORT_TIMEOUT: 1500,
        REPORT_FILTERS: ['5DaysAndOlder', '3To5Days', '2To3Days'],
        filters: {
            '5DaysAndOlder': { label: '+5 días', shortLabel: '+5d', color: '#dc2626', bg: '#fef2f2' },
            '3To5Days': { label: '3-5 días', shortLabel: '3-5d', color: '#ea580c', bg: '#fff7ed' },
            '2To3Days': { label: '2-3 días', shortLabel: '2-3d', color: '#ca8a04', bg: '#fefce8' },
            '1To2Days': { label: '1-2 días', shortLabel: '1-2d', color: '#16a34a', bg: '#f0fdf4' },
            'halfTo1Day': { label: '0-1 día', shortLabel: '0-1d', color: '#16a34a', bg: '#f0fdf4' }
        }
    };

    const channel = new BroadcastChannel('AH-v12');
    const tabId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    let pendingSearch = null;
    let pendingReport = null;

    GM_addStyle(`
        :root {
            --AH-accent: #ea580c;
            --AH-accent-hover: #c2410c;
            --AH-accent-light: #fff7ed;
            --AH-bg: #ffffff;
            --AH-border: #e5e5e5;
            --AH-text: #171717;
            --AH-text-secondary: #737373;
            --AH-text-muted: #a3a3a3;
            --AH-success: #16a34a;
            --AH-error: #dc2626;
            --AH-warning: #ca8a04;
        }

        #AH-popup *, #AH-fab *, #AH-report-modal * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        #AH-fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 48px;
            height: 48px;
            border: none;
            background: var(--AH-accent);
            color: white;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            z-index: 2147483647;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transition: transform 0.1s, box-shadow 0.1s, background 0.1s;
        }
        #AH-fab:hover { background: var(--AH-accent-hover); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        #AH-fab:active { transform: scale(0.95); }

        #AH-fab-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 18px;
            height: 18px;
            background: var(--AH-error);
            color: white;
            font-size: 10px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
        }
        #AH-fab-badge:empty { display: none; }

        #AH-popup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 520px;
            background: var(--AH-bg);
            border: 1px solid var(--AH-border);
            z-index: 2147483647;
            color: var(--AH-text);
            display: none;
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
        }
        #AH-popup.visible { display: block; }
        #AH-popup.minimized #AH-body { display: none; }
        #AH-popup.minimized {
            top: auto; bottom: 80px; left: auto; right: 24px;
            transform: none; width: 240px;
        }

        #AH-header {
            padding: 12px 16px;
            background: var(--AH-accent);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #AH-header-left { display: flex; align-items: center; gap: 12px; }
        #AH-title { font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
        #AH-filter-badge {
            font-size: 11px;
            background: rgba(255,255,255,0.2);
            padding: 3px 8px;
            font-weight: 500;
        }

        #AH-header-btns { display: flex; gap: 4px; }
        .AH-hbtn {
            width: 28px;
            height: 28px;
            border: none;
            background: rgba(255,255,255,0.1);
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.1s;
        }
        .AH-hbtn:hover { background: rgba(255,255,255,0.2); }
        .AH-hbtn:active { background: rgba(255,255,255,0.3); }

        #AH-tabs { display: flex; border-bottom: 1px solid var(--AH-border); }
        .AH-tab {
            flex: 1;
            padding: 12px 16px;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            font-size: 12px;
            font-weight: 500;
            color: var(--AH-text-secondary);
            cursor: pointer;
            transition: all 0.1s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .AH-tab:hover { color: var(--AH-text); background: #fafafa; }
        .AH-tab:active { background: #f5f5f5; }
        .AH-tab.active {
            color: var(--AH-accent);
            border-bottom-color: var(--AH-accent);
            background: var(--AH-bg);
        }
        .AH-tab-count {
            background: var(--AH-border);
            color: var(--AH-text-secondary);
            font-size: 10px;
            padding: 2px 6px;
            margin-left: 6px;
            font-weight: 600;
        }
        .AH-tab.active .AH-tab-count { background: var(--AH-accent-light); color: var(--AH-accent); }

        .AH-tab-content { display: none; }
        .AH-tab-content.active { display: block; }

        #AH-search { padding: 16px; border-bottom: 1px solid var(--AH-border); }
        #AH-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
        #AH-input {
            flex: 1;
            height: 40px;
            padding: 0 12px;
            border: 1px solid var(--AH-border);
            font-size: 13px;
            font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
            letter-spacing: 1px;
            color: var(--AH-text);
            background: var(--AH-bg);
            outline: none;
            transition: border-color 0.1s, box-shadow 0.1s;
        }
        #AH-input:focus {
            border-color: var(--AH-accent);
            box-shadow: 0 0 0 3px var(--AH-accent-light);
        }
        #AH-input::placeholder {
            color: var(--AH-text-muted);
            font-family: inherit;
            letter-spacing: normal;
        }

        #AH-btn {
            height: 40px;
            padding: 0 20px;
            border: none;
            background: var(--AH-accent);
            color: white;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: background 0.1s, transform 0.1s;
        }
        #AH-btn:hover:not(:disabled) { background: var(--AH-accent-hover); }
        #AH-btn:active:not(:disabled) { transform: scale(0.98); }
        #AH-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        #AH-options {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        #AH-options label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--AH-text-secondary);
            cursor: pointer;
            padding: 4px 8px;
            margin: -4px -8px;
            transition: background 0.1s;
        }
        #AH-options label:hover { background: #fafafa; }
        #AH-options input[type="checkbox"] {
            width: 14px;
            height: 14px;
            accent-color: var(--AH-accent);
            cursor: pointer;
        }
        #AH-tabs-info { font-size: 11px; color: var(--AH-text-muted); }
        #AH-tabs-info strong { color: var(--AH-accent); }

        #AH-status {
            padding: 10px 16px;
            font-size: 12px;
            color: var(--AH-text-secondary);
            background: #fafafa;
            border-bottom: 1px solid var(--AH-border);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #AH-status.found { background: #f0fdf4; color: var(--AH-success); }
        #AH-status.notfound { background: #fef2f2; color: var(--AH-error); }
        #AH-status.searching { background: #fffbeb; color: var(--AH-warning); }
        #AH-status-icon { font-size: 14px; width: 20px; text-align: center; }

        #AH-results-wrap { max-height: 280px; overflow-y: auto; }
        #AH-results-wrap::-webkit-scrollbar { width: 6px; }
        #AH-results-wrap::-webkit-scrollbar-track { background: #fafafa; }
        #AH-results-wrap::-webkit-scrollbar-thumb { background: #d4d4d4; }

        .AH-row {
            display: grid;
            grid-template-columns: 130px 1fr 80px 50px;
            gap: 8px;
            padding: 10px 16px;
            border-bottom: 1px solid #f5f5f5;
            align-items: center;
            font-size: 12px;
            transition: background 0.1s;
        }
        .AH-row:last-child { border-bottom: none; }
        .AH-row:hover { background: #fafafa; }
        .AH-row.r-5days { background: #fef2f2; }
        .AH-row.r-5days:hover { background: #fee2e2; }
        .AH-row.r-3to5 { background: #fff7ed; }
        .AH-row.r-3to5:hover { background: #ffedd5; }
        .AH-row.r-2to3 { background: #fefce8; }
        .AH-row.r-2to3:hover { background: #fef9c3; }
        .AH-row.r-green { background: #f0fdf4; }
        .AH-row.r-green:hover { background: #dAHce7; }
        .AH-row.r-notfound { background: #fafafa; }
        .AH-row.r-notfound * { color: var(--AH-text-muted) !important; }

        .AH-col-container {
            font-family: 'SF Mono', 'Consolas', monospace;
            font-weight: 600;
            font-size: 11px;
            letter-spacing: 0.3px;
            color: var(--AH-text);
        }
        .AH-col-owner { font-size: 11px; }
        .AH-owner-tag {
            display: inline-block;
            padding: 2px 6px;
            background: #e5e5e5;
            color: var(--AH-text-secondary);
            font-weight: 500;
            font-size: 9px;
        }
        .AH-row.r-5days .AH-owner-tag { background: #fecaca; color: #991b1b; }
        .AH-row.r-3to5 .AH-owner-tag { background: #fed7aa; color: #9a3412; }
        .AH-row.r-2to3 .AH-owner-tag { background: #fef08a; color: #854d0e; }
        .AH-row.r-green .AH-owner-tag { background: #bbf7d0; color: #166534; }

        .AH-col-badge { text-align: center; }
        .AH-badge {
            display: inline-block;
            padding: 4px 6px;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: white;
        }
        .AH-badge.b-5days { background: #dc2626; }
        .AH-badge.b-3to5 { background: #ea580c; }
        .AH-badge.b-2to3 { background: #ca8a04; }
        .AH-badge.b-green { background: #16a34a; }
        .AH-badge.b-notfound { background: #a3a3a3; }

        .AH-col-time {
            font-size: 10px;
            color: var(--AH-text-muted);
            text-align: right;
            font-variant-numeric: tabular-nums;
        }

        #AH-empty {
            padding: 40px 16px;
            text-align: center;
            color: var(--AH-text-muted);
            font-size: 12px;
        }

        #AH-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            background: var(--AH-border);
            border-bottom: 1px solid var(--AH-border);
        }
        .AH-stat { padding: 16px; text-align: center; background: var(--AH-bg); }
        .AH-stat-val { font-size: 24px; font-weight: 700; color: var(--AH-text); }
        .AH-stat-val.green { color: var(--AH-success); }
        .AH-stat-val.red { color: var(--AH-error); }
        .AH-stat-label {
            font-size: 10px;
            color: var(--AH-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
        }

        #AH-footer {
            padding: 12px 16px;
            background: #fafafa;
            border-top: 1px solid var(--AH-border);
            display: flex;
            justify-content: space-between;
            gap: 8px;
            flex-wrap: wrap;
        }
        .AH-fbtn {
            padding: 8px 12px;
            border: 1px solid var(--AH-border);
            background: var(--AH-bg);
            color: var(--AH-text-secondary);
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.1s;
        }
        .AH-fbtn:hover { background: #f5f5f5; color: var(--AH-text); border-color: #d4d4d4; }
        .AH-fbtn:active { background: #e5e5e5; transform: scale(0.98); }
        .AH-fbtn.primary { background: var(--AH-accent); color: white; border-color: var(--AH-accent); }
        .AH-fbtn.primary:hover { background: var(--AH-accent-hover); border-color: var(--AH-accent-hover); }
        .AH-fbtn.info { background: #3b82f6; color: white; border-color: #3b82f6; }
        .AH-fbtn.info:hover { background: #2563eb; border-color: #2563eb; }
        .AH-fbtn.success { background: #16a34a; color: white; border-color: #16a34a; }
        .AH-fbtn.success:hover { background: #15803d; border-color: #15803d; }
        .AH-fbtn.danger { color: var(--AH-error); border-color: #fecaca; }
        .AH-fbtn.danger:hover { background: #fef2f2; }
        #AH-footer-left, #AH-footer-right { display: flex; gap: 8px; flex-wrap: wrap; }

        #AH-indicator {
            position: fixed;
            bottom: 24px;
            left: 24px;
            background: var(--AH-bg);
            border: 1px solid var(--AH-border);
            padding: 8px 12px;
            font-size: 11px;
            color: var(--AH-text-secondary);
            z-index: 2147483646;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #AH-indicator-dot {
            width: 6px;
            height: 6px;
            background: var(--AH-success);
            animation: AHPulse 2s infinite;
        }
        @keyframes AHPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        .AH-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid var(--AH-border);
            border-top-color: var(--AH-accent);
            animation: AHSpin 0.5s linear infinite;
            display: inline-block;
        }
        @keyframes AHSpin { to { transform: rotate(360deg); } }

        #AH-report-modal {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2147483648;
            display: none;
            align-items: center;
            justify-content: center;
        }
        #AH-report-modal.visible { display: flex; }

        #AH-report-content {
            background: var(--AH-bg);
            width: 1100px;
            max-width: 95vw;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            position: relative;
        }

        #AH-report-header {
            padding: 16px 20px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #AH-report-header.start-shift { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); }
        #AH-report-header.end-shift { background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); }
        #AH-report-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        #AH-report-subtitle { font-size: 11px; opacity: 0.8; margin-top: 2px; }
        #AH-report-close {
            width: 28px; height: 28px; border: none;
            background: rgba(255,255,255,0.1);
            color: white; cursor: pointer; font-size: 16px;
            transition: background 0.1s;
        }
        #AH-report-close:hover { background: rgba(255,255,255,0.2); }

        #AH-report-body { flex: 1; overflow-y: auto; padding: 0; }

        .AH-report-section { border-bottom: 1px solid var(--AH-border); }
        .AH-report-section:last-child { border-bottom: none; }
        .AH-report-section-title {
            padding: 12px 20px;
            background: #f8fafc;
            font-size: 12px;
            font-weight: 600;
            color: var(--AH-text);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .AH-tabs-status {
            padding: 12px 20px;
            background: #fffbeb;
            border-bottom: 1px solid #fef3c7;
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
        }
        .AH-tabs-status.all-ok { background: #f0fdf4; border-bottom-color: #bbf7d0; }
        .AH-tabs-status-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--AH-text-secondary);
            text-transform: uppercase;
        }
        .AH-tab-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            padding: 4px 8px;
            background: white;
            border: 1px solid var(--AH-border);
        }
        .AH-tab-indicator.active { background: #f0fdf4; border-color: #bbf7d0; color: var(--AH-success); }
        .AH-tab-indicator.missing { background: #fef2f2; border-color: #fecaca; color: var(--AH-error); }
        .AH-tab-dot { width: 8px; height: 8px; border-radius: 50%; background: #d4d4d4; }
        .AH-tab-indicator.active .AH-tab-dot { background: var(--AH-success); }
        .AH-tab-indicator.missing .AH-tab-dot { background: var(--AH-error); }

        #AH-report-performance {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1px;
            background: var(--AH-border);
        }
        .AH-perf-stat { padding: 16px; text-align: center; background: var(--AH-bg); }
        .AH-perf-val { font-size: 24px; font-weight: 700; color: var(--AH-text); }
        .AH-perf-val.blue { color: #3b82f6; }
        .AH-perf-val.green { color: var(--AH-success); }
        .AH-perf-val.red { color: var(--AH-error); }
        .AH-perf-val.orange { color: var(--AH-accent); }
        .AH-perf-label {
            font-size: 9px;
            color: var(--AH-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
        }

        #AH-report-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        #AH-report-table th {
            padding: 10px 8px;
            text-align: left;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--AH-text-muted);
            background: #fafafa;
            border-bottom: 1px solid var(--AH-border);
            position: sticky;
            top: 0;
            white-space: nowrap;
        }
        #AH-report-table th.num { text-align: right; }
        #AH-report-table th.col-5days { background: #fef2f2; color: #991b1b; }
        #AH-report-table th.col-3to5 { background: #fff7ed; color: #9a3412; }
        #AH-report-table th.col-2to3 { background: #fefce8; color: #854d0e; }
        #AH-report-table th.col-total { background: #f0f9ff; color: #1e40af; }

        #AH-report-table td {
            padding: 8px;
            border-bottom: 1px solid #f5f5f5;
            white-space: nowrap;
        }
        #AH-report-table td.num {
            text-align: right;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
        }
        #AH-report-table td.col-5days { background: #fef2f2; }
        #AH-report-table td.col-3to5 { background: #fff7ed; }
        #AH-report-table td.col-2to3 { background: #fefce8; }
        #AH-report-table td.col-total { background: #f0f9ff; font-weight: 700; }
        #AH-report-table td.na { color: var(--AH-text-muted); font-style: italic; }
        #AH-report-table tr:hover td { filter: brightness(0.97); }
        #AH-report-table tr.total-row td {
            background: #1e293b !important;
            color: white;
            font-weight: 700;
            border-top: 2px solid #1e293b;
        }

        .AH-loc-name { font-weight: 500; color: var(--AH-text); }
        .AH-loc-empty { color: var(--AH-text-muted); font-style: italic; }
        .AH-loc-type { color: var(--AH-text-secondary); font-size: 10px; }

        #AH-report-preview {
            background: #1e293b;
            color: #e2e8f0;
            padding: 16px;
            font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
            font-size: 10px;
            line-height: 1.4;
            white-space: pre;
            overflow-x: auto;
            max-height: 500px;
        }

        #AH-report-footer {
            padding: 12px 20px;
            background: #fafafa;
            border-top: 1px solid var(--AH-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        }
        #AH-copy-status { font-size: 12px; color: var(--AH-success); opacity: 0; transition: opacity 0.2s; }
        #AH-copy-status.visible { opacity: 1; }
        #AH-report-footer-btns { display: flex; gap: 8px; }

        #AH-report-tabs {
            display: flex;
            border-bottom: 1px solid var(--AH-border);
            background: #fafafa;
        }
        .AH-report-tab {
            flex: 1;
            padding: 10px 16px;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            font-size: 11px;
            font-weight: 500;
            color: var(--AH-text-secondary);
            cursor: pointer;
            transition: all 0.1s;
            text-transform: uppercase;
        }
        .AH-report-tab:hover { color: var(--AH-text); background: #f5f5f5; }
        .AH-report-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; background: white; }

        .AH-report-tab-content { display: none; }
        .AH-report-tab-content.active { display: block; }

        #AH-report-loading {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            z-index: 10;
        }
        #AH-report-loading.hidden { display: none; }
        #AH-report-loading-text { font-size: 13px; color: var(--AH-text-secondary); }
        .AH-spinner-large {
            width: 32px; height: 32px;
            border: 3px solid var(--AH-border);
            border-top-color: var(--AH-accent);
            border-radius: 50%;
            animation: AHSpin 0.6s linear infinite;
        }
    `);
        class ContainerFinder {
        constructor() {
            this.history = this.loadHistory();
            this.session = [];
            this.searching = false;
            this.onlyUnowned = true;
            this.minimized = false;
            this.connectedTabs = new Map();
            this.currentReportText = '';
            this.init();
        }

        loadHistory() {
            try {
                const data = GM_getValue(CONFIG.storageKey, '[]');
                const arr = JSON.parse(data);
                const today = new Date().toDateString();
                return arr.filter(e => new Date(e.ts).toDateString() === today);
            } catch { return []; }
        }

        saveHistory() {
            GM_setValue(CONFIG.storageKey, JSON.stringify(this.history));
            this.updateUI();
        }

        getCurrentFilter() {
            const m = window.location.href.match(/filter=([^&]+)/);
            return m ? m[1] : null;
        }

        getFilterInfo(id) {
            return CONFIG.filters[id] || { label: id || 'N/A', shortLabel: id || 'N/A', color: '#737373', bg: '#fafafa' };
        }

        init() {
            this.createUI();
            this.bindEvents();
            this.setupChannel();
            this.addIndicator();
        }

        setupChannel() {
            channel.onmessage = (e) => {
                const { type, from, data, searchId, reportId } = e.data;

                if (type === 'PING' && from !== tabId) {
                    channel.postMessage({ type: 'PONG', from: tabId, data: { filter: this.getCurrentFilter() } });
                }

                if (type === 'PONG' && from !== tabId) {
                    this.connectedTabs.set(from, data.filter);
                    this.updateTabsCount();
                }

                if (type === 'SEARCH' && from !== tabId) {
                    const result = this.searchDOM(data.container, data.onlyUnowned);
                    channel.postMessage({
                        type: 'RESULT', searchId, from: tabId,
                        data: { found: result.found, owner: result.owner, filter: this.getCurrentFilter() }
                    });
                }

                if (type === 'RESULT' && pendingSearch?.id === searchId) {
                    if (data.found && !pendingSearch.resolved) {
                        pendingSearch.resolved = true;
                        pendingSearch.resolve(data);
                    } else {
                        pendingSearch.responses++;
                        if (pendingSearch.responses >= this.connectedTabs.size && !pendingSearch.resolved) {
                            pendingSearch.resolved = true;
                            pendingSearch.resolve({ found: false });
                        }
                    }
                }

                if (type === 'REPORT_REQUEST' && from !== tabId) {
                    const filter = this.getCurrentFilter();
                    const tableData = this.readCurrentTable();
                    channel.postMessage({ type: 'REPORT_DATA', reportId, from: tabId, data: { filter, tableData } });
                }

                if (type === 'REPORT_DATA' && pendingReport?.id === reportId) {
                    pendingReport.responses.push({ tabId: from, filter: data.filter, tableData: data.tableData });
                }
            };

            channel.postMessage({ type: 'PING', from: tabId });
            setInterval(() => {
                this.connectedTabs.clear();
                channel.postMessage({ type: 'PING', from: tabId });
            }, 10000);
        }

        updateTabsCount() {
            const el = document.getElementById('AH-tabs-count');
            if (el) el.textContent = this.connectedTabs.size + 1;
        }

        addIndicator() {
            const filter = this.getCurrentFilter();
            if (!filter) return;
            const div = document.createElement('div');
            div.id = 'AH-indicator';
            div.innerHTML = `<div id="AH-indicator-dot"></div>AH: ${this.getFilterInfo(filter).label}`;
            document.body.appendChild(div);
        }

        createUI() {
            const fab = document.createElement('button');
            fab.id = 'AH-fab';
            const foundCount = this.history.filter(e => e.found).length;
            fab.innerHTML = `AH<span id="AH-fab-badge">${foundCount || ''}</span>`;
            document.body.appendChild(fab);

            const filter = this.getCurrentFilter();
            const filterBadge = filter ? `<span id="AH-filter-badge">${this.getFilterInfo(filter).label}</span>` : '';

            const popup = document.createElement('div');
            popup.id = 'AH-popup';
            popup.innerHTML = `
                <div id="AH-header">
                    <div id="AH-header-left">
                        <span id="AH-title">AGING HUNTER</span>
                        ${filterBadge}
                    </div>
                    <div id="AH-header-btns">
                        <button class="AH-hbtn" id="AH-min" title="Minimizar">−</button>
                        <button class="AH-hbtn" id="AH-close" title="Cerrar">×</button>
                    </div>
                </div>
                <div id="AH-body">
                    <div id="AH-tabs">
                        <button class="AH-tab active" data-tab="search">Buscar</button>
                        <button class="AH-tab" data-tab="history">Historial<span class="AH-tab-count" id="AH-hist-count">${this.history.length}</span></button>
                    </div>
                    <div class="AH-tab-content active" id="AH-tab-search">
                        <div id="AH-search">
                            <div id="AH-input-row">
                                <input type="text" id="AH-input" placeholder="ID del contenedor" autocomplete="off" spellcheck="false">
                                <button id="AH-btn">BUSCAR</button>
                            </div>
                            <div id="AH-options">
                                <label><input type="checkbox" id="AH-unowned" checked> Solo UNOWNED</label>
                                <span id="AH-tabs-info"><strong id="AH-tabs-count">1</strong> pestañas</span>
                            </div>
                        </div>
                        <div id="AH-status">
                            <span id="AH-status-icon">i</span>
                            <span id="AH-status-text">Listo para buscar</span>
                        </div>
                        <div id="AH-results-wrap"><div id="AH-results"></div></div>
                    </div>
                    <div class="AH-tab-content" id="AH-tab-history">
                        <div id="AH-stats">
                            <div class="AH-stat"><div class="AH-stat-val" id="AH-s-total">${this.history.length}</div><div class="AH-stat-label">Total</div></div>
                            <div class="AH-stat"><div class="AH-stat-val green" id="AH-s-found">${this.history.filter(e=>e.found).length}</div><div class="AH-stat-label">Encontrados</div></div>
                            <div class="AH-stat"><div class="AH-stat-val red" id="AH-s-notfound">${this.history.filter(e=>!e.found).length}</div><div class="AH-stat-label">No encontrados</div></div>
                        </div>
                        <div id="AH-results-wrap"><div id="AH-history"></div></div>
                    </div>
                </div>
                <div id="AH-footer">
                    <div id="AH-footer-left">
                        <button class="AH-fbtn success" id="AH-start-shift">📸 Inicio Turno</button>
                        <button class="AH-fbtn info" id="AH-end-shift">📊 Fin Turno</button>
                    </div>
                    <div id="AH-footer-right">
                        <button class="AH-fbtn primary" id="AH-export">CSV</button>
                        <button class="AH-fbtn danger" id="AH-clear-all">Borrar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);

            const modal = document.createElement('div');
            modal.id = 'AH-report-modal';
            modal.innerHTML = `
                <div id="AH-report-content">
                    <div id="AH-report-header">
                        <div>
                            <div id="AH-report-title">📊 Reporte</div>
                            <div id="AH-report-subtitle">Consolidado multi-pestaña</div>
                        </div>
                        <button id="AH-report-close">×</button>
                    </div>
                    <div id="AH-report-tabs">
                        <button class="AH-report-tab active" data-rtab="visual">📋 Visual</button>
                        <button class="AH-report-tab" data-rtab="text">📝 Texto (Slack)</button>
                    </div>
                    <div id="AH-report-body">
                        <div id="AH-report-loading">
                            <div class="AH-spinner-large"></div>
                            <div id="AH-report-loading-text">Recopilando datos de todas las pestañas...</div>
                        </div>
                        <div class="AH-report-tab-content active" id="AH-rtab-visual"></div>
                        <div class="AH-report-tab-content" id="AH-rtab-text">
                            <pre id="AH-report-preview"></pre>
                        </div>
                    </div>
                    <div id="AH-report-footer">
                        <span id="AH-copy-status">✓ Copiado al portapapeles</span>
                        <div id="AH-report-footer-btns">
                            <button class="AH-fbtn" id="AH-report-csv">Exportar CSV</button>
                            <button class="AH-fbtn info" id="AH-report-copy">📋 Copiar para Slack</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            this.renderResults();
            this.renderHistory();
        }

        bindEvents() {
            const $ = id => document.getElementById(id);
            $('AH-fab').onclick = () => this.toggle();
            $('AH-close').onclick = () => this.toggle(false);
            $('AH-min').onclick = () => this.toggleMin();
            $('AH-btn').onclick = () => this.search();
            $('AH-input').onkeydown = e => { if (e.key === 'Enter') this.search(); };
            $('AH-unowned').onchange = e => { this.onlyUnowned = e.target.checked; };
            $('AH-export').onclick = () => this.export();
            $('AH-start-shift').onclick = () => this.showReport('start');
            $('AH-end-shift').onclick = () => this.showReport('end');
            $('AH-clear-all').onclick = () => this.clearAll();
            $('AH-report-close').onclick = () => this.closeReport();
            $('AH-report-copy').onclick = () => this.copyReportToClipboard();
            $('AH-report-csv').onclick = () => this.exportReportCSV();
            $('AH-report-modal').onclick = (e) => { if (e.target.id === 'AH-report-modal') this.closeReport(); };

            document.querySelectorAll('.AH-report-tab').forEach(t => {
                t.onclick = () => this.switchReportTab(t.dataset.rtab);
            });
            document.querySelectorAll('.AH-tab').forEach(t => {
                t.onclick = () => this.switchTab(t.dataset.tab);
            });
            document.onkeydown = e => {
                if (e.key === 'F2') { e.preventDefault(); this.toggle(); }
                if (e.key === 'Escape') { this.closeReport(); this.toggle(false); }
            };
        }

        toggle(show = null) {
            const popup = document.getElementById('AH-popup');
            const visible = show ?? !popup.classList.contains('visible');
            popup.classList.toggle('visible', visible);
            if (visible) {
                popup.classList.remove('minimized');
                this.minimized = false;
                setTimeout(() => document.getElementById('AH-input').focus(), 50);
            }
        }

        toggleMin() {
            const popup = document.getElementById('AH-popup');
            this.minimized = !this.minimized;
            popup.classList.toggle('minimized', this.minimized);
        }

        switchTab(tab) {
            document.querySelectorAll('.AH-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
            document.querySelectorAll('.AH-tab-content').forEach(c => c.classList.toggle('active', c.id === `AH-tab-${tab}`));
            if (tab === 'history') this.renderHistory();
        }

        switchReportTab(tab) {
            document.querySelectorAll('.AH-report-tab').forEach(t => t.classList.toggle('active', t.dataset.rtab === tab));
            document.querySelectorAll('.AH-report-tab-content').forEach(c => c.classList.toggle('active', c.id === `AH-rtab-${tab}`));
        }

        setStatus(text, type = '', icon = 'i') {
            document.getElementById('AH-status').className = type;
            document.getElementById('AH-status-text').textContent = text;
            document.getElementById('AH-status-icon').textContent = icon;
        }

        async search() {
            const input = document.getElementById('AH-input');
            const container = input.value.trim();
            if (!container) { this.setStatus('Introduce un ID de contenedor', 'notfound', '!'); return; }
            if (this.searching) return;
            this.searching = true;

            const btn = document.getElementById('AH-btn');
            btn.disabled = true;
            btn.innerHTML = '<span class="AH-spinner"></span>';
            this.setStatus('Buscando...', 'searching', '...');

            const startTime = performance.now();
            let result = { found: false, filter: null, owner: null };

            try {
                const local = this.searchDOM(container, this.onlyUnowned);
                if (local.found) {
                    const f = this.getCurrentFilter();
                    result = { found: true, filter: f, filterLabel: this.getFilterInfo(f).label, owner: local.owner };
                } else if (this.connectedTabs.size > 0) {
                    const remote = await this.searchRemote(container);
                    if (remote.found) {
                        result = { found: true, filter: remote.filter, filterLabel: this.getFilterInfo(remote.filter).label, owner: remote.owner };
                    }
                }

                const elapsed = Math.round(performance.now() - startTime);
                this.addResult(container, result);

                if (result.found) {
                    this.setStatus(`Encontrado: ${result.filterLabel} | ${result.owner} (${elapsed}ms)`, 'found', '✓');
                } else {
                    const hint = this.onlyUnowned ? ' (solo UNOWNED)' : '';
                    this.setStatus(`No encontrado${hint} (${elapsed}ms)`, 'notfound', '✗');
                }
            } catch (err) {
                this.setStatus('Error: ' + err.message, 'notfound', '!');
            } finally {
                this.searching = false;
                btn.disabled = false;
                btn.textContent = 'BUSCAR';
                input.value = '';
                input.focus();
            }
        }

        searchDOM(container, onlyUnowned = false) {
            const term = container.toLowerCase();
            const table = document.querySelector('table');
            if (!table) return { found: false };

            const rows = table.querySelectorAll('tbody tr');
            for (let i = 0; i < rows.length; i++) {
                const cells = rows[i].cells;
                if (cells.length <= CONFIG.CONTAINER_COL) continue;

                const cell = cells[CONFIG.CONTAINER_COL];
                const link = cell.querySelector('a');
                const text = (link?.textContent || cell.textContent).trim().toLowerCase();

                if (text === term) {
                    const owner = cells[CONFIG.OWNER_COL]?.textContent.trim() || '';
                    if (onlyUnowned && owner !== 'UNOWNED') continue;

                    rows[i].style.outline = '2px solid var(--AH-accent)';
                    setTimeout(() => { rows[i].style.outline = ''; }, 1500);
                    return { found: true, owner };
                }
            }
            return { found: false };
        }

        searchRemote(container) {
            return new Promise((resolve) => {
                const searchId = `s_${Date.now()}`;
                pendingSearch = {
                    id: searchId, responses: 0, resolved: false,
                    resolve: (data) => { pendingSearch = null; resolve(data); }
                };
                channel.postMessage({ type: 'SEARCH', searchId, from: tabId, data: { container, onlyUnowned: this.onlyUnowned } });
                setTimeout(() => {
                    if (!pendingSearch?.resolved) { pendingSearch.resolved = true; pendingSearch.resolve({ found: false }); }
                }, CONFIG.SEARCH_TIMEOUT);
            });
        }

        readCurrentTable() {
            const table = document.querySelector('table');
            if (!table) return [];

            const rows = table.querySelectorAll('tbody tr');
            const data = [];
            const maxCol = Math.max(CONFIG.CONTAINER_COL, CONFIG.LOCATION_COL, CONFIG.QUANTITY_COL, CONFIG.LOCATION_TYPE_COL, CONFIG.REMOTE_LOCATION_COL);

            for (let i = 0; i < rows.length; i++) {
                const cells = rows[i].cells;
                if (cells.length <= maxCol) continue;

                const owner = cells[CONFIG.OWNER_COL]?.textContent.trim() || '';
                if (owner !== 'UNOWNED') continue;

                const containerCell = cells[CONFIG.CONTAINER_COL];
                const containerLink = containerCell.querySelector('a');
                const container = (containerLink?.textContent || containerCell.textContent).trim();

                const location = cells[CONFIG.LOCATION_COL]?.textContent.trim() || '';
                const locationType = cells[CONFIG.LOCATION_TYPE_COL]?.textContent.trim() || '';
                const remoteLocation = cells[CONFIG.REMOTE_LOCATION_COL]?.textContent.trim() || '';
                const quantityText = cells[CONFIG.QUANTITY_COL]?.textContent.trim() || '0';
                const quantity = parseInt(quantityText.replace(/[^0-9]/g, ''), 10) || 0;

                if (container) {
                    data.push({ container, location, locationType, remoteLocation, quantity });
                }
            }
            return data;
        }

        async gatherAllTabsData() {
            return new Promise((resolve) => {
                const reportId = `r_${Date.now()}`;
                const localFilter = this.getCurrentFilter();
                const localData = this.readCurrentTable();

                pendingReport = { id: reportId, responses: [] };
                pendingReport.responses.push({ tabId: tabId, filter: localFilter, tableData: localData });

                channel.postMessage({ type: 'REPORT_REQUEST', reportId, from: tabId });

                setTimeout(() => {
                    const result = pendingReport.responses;
                    pendingReport = null;
                    resolve(result);
                }, CONFIG.REPORT_TIMEOUT);
            });
        }

        processReportData(allTabsData) {
            const availableFilters = {};
            CONFIG.REPORT_FILTERS.forEach(f => { availableFilters[f] = false; });

            const grouped = {};

            allTabsData.forEach(tabData => {
                const filter = tabData.filter;
                if (CONFIG.REPORT_FILTERS.includes(filter)) {
                    availableFilters[filter] = true;
                }

                tabData.tableData.forEach(item => {
                    const loc = item.location || '(Sin ubicación)';
                    if (!grouped[loc]) {
                        grouped[loc] = {
                            location: loc,
                            containers: new Set(),
                            locationTypes: {},
                            remoteLocations: {},
                            unitsByFilter: {},
                            totalUnits: 0
                        };
                        CONFIG.REPORT_FILTERS.forEach(f => { grouped[loc].unitsByFilter[f] = null; });
                    }

                    grouped[loc].containers.add(item.container);

                    const lt = item.locationType || '(N/A)';
                    grouped[loc].locationTypes[lt] = (grouped[loc].locationTypes[lt] || 0) + 1;

                    const rl = item.remoteLocation || '(N/A)';
                    grouped[loc].remoteLocations[rl] = (grouped[loc].remoteLocations[rl] || 0) + 1;

                    if (CONFIG.REPORT_FILTERS.includes(filter)) {
                        if (grouped[loc].unitsByFilter[filter] === null) {
                            grouped[loc].unitsByFilter[filter] = 0;
                        }
                        grouped[loc].unitsByFilter[filter] += item.quantity;
                    }
                    grouped[loc].totalUnits += item.quantity;
                });
            });

            Object.values(grouped).forEach(g => {
                CONFIG.REPORT_FILTERS.forEach(f => {
                    if (availableFilters[f] && g.unitsByFilter[f] === null) {
                        g.unitsByFilter[f] = 0;
                    }
                });
            });

            const getMostFrequent = (obj) => {
                let maxCount = 0, mostFrequent = '(N/A)';
                for (const [key, count] of Object.entries(obj)) {
                    if (count > maxCount) { maxCount = count; mostFrequent = key; }
                }
                return mostFrequent;
            };

            const result = Object.values(grouped).map(g => ({
                location: g.location,
                uniqueContainers: g.containers.size,
                locationType: getMostFrequent(g.locationTypes),
                remoteLocation: getMostFrequent(g.remoteLocations),
                unitsByFilter: g.unitsByFilter,
                totalUnits: g.totalUnits
            }));

            result.sort((a, b) => {
                const aVal = a.unitsByFilter['5DaysAndOlder'];
                const bVal = b.unitsByFilter['5DaysAndOlder'];
                if (aVal === null && bVal === null) return 0;
                if (aVal === null) return 1;
                if (bVal === null) return -1;
                return bVal - aVal;
            });

            return { locationData: result, availableFilters };
        }
                    async showReport(type) {
            document.getElementById('AH-report-modal').classList.add('visible');
            document.getElementById('AH-report-loading').classList.remove('hidden');

            const header = document.getElementById('AH-report-header');
            const title = document.getElementById('AH-report-title');
            header.className = type === 'start' ? 'start-shift' : 'end-shift';
            title.textContent = type === 'start' ? '📸 Reporte Inicio de Turno' : '📊 Reporte Fin de Turno';

            const allTabsData = await this.gatherAllTabsData();
            const { locationData, availableFilters } = this.processReportData(allTabsData);

            const now = new Date();
            const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            const totalContainers = locationData.reduce((sum, d) => sum + d.uniqueContainers, 0);
            const totalUnits = locationData.reduce((sum, d) => sum + d.totalUnits, 0);
            const totalsByFilter = {};
            CONFIG.REPORT_FILTERS.forEach(f => {
                totalsByFilter[f] = locationData.reduce((sum, d) => {
                    const val = d.unitsByFilter[f];
                    return sum + (val !== null ? val : 0);
                }, 0);
            });

            const scanned = this.history.length;
            const found = this.history.filter(e => e.found).length;
            const notFound = scanned - found;
            const ratio = scanned > 0 ? ((found / scanned) * 100).toFixed(1) : '0.0';

            document.getElementById('AH-report-loading').classList.add('hidden');

            let visualHTML = '';
            const allFiltersAvailable = CONFIG.REPORT_FILTERS.every(f => availableFilters[f]);

            visualHTML += `
                <div class="AH-tabs-status ${allFiltersAvailable ? 'all-ok' : ''}">
                    <span class="AH-tabs-status-title">Pestañas detectadas:</span>
                    ${CONFIG.REPORT_FILTERS.map(f => {
                        const info = this.getFilterInfo(f);
                        const isActive = availableFilters[f];
                        return `<span class="AH-tab-indicator ${isActive ? 'active' : 'missing'}"><span class="AH-tab-dot"></span>${info.label}</span>`;
                    }).join('')}
                </div>
            `;

            if (type === 'end') {
                visualHTML += `
                    <div class="AH-report-section">
                        <div class="AH-report-section-title">📈 Performance del Día</div>
                        <div id="AH-report-performance">
                            <div class="AH-perf-stat"><div class="AH-perf-val blue">${scanned}</div><div class="AH-perf-label">Escaneados</div></div>
                            <div class="AH-perf-stat"><div class="AH-perf-val green">${found}</div><div class="AH-perf-label">Encontrados</div></div>
                            <div class="AH-perf-stat"><div class="AH-perf-val red">${notFound}</div><div class="AH-perf-label">No encontrados</div></div>
                            <div class="AH-perf-stat"><div class="AH-perf-val orange">${ratio}%</div><div class="AH-perf-label">Ratio éxito</div></div>
                        </div>
                    </div>
                `;
            }

            visualHTML += `
                <div class="AH-report-section">
                    <div class="AH-report-section-title">📍 Situación por Ubicación Exterior - Solo UNOWNED</div>
                    <table id="AH-report-table">
                        <thead>
                            <tr>
                                <th>Ubicación Exterior</th>
                                <th>Tipo Ubic.</th>
                                <th>Ubic. Remota</th>
                                <th class="num col-5days">Uds +5d</th>
                                <th class="num col-3to5">Uds 3-5d</th>
                                <th class="num col-2to3">Uds 2-3d</th>
                                <th class="num col-total">Total Cnt</th>
                                <th class="num col-total">Total Uds</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (locationData.length === 0) {
                visualHTML += `<tr><td colspan="8" style="text-align: center; color: var(--AH-text-muted); padding: 30px;">No se encontraron contenedores UNOWNED</td></tr>`;
            } else {
                locationData.forEach(d => {
                    const locClass = d.location === '(Sin ubicación)' ? 'AH-loc-empty' : 'AH-loc-name';
                    const formatVal = (val) => val === null ? '<span class="na">N/A</span>' : val.toLocaleString('es-ES');
                    visualHTML += `
                        <tr>
                            <td><span class="${locClass}">${d.location}</span></td>
                            <td><span class="AH-loc-type">${d.locationType}</span></td>
                            <td><span class="AH-loc-type">${d.remoteLocation}</span></td>
                            <td class="num col-5days ${d.unitsByFilter['5DaysAndOlder'] === null ? 'na' : ''}">${formatVal(d.unitsByFilter['5DaysAndOlder'])}</td>
                            <td class="num col-3to5 ${d.unitsByFilter['3To5Days'] === null ? 'na' : ''}">${formatVal(d.unitsByFilter['3To5Days'])}</td>
                            <td class="num col-2to3 ${d.unitsByFilter['2To3Days'] === null ? 'na' : ''}">${formatVal(d.unitsByFilter['2To3Days'])}</td>
                            <td class="num col-total">${d.uniqueContainers.toLocaleString('es-ES')}</td>
                            <td class="num col-total">${d.totalUnits.toLocaleString('es-ES')}</td>
                        </tr>
                    `;
                });

                visualHTML += `
                    <tr class="total-row">
                        <td colspan="3"><strong>TOTAL</strong></td>
                        <td class="num">${availableFilters['5DaysAndOlder'] ? totalsByFilter['5DaysAndOlder'].toLocaleString('es-ES') : 'N/A'}</td>
                        <td class="num">${availableFilters['3To5Days'] ? totalsByFilter['3To5Days'].toLocaleString('es-ES') : 'N/A'}</td>
                        <td class="num">${availableFilters['2To3Days'] ? totalsByFilter['2To3Days'].toLocaleString('es-ES') : 'N/A'}</td>
                        <td class="num">${totalContainers.toLocaleString('es-ES')}</td>
                        <td class="num">${totalUnits.toLocaleString('es-ES')}</td>
                    </tr>
                `;
            }

            visualHTML += `</tbody></table></div>`;
            document.getElementById('AH-rtab-visual').innerHTML = visualHTML;

            // TEXT FOR SLACK
            const separator = '═'.repeat(95);
            const thinSep = '─'.repeat(95);
            let textReport = '';

            if (type === 'start') {
                textReport = `📸 *REPORTE INICIO DE TURNO*\n📅 ${dateStr} | 🕐 ${timeStr}\n🔒 Solo contenedores UNOWNED\n${separator}\n\n`;
            } else {
                textReport = `📊 *REPORTE FIN DE TURNO*\n📅 ${dateStr} | 🕐 ${timeStr}\n🔒 Solo contenedores UNOWNED\n${separator}\n\n`;
                textReport += `📈 *PERFORMANCE DEL DÍA*\n┌────────────────────────────────────────┐\n`;
                textReport += `│  Escaneados:      ${String(scanned).padStart(6)}               │\n`;
                textReport += `│  Encontrados:     ${String(found).padStart(6)} ✅              │\n`;
                textReport += `│  No encontrados:  ${String(notFound).padStart(6)} ❌              │\n`;
                textReport += `│  Ratio éxito:     ${String(ratio + '%').padStart(6)}               │\n`;
                textReport += `└────────────────────────────────────────┘\n\n${thinSep}\n\n`;
            }

            const tabsStatus = CONFIG.REPORT_FILTERS.map(f => {
                const info = this.getFilterInfo(f);
                return availableFilters[f] ? `✅ ${info.label}` : `❌ ${info.label}`;
            }).join('  |  ');

            textReport += `📡 *Pestañas:* ${tabsStatus}\n\n📍 *SITUACIÓN POR UBICACIÓN EXTERIOR*\n\n`;

            const colW = [18, 12, 16, 10, 10, 10, 8, 10];
            const pad = (s, w, r = false) => {
                s = String(s);
                if (s.length > w) s = s.substring(0, w - 1) + '…';
                return r ? s.padStart(w) : s.padEnd(w);
            };

            textReport += `\`\`\`\n`;
            textReport += `${pad('Ubicación', colW[0])}${pad('Tipo', colW[1])}${pad('Ubic. Remota', colW[2])}${pad('+5d', colW[3], true)}${pad('3-5d', colW[4], true)}${pad('2-3d', colW[5], true)}${pad('Cnt', colW[6], true)}${pad('Uds', colW[7], true)}\n`;
            textReport += `${'-'.repeat(colW[0])}${'-'.repeat(colW[1])}${'-'.repeat(colW[2])}${'-'.repeat(colW[3])}${'-'.repeat(colW[4])}${'-'.repeat(colW[5])}${'-'.repeat(colW[6])}${'-'.repeat(colW[7])}\n`;

            if (locationData.length === 0) {
                textReport += `${pad('(Sin datos)', colW[0])}${pad('-', colW[1])}${pad('-', colW[2])}${pad('-', colW[3], true)}${pad('-', colW[4], true)}${pad('-', colW[5], true)}${pad('-', colW[6], true)}${pad('-', colW[7], true)}\n`;
            } else {
                locationData.forEach(d => {
                    const fmtVal = (v) => v === null ? 'N/A' : v.toLocaleString('es-ES');
                    textReport += `${pad(d.location, colW[0])}${pad(d.locationType, colW[1])}${pad(d.remoteLocation, colW[2])}${pad(fmtVal(d.unitsByFilter['5DaysAndOlder']), colW[3], true)}${pad(fmtVal(d.unitsByFilter['3To5Days']), colW[4], true)}${pad(fmtVal(d.unitsByFilter['2To3Days']), colW[5], true)}${pad(d.uniqueContainers, colW[6], true)}${pad(d.totalUnits.toLocaleString('es-ES'), colW[7], true)}\n`;
                });

                textReport += `${'-'.repeat(colW[0])}${'-'.repeat(colW[1])}${'-'.repeat(colW[2])}${'-'.repeat(colW[3])}${'-'.repeat(colW[4])}${'-'.repeat(colW[5])}${'-'.repeat(colW[6])}${'-'.repeat(colW[7])}\n`;
                textReport += `${pad('TOTAL', colW[0])}${pad('', colW[1])}${pad('', colW[2])}${pad(availableFilters['5DaysAndOlder'] ? totalsByFilter['5DaysAndOlder'].toLocaleString('es-ES') : 'N/A', colW[3], true)}${pad(availableFilters['3To5Days'] ? totalsByFilter['3To5Days'].toLocaleString('es-ES') : 'N/A', colW[4], true)}${pad(availableFilters['2To3Days'] ? totalsByFilter['2To3Days'].toLocaleString('es-ES') : 'N/A', colW[5], true)}${pad(totalContainers, colW[6], true)}${pad(totalUnits.toLocaleString('es-ES'), colW[7], true)}\n`;
            }

            textReport += `\`\`\``;

            document.getElementById('AH-report-preview').textContent = textReport;
            this.currentReportText = textReport;
            this._reportData = { locationData, availableFilters, totalContainers, totalUnits, totalsByFilter, type, scanned, found, notFound, ratio, dateStr, timeStr };

            this.switchReportTab('visual');
        }

        closeReport() { document.getElementById('AH-report-modal').classList.remove('visible'); }

        copyReportToClipboard() {
            navigator.clipboard.writeText(this.currentReportText).then(() => {
                const status = document.getElementById('AH-copy-status');
                status.classList.add('visible');
                setTimeout(() => status.classList.remove('visible'), 2000);
            }).catch(err => alert('Error al copiar: ' + err.message));
        }

        exportReportCSV() {
            const data = this._reportData;
            if (!data) return;

            const rows = [];
            rows.push(['Reporte', data.type === 'start' ? 'Inicio de Turno' : 'Fin de Turno']);
            rows.push(['Fecha', data.dateStr]);
            rows.push(['Hora', data.timeStr]);
            rows.push(['Nota', 'Solo contenedores UNOWNED']);
            rows.push([]);

            if (data.type === 'end') {
                rows.push(['=== PERFORMANCE ===']);
                rows.push(['Escaneados', data.scanned]);
                rows.push(['Encontrados', data.found]);
                rows.push(['No encontrados', data.notFound]);
                rows.push(['Ratio (%)', data.ratio]);
                rows.push([]);
            }

            rows.push(['=== UBICACIONES ===']);
            rows.push(['Ubicación Exterior', 'Tipo Ubicación', 'Ubicación Remota', 'Uds +5 días', 'Uds 3-5 días', 'Uds 2-3 días', 'Total Contenedores', 'Total Unidades']);

            data.locationData.forEach(d => {
                rows.push([
                    d.location, d.locationType, d.remoteLocation,
                    d.unitsByFilter['5DaysAndOlder'] ?? 'N/A',
                    d.unitsByFilter['3To5Days'] ?? 'N/A',
                    d.unitsByFilter['2To3Days'] ?? 'N/A',
                    d.uniqueContainers, d.totalUnits
                ]);
            });

            rows.push(['TOTAL', '', '',
                data.availableFilters['5DaysAndOlder'] ? data.totalsByFilter['5DaysAndOlder'] : 'N/A',
                data.availableFilters['3To5Days'] ? data.totalsByFilter['3To5Days'] : 'N/A',
                data.availableFilters['2To3Days'] ? data.totalsByFilter['2To3Days'] : 'N/A',
                data.totalContainers, data.totalUnits
            ]);

            const csv = rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `reporte_${data.type}_${data.dateStr.replace(/\//g, '-')}_${data.timeStr.replace(':', '')}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            this.setStatus('CSV del reporte exportado', 'found', '✓');
        }

        getRowClass(filter) {
            if (!filter) return 'r-notfound';
            if (filter === '5DaysAndOlder') return 'r-5days';
            if (filter === '3To5Days') return 'r-3to5';
            if (filter === '2To3Days') return 'r-2to3';
            return 'r-green';
        }

        getBadgeClass(filter) {
            if (!filter) return 'b-notfound';
            if (filter === '5DaysAndOlder') return 'b-5days';
            if (filter === '3To5Days') return 'b-3to5';
            if (filter === '2To3Days') return 'b-2to3';
            return 'b-green';
        }

        addResult(container, result) {
            const entry = {
                container,
                found: result.found,
                filter: result.filter,
                filterLabel: result.filterLabel || 'NO ENCONTRADO',
                owner: result.owner || '-',
                ts: new Date().toISOString()
            };
            this.session.unshift(entry);
            this.history.unshift(entry);
            this.saveHistory();
            this.renderResults();
        }

        renderRow(e) {
            const time = new Date(e.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="AH-row ${this.getRowClass(e.filter)}">
                    <span class="AH-col-container">${e.container}</span>
                    <span class="AH-col-owner"><span class="AH-owner-tag">${e.owner}</span></span>
                    <span class="AH-col-badge"><span class="AH-badge ${this.getBadgeClass(e.filter)}">${e.filterLabel}</span></span>
                    <span class="AH-col-time">${time}</span>
                </div>
            `;
        }

        renderResults() {
            const el = document.getElementById('AH-results');
            if (!this.session.length) {
                el.innerHTML = '<div id="AH-empty">Sin resultados en esta sesión</div>';
                return;
            }
            el.innerHTML = this.session.map(e => this.renderRow(e)).join('');
        }

        renderHistory() {
            const el = document.getElementById('AH-history');
            if (!el) return;
            if (!this.history.length) {
                el.innerHTML = '<div id="AH-empty">Sin historial de hoy</div>';
                return;
            }
            el.innerHTML = this.history.map(e => this.renderRow(e)).join('');
        }

        updateUI() {
            const badge = document.getElementById('AH-fab-badge');
            const count = this.history.filter(e => e.found).length;
            if (badge) badge.textContent = count || '';

            const histCount = document.getElementById('AH-hist-count');
            if (histCount) histCount.textContent = this.history.length;

            const total = document.getElementById('AH-s-total');
            const found = document.getElementById('AH-s-found');
            const notfound = document.getElementById('AH-s-notfound');
            if (total) total.textContent = this.history.length;
            if (found) found.textContent = this.history.filter(e => e.found).length;
            if (notfound) notfound.textContent = this.history.filter(e => !e.found).length;
        }

        export() {
            if (!this.history.length) return alert('No hay datos');

            const rows = [['Contenedor', 'Estado', 'Antigüedad', 'Propietario', 'Fecha', 'Hora']];
            this.history.forEach(e => {
                const d = new Date(e.ts);
                rows.push([e.container, e.found ? 'ENCONTRADO' : 'NO ENCONTRADO', e.filterLabel, e.owner, d.toLocaleDateString('es-ES'), d.toLocaleTimeString('es-ES')]);
            });

            const csv = rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `containers_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            this.setStatus('CSV exportado', 'found', '✓');
        }

        clearAll() {
            if (!confirm('¿Borrar todo el historial de hoy?')) return;
            this.history = [];
            this.session = [];
            this.saveHistory();
            this.renderResults();
            this.renderHistory();
            this.setStatus('Historial borrado', '', 'i');
        }
    }

    new ContainerFinder();
})();