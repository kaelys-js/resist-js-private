import { boolean, optional, type InferOutput } from "@/schema";

import { defineErrorMessages } from '@/schemas/error-factory';

export const {
    ERROR_MESSAGE_KEYS,
    ERROR_MESSAGES,
    ErrorMessageKey
} = defineErrorMessages({
    BOOLEAN_STRICT:
        "The value provided must be a primitive boolean, but a non-boolean input was received, which violates the strict requirement that this field accept only true or false without allowing coerced, converted, or structurally invalid representations.",
    BOOLEAN_STRICT_OPTIONAL:
        "The provided value must be either undefined or a strict boolean primitive, but a non-boolean value was received, violating the schema’s requirement for precise, non-coercive truth-state integrity.",
    BOOLEAN_STRICT_NULLABLE:
        "The value provided must be either null or a strict boolean, but a value of a different type was received, which violates the schema’s requirement for precise and unambiguous boolean representation.",
    BOOLEAN_TYPE: "Expected a boolean value but received a non-boolean type, violating the schema’s requirement for explicit type conformity.",
    BOOLEAN_ONLY_TRUE: "Expected the boolean value to be strictly true, but received a value that failed to meet the truth condition, thereby breaching the schema’s strict truth-only contract.",
    BOOLEAN_ONLY_FALSE:
        'The provided boolean must be strictly false, but a non-false value was received, which breaks the schema’s semantic guarantee of an invariant false state.',
    BOOLEAN_COERCE:
        "The input could not be coerced into a boolean because its format or value does not align with recognized truthy or falsy representations, breaking the schema’s coercion contract.",
    BOOLEAN_COERCE_OPTIONAL:
        "The provided value must be undefined or a value that can be safely and deterministically coerced into a boolean, but the received input failed to meet the schema’s structural, contractual, and semantic requirements.",
    NULLABLE_BOOLEAN:
        "Expected a null value or a boolean-coercible input, but received a value that is not permissible because it fails to meet the structural and semantic requirements of a nullable-coercible boolean field.",
    BOOLEAN_DEFAULT_TRUE:
        "The provided value could not be validated or coerced into a boolean because the schema requires a strictly boolean-compatible input, but a value of an incompatible type or structure was received, violating the schema’s contractual constraints.",
    BOOLEAN_DEFAULT_FALSE:
        "The provided value could not be validated or coerced into a boolean because the schema requires a strictly boolean-compatible input, but a value of an incompatible type or structure was received, violating the schema’s contractual, structural, and semantic requirements.",
    NULL: "The provided value must be the literal null, but a non-null value was received, which breaks the schema’s requirement for an intentional null state.",
    UNION: "The provided value must be either true, false, or null, but a value outside this domain was received, which violates the schema’s contractual tri-state constraint.",
    BOOLEAN_UNDEFINEDABLE: "The provided value must be exactly true, false, or undefined, but a value outside this strictly defined tri-state domain was received, violating the schema’s contractual, structural, and semantic requirements."
});

/**
* BOOLEAN-STRICT SCHEMA
*
* **SUMMARY**  
*   This schema ensures that only true boolean primitives are accepted within
*   enterprise-grade data flows by enforcing strict validation rules that reject
*   any loosely typed or coerced representations. It guarantees that no numeric,
*   string, null, undefined, or object-based equivalents can pass through,
*   thereby preserving the integrity of boolean fields across all systems. It
*   ensures consistent semantics for all downstream consumers who rely on stable
*   and predictable boolean behavior. It aligns runtime validation with strict
*   typing expectations to eliminate ambiguity and prevent silent coercion.
*
* **PURPOSE**  
*   - This schema exists to enforce strict boolean validation so that downstream
*     logic never receives ambiguous or coerced values that could cause semantic
*     inconsistencies in enterprise workflows.  
*   - It ensures that only true primitive booleans are permitted, preventing
*     accidental acceptance of loosely typed values such as the strings "true" or
*     "false" that could compromise system correctness.  
*   - It strengthens data contracts by guaranteeing that fields intended to be
*     boolean cannot be substituted with incompatible or misleading values.  
*   - It provides a stable runtime enforcement layer that protects both legacy
*     and modern systems from type drift or mismatched expectations.  
*
* **INPUT CONTRACT**  
*   - The schema accepts only actual boolean primitives and rejects all other
*     data types including numeric values, string representations, arrays,
*     objects, null, undefined, and symbols.  
*   - Any attempt to pass coerced values such as "true", "false", 0, 1, or any
*     other variant will be rejected because doing so would violate the structural
*     requirements of strict boolean semantics.  
*   - Missing values, optional forms, or implicitly undefined fields are rejected
*     because this schema requires explicit boolean representation.  
*   - The schema disallows any wrapped or boxed Boolean objects to prevent
*     inconsistencies across serialization layers.  
*
* **OUTPUT CONTRACT**  
*   - The validated output is always a clean primitive boolean value with no
*     transformations, coercions, or inferred conversions applied.  
*   - The schema guarantees that any output produced will be type-safe and ready
*     for downstream workflows requiring strict boolean conformity.  
*   - The output preserves semantic invariants by maintaining a stable,
*     predictable representation that aligns with TypeScript's primitive boolean
*     type.  
*   - The output provides durability against malformed or incorrect inputs,
*     ensuring that upstream errors cannot propagate.  
*
* **VALIDATION RULES**  
*   - The schema checks that the input is of the primitive boolean type and
*     rejects all other forms to maintain contract integrity.  
*   - It prevents accidental acceptance of coercible values, thereby eliminating
*     bugs caused by weak comparisons or automatic type conversions.  
*   - It ensures that data entering the system conforms exactly to the expected
*     structure, reducing ambiguity and preventing logical branching errors.  
*   - It enforces uniform behavior across environments so that validation results
*     remain stable regardless of runtime context.  
*
* **SEMANTIC NOTES**  
*   - This schema is essential in systems where booleans drive feature flags,
*     security checks, permission states, or configuration switches that cannot
*     tolerate incorrect types.  
*   - It provides reliable type discipline required for complex rule engines and
*     conditional workflows that depend on accurate boolean evaluation.  
*   - It supports long-term schema evolution by guaranteeing consistent behavior
*     across version changes and refactoring efforts.  
*   - It reinforces the architectural principle that primitives must be strictly
*     validated to maintain cross-service stability.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Valid primitive boolean)
*   Input: true
*   Output: true
*
*   // Example 2 (Passing — Valid primitive boolean)
*   Input: false
*   Output: false
*
*   // Example 3 (Failing — Coerced or incorrect primitive)
*   Input: "true"
*   Output: ValidationError("A strict boolean was required, but a non-boolean value was provided, which violates the schema’s enforcement of primitive boolean semantics.")
*
*   // Example 4 (Failing — Non-boolean numeric type)
*   Input: 1
*   Output: ValidationError("A strict boolean was required, but a numeric value was provided, which violates the schema’s enforcement of primitive boolean semantics.")
*   ```
*
* @returns {BooleanStrict} The validated value.
*/
export const booleanStrict = boolean(ERROR_MESSAGE_KEYS.BOOLEAN_STRICT);

/**
* OUTPUT TYPE — BOOLEAN-STRICT
*
* **SUMMARY**  
*   This output type represents a primitive boolean value that has passed strict
*   validation rules ensuring that no coerced, loosely typed, or structurally
*   incompatible value could have been admitted. It reflects a hardened contract
*   that guarantees semantic correctness across downstream systems. It ensures
*   consistency of logical evaluation, eliminating risks associated with weak
*   type coercion. It provides a reliable and predictable value aligned with
*   enterprise data integrity standards.
*
* **CONTRACT GUARANTEES**  
*   - The output will always be a primitive boolean and will never contain boxed
*     Boolean objects or coerced values from non-boolean types.  
*   - The output cannot represent null, undefined, strings, numbers, or any
*     malformed variant because such inputs cannot pass validation.  
*   - The type guarantees that system logic depending on boolean operations will
*     never encounter ambiguity or surprise behavior caused by loose typing.  
*   - The type ensures a consistent and stable representation across all runtime
*     environments and architectural boundaries.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanStrict =
*       parse(booleanStrict, true);
*   ```
*/
export type BooleanStrict = InferOutput<typeof booleanStrict>;

/** BOOLEAN-STRICT-OPTIONAL SCHEMA
*
* **SUMMARY**  
*   This schema validates optional boolean values with strict, non-coercive
*   semantics that ensure predictable behavior across enterprise systems. It
*   guarantees that the value, when present, must adhere to the precise boolean
*   primitive without allowing loose or type-coerced inputs. The schema is
*   designed to enforce strongly defined structural expectations so consumers can
*   rely on consistent truthiness handling. It further ensures that undefined
*   values are safely permitted for scenarios where omission is meaningful within
*   contract-driven workflows.  
*
* **PURPOSE**  
*   - This schema ensures that optional boolean fields never admit coerced values
*     such as strings, numbers, or null, thereby preventing subtle logic faults
*     in enterprise decision branches.  
*   - This schema exists to guarantee strict type integrity for systems that rely
*     on stable boolean semantics across distributed components.  
*   - This schema supports optionality without defaulting or rewriting values so
*     that upstream producers maintain full control over whether a boolean is
*     present.  
*   - This schema enables downstream services to reliably differentiate between
*     intentional absence and explicit true/false declarations within complex
*     validation pipelines.  
*
* **INPUT CONTRACT**  
*   - The schema accepts only `undefined` or strictly typed boolean primitives as
*     valid input values.  
*   - The schema rejects all coerced forms including string-wrapped booleans,
*     numeric surrogates, nulls, arrays, or objects.  
*   - The schema rejects missing keys inside object contexts if the containing
*     schema requires explicit presence of this field.  
*   - The schema rejects incorrectly shaped or malformed values, ensuring each
*     input adheres to the strict enterprise requirements for optional booleans.  
*
* **OUTPUT CONTRACT**  
*   - The schema guarantees that the output will always be either `undefined` or
*     the exact boolean primitive provided as input.  
*   - The schema ensures no normalization or coercion occurs, preserving semantic
*     clarity and preventing silent mutations.  
*   - The schema ensures that downstream consumers can confidently treat the
*     value as stable without re-validating structural correctness.  
*   - The schema ensures that the distinction between omission and explicit
*     boolean assignment is fully preserved through the output lifecycle.  
*
* **VALIDATION RULES**  
*   - The input must be exactly `undefined` or a strict boolean primitive,
*     preventing acceptance of structurally ambiguous values.  
*   - The schema ensures that incorrect types trigger validation failure rather
*     than coercion, maintaining strict logical invariants.  
*   - The schema enforces that null-like values are disallowed to prevent semantic
*     confusion with intentionally omitted fields.  
*   - The schema enforces explicit conformity with enterprise-layer rules around
*     optional control-flow flags.  
*
* **SEMANTIC NOTES**  
*   - Optional booleans validated by this schema play a critical role in
*     controlling feature toggles and conditional execution inside distributed
*     service meshes.  
*   - The schema’s strictness ensures that no ambiguity arises in systems where
*     decision-making pipelines depend heavily on truth-state purity.  
*   - Because undefined is allowed, this schema maps cleanly to storage layers
*     where omission semantics must remain intact across serialization cycles.  
*   - The schema ensures predictable integration with typed APIs that rely on
*     boolean fields to regulate configuration, permissions, or override logic.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Strict boolean true)
*   Input: true
*   Output: true
*
*   // Example 2 (Passing — Strict boolean false)
*   Input: false
*   Output: false
*
*   // Example 3 (Passing — Optional omission via undefined)
*   Input: undefined
*   Output: undefined
*
*   // Example 4 (Failing — Coerced or non-boolean types rejected)
*   Input: "true"
*   Output: ValidationError("A strict boolean or undefined value was expected, but a non-boolean value was received, violating the schema’s strict optional-boolean contract.")
*   ```
*
* @returns {BooleanStrictOptional} The validated value.
*/
export const booleanStrictOptional = optional(boolean(ERROR_MESSAGE_KEYS.BOOLEAN_STRICT_OPTIONAL));

/**
* OUTPUT TYPE — BOOLEAN-STRICT-OPTIONAL
*
* **SUMMARY**  
*   This output type represents a strictly validated optional boolean state that
*   preserves non-coercive semantics across enterprise systems. It guarantees
*   that, after validation, the resulting value will always be either an omitted
*   undefined or an unchanged boolean primitive. The type enforces domain-level
*   invariants needed for high-reliability decision logic. It provides explicit
*   structural clarity for downstream integrations that depend on consistent
*   truth-state handling.  
*
* **CONTRACT GUARANTEES**  
*   - The output value will always be either undefined or a strictly typed
*     boolean, never a coerced or mutated form.  
*   - The type ensures no additional transformations or normalizations are
*     applied, preserving the authorial intent of upstream callers.  
*   - The type guarantees that downstream services can rely on the absence or
*     presence of the field as a meaningful semantic distinction.  
*   - The type forbids any ambiguous states such as null or loosely evaluated
*     truthiness primitives, ensuring complete safety within logic flows.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanStrictOptional =
*       parse(booleanStrictOptional, true);
*   ```
*/
export type BooleanStrictOptional = InferOutput<typeof booleanStrictOptional>;

/**
* BOOLEAN-STRICT-NULLABLE SCHEMA
*
* **SUMMARY**  
*   This schema validates a value intended to represent a nullable strict
*   boolean, ensuring that only `null` or an actual boolean primitive is
*   permitted without any coercion or implicit transformation. It is designed to
*   guarantee that downstream systems receive predictable and stable boolean
*   semantics without the risk of loosely typed values degrading workflow
*   correctness. The schema provides a hardened contract that prevents accidental
*   acceptance of ambiguous truthy or falsy values frequently encountered in
*   loosely typed pipelines. This high-level validation intent ensures that all
*   dependent services operate on reliable input while maintaining strict
*   enterprise-grade assurances.  
*
* **PURPOSE**  
*   - This schema ensures that any value representing an optional boolean is
*     always either `null` or a strict boolean, thereby preventing ambiguous or
*     coerced values from degrading business logic.  
*   - This schema exists to protect services from downstream misinterpretations
*     that occur when boolean-like values such as numbers, strings, or objects
*     are inadvertently passed through.  
*   - This schema enforces strict conditions so that enterprise workflows that
*     rely on deterministic state evaluation can operate safely without type
*     uncertainty.  
*   - This schema provides a clear contract for system integrators who require a
*     defensible and well-defined optional boolean field across distributed
*     services.  
*
* **INPUT CONTRACT**  
*   - The schema accepts only two forms of input: `null` or a strict boolean
*     value, and rejects anything that fails to conform precisely to these
*     constraints.  
*   - The schema rejects implicitly coerced inputs such as strings, numeric
*     values, arrays, objects, or any loosely typed values that resemble booleans
*     but do not satisfy strict type requirements.  
*   - The schema rejects missing keys, undefined values, and structurally
*     malformed inputs to prevent silent acceptance of ambiguous data.  
*   - The schema explicitly blocks edge-case representations of booleans such as
*     `"true"`, `"false"`, `1`, `0`, or other coerced values that violate the
*     expected enterprise-level strictness.  
*
* **OUTPUT CONTRACT**  
*   - The schema guarantees that all successful outputs are either `null` or a
*     strict boolean primitive without any implicit transformations applied.  
*   - The schema ensures that validated values remain stable for downstream
*     systems and will never contain coerced or ambiguous representations.  
*   - The schema guarantees that any consumer of the output can rely on the
*     boolean semantics without performing additional guards or runtime checks.  
*   - The schema ensures that all propagated values maintain full structural and
*     semantic integrity expected of strongly typed enterprise systems.  
*
* **VALIDATION RULES**  
*   - The schema checks whether the input is explicitly `null` and treats it as a
*     valid and intentional nullable state.  
*   - The schema checks that non-null values are strict boolean primitives with
*     no allowance for coercion or disguised boolean-like inputs.  
*   - The schema prevents invalid states from entering core business logic by
*     rejecting mixed-type, partial, or malformed input representations.  
*   - The schema enforces strict compliance to prevent the subtle runtime defects
*     that often arise from improperly validated boolean inputs.  
*
* **SEMANTIC NOTES**  
*   - This field is typically used in enterprise systems where tri-state logic is
*     required but where ambiguity must be avoided, enabling robust decision
*     trees.  
*   - This schema supports data models in distributed services where the absence
*     of a boolean value must be intentional and explicitly represented as
*     `null`.  
*   - This schema ensures that configuration values, flags, or state indicators
*     retain predictable behavior even when optional.  
*   - This schema supports storage and transmission layers that need strict
*     guarantees regarding the boolean integrity of serialized data.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Strict boolean true)
*   Input: true
*   Output: true
*
*   // Example 2 (Passing — Strict boolean false)
*   Input: false
*   Output: false
*
*   // Example 3 (Passing — Nullable state allowed)
*   Input: null
*   Output: null
*
*   // Example 4 (Failing — Undefined not allowed)
*   Input: undefined
*   Output: ValidationError("A strict boolean or null value was expected, but undefined was received, violating the schema’s strict nullable-boolean contract.")
*
*   // Example 5 (Failing — Coerced or invalid types)
*   Input: "true"
*   Output: ValidationError("A strict boolean or null value was expected, but a non-boolean value was received, violating the schema’s strict nullable-boolean contract.")
*   ```
*
* @returns {BooleanStrictNullable} The validated value.
*/
export const booleanStrictNullable = nullable(booleanStrict, ERROR_MESSAGE_KEYS.BOOLEAN_STRICT_NULLABLE);

/**
* OUTPUT TYPE — BOOLEAN0STRICT-NULLABLE
*
* **SUMMARY**  
*   This output type represents a strict union of either `null` or a boolean
*   primitive as validated through the `booleanStrictNullable` schema. It
*   guarantees that downstream systems will never receive coerced, loosely typed,
*   or ambiguous representations of boolean-like values. The type ensures that
*   consumers operate with deterministic logic, reflecting the strict validation
*   rules embedded into the schema. This documented type serves as the
*   authoritative contract for developers who need to rely on consistent,
*   enterprise-grade state representation.  
*
* **CONTRACT GUARANTEES**  
*   - The output will always be either `null` or a strict boolean primitive,
*     without exception or coercion.  
*   - The output type prohibits ambiguous representations such as numeric,
*     string-based, or mixed-type values to uphold deterministic logic.  
*   - The type ensures that no consumer of the validated output will be required
*     to perform defensive checks beyond handling the nullable state.  
*   - The output type maintains structural and semantic stability across all
*     layers of the system, ensuring predictable long-term behavior.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanStrictNullable =
*       parse(booleanStrictNullable, true);
*   ```
*/
export type BooleanStrictNullable = InferOutput<typeof booleanStrictNullable>;

/**
* BOOLEAN-TRUE SCHEMA
*
* **SUMMARY**  
*   This schema ensures that a given value is a boolean explicitly set to true,  
*   validating both its type and its exact truthy state. It enforces a strict  
*   equality check that prevents any falsy or coerced forms from being accepted.  
*   The schema provides a clear contract to distinguish actual boolean truth from  
*   other JavaScript truthy values that may cause logic ambiguity. It establishes  
*   a robust validation layer for enforcing strict runtime and compile-time  
*   correctness when dealing with true-only flags across enterprise systems.  
*
* **PURPOSE**  
*   - This schema exists to guarantee that configuration flags, toggles, or  
*     assertions relying on a true state cannot be misrepresented by falsy or  
*     coerced truthy equivalents.  
*   - It ensures downstream processes that depend on a guaranteed true condition  
*     receive consistent and unambiguous boolean input.  
*   - It fulfills compliance and data integrity requirements where only a  
*     confirmed true boolean indicates operational authorization or readiness.  
*   - It prevents runtime defects and semantic misinterpretations by rejecting  
*     non-boolean or false values that would otherwise corrupt control flow.  
*
* **INPUT CONTRACT**  
*   - The schema accepts only primitive boolean values as input.  
*   - Any non-boolean inputs, such as strings ("true"), numbers (1), or objects,  
*     are strictly rejected.  
*   - Missing, undefined, or null values are invalid and produce explicit errors.  
*   - Inputs of boolean type but with the value `false` are explicitly disallowed  
*     as they violate the strict truth requirement.  
*
* **OUTPUT CONTRACT**  
*   - The output is guaranteed to be the boolean literal `true`.  
*   - No coercion, normalization, or transformation occurs; the input must  
*     inherently satisfy the truth condition.  
*   - The resulting output maintains exact type fidelity with TypeScript boolean  
*     true, ensuring full static inference.  
*   - The validated value can be confidently passed through downstream systems  
*     that require verified truth states without revalidation.  
*
* **VALIDATION RULES**  
*   - The input must be of type boolean; otherwise, validation fails immediately.  
*   - The input must strictly equal true, not a truthy equivalent.  
*   - Any falsy boolean or non-boolean triggers a validation error with precise  
*     error messaging.  
*   - The schema enforces immutability of meaning—no post-validation changes or  
*     re-coercions are performed on the returned value.  
*
* **SEMANTIC NOTES**  
*   - This schema is ideal for flags that denote confirmed activation, agreement,  
*     or authorization events within enterprise workflows.  
*   - It can be used to ensure deterministic operational toggles in distributed  
*     systems where false positives must be completely eliminated.  
*   - In persistence or messaging layers, it enforces structural guarantees that  
*     prevent semantic drift from occurring across services.  
*   - The schema should be used in contexts where compliance auditing requires  
*     absolute certainty that a given flag is truly asserted.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Strict true accepted)
*   Input: true
*   Output: true
*
*   // Example 2 (Failing — False explicitly rejected)
*   Input: false
*   Output: ValidationError("The value must be the boolean literal true, but false was received, violating the schema’s strict truth requirement.")
*
*   // Example 3 (Failing — Non-boolean rejected)
*   Input: "true"
*   Output: ValidationError("A strict boolean true value was expected, but a non-boolean input was received, violating the schema’s type and truth constraints.")
*   ```
*
* @returns {BooleanTrue} The validated value.
*/
export const booleanTrue = boolean(ERROR_MESSAGE_KEYS.BOOLEAN_TYPE).pipe(
    check((x: boolean): boolean => {
        return x === true;
    }, ERROR_MESSAGE_KEYS.BOOLEAN_ONLY_TRUE)
);

/**
* OUTPUT TYPE — BOOLEAN-TRUE
*
* **SUMMARY**  
*   This output type represents a strictly validated boolean literal value of  
*   true. It provides compile-time and runtime assurance that any instance  
*   conforms precisely to this constraint, eliminating ambiguity from coercion  
*   or falsy evaluations. The type embodies an immutable truth state that cannot  
*   be altered or misinterpreted by downstream systems. It forms a foundational  
*   building block for expressing guaranteed affirmative conditions in strongly  
*   typed enterprise environments.  
*
* **CONTRACT GUARANTEES**  
*   - The output value will always and only ever equal true.  
*   - No coercion or transformation logic can alter the true literal once  
*     validated.  
*   - The type is safe for reuse across systems where strict truth enforcement is  
*     required for control flow correctness.  
*   - Consumers of this type can rely on absolute invariance: its runtime and  
*     compile-time representations are identical.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanTrue =
*       parse(booleanTrue, true);
*   ```
*/
export type BooleanTrue = InferOutput<typeof booleanTrue>;

/**
* BOOLEAN-FALSE SCHEMA
*
* **SUMMARY**  
*   This schema validates that the provided input is a boolean value with strict
*   enforcement that it must be the literal `false` and nothing else. It ensures
*   that consumers relying on this field can depend on a consistent and stable
*   representation of a false-only boolean. This validation is designed to
*   support enterprise systems where boolean states are contractually required to
*   remain unambiguous. It guarantees that downstream logic will never receive a
*   coerced, nullable, or improperly typed truthy value.
*
* **PURPOSE**  
*   - This schema exists to guarantee that a field intended to represent a fixed
*     false boolean cannot be altered, coerced, or substituted with any other
*     primitive or semantic equivalent.  
*   - This schema enforces strong data correctness in workflows where a false
*     state denotes a specific operational condition that must remain immutable
*     throughout the system.  
*   - This schema ensures that upstream systems cannot accidentally pass values
*     that default to false-like semantics such as null, undefined, or zero,
*     thereby preventing subtle logical corruption.  
*   - This schema supports long-term schema stability by creating a strict
*     contract that preserves meaning across releases, storage layers, and data
*     migrations.  
*
* **INPUT CONTRACT**  
*   - The input must be a boolean primitive and will be rejected if it is any
*     other primitive type, including number, string, bigint, symbol, or object.  
*   - The input will be rejected if it is `true`, because a truthy value violates
*     the schema’s contractual requirement for a guaranteed false-only field.  
*   - The input will be rejected if it is null, undefined, or omitted entirely,
*     because missing or empty values break the schema’s structural invariants.  
*   - The input cannot be accepted if it comes through as a coerced or loosely
*     typed representation, as enterprise systems require strict type integrity
*     for this value.  
*
* **OUTPUT CONTRACT**  
*   - The output will always be the literal boolean `false`, ensuring stable and
*     immutable semantics for downstream consumers.  
*   - The output guarantees that no normalization, transformation, or coercion is
*     needed because the only successful value is an exact false.  
*   - The output ensures that any system reading this field receives a strictly
*     typed boolean with no risk of unexpected truthy interpretations.  
*   - The output forms a reliable invariant within composite schemas or domain
*     models that require exact logical states.  
*
* **VALIDATION RULES**  
*   - The schema first validates that the input is a boolean, preventing any
*     attempt to pass non-boolean types that would compromise contract integrity.  
*   - The schema validates that the boolean must be exactly `false`, ensuring it
*     cannot accidentally pass a truthy or incorrectly toggled state.  
*   - The schema enforces that no coercion or implicit conversions are allowed,
*     thereby protecting the structural correctness of the data.  
*   - The schema rejects any unexpected or malformed value to maintain strict
*     compliance with enterprise-level accuracy requirements.  
*
* **SEMANTIC NOTES**  
*   - This field represents a domain-specific false state that must remain stable
*     as data traverses pipelines or inter-service boundaries.  
*   - This field’s false-only constraint supports systems where toggling or
*     mutating this value could introduce semantic errors or break workflow
*     guarantees.  
*   - The strict false value may function as a feature flag, safeguard indicator,
*     or protocol handshake element requiring non-negotiable behavior.  
*   - This schema strengthens long-term data integrity by ensuring that no future
*     schema evolution introduces ambiguity into the meaning of this field.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Strict false accepted)
*   Input: false
*   Output: false
*
*   // Example 2 (Failing — true rejected)
*   Input: true
*   Output: ValidationError("The value must be the boolean literal false, but true was received, violating the schema’s strict false-only contract.")
*
*   // Example 3 (Failing — Non-boolean rejected)
*   Input: "false"
*   Output: ValidationError("A strict boolean false value was expected, but a non-boolean input was received, violating the schema’s strict type requirements.")
*   ```
*
* @returns {BooleanFalse} The validated value.
*/
export const booleanFalse =
    v.boolean(ERROR_MESSAGE_KEYS.BOOLEAN_TYPE).pipe(
        v.check((value: boolean): boolean => { return value === false; }, ERROR_MESSAGE_KEYS.BOOLEAN_ONLY_FALSE)
    );

/**
* OUTPUT TYPE — BOOLEAN-FALSE
*
* **SUMMARY**  
*   This output type represents a strictly validated boolean that is guaranteed to
*   be the literal `false` after all schema rules have been applied. It conveys a
*   stable and immutable semantic meaning that downstream systems can trust
*   without needing to perform additional checks. It ensures that all consuming
*   logic may rely on the invariant that no truthy or ambiguous boolean values
*   will ever appear. It serves as a contractually enforced representation of a
*   domain-specific false state.
*
* **CONTRACT GUARANTEES**  
*   - The output type guarantees that the value is always `false` and can never
*     take any alternate boolean form.  
*   - The output type forbids null, undefined, or coerced values, ensuring strict
*     type integrity.  
*   - The output type guarantees that the field is semantically stable, meaning it
*     cannot be mutated into another state without violating the schema.  
*   - The output type represents a safe and invariant value suitable for use in
*     enterprise workflows requiring deterministic logic.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanFalse =
*       parse(booleanFalse, false);
*   ```
*/
export type BooleanFalse = InferOutput<typeof booleanFalse>;

/**
* BOOLEAN-COERCE SCHEMA
*
* **SUMMARY**  
*   The BOOLEAN-COERCE schema validates and normalizes diverse input formats into
*   a standardized boolean value. It provides a strict coercion mechanism that
*   ensures inputs representing truthy or falsy states are accurately interpreted
*   and transformed. The schema accounts for varied primitive types and string
*   patterns that users or systems might provide. It offers predictable boolean
*   outcomes while ensuring invalid inputs are rejected with explicit errors. The
*   intent is to establish a consistent boolean interpretation model across
*   enterprise workflows.
*
* **PURPOSE**  
*   - This schema exists to provide a unified, deterministic rule set for
*     coercing potentially ambiguous boolean representations into explicit
*     `true` or `false` values.  
*   - It ensures that integrations or client inputs using numeric or string-based
*     boolean equivalents are normalized consistently throughout the system.  
*   - The schema enforces a strict interpretation boundary that prevents undefined
*     or unexpected values from being silently converted.  
*   - It guarantees downstream processes receive structurally valid boolean
*     primitives, improving data quality and audit consistency across services.  
*
* **INPUT CONTRACT**  
*   - The schema accepts primitive booleans, returning them unchanged.  
*   - It accepts numeric values of `1` or `0` and coerces them to `true` or
*     `false`, respectively.  
*   - It accepts strings in any case variation of `"true"`, `"false"`, `"1"`,
*     `"0"`, `"yes"`, `"no"`, `"y"`, or `"n"`, converting them appropriately.  
*   - It rejects all other primitives, objects, arrays, null, undefined, and
*     malformed string patterns, ensuring contract clarity and input hygiene.  
*
* **OUTPUT CONTRACT**  
*   - The schema always outputs a strictly typed boolean (`true` or `false`).  
*   - The output is guaranteed to be free of side effects or additional metadata
*     wrappers.  
*   - The result can safely be serialized, logged, or stored without loss of
*     semantic intent.  
*   - Consumers of the schema may rely on the boolean value as a validated
*     indicator of logical state within cross-service protocols.  
*
* **VALIDATION RULES**  
*   - If the input is already a boolean, it passes through validation without
*     modification.  
*   - If the input is a number, it must strictly equal `1` or `0`; any other
*     number triggers a validation error.  
*   - If the input is a string, it must match one of the recognized canonical
*     truthy or falsy patterns after trimming and lowercasing.  
*   - Any input outside of these constraints triggers a descriptive enterprise
*     error detailing the precise violation reason.  
*
* **SEMANTIC NOTES**  
*   - This schema provides a universal boolean normalization standard suitable for
*     API gateways, ETL pipelines, and validation middleware.  
*   - It ensures that boolean semantics remain consistent across distributed
*     environments regardless of client language or format.  
*   - The coercion rules have been deliberately minimized to preserve semantic
*     intent and prevent accidental conversions.  
*   - It plays a foundational role in enterprise schemas that depend on strict
*     truth-state interpretation for business logic enforcement.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — String truthy form)
*   Input: "yes"
*   Output: true
*
*   // Example 2 (Passing — Numeric falsy form)
*   Input: 0
*   Output: false
*
*   // Example 3 (Passing — Native boolean preserved)
*   Input: false
*   Output: false
*
*   // Example 4 (Failing — Unsupported pattern)
*   Input: "maybe"
*   Output: ValidationError("A recognized boolean representation was expected, but an unsupported string pattern was received, violating the schema’s strict coercion rules.")
*   ```
*
* @returns {BooleanCoerce} The validated value.
*/
export const booleanCoerce = v.coerce(
    v.boolean(ERROR_MESSAGE_KEYS.BOOLEAN_TYPE),
    (input: unknown): boolean => {
        if (typeof input === "boolean") {
            return input;
        }

        if (typeof input === "number") {
            if (input === 1) {
                return true;
            }
            if (input === 0) {
                return false;
            }
        }

        if (typeof input === "string") {
            const normalized: string = input.trim().toLowerCase();
            const truthyValues: readonly string[] = ["true", "1", "yes", "y"];
            const falsyValues: readonly string[] = ["false", "0", "no", "n"];

            if (truthyValues.includes(normalized)) {
                return true;
            }
            if (falsyValues.includes(normalized)) {
                return false;
            }
        }

        throw new Error(ERROR_MESSAGE_KEYS.BOOLEAN_COERCE);
    }
);

/**
* OUTPUT TYPE — BOOLEAN-COERCE
*
* **SUMMARY**  
*   The BooleanCoerce defines the validated output representation of the
*   BOOLEAN_COERCE schema, guaranteeing a consistent boolean primitive across all
*   contexts. It provides strict assurance that any data passing schema
*   validation adheres to binary logical semantics. The type eliminates ambiguity
*   in truth evaluation by formalizing what constitutes valid boolean states. It
*   ensures seamless interoperability and stable integration across complex
*   enterprise systems.
*
* **CONTRACT GUARANTEES**  
*   - The type is always a native JavaScript boolean with no alternative form or
*     wrapper object.  
*   - It guarantees immutability of logical meaning across all serialization and
*     transmission layers.  
*   - It forbids undefined, null, numeric, or string substitutes from representing
*     truth or falsity.  
*   - It ensures system-wide interoperability where boolean precision directly
*     affects control flow or data processing contracts.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanCoerce =
*       parse(booleanCoerce, "yes");
*   ```
*/
export type BooleanCoerce = InferOutput<typeof booleanCoerce>;

/**
* BOOLEAN-COERCE-OPTIONAL SCHEMA
*
* **SUMMARY**  
*   This schema validates an optional boolean input that may be undefined or any
*   value coercible into a boolean while ensuring a predictable output contract
*   for downstream systems. It provides strict normalization logic that enables
*   robust interoperability across distributed services requiring stable boolean
*   semantics. The schema operates as a protective boundary to prevent malformed
*   or semantically ambiguous values from infiltrating enterprise workflows. It
*   ensures boolean intent is preserved even when upstream producers emit loosely
*   typed or inconsistent data representations.
*
* **PURPOSE**  
*   - This schema exists to guarantee that any consumer expecting an optional
*     boolean receives a normalized and contractually correct value regardless of
*     the variability of upstream producers.  
*   - This schema ensures enterprise services can rely on consistent boolean
*     semantics even when source systems transmit flexible or user-generated
*     inputs.  
*   - This schema protects downstream logic by preventing the propagation of
*     malformed primitives that may appear boolean-like but do not conform to the
*     required coercible patterns.  
*   - This schema enforces a standardized interpretation of optional boolean
*     fields, thereby reducing ambiguity across microservices and long-lived
*     workflows.  
*
* **INPUT CONTRACT**  
*   - Inputs may be undefined, and such values are accepted as part of the
*     optionality contract expected by downstream systems.  
*   - Inputs that are defined must be coercible to a boolean, including strings
*     that match truthy or falsy patterns or numbers within the accepted Boolean
*     constructor semantics.  
*   - Inputs that cannot be interpreted as valid boolean candidates, including
*     objects, arrays, functions, or structurally incompatible primitives, must
*     be rejected.  
*   - Inputs missing expected coercible characteristics or containing unexpected
*     structural shapes are explicitly disallowed to prevent contractual drift.  
*
* **OUTPUT CONTRACT**  
*   - Successful validation guarantees the output will always be either a boolean
*     or undefined, ensuring strict compliance with the optional semantics.  
*   - All boolean outputs are normalized according to the Boolean constructor’s
*     coercion logic, yielding stable and predictable values.  
*   - The output will never contain malformed, ambiguous, or partially coerced
*     boolean-like structures, preserving downstream data integrity.  
*   - The schema ensures that undefined remains untouched and is never coerced,
*     thereby maintaining semantic clarity for optional fields.  
*
* **VALIDATION RULES**  
*   - The schema requires that any defined value must pass through the Boolean
*     constructor without error, ensuring full coercibility.  
*   - The schema checks that undefined inputs bypass coercion while all other
*     values undergo strict normalization.  
*   - Any value failing coercion or representing an unsupported primitive or
*     structural form is rejected to maintain strong type guarantees.  
*   - The schema enforces strict boundaries preventing ambiguous or lossy boolean
*     interpretations from propagating into validated output.  
*
* **SEMANTIC NOTES**  
*   - Optional boolean fields are frequently used in enterprise configuration
*     layers, and this schema ensures reliable handling of user-provided inputs.  
*   - The schema supports cross-language and cross-protocol data ingestion by
*     enforcing a universal boolean interpretation rule set.  
*   - The normalized output facilitates durable storage and indexing properties
*     in systems that require deterministic boolean values.  
*   - The schema’s optionality semantics align with typical API evolution
*     patterns, ensuring future compatibility with additional optional states.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Coercible string)
*   Input: "true"
*   Output: true
*
*   // Example 2 (Passing — Optional undefined accepted)
*   Input: undefined
*   Output: undefined
*
*   // Example 3 (Passing — Coercible number)
*   Input: 0
*   Output: false
*
*   // Example 4 (Failing — Non-coercible type)
*   Input: { enabled: "yes" }
*   Output: ValidationError("A value that is either undefined or coercible to a boolean was expected, but a non-coercible input was received, violating the schema’s strict optional-boolean coercion contract.")
*   ```
*
* @returns {BooleanCoerceOptional} The validated value.
*/
export const booleanCoerceOptional = v.optional(
    v.coerce(v.boolean(ERROR_MESSAGE_KEYS.BOOLEAN_COERCE_OPTIONAL), (value: unknown): boolean => {
        if (value) {
            return Boolean(value);
        } else {
            return Boolean(value);
        }
    })
);

/**
* OUTPUT TYPE — BOOLEAN-COERCE-OPTIONAL
*
* **SUMMARY**  
*   This output type represents a normalized optional boolean that has passed all
*   schema validation rules ensuring structural and semantic consistency. It
*   guarantees that consumers receive either a boolean or undefined, eliminating
*   ambiguity and preventing unexpected runtime states. The type ensures
*   predictable downstream processing, particularly in systems that depend on
*   deterministic branching logic. Its invariants provide confidence that values
*   have been properly vetted before entering any critical enterprise workflow.
*
* **CONTRACT GUARANTEES**  
*   - The output will always be either a strictly typed boolean or undefined,
*     removing any possibility of malformed or partially coerced values.  
*   - The output cannot contain objects, arrays, functions, or any primitive that
*     does not meet the boolean or undefined criteria.  
*   - The value is guaranteed to have undergone normalization, ensuring that all
*     boolean representations follow consistent coercion rules.  
*   - The type disallows any unvetted or structurally ambiguous value from being
*     treated as a boolean, reinforcing enterprise data correctness.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanCoerceOptional =
*       parse(booleanCoerceOptional, "false");
*   ```
*/
export type BooleanCoerceOptional = InferOutput<typeof booleanCoerceOptional>;

/**
* BOOLEAN-COERCE-NULLABLE SCHEMA
*
* **SUMMARY**  
*   This schema validates inputs intended to represent a nullable boolean value
*   that may arrive in various primitive forms requiring coercion. It ensures
*   that any defined value is normalized through the boolean coercion mechanism
*   while still permitting an explicit null to pass through unchanged. The schema
*   plays a critical role in maintaining consistent boolean semantics across
*   systems where nullable states hold operational significance. This ensures
*   predictable behavior in enterprise workflows that depend on strict typing and
*   reliable coercion rules.
*
* **PURPOSE**  
*   - This schema exists to enforce a consistent approach to boolean coercion
*     while still accommodating nullable inputs that are semantically meaningful
*     in enterprise systems.  
*   - It ensures that any defined value is converted into a coherent boolean form
*     that downstream services can process without ambiguity or unexpected
*     structural variance.  
*   - It satisfies business requirements where the distinction between null and a
*     coerced boolean value carries explicit workflow implications.  
*   - It protects systems from receiving incorrectly structured or semantically
*     ambiguous boolean-like inputs that could compromise operational integrity.  
*
* **INPUT CONTRACT**  
*   - The schema accepts null as a valid input when representing intentionally
*     undefined or absent boolean state.  
*   - The schema accepts any value supported by the core boolean coercion rules,
*     including strings, numbers, or boolean primitives, while rejecting all
*     unsupported types that are not coercible.  
*   - The schema rejects objects, arrays, functions, and all non-primitive forms
*     that cannot be meaningfully coerced into a boolean.  
*   - The schema rejects missing input, undefined values, or structurally invalid
*     forms that violate the expected nullable-or-coercible pattern.  
*
* **OUTPUT CONTRACT**  
*   - The output always returns either a strictly formed boolean primitive or a
*     null value, ensuring fully predictable type behavior.  
*   - All boolean-like inputs are normalized into a canonical boolean form,
*     guaranteeing consistency across all consumer systems.  
*   - Null is preserved without transformation, ensuring correct propagation of
*     intentional absence semantics.  
*   - The resulting output maintains full structural stability and guarantees no
*     hidden coercions or side effects beyond the explicitly defined rules.  
*
* **VALIDATION RULES**  
*   - The schema verifies whether the input is null and, if so, immediately
*     accepts it as a valid nullable value.  
*   - If the input is non-null, the schema enforces validation through the core
*     boolean coercion process to ensure strict semantic correctness.  
*   - Any input failing coercion requirements is rejected with a detailed,
*     enterprise-grade error message explaining the mismatch.  
*   - All validation steps ensure that the output will always conform to the
*     expected nullable-or-boolean contract without deviation.  
*
* **SEMANTIC NOTES**  
*   - Nullable booleans often serve as optional flags in distributed systems,
*     making this schema crucial for ensuring predictable propagation through
*     service boundaries.  
*   - The schema supports long-term schema evolution by guaranteeing explicit
*     differentiation between null and derived boolean values.  
*   - It strengthens data hygiene practices by preventing ambiguous states from
*     leaking into storage or analytical layers.  
*   - Its use ensures that upstream and downstream services maintain consistent
*     assumptions regarding the meaning and handling of nullable boolean fields.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Nullable null accepted)
*   Input: null
*   Output: null
*
*   // Example 2 (Passing — Coercible string)
*   Input: "yes"
*   Output: true
*
*   // Example 3 (Passing — Coercible number)
*   Input: 0
*   Output: false
*
*   // Example 4 (Failing — Undefined not allowed)
*   Input: undefined
*   Output: ValidationError("A nullable or coercible-to-boolean value was expected, but undefined was received, violating the schema’s nullable-boolean coercion contract.")
*
*   // Example 5 (Failing — Non-coercible type)
*   Input: { ok: true }
*   Output: ValidationError("A nullable or coercible-to-boolean value was expected, but a non-primitive input was received, which cannot be coerced into a boolean under the schema’s strict rules.")
*   ```
*
* @returns {BooleanCoerceNullable} The validated value.
*/
export const booleanCoerceNullable = v.nullable(booleanCoerce, {
    message: ERROR_MESSAGE_KEYS.NULLABLE_BOOLEAN,
});

/**
* OUTPUT TYPE — BOOLEAN-COERCE-NULLABLE
*
* **SUMMARY**  
*   This output type represents a value that is guaranteed to be either a fully
*   normalized boolean or an explicitly preserved null, ensuring stable semantics
*   in enterprise workflows. It captures the post-validation guarantees of the
*   nullable coercion process, which normalizes all defined inputs while
*   retaining null without modification. The type offers deterministic behavior
*   that upstream and downstream systems can rely on for consistent operational
*   logic. These guarantees ensure long-term maintainability, traceability, and
*   clarity in typed system boundaries.
*
* **CONTRACT GUARANTEES**  
*   - The type guarantees that no value other than a boolean primitive or null
*     can appear after validation has succeeded.  
*   - The type ensures that all boolean-like inputs have been fully normalized,
*     preventing semantic ambiguity or unstable representations.  
*   - The type forbids undefined, objects, arrays, or any non-primitive value,
*     ensuring structural safety across service boundaries.  
*   - The type guarantees that null is preserved intentionally, allowing business
*     logic to distinguish between absence and explicit boolean meaning.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanCoerceNullable =
*       parse(booleanCoerceNullable, "true");
*   ```
*/
export type BooleanCoerceNullable = InferOutput<
    typeof booleanCoerceNullable
>;

/**
* BOOLEAN-DEFAULT-TRUE SCHEMA
*
* **SUMMARY**  
*   This schema validates a boolean value that may be optionally provided by the
*   caller while ensuring that a reliable default is consistently applied when
*   omitted. It establishes predictable behavior by coercing or validating the
*   input into a boolean that adheres to enterprise requirements. The schema
*   ensures that downstream systems receive a stable and semantically meaningful
*   representation of the flag. This provides a dependable mechanism for handling
*   optional boolean fields across distributed workflows.
*
* **PURPOSE**  
*   - This schema exists to guarantee that optional boolean inputs resolve to a
*     predictable and contractually stable value when the caller omits them.  
*   - It supports enterprise workflows that rely on deterministic toggles by
*     supplying a default that prevents ambiguous or undefined states from
*     propagating.  
*   - It enforces consistent coercion rules so that boolean-like inputs map to a
*     canonical representation and avoid downstream semantic drift.  
*   - It provides a standard input normalization layer suitable for critical
*     configuration paths and repeatable operational logic.  
*
* **INPUT CONTRACT**  
*   - The schema accepts either a valid boolean or any value permitted by
*     booleanCoerce for conversion into a validated boolean.  
*   - The schema rejects any value that booleanCoerce cannot convert or validate
*     into a boolean, including malformed primitives and structurally invalid
*     data.  
*   - The schema accepts omitted or undefined inputs and safely replaces them
*     using the defined defaulting mechanism.  
*   - The schema rejects unexpected object structures, arrays, or any composite
*     value that does not conform to allowable boolean coercion semantics.  
*
* **OUTPUT CONTRACT**  
*   - The output will always be a strictly typed boolean after successful
*     validation and coercion.  
*   - The output guarantees that omitted inputs result in the resolved value of
*     true, ensuring deterministic system behavior.  
*   - The output preserves semantic stability by ensuring that no ambiguous or
*     partially coerced values propagate beyond validation boundaries.  
*   - The output maintains enterprise-grade reliability by producing a value that
*     downstream services can consume without additional verification.  
*
* **VALIDATION RULES**  
*   - The schema checks whether the provided value is either a valid boolean or a
*     value convertible by booleanCoerce, thereby preventing invalid types from
*     entering the system.  
*   - It enforces that any omitted value immediately resolves to the default of
*     true, preventing undefined operational states.  
*   - It ensures that coercion failures trigger explicit validation errors rather
*     than allowing silent or inconsistent conversions.  
*   - It maintains strict structural constraints by disallowing arrays, objects,
*     or other non-boolean primitives from passing through.  
*
* **SEMANTIC NOTES**  
*   - This field commonly represents feature toggles, system switches, or
*     optional configuration flags requiring high reliability.  
*   - Its defaulting behavior ensures that systems behave predictably even when
*     upstream producers provide incomplete data.  
*   - Its strict coercion rules help maintain interoperability across services
*     written in disparate languages or frameworks.  
*   - The schema integrates cleanly into versioned data contracts and persists
*     safely across schema evolution cycles.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Undefined triggers default true)
*   Input: undefined
*   Output: true
*
*   // Example 2 (Passing — Coercible falsy string)
*   Input: "false"
*   Output: false
*
*   // Example 3 (Passing — Native boolean)
*   Input: true
*   Output: true
*
*   // Example 4 (Failing — Non-coercible object)
*   Input: { enabled: "false" }
*   Output: ValidationError("A boolean or coercible-to-boolean value was expected, but a non-coercible object was received, violating the schema’s strict default-boolean contract.")
*   ```
*
* @returns {BooleanDefaultTrue} The validated value.
*/
export const booleanDefaultTrue = v.optional(
    booleanCoerce,
    (): boolean => {
        return true;
    },
    ERROR_MESSAGE_KEYS.BOOLEAN_DEFAULT_TRUE
);

/**
* OUTPUT TYPE — BOOLEAN-DEFAULT-TRUE
*
* **SUMMARY**  
*   This output type represents the fully validated boolean produced by the
*   booleanDefaultTrue schema and reflects finalized coercion and defaulting
*   rules. It guarantees the absence of undefined or unnormalized states while
*   preserving consistent semantics across execution environments. The type is
*   stable, deterministic, and suitable for consumption in any enterprise-grade
*   workflow requiring strict boolean invariants. Its well-defined contract makes
*   it safe to use for configuration flags, protocol signals, and system-level
*   gating conditions.
*
* **CONTRACT GUARANTEES**  
*   - The value is always a boolean, with no possibility of undefined, null, or
*     partially coerced intermediate states.  
*   - The type guarantees that default resolution has already occurred,
*     eliminating the need for additional fallback logic at call sites.  
*   - The type ensures that only values validated or properly coerced by the
*     schema can appear, thereby preventing semantic inconsistencies.  
*   - The type forbids any unstable or environment-dependent behaviors by
*     enforcing deterministic boolean semantics.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanDefaultTrue =
*       parse(booleanDefaultTrue, undefined);
*   ```
*/
export type BooleanDefaultTrue = InferOutput<typeof booleanDefaultTrue>;

/**
* BOOLEAN-DEFAULT-FALSE SCHEMA
*
* **SUMMARY**  
*   This schema validates a boolean input while ensuring predictably stable
*   behavior when the value is omitted in upstream or downstream operations. It
*   provides a structured mechanism for safely coercing incoming values into a
*   boolean while preserving enterprise-grade guarantees. The schema manages the
*   operational requirement of defaulting missing values to a consistently typed
*   and semantically meaningful fallback. These guarantees ensure that systems
*   integrating this schema experience deterministic outcomes across diverse
*   execution contexts.
*
* **PURPOSE**  
*   - This schema ensures that any consumer may safely rely on a boolean value
*     even when the upstream sender omits the field, thereby protecting workflow
*     consistency in enterprise processing pipelines.  
*   - This schema provides a coercion mechanism that converts various loosely
*     typed values into a boolean, ensuring proper normalization for downstream
*     system semantics.  
*   - This schema enforces structured handling of optional fields so that data
*     ingestion processes do not encounter nondeterministic states or undefined
*     values.  
*   - This schema supports strict typing conventions required for advanced rule
*     engines, analytics systems, and API contracts that depend on boolean
*     stability.  
*
* **INPUT CONTRACT**  
*   - The schema accepts a boolean value or any input that the internal boolean
*     coercion mechanism can correctly convert into a boolean without structural
*     ambiguity.  
*   - The schema rejects malformed primitives, objects, arrays, or any values
*     that cannot be safely coerced into a boolean according to the coercion
*     contract.  
*   - The schema accepts an omitted value, treating it as a valid case that
*     triggers the defaulting mechanism rather than raising an error.  
*   - The schema rejects explicitly provided null or undefined inputs because
*     they violate the expected primitive coercion pipeline and cannot be
*     considered type-safe candidates.  
*
* **OUTPUT CONTRACT**  
*   - The schema always returns a strictly typed boolean output once validation
*     succeeds.  
*   - The schema guarantees that missing inputs are normalized to a default value
*     of false, ensuring deterministic behavior across all validated results.  
*   - The schema ensures that any coercible input is transformed into a boolean
*     that adheres to the semantic expectations of downstream consumers.  
*   - The schema outputs no undefined, null, or structurally inconsistent
*     representations, ensuring stable and interoperable payloads.  
*
* **VALIDATION RULES**  
*   - The schema verifies whether the provided value can be coerced into a valid
*     boolean, preventing structurally invalid inputs from entering system
*     pipelines.  
*   - The schema ensures that omitted values invoke a safe and predictable
*     defaulting function rather than producing ambiguous states.  
*   - The schema enforces strict type behavior by rejecting values that violate
*     the coercion contract, thereby minimizing runtime semantic risk.  
*   - The schema ensures that all allowed outputs comply with the boolean
*     invariant, thereby reinforcing type correctness in enterprise contexts.  
*
* **SEMANTIC NOTES**  
*   - The resulting boolean is guaranteed to integrate cleanly with systems that
*     rely on predictable truthiness semantics for operational logic.  
*   - The schema’s defaulting behavior supports workflows where omitted flags
*     must be treated as explicitly false for regulatory, compliance, or auditing
*     considerations.  
*   - The schema’s coercion guarantees support heterogeneous input sources that
*     may not strictly follow typed communication protocols.  
*   - The boolean output provides long-term stability for schema evolution,
*     ensuring backward-compatible behavior across versioned systems.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Strict boolean preserved)
*   Input: true
*   Output: true
*
*   // Example 2 (Passing — Undefined triggers default false)
*   Input: undefined
*   Output: false
*
*   // Example 3 (Passing — Coercible string)
*   Input: "0"
*   Output: false
*
*   // Example 4 (Failing — Non-coercible type)
*   Input: { flag: "true" }
*   Output: ValidationError("A boolean or coercible-to-boolean value was expected, but a non-coercible object was received, violating the schema’s strict default-false contract.")
*   ```
*
* @returns {BooleanDefaultFalse} The validated value.
*/
export const booleanDefaultFalse = v.optional(
    booleanCoerce,
    (): boolean => {
        return true;
    },
    ERROR_MESSAGE_KEYS.BOOLEAN_DEFAULT_FALSE
);

/**
* OUTPUT TYPE — BOOLEAN-DEFAULT-FALSE
*
* **SUMMARY**  
*   This output type represents a fully validated boolean that reliably reflects
*   deterministic truth-state behavior across enterprise workflows. It ensures
*   that every value produced by the schema adheres strictly to the boolean
*   invariant without permitting undefined or null edge cases. The type provides
*   confidence that downstream processes may rely on consistent interpretations
*   of boolean semantics. The guarantees encoded in this type enable predictable
*   orchestration of business logic, risk controls, and feature-flag behavior.  
*
* **CONTRACT GUARANTEES**  
*   - The output type always represents an explicit boolean and never an
*     undefined, null, or structurally ambiguous value.  
*   - The output type guarantees that any omitted input from upstream systems is
*     converted into a deterministic false value.  
*   - The output type ensures that all coercible values have been validated and
*     normalized, preventing semantic drift across system boundaries.  
*   - The output type prohibits any malformed or invalid primitives, ensuring
*     strong contract enforcement within typed integrations.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanDefaultFalse =
*       parse(booleanDefaultFalse, true);
*   ```
*/
export type BooleanDefaultFalse = InferOutput<
    typeof booleanDefaultFalse
>;

/**
* BOOLEAN-TRI-STATE SCHEMA
*
* **SUMMARY**  
*   This schema validates a tri-state boolean value that may intentionally hold a
*   true, false, or null state depending on system requirements. It ensures that
*   all consumers handle the value consistently across distributed workflows and
*   prevents malformed or coerced values from propagating. This schema provides a
*   predictable contract that stabilizes upstream and downstream integrations by
*   guaranteeing a narrow and structurally consistent domain. Its purpose is to
*   give enterprise systems a dependable validation mechanism that cleanly
*   restricts the acceptable values while maintaining reliable semantic meaning.
*
* **PURPOSE**  
*   - This schema exists to enforce a strict tri-state boolean domain so systems
*     transmitting decision flags can avoid ambiguity and mismatches in type
*     interpretation.  
*   - This schema ensures all service layers treat null as an intentional third
*     state rather than an error or unexpected omission.  
*   - This schema provides a clear validation mechanism that safeguards against
*     typographical defects, unexpected primitives, or coerced values that could
*     cause inconsistent decision logic.  
*   - This schema supports enterprise workflows by guaranteeing that any boolean
*     signal passed into business logic has been prevalidated to an exact
*     contractually defined set of permissible states.
*
* **INPUT CONTRACT**  
*   - The schema accepts only the literal values true, false, or null and rejects
*     all other forms including numbers, strings, arrays, and objects.  
*   - The schema rejects undefined values because the absence of a value violates
*     the explicit tri-state requirement.  
*   - The schema rejects coerced boolean-like strings such as "true" or "false"
*     because they break the strict primitive constraint.  
*   - The schema rejects any wrapped or boxed Boolean objects because they do not
*     conform to the structural and semantic expectations of primitive values.
*
* **OUTPUT CONTRACT**  
*   - Successful validation guarantees that the output is strictly one of the
*     three permitted literal values without transformation or coercion.  
*   - The output is normalized to a primitive type, ensuring predictable behavior
*     across serialization boundaries.  
*   - The output preserves the exact semantic meaning of true, false, or null so
*     downstream logic can rely on stable decision patterns.  
*   - The output ensures that system components can operate without performing
*     additional type checks or sanitization steps.
*
* **VALIDATION RULES**  
*   - The schema enforces that the value must be a primitive boolean or a null
*     literal, preventing structurally invalid types from appearing in validated
*     data.  
*   - The schema ensures that no implicit casting is allowed, blocking loosely
*     typed or coercive input formats that weaken domain guarantees.  
*   - The schema confirms that undefined or missing values are invalid because
*     they violate the required tri-state completeness.  
*   - The schema rejects any value outside the tightly scoped domain to uphold
*     enterprise-level data integrity.
*
* **SEMANTIC NOTES**  
*   - The tri-state design allows systems to explicitly differentiate between
*     affirmative, negative, and intentionally unspecified conditions.  
*   - The schema’s null-state handling aligns with patterns used in multi-service
*     orchestration where absence conveys a meaningful operational instruction.  
*   - The schema supports accurate state auditing by ensuring that all received
*     values map precisely to the intended semantic domain.  
*   - The schema integrates cleanly with storage layers that require explicit
*     encoding of optional boolean values.
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Allowed literal true)
*   Input: true
*   Output: true
*
*   // Example 2 (Passing — Allowed literal false)
*   Input: false
*   Output: false
*
*   // Example 3 (Passing — Allowed literal null)
*   Input: null
*   Output: null
*
*   // Example 4 (Failing — Undefined not permitted)
*   Input: undefined
*   Output: ValidationError("A value of true, false, or null was expected, but undefined was received, violating the schema’s strict tri-state contract.")
*
*   // Example 5 (Failing — Non-primitive or coerced boolean-like value)
*   Input: "true"
*   Output: ValidationError("A primitive boolean or null value was expected, but a non-primitive or coerced input was received, violating the schema’s strict tri-state constraint.")
*   ```
*
* @returns {BooleanTriState} The validated value.
*/
export const booleanTriState = union(
    [
        boolean(ERROR_MESSAGE_KEYS.BOOLEAN_TYPE),
        null_(ERROR_MESSAGE_KEYS.NULL)
    ],
    ERROR_MESSAGE_KEYS.UNION
);

/**
* OUTPUT TYPE — BOOLEAN-TRI-STATE
*
* **SUMMARY**  
*   This output type represents the fully validated tri-state boolean domain
*   guaranteed to be either true, false, or null. It ensures predictable and
*   stable behavior for all consuming services and prevents any form of expanded
*   or loosely typed boolean interpretation. The type preserves strict semantic
*   meaning so decision workflows and configuration pipelines can rely upon it.
*   The documentation for this type provides engineers with a clear understanding
*   of the constraints and guarantees enforced by the schema.
*
* **CONTRACT GUARANTEES**  
*   - The type guarantees that no value outside true, false, or null can ever be
*     represented after validation.  
*   - The type ensures that all outputs are primitive forms and never boxed or
*     coerced, maintaining stable system-level interoperability.  
*   - The type forbids undefined or missing states, ensuring that all tri-state
*     semantics remain explicit and intentional.  
*   - The type guarantees predictable downstream branching behavior due to its
*     precisely restricted domain.
*
* **EXAMPLE**  
*   ```
*   const val: BooleanTriState =
*       parse(booleanTriState, true);
*   ```
*/
export type BooleanTriState = InferOutput<typeof booleanTriState>;

/**
* BOOLEAN-UNDEFINEDABLE SCHEMA
*
* **SUMMARY**  
*   This schema validates a value that may be either the boolean literal true,
*   the boolean literal false, or the JavaScript undefined primitive while
*   ensuring strict adherence to enterprise-grade data handling expectations.
*   It provides a controlled gate that guarantees only these explicitly allowed
*   states may pass, thereby preventing accidental coercions or unintended
*   polymorphism from entering operational workflows. The schema is designed to
*   ensure predictable processing across distributed systems by enforcing
*   tight semantic boundaries. Each validated value emerges in a normalized and
*   stable form suitable for downstream computation.
*
* **PURPOSE**  
*   - This schema exists to guarantee that only the explicitly permitted literal
*     boolean states or the undefined primitive may enter enterprise workflows,
*     thereby preventing unintended data coercion or ambiguous values.  
*   - It ensures that upstream systems cannot inject malformed or structurally
*     incoherent types that violate strict validation expectations within
*     distributed processing pipelines.  
*   - It provides a clear contract for services that must differentiate between
*     explicit boolean intent and the absence of value without relying on
*     nullable semantics.  
*   - It enforces consistency in environments where data sources may vary in
*     format or reliability, ensuring that each consumer operates with precise
*     expectations and no implicit assumptions.  
*
* **INPUT CONTRACT**  
*   - The schema accepts only the literal boolean true, the literal boolean
*     false, or the undefined primitive, rejecting all other value types.  
*   - Inputs such as null, numbers, strings, objects, arrays, or coerced boolean
*     values are strictly rejected to maintain semantic clarity.  
*   - Missing values that do not explicitly evaluate to undefined are rejected
*     because they violate the requirement for explicit structural shape in
*     consuming systems.  
*   - Any object-wrapped primitives or unexpected data structures are rejected to
*     avoid ambiguity and prevent violation of downstream invariants.  
*
* **OUTPUT CONTRACT**  
*   - The schema guarantees that the resulting output will always be strictly one
*     of the three valid states: true, false, or undefined, without coercion or
*     implicit transformation.  
*   - It ensures that the value is stable, predictable, and semantically aligned
*     with strict typing rules relied upon across the entire enterprise.  
*   - Output values will not include any metadata, wrapper types, or additional
*     structural content beyond the permitted literal or undefined state.  
*   - Consumers may rely on the invariant that each validated output conforms
*     exactly to the schema’s narrow contract without deviation.  
*
* **VALIDATION RULES**  
*   - The schema enforces that only literal true, literal false, or undefined may
*     pass validation, ensuring no accidental string, numeric, or object-based
*     representations appear.  
*   - It rejects any value that attempts to mimic boolean semantics, such as
*     numbers or truthy/falsy constructs, thereby preventing hidden coercion.  
*   - It ensures undefined is only accepted when explicitly provided, blocking
*     missing keys or null placeholders that violate structural guarantees.  
*   - It guarantees that no transformations are applied and that validation acts
*     solely as a gate against disallowed input forms.  
*
* **SEMANTIC NOTES**  
*   - This field is often used in systems where a tri-state logical flag is
*     necessary, but nullability is not permitted due to serialization or
*     protocol constraints.  
*   - The schema supports workflows that must distinguish between affirmative
*     boolean intent, negative boolean intent, and explicitly absent values.  
*   - Its strict semantics support stable persistence patterns in storage layers
*     that treat undefined differently from optional null-bearing fields.  
*   - The schema’s narrow contract helps enforce rigorous state modeling across
*     microservices that depend on consistent interpretation of boolean logic.  
*
* **EXAMPLES**
*   ```
*   // Example 1 (Passing — Literal true allowed)
*   Input: true
*   Output: true
*
*   // Example 2 (Passing — Literal false allowed)
*   Input: false
*   Output: false
*
*   // Example 3 (Passing — Explicit undefined allowed)
*   Input: undefined
*   Output: undefined
*
*   // Example 4 (Failing — Null not permitted)
*   Input: null
*   Output: ValidationError("A value of true, false, or undefined was expected, but null was received, violating the schema’s strict undefinedable-boolean contract.")
*
*   // Example 5 (Failing — Non-boolean primitive)
*   Input: "true"
*   Output: ValidationError("A value of true, false, or undefined was expected, but a non-boolean primitive was received, violating the schema’s strict undefinedable-boolean rules.")
*   ```
*
* @returns {BooleanUndefinedable} The validated value.
*/
export const booleanUndefinedable = union([
    literal(true),
    literal(false),
    undefined()
], ERROR_MESSAGE_KEYS.BOOLEAN_UNDEFINEDABLE);

/**
* OUTPUT TYPE — BOOLEAN-UNDEFINEDABLE
*
* **SUMMARY**  
*   This output type represents a constrained tri-state logical value that may
*   only be true, false, or undefined, ensuring strict adherence to enterprise
*   data modeling conventions. It guarantees that the validated output cannot be
*   coerced or implicitly transformed into any adjacent primitive type. The type
*   upholds strong semantic clarity by eliminating ambiguous states commonly
*   found in loosely typed systems. Its narrow definition ensures predictable
*   downstream behavior across distributed services and long-lived workflows.
*
* **CONTRACT GUARANTEES**  
*   - The output type guarantees that the value is always one of the three
*     explicitly allowed literals and cannot include any fallback forms or
*     coerced equivalents.  
*   - It ensures there are no nullable, object-wrapped, or coercively computed
*     boolean states, thereby preventing semantic leakage into dependent
*     subsystems.  
*   - It enforces a stable representation that downstream consumers may depend
*     on without requiring any additional checks for null or alternative
*     primitives.  
*   - It ensures long-term structural integrity by prohibiting expansion into
*     broader union types not defined by the schema’s strict contract.  
*
* **EXAMPLE**  
*   ```
*   const val: BooleanUndefinedable =
*       parse(booleanUndefinedable, true);
*   ```
*/
export type BooleanUndefinedable = InferOutput<typeof booleanUndefinedable>;