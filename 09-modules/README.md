# 09 · Modules

## Concept

Once your configuration has more than a handful of resources, you'll want to group related ones into reusable units. A **module** is a directory of `.tf` files with declared inputs (`variable`) and outputs (`output`) — a self-contained unit you can call from somewhere else. The root configuration (the directory you run `terraform apply` in) is itself a module — the **root module**. Modules you call from there are **child modules**.

Calling a module looks like instantiating a function. You write a `module` block, point `source` at the directory, pass arguments matching its `variable` blocks, and reference its `output` blocks via `module.<name>.<output>`. You can call the same module multiple times with different inputs — and that's the main reason modules exist.

The key property: a module is a **black box** to its callers. The caller sees inputs and outputs; what happens inside is the module's concern. This is the same encapsulation idea as functions or classes in any language, applied to infrastructure.

## Task

- [ ] Look at the existing module at `modules/greeting/`.
- [ ] In the root `main.tf`, call this module **twice** — once with `name = "World"` (writing to `world-greeting.txt`), once with `name = "Terraform"` (writing to `terraform-greeting.txt`).
- [ ] Add a root-level output that exposes both file paths produced by the two module calls.
- [ ] Run apply and inspect the result.

## Run it

```bash
terraform init   # init now also pulls in child modules from local paths
terraform plan
terraform apply

ls -la *-greeting.txt
cat world-greeting.txt
cat terraform-greeting.txt
terraform output

terraform destroy
```

## Predict, then verify

1. How will the two file resources be addressed in `terraform state list`? Specifically, how does the address show which module instance owns each resource?
2. If you change `name` on one of the module instances and re-apply, does the other instance change too?
3. What happens if you don't pass a required variable to the module? At what stage does Terraform tell you?

## Hints

<details>
<summary>Hint 1 — module block syntax</summary>

```hcl
module "world" {
  source = "./modules/greeting"
  name   = "World"
}
```

`source` can be a local path, a git URL, a Terraform Registry address, or several others. Local paths are the simplest.

</details>

<details>
<summary>Hint 2 — referencing module outputs</summary>

```hcl
output "world_path" {
  value = module.world.file_path
}
```

`module.world.file_path` reads the `file_path` output declared in the child module.

</details>

<details>
<summary>Hint 3 — calling the same module twice</summary>

```hcl
module "world" {
  source = "./modules/greeting"
  name   = "World"
}

module "terraform_team" {
  source = "./modules/greeting"
  name   = "Terraform"
}
```

Two `module` blocks, same `source`, different names and different inputs. Each gets its own state of resources.

</details>

## Common pitfalls

- **Modules require `init`.** Whenever you add, remove, or change the `source` of a module, re-run `terraform init`. The plugin cache also caches module references.
- **Don't put providers in child modules unless you must.** Modules inherit providers from their caller by default. Putting a `provider` block inside a module locks downstream callers out of configuring it themselves. Pattern: declare `required_providers` in the module (so its dependencies are explicit), but configure them in the root.
- **Versioning local modules.** When `source = "./..."` you can't pin a version. For shared modules, publish to the Terraform Registry or a git repo with tags so you can pin `version = "1.2.0"` in the caller.

## Experiments

1. Modify the child module to add a new output, say `file_size`. Then surface it from the root and run plan. Note: you have to re-run `init` after changing module structure.
2. Call the module three times using `for_each`:

   ```hcl
   module "greetings" {
     source   = "./modules/greeting"
     for_each = toset(["Alice", "Bob", "Carol"])
     name     = each.key
   }
   ```

   Reference `module.greetings["Alice"].file_path`. Predict what state list shows.
