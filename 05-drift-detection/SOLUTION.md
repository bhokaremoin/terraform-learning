# 05 · Drift Detection — Solution

There's no code to write for this one — the lesson is in observing what `plan` and `apply` do when reality diverges from state.

## How `local_file` represents itself in state

For `local_file`, the `id` attribute is the SHA1 of `content`. The state also stores the literal `content` string and a fan-out of derived checksums (`content_md5`, `content_sha1`, `content_sha256`, …). That detail matters here: because `id` is derived from `content`, any change to the file on disk produces a SHA1 that no longer matches the recorded `id`, and the provider concludes that the resource it previously created is **gone**. With a "real" cloud resource (whose identity is an ARN/UUID/etc. independent of content), the same drift would show up as `~ update in place`.

Keep this in mind below: with `local_file`, "hand-edit the file" and "delete the file" produce indistinguishable plans.

## What happens at each step

### After `terraform apply`

- `managed.txt` exists with content `Managed by Terraform\n`.
- `terraform.tfstate` records `local_file.managed` with `id = <sha1 of content>`.

### After `echo "I did this by hand" > managed.txt`

- `managed.txt` now has different content.
- State is unchanged — Terraform has no idea yet.

### After `terraform plan`

Terraform refreshes first. It re-reads the file, computes the SHA1, sees it doesn't match the stored `id`, and updates state to "this resource no longer exists in reality." Then it computes the plan against your code, which still declares the resource. Result:

```text
local_file.managed: Refreshing state... [id=<old sha>]

Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # local_file.managed will be created
  + resource "local_file" "managed" {
      + content              = <<-EOT
            Managed by Terraform
        EOT
      ...
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

The state file's modify time also changes during plan — refresh writes the updated view of reality even though you didn't run apply.

### After `terraform plan -refresh-only`

A refresh-only plan calls the drift out explicitly:

```text
Note: Objects have changed outside of Terraform

  # local_file.managed has been deleted
  - resource "local_file" "managed" {
      - content              = "Managed by Terraform\n" -> null
      ...
    }
```

Notice the wording: "has been deleted", not "has been changed". From `local_file`'s point of view, an edit and a deletion are the same event.

### After `terraform apply`

The file is recreated with content `Managed by Terraform\n`.

### After `rm managed.txt`

Reality has no file. The next `terraform plan` is identical in shape to the edit case: `Plan: 1 to add, 0 to change, 0 to destroy.`

## Answers to "Predict, then verify"

1. **The state file's mtime changes** during plan because the refresh step writes new attribute values into state. Even `plan` (not `apply`) can modify state.
2. **Edit and delete look identical** with `local_file` — both end up as `Plan: 1 to add, 0 to change, 0 to destroy.` because the resource's identity (`id = sha1(content)`) means "different content" reads as "different resource", which reads as "the one I tracked is gone." Other providers, where identity is an ARN/UUID independent of content, would show `~ update in place` for the edit case and `+ create` for the delete case.
3. **Code wins.** Apply makes reality match the code. The hand-edited content is overwritten.

## Answers to the experiments

1. **Two-way drift.** Plan reflects the new code value as a fresh `+ create`. Terraform doesn't show a from/to diff for this resource because state no longer holds the old view of reality. This is why reviewing the plan, not the diff in your editor, is the source of truth.
2. **Permission drift.** `local_file` tracks `file_permission`. `chmod 600 managed.txt` while the code says `0644` shows up on the next plan — as a replacement, since `file_permission` is also ForceNew on this provider.

## Why this matters beyond this exercise

The mechanical lesson is provider-specific (`local_file` is unusually simple). The conceptual lesson is universal:

- Plan refreshes by default, then proposes a reconciliation between code and refreshed state.
- The exact plan symbols (`~`, `+`, `-`, `-/+`) depend on how the provider models that resource's identity and which attributes it marks as updatable vs. ForceNew.
- Always read the plan, never assume from the type of edit you made.

## Related commands

- `terraform plan -refresh-only` — show only what drift exists, ignore code changes.
- `terraform apply -refresh-only` — write refreshed reality into state, ignore code. Useful when reality is correct and state is wrong.
- `terraform plan -refresh=false` — skip refresh entirely. Plan is fast but may miss drift.
