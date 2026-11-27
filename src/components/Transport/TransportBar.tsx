import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  Cable,
  Circle,
  Download,
  Monitor,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Play,
  Radio,
  Square,
  Volume2,
} from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { strudelEngine } from '@/engine/strudelEngine';
import { midiEngine } from '@/engine/midiEngine';
import { hydraBridge } from '@/engine/hydraBridge';
import { audioRecorder } from '@/engine/audioRecorder';
import type { StudioMode } from '@/types/studio';

export function TransportBar() {
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const bpm = useStudioStore((s) => s.bpm);
  const masterGain = useStudioStore((s) => s.masterGain);
  const setMasterGain = useStudioStore((s) => s.setMasterGain);
  const midiSupported = useStudioStore((s) => s.midiSupported);
  const midiEnabled = useStudioStore((s) => s.midiEnabled);
  const midiInputs = useStudioStore((s) => s.midiInputs);
  const midiActivityPulse = useStudioStore((s) => s.midiActivityPulse);
  const learningTarget = useStudioStore((s) => s.learningTarget);
  const setLearningTarget = useStudioStore((s) => s.setLearningTarget);
  const setActiveRightTab = useStudioStore((s) => s.setActiveRightTab);
  const mcpConnected = useStudioStore((s) => s.mcpConnected);
  const setMcpModalOpen = useStudioStore((s) => s.setMcpModalOpen);
  const studioMode = useStudioStore((s) => s.studioMode);
  const setStudioMode = useStudioStore((s) => s.setStudioMode);
  const hydraStageConnected = useStudioStore((s) => s.hydraStageConnected);
  const isRecordingAudio = useStudioStore((s) => s.isRecordingAudio);
  const recordingElapsedSec = useStudioStore((s) => s.recordingElapsedSec);

  const leftSidebarOpen = useStudioStore((s) => s.leftSidebarOpen);
  const rightPanelOpen = useStudioStore((s) => s.rightPanelOpen);
  const bottomDockOpen = useStudioStore((s) => s.bottomDockOpen);
  const toggleLeftSidebar = useStudioStore((s) => s.toggleLeftSidebar);
  const toggleRightPanel = useStudioStore((s) => s.toggleRightPanel);
  const toggleBottomDock = useStudioStore((s) => s.toggleBottomDock);

  const [beatIndex, setBeatIndex] = useState(0);
  const [midiFlash, setMidiFlash] = useState(false);
  const [meterLevel, setMeterLevel] = useState(0);
  const tapTimesRef = useRef<number[]>([]);

  // Beat indicator, audio level meter & Hydra 2nd Monitor FFT telemetry loop
  useEffect(() => {
    let rafId = 0;
    const buf = new Uint8Array(256);
    const freqBuf = new Uint8Array(128);
    let frameCount = 0;

    const tick = () => {
      const state = useStudioStore.getState();
      if (state.isPlaying) {
        const cycle = strudelEngine.getCurrentCycle();
        setBeatIndex(Math.floor((cycle * 4) % 4));
      } else {
        setBeatIndex(0);
      }

      const analyser = strudelEngine.getAnalyserNode();
      let bass = 0;
      let mid = 0;
      let high = 0;
      let volume = 0;

      if (analyser && state.isPlaying) {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i] - 128) / 128;
          if (v > peak) peak = v;
        }
        volume = Math.min(1, peak * 2.2);
        setMeterLevel(volume);

        analyser.getByteFrequencyData(freqBuf);
        let bSum = 0;
        let mSum = 0;
        let hSum = 0;
        for (let i = 0; i < 12; i++) bSum += freqBuf[i];
        for (let i = 12; i < 48; i++) mSum += freqBuf[i];
        for (let i = 48; i < 110; i++) hSum += freqBuf[i];
        bass = bSum / (12 * 255);
        mid = mSum / (36 * 255);
        high = hSum / (62 * 255);
      } else {
        setMeterLevel((prev) => (prev > 0.01 ? prev * 0.85 : 0));
      }

      frameCount++;
      if (frameCount % 2 === 0 && (state.hydraStageConnected || hydraBridge.isStageOpen())) {
        hydraBridge.sendTelemetry({
          bass,
          mid,
          high,
          volume,
          bpm: state.bpm,
          isPlaying: state.isPlaying,
          macros: state.macros.map((m) => m.value),
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (midiActivityPulse === 0) return;
    setMidiFlash(true);
    const t = setTimeout(() => setMidiFlash(false), 140);
    return () => clearTimeout(t);
  }, [midiActivityPulse]);

  const handleTapTempo = () => {
    const now = performance.now();
    tapTimesRef.current = tapTimesRef.current.filter((t) => now - t < 2500);
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      strudelEngine.setBpm(Math.round(60000 / avg));
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      strudelEngine.stop();
    } else {
      void strudelEngine.evaluate(useStudioStore.getState().code);
    }
  };

  const handleToggleRecordWav = async () => {
    try {
      if (isRecordingAudio) {
        const res = await audioRecorder.stopRecording();
        audioRecorder.downloadWav(res.wavBlob);
      } else {
        if (!useStudioStore.getState().isPlaying) {
          await strudelEngine.evaluate(useStudioStore.getState().code);
        }
        await audioRecorder.startRecording();
      }
    } catch (err) {
      useStudioStore
        .getState()
        .setStatusMessage(err instanceof Error ? err.message : 'WAV recording failed');
    }
  };

  const formatRecTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const isLearningBpm = learningTarget?.kind === 'bpm';

  return (
    <header className="h-13 shrink-0 flex items-center justify-between px-3 bg-[#12151b] border-b border-[#242a36] select-none gap-2">
      {/* Left: Brand, Panel Toggles & Studio Mode Switcher */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-4 h-4 text-[#0b0e11] stroke-[2.5]" />
          </div>
          <div className="leading-none hidden sm:block">
            <div className="text-xs font-bold tracking-wider text-white">VAYESSA LOOP</div>
            <div className="text-[10px] text-[#6d778a] font-mono">LIVE-CODING DAW</div>
          </div>
        </div>

        <div className="h-5 w-px bg-[#242a36]" />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleLeftSidebar}
            title="Toggle Sound & Preset Browser"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              leftSidebarOpen
                ? 'bg-[#222834] text-emerald-400'
                : 'text-[#7c8698] hover:text-white hover:bg-[#1b202a]'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleBottomDock}
            title="Toggle Bottom Dock"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              bottomDockOpen
                ? 'bg-[#222834] text-emerald-400'
                : 'text-[#7c8698] hover:text-white hover:bg-[#1b202a]'
            }`}
          >
            <PanelBottom className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleRightPanel}
            title="Toggle Macro Knobs & MIDI Panel"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              rightPanelOpen
                ? 'bg-[#222834] text-emerald-400'
                : 'text-[#7c8698] hover:text-white hover:bg-[#1b202a]'
            }`}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Mode Switcher: Practice | Jam | Live */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#0c0e13] border border-[#232936]">
          {(
            [
              { id: 'practice', label: 'Practice' },
              { id: 'jam', label: 'Jam' },
              { id: 'live', label: 'Live' },
            ] as { id: StudioMode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setStudioMode(m.id)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                studioMode === m.id
                  ? m.id === 'live'
                    ? 'bg-emerald-500 text-[#07110b]'
                    : m.id === 'practice'
                      ? 'bg-cyan-500/25 text-cyan-200'
                      : 'bg-[#222836] text-white'
                  : 'text-[#6f798c] hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Transport Controls + BPM + Beat LEDs */}
      <div className="flex items-center gap-2 bg-[#0d0f14] px-2.5 py-1 rounded-xl border border-[#232936]">
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isPlaying
              ? 'bg-emerald-500 text-[#09110d] shadow-md shadow-emerald-500/30'
              : 'bg-[#1c222d] text-[#d9e0ec] hover:bg-emerald-500/20 hover:text-emerald-300'
          }`}
          title="Play / Stop (Cmd+Enter)"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isPlaying ? 'LIVE' : 'PLAY'}</span>
        </button>

        <button
          type="button"
          onClick={() => strudelEngine.stop()}
          className="p-1.5 rounded-lg bg-[#1c222d] text-[#9aa4b6] hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
          title="Stop All (Cmd+.)"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Record & Export WAV Button */}
        <button
          type="button"
          onClick={() => void handleToggleRecordWav()}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            isRecordingAudio
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
              : 'bg-[#1c222d] text-[#c5cfdf] hover:text-rose-300 hover:bg-rose-500/15'
          }`}
          title={isRecordingAudio ? 'Stop Recording & Download WAV' : 'Record Audio & Export WAV'}
        >
          {isRecordingAudio ? (
            <>
              <Download className="w-3 h-3" />
              <span className="font-mono">{formatRecTime(recordingElapsedSec)}</span>
            </>
          ) : (
            <>
              <Circle className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
              <span className="hidden sm:inline">WAV</span>
            </>
          )}
        </button>

        <div className="hidden lg:flex items-center gap-1 px-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                isPlaying && beatIndex === i
                  ? i === 0
                    ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                    : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-[#283040]'
              }`}
            />
          ))}
        </div>

        <div className="h-4 w-px bg-[#242a36]" />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-[#6d778a]">BPM</span>
          <input
            type="number"
            min={40}
            max={240}
            value={bpm}
            onChange={(e) => strudelEngine.setBpm(Number(e.target.value))}
            className="w-12 bg-[#161a22] text-center font-mono text-xs font-semibold text-emerald-300 rounded px-1 py-0.5 border border-[#262d3b] focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={handleTapTempo}
            className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-[#1b202b] text-[#9aa4b6] hover:text-white hover:bg-[#252c3b] border border-[#2a3140] transition-colors cursor-pointer"
            title="Click repeatedly to set tempo"
          >
            TAP
          </button>
          <button
            type="button"
            onClick={() => setLearningTarget(isLearningBpm ? null : { kind: 'bpm' })}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              isLearningBpm
                ? 'bg-amber-500 text-black font-bold animate-pulse'
                : 'text-[#6d778a] hover:text-amber-300 hover:bg-[#1b202b]'
            }`}
            title="MIDI Learn BPM"
          >
            {isLearningBpm ? 'TWIST...' : 'MIDI'}
          </button>
        </div>
      </div>

      {/* Right: Hydra 2nd Monitor + AI MCP + MIDI Pill + Master Meter & Gain */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => hydraBridge.openSecondMonitorWindow()}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all cursor-pointer ${
            hydraStageConnected
              ? 'bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-200'
              : 'bg-[#171b22] border-[#262d3a] text-[#8b95a7] hover:text-fuchsia-200'
          }`}
          title="Open Hydra Live Visuals on 2nd Monitor"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="font-medium hidden xl:inline">Hydra</span>
        </button>

        <button
          type="button"
          onClick={() => setMcpModalOpen(true)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all cursor-pointer ${
            mcpConnected
              ? 'bg-violet-500/15 border-violet-400/40 text-violet-200 hover:border-violet-300/70'
              : 'bg-[#171b22] border-[#262d3a] text-[#8b95a7] hover:text-white'
          }`}
          title="AI MCP Control & Setup"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              mcpConnected ? 'bg-violet-400 shadow-[0_0_8px_#a78bfa]' : 'bg-[#465063]'
            }`}
          />
          <Bot className="w-3.5 h-3.5" />
          <span className="font-medium hidden xl:inline">{mcpConnected ? 'AI MCP' : 'MCP'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!midiEnabled && midiSupported) {
              void midiEngine.init();
            }
            setActiveRightTab('midi');
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all cursor-pointer ${
            midiEnabled
              ? 'bg-[#171c26] border-emerald-500/30 text-emerald-200 hover:border-emerald-400/60'
              : 'bg-[#171b22] border-[#262d3a] text-[#8b95a7] hover:text-white'
          }`}
          title="Open MIDI Controller Center"
        >
          <span
            className={`w-2 h-2 rounded-full transition-all ${
              midiFlash
                ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24] scale-125'
                : midiInputs.length > 0
                  ? 'bg-emerald-400'
                  : 'bg-[#465063]'
            }`}
          />
          <Cable className="w-3.5 h-3.5" />
          <span className="font-medium hidden xl:inline">
            {midiInputs.length > 0
              ? `MIDI (${midiInputs.length})`
              : midiSupported
                ? 'MIDI'
                : 'No MIDI'}
          </span>
        </button>

        <div className="hidden 2xl:flex items-center gap-2 bg-[#0d0f14] px-2.5 py-1 rounded-lg border border-[#232936]">
          <Volume2 className="w-3.5 h-3.5 text-[#7c8698]" />
          <input
            type="range"
            min={0}
            max={1.2}
            step={0.01}
            value={masterGain}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMasterGain(v);
              strudelEngine.applyMasterGain(v);
            }}
            className="studio-slider w-14"
            title={`Master Volume: ${Math.round(masterGain * 100)}%`}
          />
          <div className="w-10 h-2 bg-[#1a1f29] rounded-full overflow-hidden border border-[#262d3b]">
            <div
              className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400"
              style={{ width: `${Math.round(meterLevel * 100)}%` }}
            />
          </div>
        </div>

        {learningTarget && (
          <button
            type="button"
            onClick={() => setLearningTarget(null)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold animate-pulse cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>CANCEL</span>
          </button>
        )}
      </div>
    </header>
  );
}
