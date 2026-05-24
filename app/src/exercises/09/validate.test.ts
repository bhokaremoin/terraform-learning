import { describe, expect, it } from 'vitest';
import { parseHcl } from '../../lib/hcl';
import { loadSolutionHcl } from '../../test-utils/load-solution';
import { validate } from './validate';

function check(hcl: string) {
  const r = parseHcl(hcl);
  if (!r.ok) throw new Error(`parse failed: ${r.error}`);
  return validate(r.ast);
}

describe('exercise 09 validator', () => {
  it('passes the canonical SOLUTION.md HCL', () => {
    expect(check(loadSolutionHcl('09')).kind).toBe('pass');
  });

  it('fails when only one module is called', () => {
    expect(
      check(`
        module "world" {
          source = "./modules/greeting"
          name   = "World"
        }
      `).kind,
    ).toBe('fail');
  });

  it('fails when a module call is missing source', () => {
    const r = check(`
      module "world" {
        name = "World"
      }
      module "tf" {
        source = "./modules/greeting"
        name   = "Terraform"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/source/i);
  });

  it('fails when a module source does not look like the greeting module', () => {
    const r = check(`
      module "a" {
        source = "./modules/other"
        name   = "A"
      }
      module "b" {
        source = "./modules/other"
        name   = "B"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/greeting/i);
  });

  it('fails when name argument is missing', () => {
    const r = check(`
      module "a" {
        source = "./modules/greeting"
      }
      module "b" {
        source = "./modules/greeting"
        name   = "B"
      }
    `);
    expect(r.kind).toBe('fail');
    if (r.kind === 'fail') expect(r.message).toMatch(/name/i);
  });
});
