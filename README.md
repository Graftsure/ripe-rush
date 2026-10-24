# Ripe Rush (playtest build)

One-thumb colour-clock sorting puzzle. Fruit ripens green -> yellow -> orange -> red -> rotten.
Tap a fruit to pack it into the crate that wants its current ripeness. Drag to the Cool Box to pause it,
or onto the sunny spot to speed it up. Rotten fruit costs a star.

Plain HTML/CSS/JS, no build step. `logic.js` (rules), `levels.js` (20 levels), `art.js` (canvas art),
`audio.js` (generated WebAudio), `main.js` (UI). `node test/sim.js` runs a bot through every level.
Hidden stats screen: tap "test build v0.2" on the title 5 times, or open `#debug`.
