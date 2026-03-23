/**
 * Tests for CI/hosting provider detection.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { ProviderInfo } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { detectProvider } from './provider';

// ── Basic detection ─────────────────────────────────────────────────────

describe('detectProvider — basic', () => {
  it('detects GitHub Actions from GITHUB_ACTIONS env var', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({ GITHUB_ACTIONS: 'true' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe('github_actions');
      expect(result.data!.name).toBe('GitHub Actions');
      expect(result.data!.isCI).toBe(true);
    }
  });

  it('detects GitLab CI from GITLAB_CI env var', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({ GITLAB_CI: 'true' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('gitlab');
      expect(result.data!.isCI).toBe(true);
    }
  });

  it('returns undefined when no provider matches', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeUndefined();
  });
});

// ── Multi-check providers ───────────────────────────────────────────────

describe('detectProvider — multi-check', () => {
  it('detects Jenkins when both JENKINS_URL and BUILD_ID are set', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({
      JENKINS_URL: 'http://jenkins.local',
      BUILD_ID: '42',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('jenkins');
    }
  });

  it('does not detect Jenkins with only JENKINS_URL (missing BUILD_ID)', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({
      JENKINS_URL: 'http://jenkins.local',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Should not match Jenkins — missing BUILD_ID
      expect(result.data?.id).not.toBe('jenkins');
    }
  });
});

// ── Value-match check ───────────────────────────────────────────────────

describe('detectProvider — value match', () => {
  it('detects Codeship via CI_NAME=codeship', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({ CI_NAME: 'codeship' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data!.id).toBe('codeship');
  });

  it('does not detect Codeship for wrong CI_NAME value', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({ CI_NAME: 'other' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.id).not.toBe('codeship');
    }
  });
});

// ── PR detection ────────────────────────────────────────────────────────

describe('detectProvider — PR detection', () => {
  it('detects PR via key presence (CircleCI)', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({
      CIRCLECI: 'true',
      CIRCLE_PULL_REQUEST: 'https://github.com/org/repo/pull/42',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('circleci');
      expect(result.data!.isPR).toBe(true);
    }
  });

  it('detects PR via matchValues (GitHub Actions pull_request event)', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_NAME: 'pull_request',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('github_actions');
      expect(result.data!.isPR).toBe(true);
    }
  });

  it('detects non-PR via excludeValues (Travis TRAVIS_PULL_REQUEST=false)', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({
      TRAVIS: 'true',
      TRAVIS_PULL_REQUEST: 'false',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('travis');
      expect(result.data!.isPR).toBe(false);
    }
  });

  it('isPR is false when PR key is missing', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({
      CIRCLECI: 'true',
      // CIRCLE_PULL_REQUEST not set
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('circleci');
      expect(result.data!.isPR).toBe(false);
    }
  });

  it('isPR is null when provider has no pr config', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({
      CODEBUILD_BUILD_ARN: 'arn:aws:codebuild:us-east-1:123:build/my-project',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('aws_codebuild');
      expect(result.data!.isPR).toBeNull();
    }
  });
});

// ── Cloud/hosting (non-CI) ──────────────────────────────────────────────

describe('detectProvider — cloud hosting', () => {
  it('detects AWS Lambda as non-CI provider', () => {
    const result: Result<ProviderInfo | undefined> = detectProvider({
      AWS_LAMBDA_FUNCTION_NAME: 'my-function',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data!.id).toBe('aws_lambda');
      expect(result.data!.isCI).toBe(false);
    }
  });
});
