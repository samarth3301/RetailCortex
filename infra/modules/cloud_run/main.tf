resource "google_project_service" "cloud_run" {
  project                    = var.project_id
  service                    = "run.googleapis.com"
  disable_on_destroy         = false
  disable_dependent_services = false
}

resource "google_project_service" "artifact_registry" {
  project                    = var.project_id
  service                    = "artifactregistry.googleapis.com"
  disable_on_destroy         = false
  disable_dependent_services = false
}

# ── Artifact Registry ─────────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "backend" {
  project       = var.project_id
  location      = var.region
  repository_id = "retailcortex-backend"
  format        = "DOCKER"

  depends_on = [google_project_service.artifact_registry]
}

# ── Service Account ───────────────────────────────────────────────────────────

resource "google_service_account" "cloud_run" {
  project      = var.project_id
  account_id   = "retailcortex-cloudrun"
  display_name = "RetailCortex Cloud Run"
  description  = "Runtime identity for the RetailCortex backend on Cloud Run."
}

resource "google_project_iam_member" "cloud_run_vertex_ai" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# ── Cloud Run Service ─────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "backend" {
  project  = var.project_id
  name     = "retailcortex-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = var.image

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # ── Secret env vars ──────────────────────────────────────────────────────
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["database_url"]
            version = "latest"
          }
        }
      }
      env {
        name = "CLERK_JWKS_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["clerk_jwks_url"]
            version = "latest"
          }
        }
      }
      env {
        name = "CLERK_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["clerk_secret_key"]
            version = "latest"
          }
        }
      }
      env {
        name = "ELASTIC_CLOUD_ID"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["elastic_cloud_id"]
            version = "latest"
          }
        }
      }
      env {
        name = "ELASTIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["elastic_api_key"]
            version = "latest"
          }
        }
      }
      env {
        name = "DYNATRACE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["dynatrace_url"]
            version = "latest"
          }
        }
      }
      env {
        name = "DYNATRACE_TOKEN"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["dynatrace_token"]
            version = "latest"
          }
        }
      }

      # ── Plain env vars ───────────────────────────────────────────────────────
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.region
      }
      env {
        name  = "ALLOWED_ORIGINS"
        value = jsonencode(var.allowed_origins)
      }
    }
  }

  depends_on = [google_project_service.cloud_run]
}

# ── IAM ───────────────────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
