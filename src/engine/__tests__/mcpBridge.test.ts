import { describe, expect, it, vi } from 'vitest';
import { useStudioStore } from '@/store/useStudioStore';

vi.mock('@/engine/strudelEngine', () => ({
  strudelEngine: {
    evaluate: vi.fn(async () => true),
    stop: vi.fn(() => useStudioStore.getState().setIsPlaying(false)),
    setBpm: vi.fn((bpm: number) => useStudioStore.getState().setBpm(bpm)),
    triggerOneShot: vi.fn(async () => {}),
  },
}));

import { executeMcpCommand } from '@/engine/mcpBridge';

describe('mcpBridge executeMcpCommand', () => {
  it('returns complete studio state via get_studio_state', async () => {
    const state = (await executeMcpCommand('get_studio_state')) as {
      bpm: number;
      macros: unknown[];
      tracks: unknown[];
      sequencerRows: unknown[];
    };
    expect(state.bpm).toBeGreaterThanOrEqual(40);
    expect(state.macros).toHaveLength(8);
    expect(state.tracks).toHaveLength(4);
    expect(state.sequencerRows).toHaveLength(6);
  });

  it('lists presets and samples cleanly', async () => {
    const presets = (await executeMcpCommand('list_presets')) as Array<{ id: string }>;
    expect(presets.length).toBeGreaterThanOrEqual(5);
    expect(presets.some((p) => p.id === 'lofi-chill')).toBe(true);

    const catalog = (await executeMcpCommand('list_samples')) as {
      samples: unknown[];
      snippets: unknown[];
    };
    expect(catalog.samples.length).toBeGreaterThan(10);
    expect(catalog.snippets.length).toBeGreaterThan(5);
  });

  it('updates BPM, Macro Knob, Track Mixer, and Master Gain', async () => {
    await executeMcpCommand('set_bpm', { bpm: 128 });
    expect(useStudioStore.getState().bpm).toBe(128);

    await executeMcpCommand('set_macro', { id: 1, value: 0.85, label: 'AI Filter' });
    const m1 = useStudioStore.getState().macros.find((m) => m.id === 1);
    expect(m1?.value).toBeCloseTo(0.85, 3);
    expect(m1?.label).toBe('AI Filter');

    await executeMcpCommand('set_track', { trackId: 'drums', muted: true, lpf: 2400 });
    const drums = useStudioStore.getState().tracks.find((t) => t.id === 'drums');
    expect(drums?.muted).toBe(true);
    expect(drums?.lpf).toBe(2400);

    await executeMcpCommand('set_master_gain', { gain: 0.72 });
    expect(useStudioStore.getState().masterGain).toBeCloseTo(0.72, 2);
  });

  it('updates pattern code without playing when play=false', async () => {
    const code = 's("bd*4, hh*8").bank("RolandTR909")';
    const res = (await executeMcpCommand('set_pattern', {
      code,
      play: false,
      bpm: 130,
    })) as { ok: boolean; bpm: number };
    expect(res.ok).toBe(true);
    expect(res.bpm).toBe(130);
    expect(useStudioStore.getState().code).toBe(code);
  });
});
