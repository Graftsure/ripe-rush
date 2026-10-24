// Ripe Rush - rendering, input, screens, analytics.
(function () {
  'use strict';
  var RR = window.RR, ART = window.ART, AU = window.RRAudio, LEVELS = window.LEVELS;
  var INK = ART.INK;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1;

  // ---------- storage ----------
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var prefersReduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = Object.assign({ music: true, sfx: true, vib: true, assist: false, reduced: prefersReduced }, load('rr_settings', {}));
  var progress = load('rr_progress', { stars: {}, tutSeen: {} });

  // ---------- analytics (local only) ----------
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var AN = load('rr_analytics', null);
  if (!AN) AN = { firstOpen: dayKey(), firstOpenTs: Date.now(), sessionsByDay: {}, levelsCompleted: {}, levelStarts: 0, levelWins: 0, levelFails: 0, playSeconds: 0, lastSeenTs: 0 };
  function newSession() {
    var k = dayKey(); AN.sessionsByDay[k] = (AN.sessionsByDay[k] || 0) + 1; AN.lastSeenTs = Date.now(); save('rr_analytics', AN);
  }
  newSession();
  var hiddenAt = 0;
  function anBump(f, lv) {
    if (f === 'start') AN.levelStarts++;
    if (f === 'win') { AN.levelWins++; AN.levelsCompleted[lv] = (AN.levelsCompleted[lv] || 0) + 1; }
    if (f === 'fail') AN.levelFails++;
    save('rr_analytics', AN);
  }
  function anSummary() {
    var first = new Date(AN.firstOpenTs), next = new Date(first); next.setDate(next.getDate() + 1);
    var days = Object.keys(AN.sessionsByDay).sort();
    var total = days.reduce(function (a, k) { return a + AN.sessionsByDay[k]; }, 0);
    var stars = Object.keys(progress.stars).reduce(function (a, k) { return a + progress.stars[k]; }, 0);
    return [
      'First opened:        ' + AN.firstOpen,
      'Came back next day:  ' + (AN.sessionsByDay[dayKey(next)] ? 'YES' : (Date.now() - AN.firstOpenTs < 864e5 ? 'not yet (day 1)' : 'no')),
      'Days played:         ' + days.length,
      'Total sessions:      ' + total,
      'Sessions per day:    ', days.map(function (k) { return '   ' + k + ':  ' + AN.sessionsByDay[k]; }).join('\n'),
      'Levels started:      ' + AN.levelStarts,
      'Levels won / failed: ' + AN.levelWins + ' / ' + AN.levelFails,
      'Unique levels beaten:' + Object.keys(AN.levelsCompleted).length + ' of ' + LEVELS.length,
      'Stars collected:     ' + stars + ' of ' + LEVELS.length * 3,
      'Time in levels:      ' + Math.round(AN.playSeconds / 60) + ' min',
      'Wins per level:      ' + JSON.stringify(AN.levelsCompleted),
      '', 'Raw JSON:', JSON.stringify(AN)
    ].join('\n');
  }

  // ---------- haptics ----------
  function buzz(p) { if (S.vib && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }

  // ---------- resize ----------
  function resize() {
    DPR = Math.min(2.5, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize); resize();

  // ---------- game state ----------
  var mode = 'title'; // title | levels | game
  var levelIdx = 0, g = null, paused = false, ended = false, endTimer = 0;
  var vis = {}, flyers = [], ghosts = [], parts = [], texts = [], crateFx = [], shake = 0, hitStop = 0;
  var drag = null, firstAction = { deliver: false, park: false, move: false };
  var titleFruits = [];
  var now = 0;

  function L() { // layout
    var def = g ? g.def : LEVELS[0];
    var top = Math.max(64, H * 0.085);
    var rows = Math.ceil(def.board / 3);
    var boardBottom = H * 0.55;
    var cell = Math.min((W - 24) / 3, (boardBottom - top) / rows, 150);
    var bx = W / 2 - cell * 1.5, by = top + (boardBottom - top - cell * rows) / 2;
    var nC = def.visible, gap = 12;
    var cw = Math.min((W - gap * (nC + 1)) / nC, 160), ch = Math.min(cw * 0.95, H * 0.2);
    var cy = H * 0.69;
    var nCool = def.cool || 0, coolCell = Math.min(cell * 0.9, 96);
    return { top: top, cell: cell, bx: bx, by: by, rows: rows, R: cell * 0.33, cw: cw, ch: ch, cy: cy, gap: gap, nC: nC,
      coolY: H * 0.875, coolCell: coolCell, nCool: nCool, boardBottom: boardBottom };
  }
  function slotPos(l, i) { return { x: l.bx + (i % 3 + 0.5) * l.cell, y: l.by + (Math.floor(i / 3) + 0.5) * l.cell }; }
  function cratePos(l, i) {
    var total = l.nC * l.cw + (l.nC - 1) * l.gap, x0 = W / 2 - total / 2;
    var c = g.crates[i], ox = 0, oy = 0;
    if (c && c.leaving > 0) { var k = 1 - c.leaving / 0.9; ox = k < 0.3 ? 0 : Math.pow((k - 0.3) / 0.7, 2) * (W + l.cw); oy = k < 0.3 ? -Math.sin(k / 0.3 * Math.PI) * 14 : 0; }
    var fx = crateFx[i];
    if (fx && fx.arrive > 0) ox = -Math.pow(fx.arrive, 2) * (W * 0.8);
    if (fx && fx.shake > 0) ox += Math.sin(fx.shake * 40) * 6 * (fx.shake / 0.25);
    return { x: x0 + i * (l.cw + l.gap) + l.cw / 2 + ox, y: l.cy + oy, w: l.cw, h: l.ch };
  }
  function coolPos(l, i) {
    var total = l.nCool * l.coolCell;
    return { x: W / 2 - total / 2 + (i + 0.5) * l.coolCell, y: l.coolY };
  }
  function fruitTarget(l, f) { return f.where === 'cool' ? coolPos(l, f.i) : slotPos(l, f.i); }

  function startLevel(i) {
    levelIdx = i;
    g = RR.createGame(LEVELS[i], (Math.random() * 1e9) | 0);
    vis = {}; flyers = []; ghosts = []; parts = []; texts = []; crateFx = []; shake = 0; drag = null;
    paused = false; ended = false; endTimer = 0;
    firstAction = { deliver: false, park: false, move: false };
    for (var k = 0; k < g.crates.length; k++) crateFx.push({ bounce: 0, shake: 0, arrive: 0.6 - k * 0.1, glow: 0 });
    var l = L();
    g.fruits.forEach(function (f, n) { var p = fruitTarget(l, f); vis[f.id] = newVis(p, -n * 0.08); });
    g.events.length = 0;
    hintT = 0; hintText = LEVELS[i].hint && !(progress.tutSeen[i] >= 3) ? LEVELS[i].hint : (LEVELS[i].hint && i < 1 ? LEVELS[i].hint : null);
    if (LEVELS[i].hint) { progress.tutSeen[i] = (progress.tutSeen[i] || 0) + 1; save('rr_progress', progress); }
    hintText = LEVELS[i].hint || null; hintFadeAt = 0;
    show('game');
    anBump('start');
  }
  var hintText = null, hintT = 0;
  function newVis(p, delay) { return { x: p.x, y: p.y, s: 0, born: delay || 0, sx: 1, sy: 1, pop: 0, wig: 0, phase: Math.random() * 6.28 }; }

  // ---------- particles & text ----------
  function burst(x, y, colour, n, speed, kind) {
    if (S.reduced) n = Math.ceil(n / 3);
    for (var i = 0; i < n && parts.length < 60; i++) {
      var a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.5, life: 0.6 + Math.random() * 0.4, t: 0, c: colour, r: 3 + Math.random() * 4, kind: kind || 'drop' });
    }
  }
  function floatText(x, y, str, colour, size, life) { texts.push({ x: x, y: y, s: str, c: colour || '#fff', size: size || 22, t: 0, life: life || 0.9 }); }

  // ---------- event handling ----------
  var COMBO_WORDS = ['', '', 'Nice!', 'Juicy!', 'Fresh!', 'Perfect!', 'Ripe-tastic!', 'Fruit Frenzy!'];
  function handleEvents() {
    var l = L();
    g.events.forEach(function (e) {
      if (e.e === 'spawn') { if (!vis[e.id]) { var f = RR.findFruit(g, e.id); vis[e.id] = newVis(fruitTarget(l, f), 0); AU.tick(); } }
      else if (e.e === 'ripen') { if (vis[e.id]) vis[e.id].pop = 1; }
      else if (e.e === 'deliver') {
        var v = vis[e.id] || { x: W / 2, y: H / 2 };
        if (drag && drag.id === e.id) { v = { x: drag.x, y: drag.y }; drag = null; }
        flyers.push({ type: e.type, r: e.r, x0: v.x, y0: v.y, t: 0, dur: 0.26, crate: e.crate, combo: e.combo, perfect: e.perfect });
        delete vis[e.id];
        firstAction.deliver = true;
        if (e.perfect && !S.reduced) hitStop = 0.04;
      }
      else if (e.e === 'crateFull') { /* handled when the flyer lands */ }
      else if (e.e === 'crateArrive') { crateFx[e.crate] = { bounce: 0, shake: 0, arrive: 0.5, glow: 0 }; }
      else if (e.e === 'fickle') { crateFx[e.crate].bounce = 0.6; AU.tick(); var p = cratePos(l, e.crate); floatText(p.x, p.y - p.h * 0.7, 'Changed mind!', '#7B6CF6', 16, 1.0); }
      else if (e.e === 'rot') {
        var rv = vis[e.id]; delete vis[e.id];
        if (rv) {
          ghosts.push({ kind: 'rot', x: rv.x, y: rv.y, type: e.type, t: 0 });
          burst(rv.x, rv.y, '#9BA86A', 6, 140, 'bubble');
          floatText(rv.x, rv.y - 40, 'Rotten!', '#4A3A3D', 20, 1.1);
        }
        if (!S.reduced) shake = 10;
        AU.rot(); buzz([30, 40, 30]);
      }
      else if (e.e === 'spare') {
        var sv = vis[e.id]; delete vis[e.id];
        if (sv) { ghosts.push({ kind: 'spare', x: sv.x, y: sv.y, type: e.type, r: e.r, t: 0 }); floatText(sv.x, sv.y - 30, 'Juiced +2', '#fff', 16, 0.8); }
        AU.spare();
      }
      else if (e.e === 'park') { firstAction.park = true; AU.pick(); var pv = vis[e.id]; if (pv) pv.pop = 0.8; }
      else if (e.e === 'move') { firstAction.move = true; AU.pick(); }
      else if (e.e === 'win' || e.e === 'lose') { ended = e.e; endTimer = e.e === 'win' ? 1.1 : 1.0; }
    });
    g.events.length = 0;
  }

  function landFlyer(fl) {
    var l = L(), p = cratePos(l, fl.crate);
    var fx = crateFx[fl.crate]; if (fx) fx.bounce = 1;
    var col = ART.fruitColour(fl.r);
    burst(p.x, p.y - p.h * 0.3, col, 10, 220, 'drop');
    burst(p.x, p.y - p.h * 0.3, '#ffffff', 3, 160, 'spark');
    var pts = 10 * fl.combo + (fl.perfect ? 5 : 0);
    floatText(p.x, p.y - p.h * 0.65, '+' + pts, '#fff', 22, 0.8);
    if (fl.combo >= 2) {
      var w = COMBO_WORDS[Math.min(COMBO_WORDS.length - 1, fl.combo)];
      floatText(W / 2, L().boardBottom + 4, w + ' x' + fl.combo, '#FFC83D', 26 + Math.min(12, fl.combo * 2), 1.0);
      if (fl.combo >= 5 && !S.reduced) shake = Math.max(shake, 2);
    } else if (fl.perfect) floatText(p.x, p.y - p.h * 0.9, 'Spot on!', '#FFC83D', 16, 0.8);
    AU.drop(fl.combo); buzz(12);
    var c = g.crates[fl.crate];
    if (c && c.filled >= c.size) { AU.crate(); burst(p.x, p.y - p.h * 0.4, '#FFC83D', 8, 260, 'spark'); floatText(p.x, p.y - p.h, 'Packed!', '#fff', 20, 1); }
  }

  // ---------- input ----------
  function pt(ev) { return { x: ev.clientX, y: ev.clientY }; }
  function fruitAt(x, y) {
    var l = L(), best = null, bd = 1e9;
    g.fruits.forEach(function (f) {
      var v = vis[f.id]; if (!v) return;
      var d = Math.hypot(v.x - x, v.y - y);
      if (d < l.cell * 0.55 && d < bd) { bd = d; best = f; }
    });
    return best;
  }
  function crateAt(l, x, y) {
    for (var i = 0; i < g.crates.length; i++) {
      if (!g.crates[i]) continue;
      var p = cratePos(l, i);
      if (Math.abs(x - p.x) < p.w / 2 + 8 && y > p.y - p.h * 0.8 && y < p.y + p.h * 0.6) return i;
    }
    return -1;
  }
  function coolAt(l, x, y) { for (var i = 0; i < l.nCool; i++) { var p = coolPos(l, i); if (Math.abs(x - p.x) < l.coolCell / 2 + 6 && Math.abs(y - p.y) < l.coolCell / 2 + 10) return i; } return -1; }
  function slotAt(l, x, y) { for (var i = 0; i < g.slots.length; i++) { var p = slotPos(l, i); if (Math.abs(x - p.x) < l.cell / 2 && Math.abs(y - p.y) < l.cell / 2) return i; } return -1; }

  var REASONS = { early: 'Not ripe yet!', late: 'Too ripe for these crates', type: 'Wrong kind of fruit', busy: 'Wait for the next crate' };
  function failFeedback(id, res, crateIdx) {
    var v = vis[id]; if (v) v.wig = 0.3;
    if (crateIdx != null && crateIdx >= 0 && crateFx[crateIdx]) crateFx[crateIdx].shake = 0.25;
    AU.bonk(); buzz(8);
    if (v && res && res.reason) floatText(v.x, v.y - L().R * 1.3, REASONS[res.reason] || 'Nope', '#fff', 15, 0.9);
  }

  cv.addEventListener('pointerdown', function (ev) {
    AU.init();
    if (mode !== 'game' || paused || ended || !g) return;
    var p = pt(ev), f = fruitAt(p.x, p.y);
    if (!f) return;
    drag = { id: f.id, x0: p.x, y0: p.y, x: p.x, y: p.y, moving: false, pid: ev.pointerId };
    var v = vis[f.id]; if (v) { v.sx = 1.12; v.sy = 0.88; }
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
  });
  cv.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var p = pt(ev); drag.x = p.x; drag.y = p.y;
    if (!drag.moving && Math.hypot(p.x - drag.x0, p.y - drag.y0) > 14) { drag.moving = true; AU.pick(); }
  });
  function endDrag(ev) {
    if (!drag || !g) { drag = null; return; }
    var d = drag, l = L();
    if (!RR.findFruit(g, d.id)) { drag = null; return; }
    if (!d.moving) {
      drag = null;
      var res = RR.tap(g, d.id);
      if (!res.ok && !res.unparked) failFeedback(d.id, res, -1);
      else if (res.unparked) AU.pick();
    } else {
      var ci = crateAt(l, d.x, d.y), ki = coolAt(l, d.x, d.y), si = slotAt(l, d.x, d.y);
      var v = vis[d.id]; if (v) { v.x = d.x; v.y = d.y; }
      if (ci >= 0) { var r = RR.deliverTo(g, d.id, ci); if (!r.ok) failFeedback(d.id, r, ci); }
      else if (ki >= 0) { if (!RR.park(g, d.id, ki).ok) failFeedback(d.id, null, -1); }
      else if (si >= 0 && !g.slots[si]) RR.moveTo(g, d.id, si);
      drag = null;
    }
    handleEvents();
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', function () { drag = null; });

  // ---------- update ----------
  var timeScale = 1;
  function update(dt) {
    dt *= timeScale;
    now += dt;
    if (mode === 'title') { updateTitle(dt); }
    if (mode !== 'game' || !g) return;
    if (!paused) {
      if (hitStop > 0) hitStop -= dt;
      else if (!ended) { RR.update(g, dt); AN.playSeconds += dt; }
      handleEvents();
    }
    if (paused) return;
    hintT += dt;
    var l = L();
    g.fruits.forEach(function (f) {
      var v = vis[f.id]; if (!v) return;
      if (v.born < 0) { v.born += dt; return; }
      v.s = Math.min(1, v.s + dt * 4);
      var tp = fruitTarget(l, f);
      if (drag && drag.id === f.id && drag.moving) { v.x = drag.x; v.y = drag.y - 10; }
      else { var k = Math.min(1, dt * 14); v.x += (tp.x - v.x) * k; v.y += (tp.y - v.y) * k; }
      v.sx += (1 - v.sx) * Math.min(1, dt * 12); v.sy += (1 - v.sy) * Math.min(1, dt * 12);
      v.pop = Math.max(0, v.pop - dt * 4); v.wig = Math.max(0, v.wig - dt);
    });
    for (var i = flyers.length - 1; i >= 0; i--) { var fl = flyers[i]; fl.t += dt; if (fl.t >= fl.dur) { landFlyer(fl); flyers.splice(i, 1); } }
    for (i = ghosts.length - 1; i >= 0; i--) { ghosts[i].t += dt; if (ghosts[i].t > 0.9) ghosts.splice(i, 1); }
    crateFx.forEach(function (fx) { if (!fx) return; fx.bounce = Math.max(0, fx.bounce - dt * 3); fx.shake = Math.max(0, fx.shake - dt); fx.arrive = Math.max(0, fx.arrive - dt * 2.2); });
    shake = Math.max(0, shake - dt * 40);
    if (ended) {
      endTimer -= dt;
      if (ended === 'win' && Math.random() < 0.5 && !S.reduced) burst(Math.random() * W, -10, ART.STAGE[(Math.random() * 4) | 0], 1, 80, 'confetti');
      if (endTimer <= 0 && !$('result').classList.contains('shown')) showResult();
    }
  }
  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.t += dt;
      if (p.kind === 'bubble') { p.vy -= 60 * dt; p.vx *= 0.95; } else if (p.kind === 'confetti') { p.vy = 140; p.vx = Math.sin(p.t * 5 + i) * 60; p.life = 3; }
      else p.vy += 700 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t > p.life || p.y > H + 20) parts.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > texts[i].life) texts.splice(i, 1); }
  }

  // ---------- drawing ----------
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function bg() {
    var gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#CFEAF6'); gr.addColorStop(1, '#F6E3EE');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // soft hills
    ctx.fillStyle = 'rgba(31,163,122,0.10)';
    ctx.beginPath(); ctx.moveTo(0, H * 0.62); ctx.quadraticCurveTo(W * 0.3, H * 0.55, W * 0.6, H * 0.6); ctx.quadraticCurveTo(W * 0.85, H * 0.64, W, H * 0.58); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  }

  function drawBoard(l) {
    var def = g.def;
    // table
    ctx.fillStyle = '#FFF6E5';
    ART.roundRect(ctx, l.bx - 8, l.by - 8, l.cell * 3 + 16, l.cell * l.rows + 16, 22); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(45,42,64,0.25)'; ctx.stroke();
    for (var i = 0; i < def.board; i++) {
      var p = slotPos(l, i);
      if ((def.sunny || []).indexOf(i) >= 0) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(S.reduced ? 0 : now * 0.4);
        ctx.fillStyle = 'rgba(255,200,61,0.45)';
        for (var k = 0; k < 10; k++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(l.cell * 0.5, -l.cell * 0.09); ctx.lineTo(l.cell * 0.5, l.cell * 0.09); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = 'rgba(255,224,84,0.6)'; ctx.beginPath(); ctx.arc(p.x, p.y, l.cell * 0.36, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(45,42,64,0.55)'; ctx.font = '800 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('SUNNY x2', p.x, p.y + l.cell * 0.47);
      } else {
        ctx.fillStyle = 'rgba(169,113,74,0.12)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + l.R * 0.85, l.R * 0.95, l.R * 0.3, 0, 0, 7); ctx.fill();
      }
    }
  }

  function drawCrate(l, i) {
    var c = g.crates[i]; if (!c) return;
    var p = cratePos(l, i), fx = crateFx[i] || {};
    var b = fx.bounce > 0 ? 1 + Math.sin(fx.bounce * Math.PI) * 0.08 : 1;
    if (fx.arrive > 0) b *= 1;
    var w = p.w, h = p.h;
    ctx.save(); ctx.translate(p.x, p.y + h * 0.5); ctx.scale(b, 2 - b); ctx.translate(0, -h * 0.5);
    // glow if dragging a match
    if (drag && drag.moving) {
      var df = RR.findFruit(g, drag.id);
      if (df && c.leaving <= 0 && c.want === RR.stageOf(df) && (!c.type || c.type === df.type) && c.filled < c.size) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ART.roundRect(ctx, -w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 20); ctx.fill();
      }
    }
    // peeking fruit inside
    var R2 = Math.min(w / 7, h / 4.5);
    var shown = Math.min(c.filled, 6);
    for (var k = 0; k < shown; k++) {
      var cx = -w / 2 + w * (0.18 + (k % 3) * 0.32), cy = -h * 0.42 - (k >= 3 ? R2 * 0.6 : 0);
      ART.drawFruit(ctx, cx, cy, R2, c.type || 'apple', c.want + 0.5, { noShadow: true, noPips: true, t: now });
    }
    // box
    ctx.fillStyle = 'rgba(45,42,64,0.18)'; ART.roundRect(ctx, -w / 2, -h * 0.42 + 4, w, h * 0.92, 14); ctx.fill();
    ctx.fillStyle = '#A9714A'; ART.roundRect(ctx, -w / 2, -h * 0.42, w, h * 0.92, 14); ctx.fill();
    ctx.strokeStyle = '#7E5236'; ctx.lineWidth = 3;
    for (var s = 1; s < 3; s++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -h * 0.42 + s * h * 0.3); ctx.lineTo(w / 2 - 6, -h * 0.42 + s * h * 0.3); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ART.roundRect(ctx, -w / 2, -h * 0.42, w, h * 0.92, 14); ctx.stroke();
    // label
    var lw = w * 0.74, lh = h * 0.5, ly = -h * 0.3;
    ctx.fillStyle = '#FFF6E5'; ART.roundRect(ctx, -lw / 2, ly, lw, lh, 12); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
    var lr = Math.min(lh * 0.36, lw * 0.22);
    ART.drawFruit(ctx, -lw * 0.18, ly + lh * 0.5, lr, c.type || 'blob', c.want + 0.45, { noShadow: true, t: now, assist: S.assist });
    // capacity pips
    var left = c.size - c.filled;
    ctx.fillStyle = INK; ctx.font = '900 ' + Math.round(lr * 0.95) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.leaving > 0 ? 'OK' : 'x' + left, lw * 0.24, ly + lh * 0.5);
    if (c.type) {
      var tag = (c.type === 'berry' ? 'BERRIES' : c.type.toUpperCase() + 'S') + ' ONLY'; ctx.font = '900 11px system-ui';
      var tw = ctx.measureText(tag).width + 14;
      ctx.fillStyle = '#7B6CF6'; ART.roundRect(ctx, -tw / 2, h * 0.47, tw, 18, 9); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(tag, 0, h * 0.47 + 9.5);
    }
    // fill bar
    var bw = w * 0.74, bh = 8, byy = h * 0.32;
    ctx.fillStyle = 'rgba(45,42,64,0.35)'; ART.roundRect(ctx, -bw / 2, byy, bw, bh, 4); ctx.fill();
    ctx.fillStyle = '#FFC83D'; ART.roundRect(ctx, -bw / 2, byy, Math.max(8, bw * c.filled / c.size), bh, 4); ctx.fill();
    // fickle timer ring
    if (c.fickle && c.leaving <= 0) {
      var k2 = c.fickleT / c.fickle.period;
      var rx = lw * 0.5 + 2, ry = -h * 0.42;
      ctx.beginPath(); ctx.arc(rx - 4, ry, 14, 0, 7); ctx.fillStyle = '#7B6CF6'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx - 4, ry); ctx.arc(rx - 4, ry, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k2)); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      var nextWant = c.fickle.list[(c.fickleIdx + 1) % c.fickle.list.length];
      ctx.beginPath(); ctx.arc(rx - 4, ry + 22, 6, 0, 7); ctx.fillStyle = ART.STAGE[nextWant]; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      ctx.font = '800 9px system-ui'; ctx.fillStyle = INK; ctx.fillText('next', rx - 4, ry + 36);
    }
    ctx.restore();
  }

  function drawCool(l) {
    if (!l.nCool) return;
    var total = l.nCool * l.coolCell + 20, h = l.coolCell + 18;
    ctx.fillStyle = 'rgba(45,42,64,0.18)'; ART.roundRect(ctx, W / 2 - total / 2, l.coolY - h / 2 + 4, total, h, 18); ctx.fill();
    ctx.fillStyle = '#DFF3FF'; ART.roundRect(ctx, W / 2 - total / 2, l.coolY - h / 2, total, h, 18); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('COOL BOX', W / 2, l.coolY - h / 2 - 10);
    for (var i = 0; i < l.nCool; i++) {
      var p = coolPos(l, i);
      ctx.strokeStyle = 'rgba(80,150,200,0.5)'; ctx.lineWidth = 2;
      ART.roundRect(ctx, p.x - l.coolCell / 2 + 6, p.y - l.coolCell / 2 + 2, l.coolCell - 12, l.coolCell - 4, 12); ctx.stroke();
      if (!g.cool[i]) { // snowflake
        ctx.save(); ctx.translate(p.x, p.y); ctx.strokeStyle = 'rgba(80,150,200,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (var k = 0; k < 3; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke(); }
        ctx.restore();
      }
    }
  }

  function dangerOf(f) {
    if (f.where === 'cool' || f.r < 3) return 0;
    var mult = (RR.TYPES[f.type] || { speed: 1 }).speed * ((g.def.sunny || []).indexOf(f.i) >= 0 ? 2 : 1);
    var secs = (4 - f.r) * g.def.stageTime / mult;
    return secs < 1.5 ? 1 - secs / 1.5 : 0;
  }

  function drawFruits(l) {
    var list = g.fruits.slice().sort(function (a, b) { return (drag && a.id === drag.id) - (drag && b.id === drag.id); });
    list.forEach(function (f) {
      var v = vis[f.id]; if (!v || v.born < 0) return;
      var sc = S.reduced ? 1 : easeOutBack(Math.min(1, v.s));
      if (S.reduced) sc = v.s;
      var bob = S.reduced ? 0 : Math.sin(now * 2.5 + v.phase) * 0.025;
      var pop = v.pop > 0 ? Math.sin(v.pop * Math.PI) * 0.08 : 0;
      var d = dangerOf(f), jx = 0, rot = 0;
      if (d > 0) { jx = Math.sin(now * 60) * (1 + d * 2.5); rot = Math.sin(now * 47) * 0.05 * d; }
      if (v.wig > 0) jx += Math.sin(v.wig * 40) * 6 * (v.wig / 0.3);
      var lifted = drag && drag.id === f.id && drag.moving ? 1.15 : 1;
      var R = l.R * sc * lifted;
      // stage progress ring
      if (f.r < 4 && !(drag && drag.id === f.id && drag.moving)) {
        var frac = f.r - Math.floor(f.r);
        ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.strokeStyle = d > 0 ? 'rgba(227,67,79,' + (0.5 + 0.5 * Math.sin(now * 14)) + ')' : 'rgba(255,255,255,0.75)';
        if (f.where !== 'cool' || frac > 0) { ctx.beginPath(); ctx.arc(v.x, v.y, l.R * 1.22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke(); }
      }
      ART.drawFruit(ctx, v.x + jx, v.y, R, f.type, f.r, {
        t: now + v.phase, sx: (v.sx + bob + pop), sy: (v.sy - bob + pop), rot: rot, danger: d > 0, assist: S.assist, cooled: f.where === 'cool'
      });
    });
  }

  function drawFlyers(l) {
    flyers.forEach(function (fl) {
      var p = cratePos(l, fl.crate), k = fl.t / fl.dur, e = 1 - Math.pow(1 - k, 3);
      var x = fl.x0 + (p.x - fl.x0) * e, y = fl.y0 + (p.y - p.h * 0.35 - fl.y0) * e - Math.sin(k * Math.PI) * 60;
      ART.drawFruit(ctx, x, y, l.R * (1 - 0.35 * e), fl.type, fl.r, { t: now, rot: e * 0.6, noShadow: true });
    });
    ghosts.forEach(function (gh) {
      var k = gh.t / 0.9;
      if (gh.kind === 'rot') ART.drawFruit(ctx, gh.x, gh.y + k * 10, l.R, gh.type, 4.2, { t: now, sx: 1 + k * 0.4, sy: 1 - k * 0.45, alpha: 1 - k * k });
      else ART.drawFruit(ctx, gh.x + k * W * 0.5, gh.y - Math.sin(k * Math.PI) * 50, l.R * (1 - k * 0.5), gh.type, gh.r, { t: now, alpha: 1 - k, rot: k * 4 });
    });
  }

  function drawParts() {
    parts.forEach(function (p) {
      var a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = p.c;
      if (p.kind === 'spark') { ART.star(ctx, p.x, p.y, p.r * 1.6); ctx.fill(); }
      else if (p.kind === 'bubble') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.3, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(45,42,64,0.4)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      else if (p.kind === 'confetti') { ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    texts.forEach(function (t) {
      var k = t.t / t.life, sc = k < 0.2 ? easeOutBack(k / 0.2) : 1;
      ctx.save(); ctx.translate(t.x, t.y - k * 40); ctx.scale(sc, sc);
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.font = '900 ' + t.size + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, t.size * 0.22); ctx.strokeStyle = INK; ctx.strokeText(t.s, 0, 0);
      ctx.fillStyle = t.c; ctx.fillText(t.s, 0, 0);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function drawHUD(l) {
    var y = Math.max(8, 0) + 30;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 20px system-ui'; ctx.fillStyle = INK;
    ctx.fillText('Level ' + (levelIdx + 1), W / 2, y - 8);
    ctx.font = '700 13px system-ui'; ctx.fillText(g.def.name, W / 2, y + 12);
    // stars left (rot costs stars)
    var stars = Math.max(0, 3 - g.rot);
    for (var i = 0; i < 3; i++) {
      var x = W - 26 - (2 - i) * 28;
      ART.star(ctx, x, y, 12); ctx.fillStyle = i < stars ? '#FFC83D' : '#d9d3df'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    var lives = g.rotAllowed - g.rot;
    ctx.font = '800 11px system-ui'; ctx.fillStyle = INK; ctx.textAlign = 'right';
    ctx.fillText(lives >= 0 ? 'rot allowed: ' + lives : '', W - 12, y + 22);
    // crates progress + score
    var need = RR.remainingNeed(g);
    ctx.textAlign = 'center'; ctx.font = '800 14px system-ui';
    ctx.fillText('Fruit to pack: ' + need + '    Score: ' + g.score, W / 2, H - 18);
  }

  function drawHint(l) {
    if (!hintText) return;
    var done = (levelIdx === 4 ? firstAction.park : levelIdx === 7 ? firstAction.move : firstAction.deliver);
    var alpha = done ? Math.max(0, 1 - (hintT - 0) / 0.001) : 1;
    if (done && !hintFadeAt) hintFadeAt = now;
    if (hintFadeAt) alpha = Math.max(0, 1 - (now - hintFadeAt) / 0.6);
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = '800 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var lines = wrap(hintText, W - 60), lh = 20, bh = lines.length * lh + 16, bw = W - 32;
    var y = l.by + l.cell * l.rows + 14;
    var yy = Math.min(y, l.cy - l.ch * 0.5 - bh - 30);
    ctx.fillStyle = 'rgba(255,246,229,0.96)'; ART.roundRect(ctx, 16, yy, bw, bh, 16); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; lines.forEach(function (s, i) { ctx.fillText(s, W / 2, yy + 8 + lh / 2 + i * lh); });
    ctx.restore();
    // pointing hand
    if (done || hintT < 1) return;
    if (levelIdx <= 1) {
      var target = null; g.fruits.forEach(function (f) { if (!target && RR.matchCrate(g, f) >= 0) target = f; });
      if (target && vis[target.id]) { var v = vis[target.id]; hand(v.x + l.R * 0.5, v.y + l.R * 0.6 + Math.abs(Math.sin(now * 4)) * 10, alpha); }
    } else if ((levelIdx === 4 || levelIdx === 7)) {
      var from = null; g.fruits.forEach(function (f) { if (!from && f.where === 'board' && vis[f.id] && (levelIdx !== 7 || g.def.sunny.indexOf(f.i) < 0)) from = vis[f.id]; });
      var to = levelIdx === 4 ? coolPos(l, 0) : slotPos(l, g.def.sunny[0]);
      if (from) { var k = (now * 0.6) % 1, e = k < 0.7 ? k / 0.7 : 1; hand(from.x + (to.x - from.x) * e + l.R * 0.4, from.y + (to.y - from.y) * e + l.R * 0.5, alpha * (k < 0.85 ? 1 : (1 - k) / 0.15)); }
    }
  }
  var hintFadeAt = 0;
  function hand(x, y, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(-0.4);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ART.roundRect(ctx, -6, -26, 12, 30, 6); ctx.fill(); ctx.stroke();
    ART.roundRect(ctx, -14, -2, 30, 26, 10); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function wrap(text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }

  function drawGame() {
    var l = L();
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    bg();
    drawBoard(l);
    for (var i = 0; i < g.crates.length; i++) drawCrate(l, i);
    drawCool(l);
    drawFruits(l);
    drawFlyers(l);
    drawParts();
    drawHUD(l);
    drawHint(l);
    ctx.restore();
  }

  // ---------- title ----------
  function updateTitle(dt) {
    if (titleFruits.length < 7) {
      var types = ['apple', 'berry', 'pear', 'plum'];
      titleFruits.push({ x: Math.random() * W, y: H + 40, vx: (Math.random() - 0.5) * 40, vy: -(260 + Math.random() * 200), r: Math.random() * 3.9, type: types[(Math.random() * 4) | 0], R: 26 + Math.random() * 18, rot: 0 });
    }
    titleFruits.forEach(function (f) { f.vy += 120 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += dt * 0.25; if (f.r > 3.95) f.r = 0; f.rot = Math.sin(now + f.x) * 0.2; });
    titleFruits = titleFruits.filter(function (f) { return f.y < H + 80; });
  }
  function drawTitle() {
    bg();
    titleFruits.forEach(function (f) { ART.drawFruit(ctx, f.x, f.y, f.R, f.type, f.r, { t: now + f.x, rot: f.rot }); });
    drawParts();
  }

  // ---------- loop ----------
  var last = performance.now();
  function frame(t) {
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    update(dt); updateParts(dt);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (mode === 'game' && g) drawGame(); else drawTitle();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- screens ----------
  var SCREENS = ['title', 'levels', 'pause', 'result', 'debug', 'settings'];
  function show(m) {
    mode = m === 'game' ? 'game' : (m === 'levels' || m === 'debug') ? 'menu' : 'title';
    if (m === 'levels' || m === 'debug') mode = 'title';
    if (m === 'game') mode = 'game';
    SCREENS.forEach(function (s) { $(s).classList.toggle('hidden', s !== m); $(s).classList.remove('shown'); });
    $('hud').classList.toggle('hidden', m !== 'game');
    if (m === 'levels') buildLevels();
    if (m === 'debug') $('dbgText').textContent = anSummary();
  }
  function unlockedUpTo() { var n = 0; while (n < LEVELS.length && progress.stars[n]) n++; return progress.unlockAll ? LEVELS.length - 1 : Math.min(n, LEVELS.length - 1); }
  function buildLevels() {
    var grid = $('lvGrid'); grid.innerHTML = '';
    var up = unlockedUpTo(), total = 0;
    LEVELS.forEach(function (lv, i) {
      var st = progress.stars[i] || 0; total += st;
      var b = document.createElement('button');
      b.className = 'lv' + (i > up ? ' locked' : '') + (i === up && !st ? ' next' : '');
      b.innerHTML = (i + 1) + '<span class="st">' + [0, 1, 2].map(function (k) { return k < st ? '<b>&#9733;</b>' : '&#9733;'; }).join('') + '</span>';
      b.onclick = function () { AU.init(); AU.button(); if (i <= up) startLevel(i); else { b.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], 200); AU.bonk(); } };
      grid.appendChild(b);
    });
    $('starTotal').textContent = total + ' / ' + LEVELS.length * 3 + ' \u2605';
  }
  var STAR_SVG = '<svg viewBox="-12 -12 24 24"><path d="M0,-11 L3.2,-4.4 10.5,-3.4 5.2,1.7 6.5,8.9 0,5.5 -6.5,8.9 -5.2,1.7 -10.5,-3.4 -3.2,-4.4Z" fill="FILL" stroke="#2D2A40" stroke-width="2" stroke-linejoin="round"/></svg>';
  function showResult() {
    var win = ended === 'win';
    $('result').classList.remove('hidden'); $('result').classList.add('shown');
    $('resTitle').textContent = win ? 'Level complete!' : 'Too much rot!';
    var st = win ? g.stars : 0;
    $('resStars').innerHTML = [0, 1, 2].map(function (k) { return STAR_SVG.replace('FILL', k < st ? '#FFC83D' : '#d9d3df'); }).join('');
    var svgs = $('resStars').querySelectorAll('svg');
    svgs.forEach(function (s, k) { setTimeout(function () { s.classList.add('in'); if (k < st) AU.star(k); }, 200 + k * 150); });
    if (win) {
      var msg = ['', 'Packed! Less rot = more stars.', 'Lovely! Only one went off.', 'Perfect - no rotten fruit!'][st];
      $('resText').textContent = msg + '  Score ' + g.score + (g.bestCombo > 1 ? '  Best combo x' + g.bestCombo : '');
      if ((progress.stars[levelIdx] || 0) < st) progress.stars[levelIdx] = st;
      save('rr_progress', progress); anBump('win', levelIdx + 1);
      AU.win(); buzz([20, 40, 20]);
      $('btnNext').classList.toggle('hidden', levelIdx >= LEVELS.length - 1);
      if (levelIdx >= LEVELS.length - 1) $('resText').textContent += '  You beat the last level - thanks for playtesting!';
    } else {
      $('resText').textContent = 'More than ' + g.rotAllowed + ' fruit went rotten. Tip: use the Cool Box and watch for trembling fruit.';
      $('btnNext').classList.add('hidden');
      anBump('fail', levelIdx + 1); AU.lose(); buzz(60);
    }
  }

  // toggles
  var TOGGLES = [['music', 'Music'], ['sfx', 'Sounds'], ['vib', 'Vibration'], ['assist', 'Colour assist (numbers)'], ['reduced', 'Reduced motion']];
  function buildToggles() {
    document.querySelectorAll('[data-toggles]').forEach(function (box) {
      box.innerHTML = '';
      TOGGLES.forEach(function (t) {
        var lab = document.createElement('span'); lab.textContent = t[1];
        var b = document.createElement('button'); b.className = 'tg' + (S[t[0]] ? ' on' : ''); b.setAttribute('aria-label', t[1]);
        b.onclick = function () { S[t[0]] = !S[t[0]]; save('rr_settings', S); applySettings(); buildToggles(); AU.button(); if (t[0] === 'vib' && S.vib) buzz(20); };
        box.appendChild(lab); box.appendChild(b);
      });
    });
  }
  function applySettings() { AU.musicOn = S.music; AU.sfxOn = S.sfx; if (AU.ctx) { AU.setMusic(S.music); AU.setSfx(S.sfx); } document.body.classList.toggle('reduced', !!S.reduced); }
  applySettings(); buildToggles();

  function pause(on) {
    if (mode !== 'game' || ended) return;
    paused = on; drag = null;
    $('pause').classList.toggle('hidden', !on);
  }
  $('btnPlay').onclick = function () { AU.init(); applySettings(); AU.button(); show('levels'); };
  $('btnSettingsT').onclick = function () { AU.init(); applySettings(); AU.button(); $('settings').classList.remove('hidden'); };
  $('btnSettingsDone').onclick = function () { AU.button(); $('settings').classList.add('hidden'); };
  $('btnLvBack').onclick = function () { AU.button(); show('title'); };
  $('btnPause').onclick = function () { AU.button(); pause(true); };
  $('btnResume').onclick = function () { AU.button(); pause(false); };
  $('btnRestart').onclick = function () { AU.button(); startLevel(levelIdx); };
  $('btnQuit').onclick = function () { AU.button(); g = null; show('levels'); };
  $('btnNext').onclick = function () { AU.button(); startLevel(Math.min(LEVELS.length - 1, levelIdx + 1)); };
  $('btnRetry').onclick = function () { AU.button(); startLevel(levelIdx); };
  $('btnResLevels').onclick = function () { AU.button(); g = null; show('levels'); };
  // hidden debug: tap the version label 5 times, or open with #debug
  var vTaps = 0, vTimer = 0;
  $('version').onclick = function () { vTaps++; clearTimeout(vTimer); vTimer = setTimeout(function () { vTaps = 0; }, 1500); if (vTaps >= 5) { vTaps = 0; show('debug'); } };
  $('btnDbgBack').onclick = function () { show('title'); };
  $('btnDbgCopy').onclick = function () { try { navigator.clipboard.writeText(anSummary()); $('btnDbgCopy').textContent = 'Copied'; } catch (e) {} };
  $('btnDbgUnlock').onclick = function () { progress.unlockAll = true; save('rr_progress', progress); $('btnDbgUnlock').textContent = 'Unlocked'; };
  $('btnDbgReset').onclick = function () { if (confirm('Reset all progress and stats?')) { localStorage.removeItem('rr_progress'); localStorage.removeItem('rr_analytics'); location.reload(); } };

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); pause(true); AU.suspend(); }
    else { AU.resume(); if (hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000) newSession(); }
  });

  // dev hooks for automated playtests/screenshots
  window.__rr = { startLevel: startLevel, show: show, get game() { return g; }, tap: function (id) { var r = RR.tap(g, id); handleEvents(); return r; },
    park: function (id, i) { var r = RR.park(g, id, i); handleEvents(); return r; }, moveTo: function (id, i) { var r = RR.moveTo(g, id, i); handleEvents(); return r; },
    progress: progress, analytics: AN, setSpeed: function (k) { timeScale = k; } };

  if (location.hash === '#debug') show('debug'); else show('title');

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
