# Terraform Learning Path

Welcome. This is a hands-on, offline tutorial for learning Terraform fundamentals. Every exercise runs on your laptop using local providers only — no cloud account, no API keys, no network calls beyond `terraform init` (which downloads provider binaries on first run).

## What is Terraform?

Terraform is an infrastructure-as-code tool. You write **code** (`.tf` files) describing the resources you want. Terraform keeps a **state file** (`terraform.tfstate`) recording what it has already created. Each time you run `terraform plan`, it compares three things: your code (intent), the state file (its memory of what it built), and **reality** (what actually exists right now). It then produces a plan that reconciles the three. `terraform apply` executes that plan. That's the entire model — everything else is detail on top.

You'll spend most of this tutorial making small changes and reading plan output. Reading the plan carefully is the single most valuable Terraform skill.

## Install

This tutorial was written against Terraform 1.15.x but anything 1.5+ should work.

**macOS (Homebrew):**

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

**Linux (apt):**

```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

**Linux (manual):**

Download the zip for your architecture from <https://developer.hashicorp.com/terraform/install>, unzip it, and move the `terraform` binary onto your `PATH` (e.g., `/usr/local/bin`).

**Windows (Chocolatey):**

```powershell
choco install terraform
```

**Windows (manual):**

Download the zip from <https://developer.hashicorp.com/terraform/install>, unzip it, and add the folder to your `PATH`.

### Verify installation

```bash
terraform -version
```

You should see something like `Terraform v1.15.x on <your platform>`.

## The four-command workflow

Almost everything in Terraform is a loop over four commands. `terraform init` initializes the working directory, downloads providers, and sets up backend state. `terraform plan` shows you what would change without changing anything — read this output. `terraform apply` executes the plan, prompting once for confirmation. `terraform destroy` tears down everything Terraform manages in this directory. You'll run this loop dozens of times in this tutorial.

## The 10 exercises

1. **`01-hello-world`** — Your first resource. The `init → plan → apply → destroy` loop.
2. **`02-variables-outputs`** — Parameterize inputs and surface results.
3. **`03-multiple-resources`** — How Terraform infers dependency order from references.
4. **`04-data-sources`** — Read things Terraform doesn't manage.
5. **`05-drift-detection`** — What happens when reality changes outside Terraform.
6. **`06-replacement-vs-update`** — Which changes update in place and which destroy-and-recreate.
7. **`07-count-foreach`** — Two ways to create many resources, and why `for_each` is usually better.
8. **`08-locals-functions`** — Computed values, string manipulation, file and template helpers.
9. **`09-modules`** — Extract reusable units of configuration.
10. **`10-state-commands`** — Inspect and surgically edit the state file.

## How to use this tutorial

- **Do them in order.** Each builds on the previous one.
- **Attempt before peeking.** Each exercise has a starter `main.tf` with `# TODO` comments and a `SOLUTION.md`. Try the TODO yourself first; struggling for ten minutes is where most of the learning happens.
- **Don't skip "Predict, then verify."** Before running `plan` or `apply`, write down what you expect to see. Comparing your prediction to the actual output is the fastest way to build a real mental model.
- **Read the plan output.** Don't just scan for green checkmarks. The symbols (`+`, `-`, `~`, `-/+`) and the listed attributes are telling you exactly what Terraform is about to do.
- **Run `terraform destroy` at the end of each exercise.** Keep a clean slate. Each exercise assumes you start fresh.

## What's next

After finishing these ten exercises you'll have the mental model and the muscle memory to learn the rest from official docs. Reasonable next steps:

- **Modules in depth** — input validation, output composition, module registries, versioning.
- **Remote state** — moving `terraform.tfstate` out of your local directory into S3, GCS, or Terraform Cloud, with locking so multiple humans can collaborate safely.
- **Real cloud providers** — AWS, GCP, Azure. Everything you learned here transfers; only the resource types change.
- **CI/CD integration** — running `plan` on every PR and `apply` on merge.
- **Testing** — `terraform test`, `terratest`, policy-as-code with OPA or Sentinel.

Have fun. Start with `01-hello-world/README.md`.
