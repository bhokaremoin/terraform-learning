import type { HclAst } from './hcl';

export type ValidationResult =
  | { kind: 'pass'; note?: string }
  | { kind: 'fail'; message: string; hint?: string }
  | { kind: 'parse-error'; message: string; line: number; col: number };

export const pass = (note?: string): ValidationResult => ({ kind: 'pass', note });
export const fail = (message: string, hint?: string): ValidationResult => ({
  kind: 'fail',
  message,
  hint,
});

export type Validator = (ast: HclAst) => ValidationResult;

export interface ObservationStep {
  /** Short label shown next to the checkbox. */
  label: string;
  /** Optional longer hint or example below the label. */
  hint?: string;
}

export interface ObservationSpec {
  /** Why this exercise is observation-only — shown above the checklist. */
  why: string;
  /** Ordered list of expected observations to tick off. */
  checklist: ObservationStep[];
}
