/* =====================================================================
   SkyBrain — data/story.js · STORY & LORE (data-driven)
   ---------------------------------------------------------------------
   The story of SkyBrain unfolds through decoded signals. Every anomaly
   the player decodes reveals the next fragment in order; side fragments
   are attached to worlds and events. Add story = add an entry here.
   ===================================================================== */

/* Main story thread — revealed strictly in order, one per decoded anomaly. */
const STORY_MAIN=[
  {id:'st01',icon:'📡',title:'FRAGMENT 01 — THE FIRST VOICE',
   text:'…is anyone receiving? This universe was not discovered. It was grown. Every star you see is a thought that someone, somewhere, refused to forget.'},
  {id:'st02',icon:'🛰️',title:'FRAGMENT 02 — THE GARDENERS',
   text:'We called ourselves the Gardeners of the Cortex Nebula. We planted memories in orbit and watered them with attention. Then the Quiet came, and thinking became… dangerous.'},
  {id:'st03',icon:'🌑',title:'FRAGMENT 03 — THE QUIET',
   text:'The Quiet is not silence. It is forgetting. Whole galaxies dimmed because no mind was left to hold them. The locked worlds you see are not locked — they are asleep.'},
  {id:'st04',icon:'✦',title:'FRAGMENT 04 — THE CORE',
   text:'We built the Core as a lighthouse for minds. It broadcasts one challenge each day to every listener in every era. As long as one mind answers, the universe stays lit.'},
  {id:'st05',icon:'🧠',title:'FRAGMENT 05 — YOU',
   text:'If you can read this, the beacon found you. Your ship is not a machine — it is the shape your attention takes out here. That is why it moves when you decide.'},
  {id:'st06',icon:'🌀',title:'FRAGMENT 06 — THE RIFT',
   text:'Do not fear the Rift. It is the place where our archive collapsed inward. Everything we ever knew is still down there, layer under layer. Go as deep as your mind can carry you.'},
  {id:'st07',icon:'🕳️',title:'FRAGMENT 07 — WHAT WATCHES BACK',
   text:'One warning. Something else answers the Daily broadcast now. It solves nothing, it only listens. If your signals feel watched — they are. Keep training. It respects the sharp.'},
  {id:'st08',icon:'🌌',title:'FRAGMENT 08 — THE PROMISE',
   text:'When enough minds burn bright, the sleeping galaxies wake in a chain, one memory at a time. You have already relit more than you know. Whoever you are: thank you. Keep going.'}
];

/* Flavor lines shown while a signal is being decoded (picked at random). */
const DECODE_FLAVOR=[
  'Aligning antenna array…','Isolating carrier wave…','Untangling neural static…',
  'Cross-checking with the Cosmic Archive…','Boosting signal through the Core…',
  'Filtering the Quiet out of the channel…'
];

/* Archive entry types (what a discovery looks like in the archive). */
const ARCHIVE_KINDS={
  anomaly:{icon:'📡',label:'DECODED SIGNAL'},
  planet:{icon:'🪐',label:'WORLD AWAKENED'},
  galaxy:{icon:'🌌',label:'GALAXY RELIT'},
  daily:{icon:'✦',label:'CORE BROADCAST ANSWERED'},
  rift:{icon:'🌀',label:'RIFT DESCENT'},
  star:{icon:'🌟',label:'SYSTEM SURVEYED — SKYBRAIN FICTION'},
  realstar:{icon:'🔭',label:'REAL CELESTIAL OBJECT SURVEYED'},
  wormhole:{icon:'🕳️',label:'WORMHOLE ENCOUNTERED'},
  upgrade:{icon:'🛠️',label:'SHIP SYSTEM UPGRADED'},
  cache:{icon:'📦',label:'SALVAGE RECOVERED'},
  expedition:{icon:'🚀',label:'EXPEDITION LOG'}
};
