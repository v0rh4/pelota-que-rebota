# AGENTS.md

## What this is

A single-page [p5.js](https://p5js.org) sketch ("pelota que rebota" = bouncing ball). Two files: `index.html` and `sketch.js`. No build system, package manager, tests, or CI.

## Running

- No dev server or build step. Open `index.html` directly in a browser, or serve the directory with any static server.
- `p5@2.3.4` and `p5.sound@0.4.1` are loaded from CDNs in `index.html` (not via npm). `sketch.js` relies on those globals.

## Conventions / gotchas

- `sketch.js` uses p5 **global mode**: `setup()` and `draw()` are top-level functions, not wrapped in an instance. Script order matters — the CDN `p5.js` `<script>` tag must come first, then `p5.sound.js`, then `sketch.js`.
- p5.sound is a separate library from p5 (here `p5.sound@0.4.1`, built on Tone.js). Its oscillator/envelope API differs from the old v1 p5.sound: use `new p5.Oscillator(type)`, `new p5.Envelope()`, and `env.play()` (not `osc.amp(env)`).
- `p5.sound@0.4.1`'s published `dist` build is missing the `AudioParam.cancelAndHoldAtTime` polyfill, so `osc.amp()`/`osc.freq()` crash on Firefox (and some browsers) with "cancelAndHoldAtTime is not a function". `sketch.js` defines this polyfill at the top — don't remove it.
- Browsers block audio until a user gesture. Start the oscillator inside `mousePressed()` (not `setup()`) and call `userStartAudio()` there; starting it in `setup()` leaves the sound silent even after clicking. Don't remove that.
- No `package.json`, so there is nothing to `npm install` or `npm test`. Don't add a build step unless asked.
- The sketch uses `windowWidth`/`windowHeight`; `windowResized()` resizes the canvas and clamps the ball back inside bounds.
- `setup()` calls `colorMode(HSB, 360, 100, 100)`, so `background()`/`fill()` take HSB values (`background(0,0,0)` is black, `fill(0,0,100)` is white). The ball is drawn as a Halloween shape (skull/pumpkin/ghost, changed on each bounce) scaled and squished by `radioX`/`radioY` (Perlin noise), and it rolls via `angulo += velX * 0.02`.
- Particles are Halloween shapes (skull/skeleton/ghost/pumpkin/spider) drawn procedurally in `sketch.js`, emitted from the mouse position with a 10-second life. They fade via `drawingContext.globalAlpha` (p5's `fill()` alpha does not reliably fade), and each wraps its draw in `push()`/`pop()` so globalAlpha is restored. All shape colors are written in HSB (the sketch runs in `colorMode(HSB)`).
- The bounce sound is a single kick-like thump (`p5.Oscillator('sine')` + `p5.Envelope`) routed through `new p5.Delay(0.18, 0.28)` for a subtle echo.
- Full-screen layout lives in `index.html` CSS: `html, body { margin: 0; overflow: hidden }` + `canvas { display: block }` remove the white page margin. The `<h1>` is an absolute overlay (`pointer-events: none`, so it doesn't block the ball's hover) with a Press Start 2P pixel font and an animated RGB gradient, set to `white-space: nowrap` so it stays on one line.
