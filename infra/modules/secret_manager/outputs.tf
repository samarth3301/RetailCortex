output "secret_ids" {
  description = "Map of logical name → Secret Manager secret_id."
  value       = { for k, s in google_secret_manager_secret.secrets : k => s.secret_id }
}
