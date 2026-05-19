# 05 · Drift Detection — Solution

There's no code to write for this one — the lesson is in observing what `plan` and `apply` do when reality diverges from state.

## What happens at each step

### After `terraform apply`

- `managed.txt` exists with content `Managed by Terraform\n`.
- `terraform.tfstate` records `local_file.managed` with `content_sha1 = <sha>`.

### After `echo "I did this by hand" > managed.txt`

- `managed.txt` now has different content.
- State is unchanged — Terraform has no idea yet.

### After `terraform plan`

Terraform refreshes first. It re-reads the file, re-computes the SHA1, sees it doesn't match the stored SHA1, and updates state to record the new SHA1. Then it computes the plan: the resource's code says content should be `Managed by Terraform\n`, but state now says reality has different content. So plan shows:

```text
Note: Objects have changed outside of Terraform

Terraform detected the following changes made outside of Terraform since the
last "terraform apply" which may have affected this plan:

  # local_file.managed has been changed
  ~ resource "local_file" "managed" {
        content = "I did this by hand\n" -> "Managed by Terraform\n"
        ...
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

The state file's modify time changes at this point — refresh updates state even if you don't run apply.

### After `terraform apply`

The file is overwritten back to `Managed by Terraform\n`.

### After `rm managed.txt`

Reality has no file at all. State still records one.

### After the next `terraform plan`

Refresh reads the file, gets a not-found error, and updates state to forget the resource ever existed. Then plan computes: code says one should exist, state says none does. Result:

```text
Plan: 1 to add, 0 to change, 0 to destroy.
```

Note the difference: editing the file gave a `~ update`, while deleting it gives a `+ create`. State reflected reality before plan composed its proposal.

## Answers to "Predict, then verify"

1. **The state file's mtime changes** during plan because the refresh step writes new attribute values into state. Even `plan` (not `apply`) can modify state.
2. **Edit → `~ update in place` of one attribute. Delete → `+ create` a whole new resource.** Same code, different reality, different plan.
3. **Code wins.** Apply makes reality match the code. The hand-edited content is overwritten.

## Answers to the experiments

1. **Two-way drift.** Plan goes straight from current reality to your new code. Terraform doesn't show "from old code to new code"; it shows "from refreshed-state to new code." This is why reviewing the plan, not the diff in your editor, is the source of truth.
2. **Permission drift.** Yes — `local_file` tracks `file_permission`. `chmod 644 managed.txt` when the code says `0644` is a no-op. Try `chmod 600` and re-plan; you'll see an update.

## Related commands

- `terraform plan -refresh-only` — show only what drift exists, ignore code changes.
- `terraform apply -refresh-only` — write refreshed reality into state, ignore code. Useful when reality is correct and state is wrong.
- `terraform plan -refresh=false` — skip refresh entirely. Plan is fast but may miss drift.
