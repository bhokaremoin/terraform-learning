# 10 · State Commands — starter
#
# Three resources to play with. Apply this, then run the parts described
# in README.md, each of which uses a different `terraform state` subcommand.

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

resource "local_file" "alpha" {
  filename = "${path.module}/alpha.txt"
  content  = "alpha\n"
}

resource "local_file" "beta" {
  filename = "${path.module}/beta.txt"
  content  = "beta\n"
}

resource "local_file" "gamma" {
  filename = "${path.module}/gamma.txt"
  content  = "gamma\n"
}

output "all_files" {
  value = [
    local_file.alpha.filename,
    local_file.beta.filename,
    local_file.gamma.filename,
  ]
}
