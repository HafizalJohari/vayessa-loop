import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Keyboard, Patch, Phosphor, Turntable } from '@lucasmarkes/hairline/react';
import { WebGpuBackdrop, type GpuRendererMode } from '@/components/Welcome/WebGpuBackdrop';
import { strudelEngine } from '@/engine/strudelEngine';

interface WelcomeScreenProps {
  onEnter: () => void;
}

/**
 * Play a subtle, futuristic harmonic chime via WebAudio on Enter click
 * while simultaneously unlocking the browser AudioContext.
 */
function playEnterChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
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
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.08 : 0.04, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + 0.9);
    });
  } catch {
    // ignore if audio unavailable
  }
}

const HAIRLINE_THEME_VARS: React.CSSProperties = {
  ['--hairline-plate' as string]: '#0b0e14',
  ['--hairline-hi' as string]: '#34d399',
  ['--hairline-edge' as string]: '#94a3b8',
  ['--hairline-mid' as string]: '#475569',
  ['--hairline-lo' as string]: '#1e293b',
  ['--hairline-stroke' as string]: '0.9',
};

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [gpuMode, setGpuMode] = useState<GpuRendererMode>('initializing');
  const [exiting, setExiting] = useState(false);

  const handleEnter = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    playEnterChime();
    void strudelEngine.init();
    window.setTimeout(() => {
      onEnter();
    }, 420);
  }, [exiting, onEnter]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleEnter();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleEnter]);

  return (
    <div
      style={HAIRLINE_THEME_VARS}
      className={`fixed inset-0 z-50 bg-[#080a0e] text-[#eef2f8] overflow-hidden select-none transition-all duration-500 ${
        exiting ? 'opacity-0 scale-[1.03]' : 'opacity-100 scale-100'
      }`}
    >
      {/* vgpu WebGPU WGSL Shader Canvas */}
      <WebGpuBackdrop onModeChange={setGpuMode} />

      {/* Architectural Hairline Framing & Precision Axes */}
      <div className="pointer-events-none fixed inset-4 sm:inset-7 border border-white/[0.09]">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.05]" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.05]" />
        <span className="absolute -top-2 -left-2 text-[11px] font-mono text-white/35 leading-none">+</span>
        <span className="absolute -top-2 -right-2 text-[11px] font-mono text-white/35 leading-none">+</span>
        <span className="absolute -bottom-2 -left-2 text-[11px] font-mono text-white/35 leading-none">+</span>
        <span className="absolute -bottom-2 -right-2 text-[11px] font-mono text-white/35 leading-none">+</span>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 h-full w-full flex flex-col justify-between p-7 sm:p-11">
        {/* Top Hairline Telemetry Bar */}
        <header className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono tracking-[0.22em] uppercase text-white/55 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                gpuMode === 'webgpu'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]'
              }`}
            />
            <span>
              {gpuMode === 'webgpu'
                ? 'VGPU // WEBGPU WGSL + HAIRLINE'
                : gpuMode === 'fallback'
                  ? 'GPU // 2D FALLBACK + HAIRLINE'
                  : 'INITIALIZING GPU'}
            </span>
          </div>

          <div className="hidden md:block text-white/35">
            44.1KHZ · 24-BIT · WEBAUDIO · WEBMIDI · HYDRA
          </div>

          <a
            href="https://codeberg.org/uzu/strudel"
            target="_blank"
            rel="noreferrer"
            className="text-white/50 hover:text-emerald-300 transition-colors"
          >
            POWERED BY STRUDEL
          </a>
        </header>

        {/* Center 3-Column Stage: Left Hairline Figures | Dead-Center ENTER | Right Hairline Figures */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] xl:grid-cols-[260px_1fr_260px] items-center gap-6 py-4 min-h-0">
          {/* Left Interactive Isometric Hairline Instruments */}
          <div className="hidden lg:flex flex-col gap-4">
            <div className="p-2.5 rounded-xl bg-[#0b0e14]/75 backdrop-blur-sm border border-white/[0.08]">
              <Patch play intensity={0.75} theme="dark" />
              <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono tracking-[0.2em] uppercase text-white/40">
                <span>01 // PATCH</span>
                <span className="text-emerald-400/75">MIDI + ROUTING</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b0e14]/75 backdrop-blur-sm border border-white/[0.08]">
              <Keyboard play intensity={0.75} theme="dark" />
              <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono tracking-[0.2em] uppercase text-white/40">
                <span>02 // KEYS</span>
                <span className="text-cyan-400/75">LIVE CAPTURE</span>
              </div>
            </div>
          </div>

          {/* Dead-Center Hero + Hairline ENTER Button */}
          <div className="flex flex-col items-center justify-center text-center px-4">
            <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.36em] text-emerald-300/80 mb-3">
              Live-Coding Audio Visual Workstation
            </div>

            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-semibold tracking-[0.22em] text-white pl-[0.22em]">
              VAYESSA LOOP
            </h1>

            <div className="w-40 sm:w-56 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-7" />

            {/* Dead-Center Magnetic Hairline ENTER Button */}
            <div className="relative flex items-center justify-center">
              <div className="pointer-events-none absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-white/[0.08] animate-[spin_28s_linear_infinite]">
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_10px_#34d399]" />
              </div>
              <div className="pointer-events-none absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-dashed border-white/[0.07]" />

              <button
                type="button"
                onClick={handleEnter}
                className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#0b0e14]/75 hover:bg-emerald-400/[0.14] backdrop-blur-md border border-white/25 hover:border-emerald-300/80 text-xs sm:text-sm font-mono font-semibold tracking-[0.3em] uppercase text-white transition-all duration-300 shadow-[0_0_40px_rgba(52,211,153,0.08)] hover:shadow-[0_0_50px_rgba(52,211,153,0.28)] cursor-pointer"
              >
                <span className="pl-[0.3em]">ENTER</span>
                <ArrowRight className="w-4 h-4 text-emerald-300 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>

            <div className="mt-11 text-[10px] font-mono tracking-[0.25em] uppercase text-white/35">
              Click Enter or Press [Return] to Unlock Audio
            </div>
          </div>

          {/* Right Interactive Isometric Hairline Instruments */}
          <div className="hidden lg:flex flex-col gap-4">
            <div className="p-2.5 rounded-xl bg-[#0b0e14]/75 backdrop-blur-sm border border-white/[0.08]">
              <Turntable play intensity={0.75} theme="dark" />
              <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono tracking-[0.2em] uppercase text-white/40">
                <span>03 // DECK</span>
                <span className="text-emerald-400/75">SAMPLER + FADE</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b0e14]/75 backdrop-blur-sm border border-white/[0.08]">
              <Phosphor play intensity={0.75} theme="dark" />
              <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono tracking-[0.2em] uppercase text-white/40">
                <span>04 // MATRIX</span>
                <span className="text-cyan-400/75">HYDRA 3D + MCP</span>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Hairline Feature Strip */}
        <footer className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono tracking-[0.18em] uppercase text-white/40 border-t border-white/[0.08] pt-3">
          <span>STRUDEL LIVE ENGINE</span>
          <span className="hidden sm:inline">·</span>
          <span>MIDI LEARN &amp; PADS</span>
          <span className="hidden sm:inline">·</span>
          <span>WAV/MP3 SAMPLER</span>
          <span className="hidden sm:inline">·</span>
          <span>HYDRA 3D MAPPING</span>
          <span className="hidden sm:inline">·</span>
          <span>AI MCP 20 TOOLS</span>
        </footer>
      </div>
    </div>
  );
}
