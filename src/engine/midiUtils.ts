import type { MidiBinding, MidiLogEvent } from '@/types/studio';

const NOTE_NAMES = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b'];

/**
 * Convert MIDI note number (0..127) to Strudel mini-notation note string (e.g., 60 -> "c4")
 */
export function midiNoteToStrudelName(noteNumber: number): string {
  const clamped = Math.max(0, Math.min(127, Math.round(noteNumber)));
  const octave = Math.floor(clamped / 12) - 1;
  const pitchClass = NOTE_NAMES[clamped % 12];
  return `${pitchClass}${octave}`;
}

/**
 * Normalize a 7-bit MIDI value (0..127) to 0..1
 */
export function normalizeMidiValue(value: number): number {
  return Math.max(0, Math.min(1, value / 127));
}

export interface ParsedMidiMessage {
  channel: number; // 1..16
  type: 'noteon' | 'noteoff' | 'cc' | 'clock' | 'other';
  number: number; // note or CC number
  value: number; // velocity or CC value
  noteName?: string;
}

/**
 * Parse raw Web MIDI API Uint8Array message bytes
 */
export function parseMidiMessage(data: Uint8Array): ParsedMidiMessage {
  if (!data || data.length === 0) {
    return { channel: 1, type: 'other', number: 0, value: 0 };
  }
  const status = data[0];

  // System Real-Time Clock (0xF8)
  if (status === 0xf8) {
    return { channel: 0, type: 'clock', number: 0, value: 0 };
  }

  const command = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  const data1 = data[1] ?? 0;
  const data2 = data[2] ?? 0;

  if (command === 0x90) {
    if (data2 === 0) {
      return {
        channel,
        type: 'noteoff',
        number: data1,
        value: 0,
        noteName: midiNoteToStrudelName(data1),
      };
    }
    return {
      channel,
      type: 'noteon',
      number: data1,
      value: data2,
      noteName: midiNoteToStrudelName(data1),
    };
  }

  if (command === 0x80) {
    return {
      channel,
      type: 'noteoff',
      number: data1,
      value: data2,
      noteName: midiNoteToStrudelName(data1),
    };
  }

  if (command === 0xb0) {
    return {
      channel,
      type: 'cc',
      number: data1,
      value: data2,
    };
  }

  return { channel, type: 'other', number: data1, value: data2 };
}

/**
 * Check if an incoming MIDI event matches a saved MidiBinding
 */
export function matchesMidiBinding(
  binding: MidiBinding | undefined,
  deviceId: string,
  msg: ParsedMidiMessage
): boolean {
  if (!binding) return false;
  if (binding.deviceId !== '*' && binding.deviceId !== deviceId) return false;
  if (binding.channel !== msg.channel) return false;
  if (binding.type === 'cc' && msg.type === 'cc' && binding.number === msg.number) {
    return true;
  }
  if (binding.type === 'note' && msg.type === 'noteon' && binding.number === msg.number) {
    return true;
  }
  return false;
}

/**
 * Convert captured MIDI notes into a clean Strudel note pattern snippet
 */
export function buildCapturedNotesSnippet(
  notes: string[],
  synthSound = 'gm_epiano1'
): string {
  if (notes.length === 0) return '';
  return `note("${notes.join(' ')}").s("${synthSound}")`;
}

/**
 * Format a MidiBinding into a concise human-readable badge (e.g. "CH1 CC74" or "CH1 C4")
 */
export function formatMidiBinding(binding?: MidiBinding): string {
  if (!binding) return 'Unmapped';
  if (binding.type === 'cc') {
    return `CH${binding.channel} CC${binding.number}`;
  }
  return `CH${binding.channel} ${midiNoteToStrudelName(binding.number).toUpperCase()}`;
}

let logSeq = 1;
export function createMidiLogEvent(
  direction: 'in' | 'out',
  deviceName: string,
  msg: ParsedMidiMessage
): MidiLogEvent {
  return {
    id: logSeq++,
    timestamp: Date.now(),
    direction,
    deviceName,
    channel: msg.channel,
    type: msg.type,
    number: msg.number,
    value: msg.value,
    noteName: msg.noteName,
  };
}
