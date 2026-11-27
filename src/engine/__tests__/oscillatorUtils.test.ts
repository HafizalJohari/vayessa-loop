import { describe, expect, it } from 'vitest';
import {
  buildOscillatorStrudelCode,
  DEFAULT_OSCILLATOR_SETTINGS,
  OSCILLATOR_PATCHES,
  shiftNoteOctave,
} from '@/engine/oscillatorUtils';

describe('oscillatorUtils', () => {
  it('shifts Strudel note octaves cleanly', () => {
    expect(shiftNoteOctave('c3 eb3 g3', 1)).toBe('c4 eb4 g4');
    expect(shiftNoteOctave('c3 eb3 g3', -1)).toBe('c2 eb2 g2');
    expect(shiftNoteOctave('c3 eb3 g3', 0)).toBe('c3 eb3 g3');
  });

  it('generates clean Strudel synth code from oscillator settings', () => {
    const code = buildOscillatorStrudelCode({
      ...DEFAULT_OSCILLATOR_SETTINGS,
      waveform: 'triangle',
      fm: 2.5,
      fmh: 2.76,
      lpf: 1800,
    });
    expect(code).toContain('.s("triangle")');
    expect(code).toContain('.lpf(1800)');
    expect(code).toContain('.fm(2.5).fmh(2.76)');
  });

  it('provides 5 valid built-in synth patches', () => {
    expect(OSCILLATOR_PATCHES).toHaveLength(5);
    for (const patch of OSCILLATOR_PATCHES) {
      const code = buildOscillatorStrudelCode(patch.settings);
      expect(code).toContain(`.s("${patch.settings.waveform}")`);
    }
  });
});
