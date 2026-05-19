# modules/greeting/outputs.tf
#
# Outputs are this module's public API.

output "file_path" {
  value       = local_file.greeting.filename
  description = "Absolute path of the greeting file"
}

output "content" {
  value       = local_file.greeting.content
  description = "The full greeting written to the file"
}
