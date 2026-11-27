import { AlertTriangle, ArrowUpRight, ShieldCheck, Wand2, X } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { strudelEngine } from '@/engine/strudelEngine';

interface SyntaxErrorPopupProps {
  onJumpToLine: (line: number, column: number) => void;
}

export function SyntaxErrorPopup({ onJumpToLine }: SyntaxErrorPopupProps) {
  const diagnostic = useStudioStore((s) => s.syntaxDiagnostic);
  const setSyntaxDiagnostic = useStudioStore((s) => s.setSyntaxDiagnostic);
  const setCode = useStudioStore((s) => s.setCode);

  if (!diagnostic) return null;

  const handleAutoFix = () => {
    if (!diagnostic.quickFix) return;
    setCode(diagnostic.quickFix.fixedCode);
    setSyntaxDiagnostic(null);
    void strudelEngine.evaluate(diagnostic.quickFix.fixedCode);
  };

  const caretOffset = Math.max(0, Math.min(diagnostic.codeLine.length, diagnostic.column - 1));

  return (
    <div className="absolute right-4 bottom-12 z-30 w-[min(460px,calc(100%-2rem))] rounded-2xl bg-[#181218]/95 backdrop-blur-md border border-rose-500/50 shadow-2xl shadow-black/70 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-rose-500/15 border-b border-rose-500/30">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs font-bold text-rose-200 tracking-wide">
            Syntax Error Detected
          </span>
          <span className="px-1.5 py-0.5 rounded bg-rose-500/25 border border-rose-400/40 text-[10px] font-mono font-semibold text-rose-100 shrink-0">
            Line {diagnostic.line}, Col {diagnostic.column}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSyntaxDiagnostic(null)}
          className="p-1 rounded-md text-rose-200/70 hover:text-white hover:bg-rose-500/20 cursor-pointer"
          title="Dismiss popup"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2.5">
        <p className="text-xs font-mono text-rose-100 break-words leading-relaxed">
          {diagnostic.message}
        </p>

        {/* Offending line preview */}
        {diagnostic.codeLine.trim().length > 0 && (
          <div className="p-2 rounded-lg bg-[#0d0a0f] border border-rose-500/25 font-mono text-[11px] overflow-x-auto">
            <div className="flex gap-2.5 text-rose-200/90">
              <span className="text-rose-400/60 select-none">{diagnostic.line} │</span>
              <span className="whitespace-pre">{diagnostic.codeLine}</span>
            </div>
            <div className="flex gap-2.5 text-amber-400 font-bold">
              <span className="opacity-0 select-none">{diagnostic.line} │</span>
              <span className="whitespace-pre">{' '.repeat(caretOffset)}▲</span>
            </div>
          </div>
        )}

        {/* How to Fix suggestion */}
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/25 text-[11.5px] text-amber-100 leading-relaxed">
          <span className="font-semibold text-amber-300">How to fix: </span>
          {diagnostic.suggestion}
        </div>

        {/* Safe-Eval notice */}
        {diagnostic.keptPreviousAudio && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Safe-Eval active — previous audio kept playing smoothly.</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onJumpToLine(diagnostic.line, diagnostic.column)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#241b24] text-rose-100 border border-rose-400/30 hover:bg-rose-500/25 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Jump to Line {diagnostic.line}</span>
          </button>

          {diagnostic.quickFix && (
            <button
              type="button"
              onClick={handleAutoFix}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-[#09110d] hover:bg-emerald-400 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Auto-Fix: {diagnostic.quickFix.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
