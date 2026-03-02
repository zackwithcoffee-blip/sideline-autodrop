// ==UserScript==
// @name         FCResearch+
// @version      1.1.2
// @description  FCResearch Enhanced — Hazmat, Prep, Box Recommendation, Floor Info, Diver, Quick Print, DataMatrix Generator & more
// @author       josexmor
// @updateURL    https://axzile.corp.amazon.com/-/carthamus/download_script/fc-research+.user.js
// @downloadURL  https://axzile.corp.amazon.com/-/carthamus/download_script/fc-research+.user.js
// @match         https://qifcr.eu.aftx.amazonoperations.app/*
// @match        https://qi-fcresearch-eu.corp.amazon.com/*
// @match        http://fc-andons-eu.corp.amazon.com/*
// @match        https://diver.qts.amazon.dev/*
// @icon         https://www.amazon.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js
// @require      https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js
// @connect      pandash.amazon.com
// @connect      prepmanager-dub.amazon.com
// @connect      box-web-dub.amazon.com
// @connect      roboscout.amazon.com
// @connect      localhost
// @run-at       document-end
// ==/UserScript==

(function () {
    "use strict";

    if (window.FCRPlusInitialized) { console.log("FCResearch+ already running"); return; }
    window.FCRPlusInitialized = true;
    window.FCRPlusVersion = "1.1.2";

    // ========================================
    // CONFIG
    // ========================================
    const CONFIG = {
        warehouses: { list: JSON.parse(GM_getValue("userFCList", '["RMU1","ZAZ1","CDG7","WRO5","DTM2","HAJ1"]')), default: GM_getValue("userDefaultFC", "RMU1") },
        endpoints: {
            base: window.location.origin,
            printHost: "http://localhost:5965/printer",
            roboscout: "https://roboscout.amazon.com",
            badgePhotos: "https://internal-cdn.amazon.com/badgephotos.amazon.com",
            diver: "https://diver.qts.amazon.dev/tools/transshipment/dashboards/transfer_details",
            pandash: "https://pandash.amazon.com/GridServlet",
            prepManager: "https://prepmanager-dub.amazon.com/view",
            boxRec: "https://box-web-dub.amazon.com/BoxRecBrowser/getBoxRecommendation",
        },
        features: {
            quickPrintBar: { default: true, label: "Quick Print Bar", description: "Barra superior para imprimir codigos de barras y ASINs rapidamente" },
            asinPrinting: { default: true, label: "ASIN Print Buttons", description: "Botones de impresion automaticos en paginas de productos" },
            fcSelector: { default: true, label: "FC Selector", description: "Botones para cambiar entre diferentes fulfillment centers" },
            altClickDiver: { default: true, label: "Alt+Click Diver", description: "Alt+Click en cualquier texto para abrirlo en Diver" },
            adjacentBins: { default: true, label: "Floor Information", description: "Muestra informacion del piso de bins desde Roboscout" },
            flipsCounter: { default: true, label: "Flips Counter", description: "Contador en tiempo real de cantidades Flips to Sellable" },
            darkMode: { default: false, label: "Dark Mode", description: "Alternar entre tema claro y oscuro" },
            imageHover: { default: true, label: "Image Hover", description: "Mostrar imagenes de productos al pasar sobre ASINs" },
            badgePhotos: { default: true, label: "Badge Photos", description: "Mostrar fotos de empleados al pasar sobre logins" },
            hazmatInfo: { default: true, label: "Hazmat Information", description: "Mostrar nivel de Hazmat desde PanDash en paginas de productos" },
            prepInfo: { default: true, label: "Prep Instructions", description: "Mostrar instrucciones de Prep certificadas desde Prep Instruction Manager" },
            boxRecInfo: { default: true, label: "Box Recommendation", description: "Mostrar caja recomendada desde Box Recommendation Browser" },
            dataMatrixGenerator: { default: true, label: "DataMatrix Generator", description: "Genera Data Matrix escaneables desde una lista de bins con vista de grid e historial" },
        },
        hazmat: {
            marketplace: "ES", cacheDuration: 300000, timeout: 5000,
            capabilities: { RMU1:"MEDIUM",BCN4:"MEDIUM",MAD4:"MEDIUM",LCJ1:"MEDIUM",ZAZ1:"MEDIUM",CDG7:"MEDIUM",WRO5:"MEDIUM",DTM2:"MEDIUM",HAJ1:"MEDIUM" },
            levels: {
                0:{bg:"#f0f0f0",text:"#555555",label:"No Hazmat"},1:{bg:"#e8f5e9",text:"#2e7d32",label:"Nivel 1"},
                2:{bg:"#f1f8e9",text:"#558b2f",label:"Nivel 2"},3:{bg:"#fffde7",text:"#f9a825",label:"Nivel 3"},
                4:{bg:"#fff3e0",text:"#e65100",label:"Nivel 4"},5:{bg:"#fbe9e7",text:"#bf360c",label:"Nivel 5"},
                6:{bg:"#ffebee",text:"#c62828",label:"Nivel 6"},7:{bg:"#f3e5f5",text:"#6a1b9a",label:"Nivel 7"},
            },
        },
        prep: { cacheDuration: 300000, timeout: 10000 },
        boxRec: {
            cacheDuration: 300000, timeout: 10000,
            fcMarketplace: { RMU1:44551,ZAZ1:44551,BCN4:44551,MAD4:44551,LCJ1:44551,CDG7:5,WRO5:712115121,DTM2:4,HAJ1:4 },
        },
        dmx: {
            historyMax: 5, historyKey: "dmx-history",
            bwipSources: [
                "https://cdn.jsdelivr.net/npm/bwip-js@4.1.1/dist/bwip-js-min.js",
                "https://unpkg.com/bwip-js@4.1.1/dist/bwip-js-min.js",
                "https://cdnjs.cloudflare.com/ajax/libs/bwip-js/4.1.1/bwip-js-min.js"
            ],
        },
        diver: { dateRangeMonths:1, showConfirmation:false, autoSearchMaxAttempts:20, autoSearchDelay:500 },
        performance: { debounceDelay:300, imageCache:{maxSize:100,ttl:3600000}, elementCache:{ttl:5000}, retryAttempts:3, timeout:5000 },
        ui: { delays:{instant:0,short:100,medium:300,long:500,veryLong:1000}, toastDuration:3000 },
        patterns: { asin:/^(B0|X0)[A-Z0-9]{8}$/, po:/^[0-9][A-Z0-9]{7}$/, login:/^[a-zA-Z]{4,15}@?$/, date:/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\s[A-Z]+)?$/ },
        rsValues: ["M","F","R","X"],
        loginBlacklist: ["SYSTEM","AUTO","AUTOMATED","UNKNOWN","NULL","ROBOT","BOT","SCRIPT","ADMIN"],
    };

    // ========================================
    // LOGGER
    // ========================================
    const Logger = {
        levels:{DEBUG:0,INFO:1,WARN:2,ERROR:3}, currentLevel:1,
        log(level,message,data={}) {
            if(this.levels[level]<this.currentLevel)return;
            const e={DEBUG:"D",INFO:"I",WARN:"W",ERROR:"E"};
            const t=new Date().toISOString().split("T")[1].split(".")[0];
            const p=`[${e[level]}][${t}]`;
            Object.keys(data).length>0?console.log(`${p} ${message}`,data):console.log(`${p} ${message}`);
        },
        debug:(m,d)=>Logger.log("DEBUG",m,d), info:(m,d)=>Logger.log("INFO",m,d),
        warn:(m,d)=>Logger.log("WARN",m,d), error:(m,d)=>Logger.log("ERROR",m,d),
    };

    // ========================================
    // SAFE EXECUTION
    // ========================================
       const SafeExecute = {
        async run(fn,ctx="Operation",showErr=false){try{return await fn();}catch(e){Logger.error(`${ctx} failed`,{error:e.message});if(showErr)this.showErrorToast(`${ctx} failed.`);return null;}},
        showErrorToast(msg){const t=$(`<div style="position:fixed;bottom:80px;right:20px;background:#dc3545;color:white;padding:1rem 1.5rem;border-radius:0.5rem;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:100000;font-size:0.875rem;font-weight:600;animation:slideIn 0.3s ease-out;max-width:300px;">!! ${msg}</div>`);$("body").append(t);setTimeout(()=>t.fadeOut(300,()=>t.remove()),CONFIG.ui.toastDuration);},
        showSuccessToast(msg){const t=$(`<div style="position:fixed;bottom:80px;right:20px;background:#28a745;color:white;padding:1rem 1.5rem;border-radius:0.5rem;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:100000;font-size:0.875rem;font-weight:600;animation:slideIn 0.3s ease-out;max-width:300px;">OK ${msg}</div>`);$("body").append(t);setTimeout(()=>t.fadeOut(300,()=>t.remove()),CONFIG.ui.toastDuration);},
    };


    // ========================================
    // EVENT BUS
    // ========================================
    const EventBus = {
        events:{},
        on(e,cb){if(!this.events[e])this.events[e]=[];this.events[e].push(cb);},
        emit(e,d){if(!this.events[e])return;this.events[e].forEach(cb=>{try{cb(d);}catch(er){Logger.error(`Event handler failed for ${e}`,{error:er.message});}});},
        off(e,cb){if(!this.events[e])return;this.events[e]=this.events[e].filter(c=>c!==cb);},
    };

    // ========================================
    // VALIDATORS
    // ========================================
    const Validators = {
        isValidASIN(t){return t?CONFIG.patterns.asin.test(t.trim()):false;},
        isValidPO(t){return t?CONFIG.patterns.po.test(t.trim()):false;},
        isValidLogin(t){if(!t||t.length<4||t.length>15)return false;if(!CONFIG.patterns.login.test(t))return false;return!CONFIG.loginBlacklist.includes(t.toUpperCase().replace("@",""));},
        isValidDate(t){return t?CONFIG.patterns.date.test(t):false;},
        isLoginInURL(){const s=new URLSearchParams(window.location.search).get("s");if(!s)return false;return CONFIG.patterns.login.test(s.trim())&&!this.isValidASIN(s.trim())&&!this.isValidPO(s.trim());},
    };

    // ========================================
    // CACHES
    // ========================================
    const HazmatCache = {
        cache:new Map(),timestamps:new Map(),ttl:CONFIG.hazmat.cacheDuration,
        getCacheKey(a,f,m){return `${a}_${f}_${m}`;},
        set(a,f,m,d){const k=this.getCacheKey(a,f,m);this.cache.set(k,d);this.timestamps.set(k,Date.now());},
        get(a,f,m){const k=this.getCacheKey(a,f,m);if(!this.cache.has(k))return null;if(Date.now()-this.timestamps.get(k)>this.ttl){this.delete(k);return null;}return this.cache.get(k);},
        delete(k){this.cache.delete(k);this.timestamps.delete(k);},clear(){this.cache.clear();this.timestamps.clear();},
    };

    const PrepCache = {
        cache:new Map(),timestamps:new Map(),ttl:CONFIG.prep.cacheDuration,
        set(a,d){this.cache.set(a,d);this.timestamps.set(a,Date.now());},
        get(a){if(!this.cache.has(a))return null;if(Date.now()-this.timestamps.get(a)>this.ttl){this.delete(a);return null;}return this.cache.get(a);},
        delete(a){this.cache.delete(a);this.timestamps.delete(a);},clear(){this.cache.clear();this.timestamps.clear();},
    };

    const BoxRecCache = {
        cache: new Map(), timestamps: new Map(), ttl: CONFIG.boxRec.cacheDuration,
        getCacheKey(asin, fc) { return `${asin}_${fc}`; },
        set(asin, fc, data) { const k = this.getCacheKey(asin, fc); this.cache.set(k, data); this.timestamps.set(k, Date.now()); },
        get(asin, fc) { const k = this.getCacheKey(asin, fc); if (!this.cache.has(k)) return null; if (Date.now() - this.timestamps.get(k) > this.ttl) { this.delete(k); return null; } return this.cache.get(k); },
        delete(k) { this.cache.delete(k); this.timestamps.delete(k); },
        clear() { this.cache.clear(); this.timestamps.clear(); },
    };

    const ImageCache = {
        cache:new Map(),timestamps:new Map(),maxSize:CONFIG.performance.imageCache.maxSize,ttl:CONFIG.performance.imageCache.ttl,
        set(k,v){if(this.cache.size>=this.maxSize)this.evictOldest();this.cache.set(k,v);this.timestamps.set(k,Date.now());},
        get(k){if(!this.cache.has(k))return null;if(Date.now()-this.timestamps.get(k)>this.ttl){this.delete(k);return null;}return this.cache.get(k);},
        delete(k){this.cache.delete(k);this.timestamps.delete(k);},
        evictOldest(){let ok=null,ot=Infinity;for(const[k,t]of this.timestamps.entries()){if(t<ot){ot=t;ok=k;}}if(ok)this.delete(ok);},
        clear(){this.cache.clear();this.timestamps.clear();},
        getStats(){return{size:this.cache.size,maxSize:this.maxSize,usage:`${Math.round((this.cache.size/this.maxSize)*100)}%`};},
    };

    const ElementCache = {
        cache:new Map(),timestamps:new Map(),ttl:CONFIG.performance.elementCache.ttl,
        get(s){const c=this.cache.get(s);if(!c)return null;if(Date.now()-this.timestamps.get(s)>this.ttl){this.delete(s);return null;}if(!document.contains(c)){this.delete(s);return null;}return c;},
        set(s,e){this.cache.set(s,e);this.timestamps.set(s,Date.now());return e;},
        delete(s){this.cache.delete(s);this.timestamps.delete(s);},clear(){this.cache.clear();this.timestamps.clear();},
        getOrFind(s){let e=this.get(s);if(!e){e=document.querySelector(s);if(e)this.set(s,e);}return e;},
    };

    // ========================================
    // STATE
    // ========================================
    const STATE = {
        currentFC:null,activeRSFilter:null,flipsToSellableActive:false,lastUrl:location.href,
        setFC(fc){const o=this.currentFC;this.currentFC=fc;if(o!==fc)EventBus.emit("fc:changed",{old:o,new:fc});},
        setRSFilter(v){const o=this.activeRSFilter;this.activeRSFilter=v;if(o!==v)EventBus.emit("rsfilter:changed",{old:o,new:v});},
        setFlipsToSellable(a){const o=this.flipsToSellableActive;this.flipsToSellableActive=a;if(o!==a)EventBus.emit("flips:changed",{active:a});},
    };

    // ========================================
    // UTILS
    // ========================================
    const Utils = {
        getCurrentFC(){const m=window.location.pathname.match(/\/([A-Z0-9]{3,4})\//);return m?m[1]:GM_getValue("selectedFC",CONFIG.warehouses.default);},
        asciihex:s=>s.split("").map(c=>c.charCodeAt(0).toString(16)).join(""),
        genId:()=>Math.random().toString(36).substr(2,10),
        normalizeText:t=>t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().trim(),
        copyToClipboard(t){const tmp=$("<input>").val(t);$("body").append(tmp);tmp.select();document.execCommand("copy");tmp.remove();SafeExecute.showSuccessToast("Copied to clipboard");},
        debounce(fn,d){let tid;return function(...a){clearTimeout(tid);tid=setTimeout(()=>fn.apply(this,a),d);};},
        waitForElement(sel,timeout=5000){return new Promise((res,rej)=>{const el=document.querySelector(sel);if(el)return res(el);const obs=new MutationObserver(()=>{const e=document.querySelector(sel);if(e){obs.disconnect();res(e);}});obs.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{obs.disconnect();rej(new Error(`Element ${sel} not found`));},timeout);});},
        isFeatureEnabled:f=>$.cookie(`cfg-${f}`)==="1",
        initializeCookies(){Object.keys(CONFIG.features).forEach(f=>{if(typeof $.cookie(`cfg-${f}`)==="undefined")$.cookie(`cfg-${f}`,CONFIG.features[f].default?"1":"0");});},
        setDateInput(input,fd){input.removeAttribute("readonly");input.focus();input.value="";fd.split("").forEach(c=>{input.value+=c;input.dispatchEvent(new InputEvent("input",{bubbles:true,cancelable:true,data:c,inputType:"insertText"}));});input.value=fd;["input","change","blur","keyup","keydown"].forEach(ev=>input.dispatchEvent(new Event(ev,{bubbles:true,cancelable:true})));if(typeof $!=="undefined")$(input).val(fd).trigger("input").trigger("change").trigger("blur");input.blur();},
    };

    STATE.setFC(Utils.getCurrentFC());

    // ========================================
    // HAZMAT INTEGRATION
    // ========================================
    const HazmatIntegration = {
        initialized:false, hazmatDataPromise:null,
        init(){
            if(!Utils.isFeatureEnabled("hazmatInfo"))return;if(this.initialized)return;
            if(!window.location.href.includes("/results?s="))return;if(!Utils.getCurrentFC())return;
            Logger.info("Hazmat integration starting");this.insertHazmatRow();this.initialized=true;
        },
        extractASIN(){return new URLSearchParams(window.location.search).get("s");},
        extractASINFromTable(table){
            for(let row of table.querySelectorAll("tr")){const c=row.querySelectorAll("th, td");
            if(c.length>=2&&c[0].textContent.trim().toUpperCase().includes("ASIN")){const t=(c[1].querySelector("a")?.textContent||c[1].textContent).trim();if(/^B0[A-Z0-9]{8}$/.test(t))return t;}}return null;
        },
        getFCCapability(fc){return CONFIG.hazmat.capabilities[fc]||"MEDIUM";},
        async fetchHazmatData(asin,fcCode,marketplace){
            const cached=HazmatCache.get(asin,fcCode,marketplace);if(cached)return cached;
            return new Promise((resolve,reject)=>{const src=`${this.getFCCapability(fcCode)}-hazmat-FC`;
            const params=new URLSearchParams({language:"default",source:src,marketPlaces:marketplace,asins:asin,sidx:"product.asin",rows:"1",page:"1",sord:"desc",isExportOnly:"FALSE",fileName:`fcr_${Date.now()}`,fc:fcCode,pandashservice:""});
            GM_xmlhttpRequest({method:"POST",url:CONFIG.endpoints.pandash,headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8",Accept:"application/json","X-Requested-With":"XMLHttpRequest"},data:params.toString(),timeout:CONFIG.hazmat.timeout,
            onload:r=>{try{if(r.status!==200){reject(new Error("HTTP "+r.status));return;}const j=JSON.parse(r.responseText);if(!j.rows||j.rows.length===0){reject(new Error("Sin datos de Hazmat"));return;}const row=j.rows[0];const res={level:parseInt(row.level)||0,message:row.message||"No disponible",asin};HazmatCache.set(asin,fcCode,marketplace,res);resolve(res);}catch(e){reject(e);}},
            onerror:e=>reject(new Error("Error de red")),ontimeout:()=>reject(new Error("Timeout")),});});
        },
        findProductTable(){for(let t of document.querySelectorAll("table")){if(t.textContent.includes("B0")&&t.textContent.match(/\d+\.\d+\s*x\s*\d+\.\d+\s*x\s*\d+\.\d+/i))return t;}return null;},
        findDimensionesRow(table){for(let r of table.querySelectorAll("tr")){if(r.textContent.match(/\d+\.\d+\s*x\s*\d+\.\d+\s*x\s*\d+\.\d+/i))return r;}return null;},
        async insertHazmatRow(){let att=0;const check=async()=>{const table=this.findProductTable();if(!table){if(++att<20)setTimeout(check,200);return;}const dimRow=this.findDimensionesRow(table);if(!dimRow)return;if(table.querySelector(".hazmat-row"))return;
        const asin=this.extractASINFromTable(table);if(!asin){Logger.warn("No B0 ASIN for Hazmat");return;}
        this.hazmatDataPromise=this.fetchHazmatData(asin,Utils.getCurrentFC(),CONFIG.hazmat.marketplace);
        const nr=document.createElement("tr");nr.className="hazmat-row";const lc=document.createElement("th");lc.className="hazmat-label";lc.textContent="Nivel de Hazmat";const vc=document.createElement("td");vc.className="hazmat-value hazmat-loading";vc.textContent="Consultando PanDash...";nr.appendChild(lc);nr.appendChild(vc);dimRow.parentNode.insertBefore(nr,dimRow.nextSibling);
        try{const d=await this.hazmatDataPromise;const fromCache=HazmatCache.get(d.asin,Utils.getCurrentFC(),CONFIG.hazmat.marketplace)!==null;this.updateHazmatCell(vc,d,fromCache);}catch(e){this.showError(vc,e.message);}};check();},
        updateHazmatCell(cell,data,fromCache=false){const li=CONFIG.hazmat.levels[data.level]||CONFIG.hazmat.levels[0];cell.className="hazmat-value"+(fromCache?" hazmat-cached":"");cell.textContent=`Nivel ${data.level}: ${data.message}`;cell.style.backgroundColor=li.bg;cell.style.color=li.text;cell.style.padding="10px";cell.style.fontWeight="bold";cell.title=`Nivel ${data.level} - PanDash${fromCache?" (cached)":""}`;},
        showError(cell,msg){cell.className="hazmat-value hazmat-error";cell.textContent="!! "+(msg||"Error al consultar Hazmat");cell.style.backgroundColor="#ffcccc";cell.style.color="#cc0000";cell.style.padding="10px";},
    };

// ========================================
// PREP INSTRUCTION INTEGRATION
// ========================================
const PrepInstructionIntegration = {
    initialized: false,
    prepDataPromise: null,

    init() {
        if (!Utils.isFeatureEnabled("prepInfo")) return;
        if (this.initialized) return;
        if (!window.location.href.includes("/results?s=")) return;
        Logger.info("Prep integration starting");
        this.insertPrepRow();
        this.initialized = true;
    },

    extractASINFromTable(table) {
        return HazmatIntegration.extractASINFromTable(table);
    },

    async fetchPrepData(asin) {
        const cached = PrepCache.get(asin);
        if (cached) return cached;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `${CONFIG.endpoints.prepManager}/${asin}`,
                timeout: CONFIG.prep.timeout,
                onload: (response) => {
                    try {
                        if (response.status !== 200) { reject(new Error("HTTP " + response.status)); return; }
                        const doc = new DOMParser().parseFromString(response.responseText, "text/html");
                        const div = doc.querySelector("#instructions");
                        if (!div) {
                            const res = { items: [], raw: "Prep no certificado aún", noPrep: false };
                            PrepCache.set(asin, res);
                            resolve(res);
                            return;
                        }
                        const items = div.querySelectorAll("ul li");
                        if (items.length > 0) {
                            const texts = Array.from(items).map(li => li.textContent.trim());
                            const res = { items: texts, raw: texts.join(" / "), noPrep: false };
                            PrepCache.set(asin, res);
                            Logger.info("Prep data fetched", { asin, raw: res.raw });
                            resolve(res);
                            return;
                        }
                        const divText = div.textContent || "";
                        if (divText.includes("Certified No Prep")) {
                            const res = { items: [], raw: "Certificado: No Prep", noPrep: true };
                            PrepCache.set(asin, res);
                            resolve(res);
                        } else {
                            const res = { items: [], raw: "Prep no certificado aún", noPrep: false };
                            PrepCache.set(asin, res);
                            resolve(res);
                        }
                    } catch (error) {
                        Logger.error("Prep parse error", { error: error.message });
                        reject(error);
                    }
                },
                onerror: (error) => { Logger.error("Prep request error", { error }); reject(new Error("Error de red")); },
                ontimeout: () => { Logger.error("Prep timeout"); reject(new Error("Timeout")); },
            });
        });
    },

    findProductTable() {
        return HazmatIntegration.findProductTable();
    },

    findInsertionPoint(table) {
        const hazmatRow = table.querySelector(".hazmat-row");
        if (hazmatRow) return hazmatRow;
        return HazmatIntegration.findDimensionesRow(table);
    },

    async insertPrepRow() {
        let attempts = 0;
        const maxAttempts = 25;
        const checkTable = async () => {
            const table = this.findProductTable();
            if (!table) { if (++attempts < maxAttempts) setTimeout(checkTable, 200); return; }
            if (table.querySelector(".prep-row")) return;

            const asin = this.extractASINFromTable(table);
            if (!asin) { Logger.warn("No B0 ASIN for Prep"); return; }

            const insertionPoint = this.findInsertionPoint(table);
            if (!insertionPoint) { if (attempts < maxAttempts) { attempts++; setTimeout(checkTable, 300); } return; }

            this.prepDataPromise = this.fetchPrepData(asin);

            const newRow = document.createElement("tr");
            newRow.className = "prep-row";
            const labelCell = document.createElement("th");
            labelCell.className = "prep-label";
            labelCell.textContent = "Prep Certificado";
            const valueCell = document.createElement("td");
            valueCell.className = "prep-value prep-loading";
            valueCell.textContent = "Consultando Prep Manager...";
            newRow.appendChild(labelCell);
            newRow.appendChild(valueCell);
            insertionPoint.parentNode.insertBefore(newRow, insertionPoint.nextSibling);

            try {
                const prepData = await this.prepDataPromise;
                const hasPrep = prepData.items.length > 0;
                this.updatePrepCell(valueCell, prepData, hasPrep);
            } catch (error) {
                this.showError(valueCell, error.message);
            }
        };
        checkTable();
    },

    updatePrepCell(cell, data, hasPrep) {
        if (hasPrep) { cell.className = "prep-value prep-has-items"; }
        else if (data.noPrep) { cell.className = "prep-value prep-certified-no"; }
        else { cell.className = "prep-value prep-no-items"; }
        cell.textContent = data.raw;
    },

    showError(cell, message) {
        cell.className = "prep-value prep-error";
        cell.textContent = "!! " + (message || "Error al consultar Prep Manager");
    },
};


    // ========================================
    // BOX RECOMMENDATION INTEGRATION
    // ========================================
    const BoxRecIntegration = {
        initialized: false,
        boxDataPromise: null,
        init() {
            if (!Utils.isFeatureEnabled("boxRecInfo")) return;
            if (this.initialized) return;
            if (!window.location.href.includes("/results?s=")) return;
            Logger.info("Box Recommendation integration starting");
            this.insertBoxRecRow();
            this.initialized = true;
        },
        extractASINFromTable(table) {
            return HazmatIntegration.extractASINFromTable(table);
        },
        async fetchBoxData(asin, fc) {
            const cached = BoxRecCache.get(asin, fc);
            if (cached) return cached;
            return new Promise((resolve, reject) => {
                const marketplaceId = CONFIG.boxRec.fcMarketplace[fc] || 44551;
                const url = `${CONFIG.endpoints.boxRec}?marketplaceId=${marketplaceId}&marketplace-selector=${marketplaceId}&warehouseId=${fc}&asin=${asin}&shipOption=&fulfillmentBrandCodeString=&giftOption=NoGift&siocOverride=NONE&_packingBrands=on&_packingBrands=on&_packingBrands=on&_requiresConcealment=on&postalCode=`;
                GM_xmlhttpRequest({
                    method: "GET", url: url, timeout: CONFIG.boxRec.timeout,
                    onload: (response) => {
                        try {
                            if (response.status !== 200) { reject(new Error("HTTP " + response.status)); return; }
                            const doc = new DOMParser().parseFromString(response.responseText, "text/html");
                            let displayNameIndex = -1;
                            let targetTable = null;
                            doc.querySelectorAll("table").forEach((table) => {
                                table.querySelectorAll("th").forEach((th, idx) => {
                                    if (th.textContent.trim().toLowerCase().includes("display name")) {
                                        displayNameIndex = idx;
                                        targetTable = table;
                                    }
                                });
                            });
                            if (targetTable && displayNameIndex >= 0) {
                                const dataRows = targetTable.querySelectorAll("tbody tr");
                                const rows = dataRows.length > 0 ? dataRows : Array.from(targetTable.querySelectorAll("tr")).slice(1);
                                const displayNames = [];
                                rows.forEach((row) => {
                                    const cells = row.querySelectorAll("td");
                                    if (cells.length > displayNameIndex) {
                                        const name = cells[displayNameIndex].textContent.trim();
                                        if (name) displayNames.push(name);
                                    }
                                });
                                if (displayNames.length > 0) {
                                    const result = { items: displayNames, raw: displayNames.join(" / ") };
                                    BoxRecCache.set(asin, fc, result);
                                    resolve(result);
                                } else {
                                    const result = { items: [], raw: "Sin caja recomendada" };
                                    BoxRecCache.set(asin, fc, result);
                                    resolve(result);
                                }
                            } else {
                                const result = { items: [], raw: "Sin caja recomendada" };
                                BoxRecCache.set(asin, fc, result);
                                resolve(result);
                            }
                        } catch (error) { reject(error); }
                    },
                    onerror: () => reject(new Error('Error de red, log in <a href="https://box-web-dub.amazon.com/" target="_blank">box-web-dub.amazon.com</a>')),
                    ontimeout: () => reject(new Error("Timeout")),
                });
            });
        },
        findProductTable() { return HazmatIntegration.findProductTable(); },
        findInsertionPoint(table) {
            const prepRow = table.querySelector(".prep-row");
            if (prepRow) return prepRow;
            const hazmatRow = table.querySelector(".hazmat-row");
            if (hazmatRow) return hazmatRow;
            return HazmatIntegration.findDimensionesRow(table);
        },
        async insertBoxRecRow() {
            let attempts = 0;
            const maxAttempts = 30;
            const checkTable = async () => {
                const table = this.findProductTable();
                if (!table) { if (++attempts < maxAttempts) setTimeout(checkTable, 200); return; }
                if (table.querySelector(".boxrec-row")) return;
                const asin = this.extractASINFromTable(table);
                if (!asin) return;
                const insertionPoint = this.findInsertionPoint(table);
                if (!insertionPoint) { if (attempts < maxAttempts) { attempts++; setTimeout(checkTable, 300); } return; }
                const fc = Utils.getCurrentFC();
                this.boxDataPromise = this.fetchBoxData(asin, fc);
                const newRow = document.createElement("tr");
                newRow.className = "boxrec-row";
                const labelCell = document.createElement("th");
                labelCell.className = "boxrec-label";
                labelCell.textContent = "Box Recommendation";
                const valueCell = document.createElement("td");
                valueCell.className = "boxrec-value boxrec-loading";
                valueCell.textContent = "Consultando Box Recommendation...";
                newRow.appendChild(labelCell);
                newRow.appendChild(valueCell);
                insertionPoint.parentNode.insertBefore(newRow, insertionPoint.nextSibling);
                try {
                    const boxData = await this.boxDataPromise;
                    this.updateBoxRecCell(valueCell, boxData, boxData.items.length > 0);
                } catch (error) {
                    this.showError(valueCell, error.message);
                }
            };
            checkTable();
        },
        updateBoxRecCell(cell, data, hasBox) {
            cell.className = "boxrec-value" + (hasBox ? " boxrec-has-items" : " boxrec-no-items");
            cell.textContent = data.raw;
        },
        showError(cell, message) {
            cell.className = "boxrec-value boxrec-error";
            cell.textContent = "";
            const prefix = document.createTextNode("\u26A0 ");
            cell.appendChild(prefix);
            if (message && message.includes("box-web-dub.amazon.com")) {
                const textBefore = document.createTextNode("Error de red, log in ");
                const link = document.createElement("a");
                link.href = "https://box-web-dub.amazon.com/";
                link.target = "_blank";
                link.textContent = "box-web-dub.amazon.com";
                link.style.color = "#0066c0";
                link.style.textDecoration = "underline";
                cell.appendChild(textBefore);
                cell.appendChild(link);
            } else {
                const text = document.createTextNode(message || "Error al consultar Box Recommendation");
                cell.appendChild(text);
            }
        },
    };

    // ========================================
    // DIVER UTILITIES
    // ========================================
    const DiverUtils = {
        formatDateForDiver(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;},
        buildDiverUrl(searchText,fc=null){if(!fc)fc=STATE.currentFC||Utils.getCurrentFC();const t=new Date();const ed=this.formatDateForDiver(t);const sd=new Date();sd.setMonth(sd.getMonth()-CONFIG.diver.dateRangeMonths);const sds=this.formatDateForDiver(sd);return{url:`${CONFIG.endpoints.diver}?destination_warehouse_id=${fc}&end_date=${ed}&search=${encodeURIComponent(searchText)}&source_warehouse_id=-&start_date=${sds}`,fc,startDate:sds,endDate:ed};},
        openInDiver(searchText,fc=null){if(!Utils.isFeatureEnabled("altClickDiver"))return;if(!searchText||searchText.length===0){SafeExecute.showErrorToast("No text to search in Diver");return;}if(searchText.length>100){SafeExecute.showErrorToast("Text too long");return;}const{url}=this.buildDiverUrl(searchText,fc);window.open(url,"_blank");SafeExecute.showSuccessToast(`Opening Diver: ${searchText.length>30?searchText.substring(0,30)+"...":searchText}`);},
    };

    // ========================================
    // DIVER AUTO-SEARCH
    // ========================================
    const DiverAutoSearch = {
        initialized:false,
        init(){if(!window.location.href.includes("diver.qts.amazon.dev"))return;if(this.initialized)return;this.initialized=true;const hs=new URLSearchParams(window.location.search).get("search");if(!hs)return;this.waitAndClickSearch();},
        async waitAndClickSearch(){for(let a=1;a<=CONFIG.diver.autoSearchMaxAttempts;a++){const b=this.findSearchButton();if(b){await new Promise(r=>setTimeout(r,300));try{b.click();b.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));this.showNotification("Search triggered automatically");return;}catch(e){}}if(a<CONFIG.diver.autoSearchMaxAttempts)await new Promise(r=>setTimeout(r,CONFIG.diver.autoSearchDelay));}},
        findSearchButton(){const s=[()=>Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="Search"),()=>document.querySelector('button[type="submit"]'),()=>document.querySelector("button.awsui-button-variant-primary"),()=>document.querySelector('[data-testid="search-button"]'),()=>{const c=document.querySelector('form, [role="search"]');return c?.querySelector("button");},()=>document.querySelector('button[aria-label*="Search"], button[aria-label*="search"]'),()=>Array.from(document.querySelectorAll("button")).find(b=>b.textContent.toLowerCase().includes("search"))];for(const st of s){try{const b=st();if(b&&!b.disabled&&b.offsetParent!==null)return b;}catch(e){}}return null;},
        showNotification(msg){const n=document.createElement("div");n.textContent=`OK ${msg}`;n.style.cssText="position:fixed;top:20px;right:20px;background:#28a745;color:white;padding:0.5rem 1rem;border-radius:0.25rem;font-size:0.875rem;z-index:100000;opacity:0;transition:opacity 0.3s ease;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.2);";document.body.appendChild(n);setTimeout(()=>(n.style.opacity="1"),10);setTimeout(()=>{n.style.opacity="0";setTimeout(()=>n.remove(),300);},2000);},
    };

    // ========================================
    // NAVIGATION DETECTOR
    // ========================================
    const NavigationDetector = {
        lastUrl:location.href,
        init(){const obs=new MutationObserver(()=>{if(location.href!==this.lastUrl){this.lastUrl=location.href;this.onNavigate();}});const te=document.querySelector("title");if(te)obs.observe(te,{childList:true,subtree:true});window.addEventListener("popstate",()=>this.onNavigate());},
        onNavigate(){Logger.info("SPA Navigation detected",{url:location.href});ElementCache.clear();STATE.setFC(Utils.getCurrentFC());
        HazmatIntegration.initialized=false;HazmatIntegration.hazmatDataPromise=null;
        PrepInstructionIntegration.initialized=false;PrepInstructionIntegration.prepDataPromise=null;
        BoxRecIntegration.initialized=false;BoxRecIntegration.boxDataPromise=null;
        AdjacentBins.floorVisible=false;AdjacentBins.floorLoaded=false;
        setTimeout(()=>reinitializeDynamicElements(),CONFIG.ui.delays.medium);},
    };

    // ========================================
    // PRINTER
    // ========================================
    const Printer = {
        send(barcode,quantity,badge="",description=""){return SafeExecute.run(async()=>{const eb=Utils.asciihex(barcode.trim());const ed=description?Utils.asciihex(description):"";const p=`action=print&type=barcode&data=${eb}&text=${eb}&quantity=${quantity}&badgeid=${badge}&desc=${ed}&seq=${Utils.genId()}`;return new Promise((resolve,reject)=>{GM_xmlhttpRequest({method:"GET",url:CONFIG.endpoints.printHost+"?"+p,timeout:CONFIG.performance.timeout,onload:r=>{const s={valid:()=>{SafeExecute.showSuccessToast(`Printed ${quantity}x ${barcode}`);resolve(true);},invalid:()=>{alert("Failed to print!\nCheck printer.");reject(new Error("Printer error"));},default:()=>{alert("Failed to print!\nPrintmon not installed!");reject(new Error("Printmon not installed"));}};(s[r.responseText]||s.default)();},onerror:()=>{alert("Failed to connect to Printmon.");reject(new Error("Connection error"));}});});},"Print",false);},
        showBarcode(text){$(".barcode-modal").remove();const modal=$('<div class="barcode-modal"></div>');const content=$('<div class="barcode-content"></div>');const canvas=$("<canvas></canvas>");const closeBtn=$('<button class="barcode-close">Close</button>');content.append(canvas,closeBtn);modal.append(content);$("body").append(modal);try{JsBarcode(canvas[0],text,{format:"CODE128",width:2,height:100,displayValue:true});}catch(e){content.html('<p style="color:red;">Failed to generate barcode</p>');}closeBtn.on("click",()=>modal.remove());modal.on("click",e=>{if(e.target===modal[0])modal.remove();});},
    };

    // ========================================
    // ASIN TITLE FETCHER
    // ========================================
    const AsinTitle = {
        getFromPage(asin){for(let table of document.querySelectorAll("table.a-keyvalue")){for(let row of table.querySelectorAll("tr")){const c=row.querySelectorAll("th, td");if(c.length>=2){const h=Utils.normalizeText(c[0].textContent);if(h==="TITLE"||h==="TITULO"){const v=(c[1].querySelector("a")?.textContent||c[1].textContent).trim();if(v&&v.length>5)return v;}}}}return null;},
        async fetch(asin){return SafeExecute.run(async()=>new Promise(resolve=>{const fc=$.cookie("fcmenu-warehouseId")||STATE.currentFC;if(!fc)return resolve("No Title Found");GM_xmlhttpRequest({method:"POST",url:`${CONFIG.endpoints.base}/${fc}/results/product`,headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8"},data:`s=${asin}`,timeout:CONFIG.performance.timeout,onload:r=>{try{const doc=new DOMParser().parseFromString(r.responseText,"text/html");for(let table of doc.querySelectorAll("table.a-keyvalue")){for(let row of table.querySelectorAll("tr")){const c=row.querySelectorAll("th, td");if(c.length>=2){const h=Utils.normalizeText(c[0].textContent);if(h==="TITLE"||h==="TITULO"){const title=(c[1].querySelector("a")?.textContent||c[1].textContent).trim();if(title&&title.length>5)return resolve(title);}}}}resolve("No Title Found");}catch(e){resolve("No Title Found");}},onerror:()=>resolve("No Title Found")});}),`Fetch ASIN Title: ${asin}`,false);},
    };

// ========================================
// ASIN PRINTING
// ========================================
const AsinPrinting = {
    productData: { asin: "", fnsku: "", title: "No Title Found" },

    async addButtons() {
        if (!Utils.isFeatureEnabled("asinPrinting")) return;
        return SafeExecute.run(async () => {
            let attempts = 0;
            const maxAttempts = 20;

            const checkTable = () => {
                const table = HazmatIntegration.findProductTable();
                if (!table) { if (++attempts < maxAttempts) setTimeout(checkTable, 200); return; }
                if (table.querySelector(".asin-print-button")) return;

                const rows = table.querySelectorAll("tr");
                let asinRow = null, fnskuRow = null;
                this.productData = { asin: "", fnsku: "", title: "No Title Found" };

                for (let row of rows) {
                    const cells = row.querySelectorAll("th, td");
                    if (cells.length < 2) continue;
                    const header = cells[0].textContent.trim();
                    const nh = Utils.normalizeText(header);
                    const value = (cells[1].querySelector("a")?.textContent || cells[1].textContent).trim();

                    if (nh === "ASIN")                      { this.productData.asin = value; asinRow = row; }
                    if (nh === "FNSKU" || nh === "FNSKU")   { this.productData.fnsku = value; fnskuRow = row; }
                    if (nh === "TITLE" || nh === "TITULO")    this.productData.title = value;
                }

                if (this.productData.fnsku && fnskuRow) {
                    this.addButtonToRow(fnskuRow, this.productData.fnsku, "FNSku", false);
                }

                if (this.productData.asin && asinRow) {
                    const hasFnsku = !!(this.productData.fnsku && fnskuRow);
                    this.addButtonToRow(asinRow, this.productData.asin, "ASIN", hasFnsku);
                }
            };

            checkTable();
        }, "Add ASIN Print Buttons", false);
    },

    addButtonToRow(row, code, type, showFnskuWarning) {
        const cells = row.querySelectorAll("th, td");
        if (cells.length < 2) return;
        const cell = cells[1];
        if (cell.querySelector(".asin-print-button")) return;
        const btn = document.createElement("button");
        btn.className = "asin-print-button";
        btn.textContent = `Print ${type}`;
        btn.addEventListener("click", () => {
            if (showFnskuWarning) {
                this.showFnskuWarningDialog();
            } else {
                this.createDialog(code, type, this.productData.title);
            }
        });
        cell.appendChild(btn);
    },

    showFnskuWarningDialog() {
        $('#print-dialog-backdrop, [id^="print-dialog-"], #fnsku-warning-dialog').remove();
        const backdrop = $('<div id="print-dialog-backdrop">').css({
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
        });
        const dialog = $('<div id="fnsku-warning-dialog">').css({
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            backgroundColor: "#ffffff", padding: "1.5625rem", border: "2px solid #e65100",
            borderRadius: "0.5rem", boxShadow: "0 0.25rem 1.25rem rgba(0,0,0,0.3)",
            zIndex: 10000, color: "#000", fontFamily: "Arial,sans-serif",
            minWidth: "25rem", maxWidth: "31.25rem",
        }).html(`
            <h3 style="margin:0 0 0.9375rem 0;color:#e65100;font-size:1.125rem;
                border-bottom:2px solid #e65100;padding-bottom:0.625rem;">
                ⚠ FNSku disponible
            </h3>
            <p style="margin:0.9375rem 0;color:#333;font-size:0.875rem;line-height:1.6;">
                Este producto tiene un <strong>FNSku</strong> asociado:
            </p>
            <div style="margin:0.75rem 0;padding:0.75rem;background:#fff3e0;border-radius:0.375rem;
                border:1px solid #ffcc02;text-align:center;">
                <span style="font-family:monospace;font-size:1.1rem;font-weight:700;color:#e65100;">
                    ${this.productData.fnsku}
                </span>
            </div>
            <p style="margin:0.9375rem 0 0;color:#333;font-size:0.875rem;line-height:1.6;">
                El FNSku tiene <strong>prioridad sobre el ASIN</strong> para etiquetado.
                ¿Qué deseas imprimir?
            </p>
            <div style="display:flex;gap:0.625rem;margin-top:1.25rem;padding-top:0.9375rem;border-top:1px solid #eee;">
                <button id="warning-print-fnsku"
                    style="flex:1;padding:0.625rem 1.25rem;cursor:pointer;background-color:#183D3D;
                    border:none;border-radius:0.25rem;color:white;font-weight:bold;font-size:0.875rem;">
                    ✓ Print FNSku
                </button>
                <button id="warning-print-asin"
                    style="flex:1;padding:0.625rem 1.25rem;cursor:pointer;background-color:#f0f0f0;
                    border:1px solid #ccc;border-radius:0.25rem;color:#333;font-size:0.875rem;">
                    Print ASIN
                </button>
                <button id="warning-cancel"
                    style="padding:0.625rem 1.25rem;cursor:pointer;background-color:#f0f0f0;
                    border:1px solid #ccc;border-radius:0.25rem;color:#333;font-size:0.875rem;">
                    Cancel
                </button>
            </div>
        `);

        $("body").append(backdrop, dialog);
        const closeDialog = () => { dialog.remove(); backdrop.remove(); };
        backdrop.click(closeDialog);
        $("#warning-cancel").click(closeDialog);
        $("#warning-print-fnsku").click(() => {
            closeDialog();
            this.createDialog(this.productData.fnsku, "FNSku", this.productData.title);
        });
        $("#warning-print-asin").click(() => {
            closeDialog();
            this.createDialog(this.productData.asin, "ASIN", this.productData.title);
        });
    },

    createDialog(code, type, title) {
        $('#print-dialog-backdrop, [id^="print-dialog-"], #fnsku-warning-dialog').remove();
        const backdrop = $('<div id="print-dialog-backdrop">').css({
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
        });
        const dialog = $(`<div id="print-dialog-${code}">`).css({
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            backgroundColor: "#ffffff", padding: "1.5625rem", border: "2px solid #232f3e",
            borderRadius: "0.5rem", boxShadow: "0 0.25rem 1.25rem rgba(0,0,0,0.3)",
            zIndex: 10000, color: "#000", fontFamily: "Arial,sans-serif",
            minWidth: "25rem", maxWidth: "31.25rem",
        }).html(`
            <h3 style="margin:0 0 0.9375rem 0;color:#232f3e;font-size:1.125rem;
                border-bottom:2px solid #ff9900;padding-bottom:0.625rem;">
                Print ${type}: <span style="color:#ff9900;">${code}</span>
            </h3>
            <p style="margin:0.9375rem 0;color:#000;font-size:0.875rem;line-height:1.5;">
                <strong>Title:</strong> ${title}
            </p>
            <div style="margin:1.25rem 0;display:flex;align-items:center;gap:0.625rem;">
                <label for="qtyNum" style="font-weight:bold;font-size:0.875rem;">Quantity:</label>
                <input type="number" id="qtyNum" min="1" max="50" value="1"
                    style="padding:0.5rem 0.75rem;width:5rem;border:2px solid #ddd;
                    border-radius:0.25rem;font-size:0.875rem;">
                <button id="printBtn"
                    style="padding:0.625rem 1.25rem;cursor:pointer;background-color:#ff9900;
                    border:none;border-radius:0.25rem;color:white;font-weight:bold;font-size:0.875rem;">
                    Print
                </button>
                <button id="barcodeBtn"
                    style="padding:0.625rem 1.25rem;cursor:pointer;background-color:#183D3D;
                    border:none;border-radius:0.25rem;color:white;font-weight:bold;font-size:0.875rem;">
                    Show Barcode
                </button>
            </div>
            <div style="text-align:right;margin-top:1.5625rem;padding-top:0.9375rem;border-top:1px solid #eee;">
                <button id="cancelBtn"
                    style="padding:0.625rem 1.25rem;cursor:pointer;background-color:#f0f0f0;
                    border:1px solid #ccc;border-radius:0.25rem;color:#333;font-size:0.875rem;">
                    Cancel
                </button>
            </div>
        `);

        $("body").append(backdrop, dialog);
        const closeDialog = () => { dialog.remove(); backdrop.remove(); };
        backdrop.click(closeDialog);
        $("#cancelBtn").click(closeDialog);
        $("#printBtn").click(() => {
            const q = parseInt($("#qtyNum").val(), 10);
            if (q > 0) {
                Printer.send(code, q, $.cookie("fcmenu-employeeId") || "", title);
                closeDialog();
            } else {
                alert("Please enter a quantity greater than 0");
            }
        });
        $("#barcodeBtn").click(() => { Printer.showBarcode(code); });
        $("#qtyNum").keypress(e => { if (e.key === "Enter") $("#printBtn").click(); });
        $("#qtyNum").focus().select();
    },

    async handleFromMenu(asin) {
        const ld = $("<div>").css({
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            backgroundColor: "#ffffff", padding: "1.25rem", border: "2px solid #232f3e",
            borderRadius: "0.5rem", boxShadow: "0 0.25rem 1.25rem rgba(0,0,0,0.3)",
            zIndex: 10001, color: "#000", fontFamily: "Arial,sans-serif",
        }).html("<p>Loading ASIN information...</p>");
        $("body").append(ld);
        try {
            let title = AsinTitle.getFromPage(asin);
            if (!title) title = await AsinTitle.fetch(asin);
            ld.remove();
            this.createDialog(asin, "ASIN", title);
        } catch (e) { ld.remove(); alert("Error loading ASIN information."); }
    },
};


    // ========================================
    // ALT+CLICK DIVER
    // ========================================
    const AltClickDiver = {
        init(){if(!Utils.isFeatureEnabled("altClickDiver"))return;document.body.addEventListener("click",async event=>{if(event.altKey&&!event.ctrlKey&&!event.shiftKey){event.preventDefault();event.stopPropagation();let t=event.target.innerText.split("\n")[0].trim();if(t&&t.length>0)DiverUtils.openInDiver(t);return;}if(event.altKey&&event.shiftKey&&!event.ctrlKey){event.preventDefault();event.stopPropagation();let bt=event.target.innerText.split("\n")[0].trim();if(!bt){SafeExecute.showErrorToast("No text to print");return;}if(bt.includes("LPN")){if(!confirm(`Barcode: ${bt}\n\nLPN's are unique.\n\nOK to continue.`))return;Printer.send(bt,1,$.cookie("fcmenu-employeeId")||"","");}else{const am=bt.match(/\b(B0|X0)[A-Z0-9]{8}\b/);if(am){let title=AsinTitle.getFromPage(am[0]);if(!title)title=await AsinTitle.fetch(am[0]);Printer.send(am[0],1,$.cookie("fcmenu-employeeId")||"",title);}else Printer.send(bt,1,$.cookie("fcmenu-employeeId")||"","");}SafeExecute.showSuccessToast(`Printed: ${bt}`);return;}},false);},
    };

    // ========================================
    // CONTEXT MENU
    // ========================================
    const ContextMenu = {
        LINKS: [
            { name: "Copy", action: t => Utils.copyToClipboard(t) },
            { name: "Open in New Tab", url: t => `${CONFIG.endpoints.base}/${$.cookie("fcmenu-warehouseId") || STATE.currentFC}/results?s=${t}` },
            { name: "Open in Diver", action: t => DiverUtils.openInDiver(t) },
            { name: "Sacred Timeline", url: t => `https://eu-west-1.prod.sacred-timeline.aft.amazon.dev/searchMaterials?searchValue=${t}` },
            { name: "Abrir en TT SIM", url: t => {
                const query = {"AND":{"keyword":`(${t})`,"status":{"OR":["Assigned",{"OR":["Work In Progress",{"OR":["Researching",{"OR":["Pending",{"OR":["Resolved","Closed"]}]}]}]}]}}};
                return `https://t.corp.amazon.com/issues?q=${encodeURIComponent(JSON.stringify(query))}`;
            }},
            { separator: true },
            { name: "Print", action: t => {
                const asinMatch = t.match(/\b(B0|X0)[A-Z0-9]{8}\b/);
                if (asinMatch) { AsinPrinting.handleFromMenu(asinMatch[0]); }
                else { const q = prompt("How many labels?", "1"); if (q && parseInt(q) > 0) Printer.send(t, q); }
            }},
            { name: "Show Barcode", action: t => Printer.showBarcode(t) },
            { separator: true },
            { name: "Amazon.com", url: t => `https://amazon.com/dp/${t}` },
        ],
        initialized: false,
        init() {
            if (this.initialized) return;
            $(document).on("contextmenu", e => {
                const sel = window.getSelection().toString();
                if (sel && sel.length > 0) return true;
                if ($(e.target).is("input, select, textarea, button")) return true;
                const $t = $(e.target);
                const $l = $t.is("a") ? $t : $t.closest("a");
                let txt = ($l.length ? $l : $t).text().trim();
                if (!txt || txt.length === 0 || txt.length > 200) return true;
                const asinMatch = txt.match(/\b(B0|X0)[A-Z0-9]{8}\b/);
                const poMatch = txt.match(/\b[0-9][A-Z0-9]{7}\b/);
                const value = asinMatch ? asinMatch[0] : poMatch ? poMatch[0] : txt.length < 50 ? txt : null;
                if (value) { this.create(e, value); return false; }
                return true;
            });
            this.initialized = true;
        },
        create(event, value) {
            if (!value || !value.trim()) return;
            event.preventDefault();
            event.stopPropagation();
            $(".custom-context-menu").remove();
            const menu = $('<div class="custom-context-menu">');
            let mx = event.clientX, my = event.clientY;
            menu.css({ position: "fixed", top: my + "px", left: mx + "px", zIndex: 10000, visibility: "hidden" });
            this.LINKS.forEach(link => {
                if (link.separator) { menu.append("<hr/>"); return; }
                const item = $(`<div class="menu-item">${link.name}</div>`);
                if (link.action) item.on("click", () => { link.action(value); menu.remove(); });
                else if (link.url) item.on("click", () => { window.open(link.url(value), "_blank"); menu.remove(); });
                menu.append(item);
            });
            $("body").append(menu);
            const mw = menu.outerWidth(), mh = menu.outerHeight(), ww = $(window).width(), wh = $(window).height();
            if (mx + mw > ww) mx = ww - mw - 10;
            if (my + mh > wh) my = wh - mh - 10;
            if (mx < 0) mx = 10;
            if (my < 0) my = 10;
            menu.css({ top: my + "px", left: mx + "px", visibility: "visible" });
            $(document).one("click contextmenu", () => menu.remove());
        },
    };

    // ========================================
    // FLIPS TO SELLABLE
    // ========================================
    const FlipsToSellable = {
        config:{selectors:{oldOwner:'tr[data-col="inventory-history-old-owner"]',newOwner:'tr[data-col="inventory-history-new-owner"]',searchButton:'span[data-action="inventory-history-search-button"]',table:"#table-inventory-history"},values:{oldOwner:"unsellable",newOwner:"inventory"}},
        counterElement:null,tableObserver:null,quantityColumnIndex:null,
        findInput(row){const s=[()=>row.querySelector('input[type="text"]'),()=>row.querySelector("input.a-input-text"),()=>row.querySelector("input")];for(const st of s){const i=st();if(i)return i;}return null;},
        validateFilters(){const oR=document.querySelector(this.config.selectors.oldOwner);const nR=document.querySelector(this.config.selectors.newOwner);if(!oR||!nR)throw new Error("Advanced filters not open");const oI=this.findInput(oR),nI=this.findInput(nR);if(!oI||!nI)throw new Error("Filter inputs not found");return{oldOwnerInput:oI,newOwnerInput:nI};},
        setInputValue(input,value){input.value=value;input.focus();["input","change","keyup","blur"].forEach(ev=>input.dispatchEvent(new Event(ev,{bubbles:true})));if(typeof $!=="undefined")$(input).trigger("input").trigger("change");},
        findQuantityColumnIndex(){if(this.quantityColumnIndex!==null)return this.quantityColumnIndex;const hr=document.querySelector("#table-inventory-history_wrapper .dataTables_scrollHead thead tr")||document.querySelector(this.config.selectors.table+" thead tr");if(hr)hr.querySelectorAll("th").forEach((th,i)=>{const t=th.textContent.trim().toLowerCase();if(t.includes("cantidad")||t.includes("quantity")||t.includes("qty"))this.quantityColumnIndex=i+1;});return this.quantityColumnIndex||7;},
        calculateQuantitySum(){let total=0;const table=document.querySelector(this.config.selectors.table);if(!table)return 0;const ci=this.findQuantityColumnIndex();table.querySelectorAll("tbody tr").forEach(row=>{if(window.getComputedStyle(row).display!=="none"){let qc=row.querySelector(`td:nth-child(${ci})`);if(!qc||!/^\d+$/.test(qc.textContent.trim()))for(let c of row.querySelectorAll("td"))if(/^\d+$/.test(c.textContent.trim())){qc=c;break;}if(qc)total+=parseInt(qc.textContent.trim(),10)||0;}});return total;},
        updateCounter(){if(!this.counterElement||!Utils.isFeatureEnabled("flipsCounter"))return;this.counterElement.textContent=`Total: ${this.calculateQuantitySum()}`;this.counterElement.style.display="inline-block";},
        startTableObserver(){if(this.tableObserver)this.tableObserver.disconnect();const table=document.querySelector(this.config.selectors.table);if(!table)return;this.tableObserver=new MutationObserver(Utils.debounce(()=>{if(STATE.flipsToSellableActive)this.updateCounter();},500));this.tableObserver.observe(table,{childList:true,subtree:true,attributes:true,attributeFilter:["style","class"]});},
        stopTableObserver(){if(this.tableObserver){this.tableObserver.disconnect();this.tableObserver=null;}},
        async toggle(){return SafeExecute.run(async()=>{const{oldOwnerInput,newOwnerInput}=this.validateFilters();if(STATE.flipsToSellableActive){this.setInputValue(oldOwnerInput,"");this.setInputValue(newOwnerInput,"");STATE.setFlipsToSellable(false);if(this.counterElement)this.counterElement.style.display="none";this.stopTableObserver();SafeExecute.showSuccessToast("Flips filter cleared");}else{this.setInputValue(oldOwnerInput,this.config.values.oldOwner);this.setInputValue(newOwnerInput,this.config.values.newOwner);STATE.setFlipsToSellable(true);await new Promise(r=>setTimeout(r,2000));this.startTableObserver();this.updateCounter();SafeExecute.showSuccessToast("Flips filter applied");}return STATE.flipsToSellableActive;},"Toggle Flips to Sellable",true);},
        createButton(){if(!Validators.isLoginInURL())return;const sb=document.querySelector(this.config.selectors.searchButton);if(!sb||document.getElementById("flipsToSellableButton"))return;this.insertButton(this.buildButton(),sb.parentElement);},
        buildButton(){const w=document.createElement("span");w.id="flipsToSellableButtonContainer";w.className="a-declarative";w.style.cssText="margin-left:0.625rem;display:inline-flex;align-items:center;gap:0.5rem;";const bw=document.createElement("span");bw.className="a-button a-button-base";const bi=document.createElement("span");bi.className="a-button-inner";const btn=document.createElement("button");btn.id="flipsToSellableButton";btn.className="a-button-text";btn.type="button";btn.textContent="Flips to Sellable";btn.addEventListener("click",async e=>{e.preventDefault();e.stopPropagation();const s=await this.toggle();if(s!==null)bw.classList.toggle("flips-active",s);});bi.appendChild(btn);bw.appendChild(bi);w.appendChild(bw);this.counterElement=document.createElement("span");this.counterElement.id="flips-quantity-counter";this.counterElement.textContent="Total: 0";w.appendChild(this.counterElement);return w;},
        insertButton(button,parent){const tb=document.getElementById("todayButtonContainer");const mrb=document.getElementById("maxRangeButtonContainer");const sb=document.querySelector(this.config.selectors.searchButton);if(tb)parent.insertBefore(button,tb.nextSibling);else if(mrb)parent.insertBefore(button,mrb.nextSibling);else parent.insertBefore(button,sb.nextSibling);},
    };

    // ========================================
    // DATAMATRIX GENERATOR
    // ========================================
    const DataMatrixGenerator = {
        initialized: false,
        bwipLoaded: false,
        keydownHandler: null,

        init() {
            if (!Utils.isFeatureEnabled("dataMatrixGenerator")) return;
            if (this.initialized) return;
            if (window.location.href.includes("diver.qts.amazon.dev")) return;
            Logger.info("DataMatrix Generator starting");
            this.loadBwipJs().then(() => {
                Logger.info("bwip-js ready");
                this.bwipLoaded = true;
                this.createTriggerButton();
            }).catch(err => {
                Logger.error("bwip-js load failed", { error: err.message });
                this.bwipLoaded = false;
                this.createTriggerButton();
            });
            this.initialized = true;
        },

        loadBwipJs() {
            return new Promise((resolve, reject) => {
                if (typeof bwipjs !== "undefined") { resolve(); return; }
                const sources = CONFIG.dmx.bwipSources;
                let index = 0;
                function tryNext() {
                    if (index >= sources.length) { reject(new Error("No se pudo cargar bwip-js desde ningun CDN")); return; }
                    const script = document.createElement("script");
                    script.src = sources[index];
                    script.onload = () => { Logger.info(`bwip-js loaded from: ${sources[index]}`); resolve(); };
                    script.onerror = () => { Logger.warn(`bwip-js failed from: ${sources[index]}`); index++; tryNext(); };
                    document.head.appendChild(script);
                }
                tryNext();
            });
        },

        // --- History ---
        historyLoad() {
            try { return JSON.parse(GM_getValue(CONFIG.dmx.historyKey, "[]")); }
            catch (e) { return []; }
        },
        historySave(bins) {
            if (!bins || bins.length === 0) return;
            const history = this.historyLoad();
            const entry = {
                bins: bins,
                date: new Date().toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                count: bins.length
            };
            const key = bins.join(",");
            const filtered = history.filter(h => h.bins.join(",") !== key);
            filtered.unshift(entry);
            if (filtered.length > CONFIG.dmx.historyMax) filtered.length = CONFIG.dmx.historyMax;
            GM_setValue(CONFIG.dmx.historyKey, JSON.stringify(filtered));
        },
        historyClear() {
            GM_setValue(CONFIG.dmx.historyKey, "[]");
        },

        // --- Helpers ---
        isGridVisible() {
            const gv = document.getElementById("dmx-grid-view");
            return gv && gv.style.display !== "none";
        },
        parseBins(raw) {
            return raw.split(/[\n,]+/).map(b => b.trim()).filter(b => b.length > 0).filter((b, i, arr) => arr.indexOf(b) === i);
        },

        // --- DOM ---
        createTriggerButton() {
            if (document.getElementById("dmx-trigger")) return;
            const btn = document.createElement("button");
            btn.id = "dmx-trigger";
            btn.title = "Bin DataMatrix Generator";
            btn.innerHTML = "\u283F";
            btn.addEventListener("click", () => this.openModal());
            document.body.appendChild(btn);
            Logger.debug("DMX trigger button created");
        },

        removeTriggerButton() {
            const btn = document.getElementById("dmx-trigger");
            if (btn) btn.remove();
        },

        openModal() {
            if (document.getElementById("dmx-backdrop")) return;
            if (!this.bwipLoaded) {
                SafeExecute.showErrorToast("La libreria de codigos aun no se ha cargado. Revisa tu conexion o prueba fuera de VPN.");
                return;
            }

            const backdrop = document.createElement("div");
            backdrop.id = "dmx-backdrop";
            backdrop.innerHTML = `
                <div id="dmx-modal">
                    <div id="dmx-header">
                        <span>\u283F Bin DataMatrix Generator</span>
                        <button id="dmx-close">&times;</button>
                    </div>
                    <div id="dmx-body">
                        <div id="dmx-input-view">
                            <textarea id="dmx-textarea" placeholder="Pega las bins aqui, una por linea:&#10;&#10;P-1-A01B02&#10;P-2-C03D04&#10;P-3-E05F06"></textarea>
                            <div id="dmx-hint">Separa las bins por salto de linea, coma o espacio</div>
                            <div id="dmx-error"></div>
                            <div id="dmx-actions">
                                <button id="dmx-generate">Generar Data Matrix</button>
                                <button id="dmx-clear">Limpiar</button>
                            </div>
                            <div id="dmx-history"></div>
                        </div>
                        <div id="dmx-grid-view" style="display:none;">
                            <div id="dmx-grid-header">
                                <span id="dmx-grid-count"></span>
                                <div style="display:flex;gap:8px;">
                                    <button id="dmx-print">\uD83D\uDDA8 Imprimir</button>
                                    <button id="dmx-back">\u2190 Volver</button>
                                </div>
                            </div>
                            <div id="dmx-grid"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);

            document.getElementById("dmx-close").addEventListener("click", () => this.closeModal());
            backdrop.addEventListener("click", e => {
                if (e.target !== backdrop) return;
                if (this.isGridVisible()) return;
                this.closeModal();
            });
            this.keydownHandler = (e) => { if (e.key === "Escape") this.closeModal(); };
            document.addEventListener("keydown", this.keydownHandler);
            document.getElementById("dmx-generate").addEventListener("click", () => this.generate());
            document.getElementById("dmx-clear").addEventListener("click", () => {
                document.getElementById("dmx-textarea").value = "";
                document.getElementById("dmx-textarea").focus();
            });
            document.getElementById("dmx-back").addEventListener("click", () => this.showInputView());
            document.getElementById("dmx-print").addEventListener("click", () => window.print());
            this.renderHistory();
            setTimeout(() => document.getElementById("dmx-textarea").focus(), 100);
        },

        closeModal() {
            const backdrop = document.getElementById("dmx-backdrop");
            if (backdrop) backdrop.remove();
            if (this.keydownHandler) {
                document.removeEventListener("keydown", this.keydownHandler);
                this.keydownHandler = null;
            }
        },

        // --- History UI ---
        renderHistory() {
            const container = document.getElementById("dmx-history");
            if (!container) return;
            const history = this.historyLoad();
            const count = history.length;

            let html = `
                <button id="dmx-history-toggle">
                    <span id="dmx-history-arrow">\u25B6</span>
                    \uD83D\uDCCB Historial
                    ${count > 0 ? `<span id="dmx-history-badge">${count}</span>` : ""}
                </button>
                <div id="dmx-history-content">
            `;

            if (count === 0) {
                html += `<div id="dmx-history-empty">Sin historial</div>`;
            } else {
                html += `<div id="dmx-history-actions"><button id="dmx-history-clear">Borrar todo</button></div><div id="dmx-history-list">`;
                history.forEach((entry, i) => {
                    const preview = entry.bins.join(", ");
                    html += `
                        <div class="dmx-history-item" data-index="${i}">
                            <span class="dmx-history-count">${entry.count}</span>
                            <span class="dmx-history-bins" title="${preview}">${preview}</span>
                            <span class="dmx-history-date">${entry.date}</span>
                        </div>
                    `;
                });
                html += "</div>";
            }
            html += "</div>";
            container.innerHTML = html;

            const toggle = document.getElementById("dmx-history-toggle");
            const content = document.getElementById("dmx-history-content");
            const arrow = document.getElementById("dmx-history-arrow");
            toggle.addEventListener("click", () => {
                const isOpen = content.classList.toggle("open");
                arrow.classList.toggle("open", isOpen);
            });

            container.querySelectorAll(".dmx-history-item").forEach(item => {
                item.addEventListener("click", () => {
                    const idx = parseInt(item.dataset.index);
                    const entry = history[idx];
                    if (!entry) return;
                    const textarea = document.getElementById("dmx-textarea");
                    textarea.value = entry.bins.join("\n");
                    textarea.focus();
                });
            });

            const clearBtn = document.getElementById("dmx-history-clear");
            if (clearBtn) {
                clearBtn.addEventListener("click", e => {
                    e.stopPropagation();
                    this.historyClear();
                    this.renderHistory();
                });
            }
        },

        // --- Logic ---
        generate() {
            const textarea = document.getElementById("dmx-textarea");
            const error = document.getElementById("dmx-error");
            const btn = document.getElementById("dmx-generate");
            const bins = this.parseBins(textarea.value);

            if (bins.length === 0) {
                error.textContent = "No se encontraron bins validas.";
                error.style.display = "block";
                return;
            }
            error.style.display = "none";
            btn.disabled = true;
            btn.dataset.originalText = btn.textContent;
            btn.textContent = "\u23F3 Generando...";

            setTimeout(() => {
                this.historySave(bins);
                this.showGridView(bins);
                btn.disabled = false;
                btn.textContent = btn.dataset.originalText;
            }, 50);
        },

        showInputView() {
            document.getElementById("dmx-input-view").style.display = "block";
            document.getElementById("dmx-grid-view").style.display = "none";
            this.renderHistory();
        },

        showGridView(bins) {
            document.getElementById("dmx-input-view").style.display = "none";
            document.getElementById("dmx-grid-view").style.display = "block";
            document.getElementById("dmx-grid-count").textContent = `${bins.length} bin${bins.length !== 1 ? "s" : ""}`;

            const grid = document.getElementById("dmx-grid");
            grid.innerHTML = "";
            bins.forEach(bin => {
                const card = document.createElement("div");
                card.className = "dmx-card";
                const canvas = document.createElement("canvas");
                const label = document.createElement("div");
                label.className = "dmx-card-label";
                label.textContent = bin;
                card.appendChild(canvas);
                card.appendChild(label);
                grid.appendChild(card);
                try {
                    bwipjs.toCanvas(canvas, { bcid: "datamatrix", text: bin, scale: 4, padding: 1, backgroundcolor: "FFFFFF" });
                } catch (err) {
                    canvas.remove();
                    const errDiv = document.createElement("div");
                    errDiv.className = "dmx-card-error";
                    errDiv.textContent = "Error al generar";
                    card.insertBefore(errDiv, label);
                }
            });
        },
    };


    // ========================================
    // SETTINGS MENU
    // ========================================
    const SettingsMenu = {
        container:null,button:null,isOpen:false,
        init(){this.addSwitchStyles();},
        addSwitchStyles(){GM_addStyle(`.fcr-switch{position:relative;display:inline-block;width:50px;height:26px;flex-shrink:0;}.fcr-switch input{opacity:0;width:0;height:0;}.fcr-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#ccc;transition:0.3s;border-radius:26px;}.fcr-slider:before{position:absolute;content:"";height:20px;width:20px;left:3px;bottom:3px;background-color:white;transition:0.3s;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.2);}.fcr-switch input:checked+.fcr-slider{background-color:#28a745;}.fcr-switch input:checked+.fcr-slider:before{transform:translateX(24px);}.fcr-setting-item{margin-bottom:16px;display:flex;align-items:flex-start;gap:12px;padding:8px;border-radius:8px;transition:background 0.2s;}.fcr-setting-item:hover{background:rgba(24,61,61,0.05);}.fcr-setting-info{flex-grow:1;text-align:left;min-width:0;overflow:hidden;}.fcr-setting-label{font-weight:600;color:#183D3D;font-size:0.875rem;margin-bottom:4px;text-align:left;word-wrap:break-word;overflow-wrap:break-word;}.fcr-setting-desc{font-size:0.75rem;color:#666;line-height:1.4;text-align:left;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;}#fcr-settings-toggle{width:2rem;height:2rem;border-radius:50%;border:2px solid #183D3D;background:white;color:#183D3D;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:1rem;transition:all 0.3s ease;flex-shrink:0;position:relative;z-index:1001;margin-left:0.3125rem;padding:0;}#fcr-settings-toggle:hover{transform:scale(1.1);background:#f0f0f0;}#fcr-controls-container{display:inline-flex;gap:0.3125rem;align-items:center;flex-shrink:0;position:relative;z-index:1000;order:12;}.fcr-fc-label{font-weight:600;color:#183D3D;font-size:0.8rem;display:block;margin-bottom:4px;}.fcr-fc-input{width:100%;padding:6px 10px;border:2px solid #ddd;border-radius:6px;font-size:0.8rem;font-family:monospace;box-sizing:border-box;transition:border-color 0.3s;}.fcr-fc-input:focus{border-color:#183D3D;outline:none;}.fcr-fc-save-btn{width:100%;padding:8px 16px;background:#183D3D;color:white;border:none;border-radius:6px;font-weight:600;font-size:0.8rem;cursor:pointer;transition:all 0.3s;margin-top:8px;}.fcr-fc-save-btn:hover{background:#2C5D5D;transform:translateY(-1px);}`);},
        createButton(){if(document.getElementById("fcr-settings-toggle"))return;this.button=$('<button id="fcr-settings-toggle" title="FCResearch+ Settings">\u2699\uFE0F</button>');this.button.on("click",e=>{e.preventDefault();e.stopPropagation();this.toggle();});const cc=$("#fcr-controls-container");if(cc.length)cc.append(this.button);this.createMenu();},
        createMenu(){if(this.container)return;

        const pf=["quickPrintBar","asinPrinting","fcSelector","altClickDiver","adjacentBins","flipsCounter","hazmatInfo","prepInfo","boxRecInfo","dataMatrixGenerator"];
        const of2=Object.keys(CONFIG.features).filter(f=>!pf.includes(f));

        let html='<div style="margin-bottom:20px;"><h4 style="margin:0 0 15px 0;color:#183D3D;font-size:0.9rem;font-weight:600;">Core Features</h4>';
        pf.forEach(f=>{if(CONFIG.features[f])html+=this.generateSettingHtml(f,CONFIG.features[f]);});html+="</div>";
        if(of2.length>0){html+='<div><h4 style="margin:0 0 15px 0;color:#183D3D;font-size:0.9rem;font-weight:600;">Additional Features</h4>';of2.forEach(f=>html+=this.generateSettingHtml(f,CONFIG.features[f]));html+="</div>";}

        html+='<div style="margin-top:20px;border-top:2px solid #e0e0e0;padding-top:20px;">';
        html+='<h4 style="margin:0 0 15px 0;color:#183D3D;font-size:0.9rem;font-weight:600;">FC Configuration</h4>';
        html+='<div class="fcr-setting-item" style="flex-direction:column;gap:8px;">';
        html+=`<div style="width:100%;"><label class="fcr-fc-label">FC List (comma separated):</label><input type="text" id="fcr-fc-list-input" class="fcr-fc-input" value="${CONFIG.warehouses.list.join(", ")}" placeholder="RMU1, ZAZ1, CDG7"></div>`;
        html+=`<div style="width:100%;"><label class="fcr-fc-label">Default FC:</label><input type="text" id="fcr-fc-default-input" class="fcr-fc-input" value="${CONFIG.warehouses.default}" placeholder="RMU1"></div>`;
        html+='<button id="fcr-fc-save-btn" class="fcr-fc-save-btn">Save FC Configuration</button>';
        html+='</div></div>';

        this.container=$(`<div id="fcr-settings-menu" style="position:absolute;top:calc(100% + 10px);right:0;width:480px;max-height:520px;background:white;border:2px solid #183D3D;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:99998;display:none;overflow:hidden;"><div style="background:linear-gradient(135deg,#183D3D 0%,#2C5D5D 100%);color:white;padding:16px 20px;font-weight:600;display:flex;align-items:center;justify-content:space-between;"><span>FCResearch+ Settings</span><span style="font-size:0.75rem;opacity:0.8;">v${window.FCRPlusVersion}</span></div><div id="fcr-settings-content" style="padding:20px;max-height:420px;overflow-y:auto;overflow-x:hidden;">${html}</div></div>`);
        const cc=$("#fcr-controls-container");if(cc.length)cc.append(this.container);

        this.container.find(".fcr-switch input").on("change",e=>{const f=$(e.target).data("feature");const en=e.target.checked;$.cookie(`cfg-${f}`,en?"1":"0");SafeExecute.showSuccessToast(`${CONFIG.features[f].label} ${en?"enabled":"disabled"}`);this.handleFeatureToggle(f,en);});
        this.container.find("#fcr-fc-save-btn").on("click",()=>this.saveFCConfig());
        $(document).on("click",e=>{if(!$(e.target).closest("#fcr-settings-menu, #fcr-settings-toggle").length&&this.isOpen)this.close();});},

        generateSettingHtml(key,config){const en=Utils.isFeatureEnabled(key);return `<div class="fcr-setting-item"><label class="fcr-switch"><input type="checkbox" data-feature="${key}" ${en?"checked":""}><span class="fcr-slider"></span></label><div class="fcr-setting-info"><div class="fcr-setting-label">${config.label}</div><div class="fcr-setting-desc">${config.description}</div></div></div>`;},

        saveFCConfig(){
            const listInput=document.getElementById("fcr-fc-list-input");
            const defaultInput=document.getElementById("fcr-fc-default-input");
            if(!listInput||!defaultInput)return;
            const rawList=listInput.value.toUpperCase().split(",").map(s=>s.trim()).filter(s=>s.length>0);
            const defaultFC=defaultInput.value.toUpperCase().trim();
            const fcPattern=/^[A-Z0-9]{3,4}$/;
            if(rawList.length===0){SafeExecute.showErrorToast("FC list cannot be empty");return;}
            const invalid=rawList.filter(fc=>!fcPattern.test(fc));
            if(invalid.length>0){SafeExecute.showErrorToast(`Invalid FC: ${invalid.join(", ")}`);return;}
            if(!fcPattern.test(defaultFC)){SafeExecute.showErrorToast("Invalid default FC format");return;}
            if(!rawList.includes(defaultFC)){SafeExecute.showErrorToast("Default FC must be in the list");return;}
            GM_setValue("userFCList",JSON.stringify(rawList));
            GM_setValue("userDefaultFC",defaultFC);
            CONFIG.warehouses.list=rawList;
            CONFIG.warehouses.default=defaultFC;
            $("#fc-selector-container").remove();
            UI.createFCSelector();
            SafeExecute.showSuccessToast("FC configuration saved");
        },

        handleFeatureToggle(feature,enabled){setTimeout(()=>{switch(feature){case"quickPrintBar":const pb=$("#printmonContainer");if(enabled){if(pb.length)pb.css("visibility","visible");else UI.createPrintmonBar();}else{if(pb.length)pb.css("visibility","hidden");}break;case"fcSelector":const fs=$("#fc-selector-container .fc-button");if(enabled){if(fs.length)fs.css("visibility","visible");else UI.createFCSelector();}else{if(fs.length)fs.css("visibility","hidden");}break;case"darkMode":Styles.apply();break;case"adjacentBins":if(enabled)AdjacentBins.attachButton();else{$(".adjacent-bins-button-container").remove();$(".floor-column-header").remove();$(".floor-column").remove();AdjacentBins.floorVisible=false;AdjacentBins.floorLoaded=false;}break;case"hazmatInfo":if(enabled)HazmatIntegration.init();else $(".hazmat-row").remove();break;case"prepInfo":if(enabled)PrepInstructionIntegration.init();else $(".prep-row").remove();break;case"boxRecInfo":if(enabled)BoxRecIntegration.init();else $(".boxrec-row").remove();break;case"dataMatrixGenerator":if(enabled){DataMatrixGenerator.initialized=false;DataMatrixGenerator.init();}else{DataMatrixGenerator.closeModal();DataMatrixGenerator.removeTriggerButton();}break;}},100);},

        toggle(){if(this.isOpen)this.close();else this.open();},
        open(){if(!this.container)return;this.container.slideDown(200);this.isOpen=true;this.container.find(".fcr-switch input").each((i,input)=>{input.checked=Utils.isFeatureEnabled($(input).data("feature"));});},
        close(){if(!this.container)return;this.container.slideUp(200);this.isOpen=false;},
    };

    // ========================================
    // STYLES
    // ========================================
    const Styles = {
        base: `
h6{font-weight:700;text-transform:uppercase;font-size:0.75rem;line-height:1px;padding-bottom:1px;}.logo-fc,.logo-research{font-size:1.25rem;}.aui-nav-search{display:flex !important;align-items:center !important;gap:0.625rem !important;flex-wrap:nowrap !important;margin-top:0 !important;position:relative !important;justify-content:space-between !important;}
.hazmat-row{background-color:#f9f9f9;}.hazmat-label{padding:10px;font-weight:bold;vertical-align:middle;}.hazmat-value{padding:10px;font-weight:bold;vertical-align:middle;}.hazmat-loading{background:linear-gradient(90deg,#e8f5e9 25%,#c8e6c9 50%,#e8f5e9 75%) !important;background-size:200% 100% !important;animation:loading 1s infinite !important;color:#2e7d32 !important;}@keyframes loading{0%{background-position:200% 0;}100%{background-position:-200% 0;}}.hazmat-error{background-color:#ffcccc !important;color:#cc0000 !important;}.hazmat-cached{opacity:0;animation:fadeIn 0.3s ease-in forwards;}@keyframes fadeIn{to{opacity:1;}}
.prep-row{background-color:#f9f9f9;}.prep-label{font-weight:bold;vertical-align:middle;}.prep-value{font-weight:bold;vertical-align:middle;}.prep-loading{background:linear-gradient(90deg,#e3f2fd 25%,#bbdefb 50%,#e3f2fd 75%) !important;background-size:200% 100% !important;animation:loading 1s infinite !important;color:#1565c0 !important;}.prep-has-items{background-color:#e8f5e9 !important;color:#2e7d32 !important;}.prep-no-items{background-color:#f0f0f0 !important;color:#555555 !important;}.prep-certified-no{background-color:#fff3e0 !important;color:#e65100 !important;}.prep-error{background-color:#ffcccc !important;color:#cc0000 !important;}
.boxrec-row{background-color:#f9f9f9;}.boxrec-label{font-weight:bold;vertical-align:middle;}.boxrec-value{font-weight:bold;vertical-align:middle;}.boxrec-loading{background:linear-gradient(90deg,#f3e5f5 25%,#e1bee7 50%,#f3e5f5 75%) !important;background-size:200% 100% !important;animation:loading 1s infinite !important;color:#6a1b9a !important;}.boxrec-has-items{background-color:#f3e5f5 !important;color:#6a1b9a !important;}.boxrec-no-items{background-color:#fff3e0 !important;color:#e65100 !important;}.boxrec-error{background-color:#ffcccc !important;color:#cc0000 !important;}
#csvExportButton{background:white;border-radius:999px;box-shadow:rgba(0,0,0,0.2) 0 0.625rem 1.25rem -0.625rem;color:#183D3D;cursor:pointer;font-family:inherit;font-size:0.75rem;font-weight:700;padding:0.25rem 0.625rem;margin-left:0.625rem;border:1px solid #183D3D;transition:all 0.3s ease;position:relative;z-index:100;}#csvExportButton:hover{background:#f0f0f0;transform:translateY(-1px);}
#printmonContainer{display:inline-flex;align-items:center;gap:0.3125rem;background-color:white;border:0;padding:0.25rem 0.5rem;border-radius:0.375rem;flex-shrink:0;position:relative;z-index:1000;order:-2;margin-right:auto;margin-top:-12px;}#printmonContainer label{font-weight:600;color:#183D3D;font-size:0.6875rem;margin:0;white-space:nowrap;}#printmonContainer input[type="text"],#printmonContainer input[type="number"]{background-color:white;color:#183D3D;border:1px solid #ddd;padding:0.1875rem 0.375rem;border-radius:0.1875rem;font-size:0.75rem;}#printmonContainer input[type="text"]{width:6.25rem;}#printmonContainer input[type="number"]{width:2.8125rem;}
#printmonShortcut{background-color:#183D3D;color:white;border:none;padding:0.25rem 0.625rem;cursor:pointer;border-radius:0.25rem;font-size:0.6875rem;font-weight:600;transition:background-color 0.3s;position:relative;z-index:1001;}#printmonShortcut:hover{background-color:#2C5D5D;}
#fc-selector-container{display:inline-flex;gap:0.3125rem;align-items:center;flex-shrink:0;position:relative;z-index:1000;order:10;margin-left:auto;margin-top:-12px;}.fc-button{padding:0.25rem 0.625rem;border:2px solid #183D3D;background:white;color:#183D3D;cursor:pointer;border-radius:0.3125rem;font-weight:600;font-size:0.6875rem;transition:all 0.3s ease;position:relative;z-index:1001;}.fc-button:hover{background:#f0f0f0;}.fc-button.active{background:#183D3D;color:white;}
#darkModeToggle{width:2rem;height:2rem;border-radius:50%;border:2px solid #183D3D;background:white;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:1rem;transition:all 0.3s ease;flex-shrink:0;position:relative;z-index:1001;}#darkModeToggle:hover{transform:scale(1.1);}
.rs-filter-buttons-container{display:inline-flex;gap:0.3125rem;align-items:center;margin-right:0.9375rem;vertical-align:middle;float:left;position:relative;z-index:100;}#table-inventory-history_filter .a-icon-search{display:none !important;}#table-inventory-history_filter{overflow:visible;padding-top:0.3125rem;padding-bottom:0.3125rem;}#table-inventory-history_filter label{float:right;display:inline-flex !important;align-items:center !important;gap:0.3125rem !important;}#table-inventory-history_filter button,#table-inventory-history_filter .a-button{position:relative;top:0.1875rem;z-index:101;}
.rs-filter-button{padding:0.3125rem 0.875rem;border:2px solid #183D3D;background:white;color:#183D3D;cursor:pointer;border-radius:0.3125rem;font-weight:700;font-size:0.8125rem;transition:all 0.3s ease;min-width:2.8125rem;position:relative;z-index:102;}.rs-filter-button:hover:not(:disabled){background:#f0f0f0;transform:translateY(-1px);}.rs-filter-button.active{background:#183D3D;color:white;box-shadow:0 0 0.625rem rgba(24,61,61,0.5);}.rs-filter-button:disabled{background:#e0e0e0;color:#999;border-color:#ccc;cursor:not-allowed;opacity:0.5;}
#maxRangeButton,#todayButton,#flipsToSellableButton{font-size:0.75rem;font-weight:400;line-height:1.1875rem;position:relative;z-index:100;}.a-button:has(#maxRangeButton),.a-button:has(#todayButton),.a-button:has(#flipsToSellableButton){margin-left:0.625rem;}.a-button.flips-active{background:#28a745 !important;}.a-button.flips-active button{color:white !important;font-weight:700 !important;}#flipsToSellableButtonContainer{display:inline-flex !important;align-items:center !important;gap:0.5rem !important;}#flips-quantity-counter{display:none;padding:0.25rem 0.75rem;background:#28a745;color:white;border-radius:0.25rem;font-weight:700;font-size:0.875rem;white-space:nowrap;animation:pulse 2s ease-in-out infinite;box-shadow:0 2px 8px rgba(40,167,69,0.3);}@keyframes pulse{0%,100%{box-shadow:0 2px 8px rgba(40,167,69,0.3),0 0 0 0 rgba(40,167,69,0.7);}50%{box-shadow:0 2px 8px rgba(40,167,69,0.3),0 0 0 10px rgba(40,167,69,0);}}
.badgePhoto{display:none;position:fixed;background-color:#f37d15;border:2px solid #183D3D;padding:0.3125rem;z-index:10000;border-radius:0.3125rem;box-shadow:0 0.25rem 0.625rem rgba(0,0,0,0.3);}.badgePhoto img{width:6.25rem;height:auto;display:block;}
.custom-context-menu{background:white;border:1px solid #183D3D;border-radius:0.25rem;box-shadow:0 0.125rem 0.3125rem rgba(0,0,0,0.3);padding:0.5rem 0;min-width:9.375rem;max-width:15.625rem;z-index:10000;position:fixed;}.custom-context-menu .menu-item{color:#183D3D;cursor:pointer;padding:0.5rem 1rem;font-size:0.875rem;transition:background-color 0.2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.custom-context-menu .menu-item:hover{background-color:#f0f0f0;}.custom-context-menu hr{border:none;border-top:1px solid #ddd;margin:0.25rem 0;}
.barcode-modal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;}.barcode-content{background:white;padding:1.25rem;border-radius:0.3125rem;text-align:center;}.barcode-close{margin-top:0.625rem;padding:0.3125rem 0.9375rem;background:#183D3D;color:white;border:none;border-radius:0.1875rem;cursor:pointer;}.barcode-close:hover{background:#2C5D5D;}.asin-print-button{margin-left:0.625rem;padding:0.25rem 0.75rem;background:#183D3D;color:white;border:none;border-radius:0.25rem;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all 0.3s ease;}.asin-print-button:hover{background:#2C5D5D;transform:translateY(-1px);box-shadow:0 2px 5px rgba(0,0,0,0.2);}
.asin-image-container{display:none;position:fixed;z-index:10000;background-color:white;padding:0.3125rem;border:1px solid #ccc;border-radius:0.3125rem;box-shadow:0 0.125rem 0.625rem rgba(0,0,0,0.2);}.asin-image-container img{max-width:12.5rem;max-height:12.5rem;}
.adjacent-bins-button-container{margin-bottom:0.625rem;}.adjacent-bins-button{background-color:#183D3D;color:white;border:none;padding:0.5rem 1rem;cursor:pointer;border-radius:0.25rem;font-size:0.8125rem;font-weight:600;transition:all 0.3s ease;position:relative;z-index:100;}.adjacent-bins-button:hover{background-color:#2C5D5D;transform:translateY(-1px);box-shadow:0 0.125rem 0.3125rem rgba(0,0,0,0.2);}.adjacent-bins-button.active{background-color:#28a745;}.adjacent-bins-button.active:hover{background-color:#218838;}
.loading.adjacent_bin_finder_spinner{display:inline-block;margin-left:0.5rem;}.loading.adjacent_bin_finder_spinner i{animation:spin 1s linear infinite;}@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}.floor-column{text-align:center;vertical-align:middle;font-weight:600;}.floor-column-header{text-align:center !important;font-weight:700 !important;}.bin-floor-info{color:#28a745;font-weight:700;font-size:0.8125rem;}.bin-error-info{color:#dc3545;font-weight:600;font-size:0.75rem;}
@keyframes slideIn{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}

/* DataMatrix Generator */
#dmx-trigger{position:fixed;bottom:20px;right:20px;width:48px;height:48px;border-radius:50%;background:#183D3D;color:white;border:none;font-size:20px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:99999;display:flex;align-items:center;justify-content:center;transition:all 0.3s ease;}#dmx-trigger:hover{transform:scale(1.1);background:#2C5D5D;}
#dmx-backdrop{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:100000;display:flex;align-items:center;justify-content:center;}
#dmx-modal{background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:1200px;width:95%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;}
#dmx-header{background:linear-gradient(135deg,#183D3D,#2C5D5D);color:white;padding:16px 20px;font-weight:600;font-size:1rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}
#dmx-close{background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;padding:0;line-height:1;opacity:0.8;transition:opacity 0.2s;}#dmx-close:hover{opacity:1;}
#dmx-body{padding:20px;overflow-y:auto;flex:1;}
#dmx-textarea{width:100%;height:120px;border:2px solid #ddd;border-radius:8px;padding:10px;font-family:monospace;font-size:0.875rem;resize:vertical;box-sizing:border-box;transition:border-color 0.3s;}#dmx-textarea:focus{outline:none;border-color:#183D3D;}#dmx-textarea::placeholder{color:#aaa;}
#dmx-hint{font-size:0.75rem;color:#888;margin:8px 0 16px 0;}
#dmx-actions{display:flex;gap:10px;}
#dmx-generate{flex:1;padding:10px;background:#183D3D;color:white;border:none;border-radius:8px;font-weight:600;font-size:0.875rem;cursor:pointer;transition:all 0.3s;}#dmx-generate:hover{background:#2C5D5D;}#dmx-generate:disabled{background:#ccc;cursor:not-allowed;opacity:0.7;}
#dmx-clear{padding:10px 16px;background:white;color:#666;border:2px solid #ddd;border-radius:8px;font-size:0.875rem;cursor:pointer;transition:all 0.2s;}#dmx-clear:hover{border-color:#999;color:#333;}
#dmx-error{color:#dc3545;font-size:0.8rem;font-weight:600;margin-top:8px;display:none;}
#dmx-history{margin-top:16px;border-top:1px solid #eee;padding-top:12px;}
#dmx-history-toggle{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:4px 0;font-size:0.8rem;font-weight:600;color:#666;width:100%;transition:color 0.2s;}#dmx-history-toggle:hover{color:#183D3D;}
#dmx-history-arrow{display:inline-block;transition:transform 0.2s ease;font-size:0.6rem;}#dmx-history-arrow.open{transform:rotate(90deg);}
#dmx-history-badge{background:#183D3D;color:white;font-size:0.6rem;font-weight:700;padding:1px 6px;border-radius:10px;margin-left:4px;}
#dmx-history-content{overflow:hidden;max-height:0;transition:max-height 0.3s ease;}#dmx-history-content.open{max-height:500px;}
#dmx-history-actions{display:flex;justify-content:flex-end;margin:8px 0 6px 0;}
#dmx-history-clear{font-size:0.7rem;color:#999;background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:4px;transition:all 0.2s;}#dmx-history-clear:hover{color:#dc3545;background:#fff0f0;}
#dmx-history-list{display:flex;flex-direction:column;gap:6px;}
.dmx-history-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #e8e8e8;border-radius:6px;cursor:pointer;transition:all 0.2s;background:#fafafa;}.dmx-history-item:hover{border-color:#183D3D;background:#f0f7f7;}
.dmx-history-count{background:#183D3D;color:white;font-size:0.7rem;font-weight:700;padding:2px 7px;border-radius:10px;flex-shrink:0;}
.dmx-history-bins{font-family:monospace;font-size:0.75rem;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;}
.dmx-history-date{font-size:0.65rem;color:#aaa;flex-shrink:0;white-space:nowrap;}
#dmx-history-empty{font-size:0.75rem;color:#bbb;text-align:center;padding:8px;font-style:italic;}
#dmx-grid-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-shrink:0;}
#dmx-grid-count{font-size:0.85rem;color:#666;font-weight:600;}
#dmx-back{padding:6px 14px;background:none;border:1px solid #ccc;border-radius:6px;color:#666;font-size:0.8rem;cursor:pointer;transition:all 0.2s;}#dmx-back:hover{border-color:#999;color:#333;}
#dmx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:24px;}
.dmx-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 8px;border:2px solid #e0e0e0;border-radius:10px;background:#fafafa;transition:all 0.2s;}.dmx-card:hover{border-color:#183D3D;box-shadow:0 2px 8px rgba(24,61,61,0.15);}
.dmx-card-label{font-family:monospace;font-size:0.75rem;font-weight:700;color:#183D3D;text-align:center;word-break:break-all;line-height:1.3;}
.dmx-card canvas{image-rendering:pixelated;}
.dmx-card-error{color:#dc3545;font-size:0.7rem;font-weight:600;padding:10px;text-align:center;}
#dmx-print{padding:6px 14px;background:#183D3D;color:white;border:none;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;transition:background 0.3s;}#dmx-print:hover{background:#2C5D5D;}
@media print{body>*:not(#dmx-backdrop){display:none !important;}#dmx-backdrop{position:static !important;background:none !important;}#dmx-modal{max-width:100% !important;max-height:none !important;box-shadow:none !important;border:none !important;}#dmx-header,#dmx-grid-header,#dmx-back,#dmx-print{display:none !important;}#dmx-body{overflow:visible !important;}#dmx-grid{grid-template-columns:repeat(5,1fr) !important;gap:8px !important;}.dmx-card{break-inside:avoid;border:1px solid #ccc !important;padding:8px 4px !important;}}

@media (max-width:700px){#dmx-grid{grid-template-columns:repeat(2,1fr);}}
@media (min-width:701px) and (max-width:950px){#dmx-grid{grid-template-columns:repeat(3,1fr);}}
        `,
        dark: `
body,.a-cal-labels,.a-popover-inner{background-color:#1a1a1a;color:#e5e5e5;}table.a-bordered tr:nth-child(2n+1),table.a-bordered tr.odd td{background-color:#2d2d2d !important;}table.a-bordered tr:nth-child(2n),table.a-bordered tr.even td{background-color:#242424 !important;}table.a-bordered td,table.a-bordered th,table.a-bordered,table.a-bordered tr:last-child td{border-color:#404040;color:#e5e5e5;}table.a-bordered tr:first-child th{background:#333333;color:#e5e5e5;border-color:#404040;}.a-box,.a-cal-na,table.a-keyvalue th,.a-box-title .a-box-inner,.a-popover-header,.aui-nav-row,a.a-link-section-expander,.a-expander-content{background-color:#2d2d2d;border-color:#404040;color:#e5e5e5;}.a-box{border-top-color:#404040 !important;}table.a-keyvalue td,table.a-keyvalue th,table.a-keyvalue{border-color:#404040;}.a-keyvalue th{background-color:#3a3a3a !important;color:#e5e5e5 !important;}.a-box-title .a-box-inner,.a-popover-header,.aui-nav-row{background:linear-gradient(to bottom,#2d2d2d,#333333);}h6,.p,.a-popover-inner,body a,.a-nostyle,.a-nostyle span,.logo-fc,.logo-research{color:#e5e5e5 !important;}.a-search input{color:#e5e5e5;background-color:#2d2d2d !important;border:1px solid #404040;}a.a-link-section-expander:hover,a.a-link-section-expander:focus{background-color:#3a3a3a;}.a-section-expander-inner{border-top:1px solid #404040;}
.hazmat-row{background-color:#2d2d2d !important;}.hazmat-label{color:#e5e5e5 !important;}.hazmat-loading{background:linear-gradient(90deg,#1a3a1a 25%,#2a4a2a 50%,#1a3a1a 75%) !important;background-size:200% 100% !important;color:#4ade80 !important;}
.prep-row{background-color:#2d2d2d !important;}.prep-label{color:#e5e5e5 !important;}.prep-loading{background:linear-gradient(90deg,#1a2a3a 25%,#2a3a4a 50%,#1a2a3a 75%) !important;background-size:200% 100% !important;color:#60a5fa !important;}.prep-has-items{background-color:#1a3a1a !important;color:#4ade80 !important;}.prep-no-items{background-color:#2d2d2d !important;color:#999999 !important;}.prep-certified-no{background-color:#3a2a1a !important;color:#fbbf24 !important;}.prep-error{background-color:#3a1a1a !important;color:#f87171 !important;}
.boxrec-row{background-color:#2d2d2d !important;}.boxrec-label{color:#e5e5e5 !important;}.boxrec-loading{background:linear-gradient(90deg,#2a1a3a 25%,#3a2a4a 50%,#2a1a3a 75%) !important;background-size:200% 100% !important;color:#c084fc !important;}.boxrec-has-items{background-color:#2a1a3a !important;color:#c084fc !important;}.boxrec-no-items{background-color:#3a2a1a !important;color:#fbbf24 !important;}.boxrec-error{background-color:#3a1a1a !important;color:#f87171 !important;}
#csvExportButton{background:#ff9900;box-shadow:rgba(255,153,0,0.3) 0 0.625rem 1.25rem -0.625rem;color:#1a1a1a;border:0;font-weight:700;}#csvExportButton:hover{background:#ffad33;}.asin-print-button{background:#ff9900;color:#1a1a1a;}.asin-print-button:hover{background:#ffad33;}
#printmonContainer{background-color:#2d2d2d;border-color:#404040;}#printmonContainer label{color:#e5e5e5;}#printmonContainer input[type="text"],#printmonContainer input[type="number"]{background-color:#1a1a1a;color:#e5e5e5;border-color:#404040;}#printmonShortcut{background-color:#ff9900;color:#1a1a1a;}#printmonShortcut:hover{background-color:#ffad33;}#fc-selector-container{background:transparent;border:none;}.fc-button{background:#2d2d2d;color:#e5e5e5;border-color:#404040;}.fc-button:hover{background:#3a3a3a;border-color:#ff9900;}.fc-button.active{background:#ff9900;color:#1a1a1a;border-color:#ff9900;}#darkModeToggle,#fcr-settings-toggle{background:#2d2d2d;border:2px solid #404040;color:#e5e5e5;}#darkModeToggle:hover,#fcr-settings-toggle:hover{background:#3a3a3a;border-color:#ff9900;}.rs-filter-button{background:#2d2d2d;color:#e5e5e5;border-color:#404040;}.rs-filter-button:hover:not(:disabled){background:#3a3a3a;border-color:#ff9900;}.rs-filter-button.active{background:#ff9900;color:#1a1a1a;border-color:#ff9900;}.rs-filter-button:disabled{background:#1a1a1a;color:#666666;border-color:#333333;}#flips-quantity-counter{background:#4ade80 !important;color:#1a1a1a !important;}.custom-context-menu{background:#2d2d2d;border:1px solid #404040;box-shadow:0 0.25rem 0.625rem rgba(0,0,0,0.5);}.custom-context-menu .menu-item{color:#e5e5e5;}.custom-context-menu .menu-item:hover{background-color:#3a3a3a;}.custom-context-menu hr{border-top:1px solid #404040;}.barcode-content{background:#2d2d2d;color:#e5e5e5;}.barcode-close{background:#ff9900;color:#1a1a1a;}.barcode-close:hover{background:#ffad33;}.asin-image-container{background-color:#2d2d2d;border:1px solid #404040;}.adjacent-bins-button{background:#ff9900;color:#1a1a1a;}.adjacent-bins-button:hover{background:#ffad33;}.adjacent-bins-button.active{background-color:#4ade80;color:#1a1a1a;}.adjacent-bins-button.active:hover{background-color:#22c55e;}.badgePhoto{background-color:#2d2d2d;border:2px solid #ff9900;}.a-button.flips-active{background:#4ade80 !important;}#fcr-settings-menu{background:#2d2d2d !important;border-color:#404040 !important;}#fcr-settings-menu>div:first-child{background:linear-gradient(135deg,#ff9900 0%,#ffad33 100%) !important;color:#1a1a1a !important;}.fcr-setting-label{color:#ff9900 !important;}.fcr-setting-desc{color:#b3b3b3 !important;}.fcr-setting-item:hover{background:rgba(255,153,0,0.1) !important;}

/* DataMatrix Generator — Dark Mode */
#dmx-trigger{background:#ff9900;color:#1a1a1a;}#dmx-trigger:hover{background:#ffad33;}
#dmx-modal{background:#2d2d2d;}
#dmx-header{background:linear-gradient(135deg,#ff9900 0%,#ffad33 100%) !important;color:#1a1a1a !important;}
#dmx-close{color:#1a1a1a !important;}
#dmx-body{background:#2d2d2d;}
#dmx-textarea{background:#1a1a1a;color:#e5e5e5;border-color:#404040;}#dmx-textarea:focus{border-color:#ff9900;}#dmx-textarea::placeholder{color:#666;}
#dmx-hint{color:#999;}
#dmx-generate{background:#ff9900;color:#1a1a1a;}#dmx-generate:hover{background:#ffad33;}#dmx-generate:disabled{background:#404040;color:#666;}
#dmx-clear{background:#2d2d2d;color:#999;border-color:#404040;}#dmx-clear:hover{border-color:#666;color:#e5e5e5;}
#dmx-error{color:#f87171;}
#dmx-history{border-top-color:#404040;}
#dmx-history-toggle{color:#999;}#dmx-history-toggle:hover{color:#ff9900;}
#dmx-history-badge{background:#ff9900;color:#1a1a1a;}
#dmx-history-clear:hover{color:#f87171;background:#3a1a1a;}
.dmx-history-item{background:#1a1a1a;border-color:#404040;}.dmx-history-item:hover{border-color:#ff9900;background:#333;}
.dmx-history-count{background:#ff9900;color:#1a1a1a;}
.dmx-history-bins{color:#e5e5e5;}
.dmx-history-date{color:#666;}
#dmx-history-empty{color:#666;}
#dmx-grid-count{color:#999;}
#dmx-back{border-color:#404040;color:#999;}#dmx-back:hover{border-color:#666;color:#e5e5e5;}
.dmx-card{background:#1a1a1a;border-color:#404040;}.dmx-card:hover{border-color:#ff9900;box-shadow:0 2px 8px rgba(255,153,0,0.15);}
.dmx-card-label{color:#ff9900;}
.dmx-card-error{color:#f87171;}
#dmx-print{background:#ff9900;color:#1a1a1a;}#dmx-print:hover{background:#ffad33;}
        `,
        apply(){GM_addStyle(this.base);const dms=document.getElementById("dark-mode-style");if(Utils.isFeatureEnabled("darkMode")){if(!dms)$("<style id='dark-mode-style'></style>").text(this.dark).appendTo($("body"));$("#darkModeToggle").text("\u2600\uFE0F");}else{if(dms)dms.remove();$("#darkModeToggle").text("\uD83C\uDF19");}},
    };

    // ========================================
    // UI COMPONENTS
    // ========================================
    const UI = {
        async createPrintmonBar(){
            if(!Utils.isFeatureEnabled("quickPrintBar"))return;
            const sb=await Utils.waitForElement(".aui-nav-search").catch(()=>null);
            if(!sb||document.getElementById("printmonContainer"))return;
            const c=$(`<div id="printmonContainer"><label>Quick Print:</label><input type="text" id="barcodeSearchText" placeholder="Barcode/ASIN" autocomplete="off"><input type="number" id="barcodeSearchQuantity" value="1" min="1"><button id="printmonShortcut">Print</button></div>`);
            const hp=async()=>{
                const text=$("#barcodeSearchText").val().trim();
                const qty=$("#barcodeSearchQuantity").val();
                if(!text){SafeExecute.showErrorToast("Enter a barcode or ASIN");return;}
                const badge=$.cookie("fcmenu-employeeId")||"";
                const asinMatch=text.match(/\b(B0|X0)[A-Z0-9]{8}\b/);
                if(asinMatch){
                    const asin=asinMatch[0];
                    $("#printmonShortcut").text("...").prop("disabled",true);
                    try{
                        let title=AsinTitle.getFromPage(asin);
                        if(!title)title=await AsinTitle.fetch(asin);
                        if(!title)title="No Title Found";
                        Printer.send(asin,qty,badge,title);
                    }catch(e){
                        Printer.send(asin,qty,badge,"No Title Found");
                    }
                    $("#printmonShortcut").text("Print").prop("disabled",false);
                }else{
                    Printer.send(text,qty,badge,"");
                }
                $("#barcodeSearchText").val("").focus();
            };
            c.find("#printmonShortcut").on("click",hp);
            c.find("#barcodeSearchText").on("keypress",e=>{if(e.key==="Enter"){e.preventDefault();hp();}});
            $(sb).prepend(c);
        },
        async createFCSelector(){if(!Utils.isFeatureEnabled("fcSelector"))return;const sb=await Utils.waitForElement(".aui-nav-search").catch(()=>null);if(!sb||document.getElementById("fc-selector-container"))return;const c=$('<div id="fc-selector-container"></div>');CONFIG.warehouses.list.forEach(fc=>{const b=$(`<button class="fc-button ${fc===STATE.currentFC?"active":""}">${fc}</button>`);b.on("click",()=>{GM_setValue("selectedFC",fc);const cs=new URLSearchParams(window.location.search).get("s")||"";window.location.href=`${CONFIG.endpoints.base}/${fc}/results${cs?"?s="+cs:""}`;});c.append(b);});$(sb).append(c);},
        async createControlsContainer(){const sb=await Utils.waitForElement(".aui-nav-search").catch(()=>null);if(!sb||document.getElementById("fcr-controls-container"))return;$(sb).append($(`<div id="fcr-controls-container" style="display:inline-flex;gap:0.3125rem;align-items:center;flex-shrink:0;position:relative;z-index:1002;order:12;margin-top:-12px;"></div>`));},
        async createDarkModeToggle(){const cc=await Utils.waitForElement("#fcr-controls-container").catch(()=>null);if(!cc||document.getElementById("darkModeToggle"))return;const toggle=$('<button id="darkModeToggle">\uD83C\uDF19</button>');toggle.on("click",()=>{const ns=$.cookie("cfg-darkMode")==="1"?"0":"1";$.cookie("cfg-darkMode",ns);Styles.apply();SafeExecute.showSuccessToast(`Dark mode ${ns==="1"?"enabled":"disabled"}`);});$(cc).append(toggle);Styles.apply();SettingsMenu.createButton();},
        createRSFilterButtons(){const sfd=document.getElementById("table-inventory-history_filter");if(!sfd||sfd.querySelector(".rs-filter-buttons-container"))return;const si=sfd.querySelector(".a-icon-search");if(si)si.style.display="none";const rfr=document.querySelector('tr[data-col="inventory-history-rs"]');let av=new Set(CONFIG.rsValues);if(rfr){const sel=rfr.querySelector("select.a-input-text");if(sel){av.clear();sel.querySelectorAll("option").forEach(o=>{const v=o.textContent.trim();if(v&&CONFIG.rsValues.includes(v))av.add(v);});}}const bc=document.createElement("div");bc.className="rs-filter-buttons-container";CONFIG.rsValues.forEach(value=>{const btn=document.createElement("button");btn.className="rs-filter-button";btn.textContent=value;btn.dataset.rsValue=value;if(!av.has(value))btn.disabled=true;btn.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();const cv=this.dataset.rsValue;const rf=document.querySelector('tr[data-col="inventory-history-rs"]');if(!rf){alert("Abre los filtros avanzados (+) primero");return;}const sel=rf.querySelector("select.a-input-text");if(!sel)return;if(STATE.activeRSFilter===cv){STATE.setRSFilter(null);sel.value="";this.classList.remove("active");}else{STATE.setRSFilter(cv);sel.value=cv;bc.querySelectorAll(".rs-filter-button").forEach(b=>b.classList.remove("active"));this.classList.add("active");}sel.dispatchEvent(new Event("change",{bubbles:true}));});bc.appendChild(btn);});sfd.insertBefore(bc,sfd.firstChild);new MutationObserver(()=>{const rf=document.querySelector('tr[data-col="inventory-history-rs"]');if(!rf)return;const sel=rf.querySelector("select.a-input-text");if(!sel)return;const sv=sel.value;bc.querySelectorAll(".rs-filter-button").forEach(b=>{if(b.dataset.rsValue===sv&&sv!==""){b.classList.add("active");STATE.setRSFilter(sv);}else{b.classList.remove("active");if(sv==="")STATE.setRSFilter(null);}});}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["value"]});},
        createMaxRangeButton(){const sbc=document.querySelector('span[data-action="inventory-history-search-button"]');if(!sbc||document.getElementById("maxRangeButtonContainer"))return;const p=sbc.parentElement;if(!p)return;const w=document.createElement("span");w.id="maxRangeButtonContainer";w.className="a-declarative";w.style.marginLeft="0.625rem";const bw=document.createElement("span");bw.className="a-button a-button-base";const bi=document.createElement("span");bi.className="a-button-inner";const btn=document.createElement("button");btn.id="maxRangeButton";btn.className="a-button-text";btn.type="button";btn.textContent="Max Range";btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const d=new Date();d.setMonth(d.getMonth()-6);const fd=`${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`;const si=document.getElementById("searchStart");if(!si){alert("Campo de fecha no encontrado");return;}try{Utils.setDateInput(si,fd);setTimeout(()=>{if(si.value!==fd){si.value=fd;$(si).val(fd).trigger("change");}setTimeout(()=>{const sb=document.querySelector('span[data-action="inventory-history-search-button"] button');if(sb)sb.click();},200);},500);SafeExecute.showSuccessToast("Date set to 6 months ago");}catch(er){alert("Error al establecer la fecha.");}});bi.appendChild(btn);bw.appendChild(bi);w.appendChild(bw);p.insertBefore(w,sbc.nextSibling);},
        createTodayButton(){const sbc=document.querySelector('span[data-action="inventory-history-search-button"]');if(!sbc||document.getElementById("todayButtonContainer"))return;const p=sbc.parentElement;if(!p)return;const w=document.createElement("span");w.id="todayButtonContainer";w.className="a-declarative";w.style.marginLeft="0.625rem";const bw=document.createElement("span");bw.className="a-button a-button-base";const bi=document.createElement("span");bi.className="a-button-inner";const btn=document.createElement("button");btn.id="todayButton";btn.className="a-button-text";btn.type="button";btn.textContent="Today";btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const t=new Date();const fd=`${String(t.getMonth()+1).padStart(2,"0")}/${String(t.getDate()).padStart(2,"0")}/${t.getFullYear()}`;const si=document.getElementById("searchStart"),ei=document.getElementById("searchEnd");if(!si||!ei){alert("Campos de fecha no encontrados");return;}try{Utils.setDateInput(si,fd);setTimeout(()=>{Utils.setDateInput(ei,fd);setTimeout(()=>{if(si.value!==fd){si.value=fd;$(si).val(fd).trigger("change");}if(ei.value!==fd){ei.value=fd;$(ei).val(fd).trigger("change");}setTimeout(()=>{const sb=document.querySelector('span[data-action="inventory-history-search-button"] button');if(sb)sb.click();SafeExecute.showSuccessToast("Dates set to today");},200);},500);},300);}catch(er){alert("Error al establecer las fechas.");}});bi.appendChild(btn);bw.appendChild(bi);w.appendChild(bw);const mrb=document.getElementById("maxRangeButtonContainer");if(mrb)p.insertBefore(w,mrb.nextSibling);else p.insertBefore(w,sbc.nextSibling);},
        createFlipsToSellableButton(){FlipsToSellable.createButton();},
    };

    // ========================================
    // ADJACENT BINS
    // ========================================
    const AdjacentBins = {
        floorVisible: false,
        floorLoaded: false,
        find() {
            if (!Utils.isFeatureEnabled("adjacentBins") || $(".floor-column-header").length > 0) return;
            const we = $(".warehouse-id");
            if (!we.length) return;
            const wid = we.text().trim();
            [$("#table-inventory_wrapper .dataTables_scrollHead thead tr"), $("#table-inventory thead tr")].forEach($r => {
                if ($r.length && !$r.find(".floor-column-header").length) {
                    const $ch = $r.find("th:nth-child(1)");
                    if ($ch.length) $ch.after('<th class="floor-column-header sorting_disabled">Floor</th>');
                }
            });
            const $rows = $("#table-inventory tbody tr");
            if (!$rows.length) return;
            $("#table-inventory").parent().css({ height: "auto", "max-height": "800px" });
            $rows.each(function () {
                const $row = $(this), $td = $row.find("td:nth-child(1)");
                if (!$td.length || $td.hasClass("had_adjacent_bins")) return;
                const cid = $td.text().trim();
                if (!cid) return;
                const $fc = $('<td class="floor-column"><span class="loading adjacent_bin_finder_spinner"><i class="s-icon-status"></i></span></td>');
                $td.after($fc);
                GM_xmlhttpRequest({
                    method: "GET",
                    url: `${CONFIG.endpoints.roboscout}/ipa/kpps/get_neighboring_bins/?bin_id=${cid}&building=${wid}`,
                    timeout: CONFIG.performance.timeout,
                    onload: r => {
                        let msg = '<div class="bin-error-info">Error</div>';
                        if (r.responseText.indexOf("Bad Request") !== 0) {
                            try {
                                const j = JSON.parse(r.responseText);
                                msg = `<div class="bin-floor-info">${j[cid]?.floor || "Unknown"}</div>`;
                            } catch (e) { msg = '<div class="bin-error-info">N/A</div>'; }
                        }
                        $fc.html(msg);
                        $td.addClass("had_adjacent_bins");
                    },
                    onerror: () => { $fc.html('<div class="bin-error-info">Error</div>'); $td.addClass("had_adjacent_bins"); }
                });
            });
        },
        hide() { $(".floor-column-header").hide(); $(".floor-column").hide(); },
        show() { $(".floor-column-header").show(); $(".floor-column").show(); },
        attachButton() {
            if (!Utils.isFeatureEnabled("adjacentBins")) return;
            const ib = $('.section-placeholder[data-section-type="inventory"]');
            if (!ib.length || $(".adjacent-bins-button-container").length) return;
            const $bd = $('<div class="adjacent-bins-button-container"></div>');
            const $btn = $('<button class="adjacent-bins-button">Show bin floor</button>');
            $btn.on("click", function () {
                if (!AdjacentBins.floorLoaded) {
                    AdjacentBins.find();
                    AdjacentBins.floorLoaded = true;
                    AdjacentBins.floorVisible = true;
                    $(this).text("Hide bin floor").addClass("active");
                } else if (AdjacentBins.floorVisible) {
                    AdjacentBins.hide();
                    AdjacentBins.floorVisible = false;
                    $(this).text("Show bin floor").removeClass("active");
                } else {
                    AdjacentBins.show();
                    AdjacentBins.floorVisible = true;
                    $(this).text("Hide bin floor").addClass("active");
                }
            });
            $bd.append($btn);
            ib.before($bd);
        },
    };

    // ========================================
    // IMAGE HOVER
    // ========================================
    const ImageHover = {
        container:null,currentAsin:null,initialized:false,
        init(){if(!Utils.isFeatureEnabled("imageHover")||this.initialized)return;this.container=document.createElement("div");this.container.className="asin-image-container";document.body.appendChild(this.container);$(document).on("mouseenter","a",e=>{const t=e.target.textContent.trim();if(Validators.isValidASIN(t))this.handleEnter(e,t);});$(document).on("mouseleave","a",e=>{const t=e.target.textContent.trim();if(Validators.isValidASIN(t))this.handleLeave();});this.initialized=true;},
        handleEnter(event,asin){if(this.currentAsin===asin&&this.container.style.display==="block")return;this.currentAsin=asin;const rect=event.target.getBoundingClientRect();this.container.style.cssText=`display:block;position:fixed;top:${rect.top}px;left:${rect.right+10}px;z-index:10000;background-color:white;padding:0.3125rem;border:1px solid #ccc;border-radius:0.3125rem;box-shadow:0 0.125rem 0.625rem rgba(0,0,0,0.2);`;const cr=this.container.getBoundingClientRect();if(cr.right>window.innerWidth)this.container.style.left=`${rect.left-cr.width-10}px`;const cu=ImageCache.get(asin);if(cu){if(cu==="NO_IMAGE")this.container.innerHTML='<div style="padding:0.5rem;color:#666;font-size:0.75rem;">No image available</div>';else{const img=document.createElement("img");img.src=cu;img.style.maxWidth=img.style.maxHeight="12.5rem";this.container.innerHTML="";this.container.appendChild(img);}return;}this.container.innerHTML='<div style="padding:1.5rem;text-align:center;"><div style="border:3px solid #f3f3f3;border-top:3px solid #ff9900;border-radius:50%;width:2rem;height:2rem;animation:spin 1s linear infinite;margin:0 auto;"></div><div style="margin-top:0.5rem;color:#666;font-size:0.75rem;">Loading...</div></div>';this.fetchImage(asin);},
        fetchImage(asin){const wid=$.cookie("fcmenu-warehouseId")||STATE.currentFC;GM_xmlhttpRequest({method:"POST",url:`${CONFIG.endpoints.base}/${wid}/results/product`,data:`s=${asin}`,headers:{"Content-Type":"application/x-www-form-urlencoded"},timeout:CONFIG.performance.timeout,onload:r=>{try{const doc=new DOMParser().parseFromString(r.responseText,"text/html");const img=doc.querySelector("img, .product-image, [data-image]");if(img?.src){const src=img.src.replace(/^http:/,"https:").replace(/https?:\/\/ecx\.images-amazon\.com/,"https://images-na.ssl-images-amazon.com").replace(/https?:\/\/m\.media-amazon\.com/,"https://m.media-amazon.com");ImageCache.set(asin,src);if(this.container.style.display!=="none"&&this.currentAsin===asin){const pi=document.createElement("img");pi.src=src;pi.style.maxWidth=pi.style.maxHeight="12.5rem";pi.onerror=()=>{ImageCache.set(asin,"NO_IMAGE");this.container.innerHTML='<div style="padding:0.5rem;color:#666;font-size:0.75rem;">Image unavailable</div>';};this.container.innerHTML="";this.container.appendChild(pi);}}else{ImageCache.set(asin,"NO_IMAGE");if(this.container.style.display!=="none"&&this.currentAsin===asin)this.container.innerHTML='<div style="padding:0.5rem;color:#666;font-size:0.75rem;">No image available</div>';}}catch(e){ImageCache.set(asin,"NO_IMAGE");if(this.container.style.display!=="none"&&this.currentAsin===asin)this.container.innerHTML='<div style="padding:0.5rem;color:#666;font-size:0.75rem;">Error loading</div>';}},onerror:()=>{ImageCache.set(asin,"NO_IMAGE");if(this.container.style.display!=="none"&&this.currentAsin===asin)this.container.innerHTML='<div style="padding:0.5rem;color:#666;font-size:0.75rem;">Error loading image</div>';},});},
        handleLeave(){this.container.style.display="none";this.currentAsin=null;},
    };

    // ========================================
    // BADGE PHOTOS
    // ========================================
    const BadgePhotos = {
        container:null,currentLogin:null,initialized:false,
        init(){if(!Utils.isFeatureEnabled("badgePhotos")||this.initialized)return;if(!document.getElementById("badgePhotoContainer")){this.container=document.createElement("div");this.container.id="badgePhotoContainer";this.container.className="badgePhoto";document.body.appendChild(this.container);}else this.container=document.getElementById("badgePhotoContainer");const sels=["#table-problems td:nth-child(6)","#table-inventory-history td:nth-child(9)","#table-receive-history_wrapper td:nth-child(2)","#table-container-history td:nth-child(3)"].join(", ");$(document).on("mouseenter",sels,e=>{const ln=$(e.target).text().trim();if(Validators.isValidLogin(ln))this.handleEnter(e,ln);});$(document).on("mouseleave",sels,()=>this.handleLeave());this.initialized=true;},
        handleEnter(event,loginName){if(this.currentLogin===loginName&&this.container.style.display==="block")return;this.currentLogin=loginName;const rect=event.target.getBoundingClientRect();let pT=rect.top,pL=rect.right+10;if(pL+120>window.innerWidth)pL=rect.left-130;if(pT+120>window.innerHeight)pT=window.innerHeight-130;if(pT<0)pT=10;if(pL<0)pL=rect.right+10;this.container.style.cssText=`display:block;position:fixed;top:${pT}px;left:${pL}px;z-index:10000;background-color:#f37d15;border:2px solid #183D3D;padding:0.3125rem;border-radius:0.3125rem;box-shadow:0 0.25rem 0.625rem rgba(0,0,0,0.3);`;const img=document.createElement("img");img.src=`${CONFIG.endpoints.badgePhotos}/?uid=${loginName}`;img.style.cssText="width:6.25rem;height:auto;display:block;";img.onerror=()=>{this.container.innerHTML='<div style="padding:0.625rem;color:white;font-size:0.75rem;text-align:center;">No photo<br>available</div>';};this.container.innerHTML="";this.container.appendChild(img);},
        handleLeave(){this.container.style.display="none";this.currentLogin=null;},
    };

    // ========================================
    // FEATURES
    // ========================================
    const Features = {
        addCSVExportButton(){const ih=document.querySelector('[data-section-type="inventory"] .section-title');if(!ih||document.getElementById("csvExportButton"))return;const btn=document.createElement("button");btn.id="csvExportButton";btn.textContent="Export to CSV";btn.addEventListener("click",()=>{SafeExecute.run(()=>{const table=document.querySelector("#table-inventory");if(!table){alert("No inventory table found");return;}const csv=[],headers=[];document.querySelector("#table-inventory_wrapper .dataTables_scrollHead thead tr").querySelectorAll("th").forEach(th=>headers.push(th.textContent.trim().replace(/\n/g," ")));csv.push(headers.join(","));table.querySelector("tbody").querySelectorAll("tr").forEach(row=>{const rd=[];row.querySelectorAll("td").forEach(td=>{let t=td.textContent.trim().replace(/\s+/g," ").replace(/"/g,'""');if(t.includes(",")||t.includes('"')||t.includes("\n"))t=`"${t}"`;rd.push(t);});csv.push(rd.join(","));});const blob=new Blob([csv.join("\n")],{type:"text/csv;charset=utf-8;"});const link=document.createElement("a");const ts=new Date().toISOString().replace(/[:. ]/g,"-").slice(0,-5);const fc=window.location.pathname.match(/\/([A-Z0-9]{3,4})\//)?.[1]||"unknown";link.setAttribute("href",URL.createObjectURL(blob));link.setAttribute("download",`inventory_${fc}_${ts}.csv`);link.style.visibility="hidden";document.body.appendChild(link);link.click();document.body.removeChild(link);SafeExecute.showSuccessToast("CSV exported successfully");},"CSV Export",true);});ih.appendChild(btn);},
        convertDateColumns(){document.querySelectorAll("td").forEach(cell=>{const text=cell.textContent.trim();if(Validators.isValidDate(text)){try{const d=new Date(text.replace(/\s[A-Z]+$/,""));if(!isNaN(d.getTime()))cell.textContent=d.toLocaleString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).replace(/\//g,"-");}catch(e){}}});},
    };

    // ========================================
    // REINITIALIZE
    // ========================================
    async function reinitializeDynamicElements(){
        Logger.info("Reinitializing dynamic elements");
        await new Promise(r=>setTimeout(r,CONFIG.ui.delays.medium));
        await SafeExecute.run(()=>{
            UI.createRSFilterButtons();UI.createMaxRangeButton();UI.createTodayButton();
            if(Validators.isLoginInURL())UI.createFlipsToSellableButton();
            AdjacentBins.attachButton();AsinPrinting.addButtons();Features.convertDateColumns();
            HazmatIntegration.init();PrepInstructionIntegration.init();BoxRecIntegration.init();
        },"Reinitialize Dynamic Elements",false);
    }

    // ========================================
    // UNIFIED OBSERVER
    // ========================================
    const UnifiedObserver=new MutationObserver(Utils.debounce(()=>{const sfd=document.getElementById("table-inventory-history_filter");if(sfd&&!document.querySelector(".rs-filter-buttons-container"))UI.createRSFilterButtons();const sb=document.querySelector('[data-action="inventory-history-search-button"]');if(sb&&!document.getElementById("maxRangeButton"))UI.createMaxRangeButton();if(sb&&!document.getElementById("todayButton"))UI.createTodayButton();if(sb&&!document.getElementById("flipsToSellableButton")&&Validators.isLoginInURL())UI.createFlipsToSellableButton();const is=document.querySelector('[data-section-type="inventory"]');if(is&&!document.querySelector(".adjacent-bins-button-container"))AdjacentBins.attachButton();if(is)Features.addCSVExportButton();Features.convertDateColumns();},CONFIG.performance.debounceDelay));
    UnifiedObserver.observe(document.body,{childList:true,subtree:true});

    // ========================================
    // INTRO SCREEN
    // ========================================
    if(window.location.href.includes("/search")){$("body").append(`<div class="a-row"><div class="a-column a-span12 a-text-center" style="color:#f37d15;padding:1.25rem;"><h1 style="margin-bottom:0.3125rem;">FCResearch+ v${window.FCRPlusVersion}</h1><p style="color:#888;font-size:0.875rem;margin-bottom:1.25rem;">Fulfillment Center Research Enhanced</p><div style="margin-bottom:1.875rem;padding:0.9375rem;background:#183D3D;border-radius:0.5rem;max-width:43.75rem;margin-left:auto;margin-right:auto;"><h4 style="color:#f37d15;margin-bottom:0.625rem;">Quick Start</h4><p style="color:#E0E0E0;font-size:0.875rem;margin:0;text-align:left;line-height:1.8;"><strong>Settings Menu:</strong> Click gear icon<br><strong>Quick Print:</strong> Left side of search bar<br><strong>FC Selector:</strong> Right side of search bar<br><strong>Dark Mode:</strong> Toggle button - Default: OFF<br><strong>RS Filters:</strong> M/F/R/X buttons (Inventory History)<br><strong>Max Range / Today:</strong> Date range buttons<br><strong>Flips to Sellable:</strong> Filter unsellable to inventory + counter<br><strong>Bin Floor:</strong> Toggleable floor info from Roboscout<br><strong>Hazmat Info:</strong> PanDash integration<br><strong>Prep Instructions:</strong> Prep Manager integration<br><strong>Box Recommendation:</strong> Box Rec Browser integration<br><strong>DataMatrix Generator:</strong> Bin DataMatrix codes with grid view and history<br><strong>Alt+Click:</strong> Open in Diver<br><strong>Alt+Shift+Click:</strong> Quick print<br><strong>Right-Click:</strong> Context menu with Diver<br><strong>Hover:</strong> ASIN images and Badge photos</p></div><div style="margin-top:1.875rem;color:#666;font-size:0.75rem;"><p>Developed by josexmor</p></div></div></div>`);}

    // ========================================
    // MAIN INIT
    // ========================================
    async function init(){
        Logger.info(`FCResearch+ v${window.FCRPlusVersion} starting`);
        if(window.location.href.includes("diver.qts.amazon.dev")){DiverAutoSearch.init();return;}
        Utils.initializeCookies();Styles.apply();SettingsMenu.init();
        await SafeExecute.run(()=>UI.createPrintmonBar(),"Printmon Bar",false);
        await SafeExecute.run(()=>UI.createFCSelector(),"FC Selector",false);
        await SafeExecute.run(()=>UI.createControlsContainer(),"Controls Container",false);
        await SafeExecute.run(()=>UI.createDarkModeToggle(),"Dark Mode",false);
        await new Promise(r=>setTimeout(r,CONFIG.ui.delays.short));
        await SafeExecute.run(()=>UI.createRSFilterButtons(),"RS Filters",false);
        await SafeExecute.run(()=>UI.createMaxRangeButton(),"Max Range",false);
        await SafeExecute.run(()=>UI.createTodayButton(),"Today Button",false);
        if(Validators.isLoginInURL())await SafeExecute.run(()=>UI.createFlipsToSellableButton(),"Flips Button",false);
        await SafeExecute.run(()=>AdjacentBins.attachButton(),"Adjacent Bins",false);
        await SafeExecute.run(()=>AsinPrinting.addButtons(),"ASIN Printing",false);
        await SafeExecute.run(()=>Features.convertDateColumns(),"Date Columns",false);
        await SafeExecute.run(()=>HazmatIntegration.init(),"Hazmat Integration",false);
        await SafeExecute.run(()=>PrepInstructionIntegration.init(),"Prep Integration",false);
        await SafeExecute.run(()=>BoxRecIntegration.init(),"BoxRec Integration",false);
        await SafeExecute.run(()=>DataMatrixGenerator.init(),"DataMatrix Generator",false);
        AltClickDiver.init();ContextMenu.init();ImageHover.init();BadgePhotos.init();NavigationDetector.init();
        Logger.info("FCResearch+ fully loaded");SafeExecute.showSuccessToast(`FCResearch+ v${window.FCRPlusVersion} loaded!`);
        setTimeout(()=>Logger.info("Cache statistics",ImageCache.getStats()),CONFIG.ui.delays.veryLong);
    }

    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
    EventBus.on("fc:changed",d=>Logger.info("FC changed",d));
    EventBus.on("rsfilter:changed",d=>Logger.info("RS filter changed",d));
    EventBus.on("flips:changed",d=>Logger.info("Flips changed",d));

})();
