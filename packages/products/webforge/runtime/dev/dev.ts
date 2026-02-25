/**
 * WebForge Runtime — Dev Harness
 *
 * Visual test harness for verifying the runtime in a browser.
 * Creates a runtime with editor camera, adds a ground plane,
 * and logs performance metrics periodically.
 */

import * as BABYLON from '@babylonjs/core';

import { createRuntime, disposeRuntime, startRenderLoop, getMetrics } from '../src/index';

import type { RuntimeInstance } from '../src/runtime';
import type { BabylonResult } from '../src/core/babylon-result';

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

	// Add a ground plane so the scene is visible
	// eslint-disable-next-line new-cap -- Babylon.js static factory method
	const ground: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround(
		'ground',
		{ width: 50, height: 50, subdivisions: 10 },
		runtime.engine.scene,
	);

	// Simple grid material
	const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(
		'ground-material',
		runtime.engine.scene,
	);
	material.diffuseColor = new BABYLON.Color3(0.4, 0.5, 0.4);
	material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
	material.wireframe = true;
	ground.material = material;

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
		disposeRuntime(runtime);
		// eslint-disable-next-line no-console -- Dev harness diagnostic output
		console.log('[WebForge] Runtime disposed');
	});
}

await main();
