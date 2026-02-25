/**
 * Debug inspector toggle.
 *
 * Provides show/hide functions for the Babylon.js debug inspector.
 * The `@babylonjs/inspector` package is loaded lazily via dynamic import
 * so it gets tree-shaken in production builds.
 *
 * @example
 * ```typescript
 * import { showInspector, hideInspector } from './debug-inspector';
 *
 * // Show embedded inspector
 * await showInspector(scene, true);
 *
 * // Hide inspector
 * hideInspector(scene);
 * ```
 *
 * @module
 */

import type * as BABYLON from '@babylonjs/core';

import type { Bool } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

// =============================================================================
// Inspector API
// =============================================================================

/**
 * Shows the Babylon.js debug inspector.
 *
 * Dynamically imports `@babylonjs/inspector` on first call. The import
 * side-effects register the debug layer components. Subsequent calls
 * reuse the already-loaded module.
 *
 * @param scene - The Babylon.js scene to inspect.
 * @param embedMode - When true, embeds the inspector in the page instead of a popup.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * const result = await showInspector(scene, true);
 * if (!result.ok) return result;
 * ```
 */
export async function showInspector(
	scene: BABYLON.Scene,
	embedMode: boolean,
): Promise<Result<Bool>> {
	try {
		// Dynamic import — tree-shaken in production
		await import('@babylonjs/inspector');

		await scene.debugLayer.show({ embedMode });

		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}

/**
 * Hides the Babylon.js debug inspector.
 *
 * Safe to call even when the inspector is not visible.
 *
 * @param scene - The Babylon.js scene.
 * @returns Result indicating success.
 *
 * @example
 * ```typescript
 * hideInspector(scene);
 * ```
 */
export function hideInspector(scene: BABYLON.Scene): Result<Bool> {
	try {
		scene.debugLayer.hide();
		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.LOAD_FAILED, { cause: fromUnknownError(error) });
	}
}
