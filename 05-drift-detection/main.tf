# 05 · Drift Detection — starter
#
# This one is complete on purpose — the learning is in the workflow, not the
# code. Run apply, then mess with managed.txt by hand, then run plan again.

terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

resource "local_file" "managed" {
  filename        = "${path.module}/managed.txt"
  content         = "Managed by Terraform\n"
  file_permission = "0644"
}

output "managed_path" {
  value = local_file.managed.filename
}
