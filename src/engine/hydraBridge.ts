import { useStudioStore } from '@/store/useStudioStore';

export const HYDRA_CHANNEL_NAME = 'strudel-studio-hydra';

export type HydraBroadcastMessage =
  | {
      type: 'eval_hydra';
      code: string;
      presetId?: string;
    }
  | {
      type: 'telemetry';
      bass: number;
      mid: number;
      high: number;
      volume: number;
      bpm: number;
      isPlaying: boolean;
      macros: number[];
    }
  | {
      type: 'overlay';
      showOverlay: boolean;
      trackTitle: string;
      bpm: number;
    }
  | {
      type: 'init_cam';
    }
  | {
      type: 'inline_hydra_ready';
    }
  | {
      type: 'projection_3d';
      rotateX: number; // -35..35 deg
      rotateY: number; // -35..35 deg
      scale: number; // 0.7..1.3
      showGrid: boolean;
    }
  | {
      type: 'stage_ping';
    }
  | {
      type: 'stage_pong';
    };

class HydraBridgeService {
  private channel: BroadcastChannel | null = null;
  private stageWindow: Window | null = null;

  private ensureChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === 'undefined') return null;
    if (!this.channel) {
      this.channel = new BroadcastChannel(HYDRA_CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<HydraBroadcastMessage>) => {
        const msg = event.data;
        if (!msg) return;
        if (msg.type === 'stage_pong') {
          useStudioStore.getState().setHydraStageConnected(true);
        } else if (msg.type === 'stage_ping') {
          // Stage window just opened and wants current code & overlay
          const s = useStudioStore.getState();
          this.sendCode(s.hydraCode, s.hydraPresetId);
          const activeTrack = s.playlist.find((p) => p.id === s.activePlaylistId);
          this.sendOverlay(s.hydraShowOverlay, activeTrack?.title ?? 'Strudel Studio Live', s.bpm);
          s.setHydraStageConnected(true);
        }
      };
    }
    return this.channel;
  }

  init(): void {
    const ch = this.ensureChannel();
    if (ch) {
      ch.postMessage({ type: 'stage_ping' } satisfies HydraBroadcastMessage);
    }
  }

  openSecondMonitorWindow(): Window | null {
    if (typeof window === 'undefined') return null;
    this.ensureChannel();
    const url = `${window.location.origin}${window.location.pathname}?view=hydra`;
    const win = window.open(
      url,
      'strudel-hydra-stage',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    if (win) {
      this.stageWindow = win;
      win.focus();
      useStudioStore.getState().setHydraStageConnected(true);
      setTimeout(() => {
        const s = useStudioStore.getState();
        this.sendCode(s.hydraCode, s.hydraPresetId);
        const activeTrack = s.playlist.find((p) => p.id === s.activePlaylistId);
        this.sendOverlay(s.hydraShowOverlay, activeTrack?.title ?? 'Strudel Studio Live', s.bpm);
      }, 600);
    }
    return win;
  }

  sendCode(code: string, presetId?: string): void {
    const ch = this.ensureChannel();
    ch?.postMessage({ type: 'eval_hydra', code, presetId } satisfies HydraBroadcastMessage);
  }

  triggerWebcamOnStage(): void {
    const ch = this.ensureChannel();
    ch?.postMessage({ type: 'init_cam' } satisfies HydraBroadcastMessage);
  }

  notifyInlineHydraReady(): void {
    const ch = this.ensureChannel();
    ch?.postMessage({ type: 'inline_hydra_ready' } satisfies HydraBroadcastMessage);
  }

  sendProjection3D(cfg: {
    rotateX: number;
    rotateY: number;
    scale: number;
    showGrid: boolean;
  }): void {
    const ch = this.ensureChannel();
    ch?.postMessage({ type: 'projection_3d', ...cfg } satisfies HydraBroadcastMessage);
  }

  sendOverlay(showOverlay: boolean, trackTitle: string, bpm: number): void {
    const ch = this.ensureChannel();
    ch?.postMessage({
      type: 'overlay',
      showOverlay,
      trackTitle,
      bpm,
    } satisfies HydraBroadcastMessage);
  }

  sendTelemetry(payload: {
    bass: number;
    mid: number;
    high: number;
    volume: number;
    bpm: number;
    isPlaying: boolean;
    macros: number[];
  }): void {
    const ch = this.ensureChannel();
    ch?.postMessage({ type: 'telemetry', ...payload } satisfies HydraBroadcastMessage);
  }

  isStageOpen(): boolean {
    return Boolean(this.stageWindow && !this.stageWindow.closed);
  }
}

export const hydraBridge = new HydraBridgeService();
