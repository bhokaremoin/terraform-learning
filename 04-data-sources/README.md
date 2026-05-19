# 04 · Data Sources

## Concept

A `resource` is something Terraform **creates and owns**. A `data` source is something Terraform **reads but doesn't own** — usually because it was created by someone or something else. The same syntax patterns apply: a data block has a type, a name (forming the address `data.<type>.<name>`), and arguments. After it's read, its attributes are available in expressions just like a resource's.

Why this matters: in the real world, you rarely manage every piece of infrastructure with one Terraform configuration. There's an existing VPC you want to launch into, an AMI you want to look up by tag, a secret stored elsewhere, a file someone else writes. Data sources are how Terraform peeks at the world outside its state.

Today we'll use `data "local_file"` to read a file that exists on disk (created by us, by hand, not by Terraform), and feed its contents into a managed resource.

## Task

- [ ] Create a file `input.txt` by hand with `echo "Banana" > input.txt`.
- [ ] Declare a `data "local_file"` named `input` pointing at `input.txt`.
- [ ] Create a `local_file` resource whose content is the read content uppercased: `upper(data.local_file.input.content)`.
- [ ] Output the raw and uppercased content so you can see both.
- [ ] Run plan and apply. Then change `input.txt` to "Apple" and run plan again.

## Run it

```bash
# First, create the input by hand (this is NOT Terraform-managed).
echo "Banana" > input.txt

terraform init
terraform plan        # one resource to add (the data source isn't "added"; it's read)
terraform apply

cat output.txt        # should say "BANANA"
terraform output

# Now change the input out-of-band and re-plan.
echo "Apple" > input.txt
terraform plan        # data source re-reads; resource will update in place
terraform apply

cat output.txt        # should say "APPLE"

terraform destroy
rm input.txt          # Terraform won't delete this — we made it by hand
```

## Predict, then verify

1. Will the data source show up in `Plan: N to add, …`? Why or why not?
2. What appears in `terraform state list` after apply — just the resource, or also the data source?
3. When you change `input.txt`, why does the resource get updated even though no `.tf` file changed?

## Hints

<details>
<summary>Hint 1 — data block syntax</summary>

```hcl
data "local_file" "input" {
  filename = "${path.module}/input.txt"
}
```

Reference the result as `data.local_file.input.content`.

</details>

<details>
<summary>Hint 2 — using the read content</summary>

```hcl
resource "local_file" "output" {
  filename = "${path.module}/output.txt"
  content  = upper(data.local_file.input.content)
}
```

</details>

<details>
<summary>Hint 3 — `data "http"` as an alternative</summary>

If you have a network and want to try fetching from a URL instead, the `http` provider works the same way:

```hcl
terraform {
  required_providers {
    http = { source = "hashicorp/http", version = "~> 3.0" }
  }
}

data "http" "joke" {
  url = "https://icanhazdadjoke.com"
  request_headers = { Accept = "text/plain" }
}

resource "local_file" "joke" {
  filename = "joke.txt"
  content  = data.http.joke.response_body
}
```

This needs internet access, so don't use it if you're working strictly offline.

</details>

## Common pitfalls

- **Data sources are read every plan.** A slow or unreliable data source slows every plan. Cache cheaply.
- **`data` is not for files YOU manage.** If Terraform should own the file, use a `resource`. If you want to inspect a file Terraform manages from elsewhere in the same config, use the resource's attributes (`local_file.foo.content`) — no data source needed.
- **Hand-created files aren't destroyed.** `terraform destroy` only removes things in state. You created `input.txt` by hand, so you remove it by hand.

## Experiments

1. Delete `input.txt` and run `terraform plan`. What error do you get? At what stage?
2. Add a `validation` block that fails if the file is empty: `condition = length(data.local_file.input.content) > 0`. (You can put validation only on `variable`, not `data`, so to actually enforce this you'd use `precondition` inside a `lifecycle` block on the data source — try it.)
