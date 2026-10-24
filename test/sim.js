// Headless playtest bot: plays every level with a human-like reaction time.
const RR = require('../logic.js');
const LEVELS = require('../levels.js');

function botStep(g) {
  // 1. deliver the most urgent matching fruit
  let best = null;
  for (const f of g.fruits) {
    if (RR.matchCrate(g, f) >= 0 && (!best || f.r > best.r)) best = f;
  }
  if (best) return RR.deliver(g, best.id);
  const live = g.crates.filter(c => c && c.leaving <= 0 && c.filled < c.size);
  const wanted = (f, s) => live.some(c => (!c.type || c.type === f.type) && (c.fickle ? c.fickle.list.includes(s) : c.want === s));
  const laterWanted = (f, s) => live.some(c => (!c.type || c.type === f.type) && (c.fickle ? c.fickle.list.some(w => w > s) : c.want > s));
  const queuedWants = (f, s) => g.orders.some(o => (!o.type || o.type === f.type) && (o.fickle ? o.fickle.list.includes(s) : o.want === s)) ||
    g.crates.some(c => c && c.leaving > 0);
  // 2. park fruit about to pass a colour that's needed but not available right now
  const freeCool = g.cool.indexOf(null);
  if (freeCool >= 0) {
    for (const f of g.fruits) {
      if (f.where !== 'board') continue;
      const s = RR.stageOf(f), frac = f.r - s;
      if (frac > 0.55 && !laterWanted(f, s) && (wanted(f, s) || queuedWants(f, s))) return RR.park(g, f.id, freeCool);
    }
  }
  // 3. sunny spot: move a green fruit that's only needed red
  const sunny = (g.def.sunny || []).filter(i => !g.slots[i]);
  if (sunny.length) {
    for (const f of g.fruits) {
      if (f.where !== 'board') continue;
      const s = RR.stageOf(f);
      if (s <= 1 && !wanted(f, s) && !wanted(f, s + 1) && laterWanted(f, s + 1)) return RR.moveTo(g, f.id, sunny[0]);
    }
  }
  // 4. unpark a cooled fruit whose colour isn't wanted now but a later colour is
  for (const f of g.fruits) {
    if (f.where !== 'cool') continue;
    const s = RR.stageOf(f);
    if (!wanted(f, s) && !queuedWants(f, s) && g.slots.indexOf(null) >= 0) return RR.tap(g, f.id);
  }
  if (g.cool.length && g.cool.every(x => x) && g.slots.every(x => !x)) return RR.tap(g, g.cool[0]);
  return null;
}

function play(def, seed, reaction) {
  const g = RR.createGame(def, seed);
  const dt = 1 / 30;
  let next = reaction;
  while (g.state === 'play' && g.t < 600) {
    RR.update(g, dt);
    g.events.length = 0;
    if (g.t >= next) { botStep(g); next = g.t + reaction * (0.7 + 0.6 * ((g.t * 9301) % 1)); }
  }
  return { state: g.state, rot: g.rot, t: g.t, stars: g.stars || 0 };
}

const reactions = [0.6, 0.9, 1.3];
let allOk = true;
LEVELS.forEach((def, i) => {
  const row = [`L${String(i + 1).padStart(2)} ${def.name.padEnd(17)}`];
  for (const rx of reactions) {
    let wins = 0, stars = 0, time = 0; const N = 40;
    for (let s = 1; s <= N; s++) { const r = play(def, s * 7919 + i, rx); if (r.state === 'win') { wins++; stars += r.stars; time += r.t; } }
    row.push(`rx${rx}: win ${String(Math.round(100 * wins / N)).padStart(3)}% avg★ ${(stars / Math.max(1, wins)).toFixed(1)} ${Math.round(time / Math.max(1, wins))}s`);
    if (rx === 0.6 && wins < N * 0.9) allOk = false;
  }
  console.log(row.join(' | '));
});
console.log(allOk ? 'ALL LEVELS WINNABLE' : 'SOME LEVELS FAILING');
