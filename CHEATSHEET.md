# Terraform Cheatsheet

A compact reference. Keep this open while you work.

## Block syntax

```hcl
# Required provider versions and Terraform version
terraform {
  required_version = ">= 1.5"
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.0" }
  }
}

# Provider configuration (most local providers need no config)
provider "local" {}

# Resource: something Terraform creates and manages
resource "<TYPE>" "<NAME>" {
  attribute = value
}

# Variable: an input
variable "<NAME>" {
  type        = string
  default     = "hello"
  description = "what this is for"
  sensitive   = false
  validation {
    condition     = length(var.name) > 0
    error_message = "must not be empty"
  }
}

# Output: a value surfaced after apply
output "<NAME>" {
  value       = resource_type.name.attr
  description = "what this is"
  sensitive   = false
}

# Data source: something Terraform reads but doesn't manage
data "<TYPE>" "<NAME>" {
  argument = value
}

# Locals: computed values, no inputs
locals {
  upper_name = upper(var.name)
  tags       = { env = "dev", owner = "me" }
}

# Module: a reusable group of resources
module "<NAME>" {
  source = "./modules/greeting"
  name   = "world"
}
```

## Reference syntax

| You want… | Write… |
|---|---|
| A variable | `var.name` |
| A local | `local.name` |
| A resource attribute | `<TYPE>.<NAME>.<ATTR>` (e.g. `random_pet.example.id`) |
| A data source attribute | `data.<TYPE>.<NAME>.<ATTR>` |
| A module output | `module.<NAME>.<OUTPUT>` |
| The current resource (inside it) | `self.<ATTR>` (inside provisioners/lifecycle only) |
| Each item in a `for_each` | `each.key`, `each.value` |
| Each index in a `count` | `count.index` |
| One of a `count`-ed set | `<TYPE>.<NAME>[0].<ATTR>` |
| One of a `for_each`-ed set | `<TYPE>.<NAME>["key"].<ATTR>` |

## Built-in functions (most useful ones)

**String:** `upper`, `lower`, `title`, `format`, `formatlist`, `replace`, `split`, `join`, `trim`, `trimspace`, `substr`, `regex`, `regexall`.

**Collection:** `length`, `keys`, `values`, `contains`, `lookup`, `merge`, `concat`, `flatten`, `distinct`, `sort`, `reverse`, `element`, `index`, `slice`, `range`, `zipmap`, `setunion`, `setintersection`.

**Encoding:** `jsonencode`, `jsondecode`, `yamlencode`, `yamldecode`, `base64encode`, `base64decode`, `urlencode`.

**Filesystem:** `file("path")`, `fileexists("path")`, `templatefile("path", { vars })`, `abspath`, `dirname`, `basename`, `pathexpand`.

**Numeric:** `min`, `max`, `abs`, `ceil`, `floor`, `pow`, `parseint`.

**Type/conversion:** `tostring`, `tonumber`, `tobool`, `tolist`, `tomap`, `toset`, `try`, `can`, `coalesce`.

**Date/time:** `timestamp`, `formatdate`, `timeadd`.

**Crypto/hash:** `md5`, `sha1`, `sha256`, `sha512`, `bcrypt`, `uuid`.

Run `terraform console` to experiment with any of these interactively.

## Command reference

| Command | What it does |
|---|---|
| `terraform init` | Initialize working dir, download providers, set up backend |
| `terraform fmt` | Auto-format `.tf` files to canonical style |
| `terraform fmt -check` | Fail if any file isn't formatted (CI) |
| `terraform validate` | Static check that the config is internally consistent |
| `terraform plan` | Show what apply would do, change nothing |
| `terraform plan -out=tfplan` | Save plan to a file for later apply |
| `terraform apply` | Execute plan; prompts for confirmation |
| `terraform apply -auto-approve` | Skip confirmation (CI, dangerous interactively) |
| `terraform apply tfplan` | Apply a saved plan |
| `terraform destroy` | Destroy everything in this state |
| `terraform output` | Show all outputs |
| `terraform output <name>` | Show one output |
| `terraform output -json` | Machine-readable output |
| `terraform console` | Interactive REPL for expressions |
| `terraform show` | Pretty-print current state or a plan file |
| `terraform graph` | DOT graph of dependencies |
| `terraform refresh` | Re-read reality and update state (deprecated in favor of `plan -refresh-only`) |
| `terraform state list` | List all resources in state |
| `terraform state show <addr>` | Show one resource's state |
| `terraform state mv <src> <dst>` | Rename a resource in state without destroying |
| `terraform state rm <addr>` | Forget a resource (it stays in reality) |
| `terraform import <addr> <id>` | Adopt an existing real resource into state |
| `terraform taint <addr>` | Mark a resource for recreation on next apply (legacy; prefer `apply -replace=<addr>`) |
| `terraform apply -replace=<addr>` | Force one resource to be destroyed and recreated |
| `terraform workspace list` | List workspaces |
| `terraform workspace new <name>` | Create a workspace |
| `terraform login` / `logout` | Auth to Terraform Cloud |

## Plan output symbols

| Symbol | Meaning |
|---|---|
| `+` | Create |
| `-` | Destroy |
| `~` | Update in place |
| `-/+` | Destroy then create (replacement) |
| `<=` | Read (data source) |

## Gotchas to remember

- **State is sensitive.** It can contain secrets in plaintext. Never commit `terraform.tfstate` to git. Use remote state for anything real.
- **Don't hand-edit `terraform.tfstate`.** Use `terraform state` subcommands instead.
- **`terraform.tfstate.backup`** is automatic. If you destroy state, you have one undo.
- **`count` vs `for_each`:** with `count`, inserting an item in the middle of the list re-indexes everything after it, causing churn. Prefer `for_each` for stable addressing.
- **`local_file` files are NOT a backend.** They're managed resources. Editing them by hand creates drift, which Terraform will reconcile on the next apply.
- **Implicit dependencies** are inferred from references in expressions. Use `depends_on` only when there's a real dependency Terraform can't see (rare).
- **`terraform init` is required** after adding/removing modules or changing provider versions. Cheap to run; just do it when in doubt.
- **`.terraform/` and `.terraform.lock.hcl`:** the directory is local cache, gitignore it. The lockfile pins provider versions; commit it.
- **`sensitive = true`** on a variable or output hides values in CLI output, not in state. Don't rely on it for actual secrecy.
- **`plan -out=file`** then `apply file` is the only way to guarantee the apply matches what you reviewed.
