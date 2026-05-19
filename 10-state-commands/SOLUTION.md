# 10 · State Commands — Solution

## Part A: Inspect

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

## Part D: Import an existing file

```bash
$ echo "I was created by hand" > delta.txt
```

Add to `main.tf`:

```hcl
resource "local_file" "delta" {
  filename = "${path.module}/delta.txt"
  content  = "I was created by hand\n"
}
```

Without import, plan tries to create the file, but `local_file` would happily overwrite. With a real cloud resource the create would conflict (e.g., "bucket already exists"). Better:

```bash
$ terraform import local_file.delta "$(pwd)/delta.txt"
local_file.delta: Importing from ID "..."
local_file.delta: Import prepared!
  Prepared local_file for import
local_file.delta: Refreshing state... [id=...]
Import successful!
```

Now `terraform state list` includes `local_file.delta`. Plan says `No changes` if the content in code matches the content on disk.

The 1.5+ alternative — `import` block in HCL — is preferred because it's reviewable in a PR:

```hcl
import {
  to = local_file.delta
  id = "/full/path/to/delta.txt"
}

resource "local_file" "delta" {
  filename = "${path.module}/delta.txt"
  content  = "I was created by hand\n"
}
```

Run plan/apply. After the import is done (apply succeeds), delete the `import` block.

## Part E: The broken scenario — recovery walkthrough

Setup:

1. `terraform apply` to baseline (three files in state).
2. Make a backup of `gamma.txt` somewhere safe: `cp gamma.txt /tmp/gamma.backup`.
3. Delete the `local_file.gamma` resource block from `main.tf` and apply. Terraform destroys `gamma.txt`.

Recovery:

1. Restore the file: `cp /tmp/gamma.backup gamma.txt`. Reality has the file back.
2. State doesn't know. If you add the resource block back without doing anything else, plan proposes to create, which would overwrite.
3. Restore the resource block in `main.tf`.
4. `terraform import local_file.gamma "$(pwd)/gamma.txt"` — adopt the existing file.
5. `terraform plan` — should say no changes.

This is the closest thing in this tutorial to a real production incident. The pattern recurs: something disappeared from state (or never went in), but exists in reality. `import` is the recovery.

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
