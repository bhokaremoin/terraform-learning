# 07 · count and for_each

## Concept

You'll often want N copies of the same resource — three files, ten subnets, a dozen DNS records. Terraform offers two ways to express this: `count` and `for_each`. They produce similar end results but address resources differently, and that addressing has real consequences when the set of items changes.

**`count`** takes a number. Resources are addressed by **integer index**: `local_file.thing[0]`, `local_file.thing[1]`, etc. If you have three items and you delete the middle one, all subsequent items shift index — index 2 becomes index 1, and Terraform sees that as "destroy item 1 (which used to be 'banana'), create a new item 1 (now 'cherry')" rather than "destroy banana." Painful.

**`for_each`** takes a map or a set of strings. Resources are addressed by **string key**: `local_file.thing["banana"]`. Removing "banana" from the input map cleanly destroys just that one resource. The keys are stable identifiers, not positional.

Rule of thumb: use `for_each` unless you have a genuine numbered sequence (rare). It costs a few extra characters and saves you from churn-on-reorder bugs.

## Task

- [ ] **Part A:** Use `count = 3` to create three files named `file-0.txt`, `file-1.txt`, `file-2.txt`, each containing its index.
- [ ] Run plan and apply. Note the addresses in the plan output.
- [ ] **Part B:** Refactor the same resource to use `for_each` over a map: `{ apple = "red", banana = "yellow", cherry = "red" }`. Files should be named `<key>.txt` with content `<key> is <value>\n`.
- [ ] When refactoring from count to for_each, you'll need to use `terraform state mv` or accept that all three files will be destroyed and recreated. Try it without state mv first to see what happens — it's a learning moment.
- [ ] **Part C:** Remove one key from the map and re-plan. Confirm that only that one resource is destroyed.

## Run it

```bash
terraform init

# --- Part A: count ---
# Implement the count version in main.tf, then:
terraform plan
terraform apply
terraform state list      # see local_file.numbered[0], [1], [2]

# --- Part B: refactor to for_each ---
# Edit main.tf to use for_each instead. (You can rename the resource if you want.)
terraform plan
# WITHOUT state mv, this plan will show: destroy all 3 count-indexed, create all 3 keyed.
# That's correct behavior — different addresses, different resources, from Terraform's POV.

# Option 1: Just apply (acceptable for files; not acceptable for databases).
# Option 2: Use state mv to teach Terraform that these are "the same" resources:
#   terraform state mv 'local_file.numbered[0]' 'local_file.named["apple"]'
#   ...
# Then plan again — should be in-place updates only.

terraform apply

# --- Part C: remove a key ---
# Edit the map in main.tf to remove "banana".
terraform plan       # should show exactly 1 destroy, 0 create, 0 change
terraform apply

terraform destroy
```

## Predict, then verify

1. With Part A's `count = 3`, what are the three resource addresses?
2. With Part B's `for_each`, what are the addresses?
3. When you refactor from count to for_each without state mv, what does the first plan show? (Hint: addresses changed, so Terraform doesn't know they're the same resources.)
4. When you remove "banana" from the map in Part C, how many adds, changes, destroys?

## Hints

<details>
<summary>Hint 1 — count syntax</summary>

```hcl
resource "local_file" "numbered" {
  count    = 3
  filename = "${path.module}/file-${count.index}.txt"
  content  = "I am file number ${count.index}\n"
}
```

`count.index` is the special expression for the current index (0-based).

</details>

<details>
<summary>Hint 2 — for_each syntax</summary>

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
```

`each.key` is the current map key (e.g., "apple"). `each.value` is the value (e.g., "red"). When `for_each` is a set of strings, `each.key` and `each.value` are both the string.

</details>

<details>
<summary>Hint 3 — referencing for_each-d resources</summary>

To reference one specific instance:

```hcl
local_file.named["apple"].filename
```

To reference all of them (e.g., in an output):

```hcl
output "all_paths" {
  value = [for f in local_file.named : f.filename]
}
# or
output "by_key" {
  value = { for k, f in local_file.named : k => f.filename }
}
```

</details>

## Common pitfalls

- **`for_each` requires a map or set, not a list.** Lists don't have natural keys. If you have a list, convert: `for_each = toset(var.fruits)` to get keys equal to values.
- **You can't use `count` and `for_each` on the same resource.** Pick one.
- **`for_each` keys must be known at plan time.** If your map keys depend on data sources or random values that aren't known until apply, you'll get an error: "The 'for_each' value depends on resource attributes that cannot be determined until apply." You can sometimes use `-target` to apply the dependency first, or restructure.

## Experiments

1. With `for_each`, swap the position of two entries in the map literal. Run plan. Does Terraform see any change? (Maps are unordered — it shouldn't.)
2. With `count`, do the same swap but using a list and `count = length(var.fruits)`. What does Terraform show? Why is this worse?
