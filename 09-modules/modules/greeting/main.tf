# modules/greeting/main.tf
#
# A simple module: takes a name, writes a greeting file, exposes its path.
# Note: no `provider` block here — providers are inherited from the caller.
# We DO declare `required_providers` so the module's dependencies are explicit.

terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

resource "local_file" "greeting" {
  filename = "${path.root}/${lower(var.name)}-greeting.txt"
  content  = "Hello, ${var.name}!\n"
}
