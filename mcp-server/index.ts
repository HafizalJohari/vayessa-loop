#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import type { McpBridgeRequest, McpBridgeResponse, McpCommandName } from '../src/types/mcp.js';

const BRIDGE_HOST = process.env.STRUDEL_BRIDGE_HOST || '127.0.0.1';
const BRIDGE_PORT = Number(process.env.STRUDEL_BRIDGE_PORT || 5174);
const COMMAND_TIMEOUT_MS = 8000;

const CHEATSHEET = `# Strudel Studio Live-Coding Cheatsheet (for AI Models)

## Core Pattern Functions
- Drums: s("bd*4, ~ sd ~ sd, hh*8").bank("RolandTR909") (Banks: RolandTR808, RolandTR909)
- Melodic: note("c3 eb3 g3 bb3").s("sawtooth").lpf(1800)
- Scales: n("0 2 4 6").scale("C4:minor").s("triangle")
- Soundfonts: gm_acoustic_grand_piano, gm_epiano1, gm_electric_bass_finger, gm_string_ensemble_1, gm_marimba
- Synths: sawtooth, triangle, sine, square, supersaw
- Layering: stack(pattern1, pattern2, ...)
- Tempo: setcpm(120 / 4) (or use the set_bpm MCP tool)

## Strudel Studio Custom Helpers
- Macro Knobs (1-8, MIDI-learnable): macro(1).range(200, 6000) or m1.range(0, 1)
  You can adjust knobs live using the set_macro MCP tool without interrupting audio!
- Track Mixer Routing: wrap layers with track('drums', ...), track('bass', ...), track('chords', ...), or track('lead', ...)
  You can Mute, Solo, adjust Gain or LPF live using the set_track MCP tool!

## Native MIDI Syntax (100% Supported)
- MIDI CC Input: const cc = await midin('Device Name'); note("c3").lpf(cc(74).range(200, 4000))
- MIDI Out: note("c3 eb3 g3").midi('IAC Driver Bus 1')
- MIDI Clock: .midiclock()
`;

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

class StudioWsBridge {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private pending = new Map<string, PendingCall>();

  start(): void {
    try {
      this.wss = new WebSocketServer({ host: BRIDGE_HOST, port: BRIDGE_PORT });

      this.wss.on('listening', () => {
        console.error(
          `[strudel-studio-mcp] WebSocket bridge listening on ws://${BRIDGE_HOST}:${BRIDGE_PORT}`
        );
      });

      this.wss.on('error', (err: NodeJS.ErrnoException) => {
        console.error(`[strudel-studio-mcp] Bridge error: ${err.message}`);
      });

      this.wss.on('connection', (ws) => {
        this.clients.add(ws);
        console.error(
          `[strudel-studio-mcp] Browser connected (${this.clients.size} active)`
        );

        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString()) as McpBridgeResponse;
            if (!msg || !msg.id) return;
            const entry = this.pending.get(msg.id);
            if (!entry) return;
            clearTimeout(entry.timer);
            this.pending.delete(msg.id);
            if (msg.ok) {
              entry.resolve(msg.result);
            } else {
              entry.reject(new Error(msg.error || 'Studio command failed'));
            }
          } catch (err) {
            console.error('[strudel-studio-mcp] Failed to parse browser message:', err);
          }
        });

        ws.on('close', () => {
          this.clients.delete(ws);
          console.error(
            `[strudel-studio-mcp] Browser disconnected (${this.clients.size} active)`
          );
        });
      });
    } catch (err) {
      console.error('[strudel-studio-mcp] Failed to start bridge:', err);
    }
  }

  getActiveClient(): WebSocket | null {
    for (const ws of Array.from(this.clients).reverse()) {
      if (ws.readyState === WebSocket.OPEN) {
        return ws;
      }
    }
    return null;
  }

  async sendCommand(
    command: McpCommandName,
    args: Record<string, unknown> = {},
    timeoutMs = COMMAND_TIMEOUT_MS
  ): Promise<unknown> {
    const client = this.getActiveClient();
    if (!client) {
      throw new Error(
        `No Strudel Studio browser window is connected to ws://${BRIDGE_HOST}:${BRIDGE_PORT}. Please open Strudel Studio (http://localhost:5173/) in your browser first.`
      );
    }

    const id = randomUUID();
    const payload: McpBridgeRequest = { id, command, args };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for Strudel Studio response to '${command}'`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      client.send(JSON.stringify(payload));
    });
  }
}

const bridge = new StudioWsBridge();
bridge.start();

const server = new McpServer({
  name: 'strudel-studio',
  version: '0.1.0',
});

function toTextResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function toErrorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
  };
}

async function runBridgeTool(command: McpCommandName, args: Record<string, unknown> = {}) {
  try {
    const res = await bridge.sendCommand(command, args);
    return toTextResult(res);
  } catch (err) {
    return toErrorResult(err);
  }
}

// --- MCP TOOLS ---

server.tool(
  'get_studio_state',
  'Inspect the live state of Strudel Studio: current pattern code, playback status, BPM, master volume, 8 macro knobs, 4 mixer tracks, 16-step sequencer grid, connected MIDI devices, and any syntax errors.',
  {},
  async () => runBridgeTool('get_studio_state')
);

server.tool(
  'list_presets',
  'List all built-in Strudel Studio musical presets with their IDs, genres, BPM, and descriptions.',
  {},
  async () => runBridgeTool('list_presets')
);

server.tool(
  'list_samples',
  'List available drum machine banks (TR-808, TR-909), synths, GM soundfonts, and syntax snippets in Strudel Studio.',
  {},
  async () => runBridgeTool('list_samples')
);

server.tool(
  'set_pattern',
  'Write new Strudel live-coding pattern code into the Strudel Studio editor and optionally evaluate & start playing it immediately. Supports full Strudel syntax plus studio helpers macro(1..8) and track("drums"|"bass"|"chords"|"lead", pattern).',
  {
    code: z.string().describe('Full Strudel JavaScript / mini-notation pattern code'),
    play: z.boolean().optional().default(true).describe('Whether to immediately evaluate and play the pattern'),
    bpm: z.number().min(40).max(240).optional().describe('Optional tempo in BPM (40-240)'),
  },
  async (args) => runBridgeTool('set_pattern', args)
);

server.tool(
  'play',
  'Evaluate and start playing the current pattern in the Strudel Studio editor.',
  {},
  async () => runBridgeTool('play')
);

server.tool(
  'stop',
  'Stop all audio playback (hush) in Strudel Studio.',
  {},
  async () => runBridgeTool('stop')
);

server.tool(
  'set_bpm',
  'Smoothly change the live tempo (BPM) of Strudel Studio without interrupting playback.',
  {
    bpm: z.number().min(40).max(240).describe('Target tempo in beats per minute (40-240)'),
  },
  async (args) => runBridgeTool('set_bpm', args)
);

server.tool(
  'load_preset',
  'Load a built-in Strudel Studio preset by ID (e.g. "lofi-chill", "acid-techno", "deep-house", "polyrhythm", "midi-hybrid") and optionally start playing.',
  {
    presetId: z.string().describe('Preset ID from list_presets'),
    play: z.boolean().optional().default(true).describe('Whether to immediately play the preset'),
  },
  async (args) => runBridgeTool('load_preset', args)
);

server.tool(
  'set_macro',
  'Adjust one of the 8 real-time Macro Knobs (M1-M8) in Strudel Studio. Patterns using macro(1)..macro(8) respond instantly with zero audio glitch.',
  {
    id: z.number().int().min(1).max(8).describe('Macro knob number (1 to 8)'),
    value: z.number().min(0).max(1).describe('Normalized knob value from 0.0 to 1.0'),
    label: z.string().optional().describe('Optional custom display label for the knob'),
  },
  async (args) => runBridgeTool('set_macro', args)
);

server.tool(
  'set_track',
  'Control a Track Mixer channel ("drums", "bass", "chords", or "lead"): mute, solo, gain (0-1.4), or low-pass filter cutoff (200-18000 Hz) in real time.',
  {
    trackId: z.enum(['drums', 'bass', 'chords', 'lead']).describe('Track channel ID'),
    muted: z.boolean().optional().describe('Mute or unmute the track'),
    solo: z.boolean().optional().describe('Solo or unsolo the track'),
    gain: z.number().min(0).max(1.4).optional().describe('Track volume gain (0.0 to 1.4)'),
    lpf: z.number().min(200).max(18000).optional().describe('Track low-pass filter frequency in Hz'),
  },
  async (args) => runBridgeTool('set_track', args)
);

server.tool(
  'set_master_gain',
  'Set the master output volume gain in Strudel Studio (0.0 to 1.2).',
  {
    gain: z.number().min(0).max(1.2).describe('Master volume gain (0.0 to 1.2)'),
  },
  async (args) => runBridgeTool('set_master_gain', args)
);

server.tool(
  'set_sequencer_steps',
  'Program a 16-step groovebox lane in the Hybrid Step Sequencer and optionally sync it into the Strudel code editor and play.',
  {
    rowId: z
      .enum(['seq-kick', 'seq-snare', 'seq-hh', 'seq-clap', 'seq-bass', 'seq-stab'])
      .describe('Sequencer lane ID'),
    activeSteps: z
      .array(z.number().int().min(0).max(15))
      .describe('Array of active 0-based step indices (0..15), e.g. [0, 4, 8, 12]'),
    muted: z.boolean().optional().describe('Optional mute toggle for this lane'),
    syncAndPlay: z
      .boolean()
      .optional()
      .default(true)
      .describe('Write the updated 16-step grid to the Strudel editor and evaluate live'),
  },
  async (args) => runBridgeTool('set_sequencer_steps', args)
);

server.tool(
  'trigger_note',
  'Trigger a live one-shot synth note, soundfont instrument, or drum sample immediately.',
  {
    sound: z.string().describe('Sound or synth name, e.g. "bd", "sd", "gm_epiano1", "sawtooth"'),
    note: z.string().optional().describe('Optional Strudel note name, e.g. "c4", "eb3"'),
    bank: z.string().optional().describe('Optional drum bank, e.g. "RolandTR808", "RolandTR909"'),
    gain: z.number().min(0).max(1.2).optional().default(0.8).describe('One-shot gain'),
  },
  async (args) => runBridgeTool('trigger_note', args)
);

server.tool(
  'send_midi_cc',
  'Inject a virtual MIDI Control Change (CC) message into the Studio MIDI engine, triggering any MIDI-learned Macro, Mixer, or BPM control.',
  {
    channel: z.number().int().min(1).max(16).optional().default(1).describe('MIDI channel (1-16)'),
    cc: z.number().int().min(0).max(127).describe('MIDI CC number (0-127)'),
    value: z.number().int().min(0).max(127).describe('MIDI CC value (0-127)'),
  },
  async (args) => runBridgeTool('send_midi_cc', args)
);

server.tool(
  'list_playlist',
  'List all tracks in the Live Performance Playlist / Setlist with their IDs, BPM, and fade transition settings.',
  {},
  async () => runBridgeTool('list_playlist')
);

server.tool(
  'add_to_playlist',
  'Add a new Strudel pattern track (or the current editor pattern) to the Live Performance Playlist with custom fade duration and style.',
  {
    title: z.string().describe('Track title'),
    code: z.string().optional().describe('Optional Strudel code (defaults to current editor code)'),
    bpm: z.number().min(40).max(240).optional().describe('Track BPM'),
    fadeSeconds: z.number().min(0).max(12).optional().default(4).describe('Transition fade duration in seconds'),
    fadeStyle: z.enum(['smooth', 'filter', 'cut']).optional().default('smooth').describe('Transition style'),
  },
  async (args) => runBridgeTool('add_to_playlist', args)
);

server.tool(
  'play_playlist_track',
  'Transition smoothly with audio fade to a specific Live Playlist track by ID, or step "next" / "prev".',
  {
    trackId: z.string().optional().describe('Playlist track ID from list_playlist'),
    direction: z.enum(['next', 'prev']).optional().describe('Or transition to next/prev track'),
  },
  async (args) => runBridgeTool('play_playlist_track', args)
);

server.tool(
  'set_hydra_visual',
  'Update the Hydra live visual synth on the 2nd Monitor using a built-in presetId ("vgpu-particles-ocean" for WebGPU 3D beat-reactive Particles Ocean, "obsidian-chrome", "prism-glass", "brutalist-grid", "infrared-aura", "optical-moire", "hyper-tunnel", "cyber-halftone", "webcam-drop") or custom Hydra JS code.',
  {
    presetId: z.string().optional().describe('Built-in Hydra preset ID'),
    code: z.string().optional().describe('Custom Hydra synth code using studio.bass, studio.mid, studio.high, studio.m1..m8'),
  },
  async (args) => runBridgeTool('set_hydra_visual', args)
);

server.tool(
  'set_oscillator',
  'Sculpt the Visual Oscillator synthesizer patch in real time (waveform, FM, filter LPF/Q, ADSR envelope, vibrato LFO, reverb/delay). Patterns wrapped in oscSynth(...) respond immediately.',
  {
    waveform: z.enum(['sine', 'triangle', 'sawtooth', 'square', 'supersaw']).optional(),
    octave: z.number().int().min(-2).max(2).optional(),
    gain: z.number().min(0).max(1.2).optional(),
    fm: z.number().min(0).max(10).optional(),
    fmh: z.number().min(0.5).max(8).optional(),
    lpf: z.number().min(150).max(18000).optional(),
    lpq: z.number().min(0.5).max(18).optional(),
    attack: z.number().min(0.005).max(2).optional(),
    decay: z.number().min(0.02).max(2).optional(),
    sustain: z.number().min(0).max(1).optional(),
    release: z.number().min(0.02).max(3).optional(),
    room: z.number().min(0).max(0.95).optional(),
    delay: z.number().min(0).max(0.8).optional(),
  },
  async (args) => runBridgeTool('set_oscillator', args)
);

server.tool(
  'record_audio',
  'Record live audio from VAYESSA LOOP for a specified duration (1-120s) and save a studio-quality 16-bit PCM WAV file directly to disk (ideal for video motion graphics, Remotion, or video editors). Returns the exact saved file path.',
  {
    durationSeconds: z
      .number()
      .min(1)
      .max(120)
      .default(15)
      .describe('Recording duration in seconds (1 to 120)'),
    fileName: z
      .string()
      .optional()
      .describe('Output filename (e.g. "motion-bgm.wav"). Saved in ./exports/ unless outputPath is provided.'),
    outputPath: z
      .string()
      .optional()
      .describe('Optional absolute path where the WAV file should be saved on disk'),
    autoPlay: z.boolean().optional().default(true).describe('Start playback automatically before recording'),
    autoStopAfter: z.boolean().optional().default(true).describe('Stop playback after recording finishes'),
  },
  async (args) => {
    try {
      const timeoutMs = Math.max(COMMAND_TIMEOUT_MS, (args.durationSeconds + 20) * 1000);
      const res = (await bridge.sendCommand(
        'record_audio',
        {
          durationSeconds: args.durationSeconds,
          autoPlay: args.autoPlay,
          autoStopAfter: args.autoStopAfter,
        },
        timeoutMs
      )) as {
        base64Wav: string;
        durationSec: number;
        sampleRate: number;
        byteLength: number;
      };

      const defaultName =
        args.fileName && args.fileName.trim()
          ? args.fileName.trim().endsWith('.wav')
            ? args.fileName.trim()
            : `${args.fileName.trim()}.wav`
          : `vayessa-loop-${Date.now()}.wav`;

      const targetPath = args.outputPath
        ? path.resolve(args.outputPath)
        : path.resolve(process.cwd(), 'exports', defaultName);

      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, Buffer.from(res.base64Wav, 'base64'));

      return toTextResult({
        ok: true,
        savedPath: targetPath,
        durationSec: res.durationSec,
        sampleRate: res.sampleRate,
        byteLength: res.byteLength,
      });
    } catch (err) {
      return toErrorResult(err);
    }
  }
);

// --- MCP RESOURCES ---

server.resource('studio-state', 'strudel://studio/state', async (uri) => {
  try {
    const state = await bridge.sendCommand('get_studio_state');
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(state, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }
});

server.resource('studio-code', 'strudel://studio/code', async (uri) => {
  try {
    const state = (await bridge.sendCommand('get_studio_state')) as { code?: string };
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/javascript',
          text: state?.code ?? '',
        },
      ],
    };
  } catch (err) {
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }
});

server.resource('studio-cheatsheet', 'strudel://studio/cheatsheet', async (uri) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: 'text/markdown',
      text: CHEATSHEET,
    },
  ],
}));

// Start MCP stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[strudel-studio-mcp] MCP server running on stdio');
}

main().catch((err) => {
  console.error('[strudel-studio-mcp] Fatal startup error:', err);
  process.exit(1);
});
