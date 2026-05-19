# 09 · Modules — starter (root module)

terraform {
  required_version = ">= 1.5"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# TODO: call the greeting module ONCE with name = "World"
# module "world" {
#   source = "./modules/greeting"
#   name   = "World"
# }

# TODO: call the greeting module a SECOND time with name = "Terraform"
# module "terraform_team" {
#   source = "./modules/greeting"
#   name   = "Terraform"
# }

# TODO: add outputs that surface module.<name>.file_path from each call
# output "world_path"          { value = module.world.file_path }
# output "terraform_team_path" { value = module.terraform_team.file_path }
