# 02 · Variables and Outputs — Solution

## Completed `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

variable "filename" {
  type        = string
  default     = "greeting.txt"
  description = "The name of the file to create"
}

variable "greeting" {
  type        = string
  default     = "Hello"
  description = "The greeting word"
}

variable "name" {
  type        = string
  description = "Who to greet (required)"
}

resource "local_file" "greeting" {
  filename = var.filename
  content  = "${var.greeting}, ${var.name}!\n"
}

output "file_path" {
  value       = local_file.greeting.filename
  description = "Where Terraform wrote the file"
}

output "file_size" {
  value       = length(local_file.greeting.content)
  description = "Size of the file content in bytes"
}
```

## Answers to "Predict, then verify"

1. **Without `name`**, Terraform prompts: `var.name: Enter a value:`. If you're in a non-interactive context it errors with `No value for required variable`. The error is at the start of plan, not deep into evaluation.
2. **`Hello, World!\n`** is 14 bytes. The `length()` function on a string returns the number of bytes (technically grapheme clusters since 1.5+, but for ASCII it's the same).
3. **`-var` wins over `terraform.tfvars`.** Command-line flags are highest precedence. The order is: `-var`/`-var-file` > `*.auto.tfvars` > `terraform.tfvars` > `TF_VAR_*` env > variable default.

## Answers to the experiments

1. **`TF_VAR_name=Env`** is picked up automatically. Any environment variable prefixed `TF_VAR_` becomes an input variable. Useful for CI, dangerous for laptops — easy to forget what's set.
2. **Type mismatch** errors cleanly: `"World" is not a number`. Terraform's static type system catches this at plan time, before any side effects.

## Variable types reference

```hcl
variable "s"   { type = string }
variable "n"   { type = number }
variable "b"   { type = bool }
variable "lst" { type = list(string) }
variable "set" { type = set(string) }
variable "m"   { type = map(string) }
variable "obj" { type = object({ name = string, age = number }) }
variable "any" { type = any }   # discourage; lose type safety
```

Add a `validation` block for stronger guarantees:

```hcl
variable "port" {
  type = number
  validation {
    condition     = var.port > 0 && var.port < 65536
    error_message = "port must be 1-65535"
  }
}
```
