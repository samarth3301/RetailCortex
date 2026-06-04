resource "google_project_service" "secret_manager" {
  project                    = var.project_id
  service                    = "secretmanager.googleapis.com"
  disable_on_destroy         = false
  disable_dependent_services = false
}

locals {
  secrets = {
    database_url     = "retailcortex-database-url"
    clerk_jwks_url   = "retailcortex-clerk-jwks-url"
    clerk_secret_key = "retailcortex-clerk-secret-key"
    elastic_cloud_id = "retailcortex-elastic-cloud-id"
    elastic_api_key  = "retailcortex-elastic-api-key"
    dynatrace_url    = "retailcortex-dynatrace-url"
    dynatrace_token  = "retailcortex-dynatrace-token"
  }
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = local.secrets
  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

# Create initial versions only for keys present in var.secret_values.
# lifecycle.ignore_changes prevents Terraform from overwriting values
# rotated outside of Terraform (CI/CD, manual).
resource "google_secret_manager_secret_version" "values" {
  for_each = toset([
    for k in nonsensitive(keys(var.secret_values)) : k
    if contains(keys(local.secrets), k)
  ])
  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = var.secret_values[each.key]

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "accessor" {
  for_each  = local.secrets
  project   = var.project_id
  secret_id = google_secret_manager_secret.secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.accessor_sa_email}"
}
