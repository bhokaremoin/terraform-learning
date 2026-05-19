# 08 · Locals and Functions — Solution

## Completed `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.0" }
  }
}

variable "name" {
  type    = string
  default = "Terraform"
}

locals {
  shouty_name = upper(var.name)
  greeting    = format("Hello, %s!", var.name)
  config      = jsondecode(file("${path.module}/config.json"))
  project     = local.config.project
  numbers     = [1, 2, 3]
}

resource "local_file" "info" {
  filename = "${path.module}/info.txt"
  content  = "${local.greeting} You're working on project ${local.project}.\n"
}

resource "local_file" "all_uppercase" {
  filename = "${path.module}/all_uppercase.txt"
  content  = "${local.shouty_name}\n"
}

resource "local_file" "rendered" {
  filename = "${path.module}/rendered.txt"
  content = templatefile("${path.module}/greeting.tftpl", {
    name      = var.name
    timestamp = timestamp()
    numbers   = local.numbers
  })
}

output "project_from_json" {
  value = local.project
}

output "shouty_name" {
  value = local.shouty_name
}
```

## `greeting.tftpl` (create this file)

```text
Hello, ${name}!

This file was rendered at ${timestamp}.
Your favorite numbers:
%{ for n in numbers ~}
  - ${n}
%{ endfor ~}
```

## `config.json` (create this file)

```json
{
  "project": "demo",
  "owner": "moin",
  "max_files": 3
}
```

## Answers to "Predict, then verify"

1. **`${var.name}` (inside a `.tf` string)** references a Terraform input variable from the current configuration. Scope: the whole module. **`${name}` (inside a `.tftpl`)** references a variable from the map you passed as the second argument to `templatefile()`. Scope: just that template invocation. Templates don't see Terraform's variables unless you pass them in explicitly.
2. **Number.** `jsondecode` preserves JSON types: `3` becomes a Terraform number, `"3"` would become a string. Run `terraform console` and try `jsondecode(file("config.json")).max_files * 2` — it'll succeed and return `6`.
3. **`terraform console`** is your REPL. `upper("hello")` returns `"HELLO"`. `local.shouty_name` doesn't work outside the context of a planned/applied configuration unless you've already applied — locals are evaluated against the current configuration and state.

## Useful function categories

| Category | Examples |
|---|---|
| String | `upper`, `lower`, `format`, `join`, `split`, `replace`, `trimspace`, `substr` |
| Collection | `length`, `keys`, `values`, `merge`, `concat`, `flatten`, `distinct`, `lookup`, `coalesce` |
| Encoding | `jsonencode`, `jsondecode`, `yamlencode`, `yamldecode`, `base64encode`, `base64decode` |
| Filesystem | `file`, `fileexists`, `templatefile`, `pathexpand` |
| Type conversion | `tostring`, `tonumber`, `tolist`, `tomap`, `toset`, `try`, `can` |
| Date | `timestamp`, `formatdate`, `timeadd` |
| Numeric | `min`, `max`, `abs`, `pow`, `ceil`, `floor` |
| Crypto | `md5`, `sha1`, `sha256`, `bcrypt`, `uuid` |

You can list them all with `terraform console` and tab completion, or read `https://developer.hashicorp.com/terraform/language/functions`.

## Answers to the experiments

1. **Locals depend on locals.** Dependency-ordered evaluation. Terraform builds a graph internally, same as resources. Textual order in the file doesn't matter.
2. **Inline vs templatefile.** For one-liners, `format` is fine. For anything multi-line — scripts, JSON config, YAML — `templatefile` is dramatically more readable. You can also lint the template file as its own thing (e.g., with `jq` if it's JSON).
