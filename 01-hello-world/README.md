# 01 · Hello World

## Concept

Every Terraform configuration is built from **resources**. A resource is a thing you want Terraform to create, update, and eventually destroy. The simplest possible resource is a local file, which we'll use throughout this tutorial because it requires no cloud account and behaves like a "real" resource: it has attributes, it has a lifecycle, and you can inspect it.

A `resource` block has a type (`local_file`), a name you choose (`hello`), and a set of arguments. Together, the type and name form an **address** — `local_file.hello` — that Terraform uses to refer to this specific resource everywhere: in state, in plan output, in references from other resources.

## Task

- [ ] Open `main.tf` and finish the `local_file` resource so it writes `Hello, Terraform!` to a file called `hello.txt` in this directory.
- [ ] Run the full lifecycle: `init`, `plan`, `apply`, then `destroy`.
- [ ] Observe what files exist on disk before and after each step.

## Run it

```bash
# Initialize: downloads the local provider into .terraform/, creates a lockfile.
# Look for: "Terraform has been successfully initialized!"
terraform init

# Plan: show me what you would do. Changes nothing.
# Look for: "Plan: 1 to add, 0 to change, 0 to destroy."
terraform plan

# Apply: do it. Type "yes" when prompted.
# Look for: "Apply complete! Resources: 1 added, 0 changed, 0 destroyed."
terraform apply

# Inspect: a file should now exist
ls -la hello.txt
cat hello.txt

# Destroy: undo it.
# Look for: "Destroy complete! Resources: 1 destroyed."
terraform destroy
```

## Predict, then verify

Before you run `terraform plan` for the first time:

1. How many resources will Terraform create?
2. What symbol will appear in the plan output next to the resource?
3. After `apply`, what new files will exist in this directory (Terraform's bookkeeping files included)?

Now run the commands and check.

## Hints

<details>
<summary>Hint 1 — what arguments does `local_file` need?</summary>

The `local_file` resource needs at minimum two arguments: `filename` (where to write) and `content` (what to write).

</details>

<details>
<summary>Hint 2 — syntax</summary>

```hcl
resource "local_file" "hello" {
  filename = "..."
  content  = "..."
}
```

</details>

<details>
<summary>Hint 3 — full solution shape</summary>

```hcl
resource "local_file" "hello" {
  filename = "${path.module}/hello.txt"
  content  = "Hello, Terraform!\n"
}
```

`path.module` is a special expression for "the directory this `.tf` file is in." You could also write `"hello.txt"` directly — both work.

</details>

## Common pitfalls

- **Forgetting `terraform init`.** If `plan` errors with "Inconsistent dependency lock file" or "Could not load plugin," you skipped init or changed providers. Re-run init.
- **Editing files inside `.terraform/`.** That's a local cache directory created by `init`. Never edit it by hand. Gitignore it.

## Experiments

1. Run `apply` twice in a row without changing anything. What does the second `plan`/`apply` say? Why?
2. After `apply`, run `terraform state list` and `terraform state show local_file.hello`. What's stored about your resource?
