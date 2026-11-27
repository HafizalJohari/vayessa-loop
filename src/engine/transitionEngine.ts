import type { FadeStyle, PlaylistItem } from '@/types/studio';
import { useStudioStore } from '@/store/useStudioStore';
import { strudelEngine } from '@/engine/strudelEngine';
import { hydraBridge } from '@/engine/hydraBridge';
import { HYDRA_PRESETS } from '@/data/hydraPresets';

function applyTrackHydraVisual(item: PlaylistItem): void {
  if (!item.hydraPresetId) return;
  const store = useStudioStore.getState();
  const allHydra = [...store.customHydraPresets, ...HYDRA_PRESETS];
  const visual = allHydra.find((h) => h.id === item.hydraPresetId);
  if (visual) {
    store.setHydraCode(visual.code, visual.id);
    hydraBridge.sendCode(visual.code, visual.id);
  }
}

/**
 * Pure helper computing equal-power fade gain & LPF cutoff at normalized progress p in [0..1].
 * p in [0..0.5) = fade out of outgoing track; p in [0.5..1] = fade in of incoming track.
 */
export function computeFadeCurve(
  progress: number,
  style: FadeStyle
): { gain: number; lpf: number } {
  const p = Math.max(0, Math.min(1, progress));
  if (style === 'cut') {
    return { gain: 1, lpf: 18000 };
  }

  // Outgoing half (0 -> 0.5) ramps 1 -> 0; incoming half (0.5 -> 1) ramps 0 -> 1
  const local = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2;
  // Smooth cosine ease
  const smoothGain = 0.5 - 0.5 * Math.cos(local * Math.PI);

  if (style === 'filter') {
    const lpf = Math.round(250 + smoothGain * (18000 - 250));
    return { gain: Math.max(0.05, smoothGain), lpf };
  }

  return { gain: smoothGain, lpf: 18000 };
}

class PlaylistTransitionService {
  private activeRaf: number | null = null;
  private cancelled = false;

  cancel(): void {
    this.cancelled = true;
    if (this.activeRaf !== null) {
      cancelAnimationFrame(this.activeRaf);
      this.activeRaf = null;
    }
    strudelEngine.setTransitionState(1, 18000);
    useStudioStore.getState().setTransitionStatus(false, 0, '');
  }

  async transitionToTrack(item: PlaylistItem): Promise<void> {
    this.cancel();
    this.cancelled = false;

    const store = useStudioStore.getState();
    const shouldFade =
      store.isPlaying && item.fadeStyle !== 'cut' && item.fadeSeconds > 0;

    if (!shouldFade) {
      store.setActivePlaylistId(item.id);
      store.setCode(item.code);
      strudelEngine.setBpm(item.bpm);
      strudelEngine.setTransitionState(1, 18000);
      await strudelEngine.evaluate(item.code);
      applyTrackHydraVisual(item);
      hydraBridge.sendOverlay(store.hydraShowOverlay, item.title, item.bpm);
      return;
    }

    const totalMs = Math.max(400, item.fadeSeconds * 1000);
    const startTime = performance.now();
    let swapped = false;

    store.setTransitionStatus(
      true,
      0,
      `Fading → ${item.title} (${item.fadeSeconds}s ${item.fadeStyle})`
    );

    return new Promise<void>((resolve) => {
      const step = async (now: number) => {
        if (this.cancelled) {
          resolve();
          return;
        }

        const progress = Math.min(1, (now - startTime) / totalMs);
        const { gain, lpf } = computeFadeCurve(progress, item.fadeStyle);
        strudelEngine.setTransitionState(gain, lpf);
        useStudioStore
          .getState()
          .setTransitionStatus(
            true,
            progress,
            `Fading → ${item.title} (${Math.round(progress * 100)}%)`
          );

        if (!swapped && progress >= 0.5) {
          swapped = true;
          const s = useStudioStore.getState();
          s.setActivePlaylistId(item.id);
          s.setCode(item.code);
          strudelEngine.setBpm(item.bpm);
          await strudelEngine.evaluate(item.code);
          applyTrackHydraVisual(item);
          hydraBridge.sendOverlay(s.hydraShowOverlay, item.title, item.bpm);
        }

        if (progress < 1) {
          this.activeRaf = requestAnimationFrame((t) => void step(t));
        } else {
          this.activeRaf = null;
          strudelEngine.setTransitionState(1, 18000);
          useStudioStore.getState().setTransitionStatus(false, 0, '');
          resolve();
        }
      };

      this.activeRaf = requestAnimationFrame((t) => void step(t));
    });
  }

  async playNext(): Promise<PlaylistItem | null> {
    const { playlist, activePlaylistId } = useStudioStore.getState();
    if (playlist.length === 0) return null;
    const idx = playlist.findIndex((p) => p.id === activePlaylistId);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % playlist.length;
    const target = playlist[nextIdx];
    await this.transitionToTrack(target);
    return target;
  }

  async playPrev(): Promise<PlaylistItem | null> {
    const { playlist, activePlaylistId } = useStudioStore.getState();
    if (playlist.length === 0) return null;
    const idx = playlist.findIndex((p) => p.id === activePlaylistId);
    const prevIdx = idx <= 0 ? playlist.length - 1 : idx - 1;
    const target = playlist[prevIdx];
    await this.transitionToTrack(target);
    return target;
  }
}

export const transitionEngine = new PlaylistTransitionService();
