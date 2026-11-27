import { useEffect, useRef } from 'react';
import { Piano, Plus, RotateCcw, Sparkles, Waves } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { strudelEngine } from '@/engine/strudelEngine';
import {
  buildOscillatorStrudelCode,
  OSCILLATOR_PATCHES,
  shiftNoteOctave,
} from '@/engine/oscillatorUtils';
import type { OscillatorWaveform } from '@/types/studio';

interface OscillatorPanelProps {
  onInsertSnippet: (snippet: string) => void;
}

const WAVEFORMS: { id: OscillatorWaveform; label: string }[] = [
  { id: 'sine', label: 'Sine' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'sawtooth', label: 'Saw' },
  { id: 'square', label: 'Square' },
  { id: 'supersaw', label: 'Supersaw' },
];

const TEST_NOTES = ['c3', 'eb3', 'g3', 'bb3', 'c4'];

export function OscillatorPanel({ onInsertSnippet }: OscillatorPanelProps) {
  const osc = useStudioStore((s) => s.oscillator);
  const updateOscillator = useStudioStore((s) => s.updateOscillator);
  const resetOscillator = useStudioStore((s) => s.resetOscillator);
  const keyboardSynth = useStudioStore((s) => s.keyboardSynth);
  const setKeyboardSynth = useStudioStore((s) => s.setKeyboardSynth);

  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const adsrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw live mathematical waveform preview reacting to waveform, FM & LPF
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#0b0e13';
    ctx.fillRect(0, 0, w, h);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const evalWave = (phase: number, type: OscillatorWaveform): number => {
      const p = ((phase % 1) + 1) % 1;
      switch (type) {
        case 'sine':
          return Math.sin(p * Math.PI * 2);
        case 'triangle':
          return 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25));
        case 'sawtooth':
          return 2 * p - 1;
        case 'square':
          return p < 0.5 ? 0.85 : -0.85;
        case 'supersaw':
          return (
            (2 * p - 1) * 0.55 +
            (2 * (((phase * 1.03 + 0.2) % 1 + 1) % 1) - 1) * 0.3 +
            (2 * (((phase * 0.97 + 0.5) % 1 + 1) % 1) - 1) * 0.25
          );
      }
    };

    // Draw waveform curve with FM modulation and simple LPF smoothing
    const samples = 200;
    const smoothFactor = Math.max(0.08, Math.min(1, Math.log10(osc.lpf / 120) / 2.2));
    let prevY = 0;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * 2; // 2 cycles
      const fmMod = osc.fm > 0.05 ? Math.sin(t * Math.PI * 2 * osc.fmh) * (osc.fm * 0.04) : 0;
      const raw = evalWave(t + fmMod, osc.waveform);
      prevY = prevY + (raw - prevY) * smoothFactor;
      const x = (i / samples) * w;
      const y = h / 2 - prevY * (h * 0.38);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }, [osc.waveform, osc.fm, osc.fmh, osc.lpf]);

  // Draw live ADSR Envelope curve
  useEffect(() => {
    const canvas = adsrCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const pad = 8;

    ctx.fillStyle = '#0b0e13';
    ctx.fillRect(0, 0, w, h);

    const aW = Math.max(8, (osc.attack / 2) * (w * 0.26));
    const dW = Math.max(10, (osc.decay / 2) * (w * 0.26));
    const sW = w * 0.22;
    const rW = Math.max(10, (osc.release / 3) * (w * 0.26));
    const totalW = aW + dW + sW + rW;
    const scale = (w - pad * 2) / totalW;

    const x0 = pad;
    const x1 = x0 + aW * scale;
    const x2 = x1 + dW * scale;
    const x3 = x2 + sW * scale;
    const x4 = x3 + rW * scale;

    const yBottom = h - pad;
    const yTop = pad;
    const ySus = yBottom - osc.sustain * (h - pad * 2);

    ctx.fillStyle = 'rgba(52, 211, 153, 0.14)';
    ctx.beginPath();
    ctx.moveTo(x0, yBottom);
    ctx.lineTo(x1, yTop);
    ctx.lineTo(x2, ySus);
    ctx.lineTo(x3, ySus);
    ctx.lineTo(x4, yBottom);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, yBottom);
    ctx.lineTo(x1, yTop);
    ctx.lineTo(x2, ySus);
    ctx.lineTo(x3, ySus);
    ctx.lineTo(x4, yBottom);
    ctx.stroke();

    ctx.restore();
  }, [osc.attack, osc.decay, osc.sustain, osc.release]);

  const generatedCode = buildOscillatorStrudelCode(osc);
  const usingMidiOsc = keyboardSynth === 'studio_osc';

  return (
    <div className="h-full flex flex-col gap-2 p-2.5 bg-[#0e1116] select-none overflow-y-auto">
      {/* Top Row: Waveform Selector + Patches + Audition Keys + Insert */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-0.5 bg-[#12161f] p-0.5 rounded-lg border border-[#232b3a]">
            <Waves className="w-3.5 h-3.5 text-cyan-400 mx-1.5" />
            {WAVEFORMS.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => updateOscillator({ waveform: wf.id })}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  osc.waveform === wf.id
                    ? 'bg-cyan-500 text-[#071115]'
                    : 'text-[#8b95a7] hover:text-white'
                }`}
              >
                {wf.label}
              </button>
            ))}
          </div>

          {/* Quick Synth Patches */}
          <select
            defaultValue=""
            onChange={(e) => {
              const found = OSCILLATOR_PATCHES.find((p) => p.id === e.target.value);
              if (found) updateOscillator(found.settings);
              e.target.value = '';
            }}
            className="bg-[#161c26] border border-[#283244] rounded-md px-2 py-1 text-[11px] text-emerald-300 font-medium"
          >
            <option value="" disabled>
              Load Synth Patch...
            </option>
            {OSCILLATOR_PATCHES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setKeyboardSynth(usingMidiOsc ? 'gm_epiano1' : 'studio_osc')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold border cursor-pointer ${
              usingMidiOsc
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                : 'bg-[#171d27] border-[#262e3e] text-[#8b95a7] hover:text-white'
            }`}
            title="Play this custom Oscillator live with your MIDI Keyboard"
          >
            <Piano className="w-3 h-3" />
            <span>{usingMidiOsc ? 'MIDI Keys: OSC ON' : 'Route MIDI Keys'}</span>
          </button>

          <button
            type="button"
            onClick={resetOscillator}
            className="p-1 rounded bg-[#171d27] text-[#7c8698] hover:text-white cursor-pointer"
            title="Reset Oscillator"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Audition Notes + Strudel Insert */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-0.5">
            {TEST_NOTES.map((n) => {
              const shifted = shiftNoteOctave(n, osc.octave);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => void strudelEngine.auditionOscillatorNote(shifted, 0.55)}
                  className="px-1.5 py-1 rounded bg-[#1a2230] hover:bg-cyan-500/25 border border-[#273247] text-[10px] font-mono font-bold text-cyan-200 cursor-pointer"
                  title={`Audition ${shifted.toUpperCase()}`}
                >
                  {shifted.toUpperCase()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onInsertSnippet(generatedCode)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1a2230] text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 text-[11px] font-semibold cursor-pointer"
            title="Insert static Strudel synth code"
          >
            <Plus className="w-3 h-3" />
            <span>Insert Code</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onInsertSnippet(`oscSynth(note("${shiftNoteOctave('c3 eb3 g3 bb3', osc.octave)}"))`)
            }
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500 text-[#071115] hover:bg-cyan-400 text-[11px] font-bold cursor-pointer"
            title="Insert live oscSynth() linked directly to these sliders"
          >
            <Sparkles className="w-3 h-3" />
            <span>Insert Live oscSynth()</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Visualizers + 4 Control Sections */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-6 gap-2 min-h-0">
        {/* Dual Mini Visualizers */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-2">
          <div className="flex flex-col rounded-lg bg-[#0b0e13] border border-[#222938] overflow-hidden">
            <div className="px-2 py-1 text-[9.5px] font-mono uppercase text-cyan-300 bg-[#12161f] border-b border-[#1d2330]">
              Oscillator Wave
            </div>
            <canvas ref={waveCanvasRef} className="w-full flex-1 min-h-20 block" />
          </div>
          <div className="flex flex-col rounded-lg bg-[#0b0e13] border border-[#222938] overflow-hidden">
            <div className="px-2 py-1 text-[9.5px] font-mono uppercase text-emerald-300 bg-[#12161f] border-b border-[#1d2330]">
              ADSR Envelope
            </div>
            <canvas ref={adsrCanvasRef} className="w-full flex-1 min-h-20 block" />
          </div>
        </div>

        {/* 1. Tone & FM */}
        <div className="p-2 rounded-lg bg-[#131720] border border-[#222938] space-y-1.5 text-[10px] font-mono">
          <div className="text-[9.5px] font-bold text-cyan-300 uppercase">Tone &amp; FM</div>
          <label className="block">
            <div className="flex justify-between text-[#8b95a7]">
              <span>OCTAVE</span>
              <span className="text-white">{osc.octave > 0 ? `+${osc.octave}` : osc.octave}</span>
            </div>
            <input
              type="range"
              min={-2}
              max={2}
              step={1}
              value={osc.octave}
              onChange={(e) => updateOscillator({ octave: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </label>
          <label className="block">
            <div className="flex justify-between text-[#8b95a7]">
              <span>FM DEPTH</span>
              <span className="text-cyan-300">{osc.fm.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={osc.fm}
              onChange={(e) => updateOscillator({ fm: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </label>
          <label className="block">
            <div className="flex justify-between text-[#8b95a7]">
              <span>FM RATIO</span>
              <span className="text-cyan-300">{osc.fmh.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.05}
              value={osc.fmh}
              onChange={(e) => updateOscillator({ fmh: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </label>
        </div>

        {/* 2. Filter */}
        <div className="p-2 rounded-lg bg-[#131720] border border-[#222938] space-y-1.5 text-[10px] font-mono">
          <div className="text-[9.5px] font-bold text-amber-300 uppercase">Filter &amp; Gain</div>
          <label className="block">
            <div className="flex justify-between text-[#8b95a7]">
              <span>LPF CUTOFF</span>
              <span className="text-amber-300">
                {osc.lpf >= 1000 ? `${(osc.lpf / 1000).toFixed(1)}k` : `${Math.round(osc.lpf)}Hz`}
              </span>
            </div>
            <input
              type="range"
              min={150}
              max={18000}
              step={50}
              value={osc.lpf}
              onChange={(e) => updateOscillator({ lpf: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </label>
          <label className="block">
            <div className="flex justify-between text-[#8b95a7]">
              <span>RESONANCE Q</span>
              <span className="text-amber-300">{osc.lpq.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={18}
              step={0.5}
              value={osc.lpq}
              onChange={(e) => updateOscillator({ lpq: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </label>
          <label className="block">
            <div className="flex justify-between text-[#8b95a7]">
              <span>GAIN</span>
              <span className="text-emerald-300">{Math.round(osc.gain * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1.2}
              step={0.02}
              value={osc.gain}
              onChange={(e) => updateOscillator({ gain: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </label>
        </div>

        {/* 3. ADSR Envelope */}
        <div className="p-2 rounded-lg bg-[#131720] border border-[#222938] space-y-1 text-[10px] font-mono">
          <div className="text-[9.5px] font-bold text-emerald-300 uppercase">ADSR</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <label className="block">
              <div className="flex justify-between text-[#8b95a7]">
                <span>ATK</span>
                <span>{osc.attack.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min={0.005}
                max={2}
                step={0.01}
                value={osc.attack}
                onChange={(e) => updateOscillator({ attack: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-[#8b95a7]">
                <span>DEC</span>
                <span>{osc.decay.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min={0.02}
                max={2}
                step={0.02}
                value={osc.decay}
                onChange={(e) => updateOscillator({ decay: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-[#8b95a7]">
                <span>SUS</span>
                <span>{Math.round(osc.sustain * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={osc.sustain}
                onChange={(e) => updateOscillator({ sustain: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-[#8b95a7]">
                <span>REL</span>
                <span>{osc.release.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min={0.02}
                max={3}
                step={0.02}
                value={osc.release}
                onChange={(e) => updateOscillator({ release: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
          </div>
        </div>

        {/* 4. Vibrato LFO & Space FX */}
        <div className="p-2 rounded-lg bg-[#131720] border border-[#222938] space-y-1 text-[10px] font-mono">
          <div className="text-[9.5px] font-bold text-violet-300 uppercase">LFO &amp; FX</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <label className="block">
              <div className="flex justify-between text-[#8b95a7]">
                <span>VIB</span>
                <span>{osc.vib.toFixed(1)}Hz</span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={0.2}
                value={osc.vib}
                onChange={(e) => updateOscillator({ vib: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-[#8b95a7]">
                <span>DEPTH</span>
                <span>{osc.vibmod.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={osc.vibmod}
                onChange={(e) => updateOscillator({ vibmod: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-[#8b95a7]">
                <span>ROOM</span>
                <span>{Math.round(osc.room * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.95}
                step={0.02}
                value={osc.room}
                onChange={(e) => updateOscillator({ room: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-[#8b95a7]">
                <span>DELAY</span>
                <span>{Math.round(osc.delay * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.02}
                value={osc.delay}
                onChange={(e) => updateOscillator({ delay: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
