import { describe, expect, it } from 'vitest';
import { parseHcl } from '../../lib/hcl';
import { loadSolutionHcl } from '../../test-utils/load-solution';
import { validate } from './validate';

function check(hcl: string) {
  const r = parseHcl(hcl);
  if (!r.ok) throw new Error(`parse failed: ${r.error}`);
  return validate(r.ast);
}

describe('exercise 03 validator', () => {
  it('passes the canonical SOLUTION.md HCL', () => {
    expect(check(loadSolutionHcl('03')).kind).toBe('pass');
  });

  it('fails when random_pet is missing', () => {
    expect(
      check(`
        resource "local_file" "f" {
          filename = "f.txt"
          content  = "hello"
        }
      `).kind,
    ).toBe('fail');
  });

  it('fails when local_file does not reference the pet', () => {
    const r = check(`
      resource "random_pet" "name" { length = 2 }
      resource "local_file" "f" {
        filename = "f.txt"
        content  = "hello"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/random_pet/i);
  });

  it('accepts the reference in either filename or content', () => {
    expect(
      check(`
        resource "random_pet" "p" { length = 2 }
        resource "local_file" "f" {
          filename = "f.txt"
          content  = "Hi \${random_pet.p.id}"
        }
      `).kind,
    ).toBe('pass');
  });
});
