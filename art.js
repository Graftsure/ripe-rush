// Ripe Rush original art: fruit with faces, crates, cool box. Canvas 2D only.
(function (root) {
  'use strict';
  var INK = '#2D2A40';
  var STAGE = ['#1FA37A', '#FFE054', '#FB8530', '#E3434F'];
  var ROTTEN = '#6E4B52';
  var LEAF = '#2F8F4E';
  var PLUMP = [0.92, 0.97, 1.0, 1.04];
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(A[i] + (B[i] - A[i]) * t); }).join(',') + ')'; }
  function fruitColour(r) {
    if (r >= 4) return ROTTEN;
    var s = Math.floor(r), f = r - s;
    var next = s < 3 ? STAGE[s + 1] : ROTTEN;
    var k = f > 0.72 ? (f - 0.72) / 0.28 * (s < 3 ? 0.45 : 0.35) : 0;
    return mix(STAGE[s], next, k);
  }

  function bodyPath(ctx, type, R) {
    ctx.beginPath();
    if (type === 'pear') {
      ctx.moveTo(0, -R * 0.98);
      ctx.bezierCurveTo(R * 0.42, -R * 0.98, R * 0.42, -R * 0.4, R * 0.62, -R * 0.12);
      ctx.bezierCurveTo(R * 1.08, R * 0.28, R * 0.92, R * 0.98, 0, R * 0.98);
      ctx.bezierCurveTo(-R * 0.92, R * 0.98, -R * 1.08, R * 0.28, -R * 0.62, -R * 0.12);
      ctx.bezierCurveTo(-R * 0.42, -R * 0.4, -R * 0.42, -R * 0.98, 0, -R * 0.98);
    } else if (type === 'berry') {
      ctx.moveTo(0, -R * 0.7);
      ctx.bezierCurveTo(R * 0.75, -R * 0.95, R * 1.08, -R * 0.5, R * 0.95, -R * 0.05);
      ctx.bezierCurveTo(R * 0.85, R * 0.5, R * 0.35, R * 0.98, 0, R * 1.0);
      ctx.bezierCurveTo(-R * 0.35, R * 0.98, -R * 0.85, R * 0.5, -R * 0.95, -R * 0.05);
      ctx.bezierCurveTo(-R * 1.08, -R * 0.5, -R * 0.75, -R * 0.95, 0, -R * 0.7);
    } else if (type === 'plum') {
      ctx.ellipse(0, R * 0.04, R * 0.9, R * 0.95, 0, 0, Math.PI * 2);
    } else if (type === 'banana') {
      ctx.moveTo(-R * 0.98, -R * 0.62);
      ctx.bezierCurveTo(-R * 1.0, R * 0.55, R * 0.55, R * 1.0, R * 1.02, -R * 0.62);
      ctx.bezierCurveTo(R * 0.8, -R * 0.66, R * 0.86, -R * 0.52, R * 0.72, -R * 0.4);
      ctx.bezierCurveTo(R * 0.4, R * 0.25, -R * 0.45, R * 0.25, -R * 0.75, -R * 0.5);
      ctx.bezierCurveTo(-R * 0.82, -R * 0.62, -R * 0.9, -R * 0.66, -R * 0.98, -R * 0.62);
    } else if (type === 'blob') {
      ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2);
    } else { // apple
      ctx.moveTo(0, -R * 0.68);
      ctx.bezierCurveTo(R * 0.45, -R * 1.02, R * 1.08, -R * 0.75, R * 1.0, -R * 0.05);
      ctx.bezierCurveTo(R * 0.95, R * 0.62, R * 0.52, R * 0.98, 0, R * 0.88);
      ctx.bezierCurveTo(-R * 0.52, R * 0.98, -R * 0.95, R * 0.62, -R * 1.0, -R * 0.05);
      ctx.bezierCurveTo(-R * 1.08, -R * 0.75, -R * 0.45, -R * 1.02, 0, -R * 0.68);
    }
    ctx.closePath();
  }

  function leaf(ctx, x, y, R, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(R * 0.25, -R * 0.22, R * 0.55, 0);
    ctx.quadraticCurveTo(R * 0.25, R * 0.2, 0, 0);
    var lg = ctx.createLinearGradient(0, -R * 0.2, 0, R * 0.2); lg.addColorStop(0, '#5CC46E'); lg.addColorStop(1, '#23784A');
    ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = R * 0.06; ctx.strokeStyle = INK; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = R * 0.03;
    ctx.beginPath(); ctx.moveTo(R * 0.06, 0); ctx.quadraticCurveTo(R * 0.25, -R * 0.04, R * 0.46, 0); ctx.stroke();
    ctx.restore();
  }

  function topper(ctx, type, R) {
    ctx.lineCap = 'round';
    if (type === 'berry') {
      ctx.fillStyle = LEAF; ctx.strokeStyle = INK; ctx.lineWidth = R * 0.06;
      for (var i = -2; i <= 2; i++) {
        ctx.save(); ctx.translate(0, -R * 0.72); ctx.rotate(i * 0.55);
        ctx.beginPath(); ctx.ellipse(0, -R * 0.12, R * 0.12, R * 0.26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      return;
    }
    if (type === 'blob') return;
    if (type === 'banana') {
      ctx.fillStyle = '#7A5A2E'; ctx.strokeStyle = INK; ctx.lineWidth = R * 0.06;
      ctx.beginPath(); ctx.moveTo(R * 0.78, -R * 0.52); ctx.lineTo(R * 0.86, -R * 0.82); ctx.lineTo(R * 1.02, -R * 0.78); ctx.lineTo(R * 0.98, -R * 0.56); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4A3424'; ctx.beginPath(); ctx.arc(-R * 0.94, -R * 0.6, R * 0.07, 0, 7); ctx.fill();
      return;
    }
    var top = type === 'pear' ? -R * 0.98 : type === 'plum' ? -R * 0.9 : -R * 0.68;
    ctx.strokeStyle = '#6B4A2E'; ctx.lineWidth = R * 0.11;
    ctx.beginPath(); ctx.moveTo(0, top + R * 0.05); ctx.quadraticCurveTo(R * 0.04, top - R * 0.2, R * 0.12, top - R * 0.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,190,0.55)'; ctx.lineWidth = R * 0.035;
    ctx.beginPath(); ctx.moveTo(-R * 0.015, top); ctx.quadraticCurveTo(R * 0.01, top - R * 0.16, R * 0.07, top - R * 0.24); ctx.stroke();
    if (type !== 'plum') leaf(ctx, R * 0.08, top - R * 0.15, R, -0.5);
  }

  // Dots (stage number) on the forehead.
  function pips(ctx, n, R, y) {
    var gap = R * 0.2;
    for (var i = 0; i < n; i++) {
      var x = (i - (n - 1) / 2) * gap;
      ctx.beginPath(); ctx.arc(x, y, R * 0.065, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = R * 0.035; ctx.strokeStyle = INK; ctx.stroke();
    }
  }

  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath();
  }

  // mood: 'sleepy' | 'smile' | 'grin' | 'stars' | 'worried' | 'dizzy'
  function face(ctx, mood, R, t) {
    var ex = R * 0.3, ey = R * 0.08, my = R * 0.38;
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = R * 0.08;
    // blush
    if (mood !== 'dizzy' && mood !== 'sleepy') {
      ctx.fillStyle = 'rgba(255,120,140,0.45)';
      ctx.beginPath(); ctx.ellipse(-R * 0.52, R * 0.3, R * 0.13, R * 0.08, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(R * 0.52, R * 0.3, R * 0.13, R * 0.08, 0, 0, 7); ctx.fill();
      ctx.fillStyle = INK;
    }
    if (mood === 'sleepy') {
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s * ex - R * 0.12, ey); ctx.lineTo(s * ex + R * 0.12, ey); ctx.stroke(); });
      ctx.beginPath(); ctx.ellipse(0, my, R * 0.07, R * 0.06 + Math.sin(t * 2) * R * 0.02, 0, 0, 7); ctx.fill();
      // little z
      var zy = -R * 0.55 - ((t * 0.4) % 1) * R * 0.4, za = 1 - ((t * 0.4) % 1);
      ctx.save(); ctx.globalAlpha *= za; ctx.lineWidth = R * 0.05;
      ctx.beginPath(); ctx.moveTo(R * 0.6, zy); ctx.lineTo(R * 0.78, zy); ctx.lineTo(R * 0.6, zy + R * 0.16); ctx.lineTo(R * 0.78, zy + R * 0.16); ctx.stroke();
      ctx.restore();
    } else if (mood === 'smile' || mood === 'grin') {
      [-1, 1].forEach(function (s) {
        ctx.beginPath(); ctx.ellipse(s * ex, ey, R * 0.085, R * 0.12, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * ex + R * 0.03, ey - R * 0.05, R * 0.035, 0, 7); ctx.fill(); ctx.fillStyle = INK;
      });
      if (mood === 'smile') { ctx.beginPath(); ctx.arc(0, my - R * 0.12, R * 0.16, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
      else {
        ctx.beginPath(); ctx.moveTo(-R * 0.22, my - R * 0.08); ctx.quadraticCurveTo(0, my + R * 0.38, R * 0.22, my - R * 0.08); ctx.closePath();
        ctx.fill(); ctx.fillStyle = '#FF7A8A'; ctx.beginPath(); ctx.ellipse(0, my + R * 0.1, R * 0.09, R * 0.05, 0, 0, 7); ctx.fill(); ctx.fillStyle = INK;
      }
    } else if (mood === 'stars') {
      [-1, 1].forEach(function (s) {
        star(ctx, s * ex, ey, R * 0.16); ctx.fillStyle = '#FFF6E5'; ctx.fill(); ctx.lineWidth = R * 0.05; ctx.stroke();
      });
      ctx.lineWidth = R * 0.08; ctx.fillStyle = INK;
      ctx.beginPath(); ctx.moveTo(-R * 0.26, my - R * 0.1); ctx.quadraticCurveTo(0, my + R * 0.3, R * 0.26, my - R * 0.1); ctx.closePath(); ctx.fill();
    } else if (mood === 'worried') {
      [-1, 1].forEach(function (s) {
        ctx.beginPath(); ctx.arc(s * ex, ey + R * 0.02, R * 0.09, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(s * ex - s * R * 0.14, ey - R * 0.12); ctx.lineTo(s * ex + s * R * 0.1, ey - R * 0.22); ctx.lineWidth = R * 0.06; ctx.stroke();
      });
      ctx.lineWidth = R * 0.07; ctx.beginPath();
      for (var i = 0; i <= 6; i++) { var x = -R * 0.2 + i * R * 0.0667, y = my + (i % 2 ? -1 : 1) * R * 0.04; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // sweat drop
      var sy = -R * 0.2 + ((t * 1.3) % 1) * R * 0.3;
      ctx.fillStyle = '#9FD8FF'; ctx.beginPath(); ctx.moveTo(R * 0.72, sy - R * 0.16);
      ctx.quadraticCurveTo(R * 0.86, sy + R * 0.02, R * 0.72, sy + R * 0.04); ctx.quadraticCurveTo(R * 0.58, sy + R * 0.02, R * 0.72, sy - R * 0.16);
      ctx.fill(); ctx.lineWidth = R * 0.04; ctx.stroke();
    } else if (mood === 'dizzy') {
      ctx.lineWidth = R * 0.07;
      [-1, 1].forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(s * ex - R * 0.1, ey - R * 0.1); ctx.lineTo(s * ex + R * 0.1, ey + R * 0.1);
        ctx.moveTo(s * ex + R * 0.1, ey - R * 0.1); ctx.lineTo(s * ex - R * 0.1, ey + R * 0.1); ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(0, my + R * 0.12, R * 0.15, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
    }
  }

  function moodFor(r, danger) {
    if (r >= 4) return 'dizzy';
    if (danger) return 'worried';
    return ['sleepy', 'smile', 'grin', 'stars'][Math.floor(r)];
  }

  // Draw a fruit centered at x,y. opts: {t, sx, sy, rot, danger, assist, cooled, alpha}
  function drawFruit(ctx, x, y, R, type, r, o) {
    o = o || {};
    var t = o.t || 0, s = Math.min(3, Math.floor(r));
    var plump = r >= 4 ? 0.9 : PLUMP[s];
    ctx.save();
    ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    // shadow
    if (!o.noShadow) {
      ctx.fillStyle = 'rgba(45,42,64,0.18)';
      ctx.beginPath(); ctx.ellipse(0, R * 0.95, R * 0.75 * plump * (o.sx || 1), R * 0.18, 0, 0, 7); ctx.fill();
    }
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale((o.sx || 1) * plump, (o.sy || 1) * plump);
    var col = o.colour || fruitColour(r);
    bodyPath(ctx, type, R);
    ctx.fillStyle = col; ctx.fill();
    ctx.save(); ctx.clip();
    // soft 3D shading: light from upper-left, darker rim lower-right
    var rg = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.08, R * 0.05, R * 0.05, R * 1.2);
    rg.addColorStop(0, 'rgba(255,255,255,' + (r >= 4 ? 0.12 : 0.42) + ')'); rg.addColorStop(0.42, 'rgba(255,255,255,0)');
    rg.addColorStop(0.78, 'rgba(45,42,64,0.04)'); rg.addColorStop(1, 'rgba(45,42,64,0.34)');
    ctx.fillStyle = rg; ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
    // warm bounce light at the bottom edge
    ctx.fillStyle = 'rgba(255,214,150,0.18)'; ctx.beginPath(); ctx.ellipse(R * 0.1, R * 0.98, R * 0.7, R * 0.22, 0, 0, 7); ctx.fill();
    if (type === 'apple' && r < 4) {
      ctx.fillStyle = 'rgba(255,250,220,0.45)';
      [[0.45, -0.1], [0.6, 0.25], [0.3, 0.5], [-0.2, 0.62], [0.68, -0.38], [-0.6, 0.35]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * R, p[1] * R, R * 0.028, 0, 7); ctx.fill(); });
      ctx.fillStyle = 'rgba(45,42,64,0.18)'; ctx.beginPath(); ctx.ellipse(0, -R * 0.6, R * 0.18, R * 0.07, 0, 0, 7); ctx.fill();
    }
    if (type === 'pear' && r < 4) {
      ctx.fillStyle = 'rgba(140,90,40,0.28)';
      [[0.5, 0.3], [0.35, 0.62], [-0.4, 0.6], [0.62, 0.05], [-0.55, 0.25], [0.15, 0.78], [0.25, -0.35]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * R, p[1] * R, R * 0.032, 0, 7); ctx.fill(); });
    }
    if (type === 'banana' && r < 4) {
      ctx.strokeStyle = 'rgba(45,42,64,0.22)'; ctx.lineWidth = R * 0.05;
      ctx.beginPath(); ctx.moveTo(-R * 0.85, -R * 0.3); ctx.bezierCurveTo(-R * 0.6, R * 0.6, R * 0.5, R * 0.6, R * 0.9, -R * 0.35); ctx.stroke();
      if (s >= 2) { ctx.fillStyle = 'rgba(110,70,30,0.45)'; [[-0.5, 0.3], [0.1, 0.55], [0.55, 0.2], [-0.2, 0.5]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * R, p[1] * R, R * 0.04, 0, 7); ctx.fill(); }); }
    }
    if (type === 'berry') {
      [[-0.5, 0.1], [0.5, 0.1], [-0.3, 0.6], [0.3, 0.6], [0, 0.8], [-0.7, -0.25], [0.7, -0.25], [0, 0.32], [-0.62, 0.38], [0.62, 0.38]].forEach(function (p) {
        ctx.fillStyle = 'rgba(45,42,64,0.25)'; ctx.beginPath(); ctx.ellipse(p[0] * R, p[1] * R + R * 0.02, R * 0.045, R * 0.065, 0, 0, 7); ctx.fill();
        ctx.fillStyle = r >= 4 ? 'rgba(200,190,140,0.6)' : '#FFF1A8'; ctx.beginPath(); ctx.ellipse(p[0] * R, p[1] * R, R * 0.032, R * 0.05, 0, 0, 7); ctx.fill();
      });
    }
    if (type === 'plum') {
      ctx.fillStyle = 'rgba(235,235,255,0.16)'; ctx.beginPath(); ctx.ellipse(R * 0.2, R * 0.1, R * 0.7, R * 0.8, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(45,42,64,0.35)'; ctx.lineWidth = R * 0.05;
      ctx.beginPath(); ctx.moveTo(0, -R * 0.85); ctx.quadraticCurveTo(-R * 0.25, -R * 0.2, -R * 0.12, R * 0.55); ctx.stroke();
    }
    // glossy highlight
    if (r < 4) {
      var gl = 0.55 + s * 0.1;
      ctx.fillStyle = 'rgba(255,255,255,' + gl + ')';
      ctx.beginPath(); ctx.ellipse(-R * 0.48, -R * 0.32, R * (0.1 + s * 0.015), R * (0.2 + s * 0.02), 0.55, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-R * 0.3, -R * 0.58, R * 0.05, 0, 7); ctx.fill();
    }
    if (r >= 4) { // mottled bruises + fuzzy mould
      ctx.fillStyle = 'rgba(60,36,40,0.55)';
      [[-0.45, -0.1, 0.32], [0.4, 0.35, 0.36], [0.1, -0.5, 0.22]].forEach(function (p) { ctx.beginPath(); ctx.ellipse(p[0] * R, p[1] * R, p[2] * R, p[2] * R * 0.75, p[0], 0, 7); ctx.fill(); });
      ctx.fillStyle = 'rgba(130,120,60,0.55)';
      [[0.3, -0.25, 0.2], [-0.35, 0.5, 0.22]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * R, p[1] * R, p[2] * R, 0, 7); ctx.fill(); });
      [[-0.55, -0.42, 0.15], [0.55, 0.05, 0.18], [-0.1, 0.68, 0.13], [0.3, -0.62, 0.1]].forEach(function (p) {
        ctx.fillStyle = 'rgba(205,232,178,0.9)'; ctx.beginPath(); ctx.arc(p[0] * R, p[1] * R, p[2] * R, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (var q = 0; q < 5; q++) { var a = q * 1.256 + p[0]; ctx.beginPath(); ctx.arc(p[0] * R + Math.cos(a) * p[2] * R * 0.85, p[1] * R + Math.sin(a) * p[2] * R * 0.85, R * 0.03, 0, 7); ctx.fill(); }
      });
    }
    if (o.cooled) {
      ctx.fillStyle = 'rgba(200,235,255,0.35)'; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
    }
    ctx.restore();
    bodyPath(ctx, type, R);
    ctx.lineWidth = Math.max(2, R * 0.08); ctx.strokeStyle = INK; ctx.stroke();
    topper(ctx, type, R);
    if (o.cooled) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = R * 0.05;
      for (var k = 0; k < 3; k++) { ctx.beginPath(); var a = k * Math.PI / 3; ctx.moveTo(-R * 0.7 + Math.cos(a) * R * 0.15, -R * 0.45 + Math.sin(a) * R * 0.15); ctx.lineTo(-R * 0.7 - Math.cos(a) * R * 0.15, -R * 0.45 - Math.sin(a) * R * 0.15); ctx.stroke(); }
    }
    var faceY = type === 'pear' ? R * 0.22 : type === 'banana' ? R * 0.22 : R * 0.04;
    ctx.save(); ctx.translate(0, faceY);
    if (r < 4 && !o.noPips) pips(ctx, s + 1, type === 'banana' ? R * 0.75 : R, type === 'banana' ? -R * 0.22 : -R * 0.33);
    face(ctx, moodFor(r, o.danger), type === 'banana' ? R * 0.62 : R * 0.9, t);
    ctx.restore();
    if (o.assist && r < 4) {
      ctx.font = '700 ' + Math.round(R * 0.62) + 'px Fredoka, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = R * 0.14; ctx.strokeStyle = '#fff'; ctx.strokeText(String(s + 1), R * 0.62, R * 0.6);
      ctx.fillStyle = INK; ctx.fillText(String(s + 1), R * 0.62, R * 0.6);
    }
    if (r >= 4) { // stink lines
      ctx.strokeStyle = 'rgba(122,122,58,0.8)'; ctx.lineWidth = R * 0.06;
      for (var j = -1; j <= 1; j++) {
        ctx.beginPath(); var bx = j * R * 0.35, by = -R * 1.1;
        ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + R * 0.12, by - R * 0.15, bx, by - R * 0.3); ctx.quadraticCurveTo(bx - R * 0.12, by - R * 0.45, bx, by - R * 0.6); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  root.ART = { INK: INK, STAGE: STAGE, ROTTEN: ROTTEN, fruitColour: fruitColour, drawFruit: drawFruit, roundRect: roundRect, star: star, bodyPath: bodyPath, mix: mix };
})(this);
