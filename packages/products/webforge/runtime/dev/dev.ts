/**
 * WebForge Runtime — Dev Harness
 *
 * Visual test harness for verifying the runtime in a browser.
 * Creates a runtime, renders a 32x32 test tilemap, centers the camera,
 * and logs performance metrics periodically.
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

async function main(): Promise<void> {
	// eslint-disable-next-line no-console -- Dev harness diagnostic output
	console.log('[WebForge] Starting dev harness...');

	const result: BabylonResult<RuntimeInstance> = await createRuntime({
		engine: { canvasId: 'game-canvas' },
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
		const chunkCount: Num = tilemap.chunks.length;
		const cliffCount: Num = tilemap.cliffChunks.length;
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.log(`[WebForge] Tilemap rendered — ${chunkCount} chunks, ${cliffCount} cliff chunks`);

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
