/**
 * Exercise 01 — Hello World
 *
 * Goal: feel the init → plan → apply → destroy loop with a single resource.
 * Validator checks: a local_file resource exists with a filename that
 * mentions "hello" and a content that contains a greeting (literally
 * contains "Hello", case-insensitive, anywhere in the templated text).
 */

import { fail, pass, type Validator } from '../../lib/validator-types';
import { findAttr, findResource, stringMatches } from '../../lib/hcl-helpers';

export const validate: Validator = (ast) => {
  const file = findResource(ast, 'local_file');
  if (!file) {
    return fail(
      'No `resource "local_file" "..."` block found.',
      'Exercise 1 needs a single local_file resource. See the Concept section in the README.',
    );
  }

  const filenameAttr = findAttr(file, 'filename');
  if (!stringMatches(filenameAttr?.value, /hello/i)) {
    return fail(
      'The local_file resource needs a `filename` argument that points at hello.txt.',
      'Try `filename = "hello.txt"` or `filename = "${path.module}/hello.txt"`.',
    );
  }

  const contentAttr = findAttr(file, 'content');
  if (!stringMatches(contentAttr?.value, /hello/i)) {
    return fail(
      'The `content` argument should contain a greeting (something with "Hello").',
      'Example: `content = "Hello, Terraform!\\n"`.',
    );
  }

  return pass('local_file resource is wired up correctly.');
};
