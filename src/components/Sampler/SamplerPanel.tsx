import { useEffect, useRef, useState } from 'react';
import {
  AudioWaveform,
  Play,
  Plus,
  RotateCcw,
  Scissors,
  Trash2,
  Upload,
  Waves,
} from 'lucide-react';
import type { ImportedSampleMeta } from '@/types/studio';
import { samplerEngine } from '@/engine/samplerEngine';

interface SamplerPanelProps {
  onInsertSnippet: (snippet: string) => void;
}

export function SamplerPanel({ onInsertSnippet }: SamplerPanelProps) {
  const [samples, setSamples] = useState<ImportedSampleMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const sync = () => {
      const list = samplerEngine.getAllMetas();
      setSamples(list);
      setSelectedId((prev) =>
        prev && list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? null)
      );
    };

    void samplerEngine.loadSavedSamples().then(sync);
    return samplerEngine.subscribe(sync);
  }, []);

  const active = samples.find((s) => s.id === selectedId) ?? samples[0] ?? null;

  // Draw interactive waveform with Cut/Trim region, Wave Shift marker & Slice grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#0b0e13';
    ctx.fillRect(0, 0, w, h);

    // Highlight active cut/trim region
    const xStart = active.trimStart * w;
    const xEnd = active.trimEnd * w;
    ctx.fillStyle = 'rgba(52, 211, 153, 0.08)';
    ctx.fillRect(xStart, 0, Math.max(2, xEnd - xStart), h);

    // Draw waveform bars
    const peaks = active.peaks;
    if (peaks.length > 0) {
      const barW = w / peaks.length;
      for (let i = 0; i < peaks.length; i++) {
        const normX = i / peaks.length;
        const inside = normX >= active.trimStart && normX <= active.trimEnd;
        const barH = Math.max(2, peaks[i] * (h - 14));
        const y = (h - barH) / 2;
        ctx.fillStyle = inside ? '#34d399' : '#2d3647';
        ctx.fillRect(i * barW, y, Math.max(1.5, barW - 1), barH);
      }
    }

    // Draw slice dividers inside active region
    if (active.sliceCount > 1) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      for (let s = 1; s < active.sliceCount; s++) {
        const sx = xStart + ((xEnd - xStart) * s) / active.sliceCount;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw Wave Shifter phase offset marker (amber line inside active region)
    if (active.waveShift > 0.005) {
      const shiftX = xStart + (xEnd - xStart) * active.waveShift;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shiftX, 0);
      ctx.lineTo(shiftX, h);
      ctx.stroke();
    }

    // Draw Start & End trim markers
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xStart, 0);
    ctx.lineTo(xStart, h);
    ctx.moveTo(xEnd, 0);
    ctx.lineTo(xEnd, h);
    ctx.stroke();

    ctx.restore();
  }, [active]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setErrorMsg(null);
    try {
      const created = await samplerEngine.importFile(files[0]);
      setSelectedId(created.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not decode audio file');
    } finally {
      setImporting(false);
    }
  };

  const buildStrudelModifiers = (meta: ImportedSampleMeta) => {
    const parts: string[] = [];
    if (meta.pitchSemitones !== 0) {
      const speed = Math.pow(2, meta.pitchSemitones / 12).toFixed(3);
      parts.push(`.speed(${speed})`);
    }
    if (meta.waveShape > 0.02) {
      parts.push(`.shape(${meta.waveShape.toFixed(2)})`);
    }
    return parts.join('');
  };

  return (
    <div
      className="h-full flex gap-2.5 p-2.5 bg-[#0e1116] select-none overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/wav,audio/mpeg,audio/mp3,audio/ogg,audio/mp4,.wav,.mp3,.ogg,.m4a"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Left: Import Button + Sample List */}
      <div className="w-48 shrink-0 flex flex-col gap-2 min-h-0">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-[#07110b] text-xs font-bold hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{importing ? 'Decoding...' : 'Import WAV / MP3'}</span>
        </button>

        {errorMsg && (
          <div className="p-1.5 rounded bg-rose-950/60 border border-rose-500/40 text-[10px] text-rose-200">
            {errorMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {samples.length === 0 ? (
            <div className="p-2.5 rounded-lg bg-[#141821] border border-dashed border-[#273042] text-[10.5px] text-[#7c8698] leading-relaxed text-center">
              Drop a <strong>.wav</strong> or <strong>.mp3</strong> here to cut, slice, wave-shift
              &amp; play in Strudel!
            </div>
          ) : (
            samples.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                  active?.id === s.id
                    ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-100'
                    : 'bg-[#151922] border-[#222835] text-[#c0cada] hover:border-[#343f55]'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-semibold truncate">{s.name}</div>
                  <div className="text-[9.5px] text-[#7c8698]">
                    {s.duration.toFixed(2)}s · {s.sliceCount} slices
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void samplerEngine.removeSample(s.id);
                  }}
                  className="p-1 rounded text-[#6d778a] hover:text-rose-400 cursor-pointer"
                  title="Delete sample"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Waveform Cutter, Wave Shifter, Slice Pads & Strudel Insert */}
      {!active ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl bg-[#11151d] border border-dashed border-[#252d3d] text-xs text-[#7c8698] gap-1.5">
          <AudioWaveform className="w-6 h-6 text-emerald-400/70" />
          <div className="font-semibold text-[#cbd4e3]">Visual WAV / MP3 Sampler &amp; Wave Shifter</div>
          <div className="text-[11px]">
            Import any audio file to trim/cut, shift waveform phase, pitch-shift, chop slices &amp; insert into Strudel.
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          {/* Top Bar: Sample Name, Audition, Reverse, Slice Count, Insert Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#161c26] border border-[#283244] text-emerald-300">
                s(&quot;{active.name}&quot;)
              </span>
              <button
                type="button"
                onClick={() => void samplerEngine.previewSlice(active.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                Play Cut
              </button>
              <button
                type="button"
                onClick={() => void samplerEngine.updateSample(active.id, { reversed: !active.reversed })}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                  active.reversed
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                    : 'bg-[#1a202c] text-[#9aa4b6] hover:text-white'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                Rev
              </button>

              {/* Slices 1/4/8/16 */}
              <div className="flex items-center gap-0.5 bg-[#12161f] p-0.5 rounded border border-[#232b3a]">
                <Scissors className="w-3 h-3 text-cyan-400 mx-1" />
                {([1, 4, 8, 16] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => void samplerEngine.updateSample(active.id, { sliceCount: cnt })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                      active.sliceCount === cnt
                        ? 'bg-cyan-500/25 text-cyan-200 font-bold'
                        : 'text-[#6f798c] hover:text-white'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* 1-Click Strudel Code Insert */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onInsertSnippet(`s("${active.name}")${buildStrudelModifiers(active)}`)
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a212e] text-emerald-300 hover:bg-emerald-500/20 text-[10.5px] font-mono cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                One-Shot
              </button>
              <button
                type="button"
                onClick={() => {
                  const seq = Array.from({ length: active.sliceCount }, (_, i) => i).join(' ');
                  onInsertSnippet(
                    `s("${active.name}").slice(${active.sliceCount}, "${seq}")${buildStrudelModifiers(active)}`
                  );
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a212e] text-cyan-300 hover:bg-cyan-500/20 text-[10.5px] font-mono cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Sliced
              </button>
              <button
                type="button"
                onClick={() =>
                  onInsertSnippet(
                    `s("${active.name}").loopAt(2).chop(${Math.max(4, active.sliceCount)})${buildStrudelModifiers(active)}`
                  )
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a212e] text-amber-300 hover:bg-amber-500/20 text-[10.5px] font-mono cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Chop Loop
              </button>
            </div>
          </div>

          {/* Waveform Canvas */}
          <div className="h-18 shrink-0 rounded-lg overflow-hidden border border-[#232b3a]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>

          {/* Cut/Trim & Wave Shifter Sliders */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-[10px] font-mono bg-[#131720] p-2 rounded-lg border border-[#222938]">
            <label className="space-y-0.5">
              <div className="flex justify-between text-[#8b95a7]">
                <span>CUT START</span>
                <span className="text-emerald-300">{Math.round(active.trimStart * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0.05, active.trimEnd - 0.05)}
                step={0.01}
                value={active.trimStart}
                onChange={(e) =>
                  void samplerEngine.updateSample(active.id, { trimStart: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </label>

            <label className="space-y-0.5">
              <div className="flex justify-between text-[#8b95a7]">
                <span>CUT END</span>
                <span className="text-emerald-300">{Math.round(active.trimEnd * 100)}%</span>
              </div>
              <input
                type="range"
                min={Math.min(0.95, active.trimStart + 0.05)}
                max={1}
                step={0.01}
                value={active.trimEnd}
                onChange={(e) =>
                  void samplerEngine.updateSample(active.id, { trimEnd: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </label>

            <label className="space-y-0.5">
              <div className="flex justify-between text-[#8b95a7]">
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <Waves className="w-2.5 h-2.5" />
                  WAVE SHIFT
                </span>
                <span className="text-amber-300">{Math.round(active.waveShift * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.99}
                step={0.01}
                value={active.waveShift}
                onChange={(e) =>
                  void samplerEngine.updateSample(active.id, { waveShift: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </label>

            <label className="space-y-0.5">
              <div className="flex justify-between text-[#8b95a7]">
                <span>PITCH</span>
                <span className="text-cyan-300">
                  {active.pitchSemitones > 0 ? `+${active.pitchSemitones}` : active.pitchSemitones} st
                </span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={active.pitchSemitones}
                onChange={(e) =>
                  void samplerEngine.updateSample(active.id, {
                    pitchSemitones: Number(e.target.value),
                  })
                }
                className="studio-slider w-full"
              />
            </label>

            <label className="space-y-0.5">
              <div className="flex justify-between text-[#8b95a7]">
                <span>WAVE WARP</span>
                <span className="text-fuchsia-300">{Math.round(active.waveShape * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={active.waveShape}
                onChange={(e) =>
                  void samplerEngine.updateSample(active.id, { waveShape: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </label>
          </div>

          {/* Interactive Slice Pads (MPC Style) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {Array.from({ length: active.sliceCount }, (_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => void samplerEngine.previewSlice(active.id, idx)}
                className="flex-1 min-w-8 py-1.5 rounded-md bg-[#181f2b] hover:bg-cyan-500/25 border border-[#273145] hover:border-cyan-400/50 text-[10.5px] font-mono font-bold text-cyan-200 cursor-pointer transition-colors"
                title={`Audition Slice ${idx}`}
              >
                {idx}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
