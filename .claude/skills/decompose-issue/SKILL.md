---
name: decompose-issue
description: Break a large issue into 3-7 well-scoped sub-issues. ONLY trigger when the issue body contains the literal token `[decompose]`. Never decompose autonomously without that opt-in marker. The parent issue is moved to `In Progress` after decomposition; status auto-rolls up from sub-issues.
---

# Decompose Issue

Opt-in fork mechanism: take a large parent issue and split it into independently executable sub-issues, each routed to an appropriate agent.

## When to apply

**ONLY when the parent issue body contains the literal token `[decompose]` somewhere.**

Do NOT decompose:
- Issues without `[decompose]` (even if they look large — user may want them to stay together)
- Sub-issues (don't recursively decompose; that fragments work too far)
- Issues already in `In Progress` (work has started; decomposition would duplicate)
- Issues with existing sub-issues (already decomposed)

## Steps

### 1. Read the parent

- Issue title + body in full
- All existing comments
- Any linked docs / ADRs / memory files referenced

### 2. Identify natural seams

Good seams (look for these):
- **Vertical slices** — independent user-visible features that can ship one at a time
- **Layers** — schema → service → handler → UI when each layer is independently testable
- **Test phases** — write tests first as one sub-issue, then implementation, then docs
- **Package boundaries** — work that touches @/foo can be a separate sub-issue from @/bar

Bad seams (avoid):
- Splitting "code" from "tests" (they should land together per package)
- Splitting purely by file count (fragments cohesive change)
- Splitting work that has tight inter-dependencies (creates serialization, not parallelism)

### 3. Draft sub-issue list

For each sub-issue:
- **Title** — clear, action-oriented (matches parent's domain language)
- **Scope** — 1 paragraph: what's in, what's NOT in
- **Suggested agent** — Opus 4.7 for design/architecture/ambiguous; Sonnet 4.6 for routine grinds
- **Estimated complexity** — small / medium / large

Hard cap: **7 sub-issues max**. If you can't fit it in 7, the original issue is too big and needs design work, not decomposition. Comment that on the parent and stop.

### 4. Post the decomposition plan as a comment on the parent

Before filing sub-issues, post a comment on the parent like:

```
## Decomposition plan

Splitting into N sub-issues:

1. **[Title]** — [scope summary] — Suggested agent: [Opus/Sonnet]
2. **[Title]** — ...
...

Filing sub-issues now.
```

This gives an audit trail even if the file API call fails.

### 5. File sub-issues via Multica API

Use the API token at `~/.multica/config.json` (path may vary; check `multica config get` first).

For each sub-issue:

```bash
multica issue create \
  --title "<sub-issue title>" \
  --body "<scope + 'Parent: #<parent-id>'>" \
  --assignee "<agent name>" \
  --parent <parent-uuid>
```

If the CLI flag isn't supported (check `multica issue create --help` first), fall back to the REST API:

```bash
curl -X POST "$MULTICA_API_BASE/api/workspaces/<ws>/issues" \
  -H "Authorization: Bearer $MULTICA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"...","body":"...","assignee_id":"<agent-uuid>","parent_issue_id":"<parent-uuid>"}'
```

### 6. Comment the resulting links

Once all sub-issues are filed, post a final comment on the parent:

```
## Sub-issues filed

- [#<sub1-id>] [Title] → [Agent]
- [#<sub2-id>] [Title] → [Agent]
...

Parent stays open; status will auto-roll up from sub-issues per Multica behavior.
```

### 7. Move parent status to `In Progress`

```bash
multica issue update <parent-uuid> --status in_progress
```

(Or the equivalent REST call.)

### 8. Stop

Do NOT start working on any of the sub-issues yourself in this run. They'll be picked up by the assigned agents independently. This task is decomposition only.

## Failure modes

- **Sub-issue creation fails partway through** — comment the partial state on the parent ("Filed N of M sub-issues; failed on Nth: <reason>"). Do NOT roll back the ones you filed.
- **API auth error** — report and stop. Do not attempt to reconfigure auth.
- **Parent already has sub-issues** — comment "Already decomposed; skipping." Stop.
- **Agent name doesn't resolve** — fall back to the parent's assignee for that sub-issue. Note the fallback in the sub-issue body.

## What NOT to do

- Do not decompose without the `[decompose]` opt-in marker
- Do not file >7 sub-issues
- Do not start working on sub-issues you just filed — separate runs
- Do not change parent's title or body
- Do not delete or close the parent
