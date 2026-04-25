/**
 * Promisified `execFile` wrapper.
 *
 * Extracted into its own module so tests can mock a single async function
 * (`vi.mock('@/lint/framework/exec.ts')`) instead of dealing with node's
 * callback-style `execFile` and the `util.promisify.custom` symbol that
 * standard mocks drop.
 *
 * @module
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const execFileAsync = promisify(execFile);
