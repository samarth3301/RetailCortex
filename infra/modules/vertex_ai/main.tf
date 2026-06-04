resource "google_project_service" "vertex_ai" {
  project                    = var.project_id
  service                    = "aiplatform.googleapis.com"
  disable_on_destroy         = false
  disable_dependent_services = false
}

resource "google_service_account" "vertex_ai_agent" {
  project      = var.project_id
  account_id   = "retailcortex-vertex-agent"
  display_name = "RetailCortex Vertex AI Agent"
  description  = "Used by the RetailCortex backend to call Vertex AI / Gemini APIs."
}

resource "google_project_iam_member" "vertex_ai_agent_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.vertex_ai_agent.email}"

  depends_on = [google_project_service.vertex_ai]
}
