# 07 · count and for_each — starter
#
# Work through Part A (count), then refactor to Part B (for_each), then
# Part C (remove a key and re-plan).

terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# --- Part A ---
# TODO: create a resource "local_file" "numbered" with:
#   count    = 3
#   filename = "${path.module}/file-${count.index}.txt"
#   content  = "I am file number ${count.index}\n"

# --- Part B (after applying Part A) ---
# TODO: replace the count-based resource above with a for_each-based one:
#
# variable "fruits" {
#   type = map(string)
#   default = {
#     apple  = "red"
#     banana = "yellow"
#     cherry = "red"
#   }
# }
#
# resource "local_file" "named" {
#   for_each = var.fruits
#   filename = "${path.module}/${each.key}.txt"
#   content  = "${each.key} is ${each.value}\n"
# }
