# 02 · Variables and Outputs — starter

terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# An input variable with a default — optional to set.
variable "filename" {
  type        = string
  default     = "greeting.txt"
  description = "The name of the file to create"
}

# TODO: declare a variable "greeting" of type string with default "Hello"
# TODO: declare a variable "name"     of type string with NO default
#       (this will make it required — Terraform will prompt or error)

resource "local_file" "greeting" {
  filename = var.filename
  # TODO: build content using var.greeting and var.name
  # The interpolation pattern is "${var.greeting}, ${var.name}!\n"
  content = ""
}

# TODO: add output "file_path" with value local_file.greeting.filename
# TODO: add output "file_size" with value length(local_file.greeting.content)
