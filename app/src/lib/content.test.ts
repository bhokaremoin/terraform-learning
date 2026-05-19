import { describe, expect, it } from 'vitest';
import { EXERCISES, getExerciseById, getNextExerciseId, getPrevExerciseId } from './content';

describe('content loader', () => {
  it('finds all 10 canonical exercises', () => {
    expect(EXERCISES).toHaveLength(10);
  });

  it('IDs are 01..10 in order', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(ids).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
  });

  it('every exercise has non-empty README, starter, and solution', () => {
    for (const e of EXERCISES) {
      expect(e.readme.length).toBeGreaterThan(50);
      expect(e.starter.length).toBeGreaterThan(20);
      expect(e.solution.length).toBeGreaterThan(50);
    }
  });

  it('derives a human title from the first H1', () => {
    const ex1 = getExerciseById('01');
    expect(ex1).toBeDefined();
    // 01-hello-world/README.md starts with "# 01 · Hello World"
    expect(ex1?.title).toMatch(/Hello World/i);
  });

  it('marks 05, 06, 10 as observation; others as auto', () => {
    const expectedObs = new Set(['05', '06', '10']);
    for (const e of EXERCISES) {
      const want = expectedObs.has(e.id) ? 'observation' : 'auto';
      expect(e.kind).toBe(want);
    }
  });

  it('next/prev navigation works', () => {
    expect(getPrevExerciseId('01')).toBeNull();
    expect(getNextExerciseId('01')).toBe('02');
    expect(getPrevExerciseId('05')).toBe('04');
    expect(getNextExerciseId('05')).toBe('06');
    expect(getNextExerciseId('10')).toBeNull();
  });

  it('getExerciseById returns undefined for unknown IDs', () => {
    expect(getExerciseById('99')).toBeUndefined();
  });
});
