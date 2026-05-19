# How this repo was generated

This tutorial was produced by **Claude Opus 4.7** (model ID `claude-opus-4-7`) running inside [Claude Code](https://docs.claude.com/claude-code) — Anthropic's CLI agent for developers. The entire repository was generated in a single session from one structured prompt. No human-written code was added afterward; only repo-level metadata (this file, the top-level `README.md`, `LICENSE`, `.gitignore`) and the git/GitHub setup were done after the initial generation as a second pass.

## Why this file exists

Two reasons:

1. **Honesty.** If you're learning from this, you should know how it was made. Treat it as a starting point — the model is good but not infallible. Verify behavior against the actual `terraform plan` output (which the tutorial deliberately trains you to do).
2. **Reproducibility.** If you'd like to generate a similar offline tutorial for some other tool (Pulumi, Ansible, Helm, etc.) or build on this one for a different audience, you have the source prompt right here.

## Tooling

| Component | Version |
|---|---|
| Claude model | Claude Opus 4.7 (`claude-opus-4-7`) |
| Claude Code | latest at time of generation |
| Terraform (local validation) | v1.15.1 on darwin_arm64 |
| OS | macOS (Darwin 24.6.0) |

Validation done during generation: `terraform fmt -check -recursive` on the whole tree (passed). `terraform validate` was deliberately skipped because it requires `terraform init`, which downloads providers — out of scope for an offline tutorial generation pass.

## The original prompt

What follows is the verbatim prompt that produced this repository. It's also a worked example of the kind of brief that gets good results from a strong model agent: a stated context and goal, a hard scope boundary (no cloud providers, offline only), an explicit directory layout, a numbered topic list, per-exercise pedagogy requirements, a list of required files, and a verification step at the end.

````markdown
## Context

I'm a full-stack developer with ~2 years of experience. I'm new to Terraform and want to learn the fundamentals through hands-on exercises on my local machine before I apply it to real AWS infrastructure. I want to do this entirely offline — no cloud account, no API keys.

## What I want you to build

Create a directory `terraform-learning/` in the current working directory containing a structured, progressive tutorial with 10 exercises. Each exercise should be self-contained, take 10–20 minutes, and use ONLY local Terraform providers: `hashicorp/local`, `hashicorp/random`, `hashicorp/null`, `hashicorp/http`, `hashicorp/time`, `hashicorp/tls`. **DO NOT use the AWS provider or any cloud provider** — this learning path must work entirely offline.

## Directory structure

```
terraform-learning/
├── 00-START-HERE.md          # Overview, install instructions, learning path
├── 01-hello-world/
│   ├── README.md             # Concept + task + success criteria + hints
│   ├── main.tf               # Starter file with TODO comments
│   └── SOLUTION.md           # Complete answer + explanation
├── 02-variables-outputs/
│   └── ... (same structure)
├── ...
├── 10-state-commands/
│   └── ...
└── CHEATSHEET.md             # Quick syntax + command reference
```

## Exercise topics (in this order)

1. **Hello world** — A single `local_file` resource. Goal: feel the `init → plan → apply → destroy` loop.
2. **Variables and outputs** — Parameterize the file's name and content. See outputs after apply.
3. **Multiple resources and references** — `random_pet` generates a name, `local_file` uses it. Show how Terraform infers dependency order from references.
4. **Data sources** — Use `data "http"` or `data "local_file"` to read something Terraform doesn't manage.
5. **Drift detection** — Have the user modify the managed file by hand, then run `plan` and see drift reported.
6. **Replacement vs in-place updates** — Demonstrate which attribute changes trigger destroy+recreate (e.g. changing `random_pet` length) vs which update in place (e.g. changing `local_file` content). Read the plan output carefully.
7. **count and for_each** — Create 3 files with `count`, then refactor to `for_each` over a map. Discuss the tradeoffs (ordering, addressing).
8. **Locals and functions** — Use a `locals { }` block. Show `upper()`, `format()`, `jsondecode()`, `file()`, `templatefile()`.
9. **Modules** — Extract a reusable "greeting file" module under `modules/greeting/`, then call it twice with different inputs from the root module.
10. **State commands** — Walk through `terraform state list`, `terraform state show`, `terraform state mv`, `terraform state rm`, and `terraform import`. Include a deliberate "broken" scenario the user has to fix using state commands.

## Pedagogy requirements (apply to every exercise)

Each exercise's `README.md` must contain these sections in order:

- **Concept** — 1–2 paragraphs explaining the idea, why it matters, and the syntax pattern. Plain prose, not a bullet dump.
- **Task** — An explicit checklist of what the user does in this exercise.
- **Run it** — The exact commands to run, in order, with a note on what output to look for so the user can self-verify.
- **Predict, then verify** — Before running `plan` or `apply`, ask the user to predict what they'll see. This is the key learning moment.
- **Hints** — 2–3 progressively specific hints, in `<details>` tags so they're collapsed by default.
- **Common pitfalls** — 1–2 gotchas specific to this exercise.
- **Experiments** — At the end, 1–2 "now try modifying X and predict what happens" prompts to encourage exploration.

Each `main.tf` starter file:

- Include partial code with `# TODO: ...` comments marking what the user writes.
- Add inline comments explaining what each existing block does.
- Real, runnable code — no placeholders that wouldn't actually work.
- The complete solution goes in `SOLUTION.md`, not in `main.tf`.

## Top-level files

`00-START-HERE.md` should contain:

- A one-paragraph "what is Terraform" intro using the mental model: your code (intent) + the state file (Terraform's memory) + reality, reconciled by `plan` and `apply`.
- Terraform install instructions for macOS (Homebrew), Linux (apt and manual), and Windows (Chocolatey and manual). Use the current stable version.
- How to verify installation (`terraform -version`).
- The four-command workflow (`init`, `plan`, `apply`, `destroy`) in one paragraph.
- A numbered overview of all 10 exercises with one line each on what they teach.
- How to use this tutorial: do them in order, attempt before peeking at `SOLUTION.md`, don't skip the "predict" steps.
- A "what's next" pointer at the end (modules in depth, remote state, then real cloud providers like AWS).

`CHEATSHEET.md` should be a compact reference, useful even after the tutorial:

- HCL block syntax: `resource`, `variable`, `output`, `data`, `locals`, `module`, `terraform`, `provider`.
- Reference syntax: `var.x`, `local.x`, `resource_type.name.attr`, `data.type.name.attr`, `module.name.output`.
- The most useful built-in functions grouped by category (string, collection, encoding, filesystem).
- The full command list including `fmt`, `validate`, `state`, `import`, `taint`, `output`, `console`.
- A short "gotchas to remember" section.

## After creating everything

1. Print the full directory tree using `tree` or equivalent.
2. Print the contents of `00-START-HERE.md`.
3. Print the contents of `01-hello-world/README.md` so I can start immediately.
4. **Do NOT execute any terraform commands yourself** — those are for me to run as I work through the exercises.
5. **Do NOT install terraform** — just include clear install instructions in `00-START-HERE.md`.
6. Make sure every `main.tf` file is valid HCL — run `terraform fmt -check` and `terraform validate` on each exercise directory (without `init`, just syntax) if you can do so without network calls. If `validate` needs `init`, skip it; just make sure `fmt` passes.

Keep the tone of all written content practical and developer-friendly — assume the reader knows what a CLI is, what state means in software, and how to read code, but doesn't know Terraform yet. No "what is the cloud" introductions.
````

## Reproducing or adapting this

If you want to generate a similar tutorial for another tool, the parts of the prompt that matter most are:

1. **The audience sentence at the top.** "Full-stack developer, ~2 years, new to Terraform, wants offline-first." Without that, the model defaults to a vague intermediate level.
2. **The hard constraint.** "DO NOT use AWS or any cloud provider." Specific, capitalized, repeated. Models follow constraints better when they're impossible to misread.
3. **The exact directory layout.** Showing the tree in fenced ASCII removes ambiguity that paragraphs of "you should have X and Y" can't.
4. **The pedagogy requirements as a per-exercise checklist.** Naming each section ("Concept", "Task", "Run it", "Predict, then verify"...) gets you consistent structure across all ten exercises.
5. **The "after creating everything" verification list.** Tells the model what "done" looks like and gives it a list to self-check against.

The whole thing fits on one screen. That's the right length: long enough to remove ambiguity, short enough that the model holds it all in working memory while generating.

## What was added after generation

To turn the generated directory into a complete public GitHub repo, the following meta files were added (also by the same Claude session, in a follow-up pass):

- `README.md` — the GitHub landing page (different from `00-START-HERE.md`, which is the in-tutorial entry point).
- `LICENSE` — MIT.
- `.gitignore` — ignores `.terraform/`, state files, generated tutorial artifacts.
- `GENERATION.md` — this file.
- Git initialization, initial commit, and push to `https://github.com/bhokaremoin/terraform-learning`.

No exercise content was hand-edited.

## Caveats

- **Verify Terraform behavior against `plan` output, not against the tutorial's prose.** The tutorial is careful to remind you to read plans because provider behavior can differ between versions. If something in `SOLUTION.md` doesn't match what you see, trust the plan.
- **Provider versions are pinned with `~>`.** If a newer minor version changes attribute behavior (e.g., what's ForceNew vs in-place), this tutorial may need updating. Open an issue or PR.
- **The model picked Terraform 1.15.x as the install target** because that's what was on the machine at generation time. Anything 1.5+ should work for the exercises.

## Issues / corrections

If you spot something wrong — a broken exercise, a stale fact, a confusing explanation — open an issue on GitHub. The fastest path to a fix is a PR with the corrected text.
