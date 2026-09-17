# SkyBrain — Project Guide

A plain-language map of the game: what it is, how the pieces fit together,
and how to change things without breaking other things. Written for someone
picking up this codebase for the first time.

---

## 1. What the game actually is

SkyBrain is a browser game (no build step, just static HTML/CSS/JS files).
You are a "Neuronaut" piloting a small ship around a 2D universe drawn on a
`<canvas>`, using dedicated thruster controls (rotate/forward/reverse/boost/
stop — on-screen for mobile, keyboard for desktop). Flying up to things
(planets, signals, the Core) and tapping them opens short brain-training
mini-games (memory, reaction speed, math, logic, pattern-finding,
odd-one-out, focus). Playing them earns XP, coins, and unlocks — which is
the whole game loop:

```
pilot somewhere → tap it → short mini-game → reward (XP/coins) → pilot somewhere else
```

On top of that loop sit five "modes" (all just different ways of choosing
which mini-game(s) to play next):

| Mode | What picks the challenge | Where in code |
|---|---|---|
| **Daily Challenge** | Same 6 stages for every player, same day, from a date-based seed | `Engine.startDaily` |
| **Planet visit** | The planet's own skill (+ maybe a bonus 2nd game) | `Engine.startPlanet` |
| **Endless Rift** | Random game per level, 3 lives, gets harder forever | `Engine.startEndless` |
| **Deep Sky Survey** | Warp to a real star or a procedural system, 1–2 games | `Engine.startSurvey` |
| **Expedition** | 2–4 waypoints, each a random event/challenge | `Engine.startExpeditionLeg` |
| **Anomaly** (random world event) | 2 context-picked games | `Engine.startAnomaly` |

Everything is deterministic where it needs to be: the Daily Challenge uses
`"SKYBRAIN-" + today's date` as a random seed, so it's identical for every
player on Earth on a given day. Procedural star systems use their own
tier+index as a seed, so the same system always generates the same way.

**No backend.** Progress lives in `localStorage` under the key
`skybrain_save_v1`. No accounts, no server calls except loading the static
files themselves.

---

## 2. The file map

```
index.html              the game shell — HUD, all the sheet/panel markup, <script> tags
blog.html                separate "Knowledge & Blog" page, unrelated to gameplay
manifest.webmanifest      PWA metadata (name, icons, colors)
sw.js                    service worker — caches files for fast reload; bump CACHE
                          version here whenever you deploy changes

css/
  style.css              design system + most UI styling
  universe.css           exploration-layer styling (signal chip, lore card, archive)
  blog.css               blog page styling only

js/
  core/
    core.js              $ / $$ / el() DOM helpers, clamp/lerp/Ease, deterministic RNG
                          (makeRng/xmur3/mulberry32), date helpers, localStorage wrapper
                          (Store), the SAVE object + defaultSave() + mergeDeep + persist(),
                          save export/import (exportSaveCode/importSaveCode)
    audio.js              SFX module — WebAudio sound effects + generative ambient music,
                          0-100 volume sliders layered on top of the sound/music toggles

  data/                  PURE DATA. Add content here, not in systems/engine code.
    content.js            galaxies, the 7 planets, cosmetics, achievements, missions,
                           logic-question library, all procedural number/pattern
                           generators (vision's hue-based rounds always add a non-color
                           `mark` cue), daily & endless composition (endlessStage's
                           pre-INSANE difficulty ramp + RIFT_DANGER_LINES flavor),
                           early-level EARLY_MODIFIERS (rotating score modifiers)
    story.js               STORY_MAIN (8 lore fragments, revealed in order), decode
                           flavor lines, archive entry type labels
    astro.js                REAL_STARS (16 real celestial objects w/ real distances),
                             REGIONS (5 exploration tiers), genSystem() (infinite
                             procedural star systems), warp cost math, MISSION_FRAMES
                             (flavor text shown before a mini-game), CONSEQUENCES
                             (world reactions to a solved challenge)

  games/
    games.js               all 9 mini-games: memory, speed, math, pattern, vision,
                            logic, focus, nav, timing. Each is
                            `Games.xxx = {id, name, icon, instruction, create(stage)}`

  engine/
    selector.js             picks which mini-game to run for "free" contexts
                             (anomalies, surveys, expedition legs) — weighs recency,
                             context fit, player weak-skills, unlock status (boosted
                             for the *next* couple of planets while level < 5)
    engine.js                the session runner: intro card → countdown → play →
                              stage-clear → next stage → results + rewards. Also
                              holds `Prog` (XP/level/unlock logic). `api.timer()`
                              tightens itself in Endless once a stage's `ramp` field
                              is set (the pre-INSANE difficulty ramp)

  universe/
    universe.js              the canvas scene: camera, input (pan/zoom/tap), the
                              ship's flight physics — now split into an autopilot
                              path (`ship.target`, used by flyTo/NAV COMPUTER/
                              Expedition) and the manual thruster path (`ctrl`/
                              `setCtrl`, the on-screen buttons + keyboard) — all
                              drawing (planets, the Core, the Rift, comets, pickups,
                              warp FX, waypoint markers), spawnAnomaly()

  ui/
    ui.js                    HUD updates, all sheet/panel renderers (planet sheet,
                              Star Map, Shipyard, results screen, settings incl.
                              volume sliders + save export/import, shop),
                              the Ads stub (SKYBRAIN_ADS_PRODUCTION dev/prod flag)

  systems/
    systems.js                Missions, Achievements, Discoveries (the "new planet
                               awakened" cinematic queue), Archive, Signals (keeps
                               one live anomaly in the world at all times)
    shipsys.js                 Shipsys — energy economy, solar charging, ship
                                upgrades, Star Map catalog/surveys, world
                                consequences, random travel events (incl.
                                DISCOVERY_EVENTS, tuned more frequent pre-level-5),
                                pickups
    expedition.js                Expedition — chained multi-waypoint mini-adventures

  blog/
    articles.js                  blog content as plain data objects
    blog.js                      tiny hash-router that renders articles.js into blog.html

  boot.js                        wires up all the click handlers, runs the first-run
                                  intro cinematic, the one-time FlightTutorial
                                  onboarding, calls boot() at the bottom

tests/                    zero-dependency smoke tests (not part of the shipped app —
                          index.html and sw.js never reference this folder)
  dom-shim.js              minimal DOM/Canvas2D/WebAudio shim, parses the real
                           index.html so it can never drift from shipped markup
  smoke.js                 `node tests/smoke.js` — loads the real files in their
                           real order and runs the checks; see tests/README.md
```

**Load order matters.** These are plain `<script>` tags (no bundler, no
modules), loaded in this order from `index.html`:

```
core → audio → content → story → astro → games → selector → engine
     → universe → ui → systems → shipsys → expedition → boot
```

If file A uses something defined in file B, file B must load *before* file A
in that list. This is the #1 way to accidentally break the game when adding
new files — always add your `<script>` tag in the right spot.

---

## 3. Where do I add...?

| I want to add… | Edit this |
|---|---|
| A new mini-game | `Games.xxx = {id, name, icon, instruction, create(stage){...}}` in `js/games/games.js`. Give it a matching planet entry in `content.js` if it should have a home world, or leave `planet:null` for a "free-roaming" game like nav/timing. |
| A planet | `PLANETS` array in `js/data/content.js` |
| A story fragment | `STORY_MAIN` in `js/data/story.js` (fragments unlock strictly in array order, one per decoded anomaly) |
| A real star | `REAL_STARS` in `js/data/astro.js` — id, name, distance in light-years, class, hue, one fact. It's automatically placed in the right Star Map tier by its distance. |
| A ship upgrade | `UPGRADES` in `js/systems/shipsys.js`, then hook its effect wherever it matters (e.g. `maxEnergy()`, `accelBonus()`) |
| A world consequence (reward after solving a challenge) | `CONSEQUENCES` in `js/data/astro.js` + its effect inside `applyConsequence()` in `shipsys.js` |
| An achievement / mission / cosmetic | `ACH`, `MISSIONS`, `COSMETICS` in `js/data/content.js` |
| A field in the save file | `defaultSave()` in `js/core/core.js`. Old saves are deep-merged against the new default on load, so adding fields is always safe — never remove or rename existing fields without a migration. |
| A blog article | One object in `js/blog/articles.js` |
| A flight-control (rotate/thrust/boost/stop) tweak | `ctrl`/`setCtrl`/`updateShip` in `js/universe/universe.js`. The manual branch runs whenever no autopilot `ship.target` is set; touching any control cancels an active target. |
| A step in the first-run flight tutorial | `FlightTutorial` (the `STEPS` array) in `js/boot.js` |
| An early-level (1-5) variety beat | `EARLY_MODIFIERS` in `content.js` (planet-visit score modifiers) or `DISCOVERY_EVENTS` in `shipsys.js` (flight toasts) |
| A rewarded-ad network | Implement a provider and assign `Ads.provider` in `js/ui/ui.js`, then flip `SKYBRAIN_ADS_PRODUCTION` to `true` — leave it `false` in dev |

---

## 4. Key concepts worth understanding before you edit

**The SAVE object is the single source of truth.** Every bit of player
progress lives in the global `SAVE` variable (see `defaultSave()` in
`core.js`). Nothing else should hold its own separate copy of persistent
state. Call `persist()` after changing it (it's debounced, so calling it
often is fine).

**Deterministic RNG, not `Math.random()`, for anything that must repeat.**
`makeRng(seed)` returns a seeded random function. The Daily Challenge, every
procedural star system, and every mini-game's question set are generated
this way so the same seed always produces the same result. Plain
`Math.random()` is only used for things that are genuinely allowed to be
different every time (comet spawn timing, sparkle animation, etc.).

**Modules are IIFEs that return a public API.** Look at `Shipsys`, `UI`,
`Universe`, `Engine`, `SFX` — each is `const X = (()=>{ ... return {...}; })();`.
Anything not in the returned object is private to that module. **This is
exactly the pattern that caused the bug we fixed earlier**: a function
defined only as a property of the returned object (e.g. `api.startMusic`)
is NOT visible as a bare name inside the rest of the closure — you must
call it as `api.startMusic()`, not `startMusic()`. Keep this in mind
whenever you add a new method to one of these modules and want to call it
from another function in the same module. `audio.js`'s `applyToggles()`
wraps that call in `try/catch` on purpose (so a future typo there can't
take the rest of Settings down with it), which means the bug no longer
*throws* — it silently no-ops instead. `SFX.musicOn` is a small read-only
getter that exists specifically so this stays observable/testable; see
`tests/smoke.js`'s "startMusic/stopMusic regression" check, which flips
`api.startMusic()` back to a bare call and confirms the check fails.

**Flying is two separate systems, not one.** `Universe`'s ship physics
have an **autopilot** path (`ship.target`, driven by `flyTo()`) and a
**manual** path (`ctrl`, driven by the on-screen thruster buttons and
keyboard, mutated via `setCtrl()`). Only one runs at a time — `updateShip()`
checks `ship.target` first, then falls back to manual input, then to idle
drag. `flyTo()` still exists and is still correct to use for the handful of
explicitly-assisted features (Expedition waypoint travel, the NAV COMPUTER
Mk II suggestion, the intro/"follow the signal" cinematics) — but any
manual control input immediately clears `ship.target`, handing control
back to the player. Don't reach for `flyTo()` to make "the ship go
somewhere" in a new feature unless it's genuinely meant to be an
autopilot-style assist; the default expectation everywhere else is that
the player flies themselves there.

**The mini-game contract.** Every `Games.xxx.create(stage)` returns
`{start()}`. Inside, you get an `api` object from the engine with:
`area` (DOM element to draw into), `rng`, `difficulty`, `prompt(html)`,
`correct(points, opts)`, `wrong(opts)`, `timer(seconds)`, `finish(summary)`,
`cleanup(fn)`. Call `finish()` exactly once when the stage is done, and
register any interval/timeout cleanup via `cleanup()` so nothing keeps
running after the player leaves early.

**Energy is the only "stamina" system.** There are no cooldown timers tied
to the wall clock — flying costs ⚡ energy proportional to thrust, and warp
jumps cost energy based on distance (`warpEnergyCost` in `astro.js`). An
emergency trickle-charge guarantees the player is never permanently stuck.

---

## 5. Things to watch out for when editing

- **Script load order** (see section 2) — new files must be added to
  `index.html`'s `<script>` list *and* to `sw.js`'s `SHELL_FILES` list, in
  a position after everything they depend on.
- **Bump the service worker cache version** (`CACHE` constant at the top of
  `sw.js`) on every deploy, or returning players may keep seeing a stale
  cached build.
- **`mergeDeep` handles save migrations automatically** — but only for
  *added* fields. If you rename or restructure an existing field, write an
  explicit migration in `loadSave()`, or old saves will silently keep the
  old shape mixed with the new default.
- **There is now a smoke-test suite — run it before and after a change.**
  `node tests/smoke.js` (zero npm dependencies, no build step, a few
  seconds) loads the real game files into a small DOM/Canvas/WebAudio
  shim and checks that everything still initializes, settings/sheets/save
  round-trips work, every mini-game starts, Endless Rift's difficulty
  curve is still smooth, Vision's accessibility marker is still present,
  and the flight controls still exist and respond. It is **not** a
  substitute for actually clicking through the affected sheet/mini-game in
  a real browser (this shim doesn't render anything or play real audio) —
  use both. See `tests/README.md`.
- **This is a fully static site** — anything you add must not require a
  build step, bundler, or server-side code, per the project's own design
  goal ("no server, no account, no build step").

---

## 6. Ideas for improvement (not yet done)

The previous round of ideas here — a first-run flight-control tutorial, a
shape/pattern fallback for Vision's hue-based mode, save export/import,
volume sliders, and a smoke test for the `startMusic`/`stopMusic` class of
bug — all shipped; see `SkyBrain_Improvement_Pass.md` and the v2.4 entry in
`README.md` for what actually changed. Ideas for a *next* pass:

- **A joystick/drag option for flight controls**, as an alternative to the
  discrete rotate/thrust buttons, for players who prefer analog steering.
- **Endless Rift-specific mini-game variants** — right now the pre-INSANE
  ramp (levels ~35-50) tightens timers and extends the difficulty ceiling
  centrally (`engine.js`'s `api.timer()`, `content.js`'s `endlessStage()`),
  but doesn't add new per-game mechanics; a couple of high-level-only
  twists (e.g. a second simultaneous prompt) could push past what a pure
  timer/difficulty ramp can do.
- **A real accessibility settings pass beyond color** — larger touch
  targets / text-size option, since the Vision fix only addressed the
  color-vision gap called out in the improvement brief.
- **Cloud save**, if a backend ever gets added — `exportSaveCode`/
  `importSaveCode` already produce/consume a portable, versioned save
  blob, so syncing one to a server would be additive, not a rewrite.
