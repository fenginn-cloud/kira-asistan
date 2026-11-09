/**
 * Ortak PDF motoru — hem build'de (Node, boş şablonlar) hem tarayıcıda (online doldurma) çalışır.
 * Bağımlılıklar dışarıdan verilir: { PDFLib, fontkit, fonts: { r, b } (TTF bytes) }.
 * Belge her zaman TEK A4 sayfaya sığdırılır: sığmazsa ölçek küçültülerek yeniden yerleştirilir.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SablonPDF = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- biçimlendirme ---------- */
  var BIR = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  var ON = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  function uc(n) {
    var y = Math.floor(n / 100), o = Math.floor((n % 100) / 10), b = n % 10, s = [];
    if (y) s.push((y > 1 ? BIR[y] + ' ' : '') + 'yüz');
    if (o) s.push(ON[o]);
    if (b) s.push(BIR[b]);
    return s.join(' ');
  }
  /** 15250 → "on beş bin iki yüz elli" */
  function yaziyla(n) {
    n = Math.floor(n);
    if (!n) return 'sıfır';
    var groups = [[1e9, 'milyar'], [1e6, 'milyon'], [1e3, 'bin']], out = [];
    for (var i = 0; i < groups.length; i++) {
      var g = Math.floor(n / groups[i][0]);
      if (g) {
        out.push(g === 1 && groups[i][1] === 'bin' ? 'bin' : uc(g) + ' ' + groups[i][1]);
        n -= g * groups[i][0];
      }
    }
    if (n) out.push(uc(n));
    return out.join(' ');
  }
  function parseNum(v) {
    var s = String(v).replace(/[^0-9.,]/g, '');
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/\./g, '');
    return parseFloat(s);
  }
  function tl(n) {
    var hasKurus = Math.round(n * 100) % 100 !== 0;
    return n.toLocaleString('tr-TR', { minimumFractionDigits: hasKurus ? 2 : 0, maximumFractionDigits: 2 }) + ' TL';
  }
  /** Alan değerini belgeye yazılacak metne çevirir ('' = boş). */
  function fmt(field, v) {
    if (v == null || String(v).trim() === '') return '';
    v = String(v).trim();
    if (field && field.t === 'date') {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
      return m ? m[3] + '.' + m[2] + '.' + m[1] : v;
    }
    if (field && field.t === 'money') {
      var n = parseNum(v);
      if (!isFinite(n)) return v;
      var s = tl(n);
      if (field.words) {
        var k = Math.round(n * 100) % 100;
        s += ' (' + yaziyla(n) + ' Türk Lirası' + (k ? ' ' + uc(k) + ' kuruş' : '') + ')';
      }
      return s;
    }
    return v;
  }

  /** Şablondaki tüm alanlar id → alan */
  function fieldIndex(tpl) {
    var idx = {};
    (tpl.vars || []).forEach(function (f) { idx[f.id] = f; });
    tpl.doc.forEach(function (b) {
      (b.f || []).forEach(function (f) { idx[f.id] = idx[f.id] || f; });
      (b.cols || []).forEach(function (c) { c.f.forEach(function (f) { idx[f.id] = idx[f.id] || f; }); });
    });
    return idx;
  }

  /* ---------- PDF ---------- */
  async function render(deps, tpl, values) {
    values = values || {};
    var L = deps.PDFLib, rgb = L.rgb;
    var pdf = await L.PDFDocument.create();
    pdf.registerFontkit(deps.fontkit);
    var R = await pdf.embedFont(deps.fonts.r, { subset: true });
    var B = await pdf.embedFont(deps.fonts.b, { subset: true });
    pdf.setTitle(tpl.name);
    pdf.setAuthor('Kira Asistan');
    pdf.setCreator('Kira Asistan — kiraasist.fngn.com.tr');
    pdf.setLanguage('tr-TR');

    var W = 595.28, H = 841.89, M = 40, CW = W - 2 * M;
    var C = {
      brand: rgb(0x15 / 255, 0x60 / 255, 0xe7 / 255),
      ink: rgb(0.06, 0.09, 0.16),
      body: rgb(0.2, 0.25, 0.33),
      muted: rgb(0.45, 0.5, 0.58),
      line: rgb(0.8, 0.84, 0.89),
      soft: rgb(0.93, 0.96, 1),
    };
    var idx = fieldIndex(tpl);
    var val = function (id) { return fmt(idx[id], values[id]); };

    function wrap(text, font, size, maxW) {
      var out = [];
      String(text).split('\n').forEach(function (para) {
        var words = para.split(/\s+/).filter(Boolean), line = '';
        if (!words.length) { out.push(''); return; }
        words.forEach(function (w) {
          var t = line ? line + ' ' + w : w;
          if (font.widthOfTextAtSize(t, size) <= maxW || !line) line = t;
          else { out.push(line); line = w; }
        });
        out.push(line);
      });
      return out;
    }

    // Tüm yerleşim: page=null → yalnızca ölçüm. Kullanılan yüksekliği döndürür.
    function layout(page, s) {
      var y = H - M, sec = 0;
      var T = function (str, x, yy, font, size, color) { if (page && str) page.drawText(str, { x: x, y: yy, font: font, size: size, color: color }); };
      var LINE = function (x1, y1, x2, y2, th, color, dash) { if (page) page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: th, color: color, dashArray: dash }); };

      var FS = 9 * s, LS = 6.6 * s, LH = FS * 1.32;

      // Tek alan kutusu: üstte küçük etiket, altta değer + çizgi. Yüksekliği döndürür.
      function field(f, x, yy, w) {
        var v = val(f.id), lines = v ? wrap(v, R, FS, w - 4) : [];
        var minLines = f.lines || 1, n = Math.max(lines.length, minLines);
        var h = LS + 3 * s + n * LH + 3 * s;
        T(f.l, x, yy - LS, R, LS, C.muted);
        for (var i = 0; i < n; i++) {
          var by = yy - LS - 3 * s - (i + 1) * LH;
          if (lines[i]) T(lines[i], x + 1, by + 3 * s, R, FS, C.ink);
          LINE(x, by, x + w, by, 0.5, C.line, v ? undefined : [1.2, 1.6]);
        }
        return h;
      }
      // Alan ızgarası (genişlikler toplamı 1'i geçince yeni satır)
      function grid(fields, x0, yy, totalW) {
        var gap = 10 * s, row = [], acc = 0, used = 0;
        function flush() {
          if (!row.length) return;
          var free = totalW - gap * (row.length - 1), x = x0, mh = 0;
          row.forEach(function (f) {
            var w = free * ((f.w || 1) / acc);
            mh = Math.max(mh, field(f, x, yy - used, w));
            x += w + gap;
          });
          used += mh + 4 * s;
          row = []; acc = 0;
        }
        fields.forEach(function (f) {
          var w = f.w || 1;
          if (acc + w > 1.001) flush();
          row.push(f); acc += w;
        });
        flush();
        return used;
      }
      // Paragraf: {id} yer tutucuları kalın değer veya noktalı boşluk olur
      function para(text, yy) {
        var toks = [];
        String(text).split(/(\{[a-z0-9_]+\})/).forEach(function (part) {
          var m = /^\{([a-z0-9_]+)\}$/.exec(part);
          if (m) {
            var v = val(m[1]);
            toks.push({ w: v || '……………………', f: v ? B : R, c: v ? C.ink : C.muted, glue: true });
          } else part.split(/\s+/).filter(Boolean).forEach(function (w) { toks.push({ w: w, f: R, c: C.body }); });
        });
        var size = 8.6 * s, lh = size * 1.45, sp = R.widthOfTextAtSize(' ', size), lines = [[]], lw = 0;
        toks.forEach(function (t) {
          var tw = t.f.widthOfTextAtSize(t.w, size);
          if (lw && lw + sp + tw > CW) { lines.push([]); lw = 0; }
          lines[lines.length - 1].push(t);
          lw += (lw ? sp : 0) + tw;
        });
        lines.forEach(function (ln, i) {
          var x = M;
          ln.forEach(function (t) { T(t.w, x, yy - (i + 1) * lh + 2 * s, t.f, size, t.c); x += t.f.widthOfTextAtSize(t.w, size) + sp; });
        });
        return lines.length * lh + 4 * s;
      }

      tpl.doc.forEach(function (b, bi) {
        if (b.h && bi === 0) {
          // Belge başlığı + marka çizgisi
          var ts = 17 * s, tw = B.widthOfTextAtSize(b.h, ts);
          T(b.h, (W - tw) / 2, y - ts, B, ts, C.ink);
          y -= ts + 7 * s;
          if (page) page.drawRectangle({ x: W / 2 - 18, y: y - 2, width: 36, height: 2.2, color: C.brand });
          y -= 12 * s;
        } else if (b.h) {
          // Numaralı bölüm başlığı
          sec++;
          y -= 6 * s;
          var hs = 9.4 * s, r = 6.4 * s, cy = y - r;
          if (page) page.drawCircle({ x: M + r, y: cy, size: r, color: C.brand });
          var ns = String(sec), nw = B.widthOfTextAtSize(ns, 7.4 * s);
          T(ns, M + r - nw / 2, cy - 2.6 * s, B, 7.4 * s, rgb(1, 1, 1));
          T(b.h, M + 2 * r + 6 * s, cy - hs * 0.35, B, hs, C.ink);
          var hx = M + 2 * r + 12 * s + B.widthOfTextAtSize(b.h, hs);
          LINE(hx, cy, M + CW, cy, 0.6, C.line);
          y -= 2 * r + 6 * s;
        } else if (b.cols) {
          var gap = 16 * s, cw = (CW - gap) / b.cols.length, maxH = 0;
          b.cols.forEach(function (c, ci) {
            var x = M + ci * (cw + gap);
            if (page) page.drawRectangle({ x: x, y: y - 13 * s, width: cw, height: 13 * s, color: C.soft });
            T(c.h, x + 5 * s, y - 9.2 * s, B, 7.8 * s, C.brand);
            var hh = 13 * s + 5 * s + grid(c.f, x, y - 18 * s, cw);
            maxH = Math.max(maxH, hh);
          });
          y -= maxH;
        } else if (b.f) {
          y -= grid(b.f, M, y, CW);
        } else if (b.p) {
          y -= para(b.p, y);
        } else if (b.li) {
          var ls = 8 * s, llh = ls * 1.42;
          b.li.forEach(function (item, i) {
            var num = (i + 1) + '.', lines = wrap(item, R, ls, CW - 14 * s);
            T(num, M, y - llh + 2 * s, B, ls, C.brand);
            lines.forEach(function (ln, j) { T(ln, M + 14 * s, y - (j + 1) * llh + 2 * s, R, ls, C.body); });
            y -= lines.length * llh + 1.5 * s;
          });
          y -= 3 * s;
        } else if (b.sign) {
          y -= 8 * s;
          var n = b.sign.length, sw = Math.min(200, (CW - 30 * (n - 1)) / n), total = n * sw + 30 * (n - 1), sx = M + (CW - total) / 2;
          var bh = 54 * s;
          b.sign.forEach(function (sg, i) {
            var x = sx + i * (sw + 30);
            if (page) page.drawRectangle({ x: x, y: y - bh, width: sw, height: bh, borderColor: C.line, borderWidth: 0.7 });
            var lw = B.widthOfTextAtSize(sg.l, 8 * s);
            T(sg.l, x + (sw - lw) / 2, y - 11 * s, B, 8 * s, C.ink);
            var nm = val(sg.name);
            if (nm) { var nw2 = R.widthOfTextAtSize(nm, 8.4 * s); T(nm, x + (sw - nw2) / 2, y - 22 * s, R, 8.4 * s, C.body); }
            var iw = R.widthOfTextAtSize('İmza', 6.5 * s);
            T('İmza', x + (sw - iw) / 2, y - bh + 5 * s, R, 6.5 * s, C.muted);
          });
          y -= bh + 6 * s;
        }
      });
      return H - M - y;
    }

    // Kısa belgeler biraz büyük başlar (sayfayı daha iyi kullanır); sığmayınca küçülür.
    var avail = H - 2 * M - 10, s = 1.12;
    for (var k = 0; k < 18 && layout(null, s) > avail; k++) s *= 0.96;
    var page = pdf.addPage([W, H]);
    layout(page, s);

    var foot = 'Kira Asistan ile hazırlanmıştır · kiraasist.fngn.com.tr — Bilgilendirme amaçlı örnek şablondur, hukuki danışmanlık yerine geçmez.';
    var fw = R.widthOfTextAtSize(foot, 6.2);
    page.drawText(foot, { x: (W - fw) / 2, y: 22, font: R, size: 6.2, color: C.muted });
    return { bytes: await pdf.save(), scale: s };
  }

  return { render: render, fmt: fmt, yaziyla: yaziyla, fieldIndex: fieldIndex };
});
