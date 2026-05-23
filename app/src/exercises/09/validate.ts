/**
 * Exercise 09 — Modules
 *
 * Validator checks:
 *   - at least 2 `module "..."` calls
 *   - each has a `source` attribute (loose: the value mentions "greeting"
 *     to confirm it's the greeting module, but we don't require an exact path)
 *   - each has a `name` argument passed in
 */

import { fail, pass, type Validator } from '../../lib/validator-types';
import {
  findAttr,
  findModuleCalls,
  literalAndInterpolations,
} from '../../lib/hcl-helpers';

export const validate: Validator = (ast) => {
  const modules = findModuleCalls(ast);
  if (modules.length < 2) {
    return fail(
      `Expected at least 2 \`module "..." {}\` calls; found ${modules.length}.`,
      'Call the greeting module twice with different inputs.',
    );
  }

  for (const m of modules) {
    const sourceAttr = findAttr(m, 'source');
    if (!sourceAttr || sourceAttr.value.kind !== 'string') {
      return fail(
        `Module \`${m.labels[0]}\` is missing a \`source = "..."\` argument.`,
        'Point it at the local greeting module: `source = "./modules/greeting"`.',
      );
    }
    const src = literalAndInterpolations(sourceAttr.value);
    if (!/greeting/i.test(src)) {
      return fail(
        `Module \`${m.labels[0]}\` source is "${src}", which doesn't look like the greeting module.`,
        'Use `source = "./modules/greeting"`.',
      );
    }
    if (!findAttr(m, 'name')) {
      return fail(
        `Module \`${m.labels[0]}\` is missing the \`name\` argument.`,
        'Pass a name through to the module: `name = "World"`.',
      );
    }
  }

  return pass(`${modules.length} module calls, each pointing at greeting with a name argument.`);
};
