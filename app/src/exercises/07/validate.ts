/**
 * Exercise 07 — count and for_each
 *
 * Validator checks: a local_file resource exists that uses either
 *   - `count = <number or expr>`, OR
 *   - `for_each = <expr>`
 *
 * The exercise has two parts (count first, then refactor to for_each);
 * either is accepted as the final solution.
 */

import { fail, pass, type Validator } from '../../lib/validator-types';
import { findAttr, findResources } from '../../lib/hcl-helpers';

export const validate: Validator = (ast) => {
  const files = findResources(ast, 'local_file');
  if (files.length === 0) {
    return fail(
      'No `resource "local_file" "..."` block found.',
      'Declare at least one local_file resource and add count or for_each to it.',
    );
  }

  const usesCount = files.some((f) => !!findAttr(f, 'count'));
  const usesForEach = files.some((f) => !!findAttr(f, 'for_each'));

  if (!usesCount && !usesForEach) {
    return fail(
      'None of your local_file resources use `count` or `for_each`.',
      'Add e.g. `count = 3` or `for_each = var.fruits` to a local_file resource.',
    );
  }

  const which = usesForEach ? 'for_each' : 'count';
  return pass(`A local_file resource uses \`${which}\` to create multiple instances.`);
};
