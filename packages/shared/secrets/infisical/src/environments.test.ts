/**
 * Tests for environment detection and hierarchy utilities.
 *
 * @module
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { Result } from '@/schemas/result/result';
import type { StandardEnvironment } from '@/schemas/core-config/environment';
import type { Bool } from '@/schemas/common';

import {
  ENVIRONMENT_HIERARCHY,
  getEnvironmentFromBranch,
  getParentEnvironment,
  getChildEnvironments,
  canAccessEnvironment,
  detectEnvironment,
  validateEnvironment,
} from './environments';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ENVIRONMENT_HIERARCHY', () => {
  it('has three environments in order', () => {
    expect(ENVIRONMENT_HIERARCHY).toEqual(['production', 'staging', 'development']);
  });
});

describe('getEnvironmentFromBranch', () => {
  it('returns production for main', () => {
    const result: Result<StandardEnvironment> = getEnvironmentFromBranch('main');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('production');
    }
  });

  it('returns production for master', () => {
    const result: Result<StandardEnvironment> = getEnvironmentFromBranch('master');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('production');
    }
  });

  it('returns staging for staging', () => {
    const result: Result<StandardEnvironment> = getEnvironmentFromBranch('staging');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('staging');
    }
  });

  it('returns staging for release/* branches', () => {
    const result: Result<StandardEnvironment> = getEnvironmentFromBranch('release/v1.0');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('staging');
    }
  });

  it('returns development for feature/* branches', () => {
    const result: Result<StandardEnvironment> = getEnvironmentFromBranch('feature/my-feature');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('development');
    }
  });

  it('returns development for fix/* branches', () => {
    const result: Result<StandardEnvironment> = getEnvironmentFromBranch('fix/bug-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('development');
    }
  });

  it('defaults to development for unknown branches', () => {
    const result: Result<StandardEnvironment> = getEnvironmentFromBranch('unknown-branch');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('development');
    }
  });
});

describe('getParentEnvironment', () => {
  it('returns undefined for production (no parent)', () => {
    const result = getParentEnvironment('production');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });

  it('returns production for staging', () => {
    const result = getParentEnvironment('staging');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('production');
    }
  });

  it('returns staging for development', () => {
    const result = getParentEnvironment('development');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('staging');
    }
  });
});

describe('getChildEnvironments', () => {
  it('returns staging for production', () => {
    const result = getChildEnvironments('production');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(['staging']);
    }
  });

  it('returns development for staging', () => {
    const result = getChildEnvironments('staging');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(['development']);
    }
  });

  it('returns empty array for development (no children)', () => {
    const result = getChildEnvironments('development');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });
});

describe('canAccessEnvironment', () => {
  it('allows development to access staging secrets', () => {
    const result: Result<Bool> = canAccessEnvironment('development', 'staging');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('allows development to access production secrets', () => {
    const result: Result<Bool> = canAccessEnvironment('development', 'production');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('allows same environment access', () => {
    const result: Result<Bool> = canAccessEnvironment('staging', 'staging');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('denies production accessing development secrets', () => {
    const result: Result<Bool> = canAccessEnvironment('production', 'development');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });
});

describe('detectEnvironment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.INFISICAL_ENV;
    delete process.env.NODE_ENV;
    delete process.env.CI;
    delete process.env.GITHUB_REF_NAME;
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.CI_COMMIT_BRANCH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses INFISICAL_ENV when set to valid value', () => {
    process.env.INFISICAL_ENV = 'production';
    const result: Result<StandardEnvironment> = detectEnvironment();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('production');
    }
  });

  it('falls back to NODE_ENV', () => {
    process.env.NODE_ENV = 'staging';
    const result: Result<StandardEnvironment> = detectEnvironment();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('staging');
    }
  });

  it('defaults to development when no env vars set', () => {
    const result: Result<StandardEnvironment> = detectEnvironment();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('development');
    }
  });

  it('detects from CI branch', () => {
    process.env.CI = 'true';
    process.env.GITHUB_REF_NAME = 'main';
    const result: Result<StandardEnvironment> = detectEnvironment();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('production');
    }
  });

  it('defaults to staging in CI with no branch', () => {
    process.env.CI = 'true';
    const result: Result<StandardEnvironment> = detectEnvironment();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('staging');
    }
  });
});

describe('validateEnvironment', () => {
  it('validates a correct environment string', () => {
    const result: Result<StandardEnvironment> = validateEnvironment('staging');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('staging');
    }
  });

  it('returns error for invalid environment string', () => {
    const result: Result<StandardEnvironment> = validateEnvironment('invalid');

    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation error branches (non-string / invalid inputs)
// ---------------------------------------------------------------------------

describe('getEnvironmentFromBranch — validation errors', () => {
  it('returns error for non-string input', () => {
    const result = getEnvironmentFromBranch(42 as any);

    expect(result.ok).toBe(false);
  });

  it('returns development for chore/* branch', () => {
    const result = getEnvironmentFromBranch('chore/update-deps');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('development');
    }
  });

  it('returns staging for develop', () => {
    const result = getEnvironmentFromBranch('develop');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('staging');
    }
  });

  it('returns development for docs/* branch', () => {
    const result = getEnvironmentFromBranch('docs/readme-update');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('development');
    }
  });
});

describe('getParentEnvironment — validation errors', () => {
  it('returns error for invalid env', () => {
    const result = getParentEnvironment('invalid' as any);

    expect(result.ok).toBe(false);
  });
});

describe('getChildEnvironments — validation errors', () => {
  it('returns error for invalid env', () => {
    const result = getChildEnvironments('invalid' as any);

    expect(result.ok).toBe(false);
  });
});

describe('canAccessEnvironment — validation errors', () => {
  it('returns error for invalid first param', () => {
    const result: Result<Bool> = canAccessEnvironment('invalid' as any, 'production');

    expect(result.ok).toBe(false);
  });

  it('returns error for invalid second param', () => {
    const result: Result<Bool> = canAccessEnvironment('production', 'invalid' as any);

    expect(result.ok).toBe(false);
  });
});

describe('detectEnvironment — CI fallbacks', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.INFISICAL_ENV;
    delete process.env.NODE_ENV;
    delete process.env.CI;
    delete process.env.GITHUB_REF_NAME;
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.CI_COMMIT_BRANCH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses GITHUB_HEAD_REF fallback in CI', () => {
    process.env.CI = 'true';
    process.env.GITHUB_HEAD_REF = 'feature/test';
    const result: Result<StandardEnvironment> = detectEnvironment();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('development');
    }
  });

  it('uses CI_COMMIT_BRANCH fallback in CI', () => {
    process.env.CI = 'true';
    process.env.CI_COMMIT_BRANCH = 'staging';
    const result: Result<StandardEnvironment> = detectEnvironment();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('staging');
    }
  });
});
