import { describe, expect, it } from 'vitest';
import { parseHcl } from './hcl';
import {
  ALL_EXERCISE_IDS,
  loadSolutionHcl,
  loadStarterHcl,
  extractFirstHclFence,
} from '../test-utils/load-solution';

function mustParse(text: string) {
  const r = parseHcl(text);
  if (!r.ok) throw new Error(`parse failed at ${r.line}:${r.col} — ${r.error}`);
  return r.ast;
}

describe('hcl parser — primitives', () => {
  it('parses an empty input', () => {
    const ast = mustParse('');
    expect(ast.blocks).toEqual([]);
  });

  it('parses comments (#, //, /* */)', () => {
    const ast = mustParse(`
      # leading hash
      // leading slashes
      /* a block
         comment */
      resource "x" "y" {} # trailing
    `);
    expect(ast.blocks).toHaveLength(1);
  });

  it('parses a basic resource block with labels', () => {
    const ast = mustParse(`
      resource "local_file" "hello" {
        filename = "hello.txt"
        content  = "Hello, Terraform!\\n"
      }
    `);
    expect(ast.blocks[0].type).toBe('resource');
    expect(ast.blocks[0].labels).toEqual(['local_file', 'hello']);
    expect(ast.blocks[0].body.attributes).toHaveLength(2);
    expect(ast.blocks[0].body.attributes[0].name).toBe('filename');
  });

  it('parses numbers, bools, null', () => {
    const ast = mustParse(`
      thing "x" {
        a = 42
        b = -3.5
        c = true
        d = false
        e = null
      }
    `);
    const attrs = ast.blocks[0].body.attributes;
    expect(attrs[0].value).toEqual({ kind: 'number', value: 42 });
    expect(attrs[1].value).toEqual({ kind: 'number', value: -3.5 });
    expect(attrs[2].value).toEqual({ kind: 'bool', value: true });
    expect(attrs[3].value).toEqual({ kind: 'bool', value: false });
    expect(attrs[4].value).toEqual({ kind: 'null' });
  });

  it('parses strings with escapes', () => {
    const ast = mustParse(`
      x "y" {
        s = "a\\nb\\tc"
        t = "\\"quoted\\""
      }
    `);
    const a0 = ast.blocks[0].body.attributes[0].value;
    expect(a0).toEqual({ kind: 'string', segments: [{ literal: 'a\nb\tc' }] });
    const a1 = ast.blocks[0].body.attributes[1].value;
    expect(a1).toEqual({ kind: 'string', segments: [{ literal: '"quoted"' }] });
  });

  it('parses a string with an interpolation', () => {
    const ast = mustParse(`
      r "x" "y" {
        s = "before-\${var.name}-after"
      }
    `);
    const v = ast.blocks[0].body.attributes[0].value;
    expect(v).toEqual({
      kind: 'string',
      segments: [{ literal: 'before-' }, { interp: 'var.name' }, { literal: '-after' }],
    });
  });

  it('parses a list literal', () => {
    const ast = mustParse(`
      r "x" "y" {
        nums = [1, 2, 3]
      }
    `);
    const v = ast.blocks[0].body.attributes[0].value;
    expect(v.kind).toBe('list');
    if (v.kind === 'list') {
      expect(v.items.map((i) => i.kind === 'number' && i.value)).toEqual([1, 2, 3]);
    }
  });

  it('parses an object literal with equals and colon entries', () => {
    const ast = mustParse(`
      r "x" "y" {
        m = { a = 1, "b" = 2, c : 3 }
      }
    `);
    const v = ast.blocks[0].body.attributes[0].value;
    expect(v.kind).toBe('object');
    if (v.kind === 'object') {
      expect(v.entries.map((e) => e.key)).toEqual(['a', 'b', 'c']);
    }
  });

  it('parses a traversal with dot and index', () => {
    const ast = mustParse(`
      r "x" "y" {
        a = random_pet.name.id
        b = local_file.numbered[0].filename
        c = local_file.numbered[*].filename
      }
    `);
    const attrs = ast.blocks[0].body.attributes;
    expect(attrs[0].value).toEqual({
      kind: 'traversal',
      path: [
        { kind: 'attr', name: 'random_pet' },
        { kind: 'attr', name: 'name' },
        { kind: 'attr', name: 'id' },
      ],
    });
    expect(attrs[1].value).toEqual({
      kind: 'traversal',
      path: [
        { kind: 'attr', name: 'local_file' },
        { kind: 'attr', name: 'numbered' },
        { kind: 'index', value: 0 },
        { kind: 'attr', name: 'filename' },
      ],
    });
    expect(attrs[2].value).toEqual({
      kind: 'traversal',
      path: [
        { kind: 'attr', name: 'local_file' },
        { kind: 'attr', name: 'numbered' },
        { kind: 'splat' },
        { kind: 'attr', name: 'filename' },
      ],
    });
  });

  it('parses a function call with mixed args', () => {
    const ast = mustParse(`
      r "x" "y" {
        c = upper(data.local_file.input.content)
        d = format("Hello, %s!", var.name)
        e = jsondecode(file("${"$"}{path.module}/config.json"))
      }
    `);
    const attrs = ast.blocks[0].body.attributes;
    expect(attrs[0].value).toEqual({
      kind: 'call',
      name: 'upper',
      args: [
        {
          kind: 'traversal',
          path: [
            { kind: 'attr', name: 'data' },
            { kind: 'attr', name: 'local_file' },
            { kind: 'attr', name: 'input' },
            { kind: 'attr', name: 'content' },
          ],
        },
      ],
    });
    expect(attrs[1].value.kind).toBe('call');
    if (attrs[1].value.kind === 'call') {
      expect(attrs[1].value.name).toBe('format');
    }
    expect(attrs[2].value.kind).toBe('call');
    if (attrs[2].value.kind === 'call') {
      expect(attrs[2].value.name).toBe('jsondecode');
    }
  });

  it('tolerates a for-expression as an opaque list', () => {
    const ast = mustParse(`
      output "files" {
        value = [for f in local_file.named : f.filename]
      }
    `);
    const v = ast.blocks[0].body.attributes[0].value;
    // Should be `unknown` (captured); not crash.
    expect(v.kind).toBe('unknown');
  });

  it('parses nested blocks (lifecycle inside resource)', () => {
    const ast = mustParse(`
      resource "local_file" "x" {
        filename = "f.txt"
        content  = "c"
        lifecycle {
          create_before_destroy = true
        }
      }
    `);
    const r = ast.blocks[0];
    expect(r.body.blocks).toHaveLength(1);
    expect(r.body.blocks[0].type).toBe('lifecycle');
    expect(r.body.blocks[0].body.attributes[0]).toEqual({
      name: 'create_before_destroy',
      value: { kind: 'bool', value: true },
    });
  });

  it('parses a heredoc as a string', () => {
    const ast = mustParse(`
      r "x" {
        body = <<EOF
line1
line2
EOF
      }
    `);
    const v = ast.blocks[0].body.attributes[0].value;
    expect(v.kind).toBe('string');
    if (v.kind === 'string') {
      expect(v.segments[0]).toEqual({ literal: 'line1\nline2\n' });
    }
  });

  it('returns a parse error with line/col on syntax mistakes', () => {
    const r = parseHcl(`resource "x"\n{\n  oops`);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.line).toBeGreaterThan(0);
      expect(r.error.length).toBeGreaterThan(0);
    }
  });
});

// Observation exercises' SOLUTION.md files are step-by-step walkthroughs
// of terraform CLI output and don't always include a canonical HCL block.
const OBSERVATION_IDS = new Set(['05', '06', '10']);

describe('hcl parser — every auto-validated SOLUTION.md parses', () => {
  for (const id of ALL_EXERCISE_IDS) {
    if (OBSERVATION_IDS.has(id)) continue;
    it(`exercise ${id}`, () => {
      const hcl = loadSolutionHcl(id);
      const r = parseHcl(hcl);
      if (!r.ok) {
        throw new Error(`Exercise ${id} SOLUTION.md HCL failed at ${r.line}:${r.col} — ${r.error}`);
      }
      expect(r.ast.blocks.length).toBeGreaterThan(0);
    });
  }
});

describe('hcl parser — every main.tf starter parses', () => {
  for (const id of ALL_EXERCISE_IDS) {
    it(`exercise ${id}`, () => {
      const hcl = loadStarterHcl(id);
      const r = parseHcl(hcl);
      if (!r.ok) {
        throw new Error(`Exercise ${id} starter main.tf failed at ${r.line}:${r.col} — ${r.error}`);
      }
    });
  }
});

describe('extractFirstHclFence', () => {
  it('finds the first ```hcl block', () => {
    const md = '# x\n\n```hcl\nresource "x" "y" {}\n```\n\n```bash\nls\n```';
    expect(extractFirstHclFence(md)).toBe('resource "x" "y" {}');
  });

  it('also accepts terraform and tf languages', () => {
    expect(extractFirstHclFence('```terraform\nr "x" {}\n```')).toBe('r "x" {}');
    expect(extractFirstHclFence('```tf\nr "x" {}\n```')).toBe('r "x" {}');
  });

  it('returns null if no fence', () => {
    expect(extractFirstHclFence('no code here')).toBeNull();
  });
});
