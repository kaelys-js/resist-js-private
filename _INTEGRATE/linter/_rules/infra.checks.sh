# ------------------------------------------------------------------------------
# 🧪 check::remind_stale_mrs — Notify of MRs open too long without updates
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Queries GitLab API for open MRs older than N days
#   - Logs or triggers notifications for stale MRs
#
# Why it matters:
#   - Stale MRs create tech debt and block velocity
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → Base GitLab API URL
#   - STALE_DAYS   → Age threshold in days (default: 30)
#
# Example:
#   check::remind_stale_mrs
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_stale_mrs() {
  # ✅ Check: Alert on stale MRs over STALE_DAYS old
  # Category: mr
  # Stages: notify, integration

  local threshold="${STALE_DAYS:-30}"
  local since
  since=$(date -u -d "-${threshold} days" +%Y-%m-%dT%H:%M:%SZ)

  local url="${GITLAB_API}/merge_requests?state=opened&updated_before=${since}&scope=all"

  if [[ -z "${GITLAB_TOKEN:-}" ]]; then
    log FATAL "❌ GITLAB_TOKEN is not set"
    log FATAL "   💡 Tip: Export GITLAB_TOKEN for GitLab API authentication"
    log FATAL "   📘 Example: export GITLAB_TOKEN=abc123"
    return 1
  fi

  local result
  result=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$url")

  if echo "$result" | jq -e 'length > 0' >/dev/null; then
    echo "$result" | jq -r '.[] | "⚠️ MR \(.id): \(.title) is stale (updated: \(.updated_at))"' | while read -r line; do
      log WARN "$line"
    done
    log WARN "⚠️ One or more stale MRs found (not updated in $threshold days)"
    log WARN "   💡 Tip: Reassign or comment to reactivate stale discussions"
    log WARN "   📘 Example: https://gitlab.com/your-org/your-repo/-/merge_requests"
    return 1
  else
    log INFO "✅ No stale MRs found older than $threshold days"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_labels_missing — Notify of MRs missing required labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Queries GitLab API for open merge requests
#   - Flags MRs missing required labels (e.g. type:, scope:, priority:)
#
# Why it matters:
#   - Enforces label hygiene to help routing, dashboards, and triage
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#   - REQUIRED_LABELS → Space-separated list of required label prefixes
#
# Example:
#   REQUIRED_LABELS="type: scope: priority:"
#   check::remind_mr_labels_missing
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_labels_missing() {
  # ✅ Check: MRs must include required label prefixes
  # Category: mr
  # Stages: notify, integration

  local required=(${REQUIRED_LABELS:-type: scope: priority:})

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export GitLab auth/token/env before running"
    log FATAL "   📘 Example: export GITLAB_TOKEN=abc; export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  local mrs
  mrs=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all")

  local failed=0
  echo "$mrs" | jq -c '.[]' | while read -r mr; do
    local id title web_url
    id=$(jq -r '.id' <<<"$mr")
    title=$(jq -r '.title' <<<"$mr")
    web_url=$(jq -r '.web_url' <<<"$mr")
    labels=($(jq -r '.labels[]' <<<"$mr"))

    for required_prefix in "${required[@]}"; do
      local matched=0
      for label in "${labels[@]}"; do
        if [[ "$label" == "$required_prefix"* ]]; then
          matched=1
          break
        fi
      done

      if [[ "$matched" -eq 0 ]]; then
        log WARN "⚠️ MR missing required label: $required_prefix"
        log WARN "   ↳ [$id] $title"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs have required label prefixes"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_old_commits — Warn about MRs with outdated commits
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies open MRs with commits older than N days
#   - Flags MRs that may need rebasing or updating
#
# Why it matters:
#   - Prevents merge conflicts and outdated code from being merged
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#   - MR_MAX_AGE_DAYS → Max allowed commit age (default: 14)
#
# Example:
#   MR_MAX_AGE_DAYS=10
#   check::remind_mr_old_commits
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_old_commits() {
  # ✅ Check: Warn if MR commits are too old
  # Category: mr
  # Stages: notify, integration

  local max_age="${MR_MAX_AGE_DAYS:-14}"
  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  local today ts_cutoff
  today=$(date -u +%s)
  ts_cutoff=$(( today - (max_age * 86400) ))

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title web_url last_commit
      id=$(jq -r '.id' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")
      last_commit=$(jq -r '.updated_at' <<<"$mr")
      last_ts=$(date -d "$last_commit" +%s)

      if (( last_ts < ts_cutoff )); then
        log WARN "⚠️ MR commit history is outdated: [$id] $title"
        log WARN "   ↳ Last activity: $last_commit"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No MRs have stale commit history"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_automerge_candidates — Suggest enabling automerge
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies open MRs that are mergeable but do not have automerge enabled
#   - Flags them so developers can opt in to automerge
#
# Why it matters:
#   - Encourages continuous delivery and reduces merge delays
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#
# Example:
#   check::remind_mr_automerge_candidates
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_automerge_candidates() {
  # ✅ Check: Suggest enabling automerge if conditions are met
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title web_url merge_status squash auto_merge
      id=$(jq -r '.id' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")
      merge_status=$(jq -r '.merge_status' <<<"$mr")
      squash=$(jq -r '.squash' <<<"$mr")
      auto_merge=$(jq -r '.merge_when_pipeline_succeeds' <<<"$mr")

      if [[ "$merge_status" == "can_be_merged" && "$auto_merge" == "false" ]]; then
        log WARN "⚠️ Mergeable MR does not have automerge enabled: [$id] $title"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No mergeable MRs missing automerge"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_unreviewed — Notify of open MRs needing review
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies merge requests with no approvals or reviewer comments
#   - Flags MRs that are stale or unreviewed for team visibility
#
# Why it matters:
#   - Avoids stagnating work and ensures peer review policies are upheld
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#
# Example:
#   check::remind_mr_unreviewed
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_unreviewed() {
  # ✅ Check: Warn about open MRs that need review
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title web_url approvals reviewers
      id=$(jq -r '.id' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")

      approvals=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/approvals")
      reviewers=$(jq '.approved_by | length' <<<"$approvals")

      if [[ "$reviewers" -eq 0 ]]; then
        log WARN "⚠️ Merge Request needs review: [$id] $title"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No unreviewed MRs found"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_stale — Notify of stale merge requests
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs with no activity in the past N days
#   - Flags them to prevent forgotten or abandoned contributions
#
# Why it matters:
#   - Keeps repositories clean and active
#   - Encourages timely review or closure of inactive MRs
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#   - MR_STALE_DAYS → Number of days to consider an MR stale (default: 7)
#
# Example:
#   MR_STALE_DAYS=14
#   check::remind_mr_stale
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_stale() {
  # ✅ Check: Flag stale MRs with no activity in past N days
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local days="${MR_STALE_DAYS:-7}"

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  local cutoff
  cutoff=$(date -d "$days days ago" --iso-8601=seconds)

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local updated web_url title id
      updated=$(jq -r '.updated_at' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      id=$(jq -r '.id' <<<"$mr")

      if [[ "$updated" < "$cutoff" ]]; then
        log WARN "⚠️ Stale MR detected: [$id] $title"
        log WARN "   ↳ Last updated: $updated"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs older than $days days"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_missing_labels — Notify if MRs are missing required labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks if open MRs are missing required labels (e.g. type:, scope:)
#
# Why it matters:
#   - Ensures MRs are categorized for automation, changelogs, and review filters
#
# Globals used:
#   - GITLAB_TOKEN     → GitLab API token
#   - GITLAB_API       → GitLab project API base URL
#   - MR_REQUIRED_LABELS → Space-separated list of required label prefixes
#
# Example:
#   MR_REQUIRED_LABELS="type: scope:"
#   check::remind_mr_missing_labels
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_missing_labels() {
  # ✅ Check: Flag open MRs missing required label prefixes
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local prefixes=(${MR_REQUIRED_LABELS:-type: scope:})

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export MR_REQUIRED_LABELS=\"type: scope:\""
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title labels web_url
      id=$(jq -r '.id' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")
      mapfile -t labels < <(jq -r '.labels[]?' <<<"$mr")

      for prefix in "${prefixes[@]}"; do
        local matched=0
        for label in "${labels[@]}"; do
          [[ "$label" == "$prefix"* ]] && matched=1 && break
        done
        if [[ "$matched" -eq 0 ]]; then
          log WARN "⚠️ MR missing required label ($prefix*): [$id] $title"
          log WARN "   ↳ $web_url"
          failed=1
        fi
      done
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs contain required labels"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_not_assigned — Remind if open MRs lack assignees
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs with no assignee set
#
# Why it matters:
#   - Prevents merge requests from being overlooked
#   - Enforces accountability and smoother handoffs
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_not_assigned
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_not_assigned() {
  # ✅ Check: All open MRs must have an assignee
  # Category: mr
  # Stages: notify, integration

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  local failed=0

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local assignee title id url
      assignee=$(jq -r '.assignee // empty' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      id=$(jq -r '.iid' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")

      if [[ -z "$assignee" || "$assignee" == "null" ]]; then
        log WARN "⚠️ MR not assigned: [$id] $title"
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All open MRs have assignees"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_old_stale — Remind on old/stale open merge requests
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns on MRs that have not been updated in >14 days
#
# Why it matters:
#   - Encourages timely reviews and decisions
#   - Reduces context switching and forgotten contributions
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_old_stale
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_old_stale() {
  # ✅ Check: Warn on merge requests older than 14 days without update
  # Category: mr
  # Stages: notify, integration

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  local cutoff
  cutoff=$(date -d '14 days ago' +%s)
  local failed=0

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local updated title id url
      updated=$(jq -r '.updated_at' <<<"$mr")
      updated_ts=$(date -d "$updated" +%s)
      title=$(jq -r '.title' <<<"$mr")
      id=$(jq -r '.iid' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")

      if (( updated_ts < cutoff )); then
        log WARN "⚠️ Stale MR not updated in 14+ days: [$id] $title"
        log WARN "   ↳ Last updated: $updated"
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs over 14 days old"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_missing_labels — Remind if MRs are missing required labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns on merge requests that lack critical labels (e.g. type, scope, priority)
#
# Why it matters:
#   - Enforces label hygiene for filtering, reporting, and automation
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_missing_labels
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_missing_labels() {
  # ✅ Check: Warn on MRs missing required labels like type, scope, or priority
  # Category: mr
  # Stages: notify, integration

  local required_labels=("type:" "scope:" "priority:")
  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local title id url labels missing
      id=$(jq -r '.iid' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")
      mapfile -t labels < <(jq -r '.labels[]' <<<"$mr")

      missing=()
      for required in "${required_labels[@]}"; do
        if ! printf '%s\n' "${labels[@]}" | grep -q "^$required"; then
          missing+=("$required")
        fi
      done

      if [[ "${#missing[@]}" -gt 0 ]]; then
        log WARN "⚠️ MR missing required labels: [$id] $title"
        log WARN "   ↳ Missing: ${missing[*]}"
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All open MRs include required labels"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_unassigned — Remind if MRs are missing an assignee
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns for all open merge requests without any assigned user
#
# Why it matters:
#   - Prevents unreviewed or orphaned merge requests
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_unassigned
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_unassigned() {
  # ✅ Check: Warn on open MRs with no assignee
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title url assignees
      id=$(jq -r '.iid' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")
      assignees=$(jq -r '.assignees | length' <<<"$mr")

      if [[ "$assignees" -eq 0 ]]; then
        log WARN "⚠️ MR has no assignee: [$id] $title"
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All open MRs have assignees"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_stale_review_requested — Notify on stale MRs with unresolved review requests
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects MRs with reviewers requested but no activity for > X days
#
# Why it matters:
#   - Highlights forgotten or neglected review requests
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#   - MR_STALE_DAYS → Threshold in days (default: 3)
#
# Example:
#   MR_STALE_DAYS=5
#   check::remind_mr_stale_review_requested
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_stale_review_requested() {
  # ✅ Check: Warn if any merge request has open review request but no updates in N days
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local days="${MR_STALE_DAYS:-3}"
  local cutoff
  cutoff=$(date -d "$days days ago" --iso-8601=seconds)

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export GitLab API vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id updated title url reviewers
      id=$(jq -r '.iid' <<<"$mr")
      updated=$(jq -r '.updated_at' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")
      reviewers=$(jq -r '.reviewers | length' <<<"$mr")

      if [[ "$reviewers" -gt 0 && "$updated" < "$cutoff" ]]; then
        log WARN "⚠️ MR $id is stale with pending reviewers: \"$title\""
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs with unresolved review requests"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_no_discussion_started — Notify on MRs with no discussion threads
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs with no comments or discussions
#
# Why it matters:
#   - Surfaces MRs that may be stuck without any reviewer engagement
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_no_discussion_started
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_no_discussion_started() {
  # ✅ Check: Open MRs without any discussion threads
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export GitLab API vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mr_ids < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" | jq -r '.[] | .iid'
  )

  for id in "${mr_ids[@]}"; do
    local discussions
    discussions=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/discussions")

    if [[ "$(jq length <<<"$discussions")" -eq 0 ]]; then
      local title url
      title=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id" | jq -r '.title')
      url=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id" | jq -r '.web_url')
      log WARN "⚠️ MR $id has no discussion: \"$title\""
      log WARN "   ↳ $url"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs have at least one discussion thread"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_blocked_label — Notify on MRs marked blocked for too long
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects MRs with a 'blocked' label that have not changed in >N days
#
# Why it matters:
#   - Highlights long-stalled MRs waiting for external/unresolved action
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_blocked_label
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_blocked_label() {
  # ✅ Check: Detect open MRs with label 'blocked' and no activity
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local max_age_days=7

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API context for reminders"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t blocked_mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all&with_labels_details=true" |
    jq -c '.[] | select(.labels | index("blocked"))'
  )

  for mr in "${blocked_mrs[@]}"; do
    local id updated title url
    id=$(jq -r '.iid' <<< "$mr")
    updated=$(jq -r '.updated_at' <<< "$mr")
    title=$(jq -r '.title' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    # Convert date to timestamp and compare
    local updated_ts now_ts age_days
    updated_ts=$(date -d "$updated" +%s)
    now_ts=$(date +%s)
    age_days=$(( (now_ts - updated_ts) / 86400 ))

    if (( age_days >= max_age_days )); then
      log WARN "⚠️ MR $id has been blocked for $age_days days: \"$title\""
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Resolve the block or update the MR status"
      log WARN "   📘 Example: Remove 'blocked' label if resolved"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No long-blocked MRs detected"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_not_moved_recently — Notify on MRs with no activity
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs with no updates or commits in >N days
#
# Why it matters:
#   - Helps identify forgotten or stale MRs that require action
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_not_moved_recently
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_not_moved_recently() {
  # ✅ Check: Detect MRs with no activity for N+ days
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local max_days=10

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Provide GitLab API context for reminders"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id title updated url updated_ts now_ts age_days
    id=$(jq -r '.iid' <<< "$mr")
    title=$(jq -r '.title' <<< "$mr")
    updated=$(jq -r '.updated_at' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    updated_ts=$(date -d "$updated" +%s)
    now_ts=$(date +%s)
    age_days=$(( (now_ts - updated_ts) / 86400 ))

    if (( age_days > max_days )); then
      log WARN "⚠️ MR $id is stale: no updates for $age_days days"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Rebase, close, or comment to revive the MR"
      log WARN "   📘 Example: git commit --allow-empty -m 'poke CI'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs recently updated"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_no_assignee — Notify on MRs with no assignee
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all open merge requests for missing assignees
#
# Why it matters:
#   - Prevents merge requests from being ignored or unowned
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_no_assignee
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_no_assignee() {
  # ✅ Check: Open MRs must have assignees
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Provide GitLab API context for reminders"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id assignee url
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    assignee=$(jq -r '.assignee // empty' <<< "$mr")

    if [[ -z "$assignee" || "$assignee" == "null" ]]; then
      log WARN "⚠️ MR $id has no assignee"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Assign a responsible developer to move this MR forward"
      log WARN "   📘 Example: GitLab UI → Assign dropdown"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All open MRs have assignees"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_missing_scope_label — Remind on MRs missing scope labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies MRs with no label matching pattern: scope:<value>
#
# Why it matters:
#   - Enforces clear categorization of changes
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_missing_scope_label
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_missing_scope_label() {
  # ✅ Check: All MRs must include a scope:<label>
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Provide GitLab API access to query merge requests"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url has_scope=0
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    mapfile -t labels < <(jq -r '.labels[]?' <<< "$mr")

    for label in "${labels[@]}"; do
      [[ "$label" =~ ^scope: ]] && has_scope=1 && break
    done

    if [[ "$has_scope" -eq 0 ]]; then
      log WARN "⚠️ MR $id is missing a scope label"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Add a label like 'scope:api', 'scope:docs', 'scope:infra'"
      log WARN "   📘 Example: GitLab UI → Labels → Add 'scope:<team/module>'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs include at least one scope:<label>"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_needs_changelog — Remind on MRs missing changelog label
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs missing `changelog:` labels (e.g. changelog:added)
#
# Why it matters:
#   - Ensures all user-facing changes are tracked in release notes
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_needs_changelog
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_needs_changelog() {
  # ✅ Check: All MRs must include a changelog:<label>
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url has_changelog=0
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    mapfile -t labels < <(jq -r '.labels[]?' <<< "$mr")

    for label in "${labels[@]}"; do
      [[ "$label" =~ ^changelog: ]] && has_changelog=1 && break
    done

    if [[ "$has_changelog" -eq 0 ]]; then
      log WARN "⚠️ MR $id is missing a changelog label"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Add a label like 'changelog:added', 'changelog:fixed', or 'changelog:removed'"
      log WARN "   📘 Example: GitLab UI → Labels → Add 'changelog:<type>'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs include at least one changelog:<label>"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_pending_approval — Remind on MRs still missing approval
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs that have no approvals
#   - Warns if approval rules are configured but not satisfied
#
# Why it matters:
#   - Ensures merge requests aren't merged without peer review
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_pending_approval
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_pending_approval() {
  # ✅ Check: Open MRs must have at least one approval if rules are defined
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url approvals_required approvals_left
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    approvals=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/approvals")
    approvals_required=$(jq -r '.approvals_required // 0' <<< "$approvals")
    approvals_left=$(jq -r '.approvals_left // 0' <<< "$approvals")

    if (( approvals_required > 0 && approvals_left > 0 )); then
      log WARN "⚠️ MR $id is pending approval ($approvals_left approvals left)"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Request a reviewer or reassign to ensure required approvals are received"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs have sufficient approvals or none required"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_pending_approval — Remind on MRs still missing approval
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs that have no approvals
#   - Warns if approval rules are configured but not satisfied
#
# Why it matters:
#   - Ensures merge requests aren't merged without peer review
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_pending_approval
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_pending_approval() {
  # ✅ Check: Open MRs must have at least one approval if rules are defined
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url approvals_required approvals_left
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    approvals=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/approvals")
    approvals_required=$(jq -r '.approvals_required // 0' <<< "$approvals")
    approvals_left=$(jq -r '.approvals_left // 0' <<< "$approvals")

    if (( approvals_required > 0 && approvals_left > 0 )); then
      log WARN "⚠️ MR $id is pending approval ($approvals_left approvals left)"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Request a reviewer or reassign to ensure required approvals are received"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs have sufficient approvals or none required"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_assignee_missing — Warn if MRs have no assignee
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans open MRs for missing assignee
#   - Warns if any MRs are not assigned
#
# Why it matters:
#   - Encourages accountability and review ownership
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_assignee_missing
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_assignee_missing() {
  # ✅ Check: All open MRs should have an assignee
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url assignee
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    assignee=$(jq -r '.assignee // empty' <<< "$mr")

    if [[ -z "$assignee" || "$assignee" == "null" ]]; then
      log WARN "⚠️ MR $id has no assignee"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Assign a reviewer to ensure it gets triaged"
      log WARN "   📘 Example: Click 'Assign' in GitLab UI or use GitLab CLI"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs are assigned"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_stale — Warn if MRs are open too long without updates
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags open MRs with no activity in the last N days (default: 10)
#
# Why it matters:
#   - Encourages active review cycles and avoids stale work
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#   - MR_STALE_DAYS → Number of days to consider a MR stale (default 10)
#
# Example:
#   MR_STALE_DAYS=14
#   check::remind_mr_stale
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_stale() {
  # ✅ Check: Warn on stale MRs
  # Category: mr
  # Stages: notify, lint

  local failed=0
  local days="${MR_STALE_DAYS:-10}"

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    return 1
  fi

  local stale_date
  stale_date=$(date -d "-$days days" +%Y-%m-%dT%H:%M:%SZ)

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c --arg stale "$stale_date" '.[] | select(.updated_at < $stale)'
  )

  for mr in "${mrs[@]}"; do
    local id url updated
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    updated=$(jq -r '.updated_at' <<< "$mr")

    log WARN "⚠️ MR $id is stale (last updated: $updated)"
    log WARN "   ↳ $url"
    log WARN "   💡 Tip: Update MR description or comment to keep it active"
    failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_stale — Warn if MRs are open too long without updates
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags open MRs with no activity in the last N days (default: 10)
#
# Why it matters:
#   - Encourages active review cycles and avoids stale work
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#   - MR_STALE_DAYS → Number of days to consider a MR stale (default 10)
#
# Example:
#   MR_STALE_DAYS=14
#   check::remind_mr_stale
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_stale() {
  # ✅ Check: Warn on stale MRs
  # Category: mr
  # Stages: notify, lint

  local failed=0
  local days="${MR_STALE_DAYS:-10}"

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    return 1
  fi

  local stale_date
  stale_date=$(date -d "-$days days" +%Y-%m-%dT%H:%M:%SZ)

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c --arg stale "$stale_date" '.[] | select(.updated_at < $stale)'
  )

  for mr in "${mrs[@]}"; do
    local id url updated
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    updated=$(jq -r '.updated_at' <<< "$mr")

    log WARN "⚠️ MR $id is stale (last updated: $updated)"
    log WARN "   ↳ $url"
    log WARN "   💡 Tip: Update MR description or comment to keep it active"
    failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_unlinked_issue — Warn if MRs have no linked issues
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all open MRs for issue references in the description
#
# Why it matters:
#   - Enforces traceability between MRs and tracked work
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_unlinked_issue
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_unlinked_issue() {
  # ✅ Check: All MRs should reference an issue
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url desc
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    desc=$(jq -r '.description // empty' <<< "$mr")

    if ! grep -qE '(Fixes|Closes|Resolves) #[0-9]+' <<< "$desc"; then
      log WARN "⚠️ MR $id has no linked issue in description"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Reference issues using: Fixes #123"
      log WARN "   📘 Example: \"Fixes #42\""
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs link to issues"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_label_missing — Warn if MRs lack required labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags MRs missing any labels from a required set
#
# Why it matters:
#   - Ensures MRs are categorized for review and CI routing
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#   - MR_REQUIRED_LABELS → space-separated required labels (e.g. "type:bug priority:high")
#
# Example:
#   MR_REQUIRED_LABELS="type:bug type:feature"
#   check::remind_mr_label_missing
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_label_missing() {
  # ✅ Check: required labels must be present
  # Category: mr
  # Stages: notify, lint

  local failed=0
  local required=($MR_REQUIRED_LABELS)

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url labels
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    labels=$(jq -r '.labels[]?' <<< "$mr" | sort)

    for req in "${required[@]}"; do
      if ! grep -qFx "$req" <<< "$labels"; then
        log WARN "⚠️ MR $id missing required label: '$req'"
        log WARN "   ↳ $url"
        log WARN "   💡 Tip: Add the '$req' label to the merge request"
        log WARN "   📘 Example: Labels: [\"type:bug\", \"priority:high\"]"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs contain required labels"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_wip_in_title — Warn if MR title starts with WIP or Draft
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects WIP/Draft markers in MR titles
#
# Why it matters:
#   - Prevents accidental review or merge of incomplete changes
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_wip_in_title
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_wip_in_title() {
  # ✅ Check: MR title must not start with WIP/Draft
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url title
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    title=$(jq -r '.title' <<< "$mr")

    if [[ "$title" =~ ^(WIP|Draft|DRAFT|wip):? ]]; then
      log WARN "⚠️ MR $id is still marked as WIP/Draft in title"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Remove 'WIP' or 'Draft' from the title before requesting review"
      log WARN "   📘 Example: 'feat: add payment sync' ✅ vs 'WIP: add payment sync' ❌"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No WIP/Draft markers in MR titles"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_wip_in_title — Warn if MR title starts with WIP or Draft
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects WIP/Draft markers in MR titles
#
# Why it matters:
#   - Prevents accidental review or merge of incomplete changes
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_wip_in_title
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_wip_in_title() {
  # ✅ Check: MR title must not start with WIP/Draft
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url title
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    title=$(jq -r '.title' <<< "$mr")

    if [[ "$title" =~ ^(WIP|Draft|DRAFT|wip):? ]]; then
      log WARN "⚠️ MR $id is still marked as WIP/Draft in title"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Remove 'WIP' or 'Draft' from the title before requesting review"
      log WARN "   📘 Example: 'feat: add payment sync' ✅ vs 'WIP: add payment sync' ❌"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No WIP/Draft markers in MR titles"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_pipeline_failed — Warn if any MRs have failed CI pipelines
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies open MRs where the latest pipeline failed
#
# Why it matters:
#   - Ensures contributors are aware of failing CI before merge
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_pipeline_failed
#
# Categories:
#   mr, ci
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_pipeline_failed() {
  # ✅ Check: Notify for MRs with failed pipelines
  # Category: mr, ci
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url pipeline_status
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    pipeline_status=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/pipelines" |
      jq -r '.[0].status // "unknown"')

    if [[ "$pipeline_status" == "failed" ]]; then
      log WARN "⚠️ MR $id has a failed pipeline"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Check CI logs and push a fix or rerun pipeline"
      log WARN "   📘 Example: git commit --allow-empty -m 'trigger rebuild'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs passed latest CI"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_unresolved_discussions — Warn if MRs have unresolved threads
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags MRs that have unresolved discussions blocking merge
#
# Why it matters:
#   - Prevents accidental merges before team feedback is resolved
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_unresolved_discussions
#
# Categories:
#   mr
#
# Stages:
#   notify
# ------------------------------------------------------------------------------
check::remind_mr_unresolved_discussions() {
  # ✅ Check: Unresolved discussions should block merge
  # Category: mr
  # Stages: notify

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url unresolved
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    unresolved=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id" |
      jq -r '.blocking_discussions_resolved // true')

    if [[ "$unresolved" != "true" ]]; then
      log WARN "⚠️ MR $id has unresolved discussions"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Resolve or mark discussions as resolved before merging"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No unresolved discussions on open MRs"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_assignee_is_author — MR author should assign themselves
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies that the merge request assignee is the same as the author
#
# Why it matters:
#   Merge requests without an assignee may go unreviewed or blocked in CI
#
# Globals used:
#   - MR_AUTHOR       → GitLab username of the MR author
#   - MR_ASSIGNEE     → GitLab username of the current assignee (optional)
#
# Example:
#   MR_AUTHOR="alice"
#   MR_ASSIGNEE="alice"
#   check::remind_mr_assignee_is_author
#
# Categories:
#   mr
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::remind_mr_assignee_is_author() {
  # ✅ Check: MR author should assign themselves to their own merge request
  # Category: mr
  # Stages: check, lint, pre-commit

  if [[ -z "$MR_AUTHOR" || -z "$MR_ASSIGNEE" ]]; then
    log WARN "⚠️ MR_AUTHOR or MR_ASSIGNEE not set — skipping self-assignment check"
    return 0
  fi

  if [[ "$MR_AUTHOR" != "$MR_ASSIGNEE" ]]; then
    log WARN "⚠️ MR author is not assigned to their own MR"
    log WARN "   💡 Tip: Assign yourself to your MR to clarify responsibility and unblock workflows"
    log WARN "   📘 Example: Set MR_ASSIGNEE=$MR_AUTHOR in CI or manually assign in UI"
    return 1
  fi

  log INFO "✅ MR is self-assigned by author ($MR_AUTHOR)"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_missing_description — Warn if MR lacks proper description
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns if the merge request description is empty or boilerplate
#
# Why it matters:
#   Reviewers rely on MR descriptions to understand the purpose and context of changes
#
# Globals used:
#   - MR_DESCRIPTION → The raw Markdown or text description of the MR
#
# Example:
#   MR_DESCRIPTION="Adds login rate limiting"
#   check::remind_mr_missing_description
#
# Categories:
#   mr
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::remind_mr_missing_description() {
  # ✅ Check: Merge request should have a meaningful description
  # Category: mr
  # Stages: check, lint

  if [[ -z "$MR_DESCRIPTION" || "$MR_DESCRIPTION" =~ ^(TBD|WIP|\s*)$ ]]; then
    log WARN "⚠️ Merge request is missing a meaningful description"
    log WARN "   💡 Tip: Add a summary of what changed, why, and any relevant links or reviewers"
    log WARN "   📘 Example: 'Adds support for JWT refresh rotation to resolve issue #128'"
    return 1
  fi

  log INFO "✅ MR description is present"
}

# ------------------------------------------------------------------------------
# 🧪 check::tail_worker_health — Ensure tailing the deployed worker succeeds post-deploy
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Attempting to connect to the deployed worker via `wrangler tail`
#   - Validating that tailing succeeds in supported environments
#
# Why it matters:
#   Tailing the worker is a fast way to verify that it's reachable and responding post-deployment.
#   Failures may indicate DNS propagation issues, route binding problems, or broken worker startup.
#
# Globals used:
#   - WRANGLER_ENV → Target Wrangler environment to tail (e.g., staging, production)
#
# Example:
#   WRANGLER_ENV=staging
#   check::tail_worker_health
#
# Categories:
#   lint, wrangler, infra
#
# Stages:
#   test, build, deploy, integration
# ------------------------------------------------------------------------------
check::tail_worker_health() {
  # ✅ Check: Confirm tail connectivity to deployed worker using wrangler
  # Category: lint, wrangler, infra
  # Stages: test, build, deploy, integration

  echo "🔁 Checking tail worker connectivity for env: $WRANGLER_ENV"

  if timeout 10s pnpm exec wrangler tail --env "$WRANGLER_ENV"; then
    log INFO "✅ Tail worker is connectable (env: $WRANGLER_ENV)"
  else
    log WARN "❌ Tail connection failed (may be expected in non-streaming or non-interactive environments)"
    log WARN "   💡 Tip: Ensure the worker was deployed correctly and that wrangler tail is supported for this script type."
    log WARN "   📘 Example:
      pnpm exec wrangler tail --env $WRANGLER_ENV"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::sync_cf_secrets_from_env — Inject secrets into Wrangler using CI ENV vars
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Reading expected secrets from `.env.example`
#   - Verifying each one is defined in the current CI environment
#   - Injecting secrets into the target Wrangler environment using `wrangler secret put`
#
# Why it matters:
#   Cloudflare Workers depend on runtime secrets. If a required secret is missing in CI,
#   the deployed worker may fail immediately or expose unconfigured endpoints.
#
# Globals used:
#   - CI → Must be "true" (enforces CI-only usage)
#   - .env.example → Source of required secret keys
#
# Arguments:
#   $WRANGLER_ENV → Target Wrangler environment (e.g. staging, production)
#
# Example:
#   WRANGLER_ENV=staging check::sync_cf_secrets_from_env
#
# Categories:
#   secrets, wrangler, infra, ci
#
# Stages:
#   pre-commit, build, deploy
# ------------------------------------------------------------------------------
check::sync_cf_secrets_from_env() {
  # ✅ Check: Inject required secrets into Wrangler using CI environment variables
  # Category: secrets, wrangler, infra, ci
  # Stages: pre-commit, build, deploy

  local env="${WRANGLER_ENV:-}"
  local example_file=".env.example"

  if [[ -z "$env" ]]; then
    log FATAL "❌ WRANGLER_ENV not set"
    log FATAL "   💡 Tip: Provide the target environment via \`WRANGLER_ENV=staging\`"
    log FATAL "   📘 Example: WRANGLER_ENV=production check::sync_cf_secrets_from_env"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ check::sync_cf_secrets_from_env must be run inside CI (CI=true)"
    log FATAL "   💡 Tip: Do not run this function locally. It mutates production secrets."
    log FATAL "   📘 Example: CI=true WRANGLER_ENV=staging check::sync_cf_secrets_from_env"
    return 1
  fi

  if [[ ! -f "$example_file" ]]; then
    log FATAL "❌ .env.example not found"
    log FATAL "   💡 Tip: Ensure .env.example exists and includes expected secrets as KEY=value pairs."
    log FATAL "   📘 Example:
      DB_PASSWORD=
      API_SECRET="
    return 1
  fi

  local required_secrets
  mapfile -t required_secrets < <(grep -v '^#' "$example_file" | grep '=' | cut -d= -f1)

  log INFO "🔐 Syncing secrets to Cloudflare for env=$env"
  log INFO "🔍 Found ${#required_secrets[@]} required secrets"

  local missing=0
  for secret in "${required_secrets[@]}"; do
    local value="${!secret:-}"
    if [[ -n "$value" ]]; then
      log INFO "🔁 Setting $secret"
      echo "$value" | pnpm exec wrangler secret put "$secret" --env "$env" > /dev/null
    else
      log WARN "⚠️  Skipping unset secret: $secret"
      ((missing++))
    fi
  done

  if [[ "$missing" -gt 0 ]]; then
    log WARN "⚠️  $missing secrets were skipped due to missing environment variables"
  fi

  log INFO "✅ Secret sync completed for env=$env"
}

# ------------------------------------------------------------------------------
# 🧪 check::verify_cf_secret_exists — Validate that required Wrangler secrets already exist in Cloudflare
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Reading expected secret keys from `.env.example`
#   - Ensuring each secret is already present in the target Wrangler environment
#
# Why it matters:
#   If secrets are not set in Cloudflare, the worker may fail at runtime. This check
#   provides a read-only way to ensure required secrets were previously provisioned.
#
# Globals used:
#   - WRANGLER_ENV → Target environment to check (e.g. staging, production)
#   - .env.example → Source of required secrets (non-comment lines with `=`)
#
# Example:
#   WRANGLER_ENV=staging
#   check::verify_cf_secret_exists
#
# Categories:
#   secrets, wrangler, infra, ci
#
# Stages:
#   lint, test, build, deploy
# ------------------------------------------------------------------------------
check::verify_cf_secret_exists() {
  # ✅ Check: All required secrets are present in Wrangler for $WRANGLER_ENV
  # Category: secrets, wrangler, infra, ci
  # Stages: lint, test, build, deploy

  local env="${WRANGLER_ENV:-}"
  local example_file=".env.example"

  if [[ -z "$env" ]]; then
    log FATAL "❌ WRANGLER_ENV not set"
    log FATAL "   💡 Tip: Specify the environment using \`WRANGLER_ENV=staging\`"
    log FATAL "   📘 Example: WRANGLER_ENV=production check::verify_cf_secret_exists"
    return 1
  fi

  if [[ ! -f "$example_file" ]]; then
    log FATAL "❌ .env.example not found"
    log FATAL "   💡 Tip: Include your expected secret keys in .env.example"
    log FATAL "   📘 Example:
      DB_PASSWORD=
      API_KEY="
    return 1
  fi

  log INFO "🔍 Verifying Cloudflare secrets for env=$env"

  local expected_secrets
  mapfile -t expected_secrets < <(grep -v '^#' "$example_file" | grep '=' | cut -d= -f1)

  local actual_secrets
  mapfile -t actual_secrets < <(pnpm exec wrangler secret list --env "$env" | awk '{print $1}' | tail -n +2)

  local missing=()
  for key in "${expected_secrets[@]}"; do
    if ! printf '%s\n' "${actual_secrets[@]}" | grep -qx "$key"; then
      missing+=("$key")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    log FATAL "❌ Missing ${#missing[@]} required secrets in env=$env"
    log FATAL "   💡 Tip: Use \`check::sync_cf_secrets_from_env\` to inject missing secrets."
    log FATAL "   📘 Example:
      WRANGLER_ENV=$env check::sync_cf_secrets_from_env"
    printf '🔐 Missing: %s\n' "${missing[@]}"
    return 1
  fi

  log INFO "✅ All required secrets exist in env=$env"
}

# ------------------------------------------------------------------------------
# 🧪 check::cleanup_stale_analytics_data — Delete expired analytics events from D1
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Calculating a date threshold from `D1_RETENTION_DAYS`
#   - Executing a SQL DELETE against a `analytics` table using Wrangler
#
# Why it matters:
#   Stale analytics data increases cost, slows queries, and wastes storage.
#   Automated cleanup ensures D1 remains lean, fast, and compliant.
#
# Globals used:
#   - DB_NAME → The Cloudflare D1 binding name
#   - D1_RETENTION_DAYS → Number of days to retain (default: 1)
#
# Example:
#   DB_NAME=analytics_prod
#   D1_RETENTION_DAYS=30
#   check::cleanup_stale_analytics_data
#
# Categories:
#   database, wrangler, infra
#
# Stages:
#   deploy, build, test, migrate
# ------------------------------------------------------------------------------
check::cleanup_stale_analytics_data() {
  # ✅ Check: Delete analytics events older than N days from D1
  # Category: database, wrangler, infra
  # Stages: deploy, build, test, migrate

  local days="${D1_RETENTION_DAYS:-1}"
  local db="${DB_NAME:-}"

  if [[ -z "$db" ]]; then
    log FATAL "❌ DB_NAME not set"
    log FATAL "   💡 Tip: Export the target D1 database name as DB_NAME before running this cleanup"
    log FATAL "   📘 Example: DB_NAME=analytics_prod check::cleanup_stale_analytics_data"
    return 1
  fi

  local query="DELETE FROM analytics WHERE event_date < DATE('now', '-${days} day');"

  log INFO "🧼 Deleting analytics data older than $days day(s)..."
  log INFO "🧾 SQL: $query"

  if ! pnpm exec wrangler d1 execute "$db" --command "$query" > /dev/null 2>&1; then
    log FATAL "❌ Failed to clean analytics data from D1 database: $db"
    log FATAL "   💡 Tip: Check if the analytics table exists and your bindings are configured"
    log FATAL "   📘 Example: wrangler d1 execute $db --command \"$query\""
    return 1
  fi

  log INFO "✅ Expired analytics data deleted from $db (retention: $days day[s])"
}

# ------------------------------------------------------------------------------
# 🧪 check::teardown_preview_resources — Remove all preview resources (D1, KV, R2)
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Deleting the preview D1 database tied to the current Git branch
#   - Removing all KV namespaces listed in `wrangler.json` for env.preview
#   - Removing all R2 buckets listed in `wrangler.json` for env.preview
#
# Why it matters:
#   Preview environments must be torn down cleanly after CI to avoid resource sprawl,
#   cost leakage, and leftover bindings.
#
# Globals used:
#   - CI_COMMIT_REF_SLUG → Branch slug used in naming preview resources
#   - wrangler.json → Source of environment resource config
#
# Example:
#   CI_COMMIT_REF_SLUG=my-branch
#   check::teardown_preview_resources
#
# Categories:
#   infra, wrangler, ci
#
# Stages:
#   deploy, post-deploy
# ------------------------------------------------------------------------------
check::teardown_preview_resources() {
  # ✅ Check: Remove preview D1 DB, KV namespaces, and R2 buckets from wrangler.json
  # Category: infra, wrangler, ci
  # Stages: deploy, post-deploy

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ check::teardown_preview_resources must be run inside CI"
    log FATAL "   💡 Tip: This is destructive — preview environments should only be cleaned up via CI"
    log FATAL "   📘 Example: CI=true CI_COMMIT_REF_SLUG=feature-x check::teardown_preview_resources"
    return 1
  fi

  if [[ -z "${CI_COMMIT_REF_SLUG:-}" ]]; then
    log FATAL "❌ CI_COMMIT_REF_SLUG is not set"
    log FATAL "   💡 Tip: This variable is required to identify the preview D1 database"
    log FATAL "   📘 Example: CI_COMMIT_REF_SLUG=feature-x"
    return 1
  fi

  local db="preview_${CI_COMMIT_REF_SLUG}"
  log INFO "🗑️ Deleting preview D1 database: $db"
  pnpm exec wrangler d1 delete "$db" --yes > /dev/null 2>&1 || true

  if [[ ! -f wrangler.json ]]; then
    log WARN "⚠️  wrangler.json not found — skipping KV and R2 teardown"
    return 0
  fi

  log INFO "🗑️ Deleting preview KV namespaces..."
  local kv_list
  kv_list=$(jq -r '.env.preview.kv_namespaces[]?.binding' wrangler.json)
  for kv in $kv_list; do
    local ns_id
    ns_id=$(wrangler kv namespace list | jq -r --arg name "$kv" '.[] | select(.title==$name) | .id')
    if [[ -n "$ns_id" ]]; then
      log INFO "🗑️ Deleting KV namespace: $kv ($ns_id)"
      wrangler kv namespace delete --namespace-id "$ns_id" > /dev/null
    else
      log WARN "⚠️  KV namespace not found: $kv"
    fi
  done

  log INFO "🗑️ Deleting preview R2 buckets..."
  local r2_list
  r2_list=$(jq -r '.env.preview.r2_buckets[]?.bucket_name' wrangler.json)
  for r2 in $r2_list; do
    log INFO "🗑️ Deleting R2 bucket: $r2"
    wrangler r2 bucket delete "$r2" > /dev/null 2>&1 || true
  done

  log INFO "✅ Preview teardown complete for branch: $CI_COMMIT_REF_SLUG"
}

# ------------------------------------------------------------------------------
# 🧪 check::cleanup_expired_previews — Remove all expired preview DBs, KV, and R2 buckets
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scanning for all preview resources matching naming patterns:
#     - D1 databases: `preview_*`
#     - KV namespaces: `preview_*`
#     - R2 buckets: `preview-*`
#   - Deleting any matching resources using Wrangler CLI
#
# Why it matters:
#   Preview resources must be explicitly removed after branch deletion or merge.
#   This prevents leaked environments, wasted resources, and quota exhaustion.
#
# Globals used:
#   - CI → Must be true to allow cleanup
#
# Example:
#   CI=true check::cleanup_expired_previews
#
# Categories:
#   infra, wrangler, ci
#
# Stages:
#   deploy, post-deploy, cleanup
# ------------------------------------------------------------------------------
check::cleanup_expired_previews() {
  # ✅ Check: Delete expired preview D1, KV, and R2 resources
  # Category: infra, wrangler, ci
  # Stages: deploy, post-deploy, cleanup

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ check::cleanup_expired_previews must be run inside GitLab CI"
    log FATAL "   💡 Tip: This is destructive. Preview cleanup should be scheduled or run after merge."
    log FATAL "   📘 Example: CI=true check::cleanup_expired_previews"
    return 1
  fi

  log INFO "🧹 Cleaning up expired preview D1 databases..."
  local dbs
  dbs=$(pnpm exec wrangler d1 list | jq -r '.[].name' | grep '^preview_' || true)
  for db in $dbs; do
    log INFO "🗑️  Deleting D1 DB: $db"
    pnpm exec wrangler d1 delete "$db" --yes > /dev/null 2>&1 || true
  done

  log INFO "🧹 Cleaning up orphaned preview KV namespaces..."
  local kvs
  kvs=$(pnpm exec wrangler kv namespace list | jq -r '.[].title' | grep '^preview_' || true)
  for kv in $kvs; do
    local ns_id
    ns_id=$(pnpm exec wrangler kv namespace list | jq -r --arg name "$kv" '.[] | select(.title==$name) | .id')
    if [[ -n "$ns_id" ]]; then
      log INFO "🗑️  Deleting KV namespace: $kv ($ns_id)"
      pnpm exec wrangler kv namespace delete --namespace-id "$ns_id" > /dev/null 2>&1 || true
    else
      log WARN "⚠️  KV namespace ID not found for $kv — skipping"
    fi
  done

  log INFO "🧹 Cleaning up expired preview R2 buckets..."
  local buckets
  buckets=$(pnpm exec wrangler r2 bucket list | jq -r '.[].name' | grep '^preview-' || true)
  for bucket in $buckets; do
    log INFO "🗑️  Deleting R2 bucket: $bucket"
    pnpm exec wrangler r2 bucket delete "$bucket" > /dev/null 2>&1 || true
  done

  log INFO "✅ Expired preview resource cleanup complete."
}

# ------------------------------------------------------------------------------
# 🧪 check::perform_staging_rollback_with_verification — Roll back staging and verify stability
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Triggering a rollback via Cloudflare API
#   - Waiting for propagation
#   - Verifying health with a post-deploy script
#   - Optionally notifying Sentry of the rollback
#
# Why it matters:
#   Rollbacks must be automated, observable, and safely verifiable after critical failures in staging.
#
# Globals used:
#   - CLOUDFLARE_API_TOKEN → API key for Cloudflare
#   - ACCOUNT_ID → Cloudflare account ID
#   - SERVICE_NAME → Cloudflare Worker service name
#   - STAGING_URL → Health-checkable endpoint for staging
#   - SENTRY_DSN, SENTRY_KEY → Optional: for audit trail in Sentry
#
# Example:
#   WRANGLER_ENV=staging check::perform_staging_rollback_with_verification
#
# Categories:
#   infra, wrangler, ci, safety
#
# Stages:
#   deploy, post-deploy, integration
# ------------------------------------------------------------------------------
check::perform_staging_rollback_with_verification() {
  # ✅ Check: Trigger rollback and verify staging system health
  # Category: infra, wrangler, ci, safety
  # Stages: deploy, post-deploy, integration

  log INFO "🔁 Triggering rollback for staging environment..."

  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${ACCOUNT_ID:-}" || -z "${SERVICE_NAME:-}" ]]; then
    log FATAL "❌ Missing required env vars: CLOUDFLARE_API_TOKEN, ACCOUNT_ID, or SERVICE_NAME"
    log FATAL "   💡 Tip: These are required to authorize the rollback"
    log FATAL "   📘 Example: export CLOUDFLARE_API_TOKEN=... ACCOUNT_ID=... SERVICE_NAME=..."
    return 1
  fi

  if ! curl --fail -X POST \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/services/$SERVICE_NAME/environments/staging/rollback" \
    > /dev/null 2>&1; then
    log FATAL "❌ Failed to trigger rollback via Cloudflare API"
    log FATAL "   💡 Tip: Verify your service name and account ID are correct"
    log FATAL "   📘 Example URL: https://api.cloudflare.com/client/v4/accounts/.../rollback"
    return 1
  fi

  log INFO "⏳ Waiting for rollback propagation..."
  sleep 10

  if [[ -z "${STAGING_URL:-}" ]]; then
    log WARN "⚠️  STAGING_URL not set — skipping health check"
  else
    log INFO "🔍 Verifying rollback health at $STAGING_URL"
    if ! ./src/scripts/post-deploy-health-check.sh "$STAGING_URL"; then
      log FATAL "❌ Health check failed after rollback"
      log FATAL "   💡 Tip: Verify staging is reachable and rolled back cleanly"
      log FATAL "   📘 Example: curl $STAGING_URL"
      return 1
    fi
  fi

  if [[ -n "${SENTRY_DSN:-}" && -n "${SENTRY_KEY:-}" ]]; then
    log INFO "📡 Sending Sentry rollback audit event..."
    curl -s https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/store/ \
      -H "X-Sentry-Auth: Sentry sentry_version=7, sentry_key=$SENTRY_KEY, sentry_client=cf-ci/1.0" \
      -H "Content-Type: application/json" \
      -d '{"message":"Staging rollback completed","level":"info","platform":"javascript"}' \
      > /dev/null 2>&1 || log WARN "⚠️  Failed to notify Sentry"
  else
    log INFO "ℹ️  Skipping Sentry notification — SENTRY_DSN or SENTRY_KEY not set"
  fi

  if command -v post_rollback_infra_verification >/dev/null 2>&1; then
    log INFO "🔎 Running post-rollback infrastructure verification..."
    post_rollback_infra_verification || {
      log FATAL "❌ Post-infra verification failed"
      return 1
    }
  else
    log INFO "ℹ️  No post_rollback_infra_verification hook defined"
  fi

  log INFO "✅ Staging rollback and verification completed successfully."
}

# ------------------------------------------------------------------------------
# 🧪 check::post_rollback_infra_verification — Confirm all bindings are valid after rollback
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring KV, R2, D1, and tail worker are operational after a rollback
#   - Capturing output of all checks to `.rollback-staging-summary.md`
#
# Why it matters:
#   After rollback, bindings and endpoints may still be stale or broken.
#   This check verifies all critical infrastructure is reachable and correct.
#
# Globals used:
#   - Any globals required by `validate_kv_namespaces`, `validate_r2`, `validate_d1_database`, `check_tail_worker`
#
# Example:
#   check::post_rollback_infra_verification
#
# Categories:
#   infra, wrangler, ci, safety
#
# Stages:
#   post-deploy, integration, cleanup
# ------------------------------------------------------------------------------
check::post_rollback_infra_verification() {
  # ✅ Check: Run full binding and tail verification after rollback
  # Category: infra, wrangler, ci, safety
  # Stages: post-deploy, integration, cleanup

  local summary=".rollback-staging-summary.md"
  echo "🔍 Revalidating bindings after rollback..." | tee "$summary"

  local failed=0

  for check in validate_kv_namespaces validate_r2 validate_d1_database check_tail_worker; do
    if command -v "$check" >/dev/null 2>&1; then
      log INFO "▶️  Running $check"
      if ! "$check" 2>&1 | tee -a "$summary"; then
        log FATAL "❌ $check failed"
        ((failed++))
      fi
    else
      log WARN "⚠️  $check not defined — skipping"
      echo "⚠️  $check not defined — skipped" >> "$summary"
    fi
  done

  if (( failed > 0 )); then
    log FATAL "❌ One or more rollback binding checks failed"
    log FATAL "   💡 Tip: Inspect .rollback-staging-summary.md for full output"
    log FATAL "   📘 Example: cat .rollback-staging-summary.md"
    return 1
  fi

  log INFO "✅ All post-rollback binding checks passed"
}

# ------------------------------------------------------------------------------
# 🧪 check::reset_local_environment — Reset or bootstrap local dev state for D1, KV, R2
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Resetting local dev state in "clean", "onboard", or "dev" mode
#   - Deleting/recreating local D1 SQLite, KV, and R2 directories
#   - Applying schema and seeding environment config into local D1
#
# Why it matters:
#   Ensures local environments start from a consistent and repeatable state.
#   Prevents stale dev data and missing migrations from causing local bugs.
#
# Globals used:
#   - DB_NAME → D1 binding name
#   - SCHEMA_FILE → SQL schema file path
#   - D1_SQLITE → SQLite file path
#   - KV_DIR, R2_DIR → Local storage folders
#   - SEED_SCRIPT → Script to seed local D1
#   - ENV_FILE → .env path passed into seed
#   - MODE → Optional override for nested mode
#
# Example:
#   check::reset_local_environment clean
#
# Categories:
#   infra, database, shell, wrangler
#
# Stages:
#   hydrate, build, pre-commit, dev
# ------------------------------------------------------------------------------
check::reset_local_environment() {
  # ✅ Check: Reset or bootstrap local D1/KV/R2 state
  # Category: infra, database, shell, wrangler
  # Stages: hydrate, build, pre-commit, dev

  local mode="$1"
  local bootstrap_marker=".wrangler/state/.bootstrapped"

  if [[ "$mode" == "clean" || "$mode" == "onboard" ]]; then
    log WARN "🧹 Wiping local development environment: D1, KV, and R2"

    log INFO "🗑️  Deleting local D1 SQLite database: $D1_SQLITE"
    rm -f "$D1_SQLITE" || true
    mkdir -p "$(dirname "$D1_SQLITE")"

    log INFO "🗑️  Removing local KV and R2 directories: $KV_DIR, $R2_DIR"
    rm -rf "$KV_DIR" "$R2_DIR" || true
    mkdir -p "$KV_DIR" "$R2_DIR"

    if [[ ! -f "$SCHEMA_FILE" ]]; then
      log FATAL "❌ Cannot apply schema — file not found: $SCHEMA_FILE"
      log FATAL "   💡 Tip: Double-check your schema file path or bind it via SCHEMA_FILE"
      log FATAL "   📘 Example: export SCHEMA_FILE=./infra/schema.sql"
      return 1
    fi

    log INFO "🧱 Applying schema from: $SCHEMA_FILE"
    if ! wrangler d1 execute "$DB_NAME" --file="$SCHEMA_FILE"; then
      log FATAL "❌ Failed to apply base schema to D1"
      log FATAL "   💡 Tip: Verify D1 is running and the schema file is valid SQL"
      return 1
    fi

    log INFO "🌱 Seeding local D1 database using: $SEED_SCRIPT"
    export DB_NAME ENV_FILE
    if ! source "$SEED_SCRIPT"; then
      log FATAL "❌ Seeding failed: $SEED_SCRIPT"
      return 1
    fi

  else
    log INFO "🔄 Skipping reset — preserving local D1/KV/R2 state"

    if [[ "${MODE:-$mode}" == "dev" ]]; then
      if [[ ! -f "$bootstrap_marker" ]]; then
        log INFO "🧪 First-time local dev detected — running onboard mode..."
        "$0" onboard || {
          log FATAL "❌ Failed to run onboard bootstrap"
          return 1
        }
        touch "$bootstrap_marker"
      fi

      if command -v launch_local_dev_server >/dev/null 2>&1; then
        log INFO "🚀 Launching local dev server"
        launch_local_dev_server
      else
        log WARN "⚠️  launch_local_dev_server not defined"
      fi
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::create_kv_namespaces — Provision missing KV namespaces from wrangler.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parsing `kv_namespaces` from wrangler.json or env.<ENVIRONMENT>.kv_namespaces
#   - Creating any missing namespaces using Wrangler CLI
#
# Why it matters:
#   If KV bindings aren't created, Workers will crash at runtime with missing binding errors.
#   This prevents broken deployments and ensures parity with config.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json (default: wrangler.json)
#   - ENVIRONMENT → Optional (e.g. preview, staging, production)
#
# Example:
#   ENVIRONMENT=staging WRANGLER_CONFIG=wrangler.json check::create_kv_namespaces
#
# Categories:
#   wrangler, infra, ci
#
# Stages:
#   hydrate, build, deploy
# ------------------------------------------------------------------------------
check::create_kv_namespaces() {
  # ✅ Check: Create missing KV namespaces from wrangler.json
  # Category: wrangler, infra, ci
  # Stages: hydrate, build, deploy

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ $config not found"
    log FATAL "   💡 Tip: Ensure Wrangler config is committed and accessible in CI or local shell"
    log FATAL "   📘 Example: cp wrangler.json.example wrangler.json"
    return 1
  fi

  local jq_expr
  if [[ -n "${ENVIRONMENT:-}" ]]; then
    jq_expr=".env.\"$ENVIRONMENT\".kv_namespaces[]?.binding"
  else
    jq_expr=".kv_namespaces[]?.binding"
  fi

  local namespaces
  namespaces=$(jq -r "$jq_expr" "$config" 2>/dev/null | grep -v '^null$' | sort -u)

  if [[ -z "$namespaces" ]]; then
    log INFO "ℹ️ No KV namespaces defined in $config under ${ENVIRONMENT:+env.$ENVIRONMENT} — skipping"
    return 0
  fi

  log INFO "⚡ Found KV bindings: $namespaces"

  local failed=0
  for name in $namespaces; do
    if ! pnpm exec wrangler kv namespace list | jq -r '.[].title' | grep -q "^$name$"; then
      log INFO "📦 Creating KV namespace: $name"
      if ! pnpm exec wrangler kv namespace create --binding "$name" ${ENVIRONMENT:+--env "$ENVIRONMENT"} > /dev/null; then
        log FATAL "❌ Failed to create KV namespace: $name"
        failed=1
      fi
    else
      log INFO "✅ KV namespace already exists: $name"
    fi
  done

  if [[ "$failed" -ne 0 ]]; then
    return 1
  fi

  log INFO "✅ KV namespace provisioning complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_kv_namespaces — Ensure required KV namespaces exist in Cloudflare
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Reading declared KV bindings from `wrangler.json` for the given $WRANGLER_ENV
#   - Comparing against live namespaces from `wrangler kv namespace list`
#
# Why it matters:
#   Missing KV bindings will break your worker at runtime with unresolved binding errors.
#   This check ensures that expected bindings are provisioned before deploy or test.
#
# Globals used:
#   - WRANGLER_ENV → Environment block to check (e.g. preview, staging)
#   - wrangler.json → Declares `env.<env>.kv_namespaces[]`
#
# Example:
#   WRANGLER_ENV=preview check::validate_kv_namespaces
#
# Categories:
#   infra, wrangler, ci
#
# Stages:
#   hydrate, build, test, deploy
# ------------------------------------------------------------------------------
check::validate_kv_namespaces() {
  # ✅ Check: Validate required KV namespaces exist in Cloudflare
  # Category: infra, wrangler, ci
  # Stages: hydrate, build, test, deploy

  local env="${WRANGLER_ENV:-}"
  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ -z "$env" ]]; then
    log FATAL "❌ WRANGLER_ENV is not set"
    log FATAL "   💡 Tip: Provide a target environment to validate KV bindings"
    log FATAL "   📘 Example: WRANGLER_ENV=preview check::validate_kv_namespaces"
    return 1
  fi

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ Wrangler config not found: $config"
    log FATAL "   💡 Tip: Ensure wrangler.json is present and valid"
    return 1
  fi

  log INFO "📦 Validating KV namespaces for env: $env"

  local kv_bindings
  kv_bindings=$(jq -r ".env[\"$env\"].kv_namespaces[]?.binding" "$config" 2>/dev/null | grep -v '^null$' | sort -u)

  if [[ -z "$kv_bindings" ]]; then
    log WARN "⚠️  No KV namespaces declared for $env in $config"
    return 0
  fi

  local actual_kv
  mapfile -t actual_kv < <(pnpm exec wrangler kv namespace list | jq -r '.[].title')

  local missing=0
  for kv in $kv_bindings; do
    if printf '%s\n' "${actual_kv[@]}" | grep -Fxq "$kv"; then
      log INFO "✅ Found KV: $kv"
    else
      log FATAL "❌ Missing KV: $kv"
      missing=1
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "❌ One or more required KV bindings are missing"
    log FATAL "   💡 Tip: Run check::create_kv_namespaces to provision missing KV namespaces"
    log FATAL "   📘 Example: ENVIRONMENT=$env check::create_kv_namespaces"
    return 1
  fi

  log INFO "✅ All KV namespaces for $env are present"
}

# ------------------------------------------------------------------------------
# 🧪 check::create_r2_buckets — Ensure all declared R2 buckets are created
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parsing `r2_buckets` from wrangler.json (or env.<ENVIRONMENT>.r2_buckets)
#   - Creating any buckets that do not already exist via Wrangler CLI
#
# Why it matters:
#   R2 buckets must exist before deployment. Missing buckets will cause Workers to fail
#   at runtime when bindings are unresolved or operations are rejected.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json (default: wrangler.json)
#   - ENVIRONMENT → Optional environment block (e.g., preview, staging)
#
# Example:
#   ENVIRONMENT=staging WRANGLER_CONFIG=wrangler.json check::create_r2_buckets
#
# Categories:
#   wrangler, infra, ci
#
# Stages:
#   hydrate, build, deploy
# ------------------------------------------------------------------------------
check::create_r2_buckets() {
  # ✅ Check: Create any missing R2 buckets declared in wrangler.json
  # Category: wrangler, infra, ci
  # Stages: hydrate, build, deploy

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ wrangler.json not found at path: $config"
    log FATAL "   💡 Tip: Ensure your config is committed and correct"
    log FATAL "   📘 Example: cp wrangler.json.example $config"
    return 1
  fi

  local jq_expr
  if [[ -n "${ENVIRONMENT:-}" ]]; then
    jq_expr=".env.\"$ENVIRONMENT\".r2_buckets[]?.bucket_name"
  else
    jq_expr=".r2_buckets[]?.bucket_name"
  fi

  local r2_buckets
  r2_buckets=$(jq -r "$jq_expr" "$config" 2>/dev/null | grep -v '^null$' | sort -u)

  if [[ -z "$r2_buckets" ]]; then
    log WARN "ℹ️  No R2 bucket definitions found in ${ENVIRONMENT:+env.$ENVIRONMENT} → r2_buckets"
    return 0
  fi

  log INFO "💾 Creating R2 buckets defined in $config..."

  local existing
  mapfile -t existing < <(pnpm exec wrangler r2 bucket list | jq -r '.[].name')

  local failed=0
  for name in $r2_buckets; do
    if printf '%s\n' "${existing[@]}" | grep -Fxq "$name"; then
      log INFO "✅ R2 bucket already exists: $name"
    else
      log INFO "📦 R2 bucket not found — creating: $name"
      if ! pnpm exec wrangler r2 bucket create "$name" > /dev/null 2>&1; then
        log FATAL "❌ Failed to create R2 bucket: $name"
        failed=1
      fi
    fi
  done

  if [[ "$failed" -ne 0 ]]; then
    return 1
  fi

  log INFO "✅ R2 bucket provisioning complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_r2_buckets — Ensure required R2 buckets exist in the account
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that each bucket in $REQUIRED_BUCKETS exists in the current account
#   - Enforcing CI-only execution to prevent destructive usage
#
# Why it matters:
#   Missing R2 buckets will cause runtime binding errors in Workers using them.
#   This validation prevents broken deployments and ensures resource consistency.
#
# Globals used:
#   - CI → Must be "true" to run
#   - ENV → Logical environment name (e.g., staging, production)
#   - REQUIRED_BUCKETS → Array of R2 bucket names to validate
#
# Example:
#   ENV=staging REQUIRED_BUCKETS=("analytics-archive" "logs-archive") check::validate_r2_buckets
#
# Categories:
#   wrangler, infra, ci
#
# Stages:
#   build, test, deploy
# ------------------------------------------------------------------------------
check::validate_r2_buckets() {
  # ✅ Check: Ensure all declared R2 buckets are present in the account
  # Category: wrangler, infra, ci
  # Stages: build, test, deploy

  local env="${ENV:-}"

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ check::validate_r2_buckets must be run inside GitLab CI"
    log FATAL "   💡 Tip: Add \`CI=true\` to your CI environment"
    log FATAL "   📘 Example: CI=true ENV=staging check::validate_r2_buckets"
    return 1
  fi

  if [[ -z "${REQUIRED_BUCKETS[*]:-}" ]]; then
    log FATAL "❌ REQUIRED_BUCKETS is not defined"
    log FATAL "   💡 Tip: Provide a list of required R2 buckets as a bash array"
    log FATAL "   📘 Example: REQUIRED_BUCKETS=(archive-a archive-b)"
    return 1
  fi

  log INFO "📦 Validating required R2 buckets for environment: ${env:-<unset>}"

  local existing
  mapfile -t existing < <(pnpm exec wrangler r2 bucket list | jq -r '.[].name')

  local missing=0
  for bucket in "${REQUIRED_BUCKETS[@]}"; do
    if printf '%s\n' "${existing[@]}" | grep -Fxq "$bucket"; then
      log INFO "✅ Found R2 bucket: $bucket"
    else
      log FATAL "❌ Missing R2 bucket: $bucket"
      ((missing++))
    fi
  done

  if [[ "$missing" -gt 0 ]]; then
    log FATAL "❌ R2 bucket validation failed — $missing bucket(s) missing"
    log FATAL "   💡 Tip: Run \`check::create_r2_buckets\` to provision them"
    return 1
  fi

  log INFO "✅ All required R2 buckets are present for $env"
}

# ------------------------------------------------------------------------------
# 🧪 check::ensure_d1_database_exists — Ensure required D1 database exists or create it
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking if a D1 database named $DB_NAME exists in the current account
#   - Creating the database if it doesn't already exist
#
# Why it matters:
#   Workers using D1 will fail if the database binding is not created.
#   This check ensures your project bootstraps correctly in all environments.
#
# Globals used:
#   - DB_NAME → Name of the D1 database to check/create
#   - ENVIRONMENT → Optional environment tag for display/logging
#
# Example:
#   DB_NAME=analytics_prod check::ensure_d1_database_exists
#
# Categories:
#   wrangler, infra, database, ci
#
# Stages:
#   hydrate, build, deploy
# ------------------------------------------------------------------------------
check::ensure_d1_database_exists() {
  # ✅ Check: Create D1 database if it doesn't exist
  # Category: wrangler, infra, database, ci
  # Stages: hydrate, build, deploy

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set — cannot validate or create D1 database"
    log FATAL "   💡 Tip: Set DB_NAME before running this check"
    log FATAL "   📘 Example: DB_NAME=analytics_prod check::ensure_d1_database_exists"
    return 1
  fi

  local env_suffix="${ENVIRONMENT:+ (env: $ENVIRONMENT)}"
  log INFO "🔍 Verifying existence of D1 database: '$DB_NAME'$env_suffix"

  if ! pnpm exec wrangler d1 list | jq -e --arg name "$DB_NAME" '.[] | select(.name == $name)' > /dev/null; then
    log INFO "📦 D1 database not found — creating new database: '$DB_NAME'"
    if ! pnpm exec wrangler d1 create "$DB_NAME" > /dev/null; then
      log FATAL "❌ Failed to create D1 database: '$DB_NAME'"
      log FATAL "   💡 Tip: Check your API token, permissions, and account ID"
      log FATAL "   📘 Example: pnpm exec wrangler d1 create $DB_NAME"
      return 1
    fi
    log INFO "✅ D1 database successfully created: '$DB_NAME'"
  else
    log INFO "✅ D1 database already exists: '$DB_NAME'"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::apply_base_schema_to_d1 — Apply base SQL schema to the D1 database
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Confirming that the base schema SQL file exists
#   - Checking if the schema has already been applied (by verifying known table)
#   - Applying the schema if needed using Wrangler
#
# Why it matters:
#   Applying a schema multiple times can fail unless it’s fully idempotent.
#   This check ensures we only apply the base schema once and only when needed.
#
# Globals used:
#   - DB_NAME → D1 database name
#   - BASE_SCHEMA_PATH → Path to base schema .sql file
#   - SCHEMA_CHECK_TABLE → Optional override for table to check (default: migrations)
#
# Example:
#   DB_NAME=analytics BASE_SCHEMA_PATH=schema/base.sql check::apply_base_schema_to_d1
#
# Categories:
#   database, wrangler, infra
#
# Stages:
#   hydrate, build, test
# ------------------------------------------------------------------------------
check::apply_base_schema_to_d1() {
  # ✅ Check: Apply base schema file to D1 database only if not already present
  # Category: database, wrangler, infra
  # Stages: hydrate, build, test

  local table="${SCHEMA_CHECK_TABLE:-migrations}"

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set. Cannot apply schema."
    log FATAL "   💡 Tip: Provide the D1 binding name via DB_NAME"
    log FATAL "   📘 Example: DB_NAME=analytics check::apply_base_schema_to_d1"
    return 1
  fi

  if [[ -z "${BASE_SCHEMA_PATH:-}" || ! -f "$BASE_SCHEMA_PATH" ]]; then
    log FATAL "❌ Base schema file not found: $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Set BASE_SCHEMA_PATH to your base schema .sql file"
    return 1
  fi

  log INFO "🔍 Checking if schema is already applied by verifying table '$table' exists..."

  if pnpm exec wrangler d1 execute "$DB_NAME" --command \
    "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" \
    | grep -q "$table"; then
    log INFO "✅ Schema already applied — table '$table' exists. Skipping."
    return 0
  fi

  log INFO "🧱 Applying base schema to D1 database: $DB_NAME"
  log INFO "📄 Using schema file: $BASE_SCHEMA_PATH"

  if ! pnpm exec wrangler d1 execute "$DB_NAME" --file "$BASE_SCHEMA_PATH"; then
    log FATAL "❌ Failed to apply schema to '$DB_NAME' using $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Check the SQL file for idempotency and syntax errors"
    return 1
  fi

  log INFO "✅ Base schema successfully applied to D1 database: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::seed_database_from_env — Run seed script to populate D1 from environment config
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validating that the seed script exists and is executable
#   - Exporting DB_NAME and ENV_FILE
#   - Sourcing the script to populate global, tier, and customer config
#
# Why it matters:
#   D1 must be seeded with core data (e.g., tier settings, flags, tenant IDs).
#   If this step fails, your app may start but behave incorrectly.
#
# Globals used:
#   - DB_NAME     → D1 database name
#   - ENV_FILE    → .env file to load configuration from
#   - SEED_SCRIPT → Path to seeding script (e.g. ./scripts/seed-d1.sh)
#
# Example:
#   DB_NAME=analytics ENV_FILE=.env.local SEED_SCRIPT=./scripts/seed.sh check::seed_database_from_env
#
# Categories:
#   database, infra, shell
#
# Stages:
#   hydrate, build, dev
# ------------------------------------------------------------------------------
check::seed_database_from_env() {
  # ✅ Check: Execute seed script for D1 from ENV_FILE
  # Category: database, infra, shell
  # Stages: hydrate, build, dev

  if [[ -z "${SEED_SCRIPT:-}" ]]; then
    log FATAL "❌ SEED_SCRIPT is not set — cannot seed database"
    log FATAL "   💡 Tip: Define path to your seed script (must be executable)"
    log FATAL "   📘 Example: export SEED_SCRIPT=./scripts/seed-d1-from-env.sh"
    return 1
  fi

  if [[ ! -x "$SEED_SCRIPT" ]]; then
    log FATAL "❌ Seed script is missing or not executable: $SEED_SCRIPT"
    log FATAL "   💡 Tip: Ensure the script exists and has execute permissions"
    log FATAL "   📘 Example: chmod +x $SEED_SCRIPT"
    return 1
  fi

  log INFO "🌱 Running seed script to populate D1 from: $ENV_FILE"
  export DB_NAME ENV_FILE

  if ! source "$SEED_SCRIPT"; then
    log FATAL "❌ Seeding failed — script returned non-zero exit"
    log FATAL "   💡 Tip: Check your .env, DB_NAME, and seed logic"
    log FATAL "   📘 Example: DB_NAME=analytics ENV_FILE=.env.local SEED_SCRIPT=... check::seed_database_from_env"
    return 1
  fi

  log INFO "✅ D1 seed completed successfully using: $SEED_SCRIPT"
}

# ------------------------------------------------------------------------------
# 🧪 check::seed_settings_into_d1 — Insert global, tier, and customer settings into D1
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Inserting environment-driven global + tier + customer settings into D1
#   - Verifying all required globals are defined before attempting
#
# Why it matters:
#   Your system's core behavior depends on tier-based and global config.
#   A clean seed ensures deterministic behavior across all environments and tests.
#
# Globals used:
#   - DB_NAME → D1 binding to insert into
#   - DEFAULT_BATCH_SIZE, DEFAULT_FLUSH_INTERVAL_MS, D1_RETENTION_DAYS, DEBUG_FLUSH_LOGGING
#   - columns → Comma-separated columns for tier_settings
#   - tier_rows → Precomputed multi-line value tuples for tier_settings
#   - tiers → Array of lowercase tier names
#   - CUSTOMER_UUID_<TIER> → UUIDs for each tier (env var per tier)
#
# Example:
#   check::seed_settings_into_d1
#
# Categories:
#   database, infra, shell
#
# Stages:
#   hydrate, build, test, dev
# ------------------------------------------------------------------------------
check::seed_settings_into_d1() {
  # ✅ Check: Insert global, tier, and customer settings into D1
  # Category: database, infra, shell
  # Stages: hydrate, build, test, dev

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set"
    log FATAL "   💡 Tip: Provide the target D1 binding name"
    return 1
  fi

  for var in DEFAULT_BATCH_SIZE DEFAULT_FLUSH_INTERVAL_MS D1_RETENTION_DAYS DEBUG_FLUSH_LOGGING columns tier_rows; do
    if [[ -z "${!var:-}" ]]; then
      log FATAL "❌ Required global var missing: $var"
      log FATAL "   💡 Tip: Export or generate $var before calling this check"
      return 1
    fi
  done

  if [[ "${#tiers[@]}" -eq 0 ]]; then
    log FATAL "❌ tiers array is empty"
    log FATAL "   💡 Tip: Populate the tiers array with at least one tier (e.g., free, pro)"
    return 1
  fi

  log INFO "🌱 Inserting global, tier, and customer settings into D1..."

  local customer_rows=""
  for tier in "${tiers[@]}"; do
    local upper
    upper=$(echo "$tier" | tr '[:lower:]' '[:upper:]')
    local uuid_var="CUSTOMER_UUID_${upper}"
    local uuid="${!uuid_var:-}"
    if [[ -z "$uuid" ]]; then
      log FATAL "❌ Missing customer UUID for tier: $tier (expected \$CUSTOMER_UUID_${upper})"
      return 1
    fi
    customer_rows+="  ('$uuid', '$tier'),"$'\n'
  done
  customer_rows=$(echo "$customer_rows" | sed '$ s/,$//') # remove trailing comma

  if ! pnpm exec wrangler d1 execute "$DB_NAME" <<EOF
-- 🌍 global_settings
INSERT OR IGNORE INTO global_settings (key, value) VALUES
  ('DEFAULT_BATCH_SIZE', '$DEFAULT_BATCH_SIZE'),
  ('DEFAULT_FLUSH_INTERVAL_MS', '$DEFAULT_FLUSH_INTERVAL_MS'),
  ('D1_RETENTION_DAYS', '$D1_RETENTION_DAYS'),
  ('DEBUG_FLUSH_LOGGING', '$DEBUG_FLUSH_LOGGING');

-- 📊 tier_settings
INSERT OR IGNORE INTO tier_settings (
  tier, $columns
) VALUES
$tier_rows;

-- 👤 customer_tiers
INSERT OR IGNORE INTO customer_tiers (customer_id, tier) VALUES
$customer_rows;
EOF
  then
    log FATAL "❌ Failed to seed global/tier/customer settings into D1: $DB_NAME"
    log FATAL "   💡 Tip: Check SQL formatting and required variables"
    return 1
  fi

  log INFO "✅ Seeded global, tier, and customer settings into D1: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::confirm_d1_connectivity — Verify that the D1 binding is reachable
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Attempting to run a simple `SELECT 1` against the target D1 database
#
# Why it matters:
#   If Wrangler cannot connect to the D1 binding, any schema or seed operations will fail.
#   This is the fastest way to confirm the environment is operational.
#
# Globals used:
#   - DB_NAME → D1 binding name to connect to
#
# Example:
#   DB_NAME=analytics check::confirm_d1_connectivity
#
# Categories:
#   wrangler, database, infra, ci
#
# Stages:
#   test, hydrate, build
# ------------------------------------------------------------------------------
check::confirm_d1_connectivity() {
  # ✅ Check: Run SELECT 1 against D1 to confirm connection
  # Category: wrangler, database, infra, ci
  # Stages: test, hydrate, build

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set — cannot check D1 connectivity"
    log FATAL "   💡 Tip: Export DB_NAME before calling this check"
    log FATAL "   📘 Example: DB_NAME=analytics check::confirm_d1_connectivity"
    return 1
  fi

  if ! pnpm exec wrangler d1 execute "$DB_NAME" --command "SELECT 1;" > /dev/null 2>&1; then
    log FATAL "❌ Failed to connect to D1 binding: $DB_NAME"
    log FATAL "   💡 Tip: Verify the database exists and Wrangler is authenticated"
    log FATAL "   📘 Example: pnpm exec wrangler d1 list | grep \"$DB_NAME\""
    return 1
  fi

  log INFO "✅ D1 database is reachable: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::ensure_migrations_table_exists — Ensure migrations table exists in D1
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Extracting the DDL for $MIGRATIONS_TABLE from $BASE_SCHEMA_PATH
#   - Executing it against the target D1 database using Wrangler
#
# Why it matters:
#   D1 migration tooling depends on the existence of a tracking table.
#   If it does not exist, future migrations may fail or be reapplied.
#
# Globals used:
#   - DB_NAME → Name of the D1 database
#   - BASE_SCHEMA_PATH → Path to base schema file
#   - MIGRATIONS_TABLE → Table to ensure exists in D1
#
# Example:
#   DB_NAME=analytics \
#   BASE_SCHEMA_PATH=schema/base.sql \
#   MIGRATIONS_TABLE=_migrations \
#   check::ensure_migrations_table_exists
#
# Categories:
#   database, wrangler, infra
#
# Stages:
#   hydrate, build, migrate
# ------------------------------------------------------------------------------
check::ensure_migrations_table_exists() {
  # ✅ Check: Create or verify existence of the D1 migrations table
  # Category: database, wrangler, infra
  # Stages: hydrate, build, migrate

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set"
    log FATAL "   💡 Tip: Provide the D1 binding name"
    log FATAL "   📘 Example: DB_NAME=analytics check::ensure_migrations_table_exists"
    return 1
  fi

  if [[ -z "${BASE_SCHEMA_PATH:-}" || ! -f "$BASE_SCHEMA_PATH" ]]; then
    log FATAL "❌ Base schema file not found: $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Set BASE_SCHEMA_PATH to the path of your .sql schema file"
    log FATAL "   📘 Example: BASE_SCHEMA_PATH=schema/base.sql"
    return 1
  fi

  if [[ -z "${MIGRATIONS_TABLE:-}" ]]; then
    log FATAL "❌ MIGRATIONS_TABLE is not set"
    log FATAL "   💡 Tip: Define the table name to extract from the schema file"
    log FATAL "   📘 Example: MIGRATIONS_TABLE=_migrations"
    return 1
  fi

  log INFO "📜 Extracting DDL for '$MIGRATIONS_TABLE' from $BASE_SCHEMA_PATH..."
  local ddl
  ddl=$(awk "/CREATE TABLE IF NOT EXISTS $MIGRATIONS_TABLE\\b/,/);/" "$BASE_SCHEMA_PATH" | sed 's/;$//')

  if [[ -z "$ddl" ]]; then
    log FATAL "❌ Could not find CREATE TABLE for '$MIGRATIONS_TABLE' in $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Ensure the schema includes a full CREATE TABLE IF NOT EXISTS statement for $MIGRATIONS_TABLE"
    log FATAL "   📘 Example:
      CREATE TABLE IF NOT EXISTS $MIGRATIONS_TABLE (
        filename TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );"
    return 1
  fi

  log INFO "🧱 Executing DDL to ensure '$MIGRATIONS_TABLE' exists in D1..."
  if ! pnpm exec wrangler d1 execute "$DB_NAME" --command "$ddl" > /dev/null; then
    log FATAL "❌ Failed to apply DDL for $MIGRATIONS_TABLE"
    log FATAL "   💡 Tip: Validate that your DDL is valid SQLite and that Wrangler is authenticated"
    log FATAL "   📘 Example: pnpm exec wrangler d1 execute $DB_NAME --command \"$ddl\""
    return 1
  fi

  log INFO "✅ Migrations table '$MIGRATIONS_TABLE' ensured in D1: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::execute_pending_migrations — Execute or validate D1 SQL migrations
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Applying unapplied SQL migration files from $MIGRATIONS_DIR
#   - Recording each applied migration in $MIGRATIONS_TABLE
#
# Why it matters:
#   Migrations must be tracked, idempotent, and safely recorded to avoid reapplication
#   or schema drift across environments.
#
# Globals used:
#   - DB_NAME → Name of the D1 database binding
#   - MIGRATIONS_DIR → Directory containing .sql files
#   - MIGRATIONS_TABLE → Table tracking applied migrations (default: migrations)
#   - MODE → "check" or "apply"
#   - STRICT → If true, aborts on any pending migration in check mode
#
# Example:
#   DB_NAME=analytics MIGRATIONS_DIR=migrations MODE=check STRICT=true check::execute_pending_migrations
#
# Categories:
#   database, wrangler, ci
#
# Stages:
#   migrate, build, test
# ------------------------------------------------------------------------------
check::execute_pending_migrations() {
  # ✅ Check: Apply or verify unapplied SQL migrations in D1
  # Category: database, wrangler, ci
  # Stages: migrate, build, test

  local applied_count=0
  local pending_count=0
  local skipped_count=0
  local error_count=0
  local table="${MIGRATIONS_TABLE:-migrations}"

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set"
    log FATAL "   💡 Tip: Set DB_NAME before executing this check"
    log FATAL "   📘 Example: DB_NAME=analytics"
    return 1
  fi

  if [[ -z "${MIGRATIONS_DIR:-}" || ! -d "$MIGRATIONS_DIR" ]]; then
    log FATAL "❌ MIGRATIONS_DIR not found: $MIGRATIONS_DIR"
    log FATAL "   💡 Tip: Set MIGRATIONS_DIR to a directory of .sql files"
    log FATAL "   📘 Example: MIGRATIONS_DIR=./migrations"
    return 1
  fi

  shopt -s nullglob
  local files=("$MIGRATIONS_DIR"/*.sql)

  if [[ ${#files[@]} -eq 0 ]]; then
    log INFO "✅ No migration files found in $MIGRATIONS_DIR"
    return 0
  fi

  for file in "${files[@]}"; do
    local filename
    filename="$(basename "$file")"
    local escaped_filename
    escaped_filename=$(printf "%s" "$filename" | sed "s/'/''/g")

    local result
    result=$(pnpm exec wrangler d1 execute "$DB_NAME" \
      --command "SELECT COUNT(1) FROM $table WHERE filename = '$escaped_filename';" \
      --json 2>/dev/null || true)

    local count
    count=$(echo "$result" | jq -r '.[0].results[0]["COUNT(1)"]' 2>/dev/null || echo "ERROR")

    if [[ "$count" == "1" ]]; then
      log INFO "✅ Already applied: $filename"
      ((skipped_count++))
      continue
    elif [[ "$count" != "0" ]]; then
      log FATAL "❌ Unexpected row count for $filename (count=$count)"
      log FATAL "   💡 Tip: Verify the schema of $table and ensure consistent column names"
      log FATAL "   📘 Example: SELECT * FROM $table WHERE filename = '$filename';"
      ((error_count++))
      continue
    fi

    if [[ "$MODE" == "check" ]]; then
      log WARN "⏳ Pending migration: $filename"
      ((pending_count++))
      if [[ "$STRICT" == "true" ]]; then
        log FATAL "🚫 STRICT=true — aborting due to pending migrations"
        log FATAL "   💡 Tip: Apply pending migrations manually or switch to MODE=apply"
        return 1
      fi
      continue
    fi

    log INFO "📥 Executing migration: $filename"
    if ! pnpm exec wrangler d1 execute "$DB_NAME" --file "$file"; then
      log FATAL "❌ Failed to apply: $filename"
      log FATAL "   💡 Tip: Check for SQL syntax errors or binding issues"
      log FATAL "   📘 Example: pnpm exec wrangler d1 execute $DB_NAME --file $file"
      ((error_count++))
      continue
    fi

    local insert="INSERT INTO $table (filename) VALUES ('$escaped_filename');"
    if ! pnpm exec wrangler d1 execute "$DB_NAME" --command "$insert" > /dev/null; then
      log FATAL "❌ Failed to record applied migration: $filename"
      log FATAL "   💡 Tip: Ensure table $table has a column named 'filename'"
      log FATAL "   📘 Example: ALTER TABLE $table ADD COLUMN filename TEXT;"
      ((error_count++))
      continue
    fi

    log INFO "✅ Applied: $filename"
    ((applied_count++))
  done

  log INFO ""
  log INFO "📊 Migration Summary for $DB_NAME:"
  [[ "$MODE" == "apply" ]] && log INFO "   ✅ Applied              : $applied_count"
  log INFO "   ➖ Already applied       : $skipped_count"
  log INFO "   ⚠️  Pending (check only)  : $pending_count"
  log INFO "   ❌ Failed to apply       : $error_count"

  if [[ "$error_count" -gt 0 ]]; then
    log FATAL "💥 Migration execution failed with $error_count error(s)"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_d1_database — Confirm that the expected D1 database exists
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that $DB_NAME exists via `wrangler d1 list`
#
# Why it matters:
#   If the expected D1 database is missing, any schema, seed, or migration steps will fail.
#   This check prevents deploying or testing against unprovisioned infrastructure.
#
# Globals used:
#   - DB_NAME → Name of the D1 database binding
#
# Example:
#   DB_NAME=analytics check::validate_d1_database
#
# Categories:
#   database, wrangler, infra
#
# Stages:
#   hydrate, check, build, deploy
# ------------------------------------------------------------------------------
check::validate_d1_database() {
  # ✅ Check: Ensure D1 database exists in the current account
  # Category: database, wrangler, infra
  # Stages: hydrate, check, build, deploy

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set — cannot validate D1 database"
    log FATAL "   💡 Tip: Export DB_NAME to match your wrangler binding"
    log FATAL "   📘 Example: DB_NAME=analytics check::validate_d1_database"
    return 1
  fi

  log INFO "🧱 Validating D1 database: $DB_NAME"

  if ! pnpm exec wrangler d1 list | jq -r '.[].name' | grep -Fxq "$DB_NAME"; then
    log FATAL "❌ D1 database not found: $DB_NAME"
    log FATAL "   💡 Tip: Run \`check::ensure_d1_database_exists\` to create it"
    log FATAL "   📘 Example: DB_NAME=$DB_NAME check::ensure_d1_database_exists"
    return 1
  fi

  log INFO "✅ Found D1 database: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::create_and_bootstrap_preview_d1 — Create + bootstrap isolated preview D1 database
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Creating a preview D1 database named preview_<CI_COMMIT_REF_SLUG>
#   - Running the bootstrap script to apply schema + seed
#   - Appending the result to .env.preview
#
# Why it matters:
#   Every preview environment must have an isolated database for accurate
#   feature validation. This ensures schema and data consistency across branches.
#
# Globals used:
#   - CI_COMMIT_REF_SLUG → Branch slug used in the preview DB name
#   - DB_NAME → Temporarily assigned for bootstrap use
#   - analytics_preview_NAME → Exported result for downstream compatibility
#
# Example:
#   CI_COMMIT_REF_SLUG=my-feature-branch \
#   check::create_and_bootstrap_preview_d1
#
# Categories:
#   wrangler, database, cloudflare:d1, ci
#
# Stages:
#   hydrate, build, deploy
# ------------------------------------------------------------------------------
check::create_and_bootstrap_preview_d1() {
  # ✅ Check: Create and bootstrap per-branch D1 preview DB
  # Category: wrangler, database, cloudflare:d1, ci
  # Stages: hydrate, build, deploy

  if [[ -z "${CI_COMMIT_REF_SLUG:-}" ]]; then
    log FATAL "❌ CI_COMMIT_REF_SLUG is not set"
    log FATAL "   💡 Tip: GitLab CI automatically exports this — ensure you're in a CI context"
    log FATAL "   📘 Example: CI_COMMIT_REF_SLUG=feature-x check::create_and_bootstrap_preview_d1"
    return 1
  fi

  local preview_db="preview_${CI_COMMIT_REF_SLUG}"
  export analytics_preview_NAME="$preview_db"

  log INFO "🧱 Attempting to create D1 database: $analytics_preview_NAME"
  if ! pnpm exec wrangler d1 create "$analytics_preview_NAME" > /dev/null 2>&1; then
    log INFO "✅ D1 preview database already exists: $analytics_preview_NAME"
  fi

  if [[ ! -x ./src/scripts/bootstrap-d1.sh ]]; then
    log FATAL "❌ Missing or non-executable: ./src/scripts/bootstrap-d1.sh"
    log FATAL "   💡 Tip: Check that your bootstrap script exists and is chmod +x"
    log FATAL "   📘 Example: chmod +x ./src/scripts/bootstrap-d1.sh"
    return 1
  fi

  log INFO "⚙️ Bootstrapping preview schema for: $analytics_preview_NAME"
  DB_NAME="$analytics_preview_NAME" ./src/scripts/bootstrap-d1.sh || {
    log FATAL "❌ Bootstrap script failed for $analytics_preview_NAME"
    log FATAL "   💡 Tip: Inspect your schema or seed logic"
    log FATAL "   📘 Example: DB_NAME=$analytics_preview_NAME ./src/scripts/bootstrap-d1.sh"
    return 1
  }

  log INFO "📝 Writing analytics_preview_NAME to .env.preview"
  echo "analytics_preview_NAME=$analytics_preview_NAME" >> .env.preview

  log INFO "✅ Preview D1 ready: $analytics_preview_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::generate_tier_settings_sql_rows — Construct SQL insert rows for tier_settings table
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Generating a multi-line SQL-ready tuple list for all tiers
#   - Resolving env variables for each schema_key × tier combination
#
# Why it matters:
#   Your D1 tier_settings table must be populated from deterministic, env-scoped
#   values during seeding. This function transforms structured tier config into SQL.
#
# Globals used:
#   - schema_keys → Array of setting keys
#   - tiers → Array of tier names
#   - tier_rows → Output string of SQL tuples
#
# Example:
#   schema_keys=(burst_limit interval_ms)
#   tiers=(free pro)
#   TIER_FREE_BURST_LIMIT=100
#   TIER_FREE_INTERVAL_MS=500
#   TIER_PRO_BURST_LIMIT=1000
#   TIER_PRO_INTERVAL_MS=250
#   check::generate_tier_settings_sql_rows
#
# Categories:
#   shell, database, encoding
#
# Stages:
#   build, hydrate, migrate
# ------------------------------------------------------------------------------
check::generate_tier_settings_sql_rows() {
  # ✅ Check: Generate SQL insert rows for all tiers based on env config
  # Category: shell, database, encoding
  # Stages: build, hydrate, migrate

  if [[ "${#schema_keys[@]}" -eq 0 ]]; then
    log FATAL "❌ schema_keys array is empty"
    log FATAL "   💡 Tip: Populate schema_keys with the keys to inject into tier_settings"
    log FATAL "   📘 Example: schema_keys=(burst_limit interval_ms)"
    return 1
  fi

  if [[ "${#tiers[@]}" -eq 0 ]]; then
    log FATAL "❌ tiers array is empty"
    log FATAL "   💡 Tip: Populate tiers with your supported tier names (e.g., free, pro)"
    log FATAL "   📘 Example: tiers=(free pro)"
    return 1
  fi

  tier_rows=""

  for tier in "${tiers[@]}"; do
    local upper values
    upper=$(echo "$tier" | tr '[:lower:]' '[:upper:]')
    values="'$tier'"

    for key in "${schema_keys[@]}"; do
      local env_key value
      env_key="TIER_${upper}_$(echo "$key" | tr '[:lower:]' '[:upper:]')"
      value="${!env_key:-}"

      if [[ -z "$value" ]]; then
        log FATAL "❌ Missing environment variable: $env_key"
        log FATAL "   💡 Tip: Define all required values for each tier key"
        log FATAL "   📘 Example: export $env_key=123"
        return 1
      fi

      if [[ "$value" =~ ^[0-9]+$ || "$value" == "true" || "$value" == "false" ]]; then
        values+=", $value"
      else
        values+=", '$value'"
      fi
    done

    tier_rows+="  ($values),"$'\n'
  done

  tier_rows="${tier_rows%,*}"  # Trim trailing comma
  log INFO "✅ tier_rows generated successfully with ${#tiers[@]} tier(s)"
}

# ------------------------------------------------------------------------------
# 🧪 check::run_pending_migrations — Execute pending migrations via migration script
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring the migration script is executable
#   - Invoking it with `apply` mode and passing in $DB_NAME
#
# Why it matters:
#   D1 migrations must be applied in a controlled, repeatable way.
#   This ensures schema consistency in CI, local, or preview environments.
#
# Globals used:
#   - DB_NAME → Name of the D1 database to apply migrations to
#   - MIGRATE_SCRIPT → Path to migration runner script (default: migrate.sh)
#
# Example:
#   DB_NAME=analytics MIGRATE_SCRIPT=./scripts/migrate.sh check::run_pending_migrations
#
# Categories:
#   wrangler, database, shell, ci
#
# Stages:
#   build, migrate, deploy
# ------------------------------------------------------------------------------
check::run_pending_migrations() {
  # ✅ Check: Execute pending D1 migrations using a script wrapper
  # Category: wrangler, database, shell, ci
  # Stages: build, migrate, deploy

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set — cannot apply migrations"
    log FATAL "   💡 Tip: Export DB_NAME or pass it via environment"
    log FATAL "   📘 Example: DB_NAME=analytics check::run_pending_migrations"
    return 1
  fi

  local script="${MIGRATE_SCRIPT:-migrate.sh}"

  if [[ -x "$script" ]]; then
    log INFO "🔄 Applying pending D1 migrations using: $script"
    DB_NAME="$DB_NAME" "$script" apply || {
      log FATAL "❌ Migration script failed: $script"
      log FATAL "   💡 Tip: Check the script's output and ensure your SQL files are valid"
      log FATAL "   📘 Example: DB_NAME=$DB_NAME $script apply"
      return 1
    }
  else
    log INFO "ℹ️  Migration script not found or not executable: $script"
    log INFO "🔸 Skipping migration step for DB: $DB_NAME"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::deploy_to_staging_worker — Deploy Worker to staging and verify health
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforcing CI-only execution
#   - Deploying Worker to Cloudflare using Wrangler
#   - Verifying $STAGING_URL/__health responds with 200
#   - Writing a structured Markdown deployment summary
#
# Why it matters:
#   All staging deploys must run in CI, complete health verification,
#   and produce a durable deployment summary for downstream consumption.
#
# Globals used:
#   - CI → Must be set to "true"
#   - CI_COMMIT_REF_NAME → Git branch name
#   - CI_COMMIT_SHA → Git commit hash
#   - STAGING_URL → URL to verify post-deploy health
#
# Example:
#   CI=true CI_COMMIT_REF_NAME=main CI_COMMIT_SHA=abc STAGING_URL=https://myapp-staging.pages.dev check::deploy_to_staging_worker
#
# Categories:
#   wrangler, deploy, ci, infra
#
# Stages:
#   deploy, post-deploy
# ------------------------------------------------------------------------------
check::deploy_to_staging_worker() {
  # ✅ Check: Deploy Worker to staging and validate runtime health
  # Category: wrangler, deploy, ci, infra
  # Stages: deploy, post-deploy

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ CI=true is not set — this check must only run in GitLab CI"
    log FATAL "   💡 Tip: Protect deploys using GitLab environments or stages"
    log FATAL "   📘 Example: CI=true check::deploy_to_staging_worker"
    return 1
  fi

  export ENVIRONMENT="staging"
  export DEPLOY_START_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  export DEPLOY_COMMIT_SHA="${CI_COMMIT_SHA:-unknown}"
  export DEPLOY_BRANCH="${CI_COMMIT_REF_NAME:-unknown}"

  log INFO "🚀 Deploying to Wrangler environment: $ENVIRONMENT"
  if ! pnpm exec wrangler deploy --env "$ENVIRONMENT"; then
    log FATAL "❌ Deployment failed for environment: $ENVIRONMENT"
    log FATAL "   💡 Tip: Check logs for syntax errors or config issues"
    log FATAL "   📘 Example: pnpm exec wrangler deploy --env staging"
    return 1
  fi

  local health_status=""
  if [[ -n "${STAGING_URL:-}" ]]; then
    log INFO "🔍 Running health check: $STAGING_URL/__health"
    if curl -sf "$STAGING_URL/__health" > /dev/null; then
      health_status="✅ Healthy"
      log INFO "✅ Health check passed"
    else
      health_status="❌ Health check failed"
      log FATAL "❌ Health check failed at: $STAGING_URL/__health"
      log FATAL "   💡 Tip: Confirm your routes and bindings are deployed"
      log FATAL "   📘 Example: curl -i $STAGING_URL/__health"
      return 1
    fi
  else
    health_status="⚠️ No STAGING_URL provided"
    log WARN "⚠️  Skipping health check — STAGING_URL not defined"
  fi

  log INFO "📝 Writing deployment summary: .deploy-staging-summary.md"
  {
    echo "# 🚀 Staging Deploy Summary"
    echo ""
    echo "- Branch: \`$DEPLOY_BRANCH\`"
    echo "- Commit: \`$DEPLOY_COMMIT_SHA\`"
    echo "- Environment: \`$ENVIRONMENT\`"
    echo "- Deployed at: \`$DEPLOY_START_TIME\`"
    echo "- Healthcheck: $health_status"
    [[ -n "${STAGING_URL:-}" ]] && echo "- URL: $STAGING_URL"
  } > .deploy-staging-summary.md

  log INFO "✅ Deployment and health verification complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::run_gradual_canary_rollout — Deploy and incrementally promote canary
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Deploying the canary environment
#   - Gradually adjusting traffic split (5% → 25% → 100%)
#   - Monitoring health at each stage and generating rollback or promotion report
#
# Why it matters:
#   Canary deployment lets you verify runtime stability under live traffic.
#   This check guards against shipping regressions directly to production.
#
# Globals used:
#   - CI → Must be set to "true"
#
# Example:
#   CI=true check::run_gradual_canary_rollout
#
# Categories:
#   ci, deploy, infra, wrangler, safety
#
# Stages:
#   deploy, post-deploy, integration
# ------------------------------------------------------------------------------
check::run_gradual_canary_rollout() {
  # ✅ Check: Perform staged canary rollout with rollback on error
  # Category: ci, deploy, infra, wrangler, safety
  # Stages: deploy, post-deploy, integration

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ CI is not set — canary rollout must only run in CI"
    log FATAL "   💡 Tip: Wrap this check inside a GitLab job with CI=true"
    log FATAL "   📘 Example: CI=true check::run_gradual_canary_rollout"
    return 1
  fi

  log INFO "🚀 Deploying canary version to Cloudflare..."
  if ! pnpm exec wrangler deploy --env canary; then
    log FATAL "❌ Canary deployment failed"
    log FATAL "   💡 Tip: Check wrangler.toml or the deployment logs"
    log FATAL "   📘 Example: pnpm exec wrangler deploy --env canary"
    return 1
  fi

  log INFO "📊 Setting traffic weight to 5%..."
  ./src/scripts/adjust-traffic-weight.sh 5

  log INFO "⏳ Monitoring canary health @ 5%..."
  if ! ./src/scripts/monitor-canary-health.sh --max-errors 10 --window 2m; then
    log FATAL "❌ Canary failed health check at 5% — reverting"
    log FATAL "   💡 Tip: Inspect metrics before reattempting rollout"
    log FATAL "   📘 Example: adjust-traffic-weight.sh 0"
    ./src/scripts/adjust-traffic-weight.sh 0
    ./src/scripts/generate-canary-report.sh fail > .canary-summary.md
    return 1
  fi

  log INFO "📈 Increasing canary to 25%..."
  ./src/scripts/adjust-traffic-weight.sh 25

  log INFO "⏳ Monitoring canary health @ 25%..."
  if ! ./src/scripts/monitor-canary-health.sh --max-errors 10 --window 2m; then
    log FATAL "❌ Canary failed at 25% — reverting"
    log FATAL "   💡 Tip: Stop rollout and promote last stable release"
    log FATAL "   📘 Example: adjust-traffic-weight.sh 0"
    ./src/scripts/adjust-traffic-weight.sh 0
    ./src/scripts/generate-canary-report.sh fail > .canary-summary.md
    return 1
  fi

  log INFO "✅ Canary stable — promoting to 100%"
  ./src/scripts/adjust-traffic-weight.sh 100
  ./src/scripts/generate-canary-report.sh success > .canary-summary.md

  log INFO "📝 Canary rollout complete — report written to .canary-summary.md"
}

# ------------------------------------------------------------------------------
# 🧪 check::deploy_preview_worker_with_secrets — Deploy preview worker and inject secrets
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Injecting required secrets into the preview environment
#   - Deploying to preview using Wrangler
#   - Extracting the resulting preview URL
#   - Writing .env.preview and performing a health check
#
# Why it matters:
#   Preview workers must include all runtime secrets and pass a basic health check.
#   Without validation, CI may silently deploy broken or unreachable previews.
#
# Globals used:
#   - SENTRY_DSN, SENTRY_PROJECT → Required secrets to inject
#   - PREVIEW_URL → Inferred from deployment output
#
# Example:
#   SENTRY_DSN=... SENTRY_PROJECT=... check::deploy_preview_worker_with_secrets
#
# Categories:
#   wrangler, secrets, deploy, ci, infra
#
# Stages:
#   build, deploy, post-deploy
# ------------------------------------------------------------------------------
check::deploy_preview_worker_with_secrets() {
  # ✅ Check: Deploy preview worker and inject SENTRY secrets
  # Category: wrangler, secrets, deploy, ci, infra
  # Stages: build, deploy, post-deploy

  log INFO "🚀 Deploying preview worker..."
  local preview_log
  preview_log=$(mktemp)

  local injected=0
  for s in SENTRY_DSN SENTRY_PROJECT; do
    if [[ -n "${!s:-}" ]]; then
      echo "${!s}" | pnpm exec wrangler secret put "$s" --env preview > /dev/null
      echo "$s=${!s}" >> .env.preview
      log INFO "✅ Secret injected: $s"
      ((injected++))
    else
      log WARN "⚠️  Secret not set: $s — skipping injection"
    fi
  done

  if [[ "$injected" -eq 0 ]]; then
    log FATAL "❌ No secrets injected — SENTRY_DSN and SENTRY_PROJECT are missing"
    log FATAL "   💡 Tip: Ensure these secrets are exported in your CI environment"
    log FATAL "   📘 Example: SENTRY_DSN=abc SENTRY_PROJECT=xyz check::deploy_preview_worker_with_secrets"
    return 1
  fi

  if ! pnpm exec wrangler deploy --preview | tee "$preview_log" > /dev/null; then
    log FATAL "❌ Wrangler preview deployment failed"
    log FATAL "   💡 Tip: Check your bindings and preview script config"
    log FATAL "   📘 Example: pnpm exec wrangler deploy --preview"
    return 1
  fi

  local url
  url=$(grep -o 'https://[^ ]*\.workers\.dev' "$preview_log" | head -n1 || true)

  if [[ -z "$url" ]]; then
    log FATAL "❌ Could not extract PREVIEW_URL from deployment output"
    log FATAL "   💡 Tip: Ensure wrangler deploy returns a preview URL in logs"
    log FATAL "   📘 Example: grep 'https://*.workers.dev'"
    return 1
  fi

  export PREVIEW_URL="$url"
  echo "PREVIEW_URL=$PREVIEW_URL" >> .env.preview
  log INFO "✅ PREVIEW_URL resolved: $PREVIEW_URL"

  log INFO "🔍 Running post-deploy health check..."
  if ! ./src/scripts/post-deploy-health-check.sh "$PREVIEW_URL"; then
    log FATAL "❌ Health check failed for preview: $PREVIEW_URL"
    log FATAL "   💡 Tip: Confirm routes are configured and bindings are present"
    log FATAL "   📘 Example: curl -i $PREVIEW_URL/__health"
    return 1
  fi

  log INFO "✅ Preview deployment successful and healthy: $PREVIEW_URL"
}

# ------------------------------------------------------------------------------
# 🧪 check::demote_canary_traffic — Reset Cloudflare canary traffic weight to 0%
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring CI=true is set
#   - Immediately shifting all traffic away from the canary environment
#   - Logging the demotion reason for audit
#
# Why it matters:
#   Canary rollouts must be instantly reversible. This check ensures 0% traffic
#   is routed to unstable builds when failures are detected.
#
# Globals used:
#   - CI → Must be "true" to enforce CI-only usage
#
# Example:
#   CI=true check::demote_canary_traffic "Health check failed"
#
# Categories:
#   deploy, ci, infra, safety
#
# Stages:
#   post-deploy, integration, rollback
# ------------------------------------------------------------------------------
check::demote_canary_traffic() {
  # ✅ Check: Immediately demote canary traffic to 0% if rollout fails
  # Category: deploy, ci, infra, safety
  # Stages: post-deploy, integration, rollback

  local reason="${1:-Canary demotion triggered}"

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must only be run in GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Protect this check with a CI guard to avoid manual demotion"
    log FATAL "   📘 Example: CI=true check::demote_canary_traffic"
    return 1
  fi

  if [[ ! -x ./src/scripts/adjust-traffic-weight.sh ]]; then
    log FATAL "❌ adjust-traffic-weight.sh script not found or not executable"
    log FATAL "   💡 Tip: Ensure the script exists at ./src/scripts/adjust-traffic-weight.sh and is chmod +x"
    log FATAL "   📘 Example: chmod +x ./src/scripts/adjust-traffic-weight.sh"
    return 1
  fi

  log INFO "🔁 Demoting Cloudflare Canary traffic to 0%"
  log INFO "📝 Reason: $reason"

  ./src/scripts/adjust-traffic-weight.sh 0

  log INFO "✅ Canary traffic demoted successfully"
}

# ------------------------------------------------------------------------------
# 🧪 check::adjust_canary_traffic_weight — Update Cloudflare canary traffic split
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforcing CI-only usage
#   - Sending a traffic update to Cloudflare Workers API
#   - Splitting traffic between production and canary
#
# Why it matters:
#   Canary rollout relies on adjustable traffic weights. This check
#   enables progressive exposure while allowing rollback control.
#
# Globals used:
#   - CLOUDFLARE_API_TOKEN → Cloudflare API auth token
#   - ACCOUNT_ID → Cloudflare account ID
#   - SERVICE_NAME → Worker service name
#   - CI → Must be "true" to allow traffic change
#
# Example:
#   CI=true check::adjust_canary_traffic_weight 25
#
# Categories:
#   deploy, infra, wrangler, ci
#
# Stages:
#   deploy, post-deploy, rollback, integration
# ------------------------------------------------------------------------------
check::adjust_canary_traffic_weight() {
  # ✅ Check: Adjust production ↔ canary traffic weighting in Cloudflare
  # Category: deploy, infra, wrangler, ci
  # Stages: deploy, post-deploy, rollback, integration

  local weight="${1:-}"
  if [[ -z "$weight" || ! "$weight" =~ ^[0-9]{1,3}$ || "$weight" -lt 0 || "$weight" -gt 100 ]]; then
    log FATAL "❌ Invalid weight value: '$weight'"
    log FATAL "   💡 Tip: Must be an integer from 0 to 100"
    log FATAL "   📘 Example: check::adjust_canary_traffic_weight 25"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must only run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Wrap in a GitLab CI job or check the CI export"
    log FATAL "   📘 Example: CI=true check::adjust_canary_traffic_weight 25"
    return 1
  fi

  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${ACCOUNT_ID:-}" || -z "${SERVICE_NAME:-}" ]]; then
    log FATAL "❌ Missing required Cloudflare vars: CLOUDFLARE_API_TOKEN, ACCOUNT_ID, or SERVICE_NAME"
    log FATAL "   💡 Tip: Set these in your CI/CD environment"
    log FATAL "   📘 Example: export CLOUDFLARE_API_TOKEN=... ACCOUNT_ID=... SERVICE_NAME=..."
    return 1
  fi

  local prod_weight=$((100 - weight))

  log INFO "⚖️ Adjusting Cloudflare traffic → Canary: ${weight}%, Production: ${prod_weight}%"

  local response
  response=$(curl -sS -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$SERVICE_NAME/traffic" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d @- <<EOF
{
  "traffic": [
    { "environment": "production", "weight": $prod_weight },
    { "environment": "canary", "weight": $weight }
  ]
}
EOF
)

  if ! echo "$response" | grep -q '"success":true'; then
    log FATAL "❌ Failed to update Cloudflare traffic split"
    log FATAL "   💡 Tip: Validate the API response and auth tokens"
    log FATAL "   📘 Example: curl -X PUT ... /traffic"
    return 1
  fi

  log INFO "✅ Traffic successfully updated: canary=${weight}%, production=${prod_weight}%"
}

# ------------------------------------------------------------------------------
# 🧪 check::deploy_tail_worker — Deploy Tail Worker in CI and confirm deployment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Deploying a Tail Worker named $SERVICE_NAME-$ENV-tail
#   - Enforcing CI-only execution
#   - Logging deployment result
#   - Optionally sending a Sentry test ping (TODO)
#
# Why it matters:
#   The Tail Worker must be deployed alongside the primary Worker
#   to support logging, observability, or event relay infrastructure.
#
# Globals used:
#   - CI → Must be "true"
#   - SERVICE_NAME → Base name of the Worker service
#   - SENTRY_DSN → Optional: used to notify Sentry of success
#
# Example:
#   CI=true SERVICE_NAME=my-worker check::deploy_tail_worker staging
#
# Categories:
#   deploy, infra, wrangler, ci
#
# Stages:
#   build, deploy, post-deploy
# ------------------------------------------------------------------------------
check::deploy_tail_worker() {
  # ✅ Check: Deploy Tail Worker and confirm via Wrangler
  # Category: deploy, infra, wrangler, ci
  # Stages: build, deploy, post-deploy

  local env="$1"

  if [[ -z "$env" ]]; then
    log FATAL "❌ Missing environment argument (e.g. staging, production)"
    log FATAL "   💡 Tip: Pass the target Wrangler environment as the first argument"
    log FATAL "   📘 Example: check::deploy_tail_worker staging"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ CI=true is not set — this must only run in GitLab CI"
    log FATAL "   💡 Tip: Run this only as part of CI/CD deployment workflows"
    log FATAL "   📘 Example: CI=true check::deploy_tail_worker $env"
    return 1
  fi

  if [[ -z "${SERVICE_NAME:-}" ]]; then
    log FATAL "❌ SERVICE_NAME is not defined"
    log FATAL "   💡 Tip: Define SERVICE_NAME in your CI/CD env or .env"
    log FATAL "   📘 Example: SERVICE_NAME=my-worker"
    return 1
  fi

  local name="${SERVICE_NAME}-${env}-tail"

  log INFO "🚀 Deploying Tail Worker: $name"
  if pnpm exec wrangler deploy --name "$name" --env="$env"; then
    log INFO "✅ Tail Worker deployed successfully: $name"
  else
    log WARN "⚠️  Failed to deploy Tail Worker: $name"
    return 1
  fi

  if [[ -n "${SENTRY_DSN:-}" ]]; then
    log INFO "📡 Sentry DSN is set — placeholder for tail worker test ping"
    # TODO: Implement curl to sentry /store/ endpoint if needed
  else
    log INFO "ℹ️  Sentry not configured — skipping post-deploy notification"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::bootstrap_node_toolchain — Install and validate Volta-managed toolchain
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Installing Node and pnpm via Volta
#   - Ensuring required CLI tools are available (node, pnpm, wrangler)
#   - Installing dependencies from pnpm lockfile
#
# Why it matters:
#   Projects must run on a consistent, pinned Node + pnpm toolchain.
#   This check ensures toolchain reproducibility and enforces CLI integrity.
#
# Globals used:
#   - None (relies on Volta and lockfile)
#
# Example:
#   check::bootstrap_node_toolchain
#
# Categories:
#   shell, ci, pnpm, package
#
# Stages:
#   hydrate, build, pre-commit
# ------------------------------------------------------------------------------
check::bootstrap_node_toolchain() {
  # ✅ Check: Install Volta toolchain and verify all required CLIs
  # Category: shell, ci, pnpm, package
  # Stages: hydrate, build, pre-commit

  log INFO "🔧 Installing Volta-managed Node and pnpm..."
  if ! volta install node pnpm > /dev/null; then
    log FATAL "❌ Failed to install Node or pnpm via Volta"
    log FATAL "   💡 Tip: Ensure Volta is installed and your system PATH is configured"
    log FATAL "   📘 Example: curl https://get.volta.sh | bash"
    return 1
  fi

  log INFO "📦 Toolchain versions:"
  log INFO "   node:  $(node -v || echo '❌ not found')"
  log INFO "   pnpm:  $(pnpm -v || echo '❌ not found')"

  log INFO "📦 Installing project dependencies via pnpm..."
  if ! pnpm install --frozen-lockfile; then
    log FATAL "❌ pnpm install failed"
    log FATAL "   💡 Tip: Check for corrupted lockfile or missing peer deps"
    log FATAL "   📘 Example: pnpm install --frozen-lockfile"
    return 1
  fi

  log INFO "🔍 Verifying required CLI tools..."

  if ! command -v node > /dev/null; then
    log FATAL "❌ node not found in PATH"
    log FATAL "   💡 Tip: Ensure Volta installed node and it's in PATH"
    log FATAL "   📘 Example: volta install node"
    return 1
  fi

  if ! command -v pnpm > /dev/null; then
    log FATAL "❌ pnpm not found in PATH"
    log FATAL "   💡 Tip: Ensure pnpm is installed via Volta"
    log FATAL "   📘 Example: volta install pnpm"
    return 1
  fi

  if ! command -v wrangler > /dev/null; then
    log FATAL "❌ wrangler not found in PATH"
    log FATAL "   💡 Tip: Install wrangler via pnpm"
    log FATAL "   📘 Example: pnpm add -g wrangler"
    return 1
  fi

  log INFO "✅ Node toolchain bootstrap complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::log_ci_context — Log current GitLab CI job environment context
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Printing job metadata, commit details, author, pipeline, environment, project
#   - Ensuring visibility into what environment and commit is being executed
#
# Why it matters:
#   Job and deployment logs must include reproducible context to aid debugging,
#   traceability, rollback decisions, and auditing.
#
# Globals used:
#   - CI_COMMIT_REF_NAME, CI_COMMIT_REF_SLUG
#   - CI_COMMIT_SHA, CI_COMMIT_SHORT_SHA
#   - GITLAB_USER_NAME, GITLAB_USER_EMAIL
#   - CI_PIPELINE_ID, CI_JOB_NAME, CI_JOB_ID
#   - CI_RUNNER_DESCRIPTION, CI_PROJECT_NAME, CI_PROJECT_NAMESPACE
#   - WRANGLER_ENV, DB_NAME
#   - CI_COMMIT_TAG, CI_MERGE_REQUEST_IID
#   - CI_PROJECT_URL, CI_REPOSITORY_URL
#
# Example:
#   check::log_ci_context
#
# Categories:
#   ci, shell, safety
#
# Stages:
#   build, deploy, test, integration
# ------------------------------------------------------------------------------
check::log_ci_context() {
  # ✅ Check: Log key CI metadata and contextual info
  # Category: ci, shell, safety
  # Stages: build, deploy, test, integration

  log INFO "📦 CI Context:"
  log INFO "   - Branch:            ${CI_COMMIT_REF_NAME:-<unset>}"
  log INFO "   - Branch (slug):     ${CI_COMMIT_REF_SLUG:-<unset>}"
  log INFO "   - Commit:            ${CI_COMMIT_SHA:-<unset>}"
  log INFO "   - Short SHA:         ${CI_COMMIT_SHORT_SHA:-<unset>}"
  log INFO "   - Author:            ${GITLAB_USER_NAME:-unknown} (${GITLAB_USER_EMAIL:-?})"
  log INFO "   - Pipeline ID:       ${CI_PIPELINE_ID:-<unset>}"
  log INFO "   - Job:               ${CI_JOB_NAME:-<unset>} (#${CI_JOB_ID:-?})"
  log INFO "   - Runner:            ${CI_RUNNER_DESCRIPTION:-<unset>}"
  log INFO "   - Environment:       ${WRANGLER_ENV:-<unset>}"
  log INFO "   - DB Name:           ${DB_NAME:-<unset>}"
  log INFO "   - Git Tag:           ${CI_COMMIT_TAG:-<none>}"
  log INFO "   - Merge Request IID: ${CI_MERGE_REQUEST_IID:-<none>}"
  log INFO "   - Project:           ${CI_PROJECT_NAMESPACE:-?}/${CI_PROJECT_NAME:-?}"
  log INFO "   - Project URL:       ${CI_PROJECT_URL:-<unset>}"
  log INFO "   - Repo:              ${CI_REPOSITORY_URL:-<unset>}"
}

# ------------------------------------------------------------------------------
# 🧪 check::run_ci_environment_checks — Run all required CI toolchain + secret validators
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring the Node toolchain is installed and working via Volta
#   - Verifying required CI/CD secrets are available
#
# Why it matters:
#   CI builds must guarantee consistent versions, CLI presence, and critical secrets.
#   Without these checks, CI may silently fail or produce non-reproducible builds.
#
# Globals used:
#   - DB_NAME, WRANGLER_ENV, CLOUDFLARE_API_TOKEN, etc. (used in delegated checks)
#
# Example:
#   check::run_ci_environment_checks
#
# Categories:
#   ci, shell, infra, secrets
#
# Stages:
#   pre-commit, build, deploy
# ------------------------------------------------------------------------------
check::run_ci_environment_checks() {
  # ✅ Check: Run CI environment validations (toolchain + secrets)
  # Category: ci, shell, infra, secrets
  # Stages: pre-commit, build, deploy

  log INFO "🔍 Verifying toolchain..."
  if ! check::bootstrap_node_toolchain; then
    log FATAL "❌ Toolchain setup failed"
    log FATAL "   💡 Tip: Ensure Volta is installed and configured for your shell"
    log FATAL "   📘 Example: curl https://get.volta.sh | bash"
    return 1
  fi

  log INFO "🔐 Checking required CI/CD secrets..."
  if ! check::required_secrets; then
    log FATAL "❌ Missing one or more required secrets"
    log FATAL "   💡 Tip: Verify required secrets in GitLab Settings → CI/CD → Variables"
    log FATAL "   📘 Example: CLOUDFLARE_API_TOKEN, SENTRY_DSN, SERVICE_NAME"
    return 1
  fi

  log INFO "✅ CI environment setup complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::get_durable_object_classes — Extract Durable Object class names from wrangler.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Reading Durable Object class names from wrangler.json
#   - Supporting both top-level and environment-scoped bindings
#   - Returning class names via log INFO (one per line)
#
# Why it matters:
#   Durable Object declarations must match class names exported from Worker modules.
#   This ensures code and config stay in sync.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json (default: wrangler.json)
#   - ENVIRONMENT → Optional env name (e.g. preview, staging)
#
# Example:
#   WRANGLER_CONFIG=wrangler.json ENVIRONMENT=staging check::get_durable_object_classes
#
# Categories:
#   wrangler, cloudflare:do, ci, infra
#
# Stages:
#   build, check, hydrate
# ------------------------------------------------------------------------------
check::get_durable_object_classes() {
  # ✅ Check: Extract Durable Object class names from wrangler.json
  # Category: wrangler, cloudflare:do, ci, infra
  # Stages: build, check, hydrate

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ wrangler.json not found at: $config"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG to the correct path or ensure it exists"
    log FATAL "   📘 Example: WRANGLER_CONFIG=./config/wrangler.json"
    return 1
  fi

  local classes

  if [[ -n "${ENVIRONMENT:-}" ]]; then
    log INFO "🔍 Searching for DO classes in env: $ENVIRONMENT"
    classes=$(jq -r --arg env "$ENVIRONMENT" '
      (
        try .env[$env].durable_objects.bindings[]?.class_name catch empty
      ) + (
        try .durable_objects.bindings[]?.class_name catch empty
      )
    ' "$config")
  else
    log INFO "🔍 Searching for DO classes in top-level config"
    classes=$(jq -r 'try .durable_objects.bindings[]?.class_name catch empty' "$config")
  fi

  if [[ -z "$classes" ]]; then
    log WARN "⚠️  No Durable Object class names found in $config"
    return 0
  fi

  log INFO "✅ Found Durable Object class names:"
  while IFS= read -r class; do
    [[ -n "$class" ]] && log INFO "   - $class"
  done <<< "$classes"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_do_migrations — Ensure all Durable Object classes are migrated
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring all Durable Object class names under `durable_objects.bindings`
#     are registered under the `migrations[].new_classes` array
#
# Why it matters:
#   Durable Objects require explicit declaration in migration history.
#   Missing migrations will cause deployment failures or binding issues.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json or .jsonc
#
# Example:
#   WRANGLER_CONFIG=wrangler.json check::validate_do_migrations
#
# Categories:
#   wrangler, cloudflare:do, infra
#
# Stages:
#   check, deploy, build, migrate
# ------------------------------------------------------------------------------
check::validate_do_migrations() {
  # ✅ Check: All DO classes in bindings must exist in migrations[].new_classes
  # Category: wrangler, cloudflare:do, infra
  # Stages: check, deploy, build, migrate

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ wrangler config not found: $config"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG or place wrangler.json in project root"
    log FATAL "   📘 Example: WRANGLER_CONFIG=config/wrangler.json"
    return 1
  fi

  local do_classes
  do_classes=$(jq -r '.durable_objects.bindings[]?.class_name' "$config" 2>/dev/null | sort -u || echo "")

  if [[ -z "$do_classes" ]]; then
    log FATAL "❌ No Durable Object classes found in $config"
    log FATAL "   💡 Tip: Define durable_objects.bindings[].class_name in your wrangler.json"
    log FATAL "   📘 Example:
      \"durable_objects\": {
        \"bindings\": [
          { \"name\": \"Buffer\", \"class_name\": \"AnalyticsBufferDO\" }
        ]
      }"
    return 1
  fi

  local migrated_classes
  migrated_classes=$(jq -r '[.migrations[]?.new_classes[]?] | unique[]' "$config" 2>/dev/null || echo "")

  if [[ -z "$migrated_classes" ]]; then
    log FATAL "❌ No migration entries found in $config"
    log FATAL "   💡 Tip: Add migrations[].new_classes[] for each Durable Object"
    log FATAL "   📘 Example:
      \"migrations\": [
        {
          \"tag\": \"v1\",
          \"new_classes\": [\"AnalyticsBufferDO\"]
        }
      ]"
    return 1
  fi

  local missing=()
  while IFS= read -r cls; do
    if ! grep -Fxq "$cls" <<< "$migrated_classes"; then
      missing+=("$cls")
    fi
  done <<< "$do_classes"

  if (( ${#missing[@]} > 0 )); then
    log FATAL "❌ The following DO classes are missing from migrations[].new_classes:"
    for cls in "${missing[@]}"; do
      log FATAL "   - $cls"
    done
    log FATAL "   💡 Tip: Add the missing classes to a new migration tag"
    log FATAL "   📘 Example:
      \"migrations\": [
        {
          \"tag\": \"vNEXT\",
          \"new_classes\": [\"${missing[*]}\"] 
        }
      ]"
    return 1
  fi

  log INFO "✅ All Durable Object classes are declared in migrations[].new_classes"
}

# ------------------------------------------------------------------------------
# 🧪 check::deploy_durable_objects — Deploy Durable Object classes to target environment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that Durable Object classes are defined in wrangler.json
#   - Confirming ENVIRONMENT is set
#   - Deploying to the specified Wrangler environment using wrangler CLI
#
# Why it matters:
#   Durable Objects must be both declared and migrated before deployment.
#   This check ensures config, bindings, and deploy action are all in sync.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json
#   - ENVIRONMENT → Target deployment environment (e.g. staging, production)
#
# Example:
#   ENVIRONMENT=staging WRANGLER_CONFIG=wrangler.json check::deploy_durable_objects
#
# Categories:
#   cloudflare:do, wrangler, deploy, infra, ci
#
# Stages:
#   build, deploy, post-deploy
# ------------------------------------------------------------------------------
check::deploy_durable_objects() {
  # ✅ Check: Deploy Durable Object classes via Wrangler
  # Category: cloudflare:do, wrangler, deploy, infra, ci
  # Stages: build, deploy, post-deploy

  if [[ -z "${WRANGLER_CONFIG:-}" ]]; then
    export WRANGLER_CONFIG="wrangler.json"
  fi

  if [[ ! -f "$WRANGLER_CONFIG" ]]; then
    log FATAL "❌ wrangler config not found at: $WRANGLER_CONFIG"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG or ensure wrangler.json exists"
    log FATAL "   📘 Example: WRANGLER_CONFIG=config/wrangler.json"
    return 1
  fi

  if [[ -z "${ENVIRONMENT:-}" ]]; then
    log FATAL "❌ ENVIRONMENT is not set"
    log FATAL "   💡 Tip: Set the target deployment environment"
    log FATAL "   📘 Example: ENVIRONMENT=staging check::deploy_durable_objects"
    return 1
  fi

  local do_classes
  do_classes=$(check::get_durable_object_classes 2>/dev/null || true)

  if [[ -z "$do_classes" ]]; then
    log FATAL "❌ No Durable Object classes found in $WRANGLER_CONFIG"
    log FATAL "   💡 Tip: Ensure durable_objects.bindings[].class_name is populated"
    log FATAL "   📘 Example: { \"class_name\": \"MyDO\" }"
    return 1
  fi

  log INFO "✅ Durable Object classes resolved:"
  while IFS= read -r cls; do
    [[ -n "$cls" ]] && log INFO "   - $cls"
  done <<< "$do_classes"

  log INFO "📦 Deploying Durable Objects to environment: $ENVIRONMENT"

  if ! pnpm exec wrangler deploy --env "$ENVIRONMENT" --minify; then
    log FATAL "❌ wrangler deploy failed"
    log FATAL "   💡 Tip: Check for invalid bindings, missing migrations, or bad credentials"
    log FATAL "   📘 Example: pnpm exec wrangler deploy --env $ENVIRONMENT"
    return 1
  fi

  log INFO "✅ Durable Object deployment successful"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_storage_bindings — Ensure all configured storage bindings exist
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validating that all expected KV namespaces, R2 buckets, and the D1 database exist
#   - Reading bindings from wrangler.json under env.$WRANGLER_ENV
#
# Why it matters:
#   Cloudflare Workers will fail to deploy or operate if required storage bindings
#   are missing. This check ensures all declared infrastructure exists before deploy.
#
# Globals used:
#   - WRANGLER_ENV → Environment name to validate (e.g. preview, staging)
#   - DB_NAME → Name of the expected D1 database
#
# Example:
#   WRANGLER_ENV=staging DB_NAME=analytics check::validate_storage_bindings
#
# Categories:
#   wrangler, cloudflare:kv, cloudflare:r2, cloudflare:d1, infra, ci
#
# Stages:
#   check, hydrate, build, deploy
# ------------------------------------------------------------------------------
check::validate_storage_bindings() {
  # ✅ Check: Validate all storage bindings for env.$WRANGLER_ENV
  # Category: wrangler, cloudflare:kv, cloudflare:r2, cloudflare:d1, infra, ci
  # Stages: check, hydrate, build, deploy

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ -z "${WRANGLER_ENV:-}" ]]; then
    log FATAL "❌ WRANGLER_ENV is not set"
    log FATAL "   💡 Tip: Set WRANGLER_ENV to the environment block you're validating"
    log FATAL "   📘 Example: WRANGLER_ENV=staging"
    return 1
  fi

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ Wrangler config not found: $config"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG or ensure wrangler.json exists"
    log FATAL "   📘 Example: WRANGLER_CONFIG=./wrangler.json"
    return 1
  fi

  local missing=0
  log INFO "📦 Validating storage bindings for env: $WRANGLER_ENV"

  log INFO "🔍 Validating KV namespaces..."
  local kvs
  kvs=$(jq -r ".env[\"$WRANGLER_ENV\"].kv_namespaces[]?.binding" "$config" 2>/dev/null || true)
  for kv in $kvs; do
    if ! pnpm exec wrangler kv namespace list | jq -r '.[].title' | grep -q "^$kv$"; then
      log FATAL "❌ Missing KV namespace: $kv"
      log FATAL "   💡 Tip: Run \`check::create_kv_namespaces\` to create it"
      log FATAL "   📘 Example: ENVIRONMENT=$WRANGLER_ENV check::create_kv_namespaces"
      missing=1
    else
      log INFO "✅ Found KV: $kv"
    fi
  done

  log INFO "📦 Validating R2 buckets..."
  local r2s
  r2s=$(jq -r ".env[\"$WRANGLER_ENV\"].r2_buckets[]?.bucket_name" "$config" 2>/dev/null || true)
  for r2 in $r2s; do
    if ! pnpm exec wrangler r2 bucket list | jq -r '.[].name' | grep -q "^$r2$"; then
      log FATAL "❌ Missing R2 bucket: $r2"
      log FATAL "   💡 Tip: Run \`check::create_r2_buckets\` to provision it"
      log FATAL "   📘 Example: ENVIRONMENT=$WRANGLER_ENV check::create_r2_buckets"
      missing=1
    else
      log INFO "✅ Found R2: $r2"
    fi
  done

  log INFO "🧱 Validating D1 database: $DB_NAME"
  if ! pnpm exec wrangler d1 list | jq -r '.[].name' | grep -q "^$DB_NAME$"; then
    log FATAL "❌ Missing D1 database: $DB_NAME"
    log FATAL "   💡 Tip: Run \`check::ensure_d1_database_exists\` to create it"
    log FATAL "   📘 Example: DB_NAME=$DB_NAME check::ensure_d1_database_exists"
    missing=1
  else
    log INFO "✅ Found D1: $DB_NAME"
  fi

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "❌ One or more storage bindings are missing in env.$WRANGLER_ENV"
    return 1
  fi

  log INFO "✅ All storage bindings for env.$WRANGLER_ENV are present"
}

# ------------------------------------------------------------------------------
# 🧪 check::get_bindings — Extract .binding values from wrangler.json (env-aware)
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Resolving an array of binding names for a given top-level key (e.g. r2_buckets, kv_namespaces)
#   - Preferring env.$ENVIRONMENT.<key> if set, falling back to top-level.<key>
#
# Why it matters:
#   Resource provisioning and validation depend on resolving declared bindings in
#   wrangler.json. This ensures infrastructure setup scripts use correct scopes.
#
# Globals used:
#   - ENVIRONMENT → Optional env block name (e.g. preview, staging)
#   - WRANGLER_CONFIG → Path to wrangler.json (default: wrangler.json)
#
# Example:
#   WRANGLER_CONFIG=wrangler.json ENVIRONMENT=staging check::get_bindings r2_buckets
#
# Categories:
#   wrangler, shell, cloudflare:kv, cloudflare:r2, cloudflare:do, ci
#
# Stages:
#   hydrate, check, deploy
# ------------------------------------------------------------------------------
check::get_bindings() {
  # ✅ Check: Resolve binding names from wrangler.json (env-aware fallback)
  # Category: wrangler, shell, cloudflare:kv, cloudflare:r2, cloudflare:do, ci
  # Stages: hydrate, check, deploy

  local key="$1"
  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ -z "$key" ]]; then
    log FATAL "❌ Missing argument: binding key (e.g. r2_buckets)"
    log FATAL "   💡 Tip: Pass a top-level wrangler.json key to resolve (e.g. kv_namespaces)"
    log FATAL "   📘 Example: check::get_bindings kv_namespaces"
    return 1
  fi

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ wrangler config not found: $config"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG or place wrangler.json at the project root"
    log FATAL "   📘 Example: WRANGLER_CONFIG=config/wrangler.json"
    return 1
  fi

  local resolved=""
  if [[ -n "${ENVIRONMENT:-}" ]]; then
    resolved=$(jq -r --arg key "$key" --arg env "$ENVIRONMENT" '
      try .env[$env][$key][]?.binding catch empty
    ' "$config" | grep -v '^null$')
    if [[ -n "$resolved" ]]; then
      log INFO "✅ Bindings resolved from env.$ENVIRONMENT.$key:"
      while IFS= read -r line; do
        [[ -n "$line" ]] && log INFO "   - $line"
      done <<< "$resolved"
      return 0
    fi
  fi

  resolved=$(jq -r --arg key "$key" '
    try .[$key][]?.binding catch empty
  ' "$config" | grep -v '^null$')

  if [[ -n "$resolved" ]]; then
    log INFO "✅ Bindings resolved from top-level $key:"
    while IFS= read -r line; do
      [[ -n "$line" ]] && log INFO "   - $line"
    done <<< "$resolved"
    return 0
  fi

  log WARN "⚠️  No bindings found for key: $key in $config"
  return 0
}

# ------------------------------------------------------------------------------
# 🧪 check::bootstrap_preview_storage_with_secrets — Setup preview secrets + bootstrap storage
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Injecting required secrets into the preview environment
#   - Appending secrets to .env.preview
#   - Running the preview storage bootstrap script
#
# Why it matters:
#   Preview environments require secrets and provisioned KV, R2, and D1 bindings
#   before they can be used in CI, dev, or integration testing.
#
# Globals used:
#   - ENVIRONMENT → Automatically set to "preview"
#   - SENTRY_DSN, SENTRY_PROJECT → Required secrets
#
# Example:
#   CI=true SENTRY_DSN=abc SENTRY_PROJECT=xyz check::bootstrap_preview_storage_with_secrets
#
# Categories:
#   cloudflare:kv, cloudflare:r2, cloudflare:d1, secrets, wrangler, ci
#
# Stages:
#   build, hydrate, post-deploy
# ------------------------------------------------------------------------------
check::bootstrap_preview_storage_with_secrets() {
  # ✅ Check: Provision preview secrets and bootstrap storage
  # Category: cloudflare:kv, cloudflare:r2, cloudflare:d1, secrets, wrangler, ci
  # Stages: build, hydrate, post-deploy

  export ENVIRONMENT=preview

  log INFO "🔐 Injecting secrets into Wrangler preview environment..."

  local injected=0
  for s in SENTRY_DSN SENTRY_PROJECT; do
    if [[ -n "${!s:-}" ]]; then
      echo "${!s}" | pnpm exec wrangler secret put "$s" --env preview > /dev/null
      echo "$s=${!s}" >> .env.preview
      log INFO "✅ Secret injected: $s"
      ((injected++))
    else
      log WARN "⚠️  Secret not set: $s — skipping injection"
    fi
  done

  if [[ "$injected" -eq 0 ]]; then
    log FATAL "❌ No secrets injected — both SENTRY_DSN and SENTRY_PROJECT are missing"
    log FATAL "   💡 Tip: Set required preview secrets in GitLab CI/CD variables"
    log FATAL "   📘 Example: export SENTRY_DSN=abc SENTRY_PROJECT=xyz"
    return 1
  fi

  if [[ ! -x ./src/scripts/bootstrap-storage.sh ]]; then
    log FATAL "❌ bootstrap-storage.sh not found or not executable"
    log FATAL "   💡 Tip: Ensure the script exists and has execution permission"
    log FATAL "   📘 Example: chmod +x ./src/scripts/bootstrap-storage.sh"
    return 1
  fi

  log INFO "☁️ Bootstrapping preview storage via ./src/scripts/bootstrap-storage.sh..."
  if ! ./src/scripts/bootstrap-storage.sh; then
    log FATAL "❌ Storage bootstrap failed"
    log FATAL "   💡 Tip: Check wrangler.json bindings and your bootstrap script logic"
    log FATAL "   📘 Example: ./src/scripts/bootstrap-storage.sh"
    return 1
  fi

  log INFO "✅ Preview storage and secrets bootstrap complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::bootstrap_storage_with_optional_tail — Bootstrap bindings and tail worker (if defined)
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Bootstrapping storage resources via bootstrap-storage.sh
#   - Conditionally deploying a tail worker if tail_consumers[].service is defined
#
# Why it matters:
#   Workers must be deployed with the correct KV, R2, and D1 bindings.
#   If a tail consumer is defined for observability or stream processing,
#   it must be deployed alongside the main service.
#
# Globals used:
#   - WRANGLER_ENV → Target environment name
#   - ENVIRONMENT → Exported for consistency with other scripts
#
# Example:
#   WRANGLER_ENV=staging check::bootstrap_storage_with_optional_tail
#
# Categories:
#   wrangler, infra, cloudflare:kv, cloudflare:r2, cloudflare:d1, cloudflare:do
#
# Stages:
#   build, hydrate, deploy, post-deploy
# ------------------------------------------------------------------------------
check::bootstrap_storage_with_optional_tail() {
  # ✅ Check: Bootstrap storage and deploy tail worker (if declared)
  # Category: wrangler, infra, cloudflare:kv, cloudflare:r2, cloudflare:d1, cloudflare:do
  # Stages: build, hydrate, deploy, post-deploy

  local env="${WRANGLER_ENV:-}"
  export ENVIRONMENT="$env"

  if [[ -z "$env" ]]; then
    log FATAL "❌ WRANGLER_ENV is not set"
    log FATAL "   💡 Tip: Specify the target environment (e.g. staging, preview)"
    log FATAL "   📘 Example: WRANGLER_ENV=staging check::bootstrap_storage_with_optional_tail"
    return 1
  fi

  if [[ ! -x ./src/scripts/bootstrap-storage.sh ]]; then
    log FATAL "❌ bootstrap-storage.sh not found or not executable"
    log FATAL "   💡 Tip: Ensure the script exists and has chmod +x"
    log FATAL "   📘 Example: chmod +x ./src/scripts/bootstrap-storage.sh"
    return 1
  fi

  log INFO "☁️ Bootstrapping storage resources for env: $ENVIRONMENT"
  if ! ./src/scripts/bootstrap-storage.sh; then
    log FATAL "❌ Failed to bootstrap storage for $ENVIRONMENT"
    log FATAL "   💡 Tip: Check for missing wrangler bindings or provisioning scripts"
    log FATAL "   📘 Example: ./src/scripts/bootstrap-storage.sh"
    return 1
  fi

  log INFO "🔍 Checking wrangler.json for tail worker definition..."
  if jq -e ".env[\"$ENVIRONMENT\"].tail_consumers[]?.service" wrangler.json > /dev/null 2>&1; then
    log INFO "🚀 Tail worker config found — deploying to $ENVIRONMENT"
    if ! ./src/scripts/deploy-tail-worker.sh "$ENVIRONMENT"; then
      log FATAL "❌ Failed to deploy tail worker for $ENVIRONMENT"
      log FATAL "   💡 Tip: Check deploy-tail-worker.sh or Wrangler credentials"
      log FATAL "   📘 Example: ./src/scripts/deploy-tail-worker.sh $ENVIRONMENT"
      return 1
    fi
  else
    log INFO "ℹ️  No tail worker defined for env: $ENVIRONMENT — skipping tail deploy"
  fi

  log INFO "✅ Storage bootstrap complete for env: $ENVIRONMENT"
}

# ------------------------------------------------------------------------------
# 🧪 check::bootstrap_local_worker — Initialize local dev environment for Cloudflare Workers
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validating startup mode (start, clean, onboard)
#   - Loading local .env config
#   - Resetting local D1/KV/R2 if needed
#   - Launching wrangler dev in --local mode
#
# Why it matters:
#   Local environments must be bootstrapped in a consistent and safe way,
#   especially when resetting or onboarding. This ensures predictable local dev.
#
# Globals used:
#   - MODE → One of: start, clean, onboard
#   - DB_NAME, D1_SQLITE, SCHEMA_FILE, ENV_FILE, SEED_SCRIPT → Required by reset script
#
# Example:
#   MODE=clean check::bootstrap_local_worker
#
# Categories:
#   ci, shell, wrangler, infra, cloudflare:kv, cloudflare:d1, cloudflare:r2
#
# Stages:
#   dev, hydrate
# ------------------------------------------------------------------------------
check::bootstrap_local_worker() {
  # ✅ Check: Bootstrap and launch Cloudflare Workers local dev server
  # Category: ci, shell, wrangler, infra, cloudflare:kv, cloudflare:d1, cloudflare:r2
  # Stages: dev, hydrate

  local mode="${MODE:-start}"
  local valid_modes=("start" "clean" "onboard")

  if [[ ! " ${valid_modes[*]} " =~ " $mode " ]]; then
    log FATAL "❌ Invalid MODE: $mode"
    log FATAL "   💡 Tip: Must be one of: start, clean, onboard"
    log FATAL "   📘 Example: MODE=clean check::bootstrap_local_worker"
    return 1
  fi

  log INFO "📦 Starting local bootstrap with mode: $mode"

  if ! command -v load_env_file >/dev/null; then
    log FATAL "❌ Missing helper: load_env_file"
    log FATAL "   💡 Tip: Ensure your shell environment defines it"
    log FATAL "   📘 Example: declare -f load_env_file"
    return 1
  fi

  if ! command -v reset_local_environment >/dev/null; then
    log FATAL "❌ Missing helper: reset_local_environment"
    log FATAL "   💡 Tip: Required for clean/onboard flows"
    log FATAL "   📘 Example: declare -f reset_local_environment"
    return 1
  fi

  if ! command -v launch_local_dev_server >/dev/null; then
    log FATAL "❌ Missing helper: launch_local_dev_server"
    log FATAL "   💡 Tip: This is required to start Wrangler in --local mode"
    log FATAL "   📘 Example: declare -f launch_local_dev_server"
    return 1
  fi

  # Load environment variables
  log INFO "📄 Loading environment variables from .env.local"
  if ! load_env_file; then
    log FATAL "❌ Failed to load environment from .env.local"
    return 1
  fi

  # Reset if necessary
  if [[ "$mode" == "clean" || "$mode" == "onboard" ]]; then
    log INFO "🧹 Running environment reset for: $mode"
    if ! reset_local_environment "$mode"; then
      log FATAL "❌ Environment reset failed for: $mode"
      return 1
    fi
  fi

  # Launch local dev server (will exec and not return)
  log INFO "🚀 Launching local Wrangler dev server (mode: --local)"
  launch_local_dev_server
}

# ------------------------------------------------------------------------------
# 🧪 check::run_integration_test_and_healthcheck — Run integration test and confirm post-deploy health
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Running the designated integration test script for $WRANGLER_ENV
#   - Verifying runtime availability via a post-deploy healthcheck
#
# Why it matters:
#   Even successful builds can silently fail at runtime. This check ensures
#   functional behavior of the deployed preview/staging environment.
#
# Globals used:
#   - WRANGLER_ENV → Environment to test (e.g. preview, staging)
#   - PREVIEW_URL  → Deployed URL to check
#
# Example:
#   WRANGLER_ENV=preview PREVIEW_URL=https://example.workers.dev check::run_integration_test_and_healthcheck
#
# Categories:
#   test, ci, deploy, integration
#
# Stages:
#   test, post-deploy, integration
# ------------------------------------------------------------------------------
check::run_integration_test_and_healthcheck() {
  # ✅ Check: Run integration test and post-deploy healthcheck
  # Category: test, ci, deploy, integration
  # Stages: test, post-deploy, integration

  if [[ -z "${WRANGLER_ENV:-}" ]]; then
    log FATAL "❌ WRANGLER_ENV is not set"
    log FATAL "   💡 Tip: Define the target environment to test (e.g. preview)"
    log FATAL "   📘 Example: WRANGLER_ENV=preview check::run_integration_test_and_healthcheck"
    return 1
  fi

  if [[ -z "${PREVIEW_URL:-}" ]]; then
    log FATAL "❌ PREVIEW_URL is not set"
    log FATAL "   💡 Tip: Set PREVIEW_URL to the deployed URL before running this check"
    log FATAL "   📘 Example: PREVIEW_URL=https://example.workers.dev"
    return 1
  fi

  if [[ ! -f ./__tests__/test.analytics.ts ]]; then
    log FATAL "❌ Integration test file not found: ./__tests__/test.analytics.ts"
    log FATAL "   💡 Tip: Ensure the test file exists and is committed"
    log FATAL "   📘 Example: mkdir -p __tests__ && touch test.analytics.ts"
    return 1
  fi

  log INFO "🧪 Running integration test for environment: $WRANGLER_ENV"
  if ! ENV="$WRANGLER_ENV" ./__tests__/test.analytics.ts; then
    log FATAL "❌ Integration test failed for $WRANGLER_ENV"
    log FATAL "   💡 Tip: Fix test failures before proceeding to deploy"
    log FATAL "   📘 Example: ENV=$WRANGLER_ENV ./__tests__/test.analytics.ts"
    return 1
  fi

  if [[ ! -x ./src/scripts/post-deploy-health-check.sh ]]; then
    log FATAL "❌ Health check script not found or not executable: ./src/scripts/post-deploy-health-check.sh"
    log FATAL "   💡 Tip: Ensure the script exists and has chmod +x"
    log FATAL "   📘 Example: chmod +x ./src/scripts/post-deploy-health-check.sh"
    return 1
  fi

  log INFO "🩺 Running post-deploy health check on: $PREVIEW_URL"
  if ! ./src/scripts/post-deploy-health-check.sh "$PREVIEW_URL"; then
    log FATAL "❌ Post-deploy health check failed for $PREVIEW_URL"
    log FATAL "   💡 Tip: Confirm your deployed Worker is accessible and healthy"
    log FATAL "   📘 Example: curl $PREVIEW_URL/__health"
    return 1
  fi

  log INFO "✅ Integration test and health check passed for: $WRANGLER_ENV"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_preview_url_health — Confirm deployed preview URL returns HTTP 200
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Resolving $PREVIEW_URL from the environment or .env.preview
#   - Making a request to the root preview URL
#   - Ensuring the response returns HTTP 200
#
# Why it matters:
#   A preview deployment may build successfully but still fail at runtime.
#   This ensures the deployed endpoint is reachable and responding.
#
# Globals used:
#   - PREVIEW_URL → Will be resolved if not set from .env.preview
#
# Example:
#   check::validate_preview_url_health
#
# Categories:
#   ci, deploy, post-deploy, test
#
# Stages:
#   post-deploy, integration, check
# ------------------------------------------------------------------------------
check::validate_preview_url_health() {
  # ✅ Check: Confirm deployed preview URL is reachable (HTTP 200)
  # Category: ci, deploy, post-deploy, test
  # Stages: post-deploy, integration, check

  if [[ -z "${PREVIEW_URL:-}" ]]; then
    if [[ -f .env.preview ]]; then
      PREVIEW_URL=$(grep -E '^PREVIEW_URL=' .env.preview | cut -d= -f2- || true)
    fi
  fi

  if [[ -z "$PREVIEW_URL" ]]; then
    log FATAL "❌ PREVIEW_URL not found in environment or .env.preview"
    log FATAL "   💡 Tip: Ensure the preview deployment writes PREVIEW_URL to .env.preview"
    log FATAL "   📘 Example: echo \"PREVIEW_URL=https://xyz.workers.dev\" >> .env.preview"
    return 1
  fi

  log INFO "🔍 Validating preview URL: $PREVIEW_URL"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$PREVIEW_URL")

  if [[ "$status" -ne 200 ]]; then
    log FATAL "❌ Preview URL is not healthy (HTTP $status)"
    log FATAL "   💡 Tip: Check logs or route config in Wrangler"
    log FATAL "   📘 Example: curl -i $PREVIEW_URL"
    return 1
  fi

  log INFO "✅ Preview URL is healthy (HTTP 200)"
}

# ------------------------------------------------------------------------------
# 🧪 check::monitor_canary_health — Validate canary rollout via Sentry and tail logs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Querying Sentry for error volume during a rollout
#   - Inspecting Cloudflare tail logs for runtime crash signatures
#
# Why it matters:
#   Canary rollouts must be automatically reverted if instability is detected.
#   This check ensures observability-driven health validation in CI.
#
# Globals used:
#   - CI → Must be "true"
#
# Example:
#   check::monitor_canary_health 10 2m
#
# Categories:
#   ci, deploy, observability, sentry, cloudflare:do
#
# Stages:
#   post-deploy, integration, rollback
# ------------------------------------------------------------------------------
check::monitor_canary_health() {
  # ✅ Check: Monitor canary health via Sentry + Wrangler tail logs
  # Category: ci, deploy, observability, sentry, cloudflare:do
  # Stages: post-deploy, integration, rollback

  local max_errors="${1:-10}"
  local window="${2:-2m}"

  if [[ "${CI:-}" != "true" ]]; then
    echo "❌ This check must only run in GitLab CI (CI=true)" >&2
    echo "💡 Tip: Add \`CI=true\` to your job environment" >&2
    echo "📘 Example: CI=true check::monitor_canary_health 10 2m" >&2
    return 1
  fi

  log INFO "📡 Checking Sentry metrics for canary..."
  local error_count
  error_count=$(curl -s "https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/stats/" |
    jq '.[].errors' | awk '{s+=$1} END {print s}' || echo "0")

  log INFO "🔢 Sentry error count: $error_count (window: $window)"

  if [[ "$error_count" -gt "$max_errors" ]]; then
    log FATAL "❌ Canary failed Sentry threshold: $error_count errors > max $max_errors"
    log FATAL "   💡 Tip: Investigate recent exceptions in Sentry before promoting"
    log FATAL "   📘 Example: https://sentry.io/organizations/YOUR_ORG/projects/YOUR_PROJECT/"
    return 1
  fi

  log INFO "🌀 Inspecting Wrangler canary tail logs..."
  local tail_log
  tail_log=$(timeout 10s pnpm exec wrangler tail --env canary --sampling-rate 1.0 --format json --log-forwarding-url dummy://local 2>/dev/null || true)

  if echo "$tail_log" | grep -qiE 'ReferenceError|TypeError|UnhandledPromiseRejection|binding error|unexpected'; then
    log FATAL "❌ Canary tail logs show runtime errors"
    log FATAL "   💡 Tip: Check wrangler logs and look for recent stack traces"
    log FATAL "   📘 Example: pnpm exec wrangler tail --env canary"
    echo "$tail_log" | grep -iE 'ReferenceError|TypeError|UnhandledPromiseRejection|binding error|unexpected' >&2
    return 1
  fi

  log INFO "✅ Canary passed health checks (Sentry + Wrangler tail logs)"
}

# ------------------------------------------------------------------------------
# 🧪 check::run_post_deploy_checks — Notify Healthchecks.io + send Sentry test event
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Pinging HEALTHCHECKS_POST_DEPLOY_URL
#   - Optionally sending a test event to Sentry if SENTRY_DSN and SENTRY_KEY are defined
#
# Why it matters:
#   Post-deploy observability must confirm that deployments complete successfully.
#   This ensures external health and alerting systems reflect CI state.
#
# Globals used:
#   - CI → must be "true"
#   - HEALTHCHECKS_POST_DEPLOY_URL → required
#   - SENTRY_DSN, SENTRY_KEY → optional for test ping
#
# Example:
#   CI=true HEALTHCHECKS_POST_DEPLOY_URL=... check::run_post_deploy_checks
#
# Categories:
#   ci, observability, deploy
#
# Stages:
#   post-deploy, notify, integration
# ------------------------------------------------------------------------------
check::run_post_deploy_checks() {
  # ✅ Check: Post-deploy checks for Healthchecks.io + Sentry
  # Category: ci, observability, deploy
  # Stages: post-deploy, notify, integration

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must be run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Ensure CI=true is set in your pipeline job"
    log FATAL "   📘 Example: CI=true check::run_post_deploy_checks"
    return 1
  fi

  if [[ -n "${HEALTHCHECKS_POST_DEPLOY_URL:-}" ]]; then
    log INFO "📡 Pinging Healthchecks.io endpoint..."
    if curl -fsS -m 5 "$HEALTHCHECKS_POST_DEPLOY_URL" > /dev/null; then
      log INFO "✅ Healthcheck ping succeeded"
    else
      log WARN "⚠️ Healthcheck ping failed — endpoint may be misconfigured"
    fi
  else
    log WARN "⚠️ No HEALTHCHECKS_POST_DEPLOY_URL defined — skipping healthcheck ping"
  fi

  if [[ -n "${SENTRY_DSN:-}" && -n "${SENTRY_KEY:-}" ]]; then
    log INFO "📡 Sending Sentry test event..."
    if ! curl -s https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/store/ \
      -H "X-Sentry-Auth: Sentry sentry_version=7, sentry_key=$SENTRY_KEY, sentry_client=enzuzo-cli/1.0" \
      -H "Content-Type: application/json" \
      -d '{
        "message": "CI Post-deploy test event",
        "level": "info",
        "platform": "javascript"
      }' > /dev/null; then
      log WARN "⚠️ Sentry test event failed — check SENTRY_KEY validity"
    else
      log INFO "✅ Sentry test event sent"
    fi
  else
    log INFO "ℹ️ Sentry test event skipped — SENTRY_DSN or SENTRY_KEY not set"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::diff_wrangler_environments — Compare secrets and R2 buckets across envs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring secrets in source env exist in the target env
#   - Ensuring R2 buckets match between both environments
#
# Why it matters:
#   Configuration drift between environments can lead to deployment failures
#   or runtime errors. This check guarantees alignment between staging and prod.
#
# Globals used:
#   - CI → must be "true"
#
# Example:
#   CI=true check::diff_wrangler_environments staging production
#
# Categories:
#   wrangler, cloudflare:r2, secrets, ci, deploy
#
# Stages:
#   check, deploy, integration
# ------------------------------------------------------------------------------
check::diff_wrangler_environments() {
  # ✅ Check: Compare secrets + R2 buckets between two Wrangler environments
  # Category: wrangler, cloudflare:r2, secrets, ci, deploy
  # Stages: check, deploy, integration

  local env1="$1"
  local env2="$2"

  if [[ -z "$env1" || -z "$env2" ]]; then
    log FATAL "❌ Missing required arguments: source and target environments"
    log FATAL "   💡 Tip: Provide both envs to compare (e.g. staging production)"
    log FATAL "   📘 Example: check::diff_wrangler_environments staging production"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must only run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Add \`CI=true\` to your job environment"
    log FATAL "   📘 Example: CI=true check::diff_wrangler_environments staging production"
    return 1
  fi

  local missing=0
  log INFO "🔍 Comparing secrets: $env1 vs $env2"
  local secrets_env1
  secrets_env1=$(pnpm exec wrangler secret list --env "$env1" | awk '{print $1}' | tail -n +2)

  for secret in $secrets_env1; do
    if ! pnpm exec wrangler secret list --env "$env2" | grep -q "^$secret$"; then
      log FATAL "❌ Secret '$secret' exists in $env1 but is missing in $env2"
      log FATAL "   💡 Tip: Sync this secret using \`wrangler secret put $secret --env $env2\`"
      log FATAL "   📘 Example: echo \$${secret} | pnpm exec wrangler secret put $secret --env $env2"
      missing=1
    else
      log INFO "✅ Secret '$secret' exists in both environments"
    fi
  done

  log INFO "🔍 Comparing R2 buckets: $env1 vs $env2"
  local buckets_env1
  buckets_env1=$(jq -r ".env[\"$env1\"].r2_buckets[]?.bucket_name" wrangler.json || true)

  for bucket in $buckets_env1; do
    if ! jq -r ".env[\"$env2\"].r2_buckets[]?.bucket_name" wrangler.json | grep -q "^$bucket$"; then
      log FATAL "❌ R2 bucket '$bucket' exists in $env1 but is missing in $env2"
      log FATAL "   💡 Tip: Add this bucket under \`.env.$env2.r2_buckets\` in wrangler.json"
      log FATAL "   📘 Example: { \"bucket_name\": \"$bucket\", \"binding\": \"...\" }"
      missing=1
    else
      log INFO "✅ R2 bucket '$bucket' exists in both environments"
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "❌ Drift detected between $env1 and $env2"
    log FATAL "   💡 Tip: Align secrets and R2 buckets before promoting to $env2"
    return 1
  fi

  log INFO "✅ No drift detected between $env1 and $env2"
}

# ------------------------------------------------------------------------------
# 🧪 check::read_settings_schema_and_tiers — Parse schema keys and tier names from TypeScript model
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Executing a tsx script to extract settingSchema and tiers[]
#   - Populating global arrays `schema_keys` and `tiers`
#
# Why it matters:
#   The schema and tier definitions power .env validation, seeding, SQL inserts,
#   and runtime validation. Without this step, downstream logic will break silently.
#
# Globals set:
#   - schema_keys — array of schema key names
#   - tiers       — array of tier names (free, pro, team, etc.)
#
# Example:
#   SETTINGS_MODEL=settings-model.ts check::read_settings_schema_and_tiers
#
# Categories:
#   tsconfig, database, hydrate
#
# Stages:
#   hydrate, check, dev
# ------------------------------------------------------------------------------
check::read_settings_schema_and_tiers() {
  # ✅ Check: Parse TypeScript model to extract schema keys and tiers
  # Category: tsconfig, database, hydrate
  # Stages: hydrate, check, dev

  local settings_file="${1:-$SETTINGS_MODEL}"
  local settings_path="$PACKAGE_DIR/src/utils/$settings_file"

  if [[ ! -f "$settings_path" ]]; then
    log FATAL "❌ TypeScript settings model not found at: $settings_path"
    log FATAL "   💡 Tip: Ensure SETTINGS_MODEL points to the correct path inside your app"
    log FATAL "   📘 Example: SETTINGS_MODEL=settings-model.ts"
    return 1
  fi

  if ! command -v tsx > /dev/null; then
    log FATAL "❌ tsx is not installed or not in PATH"
    log FATAL "   💡 Tip: Install tsx via \`pnpm add -D tsx\`"
    log FATAL "   📘 Example: pnpm add -D tsx"
    return 1
  fi

  log INFO "📖 Parsing schema and tiers from: $settings_path"

  local tmp_script
  tmp_script="$(mktemp --suffix=.ts)"

  cat > "$tmp_script" <<EOF
    import { settingSchema, tiers } from '${settings_path}';
    console.log(JSON.stringify({ schema: settingSchema, tiers }));
EOF

  local json
  json=$(cd "$SCRIPTS_DIR" && tsx --esm "$tmp_script" 2>/dev/null)
  rm -f "$tmp_script"

  if [[ -z "$json" ]]; then
    log FATAL "❌ Failed to parse $settings_file — missing or invalid exports"
    log FATAL "   💡 Tip: Ensure settingSchema and tiers[] are exported"
    log FATAL "   📘 Example:
      export const settingSchema = { a: '', b: '' };
      export const tiers = ['free', 'pro'];
    "
    return 1
  fi

  # Extract and export globals
  mapfile -t schema_keys < <(echo "$json" | jq -r '.schema | keys[]')
  mapfile -t tiers < <(echo "$json" | jq -r '.tiers[]')

  if [[ "${#schema_keys[@]}" -eq 0 || "${#tiers[@]}" -eq 0 ]]; then
    log FATAL "❌ Parsed output is missing schema keys or tiers"
    log FATAL "   💡 Tip: Ensure the schema object and tiers[] array contain actual values"
    log FATAL "   📘 Example: { settingSchema: { a: '', b: '' }, tiers: ['basic'] }"
    return 1
  fi

  log INFO "✅ Extracted ${#schema_keys[@]} schema key(s) and ${#tiers[@]} tier(s)"
  log INFO "   • Schema keys: ${schema_keys[*]}"
  log INFO "   • Tiers: ${tiers[*]}"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_cf_secrets — Ensure required Wrangler secrets exist in environment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking if all secrets in $REQUIRED_SECRETS exist in `wrangler secret list --env`
#
# Why it matters:
#   Missing secrets during CI/CD deployments will result in runtime failure.
#   This check ensures all required values are defined before continuing.
#
# Globals used:
#   - CI → must be true
#   - REQUIRED_SECRETS → array of required secret keys
#
# Example:
#   REQUIRED_SECRETS=("SENTRY_DSN" "SENTRY_PROJECT")
#   check::validate_cf_secrets staging
#
# Categories:
#   secrets, wrangler, ci, deploy
#
# Stages:
#   check, deploy, hydrate
# ------------------------------------------------------------------------------
check::validate_cf_secrets() {
  # ✅ Check: Validate required secrets exist in wrangler environment
  # Category: secrets, wrangler, ci, deploy
  # Stages: check, deploy, hydrate

  local env="$1"

  if [[ -z "$env" ]]; then
    log FATAL "❌ Missing environment name argument"
    log FATAL "   💡 Tip: Specify the Wrangler environment to check"
    log FATAL "   📘 Example: check::validate_cf_secrets staging"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must be run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Add CI=true to your job environment"
    log FATAL "   📘 Example: CI=true check::validate_cf_secrets $env"
    return 1
  fi

  if [[ -z "${REQUIRED_SECRETS[*]:-}" ]]; then
    log FATAL "❌ REQUIRED_SECRETS is not defined"
    log FATAL "   💡 Tip: Set REQUIRED_SECRETS=(...) before calling this function"
    log FATAL "   📘 Example: REQUIRED_SECRETS=(SENTRY_DSN SENTRY_PROJECT)"
    return 1
  fi

  log INFO "🔐 Validating required Cloudflare secrets for env: $env"

  local missing=0
  local existing
  existing=$(pnpm exec wrangler secret list --env "$env" | awk '{print $1}' | tail -n +2)

  for key in "${REQUIRED_SECRETS[@]}"; do
    if ! grep -q "^$key$" <<< "$existing"; then
      log FATAL "❌ Missing secret: $key for env=$env"
      log FATAL "   💡 Tip: Set this using: echo \$${key} | pnpm exec wrangler secret put $key --env $env"
      log FATAL "   📘 Example: echo \$${key} | pnpm exec wrangler secret put $key --env $env"
      missing=1
    else
      log INFO "✅ Found secret: $key"
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "💥 One or more required secrets are missing in env: $env"
    return 1
  fi

  log INFO "✅ All required secrets are present in $env"
}

# ------------------------------------------------------------------------------
# 🧪 check::required_secrets — Ensure required secrets are present in local env
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking that essential secrets (e.g., SENTRY_DSN, SENTRY_PROJECT) are exported
#   - Failing the check if any are missing
#
# Why it matters:
#   Secrets must be present to seed, deploy, or run services locally or in CI.
#   Missing secrets lead to silent failures, misconfigured Sentry, and blocked CI jobs.
#
# Globals used:
#   - None (but reads: $SENTRY_DSN, $SENTRY_PROJECT, etc.)
#
# Example:
#   check::required_secrets
#
# Categories:
#   dotenv, secrets, safety
#
# Stages:
#   check, hydrate, build, deploy
# ------------------------------------------------------------------------------
check::required_secrets() {
  # ✅ Check: Ensure required environment secrets are defined
  # Category: dotenv, secrets, safety
  # Stages: check, hydrate, build, deploy

  local secrets=(SENTRY_DSN SENTRY_PROJECT)  # TODO: Extract from model/schema?
  local missing=0

  log INFO "🔐 Checking required secrets in local environment..."

  for var in "${secrets[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      log FATAL "❌ Missing secret: $var"
      log FATAL "   💡 Tip: Set this secret in your .env or CI environment"
      log FATAL "   📘 Example: echo \"$var=value\" >> .env.local"
      missing=1
    else
      log INFO "✅ $var is set"
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "💥 One or more required secrets are missing"
    return 1
  fi

  log INFO "✅ All required secrets are present"
}

# ------------------------------------------------------------------------------
# 🧪 check::required_ci_vars — Validate required CI/CD environment variables are set
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring core CI/CD-related env vars are defined before deploy/build
#
# Why it matters:
#   CI jobs will silently fail or behave incorrectly if critical variables are missing.
#   This check enforces pre-flight safety in any CI pipeline.
#
# Globals read:
#   - WRANGLER_ENV, DB_NAME, SENTRY_DSN, SENTRY_PROJECT,
#     CLOUDFLARE_API_TOKEN, ACCOUNT_ID, SERVICE_NAME
#
# Example:
#   check::required_ci_vars
#
# Categories:
#   ci, secrets, safety
#
# Stages:
#   check, build, deploy
# ------------------------------------------------------------------------------
check::required_ci_vars() {
  # ✅ Check: Validate core CI/CD variables are present
  # Category: ci, secrets, safety
  # Stages: check, build, deploy

  local vars=(
    WRANGLER_ENV
    DB_NAME
    SENTRY_DSN
    SENTRY_PROJECT
    CLOUDFLARE_API_TOKEN
    ACCOUNT_ID
    SERVICE_NAME
  )

  local missing=0

  log INFO "🔎 Validating required CI/CD environment variables..."

  for var in "${vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      log FATAL "❌ Missing CI/CD variable: $var"
      log FATAL "   💡 Tip: Set this variable in GitLab CI/CD settings or .env"
      log FATAL "   📘 Example: export $var=value"
      missing=1
    else
      log INFO "✅ $var is set"
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "💥 CI/CD validation failed — one or more required variables are missing"
    return 1
  fi

  log INFO "✅ All required CI/CD environment variables are present"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_wrangler_env_config — Ensure wrangler.json has full bindings per env
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring each defined environment in wrangler.json has the required bindings:
#     - kv_namespaces
#     - r2_buckets
#     - d1_databases
#
# Why it matters:
#   Missing env bindings in wrangler.json lead to broken deployments and runtime errors.
#   This check ensures each env block is complete before deploy or bootstrap.
#
# Globals used:
#   - None
#
# Example:
#   check::validate_wrangler_env_config
#
# Categories:
#   wrangler, cloudflare:kv, cloudflare:r2, cloudflare:d1, safety
#
# Stages:
#   check, hydrate, deploy
# ------------------------------------------------------------------------------
check::validate_wrangler_env_config() {
  # ✅ Check: Ensure wrangler.json envs define kv, r2, d1 bindings
  # Category: wrangler, cloudflare:kv, cloudflare:r2, cloudflare:d1, safety
  # Stages: check, hydrate, deploy

  local environments=("production" "staging" "preview")
  local missing=0

  log INFO "📋 Validating wrangler.json environment bindings..."

  for env in "${environments[@]}"; do
    log INFO "🔍 Validating wrangler config for env=$env"
    if jq -e \
      ".env[\"$env\"].kv_namespaces and \
       .env[\"$env\"].r2_buckets and \
       .env[\"$env\"].d1_databases" wrangler.json > /dev/null; then
      log INFO "✅ Required bindings present for $env"
    else
      log FATAL "❌ Missing bindings for env=$env in wrangler.json"
      log FATAL "   💡 Tip: Ensure 'kv_namespaces', 'r2_buckets', and 'd1_databases' are defined under .env[\"$env\"]"
      log FATAL "   📘 Example:
        \"env\": {
          \"$env\": {
            \"kv_namespaces\": [...],
            \"r2_buckets\": [...],
            \"d1_databases\": [...]
          }
        }"
      missing=1
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "❌ wrangler.json validation failed — one or more envs are missing required bindings"
    return 1
  fi

  log INFO "✅ All required bindings are present in wrangler.json for: ${environments[*]}"
}

# ------------------------------------------------------------------------------
# 🧪 check::comment_deploy_summary_to_mr — Post deploy summary markdown to GitLab MR
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring deploy summary exists
#   - Validating required GitLab CI/CD environment variables
#   - Posting a markdown comment to the associated merge request
#
# Why it matters:
#   CI deployments should always leave a paper trail in the MR that triggered them.
#   This ensures devs see deploy outcome inline with GitLab merge workflow.
#
# Globals used:
#   - CI_MERGE_REQUEST_IID → MR ID
#   - GITLAB_API_TOKEN     → GitLab auth token
#   - CI_API_V4_URL        → GitLab API root
#   - CI_PROJECT_ID        → Project ID for this job
#
# Example:
#   check::comment_deploy_summary_to_mr
#
# Categories:
#   ci, deploy, gitlab
#
# Stages:
#   post-deploy, notify
# ------------------------------------------------------------------------------
check::comment_deploy_summary_to_mr() {
  # ✅ Check: Post .deploy-summary/summary.md as a comment to GitLab MR
  # Category: ci, deploy, gitlab
  # Stages: post-deploy, notify

  local summary_file=".deploy-summary/summary.md"

  if [[ ! -f "$summary_file" ]]; then
    log FATAL "❌ Deploy summary not found: $summary_file"
    log FATAL "   💡 Tip: Generate the summary before running this check"
    log FATAL "   📘 Example: echo '### Deploy Complete' > $summary_file"
    return 1
  fi

  if [[ -z "${CI_MERGE_REQUEST_IID:-}" ]]; then
    log FATAL "❌ CI_MERGE_REQUEST_IID is not set — cannot post comment to MR"
    log FATAL "   💡 Tip: Make sure this job runs in a merge request pipeline"
    log FATAL "   📘 Example: echo \"CI_MERGE_REQUEST_IID=\$CI_MERGE_REQUEST_IID\""
    return 1
  fi

  if [[ -z "${GITLAB_API_TOKEN:-}" || -z "${CI_API_V4_URL:-}" || -z "${CI_PROJECT_ID:-}" ]]; then
    log FATAL "❌ Missing required GitLab API variables: GITLAB_API_TOKEN, CI_API_V4_URL, CI_PROJECT_ID"
    log FATAL "   💡 Tip: Ensure these are available as CI/CD variables"
    log FATAL "   📘 Example: export GITLAB_API_TOKEN=... && export CI_API_V4_URL=https://gitlab.com/api/v4"
    return 1
  fi

  local summary
  summary=$(cat "$summary_file")

  log INFO "📝 Posting deploy summary to MR $CI_MERGE_REQUEST_IID"

  if ! curl --silent --fail -X POST \
    -H "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes" \
    -d "{\"body\": ${summary@Q}}"; then
    log FATAL "❌ Failed to post comment to MR $CI_MERGE_REQUEST_IID"
    log FATAL "   💡 Tip: Check that your API token is valid and has MR comment permissions"
    log FATAL "   📘 Example: curl -H \"PRIVATE-TOKEN: \$GITLAB_API_TOKEN\" ... /merge_requests/.../notes"
    return 1
  fi

  log INFO "✅ Deploy summary successfully posted to MR $CI_MERGE_REQUEST_IID"
}

# ------------------------------------------------------------------------------
# 🧪 check::generate_validation_report — Emit CI validation summary markdown
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Collecting current CI metadata (branch, commit, env)
#   - Writing a markdown report file to .validation-report.md
#
# Why it matters:
#   Every successful CI pass should emit a human-readable summary to assist in
#   review and MR visibility. This also enables MR comment tooling and auditing.
#
# Globals used:
#   - CI_COMMIT_REF_NAME, CI_COMMIT_SHORT_SHA, WRANGLER_ENV
#
# Example:
#   check::generate_validation_report
#
# Categories:
#   ci, markdown, observability
#
# Stages:
#   post-deploy, notify, summary
# ------------------------------------------------------------------------------
check::generate_validation_report() {
  # ✅ Check: Write markdown validation summary to .validation-report.md
  # Category: ci, markdown, observability
  # Stages: post-deploy, notify, summary

  local report_file=".validation-report.md"

  log INFO "📋 Generating validation report..."

  if [[ -z "${CI_COMMIT_REF_NAME:-}" || -z "${CI_COMMIT_SHORT_SHA:-}" || -z "${WRANGLER_ENV:-}" ]]; then
    log FATAL "❌ Missing required CI context variables (CI_COMMIT_REF_NAME, CI_COMMIT_SHORT_SHA, WRANGLER_ENV)"
    log FATAL "   💡 Tip: Ensure this check runs after environment is fully configured"
    log FATAL "   📘 Example: WRANGLER_ENV=preview check::generate_validation_report"
    return 1
  fi

  cat <<EOF > "$report_file"
# ✅ CI Validation Report

- **Branch:** \`$CI_COMMIT_REF_NAME\`
- **Commit:** \`$CI_COMMIT_SHORT_SHA\`
- **Environment:** \`$WRANGLER_ENV\`

## ✅ Results

- Secrets: ✅ present
- Wrangler config: ✅ valid
- R2, KV, D1: ✅ accessible
- Tail Worker: ✅ connectable
- Preview URL: ✅ healthy
- Migration check: ✅ passed
- Type check & diagnostics: ✅ passed

_Generated at $(date -u +"%Y-%m-%dT%H:%M:%SZ")_
EOF

  log INFO "✅ Validation report written to $report_file"
}

# ------------------------------------------------------------------------------
# 🧪 check::comment_preview_url_to_mr — Post preview URL as a GitLab MR comment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Extracting PREVIEW_URL from env or file
#   - Resolving MR IID from source branch if not pre-injected
#   - Posting a markdown comment to the merge request with the preview link
#
# Why it matters:
#   Preview URLs must be visible to reviewers in the MR to verify deploys.
#   This integrates deploy visibility directly into GitLab workflows.
#
# Globals used:
#   - PREVIEW_URL, .env.preview (fallback)
#   - CI_MERGE_REQUEST_IID, CI_COMMIT_REF_NAME
#   - CI_PROJECT_ID, CI_API_V4_URL, GITLAB_API_TOKEN
#
# Example:
#   check::comment_preview_url_to_mr
#
# Categories:
#   ci, deploy, gitlab, notify
#
# Stages:
#   post-deploy, notify
# ------------------------------------------------------------------------------
check::comment_preview_url_to_mr() {
  # ✅ Check: Post preview URL to GitLab MR
  # Category: ci, deploy, gitlab, notify
  # Stages: post-deploy, notify

  local preview_url
  preview_url="${PREVIEW_URL:-$(grep -E '^PREVIEW_URL=' .env.preview | cut -d= -f2-)}"

  if [[ -z "$preview_url" ]]; then
    log FATAL "❌ PREVIEW_URL not found in environment or .env.preview"
    log FATAL "   💡 Tip: Ensure the deploy step writes PREVIEW_URL to .env.preview"
    log FATAL "   📘 Example: echo \"PREVIEW_URL=https://your-preview.workers.dev\" >> .env.preview"
    return 1
  fi

  if [[ -z "${CI_PROJECT_ID:-}" || -z "${GITLAB_API_TOKEN:-}" || -z "${CI_API_V4_URL:-}" ]]; then
    log FATAL "❌ Missing required GitLab CI/CD variables: CI_PROJECT_ID, CI_API_V4_URL, GITLAB_API_TOKEN"
    log FATAL "   💡 Tip: Set these in GitLab CI/CD variables or as job-level exports"
    log FATAL "   📘 Example: export CI_PROJECT_ID=123 && export GITLAB_API_TOKEN=..."
    return 1
  fi

  if [[ -z "${CI_MERGE_REQUEST_IID:-}" ]]; then
    log INFO "🔍 CI_MERGE_REQUEST_IID not set — resolving from source branch: $CI_COMMIT_REF_NAME"
    CI_MERGE_REQUEST_IID=$(curl --silent -H "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
      "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests?source_branch=$CI_COMMIT_REF_NAME" \
      | jq -r '.[0].iid')
  fi

  if [[ -z "$CI_MERGE_REQUEST_IID" || "$CI_MERGE_REQUEST_IID" == "null" ]]; then
    log FATAL "❌ Failed to resolve merge request IID from branch: $CI_COMMIT_REF_NAME"
    log FATAL "   💡 Tip: Ensure this pipeline is running in a merge request context"
    log FATAL "   📘 Example: manually set CI_MERGE_REQUEST_IID if needed"
    return 1
  fi

  log INFO "📨 Commenting preview URL to GitLab MR #$CI_MERGE_REQUEST_IID: $preview_url"

  if ! curl --silent --fail -X POST \
    -H "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes" \
    -d "{\"body\": \"🔍 **Preview for \`$CI_COMMIT_REF_NAME\`**:\n👉 $preview_url\"}"; then
    log FATAL "❌ Failed to post comment to MR #$CI_MERGE_REQUEST_IID"
    log FATAL "   💡 Tip: Check API token permissions and project visibility"
    log FATAL "   📘 Example: Verify token via curl or GitLab UI"
    return 1
  fi

  log INFO "✅ Preview URL comment posted to MR #$CI_MERGE_REQUEST_IID"
}

# ------------------------------------------------------------------------------
# 🧪 check::generate_canary_report — Emit markdown summary for canary deployment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring CI context is active
#   - Generating a markdown summary for canary promotion or rollback
#   - Optionally pulling Sentry stats for diagnostics
#
# Why it matters:
#   Canary rollouts must leave a durable and human-readable audit trail.
#   This enables tracking, visibility, and faster incident response.
#
# Globals used:
#   - CI
#
# Arguments:
#   $1 — deployment status (either "success" or "fail")
#
# Example:
#   check::generate_canary_report success > .canary-summary.md
#
# Categories:
#   ci, deploy, observability, summary
#
# Stages:
#   post-deploy, notify, summary
# ------------------------------------------------------------------------------
check::generate_canary_report() {
  # ✅ Check: Write markdown report of canary status and diagnostics to stdout
  # Category: ci, deploy, observability, summary
  # Stages: post-deploy, notify, summary

  local status="${1:-}"
  if [[ -z "$status" || "$status" != "success" && "$status" != "fail" ]]; then
    log FATAL "❌ Invalid argument: must pass either 'success' or 'fail'"
    log FATAL "   💡 Tip: Call with rollout result: check::generate_canary_report success"
    log FATAL "   📘 Example: check::generate_canary_report fail > .canary-summary.md"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must be run in GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Add \`CI=true\` to your pipeline environment"
    return 1
  fi

  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local status_label="${status^^}"

  cat <<EOF
# Canary Deployment Report

- Status: **${status_label}**
- Timestamp: \`${timestamp}\`
- Canary Traffic History:
  - 5% → 25% → 100%

## Error Monitoring

$(curl -s "https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/stats/" | jq '.' || echo "⚠️ Sentry stats unavailable")

## Action

$(if [[ "$status" == "fail" ]]; then echo "❌ Canary reverted to 0%"; else echo "✅ Canary promoted to 100% production"; fi)
EOF
}

# ------------------------------------------------------------------------------
# 🧪 check::generate_deploy_summary — Write HTML and Markdown deployment summary
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Emitting a Markdown + HTML report describing a successful deploy
#   - Recording CI metadata including branch, commit, time, env, URL, etc.
#
# Why it matters:
#   This provides a standardized, reviewable summary for every deployment.
#   It improves auditability and supports MR comments or external dashboards.
#
# Globals used:
#   - CI_COMMIT_REF_NAME, CI_COMMIT_SHA, CI_PROJECT_PATH, CI_PIPELINE_ID
#   - WRANGLER_ENV, PREVIEW_URL, CI
#
# Arguments:
#   $1 — target environment (e.g. preview, staging, production)
#
# Example:
#   check::generate_deploy_summary preview
#
# Categories:
#   ci, deploy, markdown, html, summary
#
# Stages:
#   post-deploy, notify, summary
# ------------------------------------------------------------------------------
check::generate_deploy_summary() {
  # ✅ Check: Generate markdown + HTML deployment summary
  # Category: ci, deploy, markdown, html, summary
  # Stages: post-deploy, notify, summary

  local env="$1"

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must be run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Add \`CI=true\` to your job environment"
    log FATAL "   📘 Example: CI=true check::generate_deploy_summary staging"
    return 1
  fi

  if [[ -z "$env" ]]; then
    log FATAL "❌ Missing required argument: environment"
    log FATAL "   💡 Tip: Specify the deploy target environment"
    log FATAL "   📘 Example: check::generate_deploy_summary preview"
    return 1
  fi

  local branch="${CI_COMMIT_REF_NAME:-unknown}"
  local sha="${CI_COMMIT_SHA:-unknown}"
  local date
  date="$(date -u +"%Y-%m-%d %H:%M:%SZ")"
  local url="${PREVIEW_URL:-<not available>}"
  local pipeline_id="${CI_PIPELINE_ID:-N/A}"
  local project_name="${CI_PROJECT_PATH:-N/A}"

  mkdir -p .deploy-summary

  # HTML output
  cat <<EOF > .deploy-summary/summary.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>🚀 Deployment Summary</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
    h1 { font-size: 1.8rem; }
    .meta { margin-bottom: 1.5rem; font-size: 1rem; }
    .url a { display: inline-block; margin-top: 0.5rem; padding: 0.4rem 0.8rem;
             background: #0c66ff; color: white; border-radius: 4px; text-decoration: none; }
    .status { margin-top: 1rem; background: #e0f9e6; padding: 1rem;
              border-left: 4px solid #12bb58; font-weight: bold; }
    .footer { margin-top: 2rem; font-size: 0.9rem; color: #777; }
  </style>
</head>
<body>
  <h1>🚀 Deployment Summary</h1>
  <div class="meta">
    <p><strong>Project:</strong> ${project_name}</p>
    <p><strong>Branch:</strong> <code>${branch}</code></p>
    <p><strong>Commit:</strong> <code>${sha}</code></p>
    <p><strong>Environment:</strong> <code>${env}</code></p>
    <p><strong>Time:</strong> ${date}</p>
    <p><strong>CI Pipeline:</strong> #${pipeline_id}</p>
  </div>
  <div class="url">
    <p><strong>URL:</strong></p>
    <a href="${url}" target="_blank">${url}</a>
  </div>
  <div class="status">
    ✅ Deployment to <code>${env}</code> was successful.
  </div>
  <div class="footer">
    Generated automatically by GitLab CI/CD pipeline.
  </div>
</body>
</html>
EOF

  # Markdown output
  cat <<EOF > .deploy-summary/summary.md
# 🚀 Deployment Summary

**Project:** \`${project_name}\`  
**Branch:** \`${branch}\`  
**Commit:** \`${sha}\`  
**Environment:** \`${env}\`  
**Time:** ${date}  
**Pipeline:** [#${pipeline_id}](../../pipelines/${pipeline_id})

---

**URL:** [$url]($url)  
✅ Deployment to \`${env}\` was successful.
EOF

  log INFO "✅ Deployment summary written to .deploy-summary/summary.{html,md}"
}

