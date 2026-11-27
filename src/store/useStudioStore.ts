import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FadeStyle,
  HydraPreset,
  LearnTarget,
  MacroKnob,
  MidiBinding,
  MidiDeviceInfo,
  MidiLogEvent,
  MixerTrack,
  OscillatorSettings,
  PadActionType,
  PadMapping,
  PatternSnapshot,
  PlaylistCollection,
  PlaylistItem,
  PresetItem,
  SequencerRow,
  StudioMode,
  SyntaxDiagnostic,
} from '@/types/studio';
import type { McpCommandLog } from '@/types/mcp';
import { STUDIO_PRESETS } from '@/data/presets';
import { HYDRA_PRESETS } from '@/data/hydraPresets';
import { createDefaultSequencerRows } from '@/engine/sequencerSync';
import { DEFAULT_OSCILLATOR_SETTINGS } from '@/engine/oscillatorUtils';

const DEFAULT_MACROS: MacroKnob[] = [
  { id: 1, label: 'Filter Cutoff', value: 0.65, min: 0, max: 1, color: '#34d399' },
  { id: 2, label: 'Reverb / Q', value: 0.35, min: 0, max: 1, color: '#38bdf8' },
  { id: 3, label: 'Delay Mix', value: 0.25, min: 0, max: 1, color: '#a78bfa' },
  { id: 4, label: 'FM / Space', value: 0.3, min: 0, max: 1, color: '#f59e0b' },
  { id: 5, label: 'Macro 5', value: 0.5, min: 0, max: 1, color: '#f472b6' },
  { id: 6, label: 'Macro 6', value: 0.5, min: 0, max: 1, color: '#2dd4bf' },
  { id: 7, label: 'Macro 7', value: 0.5, min: 0, max: 1, color: '#fb7185' },
  { id: 8, label: 'Macro 8', value: 0.5, min: 0, max: 1, color: '#60a5fa' },
];

const DEFAULT_TRACKS: MixerTrack[] = [
  { id: 'drums', name: 'Drums', color: '#34d399', muted: false, solo: false, gain: 1.0, lpf: 18000 },
  { id: 'bass', name: 'Bass', color: '#a78bfa', muted: false, solo: false, gain: 1.0, lpf: 18000 },
  { id: 'chords', name: 'Chords', color: '#38bdf8', muted: false, solo: false, gain: 1.0, lpf: 18000 },
  { id: 'lead', name: 'Lead', color: '#f59e0b', muted: false, solo: false, gain: 1.0, lpf: 18000 },
];

const DEFAULT_PADS: PadMapping[] = [
  { id: 'pad-1', label: 'Pad 1', action: 'toggle_play' },
  { id: 'pad-2', label: 'Pad 2', action: 'evaluate' },
  { id: 'pad-3', label: 'Pad 3', action: 'mute_track_1' },
  { id: 'pad-4', label: 'Pad 4', action: 'mute_track_2' },
  { id: 'pad-5', label: 'Pad 5', action: 'mute_track_3' },
  { id: 'pad-6', label: 'Pad 6', action: 'mute_track_4' },
  { id: 'pad-7', label: 'Pad 7', action: 'playlist_prev' },
  { id: 'pad-8', label: 'Pad 8', action: 'playlist_next' },
];

const DEFAULT_PLAYLIST: PlaylistItem[] = STUDIO_PRESETS.slice(0, 4).map((p, idx) => ({
  id: `pl-${p.id}`,
  title: p.name,
  bpm: p.bpm,
  code: p.code,
  fadeSeconds: 4,
  fadeStyle: idx % 2 === 0 ? 'smooth' : 'filter',
  hydraPresetId: HYDRA_PRESETS[idx % HYDRA_PRESETS.length]?.id,
}));

const DEFAULT_PLAYLIST_COLLECTIONS: PlaylistCollection[] = [
  {
    id: 'set-main',
    name: 'Main Live Set',
    items: DEFAULT_PLAYLIST,
  },
];

const DEFAULT_SNAPSHOTS: PatternSnapshot[] = [
  { slot: 'A', code: STUDIO_PRESETS[0].code, bpm: STUDIO_PRESETS[0].bpm },
  { slot: 'B', code: STUDIO_PRESETS[1].code, bpm: STUDIO_PRESETS[1].bpm },
  { slot: 'C', code: STUDIO_PRESETS[2].code, bpm: STUDIO_PRESETS[2].bpm },
  { slot: 'D', code: STUDIO_PRESETS[3].code, bpm: STUDIO_PRESETS[3].bpm },
];

export type DockTab = 'sequencer' | 'visualizer' | 'mixer' | 'playlist' | 'sampler' | 'oscillator' | 'hydra';
export type RightTab = 'macros' | 'midi';

interface StudioState {
  // Editor & Transport
  code: string;
  isPlaying: boolean;
  audioReady: boolean;
  bpm: number;
  masterGain: number;
  activeError: string | null;
  syntaxDiagnostic: SyntaxDiagnostic | null;
  statusMessage: string;

  // Studio Modes (Practice / Jam / Live)
  studioMode: StudioMode;
  practiceSpeed: number; // 0.5 | 0.75 | 1
  metronomeEnabled: boolean;
  snapshots: PatternSnapshot[];

  // Custom Presets & Multi-Playlists
  customPresets: PresetItem[];
  playlists: PlaylistCollection[];
  activePlaylistCollectionId: string;

  // Active Live Playlist & Fade Transitions
  playlist: PlaylistItem[];
  activePlaylistId: string | null;
  isTransitioning: boolean;
  transitionProgress: number;
  transitionLabel: string;

  // Hydra 2nd Monitor Visuals
  customHydraPresets: HydraPreset[];
  hydraCode: string;
  hydraPresetId: string;
  hydraShowOverlay: boolean;
  hydraStageConnected: boolean;

  // Layout
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  bottomDockOpen: boolean;
  activeDockTab: DockTab;
  activeRightTab: RightTab;

  // Macros & Mixer
  macros: MacroKnob[];
  tracks: MixerTrack[];

  // MIDI
  midiSupported: boolean;
  midiEnabled: boolean;
  midiInputs: MidiDeviceInfo[];
  midiOutputs: MidiDeviceInfo[];
  selectedMidiOutputId: string;
  midiClockSync: boolean;
  learningTarget: LearnTarget | null;
  bpmMidiBinding?: MidiBinding;
  padMappings: PadMapping[];
  activeNotes: number[];
  isCapturingNotes: boolean;
  capturedNotes: string[];
  keyboardSynth: string;
  midiLogs: MidiLogEvent[];
  midiActivityPulse: number;

  // Step Sequencer
  sequencerRows: SequencerRow[];
  sequencerSyncEnabled: boolean;

  // Visual Oscillator Synth
  oscillator: OscillatorSettings;

  // Audio WAV Recorder
  isRecordingAudio: boolean;
  recordingElapsedSec: number;

  // AI MCP Bridge
  mcpConnected: boolean;
  mcpModalOpen: boolean;
  mcpLogs: McpCommandLog[];

  // Actions
  setCode: (code: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setAudioReady: (ready: boolean) => void;
  setBpm: (bpm: number) => void;
  setMasterGain: (gain: number) => void;
  setActiveError: (err: string | null) => void;
  setSyntaxDiagnostic: (diag: SyntaxDiagnostic | null) => void;
  setStatusMessage: (msg: string) => void;

  setStudioMode: (mode: StudioMode) => void;
  setPracticeSpeed: (speed: number) => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  saveSnapshot: (slot: 'A' | 'B' | 'C' | 'D', code: string, bpm: number) => void;

  addCustomPreset: (preset: Omit<PresetItem, 'id'>) => PresetItem;
  removeCustomPreset: (id: string) => void;

  createPlaylist: (name: string) => PlaylistCollection;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  setActivePlaylistCollection: (id: string) => void;

  addPlaylistItem: (item: Omit<PlaylistItem, 'id'>) => PlaylistItem;
  updatePlaylistItem: (id: string, patch: Partial<PlaylistItem>) => void;
  removePlaylistItem: (id: string) => void;
  movePlaylistItem: (id: string, direction: 'up' | 'down') => void;
  setActivePlaylistId: (id: string | null) => void;
  setTransitionStatus: (active: boolean, progress: number, label: string) => void;

  addCustomHydraPreset: (preset: Omit<HydraPreset, 'id'>) => HydraPreset;
  removeCustomHydraPreset: (id: string) => void;
  setHydraCode: (code: string, presetId?: string) => void;
  setHydraShowOverlay: (show: boolean) => void;
  setHydraStageConnected: (connected: boolean) => void;

  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  toggleBottomDock: () => void;
  setActiveDockTab: (tab: DockTab) => void;
  setActiveRightTab: (tab: RightTab) => void;

  setMacroValue: (id: number, value: number) => void;
  setMacroLabel: (id: number, label: string) => void;
  bindMidiToTarget: (target: LearnTarget, binding: MidiBinding) => void;
  clearMacroMidi: (id: number) => void;
  clearPadMidi: (padId: string) => void;

  updateTrack: (id: string, patch: Partial<MixerTrack>) => void;
  toggleTrackMute: (id: string) => void;
  toggleTrackSolo: (id: string) => void;

  setMidiSupport: (supported: boolean, enabled: boolean) => void;
  setMidiDevices: (inputs: MidiDeviceInfo[], outputs: MidiDeviceInfo[]) => void;
  setSelectedMidiOutputId: (id: string) => void;
  setMidiClockSync: (enabled: boolean) => void;
  setLearningTarget: (target: LearnTarget | null) => void;
  setPadAction: (padId: string, action: PadActionType) => void;
  noteOn: (noteNum: number, noteName: string) => void;
  noteOff: (noteNum: number) => void;
  toggleCaptureNotes: () => void;
  clearCapturedNotes: () => void;
  setKeyboardSynth: (sound: string) => void;
  pushMidiLog: (ev: MidiLogEvent) => void;
  clearMidiLogs: () => void;

  toggleSequencerStep: (rowId: string, stepIndex: number) => void;
  toggleSequencerRowMute: (rowId: string) => void;
  clearSequencer: () => void;
  resetSequencer: () => void;
  setSequencerSyncEnabled: (enabled: boolean) => void;

  updateOscillator: (patch: Partial<OscillatorSettings>) => void;
  resetOscillator: () => void;

  setRecordingAudio: (recording: boolean, elapsedSec: number) => void;

  setMcpConnected: (connected: boolean) => void;
  setMcpModalOpen: (open: boolean) => void;
  pushMcpLog: (log: McpCommandLog) => void;
  clearMcpLogs: () => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      code: STUDIO_PRESETS[0].code,
      isPlaying: false,
      audioReady: false,
      bpm: STUDIO_PRESETS[0].bpm,
      masterGain: 0.85,
      activeError: null,
      syntaxDiagnostic: null,
      statusMessage: 'Ready — Press Play or Cmd+Enter',

      studioMode: 'jam',
      practiceSpeed: 1,
      metronomeEnabled: false,
      snapshots: DEFAULT_SNAPSHOTS,

      customPresets: [],
      playlists: DEFAULT_PLAYLIST_COLLECTIONS,
      activePlaylistCollectionId: DEFAULT_PLAYLIST_COLLECTIONS[0].id,

      playlist: DEFAULT_PLAYLIST,
      activePlaylistId: DEFAULT_PLAYLIST[0].id,
      isTransitioning: false,
      transitionProgress: 0,
      transitionLabel: '',

      customHydraPresets: [],
      hydraCode: HYDRA_PRESETS[0].code,
      hydraPresetId: HYDRA_PRESETS[0].id,
      hydraShowOverlay: true,
      hydraStageConnected: false,

      leftSidebarOpen: true,
      rightPanelOpen: true,
      bottomDockOpen: true,
      activeDockTab: 'visualizer',
      activeRightTab: 'macros',

      macros: DEFAULT_MACROS,
      tracks: DEFAULT_TRACKS,

      midiSupported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
      midiEnabled: false,
      midiInputs: [],
      midiOutputs: [],
      selectedMidiOutputId: '',
      midiClockSync: false,
      learningTarget: null,
      padMappings: DEFAULT_PADS,
      activeNotes: [],
      isCapturingNotes: false,
      capturedNotes: [],
      keyboardSynth: 'gm_epiano1',
      midiLogs: [],
      midiActivityPulse: 0,

      sequencerRows: createDefaultSequencerRows(),
      sequencerSyncEnabled: false,

      oscillator: { ...DEFAULT_OSCILLATOR_SETTINGS },

      isRecordingAudio: false,
      recordingElapsedSec: 0,

      mcpConnected: false,
      mcpModalOpen: false,
      mcpLogs: [],

      setCode: (code) => set({ code }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setAudioReady: (audioReady) => set({ audioReady }),
      setBpm: (bpm) => set({ bpm: Math.max(40, Math.min(240, Math.round(bpm))) }),
      setMasterGain: (masterGain) => set({ masterGain: Math.max(0, Math.min(1.2, masterGain)) }),
      setActiveError: (activeError) => set({ activeError }),
      setSyntaxDiagnostic: (syntaxDiagnostic) => set({ syntaxDiagnostic }),
      setStatusMessage: (statusMessage) => set({ statusMessage }),

      setStudioMode: (studioMode) =>
        set((s) => ({
          studioMode,
          activeDockTab: studioMode === 'live' ? 'playlist' : s.activeDockTab,
          bottomDockOpen: true,
        })),
      setPracticeSpeed: (practiceSpeed) => set({ practiceSpeed }),
      setMetronomeEnabled: (metronomeEnabled) => set({ metronomeEnabled }),
      saveSnapshot: (slot, code, bpm) =>
        set((s) => ({
          snapshots: s.snapshots.map((snap) =>
            snap.slot === slot ? { ...snap, code, bpm, savedAt: Date.now() } : snap
          ),
          statusMessage: `Saved current pattern to Snapshot ${slot}`,
        })),

      addCustomPreset: (preset) => {
        const created: PresetItem = {
          ...preset,
          id: `custom-preset-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        };
        set((s) => ({
          customPresets: [created, ...s.customPresets],
          statusMessage: `Saved preset "${created.name}"`,
        }));
        return created;
      },

      removeCustomPreset: (id) =>
        set((s) => ({
          customPresets: s.customPresets.filter((p) => p.id !== id),
        })),

      createPlaylist: (name) => {
        const cleanName = name.trim() || `Playlist ${Date.now().toString().slice(-3)}`;
        const created: PlaylistCollection = {
          id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: cleanName,
          items: [],
        };
        set((s) => ({
          playlists: [...s.playlists, created],
          activePlaylistCollectionId: created.id,
          playlist: [],
          activePlaylistId: null,
          statusMessage: `Created new playlist "${created.name}"`,
        }));
        return created;
      },

      renamePlaylist: (id, name) =>
        set((s) => ({
          playlists: s.playlists.map((pl) => (pl.id === id ? { ...pl, name } : pl)),
        })),

      deletePlaylist: (id) =>
        set((s) => {
          if (s.playlists.length <= 1) return s;
          const remaining = s.playlists.filter((pl) => pl.id !== id);
          const nextActive =
            s.activePlaylistCollectionId === id ? remaining[0] : remaining.find((p) => p.id === s.activePlaylistCollectionId) ?? remaining[0];
          return {
            playlists: remaining,
            activePlaylistCollectionId: nextActive.id,
            playlist: nextActive.items,
            activePlaylistId: nextActive.items[0]?.id ?? null,
          };
        }),

      setActivePlaylistCollection: (id) =>
        set((s) => {
          const found = s.playlists.find((pl) => pl.id === id);
          if (!found) return s;
          return {
            activePlaylistCollectionId: found.id,
            playlist: found.items,
            activePlaylistId: found.items[0]?.id ?? null,
          };
        }),

      addPlaylistItem: (item) => {
        const created: PlaylistItem = {
          ...item,
          id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        };
        set((s) => {
          const nextItems = [...s.playlist, created];
          return {
            playlist: nextItems,
            playlists: s.playlists.map((pl) =>
              pl.id === s.activePlaylistCollectionId ? { ...pl, items: nextItems } : pl
            ),
            statusMessage: `Added "${created.title}" to Live Playlist`,
          };
        });
        return created;
      },

      updatePlaylistItem: (id, patch) =>
        set((s) => {
          const nextItems = s.playlist.map((item) =>
            item.id === id ? { ...item, ...patch } : item
          );
          return {
            playlist: nextItems,
            playlists: s.playlists.map((pl) =>
              pl.id === s.activePlaylistCollectionId ? { ...pl, items: nextItems } : pl
            ),
          };
        }),

      removePlaylistItem: (id) =>
        set((s) => {
          const nextItems = s.playlist.filter((item) => item.id !== id);
          return {
            playlist: nextItems,
            playlists: s.playlists.map((pl) =>
              pl.id === s.activePlaylistCollectionId ? { ...pl, items: nextItems } : pl
            ),
            activePlaylistId: s.activePlaylistId === id ? null : s.activePlaylistId,
          };
        }),

      movePlaylistItem: (id, direction) =>
        set((s) => {
          const idx = s.playlist.findIndex((p) => p.id === id);
          if (idx === -1) return s;
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= s.playlist.length) return s;
          const nextItems = [...s.playlist];
          [nextItems[idx], nextItems[swapIdx]] = [nextItems[swapIdx], nextItems[idx]];
          return {
            playlist: nextItems,
            playlists: s.playlists.map((pl) =>
              pl.id === s.activePlaylistCollectionId ? { ...pl, items: nextItems } : pl
            ),
          };
        }),

      setActivePlaylistId: (activePlaylistId) => set({ activePlaylistId }),
      setTransitionStatus: (isTransitioning, transitionProgress, transitionLabel) =>
        set({ isTransitioning, transitionProgress, transitionLabel }),

      addCustomHydraPreset: (preset) => {
        const created: HydraPreset = {
          ...preset,
          id: `custom-hydra-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        };
        set((s) => ({
          customHydraPresets: [created, ...s.customHydraPresets],
          hydraPresetId: created.id,
          hydraCode: created.code,
          statusMessage: `Saved Hydra visual "${created.name}"`,
        }));
        return created;
      },

      removeCustomHydraPreset: (id) =>
        set((s) => ({
          customHydraPresets: s.customHydraPresets.filter((h) => h.id !== id),
        })),

      setHydraCode: (hydraCode, presetId) =>
        set((s) => ({
          hydraCode,
          hydraPresetId: presetId ?? s.hydraPresetId,
        })),
      setHydraShowOverlay: (hydraShowOverlay) => set({ hydraShowOverlay }),
      setHydraStageConnected: (hydraStageConnected) => set({ hydraStageConnected }),

      toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      toggleBottomDock: () => set((s) => ({ bottomDockOpen: !s.bottomDockOpen })),
      setActiveDockTab: (activeDockTab) => set({ activeDockTab, bottomDockOpen: true }),
      setActiveRightTab: (activeRightTab) => set({ activeRightTab, rightPanelOpen: true }),

      setMacroValue: (id, value) =>
        set((s) => ({
          macros: s.macros.map((m) =>
            m.id === id ? { ...m, value: Math.max(0, Math.min(1, value)) } : m
          ),
        })),

      setMacroLabel: (id, label) =>
        set((s) => ({
          macros: s.macros.map((m) => (m.id === id ? { ...m, label } : m)),
        })),

      bindMidiToTarget: (target, binding) =>
        set((s) => {
          if (target.kind === 'macro') {
            return {
              learningTarget: null,
              macros: s.macros.map((m) =>
                m.id === target.macroId ? { ...m, midiBinding: binding } : m
              ),
              statusMessage: `MIDI Learned: Macro ${target.macroId} <- CH${binding.channel} CC${binding.number}`,
            };
          }
          if (target.kind === 'track_gain') {
            return {
              learningTarget: null,
              tracks: s.tracks.map((t) =>
                t.id === target.trackId ? { ...t, midiGainBinding: binding } : t
              ),
              statusMessage: `MIDI Learned: Track ${target.trackId} Gain`,
            };
          }
          if (target.kind === 'track_mute') {
            return {
              learningTarget: null,
              tracks: s.tracks.map((t) =>
                t.id === target.trackId ? { ...t, midiMuteBinding: binding } : t
              ),
              statusMessage: `MIDI Learned: Track ${target.trackId} Mute`,
            };
          }
          if (target.kind === 'pad') {
            return {
              learningTarget: null,
              padMappings: s.padMappings.map((p) =>
                p.id === target.padId ? { ...p, midiBinding: binding } : p
              ),
              statusMessage: `MIDI Learned: ${target.padId}`,
            };
          }
          if (target.kind === 'bpm') {
            return {
              learningTarget: null,
              bpmMidiBinding: binding,
              statusMessage: `MIDI Learned: BPM <- CH${binding.channel} CC${binding.number}`,
            };
          }
          return { learningTarget: null };
        }),

      clearMacroMidi: (id) =>
        set((s) => ({
          macros: s.macros.map((m) => (m.id === id ? { ...m, midiBinding: undefined } : m)),
        })),

      clearPadMidi: (padId) =>
        set((s) => ({
          padMappings: s.padMappings.map((p) =>
            p.id === padId ? { ...p, midiBinding: undefined } : p
          ),
        })),

      updateTrack: (id, patch) =>
        set((s) => ({
          tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      toggleTrackMute: (id) =>
        set((s) => ({
          tracks: s.tracks.map((t) => (t.id === id ? { ...t, muted: !t.muted } : t)),
        })),

      toggleTrackSolo: (id) =>
        set((s) => ({
          tracks: s.tracks.map((t) => (t.id === id ? { ...t, solo: !t.solo } : t)),
        })),

      setMidiSupport: (midiSupported, midiEnabled) => set({ midiSupported, midiEnabled }),
      setMidiDevices: (midiInputs, midiOutputs) =>
        set((s) => ({
          midiInputs,
          midiOutputs,
          selectedMidiOutputId:
            s.selectedMidiOutputId || (midiOutputs[0]?.id ?? ''),
        })),
      setSelectedMidiOutputId: (selectedMidiOutputId) => set({ selectedMidiOutputId }),
      setMidiClockSync: (midiClockSync) => set({ midiClockSync }),
      setLearningTarget: (learningTarget) => set({ learningTarget }),
      setPadAction: (padId, action) =>
        set((s) => ({
          padMappings: s.padMappings.map((p) => (p.id === padId ? { ...p, action } : p)),
        })),

      noteOn: (noteNum, noteName) =>
        set((s) => ({
          activeNotes: s.activeNotes.includes(noteNum)
            ? s.activeNotes
            : [...s.activeNotes, noteNum],
          capturedNotes: s.isCapturingNotes
            ? [...s.capturedNotes.slice(-31), noteName]
            : s.capturedNotes,
        })),

      noteOff: (noteNum) =>
        set((s) => ({
          activeNotes: s.activeNotes.filter((n) => n !== noteNum),
        })),

      toggleCaptureNotes: () =>
        set((s) => ({ isCapturingNotes: !s.isCapturingNotes })),
      clearCapturedNotes: () => set({ capturedNotes: [] }),
      setKeyboardSynth: (keyboardSynth) => set({ keyboardSynth }),

      pushMidiLog: (ev) =>
        set((s) => ({
          midiLogs: [ev, ...s.midiLogs].slice(0, 40),
          midiActivityPulse: s.midiActivityPulse + 1,
        })),
      clearMidiLogs: () => set({ midiLogs: [] }),

      toggleSequencerStep: (rowId, stepIndex) =>
        set((s) => ({
          sequencerRows: s.sequencerRows.map((row) =>
            row.id === rowId
              ? {
                  ...row,
                  steps: row.steps.map((v, idx) => (idx === stepIndex ? !v : v)),
                }
              : row
          ),
        })),

      toggleSequencerRowMute: (rowId) =>
        set((s) => ({
          sequencerRows: s.sequencerRows.map((row) =>
            row.id === rowId ? { ...row, muted: !row.muted } : row
          ),
        })),

      clearSequencer: () =>
        set((s) => ({
          sequencerRows: s.sequencerRows.map((row) => ({
            ...row,
            steps: row.steps.map(() => false),
          })),
        })),

      resetSequencer: () => set({ sequencerRows: createDefaultSequencerRows() }),
      setSequencerSyncEnabled: (sequencerSyncEnabled) => set({ sequencerSyncEnabled }),

      updateOscillator: (patch) =>
        set((s) => ({
          oscillator: { ...s.oscillator, ...patch },
        })),
      resetOscillator: () => set({ oscillator: { ...DEFAULT_OSCILLATOR_SETTINGS } }),

      setRecordingAudio: (isRecordingAudio, recordingElapsedSec) =>
        set({ isRecordingAudio, recordingElapsedSec }),

      setMcpConnected: (mcpConnected) => set({ mcpConnected }),
      setMcpModalOpen: (mcpModalOpen) => set({ mcpModalOpen }),
      pushMcpLog: (log) =>
        set((s) => ({
          mcpLogs: [log, ...s.mcpLogs].slice(0, 40),
        })),
      clearMcpLogs: () => set({ mcpLogs: [] }),
    }),
    {
      name: 'strudel-studio-v2',
      partialize: (state) => ({
        code: state.code,
        bpm: state.bpm,
        masterGain: state.masterGain,
        macros: state.macros,
        tracks: state.tracks,
        padMappings: state.padMappings,
        bpmMidiBinding: state.bpmMidiBinding,
        keyboardSynth: state.keyboardSynth,
        sequencerRows: state.sequencerRows,
        oscillator: state.oscillator,
        customPresets: state.customPresets,
        playlists: state.playlists,
        activePlaylistCollectionId: state.activePlaylistCollectionId,
        playlist: state.playlist,
        snapshots: state.snapshots,
        customHydraPresets: state.customHydraPresets,
        hydraCode: state.hydraCode,
        hydraPresetId: state.hydraPresetId,
        hydraShowOverlay: state.hydraShowOverlay,
      }),
    }
  )
);

export type { FadeStyle };
