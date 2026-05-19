# 01 · Hello World — starter

# The `terraform` block declares which Terraform version and which providers
# this configuration requires. `terraform init` reads this and downloads the
# listed providers.
terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# A `resource` block tells Terraform: create one of these, keep track of it,
# update it when I change this code, destroy it when I run `terraform destroy`.
#
# Type: local_file (provided by hashicorp/local)
# Name: hello   (your choice — used to address this resource)
resource "local_file" "hello" {
  # TODO: set `filename` to "hello.txt" (or "${path.module}/hello.txt" to be explicit)
  # TODO: set `content`  to "Hello, Terraform!\n"
}
