# 01 · Hello World — Solution

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

resource "local_file" "hello" {
  filename = "${path.module}/hello.txt"
  content  = "Hello, Terraform!\n"
}
```

## What just happened

After `terraform init`, your directory has:

- `.terraform/` — local cache holding the provider plugin Terraform downloaded.
- `.terraform.lock.hcl` — a lockfile pinning the provider versions and checksums. Commit this. It's how teammates and CI get bit-for-bit identical provider binaries.

After `terraform apply`, you also have:

- `hello.txt` — the file the resource created.
- `terraform.tfstate` — Terraform's record of what it built. This file is the **state**. It records that a resource with address `local_file.hello` exists, and stores its known attributes (id, filename, content hash, etc).

Re-running `terraform apply` with no code changes prints `No changes. Your infrastructure matches the configuration.` because Terraform compares your code to its state to reality and sees nothing to do.

## Answers to "Predict, then verify"

1. **One resource will be created.** Plan shows `Plan: 1 to add, 0 to change, 0 to destroy.`
2. **`+` (create) appears next to `# local_file.hello will be created`.**
3. After `apply` you'll have:
   - `hello.txt` (the resource)
   - `terraform.tfstate` (Terraform's memory)
   - `.terraform/` and `.terraform.lock.hcl` from init
   - On the next `apply` you may also see `terraform.tfstate.backup`.

## Answers to the experiments

1. **Apply twice.** The second `plan` reports `No changes`. Terraform compared its state to the code and to reality and found nothing to reconcile. This idempotence is the central guarantee of Terraform.
2. **`terraform state list`** prints `local_file.hello` — just the resource address. **`terraform state show local_file.hello`** prints all known attributes: `id` (a SHA1 of content), `filename`, `content`, file permissions, etc. This is what's in the state file, formatted.
