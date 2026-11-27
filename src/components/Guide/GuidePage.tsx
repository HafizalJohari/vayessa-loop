import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  Exploded,
  Keyboard,
  Patch,
  Phosphor,
  Terminal,
  Turntable,
} from '@lucasmarkes/hairline/react';
import { WebGpuBackdrop } from '@/components/Welcome/WebGpuBackdrop';
import { uiSound, type HoverToneKind } from '@/engine/uiSound';

interface GuidePageProps {
  onLaunchStudio: () => void;
  onBackWelcome?: () => void;
}

const HAIRLINE_THEME_VARS: React.CSSProperties = {
  ['--hairline-plate' as string]: '#0b0e14',
  ['--hairline-hi' as string]: '#34d399',
  ['--hairline-edge' as string]: '#94a3b8',
  ['--hairline-mid' as string]: '#475569',
  ['--hairline-lo' as string]: '#1e293b',
  ['--hairline-stroke' as string]: '0.9',
};

interface Chapter {
  num: string;
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  tone: HoverToneKind;
  bullets: string[];
  code: string;
  figure: 'terminal' | 'patch' | 'keyboard' | 'turntable' | 'exploded' | 'phosphor';
  accent: string;
}

const CHAPTERS: Chapter[] = [
  {
    num: '01',
    id: 'live-coding',
    tag: 'CORE ENGINE',
    title: 'Live Coding, Highlights & Safe-Eval',
    subtitle:
      'Write native Strudel mini-notation with 60fps active-token highlighting. If you make a typo mid-gig, Safe-Eval keeps your audio playing while pointing to the exact line with 1-click Auto-Fix.',
    tone: 'link',
    accent: 'text-emerald-300',
    figure: 'terminal',
    bullets: [
      'Press Cmd + Enter (Mac) or Ctrl + Enter (Win) to evaluate and update live.',
      'Press Cmd + . to stop all audio instantly.',
      'Switch between Practice (Metronome + 0.5x speed), Jam (A/B/C/D snapshots), and Live Session modes.',
    ],
    code: `setcpm(122 / 4)

$: s("bd*4, ~ cp ~ cp, hh*8").bank("RolandTR909")
$: note("c3 eb3 g3 bb3").s("sawtooth").lpf(1800).room(0.4)`,
  },
  {
    num: '02',
    id: 'macros-mixer',
    tag: 'REAL-TIME PERFORMANCE',
    title: 'Macro Knobs & Live Track Mixer',
    subtitle:
      'Connect your Strudel code directly to 8 rotary Macro Knobs and 4 DAW Mixer channels. Twist filters, mute drums, or solo leads without ever re-evaluating your script.',
    tone: 'patch',
    accent: 'text-cyan-300',
    figure: 'patch',
    bullets: [
      'Use macro(1)..macro(8) with .range(min, max) on any synth or FX parameter.',
      "Wrap layers in track('drums' | 'bass' | 'chords' | 'lead', ...) to control Mute, Solo, Gain, and LPF.",
      'Macro Knobs also stream live at 60fps to Hydra 2nd Monitor as studio.m1..m8.',
    ],
    code: `stack(
  track('drums', s("bd*4, ~ sd ~ sd, hh*8").bank("RolandTR808")),
  track('chords',
    note("<[f3,a3,c4,e4] [g3,b3,d4,f4]>")
      .s("triangle")
      .lpf(macro(1).range(300, 5000))
      .room(macro(2).range(0.1, 0.85))
  )
)`,
  },
  {
    num: '03',
    id: 'midi',
    tag: 'HARDWARE INTEGRATION',
    title: 'WebMIDI Learn, Keys & Pad Mapping',
    subtitle:
      'Plug in any USB MIDI keyboard, knob controller, or Launchpad. Bind physical knobs in one click or capture live keyboard riffs straight into Strudel mini-notation.',
    tone: 'keys',
    accent: 'text-amber-300',
    figure: 'keyboard',
    bullets: [
      'Click Learn on any Macro Knob, Mixer Fader, BPM, or Pad → twist/hit your hardware.',
      'Open MIDI Center → Capture Notes → play a riff → click + Insert to paste note("...").',
      '100% compatible with native Strudel MIDI syntax: await midin(), .midi(), .midiclock().',
    ],
    code: `// Native Strudel MIDI input & hardware synth output
const cc = await midin(0)
note("c3 eb3 g3 bb3")
  .lpf(cc(74).range(200, 4800))
  .midi('IAC Driver Bus 1')`,
  },
  {
    num: '04',
    id: 'sampler-osc',
    tag: 'SOUND DESIGN',
    title: 'WAV/MP3 Sampler, Wave Shifter & Oscillator',
    subtitle:
      'Drag & drop your own WAV or MP3 files into IndexedDB. Visually cut, shift waveform phase, chop into 16 playable MPC slices, or sculpt custom synths with live oscSynth().',
    tone: 'deck',
    accent: 'text-emerald-300',
    figure: 'turntable',
    bullets: [
      'Use Cut Start/End, Wave Shift (0–100% circular phase), Pitch (-12..+12 st), and Wave Warp.',
      'Click numbered Slice Pads to audition chops, then insert + One-Shot, + Sliced, or + Chop Loop.',
      'Wrap any melody in oscSynth(note("c3 eb3 g3")) to sculpt ADSR, FM, and Filter live.',
    ],
    code: `// Imported WAV/MP3 slice + live Visual Oscillator
stack(
  s("my_drum_break").slice(8, "0 1 2 3 4 5 6 7").gain(0.9),
  oscSynth(note("c3 ~ eb3 g3 bb3"))
)`,
  },
  {
    num: '05',
    id: 'playlist-hydra',
    tag: 'STAGE & 2ND MONITOR',
    title: 'Live Playlist Fades & Hydra 3D Mapping',
    subtitle:
      'Build multiple performance setlists with smooth audio fades and project audio-reactive WebGL visuals + 3D Projection Mapping onto a dedicated fullscreen 2nd monitor.',
    tone: 'enter',
    accent: 'text-fuchsia-300',
    figure: 'exploded',
    bullets: [
      'Create multiple playlists with per-track Smooth Fade, Filter Sweep, or Instant Cut (0s–12s).',
      'Open Hydra 2nd Monitor (/?view=hydra), drag to your projector, and press F for Fullscreen.',
      'Link a Hydra visual preset (including 3D Mapping & Webcam RGB Split) to each Playlist track.',
    ],
    code: `// Inline Hydra multi-scene or 2nd Monitor presets
await initHydra({ feedStrudel: 1 })
s0.initCam()
src(s0).saturate(0.15).contrast(1.6).out(o0)`,
  },
  {
    num: '06',
    id: 'ai-mcp',
    tag: 'FRONTIER AI + WAV EXPORT',
    title: 'Universal AI MCP Control & Stereo WAV Export',
    subtitle:
      'Connect Claude, Gemini, Cursor, or Antigravity via 20 built-in MCP tools to co-write music, mix live, morph Hydra visuals, and record uncompressed 16-bit WAV audio directly to disk.',
    tone: 'matrix',
    accent: 'text-violet-300',
    figure: 'phosphor',
    bullets: [
      'Click ● WAV in the top Transport Bar to record live WebAudio and download a stereo .wav.',
      'Use the record_audio MCP tool so Claude can compose a soundtrack and export .wav for video motion.',
      'Click the MCP pill in the studio to copy the universal stdio JSON config.',
    ],
    code: `{
  "mcpServers": {
    "vayessa-loop": {
      "command": "node",
      "args": ["/path/to/vayessa-loop/dist-mcp/mcp-server/index.js"]
    }
  }
}`,
  },
];

function RenderFigure({ kind }: { kind: Chapter['figure'] }) {
  switch (kind) {
    case 'terminal':
      return <Terminal play intensity={0.75} theme="dark" />;
    case 'patch':
      return <Patch play intensity={0.75} theme="dark" />;
    case 'keyboard':
      return <Keyboard play intensity={0.75} theme="dark" />;
    case 'turntable':
      return <Turntable play intensity={0.75} theme="dark" />;
    case 'exploded':
      return <Exploded play intensity={0.75} theme="dark" />;
    case 'phosphor':
      return <Phosphor play intensity={0.75} theme="dark" />;
  }
}

export function GuidePage({ onLaunchStudio, onBackWelcome }: GuidePageProps) {
  const [sfxEnabled, setSfxEnabled] = useState(uiSound.isEnabled());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      uiSound.playHover('keys');
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={HAIRLINE_THEME_VARS}
      className="relative h-screen w-screen overflow-y-auto bg-[#080a0e] text-[#eef2f8] selection:bg-emerald-500/30 selection:text-emerald-200"
    >
      {/* Persistent vgpu WebGPU Ambient Backdrop */}
      <div className="fixed inset-0 opacity-65 pointer-events-none">
        <WebGpuBackdrop />
      </div>

      {/* Subtle Vertical Architectural Hairline Rails */}
      <div className="pointer-events-none fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-6xl border-x border-white/[0.06]" />

      {/* Sticky Hairline Navigation */}
      <nav className="sticky top-0 z-30 bg-[#080a0e]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                uiSound.playHover('link');
                onBackWelcome?.();
              }}
              onMouseEnter={() => uiSound.playHover('link')}
              className="text-xs font-mono font-bold tracking-[0.24em] text-white hover:text-emerald-300 transition-colors cursor-pointer"
            >
              VAYESSA LOOP
            </button>
            <span className="text-white/20">/</span>
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-emerald-300/90">
              MANUAL
            </span>
          </div>

          {/* Section Jump Index */}
          <div className="hidden lg:flex items-center gap-4 text-[10px] font-mono tracking-[0.18em] uppercase text-white/45">
            {CHAPTERS.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                onMouseEnter={() => uiSound.playHover('link')}
                className="hover:text-white transition-colors"
              >
                {c.num} {c.tag.split(' ')[0]}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const next = !sfxEnabled;
                setSfxEnabled(next);
                uiSound.setEnabled(next);
                if (next) {
                  uiSound.unlock();
                  uiSound.playHover('link');
                }
              }}
              className="p-1.5 rounded-md text-white/50 hover:text-emerald-300 transition-colors cursor-pointer"
              title="Toggle Hover SFX"
            >
              {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                uiSound.playEnterChime();
                onLaunchStudio();
              }}
              onMouseEnter={() => uiSound.playHover('enter')}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-400/40 text-[11px] font-mono font-semibold tracking-[0.2em] uppercase text-emerald-200 transition-all cursor-pointer"
            >
              <span>ENTER STUDIO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Editorial Hero */}
      <header className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-14 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono tracking-[0.3em] uppercase text-emerald-300/85 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span>INTERACTIVE FIELD MANUAL // V1.0</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-[0.06em] text-white leading-[1.05] max-w-4xl">
          How to Play{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-white">
            VAYESSA LOOP
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-white/60 max-w-2xl leading-relaxed">
          From your first live-coded drum groove to MIDI-learned Macro sweeps, sliced WAV breaks,
          3D-mapped Hydra projections, and Frontier AI co-production — everything you need in six
          concise chapters.
        </p>

        {/* Quick Shortcut Strip */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 border border-white/[0.09] bg-[#0b0e14]/70 backdrop-blur-md divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
          {[
            { k: '⌘ / Ctrl + ↵', label: 'Evaluate & Update Live' },
            { k: '⌘ / Ctrl + .', label: 'Stop All Audio (Hush)' },
            { k: 'F', label: 'Fullscreen 2nd Monitor' },
            { k: '● WAV', label: 'Record Stereo 16-bit WAV' },
          ].map((item) => (
            <div
              key={item.k}
              onMouseEnter={() => uiSound.playHover('link')}
              className="p-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="text-xs font-mono font-bold text-emerald-300">{item.k}</div>
              <div className="text-[11px] text-white/55 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Six Editorial Chapters */}
      <main className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 divide-y divide-white/[0.08]">
        {CHAPTERS.map((chapter, idx) => {
          const reversed = idx % 2 === 1;
          return (
            <section
              key={chapter.id}
              id={chapter.id}
              className="py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center scroll-mt-16"
            >
              {/* Text + Code Column */}
              <div
                className={`lg:col-span-7 space-y-5 ${reversed ? 'lg:order-2' : 'lg:order-1'}`}
              >
                <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.26em] uppercase">
                  <span className={chapter.accent}>{chapter.num}</span>
                  <span className="w-8 h-px bg-white/20" />
                  <span className="text-white/45">{chapter.tag}</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
                  {chapter.title}
                </h2>

                <p className="text-sm text-white/65 leading-relaxed">{chapter.subtitle}</p>

                <ul className="space-y-2 text-xs sm:text-sm text-white/75">
                  {chapter.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <span className="text-emerald-400 font-mono mt-0.5">+</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* Hairline Code Block */}
                <div className="rounded-xl overflow-hidden border border-white/[0.1] bg-[#0a0d12]/90 backdrop-blur-md">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.07] text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">
                    <span>Example Snippet</span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(chapter.id, chapter.code)}
                      className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 cursor-pointer"
                    >
                      {copiedId === chapter.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 text-xs font-mono text-emerald-200/90 overflow-x-auto leading-relaxed">
                    {chapter.code}
                  </pre>
                </div>
              </div>

              {/* Interactive @lucasmarkes/hairline Isometric Figure Column */}
              <div
                onMouseEnter={() => uiSound.playHover(chapter.tone)}
                className={`lg:col-span-5 ${reversed ? 'lg:order-1' : 'lg:order-2'}`}
              >
                <div className="relative p-5 rounded-2xl bg-[#0b0e14]/80 backdrop-blur-md border border-white/[0.1] hover:border-emerald-400/40 transition-colors">
                  <span className="absolute top-2 left-2.5 text-[10px] font-mono text-white/30">+</span>
                  <span className="absolute top-2 right-2.5 text-[10px] font-mono text-white/30">+</span>
                  <RenderFigure kind={chapter.figure} />
                  <div className="mt-3 pt-2.5 border-t border-white/[0.07] flex items-center justify-between text-[10px] font-mono tracking-[0.2em] uppercase text-white/40">
                    <span>FIG {chapter.num} // INTERACTIVE</span>
                    <span className={chapter.accent}>HOVER TO EXPLORE</span>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </main>

      {/* Finale CTA + Strudel Attribution */}
      <footer className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-16 border-t border-white/[0.08]">
        <div className="relative p-8 sm:p-12 rounded-2xl bg-[#0b0e14]/80 backdrop-blur-md border border-white/[0.12] text-center overflow-hidden">
          <div className="text-[10px] font-mono tracking-[0.34em] uppercase text-emerald-300/80 mb-3">
            READY TO PERFORM
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-[0.12em] text-white">
            STEP INTO THE LOOP
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-white/55 max-w-lg mx-auto">
            Your audio engine, MIDI controller, WAV sampler, and 2nd monitor Hydra stage are one
            click away.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                uiSound.playEnterChime();
                onLaunchStudio();
              }}
              onMouseEnter={() => uiSound.playHover('enter')}
              className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-300/60 text-xs sm:text-sm font-mono font-semibold tracking-[0.28em] uppercase text-white transition-all shadow-[0_0_40px_rgba(52,211,153,0.16)] cursor-pointer"
            >
              <span>ENTER VAYESSA LOOP</span>
              <ArrowRight className="w-4 h-4 text-emerald-300 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[10.5px] font-mono tracking-[0.16em] uppercase text-white/40">
          <span>VAYESSA LOOP · LIVE-CODING DAW</span>
          <a
            href="https://codeberg.org/uzu/strudel"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-emerald-300 transition-colors"
          >
            <span>POWERED BY STRUDEL (CODEBERG.ORG/UZU/STRUDEL)</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
