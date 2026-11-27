import { useEffect, useRef } from 'react';
import { clock, effect, frameLoop, init, surface } from 'vgpu';
import type { FrameLoopHandle } from 'vgpu';
import welcomeFieldShader from './welcomeField.wgsl';

export type GpuRendererMode = 'initializing' | 'webgpu' | 'fallback';

interface WebGpuBackdropProps {
  onModeChange?: (mode: GpuRendererMode) => void;
}

export function WebGpuBackdrop({ onModeChange }: WebGpuBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let loop: FrameLoopHandle | undefined;
    let gpu: Awaited<ReturnType<typeof init>> | undefined;
    let fallbackRaf = 0;

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const onPointerMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / Math.max(1, window.innerWidth);
      mouse.ty = e.clientY / Math.max(1, window.innerHeight);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const startFallbackCanvas = () => {
      onModeChange?.('fallback');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const start = performance.now();
      const render2D = (now: number) => {
        if (disposed) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
        }

        mouse.x += (mouse.tx - mouse.x) * 0.06;
        mouse.y += (mouse.ty - mouse.y) * 0.06;

        const t = (now - start) * 0.0005;
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#090b0f';
        ctx.fillRect(0, 0, w, h);

        // Subtle animated obsidian spectral waves fallback
        const grad = ctx.createRadialGradient(
          w * mouse.x,
          h * mouse.y,
          20,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.75
        );
        grad.addColorStop(0, 'rgba(52, 211, 153, 0.14)');
        grad.addColorStop(0.45, 'rgba(56, 189, 248, 0.06)');
        grad.addColorStop(1, 'rgba(9, 11, 15, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Animated hairline sine waves
        ctx.lineWidth = 1;
        for (let row = 0; row < 10; row++) {
          ctx.strokeStyle =
            row % 2 === 0 ? 'rgba(52, 211, 153, 0.14)' : 'rgba(56, 189, 248, 0.11)';
          ctx.beginPath();
          const baseY = (h / 11) * (row + 1);
          for (let x = 0; x <= w; x += 24) {
            const y =
              baseY +
              Math.sin(x * 0.004 + t * 2 + row * 0.7) * 26 +
              Math.cos(x * 0.009 - t * 1.4 + row) * 12;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
        fallbackRaf = requestAnimationFrame(render2D);
      };
      fallbackRaf = requestAnimationFrame(render2D);
    };

    void (async () => {
      try {
        if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
          startFallbackCanvas();
          return;
        }

        gpu = await init();
        if (disposed) {
          gpu.dispose();
          return;
        }

        const canvasSurface = surface(gpu, canvas, { dpr: [1, 2] });
        const aspect = () =>
          canvasSurface.size[1] > 0 ? canvasSurface.size[0] / canvasSurface.size[1] : 16 / 9;

        const field = effect(gpu, welcomeFieldShader, {
          label: 'vayessa-welcome-field',
          set: {
            params: {
              time: 0,
              aspect: aspect(),
              mouse: [0.5, 0.5],
            },
          },
        });

        canvasSurface.onResize(() => {
          field.set({ params: { aspect: aspect() } });
        });

        const frameClock = clock(gpu);
        onModeChange?.('webgpu');

        loop = frameLoop(gpu, (frame) => {
          mouse.x += (mouse.tx - mouse.x) * 0.06;
          mouse.y += (mouse.ty - mouse.y) * 0.06;
          field.set({
            params: {
              time: frameClock.time,
              mouse: [mouse.x, mouse.y],
            },
          });
          frame.pass(canvasSurface, field);
        });
      } catch (err) {
        console.warn('[WebGpuBackdrop] Falling back to 2D canvas:', err);
        if (!disposed) {
          startFallbackCanvas();
        }
      }
    })();

    return () => {
      disposed = true;
      window.removeEventListener('pointermove', onPointerMove);
      if (fallbackRaf) cancelAnimationFrame(fallbackRaf);
      loop?.stop();
      gpu?.dispose();
    };
  }, [onModeChange]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full block pointer-events-none"
    />
  );
}
