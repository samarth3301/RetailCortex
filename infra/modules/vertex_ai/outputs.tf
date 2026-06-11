output "agent_sa_email" {
  description = "Service account email for the Vertex AI agent."
  value       = google_service_account.vertex_ai_agent.email
}

output "agent_key_json" {
  description = "Service account key JSON for the Vertex AI agent (decoded). Save to keys/vertex-agent.json for local dev."
  value       = base64decode(google_service_account_key.vertex_ai_agent_key.private_key)
  sensitive   = true
}
