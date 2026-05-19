# terraform-learning

A hands-on, **offline** Terraform tutorial. Ten progressive exercises that run entirely on your laptop using local providers — no cloud account, no API keys, no billing risk. Each exercise takes 10–20 minutes and teaches one concept well.

If you're new to Terraform and want a deliberate, reading-the-plan-output style of practice before you touch real infrastructure, this is for you.

## Two ways to use this repo

### A — Interactive web tutorial (recommended for first-time learners)

The repo ships a small web app that wraps the same content with an in-browser editor, instant structural validation of your HCL, persistent progress, and a "show solution" reveal. The only thing you need installed is **Node.js 20+**.

```bash
git clone https://github.com/bhokaremoin/terraform-learning.git
cd terraform-learning
make up
```

First run installs npm dependencies (~30s on a good network) and starts the Vite dev server. It opens <http://localhost:5173> in your browser. Stop it with `Ctrl+C`. `make help` lists all targets.

The web app validates 7 of the 10 exercises automatically (it parses your HCL in the browser — no Terraform process runs anywhere, no code of yours is executed). The other 3 are observational exercises with a guided self-attest flow. See [`docs/plans/`](./docs/plans/) for the design.

### B — Static markdown tutorial (the original way)

If you'd rather work in your editor and the terminal, the markdown tutorial works on its own:

1. Install Terraform (instructions in [`00-START-HERE.md`](./00-START-HERE.md)).
2. Read [`00-START-HERE.md`](./00-START-HERE.md) end to end — it covers the mental model, the four-command workflow, and how to use the tutorial.
3. Open [`01-hello-world/README.md`](./01-hello-world/README.md) and work through it.
4. Move on to `02-...`, `03-...`, etc., in order.

Keep [`CHEATSHEET.md`](./CHEATSHEET.md) open in a tab while you work.

## What's in this repo

```
.
├── 00-START-HERE.md                  Mental model, install, four-command loop, exercise index.
├── CHEATSHEET.md                     Block syntax, reference syntax, function index, command list, gotchas.
├── 01-hello-world/                   Your first resource. The init → plan → apply → destroy loop.
├── 02-variables-outputs/             Parameterize inputs; surface results.
├── 03-multiple-resources/            How Terraform infers dependency order from references.
├── 04-data-sources/                  Read things Terraform doesn't manage.
├── 05-drift-detection/               What happens when reality changes outside Terraform.
├── 06-replacement-vs-update/         Which changes update in place vs destroy and recreate.
├── 07-count-foreach/                 Two ways to create many resources, and why for_each is better.
├── 08-locals-functions/              Computed values; string, encoding, filesystem, template functions.
├── 09-modules/                       Extract reusable units; call the same module twice.
│   └── modules/greeting/             A small, self-contained module to read alongside.
├── 10-state-commands/                Inspect and surgically edit state with mv/rm/import.
├── app/                              Interactive web app (Vite + React + TypeScript).
├── Makefile                          `make up` (start), `build`, `preview`, `test`, `lint`, `clean`.
├── docs/brainstorms/                 Requirements docs.
├── docs/plans/                       Implementation plans.
├── GENERATION.md                     How this repo was generated (Claude Code, the original prompt, model details).
├── CHEATSHEET.md                     (see above)
├── LICENSE                           MIT.
└── .gitignore                        Ignores .terraform/, *.tfstate, generated files, build artifacts, etc.
```

Every exercise directory contains three files:

| File | What it is |
|---|---|
| `README.md` | Concept, task, run-it steps, predict-then-verify prompt, progressively-revealed hints, common pitfalls, experiments. |
| `main.tf` | A starter with `# TODO` comments. You complete it. |
| `SOLUTION.md` | The completed code, the expected output, and answers to the "predict" and "experiments" prompts. Don't peek first. |

## How to use this tutorial

- **Do the exercises in order.** Each builds on the previous one.
- **Attempt before peeking at `SOLUTION.md`.** Struggling for ten minutes is where most of the learning happens.
- **Don't skip "Predict, then verify."** Write down what you expect to see before running `plan` or `apply`. Comparing your prediction to the actual output is the fastest way to build a real mental model.
- **Read the plan output.** Don't just scan for green checkmarks. The symbols (`+`, `-`, `~`, `-/+`) and the listed attributes tell you exactly what Terraform is about to do.
- **`terraform destroy` between exercises.** Keep a clean slate.

## Prerequisites

- Terraform 1.5 or newer (this was written against 1.15.x).
- A POSIX-ish shell. Examples use bash/zsh; PowerShell users will need to adapt a few `echo`/`cat` lines.
- Familiarity with the command line and reading code.

You do **not** need a cloud account. You do **not** need an internet connection after `terraform init` downloads the local providers once.

## Forking and adapting

Fork freely. Some ideas if you want to extend it:

- **Add exercises** for `dynamic` blocks, `provisioner` (and why you usually shouldn't use it), `null_resource` with triggers, `time_sleep`, or `tls_private_key` for fully local cert generation.
- **Localize** the README and exercise text into your language.
- **Cross-link** to your team's internal patterns once you're past fundamentals.
- **Add a real-cloud chapter** at the end — exercise 11+ that introduces the AWS, GCP, or Azure provider after the fundamentals are solid.

PRs welcome but not promised review — this is a learning artifact, not a maintained product.

## License

MIT. See [`LICENSE`](./LICENSE).

## Provenance

This repository was generated end-to-end by Claude (Anthropic's Claude Opus 4.7, via Claude Code) from a single detailed prompt. The full prompt, model identifier, and reproduction notes are in [`GENERATION.md`](./GENERATION.md). The content was then reviewed by a human (the repo owner) — but for the most part what you see is what the model produced. Read `GENERATION.md` if you want to try variations or rebuild similar tutorials for other tools.
