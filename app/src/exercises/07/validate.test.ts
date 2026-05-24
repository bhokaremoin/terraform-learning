import { describe, expect, it } from 'vitest';
import { parseHcl } from '../../lib/hcl';
import { loadSolutionHcl } from '../../test-utils/load-solution';
import { validate } from './validate';

function check(hcl: string) {
  const r = parseHcl(hcl);
  if (!r.ok) throw new Error(`parse failed: ${r.error}`);
  return validate(r.ast);
}

describe('exercise 07 validator', () => {
  it('passes the canonical SOLUTION.md HCL', () => {
    expect(check(loadSolutionHcl('07')).kind).toBe('pass');
  });

  it('passes the count variant alone', () => {
    expect(
      check(`
        resource "local_file" "numbered" {
          count    = 3
          filename = "f-\${count.index}.txt"
          content  = "n=\${count.index}"
        }
      `).kind,
    ).toBe('pass');
  });

  it('passes the for_each variant alone', () => {
    expect(
      check(`
        variable "fruits" { type = map(string) }
        resource "local_file" "named" {
          for_each = var.fruits
          filename = "\${each.key}.txt"
          content  = "\${each.key}=\${each.value}"
        }
      `).kind,
    ).toBe('pass');
  });

  it('fails when neither count nor for_each is used', () => {
    const r = check(`
      resource "local_file" "single" {
        filename = "f.txt"
        content  = "hi"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/count.*for_each/i);
  });
});
