# 09 · Modules — Solution

## Completed root `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.0" }
  }
}

module "world" {
  source = "./modules/greeting"
  name   = "World"
}

module "terraform_team" {
  source = "./modules/greeting"
  name   = "Terraform"
}

output "world_path" {
  value = module.world.file_path
}

output "terraform_team_path" {
  value = module.terraform_team.file_path
}
```

## Layout

```
09-modules/
├── main.tf                          # root: calls the module twice
└── modules/
    └── greeting/
        ├── main.tf                  # child: declares the resource
        ├── variables.tf             # child: declares its inputs
        └── outputs.tf               # child: declares its outputs
```

Splitting variables/outputs/main into separate files is convention, not requirement. Terraform reads all `.tf` files in a directory and concatenates them.

## Answers to "Predict, then verify"

1. **`terraform state list`** shows:
   ```
   module.world.local_file.greeting
   module.terraform_team.local_file.greeting
   ```
   Resources in modules are prefixed with `module.<call_name>.`. Two different module calls produce two distinct addresses even though they're "the same" resource type with the same name inside the module.
2. **Changing `name` on one module instance** only affects that one. The other module call is an independent set of resources with its own state. This is the whole reason for modules — encapsulation with reuse.
3. **Missing required variable.** Terraform tells you at plan time with an error like `Missing required argument: The argument "name" is required`. The validation we added (`length > 0`) also fires at plan, before any side effects.

## Module sources

Local paths are the simplest. Some other forms:

```hcl
# Terraform Registry (public or private)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
}

# Git over HTTPS
module "vpc" {
  source = "git::https://github.com/example/modules.git//vpc?ref=v1.2.0"
}

# Git over SSH
module "vpc" {
  source = "git::ssh://git@github.com/example/modules.git//vpc?ref=v1.2.0"
}
```

The `ref=v1.2.0` (or a commit SHA) is your version pin for git sources.

## Answers to the experiments

1. **Add an output to the module.** Edit `modules/greeting/outputs.tf` to add a new output, then surface it from the root with `module.world.<new_output>`. Run `terraform init` again — Terraform won't pick up the new module shape until you do.
2. **`for_each` on a module.** Addresses become `module.greetings["Alice"].local_file.greeting`. Same idea as `for_each` on a resource, but applied to a whole module instance. Powerful for "N copies of this stack" patterns.
