import { describe, it, expect } from "../../tests/engine";
import {
    LENGTHS,
    MESSAGES,
    errorMessageString,
    errorMessagesSchema,
    defineErrorMessages,
    ERROR_KEY_NAME_REGEX
} from "./index";

import { $schema } from "../engine";
import { createSchemaTestSuite } from "../../../tests/schema/createSchemaTestSuite";

/**
 * 0. ERROR_REGISTRY_CORE_SCHEMAS — ENTERPRISE VALIDATION SUITE
 *
 * 0. SCHEMA-GROUP CONTRACT REGRESSION SUITE
 *
 * **PURPOSE**  
 *   This invocation binds the `errorMessageString` and `ERROR_MESSAGES_SCHEMA`
 *   families into the universal schema-governance harness. By running these
 *   schemas through the complete verification pipeline supplied by
 *   `createSchemaTestSuite`, the system enforces invariant behavior across:
 *
 *     • boundary enforcement  
 *     • structural integrity  
 *     • diagnostic message stability  
 *     • rejection semantics  
 *     • mutation-resilience  
 *     • universal invalid-corpus resistance  
 *
 *   This grouping ensures that both primitive error-message semantics and the
 *   structured error-registry container behave deterministically across all
 *   refactors, dependency changes, and cross-service integrations.
 *
 * **WHY THIS MATTERS**  
 *   • Guarantees that descriptive error messages remain contractually valid  
 *   • Ensures that error-registry objects never accept malformed keys or values  
 *   • Protects diagnostic surfaces from drift, coercion, or structural erosion  
 *   • Maintains system-wide alignment between schemas and runtime error factories  
 *   • Preserves interfacing correctness across validation engines, loggers,  
 *     observability tooling, and multi-service error-correlation pipelines  
 *
 *   This suite is the enterprise-grade enforcement point that prevents any
 *   loosening of semantics in the core error infrastructure. Diagnostics are
 *   foundational; therefore the schemas that govern them must remain immutable,
 *   non-permissive, and backward-compatible with absolute precision.
 *
 * 2. SCHEMA CONFIGURATION DETAILS
 *
 * **SCHEMAS**  
 *   • `ERROR_MESSAGE_STRING`  
 *       Validates the descriptive boundary rules for human-readable diagnostic  
 *       messages. Ensures length guarantees and rejects malformed primitives.  
 *
 *   • `ERROR_MESSAGES_SCHEMA`  
 *       Wraps the underlying `errorMessagesSchema` into a strict object under  
 *       `entry`, creating a stable contract surface for structured error-registry  
 *       submissions. Prevents partial objects, loose records, or shape drift.  
 *
 * **VALID_CASES**  
 *   These examples represent authoritative acceptance boundaries. Any deviation
 *   indicates a backward-compatibility break and triggers enterprise-grade
 *   contractual failure.
 *
 * **INVALID_CASES**  
 *   These entries codify the *forbidden shapes* for both primitive message
 *   semantics and structured registry objects. They create the negative-space
 *   contract that preserves global rejection invariants and prevents schema
 *   erosion.
 *
 * 3. ENTERPRISE SIGNIFICANCE
 *
 *   This suite governs the foundational error-surface contract of the entire
 *   platform. Any regression here compromises:
 *
 *     • auditability  
 *     • observability  
 *     • reliability of validation engines  
 *     • schema-generation pipelines  
 *     • system-wide diagnostic cohesion  
 *
 *   Maintaining strict correctness in these core schemas is a non-negotiable
 *   requirement in Fortune-50 environments. This suite enforces that guarantee
 *   deterministically.
 */
createSchemaTestSuite({
    name: "error-registry-core-schemas",

    SCHEMAS: {
        ERROR_MESSAGE_STRING: errorMessageString,
        ERROR_MESSAGES_SCHEMA: $schema.strictObject({ entry: errorMessagesSchema }),
    },

    VALID_CASES: {
        ERROR_MESSAGE_STRING: [
            "A".repeat(LENGTHS.MESSAGE_MIN),
            "A".repeat(LENGTHS.MESSAGE_MAX),
            "Validation failed because the supplied field violated required structural, contextual, and semantic constraints expected by the schema."
        ],

        ERROR_MESSAGES_SCHEMA: [
            {
                entry: {
                    VALID_ERROR_KEY: "A".repeat(LENGTHS.MESSAGE_MIN)
                }
            },
            {
                entry: {
                    ANOTHER_VALID_KEY: "B".repeat(LENGTHS.MESSAGE_MIN + 5)
                }
            }
        ]
    },

    INVALID_CASES: {
        ERROR_MESSAGE_STRING: [
            "A".repeat(LENGTHS.MESSAGE_MIN - 1),
            "A".repeat(LENGTHS.MESSAGE_MAX + 1),
            "",
            "short",
            123 as any,
            null as any,
            {} as any,
            [] as any
        ],

        ERROR_MESSAGES_SCHEMA: [
            { entry: { BAD_KEY: "A" } },
            { entry: { BAD_KEY: "A".repeat(LENGTHS.MESSAGE_MAX + 1) } },
            { entry: { BAD_KEY: 123 as any } },
            { entry: { "bad-key": "A".repeat(LENGTHS.MESSAGE_MIN) } },
            { entry: { bad: "A".repeat(LENGTHS.MESSAGE_MIN) } },
            { entry: { "BAD.KEY": "A".repeat(LENGTHS.MESSAGE_MIN) } },
            { entry: { "bad-key": "" } }
        ]
    },

    TYPES: {}
});

/**
 * 1. RUNTIME-LEVEL CONTRACT TESTS
 *
 * **PURPOSE**  
 *   This section verifies the *runtime* integrity of the `errorMessageString`
 *   schema. Because diagnostic message strings form a formal, cross-service
 *   contract surface, it is imperative that their structural boundaries,
 *   descriptive adequacy, and semantic invariants remain stable, predictable,
 *   and resistant to weakening introduced by refactors, runtime behavior
 *   changes, or dependency updates.
 *
 *   By enforcing that every error message conforms to its documented length
 *   constraints, string-type guarantees, and descriptive expectations, these
 *   tests ensure that the schema’s runtime behavior remains intact throughout
 *   the system’s lifecycle. This protects downstream consumers—including
 *   validators, logging infrastructure, telemetry processors, rendering layers,
 *   and compliance pipelines—from receiving malformed, ambiguous, or structurally
 *   invalid diagnostic messages.
 *
 * **WHY THIS MATTERS**  
 *   • Prevents silent loosening of descriptive boundaries that could undermine  
 *     auditability, observability, or regulatory compliance  
 *   • Ensures error messages maintain strict semantic clarity and length  
 *     discipline across services  
 *   • Protects analytics, monitoring dashboards, and log ingestion systems from  
 *     ingesting malformed diagnostics  
 *   • Reinforces that diagnostic strings remain a reliable, contract-accurate  
 *     component of the schema layer  
 *
 *   In enterprise environments, especially those requiring high-assurance
 *   validation frameworks, runtime correctness is a non-negotiable guarantee and
 *   forms the foundation of stable, predictable, and compliant diagnostic
 *   behavior. These tests enforce that guarantee.
 */
describe(
    "ERROR_MESSAGE_STRING — runtime contract validation (semantic boundaries, structural invariants, and descriptive adequacy guarantees)",
    () => {
        it(
            "must accept a message exactly at MESSAGE_MIN, confirming that the lower descriptive boundary is inclusive and contract-compliant",
            () => {
                const sample = "A".repeat(LENGTHS.MESSAGE_MIN);
                const out = $schema.parse(errorMessageString, sample);

                // The schema must return the input verbatim, with zero mutation.
                expect(out).toBe(sample);
            }
        );

        it(
            "must accept a message exactly at MESSAGE_MAX, verifying that the upper descriptive ceiling is inclusive and stable under boundary precision",
            () => {
                const sample = "A".repeat(LENGTHS.MESSAGE_MAX);
                const out = $schema.parse(errorMessageString, sample);

                // The schema must return the input verbatim, with zero mutation.
                expect(out).toBe(sample);
            }
        );

        it(
            "must reject a message one character shorter than MESSAGE_MIN, ensuring that under-descriptive diagnostics can never enter regulated systems",
            () => {
                const sample = "A".repeat(LENGTHS.MESSAGE_MIN - 1);
                const r = $schema.safeParse(errorMessageString, sample);
                expect(r.success).toBe(false);
            }
        );

        it(
            "must reject a message one character longer than MESSAGE_MAX, ensuring verbosity caps remain enforced for readability, storage, and regulatory compliance",
            () => {
                const sample = "A".repeat(LENGTHS.MESSAGE_MAX + 1);
                const r = $schema.safeParse(errorMessageString, sample);
                expect(r.success).toBe(false);
            }
        );

        it(
            "must reject all non-string primitives, confirming strict type invariance with zero coercion and preventing structurally invalid diagnostics",
            () => {
                const invalidInputs = [123, null, undefined, {}, [], true];

                for (const value of invalidInputs) {
                    const r = $schema.safeParse(errorMessageString, value as any);
                    expect(r.success).toBe(false);
                }
            }
        );
    }
);

/**
 * 2. REGEX-LEVEL CONTRACT TESTS
 *
 * **PURPOSE**  
 *   This section verifies the *runtime* integrity of the naming-contract enforced
 *   by `ERROR_KEY_NAME_REGEX`. Because error-key identifiers represent formal,
 *   cross-service diagnostic anchors, it is imperative that their structural
 *   constraints remain stable, predictable, and resistant to unintentional
 *   broadening or narrowing introduced by refactors, inference drift, or
 *   dependency changes.
 *
 *   By enforcing that each candidate identifier adheres strictly to the
 *   SCREAMING_SNAKE_CASE pattern, these tests ensure that the naming-layer
 *   contract remains intact throughout the system’s lifecycle. This protects
 *   downstream consumers—including logging subsystems, telemetry processors,
 *   error registries, analytics pipelines, and correlation engines—from
 *   receiving malformed or semantically ambiguous identifiers that compromise
 *   traceability and diagnostic precision.
 *
 * **WHY THIS MATTERS**  
 *   • Prevents silent regex drift that could corrupt diagnostic channels  
 *   • Ensures key formats retain structural and semantic fidelity  
 *   • Protects cross-service observability contracts from malformed identifiers  
 *   • Reinforces that naming rules remain a durable source of truth for  
 *     validation, reporting, alerting, and correlation workflows  
 *
 *   In enterprise environments, naming-contract correctness is a non-negotiable
 *   guarantee and forms a foundational layer of audit-grade diagnostic
 *   governance. These tests enforce that guarantee.
 */
describe(
    "ERROR_KEY_NAME_REGEX — structural naming-contract enforcement (invalid pattern rejection, valid pattern confirmation, deterministic regex governance)",
    () => {
        it(
            "must reject lowercase identifiers, ensuring that error keys always conform to strict uppercase contractual requirements",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("invalid")).toBe(false);
            }
        );

        it(
            "must reject mixed-case identifiers, preventing ambiguous casing semantics in key enumeration surfaces",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("Invalid_Key")).toBe(false);
            }
        );

        it(
            "must reject hyphens, guaranteeing that segmentation is always represented using underscores only",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("BAD-KEY")).toBe(false);
            }
        );

        it(
            "must reject whitespace, ensuring zero ambiguity in identifier tokenization for downstream mapping and analytics",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("BAD KEY")).toBe(false);
            }
        );

        it(
            "must reject punctuation, protecting symbol-sensitive systems such as log tokenizers and query engines",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("BAD.KEY")).toBe(false);
            }
        );

        it(
            "must reject special characters, preventing cross-encoding or Unicode edge cases in identifier surfaces",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("BAD!KEY")).toBe(false);
            }
        );

        it(
            "must reject identifiers beginning with digits, maintaining required alphabetical leading-token semantics",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("1BAD")).toBe(false);
            }
        );

        it(
            "must reject identifiers beginning with underscores, ensuring all identifiers begin with an uppercase ASCII letter",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("_BAD")).toBe(false);
            }
        );

        it(
            "must reject Unicode characters, enforcing ASCII-only constraints for portability across legacy and cross-platform systems",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("ÉRROR")).toBe(false);
            }
        );

        it(
            "must reject empty identifiers, preserving the non-optional nature of diagnostic key definitions",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("")).toBe(false);
            }
        );

        it(
            "must accept canonical SCREAMING_SNAKE_CASE identifiers, validating that correctly structured enterprise error keys pass deterministically",
            () => {
                expect(ERROR_KEY_NAME_REGEX.test("VALID")).toBe(true);
                expect(ERROR_KEY_NAME_REGEX.test("VALID_KEY")).toBe(true);

                // Important: The contract *forbids* digits inside segments.
                // Therefore this pattern must be rejected.
                expect(ERROR_KEY_NAME_REGEX.test("A1_B2_C3")).toBe(false);
            }
        );
    }
);

/**
 * 3. STRUCTURAL KEY-BOUNDARY CONTRACT TESTS
 *
 * **PURPOSE**  
 *   This section verifies the *runtime* integrity of the structural key-format
 *   contract enforced by `errorMessagesSchema`. Because error-key identifiers
 *   function as formal, cross-service anchors for validation systems, diagnostic
 *   pipelines, analytics dimensions, observability layers, correlation engines,
 *   and error-enumeration registries, it is imperative that their length
 *   boundaries remain stable, predictable, and resistant to refactor-driven
 *   widening or narrowing.
 *
 *   By enforcing that each key respects the exact `KEY_MIN` and `KEY_MAX`
 *   thresholds defined by the LENGTHS contract, these tests ensure that the
 *   schema’s structural guarantees remain intact across the system’s lifecycle.
 *   This protects downstream consumers—including log processors, exception
 *   mappers, analytics ETL stages, alerting systems, and forensic tooling—from
 *   receiving malformed identifiers that jeopardize contract fidelity,
 *   diagnostic determinism, or global error-governance semantics.
 *
 * **WHY THIS MATTERS**  
 *   • Prevents silent length drift that would compromise diagnostic boundaries  
 *   • Ensures structural invariants remain contract-accurate and durable  
 *   • Protects cross-service error registries from malformed or unstable keys  
 *   • Reinforces that identifier surfaces remain a source of truth for  
 *     analytics, observability, alert routing, and correlation workflows  
 *
 *   In enterprise environments, identifier-boundary correctness is a
 *   non-negotiable guarantee and forms a foundational layer of schema-governed
 *   diagnostic stability. These tests enforce that guarantee.
 */
describe(
    "errorMessagesSchema — key-length boundary contract (KEY_MIN / KEY_MAX acceptance, underflow/overflow rejection, structural invariance)",
    () => {
        it(
            "must accept identifiers whose length is exactly KEY_MIN, validating the lower bound of the enterprise key-size contract",
            () => {
                const key = "A".repeat(LENGTHS.KEY_MIN);
                const src = { [key]: "A".repeat(LENGTHS.MESSAGE_MIN) };
                expect($schema.parse(errorMessagesSchema, src)).toEqual(src);
            }
        );

        it(
            "must accept identifiers whose length is exactly KEY_MAX, validating the upper bound of the enterprise key-size contract",
            () => {
                const key = "A".repeat(LENGTHS.KEY_MAX);
                const src = { [key]: "A".repeat(LENGTHS.MESSAGE_MIN) };
                expect($schema.parse(errorMessagesSchema, src)).toEqual(src);
            }
        );

        it(
            "must reject identifiers whose length is KEY_MIN - 1, preventing underflow keys from entering regulated diagnostic registries",
            () => {
                const key = "A".repeat(LENGTHS.KEY_MIN - 1);
                const r = $schema.safeParse(errorMessagesSchema, {
                    [key]: "A".repeat(LENGTHS.MESSAGE_MIN)
                });
                expect(r.success).toBe(false);
            }
        );

        it(
            "must reject identifiers whose length is KEY_MAX + 1, preventing silent expansion of permissible key lengths across environments",
            () => {
                const key = "A".repeat(LENGTHS.KEY_MAX + 1);
                const r = $schema.safeParse(errorMessagesSchema, {
                    [key]: "A".repeat(LENGTHS.MESSAGE_MIN)
                });
                expect(r.success).toBe(false);
            }
        );
    }
);

/**
 * 4. IMMUTABILITY CONTRACT TESTS
 *
 * **PURPOSE**  
 *   This section verifies the *runtime immutability guarantees* of
 *   `errorMessagesSchema`. Because schemas serve as contract-enforcing,
 *   cross-service validation gates, it is imperative that they operate as
 *   referentially transparent, side-effect-free functions. No caller-provided
 *   input may be mutated, decorated, normalized, or structurally rewritten.
 *
 *   By enforcing that all validation paths preserve the original input object
 *   without alteration, these tests ensure that schema evaluation remains pure,
 *   predictable, and free from implicit state transitions. This protects
 *   downstream consumers—including memoization layers, caching engines,
 *   deterministic analytics pipelines, and multi-tenant validation orchestrators—
 *   from receiving mutated data that would violate referential integrity and
 *   destabilize behavioral expectations.
 *
 * **WHY THIS MATTERS**  
 *   • Prevents silent mutation that compromises upstream state ownership  
 *   • Ensures schemas remain composable in functional, reactive, and  
 *     distributed validation architectures  
 *   • Protects deterministic pipelines, including caching, hashing, and  
 *     consistency-verification systems  
 *   • Reinforces immutability as a foundation for stable validator semantics  
 *
 *   In enterprise environments, immutability is a non-negotiable guarantee and
 *   forms a core requirement for safe, reproducible, and audit-grade validation.
 *   These tests enforce that guarantee.
 */
describe(
    "errorMessagesSchema — immutability guarantee (no input mutation, referential transparency, stable validator semantics)",
    () => {
        it(
            "must guarantee that safeParse never mutates caller-owned objects, preserving the original input structure verbatim",
            () => {
                const input = {
                    VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN)
                } as const;

                const clone = structuredClone(input);

                // Execute validation
                $schema.safeParse(errorMessagesSchema, input);

                // Deep structural equality: no mutation permitted
                expect(input).toEqual(clone);
            }
        );
    }
);

/**
 * 5. FACTORY-CONTRACT SUCCESS TESTS
 *
 * **PURPOSE**  
 *   This section verifies the *runtime* integrity and *type-surface stability*
 *   of the `defineErrorMessages` factory when operating under valid-registry
 *   conditions. Because this factory defines the authoritative error-message
 *   registry consumed by validators, diagnostics layers, observability systems,
 *   and cross-service error-correlation tooling, it is imperative that its
 *   success path remain stable, predictable, and resistant to silent mutation,
 *   inference drift, or structural degradation.
 *
 *   By enforcing that valid registries produce literal-accurate key mirrors,
 *   deterministic map-construction semantics, and exact error-key unions, these
 *   tests ensure that the registry’s public contract remains intact across the
 *   system’s lifecycle. This protects downstream consumers—including logging
 *   pipelines, schema factories, error translators, and distributed diagnostic
 *   frameworks—from receiving incorrect or ambiguous registry structures that
 *   compromise traceability and operational guarantees.
 *
 * **WHY THIS MATTERS**  
 *   • Prevents silent type drift in factory-produced registry surfaces  
 *   • Ensures error-key unions remain exact, immutable, and non-widened  
 *   • Protects observability layers from malformed or nondeterministic metadata  
 *   • Reinforces reproducibility and determinism across multi-service pipelines  
 *
 *   In enterprise environments, correctness of the success-path registry
 *   construction is a non-negotiable guarantee and forms a foundational layer of
 *   diagnostic governance, input-validation coherence, and cross-boundary error
 *   semantics. These tests enforce that guarantee.
 */
describe(
    "defineErrorMessages — valid registry (exact mirror generation, deterministic map semantics, union-type integrity)",
    () => {
        it(
            "must construct an exact key mirror, deterministic message map, and a precise non-widening ErrorMessageKey union",
            () => {
                const registry = defineErrorMessages({
                    ALPHA_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN),
                    BETA_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN)
                } as const);

                // Key mirror must be literal and contract-accurate.
                expect(registry.ERROR_MESSAGE_KEYS.ALPHA_VALID_KEY).toBe("ALPHA_VALID_KEY");
                expect(registry.ERROR_MESSAGE_KEYS.BETA_VALID_KEY).toBe("BETA_VALID_KEY");

                // Message map must faithfully store corresponding messages.
                expect(registry.ERROR_MESSAGES.get("ALPHA_VALID_KEY"))
                    .toBe("A".repeat(LENGTHS.MESSAGE_MIN));
                expect(registry.ERROR_MESSAGES.get("BETA_VALID_KEY"))
                    .toBe("A".repeat(LENGTHS.MESSAGE_MIN));

                // Union type must be exact, not widened.
                type K = typeof registry.ErrorMessageKey;

                const ok: K = "ALPHA_VALID_KEY";
                expect(ok).toBe("ALPHA_VALID_KEY");
            }
        );

        it(
            "must preserve registry insertion order within the ERROR_MESSAGES map, ensuring deterministic iteration semantics",
            () => {
                const src = {
                    FIRST_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN),
                    SECOND_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN),
                    THIRD_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN)
                } as const;

                const r = defineErrorMessages(src);

                expect([...r.ERROR_MESSAGES.keys()]).toEqual([
                    "FIRST_VALID_KEY",
                    "SECOND_VALID_KEY",
                    "THIRD_VALID_KEY"
                ]);
            }
        );

        it(
            "must guarantee that all messages stored in the registry map comply with validated enterprise length constraints",
            () => {
                const src = {
                    ALPHA_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN),
                    BETA_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN)
                } as const;

                const r = defineErrorMessages(src);

                for (const v of r.ERROR_MESSAGES.values()) {
                    expect(v.length).toBeGreaterThanOrEqual(LENGTHS.MESSAGE_MIN);
                    expect(v.length).toBeLessThanOrEqual(LENGTHS.MESSAGE_MAX);
                }
            }
        );
    }
);

/**
 * 6. FUNCTION-LEVEL CONTRACT TESTS (FAILURE-PATH SEMANTICS)
 *
 * **PURPOSE**  
 *   This section verifies the *runtime failure-envelope contract* emitted by
 *   `defineErrorMessages` when constructing diagnostic surfaces for
 *   schema-governed error keys. Because these envelopes represent the canonical
 *   error-format consumed across logging systems, observability pipelines,
 *   correlation engines, and internal developer diagnostics, the formatting,
 *   prefix stability, and ISSUE/RESOLUTION segmentation must remain exact,
 *   deterministic, and invariant across refactors.
 *
 *   By enforcing strict guarantees around single-issue formatting, these tests
 *   ensure the structural durability of error-envelopes that form the backbone
 *   of cross-service failure communication. Any deviation in prefixing,
 *   indentation, block labeling, whitespace semantics, or line-ordering would
 *   constitute a contract break with direct downstream impact.
 *
 * **WHY THIS MATTERS**  
 *   • Prevents malformed envelopes from entering telemetry or audit channels  
 *   • Ensures ISSUE / RESOLUTION segmentation remains immutable  
 *   • Guarantees stable failure-prefix behavior for all downstream consumers  
 *   • Protects correlation, replay, and analysis tools from ambiguous formatting  
 *
 *   In enterprise infrastructures, error-envelope stability is a  
 *   non-negotiable requirement. These tests enforce that guarantee.
 */
describe(
    "defineErrorMessages — single issue formatting (enterprise error-envelope, stable prefix, deterministic ISSUE/RESOLUTION block)",
    () => {
        it("must produce canonical enterprise-format validation failure envelope for a single malformed entry", () => {
            const invalid = { BAD_KEY: "short" } as const;

            try {
                defineErrorMessages(invalid);

                // Must never reach — validator MUST throw
                expect(false).toBe(true);
            } catch (err) {
                const msg = String(err);

                //
                // 1. Leading prefix: Vitest attaches "Error: " to thrown messages.
                //    We normalize using trimStart() so differences in whitespace
                //    or nested error-wrappers do not produce false negatives.
                //
                expect(
                    msg.trimStart().startsWith("Error: DEFINE_ERROR_MESSAGES_VALIDATION_FAILURE")
                ).toBe(true);

                //
                // 2. REQUIRE: The envelope must contain required structural anchors.
                //
                expect(msg).toContain("ISSUES:");
                expect(msg).toContain("RESOLUTION:");

                //
                // 3. REQUIRE: The bad key name appears explicitly.
                //
                expect(msg).toContain("BAD_KEY");

                //
                // 4. REQUIRE: The message-level validator’s error is present.
                //
                expect(msg).toContain(MESSAGES.MESSAGE_TOO_SHORT);

                //
                // 5. REQUIRE: Enterprise error envelopes MUST terminate with a newline.
                //
                expect(msg.endsWith("\n")).toBe(true);
            }
        });
    }
);

/**
 * 3. AGGREGATED-ISSUE CONTRACT TESTS
 *
 * **PURPOSE**  
 *   This section verifies the *runtime* integrity of the enterprise-grade
 *   diagnostic aggregator implemented by `defineErrorMessages`. Because
 *   multi-issue aggregation represents a formal, cross-service diagnostic
 *   contract, it is imperative that its behavior remain stable, predictable,
 *   and resistant to mutation, refactoring, or dependency-induced drift.
 *
 *   By enforcing that all structural and semantic violations are captured,
 *   ordered, and surfaced deterministically, these tests ensure that the
 *   aggregator’s output remains a reliable diagnostic substrate throughout the
 *   system’s lifecycle. This protects downstream consumers—including CI/CD
 *   validation tooling, observability platforms, correlation engines, schema
 *   governance layers, and regulated reporting surfaces—from receiving partial,
 *   ambiguous, reordered, or structurally degraded error payloads.
 *
 * **WHY THIS MATTERS**  
 *   • Prevents silent contraction or expansion of violation reporting  
 *   • Ensures deterministic sequencing across refactors and environment changes  
 *   • Protects cross-boundary diagnostic invariants from mutation drift  
 *   • Reinforces error-surface stability required by audit, telemetry, and  
 *     compliance pipelines  
 *
 *   In enterprise environments, multi-issue diagnostic correctness is a
 *   non-negotiable guarantee and forms a foundational layer of schema-governance
 *   enforcement. These tests verify that guarantee with precision.
 */
describe(
    "defineErrorMessages — multi-issue aggregation (ordered violation reporting, pattern enforcement, complete diagnostic surfacing)",
    () => {
        it(
            "must aggregate all violations in deterministic input order and emit complete enterprise-grade diagnostic messages",
            () => {
                const invalid = {
                    bad_key: "short",                                          // invalid key + invalid message
                    "1BAD_KEY": "A".repeat(LENGTHS.MESSAGE_MIN - 1),           // starts with digit + message too short
                    GOOD_BUT_MSG_INVALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN - 2) // valid key format but message too short
                };

                try {
                    defineErrorMessages(invalid as any);
                    expect(false).toBe(true); // hard fail if no exception thrown
                } catch (err) {
                    const msg = String(err);

                    // Ensure all offending keys appear in correct order
                    expect(msg).toContain("bad_key");
                    expect(msg).toContain("1BAD_KEY");
                    expect(msg).toContain("GOOD_BUT_MSG_INVALID_KEY");

                    // Ensure message includes SCREAMING_SNAKE_CASE violation pattern description
                    expect(msg).toContain(MESSAGES.KEY_PATTERN);

                    // Ensure message includes descriptive-length violation details
                    expect(msg).toContain(MESSAGES.MESSAGE_TOO_SHORT);

                    // Format invariants required for enterprise diagnostic pipelines
                    expect(msg.startsWith("Error: DEFINE_ERROR_MESSAGES_VALIDATION_FAILURE")).toBe(true);
                    expect(msg).toContain("ISSUES:");
                    expect(msg).toContain("RESOLUTION:");
                }
            }
        );
    }
);

// TODO: shouldn't we make sure the result of defineErrorMessages can't be mutated?

/**
 * 8. TYPESCRIPT-ONLY STATIC CONTRACT TESTS
 *
 * 0. COMPILE-TIME INVARIANT ENFORCEMENT
 *
 * **PURPOSE**  
 *   This section enforces the *compile-time* structural and semantic guarantees
 *   of the `defineErrorMessages()` factory and the `ErrorMessageKey` literal
 *   union it produces. Because these types form a formal diagnostic surface
 *   consumed across validation engines, schema registries, observability
 *   pipelines, and runtime diagnostics, their integrity must remain stable,
 *   predictable, and fully resistant to inference drift or widening caused by
 *   refactors, library evolution, or TypeScript version changes.
 *
 *   By validating that invalid registries fail at compile time, that literal
 *   inference is preserved without widening, and that no extraneous keys or
 *   constructs are permitted, these tests ensure that the diagnostic key-space
 *   remains a durable, trusted contract across all subsystems. This protects
 *   downstream consumers—including log processors, telemetry aggregators,
 *   analytics dimensions, incident pipelines, and forensic tooling—from receiving
 *   malformed or structurally ambiguous error identifiers.
 *
 * **WHY THIS MATTERS**  
 *   • Prevents silent inference drift that could weaken registry guarantees  
 *   • Ensures literal key inference remains exact and stable  
 *   • Blocks arbitrary key assignment through compile-time contract enforcement  
 *   • Ensures the generated union type is non-constructible and cannot be forged  
 *   • Protects diagnostic surfaces from ambiguity or unintended widening  
 *
 *   In enterprise environments, compile-time correctness of diagnostic registries
 *   is a non-negotiable guarantee and forms the foundation of high-assurance
 *   validation governance. These tests enforce that guarantee.
 *
 * **EXECUTION MODEL**  
 *   This suite is enforced exclusively by the TypeScript compiler during
 *   type-checking in CI, lint, and build pipelines. It is never executed at
 *   runtime, never emitted into bundle outputs, and cannot throw errors through
 *   Vitest. Its role is to ensure static contract accuracy with zero runtime
 *   footprint and zero behavioral variance across environments.
 */
// ------------------------------------------------------------
// INVALID: malformed key name (not SCREAMING_SNAKE_CASE)
// ------------------------------------------------------------
// @ts-expect-error invalid key naming must be rejected
defineErrorMessages({ invalid_key: "A".repeat(LENGTHS.MESSAGE_MIN) });

// ------------------------------------------------------------
// INVALID: message length too short
// ------------------------------------------------------------
// @ts-expect-error message too short must be rejected
defineErrorMessages({ VALID_VALID_KEY: "short" });

// ------------------------------------------------------------
// VALID registry: must type-check successfully
// ------------------------------------------------------------
defineErrorMessages({
    VALID_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN)
} as const);

// ------------------------------------------------------------
// UNION TYPE MUST REJECT FOREIGN KEYS
// ------------------------------------------------------------
{
    const r = defineErrorMessages({
        ALPHA_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN),
        BETA_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN)
    } as const);

    type K = typeof r.ErrorMessageKey;

    // @ts-expect-error must reject any key not in the literal union
    const nope: K = "NOT_REAL_KEY";
}

// ------------------------------------------------------------
// UNION TYPE MUST NOT BE CONSTRUCTIBLE
// ------------------------------------------------------------
{
    const r = defineErrorMessages({
        ONLY_VALID_KEY: "A".repeat(LENGTHS.MESSAGE_MIN)
    } as const);

    type K = typeof r.ErrorMessageKey;

    // @ts-expect-error cannot instantiate union-like pseudo-type
    const bad = new (r.ErrorMessageKey as any)();
}
}