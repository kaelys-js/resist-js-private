import { custom, optional, type InferOutput } from "valibot";

import { defineErrorMessages } from '@/schemas/error-factory';

export const {
    ERROR_MESSAGE_KEYS,
    ERROR_MESSAGES,
    ErrorMessageKey
} = defineErrorMessages({
    UNDEFINED_STRICT_INVALID:
        "Validation failed: this field requires the value to be strictly and explicitly the JavaScript `undefined` literal, and any other value—including null, empty primitives, objects, arrays, or coerced forms—violates the schema’s strict-type contract and breaks the enterprise guarantee of deterministic optionality and data-integrity enforcement.",
    UNDEFINED_DEFAULT_INVALID:
        "Validation failed: this field may only be omitted or explicitly set to the JavaScript `undefined` literal, and any other supplied value violates the enterprise-level undefined-default contract by introducing ambiguity, breaking canonical optionality semantics, and compromising downstream data-integrity guarantees.",
    UNDEFINED_NULLABLE:
        "The provided value was expected to be either the literal undefined or the literal null, but a different type or structure was received, violating the schema's strict requirement for controlled absence-state semantics.",
    UNDEFINED_COERCE_INVALID:
        "The provided value could not be coerced to undefined because it contained content that violates the schema’s requirement for strictly empty or unset inputs.",
    UNDEFINED_COERCE_NON_EMPTY_STRING:
        "A non-empty string was received where only empty or whitespace-only strings are permitted, violating the schema’s requirement for canonical absence normalization.",
    UNDEFINED_COERCE_INVALID_TYPE:
        "A value of an unsupported type was received, breaking the schema’s contract that only null-like or whitespace-only strings may be coerced into undefined."
});

/**
* UNDEFINED-STRICT SCHEMA
*
* **SUMMARY**  
*   This section provides a clear and exhaustive explanation describing how this
*   schema is responsible for validating that a value is strictly the JavaScript
*   `undefined` primitive without permitting any other representation. The
*   paragraphs clarify that the validation intent is to enforce a rigid contract
*   where undefined carries explicit semantic meaning inside enterprise systems
*   requiring deterministic value states. This explanation also details how the
*   schema prevents ambiguity by forbidding alternative falsy values that could
*   undermine correctness across distributed workflows. Each sentence presents
*   thorough context needed for engineers to understand exactly why and how this
*   schema must operate.  
*
* **PURPOSE**  
*   - This schema ensures that a field explicitly holds the value `undefined` to
*     model intentional absence in systems where optional or nullable semantics
*     are not acceptable.  
*   - This schema supports workflows in which the strict representation of
*     undefined allows subsystems to infer control state transitions or readiness
*     conditions that depend on precise contract behavior.  
*   - This schema is designed to prevent misinterpretation by disallowing null,
*     empty strings, booleans, or other non-undefined values that might appear in
*     less strictly typed environments.  
*   - This schema enforces clarity in enterprise-grade data pipelines where
*     explicitly undefined values may be used for versioning, placeholders, or
*     compatibility boundaries requiring absolute accuracy.  
*
* **INPUT CONTRACT**  
*   - The only allowed input is the literal JavaScript undefined value, ensuring
*     there is no implicit transformation or type coercion applied by upstream
*     callers.  
*   - Inputs such as null, empty strings, numbers, booleans, objects, symbols, or
*     any other JavaScript primitive or structure are all rejected without
*     exception.  
*   - Inputs that are missing or omitted at the object level are also rejected,
*     because the contract requires the field to be both present and strictly
*     undefined.  
*   - Callers must provide the correct type with no attempts at serialization,
*     indirect representation, or placeholder substitution of any kind.  
*
* **OUTPUT CONTRACT**  
*   - The output is guaranteed to be exactly undefined, ensuring all downstream
*     consumers receive a consistent and predictable result.  
*   - No mutation or normalization occurs, preserving the invariant that the
*     output represents intentional non-value rather than absence due to error.  
*   - The schema guarantees that no falsy or alternative stand-in values are ever
*     passed to subsequent systems, ensuring strict correctness.  
*   - The output maintains a stable shape for systems that depend on undefined
*     semantics during orchestration, coordination, or processing stages.  
*
* **VALIDATION RULES**  
*   - The schema verifies strict identity by checking whether the provided value
*     is equal to undefined using an exact comparison without coercion.  
*   - The schema rejects all values that are not strictly undefined, including
*     null, empty strings, numbers, objects, and other falsy primitives.  
*   - The schema requires the key to exist in cases where it is part of an
*     object-level contract, ensuring presence and undefined-ness simultaneously.  
*   - The schema performs no implicit conversion or defaulting, ensuring every
*     mismatch results in an immediate validation failure.  
*
* **SEMANTIC NOTES**  
*   - This schema is intended for enterprise systems where undefined carries
*     explicit meaning in terms of workflow state, configuration placeholders, or
*     compatibility markers.  
*   - This schema ensures stability across distributed systems by guaranteeing
*     that undefined remains a deliberate and interpretable value.  
*   - This schema helps uphold strict API contracts that rely on undefined as a
*     meaningful indicator of reserved, pending, or intentionally omitted
*     content.  
*   - This schema supports storage layers, communication protocols, and evolving
*     schemas that all depend on explicit undefined semantics to maintain
*     correctness.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Strict undefined)
*   Input: undefined
*   Output: undefined
*
*   // Example 2 (Failing — Null is not allowed)
*   Input: null
*   Output: ValidationError("The value must be strictly undefined, but null was provided, which violates the schema’s explicit undefined-only contract.")
*
*   // Example 3 (Failing — Any non-undefined value is forbidden)
*   Input: "not undefined"
*   Output: ValidationError("The value must be strictly undefined, but a non-undefined value was received, which breaks the schema’s strict identity requirement.")
*   ```
*
* @returns {UndefinedStrict} The validated value.
*/
export const undefinedStrict = custom(
    (value: unknown): boolean => {
        if (value === undefined) {
            return true;
        }

        return false;
    },
    ERROR_MESSAGE_KEYS.UNDEFINED_STRICT_INVALID
);

/**
* OUTPUT TYPE — UNDEFINED-STRICT
*
* **SUMMARY**  
*   This section explains in three to five complete sentences that this output
*   type represents a schema-validated value guaranteed to be exactly undefined
*   under all circumstances. The explanation clarifies that consumers may rely on
*   this invariant for deterministic handling of optional workflow states inside
*   strict enterprise systems. It further details how this type establishes a
*   stable contract boundary for any component reading, transmitting, or storing
*   the validated output. The narrative also provides enough context so that any
*   engineer may understand both its meaning and its importance in structured
*   data pipelines.  
*
* **CONTRACT GUARANTEES**  
*   - The value is always exactly undefined and cannot represent any alternative
*     empty or falsy state.  
*   - The value can never be null, ensuring downstream systems do not need to
*     implement null-guards or similar safety logic.  
*   - The value is never missing, because validation guarantees that the field is
*     intentionally present and intentionally undefined.  
*   - The value is never substituted, coerced, serialized, or otherwise modified
*     during or after validation.  
*
* **EXAMPLE**  
*   ```
*   const val: UndefinedStrict =
*       parse(undefinedStrict, undefined);
*   ```
*/
export type UndefinedStrict = InferOutput<typeof undefinedStrict>;

/**
* UNDEFINED-DEFAULT SCHEMA
*
* **SUMMARY**  
*   This schema establishes a rigorous validation layer that guarantees any
*   provided input is treated as an intentionally undefined value within complex
*   enterprise pipelines. It ensures that both explicit `undefined` values and
*   completely missing keys normalize into a single stable representation without
*   altering surrounding data structures. The schema’s design supports large
*   systems that require deterministic optionality handling for robust
*   cross-service interoperability. It enforces strict constraints so that
*   downstream consumers can depend on the absence of unexpected coercions or
*   ambiguous placeholder values.
*
* **PURPOSE**  
*   - This schema provides a unified mechanism for representing optional fields
*     that intentionally resolve to `undefined` within enterprise workloads,
*     ensuring consistent interpretation across distributed systems.  
*   - This schema protects downstream processes from accidental receipt of values
*     that masquerade as “empty,” thereby preventing state corruption or
*     semantically misleading defaults.  
*   - This schema offers a reliable contract for forms, configuration surfaces,
*     API handlers, and ingestion layers where omission must always normalize
*     into `undefined` rather than into type-coerced substitutes.  
*   - This schema ensures all optional fields carry identical semantic meaning
*     whether the caller omitted the key or explicitly provided `undefined`.  
*
* **INPUT CONTRACT**  
*   - This schema accepts the literal JavaScript value `undefined`, treating it
*     as an intentional representation of an absent value suitable for optional
*     models.  
*   - This schema accepts missing keys implicitly and normalizes their absence
*     into a guaranteed `undefined` output without applying coercion.  
*   - This schema rejects all primitives other than `undefined`, including null,
*     booleans, numbers, strings, and symbols, because they introduce ambiguity
*     in optional-handling semantics.  
*   - This schema rejects arrays, objects, functions, and any non-undefined
*     structured values to ensure no unexpected shapes pass through validation.  
*
* **OUTPUT CONTRACT**  
*   - The schema always returns the literal JavaScript value `undefined` as its
*     output, ensuring a consistent canonical representation.  
*   - The schema guarantees that missing keys are normalized to exactly the same
*     output representation as explicit undefined fields.  
*   - The schema ensures that downstream workflows always receive a stable and
*     predictable undefined value instead of loosely typed empty placeholders.  
*   - The schema enforces that no additional type coercion ever occurs, thereby
*     preventing subtle cross-layer inconsistencies.  
*
* **VALIDATION RULES**  
*   - The schema verifies that if an input is present, it must strictly equal the
*     literal undefined value, ensuring deterministic and safe semantics.  
*   - The schema ensures that missing keys are automatically normalized so that
*     validation yields a predictable undefined output without introducing silent
*     type conversions.  
*   - The schema denies any non-undefined input, preventing invalid or coerced
*     values from being mistaken as intentionally absent.  
*   - The schema enforces structural purity by forbidding use of empty strings,
*     null, zero, or other common “empty-like” values, eliminating ambiguity in
*     enterprise logic.  
*
* **SEMANTIC NOTES**  
*   - This schema is the definitive choice for fields where undefined strictly
*     represents intentional optionality inside enterprise configuration systems.  
*   - This schema prevents semantic drift by ensuring no implicit conversions
*     occur from unrelated “empty” values into undefined, preserving integrity
*     across pipelines.  
*   - This schema allows caller intent to remain crystal clear in systems where
*     undefined carries distinct meaning from null or empty structures.  
*   - This schema ensures smooth schema evolution because undefined remains a
*     stable and non-breaking contract across new versions.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Explicit undefined)
*   Input: undefined
*   Output: undefined
*
*   // Example 2 (Passing — Missing key normalizes to undefined)
*   Input: <missing key>
*   Output: undefined
*
*   // Example 3 (Failing — Null is not allowed)
*   Input: null
*   Output: ValidationError("The provided value was null, but only the literal undefined value or a missing key are permitted by the schema’s strict optionality contract.")
*
*   // Example 4 (Failing — Any non-undefined primitive forbidden)
*   Input: ""
*   Output: ValidationError("A non-undefined value was received, but the schema requires strict undefined semantics and therefore rejects any defined primitive.")
*
*   // Example 5 (Failing — Structured values forbidden)
*   Input: { a: 1 }
*   Output: ValidationError("A structured value was provided, but the schema only permits undefined or missing keys to maintain canonical optionality semantics.")
*   ```
*
* @returns {UndefinedDefault} The validated value.
*/
export const undefinedDefault = optional(
    custom((value: unknown): boolean => {
        if (value === undefined) {
            return true;
        }

        return false;
    }, ERROR_MESSAGE_KEYS.UNDEFINED_DEFAULT_INVALID),
    undefined as undefined
);

/**
* OUTPUT TYPE — UNDEFINED DEFAULT
*
* **SUMMARY**  
*   This output type represents a strictly normalized undefined value that has
*   passed validation through the associated schema’s enterprise-grade
*   constraints. It guarantees that consumers receive a value that unambiguously
*   signifies intentional absence rather than coerced emptiness. Because the
*   validated output is always literal undefined, this type ensures consistent
*   downstream semantics across multi-layer application boundaries. The type
*   establishes predictable optional-field behavior in highly structured
*   workflows.
*
* **CONTRACT GUARANTEES**  
*   - The output type always represents the literal JavaScript value undefined
*     with no alternative encodings, ensuring absolute semantic clarity.  
*   - The output type guarantees that no null, empty string, numeric zero, or any
*     other placeholder ever appears in place of undefined.  
*   - The output type ensures that missing keys and explicit undefined are
*     normalized into the exact same value, simplifying consumption logic.  
*   - The output type provides a stable and predictable invariant across schema
*     revisions, ensuring enterprise-safe forward compatibility.  
*
* **EXAMPLE**  
*   ```
*   const val: UndefinedDefault =
*       parse(undefinedDefault, undefined);
*   ```
*/
export type UndefinedDefault = InferOutput<typeof undefinedDefault>;

/**
* UNDEFINED-NULLABLE SCHEMA
*
* **SUMMARY**  
*   This schema validates that an incoming value is strictly either the literal
*   JavaScript `undefined` or the literal JavaScript `null`, ensuring the field
*   represents a controlled absence of data within enterprise-grade systems.  
*   It establishes a predictable handling model for pipelines that differentiate
*   between an omitted field and an explicitly cleared one while maintaining
*   strict structural integrity.  
*   The schema plays a critical role in update flows, form engines, and config
*   models that rely on precise semantic meanings behind “no value” states rather
*   than accepting any loosely falsy constructs.  
*   Engineers depend on this schema to guarantee that values representing
*   emptiness comply with well-defined business rules and do not introduce
*   ambiguity into downstream logic.  
*
* **PURPOSE**  
*   - This schema ensures that APIs, configuration layers, and data pipelines
*     safely accept two and only two forms of empty values, thereby eliminating
*     ambiguity that would otherwise arise from loosely typed inputs.  
*   - It enforces a strict contract for patch and update operations where
*     distinguishing omitted fields from explicitly nullified fields is
*     operationally critical.  
*   - It supports enterprise systems that treat `null` as a valid action signal
*     while treating `undefined` as an intentional instruction to preserve
*     existing data, ensuring consistent behavior across services.  
*   - It prevents accidental acceptance of coerced or falsy values that would
*     violate semantic expectations and potentially corrupt downstream behavior.  
*
* **INPUT CONTRACT**  
*   - It accepts only the literal JavaScript `undefined`, ensuring that any other
*     “missing” representation such as empty string or zero is rejected.  
*   - It accepts only the literal JavaScript `null`, preventing coerced values or
*     loosely falsy constructs that might misleadingly appear empty.  
*   - It rejects all primitives other than `undefined` and `null`, including
*     numbers, strings, booleans, symbols, and bigints, to maintain strict
*     semantic clarity.  
*   - It rejects arrays, objects, functions, and any structure requiring type
*     coercion because such forms would violate the schema’s narrowly defined
*     absence-state semantics.  
*
* **OUTPUT CONTRACT**  
*   - The output is guaranteed to be exactly the same literal value (`undefined`
*     or `null`) that the consumer provided, without transformation or
*     normalization.  
*   - The schema ensures that successful outputs never include strings,
*     numerics, booleans, arrays, or objects, preserving strong type reliability.  
*   - The output reflects the unmodified emptiness signal so that downstream
*     consumers can rely on its semantic meaning without requiring further
*     checks.  
*   - All output values are structurally stable and can safely pass through
*     serialization, logging, and transport layers that rely on predictable
*     absence semantics.  
*
* **VALIDATION RULES**  
*   - The validator checks if the incoming value is strictly equal to `undefined`
*     because this case represents an intentionally omitted field in many
*     enterprise-class pipelines.  
*   - It checks if the incoming value is strictly equal to `null` as this value
*     explicitly represents user intent to clear or blank a stored field.  
*   - It rejects all other values to prevent misinterpretation of loosely defined
*     emptiness constructs that could degrade data consistency across systems.  
*   - It guarantees no form of coercion or truthiness evaluation is used,
*     eliminating risk of accidental acceptance of ambiguous values.  
*
* **SEMANTIC NOTES**  
*   - This schema provides a foundation for API behaviors in which developers
*     must cleanly distinguish no-op updates from explicit field deletions.  
*   - Its acceptance constraints ensure cross-system clarity when integrating
*     with databases, message queues, or configuration registries that treat
*     nullability differently.  
*   - It supports legacy and modern systems where undefined and null each carry
*     their own semantics but must remain tightly controlled in transport
*     contracts.  
*   - It is essential in scenarios where user intent must be preserved exactly,
*     particularly in auditing, logging, or compliance-driven environments.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Undefined allowed)
*   Input: undefined
*   Output: undefined
*
*   // Example 2 (Passing — Null allowed)
*   Input: null
*   Output: null
*
*   // Example 3 (Failing — Any other primitive rejected)
*   Input: 0
*   Output: ValidationError("The provided value must be either the literal undefined or the literal null, but a non-nullish primitive was received, violating the schema’s strict absence-state constraints.")
*
*   // Example 4 (Failing — Objects, arrays, and other structures rejected)
*   Input: { a: 1 }
*   Output: ValidationError("The provided value must be either the literal undefined or the literal null, but a structured value was received, violating the schema’s narrowly defined semantic requirements.")
*   ```
*
* @returns {UndefinedNullable} The validated value.
*/
export const undefinedNullable = custom(
    (value: unknown): boolean => {
        if (value === undefined) {
            return true;
        } else if (value === null) {
            return true;
        }

        return false;
    },
    ERROR_MESSAGE_KEYS.UNDEFINED_NULLABLE
);

/**
* OUTPUT TYPE — UNDEFINED-NULLABLE
*
* **SUMMARY**  
*   This output type represents a strictly constrained absence state where the
*   only allowable values emerging from validation are the JavaScript literals
*   `undefined` or `null`. The type guarantees that no transformed, coerced, or
*   ambiguous falsy values will propagate into downstream systems. It establishes
*   a predictable and stable contract ensuring uniform representation of
*   emptiness across all enterprise workflows. The definition provides strong
*   invariants that maintain correctness even in complex, multi-layered
*   application architectures.  
*
* **CONTRACT GUARANTEES**  
*   - The type guarantees that the output will never be a string, number,
*     boolean, object, array, or any coercible structure, ensuring complete
*     semantic clarity.  
*   - The type ensures that undefined and null remain distinct states and will
*     never be implicitly merged or normalized by the schema.  
*   - The type forbids any form of automatic defaulting behavior, meaning the
*     caller receives exactly what was provided when validation succeeds.  
*   - The type guarantees complete stability across serialization boundaries and
*     maintains identical semantics in logs, events, and persisted artifacts.  
*
* **EXAMPLE**  
*   ```
*   const val: UndefinedNullable =
*       parse(undefinedNullable, undefined);
*   ```
*/
export type UndefinedNullable = InferOutput<typeof undefinedNullable>;

/**
* UNDEFINED-COERCE SCHEMA
*
* **SUMMARY**  
*   This schema validates and normalizes a broad range of empty or unset values
*   into a single canonical `undefined` output to ensure consistent downstream
*   handling. It establishes a unified representation for absence by collapsing
*   null-like inputs into a stable and predictable state. It safeguards enterprise
*   workflows from ambiguous input states by enforcing strict coercion semantics.
*   It ensures that only syntactically and semantically empty values are accepted
*   while preserving strong guarantees for consumers of normalized data.
*
* **PURPOSE**  
*   - This schema ensures that all conceptually empty values are collapsed into a
*     single invariant `undefined` state to maintain strict consistency across
*     systems that otherwise receive heterogeneous null-like representations.  
*   - This schema eliminates ambiguous client-side and server-side emptiness
*     cases, providing a unified interface for components that depend on precise
*     absence semantics.  
*   - This schema prevents inconsistent or misleading representations from
*     polluting storage, transport, or validation layers and guarantees that
*     business logic is shielded from malformed emptiness inputs.  
*   - This schema provides a strong defensive layer around user-entered,
*     third-party, or system-generated blank values to avoid downstream failures
*     and semantic misinterpretations.  
*
* **INPUT CONTRACT**  
*   - The schema accepts values of `undefined`, `null`, an empty string, or a
*     string containing only whitespace, each of which will be normalized to the
*     canonical `undefined` output.  
*   - The schema rejects any non-empty string because such content indicates the
*     presence of meaningful data that must not be silently collapsed.  
*   - The schema rejects all numeric, boolean, array, and object values because
*     these structures imply semantic information that violates the contract of
*     explicit emptiness.  
*   - The schema rejects any value that cannot be interpreted as strictly empty
*     because accepting such values would undermine data integrity guarantees for
*     downstream systems.  
*
* **OUTPUT CONTRACT**  
*   - The schema always returns literal `undefined` as the stable representation
*     of empty or unset values after successful validation.  
*   - The schema guarantees that no alternative falsy or null-like representations
*     will reach downstream consumers, preserving a uniform absence contract.  
*   - The schema ensures that validated outputs will never contain unexpected
*     state transitions, shadow values, or intermediate coercion artifacts.  
*   - The schema guarantees deterministic and idempotent normalization of all
*     accepted empty-state inputs.  
*
* **VALIDATION RULES**  
*   - The rule treats explicitly missing or undefined values as valid and coerces
*     them into a stable `undefined` state to maintain consistent absence.  
*   - The rule treats `null` as equivalent to undefined to prevent subtle
*     discrepancies between otherwise interchangeable empty markers.  
*   - The rule examines string inputs and only accepts strings that contain no
*     non-whitespace content, ensuring strict alignment between syntactic and
*     semantic emptiness.  
*   - The rule rejects all other values because their presence indicates
*     meaningful content that must not be interpreted as empty.  
*
* **SEMANTIC NOTES**  
*   - This schema is critical for eliminating three-way nullability issues where
*     empty strings, nulls, and undefined values may otherwise behave differently
*     across systems.  
*   - This schema ensures uniformity for data ingestion pipelines that receive
*     inconsistent emptiness indicators from heterogeneous client or service
*     integrations.  
*   - This schema simplifies business logic by guaranteeing that callers only
*     need to interpret a single absence state rather than multiple null-like
*     variants.  
*   - This schema supports long-term schema evolution because a unified undefined
*     representation reduces migration complexity and storage ambiguity.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Empty string)
*   Input: ""
*   Output: undefined
*
*   // Example 2 (Passing — Whitespace-only string)
*   Input: "   "
*   Output: undefined
*
*   // Example 3 (Passing — Null coerced to undefined)
*   Input: null
*   Output: undefined
*
*   // Example 4 (Passing — Explicit undefined)
*   Input: undefined
*   Output: undefined
*
*   // Example 5 (Failing — Non-empty string forbidden)
*   Input: "hello"
*   Output: ValidationError("The provided string contains non-whitespace characters and therefore cannot be coerced into undefined without violating the schema’s strict emptiness requirements.")
*
*   // Example 6 (Failing — Non-empty value forbidden)
*   Input: 123
*   Output: ValidationError("The provided value contains semantic meaning and cannot be coerced into undefined, as doing so would violate the schema’s emptiness contract.")
*   ```
*
* @returns {UndefinedCoerce} The validated value.
*/
export const undefinedCoerce = coerce(
    custom(
        (value: unknown): boolean => {
            if (value === undefined) {
                return true;
            } else if (value === null) {
                return true;
            } else if (typeof value === "string") {
                if (value.trim() === "") {
                    return true;
                }

                return false;
            }

            return false;
        },
        ERROR_MESSAGE_KEYS.UNDEFINED_COERCE_INVALID
    ),
    (input: unknown): undefined => {
        if (input === undefined) {
            return undefined;
        } else if (input === null) {
            return undefined;
        } else if (typeof input === "string") {
            if (input.trim() === "") {
                return undefined;
            }

            throw new Error(ERROR_MESSAGE_KEYS.UNDEFINED_COERCE_NON_EMPTY_STRING);
        }

        throw new Error(ERROR_MESSAGE_KEYS.UNDEFINED_COERCE_INVALID_TYPE);
    }
);

/**
* OUTPUT TYPE — UNDEFINED-COERCE
*
* **SUMMARY**  
*   This output type represents a canonical absence state that has been strictly
*   validated and normalized through the schema’s coercion rules. The type
*   guarantees that all permissible empty-value inputs ultimately resolve to a
*   literal `undefined`, ensuring consistent downstream behavior. It removes the
*   ambiguity that typically arises from multiple null-like representations and
*   enforces a predictable interface for enterprise data flows. It provides a
*   stable foundation that ensures all validated results conform precisely to the
*   absence contract established at the schema layer.
*
* **CONTRACT GUARANTEES**  
*   - The output type guarantees that the final value is always literal
*     `undefined` and never a null-like variant or substituted placeholder.  
*   - The output type ensures that no consumer of the validated value encounters
*     inconsistent emptiness semantics or transitional internal states.  
*   - The output type guarantees that the validated data never includes
*     non-empty strings, objects, arrays, or any structural or primitive content
*     that would contradict the schema’s absence requirements.  
*   - The output type ensures complete determinism such that repeated validations
*     of equivalent inputs always result in the same canonical `undefined`.  
*
* **EXAMPLE**  
*   ```
*   const val: UndefinedCoerce =
*       parse(undefinedCoerce, "");
*   ```
*/
export type UndefinedCoerce = InferOutput<typeof undefinedCoerce>;