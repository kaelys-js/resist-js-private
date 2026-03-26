/**
 * NEVER STRICT SCHEMA
 *
 * SUMMARY  
 *   A schema that **accepts absolutely no runtime value**, enforcing the concept
 *   of an impossible state within a validated structure. Any attempt to provide
 *   *any* value — including null, undefined, empty strings, numbers, objects, or
 *   even missing fields — results in a validation failure.
 *
 *   This schema exists to model **logically unreachable values** or deliberately
 *   disabled data paths in strongly typed systems.
 *
 * PURPOSE  
 *   Useful for:
 *   - marking fields as intentionally impossible  
 *   - enforcing exhaustive checking  
 *   - “turned-off” config fields  
 *   - versioned schemas where older fields must never reappear  
 *   - preventing partial structures from leaking into validated data  
 *   - migrations where a field must be removed but still validated  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - no values at all  
 *
 *   REJECTS (always):
 *   - null  
 *   - undefined  
 *   - missing  
 *   - strings  
 *   - numbers  
 *   - arrays  
 *   - objects  
 *   - any other possible JS value  
 *
 * OUTPUT CONTRACT  
 *   - There is no possible output.  
 *   - The type is `never`.  
 *
 * VALIDATION LOGIC  
 *   - Always fails on parse  
 *   - Always throws ERROR (`Value must not exist.`)  
 *
 * SEMANTIC NOTES  
 *   - Ideal for representing “dead” or “burned” fields  
 *   - Guarantees impossible states remain impossible  
 *   - Equivalent to forbidden fields in JSON schema  
 *   - Useful in large monorepos during refactors or controlled migrations  
 *
 * EXAMPLES  
 *   ```
 *   parse(neverStrict, anyValue)  // always throws
 *
 *   // Example usage:
 *   const schema = v.object({
 *     oldField: neverStrict
 *   });
 *
 *   // Any incoming data containing oldField → rejected.
 *   ```
 */
export const neverStrict = v.custom(
    () => false,
    "Value must not exist."
);

/**
* OUTPUT TYPE — STRICT NEVER
*
* SUMMARY  
*   Represents the output of the `neverStrict` schema: a value that can *never*
*   exist. This type is the pure TypeScript `never` type.
*
* CONTRACT GUARANTEES  
*   - No runtime value can satisfy this schema  
*   - Output type is guaranteed to be `never`  
*   - Useful in sophisticated type-level modeling  
*
* EXAMPLE  
*   ```
*   function takesNever(x: NeverStrict) {
*     // unreachable
*   }
*   ```
*/
export type NeverStrict = v.InferOutput<typeof neverStrict>;

/**
 * NEVER DEFAULT SCHEMA
 *
 * SUMMARY  
 *   Represents a field that is **permitted to be absent**, but when present,
 *   must satisfy an impossible constraint: the field must contain **no valid
 *   runtime value**. Any provided value triggers a validation failure.
 *
 *   This schema is ideal when maintaining backward-compatibility during
 *   migrations, where a field must not exist anymore but cannot be outright
 *   deleted from all input sources.
 *
 * PURPOSE  
 *   Used to model:
 *   - deprecated fields  
 *   - removed schema keys  
 *   - “burned” configuration entries  
 *   - forbidden optional fields  
 *   - controlled migration paths  
 *   - fields not allowed in certain versions  
 *
 *   Ensures strict rules:
 *   - field **may be omitted entirely**  
 *   - field **must never appear with a value**  
 *   - field **must never contain any data whatsoever**  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `undefined` (missing or explicitly undefined)
 *
 *   REJECTS:
 *   - null  
 *   - empty strings  
 *   - numbers  
 *   - booleans  
 *   - arrays, objects  
 *   - *any* provided runtime value  
 *
 * OUTPUT CONTRACT  
 *   - Output is always `undefined`  
 *   - If value is present → validation fails  
 *
 * VALIDATION LOGIC  
 *   - If input === undefined → valid  
 *   - Otherwise → immediate failure  
 *
 * SEMANTIC NOTES  
 *   - This is the “optional but forbidden” schema  
 *   - Enforces structure without allowing accidental data resurrection  
 *   - Guarantees safe removal of legacy fields in evolving schemas  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   undefined
 *
 *   // Invalid
 *   null
 *   ""
 *   123
 *   {}
 *   ```
 */
export const neverDefault = v.custom(
    (value) => value === undefined,
    "This field must not contain any value."
);

/**
* OUTPUT TYPE — OPTIONAL NEVER
*
* SUMMARY  
*   Represents the output of the `neverDefault` schema:  
*   a value that is **always undefined**, and can never legally contain any
*   meaningful value.
*
*   This type is structurally identical to `undefined`, but semantically
*   represents a **forbidden optional field**.
*
* CONTRACT GUARANTEES  
*   - Always results in `undefined`  
*   - Cannot ever be assigned a value  
*
* EXAMPLE  
*   ```
*   const v: NeverDefault = parse(neverDefault, undefined);
*   // v is undefined
*   ```
*/
export type NeverDefault = v.InferOutput<typeof neverDefault>;

/**
 * NEVER ARRAY SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is an **array which must always be empty**, with
 *   zero elements, and with **no possibility** of containing any runtime value.
 *   This schema enforces a strict “no contents permitted” policy, making it
 *   ideal for modeling intentionally disabled or deprecated list fields.
 *
 *   Unlike coercive schemas, this validator performs *no normalization*:
 *   - Does NOT convert null → []  
 *   - Does NOT allow undefined elements  
 *   - Does NOT allow sparse arrays  
 *   - Does NOT allow accidental empty-string placeholders  
 *
 * PURPOSE  
 *   Useful when representing:
 *   - disabled array-type fields  
 *   - deprecated list structures  
 *   - placeholder fields that must remain empty  
 *   - migration contexts where an array field exists structurally but should
 *     never contain real data  
 *   - enforcing invariants in complex configuration schemas  
 *
 *   Ensures:
 *   - array may exist structurally  
 *   - array must always contain **zero items**  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `[]` (empty arrays only)
 *
 *   REJECTS:
 *   - any array with at least one element  
 *   - sparse arrays (`[ , ]`)  
 *   - null  
 *   - undefined  
 *   - any non-array value  
 *   - arrays containing null, undefined, objects, primitives, etc.  
 *
 * OUTPUT CONTRACT  
 *   - Always returns an empty array `[]`  
 *   - Never includes any elements  
 *
 * VALIDATION LOGIC  
 *   - Input must be an array  
 *   - Input length must be 0  
 *   - Failure if any element exists (including undefined)  
 *
 * SEMANTIC NOTES  
 *   - Use this schema when the *existence* of the array is allowed, but the
 *     *presence of entries* is forbidden  
 *   - Ideal for phased deprecation of legacy list fields  
 *   - Represents the “impossible-list” equivalent of `neverStrict`  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   []
 *
 *   // Invalid
 *   [null]
 *   [undefined]
 *   [1, 2]
 *   [""]
 *   [{}]
 *   [ , ]           // sparse array
 *   ```
 */
export const neverArray = v.custom(
    (value) => Array.isArray(value) && value.length === 0,
    "Array must be empty and contain no values."
);

/**
* OUTPUT TYPE — EMPTY NEVER ARRAY
*
* SUMMARY  
*   The output of the `neverArray` schema: a TypeScript type representing an
*   array that is guaranteed to be **always empty**. This is effectively a
*   readonly `[]` state with no possible elements.
*
* CONTRACT GUARANTEES  
*   - Always an array  
*   - Length is always zero  
*   - No element type is permitted  
*   - Equivalent to `never[]` but concretely always `[]`  
*
* EXAMPLE  
*   ```
*   const xs: NeverArray = parse(neverArray, []);
*   // xs is always []
*   ```
*/
export type NeverArray = v.InferOutput<typeof neverArray>;

/**
 * NEVER RECORD SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is a **plain object with zero keys**, enforcing that
 *   **no properties are ever allowed to exist**. This schema is the strict,
 *   record-level counterpart to `neverStrict`, ensuring that even optional or
 *   nullable object fields cannot appear.
 *
 *   Unlike partial or loose validators, this schema performs a **full structural
 *   prohibition of object keys**: if *any* key is present — regardless of its
 *   value — validation fails immediately.
 *
 * PURPOSE  
 *   Used to represent:
 *   - deprecated or “burned” object fields  
 *   - versioned data contracts that must not permit nested structures  
 *   - objects whose presence is allowed but must remain empty  
 *   - placeholder nodes in evolving schemas  
 *   - explicit “no content permitted” configuration zones  
 *   - migration scenarios where legacy nested objects must not reappear  
 *
 *   Guarantees:
 *   - object may exist structurally  
 *   - object must contain **no data whatsoever**  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - `{}` (empty object only)
 *
 *   REJECTS:
 *   - any object with at least one key  
 *   - arrays  
 *   - functions  
 *   - primitives (string, number, boolean, symbol)  
 *   - null  
 *   - undefined  
 *   - objects containing undefined or null values  
 *   - ANY runtime value other than `{}`  
 *
 * OUTPUT CONTRACT  
 *   - Always returns an empty object `{}`  
 *   - No keys are added, removed, or transformed  
 *
 * VALIDATION LOGIC  
 *   - Input must be a plain object  
 *   - `Object.keys(value).length` must equal 0  
 *   - Otherwise → fail with `"Object must be empty and contain no properties."`  
 *
 * SEMANTIC NOTES  
 *   - Represents the canonical “empty-record” invariant  
 *   - Acts as a structural firewall preventing resurrection of deprecated nested fields  
 *   - Perfect for precisely-typed configuration layers in enterprise schemas  
 *
 * EXAMPLES  
 *   ```
 *   // Valid
 *   {}
 *
 *   // Invalid
 *   { a: 1 }
 *   { a: undefined }
 *   { a: null }
 *   { nested: {} }
 *   { x: [] }
 *   []               // not an object
 *   null
 *   ```
 */
export const neverRecord = v.custom(
    (value) =>
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0,
    "Object must be empty and contain no properties."
);

/**
* OUTPUT TYPE — EMPTY NEVER RECORD
*
* SUMMARY  
*   Represents the validated output of the `neverRecord` schema: a TypeScript
*   type corresponding to an **always-empty object** (`{}`). No keys may ever be
*   present, and no alternative shapes are allowed.
*
* CONTRACT GUARANTEES  
*   - Always a plain object  
*   - Always `{}`  
*   - No keys permitted  
*   - No value ever permitted  
*
* TYPE MODEL  
*   Equivalent to:
*   ```
*   type NeverRecord = {};
*   ```
*
* EXAMPLE  
*   ```
*   const obj: NeverRecord = parse(neverRecord, {});
*   // obj is always {}
*   ```
*/
export type NeverRecord = v.InferOutput<typeof neverRecord>;

/**
 * NEVER FIELD SCHEMA FACTORY
 *
 * SUMMARY  
 *   Constructs a **strict, immutable field descriptor** whose value can *never*
 *   exist. The output object always has the shape:
 *
 *     {
 *       description: string;
 *       value: never;
 *     }
 *
 *   This schema is the canonical representation of a **logically unreachable
 *   field**, allowing structural presence while prohibiting all runtime values.
 *
 * PURPOSE  
 *   Designed for enterprise-grade contract enforcement scenarios where fields
 *   must remain:
 *   - structurally defined  
 *   - fully documented  
 *   - guaranteed to never carry data  
 *
 *   Typical use cases:
 *   - fully deprecated fields that cannot be removed yet  
 *   - “burned” configuration entries  
 *   - versioned schemas where a field must exist but be unusable  
 *   - placeholder nodes in evolving API specifications  
 *   - strict invariants: “this field must never have content”  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - an object with:
 *       - description: string
 *       - value: anything (but will *fail* unless undefined)
 *
 *   REJECTS:
 *   - null  
 *   - empty strings for description  
 *   - any provided value for `value`  
 *   - missing description  
 *   - extra properties (via strictObject)  
 *
 * OUTPUT CONTRACT  
 *   Produces:
 *   ```
 *   {
 *     description: <provided description string>;
 *     value: undefined;   // type is never
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - Input must be a strict object  
 *   - `description` must be a non-empty string  
 *   - `value` must be `undefined` (required for compatibility with JS)  
 *   - A transform step injects the canonical field description and a `value`
 *     that is statically typed as `never`  
 *
 * SEMANTIC NOTES  
 *   - At runtime, JS cannot hold a literal `never`, so the value is represented
 *     as `undefined` — **but typed as never**, ensuring no assignment is allowed.
 *   - This allows the field to be **present**, **validated**, **documented**, and
 *     **guaranteed empty forever**.  
 *
 * EXAMPLES  
 *   ```
 *   const field = parse(
 *     createNeverField("Legacy field (disabled)"),
 *     { description: "ignored", value: undefined }
 *   );
 *
 *   // Output
 *   {
 *     description: "Legacy field (disabled)",
 *     value: undefined   // but TS type: never
 *   }
 *   ```
 */
export const createNeverField = (description: string) =>
    v
        .strictObject(
            {
                description: v.string("Description must be a string."),
                value: v.custom(
                    (val) => val === undefined,
                    "This field must never contain a value."
                )
            },
            "Never field must be an object with { description, value }."
        )
        .pipe(
            v.transform(() => ({
                description,
                // TS output type: never
                value: undefined as never
            }))
        );

/**
* OUTPUT TYPE — NEVER FIELD DESCRIPTOR
*
* SUMMARY  
*   Represents a field descriptor whose value is **impossible** (`never`) and
*   whose description is the compile-time literal `T`. Provides a fully typed,
*   documented, and strict contract that guarantees **no value can ever exist
*   for this field**.
*
* CONTRACT GUARANTEES  
*   - `description` is always exactly the literal type `T`  
*   - `value` is always of type `never`  
*   - No additional keys are permitted  
*
* SEMANTIC NOTES  
*   - Used for strongly enforcing that a field is intentionally disabled  
*   - The runtime representation uses `undefined` because JavaScript cannot
*     represent a literal `never`  
*   - TypeScript ensures the value is impossible to assign  
*
* EXAMPLE  
*   ```
*   const Disabled: NeverField<"Legacy flag"> = {
*     description: "Legacy flag",
*     value: undefined  // TS type is never
*   };
*   ```
*/
export type NeverField<T extends string = string> = {
    description: T;
    value: never;
};

/*
Atomic extensions (fine-grained variants):
	1.	NEVER-NULL SCHEMA — explicitly rejects null (specialized alias for neverStrict when nullable paths must be banned).
	2.	NEVER-OPTIONAL SCHEMA — rejects all except undefined (explicit alias of neverDefault, intended for strict optionals).
	3.	NEVER-COERCE SCHEMA — coercion-disabled variant ensuring no transformations or defaulting ever occur.
	4.	NEVER-UNION SCHEMA — used as a union member placeholder to mark forbidden variants (e.g., v.union([neverStrict])).

⸻

Container / collection variants:
5. NEVER-TUPLE SCHEMA — fixed-length tuple schema enforcing zero elements; equivalent to an empty tuple [].
6. NEVER-SET SCHEMA — validates only an empty Set (new Set()), disallowing all entries.
7. NEVER-MAP SCHEMA — validates only an empty Map (new Map()), disallowing all keys/values.
8. NEVER-INTERFACE SCHEMA — object with all properties mapped to neverStrict; used for total structural bans on entire interfaces.

⸻

Pattern / symbolic / structural forms:
9. NEVER-PATTERN SCHEMA — rejects all strings using an always-false regex (e.g., /(?!)/); used in pattern-based validation frameworks.
10. NEVER-CONSTRAINT SCHEMA — refinement that always fails (v.refine(() => false)), for pipeline or refinement layers.
11. NEVER-PLACEHOLDER SCHEMA — schema marker used as a registry sentinel for deprecated or “retired” schema definitions.
12. NEVER-META SCHEMA — metadata-level schema for marking schema entries as “burned” or “retired” in registry systems.
13. NEVER-FIELD-ARRAY SCHEMA — array of NeverField objects that must itself be empty; hybrid of field + container semantics.
14. NEVER-UNION-BRANCH SCHEMA — explicit disallowed discriminator branch (e.g., legacy union variant that must never reappear).
*/