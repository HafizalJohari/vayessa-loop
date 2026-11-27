import type { PresetItem } from '@/types/studio';

export const STUDIO_PRESETS: PresetItem[] = [
  {
    id: 'lofi-chill',
    name: 'Midnight Lo-Fi',
    genre: 'Lo-Fi Hip Hop',
    bpm: 84,
    description: 'Warm Rhodes chords, dusty TR-808 drums & Macro 1 filter sweep.',
    code: `// Midnight Lo-Fi — Twist Macro 1 (Filter) & Macro 2 (Reverb) or bind via MIDI Learn!
setcpm(84 / 4)

stack(
  // Drums
  track('drums',
    stack(
      s("bd ~ ~ bd ~ ~ bd ~"),
      s("~ sd ~ ~ ~ sd ~ ~").gain(0.85),
      s("hh*8").gain(0.35).pan(sine.range(0.3, 0.7))
    ).bank("RolandTR808").lpf(macro(1).range(800, 12000))
  ),

  // Dusty Electric Piano Chords
  track('chords',
    note("<[f3,a3,c4,e4] [d3,f3,a3,c4] [g3,b3,d4,f4] [c3,e3,g3,b3]>")
      .s("triangle")
      .lpf(macro(1).range(400, 3200))
      .room(macro(2).range(0.1, 0.85))
      .delay(macro(3).range(0, 0.45))
      .gain(0.55)
  ),

  // Sub Bass
  track('bass',
    note("<f1 d1 g1 c1>")
      .s("sine")
      .lpf(320)
      .gain(0.75)
  )
)`
  },
  {
    id: 'acid-techno',
    name: 'Berlin Acid 303',
    genre: 'Acid Techno',
    bpm: 132,
    description: 'Driving 909 kick & squelchy sawtooth acid line controlled by Macros 1-3.',
    code: `// Berlin Acid 303 — Macro 1: Acid Cutoff | Macro 2: Resonance | Macro 3: Delay
setcpm(132 / 4)

stack(
  track('drums',
    stack(
      s("bd*4").gain(1.1),
      s("~ [~ oh] ~ oh").gain(0.5),
      s("hh*16").gain(0.28),
      s("~ cp ~ cp").room(0.25).gain(0.65)
    ).bank("RolandTR909")
  ),

  track('bass',
    note("c2 c2 eb2 c2 f2 g2 eb2 bb1")
      .fast(2)
      .s("sawtooth")
      .lpf(macro(1).range(220, 4800))
      .lpq(macro(2).range(2, 16))
      .decay(0.18)
      .sustain(0.1)
      .delay(macro(3).range(0, 0.5))
      .gain(0.6)
  ),

  track('lead',
    note("~ g4 ~ [bb4 c5] ~ eb5 ~ ~")
      .s("square")
      .lpf(1600)
      .room(0.5)
      .delay(0.35)
      .gain(0.25)
  )
)`
  },
  {
    id: 'deep-house',
    name: 'Velvet Deep House',
    genre: 'Deep House',
    bpm: 122,
    description: 'Four-on-the-floor groove with minor 9th stabs and rolling bass.',
    code: `// Velvet Deep House — Use Track Mixer or MIDI Pads to Mute/Solo layers
setcpm(122 / 4)

stack(
  track('drums',
    stack(
      s("bd*4"),
      s("~ cp ~ cp").gain(0.7),
      s("[~ hh]*4").gain(0.45),
      s("~ ~ ~ [rim ~]").gain(0.4)
    ).bank("RolandTR909")
  ),

  track('chords',
    note("~ [c3,eb3,g3,bb3,d4] ~ ~ ~ [f3,ab3,c4,eb4] ~ ~")
      .s("sawtooth")
      .lpf(macro(1).range(350, 2600))
      .attack(0.01)
      .decay(0.22)
      .sustain(0.05)
      .room(macro(2).range(0.15, 0.8))
      .delay(0.25)
      .gain(0.45)
  ),

  track('bass',
    note("c2 ~ ~ c2 ~ eb2 f2 g2")
      .s("triangle")
      .lpf(500)
      .gain(0.8)
  )
)`
  },
  {
    id: 'polyrhythm',
    name: 'Euclidean Polyrhythm',
    genre: 'Electronic / IDM',
    bpm: 116,
    description: 'Interlocking Euclidean rhythms (3,8), (5,8), and (7,16) in D Dorian.',
    code: `// Euclidean Polyrhythm — Interactive live-coding showcase
setcpm(116 / 4)

stack(
  track('drums',
    stack(
      s("bd(3,8)"),
      s("sd(2,8,2)").gain(0.8),
      s("hh(7,16)").gain(0.35),
      s("rim(5,16)").pan(0.7).gain(0.45)
    ).bank("RolandTR808")
  ),

  track('lead',
    n("0(5,8) 2(3,8) 4 6")
      .scale("D4:dorian")
      .s("sine")
      .fm(macro(4).range(0.5, 6))
      .lpf(macro(1).range(400, 6000))
      .delay(macro(3).range(0.1, 0.6))
      .room(macro(2).range(0.2, 0.85))
      .gain(0.5)
  ),

  track('bass',
    n("<0 0 -2 -1>")
      .scale("D2:dorian")
      .s("sawtooth")
      .lpf(420)
      .gain(0.65)
  )
)`
  },
  {
    id: 'midi-hybrid',
    name: 'MIDI Controller Template',
    genre: 'MIDI / Hardware',
    bpm: 120,
    description: 'Ready-made template showing both Studio Macros & native Strudel MIDI syntax.',
    code: `// MIDI Controller Hybrid Template
// 1. Click 'Learn' on Macro 1-4 (right panel) & twist any hardware knob.
// 2. Or uncomment native Strudel MIDI lines below for direct hardware I/O!
setcpm(120 / 4)

// --- Native Strudel MIDI Input Example (uncomment if using direct CC) ---
// const cc = await midin('My MIDI Controller')
// note("c3 eb3 g3 bb3").lpf(cc(74).range(200, 4000)).s("sawtooth")

stack(
  track('drums',
    s("bd*4, ~ sd ~ sd, hh*8").bank("RolandTR909").gain(0.85)
  ),

  track('lead',
    note("c3 eb3 g3 bb3 c4 bb3 g3 eb3")
      .s("sawtooth")
      .lpf(macro(1).range(200, 6000))
      .lpq(macro(2).range(1, 14))
      .delay(macro(3).range(0, 0.6))
      .room(macro(4).range(0, 0.85))
      .gain(0.55)
  )
  // --- Native Strudel MIDI Out Example (send to external synth/DAW) ---
  // , note("c3 eb3 g3 bb3").midi('IAC Driver Bus 1')
)`
  }
];
