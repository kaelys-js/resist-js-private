/**
 * Tests for AI agent detection.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { AgentInfo, EnvRecordWithUndefined } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { detectAgent } from './agent';

// ── Helpers ─────────────────────────────────────────────────────────────

const emptyEnv: EnvRecordWithUndefined = {};

// ── Explicit AI_AGENT override ──────────────────────────────────────────

describe('detectAgent — AI_AGENT override', () => {
  it('detects known agent via AI_AGENT env var', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({ AI_AGENT: 'claude' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Claude Code');
      expect(result.data!.id).toBe('claude');
    }
  });

  it('detects unknown but valid AgentKind via AI_AGENT', () => {
    // 'replit' is a known agent kind — use it via explicit override
    const result: Result<AgentInfo | undefined> = detectAgent({ AI_AGENT: 'replit' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe('replit');
    }
  });

  it('falls through to auto-detect when AI_AGENT is invalid', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({
      AI_AGENT: '!!!invalid!!!',
      CLAUDECODE: '1',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe('claude');
    }
  });

  it('ignores empty AI_AGENT string', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({
      AI_AGENT: '',
      CLAUDECODE: '1',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe('claude');
    }
  });
});

// ── Auto-detection — key presence ───────────────────────────────────────

describe('detectAgent — auto-detection by key presence', () => {
  it('detects Claude Code from CLAUDECODE env var', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({ CLAUDECODE: '1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.name).toBe('Claude Code');
      expect(result.data!.id).toBe('claude');
    }
  });

  it('detects Claude Code from CLAUDE_CODE env var', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({ CLAUDE_CODE: '1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('claude');
    }
  });

  it('detects Replit from REPL_ID env var', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({ REPL_ID: 'abc123' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.name).toBe('Replit');
      expect(result.data!.id).toBe('replit');
    }
  });

  it('detects Codex from CODEX_SANDBOX env var', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({ CODEX_SANDBOX: '1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('codex');
    }
  });

  it('detects Cursor from CURSOR_AGENT env var', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({ CURSOR_AGENT: '1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('cursor');
    }
  });
});

// ── Auto-detection — includes check ─────────────────────────────────────

describe('detectAgent — auto-detection by includes', () => {
  it('detects Pi from PATH containing .pi/agent', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({
      PATH: '/usr/bin:/home/user/.pi/agent/bin:/usr/local/bin',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.name).toBe('Pi');
      expect(result.data!.id).toBe('pi');
    }
  });

  it('detects Devin from EDITOR containing devin', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({ EDITOR: 'devin-editor' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.name).toBe('Devin');
      expect(result.data!.id).toBe('devin');
    }
  });
});

// ── No match ────────────────────────────────────────────────────────────

describe('detectAgent — no match', () => {
  it('returns undefined when no agent detected', () => {
    const result: Result<AgentInfo | undefined> = detectAgent(emptyEnv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });
});

// ── Priority ────────────────────────────────────────────────────────────

describe('detectAgent — priority', () => {
  it('standalone agents take priority over IDE agents', () => {
    const result: Result<AgentInfo | undefined> = detectAgent({
      CLAUDECODE: '1',
      CURSOR_AGENT: '1',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('claude');
    }
  });
});
