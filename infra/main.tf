resource "cloudflare_d1_database" "db" {
  account_id = var.cloudflare_account_id
  name       = var.d1_name
}

resource "cloudflare_r2_bucket" "bucket" {
  account_id = var.cloudflare_account_id
  name       = var.r2_bucket_name
}

resource "cloudflare_workers_kv_namespace" "kv" {
  account_id = var.cloudflare_account_id
  title      = var.kv_namespace_title
}

# Render wrangler.toml with created resource IDs so it can be copied/used directly.
locals {
  # Resolve wrangler template path inside the module to avoid using expressions in variable defaults.
  wrangler_template_path = coalesce(var.wrangler_template_path, "${path.module}/wrangler.tftpl")
}

resource "local_file" "wrangler" {
  filename = var.wrangler_output_path
  content = templatefile(local.wrangler_template_path, {
    name              = "svelte-cloudflare-template"
    account_id        = var.cloudflare_account_id
    main              = ".svelte-kit/cloudflare/_worker.js"
    compatibility_date = "2025-11-30"
    assets_binding    = "ASSETS"
    assets_directory  = ".svelte-kit/cloudflare"
    d1_binding        = "DB"
    d1_database_name  = cloudflare_d1_database.db.name
    d1_database_id    = cloudflare_d1_database.db.id
    r2_binding        = "BUCKET"
    r2_bucket_name    = cloudflare_r2_bucket.bucket.name
    kv_binding        = "kv"
    kv_namespace_id   = cloudflare_workers_kv_namespace.kv.id
  })

  depends_on = [
    cloudflare_d1_database.db,
    cloudflare_r2_bucket.bucket,
    cloudflare_workers_kv_namespace.kv
  ]
}
