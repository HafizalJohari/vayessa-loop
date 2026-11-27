import * as strudelCore from '@strudel/core';
import * as strudelMini from '@strudel/mini';
import * as strudelWebaudio from '@strudel/webaudio';
import * as strudelTonal from '@strudel/tonal';
import * as strudelMidi from '@strudel/midi';
import * as strudelDraw from '@strudel/draw';
import { transpiler } from '@strudel/transpiler';
import { useStudioStore } from '@/store/useStudioStore';
import { parseStrudelError } from '@/engine/errorDiagnostics';
import { hydraBridge } from '@/engine/hydraBridge';
import { samplerEngine } from '@/engine/samplerEngine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPattern = any;

export interface ActiveHapView {
  note: number; // MIDI note 0..127
  start: number; // cycle start
  end: number; // cycle end
  label: string;
  color: string;
}

class StrudelEngineService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private replInstance: any = null;
  private analyser: AnalyserNode | null = null;
  private activePattern: AnyPattern = null;
  private onEvalListeners = new Set<(code: string) => void>();

  // Smooth transition & metronome state
  private transitionGain = 1;
  private transitionLpf = 18000;
  private metronomeTimer: number | null = null;
  private metronomeBeat = 0;
  private lastEvalError: unknown = null;
  private inlineHydraBooted = false;
  private hydraAudioRaf: number | null = null;

  /**
   * Ensure Strudel evalScope, audio context, synth sounds, soundfonts & drum banks are loaded.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const store = useStudioStore.getState();
      store.setStatusMessage('Initializing Strudel Audio Engine...');

      // 1. Initialize WebAudio context on user gesture
      try {
        await strudelWebaudio.initAudio();
      } catch {
        strudelWebaudio.initAudioOnFirstClick();
      }

      // 2. Register built-in synths and soundfonts (lazy-loaded)
      try {
        await strudelWebaudio.registerSynthSounds();
      } catch (err) {
        console.warn('[StrudelEngine] registerSynthSounds warning:', err);
      }

      try {
        const sf = await import('@strudel/soundfonts');
        if (typeof sf.registerSoundfonts === 'function') {
          await sf.registerSoundfonts();
        }
      } catch (err) {
        console.warn('[StrudelEngine] registerSoundfonts warning:', err);
      }

      // 3. Load core drum machines (TR-808, TR-909, LinnDrum, etc.) & dirt-samples
      try {
        const samplesFn = strudelWebaudio.samples as (src: string) => Promise<unknown>;
        if (typeof samplesFn === 'function') {
          await Promise.allSettled([
            samplesFn(
              'https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json'
            ),
            samplesFn('github:tidalcycles/dirt-samples'),
          ]);
        }
        await samplerEngine.loadSavedSamples();
        await samplerEngine.registerAllWithStrudel();
      } catch {
        // Ignore offline sample load errors
      }

      // 4. Patch Pattern.prototype with strudel.cc inline visualizer shims so pasted external code works 100%
      this.registerExternalCompatShims();

      // 5. Register all official Strudel modules + Studio custom globals into evalScope
      const studioGlobals = this.createStudioGlobals();
      await strudelCore.evalScope(
        strudelCore,
        strudelMini,
        strudelWebaudio,
        strudelTonal,
        strudelMidi,
        strudelDraw,
        studioGlobals
      );

      // 6. Create Strudel REPL scheduler instance
      this.replInstance = strudelCore.repl({
        defaultOutput: strudelWebaudio.webaudioOutput,
        getTime: () => strudelWebaudio.getAudioContext().currentTime,
        transpiler,
        onEvalError: (err: unknown) => {
          this.lastEvalError = err;
        },
        onToggle: (started: boolean) => {
          useStudioStore.getState().setIsPlaying(started);
        },
        afterEval: ({ pattern }: { pattern?: AnyPattern }) => {
          if (pattern) {
            this.activePattern = pattern;
          }
        },
      });

      // 7. Attach AnalyserNode for 60fps Oscilloscope, Level Meter & Hydra FFT broadcast
      this.setupAnalyser();

      this.initialized = true;
      useStudioStore.getState().setAudioReady(true);
      useStudioStore.getState().setStatusMessage('Engine Ready');
    })();

    return this.initPromise;
  }

  /**
   * Ensure external code pasted from strudel.cc (using ._pianoroll(), ._punchcard(),
   * ._scope(), ._spectrum(), ._spiral(), ._pitchwheel(), etc.) executes smoothly without throwing.
   */
  private registerExternalCompatShims() {
    const PatternClass = strudelCore.Pattern as { prototype: Record<string, unknown> } | undefined;
    if (!PatternClass?.prototype) return;

    const visualMethods = [
      '_pianoroll',
      'pianoroll',
      '_punchcard',
      'punchcard',
      '_scope',
      'scope',
      '_spectrum',
      'spectrum',
      '_spiral',
      'spiral',
      '_pitchwheel',
      'pitchwheel',
      '_slider',
      'color',
    ];

    for (const method of visualMethods) {
      if (typeof PatternClass.prototype[method] !== 'function') {
        PatternClass.prototype[method] = function () {
          return this;
        };
      }
    }
  }

  /**
   * Custom Studio helpers + strudel.cc compatibility globals injected into evalScope.
   */
  private createStudioGlobals() {
    const createSignal = strudelCore.signal as (fn: (t: number) => number) => AnyPattern;

    const makeMacroSignal = (index: number) => {
      return createSignal(() => {
        const macro = useStudioStore.getState().macros.find((m) => m.id === index);
        return macro ? macro.value : 0.5;
      });
    };

    const track = (name: string, pattern: AnyPattern) => {
      const id = String(name).toLowerCase();
      if (!pattern || typeof pattern.postgain !== 'function') return pattern;

      const gainSignal = createSignal(() => {
        const state = useStudioStore.getState();
        const master = state.masterGain * this.transitionGain;
        const found = state.tracks.find((t) => t.id === id);
        if (!found) return master;
        const anySolo = state.tracks.some((t) => t.solo);
        if (anySolo && !found.solo) return 0;
        if (found.muted) return 0;
        return found.gain * master;
      });

      const lpfSignal = createSignal(() => {
        const found = useStudioStore.getState().tracks.find((t) => t.id === id);
        const trackLpf = found ? found.lpf : 18000;
        return Math.min(trackLpf, this.transitionLpf);
      });

      return pattern.postgain(gainSignal).lpf(lpfSignal);
    };

    // Compatible slider() helper for pasted strudel.cc code (e.g. .lpf(slider(800, 100, 4000)))
    const slider = (value: number) => Number(value) || 0;
    const sliderWithID = (_id: string, value: number) => Number(value) || 0;

    // Compatible initHydra() that boots real hydra-synth with makeGlobal: true
    // so s0..s3, o0..o3, osc(), noise(), voronoi(), render(), and a.fft[0..3] work 100% like strudel.cc!
    const initHydra = async (options?: Record<string, unknown>) => {
      void options;
      hydraBridge.init();
      await this.bootInlineHydra();
      return true;
    };
    const H = (pat: AnyPattern) => pat;

    // Live Visual Oscillator synth bridge: wrap any note pattern with oscSynth(note("c3 eb3 g3"))
    // and tweak Oscillator sliders live without restarting playback!
    const oscSynth = (pattern: AnyPattern) => {
      if (!pattern || typeof pattern.s !== 'function') return pattern;
      const oscVal = <K extends keyof ReturnType<typeof useStudioStore.getState>['oscillator']>(
        key: K
      ) => createSignal(() => useStudioStore.getState().oscillator[key] as unknown as number);

      return pattern
        .s(createSignal(() => useStudioStore.getState().oscillator.waveform as unknown as number))
        .lpf(oscVal('lpf'))
        .lpq(oscVal('lpq'))
        .fm(oscVal('fm'))
        .fmh(oscVal('fmh'))
        .attack(oscVal('attack'))
        .decay(oscVal('decay'))
        .sustain(oscVal('sustain'))
        .release(oscVal('release'))
        .room(oscVal('room'))
        .delay(oscVal('delay'))
        .gain(oscVal('gain'));
    };

    return {
      macro: (index: number) => makeMacroSignal(index),
      m1: makeMacroSignal(1),
      m2: makeMacroSignal(2),
      m3: makeMacroSignal(3),
      m4: makeMacroSignal(4),
      m5: makeMacroSignal(5),
      m6: makeMacroSignal(6),
      m7: makeMacroSignal(7),
      m8: makeMacroSignal(8),
      track,
      oscSynth,
      slider,
      sliderWithID,
      hush: () => this.stop(),
      initHydra,
      H,
    };
  }

  private getSuperdoughDestinationGain(): GainNode | null {
    try {
      const sd = strudelWebaudio as unknown as {
        getSuperdoughAudioController?: () => { output?: { destinationGain?: GainNode } };
      };
      return sd.getSuperdoughAudioController?.()?.output?.destinationGain ?? null;
    } catch {
      return null;
    }
  }

  private setupAnalyser() {
    try {
      const ctx = strudelWebaudio.getAudioContext();
      if (!ctx || this.analyser) return;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      this.analyser = analyser;

      const destGain = this.getSuperdoughDestinationGain();
      if (destGain && typeof destGain.connect === 'function') {
        destGain.connect(analyser);
      }
    } catch (err) {
      console.warn('[StrudelEngine] Analyser attach skipped:', err);
    }
  }

  getAnalyserNode(): AnalyserNode | null {
    if (!this.analyser && this.initialized) {
      this.setupAnalyser();
    }
    return this.analyser;
  }

  /**
   * Boot a real hydra-synth instance in the main window (just like strudel.cc's initHydra)
   * exposing s0..s3, o0..o3, osc, noise, voronoi, shape, src, render, and audio-reactive a.fft[0..3].
   */
  private async bootInlineHydra(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this.inlineHydraBooted) return;

    const win = window as unknown as Record<string, unknown>;
    win.global = globalThis;

    let canvas = document.getElementById('strudel-hydra-inline-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'strudel-hydra-inline-canvas';
      canvas.width = 1280;
      canvas.height = 720;
      // Keep inline Hydra offscreen so the main DAW UI stays clean;
      // the 2nd Monitor window (/?view=hydra) mirrors this canvas live at 60fps!
      Object.assign(canvas.style, {
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '1280px',
        height: '720px',
        pointerEvents: 'none',
        opacity: '0',
      });
      document.body.appendChild(canvas);
    }

    win.__strudelInlineHydraCanvas = canvas;
    hydraBridge.notifyInlineHydraReady();

    const mod = await import('hydra-synth');
    const HydraCtor = mod.default ?? mod;
    new HydraCtor({
      canvas,
      detectAudio: false,
      makeGlobal: true,
    });

    // Provide strudel.cc-compatible `a.fft[0..3]` driven by Strudel's WebAudio AnalyserNode
    const audioShim = {
      fft: [0, 0, 0, 0],
      setBins: () => {},
      setSmooth: () => {},
      setScale: () => {},
      setCutoff: () => {},
      show: () => {},
      hide: () => {},
    };
    win.a = audioShim;

    // Register Hydra globals into Strudel's evalScope so bare s0, o0, osc, render, a work in strict eval
    const hydraGlobalNames = [
      's0', 's1', 's2', 's3',
      'o0', 'o1', 'o2', 'o3',
      'osc', 'noise', 'voronoi', 'shape', 'gradient', 'solid', 'src', 'render',
      'time', 'speed', 'bpm', 'a', 'setResolution', 'hush',
    ];
    const hydraScope: Record<string, unknown> = {};
    for (const key of hydraGlobalNames) {
      if (key in win && key !== 'hush') {
        hydraScope[key] = win[key];
      }
    }
    await strudelCore.evalScope(hydraScope);

    // 60fps audio FFT feed into window.a.fft[0..3]
    if (this.hydraAudioRaf === null) {
      const freqBuf = new Uint8Array(128);
      const feedLoop = () => {
        const analyser = this.getAnalyserNode();
        if (analyser && useStudioStore.getState().isPlaying) {
          analyser.getByteFrequencyData(freqBuf);
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0;
          for (let i = 0; i < 8; i++) b0 += freqBuf[i];
          for (let i = 8; i < 24; i++) b1 += freqBuf[i];
          for (let i = 24; i < 56; i++) b2 += freqBuf[i];
          for (let i = 56; i < 110; i++) b3 += freqBuf[i];
          audioShim.fft[0] = b0 / (8 * 255);
          audioShim.fft[1] = b1 / (16 * 255);
          audioShim.fft[2] = b2 / (32 * 255);
          audioShim.fft[3] = b3 / (54 * 255);
        } else {
          audioShim.fft[0] *= 0.9;
          audioShim.fft[1] *= 0.9;
          audioShim.fft[2] *= 0.9;
          audioShim.fft[3] *= 0.9;
        }
        this.hydraAudioRaf = requestAnimationFrame(feedLoop);
      };
      this.hydraAudioRaf = requestAnimationFrame(feedLoop);
    }

    this.inlineHydraBooted = true;
  }

  /**
   * Apply smooth master fade gain (works for ALL patterns, including pasted external syntax!)
   */
  setTransitionState(gain: number, lpfHz = 18000): void {
    this.transitionGain = Math.max(0, Math.min(1, gain));
    this.transitionLpf = Math.max(200, Math.min(18000, lpfHz));

    const destGain = this.getSuperdoughDestinationGain();
    if (destGain) {
      try {
        const ctx = strudelWebaudio.getAudioContext();
        const master = useStudioStore.getState().masterGain;
        destGain.gain.setTargetAtTime(
          Math.max(0.0001, master * this.transitionGain),
          ctx.currentTime,
          0.02
        );
      } catch {
        // ignore
      }
    }
  }

  /**
   * Update master gain immediately on WebAudio destination node as well
   */
  applyMasterGain(gain: number): void {
    const destGain = this.getSuperdoughDestinationGain();
    if (destGain) {
      try {
        const ctx = strudelWebaudio.getAudioContext();
        destGain.gain.setTargetAtTime(
          Math.max(0.0001, gain * this.transitionGain),
          ctx.currentTime,
          0.02
        );
      } catch {
        // ignore
      }
    }
  }

  /**
   * Evaluate Strudel code string & start playback.
   * Implements Safe-Eval Guard: if already playing and new code has a syntax error,
   * keeps previous audio running while popping up the exact diagnostic!
   */
  async evaluate(code: string): Promise<boolean> {
    const wasPlaying = useStudioStore.getState().isPlaying;
    try {
      await this.init();
      const ctx = strudelWebaudio.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const state = useStudioStore.getState();
      const effectiveBpm = state.bpm * state.practiceSpeed;

      // Only pre-set CPS if the pasted code doesn't declare its own setcpm/setcps
      const hasExplicitTempo = /\b(setcpm|setcps)\s*\(/.test(code);
      if (!hasExplicitTempo && this.replInstance?.scheduler?.setCps) {
        this.replInstance.scheduler.setCps(effectiveBpm / 60 / 4);
      }

      this.lastEvalError = null;
      await this.replInstance.evaluate(code, true);
      if (this.lastEvalError) {
        throw this.lastEvalError;
      }

      // If practice speed != 1x and code had setcpm, scale active cps gently
      if (hasExplicitTempo && state.practiceSpeed !== 1 && this.replInstance?.scheduler?.cps) {
        this.replInstance.scheduler.setCps(
          this.replInstance.scheduler.cps * state.practiceSpeed
        );
      }

      useStudioStore.getState().setActiveError(null);
      useStudioStore.getState().setSyntaxDiagnostic(null);
      useStudioStore.getState().setIsPlaying(true);
      useStudioStore
        .getState()
        .setStatusMessage(
          `Playing @ ${Math.round(effectiveBpm)} BPM${
            state.practiceSpeed !== 1 ? ` (${state.practiceSpeed}x)` : ''
          }`
        );

      if (state.metronomeEnabled) {
        this.startMetronome();
      }

      this.onEvalListeners.forEach((cb) => cb(code));
      return true;
    } catch (err) {
      const diagnostic = parseStrudelError(err, code, wasPlaying);
      useStudioStore.getState().setActiveError(diagnostic.message);
      useStudioStore.getState().setSyntaxDiagnostic(diagnostic);
      useStudioStore
        .getState()
        .setStatusMessage(
          wasPlaying
            ? `Syntax Error (Line ${diagnostic.line}) — Safe-Eval kept audio playing`
            : `Syntax Error at Line ${diagnostic.line}, Col ${diagnostic.column}`
        );
      return false;
    }
  }

  /**
   * Stop playback (hush)
   */
  stop(): void {
    this.stopMetronome();
    try {
      if (this.replInstance?.stop) {
        this.replInstance.stop();
      }
      if (this.replInstance?.setPattern) {
        this.replInstance.setPattern(strudelCore.silence);
      }
    } catch {
      // ignore
    }
    this.activePattern = null;
    useStudioStore.getState().setIsPlaying(false);
    useStudioStore.getState().setStatusMessage('Stopped');
  }

  /**
   * Update tempo smoothly while playing (respects practiceSpeed multiplier)
   */
  setBpm(bpm: number): void {
    const clamped = Math.max(40, Math.min(240, Math.round(bpm)));
    useStudioStore.getState().setBpm(clamped);
    this.syncEffectiveTempo();
  }

  setPracticeSpeed(speed: number): void {
    useStudioStore.getState().setPracticeSpeed(speed);
    this.syncEffectiveTempo();
  }

  private syncEffectiveTempo(): void {
    const { bpm, practiceSpeed, metronomeEnabled, isPlaying } = useStudioStore.getState();
    const effectiveBpm = bpm * practiceSpeed;
    try {
      if (this.replInstance?.scheduler?.setCps) {
        this.replInstance.scheduler.setCps(effectiveBpm / 60 / 4);
      }
    } catch {
      // ignore
    }
    if (metronomeEnabled && isPlaying) {
      this.startMetronome();
    }
  }

  /**
   * Practice Mode WebAudio Metronome Click Track
   */
  setMetronome(enabled: boolean): void {
    useStudioStore.getState().setMetronomeEnabled(enabled);
    if (enabled) {
      this.startMetronome();
    } else {
      this.stopMetronome();
    }
  }

  private startMetronome(): void {
    this.stopMetronome();
    const { bpm, practiceSpeed } = useStudioStore.getState();
    const intervalMs = Math.max(150, Math.round(60000 / (bpm * practiceSpeed)));
    this.metronomeBeat = 0;

    const click = () => {
      try {
        const ctx = strudelWebaudio.getAudioContext();
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const isAccent = this.metronomeBeat % 4 === 0;
        osc.frequency.value = isAccent ? 1200 : 820;
        gain.gain.setValueAtTime(isAccent ? 0.22 : 0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
        this.metronomeBeat++;
      } catch {
        // ignore if audio not yet unlocked
      }
    };

    click();
    this.metronomeTimer = window.setInterval(click, intervalMs);
  }

  private stopMetronome(): void {
    if (this.metronomeTimer !== null) {
      window.clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
  }

  getCurrentCycle(): number {
    try {
      if (this.replInstance?.scheduler?.now) {
        return Number(this.replInstance.scheduler.now()) || 0;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  getWindowHaps(windowCycles = 2): ActiveHapView[] {
    if (!this.activePattern || typeof this.activePattern.queryArc !== 'function') {
      return [];
    }
    try {
      const now = this.getCurrentCycle();
      const from = Math.max(0, now - windowCycles * 0.65);
      const to = now + windowCycles * 0.35;
      const haps = this.activePattern.queryArc(from, to) as Array<{
        whole?: { begin: { valueOf(): number }; end: { valueOf(): number } };
        part: { begin: { valueOf(): number }; end: { valueOf(): number } };
        value?: Record<string, unknown>;
      }>;

      const palette = ['#34d399', '#38bdf8', '#a78bfa', '#f59e0b', '#f472b6'];
      return haps.slice(0, 120).map((hap) => {
        const val = hap.value ?? {};
        const start = Number((hap.whole ?? hap.part).begin.valueOf());
        const end = Number((hap.whole ?? hap.part).end.valueOf());
        const rawNote = val.note;
        const sound = String(val.s ?? 'note');

        let midiNum = 60;
        if (typeof rawNote === 'number') {
          midiNum = rawNote;
        } else if (typeof rawNote === 'string') {
          midiNum = this.noteStringToMidi(rawNote);
        } else {
          midiNum = 36 + (this.hashString(sound) % 24);
        }

        return {
          note: midiNum,
          start,
          end: Math.max(end, start + 0.06),
          label: rawNote ? String(rawNote) : sound,
          color: palette[this.hashString(sound) % palette.length],
        };
      });
    } catch {
      return [];
    }
  }

  async triggerOneShot(params: {
    s: string;
    bank?: string;
    note?: string;
    gain?: number;
    duration?: number;
  }): Promise<void> {
    try {
      await this.init();
      const ctx = strudelWebaudio.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const sd = strudelWebaudio as unknown as {
        superdough?: (value: Record<string, unknown>, t: number, hapDuration: number) => void;
      };
      if (typeof sd.superdough === 'function') {
        const master = useStudioStore.getState().masterGain;
        sd.superdough(
          {
            s: params.s,
            ...(params.bank ? { bank: params.bank } : {}),
            ...(params.note ? { note: params.note } : {}),
            gain: (params.gain ?? 0.75) * master,
          },
          ctx.currentTime + 0.01,
          params.duration ?? 0.35
        );
      }
    } catch (err) {
      console.warn('[StrudelEngine] triggerOneShot error:', err);
    }
  }

  async auditionOscillatorNote(noteStr: string, duration = 0.55, velocityScale = 1): Promise<void> {
    try {
      await this.init();
      const ctx = strudelWebaudio.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const sd = strudelWebaudio as unknown as {
        superdough?: (value: Record<string, unknown>, t: number, hapDuration: number) => void;
      };
      if (typeof sd.superdough === 'function') {
        const state = useStudioStore.getState();
        const o = state.oscillator;
        sd.superdough(
          {
            s: o.waveform,
            note: noteStr,
            lpf: o.lpf,
            lpq: o.lpq,
            ...(o.fm > 0.05 ? { fm: o.fm, fmh: o.fmh } : {}),
            attack: o.attack,
            decay: o.decay,
            sustain: o.sustain,
            release: o.release,
            ...(o.vib > 0.1 ? { vib: o.vib, vibmod: o.vibmod } : {}),
            room: o.room,
            delay: o.delay,
            gain: o.gain * velocityScale * state.masterGain,
          },
          ctx.currentTime + 0.01,
          duration
        );
      }
    } catch (err) {
      console.warn('[StrudelEngine] auditionOscillatorNote error:', err);
    }
  }

  onEvaluate(listener: (code: string) => void): () => void {
    this.onEvalListeners.add(listener);
    return () => this.onEvalListeners.delete(listener);
  }

  private noteStringToMidi(noteStr: string): number {
    const match = /^([a-gA-G])([#b]?)(-?\d)$/.exec(noteStr.trim());
    if (!match) return 60;
    const baseMap: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
    let semitone = baseMap[match[1].toLowerCase()] ?? 0;
    if (match[2] === '#') semitone += 1;
    if (match[2] === 'b') semitone -= 1;
    const octave = parseInt(match[3], 10);
    return Math.max(0, Math.min(127, (octave + 1) * 12 + semitone));
  }

  private hashString(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }
}

export const strudelEngine = new StrudelEngineService();
