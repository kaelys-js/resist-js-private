/**
 * WebForge Runtime — Dev Harness
 *
 * Visual test harness for verifying the runtime in a browser.
 * Creates a runtime, renders a 32x32 test tilemap, centers the camera,
 * and logs performance metrics periodically.
 *
 * Exposes `window.__WEBFORGE__` for browser console inspection.
 * Available commands in the browser console:
 *   - `__WEBFORGE__.scene` — Babylon.js Scene
 *   - `__WEBFORGE__.runtime` — RuntimeInstance
 *   - `__WEBFORGE__.tilemap` — RenderedTilemap
 *   - `__WEBFORGE__.BABYLON` — Babylon.js namespace
 *   - `__WEBFORGE__.setTime(hour)` — Jump day/night cycle to hour (0–24)
 *   - `__WEBFORGE__.getTime()` — Current day/night cycle time
 *   - `__WEBFORGE__.status()` — Full lighting/scene status dump
 */

import * as BABYLON from '@babylonjs/core';

import { createRuntime, disposeRuntime, startRenderLoop, getMetrics } from '../src/index';
import {
	renderTilemap,
	disposeTilemap,
	type RenderedTilemap,
} from '../src/rendering/tilemap-renderer';

import type { RuntimeInstance } from '../src/runtime';
import type { BabylonResult } from '../src/core/babylon-result';
import type { Num } from '@/schemas/common';

import { TEST_MAP_DATA } from './test-map';

// =============================================================================
// Debug API exposed on window.__WEBFORGE__
// =============================================================================

/** Debug API shape exposed on window for console inspection. */
type DevDebugApi = {
	readonly runtime: RuntimeInstance;
	readonly scene: BABYLON.Scene;
	readonly BABYLON: typeof BABYLON;
	tilemap: RenderedTilemap | null;
	setTime: (hour: number) => string;
	getTime: () => number | string;
	status: () => Record<string, unknown>;
};

/**
 * Creates the debug API object for window.__WEBFORGE__.
 *
 * @param runtime - The runtime instance.
 * @returns Debug API with helpers for console inspection.
 */
function createDebugApi(runtime: RuntimeInstance): DevDebugApi {
	return {
		runtime,
		scene: runtime.engine.scene,
		BABYLON,
		tilemap: null,
		setTime(hour: number): string {
			const lighting = this.tilemap?.lighting;
			if (!lighting?.dayNightCycle) return 'No day/night cycle active';
			lighting.dayNightCycle.timeOfDay = Math.max(0, Math.min(24, hour));
			return `Time set to ${lighting.dayNightCycle.timeOfDay.toFixed(2)}`;
		},
		getTime(): number | string {
			const lighting = this.tilemap?.lighting;
			if (!lighting?.dayNightCycle) return 'No day/night cycle active';
			return lighting.dayNightCycle.timeOfDay;
		},
		status(): Record<string, unknown> {
			// oxlint-disable-next-line prefer-destructuring
			const scene = runtime.engine.scene;
			const lighting = this.tilemap?.lighting;

			const lightDetails = lighting
				? lighting.lights.map((ml) => ({
						id: ml.config.id,
						type: ml.config.type,
						intensity: ml.light.intensity,
						enabled: ml.light.isEnabled(),
						hasShadow: ml.shadowGenerator !== null,
						hasFlicker: ml.flickerInstance !== null,
					}))
				: [];

			return {
				fps: scene.getEngine().getFps().toFixed(1),
				backend: runtime.engine.isWebGPU ? 'WebGPU' : 'WebGL2',
				activeMeshes: scene.getActiveMeshes().length,
				totalMeshes: scene.meshes.length,
				totalLights: scene.lights.length,
				effectLayers: scene.effectLayers?.length ?? 0,
				lights: lightDetails,
				glowLayer: lighting?.glowLayer !== null,
				dayNightCycle: lighting?.dayNightCycle !== null,
				timeOfDay: lighting?.dayNightCycle?.timeOfDay?.toFixed(2) ?? 'N/A',
				postProcessing: this.tilemap?.postProcessing !== null,
			};
		},
	};
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
	// eslint-disable-next-line no-console -- Dev harness diagnostic output
	console.log('[WebForge] Starting dev harness...');

	const result: BabylonResult<RuntimeInstance> = await createRuntime({
		engine: {
			canvasId: 'game-canvas',
			// Force WebGL2 — VolumetricLightScatteringPostProcess lacks WGSL shaders,
			// causing black screen on WebGPU. Use WebGL2 until Babylon.js adds WGSL support.
			renderer: 'webgl2',
		},
		camera: { mode: 'editor' },
		scene: {
			defaultLight: true,
			defaultLightIntensity: 0.8,
		},
		debug: true,
	});

	if (!result.ok) {
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.error('[WebForge] Failed to create runtime:', result.error);
		return;
	}

	const runtime: RuntimeInstance = result.data;
	const backend: string = runtime.engine.isWebGPU ? 'WebGPU' : 'WebGL2';
	// eslint-disable-next-line no-console -- Dev harness diagnostic output
	console.log(`[WebForge] Runtime created — backend: ${backend}`);

	// Expose debug API on window immediately
	const debug: DevDebugApi = createDebugApi(runtime);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness debug API
	(window as any).__WEBFORGE__ = debug;

	// Attach camera controls to the canvas
	const canvas: HTMLCanvasElement | null =
		document.querySelector<HTMLCanvasElement>('#game-canvas');
	if (canvas) {
		runtime.camera.attachControl(canvas, true);
	}

	// Render the test tilemap
	const mapResult: BabylonResult<RenderedTilemap> = renderTilemap({
		scene: runtime.engine.scene,
		mapDataInput: TEST_MAP_DATA,
		assetBasePath: '/',
	});

	let tilemap: RenderedTilemap | null = null;

	if (mapResult.ok) {
		tilemap = mapResult.data;
		debug.tilemap = tilemap;
		const chunkCount: Num = tilemap.chunks.length;
		const cliffCount: Num = tilemap.cliffChunks.length;
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.log(`[WebForge] Tilemap rendered — ${chunkCount} chunks, ${cliffCount} cliff chunks`);

		// Log lighting status
		if (tilemap.lighting) {
			const lightCount: number = tilemap.lighting.lights.length;
			const lightNames: string = tilemap.lighting.lights.map((ml) => ml.config.id).join(', ');
			const hasShadows: boolean = tilemap.lighting.lights.some((ml) => ml.shadowGenerator !== null);
			const hasFlicker: boolean = tilemap.lighting.lights.some((ml) => ml.flickerInstance !== null);
			const hasDayNight: boolean = tilemap.lighting.dayNightCycle !== null;
			const hasGlow: boolean = tilemap.lighting.glowLayer !== null;
			// eslint-disable-next-line no-console -- Dev harness diagnostic output
			console.log(
				`[WebForge] Lighting active — ${String(lightCount)} lights [${lightNames}], ` +
					`shadows: ${String(hasShadows)}, flicker: ${String(hasFlicker)}, ` +
					`dayNight: ${String(hasDayNight)}, glow: ${String(hasGlow)}`,
			);
		} else {
			// eslint-disable-next-line no-console -- Dev harness diagnostic output
			console.log('[WebForge] No lighting system configured');
		}

		// Center camera on the map (map is 32 tiles wide, 1 unit per tile)
		const mapCenterX: Num = 16;
		const mapCenterZ: Num = 16;
		runtime.camera.target = new BABYLON.Vector3(mapCenterX, 0, mapCenterZ);
	} else {
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.error('[WebForge] Failed to render tilemap:', mapResult.error);
	}

	// Start render loop
	const loopResult = startRenderLoop(runtime.engine);
	if (!loopResult.ok) {
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.error('[WebForge] Failed to start render loop:', loopResult.error);
		return;
	}
	// eslint-disable-next-line no-console -- Dev harness diagnostic output
	console.log('[WebForge] Render loop started');
	// eslint-disable-next-line no-console -- Dev harness diagnostic output
	console.log('[WebForge] Debug API: window.__WEBFORGE__ (try __WEBFORGE__.status())');

	// Log performance metrics every 120 frames
	let frameCount = 0;
	runtime.engine.scene.registerAfterRender(() => {
		frameCount++;
		if (frameCount % 120 === 0 && runtime.performanceMonitor) {
			const metrics = getMetrics(runtime.performanceMonitor);
			if (metrics.ok) {
				// eslint-disable-next-line no-console -- Dev harness diagnostic output
				console.log(
					`[WebForge] FPS: ${metrics.data.fps.toFixed(1)} | ` +
						`Frame: ${metrics.data.frameTimeMs.toFixed(2)}ms | ` +
						`Render: ${metrics.data.renderTimeMs.toFixed(2)}ms | ` +
						`Draw calls: ${metrics.data.drawCalls}`,
				);
			}
		}
	});

	// Dispose on page unload
	window.addEventListener('beforeunload', () => {
		if (tilemap) {
			disposeTilemap({ tilemap });
		}
		disposeRuntime(runtime);
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.log('[WebForge] Runtime disposed');
	});
}

await main();
