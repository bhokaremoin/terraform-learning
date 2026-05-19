# 03 · Multiple Resources and References — Solution

## Completed `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

resource "random_pet" "name" {
  length = 2
}

resource "local_file" "greeting" {
  filename = "${path.module}/greeting-${random_pet.name.id}.txt"
  content  = "Hello from ${random_pet.name.id}!\n"
}

output "pet_name" {
  value = random_pet.name.id
}

output "file_path" {
  value = local_file.greeting.filename
}
```

## Answers to "Predict, then verify"

1. **`random_pet.name` is created first, then `local_file.greeting`.** Terraform sees that `local_file.greeting.filename` references `random_pet.name.id`, so it builds an edge in the dependency graph. The plan output respects this — pet first, file second.
2. **The pet name does not change on a second apply.** `random_pet` stores its generated name in state. Without `keepers` or changes to its arguments, it just keeps the existing value. Re-running apply is idempotent.
3. **Changing `length = 2` to `length = 3` forces a new pet** (shown as `-/+ destroy and then create replacement`), which then forces the file to be replaced too because its name depends on the pet. You'll explore this in exercise 06.

## How the graph works

`terraform graph` outputs DOT-language. Pipe it through `dot -Tpng > graph.png` (if Graphviz is installed) to render. The edges show: `local_file.greeting` depends on `random_pet.name`.

Three kinds of dependencies exist:

1. **Implicit** — created when one resource references another in an expression. This is what we used. Always preferred.
2. **Explicit** — declared with `depends_on = [random_pet.name]`. Use only when there's a real ordering Terraform can't see (rare; usually a sign of a bug elsewhere).
3. **Module-level `depends_on`** — same, but on whole modules.

## Answers to the experiments

1. **Hardcoded filename, no reference.** Plan still shows two resources. Terraform creates them concurrently because the graph has no edge. Speed matters at scale — independent resources should be parallel.
2. **Two files, each referencing the pet.** Both files depend on the pet. The pet runs first, then both files run in parallel.
