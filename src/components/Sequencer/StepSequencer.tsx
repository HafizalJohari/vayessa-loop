import { useEffect, useState } from 'react';
import { Link2, RotateCcw, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { applySequencerToCode } from '@/engine/sequencerSync';
import { strudelEngine } from '@/engine/strudelEngine';

export function StepSequencer() {
  const rows = useStudioStore((s) => s.sequencerRows);
  const syncEnabled = useStudioStore((s) => s.sequencerSyncEnabled);
  const setSyncEnabled = useStudioStore((s) => s.setSequencerSyncEnabled);
  const toggleStep = useStudioStore((s) => s.toggleSequencerStep);
  const toggleRowMute = useStudioStore((s) => s.toggleSequencerRowMute);
  const clearSequencer = useStudioStore((s) => s.clearSequencer);
  const resetSequencer = useStudioStore((s) => s.resetSequencer);
  const bpm = useStudioStore((s) => s.bpm);
  const isPlaying = useStudioStore((s) => s.isPlaying);

  const [playheadStep, setPlayheadStep] = useState(-1);

  // Animate 16-step playhead from Strudel scheduler cycle
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      if (useStudioStore.getState().isPlaying) {
        const cycle = strudelEngine.getCurrentCycle();
        setPlayheadStep(Math.floor((cycle * 16) % 16));
      } else {
        setPlayheadStep(-1);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const pushGridToEditorAndPlay = (nextRows = useStudioStore.getState().sequencerRows) => {
    const store = useStudioStore.getState();
    const updatedCode = applySequencerToCode(store.code, nextRows, store.bpm, true);
    store.setCode(updatedCode);
    if (store.isPlaying) {
      void strudelEngine.evaluate(updatedCode);
    }
  };

  const handleStepClick = (rowId: string, stepIdx: number) => {
    toggleStep(rowId, stepIdx);
    if (syncEnabled) {
      queueMicrotask(() => pushGridToEditorAndPlay());
    }
  };

  const handleMuteClick = (rowId: string) => {
    toggleRowMute(rowId);
    if (syncEnabled) {
      queueMicrotask(() => pushGridToEditorAndPlay());
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0e1116] p-2.5 select-none">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !syncEnabled;
              setSyncEnabled(next);
              if (next) pushGridToEditorAndPlay();
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              syncEnabled
                ? 'bg-emerald-500 text-[#09110d]'
                : 'bg-[#1a1f2a] text-[#b4bfd2] hover:text-white border border-[#2a3140]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{syncEnabled ? 'Live Sync ON' : 'Sync Grid -> Code'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              pushGridToEditorAndPlay();
              if (!isPlaying) {
                void strudelEngine.evaluate(useStudioStore.getState().code);
              }
            }}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#1a1f2a] text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer"
          >
            Write &amp; Play ({bpm} BPM)
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              resetSequencer();
              if (syncEnabled) queueMicrotask(() => pushGridToEditorAndPlay());
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-[#171c25] text-[#8b95a7] hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              clearSequencer();
              if (syncEnabled) queueMicrotask(() => pushGridToEditorAndPlay());
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-[#171c25] text-[#8b95a7] hover:text-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* 16-Step Grid */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            {/* Row Label + Mute + Preview */}
            <div className="w-36 shrink-0 flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-[#151922] border border-[#222835]">
              <button
                type="button"
                onClick={() =>
                  void strudelEngine.triggerOneShot({
                    s: row.sound,
                    bank: row.bank,
                    note: row.note,
                    gain: row.gain,
                  })
                }
                className="flex items-center gap-1.5 text-left truncate cursor-pointer group"
                title="Preview sound"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: row.color }}
                />
                <span className="text-[11px] font-medium text-[#d8e0ec] group-hover:text-white truncate">
                  {row.label}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleMuteClick(row.id)}
                className={`p-0.5 rounded cursor-pointer ${
                  row.muted ? 'text-rose-400' : 'text-[#697386] hover:text-white'
                }`}
                title={row.muted ? 'Unmute lane' : 'Mute lane'}
              >
                {row.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
            </div>

            {/* 16 Steps */}
            <div className="flex-1 grid grid-cols-16 gap-1">
              {row.steps.map((active, stepIdx) => {
                const isBeatStart = stepIdx % 4 === 0;
                const isCurrent = playheadStep === stepIdx;
                return (
                  <button
                    key={stepIdx}
                    type="button"
                    onClick={() => handleStepClick(row.id, stepIdx)}
                    style={
                      active
                        ? {
                            backgroundColor: row.muted ? '#333b4d' : row.color,
                            boxShadow:
                              isCurrent && !row.muted ? `0 0 10px ${row.color}` : undefined,
                          }
                        : undefined
                    }
                    className={`h-7 rounded-md border transition-all cursor-pointer ${
                      active
                        ? 'border-white/25'
                        : isBeatStart
                          ? 'bg-[#1a202c] border-[#293142] hover:bg-[#232b3b]'
                          : 'bg-[#131720] border-[#1f2533] hover:bg-[#1c2230]'
                    } ${isCurrent ? 'ring-1 ring-white/80' : ''}`}
                    title={`${row.label} — Step ${stepIdx + 1}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
