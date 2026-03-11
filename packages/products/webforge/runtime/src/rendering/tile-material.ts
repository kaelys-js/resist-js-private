/**
 * Tile material factory — StandardMaterial setup for pixel-art tilesets.
 *
 * Creates Babylon.js materials with NEAREST sampling (no interpolation),
 * no mipmaps, no specular, and optional alpha transparency for PNG tilesets.
 *
 * @example
 * ```typescript
 * import { createTileTexture, createTileMaterial } from './tile-material';
 *
 * const tex = createTileTexture({ scene, imagePath: 'tilesets/terrain.png' });
 * if (tex.ok) {
 *   const mat = createTileMaterial({ scene, name: 'terrain', texture: tex.data, hasAlpha: true });
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

import { ERRORS, err } from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// Schemas
// =============================================================================

/** Options schema for {@link createTileTexture}. */
export const CreateTileTextureOptionsSchema = v.pipe(
  v.strictObject({
    /** The Babylon.js scene to create the texture in. */
    scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
    /** Path to the tileset image. */
    imagePath: v.string(),
  }),
  v.readonly(),
);

/** Options for {@link createTileTexture}. */
export type CreateTileTextureOptions = v.InferOutput<typeof CreateTileTextureOptionsSchema>;

/** Options schema for {@link createTileMaterial}. */
export const CreateTileMaterialOptionsSchema = v.pipe(
  v.strictObject({
    /** The Babylon.js scene to create the material in. */
    scene: v.custom<BABYLON.Scene>((val): val is BABYLON.Scene => val instanceof BABYLON.Scene),
    /** Material name. */
    name: v.string(),
    /** Diffuse texture for the material. */
    texture: v.custom<BABYLON.Texture>(
      (val): val is BABYLON.Texture => val instanceof BABYLON.Texture,
    ),
    /** Whether the texture has alpha transparency. */
    hasAlpha: v.boolean(),
  }),
  v.readonly(),
);

/** Options for {@link createTileMaterial}. */
export type CreateTileMaterialOptions = v.InferOutput<typeof CreateTileMaterialOptionsSchema>;

// =============================================================================
// createTileTexture
// =============================================================================

/**
 * Creates a Babylon.js texture configured for pixel-art rendering.
 *
 * Uses NEAREST sampling (no interpolation) and disables mipmaps
 * to preserve sharp pixel edges.
 *
 * @param options - Scene and image path
 * @returns BabylonResult containing the texture
 *
 * @example
 * ```typescript
 * const result = createTileTexture({ scene, imagePath: 'tilesets/terrain.png' });
 * if (result.ok) result.data.samplingMode; // NEAREST
 * ```
 */
export function createTileTexture(
  options: CreateTileTextureOptions,
): BabylonResult<BABYLON.Texture> {
  const { scene, imagePath } = options;

  try {
    const texture: BABYLON.Texture = new BABYLON.Texture(
      imagePath,
      scene,
      true, // noMipmap
      undefined, // invertY
      BABYLON.Texture.NEAREST_SAMPLINGMODE,
    );

    return okShallow(texture);
  } catch (error: unknown) {
    return err(ERRORS.ASSET.IMPORT_FAILED, { cause: fromUnknownError(error) });
  }
}

// =============================================================================
// createTileMaterial
// =============================================================================

/**
 * Creates a StandardMaterial configured for pixel-art tileset rendering.
 *
 * - No specular (flat shading for 2D tiles)
 * - Back-face culling disabled (tiles visible from all angles)
 * - Alpha from diffuse texture when `hasAlpha` is true
 *
 * @param options - Scene, name, texture, and alpha flag
 * @returns BabylonResult containing the material
 *
 * @example
 * ```typescript
 * const result = createTileMaterial({
 *   scene, name: 'terrain', texture, hasAlpha: true,
 * });
 * if (result.ok) result.data.specularColor; // Color3(0,0,0)
 * ```
 */
export function createTileMaterial(
  options: CreateTileMaterialOptions,
): BabylonResult<BABYLON.StandardMaterial> {
  const { scene, name, texture, hasAlpha } = options;

  try {
    const material: BABYLON.StandardMaterial = new BABYLON.StandardMaterial(name, scene);
    material.diffuseTexture = texture;
    material.specularColor = new BABYLON.Color3(0, 0, 0);
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = hasAlpha;

    if (hasAlpha) {
      // Use alpha testing (not blending) for pixel-art tilesets.
      // Binary transparency preserves depth-buffer writes and prevents
      // back-to-front sort artifacts when the camera rotates.
      material.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST;
      material.alphaCutOff = 0.5;
    }

    return okShallow(material);
  } catch (error: unknown) {
    return err(ERRORS.ASSET.IMPORT_FAILED, { cause: fromUnknownError(error) });
  }
}
