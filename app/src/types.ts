/**
 * Shared types for the interactive tutorial.
 *
 * Exercises are keyed by a two-digit string ID ("01" through "10") that comes
 * from the directory name in the repo root (e.g., "01-hello-world" → id "01").
 */

export type ExerciseId = string;

/**
 * Whether the exercise validates the user's HCL automatically (`auto`) or
 * asks them to follow steps locally and self-attest (`observation`).
 */
export type ExerciseKind = 'auto' | 'observation';

export interface Exercise {
  id: ExerciseId;
  /** Full directory name, e.g. "01-hello-world". */
  slug: string;
  /** Display title derived from the README's first H1, fallback to slug. */
  title: string;
  /** Full README.md markdown source. */
  readme: string;
  /** Starter main.tf HCL source. */
  starter: string;
  /** SOLUTION.md markdown source (revealed when user clicks "Show solution"). */
  solution: string;
  /** Auto-validated or observation-only. Wired up in later phases. */
  kind: ExerciseKind;
}

export interface Progress {
  /** Exercise IDs the user has completed (passed validation or self-attested). */
  completed: Record<ExerciseId, true>;
  /** Exercise IDs where the user revealed the SOLUTION.md. */
  peeked: Record<ExerciseId, true>;
  /** The last exercise the user navigated to. */
  current: ExerciseId | null;
}

export type ValidationResult =
  | { kind: 'pass'; note?: string }
  | { kind: 'fail'; message: string; hint?: string };
