/**
 * Fog manager — lifecycle control for the expanded fog system.
 *
 * Orchestrates three fog tiers:
 * 1. **Built-in scene fog** — mode, color, density, start, end.
 * 2. **Advanced fog PostProcess** — height fog, second layer, inscattering,
 *    atmospheric, noise, wind, animation (requires depth buffer).
 * 3. **Overlay fog PostProcess** — up to 4 scrolling texture layers with
 *    blend modes, tint, hue animation, and vignette masks.
 *
 * Returns a {@link FogHandle} that tracks all created resources and provides
 * a single `dispose()` for cleanup.
 *
 * @example
 * ```typescript
 * import { applyFog, updateFog, applyFogPreset, disposeFog } from './fog-manager';
 *
 * const result = applyFog(scene, camera, engine, config);
 * if (!result.ok) return result;
 *
 * // Update fog in real-time
 * updateFog(result.data, newConfig);
 *
 * // Apply a preset
 * applyFogPreset(result.data, 'morningFog');
 *
 * // Cleanup
 * disposeFog(result.data);
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Bool, Num } from '@/schemas/common';
import { ERRORS, err } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';
import type { FogConfig, FogMode } from '../schemas/fog-config';
import { FOG_PRESETS, type FogPresetName } from './fog-presets';
import { createAdvancedFogPostProcess, createOverlayFogPostProcess } from './fog-shader';
import { generateOverlayTexture, type TextureData } from './fog-overlay-textures';

// =============================================================================
// Fog Mode Mapping
// =============================================================================

/** Maps fog mode string to Babylon.js FOGMODE constant. */
const FOG_MODE_MAP: Readonly<Record<FogMode, number>> = {
	none: BABYLON.Scene.FOGMODE_NONE,
	linear: BABYLON.Scene.FOGMODE_LINEAR,
	exponential: BABYLON.Scene.FOGMODE_EXP,
	exponential2: BABYLON.Scene.FOGMODE_EXP2,
};

/** Maps fog mode string to shader int (0=none, 1=exp, 2=exp2, 3=linear). */
const FOG_SHADER_MODE_MAP: Readonly<Record<FogMode, number>> = {
	none: 0,
	exponential: 1,
	exponential2: 2,
	linear: 3,
};

/** Maps blend mode string to shader int. */
const BLEND_MODE_MAP: Readonly<Record<string, number>> = {
	normal: 0,
	additive: 1,
	multiply: 2,
	screen: 3,
};

/** Maps vignette type string to shader int. */
const VIGNETTE_MAP: Readonly<Record<string, number>> = {
	none: 0,
	radial: 1,
	border: 2,
	horizontal: 3,
	vertical: 4,
	upper: 5,
	lower: 6,
	left: 7,
	right: 8,
};

/** Maps waveform string to shader int. */
const WAVEFORM_MAP: Readonly<Record<string, number>> = {
	sine: 0,
	triangle: 1,
	sawtooth: 2,
};

// =============================================================================
// FogHandle Type
// =============================================================================

/**
 * Handle returned by {@link applyFog} for fog lifecycle management.
 *
 * Holds references to all created resources (PostProcesses, textures,
 * depth renderer, observers) and provides a single `dispose()` for cleanup.
 *
 * @example
 * ```typescript
 * const result = applyFog(scene, camera, engine, config);
 * if (!result.ok) return result;
 * const handle: FogHandle = result.data;
 * handle.dispose(); // cleanup all fog resources
 * ```
 */
export type FogHandle = {
	/** Dispose all fog resources (PostProcesses, textures, observers). */
	readonly dispose: () => void;
	/** The scene this fog handle belongs to. */
	readonly scene: BABYLON.Scene;
	/** The camera the PostProcesses are attached to. */
	readonly camera: BABYLON.Camera;
	/** The engine reference. */
	readonly engine: BABYLON.AbstractEngine;
	/** Current fog configuration (mutable for updates). */
	config: FogConfig;
	/** Advanced fog PostProcess (null if not needed). */
	advancedPP: BABYLON.PostProcess | null;
	/** Overlay fog PostProcess (null if not needed). */
	overlayPP: BABYLON.PostProcess | null;
	/** Generated overlay textures (disposed on cleanup). */
	overlayTextures: BABYLON.RawTexture[];
	/** Depth renderer (null if not needed). */
	depthRenderer: BABYLON.DepthRenderer | null;
	/** Before-render observer for time/animation uniforms. */
	observer: BABYLON.Observer<BABYLON.Scene> | null;
	/** Elapsed time accumulator for shader uniforms. */
	elapsedTime: Num;
};

// =============================================================================
// Advanced Feature Detection
// =============================================================================

/**
 * Determines whether the config requires the advanced fog PostProcess.
 *
 * @param config - Fog configuration to check.
 * @returns True if any advanced feature is enabled.
 */
function needsAdvancedFog(config: FogConfig): boolean {
	if (config.heightFog?.enabled) return true;
	if (config.secondLayer?.enabled) return true;
	if (config.inscattering?.enabled) return true;
	if (config.atmospheric?.enabled) return true;
	if (config.noise?.enabled) return true;
	if (config.wind?.enabled) return true;
	if (config.animation?.enabled) return true;
	// Enhanced core parameters that need the shader
	if (config.maxOpacity < 1) return true;
	if (config.startDistance > 0) return true;
	if (config.cutoffDistance > 0) return true;
	if (config.skyAffect > 0) return true;
	return false;
}

/**
 * Determines whether the config requires the overlay fog PostProcess.
 *
 * @param config - Fog configuration to check.
 * @returns True if any overlay layer is enabled.
 */
function needsOverlayFog(config: FogConfig): boolean {
	if (!config.overlays || config.overlays.length === 0) return false;
	return config.overlays.some((overlay) => overlay.enabled);
}

// =============================================================================
// Scene Fog Application
// =============================================================================

/**
 * Applies built-in scene fog properties from config.
 *
 * @param scene - Target Babylon.js scene.
 * @param config - Fog configuration.
 */
function applySceneFog(scene: BABYLON.Scene, config: FogConfig): void {
	const mode: Num = FOG_MODE_MAP[config.mode] ?? BABYLON.Scene.FOGMODE_NONE;
	scene.fogMode = mode;
	scene.fogColor = new BABYLON.Color3(config.color.r, config.color.g, config.color.b);
	scene.fogDensity = config.density;
	scene.fogStart = config.start;
	scene.fogEnd = config.end;
}

// =============================================================================
// Per-Mesh Exclusion
// =============================================================================

/**
 * Applies per-mesh fog exclusion settings.
 *
 * @param scene - Target Babylon.js scene.
 * @param config - Fog configuration with perMesh settings.
 */
function applyPerMeshExclusion(scene: BABYLON.Scene, config: FogConfig): void {
	if (!config.perMesh) return;

	for (const mesh of scene.meshes) {
		if (config.perMesh.excludeGround && mesh.name.toLowerCase().includes('ground')) {
			mesh.applyFog = false;
		}
		if (config.perMesh.excludeSprites && mesh.name.toLowerCase().includes('sprite')) {
			mesh.applyFog = false;
		}
	}
}

// =============================================================================
// Overlay Texture Generation
// =============================================================================

/**
 * Generates BABYLON.RawTexture from procedural texture data.
 *
 * @param scene - Target scene for texture registration.
 * @param textureName - Name of the procedural texture to generate.
 * @returns The created RawTexture, or null on failure.
 */
function createOverlayRawTexture(
	scene: BABYLON.Scene,
	textureName: string,
): BABYLON.RawTexture | null {
	const genResult: BabylonResult<TextureData> = generateOverlayTexture(
		textureName as Parameters<typeof generateOverlayTexture>[0],
		256,
	);
	if (!genResult.ok) return null;

	const texData: TextureData = genResult.data;
	const texture: BABYLON.RawTexture = new BABYLON.RawTexture(
		texData.data,
		texData.width,
		texData.height,
		BABYLON.Engine.TEXTUREFORMAT_RGBA,
		scene,
		false,
		false,
		BABYLON.Texture.BILINEAR_SAMPLINGMODE,
	);
	texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
	texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

	return texture;
}

// =============================================================================
// Advanced Fog Uniform Setup
// =============================================================================

/* eslint-disable max-lines-per-function */

/**
 * Sets up the `onApply` callback for the advanced fog PostProcess.
 *
 * @param pp - The advanced fog PostProcess.
 * @param handle - The fog handle with current config and state.
 * @param depthRenderer - The scene's depth renderer.
 */
function setupAdvancedFogOnApply(
	pp: BABYLON.PostProcess,
	handle: FogHandle,
	depthRenderer: BABYLON.DepthRenderer,
): void {
	// eslint-disable-next-line jsdoc/require-param -- callback param is self-documenting
	pp.onApply = (effect): void => {
		const { config, scene, camera: cam } = handle;

		// Depth sampler
		effect.setTexture('depthSampler', depthRenderer.getDepthMap());

		// Camera / scene
		const { position: camPos } = cam;
		effect.setFloat3('cameraPosition', camPos.x, camPos.y, camPos.z);
		effect.setFloat('cameraFar', cam.maxZ);
		effect.setFloat('cameraNear', cam.minZ);

		// Inverse matrices
		const projectionMatrix: BABYLON.Matrix = cam.getProjectionMatrix();
		const viewMatrix: BABYLON.Matrix = cam.getViewMatrix();
		const invProjection: BABYLON.Matrix = BABYLON.Matrix.Invert(projectionMatrix);
		const invView: BABYLON.Matrix = BABYLON.Matrix.Invert(viewMatrix);
		effect.setMatrix('invProjection', invProjection);
		effect.setMatrix('invView', invView);

		// Core fog
		effect.setColor3(
			'fogColor',
			new BABYLON.Color3(config.color.r, config.color.g, config.color.b),
		);
		effect.setFloat('fogDensity', config.density);
		effect.setInt('fogMode', FOG_SHADER_MODE_MAP[config.mode] ?? 0);
		effect.setFloat('fogStart', config.start);
		effect.setFloat('fogEnd', config.end);
		effect.setFloat('maxOpacity', config.maxOpacity);
		effect.setFloat('startDistance', config.startDistance);
		effect.setFloat('cutoffDistance', config.cutoffDistance);
		effect.setInt('excludeSkybox', config.excludeSkybox ? 1 : 0);
		effect.setFloat('skyAffect', config.skyAffect);

		// Height fog
		const hf = config.heightFog;
		effect.setInt('heightFogEnabled', hf?.enabled ? 1 : 0);
		effect.setFloat('heightFogBaseHeight', hf?.baseHeight ?? 0);
		effect.setFloat('heightFogFalloff', hf?.falloff ?? 0.5);
		effect.setFloat('heightFogDensity', hf?.density ?? 0.1);
		effect.setFloat('heightFogOffset', hf?.offset ?? 0);

		// Second layer
		const sl = config.secondLayer;
		effect.setInt('secondLayerEnabled', sl?.enabled ? 1 : 0);
		effect.setFloat('secondLayerDensity', sl?.density ?? 0.05);
		effect.setFloat('secondLayerHeightFalloff', sl?.heightFalloff ?? 0.2);
		effect.setFloat('secondLayerHeightOffset', sl?.heightOffset ?? 0);
		const slColor = sl?.color ?? { r: 0.7, g: 0.75, b: 0.8 };
		effect.setColor3('secondLayerColor', new BABYLON.Color3(slColor.r, slColor.g, slColor.b));

		// Inscattering
		const ins = config.inscattering;
		effect.setInt('inscatteringEnabled', ins?.enabled ? 1 : 0);
		const insColor = ins?.color ?? { r: 1, g: 0.9, b: 0.7 };
		effect.setColor3('inscatteringColor', new BABYLON.Color3(insColor.r, insColor.g, insColor.b));
		effect.setFloat('inscatteringExponent', ins?.exponent ?? 4);
		effect.setFloat('inscatteringStartDistance', ins?.startDistance ?? 50);
		effect.setFloat('inscatteringIntensity', ins?.intensity ?? 1);

		// Sun direction (from directional light if available, else default)
		let sunDir: BABYLON.Vector3 = new BABYLON.Vector3(0, -1, 1);
		for (const light of scene.lights) {
			if (light instanceof BABYLON.DirectionalLight) {
				sunDir = light.direction.normalize();
				break;
			}
		}
		effect.setFloat3('sunDirection', sunDir.x, sunDir.y, sunDir.z);

		// Atmospheric
		const atm = config.atmospheric;
		effect.setInt('atmosphericEnabled', atm?.enabled ? 1 : 0);
		effect.setFloat3(
			'extinction',
			atm?.extinctionR ?? 0.02,
			atm?.extinctionG ?? 0.03,
			atm?.extinctionB ?? 0.05,
		);
		effect.setFloat3(
			'inscatteringCoeffs',
			atm?.inscatteringR ?? 0.04,
			atm?.inscatteringG ?? 0.04,
			atm?.inscatteringB ?? 0.06,
		);

		// Noise
		const { noise } = config;
		effect.setInt('noiseEnabled', noise?.enabled ? 1 : 0);
		effect.setFloat('noiseScale', noise?.scale ?? 1);
		effect.setFloat('noiseAmplitude', noise?.amplitude ?? 0.5);
		effect.setFloat('noiseSpeed', noise?.speed ?? 0.1);
		effect.setInt('noiseOctaves', noise?.octaves ?? 3);
		effect.setFloat('noiseLacunarity', noise?.lacunarity ?? 2);
		effect.setFloat('noisePersistence', noise?.persistence ?? 0.5);

		// Wind
		const { wind } = config;
		effect.setInt('windEnabled', wind?.enabled ? 1 : 0);
		const windAngleRad: Num = ((wind?.directionAngle ?? 0) * Math.PI) / 180;
		effect.setFloat2('windDirection', Math.cos(windAngleRad), Math.sin(windAngleRad));
		effect.setFloat('windSpeed', wind?.speed ?? 0.5);
		effect.setFloat('windTurbulence', wind?.turbulence ?? 0.2);

		// Animation
		const anim = config.animation;
		effect.setInt('animationEnabled', anim?.enabled ? 1 : 0);
		effect.setFloat('animationSpeed', anim?.speed ?? 0.5);
		effect.setFloat('animationAmplitude', anim?.amplitude ?? 0.3);
		effect.setInt('animationWaveform', WAVEFORM_MAP[anim?.waveform ?? 'sine'] ?? 0);

		// Time
		effect.setFloat('time', handle.elapsedTime);
	};
}

// =============================================================================
// Overlay Fog Uniform Setup
// =============================================================================

/**
 * Sets up the `onApply` callback for the overlay fog PostProcess.
 *
 * @param pp - The overlay fog PostProcess.
 * @param handle - The fog handle with current config and state.
 */
function setupOverlayFogOnApply(pp: BABYLON.PostProcess, handle: FogHandle): void {
	// eslint-disable-next-line jsdoc/require-param -- callback param is self-documenting
	pp.onApply = (effect): void => {
		const { config } = handle;
		const overlays = config.overlays ?? [];
		const layerCount: Num = Math.min(overlays.length, 4);

		effect.setFloat('time', handle.elapsedTime);
		effect.setInt('layerCount', layerCount);

		// Per-layer arrays
		const enabled: Num[] = [0, 0, 0, 0];
		const opacity: Num[] = [0, 0, 0, 0];
		const blendMode: Num[] = [0, 0, 0, 0];
		const scrollX: Num[] = [0, 0, 0, 0];
		const scrollY: Num[] = [0, 0, 0, 0];
		const scale: Num[] = [1, 1, 1, 1];
		const tint: Num[] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; // 4 vec4s
		const hue: Num[] = [0, 0, 0, 0];
		const hueSpeed: Num[] = [0, 0, 0, 0];
		const vignette: Num[] = [0, 0, 0, 0];
		const vignetteIntensity: Num[] = [0, 0, 0, 0];

		for (let i: Num = 0; i < layerCount; i++) {
			const layer = overlays[i];
			if (!layer) continue;
			enabled[i] = layer.enabled ? 1 : 0;
			opacity[i] = layer.opacity;
			blendMode[i] = BLEND_MODE_MAP[layer.blendMode] ?? 0;
			scrollX[i] = layer.scrollX;
			scrollY[i] = layer.scrollY;
			scale[i] = layer.scale;
			// Tint is packed as vec4 array (4 components per layer)
			const base: Num = i * 4;
			tint[base] = layer.tint.r;
			tint[base + 1] = layer.tint.g;
			tint[base + 2] = layer.tint.b;
			tint[base + 3] = layer.tint.a;
			hue[i] = layer.hue;
			hueSpeed[i] = layer.hueSpeed;
			vignette[i] = VIGNETTE_MAP[layer.vignette] ?? 0;
			vignetteIntensity[i] = layer.vignetteIntensity;
		}

		effect.setIntArray('layerEnabled', new Int32Array(enabled));
		effect.setFloatArray('layerOpacity', opacity);
		effect.setIntArray('layerBlendMode', new Int32Array(blendMode));
		effect.setFloatArray('layerScrollX', scrollX);
		effect.setFloatArray('layerScrollY', scrollY);
		effect.setFloatArray('layerScale', scale);
		effect.setFloatArray4('layerTint', tint);
		effect.setFloatArray('layerHue', hue);
		effect.setFloatArray('layerHueSpeed', hueSpeed);
		effect.setIntArray('layerVignette', new Int32Array(vignette));
		effect.setFloatArray('layerVignetteIntensity', vignetteIntensity);

		// Bind overlay textures
		for (let i: Num = 0; i < 4; i++) {
			const tex: BABYLON.RawTexture | undefined = handle.overlayTextures[i];
			if (tex) {
				effect.setTexture(`overlayTex${i}`, tex);
			}
		}
	};
}

/* eslint-enable max-lines-per-function */

// =============================================================================
// Public API — applyFog
// =============================================================================

/**
 * Applies fog to a scene from a full {@link FogConfig}.
 *
 * Sets built-in scene fog properties and optionally creates advanced
 * and overlay fog PostProcesses if the config enables advanced features.
 *
 * @param scene - The Babylon.js scene to apply fog to.
 * @param camera - The camera to attach PostProcesses to.
 * @param engine - The Babylon.js engine.
 * @param config - Validated fog configuration.
 * @returns BabylonResult containing a {@link FogHandle} for lifecycle management.
 *
 * @example
 * ```typescript
 * const result = applyFog(scene, camera, engine, {
 *   mode: 'exponential',
 *   density: 0.02,
 *   heightFog: { enabled: true, baseHeight: 0, falloff: 0.5 },
 * });
 * if (!result.ok) return result;
 * // Fog is now active — call result.data.dispose() to cleanup
 * ```
 */
export function applyFog(
	scene: BABYLON.Scene,
	camera: BABYLON.Camera,
	engine: BABYLON.AbstractEngine,
	config: FogConfig,
): BabylonResult<FogHandle> {
	try {
		// Build the handle (mutable for update/dispose)
		const handle: FogHandle = {
			dispose: () => {
				/* replaced below */
			},
			scene,
			camera,
			engine,
			config,
			advancedPP: null,
			overlayPP: null,
			overlayTextures: [],
			depthRenderer: null,
			observer: null,
			elapsedTime: 0,
		};

		// Apply built-in scene fog
		applySceneFog(scene, config);

		// Per-mesh exclusion
		applyPerMeshExclusion(scene, config);

		// Advanced fog PostProcess
		if (needsAdvancedFog(config)) {
			// Enable depth renderer
			const depthRenderer: BABYLON.DepthRenderer = scene.enableDepthRenderer(camera);
			handle.depthRenderer = depthRenderer;

			const advResult = createAdvancedFogPostProcess({ camera, engine });
			if (!advResult.ok) {
				return err(ERRORS.SCENE.RENDER_FAILED, `Advanced fog PostProcess creation failed`);
			}
			handle.advancedPP = advResult.data;
			setupAdvancedFogOnApply(advResult.data, handle, depthRenderer);
		}

		// Overlay fog PostProcess
		if (needsOverlayFog(config)) {
			// Generate overlay textures
			const overlays = config.overlays ?? [];
			for (let i: Num = 0; i < Math.min(overlays.length, 4); i++) {
				const layer = overlays[i];
				if (!layer?.enabled) continue;
				const tex = createOverlayRawTexture(scene, layer.texture);
				if (tex) {
					handle.overlayTextures[i] = tex;
				}
			}

			const overlayResult = createOverlayFogPostProcess({ camera, engine });
			if (!overlayResult.ok) {
				return err(ERRORS.SCENE.RENDER_FAILED, `Overlay fog PostProcess creation failed`);
			}
			handle.overlayPP = overlayResult.data;
			setupOverlayFogOnApply(overlayResult.data, handle);
		}

		// Per-frame time accumulation
		let disposed = false;
		const observer = scene.onBeforeRenderObservable.add(() => {
			if (disposed) return;
			const dt: Num = engine.getDeltaTime() / 1000;
			handle.elapsedTime += dt;
		});
		handle.observer = observer;

		// Dispose function
		const disposeFn = (): void => {
			if (disposed) return;
			disposed = true;

			// Remove observer
			if (handle.observer) {
				scene.onBeforeRenderObservable.remove(handle.observer);
				handle.observer = null;
			}

			// Dispose PostProcesses
			if (handle.advancedPP) {
				handle.advancedPP.dispose();
				handle.advancedPP = null;
			}
			if (handle.overlayPP) {
				handle.overlayPP.dispose();
				handle.overlayPP = null;
			}

			// Dispose overlay textures
			for (const tex of handle.overlayTextures) {
				tex.dispose();
			}
			handle.overlayTextures = [];

			// Reset scene fog
			scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
		};

		// Replace placeholder dispose
		(handle as { dispose: () => void }).dispose = disposeFn;

		return okShallow(handle);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, {
			cause: fromUnknownError(error),
		});
	}
}

// =============================================================================
// Public API — updateFog
// =============================================================================

/**
 * Updates fog on an existing handle with a new configuration.
 *
 * Re-applies scene fog properties and updates the stored config
 * so that per-frame uniform updates use the new values.
 *
 * @param handle - The active fog handle from {@link applyFog}.
 * @param config - New fog configuration to apply.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * const updateResult = updateFog(handle, { ...config, density: 0.05 });
 * if (!updateResult.ok) return updateResult;
 * ```
 */
export function updateFog(handle: FogHandle, config: FogConfig): BabylonResult<Bool> {
	try {
		// Update stored config
		handle.config = config;

		// Re-apply scene fog
		applySceneFog(handle.scene, config);

		// Re-apply per-mesh exclusion
		applyPerMeshExclusion(handle.scene, config);

		return okShallow(true as Bool);
	} catch (error: unknown) {
		return err(ERRORS.SCENE.RENDER_FAILED, {
			cause: fromUnknownError(error),
		});
	}
}

// =============================================================================
// Public API — applyFogPreset
// =============================================================================

/**
 * Applies a named fog preset to an existing handle.
 *
 * Looks up the preset by name, then delegates to {@link updateFog}.
 *
 * @param handle - The active fog handle from {@link applyFog}.
 * @param presetName - Name of the preset to apply.
 * @returns BabylonResult indicating success.
 *
 * @example
 * ```typescript
 * const result = applyFogPreset(handle, 'morningFog');
 * if (!result.ok) return result;
 * ```
 */
export function applyFogPreset(handle: FogHandle, presetName: FogPresetName): BabylonResult<Bool> {
	const preset: FogConfig | undefined = FOG_PRESETS[presetName];
	if (!preset) {
		return err(ERRORS.VALIDATION.SCHEMA_FAILED, `Unknown fog preset: "${presetName}"`);
	}
	return updateFog(handle, preset);
}

// =============================================================================
// Public API — disposeFog
// =============================================================================

/**
 * Disposes all fog resources on a handle.
 *
 * Delegates to the handle's internal `dispose()`. Safe to call multiple times.
 *
 * @param handle - The active fog handle from {@link applyFog}.
 *
 * @example
 * ```typescript
 * disposeFog(handle); // cleans up PostProcesses, textures, observers
 * disposeFog(handle); // safe — no-op
 * ```
 */
export function disposeFog(handle: FogHandle): void {
	handle.dispose();
}
