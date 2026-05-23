import { describe, expect, it } from 'vitest';
import { parseHcl } from '../../lib/hcl';
import { loadSolutionHcl } from '../../test-utils/load-solution';
import { validate } from './validate';

function check(hcl: string) {
  const r = parseHcl(hcl);
  if (!r.ok) throw new Error(`parse failed: ${r.error}`);
  return validate(r.ast);
}

describe('exercise 08 validator', () => {
  it('passes the canonical SOLUTION.md HCL', () => {
    expect(check(loadSolutionHcl('08')).kind).toBe('pass');
  });

  it('passes with only an upper() call', () => {
    expect(
      check(`
        variable "n" { type = string }
        locals {
          shouty = upper(var.n)
        }
      `).kind,
    ).toBe('pass');
  });

  it('passes with only a templatefile() call', () => {
    expect(
      check(`
        locals {
          rendered = templatefile("t.tftpl", { x = 1 })
        }
      `).kind,
    ).toBe('pass');
  });

  it('fails without a locals block', () => {
    expect(check(`resource "local_file" "f" { filename="x" content="y" }`).kind).toBe('fail');
  });

  it('fails when locals block is empty', () => {
    const r = check(`locals {}`);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/empty/i);
  });

  it('fails when no required function is used', () => {
    const r = check(`
      locals {
        x = 1
        y = "hello"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/upper|format|jsondecode|file|templatefile/i);
  });
});
