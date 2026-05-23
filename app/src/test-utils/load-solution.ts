/**
 * Helpers for tests that need to load HCL out of the canonical SOLUTION.md
 * files. Each SOLUTION.md has at least one ```hcl ... ``` fenced code block
 * with the canonical solution; this utility extracts the first one.
 */

import { EXERCISES, getExerciseById } from '../lib/content';
import type { ExerciseId } from '../types';

/**
 * Extracts the first ```hcl fenced code block from a markdown string.
 * Returns the body of that block (without the fence lines).
 */
export function extractFirstHclFence(markdown: string): string | null {
  const re = /```(?:hcl|terraform|tf)\s*\n([\s\S]*?)\n```/i;
  const m = markdown.match(re);
  return m ? m[1] : null;
}

/** Get the SOLUTION.md HCL for a given exercise id. Throws if not findable. */
export function loadSolutionHcl(id: ExerciseId): string {
  const ex = getExerciseById(id);
  if (!ex) throw new Error(`No exercise with id ${id}`);
  const hcl = extractFirstHclFence(ex.solution);
  if (!hcl) throw new Error(`No HCL fence in SOLUTION.md for exercise ${id}`);
  return hcl;
}

/** Get the starter main.tf HCL for a given exercise. */
export function loadStarterHcl(id: ExerciseId): string {
  const ex = getExerciseById(id);
  if (!ex) throw new Error(`No exercise with id ${id}`);
  return ex.starter;
}

export const ALL_EXERCISE_IDS: ExerciseId[] = EXERCISES.map((e) => e.id);
