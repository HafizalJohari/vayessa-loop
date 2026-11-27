import {
  Cable,
  Circle,
  Grid,
  Piano,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { MacroKnobDial } from '@/components/Midi/MacroKnobDial';
import { midiEngine } from '@/engine/midiEngine';
import {
  buildCapturedNotesSnippet,
  formatMidiBinding,
  midiNoteToStrudelName,
} from '@/engine/midiUtils';
import type { PadActionType } from '@/types/studio';

interface RightControlPanelProps {
  onInsertSnippet: (snippet: string) => void;
}

const PAD_ACTIONS: { value: PadActionType; label: string }[] = [
  { value: 'toggle_play', label: 'Play / Stop' },
  { value: 'evaluate', label: 'Evaluate Code' },
  { value: 'tap_tempo', label: 'Tap Tempo' },
  { value: 'mute_track_1', label: 'Mute Drums' },
  { value: 'mute_track_2', label: 'Mute Bass' },
  { value: 'mute_track_3', label: 'Mute Chords' },
  { value: 'mute_track_4', label: 'Mute Lead' },
  { value: 'load_preset_1', label: 'Preset 1 (Lo-Fi)' },
  { value: 'load_preset_2', label: 'Preset 2 (Acid)' },
  { value: 'load_preset_3', label: 'Preset 3 (House)' },
  { value: 'load_preset_4', label: 'Preset 4 (Poly)' },
  { value: 'playlist_next', label: 'Playlist Next (Fade)' },
  { value: 'playlist_prev', label: 'Playlist Prev (Fade)' },
];

// 1-octave + C5 interactive mini keyboard (MIDI 60..72)
const MINI_KEYS = [
  { note: 60, label: 'C4', black: false },
  { note: 61, label: 'C#', black: true },
  { note: 62, label: 'D4', black: false },
  { note: 63, label: 'D#', black: true },
  { note: 64, label: 'E4', black: false },
  { note: 65, label: 'F4', black: false },
  { note: 66, label: 'F#', black: true },
  { note: 67, label: 'G4', black: false },
  { note: 68, label: 'G#', black: true },
  { note: 69, label: 'A4', black: false },
  { note: 70, label: 'A#', black: true },
  { note: 71, label: 'B4', black: false },
  { note: 72, label: 'C5', black: false },
];

export function RightControlPanel({ onInsertSnippet }: RightControlPanelProps) {
  const activeRightTab = useStudioStore((s) => s.activeRightTab);
  const setActiveRightTab = useStudioStore((s) => s.setActiveRightTab);

  const macros = useStudioStore((s) => s.macros);
  const setMacroValue = useStudioStore((s) => s.setMacroValue);
  const setMacroLabel = useStudioStore((s) => s.setMacroLabel);
  const clearMacroMidi = useStudioStore((s) => s.clearMacroMidi);

  const midiSupported = useStudioStore((s) => s.midiSupported);
  const midiEnabled = useStudioStore((s) => s.midiEnabled);
  const midiInputs = useStudioStore((s) => s.midiInputs);
  const midiOutputs = useStudioStore((s) => s.midiOutputs);
  const selectedMidiOutputId = useStudioStore((s) => s.selectedMidiOutputId);
  const setSelectedMidiOutputId = useStudioStore((s) => s.setSelectedMidiOutputId);
  const learningTarget = useStudioStore((s) => s.learningTarget);
  const setLearningTarget = useStudioStore((s) => s.setLearningTarget);

  const padMappings = useStudioStore((s) => s.padMappings);
  const setPadAction = useStudioStore((s) => s.setPadAction);
  const clearPadMidi = useStudioStore((s) => s.clearPadMidi);

  const activeNotes = useStudioStore((s) => s.activeNotes);
  const isCapturingNotes = useStudioStore((s) => s.isCapturingNotes);
  const capturedNotes = useStudioStore((s) => s.capturedNotes);
  const toggleCaptureNotes = useStudioStore((s) => s.toggleCaptureNotes);
  const clearCapturedNotes = useStudioStore((s) => s.clearCapturedNotes);
  const keyboardSynth = useStudioStore((s) => s.keyboardSynth);
  const setKeyboardSynth = useStudioStore((s) => s.setKeyboardSynth);

  const midiLogs = useStudioStore((s) => s.midiLogs);
  const clearMidiLogs = useStudioStore((s) => s.clearMidiLogs);

  const selectedOutput = midiOutputs.find((o) => o.id === selectedMidiOutputId);

  const handleInsertCaptured = () => {
    const snippet = buildCapturedNotesSnippet(capturedNotes, keyboardSynth);
    if (snippet) {
      onInsertSnippet(snippet);
    }
  };

  return (
    <aside className="w-80 shrink-0 flex flex-col h-full bg-[#11141a] border-l border-[#222732] select-none">
      {/* Top Tabs */}
      <div className="grid grid-cols-2 p-1.5 gap-1 border-b border-[#222732] bg-[#0e1116]">
        <button
          type="button"
          onClick={() => setActiveRightTab('macros')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeRightTab === 'macros'
              ? 'bg-[#1e2430] text-emerald-300 shadow-sm'
              : 'text-[#7c8698] hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Macro Knobs</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveRightTab('midi')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeRightTab === 'midi'
              ? 'bg-[#1e2430] text-emerald-300 shadow-sm'
              : 'text-[#7c8698] hover:text-white'
          }`}
        >
          <Cable className="w-3.5 h-3.5" />
          <span>MIDI Center</span>
        </button>
      </div>

      {/* Macros Tab */}
      {activeRightTab === 'macros' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="p-2.5 rounded-lg bg-[#151a23] border border-[#232936] text-[11px] text-[#8b95a7] leading-relaxed">
            Use <code className="text-emerald-300 font-mono">macro(1).range(200, 4000)</code> in
            code, then click <strong className="text-amber-300">Learn</strong> and twist any knob on
            your MIDI controller.
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {macros.map((macro) => {
              const isLearning =
                learningTarget?.kind === 'macro' && learningTarget.macroId === macro.id;
              return (
                <MacroKnobDial
                  key={macro.id}
                  macro={macro}
                  isLearning={isLearning}
                  onChange={(v) => setMacroValue(macro.id, v)}
                  onLabelChange={(lbl) => setMacroLabel(macro.id, lbl)}
                  onToggleLearn={() =>
                    setLearningTarget(isLearning ? null : { kind: 'macro', macroId: macro.id })
                  }
                  onClearMidi={() => clearMacroMidi(macro.id)}
                  onInsertCode={onInsertSnippet}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* MIDI Control Center Tab */}
      {activeRightTab === 'midi' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* 1. Connection & Devices */}
          <section className="p-2.5 rounded-xl bg-[#151922] border border-[#232936] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9aa4b6]">
                WebMIDI Devices
              </span>
              <button
                type="button"
                onClick={() => void midiEngine.init()}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1e2430] text-[10px] font-medium text-emerald-300 hover:bg-[#273040] cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                {midiEnabled ? 'Refresh' : 'Connect'}
              </button>
            </div>

            {!midiSupported ? (
              <p className="text-[11px] text-amber-300/90">
                WebMIDI requires Chrome, Edge, Brave, or Opera. You can still use the virtual
                keyboard &amp; macro knobs below.
              </p>
            ) : (
              <div className="space-y-1.5 text-[11px]">
                <div>
                  <div className="text-[10px] font-mono text-[#6d778a] mb-0.5">
                    INPUTS ({midiInputs.length})
                  </div>
                  {midiInputs.length === 0 ? (
                    <div className="text-[#6d778a] italic">
                      No MIDI controllers detected — plug in USB MIDI &amp; click Refresh.
                    </div>
                  ) : (
                    midiInputs.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between px-2 py-1 rounded bg-[#0f1218] border border-[#222835]"
                      >
                        <span className="truncate text-emerald-200">{d.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onInsertSnippet(`const cc = await midin('${d.name}')`)
                          }
                          className="text-[10px] font-mono text-cyan-300 hover:underline ml-2 shrink-0 cursor-pointer"
                          title="Insert native midin() syntax"
                        >
                          +midin
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* MIDI Output & Clock Sync */}
                <div className="pt-1">
                  <div className="text-[10px] font-mono text-[#6d778a] mb-1">
                    MIDI OUT / HARDWARE SYNC ({midiOutputs.length})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedMidiOutputId}
                      onChange={(e) => setSelectedMidiOutputId(e.target.value)}
                      className="flex-1 bg-[#0f1218] border border-[#232936] rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                    >
                      {midiOutputs.length === 0 ? (
                        <option value="">No MIDI Outputs</option>
                      ) : (
                        midiOutputs.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedOutput}
                      onClick={() => midiEngine.sendTestNoteToOutput(60)}
                      className="p-1.5 rounded bg-[#1e2430] text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-40 cursor-pointer"
                      title="Send test C4 note to MIDI Out"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                  {selectedOutput && (
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => onInsertSnippet(`.midi('${selectedOutput.name}')`)}
                        className="flex-1 py-1 rounded bg-[#1b202b] text-[10px] font-mono text-cyan-300 hover:bg-[#242b3a] cursor-pointer"
                      >
                        +.midi(&apos;Out&apos;)
                      </button>
                      <button
                        type="button"
                        onClick={() => onInsertSnippet(`.midiclock()`)}
                        className="flex-1 py-1 rounded bg-[#1b202b] text-[10px] font-mono text-amber-300 hover:bg-[#242b3a] cursor-pointer"
                      >
                        +.midiclock()
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 2. Keyboard Live Play & Capture to Pattern */}
          <section className="p-2.5 rounded-xl bg-[#151922] border border-[#232936] space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9aa4b6]">
                <Piano className="w-3.5 h-3.5 text-cyan-400" />
                Keyboard &amp; Capture
              </span>
              <select
                value={keyboardSynth}
                onChange={(e) => setKeyboardSynth(e.target.value)}
                className="bg-[#0f1218] border border-[#232936] rounded px-1.5 py-0.5 text-[10px] font-mono text-emerald-300"
              >
                <option value="studio_osc">Studio Oscillator</option>
                <option value="gm_epiano1">Rhodes</option>
                <option value="gm_acoustic_grand_piano">Grand Piano</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="triangle">Triangle</option>
                <option value="supersaw">Supersaw</option>
              </select>
            </div>

            {/* Interactive Mini Piano Strip */}
            <div className="flex gap-0.5 h-14 bg-[#0c0e13] p-1 rounded-lg border border-[#202633]">
              {MINI_KEYS.map((k) => {
                const isPressed = activeNotes.includes(k.note);
                return (
                  <button
                    key={k.note}
                    type="button"
                    onMouseDown={() =>
                      midiEngine.simulateMidiMessage([0x90, k.note, 100], 'Studio Keys')
                    }
                    onMouseUp={() =>
                      midiEngine.simulateMidiMessage([0x80, k.note, 0], 'Studio Keys')
                    }
                    onMouseLeave={() => {
                      if (isPressed) {
                        midiEngine.simulateMidiMessage([0x80, k.note, 0], 'Studio Keys');
                      }
                    }}
                    className={`flex-1 rounded-b text-[8px] font-mono flex items-end justify-center pb-1 transition-all cursor-pointer ${
                      k.black
                        ? isPressed
                          ? 'bg-emerald-400 text-black h-9'
                          : 'bg-[#1f2430] text-[#7c8698] h-9 hover:bg-[#2b3242]'
                        : isPressed
                          ? 'bg-emerald-300 text-black h-full'
                          : 'bg-[#d8dfeb] text-[#3a4252] h-full hover:bg-white'
                    }`}
                  >
                    {!k.black ? k.label.replace('4', '').replace('5', '') : ''}
                  </button>
                );
              })}
            </div>

            {/* Capture Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleCaptureNotes}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  isCapturingNotes
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-[#1e2430] text-[#c2cbd9] hover:text-white'
                }`}
              >
                <Circle className="w-2.5 h-2.5 fill-current" />
                <span>{isCapturingNotes ? 'Recording Notes...' : 'Capture Notes'}</span>
              </button>
              <button
                type="button"
                disabled={capturedNotes.length === 0}
                onClick={handleInsertCaptured}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/30 disabled:opacity-35 cursor-pointer"
                title="Insert captured notes into Strudel editor"
              >
                <Plus className="w-3 h-3" />
                Insert
              </button>
              <button
                type="button"
                onClick={clearCapturedNotes}
                className="p-1 rounded-md bg-[#1e2430] text-[#7c8698] hover:text-rose-300 cursor-pointer"
                title="Clear captured notes"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {capturedNotes.length > 0 && (
              <div className="p-1.5 rounded bg-[#0e1116] border border-[#212734] font-mono text-[10.5px] text-emerald-300 break-words">
                note(&quot;{capturedNotes.join(' ')}&quot;)
              </div>
            )}
          </section>

          {/* 3. Pad Controller / Grid Mapper */}
          <section className="p-2.5 rounded-xl bg-[#151922] border border-[#232936] space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9aa4b6]">
                <Grid className="w-3.5 h-3.5 text-amber-400" />
                Pad Controller Map
              </span>
              <span className="text-[10px] font-mono text-[#6d778a]">Click to test</span>
            </div>

            <div className="space-y-1.5">
              {padMappings.map((pad) => {
                const isLearning =
                  learningTarget?.kind === 'pad' && learningTarget.padId === pad.id;
                return (
                  <div
                    key={pad.id}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#0f1218] border border-[#202633]"
                  >
                    <button
                      type="button"
                      onClick={() => midiEngine.executePadAction(pad.action)}
                      className="px-2 py-1 rounded bg-[#1c222e] text-[10px] font-mono font-semibold text-white hover:bg-emerald-500/20 hover:text-emerald-300 cursor-pointer shrink-0"
                      title="Trigger pad action"
                    >
                      {pad.label}
                    </button>

                    <select
                      value={pad.action}
                      onChange={(e) => setPadAction(pad.id, e.target.value as PadActionType)}
                      className="flex-1 min-w-0 bg-[#161a22] border border-[#242b38] rounded px-1.5 py-1 text-[10.5px] text-[#d5dce8]"
                    >
                      {PAD_ACTIONS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setLearningTarget(isLearning ? null : { kind: 'pad', padId: pad.id })
                      }
                      className={`px-1.5 py-1 rounded text-[9.5px] font-mono shrink-0 cursor-pointer ${
                        isLearning
                          ? 'bg-amber-500 text-black font-bold animate-pulse'
                          : pad.midiBinding
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-[#1c222e] text-[#7c8698] hover:text-amber-300'
                      }`}
                    >
                      {isLearning
                        ? 'HIT...'
                        : pad.midiBinding
                          ? formatMidiBinding(pad.midiBinding)
                          : 'Learn'}
                    </button>

                    {pad.midiBinding && (
                      <button
                        type="button"
                        onClick={() => clearPadMidi(pad.id)}
                        className="text-[#6d778a] hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. Live MIDI Activity Monitor */}
          <section className="p-2.5 rounded-xl bg-[#151922] border border-[#232936] space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9aa4b6]">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Live MIDI Monitor
              </span>
              <button
                type="button"
                onClick={clearMidiLogs}
                className="text-[10px] text-[#6d778a] hover:text-white cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="h-28 overflow-y-auto rounded-lg bg-[#0b0d11] border border-[#1e2430] p-2 font-mono text-[10px] space-y-1">
              {midiLogs.length === 0 ? (
                <div className="text-[#596275] italic">
                  Waiting for MIDI messages (CC, Notes, Pads)...
                </div>
              ) : (
                midiLogs.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between gap-2 text-[#a8b3c7]">
                    <span className={ev.direction === 'in' ? 'text-emerald-400' : 'text-cyan-400'}>
                      {ev.direction.toUpperCase()} CH{ev.channel}
                    </span>
                    <span className="text-white">
                      {ev.type === 'cc'
                        ? `CC${ev.number}`
                        : `${ev.type.toUpperCase()} ${ev.noteName?.toUpperCase() ?? midiNoteToStrudelName(ev.number)}`}
                    </span>
                    <span className="text-amber-300">val:{ev.value}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
