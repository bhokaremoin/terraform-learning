import { describe, expect, it } from 'vitest';
import { parseHcl } from '../../lib/hcl';
import { loadSolutionHcl } from '../../test-utils/load-solution';
import { validate } from './validate';

function check(hcl: string) {
  const r = parseHcl(hcl);
  if (!r.ok) throw new Error(`parse failed: ${r.error}`);
  return validate(r.ast);
}

describe('exercise 04 validator', () => {
  it('passes the canonical SOLUTION.md HCL', () => {
    expect(check(loadSolutionHcl('04')).kind).toBe('pass');
  });

  it('passes a direct (non-call) reference', () => {
    expect(
      check(`
        data "local_file" "i" { filename = "in.txt" }
        resource "local_file" "o" {
          filename = "out.txt"
          content  = data.local_file.i.content
        }
      `).kind,
    ).toBe('pass');
  });

  it('fails when the data block is missing', () => {
    expect(
      check(`
        resource "local_file" "o" {
          filename = "out.txt"
          content  = "hi"
        }
      `).kind,
    ).toBe('fail');
  });

  it('fails when content does not reference the data source', () => {
    const r = check(`
      data "local_file" "i" { filename = "in.txt" }
      resource "local_file" "o" {
        filename = "out.txt"
        content  = "hi"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/data/i);
  });
});
