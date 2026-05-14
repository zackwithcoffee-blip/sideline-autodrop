// ==UserScript==
// @name         KAMI - EU Bincheck Assistant v2
// @namespace    http://tampermonkey.net/
// @version      7.6
// @updateURL     https://tamarin.aces.amazon.dev/scripts/kami-eu-bincheck-assistant/install.user.js
// @downloadURL   https://tamarin.aces.amazon.dev/scripts/kami-eu-bincheck-assistant/install.user.js
// @description  Compara títulos, variantes, imágenes, atributos, dimensiones, peso Amazon EU + Smart Anomaly Detection v4 + ISS Summary + i18n (ES/EN/DE/FR/IT)
// @author       graueric
// @include      *://*.amazon.*/dp/*
// @include      *://*.amazon.*/*/dp/*
// @include      *://*.amazon.*/gp/product/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *
// ==/UserScript==

(function () {
  'use strict';

  var VERSION = '7.6';

  // ══════════════════════════════════════════════════════════════
  // i18n — TRANSLATIONS
  // ══════════════════════════════════════════════════════════════
  var TRANSLATIONS = {
    es: {
      btnLabel:        '🇪🇺 HELP ME, KAMI!',
      btnLoading:      '⏳ Cargando...',
      headerTitle:     '🇪🇺 KAMI v{v} — EU Bincheck · ASIN: {asin}',
      diffOff:         '🔍 Diff OFF',
      diffOn:          '🔍 Diff ON',
      clearCache:      '🗑️ Caché',
      clearCacheDone:  '✅ Limpiado',
      exportCSV:       '📥 CSV',
      copyBtn:         '📋 Copiar',
      copyDone:        '✅ Copiado!',
      progressReady:   'Listo',
      summaryOk:       '✅ {found} encontrados | ❌ {notfound} no disponibles',
      errorsDetected:  '🔴 {n} errores detectados',
      noErrors:        '✓ Sin errores',
      analyzing:       'Analizando…',
      loading:         'cargando…',
      notAvailable:    'No disponible',
      verify:          '🔗 Verificar',
      viewOnAmazon:    '🔗 Ver en Amazon',
      noData:          '—',
      noVariants:      'Sin variantes',
      noAttributes:    'Sin atributos',
      seeAttribs:      '📋 Ver {n} atributos',
      hideAttribs:     '🔼 Ocultar',
      noAsin:          'No se detectó ASIN',
      noMpSelected:    'Selecciona al menos un marketplace',
      rowImg:          '🖼️ Imagen',
      rowTitle:        '📝 Título',
      rowPrice:        '💶 Precio',
      rowVariants:     '🏷️ Variantes',
      rowSpecs:        '📐 Specs',
      rowBullets:      '📋 Atributos',
      rowISS:          '🎫\nTickets\nISS',
      issOpened:       '🎫 ISS abierto',
      issClickHint:    '🎯 Ve a la pestaña ISS y haz click',
      fieldType:       'Tipo',
      fieldModel:      'Modelo',
      fieldGL:         'GL',
      fieldNoGL:       '⚠️ Sin detectar',
      fieldMP:         'Marketplace',
      fieldASIN:       'ASIN',
      fieldEAN:        'EAN',
      fieldNA:         'N/A',
      labelImageUpdate:'🖼️ Image Update',
      labelTitleUpdate:'📝 Title Update',
      labelDetailIssue:'🏷️ Detail Page Issue',
      anomalyErrors:   '🔴 Errores detectados',
      anomalyDim:      '📐 Dimensiones: {val} cm (ref: {ref} cm)',
      anomalyWeight:   '⚖️ Peso: {val}g (ref: {ref}g)',
      anomalyImg:      '🖼️ Imagen diferente al resto',
      anomalyTitle:    '📝 Título muy diferente: {n} chars (media: {avg})',
      anomalyTechDiff: '{icon} {label} diferente: "{val}" (mayoría: "{maj}")',
      anomalyVariant:  '{icon} {canonical}: "{val}" (ref: "{ref}")',
      badgeCurrent:    'ACTUAL',
      badgeCache:      '⚡ caché',
      dimLabel:        'Dim',
      weightLabel:     'Peso',
      wordsLabel:      'palabras',
      charsLabel:      'chars',
      csvHeader:       'Marketplace,Idioma,Precio,Titulo,Caracteres,Variantes,Dimensiones,Dim_norm_cm,Peso,Peso_norm_g,Tickets_Image,Tickets_Title,Tickets_Detail,URL\n',
      langLabel:       '🌐 Idioma',
    },
    en: {
      btnLabel:        '🇪🇺 HELP ME, KAMI!',
      btnLoading:      '⏳ Loading...',
      headerTitle:     '🇪🇺 KAMI v{v} — EU Bincheck · ASIN: {asin}',
      diffOff:         '🔍 Diff OFF',
      diffOn:          '🔍 Diff ON',
      clearCache:      '🗑️ Cache',
      clearCacheDone:  '✅ Cleared',
      exportCSV:       '📥 CSV',
      copyBtn:         '📋 Copy',
      copyDone:        '✅ Copied!',
      progressReady:   'Ready',
      summaryOk:       '✅ {found} found | ❌ {notfound} unavailable',
      errorsDetected:  '🔴 {n} errors detected',
      noErrors:        '✓ No errors',
      analyzing:       'Analysing…',
      loading:         'loading…',
      notAvailable:    'Not available',
      verify:          '🔗 Verify',
      viewOnAmazon:    '🔗 View on Amazon',
      noData:          '—',
      noVariants:      'No variants',
      noAttributes:    'No attributes',
      seeAttribs:      '📋 Show {n} attributes',
      hideAttribs:     '🔼 Hide',
      noAsin:          'ASIN not detected',
      noMpSelected:    'Select at least one marketplace',
      rowImg:          '🖼️ Image',
      rowTitle:        '📝 Title',
      rowPrice:        '💶 Price',
      rowVariants:     '🏷️ Variants',
      rowSpecs:        '📐 Specs',
      rowBullets:      '📋 Attributes',
      rowISS:          '🎫\nTickets\nISS',
      issOpened:       '🎫 ISS opened',
      issClickHint:    '🎯 Go to the ISS tab and click',
      fieldType:       'Type',
      fieldModel:      'Model',
      fieldGL:         'GL',
      fieldNoGL:       '⚠️ Not detected',
      fieldMP:         'Marketplace',
      fieldASIN:       'ASIN',
      fieldEAN:        'EAN',
      fieldNA:         'N/A',
      labelImageUpdate:'🖼️ Image Update',
      labelTitleUpdate:'📝 Title Update',
      labelDetailIssue:'🏷️ Detail Page Issue',
      anomalyErrors:   '🔴 Errors detected',
      anomalyDim:      '📐 Dimensions: {val} cm (ref: {ref} cm)',
      anomalyWeight:   '⚖️ Weight: {val}g (ref: {ref}g)',
      anomalyImg:      '🖼️ Image differs from others',
      anomalyTitle:    '📝 Title very different: {n} chars (avg: {avg})',
      anomalyTechDiff: '{icon} {label} differs: "{val}" (majority: "{maj}")',
      anomalyVariant:  '{icon} {canonical}: "{val}" (ref: "{ref}")',
      badgeCurrent:    'CURRENT',
      badgeCache:      '⚡ cached',
      dimLabel:        'Dim',
      weightLabel:     'Weight',
      wordsLabel:      'words',
      charsLabel:      'chars',
      csvHeader:       'Marketplace,Language,Price,Title,Characters,Variants,Dimensions,Dim_norm_cm,Weight,Weight_norm_g,Tickets_Image,Tickets_Title,Tickets_Detail,URL\n',
      langLabel:       '🌐 Language',
    },
    de: {
      btnLabel:        '🇪🇺 HILF MIR, KAMI!',
      btnLoading:      '⏳ Lädt...',
      headerTitle:     '🇪🇺 KAMI v{v} — EU Bincheck · ASIN: {asin}',
      diffOff:         '🔍 Diff AUS',
      diffOn:          '🔍 Diff AN',
      clearCache:      '🗑️ Cache',
      clearCacheDone:  '✅ Geleert',
      exportCSV:       '📥 CSV',
      copyBtn:         '📋 Kopieren',
      copyDone:        '✅ Kopiert!',
      progressReady:   'Bereit',
      summaryOk:       '✅ {found} gefunden | ❌ {notfound} nicht verfügbar',
      errorsDetected:  '🔴 {n} Fehler erkannt',
      noErrors:        '✓ Keine Fehler',
      analyzing:       'Analysiert…',
      loading:         'lädt…',
      notAvailable:    'Nicht verfügbar',
      verify:          '🔗 Prüfen',
      viewOnAmazon:    '🔗 Auf Amazon ansehen',
      noData:          '—',
      noVariants:      'Keine Varianten',
      noAttributes:    'Keine Attribute',
      seeAttribs:      '📋 {n} Attribute anzeigen',
      hideAttribs:     '🔼 Ausblenden',
      noAsin:          'ASIN nicht erkannt',
      noMpSelected:    'Mindestens einen Marktplatz auswählen',
      rowImg:          '🖼️ Bild',
      rowTitle:        '📝 Titel',
      rowPrice:        '💶 Preis',
      rowVariants:     '🏷️ Varianten',
      rowSpecs:        '📐 Specs',
      rowBullets:      '📋 Attribute',
      rowISS:          '🎫\nTickets\nISS',
      issOpened:       '🎫 ISS geöffnet',
      issClickHint:    '🎯 Zum ISS-Tab gehen und klicken',
      fieldType:       'Typ',
      fieldModel:      'Modell',
      fieldGL:         'GL',
      fieldNoGL:       '⚠️ Nicht erkannt',
      fieldMP:         'Marktplatz',
      fieldASIN:       'ASIN',
      fieldEAN:        'EAN',
      fieldNA:         'N/A',
      labelImageUpdate:'🖼️ Image Update',
      labelTitleUpdate:'📝 Title Update',
      labelDetailIssue:'🏷️ Detail Page Issue',
      anomalyErrors:   '🔴 Fehler erkannt',
      anomalyDim:      '📐 Abmessungen: {val} cm (Ref: {ref} cm)',
      anomalyWeight:   '⚖️ Gewicht: {val}g (Ref: {ref}g)',
      anomalyImg:      '🖼️ Bild weicht von anderen ab',
      anomalyTitle:    '📝 Titel stark abweichend: {n} Zeichen (Ø: {avg})',
      anomalyTechDiff: '{icon} {label} weicht ab: „{val}" (Mehrheit: „{maj}")',
      anomalyVariant:  '{icon} {canonical}: „{val}" (Ref: „{ref}")',
      badgeCurrent:    'AKTUELL',
      badgeCache:      '⚡ Cache',
      dimLabel:        'Abm.',
      weightLabel:     'Gewicht',
      wordsLabel:      'Wörter',
      charsLabel:      'Zeichen',
      csvHeader:       'Marktplatz,Sprache,Preis,Titel,Zeichen,Varianten,Abmessungen,Abm_norm_cm,Gewicht,Gewicht_norm_g,Tickets_Image,Tickets_Title,Tickets_Detail,URL\n',
      langLabel:       '🌐 Sprache',
    },
    fr: {
      btnLabel:        '🇪🇺 AIDE-MOI, KAMI!',
      btnLoading:      '⏳ Chargement...',
      headerTitle:     '🇪🇺 KAMI v{v} — EU Bincheck · ASIN: {asin}',
      diffOff:         '🔍 Diff OFF',
      diffOn:          '🔍 Diff ON',
      clearCache:      '🗑️ Cache',
      clearCacheDone:  '✅ Vidé',
      exportCSV:       '📥 CSV',
      copyBtn:         '📋 Copier',
      copyDone:        '✅ Copié!',
      progressReady:   'Prêt',
      summaryOk:       '✅ {found} trouvés | ❌ {notfound} indisponibles',
      errorsDetected:  '🔴 {n} erreurs détectées',
      noErrors:        '✓ Aucune erreur',
      analyzing:       'Analyse en cours…',
      loading:         'chargement…',
      notAvailable:    'Non disponible',
      verify:          '🔗 Vérifier',
      viewOnAmazon:    '🔗 Voir sur Amazon',
      noData:          '—',
      noVariants:      'Pas de variantes',
      noAttributes:    'Pas d\'attributs',
      seeAttribs:      '📋 Afficher {n} attributs',
      hideAttribs:     '🔼 Masquer',
      noAsin:          'ASIN non détecté',
      noMpSelected:    'Sélectionnez au moins un marketplace',
      rowImg:          '🖼️ Image',
      rowTitle:        '📝 Titre',
      rowPrice:        '💶 Prix',
      rowVariants:     '🏷️ Variantes',
      rowSpecs:        '📐 Specs',
      rowBullets:      '📋 Attributs',
      rowISS:          '🎫\nTickets\nISS',
      issOpened:       '🎫 ISS ouvert',
      issClickHint:    '🎯 Allez dans l\'onglet ISS et cliquez',
      fieldType:       'Type',
      fieldModel:      'Modèle',
      fieldGL:         'GL',
      fieldNoGL:       '⚠️ Non détecté',
      fieldMP:         'Marketplace',
      fieldASIN:       'ASIN',
      fieldEAN:        'EAN',
      fieldNA:         'N/A',
      labelImageUpdate:'🖼️ Image Update',
      labelTitleUpdate:'📝 Title Update',
      labelDetailIssue:'🏷️ Detail Page Issue',
      anomalyErrors:   '🔴 Erreurs détectées',
      anomalyDim:      '📐 Dimensions : {val} cm (réf : {ref} cm)',
      anomalyWeight:   '⚖️ Poids : {val}g (réf : {ref}g)',
      anomalyImg:      '🖼️ Image différente des autres',
      anomalyTitle:    '📝 Titre très différent : {n} caractères (moy : {avg})',
      anomalyTechDiff: '{icon} {label} différent : "{val}" (majorité : "{maj}")',
      anomalyVariant:  '{icon} {canonical} : "{val}" (réf : "{ref}")',
      badgeCurrent:    'ACTUEL',
      badgeCache:      '⚡ cache',
      dimLabel:        'Dim',
      weightLabel:     'Poids',
      wordsLabel:      'mots',
      charsLabel:      'caractères',
      csvHeader:       'Marketplace,Langue,Prix,Titre,Caractères,Variantes,Dimensions,Dim_norm_cm,Poids,Poids_norm_g,Tickets_Image,Tickets_Title,Tickets_Detail,URL\n',
      langLabel:       '🌐 Langue',
    },
    it: {
      btnLabel:        '🇪🇺 AIUTAMI, KAMI!',
      btnLoading:      '⏳ Caricamento...',
      headerTitle:     '🇪🇺 KAMI v{v} — EU Bincheck · ASIN: {asin}',
      diffOff:         '🔍 Diff OFF',
      diffOn:          '🔍 Diff ON',
      clearCache:      '🗑️ Cache',
      clearCacheDone:  '✅ Svuotato',
      exportCSV:       '📥 CSV',
      copyBtn:         '📋 Copia',
      copyDone:        '✅ Copiato!',
      progressReady:   'Pronto',
      summaryOk:       '✅ {found} trovati | ❌ {notfound} non disponibili',
      errorsDetected:  '🔴 {n} errori rilevati',
      noErrors:        '✓ Nessun errore',
      analyzing:       'Analisi in corso…',
      loading:         'caricamento…',
      notAvailable:    'Non disponibile',
      verify:          '🔗 Verifica',
      viewOnAmazon:    '🔗 Vedi su Amazon',
      noData:          '—',
      noVariants:      'Nessuna variante',
      noAttributes:    'Nessun attributo',
      seeAttribs:      '📋 Mostra {n} attributi',
      hideAttribs:     '🔼 Nascondi',
      noAsin:          'ASIN non rilevato',
      noMpSelected:    'Seleziona almeno un marketplace',
      rowImg:          '🖼️ Immagine',
      rowTitle:        '📝 Titolo',
      rowPrice:        '💶 Prezzo',
      rowVariants:     '🏷️ Varianti',
      rowSpecs:        '📐 Specs',
      rowBullets:      '📋 Attributi',
      rowISS:          '🎫\nTickets\nISS',
      issOpened:       '🎫 ISS aperto',
      issClickHint:    '🎯 Vai alla scheda ISS e clicca',
      fieldType:       'Tipo',
      fieldModel:      'Modello',
      fieldGL:         'GL',
      fieldNoGL:       '⚠️ Non rilevato',
      fieldMP:         'Marketplace',
      fieldASIN:       'ASIN',
      fieldEAN:        'EAN',
      fieldNA:         'N/A',
      labelImageUpdate:'🖼️ Image Update',
      labelTitleUpdate:'📝 Title Update',
      labelDetailIssue:'🏷️ Detail Page Issue',
      anomalyErrors:   '🔴 Errori rilevati',
      anomalyDim:      '📐 Dimensioni: {val} cm (rif: {ref} cm)',
      anomalyWeight:   '⚖️ Peso: {val}g (rif: {ref}g)',
      anomalyImg:      '🖼️ Immagine diversa dalle altre',
      anomalyTitle:    '📝 Titolo molto diverso: {n} caratteri (media: {avg})',
      anomalyTechDiff: '{icon} {label} diverso: "{val}" (maggioranza: "{maj}")',
      anomalyVariant:  '{icon} {canonical}: "{val}" (rif: "{ref}")',
      badgeCurrent:    'ATTUALE',
      badgeCache:      '⚡ cache',
      dimLabel:        'Dim',
      weightLabel:     'Peso',
      wordsLabel:      'parole',
      charsLabel:      'caratteri',
      csvHeader:       'Marketplace,Lingua,Prezzo,Titolo,Caratteri,Varianti,Dimensioni,Dim_norm_cm,Peso,Peso_norm_g,Tickets_Image,Tickets_Title,Tickets_Detail,URL\n',
      langLabel:       '🌐 Lingua',
    }
  };

  // Detect default language from current Amazon domain
  function detectDefaultLang() {
    var host = window.location.hostname;
    if (host === 'www.amazon.de') return 'de';
    if (host === 'www.amazon.co.uk') return 'en';
    if (host === 'www.amazon.it') return 'it';
    if (host === 'www.amazon.fr') return 'fr';
    // saved preference wins
    var saved = null;
    try { saved = GM_getValue('kami_lang', null); } catch(e) {}
    if (saved && TRANSLATIONS[saved]) return saved;
    return 'es';
  }

  var currentLang = detectDefaultLang();

  function t(key) {
    var d = TRANSLATIONS[currentLang] || TRANSLATIONS['es'];
    return d[key] !== undefined ? d[key] : (TRANSLATIONS['es'][key] || key);
  }

  function tf(key, vars) {
    var str = t(key);
    if (vars) Object.keys(vars).forEach(function(k) { str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
    return str;
  }

  // ══════════════════════════════════════════════════════════════
  // MARKETPLACES & FC MAP
  // ══════════════════════════════════════════════════════════════
  var marketplaces = [
    { code: 'ES', domain: 'www.amazon.es',    flag: '🇪🇸', lang: 'Español'      },
    { code: 'FR', domain: 'www.amazon.fr',    flag: '🇫🇷', lang: 'Français'     },
    { code: 'IT', domain: 'www.amazon.it',    flag: '🇮🇹', lang: 'Italiano'     },
    { code: 'DE', domain: 'www.amazon.de',    flag: '🇩🇪', lang: 'Deutsch'      },
    { code: 'UK', domain: 'www.amazon.co.uk', flag: '🇬🇧', lang: 'English (UK)' }
  ];

  var fcNameByMarketplace = { 'ES':'MAD4','IT':'MXP5','DE':'LEJ1','FR':'ORY1','UK':'LTN4' };

  // ══════════════════════════════════════════════════════════════
  // NORMALIZACIÓN DIACRÍTICOS
  // ══════════════════════════════════════════════════════════════
  function removeDiacritics(str) {
    var map = {
      'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a','æ':'ae',
      'ç':'c','è':'e','é':'e','ê':'e','ë':'e',
      'ì':'i','í':'i','î':'i','ï':'i','ð':'d','ñ':'n',
      'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o','ø':'o',
      'ù':'u','ú':'u','û':'u','ü':'u','ý':'y','ÿ':'y','ß':'ss',
      'š':'s','ž':'z','č':'c','ř':'r','ě':'e','ů':'u',
      'ł':'l','ń':'n','ś':'s','ź':'z','ż':'z','đ':'d','ć':'c',
      '\u00f6':'o','\u00fc':'u','\u00e4':'a','\u00df':'ss',
      '\u00e9':'e','\u00e0':'a','\u00f2':'o','\u00f9':'u',
      '\u00f1':'n','\u00e7':'c'
    };
    var result = '';
    for (var i = 0; i < str.length; i++) {
      result += (map[str[i]] !== undefined) ? map[str[i]] : str[i];
    }
    return result;
  }

  // ══════════════════════════════════════════════════════════════
  // NORMALIZACIÓN MULTIIDIOMA — LABELS
  // ══════════════════════════════════════════════════════════════
  var VARIANT_LABEL_SYNONYMS = {
    'size': [
      'size','talla','tamaño','tamano',
      'größe','groesse','grosse','grösse','grose','grobe','große','grosso',
      'taille','tailles','misura','misure','maat','rozmiar',
      'méret','storlek','størrelse','koko','velikost','tamanho',
      'veličina','dydis','dimensione','dimensión','mărime','rozmer','boyut'
    ],
    'color': [
      'color','colour','colors','colours','farbe','farben','farbvariante',
      'couleur','couleurs','colore','colori','kleur','kleuren',
      'kolor','kolory','szín','färg','farve','väri','barva','renk','cor','culoare','farba'
    ],
    'style': [
      'style','styles','estilo','estilos','stil','stile','stijl','styl',
      'design','diseño','modell','modèle','modello','model','modelo'
    ],
    'material': [
      'material','materials','matière','materiale','materiaal','materiał',
      'anyag','materyal','matéria','materiál','materiali'
    ],
    'pack': [
      'pack','paquete','packung','paquet','confezione','verpakking',
      'opakowanie','item_package_quantity','quantity','cantidad',
      'anzahl','quantité','quantità','aantal','ilość','darab',
      'pakke','kpl','kusy','menge','numero di pezzi',
      'número de piezas','aantal stuks','liczba sztuk','unidades','units'
    ],
    'flavor': ['flavor','flavour','sabor','geschmack','saveur','gusto','smaak','smak','íz','maku','příchuť'],
    'scent':  ['scent','aroma','parfum','duft','profumo','geur','zapach','illat','tuoksu','vůně','fragranza','fragrance'],
    'config': ['configuration','config','configuración','konfiguration','configurazione','configuratie','konfigurace'],
    'pattern':['pattern','patrón','muster','motif','motivo','patroon','wzór','minta','mönster','mønster','kuvio','desenho']
  };

  var LABEL_TO_CANONICAL = {};
  Object.keys(VARIANT_LABEL_SYNONYMS).forEach(function(canonical) {
    VARIANT_LABEL_SYNONYMS[canonical].forEach(function(syn) {
      var base = syn.toLowerCase().replace(/[\s_\-]+/g,'');
      LABEL_TO_CANONICAL[base] = canonical;
      LABEL_TO_CANONICAL[removeDiacritics(base)] = canonical;
    });
  });

  var CANONICAL_ICONS = {
    'size':'👟','color':'🎨','style':'✨','material':'🧵',
    'pack':'📦','flavor':'🍎','scent':'🌸','config':'⚙️','pattern':'🔲'
  };

  function normalizeVariantLabel(label) {
    if (!label) return label;
    var raw = label.toLowerCase().replace(/_name$/i,'').replace(/[\s_\-]+/g,'');
    if (LABEL_TO_CANONICAL[raw]) return LABEL_TO_CANONICAL[raw];
    var clean = removeDiacritics(raw);
    if (LABEL_TO_CANONICAL[clean]) return LABEL_TO_CANONICAL[clean];
    var phoneticMap = {
      'gro':'size','tai':'size','mis':'size','maa':'size','roz':'size',
      'sto':'size','vel':'size','tam':'size','boy':'size','koo':'size',
      'far':'color','cou':'color','col':'color','kle':'color','kol':'color',
      'szi':'color','sti':'style','est':'style','des':'style',
      'mat':'material','pac':'pack','pak':'pack','ver':'pack',
      'opa':'pack','can':'pack','anz':'pack','qua':'pack',
      'fla':'flavor','sab':'flavor','ges':'flavor','sav':'flavor',
      'sce':'scent','aro':'scent','par':'scent','duf':'scent',
      'pat':'pattern','mus':'pattern','mot':'pattern'
    };
    var p4 = clean.substring(0,4), p3 = clean.substring(0,3);
    if (phoneticMap[p4]) return phoneticMap[p4];
    if (phoneticMap[p3]) return phoneticMap[p3];
    return clean;
  }

  // ══════════════════════════════════════════════════════════════
  // NORMALIZACIÓN MULTIIDIOMA — VALORES
  // ══════════════════════════════════════════════════════════════
  function normalizeVariantValue(value) {
    if (!value) return '';
    var v = value.toLowerCase().trim().replace(/\s+/g,' ');

    var colorMap = {
      'schwarz':'black','noir':'black','nero':'black','zwart':'black','negro':'black','preto':'black','fekete':'black','musta':'black','černá':'black','czarny':'black','sort':'black','svart':'black',
      'weiß':'white','weiss':'white','blanc':'white','bianco':'white','wit':'white','blanco':'white','branco':'white','fehér':'white','valkoinen':'white','bílá':'white','biały':'white','hvid':'white','vit':'white',
      'rot':'red','rouge':'red','rosso':'red','rood':'red','rojo':'red','vermelho':'red','vörös':'red','punainen':'red','červená':'red','czerwony':'red','rød':'red','röd':'red',
      'blau':'blue','bleu':'blue','blu':'blue','blauw':'blue','azul':'blue','kék':'blue','sininen':'blue','modrá':'blue','niebieski':'blue','blå':'blue',
      'grün':'green','grun':'green','vert':'green','verde':'green','groen':'green','zöld':'green','vihreä':'green','zelená':'green','zielony':'green','grøn':'green','grön':'green',
      'grau':'grey','gris':'grey','grigio':'grey','grijs':'grey','szary':'grey','šedá':'grey','harmaa':'grey','szürke':'grey','grå':'grey',
      'gelb':'yellow','jaune':'yellow','giallo':'yellow','geel':'yellow','amarillo':'yellow','amarelo':'yellow','sárga':'yellow','keltainen':'yellow','żółty':'yellow','gul':'yellow',
      'rosa':'pink','rose':'pink','rosado':'pink','roze':'pink','rózsaszín':'pink','vaaleanpunainen':'pink','różowy':'pink','lyserød':'pink',
      'lila':'purple','violet':'purple','viola':'purple','paars':'purple','morado':'purple','roxo':'purple','violetti':'purple','fialová':'purple','fioletowy':'purple','mor':'purple',
      'orange':'orange','naranja':'orange','arancione':'orange','oranje':'orange','narancs':'orange','oranssi':'orange','pomarańczowy':'orange',
      'braun':'brown','brun':'brown','marrone':'brown','bruin':'brown','marrón':'brown','marron':'brown','marrom':'brown','barna':'brown','ruskea':'brown','brązowy':'brown',
      'gold':'gold','dorado':'gold','or':'gold','oro':'gold','dourado':'gold','arany':'gold','kulta':'gold','złoty':'gold','guld':'gold',
      'silber':'silver','argent':'silver','argento':'silver','zilver':'silver','plata':'silver','prata':'silver','ezüst':'silver','hopea':'silver','srebrny':'silver','sølv':'silver',
      'beige':'beige','crème':'cream','crema':'cream','creme':'cream','cream':'cream',
      'marineblau':'navy','marine':'navy','azul marino':'navy','blu navy':'navy','navy blue':'navy','azul marinho':'navy','marineblauw':'navy','granatowy':'navy',
      'türkis':'turquoise','turchese':'turquoise','turquesa':'turquoise','turkis':'turquoise',
      'bordeaux':'burgundy','burdeos':'burgundy','bordó':'burgundy','granato':'burgundy','burgund':'burgundy','weinrot':'burgundy',
      'hellblau':'lightblue','azzurro':'lightblue','lichtblauw':'lightblue','azul claro':'lightblue',
      'dunkelgrün':'darkgreen','donkergroen':'darkgreen','verde oscuro':'darkgreen','verde scuro':'darkgreen',
      'dark sapphire':'darksapphire','dark navy':'darknavy','dark blue':'darkblue',
      'light blue':'lightblue','dark green':'darkgreen','light green':'lightgreen',
      'dark grey':'darkgrey','light grey':'lightgrey','dark gray':'darkgrey','light gray':'lightgrey',
      'dark red':'darkred','dark pink':'darkpink','dark brown':'darkbrown','light brown':'lightbrown',
      'hot pink':'hotpink','baby blue':'babyblue','sky blue':'skyblue','royal blue':'royalblue',
      'olive green':'olivegreen','forest green':'forestgreen',
      'dunkel saphir':'darksapphire','saphir foncé':'darksapphire','zaffiro scuro':'darksapphire',
      'donker saffier':'darksapphire','ciemny szafir':'darksapphire',
      'dark-sapphire':'darksapphire','dark-navy':'darknavy','dark-blue':'darkblue','light-blue':'lightblue'
    };

    var sizeMap = {
      'extra small':'xs','extra-small':'xs','très petit':'xs','sehr klein':'xs','extra piccolo':'xs','extra pequeño':'xs',
      'small':'s','petit':'s','klein':'s','piccolo':'s','pequeño':'s','pequeña':'s',
      'medium':'m','moyen':'m','mittel':'m','medio':'m','media':'m',
      'large':'l','grand':'l','groß':'l','gross':'l','grande':'l',
      'extra large':'xl','extra-large':'xl','très grand':'xl','sehr groß':'xl','extra grande':'xl',
      'double extra large':'xxl','2x large':'xxl','2xl':'xxl','doppel extra groß':'xxl',
      'triple extra large':'xxxl','3x large':'xxxl','3xl':'xxxl',
      '1 year':'1','2 years':'2','3 years':'3','4 years':'4','5 years':'5',
      '6 years':'6','7 years':'7','8 years':'8','9 years':'9','10 years':'10',
      '11 years':'11','12 years':'12','13 years':'13','14 years':'14',
      '15 years':'15','16 years':'16','17 years':'17','18 years':'18',
      '1 año':'1','2 años':'2','3 años':'3','4 años':'4','5 años':'5',
      '6 años':'6','7 años':'7','8 años':'8','9 años':'9','10 años':'10',
      '11 años':'11','12 años':'12','13 años':'13','14 años':'14',
      '15 años':'15','16 años':'16','17 años':'17','18 años':'18',
      '1 an':'1','2 ans':'2','3 ans':'3','4 ans':'4','5 ans':'5',
      '6 ans':'6','7 ans':'7','8 ans':'8','9 ans':'9','10 ans':'10',
      '1 jahr':'1','2 jahre':'2','3 jahre':'3','4 jahre':'4','5 jahre':'5',
      '6 jahre':'6','7 jahre':'7','8 jahre':'8','9 jahre':'9','10 jahre':'10',
      '11 jahre':'11','12 jahre':'12','13 jahre':'13','14 jahre':'14',
      '15 jahre':'15','16 jahre':'16','17 jahre':'17','18 jahre':'18',
      '1 anno':'1','2 anni':'2','3 anni':'3','4 anni':'4','5 anni':'5',
      '6 anni':'6','7 anni':'7','8 anni':'8','9 anni':'9','10 anni':'10',
      '11 anni':'11','12 anni':'12','13 anni':'13','14 anni':'14',
      '15 anni':'15','16 anni':'16','17 anni':'17','18 anni':'18',
      '116cm':'116','122cm':'122','128cm':'128','134cm':'134','140cm':'140',
      '146cm':'146','152cm':'152','158cm':'158','164cm':'164','170cm':'170',
      '176cm':'176','182cm':'182','188cm':'188',
      '116 cm':'116','122 cm':'122','128 cm':'128','134 cm':'134','140 cm':'140',
      '146 cm':'146','152 cm':'152','158 cm':'158','164 cm':'164','170 cm':'170',
      '176 cm':'176','182 cm':'182','188 cm':'188'
    };

    if (sizeMap[v]) return sizeMap[v];
    if (colorMap[v]) return colorMap[v];

    var vNoSpaces = v.replace(/[\s\-_]+/g,'');
    var colorKeys = Object.keys(colorMap);
    for (var i = 0; i < colorKeys.length; i++) {
      if (colorKeys[i].replace(/[\s\-_]+/g,'') === vNoSpaces) {
        return colorMap[colorKeys[i]];
      }
    }

    var numMatch = v.match(/^(\d+(?:[.,]\d+)?)/);
    if (numMatch) return numMatch[1].replace(',','.');

    return removeDiacritics(vNoSpaces);
  }

  function getCanonicalIcon(canonical) { return CANONICAL_ICONS[canonical] || '🏷️'; }
  function getMajorityValue(freqMap, maxFreq) {
    return Object.keys(freqMap).find(function(k){ return freqMap[k]===maxFreq; })||'';
  }

  // ══════════════════════════════════════════════════════════════
  // NORMALIZACIÓN DIMENSIONES Y PESO
  // ══════════════════════════════════════════════════════════════
  function parseDimensionNumbers(str) {
    if (!str) return [];
    var results=[],rx=/(\d+[\.,]?\d*)\s*(cm|mm|m\b|inch(?:es)?|in\b|")/gi,m;
    while((m=rx.exec(str))!==null){
      var n=parseFloat(m[1].replace(',','.')),u=m[2].toLowerCase().replace(/inches?/,'in').replace(/"$/,'in');
      var cm;if(u==='mm')cm=n/10;else if(u==='in')cm=n*2.54;else if(u==='m')cm=n*100;else cm=n;
      results.push(Math.round(cm*10)/10);
    }
    return results.sort(function(a,b){return a-b;});
  }
  function parseWeightGrams(str) {
    if (!str) return null;
    var rx=/(\d+[\.,]?\d*)\s*(kg|g\b|lb|lbs|oz|gr\b|gramos?|gramm|grammes?)/gi,m,total=null;
    while((m=rx.exec(str))!==null){
      var n=parseFloat(m[1].replace(',','.')),u=m[2].toLowerCase().replace(/gramos?/,'g').replace(/gramm/,'g').replace(/grammes?/,'g');
      var grams;if(u==='kg')grams=n*1000;else if(u==='lb'||u==='lbs')grams=n*453.59;else if(u==='oz')grams=n*28.35;else grams=n;
      if(total===null)total=grams;
    }
    return total!==null?Math.round(total):null;
  }

  var dimensionKeys=['dimensiones del producto','dimensiones del paquete','dimensiones','dimensioni prodotto','dimensioni del collo','dimensioni','produktabmessungen','verpackungsabmessungen','abmessungen','dimensions du produit','dimensions du colis','dimensions','product dimensions','package dimensions','item dimensions'];
  var weightKeys=['peso del producto','peso del artículo','peso','peso articolo',"peso dell'articolo",'peso collo','artikelgewicht','produktgewicht','gewicht',"poids de l'article",'poids du produit','poids','item weight','product weight','weight'];
  var priceSelectors=['.a-price .a-offscreen','#priceblock_ourprice','#priceblock_dealprice','#priceblock_saleprice','#apex_offerDisplay_desktop .a-price .a-offscreen','#corePrice_feature_div .a-price .a-offscreen','#corePriceDisplay_desktop_feature_div .a-price .a-offscreen'];

  var technicalPatterns=[
    {key:'voltage',  icon:'⚡',label:'Voltaje',  regex:/(\d+[\.,]?\d*)\s*[Vv](?:olt(?:ios?|age)?s?)?\b/g},
    {key:'amperage', icon:'🔋',label:'Amperaje', regex:/(\d+[\.,]?\d*)\s*[Aa](?:mp(?:erios?|eres?|s)?)?\b/g},
    {key:'watts',    icon:'💡',label:'Vatios',   regex:/(\d+[\.,]?\d*)\s*[Ww](?:atts?)?\b/g},
    {key:'mah',      icon:'🔌',label:'mAh',      regex:/(\d+[\.,]?\d*)\s*m[Aa][Hh]\b/g},
    {key:'hz',       icon:'📡',label:'Hz',       regex:/(\d+[\.,]?\d*)\s*[Hh][Zz]\b/g},
    {key:'capacity', icon:'🧴',label:'Capacidad',regex:/(\d+[\.,]?\d*)\s*(?:ml|cl|l\b|fl\.?\s*oz)\b/gi}
  ];

  function extractTechnicalAttribs(title,bullets){
    var allText=(title||'')+' '+(bullets||[]).join(' '),found={};
    technicalPatterns.forEach(function(pat){
      var matches=[],rx=new RegExp(pat.regex.source,pat.regex.flags),m;
      while((m=rx.exec(allText))!==null){var val=(m[1]||m[0]).toLowerCase().trim();if(matches.indexOf(val)===-1)matches.push(val);}
      if(matches.length>0)found[pat.key]={icon:pat.icon,label:pat.label,values:matches};
    });
    return found;
  }

  // ══════════════════════════════════════════════════════════════
  // HELPERS GENERALES
  // ══════════════════════════════════════════════════════════════
  function getASIN(){var m=window.location.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);if(m)return m[1];var input=document.querySelector('input[name="ASIN"]');if(input)return input.value;return null;}
  function getCurrentMarketplace(){var host=window.location.hostname;return marketplaces.find(function(mp){return mp.domain===host;})||null;}
  function escapeHTML(str){if(!str)return '';return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function titleCase(str){return str.replace(/\S+/g,function(w){return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();});}

  function findDetailValue(doc,keywords){
    var tables=doc.querySelectorAll('#productDetails_techSpec_section_1 tr,#productDetails_detailBullets_sections1 tr,.prodDetTable tr');
    for(var i=0;i<tables.length;i++){var th=tables[i].querySelector('th'),td=tables[i].querySelector('td');if(th&&td){var lbl=th.textContent.trim().toLowerCase();for(var k=0;k<keywords.length;k++){if(lbl.indexOf(keywords[k])!==-1)return td.textContent.trim();}}}
    var buls=doc.querySelectorAll('#detailBullets_feature_div li,#detailBulletsWrapper_feature_div li');
    for(var j=0;j<buls.length;j++){var text=buls[j].textContent.toLowerCase();for(var k2=0;k2<keywords.length;k2++){if(text.indexOf(keywords[k2])!==-1){var spans=buls[j].querySelectorAll('span');if(spans.length>=2)return spans[spans.length-1].textContent.trim();var parts=buls[j].textContent.split(':');if(parts.length>=2)return parts.slice(1).join(':').trim();}}}
    var allTables=doc.querySelectorAll('table tr');
    for(var t2=0;t2<allTables.length;t2++){var cells=allTables[t2].querySelectorAll('td,th');if(cells.length>=2){var ct=cells[0].textContent.trim().toLowerCase();for(var k3=0;k3<keywords.length;k3++){if(ct.indexOf(keywords[k3])!==-1)return cells[1].textContent.trim();}}}
    return null;
  }

  var variantIcons={'size_name':'👟','size':'👟','talla':'👟','taille':'👟','größe':'👟','groesse':'👟','misura':'👟','maat':'👟','rozmiar':'👟','tamaño':'👟','color_name':'🎨','color':'🎨','colour':'🎨','couleur':'🎨','farbe':'🎨','colore':'🎨','kleur':'🎨','kolor':'🎨','style_name':'✨','style':'✨','estilo':'✨','pattern_name':'🔲','pattern':'🔲','item_package_quantity':'📦','pack':'📦','configuration':'⚙️','flavor_name':'🍎','flavor':'🍎','scent_name':'🌸','scent':'🌸','material_type':'🧵','material':'🧵'};
  function getVariantIcon(label){var lower=label.toLowerCase().replace(/[\s-]+/g,'_');for(var key in variantIcons){if(lower.indexOf(key)!==-1)return variantIcons[key];}return '🏷️';}
  function cleanVariantLabel(label){return titleCase(label.replace(/_name$/i,'').replace(/_/g,' ').trim());}

  function extractJSONBlock(html,key){
    var escapedKey=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    var regex=new RegExp('["\']\\s*'+escapedKey+'["\']\\s*:\\s*');
    var match=regex.exec(html);if(!match)return null;
    var startPos=match.index+match[0].length;
    while(startPos<html.length&&/\s/.test(html[startPos]))startPos++;
    var openChar=html[startPos];if(openChar!=='{'&&openChar!=='[')return null;
    var closeChar=openChar==='{'?'}':']',depth=0,inStr=false,esc=false;
    for(var i=startPos;i<html.length;i++){var c=html[i];if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c==='"'&&!esc){inStr=!inStr;continue;}if(inStr)continue;if(c===openChar)depth++;if(c===closeChar)depth--;if(depth===0){var raw=html.substring(startPos,i+1);try{return JSON.parse(raw);}catch(e){}try{return JSON.parse(raw.replace(/'/g,'"'));}catch(e2){}return null;}}
    return null;
  }
  function findAsinDisplayValues(html,asin){var regex=new RegExp('"'+asin+'"\\s*:\\s*\\[([^\\]]+)\\]');var match=html.match(regex);if(match){try{return JSON.parse('['+match[1]+']');}catch(e){}}return null;}
  function findDimensionNames(html){var dims=[];var m1=html.match(/"dimensions"\s*:\s*\[([^\]]+)\]/);if(m1){try{dims=JSON.parse('['+m1[1]+']');}catch(e){}if(dims.length>0)return dims;}var m2=html.match(/"variationDimensions"\s*:\s*\[([^\]]+)\]/);if(m2){try{dims=JSON.parse('['+m2[1]+']');}catch(e){}if(dims.length>0)return dims;}return dims;}
  function findDimensionLabels(html,dimNames){var labels=[],vdl=extractJSONBlock(html,'variationDisplayLabels');if(vdl&&dimNames.length>0){for(var i=0;i<dimNames.length;i++)labels.push(vdl[dimNames[i]]||dimNames[i]);return labels;}var m2=html.match(/"dimensionDisplaySubTitles"\s*:\s*\[([^\]]+)\]/);if(m2){try{labels=JSON.parse('['+m2[1]+']');}catch(e){}if(labels.length>0)return labels;}return dimNames;}
  function extractPrice(doc){for(var i=0;i<priceSelectors.length;i++){var el=doc.querySelector(priceSelectors[i]);if(el){var txt=el.textContent.trim();if(txt)return txt;}}return null;}

  function extractVariants(doc,html,targetAsin){
    var variants=[],debugInfo=[];
    try{var dv=findAsinDisplayValues(html,targetAsin);if(dv&&dv.length>0){var dn=findDimensionNames(html),dl=findDimensionLabels(html,dn);for(var i=0;i<dv.length;i++){var val=dv[i],lbl=dl[i]||dn[i]||('Variante '+(i+1));if(val&&val.trim())variants.push({label:cleanVariantLabel(lbl),value:val.trim(),icon:getVariantIcon(lbl)});}debugInfo.push('M1:'+variants.length);}}catch(e){debugInfo.push('M1:'+e.message);}
    if(variants.length===0){try{var im=extractJSONBlock(html,'asinToDimensionIndexMap'),vv=extractJSONBlock(html,'variationValues'),dn2=findDimensionNames(html),dl2=findDimensionLabels(html,dn2);if(im&&vv&&dn2.length>0&&im[targetAsin]){var idx=im[targetAsin];for(var j=0;j<dn2.length;j++){var dk=dn2[j],dvals=vv[dk],ix=idx[j];if(dvals&&ix!==undefined&&ix>=0&&dvals[ix])variants.push({label:cleanVariantLabel(dl2[j]||dk),value:dvals[ix].trim(),icon:getVariantIcon(dk)});}debugInfo.push('M2:'+variants.length);}}catch(e){debugInfo.push('M2:'+e.message);}}
    if(variants.length===0){try{var sp=[{regex:/"selected_size_name"\s*:\s*"([^"]+)"/,label:'Size',icon:'👟'},{regex:/"selected_color_name"\s*:\s*"([^"]+)"/,label:'Color',icon:'🎨'},{regex:/"selected_style_name"\s*:\s*"([^"]+)"/,label:'Style',icon:'✨'},{regex:/"selected_pattern_name"\s*:\s*"([^"]+)"/,label:'Pattern',icon:'🔲'},{regex:/"selected_flavor_name"\s*:\s*"([^"]+)"/,label:'Flavor',icon:'🍎'},{regex:/"selected_scent_name"\s*:\s*"([^"]+)"/,label:'Scent',icon:'🌸'},{regex:/"selected_configuration"\s*:\s*"([^"]+)"/,label:'Config',icon:'⚙️'},{regex:/"selected_material_type"\s*:\s*"([^"]+)"/,label:'Material',icon:'🧵'}];sp.forEach(function(pat){var m=html.match(pat.regex);if(m&&m[1].trim())variants.push({label:pat.label,value:m[1].trim(),icon:pat.icon});});if(variants.length>0)debugInfo.push('M3:'+variants.length);}catch(e){debugInfo.push('M3:'+e.message);}}
    if(variants.length===0){try{doc.querySelectorAll('[id^="variation_"]').forEach(function(div){var le=div.querySelector('.a-form-label,label.a-form-label'),se=div.querySelector('.selection'),de=div.querySelector('select option[selected]'),we=div.querySelector('.swatchSelect .a-button-text');var label=le?le.textContent.replace(/[:\s]+$/,'').trim():'';if(!label){var im2=div.id.match(/variation_(.+)/);if(im2)label=im2[1];}var value='';if(se&&se.textContent.trim())value=se.textContent.trim();else if(we&&we.textContent.trim())value=we.textContent.trim();else if(de&&de.textContent.trim())value=de.textContent.trim();if(label&&value&&value.toLowerCase()!=='select'&&value!=='-'&&value.length<200)variants.push({label:cleanVariantLabel(label),value:value,icon:getVariantIcon(label)});});if(variants.length===0){doc.querySelectorAll('[id^="native_dropdown_selected_"] option[selected],[id^="dropdown_selected_"] option[selected]').forEach(function(opt){var val=opt.textContent.trim(),sid=opt.parentElement?opt.parentElement.id:'';var lm=sid.match(/(?:native_dropdown_selected_|dropdown_selected_)(.+)/);var label=lm?lm[1]:'Variant';if(val&&val.toLowerCase()!=='select'&&val.indexOf('Seleccionar')===-1)variants.push({label:cleanVariantLabel(label),value:val,icon:getVariantIcon(label)});});}if(variants.length>0)debugInfo.push('M4:'+variants.length);}catch(e){debugInfo.push('M4:'+e.message);}}
    if(variants.length===0){try{var dk2={'size':{keys:['talla','tamaño','size','größe','taille','misura','maat','rozmiar'],icon:'👟'},'color':{keys:['color','colour','farbe','couleur','colore','kleur','kolor'],icon:'🎨'}};for(var d in dk2){var cfg=dk2[d],fnd=findDetailValue(doc,cfg.keys);if(fnd&&fnd.length<100)variants.push({label:cleanVariantLabel(d),value:fnd,icon:cfg.icon});}if(variants.length>0)debugInfo.push('M5:'+variants.length);}catch(e){debugInfo.push('M5:'+e.message);}}
    var seen={};
    variants=variants.filter(function(v){var key=v.label.toLowerCase().replace(/\s+/g,'');if(seen[key])return false;seen[key]=true;return true;});
    return variants;
  }

  function extractData(html,targetAsin){
    var parser=new DOMParser(),doc=parser.parseFromString(html,'text/html');
    var title=null,el=doc.querySelector('#productTitle');
    if(el&&el.textContent.trim())title=el.textContent.trim();
    if(!title){el=doc.querySelector('#title span');if(el&&el.textContent.trim())title=el.textContent.trim();}
    var image=null,imgEl=doc.querySelector('#landingImage');
    if(imgEl)image=imgEl.getAttribute('data-old-hires')||imgEl.getAttribute('src');
    if(!image){imgEl=doc.querySelector('#imgBlkFront');if(imgEl)image=imgEl.getAttribute('src');}
    if(!image){imgEl=doc.querySelector('.a-dynamic-image');if(imgEl)image=imgEl.getAttribute('src');}
    var bullets=[];
    doc.querySelectorAll('#feature-bullets ul li span.a-list-item').forEach(function(li){var text=li.textContent.trim();if(text&&text.length>5&&text.indexOf('Click here')===-1&&text.indexOf('Haz clic')===-1)bullets.push(text);});
    if(bullets.length===0){doc.querySelectorAll('#feature-bullets li').forEach(function(li){var text=li.textContent.trim();if(text&&text.length>5)bullets.push(text);});}
    return{title,image,bullets,variants:extractVariants(doc,html,targetAsin),dimensions:findDetailValue(doc,dimensionKeys),weight:findDetailValue(doc,weightKeys),price:extractPrice(doc)};
  }

  function fetchData(mp,asin){
    return new Promise(function(resolve){
      var cacheKey='kami_'+mp.domain+'_'+asin,cached=sessionStorage.getItem(cacheKey);
      if(cached){try{var parsed=JSON.parse(cached);parsed.fromCache=true;return resolve(parsed);}catch(e){}}
      var url='https://'+mp.domain+'/dp/'+asin;
      GM_xmlhttpRequest({method:'GET',url:url,headers:{'Accept':'text/html,application/xhtml+xml','Accept-Language':'es-ES,es;q=0.9,en;q=0.8'},timeout:15000,
        onload:function(r){
          var result;
          if(r.status===200){var data=extractData(r.responseText,asin);result={mp,url,title:data.title,image:data.image,bullets:data.bullets,variants:data.variants,dimensions:data.dimensions,weight:data.weight,price:data.price,status:data.title?'success':'not_found',chars:data.title?data.title.length:0,fromCache:false};}
          else{result={mp,url,title:null,image:null,bullets:[],variants:[],dimensions:null,weight:null,price:null,status:'error',error:'HTTP '+r.status,chars:0,fromCache:false};}
          if(result.status==='success'){try{sessionStorage.setItem(cacheKey,JSON.stringify(result));}catch(e){}}
          resolve(result);
        },
        onerror:function(){resolve({mp,url,title:null,image:null,bullets:[],variants:[],dimensions:null,weight:null,price:null,status:'error',error:'Error conexión',chars:0});},
        ontimeout:function(){resolve({mp,url,title:null,image:null,bullets:[],variants:[],dimensions:null,weight:null,price:null,status:'error',error:'Timeout',chars:0});}
      });
    });
  }

  function getWordSet(title){if(!title)return new Set();return new Set(title.toLowerCase().match(/\b\w+\b/g)||[]);}
  function highlightTitleDiff(title,referenceWords){if(!title||referenceWords.size===0)return escapeHTML(title||'');return title.split(/(\s+)/).map(function(token){if(/^\s+$/.test(token))return token;var word=token.toLowerCase().replace(/[^\w]/g,'');if(word&&!referenceWords.has(word))return '<span class="atc-word-diff">'+escapeHTML(token)+'</span>';return escapeHTML(token);}).join('');}

  var glCategoryMap=[{gl:'CE',keywords:['electronics','electrónica','electrónicos','informatica','informática','ordenador','laptop','tablet','smartphone','móvil','camera','cámara','audio','tv','televisor','gaming','elektronik','électronique','elettronica']},{gl:'Apparel',keywords:['ropa','clothing','apparel','moda','fashion','zapatos','shoes','calzado','vêtements','kleidung','abbigliamento','talla','softlines','bolso','bag','joyería','jewelry','relojes','watches']},{gl:'Home',keywords:['hogar','home','cocina','kitchen','muebles','furniture','jardín','garden','herramienta','tools','bricolaje','maison','haus','casa','cucina','decoration','decoración','lighting','iluminación','bedding','bathroom','baño']},{gl:'Sports',keywords:['deporte','sport','sports','fitness','outdoor','camping','bicicleta','bike','cycling','running','swimming','gym','yoga']},{gl:'Books',keywords:['libro','book','books','bücher','livres','libri','comic','manga','novel']},{gl:'Toys',keywords:['juguete','toy','toys','juego','game','games','spielzeug','jouet','giocattolo','lego','puzzle','kids','niños']},{gl:'Beauty',keywords:['belleza','beauty','cosmético','cosmetic','perfume','cuidado personal','personal care','schönheit','beauté','bellezza','skincare','haircare','makeup']},{gl:'Consumables',keywords:['alimentación','food','alimento','bebida','drink','gourmet','lebensmittel','grocery','supermercado','health','salud','farmacia','vitamina','suplemento','supplement']},{gl:'Pet Products',keywords:['mascota','pet','perro','gato','dog','cat','haustier','animaux','animali']},{gl:'Automotive',keywords:['automóvil','auto','coche','car','motorrad','moto','automotive','vehicle']},{gl:'Office Products',keywords:['oficina','office','papelería','stationery','büro','bureau','ufficio','impresora','printer']},{gl:'Musical Instruments',keywords:['música','music','instrument','instrumento','guitarra','guitar','piano','drums']},{gl:'Baby',keywords:['bebé','baby','infant','nursery','pañales','diapers','stroller','carrito']},{gl:'Industrial',keywords:['industrial','industry','herramientas eléctricas','power tools','professional','seguridad','safety']}];

  function detectGLFromPage(){var ft='';['#wayfinding-breadcrumbs_feature_div','.a-breadcrumb','#nav-subnav'].forEach(function(s){if(!ft){var el=document.querySelector(s);if(el)ft=el.textContent.toLowerCase();}});document.querySelectorAll('#wayfinding-breadcrumbs_feature_div a,.a-breadcrumb a').forEach(function(a){ft+=' '+a.textContent.toLowerCase();});if(!ft.trim())return '';for(var j=0;j<glCategoryMap.length;j++){var e=glCategoryMap[j];for(var k=0;k<e.keywords.length;k++){if(ft.indexOf(e.keywords[k])!==-1)return e.gl;}}return '';}
  function detectBusinessModel(){var bH=document.body.innerHTML,bT=document.body.textContent.toLowerCase(),d=false;var dp=[/dispatches\s+from[\s\S]{0,300}?amazon/i,/enviado\s+desde[\s\S]{0,300}?amazon/i,/expédié\s+depuis[\s\S]{0,300}?amazon/i,/versand\s+durch[\s\S]{0,300}?amazon/i,/spedito\s+da[\s\S]{0,300}?amazon/i,/shipped\s+by[\s\S]{0,100}?amazon/i];for(var i=0;i<dp.length;i++){if(dp[i].test(bH)){d=true;break;}}var s=false;var ss=['#merchant-info a','#buybox a','#tabular-buybox a','#desktop_qualifiedBuyBox a','#apex_offerDisplay_desktop a','#buyBoxInner a'],ad=['amazon.es','amazon.de','amazon.fr','amazon.it','amazon.co.uk','amazon.nl','amazon.com.be','amazon.pl','amazon.com'];for(var j=0;j<ss.length;j++){document.querySelectorAll(ss[j]).forEach(function(a){var t2=a.textContent.trim().toLowerCase();if(t2==='amazon'||ad.indexOf(t2)!==-1)s=true;});if(s)break;}if(!s){var sp=['vendido por amazon','sold by amazon','vendu par amazon','verkauf durch amazon','venduto da amazon'];for(var k=0;k<sp.length;k++){if(bT.indexOf(sp[k])!==-1){s=true;break;}}}return(d&&s)?'Retail':'FBA';}
  function extractSellerID(){var ss=['#merchant-info a','#sellerProfileTriggerId','[data-feature-name="merchantInfo"] a','#tabular-buybox a[href*="seller"]'];for(var i=0;i<ss.length;i++){var el=document.querySelector(ss[i]);if(el){var t2=el.textContent.trim();if(t2&&t2!=='Amazon'&&t2.length<100)return t2;}}return '';}
  function extractEAN(){var el=['ean','isbn','gtin','upc','código de barras','barcode'];var rows=document.querySelectorAll('#productDetails_techSpec_section_1 tr,#productDetails_detailBullets_sections1 tr,.prodDetTable tr,table.a-keyvalue tr');for(var i=0;i<rows.length;i++){var th=rows[i].querySelector('th,td:first-child'),td=rows[i].querySelector('td:last-child,td:nth-child(2)');if(th&&td){var l=th.textContent.trim().toLowerCase();for(var k=0;k<el.length;k++){if(l.indexOf(el[k])!==-1){var v=td.textContent.trim().replace(/\s+/g,'');if(/^\d{8,13}$/.test(v))return v;}}}}var bullets=document.querySelectorAll('#detailBullets_feature_div li,#detailBulletsWrapper_feature_div li');for(var j=0;j<bullets.length;j++){var bt=bullets[j].textContent.toLowerCase();for(var k2=0;k2<el.length;k2++){if(bt.indexOf(el[k2])!==-1){var m=bullets[j].textContent.match(/\b(\d{8,13})\b/);if(m)return m[1];}}}return null;}

  var issueTypeMap={'title':'Title Update','image':'Image Update','detail':'Detail Page Issue'};
  function detectAttributeName(){var v=document.querySelector('[id^="variation_"]');if(v){var l=v.querySelector('.a-form-label,label');if(l){var t2=l.textContent.trim().toLowerCase();if(t2.indexOf('color')!==-1||t2.indexOf('colour')!==-1)return 'Color';if(t2.indexOf('size')!==-1||t2.indexOf('talla')!==-1)return 'Size_name';if(t2.indexOf('style')!==-1)return 'Style_name';}}return 'Item_name';}

  function openISS(issType,result){
    var bm=detectBusinessModel(),gl=detectGLFromPage(),sid=extractSellerID(),an=detectAttributeName();
    var payload={businessModel:bm,gl:gl,issueType:issueTypeMap[issType],marketplace:result.mp.code,asin:getASIN()||'',ean:extractEAN()||'',quantity:'1',fcName:fcNameByMarketplace[result.mp.code]||'MAD4',title:result.title||'',imageUrl:result.image||'',dimensions:result.dimensions||'',weight:result.weight||'',price:result.price||'',variants:result.variants||[],issType:issType,sellerID:sid,attributeName:an,timestamp:Date.now()};
    var encoded='KAMI_PAYLOAD:'+btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    navigator.clipboard.writeText(encoded).then(function(){GM_openInTab('https://eu.iar.rbs.amazon.dev/home',false);}).catch(function(){GM_openInTab('https://eu.iar.rbs.amazon.dev/home',false);});
    showISSToast(payload);
  }

  function showISSToast(p){
    var old=document.getElementById('kami-iss-toast');if(old)old.remove();
    var icons={'Title Update':'📝','Image Update':'🖼️','Detail Page Issue':'🏷️'};
    function tr(l,v,c){return '<div class="kami-tr"><span class="kami-tl">'+l+':</span><span class="kami-tv '+(c||'')+'">'+escapeHTML(String(v||''))+'</span></div>';}
    var toast=document.createElement('div');toast.id='kami-iss-toast';
    var noGL = t('fieldNoGL');
    toast.innerHTML='<button id="kami-toast-close">✕</button><h4>'+(icons[p.issueType]||'🎫')+' '+t('issOpened')+'</h4>'+tr(t('fieldType'),p.issueType,'ok')+tr(t('fieldModel'),p.businessModel,p.businessModel==='Retail'?'ok':'warn')+tr(t('fieldGL'),p.gl||noGL,p.gl?'ok':'warn')+tr(t('fieldMP'),p.marketplace,'ok')+tr(t('fieldASIN'),p.asin,p.asin?'':'warn')+tr(t('fieldEAN'),p.ean||t('fieldNA'),p.ean?'':'warn')+'<div style="margin-top:8px;padding-top:6px;border-top:1px solid #333;color:#4ade80;font-size:11px;font-weight:bold;">'+t('issClickHint')+'</div>';
    document.body.appendChild(toast);
    document.getElementById('kami-toast-close').addEventListener('click',function(){toast.remove();});
    setTimeout(function(){if(toast.parentNode)toast.remove();},20000);
  }

  GM_addStyle(`
    #atc-btn{position:fixed;bottom:20px;right:20px;z-index:2147483647;padding:14px 24px;background:#FF9900;color:#111;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:bold;box-shadow:0 4px 15px rgba(0,0,0,0.4);font-family:Arial,sans-serif;transition:background 0.2s;}
    #atc-btn:hover{background:#e88b00;}
    #atc-btn:disabled{background:#888;cursor:not-allowed;}
    #atc-panel{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:98vw;max-width:1500px;max-height:94vh;background:#1a1a2e;border-radius:16px;z-index:2147483647;box-shadow:0 10px 40px rgba(0,0,0,0.7);overflow:hidden;font-family:Arial,sans-serif;display:none;flex-direction:column;}
    #atc-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:2147483646;}
    #atc-header{background:#FF9900;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}
    #atc-header h2{margin:0;color:#111;font-size:15px;}
    #atc-close{background:none;border:none;font-size:22px;cursor:pointer;color:#111;}
    #atc-toolbar{background:#0f3460;padding:8px 20px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0;}
    .atc-mp-filter{display:flex;align-items:center;gap:4px;background:#16213e;padding:4px 10px;border-radius:20px;cursor:pointer;font-size:12px;color:#ddd;border:1px solid #2a4a7a;transition:border-color 0.2s;user-select:none;}
    .atc-mp-filter input{cursor:pointer;margin:0;}
    .atc-mp-filter:hover{border-color:#FF9900;}
    .atc-mp-filter.checked{border-color:#4CAF50;}
    #atc-diff-toggle{background:#16213e;border:1px solid #2a4a7a;color:#aaa;padding:4px 12px;border-radius:20px;cursor:pointer;font-size:12px;}
    #atc-diff-toggle.active{border-color:#FF9900;color:#FF9900;}
    /* ── LANGUAGE SWITCHER ── */
    #kami-lang-switcher{margin-left:auto;display:flex;align-items:center;gap:4px;background:#16213e;border:1px solid #2a4a7a;border-radius:20px;padding:2px 4px;}
    .kami-lang-btn{background:none;border:none;padding:3px 8px;border-radius:14px;cursor:pointer;font-size:11px;color:#aaa;font-weight:bold;transition:background 0.15s,color 0.15s;}
    .kami-lang-btn:hover{color:#FF9900;}
    .kami-lang-btn.active{background:#FF9900;color:#111;}
    #atc-progress{background:#16213e;margin:10px 16px 0;border-radius:8px;padding:8px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;}
    #atc-progress-bar{flex:1;height:6px;background:#0f3460;border-radius:4px;overflow:hidden;}
    #atc-progress-fill{height:100%;width:0%;background:linear-gradient(90deg,#FF9900,#ffb347);border-radius:4px;transition:width 0.3s ease;}
    #atc-progress-text{color:#aaa;font-size:12px;white-space:nowrap;}
    #kami-anomaly-banner{background:#0f1e3a;border:1px solid #2a3a5e;border-left:4px solid #ef4444;border-radius:8px;padding:10px 14px;margin:8px 16px 0;font-size:11px;flex-shrink:0;}
    #atc-body{flex:1;overflow-x:auto;overflow-y:auto;padding:12px 16px 8px;}
    #atc-grid{display:grid;grid-template-columns:110px repeat(5,1fr);gap:0;min-width:700px;border-radius:10px;overflow:hidden;border:1px solid #2a3a5e;}
    .atc-cell{padding:10px;border-bottom:1px solid #1e2d50;border-right:1px solid #1e2d50;font-size:12px;color:#ccc;vertical-align:top;background:#16213e;word-break:break-word;position:relative;}
    .atc-cell:last-child{border-right:none;}
    .atc-cell.label-col{background:#0f1e3a;color:#888;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;display:flex;align-items:center;padding-left:12px;}
    .atc-cell.mp-header{background:#0f3460;text-align:center;padding:10px 8px;border-bottom:2px solid #FF9900;}
    .atc-cell.mp-header.current-mp{background:#1a0f60;border-bottom-color:#a78bfa;}
    .atc-cell.mp-header.error-mp{background:#2a1010;border-bottom-color:#f44336;opacity:0.7;}
    .atc-mp-flag{font-size:22px;display:block;line-height:1.2;}
    .atc-mp-code{color:#FF9900;font-weight:bold;font-size:13px;display:block;}
    .atc-mp-lang{color:#888;font-size:10px;display:block;}
    .atc-badge-current{background:#a78bfa;color:#111;font-size:9px;padding:1px 6px;border-radius:8px;display:inline-block;margin-top:2px;}
    .atc-badge-cache{background:#374151;color:#9ca3af;font-size:9px;padding:1px 5px;border-radius:8px;display:inline-block;margin-top:2px;}
    .atc-row-img .atc-cell{background:#131c35;}
    .atc-row-title .atc-cell{background:#16213e;}
    .atc-row-price .atc-cell{background:#131c35;}
    .atc-row-variants .atc-cell{background:#16213e;}
    .atc-row-specs .atc-cell{background:#131c35;}
    .atc-row-bullets .atc-cell{background:#16213e;}
    .atc-row-iss .atc-cell{background:#0a1628;}
    .atc-row-last .atc-cell{border-bottom:none;}
    .atc-img-box{width:80px;height:80px;margin:0 auto;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;transition:box-shadow 0.15s,transform 0.15s;}
    .atc-img-box:hover{box-shadow:0 0 0 3px #FF9900;transform:scale(1.04);}
    .atc-img-box img{max-width:76px;max-height:76px;object-fit:contain;}
    .atc-no-img-txt{color:#666;font-size:10px;text-align:center;}
    .atc-title-cell{color:#e0e0e0;font-size:12px;line-height:1.4;cursor:pointer;border-bottom:1px dashed rgba(255,153,0,0.2);transition:color 0.15s;}
    .atc-title-cell:hover{color:#FF9900;}
    .atc-chars-info{color:#666;font-size:10px;margin-top:4px;}
    .atc-word-diff{background:rgba(255,153,0,0.2);color:#ffb347;border-radius:2px;padding:0 2px;}
    .atc-price-val{color:#4ade80;font-weight:bold;font-size:14px;}
    .atc-no-data{color:#444;font-style:italic;}
    .atc-variant-chip{display:inline-flex;align-items:center;gap:3px;background:#2a1a4e;padding:3px 8px;border-radius:5px;font-size:11px;color:#ddd;margin:2px;border:1px solid #5a3a8e;cursor:pointer;transition:border-color 0.15s,background 0.15s;}
    .atc-variant-chip:hover{border-color:#FF9900;background:#3d1f6e;}
    .atc-vc-lbl{color:#a088cc;font-size:10px;}
    .atc-vc-val{color:#e0b0ff;font-weight:bold;}
    .atc-vc-canonical{color:#444;font-size:9px;margin-left:2px;}
    .atc-variant-chip.has-alert{border-color:#ef4444!important;background:rgba(239,68,68,0.12)!important;}
    .atc-spec-chip{display:inline-flex;align-items:center;gap:3px;background:#0f3460;padding:3px 8px;border-radius:5px;font-size:11px;color:#ddd;margin:2px;}
    .atc-spec-lbl{color:#888;}
    .atc-spec-val{color:#ffb347;font-weight:bold;}
    .atc-spec-chip.no-data{opacity:0.35;}
    .atc-spec-chip.spec-alert{border:1px solid #ef4444;background:rgba(239,68,68,0.12);}
    .atc-spec-diff{font-size:9px;margin-left:3px;color:#888;}
    .atc-toggle-bullets{background:none;border:1px solid #444;color:#aaa;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:10px;margin-bottom:4px;display:block;}
    .atc-toggle-bullets:hover{border-color:#FF9900;color:#FF9900;}
    .atc-bullets-container{display:none;}
    .atc-bullets-container.open{display:block;}
    .atc-bullets-list{margin:0;padding:0;list-style:none;}
    .atc-bullets-list li{color:#b0b0b0;font-size:10px;line-height:1.4;margin-bottom:3px;padding-left:10px;position:relative;}
    .atc-bullets-list li::before{content:'•';color:#FF9900;position:absolute;left:0;}
    .iss-summary-cell{padding:8px 10px;background:#0a1628;}
    .iss-summary-empty{color:#2a5a2a;font-size:10px;font-style:italic;text-align:center;padding:8px;display:block;}
    .iss-ticket-block{margin-bottom:5px;}
    .iss-ticket-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;font-size:10px;cursor:pointer;width:100%;margin-bottom:3px;transition:background 0.15s;border:1px solid;}
    .iss-ticket-btn.type-image{background:#1a0f30;border-color:#ef4444;color:#fca5a5;}
    .iss-ticket-btn.type-image:hover{background:#3d0f0f;}
    .iss-ticket-btn.type-title{background:#0f2a1a;border-color:#4ade80;color:#86efac;}
    .iss-ticket-btn.type-title:hover{background:#0f3a1a;}
    .iss-ticket-btn.type-detail{background:#1a1a0f;border-color:#f59e0b;color:#fcd34d;}
    .iss-ticket-btn.type-detail:hover{background:#2a2a0f;}
    .iss-ticket-count{background:rgba(255,255,255,0.15);border-radius:10px;padding:1px 6px;font-size:9px;font-weight:bold;margin-left:auto;}
    .iss-ticket-reasons{font-size:9px;color:#555;padding-left:4px;margin-top:1px;}
    .iss-ticket-reasons span{display:block;line-height:1.4;}
    .atc-cell.label-col.iss-label{background:#0a1020;color:#a78bfa;border-top:2px solid #a78bfa;flex-direction:column;justify-content:center;text-align:center;gap:2px;}
    .cell-loading{color:#555;font-style:italic;font-size:11px;}
    .cell-error{color:#f44336;font-size:11px;}
    .atc-spinner{display:inline-block;width:12px;height:12px;border:2px solid #333;border-top-color:#FF9900;border-radius:50%;animation:atc-spin 0.8s linear infinite;margin-right:4px;vertical-align:middle;}
    @keyframes atc-spin{to{transform:rotate(360deg);}}
    .atc-link{color:#4fc3f7;text-decoration:none;font-size:10px;}
    #atc-footer{padding:10px 20px;background:#16213e;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;border-top:1px solid #2a3a5e;}
    #atc-summary{color:#888;font-size:12px;}
    .atc-fbtn{padding:7px 14px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:12px;}
    #atc-copy-btn{background:#FF9900;color:#111;}
    #atc-export-btn{background:#4CAF50;color:white;}
    #atc-clear-cache-btn{background:#374151;color:#9ca3af;}
    #kami-iss-toast{position:fixed;bottom:80px;right:20px;z-index:2147483647;background:#1a1a2e;border:1px solid #FF9900;border-radius:12px;padding:14px 18px 14px 14px;font-family:Arial,sans-serif;font-size:12px;color:#e0e0e0;box-shadow:0 4px 20px rgba(0,0,0,0.6);max-width:300px;animation:kami-toast-in 0.3s ease;}
    @keyframes kami-toast-in{from{transform:translateX(120px);opacity:0;}to{transform:translateX(0);opacity:1;}}
    #kami-iss-toast h4{margin:0 0 8px;color:#FF9900;font-size:13px;}
    .kami-tr{display:flex;justify-content:space-between;margin-bottom:3px;gap:8px;}
    .kami-tl{color:#888;white-space:nowrap;}
    .kami-tv{color:#fff;font-weight:bold;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px;}
    .kami-tv.warn{color:#fbbf24;}
    .kami-tv.ok{color:#4ade80;}
    #kami-toast-close{position:absolute;top:8px;right:10px;background:none;border:none;color:#666;cursor:pointer;font-size:14px;}
    #kami-toast-close:hover{color:#fff;}
    .kami-anomaly-badge{position:absolute;top:4px;right:4px;color:#fff;font-size:9px;font-weight:bold;padding:2px 6px;border-radius:8px;cursor:pointer;z-index:10;transition:transform 0.15s,box-shadow 0.15s;}
    .kami-anomaly-badge:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.5);}
    .kami-anomaly-badge.level-alert{background:#ef4444;}
    .kami-cell-alert{border:2px solid #ef4444!important;background:rgba(239,68,68,0.10)!important;animation:kami-pulse-border 2.5s infinite;}
    @keyframes kami-pulse-border{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4);}50%{box-shadow:0 0 0 5px rgba(239,68,68,0);}}
    #kami-anomaly-tip{position:fixed;z-index:2147483647;background:#1a1a2e;border-radius:8px;padding:10px 14px;font-family:Arial,sans-serif;font-size:11px;color:#e0e0e0;max-width:300px;box-shadow:0 4px 20px rgba(0,0,0,0.7);pointer-events:none;}
    .kami-chip-alert{background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#ef4444;padding:2px 8px;border-radius:10px;cursor:pointer;font-size:10px;white-space:nowrap;transition:background 0.15s;}
    .kami-chip-alert:hover{background:rgba(239,68,68,0.30);}
  `);

  // ══════════════════════════════════════════════════════════════
  // ANOMALY ENGINE v4
  // ══════════════════════════════════════════════════════════════
  var cellAnomalies = {}, mpIssueMap = {};

  function addCellAnomaly(mpCode, rowId, reason, meta) {
    var key = rowId + '-' + mpCode;
    if (!cellAnomalies[key]) cellAnomalies[key] = [];
    if (!cellAnomalies[key].some(function(a) { return a.reason === reason; }))
      cellAnomalies[key].push({ reason: reason, meta: meta || {} });
  }
  function addIssue(mpCode, issType, reason) {
    if (!mpIssueMap[mpCode]) mpIssueMap[mpCode] = { image:[], title:[], detail:[] };
    var arr = mpIssueMap[mpCode][issType];
    if (arr && arr.indexOf(reason) === -1) arr.push(reason);
  }
  function normalizeImgUrl(url) {
    if (!url) return '';
    return url.replace(/\._[A-Z0-9_,]+_\./, '.').split('?')[0];
  }

  function analyzeAnomalies(results) {
    var successful = results.filter(function(r) { return r.status === 'success'; });
    if (successful.length < 2) return;

    successful.forEach(function(r) {
      r.technicalAttribs = extractTechnicalAttribs(r.title, r.bullets);
      r.dimNumbers       = parseDimensionNumbers(r.dimensions);
      r.weightGrams      = parseWeightGrams(r.weight);
    });

    // ── 1. VARIANTES ─────────────────────────────────────────
    var canonicalVariantMap = {};
    successful.forEach(function(r) {
      (r.variants || []).forEach(function(v) {
        var canonical = normalizeVariantLabel(v.label);
        if (!canonicalVariantMap[canonical]) canonicalVariantMap[canonical] = {};
        canonicalVariantMap[canonical][r.mp.code] = normalizeVariantValue(v.value);
      });
    });

    Object.keys(canonicalVariantMap).forEach(function(canonical) {
      var mpValues   = canonicalVariantMap[canonical];
      var presentMPs = Object.keys(mpValues);
      if (presentMPs.length < 2) return;

      var valFreq = {};
      presentMPs.forEach(function(c) { var v = mpValues[c]; valFreq[v] = (valFreq[v] || 0) + 1; });
      var uniqueVals = Object.keys(valFreq);
      if (uniqueVals.length === 1) return;

      var maxFreq  = Math.max.apply(null, Object.values(valFreq));
      var totalMPs = presentMPs.length;
      var icon     = getCanonicalIcon(canonical);

      var refCode = currentMP ? currentMP.code : presentMPs[0];
      var refVal  = mpValues[refCode] !== undefined ? mpValues[refCode] : getMajorityValue(valFreq, maxFreq);

      presentMPs.forEach(function(mpCode) {
        if (mpCode === refCode) return;
        var val = mpValues[mpCode];
        var shouldAlert = (maxFreq > totalMPs / 2)
          ? (val !== getMajorityValue(valFreq, maxFreq))
          : (val !== refVal);
        if (shouldAlert) {
          var reason = tf('anomalyVariant', { icon: icon, canonical: titleCase(canonical), val: val, ref: refVal });
          addCellAnomaly(mpCode, 'variants', reason, { canonical: canonical, value: val, ref: refVal, type: 'variant_value' });
          addIssue(mpCode, 'detail', reason);
        }
      });
    });

    // ── 2. IMAGEN ────────────────────────────────────────────
    var imgMap = {};
    successful.forEach(function(r) { imgMap[r.mp.code] = normalizeImgUrl(r.image); });
    var imgVals  = Object.values(imgMap).filter(Boolean);
    var imgFreq  = {};
    imgVals.forEach(function(v) { imgFreq[v] = (imgFreq[v] || 0) + 1; });
    var imgMax   = imgVals.length > 0 ? Math.max.apply(null, Object.values(imgFreq)) : 0;
    successful.forEach(function(r) {
      var norm = imgMap[r.mp.code];
      if (norm && imgFreq[norm] < imgMax) {
        var reason = t('anomalyImg');
        addCellAnomaly(r.mp.code, 'img', reason, { type: 'img_diff' });
        addIssue(r.mp.code, 'image', reason);
      }
    });

    // ── 3. DIMENSIONES (tolerancia 5%) ───────────────────────
    var dimsOK = successful.filter(function(r) { return r.dimNumbers && r.dimNumbers.length > 0; });
    if (dimsOK.length >= 2) {
      var lf = {};
      dimsOK.forEach(function(r) { lf[r.dimNumbers.length] = (lf[r.dimNumbers.length] || 0) + 1; });
      var mlf = Math.max.apply(null, Object.values(lf));
      var mlen = parseInt(getMajorityValue(lf, mlf));
      var refD = [];
      for (var pos = 0; pos < mlen; pos++) {
        var pv = dimsOK.filter(function(r) { return r.dimNumbers.length === mlen; }).map(function(r) { return r.dimNumbers[pos]; });
        pv.sort(function(a,b){return a-b;});
        refD.push(pv[Math.floor(pv.length / 2)]);
      }
      successful.forEach(function(r) {
        if (!r.dimNumbers || r.dimNumbers.length === 0) return;
        if (r.dimNumbers.length !== mlen) return;
        var err = false;
        for (var p = 0; p < refD.length; p++) {
          if (refD[p] > 0 && Math.abs(r.dimNumbers[p] - refD[p]) / refD[p] > 0.05) { err = true; break; }
        }
        if (err) {
          var reason = tf('anomalyDim', { val: r.dimNumbers.join('\u00d7'), ref: refD.join('\u00d7') });
          addCellAnomaly(r.mp.code, 'specs', reason, { type: 'dim_diff' });
          addIssue(r.mp.code, 'detail', reason);
        }
      });
    }

    // ── 4. PESO (tolerancia 10%) ─────────────────────────────
    var wOK = successful.filter(function(r) { return r.weightGrams !== null; });
    if (wOK.length >= 2) {
      var wv = wOK.map(function(r) { return r.weightGrams; }).sort(function(a,b){return a-b;});
      var rw = wv[Math.floor(wv.length / 2)];
      successful.forEach(function(r) {
        if (r.weightGrams === null) return;
        if (rw > 0 && Math.abs(r.weightGrams - rw) / rw > 0.10) {
          var reason = tf('anomalyWeight', { val: r.weightGrams, ref: rw });
          addCellAnomaly(r.mp.code, 'specs', reason, { type: 'weight_diff' });
          addIssue(r.mp.code, 'detail', reason);
        }
      });
    }

    // ── 5. ATRIBUTOS TÉCNICOS ────────────────────────────────
    var allAK = {};
    successful.forEach(function(r) { Object.keys(r.technicalAttribs).forEach(function(k) { allAK[k] = true; }); });
    Object.keys(allAK).forEach(function(attrKey) {
      var vm = {};
      successful.forEach(function(r) { var a = r.technicalAttribs[attrKey]; vm[r.mp.code] = a ? a.values.slice().sort().join('|') : '__missing__'; });
      var pv2 = Object.values(vm).filter(function(v) { return v !== '__missing__'; });
      var uv  = pv2.filter(function(v,i,a) { return a.indexOf(v) === i; });
      if (uv.length <= 1) return;
      var freq = {};
      pv2.forEach(function(v) { freq[v] = (freq[v] || 0) + 1; });
      var mf = Math.max.apply(null, Object.values(freq));
      var pat = technicalPatterns.find(function(p) { return p.key === attrKey; }) || { icon:'🔧', label:attrKey };
      successful.forEach(function(r) {
        var cv = vm[r.mp.code];
        if (cv !== '__missing__' && freq[cv] < mf) {
          var reason = tf('anomalyTechDiff', { icon: pat.icon, label: pat.label, val: cv, maj: getMajorityValue(freq, mf) });
          addCellAnomaly(r.mp.code, 'title', reason, { attrKey: attrKey, type: 'tech_diff' });
          addIssue(r.mp.code, 'detail', reason);
        }
      });
    });

    // ── 6. LONGITUD TÍTULO ───────────────────────────────────
    var lens = successful.map(function(r) { return r.chars || 0; });
    var avg  = lens.reduce(function(a,b) { return a+b; }, 0) / lens.length;
    var std  = Math.sqrt(lens.map(function(l) { return Math.pow(l-avg,2); }).reduce(function(a,b){return a+b;},0) / lens.length);
    successful.forEach(function(r) {
      if (std > 0 && Math.abs((r.chars||0) - avg) > std * 2.5) {
        var reason = tf('anomalyTitle', { n: r.chars, avg: Math.round(avg) });
        addCellAnomaly(r.mp.code, 'title', reason, { type: 'title_length' });
        addIssue(r.mp.code, 'title', reason);
      }
    });
  }

  function applyAnomalyStyles() {
    Object.keys(cellAnomalies).forEach(function(key) {
      var cell = document.getElementById('grid-' + key);
      if (!cell || !cellAnomalies[key].length) return;
      cell.classList.add('kami-cell-alert');
      var badge = document.createElement('div');
      badge.className = 'kami-anomaly-badge level-alert';
      badge.textContent = '🔴 ' + cellAnomalies[key].length;
      cell.appendChild(badge);
      badge.addEventListener('mouseenter', function(e) { showAnomalyTooltip(e, cellAnomalies[key]); });
      badge.addEventListener('mouseleave', hideAnomalyTooltip);
    });
    highlightSpecsInline();
    highlightVariantsInline();
    var tot = Object.keys(cellAnomalies).length;
    var summaryEl = document.getElementById('atc-summary');
    if (summaryEl && tot > 0)
      summaryEl.innerHTML += ' &nbsp;<span style="color:#ef4444;font-weight:bold;">' + tf('errorsDetected', { n: tot }) + '</span>';
  }

  function highlightSpecsInline() {
    allResults.forEach(function(r) {
      if (r.status !== 'success') return;
      var sc = document.getElementById('grid-specs-' + r.mp.code); if (!sc) return;
      var an = cellAnomalies['specs-' + r.mp.code] || [];
      var da = an.find(function(a) { return a.meta && a.meta.type === 'dim_diff'; });
      var wa = an.find(function(a) { return a.meta && a.meta.type === 'weight_diff'; });
      sc.querySelectorAll('.atc-spec-chip').forEach(function(chip) {
        var lbl = chip.querySelector('.atc-spec-lbl'); if (!lbl) return;
        var lt = lbl.textContent.toLowerCase();
        if ((lt.indexOf('dim') !== -1 || lt.indexOf('abm') !== -1) && da) { chip.classList.add('spec-alert'); var s=document.createElement('span');s.className='atc-spec-diff';s.textContent='🔴';s.title=da.reason;chip.appendChild(s); }
        if ((lt.indexOf('peso') !== -1 || lt.indexOf('weight') !== -1 || lt.indexOf('gewicht') !== -1 || lt.indexOf('poids') !== -1) && wa) { chip.classList.add('spec-alert'); var s2=document.createElement('span');s2.className='atc-spec-diff';s2.textContent='🔴';s2.title=wa.reason;chip.appendChild(s2); }
      });
    });
  }

  function highlightVariantsInline() {
    allResults.forEach(function(r) {
      if (r.status !== 'success') return;
      var vc = document.getElementById('grid-variants-' + r.mp.code); if (!vc) return;
      var an = cellAnomalies['variants-' + r.mp.code] || []; if (!an.length) return;
      vc.querySelectorAll('.atc-variant-chip').forEach(function(chip) {
        var canonical = chip.getAttribute('data-canonical'); if (!canonical) return;
        var rel = an.find(function(a) { return a.meta && a.meta.canonical === canonical; });
        if (rel) { chip.classList.add('has-alert'); var ind=document.createElement('span');ind.style.cssText='margin-left:3px;font-size:9px;';ind.textContent='🔴';ind.title=rel.reason;chip.appendChild(ind); }
      });
    });
  }

  function showAnomalyTooltip(e, anomalies) {
    hideAnomalyTooltip();
    var tip = document.createElement('div'); tip.id = 'kami-anomaly-tip'; tip.style.border = '1px solid #ef4444';
    var html = '<div style="font-weight:bold;color:#ef4444;margin-bottom:6px;">' + t('anomalyErrors') + '</div>';
    anomalies.forEach(function(a) { html += '<div style="padding:3px 0;border-bottom:1px solid #2a3a5e;line-height:1.5;">' + escapeHTML(a.reason) + '</div>'; });
    tip.innerHTML = html; document.body.appendChild(tip);
    var rect = e.target.getBoundingClientRect();
    tip.style.left = Math.min(rect.right + 8, window.innerWidth - 310) + 'px';
    tip.style.top  = Math.max(rect.top - 20, 8) + 'px';
  }
  function hideAnomalyTooltip() { var o = document.getElementById('kami-anomaly-tip'); if (o) o.remove(); }

  function getROWLabels() {
    return {
      img:      t('rowImg'),
      title:    t('rowTitle'),
      price:    t('rowPrice'),
      variants: t('rowVariants'),
      specs:    t('rowSpecs'),
      bullets:  t('rowBullets'),
      iss:      t('rowISS')
    };
  }

  function renderAnomalySummaryBanner() {
    var old = document.getElementById('kami-anomaly-banner'); if (old) old.remove();
    var items = [];
    Object.keys(cellAnomalies).forEach(function(key) {
      var p = key.split('-'); items.push({ rowId: p[0], mpCode: p[1] });
    });
    if (!items.length) return;
    var banner = document.createElement('div'); banner.id = 'kami-anomaly-banner';
    var rl = getROWLabels();
    var errWord = {es:'errores', en:'errors', de:'Fehler', fr:'erreurs', it:'errori'};
    var html = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span style="color:#ef4444;font-weight:bold;font-size:12px;margin-right:4px;">🔴 ' + items.length + ' ' + (errWord[currentLang] || 'errors') + '</span>';
    items.slice(0, 10).forEach(function(item) {
      html += '<span class="kami-chip-alert" data-target="grid-' + item.rowId + '-' + item.mpCode + '">🔴 ' + item.mpCode + ' · ' + (rl[item.rowId] || item.rowId) + '</span>';
    });
    html += '</div>'; banner.innerHTML = html;
    banner.querySelectorAll('[data-target]').forEach(function(chip) {
      chip.addEventListener('click', function() { var target = document.getElementById(this.getAttribute('data-target')); if (target) target.scrollIntoView({ behavior:'smooth', block:'center' }); });
    });
    var progress = document.getElementById('atc-progress');
    if (progress && progress.parentNode) progress.parentNode.insertBefore(banner, progress);
  }

  function renderISSRow(selectedMPs) {
    var grid = document.getElementById('atc-grid');
    var rl = getROWLabels();
    var lc = document.createElement('div'); lc.className = 'atc-cell label-col iss-label atc-row-iss atc-row-last'; lc.innerHTML = rl.iss.replace(/\n/g,'<br>'); grid.appendChild(lc);
    selectedMPs.forEach(function(mp) {
      var cell = document.createElement('div'); cell.className = 'atc-cell iss-summary-cell atc-row-iss atc-row-last'; cell.id = 'grid-iss-' + mp.code;
      cell.innerHTML = '<span class="iss-summary-empty">' + t('analyzing') + '</span>'; grid.appendChild(cell);
    });
  }

  function fillISSCell(mpCode, result) {
    var cell = document.getElementById('grid-iss-' + mpCode); if (!cell) return;
    var issues = mpIssueMap[mpCode];
    if (!issues || (issues.image.length === 0 && issues.title.length === 0 && issues.detail.length === 0)) {
      cell.innerHTML = '<span class="iss-summary-empty">' + t('noErrors') + '</span>'; return;
    }
    var html = '';
    var tc = [
      { key:'image',  label: t('labelImageUpdate'), cssClass:'type-image',  issType:'image'  },
      { key:'title',  label: t('labelTitleUpdate'), cssClass:'type-title',  issType:'title'  },
      { key:'detail', label: t('labelDetailIssue'), cssClass:'type-detail', issType:'detail' }
    ];
    tc.forEach(function(tItem) {
      var reasons = issues[tItem.key]; if (!reasons || !reasons.length) return;
      html += '<div class="iss-ticket-block">';
      html += '<button class="iss-ticket-btn ' + tItem.cssClass + '" data-mp="' + mpCode + '" data-type="' + tItem.issType + '">' + tItem.label + '<span class="iss-ticket-count">' + reasons.length + '</span></button>';
      html += '<div class="iss-ticket-reasons">';
      reasons.slice(0, 3).forEach(function(r) { html += '<span>· ' + escapeHTML(r.length > 55 ? r.substring(0,52)+'\u2026' : r) + '</span>'; });
      var moreWord = {es:'m\u00e1s', en:'more', de:'mehr', fr:'plus', it:'altri'};
      if (reasons.length > 3) html += '<span style="color:#444;">+' + (reasons.length-3) + ' ' + (moreWord[currentLang] || 'more') + '</span>';
      html += '</div></div>';
    });
    cell.innerHTML = html || '<span class="iss-summary-empty">' + t('noErrors') + '</span>';
    cell.querySelectorAll('.iss-ticket-btn').forEach(function(btn2) {
      btn2.addEventListener('click', function() {
        var it = this.getAttribute('data-type');
        var res = allResults.find(function(r) { return r.mp.code === mpCode && r.status === 'success'; });
        if (res) openISS(it, res);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // PANEL & INIT
  // ══════════════════════════════════════════════════════════════
  var asin = getASIN() || '???', currentMP = getCurrentMarketplace(), allResults = [], diffEnabled = false;
  var orderedMarketplaces = marketplaces.slice();
  if (currentMP) { orderedMarketplaces = orderedMarketplaces.filter(function(mp){return mp.code!==currentMP.code;}); orderedMarketplaces.unshift(currentMP); }

  var btn = document.createElement('button'); btn.id = 'atc-btn'; btn.textContent = t('btnLabel'); document.body.appendChild(btn);
  var overlay = document.createElement('div'); overlay.id = 'atc-overlay'; document.body.appendChild(overlay);
  var filterHTML = orderedMarketplaces.map(function(mp){ return '<label class="atc-mp-filter checked" id="filter-label-'+mp.code+'"><input type="checkbox" checked id="filter-'+mp.code+'"> '+mp.flag+' '+mp.code+'</label>'; }).join('');

  var langSwitcherHTML = '<div id="kami-lang-switcher"><span style="color:#666;font-size:10px;margin-right:2px;">🌐</span>'
    + ['es','en','de','fr','it'].map(function(l) {
        return '<button class="kami-lang-btn' + (l === currentLang ? ' active' : '') + '" data-lang="' + l + '">' + l.toUpperCase() + '</button>';
      }).join('')
    + '</div>';

  var panel = document.createElement('div'); panel.id = 'atc-panel';
  panel.innerHTML = '<div id="atc-header"><h2>' + tf('headerTitle', { v: VERSION, asin: escapeHTML(asin) }) + '</h2><div style="display:flex;align-items:center;gap:10px;"><button id="atc-close">✕</button></div></div>'
    + '<div id="atc-toolbar">' + filterHTML + '<button id="atc-diff-toggle">' + t('diffOff') + '</button>' + langSwitcherHTML + '</div>'
    + '<div id="atc-progress"><div id="atc-progress-bar"><div id="atc-progress-fill"></div></div><span id="atc-progress-text">' + t('progressReady') + '</span></div>'
    + '<div id="atc-body"><div id="atc-grid"></div></div>'
    + '<div id="atc-footer"><span id="atc-summary"></span><div style="display:flex;gap:8px;"><button id="atc-clear-cache-btn" class="atc-fbtn">' + t('clearCache') + '</button><button id="atc-export-btn" class="atc-fbtn">' + t('exportCSV') + '</button><button id="atc-copy-btn" class="atc-fbtn">' + t('copyBtn') + '</button></div></div>';
  document.body.appendChild(panel);

  function updateStaticUI() {
    btn.textContent = t('btnLabel');
    var h2 = panel.querySelector('#atc-header h2');
    if (h2) h2.textContent = tf('headerTitle', { v: VERSION, asin: asin });
    var dt = document.getElementById('atc-diff-toggle');
    if (dt) dt.textContent = diffEnabled ? t('diffOn') : t('diffOff');
    var pt = document.getElementById('atc-progress-text');
    if (pt && (pt.textContent === 'Listo' || pt.textContent === 'Ready' || pt.textContent === 'Bereit' || pt.textContent === 'Pr\u00eat' || pt.textContent === 'Pronto')) pt.textContent = t('progressReady');
    var cc = document.getElementById('atc-clear-cache-btn');
    if (cc) cc.textContent = t('clearCache');
    var ex = document.getElementById('atc-export-btn');
    if (ex) ex.textContent = t('exportCSV');
    var cp = document.getElementById('atc-copy-btn');
    if (cp) cp.textContent = t('copyBtn');
    // Update row labels
    var rl = getROWLabels();
    ['img','title','price','variants','specs','bullets'].forEach(function(rowId) {
      var labelEl = panel.querySelector('.atc-row-' + rowId + '.label-col');
      if (labelEl && !labelEl.classList.contains('iss-label')) labelEl.textContent = rl[rowId] || '';
    });
    var issLabel = panel.querySelector('.iss-label');
    if (issLabel) issLabel.innerHTML = rl.iss.replace(/\n/g,'<br>');
  }

  function closePanel() { panel.style.display = 'none'; overlay.style.display = 'none'; }
  btn.addEventListener('click', startComparison);
  overlay.addEventListener('click', closePanel);
  document.getElementById('atc-close').addEventListener('click', closePanel);

  document.getElementById('atc-copy-btn').addEventListener('click', copyResults);
  document.getElementById('atc-export-btn').addEventListener('click', exportCSV);

  document.getElementById('atc-diff-toggle').addEventListener('click', function() {
    diffEnabled = !diffEnabled;
    this.textContent = diffEnabled ? t('diffOn') : t('diffOff');
    this.classList.toggle('active', diffEnabled);
    rerenderTitles();
  });

  document.getElementById('atc-clear-cache-btn').addEventListener('click', function() {
    Object.keys(sessionStorage).filter(function(k){return k.startsWith('kami_');}).forEach(function(k){sessionStorage.removeItem(k);});
    this.textContent = t('clearCacheDone');
    var self = this;
    setTimeout(function(){ self.textContent = t('clearCache'); }, 2000);
  });

  // Language switcher events (delegated)
  panel.addEventListener('click', function(e) {
    var btn2 = e.target.closest('.kami-lang-btn');
    if (!btn2) return;
    var lang = btn2.getAttribute('data-lang');
    if (!lang || lang === currentLang) return;
    currentLang = lang;
    try { GM_setValue('kami_lang', lang); } catch(ex) {}
    panel.querySelectorAll('.kami-lang-btn').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-lang') === lang); });
    updateStaticUI();
  });

  orderedMarketplaces.forEach(function(mp) {
    var cb = document.getElementById('filter-'+mp.code), lbl = document.getElementById('filter-label-'+mp.code);
    if (cb && lbl) cb.addEventListener('change', function(){ lbl.classList.toggle('checked', cb.checked); });
  });

  var ROW_IDS = ['img','title','price','variants','specs','bullets'];

  function buildGrid(selectedMPs) {
    var grid = document.getElementById('atc-grid'); grid.innerHTML = '';
    grid.style.gridTemplateColumns = '110px repeat(' + selectedMPs.length + ', 1fr)';
    var rl = getROWLabels();
    var eh = document.createElement('div'); eh.className='atc-cell label-col mp-header'; eh.style.background='#0a1628'; eh.innerHTML='<span style="color:#FF9900;font-size:11px;">KAMI v'+VERSION+'</span>'; grid.appendChild(eh);
    selectedMPs.forEach(function(mp) {
      var ic = currentMP && mp.code === currentMP.code;
      var cell = document.createElement('div'); cell.className='atc-cell mp-header'+(ic?' current-mp':''); cell.id='grid-header-'+mp.code;
      cell.innerHTML = '<span class="atc-mp-flag">'+mp.flag+'</span><span class="atc-mp-code">'+mp.code+'</span><span class="atc-mp-lang">'+mp.lang+'</span>'+(ic?'<span class="atc-badge-current">'+t('badgeCurrent')+'</span>':'');
      grid.appendChild(cell);
    });
    ROW_IDS.forEach(function(rowId) {
      var lc = document.createElement('div'); lc.className='atc-cell label-col atc-row-'+rowId; lc.textContent = rl[rowId]; grid.appendChild(lc);
      selectedMPs.forEach(function(mp) {
        var c = document.createElement('div'); c.className='atc-cell atc-row-'+rowId; c.id='grid-'+rowId+'-'+mp.code;
        c.innerHTML = '<span class="cell-loading"><span class="atc-spinner"></span>' + t('loading') + '</span>';
        grid.appendChild(c);
      });
    });
    renderISSRow(selectedMPs);
  }

  function fillGridRow(result) {
    var mp = result.mp, ic = currentMP && mp.code === currentMP.code;
    var hc = document.getElementById('grid-header-' + mp.code);
    if (hc) {
      if (result.fromCache) hc.innerHTML += '<span class="atc-badge-cache">' + t('badgeCache') + '</span>';
      if (result.status !== 'success') hc.classList.add('error-mp');
    }
    if (result.status !== 'success') {
      ROW_IDS.forEach(function(rowId) {
        var c = document.getElementById('grid-'+rowId+'-'+mp.code);
        if (c) c.innerHTML = rowId==='title'
          ? '<span class="cell-error">\u274c '+escapeHTML(result.error||t('notAvailable'))+'</span><br><a href="'+escapeHTML(result.url)+'" target="_blank" class="atc-link">'+t('verify')+'</a>'
          : '<span class="atc-no-data">' + t('noData') + '</span>';
      });
      return;
    }
    // IMAGE
    var imgCell = document.getElementById('grid-img-' + mp.code);
    if (imgCell) {
      if (result.image) {
        imgCell.innerHTML = '<div class="atc-img-box"><img src="'+escapeHTML(result.image)+'" alt="'+mp.code+'"><div class="iss-img-badge" style="display:none;position:absolute;bottom:3px;right:3px;background:#FF9900;color:#111;font-size:9px;font-weight:bold;border-radius:4px;padding:1px 5px;">🎫 IMG</div></div>';
        imgCell.style.position = 'relative';
        var ib = imgCell.querySelector('.atc-img-box');
        ib.addEventListener('click', function(){openISS('image',result);});
        ib.addEventListener('mouseenter', function(){imgCell.querySelector('.iss-img-badge').style.display='block';});
        ib.addEventListener('mouseleave', function(){imgCell.querySelector('.iss-img-badge').style.display='none';});
      } else { imgCell.innerHTML = '<div class="atc-img-box"><span class="atc-no-img-txt">📷 N/A</span></div>'; }
    }
    // TITLE
    var tc2 = document.getElementById('grid-title-' + mp.code);
    if (tc2) {
      var wc = result.title ? result.title.split(/\s+/).filter(Boolean).length : 0;
      var cr = allResults.find(function(r){return currentMP&&r.mp.code===currentMP.code&&r.status==='success';});
      var rw2 = cr ? getWordSet(cr.title) : new Set();
      var td = diffEnabled && !ic ? highlightTitleDiff(result.title, rw2) : escapeHTML(result.title);
      tc2.innerHTML = '<div class="atc-title-cell">'+td+'</div><div class="atc-chars-info">📏 '+result.chars+' '+t('charsLabel')+' · 📝 '+wc+' '+t('wordsLabel')+'</div><a href="'+escapeHTML(result.url)+'" target="_blank" class="atc-link">'+t('viewOnAmazon')+'</a>';
      tc2.querySelector('.atc-title-cell').addEventListener('click', function(){openISS('title',result);});
    }
    // PRICE
    var pc = document.getElementById('grid-price-' + mp.code);
    if (pc) pc.innerHTML = result.price ? '<span class="atc-price-val">'+escapeHTML(result.price)+'</span>' : '<span class="atc-no-data">N/A</span>';
    // VARIANTS
    var vc = document.getElementById('grid-variants-' + mp.code);
    if (vc) {
      if (result.variants && result.variants.length > 0) {
        var vh = '';
        result.variants.forEach(function(v) {
          var can = normalizeVariantLabel(v.label);
          vh += '<span class="atc-variant-chip" data-canonical="'+escapeHTML(can)+'">'+v.icon+' <span class="atc-vc-lbl">'+escapeHTML(v.label)+':</span> <span class="atc-vc-val">'+escapeHTML(v.value)+'</span><span class="atc-vc-canonical">['+escapeHTML(can)+']</span></span>';
        });
        vc.innerHTML = vh;
        vc.querySelectorAll('.atc-variant-chip').forEach(function(chip){chip.addEventListener('click',function(){openISS('detail',result);});});
      } else { vc.innerHTML = '<span class="atc-no-data">' + t('noVariants') + '</span>'; }
    }
    // SPECS
    var sc2 = document.getElementById('grid-specs-' + mp.code);
    if (sc2) {
      var dn = parseDimensionNumbers(result.dimensions), wg = parseWeightGrams(result.weight);
      var dns = dn.length > 0 ? dn.join(' \u00d7 ') + ' cm' : '';
      var wns = wg !== null ? wg + 'g' : '';
      var dimLbl = t('dimLabel'), weightLbl = t('weightLabel');
      var sh = result.dimensions
        ? '<span class="atc-spec-chip" data-type="dim">📐 <span class="atc-spec-lbl">'+dimLbl+':</span> <span class="atc-spec-val">'+escapeHTML(result.dimensions)+'</span>'+(dns?'<span class="atc-spec-diff">('+escapeHTML(dns)+')</span>':'')+'</span>'
        : '<span class="atc-spec-chip no-data" data-type="dim">📐 <span class="atc-spec-lbl">'+dimLbl+':</span> <span class="atc-spec-val">N/A</span></span>';
      sh += result.weight
        ? '<span class="atc-spec-chip" data-type="weight">⚖️ <span class="atc-spec-lbl">'+weightLbl+':</span> <span class="atc-spec-val">'+escapeHTML(result.weight)+'</span>'+(wns?'<span class="atc-spec-diff">('+escapeHTML(wns)+')</span>':'')+'</span>'
        : '<span class="atc-spec-chip no-data" data-type="weight">⚖️ <span class="atc-spec-lbl">'+weightLbl+':</span> <span class="atc-spec-val">N/A</span></span>';
      sc2.innerHTML = sh;
    }
    // BULLETS
    var bc = document.getElementById('grid-bullets-' + mp.code);
    if (bc) {
      if (result.bullets && result.bullets.length > 0) {
        var bid = 'grid-blist-' + mp.code;
        bc.innerHTML = '<button class="atc-toggle-bullets" data-target="'+bid+'">'+tf('seeAttribs',{n:result.bullets.length})+'</button><div class="atc-bullets-container" id="'+bid+'"><ul class="atc-bullets-list">'+result.bullets.map(function(b){return '<li>'+escapeHTML(b)+'</li>';}).join('')+'</ul></div>';
        bc.querySelector('.atc-toggle-bullets').addEventListener('click', function(){
          var con = document.getElementById(this.getAttribute('data-target'));
          var op = con.classList.toggle('open');
          this.textContent = op ? t('hideAttribs') : tf('seeAttribs',{n:con.querySelectorAll('li').length});
        });
      } else { bc.innerHTML = '<span class="atc-no-data">' + t('noAttributes') + '</span>'; }
    }
  }

  function rerenderTitles() {
    var cr = allResults.find(function(r){return currentMP&&r.mp.code===currentMP.code&&r.status==='success';});
    var rw2 = cr ? getWordSet(cr.title) : new Set();
    allResults.forEach(function(r) {
      if (r.status !== 'success') return;
      var ic = currentMP && r.mp.code === currentMP.code;
      var te = document.querySelector('#grid-title-' + r.mp.code + ' .atc-title-cell');
      if (te) te.innerHTML = diffEnabled && !ic ? highlightTitleDiff(r.title, rw2) : escapeHTML(r.title);
    });
  }

  async function startComparison() {
    var currentAsin = getASIN(); if (!currentAsin) { alert(t('noAsin')); return; }
    var selectedMPs = orderedMarketplaces.filter(function(mp){ var cb=document.getElementById('filter-'+mp.code); return cb&&cb.checked; });
    if (!selectedMPs.length) { alert(t('noMpSelected')); return; }
    panel.style.display = 'flex'; overlay.style.display = 'block';
    btn.disabled = true; btn.textContent = t('btnLoading');
    allResults = []; cellAnomalies = {}; mpIssueMap = {};
    var ob = document.getElementById('kami-anomaly-banner'); if (ob) ob.remove();
    document.getElementById('atc-progress-fill').style.width = '0%';
    document.getElementById('atc-progress-text').textContent = '0 / ' + selectedMPs.length;
    document.getElementById('atc-summary').textContent = '';
    buildGrid(selectedMPs);
    var completed = 0;
    var promises = selectedMPs.map(function(mp) {
      return fetchData(mp, currentAsin).then(function(result) {
        completed++; allResults.push(result);
        document.getElementById('atc-progress-fill').style.width = Math.round((completed/selectedMPs.length)*100) + '%';
        document.getElementById('atc-progress-text').textContent = completed + ' / ' + selectedMPs.length;
        fillGridRow(result); return result;
      });
    });
    await Promise.allSettled(promises);
    analyzeAnomalies(allResults);
    applyAnomalyStyles();
    renderAnomalySummaryBanner();
    selectedMPs.forEach(function(mp) { var res=allResults.find(function(r){return r.mp.code===mp.code;}); if(res)fillISSCell(mp.code,res); });
    var found = allResults.filter(function(r){return r.status==='success';}).length;
    document.getElementById('atc-summary').textContent = tf('summaryOk', { found: found, notfound: allResults.length - found });
    btn.disabled = false; btn.textContent = t('btnLabel');
    if (diffEnabled) rerenderTitles();
  }

  function copyResults() {
    var text = 'ASIN: ' + getASIN() + '\n\n';
    allResults.forEach(function(r) {
      text += r.mp.flag+' '+r.mp.code+' ('+r.mp.domain+')\n';
      text += '  '+t('rowTitle')+': '+(r.title||t('notAvailable'))+'\n';
      if (r.price) text += '  '+t('rowPrice')+': '+r.price+'\n';
      if (r.variants&&r.variants.length>0) r.variants.forEach(function(v){text+='  '+v.icon+' '+v.label+' ['+normalizeVariantLabel(v.label)+']: '+v.value+'\n';});
      text += '  📐 '+t('dimLabel')+': '+(r.dimensions||'N/A'); if(r.dimNumbers&&r.dimNumbers.length>0)text+=' \u2192 '+r.dimNumbers.join('\u00d7')+' cm'; text+='\n';
      text += '  ⚖️ '+t('weightLabel')+': '+(r.weight||'N/A'); if(r.weightGrams)text+=' \u2192 '+r.weightGrams+'g'; text+='\n';
      if (r.bullets&&r.bullets.length>0){text+='  '+t('rowBullets')+':\n';r.bullets.forEach(function(b){text+='    \u2022 '+b+'\n';});}
      var iss = mpIssueMap[r.mp.code];
      if (iss) {
        if(iss.image.length>0){text+='  '+t('labelImageUpdate')+':\n';iss.image.forEach(function(i){text+='    - '+i+'\n';});}
        if(iss.title.length>0){text+='  '+t('labelTitleUpdate')+':\n';iss.title.forEach(function(i){text+='    - '+i+'\n';});}
        if(iss.detail.length>0){text+='  '+t('labelDetailIssue')+':\n';iss.detail.forEach(function(i){text+='    - '+i+'\n';});}
      }
      text += '\n';
    });
    navigator.clipboard.writeText(text);
    var cb = document.getElementById('atc-copy-btn'); cb.textContent = t('copyDone');
    setTimeout(function(){var b=document.getElementById('atc-copy-btn');if(b)b.textContent=t('copyBtn');}, 2000);
  }

  function exportCSV() {
    var csv = t('csvHeader');
    allResults.forEach(function(r) {
      function q(v){return v?'"'+String(v).replace(/"/g,'""')+'"':'';}
      var vt = (r.variants&&r.variants.length>0)?r.variants.map(function(v){return '['+normalizeVariantLabel(v.label)+'] '+v.label+': '+v.value;}).join(' | '):'';
      var dn2 = (r.dimNumbers&&r.dimNumbers.length>0)?r.dimNumbers.join('\u00d7')+' cm':'';
      var wn  = r.weightGrams?r.weightGrams+'g':'';
      var iss = mpIssueMap[r.mp.code]||{image:[],title:[],detail:[]};
      csv += [r.mp.code,r.mp.lang,q(r.price),q(r.title),r.chars,q(vt),q(r.dimensions),q(dn2),q(r.weight),q(wn),q(iss.image.join(' | ')),q(iss.title.join(' | ')),q(iss.detail.join(' | ')),r.url].join(',') + '\n';
    });
    var blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    var link = document.createElement('a'); link.href=URL.createObjectURL(blob); link.download='amazon_EU_'+getASIN()+'.csv';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

})();
