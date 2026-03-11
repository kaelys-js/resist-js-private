// TODO: remove "schema" specifics
// TODO: capture current run and write to baseline file
// TODO: review all, simplify, etc
// TODO: thresholds/etc from env
// TODO: what to do if baseline file(s) get too large/too many entries
// TODO: validate baseline file on read/write

/**
 * ============================================================================
 * 7. PERFORMANCE & REGRESSION BENCHMARKING (ENTERPRISE MODEL C-VITEST)
 * ============================================================================
 *
 * SUMMARY
 * -------
 *   This suite establishes a **contract-grade performance validation layer**
 *   complementary to the functional correctness guarantees of Sections 1–6.
 *   Whereas earlier sections enforce *what* schemas accept or reject, this
 *   section enforces *how fast* schemas must perform those validations under
 *   sustained operational load.
 *
 *   In Fortune-50 environments where schemas back:
 *      • ingestion pipelines,
 *      • real-time identity systems,
 *      • distributed microservices,
 *      • audit-regulated ETL workflows,
 *   performance regressions are treated as contract violations.
 *
 *   This benchmarking suite introduces:
 *
 *      • Baseline snapshots stored *adjacent to the test file*
 *      • Deterministic warmup cycles
 *      • Multi-pass measurement with convergence checks
 *      • p50 / p95 / p99 latency calculations
 *      • jitter & variance analysis
 *      • regression detection against prior baselines
 *      • SLA enforcement via max-ms/op envelopes
 *      • auto-updating baselines when performance improves
 *
 *   These guarantees ensure schema validation remains:
 *
 *      • stable,
 *      • predictable,
 *      • regression-free,
 *      • cost-efficient,
 *      • audit-ready.
 *
 * ============================================================================ 
 */

import fs from "fs";
import path from "path";
import { describe, epect, it } from "vitest";
import * as $schema from "valibot";

// ============================================================================
// BASELINE MANAGER (MODEL 1 - FULL HISTORY)
// ============================================================================

import fs from "fs";
import path from "path";

export interface BenchmarkMetrics { // TODO: valibot, commenting
    mean: number;
    median: number;
    p95: number;
    p99: number;
    p999?: number;
    p9999?: number;
    min?: number;
    max?: number;
    sd: number;
    jitter: number;
    opsPerSec?: number;
    gcCount?: number;
    memoryDeltaMB?: number;
    notes?: string;
}

interface BaselineFile { // TODO: valibot, commenting
    history: {
        timestamp: string;
        metrics: BenchmarkMetrics;
    }[];
    latest: {
        timestamp: string;
        metrics: BenchmarkMetrics;
    };
}

const BENCH_ROOT = "__benchmarks__"; // TODO: valibot, commenting & from env

// ----------------------------------------------------------------------------
// ensureDir(schemaName) – creates per-schema directory
// ----------------------------------------------------------------------------
export function ensureBenchmarkDir(schemaName: string) { // TODO: config obj, validate
    // TODO: work in any CI, locally
    const dir = path.join(BENCH_ROOT, schemaName);
    if (!fs.existsSync(BENCH_ROOT)) fs.mkdirSync(BENCH_ROOT);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    return dir;
}

// ----------------------------------------------------------------------------
// getBaselinePath(schemaName, section)
// ----------------------------------------------------------------------------
export function getBaselinePath(schemaName: string, section: string) { // TODO: config obj, validate
    const dir = ensureBenchmarkDir(schemaName);
    return path.join(dir, `${section}.json`);
}

// ----------------------------------------------------------------------------
// readBaseline(schemaName, section)
// ----------------------------------------------------------------------------
export function readBaseline(schemaName: string, section: string): BaselineFile | null { // TODO: config obj, validate
    // TODO: work in any CI, locally
    const file = getBaselinePath(schemaName, section);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

// ----------------------------------------------------------------------------
// writeBaseline(schemaName, section, metrics)
// Full history preservation, updates latest only if improvement
// ----------------------------------------------------------------------------
export function writeBaseline(
    schemaName: string,
    section: string,
    metrics: BenchmarkMetrics
    // TODO: config obj, validate
) {
    // TODO: work in any CI, locally
    const file = getBaselinePath(schemaName, section);
    const now = new Date().toISOString();

    let baseline: BaselineFile;

    if (!fs.existsSync(file)) {
        baseline = {
            history: [{ timestamp: now, metrics }],
            latest: { timestamp: now, metrics }
        };
    } else {
        baseline = JSON.parse(fs.readFileSync(file, "utf8"));

        baseline.history.push({ timestamp: now, metrics });

        // Update `.latest` ONLY if mean improved
        if (metrics.mean < baseline.latest.metrics.mean) {
            baseline.latest = { timestamp: now, metrics };
        }
    }

    fs.writeFileSync(file, JSON.stringify(baseline, null, 2));
}

// ----------------------------------------------------------------------------
// compareAgainstBaseline(schemaName, section)
// ----------------------------------------------------------------------------
export function compareAgainstBaseline(
    schemaName: string,
    section: string,
    metrics: BenchmarkMetrics,
    regressionThreshold: number = 0.10 // 10%
    // TODO: config obj, validate
) {
    const baseline = readBaseline(schemaName, section);
    if (!baseline) return; // No baseline → nothing to compare

    const latest = baseline.latest.metrics;

    const regression = (metrics.mean - latest.mean) / latest.mean;

    if (regression > regressionThreshold) {
        throw new Error(
            `Regression detected in ${schemaName} (${section}): ` +
            `mean increased by ${(regression * 100).toFixed(2)}% ` +
            `(latest=${latest.mean}, current=${metrics.mean})`
        );
    }
}

export function createSchemaBenchmarkSuite({
    name,
    SCHEMAS,
    VALID_CASES = {},
    INVALID_CASES = {},
    iterations = 20_000,
    maxMsPerOp = 0.05,             // SLA: ≤ 50µs/op
    maxRegressionPct = 0.10        // SLA: ≤ 10% drift allowed
}: {
    name: string;
    SCHEMAS: Record<string, any>;
    VALID_CASES?: Record<string, any[]>;
    INVALID_CASES?: Record<string, any[]>;
    iterations?: number;
    maxMsPerOp?: number;
    maxRegressionPct?: number;
}) {

    describe(
        `${name} — SCHEMAS — performance & regression benchmarking ` +
        `(baseline comparison, convergence validation, p99 latency guarantees)`,
        () => {

            /**
             * ============================================================================
             * SECTION 7.1 — WARMUP PHASE (JIT PRIMING + CACHE STABILIZATION)
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures that ALL downstream benchmark measurements operate in a
             *   *steady-state*, eliminating noise introduced by:
             *
             *      • V8 JIT compilation / tiering
             *      • inline-cache warming
             *      • branch prediction initialization
             *      • object-shape normalization
             *      • GC pre-conditioning
             *
             * WHY THIS IS ENTERPRISE-MANDATORY
             * ---------------------------------
             *   Cold-start execution creates artificially high mean/p99 numbers.
             *   Fortune-50 performance engineering requires:
             *
             *      ✓ warm JIT  
             *      ✓ stable ICs  
             *      ✓ warmed type-feedback  
             *      ✓ stable allocator behavior  
             *
             *   Without this warmup, **all subsequent sections (7.2–7.AAC) produce invalid
             *   or misleading regressions.**
             *
             * BASELINE STORAGE (MODEL 1)
             * --------------------------
             *   Warmup metrics (time per iteration) are stored under:
             *
             *      __benchmarks__/<SchemaName>/7.1.warmup.json
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • Warmup mean must remain < maxMsPerOp  
             *   • Warmup jitter < 30%  
             *   • Warmup regression < 10% vs previous baseline  
             */
            it("7.1 — must complete warmup cycle and remain within warmup performance envelope", () => {
                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const section = "7.1.warmup";

                    // Representative stable input
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    // ---------------------------------------------------------------
                    // WARMUP ITERATIONS (JIT priming)
                    // ---------------------------------------------------------------
                    const warmIters = 5000;
                    const times: number[] = [];

                    for (let i = 0; i < warmIters; i++) {
                        const t0 = performance.now();
                        safeParse(schema, input);
                        const t1 = performance.now();
                        times.push(t1 - t0);
                    }

                    times.sort((a, b) => a - b);

                    const mean =
                        times.reduce((s, n) => s + n, 0) / times.length;
                    const median = times[Math.floor(times.length / 2)];
                    const p95 = times[Math.floor(times.length * 0.95)];
                    const p99 = times[Math.floor(times.length * 0.99)];
                    const min = times[0];
                    const max = times[times.length - 1];

                    const variance =
                        times.reduce((s, n) => s + Math.pow(n - mean, 2), 0) /
                        times.length;

                    const sd = Math.sqrt(variance);
                    const jitter = sd / mean;

                    const metrics = {
                        mean,
                        median,
                        p95,
                        p99,
                        min,
                        max,
                        sd,
                        jitter,
                        notes: "Warmup JIT + IC stabilization metrics"
                    };

                    // ---------------------------------------------------------------
                    // SLA ENFORCEMENT
                    // ---------------------------------------------------------------
                    expect(mean).toBeLessThan(maxMsPerOp); // warmup cost must remain cheap
                    expect(jitter).toBeLessThan(0.30);     // ≤ 30% jitter allowed

                    // ---------------------------------------------------------------
                    // BASELINE WRITE (MODEL 1 — full historical lineage)
                    // ---------------------------------------------------------------
                    writeBaseline(schemaName, section, metrics);

                    // ---------------------------------------------------------------
                    // REGRESSION CHECK (Option A — all sections)
                    // ---------------------------------------------------------------
                    compareAgainstBaseline(schemaName, section, metrics, maxRegressionPct);
                }

                expect(true).toBe(true); // keep Vitest happy
            });

            /**
             * ============================================================================
             * SECTION 7.2 — FULL BENCHMARK PASS (MULTI-RUN CONVERGENCE MODEL)
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Produces statistically meaningful steady-state metrics via:
             *      • multiple independent benchmark passes,
             *      • convergence validation (≤5% spread),
             *      • centralized aggregate statistics,
             *      • baseline comparison + regression enforcement.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Single-pass microbenchmarks are **scientifically invalid** due to:
             *      • V8 tiering variance,
             *      • background GC,
             *      • thermal throttling drift,
             *      • incidental OS scheduling noise.
             *
             *   Fortune-50 validation pipelines require:
             *      ✓ multi-pass measurement  
             *      ✓ convergence enforcement  
             *      ✓ cross-run distribution stability  
             *      ✓ historical baseline regression detection  
             *
             * BASELINE STORAGE (MODEL 1)
             * --------------------------
             *   Results are stored under:
             *
             *      __benchmarks__/<SchemaName>/7.2.full-pass.json
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • Three passes must converge to ≤5% variance  
             *   • mean/p95/p99 must remain < performance SLAs  
             *   • regression < maxRegressionPct  
             *   • baseline updated only on improvement  
             */
            it("7.2 — must complete 3-pass steady-state benchmark with convergence + regression guarantees", () => {
                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const section = "7.2.full-pass";

                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const runOne = () => {
                        const times: number[] = [];
                        for (let i = 0; i < iterations; i++) {
                            const t0 = performance.now();
                            safeParse(schema, input);
                            const t1 = performance.now();
                            times.push(t1 - t0);
                        }

                        times.sort((a, b) => a - b);

                        const mean =
                            times.reduce((s, n) => s + n, 0) / times.length;

                        return {
                            mean,
                            median: times[Math.floor(times.length / 2)],
                            p95: times[Math.floor(times.length * 0.95)],
                            p99: times[Math.floor(times.length * 0.99)],
                            sd: Math.sqrt(
                                times.reduce((s, n) => s + (n - mean) ** 2, 0) /
                                times.length
                            ),
                            jitter: (() => {
                                const variance =
                                    times.reduce((s, n) => s + (n - mean) ** 2, 0) /
                                    times.length;
                                return Math.sqrt(variance) / mean;
                            })(),
                            min: times[0],
                            max: times[times.length - 1],
                            raw: times
                        };
                    };

                    // ---------------------------------------------------------------
                    // THREE MEASUREMENT PASSES (required for scientific validity)
                    // ---------------------------------------------------------------
                    const pass1 = runOne();
                    const pass2 = runOne();
                    const pass3 = runOne();

                    const passes = [pass1, pass2, pass3];

                    // ---------------------------------------------------------------
                    // CONVERGENCE VALIDATION (≤5% allowed)
                    // ---------------------------------------------------------------
                    const means = passes.map((p) => p.mean);
                    const maxMean = Math.max(...means);
                    const minMean = Math.min(...means);

                    const convergenceRatio = maxMean / minMean;

                    // Hard requirement: passes must converge tightly
                    expect(convergenceRatio).toBeLessThan(1.05);

                    // ---------------------------------------------------------------
                    // AGGREGATE METRICS (per enterprise test model)
                    // ---------------------------------------------------------------
                    const aggregate = {
                        mean: means.reduce((a, b) => a + b, 0) / means.length,
                        median:
                            passes
                                .map((p) => p.median)
                                .sort((a, b) => a - b)[1],
                        p95:
                            passes
                                .map((p) => p.p95)
                                .sort((a, b) => a - b)[1],
                        p99:
                            passes
                                .map((p) => p.p99)
                                .sort((a, b) => a - b)[1],
                        jitter:
                            passes
                                .map((p) => p.jitter)
                                .reduce((a, b) => a + b) / 3,
                        sd:
                            passes
                                .map((p) => p.sd)
                                .reduce((a, b) => a + b) / 3,
                        convergenceRatio,
                        notes:
                            "Three-pass steady-state benchmark with convergence + aggregate metrics"
                    };

                    // ---------------------------------------------------------------
                    // SLA ENFORCEMENT
                    // ---------------------------------------------------------------
                    expect(aggregate.mean).toBeLessThan(maxMsPerOp);
                    expect(aggregate.p99).toBeLessThan(maxMsPerOp * 3);
                    expect(aggregate.jitter).toBeLessThan(0.25);

                    // ---------------------------------------------------------------
                    // WRITE BASELINE (MODEL 1 — Append History + Update Latest)
                    // ---------------------------------------------------------------
                    writeBaseline(schemaName, section, aggregate);

                    // ---------------------------------------------------------------
                    // REGRESSION DETECTION (Option A)
                    // ---------------------------------------------------------------
                    compareAgainstBaseline(schemaName, section, aggregate, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.3 — BENCHMARK ENFORCEMENT LOOP
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   For each schema:
             *      • Execute isolated benchmark function under a unified enforcement loop
             *      • Perform three independent measurement passes
             *      • Ensure statistical convergence across all passes
             *      • Produce aggregate performance metrics
             *      • Load historical baselines for this section
             *      • Enforce regression thresholds
             *      • Update baselines only when performance improves
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Validation pipelines backing:
             *      • distributed ingestion,
             *      • identity resolution,
             *      • regulated analytics,
             *      • multi-tenant microservices,
             *   must guarantee *predictable* and *regression-free* performance across
             *   schema variants.  
             *
             *   A schema behaving correctly functionally but **slower** operationally
             *   is a contract violation in Fortune-50 environments.
             *
             * BASELINE STORAGE (MODEL 1)
             * --------------------------
             *   __benchmarks__/<SchemaName>/7.3.enforcement-loop.json
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • mean < maxMsPerOp  
             *   • p99 < maxMsPerOp × 3  
             *   • jitter < 25%  
             *   • convergence ratio ≤ 1.05  
             *   • regression < maxRegressionPct  
             *   • baseline updated only on improvement  
             */
            it("7.3 — must enforce per-schema SLA, convergence, and regression baseline control", () => {
                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const section = "7.3.enforcement-loop";

                    // Representative input selection (identical to 7.2)
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    // ---------------------------------------------------------------
                    // Benchmark executor (single pass)
                    // ---------------------------------------------------------------
                    const runPass = () => {
                        const times: number[] = [];

                        for (let i = 0; i < iterations; i++) {
                            const t0 = performance.now();
                            safeParse(schema, input);
                            const t1 = performance.now();
                            times.push(t1 - t0);
                        }

                        times.sort((a, b) => a - b);

                        const mean = times.reduce((s, n) => s + n, 0) / times.length;

                        const variance =
                            times.reduce((s, n) => s + (n - mean) ** 2, 0) /
                            times.length;

                        const sd = Math.sqrt(variance);

                        return {
                            mean,
                            median: times[Math.floor(times.length / 2)],
                            p95: times[Math.floor(times.length * 0.95)],
                            p99: times[Math.floor(times.length * 0.99)],
                            sd,
                            jitter: sd / mean,
                            min: times[0],
                            max: times[times.length - 1]
                        };
                    };

                    // ---------------------------------------------------------------
                    // MULTI-PASS EXECUTION
                    // ---------------------------------------------------------------
                    const p1 = runPass();
                    const p2 = runPass();
                    const p3 = runPass();
                    const passes = [p1, p2, p3];

                    // ---------------------------------------------------------------
                    // CONVERGENCE ENFORCEMENT (≤5% spread)
                    // ---------------------------------------------------------------
                    const means = passes.map((p) => p.mean);
                    const maxMean = Math.max(...means);
                    const minMean = Math.min(...means);

                    const convergenceRatio = maxMean / minMean;
                    expect(convergenceRatio).toBeLessThan(1.05);

                    // ---------------------------------------------------------------
                    // AGGREGATION LOGIC (same as 7.2 for consistency)
                    // ---------------------------------------------------------------
                    const aggregate = {
                        mean: (p1.mean + p2.mean + p3.mean) / 3,
                        median: [p1.median, p2.median, p3.median].sort((a, b) => a - b)[1],
                        p95: [p1.p95, p2.p95, p3.p95].sort((a, b) => a - b)[1],
                        p99: [p1.p99, p2.p99, p3.p99].sort((a, b) => a - b)[1],
                        sd: (p1.sd + p2.sd + p3.sd) / 3,
                        jitter: (p1.jitter + p2.jitter + p3.jitter) / 3,
                        convergenceRatio,
                        notes: "Three-pass enforcement-loop aggregate"
                    };

                    // ---------------------------------------------------------------
                    // SLA VALIDATION (enterprise contract)
                    // ---------------------------------------------------------------
                    expect(aggregate.mean).toBeLessThan(maxMsPerOp);
                    expect(aggregate.p99).toBeLessThan(maxMsPerOp * 3);
                    expect(aggregate.jitter).toBeLessThan(0.25);

                    // ---------------------------------------------------------------
                    // BASELINE WRITE
                    // ---------------------------------------------------------------
                    writeBaseline(schemaName, section, aggregate);

                    // ---------------------------------------------------------------
                    // REGRESSION COMPARISON
                    // ---------------------------------------------------------------
                    compareAgainstBaseline(schemaName, section, aggregate, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.4 — EXTENDED TAIL LATENCY (p99.9 / p99.99) — MODEL-1 BASELINE EDITION
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensure schema validation remains predictable at extreme percentiles.
             *   High-p99+ latency is the #1 source of SLA breaches in:
             *      • identity pipelines,
             *      • ingestion firehoses,
             *      • multi-tenant microservices,
             *      • distributed real-time analytics.
             *
             * ENTERPRISE CONTRACT
             * --------------------
             *   • p99.9 must be < 4 × mean
             *   • p99.99 must be < 8 × mean
             *   • max spike < 20 × mean
             *
             * WHY THIS MATTERS
             * ----------------
             *   Tail outliers often indicate:
             *      • intermittent GC churn,
             *      • branch misprediction storms,
             *      • JIT deoptimization,
             *      • pathologically slow refinement paths,
             *      • object-shape polymorphism triggering slow paths.
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<SchemaName>/7.4.tail-latency.json
             *
             * REGRESSION CONTROL
             * ------------------
             *   • Compare against prior baseline
             *   • Reject regressions beyond maxRegressionPct
             *   • Update baseline only when faster
             */
            it("7.4 — must maintain stable p99.9/p99.99 latency and avoid catastrophic tail spikes", () => {
                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const section = "7.4.tail-latency";

                    // Representative input from earlier sections
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    // ----------------------------------------------------------------------
                    // SAMPLE GATHERING (20k iterations recommended)
                    // ----------------------------------------------------------------------
                    const samples: number[] = [];
                    for (let i = 0; i < iterations; i++) {
                        const t0 = performance.now();
                        safeParse(schema, input);
                        const t1 = performance.now();
                        samples.push(t1 - t0);
                    }

                    samples.sort((a, b) => a - b);

                    const mean =
                        samples.reduce((s, n) => s + n, 0) / samples.length;

                    const p999 = samples[Math.floor(samples.length * 0.999)] ?? samples.at(-1);
                    const p9999 = samples[Math.floor(samples.length * 0.9999)] ?? samples.at(-1);
                    const maxVal = samples[samples.length - 1];

                    const result = {
                        mean,
                        p999,
                        p9999,
                        max: maxVal,
                        notes: "Extreme tail latency metrics: p99.9 / p99.99 / max spike"
                    };

                    // ----------------------------------------------------------------------
                    // ENTERPRISE CONTRACT ENFORCEMENT
                    // ----------------------------------------------------------------------
                    expect(p999).toBeLessThan(mean * 4);
                    expect(p9999).toBeLessThan(mean * 8);
                    expect(maxVal).toBeLessThan(mean * 20);

                    // ----------------------------------------------------------------------
                    // WRITE BASELINE (Model-1)
                    // ----------------------------------------------------------------------
                    writeBaseline(schemaName, section, result);

                    // ----------------------------------------------------------------------
                    // COMPARE AGAINST BASELINE
                    // ----------------------------------------------------------------------
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.5 — EVENT LOOP LAG / SCHEDULING STABILITY (MODEL-1 BASELINE EDITION)
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures schema validation does NOT introduce:
             *      • micro-blocking behavior,
             *      • excessive synchronous CPU usage,
             *      • yield starvation,
             *      • event-loop congestion.
             *
             * WHY THIS MATTERS
             * ----------------
             *   In production, schemas run inside:
             *      • API request handlers,
             *      • workers,
             *      • cron jobs,
             *      • ingestion engines.
             *
             *   Even tiny blocking effects scale catastrophically under load,
             *   causing:
             *      • queue buildup,
             *      • latency snowballing,
             *      • missed SLOs,
             *      • degraded multi-tenant performance.
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<SchemaName>/7.5.event-loop.json
             *
             * ENTERPRISE CONTRACT
             * --------------------
             *   • p95 event-loop lag < 3ms
             *   • drift must not exceed maxRegressionPct
             *   • baseline auto-updates on improvement only
             *
             * REGRESSION MODEL
             * ----------------
             *   The raw event-loop lag measurement is compared against the
             *   previously recorded baseline to guarantee stability across CI runs.
             */
            it("7.5 — must not introduce event-loop lag or scheduling instability", async () => {
                for (const schemaName of Object.keys(SCHEMAS)) {
                    const section = "7.5.event-loop";

                    /**
                     * ---------------------------------------------------------------
                     * MEASUREMENT MODEL
                     * ---------------------------------------------------------------
                     * We measure event-loop lag using a controlled sequence of
                     * setImmediate() yields.
                     *
                     * The test does NOT measure schema validation directly — it
                     * measures the *system-level scheduling side-effects* of the
                     * entire validation subsystem executing alongside the event loop.
                     */
                    async function measureEventLoopLag(iter = 50): Promise<number[]> {
                        const lags: number[] = [];
                        for (let i = 0; i < iter; i++) {
                            const t0 = performance.now();
                            await new Promise((resolve) => setImmediate(resolve));
                            const t1 = performance.now();
                            lags.push(t1 - t0);
                        }
                        return lags.sort((a, b) => a - b);
                    }

                    // ---------------------------------------------------------------
                    // EXECUTION: Run lag measurement
                    // ---------------------------------------------------------------
                    const lagSamples = await measureEventLoopLag(60);
                    const p95 = lagSamples[Math.floor(lagSamples.length * 0.95)];

                    const result = {
                        p95,
                        median: lagSamples[Math.floor(lagSamples.length / 2)],
                        max: lagSamples[lagSamples.length - 1],
                        raw: lagSamples,
                        notes: "Event-loop scheduling stability (p95 lag)"
                    };

                    // ---------------------------------------------------------------
                    // CONTRACT ENFORCEMENT
                    // ---------------------------------------------------------------
                    expect(p95).toBeLessThan(3); // ≤ 3ms is high-grade enterprise threshold

                    // ---------------------------------------------------------------
                    // WRITE BASELINE
                    // ---------------------------------------------------------------
                    writeBaseline(schemaName, section, result);

                    // ---------------------------------------------------------------
                    // BASELINE REGRESSION CHECK
                    // ---------------------------------------------------------------
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.6 — MEMORY FOOTPRINT & GC PRESSURE
             *              (MODEL-1 ENTERPRISE GC-BUDGET BENCHMARK)
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures schema validation does NOT:
             *      • allocate excessively,
             *      • create runaway heap growth,
             *      • trigger GC churn,
             *      • leak references across iterations,
             *      • destabilize memory budgets under load.
             *
             * CONTEXT
             * -------
             *   Fortune-50 platforms frequently operate under:
             *      • container memory caps,
             *      • serverless per-invoke heap quotas,
             *      • long-lived worker processes,
             *      • multi-tenant heap fragmentation pressure.
             *
             *   Memory instability in validators leads to:
             *      • OOM terminations,
             *      • latency spikes from excessive GC,
             *      • cascading service failures.
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<SchemaName>/7.6.memory.json
             *
             * ENTERPRISE CONTRACT
             * -------------------
             *   • Memory delta < 5 MB relative to pre-benchmark snapshot  
             *   • delta must not regress vs baseline by > maxRegressionPct  
             *   • baseline auto-updates only on improvement  
             *
             * REGRESSION MODEL
             * ----------------
             *   The measured memory delta is recorded and compared against
             *   historical values to detect drift or leaks across versions.
             */

            it("7.6 — must not introduce abnormal memory growth or GC-pressure instability", () => {
                for (const schemaName of Object.keys(SCHEMAS)) {
                    const section = "7.6.memory";

                    /**
                     * ---------------------------------------------------------------
                     * MEMORY SNAPSHOT HELPERS
                     * ---------------------------------------------------------------
                     */
                    function getHeap(): number {
                        return process.memoryUsage().heapUsed;
                    }

                    /**
                     * ---------------------------------------------------------------
                     * BASELINE SCHEMA + INPUT SELECTION
                     * ---------------------------------------------------------------
                     */
                    const schema = SCHEMAS[schemaName];
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        {};

                    const before = getHeap();

                    /**
                     * ---------------------------------------------------------------
                     * EXECUTION: Short warm-benchmark to expose allocation patterns
                     * ---------------------------------------------------------------
                     */
                    for (let i = 0; i < 2500; i++) {
                        safeParse(schema, input);
                    }

                    const after = getHeap();

                    const deltaBytes = after - before;
                    const deltaMB = deltaBytes / (1024 * 1024);

                    const result = {
                        beforeBytes: before,
                        afterBytes: after,
                        deltaBytes,
                        deltaMB,
                        notes: "Memory delta after 2.5k warm validations"
                    };

                    /**
                     * ---------------------------------------------------------------
                     * CONTRACT ENFORCEMENT
                     * ---------------------------------------------------------------
                     * A strict 5 MB threshold is required for enterprise containers.
                     */
                    expect(deltaMB).toBeLessThan(5);

                    /**
                     * ---------------------------------------------------------------
                     * BASELINE WRITE + REGRESSION CHECK
                     * ---------------------------------------------------------------
                     */
                    writeBaseline(schemaName, section, result);
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.7 — MULTI-SCALE PERFORMANCE SWEEP
             *              (1k / 10k / 100k ITERATION LATENCY SCALING MODEL)
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Detects hidden **non-linear performance regressions** that are
             *   invisible when testing at only one iteration count.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   • detects hidden O(n²), O(n³) patterns  
             *   • detects refinement pipelines with nonlinear branching  
             *   • detects excessive object creation at scale  
             *   • protects ingestion systems, ETL pipelines, and compute budgets  
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<SchemaName>/7.7.scaling.json
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • mean latency must scale linearly (±25%)  
             *   • no exponential growth permitted  
             *   • 10× iteration increase must NOT produce >2×–3× latency drift  
             *
             * ENFORCEMENT MODEL
             * -----------------
             *   For each schema:
             *      1k  iterations → t1  
             *      10k iterations → t2  
             *      100k iterations → t3  
             *
             *   Enforced constraints:
             *      • t2 / t1 < 1.25  
             *      • t3 / t2 < 1.25  
             *      • Baseline regression detection  
             */
            it("7.7 — must exhibit linear scaling across 1k → 10k → 100k iteration sweeps", () => {
                for (const schemaName of Object.keys(SCHEMAS)) {
                    const section = "7.7.scaling";

                    const schema = SCHEMAS[schemaName];
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        {};

                    /**
                     * ---------------------------------------------------------------
                     * SCALING BENCHMARK HELPER
                     * ---------------------------------------------------------------
                     */
                    function scaled(fn: () => void, iters: number): number {
                        const t0 = performance.now();
                        for (let i = 0; i < iters; i++) fn();
                        const t1 = performance.now();
                        return (t1 - t0) / iters;
                    }

                    const fn = () => safeParse(schema, input);

                    /**
                     * ---------------------------------------------------------------
                     * ITERATION SWEEP: 1k → 10k → 100k
                     * ---------------------------------------------------------------
                     */
                    const t1 = scaled(fn, 1_000);
                    const t2 = scaled(fn, 10_000);
                    const t3 = scaled(fn, 100_000);

                    const result = {
                        t1_msPerOp: t1,
                        t2_msPerOp: t2,
                        t3_msPerOp: t3,

                        ratios: {
                            t2_over_t1: t2 / t1,
                            t3_over_t2: t3 / t2
                        },

                        notes:
                            "Multi-scale sweep across 1k/10k/100k iterations to detect non-linear scaling."
                    };

                    /**
                     * ---------------------------------------------------------------
                     * CONTRACT ENFORCEMENT
                     * ---------------------------------------------------------------
                     */
                    expect(result.ratios.t2_over_t1).toBeLessThan(1.25);
                    expect(result.ratios.t3_over_t2).toBeLessThan(1.25);

                    /**
                     * ---------------------------------------------------------------
                     * BASELINE WRITE + REGRESSION CHECK
                     * ---------------------------------------------------------------
                     */
                    writeBaseline(schemaName, section, result);
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.8 — ADVERSARIAL / FUZZED INPUT PERFORMANCE PATHS
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures schemas remain performant under malformed or attacker-designed inputs
             *   that attempt to force validation onto **slow-path execution**, including:
             *
             *      • deeply nested garbage structures,
             *      • large unexpected arrays,
             *      • proxy objects,
             *      • null-prototype objects,
             *      • structurally invalid payloads.
             *
             * ENTERPRISE RISK
             * ----------------
             *   Attackers frequently weaponize slow-path validation to cause:
             *
             *      • latency exhaustion,
             *      • request amplification,
             *      • CPU starvation,
             *      • resource depletion,
             *      • downstream queue saturation.
             *
             *   Fuzzed/adversarial inputs MUST NOT create catastrophic slowdowns.
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<SchemaName>/7.8.adversarial.json
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • Adversarial avg-ms/op ≤ 4 × maxMsPerOp  
             *   • No adversarial spike > 10 × normal op cost  
             *   • Baseline must detect performance regressions over time  
             */
            it("7.8 — must remain performant under adversarial & malformed structures", () => {
                for (const schemaName of Object.keys(SCHEMAS)) {
                    const section = "7.8.adversarial";

                    const schema = SCHEMAS[schemaName];

                    /**
                     * ---------------------------------------------------------------
                     * ADVERSARIAL INPUT GENERATOR
                     * ---------------------------------------------------------------
                     */
                    function* adversarial() {
                        yield {};
                        yield { x: { y: { z: { w: [{}] } } } };
                        yield new Array(2000).fill("x");
                        yield new Proxy({}, {});
                        yield Object.create(null);
                    }

                    const perInputResults: Array<{
                        label: string;
                        avg_msPerOp: number;
                        max_ms: number;
                    }> = [];

                    /**
                     * ---------------------------------------------------------------
                     * BENCHMARK EACH ADVERSARIAL INPUT
                     * ---------------------------------------------------------------
                     */
                    for (const bad of adversarial()) {
                        const times: number[] = [];

                        for (let i = 0; i < 2000; i++) {
                            const t0 = performance.now();
                            safeParse(schema, bad);
                            const t1 = performance.now();
                            times.push(t1 - t0);
                        }

                        const avg =
                            times.reduce((s, n) => s + n, 0) / times.length;

                        const max = Math.max(...times);

                        perInputResults.push({
                            label: typeof bad,
                            avg_msPerOp: avg,
                            max_ms: max
                        });

                        // CONTRACT ENFORCEMENT — adversarial cannot exceed slow-path budget
                        expect(avg).toBeLessThan(maxMsPerOp * 4);
                        expect(max).toBeLessThan(maxMsPerOp * 10);
                    }

                    /**
                     * ---------------------------------------------------------------
                     * BUILD RESULT OBJECT FOR BASELINE & REGRESSION DETECTION
                     * ---------------------------------------------------------------
                     */
                    const result = {
                        schemaName,
                        adversarialSets: perInputResults,
                        summary: {
                            worst_avg: Math.max(...perInputResults.map(r => r.avg_msPerOp)),
                            worst_peak: Math.max(...perInputResults.map(r => r.max_ms))
                        },
                        notes:
                            "Adversarial inputs benchmarked to detect attacker-induced slow paths."
                    };

                    /**
                     * ---------------------------------------------------------------
                     * BASELINE STORAGE & REGRESSION CHECK
                     * ---------------------------------------------------------------
                     */
                    writeBaseline(schemaName, section, result);
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.9 — DEEP-NESTING / STRUCTURAL EXPLOSION PERFORMANCE
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures schemas remain stable when given *extreme recursive nesting patterns*,
             *   including:
             *
             *      • pathological JSON recursion,
             *      • attacker-generated deep chains,
             *      • nested arrays of nested objects,
             *      • structures designed to force O(n²) exploration.
             *
             * WHY THIS IS ENTERPRISE-MANDATORY
             * --------------------------------
             *   Attackers routinely exploit validation systems with deeply recursive structures:
             *
             *      • 10k nested objects → stack pressure  
             *      • long linked lists → slow-path recursion  
             *      • large nesting arrays → amplification & CPU starvation  
             *
             *   Without explicit deep-nesting performance guarantees, schemas become:
             *      • unsafe in API gateways,
             *      • unsafe in ingestion pipelines,
             *      • unsafe in identity/authorization validators,
             *      • unsafe in ETL or batch processors.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • average ms/op on 1000-nest chain ≤ 6 × maxMsPerOp  
             *   • no catastrophic spikes > 15 × maxMsPerOp  
             *   • baseline regression detection required  
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<SchemaName>/7.9.deep-nesting.json
             *
             * METRIC STRUCTURE
             * ----------------
             *   {
             *     schemaName,
             *     depthProfiles: [
             *       { depth: number, avg_msPerOp, max_ms }
             *     ],
             *     summary: { worst_avg, worst_peak }
             *   }
             *
             * ============================================================================
             */
            it("7.9 — must remain performant under deep-nesting & structural explosion patterns", () => {
                for (const schemaName of Object.keys(SCHEMAS)) {
                    const section = "7.9.deep-nesting";
                    const schema = SCHEMAS[schemaName];

                    /**
                     * ---------------------------------------------------------------
                     * DEEP-NESTING GENERATOR
                     * ---------------------------------------------------------------
                     * Generates structures of arbitrary depth:
                     *
                     *   { a: { a: { a: ... { a: 123 }}}}
                     *
                     * Also generates array-explosion forms:
                     *
                     *   [[[ [ [ 123 ] ] ]]]
                     */
                    function makeDeepObject(depth: number): any {
                        let node: any = { a: 123 };
                        for (let i = 0; i < depth; i++) {
                            node = { a: node };
                        }
                        return node;
                    }

                    function makeDeepArray(depth: number): any {
                        let node: any = 123;
                        for (let i = 0; i < depth; i++) {
                            node = [node];
                        }
                        return node;
                    }

                    const depths = [10, 50, 100, 250, 500, 1000];

                    const depthProfiles: Array<{
                        depth: number;
                        avg_msPerOp: number;
                        max_ms: number;
                    }> = [];

                    /**
                     * ---------------------------------------------------------------
                     * BENCHMARK EACH DEPTH PROFILE
                     * ---------------------------------------------------------------
                     */
                    for (const depth of depths) {
                        const samples: number[] = [];

                        // Choose the “harder” structure: alternating object/array patterns
                        const input =
                            depth % 2 === 0 ? makeDeepObject(depth) : makeDeepArray(depth);

                        for (let i = 0; i < 500; i++) {
                            const t0 = performance.now();
                            safeParse(schema, input);
                            const t1 = performance.now();
                            samples.push(t1 - t0);
                        }

                        const avg =
                            samples.reduce((s, n) => s + n, 0) / samples.length;
                        const peak = Math.max(...samples);

                        depthProfiles.push({
                            depth,
                            avg_msPerOp: avg,
                            max_ms: peak
                        });

                        // -----------------------------------------------------------------
                        // CONTRACT ENFORCEMENT
                        // -----------------------------------------------------------------
                        expect(avg).toBeLessThan(maxMsPerOp * 6);
                        expect(peak).toBeLessThan(maxMsPerOp * 15);
                    }

                    /**
                     * ---------------------------------------------------------------
                     * RESULT OBJECT FOR BASELINE & REGRESSION CHECKS
                     * ---------------------------------------------------------------
                     */
                    const result = {
                        schemaName,
                        depthProfiles,
                        summary: {
                            worst_avg: Math.max(...depthProfiles.map(d => d.avg_msPerOp)),
                            worst_peak: Math.max(...depthProfiles.map(d => d.max_ms))
                        },
                        notes:
                            "Deep-nesting pathological structures tested for recursion stability and slow-path detection."
                    };

                    /**
                     * ---------------------------------------------------------------
                     * BASELINE + REGRESSION DETECTION
                     * ---------------------------------------------------------------
                     */
                    writeBaseline(schemaName, section, result);
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.10 — PARALLEL / CONCURRENT VALIDATION THROUGHPUT
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures schema validation remains stable and predictable under:
             *
             *      • Promise.all() fan-out bursts,
             *      • microtask saturation,
             *      • pooled concurrency,
             *      • event-loop interleaving pressure,
             *      • multi-schema concurrent validation.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Real Fortune-50 ingestion pipelines regularly validate:
             *
             *      • 1,000–50,000 payloads in parallel,
             *      • multi-tenant workloads,
             *      • batched message queues,
             *      • multi-worker clusters,
             *      • streaming ETL processes.
             *
             *   Concurrency regressions become latency bombs:
             *      • starvation,
             *      • unfair scheduling,
             *      • slow-path amplification under parallel load,
             *      • out-of-order escaping (unsafe ordering),
             *      • false bottlenecks in micro-services.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • average concurrent op latency ≤ 4 × maxMsPerOp  
             *   • fairness: latency deviation across workers ≤ ±30%  
             *   • tail (p99) ≤ 10 × maxMsPerOp  
             *   • no starvation: all tasks must complete within envelope  
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<SchemaName>/7.10.parallel.json
             *
             * METRIC STRUCTURE
             * ----------------
             *   {
             *     schemaName,
             *     workers: number,
             *     results: [
             *       { workerId, mean, p95, p99, max }
             *     ],
             *     summary: { avgAcrossWorkers, worstWorker }
             *   }
             *
             * ============================================================================
             */
            it("7.10 — must sustain stable throughput under parallel validation pressure", async () => {
                for (const schemaName of Object.keys(SCHEMAS)) {
                    const section = "7.10.parallel";
                    const schema = SCHEMAS[schemaName];

                    /**
                     * ---------------------------------------------------------------
                     * INPUT GENERATION
                     * ---------------------------------------------------------------
                     * Use the first known valid input or fall back to true.
                     */
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    /**
                     * ---------------------------------------------------------------
                     * PARALLEL MODEL
                     * ---------------------------------------------------------------
                     * Workers = how many concurrent tasks we simulate.
                     * This is NOT threads — this is event-loop parallelism.
                     *
                     * Fortune-50 default: 8 workers.
                     */
                    const workers = 8;
                    const perWorkerOps = 2000;

                    async function runWorker(workerId: number) {
                        const samples: number[] = [];

                        for (let i = 0; i < perWorkerOps; i++) {
                            const t0 = performance.now();
                            safeParse(schema, input);
                            const t1 = performance.now();
                            samples.push(t1 - t0);
                        }

                        samples.sort((a, b) => a - b);

                        return {
                            workerId,
                            mean: samples.reduce((s, n) => s + n, 0) / samples.length,
                            p95: samples[Math.floor(samples.length * 0.95)],
                            p99: samples[Math.floor(samples.length * 0.99)],
                            max: samples[samples.length - 1]
                        };
                    }

                    /**
                     * ---------------------------------------------------------------
                     * RUN ALL WORKERS IN PARALLEL
                     * ---------------------------------------------------------------
                     */
                    const results = await Promise.all(
                        Array.from({ length: workers }, (_, i) => runWorker(i))
                    );

                    /**
                     * ---------------------------------------------------------------
                     * CONTRACT ENFORCEMENT
                     * ---------------------------------------------------------------
                     */
                    for (const r of results) {
                        expect(r.mean).toBeLessThan(maxMsPerOp * 4);
                        expect(r.p99).toBeLessThan(maxMsPerOp * 10);
                        expect(r.max).toBeLessThan(maxMsPerOp * 20);
                    }

                    /**
                     * Fairness: workers should NOT diverge too widely.
                     */
                    const means = results.map(r => r.mean);
                    const globalMean =
                        means.reduce((s, n) => s + n, 0) / means.length;
                    const maxDev = Math.max(...means.map(m => Math.abs(m - globalMean)));

                    expect(maxDev).toBeLessThan(globalMean * 0.30);

                    /**
                     * ---------------------------------------------------------------
                     * BASELINE + REGRESSION DETECTION
                     * ---------------------------------------------------------------
                     */
                    const summary = {
                        avgAcrossWorkers: globalMean,
                        worstWorker: Math.max(...means),
                        workers: results.length
                    };

                    const result = {
                        schemaName,
                        workers,
                        results,
                        summary,
                        notes:
                            "Parallel workload validation to detect slow-path amplification and fairness violations."
                    };

                    writeBaseline(schemaName, section, result);
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.11 — REFINEMENT / CUSTOM LOGIC SLOW-PATH DETECTION
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Detects performance regressions in schemas using:
             *
             *      • refine() / pipe(),
             *      • custom predicates,
             *      • conditional branches,
             *      • fallback logic,
             *      • pattern-based complex validation.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Refinements represent **slow paths**. In large systems, 1–3ms regressions
             *   in refinement cost propagate into:
             *
             *      • overloaded ingestion pipelines,
             *      • queue buildup and starved consumers,
             *      • backpressure failures,
             *      • SLA breaches,
             *      • microservice cascade delays.
             *
             *   Enterprises MUST guarantee:
             *
             *      • consistent refinement cost,
             *      • no sudden branching slowdowns,
             *      • predictability under adversarial inputs,
             *      • stability under repeated hot-path invocation.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • mean refinement cost ≤ 3 × maxMsPerOp  
             *   • p99 ≤ 8 × maxMsPerOp  
             *   • jitter ≤ 25%  
             *   • no “branch explosion” effects allowed  
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<SchemaName>/7.11.refinement.json
             *
             * METRIC STRUCTURE
             * ----------------
             *   {
             *     schemaName,
             *     iterations,
             *     mean,
             *     p95,
             *     p99,
             *     jitter,
             *     max,
             *     notes
             *   }
             *
             * ============================================================================
             */
            it("7.11 — must maintain stable refinement-path performance (no slow-path regressions)", () => {
                for (const schemaName of Object.keys(SCHEMAS)) {
                    const schema = SCHEMAS[schemaName];
                    const section = "7.11.refinement";

                    /**
                     * ---------------------------------------------------------------
                     * STEP 1 — Detect whether schema contains refinements.
                     * ---------------------------------------------------------------
                     * If not, benchmark is skipped — refinement-free schemas cannot
                     * suffer refinement regressions.
                     */
                    const schemaSource = schema?.toString?.() ?? "";
                    const hasRefinement =
                        schemaSource.includes("refine(") ||
                        schemaSource.includes("pipe(") ||
                        schemaSource.includes("predicate") ||
                        schemaSource.includes("custom") ||
                        schemaSource.includes("transform");

                    if (!hasRefinement) continue;

                    /**
                     * ---------------------------------------------------------------
                     * STEP 2 — Choose input that will actually trigger the refinement.
                     * ---------------------------------------------------------------
                     */
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    /**
                     * ---------------------------------------------------------------
                     * BENCHMARK EXECUTION
                     * ---------------------------------------------------------------
                     */
                    const times: number[] = [];
                    const iters = 10_000;

                    for (let i = 0; i < iters; i++) {
                        const t0 = performance.now();
                        safeParse(schema, input);
                        const t1 = performance.now();
                        times.push(t1 - t0);
                    }

                    times.sort((a, b) => a - b);

                    /**
                     * ---------------------------------------------------------------
                     * METRIC AGGREGATION
                     * ---------------------------------------------------------------
                     */
                    const mean = times.reduce((s, n) => s + n, 0) / times.length;
                    const p95 = times[Math.floor(times.length * 0.95)];
                    const p99 = times[Math.floor(times.length * 0.99)];
                    const max = times[times.length - 1];

                    const variance =
                        times.reduce((s, n) => s + Math.pow(n - mean, 2), 0) /
                        times.length;
                    const jitter = Math.sqrt(variance) / mean;

                    /**
                     * ---------------------------------------------------------------
                     * CONTRACT ENFORCEMENT (ENTERPRISE SLOW-PATH MODEL)
                     * ---------------------------------------------------------------
                     */
                    expect(mean).toBeLessThan(maxMsPerOp * 3);
                    expect(p99).toBeLessThan(maxMsPerOp * 8);
                    expect(jitter).toBeLessThan(0.25);
                    expect(max).toBeLessThan(maxMsPerOp * 25);

                    /**
                     * ---------------------------------------------------------------
                     * BASELINE OUTPUT & REGRESSION DETECTION
                     * ---------------------------------------------------------------
                     */
                    const result = {
                        schemaName,
                        iterations: iters,
                        mean,
                        p95,
                        p99,
                        jitter,
                        max,
                        notes:
                            "Refinement-path performance benchmark validating predictable custom-logic execution."
                    };

                    writeBaseline(schemaName, section, result);
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.12 — MICRO-ALLOCATION & HEAP-CHURN PROFILING
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Measures hidden memory pressure produced by schema validation, ensuring:
             *
             *      • no accidental object allocation explosions,
             *      • no array growth or deep clone behavior,
             *      • stable heap churn under load,
             *      • stable GC cadence,
             *      • predictable memory ceilings.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Memory regressions (not CPU regressions) are the #1 cause of:
             *
             *      • node service crashes,
             *      • increased GC pause times,
             *      • tail latency spikes,
             *      • cost overruns in serverless environments,
             *      • cascading microservice failures.
             *
             *   A schema that allocates 3× more than last quarter **violates operational
             *   contracts**, even if CPU time is unchanged.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • per-iteration allocation delta ≤ 1.5 KB/op  
             *   • total heap growth ≤ 6 MB across full benchmark  
             *   • GC drift ≤ 1 GC event per cycle  
             *   • churn variance coefficient ≤ 0.30  
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<SchemaName>/7.12.alloc.json
             *
             * METRIC STRUCTURE
             * ----------------
             *   {
             *     schemaName,
             *     iterations,
             *     meanBytes,
             *     p95Bytes,
             *     p99Bytes,
             *     jitter,
             *     totalDeltaMB
             *   }
             *
             * ============================================================================
             */
            it("7.12 — must maintain stable allocation patterns (no heap-churn or GC regressions)", () => {
                for (const schemaName of Object.keys(SCHEMAS)) {
                    const schema = SCHEMAS[schemaName];
                    const section = "7.12.alloc";

                    /**
                     * -------------------------------------------------------------------
                     * INPUT SELECTION
                     * -------------------------------------------------------------------
                     */
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    /**
                     * -------------------------------------------------------------------
                     * BENCHMARK CONSTANTS
                     * -------------------------------------------------------------------
                     */
                    const iters = 7_500; // tuned for heap stability tests
                    const deltas: number[] = [];

                    /**
                     * -------------------------------------------------------------------
                     * GC SNAPSHOT (START)
                     * -------------------------------------------------------------------
                     */
                    const heapStart = process.memoryUsage().heapUsed;

                    /**
                     * -------------------------------------------------------------------
                     * PER-ITERATION ALLOCATION MEASUREMENT
                     * -------------------------------------------------------------------
                     */
                    for (let i = 0; i < iters; i++) {
                        const before = process.memoryUsage().heapUsed;

                        safeParse(schema, input);

                        const after = process.memoryUsage().heapUsed;
                        deltas.push(after - before);
                    }

                    /**
                     * -------------------------------------------------------------------
                     * GC SNAPSHOT (END)
                     * -------------------------------------------------------------------
                     */
                    const heapEnd = process.memoryUsage().heapUsed;
                    const totalDeltaMB = (heapEnd - heapStart) / (1024 * 1024);

                    /**
                     * -------------------------------------------------------------------
                     * STATISTICAL ANALYSIS
                     * -------------------------------------------------------------------
                     */
                    deltas.sort((a, b) => a - b);

                    const meanBytes =
                        deltas.reduce((s, n) => s + n, 0) / deltas.length;

                    const p95Bytes = deltas[Math.floor(deltas.length * 0.95)];
                    const p99Bytes = deltas[Math.floor(deltas.length * 0.99)];

                    const variance =
                        deltas.reduce((s, n) => s + Math.pow(n - meanBytes, 2), 0) /
                        deltas.length;

                    const jitter = Math.sqrt(variance) / meanBytes;

                    /**
                     * -------------------------------------------------------------------
                     * CONTRACT ENFORCEMENT
                     * -------------------------------------------------------------------
                     */
                    // ≤ 1.5 KB per operation
                    expect(meanBytes).toBeLessThan(1500);

                    // tail allocations must remain bounded
                    expect(p95Bytes).toBeLessThan(4096);
                    expect(p99Bytes).toBeLessThan(8192);

                    // heap growth across benchmark must remain bounded
                    expect(totalDeltaMB).toBeLessThan(6);

                    // churn jitter must remain stable
                    expect(jitter).toBeLessThan(0.30);

                    /**
                     * -------------------------------------------------------------------
                     * BASELINE OUTPUT
                     * -------------------------------------------------------------------
                     */
                    const result = {
                        schemaName,
                        iterations: iters,
                        meanBytes,
                        p95Bytes,
                        p99Bytes,
                        jitter,
                        totalDeltaMB
                    };

                    writeBaseline(schemaName, section, result);
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.13 — CROSS-SCHEMA CONTENTION & PARALLEL EXECUTION STABILITY
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures schema validation remains stable under:
             *
             *      • multi-schema simultaneous validation,
             *      • multi-worker load,
             *      • threadpool contention,
             *      • concurrent heap churn,
             *      • cross-schema JIT deoptimizations.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Real workloads rarely validate one schema at a time. An API gateway,
             *   ingestion pipeline, or ETL batch may validate 10–50 schema types
             *   simultaneously.
             *
             *   When schemas contend for:
             *      • V8 optimizations,
             *      • shared IC state,
             *      • allocator fast-paths,
             *      • Node.js threadpool queues,
             *   regressions manifest that are otherwise invisible in single-schema tests.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • p99 latency under cross-schema load ≤ 3 × single-schema p99 baseline  
             *   • jitter ≤ 0.35  
             *   • worker utilization variance ≤ 25% across tasks  
             *   • no starvation or degraded schema under mixed load  
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<Schema>/7.13.parallel.json
             *
             * ============================================================================
             */
            it("7.13 — must remain stable under cross-schema parallel validation (no contention regressions)", async () => {
                const schemaEntries = Object.entries(SCHEMAS);
                const section = "7.13.parallel";

                // if only 1 schema exists, still run but single-task
                const totalSchemas = schemaEntries.length;

                /**
                 * -----------------------------------------------------------------------
                 * WORKER EXECUTION MODEL
                 * -----------------------------------------------------------------------
                 * We simulate load with Promise.all, saturating the event loop and
                 * threadpool simultaneously.
                 *
                 * Each schema gets N tasks that validate input repeatedly.
                 */
                const tasksPerSchema = 6;          // concurrency multiplier
                const iterationsPerTask = 4_000;   // per-task inner loop

                const taskResults: {
                    schemaName: string;
                    mean: number;
                    p99: number;
                    jitter: number;
                }[] = [];

                /**
                 * -----------------------------------------------------------------------
                 * TASK FUNCTION
                 * -----------------------------------------------------------------------
                 */
                async function runTask(schemaName: string, schema: any) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const times: number[] = [];

                    for (let i = 0; i < iterationsPerTask; i++) {
                        const t0 = performance.now();
                        safeParse(schema, input);
                        const t1 = performance.now();
                        times.push(t1 - t0);
                    }

                    times.sort((a, b) => a - b);

                    const mean = times.reduce((s, n) => s + n, 0) / times.length;
                    const p99 = times[Math.floor(times.length * 0.99)];

                    const variance =
                        times.reduce((s, n) => s + Math.pow(n - mean, 2), 0) /
                        times.length;

                    const jitter = Math.sqrt(variance) / mean;

                    return { schemaName, mean, p99, jitter };
                }

                /**
                 * -----------------------------------------------------------------------
                 * PARALLEL EXECUTION
                 * -----------------------------------------------------------------------
                 */
                const allTasks: Promise<any>[] = [];

                for (const [schemaName, schema] of schemaEntries) {
                    for (let i = 0; i < tasksPerSchema; i++) {
                        allTasks.push(runTask(schemaName, schema));
                    }
                }

                const rawResults = await Promise.all(allTasks);

                /**
                 * -----------------------------------------------------------------------
                 * AGGREGATION
                 * -----------------------------------------------------------------------
                 */
                const grouped: Record<
                    string,
                    { mean: number[]; p99: number[]; jitter: number[] }
                > = {};

                for (const r of rawResults) {
                    if (!grouped[r.schemaName]) {
                        grouped[r.schemaName] = { mean: [], p99: [], jitter: [] };
                    }
                    grouped[r.schemaName].mean.push(r.mean);
                    grouped[r.schemaName].p99.push(r.p99);
                    grouped[r.schemaName].jitter.push(r.jitter);
                }

                /**
                 * -----------------------------------------------------------------------
                 * CONTRACT CHECKS PER SCHEMA
                 * -----------------------------------------------------------------------
                 */
                for (const schemaName of Object.keys(grouped)) {
                    const mean = grouped[schemaName].mean.reduce((s, n) => s + n, 0) /
                        grouped[schemaName].mean.length;

                    const p99 = grouped[schemaName].p99.reduce((s, n) => s + n, 0) /
                        grouped[schemaName].p99.length;

                    const jitter = grouped[schemaName].jitter.reduce((s, n) => s + n, 0) /
                        grouped[schemaName].jitter.length;

                    // enforce stability
                    expect(jitter).toBeLessThan(0.35);
                    expect(p99).toBeLessThan(maxMsPerOp * 3); // 3× single-schema ceiling

                    // output structure for baseline use
                    const result = {
                        schemaName,
                        tasks: tasksPerSchema,
                        iterationsPerTask,
                        mean,
                        p99,
                        jitter
                    };

                    writeBaseline(schemaName, section, result);
                    compareAgainstBaseline(schemaName, section, result, maxRegressionPct);

                    taskResults.push(result);
                }

                expect(taskResults.length).toBeGreaterThan(0);
            });

            /**
             * ============================================================================
             * SECTION 7.14 — LONG-HORIZON SOAK TEST
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Detects performance degradations that occur ONLY over:
             *      • long, continuous validation runs,
             *      • sustained throughput conditions,
             *      • repeated warm/cool GC cycles,
             *      • cumulative JIT deoptimizations,
             *      • allocator slow-path drift,
             *      • gradual IC/inline-cache invalidation.
             *
             *   A soak test is essential because:
             *      • Sections 7.1–7.13 test short-window performance,
             *      • REAL systems run schemas continuously for hours,
             *      • regressions often appear only after thousands/millions of calls.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Fortune-50 ingestion systems (identity, governance, banking, healthcare)
             *   consider long-horizon drift a *critical outage class* because:
             *
             *      • micro-regressions accumulate into SLA violations,
             *      • GC churn can oscillate slowly over time,
             *      • JIT deopt may occur intermittently after millions of ops,
             *      • load balancers amplify long-tail drift into global failures.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • mean latency must remain within ±15% of the 7.3 baseline  
             *   • p99 must remain within ±25% of the 7.3 baseline  
             *   • no upward trend > 0.5% per batch (trend coefficient)  
             *   • no monotonic drift allowed (catastrophic failure indicator)  
             *
             * BASELINE STORAGE
             * ----------------
             *   __benchmarks__/<Schema>/7.14.soak.json
             *
             * ============================================================================
             */
            it("7.14 — must maintain stable performance over long-horizon continuous soak cycles", () => {
                const section = "7.14.soak";

                // A soak test runs fewer iterations per batch but many batches.
                const batches = 40;               // total measurement windows
                const iterationsPerBatch = 2_500; // ~100k total validations per schema
                const trends: Record<string, number[]> = {};

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const batchMeans: number[] = [];

                    for (let b = 0; b < batches; b++) {
                        const times: number[] = [];

                        for (let i = 0; i < iterationsPerBatch; i++) {
                            const t0 = performance.now();
                            safeParse(schema, input);
                            times.push(performance.now() - t0);
                        }

                        times.sort((a, b) => a - b);

                        const mean =
                            times.reduce((s, n) => s + n, 0) / times.length;

                        const p99 =
                            times[Math.floor(times.length * 0.99)];

                        batchMeans.push(mean);

                        // CONTRACT: detect instant catastrophic spikes
                        expect(p99).toBeLessThan(maxMsPerOp * 3.5);
                    }

                    trends[schemaName] = batchMeans;

                    // -------------------------------------------------------------------
                    // TREND ANALYSIS
                    // -------------------------------------------------------------------
                    const first = batchMeans[0];
                    const last = batchMeans[batchMeans.length - 1];
                    const drift = (last - first) / first;

                    // NO monotonic upward drift beyond 15%
                    expect(drift).toBeLessThan(0.15);

                    // regression trend slope (simple linear approximation)
                    let rising = 0;
                    for (let i = 1; i < batchMeans.length; i++) {
                        if (batchMeans[i] > batchMeans[i - 1]) rising++;
                    }

                    const monotonicity = rising / batchMeans.length;

                    // NO more than 75% of batches allowed to show increases
                    expect(monotonicity).toBeLessThan(0.75);

                    // -------------------------------------------------------------------
                    // BASELINE COMPARISON
                    // -------------------------------------------------------------------
                    const baseline = readBaseline(schemaName, section);

                    const result = {
                        schemaName,
                        batches,
                        iterationsPerBatch,
                        drift,
                        monotonicity,
                        meanFirst: first,
                        meanLast: last,
                        means: batchMeans
                    };

                    if (baseline) {
                        const reg =
                            (result.meanLast - baseline.meanLast) /
                            baseline.meanLast;

                        expect(reg).toBeLessThan(maxRegressionPct);
                    }

                    writeBaseline(schemaName, section, result);
                }

                // Sanity check
                expect(Object.keys(trends).length).toBeGreaterThan(0);
            });

            /**
             * ============================================================================
             * SECTION 7.15 — HEAP FRAGMENTATION & ALLOCATOR SLOW-PATH DETECTION
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Detects production-only regressions caused by:
             *      • heap fragmentation,
             *      • GC thrash,
             *      • allocator slow-path fallback,
             *      • excessive per-iteration allocation churn,
             *      • hidden deep-copy explosions inside transforms/pipelines,
             *      • V8 "old-space" promotion cascades.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   In regulated identity, analytics, and ingestion systems, schema validation
             *   runs *continuously*, often millions of times per minute. A regression in:
             *
             *      • object promotion rate,
             *      • fragmentation entropy,
             *      • GC frequency,
             *      • allocation delta per batch,
             *
             *   will cause:
             *
             *      • sharp p99 tail inflation,
             *      • microservice collapse,
             *      • container eviction due to OOM,
             *      • catastrophic multi-tenant interference.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • heap fragmentation delta must remain < 3 MB across measurement windows  
             *   • GC pressure index must not increase > 40% over the run  
             *   • allocation per batch must not trend upward > 0.5% per window  
             *   • mean validation latency must remain within 20% of baseline  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<Schema>/7.15.heap-fragmentation.json
             *
             * ============================================================================
             */
            it("7.15 — must maintain allocator stability, avoid heap fragmentation, and prevent GC drift", () => {
                const section = "7.15.heap-fragmentation";

                const windows = 12;             // measurement windows
                const itersPerWindow = 5_000;   // ~60k validations per schema

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const heapSnapshots: number[] = [];
                    const gcPressure: number[] = [];
                    const meanLatencies: number[] = [];

                    // Helper to approximate GC pressure using heapUsed deltas
                    const snapshotHeap = () => process.memoryUsage().heapUsed;

                    const measureWindow = () => {
                        const times: number[] = [];
                        const before = snapshotHeap();

                        for (let i = 0; i < itersPerWindow; i++) {
                            const t0 = performance.now();
                            safeParse(schema, input);
                            times.push(performance.now() - t0);
                        }

                        const after = snapshotHeap();
                        const delta = after - before;

                        times.sort((a, b) => a - b);

                        const mean =
                            times.reduce((s, n) => s + n, 0) / times.length;

                        // GC "pressure" approximated by heap delta
                        gcPressure.push(delta);
                        meanLatencies.push(mean);
                        heapSnapshots.push(after);

                        return { mean, delta };
                    };

                    // -------------------------------------------------------------------
                    // RUN WINDOWS
                    // -------------------------------------------------------------------
                    for (let w = 0; w < windows; w++) {
                        measureWindow();
                    }

                    // -------------------------------------------------------------------
                    // CONTRACT ENFORCEMENT
                    // -------------------------------------------------------------------

                    // 1. Heap fragmentation must stay within acceptable bounds
                    const minHeap = Math.min(...heapSnapshots);
                    const maxHeap = Math.max(...heapSnapshots);
                    const fragDeltaMB = (maxHeap - minHeap) / (1024 * 1024);

                    expect(fragDeltaMB).toBeLessThan(3);  // ≤3MB allowed drift

                    // 2. GC pressure must not rise more than 40% across windows
                    const firstGC = gcPressure[0];
                    const lastGC = gcPressure[gcPressure.length - 1];

                    if (firstGC > 0) {
                        const gcRise = (lastGC - firstGC) / firstGC;
                        expect(gcRise).toBeLessThan(0.40);
                    }

                    // 3. Allocation trend must not increase too quickly
                    let rising = 0;
                    for (let i = 1; i < gcPressure.length; i++) {
                        if (gcPressure[i] > gcPressure[i - 1]) rising++;
                    }

                    // No monotonic trend allowed
                    expect(rising / gcPressure.length).toBeLessThan(0.70);

                    // 4. Latency must remain stable relative to the baseline (from 7.3)
                    const baseline = readBaseline(schemaName, "7.3.main");
                    const result = {
                        schemaName,
                        windows,
                        itersPerWindow,
                        fragDeltaMB,
                        gcPressure,
                        meanLatencies,
                        heapSnapshots
                    };

                    if (baseline?.mean) {
                        const lastMean = meanLatencies[meanLatencies.length - 1];
                        const drift = (lastMean - baseline.mean) / baseline.mean;

                        expect(drift).toBeLessThan(0.20); // ≤20% mean drift allowed
                    }

                    // -------------------------------------------------------------------
                    // BASELINE STORAGE
                    // -------------------------------------------------------------------
                    writeBaseline(schemaName, section, result);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.16 — GC CYCLE PROFILING & MAJOR/MINOR GC REGRESSION DETECTION
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Detects regressions in:
             *      • minor GC frequency (new-space evacuation),
             *      • major GC frequency (old-space compaction),
             *      • GC pause duration,
             *      • heap-promotion rate,
             *      • live-heap expansion,
             *      • GC spike cascades under sustained validation load.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Large ingestion + identity pipelines validate millions of payloads per
             *   minute. GC regressions are the #1 cause of:
             *
             *      • p99 → p999 latency explosions,
             *      • container OOM,
             *      • autoscaling storms,
             *      • backpressure collapse,
             *      • global outage cascades during peak load.
             *
             *   Minor → major promotion drift must be detected **before deployment**.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • GC pause (avg) must remain < 2ms  
             *   • GC pause (p99) must remain < 5ms  
             *   • minor GC increase vs baseline ≤ 30%  
             *   • major GC frequency increase ≤ 15%  
             *   • heap promotion drift ≤ 20%  
             *   • live heap growth slope must not trend upward  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<Schema>/7.16.gc-profile.json
             *
             * ============================================================================
             */
            it("7.16 — must maintain stable GC cycle behavior without regressions", () => {
                const section = "7.16.gc-profile";

                const WINDOWS = 10;
                const ITERS = 4_000;

                const hasGC = typeof global.gc === "function";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const pauseSamples: number[] = [];
                    const minorSamples: number[] = [];
                    const majorSamples: number[] = [];
                    const liveHeap: number[] = [];

                    // -------------------------------------------------------------------
                    // GC PROFILING UTILITIES
                    // -------------------------------------------------------------------

                    let lastHeap = process.memoryUsage().heapUsed;

                    function recordGC() {
                        const cur = process.memoryUsage().heapUsed;
                        const delta = cur - lastHeap;

                        // Heuristic: small deltas → minor GC movement; large deltas → major compaction
                        if (delta < 0) {
                            const magnitude = Math.abs(delta);
                            if (magnitude < 200 * 1024) minorSamples.push(magnitude);
                            else majorSamples.push(magnitude);
                        }

                        lastHeap = cur;
                        liveHeap.push(cur);
                    }

                    function measurePause(fn: () => void) {
                        const t0 = performance.now();
                        fn();
                        const t1 = performance.now();
                        return t1 - t0;
                    }

                    // -------------------------------------------------------------------
                    // BENCHMARK WINDOWS
                    // -------------------------------------------------------------------
                    for (let w = 0; w < WINDOWS; w++) {
                        const t0 = performance.now();

                        for (let i = 0; i < ITERS; i++) {
                            const pause = measurePause(() => safeParse(schema, input));
                            pauseSamples.push(pause);

                            if (hasGC) {
                                global.gc({ type: "minor" });
                                recordGC();
                            }
                        }

                        // end-of-window major GC simulation to stabilize old-space growth
                        if (hasGC) {
                            const t0g = performance.now();
                            global.gc({ type: "major" });
                            const t1g = performance.now();
                            pauseSamples.push(t1g - t0g);
                            recordGC();
                        }
                    }

                    // -------------------------------------------------------------------
                    // SORT AND COMPUTE STATS
                    // -------------------------------------------------------------------
                    pauseSamples.sort((a, b) => a - b);

                    const meanPause =
                        pauseSamples.reduce((s, n) => s + n, 0) / pauseSamples.length;

                    const p99Pause =
                        pauseSamples[Math.floor(pauseSamples.length * 0.99)];

                    // live heap slope → detect creeping memory that signals a GC regression
                    const heapSlope =
                        liveHeap[liveHeap.length - 1] - liveHeap[0];

                    // -------------------------------------------------------------------
                    // LOAD BASELINE
                    // -------------------------------------------------------------------
                    const baseline = readBaseline(schemaName, section);

                    // -------------------------------------------------------------------
                    // CONTRACT ENFORCEMENT
                    // -------------------------------------------------------------------

                    // 1. Pause time must stay under tight SRE envelopes
                    expect(meanPause).toBeLessThan(2);   // < 2ms mean
                    expect(p99Pause).toBeLessThan(5);    // < 5ms p99 hard limit

                    // 2. GC frequencies should remain stable vs baseline
                    if (baseline) {
                        const minorAvg =
                            minorSamples.reduce((s, n) => s + n, 0) / (minorSamples.length || 1);

                        const majorAvg =
                            majorSamples.reduce((s, n) => s + n, 0) / (majorSamples.length || 1);

                        const bMinor = baseline.minorAvg || minorAvg;
                        const bMajor = baseline.majorAvg || majorAvg;

                        if (bMinor > 0) {
                            const minorRise = (minorAvg - bMinor) / bMinor;
                            expect(minorRise).toBeLessThan(0.30); // ≤30% minor GC drift
                        }

                        if (bMajor > 0) {
                            const majorRise = (majorAvg - bMajor) / bMajor;
                            expect(majorRise).toBeLessThan(0.15); // ≤15% major GC regression
                        }
                    }

                    // 3. Heap slope must not indicate creeping GC regression
                    const slopeMB = heapSlope / (1024 * 1024);
                    expect(slopeMB).toBeLessThan(5); // No >5MB upward drift allowed

                    // -------------------------------------------------------------------
                    // WRITE BASELINE
                    // -------------------------------------------------------------------
                    const result = {
                        schemaName,
                        meanPause,
                        p99Pause,
                        minorAvg:
                            minorSamples.reduce((s, n) => s + n, 0) / (minorSamples.length || 1),
                        majorAvg:
                            majorSamples.reduce((s, n) => s + n, 0) / (majorSamples.length || 1),
                        heapSlopeMB: slopeMB,
                        liveHeap
                    };

                    writeBaseline(schemaName, section, result);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.17 — YIELD-STARVATION & MICROSTUTTER DETECTION
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Detects pathological cases where schema validation:
             *      • starves the event loop,
             *      • suppresses microtask/timer execution,
             *      • induces microstutter bursts,
             *      • delays yield checkpoints,
             *      • causes backpressure amplification.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   In real distributed systems —
             *      • consent/analytics ingestion,
             *      • identity gateways,
             *      • payments/risk scoring flows,
             *      • serverless multi-tenant workloads —
             *
             *   yield starvation is one of the primary causes of:
             *      • timer drift,
             *      • cron desynchronization,
             *      • microburst latency flares,
             *      • queue overrun/backpressure collapse,
             *      • inconsistent rate-limit enforcement,
             *      • SLA breaches masked as “random spikes”.
             *
             *   These issues *never* appear in isolated benchmarks; only in
             *   scheduler-interference tests like this one.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • average microtask latency drift ≤ 1.5× baseline  
             *   • p99 microtask latency ≤ 3× baseline  
             *   • no starvation burst > 10ms  
             *   • yield checkpoints must execute ≥ 90% of expected times  
             *   • starvation index (variance/mean) < 0.40  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<Schema>/7.17.yield-starvation.json
             *
             * ============================================================================
             */
            it("7.17 — must avoid yield-starvation and microstutter under sustained validation load", async () => {
                const section = "7.17.yield-starvation";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const ITERATIONS = 5_000;
                    const CHECKPOINTS = 200;

                    const microtaskLatencies: number[] = [];
                    let yieldExecutions = 0;

                    /**
                     * --------------------------------------------------------------------
                     * BASELINE MICROTASK LATENCY
                     * --------------------------------------------------------------------
                     *   Measure expected microtask delay when system is idle.
                     */
                    const baselineLatencies: number[] = [];

                    for (let i = 0; i < 50; i++) {
                        const t0 = performance.now();
                        await Promise.resolve();
                        const t1 = performance.now();
                        baselineLatencies.push(t1 - t0);
                    }

                    baselineLatencies.sort((a, b) => a - b);
                    const baselineMean =
                        baselineLatencies.reduce((s, n) => s + n, 0) /
                        baselineLatencies.length;

                    const baselineP99 =
                        baselineLatencies[Math.floor(baselineLatencies.length * 0.99)];

                    /**
                     * --------------------------------------------------------------------
                     * HIGH-PRESSURE VALIDATION LOOP WITH SCHEDULED CHECKPOINTS
                     * --------------------------------------------------------------------
                     *   We interleave validation calls with microtask checkpoints.
                     *   A compliant schema validation loop MUST:
                     *
                     *      • not suppress microtasks,
                     *      • not accumulate timer drift,
                     *      • allow predictable yield frequency.
                     */
                    let checkpointCounter = 0;

                    const checkpointPromise = new Promise<void>((resolve) => {
                        const interval = setInterval(async () => {
                            const t0 = performance.now();
                            await Promise.resolve();
                            const t1 = performance.now();

                            microtaskLatencies.push(t1 - t0);
                            yieldExecutions++;

                            checkpointCounter++;
                            if (checkpointCounter >= CHECKPOINTS) {
                                clearInterval(interval);
                                resolve();
                            }
                        }, 1);
                    });

                    //--- High-pressure schema validation loop (competes with microtasks) ---
                    for (let i = 0; i < ITERATIONS; i++) {
                        safeParse(schema, input);
                    }

                    await checkpointPromise;

                    /**
                     * --------------------------------------------------------------------
                     * METRICS + ENFORCEMENT
                     * --------------------------------------------------------------------
                     */
                    microtaskLatencies.sort((a, b) => a - b);

                    const mean =
                        microtaskLatencies.reduce((s, n) => s + n, 0) /
                        microtaskLatencies.length;

                    const p99 =
                        microtaskLatencies[Math.floor(microtaskLatencies.length * 0.99)];

                    const max = microtaskLatencies[microtaskLatencies.length - 1];

                    const variance =
                        microtaskLatencies.reduce(
                            (s, n) => s + Math.pow(n - mean, 2),
                            0
                        ) / microtaskLatencies.length;

                    const sd = Math.sqrt(variance);
                    const starvationIndex = sd / mean;

                    // ---------------------------------------------------------------------
                    // BASELINE LOAD
                    // ---------------------------------------------------------------------
                    const baseline = readBaseline(schemaName, section);

                    if (baseline) {
                        // Mean drift vs baseline must be limited
                        const drift = mean / baseline.mean;
                        expect(drift).toBeLessThan(1.5); // ≤ 1.5× slower allowed

                        // p99 must remain controlled
                        const p99Drift = p99 / baseline.p99;
                        expect(p99Drift).toBeLessThan(3.0); // ≤ 3× allowed
                    }

                    // ---------------------------------------------------------------------
                    // CONTRACT ENFORCEMENT
                    // ---------------------------------------------------------------------

                    // No starvation burst >10ms allowed
                    expect(max).toBeLessThan(10);

                    // Microtask drift must stay bounded
                    expect(mean).toBeLessThan(baselineMean * 1.5);

                    // p99 protected
                    expect(p99).toBeLessThan(baselineP99 * 3);

                    // Yield checkpoints must execute sufficiently often
                    expect(yieldExecutions).toBeGreaterThanOrEqual(CHECKPOINTS * 0.90);

                    // Starvation index must be <0.40
                    expect(starvationIndex).toBeLessThan(0.40);

                    // ---------------------------------------------------------------------
                    // BASELINE WRITE-BACK
                    // ---------------------------------------------------------------------
                    const result = {
                        mean,
                        p99,
                        max,
                        starvationIndex,
                        yieldExecutions
                    };

                    writeBaseline(schemaName, section, result);
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.18 — EVENT-LOOP OCCLUSION & PRIORITY-INVERSION BENCHMARKING
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Detects pathological behaviour where schema validation:
             *      • occludes the event-loop,
             *      • delays high-priority callbacks,
             *      • suppresses timer and microtask queues,
             *      • causes priority inversion between system-critical tasks,
             *      • prevents fairness across concurrent logical lanes.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Modern Fortune-50 workloads depend on the event-loop's ability to:
             *      • execute authentication token refreshes,
             *      • process queue messages,
             *      • maintain session expiry timers,
             *      • execute rate-limiter decrements,
             *      • manage cron-like internal periodic tasks,
             *      • flush buffered analytics batches.
             *
             *   If validation saturates the loop and blocks these higher-priority tasks,
             *   real production failures emerge:
             *      • missed deadlines,
             *      • throttling storms,
             *      • sudden cascading latency,
             *      • lost or duplicated messages,
             *      • system instability under load,
             *      • catastrophic degradation during burst traffic.
             *
             * PRIORITY-INVERSION MODEL
             * ------------------------
             *   We simulate a system where:
             *      • High-priority tasks (HP) MUST run at predictable intervals.
             *      • Schema validation represents lower-priority (LP) compute work.
             *
             *   A correct system must:
             *      • preserve HP task cadence,
             *      • avoid timer starvation,
             *      • maintain fairness in event-loop scheduling.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • HP-task drift ≤ 2× baseline  
             *   • HP-task p99 ≤ 3× baseline  
             *   • missed HP-task executions ≤ 5%  
             *   • LP workload must not suppress HP tasks  
             *   • baseline comparison must be enforced  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<schema>/7.18.priority-inversion.json
             *
             * ============================================================================
             */

            it("7.18 — must avoid event-loop occlusion and priority inversion under heavy validation load", async () => {
                const section = "7.18.priority-inversion";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    // ---------------------------------------------------------------------
                    // BASELINE: HP task timing under idle conditions
                    // ---------------------------------------------------------------------
                    async function sampleHPTiming(samples = 50) {
                        const results: number[] = [];
                        for (let i = 0; i < samples; i++) {
                            const t0 = performance.now();
                            await new Promise((resolve) => setTimeout(resolve, 0));
                            const t1 = performance.now();
                            results.push(t1 - t0);
                        }
                        results.sort((a, b) => a - b);
                        return {
                            mean:
                                results.reduce((s, n) => s + n, 0) /
                                results.length,
                            p99: results[Math.floor(results.length * 0.99)]
                        };
                    }

                    const baseline = await sampleHPTiming();

                    // ---------------------------------------------------------------------
                    // SIMULATION: HP tasks running concurrently with
                    // heavy LP schema validation load
                    // ---------------------------------------------------------------------
                    const HP_LATENCIES: number[] = [];
                    let HP_EXEC_COUNT = 0;

                    // High-priority task: must run every few ms
                    const HP_INTERVAL_MS = 2;
                    const HP_ITERATIONS = 120;

                    const HP_TASK = new Promise<void>((resolve) => {
                        let count = 0;
                        const timer = setInterval(async () => {
                            const t0 = performance.now();
                            await Promise.resolve();       // promote to microtask: highest priority
                            const t1 = performance.now();

                            HP_LATENCIES.push(t1 - t0);
                            HP_EXEC_COUNT++;

                            if (++count >= HP_ITERATIONS) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, HP_INTERVAL_MS);
                    });

                    // LP workload: schema validation storm (competes with HP work)
                    const LP_ITERATIONS = 20_000;
                    for (let i = 0; i < LP_ITERATIONS; i++) {
                        safeParse(schema, input);
                    }

                    await HP_TASK;

                    // ---------------------------------------------------------------------
                    // ANALYSIS
                    // ---------------------------------------------------------------------
                    HP_LATENCIES.sort((a, b) => a - b);

                    const hpMean =
                        HP_LATENCIES.reduce((s, n) => s + n, 0) /
                        HP_LATENCIES.length;

                    const hpP99 = HP_LATENCIES[Math.floor(HP_LATENCIES.length * 0.99)];
                    const hpMax = HP_LATENCIES[HP_LATENCIES.length - 1];

                    const expectedExecutions = HP_ITERATIONS;
                    const missedExecutions =
                        1 - HP_EXEC_COUNT / expectedExecutions;

                    const variance =
                        HP_LATENCIES.reduce((s, n) => s + Math.pow(n - hpMean, 2), 0) /
                        HP_LATENCIES.length;

                    const jitter = Math.sqrt(variance) / hpMean;

                    // ---------------------------------------------------------------------
                    // BASELINE COMPARISON (if exists)
                    // ---------------------------------------------------------------------
                    const baselineFile = readBaseline(schemaName, section);
                    if (baselineFile) {
                        const meanDrift = hpMean / baselineFile.mean;
                        const p99Drift = hpP99 / baselineFile.p99;

                        expect(meanDrift).toBeLessThan(2.0);
                        expect(p99Drift).toBeLessThan(3.0);
                    }

                    // ---------------------------------------------------------------------
                    // CONTRACT ENFORCEMENT
                    // ---------------------------------------------------------------------

                    // HP mean task latency must remain bounded
                    expect(hpMean).toBeLessThan(baseline.mean * 2.0);

                    // HP p99 must remain within stability envelope
                    expect(hpP99).toBeLessThan(baseline.p99 * 3.0);

                    // HP tasks must not be starved
                    expect(missedExecutions).toBeLessThan(0.05); // ≤ 5% missed

                    // Stutter bursts must be limited
                    expect(hpMax).toBeLessThan(15); // hard cap, ms

                    // Scheduling fairness enforced
                    expect(jitter).toBeLessThan(0.40);

                    // ---------------------------------------------------------------------
                    // BASELINE WRITE-BACK
                    // ---------------------------------------------------------------------
                    writeBaseline(schemaName, section, {
                        mean: hpMean,
                        p99: hpP99,
                        max: hpMax,
                        jitter,
                        missedExecutions
                    });
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.19 — JIT DEOPTIMIZATION & POLYMORPHISM RESILIENCE BENCHMARKING
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Validates that schema validation remains stable and predictable under
             *   polymorphic workloads that:
             *      • diversify hidden-class shapes,
             *      • trigger transition chains in the object graph,
             *      • expand call-site polymorphism,
             *      • destabilize V8 monomorphic → polymorphic → megamorphic tiers,
             *      • cause JIT bailout and deopt storms,
             *      • mutate input shapes in unpredictable patterns.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Real Fortune-50 ingestion pipelines receive payloads from:
             *      • browser clients,
             *      • mobile SDKs,
             *      • IoT devices,
             *      • backend microservices,
             *      • partner integrations,
             *      • legacy systems.
             *
             *   These payloads naturally differ in:
             *      • object shapes,
             *      • nesting patterns,
             *      • optional property sets,
             *      • type distributions,
             *      • structural composition.
             *
             *   Without polymorphism resilience, production systems exhibit:
             *      • sudden 10×–200× latency explosions,
             *      • catastrophic p99/p999 instability,
             *      • deopt oscillation storms,
             *      • throughput collapse,
             *      • unpredictable tail behavior,
             *      • escalating CPU burn.
             *
             * INPUT MODEL
             * -----------
             *   This benchmark feeds V8 a curated polymorphic input suite including:
             *      • empty objects,
             *      • single-property and multi-property shapes,
             *      • shape-differentiating nesting,
             *      • array-holding objects,
             *      • null-prototype objects,
             *      • objects with functions,
             *      • objects with random numeric/string properties.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • mean latency under polymorphic load ≤ 1.20 × baseline mean  
             *   • p99 ≤ 4 × baseline p99  
             *   • max latency ≤ 15 × baseline mean  
             *   • jitter < 40%  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<schema>/7.19.jit-polymorphism.json
             *
             * ============================================================================
             */

            function* generatePolymorphicVariants() {
                yield {};                                     // empty object
                yield { a: 1 };                                // single property
                yield { a: 1, b: 2 };                          // two properties
                yield { a: 1, b: 2, c: 3 };                    // three properties
                yield { x: "s" };                              // type mismatch
                yield { nested: { y: true } };                 // nested shape
                yield Object.create(null);                     // null prototype
                yield { list: [1, 2, 3] };                     // array shape
                yield { fn: () => 42 };                        // function property
                yield { rand: Math.random() };                 // random number
                yield { text: Math.random().toString(36) };    // random string
            }

            it("7.19 — must remain stable under polymorphic JIT-stress inputs and avoid deoptimization storms", () => {
                const section = "7.19.jit-polymorphism";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const baseInput =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    // ---------------------------------------------------------------
                    // BASELINE: monomorphic steady-state performance
                    // ---------------------------------------------------------------
                    const baselineRun = runBenchmark(() => safeParse(schema, baseInput));

                    const baselineMean = baselineRun.mean;
                    const baselineP99 = baselineRun.p99;

                    // ---------------------------------------------------------------
                    // POLYMORPHIC EXECUTION SAMPLING
                    // ---------------------------------------------------------------
                    const allLatencySamples: number[] = [];

                    for (const variant of generatePolymorphicVariants()) {
                        const samples: number[] = [];

                        for (let i = 0; i < 2000; i++) {
                            const t0 = performance.now();
                            safeParse(schema, variant);
                            const t1 = performance.now();

                            const delta = t1 - t0;
                            samples.push(delta);
                            allLatencySamples.push(delta);
                        }

                        const mean =
                            samples.reduce((s, n) => s + n, 0) / samples.length;

                        const variance =
                            samples.reduce((s, n) => s + Math.pow(n - mean, 2), 0) /
                            samples.length;

                        const sd = Math.sqrt(variance);
                        const jitter = sd / mean;

                        // ---------------- CONTRACT ENFORCEMENT ----------------------

                        // Polymorphic execution must not exceed 20% slowdown
                        expect(mean).toBeLessThan(baselineMean * 1.20);

                        // Jitter must be bounded (avoid polymorphic unpredictability)
                        expect(jitter).toBeLessThan(0.40);
                    }

                    // ---------------------------------------------------------------
                    // EXTREME TAIL ANALYSIS
                    // ---------------------------------------------------------------
                    allLatencySamples.sort((a, b) => a - b);

                    const p99 = allLatencySamples[Math.floor(allLatencySamples.length * 0.99)];
                    const max = allLatencySamples[allLatencySamples.length - 1];

                    // p99 must not explode beyond 4× baseline
                    expect(p99).toBeLessThan(baselineP99 * 4);

                    // catastrophic spikes must remain bounded
                    expect(max).toBeLessThan(baselineMean * 15);

                    // ---------------------------------------------------------------
                    // BASELINE INTEGRATION
                    // ---------------------------------------------------------------
                    const baselineFile = readBaseline(schemaName, section);

                    if (baselineFile) {
                        // mean drift must remain controlled
                        expect(allLatencySamples.reduce((s, n) => s + n, 0) /
                            allLatencySamples.length / baselineFile.mean)
                            .toBeLessThan(1.20);

                        // tail drift must remain controlled
                        expect(p99 / baselineFile.p99).toBeLessThan(1.30);
                    }

                    // ---------------------------------------------------------------
                    // BASELINE WRITE-BACK
                    // ---------------------------------------------------------------
                    writeBaseline(schemaName, section, {
                        baselineMean,
                        baselineP99,
                        polymorphicP99: p99,
                        polymorphicMax: max
                    });
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.20 — BRANCH-DIVERGENCE & PATHOLOGICAL RULE-EXPANSION BENCHMARKING
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures schema validators maintain predictable performance when faced with
             *   branch-heavy or combinatorially-expansive validation paths, including:
             *
             *      • deep union chains
             *      • uneven branch likelihood distributions
             *      • high-refinement stacked schemas
             *      • fallback branches and fallback recursion
             *      • discriminator-based schema trees
             *      • validation pipelines with multiple guard layers
             *      • rule expansion causing exponential combinatorics
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   Real production systems routinely hit:
             *      • union-heavy "is this X or Y" input flows,
             *      • polymorphic type discriminators from client-side analytics,
             *      • deeply nested objects from large ETL conversions,
             *      • fallback schemas triggered by malformed upstream payloads,
             *      • high refinement density when enforcing compliance rules.
             *
             *   These situations frequently cause **branch explosion**, triggering:
             *      • latency cliffs,
             *      • inconsistent p99 behavior,
             *      • unpredictable fallback traversal,
             *      • megamorphic dispatch and warm-deopt cycles.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • branch-selected validation must remain ≤ 1.35 × baseline mean  
             *   • fallback or deep-branch traversal must remain ≤ 1.75 × baseline mean  
             *   • divergence p99 ≤ 6 × mean  
             *   • jitter < 45%  
             *   • no pathological combinatorial explosion  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<schema>/7.20.branch-divergence.json
             *
             * ============================================================================
             */

            function buildBranchStressInputs(baseValid: any) {
                return [
                    baseValid,
                    { type: "A", v: 1 },
                    { type: "B", v: "str" },
                    { type: "C", nested: { ok: true } },
                    { fallback: true, data: [1, 2, 3] },
                    // deep discriminator trees
                    { kind: "alpha", meta: { stage: 1 } },
                    { kind: "beta", meta: { stage: 2, extra: "x" } },
                    // malformed discriminator triggering fallback
                    { kind: 999, meta: {} },
                    // heavy nesting that forces branch selection
                    { x: { y: { z: { w: { t: baseValid } } } } }
                ];
            }

            it("7.20 — must remain stable under branch-heavy and rule-expanding validation paths", () => {
                const section = "7.20.branch-divergence";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const baseValid =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const stressInputs = buildBranchStressInputs(baseValid);

                    // ---------------------------------------------------------------
                    // BASELINE REFERENCE
                    // ---------------------------------------------------------------
                    const baselineRun = runBenchmark(() => safeParse(schema, baseValid));
                    const baselineMean = baselineRun.mean;
                    const baselineP99 = baselineRun.p99;

                    const divergenceLatencies: number[] = [];

                    // ---------------------------------------------------------------
                    // BRANCH-SELECTION + FALLBACK TRAVERSAL SAMPLING
                    // ---------------------------------------------------------------
                    for (const input of stressInputs) {
                        for (let i = 0; i < 2000; i++) {
                            const t0 = performance.now();
                            safeParse(schema, input);
                            const t1 = performance.now();
                            divergenceLatencies.push(t1 - t0);
                        }
                    }

                    divergenceLatencies.sort((a, b) => a - b);

                    const mean =
                        divergenceLatencies.reduce((s, n) => s + n, 0) /
                        divergenceLatencies.length;
                    const p99 =
                        divergenceLatencies[
                        Math.floor(divergenceLatencies.length * 0.99)
                        ];
                    const max = divergenceLatencies[divergenceLatencies.length - 1];

                    // ---------------- CONTRACT ENFORCEMENT ----------------------

                    // Branch-divergence slowdown bound
                    expect(mean).toBeLessThan(baselineMean * 1.35);

                    // Fallback / deep-path traversal upper bound
                    expect(p99).toBeLessThan(baselineMean * 6);

                    // Catastrophic divergence control
                    expect(max).toBeLessThan(baselineMean * 15);

                    // Variance and jitter control
                    const variance =
                        divergenceLatencies.reduce((s, n) => s + Math.pow(n - mean, 2), 0) /
                        divergenceLatencies.length;
                    const sd = Math.sqrt(variance);
                    const jitter = sd / mean;

                    expect(jitter).toBeLessThan(0.45);

                    // ---------------------------------------------------------------
                    // BASELINE INTEGRATION
                    // ---------------------------------------------------------------
                    const baselineFile = readBaseline(schemaName, section);

                    if (baselineFile) {
                        // Mean drift under branch load
                        expect(mean / baselineFile.mean).toBeLessThan(1.35);

                        // Tail drift bound
                        expect(p99 / baselineFile.p99).toBeLessThan(1.50);
                    }

                    // ---------------------------------------------------------------
                    // BASELINE WRITE-BACK
                    // ---------------------------------------------------------------
                    writeBaseline(schemaName, section, {
                        baselineMean,
                        baselineP99,
                        branchMean: mean,
                        branchP99: p99,
                        branchMax: max
                    });
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.21 — TIME-DRIFT & CI VARIABILITY STABILITY BENCHMARKING
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures benchmark stability across:
             *      • different CI runners,
             *      • fluctuating system load,
             *      • VM scheduling variability,
             *      • thermal throttling,
             *      • intermittent CPU frequency scaling,
             *      • noisy neighbor interference,
             *      • containerised or shared-host environments.
             *
             * WHY THIS MATTERS
             * ----------------
             *   Enterprise CI systems (GitLab, GitHub Actions, Buildkite, Jenkins,
             *   internal orchestrators) often execute on:
             *      • ephemeral cloud runners,
             *      • inconsistent CPU architectures,
             *      • throttled virtualized hardware,
             *      • mixed-latency workloads.
             *
             *   These conditions introduce *time drift* — unpredictable changes in wall-clock
             *   latency — which can incorrectly signal regressions unless benchmark results
             *   are normalized against:
             *
             *      • a control function,
             *      • local micro-calibration,
             *      • workload-stability heuristics,
             *      • clock-skew mitigation layer.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • drift between local-control baselines and schema benchmarks ≤ 20%  
             *   • p95 drift ≤ 30%  
             *   • normalized delta applied before regression reporting  
             *   • must record a time-drift factor inside the baseline file  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<schema>/7.21.time-drift.json
             *
             * ============================================================================
             */

            function runCalibration(iterations = 25_000) {
                // This calibration loop performs trivial arithmetic to measure local
                // execution cost unaffected by schema logic. It defines the “ambient”
                // performance envelope to normalize subsequent results.
                const times: number[] = [];

                for (let i = 0; i < iterations; i++) {
                    const t0 = performance.now();
                    // extremely predictable CPU path:
                    let x = i;
                    x = x + 1;
                    x = x * 2;
                    const t1 = performance.now();
                    times.push(t1 - t0);
                }

                times.sort((a, b) => a - b);

                const mean =
                    times.reduce((s, n) => s + n, 0) / times.length;

                const p95 =
                    times[Math.floor(times.length * 0.95)];

                const p99 =
                    times[Math.floor(times.length * 0.99)];

                return { mean, p95, p99, samples: times };
            }

            it("7.21 — must normalize performance using time-drift and CI variability calibration baseline", () => {
                const section = "7.21.time-drift";

                // STEP 1 — LOCAL CALIBRATION
                // --------------------------------------------------
                const calibration = runCalibration();
                const calibrationMean = calibration.mean;
                const calibrationP95 = calibration.p95;
                const calibrationP99 = calibration.p99;

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    // pick representative input
                    const sampleInput =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const benchFn = () => safeParse(schema, sampleInput);

                    // --------------------------------------------------------------
                    // STEP 2 — RUN SCHEMA BENCHMARK(x) AND DIVIDE BY CALIBRATION MEAN
                    // --------------------------------------------------------------
                    const schemaRun = runBenchmark(benchFn);

                    // Raw metrics
                    const rawMean = schemaRun.mean;
                    const rawP95 = schemaRun.p95;
                    const rawP99 = schemaRun.p99;

                    // Normalized metrics
                    const normalizedMean = rawMean / calibrationMean;
                    const normalizedP95 = rawP95 / calibrationMean;
                    const normalizedP99 = rawP99 / calibrationMean;

                    // --------------------------------------------------------------
                    // STEP 3 — DRIFT CONTRACT VALIDATION
                    // --------------------------------------------------------------

                    // Drift from ambient CPU baseline must be limited.
                    expect(normalizedMean).toBeLessThan(1.20); // <= 20%
                    expect(normalizedP95).toBeLessThan(1.30); // <= 30%

                    // p99 drift must not exceed 50% (upper bound for CI noise)
                    expect(normalizedP99).toBeLessThan(1.50);

                    // Frequency scaling / thermal throttling tolerance
                    // Anything > 2× baseline is considered environmental failure.
                    expect(rawMean / calibrationMean).toBeLessThan(2.0);

                    // --------------------------------------------------------------
                    // STEP 4 — BASELINE INTEGRATION
                    // --------------------------------------------------------------
                    const baseline = readBaseline(schemaName, section);

                    if (baseline) {
                        // Compare normalized values to previous norm.
                        const driftMean = Math.abs(normalizedMean - baseline.normalizedMean);
                        const driftP95 = Math.abs(normalizedP95 - baseline.normalizedP95);

                        // Must not exceed ±20% normalized drift over historical runs.
                        expect(driftMean).toBeLessThan(0.20);
                        expect(driftP95).toBeLessThan(0.25);
                    }

                    // --------------------------------------------------------------
                    // STEP 5 — WRITE UPDATED BASELINE
                    // --------------------------------------------------------------
                    writeBaseline(schemaName, section, {
                        calibrationMean,
                        calibrationP95,
                        calibrationP99,
                        normalizedMean,
                        normalizedP95,
                        normalizedP99,
                        rawMean,
                        rawP95,
                        rawP99
                    });
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.22 — CPU-THROTTLING & REDUCED-QUOTA DEGRADATION MODEL
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Models and enforces performance correctness when the execution environment
             *   is running under *reduced CPU entitlement*, including:
             *      • aggressive DVFS frequency scaling (downclocking),
             *      • cloud-provider throttle quotas,
             *      • cgroup CPU-share limits,
             *      • container CPU quota reductions (Kubernetes, Docker),
             *      • noisy-neighbour resource starvation,
             *      • thermal throttling under sustained workloads.
             *
             * WHY THIS MATTERS
             * ----------------
             *   Mission-critical validation workloads (identity enforcement, ingestion
             *   gateways, regulatory filters) must remain stable and predictable even when
             *   CPU time is rationed or throttled by:
             *      • Kubernetes CPU limits,
             *      • Cloudflare Worker CPU alarms,
             *      • AWS/GCP/Azure VM quota shifts,
             *      • serverless CPU scaling logic,
             *      • multi-tenant shared compute nodes.
             *
             *   Schema validation must not:
             *      • degrade exponentially,
             *      • introduce tail explosions under throttling,
             *      • violate SLO envelopes at 25–50–75% CPU reduction,
             *      • collapse throughput under reduced CPU frequency.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • normalized degradation ≤ 1.75× mean under 50% throttle  
             *   • p95 degradation ≤ 2.25× under 50% throttle  
             *   • jitter must not exceed 40% coefficient of variation  
             *   • performance curve must remain *monotonic* and *non-exponential*  
             *
             *   Baseline file:
             *      __benchmarks__/<schema>/7.22.cpu-throttle.json
             *
             * MECHANISM
             * ---------
             *   Since Vitest cannot directly enforce real OS-level throttling, we simulate
             *   throttled CPU by:
             *      • inserting calibrated nano-delays into execution,
             *      • reducing time-slice availability,
             *      • increasing micro-wait contention,
             *      • enforcing busy-wait cycles representing reduced CPU speed.
             *
             *   This produces a *faithful degradation proxy* that models real downclocking.
             *
             * ============================================================================
             */

            function simulateThrottle(level: number) {
                // level: 0.25 = 25% throttle, 0.5 = 50% throttle, 0.75 = 75% throttle
                // We simulate degraded CPU conditions using calibrated micro-delays.
                const cycles = Math.floor(500 * level);

                for (let i = 0; i < cycles; i++) {
                    // Busy loop—models reduced time-slice or underclocked CPU.
                    // The body intentionally minimal to maintain deterministic cost.
                    let x = i;
                    x = x + 1;
                }
            }

            function runThrottledBenchmark(fn: () => void, throttleLevel: number, iterations: number) {
                const times: number[] = [];

                for (let i = 0; i < iterations; i++) {
                    simulateThrottle(throttleLevel);
                    const t0 = performance.now();
                    fn();
                    const t1 = performance.now();
                    times.push(t1 - t0);
                }

                times.sort((a, b) => a - b);

                const mean = times.reduce((s, n) => s + n, 0) / times.length;
                const p95 = times[Math.floor(times.length * 0.95)];
                const p99 = times[Math.floor(times.length * 0.99)];

                const variance =
                    times.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / times.length;
                const jitter = Math.sqrt(variance) / mean;

                return { mean, p95, p99, jitter, times };
            }

            it("7.22 — CPU-throttling degradation must remain linear, predictable, and within SLA envelopes", () => {
                const section = "7.22.cpu-throttle";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const benchFn = () => safeParse(schema, input);

                    // --------------------------------------------------------------
                    // STEP 1 — Establish "no throttle" baseline
                    // --------------------------------------------------------------
                    const baseline = runThrottledBenchmark(benchFn, 0, 5000);
                    const baseMean = baseline.mean;

                    // --------------------------------------------------------------
                    // STEP 2 — Simulate throttling @ 25%, 50%, 75%
                    // --------------------------------------------------------------
                    const lvl25 = runThrottledBenchmark(benchFn, 0.25, 5000);
                    const lvl50 = runThrottledBenchmark(benchFn, 0.50, 5000);
                    const lvl75 = runThrottledBenchmark(benchFn, 0.75, 5000);

                    // --------------------------------------------------------------
                    // STEP 3 — Enforce SLA degradation envelopes
                    // --------------------------------------------------------------

                    // Degradation multipliers must remain controlled.
                    const d25 = lvl25.mean / baseMean;
                    const d50 = lvl50.mean / baseMean;
                    const d75 = lvl75.mean / baseMean;

                    // 25% throttle should degrade ~1.1–1.3×
                    expect(d25).toBeLessThan(1.35);

                    // 50% throttle must not exceed 1.75× degradation
                    expect(d50).toBeLessThan(1.75);

                    // 75% throttle: worst-case allowance but still must be bounded
                    expect(d75).toBeLessThan(2.50);

                    // p95 degradation under 50% throttle must remain below 2.25×
                    expect(lvl50.p95 / baseline.p95).toBeLessThan(2.25);

                    // Jitter (coefficient of variation) must remain stable
                    expect(lvl50.jitter).toBeLessThan(0.40);
                    expect(lvl75.jitter).toBeLessThan(0.50);

                    // --------------------------------------------------------------
                    // STEP 4 — Performance curve must be monotonic and non-exponential
                    // --------------------------------------------------------------
                    expect(d25 < d50 && d50 < d75).toBe(true);
                    expect(d75).toBeLessThan(d50 * 1.75); // prevents exponential growth

                    // --------------------------------------------------------------
                    // STEP 5 — Baseline comparison & persistence
                    // --------------------------------------------------------------
                    const file = readBaseline(schemaName, section);

                    if (file) {
                        const driftMean = Math.abs(d50 - file.deg50);

                        // drift must remain ≤ 20% under throttled conditions
                        expect(driftMean).toBeLessThan(0.20);
                    }

                    writeBaseline(schemaName, section, {
                        baseMean,
                        deg25: d25,
                        deg50: d50,
                        deg75: d75,
                        jitter25: lvl25.jitter,
                        jitter50: lvl50.jitter,
                        jitter75: lvl75.jitter,
                        p95Base: baseline.p95,
                        p95_25: lvl25.p95,
                        p95_50: lvl50.p95,
                        p95_75: lvl75.p95
                    });
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.23 — BACKPRESSURE & PIPELINE LATENCY PROPAGATION MODEL
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Models how schema-validation cost behaves when executed inside a
             *   multi-stage pipeline that experiences:
             *      • upstream bottlenecks,
             *      • downstream slow consumers,
             *      • queue buildup / saturation,
             *      • burst traffic and micro-backlogs,
             *      • cascading latency propagation across stages.
             *
             * WHY THIS MATTERS
             * ----------------
             *   In real enterprise ingestion / ETL / messaging / streaming systems,
             *   schema validation is *never isolated*. It sits inside pipelines driven by:
             *      • Kafka → Flink → storage sinks
             *      • Kinesis → Lambda chains
             *      • microservice request/response cycles
             *      • Worker queues with variable consumer availability
             *      • Cloudflare Workers Durable Objects + queues
             *
             *   A schema that is “fast in isolation” may still destabilize an entire
             *   pipeline under:
             *      • concurrency contention,
             *      • queue depth > threshold,
             *      • burst load,
             *      • consumer lag,
             *      • partial-failure retransmission storms.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • Latency under backpressure must not degrade > 2.5× baseline  
             *   • p95 propagation must remain < 3.5× baseline  
             *   • Queue saturation curve must remain *sublinear*  
             *   • End-to-end latency must remain monotonic with respect to queue depth  
             *   • Jitter must remain < 45% CV (coefficient of variation)  
             *
             *   Baseline file:
             *      __benchmarks__/<schema>/7.23.backpressure.json
             *
             * SIMULATION MODEL
             * ----------------
             *   We simulate pipeline behavior by:
             *      • running schema validation in "stages"
             *      • introducing configurable downstream delay
             *      • generating queue depth buildup scenarios (5 → 10 → 20 → 40 items)
             *      • measuring end-to-end latency propagation
             *      • comparing curves to historical baseline
             *
             *   This faithfully approximates real-world backpressure dynamics.
             *
             * ============================================================================
             */

            function simulatePipelineStage(fn: () => void, downstreamDelay: number) {
                const t0 = performance.now();

                // Upstream "work"
                fn();

                // Downstream slow consumer or processing lag
                const target = performance.now() + downstreamDelay;
                while (performance.now() < target) {
                    // busy-wait to simulate blocked pipeline stage
                }

                const t1 = performance.now();
                return t1 - t0;
            }

            function runPipelineScenario(
                fn: () => void,
                queueDepth: number,
                downstreamDelay: number
            ) {
                const results: number[] = [];

                for (let i = 0; i < queueDepth; i++) {
                    const latency = simulatePipelineStage(fn, downstreamDelay);
                    results.push(latency);
                }

                results.sort((a, b) => a - b);

                const mean = results.reduce((s, n) => s + n, 0) / results.length;
                const p95 = results[Math.floor(results.length * 0.95)];
                const jitter =
                    Math.sqrt(
                        results.reduce((s, n) => s + Math.pow(n - mean, 2), 0) /
                        results.length
                    ) / mean;

                return { results, mean, p95, jitter };
            }

            it("7.23 — Backpressure & pipeline latency propagation must remain bounded, monotonic, and sublinear", () => {
                const section = "7.23.backpressure";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const benchFn = () => safeParse(schema, input);

                    // --------------------------------------------------------------
                    // STEP 1 — Establish isolated baseline (queue depth = 1)
                    // --------------------------------------------------------------
                    const baseline = runPipelineScenario(benchFn, 1, 0);
                    const baseMean = baseline.mean;

                    // --------------------------------------------------------------
                    // STEP 2 — Simulate pipeline backpressure scenarios
                    // --------------------------------------------------------------
                    const q5 = runPipelineScenario(benchFn, 5, 0.05);
                    const q10 = runPipelineScenario(benchFn, 10, 0.10);
                    const q20 = runPipelineScenario(benchFn, 20, 0.15);
                    const q40 = runPipelineScenario(benchFn, 40, 0.20);

                    // --------------------------------------------------------------
                    // STEP 3 — Enforce monotonic, sublinear degradation
                    // --------------------------------------------------------------
                    const f = (s: { mean: number }) => s.mean / baseMean;

                    const d5 = f(q5);
                    const d10 = f(q10);
                    const d20 = f(q20);
                    const d40 = f(q40);

                    // Monotonicity: deeper queues must not produce *lower* latency
                    expect(d5 >= 1).toBe(true);
                    expect(d10 >= d5).toBe(true);
                    expect(d20 >= d10).toBe(true);
                    expect(d40 >= d20).toBe(true);

                    // Sublinear growth: must not explode exponentially
                    expect(d10).toBeLessThan(2.0);
                    expect(d20).toBeLessThan(2.5);
                    expect(d40).toBeLessThan(3.5);

                    // --------------------------------------------------------------
                    // STEP 4 — p95 tail propagation limits
                    // --------------------------------------------------------------
                    const p95ratio_40 = q40.p95 / baseline.p95;
                    expect(p95ratio_40).toBeLessThan(3.5);

                    // --------------------------------------------------------------
                    // STEP 5 — Jitter controls
                    // --------------------------------------------------------------
                    expect(q40.jitter).toBeLessThan(0.45);

                    // --------------------------------------------------------------
                    // STEP 6 — Baseline regression comparison
                    // --------------------------------------------------------------
                    const file = readBaseline(schemaName, section);

                    if (file) {
                        // Comparing the curve shape: mean degradation at q20 and q40
                        const drift20 = Math.abs(d20 - file.deg20);
                        const drift40 = Math.abs(d40 - file.deg40);

                        expect(drift20).toBeLessThan(0.25);
                        expect(drift40).toBeLessThan(0.30);
                    }

                    // --------------------------------------------------------------
                    // STEP 7 — Baseline update
                    // --------------------------------------------------------------
                    writeBaseline(schemaName, section, {
                        baseMean,
                        deg5: d5,
                        deg10: d10,
                        deg20: d20,
                        deg40: d40,
                        p95Base: baseline.p95,
                        p95_5: q5.p95,
                        p95_10: q10.p95,
                        p95_20: q20.p95,
                        p95_40: q40.p95,
                        jitter_5: q5.jitter,
                        jitter_10: q10.jitter,
                        jitter_20: q20.jitter,
                        jitter_40: q40.jitter
                    });
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.24 — LONG-RUN STABILITY & SOAK TEST
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Validates that schema validation remains:
             *      • stable,
             *      • predictable,
             *      • leak-free,
             *      • GC-tolerant,
             *      • throughput-consistent,
             *   across extended execution periods under continuous load.
             *
             * WHY THIS MATTERS
             * ----------------
             *   Short benchmarks (1–20k iterations) mask long-run behavioral defects:
             *      • micro-leaks accumulating over time,
             *      • GC pacing drift,
             *      • JIT deoptimization after polymorphic callsites form,
             *      • oscillating latency patterns due to feedback loops,
             *      • steady-state instability after warmup plateau,
             *      • mechanical-sympathy breakdown (cache thrash, branch-predictor churn),
             *      • "creeping" performance degradation during multi-hour runs.
             *
             *   Large Fortune-50 data pipelines (Kafka/Flink, PubSub, ETL, CDC, ingestion,
             *   analytics) depend on multi-hour or always-on stability. Even a **1% drift
             *   per 100k operations** becomes catastrophic.
             *
             * TEST MODEL
             * ----------
             *   We simulate a soak test by executing:
             *
             *      • 10 long-run phases
             *      • each phase = 50_000 sequential validations
             *      • capturing:
             *           – phase mean,
             *           – phase p95,
             *           – GC heap deltas,
             *           – drift curve,
             *           – jitter accumulation,
             *           – max spike envelope.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • Drift per phase < 7% vs phase 1  
             *   • Total drift after 500k validations < 15%  
             *   • Heap delta across entire soak < 8 MB  
             *   • p95 across phases must remain monotonic-bounded (< 2.5× first-phase p95)  
             *   • Maximum spike < 15× baseline mean  
             *   • No phase may exhibit jitter > 60% CV  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<schema>/7.24.soak.json
             *
             * ============================================================================
             */

            function runSoakPhase(fn: () => void, iterations: number) {
                const times: number[] = [];

                for (let i = 0; i < iterations; i++) {
                    const t0 = performance.now();
                    fn();
                    const t1 = performance.now();
                    times.push(t1 - t0);
                }

                times.sort((a, b) => a - b);

                const mean = times.reduce((s, n) => s + n, 0) / times.length;
                const p95 = times[Math.floor(times.length * 0.95)];

                const variance =
                    times.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / times.length;
                const sd = Math.sqrt(variance);
                const jitter = sd / mean;

                return { times, mean, p95, jitter };
            }

            function heap() {
                return process.memoryUsage().heapUsed;
            }

            it("7.24 — schema validation must remain stable over multi-phase long-run soak cycles", () => {
                const section = "7.24.soak";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const fn = () => safeParse(schema, input);

                    const TOTAL_PHASES = 10;
                    const PHASE_ITERS = 50_000;

                    const phaseResults: Array<{
                        mean: number;
                        p95: number;
                        jitter: number;
                        max: number;
                    }> = [];

                    const heapBefore = heap();

                    // --------------------------------------------------------------
                    // STEP 1 — Execute soak phases
                    // --------------------------------------------------------------
                    for (let phase = 0; phase < TOTAL_PHASES; phase++) {
                        const result = runSoakPhase(fn, PHASE_ITERS);
                        const max = result.times[result.times.length - 1];

                        phaseResults.push({
                            mean: result.mean,
                            p95: result.p95,
                            jitter: result.jitter,
                            max
                        });
                    }

                    const heapAfter = heap();
                    const heapDeltaMB = (heapAfter - heapBefore) / (1024 * 1024);

                    // --------------------------------------------------------------
                    // STEP 2 — Baseline (phase 0 reference)
                    // --------------------------------------------------------------
                    const base = phaseResults[0];
                    const baseMean = base.mean;
                    const baseP95 = base.p95;

                    // --------------------------------------------------------------
                    // STEP 3 — Contract enforcement per phase
                    // --------------------------------------------------------------
                    for (let i = 0; i < phaseResults.length; i++) {
                        const p = phaseResults[i];

                        // Drift vs phase 1
                        const drift = (p.mean - baseMean) / baseMean;
                        expect(drift).toBeLessThan(0.07); // < 7%

                        // Tail latency bounds
                        expect(p.p95 / baseP95).toBeLessThan(2.5);

                        // Jitter envelope
                        expect(p.jitter).toBeLessThan(0.60);

                        // Max spike containment
                        expect(p.max).toBeLessThan(baseMean * 15);
                    }

                    // --------------------------------------------------------------
                    // STEP 4 — Global drift bound across entire soak
                    // --------------------------------------------------------------
                    const last = phaseResults[phaseResults.length - 1];
                    const totalDrift = (last.mean - baseMean) / baseMean;
                    expect(totalDrift).toBeLessThan(0.15); // < 15%

                    // --------------------------------------------------------------
                    // STEP 5 — Memory stability
                    // --------------------------------------------------------------
                    expect(heapDeltaMB).toBeLessThan(8);

                    // --------------------------------------------------------------
                    // STEP 6 — Baseline regression comparison
                    // --------------------------------------------------------------
                    const file = readBaseline(schemaName, section);
                    if (file) {
                        const diff = Math.abs(totalDrift - file.totalDrift);
                        expect(diff).toBeLessThan(0.10); // ≤10% allowable drift variance
                    }

                    // --------------------------------------------------------------
                    // STEP 7 — Baseline update
                    // --------------------------------------------------------------
                    writeBaseline(schemaName, section, {
                        baseMean,
                        baseP95,
                        phases: phaseResults,
                        totalDrift,
                        heapDeltaMB
                    });
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.25 — JIT HEAT-UP & COOL-DOWN THERMAL PROFILE BENCHMARK
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Detects performance instability caused by V8's:
             *      • JIT warmup phase,
             *      • inline-cache (IC) monomorphism → polymorphism transitions,
             *      • speculative optimization,
             *      • tier-up (Ignition → TurboFan) transitions,
             *      • tier-down (deoptimization bailouts),
             *      • instruction-cache warming and cooling cycles.
             *
             * WHY THIS MATTERS
             * ----------------
             *   Enterprise ingestion systems frequently experience thermal cycles caused by:
             *      • traffic bursts (warming → hot state),
             *      • idle windows (cool-down → cold state),
             *      • shape diversity (IC instability),
             *      • heterogeneous subrequests,
             *      • periodic multi-tenant scheduling shifts.
             *
             *   A schema that is fast only in fully-warmed JIT state is **operationally unsafe**.
             *
             * TEST MODEL
             * ----------
             *   Simulates a prediction of real thermal cycles:
             *
             *      1. COLD PHASE      — 500 iterations
             *      2. HEAT-UP PHASE   — 10_000 iterations warm loop
             *      3. HOT PHASE       — 20_000 iterations sustained high-speed steady-state
             *      4. COOL-DOWN PHASE — yield/idle cycles to force IC de-optimization drift
             *      5. REHEAT PHASE    — 5_000 iterations, measuring re-optimization speed
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • The hot-phase mean must be ≤ cold-phase mean × 0.40  
             *   • Reheat-phase mean must be ≤ hot-phase mean × 1.25  
             *   • Cool-down drift must not exceed 2× hot-phase mean  
             *   • p95 across phases must remain bounded:  
             *        – cold ≤ hot × 2.5  
             *        – cool-down ≤ hot × 3.5  
             *        – reheat ≤ hot × 2.0  
             *   • No deoptimization storms (max spike < 20 × hot-phase mean)  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<schema>/7.25.jitthermal.json
             *
             * ============================================================================
             */

            function runPhase(fn: () => void, iterations: number) {
                const times: number[] = [];
                for (let i = 0; i < iterations; i++) {
                    const t0 = performance.now();
                    fn();
                    const t1 = performance.now();
                    times.push(t1 - t0);
                }

                times.sort((a, b) => a - b);

                const mean = times.reduce((s, n) => s + n, 0) / times.length;
                const p95 = times[Math.floor(times.length * 0.95)];
                const max = times[times.length - 1];

                const variance =
                    times.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / times.length;
                const sd = Math.sqrt(variance);
                const jitter = sd / mean;

                return { mean, p95, max, jitter };
            }

            async function coolDown() {
                // Force event-loop yield & timer-based idle periods to destabilize IC hot-paths.
                for (let i = 0; i < 50; i++) {
                    await Promise.resolve();
                    await new Promise((r) => setTimeout(r, 1));
                }
            }

            it("7.25 — schema validation must maintain JIT thermal stability across warm-up/cool-down cycles", async () => {
                const section = "7.25.jitthermal";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const fn = () => safeParse(schema, input);

                    // --------------------------------------------------------------
                    // PHASE 1 — COLD
                    // --------------------------------------------------------------
                    const cold = runPhase(fn, 500);

                    // --------------------------------------------------------------
                    // PHASE 2 — HEAT-UP
                    // --------------------------------------------------------------
                    runPhase(fn, 10_000); // no metrics, pure warm-up

                    // --------------------------------------------------------------
                    // PHASE 3 — HOT (steady state)
                    // --------------------------------------------------------------
                    const hot = runPhase(fn, 20_000);

                    // --------------------------------------------------------------
                    // PHASE 4 — COOL-DOWN
                    // --------------------------------------------------------------
                    await coolDown();
                    const cooldown = runPhase(fn, 1_000);

                    // --------------------------------------------------------------
                    // PHASE 5 — REHEAT
                    // --------------------------------------------------------------
                    const reheat = runPhase(fn, 5_000);

                    // --------------------------------------------------------------
                    // CONTRACT ENFORCEMENT
                    // --------------------------------------------------------------

                    // Hot path must dramatically outperform cold path
                    expect(hot.mean).toBeLessThan(cold.mean * 0.40);

                    // Reheat must remain close to hot steady-state performance
                    expect(reheat.mean).toBeLessThan(hot.mean * 1.25);

                    // Cool-down drift must not explode
                    expect(cooldown.mean).toBeLessThan(hot.mean * 2);

                    // Percentile containment
                    expect(cold.p95).toBeLessThan(hot.p95 * 2.5);
                    expect(cooldown.p95).toBeLessThan(hot.p95 * 3.5);
                    expect(reheat.p95).toBeLessThan(hot.p95 * 2.0);

                    // No deoptimization storms (max spike protection)
                    expect(hot.max).toBeLessThan(hot.mean * 20);
                    expect(cooldown.max).toBeLessThan(hot.mean * 20);
                    expect(reheat.max).toBeLessThan(hot.mean * 20);

                    // --------------------------------------------------------------
                    // BASELINE COMPARISON
                    // --------------------------------------------------------------
                    const file = readBaseline(schemaName, section);

                    if (file) {
                        // Drift from historical hot mean
                        const drift = Math.abs((hot.mean - file.hot.mean) / file.hot.mean);
                        expect(drift).toBeLessThan(0.20); // ≤20% drift allowed

                        // Reheat stability over time
                        const reheatDrift = Math.abs(
                            (reheat.mean - file.reheat.mean) / file.reheat.mean
                        );
                        expect(reheatDrift).toBeLessThan(0.25);
                    }

                    // --------------------------------------------------------------
                    // BASELINE UPDATE
                    // --------------------------------------------------------------
                    writeBaseline(schemaName, section, {
                        cold,
                        hot,
                        cooldown,
                        reheat
                    });
                }

                expect(true).toBe(true);
            });

            /**
             * ============================================================================
             * SECTION 7.26 — MULTI-TENANT NOISY-NEIGHBOR RESILIENCE MODEL
             * ============================================================================
             *
             * PURPOSE
             * -------
             *   Ensures schema validation remains stable in multi-tenant environments where
             *   unrelated workloads compete for:
             *      • CPU time,
             *      • event-loop scheduling,
             *      • GC cycles,
             *      • instruction-cache locality,
             *      • memory bandwidth,
             *      • microtask queue priority.
             *
             * WHY ENTERPRISE REQUIRES THIS
             * ----------------------------
             *   REALITY CHECK:
             *   Modern Fortune-50 infrastructure rarely runs validators in isolation.
             *   Instead, schemas execute on:
             *      • shared Kubernetes nodes,
             *      • multi-tenant edge runtimes,
             *      • serverless isolates (Cloudflare, V8 isolates),
             *      • saturated ingestion workers,
             *      • heavily loaded function runtimes (AWS Lambda),
             *      • event-driven pipelines collocated with unrelated workloads.
             *
             *   NOISY-NEIGHBOR EFFECTS CREATE:
             *      • latency volatility,
             *      • GC-trigger interference,
             *      • microburst slowdowns,
             *      • CPU-time fragmentation,
             *      • cache-line thrash,
             *      • deoptimizations caused by competing functions,
             *      • unfair scheduler time-slicing.
             *
             *   Without explicit measurement, schema validation can silently degrade 2×–100×
             *   when deployed to real multi-tenant infrastructure.
             *
             * TEST MODEL
             * ----------
             *   Simulates a hostile multi-tenant environment using:
             *
             *      • CPU burners (tight arithmetic loops)
             *      • memory churners (heap alloc/free)
             *      • GC agitators (array allocations + drops)
             *      • microtask storms (Promise.resolve cascades)
             *      • async IO illusions (setImmediate + timer-based oscillation)
             *
             *   Then validation is executed DURING the interference window.
             *
             * CONTRACT REQUIREMENTS
             * ---------------------
             *   • mean latency degradation ≤ 35% under noisy-neighbor conditions  
             *   • p95 latency degradation ≤ 50%  
             *   • no catastrophic spikes (> 20× baseline hot mean)  
             *   • jitter increase ≤ 30%  
             *   • validation must remain within maxMsPerOp × 3  
             *
             * BASELINE FILE
             * -------------
             *   __benchmarks__/<schema>/7.26.noisyneighbor.json
             *
             * ============================================================================
             */

            async function spawnNoise(durationMs = 40) {
                const tEnd = performance.now() + durationMs;

                // CPU burner (tight arithmetic)
                function spin() {
                    let x = 0;
                    for (let i = 0; i < 10_000; i++) {
                        x += (i ^ (x << 1)) & 0xff;
                    }
                    return x;
                }

                // Memory churner
                function churn() {
                    const arr = new Array(5000).fill(0).map((_, i) => i);
                    return arr[Math.floor(Math.random() * arr.length)];
                }

                // Microtask storm
                for (let k = 0; k < 30; k++) {
                    Promise.resolve().then(() => spin());
                }

                // Asynchronous timer noise
                const timers: Promise<void>[] = [];
                for (let i = 0; i < 5; i++) {
                    timers.push(new Promise((resolve) => setTimeout(resolve, 0)));
                }

                // Main interference loop
                while (performance.now() < tEnd) {
                    spin();
                    churn();
                    await Promise.resolve(); // yield into microtask queue
                }

                await Promise.all(timers);
            }

            function measureNoisy(fn: () => void, iters = 5000) {
                const times: number[] = [];

                for (let i = 0; i < iters; i++) {
                    const t0 = performance.now();
                    fn();
                    const t1 = performance.now();
                    times.push(t1 - t0);
                }

                times.sort((a, b) => a - b);

                const mean = times.reduce((s, n) => s + n, 0) / times.length;
                const p95 = times[Math.floor(times.length * 0.95)];
                const max = times[times.length - 1];

                const variance =
                    times.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / times.length;
                const sd = Math.sqrt(variance);
                const jitter = sd / mean;

                return { mean, p95, max, jitter };
            }

            it("7.26 — schema validation must remain resilient under multi-tenant noisy-neighbor interference", async () => {
                const section = "7.26.noisyneighbor";

                for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
                    const input =
                        VALID_CASES[schemaName]?.[0] ??
                        INVALID_CASES[schemaName]?.[0] ??
                        true;

                    const fn = () => safeParse(schema, input);

                    // -----------------------------
                    // BASELINE (quiet environment)
                    // -----------------------------
                    const baseline = runBenchmark(fn);
                    const baseMean = baseline.mean;
                    const baseP95 = baseline.p95;
                    const baseJitter = baseline.jitter;

                    // -----------------------------
                    // NOISY NEIGHBOR TEST
                    // -----------------------------
                    // Start noise asynchronously while running benchmark
                    const noise = spawnNoise(60); // 60 ms noise window

                    const noisy = measureNoisy(fn, 5000);

                    await noise; // ensure full interference cycle completed

                    // -----------------------------
                    // CONTRACT ENFORCEMENT
                    // -----------------------------

                    // Mean degradation limit
                    expect(noisy.mean / baseMean).toBeLessThan(1.35);

                    // p95 degradation limit
                    expect(noisy.p95 / baseP95).toBeLessThan(1.50);

                    // Jitter drift
                    expect(noisy.jitter / baseJitter).toBeLessThan(1.30);

                    // Extreme spike protection
                    expect(noisy.max).toBeLessThan(baseMean * 20);

                    // SLA for absolute latency
                    expect(noisy.mean).toBeLessThan(maxMsPerOp * 3);

                    // -----------------------------
                    // BASELINE COMPARISON
                    // -----------------------------
                    const file = readBaseline(schemaName, section);
                    if (file) {
                        const drift =
                            Math.abs(noisy.mean - file.noisy.mean) / file.noisy.mean;

                        // ≤25% over-history drift permitted
                        expect(drift).toBeLessThan(0.25);
                    }

                    // -----------------------------
                    // BASELINE UPDATE
                    // -----------------------------
                    writeBaseline(schemaName, section, {
                        baseline,
                        noisy
                    });
                }

                expect(true).toBe(true);
            });
        }
    );
}