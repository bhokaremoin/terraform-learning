# 04 · Data Sources — starter

terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# A data source reads something Terraform did NOT create.
# We made input.txt by hand with `echo "Banana" > input.txt`.

# TODO: declare a data "local_file" "input" with
#       filename = "${path.module}/input.txt"

resource "local_file" "output" {
  filename = "${path.module}/output.txt"
  # TODO: set content to the uppercased input:
  #       upper(data.local_file.input.content)
  content = ""
}

# TODO: output "input_content"  with value data.local_file.input.content
# TODO: output "output_content" with value local_file.output.content
