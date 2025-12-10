output "d1_database_id" {
  description = "UUID for wrangler.toml database_id."
  value       = cloudflare_d1_database.db.id
}

output "kv_namespace_id" {
  description = "KV namespace id for wrangler.toml kv.id."
  value       = cloudflare_workers_kv_namespace.kv.id
}

output "r2_bucket_name" {
  description = "Bucket name for wrangler.toml r2_buckets.bucket_name."
  value       = cloudflare_r2_bucket.bucket.name
}

output "wrangler_rendered_file" {
  description = "Path to the wrangler.toml rendered with provisioned IDs."
  value       = local_file.wrangler.filename
}

output "wrangler_bindings" {
  description = "Copy these values into wrangler.toml bindings."
  value = {
    d1_binding        = "DB"
    d1_database_id    = cloudflare_d1_database.db.id
    d1_database_name  = cloudflare_d1_database.db.name
    r2_binding        = "BUCKET"
    r2_bucket_name    = cloudflare_r2_bucket.bucket.name
    kv_binding        = "kv"
    kv_namespace_id   = cloudflare_workers_kv_namespace.kv.id
    account_id        = var.cloudflare_account_id
  }
}
