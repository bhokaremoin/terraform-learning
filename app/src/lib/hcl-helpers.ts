/**
 * Walk helpers for the HCL AST. All functions are pure — they take an AST or
 * a subtree and answer structural questions used by per-exercise validators.
 *
 * The validation philosophy is intentionally loose: prefer "the right shape
 * exists somewhere" over "the names match exactly." Accept supersets (extra
 * resources the user added for exploration) and equivalent forms.
 */

import type {
  HclAst,
  HclAttribute,
  HclBlock,
  HclValue,
  StringSegment,
  TraversalStep,
} from './hcl';

/* -------------------------------------------------------------------------- */
/* Block discovery                                                            */
/* -------------------------------------------------------------------------- */

export function findBlocks(ast: HclAst | HclBlock['body'], type: string): HclBlock[] {
  const list = isAst(ast) ? ast.blocks : ast.blocks;
  return list.filter((b) => b.type === type);
}

export function findBlock(
  ast: HclAst | HclBlock['body'],
  type: string,
  labelPrefixes?: string[],
): HclBlock | undefined {
  const list = findBlocks(ast, type);
  if (!labelPrefixes) return list[0];
  return list.find((b) => labelPrefixes.every((p, i) => b.labels[i] === p));
}

export function findResource(
  ast: HclAst,
  resourceType: string,
  name?: string,
): HclBlock | undefined {
  return findBlock(ast, 'resource', name ? [resourceType, name] : [resourceType]);
}

export function findResources(ast: HclAst, resourceType: string): HclBlock[] {
  return findBlocks(ast, 'resource').filter((b) => b.labels[0] === resourceType);
}

export function findData(ast: HclAst, dataType: string, name?: string): HclBlock | undefined {
  return findBlock(ast, 'data', name ? [dataType, name] : [dataType]);
}

export function findDataBlocks(ast: HclAst, dataType: string): HclBlock[] {
  return findBlocks(ast, 'data').filter((b) => b.labels[0] === dataType);
}

export function findVariable(ast: HclAst, name?: string): HclBlock | undefined {
  return findBlock(ast, 'variable', name ? [name] : undefined);
}

export function findVariables(ast: HclAst): HclBlock[] {
  return findBlocks(ast, 'variable');
}

export function findOutputs(ast: HclAst): HclBlock[] {
  return findBlocks(ast, 'output');
}

export function findModuleCalls(ast: HclAst): HclBlock[] {
  return findBlocks(ast, 'module');
}

export function findLocals(ast: HclAst): HclBlock | undefined {
  return findBlock(ast, 'locals');
}

function isAst(x: HclAst | HclBlock['body']): x is HclAst {
  return Array.isArray((x as HclAst).blocks) && !('attributes' in (x as HclBlock['body']));
}

/* -------------------------------------------------------------------------- */
/* Attribute access                                                           */
/* -------------------------------------------------------------------------- */

export function findAttr(block: HclBlock | undefined, name: string): HclAttribute | undefined {
  return block?.body.attributes.find((a) => a.name === name);
}

/**
 * Get an attribute's value as a plain string IF it has no interpolations.
 * Returns null if the attribute is missing, isn't a string, or contains any
 * `${...}` interpolation. Use stringMatches for templated strings.
 */
export function asPlainString(value: HclValue | undefined): string | null {
  if (!value || value.kind !== 'string') return null;
  if (value.segments.some((s) => 'interp' in s)) return null;
  return value.segments.map((s) => ('literal' in s ? s.literal : '')).join('');
}

/** Concatenate all literal segments of a string, ignoring interpolations. */
export function literalText(value: HclValue | undefined): string {
  if (!value || value.kind !== 'string') return '';
  return value.segments
    .filter((s): s is { literal: string } => 'literal' in s)
    .map((s) => s.literal)
    .join('');
}

/** Concatenate string segments, rendering interpolations as their raw text. */
export function literalAndInterpolations(value: HclValue | undefined): string {
  if (!value || value.kind !== 'string') return '';
  return value.segments.map((s) => ('literal' in s ? s.literal : `\${${s.interp}}`)).join('');
}

/**
 * True if `value` is a string (literal or templated) whose rendered text
 * matches the given regex. Case-insensitive by default.
 */
export function stringMatches(value: HclValue | undefined, re: RegExp): boolean {
  if (!value || value.kind !== 'string') return false;
  return re.test(literalAndInterpolations(value));
}

/* -------------------------------------------------------------------------- */
/* Reference / traversal walking                                              */
/* -------------------------------------------------------------------------- */

/**
 * True if the value (or anything inside it) is a traversal whose path begins
 * with the given prefix. Examples:
 *   - traversalStartsWith(v, ['var']) — does this reference any var.*?
 *   - traversalStartsWith(v, ['random_pet']) — does it touch random_pet.*?
 */
export function traversalStartsWith(value: HclValue | undefined, prefix: string[]): boolean {
  return anyValueMatches(value, (v) => {
    if (v.kind !== 'traversal') return false;
    if (v.path.length < prefix.length) return false;
    for (let i = 0; i < prefix.length; i++) {
      const step = v.path[i];
      if (step.kind !== 'attr' || step.name !== prefix[i]) return false;
    }
    return true;
  });
}

/** True if the value (or any sub-expression) references `var.<anything>`. */
export function referencesAnyVariable(value: HclValue | undefined): boolean {
  return traversalStartsWith(value, ['var']);
}

/** True if the value (or any sub-expression) references any resource type. */
export function referencesResource(value: HclValue | undefined, resourceType?: string): boolean {
  return anyValueMatches(value, (v) => {
    if (v.kind !== 'traversal') return false;
    // A resource traversal is `<type>.<name>.<attr>...` where type is not a
    // builtin namespace (var, local, data, module, path, terraform, each, count, self).
    const first = v.path[0];
    if (first.kind !== 'attr') return false;
    const RESERVED = new Set(['var', 'local', 'data', 'module', 'path', 'terraform', 'each', 'count', 'self']);
    if (RESERVED.has(first.name)) return false;
    if (resourceType && first.name !== resourceType) return false;
    return v.path.length >= 2;
  });
}

/** True if the value (or any sub-expression) is a call to one of `names`. */
export function callsAnyOf(value: HclValue | undefined, names: string[]): boolean {
  const set = new Set(names);
  return anyValueMatches(value, (v) => v.kind === 'call' && set.has(v.name));
}

/* -------------------------------------------------------------------------- */
/* Interpolation walking                                                      */
/* -------------------------------------------------------------------------- */

/** True if the string contains any `${...}` interpolation. */
export function hasInterpolation(value: HclValue | undefined): boolean {
  return !!(value && value.kind === 'string' && value.segments.some((s) => 'interp' in s));
}

/** True if any interpolation in the string mentions `prefix.something` (e.g., var.name). */
export function interpolationMentions(value: HclValue | undefined, needle: string): boolean {
  if (!value || value.kind !== 'string') return false;
  const re = new RegExp(`\\b${escapeRegex(needle)}\\b`);
  return value.segments.some((s) => 'interp' in s && re.test(s.interp));
}

/* -------------------------------------------------------------------------- */
/* Deep walking                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Visit a value and every sub-expression inside it (recursing into lists,
 * objects, function call args, and string interpolations). Returns true on
 * the first match.
 */
export function anyValueMatches(
  value: HclValue | undefined,
  predicate: (v: HclValue) => boolean,
): boolean {
  if (!value) return false;
  if (predicate(value)) return true;
  switch (value.kind) {
    case 'list':
      return value.items.some((it) => anyValueMatches(it, predicate));
    case 'object':
      return value.entries.some((e) => anyValueMatches(e.value, predicate));
    case 'call':
      return value.args.some((a) => anyValueMatches(a, predicate));
    case 'string':
      // We don't parse interpolations into expressions; we approximate by
      // pattern-matching the raw text in interpolationMentions / etc.
      return false;
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Utility                                                                    */
/* -------------------------------------------------------------------------- */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Get the first label of a block (e.g., resource type, variable name). */
export function blockLabel(b: HclBlock, idx = 0): string | undefined {
  return b.labels[idx];
}

/** True if any block in the AST is a resource of the given type. */
export function hasResourceOfType(ast: HclAst, type: string): boolean {
  return findResources(ast, type).length > 0;
}

// Re-exported for convenience to keep validators tidy.
export type { HclAst, HclAttribute, HclBlock, HclValue, StringSegment, TraversalStep };
