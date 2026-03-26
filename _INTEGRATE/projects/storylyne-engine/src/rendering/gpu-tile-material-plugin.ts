/**
 * GPU tile material plugin — MaterialPluginBase for StandardMaterial.
 *
 * Hooks into Babylon.js StandardMaterial shader pipeline via
 * MaterialPluginBase to replace the diffuse texture lookup with
 * data-texture-based tile rendering. All StandardMaterial features
 * (lighting, shadows, fog, glow, post-FX) work unchanged.
 *
 * @example
 * ```typescript
 * import { GpuTileMaterialPlugin } from './gpu-tile-material-plugin';
 *
 * const material = new BABYLON.StandardMaterial('tileMat', scene);
 * const plugin = new GpuTileMaterialPlugin(material);
 * plugin.isEnabled = true;
 * plugin.mapSize = new BABYLON.Vector2(32, 32);
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import type { Num } from '@/schemas/common';

// =============================================================================
// Plugin Constants
// =============================================================================

const PLUGIN_NAME = 'GpuTileMaterialPlugin';
const PLUGIN_PRIORITY: Num = 200;

// =============================================================================
// GpuTileMaterialPlugin
// =============================================================================

/**
 * MaterialPluginBase that overrides StandardMaterial's diffuse color
 * with data-texture tile lookups.
 *
 * The plugin inserts custom GLSL code into the StandardMaterial shader:
 * - Vertex: passes world-space tile coordinates via varying
 * - Fragment: performs texelFetch on data texture, atlas lookup,
 *   flip/rotate/animate, and per-layer color adjustments
 *
 * All StandardMaterial features are preserved:
 * - Hemispheric, directional, point, spot lights
 * - Shadow map receiving
 * - Scene fog
 * - Glow layer inclusion
 * - All post-FX pipeline compatibility
 */
export class GpuTileMaterialPlugin extends BABYLON.MaterialPluginBase {
  /** Map dimensions in tiles. */
  mapSize: BABYLON.Vector2 = new BABYLON.Vector2(1, 1);

  /** Tile pixel dimensions (width, height) — shader computes grid from textureSize. */
  tilePixelSize: BABYLON.Vector2 = new BABYLON.Vector2(32, 32);

  /** Current animation frame (updated per tick). */
  animationFrame: Num = 0;

  /** Layer opacity (0.0–1.0). */
  layerOpacity: Num = 1;

  /** Layer tint color. */
  layerTint: BABYLON.Color4 = new BABYLON.Color4(1, 1, 1, 1);

  /** Layer brightness adjustment (additive). */
  layerBrightness: Num = 0;

  /** Layer saturation (1.0 = normal). */
  layerSaturation: Num = 1;

  /** Layer contrast (1.0 = normal). */
  layerContrast: Num = 1;

  /** Layer offset for parallax/scrolling. */
  layerOffset: BABYLON.Vector2 = new BABYLON.Vector2(0, 0);

  /** Inverse world size — maps world XZ to tile coordinates. */
  invWorldSize: BABYLON.Vector2 = new BABYLON.Vector2(1, 1);

  /** Data texture containing tile IDs + visual flags. */
  tileDataTexture: BABYLON.RawTexture | null = null;

  /** Tileset atlas texture. */
  tileAtlas: BABYLON.Texture | null = null;

  private _isEnabled = false;

  /**
   * Creates a new GPU tile material plugin.
   *
   * @param material - The StandardMaterial to extend
   */
  constructor(material: BABYLON.StandardMaterial) {
    super(material, PLUGIN_NAME, PLUGIN_PRIORITY, { GPU_TILE: false });
  }

  /**
   * Whether the plugin is enabled.
   *
   * @returns True if the plugin is active
   */
  get isEnabled(): boolean {
    return this._isEnabled;
  }

  set isEnabled(enabled: boolean) {
    if (this._isEnabled === enabled) return;
    this._isEnabled = enabled;
    this.markAllDefinesAsDirty();
    this._enable(this._isEnabled);
  }

  /** @returns The plugin class name. */
  override getClassName(): string {
    return PLUGIN_NAME;
  }

  /**
   * Prepares shader defines.
   *
   * @param defines - The defines object
   */
  // oxlint-disable-next-line typescript/no-explicit-any -- Babylon.js API uses MaterialDefines which varies
  override prepareDefines(defines: any): void {
    defines.GPU_TILE = this._isEnabled;
  }

  /**
   * Declares sampler names used by the plugin.
   *
   * @param samplers - Array to push sampler names into
   */
  override getSamplers(samplers: string[]): void {
    samplers.push('tileDataTexture', 'tileAtlas');
  }

  /**
   * Declares uniform definitions for the plugin.
   *
   * @returns UBO and fragment uniform declarations
   */
  override getUniforms(): {
    ubo: Array<{ name: string; size: Num; type: string }>;
    vertex: string;
    fragment: string;
  } {
    return {
      ubo: [
        { name: 'gpuMapSize', size: 2, type: 'vec2' },
        { name: 'gpuTilePixelSize', size: 2, type: 'vec2' },
        { name: 'gpuAnimationFrame', size: 1, type: 'float' },
        { name: 'gpuLayerOpacity', size: 1, type: 'float' },
        { name: 'gpuLayerTint', size: 4, type: 'vec4' },
        { name: 'gpuLayerBrightness', size: 1, type: 'float' },
        { name: 'gpuLayerSaturation', size: 1, type: 'float' },
        { name: 'gpuLayerContrast', size: 1, type: 'float' },
        { name: 'gpuLayerOffset', size: 2, type: 'vec2' },
        { name: 'gpuInvWorldSize', size: 2, type: 'vec2' },
      ],
      vertex: `
				#ifdef GPU_TILE
					uniform vec2 gpuMapSize;
					uniform vec2 gpuInvWorldSize;
				#endif
			`,
      fragment: `
				#ifdef GPU_TILE
					uniform vec2 gpuMapSize;
					uniform vec2 gpuTilePixelSize;
					uniform float gpuAnimationFrame;
					uniform float gpuLayerOpacity;
					uniform vec4 gpuLayerTint;
					uniform float gpuLayerBrightness;
					uniform float gpuLayerSaturation;
					uniform float gpuLayerContrast;
					uniform vec2 gpuLayerOffset;
					uniform vec2 gpuInvWorldSize;
				#endif
			`,
    };
  }

  /**
   * Binds uniform values when the material is applied to a submesh.
   *
   * @param uniformBuffer - The uniform buffer to update
   */
  override bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    if (!this._isEnabled) return;

    uniformBuffer.updateFloat2('gpuMapSize', this.mapSize.x, this.mapSize.y);
    uniformBuffer.updateFloat2('gpuTilePixelSize', this.tilePixelSize.x, this.tilePixelSize.y);
    uniformBuffer.updateFloat('gpuAnimationFrame', this.animationFrame);
    uniformBuffer.updateFloat('gpuLayerOpacity', this.layerOpacity);
    uniformBuffer.updateFloat4(
      'gpuLayerTint',
      this.layerTint.r,
      this.layerTint.g,
      this.layerTint.b,
      this.layerTint.a,
    );
    uniformBuffer.updateFloat('gpuLayerBrightness', this.layerBrightness);
    uniformBuffer.updateFloat('gpuLayerSaturation', this.layerSaturation);
    uniformBuffer.updateFloat('gpuLayerContrast', this.layerContrast);
    uniformBuffer.updateFloat2('gpuLayerOffset', this.layerOffset.x, this.layerOffset.y);
    uniformBuffer.updateFloat2('gpuInvWorldSize', this.invWorldSize.x, this.invWorldSize.y);

    // Bind textures
    if (this.tileDataTexture) {
      uniformBuffer.setTexture('tileDataTexture', this.tileDataTexture);
    }
    if (this.tileAtlas) {
      uniformBuffer.setTexture('tileAtlas', this.tileAtlas);
    }
  }

  /**
   * Returns custom shader code to inject into the StandardMaterial shader.
   *
   * @param shaderType - 'vertex' or 'fragment'
   * @returns Custom code hooks or null
   */
  override getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `
					#ifdef GPU_TILE
						varying vec2 vWorldTilePos;
					#endif
				`,
        CUSTOM_VERTEX_MAIN_END: `
					#ifdef GPU_TILE
						vWorldTilePos = vPositionW.xz * gpuInvWorldSize;
					#endif
				`,
      };
    }

    if (shaderType === 'fragment') {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
					#ifdef GPU_TILE
						uniform sampler2D tileDataTexture;
						uniform sampler2D tileAtlas;
						varying vec2 vWorldTilePos;
					#endif
				`,
        CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
					#ifdef GPU_TILE
						vec2 tilePos = vWorldTilePos + gpuLayerOffset;
						ivec2 tileCoord = ivec2(floor(tilePos));

						if (tileCoord.x < 0 || tileCoord.y < 0 ||
							tileCoord.x >= int(gpuMapSize.x) || tileCoord.y >= int(gpuMapSize.y)) {
							discard;
						}

						vec4 tileData = texelFetch(tileDataTexture, tileCoord, 0);
						uint gpuTileId = uint(tileData.r);
						uint gpuFlags = uint(tileData.g);

						if (gpuTileId == 0u) {
							discard;
						}

						// Decode visual flags
						bool gpuFlipH = (gpuFlags & 0x1u) != 0u;
						bool gpuFlipV = ((gpuFlags >> 1u) & 0x1u) != 0u;
						uint gpuRotation = (gpuFlags >> 2u) & 0x3u;
						uint gpuTileOpacity = (gpuFlags >> 4u) & 0xFu;
						uint gpuAnimBase = (gpuFlags >> 16u) & 0xFFu;
						uint gpuAnimCount = (gpuFlags >> 24u) & 0xFu;

						// Animation
						uint gpuFinalTileId = gpuTileId;
						if (gpuAnimCount > 0u) {
							gpuFinalTileId = gpuTileId + gpuAnimBase + (uint(gpuAnimationFrame) % gpuAnimCount);
						}

						// Compute atlas grid from actual texture dimensions (tileset-agnostic)
						vec2 gpuAtlasPixels = vec2(textureSize(tileAtlas, 0));
						vec2 gpuAtlasGrid = floor(gpuAtlasPixels / gpuTilePixelSize);
						vec2 gpuTileUvSize = gpuTilePixelSize / gpuAtlasPixels;

						// Convert 1-based tile ID to 0-based atlas index (ID 0 = empty, ID 1 = first tile)
						uint gpuAtlasIdx = gpuFinalTileId - 1u;
						uint gpuAtlasCol = gpuAtlasIdx % uint(gpuAtlasGrid.x);
						uint gpuAtlasRow = gpuAtlasIdx / uint(gpuAtlasGrid.x);
						vec2 subTilePos = fract(tilePos);

						if (gpuFlipH) subTilePos.x = 1.0 - subTilePos.x;
						if (gpuFlipV) subTilePos.y = 1.0 - subTilePos.y;

						if (gpuRotation == 1u) {
							float tmp = subTilePos.x;
							subTilePos.x = subTilePos.y;
							subTilePos.y = 1.0 - tmp;
						} else if (gpuRotation == 2u) {
							subTilePos = 1.0 - subTilePos;
						} else if (gpuRotation == 3u) {
							float tmp = subTilePos.x;
							subTilePos.x = 1.0 - subTilePos.y;
							subTilePos.y = tmp;
						}

						vec2 gpuHalfTexel = 0.5 / gpuAtlasPixels;
						vec2 gpuAtlasUV = vec2(float(gpuAtlasCol), float(gpuAtlasRow)) * gpuTileUvSize
							+ subTilePos * (gpuTileUvSize - 2.0 * gpuHalfTexel)
							+ gpuHalfTexel;

						vec4 gpuTileColor = texture2D(tileAtlas, gpuAtlasUV);

						if (gpuTileColor.a < 0.5) {
							discard;
						}

						// Per-tile opacity
						float gpuOpacity = float(gpuTileOpacity) / 15.0;
						gpuTileColor.a *= gpuOpacity * gpuLayerOpacity;

						// Per-layer adjustments
						gpuTileColor *= gpuLayerTint;
						gpuTileColor.rgb += vec3(gpuLayerBrightness);
						float gpuLum = dot(gpuTileColor.rgb, vec3(0.299, 0.587, 0.114));
						gpuTileColor.rgb = mix(vec3(gpuLum), gpuTileColor.rgb, gpuLayerSaturation);
						gpuTileColor.rgb = (gpuTileColor.rgb - 0.5) * gpuLayerContrast + 0.5;
						gpuTileColor = clamp(gpuTileColor, 0.0, 1.0);

						// Override the base color that StandardMaterial will use for lighting
						color = gpuTileColor;
					#endif
				`,
      };
    }

    return null;
  }
}
