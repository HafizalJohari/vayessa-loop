import type { PracticeExercise } from '@/types/studio';

export const PRACTICE_EXERCISES: PracticeExercise[] = [
  {
    id: 'ex-four-on-floor',
    title: '1. Four-on-the-Floor Groove',
    level: 'Beginner',
    bpm: 118,
    goal: 'Add a snare on beats 2 & 4 (`~ sd ~ sd`) and 8th-note hi-hats (`hh*8`) to the kick.',
    hint: 'Inside stack(...), add a comma after s("bd*4") then add s("~ sd ~ sd"), s("hh*8").gain(0.4)',
    starterCode: `// Practice 1: Four-on-the-Floor Groove
// Goal: Add snare (~ sd ~ sd) and hi-hats (hh*8) inside stack()
setcpm(118 / 4)

stack(
  s("bd*4")
).bank("RolandTR909")`,
  },
  {
    id: 'ex-euclidean',
    title: '2. Euclidean Polyrhythms',
    level: 'Intermediate',
    bpm: 112,
    goal: 'Change the rimshot to a 5-over-16 Euclidean rhythm `rim(5,16)` and add `.delay(0.35)` to the melody.',
    hint: 'Replace s("rim ~") with s("rim(5,16)") and chain .delay(0.35) onto the triangle synth.',
    starterCode: `// Practice 2: Euclidean Polyrhythms
setcpm(112 / 4)

stack(
  s("bd(3,8)").bank("RolandTR808"),
  s("rim ~").bank("RolandTR808").gain(0.6),
  n("0 2 4 6").scale("C4:minor").s("triangle").lpf(1600)
)`,
  },
  {
    id: 'ex-midi-macro',
    title: '3. Live Filter Sweep with Macro / MIDI',
    level: 'MIDI & Live',
    bpm: 124,
    goal: 'Connect Macro Knob 1 to the acid bass filter cutoff using `.lpf(macro(1).range(250, 4500))` and twist M1 (or MIDI Learn it!).',
    hint: 'Replace .lpf(900) with .lpf(macro(1).range(250, 4500)) and run Cmd+Enter.',
    starterCode: `// Practice 3: Live Filter Sweep with Macro 1 / MIDI Learn
setcpm(124 / 4)

stack(
  track('drums', s("bd*4, ~ cp ~ cp, hh*8").bank("RolandTR909")),
  track('bass',
    note("c2 c2 eb2 c2 f2 g2 eb2 bb1")
      .fast(2)
      .s("sawtooth")
      .lpf(900)
      .lpq(8)
      .gain(0.6)
  )
)`,
  },
];
