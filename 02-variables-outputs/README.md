# 02 · Variables and Outputs

## Concept

Hardcoded values are fine for hello world but useless in practice. **Variables** are the inputs to your configuration — strings, numbers, lists, maps, anything you'd want to change without editing the resource itself. You declare them with a `variable` block, give them a type and optionally a default and a description, and reference them as `var.<name>`. You can set their values at the command line (`-var`), in a file (`terraform.tfvars`), via environment variables (`TF_VAR_<name>`), or interactively when prompted.

**Outputs** are the other side of the same coin. After `apply`, the state holds everything Terraform knows about your resources, but you usually don't want to dig through state to find one value. An `output` block exposes a specific value at the top level: it prints after apply, can be retrieved with `terraform output`, and (later) becomes the public API of a module.

## Task

- [ ] Declare two variables: `filename` (string, default `"greeting.txt"`) and `greeting` (string, default `"Hello"`).
- [ ] Declare a variable `name` with no default — Terraform should prompt or error if you don't provide it.
- [ ] Use them in a `local_file` resource so the file is named `var.filename` and contains `"<greeting>, <name>!"` on one line.
- [ ] Add two outputs: `file_path` (the absolute path of the created file) and `file_size` (its size in bytes from the resource attributes).
- [ ] Provide the `name` value via `-var` on the command line, then again via a `terraform.tfvars` file.

## Run it

```bash
terraform init

# This will FAIL — name has no default. Read the error.
terraform plan

# Pass name on the command line.
# Look for: filename and content interpolated correctly.
terraform plan -var="name=World"
terraform apply -var="name=World"

# After apply, outputs print at the bottom. Also:
terraform output
terraform output file_path

# Now create a terraform.tfvars file so you don't have to repeat -var.
echo 'name = "Terraform"' > terraform.tfvars
terraform plan         # picks up name from terraform.tfvars automatically

# Override with a flag (flags beat tfvars beat env beat defaults):
terraform plan -var="greeting=Bonjour"

terraform destroy -var="name=World"
```

## Predict, then verify

1. When you run the first `terraform plan` with no `name` provided, what kind of error do you expect? Does Terraform fail fast at parse time, or only when it tries to use `var.name`?
2. After `terraform apply -var="name=World"`, what will the `file_size` output be? Count the bytes by hand — `Hello, World!` plus a newline if you added one.
3. When you have `terraform.tfvars` set to `"Terraform"` and pass `-var="name=World"`, which wins?

## Hints

<details>
<summary>Hint 1 — variable block syntax</summary>

```hcl
variable "filename" {
  type        = string
  default     = "greeting.txt"
  description = "The file to create"
}
```

A variable without a `default` is required.

</details>

<details>
<summary>Hint 2 — interpolating strings</summary>

Use `${...}` inside a string to splice in expressions:

```hcl
content = "${var.greeting}, ${var.name}!\n"
```

Or use the `format` function:

```hcl
content = format("%s, %s!\n", var.greeting, var.name)
```

</details>

<details>
<summary>Hint 3 — output block syntax</summary>

```hcl
output "file_path" {
  value       = local_file.greeting.filename
  description = "Where Terraform wrote the file"
}
```

`local_file` exposes a `content_sha256` attribute but not a `file_size` attribute directly. To get the size you can use `length(local_file.greeting.content)` (number of bytes in the content string — close enough for ASCII).

</details>

## Common pitfalls

- **Forgetting to quote strings.** HCL strings are double-quoted (`"foo"`), not single. `'foo'` is a parse error.
- **Variable precedence surprise.** Order, highest priority first: `-var` and `-var-file` on the command line, then `*.auto.tfvars`, then `terraform.tfvars`, then `TF_VAR_<name>` env vars, then defaults. A `-var` flag beats your `terraform.tfvars`.

## Experiments

1. Set `TF_VAR_name=Env` in your shell and run plan with no `-var`. Does it pick it up?
2. Change the variable type to `number` and pass `name="World"`. Read the error — Terraform's type system caught it at plan time.
