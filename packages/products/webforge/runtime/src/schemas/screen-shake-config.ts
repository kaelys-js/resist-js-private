/**
 * Screen shake configuration schemas.
 *
 * Defines a trauma-based screen shake system with per-channel control
 * (translation, rotation, FOV), ASR envelopes, Perlin noise seeding,
 * directional bias, and hit-freeze support.
 *
 * Includes 18 curated presets across 4 categories:
 *
 * | Category | Count | Examples |
 * |-------------|-------|-------------------------------------|
 * | `combat` | 6 | Light Hit, Heavy Hit, Critical Hit |
 * | `environment` | 5 | Earthquake, Tremor, Thunder |
 * | `ui` | 3 | Deny, Alert, Landing |
 * | `cinematic` | 4 | Boss Intro, Teleport, Death Blow |
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ScreenShakeConfigSchema, SHAKE_PRESETS, type ScreenShakeConfig } from './screen-shake-config';
 *
 * // Minimal config — just intensity, everything else defaults
 * const result = safeParse(ScreenShakeConfigSchema, { intensity: 0.5 });
 *
 * // Use a preset
 * const heavyHit = SHAKE_PRESETS.find(p => p.name === 'Heavy Hit');
 * ```
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Decay Mode
// =============================================================================

/**
 * Shake decay mode.
 *
 * Controls how the shake amplitude diminishes over time:
 * - `linear` — constant rate of decay
 * - `exponential` — fast initial decay, slow tail (most natural)
 * - `easeOut` — smooth deceleration curve
 */
export const DecayModeSchema = v.picklist(['linear', 'exponential', 'easeOut']);

/** Inferred decay mode type from {@link DecayModeSchema}. */
export type DecayMode = v.InferOutput<typeof DecayModeSchema>;

// =============================================================================
// Shake Channel
// =============================================================================

/**
 * Per-channel shake configuration.
 *
 * Each shake axis (translation, rotation, FOV) has its own enable flag,
 * amplitude multiplier, and noise frequency. Disabled channels produce
 * zero contribution regardless of amplitude.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ShakeChannelSchema } from './screen-shake-config';
 *
 * // Heavy rotation, no translation
 * const rotation = safeParse(ShakeChannelSchema, {
 *   enabled: true,
 *   amplitude: 0.08,
 *   frequency: 20,
 * });
 * ```
 */
export const ShakeChannelSchema = v.strictObject({
	/** Whether this channel contributes to the shake. Default: true. */
	enabled: v.optional(v.boolean(), true),

	/** Amplitude multiplier for this channel. Must be >= 0. Default: 0.5. */
	amplitude: v.optional(v.pipe(v.number(), v.minValue(0)), 0.5),

	/** Noise sampling frequency in Hz. Range 1-100. Default: 25. */
	frequency: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 25),
});

/** Inferred shake channel type from {@link ShakeChannelSchema}. */
export type ShakeChannel = v.InferOutput<typeof ShakeChannelSchema>;

// =============================================================================
// Shake Envelope
// =============================================================================

/**
 * Attack-Sustain-Release (ASR) envelope for shake timing.
 *
 * Models the shake amplitude over time:
 * - `attackMs` — ramp-up time from 0 to full intensity
 * - `sustainMs` — hold at full intensity
 * - `decayMs` — fade-out duration (the "release" / "duration" of the shake)
 *
 * Total shake duration = attackMs + sustainMs + decayMs.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ShakeEnvelopeSchema } from './screen-shake-config';
 *
 * // Quick attack, long sustain, slow decay
 * const envelope = safeParse(ShakeEnvelopeSchema, {
 *   attackMs: 50,
 *   sustainMs: 200,
 *   decayMs: 800,
 * });
 * ```
 */
export const ShakeEnvelopeSchema = v.strictObject({
	/** Ramp-up time in milliseconds. Range 0-500. Default: 0. */
	attackMs: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(500)), 0),

	/** Hold time at peak in milliseconds. Range 0-2000. Default: 0. */
	sustainMs: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2000)), 0),

	/** Fade-out time in milliseconds. Range 0-3000. Default: 300. */
	decayMs: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(3000)), 300),
});

/** Inferred shake envelope type from {@link ShakeEnvelopeSchema}. */
export type ShakeEnvelope = v.InferOutput<typeof ShakeEnvelopeSchema>;

// =============================================================================
// Shake Noise
// =============================================================================

/**
 * Perlin noise parameters for shake randomisation.
 *
 * Controls the reproducibility and complexity of the noise signal
 * that drives the shake offset.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ShakeNoiseSchema } from './screen-shake-config';
 *
 * const noise = safeParse(ShakeNoiseSchema, { seed: 42, octaves: 3 });
 * ```
 */
export const ShakeNoiseSchema = v.strictObject({
	/** Noise seed for reproducibility. Range 0-9999. Default: 0. */
	seed: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(9999)), 0),

	/** Number of noise octaves (layers of detail). Range 1-4. Default: 2. */
	octaves: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(4)), 2),
});

/** Inferred shake noise type from {@link ShakeNoiseSchema}. */
export type ShakeNoise = v.InferOutput<typeof ShakeNoiseSchema>;

// =============================================================================
// Shake Direction
// =============================================================================

/**
 * Directional bias vector for the shake on the XZ ground plane.
 *
 * When provided, the shake translation is biased toward this direction.
 * `null` means omnidirectional (no bias).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ShakeDirectionSchema } from './screen-shake-config';
 *
 * // Bias shake toward positive X axis
 * const direction = safeParse(ShakeDirectionSchema, { x: 1, z: 0 });
 * ```
 */
export const ShakeDirectionSchema = v.strictObject({
	/** X-axis bias component. */
	x: v.number(),

	/** Z-axis bias component. */
	z: v.number(),
});

/** Inferred shake direction type from {@link ShakeDirectionSchema}. */
export type ShakeDirection = v.InferOutput<typeof ShakeDirectionSchema>;

// =============================================================================
// Screen Shake Config
// =============================================================================

/**
 * Full screen shake configuration.
 *
 * Only `intensity` is required — all other fields have sensible defaults
 * for a general-purpose exponential-decay shake.
 *
 * The trauma system squares the intensity by `traumaPower` to produce
 * the actual shake amplitude, giving a non-linear feel where light hits
 * barely shake while heavy hits produce dramatic displacement.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ScreenShakeConfigSchema, type ScreenShakeConfig } from './screen-shake-config';
 *
 * // Minimal — just intensity
 * const minimal = safeParse(ScreenShakeConfigSchema, { intensity: 0.5 });
 *
 * // Full config
 * const full = safeParse(ScreenShakeConfigSchema, {
 *   intensity: 1.0,
 *   traumaPower: 3,
 *   decayRate: 2.0,
 *   decayMode: 'linear',
 *   translation: { enabled: true, amplitude: 0.8, frequency: 30 },
 *   rotation: { enabled: true, amplitude: 0.05, frequency: 20 },
 *   fov: { enabled: false, amplitude: 0, frequency: 15 },
 *   envelope: { attackMs: 50, sustainMs: 100, decayMs: 500 },
 *   noise: { seed: 42, octaves: 3 },
 *   direction: { x: 1, z: 0 },
 *   freezeMs: 100,
 * });
 * ```
 */
export const ScreenShakeConfigSchema = v.strictObject({
	/** Shake intensity (trauma input). REQUIRED. Range 0-3. */
	intensity: v.pipe(v.number(), v.minValue(0), v.maxValue(3)),

	/** Trauma exponent — higher values make weak shakes weaker. Range 1-4. Default: 2. */
	traumaPower: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(4)), 2),

	/** Trauma decay speed per second. Range 0.1-5.0. Default: 0.8. */
	decayRate: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(5.0)), 0.8),

	/** Decay curve shape. Default: 'exponential'. */
	decayMode: v.optional(DecayModeSchema, 'exponential'),

	/** Translation channel (camera offset). Default: enabled, amp 0.5, freq 25. */
	translation: v.optional(ShakeChannelSchema, {
		enabled: true,
		amplitude: 0.5,
		frequency: 25,
	}),

	/** Rotation channel (camera tilt). Default: enabled, amp 0.05, freq 20. */
	rotation: v.optional(ShakeChannelSchema, {
		enabled: true,
		amplitude: 0.05,
		frequency: 20,
	}),

	/** FOV channel (zoom punch). Default: enabled, amp 0.03, freq 15. */
	fov: v.optional(ShakeChannelSchema, {
		enabled: true,
		amplitude: 0.03,
		frequency: 15,
	}),

	/** ASR envelope timing. Default: attack 0, sustain 0, decay 300ms. */
	envelope: v.optional(ShakeEnvelopeSchema, {
		attackMs: 0,
		sustainMs: 0,
		decayMs: 300,
	}),

	/** Perlin noise parameters. Default: seed 0, octaves 2. */
	noise: v.optional(ShakeNoiseSchema, { seed: 0, octaves: 2 }),

	/** Directional bias on XZ plane. Default: null (omnidirectional). */
	direction: v.optional(v.nullable(ShakeDirectionSchema), null),

	/** Hit-freeze duration in milliseconds. Range 0-300. Default: 0. */
	freezeMs: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(300)), 0),
});

/** Inferred screen shake config type from {@link ScreenShakeConfigSchema}. */
export type ScreenShakeConfig = v.InferOutput<typeof ScreenShakeConfigSchema>;

// =============================================================================
// Shake Preset Category
// =============================================================================

/**
 * Shake preset category for UI grouping.
 *
 * - `combat` — hit reactions, explosions, parries
 * - `environment` — earthquakes, tremors, weather
 * - `ui` — feedback for UI interactions
 * - `cinematic` — boss intros, death blows, teleports
 */
export const ShakePresetCategorySchema = v.picklist(['combat', 'environment', 'ui', 'cinematic']);

/** Inferred shake preset category type from {@link ShakePresetCategorySchema}. */
export type ShakePresetCategory = v.InferOutput<typeof ShakePresetCategorySchema>;

// =============================================================================
// Shake Preset
// =============================================================================

/**
 * A named shake preset with category and config.
 *
 * Presets provide ready-to-use shake configurations that can be applied
 * directly or used as starting points for customisation.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ShakePresetSchema, SHAKE_PRESETS } from './screen-shake-config';
 *
 * const heavyHit = SHAKE_PRESETS.find(p => p.name === 'Heavy Hit');
 * if (heavyHit) {
 *   const result = safeParse(ShakePresetSchema, heavyHit);
 * }
 * ```
 */
export const ShakePresetSchema = v.strictObject({
	/** Display name for the preset. */
	name: v.string(),

	/** Category for UI grouping. */
	category: ShakePresetCategorySchema,

	/** Shake configuration for this preset. */
	config: ScreenShakeConfigSchema,
});

/** Inferred shake preset type from {@link ShakePresetSchema}. */
export type ShakePreset = v.InferOutput<typeof ShakePresetSchema>;

// =============================================================================
// Preset Library — 18 curated presets
// =============================================================================

/**
 * Library of 18 curated screen shake presets.
 *
 * Organised by category:
 * - **Combat (6):** Light Hit, Heavy Hit, Critical Hit, Explosion, Parry/Block, Spell Cast
 * - **Environment (5):** Earthquake, Tremor, Rumble, Thunder, Footstep (Giant)
 * - **UI (3):** Deny, Alert, Landing
 * - **Cinematic (4):** Boss Intro, Teleport, Death Blow, World Shift
 *
 * All presets validate against {@link ShakePresetSchema}.
 *
 * @example
 * ```typescript
 * import { SHAKE_PRESETS } from './screen-shake-config';
 *
 * // Get all combat presets
 * const combatPresets = SHAKE_PRESETS.filter(p => p.category === 'combat');
 *
 * // Find a specific preset by name
 * const earthquake = SHAKE_PRESETS.find(p => p.name === 'Earthquake');
 * ```
 */
export const SHAKE_PRESETS: readonly ShakePreset[] = [
	// =========================================================================
	// Combat (6)
	// =========================================================================
	{
		name: 'Light Hit',
		category: 'combat',
		config: {
			intensity: 0.3,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'exponential',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.02, frequency: 20 },
			fov: { enabled: true, amplitude: 0.01, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 150 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 0,
		},
	},
	{
		name: 'Heavy Hit',
		category: 'combat',
		config: {
			intensity: 0.6,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'exponential',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.04, frequency: 20 },
			fov: { enabled: true, amplitude: 0.02, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 300 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 50,
		},
	},
	{
		name: 'Critical Hit',
		category: 'combat',
		config: {
			intensity: 0.9,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'exponential',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.06, frequency: 20 },
			fov: { enabled: true, amplitude: 0.03, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 400 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 100,
		},
	},
	{
		name: 'Explosion',
		category: 'combat',
		config: {
			intensity: 1.0,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'linear',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.05, frequency: 20 },
			fov: { enabled: true, amplitude: 0.04, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 600 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 80,
		},
	},
	{
		name: 'Parry/Block',
		category: 'combat',
		config: {
			intensity: 0.4,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'exponential',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.01, frequency: 20 },
			fov: { enabled: true, amplitude: 0.02, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 120 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 30,
		},
	},
	{
		name: 'Spell Cast',
		category: 'combat',
		config: {
			intensity: 0.25,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'easeOut',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.03, frequency: 20 },
			fov: { enabled: true, amplitude: 0.015, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 350 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 0,
		},
	},

	// =========================================================================
	// Environment (5)
	// =========================================================================
	{
		name: 'Earthquake',
		category: 'environment',
		config: {
			intensity: 0.7,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'linear',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.03, frequency: 20 },
			fov: { enabled: true, amplitude: 0.01, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 2000 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 0,
		},
	},
	{
		name: 'Tremor',
		category: 'environment',
		config: {
			intensity: 0.3,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'easeOut',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.01, frequency: 20 },
			fov: { enabled: false, amplitude: 0, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 1000 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 0,
		},
	},
	{
		name: 'Rumble',
		category: 'environment',
		config: {
			intensity: 0.15,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'easeOut',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.005, frequency: 20 },
			fov: { enabled: false, amplitude: 0, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 3000 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 0,
		},
	},
	{
		name: 'Thunder',
		category: 'environment',
		config: {
			intensity: 0.5,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'exponential',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.02, frequency: 20 },
			fov: { enabled: true, amplitude: 0.01, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 500 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 60,
		},
	},
	{
		name: 'Footstep (Giant)',
		category: 'environment',
		config: {
			intensity: 0.35,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'exponential',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.015, frequency: 20 },
			fov: { enabled: true, amplitude: 0.01, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 250 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 20,
		},
	},

	// =========================================================================
	// UI / Feedback (3)
	// =========================================================================
	{
		name: 'Deny',
		category: 'ui',
		config: {
			intensity: 0.2,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'linear',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: false, amplitude: 0, frequency: 20 },
			fov: { enabled: false, amplitude: 0, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 200 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 0,
		},
	},
	{
		name: 'Alert',
		category: 'ui',
		config: {
			intensity: 0.15,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'easeOut',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.01, frequency: 20 },
			fov: { enabled: false, amplitude: 0, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 300 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 0,
		},
	},
	{
		name: 'Landing',
		category: 'ui',
		config: {
			intensity: 0.4,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'exponential',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.02, frequency: 20 },
			fov: { enabled: true, amplitude: 0.02, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 200 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 30,
		},
	},

	// =========================================================================
	// Cinematic (4)
	// =========================================================================
	{
		name: 'Boss Intro',
		category: 'cinematic',
		config: {
			intensity: 0.8,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'linear',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.04, frequency: 20 },
			fov: { enabled: true, amplitude: 0.03, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 1200 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 150,
		},
	},
	{
		name: 'Teleport',
		category: 'cinematic',
		config: {
			intensity: 0.5,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'exponential',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.05, frequency: 20 },
			fov: { enabled: true, amplitude: 0.04, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 400 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 0,
		},
	},
	{
		name: 'Death Blow',
		category: 'cinematic',
		config: {
			intensity: 1.0,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'easeOut',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.07, frequency: 20 },
			fov: { enabled: true, amplitude: 0.05, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 800 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 200,
		},
	},
	{
		name: 'World Shift',
		category: 'cinematic',
		config: {
			intensity: 0.6,
			traumaPower: 2,
			decayRate: 0.8,
			decayMode: 'linear',
			translation: { enabled: true, amplitude: 0.5, frequency: 25 },
			rotation: { enabled: true, amplitude: 0.02, frequency: 20 },
			fov: { enabled: true, amplitude: 0.02, frequency: 15 },
			envelope: { attackMs: 0, sustainMs: 0, decayMs: 1500 },
			noise: { seed: 0, octaves: 2 },
			direction: null,
			freezeMs: 0,
		},
	},
];
