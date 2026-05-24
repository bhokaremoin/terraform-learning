/**
 * Exercise 08 — Locals and Functions
 *
 * Validator checks: a `locals { }` block exists, and at least one local's
 * value calls one of: upper, format, jsondecode, file, templatefile.
 */

import { fail, pass, type Validator } from '../../lib/validator-types';
import { callsAnyOf, findLocals } from '../../lib/hcl-helpers';

const REQUIRED_FUNCTIONS = ['upper', 'format', 'jsondecode', 'file', 'templatefile'];

export const validate: Validator = (ast) => {
  const locals = findLocals(ast);
  if (!locals) {
    return fail(
      'No `locals { }` block found.',
      'Add a `locals { }` block and define a few computed values inside it.',
    );
  }

  const attrs = locals.body.attributes;
  if (attrs.length === 0) {
    return fail(
      'Your `locals` block is empty.',
      'Add at least one local that uses one of the functions: upper, format, jsondecode, file, templatefile.',
    );
  }

  const usesAFunction = attrs.some((a) => callsAnyOf(a.value, REQUIRED_FUNCTIONS));
  if (!usesAFunction) {
    return fail(
      `Your locals don't use any of: ${REQUIRED_FUNCTIONS.join(', ')}.`,
      'Example: `shouty_name = upper(var.name)`.',
    );
  }

  return pass('locals block uses at least one of the required built-in functions.');
};
