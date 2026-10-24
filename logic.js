// Ripe Rush core game logic (no rendering) - usable in browser and Node.
(function (root) {
  'use strict';
  var TYPES = {
    apple: { speed: 1.0 },
    berry: { speed: 1.4 },
    pear:  { speed: 0.72 },
    plum:  { speed: 1.15 }
  };
  var STAGE_NAMES = ['green', 'yellow', 'orange', 'red'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function makeCrate(g, o) {
    var c = {
      id: g.nextCrateId++, want: o.fickle ? o.fickle.list[0] : o.want, size: o.size,
      filled: 0, type: o.type || null, fickle: o.fickle || null, fickleIdx: 0, fickleT: 0,
      leaving: 0
    };
    return c;
  }

  function createGame(def, seed) {
    var g = {
      def: def, rng: mulberry32(seed || 1), t: 0, fruits: [], nextId: 1, nextCrateId: 1,
      slots: [], cool: [], crates: [], orders: def.orders.map(function (o) { return Object.assign({}, o); }),
      rot: 0, rotAllowed: def.rotAllowed == null ? 2 : def.rotAllowed,
      spawnTimer: 0, state: 'play', events: [], combo: 0, comboTimer: 0, bestCombo: 0, score: 0, delivered: 0
    };
    var i;
    for (i = 0; i < def.board; i++) g.slots.push(null);
    for (i = 0; i < (def.cool || 0); i++) g.cool.push(null);
    for (i = 0; i < def.visible; i++) g.crates.push(g.orders.length ? makeCrate(g, g.orders.shift()) : null);
    var start = def.start || Math.min(3, def.board);
    for (i = 0; i < start; i++) spawn(g, true);
    g.spawnTimer = def.spawnEvery || 1.2;
    return g;
  }

  function stageOf(f) { return Math.min(4, Math.floor(f.r)); }

  function typeOk(want, type) { return !want || want === type; }

  function liveOrders(g) {
    var list = [];
    g.crates.forEach(function (c) { if (c && c.leaving <= 0 && c.filled < c.size) list.push({ want: c.want, type: c.type, fickle: c.fickle, left: c.size - c.filled }); });
    g.crates.forEach(function (c) { if (c && c.leaving > 0) {} });
    g.orders.forEach(function (o) { list.push({ want: o.fickle ? -1 : o.want, type: o.type || null, fickle: o.fickle, left: o.size }); });
    return list;
  }

  function remainingNeed(g) {
    var n = 0;
    g.crates.forEach(function (c) { if (c) n += c.size - c.filled; });
    g.orders.forEach(function (o) { n += o.size; });
    return n;
  }

  function canServe(g, f) {
    var s = stageOf(f);
    if (s >= 4) return false;
    var L = liveOrders(g);
    for (var i = 0; i < L.length; i++) {
      var o = L[i];
      if (!typeOk(o.type, f.type)) continue;
      if (o.fickle || o.want >= s) return true;
    }
    return false;
  }

  function inPlay(g) { return g.fruits.length; }

  function spawn(g, initial) {
    var empty = [];
    for (var i = 0; i < g.slots.length; i++) if (!g.slots[i]) empty.push(i);
    if (!empty.length) return null;
    // prefer non-sunny empty slots for spawning
    var sunny = g.def.sunny || [];
    var ns = empty.filter(function (i) { return sunny.indexOf(i) < 0; });
    if (ns.length) empty = ns;
    var slot = empty[Math.floor(g.rng() * empty.length)];
    // choose type: cover typed deficits first
    var types = g.def.types || ['apple'];
    var deficits = {}, totalDef = 0;
    liveOrders(g).forEach(function (o) { if (o.type) deficits[o.type] = (deficits[o.type] || 0) + o.left; });
    g.fruits.forEach(function (f) { if (deficits[f.type] && canServe(g, f)) deficits[f.type]--; });
    var pool = [];
    Object.keys(deficits).forEach(function (k) { for (var j = 0; j < deficits[k]; j++) pool.push(k); totalDef += Math.max(0, deficits[k]); });
    var untypedNeed = 0;
    liveOrders(g).forEach(function (o) { if (!o.type) untypedNeed += o.left; });
    var type;
    if (pool.length && (untypedNeed === 0 || g.rng() < 0.65)) type = pool[Math.floor(g.rng() * pool.length)];
    else if (untypedNeed > 0) type = types[Math.floor(g.rng() * types.length)];
    else {
      var anyT = []; liveOrders(g).forEach(function (o) { if (o.type) anyT.push(o.type); });
      type = anyT.length ? anyT[Math.floor(g.rng() * anyT.length)] : types[0];
    }
    var r0 = g.def.r0 || [0, 0.5];
    // if a green crate is waiting and nothing green is around, spawn fresh
    var needGreen = g.crates.some(function (c) { return c && c.leaving <= 0 && c.want === 0 && c.filled < c.size && typeOk(c.type, type); });
    var r = r0[0] + g.rng() * (r0[1] - r0[0]);
    if (needGreen && g.rng() < 0.6) r = Math.min(r, 0.15 * g.rng());
    // never spawn a fruit already too ripe for every remaining order of its type
    var maxW = -1;
    liveOrders(g).forEach(function (o) { if (typeOk(o.type, type)) maxW = Math.max(maxW, o.fickle ? 3 : o.want); });
    if (maxW >= 0 && r > maxW + 0.5) r = maxW + 0.2 * g.rng();
    var f = { id: g.nextId++, type: type, r: r, where: 'board', i: slot };
    g.slots[slot] = f.id;
    g.fruits.push(f);
    g.events.push({ e: 'spawn', id: f.id, initial: !!initial });
    return f;
  }

  function findFruit(g, id) { for (var i = 0; i < g.fruits.length; i++) if (g.fruits[i].id === id) return g.fruits[i]; return null; }

  function removeFruit(g, f) {
    if (f.where === 'board') g.slots[f.i] = null; else g.cool[f.i] = null;
    g.fruits.splice(g.fruits.indexOf(f), 1);
  }

  function update(g, dt) {
    if (g.state !== 'play') return;
    g.t += dt;
    if (g.comboTimer > 0) { g.comboTimer -= dt; if (g.comboTimer <= 0) g.combo = 0; }
    var i;
    for (i = 0; i < g.crates.length; i++) {
      var c = g.crates[i];
      if (!c) continue;
      if (c.leaving > 0) {
        c.leaving -= dt;
        if (c.leaving <= 0) {
          g.crates[i] = g.orders.length ? makeCrate(g, g.orders.shift()) : null;
          if (g.crates[i]) g.events.push({ e: 'crateArrive', crate: i });
        }
        continue;
      }
      if (c.fickle) {
        c.fickleT += dt;
        if (c.fickleT >= c.fickle.period) {
          c.fickleT = 0; c.fickleIdx = (c.fickleIdx + 1) % c.fickle.list.length;
          c.want = c.fickle.list[c.fickleIdx];
          g.events.push({ e: 'fickle', crate: i });
        }
      }
    }
    var sunny = g.def.sunny || [];
    var st = g.def.stageTime || 5;
    for (i = g.fruits.length - 1; i >= 0; i--) {
      var f = g.fruits[i];
      if (f.where === 'cool') continue;
      var before = stageOf(f);
      var mult = (TYPES[f.type] ? TYPES[f.type].speed : 1) * (sunny.indexOf(f.i) >= 0 ? 2 : 1);
      f.r += dt * mult / st;
      var after = stageOf(f);
      if (after !== before && after < 4) g.events.push({ e: 'ripen', id: f.id, stage: after });
      if (f.r >= 4) {
        g.events.push({ e: 'rot', id: f.id, type: f.type, where: f.where, i: f.i });
        removeFruit(g, f);
        g.rot++;
        g.combo = 0; g.comboTimer = 0;
        if (g.rot > g.rotAllowed) { g.state = 'lose'; g.events.push({ e: 'lose' }); return; }
      }
    }
    // fruit nobody can use any more hops off to the juicer (no penalty)
    for (i = g.fruits.length - 1; i >= 0; i--) {
      var sf = g.fruits[i];
      if (!canServe(g, sf)) { g.events.push({ e: 'spare', id: sf.id, type: sf.type, r: sf.r }); removeFruit(g, sf); g.score += 2; }
    }
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      var need = remainingNeed(g);
      var useful = g.fruits.filter(function (f) { return canServe(g, f); }).length;
      var onBoard = g.slots.filter(function (s) { return s; }).length;
      if (useful < need && onBoard < g.slots.length) { spawn(g, false); g.spawnTimer = g.def.spawnEvery || 1.2; }
      else g.spawnTimer = 0.15;
    }
  }

  // Find crate index that would accept fruit now, or -1.
  function matchCrate(g, f) {
    var s = stageOf(f), best = -1, bestFill = -1;
    for (var i = 0; i < g.crates.length; i++) {
      var c = g.crates[i];
      if (!c || c.leaving > 0 || c.filled >= c.size) continue;
      if (c.want !== s || !typeOk(c.type, f.type)) continue;
      if (c.filled > bestFill) { best = i; bestFill = c.filled; }
    }
    return best;
  }

  function deliverTo(g, id, ci) {
    if (g.state !== 'play') return { ok: false };
    var f = findFruit(g, id);
    if (!f) return { ok: false };
    var c = g.crates[ci];
    var s = stageOf(f);
    if (!c || c.leaving > 0 || c.filled >= c.size) return { ok: false, reason: 'busy' };
    if (!typeOk(c.type, f.type)) return { ok: false, reason: 'type' };
    if (c.want !== s) return { ok: false, reason: s < c.want ? 'early' : 'late' };
    var from = { where: f.where, i: f.i };
    removeFruit(g, f);
    c.filled++;
    g.combo = g.comboTimer > 0 ? g.combo + 1 : 1;
    g.comboTimer = 2.2;
    if (g.combo > g.bestCombo) g.bestCombo = g.combo;
    // ripeness bonus: perfect timing near the middle of the stage
    var frac = f.r - s;
    var perfect = frac > 0.3 && frac < 0.7;
    g.score += 10 * g.combo + (perfect ? 5 : 0);
    g.delivered++;
    g.events.push({ e: 'deliver', id: id, crate: ci, combo: g.combo, type: f.type, r: f.r, from: from, perfect: perfect });
    if (c.filled >= c.size) { c.leaving = 0.9; g.events.push({ e: 'crateFull', crate: ci }); }
    if (remainingNeed(g) === 0) { g.state = 'win'; g.stars = Math.max(1, 3 - g.rot); g.events.push({ e: 'win' }); }
    return { ok: true, crate: ci };
  }

  // Tap: auto-send to the matching crate.
  function deliver(g, id) {
    var f = findFruit(g, id);
    if (!f || g.state !== 'play') return { ok: false };
    var ci = matchCrate(g, f);
    if (ci < 0) {
      var s = stageOf(f), minW = 9, typedOnly = true, any = false;
      g.crates.forEach(function (c) { if (c && c.leaving <= 0) { any = true; if (typeOk(c.type, f.type)) { typedOnly = false; if (c.want < minW) minW = c.want; } } });
      var reason = !any ? 'busy' : typedOnly ? 'type' : (s < minW ? 'early' : 'late');
      return { ok: false, reason: reason };
    }
    return deliverTo(g, id, ci);
  }

  // A tap: pack it if it matches; a cooled fruit that matches nothing goes back to the board.
  function tap(g, id) {
    var res = deliver(g, id);
    if (res.ok) return res;
    var f = findFruit(g, id);
    if (f && f.where === 'cool') {
      var empty = g.slots.indexOf(null);
      if (empty >= 0) { moveTo(g, id, empty); return { ok: false, unparked: true, reason: res.reason }; }
    }
    return res;
  }

  function park(g, id, ci) {
    var f = findFruit(g, id);
    if (!f || g.state !== 'play' || ci < 0 || ci >= g.cool.length || g.cool[ci]) return { ok: false };
    if (f.where === 'board') g.slots[f.i] = null; else g.cool[f.i] = null;
    f.where = 'cool'; f.i = ci; g.cool[ci] = f.id;
    g.events.push({ e: 'park', id: id });
    return { ok: true };
  }

  function moveTo(g, id, si) {
    var f = findFruit(g, id);
    if (!f || g.state !== 'play' || si < 0 || si >= g.slots.length || g.slots[si]) return { ok: false };
    if (f.where === 'board') g.slots[f.i] = null; else g.cool[f.i] = null;
    f.where = 'board'; f.i = si; g.slots[si] = f.id;
    g.events.push({ e: 'move', id: id });
    return { ok: true };
  }

  var API = { TYPES: TYPES, STAGE_NAMES: STAGE_NAMES, createGame: createGame, update: update, deliver: deliver, tap: tap,
    deliverTo: deliverTo, park: park, moveTo: moveTo, matchCrate: matchCrate, stageOf: stageOf, findFruit: findFruit,
    remainingNeed: remainingNeed, canServe: canServe, liveOrders: liveOrders };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.RR = API;
})(this);
