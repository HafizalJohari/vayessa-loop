import type { OscillatorSettings } from '@/types/studio';

export const DEFAULT_OSCILLATOR_SETTINGS: OscillatorSettings = {
  waveform: 'sawtooth',
  octave: 0,
  gain: 0.65,
  fm: 0,
  fmh: 2,
  lpf: 2400,
  lpq: 3,
  attack: 0.01,
  decay: 0.25,
  sustain: 0.35,
  release: 0.3,
  vib: 0,
  vibmod: 0.15,
  room: 0.25,
  delay: 0.15,
};

export interface OscillatorPatch {
  id: string;
  name: string;
  settings: OscillatorSettings;
}

export const OSCILLATOR_PATCHES: OscillatorPatch[] = [
  {
    id: 'warm-saw',
    name: 'Warm Analog Saw',
    settings: { ...DEFAULT_OSCILLATOR_SETTINGS },
  },
  {
    id: 'deep-sub',
    name: 'Deep Sub Sine',
    settings: {
      ...DEFAULT_OSCILLATOR_SETTINGS,
      waveform: 'sine',
      octave: -1,
      gain: 0.85,
      lpf: 480,
      lpq: 1,
      attack: 0.01,
      decay: 0.35,
      sustain: 0.6,
      release: 0.25,
      room: 0.05,
      delay: 0,
    },
  },
  {
    id: 'fm-bell',
    name: 'FM Glass Bell',
    settings: {
      ...DEFAULT_OSCILLATOR_SETTINGS,
      waveform: 'triangle',
      octave: 1,
      gain: 0.55,
      fm: 3.2,
      fmh: 2.76,
      lpf: 6500,
      lpq: 1.5,
      attack: 0.005,
      decay: 0.65,
      sustain: 0.05,
      release: 0.8,
      room: 0.65,
      delay: 0.35,
    },
  },
  {
    id: 'acid-303',
    name: 'Acid 303 Squelch',
    settings: {
      ...DEFAULT_OSCILLATOR_SETTINGS,
      waveform: 'sawtooth',
      octave: -1,
      gain: 0.7,
      lpf: 900,
      lpq: 13,
      attack: 0.005,
      decay: 0.16,
      sustain: 0.08,
      release: 0.12,
      room: 0.15,
      delay: 0.3,
    },
  },
  {
    id: 'supersaw-pad',
    name: 'Lush Supersaw Pad',
    settings: {
      ...DEFAULT_OSCILLATOR_SETTINGS,
      waveform: 'supersaw',
      octave: 0,
      gain: 0.45,
      lpf: 1600,
      lpq: 2,
      attack: 0.45,
      decay: 0.6,
      sustain: 0.75,
      release: 1.4,
      vib: 4,
      vibmod: 0.18,
      room: 0.8,
      delay: 0.3,
    },
  },
];

/**
 * Shift a Strudel note string like "c3" by an integer octave delta
 */
export function shiftNoteOctave(noteStr: string, octaveDelta: number): string {
  if (!octaveDelta) return noteStr;
  return noteStr.replace(/([a-gA-G][#bs]?)(-?\d)/g, (_, pitch: string, oct: string) => {
    const nextOct = Math.max(0, Math.min(8, parseInt(oct, 10) + octaveDelta));
    return `${pitch}${nextOct}`;
  });
}

/**
 * Generate clean, idiomatic Strudel live-coding syntax from OscillatorSettings
 */
export function buildOscillatorStrudelCode(
  s: OscillatorSettings,
  notePattern = 'c3 eb3 g3 bb3'
): string {
  const shiftedNotes = shiftNoteOctave(notePattern, s.octave);
  const parts: string[] = [
    `note("${shiftedNotes}")`,
    `.s("${s.waveform}")`,
    `.lpf(${Math.round(s.lpf)})`,
  ];

  if (s.lpq > 1) parts.push(`.lpq(${Number(s.lpq.toFixed(1))})`);
  if (s.fm > 0.05) {
    parts.push(`.fm(${Number(s.fm.toFixed(2))})`);
    parts.push(`.fmh(${Number(s.fmh.toFixed(2))})`);
  }
  parts.push(`.attack(${Number(s.attack.toFixed(3))})`);
  parts.push(`.decay(${Number(s.decay.toFixed(2))})`);
  parts.push(`.sustain(${Number(s.sustain.toFixed(2))})`);
  parts.push(`.release(${Number(s.release.toFixed(2))})`);
  if (s.vib > 0.1 && s.vibmod > 0.01) {
    parts.push(`.vib(${Number(s.vib.toFixed(1))}).vibmod(${Number(s.vibmod.toFixed(2))})`);
  }
  if (s.room > 0.02) parts.push(`.room(${Number(s.room.toFixed(2))})`);
  if (s.delay > 0.02) parts.push(`.delay(${Number(s.delay.toFixed(2))})`);
  parts.push(`.gain(${Number(s.gain.toFixed(2))})`);

  return parts.join('');
}
