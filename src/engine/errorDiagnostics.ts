import type { SyntaxDiagnostic } from '@/types/studio';

const KNOWN_STRUDEL_METHODS = [
  'lpf',
  'hpf',
  'lpq',
  'gain',
  'postgain',
  'room',
  'delay',
  'delaytime',
  'bank',
  'sound',
  's',
  'note',
  'n',
  'scale',
  'chord',
  'fast',
  'slow',
  'pan',
  'decay',
  'attack',
  'sustain',
  'release',
  'fm',
  'midi',
  'midiclock',
  'ccn',
  'ccv',
  'stack',
  'setcpm',
  'setcps',
];

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function findClosestMethod(typo: string): string | null {
  let best: string | null = null;
  let bestDist = 3;
  const lower = typo.toLowerCase();
  for (const candidate of KNOWN_STRUDEL_METHODS) {
    const d = levenshtein(lower, candidate);
    if (d > 0 && d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best;
}

/**
 * Check for unclosed quotes or mismatched parentheses/brackets
 */
function detectUnbalancedDelimiter(code: string): {
  line: number;
  column: number;
  missing: string;
  suggestion: string;
} | null {
  const lines = code.split('\n');
  const stack: Array<{ ch: string; line: number; col: number }> = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closers = new Set([')', ']', '}']);

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const lineText = lines[lIdx];
    let inQuote: string | null = null;
    let quoteStartCol = 1;

    for (let cIdx = 0; cIdx < lineText.length; cIdx++) {
      const ch = lineText[cIdx];
      const next = lineText[cIdx + 1];

      // Skip single-line comments outside strings
      if (!inQuote && ch === '/' && next === '/') break;

      if (inQuote) {
        if (ch === '\\') {
          cIdx++;
          continue;
        }
        if (ch === inQuote) {
          inQuote = null;
        }
        continue;
      }

      if (ch === '"' || ch === "'" || ch === '`') {
        inQuote = ch;
        quoteStartCol = cIdx + 1;
        continue;
      }

      if (pairs[ch]) {
        stack.push({ ch, line: lIdx + 1, col: cIdx + 1 });
      } else if (closers.has(ch)) {
        const top = stack[stack.length - 1];
        if (!top || pairs[top.ch] !== ch) {
          return {
            line: lIdx + 1,
            column: cIdx + 1,
            missing: '',
            suggestion: `Unexpected closing '${ch}' on line ${lIdx + 1}. Check if you have an extra '${ch}' or missed an opening bracket.`,
          };
        }
        stack.pop();
      }
    }

    if (inQuote && inQuote !== '`') {
      return {
        line: lIdx + 1,
        column: quoteStartCol,
        missing: inQuote,
        suggestion: `Unclosed string quote (${inQuote}) on line ${lIdx + 1}. Add a matching closing ${inQuote} at the end of your mini-notation.`,
      };
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    const expected = pairs[unclosed.ch];
    return {
      line: unclosed.line,
      column: unclosed.col,
      missing: expected,
      suggestion: `Unclosed '${unclosed.ch}' opened at line ${unclosed.line}, col ${unclosed.col}. Add the missing '${expected}'.`,
    };
  }

  return null;
}

/**
 * Parse a Strudel transpiler or runtime error into a friendly SyntaxDiagnostic
 * with exact line/column, fix suggestion, and optional 1-click Auto-Fix.
 */
export function parseStrudelError(
  err: unknown,
  code: string,
  keptPreviousAudio = false
): SyntaxDiagnostic {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lines = code.split('\n');

  let line = 1;
  let column = 1;

  // 1. Try Acorn / Strudel transpiler location format: "(line:col)" or "line X, column Y"
  const parenMatch = /\((\d+):(\d+)\)/.exec(rawMessage);
  const wordMatch = /line\s+(\d+)(?:[,\s]+col(?:umn)?\s+(\d+))?/i.exec(rawMessage);
  const errObj = err as { loc?: { line?: number; column?: number } } | null;

  if (errObj?.loc?.line) {
    line = errObj.loc.line;
    column = (errObj.loc.column ?? 0) + 1;
  } else if (parenMatch) {
    line = parseInt(parenMatch[1], 10);
    column = parseInt(parenMatch[2], 10) + 1;
  } else if (wordMatch) {
    line = parseInt(wordMatch[1], 10);
    column = wordMatch[2] ? parseInt(wordMatch[2], 10) : 1;
  }

  let suggestion = 'Check the syntax around the highlighted line for missing commas, brackets, or typos.';
  let quickFix: SyntaxDiagnostic['quickFix'];

  // 2. Detect method/function typo: "xxx is not a function" or "xxx is not defined"
  const notFuncMatch = /\.?(\w+)\s+is not a function/i.exec(rawMessage);
  const notDefMatch = /(\w+)\s+is not defined/i.exec(rawMessage);
  const badIdentifier = notFuncMatch?.[1] ?? notDefMatch?.[1];

  if (badIdentifier) {
    // Locate exact line where badIdentifier appears
    const foundIdx = lines.findIndex((l) => new RegExp(`\\b${badIdentifier}\\b`).test(l));
    if (foundIdx !== -1) {
      line = foundIdx + 1;
      column = lines[foundIdx].indexOf(badIdentifier) + 1;
    }

    // Special Hydra-aware diagnostics (never suggest replacing s0 -> s!)
    if (badIdentifier === 'initCam' && /\bs\.initCam\b/.test(code)) {
      suggestion = `Use Hydra's camera source 's0.initCam()' instead of 's.initCam()' (s is Strudel's sound function).`;
      quickFix = {
        label: `Replace 's.initCam' → 's0.initCam'`,
        fixedCode: code.replace(/\bs\.initCam\b/g, 's0.initCam'),
      };
    } else if (/^(s[0-3]|o[0-3])$/.test(badIdentifier)) {
      suggestion = `'${badIdentifier}' is a Hydra visual source/buffer. Make sure 'await initHydra()' is at the top of your script.`;
    } else {
      const closest = findClosestMethod(badIdentifier);
      if (closest) {
        suggestion = `Did you mean '${closest}' instead of '${badIdentifier}'?`;
        const fixedCode = code.replace(new RegExp(`\\b${badIdentifier}\\b`, 'g'), closest);
        quickFix = {
          label: `Replace '${badIdentifier}' → '${closest}'`,
          fixedCode,
        };
      } else if (badIdentifier === 'midin' || rawMessage.includes('await')) {
        suggestion = `Use 'const cc = await midin(0)' for MIDI input, or use Studio's built-in 'macro(1).range(200, 4000)' with MIDI Learn.`;
      } else {
        suggestion = `'${badIdentifier}' is not recognized in Strudel. Check spelling or make sure it is defined before use.`;
      }
    }
  } else {
    // 3. Check unbalanced quotes / brackets
    const unbalanced = detectUnbalancedDelimiter(code);
    if (unbalanced) {
      line = unbalanced.line;
      column = unbalanced.column;
      suggestion = unbalanced.suggestion;
      if (unbalanced.missing) {
        const targetIdx = Math.max(0, Math.min(lines.length - 1, line - 1));
        const fixedLines = [...lines];
        if (unbalanced.missing === '"' || unbalanced.missing === "'") {
          fixedLines[targetIdx] = fixedLines[targetIdx] + unbalanced.missing;
        } else {
          fixedLines[fixedLines.length - 1] =
            fixedLines[fixedLines.length - 1] + unbalanced.missing;
        }
        quickFix = {
          label: `Insert missing '${unbalanced.missing}'`,
          fixedCode: fixedLines.join('\n'),
        };
      }
    } else if (/unexpected token/i.test(rawMessage)) {
      suggestion =
        'Unexpected token — check for a missing comma between patterns inside stack(...), or an extra dot/symbol.';
    }
  }

  const clampedLine = Math.max(1, Math.min(lines.length, line));
  const codeLine = lines[clampedLine - 1] ?? '';

  return {
    message: rawMessage.replace(/\s*\(\d+:\d+\)\s*$/, '').trim(),
    line: clampedLine,
    column: Math.max(1, column),
    codeLine,
    suggestion,
    quickFix,
    keptPreviousAudio,
  };
}
