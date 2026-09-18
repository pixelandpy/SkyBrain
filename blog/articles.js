/* =====================================================================
   SkyBrain — blog/articles.js · KNOWLEDGE & BLOG CONTENT (data-driven)
   ---------------------------------------------------------------------
   Add an article = add one object here. `body` is simple markdown-ish:
   blank-line separated paragraphs; lines starting with "## " are headers;
   lines starting with "- " become list items. Kept fully separate from
   the game's runtime JavaScript.
   ===================================================================== */
const ARTICLES=[
  {
    id:'v24-notes',cat:'UPDATE',icon:'🕹️',date:'2026-09-17',
    title:'Update notes — SkyBrain v2.4 “Deep Sky”',
    teaser:'Pilot your own ship, an accessible Deep Scan, volume sliders and a portable save.',
    body:`## You fly it now
Tap-to-fly is retired. Your ship is piloted with dedicated thruster controls — rotate, forward thrust, reverse/brake, BOOST and a full STOP — on-screen for mobile, arrows/WASD (plus Shift and X) on desktop. The underlying physics haven't changed: the same acceleration, inertia, retro-braking, boost and energy drain as before, just under your hands instead of a tapped destination. Tapping a planet, the Core, a signal or the Rift while you're already close still opens it immediately; tapping one far away drops a waypoint marker so you know where to head, and it opens the moment you arrive under your own power.

## Flight training
A short, one-time interactive lesson teaches the new controls on your first flight — rotate, accelerate, coast on inertia, brake, boost, then fly a short distance on your own. It won't show again after that, but you can replay it any time from ⚙️ Settings.

## Deep Scan is now colorblind-accessible
Deep Scan's hue-based rounds used to rely on color alone to mark the odd tile. Now every hue round also carries a second, non-color cue, so the round is solvable without depending on color vision at all.

## Hear it your way
Sound Effects and Music each get their own 0-100 volume slider, sitting right under their existing on/off switches.

## Take your progress with you
Settings now has EXPORT SAVE and IMPORT SAVE. Export gives you a text code that is your own backup — copy it somewhere safe. Import checks the code is valid before ever touching your current progress, and always asks you to confirm the replacement first.

## A smoother road to INSANE
Endless Rift's difficulty used to plateau well before level 50 and then the INSANE tier would just switch on. Now the ramp itself keeps steepening from around level 35 onward, so the last few levels before 50 already feel dangerous — INSANE arrives as the next step, not a wall.

## More to see early on
Levels 1-5 — before Deep Scan unlocks — now see noticeably more variety: mixed two-game planet visits more often, small discovery events while you fly, occasional rotating score modifiers, and slightly more frequent early glimpses of skills you haven't unlocked yet.`
  },
  {
    id:'v21-notes',cat:'UPDATE',icon:'🚀',date:'2026-09-14',
    title:'Update notes — SkyBrain v2.1 “Deep Sky”',
    teaser:'Real physics, real stars, energy economy, warp drives, ship upgrades and a five-year sky.',
    body:`## Flight is now real
Your ship uses a thrust-based flight model: the engine burns, the hull accelerates, inertia carries you when the engine cuts, and retro-thrusters fire to brake on approach. Hold your tap (¼ second) to BOOST — double thrust, double burn, violet exhaust, hull shake and star-streaks at speed.

## Energy economy
Every burn consumes ⚡ energy, shown live in the HUD. Recharge by solar-charging near the ✦ Core, harvesting energy crystals, salvaging cargo pods, earning mission consequences, or buying cells with coins. Long warp jumps must be planned around your reserves — but an emergency trickle means you are never stranded.

## The Deep Sky
A new STAR MAP (🗺️ dock button) opens five hierarchical regions: Near Stars → Deep Space → Far Reaches → Galactic Core → Unknown Space. It mixes 16 REAL celestial objects with scientifically accurate distances and facts (Proxima Centauri at 4.246 LY, Sagittarius A* at 26,000 LY, Andromeda at 2.54 million LY…) with an endless supply of procedurally charted fictional systems. Real astronomy is always marked ⚗; SkyBrain fiction is always labelled as such.

## Shipyard
Four gameplay-changing upgrades: ENGINE (acceleration), ENERGY CORE (capacity + efficiency), DEEP SCANNER (events come sooner, detects rare systems), and the four-mark WARP DRIVE that gates the deeper regions.

## The world reacts
Every solved encounter now produces a physical consequence — energy cells, cargo caches, wormholes that make your next jump free, shields, boosted sensors or full nano-repairs. And while you fly, the void lives: comets, passing craft, drifting energy crystals, abandoned cargo pods, distress bursts and — extremely rarely — a wormhole opening beside you.`
  },
  {
    id:'how-to-play',cat:'GUIDE',icon:'🛸',date:'2026-09-14',
    title:'How to play SkyBrain',
    teaser:'Your ship, the signals, the Core — everything you need for your first flight.',
    body:`SkyBrain is a living universe powered by your mind. You are a Neuronaut — a mind travelling as a small ship through the void.

## Moving around
- Pilot with the thruster controls: ◀/▶ rotate, ▲ forward thrust, ▼ reverse/brake, ⚡ BOOST (hold together with ▲ for a burst of speed), ■ full STOP. On-screen on mobile, arrows/WASD (+ Shift to boost, X to stop) on desktop.
- Tap a planet, the Core, a signal or the Rift when you're close enough and it interacts immediately. Tap one that's far away to drop a waypoint marker — a dashed guide line — then pilot there yourself.
- Drag to pan the camera, pinch or scroll to zoom.
- First flight opens a short, one-time interactive flight-training walkthrough. You can replay it any time from ⚙️ Settings.

## What to do
- Follow the 📡 signal that is always somewhere in the void. Decoding it plays a short two-stage brain encounter and reveals a fragment of the story.
- Tap the glowing ✦ Core for the Daily Challenge — the same six stages for every player on Earth today.
- Enter the 🌀 Endless Rift when you want one long, escalating run with three lives.
- Visit planets to train a single ability in a focused session.

## Sessions
A normal visit to SkyBrain is a 5–10 minute mini-adventure: fly, discover, solve, get rewarded, and watch the universe grow a little.`
  },
  {
    id:'exploration',cat:'GUIDE',icon:'📡',date:'2026-09-14',
    title:'How exploration and signals work',
    teaser:'The void is never empty — something is always transmitting.',
    body:`There is always exactly one live anomaly out in the void: an unknown signal, a derelict probe, a frozen echo, a dark structure…

## Finding it
- A chip at the top of the screen announces a new detection.
- If the anomaly is off-screen, a small glowing arrow at the edge of your view points toward it.
- "Free Exploration" in the Play menu sets a course automatically.

## Decoding it
Reaching the anomaly and choosing DECODE starts a two-stage challenge. The signal itself decides which abilities it demands — a frozen echo tests memory and vision, a derelict probe tests logic and math, and so on.

## After decoding
- A story fragment is revealed (there are ${'8'} main fragments).
- The discovery is written into your Cosmic Archive forever.
- A new signal appears somewhere else after a short while.`
  },
  {
    id:'challenges',cat:'GUIDE',icon:'🧠',date:'2026-09-14',
    title:'The seven brain challenges',
    teaser:'Memory, Speed, Pattern, Vision, Logic, Math and Focus — what each one trains.',
    body:`## Memory
Nodes of light flare in a sequence. Hold it in mind and tap it back. Trains working memory.

## Speed
Orbs charge and flash cyan for a heartbeat. Strike exactly then. Trains raw reaction time.

## Pattern
Sequences grow by hidden rules — numbers, rotations, colors, counts. Predict what comes next. Trains rule-finding.

## Vision
A field of near-identical shapes with exactly one impostor. Trains visual discrimination.

## Logic
Riddle monoliths: short questions with one provably correct answer. Trains deduction.

## Math
Fast mental arithmetic, from sums to percentages. Trains numerical fluency.

## Focus
Debris floods the void; only gold stars matter. Trains selective attention and impulse control.`
  },
  {
    id:'difficulty',cat:'GUIDE',icon:'📈',date:'2026-09-14',
    title:'How difficulty works',
    teaser:'Ten tiers, and INSANE beyond them.',
    body:`Every challenge runs at a difficulty from 1 to 10. Difficulty never just "makes numbers bigger" — it changes the gameplay:

- sequences get longer and flash faster
- grids get denser and differences get subtler
- timers shrink
- harder rule types unlock (geometric, Fibonacci, multiply-add patterns)
- decoys spawn faster in Focus

## Where difficulty comes from
- Daily Challenge: a fixed ramp from easy to hard across six stages.
- Planets: scales with your Brain Level, so training stays challenging.
- Anomalies: progression-aware — your level plus how much you've trained each skill.
- Endless Rift: climbs every two levels, then the ramp itself steepens from level ~35 onward — tighter timers, harder patterns — so level 50's INSANE tier lands as a natural next step, not a cliff.`
  },
  {
    id:'progression',cat:'GUIDE',icon:'⬆️',date:'2026-09-14',
    title:'Progression, rewards and the Archive',
    teaser:'XP, Brain Levels, coins, streaks, discoveries — how it all connects.',
    body:`## Brain Levels
Everything you do earns XP. XP raises your Brain Level, and levels awaken new planets — and eventually whole galaxies.

## Brain Coins
Coins buy cosmetics only: avatars, titles, universe themes and Core auras. Everything is earnable in play. No purchases, no pay-to-win — ever.

## Streaks
Clearing the Daily Challenge keeps your 🔥 streak alive. A 🛡 shield (earned along the way) protects one missed day.

## The Cosmic Archive
The Archive is your permanent record: decoded signals, story fragments, awakened worlds, relit galaxies, notable Rift descents. Open it from the Mind Hall (🏆 dock button → ARCHIVE). Story fragments can be re-read there at any time.`
  },
  {
    id:'story-of-core',cat:'LORE',icon:'✦',date:'2026-09-14',
    title:'Lore: What is the Core?',
    teaser:'A lighthouse for minds, broadcasting one challenge each day.',
    body:`Nobody in the void remembers who lit the Core first. The oldest decoded fragments speak of the Gardeners — minds who planted memories in orbit and watered them with attention.

When the Quiet came, thinking became rare, and whole galaxies dimmed because no mind was left to hold them.

The Core was built as an answer: a lighthouse that broadcasts one challenge each day to every listener in every era. As long as one mind answers, the universe stays lit.

You are one of the minds it found. The rest of the story is out there in the signals — decode them.`
  },
  {
    id:'tips',cat:'TIPS',icon:'🎯',date:'2026-09-14',
    title:'Seven tips to raise your score',
    teaser:'Combos beat rushing. Accuracy beats everything.',
    body:`- Accuracy dominates the score formula. A slow correct answer always beats a fast wrong one.
- Combos multiply points up to ×2 — protecting a combo is worth a second of thought.
- In Memory, chunk the sequence into pairs and say them in your head.
- In Speed, watch the charge ring, not the orb — the cyan flash starts there.
- In Vision, defocus your eyes slightly; the odd one "pops" in peripheral vision.
- In Focus, park your finger near the center and ignore anything that isn't gold.
- Play the Daily every day: streak coins compound, and daily variety trains all seven skills evenly.`
  },
  {
    id:'v2-notes',cat:'UPDATE',icon:'🚀',date:'2026-09-14',
    title:'Update notes — SkyBrain v2.0 “The Living Void”',
    teaser:'A ship to fly, signals to chase, a story to decode, an Archive to fill.',
    body:`## New
- Your spacecraft: tap anywhere and fly there; approach objects to interact.
- Living signals: one anomaly is always transmitting somewhere in the void, with an off-screen radar arrow pointing to it.
- Anomaly encounters: two-stage challenges chosen by a smart, non-repetitive selector that weighs recency, your weakest skills and the anomaly's nature.
- The story of the Core: 8 main fragments revealed by decoding signals.
- Cosmic Archive: a permanent record of everything you discover, with re-readable lore.
- Knowledge & Blog: the pages you are reading now.

## Changed
- The project is now a proper multi-file architecture (see README) instead of one giant file.
- Service worker cache is versioned with background revalidation — no more stale builds.

## Unchanged
- Daily Challenge, Endless Rift, planets, cosmetics, achievements, missions and your save all carry over.`
  }
];
