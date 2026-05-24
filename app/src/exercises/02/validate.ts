/**
 * Exercise 02 — Variables and Outputs
 *
 * Validator checks:
 *   - at least 2 `variable` blocks declared
 *   - a local_file resource whose `content` template references some var.*
 *   - at least 1 `output` block
 */

import { fail, pass, type Validator } from '../../lib/validator-types';
import {
  findAttr,
  findOutputs,
  findResource,
  findVariables,
  interpolationMentions,
} from '../../lib/hcl-helpers';

export const validate: Validator = (ast) => {
  const variables = findVariables(ast);
  if (variables.length < 2) {
    return fail(
      `Expected at least 2 \`variable\` blocks; found ${variables.length}.`,
      'Declare variables for the filename, greeting, and name.',
    );
  }

  const file = findResource(ast, 'local_file');
  if (!file) {
    return fail(
      'No `resource "local_file" "..."` block found.',
      'You still need the local_file resource from exercise 1, but parameterized.',
    );
  }

  const contentAttr = findAttr(file, 'content');
  if (!contentAttr) {
    return fail('The local_file resource needs a `content` argument.');
  }

  if (!interpolationMentions(contentAttr.value, 'var.')) {
    return fail(
      'The `content` should interpolate a variable (e.g., `${var.name}`).',
      'Use template interpolation like `"${var.greeting}, ${var.name}!\\n"`.',
    );
  }

  const outputs = findOutputs(ast);
  if (outputs.length < 1) {
    return fail(
      'Expected at least one `output` block.',
      'Add e.g. `output "file_path" { value = local_file.greeting.filename }`.',
    );
  }

  return pass(`${variables.length} variables, ${outputs.length} outputs, content references var.*.`);
};
