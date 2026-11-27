import { describe, expect, it } from 'vitest';
import {
  applySequencerToCode,
  createDefaultSequencerRows,
  generateSequencerCodeBlock,
  rowToStrudelPattern,
  SEQUENCER_END_MARKER,
  SEQUENCER_START_MARKER,
} from '@/engine/sequencerSync';

describe('sequencerSync', () => {
  it('converts a drum row and melodic row into Strudel mini-notation', () => {
    const rows = createDefaultSequencerRows();
    const kickLine = rowToStrudelPattern(rows[0]);
    expect(kickLine).toContain('s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~")');
    expect(kickLine).toContain('.bank("RolandTR909")');

    const bassLine = rowToStrudelPattern(rows[4]);
    expect(bassLine).toContain('note("c2 ~ ~ c2 ~ ~ c2 ~ ~ ~ c2 ~ ~ ~ c2 ~")');
    expect(bassLine).toContain('.s("triangle")');
  });

  it('omits muted rows from generated stack block', () => {
    const rows = createDefaultSequencerRows();
    rows[0].muted = true;
    const block = generateSequencerCodeBlock(rows, 124);
    expect(block).toContain('setcpm(124 / 4)');
    expect(block).not.toContain('bd ~ ~ ~');
    expect(block).toContain(SEQUENCER_START_MARKER);
    expect(block).toContain(SEQUENCER_END_MARKER);
  });

  it('replaces only the marked sequencer block when markers already exist', () => {
    const rows = createDefaultSequencerRows();
    const initial = `// My custom header\n${SEQUENCER_START_MARKER}\nold\n${SEQUENCER_END_MARKER}\n// Footer`;
    const updated = applySequencerToCode(initial, rows, 128, false);
    expect(updated).toContain('// My custom header');
    expect(updated).toContain('setcpm(128 / 4)');
    expect(updated).toContain('// Footer');
    expect(updated).not.toContain('\nold\n');
  });
});
