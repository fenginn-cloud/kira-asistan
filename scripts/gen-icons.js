/* Kira Asistan uygulama ikonlarını üretir (SVG → PNG).
 * Çalıştır:  node scripts/gen-icons.js
 * Tema: mavi zemin + beyaz apartman/rezidans silüeti (dikey pencereler + kapı). */
const sharp = require('sharp');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const BLUE = '#1E5FF0';

// Beyaz bina glifi: dış dikdörtgen + evenodd ile açılmış 3 dikey pencere yarığı
// ve alttaki kapı boşluğu. Delikler şeffaf kalır (her zeminde çalışır).
function glyph(fill) {
  const outer = 'M362 300 H662 V740 H362 Z';
  const slit1 = 'M417 346 H443 V678 H417 Z';
  const slit2 = 'M499 346 H525 V678 H499 Z';
  const slit3 = 'M581 346 H607 V678 H581 Z';
  const door = 'M476 656 H548 V740 H476 Z';
  return `<path fill-rule="evenodd" fill="${fill}"
    d="${outer} ${slit1} ${slit2} ${slit3} ${door}"/>`;
}

function iconSvg({ bg, fill }) {
  const bgLayer = bg ? `<rect width="1024" height="1024" fill="${BLUE}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${bgLayer}${glyph(fill)}</svg>`;
}

async function png(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(ASSETS, out));
  console.log('✓', out, `${size}x${size}`);
}

(async () => {
  await png(iconSvg({ bg: true, fill: '#FFFFFF' }), 1024, 'icon.png');
  await png(iconSvg({ bg: false, fill: '#FFFFFF' }), 1024, 'adaptive-icon.png');
  await png(iconSvg({ bg: true, fill: '#FFFFFF' }), 256, 'favicon.png');
  await png(iconSvg({ bg: false, fill: '#FFFFFF' }), 96, 'notification-icon.png');
})();
