import { describe, expect, it } from 'vitest';
import {
  buildCapturedNotesSnippet,
  formatMidiBinding,
  matchesMidiBinding,
  midiNoteToStrudelName,
  normalizeMidiValue,
  parseMidiMessage,
} from '@/engine/midiUtils';

describe('midiUtils', () => {
  it('converts MIDI note numbers to Strudel mini-notation names', () => {
    expect(midiNoteToStrudelName(60)).toBe('c4');
    expect(midiNoteToStrudelName(61)).toBe('cs4');
    expect(midiNoteToStrudelName(69)).toBe('a4');
    expect(midiNoteToStrudelName(48)).toBe('c3');
  });

  it('normalizes 7-bit MIDI CC values to 0..1', () => {
    expect(normalizeMidiValue(0)).toBe(0);
    expect(normalizeMidiValue(127)).toBe(1);
    expect(normalizeMidiValue(64)).toBeCloseTo(64 / 127, 4);
  });

  it('parses Note On, Note Off, CC, and Clock messages accurately', () => {
    const noteOn = parseMidiMessage(new Uint8Array([0x90, 60, 100]));
    expect(noteOn).toEqual({
      channel: 1,
      type: 'noteon',
      number: 60,
      value: 100,
      noteName: 'c4',
    });

    const zeroVelNoteOff = parseMidiMessage(new Uint8Array([0x91, 64, 0]));
    expect(zeroVelNoteOff.type).toBe('noteoff');
    expect(zeroVelNoteOff.channel).toBe(2);

    const cc = parseMidiMessage(new Uint8Array([0xb2, 74, 96]));
    expect(cc).toEqual({
      channel: 3,
      type: 'cc',
      number: 74,
      value: 96,
    });

    const clock = parseMidiMessage(new Uint8Array([0xf8]));
    expect(clock.type).toBe('clock');
  });

  it('matches MIDI bindings cleanly', () => {
    const binding = {
      deviceId: 'dev-1',
      deviceName: 'MiniLab',
      channel: 1,
      type: 'cc' as const,
      number: 74,
    };
    const ccMatch = parseMidiMessage(new Uint8Array([0xb0, 74, 120]));
    const ccOther = parseMidiMessage(new Uint8Array([0xb0, 75, 120]));

    expect(matchesMidiBinding(binding, 'dev-1', ccMatch)).toBe(true);
    expect(matchesMidiBinding(binding, 'dev-1', ccOther)).toBe(false);
    expect(matchesMidiBinding(binding, 'dev-2', ccMatch)).toBe(false);
    expect(formatMidiBinding(binding)).toBe('CH1 CC74');
  });

  it('builds a valid Strudel note snippet from captured notes', () => {
    expect(buildCapturedNotesSnippet(['c4', 'eb4', 'g4'], 'gm_epiano1')).toBe(
      'note("c4 eb4 g4").s("gm_epiano1")'
    );
    expect(buildCapturedNotesSnippet([])).toBe('');
  });
});
