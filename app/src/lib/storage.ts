import type { ExerciseId, Progress } from '../types';

/**
 * All localStorage keys live under this prefix. Reset clears anything that
 * starts with it; nothing else in localStorage is touched.
 */
export const STORAGE_PREFIX = 'tf-learn:';

const KEY_PROGRESS = `${STORAGE_PREFIX}progress`;
const KEY_CODE = (id: ExerciseId) => `${STORAGE_PREFIX}code:${id}`;

const EMPTY_PROGRESS: Progress = {
  completed: {},
  peeked: {},
  current: null,
};

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Returns localStorage if available and writable, otherwise null. */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const test = `${STORAGE_PREFIX}__test`;
    window.localStorage.setItem(test, '1');
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch {
    // Private mode, quota full, blocked, etc.
    return null;
  }
}

function safeGetJson<T>(key: string, fallback: T): T {
  const ls = storage();
  if (!ls) return fallback;
  const raw = ls.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt entry; treat as missing.
    return fallback;
  }
}

function safeSetJson(key: string, value: unknown): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or similar. Swallow — UI can detect via `isStorageAvailable`.
  }
}

/* -------------------------------------------------------------------------- */
/* Change notification (component subscription)                               */
/* -------------------------------------------------------------------------- */

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeStorage(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export function isStorageAvailable(): boolean {
  return storage() !== null;
}

/* ---- per-exercise code ---- */

export function getCode(id: ExerciseId): string | null {
  const ls = storage();
  if (!ls) return null;
  return ls.getItem(KEY_CODE(id));
}

export function setCode(id: ExerciseId, code: string): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(KEY_CODE(id), code);
  } catch {
    // ignore
  }
}

export function clearCode(id: ExerciseId): void {
  const ls = storage();
  if (!ls) return;
  ls.removeItem(KEY_CODE(id));
}

/* ---- progress (completion + peeked + current) ---- */

export function getProgress(): Progress {
  // Tolerate older or partial shapes — always present the canonical structure.
  const raw = safeGetJson<Partial<Progress>>(KEY_PROGRESS, {});
  return {
    completed: raw.completed ?? {},
    peeked: raw.peeked ?? {},
    current: raw.current ?? null,
  };
}

function withProgress(mutator: (p: Progress) => Progress): void {
  const next = mutator(getProgress());
  safeSetJson(KEY_PROGRESS, next);
  notify();
}

export function markCompleted(id: ExerciseId): void {
  withProgress((p) => ({ ...p, completed: { ...p.completed, [id]: true } }));
}

export function unmarkCompleted(id: ExerciseId): void {
  withProgress((p) => {
    const { [id]: _omit, ...rest } = p.completed;
    void _omit;
    return { ...p, completed: rest };
  });
}

export function markPeeked(id: ExerciseId): void {
  withProgress((p) => ({ ...p, peeked: { ...p.peeked, [id]: true } }));
}

export function setCurrent(id: ExerciseId | null): void {
  withProgress((p) => ({ ...p, current: id }));
}

/* ---- global reset ---- */

/**
 * Remove every entry whose key starts with our prefix. Leaves other
 * localStorage usage alone (e.g., DevTools extensions).
 */
export function resetAll(): void {
  const ls = storage();
  if (!ls) return;
  const toRemove: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) toRemove.push(k);
  }
  for (const k of toRemove) ls.removeItem(k);
  notify();
}

export const _empty: Readonly<Progress> = EMPTY_PROGRESS;
