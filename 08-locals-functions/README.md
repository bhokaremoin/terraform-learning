# 08 · Locals and Functions

## Concept

**Locals** are computed values within your configuration. They aren't inputs (no one sets them from outside) and they aren't outputs (no one reads them from outside). They're internal — a way to give a name to an expression you'd otherwise repeat or to break a complex expression into readable steps. A `locals { ... }` block can contain any number of named values, all evaluated lazily.

**Functions** are how you transform values. Terraform ships with a large standard library: string operations (`upper`, `format`, `replace`), collection operations (`merge`, `keys`, `length`), encoding (`jsonencode`, `base64encode`), filesystem (`file`, `templatefile`), and many more. You can't define your own functions in pure Terraform — you compose what's built in.

**`templatefile`** is worth special attention. It reads a file from disk and interpolates Terraform expressions inside it, returning the result as a string. This is how you keep large strings (scripts, config files, JSON) out of `.tf` files while still parameterizing them.

## Task

- [ ] Use a `locals` block to compute several derived values: an uppercased name, a formatted greeting, a JSON-encoded blob, and a list of file paths.
- [ ] Create a template file `greeting.tftpl` and use `templatefile()` to render it.
- [ ] Read a JSON file with `file()` + `jsondecode()` and use one of the values.
- [ ] Create three resources demonstrating each: `format`, `jsondecode`, `templatefile`.

## Run it

```bash
# Create a small JSON file with input data:
cat > config.json <<'EOF'
{
  "project": "demo",
  "owner": "moin",
  "max_files": 3
}
EOF

# Create the template file. Note: .tftpl is the conventional extension.
cat > greeting.tftpl <<'EOF'
Hello, ${name}!

This file was rendered at ${timestamp}.
Your favorite numbers:
%{ for n in numbers ~}
  - ${n}
%{ endfor ~}
EOF

terraform init
terraform plan
terraform apply

cat rendered.txt
cat info.txt
cat all_uppercase.txt
terraform output

terraform destroy
rm config.json greeting.tftpl
```

## Predict, then verify

1. What's the difference between `${var.name}` (inside a `.tf` string) and `${name}` (inside a `.tftpl` template)? Both look like interpolation — what's the scope of each?
2. If `config.json`'s `max_files` is `3`, what type does `jsondecode` return for it — a string `"3"` or a number `3`?
3. What does `terraform console` say when you type `upper("hello")` vs. `local.something`? Try both.

## Hints

<details>
<summary>Hint 1 — locals block</summary>

```hcl
locals {
  shouty_name = upper(var.name)
  greeting    = format("Hello, %s!", var.name)
  config      = jsondecode(file("${path.module}/config.json"))
  project     = local.config.project
}
```

You can reference one local from another — they evaluate in dependency order.

</details>

<details>
<summary>Hint 2 — templatefile</summary>

```hcl
resource "local_file" "rendered" {
  filename = "${path.module}/rendered.txt"
  content = templatefile("${path.module}/greeting.tftpl", {
    name      = var.name
    timestamp = timestamp()
    numbers   = [1, 2, 3]
  })
}
```

Notice: the second argument is a map. The keys of that map become the variables available inside the template (`${name}`, `${timestamp}`, `${numbers}`).

</details>

<details>
<summary>Hint 3 — template control structures</summary>

Templates support `%{ for }` / `%{ endfor }` and `%{ if }` / `%{ endif }`:

```text
%{ for n in numbers ~}
  - ${n}
%{ endfor ~}
```

The `~` strips surrounding whitespace, which keeps the output clean. Without it you get blank lines.

</details>

## Common pitfalls

- **`timestamp()` causes plan churn.** Every plan computes a new timestamp. If you use it on a resource attribute, that resource will show in-place updates every time. For "render once" use cases, generate the timestamp outside Terraform.
- **`file()` is evaluated at plan time.** If the file doesn't exist at plan time, plan fails. Use `fileexists()` if you want conditional reads.
- **`jsondecode`'s types match the JSON.** Numbers are numbers, strings are strings, booleans are booleans, objects are maps/objects. Don't `tostring()` a number unless you need to.

## Experiments

1. Add a `locals` value that depends on another `locals` value, which depends on a third. Run plan — Terraform evaluates them in the right order regardless of textual order. Good to know.
2. Replace `templatefile` with an inline string using `format` and `join`. Compare readability. (Templates win for anything multi-line.)
