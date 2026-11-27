import { useRef } from 'react';
import { Copy, Radio, X } from 'lucide-react';
import type { MacroKnob } from '@/types/studio';
import { formatMidiBinding } from '@/engine/midiUtils';

interface MacroKnobDialProps {
  macro: MacroKnob;
  isLearning: boolean;
  onChange: (value: number) => void;
  onLabelChange: (label: string) => void;
  onToggleLearn: () => void;
  onClearMidi: () => void;
  onInsertCode: (snippet: string) => void;
}

export function MacroKnobDial({
  macro,
  isLearning,
  onChange,
  onLabelChange,
  onToggleLearn,
  onClearMidi,
  onInsertCode,
}: MacroKnobDialProps) {
  const dragStartRef = useRef<{ y: number; value: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { y: e.clientY, value: macro.value };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStartRef.current) return;
    const dy = dragStartRef.current.y - e.clientY;
    const next = Math.max(0, Math.min(1, dragStartRef.current.value + dy / 130));
    onChange(next);
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  // Arc math: 270 deg sweep (-135deg to +135deg)
  const size = 56;
  const cx = size / 2;
  const cy = size / 2;
  const r = 21;
  const circumference = 2 * Math.PI * r;
  const sweepFraction = 0.75; // 270 deg
  const trackLength = circumference * sweepFraction;
  const activeLength = trackLength * macro.value;
  const angleDeg = -135 + macro.value * 270;

  return (
    <div
      className={`flex flex-col items-center p-2.5 rounded-xl bg-[#151922] border transition-all ${
        isLearning
          ? 'border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.2)]'
          : 'border-[#232936] hover:border-[#323b4e]'
      }`}
    >
      {/* Top row: M1 badge + Insert snippet */}
      <div className="w-full flex items-center justify-between mb-1">
        <span
          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#0e1116]"
          style={{ color: macro.color }}
        >
          M{macro.id}
        </span>
        <button
          type="button"
          onClick={() => onInsertCode(`macro(${macro.id}).range(200, 4000)`)}
          className="p-1 rounded text-[#6d778a] hover:text-emerald-300 hover:bg-[#1e2430] transition-colors cursor-pointer"
          title={`Insert macro(${macro.id}) at cursor`}
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>

      {/* Rotary SVG Dial */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => onChange(0.5)}
        className="cursor-ns-resize touch-none select-none my-0.5"
      >
        {/* Background track arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#0f1218"
          stroke="#252c39"
          strokeWidth={4}
          strokeDasharray={`${trackLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Active value arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={macro.color}
          strokeWidth={4}
          strokeDasharray={`${activeLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Center pointer notch */}
        <g transform={`rotate(${angleDeg} ${cx} ${cy})`}>
          <line
            x1={cx}
            y1={cy - 5}
            x2={cx}
            y2={cy - 15}
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
        {/* Value readout */}
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          className="fill-[#9aa4b6] font-mono text-[9px] font-semibold"
        >
          {Math.round(macro.value * 100)}
        </text>
      </svg>

      {/* Editable Label */}
      <input
        type="text"
        value={macro.label}
        onChange={(e) => onLabelChange(e.target.value)}
        className="w-full text-center text-[11px] font-medium text-[#d5dce8] bg-transparent border-b border-transparent hover:border-[#2a3140] focus:border-emerald-500/60 focus:outline-none truncate px-1 mt-0.5"
      />

      {/* MIDI Learn Row */}
      <div className="w-full flex items-center gap-1 mt-2">
        <button
          type="button"
          onClick={onToggleLearn}
          className={`flex-1 py-1 px-1.5 rounded text-[9.5px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer truncate ${
            isLearning
              ? 'bg-amber-500 text-black font-bold animate-pulse'
              : macro.midiBinding
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-[#1c222e] text-[#7c8698] hover:text-amber-300'
          }`}
        >
          <Radio className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">
            {isLearning
              ? 'TWIST...'
              : macro.midiBinding
                ? formatMidiBinding(macro.midiBinding)
                : 'Learn'}
          </span>
        </button>

        {macro.midiBinding && (
          <button
            type="button"
            onClick={onClearMidi}
            className="p-1 rounded bg-[#1c222e] text-[#7c8698] hover:text-rose-400 cursor-pointer"
            title="Clear MIDI binding"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
