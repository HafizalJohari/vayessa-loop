import { useState } from 'react';
import { Bot, Check, Copy, Cpu, Radio, Trash2, X } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';

const MCP_CONFIG_SNIPPET = `{
  "mcpServers": {
    "strudel-studio": {
      "command": "node",
      "args": ["/Users/ppdjhr02-13imac/Desktop/strudel/dist-mcp/mcp-server/index.js"]
    }
  }
}`;

const MCP_TOOLS_SUMMARY = [
  { name: 'get_studio_state', desc: 'Read live code, BPM, playback, macros, mixer & MIDI' },
  { name: 'set_pattern', desc: 'Write & live-evaluate Strudel code (optional BPM)' },
  { name: 'play / stop / set_bpm', desc: 'Full transport & tempo control' },
  { name: 'load_preset / list_presets', desc: 'Browse & switch studio presets' },
  { name: 'list_samples', desc: 'Discover drum banks, synths & GM soundfonts' },
  { name: 'set_macro', desc: 'Move Macro Knobs M1–M8 in real time' },
  { name: 'set_track / set_master_gain', desc: 'Mute, Solo, Gain & LPF on mixer channels' },
  { name: 'set_sequencer_steps', desc: 'Program the 16-step groovebox & sync to code' },
  { name: 'trigger_note / send_midi_cc', desc: 'Audition notes & inject virtual MIDI CC' },
];

export function McpModal() {
  const mcpModalOpen = useStudioStore((s) => s.mcpModalOpen);
  const setMcpModalOpen = useStudioStore((s) => s.setMcpModalOpen);
  const mcpConnected = useStudioStore((s) => s.mcpConnected);
  const mcpLogs = useStudioStore((s) => s.mcpLogs);
  const clearMcpLogs = useStudioStore((s) => s.clearMcpLogs);
  const [copied, setCopied] = useState(false);

  if (!mcpModalOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_CONFIG_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => setMcpModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#12161e] border border-[#283042] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222938] bg-[#0e1118]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                AI Model Context Protocol (MCP) Control
              </h2>
              <p className="text-[11px] text-[#8b95a7]">
                Connect Claude, Gemini, ChatGPT/Codex, Cursor, Antigravity, or any MCP client
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMcpModalOpen(false)}
            className="p-1.5 rounded-lg text-[#7c8698] hover:text-white hover:bg-[#1e2432] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Connection Banner */}
          <div
            className={`flex items-center justify-between p-3 rounded-xl border ${
              mcpConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-[#171c26] border-[#262e3e] text-[#9aa4b6]'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  mcpConnected ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400/70'
                }`}
              />
              <div>
                <div className="font-semibold text-white">
                  {mcpConnected
                    ? 'MCP Bridge Connected (ws://127.0.0.1:5174)'
                    : 'Waiting for MCP Server on ws://127.0.0.1:5174'}
                </div>
                <div className="text-[11px] opacity-80">
                  {mcpConnected
                    ? 'Any connected AI model can now live-code patterns, tweak knobs, and control the mixer.'
                    : 'Add the config below to your AI client — Strudel Studio will auto-connect as soon as the client launches the MCP server.'}
                </div>
              </div>
            </div>
            <Cpu className="w-4 h-4 shrink-0 opacity-70" />
          </div>

          {/* Universal MCP Config */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9aa4b6]">
                Universal MCP Client Config (JSON)
              </span>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-500/20 text-violet-200 border border-violet-400/30 hover:bg-violet-500/30 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Config'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0b0d12] border border-[#222836] text-[11.5px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              {MCP_CONFIG_SNIPPET}
            </pre>
            <p className="text-[11px] text-[#7c8698]">
              Works with Claude Desktop, Claude Code, Antigravity, Cursor, Windsurf, Gemini CLI, and
              any stdio MCP host. Build command:{' '}
              <code className="font-mono text-cyan-300">npm run build:mcp</code>.
            </p>
          </section>

          {/* Exposed Tools */}
          <section className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9aa4b6]">
              Available AI Tools (14) &amp; Resources (3)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MCP_TOOLS_SUMMARY.map((t) => (
                <div
                  key={t.name}
                  className="p-2.5 rounded-lg bg-[#161b24] border border-[#232b3a]"
                >
                  <div className="text-[11px] font-mono font-semibold text-violet-300">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-[#8b95a7] mt-0.5">{t.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Live AI Activity Log */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#9aa4b6]">
                <Radio className="w-3.5 h-3.5 text-violet-400" />
                Live AI Command Log
              </span>
              <button
                type="button"
                onClick={clearMcpLogs}
                className="inline-flex items-center gap-1 text-[11px] text-[#6d778a] hover:text-white cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="h-32 overflow-y-auto rounded-xl bg-[#0b0d12] border border-[#222836] p-2.5 font-mono text-[11px] space-y-1">
              {mcpLogs.length === 0 ? (
                <div className="text-[#596275] italic">
                  No AI tool calls received yet. Ask your AI model to compose a beat or adjust
                  Macro 1!
                </div>
              ) : (
                mcpLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-2">
                    <span className={log.ok ? 'text-emerald-400' : 'text-rose-400'}>
                      {log.ok ? '✓' : '✗'} {log.command}
                    </span>
                    <span className="text-[#7c8698] truncate">{log.summary}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
