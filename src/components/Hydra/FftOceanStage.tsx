import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { createRenderer, type OceanAudioState } from '@/components/Hydra/fft-ocean/renderer';

interface FftOceanStageProps {
  studioRef: MutableRefObject<OceanAudioState>;
}

/**
 * Full-screen WebGPU Beat-Reactive Particles Ocean stage (powered by vgpu fft-ocean).
 * Preserves full WebGPU lifecycle and disposes all GPU targets cleanly on unmount.
 */
export function FftOceanStage({ studioRef }: FftOceanStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [step, setStep] = useState<string>('booting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    setStatus('loading');
    setStep('booting');
    setError(null);

    const renderer = createRenderer({
      canvas,
      getAudioState: () => studioRef.current,
      onStep: (s) => {
        if (active) setStep(s);
      },
    });

    renderer.ready
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch((err: unknown) => {
        console.error('[FftOceanStage] WebGPU init failed:', err);
        if (active) {
          setStatus('error');
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      active = false;
      renderer.dispose();
    };
  }, [studioRef]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      {status === 'loading' && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
          <div className="px-3.5 py-2 rounded-lg bg-black/70 border border-emerald-400/25 text-[11px] font-mono text-emerald-300 tracking-wider uppercase">
            Initializing WebGPU Particles Ocean ({step})…
          </div>
        </div>
      )}
      {error && (
        <div className="fixed top-6 left-6 max-w-md p-3 rounded-xl bg-rose-950/90 border border-rose-500/50 text-xs font-mono text-rose-200">
          WebGPU Ocean Error: {error}
        </div>
      )}
    </div>
  );
}
