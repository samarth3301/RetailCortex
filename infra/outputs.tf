output "project_id" {
  description = "GCP project ID."
  value       = local.project_id
}

output "vertex_ai_location" {
  description = "Vertex AI region."
  value       = var.google_region
}

output "vertex_ai_agent_sa_email" {
  description = "Service account email for the Vertex AI agent."
  value       = module.vertex_ai.agent_sa_email
}

output "vertex_ai_agent_key_json" {
  description = "Vertex AI agent SA key JSON — run: terraform output -raw vertex_ai_agent_key_json > ../keys/vertex-agent.json"
  value       = module.vertex_ai.agent_key_json
  sensitive   = true
}

output "cloud_run_url" {
  description = "Backend Cloud Run service URL."
  value       = module.cloud_run.service_url
}

output "cloud_run_sa_email" {
  description = "Service account email used by Cloud Run."
  value       = module.cloud_run.service_account_email
}

output "artifact_registry_repo" {
  description = "Artifact Registry repo URI — push images here for Cloud Run."
  value       = module.cloud_run.artifact_registry_repo
}
