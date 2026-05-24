# 05 · Drift Detection

## Concept

Terraform's mental model rests on three things being aligned: **your code** (intent), **the state file** (what Terraform thinks it built), and **reality** (what actually exists). When state and reality disagree, that's called **drift**. Someone edited a file by hand. A teammate clicked a button in the AWS console. A process changed a permission. Whatever — the world moved while Terraform wasn't looking.

`terraform plan` doesn't just compare your code to state. It also **refreshes**: re-reads each managed resource from reality, updates state to match, and then computes the plan against your code. This means drift shows up automatically as proposed changes. If reality moved away from your code, plan offers to put it back.

This is one of Terraform's most useful properties: it's continuously reconciling, not just create-once.

## Task

- [ ] Apply a simple `local_file` that writes a known string.
- [ ] Hand-edit the file (using `echo` or your editor) to change its content.
- [ ] Run `terraform plan` and read the drift output carefully.
- [ ] Also run `terraform plan -refresh-only` and notice it explicitly calls out drift.
- [ ] Run `terraform apply` and watch Terraform restore the file to match your code.
- [ ] Try the reverse: delete the file entirely, then plan.

### Note on `local_file` and identity

`local_file` is a deliberately simple resource for this tutorial. Its `id` in state is the SHA1 of its content. That means when you change the file by hand, refresh sees a different SHA1 and concludes "the resource I created is gone" — so plan proposes to **create** a new one, not to update one in place. The same thing happens when you `rm` the file. From the plan output, edit and delete look identical for this provider.

With most other providers (AWS, GCP, Azure, …) drift on a managed attribute shows up as `~ update in place` because those resources have a stable identity (an ARN, a UUID) that survives content changes. The lesson is the same — Terraform reconciles code, state, and reality — just the surface symbols differ. Read your plan carefully.

## Run it

```bash
terraform init
terraform apply
cat managed.txt        # should show "Managed by Terraform\n"

# Drift the file out from under Terraform.
echo "I did this by hand" > managed.txt
cat managed.txt

# Now plan. With local_file, refresh sees the SHA1 changed and treats the
# resource as gone, so plan proposes to (re)create.
# Look for: "Plan: 1 to add, 0 to change, 0 to destroy."
terraform plan

# Run plan -refresh-only to see the drift call-out explicitly. It will say
# "Objects have changed outside of Terraform" and list local_file.managed as
# "has been deleted" (with this provider, edits look like deletions — see Note above).
terraform plan -refresh-only

# Apply restores the file to match your code.
terraform apply
cat managed.txt        # back to "Managed by Terraform\n"

# Now try deletion: rm the file outright.
rm managed.txt
terraform plan         # same shape as the edit case — Plan: 1 to add.

terraform apply
cat managed.txt        # back again

terraform destroy
```

## Predict, then verify

1. When you hand-edit `managed.txt`, the state file is unchanged. After running `terraform plan`, does the state file change? (Hint: look at the modify time of `terraform.tfstate` before and after plan.)
2. What's the difference between the plan output when you **edit** the file vs. when you **delete** it? (With `local_file` specifically — the answer might surprise you. See the Note above.)
3. If you hand-edit the file AND your `.tf` to a third value, what happens on apply? Whose value wins?

## Hints

<details>
<summary>Hint 1 — `plan -refresh-only`</summary>

You can run `terraform plan -refresh-only` to do the refresh step and show drift without considering your code changes at all. Useful for spotting drift without proposing fixes.

</details>

<details>
<summary>Hint 2 — disable refresh</summary>

`terraform plan -refresh=false` skips the refresh step. Plan will operate against the stale state and may miss drift. Sometimes useful in CI to avoid expensive reads, but you should know what you're trading.

</details>

<details>
<summary>Hint 3 — what state actually stores</summary>

For `local_file`, state stores the literal `content` string **and** several derived checksums (`content_sha1`, `content_sha256`, …). The `id` attribute is the SHA1 of `content`. On refresh, Terraform reads the file, recomputes the SHA1, and compares it to the stored `id`. If they differ, the provider treats the previously-managed resource as gone (because its `id` no longer matches what's on disk) — that's why a hand-edit plan looks like a "create new" rather than an "update".

</details>

## Common pitfalls

- **Forgetting refresh runs every plan.** If you have many slow or rate-limited data sources / resources, plans can take minutes. `-refresh=false` exists for this, but use it sparingly.
- **"Plan shows nothing wrong" but reality is broken.** Drift in attributes Terraform doesn't track (like file mtime, or fields the provider doesn't model) won't show up. Terraform only watches what its provider exposes.
- **State and reality both changed.** If state is also stale (e.g., partial apply got interrupted), `plan -refresh-only` followed by `apply -refresh-only` is the way to bring state into alignment without applying code changes.

## Experiments

1. **Two-way drift:** change both the file content (by hand) and the `.tf` `content` argument. Predict what plan shows. With `local_file` you'll see a `+ create` reflecting the new code value — not a from/to diff, because state thinks the old resource is gone.
2. **Permission drift:** change the file's permissions with `chmod 600 managed.txt` (or whatever differs from the resource's `file_permission` argument). Run plan. Does Terraform notice? (It does — and with `local_file` that's also a replacement, not an in-place change.)
