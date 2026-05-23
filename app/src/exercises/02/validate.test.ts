import { describe, expect, it } from 'vitest';
import { parseHcl } from '../../lib/hcl';
import { loadSolutionHcl } from '../../test-utils/load-solution';
import { validate } from './validate';

function check(hcl: string) {
  const r = parseHcl(hcl);
  if (!r.ok) throw new Error(`parse failed: ${r.error}`);
  return validate(r.ast);
}

describe('exercise 02 validator', () => {
  it('passes the canonical SOLUTION.md HCL', () => {
    expect(check(loadSolutionHcl('02')).kind).toBe('pass');
  });

  it('fails when only one variable is declared', () => {
    const r = check(`
      variable "name" { type = string }
      resource "local_file" "greeting" {
        filename = "greeting.txt"
        content  = "Hello, \${var.name}!"
      }
      output "p" { value = local_file.greeting.filename }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/variable/i);
  });

  it('fails when content does not reference any variable', () => {
    const r = check(`
      variable "a" { type = string }
      variable "b" { type = string }
      resource "local_file" "g" {
        filename = "g.txt"
        content  = "Hello"
      }
      output "p" { value = local_file.g.filename }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/var\./i);
  });

  it('fails when no output is declared', () => {
    const r = check(`
      variable "a" { type = string }
      variable "b" { type = string }
      resource "local_file" "g" {
        filename = "g.txt"
        content  = "Hello, \${var.a}!"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/output/i);
  });
});
