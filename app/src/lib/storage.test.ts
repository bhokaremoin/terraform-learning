// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_PREFIX,
  clearCode,
  getCode,
  getProgress,
  isStorageAvailable,
  markCompleted,
  markPeeked,
  resetAll,
  setCode,
  setCurrent,
  unmarkCompleted,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('storage', () => {
  it('reports storage as available under jsdom', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('returns null for an unstored code id', () => {
    expect(getCode('01')).toBeNull();
  });

  it('round-trips per-exercise code', () => {
    setCode('01', 'resource "local_file" "x" {}');
    expect(getCode('01')).toBe('resource "local_file" "x" {}');
  });

  it('clearCode removes an entry but leaves others', () => {
    setCode('01', 'A');
    setCode('02', 'B');
    clearCode('01');
    expect(getCode('01')).toBeNull();
    expect(getCode('02')).toBe('B');
  });

  it('returns the canonical empty progress shape when nothing is stored', () => {
    const p = getProgress();
    expect(p).toEqual({ completed: {}, peeked: {}, current: null });
  });

  it('markCompleted / markPeeked / setCurrent persist and read back', () => {
    markCompleted('01');
    markPeeked('02');
    setCurrent('03');
    const p = getProgress();
    expect(p.completed['01']).toBe(true);
    expect(p.peeked['02']).toBe(true);
    expect(p.current).toBe('03');
  });

  it('unmarkCompleted removes one without touching siblings', () => {
    markCompleted('01');
    markCompleted('02');
    unmarkCompleted('01');
    const p = getProgress();
    expect(p.completed['01']).toBeUndefined();
    expect(p.completed['02']).toBe(true);
  });

  it('tolerates a partial stored progress shape', () => {
    localStorage.setItem(
      `${STORAGE_PREFIX}progress`,
      JSON.stringify({ completed: { '04': true } }), // missing peeked + current
    );
    const p = getProgress();
    expect(p.completed['04']).toBe(true);
    expect(p.peeked).toEqual({});
    expect(p.current).toBeNull();
  });

  it('tolerates corrupt JSON without throwing', () => {
    localStorage.setItem(`${STORAGE_PREFIX}progress`, 'not json{');
    const p = getProgress();
    expect(p).toEqual({ completed: {}, peeked: {}, current: null });
  });

  it('resetAll clears only keys with our prefix', () => {
    setCode('01', 'X');
    markCompleted('02');
    setCurrent('03');
    localStorage.setItem('unrelated', 'keep me');

    resetAll();

    expect(getCode('01')).toBeNull();
    expect(getProgress()).toEqual({ completed: {}, peeked: {}, current: null });
    expect(localStorage.getItem('unrelated')).toBe('keep me');
  });
});
