# 06 · Replacement vs In-Place Updates — Solution

There's no "completed" code for this exercise. The whole point is to make three different changes one at a time and see how Terraform reacts. Below is what you should see, with exact reasoning.

## Change 1: modify `content`

Plan output (relevant portion):

```text
  # local_file.greeting will be updated in-place
  ~ resource "local_file" "greeting" {
        id                   = "..."
      ~ content              = "Hello there\n" -> "Hello again\n"
      ~ content_base64sha256 = "..." -> (known after apply)
      ~ content_base64sha512 = "..." -> (known after apply)
      ~ content_md5          = "..." -> (known after apply)
      ~ content_sha1         = "..." -> (known after apply)
      ~ content_sha256       = "..." -> (known after apply)
      ~ content_sha512       = "..." -> (known after apply)
        # (3 unchanged attributes hidden)
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

The `~` next to the resource means in-place update. Several `content_*` checksums become "known after apply" because they're derived from content. The file's path doesn't change, so no replacement.

> **Provider-version note:** Older versions of the `hashicorp/local` provider (pre-2.x) marked `content` as ForceNew, in which case you'd see `-/+` and `(forces replacement)`. Always read the plan rather than assuming.

## Change 2: modify `random_pet.length`

```text
  # random_pet.name must be replaced
-/+ resource "random_pet" "name" {
      ~ id        = "stable-mongoose" -> (known after apply)
      ~ length    = 2 -> 3 # forces replacement
    }

  # local_file.greeting must be replaced
-/+ resource "local_file" "greeting" {
      ~ filename = ".../greeting-stable-mongoose.txt" -> (known after apply) # forces replacement
      ~ id       = "..." -> (known after apply)
        # (others)
    }

Plan: 2 to add, 0 to change, 2 to destroy.
```

Two things to notice:

1. `length = 2 -> 3 # forces replacement` on `random_pet.name`. The provider marks `length` as ForceNew because the pet name is derived from it at creation time.
2. **Cascading replacement** of `local_file.greeting`. Its `filename` interpolates `random_pet.name.id`, and `filename` is ForceNew on `local_file`. So the pet replaces, the filename changes, the file replaces.

This is a foot-gun in real configs. Replacing a "harmless" random value can cascade into replacing dozens of resources downstream.

## Change 3: modify `local_file.filename`

```text
  # local_file.greeting must be replaced
-/+ resource "local_file" "greeting" {
      ~ filename = ".../greeting-stable-mongoose.txt" -> ".../different-name.txt" # forces replacement
      ~ id       = "..." -> (known after apply)
        # (others)
    }

Plan: 1 to add, 0 to change, 1 to destroy.
```

`filename` is ForceNew. The resource is the file; changing the file's path means a different file, so destroy+create.

## Why some attributes are ForceNew

Provider authors mark an attribute ForceNew when changing it in-place is impossible or unsafe. Examples:

- A VM's region — you can't move it; you have to create a new one.
- A bucket's name — usually globally unique and immutable.
- A random value's length — the value was generated at create time from that length; changing the length means generating a new value.

It's a property of the resource type, not your choice. Your only options are: accept the replacement, restructure to avoid the change, or use `create_before_destroy` to minimize downtime.

## Answers to the experiments

1. **`apply -replace=local_file.greeting`** with no code changes shows a plan with `-/+` for that resource. Useful for "I want this rebuilt, even though no inputs changed" — e.g., the resource went bad in some way Terraform can't see.
2. **`create_before_destroy = true`.** Apply order flips: the new resource is created first, then the old one destroyed. This is the right move for resources behind a router/load balancer that can absorb the brief overlap. It's *wrong* for resources with a uniqueness constraint (you can't have two with the same name), so Terraform may refuse if it detects a conflict. For our local file with a fixed filename, `create_before_destroy` will fail if the filename is unchanged but allowed succeed if the filename is the thing that changed (because the new file's path differs).
