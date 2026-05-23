# app/ — interactive web tutorial

A Vite + React + TypeScript single-page app that wraps the static markdown tutorial in the parent directory. **No backend, no Terraform process, no Docker** — `make up` from the repo root is `npm install && npm run dev`.

This document is for **contributors**. If you're just trying to use the tutorial, see the top-level `README.md` and `00-START-HERE.md`.

## Run it locally

From the repo root:

```bash
make up         # install deps if needed and start the Vite dev server
make build      # produce app/dist/ (production bundle)
make preview    # build + serve dist/ on http://localhost:8080
make test       # run vitest
make lint       # tsc --noEmit
make clean      # rm -rf node_modules/, dist/, .vite/, coverage/
```

Or from inside `app/`:

```bash
npm install
npm run dev
npm test
npm run build
```

Prereq: Node.js 20+.

## Architecture in 30 seconds

```
exercise content (REPO ROOT)
  01-hello-world/README.md, main.tf, SOLUTION.md
  …
  10-state-commands/…
       │
       ▼  imported as raw strings via Vite glob
app/src/lib/content.ts  →  EXERCISES: readonly Exercise[]
       │
       ▼
src/components/ExerciseView.tsx
   ├─ MarkdownRenderer (renders README + hints + code highlight)
   ├─ Editor (CodeMirror 6, value persisted to localStorage)
   ├─ ValidationPanel  ─┐
   │                    │ uses
   ├─ ObservationChecklist
   └─ SolutionPanel (reveals SOLUTION.md, sets peeked flag)
                        │
                        ▼
                 src/lib/registry.ts
                 src/lib/hcl.ts  (handrolled parser)
                 src/lib/hcl-helpers.ts
                 src/exercises/NN/validate.ts | observation.ts
```

State (typed code, completion flags, peeked flags, current exercise) lives in browser `localStorage` under the `tf-learn:` prefix. The `useProgress` React hook subscribes to mutations from `lib/storage.ts` so every component stays in sync.

The Validate button parses your HCL in the browser with `lib/hcl.ts` and runs the per-exercise `validate.ts` function. **It never executes your code** — it only inspects the parse tree.

## How to add a new exercise

Four files. The content is markdown; the validation is a TypeScript function.

1. **Add the exercise directory at the repo root:**

   ```
   11-my-new-exercise/
     README.md       # Concept, Task, Run it, Predict, Hints, Pitfalls, Experiments
     main.tf         # Starter with # TODO comments
     SOLUTION.md     # Reference solution (with a ```hcl fenced block for the canonical answer)
   ```

   The exact pedagogy structure for `README.md` is documented in `00-START-HERE.md`. Match it.

2. **Decide: auto-validated or observation-only?**

3. **If auto-validated:** add `app/src/exercises/11/validate.ts`:

   ```ts
   import { fail, pass, type Validator } from '../../lib/validator-types';
   import { findResource, stringMatches } from '../../lib/hcl-helpers';

   export const validate: Validator = (ast) => {
     const r = findResource(ast, 'my_resource_type');
     if (!r) return fail('Expected a `my_resource_type` resource.');
     // … more structural checks …
     return pass('Looks good.');
   };
   ```

   Then `app/src/exercises/11/validate.test.ts`:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { parseHcl } from '../../lib/hcl';
   import { loadSolutionHcl } from '../../test-utils/load-solution';
   import { validate } from './validate';

   function check(hcl: string) {
     const r = parseHcl(hcl);
     if (!r.ok) throw new Error(r.error);
     return validate(r.ast);
   }

   describe('exercise 11 validator', () => {
     it('passes the canonical SOLUTION.md HCL', () => {
       expect(check(loadSolutionHcl('11')).kind).toBe('pass');
     });
     // 3–5 negative cases
   });
   ```

4. **If observation:** add `app/src/exercises/11/observation.ts`:

   ```ts
   import type { ObservationSpec } from '../../lib/validator-types';

   export const observation: ObservationSpec = {
     why: 'Why this exercise requires running terraform CLI locally...',
     checklist: [
       { label: 'I did the first thing.', hint: '...' },
       { label: 'I observed the expected output.' },
     ],
   };
   ```

5. **Register it in `app/src/lib/registry.ts`:**

   ```ts
   import { validate as validate11 } from '../exercises/11/validate';
   // or:
   // import { observation as observation11 } from '../exercises/11/observation';

   export const REGISTRY = {
     // ...existing entries...
     '11': { kind: 'auto', validate: validate11 },
   };
   ```

6. **Run tests:** `npm test`. The "every auto-validated SOLUTION.md parses" test will automatically include your new exercise.

That's it. The sidebar, home page, and progress bar pick up the new exercise from the glob.

## Validation philosophy

**Loose-by-design.** A validator should accept supersets and equivalent forms — anything that demonstrates the exercise's learning point. It should fail only when the exercise's core lesson is missing. Examples:

- `filename = "hello.txt"` and `filename = "${path.module}/hello.txt"` both pass exercise 01.
- Different identifier names are fine (`local_file.hello` vs `local_file.greeting`).
- Extra resources the learner added for exploration are fine.

Validators should produce **actionable failure messages**: name the specific attribute or block that's missing, and include an example in the `hint`.

## HCL parser — what it handles

`lib/hcl.ts` is a handrolled HCL2 subset parser (~580 lines). It handles:

- Comments (`#`, `//`, `/* */`)
- Identifiers, numbers, booleans, null
- Strings with `${...}` interpolations (captured as opaque text segments for inspection)
- Heredocs (`<<EOF`, `<<-EOF`)
- Lists, objects (both `=` and `:` entry separators)
- Traversals: `a.b.c`, `a[0]`, `a[*]`
- Function calls
- Nested blocks

It does **not** handle (captures as `{ kind: 'unknown', text }`):

- For-expressions (`[for x in y : ...]`)
- Conditional/arithmetic/comparison operators

For the exercises we ship, this subset is enough. If a future exercise needs more, extend the parser and add tests against the new construct.

## Running just one exercise's tests

```bash
npm test -- src/exercises/01/
```

Vitest auto-detects path filters.

## Bundle size

The production build is ~1.1MB minified / ~350KB gzipped. Roughly:
- CodeMirror 6 (~150KB gzipped)
- react-markdown + remark-gfm + rehype-highlight + highlight.js commons (~90KB gzipped)
- React + react-router-dom (~50KB gzipped)
- Our app code + exercise content (~50KB gzipped)

A future optimization: replace rehype-highlight's default `lowlight.createLowlight()` with a curated instance to drop ~150KB. Not blocking; modern broadband delivers this in well under a second.
