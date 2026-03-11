/**
 * Mock data for development — simulates a logged-in user.
 *
 * These constants are used by `resolveAuth` in hooks.
 *
 * @module
 */

import type { ServerUser } from '../data/types';

/**
 * Mock user profile simulating a logged-in developer.
 *
 * @example
 * ```typescript
 * if (ownerId === MOCK_USER.id) { ... }
 * ```
 */
export const MOCK_USER: ServerUser = {
  id: 'user-mock-001',
  displayName: 'Test User',
  email: 'test-user@example.com',
  avatarUrl: '',
};
