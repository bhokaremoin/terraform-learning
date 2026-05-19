# 08 · Locals and Functions — starter

terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

variable "name" {
  type    = string
  default = "Terraform"
}

# TODO: declare a locals block with these values:
#   shouty_name = upper(var.name)
#   greeting    = format("Hello, %s!", var.name)
#   config      = jsondecode(file("${path.module}/config.json"))
#   project     = local.config.project
#   numbers     = [1, 2, 3]
#
# (You will need to create config.json before running — see README.md.)

# Resource 1: uses format() via local.greeting
resource "local_file" "info" {
  filename = "${path.module}/info.txt"
  # TODO: content = "${local.greeting} You're working on project ${local.project}.\n"
  content = ""
}

# Resource 2: uses upper() via local.shouty_name
resource "local_file" "all_uppercase" {
  filename = "${path.module}/all_uppercase.txt"
  # TODO: content = local.shouty_name
  content = ""
}

# Resource 3: uses templatefile() to render greeting.tftpl
resource "local_file" "rendered" {
  filename = "${path.module}/rendered.txt"
  # TODO: content = templatefile("${path.module}/greeting.tftpl", {
  #   name      = var.name
  #   timestamp = timestamp()
  #   numbers   = local.numbers
  # })
  content = ""
}

# TODO: output "project_from_json" with value local.project
# TODO: output "shouty_name"       with value local.shouty_name
