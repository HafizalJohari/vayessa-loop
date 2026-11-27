import { useState } from 'react';
import {
  BookmarkPlus,
  Flame,
  GraduationCap,
  Lightbulb,
  Monitor,
  Music,
  ShieldCheck,
  SkipForward,
  Timer,
} from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { strudelEngine } from '@/engine/strudelEngine';
import { transitionEngine } from '@/engine/transitionEngine';
import { hydraBridge } from '@/engine/hydraBridge';
import { PRACTICE_EXERCISES } from '@/data/practiceExercises';

interface ModeToolbarProps {
  onInsertSnippet: (snippet: string) => void;
}

const SCALE_HELPERS = [
  { label: 'C Minor', code: `n("0 2 4 6 4 2").scale("C4:minor").s("triangle").room(0.4)` },
  { label: 'D Dorian', code: `n("0 2 3 5 7 5").scale("D4:dorian").s("gm_epiano1").delay(0.25)` },
  { label: 'F Major 7', code: `note("<[f3,a3,c4,e4] [d3,f3,a3,c4]>").s("gm_epiano1").room(0.5)` },
  { label: 'A Pentatonic', code: `n("0 1 2 4 2 1").scale("A4:minor:pentatonic").s("sine").delay(0.3)` },
];

export function ModeToolbar({ onInsertSnippet }: ModeToolbarProps) {
  const studioMode = useStudioStore((s) => s.studioMode);
  const practiceSpeed = useStudioStore((s) => s.practiceSpeed);
  const metronomeEnabled = useStudioStore((s) => s.metronomeEnabled);
  const snapshots = useStudioStore((s) => s.snapshots);
  const saveSnapshot = useStudioStore((s) => s.saveSnapshot);
  const code = useStudioStore((s) => s.code);
  const bpm = useStudioStore((s) => s.bpm);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const setCode = useStudioStore((s) => s.setCode);

  const playlist = useStudioStore((s) => s.playlist);
  const activePlaylistId = useStudioStore((s) => s.activePlaylistId);
  const isTransitioning = useStudioStore((s) => s.isTransitioning);
  const transitionLabel = useStudioStore((s) => s.transitionLabel);

  const [activeExerciseId, setActiveExerciseId] = useState(PRACTICE_EXERCISES[0].id);
  const [showHint, setShowHint] = useState(false);

  const currentExercise =
    PRACTICE_EXERCISES.find((e) => e.id === activeExerciseId) ?? PRACTICE_EXERCISES[0];

  if (studioMode === 'practice') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#101720] border-b border-cyan-500/25 text-xs select-none">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold text-[11px]">
            <GraduationCap className="w-3.5 h-3.5" />
            PRACTICE
          </span>

          {/* Metronome */}
          <button
            type="button"
            onClick={() => strudelEngine.setMetronome(!metronomeEnabled)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              metronomeEnabled
                ? 'bg-cyan-500 text-black font-bold'
                : 'bg-[#1a2230] text-[#9aa4b6] hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Metronome {metronomeEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Practice Speed */}
          <div className="flex items-center gap-1 bg-[#0c1017] p-0.5 rounded-lg border border-[#222c3c]">
            {[0.5, 0.75, 1].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => strudelEngine.setPracticeSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold cursor-pointer ${
                  practiceSpeed === spd
                    ? 'bg-cyan-500/25 text-cyan-200'
                    : 'text-[#6f7b90] hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Exercise Picker */}
          <select
            value={activeExerciseId}
            onChange={(e) => {
              const ex = PRACTICE_EXERCISES.find((x) => x.id === e.target.value);
              if (ex) {
                setActiveExerciseId(ex.id);
                setShowHint(false);
                setCode(ex.starterCode);
                strudelEngine.setBpm(ex.bpm);
              }
            }}
            className="bg-[#171e2b] border border-[#283447] rounded-md px-2 py-1 text-[11px] text-white"
          >
            {PRACTICE_EXERCISES.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.level})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-cyan-100/90 hidden lg:inline">{currentExercise.goal}</span>
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 cursor-pointer"
          >
            <Lightbulb className="w-3 h-3" />
            <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
          </button>
        </div>

        {showHint && (
          <div className="w-full p-2 rounded-lg bg-amber-500/10 border border-amber-400/25 text-[11px] text-amber-200 font-mono">
            💡 {currentExercise.hint}
          </div>
        )}
      </div>
    );
  }

  if (studioMode === 'jam') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#12161e] border-b border-[#222836] text-xs select-none">
        {/* A / B / C / D Live Snapshots */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#6f798c] mr-1">
            Snapshots
          </span>
          {snapshots.map((snap) => (
            <div key={snap.slot} className="inline-flex items-center rounded-md overflow-hidden border border-[#283040]">
              <button
                type="button"
                onClick={() => {
                  setCode(snap.code);
                  strudelEngine.setBpm(snap.bpm);
                  if (isPlaying) void strudelEngine.evaluate(snap.code);
                }}
                className="px-2 py-0.5 bg-[#1a202c] hover:bg-emerald-500/20 text-[11px] font-mono font-bold text-emerald-300 cursor-pointer"
                title={`Recall Snapshot ${snap.slot} (${snap.bpm} BPM)`}
              >
                {snap.slot}
              </button>
              <button
                type="button"
                onClick={() => saveSnapshot(snap.slot, code, bpm)}
                className="px-1 py-0.5 bg-[#141821] hover:bg-[#252d3d] text-[#6d778a] hover:text-amber-300 cursor-pointer"
                title={`Save current code to Snapshot ${snap.slot}`}
              >
                <BookmarkPlus className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Scale Quick-Insert */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Music className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          {SCALE_HELPERS.map((sc) => (
            <button
              key={sc.label}
              type="button"
              onClick={() => onInsertSnippet(sc.code)}
              className="px-2 py-0.5 rounded bg-[#191e29] hover:bg-violet-500/20 text-[10.5px] text-[#b4bfd2] hover:text-violet-200 border border-[#262e3e] whitespace-nowrap cursor-pointer"
              title="Insert scale/chord snippet at cursor"
            >
              +{sc.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // LIVE SESSION MODE BAR
  const currentTrack = playlist.find((p) => p.id === activePlaylistId);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#16121c] border-b border-emerald-500/35 text-xs select-none">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500 text-[#07110b] font-bold text-[11px]">
          <Flame className="w-3.5 h-3.5" />
          LIVE SESSION
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5" />
          Safe-Eval Guard ON
        </span>
        <span className="text-[11px] font-mono text-[#c6d0e0] truncate max-w-52">
          {isTransitioning
            ? transitionLabel
            : `Setlist: ${currentTrack?.title ?? 'Free Jam'}`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void transitionEngine.playNext()}
          disabled={playlist.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 text-[#08120c] font-bold text-xs hover:bg-emerald-400 disabled:opacity-40 cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5 fill-current" />
          <span>NEXT TRACK (FADE)</span>
        </button>

        <button
          type="button"
          onClick={() => hydraBridge.openSecondMonitorWindow()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40 hover:bg-fuchsia-500/30 font-semibold text-xs cursor-pointer"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>2nd Monitor (Hydra)</span>
        </button>
      </div>
    </div>
  );
}
