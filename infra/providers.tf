terraform {
  required_version = ">= 1.6.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.50"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

provider "cloudflare" {
  # Prefer providing the token via the environment variable
  # TF_VAR_cloudflare_api_token or CLOUDFLARE_API_TOKEN.
  api_token = var.cloudflare_api_token
}

# Local provider is implicit; no configuration required.
