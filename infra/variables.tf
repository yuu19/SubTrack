variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API token with permissions for Workers KV (Edit), R2 (Edit), and D1 (Edit)."
}

variable "cloudflare_account_id" {
  type        = string
  description = "Target Cloudflare account ID (matches wrangler.toml)."
  default     = "d8ee18029fb3e06794971d45b9c4a67d"
}

variable "d1_name" {
  type        = string
  description = "Name for the D1 database."
  default     = "template-database"
}

variable "r2_bucket_name" {
  type        = string
  description = "Name for the R2 bucket."
  default     = "template-bucket"
}

variable "kv_namespace_title" {
  type        = string
  description = "Workers KV namespace title (visible in the dashboard)."
  default     = "kv"
}

variable "wrangler_output_path" {
  type        = string
  description = "Path to write a wrangler.toml with provisioned resource IDs."
  default     = "../wrangler.generated.toml"
}

variable "wrangler_template_path" {
  type        = string
  description = "Template file for wrangler.toml rendering."
  # Allow override, otherwise resolved in locals using path.module.
  default     = null
}
