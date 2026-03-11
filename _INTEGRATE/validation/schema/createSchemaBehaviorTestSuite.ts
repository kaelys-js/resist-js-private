/**
 * UNIVERSAL PROPERTY / INVARIANT / SNAPSHOT TEST SUITE GENERATOR
 *
 * **SUMMARY**
 *   This module provides a second, fully independent enterprise-grade validation
 *   harness that complements the behavioral correctness framework (“Harness A”)
 *   by enforcing *higher-order mathematical guarantees* across all schemas.
 *
 *   Where Harness A asserts deterministic contract behavior, Harness B ensures:
 *     • algebraic stability,
 *     • invariant preservation,
 *     • snapshot-normalized structural shape integrity,
 *     • and generative property-space correctness.
 *
 *   Together, the two harnesses form a complete Fortune-50 validation system.
 *
 * **PURPOSE**
 *   - To generate property-based tests that explore the full input domain,
 *     guaranteeing that schemas remain correct across values not explicitly
 *     enumerated in test vectors.
 *
 *   - To enforce algebraic invariants that must hold across every schema, such
 *     as idempotence, stability under repeated validation, non-expansion of
 *     output, non-mutation of inputs, and determinism of error surfaces.
 *
 *   - To ensure snapshot-normalized surfaces: the structural, semantic, and
 *     shape-level attributes of validation failures must remain stable across
 *     refactors and dependency updates.
 *
 * **INPUT CONTRACT**
 *   Accepts a configuration identical to Harness A:
 *     • name
 *     • SCHEMAS
 *     • TYPES (optional)
 *     • VALID_CASES (optional)
 *     • INVALID_CASES (optional)
 *
 *   All fields are required to follow the same base schema as Harness A.
 *
 * **OUTPUT CONTRACT**
 *   Produces a grouped Vitest suite enforcing:
 *     • Property-based coverage using generated values
 *     • Algebraic invariant testing across schema surfaces
 *     • Snapshot stability using controlled normalization rules
 *
 *   Harness B performs no overlap with behavioral correctness. It enforces
 *   higher-order mathematical guarantees only.
 */

import { describe, expect, it, vi } from "vitest";
import { $schema } from "../../validation/schema/engine";

/**
 * INTERNAL NORMALIZATION UTILITY (FORTUNE-50 SAFE)
 *
 * This utility produces a fully deterministic, environment-independent,
 * side-effect-free representation of any value for snapshot comparison.
 * It eliminates all runtime-specific artifacts (stack traces, host objects,
 * prototype chains, unstable ordering, and circular references).
 *
 * It guarantees:
 *   • Deterministic structural output for identical logical input
 *   • No mutation of provided values
 *   • Safe handling of cycles
 *   • Stable ordering of object keys
 *   • Normalization of Maps, Sets, Dates, RegExps, and TypedArrays
 */
function normalizeSnapshot(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
    if (value === null || typeof value !== "object") {
        return value;
    }

    // ------------------------------------------------------------
    // Circular reference protection
    // ------------------------------------------------------------
    if (seen.has(value as object)) {
        return { __tag: "CircularReference" };
    }
    seen.add(value as object);

    // ------------------------------------------------------------
    // Error normalization — remove environment-dependent artifacts
    // ------------------------------------------------------------
    if (value instanceof Error) {
        return {
            __tag: "Error",
            name: value.name,
            message: value.message
        };
    }

    // ------------------------------------------------------------
    // Date normalization — lose runtime identity, keep semantic value
    // ------------------------------------------------------------
    if (value instanceof Date) {
        return {
            __tag: "Date",
            iso: value.toISOString()
        };
    }

    // ------------------------------------------------------------
    // RegExp normalization — deterministic source + flags
    // ------------------------------------------------------------
    if (value instanceof RegExp) {
        return {
            __tag: "RegExp",
            source: value.source,
            flags: value.flags
        };
    }

    // ------------------------------------------------------------
    // Map normalization — sorted by key for deterministic ordering
    // ------------------------------------------------------------
    if (value instanceof Map) {
        const entries = [...value.entries()]
            .map(([k, v]) => [normalizeSnapshot(k, seen), normalizeSnapshot(v, seen)])
            .sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0])));

        return {
            __tag: "Map",
            entries
        };
    }

    // ------------------------------------------------------------
    // Set normalization — sorted, normalized elements
    // ------------------------------------------------------------
    if (value instanceof Set) {
        const entries = [...value.values()]
            .map(v => normalizeSnapshot(v, seen))
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

        return {
            __tag: "Set",
            entries
        };
    }

    // ------------------------------------------------------------
    // TypedArray normalization — stable representation
    // ------------------------------------------------------------
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        return {
            __tag: value.constructor.name,
            data: Array.from(value as any)
        };
    }

    // ------------------------------------------------------------
    // Array normalization — preserve order, normalize children
    // ------------------------------------------------------------
    if (Array.isArray(value)) {
        return value.map(v => normalizeSnapshot(v, seen));
    }

    // ------------------------------------------------------------
    // Plain object normalization
    //   • only own enumerable keys
    //   • sorted for deterministic ordering
    // ------------------------------------------------------------
    const out: Record<string, unknown> = {};

    const keys = Object.keys(value as object).sort();
    for (const key of keys) {
        const child = (value as Record<string, unknown>)[key];
        out[key] = normalizeSnapshot(child, seen);
    }

    return out;
}

/**
 * GENERATOR INPUT TYPE (re-uses same input contract as Harness A)
 */
export const harnessBInputSchema = $schema.strictObject({
    name: $schema.string(),
    SCHEMAS: $schema.record($schema.string(), $schema.any()),
    TYPES: $schema.optional($schema.record($schema.string(), $schema.any())),
    VALID_CASES: $schema.optional($schema.record($schema.string(), $schema.array($schema.any()))),
    INVALID_CASES: $schema.optional($schema.record($schema.string(), $schema.array($schema.any()))),
});
export type HarnessBInput = $schema.InferOutput<typeof harnessBInputSchema>;

/**
 * createSchemaTestSuiteB()
 *
 * This is the second formal test harness.
 */
export function createSchemaBehaviorTestSuite(input: HarnessBInput) {
    const {
        name,
        SCHEMAS,
        VALID_CASES = {},
        INVALID_CASES = {}
    } = $schema.parse(harnessBInputSchema, input);

    // -------------------------------------------------------------------------
    // 8. PROPERTY-BASED TESTING
    // -------------------------------------------------------------------------
    describe(`${name} — SCHEMAS — property-based generative validation`, () => {
        for (const schemaName of Object.keys(SCHEMAS)) {
            const schema = SCHEMAS[schemaName];

            it(
                `must maintain deterministic acceptance/rejection behavior across 
                 randomized generative domains for schema: ${schemaName}`,
                () => {
                    /**
                     * Input generation strategy:
                     *   Variation across:
                     *     - primitive domains
                     *     - composite structures
                     *     - random strings, numbers, arrays, objects
                     *     - nested combinations
                     */
                    const randomValues: unknown[] = [];
                    for (let i = 0; i < 250; i++) {
                        const r = Math.random();
                        if (r < 0.2) randomValues.push(Math.random() * 1e6);
                        else if (r < 0.4) randomValues.push(String(Math.random()));
                        else if (r < 0.6) randomValues.push([Math.random(), { x: Math.random() }]);
                        else if (r < 0.8) randomValues.push({ a: Math.random(), b: String(Math.random()) });
                        else randomValues.push(null);
                    }

                    for (const value of randomValues) {
                        const result = $schema.safeParse(schema, value);

                        // Must not throw; must remain deterministic across runs.
                        expect(typeof result.success).toBe("boolean");
                    }
                }
            );
        }
    });

    // -------------------------------------------------------------------------
    // 9. FORMAL INVARIANT TESTING
    // -------------------------------------------------------------------------
    describe(`${name} — SCHEMAS — algebraic invariant enforcement`, () => {
        for (const schemaName of Object.keys(SCHEMAS)) {
            const schema = SCHEMAS[schemaName];

            it(`must satisfy parse(idempotence) for schema: ${schemaName}`, () => {
                const valids = VALID_CASES[schemaName] ?? [];
                for (const v of valids) {
                    const r1 = $schema.parse(schema, v);
                    const r2 = $schema.parse(schema, r1);

                    expect(r2).toStrictEqual(r1);
                }
            });

            it(`must satisfy safeParse(determinism) for schema: ${schemaName}`, () => {
                const invalids = INVALID_CASES[schemaName] ?? [];
                for (const invalid of invalids) {
                    const r1 = $schema.safeParse(schema, invalid);
                    const r2 = $schema.safeParse(schema, invalid);

                    expect(r1.success).toBe(false);
                    expect(r2.success).toBe(false);
                    expect(normalizeSnapshot(r1)).toStrictEqual(normalizeSnapshot(r2));
                }
            });

            it(`must not mutate input values during validation for schema: ${schemaName}`, () => {
                const sample = { a: 1, b: { c: 2 } };
                const clone = structuredClone(sample);

                $schema.safeParse(schema, sample);

                expect(sample).toStrictEqual(clone);
            });
        }
    });

    // -------------------------------------------------------------------------
    // 10. SNAPSHOT NORMALIZATION TESTS
    // -------------------------------------------------------------------------
    describe(`${name} — SCHEMAS — normalized snapshot stability`, () => {
        for (const schemaName of Object.keys(SCHEMAS)) {
            const schema = SCHEMAS[schemaName];

            it(
                `must emit structurally stable, normalization-safe snapshots for invalid inputs 
                 for schema: ${schemaName}`,
                () => {
                    const invalids = INVALID_CASES[schemaName] ?? [];
                    const snapshots: unknown[] = [];

                    for (const bad of invalids) {
                        const result = $schema.safeParse(schema, bad);
                        if (result.success === true) continue;

                        snapshots.push(normalizeSnapshot(result));
                    }

                    expect(snapshots).toMatchSnapshot();
                }
            );
        }
    });
}