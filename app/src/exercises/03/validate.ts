/**
 * Exercise 03 — Multiple Resources and References
 *
 * Validator checks:
 *   - a `random_pet` resource exists
 *   - a `local_file` resource exists
 *   - the local_file references random_pet somewhere (filename or content
 *     interpolates `random_pet.X` or directly references it)
 */

import { fail, pass, type Validator } from '../../lib/validator-types';
import {
  findAttr,
  findResource,
  interpolationMentions,
  traversalStartsWith,
} from '../../lib/hcl-helpers';

export const validate: Validator = (ast) => {
  const pet = findResource(ast, 'random_pet');
  if (!pet) {
    return fail(
      'No `resource "random_pet" "..."` block found.',
      'Declare a `random_pet` resource (and add hashicorp/random to required_providers).',
    );
  }

  const file = findResource(ast, 'local_file');
  if (!file) {
    return fail(
      'No `resource "local_file" "..."` block found.',
      'You also need a local_file resource that uses the pet name.',
    );
  }

  const filenameAttr = findAttr(file, 'filename');
  const contentAttr = findAttr(file, 'content');

  const filenameRefs =
    traversalStartsWith(filenameAttr?.value, ['random_pet']) ||
    interpolationMentions(filenameAttr?.value, 'random_pet');
  const contentRefs =
    traversalStartsWith(contentAttr?.value, ['random_pet']) ||
    interpolationMentions(contentAttr?.value, 'random_pet');

  if (!filenameRefs && !contentRefs) {
    return fail(
      'The local_file should reference the random_pet somewhere (filename or content).',
      'Try `filename = "greeting-${random_pet.name.id}.txt"`.',
    );
  }

  return pass('Dependency edge from local_file → random_pet is in place.');
};
