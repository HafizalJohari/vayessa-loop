import { useEffect, useRef } from 'react';
import {
  Activity,
  AudioWaveform,
  Grid3x3,
  ListMusic,
  Monitor,
  SlidersHorizontal,
  Waves,
} from 'lucide-react';
import { TransportBar } from '@/components/Transport/TransportBar';
import { SoundBrowser } from '@/components/Browser/SoundBrowser';
import { StrudelEditor, type StrudelEditorHandle } from '@/components/Editor/StrudelEditor';
import { ModeToolbar } from '@/components/Modes/ModeToolbar';
import { RightControlPanel } from '@/components/Midi/RightControlPanel';
import { AudioVisualizer } from '@/components/Visualizer/AudioVisualizer';
import { StepSequencer } from '@/components/Sequencer/StepSequencer';
import { TrackMixer } from '@/components/Mixer/TrackMixer';
import { PlaylistPanel } from '@/components/Playlist/PlaylistPanel';
import { SamplerPanel } from '@/components/Sampler/SamplerPanel';
import { OscillatorPanel } from '@/components/Oscillator/OscillatorPanel';
import { HydraPanel } from '@/components/Hydra/HydraPanel';
import { HydraStageWindow } from '@/components/Hydra/HydraStageWindow';
import { McpModal } from '@/components/Mcp/McpModal';
import { useStudioStore, type DockTab } from '@/store/useStudioStore';
import { midiEngine } from '@/engine/midiEngine';
import { mcpBridge } from '@/engine/mcpBridge';
import { hydraBridge } from '@/engine/hydraBridge';

export function App() {
  // Check if opened as dedicated 2nd Monitor Hydra Stage window (/?view=hydra)
  const isHydraStage =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('view') === 'hydra';

  if (isHydraStage) {
    return <HydraStageWindow />;
  }

  return <StudioMainWorkspace />;
}

function StudioMainWorkspace() {
  const editorRef = useRef<StrudelEditorHandle | null>(null);

  const leftSidebarOpen = useStudioStore((s) => s.leftSidebarOpen);
  const rightPanelOpen = useStudioStore((s) => s.rightPanelOpen);
  const bottomDockOpen = useStudioStore((s) => s.bottomDockOpen);
  const activeDockTab = useStudioStore((s) => s.activeDockTab);
  const setActiveDockTab = useStudioStore((s) => s.setActiveDockTab);
  const studioMode = useStudioStore((s) => s.studioMode);

  // Auto-init WebMIDI, MCP WebSocket bridge, and Hydra BroadcastChannel on mount
  useEffect(() => {
    void midiEngine.init();
    mcpBridge.start();
    hydraBridge.init();
    return () => {
      mcpBridge.stop();
    };
  }, []);

  const handleInsertSnippet = (snippet: string) => {
    editorRef.current?.insertSnippet(snippet);
  };

  const dockTabs: { id: DockTab; label: string; icon: typeof Activity }[] = [
    { id: 'visualizer', label: 'Piano Roll & Scope', icon: Activity },
    { id: 'sequencer', label: 'Step Sequencer', icon: Grid3x3 },
    { id: 'mixer', label: 'Track Mixer', icon: SlidersHorizontal },
    { id: 'playlist', label: 'Live Playlist', icon: ListMusic },
    { id: 'sampler', label: 'Sampler & Wave Shift', icon: AudioWaveform },
    { id: 'oscillator', label: 'Oscillator', icon: Waves },
    { id: 'hydra', label: 'Hydra 2nd Monitor', icon: Monitor },
  ];

  // In Live mode, collapse the left browser by default for a clean stage view unless toggled
  const showLeftBrowser = leftSidebarOpen && studioMode !== 'live';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d0f12] text-[#e6eaf0] overflow-hidden">
      {/* Top Transport Bar */}
      <TransportBar />

      {/* Main 3-Column DAW Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Sound, Sample & Preset Browser */}
        {showLeftBrowser && <SoundBrowser onInsertSnippet={handleInsertSnippet} />}

        {/* Center: Mode Bar + Editor + Bottom Dock */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Context-aware Practice / Jam / Live Session Toolbar */}
          <ModeToolbar onInsertSnippet={handleInsertSnippet} />

          {/* CodeMirror Strudel Editor + Floating Syntax Error Popup */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <StrudelEditor ref={editorRef} />
          </div>

          {/* Bottom Dock: Visualizer / Step Sequencer / Mixer / Live Playlist / Hydra */}
          {bottomDockOpen && (
            <section
              className={`${
                studioMode === 'live' ? 'h-72' : 'h-64'
              } shrink-0 flex flex-col border-t border-[#242a36] bg-[#11141a]`}
            >
              {/* Dock Tab Bar */}
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[#202633] bg-[#12161d] select-none">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {dockTabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveDockTab(id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        activeDockTab === id
                          ? id === 'hydra'
                            ? 'bg-fuchsia-500/20 text-fuchsia-200'
                            : 'bg-[#202736] text-emerald-300'
                          : 'text-[#7c8698] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-mono text-[#5c6577] hidden xl:inline whitespace-nowrap">
                  Vayessa Loop · Powered by{' '}
                  <a
                    href="https://codeberg.org/uzu/strudel"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400/80 hover:text-emerald-300 underline"
                  >
                    Strudel
                  </a>
                </span>
              </div>

              {/* Active Dock Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeDockTab === 'visualizer' && <AudioVisualizer />}
                {activeDockTab === 'sequencer' && <StepSequencer />}
                {activeDockTab === 'mixer' && <TrackMixer />}
                {activeDockTab === 'playlist' && <PlaylistPanel />}
                {activeDockTab === 'sampler' && (
                  <SamplerPanel onInsertSnippet={handleInsertSnippet} />
                )}
                {activeDockTab === 'oscillator' && (
                  <OscillatorPanel onInsertSnippet={handleInsertSnippet} />
                )}
                {activeDockTab === 'hydra' && <HydraPanel />}
              </div>
            </section>
          )}
        </main>

        {/* Right: Macro Knobs & MIDI Control Center */}
        {rightPanelOpen && <RightControlPanel onInsertSnippet={handleInsertSnippet} />}
      </div>

      {/* AI MCP Setup & Activity Modal */}
      <McpModal />
    </div>
  );
}

export default App;
