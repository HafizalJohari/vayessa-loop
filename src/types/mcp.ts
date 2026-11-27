export type McpCommandName =
  | 'get_studio_state'
  | 'list_presets'
  | 'list_samples'
  | 'set_pattern'
  | 'play'
  | 'stop'
  | 'set_bpm'
  | 'load_preset'
  | 'set_macro'
  | 'set_track'
  | 'set_master_gain'
  | 'set_sequencer_steps'
  | 'trigger_note'
  | 'send_midi_cc'
  | 'list_playlist'
  | 'add_to_playlist'
  | 'play_playlist_track'
  | 'set_hydra_visual'
  | 'set_oscillator'
  | 'record_audio';

export interface McpBridgeRequest {
  id: string;
  command: McpCommandName;
  args: Record<string, unknown>;
}

export interface McpBridgeResponse {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface McpCommandLog {
  id: string;
  timestamp: number;
  command: McpCommandName;
  summary: string;
  ok: boolean;
}
