/**
 * Playwright E2E test configuration for the Storylyne editor.
 *
 * Uses the shared preset from `@/config/test`. Override any defaults
 * by passing options to `createPlaywrightConfig()`.
 *
 * @module
 */

import { createPlaywrightConfig } from '@/config/test/presets/playwright';

export default createPlaywrightConfig();
