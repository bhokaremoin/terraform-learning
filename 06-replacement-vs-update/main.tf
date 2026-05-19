# 06 · Replacement vs In-Place Updates — starter
#
# Apply this, then make the three changes described in README.md one at a time.

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

resource "random_pet" "name" {
  length = 2
}

resource "local_file" "greeting" {
  filename = "${path.module}/greeting-${random_pet.name.id}.txt"
  content  = "Hello there\n"
}

output "pet_name" {
  value = random_pet.name.id
}

output "filename" {
  value = local_file.greeting.filename
}
