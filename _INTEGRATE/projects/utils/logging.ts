export function detectLoggingSystems() {
    const systems: Record<string, any> = {};

    const hasCache =
        typeof require !== "undefined" &&
        require.cache &&
        typeof require.cache === "object";

    const cacheKeys = hasCache ? Object.keys(require.cache) : [];

    const matchesCache = (substr: string) =>
        cacheKeys.some(k => k.toLowerCase().includes(substr.toLowerCase()));

    // Native console
    systems.console = true;
    systems.consolePatched = console.log.toString().includes("[native") === false;

    // Node util.debuglog
    systems.nodeDebugLog = !!process.env.NODE_DEBUG;

    // Winston
    systems.winston = matchesCache("winston");

    // Pino
    systems.pino =
        !!process.env.PINO_PRETTY ||
        matchesCache("pino") ||
        !!globalThis.__PINO_LOGGER__;

    // Bunyan
    systems.bunyan = matchesCache("bunyan");

    // Log4js
    systems.log4js = matchesCache("log4js");

    // Debug (visionmedia)
    systems.debug =
        !!process.env.DEBUG || matchesCache("debug");

    // Roarr / Roche structured logger
    systems.roarr = matchesCache("roarr");

    // Consola (Nuxt, Vue)
    systems.consola = matchesCache("consola");

    // Tslog
    systems.tslog = matchesCache("tslog");

    // Signale
    systems.signale = matchesCache("signale");

    // Electon log
    systems.electronLog = matchesCache("electron-log");

    // Cloudflare Worker Built-in Logs
    systems.cloudflareWorkerLogs =
        typeof WebSocketPair !== "undefined" &&
        typeof caches !== "undefined";

    // Vercel Edge
    systems.vercelEdgeLogs = typeof EdgeRuntime !== "undefined";

    // AWS Lambda logs
    systems.awsLambdaLogs = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    // GCP Logs
    systems.gcpLogs =
        !!process.env.GCP_PROJECT ||
        !!process.env.FUNCTION_TARGET;

    // Azure Functions logs
    systems.azureLogs = !!process.env.WEBSITE_INSTANCE_ID;

    // Heroku Logplex
    systems.heroku = !!process.env.DYNO;

    return systems;
}

export function detectLoggingTransports() {
    const transports: Record<string, any> = {};

    // File transports
    transports.file = [
        "logs",
        "log",
        "log.txt",
        "logs/app.log",
        "app.log",
        "/var/log",
        "/var/log/app.log",
        "/tmp/app.log"
    ].some(path => {
        try {
            const fs = require("fs");
            return fs.existsSync(path);
        } catch {
            return false;
        }
    });

    // Syslog / journald
    transports.syslog =
        !!process.env.JOURNAL_STREAM ||
        !!process.env.SYSLOG_IDENTIFIER ||
        process.platform === "linux";

    // Kafka logger
    transports.kafka =
        !!process.env.KAFKA_BROKERS ||
        !!process.env.KAFKA_URL ||
        !!process.env.KAFKA_HOST;

    // ElasticSearch logger
    transports.elasticsearch =
        !!process.env.ELASTICSEARCH_URL ||
        !!process.env.ES_URL;

    // Datadog logs
    transports.datadog =
        !!process.env.DD_API_KEY ||
        !!process.env.DD_LOGS_INJECTION;

    // Loki / Grafana
    transports.loki =
        !!process.env.LOKI_URL ||
        !!process.env.GRAFANA_CLOUD_API;

    // Logflare / Supabase
    transports.logflare =
        !!process.env.LOGFLARE_KEY;

    // CloudWatch
    transports.cloudwatch =
        !!process.env.AWS_REGION ||
        !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    // Stackdriver (GCP)
    transports.stackdriver = !!process.env.GCP_PROJECT;

    // Sentry
    transports.sentry =
        !!process.env.SENTRY_DSN ||
        !!globalThis.Sentry;

    return transports;
}

export function detectLoggingFormatters() {
    const out: Record<string, any> = {};

    // Pino-pretty
    out.pinoPretty =
        !!process.env.PINO_PRETTY ||
        !!process.env.PINO_PRETTY_PRINT;

    // Winston formats
    out.winstonJson =
        !!process.env.WINSTON_FORMAT_JSON;

    out.winstonColorize =
        !!process.env.WINSTON_COLOR;

    // Bun pretty logs
    out.bunPretty =
        typeof Bun !== "undefined" &&
        Bun?.inspect;

    // JSON-only logger detection
    out.jsonLogger =
        !!process.env.FORCE_JSON_LOGS ||
        (process.stdout?.isTTY === false);

    // Cloudflare JSON logs
    out.cloudflareJson =
        typeof WebSocketPair !== "undefined";

    // Browser-devtools color logs
    out.browserStyledLogs =
        typeof window !== "undefined";

    return out;
}

export function detectStructuredLogging() {
    return {
        opentelemetry:
            !!process.env.OTEL_SERVICE_NAME ||
            !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
            (typeof require !== "undefined" &&
                Object.keys(require.cache || {}).some(k => k.includes("@opentelemetry"))),

        w3cTraceContext:
            !!process.env.TRACEPARENT ||
            !!process.env.TRACESTATE,

        bunScopes:
            typeof Bun !== "undefined" && !!Bun?.transpiler?.scan,

        edgeTracing:
            typeof EdgeRuntime !== "undefined",

        lambdaTracing:
            !!process.env._X_AMZN_TRACE_ID
    };
}

export function detectConsolePatching() {
    const patched = (fn: Function) =>
        !fn.toString().includes("[native code]");

    return {
        consoleLogPatched: patched(console.log),
        consoleErrorPatched: patched(console.error),
        consoleWarnPatched: patched(console.warn),
        consoleInfoPatched: patched(console.info),

        anyPatched:
            patched(console.log) ||
            patched(console.error) ||
            patched(console.warn) ||
            patched(console.info)
    };
}

export function detectStdoutBehavior() {
    return {
        stdoutTTY: process.stdout?.isTTY ?? null,
        stderrTTY: process.stderr?.isTTY ?? null,
        stdoutPiped: (process.stdout?.isTTY === false) ?? null,
        stderrPiped: (process.stderr?.isTTY === false) ?? null,
        supportsColor: !!process.stdout?.getColorDepth?.(),
        colorDepth: process.stdout?.getColorDepth?.() ?? null
    };
}

export function detectFrameworkLogger() {
    const hasCache =
        typeof require !== "undefined" &&
        require.cache;

    const ck = hasCache ? Object.keys(require.cache) : [];

    const match = (substr: string) =>
        ck.some(k => k.includes(substr));

    return {
        expressLogger: match("express") && match("morgan"),
        fastifyLogger: match("fastify") && match("pino"),
        nestLogger: match("@nestjs") && match("logger"),
        svelteKitLogger: match("@sveltejs") || !!process.env.SVELTEKIT,
        nextLogger: match("next/dist/server/lib/logger"),
        nuxtConsola: match("consola"),
        remixLogger: match("@remix-run") && match("log"),
        honoLogger: match("hono") && match("logger"),
        bunElysiaLogger: match("elysia") && match("logger")
    };
}

export function detectCILogging() {
    return {
        githubActions: !!process.env.GITHUB_ACTIONS,
        gitlabCI: !!process.env.GITLAB_CI,
        bitbucketCI: !!process.env.BITBUCKET_BUILD_NUMBER,
        circleCI: !!process.env.CIRCLECI,
        azurePipelines: !!process.env.AZURE_HTTP_USER_AGENT,
        jenkins: !!process.env.JENKINS_URL,
        buildkite: !!process.env.BUILDKITE,
        codefresh: !!process.env.CODEFRESH,
        teamcity: !!process.env.TEAMCITY_VERSION
    };
}

export function getAllLoggingInfo() {
    return {
        systems: detectLoggingSystems(),
        transports: detectLoggingTransports(),
        formatters: detectLoggingFormatters(),
        structured: detectStructuredLogging(),
        console: detectConsolePatching(),
        stdout: detectStdoutBehavior(),
        frameworks: detectFrameworkLogger(),
        ci: detectCILogging()
    };
}