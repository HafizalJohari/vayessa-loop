import type { SequencerRow } from '@/types/studio';

export const SEQUENCER_START_MARKER = '// @studio-sequencer:start';
export const SEQUENCER_END_MARKER = '// @studio-sequencer:end';

/**
 * Convert a single 16-step boolean row into a Strudel pattern line
 */
export function rowToStrudelPattern(row: SequencerRow): string | null {
  if (row.muted) return null;
  const activeCount = row.steps.filter(Boolean).length;
  if (activeCount === 0) return null;

  const token = row.note ? row.note : row.sound;
  const mini = row.steps.map((on) => (on ? token : '~')).join(' ');

  if (row.note) {
    return `  note("${mini}").s("${row.sound}").gain(${row.gain.toFixed(2)})`;
  }

  const bankPart = row.bank ? `.bank("${row.bank}")` : '';
  return `  s("${mini}")${bankPart}.gain(${row.gain.toFixed(2)})`;
}

/**
 * Generate a complete marked Strudel stack() block from all sequencer rows
 */
export function generateSequencerCodeBlock(rows: SequencerRow[], bpm: number): string {
  const lines = rows
    .map(rowToStrudelPattern)
    .filter((line): line is string => line !== null);

  if (lines.length === 0) {
    return [
      SEQUENCER_START_MARKER,
      `setcpm(${bpm} / 4)`,
      `silence`,
      SEQUENCER_END_MARKER,
    ].join('\n');
  }

  return [
    SEQUENCER_START_MARKER,
    `setcpm(${bpm} / 4)`,
    `stack(`,
    lines.join(',\n'),
    `)`,
    SEQUENCER_END_MARKER,
  ].join('\n');
}

/**
 * Merge or replace the sequencer block inside existing user editor code.
 * If markers exist, replaces only between markers. Otherwise replaces the document when replaceAll=true,
 * or appends cleanly.
 */
export function applySequencerToCode(
  currentCode: string,
  rows: SequencerRow[],
  bpm: number,
  replaceAllIfMissing = true
): string {
  const block = generateSequencerCodeBlock(rows, bpm);
  const startIdx = currentCode.indexOf(SEQUENCER_START_MARKER);
  const endIdx = currentCode.indexOf(SEQUENCER_END_MARKER);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = currentCode.slice(0, startIdx);
    const after = currentCode.slice(endIdx + SEQUENCER_END_MARKER.length);
    return `${before}${block}${after}`;
  }

  if (replaceAllIfMissing) {
    return block;
  }

  return `${currentCode.trimEnd()}\n\n${block}\n`;
}

/**
 * Default 16-step groovebox rows for instant music making
 */
export function createDefaultSequencerRows(): SequencerRow[] {
  const pattern = (indices: number[]) =>
    Array.from({ length: 16 }, (_, i) => indices.includes(i));

  return [
    {
      id: 'seq-kick',
      label: 'Kick 909',
      sound: 'bd',
      bank: 'RolandTR909',
      color: '#34d399',
      steps: pattern([0, 4, 8, 12]),
      gain: 0.95,
      muted: false,
    },
    {
      id: 'seq-snare',
      label: 'Snare 909',
      sound: 'sd',
      bank: 'RolandTR909',
      color: '#f59e0b',
      steps: pattern([4, 12]),
      gain: 0.85,
      muted: false,
    },
    {
      id: 'seq-hh',
      label: 'Closed Hat',
      sound: 'hh',
      bank: 'RolandTR909',
      color: '#38bdf8',
      steps: pattern([0, 2, 4, 6, 8, 10, 12, 14]),
      gain: 0.45,
      muted: false,
    },
    {
      id: 'seq-clap',
      label: 'Clap 808',
      sound: 'cp',
      bank: 'RolandTR808',
      color: '#f472b6',
      steps: pattern([12]),
      gain: 0.65,
      muted: false,
    },
    {
      id: 'seq-bass',
      label: 'Sub Bass',
      sound: 'triangle',
      note: 'c2',
      color: '#a78bfa',
      steps: pattern([0, 3, 6, 10, 14]),
      gain: 0.75,
      muted: false,
    },
    {
      id: 'seq-stab',
      label: 'Synth Stab',
      sound: 'sawtooth',
      note: 'eb4',
      color: '#2dd4bf',
      steps: pattern([2, 10]),
      gain: 0.4,
      muted: false,
    },
  ];
}
