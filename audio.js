// Ripe Rush generated audio: music + sfx, all WebAudio, no samples.
(function (root) {
  'use strict';
  var A = { ctx: null, musicOn: true, sfxOn: true, started: false, voices: 0 };
  var master, comp, musicBus, musicGain, sfxBus, noiseBuf, ambGain;
  var BPM = 72, BEAT = 60 / BPM;
  var PENTA = [0, 2, 4, 7, 9]; // C D E G A
  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function jitter(x, amt) { return x * (1 + (Math.random() * 2 - 1) * amt); }

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    var ctx = A.ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8;
    comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    // music chain: bus -> lowpass 5k -> dry + reverb -> master
    musicBus = ctx.createGain(); musicBus.gain.value = 0.25;
    musicGain = ctx.createGain(); musicGain.gain.value = A.musicOn ? 1 : 0;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
    musicBus.connect(lp); lp.connect(musicGain);
    var verb = ctx.createConvolver(); verb.buffer = makeImpulse(ctx, 2);
    var wet = ctx.createGain(); wet.gain.value = 0.25;
    musicGain.connect(master); musicGain.connect(verb); verb.connect(wet); wet.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = A.sfxOn ? 0.6 : 0;
    sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0), last = 0;
    for (var i = 0; i < d.length; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.5 + last * 3; }
    startAmbience();
    startMusic();
  };
  function makeImpulse(ctx, secs) {
    var len = ctx.sampleRate * secs, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var ch = b.getChannelData(c); for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  A.setMusic = function (on) { A.musicOn = on; if (musicGain) musicGain.gain.setTargetAtTime(on ? 1 : 0, A.ctx.currentTime, 0.2); };
  A.setSfx = function (on) { A.sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.6 : 0, A.ctx.currentTime, 0.05); };
  A.suspend = function () { if (A.ctx && A.ctx.state === 'running') A.ctx.suspend(); };
  A.resume = function () { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };

  // ---- instruments ----
  function kalimba(dest, hz, t, vol, partials) {
    var ctx = A.ctx;
    partials = partials || [[1, 0.5, 1.2], [3.82, 0.15, 0.6], [9.1, 0.04, 0.25]];
    partials.forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz * p[0];
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p[1] * vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + p[2] + 0.05);
    });
  }
  function noiseBurst(dest, t, dur, freq, q, vol) {
    var ctx = A.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.playbackRate.value = 1; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  function tone(dest, type, f0, f1, t, dur, vol, attack) {
    var ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function voice(fn) {
    if (!A.ctx || !A.sfxOn || A.ctx.state !== 'running') return;
    if (A.voices >= 8) return;
    A.voices++; setTimeout(function () { A.voices--; }, 300);
    fn(A.ctx.currentTime + 0.005, jitter(1, 0.03), jitter(1, 0.1));
  }

  // ---- SFX ----
  var DROP_SCALE = [72, 74, 76, 79, 81, 84, 86, 88]; // C5 D5 E5 G5 A5 C6 D6 E6
  A.pick = function () { voice(function (t, p, v) { tone(sfxBus, 'sine', 660 * p, 660 * p, t, 0.12, 0.25 * v); tone(sfxBus, 'sine', 1320 * p, 1320 * p, t, 0.1, 0.05 * v); }); };
  A.drop = function (combo) {
    voice(function (t, p, v) {
      var n = DROP_SCALE[Math.min(DROP_SCALE.length - 1, Math.max(0, combo - 1))];
      kalimba(sfxBus, midiHz(n) * p, t, 0.9 * v);
      noiseBurst(sfxBus, t, 0.06, 1200, 2, 0.25 * v);
    });
  };
  A.bonk = function () { voice(function (t, p, v) { tone(sfxBus, 'sine', 180 * p, 120 * p, t, 0.15, 0.45 * v); noiseBurst(sfxBus, t, 0.03, 900, 3, 0.15 * v); }); };
  A.tick = function () { voice(function (t, p, v) { tone(sfxBus, 'triangle', 1200 * p, 1200 * p, t, 0.03, 0.06 * v); }); };
  A.rot = function () {
    voice(function (t, p, v) {
      var ctx = A.ctx, f = ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(200, t + 0.25); f.connect(sfxBus);
      tone(f, 'sine', 300 * p, 140 * p, t, 0.28, 0.5 * v);
    });
  };
  A.star = function (i) { voice(function (t, p, v) { kalimba(sfxBus, midiHz([88, 91, 96][i % 3]), t, 0.5 * v); }); };
  A.crate = function () { voice(function (t, p, v) { [72, 76, 79].forEach(function (n, i) { kalimba(sfxBus, midiHz(n + 12), t + i * 0.06, 0.35 * v); }); }); };
  A.win = function () {
    voice(function (t, p, v) {
      [72, 76, 79, 84].forEach(function (n, i) { kalimba(sfxBus, midiHz(n), t + i * 0.09, 0.7); });
      [96, 100, 103].forEach(function (n, i) { tone(sfxBus, 'sine', midiHz(n), midiHz(n), t + 0.4 + i * 0.05, 0.8, 0.03); });
    });
  };
  A.lose = function () { voice(function (t) { [76, 72, 67].forEach(function (n, i) { kalimba(sfxBus, midiHz(n), t + i * 0.18, 0.4, [[1, 0.6, 0.8], [4, 0.12, 0.25], [10, 0.03, 0.08]]); }); }); };
  A.button = function () { voice(function (t, p, v) { noiseBurst(sfxBus, t, 0.02, 1800, 2, 0.3 * v); tone(sfxBus, 'sine', 800 * p, 800 * p, t, 0.04, 0.15 * v); }); };
  A.spare = function () { voice(function (t, p, v) { tone(sfxBus, 'sine', 500 * p, 900 * p, t, 0.12, 0.12 * v); }); };

  // ---- generative music ----
  var CHORDS = [[48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]]]; // C Am F G
  var nextBeat = 0, beatIdx = 0, melodyNote = 2, musicStart = 0, timer = null;
  function startMusic() {
    var ctx = A.ctx; nextBeat = ctx.currentTime + 0.3; musicStart = ctx.currentTime; beatIdx = 0;
    timer = setInterval(schedule, 120);
  }
  function schedule() {
    var ctx = A.ctx; if (!ctx || ctx.state !== 'running') return;
    while (nextBeat < ctx.currentTime + 0.4) { playBeat(nextBeat, beatIdx); nextBeat += BEAT; beatIdx++; }
  }
  function phaseLevel(t) {
    // ~3 min music, ~1 min of ambience only, repeat
    var cyc = (t - musicStart) % 240;
    if (cyc < 4) return cyc / 4;
    if (cyc < 176) return 1;
    if (cyc < 180) return (180 - cyc) / 4;
    return 0;
  }
  function playBeat(t, i) {
    var lvl = phaseLevel(t);
    if (lvl <= 0.01) return;
    var bar = Math.floor(i / 4), chord = CHORDS[Math.floor(bar / 2) % 4];
    if (i % 8 === 0) pad(chord[1], t, BEAT * 8, lvl);
    if (i % 4 === 0) bass(chord[0], t, lvl);
    if (Math.random() > 0.4) {
      var step = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      melodyNote = Math.max(0, Math.min(9, melodyNote + step));
      var oct = Math.floor(melodyNote / 5), m = 72 + oct * 12 + PENTA[melodyNote % 5] - 12;
      kalimba(musicBus, midiHz(m), t, 0.55 * lvl);
      if (Math.random() < 0.15) { var m2 = m + PENTA[(melodyNote + 1) % 5] - PENTA[melodyNote % 5]; kalimba(musicBus, midiHz(m2 > m ? m2 : m + 2), t + BEAT / 2, 0.35 * lvl); }
    }
  }
  function pad(notes, t, dur, lvl) {
    var ctx = A.ctx, f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800; f.connect(musicBus);
    notes.forEach(function (n) {
      [-6, 6].forEach(function (det, k) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = k ? 'triangle' : 'sine'; o.frequency.value = midiHz(n); o.detune.value = det;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06 * lvl, t + 1.5);
        g.gain.setValueAtTime(0.06 * lvl, t + dur - 0.5); g.gain.linearRampToValueAtTime(0, t + dur + 1.0);
        o.connect(g); g.connect(f); o.start(t); o.stop(t + dur + 1.1);
      });
    });
  }
  function bass(n, t, lvl) { tone(musicBus, 'sine', midiHz(n), midiHz(n), t, BEAT * 3, 0.18 * lvl, 0.03); }
  function startAmbience() {
    var ctx = A.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter();
    ambGain = ctx.createGain(); ambGain.gain.value = 0.035;
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7;
    s.connect(f); f.connect(ambGain); ambGain.connect(musicGain); s.start();
    (function chirp() {
      setTimeout(function () {
        if (ctx.state === 'running') {
          var t = ctx.currentTime;
          for (var k = 0; k < 1 + Math.floor(Math.random() * 3); k++) tone(musicGain, 'sine', 2500, 4000, t + k * 0.12, 0.08, 0.02);
        }
        chirp();
      }, 8000 + Math.random() * 12000);
    })();
  }

  root.RRAudio = A;
})(this);
