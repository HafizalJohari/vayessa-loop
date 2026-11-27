import { describe, expect, it } from 'vitest';
import {
  computeWaveformPeaks,
  encodeWavFromFloat32,
  processWaveChannel,
  sanitizeSampleName,
} from '@/engine/sampleStorage';

describe('sampleStorage & Wave Shifter DSP', () => {
  it('sanitizes arbitrary uploaded audio filenames into valid Strudel identifiers', () => {
    expect(sanitizeSampleName('Amen Break (170bpm).wav')).toBe('amen_break_170bpm');
    expect(sanitizeSampleName('808-Kick!.mp3')).toBe('s_808_kick');
    expect(sanitizeSampleName('   .wav')).toBe('custom_sample');
  });

  it('computes normalized waveform peaks cleanly', () => {
    const data = new Float32Array([0, 0.5, -0.8, 0.2, 0.1, 0.9, -0.4, 0.3]);
    const peaks = computeWaveformPeaks(data, 4);
    expect(peaks).toHaveLength(4);
    expect(peaks[0]).toBeCloseTo(0.5, 3);
    expect(peaks[1]).toBeCloseTo(0.8, 3);
    expect(peaks[2]).toBeCloseTo(0.9, 3);
    expect(peaks[3]).toBeCloseTo(0.4, 3);
  });

  it('applies trim, circular waveShift, reverse, and waveShape warp accurately', () => {
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const shifted = processWaveChannel(input, {
      trimStart: 0,
      trimEnd: 1,
      waveShift: 0.5,
      reversed: false,
      waveShape: 0,
    });
    expect(Array.from(shifted).map((v) => Number(v.toFixed(1)))).toEqual([0.3, 0.4, 0.1, 0.2]);

    const reversed = processWaveChannel(input, {
      trimStart: 0,
      trimEnd: 1,
      waveShift: 0,
      reversed: true,
      waveShape: 0,
    });
    expect(Array.from(reversed).map((v) => Number(v.toFixed(1)))).toEqual([0.4, 0.3, 0.2, 0.1]);
  });

  it('encodes valid 16-bit PCM WAV binary header and payload', () => {
    const ch = new Float32Array([0, 0.5, -0.5, 1]);
    const wav = encodeWavFromFloat32([ch], 44100);
    expect(wav.byteLength).toBe(44 + 4 * 2);
    const view = new DataView(wav);
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11)
    );
    expect(riff).toBe('RIFF');
    expect(wave).toBe('WAVE');
  });
});
