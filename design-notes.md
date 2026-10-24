# Ripe Rush — Look & Sound Design Notes (v1, 24 Oct 2026)

Research-backed recommendations for the build. Full write-up with sources is on the
"Ripe Rush: what looks and sounds good" Page (https://cursor.com/canvas/store-fa6935b2-7c1d-4fea-bfa7-ad7f9dd3c6a2/c1bbd528-7b84-4bc3-b655-a2e10f9e8d7e). Everything below can be made with
canvas 2D + generated WebAudio. No licensed assets needed.

## 1. Palette (hex)

Background
- bg-top        #CFEAF6  soft sky blue (top of vertical gradient)
- bg-bottom     #F6E3EE  soft blush pink (bottom of gradient)
- table/ground  #FFF6E5  warm cream
- ink/outline   #2D2A40  deep navy-plum: text, fruit outlines (3px at phone size), faces
- crate         #A9714A  wood; slats/shadow #7E5236
- crate label   #FFF6E5  cream panel showing the wanted ripeness (face + pips)
- button        #7B6CF6  soft violet (cool, never confused with a fruit colour)
- sparkle       #FFFFFF  highlights, sparkles
- reward gold   #FFC83D  stars only
- soft shadow   rgba(45,42,64,0.18), offset y +4px, blur 8px, under fruit and crates

Ripeness (lightness ladder checked under protan/deutan/tritan simulation)
- 1 GREEN  (unripe)   #1FA37A  bluish green (pulls away from red for colour-blind players)
- 2 YELLOW (turning)  #FFE054
- 3 ORANGE (ripe)     #FB8530
- 4 RED    (peak)     #E3434F
- ROTTEN              #4A3A3D  dark plum-brown, plus olive spots #7A7A3A
Colours blend smoothly between stages (lerp) but each stage has a distinct "snap" moment.

## 2. Colour-blind cues (never colour alone) — ~1 in 12 men are colour-blind
Every fruit AND every crate label carries the SAME three cues:
- Pips: 1, 2, 3 or 4 small white dots on the fruit's leaf/top (stage number).
- Face: 1 green = sleepy closed eyes (– –); 2 yellow = small smile;
  3 orange = big open smile; 4 red = sparkly star eyes / "ready!" grin;
  rotten = X eyes, droopy mouth, wavy stink lines, dark spots.
- Shape/size: fruit gets slightly plumper and glossier each stage
  (scale 0.92 -> 0.97 -> 1.0 -> 1.04; highlight grows).
- About to over-ripen (last ~1.5 s): fruit trembles + ring timer pulses (motion cue, not colour).
- Settings: "Colour assist" toggle that prints the stage number big on each fruit.
- Settings: "Reduced motion" toggle (also follow prefers-reduced-motion): no screen shake,
  fewer particles, fades instead of bounces.

## 3. Shapes & layout
- Everything rounded: round fruit, crates with 12-16px corner radius, pill buttons.
- Crates in the bottom 2/3 of the screen (thumb zone), big tap targets (>= 48px).
- Minimal HUD: level, star progress, pause. One popup at a time. No banners/flashing.
- Background stays calm and low-contrast; the fruit is the brightest thing on screen.
- Idle "breathing" bob on fruit: 2-3% scale, 2.5 s sine loop, out of sync per fruit.

## 4. Animation & juice list
Easing: easeOutBack for arrivals/pops, easeOutCubic for moves, easeInOutSine for idle.
Timings: UI 150-250 ms; scoring/arrival 250-400 ms.
1. Tap fruit: squash to (1.12 x, 0.88 y) then spring back, 80-120 ms.
2. Fly to crate: curved arc, 250 ms, easeOutCubic, slight rotation.
3. Land correct: crate bounces (scale 1.08 -> 1.0, easeOutBack), fruit squash on landing,
   8-12 juice droplets in the fruit's colour + 2-3 white sparkles, "+10" floats up & fades.
4. Combo: each consecutive correct drop raises the pitch one pentatonic step (see SFX);
   text grows "Nice! / Juicy! / Fresh! / Perfect!"; tiny 2px shake only at 5+ combo.
5. Ripeness stage change: quick 1.08 scale pop + soft tick; colour lerps over ~300 ms.
6. Wrong crate: gentle side-to-side shake (6 px, 3 wiggles, 250 ms), fruit hops back,
   soft wooden "bonk". No red flashing, no buzzer.
7. Rot: fruit sags, turns plum-brown, little puff of 4-5 grey-green bubbles, soft "bloop".
8. Level complete: confetti of fruit-coloured circles, stars pop in one by one
   (150 ms apart, easeOutBack overshoot), rising chime per star.
9. Optional: 30-50 ms "hit-stop" freeze on a perfect drop; Android vibration 10-15 ms
   (navigator.vibrate) on correct drop, with a toggle.
Particle cap: ~40 on screen. Keep 60 fps on a mid-range Samsung.

## 5. Music (generated WebAudio, never a short loop)
- Tempo 72 BPM. Key C major pentatonic (C D E G A). Chords loop C - Am - F - G (2 bars each).
- Layers: (a) warm pad: two detuned sine/triangle oscillators per chord note through a
  lowpass ~800 Hz, slow 1.5 s attack/release; (b) soft kalimba/marimba melody: random
  walk over the pentatonic scale (mostly steps of 1-2 notes), 40% of beats left empty;
  (c) quiet root bass note once per bar; (d) optional "orchard" ambience: pink-ish noise
  bandpassed ~500 Hz at very low volume as a breeze + an occasional synthesised bird chirp
  (fast sine sweep 2.5 -> 4 kHz, 80 ms, very quiet, every 8-20 s at random).
- Generative = never repeats exactly. After ~3 minutes, fade music out for ~1 minute of
  ambience only, then fade back in (silence is relaxing; short loops are the #1 annoyance).
- Master lowpass ~5 kHz on music to stop harsh highs. Small reverb: ConvolverNode with a
  generated 2 s decaying-noise impulse, wet ~25%.
- Mix: music bus ~0.25, SFX bus ~0.6, master ~0.8. Compressor (DynamicsCompressorNode) on master.

Kalimba note recipe (additive sine):
  partials [ratio, amp, decay s] = [1, 0.5, 1.2], [3.82, 0.15, 0.6], [9.1, 0.04, 0.25]
  attack 5 ms linear, then exponentialRamp to 0.0001 over decay.
Marimba alt: [1, 0.6, 0.8], [4.0, 0.12, 0.25], [10.0, 0.03, 0.08].

## 6. SFX recipes (all generated)
- Pick up: sine pluck 660 Hz + octave at 0.2 amp, 5 ms attack, 120 ms decay.
- Correct drop: kalimba note from the scale C5 D5 E5 G5 A5 C6 D6 E6 — step up one per combo,
  reset after a miss or after the top note; layered with a "juicy squelch" = 60 ms white-noise
  burst through bandpass 1.2 kHz, Q 2, quiet.
- Wrong crate: "bonk" = sine 180 Hz gliding to 120 Hz over 150 ms, quiet. No buzzer.
- Stage change tick: triangle 1.2 kHz, 30 ms, very quiet.
- Rot: "bloop" = sine 300 -> 140 Hz over 250 ms through lowpass sweeping 900 -> 200 Hz.
- Star: rising 3-note chime (E6, G6, C7 at low volume, kalimba recipe).
- Level complete: arpeggio C5 E5 G5 C6 (90 ms apart) + soft shimmer (high sine partials, quiet).
- Button: wooden tap = 20 ms noise through bandpass 1.8 kHz + sine 800 Hz, 40 ms.
- Every repeated SFX: random pitch +/-3% (about half a semitone) and volume +/-10% so it
  never sounds robotic. Limit to ~8 voices at once.

## 7. Volume & settings
- Separate MUSIC and SOUNDS toggles (plus vibration) on pause screen and first screen; remember
  choices (localStorage).
- Audio can only start after the first tap (browser rule) — make the "Play" tap start it.
- Pause/mute all audio when the app goes to background (visibilitychange). Never make
  sound when the player has muted.
- Many mobile players play muted, so every sound cue also has a visual cue.

## 8. Free CC0 extras (only if wanted later; generated audio is the default)
- Kenney "Interface Sounds" and "Music Jingles" — CC0 (no credit required): https://kenney.nl/assets?category=Audio
- Freesound.org with the "Creative Commons 0" licence filter — check each file's licence.
- OpenGameArt.org filtered to CC0. Avoid CC-BY unless we add credits.

## 9. Avoid
- Harsh saturated neon everywhere, pure black backgrounds, busy patterned backgrounds.
- Sharp/spiky shapes, tiny text, multiple popups, flashing.
- Short music loops, shrill high-pitched sounds, loud fail sounds, buzzers.
- Ads, energy/lives timers (the top complaints in puzzle game reviews).
