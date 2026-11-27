import type { SampleCatalogItem, SnippetItem } from '@/types/studio';

export const SAMPLE_CATALOG: SampleCatalogItem[] = [
  // Drum Machines
  { id: 'bd-808', name: 'TR-808 Kick', category: 'drums', sound: 'bd', bank: 'RolandTR808', snippet: 's("bd*4").bank("RolandTR808")' },
  { id: 'sd-808', name: 'TR-808 Snare', category: 'drums', sound: 'sd', bank: 'RolandTR808', snippet: 's("~ sd ~ sd").bank("RolandTR808")' },
  { id: 'hh-808', name: 'TR-808 Closed Hat', category: 'drums', sound: 'hh', bank: 'RolandTR808', snippet: 's("hh*8").bank("RolandTR808")' },
  { id: 'cp-808', name: 'TR-808 Clap', category: 'drums', sound: 'cp', bank: 'RolandTR808', snippet: 's("~ cp ~ cp").bank("RolandTR808")' },
  { id: 'bd-909', name: 'TR-909 Kick', category: 'drums', sound: 'bd', bank: 'RolandTR909', snippet: 's("bd*4").bank("RolandTR909")' },
  { id: 'sd-909', name: 'TR-909 Snare', category: 'drums', sound: 'sd', bank: 'RolandTR909', snippet: 's("~ sd ~ sd").bank("RolandTR909")' },
  { id: 'oh-909', name: 'TR-909 Open Hat', category: 'drums', sound: 'oh', bank: 'RolandTR909', snippet: 's("~ oh ~ oh").bank("RolandTR909")' },
  { id: 'rim-808', name: 'TR-808 Rimshot', category: 'percussion', sound: 'rim', bank: 'RolandTR808', snippet: 's("rim(5,16)").bank("RolandTR808")' },
  { id: 'cb-808', name: 'TR-808 Cowbell', category: 'percussion', sound: 'cb', bank: 'RolandTR808', snippet: 's("cb(3,8)").bank("RolandTR808")' },
  { id: 'lt-909', name: 'TR-909 Low Tom', category: 'percussion', sound: 'lt', bank: 'RolandTR909', snippet: 's("lt(3,16)").bank("RolandTR909")' },

  // Built-in Synths
  { id: 'synth-saw', name: 'Sawtooth Lead', category: 'synths', sound: 'sawtooth', previewNote: 'c3', snippet: 'note("c3 eb3 g3 bb3").s("sawtooth").lpf(1800)' },
  { id: 'synth-tri', name: 'Warm Triangle', category: 'synths', sound: 'triangle', previewNote: 'c4', snippet: 'note("c4 e4 g4 b4").s("triangle").room(0.5)' },
  { id: 'synth-sine', name: 'Sub Sine', category: 'synths', sound: 'sine', previewNote: 'c2', snippet: 'note("c2 ~ eb2 f2").s("sine").gain(0.8)' },
  { id: 'synth-square', name: 'Chiptune Square', category: 'synths', sound: 'square', previewNote: 'c4', snippet: 'note("c4 g4 eb4 bb4").s("square").lpf(1400)' },
  { id: 'synth-supersaw', name: 'Supersaw Pad', category: 'synths', sound: 'supersaw', previewNote: 'c3', snippet: 'note("<[c3,eb3,g3] [f3,ab3,c4]>").s("supersaw").lpf(1200).room(0.7)' },

  // GM Soundfonts
  { id: 'gm-piano', name: 'Grand Piano', category: 'soundfonts', sound: 'gm_acoustic_grand_piano', previewNote: 'c4', snippet: 'note("c4 e4 g4 b4").s("gm_acoustic_grand_piano")' },
  { id: 'gm-epiano', name: 'Electric Piano (Rhodes)', category: 'soundfonts', sound: 'gm_epiano1', previewNote: 'c4', snippet: 'note("<[f3,a3,c4,e4] [g3,b3,d4,f4]>").s("gm_epiano1").room(0.4)' },
  { id: 'gm-bass', name: 'Fingered Electric Bass', category: 'soundfonts', sound: 'gm_electric_bass_finger', previewNote: 'c2', snippet: 'note("c2 ~ eb2 g2").s("gm_electric_bass_finger")' },
  { id: 'gm-strings', name: 'Warm String Ensemble', category: 'soundfonts', sound: 'gm_string_ensemble_1', previewNote: 'c4', snippet: 'note("<[c4,eb4,g4] [ab3,c4,eb4]>").s("gm_string_ensemble_1").room(0.7)' },
  { id: 'gm-marimba', name: 'Marimba', category: 'soundfonts', sound: 'gm_marimba', previewNote: 'c4', snippet: 'note("c4(5,8) eb4 g4").s("gm_marimba").delay(0.3)' },
];

export const CODE_SNIPPETS: SnippetItem[] = [
  {
    id: 'snip-macro-lpf',
    name: 'Macro 1 -> Low-Pass Filter',
    category: 'macro',
    description: 'Bind UI/MIDI Macro Knob 1 directly to filter cutoff.',
    code: '.lpf(macro(1).range(200, 6000))',
  },
  {
    id: 'snip-macro-room',
    name: 'Macro 2 -> Reverb Room',
    category: 'macro',
    description: 'Bind UI/MIDI Macro Knob 2 to reverb amount.',
    code: '.room(macro(2).range(0, 0.9))',
  },
  {
    id: 'snip-midin',
    name: 'Native MIDI CC Input (midin)',
    category: 'midi',
    description: 'Read raw MIDI CC directly using native Strudel syntax.',
    code: `const cc = await midin(0)\n// Usage: .lpf(cc(74).range(200, 4000))`,
  },
  {
    id: 'snip-midi-out',
    name: 'Native MIDI Out (.midi)',
    category: 'midi',
    description: 'Route pattern notes & CC to an external synth or DAW.',
    code: `.midi('IAC Driver Bus 1')`,
  },
  {
    id: 'snip-midi-clock',
    name: 'MIDI Clock Sync',
    category: 'midi',
    description: 'Send MIDI clock pulses to sync external hardware/DAWs.',
    code: `.midiclock()`,
  },
  {
    id: 'snip-euclidean',
    name: 'Euclidean Rhythm',
    category: 'pattern',
    description: 'Distribute 5 hits evenly across 16 steps.',
    code: `s("bd(5,16)").bank("RolandTR909")`,
  },
  {
    id: 'snip-scale',
    name: 'Scale Pattern (Tonal)',
    category: 'pattern',
    description: 'Play melodic intervals locked to C Minor scale.',
    code: `n("0 2 4 6 4 2").scale("C4:minor").s("triangle")`,
  },
  {
    id: 'snip-fx-chain',
    name: 'Space FX Chain',
    category: 'fx',
    description: 'Filter + Stereo Delay + Lush Reverb.',
    code: `.lpf(1800).delay(0.35).delaytime(0.25).room(0.6)`,
  },
];
