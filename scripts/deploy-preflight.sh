#!/usr/bin/env bash
set -euo pipefail

# Only print names; never print credentials.
missing=0
for key in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID PUBLIC_STRIPE_KEY \
  SECRET_STRIPE_KEY STRIPE_WEBHOOK_SECRET RESEND_API_KEY BETTER_AUTH_SECRET \
  ADMIN_USER_IDS ADMIN_BASIC_AUTH_USER ADMIN_BASIC_AUTH_PASSWORD \
  GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY \
  PUSH_CRON_SECRET PUSH_CRON_URL; do
  if [[ -z "${!key:-}" ]]; then
    echo "::error::Required deployment secret is missing: $key"
    missing=1
  fi
done
exit "$missing"
