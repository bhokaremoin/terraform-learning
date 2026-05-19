# 04 · Data Sources — Solution

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

data "local_file" "input" {
  filename = "${path.module}/input.txt"
}

resource "local_file" "output" {
  filename = "${path.module}/output.txt"
  content  = upper(data.local_file.input.content)
}

output "input_content" {
  value = data.local_file.input.content
}

output "output_content" {
  value = local_file.output.content
}
```

## Answers to "Predict, then verify"

1. **The data source does NOT count as `to add`.** It's a read, not a create. Plan says `Plan: 1 to add, 0 to change, 0 to destroy.` (just the `local_file.output`). The data source appears as `data.local_file.input: Reading...` / `Read complete` separately.
2. **`terraform state list` shows both** — `data.local_file.input` and `local_file.output`. Data source results are stored in state to detect changes between plans.
3. **Changing `input.txt` changes the data source's content**, which is referenced by the resource's `content` argument. So on the next plan, Terraform compares state's idea of `local_file.output.content` ("BANANA\n") to the new computed value ("APPLE\n") and shows an in-place update.

## Resource vs. data source — when to use each

| You want to… | Use… |
|---|---|
| Create and own a thing | `resource` |
| Read an existing thing you don't manage | `data` |
| Reference attributes of something you DO manage elsewhere in the same config | the resource address directly — no data source needed |
| Look up a value that may not yet exist | `data` with a `depends_on` (rare) |

## Answers to the experiments

1. **Delete `input.txt`.** Plan fails: `Invalid value for "path" parameter: no file exists at ".../input.txt"`. This is caught at plan time because the data source is read during plan.
2. **`precondition` in a `lifecycle` block:**

   ```hcl
   data "local_file" "input" {
     filename = "${path.module}/input.txt"
     lifecycle {
       postcondition {
         condition     = length(self.content) > 0
         error_message = "input.txt must not be empty"
       }
     }
   }
   ```

   Note: `data` blocks support `lifecycle { precondition / postcondition }` since Terraform 1.2. The `validation` block is for `variable` only.
