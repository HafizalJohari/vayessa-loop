import type { McpBridgeRequest, McpBridgeResponse, McpCommandName } from '@/types/mcp';
import { useStudioStore } from '@/store/useStudioStore';
import { strudelEngine } from '@/engine/strudelEngine';
import { midiEngine } from '@/engine/midiEngine';
import { transitionEngine } from '@/engine/transitionEngine';
import { hydraBridge } from '@/engine/hydraBridge';
import { STUDIO_PRESETS } from '@/data/presets';
import { HYDRA_PRESETS } from '@/data/hydraPresets';
import { CODE_SNIPPETS, SAMPLE_CATALOG } from '@/data/samples';
import { applySequencerToCode } from '@/engine/sequencerSync';

const DEFAULT_BRIDGE_URL = 'ws://127.0.0.1:5174';

/**
 * Pure dispatcher that executes an MCP command against Strudel Studio's live state & engines.
 * Exported separately so it can also be unit-tested directly without a live WebSocket.
 */
export async function executeMcpCommand(
  command: McpCommandName,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const store = useStudioStore.getState();

  switch (command) {
    case 'get_studio_state':
      return {
        isPlaying: store.isPlaying,
        audioReady: store.audioReady,
        bpm: store.bpm,
        masterGain: store.masterGain,
        activeError: store.activeError,
        code: store.code,
        macros: store.macros.map((m) => ({
          id: m.id,
          label: m.label,
          value: Number(m.value.toFixed(3)),
          midiBinding: m.midiBinding ?? null,
        })),
        tracks: store.tracks.map((t) => ({
          id: t.id,
          name: t.name,
          muted: t.muted,
          solo: t.solo,
          gain: Number(t.gain.toFixed(2)),
          lpf: t.lpf,
        })),
        sequencerRows: store.sequencerRows.map((r) => ({
          id: r.id,
          label: r.label,
          muted: r.muted,
          activeSteps: r.steps
            .map((on, idx) => (on ? idx : -1))
            .filter((idx) => idx !== -1),
        })),
        midi: {
          supported: store.midiSupported,
          enabled: store.midiEnabled,
          inputs: store.midiInputs.map((d) => d.name),
          outputs: store.midiOutputs.map((d) => d.name),
        },
      };

    case 'list_presets':
      return STUDIO_PRESETS.map((p) => ({
        id: p.id,
        name: p.name,
        genre: p.genre,
        bpm: p.bpm,
        description: p.description,
      }));

    case 'list_samples':
      return {
        samples: SAMPLE_CATALOG,
        snippets: CODE_SNIPPETS,
      };

    case 'set_pattern': {
      const code = String(args.code ?? '');
      const shouldPlay = args.play !== false;
      const bpm = typeof args.bpm === 'number' ? args.bpm : undefined;
      if (bpm !== undefined) {
        strudelEngine.setBpm(bpm);
      }
      store.setCode(code);
      if (shouldPlay) {
        const ok = await strudelEngine.evaluate(code);
        return {
          ok,
          isPlaying: useStudioStore.getState().isPlaying,
          bpm: useStudioStore.getState().bpm,
          error: useStudioStore.getState().activeError,
        };
      }
      return { ok: true, isPlaying: store.isPlaying, bpm: useStudioStore.getState().bpm };
    }

    case 'play': {
      const ok = await strudelEngine.evaluate(store.code);
      return {
        ok,
        isPlaying: useStudioStore.getState().isPlaying,
        error: useStudioStore.getState().activeError,
      };
    }

    case 'stop': {
      strudelEngine.stop();
      return { ok: true, isPlaying: false };
    }

    case 'set_bpm': {
      const bpm = Number(args.bpm);
      strudelEngine.setBpm(bpm);
      return { ok: true, bpm: useStudioStore.getState().bpm };
    }

    case 'load_preset': {
      const presetId = String(args.presetId ?? '');
      const preset = STUDIO_PRESETS.find((p) => p.id === presetId);
      if (!preset) {
        throw new Error(
          `Unknown presetId '${presetId}'. Available: ${STUDIO_PRESETS.map((p) => p.id).join(', ')}`
        );
      }
      store.setCode(preset.code);
      strudelEngine.setBpm(preset.bpm);
      const shouldPlay = args.play !== false;
      if (shouldPlay) {
        await strudelEngine.evaluate(preset.code);
      }
      return { ok: true, preset: preset.name, bpm: preset.bpm, isPlaying: shouldPlay };
    }

    case 'set_macro': {
      const id = Number(args.id);
      const value = Number(args.value);
      store.setMacroValue(id, value);
      if (typeof args.label === 'string' && args.label.trim()) {
        store.setMacroLabel(id, args.label.trim());
      }
      return {
        ok: true,
        macro: useStudioStore.getState().macros.find((m) => m.id === id),
      };
    }

    case 'set_track': {
      const trackId = String(args.trackId ?? '');
      const patch: Record<string, unknown> = {};
      if (typeof args.muted === 'boolean') patch.muted = args.muted;
      if (typeof args.solo === 'boolean') patch.solo = args.solo;
      if (typeof args.gain === 'number') patch.gain = Math.max(0, Math.min(1.4, args.gain));
      if (typeof args.lpf === 'number') patch.lpf = Math.max(200, Math.min(18000, args.lpf));
      store.updateTrack(trackId, patch);
      return {
        ok: true,
        track: useStudioStore.getState().tracks.find((t) => t.id === trackId),
      };
    }

    case 'set_master_gain': {
      const gain = Number(args.gain);
      store.setMasterGain(gain);
      return { ok: true, masterGain: useStudioStore.getState().masterGain };
    }

    case 'set_sequencer_steps': {
      const rowId = String(args.rowId ?? '');
      const activeSteps = Array.isArray(args.activeSteps)
        ? (args.activeSteps as number[])
        : [];
      const activeSet = new Set(activeSteps);

      useStudioStore.setState((s) => ({
        sequencerRows: s.sequencerRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                steps: Array.from({ length: 16 }, (_, idx) => activeSet.has(idx)),
                muted: typeof args.muted === 'boolean' ? args.muted : row.muted,
              }
            : row
        ),
      }));

      const syncAndPlay = args.syncAndPlay !== false;
      if (syncAndPlay) {
        const nextState = useStudioStore.getState();
        const updatedCode = applySequencerToCode(
          nextState.code,
          nextState.sequencerRows,
          nextState.bpm,
          true
        );
        nextState.setCode(updatedCode);
        await strudelEngine.evaluate(updatedCode);
      }

      return {
        ok: true,
        rowId,
        activeSteps: Array.from(activeSet).sort((a, b) => a - b),
      };
    }

    case 'trigger_note': {
      const sound = String(args.sound ?? 'gm_epiano1');
      const note = typeof args.note === 'string' ? args.note : undefined;
      const bank = typeof args.bank === 'string' ? args.bank : undefined;
      const gain = typeof args.gain === 'number' ? args.gain : 0.8;
      await strudelEngine.triggerOneShot({ s: sound, note, bank, gain });
      return { ok: true, triggered: { sound, note, bank, gain } };
    }

    case 'send_midi_cc': {
      const channel = Math.max(1, Math.min(16, Number(args.channel ?? 1)));
      const cc = Math.max(0, Math.min(127, Number(args.cc ?? 0)));
      const value = Math.max(0, Math.min(127, Number(args.value ?? 0)));
      const statusByte = 0xb0 | (channel - 1);
      midiEngine.simulateMidiMessage([statusByte, cc, value], 'AI MCP Controller');
      return { ok: true, sent: { channel, cc, value } };
    }

    case 'list_playlist':
      return {
        activePlaylistId: store.activePlaylistId,
        isTransitioning: store.isTransitioning,
        tracks: store.playlist.map((p, idx) => ({
          index: idx,
          id: p.id,
          title: p.title,
          bpm: p.bpm,
          fadeSeconds: p.fadeSeconds,
          fadeStyle: p.fadeStyle,
        })),
      };

    case 'add_to_playlist': {
      const title = String(args.title ?? `AI Track ${store.playlist.length + 1}`);
      const code = typeof args.code === 'string' ? args.code : store.code;
      const bpm = typeof args.bpm === 'number' ? args.bpm : store.bpm;
      const fadeSeconds = typeof args.fadeSeconds === 'number' ? args.fadeSeconds : 4;
      const fadeStyle =
        args.fadeStyle === 'filter' || args.fadeStyle === 'cut' ? args.fadeStyle : 'smooth';
      const created = store.addPlaylistItem({ title, code, bpm, fadeSeconds, fadeStyle });
      return { ok: true, item: created };
    }

    case 'play_playlist_track': {
      if (args.direction === 'next') {
        const next = await transitionEngine.playNext();
        return { ok: Boolean(next), playing: next?.title ?? null };
      }
      if (args.direction === 'prev') {
        const prev = await transitionEngine.playPrev();
        return { ok: Boolean(prev), playing: prev?.title ?? null };
      }
      const id = String(args.trackId ?? '');
      const target = store.playlist.find((p) => p.id === id);
      if (!target) {
        throw new Error(`Playlist track '${id}' not found.`);
      }
      await transitionEngine.transitionToTrack(target);
      return { ok: true, playing: target.title, fadeSeconds: target.fadeSeconds };
    }

    case 'set_hydra_visual': {
      let nextCode = typeof args.code === 'string' ? args.code : '';
      const presetId = typeof args.presetId === 'string' ? args.presetId : undefined;
      if (!nextCode && presetId) {
        const preset = HYDRA_PRESETS.find((p) => p.id === presetId);
        if (!preset) {
          throw new Error(
            `Unknown Hydra preset '${presetId}'. Available: ${HYDRA_PRESETS.map((p) => p.id).join(', ')}`
          );
        }
        nextCode = preset.code;
      }
      if (nextCode) {
        store.setHydraCode(nextCode, presetId);
        hydraBridge.sendCode(nextCode, presetId);
      }
      return { ok: true, presetId: presetId ?? 'custom' };
    }

    case 'set_oscillator': {
      const patch: Record<string, unknown> = {};
      const validWaves = ['sine', 'triangle', 'sawtooth', 'square', 'supersaw'];
      if (typeof args.waveform === 'string' && validWaves.includes(args.waveform)) {
        patch.waveform = args.waveform;
      }
      const numKeys = [
        'octave',
        'gain',
        'fm',
        'fmh',
        'lpf',
        'lpq',
        'attack',
        'decay',
        'sustain',
        'release',
        'vib',
        'vibmod',
        'room',
        'delay',
      ];
      for (const k of numKeys) {
        if (typeof args[k] === 'number') patch[k] = args[k];
      }
      store.updateOscillator(patch);
      return { ok: true, oscillator: useStudioStore.getState().oscillator };
    }

    default:
      throw new Error(`Unknown MCP command: ${String(command)}`);
  }
}

class McpBrowserBridge {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private stopped = false;

  start(url = DEFAULT_BRIDGE_URL): void {
    this.stopped = false;
    this.connect(url);
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    useStudioStore.getState().setMcpConnected(false);
  }

  private connect(url: string): void {
    if (this.stopped || typeof WebSocket === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        useStudioStore.getState().setMcpConnected(true);
      };

      ws.onmessage = async (event) => {
        let req: McpBridgeRequest | null = null;
        try {
          req = JSON.parse(String(event.data)) as McpBridgeRequest;
        } catch {
          return;
        }
        if (!req || !req.id || !req.command) return;

        try {
          const result = await executeMcpCommand(req.command, req.args ?? {});
          const resp: McpBridgeResponse = { id: req.id, ok: true, result };
          ws.send(JSON.stringify(resp));
          useStudioStore.getState().pushMcpLog({
            id: req.id,
            timestamp: Date.now(),
            command: req.command,
            summary: JSON.stringify(req.args ?? {}).slice(0, 80),
            ok: true,
          });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          const resp: McpBridgeResponse = { id: req.id, ok: false, error };
          ws.send(JSON.stringify(resp));
          useStudioStore.getState().pushMcpLog({
            id: req.id,
            timestamp: Date.now(),
            command: req.command,
            summary: error,
            ok: false,
          });
        }
      };

      ws.onclose = () => {
        useStudioStore.getState().setMcpConnected(false);
        this.ws = null;
        if (!this.stopped) {
          this.reconnectTimer = window.setTimeout(() => this.connect(url), 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      if (!this.stopped) {
        this.reconnectTimer = window.setTimeout(() => this.connect(url), 3000);
      }
    }
  }
}

export const mcpBridge = new McpBrowserBridge();
