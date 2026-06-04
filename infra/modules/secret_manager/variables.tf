variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "accessor_sa_email" {
  description = "Service account email granted secretAccessor on all secrets."
  type        = string
}

variable "secret_values" {
  description = "Initial secret values keyed by logical name (database_url, clerk_jwks_url, …). Ignored on subsequent applies."
  type        = map(string)
  sensitive   = true
  default     = {}
}
