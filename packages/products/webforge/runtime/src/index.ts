/**
 * WebForge Game Runtime
 *
 * Zero-framework game runtime powered by Babylon.js.
 * This is the player-facing engine that runs compiled game projects.
 *
 * @module
 */

// Result type for Babylon.js mutable objects
export { type BabylonResult } from './core/babylon-result';

// Runtime lifecycle
export {
	createRuntime,
	createTestRuntime,
	disposeRuntime,
	RuntimeConfigSchema,
	type RuntimeConfig,
	type RuntimeInstance,
} from './runtime';

// Engine
export {
	createBabylonEngine,
	createTestEngine,
	startRenderLoop,
	stopRenderLoop,
	registerResizeHandler,
	disposeEngine,
	type BabylonEngineInstance,
} from './core/engine';

// Camera
export {
	createCamera,
	createHd2dCamera,
	updateCameraTarget,
	rotateTactics,
	switchCameraPreset,
	resetCamera,
	type CameraTargetOptions,
	type RotateTacticsOptions,
	type SwitchCameraPresetOptions,
	type PresetTransitionHandle,
	type ResetCameraOptions,
} from './core/camera-controller';

// Screen shake
export {
	screenShake,
	addTrauma,
	getTrauma,
	resetTrauma,
	stopAllShakes,
	setGlobalScale,
	getGlobalScale,
	setMasterEnabled,
	getMasterEnabled,
	computeEnvelopeMultiplier,
	applyDecay,
	type ShakeHandle,
} from './core/screen-shake';

// Schemas — Screen shake config
export {
	ScreenShakeConfigSchema,
	DecayModeSchema,
	ShakeChannelSchema,
	ShakeEnvelopeSchema,
	ShakeNoiseSchema,
	ShakeDirectionSchema,
	ShakePresetSchema,
	ShakePresetCategorySchema,
	SHAKE_PRESETS,
	type ScreenShakeConfig,
	type DecayMode,
	type ShakeChannel,
	type ShakeEnvelope,
	type ShakeNoise,
	type ShakeDirection,
	type ShakePreset,
	type ShakePresetCategory,
} from './schemas/screen-shake-config';

// Scene setup
export { applySceneSetup } from './rendering/scene-setup';

// Performance monitoring
export {
	createPerformanceMonitor,
	getMetrics,
	disposePerformanceMonitor,
	type PerformanceMonitor,
	type PerformanceMetrics,
} from './core/performance-monitor';

// Debug inspector
export { showInspector, hideInspector } from './core/debug-inspector';

// Schemas — Engine / Camera / Scene / Quality
export { EngineConfigSchema, type EngineConfig } from './schemas/engine-config';
export {
	CameraConfigSchema,
	CameraPresetSchema,
	TransitionEasingSchema,
	type CameraConfig,
	type CameraPreset,
	type TransitionEasing,
} from './schemas/camera-config';
export {
	SceneSetupConfigSchema,
	type SceneSetupConfig,
} from './schemas/scene-setup-config';
export {
	ColorRgbaSchema,
	Vector3Schema,
	type ColorRgba,
	type Vector3,
} from './schemas/color-schema';
// Schemas — Fog config (12 sub-schemas, 77+ options)
export {
	FogConfigSchema,
	FogModeSchema,
	HeightFogSchema,
	SecondFogLayerSchema,
	InscatteringSchema,
	AtmosphericSchema,
	FogNoiseSchema,
	FogWindSchema,
	FogOverlaySchema,
	FogOverlayTextureSchema,
	FogOverlayBlendModeSchema,
	FogOverlayVignetteSchema,
	FogAnimationSchema,
	FogAnimationWaveformSchema,
	FogDayNightSchema,
	FogPerMeshSchema,
	FogPresetSchema,
	type FogConfig,
	type FogMode,
	type HeightFog,
	type SecondFogLayer,
	type Inscattering,
	type Atmospheric,
	type FogNoise,
	type FogWind,
	type FogOverlay,
	type FogOverlayTexture,
	type FogOverlayBlendMode,
	type FogOverlayVignette,
	type FogAnimation,
	type FogAnimationWaveform,
	type FogDayNight,
	type FogPerMesh,
	type FogPreset,
} from './schemas/fog-config';

// Fog manager — PostProcess lifecycle, presets, per-mesh exclusion
export {
	applyFog,
	updateFog,
	applyFogPreset,
	disposeFog,
	type FogHandle,
} from './rendering/fog-manager';

// Fog presets — 14 curated fog configurations
export {
	FOG_PRESETS,
	FOG_PRESET_NAMES,
	type FogPresetName,
} from './rendering/fog-presets';

// Procedural overlay textures — 5 noise-based generators
export {
	generateOverlayTexture,
	OVERLAY_TEXTURE_NAMES,
	TextureDataSchema,
	type TextureData,
	type OverlayTextureName,
} from './rendering/fog-overlay-textures';
export {
	QualityConfigSchema,
	QUALITY_PRESETS,
	type QualityConfig,
	type QualityPresetSettings,
} from './schemas/quality-config';

// Schemas — Map data
export {
	MapDataSchema,
	TileLayerSchema,
	ObjectLayerSchema,
	GroupLayerSchema,
	LayerSchema,
	TilesetConfigSchema,
	TilePropertiesSchema,
	ChunkConfigSchema,
	AutotileTypeSchema,
	LayerTypeSchema,
	MapObjectSchema,
	MapObjectShapeSchema,
	DrawOrderSchema,
	type MapData,
	type TileLayer,
	type ObjectLayer,
	type GroupLayer,
	type Layer,
	type TilesetConfig,
	type TileProperties,
	type ChunkConfig,
	type AutotileType,
	type LayerType,
	type MapObject,
	type MapObjectShape,
	type DrawOrder,
} from './schemas/map-data';

// Schemas — Post-processing config
export {
	PostProcessingConfigSchema,
	BloomConfigSchema,
	DepthOfFieldConfigSchema,
	ToneMappingConfigSchema,
	ColorGradingConfigSchema,
	VignetteConfigSchema,
	GrainConfigSchema,
	SsaoConfigSchema,
	ChromaticAberrationConfigSchema,
	SharpenConfigSchema,
	FxaaConfigSchema,
	DitheringConfigSchema,
	HdrEnvironmentConfigSchema,
	PostProcessingPresetSchema,
	ColorGradingPresetSchema,
	type PostProcessingConfig,
	type BloomConfig,
	type DepthOfFieldConfig,
	type ToneMappingConfig,
	type ColorGradingConfig,
	type VignetteConfig,
	type GrainConfig,
	type SsaoConfig,
	type ChromaticAberrationConfig,
	type SharpenConfig,
	type FxaaConfig,
	type DitheringConfig,
	type HdrEnvironmentConfig,
	type PostProcessingPresetName,
	type ColorGradingPreset,
} from './schemas/post-processing-config';

// Post-processing presets + quality scaling
export {
	POST_PROCESSING_PRESETS,
	getPostProcessingPreset,
	resolvePostProcessingConfig,
	applyQualityScaling,
} from './rendering/post-processing-presets';

// Post-processing pipeline
export {
	createPostProcessingPipeline,
	updatePostProcessingConfig,
	disposePostProcessingPipeline,
	type PostProcessingPipeline,
} from './rendering/post-processing';

// HDR environment
export {
	loadHdrEnvironment,
	applyHdrEnvironmentToScene,
	disposeHdrEnvironment,
	type HdrEnvironmentInstance,
} from './rendering/hdr-environment';

// Tilemap renderer
export {
	renderTilemap,
	disposeTilemap,
	updateTile,
	setLayerVisibility,
	setLayerOpacity,
	type RenderedTilemap,
} from './rendering/tilemap-renderer';

// Tile query
export { getTileProperties } from './rendering/tile-query';

// Tileset loader
export {
	loadTileset,
	computeTileUVs,
	resolveGlobalTileId,
	type LoadedTileset,
} from './rendering/tileset-loader';

// Tile geometry
export { type TileUV } from './rendering/tile-geometry';

// Autotile resolver
export { resolveAutotile, buildAdjacencyBitmask } from './rendering/autotile-resolver';

// Tile animator
export {
	createTileAnimator,
	disposeTileAnimator,
	type TileAnimationManager,
} from './rendering/tile-animator';

// Schemas — Lighting config
export {
	LightingConfigSchema,
	LightConfigSchema,
	PointLightConfigSchema,
	SpotLightConfigSchema,
	DirectionalLightConfigSchema,
	HemisphericLightConfigSchema,
	ShadowConfigSchema,
	FlickerConfigSchema,
	FlickerTypeSchema,
	ShadowTypeSchema,
	ShadowFilterQualitySchema,
	ShadowMapSizeSchema,
	LightFalloffTypeSchema,
	LightIntensityModeSchema,
	VolumetricLightConfigSchema,
	LensFlareConfigSchema,
	LensFlareEntrySchema,
	DayNightCycleConfigSchema,
	TimeKeyframeSchema,
	SunPathConfigSchema,
	GlowLayerConfigSchema,
	GlowTextureFixedSizeSchema,
	GlowQualityPresetNameSchema,
	GLOW_QUALITY_PRESETS,
	SeasonSchema,
	MoonPhaseSchema,
	IndoorModeSchema,
	TransitionEasingSchema as DayNightTransitionEasingSchema,
	TimePhaseSchema,
	type LightingConfig,
	type LightConfig,
	type PointLightConfig,
	type SpotLightConfig,
	type DirectionalLightConfig,
	type HemisphericLightConfig,
	type ShadowConfig,
	type FlickerConfig,
	type FlickerType,
	type ShadowType,
	type ShadowFilterQuality,
	type ShadowMapSize,
	type LightFalloffType,
	type LightIntensityMode,
	type VolumetricLightConfig,
	type LensFlareConfig,
	type LensFlareEntry,
	type DayNightCycleConfig,
	type TimeKeyframe,
	type SunPathConfig,
	type GlowLayerConfig,
	type GlowTextureFixedSize,
	type GlowQualityPresetName,
	type Season,
	type IndoorMode,
	type TransitionEasing as DayNightTransitionEasing,
	type TimePhase,
} from './schemas/lighting-config';

// Color temperature
export { colorTemperatureToRgb } from './rendering/color-temperature';

// Light manager
export {
	createLighting,
	disposeLighting,
	updateLightPosition,
	updateLightIntensity,
	updateLightColor,
	removeLightById,
	type LightingInstance,
	type ManagedLight,
} from './rendering/light-manager';

// Shadow manager
export {
	createShadowGenerator,
	addShadowCasters,
	applyShadowQualityScaling,
	disposeShadowGenerator,
	type ShadowGeneratorInstance,
} from './rendering/shadow-manager';

// Light animation (flicker)
export {
	createFlicker,
	computeFlicker,
	computeColorShift,
	computePositionJitter,
	pseudoNoise,
	disposeFlicker,
	type FlickerInstance,
} from './rendering/light-animation';

// Day/night cycle
export {
	createDayNightCycle,
	interpolateKeyframes,
	computeSunDirection,
	setTimeOfDay,
	getTimeOfDay,
	setSpeed,
	getSpeed,
	setEnabled,
	isEnabled,
	jumpToTime,
	getCurrentPhase,
	setSeason,
	getSeason,
	setIndoorMode,
	getIndoorMode,
	getSeasonSunPath,
	getMoonPhaseInfo,
	applyEasing,
	computeTimePhase,
	getIndoorTint,
	fireCallbacks,
	disposeDayNightCycle,
	DEFAULT_DAY_CYCLE_KEYFRAMES,
	type DayNightCycleInstance,
	type InterpolatedValues,
	type MoonPhaseInfo,
} from './rendering/day-night-cycle';

// Glow manager
export {
	createGlowLayer,
	updateGlowLayer,
	disposeGlowLayer,
	excludeMeshFromGlow,
	includeOnlyMeshInGlow,
	removeMeshFromGlow,
	excludeUiMeshes,
	setCustomEmissiveColor,
	clearCustomEmissiveColor,
} from './rendering/glow-manager';

// Schemas — Sky config
export {
	SkyConfigSchema,
	SkyTypeSchema,
	SkyGradientStopSchema,
	ParallaxLayerSchema,
	BlendModeSchema,
	ParallaxLayerTypeSchema,
	StarsConfigSchema,
	type SkyConfig,
	type SkyType,
	type SkyGradientStop,
	type ParallaxLayer,
	type BlendMode,
	type ParallaxLayerType,
	type StarsConfig,
} from './schemas/sky-config';

// Sky system
export {
	createSky,
	disposeSky,
	generateGradientPixels,
	regenerateGradientTexture,
	updateSkyFromDayNight,
	computeStarOpacity,
	createStarField,
	type SkyInstance,
} from './rendering/sky-system';

// Parallax manager
export {
	createParallax,
	disposeParallax,
	computeParallaxOffset,
	mapBlendMode,
	addParallaxLayer,
	removeParallaxLayer,
	fadeLayerOpacity,
	getParallaxLayerCount,
	setParallaxLayerTint,
	PARALLAX_BG_RENDER_GROUP,
	PARALLAX_FG_RENDER_GROUP,
	type ParallaxInstance,
} from './rendering/parallax-manager';

// Transitions (replaces screen-effects)
export {
	playTransition,
	applyTransitionEasing,
	fadeToBlack,
	fadeToWhite,
	fadeToColor,
	screenFlash,
	screenTint,
	type TransitionHandle,
} from './rendering/transition-manager';

// Transition shader
export {
	createTransitionPostProcess,
	registerTransitionShader,
	TRANSITION_TYPE_MAP,
	TRANSITION_SHADER_NAME,
} from './rendering/transition-shader';

// Schemas — Transition config
export {
	TransitionConfigSchema,
	TransitionTypeSchema,
	TransitionEasingSchema as ScreenTransitionEasingSchema,
	TransitionDirectionSchema,
	TransitionAxisSchema,
	Color3Schema,
	TRANSITION_PRESETS,
	type TransitionConfig,
	type TransitionType,
	type TransitionEasing as ScreenTransitionEasing,
	type TransitionDirection,
	type TransitionAxis,
	type Color3,
} from './schemas/transition-config';
