/**
 * Tool Dispatcher Entry Point
 *
 * Dynamically imports and runs a tool from the tools/ directory.
 * Usage: <pm> tool <name> [options]
 *
 * @module
 */

import { dispatchTool } from '@/cli/utils/core';

/** Module marker for top-level await support. */
export const MODULE = true;

await dispatchTool();
