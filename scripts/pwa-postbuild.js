/**
 * Injects PWA metadata into the exported web index.html.
 *
 * Expo Router's `output: single` ignores app/+html.tsx, so we add the manifest
 * link, Apple home-screen meta tags, an app-style viewport and the service
 * worker registration here, after `expo export --platform web`.
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[pwa] dist/index.html not found — run expo export first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// App-style viewport (no zoom, safe-area aware).
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />'
);

const HEAD_TAGS = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Kira Asistan" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${HEAD_TAGS}\n  </head>`);
}

const SW_SCRIPT = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>`;

if (!html.includes("serviceWorker.register('/sw.js')")) {
  html = html.replace('</body>', `${SW_SCRIPT}\n  </body>`);
}

fs.writeFileSync(indexPath, html);
console.log('[pwa] Injected manifest, Apple meta tags and service worker into dist/index.html');

// SPA fallback for GitHub Pages: serve the app shell for unknown deep links
// (e.g. /k/<token> tenant links) so expo-router can resolve them client-side.
const notFoundPath = path.join(__dirname, '..', 'dist', '404.html');
fs.copyFileSync(indexPath, notFoundPath);
console.log('[pwa] Wrote dist/404.html (SPA deep-link fallback)');
