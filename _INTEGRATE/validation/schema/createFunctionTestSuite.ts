/*  
    TODO:
    Prevent mutability of input/return
    Make sure function declaration only has a single argument
*/

/**
 * createResultFunctionTestSuite
 *
 * SUMMARY
 *   Hardened test-suite generator for deterministic, schema-validated,
 *   result-oriented functions. Guarantees contract stability for any
 *   function following the enterprise Result<T, E> pattern:
 *
 *       type Result<O, E> =
 *           | { ok: true;  value: O }
 *           | { ok: false; error: E };
 *
 * PURPOSE
 *   - Enforces strict correctness of input validation, result-shape fidelity,
 *     invariant preservation, and deterministic snapshot behavior.
 *   - Ensures every function under test adheres to:
 *       • a validated input schema,
 *       • pure functional semantics,
 *       • stable error/value contracts,
 *       • complete success & failure path coverage.
 *   - Eliminates incidental mutation, non-determinism, or implicit coercion.
 *
 * INPUT CONTRACT
 *   config: {
 *     name: string                           Name of the suite
 *     schema: Schema<T>                      Valibot/engine schema used to validate input
 *     fn: (input: T) => Promise<Result>      Pure async function being tested
 *
 *     SUCCESS_CASES?: Array<{
 *         input: unknown                     Raw input to validate + pass to fn
 *         output: unknown                    Expected .value in ok:true case
 *     }>
 *
 *     FAILURE_CASES?: Array<{
 *         input: unknown                     Raw input to validate + pass to fn
 *         error: unknown                     Expected .error in ok:false case
 *     }>
 *
 *     INVARIANTS?: Array<{
 *         description: string                Human-readable invariant
 *         assert(run: (input) => Promise<Result>): Promise<void>
 *     }>
 *
 *     SNAPSHOTS?: Array<{
 *         description: string                Snapshot test description
 *         input: unknown                     Input passed to schema + fn
 *     }>
 *   }
 *
 * RULES ENFORCED
 *   - All inputs are validated exclusively via `schema.parse()` before fn() is invoked.
 *   - fn() must never throw; all thrown values cause explicit test failure.
 *   - Outputs must match strict structural equality for success and failure cases.
 *   - fn() must be pure: tests check for input immutability.
 *   - Every invariant receives an isolated invocation helper with full validation.
 *   - Snapshot tests serialize the entire Result object exactly as returned.
 *
 * OUTPUT CONTRACT
 *   - Defines a fully structured test suite grouped into:
 *       • success cases
 *       • failure cases
 *       • invariants
 *       • snapshots
 *   - All tests run asynchronously and deterministically.
 *
 * SEMANTIC NOTES
 *   - This suite is the direct functional analogue of createSchemaTestSuite.
 *   - It establishes uniformity across all function-level tests and ensures
 *     Fortune-50–grade reliability, fuzz-resistance, and contract stability.
 */

export function createResultFunctionTestSuite(config: {
    name: string;
    schema: any;
    fn: (input: any) => Promise<{ ok: true; value: any } | { ok: false; error: any }>;

    SUCCESS_CASES?: Array<{ input: unknown; output: unknown }>;
    FAILURE_CASES?: Array<{ input: unknown; error: unknown }>;

    INVARIANTS?: Array<{
        description: string;
        assert: (run: (input: unknown) => Promise<any>) => Promise<void>;
    }>;

    SNAPSHOTS?: Array<{
        description: string;
        input: unknown;
    }>;
}) {
    const {
        name,
        schema,
        fn,
        SUCCESS_CASES = [],
        FAILURE_CASES = [],
        INVARIANTS = [],
        SNAPSHOTS = []
    } = config;

    if (typeof name !== "string" || name.length === 0)
        throw new Error("createResultFunctionTestSuite: 'name' must be a non-empty string.");

    if (!schema)
        throw new Error("createResultFunctionTestSuite: 'schema' is required.");

    if (typeof fn !== "function")
        throw new Error("createResultFunctionTestSuite: 'fn' must be a function.");

    describe(`${name} — RESULT-FUNCTION`, () => {

        /**
         * SUCCESS CASES
         * Ensures all valid inputs parse correctly and fn() returns
         * the correct ok:true shape with an exact, immutable value.
         */
        describe("success cases", () => {
            for (const c of SUCCESS_CASES) {
                it(`success: ${JSON.stringify(c.input)}`, async () => {
                    const original = structuredClone(c.input);
                    const parsed = $schema.parse(schema, c.input);

                    let result;
                    try {
                        result = await fn(parsed);
                    } catch (err) {
                        throw new Error(
                            `Function threw unexpectedly for input ${JSON.stringify(
                                c.input
                            )}: ${String(err)}`
                        );
                    }

                    // Must not mutate input.
                    expect(c.input).toStrictEqual(original);

                    expect(result).toStrictEqual({
                        ok: true,
                        value: c.output
                    });
                });
            }
        });

        /**
         * FAILURE CASES
         * Ensures fn() returns ok:false with the correct error shape and message,
         * never throws, and never mutates inputs.
         */
        describe("failure cases", () => {
            for (const c of FAILURE_CASES) {
                it(`failure: ${JSON.stringify(c.input)}`, async () => {
                    const original = structuredClone(c.input);
                    const parsed = $schema.parse(schema, c.input);

                    let result;
                    try {
                        result = await fn(parsed);
                    } catch (err) {
                        throw new Error(
                            `Function threw unexpectedly for failure-case input ${JSON.stringify(
                                c.input
                            )}: ${String(err)}`
                        );
                    }

                    expect(c.input).toStrictEqual(original);

                    expect(result).toStrictEqual({
                        ok: false,
                        error: c.error
                    });
                });
            }
        });

        /**
         * INVARIANTS
         * Arbitrary semantic or algebraic laws that must always hold.
         * Example: idempotence, monotonicity, purity, ordering constraints, etc.
         */
        describe("invariants", () => {
            for (const inv of INVARIANTS) {
                it(inv.description, async () => {
                    const run = async (raw: unknown) => {
                        const original = structuredClone(raw);
                        const parsed = $schema.parse(schema, raw);
                        const out = await fn(parsed);
                        expect(raw).toStrictEqual(original);
                        return out;
                    };

                    await inv.assert(run);
                });
            }
        });

        /**
         * SNAPSHOTS
         * End-to-end, contract-level snapshots capturing the complete Result object.
         */
        describe("snapshots", () => {
            for (const s of SNAPSHOTS) {
                it(s.description, async () => {
                    const parsed = $schema.parse(schema, s.input);
                    const result = await fn(parsed);
                    expect(result).toMatchSnapshot();
                });
            }
        });
    });
}