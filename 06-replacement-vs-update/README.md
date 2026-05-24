# 06 · Replacement vs In-Place Updates

## Concept

When you change an argument on a resource, Terraform has two ways to react. It can **update the resource in place** (call the provider's "update" method, change the attribute, done). Or it can **destroy and recreate** the resource (call "delete" then "create"). Which one happens is decided by the provider — specifically, each attribute is marked by the provider as either updatable in place or "ForceNew" (requires replacement).

You have to develop the habit of reading the plan output to know which is happening, because the difference can matter a lot in production. Replacement of a database, for example, means data loss. Replacement of an immutable load balancer means downtime. Replacement of a random string means a new value cascading through every resource that depends on it.

In the plan output, the symbols tell you everything:

| Symbol | Meaning |
|---|---|
| `~ attribute = ...` | In-place update |
| `-/+ resource ...` | Destroy and create replacement |
| `# ... (forces replacement)` | This specific attribute is what triggered the replacement |

### A note about `local_file`

The `hashicorp/local` provider's `local_file` resource has **no update method** — every attribute is ForceNew, so any change to a `local_file` is always a replacement. That makes it a poor demo of in-place updates but a great demo of **which attribute** caused the replacement (and how it cascades through dependents). In real cloud providers many attributes do update in place; the skill of reading `(forces replacement)` carries over identically.

## Task

- [ ] Apply the starter, which has a `random_pet` and a `local_file` referencing it.
- [ ] Make three different changes, one at a time, run `plan` for each, and read the plan carefully:
  1. Change `local_file.content` to something else.
  2. Change `random_pet.length` from 2 to 3.
  3. Change `local_file.filename` to a different file path.
- [ ] For each change, find the `(forces replacement)` annotation in the plan and identify the specific attribute that triggered the replacement. For Change 2, also identify the **cascade** — one resource's replacement forces another's.
- [ ] Apply each change and watch the order: destroy old, then create new.

## Run it

```bash
terraform init
terraform apply       # baseline

# --- Change 1: modify the file content in main.tf ---
# Edit `content` in main.tf to "Hello again\n"
terraform plan        # which attribute carries `# forces replacement`?
terraform apply

# --- Change 2: modify the pet length in main.tf ---
# Edit `length = 2` to `length = 3` in main.tf
terraform plan        # which resource is replaced? Why does it cascade?
terraform apply
ls -la                # an old file may be left behind if its filename was unique-per-pet

# --- Change 3: modify the filename in main.tf ---
# Edit `filename` to "${path.module}/different-name.txt"
terraform plan        # in-place or replacement?
terraform apply

terraform destroy
```

## Predict, then verify

Before each change, predict which attribute carries the `# forces replacement` annotation, and whether the change cascades into a second resource being replaced.

1. Change `content` only.
2. Change `random_pet.length`.
3. Change `local_file.filename`.

The actual answers depend on the provider versions you have installed — that's the lesson. Don't assume; read the plan.

## Hints

<details>
<summary>Hint 1 — reading the "(forces replacement)" tag</summary>

In a replacement plan, Terraform annotates the offending attribute:

```text
~ length = 2 -> 3 # forces replacement
```

That line tells you exactly which attribute change caused the destroy+create. If you see no such annotation but the resource is being replaced, look for a parent/dependent resource — it might be cascading from elsewhere.

</details>

<details>
<summary>Hint 2 — `apply -replace` to force one yourself</summary>

You can intentionally replace a specific resource without changing its arguments:

```bash
terraform apply -replace=random_pet.name
```

This is the modern replacement for `terraform taint` (which is deprecated).

</details>

<details>
<summary>Hint 3 — `lifecycle { create_before_destroy }`</summary>

By default, replacement is destroy-then-create. For zero-downtime cases, you can flip it:

```hcl
resource "local_file" "greeting" {
  filename = ...
  content  = ...
  lifecycle {
    create_before_destroy = true
  }
}
```

Try toggling this on a replacement-triggering change and see the apply order flip.

</details>

## Common pitfalls

- **Cascading replacements.** If resource A is replaced and resource B references A's id, B may also be replaced. Always look at the FULL plan, not just the first resource you intended to change.
- **`prevent_destroy`.** You can set `lifecycle { prevent_destroy = true }` to make Terraform error rather than destroy a critical resource. Useful for production databases. The fix when you really need to destroy is to temporarily remove the lifecycle block.

## Experiments

1. Try `terraform apply -replace=local_file.greeting` with no code changes. What does plan show?
2. Add `create_before_destroy = true` to the `local_file` and trigger a replacement (by changing the filename). Read the apply output — note that "create" happens before "destroy" now. Why does this only sometimes make sense?
