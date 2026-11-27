export type HoverToneKind = 'patch' | 'keys' | 'deck' | 'matrix' | 'enter' | 'link';

class UiSoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private lastPlayedAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock(): void {
    this.ensureContext();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Minimal, ultra-subtle tactile hover micro-sound (Teenage Engineering / studio hardware vibe)
   */
  playHover(kind: HoverToneKind = 'link'): void {
    if (!this.enabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastPlayedAt < 75) return;
    this.lastPlayedAt = nowMs;

    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(kind === 'enter' ? 2400 : 1800, now);
    filter.connect(ctx.destination);

    const playTone = (
      freqStart: number,
      freqEnd: number,
      duration: number,
      peakGain: number,
      type: OscillatorType = 'sine'
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    };

    switch (kind) {
      case 'patch':
        playTone(660, 587.33, 0.055, 0.028, 'triangle');
        break;
      case 'keys':
        playTone(523.25, 523.25, 0.09, 0.03, 'sine');
        break;
      case 'deck':
        playTone(220, 146.83, 0.065, 0.032, 'sine');
        break;
      case 'matrix':
        playTone(880, 783.99, 0.05, 0.022, 'sine');
        break;
      case 'enter':
        playTone(392.0, 392.0, 0.12, 0.028, 'sine');
        playTone(587.33, 587.33, 0.14, 0.018, 'triangle');
        break;
      default:
        playTone(740, 740, 0.04, 0.018, 'sine');
        break;
    }
  }

  /**
   * Subtle futuristic harmonic chord swell when clicking ENTER
   */
  playEnterChime(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const freqs = [261.63, 392.0, 523.25];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.9);
    filter.connect(ctx.destination);

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.075 : 0.038, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + 0.9);
    });
  }
}

export const uiSound = new UiSoundService();
