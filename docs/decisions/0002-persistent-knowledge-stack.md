# ADR-0002: Persistent knowledge stack — Serena + CocoIndex + .claude/hooks

## Status

Accepted

## Context

The webforge monorepo has grown to 26 packages, ~150K LOC, 24 vitest projects, 632 lint rules, 115 external tool wrappers, and an 867-component UI library. A single AI-assisted session typically spans hours and crosses many files. Three failure modes recurred:

1. **Cold-start re-exploration** — every new session re-grepped/re-read the same files to figure out where things lived. Onboarding a fresh context to "where do we handle JWT refresh" took 5–15 minutes of grep loops.
2. **Agent handoff drift** — when a session compacted or resumed, prior architectural understanding evaporated. The next turn re-derived facts from scratch, often inconsistently.
3. **Behavioral drift** — soft instructions ("don't mock the database in tests", "use Result instead of throw", "register-aliases.mjs comes before cli.ts in the lint pipeline") were forgotten across sessions, even when the user had corrected the same mistake the day before.

The need was a **persistent, file-based knowledge layer** that survives session boundaries and is consulted automatically — not a CLAUDE.md augmentation, since CLAUDE.md is loaded into context once and treated as advisory.

## Decision

Adopt a three-layer persistent knowledge stack:

### Layer 1 — Serena memories (`.serena/memories/*.md`)

Per-area markdown files capturing point-in-time architecture observations: package overviews, schemas, file structures, integration points, conventions. Written by `mcp__serena__write_memory`, read by `mcp__serena__read_memory`. Each memory is a snapshot — the writer dates it and notes "verify before asserting". Conventions:

- **Naming** — `${group}-${pkg}-overview.md` (e.g. `shared-config-overview.md`, `utils-core-overview.md`) for package memories; flat names for cross-cutting subsystems (`hooks-system.md`, `observability.md`).
- **Frontmatter-free** — Serena handles indexing internally; the `.md` files are pure content.
- **Stale detection** — `session-start-orientation.sh` compares each memory file's `mtime` against the most recent commit touching its package and flags `[Stale memories detected]` so the next session knows to refresh before relying on them.
- **Coverage gap detection** — same hook flags `[Missing memory coverage]` when a package has no memory yet.

### Layer 2 — CocoIndex semantic search (`mcp__cocoindex_code__search`)

Vector-indexed code search. Replaces grep for fuzzy/semantic queries ("where do we handle JWT refresh", "files handling auth"). Complements Serena's symbol-precise search (`find_symbol`, `find_referencing_symbols`).

### Layer 3 — Code-navigation hooks (`.claude/hooks/redirect-*.sh`)

Mechanical enforcement that the model uses the persistent knowledge layer instead of falling back to grep/find. Implementation:

- **`redirect-grep.sh`** (PreToolUse on `Grep`) — denies grep on code files / code dirs / code-extension includes / code-pattern queries. Allows `*.md|json|yml|log|sh|css` only.
- **`redirect-glob.sh`** (PreToolUse on `Glob`) — denies `*.{ts,tsx,js,jsx,svelte}` patterns (allows `*.test.ts`).
- **`redirect-bash-search.sh`** (PreToolUse on `Bash`) — denies `grep|rg|ag|ack` and code-file `cat|head|tail|sed|awk` invocations via Bash, where the redirect-grep/glob/read hooks would otherwise be bypassed.
- **`redirect-read.sh`** (PreToolUse on `Read`) — once per session, when reading a code file in `packages/{group}/{pkg}/`, denies the FIRST read with a redirect message to `mcp__serena__read_memory("${group}-${pkg}-overview")`. Subsequent reads of the same file are allowed (tracked in `/tmp/claude-serena-reads`, cleared on session start).
- **`check-memory.sh`** (PreToolUse on `Edit|Write`) — non-blocking reminder echoing `[Memory available]` when an edit targets a package with an existing memory.
- **`post-edit-update-memory.sh`** (PostToolUse on `Edit|Write`) — non-blocking reminder echoing `[Memory may need update]` (memory exists) or `[No memory exists] — write '${pkg_key}-overview.md'` (no memory yet).
- **`session-start-orientation.sh`** (SessionStart on `startup|resume|compact|clear`) — lists every memory in the bootstrap message ("Available Serena memories: …"), counts ADRs, flags stale + missing-coverage memories.

### Layer 4 — ADRs (`docs/decisions/*.md`)

Architecture-level decisions that span multiple memories. Format follows MADR-style ADR-NNNN with Status / Context / Decision / Consequences. Numbered sequentially. Read at session start (count is announced in the orientation message).

## Consequences

### Positive

- **Faster cold starts** — first `mcp__serena__read_memory` returns a 500-line architecture overview in ~50ms instead of the 30+ tool calls a grep-based exploration would need. `session-start-orientation.sh` proactively announces what's available so Claude knows what's already documented.
- **Cross-session continuity** — facts learned in one session persist. Session 2 doesn't re-derive what Session 1 already documented.
- **Protected context window** — agents (or compactions) can refresh from memories instead of carrying full file contents. `redirect-read.sh` + `redirect-grep.sh` discourage the file-reading reflex; the model is forced to use the structured layer first.
- **Auto-detected staleness** — `session-start-orientation.sh` compares memory `mtime` against `git log -1 --format=%ct -- packages/$group/$pkg/`, so a package that's been modified since the memory was written is flagged immediately. The model can refresh before relying on stale info.
- **Mechanically enforced** — soft conventions ("check the memory first") become hard constraints (`exit 2` from a hook). The user doesn't have to repeat the rule each session.
- **Per-area granularity** — memories scope to packages (`shared-config-overview`) or cross-cutting subsystems (`hooks-system`, `observability`). Updating one doesn't invalidate others.
- **Symbol-precise + semantic complementarity** — Serena's `find_symbol` answers "where is `validateUser` defined", CocoIndex answers "where do we handle JWT refresh" — both better than grep for their respective query shapes.

### Negative

- **Memories drift** — point-in-time snapshots become stale as code evolves. Mitigation: `[Stale memories detected]` heuristic in session-start-orientation; convention to write "Captured YYYY-MM-DD" at the top of every memory; `post-edit-update-memory.sh` PostToolUse reminder to refresh after edits.
- **Maintenance burden** — every package eventually needs a memory; the missing-coverage list at session start is a recurring TODO. Mitigation: bootstrap onboarding sessions populate memories en masse for known packages; `post-edit-update-memory.sh` nudges incremental upkeep.
- **Memory-vs-source divergence** — a memory can confidently assert a function exists when it's been renamed/removed. Mitigation: CLAUDE.md "Before recommending from memory" section instructs the model to verify file paths/symbols before acting on them. Memories that assert specific identifiers carry a higher staleness risk than memories that describe patterns.
- **Hook friction** — `redirect-read.sh` blocking the first read of every code file is cognitively jarring. Mitigation: only fires once per file per session; subsequent reads pass through. The blocked-message is structured (lists the right tools) so the redirect is actionable.
- **Tool-availability assumption** — the MCP servers (`mcp__serena__*`, `mcp__cocoindex_code__*`) must be running. If a session starts without them, the redirect hooks deny grep/read but no Serena tool is available to fulfill the redirect. Mitigation: this is an acceptable failure mode (user is alerted; can disable hooks via env var or skip the affected operations).

### Neutral

- **CLAUDE.md remains the entry point** — "Code navigation — READ THIS FIRST" section in CLAUDE.md teaches the model the layer ordering: list memories → read relevant ones → use `find_symbol` for precise lookups → use `cocoindex_code__search` for fuzzy queries → fall back to grep/Read only for non-code files. The hooks enforce this order; CLAUDE.md explains it.
- **`.serena/` is committed to the repo** — memories are first-class documentation, not local-only state. `.serena/memories/` is committed; `.serena/.gitignore` excludes Serena's local index files.

## References

- **CLAUDE.md** "Code navigation — READ THIS FIRST" section (top of file).
- **`session-start-orientation.sh`** — emits the bootstrap message with memory list + stale/missing flags.
- **`hooks-system` memory** — full details of the redirect hooks.
- **`plans-system` memory** — companion enforcement layer for plan-bound work.
- **`docs/decisions/0001-template.md`** — ADR template (this file follows it).
