# 03 · Multiple Resources and References — starter

terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    # TODO: add the hashicorp/random provider, version "~> 3.0"
  }
}

# TODO: declare a resource "random_pet" "name" with length = 2
#       (random_pet generates names like "stable-mongoose")

resource "local_file" "greeting" {
  # TODO: interpolate random_pet.name.id into both the filename and the content.
  # Filename suggestion: "${path.module}/greeting-${random_pet.name.id}.txt"
  filename = ""
  content  = ""
}

# TODO: output the pet name (random_pet.name.id) as "pet_name"
# TODO: output the file path  (local_file.greeting.filename) as "file_path"
