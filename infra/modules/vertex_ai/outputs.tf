output "agent_sa_email" {
  description = "Service account email for the Vertex AI agent."
  value       = google_service_account.vertex_ai_agent.email
}
