import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { AlertCircle, CheckCircle2, Play, Sparkles } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { strudelEngine } from '@/engine/strudelEngine';
import { SyntaxErrorPopup } from '@/components/Editor/SyntaxErrorPopup';

export interface StrudelEditorHandle {
  insertSnippet: (snippet: string) => void;
  jumpToLine: (line: number, column?: number) => void;
  focus: () => void;
}

const setErrorLineEffect = StateEffect.define<number | null>();

const errorLineDecoration = Decoration.line({
  attributes: {
    style:
      'background-color: rgba(244, 63, 94, 0.18); border-left: 3px solid #f43f5e;',
  },
});

const errorLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const eff of tr.effects) {
      if (eff.is(setErrorLineEffect)) {
        if (eff.value === null) {
          return Decoration.none;
        }
        const lineNum = Math.max(1, Math.min(tr.state.doc.lines, eff.value));
        const line = tr.state.doc.line(lineNum);
        return Decoration.set([errorLineDecoration.range(line.from)]);
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const StrudelEditor = forwardRef<StrudelEditorHandle>(function StrudelEditor(_, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInternalChange = useRef(false);

  const code = useStudioStore((s) => s.code);
  const setCode = useStudioStore((s) => s.setCode);
  const activeError = useStudioStore((s) => s.activeError);
  const syntaxDiagnostic = useStudioStore((s) => s.syntaxDiagnostic);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const statusMessage = useStudioStore((s) => s.statusMessage);

  const jumpToLine = (line: number, column = 1) => {
    const view = viewRef.current;
    if (!view) return;
    const clampedLine = Math.max(1, Math.min(view.state.doc.lines, line));
    const lineObj = view.state.doc.line(clampedLine);
    const pos = Math.min(lineObj.to, lineObj.from + Math.max(0, column - 1));
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: 'center' }),
    });
    view.focus();
  };

  useImperativeHandle(ref, () => ({
    insertSnippet: (snippet: string) => {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      });
      view.focus();
    },
    jumpToLine,
    focus: () => {
      viewRef.current?.focus();
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const evalKeymap = keymap.of([
      {
        key: 'Mod-Enter',
        run: (view) => {
          const current = view.state.doc.toString();
          setCode(current);
          void strudelEngine.evaluate(current);
          return true;
        },
      },
      {
        key: 'Mod-.',
        run: () => {
          strudelEngine.stop();
          return true;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        isInternalChange.current = true;
        setCode(update.state.doc.toString());
        queueMicrotask(() => {
          isInternalChange.current = false;
        });
      }
    });

    const state = EditorState.create({
      doc: useStudioStore.getState().code,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        javascript(),
        oneDark,
        errorLineField,
        evalKeymap,
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [setCode]);

  // Sync external store changes (preset load, playlist fade, auto-fix, or sequencer sync)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || isInternalChange.current) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== code) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      });
    }
  }, [code]);

  // Highlight offending line in red whenever syntaxDiagnostic updates
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: setErrorLineEffect.of(syntaxDiagnostic ? syntaxDiagnostic.line : null),
    });
  }, [syntaxDiagnostic]);

  return (
    <div className="relative flex flex-col h-full min-h-0 bg-[#0d0f12]">
      {/* Editor Header Strip */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-[#222732] bg-[#11141a]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b95a7] whitespace-nowrap">
            Pattern Editor
          </span>
          <span className="hidden xl:inline-block text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#1a1f28] text-[#6d778a] border border-[#262c38] whitespace-nowrap">
            Strudel JS + Mini-Notation + $: Multi-Track
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void strudelEngine.evaluate(useStudioStore.getState().code)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
            title="Evaluate & Update Pattern (Cmd+Enter)"
          >
            <Play className="w-3 h-3 fill-current shrink-0" />
            <span>{isPlaying ? 'Update Live' : 'Run Pattern'}</span>
            <kbd className="ml-1 text-[10px] opacity-70 font-mono">⌘↵</kbd>
          </button>
        </div>
      </div>

      {/* CodeMirror 6 Host */}
      <div
        ref={containerRef}
        className="strudel-editor-host flex-1 min-h-0 overflow-hidden"
      />

      {/* Smart Floating Syntax Error Popup */}
      <SyntaxErrorPopup onJumpToLine={jumpToLine} />

      {/* Diagnostic / Status Footer */}
      <div
        className={`flex items-center justify-between gap-3 px-3.5 py-1.5 text-xs border-t transition-colors ${
          activeError
            ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            : 'bg-[#11141a] border-[#222732] text-[#8b95a7]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {activeError ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="font-mono truncate">{activeError}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{statusMessage}</span>
            </>
          )}
        </div>
        <div className="hidden xl:flex items-center gap-3 text-[11px] text-[#697386] font-mono shrink-0">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400/70" />
            macro(1..8) &amp; track(&apos;drums&apos;, ...) ready
          </span>
          <span>⌘. Stop</span>
        </div>
      </div>
    </div>
  );
});
