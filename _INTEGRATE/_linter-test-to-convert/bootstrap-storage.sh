#!/bin/bash
set -euo pipefail

# 🛑 Require GitLab CI environment
if [ "${CI:-}" != "true" ]; then
  echo "❌ This script is intended to be run inside GitLab CI only."
  exit 1
fi

# ==============================================================================
# ☁️ bootstrap-storage.sh — Cloudflare KV, R2, and DO Bootstrap Script
# ------------------------------------------------------------------------------
# This script initializes storage resources defined in wrangler.json:
#   - KV Namespaces (e.g. EVENT_BUFFER)
#   - R2 Buckets (e.g. analytics-archive-[env])
#   - Durable Objects (e.g. AnalyticsBufferDO)
#
# It can be safely re-run. Intended for local, staging, production, and preview.
#
# Usage:
#   ./src/scripts/bootstrap-storage.sh
#
# Requirements:
#   - wrangler (v3.0+)
#   - jq
#   - wrangler.json must define all resources
# ==============================================================================
source "$(dirname "$0")/common.sh"

# ------------------------------------------------------------------------------
# 💾 Create R2 Buckets (defined in wrangler.json)
# ------------------------------------------------------------------------------
create_r2_buckets

# ------------------------------------------------------------------------------
# ⚡️ Create KV Namespaces
# Automatically creates any missing KV namespaces defined in wrangler.json.
# ------------------------------------------------------------------------------
create_kv_namespaces

# ------------------------------------------------------------------------------
# 🧪 Validate Durable Object Migrations
# Ensures all DO classes in bindings are registered under a migration tag
# ------------------------------------------------------------------------------
validate_do_migrations

# ------------------------------------------------------------------------------
# 🚀 Deploy DO Classes After Validation
# Deploys Durable Objects using wrangler, and checks success/failure
# ------------------------------------------------------------------------------
if deploy_durable_objects; then
  log INFO  "✅ Deployment complete: Durable Object classes successfully deployed via wrangler."
else
  log FATAL "❌ Deployment failed: wrangler was unable to deploy Durable Object classes."
  exit 1
fi

# ------------------------------------------------------------------------------
# ✅ Done
# Final confirmation that all storage bindings (KV, R2, DO) were successfully bootstrapped
# ------------------------------------------------------------------------------
log INFO "✅ Successfully bootstrapped all storage bindings: KV, R2, and Durable Objects."

exit 0