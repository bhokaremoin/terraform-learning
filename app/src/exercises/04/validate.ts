/**
 * Exercise 04 — Data Sources
 *
 * Validator checks:
 *   - a `data "local_file" "..."` block exists
 *   - a `local_file` resource exists whose content references
 *     `data.local_file.<n>.content` somewhere (possibly wrapped in upper())
 */

import { fail, pass, type Validator } from '../../lib/validator-types';
import {
  findAttr,
  findData,
  findResource,
  interpolationMentions,
  traversalStartsWith,
} from '../../lib/hcl-helpers';

export const validate: Validator = (ast) => {
  const dataBlock = findData(ast, 'local_file');
  if (!dataBlock) {
    return fail(
      'No `data "local_file" "..."` block found.',
      'Add a data source: `data "local_file" "input" { filename = "..." }`.',
    );
  }

  const file = findResource(ast, 'local_file');
  if (!file) {
    return fail(
      'No `resource "local_file" "..."` block found.',
      'You still need a resource that consumes the data source.',
    );
  }

  const contentAttr = findAttr(file, 'content');
  const refsData =
    traversalStartsWith(contentAttr?.value, ['data', 'local_file']) ||
    interpolationMentions(contentAttr?.value, 'data.local_file');
  // upper(data.local_file.x.content) — referencesResource hits the inner traversal
  const refsDataInCall =
    contentAttr?.value.kind === 'call' &&
    contentAttr.value.args.some((a) => traversalStartsWith(a, ['data', 'local_file']));

  if (!refsData && !refsDataInCall) {
    return fail(
      "The resource's `content` should reference the data source.",
      'Try `content = upper(data.local_file.input.content)` (or however you named it).',
    );
  }

  return pass('Data source is wired into a local_file resource.');
};
