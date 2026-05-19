# 05 · Drift Detection

## Concept

Terraform's mental model rests on three things being aligned: **your code** (intent), **the state file** (what Terraform thinks it built), and **reality** (what actually exists). When state and reality disagree, that's called **drift**. Someone edited a file by hand. A teammate clicked a button in the AWS console. A process changed a permission. Whatever — the world moved while Terraform wasn't looking.

`terraform plan` doesn't just compare your code to state. It also **refreshes**: re-reads each managed resource from reality, updates state to match, and then computes the plan against your code. This means drift shows up automatically as proposed changes. If reality moved away from your code, plan offers to put it back.

This is one of Terraform's most useful properties: it's continuously reconciling, not just create-once.

## Task

- [ ] Apply a simple `local_file` that writes a known string.
- [ ] Hand-edit the file (using `echo` or your editor) to change its content.
- [ ] Run `terraform plan` and read the drift output carefully.
- [ ] Run `terraform apply` and watch Terraform restore the file to match your code.
- [ ] Try the reverse: delete the file entirely, then plan.

## Run it

```bash
terraform init
terraform apply
cat managed.txt        # should show "Managed by Terraform\n"

# Drift the file out from under Terraform.
echo "I did this by hand" > managed.txt
cat managed.txt

# Now plan. Read the output carefully — look for:
#  - "Note: Objects have changed outside of Terraform"
#  - A "~ update in place" block showing the diff
terraform plan

# Apply restores the file to match your code.
terraform apply
cat managed.txt        # back to "Managed by Terraform\n"

# Now go further: delete the file outright.
rm managed.txt
terraform plan
# This time the resource is going to be RECREATED, not updated —
# Terraform sees it's gone from reality.

terraform apply
cat managed.txt        # back again

terraform destroy
```

## Predict, then verify

1. When you hand-edit `managed.txt`, the state file is unchanged. After running `terraform plan`, does the state file change? (Hint: look at the modify time of `terraform.tfstate` before and after plan.)
2. What's the difference between the plan output when you **edit** the file vs. when you **delete** it? One should be `~ update`; what's the other?
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

For `local_file`, state stores the SHA1 of content, not the literal content (look at `id` in `terraform state show`). On refresh, Terraform reads the file, recomputes the SHA1, and compares. That's how it detects drift cheaply.

</details>

## Common pitfalls

- **Forgetting refresh runs every plan.** If you have many slow or rate-limited data sources / resources, plans can take minutes. `-refresh=false` exists for this, but use it sparingly.
- **"Plan shows nothing wrong" but reality is broken.** Drift in attributes Terraform doesn't track (like file mtime, or fields the provider doesn't model) won't show up. Terraform only watches what its provider exposes.
- **State and reality both changed.** If state is also stale (e.g., partial apply got interrupted), `plan -refresh-only` followed by `apply -refresh-only` is the way to bring state into alignment without applying code changes.

## Experiments

1. **Two-way drift:** change both the file content (by hand) and the `.tf` `content` argument. Predict what plan shows. The diff should be from the new reality to your new code.
2. **Permission drift:** change the file's permissions with `chmod 644 managed.txt` (or whatever differs from the resource's `file_permission` argument). Run plan. Does Terraform notice?
