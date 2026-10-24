// Ripe Rush v0.2 scenery: sunny fruit market. All art drawn in code.
// Static layers are cached to offscreen canvases; only small animated bits are drawn per frame.
(function (root) {
  'use strict';
  var ART = root.ART, INK = ART.INK, RR_ = ART.roundRect;
  var FONT = 'Fredoka, "Trebuchet MS", system-ui, sans-serif';
  function F(w, px) { return w + ' ' + Math.round(px) + 'px ' + FONT; }
  var DPR = 1;
  var cache = {};
  function mk(w, h, draw) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * DPR)); c.height = Math.max(1, Math.ceil(h * DPR));
    var x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); draw(x, w, h);
    c.cw = w; c.ch = h; return c;
  }
  function get(key, w, h, draw) { var k = key + '|' + Math.round(w) + 'x' + Math.round(h) + '@' + DPR; if (!cache[k]) cache[k] = mk(w, h, draw); return cache[k]; }
  function blit(ctx, c, x, y) { ctx.drawImage(c, x, y, c.cw, c.ch); }
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  // ---------- background: sky, sun, hills, town, orchard, ground ----------
  function drawTree(x, cx, cy, r, fruitCol, seed) {
    var R = rnd(seed);
    x.fillStyle = '#8A5A3B'; x.fillRect(cx - r * 0.12, cy, r * 0.24, r * 0.9);
    x.fillStyle = '#3E9E57'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.arc(cx - r * 0.6, cy + r * 0.25, r * 0.65, 0, 7); x.arc(cx + r * 0.6, cy + r * 0.25, r * 0.65, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.13)'; x.beginPath(); x.arc(cx - r * 0.3, cy - r * 0.35, r * 0.5, 0, 7); x.fill();
    for (var i = 0; i < 5; i++) { x.fillStyle = fruitCol; x.beginPath(); x.arc(cx + (R() - 0.5) * r * 1.5, cy + (R() - 0.3) * r * 0.9, r * 0.13, 0, 7); x.fill(); }
  }
  function background(W, H, horizon, kind) {
    return get('bg-' + kind + '-' + Math.round(horizon), W, H, function (x) {
      var g = x.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, '#7FCBF0'); g.addColorStop(0.65, '#BFE6F7'); g.addColorStop(1, '#FCE7D2');
      x.fillStyle = g; x.fillRect(0, 0, W, horizon + 2);
      // sun glow
      var sx = W * 0.82, sy = Math.min(horizon * 0.28, 140);
      var sg = x.createRadialGradient(sx, sy, 10, sx, sy, W * 0.5); sg.addColorStop(0, 'rgba(255,240,170,0.9)'); sg.addColorStop(0.25, 'rgba(255,230,150,0.35)'); sg.addColorStop(1, 'rgba(255,230,150,0)');
      x.fillStyle = sg; x.fillRect(0, 0, W, horizon);
      x.fillStyle = '#FFE680'; x.beginPath(); x.arc(sx, sy, 30, 0, 7); x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(255,190,60,0.6)'; x.stroke();
      // far hills
      x.fillStyle = '#A9DDB8'; x.beginPath(); x.moveTo(0, horizon - 70);
      for (var i = 0; i <= 8; i++) x.quadraticCurveTo(W * (i + 0.5) / 8, horizon - 70 - (i % 2 ? 40 : 10), W * (i + 1) / 8, horizon - 60 - (i % 3) * 10);
      x.lineTo(W, horizon); x.lineTo(0, horizon); x.fill();
      // town silhouettes: houses with roofs and a church spire
      var R = rnd(7), hx = -10;
      while (hx < W + 10) {
        var hw = 26 + R() * 30, hh = 22 + R() * 34, base = horizon - 22;
        x.fillStyle = ['#E9B7A0', '#F2D0A4', '#D9C2E0', '#F6E3C5'][Math.floor(R() * 4)];
        x.fillRect(hx, base - hh, hw, hh + 22);
        x.fillStyle = ['#C9665A', '#B8574F', '#8E6FA8', '#D07D4F'][Math.floor(R() * 4)];
        x.beginPath(); x.moveTo(hx - 4, base - hh); x.lineTo(hx + hw / 2, base - hh - 16 - R() * 10); x.lineTo(hx + hw + 4, base - hh); x.fill();
        x.fillStyle = 'rgba(255,250,220,0.85)';
        for (var wy = base - hh + 8; wy < base - 4; wy += 14) for (var wx = hx + 6; wx < hx + hw - 8; wx += 12) x.fillRect(wx, wy, 5, 7);
        if (R() < 0.12) { x.fillStyle = '#E8D7C0'; x.fillRect(hx + hw / 2 - 5, base - hh - 50, 10, 40); x.fillStyle = '#7E6AA0'; x.beginPath(); x.moveTo(hx + hw / 2 - 8, base - hh - 50); x.lineTo(hx + hw / 2, base - hh - 78); x.lineTo(hx + hw / 2 + 8, base - hh - 50); x.fill(); }
        hx += hw + 2 + R() * 10;
      }
      x.fillStyle = 'rgba(191,230,247,0.35)'; x.fillRect(0, horizon - 120, W, 120); // haze for depth
      // orchard row
      var cols = ['#E3434F', '#FB8530', '#FFE054'];
      for (var t = 0; t < 7; t++) drawTree(x, W * (t + 0.5) / 7 + (t % 2 ? 6 : -6), horizon - 28, 22 + (t % 3) * 3, cols[t % 3], t + 3);
      // ground
      var gg = x.createLinearGradient(0, horizon, 0, H);
      if (kind === 'game') { gg.addColorStop(0, '#E9C79A'); gg.addColorStop(1, '#D9A877'); }
      else { gg.addColorStop(0, '#9ED67A'); gg.addColorStop(1, '#6DBA5A'); }
      x.fillStyle = gg; x.fillRect(0, horizon, W, H - horizon);
      if (kind === 'game') { // cobbles
        var C = rnd(11);
        for (var y = horizon + 8, row = 0; y < H; y += 14 + row * 1.4, row++) {
          var sz = 12 + row * 1.6;
          for (var cx = (row % 2) * sz * 0.5 - sz; cx < W + sz; cx += sz * 1.15) {
            x.fillStyle = 'rgba(255,240,215,' + (0.25 + C() * 0.25) + ')';
            RR_(x, cx, y, sz, sz * 0.6, sz * 0.25); x.fill();
            x.fillStyle = 'rgba(150,95,55,0.18)'; RR_(x, cx, y + sz * 0.45, sz, sz * 0.15, sz * 0.07); x.fill();
          }
        }
      } else { // grass tufts and flowers
        var G = rnd(5);
        for (var k = 0; k < 70; k++) {
          var fx = G() * W, fy = horizon + 10 + G() * (H - horizon);
          x.strokeStyle = 'rgba(40,120,50,0.4)'; x.lineWidth = 2; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx - 3, fy - 7); x.moveTo(fx, fy); x.lineTo(fx + 3, fy - 8); x.stroke();
          if (k % 3 === 0) { x.fillStyle = ['#fff', '#FFE054', '#FF9BB0'][k % 9 / 3 | 0]; x.beginPath(); x.arc(fx + 5, fy - 4, 2.6, 0, 7); x.fill(); }
        }
      }
    });
  }

  // ---------- clouds ----------
  function cloudSprite(i) {
    var w = [120, 90, 150][i], h = w * 0.45;
    return get('cloud' + i, w, h, function (x) {
      x.fillStyle = 'rgba(255,255,255,0.92)';
      x.beginPath(); x.arc(w * 0.3, h * 0.62, h * 0.32, 0, 7); x.arc(w * 0.5, h * 0.45, h * 0.42, 0, 7); x.arc(w * 0.72, h * 0.6, h * 0.3, 0, 7); x.fill();
      RR_(x, w * 0.12, h * 0.55, w * 0.78, h * 0.4, h * 0.2); x.fill();
      x.fillStyle = 'rgba(190,220,240,0.45)'; RR_(x, w * 0.14, h * 0.8, w * 0.74, h * 0.14, h * 0.07); x.fill();
    });
  }
  function clouds(ctx, W, maxY, t, reduced) {
    for (var i = 0; i < 4; i++) {
      var c = cloudSprite(i % 3), sp = 6 + i * 3, span = W + c.cw + 40;
      var x = ((i * 173 + (reduced ? 0 : t * sp)) % span) - c.cw - 20, y = 18 + ((i * 61) % Math.max(30, maxY - 40));
      if (y + c.ch > maxY + 30) continue;
      blit(ctx, c, x, y);
    }
  }

  // ---------- awning with scalloped valance ----------
  var STRIPE_A = '#E8505B', STRIPE_B = '#FFF4E0';
  function awning(ctx, W, h, t) {
    var c = get('awning', W, h + 26, function (x) {
      var n = Math.max(6, Math.round(W / 46)), sw = W / n;
      for (var i = 0; i < n; i++) {
        x.fillStyle = i % 2 ? STRIPE_B : STRIPE_A; x.fillRect(i * sw, 0, sw + 1, h);
        x.beginPath(); x.arc(i * sw + sw / 2, h, sw / 2, 0, Math.PI); x.fill();
      }
      var g = x.createLinearGradient(0, 0, 0, h + 20); g.addColorStop(0, 'rgba(0,0,0,0.18)'); g.addColorStop(0.35, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = g; x.fillRect(0, 0, W, h + 26); x.globalCompositeOperation = 'source-over';
      x.strokeStyle = INK; x.lineWidth = 3; x.beginPath();
      for (i = 0; i < n; i++) x.arc(i * sw + sw / 2, h, sw / 2, Math.PI, 0, true);
      x.stroke();
      x.fillStyle = 'rgba(45,42,64,0.15)'; x.fillRect(0, 0, W, 4);
    });
    // soft shadow under the awning then the cached image
    ctx.fillStyle = 'rgba(45,42,64,0.12)'; ctx.fillRect(0, h + 8, W, 10);
    blit(ctx, c, 0, 0);
  }
  // bunting string that flaps gently
  var FLAG = ['#FFC83D', '#1FA37A', '#7B6CF6', '#FB8530', '#4FB3E8', '#E3434F'];
  function bunting(ctx, x0, x1, y, sag, t, reduced, size) {
    size = size || 14;
    var n = Math.max(4, Math.floor((x1 - x0) / (size * 1.6)));
    ctx.strokeStyle = 'rgba(45,42,64,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y); ctx.stroke();
    for (var i = 0; i < n; i++) {
      var k = (i + 0.5) / n, px = x0 + (x1 - x0) * k, py = y + sag * 4 * k * (1 - k);
      var flap = reduced ? 0 : Math.sin(t * 2.4 + i * 0.9) * 0.18;
      ctx.save(); ctx.translate(px, py); ctx.rotate(flap);
      ctx.fillStyle = FLAG[i % FLAG.length]; ctx.beginPath(); ctx.moveTo(-size * 0.55, 0); ctx.lineTo(size * 0.55, 0); ctx.lineTo(0, size * 1.1); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
    }
  }
  // stall posts
  function post(ctx, x, y0, y1) {
    var g = ctx.createLinearGradient(x - 6, 0, x + 6, 0); g.addColorStop(0, '#C98B5A'); g.addColorStop(1, '#8E5A36');
    ctx.fillStyle = g; ctx.fillRect(x - 6, y0, 12, y1 - y0); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(x - 6, y0, 12, y1 - y0);
  }

  // ---------- wooden table with planks and grain ----------
  function woodGrain(x, w, h, seed, base, dark) {
    var R = rnd(seed);
    x.strokeStyle = dark; x.lineWidth = 1.2;
    for (var i = 0; i < Math.max(3, w / 30); i++) {
      var yy = R() * h; x.globalAlpha = 0.25 + R() * 0.25; x.beginPath(); x.moveTo(0, yy);
      for (var xx = 0; xx <= w; xx += 20) x.lineTo(xx, yy + Math.sin(xx * 0.05 + i) * 2);
      x.stroke();
    }
    x.globalAlpha = 1;
    for (i = 0; i < Math.max(1, w / 120); i++) { var kx = R() * w, ky = R() * h; x.fillStyle = dark; x.globalAlpha = 0.35; x.beginPath(); x.ellipse(kx, ky, 5, 2.5, 0, 0, 7); x.fill(); x.globalAlpha = 1; }
  }
  function table(ctx, x0, y0, w, h) {
    var c = get('table', w, h + 18, function (x) {
      var plank = Math.max(26, h / Math.max(2, Math.round(h / 44)));
      RR_(x, 0, 0, w, h, 20); x.save(); x.clip();
      for (var y = 0, i = 0; y < h; y += plank, i++) {
        x.fillStyle = ['#E7B47E', '#DDA770', '#E9BA86'][i % 3]; x.fillRect(0, y, w, plank);
        x.save(); x.translate(0, y); woodGrain(x, w, plank, 13 + i, '', 'rgba(140,85,45,0.9)'); x.restore();
        x.fillStyle = 'rgba(120,70,35,0.35)'; x.fillRect(0, y + plank - 2, w, 2);
        x.fillStyle = 'rgba(255,240,210,0.35)'; x.fillRect(0, y, w, 1.5);
      }
      x.restore();
      // front lip
      x.fillStyle = '#B97B4A'; RR_(x, -2, h - 10, w + 4, 26, 10); x.fill(); x.strokeStyle = INK; x.lineWidth = 3; x.stroke();
      x.fillStyle = 'rgba(255,230,190,0.35)'; x.fillRect(6, h - 7, w - 12, 3);
      RR_(x, 0, 0, w, h, 20); x.lineWidth = 3; x.strokeStyle = INK; x.stroke();
      // nail heads on lip
      x.fillStyle = '#6E4A30'; for (var nx = 18; nx < w; nx += Math.max(40, w / 6)) { x.beginPath(); x.arc(nx, h + 4, 2.5, 0, 7); x.fill(); }
    });
    ctx.fillStyle = 'rgba(45,42,64,0.2)'; RR_(ctx, x0 + 4, y0 + 10, w, h + 14, 20); ctx.fill();
    blit(ctx, c, x0, y0);
  }
  // little straw nest under each fruit slot
  function nest(ctx, x, y, R) {
    var c = get('nest', R * 2.2, R * 0.8, function (q, w, h) {
      q.fillStyle = 'rgba(120,70,35,0.25)'; q.beginPath(); q.ellipse(w / 2, h / 2 + 2, w / 2 - 1, h / 2 - 2, 0, 0, 7); q.fill();
      q.fillStyle = '#F2D48A'; q.beginPath(); q.ellipse(w / 2, h / 2, w / 2 - 3, h / 2 - 4, 0, 0, 7); q.fill();
      q.strokeStyle = 'rgba(176,128,52,0.8)'; q.lineWidth = 1.3;
      var Rn = rnd(3); for (var i = 0; i < 18; i++) { var a = Rn() * 6.28, rr = 0.55 + Rn() * 0.4; q.beginPath(); q.moveTo(w / 2 + Math.cos(a) * (w / 2 - 4) * rr, h / 2 + Math.sin(a) * (h / 2 - 4) * rr); q.lineTo(w / 2 + Math.cos(a + 0.5) * (w / 2 - 4) * rr, h / 2 + Math.sin(a + 0.5) * (h / 2 - 4) * rr); q.stroke(); }
    });
    blit(ctx, c, x - c.cw / 2, y - c.ch / 2);
  }

  // ---------- crate ----------
  function crateBody(w, h) {
    return get('crate', w, h, function (x) {
      RR_(x, 0, 0, w, h, 12); x.save(); x.clip();
      var n = 3, ph = h / n;
      for (var i = 0; i < n; i++) {
        var g = x.createLinearGradient(0, i * ph, 0, (i + 1) * ph); g.addColorStop(0, '#D99A62'); g.addColorStop(1, '#B9784A');
        x.fillStyle = g; x.fillRect(0, i * ph, w, ph);
        x.save(); x.translate(0, i * ph); woodGrain(x, w, ph, 31 + i, '', 'rgba(110,62,30,0.9)'); x.restore();
        x.fillStyle = 'rgba(80,45,20,0.45)'; x.fillRect(0, (i + 1) * ph - 2.5, w, 2.5);
        x.fillStyle = 'rgba(255,230,190,0.35)'; x.fillRect(0, i * ph + 1, w, 1.5);
      }
      // side battens
      x.fillStyle = 'rgba(120,70,35,0.55)'; x.fillRect(0, 0, 9, h); x.fillRect(w - 9, 0, 9, h);
      x.restore();
      x.fillStyle = '#5A3B26';
      for (i = 0; i < n; i++) { x.beginPath(); x.arc(4.5, i * ph + ph / 2, 2.2, 0, 7); x.arc(w - 4.5, i * ph + ph / 2, 2.2, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,0.5)';
      for (i = 0; i < n; i++) { x.beginPath(); x.arc(4, i * ph + ph / 2 - 0.8, 0.8, 0, 7); x.arc(w - 5, i * ph + ph / 2 - 0.8, 0.8, 0, 7); x.fill(); }
      // stencilled farm name
      x.fillStyle = 'rgba(70,38,18,0.35)'; x.font = F(700, Math.max(8, h * 0.085)); x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      x.fillText('RIPE RUSH FARM', w / 2, h - 6);
      RR_(x, 0, 0, w, h, 12); x.lineWidth = 3; x.strokeStyle = INK; x.stroke();
    });
  }
  function cart(ctx, w, h, spin) { // drawn in crate-local coords; crate bottom at y=h*0.5
    var y = h * 0.5 + 2;
    ctx.fillStyle = '#6E4A30'; RR_(ctx, -w * 0.5 - 4, y - 2, w + 8, 8, 4); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
    [-w * 0.32, w * 0.32].forEach(function (wx) {
      var r = Math.max(7, h * 0.09);
      ctx.save(); ctx.translate(wx, y + 8); ctx.rotate(spin);
      ctx.fillStyle = '#3D3550'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, 7); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.55, 0); ctx.lineTo(r * 0.55, 0); ctx.moveTo(0, -r * 0.55); ctx.lineTo(0, r * 0.55); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    });
  }
  function stamp(ctx, x, y, s, text, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.22); ctx.scale(s, s); ctx.globalAlpha *= alpha;
    ctx.font = F(700, 20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tw = ctx.measureText(text).width + 18;
    ctx.strokeStyle = '#D6303F'; ctx.lineWidth = 3.5; RR_(ctx, -tw / 2, -16, tw, 32, 8); ctx.stroke();
    ctx.lineWidth = 1.5; RR_(ctx, -tw / 2 + 4, -12, tw - 8, 24, 5); ctx.stroke();
    ctx.fillStyle = '#D6303F'; ctx.fillText(text, 0, 1.5);
    ctx.restore();
  }

  // ---------- cool box ----------
  function coolBox(ctx, cx, cy, w, h) {
    var c = get('cool', w, h + 30, function (x) {
      var top = 16;
      x.fillStyle = 'rgba(45,42,64,0.2)'; RR_(x, 4, top + 6, w - 4, h - 4, 18); x.fill();
      var g = x.createLinearGradient(0, top, 0, top + h); g.addColorStop(0, '#6EC6F2'); g.addColorStop(1, '#3E95D1');
      x.fillStyle = g; RR_(x, 0, top, w, h - 6, 18); x.fill(); x.strokeStyle = INK; x.lineWidth = 3; x.stroke();
      x.fillStyle = '#F4FBFF'; RR_(x, 0, top, w, 18, 9); x.fill(); x.stroke(); // lid
      x.fillStyle = '#E8F6FF'; RR_(x, 10, top + 26, w - 20, h - 42, 12); x.fill(); x.lineWidth = 2.5; x.stroke();
      x.strokeStyle = INK; x.lineWidth = 4; x.beginPath(); x.moveTo(w * 0.35, top + 2); x.quadraticCurveTo(w * 0.5, 0, w * 0.65, top + 2); x.stroke(); // handle
      x.fillStyle = 'rgba(255,255,255,0.35)'; RR_(x, 6, top + 20, 6, h - 34, 3); x.fill();
      x.fillStyle = '#fff'; x.font = F(700, 12); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('COOL BOX', w / 2, top + 9.5);
      x.fillStyle = INK; x.fillText('COOL BOX', w / 2, top + 9.5);
    });
    blit(ctx, c, cx - w / 2, cy - h / 2 - 22);
  }

  // ---------- wooden hanging sign ----------
  function sign(ctx, cx, y, w, h, l1, l2, ropeTop) {
    var c = get('sign-' + l1 + '-' + l2, w, h, function (x) {
      var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#D9A26C'); g.addColorStop(1, '#B4794A');
      x.fillStyle = g; RR_(x, 0, 0, w, h, 12); x.fill();
      x.save(); RR_(x, 0, 0, w, h, 12); x.clip(); woodGrain(x, w, h, 77, '', 'rgba(110,62,30,0.9)'); x.restore();
      x.strokeStyle = INK; x.lineWidth = 3; RR_(x, 1.5, 1.5, w - 3, h - 3, 11); x.stroke();
      x.strokeStyle = 'rgba(255,230,190,0.5)'; x.lineWidth = 1.5; RR_(x, 5, 5, w - 10, h - 10, 8); x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = F(700, h * 0.36); x.lineJoin = 'round'; x.lineWidth = 4; x.strokeStyle = '#5A3420'; x.strokeText(l1, w / 2, h * 0.36); x.fillStyle = '#FFF6E5'; x.fillText(l1, w / 2, h * 0.36);
      x.font = F(600, h * 0.22); x.fillStyle = '#FFE7B8'; x.fillText(l2, w / 2, h * 0.73);
      x.fillStyle = '#5A3B26'; [[10, 10], [w - 10, 10]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 2.5, 0, 7); x.fill(); });
    });
    if (ropeTop != null) { ctx.strokeStyle = '#7A5A3A'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - w * 0.36, ropeTop); ctx.lineTo(cx - w / 2 + 10, y + 10); ctx.moveTo(cx + w * 0.36, ropeTop); ctx.lineTo(cx + w / 2 - 10, y + 10); ctx.stroke(); }
    ctx.fillStyle = 'rgba(45,42,64,0.22)'; RR_(ctx, cx - w / 2 + 3, y + 5, w, h, 12); ctx.fill();
    blit(ctx, c, cx - w / 2, y);
  }
  // rounded "pill" plaque (for star bar and coin counter)
  function plaque(ctx, x, y, w, h, fill) {
    ctx.fillStyle = 'rgba(45,42,64,0.25)'; RR_(ctx, x, y + 4, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fill || '#FFF6E5'; RR_(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; RR_(ctx, x + h * 0.3, y + 3, w - h * 0.6, h * 0.28, h * 0.14); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; RR_(ctx, x, y, w, h, h / 2); ctx.stroke();
  }
  function shinyStar(ctx, x, y, r, on, t) {
    ART.star(ctx, x, y + 2, r); ctx.fillStyle = 'rgba(45,42,64,0.3)'; ctx.fill();
    ART.star(ctx, x, y, r);
    if (on) { var g = ctx.createLinearGradient(x, y - r, x, y + r); g.addColorStop(0, '#FFE680'); g.addColorStop(1, '#F5A400'); ctx.fillStyle = g; }
    else ctx.fillStyle = '#D9D3DF';
    ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
    if (on) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.14, r * 0.26, 0.6, 0, 7); ctx.fill(); }
  }
  function coin(ctx, x, y, r) {
    ctx.fillStyle = '#C98A00'; ctx.beginPath(); ctx.arc(x, y + 1.5, r, 0, 7); ctx.fill();
    var g = ctx.createLinearGradient(x, y - r, x, y + r); g.addColorStop(0, '#FFE680'); g.addColorStop(1, '#F5B400');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.strokeStyle = 'rgba(201,138,0,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * 0.65, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.15, r * 0.25, 0.7, 0, 7); ctx.fill();
  }

  // ---------- critters: butterflies, bees, drifting leaves ----------
  var critters = [];
  function initCritters(W, H) {
    critters = [];
    for (var i = 0; i < 2; i++) critters.push({ k: 'fly', x: Math.random() * W, y: H * (0.15 + Math.random() * 0.4), ph: Math.random() * 6, sp: 18 + Math.random() * 12, dir: i ? -1 : 1, col: ['#FF9BB0', '#7B6CF6'][i] });
    critters.push({ k: 'bee', x: Math.random() * W, y: H * 0.5, ph: 0, sp: 34, dir: 1 });
    for (i = 0; i < 3; i++) critters.push({ k: 'leaf', x: Math.random() * W, y: Math.random() * H, ph: Math.random() * 6, sp: 22 + Math.random() * 14 });
  }
  function updateCritters(dt, W, H, t) {
    critters.forEach(function (c) {
      if (c.k === 'leaf') { c.y += c.sp * dt; c.x += Math.sin(t * 1.3 + c.ph) * 18 * dt + 6 * dt; if (c.y > H + 20) { c.y = -20; c.x = Math.random() * W; } return; }
      c.x += c.dir * c.sp * dt; c.y += Math.sin(t * (c.k === 'bee' ? 5 : 2) + c.ph) * (c.k === 'bee' ? 30 : 22) * dt;
      if (c.x > W + 30) { c.dir = -1; c.y = H * (0.1 + Math.random() * 0.5); } if (c.x < -30) { c.dir = 1; c.y = H * (0.1 + Math.random() * 0.5); }
    });
  }
  function drawCritters(ctx, t) {
    critters.forEach(function (c) {
      ctx.save(); ctx.translate(c.x, c.y);
      if (c.k === 'leaf') {
        ctx.rotate(Math.sin(t * 2 + c.ph) * 0.8); ctx.fillStyle = 'rgba(70,170,90,0.8)';
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(5, 0, 0, 6); ctx.quadraticCurveTo(-5, 0, 0, -6); ctx.fill();
      } else if (c.k === 'fly') {
        var f = Math.abs(Math.sin(t * 12 + c.ph)); ctx.scale(c.dir, 1);
        ctx.fillStyle = c.col; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(s * 5 * (0.3 + f * 0.7), -2, 5 * (0.3 + f * 0.7), 6, s * 0.4, 0, 7); ctx.fill(); ctx.stroke(); });
        ctx.fillStyle = INK; ctx.fillRect(-1, -6, 2, 10);
      } else {
        ctx.scale(c.dir, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; var wf = Math.sin(t * 40) * 2;
        ctx.beginPath(); ctx.ellipse(-1, -6 - wf, 3, 5, -0.4, 0, 7); ctx.ellipse(3, -6 + wf, 3, 5, 0.4, 0, 7); ctx.fill();
        ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.5, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(-1, 4); ctx.moveTo(2, -4); ctx.lineTo(2, 4); ctx.stroke();
      }
      ctx.restore();
    });
  }

  // ---------- title-screen market stall ----------
  function titleStall(ctx, W, H, horizon, t, reduced) {
    var w = Math.min(W * 0.86, 380), x0 = W / 2 - w / 2, top = horizon - 30, ah = 34;
    post(ctx, x0 + 10, top, horizon + 120); post(ctx, x0 + w - 10, top, horizon + 120);
    var c = get('tstall', w, ah + 20, function (x) {
      var n = 8, sw = w / n;
      for (var i = 0; i < n; i++) { x.fillStyle = i % 2 ? STRIPE_B : STRIPE_A; x.beginPath(); x.moveTo(i * sw + sw * 0.15, 0); x.lineTo((i + 1) * sw - sw * 0.15 + 0.5, 0); x.lineTo((i + 1) * sw, ah); x.lineTo(i * sw, ah); x.fill(); x.beginPath(); x.arc(i * sw + sw / 2, ah, sw / 2, 0, Math.PI); x.fill(); }
      x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(sw * 0.15, 0); x.lineTo(w - sw * 0.15, 0); x.lineTo(w, ah); for (i = n - 1; i >= 0; i--) x.arc(i * sw + sw / 2, ah, sw / 2, 0, Math.PI); x.lineTo(sw * 0.15, 0); x.stroke();
    });
    blit(ctx, c, x0, top - ah);
    bunting(ctx, x0 + 10, x0 + w - 10, top + 14, 10, t, reduced, 11);
    table(ctx, x0 + 18, horizon + 40, w - 36, 60);
    var sw2 = Math.sin(reduced ? 0 : t * 1.5) * 0.06;
    ctx.save(); ctx.translate(W / 2, horizon + 92); ctx.rotate(-0.04 + sw2 * 0.3); sign(ctx, 0, 0, 132, 44, 'OPEN', 'fresh today', null); ctx.restore();
    // fruit on display
    var types = ['apple', 'banana', 'berry', 'pear', 'plum', 'apple', 'berry'];
    for (var i = 0; i < 7; i++) {
      var fx = x0 + 44 + i * (w - 88) / 6, fy = horizon + 44 + (i % 2) * 6;
      ART.drawFruit(ctx, fx, fy, 22, types[i], [1.4, 1.5, 3.3, 2.4, 3.1, 0.3, 2.2][i] + (reduced ? 0 : Math.sin(t * 0.5 + i) * 0.04), { t: t + i, sy: 1 + (reduced ? 0 : Math.sin(t * 3 + i) * 0.03) });
    }
  }

  function setDPR(d) { if (d !== DPR) { DPR = d; cache = {}; } }
  function clear() { cache = {}; }
  root.SCENE = { F: F, FONT: FONT, setDPR: setDPR, clear: clear, background: background, clouds: clouds, awning: awning, bunting: bunting, post: post,
    table: table, nest: nest, crateBody: crateBody, cart: cart, stamp: stamp, coolBox: coolBox, sign: sign, plaque: plaque, shinyStar: shinyStar, coin: coin,
    initCritters: initCritters, updateCritters: updateCritters, drawCritters: drawCritters, titleStall: titleStall, blit: blit };
})(this);
