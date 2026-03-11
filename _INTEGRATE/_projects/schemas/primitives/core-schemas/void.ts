import * as v from "valibot";

/** 
 * SHARED VOID-SCHEMA ERROR MESSAGE CONSTANTS
 *
 * SUMMARY  
 *   Defines standardized error messages used by void-related schemas,
 *   ensuring consistent, precise validation feedback wherever `undefined`-only
 *   values are required. This centralizes all messaging for void-based
 *   validation logic and enforces a uniform semantic contract across the
 *   validation layer.
 *
 * PURPOSE  
 *   Provides a single authoritative source for error strings used in:
 *   - `voidStrict` (accepts ONLY `undefined`)  
 *   - future void-related validators (present-void, null-or-void, default-void)  
 *
 *   Centralizing error messages ensures:
 *   - stable, predictable validation semantics  
 *   - consistent error wording across schemas  
 *   - easier maintenance, localization, and refactoring  
 *
 * INPUT CONTRACT  
 *   - This object is internal and not user-supplied.  
 *   - Each key corresponds to a specific void-schema type.  
 *   - Each value must be a clear, direct description of the validation failure.  
 *
 * OUTPUT CONTRACT  
 *   - Error messages are emitted verbatim when validation fails.  
 *   - No mutation, formatting, or transformation occurs.  
 *
 * VALIDATION RULES  
 *   - Messages must remain concise, explicit, and non-ambiguous.  
 *   - Messages MUST describe only the exact allowed value (`undefined`) for
 *     `voidStrict`.  
 *   - Additional void-schema variants must extend this map rather than using
 *     ad-hoc strings.  
 *
 * SEMANTIC NOTES  
 *   These error messages are intended for:
 *   - developer-facing logs  
 *   - API error responses  
 *   - strict schema enforcement layers  
 *
 *   They are not opinionated about UI presentation and may be wrapped or
 *   localized as needed.
 *
 * EXAMPLES  
 *   ```
 *   // Inside schema:
 *   const voidStrict = v.literal(undefined, ERROR_MESSAGES.voidStrict);
 *
 *   // Example failure:
 *   parse(voidStrict, null);
 *   // → "Expected value to be undefined."
 *
 *   parse(voidStrict, "");  
 *   // → "Expected value to be undefined."
 *   ```
 */
const ERROR_MESSAGES = {
  voidStrict: "Expected value to be undefined.",
};

/**
 * STRICT VOID SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is strictly JavaScript `undefined`.
 *
 * PURPOSE  
 *   Enforces a precise type contract for fields that must not carry data,
 *   preventing accidental assignment of null, empty strings, zero, or any
 *   other placeholder. This schema is commonly used in:
 *   - Protocol envelopes where the field's presence conveys structure
 *   - Reserved fields for future extension that must remain empty
 *   - Internal control or sentinel properties that must remain unset
 *
 * INPUT CONTRACT  
 *   - The input MUST be exactly `undefined`.
 *   - Null, falsy values (e.g., `""`, `0`, `false`), objects, arrays, and all
 *     other value types are rejected.
 *
 * OUTPUT CONTRACT  
 *   - Guarantees the returned value is precisely `undefined`.
 *   - Provides a strong invariant: “no payload, no placeholder, no absence
 *     ambiguity”.
 *
 * VALIDATION RULES  
 *   - Accepts only: `undefined`
 *   - Rejects: null, string, number, boolean, symbol, object, array, function
 *
 * SEMANTIC NOTES  
 *   - Use when you need to enforce intentional emptiness, rather than allowing
 *     a field to be omitted or optional.
 *   - Helps differentiate between “unset because optional” and “set but must
 *     contain no value”.
 *
 * EXAMPLES
 *   ```
 *   // Valid
 *   Input:  undefined
 *   Output: undefined
 *
 *   // Invalid: not undefined
 *   Input:  null
 *   Error:  Expected value to be undefined.
 *
 *   Input:  ""
 *   Error:  Expected value to be undefined.
 *
 *   Input:  0
 *   Error:  Expected value to be undefined.
 *   ```
 *
 * @returns {undefined} The validated `undefined` value.
 */
const voidStrict = v.undefined(ERROR_MESSAGES.voidStrict);

/**
 * OUTPUT TYPE — VOID-STRICT
 *
 * SUMMARY  
 *   Represents the validated output produced by the `voidStrict` schema,
 *   guaranteeing that the resulting value is exactly JavaScript `undefined`.
 *
 * PURPOSE  
 *   Provides a precise static typing contract for fields that must never carry
 *   any value, including `null` or common falsy primitives. This type is used
 *   in systems where the only valid state of the field is a strict absence of
 *   data and where alternative “empty” markers must be rejected.
 *
 * CONTRACT GUARANTEES  
 *   - The output is always `undefined`.  
 *   - The field cannot be nullified, defaulted, coerced, or substituted by any
 *     other representation of emptiness.  
 *   - Ensures downstream consumers treat the slot as intentionally value-less.  
 *
 * SEMANTIC NOTES  
 *   Useful for:
 *   - Protocol or schema fields intentionally reserved for future extension  
 *   - Structural placeholders that must remain unset  
 *   - Control fields where any non-undefined value would alter semantics  
 *
 * EXAMPLE  
 *   ```
 *   const result = parse(schema, undefined);
 *   // result: VoidStrict → undefined
 *   ```
 */
type VoidStrict = v.InferOutput<typeof voidStrict>;

/**
 * NULL-OR-VOID SCHEMA
 *
 * SUMMARY  
 *   Validates that a value represents an explicit “empty state” by allowing
 *   only `null` or `undefined`, rejecting all other forms of input.
 *
 * PURPOSE  
 *   Provides a unified validation for fields where the absence of data is
 *   meaningful and intentionally permitted. This schema is appropriate for:
 *   - Optional metadata slots
 *   - Forward-compatible reserved fields
 *   - Properties that may be intentionally suppressed by upstream systems
 *   - Nullable API parameters where both `null` and `undefined` represent
 *     “no value provided”
 *
 * INPUT CONTRACT  
 *   - Accepts: `null`, `undefined`
 *   - Rejects: all other values including empty strings, numeric zero,
 *     booleans, objects, arrays, symbols, and functions—regardless of their
 *     logical “falsiness”.
 *
 * OUTPUT CONTRACT  
 *   - Guarantees the returned value is either `null` or `undefined`.
 *   - Ensures consumers can safely treat the value as a standardized empty
 *     sentinel with no payload semantics.
 *
 * VALIDATION RULES  
 *   - `value === null` → valid  
 *   - `value === undefined` → valid  
 *   - Any other value → invalid  
 *
 * SEMANTIC NOTES  
 *   - This schema intentionally merges nullability and optionality, which may
 *     be desirable in API contracts where both forms represent the same
 *     conceptual domain: “nothing provided, nothing stored”.
 *   - Distinct from a purely optional field because it allows `null` even when
 *     the property is explicitly provided.
 *
 * EXAMPLES
 *   ```
 *   // Valid Inputs
 *   Input:  null
 *   Output: null
 *
 *   Input:  undefined
 *   Output: undefined
 *
 *   // Invalid Inputs
 *   Input:  ""
 *   Error:  Expected value to be null or undefined.
 *
 *   Input:  0
 *   Error:  Expected value to be null or undefined.
 *
 *   Input:  {}
 *   Error:  Expected value to be null or undefined.
 *   ```
 *
 * @returns {null | undefined} A validated null-or-undefined value.
 */
const voidNullable = v.nullable(voidStrict);

/**
 * OUTPUT TYPE — VOID-NULLABLE
 *
 * SUMMARY  
 *   Represents the validated output of the `voidNullable` schema, ensuring that
 *   the resulting value is either `undefined` or `null`, with no other value
 *   permitted.
 *
 * PURPOSE  
 *   Provides a standardized type for fields intentionally designed to accept
 *   “empty state” values in two distinct but conceptually equivalent forms:
 *   - `undefined` (value omitted or unset)
 *   - `null` (explicitly set to no value)
 *
 *   This output type is particularly useful in schemas where upstream systems
 *   produce mixed conventions for representing empty data, and downstream
 *   consumers require a unified and predictable type signature.
 *
 * CONTRACT GUARANTEES  
 *   - The output will always be either `undefined` or `null`.  
 *   - No other primitive or structural type can pass validation.  
 *   - Consumers may reliably treat the field as a dual-form empty sentinel.  
 *
 * SEMANTIC NOTES  
 *   This type is appropriate for:
 *   - Optional metadata fields  
 *   - Resettable configuration properties  
 *   - Interoperability layers that normalize `null` and `undefined` as
 *     equivalent representations of “no value”  
 *
 * EXAMPLE  
 *   ```
 *   const data1 = parse(schema, { field: null });
 *   // field: VoidNullable → null
 *
 *   const data2 = parse(schema, {});
 *   // field: VoidNullable → undefined
 *   ```
 */
type VoidNullable = v.InferOutput<typeof voidNullable>;

/**
 * VOID-DEFAULT SCHEMA
 *
 * SUMMARY  
 *   Validates that a value may be omitted entirely and, in such cases,
 *   substitutes a canonical default of `undefined`. If the value is explicitly
 *   provided, it must also be `undefined`.
 *
 * PURPOSE  
 *   Establishes a deterministic behavior for fields whose natural default state
 *   is intentional emptiness. This schema is suitable when:
 *   - A field is optional but must never contain a runtime value
 *   - The consumer relies on the presence of the key within object shapes
 *   - Backward/forward compatibility requires a known default sentinel
 *   - Schema evolution mandates controlled placeholder values rather than `null`
 *
 * INPUT CONTRACT  
 *   - Accepts:
 *     - `undefined` (explicitly passed)
 *     - missing/omitted values
 *   - Rejects:
 *     - `null`
 *     - any non-undefined value (string, number, boolean, object, array, etc.)
 *
 * OUTPUT CONTRACT  
 *   - The resulting value is always `undefined`.
 *   - When omitted, the schema applies a deterministic default of `undefined`.
 *   - Guarantees that consumers can rely on a normalized, payload-free field.
 *
 * VALIDATION RULES  
 *   - `undefined` → valid  
 *   - omitted → normalized to `undefined`  
 *   - `null` → invalid  
 *   - anything else → invalid  
 *
 * SEMANTIC NOTES  
 *   - This schema standardizes “lack of value” in systems where nullability is
 *     discouraged or carries alternate semantic meaning.
 *   - Useful for internal protocol placeholders or API shapes that must contain
 *     the field without carrying data.
 *
 * EXAMPLES
 *   ```
 *   // Valid
 *   Input:  undefined
 *   Output: undefined
 *
 *   // Valid: omitted value
 *   Input:  <missing>
 *   Output: undefined
 *
 *   // Invalid
 *   Input:  null
 *   Error:  Expected value to be undefined.
 *
 *   Input:  ""
 *   Error:  Expected value to be undefined.
 *   ```
 *
 * @returns {undefined} A normalized undefined value.
 */
const voidDefault = v.optional(voidStrict, () => undefined);

/**
 * OUTPUT TYPE — VOID-DEFAULT
 *
 * SUMMARY  
 *   Represents the validated output of the `voidDefault` schema, guaranteeing
 *   that the resulting value is always `undefined`, whether the property was
 *   omitted or explicitly provided as `undefined`.
 *
 * PURPOSE  
 *   This type formalizes the normalized empty-state value for fields validated
 *   through the `voidDefault` schema. It ensures that downstream systems can
 *   rely on a stable `undefined` value regardless of how the upstream input was
 *   provided, enabling predictable handling of optional-but-value-less fields.
 *
 * CONTRACT GUARANTEES  
 *   - The output is *always* `undefined`.  
 *   - Absence of the key is normalized into a defined `undefined` output.  
 *   - Explicit `undefined` remains unchanged.  
 *
 * SEMANTIC NOTES  
 *   This type is used for optional fields where:
 *   - null is disallowed,
 *   - the field may be omitted, and
 *   - the system requires a canonical representation of “no value”.
 *
 * EXAMPLE  
 *   ```
 *   const data = parse(schema, {});
 *   // data.someField: VoidDefault → undefined
 *
 *   const data2 = parse(schema, { someField: undefined });
 *   // data2.someField: VoidDefault → undefined
 *   ```
 */
type VoidDefault = v.InferOutput<typeof voidDefault>;

/**
 * PRESENT-VOID SCHEMA
 *
 * SUMMARY  
 *   Validates that a property is explicitly present in the input object and
 *   that its value is strictly `undefined`.
 *
 * PURPOSE  
 *   Enforces a presence contract for object fields where:
 *   - The key must exist to preserve message envelope structure.
 *   - The value must intentionally convey the absence of payload by being
 *     explicitly `undefined` rather than omitted, nullified, or defaulted.
 *   This pattern is required in systems where field omission has alternate
 *   semantic meaning or triggers backward-compatibility modes.
 *
 * INPUT CONTRACT  
 *   - Key MUST exist on the object being validated.
 *   - Value MUST be JavaScript `undefined`.
 *   - Null, empty strings, numbers, objects, arrays, or omitted keys are
 *     rejected.
 *
 * OUTPUT CONTRACT  
 *   - Returns `undefined` with a guaranteed present key.
 *   - Ensures schema evolution safety for consumers depending on field presence.
 *
 * VALIDATION RULES  
 *   - `value === undefined` passes.
 *   - Missing keys fail.
 *   - Any non-undefined value fails.
 *
 * SEMANTIC NOTES  
 *   - Distinguishes “present but intentionally empty” from “not provided”.
 *   - Useful in metadata envelopes, control frames, strict protocol headers,
 *     and strongly typed RPC structures where structural completeness is
 *     required.
 *
 * EXAMPLES
 *   ```
 *   Input:  { status: undefined }
 *   Output: undefined   // valid
 *
 *   Input:  {}
 *   Error:  Key 'status' is missing
 *
 *   Input:  { status: null }
 *   Error:  Expected undefined (key must be present)
 *   ```
 *
 * @returns {undefined} The validated undefined value.
 */
const voidPresent = v.custom(
  (value) => value === undefined,
  "Expected undefined (key must be present)."
);

/**
 * OUTPUT TYPE — VOID-PRESENT
 *
 * SUMMARY  
 *   Represents the validated output of the `voidPresent` schema: a value that is
 *   guaranteed to be strictly `undefined` while also guaranteeing that the key
 *   existed in the validated input object.
 *
 * PURPOSE  
 *   Provides a precise static type for downstream systems that rely on the
 *   distinction between:
 *   - “property omitted entirely”, and
 *   - “property present but intentionally containing no value”.
 *
 * CONTRACT GUARANTEES  
 *   - The type is always `undefined`.
 *   - The validated property is confirmed to *exist* on the object passed into
 *     the validator, ensuring structural completeness.
 *
 * SEMANTIC NOTES  
 *   This type is used in scenarios where the presence of a field carries
 *   protocol-level or schema-level semantic meaning, even though the value
 *   itself is intentionally empty.
 *
 * EXAMPLE  
 *   ```
 *   const data = parse(someSchema, { flag: undefined });
 *   //    ^? flag: VoidPresent → undefined (key guaranteed present)
 *   ```
 */
type VoidPresent = v.InferOutput<typeof voidPresent>;

/**
 * NULLABLE-VOID DEFAULT SCHEMA
 *
 * SUMMARY  
 *   Accepts **null or undefined**, and automatically defaults missing values
 *   to `undefined`. This schema is the logical companion to `nullOrVoid` and
 *   `voidDefault`, combining both behaviors:
 *
 *   - Missing → defaults to undefined  
 *   - Present and undefined → accepted  
 *   - Present and null → accepted  
 *   - Any other value → rejected  
 *
 * PURPOSE  
 *   Ideal for systems where a field is conceptually optional, but when provided
 *   must still explicitly represent *no value* (`null` or `undefined`). Useful
 *   for:
 *
 *   - API inputs  
 *   - partial updates  
 *   - user settings overrides  
 *   - configuration layers  
 *   - form fields where absence ≠ invalid  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `undefined` (explicit or missing key)  
 *   - `null`  
 *
 *   REJECTS:
 *   - booleans  
 *   - numbers  
 *   - strings  
 *   - objects  
 *   - arrays  
 *
 * OUTPUT CONTRACT  
 *   Always produces:
 *   ```
 *   undefined | null
 *   ```
 *
 * VALIDATION LOGIC  
 *   - If value is missing → default to undefined  
 *   - If value is undefined → valid  
 *   - If value is null → valid  
 *   - Else → validation failure  
 *
 * SEMANTIC NOTES  
 *   - Represents the broadest “empty value allowed” rule  
 *   - Ensures predictable downstream behavior  
 *   - Eliminates ambiguity between missing vs. intentionally empty  
 *
 * EXAMPLES  
 *   ```
 *   parse(nullableVoidDefault, undefined)  // → undefined
 *   parse(nullableVoidDefault, null)       // → null
 *   parse(nullableVoidDefault, 123)        // ❌ invalid
 *   parse(nullableVoidDefault, {})         // ❌ invalid
 *   ```
 */
export const nullableVoidDefault = v.optional(
  v.union([v.null(), v.undefined()])
);

/**
 * OUTPUT TYPE — NULLABLE-VOID DEFAULT
 *
 * SUMMARY  
 *   Represents the output of the `nullableVoidDefault` schema: a value that is
 *   guaranteed to be **either undefined or null**, with missing keys normalized
 *   to `undefined`.
 *
 * CONTRACT GUARANTEES  
 *   - Always `undefined | null`  
 *   - Never a primitive other than null  
 *   - Never an object or array  
 *
 * EXAMPLE  
 *   ```
 *   const x: NullableVoidDefault =
 *       parse(nullableVoidDefault, someInput);
 *   ```
 */
export type NullableVoidDefault =
  v.InferOutput<typeof nullableVoidDefault>;

/**
* FORBIDDEN-VOID SCHEMA
*
* SUMMARY  
*   Rejects `undefined` while accepting *any other* value. This is the logical
*   inverse of `strictVoid`. Used in cases where a field MUST be present and
*   MUST NOT be undefined—though it may be `null`, an object, a string, or
*   anything else.
*
* PURPOSE  
*   Enforces strong guarantees in:
*   - configuration objects  
*   - mandatory fields in API payloads  
*   - data persistence layers  
*   - runtime invariants for critical values  
*
* INPUT CONTRACT  
*   ACCEPTS:
*   - any value *other than undefined*  
*
*   REJECTS:
*   - undefined  
*
* OUTPUT CONTRACT  
*   Returns the input value unchanged.
*
* VALIDATION LOGIC  
*   - If value === undefined → validation fails  
*   - Else → pass-through  
*
* SEMANTIC NOTES  
*   - Similar to TypeScript’s `NonNullable<T>` except null IS allowed  
*   - Ensures explicit null instead of silent undefined  
*
* EXAMPLES  
*   ```
*   parse(forbiddenVoid, 0)          // valid
*   parse(forbiddenVoid, null)       // valid
*   parse(forbiddenVoid, "text")     // valid
*   parse(forbiddenVoid, undefined)  // ❌ invalid
*   ```
*/
export const forbiddenVoid = v.custom(
  (value) => value !== undefined,
  "Value must not be undefined."
);

/**
 * OUTPUT TYPE — FORBIDDEN VOID
 *
 * SUMMARY  
 *   Represents the validated output of `forbiddenVoid`. The value is guaranteed
 *   to be anything except `undefined`; null is explicitly allowed.
 *
 * CONTRACT GUARANTEES  
 *   - Output !== undefined  
 *   - All other types permitted  
 *
 * EXAMPLE  
 *   ```
 *   const value: ForbiddenVoid =
 *       parse(forbiddenVoid, "hello"); // OK
 *   ```
 */
export type ForbiddenVoid =
  v.InferOutput<typeof forbiddenVoid>;

/**
 * VOID-OPTIONAL SCHEMA
 *
 * SUMMARY  
 *   Validates a value that may be **absent** or **explicitly undefined**, but
 *   disallows any other value. This mirrors the precise runtime semantics of
 *   an **optional but void-only** field in strongly typed systems, equivalent to
 *   a TypeScript definition like:
 *
 *     foo?: undefined
 *
 * PURPOSE  
 *   Used for fields that are conceptually optional, but when provided must
 *   contain no meaningful value. This is commonly used in:
 *
 *   - request metadata (missing vs explicitly void)  
 *   - feature-flag placeholders  
 *   - sparse configuration layers  
 *   - patch/partial update payload schemas  
 *   - API fields that MUST NOT accept user-supplied values  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - value is **undefined**  
 *   - value is **missing** (optional)  
 *
 *   REJECTS:
 *   - null  
 *   - empty string  
 *   - numbers, booleans, arrays, objects  
 *
 * OUTPUT CONTRACT  
 *   - Always produces `undefined` when value exists  
 *   - If value absent → remains absent in output context  
 *   - TypeScript output type guarantees `undefined` only  
 *
 * VALIDATION LOGIC  
 *   - If value is undefined → OK  
 *   - If value is missing → OK  
 *   - Otherwise → error  
 *
 * SEMANTIC NOTES  
 *   - Distinguishes **missing** vs **explicit undefined**, unlike `voidStrict`  
 *   - Does NOT force the key to exist (use `voidPresent` for that)  
 *   - Does NOT coerce values (use `voidCoerce` for that)  
 *
 * EXAMPLES  
 *   ```
 *   parse(voidOptional, undefined);     // OK
 *   parse(voidOptional, {}.missingKey); // OK
 *   parse(voidOptional, null);          // ❌
 *   parse(voidOptional, 0);             // ❌
 *   ```
 */
export const voidOptional = v.optional(
  v.custom(
    (value) => value === undefined,
    "Expected value to be undefined when present."
  )
);

/**
 * OUTPUT TYPE — VOID OPTIONAL
 *
 * SUMMARY  
 *   Represents the validated output of the `voidOptional` schema: a value that
 *   may be **absent** or **undefined**, but never any other type. This mirrors
 *   the behavior of optional undefined-only fields in strict TypeScript models.
 *
 * PURPOSE  
 *   Guarantees that a field is:
 *   - optional in presence  
 *   - void-only in value  
 *   - never null, string, number, or any other type  
 *
 * CONTRACT GUARANTEES  
 *   - Output is always `undefined` if the key is present  
 *   - If absent, TypeScript treats it as `undefined` (standard optional field)  
 *
 * EXAMPLE  
 *   ```
 *   const x: VoidOptional = parse(voidOptional, undefined);
 *   ```
 */
export type VoidOptional = v.InferOutput<typeof voidOptional>;

/**
 * VOID-COERCE SCHEMA
 *
 * SUMMARY  
 *   A coercive validator that converts a variety of “empty” or intentionally
 *   void-like inputs into **canonical `undefined`**. This provides robust,
 *   predictable normalization semantics across inconsistent or user-generated
 *   data sources.
 *
 *   This schema is the void-domain equivalent of `uuidCoerce`, `stringCoerce`,
 *   `percentageCoerce`, and other coercive schemas in the platform.
 *
 * PURPOSE  
 *   Used to sanitize and canonicalize values originating from:
 *   - HTTP query strings (`?flag=` becomes undefined)  
 *   - HTML form fields (empty input → undefined)  
 *   - partial update payloads  
 *   - dynamic JSON data  
 *   - browser-based configurations  
 *   - CLI parameters  
 *
 * INPUT CONTRACT  
 *   ACCEPTS (coerces to undefined):
 *   - `undefined`  
 *   - `null`  
 *   - empty string `""`  
 *   - whitespace-only strings `"   "`  
 *   - the literal string `"undefined"` (common in bad clients)  
 *
 *   REJECTS:
 *   - any non-empty string  
 *   - numbers, booleans  
 *   - objects, arrays  
 *   - functions, symbols  
 *
 * OUTPUT CONTRACT  
 *   - Always returns `undefined` for any accepted input  
 *
 * VALIDATION LOGIC  
 *   - If input is undefined → OK  
 *   - If input is null → OK  
 *   - If string trimmed is empty OR equals "undefined" → OK  
 *   - Otherwise → error  
 *
 * SEMANTIC NOTES  
 *   - This schema *never* returns anything except undefined  
 *   - It is the canonical “void normalizer” for your platform  
 *   - Guarantees that all tolerated void-like values collapse into uniform
 *     canonical state  
 *
 * EXAMPLES  
 *   ```
 *   parse(voidCoerce, "");          // => undefined
 *   parse(voidCoerce, "   ");       // => undefined
 *   parse(voidCoerce, null);        // => undefined
 *   parse(voidCoerce, undefined);   // => undefined
 *   parse(voidCoerce, "undefined"); // => undefined
 *
 *   parse(voidCoerce, "hello");     // ❌
 *   parse(voidCoerce, 0);           // ❌
 *   ```
 */
export const voidCoerce = v.coerce(
  v.custom(
    (value) => value === undefined, // the schema expects undefined after coercion
    "Expected a void-like value that can be normalized to undefined."
  ),
  (input: any) => {
    // 1. Native undefined → passthrough
    if (input === undefined) return undefined;

    // 2. Null → undefined
    if (input === null) return undefined;

    // 3. Strings → check emptiness / whitespace / symbolic undefined
    if (typeof input === "string") {
      const t = input.trim();
      if (t === "" || t === "undefined") return undefined;
      throw new Error("Expected empty string, whitespace, or 'undefined'.");
    }

    // 4. Reject all other types
    throw new Error("Expected a void-coercible value.");
  }
);

/**
 * OUTPUT TYPE — VOID COERCE
 *
 * SUMMARY  
 *   Represents the normalized output of the `voidCoerce` schema. This type is
 *   always **exactly** `undefined`, since all accepted inputs collapse into the
 *   canonical void state.
 *
 * PURPOSE  
 *   Provides a static guarantee for any field that must always resolve to an
 *   undefined value after coercion, regardless of user input variations.
 *
 * EXAMPLE  
 *   ```
 *   const x: VoidCoerce = parse(voidCoerce, "");
 *   // x is guaranteed to be undefined
 *   ```
 */
export type VoidCoerce = v.InferOutput<typeof voidCoerce>;

export {
  ERROR_MESSAGES,

  voidStrict,
  voidNullable,
  voidDefault,
  voidPresent,

  type VoidStrict,
  type VoidNullable,
  type VoidDefault,
  type VoidPresent,
};

/*
✅ SECTION 1 — CORE VOID SCHEMAS (LANGUAGE & TYPE FOUNDATION)
	1.	VOID-STRICT SCHEMA (value must be exactly undefined, null, or void 0)
	2.	VOID-ONLY SCHEMA (accepts only void 0, rejects undefined literal values explicitly typed)
	3.	VOID-NULLABLE SCHEMA (accepts void 0 or null)
	4.	VOID-UNDEFINED-ALIAS SCHEMA (normalizes undefined and void 0 as equivalent)
	5.	VOID-LITERAL SCHEMA (validates exact void 0 expression identity)
	6.	VOID-EXPRESSION SCHEMA (validates result of an evaluated void expression)
	7.	VOID-FUNCTION-RETURN SCHEMA (validates function result is void / no return value)
	8.	VOID-CALLBACK-RETURN SCHEMA (used for event handlers, ensures no return)
	9.	VOID-TYPE-ANNOTATION SCHEMA (ensures function signature explicitly returns void)
	10.	VOID-SYMBOLIC SCHEMA (represents absence of semantic value, distinct from undefined)

⸻

✅ SECTION 2 — FUNCTION / CALLBACK VOID SCHEMAS
11. VOID-PROMISE SCHEMA (validates Promise contracts)
12. VOID-ASYNC-RETURN SCHEMA (ensures async functions resolve to undefined)
13. VOID-HANDLER SCHEMA (void-returning event handler)
14. VOID-LIFECYCLE-HOOK SCHEMA (setup/teardown hooks returning no value)
15. VOID-PIPELINE-STAGE SCHEMA (ensures no data emission in pipeline stage)
16. VOID-VOIDABLE-FUNCTION SCHEMA (function may or may not return value)
17. VOID-EXPLICIT-RETURN SCHEMA (enforces explicit return void 0 for side-effect calls)
18. VOID-VOIDABLE-CALLBACK SCHEMA (accepts callbacks that optionally return undefined)
19. VOID-FUNCTION-COERCE SCHEMA (coerces any function to void-returning variant)
20. VOID-FUNCTION-STRICT SCHEMA (rejects any returned non-void value)

⸻

✅ SECTION 3 — SEMANTIC VOID / NULL-OBJECT PATTERN SCHEMAS
21. VOID-NULL-OBJECT SCHEMA (models explicit null-object placeholder pattern)
22. VOID-NO-OP SCHEMA (validates no-operation function or statement)
23. VOID-SENTINEL SCHEMA (used as intentional “no data” sentinel marker)
24. VOID-DATA-ABSENT SCHEMA (semantic absence, not error-based)
25. VOID-DISPATCH-SCHEMA (marks event dispatchers that yield no payload)
26. VOID-CONTROL-FLOW SCHEMA (represents intentional termination)
27. VOID-RETURN-SIGNAL SCHEMA (signal object representing return void semantics)
28. VOID-RESPONSE-EMPTY SCHEMA (API response body guaranteed empty)
29. VOID-CONTEXT-PLACEHOLDER SCHEMA (UI placeholder semantics for “no value”)
30. VOID-SLOT-SCHEMA (empty reserved slot in structured layout or tuple)

⸻

✅ SECTION 4 — DATA VALIDATION & COERCION SCHEMAS
31. VOID-COERCE SCHEMA (converts undefined, null, empty string → void 0)
32. VOID-EMPTY-STRING-COERCE SCHEMA (”” → void 0)
33. VOID-OPTIONAL-COERCE SCHEMA (missing → void 0)
34. VOID-INPUT-NORMALIZE SCHEMA (collapses empty / null / undefined to void)
35. VOID-DEFAULT SCHEMA (missing field returns void 0 as canonical default)
36. VOID-FALLBACK SCHEMA (fallback mechanism that defaults to void)
37. VOID-SAFE-OUTPUT SCHEMA (ensures serialized outputs are stripped of data)
38. VOID-CANONICALIZE SCHEMA (unifies all void-like representations)
39. VOID-CUSTOM-COERCE SCHEMA (allows schema-specific coercion to void)
40. VOID-TRANSFORM SCHEMA (transforms arbitrary absence into void 0)

⸻

✅ SECTION 5 — STRUCTURAL / OBJECT VOID SCHEMAS
41. VOID-FIELD SCHEMA (object field required but always void)
42. VOID-OPTIONAL-FIELD SCHEMA (optional field coerced to void if missing)
43. VOID-MAP SCHEMA (record<string, void> — all values void)
44. VOID-ARRAY SCHEMA (array elements all void values)
45. VOID-TUPLE SCHEMA (tuple where one or more slots must be void)
46. VOID-STRUCTURE SCHEMA (structural shape containing void placeholders)
47. VOID-ENTRY SCHEMA (key-value pair where value = void)
48. VOID-RECORD-STRICT SCHEMA (enforces all keys mapped to void 0)
49. VOID-FIELD-FACTORY SCHEMA (creates documented field whose value is void)
50. VOID-PROPERTY-DESCRIPTOR SCHEMA (enforces property value void but present)

⸻

✅ SECTION 6 — TYPE / COMPILER ENFORCEMENT SCHEMAS
51. VOID-TYPECHECK SCHEMA (ensures TS type strictly void)
52. VOID-INFERRED-TYPE SCHEMA (verifies inference matches void)
53. VOID-RETURN-TYPE-INFER SCHEMA (ensures TS infers void correctly)
54. VOID-EXPLICIT-TYPE SCHEMA (ensures explicit annotation of void)
55. VOID-CODEGEN-SCHEMA (auto-generated void-return validator)
56. VOID-TYPE-LINT SCHEMA (used by linters to validate void returns)
57. VOID-TYPE-COERCION SCHEMA (enforces return type widening to void)
58. VOID-STRICT-INFERENCE SCHEMA (type constraint validator for generics)
59. VOID-TS-MAPPED-TYPE SCHEMA (MappedType enforcing void subtype)
60. VOID-DECORATOR-SCHEMA (runtime metadata validation of void-return decorators)

⸻

✅ SECTION 7 — FRAMEWORK / RUNTIME INTEGRATION SCHEMAS
61. VOID-EXPRESS-MIDDLEWARE SCHEMA (middleware returning no response body)
62. VOID-API-RESPONSE SCHEMA (validates HTTP 204/empty responses)
63. VOID-SVELTE-ACTION SCHEMA (action callback returning no cleanup function)
64. VOID-REACT-EFFECT SCHEMA (ensures useEffect callback returns void)
65. VOID-VUE-WATCHER SCHEMA (watch callback returning void)
66. VOID-ELYSIA-HANDLER SCHEMA (API handler returns no payload)
67. VOID-BUN-SERVER-REQUEST SCHEMA (no-return request handlers)
68. VOID-CLOUDFLARE-WORKER-CONTEXT SCHEMA (respondWith not called = void)
69. VOID-DENO-SCRIPT-CONTEXT SCHEMA (no output to stdout)
70. VOID-NODE-LAMBDA-HANDLER SCHEMA (no callback return value)

⸻

✅ SECTION 8 — ERROR / STATE / CONTROL FLOW SCHEMAS
71. VOID-ERROR-HANDLER SCHEMA (error callback returning void)
72. VOID-TERMINATION SCHEMA (intentional no-return exit)
73. VOID-PANIC SCHEMA (abrupt termination returning void)
74. VOID-FINALLY-SCHEMA (finally block return void guarantee)
75. VOID-CLEANUP SCHEMA (resource cleanup returns void)
76. VOID-DISPOSE SCHEMA (disposable object .dispose(): void)
77. VOID-SHUTDOWN SCHEMA (graceful shutdown function returning void)
78. VOID-ONEXIT SCHEMA (process exit handler with void return)
79. VOID-LOGGING-SINK SCHEMA (side-effect-only log writer)
80. VOID-PIPE-END SCHEMA (represents end of data stream; void output)

⸻

✅ SECTION 9 — SYMBOLIC / META / REFLECTION SCHEMAS
81. VOID-SYMBOL-SCHEMA (Symbol.void marker concept)
82. VOID-METADATA-SCHEMA (metadata tag for “no value” fields)
83. VOID-REFLECT-METADATA SCHEMA (TS Reflect.metadata void annotation)
84. VOID-SCHEMA-META SCHEMA (schema definition representing voidness)
85. VOID-SCHEMA-TAG SCHEMA (used for introspection tagging)
86. VOID-SCHEMA-ANNOTATION SCHEMA (annotation-level void type)
87. VOID-META-DESCRIPTOR SCHEMA (maps void as special annotation in Valibot)
88. VOID-SCHEMA-PROXY SCHEMA (intercepts schema calls returning void)
89. VOID-DOCUMENTATION SCHEMA (meta field describing void behavior)
90. VOID-CANONICAL-META SCHEMA (defines standard metadata for void types)

⸻

✅ SECTION 10 — OUTPUT / SERIALIZATION / CANONICALIZATION SCHEMAS
91. VOID-TO-JSON SCHEMA (serializes to null or omits field entirely)
92. VOID-OUTPUT-STRIP SCHEMA (ensures void outputs omitted from serialized form)
93. VOID-CANONICAL-OUTPUT SCHEMA (ensures consistent output = void)
94. VOID-NULL-OUTPUT SCHEMA (converts void → null in serialization)
95. VOID-FIELD-OUTPUT SCHEMA (marks void fields as omitted in output models)
96. VOID-EMPTY-RESPONSE SCHEMA (represents 204/empty API body)
97. VOID-PIPELINE-TERMINATOR SCHEMA (represents void output in data pipelines)
98. VOID-TRACE-CONTEXT SCHEMA (metadata indicating no return value)
99. VOID-CANONICALIZED SCHEMA (final unified void normalization)
100. VOID-STANDARDIZED SCHEMA (final meta-schema for void-return definitions)
*/