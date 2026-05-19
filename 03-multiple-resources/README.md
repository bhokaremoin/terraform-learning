# 03 · Multiple Resources and References

## Concept

Real configurations have dozens or hundreds of resources, and the order in which they're created matters. A virtual machine has to exist before a DNS record can point to it; a subnet has to exist before a VM can launch in it. Terraform doesn't ask you to write that ordering by hand. Instead, it reads your code, finds every place one resource references another, and builds a dependency graph from those references. It then creates independent resources in parallel and dependent ones in the right order.

Today we'll use the `random` provider to make this concrete. `random_pet` generates a friendly random name (`stable-mongoose`, `cool-otter`). We'll then use that name inside a `local_file`'s filename. Because `local_file` references `random_pet`, Terraform knows the pet must be created first.

## Task

- [ ] Add the `hashicorp/random` provider to `required_providers`.
- [ ] Create a `random_pet` resource named `name` with `length = 2`.
- [ ] Create a `local_file` resource whose `filename` includes the pet's name (e.g., `"./greeting-${random_pet.name.id}.txt"`).
- [ ] Output the pet name and the final file path.
- [ ] Run `terraform graph` and look at the dependency edges.

## Run it

```bash
terraform init   # downloads BOTH local and random providers

# Watch the order in the plan: random_pet first, then local_file.
terraform plan
terraform apply

# Look at what was created. The file name has a random pet inside.
ls -la greeting-*.txt
terraform output

# Visualize the dependency graph. Pipe through `dot` if installed,
# or just read the text output — it's a DOT-language graph.
terraform graph

terraform destroy
```

## Predict, then verify

1. In what order will Terraform create the two resources? Why?
2. If you run `apply` and then `apply` again, will the pet name change? Why or why not?
3. If you change `length = 2` to `length = 3` and re-apply, what does the plan show? (You'll explore this fully in exercise 06 — just make a guess now.)

## Hints

<details>
<summary>Hint 1 — the random provider block</summary>

```hcl
terraform {
  required_providers {
    local  = { source = "hashicorp/local",  version = "~> 2.0" }
    random = { source = "hashicorp/random", version = "~> 3.0" }
  }
}
```

</details>

<details>
<summary>Hint 2 — random_pet attributes</summary>

`random_pet`'s primary attribute is `id` — that's the generated name. So `random_pet.name.id` gives you something like `stable-mongoose`.

</details>

<details>
<summary>Hint 3 — full pattern</summary>

```hcl
resource "random_pet" "name" {
  length = 2
}

resource "local_file" "greeting" {
  filename = "${path.module}/greeting-${random_pet.name.id}.txt"
  content  = "Hello from ${random_pet.name.id}!\n"
}
```

The reference `random_pet.name.id` inside `local_file.greeting` creates the dependency.

</details>

## Common pitfalls

- **Adding a new provider without re-running `init`.** If you edit `required_providers`, run `terraform init` again before plan. The error message is helpful — it'll tell you.
- **Confusing the resource NAME with the attribute `id`.** `random_pet.name` is the address; `.id` is the actual generated string. They're different — `random_pet.name` alone is the whole resource object, not the name string.

## Experiments

1. Remove the reference (hardcode the filename) but keep both resources. Run `plan`. Are they still ordered? (No — Terraform creates them in parallel because there's no edge between them.)
2. Add a second `local_file` that also references `random_pet.name.id`. They should both depend on the pet, but not on each other, so Terraform creates them in parallel after the pet.
