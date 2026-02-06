
// ==UserScript==
// @name         FCLM ICQA Calmcodes
// @namespace    Calm Codes
// @version      4.2
// @description  Poder logar desde FCLM
// @author       Learning MAD9 - Adaptado por bjonatan@ y jeflaber@ para MAD7 - Adaptado para ICQA MAD7 por juagarcm
// @match        fclm-portal.amazon.com/employee/timeDetails?warehouseId=MAD7&employeeId=*
// @match        fclm-portal.amazon.com/employee/*
// @icon         https://fclm-portal.amazon.com/resources/images/icon.jpg
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    const categories = [
        {
            id: 1,
            title: 'ICQA LEADS',
            color: '#3498db',
            icon: '🏡',
            items: [
                { label: 'ICQA Lead', code: 'ICQALQA', icon: '👨‍👦‍👦' },
                { label: 'Team Connect', code: 'OPSEMPENG', icon: '👨‍👩‍👧‍👧' },
                { label: 'Enfermería', code: 'SFTAMOI', icon: '💉' },
                { label: 'CAPEX8', code: 'SPPROJ8', icon: '⬅️' },
                { label: 'Huddle', code: 'WWHUDDLE', icon: '📝' },
                { label: 'ICQA 5S', code: 'ICQA5S', icon: '🏫' },
                { label: 'Facilities 5S', code: 'FC5S', icon: '🏰' },
                { label: 'ISTOP', code: 'ISTOP', icon: '🟡' },
                { label: 'MASTER STOP', code: 'MSTOP', icon: '🔴' }
            ]
        },
        {
            id: 2,
            title: 'Tareas indi',
            color: '#5dade2',
            icon: '🚀',
            items: [
                { label: 'Amnesty', code: 'ICQAAM', icon: '🛒' },
                { label: 'Damage Collection', code: 'ICQADMP', icon: '💩' },
                { label: 'Waste Out', code: 'DONWASPRO', icon: '🧺' },
                { label: 'SIOC', code: 'DCSUP', icon: '📦' },
            ]
        },
        {
            id: 3,
            title: 'Instructores',
            color: '#e67e22',
            icon: '👨‍🏫',
            items: [
                { label: 'Peer Trainer', code: 'ICQAPT', icon: '👨‍🏫' },
                { label: 'Trainee', code: 'ICQATR', icon: '🎓' },
                { label: 'ICQA IST', code: 'ICQAIC', icon: '⚖️' },
            ]
        },
        {
            id: 4,
            title: 'ICQA PS',
            color: '#e67e22',
            icon: '🧑‍💻',
            items: [
                { label: 'PS ICQA', code: 'PRPTR', icon: '🦉' },
                { label: 'Sweeper', code: 'ICQAPSS', icon: '🧹' },
                { label: 'PG', code: 'ICQATR', icon: '❤️‍🔥' },
                { label: 'Aging', code: 'PIKTR', icon: '⛏️' },
                { label: 'POUT', code: 'PAKTNG', icon: '🚚' },
                { label: 'TT Andon', code: 'VRTR', icon: '🚦' },
                { label: 'Pick Consolidation', code: 'BINCON', icon: '💪' },
            ]
        },
        {
            id: 5,
            title: 'Audits',
            color: '#52be80',
            icon: '📸',
            items: [
                { label: 'Audits OB', code: 'ICQAXSP', icon: '🦅' },
                { label: 'Audits ICQA', code: 'ICQAQA', icon: '🐦' },
            ]
        }
    ];

    GM_addStyle(`
        #toggleMenuBtn {
            position: fixed !important;
            bottom: 15px !important;
            right: 15px !important;
            z-index: 10000 !important;
            background: #ff9900 !important;
            color: #000 !important;
            border: none !important;
            border-radius: 50% !important;
            width: 50px !important;
            height: 50px !important;
            font-size: 24px !important;
            cursor: pointer !important;
            box-shadow: 0 2px 8px rgba(255, 153, 0, 0.4) !important;
            transition: all 0.2s ease !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        #toggleMenuBtn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(255, 153, 0, 0.6) !important;
        }

        #learningPanel {
            position: fixed !important;
            bottom: 75px !important;
            right: 15px !important;
            z-index: 9999 !important;
            background: #2c3e50 !important;
            border-radius: 10px !important;
            padding: 12px !important;
            width: 319px !important;
            max-height: 70vh !important;
            overflow-y: auto !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
            border: 1px solid #ff9900 !important;
            display: none;
        }
        #learningPanel.visible {
            display: block !important;
            animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }

        .panel-title {
            color: #ff9900 !important;
            text-align: center;
            font-weight: 700;
            margin-bottom: 10px;
            font-size: 13px;
            letter-spacing: 0.5px;
        }

        .category-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            background: rgba(255, 255, 255, 0.06) !important;
            border: none !important;
            border-left: 3px solid !important;
            color: #fff !important;
            padding: 8px 10px !important;
            cursor: pointer !important;
            border-radius: 6px !important;
            margin-bottom: 6px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            width: 100% !important;
            transition: all 0.2s ease !important;
        }
        .category-btn:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            transform: translateX(2px);
        }
        .category-btn.active {
            background: rgba(255, 255, 255, 0.12) !important;
        }

        .category-left {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .category-number {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            color: #000;
            font-weight: bold;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .category-icon {
            font-size: 16.8px;
        }
        .category-arrow {
            font-size: 10px;
            transition: transform 0.2s ease;
        }
        .category-arrow.expanded {
            transform: rotate(90deg);
        }

        .subcategories {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            margin-bottom: 4px;
        }
        .subcategories.expanded {
            max-height: 300px;
        }

        .btn-learning {
            display: flex !important;
            align-items: center !important;
            border: none !important;
            color: #000 !important;
            padding: 6px 10px !important;
            cursor: pointer !important;
            border-radius: 5px !important;
            margin: 3px 0 3px 15px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            width: calc(100% - 15px) !important;
            transition: all 0.15s ease !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
        }
        .btn-learning:hover {
            transform: translateX(3px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
        }
        .btn-icon {
            margin-right: 6px;
            font-size: 14.4px;
        }

        #learningPanel::-webkit-scrollbar {
            width: 4px;
        }
        #learningPanel::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
        }
        #learningPanel::-webkit-scrollbar-thumb {
            background: #ff9900;
            border-radius: 2px;
        }
    `);

    function sendCalm(calmCode) {
        const badge = document.evaluate(
            "//dt[text()='Badge']/following-sibling::dd",
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue?.textContent.trim();

        if (!badge) {
            alert("❌ Error: No se encuentra el Badge ID");
            return;
        }

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://fcmenu-dub-regionalized.corp.amazon.com/do/laborTrackingKiosk',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: new URLSearchParams({
                warehouseId: 'MAD7',
                calmCode: calmCode,
                trackingBadgeId: badge
            }).toString(),
            onload: () => {
                console.log(`✅ ${calmCode}`);
                location.reload();
            },
            onerror: () => alert('❌ Error al loguear')
        });
    }

    function createLearningPanel() {
        if (document.getElementById('learningPanel')) return;


        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggleMenuBtn';
        toggleBtn.innerHTML = '🎓';
        document.body.appendChild(toggleBtn);


        const panel = document.createElement('div');
        panel.id = 'learningPanel';


        const title = document.createElement('div');
        title.className = 'panel-title';
        title.textContent = 'LEARNING';
        panel.appendChild(title);

        categories.forEach(category => {
            const categoryBtn = document.createElement('button');
            categoryBtn.className = 'category-btn';
            categoryBtn.style.borderLeftColor = category.color;
            categoryBtn.innerHTML = `
                <div class="category-left">
                    <span class="category-number" style="background-color: ${category.color};">
                        ${category.id}
                    </span>
                    <span class="category-icon">${category.icon}</span>
                    <span>${category.title}</span>
                </div>
                <span class="category-arrow">▶</span>
            `;

            const subcategoriesDiv = document.createElement('div');
            subcategoriesDiv.className = 'subcategories';

            category.items.forEach(item => {
                const btn = document.createElement('button');
                btn.className = 'btn-learning';
                btn.style.backgroundColor = category.color;
                btn.innerHTML = `
                    <span class="btn-icon">${item.icon}</span>
                    <span>${item.label}</span>
                `;
                btn.onclick = () => sendCalm(item.code);
                subcategoriesDiv.appendChild(btn);
            });

            categoryBtn.addEventListener('click', () => {
                const arrow = categoryBtn.querySelector('.category-arrow');
                const isCurrentlyExpanded = subcategoriesDiv.classList.contains('expanded');

                document.querySelectorAll('.subcategories.expanded').forEach(sub => {
                    if (sub !== subcategoriesDiv) {
                        sub.classList.remove('expanded');
                        sub.previousElementSibling.querySelector('.category-arrow').classList.remove('expanded');
                        sub.previousElementSibling.classList.remove('active');
                    }
                });

                if (isCurrentlyExpanded) {
                    subcategoriesDiv.classList.remove('expanded');
                    arrow.classList.remove('expanded');
                    categoryBtn.classList.remove('active');
                } else {
                    subcategoriesDiv.classList.add('expanded');
                    arrow.classList.add('expanded');
                    categoryBtn.classList.add('active');
                }
            });

            panel.appendChild(categoryBtn);
            panel.appendChild(subcategoriesDiv);
        });

        document.body.appendChild(panel);

        toggleBtn.addEventListener('click', () => {
            const isVisible = panel.classList.toggle('visible');
            toggleBtn.innerHTML = isVisible ? '❌' : '🎓';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createLearningPanel);
    } else {
        createLearningPanel();
    }

})();

