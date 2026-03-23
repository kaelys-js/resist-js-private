/**
 * Tests for editor devtools configuration.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { getDevtoolsConfig } from './devtools-config';

describe('getDevtoolsConfig', () => {
  it('returns config with correct appName and urlParamPrefix', () => {
    const config = getDevtoolsConfig();
    expect(config.appName).toBe('Storylyne');
    expect(config.urlParamPrefix).toBe('sto.');
  });

  it('isValidAppKey returns true for known app preference key', () => {
    const config = getDevtoolsConfig();
    expect(config.isValidAppKey('theme')).toBe(true);
  });

  it('isValidAppKey returns false for unknown key', () => {
    const config = getDevtoolsConfig();
    expect(config.isValidAppKey('nonexistent_key_xyz')).toBe(false);
  });

  it('isValidFeatureFlag returns true for known flag and false for unknown', () => {
    const config = getDevtoolsConfig();
    // At least one known flag should exist
    expect(config.isValidFeatureFlag('settings')).toBe(true);
    expect(config.isValidFeatureFlag('nonexistent_flag_xyz')).toBe(false);
  });
});
