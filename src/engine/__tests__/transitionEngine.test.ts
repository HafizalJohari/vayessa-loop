import { describe, expect, it, vi } from 'vitest';

vi.mock('@/engine/strudelEngine', () => ({
  strudelEngine: {
    evaluate: vi.fn(async () => true),
    stop: vi.fn(),
    setBpm: vi.fn(),
    setTransitionState: vi.fn(),
  },
}));

import { computeFadeCurve } from '@/engine/transitionEngine';

describe('transitionEngine computeFadeCurve', () => {
  it('computes smooth fade out -> 0 at midpoint -> fade in', () => {
    expect(computeFadeCurve(0, 'smooth').gain).toBeCloseTo(1, 3);
    expect(computeFadeCurve(0.5, 'smooth').gain).toBeCloseTo(0, 3);
    expect(computeFadeCurve(1, 'smooth').gain).toBeCloseTo(1, 3);
  });

  it('computes filter sweep fade closing LPF down to 250Hz at midpoint', () => {
    const start = computeFadeCurve(0, 'filter');
    const mid = computeFadeCurve(0.5, 'filter');
    const end = computeFadeCurve(1, 'filter');

    expect(start.lpf).toBe(18000);
    expect(mid.lpf).toBe(250);
    expect(end.lpf).toBe(18000);
  });

  it('keeps gain & LPF untouched for instant cut transitions', () => {
    const mid = computeFadeCurve(0.5, 'cut');
    expect(mid.gain).toBe(1);
    expect(mid.lpf).toBe(18000);
  });
});
