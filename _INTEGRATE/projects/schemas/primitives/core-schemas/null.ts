/**
 * NULL STRICT SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is **strictly the JavaScript `null` literal** and
 *   nothing else. This schema is the strongest possible representation of
 *   “intentional emptiness” and guarantees that callers cannot substitute:
 *
 *   - undefined  
 *   - empty strings  
 *   - zero  
 *   - false  
 *   - objects or arrays  
 *
 *   Only the explicit value `null` is accepted.
 *
 * PURPOSE  
 *   Used when an API, configuration object, or data specification must enforce
 *   the semantic meaning of **“explicitly cleared”** or **“deliberately blank”**.
 *
 *   This is essential for:
 *   - PATCH APIs where null = clear/delete  
 *   - database fields allowing null insertion  
 *   - form engines where null = user intentionally erased the value  
 *   - explicit override semantics  
 *   - nullable-but-strict metadata systems  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - the literal value `null`
 *
 *   REJECTS:
 *   - undefined  
 *   - missing keys  
 *   - empty strings or whitespace  
 *   - zero, false  
 *   - objects, arrays, functions  
 *
 * OUTPUT CONTRACT  
 *   Returns `null` unchanged.
 *
 * VALIDATION LOGIC  
 *   - Strict check: `value === null`  
 *   - Nothing else is permitted  
 *
 * SEMANTIC NOTES  
 *   - Use this schema when null has a **domain-specific meaning**, not simply
 *     “empty.”  
 *   - Distinguishes between “not provided” (undefined) and “explicitly cleared”
 *     (null), which is critical in many layered APIs.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   null
 *
 *   // Invalid
 *   undefined
 *   ""
 *   0
 *   false
 *   {}
 *   ```
 */
export const nullStrict = v.custom(
    (value) => value === null,
    "Expected value to be strictly null."
);

/**
* OUTPUT TYPE — STRICT NULL
*
* SUMMARY  
*   Represents a schema-validated value that is **guaranteed to be exactly
*   `null`**. This type models explicit-clearing semantics used in REST, forms,
*   database layers, and config systems.
*
* CONTRACT GUARANTEES  
*   - Always exactly `null`  
*   - Never undefined  
*   - Never coerced  
*   - Never substituted with empty values  
*
* EXAMPLE  
*   ```
*   const cleared: NullStrict =
*       parse(nullStrict, null);
*   ```
*/
export type NullStrict = v.InferOutput<typeof nullStrict>;

/**
 * NULL PRESENT SCHEMA
 *
 * SUMMARY  
 *   Validates that a field is **explicitly present** in the parent object and
 *   that its value is **strictly the literal JavaScript `null`**. This schema
 *   draws a clear semantic distinction between:
 *
 *   - a key that exists with value `null`  
 *   - a key that does not exist at all  
 *
 *   In many real-world systems, this distinction is critical for correctly
 *   expressing:
 *   - explicit clearing of values  
 *   - intentional nullification  
 *   - domain-specific “blanked out” states  
 *   - required-but-nullable fields  
 *   - PATCH semantics (null = “delete/clear this field”)  
 *
 * PURPOSE  
 *   Ensures that the API consumer or configuration author **intended** to
 *   specify `null`, rather than accidentally omitting the field.
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - keys that are explicitly present  
 *   - value strictly equal to `null`
 *
 *   REJECTS:
 *   - missing keys  
 *   - undefined  
 *   - empty strings  
 *   - falsy primitives  
 *   - objects, arrays, or any non-null value  
 *
 * OUTPUT CONTRACT  
 *   Always returns `null` unchanged.
 *
 * VALIDATION LOGIC  
 *   - Validate the value: `value === null`  
 *   - Validate field presence using `ctx.path`  
 *   - Reject anything else  
 *
 * SEMANTIC NOTES  
 *   - `nullPresent` is ideal for declarative clearing semantics in REST
 *     APIs, Form state engines, diff/patch models, and schema-governed
 *     configuration systems.
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   { status: null }
 *
 *   // Invalid (missing key)
 *   {}
 *
 *   // Invalid (wrong value)
 *   { status: undefined }
 *   { status: "" }
 *   { status: 0 }
 *   ```
 */
export const nullPresent = v.custom(
    (value, ctx) => {
        // Must be null
        if (value !== null) return false;

        // Must be present as a key (Valibot gives path only for present fields)
        return ctx?.path?.length > 0;
    },
    "Expected key to exist and value to be strictly null."
);

/**
 * OUTPUT TYPE — PRESENT-BUT-NULL
 *
 * SUMMARY  
 *   Represents a field that is both:
 *   - *guaranteed to exist* in the input object  
 *   - *guaranteed to have the literal value `null`*  
 *
 * PURPOSE  
 *   Models **intentional nullification** distinct from omission, undefined, or
 *   accidental emptiness.
 *
 * CONTRACT GUARANTEES  
 *   - Always exactly `null`  
 *   - Field was explicitly provided by caller  
 *   - Never undefined, never missing  
 *
 * EXAMPLE  
 *   ```
 *   const payload = parse(
 *     v.object({ reason: nullPresent }),
 *     { reason: null }
 *   );
 *
 *   const r: NullPresent = payload.reason;  // always null, always present
 *   ```
 */
export type NullPresent = v.InferOutput<typeof nullPresent>;

/**
 * NULL DEFAULT SCHEMA
 *
 * SUMMARY  
 *   Normalizes **missing or omitted input fields** into the literal JavaScript
 *   `null` value. This schema enforces a canonical representation of “no value”
 *   where `null` is used intentionally as the default state.
 *
 *   Unlike `nullStrict` and `nullPresent`, this schema **does not** require
 *   the key to be present. Missing keys are automatically upgraded into a
 *   deliberate `null` value.
 *
 * PURPOSE  
 *   Provides a stable, predictable “null-as-default” semantic used in:
 *   - database models with nullable defaults  
 *   - REST and GraphQL input types with default null fields  
 *   - configuration loaders (YAML/JSON) where keys may be omitted  
 *   - form engines where missing = null  
 *   - metadata schemas requiring a normalized null sentinel  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - null  
 *   - missing keys (normalized to null)  
 *
 *   REJECTS:
 *   - undefined  
 *   - empty strings or whitespace  
 *   - zero or false  
 *   - objects, arrays, symbols  
 *   - any non-null value  
 *
 * OUTPUT CONTRACT  
 *   Always returns the literal value `null`.  
 *   Missing fields → `null`  
 *   Provided null → `null`  
 *
 * VALIDATION LOGIC  
 *   - If input is null → OK  
 *   - If key is missing → default to null  
 *   - Otherwise → fail  
 *
 * SEMANTIC NOTES  
 *   - This schema is the **canonical choice** when a field must always resolve
 *     to null unless explicitly set to another type upstream.  
 *   - Ensures consumers never see undefined or accidental empty strings.  
 *   - Eliminates the common “null vs undefined vs empty” ambiguity.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid → output null
 *   {}
 *   { x: null }
 *
 *   // Invalid
 *   { x: undefined }
 *   { x: "" }
 *   { x: 0 }
 *   { x: false }
 *   ```
 */
export const nullDefault = v.optional(
    v.custom(
        (value) => value === null,
        "Expected value to be null (or omitted)."
    ),
    null
);

/**
* OUTPUT TYPE — DEFAULT NULL
*
* SUMMARY  
*   Represents a field whose value is guaranteed to be the literal JavaScript
*   `null`, even if the input omitted the field entirely. This creates a stable,
*   uniform representation for “no value” outputs.
*
* CONTRACT GUARANTEES  
*   - Output is always exactly `null`  
*   - Never undefined  
*   - Never coerced from non-null values  
*   - Missing keys become null  
*
* EXAMPLE  
*   ```
*   const obj = parse(
*     v.object({ hint: nullDefault }),
*     {}
*   );
*
*   const hint: NullDefault = obj.hint;  // → null
*   ```
*/
export type NullDefault = v.InferOutput<typeof nullDefault>;

/**
 * NULL–UNDEFINED SCHEMA
 *
 * SUMMARY  
 *   Validates inputs that may be **either the literal JavaScript `null` or the
 *   literal JavaScript `undefined`**. This schema models the complete set of
 *   “empty” or “unset” states frequently used in tolerant systems where `null`
 *   and `undefined` must be treated as **equally acceptable, explicitly allowed
 *   values**.
 *
 *   This is distinct from coercive schemas: *no conversion occurs*. Both values
 *   are simply recognized and preserved.
 *
 * PURPOSE  
 *   This schema is essential where a field can be:
 *   - *explicitly cleared*   → null  
 *   - *not provided / absent* → undefined  
 *
 *   And where **both states must be permitted**, without discrimination.
 *
 *   Common use cases:
 *   - PATCH APIs that distinguish null vs undefined but permit both  
 *   - form states allowing “cleared or untouched”  
 *   - schema-driven metadata with dual empty semantics  
 *   - null-tolerant configuration layers  
 *   - adapter/binding models bridging systems that use different empty
 *     conventions  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - null  
 *   - undefined  
 *
 *   REJECTS:
 *   - empty strings  
 *   - whitespace-only strings  
 *   - numbers, booleans  
 *   - objects, arrays  
 *   - symbols, functions  
 *   - any non-empty primitives  
 *
 * OUTPUT CONTRACT  
 *   Returns **exactly the provided input**, either:
 *   - `null`  
 *   - `undefined`  
 *
 *   Never coerces or transforms.
 *
 * VALIDATION LOGIC  
 *   - Check `value === null`  
 *   - OR check `value === undefined`  
 *   - Otherwise reject  
 *
 * SEMANTIC NOTES  
 *   - Use this schema in tolerant interfaces where the producer is allowed to
 *     choose either null or undefined depending on meaning.  
 *   - Particularly useful in *interoperability layers* between languages or
 *     systems with different notions of “empty.”  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   null
 *   undefined
 *
 *   // Invalid
 *   ""
 *   0
 *   false
 *   {}
 *   ```
 */
export const nullUndefined = v.custom(
    (value) => value === null || value === undefined,
    "Expected value to be null or undefined."
);/**
 * OUTPUT TYPE — NULL OR UNDEFINED
 *
 * SUMMARY  
 *   Represents a field whose value is guaranteed to be **either `null` or
 *   `undefined`**, preserving the dual-empty semantics used by APIs, config
 *   schemas, and tolerant domain models.
 *
 * CONTRACT GUARANTEES  
 *   - Output is always `null | undefined`  
 *   - Never coerced into another type  
 *   - Reflects exactly the caller’s intent  
 *
 * EXAMPLE  
 *   ```
 *   const v: NullUndefined =
 *       parse(nullUndefined, undefined);
 *
 *   const w: NullUndefined =
 *       parse(nullUndefined, null);
 *   ```
 */
export type NullUndefined = v.InferOutput<typeof nullUndefined>;

/**
 * OUTPUT TYPE — NULL OR UNDEFINED
 *
 * SUMMARY  
 *   Represents a field whose value is guaranteed to be **either `null` or
 *   `undefined`**, preserving the dual-empty semantics used by APIs, config
 *   schemas, and tolerant domain models.
 *
 * CONTRACT GUARANTEES  
 *   - Output is always `null | undefined`  
 *   - Never coerced into another type  
 *   - Reflects exactly the caller’s intent  
 *
 * EXAMPLE  
 *   ```
 *   const v: NullUndefined =
 *       parse(nullUndefined, undefined);
 *
 *   const w: NullUndefined =
 *       parse(nullUndefined, null);
 *   ```
 */
export type NullUndefined = v.InferOutput<typeof nullUndefined>;

/**
 * NULL COERCE SCHEMA
 *
 * SUMMARY  
 *   Normalizes a wide range of “empty”, “unset”, or “user-blanked” inputs into
 *   the canonical JavaScript `null` value. This schema provides a **robust,
 *   fault-tolerant coercion layer** suitable for real-world data ingestion,
 *   where null is the preferred representation of “no value”.
 *
 *   This schema collapses the following into literal `null`:
 *   - missing values  
 *   - undefined  
 *   - null  
 *   - empty strings ("")  
 *   - strings containing only whitespace  
 *
 *   No other values are permitted. The output is always `null`.
 *
 * PURPOSE  
 *   Designed for systems where null is the **canonical empty-state**, including:
 *   - HTML form parsing ("" → null)  
 *   - REST/GraphQL APIs with nullable optional fields  
 *   - config loaders treating absence as null  
 *   - database mappers where null inserts are permitted  
 *   - tolerant ingestion pipelines from user-controlled input  
 *
 *   Prevents inconsistent empty representations such as:
 *   - ""  
 *   - "   "  
 *   - undefined  
 *   - omitted keys  
 *
 * INPUT CONTRACT  
 *   ACCEPTS (all coerced to null):
 *   - undefined  
 *   - null  
 *   - ""  
 *   - whitespace-only strings  
 *   - missing keys (handled by parent schemas)  
 *
 *   REJECTS:
 *   - non-empty strings  
 *   - numbers  
 *   - booleans  
 *   - arrays, objects  
 *   - anything representing meaningful content  
 *
 * OUTPUT CONTRACT  
 *   Always returns `null`.  
 *   No other output is possible.
 *
 * VALIDATION LOGIC  
 *   - If input is null → return null  
 *   - If input is undefined → return null  
 *   - If input is missing → return null  
 *   - If input is a string AND whitespace-only → return null  
 *   - Anything else → fail validation  
 *
 * SEMANTIC NOTES  
 *   - Useful for eliminating “triple state ambiguity”:
 *       undefined vs null vs ""  
 *   - Guarantees downstream systems operate on *consistent empty values*.  
 *   - Prevents accidental propagation of empty-string placeholders.  
 *
 * EXAMPLES  
 *   ```
 *   // Valid → output null
 *   null
 *   undefined
 *   ""
 *   "   "
 *
 *   // Invalid
 *   "text"
 *   0
 *   false
 *   {}
 *   ```
 */
export const nullCoerce = v.coerce(
    v.custom(
        (value) => value === null,
        "Value cannot be coerced to null; non-empty content provided."
    ),
    (input: any) => {
        // Directly null → OK
        if (input === null) return null;

        // Undefined or missing → normalize to null
        if (input === undefined) return null;

        // Strings
        if (typeof input === "string") {
            // Empty/whitespace-only → null
            if (input.trim() === "") return null;

            // Non-empty → invalid
            throw new Error("Cannot coerce non-empty string to null.");
        }

        // All other values are invalid
        throw new Error("Cannot coerce value to null.");
    }
);

/**
* OUTPUT TYPE — COERCED NULL
*
* SUMMARY  
*   Represents a normalized “empty” value in systems that standardize on null
*   as the canonical representation. All accepted inputs are collapsed into
*   literal `null`, ensuring a stable, uniform empty state.
*
* CONTRACT GUARANTEES  
*   - Output is always exactly `null`  
*   - Never undefined  
*   - Never an empty string  
*   - Never coerced from meaningful content  
*
* EXAMPLE  
*   ```
*   const value: NullCoerce =
*       parse(nullCoerce, "   ");  // → null
*   ```
*/
export type NullCoerce = v.InferOutput<typeof nullCoerce>;

/**
 * NULL ARRAY SCHEMA
 *
 * SUMMARY  
 *   Validates an array in which **every element is strictly `null`**.  
 *   No coercion, no widening, and no tolerance for `undefined`, empty strings,
 *   or other “empty-like” values. This schema enforces a **pure null-only
 *   collection**, guaranteeing structural and semantic integrity.
 *
 * PURPOSE  
 *   Useful for systems that intentionally model:
 *   - placeholder slots  
 *   - sparse resource markers  
 *   - nullable lists in database models  
 *   - explicit null-only datasets  
 *   - reset operations (arrays of null for reinitialization)  
 *   - typed serialization formats  
 *
 *   Ensures impossible states remain impossible by forbidding:
 *   - accidental undefined insertion  
 *   - accidental empty-string placeholders  
 *   - partial/nullish mixed content  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - arrays containing **only literal null values**
 *
 *   REJECTS:
 *   - undefined  
 *   - empty strings  
 *   - numbers, booleans  
 *   - objects, arrays  
 *   - mixed arrays  
 *   - coercible values (this schema performs *no coercion*)  
 *
 * OUTPUT CONTRACT  
 *   - Returns the array unchanged  
 *   - Every element is guaranteed to be `null`
 *
 * VALIDATION LOGIC  
 *   - Input must be an array  
 *   - For each element:
 *       - value must be exactly `null`  
 *       - no coercion or normalization  
 *
 * SEMANTIC NOTES  
 *   - This is the strict, literal null-array validator  
 *   - Does not attempt to normalize undefined → null  
 *   - Does not trim or inspect content  
 *   - Perfect for models requiring intentional null-structure  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   [null, null]
 *   []
 *
 *   // Invalid
 *   [undefined]
 *   [null, ""]
 *   ["", null]
 *   [{}]
 *   [1, 2, 3]
 *   ```
 */
export const nullArray = v.array(
    v.null_(), // strict: must be literal null
    "Array must contain only null values."
);

/**
* OUTPUT TYPE — ARRAY OF NULL
*
* SUMMARY  
*   Represents a validated array containing **exclusively literal null
*   values**. Ensures downstream systems can depend on structural and semantic
*   uniformity with no mixed emptiness (undefined, "", etc.).
*
* CONTRACT GUARANTEES  
*   - Always an array  
*   - Every element is exactly `null`  
*   - Never undefined  
*   - Never coerced  
*   - Never mixed with empty-string placeholders  
*
* EXAMPLE  
*   ```
*   const arr: NullArray = parse(nullArray, [null, null]);
*   // arr: (null)[]
*   ```
*/
export type NullArray = v.InferOutput<typeof nullArray>;

/**
 * NULL RECORD SCHEMA
 *
 * SUMMARY  
 *   Validates that an input value is a **plain object (record)** whose keys map
 *   *exclusively* to literal `null` values. This schema is intentionally strict:
 *   no coercion, no tolerance for undefined, empty strings, or “empty-like”
 *   values. Every key–value pair must satisfy:
 *
 *     key: string
 *     value: null
 *
 *   This enforces a **pure null-valued mapping**, providing structural and
 *   semantic guarantees for downstream systems that rely on uniform null
 *   representation.
 *
 * PURPOSE  
 *   Designed for high-integrity data pipelines where object-based null mapping
 *   is required, such as:
 *   - database normalization layers  
 *   - sparse-field representations  
 *   - reset/clearing operations  
 *   - permission maps where null indicates explicit omission  
 *   - typed serialization formats  
 *   - transformation pipelines replacing values with null placeholders  
 *
 *   This schema prevents the common pitfalls of “mixed empty states”, such as:
 *   - undefined  
 *   - empty strings  
 *   - partial object structures  
 *   - unintentional non-null values  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - objects where every value is **exactly null**
 *
 *   REJECTS:
 *   - arrays  
 *   - functions  
 *   - numbers, strings, booleans  
 *   - objects with any non-null value  
 *   - undefined or omitted values  
 *   - objects with nested structures (unless values are literal null)  
 *
 * OUTPUT CONTRACT  
 *   - Returns the object unchanged  
 *   - Guarantees that *every* value is literal null  
 *
 * VALIDATION LOGIC  
 *   - Input must be a plain object  
 *   - Validate each value with strict `v.null_()`  
 *   - No coercion, no normalization  
 *
 * SEMANTIC NOTES  
 *   - This schema is the strict counterpart to `nullArray`  
 *   - Ideal for systems modeling “all-null placeholders”  
 *   - Enforces structural consistency and avoids ambiguous empty states  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   { a: null, b: null }
 *   {}
 *
 *   // Invalid
 *   { a: undefined }
 *   { a: "" }
 *   { a: 0 }
 *   { a: null, b: 1 }
 *   { a: {} }
 *   ```
 */
export const nullRecord = v.record(
    v.null_(),
    "Record must contain only null values."
);

/**
* OUTPUT TYPE — NULL-ONLY RECORD
*
* SUMMARY  
*   Represents a validated object whose keys map exclusively to the literal
*   JavaScript `null` value. Ensures that downstream callers never encounter
*   mixed-type “empty” representations, guaranteeing structural uniformity
*   across the entire record.
*
* CONTRACT GUARANTEES  
*   - Always a plain object  
*   - Keys are always strings  
*   - Every value is literally `null`  
*   - Never contains undefined or empty-string placeholders  
*   - Never coerces or transforms values  
*
* EXAMPLE  
*   ```
*   const rec: NullRecord = parse(nullRecord, {
*     reason: null,
*     note: null
*   });
*   ```
*/
export type NullRecord = v.InferOutput<typeof nullRecord>;

/**
 * NULL FIELD SCHEMA FACTORY
 *
 * SUMMARY  
 *   Produces a **strictly validated field object** containing:
 *
 *     {
 *       description: string;
 *       value: null;
 *     }
 *
 *   This pattern is used across enterprise-grade configuration, metadata
 *   mapping, form definition, and typed data-contract layers where every field
 *   must:
 *   - carry a human-readable description  
 *   - explicitly represent a null value  
 *   - conform to a uniform structure  
 *
 *   The schema enforces that the resulting object is always a well-formed,
 *   null-valued field descriptor with a guaranteed description string.
 *
 * PURPOSE  
 *   Used to build:
 *   - declarative config structures  
 *   - API metadata maps  
 *   - transformation descriptors  
 *   - introspection-friendly typed keys  
 *   - JSON-serializable definition layers  
 *
 *   Ensures consistency across all “field object” definitions by enforcing:
 *   - strict shape  
 *   - strict null semantics  
 *   - guaranteed documentation/description  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - an object with:
 *       - `description: string`
 *       - `value: null`
 *
 *   REJECTS:
 *   - missing fields  
 *   - undefined in place of null  
 *   - non-string descriptions  
 *   - any non-null value  
 *   - extra/unknown properties (via strictObject)  
 *
 * OUTPUT CONTRACT  
 *   Produces an object of the shape:
 *   ```
 *   {
 *     description: string;   // the provided `description` argument
 *     value: null;           // always null
 *   }
 *   ```
 *   The input's description string is discarded; the schema injects the
 *   externally supplied description into the output, guaranteeing field
 *   metadata consistency.
 *
 * VALIDATION LOGIC  
 *   - The input must match the object shape with no unknown keys  
 *   - `description` must be a string  
 *   - `value` must be literal null (via `v.null_()`)  
 *   - After validation, a transform step replaces `description` with the
 *     provided one  
 *
 * SEMANTIC NOTES  
 *   - The transform ensures consistent metadata across all fields, even when
 *     user/ingest input is inconsistent  
 *   - Enforces null-strict modeling: no coercion  
 *   - Ensures every field descriptor is documented uniformly  
 *
 * EXAMPLES  
 *   ```
 *   const field = createNullField("Reset flag")({
 *     description: "ignored",
 *     value: null
 *   });
 *
 *   // Output
 *   {
 *     description: "Reset flag",
 *     value: null
 *   }
 *   ```
 */
export const createNullField = (description: string) =>
    v
        .strictObject(
            {
                description: v.string("Description must be a string."),
                value: v.null_("Value must be null.")
            },
            "Null field must be an object with { description, value }."
        )
        .pipe(
            v.transform((input) => ({
                description,
                value: input.value
            }))
        );

/**
* OUTPUT TYPE — NULL FIELD DESCRIPTOR
*
* SUMMARY  
*   Represents the validated output structure of a null field descriptor
*   generated by `createNullField()`. This type guarantees a consistent shape
*   for all field-metadata objects representing a literal null value.
*
* CONTRACT GUARANTEES  
*   - `description` is always the compile-time string literal `T`  
*   - `value` is always exactly `null`  
*   - Extra keys are never present  
*   - Field shape is stable across versions, transforms, and schema evolution  
*
* SEMANTIC NOTES  
*   - Ensures strongly typed metadata for null-valued fields  
*   - Ideal for config generation, schema documentation, introspection, and
*     typed API responses  
*
* EXAMPLE  
*   ```
*   const ResetField: NullField<"Reset flag"> = {
*     description: "Reset flag",
*     value: null
*   };
*   ```
*/
export type NullField<T extends string = string> = {
    description: T;
    value: null;
};

/*
Atomic / strict variants:
	1.	NULL-STRICT-OPTIONAL SCHEMA — field may be omitted (undefined) or must be literal null when present. Combines nullStrict with optional.
	2.	NULL-STRICT-COERCE SCHEMA — accepts only explicit null but allows coercion of "null" (string literal) into actual null. Useful for tolerant string-based APIs.
	3.	NULL-ALIAS SCHEMA — accepts null and "null" string literals interchangeably (common in JSON/YAML ingestion).

⸻

Container variants:
4. NULL-TUPLE SCHEMA — validates a fixed-length tuple containing only null values (e.g., [null, null, null]).
5. NULL-SET SCHEMA — validates a Set where every entry is strictly null (e.g., new Set([null])).
6. NULL-MAP SCHEMA — validates a Map whose every value (and optionally key) is null.

⸻

Structural / meta / advanced:
7. NULL-INTERFACE SCHEMA — object where every field is null (deep null mapping). A deep structural version of nullRecord.
8. NULL-FIELD-ARRAY SCHEMA — array of NullField objects (e.g., metadata fields all describing null values).
9. NULL-UNION SCHEMA — explicit disallowed branch variant (e.g., v.union([nullStrict]) used to represent a null-only discriminator path).
10. NULL-PATTERN SCHEMA — regex-based validator that accepts only string "null" or rejects everything else; for pattern-based schema compatibility layers.
11. NULL-CONSTRAINT SCHEMA — refinement that ensures a derived constraint equals null; e.g., field computed from dependent input must resolve strictly to null.
12. NULL-META SCHEMA — internal registry metadata schema for marking schema entries as “nullable-by-design” in enterprise schema registries.
13. NULL-PLACEHOLDER SCHEMA — sentinel schema marking a “burned” or retired field that defaults to null but cannot be changed by user input.
*/