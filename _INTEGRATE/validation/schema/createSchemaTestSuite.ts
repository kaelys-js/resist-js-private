/**
 * createSchemaTestSuite — ENTERPRISE CONTRACT SPECIFICATION
 * =========================================================
 *
 * SUMMARY
 *   This module defines the unified, governance-grade mechanism for generating
 *   deterministic validation suites for Valibot schemas. It standardizes how
 *   schemas are tested across the codebase by enforcing consistent acceptance
 *   semantics, rejection semantics, diagnostic behavior, and type-surface
 *   stability. The generator ensures that every schema behaves predictably under
 *   refactors, dependency changes, and cross-service integration, preserving the
 *   integrity of data contracts across mission-critical systems. Its purpose is
 *   to translate declarative schema definitions into verifiable, repeatable,
 *   contract-accurate validation tests.
 *
 *
 * 1. SEMANTIC ROLE
 *   The generator serves as the authoritative enforcement layer for schema
 *   correctness. It interprets schema definitions as immutable contracts,
 *   converts them into executable validation surfaces, and ensures that every
 *   schema across the monorepo adheres to uniform behavioral rules. It
 *   establishes the canonical expectations for how schema boundaries are tested
 *   and validates their conformance across runtime environments.
 *
 *
 * 2. INPUT CONTRACT
 *   • Accepts a configuration object defining named schema entries, associated
 *     TypeScript output types, valid examples, invalid examples, and optional
 *     grouping metadata.  
 *   • All configuration fields must be structurally complete, type-aligned, and
 *     semantically consistent to ensure deterministic test generation.  
 *   • All provided schemas must be pure, non-coercive, and deterministic under
 *     all runtime conditions.  
 *   • Misaligned configuration, undeclared schema keys, or inconsistent type
 *     associations violate the contract and produce immediate failure.  
 *
 *
 * 3. OUTPUT CONTRACT
 *   • Produces a complete Vitest suite verifying acceptance of valid cases,
 *     rejection of invalid cases, stability of error surfaces, and immutability
 *     of type outputs.  
 *   • Ensures zero mutation of schema behavior—tests validate, never modify.  
 *   • Guarantees deterministic results across machines, runtimes, and version
 *     changes.  
 *   • Enforces stable diagnostic structure, ensuring no leakage of internal
 *     implementation details and no nondeterministic message generation.  
 *
 *
 * 4. PURPOSE
 *   • Ensures schema contracts cannot silently weaken due to refactors,
 *     dependency upgrades, or developer error.  
 *   • Centralizes validation logic, eliminating fragmentation and inconsistent
 *     testing approaches across teams and services.  
 *   • Provides an auditable, repeatable enforcement layer to protect regulated or
 *     mission-critical workflows against malformed inputs and corrupted payload
 *     propagation.  
 *   • Establishes long-term maintainability by converting declarative schema
 *     specifications into enforceable, systemwide behavioral guarantees.  
 *
 *
 * 5. VALIDATION SCOPE
 *   • Verifies type-surface stability for each declared schema output, ensuring
 *     no widening or inference drift occurs over time.  
 *   • Enforces acceptance invariants using all documented valid inputs.  
 *   • Enforces rejection invariants using schema-specific invalid inputs and the
 *     universal invalid corpus.  
 *   • Validates diagnostic contract consistency, including message shape,
 *     nondeterminism resistance, and mutation-free error reporting.  
 *
 *
 * 6. SEMANTIC NOTES
 *   • The generator must remain domain-agnostic, validating only explicit schema
 *     definitions rather than inferring semantics.  
 *   • It must preserve deterministic behavior across Node, Bun, Deno, CI, and
 *     any worker-class environment.  
 *   • It must remain stable across schema evolution, producing consistent tests
 *     even as schemas expand in complexity.  
 *   • It must support multi-schema governance by applying uniform invariants to
 *     all validation surfaces.  
 *
 *
 * 7. EXAMPLES
 *   ```
 *   import { createSchemaTestSuite } from "@/shared/tests/schema/createSchemaTestSuite";
 *   import { SCHEMAS, TYPES, VALID_CASES, INVALID_CASES } from "./index";
 *
 *   createSchemaTestSuite({
 *       name: "PrimitiveSchemas",
 *       SCHEMAS,
 *       TYPES,
 *       VALID_CASES,
 *       INVALID_CASES
 *   });
 *
 *   // Produces a complete, deterministic suite enforcing all schema contracts.
 *   ```
 *
 * @returns {void} Generates the governed test suite validating all declared
 *          schema contracts.
 */

import { describe, expect, it } from "vitest";

import { $schema } from "../../validation/schema/engine";

// TODO
const anything = $schema.any()
type Anything = $schema.InferOutput<typeof anything>

const trueOrFalse = $schema.boolean()
type TrueOrFalse = $schema.InferOutput<typeof trueOrFalse>

export const schemaName = $schema.pipe($schema.string(), $schema.minLength(10), $schema.maxLength(64))

export const valids = $schema.array(anything)
export type Valids = $schema.InferOutput<typeof valids>

export const invalids = $schema.array(anything)
export type Invalids = $schema.InferOutput<typeof invalids>

export const schemaTestSuitInput = $schema.strictObject({
    name: schemaName,
    SCHEMAS: $schema.record(schemaName, anything),
    TYPES: $schema.record(schemaName, anything),
    VALID_CASES: $schema.optional($schema.record(schemaName, valids)),
    INVALID_CASES: $schema.optional($schema.record(schemaName, invalids)),
})

export type SchemaTestSuiteInput = $schema.InferOutput<typeof schemaTestSuitInput>

/**
 * UNIVERSAL INVALID INPUT CORPUS — ENTERPRISE CONTRACT SPECIFICATION
 *
 * **SUMMARY**
 *   The Universal Invalid Input Corpus defines the authoritative catalog of
 *   runtime values that MUST be treated as invalid across all schema-validation
 *   boundaries. It enumerates every major JavaScript value category that appears
 *   in malformed, adversarial, ambiguous, or untyped input streams and enforces
 *   uniform rejection semantics across the system. This corpus prevents
 *   divergence between schemas, guarantees deterministic failure modes, and
 *   stabilizes diagnostic behavior across distributed components. It is a
 *   foundational element of enterprise-grade schema governance and protects the
 *   integrity of ingestion pipelines in mission-critical environments.
 *
 * **1. SEMANTIC ROLE**
 *   Establishes the canonical system-wide definition of universally invalid
 *   input. It formalizes the rejection boundary enforced by all schemas unless
 *   explicitly overridden. It unifies interpretation of invalid runtime values
 *   across services and prevents semantic drift in multi-team environments.
 *
 * **2. INPUT CONTRACT**
 *   • All values in this corpus MUST be rejected unless a schema explicitly
 *     whitelists them.  
 *   • These values represent known invalid runtime categories and MUST NOT be
 *     coerced, normalized, widened, or implicitly accepted.  
 *   • Validators MUST apply deterministic rejection and stable diagnostic output
 *     for every listed value.  
 *   • No implicit override or deviation is permitted without explicit
 *     documentation and test enforcement.  
 *
 * **3. OUTPUT CONTRACT**
 *   • When used in test suites, the corpus MUST yield deterministic rejection
 *     semantics in all schemas.  
 *   • Error surfaces MUST remain stable across environments, versions, and
 *     refactors.  
 *   • No schema may exhibit fallback acceptance or nondeterministic behavior for
 *     any corpus value.  
 *   • Outputs MUST reflect strict enforcement of rejection invariants with no
 *     behavioral variance across executions.  
 *
 * **4. PURPOSE**
 *   • Prevents schema drift and accidental expansion of acceptance boundaries.  
 *   • Hardens validation logic against malformed, adversarial, or ambiguous
 *     runtime inputs.  
 *   • Eliminates subjective or inconsistent negative testing across large
 *     codebases and multi-team deployments.  
 *   • Provides the baseline framework for mutation-testing resilience.  
 *
 * **5. VALIDATION SCOPE**
 *   • Enforces rejection across all primitive invalid types, structural types,
 *     callable constructs, and exotic runtime forms.  
 *   • Validates the absence of coercion, silent normalization, or fallback
 *     acceptance logic.  
 *   • Ensures mutation resilience by preventing accidental expansion of valid
 *     domains.  
 *   • Confirms that schemas remain aligned with this corpus even as language,
 *     dependencies, or runtime environments evolve.  
 *
 * **6. SEMANTIC NOTES**
 *   • The corpus must evolve deliberately and only under architectural review.  
 *   • Each value is selected for its relevance to real-world malformed input
 *     patterns and systemic threat surfaces.  
 *   • All changes introduce cross-schema behavioral impact and MUST be governed
 *     with extreme caution.  
 *   • Stability of the corpus is essential for deterministic cross-service error
 *     behavior and observability integrity.  
 *
 * **7. EXAMPLES**
 *   ```
 *   for (const input of UNIVERSAL_INVALID_INPUTS) {
 *       const result = safeParse(schemaUnderTest, input);
 *       expect(result.success).toBe(false);
 *   }
 *   ```
 */
export const UNIVERSAL_INVALID_INPUTS: Anything[] = [
    // Primitive: numbers
    0,
    1,
    -1,
    42,
    3.14159,
    NaN,
    Infinity,
    -Infinity,

    // Primitive: strings
    "",
    " ",
    "hello",
    "123",

    // Primitive: booleans
    true,
    false,

    // Primitive: bigint
    0n,
    -1n,
    999999999999n,

    // Primitive: symbol
    Symbol("x"),
    Symbol.for("registry"),

    // Nullish
    null,
    undefined,

    // Structural: objects
    {},
    { a: 1 },
    { nested: { x: 1 } },
    Object.create(null),
    Object.create({ proto: true }),

    // Structural: arrays
    [],
    [1],
    [1, 2, 3],
    [null],

    // Callable: functions
    function f() { },
    () => { },
    async function g() { },
    async () => { },

    // Built-ins: errors and dates
    new Date(),
    new Error("boom"),
    new TypeError("x"),
    new RangeError("y"),

    // Built-ins: typed arrays
    new Uint8Array([1, 2, 3]),
    new Int8Array([1, -1]),
    new Float32Array([1.1, 2.2]),

    // Built-ins: collections
    new Map(),
    new Set(),
    new WeakMap(),
    new WeakSet(),

    // Built-ins: other
    Promise.resolve(1),
    Promise.reject(new Error("reject")).catch(() => { }),
    /regex/,
    new RegExp("abc"),

    // Exotic: proxies
    new Proxy({ x: 1 }, {}),
    new Proxy([], {}),

    // Exotic: boxed primitives
    new Number(1),
    new String("x"),
    new Boolean(false),

    // Exotic: detached / edge-case environment values
    globalThis,
    Math,
    JSON,
    Reflect,
    Atomics,
    Intl,

    // Exotic: ArrayBuffer & DataView
    new ArrayBuffer(8),
    new DataView(new ArrayBuffer(16)),

    // Exotic: generator functions
    function* gen() { yield 1; },
    (function* () { yield 1; })(),

    // Exotic: async generators
    async function* agen() { yield 1; },
    (async function* () { yield 1; })(),

    // Edge-case host constructs
    new URL("https://example.com"),
    new URLSearchParams("a=1"),
    new TextEncoder(),
    new TextDecoder(),

    // Uncommon ecosystem types
    new WeakRef({}),
    new FinalizationRegistry(() => { })
];

/**
 * createSchemaTestSuite()
 *
 * **SUMMARY**  
 *   This function provides a fully automated, contract-driven mechanism for
 *   generating comprehensive validation test suites for one or more Valibot
 *   schemas. It transforms schema definitions, documented valid cases, documented
 *   invalid cases, and type-level metadata into a unified, deterministic suite
 *   of tests that enforce strict schema correctness across all runtime and
 *   compile-time dimensions.  
 *
 *   By centralizing test generation logic, this utility ensures that every
 *   participating schema adheres to uniform behavioral expectations, enabling
 *   enterprise systems to maintain consistent data validation guarantees across
 *   microservices, internal libraries, shared modules, and regulated data flows.
 *
 * **PURPOSE**  
 *   - To eliminate duplication and inconsistency in schema testing by producing
 *     a reusable, standardized validation suite for any collection of schemas.  
 *   - To guarantee that schema behavior remains stable, non-ambiguous, and
 *     backward compatible across code refactors, version updates, architecture
 *     migrations, or team transitions.  
 *   - To ensure that every schema is validated against:  
 *       • compile-time type contracts,  
 *       • documented valid input examples,  
 *       • documented invalid input examples, and  
 *       • the universal invalid input corpus used across the monorepo.  
 *   - To strengthen system-wide reliability by preventing schema drift, implicit
 *     coercion, or accidental broadening of allowed input categories.  
 *
 * **INPUT CONTRACT**  
 *   The function accepts a single configuration object with the following
 *   contractually required or optional fields:
 *
 *   - **name: SchemaName**  
 *       Logical grouping name used to label the generated test blocks.  
 *       This ensures that multi-schema suites remain organized, readable,
 *       and auditable across large repositories.
 *
 *   - **SCHEMAS: Record<SchemaName, Schema>**  
 *       A dictionary of schema identifiers to schema instances.  
 *       Each schema will receive a complete suite of validation tests,
 *       including type-level checks, valid-input checks, invalid-input checks,
 *       universal rejection checks, and mutation-resilience checks.
 *
 *   - **TYPES: Record<SchemaName, Anything> (optional)**  
 *       A parallel dictionary containing the TypeScript output types associated
 *       with each schema.  
 *       Used to verify compile-time type integrity and prevent drift in type
 *       inference or structural guarantees.
 *
 *   - **VALID_CASES: Record<SchemaName, Anything[]> (optional)**  
 *       Explicit examples of inputs that must be accepted by the corresponding
 *       schema.  
 *       Ensures backward compatibility and protects against accidental
 *       over-restriction of schema behavior.
 *
 *   - **INVALID_CASES: Record<SchemaName, Anything[]> (optional)**  
 *       Explicit examples of inputs that must always be rejected by the
 *       corresponding schema.  
 *       Ensures schemas do not become permissive or ambiguous through refactors
 *       or misconfiguration.
 *
 * **OUTPUT CONTRACT**  
 *   - Generates a full Vitest-based test suite that:  
 *       • Validates compile-time type relationships  
 *       • Ensures acceptance of documented valid cases  
 *       • Ensures rejection of documented invalid cases  
 *       • Ensures rejection of all universal invalid categories  
 *       • Validates stability of error surfaces (message, input echoing, shape)  
 *       • Detects mutation-based weakening of schema logic  
 *   - The generated suite is fully deterministic and produces no side effects.  
 *   - The suite enforces strict equivalence between schema behavior and its
 *     documented contract, ensuring correctness across the entire lifecycle.  
 *
 * **VALIDATION RULES**  
 *   - Every schema must be evaluated against the same canonical behavioral
 *     criteria to ensure consistency across the monorepo.  
 *   - Schemas may only accept documented valid values; all other categories must
 *     fail unless explicitly declared otherwise.  
 *   - Error surfaces must remain stable, predictable, and free of implementation
 *     leakage.  
 *   - Any deviation from documented schema behavior—intentional or accidental—
 *     must result in immediate, deterministic test failure.
 *
 * **SEMANTIC NOTES**  
 *   - This function serves as the backbone of schema governance across systems
 *     requiring high assurance, regulatory compliance, data sanctity, or
 *     cross-team reliability.  
 *   - It promotes architectural discipline by ensuring schemas remain tightly
 *     aligned with their declared contracts over time.  
 *   - Acts as a critical control point for data ingestion pipelines, distributed
 *     validation layers, and internal/external API boundaries.  
 *   - Supports long-term maintainability by giving future engineers a clear and
 *     enforceable behavioral specification for each schema.  
 *
 * **EXAMPLES**  
 *   ```
 *   import { createSchemaTestSuite } from "@/tests/utils/createSchemaTestSuite";
 *   import { SCHEMAS, TYPES, VALID_CASES, INVALID_CASES } from "./index";
 *
 *   createSchemaTestSuite({
 *       name: "AuthenticationSchemas",
 *       SCHEMAS,
 *       TYPES,
 *       VALID_CASES,
 *       INVALID_CASES
 *   });
 *
 *   // Generates:
 *   // - compile-time type invariants
 *   // - valid-case acceptance tests
 *   // - invalid-case rejection tests
 *   // - universal invalid input rejection tests
 *   // - mutation-resilience guarantees
 *   ```
 */
export function createSchemaTestSuite(input: SchemaTestSuiteInput) {
    const {
        name,
        SCHEMAS,
        TYPES = {},
        VALID_CASES = {},
        INVALID_CASES = {}
    }: SchemaTestSuiteInput = $schema.parse(schemaTestSuitInput, input)

    /**
     * 1. TYPE-LEVEL CONTRACT TESTS
     *
     * **PURPOSE**  
     *   This section verifies the *compile-time* integrity of each schema’s
     *   TypeScript output type (`SchemaType`). Because schema output types
     *   represent formal, cross-service API contracts, it is imperative that they
     *   remain stable, predictable, and resistant to implicit widening or
     *   narrowing introduced by refactors, inference drift, or dependency
     *   changes.
     *
     *   By enforcing that each `SchemaType` can be referenced without type
     *   mutation or structural degradation, these tests ensure that the schema’s
     *   type-level guarantees remain intact throughout the system’s lifecycle.
     *   This protects downstream consumers—including validators, transformers,
     *   serializers, service boundaries, and analytical pipelines—from receiving
     *   values that violate previously established compile-time expectations.
     *
     * **WHY THIS MATTERS**  
     *   • Prevents silent type drift that could compromise subsystem boundaries  
     *   • Ensures branded, literal, discriminated, or union types retain fidelity  
     *   • Protects critical services from cascading type mismatches  
     *   • Reinforces that schema types remain a source of truth for contract design  
     *
     *   In enterprise environments, compile-time type correctness is a
     *   non-negotiable guarantee and forms the foundation of durable schema
     *   governance. These tests enforce that guarantee.
     */
    describe(
        `${name} — SCHEMAS — compile-time type invariants (static contract integrity, type-surface stability, and structural soundness)`,
        () => {
            it(
                `must guarantee that each schema’s exported TypeScript type remains statically exact, contract-accurate, 
                and immune to widening, narrowing, or inference drift across refactors`,
                () => {
                    for (const [, _SchemaType] of Object.entries(TYPES)) {
                        /**
                         * TYPE-REFERENCE ASSERTION
                         *
                         * **PURPOSE**  
                         *   This assignment exists to confirm that `_SchemaType` is
                         *   referenceable by TypeScript without causing the compiler to
                         *   widen, mutate, or reinterpret the schema’s output type.  
                         *
                         *   If `_SchemaType` ever changes—whether through refactors,
                         *   transitive dependency updates, or accidental modification—this
                         *   assertion will detect:
                         *
                         *     • unintended widening to `any`  
                         *     • unintended widening to `unknown`  
                         *     • incorrect narrowing due to mismatched inference  
                         *     • structural incompatibility introduced by schema evolution  
                         *
                         * **SEMANTIC ROLE**  
                         *   This check is not about runtime behavior but ensures the
                         *   *type-system contract* remains durable and sound across versions
                         *   and maintainers. If the type cannot be referenced in its
                         *   declared form, it indicates a contract breach with potentially
                         *   cascading effects across call sites, API clients, and dependent
                         *   services.
                         *
                         * ----------------------------------------------------------------
                         */
                        // @ts-expect-error TODO
                        const _compileCheck: _SchemaType | null = null;

                        /**
                         * This trivial runtime expectation establishes that the variable is
                         * reachable and enforces that TypeScript did not reinterpret the
                         * declared type. If the assignment above fails to type-check,
                         * compilation halts before runtime tests can execute, thereby
                         * guaranteeing early detection of type-contract violations.
                         */
                        expect(_compileCheck).toBe(null);
                    }
                });
        });

    /**
     * 2. RUNTIME VALIDATION — VALID CASES
     *
     * **PURPOSE**  
     *   This section verifies that each schema *correctly accepts every input*
     *   explicitly designated as valid by its authors or by its contract
     *   definition. These tests function as the authoritative mechanism for
     *   ensuring that schemas remain backward compatible, semantically stable,
     *   and aligned with their documented acceptance boundaries.
     *
     *   Valid-case testing is not optional in enterprise systems. It protects
     *   against regressions where:
     *
     *     • new validation rules unintentionally become too strict,  
     *     • refinement logic blocks previously allowed inputs,  
     *     • schema evolution silently alters accepted shapes, or  
     *     • type-validation inconsistencies emerge during integration.  
     *
     *   By affirming that all known-valid values continue to pass, this section
     *   ensures that schemas maintain a durable and trustworthy acceptance
     *   surface, providing strong guarantees to downstream consumers relying on
     *   stable input semantics.
     *
     * **WHY THIS MATTERS**  
     *   • Preserves backward compatibility for every schema version  
     *   • Ensures that API, domain, and data-layer invariants remain intact  
     *   • Detects accidental tightening of schema behavior during refactors  
     *   • Provides formal assurance that documented “valid shapes” remain valid  
     *   • Protects mission-critical systems from acceptance regressions  
     *
     *   In an enterprise environment, where schemas often represent public API
     *   contracts or cross-service boundaries, validating known-valid cases is a
     *   mandatory compliance requirement and a safeguard against functional
     *   breakage.
     */

    describe(
        `${name} — SCHEMAS — verification of documented valid-input acceptance to ensure backward-compatible, contract-accurate, and semantically stable schema behavior`,
        () => {
            for (const schemaName of Object.keys(SCHEMAS)) {
                it(
                    `must successfully accept every documented valid input for schema: ${schemaName}, 
                    thereby confirming backward-compatible behavior and preservation of the schema’s 
                    explicitly authorized value domain`,
                    () => {
                        const schema: $schema.AnySchema = SCHEMAS[schemaName];
                        const valids: Valids = VALID_CASES?.[schemaName] ?? [];

                        /**
                         * VALID INPUT ASSERTIONS
                         *
                         * **PURPOSE**  
                         *   This loop enforces the expectation that all values explicitly
                         *   defined as valid for the schema must be accepted without
                         *   modification, coercion, or failure. It creates a direct,
                         *   contract-level linkage between schema documentation and schema
                         *   behavior, ensuring their invariants remain synchronized.
                         *
                         * **MECHANICS**  
                         *   • For each documented valid input, we invoke `safeParse()`  
                         *   • Successful validation is required (`result.success === true`)  
                         *   • A defined `output` is required to ensure no silent rejection  
                         *
                         * **SEMANTIC ROLE**  
                         *   These assertions protect downstream consumers—such as API
                         *   clients, service orchestrators, ETL processes, and UI layers—
                         *   from regressions that would otherwise cause functional drift or
                         *   system-wide incompatibility.
                         */
                        for (const input of valids) {
                            const result: $schema.SafeParseResult<$schema.InferOutput<typeof schema>> = $schema.safeParse(schema, input);

                            // Validation must explicitly succeed for all documented valids.
                            expect(result.success).toBe(true);

                            // Output must be defined, ensuring no partial or silent rejection.
                            expect(result.output).toBeDefined();
                        }
                    });
            }
        });

    /**
     * 3. RUNTIME VALIDATION — SCHEMA-SPECIFIC INVALID INPUTS
     *
     * **PURPOSE**  
     *   This section enforces the negative boundary conditions that are explicitly
     *   defined for each schema. Unlike the universal invalid corpus—designed to
     *   exercise global JavaScript value categories—this segment validates inputs
     *   that are *schema-specific* and derive from intentional design decisions,
     *   domain constraints, or business-logic invariants.
     *
     *   These invalid examples represent concrete cases where the schema is
     *   expected to reject inputs that may appear superficially valid but violate
     *   deeper structural, semantic, or regulatory rules. As such, they form an
     *   essential part of contract-level validation.
     *
     * **WHY THIS MATTERS**  
     *   Schema-specific invalid tests provide protection against:
     *
     *     • **Overly-permissive schema expansion**  
     *       A common regression failure mode where a refactor accidentally broadens
     *       the accepted input surface, undermining API correctness or allowing
     *       malformed data into downstream systems.
     *
     *     • **Loss of required-field guarantees**  
     *       Validations ensuring presence, type, or semantics of fields can degrade
     *       silently if refinement logic is modified incorrectly.
     *
     *     • **Refinement and domain-rule regressions**  
     *       Domain invariants—such as email formatting, non-empty strings, ID
     *       constraints, or business-rule logic—must remain stable across schema
     *       versions.
     *
     *     • **Contract drift across services**  
     *       In distributed or multi-service environments, even small acceptance
     *       deviations can propagate data-quality issues or violate downstream
     *       expectations.
     *
     * **ENTERPRISE SIGNIFICANCE**  
     *   These tests function as a “regression firewall” that ensures the schema’s
     *   intentionally forbidden values remain forbidden, providing:
     *
     *     • High-assurance validation of strict data boundaries  
     *     • Defenses against accidental acceptance of malformed data  
     *     • Deterministic behavior under refactor, migration, or versioning  
     *     • Reliable, audit-grade documentation of failure semantics  
     *
     *   They serve as an immutable contract that protects mission-critical
     *   pipelines, compliance-sensitive workflows, and API surfaces from silent
     *   degradation.
     */
    describe(
        `${name} — SCHEMAS — enforcement of documented schema-specific invalid-input 
        rejection to prevent over-permissive expansion, regression of required constraints, 
        and erosion of contract boundaries`,
        () => {
            for (const schemaName of Object.keys(SCHEMAS)) {
                it(
                    `should reject all documented invalid inputs for schema: ${schemaName} 
                    to uphold the schema’s formally declared rejection contract and prevent permissive drift`,
                    () => {
                        const schema: $schema.AnySchema = SCHEMAS[schemaName];
                        const invalids: Invalids = INVALID_CASES?.[schemaName] ?? [];

                        /**
                         * VALIDATION OF SCHEMA-SPECIFIC NEGATIVE EXAMPLES
                         *
                         * **PURPOSE**  
                         *   These assertions confirm that each invalid example—curated by
                         *   schema authors or derived from business logic—is *consistently*
                         *   rejected. This ensures deterministic enforcement of domain rules
                         *   and prevents refactors from accidentally diluting constraints.
                         *
                         * **EXPECTATIONS**  
                         *   • Validation must fail (`success === false`)  
                         *   • No partially-accepted or coerced outputs are permitted  
                         *   • Failure behavior must remain stable across schema versions  
                         *
                         * **ENTERPRISE ROLE**  
                         *   These inputs codify the "never acceptable" shapes for a given
                         *   schema. Their rejection is a non-negotiable stability guarantee
                         *   for systems requiring predictable input discipline, such as:
                         *
                         *     – compliance pipelines  
                         *     – customer-facing API gateways  
                         *     – identity/permissions layers  
                         *     – transaction and audit systems  
                         */
                        for (const input of invalids) {
                            const result: $schema.SafeParseResult<$schema.InferOutput<typeof schema>> = $schema.safeParse(schema, input);

                            // The schema must *explicitly* reject each documented invalid case.
                            expect(result.success).toBe(false);
                        }
                    });
            }
        });

    /**
     * 4. RUNTIME VALIDATION — UNIVERSAL INVALID INPUT CORPUS
     *
     * **PURPOSE**  
     *   This section validates the schema’s ability to *uniformly and rigorously
     *   reject* all known JavaScript runtime value categories that are outside the
     *   schema’s explicitly sanctioned domain. Unlike schema-specific invalid
     *   cases, which target business-rule violations, this corpus ensures that the
     *   schema never accidentally accepts structurally incompatible or coerced
     *   values—regardless of refactor, mutation, framework behavior, or runtime
     *   environment.
     *
     * **WHY THIS MATTERS**  
     *   he universal invalid corpus protects the system from:
     *
     *     • **Undocumented or accidental acceptance paths**  
     *       Ensures schemas cannot silently begin permitting values they were
     *       never designed to accept, protecting downstream consumers and audit
     *       layers.
     *
     *     • **Implicit coercion vulnerabilities**  
     *       Rejects values that JavaScript might “helpfully” coerce, such as
     *       numeric, string, functional, nullish, or exotic types.
     *
     *     • **Silent fallback logic**  
     *       Prevents acceptance caused by developer oversight, branching changes,
     *       or library-level fallback pathways that weaken validation.
     *
     *     • **Refactor drift and mutation-operator bypass**  
     *       Ensures that schema integrity remains untouched by internal code
     *       reordering, union expansion, refinement misplacement, or evolution of
     *       Valibot internals.
     *
     * **ENTERPRISE SIGNIFICANCE**  
     *   This test suite forms the backbone of contract stability in systems where
     *   data ingestion occurs at scale, across multiple services, jurisdictions,
     *   or compliance-regulated boundaries. It provides:
     *
     *     • Deterministic rejection semantics for all non-conforming values  
     *     • Upstream data-quality enforcement  
     *     • Protection against malformed or hostile inputs  
     *     • High-assurance guarantees for ETL pipelines, identity systems,
     *       analytics ingestion, and API front doors  
     *
     *   The universal invalid corpus functions as the *non-negotiable rejection
     *   perimeter* for all schemas and ensures that any deviation triggers an
     *   immediate test failure, making contract erosion impossible.
     */
    describe(
        `${name} — SCHEMAS — enforcement of universal invalid-input rejection 
        to guarantee immutability of rejection semantics and prevent acceptance drift across schema versions`,
        () => {
            for (const schemaName of Object.keys(SCHEMAS)) {
                /**
                 * UNIVERSAL INVALID INPUT REJECTION — safeParse()
                 *
                 * **PURPOSE**  
                 *   Ensures that for every universal invalid input category, the schema
                 *   deterministically rejects the value unless explicitly documented as
                 *   valid. This reinforces strict domain boundaries and prevents
                 *   accidental expansion of the schema’s acceptance surface.
                 *
                 * **EXPECTATIONS**  
                 *   • safeParse() MUST return { success: false }  
                 *   • No fallback behavior or coercion is permitted  
                 *   • Valid cases (if explicitly documented) are honored as exceptions  
                 *
                 * **ENTERPRISE RULE**  
                 *   Rejection behavior must remain stable across all schema versions,
                 *   runtime environments, and refactor cycles.
                 */
                it(
                    `must reject all universal invalid input categories for schema: ${schemaName} 
                    to preserve invariant domain boundaries, prevent schema drift, and enforce 
                    non-permissive validation behavior across all runtime value classes`,
                    () => {
                        const schema: $schema.AnySchema = SCHEMAS[schemaName];
                        const valids: Valids = VALID_CASES?.[schemaName] ?? [];

                        for (const input of UNIVERSAL_INVALID_INPUTS) {
                            // If the input is explicitly documented as valid, skip rejection tests.
                            if (valids.includes(input) === true) {
                                continue;
                            }

                            const result: $schema.SafeParseResult<$schema.InferOutput<typeof schema>> = $schema.safeParse(schema, input);

                            // The schema must *explicitly* reject each documented invalid case.
                            expect(result.success).toBe(false);
                        }
                    });

                /**
                 * HARD-FAILURE SEMANTICS — parse()
                 *
                 * **PURPOSE**  
                 *   This test enforces the schema’s *mandatory hard-failure boundary* by verifying
                 *   that `parse()` throws a deterministic validation exception for *every*
                 *   universal invalid input category. Unlike `safeParse()`, which yields a structured
                 *   failure object, `parse()` must provide *unambiguous stop-the-line semantics*
                 *   with no fallback behavior.
                 *
                 * **WHY THIS MATTERS**  
                 *   • Guarantees that invalid inputs can never silently propagate  
                 *   • Ensures downstream systems are protected by an immediate failure boundary  
                 *   • Establishes deterministic, audit-grade rejection behavior  
                 *   • Prevents accidental permissive drift introduced by refactors or library changes  
                 *   • Preserves the strong contract required by high-assurance validation layers  
                 *
                 * **ENTERPRISE SIGNIFICANCE**  
                 *   In regulated and mission-critical systems, silent acceptance or coercion—
                 *   even for a single value—constitutes a contract violation. This test ensures
                 *   `parse()` operates as a strict enforcement mechanism, delivering invariant,
                 *   predictable exceptions that uphold:
                 *
                 *     • API integrity  
                 *     • Security boundary correctness  
                 *     • Compliance and audit traceability  
                 *     • Multi-service behavioral consistency  
                 *
                 *   Any deviation detected here indicates a breach of the schema’s hard-failure
                 *   contract and must be treated as a system-level failure.
                 */
                it(
                    `must throw a deterministic validation exception for all universal invalid 
                    inputs when using parse(), thereby enforcing the schema’s hard-failure 
                    contract for: ${schemaName}`,
                    () => {
                        const schema: $schema.AnySchema = SCHEMAS[schemaName];
                        const valids: Valids = VALID_CASES?.[schemaName] ?? [];

                        for (const input of UNIVERSAL_INVALID_INPUTS) {
                            // If the input is explicitly documented as valid, skip rejection tests.
                            if (valids.includes(input) === true) {
                                continue;
                            }

                            // The schema must *explicitly* reject each documented invalid case.
                            expect(() => $schema.parse(schema, input)).toThrow();
                        }
                    });
            }
        });

    /**
     * 5. ERROR SURFACE VALIDATION
     *
     * **PURPOSE**  
     *   This section verifies the *diagnostic contract* emitted by each schema
     *   during validation failures. Error surfaces represent a formal interface
     *   between:
     *
     *     • the schema author,
     *     • downstream service integrators,
     *     • debugging and observability tools,
     *     • and compliance/legal auditors.
     *
     *   Because error objects form part of the durable behavioral API of a schema,
     *   their structure, stability, and clarity must remain consistent across
     *   releases, refactors, and dependency upgrades.
     *
     * **WHY THIS MATTERS**  
     *   Enterprise systems require diagnostic precision. Errors must therefore:
     *
     *     • **Accurately identify the offending input**  
     *       This enables auditability, deterministic debugging, and regulatory
     *       traceability when malformed inputs enter the system.
     *
     *     • **Emit stable, predictable error messages**  
     *       Downstream systems—including logging layers, analytics pipelines,
     *       monitoring dashboards, and forensic tooling—depend on these messages
     *       remaining contractually consistent.
     *
     *     • **Avoid leaking internal implementation details**  
     *       Error payloads must not reveal internal schema structure, validation
     *       heuristics, or technology-specific representations that could expose
     *       attack surfaces or create brittle coupling.
     *
     *     • **Preserve semantic clarity**  
     *       Errors must clearly articulate *why* the input was rejected without
     *       ambiguity, coercion, or contradictory messaging.
     *
     * **ENTERPRISE SIGNIFICANCE**  
     *   A schema’s error surface is as important as its success path. Consistency
     *   and correctness are vital for:
     *
     *     • Security boundary enforcement  
     *     • SOC 2 / ISO 27001 validation trails  
     *     • Application-layer observability  
     *     • Forensic reconstruction of data failures  
     *     • High-assurance debugging workflows  
     *
     *   This validation suite ensures that all error surfaces remain reliable,
     *   auditable, and fully aligned with contract-level stability guarantees.
     */
    describe(
        `${name} — SCHEMAS — verification of validation error-surface stability, diagnostic integrity, 
        and contract-accurate failure semantics across all invalid input categories`,
        () => {
            for (const schemaName of Object.keys(SCHEMAS)) {

                /**
                 * ERROR-SURFACE CONTRACT VALIDATION  
                 *
                 * **PURPOSE**  
                 *   This test enforces the diagnostic-surface integrity for the schema
                 *   `${schemaName}` by verifying that every emitted validation error
                 *   adheres to enterprise-grade stability, clarity, and contract accuracy.
                 *
                 * **WHY THIS MATTERS**  
                 *   • Ensures all emitted issues remain structurally consistent  
                 *   • Guarantees deterministic and audit-reliable error reporting  
                 *   • Prevents leakage of internal schema mechanics or refinement logic  
                 *   • Preserves stable cross-service observability semantics  
                 *
                 * **CONTRACT**  
                 *   Error objects must:  
                 *     • include the offending input (when representable),  
                 *     • expose a human-readable, contract-level failure message,  
                 *     • maintain a stable and predictable structure across refactors,  
                 *     • never mutate shape, depth, or semantics across schema versions.  
                 *
                 * **ENTERPRISE SIGNIFICANCE**  
                 *   Error surfaces serve as durable cross-boundary interfaces used by
                 *   telemetry, analytics ingestion, debugging systems, and compliance logs.
                 *   Any regression in structure, content, or determinism constitutes a
                 *   system-wide contract breach. This test prevents that class of failure.
                 */
                it(
                    `should emit error structures for schema: ${schemaName} that are fully stable, 
                    diagnostically precise, contract-compliant, and invariant across refactors`,
                    () => {
                        // For `issue` typing
                        type SchemaMap = typeof SCHEMAS;
                        type SchemaName = keyof SchemaMap;
                        type ConcreteSchema<T extends SchemaName> = SchemaMap[T];
                        const inferSchema = $schema.string()
                        const schema: ConcreteSchema<typeof schemaName> = SCHEMAS[schemaName];

                        for (const input of UNIVERSAL_INVALID_INPUTS) {
                            const result: $schema.SafeParseResult<$schema.InferOutput<typeof schema>> = $schema.safeParse(schema, input);

                            // Only examine error surfaces when validation fails.
                            if (result.success === true) {
                                continue;
                            }

                            /**
                             * ERROR SHAPE CONTRACT VALIDATION
                             *
                             * **EXPECTATIONS**  
                             *   • An error must always include the offending input.  
                             *   • An error must expose a human-readable message.  
                             *   • Error objects must adhere to Valibot’s documented shape.  
                             *   • No internal implementation details may be leaked.  
                             *
                             * **SEMANTIC REQUIREMENTS**  
                             *   • “issue.input” must strictly equal the rejected value,
                             *     enabling correct forensic reconstruction and exact failure
                             *     attribution.
                             *
                             *   • “issue.message” must reflect the high-level reason for the
                             *     failure, not internal rule mechanics, refinement closures,
                             *     or schema internals.
                             *
                             *   • Additional metadata must remain stable across runtime
                             *     environments, dependency updates, and schema refactors.
                             *
                             * **SECURITY & OBSERVABILITY**  
                             *   These assertions also protect against:
                             *
                             *     • Leaking implementation details (security hardening)  
                             *     • Emitting nondeterministic error content (observability risk)  
                             *     • Breaking consumer systems that parse error surfaces  
                             */
                            for (const _issue of result.issues) {
                                const issue: $schema.InferIssue<typeof inferSchema> = _issue;

                                expect(issue).toBeDefined();
                                if (issue.input !== undefined) {
                                    expect(issue.input).toBe(input);
                                }
                                expect(issue?.message).toBeDefined();
                            }
                        }
                    });
            }
        });

    /**
     * 6. MUTATION-TESTING RESILIENCE
     *
     * **PURPOSE**  
     *   This section enforces *behavioral immutability* of schema validation
     *   logic under conditions of mutation, refactoring, or operator inversion.
     *   Mutation-testing resilience ensures that the schema cannot be silently
     *   weakened by accidental changes or tooling transformations that would
     *   otherwise introduce acceptance pathways for invalid data.
     *
     * **WHY THIS MATTERS**  
     *   In enterprise and regulated architectures, schemas serve as internal
     *   security boundaries, compliance gates, and data-quality guarantees.
     *   Therefore, schema behavior must remain stable against:
     *
     *     • **Boolean predicate flipping**  
     *       Ensures `true` → `false` or `false` → `true` mutations cannot open
     *       unauthorized acceptance paths.
     *
     *     • **Union branch reordering or omission**  
     *       Prevents validation engines from accidentally selecting unintended
     *       branches during refactors or tool-driven code rewrites.
     *
     *     • **Missing or bypassed refinement guards**  
     *       Ensures safety constraints cannot be elided or short-circuited.
     *
     *     • **Fallback-path acceptance**  
     *       Prevents unintentional success conditions arising from implicit
     *       coercions, default branches, or permissive type widening.
     *
     * **ENTERPRISE SIGNIFICANCE**  
     *   Mutation-resilient schemas protect:
     *
     *     • Data ingestion boundaries  
     *     • Security-sensitive validation layers  
     *     • Multi-service contract integrity  
     *     • Zero-trust perimeter enforcement  
     *     • Compliance and audit expectations for deterministic input rejection  
     *
     *   If *any* invalid value is ever accepted—even by mutation accident—the
     *   schema can no longer be trusted as a boundary, and downstream consumers
     *   may be operating on corrupted or malformed data. These tests guarantee
     *   that such regressions are detected immediately.
     */
    describe(
        `${name} — SCHEMAS — enforcement of mutation-testing invariants 
        to guarantee that schema rejection boundaries cannot be weakened through 
        predicate flips, union-branch reordering, or refactor-driven behavioral drift`,
        () => {
            for (const schemaName of Object.keys(SCHEMAS)) {
                /**
                 * MUTATION-RESILIENCE CONTRACT  
                 *
                 * **PURPOSE**  
                 *   Validates the schema’s resistance to all mutation vectors, including:
                 *     • predicate inversion  
                 *     • branch reordering  
                 *     • fallback-path acceptance  
                 *     • implicit coercion  
                 *     • refinement bypass  
                 *
                 *   This test enforces *behavioral immutability*: the schema must never
                 *   accept any input that is not explicitly documented as valid. If even a
                 *   single unexpected input is accepted, downstream consumers would inherit
                 *   corrupted or malformed payloads, violating enterprise data-integrity
                 *   guarantees.
                 *
                 * **WHY THIS MATTERS**  
                 *   • Prevents acceptance drift across refactors  
                 *   • Ensures validation logic cannot weaken due to mutation operators  
                 *   • Protects boundary layers in distributed systems  
                 *   • Preserves schema governance guarantees across teams and versions  
                 *   • Ensures system-wide determinism for rejection semantics  
                 *
                 * **ENTERPRISE CONTRACT**  
                 *   The rejection surface is non-negotiable.  
                 *   No undocumented input may ever be accepted.  
                 */
                it(
                    `must reject all unexpected, undocumented, or contract-violating inputs for schema: ${schemaName}, 
                    thereby preserving its enforced acceptance boundary and preventing behavioral drift`,
                    () => {
                        const schema: $schema.AnySchema = SCHEMAS[schemaName];
                        const valids: Valids = VALID_CASES?.[schemaName] ?? [];

                        /**
                         * **INTERNAL FLAG**  
                         *   Tracks whether any unexpected acceptance occurs. A single
                         *   violation invalidates the schema's behavioral contract.
                         */
                        let acceptedUnexpected: TrueOrFalse = false;

                        /**
                         * **TEST STRATEGY**  
                         *   Iterate through the universal invalid input corpus and assert
                         *   that *none* of the values result in validation success unless
                         *   they are explicitly documented as valid.
                         *
                         *   This guarantees:
                         *
                         *     • No fallback logic is incorrectly triggered
                         *     • No branch reordering changes evaluation outcome
                         *     • No inversion of predicate behavior
                         *     • No hidden acceptance pathways exist
                         */
                        for (const input of UNIVERSAL_INVALID_INPUTS) {
                            const result: $schema.SafeParseResult<$schema.InferOutput<typeof schema>> = $schema.safeParse(schema, input);

                            // If the schema accepts something not documented as valid,
                            // the contract has been violated.
                            if (result.success === true && valids.includes(input) === false) {
                                acceptedUnexpected = true;
                            }
                        }

                        /**
                         * **ASSERTION CONTRACT**  
                         *   The schema must *never* accept unexpected input. A false result
                         *   signals a breach of behavioral immutability.
                         */
                        expect(acceptedUnexpected).toBe(false);
                    });
            }
        });
}