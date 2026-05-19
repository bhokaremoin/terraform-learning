# 07 · count and for_each — Solution

## Part A: count

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.0" }
  }
}

resource "local_file" "numbered" {
  count    = 3
  filename = "${path.module}/file-${count.index}.txt"
  content  = "I am file number ${count.index}\n"
}

output "files" {
  value = local_file.numbered[*].filename
}
```

Plan creates three resources with addresses `local_file.numbered[0]`, `[1]`, `[2]`. The `[*]` "splat" operator in the output collects an attribute from all instances.

## Part B: for_each

```hcl
variable "fruits" {
  type = map(string)
  default = {
    apple  = "red"
    banana = "yellow"
    cherry = "red"
  }
}

resource "local_file" "named" {
  for_each = var.fruits
  filename = "${path.module}/${each.key}.txt"
  content  = "${each.key} is ${each.value}\n"
}

output "files" {
  value = { for k, f in local_file.named : k => f.filename }
}
```

Addresses: `local_file.named["apple"]`, `local_file.named["banana"]`, `local_file.named["cherry"]`.

## Refactoring from count to for_each — what the first plan shows

If you simply swap the code without touching state:

```text
  # local_file.numbered[0] will be destroyed
  # local_file.numbered[1] will be destroyed
  # local_file.numbered[2] will be destroyed
  # local_file.named["apple"]  will be created
  # local_file.named["banana"] will be created
  # local_file.named["cherry"] will be created

Plan: 3 to add, 0 to change, 3 to destroy.
```

Terraform doesn't know `numbered[0]` and `named["apple"]` are "the same thing." They're different addresses; they're different resources. For local files, destroy-and-recreate is fine. For a database, this would be a catastrophe.

The cleaner refactor is to teach state about the rename:

```bash
terraform state mv 'local_file.numbered[0]' 'local_file.named["apple"]'
terraform state mv 'local_file.numbered[1]' 'local_file.named["banana"]'
terraform state mv 'local_file.numbered[2]' 'local_file.named["cherry"]'
```

After these, plan should show only attribute updates (filename and content changed) and possibly nothing if the file paths happened to match.

## Part C: removing a key

Edit the variable default to drop `banana`:

```hcl
variable "fruits" {
  type = map(string)
  default = {
    apple  = "red"
    cherry = "red"
  }
}
```

Plan shows exactly one destroy:

```text
  # local_file.named["banana"] will be destroyed

Plan: 0 to add, 0 to change, 1 to destroy.
```

This is the for_each superpower. Compare to the equivalent with `count`: if you had `count = length(var.fruits)` and dropped an item, the LIST `[apple, banana, cherry]` becomes `[apple, cherry]`. `count.index` 1 used to be banana; now it's cherry. Terraform sees `[1]` change content from "banana is yellow" to "cherry is red" — an in-place update — AND `[2]` (which was cherry, now nothing) destroyed. You get an unnecessary update plus the destroy. Worse, if the resource is one where `filename` is ForceNew, that "update" becomes a replacement.

## Answers to "Predict, then verify"

1. **`count = 3` addresses:** `local_file.numbered[0]`, `[1]`, `[2]`.
2. **`for_each` addresses:** `local_file.named["apple"]`, `["banana"]`, `["cherry"]`.
3. **Refactor without state mv:** 3 destroys + 3 creates. Same end state, but if these were resources with side effects (deletes/creates aren't free), state mv is the right move.
4. **Remove "banana":** 1 destroy, 0 changes, 0 adds.

## Answers to the experiments

1. **Swap two map entries.** No change. Maps are unordered in HCL — keys are the identity. Terraform doesn't even refresh, because the input is identical to what it was.
2. **Swap two list entries with `count`.** Disaster. Two in-place updates because indices 0 and 1 now point at different values. If `filename` is ForceNew (it is on `local_file`), those become two replacements. This is the canonical reason `for_each` is preferred.
