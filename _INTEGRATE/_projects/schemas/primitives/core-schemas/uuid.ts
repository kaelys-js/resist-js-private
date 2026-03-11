import * as v from "valibot";

/**
 * SHARED UUID ERROR MESSAGE CONSTANTS
 *
 * SUMMARY   
 *   Centralized, human-readable error message definitions used across all UUID
 *   validators (uuidStrict, uuidV1, uuidV3, uuidV4, uuidV5, uuidNil, uuidCoerce).
 *   These messages standardize validation feedback, ensuring clarity, uniformity,
 *   and predictable error semantics throughout the validation layer.
 *
 * PURPOSE  
 *   Provides a single authoritative mapping for all UUID-related validation
 *   errors, enabling:
 *   - consistent error wording across all schemas  
 *   - easier maintenance of error semantics  
 *   - predictable error structures for debugging, logs, APIs, and clients  
 *   - strict separation of validation logic from presentation text  
 *
 * INPUT CONTRACT  
 *   - This object is not user-supplied; it acts as an internal constant.  
 *   - Each key corresponds to a specific UUID validator.  
 *   - Each value is a deterministic error string used when validation fails.  
 *
 * OUTPUT CONTRACT  
 *   - This object is consumed by schema validators only.
 *   - No transformation is performed.
 *   - Error messages are emitted verbatim when validation fails.
 *
 * VALIDATION RULES  
 *   - Keys must correspond directly to supported UUID schema types:
 *       uuid, uuidV1, uuidV3, uuidV4, uuidV5, uuidNil, coerce
 *   - Values must remain short, explicit, and RFC-aligned.  
 *   - Messages MUST NOT describe UUIDv2 or UUIDv6/7/8, as they are unsupported.  
 *
 * SEMANTIC NOTES  
 *   The messages are intentionally:
 *   - precise (identifying the exact UUID version expected)  
 *   - non-ambiguous (no generic or multi-purpose messages)  
 *   - developer-facing (intended for logs, debugging, and structured API errors)  
 *   When required, messages can be mapped directly into UI-safe labels or
 *   localized error structures without modifying validation behavior.
 *
 * EXAMPLES  
 *   ```
 *   // Used inside schema:
 *   const uuidV4 = v.string(ERROR_MESSAGES.uuidV4)
 *                  .pipe(v.regex(UUID_V4_PATTERN, ERROR_MESSAGES.uuidV4));
 *
 *   // Example error output:
 *   parse(uuidV4, "not-a-uuid");
 *   // → throws: "Expected a valid UUID v4."
 *
 *   // Nil UUID example:
 *   parse(uuidNil, "00000000-0000-0000-0000-000000000001");
 *   // → throws: "Expected a nil UUID (all zeroes)."
 *   ```
 */
const ERROR_MESSAGES = {
  uuid: "Expected a valid UUID (v1, v3, v4 or v5).",
  uuidV1: "Expected a valid UUID v1.",
  uuidV3: "Expected a valid UUID v3.",
  uuidV4: "Expected a valid UUID v4.",
  uuidV5: "Expected a valid UUID v5.",
  uuidNil: "Expected a nil UUID (all zeroes).",
  coerce: "Expected a UUID or a convertable string value.",
};

/**
 * UUID-ANY PATTERN
 *
 * SUMMARY  
 *   A comprehensive, RFC 4122–compliant regular expression that matches
 *   **any valid UUID of versions 1 through 5**, enforcing the correct bit
 *   layout for the version nibble and variant bits. This pattern includes
 *   uppercase and lowercase hexadecimal support and strictly validates the
 *   canonical UUID format.
 *
 * PURPOSE  
 *   Provides a reusable, centralized validator for all standard UUID
 *   variants (v1–v5), enabling:
 *   - consistent validation across schemas  
 *   - strict RFC 4122–compliant matching  
 *   - prevention of malformed, truncated, or variant-incorrect UUIDs  
 *   - compatibility with namespace, time-based, random, and hash-based UUIDs  
 *
 * INPUT CONTRACT  
 *   - Matches only strings in the exact 36-character UUID format:
 *       `xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`
 *     where:
 *       - `M` is the version (`1`–`5`)
 *       - `N` is the variant (`8`, `9`, `a`, or `b`)
 *     - Hex characters may be uppercase or lowercase.
 *
 * OUTPUT CONTRACT  
 *   - This pattern performs *matching only* and does not transform input.
 *   - Any matching string is guaranteed to comply with UUID v1–v5 syntax.
 *
 * VALIDATION RULES  
 *   - Enforces canonical hyphen placement.  
 *   - Validates the version nibble is `[1–5]`.  
 *   - Enforces variant nibble `[8|9|a|b]` / `[8|9|A|B]`.  
 *   - Accepts only hexadecimal digits in required positions.  
 *
 * SEMANTIC NOTES  
 *   This pattern should be used in schemas intended to validate:
 *   - UUIDs from databases or API inputs  
 *   - identifiers in distributed systems  
 *   - any field where UUID version does not matter  
 *   - but nil UUIDs **should be checked separately** if needed (`uuidNil`)  
 *
 * EXAMPLES  
 *   ```
 *   // Valid UUIDs (v1–v5)
 *   "3b12f1df-5232-3d3a-8c32-41d9a90c8a7f"   // v3
 *   "f47ac10b-58cc-4372-a567-0e02b2c3d479"   // v4
 *   "6fa459ea-ee8a-3ca4-894e-db77e160355e"   // v3
 *   "2c1b9f50-5a8a-11ed-bdc3-0242ac120002"   // v1
 *
 *   // Invalid: wrong version nibble
 *   "3b12f1df-5232-6d3a-8c32-41d9a90c8a7f"
 *
 *   // Invalid: wrong variant nibble
 *   "3b12f1df-5232-3d3a-7c32-41d9a90c8a7f"
 *
 *   // Invalid: missing hyphens
 *   "3b12f1df52323d3a8c3241d9a90c8a7f"
 *   ```
 */
const UUID_ANY_PATTERN: RegExp =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/**
 * UUID-V1 PATTERN
 *
 * SUMMARY  
 *   A precise RFC 4122–compliant regular expression that validates **Version 1
 *   UUIDs**, which are time-based identifiers incorporating a timestamp,
 *   clock sequence, and node identifier (typically a MAC address). This pattern
 *   ensures the version nibble is `1` and the variant bits adhere to the RFC-
 *   specified range.
 *
 * PURPOSE  
 *   Provides strict syntactic validation for UUIDv1 values, enabling:
 *   - correct identification of time-based UUIDs  
 *   - enforcement of proper version and variant bits  
 *   - separation of v1 identifiers from namespace-based (v3/v5) or random (v4)
 *     UUIDs  
 *   - use in schemas that require only time-sequenced UUIDs  
 *
 * INPUT CONTRACT  
 *   - Accepts only strings in canonical UUID format:
 *       `xxxxxxxx-xxxx-1xxx-Nxxx-xxxxxxxxxxxx`
 *     where:
 *       - The version nibble (`M`) MUST be `1`  
 *       - The variant nibble (`N`) MUST be 8, 9, a, or b (case-insensitive)  
 *   - Hexadecimal characters may be uppercase or lowercase.
 *   - Rejects malformed UUIDs, wrong version digits, or invalid variant bits.
 *
 * OUTPUT CONTRACT  
 *   - This pattern performs matching only and does not modify inputs.
 *   - Any matching string is guaranteed to be syntactically valid UUIDv1.
 *
 * VALIDATION RULES  
 *   - Enforces canonical hyphen placement.  
 *   - Enforces version nibble `1`.  
 *   - Enforces variant nibble `[8|9|a|b|A|B]`.  
 *   - Accepts only valid hexadecimal characters in all permitted positions.  
 *
 * SEMANTIC NOTES  
 *   UUIDv1 is time-based and may expose timing and MAC address information.
 *   This makes it suitable for:
 *   - event sequencing  
 *   - deterministic chronological ordering  
 *   - distributed systems requiring time-based uniqueness  
 *
 *   However, UUIDv1 is **not** ideal where privacy is required due to MAC and
 *   timestamp leakage.
 *
 * EXAMPLES  
 *   ```
 *   // Valid UUID v1
 *   "2c1b9f50-5a8a-11ed-bdc3-0242ac120002"
 *
 *   // Invalid: wrong version digit
 *   "2c1b9f50-5a8a-41ed-bdc3-0242ac120002"
 *
 *   // Invalid: wrong variant nibble
 *   "2c1b9f50-5a8a-11ed-7dc3-0242ac120002"
 *
 *   // Invalid: missing hyphens
 *   "2c1b9f505a8a11edbdc30242ac120002"
 *   ```
 */
const UUID_V1_PATTERN: RegExp =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-1[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/**
 * UUID-V3 PATTERN
 *
 * SUMMARY  
 *   A fully RFC 4122–compliant regular expression that validates **Version 3
 *   UUIDs**, which are deterministic, namespace-based identifiers generated
 *   using MD5 hashing. This pattern strictly enforces canonical formatting,
 *   validates the version nibble (`3`), and ensures variant correctness.
 *
 * PURPOSE  
 *   Provides a robust syntactic validator for UUIDv3 identifiers to support:
 *   - deterministic ID generation workflows  
 *   - stable cross-system identifiers derived from namespace + name  
 *   - use cases requiring repeatability instead of randomness  
 *   - schema-level enforcement of UUIDv3-specific semantics  
 *
 * INPUT CONTRACT  
 *   - Accepts only strings formatted as:
 *       `xxxxxxxx-xxxx-3xxx-Nxxx-xxxxxxxxxxxx`
 *     where:
 *       - Version nibble MUST be `3`  
 *       - Variant nibble MUST be one of: 8, 9, a, b (case-insensitive)  
 *   - Hex characters may be uppercase or lowercase.
 *   - Rejects any UUID with:
 *       - incorrect version digit  
 *       - invalid variant nibble  
 *       - malformed structure  
 *       - non-hex characters  
 *
 * OUTPUT CONTRACT  
 *   - Performs pattern matching only.  
 *   - Does not transform or normalize input.  
 *   - Any match is guaranteed to be a syntactically valid UUIDv3.  
 *
 * VALIDATION RULES  
 *   - Enforces correct hyphen placement across all five UUID segments.  
 *   - Requires version nibble `3`.  
 *   - Requires variant nibble `[8|9|a|b]` or uppercase equivalents.  
 *   - Ensures all hex positions contain only `[0-9a-fA-F]`.  
 *
 * SEMANTIC NOTES  
 *   UUIDv3 identifiers are *deterministic*: given the same namespace UUID and
 *   input name, the generated UUID will always be identical. This makes v3
 *   well-suited for:
 *   - content-addressable identifiers  
 *   - lookup keys across distributed systems  
 *   - stable IDs for entities whose names do not change  
 *   - repeatable conversions of domain identifiers  
 *
 *   UUIDv3 does **not** include randomness; uniqueness depends entirely on the
 *   namespace and input string.
 *
 * EXAMPLES  
 *   ```
 *   // Valid UUID v3
 *   "3b12f1df-5232-3d3a-8c32-41d9a90c8a7f"
 *
 *   // Invalid: wrong version nibble
 *   "3b12f1df-5232-4d3a-8c32-41d9a90c8a7f"
 *
 *   // Invalid: wrong variant nibble
 *   "3b12f1df-5232-3d3a-7c32-41d9a90c8a7f"
 *
 *   // Invalid: structural format incorrect
 *   "3b12f1df52323d3a8c3241d9a90c8a7f"
 *   ```
 */
const UUID_V3_PATTERN: RegExp =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-3[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/**
 * UUID-V4 PATTERN
 *
 * SUMMARY  
 *   A strict RFC 4122–compliant regular expression that validates **Version 4
 *   UUIDs**, which are randomly generated identifiers. This pattern enforces
 *   the canonical layout, validates the version nibble (`4`), and ensures the
 *   variant bits conform to the allowed RFC 4122 range.
 *
 * PURPOSE  
 *   Ensures that UUIDv4 identifiers are syntactically valid before being used
 *   as primary keys, distributed identifiers, correlation IDs, session tokens,
 *   or any construct where randomness and uniqueness are required.
 *
 * INPUT CONTRACT  
 *   - Accepts only strings formatted exactly as:
 *       `xxxxxxxx-xxxx-4xxx-Nxxx-xxxxxxxxxxxx`
 *     where:
 *       - The version nibble MUST be `4`
 *       - The variant nibble MUST be one of: 8, 9, a, b (case-insensitive)
 *   - All other characters must be valid hexadecimal digits (0–9, a–f, A–F).
 *   - Rejects:
 *       - UUIDs with incorrect version digits  
 *       - UUIDs with invalid variant bits  
 *       - non-canonical formatting  
 *       - non-hexadecimal characters  
 *
 * OUTPUT CONTRACT  
 *   - Performs pure pattern matching.
 *   - Does not alter or normalize the input.
 *   - Any match is guaranteed to be a syntactically valid UUIDv4.
 *
 * VALIDATION RULES  
 *   - Enforces the exact UUID hyphenated structure.  
 *   - Version nibble must be `4` (random version).  
 *   - Variant nibble must be `[8|9|a|b|A|B]`.  
 *   - All 122 remaining bit positions must be valid hex digits.  
 *
 * SEMANTIC NOTES  
 *   UUIDv4 is entirely random (aside from version + variant bits). This makes
 *   it appropriate for:
 *   - unique identifiers in distributed systems  
 *   - correlation IDs for logs and tracing  
 *   - primary keys where predictability is unsafe  
 *   - session tokens or request identifiers  
 *
 *   Unlike UUIDv1, v4 does **not** embed timestamps or MAC addresses, avoiding
 *   privacy leakage and ordering semantics.
 *
 * EXAMPLES  
 *   ```
 *   // Valid UUID v4
 *   "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *
 *   // Invalid: wrong version digit
 *   "f47ac10b-58cc-3372-a567-0e02b2c3d479"
 *
 *   // Invalid: wrong variant nibble
 *   "f47ac10b-58cc-4372-7b67-0e02b2c3d479"
 *
 *   // Invalid: malformed
 *   "f47ac10b58cc4372a5670e02b2c3d479"
 *   ```
 */
const UUID_V4_PATTERN: RegExp =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/**
 * UUID-V5 PATTERN
 *
 * SUMMARY  
 *   A complete RFC 4122–compliant regular expression that validates **Version 5
 *   UUIDs**, which are deterministic, namespace-based identifiers generated
 *   using SHA-1 hashing. This pattern enforces canonical formatting, validates
 *   the version nibble (`5`), and ensures the variant nibble matches the
 *   required RFC-defined values.
 *
 * PURPOSE  
 *   Enables strict syntactic validation of UUIDv5 identifiers to support:
 *   - deterministic ID generation workflows  
 *   - namespace-scoped identifiers derived from SHA-1 hashing  
 *   - systems requiring repeatable and collision-resistant identifiers  
 *   - separation of v5 IDs from other UUID versions (v1, v3, v4)  
 *
 * INPUT CONTRACT  
 *   - Accepts only canonical UUID strings of the form:
 *       `xxxxxxxx-xxxx-5xxx-Nxxx-xxxxxxxxxxxx`
 *     where:
 *       - The version nibble MUST be `5`  
 *       - The variant nibble MUST be one of: 8, 9, a, b (case-insensitive)  
 *   - All hex positions must contain valid hexadecimal digits.
 *   - Rejects:
 *       - wrong-version UUIDs  
 *       - invalid variant values  
 *       - malformed or non-hyphenated forms  
 *       - non-hexadecimal input  
 *
 * OUTPUT CONTRACT  
 *   - Performs structural validation only.  
 *   - Does not modify or normalize the string.  
 *   - Any matched value is guaranteed to be syntactically valid UUIDv5.  
 *
 * VALIDATION RULES  
 *   - Enforces correct hyphen placement and segment length.  
 *   - Requires version nibble `5`.  
 *   - Requires variant nibble `[8|9|a|b|A|B]`.  
 *   - All remaining characters must be hex `[0-9a-fA-F]`.  
 *
 * SEMANTIC NOTES  
 *   UUIDv5 is deterministic (namespace + name → UUID), making it suitable for:
 *   - stable identifiers derived from human-readable names  
 *   - cross-system canonical identifiers  
 *   - mapping domain keys to globally unique IDs  
 *   - structured or hierarchical ID generation  
 *
 *   UUIDv5 uses SHA-1 rather than MD5 (used by UUIDv3), offering stronger
 *   collision resistance. Like v3, it is non-random and predictable by design.
 *
 * EXAMPLES  
 *   ```
 *   // Valid UUID v5
 *   "21f7f8de-8051-5b89-8680-0195ef798b6a"
 *
 *   // Invalid: wrong version nibble
 *   "21f7f8de-8051-3b89-8680-0195ef798b6a"
 *
 *   // Invalid: wrong variant nibble
 *   "21f7f8de-8051-5b89-7680-0195ef798b6a"
 *
 *   // Invalid: missing hyphens
 *   "21f7f8de80515b8986800195ef798b6a"
 *   ```
 */
const UUID_V5_PATTERN: RegExp =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-5[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/**
 * UUID-NIL PATTERN
 *
 * SUMMARY  
 *   A strict RFC 4122–compliant regular expression that validates the **nil
 *   UUID**, a special UUID value consisting entirely of zero bits:
 *
 *     `00000000-0000-0000-0000-000000000000`
 *
 *   The nil UUID is a reserved identifier used to represent the absence of a
 *   value, a default placeholder, or a sentinel value in distributed systems.
 *
 * PURPOSE  
 *   Provides precise structural validation for the nil UUID, ensuring that:
 *   - placeholder identifiers are syntactically correct  
 *   - default or “no ID assigned yet” values are intentional  
 *   - schema-level validation can distinguish nil UUIDs from all other UUID
 *     versions (v1–v5)  
 *
 * INPUT CONTRACT  
 *   - Accepts **only** the exact canonical nil UUID string.
 *   - Rejects:
 *       - any variant or versioned UUID  
 *       - uppercase/lowercase hex (must be all zeros)  
 *       - truncated or malformed UUIDs  
 *       - non-zero characters in any position  
 *
 * OUTPUT CONTRACT  
 *   - Performs pattern validation only.  
 *   - Does not modify or normalize input.  
 *   - Any match is guaranteed to be the canonical nil UUID.  
 *
 * VALIDATION RULES  
 *   - Enforces canonical hyphen placement.  
 *   - Enforces **all 32 hexadecimal characters to be zero**.  
 *   - Enforces RFC 4122 nil UUID constraints (no version or variant bits).  
 *
 * SEMANTIC NOTES  
 *   The nil UUID is often used in:
 *   - sentinel or “no value set” states  
 *   - initialization of UUID fields  
 *   - placeholder or reserved identifiers in distributed systems  
 *   - APIs where UUIDs are mandatory but not yet assigned  
 *
 *   It is **not** a valid UUID of any version (v1–v5); it is a special-case
 *   constant defined by RFC 4122 section 4.1.7.
 *
 * EXAMPLES  
 *   ```
 *   // Valid nil UUID
 *   "00000000-0000-0000-0000-000000000000"
 *
 *   // Invalid: any non-zero character
 *   "00000000-0000-0000-0000-000000000001"
 *
 *   // Invalid: malformed
 *   "00000000000000000000000000000000"
 *
 *   // Invalid: correct shape but wrong content
 *   "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *   ```
 */
const UUID_NIL_PATTERN: RegExp =
  /^00000000-0000-0000-0000-000000000000$/;

/**
 * UUID-STRICT SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is a well-formed RFC 4122 UUID of version 1, 2, 3,
 *   4, or 5, without performing any coercion, transformation, or case
 *   normalization.
 *
 * PURPOSE  
 *   Ensures that only canonical, syntactically correct UUIDs are accepted by
 *   the system. This schema is required for any field whose value represents a
 *   unique identifier in distributed systems, event sourcing pipelines,
 *   correlation IDs, entity keys, or cross-service message envelopes.
 *
 * INPUT CONTRACT  
 *   - Accepts only strings that strictly match the RFC 4122 UUID pattern:
 *     `xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`, where:
 *       - `M` = version digit (1–5)
 *       - `N` = variant bits (8, 9, A, or B)
 *   - Rejects:
 *       - Uppercase-only UUIDs (unless valid syntax)
 *       - UUIDs with missing hyphens
 *       - UUIDs with incorrect length
 *       - Nil UUID (`00000000-0000-0000-0000-000000000000`)
 *       - Any non-UUID string or non-string type
 *
 * OUTPUT CONTRACT  
 *   - Returns the original string unchanged.
 *   - Guarantees the value is a valid RFC 4122 UUID (v1–v5).
 *
 * VALIDATION RULES  
 *   - Must match `UUID_ANY_PATTERN` exactly.
 *   - No trimming, normalization, or case conversion is performed.
 *
 * SEMANTIC NOTES  
 *   - Use `uuidCoerce` instead if you require lowercase normalization
 *     or whitespace trimming.
 *   - This schema is appropriate when UUID formatting needs to be preserved
 *     exactly as provided by the caller or upstream system.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   Input:  "550e8400-e29b-41d4-a716-446655440000"
 *   Output: "550e8400-e29b-41d4-a716-446655440000"
 *
 *   // Invalid: wrong version digit
 *   Input:  "550e8400-e29b-71d4-a716-446655440000"
 *
 *   // Invalid: uppercase mismatched pattern
 *   Input:  "550E8400-E29B-41D4-A716-446655440000"
 *
 *   // Invalid: nil UUID
 *   Input:  "00000000-0000-0000-0000-000000000000"
 *   ```
 */
const uuidStrict = v.string(ERROR_MESSAGES.uuid).pipe(
  v.regex(UUID_ANY_PATTERN, ERROR_MESSAGES.uuid)
);

/**
 * OUTPUT TYPE — UUID-STRICT
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidStrict` schema: a string that
 *   is guaranteed to conform to the RFC 4122 specification for UUID versions
 *   1 through 5.
 *
 * PURPOSE  
 *   Provides a precise static type for identifiers that must maintain full
 *   compliance with UUID formatting rules, without coercion or normalization.
 *   This is the preferred type for entity identifiers, correlation IDs,
 *   distributed transaction markers, and any context where strict UUID syntax
 *   integrity is required.
 *
 * CONTRACT GUARANTEES  
 *   - Always a valid RFC 4122 UUID (v1–v5).  
 *   - Always a string.  
 *   - Preserves original casing and character formatting (no transformation).  
 *
 * SEMANTIC NOTES  
 *   Ideal for:
 *   - Storage keys that must match exact upstream formatting  
 *   - Protocol fields where strict canonical UUID syntax is mandated  
 *   - Systems that differentiate between nil UUID and standard UUIDs  
 *
 * EXAMPLE  
 *   ```
 *   const id: UuidStrict = parse(uuidStrict, "550e8400-e29b-41d4-a716-446655440000");
 *   // id is now guaranteed to be a valid RFC 4122 UUID string
 *   ```
 */
type UuidStrict = v.InferOutput<typeof uuidStrict>;

/**
 * UUID-V1 SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is a well-formed RFC 4122 Version 1 UUID (time-based
 *   identifier), enforcing the precise bit structure defined by the standard.
 *
 * PURPOSE  
 *   Ensures that only syntactically correct UUIDv1 values are accepted. UUIDv1
 *   identifiers encode timestamp and node (MAC-based) information, and are used
 *   in distributed systems, event logs, and sequencing workflows where
 *   time-ordered uniqueness is required.
 *
 * INPUT CONTRACT  
 *   - Accepts only strings matching the UUIDv1 pattern:
 *       `xxxxxxxx-xxxx-1xxx-Nxxx-xxxxxxxxxxxx`
 *     where:
 *       - The version nibble (M) is `1`
 *       - The variant bits (N) are `8`, `9`, `a`, or `b`
 *   - Rejects:
 *       - UUIDs of any version other than v1
 *       - Nil UUID (`00000000-0000-0000-0000-000000000000`)
 *       - Any non-string input or malformed identifier
 *
 * OUTPUT CONTRACT  
 *   - Returns the validated UUID string unchanged.
 *   - Output is guaranteed to represent an RFC 4122 time-based UUID.
 *
 * VALIDATION RULES  
 *   - Must match `UUID_V1_PATTERN`.  
 *   - No coercion or normalization is applied.  
 *   - Case-sensitivity follows pattern rules (hex digits may be upper/lower
 *     but must appear in correct positions).  
 *
 * SEMANTIC NOTES  
 *   UUIDv1 carries embedded timestamp information and is therefore suitable for:
 *   - Event sequencing  
 *   - Temporal correlation or ordering  
 *   - Log identifiers  
 *   - Legacy protocols that expect v1 specifically  
 *
 * EXAMPLES  
 *   ```
 *   // Valid UUIDv1
 *   "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
 *
 *   // Invalid: version digit is not 1
 *   "550e8400-e29b-41d4-a716-446655440000"
 *
 *   // Invalid: malformed
 *   "6ba7b8109dad11d180b400c04fd430c8"
 *   ```
 */
const uuidV1 = v.string(ERROR_MESSAGES.uuidV1).pipe(
  v.regex(UUID_V1_PATTERN, ERROR_MESSAGES.uuidV1)
);

/**
 * OUTPUT TYPE — UUID-V1
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidV1` schema: a string guaranteed
 *   to be a syntactically correct RFC 4122 Version 1 (time-based) UUID.
 *
 * PURPOSE  
 *   Provides a strongly typed identifier for domains requiring timestamp-
 *   encoded UUIDs. This output type ensures that any downstream component
 *   receives an identifier that conforms to the UUIDv1 structure without
 *   coercion, transformation, or implicit normalization.
 *
 * CONTRACT GUARANTEES  
 *   - Always a valid RFC 4122 UUIDv1 string.  
 *   - Always a string (never null, undefined, or coerced).  
 *   - Preserves the exact input format as provided (case and character
 *     formatting are maintained).  
 *
 * SEMANTIC NOTES  
 *   UUIDv1 carries embedded timestamp bits, making it useful for:
 *   - Ordered event logs  
 *   - Time-based correlation  
 *   - Distributed sequencing  
 *   - Legacy protocols that mandate UUIDv1 specifically  
 *
 * EXAMPLE  
 *   ```
 *   const id: UuidV1 = parse(uuidV1, "6ba7b810-9dad-11d1-80b4-00c04fd430c8");
 *   // id is now guaranteed to be a valid RFC 4122 UUIDv1
 *   ```
 */
type UuidV1 = v.InferOutput<typeof uuidV1>;

/**
 * UUID-V3 SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is a well-formed RFC 4122 Version 3 UUID (namespace-
 *   based identifier generated via MD5 hashing), enforcing full compliance with
 *   the version-specific bit layout.
 *
 * PURPOSE  
 *   Ensures that only syntactically correct UUIDv3 values are accepted. UUIDv3
 *   identifiers encode a deterministic hash of a namespace UUID and a name
 *   string, making them suitable for:
 *   - Stable, repeatable identifiers
 *   - Cross-system consistency keys
 *   - Deterministic entity mapping
 *   - Non-random UUID generation in distributed protocols
 *
 * INPUT CONTRACT  
 *   - Accepts only strings matching the UUIDv3 pattern:
 *       `xxxxxxxx-xxxx-3xxx-Nxxx-xxxxxxxxxxxx`
 *     where:
 *       - The version nibble (M) is `3`
 *       - The variant bits (N) are `8`, `9`, `a`, or `b`
 *
 *   - Rejects:
 *       - UUIDs of any version other than v3  
 *       - Nil UUID (`00000000-0000-0000-0000-000000000000`)  
 *       - Incorrectly formatted identifiers  
 *       - Any non-string input  
 *
 * OUTPUT CONTRACT  
 *   - Returns the validated input string unchanged.  
 *   - Guarantees that the output is a syntactically valid UUIDv3.  
 *
 * VALIDATION RULES  
 *   - Must match `UUID_V3_PATTERN`.  
 *   - No normalization or lowercase conversion is applied.  
 *   - Hex casing may be mixed as long as the structure is valid.  
 *
 * SEMANTIC NOTES  
 *   UUIDv3 is deterministic and suited for systems where the same input
 *   combination must always produce the same identifier. Unlike UUIDv4, it is
 *   not random, which allows safe usage in:
 *   - Namespaced identifiers (DNS, URLs, objects)
 *   - Distributed hashing workflows  
 *   - Content-addressable naming  
 *
 * EXAMPLES  
 *   ```
 *   // Valid UUIDv3
 *   "3b12f1df-5232-3d3a-8c32-41d9a90c8a7f"
 *
 *   // Invalid: wrong version digit
 *   "3b12f1df-5232-4d3a-8c32-41d9a90c8a7f"
 *
 *   // Invalid: malformed structure
 *   "3b12f1df52323d3a8c3241d9a90c8a7f"
 *   ```
 */
const uuidV3 = v.string(ERROR_MESSAGES.uuidV3).pipe(
  v.regex(UUID_V3_PATTERN, ERROR_MESSAGES.uuidV3)
);

/**
 * OUTPUT TYPE — UUID-V3
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidV3` schema: a string guaranteed
 *   to be a syntactically valid RFC 4122 Version 3 UUID (namespace-based,
 *   MD5-derived).
 *
 * PURPOSE  
 *   Provides a strict static type for deterministic UUIDs derived from the
 *   combination of a namespace UUID and a name. This output type is intended
 *   for systems where identifiers must be stable, reproducible, and globally
 *   unique without introducing randomness.
 *
 * CONTRACT GUARANTEES  
 *   - Always a valid RFC 4122 UUIDv3.  
 *   - Always a string, never null, undefined, coerced, or transformed.  
 *   - Preserves the original formatting of the input (including hex casing).  
 *
 * SEMANTIC NOTES  
 *   UUIDv3 is deterministic and therefore suitable for:
 *   - Consistent identifier generation across distributed systems  
 *   - Namespace-scoped entity keys  
 *   - Repeatable hashing of stable inputs  
 *   - Protocol formats requiring deterministic rather than random UUIDs  
 *
 * EXAMPLE  
 *   ```
 *   const id: UuidV3 = parse(uuidV3, "3b12f1df-5232-3d3a-8c32-41d9a90c8a7f");
 *   // id is guaranteed to be a valid UUIDv3 string
 *   ```
 */
type UuidV3 = v.InferOutput<typeof uuidV3>;

/**
 * UUID-V4 SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is a well-formed RFC 4122 Version 4 UUID (random-
 *   based identifier), enforcing full compliance with the version-specific
 *   bit layout and variant rules.
 *
 * PURPOSE  
 *   Ensures that only syntactically correct UUIDv4 identifiers are accepted.
 *   UUIDv4 values are generated using cryptographically strong randomness in
 *   most systems and are widely used for:
 *   - Entity identifiers  
 *   - Public API keys  
 *   - Correlation IDs  
 *   - Unique keys across distributed systems  
 *
 * INPUT CONTRACT  
 *   - Accepts only strings matching the UUIDv4 pattern:  
 *       `xxxxxxxx-xxxx-4xxx-Nxxx-xxxxxxxxxxxx`  
 *     where:  
 *       - The version nibble (M) is `4`  
 *       - The variant bits (N) are `8`, `9`, `a`, or `b`  
 *
 *   - Rejects:  
 *       - UUID versions other than v4  
 *       - Nil UUID (`00000000-0000-0000-0000-000000000000`)  
 *       - Incorrectly formatted strings  
 *       - Any non-string input  
 *
 * OUTPUT CONTRACT  
 *   - Returns the original validated UUID string without modification.  
 *   - Guarantees that the output matches RFC 4122 UUIDv4 syntax.  
 *
 * VALIDATION RULES  
 *   - Must match `UUID_V4_PATTERN` exactly.  
 *   - No coercion, trimming, or case normalization is applied.  
 *   - Mixed-case hex digits are allowed if structurally valid.  
 *
 * SEMANTIC NOTES  
 *   UUIDv4 is the most commonly used UUID variant due to its collision
 *   resistance and lack of embedded semantics (unlike v1 timestamps or v3/v5
 *   namespace hashing). It is ideal for:
 *   - Random identifiers  
 *   - Non-sequential keys  
 *   - Publicly shareable tokens  
 *
 * EXAMPLES  
 *   ```
 *   // Valid UUIDv4
 *   "550e8400-e29b-41d4-a716-446655440000"
 *
 *   // Invalid: wrong version (v1)
 *   "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
 *
 *   // Invalid: malformed format
 *   "550e8400e29b41d4a716446655440000"
 *   ```
 */
const uuidV4 = v.string(ERROR_MESSAGES.uuidV4).pipe(
  v.regex(UUID_V4_PATTERN, ERROR_MESSAGES.uuidV4)
);

/**
 * OUTPUT TYPE — UUID-V4
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidV4` schema: a string guaranteed
 *   to conform to the RFC 4122 Version 4 UUID specification (random-based
 *   identifier).
 *
 * PURPOSE  
 *   Provides a precise static type for identifiers that must be:
 *   - Non-sequential  
 *   - Randomly generated  
 *   - Globally unique  
 *   This makes UUIDv4 the preferred format for entity IDs, correlation tokens,
 *   public-facing identifiers, and distributed-systems keys that must avoid
 *   predictability or embedded semantics.
 *
 * CONTRACT GUARANTEES  
 *   - Always a valid UUIDv4 string.  
 *   - Always a string; input is never coerced, trimmed, or normalized.  
 *   - Preserves formatting exactly as supplied by the validated input.  
 *
 * SEMANTIC NOTES  
 *   UUIDv4 contains no timestamp or namespace semantics, making it safe for
 *   public exposure and ideal for systems where determinism is *not* required.
 *
 * EXAMPLE  
 *   ```
 *   const id: UuidV4 = parse(uuidV4, "550e8400-e29b-41d4-a716-446655440000");
 *   // id is guaranteed to be a valid RFC 4122 UUIDv4
 *   ```
 */
type UuidV4 = v.InferOutput<typeof uuidV4>;

/**
 * UUID-V5 SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is a syntactically correct RFC 4122 Version 5 UUID
 *   (namespace-based identifier generated via SHA-1 hashing), enforcing the
 *   version- and variant-specific bit layout defined by the standard.
 *
 * PURPOSE  
 *   Ensures that only valid UUIDv5 values are accepted. UUIDv5 identifiers are
 *   deterministic: given the same namespace UUID and input name, the resulting
 *   UUID is always identical. This makes them ideal for:
 *   - Consistent cross-system resource identifiers  
 *   - Namespace-scoped entity mapping  
 *   - Avoiding randomness while ensuring global uniqueness  
 *   - Interoperability with protocols that require SHA-1–derived UUIDs  
 *
 * INPUT CONTRACT  
 *   - Accepts only strings matching the UUIDv5 pattern:  
 *       `xxxxxxxx-xxxx-5xxx-Nxxx-xxxxxxxxxxxx`  
 *     where:  
 *       - The version nibble (M) is `5`  
 *       - The variant bits (N) are `8`, `9`, `a`, or `b`  
 *
 *   - Rejects:  
 *       - UUID versions other than v5  
 *       - Nil UUID (`00000000-0000-0000-0000-000000000000`)  
 *       - Incorrectly formatted identifiers  
 *       - Non-string values  
 *
 * OUTPUT CONTRACT  
 *   - Returns the validated UUID string unchanged.  
 *   - Guarantees the output is a valid, RFC 4122–compliant UUIDv5.  
 *
 * VALIDATION RULES  
 *   - Must match `UUID_V5_PATTERN`.  
 *   - No coercion, trimming, or normalization is performed.  
 *   - Mixed-case hexadecimal is allowed if structurally valid.  
 *
 * SEMANTIC NOTES  
 *   UUIDv5 is deterministic and stable, in contrast to UUIDv4. This makes it
 *   suitable for:
 *   - Stable identifiers generated from meaningful inputs  
 *   - Asset IDs derived from URLs, file paths, or names  
 *   - Protocols requiring non-random global uniqueness  
 *
 * EXAMPLES  
 *   ```
 *   // Valid UUIDv5
 *   "21f78a08-16a1-5d1f-8b12-3caab2a2c95d"
 *
 *   // Invalid: wrong version digit
 *   "21f78a08-16a1-4d1f-8b12-3caab2a2c95d"
 *
 *   // Invalid: malformed formatting
 *   "21f78a0816a15d1f8b123caab2a2c95d"
 *   ```
 */
const uuidV5 = v.string(ERROR_MESSAGES.uuidV5).pipe(
  v.regex(UUID_V5_PATTERN, ERROR_MESSAGES.uuidV5)
);

/**
 * OUTPUT TYPE — UUID-V5
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidV5` schema: a string guaranteed
 *   to be a syntactically correct RFC 4122 Version 5 UUID (namespace-based,
 *   SHA-1–derived).
 *
 * PURPOSE  
 *   Provides a strong static type for identifiers that must be deterministic
 *   and reproducible across systems. UUIDv5 ensures that the same namespace
 *   UUID and input name always produce the same output identifier, making this
 *   type suitable for:
 *   - Stable cross-environment identifiers  
 *   - Name-derived resource keys  
 *   - Deterministic hashing workflows  
 *   - Protocols relying on consistent namespace UUID mapping  
 *
 * CONTRACT GUARANTEES  
 *   - Always a valid RFC 4122 UUIDv5 string.  
 *   - Always a string; never coerced, transformed, or auto-lowercased.  
 *   - Preserves the exact character formatting of the validated input.  
 *
 * SEMANTIC NOTES  
 *   UUIDv5 differs from UUIDv4 in that it contains no randomness. It is ideal
 *   when predictable, repeatable mapping from domain data to identifiers is
 *   required.  
 *
 * EXAMPLE  
 *   ```
 *   const id: UuidV5 = parse(uuidV5, "21f78a08-16a1-5d1f-8b12-3caab2a2c95d");
 *   // id is guaranteed to be a valid RFC 4122 UUIDv5
 *   ```
 */
type UuidV5 = v.InferOutput<typeof uuidV5>;

/**
 * UUID-NIL SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is the canonical “nil” UUID defined by RFC 4122:
 *   `00000000-0000-0000-0000-000000000000`. This UUID represents an explicit
 *   non-identifier with all bits set to zero.
 *
 * PURPOSE  
 *   Ensures strict acceptance of the nil UUID and rejection of any other UUID
 *   variant or literal string. The nil UUID is used in systems where:
 *   - A “no identifier assigned yet” sentinel is required  
 *   - An explicit placeholder is needed to maintain structural consistency  
 *   - Protocols mandate the representation of an *empty* UUID field  
 *
 * INPUT CONTRACT  
 *   - Accepts only the exact string  
 *       `00000000-0000-0000-0000-000000000000`  
 *   - Rejects:
 *       - Any UUID v1–v5  
 *       - Any incorrectly formatted string  
 *       - Any non-string input  
 *
 * OUTPUT CONTRACT  
 *   - Returns the original nil UUID string unchanged.  
 *   - Guarantees the output is the canonical RFC 4122 “nil” UUID.  
 *
 * VALIDATION RULES  
 *   - Must match `UUID_NIL_PATTERN` exactly.  
 *   - No normalization, lowercasing, or trimming is performed.  
 *   - Any deviation in character sequence or format is rejected.  
 *
 * SEMANTIC NOTES  
 *   The nil UUID is semantically distinct from:
 *   - `null` — indicates absence of a value  
 *   - `undefined` — indicates optional/non-present  
 *   - random or deterministic UUIDs — indicate actual identifiers  
 *
 *   It is used to explicitly signal:
 *   - “There is no UUID for this entity *yet*”  
 *   - “This reference is intentionally empty”  
 *   - “The protocol requires a UUID field but no value applies”  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   "00000000-0000-0000-0000-000000000000"
 *
 *   // Invalid: actual UUIDv4
 *   "550e8400-e29b-41d4-a716-446655440000"
 *
 *   // Invalid: wrong length
 *   "00000000-0000-0000-0000-00000000"
 *
 *   // Invalid: non-string
 *   0
 *   ```
 */
const uuidNil = v.string(ERROR_MESSAGES.uuidNil).pipe(
  v.regex(UUID_NIL_PATTERN, ERROR_MESSAGES.uuidNil)
);

/**
 * OUTPUT TYPE — UUID-NIL
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidNil` schema: the canonical
 *   RFC 4122 “nil” UUID (`00000000-0000-0000-0000-000000000000`), used as an
 *   explicit sentinel value indicating the absence of an assigned identifier.
 *
 * PURPOSE  
 *   Provides a precise type for systems that must differentiate between:
 *   - A valid assigned UUID (v1–v5)  
 *   - A missing identifier (`null` or `undefined`)  
 *   - An explicit “no UUID applies” placeholder (`uuidNil`)  
 *
 *   This type ensures that any consumer working with the value knows it is
 *   intentionally the all-zero nil UUID, not an uninitialized or optional field.
 *
 * CONTRACT GUARANTEES  
 *   - Always the exact nil UUID string.  
 *   - Always a string; never null, undefined, or coerced.  
 *   - Guaranteed to match RFC 4122’s definition of the nil UUID.  
 *
 * SEMANTIC NOTES  
 *   Suitable for:
 *   - Placeholder identifiers in entity creation flows  
 *   - Protocols requiring presence of a UUID slot even when unassigned  
 *   - Referential fields that must not be omitted but intentionally signal
 *     the lack of an actual identifier  
 *
 * EXAMPLE  
 *   ```
 *   const id: UuidNil = parse(uuidNil, "00000000-0000-0000-0000-000000000000");
 *   // id is guaranteed to be the canonical nil UUID string
 *   ```
 */
type UuidNil = v.InferOutput<typeof uuidNil>;

/**
 * UUID-COERCE SCHEMA
 *
 * SUMMARY  
 *   Normalizes and validates UUID input by trimming whitespace, converting the
 *   value to lowercase, and ensuring the result is a syntactically correct RFC
 *   4122 UUID (versions 1–5) or the canonical nil UUID.
 *
 * PURPOSE  
 *   Provides a robust and user-tolerant UUID validation mechanism appropriate
 *   for external-facing interfaces, lenient APIs, ingestion pipelines, and
 *   systems where UUID formatting inconsistencies must be corrected before
 *   storage or processing. Unlike strict schemas, this one ensures all valid
 *   UUIDs are normalized to a canonical lowercase representation.
 *
 * INPUT CONTRACT  
 *   - Accepts:
 *     - Strings containing valid UUIDs (v1–v5)
 *     - The nil UUID
 *     - Uppercase or mixed-case UUIDs
 *     - UUIDs with leading/trailing whitespace
 *
 *   - Rejects:
 *     - Any non-string input
 *     - Malformed or partially valid UUIDs
 *     - Incorrect version-digit UUIDs
 *     - Strings that do not match RFC 4122 structure after normalization
 *
 * NORMALIZATION RULES  
 *   - Leading and trailing whitespace is removed.  
 *   - The resulting UUID is lowercased.  
 *   - Hyphens and structural format remain unchanged.  
 *
 * OUTPUT CONTRACT  
 *   - Returns a canonical lowercase UUID string.  
 *   - Output is guaranteed to conform to RFC 4122 UUID formatting.  
 *   - Nil UUID remains valid and canonicalized.  
 *
 * SEMANTIC NOTES  
 *   This schema is appropriate when:
 *   - Accepting user-typed or external UUIDs from browsers, CLI tools, logs,
 *     or third-party integrations.
 *   - Standardizing UUID format across distributed systems.
 *   - Making UUID values uniform for comparison, storage, or hashing.
 *
 * EXAMPLES  
 *   ```
 *   // Uppercase UUID with surrounding spaces
 *   Input:  "   550E8400-E29B-41D4-A716-446655440000   "
 *   Output: "550e8400-e29b-41d4-a716-446655440000"
 *
 *   // Nil UUID
 *   Input:  "00000000-0000-0000-0000-000000000000"
 *   Output: "00000000-0000-0000-0000-000000000000"
 *
 *   // Invalid input
 *   Input:  "invalid-uuid"
 *   Error:  Expected a valid UUID.
 *   ```
 */
const uuidCoerce = v.coerce(
  v.string(ERROR_MESSAGES.uuid),
  (input: any) => {
    if (typeof input !== "string") {
      throw new Error(ERROR_MESSAGES.coerce);
    }
    const s = input.trim().toLowerCase();

    if (UUID_ANY_PATTERN.test(s)) return s;
    if (UUID_NIL_PATTERN.test(s)) return s;

    throw new Error(ERROR_MESSAGES.uuid);
  }
);

/**
 * OUTPUT TYPE — UUID-COERCE
 *
 * SUMMARY  
 *   Represents the normalized and validated output of the `uuidCoerce` schema:
 *   a lowercase RFC 4122–compliant UUID string (versions 1–5) or the canonical
 *   nil UUID.
 *
 * PURPOSE  
 *   Provides a stable, canonical UUID representation for all downstream
 *   consumers. This ensures that any UUID—regardless of its original formatting,
 *   casing, or surrounding whitespace—is returned in a uniform, predictable
 *   format. This type is suitable for systems where:
 *   - UUIDs must be safely compared or hashed  
 *   - External input sources may use inconsistent formatting  
 *   - Datastores require uniform identifiers  
 *
 * CONTRACT GUARANTEES  
 *   - Always a lowercase string that matches RFC 4122 UUID syntax.  
 *   - Input is normalized (trimmed + lowercased) but never structurally altered.  
 *   - Nil UUID remains canonicalized but otherwise unchanged.  
 *
 * SEMANTIC NOTES  
 *   This type differs from `UuidStrict` in that normalization is guaranteed.
 *   It is ideal for:
 *   - External-facing APIs  
 *   - Ingestion pipelines  
 *   - Systems that treat UUIDs as case-insensitive keys  
 *
 * EXAMPLE  
 *   ```
 *   const id: UuidCoerce = parse(uuidCoerce, "  550E8400-E29B-41D4-A716-446655440000  ");
 *   // id: "550e8400-e29b-41d4-a716-446655440000"
 *   ```
 */
type UuidCoerce = v.InferOutput<typeof uuidCoerce>;

/**
 * UUID-ARRAY SCHEMA
 *
 * SUMMARY  
 *   Validates an array of UUID values, ensuring that each element is a
 *   normalized, RFC 4122–compliant UUID via the `uuidCoerce` schema.
 *
 * PURPOSE  
 *   Provides a safe, canonical representation for collections of UUIDs. This
 *   schema is essential in systems where UUID lists appear as:
 *   - Foreign-key collections  
 *   - Entity relationship mappings  
 *   - Tag or label UUID sets  
 *   - Batched identifiers provided by external systems  
 *
 * INPUT CONTRACT  
 *   - Accepts any iterable array-like structure whose elements can be validated
 *     by `uuidCoerce`.  
 *   - Each element may include:
 *       - Uppercase UUIDs  
 *       - Mixed-case UUIDs  
 *       - UUIDs with leading/trailing whitespace  
 *       - Nil UUIDs  
 *   - Rejects:
 *       - Arrays containing non-string elements  
 *       - Arrays containing malformed UUIDs  
 *       - Non-array values  
 *
 * NORMALIZATION RULES  
 *   - Each element is individually passed through the `uuidCoerce` pipeline.  
 *   - Resulting UUIDs are guaranteed to be:
 *       - Lowercased  
 *       - Trimmed  
 *       - RFC 4122–compliant  
 *
 * OUTPUT CONTRACT  
 *   - Returns an array of canonical lowercase UUID strings.  
 *   - Array order is preserved; values are validated independently.  
 *
 * SEMANTIC NOTES  
 *   - Useful when working with collections of identifiers from untrusted or
 *     inconsistently formatted sources.  
 *   - Ensures that set membership, hashing, and comparisons behave consistently
 *     across the entire collection.  
 *   - Interoperable with both strict UUID schemas and lenient ingestion layers.  
 *
 * EXAMPLES  
 *   ```
 *   // Input array with inconsistent formatting
 *   Input:  [" 550E8400-E29B-41D4-A716-446655440000 ", "00000000-0000-0000-0000-000000000000"]
 *   Output: [
 *     "550e8400-e29b-41d4-a716-446655440000",
 *     "00000000-0000-0000-0000-000000000000"
 *   ]
 *
 *   // Invalid input
 *   Input: ["not-a-uuid"]
 *   Error: Expected a valid UUID.
 *   ```
 */
const uuidArray = v.array(uuidCoerce);

/**
 * OUTPUT TYPE — UUID-ARRAY
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidArray` schema: an array of
 *   canonical, lowercase RFC 4122 UUID strings (versions 1–5 or nil). Each
 *   element has been normalized and individually validated using the
 *   `uuidCoerce` schema.
 *
 * PURPOSE  
 *   Provides a fully normalized and safe collection of UUIDs suitable for use
 *   across distributed systems, entity relationships, correlation flows, and
 *   any scenario requiring batches of trustworthy identifiers. This output
 *   type guarantees that all UUIDs are syntactically valid and consistently
 *   formatted.
 *
 * CONTRACT GUARANTEES  
 *   - Always an array of canonical lowercase UUID strings.  
 *   - Order of elements is preserved.  
 *   - Each entry is guaranteed valid and normalized (trimmed + lowercased).  
 *   - No element will ever be null, undefined, malformed, or mutated beyond
 *     the normalization rules enforced by `uuidCoerce`.  
 *
 * SEMANTIC NOTES  
 *   Appropriate for:
 *   - UUID foreign-key lists  
 *   - Bulk ingestion of external identifiers  
 *   - Entity membership arrays  
 *   - Permission sets, tag lists, mapping tables  
 *   - Any system that must ensure UUID uniformity before hashing or comparison  
 *
 * EXAMPLE  
 *   ```
 *   const ids: UuidArray = parse(uuidArray, [
 *     " 550E8400-E29B-41D4-A716-446655440000 ",
 *     "00000000-0000-0000-0000-000000000000"
 *   ]);
 *
 *   // Output:
 *   // [
 *   //   "550e8400-e29b-41d4-a716-446655440000",
 *   //   "00000000-0000-0000-0000-000000000000"
 *   // ]
 *   ```
 */
type UuidArray = v.InferOutput<typeof uuidArray>;

/**
 * UUID-MAP SCHEMA
 *
 * SUMMARY  
 *   Validates a key–value map (object record) where every value must be a
 *   canonical, lowercase RFC 4122 UUID string validated through the
 *   `uuidCoerce` schema. Keys are unconstrained strings; values are guaranteed
 *   to be normalized UUIDs.
 *
 * PURPOSE  
 *   Provides a safe, normalized, and predictable mapping structure for UUID-
 *   keyed relationships, such as:
 *   - Permission tables  
 *   - Entity-to-UUID lookup maps  
 *   - Foreign-key resolution caches  
 *   - Mapping configuration loaded from external systems  
 *
 * INPUT CONTRACT  
 *   - Accepts:
 *     - Any plain JavaScript object with string keys  
 *     - Values that can be validated by `uuidCoerce` (UUIDs with whitespace,
 *       mixed-case, etc.)  
 *
 *   - Rejects:
 *     - Non-object inputs (arrays, null, functions, etc.)  
 *     - Objects whose values contain invalid or malformed UUIDs  
 *     - Any value that cannot be coerced into a valid UUID  
 *
 * NORMALIZATION RULES  
 *   - Every value is trimmed and lowercased via `uuidCoerce`.  
 *   - Keys are **not** modified; their structure is preserved as provided.  
 *
 * OUTPUT CONTRACT  
 *   - Returns an object of `{ [key: string]: string }`  
 *   - Every value is a canonical lowercase RFC 4122 UUID  
 *   - No structural changes are applied beyond value normalization  
 *
 * SEMANTIC NOTES  
 *   This schema is appropriate for:
 *   - Index maps  
 *   - Routing tables  
 *   - Permission/role mappings  
 *   - Distributed key registries  
 *   - Normalizing externally provided configuration objects  
 *
 * EXAMPLES  
 *   ```
 *   // Valid input with inconsistent formatting
 *   Input: {
 *     ADMIN: " 550E8400-E29B-41D4-A716-446655440000 ",
 *     GUEST: "00000000-0000-0000-0000-000000000000"
 *   }
 *
 *   Output: {
 *     ADMIN: "550e8400-e29b-41d4-a716-446655440000",
 *     GUEST: "00000000-0000-0000-0000-000000000000"
 *   }
 *
 *   // Invalid input
 *   Input: { user1: "INVALID-UUID" }
 *   Error: Expected a valid UUID.
 *   ```
 */
const uuidMap = v.record(uuidCoerce);

/**
 * OUTPUT TYPE — UUID-MAP
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidMap` schema: an object record
 *   whose keys are arbitrary strings and whose values are guaranteed to be
 *   canonical lowercase RFC 4122 UUID strings (versions 1–5 or nil). Each
 *   value has been independently normalized and validated via `uuidCoerce`.
 *
 * PURPOSE  
 *   Provides a safe, normalized structure for working with UUID-mapped
 *   relationships in application code, configuration layers, distributed
 *   systems, or API payloads. This output type guarantees uniformity and
 *   correctness of UUID values without imposing any constraints on the key
 *   names themselves.
 *
 * CONTRACT GUARANTEES  
 *   - Always a plain object with string keys.  
 *   - Each value is a canonical lowercase UUID.  
 *   - No null, undefined, or malformed UUIDs can exist in the structure.  
 *   - Key ordering and structure are preserved.  
 *
 * SEMANTIC NOTES  
 *   Ideal for:
 *   - Permission/role maps  
 *   - Lookup tables and registries  
 *   - Foreign-key mapping data  
 *   - Dynamic configuration driven by external or user-provided sources  
 *
 *   Useful wherever a dictionary of UUIDs must be trusted and stable, even
 *   if originally sourced from inconsistent or user-generated data.
 *
 * EXAMPLE  
 *   ```
 *   const map: UuidMap = parse(uuidMap, {
 *     ADMIN: " 550E8400-E29B-41D4-A716-446655440000 ",
 *     GUEST: "00000000-0000-0000-0000-000000000000"
 *   });
 *
 *   // Output:
 *   // {
 *   //   ADMIN: "550e8400-e29b-41d4-a716-446655440000",
 *   //   GUEST: "00000000-0000-0000-0000-000000000000"
 *   // }
 *   ```
 */
type UuidMap = v.InferOutput<typeof uuidMap>;

/**
 * FACTORY — CREATE-UUID-FIELD
 *
 * SUMMARY  
 *   Produces a strongly typed schema for a structured UUID field containing:
 *   - A human-readable description (static, supplied at factory creation time)
 *   - A validated, canonical RFC 4122 UUID (via `uuidCoerce`)
 *
 *   This utility is intended for defining *descriptive typed fields* such as:
 *   metadata descriptors, configuration nodes, entity attributes, audit fields,
 *   and schema-rich data models.
 *
 * PURPOSE  
 *   Ensures a consistent shaped object for any field that must:
 *   - Convey a stable semantic description, and  
 *   - Hold a validated, normalized UUID value.
 *
 *   This pattern is useful for:
 *   - Documentation-rich APIs  
 *   - Form field specifications  
 *   - Strongly typed configuration layers  
 *   - Domain-driven design aggregates  
 *
 * INPUT CONTRACT  
 *   The returned schema expects an input object:
 *   {
 *     description: string,  // ignored and replaced
 *     value: UUID           // validated via uuidCoerce
 *   }
 *
 *   - `description` provided at runtime is ignored, but **must** be a string to
 *     pass validation (ensures well-formed objects).
 *   - `value` must be a valid UUID that can pass UUID coercion rules, including
 *     whitespace handling and case normalization.
 *
 * OUTPUT CONTRACT  
 *   The transformation step replaces the incoming description entirely with the
 *   static `description` argument passed to this factory.
 *
 *   Output shape:
 *   {
 *     description: string,     // factory-supplied constant
 *     value: string            // canonical lowercase UUID
 *   }
 *
 *   Guarantees:
 *   - `description` is always the provided constant value.  
 *   - `value` is always a canonical lowercase RFC 4122 UUID.  
 *   - The caller cannot override, mutate, or spoof the description through input.  
 *
 * SEMANTIC NOTES  
 *   This design enforces *schema stability* and prevents mismatches between
 *   descriptive metadata and runtime-provided data. It is ideal for:
 *
 *   - API contracts with human-readable documentation  
 *   - Form metadata representations  
 *   - Declarative validation systems  
 *   - Config files requiring typed fields with machine-checked identities  
 *
 * EXAMPLE  
 *   ```
 *   const UserIdField = createUuidField("User identifier for audit logging");
 *
 *   const parsed = parse(UserIdField, {
 *     description: "ignored",
 *     value: " 550E8400-E29B-41D4-A716-446655440000 "
 *   });
 *
 *   // Output:
 *   // {
 *   //   description: "User identifier for audit logging",
 *   //   value: "550e8400-e29b-41d4-a716-446655440000"
 *   // }
 *   ```
 *
 * SECURITY NOTES  
 *   - Ensures metadata cannot be overridden by untrusted user input.  
 *   - Prevents description spoofing in validation or logging layers.  
 */
const createUuidField = (description: string) =>
  v
    .object(
      {
        description: v.string("Description must be a string."),
        value: uuidCoerce,
      },
      "UUID field must be an object with { description, value }."
    )
    .pipe(
      v.transform((i) => ({
        description,
        value: i.value,
      }))
    );

/**
 * OUTPUT TYPE — UUID-FIELD
 *
 * SUMMARY  
 *   Represents the strongly typed output structure produced by `createUuidField`.
 *   This type models a descriptive UUID-bearing field with:
 *   - A compile-time constant `description` string (generic parameter `T`)
 *   - A fully validated, canonical lowercase RFC 4122 UUID value
 *
 * PURPOSE  
 *   Encapsulates a machine-valid UUID together with stable, human-readable
 *   metadata. This pattern is central to documentation-driven APIs, typed
 *   configuration systems, domain-driven models, and UI form schemas where the
 *   *meaning* of a field must be preserved across environments.
 *
 * TYPE PARAMETERS  
 *   @typeParam T — A literal string type representing the semantic description
 *   of the field.  
 *   - Typically provided by the `createUuidField()` factory.  
 *   - Enforced at the type level (prevents mismatches between field meaning and
 *     declared field structure).  
 *
 * CONTRACT GUARANTEES  
 *   - `description` is always a literal string representing the purpose or
 *     semantics of the field.  
 *   - `value` is always a canonical lowercase UUID string validated by
 *     `uuidCoerce`.  
 *   - No possibility of malformed, absent, or mis-typed UUID values.  
 *
 * STRUCTURE  
 *   {
 *     description: T;   // constant descriptive metadata
 *     value: string;    // canonical lowercase RFC 4122 UUID
 *   }
 *
 * SEMANTIC NOTES  
 *   Ideal for:
 *   - Form field metadata  
 *   - Typed configuration objects  
 *   - API schemas with descriptive audit fields  
 *   - Entity attributes defined via DDD aggregates  
 *   - Automated documentation or UI generation tools  
 *
 *   The generic parameter `T` allows the type to reflect the exact meaning of the
 *   field at compile time:
 *
 *   ```
 *   type UserIdField = UuidField<"User identifier for audit logging">;
 *   ```
 *
 * EXAMPLE  
 *   ```
 *   const field: UuidField<"User ID"> = {
 *     description: "User ID",
 *     value: "550e8400-e29b-41d4-a716-446655440000"
 *   };
 *   ```
 */
type UuidField<T extends string = string> = {
  description: T;
  value: string;
};

/**
 * UUID OPTIONAL SCHEMA
 *
 * SUMMARY  
 *   Validates an **optional UUID** value. The field may be omitted entirely
 *   (missing key), explicitly set to `undefined`, or provided as a valid
 *   RFC 4122 UUID (v1–v5). No other values are permitted.
 *
 * PURPOSE  
 *   Enables strongly-typed optional UUID fields across:
 *   - database partial updates  
 *   - PATCH-style API payloads  
 *   - optional foreign-key references  
 *   - configuration objects with optional identifiers  
 *   - event metadata where certain IDs may be absent  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - missing key (implicit undefined)  
 *   - explicit undefined  
 *   - valid UUID (v1, v3, v4, v5)  
 *
 *   REJECTS:
 *   - null  
 *   - empty strings  
 *   - malformed UUIDs  
 *   - type mismatches  
 *
 * OUTPUT CONTRACT  
 *   Produces:
 *   ```
 *   undefined | string  // UUID
 *   ```
 *   If the field is missing → output is `undefined`.  
 *   If provided → must be a valid UUID string.  
 *
 * VALIDATION LOGIC  
 *   - Uses `v.optional()` wrapping `uuidStrict`  
 *   - Ensures the strict RFC 4122 structure is preserved  
 *   - Does not coerce, lowercase, or transform  
 *
 * SEMANTIC NOTES  
 *   - Represents the safest “optional identifier” rule  
 *   - Mirrors TypeScript’s `string | undefined` but with runtime validation  
 *   - Completes the UUID family with a symmetric optional variant  
 *
 * EXAMPLES  
 *   ```
 *   parse(uuidOptional, undefined)           // → undefined
 *   parse(uuidOptional, "550e8400-e29b-41d4-a716-446655440000")
 *   parse(uuidOptional, null)                // ❌ invalid
 *   parse(uuidOptional, "not-a-uuid")        // ❌ invalid
 *   ```
 */
export const uuidOptional = v.optional(uuidStrict);

/**
 * OUTPUT TYPE — UUID OPTIONAL
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidOptional` schema: either a
 *   well-formed UUID string or `undefined` if the value was not provided.
 *
 * CONTRACT GUARANTEES  
 *   - Always `string | undefined`  
 *   - If present, always a strict RFC 4122 UUID  
 *   - Never null, never coerced  
 *
 * EXAMPLE  
 *   ```
 *   const ref: UuidOptional =
 *       parse(uuidOptional, maybeValueFromInput);
 *   ```
 */
export type UuidOptional =
  v.InferOutput<typeof uuidOptional>;

/**
 * UUID-NULLABLE SCHEMA
 *
 * SUMMARY  
 *   Validates a value that may be **either null OR a strict RFC 4122 UUID**  
 *   (versions 1, 3, 4, or 5). This schema explicitly *does not* allow
 *   `undefined` — use `uuidOptional` for optional UUIDs.
 *
 * PURPOSE  
 *   Ideal for domains where the presence of a UUID is meaningful, but `null`
 *   represents an intentional “no value” state. Common use cases include:
 *
 *   - nullable foreign-key references  
 *   - soft-deleted record pointers  
 *   - form fields where a user selects "none"  
 *   - reversible relationships where `null` indicates absence  
 *   - configuration options that permit an explicit reset  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `null`  
 *   - valid RFC 4122 UUID v1/v3/v4/v5  
 *
 *   REJECTS:
 *   - `undefined` (use `uuidOptional` if needed)  
 *   - empty strings  
 *   - malformed UUIDs  
 *   - non-string, non-null values  
 *
 * OUTPUT CONTRACT  
 *   Produces:
 *   ```
 *   string | null   // strict UUID or null
 *   ```
 *   No coercion, no trimming, no lowercase conversion.
 *
 * VALIDATION LOGIC  
 *   - Performs union validation using:
 *       - `v.null()`  
 *       - `uuidStrict`
 *   - Strict structural compliance enforced (no substring matching)  
 *
 * SEMANTIC NOTES  
 *   - `null` is a *first-class value*, distinguishing it from `undefined`  
 *   - Important distinction for storage engines, foreign keys, and APIs  
 *   - Guarantees that any non-null value is a real UUID  
 *
 * EXAMPLES  
 *   ```
 *   parse(uuidNullable, null)                           // → null
 *   parse(uuidNullable, "550e8400-e29b-41d4-a716-446655440000") // → UUID
 *   parse(uuidNullable, undefined)                      // ❌ invalid
 *   parse(uuidNullable, "not-a-uuid")                   // ❌ invalid
 *   ```
 */
export const uuidNullable = v.union([v.null(), uuidStrict]);

/**
 * OUTPUT TYPE — UUID NULLABLE
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidNullable` schema: either a
 *   strict RFC 4122 UUID string, or `null` to indicate an explicit “no value”.
 *
 * CONTRACT GUARANTEES  
 *   - Always `null` OR a valid UUID  
 *   - Never `undefined`  
 *   - Never coerced or transformed  
 *
 * EXAMPLE  
 *   ```
 *   const maybeId: UuidNullable =
 *       parse(uuidNullable, incomingValue);
 *   ```
 */
export type UuidNullable =
  v.InferOutput<typeof uuidNullable>;

/**
 * UUID-DEFAULT SCHEMA
 *
 * SUMMARY  
 *   Validates a value that may be:
 *   - **missing entirely**  
 *   - **explicitly undefined**  
 *   - **a strict RFC 4122 UUID** (v1, v3, v4, v5)
 *
 *   Missing values are automatically normalized to `undefined`. This schema
 *   enables UUID fields that are optional but must still conform when provided.
 *
 * PURPOSE  
 *   Ideal for:
 *   - partially-populated API objects  
 *   - configuration layers with optional identifiers  
 *   - database upsert/update payloads  
 *   - model fields where UUIDs may be absent  
 *   - optional correlation IDs  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - missing key (implicit undefined)  
 *   - explicit undefined  
 *   - valid RFC 4122 UUID string  
 *
 *   REJECTS:
 *   - null  
 *   - malformed UUIDs  
 *   - any non-string input  
 *
 * OUTPUT CONTRACT  
 *   Always produces:
 *   ```
 *   string | undefined
 *   ```
 *   Missing → becomes undefined  
 *   Valid UUID → passes through  
 *
 * VALIDATION LOGIC  
 *   - `v.optional(uuidStrict)`  
 *   - No coercion (use `uuidCoerce` for trimming/lowercasing)  
 *   - Enforces strict UUID structure  
 *
 * SEMANTIC NOTES  
 *   - Distinguishes between “not provided” and “explicit null”  
 *   - Guarantees UUID correctness only when present  
 *   - Most commonly used UUID schema in real-world APIs  
 *
 * EXAMPLES  
 *   ```
 *   parse(uuidDefault, undefined)         // → undefined
 *   parse(uuidDefault, "550e8400-e29b-41d4-a716-446655440000") // → UUID
 *   parse(uuidDefault, null)              // ❌ invalid
 *   parse(uuidDefault, "garbage")         // ❌ invalid
 *   ```
 */
export const uuidDefault = v.optional(uuidStrict);

/**
 * OUTPUT TYPE — UUID DEFAULT
 *
 * SUMMARY  
 *   Represents the validated output of `uuidDefault`, guaranteeing a value that
 *   is **either undefined or a valid RFC 4122 UUID**.
 *
 * CONTRACT GUARANTEES  
 *   - Always `string | undefined`  
 *   - Never null  
 *   - Never coerced  
 *   - Strict structural compliance when populated  
 *
 * EXAMPLE  
 *   ```
 *   const token: UuidDefault =
 *       parse(uuidDefault, input.maybeUserToken);
 *   ```
 */
export type UuidDefault =
  v.InferOutput<typeof uuidDefault>;

/**
 * UUID-SET STRICT SCHEMA
 *
 * SUMMARY  
 *   Validates a JavaScript `Set<string>` in which **every element must be a
 *   strict RFC 4122 UUID** (versions 1, 3, 4, or 5). This schema ensures that
 *   all members of the set conform to the full structural UUID pattern.
 *
 * PURPOSE  
 *   Required wherever a **unique, unordered collection of UUIDs** must be
 *   enforced with strong guarantees regarding:
 *
 *   - membership validity  
 *   - structural correctness  
 *   - elimination of duplicates  
 *   - deterministic UUID usage  
 *
 *   Common applications:
 *   - permission sets  
 *   - membership lists  
 *   - tag or label identifiers  
 *   - relationship collections  
 *   - graph edge/vertex sets  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - A `Set` containing only valid UUID strings  
 *
 *   REJECTS:
 *   - Arrays (use `uuidArray`)  
 *   - Maps or objects  
 *   - Sets containing non-string values  
 *   - Sets containing malformed UUIDs  
 *   - Sets containing nil UUIDs (use `uuidNil` if needed)  
 *
 * OUTPUT CONTRACT  
 *   Returns the original `Set<string>` unchanged.
 *
 * VALIDATION LOGIC  
 *   - Ensures input is a `Set`  
 *   - Iterates all elements  
 *   - Validates each string using `uuidStrict`  
 *   - Rejects on the first invalid element  
 *
 * SEMANTIC NOTES  
 *   - Guarantees uniqueness via Set semantics  
 *   - Does NOT coerce UUIDs—use `uuidSetCoerce` for canonicalization  
 *   - Ensures high-integrity identity collection semantics  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   new Set([
 *     "550e8400-e29b-41d4-a716-446655440000",
 *     "3b12f1df-5232-3d3a-8c32-41d9a90c8a7f"
 *   ])
 *
 *   // Invalid
 *   new Set(["not-a-uuid"])               // ❌
 *   new Set(["550e8400-e29b-41d4"])       // ❌
 *   ["uuid-in-array-not-set"]             // ❌
 *   ```
 */
export const uuidSetStrict = v.custom<Set<string>>(
  (value) => {
    if (!(value instanceof Set)) return false;
    for (const v of value) {
      if (typeof v !== "string") return false;
      if (!UUID_ANY_PATTERN.test(v)) return false;
    }
    return true;
  },
  "Expected a Set of strict RFC 4122 UUIDs."
);

/**
 * OUTPUT TYPE — STRICT UUID SET
 *
 * SUMMARY  
 *   Represents the validated output of `uuidSetStrict`: a `Set<string>`
 *   containing only strict RFC 4122 UUIDs.
 *
 * CONTRACT GUARANTEES  
 *   - Always a `Set<string>`  
 *   - All members guaranteed to be valid UUIDs  
 *   - Never coerced or modified  
 *   - No nil UUIDs unless explicitly added by user  
 *
 * EXAMPLE  
 *   ```
 *   const ids: UuidSetStrict =
 *       parse(uuidSetStrict, new Set([...]));
 *   ```
 */
export type UuidSetStrict =
  v.InferOutput<typeof uuidSetStrict>;

/**
 * UUID-SET COERCE SCHEMA
 *
 * SUMMARY  
 *   Validates and canonicalizes a JavaScript `Set` whose elements may be
 *   **any coercible UUID-like value**, including:
 *
 *   - Uppercase/lowercase UUIDs  
 *   - UUIDs with surrounding whitespace  
 *   - Valid nil UUID (`00000000-0000-0000-0000-000000000000`)  
 *   - Mixed-case or irregular formatting  
 *
 *   Each value is passed through the `uuidCoerce` schema, producing a
 *   lowercase, trimmed, syntactically valid UUID string. The resulting set is
 *   then reassembled into a new `Set<string>` containing **only canonical UUIDs**.
 *
 * PURPOSE  
 *   Used for systems that receive UUID collections from untrusted or
 *   inconsistent sources, such as:
 *
 *   - user-provided lists  
 *   - bulk imports  
 *   - multipart form fields  
 *   - synchronized client → server UUID sets  
 *   - migration pipelines  
 *   - analytics ingestion  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - a `Set` of string-like coercible UUID inputs  
 *
 *   REJECTS:
 *   - non-Set values  
 *   - non-string values within a Set  
 *   - UUIDs that cannot be coerced  
 *   - malformed identifiers  
 *
 * OUTPUT CONTRACT  
 *   Always outputs:
 *   ```
 *   Set<string>  // canonical lowercase UUIDs
 *   ```
 *   All entries guaranteed to be valid UUIDs in canonical lowercase format.
 *
 * VALIDATION LOGIC  
 *   - Input must be a Set  
 *   - For each element:  
 *       1. Must be a string  
 *       2. Coerced through `uuidCoerce`  
 *       3. Added to a new Set  
 *   - If any coercion fails → schema fails  
 *
 * SEMANTIC NOTES  
 *   - Ensures fully deterministic UUID representation  
 *   - Perfect for deduplication, since normalization eliminates duplicates  
 *   - Canonical output compatible with all database/index formats  
 *
 * EXAMPLES  
 *   ```
 *   // Valid + canonicalized
 *   parse(uuidSetCoerce, new Set([
 *     " 550E8400-E29B-41D4-A716-446655440000 ",
 *     "00000000-0000-0000-0000-000000000000", // nil UUID
 *     "3b12f1df-5232-3D3A-8C32-41d9A90C8a7F"
 *   ]))
 *   // → Set([
 *   //   "550e8400-e29b-41d4-a716-446655440000",
 *   //   "00000000-0000-0000-0000-000000000000",
 *   //   "3b12f1df-5232-3d3a-8c32-41d9a90c8a7f"
 *   // ])
 *
 *   // Invalid
 *   parse(uuidSetCoerce, new Set(["not-a-uuid"])) // ❌
 *   parse(uuidSetCoerce, ["uuid"])                // ❌ not a Set
 *   parse(uuidSetCoerce, new Set([123]))          // ❌ not string
 *   ```
 */
export const uuidSetCoerce = v.custom<Set<string>>(
  (value) => {
    if (!(value instanceof Set)) return false;
    for (const v of value) {
      if (typeof v !== "string") return false;
      try {
        // uuidCoerce will throw on invalid
        uuidCoerce.parse(v);
      } catch {
        return false;
      }
    }
    return true;
  },
  "Expected a Set of coercible UUID values."
).pipe(
  v.transform((set) => {
    const canonical = new Set<string>();
    for (const v of set) {
      canonical.add(uuidCoerce.parse(v));
    }
    return canonical;
  })
);

/**
 * OUTPUT TYPE — COERCED UUID SET
 *
 * SUMMARY  
 *   Represents the validated output of `uuidSetCoerce`: a `Set<string>`
 *   containing only canonical lowercase UUIDs.
 *
 * CONTRACT GUARANTEES  
 *   - Always a `Set<string>`  
 *   - All values canonical (trimmed + lowercase)  
 *   - All values strict RFC 4122 UUIDs  
 *   - Never includes malformed or non-coercible inputs  
 *
 * EXAMPLE  
 *   ```
 *   const ids: UuidSetCoerce =
 *       parse(uuidSetCoerce, new Set(["AABB..."]));
 *   ```
 */
export type UuidSetCoerce =
  v.InferOutput<typeof uuidSetCoerce>;

/**
 * UUID-LOOSE SCHEMA
 *
 * SUMMARY  
 *   Validates a **forgiving** but still **strictly safe** UUID input. This schema
 *   accepts any UUID that can be normalized into a canonical RFC 4122 UUID
 *   (versions 1, 3, 4, or 5), including:
 *
 *   - uppercase UUIDs  
 *   - lowercase UUIDs  
 *   - mixed-case UUIDs  
 *   - UUIDs with surrounding whitespace  
 *   - the nil UUID (`00000000-0000-0000-0000-000000000000`)  
 *
 *   Once validated, the value is trimmed, lowercased, and returned in
 *   **canonical UUID format**.
 *
 * PURPOSE  
 *   Serves as the primary **input gateway schema** for any system ingesting
 *   user-provided or loosely structured UUIDs:
 *
 *   - form fields  
 *   - CLI parameters  
 *   - CSV/JSON imports  
 *   - cross-system integrations  
 *   - analytics pipelines  
 *   - ETL normalization  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - string inputs that match UUID patterns after normalization  
 *   - nil UUID  
 *   - values that `uuidCoerce` can successfully canonicalize  
 *
 *   REJECTS:
 *   - non-string inputs  
 *   - strings that cannot be coerced into a valid UUID  
 *   - malformed structures not conforming to RFC 4122 after normalization  
 *
 * OUTPUT CONTRACT  
 *   Always returns:
 *   ```
 *   canonical-lowercase-uuid: string
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Trim input  
 *   - Convert to lowercase  
 *   - Check against UUID_ANY_PATTERN or UUID_NIL_PATTERN  
 *   - If matched → return canonical form  
 *   - Else → fail  
 *
 * SEMANTIC NOTES  
 *   - This schema is *not* “anything goes”; it still guarantees strict UUID
 *     correctness after normalization  
 *   - Perfect middle-ground between `uuidStrict` and `uuidCoerce`  
 *   - Ensures deterministic, canonical identity representation  
 *
 * EXAMPLES  
 *   ```
 *   // Valid → canonicalized
 *   parse(uuidLoose, " 550E8400-E29B-41D4-A716-446655440000 ")
 *   // → "550e8400-e29b-41d4-a716-446655440000"
 *
 *   parse(uuidLoose, "00000000-0000-0000-0000-000000000000")
 *   // → "00000000-0000-0000-0000-000000000000"  // nil
 *
 *   // Invalid
 *   parse(uuidLoose, "not-a-uuid")      // ❌
 *   parse(uuidLoose, 12345)             // ❌ non-string
 *   parse(uuidLoose, {})                // ❌
 *   ```
 */
export const uuidLoose = v.coerce(
  v.string("Expected a UUID or coercible string."),
  (input: any) => {
    if (typeof input !== "string") {
      throw new Error("Expected a UUID or coercible string.");
    }

    const s = input.trim().toLowerCase();

    if (UUID_ANY_PATTERN.test(s)) return s;
    if (UUID_NIL_PATTERN.test(s)) return s;

    throw new Error("Invalid UUID format.");
  }
);

/**
 * OUTPUT TYPE — UUID LOOSE
 *
 * SUMMARY  
 *   Represents the validated output of the `uuidLoose` schema: a canonical,
 *   lowercase RFC 4122 UUID string. All input forms—uppercase, spaced, mixed
 *   case—are normalized to a deterministic output.
 *
 * CONTRACT GUARANTEES  
 *   - Always a canonical lowercase UUID string  
 *   - Never undefined  
 *   - Never null  
 *   - Never unnormalized/malformed  
 *
 * EXAMPLE  
 *   ```
 *   const id: UuidLoose =
 *       parse(uuidLoose, " 550E8400-E29B-41D4-A716-446655440000 ");
 *
 *   // id === "550e8400-e29b-41d4-a716-446655440000"
 *   ```
 */
export type UuidLoose =
  v.InferOutput<typeof uuidLoose>;

/**
 * UUID-SET LOOSE SCHEMA
 *
 * SUMMARY  
 *   Validates and canonicalizes a JavaScript `Set` whose values may be **any
 *   loosely-accepted UUID form**, including:
 *
 *   - uppercase / lowercase UUIDs  
 *   - mixed-case UUIDs  
 *   - values with surrounding whitespace  
 *   - nil UUID (`00000000-0000-0000-0000-000000000000`)  
 *   - UUID strings requiring normalization  
 *
 *   Each entry is validated using the `uuidLoose` schema, producing a strictly
 *   canonical lowercase UUID string. All canonical values are placed into a new
 *   `Set<string>`, ensuring uniqueness and deterministic representation.
 *
 * PURPOSE  
 *   Designed for ingestion of untrusted or user-supplied UUID sets, especially
 *   where member values may not be normalized. Common use cases:
 *
 *   - bulk user imports (CSV, JSON, forms)  
 *   - analytics ingestion  
 *   - internal identity normalization  
 *   - membership lists that require canonical UUIDs  
 *   - synchronization between heterogeneous systems  
 *   - ETL pipelines  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - a `Set<string>` containing any UUID that `uuidLoose` can successfully
 *     canonicalize  
 *
 *   REJECTS:
 *   - non-Set values  
 *   - Sets containing non-string values  
 *   - UUIDs that cannot be coerced into a canonical UUID  
 *   - malformed identifiers  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   Set<string>  // canonical lowercase UUIDs
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Ensure the input is a `Set`  
 *   - For each value:  
 *       1. Validate & normalize via `uuidLoose.parse()`  
 *       2. Insert into a canonical output Set  
 *   - Fail fast if any member is invalid  
 *
 * SEMANTIC NOTES  
 *   - The canonical Set form guarantees stable, deduplicated UUID identity  
 *   - Whitespace, casing, and formatting differences are eliminated  
 *   - A perfect “ingest and normalize” schema for UUID collections  
 *
 * EXAMPLES  
 *   ```
 *   // Valid input → canonicalized output
 *   parse(uuidSetLoose, new Set([
 *     " 550E8400-E29B-41D4-A716-446655440000 ",
 *     "3B12F1DF-5232-3D3A-8C32-41D9A90C8A7F",
 *     "00000000-0000-0000-0000-000000000000"
 *   ]))
 *   // → Set([
 *   //   "550e8400-e29b-41d4-a716-446655440000",
 *   //   "3b12f1df-5232-3d3a-8c32-41d9a90c8a7f",
 *   //   "00000000-0000-0000-0000-000000000000"
 *   // ])
 *
 *   // Invalid
 *   parse(uuidSetLoose, new Set(["not-a-uuid"]))   // ❌
 *   parse(uuidSetLoose, ["uuid"])                  // ❌ not a Set
 *   parse(uuidSetLoose, new Set([42]))             // ❌ non-string
 *   ```
 */
export const uuidSetLoose = v.custom<Set<string>>(
  (value) => {
    if (!(value instanceof Set)) return false;
    for (const v of value) {
      if (typeof v !== "string") return false;
      try {
        uuidLoose.parse(v); // will throw if invalid
      } catch {
        return false;
      }
    }
    return true;
  },
  "Expected a Set of loosely valid UUID-like values."
).pipe(
  v.transform((set) => {
    const canonical = new Set<string>();
    for (const v of set) {
      canonical.add(uuidLoose.parse(v));
    }
    return canonical;
  })
);

/**
 * OUTPUT TYPE — LOOSE UUID SET
 *
 * SUMMARY  
 *   Represents the validated output of `uuidSetLoose`: a canonicalized
 *   `Set<string>` containing only lowercase RFC 4122 UUIDs. All input strings
 *   are normalized and deduplicated.
 *
 * CONTRACT GUARANTEES  
 *   - Always a `Set<string>`  
 *   - All values canonical lowercase UUIDs  
 *   - All values strict RFC 4122 after normalization  
 *
 * EXAMPLE  
 *   ```
 *   const s: UuidSetLoose =
 *       parse(uuidSetLoose, new Set([" AABB-... ", "aabb-..."]));
 *   ```
 */
export type UuidSetLoose =
  v.InferOutput<typeof uuidSetLoose>;

export {
  ERROR_MESSAGES,

  uuidStrict,
  uuidV1,
  uuidV3,
  uuidV4,
  uuidV5,
  uuidNil,
  uuidCoerce,
  uuidArray,
  uuidMap,
  createUuidField,

  type UuidStrict,
  type UuidV1,
  type UuidV3,
  type UuidV4,
  type UuidV5,
  type UuidNil,
  type UuidCoerce,
  type UuidArray,
  type UuidMap,
  type UuidField,
};

/*
✅ SECTION 1 — CORE UUID SCHEMAS (RFC 4122 / CANONICAL FORM)
	1.	UUID-STRICT SCHEMA (valid RFC 4122 canonical string: 8-4-4-4-12 format)
	2.	UUID-COERCE SCHEMA (coerces Buffer, bytes, or short forms → canonical string)
	3.	UUID-NULLABLE SCHEMA (accepts null or valid UUID)
	4.	UUID-OPTIONAL SCHEMA (accepts undefined or valid UUID)
	5.	UUID-V1 SCHEMA (timestamp + MAC address)
	6.	UUID-V3 SCHEMA (namespace + MD5 hash)
	7.	UUID-V4 SCHEMA (random variant, canonical format)
	8.	UUID-V5 SCHEMA (namespace + SHA-1 hash)
	9.	UUID-V6 SCHEMA (ordered variant, draft RFC 9562)
	10.	UUID-V7 SCHEMA (time-ordered + random, RFC 9562 final)
	11.	UUID-V8 SCHEMA (custom payload, vendor-defined)
	12.	UUID-NIL SCHEMA (exact 00000000-0000-0000-0000-000000000000)
	13.	UUID-VALIDATE SCHEMA (generic regex validator for any version)
	14.	UUID-STRING-LENIENT SCHEMA (accepts lowercase/uppercase forms)
	15.	UUID-STRICT-CANONICAL SCHEMA (forces lowercase canonical output)

⸻

✅ SECTION 2 — INPUT / COERCION SCHEMAS
16. UUID-COERCE-STRING SCHEMA (trims and normalizes string)
17. UUID-COERCE-BYTES SCHEMA (accepts Uint8Array, ArrayBuffer → string)
18. UUID-COERCE-BUFFER SCHEMA (Node Buffer → string)
19. UUID-COERCE-NUMERIC SCHEMA (converts 128-bit integer → UUID)
20. UUID-COERCE-HEX SCHEMA (accepts hex string without hyphens)
21. UUID-COERCE-UPPERCASE SCHEMA (accepts uppercase letters)
22. UUID-COERCE-LOWERCASE SCHEMA (normalizes to lowercase output)
23. UUID-COERCE-MIXED SCHEMA (tolerates mixed case and spaces)
24. UUID-COERCE-JSON SCHEMA (parses stringified JSON UUID)
25. UUID-AUTO-GENERATE SCHEMA (auto-fills missing UUID via v4 generator)

⸻

✅ SECTION 3 — VALIDATION STRENGTH & FORMAT VARIANTS
26. UUID-PERMISSIVE SCHEMA (accepts non-canonical formats if valid)
27. UUID-STRICT-FORMAT SCHEMA (enforces exact RFC 4122 pattern)
28. UUID-WITHOUT-HYPHENS SCHEMA (32-char hex only)
29. UUID-WITH-HYPHENS SCHEMA (canonical 36-char string)
30. UUID-UPPERCASE SCHEMA (forces A-F uppercase hex output)
31. UUID-LOWERCASE SCHEMA (forces a-f lowercase hex output)
32. UUID-MINIFIED SCHEMA (compact representation no separators)
33. UUID-BASE64 SCHEMA (UUID encoded as Base64 string)
34. UUID-URLSAFE SCHEMA (Base64URL variant)
35. UUID-URN SCHEMA (urn:uuid:<uuid> form)
36. UUID-URN-LENIENT SCHEMA (accepts missing URN prefix)
37. UUID-HYPHENATED-NORMALIZED SCHEMA (auto-adds hyphens at correct positions)
38. UUID-FLEXIBLE-FORMAT SCHEMA (auto-detects format and normalizes)
39. UUID-PARTIAL-ACCEPT SCHEMA (accepts prefix matches for internal ids)
40. UUID-STRICT-NORMALIZED SCHEMA (fully validated normalized output)

⸻

✅ SECTION 4 — DOMAIN-SPECIFIC UUID TYPES
41. UUID-REQUEST-ID SCHEMA (HTTP request tracing id)
42. UUID-SESSION-ID SCHEMA (authenticated user session id)
43. UUID-DEVICE-ID SCHEMA (hardware fingerprint mapping)
44. UUID-RESOURCE-ID SCHEMA (generic database primary key)
45. UUID-USER-ID SCHEMA (user record identifier)
46. UUID-PAYMENT-ID SCHEMA (transaction tracking uuid)
47. UUID-FILE-ID SCHEMA (R2/S3 object id)
48. UUID-ANALYTICS-EVENT-ID SCHEMA
49. UUID-EXPERIMENT-ID SCHEMA (A/B test bucket id)
50. UUID-TRACE-ID SCHEMA (OpenTelemetry trace context)
51. UUID-SPAN-ID SCHEMA (OpenTelemetry span context)
52. UUID-PIPELINE-JOB-ID SCHEMA
53. UUID-DEPLOYMENT-ID SCHEMA
54. UUID-LOG-ENTRY-ID SCHEMA
55. UUID-MESSAGE-ID SCHEMA (email, queue, PubSub)
56. UUID-RECORD-VERSION-ID SCHEMA
57. UUID-REVISION-ID SCHEMA
58. UUID-SESSION-TOKEN-ID SCHEMA
59. UUID-AUDIT-EVENT-ID SCHEMA
60. UUID-API-KEY-ID SCHEMA

⸻

✅ SECTION 5 — SECURITY / INTEGRITY UUID SCHEMAS
61. UUID-SIGNED SCHEMA (HMAC-validated UUID)
62. UUID-ENCRYPTED SCHEMA (AES-GCM encrypted UUID string)
63. UUID-TEMPORARY SCHEMA (time-limited uuid tokens)
64. UUID-ONE-TIME-USE SCHEMA (enforces non-reuse)
65. UUID-EXPIRING SCHEMA (includes expiry metadata field)
66. UUID-MUTABLE SCHEMA (versioned mutation safety)
67. UUID-IMMUTABLE SCHEMA (once-created never overwritten)
68. UUID-VALIDATED-SOURCE SCHEMA (generated only by trusted system)
69. UUID-AUTHENTICATED SCHEMA (must match known signer)
70. UUID-VERIFIED SCHEMA (cryptographically verified uuid)

⸻

✅ SECTION 6 — STRUCTURAL / COLLECTION UUID SCHEMAS
71. UUID-ARRAY SCHEMA (array of UUID strings)
72. UUID-ARRAY-STRICT SCHEMA (all canonical v4 strings)
73. UUID-ARRAY-UNIQUE SCHEMA (no duplicates allowed)
74. UUID-ARRAY-COERCE SCHEMA (normalizes entries)
75. UUID-ARRAY-NULLABLE SCHEMA (allows null members)
76. UUID-RECORD SCHEMA (map of string → UUID)
77. UUID-RECORD-STRICT SCHEMA (strict validation of values)
78. UUID-RECORD-COERCE SCHEMA (normalizes values)
79. UUID-MAP SCHEMA (Map<string, UUID>)
80. UUID-SET SCHEMA (Set of UUID strings, no duplicates)
81. UUID-TUPLE SCHEMA (ordered tuple of known UUID slots)
82. UUID-PAIR SCHEMA (two-UUID link schema, e.g., source/destination)
83. UUID-RELATION-SCHEMA (foreign key pair validation)
84. UUID-MULTI-TENANT-KEY SCHEMA (prefix tenant id + uuid)
85. UUID-GROUPED-IDENTITY SCHEMA (grouping keys of uuids)
86. UUID-CLUSTER-MEMBERSHIP SCHEMA (set of related uuids)
87. UUID-LINKED-GRAPH SCHEMA (relation node mapping)
88. UUID-TREE-NODE SCHEMA (parent/child references by uuid)
89. UUID-PARTITION-KEY SCHEMA (distributed storage partition uuid)
90. UUID-INDEX-KEY SCHEMA (index entry uuid)

⸻

✅ SECTION 7 — FRAMEWORK / RUNTIME INTEGRATION SCHEMAS
91. UUID-ELYSIA-CONTEXT-ID SCHEMA (request uuid for Elysia/Bun)
92. UUID-CLOUDFLARE-REQUEST-ID SCHEMA (Workers request id)
93. UUID-DENO-REQUEST-ID SCHEMA (runtime request uuid)
94. UUID-NODE-REQUEST-ID SCHEMA (Express/Fastify req.id)
95. UUID-OPENAPI-FORMAT SCHEMA (format: "uuid")
96. UUID-GRAPHQL-ID SCHEMA (@id uuid scalar type)
97. UUID-SVELTE-STORE-ID SCHEMA (state key uuid)
98. UUID-REACT-KEY-PROP SCHEMA (component key uuid)
99. UUID-DATABASE-ROW-ID SCHEMA (Drizzle / ORM record uuid)
100. UUID-KAFKA-MESSAGE-KEY SCHEMA (partition key uuid)

⸻

✅ SECTION 8 — SERIALIZATION / NORMALIZATION / OUTPUT SCHEMAS
101. UUID-TO-LOWERCASE SCHEMA (forces output to lowercase)
102. UUID-TO-UPPERCASE SCHEMA (forces output to uppercase)
103. UUID-TO-HEX-ONLY SCHEMA (outputs hex w/o hyphens)
104. UUID-TO-CANONICAL-FORM SCHEMA (ensures normalized 36-char output)
105. UUID-TO-BUFFER SCHEMA (encodes string → Buffer of 16 bytes)
106. UUID-TO-BYTES SCHEMA (encodes string → Uint8Array of 16 bytes)
107. UUID-TO-BASE64 SCHEMA (Base64-encoded representation)
108. UUID-TO-URLSAFE SCHEMA (Base64URL representation)
109. UUID-TO-URN SCHEMA (urn:uuid:<uuid> serialization)
110. UUID-TO-JSON SCHEMA (JSON-stringified uuid)
111. UUID-CANONICAL-OUTPUT SCHEMA (final normalized representation)
112. UUID-SERIALIZED-OUTPUT SCHEMA (structured export with metadata)
113. UUID-DESERIALIZE SCHEMA (parses any representation → canonical uuid)
114. UUID-ROUNDTRIP-VALIDATION SCHEMA (ensures serialize→parse is stable)
115. UUID-CANONICAL-EQUALITY SCHEMA (normalized comparison validator)
116. UUID-COMPARE-ORDER SCHEMA (lexicographic ordering validator)
117. UUID-SORT-KEY SCHEMA (stable sortable uuid wrapper)
118. UUID-OUTPUT-CHECKSUM SCHEMA (ensures hash integrity of uuid string)
119. UUID-STRINGIFY SCHEMA (final output as string)
120. UUID-NORMALIZED-SCHEMA (canonical output + lowercase guarantee)

⸻

✅ SECTION 9 — FIELD / DOCUMENTATION / COLLECTOR SCHEMAS
121. UUID-FIELD SCHEMA (collector-style field with description + uuid value)
122. UUID-FIELD-STRICT SCHEMA (requires uuid + locks description)
123. UUID-FIELD-OPTIONAL SCHEMA (field may be undefined)
124. UUID-FIELD-NULLABLE SCHEMA (field may be null)
125. UUID-FIELD-COERCE SCHEMA (accepts string/bytes → uuid)
126. UUID-FIELD-AUTO-GENERATE SCHEMA (fills missing field with v4)
127. UUID-FIELD-WITH-TIMESTAMP SCHEMA (includes creation metadata)
128. UUID-FIELD-WITH-SOURCE SCHEMA (includes origin system metadata)
129. UUID-FIELD-IMMUTABLE SCHEMA (cannot change after creation)
130. UUID-FIELD-CANONICAL SCHEMA (final normalized output field)

⸻

✅ SECTION 10 — ANALYTICS / OBSERVABILITY / AUDIT SCHEMAS
131. UUID-TRACE-SPAN-LINK SCHEMA (trace → span linking)
132. UUID-EVENT-CORRELATION SCHEMA (join event to parent uuid)
133. UUID-AUDIT-CHAIN SCHEMA (chain of audit uuids)
134. UUID-ANALYTICS-ENTITY SCHEMA (analytics entity uuid)
135. UUID-SESSION-FLOW SCHEMA (session → request → action)
136. UUID-LOG-CHAIN SCHEMA (linked log entries uuid chain)
137. UUID-REPLAY-TRACE SCHEMA (reconstruction from uuid chain)
138. UUID-METRIC-DIMENSION SCHEMA (dimension identified by uuid)
139. UUID-PERFORMANCE-SAMPLE SCHEMA (sample trace id)
140. UUID-OPEN-TELEMETRY-LINK SCHEMA (trace context schema)

⸻

✅ SECTION 11 — HYBRID / SPECIALIZED UUID DERIVATIVES
141. UUID-SHORTID SCHEMA (base-57/62 shortened uuid)
142. UUID-CUID SCHEMA (collision-resistant unique id compat)
143. UUID-KSUID SCHEMA (K-sortable unique id compat)
144. UUID-ULID SCHEMA (universally lexicographically sortable id)
145. UUID-TIME-BASED-KSUID SCHEMA (hybrid KSUID+UUID variant)
146. UUID-MIXED-FORMAT SCHEMA (accepts UUID, ULID, KSUID → normalized uuid)
147. UUID-LEGACY-UUID1-MIGRATION SCHEMA (auto-convert v1→v7)
148. UUID-HYBRID-COMPAT-SCHEMA (accepts ULID/UUID mixed inputs)
149. UUID-MACHINE-ID SCHEMA (includes MAC prefix info)
150. UUID-CUSTOM-NAMESPACE SCHEMA (project-specific namespace uuid)
*/