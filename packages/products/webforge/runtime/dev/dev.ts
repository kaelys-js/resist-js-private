/**
 * WebForge Runtime — Dev Harness
 *
 * Visual test harness for verifying the runtime in a browser.
 * Creates a runtime, renders a 32x32 test tilemap, centers the camera,
 * and provides a full control panel UI for every runtime feature.
 *
 * Also exposes `window.__WEBFORGE__` for browser console inspection.
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import {
	createRuntime,
	disposeRuntime,
	startRenderLoop,
	getMetrics,
	switchCameraPreset,
	rotateTactics,
	screenShake,
	screenTint,
	screenFlash,
	screenFadeIn,
	screenFadeOut,
	setLayerVisibility,
	setLayerOpacity,
} from '../src/index';
import {
	renderTilemap,
	disposeTilemap,
	type RenderedTilemap,
} from '../src/rendering/tilemap-renderer';

import type { RuntimeInstance } from '../src/runtime';
import type { BabylonResult } from '../src/core/babylon-result';
import type { Num, Bool } from '@/schemas/common';

import { TEST_MAP_DATA } from './test-map';

// =============================================================================
// Types
// =============================================================================

/** Debug API shape exposed on window for console inspection. */
type DevDebugApi = {
	readonly runtime: RuntimeInstance;
	readonly scene: BABYLON.Scene;
	readonly BABYLON: typeof BABYLON;
	tilemap: RenderedTilemap | null;
	setTime: (hour: number) => string;
	getTime: () => number | string;
	switchPreset: (preset: string, durationMs?: number) => string;
	status: () => Record<string, unknown>;
};

/** Color preset for screen effects. */
type EffectColor = { r: number; g: number; b: number; a: number };

// =============================================================================
// State
// =============================================================================

let _currentPreset = 'free';
let selectedEffectColor = 'white';
let _firstPersonCam: BABYLON.UniversalCamera | null = null;
let _isFirstPerson = false;
let _lastFadeOutHandle: { dispose: () => void } | null = null;

const EFFECT_COLORS: Record<string, EffectColor> = {
	white: { r: 1, g: 1, b: 1, a: 1 },
	black: { r: 0, g: 0, b: 0, a: 1 },
	red: { r: 1, g: 0, b: 0, a: 0.5 },
	green: { r: 0, g: 1, b: 0, a: 0.5 },
	blue: { r: 0, g: 0, b: 1, a: 0.5 },
	yellow: { r: 1, g: 1, b: 0, a: 0.5 },
};

// =============================================================================
// Debug API
// =============================================================================

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
		switchPreset(preset: string, durationMs = 500): string {
			const { camera: cam } = runtime;
			if (!(cam instanceof BABYLON.ArcRotateCamera)) return 'Camera is not ArcRotateCamera';
			const presetResult = switchCameraPreset({
				scene: runtime.engine.scene,
				camera: cam,
				targetPreset: preset as 'hd2d' | 'topdown' | 'sideview' | 'cinematic' | 'free',
				durationMs,
				easing: 'easeInOutCubic',
			});
			if (!presetResult.ok) return `Error: ${presetResult.error.message}`;
			return `Switching to ${preset} over ${String(durationMs)}ms`;
		},
		status(): Record<string, unknown> {
			const { scene } = runtime.engine;
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
// UI Wiring — called from HTML onclick handlers via window globals
// =============================================================================

/**
 * Wires all UI controls to the runtime/tilemap.
 *
 * @param runtime - The runtime instance.
 * @param debug - The debug API.
 */
function wireUI(runtime: RuntimeInstance, debug: DevDebugApi): void {
	const { scene }: { scene: BABYLON.Scene } = runtime.engine;

	// ── Panel toggle ────────────────────────────────────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).togglePanel = (): void => {
		const panel = document.querySelector('#control-panel');
		const icon = document.querySelector('#panel-toggle-icon');
		if (panel && icon) {
			panel.classList.toggle('collapsed');
			icon.textContent = panel.classList.contains('collapsed') ? '[ + ]' : '[ - ]';
		}
	};

	// ── Section toggle ──────────────────────────────────────────────
	/** @param id - DOM id of the section to toggle. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).toggleSection = (id: string): void => {
		const section = document.querySelector(`#${id}`);
		if (!section) return;
		section.classList.toggle('collapsed');
		const toggle = section.querySelector('.section-header .panel-toggle');
		if (toggle) toggle.textContent = section.classList.contains('collapsed') ? '+' : '-';
	};

	// ── Camera Presets (dropdown) ───────────────────────────────────
	/**
	 * Handles a camera preset change from the dropdown.
	 *
	 * @param preset - The selected preset name.
	 */
	function handlePresetChange(preset: string): void {
		const canvas = scene.getEngine().getRenderingCanvas();

		// Switching away from firstperson — restore ArcRotateCamera
		if (_isFirstPerson && _firstPersonCam && preset !== 'firstperson') {
			_firstPersonCam.detachControl();

			// Detach pipelines from the FP camera before disposing
			const ppm = scene.postProcessRenderPipelineManager;
			for (const pl of ppm.supportedPipelines) {
				ppm.detachCamerasFromRenderPipeline(pl.name, _firstPersonCam);
			}

			_firstPersonCam.dispose();
			_firstPersonCam = null;
			_isFirstPerson = false;

			const arcCam = runtime.camera as BABYLON.ArcRotateCamera;
			scene.activeCamera = arcCam;
			if (canvas) arcCam.attachControl(canvas, true);

			// Re-attach pipelines to the ArcRotateCamera
			for (const pl of ppm.supportedPipelines) {
				ppm.attachCamerasToRenderPipeline(pl.name, arcCam);
			}
		}

		// Switching to firstperson — create UniversalCamera
		if (preset === 'firstperson') {
			const arcCam = runtime.camera as BABYLON.ArcRotateCamera;
			const pos = arcCam.position.clone();

			const fpCam = new BABYLON.UniversalCamera('camera-firstperson', pos, scene);
			fpCam.setTarget(arcCam.target.clone());
			fpCam.keysUp = [87]; // W
			fpCam.keysDown = [83]; // S
			fpCam.keysLeft = [65]; // A
			fpCam.keysRight = [68]; // D
			fpCam.fov = 1.2;
			fpCam.speed = 0.5;
			fpCam.minZ = 0.1;

			arcCam.detachControl();
			scene.activeCamera = fpCam;
			if (canvas) fpCam.attachControl(canvas, true);

			const ppm = scene.postProcessRenderPipelineManager;
			for (const name of ppm.supportedPipelines.map((p) => p.name)) {
				ppm.attachCamerasToRenderPipeline(name, fpCam);
			}

			_firstPersonCam = fpCam;
			_isFirstPerson = true;
			_currentPreset = preset;
			return;
		}

		const durationSlider = document.querySelector('#transition-duration') as HTMLInputElement;
		const durationMs = Number(durationSlider?.value ?? 500);
		debug.switchPreset(preset, durationMs);
		_currentPreset = preset;
	}

	const presetContainer = document.querySelector('#camera-preset-dropdown');
	if (presetContainer) {
		presetContainer.append(
			createDropdown(
				'Preset',
				['free', 'hd2d', 'topdown', 'sideview', 'cinematic', 'firstperson'],
				'free',
				(value) => {
					handlePresetChange(value);
				},
				'preset',
			),
		);
	}

	// Transition duration slider
	const transSlider = document.querySelector('#transition-duration') as HTMLInputElement;
	const transValue = document.querySelector('#transition-value');
	transSlider?.addEventListener('input', () => {
		if (transValue) transValue.textContent = `${transSlider.value}ms`;
	});

	// ── Tactics Rotation ────────────────────────────────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).rotateCW = (): void => {
		const { camera: cam } = runtime;
		if (cam instanceof BABYLON.ArcRotateCamera) {
			rotateTactics({ camera: cam, direction: 'cw' as const, durationMs: 300 });
		}
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).rotateCCW = (): void => {
		const { camera: cam } = runtime;
		if (cam instanceof BABYLON.ArcRotateCamera) {
			rotateTactics({ camera: cam, direction: 'ccw' as const, durationMs: 300 });
		}
	};

	// ── Screen Shake ────────────────────────────────────────────────
	const shakeIntSlider = document.querySelector('#shake-intensity') as HTMLInputElement;
	const shakeIntValue = document.querySelector('#shake-intensity-value');
	shakeIntSlider?.addEventListener('input', () => {
		if (shakeIntValue) shakeIntValue.textContent = shakeIntSlider.value;
	});

	const shakeDurSlider = document.querySelector('#shake-duration') as HTMLInputElement;
	const shakeDurValue = document.querySelector('#shake-duration-value');
	shakeDurSlider?.addEventListener('input', () => {
		if (shakeDurValue) shakeDurValue.textContent = `${shakeDurSlider.value}ms`;
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).triggerShake = (): void => {
		const intensity = Number(shakeIntSlider?.value ?? 0.5);
		const durationMs = Number(shakeDurSlider?.value ?? 300);
		screenShake({ scene, camera: runtime.camera, intensity, durationMs, decay: true });
	};

	// ── Day/Night Cycle ─────────────────────────────────────────────
	const timeSlider = document.querySelector('#time-slider') as HTMLInputElement;
	const timeValue = document.querySelector('#time-value');
	const speedSlider = document.querySelector('#speed-slider') as HTMLInputElement;
	const speedValue = document.querySelector('#speed-value');

	timeSlider?.addEventListener('input', () => {
		const hour = Number(timeSlider.value);
		debug.setTime(hour);
		updateTimeDisplay(hour);
	});

	let _lastDayNightSpeed = 1.0;
	const pauseBtn = document.querySelector('#daynight-pause-btn') as HTMLButtonElement | null;

	speedSlider?.addEventListener('input', () => {
		const speed = Number(speedSlider.value);
		const cycle = debug.tilemap?.lighting?.dayNightCycle;
		if (cycle) cycle.speed = speed;
		if (speed > 0) _lastDayNightSpeed = speed;
		if (speedValue) speedValue.textContent = speed === 0 ? '0x' : `${speed}x`;
		if (pauseBtn) pauseBtn.textContent = speed > 0 ? 'Pause' : 'Play';
	});

	// Day/Night preset dropdown
	const dayNightDropdownContainer = document.querySelector('#daynight-preset-dropdown');
	const timePresetMap: Record<string, number> = { dawn: 6, noon: 12, dusk: 18, night: 0 };
	if (dayNightDropdownContainer) {
		dayNightDropdownContainer.append(
			createDropdown(
				'Preset',
				['dawn', 'noon', 'dusk', 'night'],
				'noon',
				(val) => {
					const hour = timePresetMap[val] ?? 12;
					debug.setTime(hour);
					if (timeSlider) timeSlider.value = String(hour);
					updateTimeDisplay(hour);
				},
				'daynight-preset',
			),
		);
	}

	// Pause/Play toggle
	pauseBtn?.addEventListener('click', () => {
		const cycle = debug.tilemap?.lighting?.dayNightCycle;
		if (!cycle) return;
		if (cycle.speed > 0) {
			_lastDayNightSpeed = cycle.speed;
			cycle.speed = 0;
			if (speedSlider) speedSlider.value = '0';
			if (speedValue) speedValue.textContent = '0x';
			pauseBtn.textContent = 'Play';
		} else {
			cycle.speed = _lastDayNightSpeed;
			if (speedSlider) speedSlider.value = String(_lastDayNightSpeed);
			if (speedValue) speedValue.textContent = `${_lastDayNightSpeed}x`;
			pauseBtn.textContent = 'Pause';
		}
	});

	/**
	 * Updates the time display label.
	 *
	 * @param hour - Current hour (0-24).
	 */
	function updateTimeDisplay(hour: number): void {
		if (!timeValue) return;
		const h = Math.floor(hour);
		const m = Math.floor((hour % 1) * 60);
		timeValue.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	// Sync time slider with cycle in real-time
	scene.registerAfterRender(() => {
		const cycle = debug.tilemap?.lighting?.dayNightCycle;
		if (!cycle) return;
		const t: number = cycle.timeOfDay;
		if (timeSlider && document.activeElement !== timeSlider) {
			timeSlider.value = String(t);
			updateTimeDisplay(t);
		}
	});

	// ── Screen Effects ──────────────────────────────────────────────
	const effectDurSlider = document.querySelector('#effect-duration') as HTMLInputElement;
	const effectDurValue = document.querySelector('#effect-duration-value');
	effectDurSlider?.addEventListener('input', () => {
		if (effectDurValue) effectDurValue.textContent = `${effectDurSlider.value}ms`;
	});

	// Effect color buttons
	const colorButtons = document.querySelectorAll<HTMLButtonElement>('[data-effect-color]');

	/**
	 * Handles an effect color button click.
	 *
	 * @param btn - The clicked button.
	 * @param allButtons - All color buttons for active state management.
	 */
	function handleColorClick(
		btn: HTMLButtonElement,
		allButtons: NodeListOf<HTMLButtonElement>,
	): void {
		selectedEffectColor = btn.dataset['effectColor'] ?? 'white';
		for (const b of allButtons) b.classList.remove('active');
		btn.classList.add('active');
	}

	for (const btn of colorButtons) {
		btn.addEventListener('click', () => handleColorClick(btn, colorButtons));
	}

	// Custom color picker support
	const customColorInput = document.querySelector('#effect-custom-color') as HTMLInputElement;
	customColorInput?.addEventListener('input', () => {
		selectedEffectColor = 'custom';
		// Deselect preset buttons
		for (const btn of colorButtons) btn.classList.remove('active');
	});

	// ── Screen Effects (dropdown + trigger) ────────────────────────
	let _selectedEffectType = 'flash';
	const effectDropdownContainer = document.querySelector('#effect-type-dropdown');
	if (effectDropdownContainer) {
		effectDropdownContainer.append(
			createDropdown(
				'Effect',
				['flash', 'tint', 'fadeOut', 'fadeIn'],
				'flash',
				(val) => {
					_selectedEffectType = val;
				},
				'effect-type',
			),
		);
	}

	/**
	 * Triggers the currently selected screen effect.
	 *
	 * @param type - Effect type: 'flash' | 'tint' | 'fadeOut' | 'fadeIn'.
	 */
	function triggerEffect(type: string): void {
		const durationMs = Number(effectDurSlider?.value ?? 500);
		let color: EffectColor;
		if (selectedEffectColor === 'custom' && customColorInput) {
			const hex = customColorInput.value;
			color = {
				r: Number.parseInt(hex.slice(1, 3), 16) / 255,
				g: Number.parseInt(hex.slice(3, 5), 16) / 255,
				b: Number.parseInt(hex.slice(5, 7), 16) / 255,
				a: 0.7,
			};
		} else {
			color = EFFECT_COLORS[selectedEffectColor] ?? { r: 1, g: 1, b: 1, a: 1 };
		}
		const opts = { scene, color, durationMs };

		switch (type) {
			case 'flash': {
				screenFlash(opts);
				break;
			}
			case 'tint': {
				screenTint(opts);
				break;
			}
			case 'fadeOut': {
				if (_lastFadeOutHandle) {
					_lastFadeOutHandle.dispose();
					_lastFadeOutHandle = null;
				}
				const fadeOutResult: BabylonResult<{ dispose: () => void }> = screenFadeOut(opts);
				if (fadeOutResult.ok) _lastFadeOutHandle = fadeOutResult.data;
				break;
			}
			case 'fadeIn': {
				if (_lastFadeOutHandle) {
					_lastFadeOutHandle.dispose();
					_lastFadeOutHandle = null;
				}
				screenFadeIn(opts);
				break;
			}
		}
	}

	const effectTriggerBtn = document.querySelector('#effect-trigger-btn');
	effectTriggerBtn?.addEventListener('click', () => {
		triggerEffect(_selectedEffectType);
	});

	// ── Rendering Toggles ───────────────────────────────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).togglePostProcess = (): void => {
		const el = document.querySelector('#toggle-postprocess');
		const pp = debug.tilemap?.postProcessing;
		if (!pp || !el) return;
		const { pipeline } = pp;
		if (pipeline) {
			const isOn = el.classList.contains('on');
			// Toggle all individual effects on the DefaultRenderingPipeline
			pipeline.bloomEnabled = !isOn;
			pipeline.depthOfFieldEnabled = !isOn;
			pipeline.fxaaEnabled = !isOn;
			pipeline.grainEnabled = !isOn;
			pipeline.imageProcessingEnabled = !isOn;
			pipeline.sharpenEnabled = !isOn;
			pipeline.chromaticAberrationEnabled = !isOn;
			el.classList.toggle('on', !isOn);
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).toggleGlow = (): void => {
		const el = document.querySelector('#toggle-glow');
		const glow = debug.tilemap?.lighting?.glowLayer;
		if (!glow || !el) return;
		glow.isEnabled = !glow.isEnabled;
		el.classList.toggle('on', glow.isEnabled);
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).toggleShadows = (): void => {
		const el = document.querySelector('#toggle-shadows');
		const lights = debug.tilemap?.lighting?.lights;
		if (!lights || !el) return;
		const isOn = el.classList.contains('on');
		for (const ml of lights) {
			if (ml.shadowGenerator) {
				// Toggle shadow on the light itself — works for both standard and cascaded generators
				ml.light.shadowEnabled = !isOn;
			}
		}
		el.classList.toggle('on', !isOn);
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).toggleGodRays = (): void => {
		const el = document.querySelector('#toggle-godrays');
		const lights = debug.tilemap?.lighting?.lights;
		if (!lights || !el) return;
		const isOn = el.classList.contains('on');
		for (const ml of lights) {
			if (ml.volumetricPostProcess) {
				// Toggle by weight — 0 = invisible, restore = original
				if (isOn) {
					ml.volumetricPostProcess.weight = 0;
				} else {
					ml.volumetricPostProcess.weight =
						ml.config.type === 'directional' ? (ml.config.volumetricLight?.weight ?? 1.5) : 1.5;
				}
			}
		}
		el.classList.toggle('on', !isOn);
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness global
	(window as any).toggleLensFlares = (): void => {
		const el = document.querySelector('#toggle-lensflares');
		const lights = debug.tilemap?.lighting?.lights;
		if (!lights || !el) return;
		const isOn = el.classList.contains('on');
		for (const ml of lights) {
			if (ml.lensFlareSystem) {
				ml.lensFlareSystem.isEnabled = !isOn;
			}
		}
		el.classList.toggle('on', !isOn);
	};
}

// =============================================================================
// UI Helper — creates a labeled slider row
// =============================================================================

/**
 * Creates a control-row with label, range slider, and value display.
 *
 * @param label - Display label text.
 * @param min - Slider minimum.
 * @param max - Slider maximum.
 * @param step - Slider step.
 * @param value - Initial value.
 * @param onChange - Callback when slider changes.
 * @returns The row element.
 */
function createSliderRow(
	label: string,
	min: number,
	max: number,
	step: number,
	value: number,
	onChange: (val: number) => void,
	dataControl?: string,
): HTMLElement {
	const row = document.createElement('div');
	row.className = 'control-row';
	if (dataControl) row.dataset['control'] = dataControl;

	const lbl = document.createElement('span');
	lbl.className = 'control-label';
	lbl.textContent = label;

	const slider = document.createElement('input');
	slider.type = 'range';
	slider.min = String(min);
	slider.max = String(max);
	slider.step = String(step);
	slider.value = String(value);

	const valEl = document.createElement('span');
	valEl.className = 'control-value';
	valEl.textContent = step >= 1 ? String(Math.round(value)) : value.toFixed(2);

	slider.addEventListener('input', () => {
		const v = Number(slider.value);
		valEl.textContent = step >= 1 ? String(Math.round(v)) : v.toFixed(2);
		onChange(v);
	});

	row.append(lbl, slider, valEl);
	return row;
}

/**
 * Creates a toggle row with label and toggle switch.
 *
 * @param label - Display label text.
 * @param initialOn - Whether the toggle starts in the "on" state.
 * @param onChange - Callback when toggle changes.
 * @returns The row element.
 */
function createToggleRow(
	label: string,
	initialOn: boolean,
	onChange: (on: boolean) => void,
	dataControl?: string,
): HTMLElement {
	const row = document.createElement('div');
	row.className = 'toggle-row';
	if (dataControl) row.dataset['control'] = dataControl;

	const lbl = document.createElement('span');
	lbl.className = 'control-label';
	lbl.textContent = label;

	const toggle = document.createElement('div');
	toggle.className = `toggle-switch ${initialOn ? 'on' : ''}`;
	toggle.addEventListener('click', () => {
		const isOn = toggle.classList.contains('on');
		toggle.classList.toggle('on', !isOn);
		onChange(!isOn);
	});

	row.append(lbl, toggle);
	return row;
}

/**
 * Adds a sub-header label in the control panel.
 *
 * @param text - Sub-header text.
 * @returns The sub-header element.
 */
function createSubHeader(text: string): HTMLElement {
	const el = document.createElement('div');
	el.style.cssText =
		'font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #666; padding: 6px 0 2px; border-top: 1px solid rgba(255,255,255,0.04); margin-top: 4px;';
	el.textContent = text;
	return el;
}

/**
 * Creates a control-row with label and styled dropdown.
 *
 * @param label - Display label text.
 * @param options - Array of option strings.
 * @param active - Currently selected option.
 * @param onChange - Callback when selection changes.
 * @param dataControl - Optional data-control attribute value.
 * @returns The row element.
 */
function createDropdown(
	label: string,
	options: readonly string[],
	active: string,
	onChange: (value: string) => void,
	dataControl?: string,
): HTMLElement {
	const row = document.createElement('div');
	row.className = 'control-row';
	if (dataControl) row.dataset['control'] = dataControl;

	const lbl = document.createElement('span');
	lbl.className = 'control-label';
	lbl.textContent = label;

	const select = document.createElement('select');
	select.className = 'control-dropdown';
	if (dataControl) select.dataset['control'] = dataControl;

	for (const opt of options) {
		const option = document.createElement('option');
		option.value = opt;
		option.textContent = opt;
		option.dataset['value'] = opt;
		if (opt === active) option.selected = true;
		select.append(option);
	}

	select.addEventListener('change', () => {
		onChange(select.value);
	});

	row.append(lbl, select);
	return row;
}

// =============================================================================
// Post-Processing UI Builder
// =============================================================================

/**
 * Builds detailed post-processing controls for every sub-effect.
 *
 * @param debug - Debug API reference.
 */
function buildPostProcessingUI(debug: DevDebugApi): void {
	const container = document.querySelector('#postfx-body') as HTMLElement | null;
	const pp = debug.tilemap?.postProcessing;
	if (!container || !pp) return;

	const { pipeline } = pp;
	if (!pipeline) return;

	container.innerHTML = '';

	// ── Exposure & Contrast ──
	container.append(createSubHeader('Exposure / Contrast'));
	container.append(
		createSliderRow('Exposure', 0, 3, 0.05, pipeline.imageProcessing.exposure, (v) => {
			pipeline.imageProcessing.exposure = v;
		}, 'postfx-exposure'),
	);
	container.append(
		createSliderRow('Contrast', 0, 3, 0.05, pipeline.imageProcessing.contrast, (v) => {
			pipeline.imageProcessing.contrast = v;
		}, 'postfx-contrast'),
	);

	// ── Bloom ──
	container.append(createSubHeader('Bloom'));
	container.append(
		createToggleRow('Enabled', pipeline.bloomEnabled, (on) => {
			pipeline.bloomEnabled = on;
		}, 'postfx-bloom-enabled'),
	);
	container.append(
		createSliderRow('Weight', 0, 1, 0.01, pipeline.bloomWeight, (v) => {
			pipeline.bloomWeight = v;
		}, 'postfx-bloom-weight'),
	);
	container.append(
		createSliderRow('Threshold', 0, 1, 0.01, pipeline.bloomThreshold, (v) => {
			pipeline.bloomThreshold = v;
		}, 'postfx-bloom-threshold'),
	);
	container.append(
		createSliderRow('Kernel', 1, 512, 1, pipeline.bloomKernel, (v) => {
			pipeline.bloomKernel = v;
		}, 'postfx-bloom-kernel'),
	);
	container.append(
		createSliderRow('Scale', 0.1, 1, 0.05, pipeline.bloomScale, (v) => {
			pipeline.bloomScale = v;
		}, 'postfx-bloom-scale'),
	);

	// ── Depth of Field ──
	container.append(createSubHeader('Depth of Field'));
	container.append(
		createToggleRow('Enabled', pipeline.depthOfFieldEnabled, (on) => {
			pipeline.depthOfFieldEnabled = on;
		}, 'postfx-dof-enabled'),
	);
	container.append(
		createSliderRow('Focal Length', 0, 200, 1, pipeline.depthOfField.focalLength, (v) => {
			pipeline.depthOfField.focalLength = v;
		}, 'postfx-dof-focal-length'),
	);
	container.append(
		createSliderRow('f-Stop', 0.1, 22, 0.1, pipeline.depthOfField.fStop, (v) => {
			pipeline.depthOfField.fStop = v;
		}, 'postfx-dof-fstop'),
	);
	container.append(
		createSliderRow('Focus Dist', 0, 500_000, 1000, pipeline.depthOfField.focusDistance, (v) => {
			pipeline.depthOfField.focusDistance = v;
		}, 'postfx-dof-focus-dist'),
	);

	// ── Chromatic Aberration ──
	container.append(createSubHeader('Chromatic Aberration'));
	container.append(
		createToggleRow('Enabled', pipeline.chromaticAberrationEnabled, (on) => {
			pipeline.chromaticAberrationEnabled = on;
		}, 'postfx-ca-enabled'),
	);
	container.append(
		createSliderRow('Amount', 0, 200, 1, pipeline.chromaticAberration.aberrationAmount, (v) => {
			pipeline.chromaticAberration.aberrationAmount = v;
		}, 'postfx-ca-amount'),
	);
	container.append(
		createSliderRow('Radial', 0, 5, 0.1, pipeline.chromaticAberration.radialIntensity, (v) => {
			pipeline.chromaticAberration.radialIntensity = v;
		}, 'postfx-ca-radial'),
	);

	// ── Film Grain ──
	container.append(createSubHeader('Film Grain'));
	container.append(
		createToggleRow('Enabled', pipeline.grainEnabled, (on) => {
			pipeline.grainEnabled = on;
		}, 'postfx-grain-enabled'),
	);
	container.append(
		createSliderRow('Intensity', 0, 100, 1, pipeline.grain.intensity, (v) => {
			pipeline.grain.intensity = v;
		}, 'postfx-grain-intensity'),
	);
	container.append(
		createToggleRow('Animated', pipeline.grain.animated, (on) => {
			pipeline.grain.animated = on;
		}, 'postfx-grain-animated'),
	);

	// ── Sharpen ──
	container.append(createSubHeader('Sharpen'));
	container.append(
		createToggleRow('Enabled', pipeline.sharpenEnabled, (on) => {
			pipeline.sharpenEnabled = on;
		}, 'postfx-sharpen-enabled'),
	);
	container.append(
		createSliderRow('Edge Amount', 0, 2, 0.05, pipeline.sharpen.edgeAmount, (v) => {
			pipeline.sharpen.edgeAmount = v;
		}, 'postfx-sharpen-edge'),
	);
	container.append(
		createSliderRow('Color Amount', 0, 1, 0.05, pipeline.sharpen.colorAmount, (v) => {
			pipeline.sharpen.colorAmount = v;
		}, 'postfx-sharpen-color'),
	);

	// ── Vignette ──
	container.append(createSubHeader('Vignette'));
	const imgProc = pipeline.imageProcessing;
	container.append(
		createToggleRow('Enabled', imgProc.vignetteEnabled, (on) => {
			imgProc.vignetteEnabled = on;
		}, 'postfx-vignette-enabled'),
	);
	container.append(
		createSliderRow('Weight', 0, 10, 0.1, imgProc.vignetteWeight, (v) => {
			imgProc.vignetteWeight = v;
		}, 'postfx-vignette-weight'),
	);
	container.append(
		createSliderRow('Stretch', 0, 25, 0.5, imgProc.vignetteStretch, (v) => {
			imgProc.vignetteStretch = v;
		}, 'postfx-vignette-stretch'),
	);

	// ── Tone Mapping ──
	container.append(createSubHeader('Tone Mapping'));
	container.append(
		createToggleRow('Enabled', imgProc.toneMappingEnabled, (on) => {
			imgProc.toneMappingEnabled = on;
		}, 'postfx-tonemapping-enabled'),
	);
	// Determine current tone mapping name from Babylon constant
	let currentToneMap = 'standard';
	if (imgProc.toneMappingType === BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES) {
		currentToneMap = 'aces';
	} else if (
		imgProc.toneMappingType === BABYLON.ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL
	) {
		currentToneMap = 'khr_pbr_neutral';
	}
	container.append(
		createDropdown('Mapping', ['standard', 'aces', 'khr_pbr_neutral'], currentToneMap, (type) => {
			switch (type) {
				case 'aces': {
					imgProc.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
					break;
				}
				case 'khr_pbr_neutral': {
					imgProc.toneMappingType =
						BABYLON.ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL;
					break;
				}
				default: {
					imgProc.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_STANDARD;
				}
			}
		}, 'tonemapping-type'),
	);

	// ── Color Grading ──
	container.append(createSubHeader('Color Grading'));
	container.append(
		createToggleRow('Enabled', imgProc.colorCurvesEnabled, (on) => {
			imgProc.colorCurvesEnabled = on;
		}, 'postfx-colorgrading-enabled'),
	);

	// ── FXAA ──
	container.append(createSubHeader('FXAA'));
	container.append(
		createToggleRow('Enabled', pipeline.fxaaEnabled, (on) => {
			pipeline.fxaaEnabled = on;
		}, 'postfx-fxaa-enabled'),
	);

	// ── Dithering ──
	container.append(createSubHeader('Dithering'));
	container.append(
		createToggleRow('Enabled', imgProc.ditheringEnabled, (on) => {
			imgProc.ditheringEnabled = on;
		}, 'postfx-dithering-enabled'),
	);
	container.append(
		createSliderRow('Intensity', 0, 1, 0.001, imgProc.ditheringIntensity, (v) => {
			imgProc.ditheringIntensity = v;
		}, 'postfx-dithering-intensity'),
	);

	// ── SSAO ──
	const ssao = pp.ssaoPipeline;
	if (ssao) {
		container.append(createSubHeader('SSAO'));
		container.append(
			createSliderRow('Strength', 0, 3, 0.05, ssao.totalStrength, (v) => {
				ssao.totalStrength = v;
			}, 'postfx-ssao-strength'),
		);
		container.append(
			createSliderRow('Radius', 0.01, 16, 0.1, ssao.radius, (v) => {
				ssao.radius = v;
			}, 'postfx-ssao-radius'),
		);
		container.append(
			createSliderRow('Samples', 1, 64, 1, ssao.samples, (v) => {
				ssao.samples = v;
			}, 'postfx-ssao-samples'),
		);
		container.append(
			createSliderRow('Base', 0, 1, 0.01, ssao.base, (v) => {
				ssao.base = v;
			}, 'postfx-ssao-base'),
		);
	}
}

// =============================================================================
// Fog UI Builder
// =============================================================================

/**
 * Builds fog controls.
 *
 * @param scene - The Babylon.js scene.
 */
function buildFogUI(scene: BABYLON.Scene): void {
	const container = document.querySelector('#fog-body') as HTMLElement | null;
	if (!container) return;

	container.innerHTML = '';

	// Determine current fog mode name from Babylon constant
	let currentMode = 'none';
	if (scene.fogMode === BABYLON.Scene.FOGMODE_LINEAR) {
		currentMode = 'linear';
	} else if (scene.fogMode === BABYLON.Scene.FOGMODE_EXP) {
		currentMode = 'exponential';
	} else if (scene.fogMode === BABYLON.Scene.FOGMODE_EXP2) {
		currentMode = 'exponential2';
	}

	container.append(
		createDropdown('Mode', ['none', 'linear', 'exponential', 'exponential2'], currentMode, (mode) => {
			switch (mode) {
				case 'linear': {
					scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
					break;
				}
				case 'exponential': {
					scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
					break;
				}
				case 'exponential2': {
					scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
					break;
				}
				default: {
					scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
				}
			}
		}, 'fog-mode'),
	);

	container.append(
		createSliderRow('Density', 0, 0.1, 0.001, scene.fogDensity, (v) => {
			scene.fogDensity = v;
		}, 'fog-density'),
	);
	container.append(
		createSliderRow('Start', 0, 500, 5, scene.fogStart, (v) => {
			scene.fogStart = v;
		}, 'fog-start'),
	);
	container.append(
		createSliderRow('End', 10, 1000, 10, scene.fogEnd, (v) => {
			scene.fogEnd = v;
		}, 'fog-end'),
	);
	container.append(
		createSliderRow('Fog R', 0, 1, 0.01, scene.fogColor.r, (v) => {
			scene.fogColor.r = v;
		}, 'fog-r'),
	);
	container.append(
		createSliderRow('Fog G', 0, 1, 0.01, scene.fogColor.g, (v) => {
			scene.fogColor.g = v;
		}, 'fog-g'),
	);
	container.append(
		createSliderRow('Fog B', 0, 1, 0.01, scene.fogColor.b, (v) => {
			scene.fogColor.b = v;
		}, 'fog-b'),
	);
}

// =============================================================================
// Camera Details UI Builder
// =============================================================================

/**
 * Builds live camera parameter controls and readouts.
 *
 * @param runtime - The runtime instance.
 */
function buildCameraDetailsUI(runtime: RuntimeInstance): void {
	const container = document.querySelector('#camdetails-body') as HTMLElement | null;
	if (!container) return;

	container.innerHTML = '';
	const cam = runtime.camera;

	if (cam instanceof BABYLON.ArcRotateCamera) {
		container.append(
			createSliderRow('FOV', 0.3, 2.0, 0.05, cam.fov, (v) => {
				cam.fov = v;
			}, 'cam-fov'),
		);
		container.append(
			createSliderRow('Radius', 1, 500, 1, cam.radius, (v) => {
				cam.radius = v;
			}, 'cam-radius'),
		);
		container.append(
			createSliderRow('Inertia', 0, 1, 0.05, cam.inertia, (v) => {
				cam.inertia = v;
			}, 'cam-inertia'),
		);
		container.append(
			createSliderRow('Wheel Prec.', 1, 50, 1, cam.wheelPrecision, (v) => {
				cam.wheelPrecision = v;
			}, 'cam-wheel-prec'),
		);
		container.append(
			createSliderRow('Pan Sens.', 0, 200, 5, cam.panningSensibility, (v) => {
				cam.panningSensibility = v;
			}, 'cam-pan-sens'),
		);
		container.append(
			createSliderRow('Lower Radius', 1, 200, 1, cam.lowerRadiusLimit ?? 1, (v) => {
				cam.lowerRadiusLimit = v;
			}, 'cam-lower-radius'),
		);
		container.append(
			createSliderRow('Upper Radius', 10, 1000, 10, cam.upperRadiusLimit ?? 300, (v) => {
				cam.upperRadiusLimit = v;
			}, 'cam-upper-radius'),
		);

		// Live readout of alpha/beta/radius
		const readout = document.createElement('div');
		readout.style.cssText = 'font-size: 9px; color: #666; padding: 4px 0;';
		container.append(readout);

		runtime.engine.scene.registerAfterRender(() => {
			if (document.querySelector('#section-camdetails')?.classList.contains('collapsed')) return;
			readout.textContent = `α=${cam.alpha.toFixed(2)} β=${cam.beta.toFixed(2)} r=${cam.radius.toFixed(1)}`;
		});
	} else {
		const status = document.createElement('div');
		status.className = 'status-text';
		status.textContent = 'Non-ArcRotate camera — limited controls';
		container.append(status);
		container.append(
			createSliderRow('FOV', 0.3, 2.0, 0.05, cam.fov, (v) => {
				cam.fov = v;
			}, 'cam-fov'),
		);
	}
}

// =============================================================================
// Glow Layer Details UI Builder
// =============================================================================

/**
 * Builds glow layer parameter controls.
 *
 * @param debug - Debug API reference.
 */
function buildGlowDetailsUI(debug: DevDebugApi): void {
	const container = document.querySelector('#glowdetails-body') as HTMLElement | null;
	const glow = debug.tilemap?.lighting?.glowLayer;
	if (!container) return;

	container.innerHTML = '';

	if (!glow) {
		const status = document.createElement('div');
		status.className = 'status-text';
		status.textContent = 'No glow layer configured';
		container.append(status);
		return;
	}

	container.append(
		createToggleRow('Enabled', glow.isEnabled, (on) => {
			glow.isEnabled = on;
		}, 'glow-enabled'),
	);
	container.append(
		createSliderRow('Intensity', 0, 5, 0.05, glow.intensity, (v) => {
			glow.intensity = v;
		}, 'glow-intensity'),
	);
	container.append(
		createSliderRow('Blur Kernel', 1, 256, 1, glow.blurKernelSize, (v) => {
			glow.blurKernelSize = v;
		}, 'glow-blur-kernel'),
	);
}

// =============================================================================
// Layer UI Builder — helper
// =============================================================================

/**
 * Builds a single layer row with visibility toggle and opacity slider.
 *
 * @param tilemap - The rendered tilemap.
 * @param layer - The layer data.
 * @param index - The layer index.
 * @param container - The parent container element.
 */
function buildLayerRow(
	tilemap: RenderedTilemap,
	layer: { name: string; visible: boolean; opacity: number },
	index: number,
	container: HTMLElement,
): void {
	const row = document.createElement('div');
	row.style.cssText = 'padding: 3px 0;';

	// Layer name + visibility toggle
	const header = document.createElement('div');
	header.className = 'toggle-row';
	header.dataset['control'] = `layer-${String(index)}-visible`;

	const label = document.createElement('span');
	label.className = 'control-label';
	label.textContent = `${String(index)}: ${layer.name}`;

	const toggle = document.createElement('div');
	toggle.className = `toggle-switch ${layer.visible ? 'on' : ''}`;
	toggle.addEventListener('click', () => {
		const isOn = toggle.classList.contains('on');
		setLayerVisibility({
			tilemap,
			layerIndex: index as Num,
			visible: !isOn as Bool,
		});
		toggle.classList.toggle('on', !isOn);
	});

	header.append(label);
	header.append(toggle);
	row.append(header);

	// Opacity slider
	const opacityRow = document.createElement('div');
	opacityRow.className = 'control-row';
	opacityRow.style.cssText = 'padding-left: 8px;';
	opacityRow.dataset['control'] = `layer-${String(index)}-opacity`;

	const opLabel = document.createElement('span');
	opLabel.className = 'control-label';
	opLabel.textContent = 'Opacity';

	const opSlider = document.createElement('input');
	opSlider.type = 'range';
	opSlider.min = '0';
	opSlider.max = '1';
	opSlider.step = '0.05';
	opSlider.value = String(layer.opacity);

	const opValue = document.createElement('span');
	opValue.className = 'control-value';
	opValue.textContent = layer.opacity.toFixed(2);

	opSlider.addEventListener('input', () => {
		const val = Number(opSlider.value);
		setLayerOpacity({
			tilemap,
			layerIndex: index as Num,
			opacity: val as Num,
		});
		opValue.textContent = val.toFixed(2);
	});

	opacityRow.append(opLabel);
	opacityRow.append(opSlider);
	opacityRow.append(opValue);
	row.append(opacityRow);

	container.append(row);
}

// =============================================================================
// Layer UI Builder
// =============================================================================

/**
 * Populates the layer controls section with one row per tilemap layer.
 *
 * @param debug - Debug API reference.
 */
function buildLayerUI(debug: DevDebugApi): void {
	const container = document.querySelector('#layers-body');
	if (!container || !debug.tilemap) return;

	const { tilemap } = debug;
	const { layers } = tilemap.mapData;
	container.innerHTML = '';

	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		if (!layer) continue;

		buildLayerRow(tilemap, layer, i, container as HTMLElement);
	}
}

// =============================================================================
// Lights UI Builder
// =============================================================================

/**
 * Populates the lights info section.
 *
 * @param debug - Debug API reference.
 */
function buildLightsUI(debug: DevDebugApi): void {
	const container = document.querySelector('#lights-body');
	if (!container || !debug.tilemap?.lighting) return;

	const { lights } = debug.tilemap.lighting;
	container.innerHTML = '';

	for (const ml of lights) {
		const row = document.createElement('div');
		row.style.cssText = 'padding: 3px 0;';

		// Light name + type header
		const header = document.createElement('div');
		header.className = 'control-row';

		const label = document.createElement('span');
		label.className = 'control-label';
		label.textContent = `${ml.config.id} (${ml.config.type})`;

		header.append(label);
		row.append(header);

		const lightId = ml.config.id;

		// Enabled toggle
		row.append(
			createToggleRow('Enabled', ml.light.isEnabled(), (on) => {
				ml.light.setEnabled(on);
			}, `light-${lightId}-enabled`),
		);

		// Intensity slider
		row.append(
			createSliderRow('Intensity', 0, 5, 0.05, ml.light.intensity, (v) => {
				ml.light.intensity = v;
			}, `light-${lightId}-intensity`),
		);

		// Color temperature slider (if light has diffuse color)
		if ('diffuse' in ml.light) {
			const diffuse = ml.light.diffuse as BABYLON.Color3;
			row.append(
				createSliderRow('Diffuse R', 0, 1, 0.01, diffuse.r, (v) => {
					diffuse.r = v;
				}, `light-${lightId}-diffuse-r`),
			);
			row.append(
				createSliderRow('Diffuse G', 0, 1, 0.01, diffuse.g, (v) => {
					diffuse.g = v;
				}, `light-${lightId}-diffuse-g`),
			);
			row.append(
				createSliderRow('Diffuse B', 0, 1, 0.01, diffuse.b, (v) => {
					diffuse.b = v;
				}, `light-${lightId}-diffuse-b`),
			);
		}

		// Range slider (point/spot lights)
		if ('range' in ml.light && typeof ml.light.range === 'number') {
			row.append(
				createSliderRow('Range', 0, 200, 1, ml.light.range, (v) => {
					(ml.light as BABYLON.PointLight).range = v;
				}, `light-${lightId}-range`),
			);
		}

		// Shadow darkness slider
		if (ml.shadowGenerator && 'darkness' in ml.shadowGenerator) {
			const sg = ml.shadowGenerator;
			row.append(
				createSliderRow('Shadow Dark', 0, 1, 0.05, sg.darkness, (v) => {
					sg.darkness = v;
				}, `light-${lightId}-shadow-dark`),
			);
		}

		// Flicker controls — mutate config properties directly
		if (ml.flickerInstance) {
			const flickerCfg = ml.flickerInstance.config as Record<string, unknown>;
			row.append(
				createSliderRow(
					'Flicker Int.',
					0,
					1,
					0.05,
					(flickerCfg['intensity'] as number) ?? 0.3,
					(v) => {
						flickerCfg['intensity'] = v;
					},
					`light-${lightId}-flicker-int`,
				),
			);
			row.append(
				createSliderRow(
					'Flicker Spd.',
					0.1,
					10,
					0.1,
					(flickerCfg['speed'] as number) ?? 1.0,
					(v) => {
						flickerCfg['speed'] = v;
					},
					`light-${lightId}-flicker-spd`,
				),
			);
		}

		// God rays controls
		if (ml.volumetricPostProcess) {
			const vl = ml.volumetricPostProcess;
			row.append(
				createSliderRow('GR Decay', 0, 1, 0.01, vl.decay, (v) => {
					vl.decay = v;
				}, `light-${lightId}-gr-decay`),
			);
			row.append(
				createSliderRow('GR Weight', 0, 1, 0.01, vl.weight, (v) => {
					vl.weight = v;
				}, `light-${lightId}-gr-weight`),
			);
			row.append(
				createSliderRow('GR Density', 0, 1, 0.01, vl.density, (v) => {
					vl.density = v;
				}, `light-${lightId}-gr-density`),
			);
		}

		// Features badges
		const badges = document.createElement('div');
		badges.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; padding: 2px 0;';

		if (ml.shadowGenerator) addBadge(badges, 'Shadow', '#8a8');
		if (ml.flickerInstance) addBadge(badges, 'Flicker', '#aa8');
		if (ml.volumetricPostProcess) addBadge(badges, 'God Rays', '#88a');
		if (ml.lensFlareSystem) addBadge(badges, 'Flares', '#a8a');

		if (badges.childElementCount > 0) row.append(badges);

		container.append(row);
	}
}

/**
 * Adds a small badge element.
 *
 * @param parent - Parent element.
 * @param text - Badge text.
 * @param color - Badge color.
 */
function addBadge(parent: HTMLElement, text: string, color: string): void {
	const badge = document.createElement('span');
	badge.style.cssText = `font-size: 9px; padding: 1px 5px; border-radius: 3px; background: ${color}22; color: ${color}; border: 1px solid ${color}44;`;
	badge.textContent = text;
	parent.append(badge);
}

// =============================================================================
// Scene Info UI
// =============================================================================

/**
 * Populates the scene info section.
 *
 * @param debug - Debug API reference.
 * @param scene - Babylon.js scene.
 */
function buildInfoUI(debug: DevDebugApi, scene: BABYLON.Scene): void {
	const container = document.querySelector('#info-body');
	if (!container) return;

	// Update every 60 frames
	let infoFrameCount = 0;
	scene.registerAfterRender(() => {
		infoFrameCount++;
		if (infoFrameCount % 60 !== 0) return;

		const status = debug.status();
		container.innerHTML = Object.entries(status)
			.filter(([key]) => key !== 'lights')
			.map(([key, val]) => {
				const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
				return `<div class="control-row"><span class="control-label">${key}</span><span class="control-value">${valStr}</span></div>`;
			})
			.join('');
	});
}

// =============================================================================
// Sky / Background UI Builder
// =============================================================================

/**
 * Builds sky and parallax background controls.
 *
 * @param debug - Debug API reference.
 * @param scene - The Babylon.js scene.
 */
function buildSkyUI(debug: DevDebugApi, scene: BABYLON.Scene): void {
	const container = document.querySelector('#sky-body') as HTMLElement | null;
	if (!container) return;
	container.innerHTML = '';

	// ── Sky sub-section ──
	container.append(createSubHeader('Sky'));

	// Sky type dropdown (read-only info — full sky rebuild is beyond dev harness scope)
	const skyConfig = debug.tilemap?.sky;
	const currentType = skyConfig ? 'gradient' : 'color';
	container.append(
		createDropdown(
			'Type',
			['color', 'gradient', 'skybox', 'procedural'],
			currentType,
			(_val) => {
				// Sky type change requires full rebuild — show info only
			},
			'sky-type',
		),
	);

	// Clear color RGBA sliders — always useful
	const cc = scene.clearColor;
	container.append(
		createSliderRow('Clear R', 0, 1, 0.01, cc.r, (v) => {
			scene.clearColor.r = v;
		}, 'sky-clear-r'),
	);
	container.append(
		createSliderRow('Clear G', 0, 1, 0.01, cc.g, (v) => {
			scene.clearColor.g = v;
		}, 'sky-clear-g'),
	);
	container.append(
		createSliderRow('Clear B', 0, 1, 0.01, cc.b, (v) => {
			scene.clearColor.b = v;
		}, 'sky-clear-b'),
	);
	container.append(
		createSliderRow('Clear A', 0, 1, 0.01, cc.a, (v) => {
			scene.clearColor.a = v;
		}, 'sky-clear-a'),
	);

	// ── Parallax sub-section ──
	const parallax = debug.tilemap?.parallax;
	if (parallax && parallax.layers.length > 0) {
		container.append(createSubHeader('Parallax Layers'));

		for (let i = 0; i < parallax.layers.length; i++) {
			const layer = parallax.layers[i];
			const bgLayer = parallax.bgLayers[i];
			if (!layer || !bgLayer) continue;

			// Layer header
			const header = document.createElement('div');
			header.style.cssText = 'font-size: 9px; color: #777; padding: 4px 0 2px;';
			const shortPath =
				layer.imagePath.length > 20 ? '...' + layer.imagePath.slice(-17) : layer.imagePath;
			header.textContent = `${String(i)}: ${shortPath}`;
			container.append(header);

			// Visibility toggle
			container.append(
				createToggleRow(
					'Visible',
					bgLayer.isEnabled,
					(on) => {
						bgLayer.isEnabled = on;
					},
					`parallax-${String(i)}-visible`,
				),
			);

			// Opacity slider
			container.append(
				createSliderRow(
					'Opacity',
					0,
					1,
					0.01,
					layer.opacity,
					(v) => {
						bgLayer.color = new BABYLON.Color4(1, 1, 1, v);
						layer.opacity = v;
					},
					`parallax-${String(i)}-opacity`,
				),
			);

			// ScrollSpeedX slider
			container.append(
				createSliderRow(
					'Speed X',
					-2,
					2,
					0.05,
					layer.scrollSpeedX,
					(v) => {
						layer.scrollSpeedX = v;
					},
					`parallax-${String(i)}-speed-x`,
				),
			);

			// ScrollSpeedY slider
			container.append(
				createSliderRow(
					'Speed Y',
					-2,
					2,
					0.05,
					layer.scrollSpeedY,
					(v) => {
						layer.scrollSpeedY = v;
					},
					`parallax-${String(i)}-speed-y`,
				),
			);

			// Scale slider
			container.append(
				createSliderRow(
					'Scale',
					0.1,
					10,
					0.1,
					layer.scale,
					(v) => {
						layer.scale = v;
						const tex = bgLayer.texture;
						if (tex && tex instanceof BABYLON.Texture) {
							tex.uScale = 1 / v;
							tex.vScale = 1 / v;
						}
					},
					`parallax-${String(i)}-scale`,
				),
			);
		}
	}
}

// =============================================================================
// FPS Counter
// =============================================================================

/**
 * Sets up the real-time FPS counter in the toolbar.
 *
 * @param runtime - The runtime instance.
 */
function setupFpsCounter(runtime: RuntimeInstance): void {
	const fpsEl = document.querySelector('#fps-display');
	const backendEl = document.querySelector('#backend-display');
	const dcEl = document.querySelector('#draw-calls-display');

	if (backendEl) {
		backendEl.textContent = runtime.engine.isWebGPU ? 'WebGPU' : 'WebGL2';
	}

	let fpsFrameCount = 0;
	runtime.engine.scene.registerAfterRender(() => {
		fpsFrameCount++;
		if (fpsFrameCount % 30 !== 0) return;

		const engine = runtime.engine.scene.getEngine();
		if (fpsEl) fpsEl.textContent = `FPS: ${engine.getFps().toFixed(0)}`;
		if (dcEl && runtime.performanceMonitor) {
			const m = getMetrics(runtime.performanceMonitor);
			if (m.ok) dcEl.textContent = `DC: ${m.data.drawCalls}`;
		}
	});
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

	// Expose debug API on window
	const debug: DevDebugApi = createDebugApi(runtime);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dev harness debug API
	(window as any).__WEBFORGE__ = debug;

	// Wire UI controls
	wireUI(runtime, debug);
	setupFpsCounter(runtime);

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

		// Build dynamic UI sections after tilemap is loaded
		buildLayerUI(debug);
		buildSkyUI(debug, runtime.engine.scene);
		buildLightsUI(debug);
		buildPostProcessingUI(debug);
		buildFogUI(runtime.engine.scene);
		buildCameraDetailsUI(runtime);
		buildGlowDetailsUI(debug);
		buildInfoUI(debug, runtime.engine.scene);

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
