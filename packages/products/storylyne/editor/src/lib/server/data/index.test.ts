/**
 * Tests for the data service factory.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { createDataService } from './index';

describe('createDataService', () => {
  it('returns a DataService with projects and scenes methods', () => {
    const service = createDataService();
    expect(service.projects).toBeDefined();
    expect(service.projects.getByOwner).toBeTypeOf('function');
    expect(service.scenes).toBeDefined();
    expect(service.scenes.getByProject).toBeTypeOf('function');
  });

  it('returns a working service with custom delayMs', async () => {
    const service = createDataService(undefined, 0);
    // Should resolve without error
    const result = await service.projects.getByOwner('user-1');
    expect(result.ok).toBe(true);
  });
});
