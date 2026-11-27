import { describe, expect, it } from 'vitest';
import { parseStrudelError } from '@/engine/errorDiagnostics';

describe('errorDiagnostics', () => {
  it('detects Strudel method typos and proposes a 1-click Auto-Fix', () => {
    const code = `setcpm(120 / 4)\nnote("c3 eb3 g3").lpff(800).s("sawtooth")`;
    const diag = parseStrudelError(new TypeError('Pattern.lpff is not a function'), code, true);

    expect(diag.line).toBe(2);
    expect(diag.suggestion).toContain('lpf');
    expect(diag.quickFix).toBeDefined();
    expect(diag.quickFix?.fixedCode).toContain('.lpf(800)');
    expect(diag.keptPreviousAudio).toBe(true);
  });

  it('detects unclosed quotes on the exact offending line', () => {
    const code = `stack(\n  s("bd*4),\n  s("hh*8")\n)`;
    const diag = parseStrudelError(new SyntaxError('Unterminated string constant (2:4)'), code);

    expect(diag.line).toBe(2);
    expect(diag.suggestion).toContain('Unclosed string quote');
    expect(diag.quickFix?.fixedCode).toContain('s("bd*4),"');
  });

  it('detects missing closing parenthesis and offers an Auto-Fix', () => {
    const code = `stack(\n  s("bd*4"),\n  s("hh*8")`;
    const diag = parseStrudelError(new SyntaxError('Unexpected token'), code);

    expect(diag.line).toBe(1);
    expect(diag.suggestion).toContain("Unclosed '('");
    expect(diag.quickFix?.fixedCode.endsWith(')')).toBe(true);
  });
});
