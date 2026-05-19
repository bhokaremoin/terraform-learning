# 10 · State Commands

## Concept

Most of the time you'll never touch state directly — `plan` and `apply` keep it in sync. But occasionally you'll need to. You might rename a resource (state thinks it's still under the old name and wants to destroy/recreate). You might want to remove something from Terraform's management without deleting it from reality. You might want to bring an existing real resource under management. The `terraform state` subcommands and `terraform import` are how you do these surgeries safely.

Knowing these commands is a force multiplier. Without them, refactoring Terraform code that's already been applied means either accepting churn (destroy and recreate) or hand-editing the state file (don't). With them, you can do non-destructive renames, splits, merges, and adoptions.

This exercise puts you in a few realistic scrapes and asks you to fix them with state commands.

## Task

- [ ] **Part A: Inspect.** Run `terraform apply`, then explore `terraform state list` and `terraform state show`.
- [ ] **Part B: Rename without churn.** Rename one resource in your `.tf` and use `terraform state mv` so apply is a no-op rather than destroy+create.
- [ ] **Part C: Forget without deleting.** Remove a resource from Terraform's state with `terraform state rm` and confirm the file on disk still exists.
- [ ] **Part D: Adopt an existing file.** Create a file by hand, then write a `resource` block matching it, then use `terraform import` to bring it into state.
- [ ] **Part E: The broken scenario.** Follow the steps below to break state, then fix it with state commands.

## Run it

```bash
terraform init
terraform apply
# Confirm three files exist: alpha.txt, beta.txt, gamma.txt

# --- Part A: inspect ---
terraform state list
terraform state show local_file.alpha
terraform show          # full state, all resources, pretty-printed

# --- Part B: rename without churn ---
# Edit main.tf: rename `local_file.alpha` to `local_file.first`.
terraform plan       # plan will show DESTROY local_file.alpha + CREATE local_file.first
# That's because state doesn't know they're the same. Fix with state mv:
terraform state mv local_file.alpha local_file.first
terraform plan       # now: No changes.

# --- Part C: forget without deleting ---
terraform state rm local_file.beta
ls -la beta.txt      # still exists on disk!
terraform state list # local_file.beta gone from state
# If you apply now, beta.txt is no longer Terraform-managed.
# Terraform sees `local_file.beta` declared in code and will try to RECREATE it.
# To make this stick, also delete the resource block from main.tf.

# --- Part D: import an existing file ---
echo "I was created by hand" > delta.txt
# In main.tf, add:
#   resource "local_file" "delta" { filename = "delta.txt"; content = "I was created by hand\n" }
terraform plan       # Terraform wants to CREATE delta.txt — but it already exists!
# Bring it under management instead:
terraform import local_file.delta delta.txt
terraform plan       # now: No changes (if content matches what's on disk).

# --- Part E: the broken scenario ---
# 1. terraform apply to baseline.
# 2. Hand-edit terraform.tfstate.backup or simulate corruption: just delete
#    one resource block in main.tf without state mv, and apply.
#    The file gets destroyed. Now in state you have N-1 resources but the
#    REAL file on disk (if you copied it elsewhere first) might still exist.
# 3. Use `terraform state` and `terraform import` to recover.

terraform destroy
```

## Predict, then verify

1. What does `terraform state list` look like before and after `state mv`?
2. After `terraform state rm local_file.beta`, what does `terraform plan` propose if `local_file.beta` is still in your code?
3. After a successful `terraform import`, does plan show 0 or 1 change?

## Hints

<details>
<summary>Hint 1 — state mv syntax</summary>

```bash
terraform state mv <source_address> <destination_address>
```

Both addresses must be in `terraform state`'s address syntax — quote them if they contain special characters like `[`, `]`, or `"`:

```bash
terraform state mv 'local_file.things[0]' 'local_file.things["alpha"]'
```

</details>

<details>
<summary>Hint 2 — import syntax varies by provider</summary>

```bash
terraform import <resource_address> <provider_specific_id>
```

For `local_file`, the ID is just the file path: `terraform import local_file.delta delta.txt`. For other providers it might be an ARN, a UUID, a composite key — check the provider docs.

Modern alternative (Terraform 1.5+): declarative `import` blocks in HCL.

```hcl
import {
  to = local_file.delta
  id = "delta.txt"
}

resource "local_file" "delta" {
  filename = "delta.txt"
  content  = "I was created by hand\n"
}
```

Run plan/apply and the import happens. Delete the `import` block afterward.

</details>

<details>
<summary>Hint 3 — state rm is for "stop managing", not "delete"</summary>

`terraform state rm` only removes from state. The thing in reality is left alone. The next plan will see the resource declared in your `.tf` files but missing from state, and propose to **create** it — which usually means duplicating reality. So either remove the resource from code at the same time, or import it back, or replace it intentionally.

</details>

## Common pitfalls

- **Never hand-edit `terraform.tfstate`.** State has internal consistency requirements (versions, dependency hints, sensitive markers) you'll miss. Always go through `terraform state ...` commands.
- **`state mv` doesn't talk to the cloud.** It only changes Terraform's labels. The real resource is untouched. That's what you want — but it also means a bad `mv` can leave you with state pointing at the wrong thing.
- **Back up before surgery.** Terraform writes `terraform.tfstate.backup` automatically before mutations, but if you're doing several operations, `cp terraform.tfstate state.json.before-rename` is cheap insurance.
- **Import doesn't write your code.** You still need a matching `resource` block. If you import and then run plan with a slightly different code, plan shows updates to "fix" the differences. Look carefully — sometimes that's what you want, sometimes you'd rather make the code match reality first.

## Experiments

1. **Move a resource INTO a module.** If you have `local_file.alpha` at the root and want it inside `module.foo`, that's:
   ```bash
   terraform state mv local_file.alpha module.foo.local_file.alpha
   ```
   Without this, refactoring code into modules causes destroy+create. State mv keeps it.
2. **Reverse an import.** After importing `local_file.delta`, run `terraform state rm local_file.delta`. The file is still there; Terraform forgot. This is how you "give up management" of a resource without destroying it.
