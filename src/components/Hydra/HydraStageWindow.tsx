import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { HYDRA_CHANNEL_NAME, type HydraBroadcastMessage } from '@/engine/hydraBridge';
import { HYDRA_PRESETS } from '@/data/hydraPresets';
import { FftOceanStage } from '@/components/Hydra/FftOceanStage';

/**
 * Full-screen 2nd Monitor Hydra Visual Stage (opened via /?view=hydra).
 * Receives 60fps audio FFT telemetry, Macro Knobs (m1..m8), Hydra code, and
 * Playlist Track Title overlays over BroadcastChannel from the main Studio window.
 */
export function HydraStageWindow() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mirrorVideoRef = useRef<HTMLVideoElement | null>(null);
  const [mirroringInline, setMirroringInline] = useState(false);
  const [stageMode, setStageMode] = useState<'hydra' | 'fft-ocean'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'ocean' ? 'fft-ocean' : 'hydra';
  });
  const [projection3D, setProjection3D] = useState({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    showGrid: false,
  });
  const [overlay, setOverlay] = useState({
    show: true,
    title: 'VAYESSA LOOP Live',
    bpm: 84,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hydraError, setHydraError] = useState<string | null>(null);
  const [showHud, setShowHud] = useState(true);

  const studioRef = useRef({
    bass: 0,
    mid: 0,
    high: 0,
    volume: 0,
    bpm: 84,
    isPlaying: false,
    m1: 0.65,
    m2: 0.35,
    m3: 0.25,
    m4: 0.3,
    m5: 0.5,
    m6: 0.5,
    m7: 0.5,
    m8: 0.5,
  });

  const hydraBootedRef = useRef(false);
  const pendingHydraCodeRef = useRef<string | null>(null);

  const runHydraCode = (code: string) => {
    try {
      setHydraError(null);
      // Evaluate with Hydra globals on window
      // eslint-disable-next-line no-new-func
      const fn = new Function('studio', code);
      fn(studioRef.current);
    } catch (err) {
      setHydraError(err instanceof Error ? err.message : String(err));
    }
  };

  // Lazy-boot Hydra WebGL synth ONLY when stageMode === 'hydra' so WebGPU fft-ocean has dedicated GPU access
  useEffect(() => {
    if (stageMode !== 'hydra' || hydraBootedRef.current || !canvasRef.current) return;
    let cancelled = false;

    const bootHydra = async () => {
      if (!canvasRef.current) return;
      try {
        (window as unknown as { global: typeof globalThis }).global = globalThis;
        (window as unknown as { studio: typeof studioRef.current }).studio = studioRef.current;

        const mod = await import('hydra-synth');
        if (cancelled || !canvasRef.current) return;
        const HydraCtor = mod.default ?? mod;
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        new HydraCtor({
          canvas,
          detectAudio: false,
          makeGlobal: true,
        });
        hydraBootedRef.current = true;

        const initialCode =
          pendingHydraCodeRef.current ??
          (HYDRA_PRESETS.find((p) => p.id !== 'vgpu-particles-ocean') ?? HYDRA_PRESETS[0]).code;
        pendingHydraCodeRef.current = null;
        runHydraCode(initialCode);
      } catch (err) {
        if (!cancelled) {
          setHydraError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void bootHydra();
    return () => {
      cancelled = true;
    };
  }, [stageMode]);

  useEffect(() => {
    document.title = 'VAYESSA LOOP — Hydra 2nd Monitor';
    let channel: BroadcastChannel | null = null;
    let hideTimer: number | null = null;

    const resetHudTimer = () => {
      setShowHud(true);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setShowHud(false), 3000);
    };

    window.addEventListener('mousemove', resetHudTimer);
    resetHudTimer();

    // Expose globalThis polyfill for hydra-synth & live studio reactive object
    (window as unknown as { global: typeof globalThis }).global = globalThis;
    (window as unknown as { studio: typeof studioRef.current }).studio = studioRef.current;

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const attachInlineHydraMirror = () => {
      try {
        const openerWin = window.opener as
          | (Window & { __strudelInlineHydraCanvas?: HTMLCanvasElement })
          | null;
        const sourceCanvas = openerWin?.__strudelInlineHydraCanvas;
        const videoEl = mirrorVideoRef.current;
        if (!sourceCanvas || !videoEl || typeof sourceCanvas.captureStream !== 'function') {
          return false;
        }
        const stream = sourceCanvas.captureStream(60);
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          void videoEl.play().catch(() => {});
        }
        setMirroringInline(true);
        return true;
      } catch {
        return false;
      }
    };

    // If main window already ran await initHydra(), mirror it immediately
    attachInlineHydraMirror();

    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(HYDRA_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<HydraBroadcastMessage>) => {
        const msg = event.data;
        if (!msg) return;
        if (msg.type === 'inline_hydra_ready') {
          setStageMode('hydra');
          attachInlineHydraMirror();
        } else if (msg.type === 'stage_mode') {
          setStageMode(msg.mode);
          if (msg.mode === 'fft-ocean') {
            setMirroringInline(false);
          }
        } else if (msg.type === 'telemetry') {
          const s = studioRef.current;
          s.bass = msg.bass;
          s.mid = msg.mid;
          s.high = msg.high;
          s.volume = msg.volume;
          s.bpm = msg.bpm;
          s.isPlaying = msg.isPlaying;
          msg.macros.forEach((v, idx) => {
            const key = `m${idx + 1}` as keyof typeof s;
            if (key in s) {
              (s as Record<string, number | boolean>)[key] = v;
            }
          });
        } else if (msg.type === 'eval_hydra') {
          setMirroringInline(false);
          if (hydraBootedRef.current) {
            runHydraCode(msg.code);
          } else {
            pendingHydraCodeRef.current = msg.code;
          }
        } else if (msg.type === 'init_cam') {
          setMirroringInline(false);
          const camCode = 's0.initCam(); src(s0).scale(-1, 1, 1).out(o0);';
          if (hydraBootedRef.current) {
            runHydraCode(camCode);
          } else {
            pendingHydraCodeRef.current = camCode;
          }
        } else if (msg.type === 'overlay') {
          setOverlay({ show: msg.showOverlay, title: msg.trackTitle, bpm: msg.bpm });
        } else if (msg.type === 'projection_3d') {
          setProjection3D({
            rotateX: msg.rotateX,
            rotateY: msg.rotateY,
            scale: msg.scale,
            showGrid: msg.showGrid,
          });
        } else if (msg.type === 'stage_ping') {
          channel?.postMessage({ type: 'stage_pong' } satisfies HydraBroadcastMessage);
        }
      };

      // Announce stage window is ready
      channel.postMessage({ type: 'stage_ping' } satisfies HydraBroadcastMessage);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        void toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('mousemove', resetHudTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      channel?.close();
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // ignore
    }
  };

  const has3DTransform =
    projection3D.rotateX !== 0 || projection3D.rotateY !== 0 || projection3D.scale !== 1;

  return (
    <div
      className="relative w-screen h-screen bg-black overflow-hidden select-none"
      style={{ perspective: '1100px' }}
    >
      {/* 3D Projection Mapping Stage Container */}
      <div
        className="w-full h-full transition-transform duration-100 ease-out"
        style={
          has3DTransform
            ? {
                transform: `rotateX(${projection3D.rotateX}deg) rotateY(${projection3D.rotateY}deg) scale(${projection3D.scale})`,
                transformStyle: 'preserve-3d',
              }
            : undefined
        }
      >
        {/* WebGPU 3D Beat-Reactive Particles Ocean (vgpu fft-ocean) */}
        {stageMode === 'fft-ocean' && <FftOceanStage studioRef={studioRef} />}

        {/* Standalone Hydra Stage Canvas (for Hydra Panel presets) */}
        <canvas
          ref={canvasRef}
          className={`w-full h-full block ${
            stageMode === 'fft-ocean' || mirroringInline ? 'hidden' : ''
          }`}
        />

        {/* Live 60fps Mirror of Inline Editor initHydra() Canvas (supports s0.initCam & multi-scene) */}
        <video
          ref={mirrorVideoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover block ${
            stageMode === 'hydra' && mirroringInline ? '' : 'hidden'
          }`}
        />

        {/* MadMapper-style Projection Alignment Calibration Grid */}
        {projection3D.showGrid && (
          <div
            className="pointer-events-none absolute inset-0 border-2 border-cyan-400/90"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(56,189,248,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.28) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-amber-400/90 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
            </div>
            <div className="absolute top-2 left-2 text-[10px] font-mono bg-black/70 text-cyan-300 px-1.5 py-0.5 rounded">
              3D MAPPING CALIBRATION · X:{projection3D.rotateX}° Y:{projection3D.rotateY}° S:
              {projection3D.scale.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Optional Live Track Title Overlay */}
      {overlay.show && (
        <div className="pointer-events-none fixed bottom-8 left-8 px-4 py-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/15">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VAYESSA LOOP · {overlay.bpm} BPM</span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight mt-0.5">
            {overlay.title}
          </div>
        </div>
      )}

      {/* Error Toast */}
      {hydraError && (
        <div className="fixed top-6 left-6 max-w-md p-3 rounded-xl bg-rose-950/90 border border-rose-500/50 text-xs font-mono text-rose-200">
          Hydra Error: {hydraError}
        </div>
      )}

      {/* Auto-hiding Fullscreen HUD */}
      <div
        className={`fixed top-5 right-5 flex items-center gap-2 transition-opacity duration-300 ${
          showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fullscreen (F)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
