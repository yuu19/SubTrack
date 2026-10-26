#!/usr/bin/env bash
set -euo pipefail

expected_sha="${1:?Pass the deployed commit SHA}"
origin='https://subtracknotify.com'
health_body="$(mktemp)"
trap 'rm -f "$health_body"' EXIT

# Retry responses as well as connection errors while the deployment propagates.
healthy=0
for attempt in {1..6}; do
  if curl --silent --show-error --fail --max-time 20 \
    -H 'Cache-Control: no-cache' "$origin/api/health?commit=$expected_sha" \
    -o "$health_body" && \
    jq -e --arg sha "$expected_sha" '.status == "ok" and .commit == $sha' "$health_body" > /dev/null; then
    healthy=1
    break
  fi
  echo "Health check attempt $attempt/6 failed"
  if [[ "$attempt" -lt 6 ]]; then sleep 5; fi
done
if [[ "$healthy" -ne 1 ]]; then
  echo '::error::Production health or deployed commit verification failed'
  exit 1
fi

for path in /ja /en /ja/demo /en/demo; do
  code="$(curl --silent --show-error --fail --location --max-time 30 \
    --retry 2 --output /dev/null --write-out '%{http_code}' "$origin$path")"
  if [[ "$code" != 200 ]]; then
    echo "::error::Unexpected response for $path: $code"
    exit 1
  fi
done
echo "Production smoke checks passed for $expected_sha"
