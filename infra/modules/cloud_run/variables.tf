variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Cloud Run region."
  type        = string
  default     = "us-central1"
}

variable "image" {
  description = "Container image URI for the backend service (e.g. REGION-docker.pkg.dev/PROJECT/retailcortex-backend/api:latest)."
  type        = string
}

variable "secret_ids" {
  description = "Map of logical name → Secret Manager secret_id, produced by the secret_manager module."
  type        = map(string)
}

variable "allowed_origins" {
  description = "CORS allowed origins passed as ALLOWED_ORIGINS env var."
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "allow_unauthenticated" {
  description = "Allow public (unauthenticated) invocations."
  type        = bool
  default     = true
}
