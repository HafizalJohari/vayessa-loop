import { useEffect, useRef, useState } from 'react';
import { strudelEngine } from '@/engine/strudelEngine';
import { useStudioStore } from '@/store/useStudioStore';

export function AudioVisualizer() {
  const pianoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scopeMode, setScopeMode] = useState<'osc' | 'fft'>('osc');
  const isPlaying = useStudioStore((s) => s.isPlaying);

  useEffect(() => {
    let rafId = 0;
    const timeBuf = new Uint8Array(512);
    const freqBuf = new Uint8Array(256);

    const draw = () => {
      const playing = useStudioStore.getState().isPlaying;

      // 1. Draw Live Piano Roll
      const pCanvas = pianoCanvasRef.current;
      if (pCanvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = pCanvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (pCanvas.width !== Math.floor(rect.width * dpr) || pCanvas.height !== Math.floor(rect.height * dpr)) {
            pCanvas.width = Math.floor(rect.width * dpr);
            pCanvas.height = Math.floor(rect.height * dpr);
          }
          const ctx = pCanvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.scale(dpr, dpr);
            const w = rect.width;
            const h = rect.height;

            ctx.fillStyle = '#0c0f14';
            ctx.fillRect(0, 0, w, h);

            // Subtle horizontal pitch grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let row = 1; row < 6; row++) {
              const y = (h / 6) * row;
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(w, y);
              ctx.stroke();
            }

            // Playhead line at 65%
            const playheadX = w * 0.65;
            ctx.strokeStyle = playing ? 'rgba(52, 211, 153, 0.75)' : 'rgba(139, 149, 167, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(playheadX, 0);
            ctx.lineTo(playheadX, h);
            ctx.stroke();

            const now = strudelEngine.getCurrentCycle();
            const windowCycles = 2;
            const from = now - windowCycles * 0.65;
            const haps = playing ? strudelEngine.getWindowHaps(windowCycles) : [];

            if (haps.length > 0) {
              const minNote = Math.min(...haps.map((x) => x.note), 36) - 2;
              const maxNote = Math.max(...haps.map((x) => x.note), 72) + 2;
              const range = Math.max(12, maxNote - minNote);

              for (const hap of haps) {
                const x1 = ((hap.start - from) / windowCycles) * w;
                const x2 = ((hap.end - from) / windowCycles) * w;
                const barW = Math.max(6, x2 - x1 - 2);
                const normY = 1 - (hap.note - minNote) / range;
                const y = 8 + normY * (h - 22);
                const isActive = now >= hap.start && now <= hap.end;

                ctx.fillStyle = isActive ? '#ffffff' : hap.color;
                ctx.globalAlpha = isActive ? 1 : 0.78;
                ctx.beginPath();
                ctx.roundRect(x1, y, barW, 11, 3);
                ctx.fill();

                if (barW > 26) {
                  ctx.fillStyle = '#0b0e12';
                  ctx.font = '600 9px "JetBrains Mono", monospace';
                  ctx.fillText(hap.label, x1 + 4, y + 8.5);
                }
              }
              ctx.globalAlpha = 1;
            } else {
              ctx.fillStyle = '#525b6d';
              ctx.font = '11px "JetBrains Mono", monospace';
              ctx.fillText(
                playing ? 'Listening to active pattern...' : 'Press PLAY (Cmd+Enter) to visualize live notes',
                14,
                h / 2 + 4
              );
            }
            ctx.restore();
          }
        }
      }

      // 2. Draw Oscilloscope / Spectrum Analyzer
      const sCanvas = scopeCanvasRef.current;
      if (sCanvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = sCanvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (sCanvas.width !== Math.floor(rect.width * dpr) || sCanvas.height !== Math.floor(rect.height * dpr)) {
            sCanvas.width = Math.floor(rect.width * dpr);
            sCanvas.height = Math.floor(rect.height * dpr);
          }
          const ctx = sCanvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.scale(dpr, dpr);
            const w = rect.width;
            const h = rect.height;

            ctx.fillStyle = '#0c0f14';
            ctx.fillRect(0, 0, w, h);

            // Center reference line
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();

            const analyser = strudelEngine.getAnalyserNode();
            if (analyser && playing) {
              if (scopeMode === 'osc') {
                analyser.getByteTimeDomainData(timeBuf);
                ctx.strokeStyle = '#34d399';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                const sliceW = w / timeBuf.length;
                for (let i = 0; i < timeBuf.length; i++) {
                  const v = (timeBuf[i] - 128) / 128;
                  const y = h / 2 + v * (h * 0.44);
                  if (i === 0) ctx.moveTo(0, y);
                  else ctx.lineTo(i * sliceW, y);
                }
                ctx.stroke();
              } else {
                analyser.getByteFrequencyData(freqBuf);
                const bars = 48;
                const barW = w / bars;
                for (let i = 0; i < bars; i++) {
                  const val = freqBuf[i * 2] / 255;
                  const barH = val * (h - 14);
                  ctx.fillStyle = `hsl(${155 + i * 2}, 80%, 58%)`;
                  ctx.fillRect(i * barW + 1, h - barH - 4, Math.max(2, barW - 2), barH);
                }
              }
            } else {
              // Idle flatline
              ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(0, h / 2);
              ctx.lineTo(w, h / 2);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [scopeMode]);

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-2.5 p-2.5 bg-[#0e1116]">
      {/* Live Piano Roll */}
      <div className="md:col-span-2 flex flex-col rounded-xl bg-[#0c0f14] border border-[#222835] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1c222e] bg-[#12161e]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b95a7]">
            Live Piano Roll
          </span>
          <span
            className={`text-[10px] font-mono ${
              isPlaying ? 'text-emerald-400' : 'text-[#5c6577]'
            }`}
          >
            {isPlaying ? '● ACTIVE' : '○ IDLE'}
          </span>
        </div>
        <canvas ref={pianoCanvasRef} className="w-full flex-1 min-h-0 block" />
      </div>

      {/* Oscilloscope / Spectrum */}
      <div className="flex flex-col rounded-xl bg-[#0c0f14] border border-[#222835] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1c222e] bg-[#12161e]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b95a7]">
            Audio Scope
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setScopeMode('osc')}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono cursor-pointer ${
                scopeMode === 'osc'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-[#6d778a] hover:text-white'
              }`}
            >
              WAVE
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('fft')}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono cursor-pointer ${
                scopeMode === 'fft'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-[#6d778a] hover:text-white'
              }`}
            >
              FFT
            </button>
          </div>
        </div>
        <canvas ref={scopeCanvasRef} className="w-full flex-1 min-h-0 block" />
      </div>
    </div>
  );
}
