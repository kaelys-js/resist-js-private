import { custom, nullable, optional, transform, unknown, type InferOutput } from "valibot";

import { defineErrorMessages } from '@/schemas/error-factory';

export const {
    ERROR_MESSAGE_KEYS,
    ERROR_MESSAGES,
    ErrorMessageKey
} = defineErrorMessages({
    UNKNOWN_STRICT_INVALID: "The provided value was expected to be accepted as-is by the unknownStrict schema, but received an unexpected failure state that violates the schema’s guarantee of unconditional permissiveness.",
    UNKNOWN_FORBIDDEN:
        "The provided value was expected to be any defined JavaScript value, but an undefined value was received, which violates the schema’s requirement for explicit presence and breaks contractual guarantees of determinism and structural clarity.",
    UNKNOWN_NONNULL:
        "The provided value failed validation because the schema requires a non-null and non-undefined input, but the received value did not meet this presence requirement and therefore violated the schema’s structural contract.",
    UNKNOWN_INPUT_INVALID:
        "The provided value could not be coerced into a valid unknown type because it violated one or more structural or semantic requirements expected by the normalization process.",
    UNKNOWN_NULL_DISALLOWED:
        "The provided value was null, which violates the schema’s requirement that all unknown inputs must contain meaningful content rather than represent absence.",
    UNKNOWN_UNDEFINED_DISALLOWED:
        "The provided value was undefined, which breaks the schema’s contract that unknown inputs must be explicitly defined before entering the normalization pipeline.",
    UNKNOWN_FUNCTION_DISALLOWED:
        "A function was received, which is invalid because executable constructs cannot be serialized, transported, or safely normalized in an enterprise data context.",
    UNKNOWN_SYMBOL_DISALLOWED:
        "A symbol was received, which is disallowed because symbols are non-serializable primitives that violate deterministic transport and logging guarantees.",
    UNKNOWN_DOM_ELEMENT_DISALLOWED:
        "A DOM element was received, which is rejected because browser-bound UI constructs cannot be safely coerced into transport-safe or serialization-safe shapes.",
    UKNOWN_LOOSE_INVALID: "The provided value is invalid because it contains a function, symbol, DOM element, or other non-serializable construct, which violates the schema’s requirement that only structurally safe and data-oriented values may be accepted.",
    UNKNOWN_DEFAULT_NULL:
        "The provided value is invalid because only null, undefined, or non-exotic primitives and objects are permitted, and the received value violates the schema’s requirements by including a function, symbol, or DOM element that cannot be safely validated or transmitted.",
    UNKNOWN_NONEMPTY_INVALID:
        "The provided value was expected to be a non-empty, non-exotic structure, but an empty, void-like, or semantically invalid value was received, which violates the schema’s strict contractual requirement for meaningful top-level content.",
    UNKNOWN_NEVER:
        "This field must never be provided because the schema explicitly forbids all possible values, and receiving any input violates the contractual requirement that this field remain impossible to satisfy."
});

/**
* UNKNOWN-STRICT SCHEMA
*
* **SUMMARY**  
*   This schema defines an intentionally permissive validation boundary that
*   accepts any JavaScript value without imposing structural, semantic, or
*   transformational constraints. It is designed to function as a universal
*   passthrough mechanism within complex enterprise architectures that require
*   flexible handling of arbitrary data. The schema enables safe integration of
*   untyped or evolving inputs while maintaining consistent validation flows
*   across heterogeneous system layers. It ensures that no implicit assumptions
*   are made about the input’s identity, shape, or behavior when processed.  
*
* **PURPOSE**  
*   - This schema exists to support dynamic or rapidly evolving data pipelines
*     that cannot be rigidly typed but must still flow through standardized
*     validation entry points within enterprise platforms.  
*   - This schema enables integration points for plug-in architectures where
*     upstream producers may deliver data in unpredictable or user-defined
*     formats that must not be constrained prematurely.  
*   - This schema provides a structural placeholder for future type evolution
*     scenarios where strict validation may be introduced later without breaking
*     backward compatibility.  
*   - This schema allows teams to enforce uniform parsing interfaces in contexts
*     where strict typing is deferred due to operational complexity, legacy
*     system migration, or intentionally flexible input requirements.  
*
* **INPUT CONTRACT**  
*   - This schema accepts any JavaScript value, including primitives, arrays,
*     objects, functions, symbols, bigint values, and all special values such as
*     null, undefined, and NaN.  
*   - This schema does not reject malformed, corrupted, deeply nested, circular,
*     or structurally inconsistent values because permissiveness is a core
*     requirement.  
*   - This schema does not impose constraints on encoding, serialization format,
*     mutability characteristics, or prototype inheritance.  
*   - This schema accepts missing, omitted, or optional values without enforcing
*     the presence of any key or structural pattern.  
*
* **OUTPUT CONTRACT**  
*   - This schema guarantees that the output will always be the exact same value
*     that was provided as input, with no mutation, normalization, or structural
*     changes applied.  
*   - This schema guarantees that the output remains fully unknown from the
*     perspective of TypeScript, providing maximal flexibility at runtime.  
*   - This schema guarantees that no metadata, annotations, or post-processing
*     logic will alter the output in downstream workflows.  
*   - This schema guarantees that the returned value preserves identity semantics
*     such that reference types remain unmodified and interconnected references
*     behave consistently.  
*
* **VALIDATION RULES**  
*   - This schema enforces a rule that all values are intrinsically valid and
*     therefore cannot fail validation under any circumstances.  
*   - This schema enforces a rule that no transformations, coercions, or parsing
*     logic may be applied to the input to avoid accidental semantic drift.  
*   - This schema enforces a rule that prohibits the introduction of implicit
*     structural assumptions, ensuring that arbitrary data remains untouched.  
*   - This schema enforces a rule that validation success is guaranteed, thereby
*     ensuring fully deterministic behavior across all runtime environments.  
*
* **SEMANTIC NOTES**  
*   - This schema plays a critical role in systems that ingest untyped or
*     user-generated data, allowing enterprise services to gracefully handle
*     unpredictable payloads.  
*   - This schema provides architectural support for transitional systems where
*     type refinement occurs progressively rather than upfront.  
*   - This schema ensures compatibility with distributed or polyglot systems
*     where strict typing cannot be consistently enforced at source boundaries.  
*   - This schema maintains forward-compatibility for evolving APIs where the
*     permitted data shapes are intentionally broad or undefined.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing)
*   Input: 42
*   Output: 42
*
*   // Example 2 (Passing)
*   Input: { x: 10, y: [1, 2] }
*   Output: { x: 10, y: [1, 2] }
*
*   // Example 3 (Failing)
*   Input: <unrepresentable internal engine artifact>
*   Output: ValidationError("Value could not be processed due to an engine-level constraint outside the schema’s permissive domain.")
*   ```
*
* @returns {UnknownStrict} The validated value.
*/
export const unknownStrict = unknown();

/**
* OUTPUT TYPE — UNKNOWN-STRICT
*
* **SUMMARY**  
*   This output type represents the fully permissive nature of the `unknownStrict`
*   schema by preserving all input values exactly as received without asserting
*   structure, semantics, or domain-specific meaning. It articulates that the
*   resulting type is intentionally unknown, allowing maximum flexibility for
*   downstream systems that must defer interpretation or apply late-bound
*   validation steps. It emphasizes that no guarantees are made about the
*   internal form of the data, ensuring that no inference or narrowing occurs
*   implicitly. It also ensures that developers interacting with this type fully
*   understand its unbounded nature and associated responsibilities.  
*
* **CONTRACT GUARANTEES**  
*   - This type guarantees that the value returned is exactly the same value
*     passed into the schema, with no runtime transformations or derivations.  
*   - This type guarantees that no structural, semantic, or shape-based
*     assumptions may be safely made by consumers of the output.  
*   - This type guarantees that the data remains opaque, requiring explicit
*     refinement or checks before use in strongly typed contexts.  
*   - This type guarantees that downstream systems must treat the value as
*     unpredictable and must enforce their own localized validation logic.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownStrict =
*       parse(unknownStrict, someValue);
*   ```
*/
export type UnknownStrict = InferOutput<typeof unknownStrict>;

/**
* UNKNOWN-NULLABLE SCHEMA
*
* **SUMMARY**  
*   This schema validates inputs that may contain any JavaScript value while
*   explicitly permitting null as a meaningful and intentional state rather than
*   treating it as an error or omission. It provides a flexible acceptance layer
*   for systems that must support both typed and untyped data traveling across
*   boundaries. Its design ensures that all values, including complex structures
*   or primitives, are treated consistently without transformation. This schema
*   exists to give engineers a predictable and stable mechanism for passing free-
*   form inputs through strict validation layers.
*
* **PURPOSE**  
*   - This schema exists to validate arbitrary values while also preserving null
*     as an intentional signal indicating absence or reset semantics across
*     enterprise data boundaries.  
*   - It enables systems to gracefully accommodate unknown types that originate
*     from external APIs, user-controlled input, or untyped integration points.  
*   - It ensures that typed workflows can explicitly encode null without
*     triggering validation exceptions that would otherwise disrupt cross-system
*     communication.  
*   - It offers a stable mechanism for allowing arbitrary incoming payloads to
*     pass through without modification while still participating in contractual
*     validation flows.  
*
* **INPUT CONTRACT**  
*   - Inputs may consist of any JavaScript value, including primitives, objects,
*     arrays, symbols, functions, or special values such as undefined.  
*   - Explicit null inputs are accepted as valid intentional states and are
*     distinguished from other unknown values.  
*   - Inputs that omit the field entirely are treated as standard unknown values,
*     and no special coercion or fallback semantics are applied.  
*   - No malformed, unexpected, nested, or structurally irregular value is ever
*     rejected because the schema enforces no shape constraints.  
*
* **OUTPUT CONTRACT**  
*   - The output is always identical to the input, guaranteeing that no coercion,
*     mutation, or transformation affects the resulting value.  
*   - Outputs may be null or any other JavaScript value, maintaining full parity
*     with what the caller provided.  
*   - The schema ensures that downstream consumers may rely on the exact runtime
*     representation of the validated value without concern for alterations.  
*   - The resulting output preserves the semantic intention of null versus
*     unknown values without performing normalization.  
*
* **VALIDATION RULES**  
*   - Validation always succeeds because no structural, primitive, semantic, or
*     contextual checks are applied to any incoming value.  
*   - The schema does not raise exceptions regardless of type, shape, or content
*     of the provided input.  
*   - Null inputs are intentionally allowed and never treated as absent or
*     erroneous values.  
*   - Undefined values are accepted as ordinary unknown values with no special
*     override behavior or interpretation.  
*
* **SEMANTIC NOTES**  
*   - This schema enables nuanced differentiation between null as an intentional
*     semantic marker versus unknown values representing free-form or untyped
*     payload content.  
*   - It supports interoperability across systems where null encodes meaningful
*     application-layer semantics and undefined encodes absence of assignment.  
*   - It is particularly useful in configuration layers, preference systems, or
*     integration boundaries where values may toggle between null and arbitrary
*     unknown types.  
*   - Its permissive nature removes friction in systems requiring strict
*     validation guarantees without sacrificing input flexibility.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing)
*   Input: 42
*   Output: 42
*
*   // Example 2 (Passing)
*   Input: null
*   Output: null
*
*   // Example 3 (Failing — Impossible Case)
*   Input: <no possible JavaScript value can cause failure>
*   Output: <validation cannot fail because the schema accepts all values>
*   ```
*
* @returns {UnknownNullable} The validated value.
*/
export const unknownNullable = nullable(unknown());

/**
* OUTPUT TYPE — UNKNOWN-NULLABLE
*
* **SUMMARY**  
*   This output type represents a value that may consist of any JavaScript type
*   or explicit null, preserving the caller’s original input without alteration
*   or coercion. It defines a broad and flexible type surface suitable for
*   scenarios where data variability is inherent and intentional. The type
*   ensures that consumers understand that null is a meaningful state and not an
*   omitted or defaulted value. Its guarantees help enforce consistency across
*   enterprise boundaries where loosely typed data may be exchanged.
*
* **CONTRACT GUARANTEES**  
*   - The output type always matches the exact runtime value passed to the
*     schema, ensuring bitwise stability and zero mutation.  
*   - The value may be null or any JavaScript type, guaranteeing consumers that
*     no forbidden states are introduced by validation.  
*   - The type prevents downstream consumers from assuming structure, shape, or
*     primitive constraints that the schema does not enforce.  
*   - The type ensures that systems relying on the difference between null and
*     unknown values receive accurate and unmodified state representations.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownNullable =
*       v.parse(unknownNullable, someValue);
*   ```
*/
export type UnknownNullable = InferOutput<typeof unknownNullable>;

/**
* UNKNOWN-OPTIONAL SCHEMA
*
* **SUMMARY**  
*   This schema defines a permissive validation construct that accepts any
*   possible JavaScript value while explicitly allowing undefined as a valid,
*   intentional state that carries semantic meaning. It ensures that consumers
*   can safely provide values of any type or omit them entirely without breaking
*   validation flows across distributed systems. The schema is designed to
*   integrate seamlessly into complex enterprise pipelines where optional fields
*   must be treated with precision. Its behavior guarantees stability when used
*   in dynamic, evolving data models that rely on flexible attribute handling.
*
* **PURPOSE**  
*   - This schema exists to support enterprise-grade systems that require a
*     field to be present or omitted without enforcing any structural or
*     semantic constraints on the provided value.  
*   - It ensures reliable handling of optional attributes in configuration,
*     request bodies, patch operations, and extension mechanisms where undefined
*     holds a distinct operational meaning.  
*   - It enables flexible schema evolution by permitting any future or unknown
*     data types to pass through, thus preventing premature constraint
*     enforcement in distributed workflows.  
*   - It removes ambiguity between omission and explicit null assignment, which
*     is critical in systems that differentiate between reset operations and
*     non-provided updates.  
*
* **INPUT CONTRACT**  
*   - The schema will accept any JavaScript value, including primitives,
*     objects, arrays, functions, symbols, and all other valid inputs.  
*   - It explicitly treats undefined as a valid input rather than a missing or
*     erroneous field, ensuring clear semantic modeling in optional contexts.  
*   - It rejects no valid JavaScript value and never interprets provided input
*     as malformed due to shape, type, or unexpected structure.  
*   - It does not apply any coercion, and therefore rejects no input on the
*     basis of representational mismatches, unsupported primitives, or edge-case
*     conversions.  
*
* **OUTPUT CONTRACT**  
*   - After validation, the output will always be exactly the same value that
*     was passed in, without mutation or normalization of any kind.  
*   - The returned value may be undefined or any other unknown JavaScript type,
*     ensuring fidelity with the caller’s original intent.  
*   - No serialization, deep-cloning, or transformation steps are applied at any
*     stage of the validation pipeline.  
*   - The output is guaranteed to preserve semantic meaning related to omitted
*     versus explicitly cleared values in complex workflows.  
*
* **VALIDATION RULES**  
*   - The schema enforces no structural, semantic, or primitive restrictions,
*     allowing all JavaScript values to pass through validation unchanged.  
*   - Undefined is validated as a first-class allowable state, preserving its
*     operational meaning in optional-field contexts.  
*   - No constraints are applied for shape, type, or format, ensuring that the
*     schema never fails under any valid JavaScript value.  
*   - Since validation always succeeds, no rule exists that would modify,
*     transform, or coerce the input in any way.  
*
* **SEMANTIC NOTES**  
*   - The schema’s distinction between undefined and null plays a vital role in
*     systems where omission semantics differ from explicit clearing semantics.  
*   - Its permissive nature ensures compatibility with diverse extension models,
*     plugin architectures, and partial-update protocols.  
*   - It can be used to model evolving data fields in large-scale distributed
*     systems without forcing rigid type constraints prematurely.  
*   - It maintains interoperable behavior across multiple parsing, messaging, and
*     persistence layers that depend on accurate representation of undefined.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Optional field omitted)
*   Input: undefined
*   Output: undefined
*
*   // Example 2 (Passing — Optional field provided with a primitive value)
*   Input: 42
*   Output: 42
*
*   // Example 3 (Passing — Optional field provided with a complex value)
*   Input: { a: 1, b: [2, 3], c: () => "x" }
*   Output: { a: 1, b: [2, 3], c: () => "x" }
*
*   // Example 4 (Failing — Impossible under JavaScript semantics)
*   Input: <non-existent non-JavaScript value that cannot be represented>
*   Output: ValidationError("The input could not be validated because it is not a valid JavaScript value and therefore cannot be processed by the schema’s unrestricted acceptance model.")
*   ```
*
* @returns {UnknownOptional} The validated value.
*/
export const unknownOptional = optional(unknown());

/**
* OUTPUT TYPE — UNKNOWN-OPTIONAL
*
* **SUMMARY**  
*   This output type represents the complete set of all possible JavaScript
*   values, including undefined, and is returned exactly as provided by the
*   caller. It guarantees that no structural or semantic constraints have been
*   applied during validation, ensuring fidelity across optional-field workflows.
*   The type models a domain where omission is intentional and semantically
*   distinct from explicit clearing or assignment. Its stability and permissive
*   nature make it suitable across complex enterprise data exchange patterns.
*
* **CONTRACT GUARANTEES**  
*   - The value will always be returned exactly as provided, without mutation,
*     normalization, or transformation of any kind.  
*   - The output may be undefined or any arbitrary JavaScript value, ensuring
*     maximal compatibility with dynamically shaped data.  
*   - No invalid or forbidden states exist for this type, guaranteeing consistent
*     behavior across diverse runtime environments.  
*   - The type enforces no structural invariants, allowing it to remain fully
*     interoperable with flexible, evolving schema definitions.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownOptional =
*       parse(unknownOptional, someValue);
*   ```
*/
export type UnknownOptional = InferOutput<typeof unknownOptional>;

/**
* UNKNOWN-DEFAULT SCHEMA
*
* **SUMMARY**  
*   This schema is designed to validate any incoming value while providing a
*   deterministic fallback mechanism when the value is explicitly undefined. It
*   ensures callers may supply arbitrary data regardless of structure or
*   primitive type without receiving validation failures. Its behavior allows
*   optional fields to seamlessly adopt a default when omitted, supporting
*   flexible configuration and loosely typed interactions across enterprise
*   services. This schema thereby offers a controlled approach to permissive
*   validation while ensuring predictable outcomes for undefined inputs.  
*
* **PURPOSE**  
*   - This schema ensures that optional fields may reliably adopt a predefined
*     default whenever upstream systems omit them, enabling deterministic behavior
*     across multi-layer configuration stacks.  
*   - It allows explicit values of any type to pass through unchanged, ensuring
*     systems that rely on intentional null or custom object payloads do not
*     experience destructive overrides.  
*   - It supports arbitrarily shaped inputs in scenarios involving dynamic API
*     surfaces, plugin ecosystems, or user-provided option bags that defy strict
*     structural typing.  
*   - It guarantees that default-injection logic operates consistently across
*     schema migrations, compatibility layers, and enterprise configuration
*     workflows.  
*
* **INPUT CONTRACT**  
*   - The schema accepts undefined inputs and substitutes the provided default,
*     ensuring deterministic fallback behavior even when upstream callers omit
*     values.  
*   - The schema accepts any non-undefined value including null, objects,
*     functions, arrays, primitives, symbols, or deep nested structures without
*     restriction.  
*   - The schema rejects no input types and performs no coercion, allowing
*     enterprise systems to pass through untyped or partially typed payloads
*     without transformation.  
*   - Inputs containing unexpected shapes or exotic JavaScript constructs such as
*     functions or symbol keys are preserved as-is rather than triggering schema
*     failures.  
*
* **OUTPUT CONTRACT**  
*   - The output will always be either the provided default value or the original
*     input when the caller supplies a defined value.  
*   - All structural characteristics of the provided input remain fully
*     preserved, ensuring downstream consumers can rely on stable and
*     unmodified data.  
*   - No normalization steps, prototype adjustments, deep merges, or structural
*     conversions occur, guaranteeing strict fidelity to the caller’s intent.  
*   - The output always adheres to the invariant that undefined never appears as
*     a final value due to fallback substitution.  
*
* **VALIDATION RULES**  
*   - The schema checks only whether the incoming value is undefined before
*     deciding whether to return the default, ensuring the simplest viable
*     fallback mechanism.  
*   - It does not evaluate type correctness, structural shape, or semantic
*     meaning of provided inputs, enabling unrestricted pass-through behavior.  
*   - It safeguards against accidental omission by replacing undefined values
*     with predictable defaults, reducing system instability from missing fields.  
*   - It maintains validation success across all inputs to prevent unnecessary
*     runtime failures within dynamic or partially typed enterprise workflows.  
*
* **SEMANTIC NOTES**  
*   - This schema distinguishes intentionally null values from missing values,
*     allowing enterprise systems to respect explicit null-setting operations.  
*   - It supports layered configuration models where defaults must propagate only
*     when no value is supplied rather than overriding intentional choices.  
*   - It enhances compatibility across API versions by allowing legacy or
*     experimental fields to pass through without strict typing requirements.  
*   - Its permissive nature supports future schema evolution without breaking
*     existing client payloads or dynamic extension points.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Undefined triggers default)
*   Input: undefined
*   Output: { enabled: true }
*
*   // Example 2 (Passing — Explicit null preserved)
*   Input: null
*   Output: null
*
*   // Example 3 (Passing — Arbitrary complex value preserved)
*   Input: { a: 1, b: [2, 3], c: () => "x" }
*   Output: { a: 1, b: [2, 3], c: () => "x" }
*
*   // Example 4 (Failing — Impossible under schema rules)
*   Input: <no possible JavaScript value can fail validation>
*   Output: <validation cannot fail because the schema accepts all defined values and substitutes defaults only for undefined>
*   ```
*
* @returns {UnknownDefault} The validated value.
*/
export const unknownDefault = <T>(defaultValue: T): ReturnType<typeof optional> => {
    return optional(unknown(), defaultValue as unknown);
};

/**
* OUTPUT TYPE — UNKNOWN-DEFAULT
*
* **SUMMARY**  
*   This output type represents the guaranteed result of validating a value
*   through the `unknownDefault` schema, ensuring that undefined inputs are
*   systematically replaced with a caller-defined fallback. It ensures that all
*   defined inputs pass through unchanged and retain their original identity. It
*   guarantees stability for configuration, API, and preference layers that rely
*   on clear differentiation between omitted and intentionally provided values.
*   It provides an authoritative contract ensuring predictable behavior across
*   enterprise systems dependent on robust fallback logic.  
*
* **CONTRACT GUARANTEES**  
*   - The output will never be undefined because all undefined values are
*     automatically replaced by the provided fallback.  
*   - The output preserves the exact identity and structure of any defined input,
*     ensuring downstream consumers receive an unmodified representation.  
*   - The output type guarantees stability across heterogeneous JavaScript
*     values, including primitives, objects, null, functions, and symbols.  
*   - The resulting value always aligns with the schema’s contractual fallback
*     behavior, ensuring deterministic resolution regardless of upstream input
*     variability.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownDefault =
*       v.parse(unknownDefault({ enabled: true }), undefined);
*   ```
*/
export type UnknownDefault = InferOutput<ReturnType<typeof unknownDefault>>;

/**
* UNKNOWN-FORBIDDEN SCHEMA
*
* **SUMMARY**  
*   This schema validates that the provided value is never equal to the
*   JavaScript `undefined` primitive, thereby enforcing explicit presence across
*   all supported data shapes. It ensures that callers cannot rely on silent
*   absence and instead must provide a concrete value that intentionally
*   represents meaning within the system. The schema accepts all other
*   primitives, objects, arrays, and nested structures without transformation,
*   making it broadly applicable across diverse enterprise workflows. This
*   validation provides predictable behavior in systems that differentiate
*   between empty, nullified, and missing states with high precision.
*
* **PURPOSE**  
*   - This schema ensures that no consumer can omit a field through the implicit
*     behavior of `undefined`, thereby guaranteeing that all data points are
*     intentionally supplied according to contract requirements.  
*   - It provides a reliable mechanism for enforcing that nullability semantics
*     remain explicit, which is essential in backend pipelines, distributed
*     systems, and storage layers that cannot persist `undefined`.  
*   - It prevents accidental omission of values during serialization or
*     deserialization, which is critical for preserving data integrity across
*     service boundaries.  
*   - It supports strong invariants around input completeness, ensuring that
*     downstream validators, normalizers, and business rules always receive a
*     present value.  
*
* **INPUT CONTRACT**  
*   - The schema accepts any JavaScript value so long as the value is not equal
*     to `undefined`, including objects, arrays, null, functions, and advanced
*     structural types.  
*   - The schema rejects any input whose value strictly equals `undefined`,
*     regardless of whether it appears directly or as a property within another
*     structure.  
*   - Inputs that depend on implicit omission or rely on missing fields for
*     meaning will fail validation because they violate explicit presence
*     requirements.  
*   - Inputs containing any other primitive type, including booleans, numbers,
*     strings, symbols, or complex constructs such as maps and sets, are fully
*     permitted.  
*
* **OUTPUT CONTRACT**  
*   - The validated output is always returned exactly as provided, with no
*     transformation, normalization, or structural rewriting applied.  
*   - The output is guaranteed to never be `undefined`, ensuring strict
*     invariants for downstream systems that depend on guaranteed presence.  
*   - All structural and semantic characteristics of the input are preserved,
*     making the schema safe for use as a preliminary guard before deeper
*     parsing.  
*   - Consumers can rely on the output to reflect intentional caller choice,
*     thereby preventing semantic ambiguity around missing versus empty values.  
*
* **VALIDATION RULES**  
*   - The schema checks whether the input strictly equals `undefined` and rejects
*     it because `undefined` violates explicit presence guarantees.  
*   - The schema allows any other input without modification because these forms
*     represent intentional caller-supplied values.  
*   - The validation prevents silent omission, which is necessary for systems
*     where downstream logic depends on knowing whether a value has been
*     explicitly set.  
*   - By prohibiting `undefined`, the schema enforces clarity in nullability
*     semantics and reduces error-prone implicit state conditions.  
*
* **SEMANTIC NOTES**  
*   - This schema provides a deliberate distinction between explicit null values
*     and implicit absence, which is important for API layer correctness and
*     storage-layer predictability.  
*   - Its semantics align with enterprise data modeling patterns that forbid
*     `undefined` due to incompatibility with serialization formats such as JSON.  
*   - The rule supports deterministic input handling, especially in distributed
*     workflows where undefined states introduce risk of divergent behavior.  
*   - It acts as a foundational guard for any higher-order schema that requires
*     presence before applying deeper structural validation.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Explicit null allowed)
*   Input: null
*   Output: null
*
*   // Example 2 (Passing — Primitive value allowed)
*   Input: 123
*   Output: 123
*
*   // Example 3 (Passing — Complex structure allowed)
*   Input: { a: 1, b: [2, 3], c: () => "ok" }
*   Output: { a: 1, b: [2, 3], c: () => "ok" }
*
*   // Example 4 (Failing — Undefined is forbidden)
*   Input: undefined
*   Output: ValidationError("The value must not be undefined, but an undefined value was received, which violates the schema’s explicit presence requirement.")
*   ```
*
* @returns {UnknownForbidden} The validated value.
*/
export const unknownForbidden = custom(
    (value: unknown): boolean => {
        if (value === undefined) {
            return false;
        } else {
            return true;
        }
    },
    ERROR_MESSAGE_KEYS.UNKNOWN_FORBIDDEN
);

/**
* OUTPUT TYPE — UNKNOWN-FORBIDDEN
*
* **SUMMARY**  
*   This output type represents any validated JavaScript value except the
*   `undefined` primitive, ensuring that downstream consumers always receive a
*   present and intentionally supplied structure. The type guarantees that all
*   successful validations correspond to explicit caller intent rather than
*   accidental omission of data. It establishes strong invariants required for
*   enterprise data pipelines that depend on reliable nullability semantics. The
*   output type therefore serves as a stable and predictable building block for
*   layered validation architectures.  
*
* **CONTRACT GUARANTEES**  
*   - The output will never equal `undefined`, ensuring consumers always receive
*     a concrete and intentionally provided value.  
*   - The output preserves its full shape and content without transformation,
*     ensuring structural fidelity across boundary layers.  
*   - The output maintains the exact semantic meaning supplied at input,
*     guaranteeing consistency even inside deeply nested workflows.  
*   - The output excludes all missing-state representations, allowing downstream
*     logic to safely assume the presence of a real value.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownForbidden =
*       parse(unknownForbidden, someInput);
*   ```
*/
export type UnknownForbidden = InferOutput<typeof unknownForbidden>;

/**
* UNKNOWN-NONNULL SCHEMA
*
* **SUMMARY**  
*   This schema validates that the provided value is never null or undefined,
*   ensuring that downstream processes always receive a fully present payload
*   with no absence markers. It imposes a strict non-nullability guarantee that
*   supports robust runtime behavior across distributed and local systems. The
*   schema offers a high-level protection layer preventing void values from
*   propagating into business-critical logic. Its design ensures reliable
*   consumption of the value as a stable, intentional input.
*
* **PURPOSE**  
*   - This schema exists to guarantee that no execution path can accidentally
*     pass null or undefined into a component that requires a concrete and fully
*     materialized value for safe operation.  
*   - It enforces mandatory-presence requirements in enterprise workflows where
*     absence markers can lead to undefined behavior or silent corruption of
*     semantics.  
*   - It supports systems requiring strict data integrity by eliminating void
*     primitives that could disrupt transactional or computational guarantees.  
*   - It serves as a defensive boundary in contexts where callers must uphold
*     presence contracts for configuration inputs, API parameters, runtime
*     selectors, and domain-specific data fields.  
*
* **INPUT CONTRACT**  
*   - The schema accepts any JavaScript value except null or undefined, thereby
*     allowing callers to supply arbitrary primitives, objects, arrays, and
*     domain constructs.  
*   - It rejects null explicitly because null represents an intentional absence
*     that violates presence guarantees required by the validation boundary.  
*   - It rejects undefined because undefined reflects the lack of a supplied
*     value, and this schema requires that all callers provide meaningful input.  
*   - It rejects any input that attempts to coerce nullish semantics into
*     allowed values, ensuring that no implicit void value slips past the
*     validation constraints.  
*
* **OUTPUT CONTRACT**  
*   - The schema returns the validated input exactly as provided, guaranteeing
*     full structural identity with no transformation, cloning, or normalization.  
*   - It ensures that the output is always a fully present, non-nullish value
*     suitable for assignment into strongly typed enterprise data models.  
*   - It guarantees that all output values maintain semantic stability, enabling
*     safe propagation through pipelines, engines, APIs, and storage layers.  
*   - It ensures downstream consumers can rely on strict non-nullability without
*     performing additional presence checks or guard clauses.  
*
* **VALIDATION RULES**  
*   - The schema checks that the value is not null, because null introduces an
*     intentional absence that would break systems expecting concrete values.  
*   - It verifies that the value is not undefined, since undefined represents
*     missing or uninitialized data incompatible with enterprise contracts.  
*   - It ensures that the validation path short-circuits immediately for any
*     nullish input, preventing unintended fallthrough.  
*   - It confirms that all other values pass through unmodified, enforcing a
*     simple yet strict gating rule aligned with enterprise expectations.  
*
* **SEMANTIC NOTES**  
*   - This schema implements a runtime equivalent of TypeScript’s `NonNullable<T>`,
*     ensuring cross-layer consistency between type-level and runtime guarantees.  
*   - It strengthens invariants in API boundaries, configuration systems, and
*     distributed workflows where void inputs can produce cascading failure
*     conditions.  
*   - Its presence requirements allow systems to avoid redundant null checks and
*     thereby maintain clearer and more predictable data flow semantics.  
*   - It supports schema evolution by ensuring that nullish transitional values
*     do not reach downstream data models that are not designed to accept them.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Any non-nullish primitive)
*   Input: 42
*   Output: 42
*
*   // Example 2 (Passing — Complex structure)
*   Input: { a: 1, b: [2, 3], c: { nested: true } }
*   Output: { a: 1, b: [2, 3], c: { nested: true } }
*
*   // Example 3 (Failing — Null is forbidden)
*   Input: null
*   Output: ValidationError("The value must not be null, but a null value was received, which violates the schema’s strict non-nullability requirement.")
*
*   // Example 4 (Failing — Undefined is forbidden)
*   Input: undefined
*   Output: ValidationError("The value must not be undefined, but an undefined value was received, which violates the schema’s strict non-nullability requirement.")
*   ```
*
* @returns {UnknownNonNull} The validated value.
*/
export const unknownNonNull = custom(
    (value: unknown): boolean => {
        if (value === null) {
            return false;
        } else if (value === undefined) {
            return false;
        }

        return true;
    },
    ERROR_MESSAGE_KEYS.UNKNOWN_NONNULL
);

/**
* OUTPUT TYPE — UNKNOWN-NONNULL
*
* **SUMMARY**  
*   This output type represents any value that has successfully passed validation
*   through the `unknownNonNull` schema, guaranteeing the absence of null or
*   undefined. It describes a reliably present runtime value suitable for
*   downstream consumption in strict enterprise workflows. The type ensures that
*   validated data remains stable, predictable, and free of nullish edge cases.
*   Developers may rely on this type to enforce non-nullability across
*   distributed execution paths without additional checks.
*
* **CONTRACT GUARANTEES**  
*   - This type guarantees that no value assigned to it will ever be null,
*     preventing structural or semantic ambiguity in downstream logic.  
*   - It ensures that undefined is impossible, thereby eliminating accidental
*     omission or uninitialized variable hazards.  
*   - It enforces that the output always corresponds exactly to the input value
*     returned by the schema with full identity preserved.  
*   - It guarantees that consumers of this type can treat the value as fully
*     present and semantically meaningful without fallback logic.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownNonNull =
*       parse(unknownNonNull, "hello");
*   ```
*/
export type UnknownNonNull = InferOutput<typeof unknownNonNull>;

/**
* UNKNOWN-COERCE SCHEMA
*
* **SUMMARY**  
*   This schema provides comprehensive validation and controlled coercion for
*   arbitrary unknown input values that must be normalized into a predictable
*   and safely transportable representation across enterprise systems. It
*   ensures that incoming values, regardless of origin or structure, are shaped
*   into a canonical form that avoids ambiguity and maintains deterministic
*   behavior throughout distributed environments. The schema allows flexible
*   ingestion of diverse primitives while preventing unsafe or semantically
*   undefined structures from entering downstream pipelines. By offering strict
*   safeguards around nullability, exotic types, and non-serializable entities,
*   it ensures clarity and stability in both human-entered and machine-generated
*   data flows.
*
* **PURPOSE**  
*   - This schema exists to provide a consistently safe normalization layer that
*     reliably transforms miscellaneous input values into representations that
*     are coherent, predictable, and maintainable within large-scale enterprise
*     workflows.  
*   - This schema ensures that human-entered configuration input is sanitized
*     into a deterministic structure so downstream modules never need to guess
*     about variant or malformed data.  
*   - This schema supports dynamic ingestion paths such as CLI flags, browser
*     form fields, and ad-hoc JSON payloads, enabling systems to gracefully
*     handle unknown or loosely typed external data sources.  
*   - This schema provides transport-friendly values for telemetry and logging
*     pipelines that require safe serialization guarantees across different
*     execution and persistence layers.  
*
* **INPUT CONTRACT**  
*   - The schema accepts any primitive value other than null or undefined,
*     ensuring that only fully defined payloads are introduced into validated
*     system flows.  
*   - The schema accepts objects, arrays, maps, and sets without deep inspection,
*     provided they do not contain exotic root-level types that violate the
*     baseline structural constraints.  
*   - The schema rejects null and undefined values because such values represent
*     absence rather than content, breaking the contract of deterministic output
*     normalization.  
*   - The schema rejects functions, symbols, and DOM elements because these
*     constructs are not serializable, carry execution semantics, or represent
*     unsafe binding to UI contexts that cannot be safely transported or logged.  
*
* **OUTPUT CONTRACT**  
*   - The schema guarantees that all string inputs are trimmed to a canonical
*     representation, ensuring consistent formatting and eliminating
*     human-introduced variance.  
*   - The schema guarantees that bigint values are converted into stable and
*     deterministic string forms suitable for logging, transport, and
*     cross-system persistence.  
*   - The schema guarantees that NaN values are returned as the literal string
*     "NaN", ensuring a uniform representation across platforms that may treat
*     NaN inconsistently.  
*   - The schema guarantees that all other accepted inputs—including objects,
*     arrays, maps, and sets—are returned intact without modification, ensuring
*     that structure is preserved without unintended distortion.  
*
* **VALIDATION RULES**  
*   - The schema explicitly rejects null and undefined inputs to maintain strict
*     enforcement of non-nullable unknowns and avoid ambiguity in downstream
*     consumers.  
*   - The schema rejects functions and symbols to prevent non-serializable or
*     execution-linked constructs from contaminating validated, transport-safe
*     payloads.  
*   - The schema rejects DOM elements because such objects represent unsafe
*     browser-bound structures with environmental bindings that are not suitable
*     for normalizing or serializing.  
*   - The schema applies per-type coercion rules to ensure that each allowable
*     input is transformed to a stable and semantically meaningful canonical
*     output.  
*
* **SEMANTIC NOTES**  
*   - The schema does not recursively process nested structures, leaving deeper
*     validation to specialized schemas that govern specific data models.  
*   - The schema is designed to provide a safe interchange layer for systems
*     that must handle unpredictable external values while maintaining strict
*     stability guarantees.  
*   - The schema mirrors and complements other coercion-centric schemas such as
*     UUID, version, and timezone coercers to ensure uniform behavior across the
*     broader validation ecosystem.  
*   - The schema serves as a foundational building block for ingestion pipelines
*     that require broad input acceptance without compromising safety or
*     deterministic output expectations.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — String trimming)
*   Input: "   hello   "
*   Output: "hello"
*
*   // Example 2 (Passing — BigInt coerced to string)
*   Input: BigInt(42)
*   Output: "42"
*
*   // Example 3 (Passing — NaN coerced to canonical string)
*   Input: NaN
*   Output: "NaN"
*
*   // Example 4 (Passing — Object preserved without modification)
*   Input: { a: 1, b: [2, 3] }
*   Output: { a: 1, b: [2, 3] }
*
*   // Example 5 (Failing — Null forbidden)
*   Input: null
*   Output: ValidationError("The value must not be null, but a null value was received, violating the schema’s requirement for fully defined inputs.")
*
*   // Example 6 (Failing — Undefined forbidden)
*   Input: undefined
*   Output: ValidationError("The value must not be undefined, but an undefined value was received, violating the schema’s requirement for fully defined inputs.")
*
*   // Example 7 (Failing — Function forbidden)
*   Input: () => 123
*   Output: ValidationError("Functions are not allowed because executable constructs cannot be safely normalized or serialized within this schema’s constraints.")
*
*   // Example 8 (Failing — Symbol forbidden)
*   Input: Symbol("x")
*   Output: ValidationError("Symbols are not allowed because they are non-serializable and violate the schema’s transport-safe requirements.")
*   ```
*
* @returns {UnknownCoerce} The validated value.
*/
export const unknownCoerce = coerce(
    unknown({ message: ERROR_MESSAGE_KEYS.UNKNOWN_INPUT_INVALID }),
    (input: unknown): unknown => {
        if (input === null) {
            throw new Error(ERROR_MESSAGE_KEYS.NULL_DISALLOWED);
        } else if (input === undefined) {
            throw new Error(ERROR_MESSAGE_KEYS.UNDEFINED_DISALLOWED);
        } else if (typeof input === "function") {
            throw new Error(ERROR_MESSAGE_KEYS.FUNCTION_DISALLOWED);
        } else if (typeof input === "symbol") {
            throw new Error(ERROR_MESSAGE_KEYS.SYMBOL_DISALLOWED);
        } else if (typeof Element !== "undefined") {
            if (input instanceof Element) {
                throw new Error(ERROR_MESSAGE_KEYS.DOM_ELEMENT_DISALLOWED);
            }
        } else if (typeof input === "bigint") {
            return input.toString();
        } else if (typeof input === "number") {
            if (Number.isNaN(input)) {
                return "NaN";
            }

            return input;
        } else if (typeof input === "string") {
            return input.trim();
        }

        return input;
    }
);

/**
* OUTPUT TYPE — UNKNOWN-COERCE
*
* **SUMMARY**  
*   This output type represents the fully validated and coercively normalized
*   form of an unknown value after successfully passing through the
*   unknown-coercion schema. It describes the exact set of allowed shapes,
*   ensuring that all illegal or unsafe constructs have been filtered out at the
*   boundary. The type guarantees deterministic formatting for strings, bigint
*   values, and NaN while ensuring all other accepted types remain structurally
*   intact. It serves as a reliable contract that any consumer can depend on to
*   receive safe, predictable, and semantically meaningful data.  
*
* **CONTRACT GUARANTEES**  
*   - This type guarantees that null, undefined, functions, symbols, and DOM
*     elements will never appear because they are explicitly rejected during
*     schema validation.  
*   - This type guarantees that bigint values will always appear as their
*     canonical string representation rather than as raw bigint primitives.  
*   - This type guarantees that string outputs will always be trimmed and free
*     from ambiguous surrounding whitespace introduced by human input.  
*   - This type guarantees that NaN is always surfaced as the string "NaN",
*     ensuring stability in logs and transport across heterogeneous systems.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownCoerce =
*       parse(unknownCoerce, " world  ");
*   ```
*/
export type UnknownCoerce = InferOutput<typeof unknownCoerce>;

/**
* UNKNOWN-LOOSE SCHEMA
*
* **SUMMARY**  
*   This schema provides a maximally permissive validation layer designed to
*   accept nearly all input types while still preventing structurally unsafe,
*   non-serializable, or execution-oriented values from being introduced into an
*   enterprise system. It operates as a universal catch-all validator intended
*   for unpredictable ingestion pipelines where strict typing cannot be assumed
*   or enforced reliably. The schema ensures that potentially hazardous value
*   forms such as functions, symbols, and DOM elements are rejected to maintain
*   security and structural stability across distributed workflows. This broad
*   acceptance model allows dynamic data to flow through systems while remaining
*   aligned with safety constraints expected in enterprise-grade architectures.
*
* **PURPOSE**  
*   - This schema exists to provide a safe yet permissive validation mechanism
*     for scenarios where data shape, origin, or structure cannot be guaranteed
*     yet still must be accepted for downstream handling without unnecessary
*     transformation.  
*   - The schema fulfills the operational requirement of acting as a protective
*     boundary in systems where untyped or loosely typed values need to be
*     ingested while still preventing values that could compromise integrity or
*     predictability.  
*   - It supports workflows involving AI generation, plugin ecosystems, dynamic
*     routing metadata, and any context where extensibility necessitates that the
*     validator avoid enforcing strict structural formats.  
*   - The schema provides a consistent contract for permissive ingestion so that
*     systems relying on flexible inputs may still depend on stable, secure
*     validation behavior across all environments.  
*
* **INPUT CONTRACT**  
*   - The schema accepts all primitive types including strings, numbers,
*     booleans, bigints, null, and undefined, ensuring full compatibility with
*     dynamic or loosely structured data pipelines.  
*   - Structured values such as objects, arrays, sets, and maps are accepted
*     without alteration as long as they do not contain inherently unsafe value
*     forms at the top level.  
*   - The schema rejects functions, symbols, DOM elements, and other host
*     objects that cannot be safely serialized or may produce undefined behavior
*     in cross-platform enterprise systems.  
*   - Any value that represents an executable, opaque, or non-inspectable type
*     will be rejected to prevent unsafe behavior or non-deterministic schema
*     violations.  
*
* **OUTPUT CONTRACT**  
*   - The value returned after successful validation is guaranteed to be the
*     exact same reference provided as input with no modification or coercion of
*     any kind.  
*   - The output preserves the full structural and semantic characteristics of
*     the input, ensuring compatibility with systems expecting identity-stable
*     values.  
*   - All primitive, structured, or composite values that pass validation remain
*     unchanged so that system components may rely on predictable and consistent
*     downstream behavior.  
*   - No normalization, canonicalization, or transformation logic is executed,
*     allowing consumers to maintain total control over how the value is
*     interpreted post-validation.  
*
* **VALIDATION RULES**  
*   - Functions are rejected because they represent executable behavior rather
*     than data and therefore violate safety and serialization expectations.  
*   - Symbols are rejected since they cannot be reliably serialized or inspected
*     and therefore cannot fulfill enterprise interoperability requirements.  
*   - DOM elements or host-level constructs are rejected due to their inherent
*     ties to runtime environments, making them unsafe for cross-platform or
*     server-side operations.  
*   - All other values are accepted as long as they do not fall into any of
*     these explicitly forbidden categories, ensuring a broad but safe ingestion
*     model.  
*
* **SEMANTIC NOTES**  
*   - This schema is designed as the broadest safe ingestion layer within the
*     unknown-type validation family, providing maximal flexibility without
*     compromising structural safety.  
*   - It serves as a foundational schema for dynamic ecosystems where extensible
*     plugins, user-generated content, or variable automation processes depend on
*     permissive yet protective validation.  
*   - The schema reinforces predictable integration patterns across distributed
*     systems by ensuring that accepted values maintain their exact original
*     structure and reference identity.  
*   - Its design supports schema evolution and system interoperability by
*     ensuring that only structurally safe values are allowed through while
*     maintaining compatibility with heterogeneous data sources.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Safe primitive)
*   Input: "hello"
*   Output: "hello"
*
*   // Example 2 (Passing — Safe structured value)
*   Input: { a: 1, b: [2, 3] }
*   Output: { a: 1, b: [2, 3] }
*
*   // Example 3 (Passing — Safe composite value)
*   Input: new Map([["x", 1]])
*   Output: new Map([["x", 1]])
*
*   // Example 4 (Failing — Function is forbidden)
*   Input: () => "unsafe"
*   Output: ValidationError("The value must not be a function, but a function was received, violating the schema’s prohibition on executable or unsafe data forms.")
*
*   // Example 5 (Failing — Symbol is forbidden)
*   Input: Symbol("x")
*   Output: ValidationError("The value must not be a symbol, but a symbol was received, violating the schema’s requirement for serializable and structurally safe data forms.")
*   ```
*
* @returns {UnknownLoose} The validated value.
*/
export const unknownLoose = custom(
    (value: unknown): boolean => {
        if (typeof value === "function") {
            return false;
        } else if (typeof value === "symbol") {
            return false;
        } else if (typeof Element !== "undefined") {
            if (value instanceof Element) {
                return false;
            }
        }

        return true;
    },
    ERROR_MESSAGE_KEYS.UNKNOWN_LOOSE_INVALID
);

/**
* OUTPUT TYPE — UNKNOWN-LOOSE
*
* **SUMMARY**  
*   This output type represents a fully permissive yet structurally safe value
*   that has passed through the `unknownLoose` schema without transformation or
*   alteration. The type guarantees that the value retains its exact identity and
*   structure while ensuring that no unsafe constructs such as functions,
*   symbols, or DOM nodes were accepted. It is intended to serve as a stable and
*   predictable representation of dynamic or unpredictable input that still
*   satisfies enterprise safety requirements. Developers may rely on this type as
*   an authoritative foundation for downstream processing in flexible ingestion
*   pipelines.
*
* **CONTRACT GUARANTEES**  
*   - The output type guarantees that the validated value is the exact reference
*     provided as input, ensuring identity stability and avoiding any implicit
*     mutation or coercion.  
*   - The type ensures that no prohibited constructs were accepted, preventing
*     execution-capable, non-serializable, or host-bound values from entering the
*     system.  
*   - The result represents a structurally safe yet flexible value suitable for
*     dynamic routing, storage, or telemetry workflows where strict typing is not
*     feasible.  
*   - The output is guaranteed to be fully interoperable with downstream
*     processes that depend on stable, non-normalized input data, maintaining
*     consistent behavior across all execution environments.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownLoose =
*       v.parse(unknownLoose, someValue);
*   ```
*/
export type UnknownLoose = InferOutput<typeof unknownLoose>;

/**
* UNKNOWN-DEFAULT-NULL SCHEMA
*
* **SUMMARY**  
*   This schema validates values by enforcing a consistent null-defaulting
*   contract that ensures undefined or null inputs are normalized into a stable
*   null output across complex enterprise data flows. It protects downstream
*   systems from ambiguous absence semantics by guaranteeing that null always
*   represents intentional emptiness rather than missing values. It also ensures
*   that any provided non-exotic value passes through unchanged to maintain
*   compatibility with diverse data ingestion pipelines. This design enables
*   deterministic behavior when interacting with distributed APIs, storage
*   engines, or multi-tier normalization processes. The schema’s responsibility
*   is to provide predictable transformations while rejecting structurally
*   invalid or dangerous value types.
*
* **PURPOSE**  
*   - This schema ensures that all undefined or null values are transformed into
*     null in order to uphold strict storage layers that differentiate between
*     null and undefined in transactional or persistence-heavy environments.  
*   - This schema exists to protect enterprise workflows that demand clear and
*     stable placeholder signaling, thereby preventing subtle bugs caused by
*     inconsistent interpretation of absent values.  
*   - This schema guarantees that only safe, non-exotic, serializable values may
*     pass through, ensuring that downstream pipelines never receive functions,
*     symbols, or DOM elements as these would break predictable behavior in
*     distributed systems.  
*   - This schema supports migrations from undefined-based semantics into
*     null-based storage contracts, offering a reliable mechanism for converting
*     legacy data while maintaining backward compatibility.  
*
* **INPUT CONTRACT**  
*   - This schema accepts undefined and null values and interprets them as
*     signals to produce a normalized null output for downstream consumers.  
*   - This schema accepts any non-exotic primitive or object value provided it
*     is not a function, symbol, or DOM element, since such values violate safe
*     data handling expectations.  
*   - This schema rejects functions because executable values cannot be safely
*     serialized, persisted, or transmitted within enterprise network boundaries.  
*   - This schema rejects symbols and DOM elements because they represent
*     non-transferable or environment-tied constructs that break data consistency
*     and serialization guarantees.  
*
* **OUTPUT CONTRACT**  
*   - This schema always returns null when input is undefined or null to enforce
*     strict null-defaulting behavior.  
*   - This schema returns the original value unchanged when the input is a
*     permitted non-exotic value, ensuring maximal transparency and predictability.  
*   - This schema guarantees that output is always safe, serializable, and free
*     from exotic constructs that would violate system-level constraints.  
*   - This schema ensures that no transformations other than null-defaulting are
*     applied, preserving semantic correctness of all valid inputs.  
*
* **VALIDATION RULES**  
*   - The schema checks whether a value is undefined or null and maps it to null
*     to enforce a strict and predictable null-defaulting rule across all
*     validated inputs.  
*   - The schema verifies that a value is not a function to prevent execution
*     logic from entering data-processing pipelines that require immutable and
*     serializable structures.  
*   - The schema ensures that symbols are rejected because they are environment-
*     specific, non-serializable primitives that violate cross-system transport
*     constraints.  
*   - The schema validates that DOM elements are forbidden since they represent
*     environment-bound objects that have no place in safe enterprise data
*     structures.  
*
* **SEMANTIC NOTES**  
*   - The schema ensures consistent null messaging across systems, reducing risk
*     of misinterpretation between absence, emptiness, and failure semantics.  
*   - The schema supports long-term schema evolution by normalizing undefined and
*     null into a single cohesive signaling mechanism for downstream logic.  
*   - The schema provides cross-system guarantees that prevent exotic values from
*     entering API, caching, or persistence boundaries, maintaining structural
*     safety.  
*   - The schema plays a crucial role in ensuring predictable interoperability
*     between heterogeneous services that rely on null as a stable, shared
*     placeholder.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — undefined becomes null)
*   Input: undefined
*   Output: null
*
*   // Example 2 (Passing — null stays normalized as null)
*   Input: null
*   Output: null
*
*   // Example 3 (Passing — allowed non-exotic primitive)
*   Input: 42
*   Output: 42
*
*   // Example 4 (Passing — allowed plain object)
*   Input: { a: 1, b: [2, 3] }
*   Output: { a: 1, b: [2, 3] }
*
*   // Example 5 (Failing — function is forbidden)
*   Input: () => "bad"
*   Output: ValidationError("The provided value is a function, which is forbidden because executable values cannot be safely serialized or transported within enterprise data pipelines.")
*
*   // Example 6 (Failing — symbol is forbidden)
*   Input: Symbol("x")
*   Output: ValidationError("The provided value is a symbol, which is forbidden because symbols are non-serializable and violate cross-system transport guarantees.")
*
*   // Example 7 (Failing — DOM element is forbidden)
*   Input: <div></div>
*   Output: ValidationError("The provided value is a DOM element, which is forbidden because environment-bound objects cannot be validated or preserved safely in enterprise data structures.")
*   ```
*
* @returns {UnknownDefaultNull} The validated value.
*/
export const unknownDefaultNull = custom(
    (value: unknown): boolean => {
        if (value === undefined || value === null) {
            return true;
        } else if (typeof value === "function") {
            return false;
        } else if (typeof value === "symbol") {
            return false;
        } else if (typeof Element !== "undefined") {
            if (value instanceof Element) {
                return false;
            }
        }

        return true;
    },
    ERROR_MESSAGE_KEYS.UNKNOWN_DEFAULT_NULL
).pipe(
    transform((value: unknown): unknown => {
        if (value === undefined || value === null) {
            return null;
        }

        return value;
    })
);

/**
* OUTPUT TYPE — UNKNOWN-DEFAULT-NULL
*
* **SUMMARY**  
*   This output type represents the fully validated and normalized result that
*   ensures undefined and null inputs always become null for consistent signaling
*   across enterprise workflows. The type guarantees that all returned values are
*   safe, non-exotic, and structurally stable for further processing or
*   persistence. It enforces invariants that remove ambiguity between missing and
*   intentionally empty values. This type also preserves original values for all
*   valid non-exotic inputs to maintain semantic transparency. Its guarantees
*   ensure long-term compatibility with distributed, typed, and storage-backed
*   systems.
*
* **CONTRACT GUARANTEES**  
*   - This type guarantees that undefined will never appear in the output,
*     ensuring strict null-defaulting semantics for all downstream consumers.  
*   - This type guarantees that no exotic constructs such as functions, symbols,
*     or DOM elements can appear, preserving serialization and persistence
*     compatibility.  
*   - This type guarantees that non-null, non-undefined, valid values are returned
*     without mutation to maintain semantic alignment with the original input.  
*   - This type guarantees that any output can be safely stored, transmitted, and
*     processed without violating enterprise safety or interoperability rules.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownDefaultNull =
*       v.InferOutput<typeof unknownDefaultNull>;
*   ```
*/
export type UnknownDefaultNull = InferOutput<typeof unknownDefaultNull>;

/**
* UNKNOWN-NONEMPTY SCHEMA
*
* **SUMMARY**  
*   This schema ensures that any provided value is present and contains
*   meaningful, non-empty content while still permitting the full breadth of
*   standard JavaScript primitives and container types that hold substantive
*   information. It carefully avoids deep inspection and instead focuses solely
*   on top-level emptiness checks to guarantee predictable validation behavior
*   within large-scale enterprise data flows. The schema’s role is to prevent
*   silent propagation of void-like, structurally empty, or semantically empty
*   values that could undermine assumptions made by downstream systems. By
*   enforcing this contract, it provides a reliable guardrail that maintains
*   stability, consistency, and strong semantic guarantees across distributed
*   architectures.
*
* **PURPOSE**  
*   - This schema ensures that critical application pathways never receive
*     meaningless values that could corrupt audit logs, configuration layers, or
*     event processors by enforcing a clear distinction between presence and
*     substantive content.  
*   - It supports enterprise workflows where empty objects, arrays, or strings
*     represent invalid or incomplete states and must be rejected prior to
*     business logic execution.  
*   - It upholds data integrity across microservices and edge functions by
*     requiring that any accepted input reflect a deliberate and meaningful value
*     rather than incidental emptiness.  
*   - It aligns with compliance, governance, and long-term maintenance standards
*     by preventing structurally void content from entering validated schemas and
*     thereby reducing ambiguity.  
*
* **INPUT CONTRACT**  
*   - The schema accepts any non-exotic JavaScript value that contains at least
*     one unit of meaningful content such as characters, array elements,
*     key-value pairs, or container entries.  
*   - It rejects null, undefined, empty strings, empty arrays, empty plain
*     objects, empty Sets, and empty Maps because these represent semantically
*     void values that violate the required non-empty contract.  
*   - It rejects functional, symbolic, or DOM-element inputs to avoid allowing
*     exotic runtime constructs that do not conform to the expected structural
*     semantics.  
*   - It enforces strict non-emptiness and disallows coercion or implicit
*     transformations of inputs that could misrepresent the actual content
*     structure.  
*
* **OUTPUT CONTRACT**  
*   - The output is always the original value, preserved without transformation,
*     ensuring stable pass-through semantics for valid inputs in enterprise
*     pipelines.  
*   - The returned value is guaranteed to be structurally non-empty at the
*     top-level, ensuring its safe use by downstream components that depend on
*     established data invariants.  
*   - The output maintains its original JavaScript type and is not normalized,
*     coerced, mutated, or rewrapped in any manner.  
*   - Consumers can rely on the guarantee that no void-like, exotic, or empty
*     structures will emerge from the schema once validation succeeds.  
*
* **VALIDATION RULES**  
*   - The schema checks explicitly for null or undefined values and rejects them
*     because they indicate the absence of data rather than a substantive input.  
*   - It inspects strings, arrays, objects, Sets, and Maps to ensure they contain
*     at least one non-empty element, property, or entry and rejects them
*     otherwise.  
*   - It prohibits functions, symbols, and DOM elements to prevent unsafe or
*     semantically ambiguous constructs from entering validated data pathways.  
*   - It guarantees that every accepted value reflects meaningful top-level
*     content, thereby preventing void-like artifacts from reaching business
*     logic layers.  
*
* **SEMANTIC NOTES**  
*   - This schema treats emptiness strictly at the top-level and does not inspect
*     nested values, ensuring minimal overhead and predictable performance under
*     high throughput.  
*   - It fits into larger validation frameworks that differentiate between null,
*     optional, and non-empty values across distributed systems.  
*   - It ensures that non-empty semantics are consistently enforced even when
*     upstream inputs originate from unreliable external sources.  
*   - Its guarantees support long-term schema evolution by establishing a clear
*     baseline for what constitutes meaningful data across multiple application
*     layers.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Non-empty string)
*   Input: "hello"
*   Output: "hello"
*
*   // Example 2 (Passing — Non-empty array)
*   Input: [1]
*   Output: [1]
*
*   // Example 3 (Passing — Non-empty object)
*   Input: { a: 1 }
*   Output: { a: 1 }
*
*   // Example 4 (Passing — Non-empty Map/Set)
*   Input: new Map([["k", "v"]])
*   Output: new Map([["k", "v"]])
*
*   // Example 5 (Failing — Empty values forbidden)
*   Input: ""
*   Output: ValidationError("The provided value is empty, but a non-empty value was required to satisfy the schema’s top-level non-emptiness contract.")
*
*   // Example 6 (Failing — Nullish values forbidden)
*   Input: null
*   Output: ValidationError("The provided value was null, which violates the schema’s requirement that all values contain meaningful top-level content.")
*   ```
*
* @returns {UnknownNonEmpty} The validated value.
*/
export const unknownNonEmpty = custom(
    (value: unknown): boolean => {
        if (value === null || value === undefined) {
            return false;
        } else if (typeof value === "function") {
            return false;
        } else if (typeof value === "symbol") {
            return false;
        } else if (typeof Element !== "undefined") {
            if (value instanceof Element) {
                return false;
            }
        } else if (value === "") {
            return false;
        } else if (Array.isArray(value) === true) {
            if (value.length === 0) {
                return false;
            }
        } else if (typeof value === "object") {
            if (Array.isArray(value) === false) {
                if ((value instanceof Set) === false) {
                    if ((value instanceof Map) === false) {
                        if (Object.keys(value as Record<string, unknown>).length === 0) {
                            return false;
                        }
                    }
                }
            }
        } else if (value instanceof Set) {
            if (value.size === 0) {
                return false;
            }
        } else if (value instanceof Map) {
            if (value.size === 0) {
                return false;
            }
        }

        return true;
    },
    ERROR_MESSAGE_KEYS.UNKNOWN_NONEMPTY_INVALID
);

/**
* OUTPUT TYPE — UNKNOWN-NONEMPTY
*
* **SUMMARY**  
*   This output type represents any validated non-empty value that has passed the
*   strict structural and semantic requirements defined by the schema. Its
*   primary meaning lies in its guarantee that no void-like or empty constructs
*   can appear once validation succeeds. The type ensures stability across
*   enterprise systems by confirming that accepted values always contain
*   meaningful top-level content. By providing such guarantees, it enables safe
*   consumption by downstream logic that relies on data presence, coherence, and
*   non-emptiness. It thereby establishes a dependable contract that simplifies
*   reasoning across distributed pipelines and strongly typed integrations.
*
* **CONTRACT GUARANTEES**  
*   - The value is guaranteed to be non-null, non-undefined, and structurally
*     non-empty at the top level, ensuring it always contains meaningful data.  
*   - The output will never be a function, symbol, DOM element, empty container,
*     or any other exotic or void-like construct, preserving strict semantic
*     clarity.  
*   - The type ensures that validated values maintain their original JavaScript
*     structure, preventing mutation or coercion during schema evaluation.  
*   - Consumers can rely on its invariants to implement business logic without
*     additional emptiness or type checks, thereby reducing integration risk.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownNonEmpty =
*       v.parse(unknownNonEmpty, "hello");
*   ```
*/
export type UnknownNonEmpty = InferOutput<typeof unknownNonEmpty>;

/**
* UNKNOWN-NEVER SCHEMA
*
* **SUMMARY**  
*   This schema strictly enforces that no input of any shape, type, or structure
*   is ever accepted under any circumstance. It is intentionally designed to act
*   as a runtime prohibition mechanism that mirrors the semantic constraints of
*   the TypeScript `never` type. It ensures that any attempted usage immediately
*   results in a validation failure that halts downstream operations before
*   invalid data propagates. It provides absolute guarantees that no execution
*   path relying on this field can continue, thereby eliminating entire
*   categories of structural and semantic misuse.
*
* **PURPOSE**  
*   - This schema exists to provide a definitive safeguard against deprecated or
*     eliminated fields that must never again surface within any enterprise data
*     pipeline or payload boundary.  
*   - It ensures that validation layers actively prevent unreachable logic paths
*     from being accessed, which reinforces architectural clarity and prevents
*     misuse of hidden or vestigial internal features.  
*   - It functions as a defensive measure within high-assurance environments
*     where forbidden, unsafe, or disallowed values must terminate processing
*     before compromising correctness.  
*   - It provides a stable mechanism for indicating intentionally unimplemented
*     or reserved fields whose future activation must undergo formal schema
*     migration.  
*
* **INPUT CONTRACT**  
*   - The schema accepts no values of any type, including primitives, objects,
*     arrays, null, undefined, or symbolic forms, and any such value will be
*     treated as a contract violation.  
*   - Any presence of the field, even with implicit or coerced types, is rejected
*     because it indicates an invalid structural layout or an unresolved legacy
*     dependency.  
*   - Any attempt to provide a value—whether explicit, defaulted, or auto-filled
*     by a caller—constitutes an immediate failure that halts validation.  
*   - The schema rejects malformed keys, missing keys, additional nested content,
*     or any representation that deviates from the strict expectation of
*     total absence.  
*
* **OUTPUT CONTRACT**  
*   - The schema guarantees that no output is ever produced, because successful
*     validation is structurally impossible by design.  
*   - It asserts that execution will always terminate with a controlled,
*     descriptive validation error that explains the violation precisely.  
*   - It ensures absolute absence of side effects, transformations, or state
*     propagation since the successful branch is never reachable.  
*   - It guarantees that downstream consumers cannot rely on any output value,
*     thereby maintaining strict contract boundaries aligned with the semantics
*     of `never`.  
*
* **VALIDATION RULES**  
*   - The schema always evaluates the provided custom rule to `false`, ensuring
*     deterministic rejection regardless of runtime type or content.  
*   - The validation logic prevents silent coercion, conversion, or normalization
*     by blocking all execution paths that would otherwise influence data state
*     or structure.  
*   - The rule enforces absolute immutability of behavior so no environment,
*     caller, or subtype can alter or override its failure semantics.  
*   - The rule ensures that failures surface immediately with a single unified
*     error trajectory to prevent ambiguous interpretation or recovery.  
*
* **SEMANTIC NOTES**  
*   - This schema signals intentional impossibility and explicitly encodes that a
*     field should never be presented within any operational data model.  
*   - It serves as a durable marker in schema evolution, clarifying which fields
*     remain forbidden regardless of caller behavior or version drift.  
*   - It provides explicit documentation value by reinforcing the architectural
*     guarantee that no input may satisfy this rule set.  
*   - It integrates cleanly with enterprise systems that rely on strict runtime
*     assertions for future-proofed refactoring and compatibility enforcement.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Failing — Any primitive is forbidden)
*   Input: 123
*   Output: ValidationError("A value was provided, but this schema forbids all possible inputs and therefore cannot accept any value under any circumstance.")
*
*   // Example 2 (Failing — Any structured value is forbidden)
*   Input: {}
*   Output: ValidationError("A value was provided, but this schema forbids all possible inputs and therefore cannot accept any value under any circumstance.")
*
*   // Example 3 (Failing — Nullish values are also forbidden)
*   Input: null
*   Output: ValidationError("A value was provided, but this schema forbids all possible inputs and therefore cannot accept any value under any circumstance.")
*
*   // Example 4 (Failing — Undefined is forbidden as well)
*   Input: undefined
*   Output: ValidationError("A value was provided, but this schema forbids all possible inputs and therefore cannot accept any value under any circumstance.")
*   ```
*
* @returns {UnknownNever} The validated value.
*/
export const unknownNever = custom<never>(
    (): boolean => {
        return false;
    },
    ERROR_MESSAGE_KEYS.UNKNOWN_NEVER
);

/**
* OUTPUT TYPE — UNKNOWN-NEVER
*
* **SUMMARY**  
*   This output type represents a value that can never occur because the schema
*   will always fail validation under all circumstances. It encodes a structural
*   impossibility that ensures developers understand that no runtime state can
*   ever satisfy the constraints imposed. It provides explicit guarantees that
*   prevent misuse or accidental reliance on unreachable execution paths. It
*   serves as a definitive marker of forbidden values within enterprise systems.
*
* **CONTRACT GUARANTEES**  
*   - The type can never be instantiated because all input forms are rejected by
*     the schema's validation logic.  
*   - The type forbids any successful parsing or transformation, ensuring that no
*     runtime code can incorrectly infer the presence of this field.  
*   - The type enforces that no downstream consumer can rely on output content,
*     because the success branch is unreachable by design.  
*   - The type ensures long-term safety guarantees in evolving systems by
*     preventing this field from ever entering valid operational data flows.  
*
* **EXAMPLE**  
*   ```
*   const val: UnknownNever =
*       parse(unknownNever, anyValue); // always fails
*   ```
*/
export type UnknownNever = InferOutput<typeof unknownNever>;