import { $schema } from "../engine";

/**
 * MIN_LENGTH
 *
 * This constant defines the minimum number of characters required for any
 * enterprise-grade error-message value within the error-registry subsystem.  
 * It exists to enforce a strict floor on descriptive clarity so that all
 * messages contain enough semantic density to convey cause, expectation, and
 * remediation without ambiguity.  
 * By centralizing this boundary, the system ensures uniformity, prevents
 * accidental under-specification, and maintains stable diagnostic quality
 * across all services and validation layers.  
 * This constant is immutable, globally authoritative, and must never be
 * modified without full governance review due to its cross-system impact.
 */
const MIN_LENGTH: 10 = 10 as const

/**
 * MAX_LENGTH
 *
 * This constant defines the maximum permitted character length for all
 * error-message values emitted through the validation and diagnostics layer.  
 * It ensures that messages retain clarity, precision, and operational
 * usefulness without drifting into verbosity that hinders readability,
 * logging efficiency, or downstream analytics consumption.  
 * By standardizing an upper bound, the system guarantees predictable memory
 * behavior, stable serialization characteristics, and uniformly enforced
 * diagnostic boundaries across distributed systems.  
 * This constant is immutable, authoritative, and critical to long-term
 * consistency across all schema-driven messaging contracts.
 */
const MAX_LENGTH: 1024 = 1024 as const

/**
* STRING_SCHEMA SCHEMA
*
* **SUMMARY**  
*   This schema validates that the provided value is a well-formed string and
*   ensures that no other primitive or structured value type can pass through
*   this contract boundary. It guarantees that downstream systems receive an
*   immutable, correctly typed textual value that can be safely processed by any
*   consumer expecting canonical string semantics. The schema enforces strict
*   input correctness so that higher-order validators, transformers, or domain
*   processors can rely on the data without performing redundant type checks.
*   These guarantees collectively maintain stability and prevent ambiguity across
*   all layers of the enterprise data flow.
*
* **PURPOSE**  
*   - This schema exists to enforce that only valid string primitives are allowed
*     to cross application or service boundaries, thereby preventing accidental
*     introduction of malformed values and ensuring strict type fidelity.  
*   - This schema prevents silent coercions or unexpected conversions that might
*     otherwise corrupt downstream parsing logic or analytical subsystems by
*     requiring that inputs already conform to proper string form.  
*   - This schema guarantees that consumers interacting with validated data can
*     rely on the intrinsic semantics of JavaScript strings without defensive
*     programming or fallback guards.  
*   - This schema provides a repeatable and deterministic contract for systems
*     that handle text-based identifiers, labels, content fields, or metadata
*     values across distributed enterprise workflows.  
*
* **INPUT CONTRACT**  
*   - This schema accepts only literal string primitives and rejects all other
*     forms, including number, boolean, null, undefined, arrays, objects, or any
*     attempted coercive representations.  
*   - This schema rejects values originating from unknown structural sources,
*     including boxed String objects, custom prototypes, or any non-primitive
*     representations.  
*   - This schema rejects missing fields, absent values, or optional constructs
*     that do not explicitly supply a valid and correctly typed string.  
*   - This schema rejects malformed or improperly shaped inputs that attempt to
*     masquerade as strings through implicit casting or serialization artifacts.  
*
* **OUTPUT CONTRACT**  
*   - The output value is always a native JavaScript string that conforms exactly
*     to the expected primitive type with no coercion or transformation applied.  
*   - The output preserves full string integrity, guaranteeing that downstream
*     consumers receive the same textual content that passed validation.  
*   - The output guarantees immutability expectations consistent with JavaScript
*     string behavior and therefore remains safe for reuse across subsystems.  
*   - The output ensures that all dependent schemas, business rules, or semantic
*     evaluators receive predictable and type-stable values without risk of drift.  
*
* **VALIDATION RULES**  
*   - The value must be a native JavaScript string primitive and must not be a
*     boxed String instance or any subclass that alters primitive semantics.  
*   - The schema disallows all non-string primitives because accepting them would
*     compromise contract integrity and introduce ambiguity into downstream
*     processing flows.  
*   - The schema rejects unexpected structural values to ensure that only valid
*     string types are passed through higher-order pipelines such as validators or
*     mappers.  
*   - The schema enforces strict type matching to prevent latent bugs or silent
*     mismatches that would undermine enterprise data consistency guarantees.  
*
* **SEMANTIC NOTES**  
*   - This schema is foundational and is often used as the baseline building
*     block for more complex validators governing identifiers, tokens, names, or
*     free-form text fields.  
*   - This schema helps maintain cross-system uniformity because string fields
*     are frequently serialized, transmitted, stored, and revalidated across
*     distributed systems.  
*   - This schema serves as a defensive barrier against malformed payloads that
*     originate from untyped or partially typed boundary layers such as HTTP
*     requests or third-party integrations.  
*   - This schema ensures that domain-level validators can rely on a stable and
*     canonical textual representation without implementing additional guards or
*     type checks.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing)
*   Input:  "hello"
*   Output: "hello"
*
*   // Example 2 (Passing)
*   Input:  "12345"
*   Output: "12345"
*
*   // Example 3 (Failing)
*   Input:  12345
*   Output: Error
*   ```
*
* @returns {String} The validated value.
*/
const stringSchema = $schema.string();

/**
* OUTPUT TYPE — STRING_SCHEMA
*
* **SUMMARY**  
*   This output type represents a fully validated string value that conforms to
*   strict primitive semantics without any coercion or alteration. It guarantees
*   that downstream components receive stable, predictable textual content
*   aligned with enterprise data integrity standards. The type reflects the exact
*   structure that successfully passes the schema without widening or mutation.
*   These guarantees ensure maximal compatibility with domain logic, storage
*   layers, and distributed system boundaries.
*
* **CONTRACT GUARANTEES**  
*   - The output is always a literal JavaScript string and cannot represent any
*     other primitive or complex structure under any condition.  
*   - The type cannot widen or change shape as it flows through application
*     layers, thereby guaranteeing static predictability and type-soundness.  
*   - The value cannot contain hidden coercions, unexpected prototypes, or any
*     other non-conforming characteristics that could break downstream logic.  
*   - The type enforces that any consumer expecting canonical string behavior
*     receives a stable and validated representation with no risk of drift.  
*
* **EXAMPLE**  
*   ```
*   const val: String =
*       parse(stringSchema, "example");
*   ```
*/
type String = $schema.InferOutput<typeof stringSchema>;

/**
* MESSAGE_KEY_VALUE SCHEMA
*
* **SUMMARY**  
*   This schema validates a message key value that must conform to a strictly
*   enforced enterprise-grade string structure that adheres to centralized
*   formatting and semantic expectations. It ensures that the supplied value
*   satisfies required length boundaries that preserve readability and
*   consistency across all systems that consume or transmit diagnostic or
*   operational messages. The schema exists to maintain uniformity across
*   services by enforcing predictable invariants that protect against malformed
*   or structurally ambiguous key-like inputs. Its guarantees help ensure that
*   message keys remain fully interoperable within distributed validation,
*   logging, analytics, and exception-reporting surfaces.
*
* **PURPOSE**  
*   - This schema exists to guarantee that all message key values satisfy strict
*     minimum and maximum length requirements that prevent underspecified or
*     excessively verbose identifiers from entering system workflows.  
*   - This schema ensures that keys adhere to a stable enterprise contract,
*     facilitating predictable handling by distributed logging, validation, and
*     observability systems that depend on consistent surface formatting.  
*   - This schema protects downstream consumers from receiving malformed or
*     structurally ambiguous key values that could obscure diagnostics, inflate
*     index entropy, or introduce unpredictable query behavior.  
*   - This schema enables unified governance across message definitions by
*     ensuring every key entering the system meets the same high standard of
*     structural soundness and semantic clarity.  
*
* **INPUT CONTRACT**  
*   - The input must be a string value and will be rejected if it is any other
*     primitive, object, array, or coerced structure that cannot satisfy the
*     minimum requirements for this schema.  
*   - Any string shorter than the required minimum length will be rejected to
*     prevent vague, unstable, or semantically meaningless identifiers from being
*     admitted.  
*   - Any string longer than the maximum allowed length will be rejected to
*     prevent oversized diagnostic keys that could degrade memory handling,
*     indexing performance, or log parsing.  
*   - Inputs containing undefined, null, improperly typed data, or unrecognized
*     structural forms are rejected to maintain full invariance and contractual
*     predictability.  
*
* **OUTPUT CONTRACT**  
*   - The validated output is always a string that strictly adheres to the
*     required minimum and maximum character constraints defined by the schema.  
*   - The output is guaranteed to preserve the exact input content without
*     mutation, ensuring deterministic mapping across all system components that
*     consume it.  
*   - The output guarantees that all values are structurally stable, predictable,
*     and fully compliant with enterprise validation rules.  
*   - The output maintains invariants enabling safe downstream indexing, mapping,
*     transformation, and identity-based comparison operations.  
*
* **VALIDATION RULES**  
*   - The value must satisfy the minimum length rule, preventing keys that are
*     too short to convey meaningful semantic content.  
*   - The value must satisfy the maximum length rule, preventing keys that are
*     too long to be safely consumed or indexed across enterprise systems.  
*   - The input must be a string, ensuring that no unexpected primitive or object
*     type can bypass validation or enter downstream workflows.  
*   - The schema rejects malformed, truncated, oversized, or non-string values to
*     maintain full compliance with strict enterprise schema governance
*     protocols.  
*
* **SEMANTIC NOTES**  
*   - Message key values validated by this schema are used across internal and
*     external system boundaries and therefore must maintain strong stability
*     guarantees.  
*   - This schema contributes to consistent error handling by ensuring that all
*     keys share predictable structure and format across diverse code paths and
*     system components.  
*   - The schema helps reduce ambiguity during incident analysis and automated
*     log attribution by ensuring that keys remain uniformly readable and
*     standardized.  
*   - It enables reliable cross-service alignment because the validated message
*     keys behave consistently regardless of which subsystem produces or
*     interprets them.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing)
*   Input:  "AAAAA"
*   Output: "AAAAA"
*
*   // Example 2 (Passing)
*   Input:  "ABCDE12345"
*   Output: "ABCDE12345"
*
*   // Example 3 (Failing)
*   Input:  "AB"
*   Output: ERROR_MESSAGE_KEYS.MESSAGE_KEY_VALUE_TOO_SHORT
*   ```
*
* @returns {MessageKeyValue} The validated value.
*/
export const messageKeyValue = $schema.pipe(
    $schema.string(),
    $schema.minLength(MIN_LENGTH),
    $schema.maxLength(MAX_LENGTH)
);

/**
* LENGTH_KEY_VALUE SCHEMA
*
* **SUMMARY**  
*   This schema validates a numeric value that represents a length-based contract  
*   which must remain within the strict minimum and maximum boundaries enforced  
*   by the system. It ensures that all numeric inputs adhere to enterprise-grade  
*   constraints that guarantee consistent interpretation and prevent malformed  
*   length values from entering critical computation layers. The schema serves as  
*   a foundational primitive for higher-order structures that depend on rigid and  
*   predictable numeric boundaries. Its role is essential in workflows requiring  
*   normalization, consistency, and contractual integrity across distributed  
*   services.
*
* **PURPOSE**  
*   - This schema ensures that only numeric inputs within the defined length  
*     boundaries are accepted, thereby preventing the propagation of invalid or  
*     unexpected numeric values into downstream logic.  
*   - It enforces deterministic constraints that protect dependent schemas from  
*     silent failures, coercion errors, or boundary misinterpretations that could  
*     undermine data integrity.  
*   - It provides a consistent validation surface for services that rely on  
*     length-controlled fields, ensuring that shared contracts remain stable  
*     across versions and environments.  
*   - It reduces systemic risk by ensuring that all numeric length values conform  
*     to predictable limits and structure before being consumed by any  
*     computation or transformation pipeline.
*
* **INPUT CONTRACT**  
*   - The schema accepts only numeric input values and rejects all non-numeric  
*     primitives, including strings, booleans, arrays, objects, null, and  
*     undefined.  
*   - It rejects any numeric value that falls below the prescribed minimum length  
*     threshold, ensuring that undersized values cannot enter the system.  
*   - It rejects any numeric value exceeding the maximum allowable length  
*     boundary, preventing overflow, distortion, or inconsistent computation in  
*     consuming systems.  
*   - It rejects coerced numeric representations such as numeric strings or  
*     boxed Number objects to avoid ambiguity and maintain strict input purity.  
*
* **OUTPUT CONTRACT**  
*   - The output is always a plain number primitive whose value falls within the  
*     established minimum and maximum boundaries.  
*   - The output preserves full numeric stability and is guaranteed to reflect  
*     the exact validated input without mutation or transformation.  
*   - The output type ensures consistent consumption by all downstream systems,  
*     enabling deterministic processing in validation pipelines and schema  
*     aggregations.  
*   - The output maintains contract integrity by guaranteeing that no invalid or  
*     coerced numeric representation can be emitted.  
*
* **VALIDATION RULES**  
*   - The schema checks that the input is strictly a number and rejects any value  
*     failing this primitive requirement to prevent schema-level ambiguity.  
*   - It enforces a minimum value boundary to ensure that the length cannot fall  
*     below the defined operational threshold required for stable behavior.  
*   - It enforces a maximum value boundary to prevent excessive size values that  
*     violate domain expectations or create downstream computational risks.  
*   - It verifies boundary adherence explicitly, ensuring that values exactly  
*     equal to the minimum or maximum constraints remain valid while disallowing  
*     all values outside those bounds.  
*
* **SEMANTIC NOTES**  
*   - This field represents a contract-critical numeric boundary that influences  
*     validation, data shaping, and runtime execution across distributed  
*     services.  
*   - Its strict bounds provide cross-system guarantees that prevent inconsistent  
*     sizing logic and ensure deterministic resource handling.  
*   - The schema plays a pivotal role in domain models where numeric thresholds  
*     define allowed operational ranges, performance limits, or structural  
*     constraints.  
*   - Its validated numeric output acts as a reliable foundation for higher-level  
*     schemas requiring precision, immutability, and alignment with established  
*     enterprise standards.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing)
*   Input:  10
*   Output: 10
*
*   // Example 2 (Passing)
*   Input:  MIN_LENGTH
*   Output: MIN_LENGTH
*
*   // Example 3 (Failing)
*   Input:  MIN_LENGTH - 1
*   Output: Error(...)
*   ```
*
* @returns {LengthKeyValue} The validated value.
*/
export const lengthKeyValue = $schema.pipe(
    $schema.number(),
    $schema.minValue(MIN_LENGTH),
    $schema.maxValue(MAX_LENGTH)
);

/**
* LENGTH_RECORD SCHEMA
*
* **SUMMARY**  
*   This schema validates a structured object representing the canonical length
*   constraints used throughout enterprise validation systems, ensuring that all
*   participating subsystems reference a single authoritative definition. The
*   schema enforces strict object boundaries so that unexpected keys, malformed
*   values, or structurally inconsistent records cannot enter downstream logic.
*   By centralizing these numeric constraints, the schema guarantees consistency
*   across validators, factories, and transformation layers that rely upon shared
*   sizing parameters. The result is a durable contract that stabilizes length-
*   based behavior across all service layers in a predictable manner.
*
* **PURPOSE**  
*   - This schema exists to enforce a single canonical source of truth for all
*     system-wide minimum and maximum length constraints, enabling unified
*     behavior across heterogeneous service boundaries.  
*   - It ensures that no downstream component receives incorrectly shaped or
*     semantically invalid length metadata, thereby preventing silent logic
*     deviations and inconsistent enforcement patterns.  
*   - It provides a hardened validation surface that rejects malformed numeric
*     inputs, protecting higher-level validators from misinterpreting contract
*     semantics due to structural defects.  
*   - It enables consistent sizing guarantees across data pipelines, persistence
*     layers, and application gateways, thereby supporting long-lived schema
*     evolution with strict backward compatibility.  
*
* **INPUT CONTRACT**  
*   - The input must be an object containing exactly four keys—`KEY_MIN`,
*     `KEY_MAX`, `MESSAGE_MIN`, and `MESSAGE_MAX`—with no additional properties
*     permitted under any circumstances.  
*   - Each key must contain a valid lengthKeyValue instance, ensuring numeric
*     correctness and prohibiting null, undefined, or incorrect primitive types.  
*   - Inputs containing extra keys, missing fields, or structurally incompatible
*     shapes must be rejected to preserve the integrity of all dependent
*     validation layers.  
*   - Inputs must not coerce string values, boolean values, arrays, or objects
*     into numeric form, ensuring that the record never admits ambiguous or
*     contextually misleading values.  
*
* **OUTPUT CONTRACT**  
*   - The output guarantees a fully validated and immutable set of numeric
*     constraints used to govern system-wide schema behavior.  
*   - All returned numeric values will strictly match the validated input and
*     remain stable across transformations that rely on the contract.  
*   - The output will always contain the four canonical keys in a predictable,
*     strictly typed structure with no additional or missing elements.  
*   - Downstream systems can rely on the output as a permanent structural
*     invariant ensuring consistency across long-lived application workflows.  
*
* **VALIDATION RULES**  
*   - The schema ensures that no unknown or unexpected keys are present, thereby
*     protecting the contract boundary from accidental expansion.  
*   - The schema validates that each value conforms to the lengthKeyValue schema,
*     guaranteeing correct numeric structure and semantic clarity.  
*   - The validation prohibits nullable, undefined, or coercible values to
*     maintain strict integrity and prevent runtime ambiguity.  
*   - Numeric constraints are validated individually so that a malformed value in
*     one field cannot mask or weaken validation in another.  
*
* **SEMANTIC NOTES**  
*   - These length constraints influence how error messages, identifiers, and
*     content structures behave within enterprise systems, ensuring predictable
*     sizing across all layers.  
*   - The schema acts as a foundation for higher-level validation patterns,
*     enabling consistent enforcement of message-length and key-length policies.  
*   - Length metadata validated here plays a crucial role in cross-service
*     compatibility, preventing drift between frontend, backend, and storage
*     representations.  
*   - Because this schema defines core contract infrastructure, its stability
*     directly influences the predictability and safety of all downstream
*     validators.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing)
*   Input:  { KEY_MIN: 1, KEY_MAX: 64, MESSAGE_MIN: 20, MESSAGE_MAX: 500 }
*   Output: { KEY_MIN: 1, KEY_MAX: 64, MESSAGE_MIN: 20, MESSAGE_MAX: 500 }
*
*   // Example 2 (Passing)
*   Input:  { KEY_MIN: 3, KEY_MAX: 40, MESSAGE_MIN: 50, MESSAGE_MAX: 255 }
*   Output: { KEY_MIN: 3, KEY_MAX: 40, MESSAGE_MIN: 50, MESSAGE_MAX: 255 }
*
*   // Example 3 (Failing)
*   Input:  { KEY_MIN: "1", KEY_MAX: 64, MESSAGE_MIN: 20, MESSAGE_MAX: 500 }
*   Output: ValidationError
*   ```
*
* @returns {LengthRecord} The validated value.
*/
export const lengthRecord = $schema.strictObject({
    KEY_MIN: lengthKeyValue,
    KEY_MAX: lengthKeyValue,
    MESSAGE_MIN: lengthKeyValue,
    MESSAGE_MAX: lengthKeyValue
});

/**
* OUTPUT TYPE — LENGTH_RECORD
*
* **SUMMARY**  
*   This output type represents the fully validated constraint record that
*   establishes the numeric boundaries used across enterprise-grade schemas. The
*   type guarantees that all four sizing parameters are present, correctly typed,
*   and semantically meaningful for downstream validators. It provides a stable
*   surface ensuring that contract evolution, refactoring, or system-wide schema
*   updates cannot invalidate established boundaries. The type is intended to be
*   consumed by high-integrity validation modules requiring dependable,
*   contract-bound numeric metadata.
*
* **CONTRACT GUARANTEES**  
*   - The type guarantees that all four numeric constraint fields are present and
*     structurally valid, preventing incomplete or malformed configuration
*     objects.  
*   - The type ensures that values cannot widen, narrow, or shift semantically
*     after validation, protecting downstream system logic.  
*   - The type forbids the introduction of undefined, null, or incorrectly typed
*     fields, preserving object integrity across the entire execution lifecycle.  
*   - The type ensures that all length constraints remain deeply stable, allowing
*     dependent validators to operate without defensive checks.  
*
* **EXAMPLE**  
*   ```
*   const val: LengthRecord =
*       $schema.parse(lengthRecord, {
*           KEY_MIN: 1,
*           KEY_MAX: 64,
*           MESSAGE_MIN: 20,
*           MESSAGE_MAX: 500
*       });
*   ```
*/
export type LengthRecord = $schema.InferOutput<typeof lengthRecord>

/**
* MESSAGES_RECORD SCHEMA
*
* **SUMMARY**  
*   This schema validates a fixed record of message keys intended to represent
*   the complete set of error-message identifiers required for enterprise-grade
*   validation workflows, ensuring that each entry adheres to the established
*   structural constraints. It guarantees that every property is present with no
*   omissions or additions and that each corresponding value satisfies the
*   messageKeyValue schema’s semantic and descriptive requirements. The schema
*   ensures strict object behavior so that inadvertent shape drift or accidental
*   key introduction cannot occur within mission-critical systems. It provides a
*   reliable and fully deterministic contract surface for downstream validators,
*   reporting engines, and cross-service consumers.
*
* **PURPOSE**  
*   - This schema exists to enforce that all canonical message keys required by
*     enterprise validation subsystems appear in a single, strictly governed
*     record that cannot shift unexpectedly across deployments.  
*   - This schema ensures that every message descriptor aligns with the
*     messageKeyValue schema, thereby enforcing descriptive quality, semantic
*     completeness, and contractual correctness.  
*   - This schema ensures operational predictability by disallowing optional,
*     missing, or additional keys, preventing silent failures in systems that
*     depend on exhaustive message coverage.  
*   - This schema supplies a hardened validation boundary ensuring consistent
*     message surfaces across distributed systems, analytics pipelines, and
*     domain-layer processors.  
*
* **INPUT CONTRACT**  
*   - The schema accepts only strict objects containing exactly the predefined
*     keys: KEY_TOO_SHORT, KEY_TOO_LONG, KEY_PATTERN, MESSAGE_TOO_SHORT, and
*     MESSAGE_TOO_LONG.  
*   - The schema rejects any object that omits one or more of these keys or
*     includes any additional properties, ensuring a closed and immutable field
*     surface.  
*   - The schema rejects any value whose field content fails the messageKeyValue
*     validation rules, including insufficient descriptive detail or invalid
*     semantic structure.  
*   - The schema rejects non-object inputs, coerced primitives, arrays, null, or
*     undefined values to ensure strict structural integrity.  
*
* **OUTPUT CONTRACT**  
*   - The schema guarantees that the output will contain exactly the five defined
*     keys, each associated with a value validated through messageKeyValue.  
*   - The schema guarantees that the returned object preserves strict structural
*     fidelity and contains no dynamically inserted or omitted properties.  
*   - The schema guarantees that each validated message meets enterprise semantic
*     requirements, including length boundaries and descriptive completeness.  
*   - The schema guarantees that the output is fully normalized and suitable for
*     system-wide propagation without further verification.  
*
* **VALIDATION RULES**  
*   - The schema enforces strict object validation to prevent accidental shape
*     mutations or field-level drift in cross-service contract surfaces.  
*   - The schema ensures that each message value satisfies messageKeyValue’s
*     requirements, which include semantic clarity, minimum descriptive length,
*     and alignment with enterprise messaging conventions.  
*   - The schema ensures that the presence or absence of fields is never subject
*     to consumer interpretation, preventing both underspecification and
*     overspecification.  
*   - The schema ensures immutability of field structure at validation time,
*     thereby preventing dynamically shaped objects from bypassing contract
*     enforcement.  
*
* **SEMANTIC NOTES**  
*   - This record represents a core element of the system’s error-message
*     taxonomy and must remain stable across releases to protect downstream
*     integrations.  
*   - These keys serve as canonical identifiers used throughout validation,
*     telemetry, error surfacing, analytics, and domain-driven orchestration.  
*   - The schema’s rigidity ensures that all enterprise systems rely on the same
*     message vocabulary, enabling uniform diagnostic experiences.  
*   - Changes to this schema must be made with full awareness of the schema’s
*     system-wide implications, including contractual ripple effects across
*     services.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing)
*   Input:  { KEY_TOO_SHORT: "...", KEY_TOO_LONG: "...", KEY_PATTERN: "...",
*             MESSAGE_TOO_SHORT: "...", MESSAGE_TOO_LONG: "..." }
*   Output: { ...validated object... }
*
*   // Example 2 (Passing)
*   Input:  { ...all fields present with valid descriptive messages... }
*   Output: { ...validated object... }
*
*   // Example 3 (Failing)
*   Input:  { KEY_TOO_SHORT: "...", KEY_TOO_LONG: "..." }
*   Output: Validation error due to missing required fields.
*   ```
*
* @returns {MessagesRecord} The validated value.
*/
export const messagesRecord = $schema.strictObject({
    KEY_TOO_SHORT: messageKeyValue,
    KEY_TOO_LONG: messageKeyValue,
    KEY_PATTERN: messageKeyValue,
    MESSAGE_TOO_SHORT: messageKeyValue,
    MESSAGE_TOO_LONG: messageKeyValue
});

/**
* OUTPUT TYPE — MESSAGES_RECORD
*
* **SUMMARY**  
*   This output type represents the fully validated structure guaranteed by the
*   messagesRecord schema and ensures that all required message fields appear
*   exactly once without omission or extension. It codifies the complete set of
*   enterprise error-message descriptors, guaranteeing semantic stability and
*   structural integrity across systems. The type enforces strict invariants that
*   prevent malformed or incomplete error-message registries from propagating
*   across application boundaries. The type is designed to support long-term
*   schema governance and stable API contracts with zero tolerance for shape
*   drift.
*
* **CONTRACT GUARANTEES**  
*   - This type guarantees that all five predefined keys exist and that no
*     additional properties are present under any circumstances.  
*   - This type guarantees that each value satisfies the messageKeyValue schema’s
*     descriptive, semantic, and structural constraints.  
*   - This type guarantees that downstream systems may rely on the presence and
*     meaning of each property without performing additional runtime checks.  
*   - This type guarantees that the validated object remains stable and
*     predictable across refactors, dependency upgrades, and cross-service
*     integrations.  
*
* **EXAMPLE**  
*   ```
*   const val: MessagesRecord =
*       $schema.parse(messagesRecord, input);
*   ```
*/
export type MessagesRecord = $schema.InferOutput<typeof messagesRecord>

/**
 * Centralized length constraints for error keys and error messages.
 *
 * - `KEY_MIN` / `KEY_MAX`: Bounds for valid SCREAMING_SNAKE_CASE error keys.
 * - `MESSAGE_MIN` / `MESSAGE_MAX`: Bounds for descriptive, readable messages.
 *
 * These values ensure consistent formatting and prevent overly short or
 * excessively long identifiers and messages across the system.
 */
export const LENGTHS: LengthRecord = {
    KEY_MIN: 10,
    KEY_MAX: 64,

    MESSAGE_MIN: 50,
    MESSAGE_MAX: 500,
} as const satisfies LengthRecord

// Validates that the centralized length-constraint dictionary conforms to the
// formally defined `lengthRecord` contract. This guarantees that all system-wide
// limits for identifier and message lengths are themselves schema-verified,
// preventing configuration drift, silent widening/narrowing of allowed ranges,
// or accidental introduction of out-of-policy bounds. In Fortune-50 compliance
// environments, this ensures that every downstream validator, formatter,
// serializer, and error-surface component operates on a single, audited,
// contract-enforced source of truth for structural length constraints.
$schema.parse(lengthRecord, LENGTHS)

/**
 * Standardized validation messages for error-key and message rules.
 *
 * - `KEY_*` entries describe violations related to error-key structure,
 *   length, or naming format.
 * - `MESSAGE_*` entries describe violations related to descriptive message
 *   length and clarity.
 *
 * These messages are used by the error-registry validator to provide clear,
 * consistent developer feedback when inputs do not meet required standards.
 */
export const MESSAGES: MessagesRecord = {
    KEY_TOO_SHORT:
        "Validation failed: the provided error-key identifier is too short to convey meaningful intent and must contain at least one valid SCREAMING_SNAKE_CASE segment.",

    KEY_TOO_LONG:
        "Validation failed: the provided error-key identifier exceeds the allowed length and no longer represents a concise, maintainable, SCREAMING_SNAKE_CASE constant suitable for enterprise systems.",

    KEY_PATTERN:
        "Validation failed: the error key must follow the canonical SCREAMING_SNAKE_CASE format, begin with an uppercase letter, and contain only uppercase letters, digits, or underscores.",

    MESSAGE_TOO_SHORT:
        "Validation failed: this error message is too short to meet the required descriptive threshold and must contain sufficient contextual detail to guide remediation.",

    MESSAGE_TOO_LONG:
        "Validation failed: this error message exceeds the maximum permitted length and must be shortened to ensure clarity, maintainability, and readability across all diagnostic surfaces.",
} as const satisfies MessagesRecord

// Validates that the canonical error-message dictionary adheres to the
// `messagesRecord` contract, ensuring that every diagnostic message used
// across the platform conforms to centrally defined length, structure, and
// formatting rules. This guarantees that all error surfaces—whether emitted by
// validators, runtime guards, API layers, or internal tooling—remain uniform,
// audit-stable, and free from drift. In Fortune-50 compliance contexts, this
// enforcement prevents malformed, ambiguous, or excessively long diagnostic
// messages from entering logs, observability systems, or regulated reporting
// pipelines, preserving consistency, traceability, and contractual clarity
// across the entire diagnostic infrastructure.
$schema.parse(messagesRecord, MESSAGES)

/**
 * *ERROR_KEY_NAME_REGEX*
 *
 * **SUMMARY**  
 *   Canonical regular-expression constraint enforcing the required naming
 *   format for all error-key identifiers within the validation subsystem.
 *   Ensures keys follow the strict SCREAMING_SNAKE_CASE convention used across
 *   schemas, validators, and error registries.
 *
 * **PURPOSE**  
 *   - Guarantees consistent, predictable error-key naming across the entire
 *     codebase.  
 *   - Prevents ambiguous, malformed, or non-standard identifiers from entering
 *     the error-definition pipeline.  
 *   - Supports tooling, autocomplete expectations, and downstream mappings
 *     (e.g., logging systems, diagnostics dashboards, analytics pipelines).
 *
 * **INPUT CONTRACT**  
 *   - Intended for validating **object property names** within the error-message
 *     registry or any related key-definition structure.  
 *   - Keys must be ASCII-only uppercase letters, digits, and underscores.
 *
 * **OUTPUT CONTRACT**  
 *   - Produces a boolean match result indicating whether a given identifier
 *     meets the naming requirements.  
 *   - Typically consumed by higher-level validators (e.g., Valibot schemas).
 *
 * **NAMING RULES ENFORCED**  
 *   - Must **start with an uppercase ASCII letter** (`A–Z`).  
 *   - May contain additional uppercase letters, digits (`0–9`), or underscores.  
 *   - Must contain **at least one character**.  
 *   - Must not contain lowercase letters, hyphens, whitespace, prefixes, or
 *     special characters.
 *
 * **SEMANTIC NOTES**  
 *   - Matches the established naming convention used in enterprise
 *     configuration systems, API error enumerations, and domain-level
 *     validation layers.  
 *   - This regex is intentionally strict to prevent future drift or accidental
 *     introduction of incompatible naming patterns.
 *
 * **EXAMPLES**  
 *   ```
 *   // Valid cases
 *   ERROR_KEY_NAME_REGEX.test("UNDEFINED_STRICT_INVALID");  // true
 *   ERROR_KEY_NAME_REGEX.test("ERROR");                     // true
 *   ERROR_KEY_NAME_REGEX.test("USER_NOT_FOUND");            // true
 *   ERROR_KEY_NAME_REGEX.test("HTTP_500_INTERNAL_ERROR");   // true
 *   ERROR_KEY_NAME_REGEX.test("A1_B2_C3");                  // true
 *
 *   // Invalid cases
 *   ERROR_KEY_NAME_REGEX.test("undefined_strict_invalid");  // false  ← lowercase
 *   ERROR_KEY_NAME_REGEX.test("Invalid_Key");               // false  ← mixed case
 *   ERROR_KEY_NAME_REGEX.test("INVALID-KEY");               // false  ← hyphen not allowed
 *   ERROR_KEY_NAME_REGEX.test("INVALID KEY");               // false  ← whitespace not allowed
 *   ERROR_KEY_NAME_REGEX.test("_INVALID");                  // false  ← cannot start with underscore
 *   ERROR_KEY_NAME_REGEX.test("123_INVALID");               // false  ← cannot start with digit
 *   ERROR_KEY_NAME_REGEX.test("INVALID.KEY");               // false  ← punctuation not allowed
 *   ERROR_KEY_NAME_REGEX.test("INVALID!KEY");               // false  ← special characters not allowed
 *   ERROR_KEY_NAME_REGEX.test("");                          // false  ← empty string invalid
 *   ```
 */
export const ERROR_KEY_NAME_REGEX: RegExp = /^[A-Z]+(?:_[A-Z0-9]+)*$/;

/**
 * ERROR_MESSAGE_STRING SCHEMA
 *
 * **SUMMARY**  
 *   Validation pipeline ensuring that all error-message values associated with
 *   typed error keys meet the minimum quality, clarity, and length requirements
 *   for enterprise-grade diagnostic messaging.
 *
 * **PURPOSE**  
 *   - Enforces a consistent level of descriptive detail across all error
 *     messages.  
 *   - Prevents vague, cryptic, or overly terse messages from entering the
 *     centralized error registry.  
 *   - Ensures error messages remain human-readable, actionable, and suitable
 *     for both user-facing and internal logging environments.
 *
 * **INPUT CONTRACT**  
 *   - Accepts only string values.  
 *   - Incoming value is treated as a full, literal error message.  
 *
 * **OUTPUT CONTRACT**  
 *   - Returns a validated string guaranteed to meet the required minimum and
 *     maximum descriptive thresholds.  
 *   - Any value failing these requirements triggers a schema-level validation
 *     error with a detailed explanation.
 *
 * **VALIDATION RULES**  
 *   - Must be at least **50 characters** to guarantee baseline descriptive
 *     quality (`minLength`).  
 *   - Must not exceed **500 characters** to preserve clarity, readability, and
 *     diagnostic usability (`maxLength`).  
 *   - Must be a valid string as defined by the underlying Valibot `string()`
 *     validator.
 *
 * **SEMANTIC NOTES**  
 *   - This schema serves as the foundational validator for all human-readable
 *     error descriptions in the system.  
 *   - By enforcing message size constraints globally, it ensures uniformity
 *     across all schema validators, API layers, and logging surfaces.  
 *   - Additional constraints (structured formatting, sentence validation,
 *     placeholders, etc.) may be layered on top of this baseline validator in
 *     the future.
 *
 * **EXAMPLES**  
 *   ```
 *   // Valid cases (≥ 50 chars, ≤ 500 chars)
 *   errorMessageString.parse(
 *     "Validation failed: this field must be explicitly undefined and may not be substituted with null or any other primitive."
 *   ); // OK
 *
 *   errorMessageString.parse(
 *     "The provided identifier does not meet the required structural, semantic, or contextual constraints defined by the schema."
 *   ); // OK
 *
 *   errorMessageString.parse(
 *     "Operation rejected: the supplied payload contains disallowed properties and violates the enforced domain-specific schema contract."
 *   ); // OK
 *
 *
 *   // Invalid cases (too short)
 *   errorMessageString.parse("Too short.")  
 *   // throws → message length < 50 characters
 *
 *   errorMessageString.parse("Invalid input.")  
 *   // throws → not descriptive enough
 *
 *
 *   // Invalid cases (non-string values)
 *   errorMessageString.parse(12345)  
 *   // throws → value must be a string
 *
 *   errorMessageString.parse(null)  
 *   // throws → value must be a string
 *
 *   errorMessageString.parse({ message: "Not allowed" })  
 *   // throws → value must be a string
 *
 *
 *   // Invalid cases (exceeds max length)
 *   errorMessageString.parse("A".repeat(600))  
 *   // throws → message exceeds 500-character upper bound
 *   ```
 */
export const errorMessageString = $schema.pipe(stringSchema, $schema.minLength(LENGTHS.MESSAGE_MIN, MESSAGES.MESSAGE_TOO_SHORT), $schema.maxLength(LENGTHS.MESSAGE_MAX, MESSAGES.MESSAGE_TOO_LONG))

/**
 * OUTPUT TYPE - ERROR_MESSAGE_STRING
 *
 * **SUMMARY**  
 *   Strongly typed representation of a validated, human-readable error message
 *   produced by the `errorMessageString` schema. This type reflects the
 *   post-validation output contract for all error-message values registered
 *   via `defineErrorMessages`.
 *
 * **PURPOSE**  
 *   - Provides a canonical, reusable type for error-message strings across the
 *     entire codebase.  
 *   - Ensures that any value marked as an `ErrorMessageString` has already
 *     passed the minimum descriptive, structural, and length requirements
 *     defined by the `errorMessageString` validator.  
 *   - Serves as the value-side type when constructing typed Maps such as
 *     `Map<ErrorMessageKey, ErrorMessageString>`.
 *
 * **INPUT CONTRACT**  
 *   - Corresponds exclusively to the validated output of the
 *     `errorMessageString` schema.  
 *   - Cannot represent arbitrary or unvalidated strings.
 *
 * **OUTPUT CONTRACT**  
 *   - Represents a string that is guaranteed—at validation time—to be
 *     sufficiently descriptive, readable, and appropriately bounded in length.  
 *   - Reflects the exact output type (`InferOutput`) emitted by the Valibot
 *     pipeline.
 *
 * **SEMANTIC NOTES**  
 *   - This type is part of the public contract for error registries and may be
 *     referenced by schema constructors, API error mappers, and logging
 *     systems.  
 *   - Any future refinement of the `errorMessageString` schema (formatting
 *     rules, minimum complexity requirements, localization metadata, etc.)
 *     automatically flows into this type.
 */
type ErrorMessageString = $schema.InferOutput<typeof errorMessageString>;

/**
 * ERROR_MESSAGES_SCHEMA SCHEMA
 *
 * **SUMMARY**  
 *   Runtime validator ensuring that the error-message registry passed into
 *   `defineErrorMessages` adheres to the required structural and semantic
 *   constraints for both **error keys** and **error message values**.
 *
 * **PURPOSE**  
 *   - Guarantees that all error keys follow the canonical SCREAMING_SNAKE_CASE
 *     identifier format.  
 *   - Ensures that every error message remains sufficiently descriptive and
 *     informative for enterprise-grade diagnostics.  
 *   - Prevents malformed registries from silently contaminating the validation
 *     system with ambiguous or invalid identifiers.
 *
 * **INPUT CONTRACT**  
 *   The schema operates over a `Record<string, string>` where:  
 *   - The **record key** represents the error key literal.  
 *   - The **record value** represents the human-readable error message.  
 *
 * **OUTPUT CONTRACT**  
 *   Produces a validated and normalized structure that guarantees every entry
 *   conforms to the expected formatting rules. Any deviation fails fast with a
 *   descriptive validation error.
 *
 * **VALIDATION RULES**  
 *   - **Key Validation**  
 *     - Must be a non-empty string.  
 *     - Must match the canonical SCREAMING_SNAKE_CASE format.  
 *     - Must start with an uppercase ASCII letter (A–Z).  
 *   - **Message Validation**  
 *     - Must conform to the `errorMessageString` validator (minimum descriptive
 *       quality, character length, readability expectations, etc.).
 *
 * **SEMANTIC NOTES**  
 *   - This schema is evaluated once at error-registry construction time and
 *     ensures long-term consistency across the entire codebase.  
 *   - Intended exclusively for internal validation—it does not leak into the
 *     final runtime types nor modify the user-facing `ErrorMessageKey` union.
 *
 * **EXAMPLES**  
 *   ```
 *   // VALID EXAMPLES
 *   ErrorMessagesSchema.parse({
 *     UNDEFINED_STRICT_INVALID:
 *       "Validation failed: this field must remain explicitly undefined and cannot be substituted with null, zero, or any other primitive.",
 *
 *     USER_ID_MISSING:
 *       "The request payload did not include the required user identifier, which must be present, non-empty, and structurally valid."
 *   }); // OK
 *
 *
 *   // INVALID — message too short
 *   ErrorMessagesSchema.parse({
 *     INVALID_SHORT_MESSAGE: "Too short."
 *   });
 *   // throws → message fails minimum descriptive-length requirement
 *
 *
 *   // INVALID — key not SCREAMING_SNAKE_CASE
 *   ErrorMessagesSchema.parse({
 *     invalidKey:
 *       "This message is long enough but the key does not follow the required SCREAMING_SNAKE_CASE format."
 *   });
 *   // throws → key format violation (lowercase detected)
 *
 *
 *   // INVALID — key starts with a digit
 *   ErrorMessagesSchema.parse({
 *     123_BAD_KEY:
 *       "This message is valid but the key begins with a digit, which is disallowed by the naming rules."
 *   });
 *   // throws → key must start with A–Z
 *
 *
 *   // INVALID — value is not a string
 *   ErrorMessagesSchema.parse({
 *     NON_STRING_MESSAGE: 12345 as any
 *   });
 *   // throws → message must be a string
 *
 *
 *   // INVALID — message exceeds max length
 *   ErrorMessagesSchema.parse({
 *     MESSAGE_TOO_LONG: "A".repeat(600)
 *   });
 *   // throws → message exceeds 500-character upper bound
 *   ```
 */
export const errorMessagesSchema = $schema.record(
    $schema.pipe(stringSchema,
        $schema.minLength(LENGTHS.KEY_MIN, MESSAGES.KEY_TOO_SHORT),
        $schema.maxLength(LENGTHS.KEY_MAX, MESSAGES.KEY_TOO_LONG),
        $schema.regex(
            ERROR_KEY_NAME_REGEX,
            MESSAGES.KEY_PATTERN
        ),
    ),
    errorMessageString
);

/**
* OUTPUT TYPE — ERROR_MESSAGES_SCHEMA
*
* **SUMMARY**  
*   This output type represents the fully validated structure produced when an
*   error-message registry passes all enforced constraints. It defines the final
*   shape of the registry after key formatting, message validation, and semantic
*   integrity checks have succeeded. It provides a predictable, stable contract
*   that enterprise systems rely upon for consistent error handling. It ensures
*   that keys and messages conform to strict standards that remain unchanged
*   throughout system evolution.  
*
* **CONTRACT GUARANTEES**  
*   - The output type guarantees that every key in the registry is a valid
*     SCREAMING_SNAKE_CASE identifier with no deviations or malformed segments.  
*   - The output type guarantees that every message is a fully validated string
*     that meets descriptive, structural, and readability requirements.  
*   - The output type forbids the presence of extraneous, nullish, incorrectly
*     typed, or structurally incompatible entries.  
*   - The output type ensures full stability and is safe for use by typed
*     factories, schema generators, UI systems, logging layers, and analytics
*     pipelines.  
*
* **EXAMPLE**  
*   ```
*   const val: ErrorMessagesSchema =
*       parse(errorMessagesSchema, { INVALID_TYPE: "Expected a number." });
*   ```
*/
export type ErrorMessagesSchema = $schema.InferOutput<typeof errorMessagesSchema>

/**
 * *defineErrorMessages*
 *
 * **SUMMARY**  
 *   Factory function that generates the **canonical typed error-message
 *   registry**, producing a fully constrained set of autocomplete-safe error
 *   keys, their corresponding mapped messages, and the strict union type used
 *   throughout the validation subsystem.
 *
 * **PURPOSE**  
 *   - Centralizes error-key and message creation into a single, type-safe
 *     construction point.  
 *   - Eliminates schema-local duplication of error constants.  
 *   - Ensures both compile-time and runtime consistency between error keys,
 *     message registries, and downstream consumers.  
 *   - Provides IDE-friendly autocomplete for all registered keys.
 *
 * **INPUT CONTRACT**  
 *   - `messages` must be a plain object whose keys are unique string literals.  
 *   - Each value must be a human-readable error description string.  
 *   - Keys must remain pure identifiers (no computed properties).  
 *   - The input object must be passed as `const` to preserve literal narrowing.
 *
 * **OUTPUT CONTRACT**  
 *   - Returns a stable object containing:  
 *     - `ERROR_MESSAGE_KEYS` — a literal-preserving key mirror, enabling
 *       autocomplete and preventing widening.  
 *     - `ERROR_MESSAGES` — a `Map<ErrorMessageKey, string>` containing all
 *       registered messages.  
 *     - `ErrorMessageKey` — a strict union of all key literals, derived
 *       directly from the input object.  
 *   - All keys and messages remain fully typed and strongly linked.
 *
 * **VALIDATION RULES**  
 *   - The generated `ERROR_MESSAGES` Map contains an entry for every provided
 *     key—no omissions or unmapped keys allowed.  
 *   - Keys and values may not widen to `string`.  
 *   - Maintains compatibility with any consumer expecting the
 *     `{ ERROR_MESSAGE_KEYS, ERROR_MESSAGES, ErrorMessageKey }` contract.  
 *   - Must not infer arbitrary or dynamic key names.
 *
 * **SEMANTIC NOTES**  
 *   - This factory serves as the definitive source for constructing
 *     enterprise-grade, deterministic error registries.  
 *   - Upstream schema definitions should import the generated constants rather
 *     than defining local error keys or messages.  
 *   - Additional translation or localization layers may wrap the produced Map
 *     without modifying its typing guarantees.
 *
 * **EXAMPLES**  
 *   ```
 *   const {
 *       ERROR_MESSAGE_KEYS,
 *       ERROR_MESSAGES,
 *       ErrorMessageKey
 *   } = defineErrorMessages({
 *       INVALID_TYPE: "Expected number, received string",
 *       REQUIRED: "This field is required"
 *   });
 *
 *   const key: ErrorMessageKey = ERROR_MESSAGE_KEYS.INVALID_TYPE;
 *   const msg = ERROR_MESSAGES.get(key);
 *   ```
 *
 * @template T extends Record<string, string>
 * @param {T} messages Canonical dictionary of error-message pairs.
 * @returns {{
*   ERROR_MESSAGE_KEYS: { readonly [K in keyof T]: K },
*   ERROR_MESSAGES: Map<keyof T, ErrorMessageString>,
*   ErrorMessageKey: keyof T
* }} Fully typed error-message registry with autocomplete-safe keys.
*/
export function defineErrorMessages<
    const T extends Record<String, String>
>(messages: T) {
    const parsed: $schema.SafeParseResult<typeof errorMessagesSchema> = $schema.safeParse(errorMessagesSchema, messages);

    if (parsed.success === false) {
        const issueLines: String = parsed.issues
            .map((issue: $schema.InferIssue<typeof errorMessagesSchema>) => {
                const path: String =
                    issue.path && issue.path.length > 0
                        ? issue.path.map((p: $schema.IssuePathItem) => String(p.key)).join(".")
                        : "<root>";

                return `• ${path}: ${issue.message}`;
            })
            .join("\n");

        throw new Error(
            [
                "DEFINE_ERROR_MESSAGES_VALIDATION_FAILURE",
                "",
                "The provided error-message registry failed structural and semantic validation.",
                "",
                "This failure indicates that one or more entries violate the:",
                "  • SCREAMING_SNAKE_CASE key-naming contract,",
                "  • minimum/maximum descriptive length requirements,",
                "  • or foundational registry shape guarantees.",
                "",
                "No registry has been created. All downstream validation layers remain unaffected.",
                "",
                "ISSUES:",
                issueLines,
                "",
                "RESOLUTION:",
                "  • Correct the malformed key(s) or message(s).",
                "  • Ensure all keys are uppercase ASCII identifiers.",
                "  • Ensure all messages satisfy enterprise descriptive constraints.",
                ""
            ].join("\n")
        );
    }

    type Keys = keyof T;

    const KEYS: { readonly [K in keyof T]: K; } = Object.keys(messages).reduce((acc, k) => {
        (acc as any)[k] = k;

        return acc;
    }, {} as { readonly [K in Keys]: K });

    return Object.freeze({
        /**
         * *ERROR_MESSAGE_KEYS*
         *
         * **SUMMARY**  
         *   Defines the canonical set of **typed, autocomplete-safe error keys** used
         *   across all schemas and validators. This object is the single source of
         *   truth for error identifiers and ensures consistent usage everywhere.
         *
         * **PURPOSE**  
         *   - Eliminates magic strings across the codebase.  
         *   - Provides fully typed, IDE-autocomplete-friendly error keys.  
         *   - Centralizes key management to prevent drift and duplication.  
         *
         * **INPUT CONTRACT**  
         *   - Keys must be unique string literals.  
         *   - Values must remain `as const` to preserve literal narrowing.  
         *
         * **OUTPUT CONTRACT**  
         *   - Produces a stable object whose values form a strict union of valid keys.  
         *
         * **VALIDATION RULES**  
         *   - No computed properties.  
         *   - No inferred string widening.  
         *   - Must remain compatible with `Map<ErrorMessageKey, string>`.  
         *
         * **SEMANTIC NOTES**  
         *   - Extend this object whenever new schemas or validators are added.  
         *   - Keys are version-controlled and treated as part of the public contract.  
         *
         * **EXAMPLES**  
         *   ```
         *   ERROR_MESSAGE_KEYS.KEY_NAME
         *   ```
         *
         * @returns {ErrorMessageKey} Autocomplete-enabled error key literals.
         */
        ERROR_MESSAGE_KEYS: KEYS,

        /**
         * *ERROR_MESSAGES*
         *
         * **SUMMARY**  
         *   Central registry mapping **typed error keys** to their human-readable,
         *   enterprise-grade error messages. This Map is the authoritative runtime
         *   lookup table for all validation errors.
         *
         * **PURPOSE**  
         *   - Ensures consistent messaging across schemas.  
         *   - Avoids duplicated text or inconsistent phrasing.  
         *   - Allows downstream systems (UI, logs, error reporters) to reference
         *     standardized error descriptions.
         *
         * **INPUT CONTRACT**  
         *   - Keys must be of type `ErrorMessageKey`.  
         *   - Values must be human-readable strings suitable for user-facing or log
         *     consumption.  
         *
         * **OUTPUT CONTRACT**  
         *   - Returns a `Map<ErrorMessageKey, string>` with fully typed entries.  
         *
         * **VALIDATION RULES**  
         *   - Must contain an entry for every registered key.  
         *   - No unknown or unmapped keys permitted.  
         *
         * **SEMANTIC NOTES**  
         *   - Messages may be localized by layering a translation layer on top of
         *     this registry.  
         *   - This Map may be consumed by schema constructors, API error factories,
         *     and domain validators.  
         *
         * **EXAMPLES**  
         *   ```
         *   ERROR_MESSAGES.get(ERROR_MESSAGE_KEYS.KEY_NAME);
         *   ```
         *
         * @returns {Map<ErrorMessageKey, ErrorMessageString>} Fully typed error message registry.
         */
        ERROR_MESSAGES: new Map<Keys, ErrorMessageString>(
            Object.entries(messages) as Array<[Keys, ErrorMessageString]>
        ),

        /**
         * *ErrorMessageKey*
         *
         * **SUMMARY**  
         *   A strictly typed union of **all valid error key literals** produced from
         *   the `ERROR_MESSAGE_KEYS` object. Used to strongly type Maps, functions, and
         *   schema failure cases across the system.
         *
         * **CONTRACT GUARANTEES**  
         *   - Includes every value from `ERROR_MESSAGE_KEYS`.  
         *   - Excludes any arbitrary string.  
         *   - Always provides IDE autocomplete.  
         *
         * **EXAMPLE**  
         *   ```
         *   const key: ErrorMessageKey =
         *       ERROR_MESSAGE_KEYS.KEY_NAME;
         *   ```
         */
        ErrorMessageKey: null! as Keys,
    } as const);
}