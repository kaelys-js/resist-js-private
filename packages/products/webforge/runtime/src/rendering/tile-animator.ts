/**
 * Tile animator — UV cycling for animated tileset materials.
 *
 * Manages frame-based UV offset animation for tileset materials
 * (e.g., water, lava, waterfalls). Each animated material cycles
 * through frames by shifting `texture.uOffset` at a configurable speed.
 *
 * @example
 * ```typescript
 * import { createTileAnimator, registerAnimatedMaterial, disposeTileAnimator } from './tile-animator';
 *
 * const animator = createTileAnimator({ scene });
 * if (animator.ok) {
 *   registerAnimatedMaterial({ animator: animator.data, material: mat, frameCount: 3, speed: 4 });
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// Schemas
// =============================================================================

/** A single animated tile entry tracked by the animation manager. */
export const AnimatedTileEntrySchema = v.strictObject({
	/** The material whose diffuseTexture.uOffset is cycled. */
	material: v.custom<BABYLON.StandardMaterial>(
		(val): val is BABYLON.StandardMaterial => val instanceof BABYLON.StandardMaterial,
	),
	/** Total number of animation frames. */
	frameCount: v.number(),
	/** UV width of one frame (1 / frameCount). */
	frameWidth: v.number(),
	/** Animation speed in frames per second. */
	speed: v.number(),
	/** Current frame index. */
	currentFrame: v.number(),
	/** Accumulated elapsed time in milliseconds. */
	elapsed: v.number(),
});

/** A single animated tile entry. */
export type AnimatedTileEntry = v.InferOutput<typeof AnimatedTileEntrySchema>;

/** The animation manager holding entries and a scene observer. */
export const TileAnimationManagerSchema = v.strictObject({
	/** Active animated tile entries. */
	entries: v.custom<AnimatedTileEntry[]>((val): val is AnimatedTileEntry[] => Array.isArray(val)),
	/** Scene beforeRender observer reference. */
	observer: v.custom<BABYLON.Observer<BABYLON.Scene>>(
		(val): val is BABYLON.Observer<BABYLON.Scene> => typeof val === 'object',
	),
	/** Scene reference for cleanup. */
	scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
});

/** The animation manager. */
export type TileAnimationManager = v.InferOutput<typeof TileAnimationManagerSchema>;

/** Options schema for {@link createTileAnimator}. */
export const CreateTileAnimatorOptionsSchema = v.pipe(
	v.strictObject({
		/** The Babylon.js scene to attach the animation loop to. */
		scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
	}),
	v.readonly(),
);

/** Options for {@link createTileAnimator}. */
export type CreateTileAnimatorOptions = v.InferOutput<typeof CreateTileAnimatorOptionsSchema>;

/** Options schema for {@link registerAnimatedMaterial}. */
export const RegisterAnimatedMaterialOptionsSchema = v.pipe(
	v.strictObject({
		/** The animation manager to register with. */
		animator: v.custom<TileAnimationManager>(
			(val): val is TileAnimationManager => typeof val === 'object',
		),
		/** Material with a diffuseTexture to animate. */
		material: v.custom<BABYLON.StandardMaterial>(
			(val): val is BABYLON.StandardMaterial => val instanceof BABYLON.StandardMaterial,
		),
		/** Number of animation frames in the tileset. */
		frameCount: v.number(),
		/** Animation speed in frames per second. */
		speed: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link registerAnimatedMaterial}. */
export type RegisterAnimatedMaterialOptions = v.InferOutput<
	typeof RegisterAnimatedMaterialOptionsSchema
>;

/** Options schema for {@link disposeTileAnimator}. */
export const DisposeTileAnimatorOptionsSchema = v.pipe(
	v.strictObject({
		/** The animation manager to dispose. */
		animator: v.custom<TileAnimationManager>(
			(val): val is TileAnimationManager => typeof val === 'object',
		),
	}),
	v.readonly(),
);

/** Options for {@link disposeTileAnimator}. */
export type DisposeTileAnimatorOptions = v.InferOutput<typeof DisposeTileAnimatorOptionsSchema>;

/** Options schema for {@link computeFrameIndex}. */
export const ComputeFrameIndexOptionsSchema = v.pipe(
	v.strictObject({
		/** Accumulated elapsed time in milliseconds. */
		elapsed: v.number(),
		/** Animation speed in frames per second. */
		speed: v.number(),
		/** Total number of animation frames. */
		frameCount: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link computeFrameIndex}. */
export type ComputeFrameIndexOptions = v.InferOutput<typeof ComputeFrameIndexOptionsSchema>;

/** Options schema for {@link advanceAnimations}. */
export const AdvanceAnimationsOptionsSchema = v.pipe(
	v.strictObject({
		/** The animation manager. */
		animator: v.custom<TileAnimationManager>(
			(val): val is TileAnimationManager => typeof val === 'object',
		),
		/** Delta time in milliseconds since last frame. */
		deltaTimeMs: v.number(),
	}),
	v.readonly(),
);

/** Options for {@link advanceAnimations}. */
export type AdvanceAnimationsOptions = v.InferOutput<typeof AdvanceAnimationsOptionsSchema>;

// =============================================================================
// computeFrameIndex
// =============================================================================

/**
 * Computes the current animation frame index from elapsed time.
 *
 * Pure function — no side effects. Frame index wraps around
 * when elapsed exceeds the total animation duration.
 *
 * @param options - Elapsed time, speed, and frame count
 * @returns Result containing the frame index (0-based)
 *
 * @example
 * ```typescript
 * const result = computeFrameIndex({ elapsed: 500, speed: 4, frameCount: 3 });
 * if (result.ok) result.data; // 2
 * ```
 */
export function computeFrameIndex(options: ComputeFrameIndexOptions): Result<Num> {
	const { elapsed, speed, frameCount } = options;

	if (frameCount <= 0) return okUnchecked(0 as Num);

	const frameDuration: Num = 1000 / speed;
	const rawFrame: Num = Math.floor(elapsed / frameDuration);
	const frame: Num = rawFrame % frameCount;

	return okUnchecked(frame as Num);
}

// =============================================================================
// advanceAnimations
// =============================================================================

/**
 * Advances all animated material entries by the given delta time.
 *
 * Updates elapsed time, computes new frame index, and sets
 * `material.diffuseTexture.uOffset` when the frame changes.
 *
 * @param options - Animator and delta time
 *
 * @example
 * ```typescript
 * advanceAnimations({ animator, deltaTimeMs: 16.67 });
 * ```
 */
export function advanceAnimations(options: AdvanceAnimationsOptions): void {
	const { animator, deltaTimeMs } = options;

	for (const entry of animator.entries) {
		entry.elapsed += deltaTimeMs;

		const frameResult: Result<Num> = computeFrameIndex({
			elapsed: entry.elapsed,
			speed: entry.speed,
			frameCount: entry.frameCount,
		});
		if (!frameResult.ok) continue;

		const newFrame: Num = frameResult.data;
		if (newFrame !== entry.currentFrame) {
			entry.currentFrame = newFrame;
			const texture: BABYLON.BaseTexture | null = entry.material.diffuseTexture;
			if (texture instanceof BABYLON.Texture) {
				texture.uOffset = newFrame * entry.frameWidth;
			}
		}
	}
}

// =============================================================================
// createTileAnimator
// =============================================================================

/**
 * Creates a tile animation manager attached to a scene.
 *
 * Registers a `beforeRender` observer that calls {@link advanceAnimations}
 * on every frame using `scene.deltaTime`.
 *
 * @param options - Scene to attach to
 * @returns BabylonResult containing the animation manager
 *
 * @example
 * ```typescript
 * const result = createTileAnimator({ scene });
 * if (result.ok) result.data.entries; // []
 * ```
 */
export function createTileAnimator(
	options: CreateTileAnimatorOptions,
): BabylonResult<TileAnimationManager> {
	const { scene } = options;

	try {
		const entries: AnimatedTileEntry[] = [];

		// oxlint-disable-next-line typescript/no-non-null-assertion -- Babylon's add() returns non-null for valid scene observables
		const observer: BABYLON.Observer<BABYLON.Scene> = scene.onBeforeRenderObservable.add(() => {
			const deltaMs: Num = scene.deltaTime ?? 16.67;
			advanceAnimations({ animator: manager, deltaTimeMs: deltaMs });
		})!;

		const manager: TileAnimationManager = {
			entries,
			observer,
			scene,
		};

		return okShallow(manager);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}

// =============================================================================
// registerAnimatedMaterial
// =============================================================================

/**
 * Registers a material for UV animation cycling.
 *
 * The material's `diffuseTexture.uOffset` will be updated each frame
 * to cycle through animation frames at the specified speed.
 *
 * @param options - Animator, material, frame count, and speed
 * @returns Result indicating success
 *
 * @example
 * ```typescript
 * registerAnimatedMaterial({ animator, material: mat, frameCount: 3, speed: 4 });
 * ```
 */
export function registerAnimatedMaterial(options: RegisterAnimatedMaterialOptions): Result<Bool> {
	const { animator, material, frameCount, speed } = options;

	const entry: AnimatedTileEntry = {
		material,
		frameCount,
		frameWidth: 1 / frameCount,
		speed,
		currentFrame: 0,
		elapsed: 0,
	};

	animator.entries.push(entry);

	return okUnchecked(true as Bool);
}

// =============================================================================
// disposeTileAnimator
// =============================================================================

/**
 * Disposes the tile animation manager.
 *
 * Removes the beforeRender observer and clears all entries.
 *
 * @param options - The animator to dispose
 * @returns Result indicating success
 *
 * @example
 * ```typescript
 * disposeTileAnimator({ animator });
 * ```
 */
export function disposeTileAnimator(options: DisposeTileAnimatorOptions): Result<Bool> {
	const { animator } = options;

	try {
		animator.scene.onBeforeRenderObservable.remove(animator.observer);
		animator.entries.length = 0;

		return okUnchecked(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, { cause: fromUnknownError(error) });
	}
}
