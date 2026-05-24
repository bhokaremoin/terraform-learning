import { describe, expect, it } from 'vitest';
import { parseHcl } from '../../lib/hcl';
import { loadSolutionHcl } from '../../test-utils/load-solution';
import { validate } from './validate';

function check(hcl: string) {
  const r = parseHcl(hcl);
  if (!r.ok) throw new Error(`parse failed: ${r.error}`);
  return validate(r.ast);
}

describe('exercise 01 validator', () => {
  it('passes the canonical SOLUTION.md HCL', () => {
    expect(check(loadSolutionHcl('01')).kind).toBe('pass');
  });

  it('accepts the simpler form without path.module prefix', () => {
    expect(
      check(`
        resource "local_file" "hello" {
          filename = "hello.txt"
          content  = "Hello, Terraform!"
        }
      `).kind,
    ).toBe('pass');
  });

  it('fails when no local_file resource exists', () => {
    expect(
      check(`
        terraform { required_version = ">= 1.5" }
      `).kind,
    ).toBe('fail');
  });

  it('fails when filename does not mention hello', () => {
    const r = check(`
      resource "local_file" "foo" {
        filename = "goodbye.txt"
        content  = "Hello, Terraform!"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/filename/i);
  });

  it('fails when content does not contain Hello', () => {
    const r = check(`
      resource "local_file" "hello" {
        filename = "hello.txt"
        content  = "Goodbye"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/content/i);
  });
});
