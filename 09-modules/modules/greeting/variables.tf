# modules/greeting/variables.tf
#
# Inputs to this module. Callers MUST provide `name`.

variable "name" {
  type        = string
  description = "Who to greet (used in the filename and content)"

  validation {
    condition     = length(var.name) > 0
    error_message = "name must not be empty"
  }
}
