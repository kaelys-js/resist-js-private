/**
 * Result type for Babylon.js mutable objects.
 *
 * The standard `Result<T>` wraps data in `DeepReadonly<T>`, which makes
 * Babylon.js object methods uncallable (they require `this` mutability).
 * This module provides `BabylonResult<T>` which preserves mutability.
 *
 * `BabylonResult<T>` is assignable to `Result<T>`, so consumers who
 * don't need mutable access can use the standard Result type.
 *
 * @example
 * ```typescript
 * import { okShallow, type BabylonResult } from './babylon-result';
 *
 * function createCamera(scene: BABYLON.Scene): BabylonResult<BABYLON.Camera> {
 *   const camera = new BABYLON.ArcRotateCamera(...);
 *   return okShallow(camera);
 * }
 * ```
 *
 * @module
 */

import type { AppError } from '@/schemas/result/result';

/**
 * Result type for data containing Babylon.js objects.
 *
 * Unlike `Result<T>` which wraps data in `DeepReadonly<T>`,
 * this preserves the original mutability of `T`. Necessary because
 * Babylon.js objects have methods that modify internal state.
 *
 * At runtime, `okShallow` already skips deep-freezing. This type
 * ensures the type system matches that runtime behavior.
 */
export type BabylonResult<T> =
	| { readonly ok: true; readonly data: T; readonly error: null }
	| { readonly ok: false; readonly data: null; readonly error: AppError };

/**
 * Creates a shallow-frozen success result for Babylon.js objects.
 *
 * Freezes only the Result wrapper (ok/data/error references),
 * not the contained Babylon.js data.
 *
 * @param data - The success value (Babylon.js object, NOT deep-frozen).
 * @returns BabylonResult with mutable data access.
 */
export function okShallow<T>(data: T): BabylonResult<T> {
	return Object.freeze({
		ok: true as const,
		data,
		error: null,
	}) as BabylonResult<T>;
}
