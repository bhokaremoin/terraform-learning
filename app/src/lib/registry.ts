/**
 * Maps every exercise id to either an auto-validator or an observation spec.
 *
 * Adding a new exercise:
 *   1. Add the NN-name/ directory at the repo root with README.md, main.tf,
 *      SOLUTION.md.
 *   2. If it's auto-validated: create app/src/exercises/NN/validate.ts
 *      exporting `validate: Validator`. If observation: create
 *      app/src/exercises/NN/observation.ts exporting `observation`.
 *   3. Register here.
 */

import type { ObservationSpec, Validator } from './validator-types';
import type { ExerciseId } from '../types';

import { validate as validate01 } from '../exercises/01/validate';
import { validate as validate02 } from '../exercises/02/validate';
import { validate as validate03 } from '../exercises/03/validate';
import { validate as validate04 } from '../exercises/04/validate';
import { validate as validate07 } from '../exercises/07/validate';
import { validate as validate08 } from '../exercises/08/validate';
import { validate as validate09 } from '../exercises/09/validate';

import { observation as observation05 } from '../exercises/05/observation';
import { observation as observation06 } from '../exercises/06/observation';
import { observation as observation10 } from '../exercises/10/observation';

export type RegistryEntry =
  | { kind: 'auto'; validate: Validator }
  | { kind: 'observation'; observation: ObservationSpec };

export const REGISTRY: Record<ExerciseId, RegistryEntry> = {
  '01': { kind: 'auto', validate: validate01 },
  '02': { kind: 'auto', validate: validate02 },
  '03': { kind: 'auto', validate: validate03 },
  '04': { kind: 'auto', validate: validate04 },
  '05': { kind: 'observation', observation: observation05 },
  '06': { kind: 'observation', observation: observation06 },
  '07': { kind: 'auto', validate: validate07 },
  '08': { kind: 'auto', validate: validate08 },
  '09': { kind: 'auto', validate: validate09 },
  '10': { kind: 'observation', observation: observation10 },
};

export function getRegistryEntry(id: ExerciseId): RegistryEntry | undefined {
  return REGISTRY[id];
}
