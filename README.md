# 🧠✦ SkyBrain v2.4 — “Deep Sky”

> **v2.4 changelog — Flight & Access pass**: tap-to-fly is gone as the primary
> control — the ship is now flown with dedicated thruster controls (rotate,
> forward, reverse/brake, BOOST, full STOP) on-screen for mobile and
> arrows/WASD + Shift + X on desktop, with the exact same thrust/inertia/
> retro-brake/boost/energy model as before. A short one-time interactive
> flight-training onboarding teaches the controls (replayable from Settings).
> Levels 1–5 get noticeably more variety before Vision unlocks (more mixed
> two-game visits, small discovery events, rotating score modifiers, rare
> "taste of what's ahead" encounters). DEEP SCAN's hue-based rounds now always
> carry a non-color cue too, so the game no longer depends on color vision.
> Sound Effects and Music each get a 0–100 volume slider on top of their
> mute toggles. Save data can be exported to a text code and re-imported
> (with corruption/validity checks and a confirm-before-replace step).
> Endless Rift's difficulty now ramps smoothly from level ~35 into level 50's
> INSANE tier instead of plateauing and then jumping. The Ads dev/prod split
> is now explicit and fails safe. Added a zero-dependency smoke-test harness
> (`tests/`, `node tests/smoke.js`, no npm install). See
> `SkyBrain_Improvement_Pass.md` for the full brief this pass implements.
>
> **v2.3 changelog** — full bug-audit pass: 15 bugs fixed (session coins now credited,
> SFX `unlock`/`fanfare` split, memory-game reskin, expedition course watchdog,
> warp input lock, travel HUD suppressed in sessions, smooth v-max decay & capped
> retro braking, mission midnight-rollover guard, endless pool now all 9 games,
> unaffordable jumps greyed in Star Map, dead code removed, SW cache bumped).
> Plus: the ship got a full sprite redesign (delta wings, nacelles, canopy, nav
> lights, layered exhaust), the travel HUD now shows destination name, route %,
> and live ⚡/s burn rate, and **NAV COMPUTER Mk II** now truly auto-plots a course
> to the nearest signal/pickup.

**A living browser universe powered by your mind.**

You are a Neuronaut. Pilot a physically-simulated ship through a hand-crafted
galaxy cluster, follow strange signals, decode anomalies, warp to real stars
light-years away, chart endless procedural systems, upgrade your ship, awaken
sleeping worlds, answer the Core's daily broadcast, dive into the Endless
Rift — and slowly uncover the story of who built this universe and why your
mind keeps it lit.

No server. No account. No build step. Just static files.

---

## ▶ Run it

```bash
# any static server works, e.g.:
python3 -m http.server 8080
# then visit http://localhost:8080
```

Deploy by uploading the folder as-is to any static host (GitHub Pages, Netlify,
Cloudflare Pages, …). The PWA (manifest + service worker) activates automatically
when served over http(s). Best experienced on a phone.

> Note: sandboxed in-chat previews block `localStorage`, so progress saving is
> limited there — host the folder (or open it locally) for the full experience.

---

## 🎮 The gameplay loop (one session ≈ 5–10 minutes)

```
launch
   → fly (thrust-based physics: burn, coast on inertia, retro-brake, BOOST)
   → random encounter (comet, energy crystal, cargo pod, distress burst,
                       passing craft… or an extremely rare wormhole)
   → interactive challenge (framed as a mission: repair the relay,
                            dodge the debris, open the ancient gate)
   → discovery (story fragment · surveyed system · salvage)
   → world consequence (energy cells, free warp jump, shield, full repair…)
   → reward (XP / coins / level-ups / unlocks)
   → new destination (deeper region · farther star · next signal)
```

Brain challenges are **diegetic**: you never "take a memory test" — you re-link
drifting relay satellites, dodge igniting debris, feed the reactor exact
numbers, and prove reasoning to ancient gates. **Every solved encounter changes
the world** — a consequence system grants energy, wormholes, shields, sensor
boosts or repairs, so solving always *does* something.

### The pillars

| Mode | What it is |
|---|---|
| **Free exploration** | Pilot the ship with dedicated thruster controls — rotate, forward thrust, reverse/brake, BOOST, full STOP (on-screen for mobile, arrows/WASD + Shift + X on desktop) — chase the ever-present anomaly, harvest pickups, decode signals, collect the 8-fragment main story. |
| **Deep Sky Survey** | Open the 🗺️ Star Map, spend ⚡ energy on warp jumps to **real stars** (accurate LY distances + facts) and endless **procedural systems** across 5 regions: Near Stars → Deep Space → Far Reaches → Galactic Core → Unknown Space. |
| **Daily Challenge** | 6 stages composed deterministically from the date — the same for every player on Earth. One official run/day, streaks + shields. |
| **Endless Rift** | Seeded endless run, 3 lives, difficulty ramps smoothly from level ~35 into the INSANE tier at level 50+ — no cliff, just an escalating final stretch. |
| **🚀 Expedition** | A chained mini-adventure: 2–4 procedurally plotted waypoints, each hiding a random event (unknown contact ⚠️ · debris field 📦 · faint signal 📡 · strange reading 🌌). Challenge legs run dynamically selected games; discovery legs pay out instantly. Finish the whole chain for a completion bonus. ~5–10 min. |

Plus: ⚡ energy economy (solar charging near the Core, crystals, cells, refunds),
🛠️ Shipyard with **5 gameplay-changing upgrade lines** (Engine, Energy Core, Deep
Scanner, 🧭 Nav Computer, 4-mark Warp Drive), Cosmic Database (stars/planets/
signals/anomalies/wormholes/rare counts), 7 trainable planet worlds **plus two
free-roaming challenge types (Waypoint Run 🧭 · Orbital Sync ⏱️) that only appear
out in the void**, an Explorer Roadmap showing exactly what your next levels
unlock, cosmetics shop (fully earnable, no purchases), 16 achievements, 3 seeded
daily missions, generative ambient music, a one-time interactive flight-training
onboarding (replayable from Settings), and save export/import as a portable
text code.

### Flight controls (manual piloting is the primary control)

- **Mobile:** on-screen thruster buttons — ◀/▶ rotate, ▲ forward thrust,
  ▼ reverse/brake, ⚡ BOOST (hold together with ▲), ■ full STOP (strong
  braking regardless of heading).
- **Desktop:** arrows or WASD to rotate/thrust, Shift to boost, X or Space
  to STOP. +/− still zoom, Escape still backs out of a focused view.
- Tapping a planet/Core/Rift/anomaly you're already near still interacts
  immediately; tapping one that's far away sets a waypoint marker (a
  dashed guide line, nothing more) — you still have to fly there yourself.
  `Universe.flyTo()` (autopilot) still exists, but only powers a few
  explicitly-assisted features that were never "tap anywhere to fly" in
  spirit: the 🧭 NAV COMPUTER Mk II suggestion, 🚀 Expedition waypoint
  travel, and the one-off intro/"follow the signal" cinematics. Touching
  any manual control instantly cancels an active autopilot target and
  hands control back to the player.
- First flight (and every existing save's first load after this update,
  since tap-to-fly no longer exists) gets a short, interactive, one-time
  flight-training walkthrough — replayable any time from Settings.

### Energy & travel (never a timer — tied to actual flight)

- Every engine burn drains ⚡ proportional to thrust; boost burns double.
- Warp jump cost scales with distance: `8 + 5.2·ln(1+LY)`, reduced by upgrades.
- Recharge: solar-charge near the ✦ Core, harvest 🔹 crystals, salvage 📦 pods,
  world consequences, or buy cells (60 🪙 → 50 ⚡).
- An emergency trickle (up to 12 ⚡) guarantees you are never stranded.
- Real objects use real data — Proxima Centauri 4.246 LY, Sirius 8.66 LY,
  Sagittarius A* 26,000 LY, Andromeda 2.54 M LY — each `⚗ REAL ASTRONOMY`
  tagged; procedural systems are always labelled `✦ SKYBRAIN FICTION`.

---

## 🗂 File structure

```
/
├── index.html                  app shell: HUD, sheets, overlays + script tags (no logic)
├── blog.html                   Knowledge & Blog page (separate from the game)
├── README.md
├── manifest.webmanifest        PWA manifest
├── sw.js                       versioned service worker (stale-while-revalidate shell)
│
├── css/
│   ├── style.css               design system + game/UI styles
│   ├── universe.css            exploration-layer styles (signal chip, lore card, archive)
│   └── blog.css                blog styles (independent of the game)
│
├── js/
│   ├── core/
│   │   ├── core.js             utilities · deterministic RNG · dates · safe storage · SAVE schema
│   │   └── audio.js            WebAudio synth SFX + generative ambient music (no assets) ·
│   │                           separate 0–100 SFX/music volume sliders on top of the mute toggles
│   │
│   ├── data/                   ALL content is data-driven — add content here, not in systems
│   │   ├── content.js          galaxies · planets · cosmetics · achievements · missions ·
│   │   │                       logic library · procedural generators (math/pattern/vision,
│   │   │                       vision's hue-based rounds always paired with a non-color
│   │   │                       cue) · daily & endless composition (smooth pre-INSANE ramp,
│   │   │                       `RIFT_DANGER_LINES`) · early-level `EARLY_MODIFIERS`
│   │   ├── story.js            STORY_MAIN fragments · decode flavor lines · archive kinds
│   │   └── astro.js            REAL_STARS (accurate astronomy) · REGIONS (5 tiers) ·
│   │                           genSystem() deterministic procedural systems · warp math ·
│   │                           MISSION_FRAMES · CONSEQUENCES
│   │
│   ├── games/
│   │   └── games.js            9 diegetic mini-games: RELAY UPLINK 🛰️ · DEBRIS DODGE ☄️ ·
│   │                           TRAJECTORY CALC 🧮 · STRUCTURE REPAIR 🧩 · DEEP SCAN 🔭 ·
│   │                           ANCIENT GATE 🗿 · SIGNAL LOCK 📡 · WAYPOINT RUN 🧭 · ORBITAL SYNC ⏱️
│   │
│   ├── engine/
│   │   ├── selector.js         smart challenge selection (recency/mastery/context aware)
│   │   └── engine.js           session flow · scoring · combos · lives · rewards · unlocks ·
│   │                           anomaly & SURVEY sessions · mission framing
│   │
│   ├── universe/
│   │   └── universe.js         canvas scene: starfields, nebulae, planets, Core, Rift,
│   │                           THRUST-PHYSICS SPACECRAFT (inertia, retro-brake, boost,
│   │                           hull shake, bank, speed-lines) flown via on-screen/keyboard
│   │                           thruster controls (`ctrl`/`setCtrl`), ANOMALIES, comets,
│   │                           pickups, WARP TUNNEL FX, camera, waypoint markers, cinematics
│   │
│   ├── ui/
│   │   └── ui.js               HUD (⚡ pill, travel chip) · sheets (planet/core/rift/
│   │                           anomaly/STAR MAP/SHIPYARD/SETTINGS) · results · lore reveal ·
│   │                           archive rendering · game shell · save export/import UI ·
│   │                           Ads dev/prod-safe stub
│   │
│   ├── systems/
│   │   ├── systems.js          Missions · Achievements · Discoveries · Cosmic Archive ·
│   │   │                       Signals (living anomaly event loop)
│   │   ├── shipsys.js          SHIP SYSTEMS: energy economy · flight drain · solar
│   │   │                       charging · upgrades · surveys/warp · random travel
│   │   │                       events (comets/crystals/signals/small discoveries,
│   │   │                       more frequent before level 5) · pickups · world
│   │   │                       consequences · Cosmic Database
│   │   └── expedition.js       EXPEDITIONS: chained multi-waypoint mini-adventures
│   │                           (travel → event → challenge → … → completion bonus)
│   │
│   ├── blog/
│   │   ├── articles.js         blog content as data (add an article = add one object)
│   │   └── blog.js             tiny hash-routed renderer for blog.html
│   │
│   └── boot.js                 first-run intro cinematic · flight-training onboarding
│                                (FlightTutorial) · wiring · boot · SW registration
│
├── tests/                      zero-dependency smoke tests — `node tests/smoke.js`
│   ├── dom-shim.js             minimal DOM/Canvas2D/WebAudio shim (parses the real index.html)
│   ├── smoke.js                the actual checks (see tests/README.md)
│   └── README.md
│
└── icons/                      PWA icons (192/512/maskable/apple-touch)
```

---

## 🧭 Where do I add…?

| Task | Where |
|---|---|
| **A new mini-game** | Add `Games.xxx={id,name,icon,instruction,create(stage){…}}` in `js/games/games.js` (or a new file in `js/games/` + a `<script>` tag). Add a matching planet entry in `js/data/content.js` and the engine, daily composer, endless mode and selector pick it up automatically. |
| **A planet** | `PLANETS` array in `js/data/content.js` — visuals (colors, rings, moons, orbit) and identity (tag, description, unlock level) are pure data. |
| **Story** | `STORY_MAIN` in `js/data/story.js`. Fragments are revealed in order, one per decoded anomaly, and become re-readable in the Archive. |
| **An anomaly type** | `kinds` array in `spawnAnomaly()` (`js/universe/universe.js`) + optionally a context bias in `Selector.CONTEXT` (`js/engine/selector.js`). |
| **A real star** | `REAL_STARS` in `js/data/astro.js` — id, name, distance in LY, class, hue, fact. It appears automatically in the matching Star-Map tier. |
| **A region tier** | `REGIONS` in `js/data/astro.js` (LY range, level gate, warp-mark gate). |
| **A ship upgrade** | `UPGRADES` in `js/systems/shipsys.js` + hook its effect where relevant. |
| **A world consequence** | `CONSEQUENCES` in `js/data/astro.js` + its effect in `applyConsequence()` (`js/systems/shipsys.js`). |
| **A mission framing line** | `MISSION_FRAMES` in `js/data/astro.js`. |
| **A random travel event** | `eventTick()` in `js/systems/shipsys.js`. |
| **A blog article** | One object in `js/blog/articles.js`. `body` supports `## headers`, `- lists` and paragraphs. |
| **An achievement / mission / cosmetic** | `ACH`, `MISSIONS`, `COSMETICS` in `js/data/content.js`. |
| **Save data** | `defaultSave()` in `js/core/core.js`. Old saves deep-merge against it, so adding fields is safe. |
| **Challenge selection logic** | `js/engine/selector.js`. |
| **The spacecraft / flight controls** | `ship`/`ctrl` objects + `updateShip/drawShip/flyTo/setCtrl` in `js/universe/universe.js`. `ship.target` (autopilot) and `ctrl` (manual thrust) are two separate drive paths — any manual input cancels an active `ship.target`. On-screen buttons are `#ctrlLeft/#ctrlRight/#ctrlFwd/#ctrlRev/#ctrlBoost/#ctrlStop` in `index.html`; keyboard mapping is `PILOT_KEYS` in `universe.js`. |
| **The flight-training onboarding** | `FlightTutorial` in `js/boot.js` — each step is `{text, hl (buttons to highlight), done()}`; add/reorder steps there. |
| **An early-level (1–5) variety beat** | `EARLY_MODIFIERS` in `js/data/content.js` (rotating score-modifier flavor for planet visits) or `DISCOVERY_EVENTS` in `js/systems/shipsys.js` (toast-only small discoveries during flight). |
| **Rendering** | `js/universe/universe.js` (world) and `css/style.css`/`css/universe.css` (DOM/UI). |
| **Rewarded-ad integration** | `Ads.provider` in `js/ui/ui.js` — implement `{showRewarded(label)->Promise<bool>, showInterstitial(reason)}`, assign it, then flip `SKYBRAIN_ADS_PRODUCTION` to `true`. Leaving it `false` with no provider is the intended dev default. |
| **A smoke test** | `tests/smoke.js` — see `tests/README.md`. |

---

## 🧠 How challenge selection works (not `random.choice`)

`Selector.pickGame(rng, context)` weighs every game by:

- **recency** — the last 4 played games are penalized (×0.05 … ×0.6) so encounters never repeat back-to-back;
- **context** — each anomaly kind biases fitting skills (a *Frozen Echo* leans memory/vision, a *Derelict Probe* leans logic/timing);
- **mastery** — skills the player performs worst at surface slightly more often;
- **unlocks** — games of still-locked planets appear rarely, as a taste of what's ahead; below level 5 (before Vision unlocks), the *next* couple of planets specifically surface noticeably more often, so early play sees real "introductory versions" of upcoming mechanics rather than only the 2–3 already-open activities;
- **free-roamers** — 🧭 Waypoint Run (navigation) and ⏱️ Orbital Sync (timing) have no home planet and join every selection pool.

Difficulty is progression-aware: brain level + per-skill training history, clamped 1–10.
Even planet visits are dynamic: ~45 % of the time the selector chains a second,
different challenge onto the mission, so no two visits play the same.

## 🌌 A five-year sky (content scale)

The Star Map is **genuinely infinite**: for every system you survey, a new one
surfaces — there are always uncharted systems ahead, forever. The generator
`genSystem(tier, idx)` is unbounded and deterministic (the same seed always
yields the same star, class, planets and quirks — verified out to index
1,000,000), and each system carries 1–9 procedural planets, so the first ten
thousand systems of a single tier alone contain ~50,000 planets. The Star Map
sheet stays compact at any scale: older surveyed systems collapse into a
counter and only the next 12 jumps (the frontier) are listed. Combined
with 16 real celestial objects, 5 progressively-gated regions, 5 upgrade lines,
rare ★ systems, random travel events with common/uncommon/extremely-rare tiers,
the 8-fragment story, daily challenges (a new one every day forever), and the
endless Rift — there is always something new to chase without grindy checklists.

## 🔧 Design decisions

- **Determinism:** daily seed = `"SKYBRAIN-" + local date`; endless & anomaly encounters get their own seeds. Date #1 = 2026-01-01.
- **Scoring:** base × difficulty × combo multiplier × any active session `scoreMult` (e.g. an early-level rotating modifier) — accuracy always dominates.
- **Privacy:** everything lives in `localStorage` (`skybrain_save_v1`). No accounts, no tracking. The score pipeline is centralized in the engine so a backend/leaderboard can be added later without touching mini-games. A save can be exported to a versioned, checksummed text code (`exportSaveCode`/`importSaveCode` in `js/core/core.js`) and re-imported elsewhere — still no server, just a portable backup the player controls.
- **PWA:** the shell is cached with a **versioned** cache (`skybrain-shell-v7`) and stale-while-revalidate, so deploys replace old builds safely. SkyBrain is online-by-design — offline shows the in-game SIGNAL LOST screen.
- **Ads:** the `Ads` object in `js/ui/ui.js` is a provider-less abstraction. `SKYBRAIN_ADS_PRODUCTION` (default `false`) makes the dev/prod split explicit: with no provider configured, dev mode auto-grants rewards for testing, but if that flag is ever flipped to `true` without a real provider wired in, rewards are safely **denied** instead of silently handed out for free.
- **Accessibility:** reduced-motion setting (auto-detects `prefers-reduced-motion`), separate sound/music mute toggles *and* 0–100 volume sliders, haptics toggle, keyboard flight controls, aria labels, and no color-only signals — DEEP SCAN's hue-based rounds always pair the color difference with a second, non-color cue (currently a dashed border ring) so the game doesn't depend on color vision.
- **Testing:** `tests/smoke.js` is a zero-dependency Node harness (no npm install, no browser) that loads the real files in their real `index.html` order and runs a battery of smoke/regression checks — see `tests/README.md`.
