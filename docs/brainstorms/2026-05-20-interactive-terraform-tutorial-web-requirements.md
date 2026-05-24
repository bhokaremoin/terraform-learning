---
date: 2026-05-20
topic: interactive-terraform-tutorial-web
---

# Interactive Web UI for the Terraform Learning Tutorial

## Problem Frame

The existing `terraform-learning` repo is a static collection of markdown READMEs, starter `main.tf` files, and `SOLUTION.md` reveals across 10 exercises. It works, but it has three frictions:

- **No automated feedback.** Learners hand-check their HCL against `SOLUTION.md`. Easy to miss a subtle difference and not notice.
- **No memory across sessions.** Closing your terminal or laptop loses your place; you re-orient on the next sitting.
- **Up-front install ask.** Even though the tutorial is offline, a new learner has to install Terraform before they can run anything — friction before the first lesson.

We want to wrap the same authored content in a small interactive web app that gives instant pass/fail on the user's HCL where it makes sense, preserves their place and their typed code across sessions, and runs from a single `make up` command with one prerequisite (Docker). The static repo continues to work as-is for anyone who prefers it.

## Requirements

- **R1.** `git clone` followed by `make up` boots the application. The only host prerequisite is Node.js 20+. No Terraform, no Docker, no other tools need to be installed. *(Originally specified Docker; revised mid-implementation — see Key Decisions.)*
- **R2.** Once booted, the app is reachable in a local browser on a predictable port; the README documents the URL.
- **R3.** All 10 existing exercises (`01-hello-world` … `10-state-commands`) are presented in order with current-exercise nav (prev/next) and a sidebar showing all 10 with completion status.
- **R4.** Each exercise screen renders the exercise's existing prose content (Concept, Task, Run it, Predict-then-verify, Hints in collapsible sections, Common pitfalls, Experiments) directly from the existing markdown files. No prose is duplicated between markdown and the web app.
- **R5.** Each exercise has an in-browser code editor pre-populated with the exercise's starter `main.tf` content. Editing is persistent — the user's typed code is saved as they type.
- **R6.** **Seven exercises** (01, 02, 03, 04, 07, 08, 09) support **structural auto-validation**. The "Validate" button parses the user's HCL in the browser, runs per-exercise assertion functions, and returns pass/fail with actionable feedback (e.g., "Expected a resource of type `local_file` with `filename` argument containing 'hello.txt' — none found").
- **R7.** **Three exercises** (05 drift detection, 06 replacement vs update, 10 state commands) are labeled explicitly as "observation exercises" in the UI. They display a per-exercise checklist of the expected observations and a "Mark complete" button — the user self-attests. The UI explains why these are self-attested and points the user at the relevant terraform commands to run locally.
- **R8.** Each exercise has a "Show solution" button. Clicking it reveals the `SOLUTION.md` content. The exercise is marked "solution peeked" but is not locked out of completion.
- **R9.** Per-exercise typed code persists across browser sessions (closing the tab, restarting Docker, restarting the laptop) via browser-local storage.
- **R10.** The user's current exercise and the set of completed/peeked exercises persist across browser sessions.
- **R11.** A single global "Reset all progress" affordance clears all stored state: completed flags, peeked flags, typed code, and current-exercise pointer. Confirmation prompt before clearing.
- **R12.** The 10 exercise content files (`README.md`, `main.tf`, `SOLUTION.md`) inside each exercise directory remain the canonical source of truth for prose, starter code, and reference solutions. The web app consumes them; it never duplicates them.
- **R13.** The repo is still usable as a pure static tutorial. A user who skips the web app (no Docker, just reading the markdown) gets the same content and progression as before.

## Success Criteria

- A learner with Docker installed can `git clone … && make up` and reach exercise 01 in their browser in under 60 seconds (Docker image pull excluded).
- For an auto-validated exercise, writing the correct HCL produces a green pass result in under 1 second after clicking Validate.
- After closing the browser tab, restarting Docker, and reopening the URL, the user lands on the same exercise with their previously-typed HCL intact.
- All seven auto-validated exercises return pass/fail without any Terraform binary being installed on the host or in the container.
- A contributor adding a new exercise touches exactly three files in the exercise directory (README, main.tf, SOLUTION.md) plus one validator file, and the web app picks up the new exercise automatically.

## Scope Boundaries

- **No backend service.** No database, no API server, no server-side terraform process. The web app is a static single-page app served by the container.
- **No real Terraform execution.** The app never runs `terraform init/plan/apply`. Validation is structural HCL inspection only. Users who want behavioral verification still run the CLI locally — that habit is preserved.
- **No user accounts, no multi-user collaboration, no shared progress.** Progress is local to the browser.
- **No hosted version in scope for v1.** Could be added later (e.g., GitHub Pages publishing the prebuilt SPA), but not part of this work.
- **No in-app editing of exercises.** Content is authored as markdown/HCL files in the repo and updated via git, not through any admin UI.
- **No mobile-first design.** Functional on a phone is fine; not optimized for it. Desktop is the primary target.
- **No i18n.** English only.
- **No advanced editor features.** Syntax highlighting yes; LSP/autocomplete/linting beyond the structural validator, no.
- **No "your code is unsafe" sandboxing concerns to design around.** Because we never execute the user's code, the entire arbitrary-code-execution surface is eliminated by construction.

## Key Decisions

- **Validation strategy: structural, in-browser.** Parse user HCL with an HCL JS library; run per-exercise assertion functions. Chosen over server-side `terraform plan` (heavy, requires backend + sandbox) and over "self-attest only" (loses the value-add over the static repo). Honest about checking shape rather than behavior; that's a fair trade for a fundamentals tutorial that already teaches "read the plan output for real verification."
- **Bootstrap: Node toolchain (`make up` runs `npm install && npm run dev`).** Single host dependency (Node 20+, which most modern dev environments already have). Faster cold start than Docker, no daemon to manage, no image-build friction. *(Initial decision was Docker compose; revised during Phase 1 after a build-context bug surfaced and the Docker path proved high-friction for a tutorial repo. The Node path also matches contributors' likely dev environment more naturally.)*
- **Coverage: all 10 exercises, mixed validation model.** Seven get auto-validation; three are explicit "observation exercises" with a self-attest flow. Preserves the pedagogically richest exercises (drift, replacement, state surgery) instead of cutting them, and is honest about which exercises are about writing HCL vs. reading terraform's behavior.
- **Persistence: browser-local storage.** Forced by "no backend." Sufficient for single-user single-browser progress. A user switching browsers/machines starts over — acceptable for a tutorial.
- **Content source of truth: existing markdown files.** The web app reads from the same `01-hello-world/README.md`, `main.tf`, `SOLUTION.md` files the static tutorial uses. No duplicated prose. Authoring stays in markdown.

## Dependencies / Assumptions

- The user has Node.js 20+ installed (https://nodejs.org or via a package manager).
- The user has a modern browser (last two major versions of Chrome, Firefox, or Safari).
- The existing exercise directories are stable in name and file layout; the web app's build step assumes `NN-name/{README.md, main.tf, SOLUTION.md}`.
- Browser localStorage capacity is more than sufficient (each exercise's typed code is well under 10KB; 10 exercises × ~10KB is negligible against the typical 5MB cap).

## Outstanding Questions

### Resolve Before Planning

_(none — main product decisions are settled)_

### Deferred to Planning

- [Affects R4][Technical] How the existing markdown is loaded into the SPA — build-time parse into a generated JSON manifest, MDX import at build, or fetched at runtime. Recommend build-time parse to keep the running app fully static.
- [Affects R5][Technical][Needs research] Code editor library — CodeMirror 6 (lighter, ~150KB, has an HCL community grammar) vs. Monaco (heavier, ~3MB, polished). "Simple/decent" likely lands on CodeMirror.
- [Affects R6][Technical][Needs research] HCL parsing in JS — evaluate libraries (`hcl-js`, `@cdktf/hcl2json` via wasm, hand-rolled tolerant parser). The choice affects validator authoring ergonomics.
- [Affects R1][Technical] Frontend framework — React + Vite, SvelteKit, or plain TS with a tiny renderer. All work; React + Vite is the safest mainstream pick. Defer to planning.
- [Affects R6][Technical] Per-exercise validator authoring pattern — likely a TypeScript function per exercise (e.g., `exercises/01/validate.ts` exporting `validate(hclAst): Result`). Confirm during planning.
- [Affects R3][Technical] Routing scheme — per-exercise route (`/exercise/01`) vs. single-page with anchors. Per-exercise route makes deep-linking and "remember where I was" trivial.
- [Affects R11][Technical] Reset UX detail — confirmation modal vs. inline confirm vs. typed "RESET" gesture. Cosmetic; defer.
- [Affects R1][Technical] Container image base — `nginx:alpine` serving prebuilt static files is the obvious choice; confirm during planning.

## Next Steps

→ `/ce:plan` for structured implementation planning.
