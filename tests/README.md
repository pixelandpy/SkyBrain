# SkyBrain smoke tests

A **very lightweight** regression/smoke-test harness for the plain-JS
game in `../js`. No build step, no bundler, no npm dependencies, no test
framework — just Node.

```
node tests/smoke.js
```

That's it. No `npm install` required.

## What it does

SkyBrain ships as classic `<script src="...">` tags sharing one global
scope — there's no bundler and nothing to compile. So the tests don't
mock or reimplement any game logic; they load the **real** files, in the
**real** order (read straight out of `index.html`, so this can't drift
from what actually ships), into a small hand-rolled stand-in for a
browser (`dom-shim.js`): just enough DOM, Canvas 2D and Web Audio for the
game to run under Node.

The DOM itself is parsed from the real `index.html`, so every element id,
class and the settings/sheets markup the tests check against is the
actual shipped markup, not a hand-maintained copy that could go stale.

Canvas 2D contexts and Web Audio nodes are given "auto-stub" objects —
calling any method or reading any property on them just returns another
stub, safely, with no throw. The tests don't care what gets drawn or
played, only that the app's logic runs without errors, so this is enough
to exercise real init/update code paths cheaply.

## What's checked

- Every script listed in `index.html` loads without throwing (this alone
  would catch a plain syntax/reference error in any file).
- The expected global systems exist (`SAVE`, `Engine`, `Universe`, `UI`,
  `SFX`, `Games`, `Shipsys`, etc).
- All 9 mini-games are registered and each one's `create(api).start()`
  runs without throwing, given a minimal fake `api`.
- Settings controls initialize from `SAVE`, and the Sound / Music toggles
  and the two volume sliders actually update `SAVE.set` (and, for volume,
  actually drive `SFX.setToggles()` without throwing across a range of
  values).
- The important sheets (Play, Settings, Awards, Profile, planet, Core,
  Rift, Shipyard, Star Map) open without throwing.
- Save round-trips through `persist()`/`loadSave()`, and through
  `exportSaveCode()`/`importSaveCode()` — including that corrupted/invalid
  import codes are rejected safely (never throw, never partially apply).
- `endlessStage()` produces a valid stage at every level checked, and
  specifically that level 49 is already close to level 50's difficulty —
  i.e. no cliff.
- `genVision()` never produces a hue-only round: whenever hue is the
  distinguishing property, the odd tile also carries a non-color
  accessibility marker.
- `Universe.ctrl` exists with the expected flight-control flags, the
  on-screen thruster buttons actually drive it via real pointer events,
  and pressing a control cancels an active autopilot target.
- `Ads.showRewarded` auto-grants in dev mode, and `SKYBRAIN_ADS_PRODUCTION`
  defaults to `false` in this repo.
- The specific regression this project has hit before: a bare
  `startMusic()`/`stopMusic()` call instead of `api.startMusic()` /
  `api.stopMusic()`. `applyToggles()` deliberately wraps that call in
  `try/catch` so a typo there can't take the rest of Settings down with
  it — which means the bug doesn't throw, it silently no-ops. So this
  test doesn't check for a thrown error; it checks the **outcome**
  (`SFX.musicOn` via a small read-only getter added for exactly this) —
  turning music on while the audio context is unlocked must actually
  start it. Flip `js/core/audio.js`'s `api.startMusic()` call back to a
  bare `startMusic()` and re-run this file to see it fail.

## Files

- `dom-shim.js` — the DOM/Canvas/Audio shim. Exports `createEnvironment(bodyHTML)`.
- `smoke.js` — the actual test file; run this one.

## Adding a check

Everything the app declares at the top level with `const`/`let`
(`SAVE`, `Engine`, `Universe`, ...) is reachable through the small
`__bridge` object built at the top of `smoke.js` — add a name there if a
new test needs it. Plain `function` declarations (`makeRng`, `clamp`,
`pick`, ...) are already reachable that way automatically, since function
declarations attach to the shared global object the same way `var` does.

This harness intentionally does not try to be a full browser. If a future
check needs real DOM behavior this shim doesn't implement, prefer
extending the shim's existing primitives (`Element`, `queryAll`) over
reaching for a dependency — see `SkyBrain_Improvement_Pass.md` §8: "do not
introduce a huge framework just for this."
