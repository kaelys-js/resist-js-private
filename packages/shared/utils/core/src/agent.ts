/**
 * AI Agent Detection
 *
 * Detects AI coding agents from environment variables.
 * Supports 11 known agents with explicit `AI_AGENT` env var override.
 *
 * Detection order: standalone agents first (claude, replit, gemini, codex,
 * opencode, pi, auggie, goose), IDE agents last (devin, cursor, kiro).
 * This ensures agents running inside IDEs are detected before the IDE itself.
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
  AgentInfoSchema,
  AgentKindSchema,
  type AgentDefinition,
  type AgentInfo,
  type AgentKind,
  type Bool,
  type EnvRecordWithUndefined,
  type ProviderEnvCheck,
  type Str,
} from '@/schemas/common';
import { ok, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Agent Definitions (11 entries)
// =============================================================================

/**
 * Known AI coding agent definitions.
 *
 * Ordered per std-env: standalone agents first, IDE agents last.
 * ANY check passing means the agent is detected (OR logic).
 *
 * Source: std-env v4.0.0-rc.1 (unjs)
 */
const AGENTS: readonly AgentDefinition[] = Object.freeze([
  // Standalone agents (checked first)
  { name: 'Claude Code', id: 'claude', checks: [{ key: 'CLAUDECODE' }, { key: 'CLAUDE_CODE' }] },
  { name: 'Replit', id: 'replit', checks: [{ key: 'REPL_ID' }] },
  { name: 'Gemini CLI', id: 'gemini', checks: [{ key: 'GEMINI_CLI' }] },
  { name: 'Codex', id: 'codex', checks: [{ key: 'CODEX_SANDBOX' }, { key: 'CODEX_THREAD_ID' }] },
  { name: 'OpenCode', id: 'opencode', checks: [{ key: 'OPENCODE' }] },
  { name: 'Pi', id: 'pi', checks: [{ key: 'PATH', includes: '.pi/agent' }] },
  { name: 'Augment', id: 'auggie', checks: [{ key: 'AUGMENT_AGENT' }] },
  { name: 'Goose', id: 'goose', checks: [{ key: 'GOOSE_PROVIDER' }] },
  // IDE agents (checked last — agents running inside these IDEs detected first)
  { name: 'Devin', id: 'devin', checks: [{ key: 'EDITOR', includes: 'devin' }] },
  { name: 'Cursor', id: 'cursor', checks: [{ key: 'CURSOR_AGENT' }] },
  { name: 'Kiro', id: 'kiro', checks: [{ key: 'TERM_PROGRAM', includes: 'kiro' }] },
]) as readonly AgentDefinition[];

// =============================================================================
// Detection
// =============================================================================

/**
 * Detects the current AI coding agent from environment variables.
 *
 * Checks for known agent-specific env vars. Respects explicit `AI_AGENT`
 * env var as manual override. IDE-based agents (devin, cursor, kiro)
 * are checked last so agents running inside them are detected first.
 *
 * @param {EnvRecordWithUndefined} env - Environment variable record (from `getEnvRecord()`).
 * @returns {Result<AgentInfo | undefined>} `Result<AgentInfo | undefined>` — detected agent, or `undefined` if none matched.
 *
 * @example
 * ```typescript
 * const envResult: Result<EnvRecordWithUndefined> = getEnvRecord();
 * if (!envResult.ok) return envResult;
 * const agentResult: Result<AgentInfo | undefined> = detectAgent(envResult.data);
 * if (!agentResult.ok) return agentResult;
 * if (agentResult.data) {
 *   agentResult.data.id; // e.g., 'claude'
 * }
 * ```
 */
export function detectAgent(env: EnvRecordWithUndefined): Result<AgentInfo | undefined> {
  // 1. Check explicit AI_AGENT env var override
  const explicit: Str | undefined = env.AI_AGENT;
  if (explicit !== undefined && explicit !== '') {
    // Try to match to known agent ID
    for (const agent of AGENTS) {
      if (agent.id === explicit) {
        return ok(AgentInfoSchema, { name: agent.name, id: agent.id });
      }
    }
    // Unknown agent — still report it if it parses as AgentKind
    const parseResult: Result<AgentKind> = safeParse(AgentKindSchema, explicit);
    if (parseResult.ok) {
      return ok(AgentInfoSchema, { name: explicit, id: parseResult.data });
    }
    // Not a known agent kind — skip explicit override, fall through to auto-detect
  }

  // 2. Auto-detect from env vars (ANY check passing = match)
  for (const agent of AGENTS) {
    const anyMatch: Bool = agent.checks.some((check: ProviderEnvCheck): Bool => {
      const val: Str | undefined = env[check.key];
      if (val === undefined) {
        return false;
      }
      if (check.value !== undefined) {
        return val === check.value;
      }
      if (check.includes !== undefined) {
        return val.includes(check.includes);
      }
      return true;
    });
    if (anyMatch) {
      return ok(AgentInfoSchema, { name: agent.name, id: agent.id });
    }
  }

  return okUnchecked<AgentInfo | undefined>(undefined);
}
