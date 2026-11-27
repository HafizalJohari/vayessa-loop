export interface MidiBinding {
  deviceId: string;
  deviceName: string;
  channel: number; // 1-16
  type: 'cc' | 'note';
  number: number; // CC number or MIDI note number (0-127)
}

export interface MacroKnob {
  id: number; // 1..8
  label: string;
  value: number; // normalized 0..1
  min: number;
  max: number;
  color: string;
  midiBinding?: MidiBinding;
}

export interface MixerTrack {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  gain: number; // 0..1.5
  lpf: number; // 200..18000 Hz
  midiGainBinding?: MidiBinding;
  midiMuteBinding?: MidiBinding;
}

export type PadActionType =
  | 'toggle_play'
  | 'evaluate'
  | 'tap_tempo'
  | 'mute_track_1'
  | 'mute_track_2'
  | 'mute_track_3'
  | 'mute_track_4'
  | 'load_preset_1'
  | 'load_preset_2'
  | 'load_preset_3'
  | 'load_preset_4'
  | 'playlist_next'
  | 'playlist_prev';

export interface PadMapping {
  id: string;
  label: string;
  action: PadActionType;
  midiBinding?: MidiBinding;
}

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
  type: 'input' | 'output';
}

export interface MidiLogEvent {
  id: number;
  timestamp: number;
  direction: 'in' | 'out';
  deviceName: string;
  channel: number;
  type: 'noteon' | 'noteoff' | 'cc' | 'clock' | 'other';
  number: number;
  value: number;
  noteName?: string;
}

export type LearnTarget =
  | { kind: 'macro'; macroId: number }
  | { kind: 'track_gain'; trackId: string }
  | { kind: 'track_mute'; trackId: string }
  | { kind: 'pad'; padId: string }
  | { kind: 'bpm' };

export interface SequencerRow {
  id: string;
  label: string;
  sound: string;
  bank?: string;
  note?: string;
  color: string;
  steps: boolean[]; // 16 steps
  gain: number;
  muted: boolean;
}

export interface PresetItem {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  description: string;
  code: string;
}

export interface SampleCatalogItem {
  id: string;
  name: string;
  category: 'drums' | 'synths' | 'soundfonts' | 'percussion';
  sound: string;
  bank?: string;
  snippet: string;
  previewNote?: string;
}

export interface SnippetItem {
  id: string;
  name: string;
  category: 'pattern' | 'fx' | 'midi' | 'macro';
  description: string;
  code: string;
}

export type StudioMode = 'practice' | 'jam' | 'live';

export interface SyntaxDiagnostic {
  message: string;
  line: number; // 1-based
  column: number; // 1-based
  codeLine: string;
  suggestion: string;
  quickFix?: {
    label: string;
    fixedCode: string;
  };
  keptPreviousAudio: boolean;
}

export type FadeStyle = 'smooth' | 'filter' | 'cut';

export interface PlaylistItem {
  id: string;
  title: string;
  bpm: number;
  code: string;
  fadeSeconds: number; // 0..12
  fadeStyle: FadeStyle;
  hydraPresetId?: string; // optional Hydra visual preset to auto-trigger on fade
  notes?: string;
}

export interface PlaylistCollection {
  id: string;
  name: string;
  items: PlaylistItem[];
}

export interface ImportedSampleMeta {
  id: string;
  name: string; // Strudel-safe identifier, e.g. "amen_break"
  fileName: string;
  duration: number; // seconds
  trimStart: number; // 0..1 normalized
  trimEnd: number; // 0..1 normalized
  waveShift: number; // 0..1 circular phase/start offset shift
  pitchSemitones: number; // -12..+12
  waveShape: number; // 0..1 waveshaper warp
  sliceCount: 1 | 4 | 8 | 16;
  reversed: boolean;
  peaks: number[]; // downsampled waveform peaks for fast canvas rendering
  blobUrl?: string; // runtime ObjectURL for Strudel samples()
}

export interface PatternSnapshot {
  slot: 'A' | 'B' | 'C' | 'D';
  code: string;
  bpm: number;
  savedAt?: number;
}

export interface PracticeExercise {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'MIDI & Live';
  bpm: number;
  goal: string;
  hint: string;
  starterCode: string;
}

export interface HydraPreset {
  id: string;
  name: string;
  description: string;
  code: string;
}

export type OscillatorWaveform = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'supersaw';

export interface OscillatorSettings {
  waveform: OscillatorWaveform;
  octave: number; // -2..+2
  gain: number; // 0..1.2
  fm: number; // 0..10
  fmh: number; // 0.5..8
  lpf: number; // 150..18000 Hz
  lpq: number; // 0.5..18
  attack: number; // 0.005..2
  decay: number; // 0.02..2
  sustain: number; // 0..1
  release: number; // 0.02..3
  vib: number; // 0..12
  vibmod: number; // 0..1
  room: number; // 0..0.95
  delay: number; // 0..0.8
}
