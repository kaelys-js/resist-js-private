#!/bin/bash
set -euo pipefail

# 🛑 Require GitLab CI environment
if [ "${CI:-}" != "true" ]; then
  echo "❌ This script is intended to be run inside GitLab CI only."
  exit 1
fi

# ==============================================================================
# 🚀 bootstrap-d1.sh — Cloudflare Workers D1 Bootstrap Script
# ------------------------------------------------------------------------------
# This script initializes a D1 database for use in staging, production,
# or local development environments.
#
# What it does:
#   1. Determines the D1 database name (from CLI arg, env var, or default)
#   2. Ensures the D1 database exists
#   3. Applies the base schema from /src/migrations
#   4. Seeds global + tier + customer settings from .env via seed-d1-from-env.sh
#
# Usage:
#   ./scripts/bootstrap-d1.sh analytics_staging
#
# Requirements:
#   - wrangler
#   - jq
#   - .env file with all required seed variables
#   - scripts/seed-d1-from-env.sh
#   - src/migrations/000-initial-schema.sql
# ==============================================================================
source "$(dirname "$0")/common.sh"

# ------------------------------------------------------------------------------
# 🏁 Step: Ensure Target D1 Database Exists Before Proceeding
# ------------------------------------------------------------------------------
ensure_d1_database_exists

# ------------------------------------------------------------------------------
# 🏁 Step: Apply Initial Schema to D1 Database
# ------------------------------------------------------------------------------
apply_base_schema_to_d1

# ------------------------------------------------------------------------------
# 🏁 Step: Apply Additional Migrations (if any)
# ------------------------------------------------------------------------------
run_pending_migrations

# ------------------------------------------------------------------------------
# 🌱 Seed the database using .env-defined global and tier values
# ------------------------------------------------------------------------------
seed_database_from_env

# ------------------------------------------------------------------------------
# ✅ All Done
# Final confirmation that bootstrap completed successfully for the target D1 DB
# ------------------------------------------------------------------------------
log INFO "✅ Bootstrap completed successfully for D1 database: $DB_NAME"

exit 0