// ==UserScript==
// @name         Concessions España
// @namespace    https://amazoneur.sharepoint.com
// @version      5.0
// @description  Carga Concessions ES en SharePoint
// @author       Eric Ezquerro Grau
// @match        https://amazoneur.sharepoint.com/sites/ESconcessions/SitePages/*
// @grant        GM_addElement
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const HTML_URL = 'https://amazoneur.sharepoint.com/sites/ESconcessions/SiteAssets/ConcessionsES.html';

  GM_addElement(document.head, 'link', {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
  });

  const root = document.createElement('div');
  root.id = 'concessions-root';
  root.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:#0a0e17;overflow-y:auto;';
  document.body.appendChild(root);

  GM_xmlhttpRequest({
    method: 'GET',
    url: HTML_URL,
    onload: function(res) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(res.responseText, 'text/html');
      doc.querySelectorAll('style').forEach(s => {
        const ns = document.createElement('style');
        ns.textContent = s.textContent;
        document.head.appendChild(ns);
      });
      root.innerHTML = doc.body.innerHTML;
      root.querySelectorAll('script').forEach(s => s.remove());
      const scripts = doc.querySelectorAll('script');
      const execScripts = (i) => {
        if (i >= scripts.length) return;
        const old = scripts[i];
        const ns = document.createElement('script');
        if (old.src) { ns.src = old.src; ns.onload = () => execScripts(i + 1); }
        else { ns.textContent = old.textContent; execScripts(i + 1); }
        document.body.appendChild(ns);
      };
      execScripts(0);
    }
  });

})();
