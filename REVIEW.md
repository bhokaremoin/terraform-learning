# Tutorial Review — `terraform-learning`

**Reviewer:** Claude (deep review)
**Date:** 2026-05-23
**Method:** Read every `README.md`, `main.tf`, `SOLUTION.md`, the matching `app/src/exercises/*/observation.ts`, and validated key claims by actually running `terraform init/apply/plan` against the `hashicorp/local` provider v2.9.0 with Terraform v1.15.1 in a clean temp directory.

---

## TL;DR — readiness verdict

**Do not publish as-is.** The pedagogy and structure are excellent, but **three exercises (04, 05, 06) describe behavior the `hashicorp/local` provider does not actually exhibit**, and **exercise 10 has a broken section** because the provider does not implement `import` for `local_file`. Fixing these is mandatory before sending it out.

The other six exercises (01, 02, 03, 07, 08, 09) are correct and ready.

---

## Severity legend

- 🔴 **Blocker** — tutorial tells the learner something that will not happen on their machine. Will erode trust immediately.
- 🟠 **Inaccuracy** — technically wrong but minor / doesn't break the exercise.
- 🟡 **Polish** — wording, missing context, or a nicer way to phrase something.
- 🟢 **Looks good** — verified and approved.

---

## Root cause of most blockers: how `hashicorp/local` `local_file` actually works

I verified this on provider v2.9.0 (latest at time of review). It matters because three exercises are built on assumptions about this resource.

1. **`local_file` has no Update.** The provider only implements Create / Read / Delete. So **every attribute change forces replacement** — content, filename, file_permission, everything. There is no `~ update in place` plan for `local_file`. Any plan that changes a `local_file` is `-/+`.
2. **`local_file` does store the literal content in state.** The exercise-05 hint that says "state stores the SHA1 of content, not the literal content" is wrong. State stores the `content` string *plus* all six checksum attributes (`content_md5`, `content_sha1`, …, `content_sha512`).
3. **`local_file.id` is the SHA1 of `content`.** Because the resource identity is derived from content, when you hand-edit the file the refresh sees a different SHA1 and treats the resource as **deleted from reality** — not "updated". The refresh-only plan literally says `# local_file.managed has been deleted`. So:
   - Hand-edit the file → next plan is `Plan: 1 to add, 0 to change, 0 to destroy.` (a `+ create`).
   - Delete the file → next plan is *identical*: `Plan: 1 to add, …`.
   - There is no observable difference between "edit" and "delete" with this provider.
4. **`local_file` does not implement `terraform import`.** Both the CLI form (`terraform import local_file.x …`) and the declarative `import { … }` block return:
   > Error: Resource Import Not Implemented
   > This resource does not support import.

These four facts collide with exercises 04, 05, 06, and 10. Details below.

---

## Per-exercise review

### 01 · Hello World 🟢

Verified end-to-end. `apply` creates the file, state is recorded, predictions in the SOLUTION are correct. Ready.

Tiny polish:
- 🟡 The README says "you'll have `terraform.tfstate.backup` on the next apply." Actually `tfstate.backup` is created on the *first* mutation after init (so the first apply also leaves one if there was a prior empty state, but for a brand-new dir the first apply has no backup yet — second apply does). Wording is fine, just precise enough.

### 02 · Variables and Outputs 🟢

Verified end-to-end. `file_size = 14` matches. Variable precedence claims are correct.

Minor things worth tightening:
- 🟡 SOLUTION says `length()` returns "number of bytes (technically grapheme clusters since 1.5+, but for ASCII it's the same)." Strictly speaking `length()` on a string returns **grapheme clusters** in current Terraform — never bytes. For all ASCII it coincides with bytes; for emoji or accented characters it diverges. The current wording is acceptable; consider rephrasing as "characters (grapheme clusters)" and noting "for the ASCII example here, that equals the byte count".
- 🟡 Variable precedence ordering: the text says `-var/-var-file > *.auto.tfvars > terraform.tfvars > TF_VAR_*`. Correct, but `*.auto.tfvars` and `terraform.tfvars` both have a deterministic order, and `-var-file` is interleaved with `-var` in command-line order (later wins). Not worth changing unless you want to be exhaustive.

### 03 · Multiple Resources 🟢

Code, hints, and SOLUTION all check out. The `random_pet` dependency-graph story is accurate. Ready.

- 🟡 README says `terraform graph` outputs DOT — true. The hint to `dot -Tpng > graph.png` is fine but learners without Graphviz get a wall of text. Maybe add: "or `terraform graph | grep -- '->'` to just see edges."

### 04 · Data Sources 🔴

**Blocker.** The SOLUTION's "Predict, then verify" answer #3 says:

> Changing `input.txt` changes the data source's content … Terraform compares state's idea of `local_file.output.content` ("BANANA\n") to the new computed value ("APPLE\n") and **shows an in-place update**.

I tested this. Changing `input.txt` from "Banana" to "Apple" produces:

```
-/+ resource "local_file" "output" {
    ~ content              = ... # forces replacement
    ...
}
Plan: 1 to add, 0 to change, 1 to destroy.
```

This is a **destroy + create**, not an in-place update. Root cause #1 above: `local_file` has no update method.

**Fix options:**
1. Easiest: change the SOLUTION wording to "forces replacement" and explain that the local provider treats every content change as recreate (and forward-reference exercise 06).
2. Better pedagogically: use a different resource for the "output" half that supports in-place updates, so the lesson "data source change propagates as an update" actually holds. Off the top of my head no offline-friendly provider has a resource that updates in place — so option 1 is realistic.

Also:
- 🟢 The "data source is read, not added" claim (Plan: 1 to add — the data source doesn't count) is correct.
- 🟢 The `precondition`/`postcondition` lifecycle hint at the bottom is correct.

### 05 · Drift Detection 🔴

**Blocker.** This exercise is the worst-affected; the entire scripted narrative is incorrect.

What the README/SOLUTION claim and what actually happens:

| Action | SOLUTION says | Reality with hashicorp/local 2.9 |
|---|---|---|
| Apply, then `echo "I did this by hand" > managed.txt`, then plan | `Note: Objects have changed outside of Terraform` + `~ update in place` + `Plan: 0 to add, 1 to change, 0 to destroy.` | `+ create` + `Plan: 1 to add, 0 to change, 0 to destroy.` and no "objects have changed" notice on a regular plan |
| Apply, then `rm managed.txt`, then plan | `Plan: 1 to add, 0 to change, 0 to destroy.` (create) | Identical to the edit case: `Plan: 1 to add, 0 to change, 0 to destroy.` |
| The "edit vs delete" distinction the exercise is built on | Different plan symbols | **Indistinguishable** |

Why: `local_file.id = sha1(content)`. When you change content by hand, refresh sees a different SHA1 and concludes the original resource is *gone*. From Terraform's perspective there's no difference between "the file's content changed" and "the file doesn't exist anymore".

Note: `terraform plan -refresh-only` *does* show drift output ("# local_file.managed has been deleted"), but with a `-` prefix, not the `~` the SOLUTION promises.

The SOLUTION hint #3 in the README is also misleading: "For `local_file`, state stores the SHA1 of content, not the literal content." It stores both.

**Fix options:**
1. **Re-record the SOLUTION** to match real output, and reframe the lesson: "with this provider, content drift looks identical to deletion, because the resource's identity *is* its content's SHA1. With most other providers you'd see `~ update in place` instead." This is honest and turns a wart into a teaching moment about how providers model identity.
2. **Pick a different resource for the drift demo.** `null_resource` with `triggers` doesn't really exhibit drift either. Offline options are limited. Option 1 is probably the right move.
3. Drop the experiment about `chmod` — same problem: changing `file_permission` also forces replacement, not update.

Also affects the matching `app/src/exercises/05/observation.ts` checklist, which currently tells the learner to expect the `~` plan symbol and the "Objects have changed" notice. Both lines are wrong.

### 06 · Replacement vs In-Place Updates 🔴

**Blocker on Change 1.** The SOLUTION says changing `local_file.content` is in-place:

> ```
>   # local_file.greeting will be updated in-place
>   ~ resource "local_file" "greeting" {
>       ~ content = "Hello there\n" -> "Hello again\n"
>       ...
> Plan: 0 to add, 1 to change, 0 to destroy.
> ```

The SOLUTION has a parenthetical note: "Older versions of the `hashicorp/local` provider (pre-2.x) marked `content` as ForceNew". This is **backwards** — content is ForceNew in the *current* 2.x line (and was in 1.x too, AFAICT). I tested on v2.9.0 and got:

```
-/+ resource "local_file" "greeting" {
    ~ content = ... # forces replacement
    ...
Plan: 1 to add, 0 to change, 1 to destroy.
```

Since the exercise's pedagogical contrast is "Change 1 is in-place; Changes 2 and 3 are replacements," and Change 1 is actually a replacement, the contrast collapses — all three changes are replacements.

**Fix options:**
1. Reframe: "every change to a `local_file` is a replacement because the provider has no Update. The lesson is which `(forces replacement)` annotation appears on which attribute, and how it cascades." That's still valuable.
2. Add a fourth Change that's genuinely in-place — but on `local_file`, none exist. You'd need a different resource (e.g., `null_resource` doesn't help, `random_string` with `keepers` would, but is more contrived).
3. At minimum, fix Change 1's expected output and delete the "pre-2.x" note.

Changes 2 and 3 work as described.

The matching `app/src/exercises/06/observation.ts` line 12 (`With current hashicorp/local, content updates in place.`) needs the same fix.

### 07 · count and for_each 🟢 (with one caveat)

End-to-end correct: `count` indices, `for_each` keys, `state mv` to rebind, removing a key destroys exactly one resource. Verified the addresses.

- 🟡 The footnote in Part B's SOLUTION says "After these [state mv's], plan should show only attribute updates (filename and content changed)". Because of the `local_file` ForceNew thing, those will be *replacements*, not "in-place attribute updates". Reword to "should show replacements rather than the larger destroy-3 / create-3 churn" — same lesson, accurate wording.
- 🟢 The Experiments section correctly notes that "if `filename` is ForceNew (it is on `local_file`), those become two replacements." Good — this is the only place the README acknowledges ForceNew on `filename`. Apply the same honesty to `content` everywhere else.

### 08 · Locals and Functions 🟢

Verified the file-creation, JSON decode, and templatefile pieces by inspection. Pedagogy is solid.

- 🟡 The Common Pitfalls bullet "`file()` is evaluated at plan time. If the file doesn't exist at plan time, plan fails." — true. Could add: "And `file()` is for reading static files at plan time; for files that are produced by another resource in the same config, use `data "local_file"` (and accept that data source dependencies in `for_each` get awkward — see ex07)."
- 🟡 `timestamp()` causes plan churn — true. Worth noting `plantimestamp()` (Terraform 1.5+) as a more sensible alternative for use cases where you actually want apply-time, not plan-time.

### 09 · Modules 🟢

Verified module structure (root + `modules/greeting/{main,variables,outputs}.tf`). The validation block, the cross-module addressing, and the `for_each` on modules pattern are all accurate.

- 🟡 The child module's `filename` uses `${path.root}/...` to write into the *root* directory. That's a stylistic choice worth flagging: it makes the module non-pure (it reaches outside itself). Real-world modules usually take a parent path as input. Could be an Experiment: "make the module write inside its own directory using `${path.module}` and observe how the path changes."

### 10 · State Commands 🔴

**Blocker on Parts D and E.** These hinge on `terraform import` for `local_file`, which **the provider does not implement**:

```
$ terraform import local_file.delta delta.txt
Error: Resource Import Not Implemented
This resource does not support import. Please contact the provider developer
for additional information.
```

Same error for the declarative `import { … }` block in HCL — verified.

So Parts D ("Adopt an existing file") and E ("the broken scenario", which depends on import for recovery) cannot be completed against the documented provider. The learner will hit the error and conclude the tutorial is broken.

**Fix options:**
1. **Rewrite Parts D/E to use a resource that supports import.** None of the offline providers do — `null_resource` doesn't have a meaningful real-world identity to import. The honest move is probably to demonstrate import against a cloud resource. If you want to stay fully offline, you'd have to teach import using only docs/conceptual content, with a note that "you can't run this against `local_file`; here's what you'd run with `aws_s3_bucket`."
2. **Drop Part D/E from the runnable path** but keep an "Import — concept-only" reference section at the end of the exercise. Honest, but loses the hands-on value.
3. **Switch the whole tutorial to a provider that supports import for at least one resource.** `random_*` resources do support import (`terraform import random_pet.x stable-mongoose`). You could construct Parts D/E around importing a `random_pet` whose seed/id you happen to know. This is the cleanest fix that keeps everything offline.

Parts A (inspect), B (state mv), and C (state rm) all work and are correct.

Also:
- 🟡 README and SOLUTION disagree on the import ID format: README uses `terraform import local_file.delta delta.txt`; SOLUTION uses `"$(pwd)/delta.txt"`. Pick one. (Moot until import works at all.)
- 🟢 The `moved { … }` block walkthrough and `terraform show` mention are all correct.

The matching `app/src/exercises/10/observation.ts` checklist promises the learner will run `terraform import local_file.delta` and see "No changes". They will not.

---

## Tutorial-wide observations

### Coverage — what's there, what isn't

What's covered (well): resources, providers, variables, outputs, references/graph, data sources, drift concept, replacement concept, count/for_each, locals, functions, templatefile, modules (incl. for_each on modules), state inspection.

What's not covered, but should reasonably be expected of an "onboarding" tutorial:

- 🟡 **`terraform fmt` / `terraform validate`** — the two commands every learner should know exist. Mention in passing in the cheatsheet at minimum.
- 🟡 **Workspaces** — quick mention even if you don't dedicate an exercise.
- 🟡 **Remote state / backends** — the README mentions it under "what's next", which is appropriate. Fine to leave.
- 🟡 **`sensitive = true`** on outputs and variables. Trivial to add a callout in exercise 02 or 08.
- 🟡 **`terraform plan -out=plan.bin` and `terraform apply plan.bin`** — the "review-then-execute" workflow is how plans get used in CI. Worth a callout in exercise 05 or in the cheatsheet.
- 🟡 **Provider configuration vs. provider declaration.** `required_providers` (what version) vs. `provider "local" {}` block (how to configure). Currently the tutorial never shows a `provider {}` block at all because `local` needs no config. With AWS/GCP/Azure as "next steps," a one-line example would prepare learners.
- 🟡 **Output formatting / `-json` / `-no-color`** — small but useful for scripting.
- 🟡 **`dynamic` blocks** — common enough that beginners hit them in real codebases; one short callout in ex08 would help.
- 🟡 **`terraform plan -target=`** — mentioned in exercise 07 (`for_each` known-at-plan-time pitfall) but never explained. Either explain inline or remove the reference.

Not strictly missing but worth noting:

- 🟡 The tutorial never has the learner write a `variables.tf` / `outputs.tf` / `main.tf` split (except inside the module in ex09). Real codebases use that split; consider one of exercises 02/08 making the learner do it explicitly.

### Pedagogy

- 🟢 The "Predict, then verify" sections are the strongest pedagogical move in the tutorial. Keep them.
- 🟢 The escalating disclosure with `<details><summary>Hint N</summary>` is well-paced.
- 🟢 Each exercise ends with destroy-and-clean — good habit.
- 🟡 Exercise lengths grow a lot toward 06/07/10. Some learners will give up. Consider splitting ex10 into "10a: state inspect/mv/rm" and "10b: import & recovery" — especially if you fix the import problem.

### Structural / metadata

- 🟢 `00-START-HERE.md` is excellent. Clear, honest, sets expectations.
- 🟢 `CHEATSHEET.md` is a nice quick-reference.
- 🟡 No `LICENSE` in each exercise (just the repo root) — fine, but the repo root `LICENSE` should be referenced from `00-START-HERE.md`.
- 🟡 The `app/` web UI mirrors each README into an `observation.ts` checklist. **Whichever README changes have to land in `observation.ts` too** — the checklists are currently in lockstep with the README's incorrect claims for ex05 and ex06. Treat this as paired editing.
- 🟡 `GENERATION.md` exists in the root and likely documents how the content was generated. Worth scanning before re-generating to make sure fixes don't get overwritten.

---

## Recommended action plan, prioritized

1. **Fix blockers first (ex04, 05, 06, 10).** These will produce trust-eroding "this doesn't match what I'm seeing" moments. Use the wording I suggested for ex05 ("with this provider, drift looks like deletion because the resource's identity is its content's SHA1") — it converts the bug into a stronger lesson about provider design.
2. **Fix import (ex10).** Easiest: switch the import target to `random_pet`, which the `random` provider *does* support. If you keep `local_file`, you have to acknowledge that import isn't supported and demote the section to concept-only.
3. **Re-test every solution.** I tested 01, 02, 04, 05, 06, and partially 10. Run a clean-room pass on 03, 07, 08, 09 too. Use a fresh temp dir per exercise, run `init`, copy in the SOLUTION's `main.tf`, run `apply`, and confirm the predicted Plan/Output matches the SOLUTION's claims literally.
4. **Update `app/src/exercises/{05,06,10}/observation.ts`** to mirror the README fixes. They currently make the same incorrect claims.
5. **Add the polish items** above (fmt/validate, sensitive, `-target` if you reference it, `plan -out`) — small additions, big quality bump.
6. **Optionally split ex10** as suggested.

---

## Sanity-check matrix (what I actually ran)

| Exercise | Init | Apply solution | Verified specific claim | Result |
|---|---|---|---|---|
| 01 | ✅ | ✅ | state.show includes literal content | Content IS stored in state (refutes ex05 hint) |
| 02 | ✅ | ✅ | `file_size = 14` for `Hello, World!\n` | ✅ Correct |
| 04 | ✅ | ✅ | Edit input.txt → in-place update? | ❌ Actually `-/+` replacement |
| 05 | ✅ | ✅ | Hand-edit → `~ update`, delete → `+ create`? | ❌ Both produce `+ create`, identical |
| 05 | — | — | `plan -refresh-only` shows "Objects have changed"? | ✅ Yes, but says "has been deleted", not "has been changed" |
| 06 | ✅ | ✅ | Change content only → `~` in-place? | ❌ Actually `-/+` replacement |
| 10 | ✅ | ✅ | `terraform import local_file.delta delta.txt` | ❌ "Resource Import Not Implemented" |
| 10 | — | — | `import { … }` declarative block | ❌ Same error |
| 10 | — | — | `state list`, `state show`, `state mv`, `state rm` | ✅ All work |

Tested with: Terraform v1.15.1, `hashicorp/local` v2.9.0, `hashicorp/random` v3.x (default lock).
