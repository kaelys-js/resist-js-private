import * as v from "valibot";

/* ============================================================
   HELPERS
============================================================ */

// camelCase: must start with letter, contain only letters/numbers,
// must NOT start with capital, must NOT contain spaces/hyphens/underscores.
const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;

export const camelCaseString = v.string([
    v.regex(camelCaseRegex, "Name must be camelCase (e.g., requestInfo, deviceProfile).")
]);

// Description: 1 sentence → 1 paragraph.
export const descriptionString = v.string([
    v.minLength(10, "Description must be at least one full sentence."),
    v.maxLength(500, "Description must be no more than one paragraph (500 chars).")
]);

// Lifecycle: startup, exit, error, request, client-ready, interval, custom
export const lifecycleEnum = v.union([
    v.literal("startup"),
    v.literal("exit"),
    v.literal("error"),
    v.literal("request"),
    v.literal("client-ready"),
    v.literal("interval"),
    v.literal("custom")
]);

// Tags: "browser", "mobile", "node", "cloudflare", "aws", etc.
export const tagString = v.string([
    v.minLength(1),
    v.maxLength(40)
]);


/* ============================================================
   COLLECTOR SCHEMA (STRICT)
============================================================ */

export const collectorSchema = v.strictObject({
    /**
     * Unique identifier for the collector.
     * Must be camelCase.
     */
    name: camelCaseString,

    /**
     * Human-readable description.
     * Required: 1 sentence to 1 paragraph.
     */
    description: descriptionString,

    /**
     * Collector function.
     * It must never throw → wrapper ensures safe behavior.
     * Can sync or async.
     */
    run: v.any(), // actual validation done at runtime wrapper

    /**
     * Lifecycle triggers.
     * Optional.
     */
    when: v.optional(v.array(lifecycleEnum)),

    /**
     * Optional tag array (e.g., "browser", "mobile", "serverless").
     */
    tags: v.optional(v.array(tagString))
});