variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Vertex AI region."
  type        = string
  default     = "us-central1"
}
