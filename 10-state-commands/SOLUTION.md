# 10 · State Commands — Solution

## Part A: Inspect

After `terraform apply` (just the starter — `random_integer.adopted` gets added in Part D), `state list` shows the three files:

```bash
$ terraform state list
local_file.alpha
local_file.beta
local_file.gamma

$ terraform state show local_file.alpha
# local_file.alpha:
resource "local_file" "alpha" {
    content              = "alpha\n"
    content_base64sha256 = "..."
    content_base64sha512 = "..."
    content_md5          = "..."
    content_sha1         = "..."
    content_sha256       = "..."
    content_sha512       = "..."
    directory_permission = "0777"
    file_permission      = "0777"
    filename             = ".../alpha.txt"
    id                   = "..."   # SHA1 of content
}
```

`terraform show` (no subcommand) prints all of state, formatted like HCL. Useful for skimming.

## Part B: Rename without churn

Edit `main.tf` — rename the address `local_file.alpha` to `local_file.first`:

```hcl
resource "local_file" "first" {
  filename = "${path.module}/alpha.txt"
  content  = "alpha\n"
}
```

Without state surgery, plan says:

```text
  # local_file.alpha will be destroyed
  # local_file.first will be created
Plan: 1 to add, 0 to change, 1 to destroy.
```

Terraform sees an address that vanished and a new address that appeared. It doesn't know they're related.

Use `state mv`:

```bash
terraform state mv local_file.alpha local_file.first
# Move "local_file.alpha" to "local_file.first"
# Successfully moved 1 object(s).
```

Now plan says `No changes. Your infrastructure matches the configuration.` The resource has been renamed in state without touching the real file.

For Terraform 1.5+, there's also a declarative version using `moved` blocks:

```hcl
moved {
  from = local_file.alpha
  to   = local_file.first
}
```

Add the block, run plan, see that it acknowledges the move. After applying, you can delete the `moved` block. This is preferred for renames in committed code because the move is visible in diff review.

## Part C: Forget without deleting

```bash
$ terraform state rm local_file.beta
Removed local_file.beta
Successfully removed 1 resource instance(s).

$ ls -la beta.txt
-rw-r--r-- 1 you you 5 ... beta.txt   # still there

$ terraform state list
local_file.first
local_file.gamma
```

But if `local_file.beta` is still in your `.tf` code, the next plan proposes to **create** it — Terraform doesn't know one already exists. To make state rm meaningful, also remove the resource block from main.tf. Or, if you want to undo: `terraform import local_file.beta beta.txt`.

## Part D: Import an existing value

Add to `main.tf`:

```hcl
resource "random_integer" "adopted" {
  min = 1
  max = 100
}
```

Running plan now would roll a fresh random integer — not what we want; we're pretending there's already a `random_integer` we'd like to manage without changing its value. Import instead:

```bash
$ terraform import random_integer.adopted "42,1,100"
random_integer.adopted: Importing from ID "42,1,100"...
random_integer.adopted: Import prepared!
  Prepared random_integer for import
random_integer.adopted: Refreshing state... [id=42]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.
```

Then:

```bash
$ terraform state show random_integer.adopted
# random_integer.adopted:
resource "random_integer" "adopted" {
    id     = "42"
    max    = 100
    min    = 1
    result = 42
}

$ terraform plan
random_integer.adopted: Refreshing state... [id=42]

No changes. Your infrastructure matches the configuration.
```

The 1.5+ alternative — declarative `import` block in HCL — is preferred because it's reviewable in a PR:

```hcl
import {
  to = random_integer.adopted
  id = "42,1,100"
}

resource "random_integer" "adopted" {
  min = 1
  max = 100
}
```

Run plan/apply. Plan reports `Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.`. After apply succeeds, delete the `import` block.

### Why we don't use `local_file` for the import demo

`local_file` does **not** implement import. If you try, you get:

```text
$ terraform import local_file.delta delta.txt
Error: Resource Import Not Implemented

This resource does not support import. Please contact the provider developer
for additional information.
```

That's a provider implementation choice, not a Terraform limitation. Most cloud resources you'll meet (AWS, GCP, Azure, Datadog, Snowflake, …) do support import. When in doubt, search the provider's docs page for the resource and look for an "Import" section at the bottom.

## Part E: The broken scenario — recovery walkthrough

This part uses the `random_integer` import you just learned, because it's the one resource in this exercise that's actually recoverable via import.

Setup:

1. `terraform apply` to baseline (alpha/beta/gamma files, plus `random_integer.adopted` from Part D).
2. Record the imported result: `terraform output` won't show it unless we add an output, so use `terraform state show random_integer.adopted` and note `result = 42`.
3. Simulate state corruption: `terraform state rm random_integer.adopted`. Now state doesn't know about the resource, but conceptually "the value 42" still exists.

Recovery:

1. The `resource` block is still in `main.tf`. Plan now wants to create a fresh `random_integer` — which would roll a brand-new number, losing 42.
2. Instead, re-import: `terraform import random_integer.adopted "42,1,100"`.
3. `terraform plan` — `No changes`. State and code are reconciled.

This is the closest thing in this tutorial to a real production incident. The pattern recurs constantly: something disappeared from state (or never went in), but exists in reality. `terraform import` is the recovery. For resources whose provider doesn't support import, the only recovery is to make the code match reality and accept the (re)create — which is fine for stateless things like a local file but catastrophic for a database.

## Answers to "Predict, then verify"

1. **Before `state mv`:** `local_file.alpha`, `local_file.beta`, `local_file.gamma`. After: `local_file.first`, `local_file.beta`, `local_file.gamma`.
2. **After `state rm local_file.beta` with the resource still in code:** plan proposes to **create** `local_file.beta` (1 to add). State and code disagree about its existence.
3. **After successful `import`:** plan shows `No changes` if the code matches reality. If not, plan shows in-place updates to make reality match code — review carefully before applying.

## State command reference

| Command | Use case |
|---|---|
| `terraform state list` | List all resources |
| `terraform state list <pattern>` | List matching a pattern (e.g., `'module.foo.*'`) |
| `terraform state show <addr>` | Show one resource's full state |
| `terraform state mv <src> <dst>` | Rename / move into a module / refactor without churn |
| `terraform state rm <addr>` | Stop managing (does NOT delete reality) |
| `terraform state pull` | Print state to stdout (raw JSON) |
| `terraform state push <file>` | Replace state with the contents of a file (dangerous) |
| `terraform state replace-provider <old> <new>` | Migrate to a renamed provider |
| `terraform import <addr> <id>` | Adopt an existing real resource |
| `moved { ... }` block | Declarative renames |
| `import { ... }` block | Declarative imports |
