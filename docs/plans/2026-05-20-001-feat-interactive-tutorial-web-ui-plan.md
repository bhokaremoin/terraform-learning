---
title: "feat: Interactive Web UI for Terraform Tutorial"
type: feat
status: active
date: 2026-05-20
origin: docs/brainstorms/2026-05-20-interactive-terraform-tutorial-web-requirements.md
---

# feat: Interactive Web UI for Terraform Tutorial

## Overview

Add a Dockerized single-page web application to the existing `terraform-learning` repo that wraps the 10 markdown-authored exercises into an interactive lesson experience. Users `git clone … && make up` (Docker is the sole prerequisite), open the browser, and work through exercises with: an in-browser code editor pre-populated with each exercise's starter `main.tf`, a per-exercise "Validate" button that parses their HCL structurally and gives instant pass/fail feedback, a "Show solution" reveal, and per-browser persistence of typed code and completion progress across sessions.

The existing markdown files (`README.md`, `main.tf`, `SOLUTION.md` inside each exercise directory) remain the single source of truth for content. The static tutorial continues to work unchanged for users who skip the web UI.

## Problem Statement / Motivation

The static repo (already shipped) works, but the learner experience has three frictions that the web UI removes:

1. **No automated feedback.** Today, learners hand-check their HCL against `SOLUTION.md`. It's easy to miss subtle differences and not notice — a poor signal for early learners.
2. **No memory across sessions.** Close the laptop, open it tomorrow, lose your place and have to re-orient.
3. **Up-front Terraform install ask** for users who just want to start the first auto-validated exercises. The web app validates 7/10 exercises without invoking Terraform at all (structural HCL inspection in-browser), so a learner can do most of the tutorial before deciding to install Terraform.

The brainstorm (origin doc, 2026-05-20) settled the major product trade-offs: structural in-browser validation, Docker-only bootstrap, all 10 exercises with a mixed auto-validate / observation-self-attest model. This plan addresses HOW to build that.

## Proposed Solution

A static SPA (Vite + React 18 + TypeScript) shipped inside an `nginx:alpine` Docker image. The container serves prebuilt assets — no runtime backend. The browser holds all state in `localStorage`.

Content (the existing per-exercise markdown and starter HCL) is imported at build time via Vite's `import.meta.glob(..., { as: 'raw', eager: true })` and rendered via `react-markdown`. Adding a new exercise to the repo means adding the standard 3 files in a new `NN-name/` directory plus a single `app/src/exercises/NN/validate.ts` (or `observation.ts`) — no other code changes.

Structural validation uses a small, handrolled HCL2-subset parser in TypeScript (~500 lines) that produces a JSON-like AST. Per-exercise validator functions consume that AST and assert the structural intent of the solution — loosely, not strictly. Loose means "the user's HCL has the right SHAPE" (e.g., a `local_file` resource with a `filename` argument whose literal value contains 'hello'), accepting reasonable variations like `${path.module}/hello.txt` vs `hello.txt`.

The 3 observation exercises (05 drift, 06 replacement, 10 state) display a checklist of expected observations and a "Mark complete" button. The UI labels them clearly as observation exercises and points the learner at the local CLI commands to run.

A global "Reset all progress" button in the header clears all `localStorage` keys with a confirmation modal.

## Technical Considerations

### Library and framework picks

| Concern | Pick | Rationale |
|---|---|---|
| Frontend framework | **React 18 + Vite + TypeScript** | Most familiar to contributors; Vite gives fast HMR and a tiny prod build; `import.meta.glob` is ideal for the build-time content pipeline. |
| Routing | **`react-router-dom` v7** | Standard. Per-exercise routes (`/exercise/01`) make deep links and history work for free. |
| Markdown rendering | **`react-markdown` + `remark-gfm` + `rehype-highlight`** | Renders the existing markdown faithfully, including `<details>` tags for hints. GFM gets tables. `rehype-highlight` styles fenced HCL blocks. |
| Code editor | **CodeMirror 6** with `@codemirror/basic-setup`-style composition; HCL syntax via a custom simple highlighter (or community `lezer-hcl` if usable) | Lighter than Monaco (~150KB vs ~3MB); composable; sufficient editor feel. Monaco would be overkill for tutorial-length snippets. |
| HCL parser | **Handwritten subset parser in TS** (`app/src/lib/hcl.ts`) | The HCL surface we need is small (blocks, attrs, primitive literals, references, function calls, interpolations). A ~500-line tolerant parser gives a tighter bundle, learner-tailored error messages, and zero WASM tooling. **Fallback:** if drift becomes painful, swap in `@cdktf/hcl2json` via `vite-plugin-wasm` (decision deferred to Phase 3 spike). |
| Persistence | **`localStorage`** | Forced by "no backend." Capacity is more than enough (10 exercises × <10KB code each ≪ 5MB cap). |
| Container runtime | ~~`nginx:alpine` with prebuilt SPA from `node:20-alpine`~~ **Dropped during Phase 1**: switched to a Node-direct boot (`make up` runs `npm install && npm run dev`). Reason: Docker added real friction (daemon dependency, build-context wiring bug on the `[0-9][0-9]-*/` COPY) for a tutorial repo where Node is already a more natural single-tool ask. A future hosted-version path (e.g., GitHub Pages serving `app/dist/`) doesn't need Docker either. |
| Test runner | **Vitest** | Vite-native; same config as the app; fast. |

### File layout (additive, the existing repo is untouched)

```
terraform-learning/
├── 00-START-HERE.md                          (existing — unchanged)
├── 01-hello-world/ … 10-state-commands/      (existing — unchanged)
├── README.md                                 (UPDATED: add "Web UI" section)
├── CHEATSHEET.md / GENERATION.md / LICENSE   (existing — unchanged)
├── .gitignore                                (UPDATED: ignore app/node_modules, app/dist)
├── Makefile                                  (NEW)
├── docker-compose.yml                        (NEW — at repo root)
└── app/                                      (NEW — SPA source)
    ├── README.md                             (contributor guide: "how to add an exercise")
    ├── Dockerfile                            (multi-stage: node-builder → nginx-runtime)
    ├── nginx.conf                            (SPA fallback)
    ├── package.json
    ├── package-lock.json                     (committed)
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vitest.config.ts                      (or merged into vite.config.ts)
    ├── index.html
    ├── public/favicon.svg
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── router.tsx
        ├── styles.css
        ├── types.ts
        ├── components/
        │   ├── Sidebar.tsx
        │   ├── ExerciseLayout.tsx
        │   ├── MarkdownRenderer.tsx
        │   ├── Editor.tsx
        │   ├── ValidationPanel.tsx
        │   ├── ObservationChecklist.tsx
        │   ├── SolutionPanel.tsx
        │   ├── ProgressBar.tsx
        │   ├── ResetButton.tsx
        │   └── ConfirmModal.tsx
        ├── lib/
        │   ├── content.ts                    # vite glob imports of ../../*/README.md, main.tf, SOLUTION.md
        │   ├── content.test.ts
        │   ├── hcl.ts                        # handwritten HCL subset parser
        │   ├── hcl.test.ts
        │   ├── hcl-helpers.ts                # walk AST: getResources, getStringAttr, etc.
        │   ├── validator-types.ts            # Validator, ValidationResult
        │   ├── storage.ts                    # localStorage abstraction
        │   ├── storage.test.ts
        │   └── registry.ts                   # exercise id → meta + validator
        └── exercises/
            ├── 01/validate.ts                # + validate.test.ts
            ├── 02/validate.ts                # + validate.test.ts
            ├── 03/validate.ts                # + validate.test.ts
            ├── 04/validate.ts                # + validate.test.ts
            ├── 05/observation.ts             # checklist data only
            ├── 06/observation.ts
            ├── 07/validate.ts                # + validate.test.ts
            ├── 08/validate.ts                # + validate.test.ts
            ├── 09/validate.ts                # + validate.test.ts
            └── 10/observation.ts
```

### Build / run flow

```
make up       →  npm install (first run only) && npm run dev → opens http://localhost:5173
make build    →  npm install && npm run build → emits app/dist/
make preview  →  npm install && npm run build && npm run preview → serves dist/ for smoke check
make test     →  vitest run
make lint     →  tsc --noEmit
make clean    →  rm -rf app/node_modules app/dist app/.vite app/coverage
```

No Docker, no daemons. Learner progress lives in browser localStorage. Future hosted-version path: run `make build` and publish `app/dist/` (e.g., to GitHub Pages on a tag).

### Validator authoring contract

The contract any new exercise must satisfy:

```ts
// app/src/lib/validator-types.ts
export type ValidationResult =
  | { kind: 'pass'; note?: string }
  | { kind: 'fail'; message: string; hint?: string };

export const pass = (note?: string): ValidationResult => ({ kind: 'pass', note });
export const fail = (message: string, hint?: string): ValidationResult => ({ kind: 'fail', message, hint });

export type HclAst = /* output of parseHcl(text) */;
export type Validator = (ast: HclAst) => ValidationResult;
```

```ts
// app/src/exercises/01/validate.ts (canonical example)
import { Validator, pass, fail } from '../../lib/validator-types';
import { findResource, getStringAttr } from '../../lib/hcl-helpers';

export const validate: Validator = (ast) => {
  const file = findResource(ast, 'local_file');
  if (!file) {
    return fail(
      'No `resource "local_file" "..."` block found.',
      'Exercise 1 needs one local_file resource. See the README "Concept" section.'
    );
  }
  const filename = getStringAttr(file, 'filename');
  if (!filename || !/hello/i.test(filename)) {
    return fail(
      'The local_file resource needs a `filename` argument that points at hello.txt.',
      'Try `filename = "hello.txt"` or `filename = "${path.module}/hello.txt"`.'
    );
  }
  const content = getStringAttr(file, 'content');
  if (!content || !/hello/i.test(content)) {
    return fail(
      'The `content` argument should contain a greeting (something with "Hello").',
      'Example: `content = "Hello, Terraform!\\n"`.'
    );
  }
  return pass();
};
```

Validation philosophy is **loose**: check structural intent, accept variation. A validator should accept supersets (extra resources the user added for exploration), variation in identifiers, and equivalent forms (`hello.txt` vs `${path.module}/hello.txt`). It should reject only configurations that miss the exercise's actual learning point.

Each validator has a `*.test.ts` peer that:

- Loads the canonical solution from `SOLUTION.md`'s HCL fenced code block.
- Asserts `validate(parseHcl(solution)).kind === 'pass'`.
- Asserts a series of negative cases (empty HCL, wrong resource type, missing attribute) all return `kind: 'fail'` with the expected message.

This pins validators against the documented solutions — drifting either side breaks the test.

### Observation exercise contract

```ts
// app/src/exercises/05/observation.ts
export const observation = {
  kind: 'observation' as const,
  why: 'This exercise teaches drift detection — the learning happens when YOU run terraform plan after hand-editing the file. The web app can\'t do that for you.',
  checklist: [
    'I ran `terraform apply` and saw the file created.',
    'I hand-edited managed.txt with a different content.',
    'I ran `terraform plan` and saw the "Objects have changed outside of Terraform" notice.',
    'I ran `terraform apply` and watched the file restored to match my code.',
    'I deleted the file with `rm managed.txt`, then ran `terraform plan` and saw it propose to CREATE (not update).',
  ],
};
```

`ObservationChecklist.tsx` renders the items as checkboxes. The "Mark complete" button is enabled only once every checkbox is ticked. The `why` is rendered above the list as the rationale for self-attest.

### Storage schema

```ts
// app/src/lib/storage.ts
// All keys prefixed `tf-learn:` so reset can do a single scan.

// tf-learn:progress  →  { completed: Record<string, true>, peeked: Record<string, true>, current: string }
// tf-learn:code:01   →  string (user's current HCL for exercise 01)
// tf-learn:code:02   →  string
// ...

export const STORAGE_PREFIX = 'tf-learn:';
export function getCode(id: string): string | null { … }
export function setCode(id: string, code: string): void { … }
export function getProgress(): Progress { … }
export function markCompleted(id: string): void { … }
export function markPeeked(id: string): void { … }
export function setCurrent(id: string): void { … }
export function resetAll(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}
```

Per-exercise reset (separate from global reset): a small "Reset code" link in the editor toolbar that just calls `setCode(id, starter)` for that one exercise. Doesn't affect completion flags.

## System-Wide Impact

### Interaction graph

```
User clicks "Validate"
  → Editor.tsx onValidateClick
    → registry.getValidator(exerciseId)
      → lazy-loads exercises/0N/validate.ts (code-split)
    → hcl.parseHcl(editorContents)
      → if parse error: ValidationPanel renders syntax error with line/col
    → validate(ast)
      → ValidationPanel renders pass/fail with message + hint
    → if pass: storage.markCompleted(id) → Sidebar re-renders with checkmark, ProgressBar updates
```

```
User edits code
  → Editor.tsx onChange (debounced 250ms)
    → storage.setCode(id, value)
```

```
User clicks "Show solution"
  → SolutionPanel mounts, fetches SOLUTION.md content from the build-time registry
    → renders markdown
    → storage.markPeeked(id)
```

```
User clicks "Reset all progress"
  → ConfirmModal opens
    → on confirm: storage.resetAll()
      → all UI re-reads from storage; everything appears as fresh
```

### Error & failure propagation

- **HCL parse error.** Parser throws `HclParseError(line, col, msg)`. Caught in `Editor.tsx`'s validate handler; rendered as a fail result with the literal parser message. Never bubbles to a crashed page.
- **Validator throws unexpectedly.** Wrap each validator call in `try/catch`; on throw, render a generic "Validator crashed — please file a bug" message with the validator's name. Logged to console with stack.
- **localStorage quota exceeded** (extreme edge — would need ~5MB of typed code). `setCode` swallows the QuotaExceededError, shows a non-blocking toast "Storage full — can't save. Try resetting progress." UI still functional.
- **localStorage disabled** (private mode in some browsers). On startup, attempt a write+read of a test key. If it fails, show a persistent banner "Progress can't be saved in this browser session — try a regular window." App continues to function in-memory only.
- **Markdown parse error** (malformed exercise README). Caught at the build-time `import.meta.glob` step — surfaces as a build error, never reaches production.

### State lifecycle risks

- **Stale starter on first load.** If we ship a new starter `main.tf` in v1.1 but a returning user already has stored code for that exercise, they keep their old code (correct behavior — don't clobber the learner). A "Reset this exercise's code" affordance lets them opt in to the new starter.
- **Validator drift from SOLUTION.md.** The per-exercise unit test loads the SOLUTION.md HCL block and asserts the validator passes it. If the doc is edited and the validator isn't, the test fails on CI. Pinning invariant.
- **Schema migration.** No formal schema migration story — localStorage is best-effort. If we change the storage shape in a future version, write a small backward-read shim (`if (!progress.peeked) progress.peeked = {}`).

### API surface parity

Not applicable — there's no other interface exposing similar functionality. The web UI is additive; the static markdown tutorial in the same repo is the only "alternative interface" and shares the source-of-truth markdown.

### Integration test scenarios

These are scenarios a contributor (or CI) should manually walk through end-to-end before shipping:

1. **Cold start.** Fresh checkout → `make up` → reach `http://localhost:8080` → exercise 01 loads with the starter `main.tf`'s content in the editor. The editor's initial value equals the disk-side starter.
2. **Validate happy path.** On exercise 01, paste the canonical solution → click Validate → green pass → sidebar shows checkmark on 01 → reload page → checkmark persists.
3. **Validate failure path.** On exercise 02, leave required variable `name` undeclared → click Validate → fail message specifically names the missing variable, not just "wrong."
4. **Persist across restart.** Type code in exercise 03 → close browser → `docker compose down` → `make up` → reopen → exercise 03's editor still has the typed code.
5. **Reset.** Complete a few exercises, then click "Reset all progress" → confirm → all completion flags, peeked flags, and typed code gone. The sidebar shows the fresh state.
6. **Observation exercise.** Navigate to exercise 05 → see the observation banner + checklist → "Mark complete" is disabled → tick all boxes → button enables → click → sidebar shows checkmark on 05.
7. **Solution reveal.** On any exercise, click "Show solution" → SOLUTION.md renders → reload → exercise still shows "peeked" badge but is still validatable/completable.

## Implementation Phases

### Phase 0 — Scaffold (foundation, ~1 day)

**Deliverables**
- `app/` initialized via `npm create vite@latest -- --template react-ts` and committed.
- Dependencies installed: `react-router-dom`, `react-markdown`, `remark-gfm`, `rehype-highlight`, `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/lang-...` (basic), `codemirror`, `vitest`.
- `app/Dockerfile` (multi-stage: `node:20-alpine` builder → `nginx:1.25-alpine` runtime, copy `dist/` to `/usr/share/nginx/html`).
- `app/nginx.conf` with SPA fallback (`try_files $uri /index.html`).
- `docker-compose.yml` at repo root: one service `web`, port `8080:80`, builds from `./app`.
- `Makefile` at repo root: `up`, `down`, `build`, `dev`, `logs`, `clean`, `test`, `help`.
- Root `README.md` gets a new "## Run the web tutorial" section with the Docker prerequisite and the `make up` command.
- Root `.gitignore` adds `app/node_modules/`, `app/dist/`.

**Success criteria**
- `make up` builds the image and serves the default Vite scaffold at `http://localhost:8080`.

### Phase 1 — Content loading + routing + shell UI (~1 day)

**Deliverables**
- `app/src/lib/content.ts` using:
  ```ts
  const readmes = import.meta.glob('../../../*/README.md', { as: 'raw', eager: true });
  const starters = import.meta.glob('../../../*/main.tf', { as: 'raw', eager: true });
  const solutions = import.meta.glob('../../../*/SOLUTION.md', { as: 'raw', eager: true });
  ```
  Maps each by exercise id (extracted from path: `01-hello-world` → `01`).
- `app/src/types.ts` with `Exercise`, `ExerciseMeta`, `Progress`, `ValidationResult`.
- `app/src/router.tsx` with routes: `/`, `/exercise/:id`, `*` (NotFound).
- `Sidebar.tsx` lists all 10 exercises, marks current, shows badge per state (todo / completed / peeked / observation).
- `ExerciseLayout.tsx` (the per-route shell): left = sidebar, center = README (markdown), right = editor + validation panel (or observation checklist + mark-complete).
- `MarkdownRenderer.tsx` wraps `react-markdown` + `remark-gfm` + `rehype-highlight`. `<details>` tags work out of the box.
- Home page (`/`) lists exercises with brief one-liners pulled from each README's heading.

**Success criteria**
- All 10 exercise routes render their README correctly (hints collapsible, code highlighted).
- Sidebar nav works.

### Phase 2 — Editor + persistence (~1 day)

**Deliverables**
- `app/src/components/Editor.tsx` wrapping CodeMirror 6 with: line numbers, line wrapping, monospace, syntax highlighting (HCL via simple `lezer`-based highlighter or community grammar — falls back to plain monospace if unavailable).
- Initial value: `storage.getCode(id) ?? starter[id]`.
- `onChange` (debounced 250ms) calls `storage.setCode(id, value)`.
- "Reset code to starter" link in the editor toolbar (does NOT clear completion flags; just resets the editor contents).
- `app/src/lib/storage.ts` and tests.
- Visiting an exercise route calls `storage.setCurrent(id)`.

**Success criteria**
- Typing in the editor persists. Reloading the page shows the typed code, not the starter.
- Clicking "Reset code to starter" puts the starter back, but the exercise's completion flag (if any) is unaffected.

### Phase 3 — HCL parser + AST helpers (~2 days)

**Deliverables**
- `app/src/lib/hcl.ts`: handwritten lexer + parser for the HCL2 subset. Tokens: `IDENT`, `STRING`, `NUMBER`, `BOOL`, `LBRACE`/`RBRACE`, `LBRACKET`/`RBRACKET`, `EQ`, `LPAREN`/`RPAREN`, `COMMA`, `DOT`, `NEWLINE`, comments (skipped), heredoc, interpolation `${...}`. Output: `HclAst = { blocks: Block[] }` where `Block = { type: string; labels: string[]; body: { attributes: Attr[]; blocks: Block[] } }` and `Attr = { name: string; value: HclValue }`. `HclValue` = literal | traversal | function-call | object | list | template-string.
- `app/src/lib/hcl-helpers.ts` with composable helpers:
  - `findBlocks(ast, type): Block[]`
  - `findResource(ast, type, name?): Block | undefined`
  - `findVariable(ast, name?): Block | undefined`
  - `findOutput(ast, name?): Block | undefined`
  - `findModuleCalls(ast): Block[]`
  - `getStringAttr(block, name): string | undefined` — returns the string literal value, treating templates as best-effort (returns interior text when only one `${var.x}` exists, etc., depending on assertion needs).
  - `getReference(block, name): Traversal | undefined` — for "the content uses var.X".
  - `getFunctionCall(block, name): FunctionCall | undefined`.
- `app/src/lib/hcl.test.ts` — comprehensive tests using HCL snippets from the existing SOLUTION.md files. Edge cases: comments, mixed whitespace, multi-line strings, nested blocks (lifecycle), heredocs.
- **Spike decision point.** If the handwritten parser is taking >2 days, abandon and substitute `@cdktf/hcl2json` via `vite-plugin-wasm` + `vite-plugin-top-level-await`. The validator API is parser-agnostic; only `hcl.ts` and `hcl-helpers.ts` are affected.

**Success criteria**
- Every SOLUTION.md HCL block in all 10 exercises parses cleanly.
- A 50+ case test suite covers the relevant constructs.
- Bundle size impact <30KB gzipped.

### Phase 4 — Validators for 7 auto-validated exercises (~2 days)

**Deliverables**
- `app/src/exercises/01/validate.ts` … plus `validate.test.ts` for each of: 01, 02, 03, 04, 07, 08, 09.
- Each validator: ~15–40 lines. Loose assertions per the validation philosophy.
- Each `*.test.ts`: loads the SOLUTION.md HCL block via a `loadSolutionHcl(id)` helper (extracts the first ```hcl fence), asserts `validate(parseHcl(s)).kind === 'pass'`; runs 3–5 negative cases.
- `ValidationPanel.tsx`: shows the result with green/red styling, message, optional hint, and a "What does pass mean?" tooltip linking to the validation philosophy.
- `app/src/lib/registry.ts` maps each exercise id to `{ kind: 'auto', validator } | { kind: 'observation', checklist }`.

**Per-exercise validator sketch**

| ID | Loose assertions |
|---|---|
| 01 hello-world | `local_file` resource exists; `filename` contains "hello"; `content` contains "Hello" |
| 02 variables-outputs | At least 2 variables declared; one references `var.name` (or any var) inside a string template; at least one `output` references a resource |
| 03 multi-resources | `random_pet` resource exists; `local_file.filename` or `.content` references `random_pet.<n>.id` |
| 04 data sources | `data "local_file"` block exists; some `local_file` resource references `data.local_file.<n>.content` (possibly inside `upper()`) |
| 07 count/for_each | Either a `count = …` integer attribute on a `local_file` block, OR a `for_each = var.…` on a `local_file` block (accept either part of the exercise) |
| 08 locals/functions | `locals` block exists; at least one local uses one of `upper`, `format`, `jsondecode`, `templatefile`, or `file` |
| 09 modules | At least 2 `module "..."` calls with `source` matching `./modules/greeting`; each passes `name = …` |

**Success criteria**
- All 7 validators pass their canonical solutions and fail their negative cases.
- A user can write a slightly different but equivalent solution (e.g., `filename = "hello.txt"` vs `filename = "${path.module}/hello.txt"`) and still pass.

### Phase 5 — Observation flow for 05, 06, 10 (~0.5 day)

**Deliverables**
- `app/src/exercises/05/observation.ts`, `06/observation.ts`, `10/observation.ts` — exporting a `{ kind: 'observation', why, checklist }`.
- `ObservationChecklist.tsx` renders the `why` and the checkboxes, with a "Mark complete" button enabled only when all are ticked. On click, `storage.markCompleted(id)`.
- The `ExerciseLayout` reads `registry[id].kind` and renders either `Editor + ValidationPanel` or `ObservationChecklist`.

**Success criteria**
- 05, 06, 10 show the observation flow.
- "Mark complete" persists across reloads.

### Phase 6 — Solution reveal + reset + progress + small polish (~0.5 day)

**Deliverables**
- `SolutionPanel.tsx` collapsed by default; "Show solution" button expands it and calls `storage.markPeeked(id)`.
- `ResetButton.tsx` opens `ConfirmModal` with text "This will erase your typed code and completion progress for all exercises. Continue?" → confirm calls `storage.resetAll()` → all components re-read state.
- `ProgressBar.tsx` in the header: `X / 10 complete`.
- Header layout: logo/title, progress, reset button.
- Keyboard shortcuts: `← / →` to nav prev/next exercise. (Cheap; consider deferring if time-pressed.)
- Empty state (`/`) lists exercises with one-liners.

**Success criteria**
- Reset flow works end-to-end with confirmation.
- Progress bar reflects completed count.

### Phase 7 — Docs + contributor guide + final smoke (~0.5 day)

**Deliverables**
- `app/README.md` documents: dev workflow (`npm run dev`), test (`npm test`), build, and the "how to add a new exercise in 4 files" guide.
- Root `README.md` updated with: a "Run the interactive web tutorial" section linking to `make up`, a screenshot (optional), and a note that the static markdown tutorial still works.
- `GENERATION.md` updated with a "v2: web app" addendum.
- Manual smoke test against the 7 integration test scenarios listed above on a clean machine (or a fresh Docker volume).
- Commit, push, tag a release.

**Success criteria**
- Cold-clone test on a clean machine: `git clone`, `make up`, opens browser, exercise 01 works end-to-end.

## Acceptance Criteria

### Functional (mapped to origin doc requirements)

- [ ] **R1** `make up` succeeds with only Docker installed; no Node, Terraform, or other tools needed.
- [ ] **R2** Browser opens to `http://localhost:8080`; README documents the URL.
- [ ] **R3** All 10 exercises render in order; sidebar shows completion state; prev/next nav works.
- [ ] **R4** Each exercise's prose comes from the existing `NN/README.md` (not duplicated in TS/JSX).
- [ ] **R5** Each exercise's editor pre-populates with the existing `NN/main.tf` starter; edits persist.
- [ ] **R6** Exercises 01, 02, 03, 04, 07, 08, 09 have working auto-validation with pass/fail messaging.
- [ ] **R7** Exercises 05, 06, 10 show an observation banner + checklist + "Mark complete" button.
- [ ] **R8** "Show solution" reveals `NN/SOLUTION.md`; sets a "peeked" badge; does not block completion.
- [ ] **R9** Typed code persists across browser close + Docker restart.
- [ ] **R10** `current` exercise + completion flags persist across sessions.
- [ ] **R11** "Reset all progress" confirms then clears all `tf-learn:*` localStorage keys.
- [ ] **R12** The 30 existing exercise files are unchanged; the web app reads them as the canonical source.
- [ ] **R13** A user who ignores the web app and reads the markdown directly has the same experience as before.

### Non-functional

- [ ] Cold start under 60s after Docker image is built (excluding first-time image pull/build).
- [ ] Validate click → pass/fail rendered in under 1 second for a correctly-written solution.
- [ ] Final Docker image under 25MB (nginx + static assets).
- [ ] First contentful paint under 2s on a modern laptop.

### Quality gates

- [ ] All 7 validator test files pass against their respective SOLUTION.md HCL.
- [ ] Parser test suite covers every HCL construct used across all 10 SOLUTION.md files.
- [ ] Manual run-through of the 7 integration scenarios (see "Integration test scenarios").
- [ ] `app/README.md` exists and documents the "add a new exercise" workflow.

## Success Metrics

- A new learner with only Docker installed reaches exercise 01 in under 60 seconds (excluding Docker image pull).
- 100% of the 7 auto-validated exercises return a green pass for their canonical solutions; 100% return a clearly-actionable failure for an empty editor.
- After closing the browser tab and reopening, the user lands on the same exercise with their typed code intact.

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Handwritten HCL parser drifts (misses an HCL construct a learner uses) | Medium | Medium | Comprehensive parser tests against every SOLUTION.md; pre-baked fallback in plan to swap in `@cdktf/hcl2json`. |
| CodeMirror HCL grammar unavailable / poor | Low | Low | Acceptable degradation: monospace + line numbers. Syntax highlighting is polish, not core. |
| Validators too strict — frustrate learners with "but my code works!" | Medium | Medium | Validation philosophy = loose, codified in `app/README.md`. Tests cover variation cases (e.g., `${path.module}` prefix or not). |
| localStorage corruption between schema versions | Low | Low | Defensive reads with defaults; schema bump = soft migration on read. |
| Docker image size or build time bloat | Low | Low | Multi-stage build, `node_modules` lives only in the builder stage. |
| Markdown rendering edge case (e.g., a `<details>` tag with a code fence inside) | Low | Low | `react-markdown` + GFM handles this; manual smoke check on every exercise. |
| Contributor adds an exercise but forgets the validator/observation file | Medium | Low | `registry.ts` build-time check: throw if an exercise id has no entry. Surfaces at `npm run build`. |
| The repo's exercise count grows beyond what the sidebar comfortably fits | Low | Low | Sidebar is a vertical list; 20+ is fine. Defer paging until needed. |

## Alternative Approaches Considered

| Alternative | Why rejected (or kept as fallback) |
|---|---|
| Run real `terraform` server-side in a sandbox | Heavier ops, security surface, complicates `make up`. Rejected in origin brainstorm. |
| Pure static site checked into the repo | Bloats git; harder contributor workflow. Origin brainstorm chose Docker compose. |
| WASM-based `@cdktf/hcl2json` instead of handwritten parser | Larger bundle (~1MB) and WASM tooling overhead vs. ~20KB of TS that we can read. **Kept as Phase 3 fallback** if handwritten drifts. |
| Monaco editor instead of CodeMirror 6 | 3MB+ bundle for editor features we don't need (LSP, command palette). |
| SvelteKit instead of React | Smaller bundle, less boilerplate — but React is more familiar to contributors and the size advantage doesn't compound for an app this small. |
| MDX-based content | Same effect as `import.meta.glob('*.md', { as: 'raw' })` + `react-markdown`, but requires MDX-flavored markdown — diverges from "plain markdown is canonical." |
| Hosted version on GitHub Pages | Out of scope for v1 per origin doc. Trivial to add later: `npm run build` → publish `app/dist/`. |

## Future Considerations

- **Hosted version**: publish `app/dist/` to GitHub Pages on a tag — zero new dependencies, ~5 lines of CI.
- **Per-exercise reset that's distinct from global reset**: already in Phase 2 as "Reset code to starter."
- **Side-by-side diff against SOLUTION.md** in the SolutionPanel when peeked, to help the learner spot what's structurally different.
- **Optional Terraform-CLI mode**: a future v2 could shell out to a host-mounted Terraform binary via a thin sidecar service for users who want real plan output. Out of v1 scope.
- **More exercises (modules in depth, remote state, real cloud)**: the architecture supports unbounded growth — add a directory + a validator file.

## Sources & References

### Origin

- **Origin document:** [`docs/brainstorms/2026-05-20-interactive-terraform-tutorial-web-requirements.md`](../brainstorms/2026-05-20-interactive-terraform-tutorial-web-requirements.md). Key decisions carried forward:
  - **Validation is structural, in-browser** (no terraform process, no backend).
  - **Bootstrap is `docker compose up`** (Docker is the only host dependency).
  - **All 10 exercises, mixed validation model** — 7 auto, 3 observation/self-attest.

### Internal references

- Existing tutorial content: `01-hello-world/` … `10-state-commands/` (30 markdown + HCL files, unchanged).
- Existing repo overview: `README.md`, `GENERATION.md` (will be updated to mention the web option).

### External references (to consult during implementation)

- Vite `import.meta.glob`: <https://vite.dev/guide/features#glob-import>
- React Router v7 routing: <https://reactrouter.com/>
- CodeMirror 6 setup: <https://codemirror.net/docs/>
- `react-markdown` with `<details>` and GFM: <https://github.com/remarkjs/react-markdown>
- `@cdktf/hcl2json` (fallback path): <https://github.com/cdktf/cdktf/tree/main/packages/%40cdktf/hcl2json>
- HCL2 grammar reference: <https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md>
- nginx SPA fallback pattern: `try_files $uri $uri/ /index.html;`

### AI provenance

This plan was generated by Claude Opus 4.7 (`claude-opus-4-7`) via the `/ce:brainstorm` → `/ce:plan` workflow. Brainstorm dialogue and product decisions are preserved in the origin document. Implementation will follow `/ce:work` against this plan.
