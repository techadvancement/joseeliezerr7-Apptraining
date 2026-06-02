// Post-build HTML injection: PWA meta tags, preconnect, instant splash, SW registration.
// Run from Dockerfile after `expo export`.
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node inject-html.js <path/to/index.html>');
  process.exit(1);
}

let h = fs.readFileSync(file, 'utf8');

// Extract Supabase origin (if set at build time) so we can preconnect.
const supaUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
let supaOrigin = '';
try {
  if (supaUrl) supaOrigin = new URL(supaUrl).origin;
} catch (_) { supaOrigin = ''; }

const headTags = [
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
  '<link rel="manifest" href="/manifest.webmanifest" />',
  '<meta name="theme-color" content="#0B0F1A" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<meta name="apple-mobile-web-app-title" content="Tech Advancement" />',
  '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />',
  '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  supaOrigin ? '<link rel="preconnect" href="' + supaOrigin + '" crossorigin />' : '',
  supaOrigin ? '<link rel="dns-prefetch" href="' + supaOrigin + '" />' : '',
  '<style>html,body,#root{background-color:#0B0F1A !important;color-scheme:dark;}'
    + '#__splash{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background-color:#000;transition:opacity .45s ease;}'
    + '#__splash img{width:62%;max-width:320px;height:auto;object-fit:contain;animation:__splashPulse 1.8s ease-in-out infinite;}'
    + '#__splash.__hide{opacity:0;pointer-events:none;}'
    + '@keyframes __splashPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.82;transform:scale(.96);}}'
    // Inputs/textarea: kill UA defaults + autofill white box. React Native
    // Web renders these as native <input>/<textarea>, so Chrome/Safari
    // override the dark background with a white "autofill" box and on
    // Safari with a white default chrome. Force transparent bg, light text.
    + 'input,textarea,select{background-color:transparent !important;color:#F4F6FB !important;-webkit-text-fill-color:#F4F6FB !important;caret-color:#F4F6FB;border:0;outline:none;}'
    + 'input::placeholder,textarea::placeholder{color:#5B6478 !important;-webkit-text-fill-color:#5B6478 !important;opacity:1;}'
    + 'input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,input:-webkit-autofill:active,textarea:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px transparent inset !important;box-shadow:0 0 0 1000px transparent inset !important;-webkit-text-fill-color:#F4F6FB !important;caret-color:#F4F6FB !important;transition:background-color 9999s ease-in-out 0s;}'
    // Make the autofill chip Chrome puts inside the field also blend in.
    + 'input:autofill{background:transparent !important;color:#F4F6FB !important;}'
    + '</style>',
].filter(Boolean).map((t) => '    ' + t).join('\n');

// Drop any existing viewport meta (Expo emits one too).
h = h.replace(/<meta name="viewport"[^>]*\/>/g, '');
h = h.replace('</head>', '\n' + headTags + '\n  </head>');

// Defensive boot scripts:
// 1. Unregister any leftover Service Worker + clear its caches. The previous
//    killswitch SW called clients.navigate() on activate which caused a
//    reload loop. Until we reintroduce a real caching SW this stays.
// 2. Visible boot-time error reporter. If the JS bundle throws before React
//    mounts (or React itself crashes), the user sees the error text instead
//    of an indefinite black screen. Without this, "blank page" is impossible
//    to diagnose without DevTools.
// 3. Splash overlay: shown immediately, removed once #root has children
//    (React mounted). Hard timeout at 12s so a bundle failure doesn't trap it.
const boot = [
  '<script>',
  // 1. SW cleanup
  'if("serviceWorker" in navigator){',
    'navigator.serviceWorker.getRegistrations().then(function(rs){',
      'rs.forEach(function(r){r.unregister();});',
    '}).catch(function(){});',
    'if(window.caches&&caches.keys){',
      'caches.keys().then(function(ks){',
        'ks.forEach(function(k){caches.delete(k);});',
      '}).catch(function(){});',
    '}',
  '}',
  // 2. Visible error reporter
  '(function(){',
    'function show(msg){',
      'try{',
        'var d=document.getElementById("__boot_err")||document.createElement("div");',
        'd.id="__boot_err";',
        'd.style.cssText="position:fixed;left:0;right:0;bottom:0;max-height:50vh;overflow:auto;background:#3a0f10;color:#ffd9d9;font:12px/1.45 ui-monospace,Menlo,monospace;padding:10px 14px;z-index:99999;border-top:2px solid #d33;white-space:pre-wrap;word-break:break-word;";',
        'd.textContent=(d.textContent?d.textContent+"\\n\\n":"")+msg;',
        'document.body.appendChild(d);',
      '}catch(_){}',
    '}',
    'window.addEventListener("error",function(e){show("Error: "+(e.message||"unknown")+(e.filename?(" @ "+e.filename+":"+e.lineno):""));});',
    'window.addEventListener("unhandledrejection",function(e){var r=e.reason;show("Unhandled rejection: "+((r&&(r.message||r.toString))?r.message||r.toString():String(r)));});',
    // If the root never gets children within 8s, surface that too.
    'setTimeout(function(){var r=document.getElementById("root");if(r&&!r.firstChild)show("App did not mount within 8s. Bundle may have failed to execute. Open DevTools \\u2192 Console for details.");},8000);',
  '})();',
  // 3. Splash overlay lifecycle
  //    - Minimum visible time: 1800ms (so the splash actually reads, even on
  //      a warm cache where React mounts in 50ms).
  //    - Removed when React mounts (#root gets first child) — but never
  //      before the minimum elapses.
  //    - Failsafe at 12s in case the bundle never mounts.
  '(function(){',
    'var s=document.getElementById("__splash");if(!s)return;',
    'var hidden=false;var mounted=false;var minElapsed=false;var MIN_MS=1800;',
    'var t0=Date.now();',
    'function hide(){if(hidden)return;hidden=true;s.classList.add("__hide");setTimeout(function(){if(s&&s.parentNode)s.parentNode.removeChild(s);},450);}',
    'function maybeHide(){if(mounted&&minElapsed)hide();}',
    'function markMounted(){if(mounted)return;mounted=true;maybeHide();}',
    'setTimeout(function(){minElapsed=true;maybeHide();},MIN_MS);',
    'var r=document.getElementById("root");',
    'if(r&&"MutationObserver" in window){',
      'var mo=new MutationObserver(function(){if(r.firstChild){mo.disconnect();markMounted();}});',
      'mo.observe(r,{childList:true});',
      'if(r.firstChild){mo.disconnect();markMounted();}',
    '}',
    // Failsafe: never leave the splash up longer than 12s.
    'setTimeout(function(){mounted=true;minElapsed=true;hide();},12000);',
  '})();',
  '</script>',
].join('');
// Inject splash markup as the very first child of <body> so it paints before
// the JS bundle parses/executes. The image is served from /splash.png (copied
// from public/ by the Dockerfile). Use a regex so we still match if expo emits
// <body class="..."> or other attributes on the opening tag.
var splashMarkup = '<div id="__splash"><img src="/splash.png" alt="" /></div>';
h = h.replace(/<body([^>]*)>/, '<body$1>' + splashMarkup);
h = h.replace('</body>', boot + '</body>');

fs.writeFileSync(file, h);
console.log('HTML injected: PWA meta, preconnect to ' + (supaOrigin || '(none)') + ', splash, SW.');
