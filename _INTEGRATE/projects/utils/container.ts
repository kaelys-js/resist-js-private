export function getCloudEnvironmentInfo(env: any = process.env) {
    return {
        cloudflare: extractCloudflareInfo(env),
        aws: extractAWSLambdaInfo(env),
        gcp: extractGCPInfo(env),
        vercel: extractVercelInfo(env),
        netlify: extractNetlifyInfo(env),
        docker: extractDockerInfo(),
        kubernetes: extractKubernetesInfo(env),
        container: extractGenericContainerInfo(),
        runtime: extractRuntimeInfo(env),
    };
}

/* ============================================================
   CLOUDFLARE WORKERS / PAGES / DO / QUEUES / CRON / R2 / KV / D1
   COMPLETE, EXHAUSTIVE DETECTION
============================================================ */
function extractCloudflareInfo(env: Record<string, string>) {
    const out: any = {};

    /* ------------------------------------------------------------
       1. Detect Worker Runtime
       ------------------------------------------------------------ */
    const isRealWorkerRuntime =
        typeof globalThis?.WebSocketPair !== "undefined" &&
        typeof globalThis?.fetch !== "undefined" &&
        typeof globalThis?.navigator === "undefined";

    if (isRealWorkerRuntime) out.isWorker = true;

    /* ------------------------------------------------------------
       2. Detect Pages Functions (CF_PAGES = "1")
       ------------------------------------------------------------ */
    if (env.CF_PAGES === "1") out.isPagesFunction = true;

    /* ------------------------------------------------------------
       3. Detect Wrangler / Miniflare local dev
       ------------------------------------------------------------ */
    if (env.WRANGLER_DEV === "1") out.wranglerDev = true;
    if (env.MINIFLARE === "true" || env.MINIFLARE) out.miniflare = true;

    /* ------------------------------------------------------------
       4. Cloudflare worker region, deployment, account metadata
       ------------------------------------------------------------ */
    if (env.CF_REGION) out.region = env.CF_REGION;
    if (env.CF_LOCATION) out.location = env.CF_LOCATION;          // some newer runtimes
    if (env.CF_ACCOUNT_ID) out.accountId = env.CF_ACCOUNT_ID;
    if (env.CF_PROJECT_NAME) out.projectName = env.CF_PROJECT_NAME;
    if (env.CF_DEPLOYMENT_ID) out.deploymentId = env.CF_DEPLOYMENT_ID;
    if (env.CF_WORKER_NAME) out.workerName = env.CF_WORKER_NAME;
    if (env.CF_ENV) out.environment = env.CF_ENV;                 // staging / production

    /* ------------------------------------------------------------
       5. Durable Objects
       ------------------------------------------------------------ */
    try {
        if ("DurableObject" in globalThis) out.hasDurableObjects = true;
    } catch { }

    // v8 DO metadata (Cloudflare internal)
    if (env.CF_DURABLE_OBJECT) out.durableObjectBinding = env.CF_DURABLE_OBJECT;

    /* ------------------------------------------------------------
       6. Cloudflare Queues Consumers
       ------------------------------------------------------------ */
    if (env.CF_QUEUE) out.queue = true;
    if (env.CF_QUEUE_CONSUMER) out.queueConsumer = env.CF_QUEUE_CONSUMER;
    if (env.CF_QUEUE_PRODUCER) out.queueProducer = env.CF_QUEUE_PRODUCER;

    /* ------------------------------------------------------------
       7. Cron triggers
       ------------------------------------------------------------ */
    if (env.CF_CRON) out.cronSchedule = env.CF_CRON;
    if (env.CF_SCHEDULE) out.cronScheduleName = env.CF_SCHEDULE;

    /* ------------------------------------------------------------
       8. R2, KV, D1, Hyperdrive, AI, other bindings
       ------------------------------------------------------------ */
    // R2
    if (env.R2_BUCKET || env.R2) out.hasR2 = true;

    // KV
    if (env.KV || Object.keys(env).some(k => k.endsWith("_KV"))) {
        out.hasKV = true;
        out.kvBindings = Object.keys(env).filter(k => k.endsWith("_KV"));
    }

    // D1
    if (env.D1 || Object.keys(env).some(k => k.endsWith("_D1"))) {
        out.hasD1 = true;
        out.d1Bindings = Object.keys(env).filter(k => k.endsWith("_D1"));
    }

    // Hyperdrive DB
    if (env.HYPERDRIVE || Object.keys(env).some(k => k.endsWith("_HYPERDRIVE"))) {
        out.hasHyperdrive = true;
        out.hyperdriveBindings = Object.keys(env).filter(k =>
            k.endsWith("_HYPERDRIVE")
        );
    }

    // Cloudflare AI (Workers AI / AI Gateway)
    if (env.AI || env.CF_AI_GATEWAY || env.AI_GATEWAY) {
        out.hasAI = true;
        out.aiGateway = env.CF_AI_GATEWAY ?? env.AI_GATEWAY;
    }

    /* ------------------------------------------------------------
       9. Cloudflare Access / Zero Trust
       ------------------------------------------------------------ */
    if (env.CF_ACCESS_CLIENT_ID || env.CF_ACCESS_CLIENT_SECRET) {
        out.zeroTrustClient = true;
    }

    if (env.CF_ACCESS_JWT) out.zeroTrustJWT = true;
    if (env.CF_ACCESS_TOKEN) out.zeroTrustServiceToken = true;

    /* ------------------------------------------------------------
       10. Cloudflare Analytics Engine (Bindings)
       ------------------------------------------------------------ */
    const analyticsBindings = Object.keys(env).filter(k =>
        k.endsWith("_ANALYTICS") || k.includes("ANALYTICS_ENGINE")
    );
    if (analyticsBindings.length > 0) {
        out.analyticsEngine = {
            bindings: analyticsBindings
        };
    }

    /* ------------------------------------------------------------
       11. Cloudflare Worker metadata (v8)
       ------------------------------------------------------------ */
    if (globalThis?.navigator?.userAgent?.includes("Cloudflare-Workers")) {
        out.uaWorker = globalThis.navigator.userAgent;
    }

    // In worker: globalThis.caches exists & WebSocketPair exists
    if (globalThis.caches && globalThis.WebSocketPair) {
        out.runtime = "cloudflare-workers";
    }

    /* ------------------------------------------------------------
       12. Cloudflare Env Metadata (common across products)
       ------------------------------------------------------------ */
    for (const key of Object.keys(env)) {
        if (key.startsWith("CF_") && !out.envVars) out.envVars = {};
        if (key.startsWith("CF_")) out.envVars[key] = env[key];
    }

    return out;
}

/* ============================================================
   AWS LAMBDA — Full Runtime, Environment & Metadata Extraction
============================================================ */
function extractAWSLambdaInfo(env: Record<string, string>) {
    if (!env.AWS_LAMBDA_FUNCTION_NAME) return null;

    const out: any = {};

    /* ------------------------------------------------------------
       1. CORE FUNCTION METADATA
       ------------------------------------------------------------ */
    out.functionName = env.AWS_LAMBDA_FUNCTION_NAME;
    out.functionVersion = env.AWS_LAMBDA_FUNCTION_VERSION;
    out.memorySize = env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE;
    out.region = env.AWS_REGION || env.AWS_DEFAULT_REGION;
    out.accountId = env.AWS_ACCOUNT_ID || null;

    /* ------------------------------------------------------------
       2. HANDLER INFORMATION
       ------------------------------------------------------------ */
    out.handler = env._HANDLER ?? null;

    /* ------------------------------------------------------------
       3. LOGGING
       ------------------------------------------------------------ */
    out.logGroupName = env.AWS_LAMBDA_LOG_GROUP_NAME ?? null;
    out.logStreamName = env.AWS_LAMBDA_LOG_STREAM_NAME ?? null;
    out.xrayTraceId = env._X_AMZN_TRACE_ID ?? null;

    /* ------------------------------------------------------------
       4. EXECUTION ENVIRONMENT INFO
       ------------------------------------------------------------ */
    out.executionEnv = env.AWS_EXECUTION_ENV ?? null; // e.g. AWS_Lambda_nodejs20.x
    out.executionRoot = env.LAMBDA_TASK_ROOT ?? null;
    out.runtimeAPIVersion = env.AWS_LAMBDA_RUNTIME_API ?? null;

    // Container reuse detection
    if (env.AWS_LAMBDA_LOG_STREAM_NAME && env.AWS_LAMBDA_RUNTIME_API) {
        out.containerReusePossible = true;
    }

    /* ------------------------------------------------------------
       5. SNAPSTART (Java cold-start acceleration)
       ------------------------------------------------------------ */
    if (env.AWS_LAMBDA_EXEC_WRAPPER?.includes("snapstart")) {
        out.snapStartEnabled = true;
    }

    /* ------------------------------------------------------------
       6. EVENT SOURCE MAPPING (Streams / Queues / Async)
       ------------------------------------------------------------ */
    if (env.AWS_LAMBDA_EVENT_SOURCE_ARN) {
        out.eventSourceArn = env.AWS_LAMBDA_EVENT_SOURCE_ARN;
    }

    // Async invocation metadata
    if (env.AWS_LAMBDA_FUNCTION_TIMEOUT) {
        out.timeoutSeconds = env.AWS_LAMBDA_FUNCTION_TIMEOUT;
    }

    /* ------------------------------------------------------------
       7. DEAD LETTER + RETRY SETTINGS (if provided)
       ------------------------------------------------------------ */
    if (env.AWS_LAMBDA_DLQ_TARGET_ARN) {
        out.deadLetterQueueArn = env.AWS_LAMBDA_DLQ_TARGET_ARN;
    }

    /* ------------------------------------------------------------
       8. TELEMETRY / EXTENSIONS / AGENTS
       ------------------------------------------------------------ */
    if (env.LAMBDA_TELEMETRY_API) {
        out.telemetryAPI = env.LAMBDA_TELEMETRY_API;
    }

    // Lambda Extensions presence
    out.hasLambdaExtensions =
        !!env.AWS_LAMBDA_EXEC_WRAPPER ||
        !!env.LAMBDA_AGENT_PROCESS ||
        !!env.LAMBDA_RUNTIME_DIR;

    if (env.AWS_LAMBDA_EXEC_WRAPPER) {
        out.execWrapper = env.AWS_LAMBDA_EXEC_WRAPPER;
    }

    /* ------------------------------------------------------------
       9. TEMPORARY STORAGE (Ephemeral disk)
       ------------------------------------------------------------ */
    out.tempDir = env.TMPDIR ?? env.TMP ?? "/tmp";

    /* ------------------------------------------------------------
       10. AWS CREDENTIALS (Automatically injected)
       ------------------------------------------------------------ */
    const creds: any = {};

    if (env.AWS_ACCESS_KEY_ID) creds.accessKey = true;
    if (env.AWS_SECRET_ACCESS_KEY) creds.secretKey = true;
    if (env.AWS_SESSION_TOKEN) creds.sessionToken = true;
    if (env.AWS_ROLE_ARN) creds.roleArn = env.AWS_ROLE_ARN;
    if (Object.keys(creds).length > 0) out.credentials = creds;

    /* ------------------------------------------------------------
       11. LAMBDA EDGE (CloudFront)
       ------------------------------------------------------------ */
    if (env.AWS_EXECUTION_ENV?.includes("lambda-edge")) {
        out.isLambdaEdge = true;
    }

    /* ------------------------------------------------------------
       12. LAYERS
       ------------------------------------------------------------ */
    if (env.AWS_LAMBDA_RUNTIME_DIR) {
        out.layers = fsExists(env.AWS_LAMBDA_RUNTIME_DIR)
            ? listDirSafe(env.AWS_LAMBDA_RUNTIME_DIR)
            : null;
    }

    /* ------------------------------------------------------------
       13. RAW ENV SIGNALS (all AWS_* variables)
       ------------------------------------------------------------ */
    out.awsEnv = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("AWS_") || k.startsWith("LAMBDA_"))
            .sort()
    );

    return out;
}

/* Utility helpers */
function fsExists(p: string) {
    try {
        return require("fs").existsSync(p);
    } catch {
        return false;
    }
}
function listDirSafe(p: string) {
    try {
        return require("fs").readdirSync(p);
    } catch {
        return null;
    }
}

/* ============================================================
   GCP FUNCTIONS (1st/2nd gen) + CLOUD RUN + CLOUD BUILD
   COMPLETE EXHAUSTIVE ENV METADATA EXTRACTION
============================================================ */
function extractGCPInfo(env: Record<string, string>) {
    const out: any = {};

    /* ------------------------------------------------------------
       1. BASIC CLOUD FUNCTION IDENTITY (1st & 2nd Gen)
       ------------------------------------------------------------ */
    if (env.FUNCTION_TARGET) out.functionTarget = env.FUNCTION_TARGET;
    if (env.FUNCTION_SIGNATURE_TYPE) out.functionSignatureType = env.FUNCTION_SIGNATURE_TYPE; // http / event
    if (env.FUNCTION_NAME) out.functionName = env.FUNCTION_NAME;
    if (env.FUNCTION_REGION) out.functionRegion = env.FUNCTION_REGION;

    // 2nd Gen Cloud Functions use RUN service internally
    if (env.K_SERVICE && env.FUNCTION_TARGET) out.functionGen = "2nd-gen";
    if (!env.K_SERVICE && env.FUNCTION_TARGET) out.functionGen = "1st-gen";

    /* ------------------------------------------------------------
       2. CLOUD RUN SERVICE METADATA
       ------------------------------------------------------------ */
    if (env.K_SERVICE) out.cloudRunService = env.K_SERVICE;             // service name
    if (env.K_REVISION) out.cloudRunRevision = env.K_REVISION;         // revision ID
    if (env.K_CONFIGURATION) out.cloudRunConfiguration = env.K_CONFIGURATION;

    /* ------------------------------------------------------------
       3. PROJECT + REGION + ACCOUNT METADATA
       ------------------------------------------------------------ */
    out.projectId =
        env.GCP_PROJECT ??
        env.GOOGLE_CLOUD_PROJECT ??
        env.CLOUDSDK_CORE_PROJECT ??
        null;

    out.region =
        env.GCP_REGION ??
        env.FUNCTION_REGION ??
        env.X_GOOGLE_FUNCTION_REGION ??
        null;

    out.serviceAccount = env.FUNCTION_IDENTITY ?? env.GOOGLE_SERVICE_ACCOUNT ?? env.SERVICE_ACCOUNT ?? null;

    /* ------------------------------------------------------------
       4. EVENT TRIGGER METADATA
       ------------------------------------------------------------ */

    // Pub/Sub trigger
    if (env.PUBSUB_TOPIC) out.pubsubTopic = env.PUBSUB_TOPIC;

    // Eventarc-triggered functions (Cloud Run + 2nd Gen)
    if (env.CLOUD_EVENTS) out.eventarc = true;

    // Cloud Storage trigger
    if (env.BUCKET_NAME) out.storageBucketTrigger = env.BUCKET_NAME;

    // Scheduler trigger (Cloud Scheduler -> HTTP)
    if (env.SCHEDULE_NAME || env.X_GOOGLE_SCHEDULED_EXECUTION_TIME) {
        out.scheduler = {
            name: env.SCHEDULE_NAME ?? null,
            executionTime: env.X_GOOGLE_SCHEDULED_EXECUTION_TIME ?? null
        };
    }

    // Cloud Tasks trigger metadata
    if (env.X_CLOUDTASKS_TASKNAME || env.X_CLOUDTASKS_QUEUENAME) {
        out.cloudTasks = {
            taskName: env.X_CLOUDTASKS_TASKNAME ?? null,
            queueName: env.X_CLOUDTASKS_QUEUENAME ?? null,
            retryCount: env.X_CLOUDTASKS_TASKRETRYCOUNT ?? null
        };
    }

    /* ------------------------------------------------------------
       5. CLOUD BUILD ENVIRONMENT DETECTION
       ------------------------------------------------------------ */
    if (env.CLOUD_BUILD || env.BUILD_ID || env.BUILDER_OUTPUT) {
        out.cloudBuild = {
            buildId: env.BUILD_ID ?? null,
            projectId: env.PROJECT_ID ?? null,
            buildTimeout: env.BUILD_TIMEOUT ?? null
        };
    }

    /* ------------------------------------------------------------
       6. GOOGLE CLOUD SHELL DETECTION
       ------------------------------------------------------------ */
    if (env.CLOUD_SHELL) out.cloudShell = true;
    if (env.DEVSHELL_CLIENT_PORT) out.devShell = true;

    /* ------------------------------------------------------------
       7. LOCAL EMULATOR SIGNALS
       ------------------------------------------------------------ */
    if (env.FUNCTIONS_EMULATOR === "true") out.functionsEmulator = true;
    if (env.FUNCTIONS_FRAMEWORK === "1") out.functionsFramework = true;
    if (env.RUN_DEV) out.cloudRunLocal = true; // Cloud Run local dev

    /* ------------------------------------------------------------
       8. CLOUD RUNTIME LIMITS / CONFIG
       ------------------------------------------------------------ */
    if (env.PORT) out.port = env.PORT;                         // Cloud Run container port
    if (env.CONTAINER_NAME) out.containerName = env.CONTAINER_NAME;
    if (env.SHORT_SHA) out.commitSha = env.SHORT_SHA;          // Cloud Build or Cloud Run deploy metadata
    if (env.REVISION_ID) out.revisionId = env.REVISION_ID;

    /* ------------------------------------------------------------
       9. GOOGLE ADC / SERVICE ACCOUNT / CREDENTIALS ENV
       ------------------------------------------------------------ */
    out.credentials = {};

    if (env.GOOGLE_APPLICATION_CREDENTIALS)
        out.credentials.path = env.GOOGLE_APPLICATION_CREDENTIALS;

    if (env.GOOGLE_GHA_CREDS_PATH)
        out.credentials.ghaCredentials = true;

    if (env.GOOGLE_API_KEY) out.credentials.apiKey = true;

    if (Object.keys(out.credentials).length === 0)
        delete out.credentials;

    /* ------------------------------------------------------------
       10. RAW GCP_* AND GOOGLE_* SIGNALS
       ------------------------------------------------------------ */
    const gcpVars = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) =>
                k.startsWith("GCP_") ||
                k.startsWith("GOOGLE_") ||
                k.startsWith("X_GOOGLE_") ||
                k.startsWith("CLOUD_") ||
                k.startsWith("GCLOUD_")
            )
            .sort()
    );

    if (Object.keys(gcpVars).length) out.raw = gcpVars;

    /* ------------------------------------------------------------
       If NOTHING matched, return null
       ------------------------------------------------------------ */
    if (Object.keys(out).length === 0) return null;

    return out;
}

/* ============================================================
   VERCEL — FULL EXHAUSTIVE RUNTIME + BUILD + EDGE EXTRACTION
============================================================ */
function extractVercelInfo(env: Record<string, string>) {
    // If nothing suggests Vercel, return null early
    const hasVercel =
        env.VERCEL ||
        env.VERCEL_ENV ||
        env.NEXT_RUNTIME ||
        env.VERCEL_URL ||
        env.VERCEL_REGION ||
        env.VC_BUILD_ID;

    if (!hasVercel) return null;

    const out: any = {};

    /* ------------------------------------------------------------
       1. Basic Vercel environment
       ------------------------------------------------------------ */
    out.isVercel = !!env.VERCEL;
    out.env =
        env.VERCEL_ENV || // "production" | "preview" | "development"
        null;

    out.url = env.VERCEL_URL ?? null;

    /* ------------------------------------------------------------
       2. Region / Execution location
       ------------------------------------------------------------ */
    out.region =
        env.VERCEL_REGION ||       // edge/serverless region
        env.NEXT_PRIVATE_TARGET ||
        null;

    /* ------------------------------------------------------------
       3. Deployment & Build Metadata
       ------------------------------------------------------------ */
    out.build = {
        buildId: env.VERCEL_BUILD_ID ?? env.VC_BUILD_ID ?? null,
        gitCommitSha: env.VERCEL_GIT_COMMIT_SHA ?? null,
        gitCommitAuthorName: env.VERCEL_GIT_COMMIT_AUTHOR_NAME ?? null,
        gitCommitAuthorLogin: env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN ?? null,
        gitCommitMessage: env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
        gitProvider: env.VERCEL_GIT_PROVIDER ?? null,
        gitRepoSlug: env.VERCEL_GIT_REPO_SLUG ?? null,
        gitRepoOwner: env.VERCEL_GIT_REPO_OWNER ?? null,
        gitRepoId: env.VERCEL_GIT_REPO_ID ?? null,
        gitCommitRef: env.VERCEL_GIT_COMMIT_REF ?? null,
        gitPullRequestId: env.VERCEL_GIT_PULL_REQUEST_ID ?? null,
        gitRepoUrl: env.VERCEL_GIT_REPO_URL ?? null,
    };

    /* ------------------------------------------------------------
       4. Git Metadata (additional signals)
       ------------------------------------------------------------ */
    out.git = {
        branch: env.VERCEL_GIT_COMMIT_REF ?? null,
        sha: env.VERCEL_GIT_COMMIT_SHA ?? null,
        repoUrl: env.VERCEL_GIT_REPO_URL ?? null,
        provider: env.VERCEL_GIT_PROVIDER ?? null,
        author: env.VERCEL_GIT_COMMIT_AUTHOR_NAME ?? null,
    };

    /* ------------------------------------------------------------
       5. Vercel Function Runtime (Node.js or Edge)
       ------------------------------------------------------------ */
    out.runtime = {};

    // Edge runtime signal
    if (env.NEXT_RUNTIME === "edge" || env.VERCEL_EDGE === "1")
        out.runtime.type = "edge";
    else if (env.NEXT_RUNTIME === "nodejs")
        out.runtime.type = "node";
    else if (env.VERCEL)
        out.runtime.type = "unknown"; // still Vercel, but unknown runtime

    out.runtime.nextRuntime = env.NEXT_RUNTIME ?? null;

    /* Node version inside Vercel */
    if (env.NEXT_RUNTIME === "nodejs" && env.NODE_VERSION)
        out.runtime.nodeVersion = env.NODE_VERSION;

    /* ------------------------------------------------------------
       6. Edge Function metadata
       ------------------------------------------------------------ */
    out.edge = {
        isEdge: env.NEXT_RUNTIME === "edge" || env.VERCEL_EDGE === "1",
        entrypoint: env.VERCEL_EDGE_FUNCTION_ENTRYPOINT ?? null,
        functionName: env.VERCEL_EDGE_FUNCTION_NAME ?? null,
        functionRegion: env.VERCEL_EDGE_FUNCTION_REGION ?? null,
    };

    /* ------------------------------------------------------------
       7. Serverless Function metadata
       ------------------------------------------------------------ */
    out.serverless = {
        entrypoint: env.VERCEL_FUNCTION_NAME ?? null,
        memory: env.VERCEL_FUNCTION_MEMORY_MB ?? null,
        timeout: env.VERCEL_FUNCTION_TIMEOUT_SEC ?? null,
        region: env.VERCEL_REGION ?? null,
    };

    /* ------------------------------------------------------------
       8. Deployment Environment Type
       ------------------------------------------------------------ */
    out.environment = env.VERCEL_ENV ?? null; // "production" | "preview" | "development"

    /* ------------------------------------------------------------
       9. Project metadata
       ------------------------------------------------------------ */
    out.project = {
        id: env.VERCEL_PROJECT_ID ?? null,
        name: env.VERCEL_PROJECT_NAME ?? null,
        orgId: env.VERCEL_ORG_ID ?? null,
    };

    /* ------------------------------------------------------------
       10. Framework metadata (Next.js)
       ------------------------------------------------------------ */
    out.next = {
        runtime: env.NEXT_RUNTIME ?? null,
        phase: env.NEXT_PHASE ?? null,
        deploymentId: env.NEXT_DEPLOYMENT_ID ?? null,
        isTurbopack: !!env.__TURBOPACK__,
    };

    /* ------------------------------------------------------------
       11. Vercel Public Environment Variables
       ------------------------------------------------------------ */
    const publicVars = Object.fromEntries(
        Object.entries(env)
            .filter(([key]) => key.startsWith("PUBLIC_"))
    );

    if (Object.keys(publicVars).length > 0)
        out.public = publicVars;

    /* ------------------------------------------------------------
       12. Raw VC_* environment variables
       ------------------------------------------------------------ */
    const vcVars = Object.fromEntries(
        Object.entries(env)
            .filter(([key]) => key.startsWith("VC_"))
    );

    if (Object.keys(vcVars).length > 0)
        out.internal = vcVars;

    /* ------------------------------------------------------------
       13. Raw VERCEL_* environment variables (sorted)
       ------------------------------------------------------------ */
    const raw = Object.fromEntries(
        Object.entries(env)
            .filter(([key]) => key.startsWith("VERCEL_"))
            .sort()
    );

    if (Object.keys(raw).length) out.raw = raw;

    return out;
}

/* ============================================================
   NETLIFY — FULL RUNTIME + BUILD + FUNCTIONS + EDGE EXTRACTION
============================================================ */
function extractNetlifyInfo(env: Record<string, string>) {
    const isNetlify =
        env.NETLIFY ||
        env.NETLIFY_DEV ||
        env.DEPLOY_ID ||
        env.SITE_ID ||
        env.NETLIFY_IMAGES_CDN_DOMAIN ||
        env.NETLIFY_LOCAL === "true";

    if (!isNetlify) return null;

    const out: any = {};
    out.isNetlify = true;

    /* ------------------------------------------------------------
       1. Netlify Build / General Metadata
       ------------------------------------------------------------ */
    out.build = {
        isBuild: !!env.NETLIFY,
        deployId: env.DEPLOY_ID ?? null,
        buildId: env.BUILD_ID ?? null,
        siteId: env.SITE_ID ?? null,
        url: env.URL ?? null,
        deployUrl: env.DEPLOY_URL ?? null,
        deployPrimeUrl: env.DEPLOY_PRIME_URL ?? null,
        imagesCdnDomain: env.NETLIFY_IMAGES_CDN_DOMAIN ?? null,
        edgeFunctionsManifest: env.NETLIFY_EDGE_FUNCTIONS_MANIFEST ?? null,
    };

    /* ------------------------------------------------------------
       2. Context Info (Production / Preview / Dev)
       ------------------------------------------------------------ */
    out.context = {
        context: env.CONTEXT ?? null, // "production", "deploy-preview", "branch-deploy"
        branch: env.BRANCH ?? null,
        commitRef: env.COMMIT_REF ?? null,
        reviewId: env.REVIEW_ID ?? null, // PR review ID
        repoUrl: env.REPOSITORY_URL ?? null,
    };

    /* ------------------------------------------------------------
       3. Git Metadata
       ------------------------------------------------------------ */
    out.git = {
        commitRef: env.COMMIT_REF ?? null,
        commitSha: env.GIT_COMMIT ?? null, // older Netlify var
        commitMessage: env.GIT_COMMIT_MESSAGE ?? null,
        commitAuthor: env.GIT_COMMIT_AUTHOR ?? null,
        repoUrl: env.REPOSITORY_URL ?? null,
        branch: env.BRANCH ?? null,
    };

    /* ------------------------------------------------------------
       4. Serverless Functions Runtime
       ------------------------------------------------------------ */
    out.functions = {
        isFunctionRuntime:
            !env.NETLIFY && !!env.DEPLOY_ID && !!env.SITE_ID, // inside a function
        siteId: env.SITE_ID ?? null,
        deployId: env.DEPLOY_ID ?? null,
        region: env.AWS_REGION ?? null, // Netlify functions run in AWS behind the scenes
        timeout: env.NETLIFY_FUNCTION_TIMEOUT ?? null,
        memory: env.NETLIFY_FUNCTION_MEMORY_SIZE ?? null,
    };

    /* ------------------------------------------------------------
       5. Edge Functions Runtime (Deno)
       ------------------------------------------------------------ */
    out.edge = {
        isEdge:
            env.NETLIFY_EDGE_HANDLER === "true" ||
            typeof (globalThis as any).Deno !== "undefined",
        entrypoint: env.NETLIFY_EDGE_HANDLER ?? null,
        region: env.AWS_REGION ?? null, // Netlify Edge uses AWS Lambda@Edge regions
    };

    /* ------------------------------------------------------------
       6. Local Dev Mode (Netlify CLI)
       ------------------------------------------------------------ */
    out.localDev = {
        isLocal: env.NETLIFY_LOCAL === "true",
        cliPath: env.NETLIFY_CLI_PATH ?? null,
        devPort: env.NETLIFY_DEV_SERVER_PORT ?? null,
        functionsServerPort: env.NETLIFY_DEV_FUNCTIONS_SERVER_PORT ?? null,
    };

    /* ------------------------------------------------------------
       7. Internal Netlify Vars (NETLIFY_*, BUILD_*, etc.)
       ------------------------------------------------------------ */
    out.internal = Object.fromEntries(
        Object.entries(env).filter(([key]) =>
            key.startsWith("NETLIFY_") || key.startsWith("BUILD_")
        )
    );

    /* ------------------------------------------------------------
       8. Raw Vars (Full Dump of All Netlify-Specific)
       ------------------------------------------------------------ */
    const raw = Object.fromEntries(
        Object.entries(env)
            .filter(([key]) =>
                key.startsWith("NETLIFY") ||
                key.startsWith("BUILD_") ||
                key.startsWith("DEPLOY_") ||
                key === "SITE_ID" ||
                key === "CONTEXT" ||
                key === "BRANCH"
            )
            .sort(([a], [b]) => a.localeCompare(b))
    );

    if (Object.keys(raw).length) out.raw = raw;

    return out;
}

/* ============================================================
   DOCKER / CONTAINER DETECTION
============================================================ */
import fs from "fs";

/* ============================================================
   DOCKER / OCI / PODMAN / K8S / CONTAINER DETECTION (FULL)
============================================================ */
import fs from "fs";
import os from "os";

export function extractDockerInfo() {
    const info: any = {
        inContainer: false,
        docker: false,
        podman: false,
        kubernetes: false,
        lxc: false,
        containerd: false,
        runc: false,
        userNamespace: false,
        rootless: false,
        dockerCompose: false,
        virtualizationHints: [],
        mountHints: [],
        cgroupDriver: null,
        hostname: os.hostname(),
        cgroup: null,
        mounts: null,
        ociRuntime: null,
    };

    /* ------------------------------------------------------------
       1. /.dockerenv — Best Docker indicator
    ------------------------------------------------------------ */
    if (fs.existsSync("/.dockerenv")) {
        info.inContainer = true;
        info.docker = true;
    }

    /* ------------------------------------------------------------
       2. /run/.containerenv — Podman indicator
    ------------------------------------------------------------ */
    if (fs.existsSync("/run/.containerenv")) {
        info.inContainer = true;
        info.podman = true;
    }

    /* ------------------------------------------------------------
       3. Cgroup inspection (cgroup v1/v2)
    ------------------------------------------------------------ */
    if (fs.existsSync("/proc/1/cgroup")) {
        const cg = fs.readFileSync("/proc/1/cgroup", "utf8");
        info.cgroup = cg;

        if (/docker/i.test(cg)) {
            info.inContainer = true;
            info.docker = true;
        }
        if (/podman/i.test(cg)) {
            info.inContainer = true;
            info.podman = true;
        }
        if (/kubepods|kube/i.test(cg)) {
            info.inContainer = true;
            info.kubernetes = true;
        }
        if (/lxc/i.test(cg)) {
            info.inContainer = true;
            info.lxc = true;
        }
        if (/containerd/i.test(cg)) {
            info.inContainer = true;
            info.containerd = true;
        }
        if (/runc/i.test(cg)) {
            info.inContainer = true;
            info.runc = true;
        }

        // Detect cgroup driver
        if (cg.includes("kubepods.slice")) info.cgroupDriver = "systemd";
        else if (cg.includes("kubepods")) info.cgroupDriver = "cgroupfs";
    }

    /* ------------------------------------------------------------
       4. OCI runtime detection from /proc/self/status
    ------------------------------------------------------------ */
    try {
        const status = fs.readFileSync("/proc/self/status", "utf8");
        if (/^NSpid:/m.test(status)) {
            const line = status.split("\n").find(l => l.startsWith("NSpid:"));
            if (line) {
                const ids = line
                    .replace("NSpid:\t", "")
                    .trim()
                    .split(/\s+/)
                    .map(Number);

                if (ids.length > 1) {
                    info.inContainer = true;
                    info.virtualizationHints.push("PID namespace virtualization");
                }
            }
        }
    } catch { }

    /* ------------------------------------------------------------
       5. /proc/self/mountinfo — detect overlayfs, container roots
    ------------------------------------------------------------ */
    if (fs.existsSync("/proc/self/mountinfo")) {
        const mountinfo = fs.readFileSync("/proc/self/mountinfo", "utf8");
        info.mounts = mountinfo;

        if (/overlay/i.test(mountinfo)) {
            info.inContainer = true;
            info.mountHints.push("overlayfs");
        }

        if (/\/containers\//i.test(mountinfo))
            info.mountHints.push("container-rootfs");

        if (/\/kubepods\//i.test(mountinfo))
            info.kubernetes = true;
    }

    /* ------------------------------------------------------------
       6. Docker Compose detection
    ------------------------------------------------------------ */
    if (process.env.COMPOSE_PROJECT_NAME) {
        info.dockerCompose = true;
        info.inContainer = true;
    }

    /* ------------------------------------------------------------
       7. Kubernetes env vars
    ------------------------------------------------------------ */
    if (process.env.KUBERNETES_SERVICE_HOST) {
        info.inContainer = true;
        info.kubernetes = true;
    }
    if (process.env.KUBERNETES_PORT) info.kubernetes = true;

    /* ------------------------------------------------------------
       8. User namespace / rootless Docker
    ------------------------------------------------------------ */
    try {
        const uidMap = fs.readFileSync("/proc/self/uid_map", "utf8");
        if (!uidMap.includes("0 0 4294967295")) {
            info.userNamespace = true;
            info.rootless = true;
        }
    } catch { }

    /* ------------------------------------------------------------
       9. Detect container runtime from /proc/self/environ
    ------------------------------------------------------------ */
    try {
        const environ = fs.readFileSync("/proc/self/environ", "utf8");
        if (/container=podman/i.test(environ)) info.podman = true;
        if (/container=docker/i.test(environ)) info.docker = true;
        if (/container=/i.test(environ)) info.inContainer = true;
    } catch { }

    /* ------------------------------------------------------------
       10. Detect virtualization layers (microVM / Firecracker)
    ------------------------------------------------------------ */
    try {
        const cpuinfo = fs.readFileSync("/proc/cpuinfo", "utf8");
        if (/firecracker/i.test(cpuinfo)) info.virtualizationHints.push("Firecracker microVM");
        if (/kvm/i.test(cpuinfo)) info.virtualizationHints.push("KVM virtualized CPU");
    } catch { }

    /* ------------------------------------------------------------
       11. Generic container environment signals
    ------------------------------------------------------------ */
    const envSignals = [
        "container",
        "CONTAINER",
        "containerized",
        "RUNNING_IN_CONTAINER",
    ];

    for (const key of Object.keys(process.env)) {
        if (envSignals.includes(key)) {
            info.inContainer = true;
            info.virtualizationHints.push(`env:${key}`);
        }
    }

    /* ------------------------------------------------------------
       12. Final boolean normalization
    ------------------------------------------------------------ */
    info.inContainer =
        info.inContainer ||
        info.docker ||
        info.podman ||
        info.kubernetes ||
        info.containerd ||
        info.runc ||
        info.lxc;

    return info;
}

/* ============================================================
   KUBERNETES — FULL DETECTION (POD, NODE, CLUSTER, CLOUD, SA)
============================================================ */
import fs from "fs";
import os from "os";

export function extractKubernetesInfo(env: Record<string, string>) {
    const inK8s =
        !!env.KUBERNETES_SERVICE_HOST ||
        fs.existsSync("/var/run/secrets/kubernetes.io/serviceaccount");

    if (!inK8s) return null;

    const info: any = {
        inKubernetes: true,
        pod: {},
        node: {},
        namespace: null,
        cluster: {},
        serviceAccount: {},
        runtime: {},
        cloudProvider: {},
        volumes: [],
        k8sEnvVars: {},
    };

    /* ------------------------------------------------------------
       1. Namespace
    ------------------------------------------------------------ */
    // 1. Downward API env var (if set)
    info.namespace =
        env.KUBERNETES_NAMESPACE ||
        env.POD_NAMESPACE ||
        null;

    // 2. Service account namespace file (most reliable)
    const nsFile = "/var/run/secrets/kubernetes.io/serviceaccount/namespace";
    if (fs.existsSync(nsFile)) {
        try {
            info.namespace = fs.readFileSync(nsFile, "utf8").trim();
        } catch { }
    }

    /* ------------------------------------------------------------
       2. Pod Info
    ------------------------------------------------------------ */
    info.pod = {
        name: env.HOSTNAME ?? env.POD_NAME ?? null,
        uid: env.POD_UID ?? null,
        ip: env.POD_IP ?? null, // injected by Downward API
        serviceAccount: null,
    };

    // Service Account token name
    const saDir = "/var/run/secrets/kubernetes.io/serviceaccount";
    if (fs.existsSync(saDir)) {
        // serviceaccount/name file sometimes exists
        const saNameFile = `${saDir}/name`;
        if (fs.existsSync(saNameFile)) {
            try {
                info.pod.serviceAccount = fs.readFileSync(saNameFile, "utf8").trim();
            } catch { }
        } else {
            // Fallback if not provided
            info.pod.serviceAccount = "default";
        }

        // Also expose token + CA hints
        info.serviceAccount = {
            exists: true,
            tokenFile: fs.existsSync(`${saDir}/token`),
            caCertFile: fs.existsSync(`${saDir}/ca.crt`),
        };
    }

    /* ------------------------------------------------------------
       3. Node Info (limited inside pod)
    ------------------------------------------------------------ */
    info.node = {
        name: env.KUBE_NODE_NAME ?? null,
        ip: env.KUBE_NODE_IP ?? null,
        zone: env.KUBE_NODE_ZONE ?? null,
    };

    /* ------------------------------------------------------------
       4. Cluster Info (cloud + cluster metadata)
    ------------------------------------------------------------ */
    info.cluster = {
        name: env.KUBE_CLUSTER_NAME ?? null,
        region: env.KUBE_REGION ?? env.KUBERNETES_REGION ?? null,
        zone: env.KUBE_ZONE ?? env.KUBERNETES_ZONE ?? null,
    };

    /* ------------------------------------------------------------
       5. Cloud Provider Guessing (EKS / GKE / AKS)
    ------------------------------------------------------------ */
    if (env.EKS_CLUSTER_NAME || fs.existsSync("/var/run/secrets/eks.amazonaws.com")) {
        info.cloudProvider = { provider: "AWS EKS" };
    } else if (env.GCE_METADATA_HOST || env.CLOUDSDK_CONFIG) {
        info.cloudProvider = { provider: "Google GKE" };
    } else if (env.AZURE_HTTP_USER_AGENT || env.AKS_RESOURCE_ID) {
        info.cloudProvider = { provider: "Azure AKS" };
    }

    /* ------------------------------------------------------------
       6. Container Runtime (Docker / containerd / CRI-O)
    ------------------------------------------------------------ */
    try {
        const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");

        if (/docker/i.test(cgroup)) info.runtime.containerRuntime = "docker";
        else if (/containerd/i.test(cgroup)) info.runtime.containerRuntime = "containerd";
        else if (/cri-o/i.test(cgroup)) info.runtime.containerRuntime = "cri-o";
        else info.runtime.containerRuntime = "unknown";
    } catch {
        info.runtime.containerRuntime = null;
    }

    /* ------------------------------------------------------------
       7. Volume detection (/proc/mounts)
    ------------------------------------------------------------ */
    try {
        const mounts = fs.readFileSync("/proc/mounts", "utf8")
            .split("\n")
            .filter(Boolean);

        info.volumes = mounts
            .map((line) => {
                const parts = line.split(" ");
                return {
                    source: parts[0],
                    mountPoint: parts[1],
                    type: parts[2],
                };
            })
            .filter(v =>
                v.mountPoint.includes("/var/run/secrets") ||
                v.mountPoint.includes("/mnt") ||
                v.mountPoint.includes("kubernetes.io")
            );
    } catch { }

    /* ------------------------------------------------------------
       8. Kubernetes environment variables (full dump)
    ------------------------------------------------------------ */
    info.k8sEnvVars = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("KUBERNETES_") ||
            k.startsWith("KUBE_") ||
            k.startsWith("POD_")
        )
    );

    return info;
}

/* ============================================================
   AZURE — FULL DETECTION (Functions, App Service, Container Apps)
============================================================ */
import os from "os";
import fs from "fs";

export function extractAzureInfo(env: Record<string, string>) {
    const azureSignals =
        env.WEBSITE_SITE_NAME ||
        env.WEBSITE_INSTANCE_ID ||
        env.WEBSITE_HOSTNAME ||
        env.FUNCTIONS_WORKER_RUNTIME ||
        env.AZURE_FUNCTIONS_ENVIRONMENT ||
        env.AZURE_HTTP_USER_AGENT ||
        env.APPSETTING_WEBSITE_SITE_NAME ||
        env.CONTAINER_APP_NAME ||
        env.AZURE_CONTAINER_APP_NAME ||
        env.FUNCTIONS_EXTENSION_VERSION ||
        env.AZURE_TENANT_ID ||
        env.AZURE_SUBSCRIPTION_ID;

    if (!azureSignals) return null;

    const out: any = {
        isAzure: true,
        azureFunctions: {},
        containerApps: {},
        appService: {},
        cloudShell: {},
        staticWebApps: {},
        devOps: {},
        vmHints: {},
        raw: {},
    };

    /* ------------------------------------------------------------
       1. Azure Functions (MOST IMPORTANT)
       ------------------------------------------------------------ */
    if (env.FUNCTIONS_WORKER_RUNTIME) {
        out.azureFunctions = {
            isFunction: true,
            runtime: env.FUNCTIONS_WORKER_RUNTIME,
            extensionVersion: env.FUNCTIONS_EXTENSION_VERSION ?? null,
            environment: env.AZURE_FUNCTIONS_ENVIRONMENT ?? null, // "Production" | "Development"
            functionName: env.FUNCTION_NAME ?? null,
            functionDirectory: env.FUNCTIONS_directory ?? null,
            region: env.REGION_NAME ?? null,
            instanceId: env.WEBSITE_INSTANCE_ID ?? null,
            siteName: env.WEBSITE_SITE_NAME ?? null,
            hostname: env.WEBSITE_HOSTNAME ?? null,
            workerProcessCount: env.FUNCTIONS_WORKER_PROCESS_COUNT ?? null,

            // Plan type (Consumption / Premium / Dedicated)
            sku: env.WEBSITE_SKU ?? null,

            // Durable Functions support
            durable: {
                hubName: env.DurableTaskHubName ?? null,
                storage: env.AzureWebJobsStorage ? true : false,
            },
        };
    }

    /* ------------------------------------------------------------
       2. Azure Container Apps
       ------------------------------------------------------------ */
    if (env.CONTAINER_APP_NAME || env.AZURE_CONTAINER_APP_NAME) {
        out.containerApps = {
            isContainerApp: true,
            appName: env.CONTAINER_APP_NAME ?? env.AZURE_CONTAINER_APP_NAME ?? null,
            instanceId: env.CONTAINER_APP_INSTANCE_NAME ?? null,
            revision: env.CONTAINER_APP_REVISION ?? null,
            environmentName: env.CONTAINER_APP_ENV_DNS_SUFFIX ?? null,
            cpuLimit: env.CONTAINER_APP_CPU_LIMIT ?? null,
            memoryLimit: env.CONTAINER_APP_MEMORY_LIMIT_IN_GIB ?? null,
        };
    }

    /* ------------------------------------------------------------
       3. Azure App Service (Web Apps / API Apps / WebJobs)
       ------------------------------------------------------------ */
    if (env.WEBSITE_SITE_NAME || env.WEBSITE_INSTANCE_ID) {
        out.appService = {
            isAppService: true,
            siteName: env.WEBSITE_SITE_NAME ?? null,
            hostname: env.WEBSITE_HOSTNAME ?? null,
            instanceId: env.WEBSITE_INSTANCE_ID ?? null,
            home: env.HOME ?? null,
            dockerContainer: env.WEBSITE_IS_DETACHED ?? null,
            stack: env.WEBSITE_STACK ?? null,
            resourceGroup: env.WEBSITE_RESOURCE_GROUP ?? null,
            ownerName: env.WEBSITE_OWNER_NAME ?? null,
        };
    }

    /* ------------------------------------------------------------
       4. Azure Static Web Apps (SWA)
       ------------------------------------------------------------ */
    if (env.SWA_CLI_VERSION || env.FUNCTIONS_WORKER_RUNTIME === "node" && env.WEBSITE_HOSTNAME?.includes(".azurewebsites.net")) {
        out.staticWebApps = {
            isStaticWebApp: true,
            cliVersion: env.SWA_CLI_VERSION ?? null,
            functionsPort: env.SWA_FUNC_PORT ?? null,
        };
    }

    /* ------------------------------------------------------------
       5. Azure Cloud Shell
       ------------------------------------------------------------ */
    if (env.CLOUD_SHELL) {
        out.cloudShell = {
            isCloudShell: true,
            containerName: env.CLOUD_SHELL_CONTAINER_NAME ?? null,
            machineId: env.CLOUD_SHELL_MACHINE_ID ?? null,
        };
    }

    /* ------------------------------------------------------------
       6. Azure DevOps Hosted Agents
       ------------------------------------------------------------ */
    if (env.AGENT_NAME || env.AGENT_ID || env.BUILD_BUILDID) {
        out.devOps = {
            isDevOpsAgent: true,
            agentName: env.AGENT_NAME ?? null,
            agentId: env.AGENT_ID ?? null,
            pool: env.AGENT_POOL ?? null,
            buildId: env.BUILD_BUILDID ?? null,
            buildNumber: env.BUILD_BUILDNUMBER ?? null,
            repo: env.BUILD_REPOSITORY_NAME ?? null,
            branch: env.BUILD_SOURCEBRANCH ?? null,
        };
    }

    /* ------------------------------------------------------------
       7. Azure VM / Compute Hints (NOT full metadata — blocked)
       ------------------------------------------------------------ */
    if (env.AZURE_HTTP_USER_AGENT || env.AZURE_REGION || fs.existsSync("/var/lib/waagent")) {
        out.vmHints = {
            isAzureVM: true,
            region: env.AZURE_REGION ?? null,
            waagent: fs.existsSync("/var/lib/waagent"),
        };
    }

    /* ------------------------------------------------------------
       8. Internal Azure Environment Variables (/raw)
       ------------------------------------------------------------ */
    const raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) =>
                k.startsWith("AZURE_") ||
                k.startsWith("WEBSITE_") ||
                k.startsWith("FUNCTIONS_") ||
                k.startsWith("APPSETTING_") ||
                k.startsWith("CONTAINER_APP") ||
                k.startsWith("SWA_") ||
                k.startsWith("AGENT_") ||
                k.startsWith("BUILD_")
            )
            .sort(([a], [b]) => a.localeCompare(b))
    );

    if (Object.keys(raw).length) out.raw = raw;

    return out;
}

/* ============================================================
   GENERIC CONTAINER RUNTIME INFO (works in all containers)
============================================================ */
function extractGenericContainerInfo() {
    const info: any = {};

    // Cgroup identity (unique per container)
    try {
        if (fs.existsSync("/proc/self/cgroup")) {
            info.cgroupHash = hash(fs.readFileSync("/proc/self/cgroup", "utf8"));
        }
    } catch { }

    // Mount namespace fingerprint (uniquely identifies container clone)
    try {
        if (fs.existsSync("/proc/self/mountinfo")) {
            info.mountHash = hash(fs.readFileSync("/proc/self/mountinfo", "utf8"));
        }
    } catch { }

    // Root filesystem identity (stable per container image)
    try {
        info.rootHash = hash(JSON.stringify(fs.readdirSync("/")));
    } catch { }

    return info;
}

/* ============================================================
   RUNTIME INFO (Bun, Node, Workers)
============================================================ */
function extractRuntimeInfo(env: Record<string, string>) {
    return {
        runtime: detectRuntime(),
        version: detectRuntimeVersion(),
        arch: process.arch,
        platform: process.platform,
    };
}

function detectRuntime() {
    if (typeof Bun !== "undefined") return "bun";
    if (typeof WebSocketPair !== "undefined" && !process?.versions?.node) return "cloudflare-worker";
    return "node";
}

function detectRuntimeVersion() {
    if (typeof Bun !== "undefined") return Bun.version;
    if (process?.versions?.node) return process.versions.node;
    return "unknown";
}

/* ============================================================
   HASH HELPER
============================================================ */
function hash(str: string) {
    return crypto.createHash("sha256").update(str).digest("hex");
}

/* ============================================================
   DENO DEPLOY (Edge Compute)
   Covers: Deno Deploy, Fresh, Hono on Deploy
============================================================ */
export function extractDenoDeployInfo(env: Record<string, string>) {
    const isDeno =
        typeof (globalThis as any).Deno !== "undefined" &&
        typeof (globalThis as any).Deno.version !== "undefined";

    const denoDeploySignals =
        env.DENO_REGION ||
        env.DENO_DEPLOYMENT_ID ||
        env.DENO_UNSTABLE ||
        (isDeno && (globalThis as any).EdgeRuntime === "deno") ||
        (isDeno && (globalThis as any).navigator?.userAgent?.includes?.("Deno"));

    if (!isDeno && !denoDeploySignals) return null;

    const DenoObj = (globalThis as any).Deno ?? {};

    const out: any = {
        isDeno: true,
        isDenoDeploy: false,
        runtime: {},
        deploy: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Base Deno Runtime
    ------------------------------------------------------------ */
    out.runtime = {
        version: DenoObj.version ?? null,
        typescript: DenoObj.version?.typescript ?? null,
        v8: DenoObj.version?.v8 ?? null,
        deno: DenoObj.version?.deno ?? null,
        args: Array.isArray(DenoObj.args) ? [...DenoObj.args] : null,
        noColor: !!DenoObj.noColor,
        pid: DenoObj.pid ?? null,
        execPath: DenoObj.execPath ?? null,
    };

    /* ------------------------------------------------------------
       2. Deno Deploy specific signals
    ------------------------------------------------------------ */
    out.isDenoDeploy =
        !!env.DENO_REGION ||
        !!env.DENO_DEPLOYMENT_ID ||
        // Fresh/Hono runtime indicator:
        ((globalThis as any).__STATIC_CONTENT !== undefined);

    out.deploy = {
        region: env.DENO_REGION ?? null,
        deploymentId: env.DENO_DEPLOYMENT_ID ?? null,

        // Internal: "edge" (actual deploy)
        edgeRuntime: (globalThis as any).EdgeRuntime ?? null,

        // Deploy function regions default to global but often return:
        // "iad1" / "fra1" / "hnd1"
        hints: env.DENO_REGION
            ? ["Edge Region", env.DENO_REGION]
            : null,
    };

    /* ------------------------------------------------------------
       3. Raw DENO_* dump
    ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("DENO_"))
            .sort(([a], [b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   FASTLY COMPUTE@EDGE (WASM EDGE RUNTIME)
============================================================ */
export function extractFastlyInfo(env: Record<string, string>) {
    // Core Fastly runtime signal:
    const isFastlyRuntime =
        typeof (globalThis as any).fastly !== "undefined" &&
        typeof (globalThis as any).fastly.getGeolocationForIp === "function";

    // Fastly environment variables (only on local/dev or CLI contexts)
    const fastlyEnv =
        env.FASTLY_SERVICE_ID ||
        env.FASTLY_API_TOKEN ||
        env.FASTLY_BUILDKIT_SANDBOX ||
        env.FASTLY_REGION;

    if (!isFastlyRuntime && !fastlyEnv) return null;

    const out: any = {
        isFastly: true,
        runtime: {},
        edge: {},
        service: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Runtime Information
       ------------------------------------------------------------ */
    out.runtime = {
        // Fastly compute@edge has no process, no fs, no Node:
        wasmSandbox: true,
        globalObject: Object.keys(globalThis),

        // Edge runtime flags:
        hasFastlyBinding: !!(globalThis as any).fastly,

        // Fastly API functions available:
        availableAPIs: (globalThis as any).fastly
            ? Object.keys((globalThis as any).fastly)
            : [],
    };

    /* ------------------------------------------------------------
       2. Edge Runtime Metadata
       ------------------------------------------------------------ */
    if (isFastlyRuntime) {
        const f = (globalThis as any).fastly;

        let pop = null;
        try {
            // Pop location for dummy IP, triggers the correct region:
            const geo = f.getGeolocationForIp("1.1.1.1");
            if (geo) pop = geo.asn || geo.region || geo.country || JSON.stringify(geo);
        } catch { }

        out.edge = {
            isWasmEdge: true,
            pop: pop,
            requestRestriction: true, // no TCP sockets, only HTTP
            filesystem: false, // fs is not available
        };
    }

    /* ------------------------------------------------------------
       3. Service Metadata
       ------------------------------------------------------------ */
    out.service = {
        serviceId: env.FASTLY_SERVICE_ID ?? null,
        apiTokenPresent: !!env.FASTLY_API_TOKEN,
        region: env.FASTLY_REGION ?? null,
        cliBuilder: env.FASTLY_BUILDKIT_SANDBOX ? true : false,
    };

    /* ------------------------------------------------------------
       4. Raw FASTLY_* dump
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("FASTLY"))
            .sort(([a], [b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   FLY.IO MACHINES + FLY APPS PLATFORM (Firecracker microVM)
============================================================ */
import fs from "fs";
import os from "os";

export function extractFlyMachinesInfo(env: Record<string, string>) {
    // Core Fly signals
    const flySignals =
        env.FLY_APP_NAME ||
        env.FLY_PRIVATE_IP ||
        env.FLY_REGION ||
        env.FLY_MACHINE_ID ||
        env.FLY_ALLOC_ID;

    // Firecracker microVM hints (used by Fly and AWS Lambda)
    let firecracker = false;
    try {
        const cpu = fs.readFileSync("/proc/cpuinfo", "utf8");
        if (/firecracker/i.test(cpu)) firecracker = true;
    } catch { }

    // If neither Fly nor microVM hints: no detection
    if (!flySignals && !firecracker) return null;

    const out: any = {
        isFly: !!flySignals,
        isFirecrackerMicroVM: firecracker,
        machines: {},
        app: {},
        network: {},
        volumes: [],
        raw: {},
    };

    /* ------------------------------------------------------------
       1. Fly Machines Metadata
       ------------------------------------------------------------ */
    out.machines = {
        machineId: env.FLY_MACHINE_ID ?? env.FLY_ALLOC_ID ?? null,
        appName: env.FLY_APP_NAME ?? null,
        processGroup: env.FLY_PROCESS_GROUP ?? null,
        instanceId: env.FLY_ALLOC_ID ?? null,
        region: env.FLY_REGION ?? null,
        imageRef: env.FLY_IMAGE_REF ?? null,
    };

    /* ------------------------------------------------------------
       2. App Metadata (Fly.io Apps Platform)
       ------------------------------------------------------------ */
    out.app = {
        appName: env.FLY_APP_NAME ?? null,
        configChecksum: env.FLY_CONFIG_VERSION ?? null,
        releaseId: env.FLY_RELEASE_ID ?? null,
        platformVersion: env.FLY_PLATFORM_VERSION ?? null,
    };

    /* ------------------------------------------------------------
       3. Private Networking
       ------------------------------------------------------------ */
    out.network = {
        privateIp: env.FLY_PRIVATE_IP ?? null,
        ipv6: env.FLY_PRIVATE_IPV6 ?? null,
        sharedIpv6: env.FLY_SHARED_IPV6 ?? null,
        hostname: os.hostname(),
    };

    /* ------------------------------------------------------------
       4. Volumes (Fly Volumes + LiteFS)
       ------------------------------------------------------------ */
    try {
        const mounts = fs.readFileSync("/proc/mounts", "utf8")
            .split("\n")
            .filter(Boolean);

        out.volumes = mounts
            .map(line => {
                const parts = line.split(" ");
                return {
                    source: parts[0],
                    mountPoint: parts[1],
                    type: parts[2],
                };
            })
            .filter(v =>
                v.mountPoint.includes("/data") ||
                v.mountPoint.includes("/mnt") ||
                v.source.includes("volume")
            );
    } catch { }

    /* ------------------------------------------------------------
       5. Firecracker microVM Detection
       ------------------------------------------------------------ */
    out.microVM = {
        firecrackerCpu: firecracker,
        jailedFS: false,
        overlayfs: false,
        isolationHints: [],
    };

    try {
        const mount = fs.readFileSync("/proc/self/mountinfo", "utf8");

        if (/overlay/i.test(mount)) {
            out.microVM.overlayfs = true;
            out.microVM.isolationHints.push("overlayfs");
        }
        if (/dm-verity/i.test(mount)) {
            out.microVM.isolationHints.push("dm-verity (immutable root)");
        }
    } catch { }

    /* ------------------------------------------------------------
       6. LiteFS Detection (Fly replicating SQLite layer)
       ------------------------------------------------------------ */
    if (env.LITEFS_DIR || fs.existsSync("/litefs")) {
        out.litefs = {
            enabled: true,
            dir: env.LITEFS_DIR ?? "/litefs",
            mountExists: fs.existsSync("/litefs"),
        };
    }

    /* ------------------------------------------------------------
       7. WireGuard Networking (Fly remote builder)
       ------------------------------------------------------------ */
    if (env.FLY_WIREGUARD_STATE_DIR) {
        out.network.wireguard = {
            stateDir: env.FLY_WIREGUARD_STATE_DIR,
        };
    }

    /* ------------------------------------------------------------
       8. Raw FLY_* dump
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("FLY_"))
            .sort(([a], [b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   SUPABASE EDGE FUNCTIONS (Deno Runtime on Supabase Edge)
============================================================ */
import fs from "fs";

export function extractSupabaseEdgeFunctionsInfo(env: Record<string, string>) {
    // Primary signals for Supabase Edge Functions
    const isSupabase =
        env.SUPABASE_URL ||
        env.SUPABASE_SERVICE_ROLE_KEY ||
        env.SUPABASE_ANON_KEY ||
        env.SUPABASE_DB_URL ||
        env.SUPABASE_EDGE_RUNTIME === "deno" ||
        (typeof (globalThis as any).Deno !== "undefined" &&
            env.EDGE_FUNCTIONS === "true");

    if (!isSupabase) return null;

    const out: any = {
        isSupabase: true,
        isSupabaseEdgeFunction: false,
        runtime: {},
        project: {},
        keys: {},
        region: null,
        dev: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Runtime Info (Deno-based)
       ------------------------------------------------------------ */
    const D = (globalThis as any).Deno ?? {};
    out.runtime = {
        engine: "deno",
        version: D.version?.deno ?? null,
        typescript: D.version?.typescript ?? null,
        v8: D.version?.v8 ?? null,
        // Supabase-specific runtime metadata
        edgeRuntime: env.SUPABASE_EDGE_RUNTIME ?? null,
        isDeno: typeof D !== "undefined",
    };

    /* ------------------------------------------------------------
       2. Supabase Edge Function Flags
       ------------------------------------------------------------ */
    out.isSupabaseEdgeFunction =
        env.SUPABASE_URL &&
        env.SUPABASE_SERVICE_ROLE_KEY &&
        D !== undefined;

    /* ------------------------------------------------------------
       3. Project Metadata
       ------------------------------------------------------------ */
    out.project = {
        url: env.SUPABASE_URL ?? null,
        projectRef: env.SUPABASE_PROJECT_REF ?? null,
        functionsEndpoint: env.SUPABASE_FUNCTIONS_URL ?? null,
        dbUrl: env.SUPABASE_DB_URL ?? null,
        functionsVersion: env.SUPABASE_EDGE_FUNCTION_VERSION ?? null,
    };

    /* ------------------------------------------------------------
       4. Keys (never expose actual values)
       ------------------------------------------------------------ */
    out.keys = {
        hasAnonKey: !!env.SUPABASE_ANON_KEY,
        hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
        hasJwtSecret: !!env.SUPABASE_JWT_SECRET,
    };

    /* ------------------------------------------------------------
       5. Region Detection
       ------------------------------------------------------------ */
    out.region =
        env.SUPABASE_REGION ??
        env.SUPABASE_EDGE_REGION ??
        null;

    /* ------------------------------------------------------------
       6. Local Dev Metadata (`supabase start`)
       ------------------------------------------------------------ */
    out.dev = {
        isLocalDev: !!env.SUPABASE_LOCAL_DEV,
        studioUrl: env.SUPABASE_STUDIO_URL ?? null,
        localApiUrl: env.SUPABASE_LOCAL_API_URL ?? null,
        localDbUrl: env.SUPABASE_LOCAL_DB_URL ?? null,
    };

    /* ------------------------------------------------------------
       7. Function Invocation Metadata (Optional)
       ------------------------------------------------------------ */
    out.invocation = {
        functionName: env.SUPABASE_FUNCTION_NAME ?? null,
        invocationId: env.SUPABASE_INVOCATION_ID ?? null,
        traceId: env.SUPABASE_TRACE_ID ?? null,
    };

    /* ------------------------------------------------------------
       8. Raw Environment Dump (All SUPABASE_ vars)
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("SUPABASE_"))
            .sort(([a], [b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   DIGITALOCEAN FUNCTIONS (Apache OpenWhisk)
   Also detects: IBM Cloud Functions, Adobe Runtime, OpenWhisk
============================================================ */
export function extractDigitalOceanFunctionsInfo(env: Record<string, string>) {
    // Core OpenWhisk runtime signals
    const isOpenWhisk =
        env.__OW_ACTION_NAME ||
        env.__OW_ACTIVATION_ID ||
        env.__OW_DEADLINE ||
        env.__OW_NAMESPACE ||
        env.__OW_API_HOST;

    if (!isOpenWhisk) return null;

    const out: any = {
        isDigitalOceanFunctions: false,
        isOpenWhisk: true,
        runtime: {},
        action: {},
        invocation: {},
        limits: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Identify provider (DigitalOcean-specific)
       ------------------------------------------------------------ */
    // DO Functions use api.digitalocean.com hostnames
    if (env.__OW_API_HOST?.includes("digitaloceanspaces") ||
        env.__OW_API_HOST?.includes("digitalocean")) {
        out.isDigitalOceanFunctions = true;
    }

    /* ------------------------------------------------------------
       2. Action Information
       ------------------------------------------------------------ */
    out.action = {
        name: env.__OW_ACTION_NAME ?? null,
        namespace: env.__OW_NAMESPACE ?? null,
        version: env.__OW_ACTION_VERSION ?? null,
        path: env.__OW_ACTION_PATH ?? null,
        // OpenWhisk supports sequence actions
        isSequence: env.__OW_ACTION_NAME?.includes("/") ?? false,
    };

    /* ------------------------------------------------------------
       3. Invocation Metadata
       ------------------------------------------------------------ */
    out.invocation = {
        activationId: env.__OW_ACTIVATION_ID ?? null,
        deadline: env.__OW_DEADLINE ? Number(env.__OW_DEADLINE) : null,
        transactionId: env.__OW_TRANSACTION_ID ?? null,
        apiHost: env.__OW_API_HOST ?? null,
        rawEnvironmentJson: null,
    };

    /* ------------------------------------------------------------
       4. Parse __OW_ENV (JSON) if present
       ------------------------------------------------------------ */
    if (env.__OW_ENV) {
        try {
            out.invocation.rawEnvironmentJson = JSON.parse(env.__OW_ENV);
        } catch {
            out.invocation.rawEnvironmentJson = env.__OW_ENV;
        }
    }

    /* ------------------------------------------------------------
       5. Resource limits (set by OpenWhisk)
       ------------------------------------------------------------ */
    out.limits = {
        memory: env.__OW_MEMORY_LIMIT ? Number(env.__OW_MEMORY_LIMIT) : null,
        timeoutMs: env.__OW_TIMEOUT ? Number(env.__OW_TIMEOUT) : null,
        logSize: env.__OW_LOG_SIZE ? Number(env.__OW_LOG_SIZE) : null,
    };

    /* ------------------------------------------------------------
       6. Raw OW_* dump
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("__OW_"))
            .sort(([a], [b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   IBM CLOUD FUNCTIONS (OpenWhisk + IBM Extensions)
   Covers: IBM Cloud Functions, IBM Actions, IBM Cloud Code Engine
============================================================ */
export function extractIBMCloudFunctionsInfo(env: Record<string, string>) {
    // OpenWhisk core signals (shared with DigitalOcean)
    const isOpenWhisk =
        env.__OW_ACTION_NAME ||
        env.__OW_ACTIVATION_ID ||
        env.__OW_DEADLINE ||
        env.__OW_NAMESPACE ||
        env.__OW_API_HOST;

    // IBM-specific signals
    const isIBM =
        env.__OW_API_HOST?.includes("functions.cloud.ibm.com") ||
        env.__OW_API_HOST?.includes("openwhisk.ng.bluemix.net") ||
        env.BLUEMIX_REGION ||
        env.IBM_REGION ||
        env.IBM_ORG ||
        env.IBM_SPACE;

    if (!isOpenWhisk && !isIBM) return null;

    const out: any = {
        isIBMCloudFunctions: isIBM,
        isOpenWhisk: true,
        runtime: {},
        action: {},
        invocation: {},
        ibm: {},
        limits: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Action Information (OpenWhisk Standard)
       ------------------------------------------------------------ */
    out.action = {
        name: env.__OW_ACTION_NAME ?? null,
        namespace: env.__OW_NAMESPACE ?? null,
        version: env.__OW_ACTION_VERSION ?? null,
        path: env.__OW_ACTION_PATH ?? null,
        isSequence: env.__OW_ACTION_NAME?.includes("/") ?? false,
    };

    /* ------------------------------------------------------------
       2. Invocation Metadata
       ------------------------------------------------------------ */
    out.invocation = {
        activationId: env.__OW_ACTIVATION_ID ?? null,
        deadline: env.__OW_DEADLINE ? Number(env.__OW_DEADLINE) : null,
        apiHost: env.__OW_API_HOST ?? null,
        transactionId: env.__OW_TRANSACTION_ID ?? null,
        rawEnvironmentJson: null,
    };

    if (env.__OW_ENV) {
        try {
            out.invocation.rawEnvironmentJson = JSON.parse(env.__OW_ENV);
        } catch {
            out.invocation.rawEnvironmentJson = env.__OW_ENV;
        }
    }

    /* ------------------------------------------------------------
       3. IBM Cloud-Specific Metadata
       ------------------------------------------------------------ */
    out.ibm = {
        // Classic Bluemix metadata
        region: env.BLUEMIX_REGION ?? env.IBM_REGION ?? null,
        org: env.IBM_ORG ?? env.BLUEMIX_ORG ?? null,
        space: env.IBM_SPACE ?? env.BLUEMIX_SPACE ?? null,

        // Modern IBM Cloud resource metadata
        resourceGroup: env.IBM_RESOURCE_GROUP ?? null,
        accountId: env.IBM_ACCOUNT_ID ?? null,

        // IBM Cloud Monitoring / Logs / Telemetry
        monitoring: {
            logdnaApiKeyPresent: !!env.LOGDNA_API_KEY,
            metricsKeyPresent: !!env.METRICS_API_KEY,
            syslogEndpoint: env.SYSLOG_ENDPOINT ?? null,
        },

        // IBM Serverless Functions Gateway
        edgeGateway: env.IBM_EDGE_GATEWAY ?? null,

        // IBM Cloud Code Engine (Alternative serverless platform)
        isCodeEngine: !!env.CE_APP,
        codeEngine: {
            appName: env.CE_APP ?? null,
            project: env.CE_PROJECT ?? null,
            instanceId: env.CE_INSTANCE ?? null,
            region: env.CE_REGION ?? null,
        },
    };

    /* ------------------------------------------------------------
       4. Resource Limits (OpenWhisk Standard)
       ------------------------------------------------------------ */
    out.limits = {
        memory: env.__OW_MEMORY_LIMIT ? Number(env.__OW_MEMORY_LIMIT) : null,
        timeoutMs: env.__OW_TIMEOUT ? Number(env.__OW_TIMEOUT) : null,
        logSize: env.__OW_LOG_SIZE ? Number(env.__OW_LOG_SIZE) : null,
    };

    /* ------------------------------------------------------------
       5. Raw IBM_* and BLUEMIX_* dump
       ------------------------------------------------------------ */
    const ibmVars = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("IBM_") ||
            k.startsWith("BLUEMIX_")
        )
    );

    /* ------------------------------------------------------------
       6. Raw OpenWhisk dump
       ------------------------------------------------------------ */
    const owVars = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("__OW_"))
            .sort(([a], [b]) => a.localeCompare(b))
    );

    out.raw = {
        ...ibmVars,
        ...owVars,
    };

    return out;
}

/* ============================================================
   ALIBABA CLOUD FUNCTION COMPUTE (FC)
   Covers ALL FC v1 and v2 runtimes, HTTP triggers, event triggers,
   custom domains, tracing, and log service integration.
============================================================ */
export function extractAlibabaFCInfo(env: Record<string, string>) {
    const isFC =
        env.FC_FUNC_NAME ||
        env.FC_FUNCTION_NAME ||
        env.ALIBABA_CLOUD_REGION_ID ||
        env.FC_INSTANCE_ID ||
        env.FC_ACCOUNT_ID;

    if (!isFC) return null;

    const out: any = {
        isAlibabaFC: true,
        runtime: {},
        function: {},
        invocation: {},
        project: {},
        limits: {},
        tracing: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Function Identity
       ------------------------------------------------------------ */
    out.function = {
        name: env.FC_FUNCTION_NAME ?? env.FC_FUNC_NAME ?? null,
        handler: env.FC_FUNCTION_HANDLER ?? null,
        versionId: env.FC_VERSION_ID ?? null,
        initializer: env.FC_INITIALIZER ?? null,
        initializerExecuted: env.FC_INITIALIZATION_TIME ?? null,
        customDomain: env.FC_CUSTOM_DOMAIN ?? null,
    };

    /* ------------------------------------------------------------
       2. Service Identity
       ------------------------------------------------------------ */
    out.service = {
        name: env.FC_SERVICE_NAME ?? null,
        logProject: env.FC_LOG_PROJECT ?? null,
        logStore: env.FC_LOG_STORE ?? null,
    };

    /* ------------------------------------------------------------
       3. Instance / Execution Environment
       ------------------------------------------------------------ */
    out.runtime = {
        instanceId: env.FC_INSTANCE_ID ?? null,
        instanceConcurrency: env.FC_INSTANCE_CONCURRENCY
            ? Number(env.FC_INSTANCE_CONCURRENCY)
            : null,
        accountId: env.FC_ACCOUNT_ID ?? null,
        region: env.FUNCTION_REGION ??
            env.FC_REGION ??
            env.ALIBABA_CLOUD_REGION_ID ??
            null,
    };

    /* ------------------------------------------------------------
       4. Invocation Metadata
       ------------------------------------------------------------ */
    out.invocation = {
        requestId: env.FC_REQUEST_ID ?? env.REQUEST_ID ?? null,
        timeout: env.FC_TIMEOUT ? Number(env.FC_TIMEOUT) : null,
        memory: env.FC_MEMORY_SIZE ? Number(env.FC_MEMORY_SIZE) : null,
        retryCount: env.FC_RETRY_COUNT ? Number(env.FC_RETRY_COUNT) : null,
        qualifier: env.FC_QUALIFIER ?? null,
        credentials: {
            accessKey: !!env.ALIBABA_CLOUD_ACCESS_KEY_ID,
            keySecretPresent: !!env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
            securityTokenPresent: !!env.ALIBABA_CLOUD_SECURITY_TOKEN,
        },
    };

    /* ------------------------------------------------------------
       5. Log Service / SLS Integration
       ------------------------------------------------------------ */
    out.project = {
        logProject: env.FC_LOG_PROJECT ?? null,
        logStore: env.FC_LOG_STORE ?? null,
        logEndpoint: env.FC_LOG_ENDPOINT ?? null,
    };

    /* ------------------------------------------------------------
       6. Tracing / X-TRACE (NOT IN OFFICIAL DOCS)
       ------------------------------------------------------------ */
    out.tracing = {
        traceId: env.FC_TRACE_ID ?? env.X_TRACE_ID ?? null,
        spanId: env.FC_TRACE_SPAN_ID ?? env.X_TRACE_SPAN ?? null,
        sampled: env.FC_TRACE_SAMPLED ?? null,
        aliyunTracingEnabled:
            !!env.FC_TRACE_ID ||
            !!env.X_TRACE_ID ||
            !!env.FC_TRACE_SPAN_ID,
    };

    /* ------------------------------------------------------------
       7. Resource Limits
       ------------------------------------------------------------ */
    out.limits = {
        memory: env.FC_MEMORY_SIZE ? Number(env.FC_MEMORY_SIZE) : null,
        timeout: env.FC_TIMEOUT ? Number(env.FC_TIMEOUT) : null,
        instanceConcurrency: env.FC_INSTANCE_CONCURRENCY
            ? Number(env.FC_INSTANCE_CONCURRENCY)
            : null,
    };

    /* ------------------------------------------------------------
       8. Raw FC environment dump
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) =>
                k.startsWith("FC_") ||
                k.startsWith("ALIBABA_") ||
                k.startsWith("X_TRACE")
            )
            .sort(([a], [b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   ORACLE CLOUD FUNCTIONS (Fn Project)
   Covers: Oracle Functions (OCI), Fn Project Standalone,
           Fn on Kubernetes, Fn in Docker, Fn local dev server.
============================================================ */
export function extractOracleFunctionsInfo(env: Record<string, string>) {
    // Fn Project Core Variables
    const isFn =
        env.FN_APP_NAME ||
        env.FN_FN_NAME ||
        env.FN_FORMAT ||
        env.FN_LISTENER ||
        env.FN_PORT ||
        env.FN_MEMORY;

    // Oracle Cloud-specific signals
    const isOCI =
        env.OCI_REGION ||
        env.OCI_COMPARTMENT_ID ||
        env.OCI_TENANCY_ID ||
        env.FN_ACCESS_TOKEN;

    if (!isFn && !isOCI) return null;

    const out: any = {
        isOracleFunctions: isOCI,
        isFnProject: isFn,
        runtime: {},
        function: {},
        invocation: {},
        oci: {},
        limits: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Fn Project Function Metadata
       ------------------------------------------------------------ */
    out.function = {
        appName: env.FN_APP_NAME ?? null,
        functionName: env.FN_FN_NAME ?? null,
        format: env.FN_FORMAT ?? null,     // http, json, cloudevent, default
        entrypoint: env.FN_ENTRYPOINT ?? null,
        callId: env.FN_CALL_ID ?? null,
        deadline: env.FN_DEADLINE ? Number(env.FN_DEADLINE) : null,
    };

    /* ------------------------------------------------------------
       2. Invocation Metadata
       ------------------------------------------------------------ */
    out.invocation = {
        callId: env.FN_CALL_ID ?? null,
        requestUrl: env.FN_REQUEST_URL ?? null,
        requestMethod: env.FN_REQUEST_METHOD ?? null,
        requestHeaders: env.FN_HTTP_HEADERS ? parseFnHeaders(env.FN_HTTP_HEADERS) : null,
        listener: env.FN_LISTENER ?? null,
        port: env.FN_PORT ?? null,
        maxContentLength: env.FN_MAX_CONTENT_LENGTH
            ? Number(env.FN_MAX_CONTENT_LENGTH)
            : null,
    };

    function parseFnHeaders(headerRaw: string) {
        try {
            return JSON.parse(headerRaw);
        } catch {
            return headerRaw;
        }
    }

    /* ------------------------------------------------------------
       3. Oracle Cloud Identity Metadata
       ------------------------------------------------------------ */
    out.oci = {
        region: env.OCI_REGION ?? null,
        compartmentId: env.OCI_COMPARTMENT_ID ?? null,
        tenancyId: env.OCI_TENANCY_ID ?? null,
        namespace: env.OCI_NAMESPACE ?? null,
        resourcePrincipal: {
            enabled: !!env.OCI_RESOURCE_PRINCIPAL_VERSION,
            version: env.OCI_RESOURCE_PRINCIPAL_VERSION ?? null,
            rpSTSPresent: !!env.OCI_RESOURCE_PRINCIPAL_RPST,
        },
        tracing: {
            traceId: env.OCI_TRACE_ID ?? env.TRACEPARENT ?? null,
        },
    };

    /* ------------------------------------------------------------
       4. Runtime execution environment
       ------------------------------------------------------------ */
    out.runtime = {
        fnVersion: env.FN_VERSION ?? null,
        containerId: env.CONTAINER_ID ?? null,
        tmpDir: env.FN_TMP_DIR ?? null,
        logDir: env.FN_LOG_DIR ?? null,
        configDir: env.FN_CONFIG_DIR ?? null,
        functionTimeout: env.FN_TIMEOUT ? Number(env.FN_TIMEOUT) : null,
    };

    /* ------------------------------------------------------------
       5. Resource limits
       ------------------------------------------------------------ */
    out.limits = {
        memory: env.FN_MEMORY ? Number(env.FN_MEMORY) : null,
        timeout: env.FN_TIMEOUT ? Number(env.FN_TIMEOUT) : null,
    };

    /* ------------------------------------------------------------
       6. Raw Fn_* and OCI_* variables
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) =>
                k.startsWith("FN_") ||
                k.startsWith("OCI_") ||
                k.startsWith("TRACE") ||
                k.startsWith("HTTP_")
            )
            .sort(([a], [b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   OPENFAAS (Docker, Kubernetes, OpenFaaS Cloud)
   Detects: faas-netes, faasd, faas-swarm, faas-cli local,
            OpenFaaS Cloud (GitHub-based PaaS).
============================================================ */
export function extractOpenFaaSInfo(env: Record<string, string>) {
    // Core OpenFaaS runtime signals
    const isFaas =
        env.faas_gateway ||
        env.gateway_hostname ||
        env.write_debug ||
        env.http_content_type ||
        env.http_method ||
        env.http_query ||
        env.http_path ||
        env.http_user_agent;

    // Asynchronous task (NATS / message queue)
    const isAsync =
        env.http_x_callback_url ||
        env.http_x_topic ||
        env.topic;

    // OpenFaaS Cloud (GitHub-based managed environment)
    const isOpenFaaSCloud =
        env.owner_id ||
        env.repo_url ||
        env.git_sha ||
        env.build_id;

    if (!isFaas && !isAsync && !isOpenFaaSCloud) return null;

    const out: any = {
        isOpenFaaS: isFaas,
        isAsyncInvocation: isAsync,
        isOpenFaaSCloud,
        runtime: {},
        function: {},
        invocation: {},
        async: {},
        faasCloud: {},
        limits: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Function Metadata
       ------------------------------------------------------------ */
    out.function = {
        serviceName: env.faas_service ?? null,
        gateway: env.faas_gateway ?? env.gateway_hostname ?? null,
        functionName: env.faas_function_name ?? null,
        namespace: env.faas_namespace ?? null,

        // Local development metadata
        localPort: env.faas_port ?? null,

        // Language info (e.g., python, go, node)
        watchdogMode: env.mode ?? null,
        upstreamUrl: env.upstream_url ?? null,
    };

    /* ------------------------------------------------------------
       2. Invocation Metadata
       ------------------------------------------------------------ */
    out.invocation = {
        method: env.http_method ?? null,
        path: env.http_path ?? null,
        query: env.http_query ?? null,
        contentType: env.http_content_type ?? null,
        userAgent: env.http_user_agent ?? null,
        requestId: env.http_x_request_id ?? null,
        correlationId: env.http_x_correlation_id ?? null,
    };

    /* ------------------------------------------------------------
       3. Async Invocation (NATS / Kafka / Queue)
       ------------------------------------------------------------ */
    out.async = {
        isAsync: isAsync,
        topic: env.http_x_topic ?? env.topic ?? null,
        callbackUrl: env.http_x_callback_url ?? null,
    };

    /* ------------------------------------------------------------
       4. OpenFaaS Cloud Metadata
       ------------------------------------------------------------ */
    out.faasCloud = {
        enabled: isOpenFaaSCloud,
        owner: env.owner_id ?? null,
        repoUrl: env.repo_url ?? null,
        sha: env.git_sha ?? null,
        buildId: env.build_id ?? null,
        commitAuthor: env.commit_author ?? null,
        commitEmail: env.commit_email ?? null,
    };

    /* ------------------------------------------------------------
       5. Resource Limits (from watchdog)
       ------------------------------------------------------------ */
    out.limits = {
        timeout: env.write_timeout ? Number(env.write_timeout) : null,
        readTimeout: env.read_timeout ? Number(env.read_timeout) : null,
        writeDebug: env.write_debug === "true",
        contentLength: env.http_content_length
            ? Number(env.http_content_length)
            : null,
    };

    /* ------------------------------------------------------------
       6. Runtime/Container Environment
       ------------------------------------------------------------ */
    out.runtime = {
        watchdog: env.fprocess ? "classic" : "of-watchdog",
        fprocess: env.fprocess ?? null,
        mode: env.mode ?? null, // e.g., "streaming", "http", "serializing"
        upstreamUrl: env.upstream_url ?? null,
        debug: env.write_debug === "true",
    };

    /* ------------------------------------------------------------
       7. Raw variable dump
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("faas_") ||
            k.startsWith("http_") ||
            k.startsWith("gateway_") ||
            k.startsWith("owner_") ||
            k.startsWith("commit_") ||
            k.startsWith("repo_") ||
            k.startsWith("git_") ||
            k === "topic" ||
            k === "mode" ||
            k === "fprocess"
        )
    );

    return out;
}

/* ============================================================
   CLOUDFLARE PAGES FUNCTIONS
   Covers: Official Pages Functions (edge), Wrangler Dev,
           Build environment, Git metadata, Compatibility flags.
============================================================ */
export function extractCloudflarePagesInfo(env: Record<string, string>) {
    const isPages =
        env.CF_PAGES === "1" ||
        env.CF_PAGES_BRANCH ||
        env.CF_PAGES_COMMIT_SHA ||
        env.CF_PAGES_URL ||
        env.CF_PAGES_PROJECT_ID ||
        env.CF_PAGES_BUILD_ID;

    if (!isPages) return null;

    const out: any = {
        isCloudflarePages: true,
        build: {},
        git: {},
        deploy: {},
        account: {},
        functions: {},
        compatibility: {},
        region: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Build Metadata
       ------------------------------------------------------------ */
    out.build = {
        buildId: env.CF_PAGES_BUILD_ID ?? null,
        buildImage: env.CF_PAGES_BUILD_IMAGE ?? null,
        buildTime: env.CF_PAGES_BUILD_TIME ?? null,
        buildVersion: env.CF_PAGES_BUILD_VERSION ?? null,
        nodeVersion: env.CF_PAGES_NODE_VERSION ?? null,
        npmVersion: env.CF_PAGES_NPM_VERSION ?? null,
        yarnVersion: env.CF_PAGES_YARN_VERSION ?? null,
        pnpmVersion: env.CF_PAGES_PNPM_VERSION ?? null,
    };

    /* ------------------------------------------------------------
       2. Git Metadata (Pages-native)
       ------------------------------------------------------------ */
    out.git = {
        branch: env.CF_PAGES_BRANCH ?? null,
        commitSha: env.CF_PAGES_COMMIT_SHA ?? null,
        commitMessage: env.CF_PAGES_COMMIT_MESSAGE ?? null,
        commitAuthor: env.CF_PAGES_COMMIT_AUTHOR ?? null,
        commitEmail: env.CF_PAGES_COMMIT_EMAIL ?? null,
        repoName: env.CF_PAGES_REPO_NAME ?? null,
        repoOwner: env.CF_PAGES_REPO_OWNER ?? null,
        repoUrl: env.CF_PAGES_REPO_URL ?? null,
    };

    /* ------------------------------------------------------------
       3. Deployment Metadata
       ------------------------------------------------------------ */
    out.deploy = {
        url: env.CF_PAGES_URL ?? null,
        environment: env.CF_PAGES_ENV ?? null,
        projectName: env.CF_PAGES_PROJECT_NAME ?? null,
        projectId: env.CF_PAGES_PROJECT_ID ?? null,
        previewToken: env.CF_PAGES_PREVIEW_TOKEN ?? null,
    };

    /* ------------------------------------------------------------
       4. Account Metadata
       ------------------------------------------------------------ */
    out.account = {
        accountId: env.CF_ACCOUNT_ID ?? null,
        userId: env.CF_USER_ID ?? null,
        email: env.CF_USER_EMAIL ?? null,
    };

    /* ------------------------------------------------------------
       5. Functions Runtime Metadata
       ------------------------------------------------------------ */
    out.functions = {
        // Functions runtime loader
        functionsEnabled: env.CF_PAGES === "1",
        entryFile: env.CF_PAGES_FUNCTION_UTILITY ?? null,

        // Worker-shim metadata (Pages runs functions *through* Workers)
        workerShim: env.CF_PAGES_WORKER ?? null,
        workerType: env.CF_PAGES_WORKER_TYPE ?? null,
        invocationId: env.CF_PAGES_INVOCATION_ID ?? null,
        functionName: env.CF_PAGES_FUNCTION_NAME ?? null,
        routeMatch: env.CF_PAGES_FUNCTION_ROUTE ?? null,
    };

    /* ------------------------------------------------------------
       6. Compatibility Flags (Critical)
       ------------------------------------------------------------ */
    out.compatibility = {
        flags: env.CF_RUNTIME_FLAGS
            ? env.CF_RUNTIME_FLAGS.split(",").map(f => f.trim())
            : [],
        compatibilityDate: env.CF_RUNTIME_COMPATIBILITY_DATE ?? null,
        compatibilityFlags: env.CF_RUNTIME_COMPATIBILITY_FLAGS
            ? env.CF_RUNTIME_COMPATIBILITY_FLAGS.split(",")
            : [],
        miniflareShim: env.MINIFLARE ?? env.CF_PAGES_MINIFLARE ?? null,
        wranglerDev: env.WRANGLER_DEV === "1",
    };

    /* ------------------------------------------------------------
       7. Region Metadata (Pages → Workers → Edge location)
       ------------------------------------------------------------ */
    const region =
        env.CF_REGION ??
        env.CF_PAGES_REGION ??
        env.TZ ??
        null;

    out.region = {
        region,
        isKnown: !!region,
    };

    /* ------------------------------------------------------------
       8. Raw Dump (Everything CF_PAGES*)
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("CF_PAGES") ||
            k.startsWith("CF_RUNTIME") ||
            k.startsWith("CF_ACCOUNT_") ||
            k.startsWith("CF_USER_")
        )
    );

    return out;
}

/* ============================================================
   FLY.IO MACHINES & APPS (Firecracker MicroVM)
   Covers: Fly Machines, Apps v2, Fly Postgres/Redis,
           Fly Regions, Fly Metadata API, Fly Proxy.
============================================================ */
import fs from "fs";

export function extractFlyIOInfo(env: Record<string, string>) {
    // Fly.io core signals
    const isFly =
        env.FLY_APP_NAME ||
        env.FLY_REGION ||
        env.FLY_MACHINE_ID ||
        env.FLY_ALLOC_ID ||
        env.FLY_PRIVATE_IP ||
        env.FLY_PROCESS_GROUP;

    // Metadata API presence
    const hasMetadataApi =
        fs.existsSync("/.fly") || // Machines
        fs.existsSync("/fly") ||  // Legacy Apps
        fs.existsSync("/meta");   // Firecracker metadata

    if (!isFly && !hasMetadataApi) return null;

    const out: any = {
        isFly: true,
        machine: {},
        app: {},
        network: {},
        region: {},
        process: {},
        proxy: {},
        volumes: {},
        postgres: {},
        redis: {},
        metadata: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Machine Metadata
       ------------------------------------------------------------ */
    out.machine = {
        id: env.FLY_MACHINE_ID ?? env.FLY_ALLOC_ID ?? null,
        image: env.FLY_IMAGE_REF ?? null,
        role: env.FLY_PROCESS_GROUP ?? null,
        vmMemoryMB: env.FLY_VM_MEMORY_MB ? Number(env.FLY_VM_MEMORY_MB) : null,
        vmCpuCount: env.FLY_VM_CPU_COUNT ? Number(env.FLY_VM_CPU_COUNT) : null,
    };

    /* ------------------------------------------------------------
       2. App Metadata
       ------------------------------------------------------------ */
    out.app = {
        name: env.FLY_APP_NAME ?? null,
        releaseId: env.FLY_RELEASE_ID ?? null,
        releaseVersion: env.FLY_RELEASE_VERSION ?? null,
        configChecksum: env.FLY_CONFIG_SHA256 ?? null,
        appRole: env.FLY_PROCESS_GROUP ?? null,
    };

    /* ------------------------------------------------------------
       3. Region Metadata
       ------------------------------------------------------------ */
    out.region = {
        region: env.FLY_REGION ?? null,
        primaryRegion: env.FLY_PRIMARY_REGION ?? null,
        backupRegions: env.FLY_BACKUP_REGIONS
            ? env.FLY_BACKUP_REGIONS.split(",").map(s => s.trim())
            : [],
    };

    /* ------------------------------------------------------------
       4. Networking: 6PN, WireGuard, Fly Proxy
       ------------------------------------------------------------ */
    out.network = {
        privateIp: env.FLY_PRIVATE_IP ?? null,
        sharedIpv6: env.FLY_GLOBAL_IPV6 ?? null,
        6pn: env.FLY_6PN ?? null,
        mts: env.FLY_MTS_HOSTNAME ?? null, // internal metadata DNS
        waypoint: env.FLY_WAYPOINT_URL ?? null,
        neighbors: env.FLY_NEIGHBORS
            ? env.FLY_NEIGHBORS.split(",")
            : [],
    };

    /* ------------------------------------------------------------
       5. Proxy / Runtime (Fly Proxy)
       ------------------------------------------------------------ */
    out.proxy = {
        flyAppRole: env.FLY_PROCESS_GROUP ?? null,
        flyReplayHeader: env.FLY_REPLAY ?? null,
        internalGateway: env.FLY_IO_GATEWAY ?? null,
        tlsEnabled: env.FLY_TLS_ENDPOINT ?? null,
    };

    /* ------------------------------------------------------------
       6. Volumes (NVMe local disks)
       ------------------------------------------------------------ */
    out.volumes = {
        attached: env.FLY_VOLUME_ID ? [env.FLY_VOLUME_ID] : [],
        path: env.FLY_VOLUME_PATH ?? null,
        sizeGB: env.FLY_VOLUME_SIZE_GB
            ? Number(env.FLY_VOLUME_SIZE_GB)
            : null,
    };

    /* ------------------------------------------------------------
       7. Fly Postgres / Redis Metadata (Fly-managed DBs)
       ------------------------------------------------------------ */
    out.postgres = {
        cluster: env.FLY_PG_CLUSTER ?? null,
        role: env.FLY_PG_ROLE ?? null,
        connectionString: env.FLY_PG_CONNECTION_STRING ? "***" : null,
        user: env.FLY_PG_USER ?? null,
    };

    out.redis = {
        connectionString: env.FLY_REDIS_CACHE_URL ? "***" : null,
        redisMode: env.FLY_REDIS_MODE ?? null,
    };

    /* ------------------------------------------------------------
       8. Fly Metadata API (Firecracker MicroVM)
       ------------------------------------------------------------ */
    out.metadata = {
        hasMetaDir: hasMetadataApi,
        metaDirs: [
            fs.existsSync("/.fly") ? "/.fly" : null,
            fs.existsSync("/fly") ? "/fly" : null,
            fs.existsSync("/meta") ? "/meta" : null,
        ].filter(Boolean),
        // strongly hints running inside Fly VM
        vmtools: fs.existsSync("/.fly/instance") || fs.existsSync("/meta/instance"),
    };

    /* ------------------------------------------------------------
       9. Raw Env Dump (ALL FLY_* vars)
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("FLY_"))
            .sort(([a], [b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   RENDER.COM (Web Services, Serverless, Cron, Workers)
   Covers: Render Web Services (Docker/Native),
           Render Background Workers, Cron Jobs,
           Render Serverless Functions + Preview Environments.
============================================================ */
export function extractRenderInfo(env: Record<string, string>) {
    const isRender =
        env.RENDER === "true" ||
        env.RENDER_SERVICE_ID ||
        env.RENDER_EXTERNAL_URL ||
        env.RENDER_INSTANCE_ID ||
        env.RENDER_GIT_BRANCH ||
        env.RENDER_CRON === "true";

    if (!isRender) return null;

    const out: any = {
        isRender: true,
        service: {},
        deploy: {},
        git: {},
        runtime: {},
        cron: {},
        worker: {},
        serverless: {},
        preview: {},
        network: {},
        secrets: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Service Metadata
       ------------------------------------------------------------ */
    out.service = {
        id: env.RENDER_SERVICE_ID ?? null,
        name: env.RENDER_SERVICE_NAME ?? null,
        type: env.RENDER_SERVICE_TYPE ?? null,       // web / worker / cron / function
        ownerId: env.RENDER_OWNER_ID ?? null,
        plan: env.RENDER_PLAN ?? null,
        region: env.RENDER_REGION ?? null,
        os: env.RENDER_RUNTIME_OS ?? null,
        arch: env.RENDER_RUNTIME_ARCH ?? null,
    };

    /* ------------------------------------------------------------
       2. Deployment Metadata
       ------------------------------------------------------------ */
    out.deploy = {
        deployId: env.RENDER_DEPLOY_ID ?? null,
        deployType: env.RENDER_DEPLOY_TYPE ?? null,
        deployCreatedAt: env.RENDER_DEPLOY_CREATED_AT ?? null,
        deployUpdatedAt: env.RENDER_DEPLOY_UPDATED_AT ?? null,
        version: env.RENDER_VERSION ?? null,
        buildCommand: env.RENDER_BUILD_COMMAND ?? null,
        startCommand: env.RENDER_START_COMMAND ?? null,
    };

    /* ------------------------------------------------------------
       3. Git Metadata
       ------------------------------------------------------------ */
    out.git = {
        branch: env.RENDER_GIT_BRANCH ?? null,
        commit: env.RENDER_GIT_COMMIT ?? null,
        repo: env.RENDER_GIT_REPO ?? null,
        repoOwner: env.RENDER_GIT_REPO_OWNER ?? null,
        repoName: env.RENDER_GIT_REPO_NAME ?? null,
        commitMessage: env.RENDER_GIT_COMMIT_MESSAGE ?? null,
        commitAuthor: env.RENDER_GIT_COMMIT_AUTHOR ?? null,
    };

    /* ------------------------------------------------------------
       4. Runtime Metadata (Instance)
       ------------------------------------------------------------ */
    out.runtime = {
        instanceId: env.RENDER_INSTANCE_ID ?? null,
        instanceOrdinal: env.RENDER_INSTANCE_ORDINAL
            ? Number(env.RENDER_INSTANCE_ORDINAL)
            : null,
        instanceClass: env.RENDER_INSTANCE_CLASS ?? null,   // starter / standard / pro
        cpu: env.RENDER_CPU_LIMIT ?? null,
        memory: env.RENDER_MEMORY_LIMIT ?? null,
        containerRuntime: env.RENDER_CONTAINER_RUNTIME ?? null,
    };

    /* ------------------------------------------------------------
       5. Cron Jobs
       ------------------------------------------------------------ */
    out.cron = {
        enabled: env.RENDER_CRON === "true",
        schedule: env.RENDER_CRON_SCHEDULE ?? null,
        timezone: env.RENDER_CRON_TIMEZONE ?? null,
        runAt: env.RENDER_CRON_RUN_AT ?? null,
        invocationId: env.RENDER_CRON_INVOCATION_ID ?? null,
    };

    /* ------------------------------------------------------------
       6. Background Workers
       ------------------------------------------------------------ */
    out.worker = {
        isWorker: env.RENDER_SERVICE_TYPE === "worker",
        workerGroup: env.RENDER_WORKER_GROUP ?? null,
        jobsUrl: env.RENDER_JOBS_URL ?? null,
        queueName: env.RENDER_QUEUE_NAME ?? null,
    };

    /* ------------------------------------------------------------
       7. Serverless Functions (Render Functions)
       ------------------------------------------------------------ */
    out.serverless = {
        isFunction: env.RENDER_SERVICE_TYPE === "function",
        requestId: env.RENDER_FUNCTION_REQUEST_ID ?? null,
        region: env.RENDER_FUNCTION_REGION ?? null,
        runtime: env.RENDER_FUNCTION_RUNTIME ?? null, // node / python / deno
        timeoutSeconds: env.RENDER_FUNCTION_TIMEOUT
            ? Number(env.RENDER_FUNCTION_TIMEOUT)
            : null,
    };

    /* ------------------------------------------------------------
       8. Preview Environments
       ------------------------------------------------------------ */
    out.preview = {
        isPreview: env.RENDER_PREVIEW_DEPLOY === "true",
        url: env.RENDER_EXTERNAL_URL ?? null,
        parentDeployId: env.RENDER_PREVIEW_PARENT_DEPLOY_ID ?? null,
        branch: env.RENDER_PREVIEW_BRANCH ?? null,
    };

    /* ------------------------------------------------------------
       9. Networking Metadata
       ------------------------------------------------------------ */
    out.network = {
        externalUrl: env.RENDER_EXTERNAL_URL ?? null,
        internalHostname: env.RENDER_INTERNAL_HOSTNAME ?? null,
        ip: env.RENDER_IP ?? null,
        privateSubnet: env.RENDER_PRIVATE_SUBNET ?? null,
        dnsZone: env.RENDER_DNS_ZONE ?? null,
    };

    /* ------------------------------------------------------------
       10. Render Secrets Engine Signals (VERY IMPORTANT)
       ------------------------------------------------------------ */
    out.secrets = {
        hasRenderSecrets: !!env.RENDER_SECRET_ENV,
        source: env.RENDER_SECRET_SOURCE ?? null,
        // secret values are not shown
    };

    /* ------------------------------------------------------------
       11. Raw "RENDER_*" Dump
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("RENDER_"))
    );

    return out;
}

/* ============================================================
   RAILWAY.APP (Nixpacks, Docker, Serverless, Plugins)
   Covers: Railway Web Services, Cron Jobs, Background Workers,
           Railway “Functions”, Preview Environments,
           Railway Local Dev (`railway run`).
============================================================ */
export function extractRailwayInfo(env: Record<string, string>) {
    const isRailway =
        env.RAILWAY_ENVIRONMENT ||
        env.RAILWAY_PROJECT_ID ||
        env.RAILWAY_SERVICE_ID ||
        env.RAILWAY_DEPLOYMENT_ID ||
        env.RAILWAY_STATIC_URL ||
        env.RAILWAY_STATIC_DEPLOYMENT ||
        env.RAILWAY_DOCKER_IMAGE ||
        env.RAILWAY_RUN === "true";

    if (!isRailway) return null;

    const out: any = {
        isRailway: true,
        project: {},
        service: {},
        deployment: {},
        git: {},
        runtime: {},
        nixpacks: {},
        docker: {},
        railwayFunctions: {},
        preview: {},
        plugins: {},
        localDev: {},
        network: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Project-Level Metadata
       ------------------------------------------------------------ */
    out.project = {
        projectId: env.RAILWAY_PROJECT_ID ?? null,
        projectName: env.RAILWAY_PROJECT_NAME ?? null,
        orgId: env.RAILWAY_ORG_ID ?? null,
    };

    /* ------------------------------------------------------------
       2. Service Metadata
       ------------------------------------------------------------ */
    out.service = {
        serviceId: env.RAILWAY_SERVICE_ID ?? null,
        serviceName: env.RAILWAY_SERVICE_NAME ?? null,
        serviceType: env.RAILWAY_SERVICE_TYPE ?? null, // web, worker, function, cron
        rootDirectory: env.RAILWAY_ROOT_DIRECTORY ?? null,
    };

    /* ------------------------------------------------------------
       3. Deployment Metadata
       ------------------------------------------------------------ */
    out.deployment = {
        deploymentId: env.RAILWAY_DEPLOYMENT_ID ?? null,
        timestamp: env.RAILWAY_DEPLOYMENT_TIMESTAMP ?? null,
        environment: env.RAILWAY_ENVIRONMENT ?? null,
        url: env.RAILWAY_STATIC_URL ?? null,
        staticDeployment: env.RAILWAY_STATIC_DEPLOYMENT === "true",
        generation: env.RAILWAY_GENERATION ?? null,
    };

    /* ------------------------------------------------------------
       4. Git Metadata
       ------------------------------------------------------------ */
    out.git = {
        repoUrl: env.RAILWAY_GIT_REPO ?? null,
        repoName: env.RAILWAY_GIT_REPO_NAME ?? null,
        branch: env.RAILWAY_GIT_BRANCH ?? null,
        commitSha: env.RAILWAY_GIT_COMMIT_SHA ?? null,
        commitMessage: env.RAILWAY_GIT_COMMIT_MESSAGE ?? null,
        commitAuthor: env.RAILWAY_GIT_COMMIT_AUTHOR ?? null,
    };

    /* ------------------------------------------------------------
       5. Runtime Metadata
       ------------------------------------------------------------ */
    out.runtime = {
        cpuCount: env.RAILWAY_CPU_COUNT ? Number(env.RAILWAY_CPU_COUNT) : null,
        memoryMB: env.RAILWAY_MEMORY_MB ? Number(env.RAILWAY_MEMORY_MB) : null,
        ephemeralStorageMB: env.RAILWAY_EPHEMERAL_STORAGE_MB
            ? Number(env.RAILWAY_EPHEMERAL_STORAGE_MB)
            : null,
        environment: env.RAILWAY_ENVIRONMENT ?? null,
        runId: env.RAILWAY_RUN_ID ?? null,
    };

    /* ------------------------------------------------------------
       6. Nixpacks Metadata (auto-builds)
       ------------------------------------------------------------ */
    out.nixpacks = {
        isNixpacks: env.RAILWAY_NIXPACKS === "true",
        planVersion: env.RAILWAY_NIXPACKS_VERSION ?? null,
        nodeVersion: env.RAILWAY_NODE_VERSION ?? null,
        pythonVersion: env.RAILWAY_PYTHON_VERSION ?? null,
        rubyVersion: env.RAILWAY_RUBY_VERSION ?? null,
        goVersion: env.RAILWAY_GO_VERSION ?? null,
    };

    /* ------------------------------------------------------------
       7. Docker Metadata
       ------------------------------------------------------------ */
    out.docker = {
        isDocker: !!env.RAILWAY_DOCKER_IMAGE,
        image: env.RAILWAY_DOCKER_IMAGE ?? null,
        dockerfilePath: env.RAILWAY_DOCKERFILE ?? null,
    };

    /* ------------------------------------------------------------
       8. Railway Functions (Serverless)
       ------------------------------------------------------------ */
    out.railwayFunctions = {
        isFunction: env.RAILWAY_SERVICE_TYPE === "function",
        functionRuntime: env.RAILWAY_FUNCTION_RUNTIME ?? null,
        functionTimeout:
            env.RAILWAY_FUNCTION_TIMEOUT
                ? Number(env.RAILWAY_FUNCTION_TIMEOUT)
                : null,
        requestId: env.RAILWAY_FUNCTION_REQUEST_ID ?? null,
        region: env.RAILWAY_FUNCTION_REGION ?? null,
        coldStart: env.RAILWAY_FUNCTION_COLD_START === "true",
    };

    /* ------------------------------------------------------------
       9. Preview Environments
       ------------------------------------------------------------ */
    out.preview = {
        isPreview: env.RAILWAY_PREVIEW === "true",
        previewBranch: env.RAILWAY_PREVIEW_BRANCH ?? null,
        previewUrl: env.RAILWAY_PREVIEW_URL ?? null,
    };

    /* ------------------------------------------------------------
       10. Plugins (Databases/Redis/etc.)
       ------------------------------------------------------------ */
    out.plugins = {
        postgres: env.PGHOST ? {
            host: env.PGHOST,
            port: env.PGPORT,
            user: env.PGUSER,
            hasPassword: !!env.PGPASSWORD
        } : null,

        mysql: env.MYSQLHOST ? {
            host: env.MYSQLHOST,
            port: env.MYSQLPORT,
            user: env.MYSQLUSER,
            hasPassword: !!env.MYSQLPASSWORD
        } : null,

        redis: env.REDISHOST ? {
            host: env.REDISHOST,
            port: env.REDISPORT,
            hasPassword: !!env.REDISPASSWORD
        } : null,
    };

    /* ------------------------------------------------------------
       11. Local Development (railway run)
       ------------------------------------------------------------ */
    out.localDev = {
        isLocal: env.RAILWAY_RUN === "true",
        environmentName: env.RAILWAY_LOCAL_ENVIRONMENT ?? null,
        projectDir: env.RAILWAY_LOCAL_PROJECT_DIR ?? null,
    };

    /* ------------------------------------------------------------
       12. Networking Metadata
       ------------------------------------------------------------ */
    out.network = {
        internalUrl: env.RAILWAY_INTERNAL_URL ?? null,
        externalUrl: env.RAILWAY_STATIC_URL ?? null,
        port: env.PORT ?? null,
    };

    /* ------------------------------------------------------------
       13. Raw RAILWAY_* dump
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("RAILWAY_"))
            .sort(([a, b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   SUPABASE EDGE FUNCTIONS
   Covers: Supabase Edge Functions (Deno Deploy),
           Local Supabase CLI, Preview branches,
           Supabase internal metadata, Deno Deploy signals.
============================================================ */
export function extractSupabaseEdgeInfo(env: Record<string, string>) {
    const isSupabase =
        env.SUPABASE_URL ||
        env.SUPABASE_SERVICE_ROLE_KEY ||
        env.SUPABASE_ANON_KEY ||
        env.SUPABASE_PROJECT_REF ||
        env.SUPABASE_FUNCTION_ID ||
        env.SUPABASE_DB_HOST ||
        env.SUPABASE_INTERNAL_TOKEN;

    // Deno Deploy detection (base platform)
    const isDeno =
        env.DENO_REGION ||
        env.DENO_DEPLOYMENT_ID ||
        env.DENO_VERSION;

    if (!isSupabase && !isDeno) return null;

    const out: any = {
        isSupabaseEdge: isSupabase,
        isDenoDeploy: isDeno,
        project: {},
        function: {},
        invocation: {},
        supabaseAuth: {},
        database: {},
        storage: {},
        realtime: {},
        preview: {},
        deno: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Project Metadata
       ------------------------------------------------------------ */
    out.project = {
        projectRef: env.SUPABASE_PROJECT_REF ?? null,
        projectUrl: env.SUPABASE_URL ?? null,
        apiUrl: env.SUPABASE_API_URL ?? null,
        region: env.SUPABASE_REGION ?? null,
    };

    /* ------------------------------------------------------------
       2. Function Metadata
       ------------------------------------------------------------ */
    out.function = {
        id: env.SUPABASE_FUNCTION_ID ?? null,
        name: env.SUPABASE_FUNCTION_NAME ?? null,
        version: env.SUPABASE_FUNCTION_VERSION ?? null,
        deployedAt: env.SUPABASE_DEPLOYED_AT ?? null,
    };

    /* ------------------------------------------------------------
       3. Invocation Metadata
       ------------------------------------------------------------ */
    out.invocation = {
        requestId: env.SUPABASE_REQUEST_ID ?? null,
        edgeRegion: env.DENO_REGION ?? env.SUPABASE_EDGE_REGION ?? null,
        deploymentId: env.DENO_DEPLOYMENT_ID ?? null,
        path: env.SUPABASE_EDGE_PATH ?? null,
        method: env.SUPABASE_EDGE_METHOD ?? null,
        forwardedHost: env.X_FORWARDED_HOST ?? null,
        forwardedFor: env.X_FORWARDED_FOR ?? null,
        forwardedPort: env.X_FORWARDED_PORT ?? null,
        forwardedProto: env.X_FORWARDED_PROTO ?? null,
    };

    /* ------------------------------------------------------------
       4. Supabase Auth / JWT
       ------------------------------------------------------------ */
    out.supabaseAuth = {
        anonKey: !!env.SUPABASE_ANON_KEY,
        serviceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
        jwtSecretPresent: !!env.SUPABASE_JWT_SECRET,
        internalTokenPresent: !!env.SUPABASE_INTERNAL_TOKEN,
    };

    /* ------------------------------------------------------------
       5. Database Metadata
       ------------------------------------------------------------ */
    out.database = {
        host: env.SUPABASE_DB_HOST ?? null,
        port: env.SUPABASE_DB_PORT ?? null,
        user: env.SUPABASE_DB_USER ?? null,
        database: env.SUPABASE_DB_NAME ?? null,
        ssl: env.SUPABASE_DB_SSL ?? null,
        pgbouncer: env.SUPABASE_DB_PGBOUNCER === "true",
        httpMetadata: env.SUPABASE_DB_HTTP_URL ?? null,
    };

    /* ------------------------------------------------------------
       6. Storage Metadata
       ------------------------------------------------------------ */
    out.storage = {
        bucketId: env.SUPABASE_STORAGE_BUCKET ?? null,
        cdnUrl: env.SUPABASE_STORAGE_CDN_URL ?? null,
        s3compatible: env.SUPABASE_S3_ENDPOINT ?? null,
    };

    /* ------------------------------------------------------------
       7. Realtime / WebSockets / Broadcast
       ------------------------------------------------------------ */
    out.realtime = {
        broadcastUrl: env.SUPABASE_REALTIME_URL ?? null,
        realtimeRegion: env.SUPABASE_REALTIME_REGION ?? null,
        websocketUrl: env.SUPABASE_WEBSOCKET_URL ?? null,
    };

    /* ------------------------------------------------------------
       8. Preview Functions
       ------------------------------------------------------------ */
    out.preview = {
        isPreview: env.SUPABASE_PREVIEW === "true",
        previewBranch: env.SUPABASE_PREVIEW_BRANCH ?? null,
    };

    /* ------------------------------------------------------------
       9. Deno Deploy Metadata
       ------------------------------------------------------------ */
    out.deno = {
        denoVersion: env.DENO_VERSION ?? null,
        region: env.DENO_REGION ?? null,
        deploymentId: env.DENO_DEPLOYMENT_ID ?? null,
        memoryLimit: env.DENO_MEMORY_LIMIT ?? null,
    };

    /* ------------------------------------------------------------
       10. Raw Dump (Supabase + Deno)
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) =>
                k.startsWith("SUPABASE") ||
                k.startsWith("DENO") ||
                k.startsWith("X_FORWARDED")
            )
            .sort(([a], [b]) => a.localeCompare(b))
    );

    return out;
}

/* ============================================================
   VERCEL EDGE FUNCTIONS / EDGE RUNTIME
   Covers: Vercel Edge Functions, Middleware, ISR Revalidation,
           Preview Deployments, Git Integration.
============================================================ */
export function extractVercelEdgeInfo(env: Record<string, string>) {
    // Edge Runtime detection:
    const isVercelEdge =
        env.VERCEL === "1" &&
        (env.VERCEL_REGION || env.EDGE_FUNCTIONS || env.VERCEL_ENV === "edge");

    if (!isVercelEdge) return null;

    const out: any = {
        isVercelEdge: true,
        deploy: {},
        git: {},
        region: {},
        env: {},
        runtime: {},
        edgeConfig: {},
        middleware: {},
        cache: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1. Deployment Metadata
       ------------------------------------------------------------ */
    out.deploy = {
        environment: env.VERCEL_ENV ?? null,      // production / preview / development
        buildId: env.VERCEL_BUILD_ID ?? null,
        deploymentId: env.VERCEL_DEPLOYMENT_ID ?? null,
        url: env.VERCEL_URL ?? null,
        projectId: env.VERCEL_PROJECT_ID ?? null,
        orgId: env.VERCEL_ORG_ID ?? null,
    };

    /* ------------------------------------------------------------
       2. Git Metadata
       ------------------------------------------------------------ */
    out.git = {
        repoUrl: env.VERCEL_GIT_REPO_URL ?? null,
        repoSlug: env.VERCEL_GIT_REPO_SLUG ?? null,
        repoOwner: env.VERCEL_GIT_REPO_OWNER ?? null,
        commitSha: env.VERCEL_GIT_COMMIT_SHA ?? null,
        commitAuthor: env.VERCEL_GIT_COMMIT_AUTHOR ?? null,
        commitMessage: env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
        branch: env.VERCEL_GIT_BRANCH ?? null,
        prId: env.VERCEL_GIT_PULL_REQUEST_ID ?? null,
        prFork: env.VERCEL_GIT_PULL_REQUEST_HEAD_SHA ?? null,
    };

    /* ------------------------------------------------------------
       3. Edge Region Metadata (Critical)
       ------------------------------------------------------------ */
    out.region = {
        region: env.VERCEL_REGION ?? null,
        regionHint: env.VERCEL_EDGE_REGION ?? null,
        nearestRegion: env.VERCEL_NEAREST_REGION ?? null,
        regions: env.VERCEL_REGIONS
            ? env.VERCEL_REGIONS.split(",").map(s => s.trim())
            : [],
    };

    /* ------------------------------------------------------------
       4. Vercel Environment Metadata
       ------------------------------------------------------------ */
    out.env = {
        vercel: env.VERCEL === "1",
        envMode: env.VERCEL_ENV ?? null,
        edgeContext: env.EDGE_FUNCTIONS ? "edge" : null,
        edgeFunctionName: env.EDGE_FUNCTION_NAME ?? null,
    };

    /* ------------------------------------------------------------
       5. Runtime Metadata (Edge isolate)
       ------------------------------------------------------------ */
    out.runtime = {
        runtime: "Vercel Edge Isolate",
        isolateVersion: env.EDGE_RUNTIME_VERSION ?? null,
        compatibilityDate: env.EDGE_COMPATIBILITY_DATE ?? null,
        compatibilityFlags: env.EDGE_COMPATIBILITY_FLAGS
            ? env.EDGE_COMPATIBILITY_FLAGS.split(",")
            : [],
    };

    /* ------------------------------------------------------------
       6. Edge Config (Vercel-specific)
       ------------------------------------------------------------ */
    out.edgeConfig = {
        configId: env.VERCEL_EDGE_CONFIG_ID ?? null,
        configDigest: env.VERCEL_EDGE_CONFIG_DIGEST ?? null,
        configDeploymentId: env.VERCEL_EDGE_CONFIG_DEPLOYMENT ?? null,
    };

    /* ------------------------------------------------------------
       7. Middleware Context (Edge Middleware)
       ------------------------------------------------------------ */
    out.middleware = {
        isMiddleware: env.VERCEL_MIDDLEWARE === "1",
        pathMatched: env.VERCEL_MIDDLEWARE_PATH ?? null,
        middlewareName: env.VERCEL_MIDDLEWARE_NAME ?? null,
        nextConfig: env.VERCEL_MIDDLEWARE_CONFIG ?? null,
    };

    /* ------------------------------------------------------------
       8. Edge Cache Metadata (ISR + Cache Handler)
       ------------------------------------------------------------ */
    out.cache = {
        cacheMode: env.VERCEL_CACHE_MODE ?? null,           // override-cache, bypass-cache, etc.
        revalidate: env.VERCEL_REVALIDATE ?? null,
        isr: env.VERCEL_ISR ?? null,
        isrTokenPresent: !!env.VERCEL_ISR_TOKEN,
        staleWhileRevalidate:
            env.VERCEL_STALE_WHILE_REVALIDATE
                ? Number(env.VERCEL_STALE_WHILE_REVALIDATE)
                : null,
    };

    /* ------------------------------------------------------------
       9. Raw dump (ALL VERCEL_* + EDGE_*)
       ------------------------------------------------------------ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("VERCEL") || k.startsWith("EDGE_")
        )
    );

    return out;
}

export function extractNetlifyFunctionsInfo(env: Record<string, string>) {
    const isNetlify =
        env.NETLIFY ||
        env.NETLIFY_DEV === "true" ||
        env.NETLIFY_BUILD_BASE ||
        env.DEPLOY_ID ||
        env.SITE_ID ||
        env.NETLIFY_GRAPH_TOKEN;

    if (!isNetlify) return null;

    const out: any = {
        isNetlify: true,
        deploy: {},
        site: {},
        git: {},
        context: {},
        function: {},
        lambda: {},
        background: {},
        scheduled: {},
        graph: {},
        dev: {},
        raw: {}
    };

    // 1. Deploy metadata
    out.deploy = {
        deployId: env.DEPLOY_ID ?? null,
        deployUrl: env.URL ?? null,
        deployPrimeUrl: env.DEPLOY_PRIME_URL ?? null,
        buildId: env.BUILD_ID ?? env.NETLIFY_BUILD_ID ?? null,
        buildBase: env.NETLIFY_BUILD_BASE ?? null,
    };

    // 2. Site metadata
    out.site = {
        siteId: env.SITE_ID ?? null,
        siteName: env.SITE_NAME ?? null,
    };

    // 3. Git metadata
    out.git = {
        branch: env.BRANCH ?? null,
        commitRef: env.COMMIT_REF ?? null,
        commitUrl: env.COMMIT_URL ?? null,
        repoUrl: env.REPOSITORY_URL ?? null,
    };

    // 4. Execution context
    out.context = {
        environment: env.CONTEXT ?? null,  // production / deploy-preview / branch-deploy
        isProduction: env.CONTEXT === "production",
        isPreview: env.CONTEXT === "deploy-preview",
        isBranchDeploy: env.CONTEXT === "branch-deploy",
    };

    // 5. Function metadata (Netlify wrapper)
    out.function = {
        name: env.NETLIFY_FUNCTION_NAME ?? null,
        path: env.NETLIFY_FUNCTION_PATH ?? null,
        region: env.AWS_REGION ?? null,
    };

    // 6. AWS Lambda metadata
    out.lambda = {
        functionName: env.AWS_LAMBDA_FUNCTION_NAME ?? null,
        functionVersion: env.AWS_LAMBDA_FUNCTION_VERSION ?? null,
        memorySize: env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE ?? null,
        logGroup: env.AWS_LAMBDA_LOG_GROUP_NAME ?? null,
        logStream: env.AWS_LAMBDA_LOG_STREAM_NAME ?? null,
    };

    // 7. Background functions
    out.background = {
        isBackground: env.NETLIFY_BACKGROUND === "true",
        invocationId: env.NETLIFY_BACKGROUND_INVOCATION_ID ?? null,
    };

    // 8. Scheduled functions (cron)
    out.scheduled = {
        isScheduled: !!env.NETLIFY_SCHEDULED_EVENT,
        schedule: env.NETLIFY_SCHEDULED_CRON ?? null,
        time: env.NETLIFY_SCHEDULED_TIME ?? null,
    };

    // 9. Netlify Graph metadata
    out.graph = {
        tokenPresent: !!env.NETLIFY_GRAPH_TOKEN,
        sessionUrl: env.NETLIFY_GRAPH_TOKEN_URL ?? null,
    };

    // 10. Local dev
    out.dev = {
        isDev: env.NETLIFY_DEV === "true",
        devServer: env.NETLIFY_DEV_SERVER ?? null,
    };

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("NETLIFY") || ["DEPLOY_ID", "SITE_ID"].includes(k)
        )
    );

    return out;
}

export function extractHerokuInfo(env: Record<string, string>) {
    const isHeroku =
        env.HEROKU_APP_ID ||
        env.HEROKU_DYNO_ID ||
        env.DYNO ||
        env.RELEASE_VERSION;

    if (!isHeroku) return null;

    const out: any = {
        isHeroku: true,
        dyno: {},
        release: {},
        git: {},
        addons: {},
        scheduler: {},
        reviewApp: {},
        ci: {},
        raw: {}
    };

    out.dyno = {
        dyno: env.DYNO ?? null,
        dynoId: env.HEROKU_DYNO_ID ?? null,
        size: env.HEROKU_DYNO_SIZE ?? null,
    };

    out.release = {
        releaseVersion: env.RELEASE_VERSION ?? null,
        releaseSlug: env.SLUG_ID ?? null,
        createdAt: env.RELEASE_CREATED_AT ?? null,
    };

    out.git = {
        commit: env.HEROKU_SLUG_COMMIT ?? null,
        description: env.HEROKU_SLUG_DESCRIPTION ?? null,
    };

    out.addons = {
        postgres: env.DATABASE_URL ? "***" : null,
        redis: env.REDIS_URL ? "***" : null,
        memcache: env.MEMCACHE_URL ? "***" : null,
    };

    out.scheduler = {
        isScheduler: env.HEROKU_SCHEDULED === "true",
        jobName: env.HEROKU_SCHEDULE_NAME ?? null,
    };

    out.reviewApp = {
        isReview: !!env.HEROKU_PR_NUMBER,
        prNumber: env.HEROKU_PR_NUMBER ?? null,
        branch: env.HEROKU_PR_BRANCH ?? null,
    };

    out.ci = {
        isCI: env.HEROKU_TEST_RUN_ID ? true : false,
        testRunId: env.HEROKU_TEST_RUN_ID ?? null,
    };

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("HEROKU") || k.startsWith("RELEASE")
        )
    );

    return out;
}

export function extractGoogleAppEngineInfo(env: Record<string, string>) {
    const isGAE =
        env.GAE_SERVICE ||
        env.GAE_VERSION ||
        env.GAE_INSTANCE ||
        env.GAE_ENV;

    if (!isGAE) return null;

    const out: any = {
        isGAE: true,
        service: {},
        version: {},
        instance: {},
        project: {},
        raw: {}
    };

    out.service = {
        service: env.GAE_SERVICE ?? null,
        module: env.GAE_MODULE_NAME ?? null,
    };

    out.version = {
        version: env.GAE_VERSION ?? null,
        runtime: env.GAE_RUNTIME ?? null,
    };

    out.instance = {
        instanceId: env.GAE_INSTANCE ?? null,
        memoryMb: env.GAE_MEMORY_MB ? Number(env.GAE_MEMORY_MB) : null,
    };

    out.project = {
        projectId: env.GOOGLE_CLOUD_PROJECT ?? null,
        region: env.GAE_REGION ?? null,
    };

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("GAE") || k.startsWith("GOOGLE_CLOUD")
        )
    );

    return out;
}

export function extractGitHubActionsInfo(env: Record<string, string>) {
    const isGH =
        env.GITHUB_ACTION ||
        env.GITHUB_ACTIONS === "true" ||
        env.CODESPACES;

    if (!isGH) return null;

    const out: any = {
        isGitHub: true,
        codespaces: {},
        actions: {},
        runner: {},
        git: {},
        raw: {}
    };

    out.codespaces = {
        isCodespace: !!env.CODESPACES,
        machine: env.CODESPACE_NAME ?? null,
        owner: env.GITHUB_REPOSITORY_OWNER ?? null,
        repo: env.GITHUB_REPOSITORY ?? null,
    };

    out.actions = {
        workflow: env.GITHUB_WORKFLOW ?? null,
        runId: env.GITHUB_RUN_ID ?? null,
        runNumber: env.GITHUB_RUN_NUMBER ?? null,
        event: env.GITHUB_EVENT_NAME ?? null,
    };

    out.runner = {
        os: env.RUNNER_OS ?? null,
        arch: env.RUNNER_ARCH ?? null,
        tempDir: env.RUNNER_TEMP ?? null,
        toolCache: env.RUNNER_TOOL_CACHE ?? null,
        workspace: env.GITHUB_WORKSPACE ?? null,
    };

    out.git = {
        sha: env.GITHUB_SHA ?? null,
        ref: env.GITHUB_REF ?? null,
        repo: env.GITHUB_REPOSITORY ?? null,
        owner: env.GITHUB_REPOSITORY_OWNER ?? null,
    };

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("GITHUB") ||
            k.startsWith("RUNNER") ||
            k === "CODESPACES"
        )
    );

    return out;
}

export function extractCloudflareWorkersInfo(env: Record<string, string>) {
    const info: any = {
        isWorker: false,
        runtime: {},
        apis: {},
        metadata: {},
        dev: {},
        pages: {},
        modules: {},
        raw: {}
    };

    /* ============================================================
       1. Runtime Detection
       ============================================================ */

    // True isolate runtime = Cloudflare Worker
    if (typeof globalThis?.WebSocketPair === "function") {
        info.isWorker = true;
        info.runtime.webSocketPair = true;
    }

    // Cache API exists only in Workers (and some browsers)
    if (globalThis?.caches) info.runtime.caches = true;

    // Durable Objects constructor check
    try {
        if ("DurableObject" in globalThis) {
            info.runtime.durableObjects = true;
        }
    } catch { }

    // HTMLRewriter only exists in Cloudflare Workers
    if (typeof globalThis?.HTMLRewriter === "function") {
        info.runtime.htmlRewriter = true;
    }

    // Cloudflare's workerd runtime often exposes "WebSocketPair" & no Node.js modules
    if (typeof globalThis?.navigator === "undefined" &&
        typeof process === "undefined" &&
        typeof globalThis?.WebSocketPair === "function") {
        info.runtime.workerd = true;
    }


    /* ============================================================
       2. Dev / Emulator Detection
       ============================================================ */

    // Wrangler dev mode
    if (env.WRANGLER_DEV === "1") info.dev.wrangler = true;

    // Miniflare signals
    if (env.MINIFLARE === "true") info.dev.miniflare = true;
    if (env.MINIFLARE_BINDING) info.dev.miniflareBinding = env.MINIFLARE_BINDING;


    /* ============================================================
       3. Cloudflare Pages Functions
       ============================================================ */
    if (env.CF_PAGES === "1") {
        info.pages.isPagesFunction = true;
        info.pages.projectName = env.CF_PAGES_PROJECT_NAME ?? null;
        info.pages.commitSha = env.CF_PAGES_COMMIT_SHA ?? null;
        info.pages.branch = env.CF_PAGES_BRANCH ?? null;
        info.pages.url = env.CF_PAGES_URL ?? null;
    }


    /* ============================================================
       4. API Feature Detection (Capability-based)
       ============================================================ */

    // KV NameSpace binding (dynamic detection)
    info.apis.kv = Object.keys(env).some(k => k.startsWith("KV_") || k.endsWith("_KV"));

    // R2 buckets (R2 binding usually ends with _R2 or starts with R2_)
    info.apis.r2 = Object.keys(env).some(k => k.startsWith("R2_") || k.endsWith("_R2"));

    // D1 bindings
    info.apis.d1 = Object.keys(env).some(k => k.includes("DB") || k.endsWith("_D1"));

    // Hyperdrive (Postgres)
    info.apis.hyperdrive = !!env.HYPERDRIVE || !!env.HYPERDRIVE_LOCAL;

    // Queues (consumer)
    info.apis.queueConsumer = !!env.CF_QUEUE;

    // Queue producer binding
    info.apis.queueProducer = Object.keys(env).some(k => k.endsWith("_QUEUE"));

    // Cron triggers
    info.apis.cron = env.CF_CRON ?? null;

    // Analytics Engine
    info.apis.analyticsEngine = Object.keys(env).some(k => k.includes("ANALYTICS"));

    // Browser rendering API (Workers Browser)
    info.apis.browser = !!env.CF_BROWSER;

    // Vectorize (AI embedding store)
    info.apis.vectorize = Object.keys(env).some(k => k.includes("VECTORIZE"));


    /* ============================================================
       5. Cloudflare Worker Metadata
       ============================================================ */
    info.metadata = {
        region: env.CF_REGION ?? null,
        colo: env.CF_COLO ?? null,
        accountId: env.CF_ACCOUNT_ID ?? null,
        projectName: env.CF_PROJECT_NAME ?? null,
        scriptName: env.CF_SCRIPT_NAME ?? null,
        envName: env.CF_ENV ?? null,
        logpush: env.CF_LOGPUSH ?? null,
        // Memory tier (128, 256, 512, 1024)
        memoryTier: env.CF_MEMORY_TIER ?? null,
        // Worker version hash
        workerVersion: env.CF_WORKER_VERSION ?? null,
        // Cloudflare allows custom environment naming
        customEnvironment: env.CF_CUSTOM_ENV ?? null
    };


    /* ============================================================
       6. Module Bindings (Durable Objects / Workers)
       ============================================================ */
    info.modules = {
        durableObjects: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.endsWith("_DO") || k.startsWith("DO_"))
        ),
        kvNamespaces: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.endsWith("_KV") || k.startsWith("KV_"))
        ),
        r2Buckets: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.endsWith("_R2") || k.startsWith("R2_"))
        ),
        queues: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.endsWith("_QUEUE") || k.startsWith("QUEUE_"))
        ),
        d1: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.endsWith("_D1") || k.includes("DB"))
        ),
        hyperdrive: env.HYPERDRIVE ? { enabled: true } : {},
        vectorize: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.includes("VECTORIZE"))
        ),
    };


    /* ============================================================
       7. Raw Environment (Everything Cloudflare-related)
       ============================================================ */
    info.raw = Object.fromEntries(
        Object.entries(env).filter(([key]) =>
            key.startsWith("CF_") ||
            key.startsWith("WORKERS") ||
            key.includes("HYPERDRIVE") ||
            key.includes("D1") ||
            key.includes("KV") ||
            key.includes("R2") ||
            key.includes("QUEUE")
        )
    );


    return info;
}

export function extractDenoDeployInfo(env: Record<string, string>) {
    const info: any = {
        isDeno: false,
        isDeploy: false,
        runtime: {},
        deploy: {},
        version: {},
        features: {},
        permissions: {},
        regions: {},
        kv: {},
        unstable: {},
        globals: {},
        importMap: {},
        raw: {}
    };

    /* ============================================================
       1. Fundamental Deno Runtime Detection
    ============================================================ */

    // Deno global
    if (typeof globalThis.Deno !== "undefined") {
        info.isDeno = true;

        const D = globalThis.Deno;

        // Versions
        info.version = {
            deno: D.version?.deno ?? null,
            v8: D.version?.v8 ?? null,
            typescript: D.version?.typescript ?? null
        };

        // Permissions API availability
        if (D.permissions) info.permissions.available = true;
    }

    /* ============================================================
       2. Deno Deploy Detection (most reliable)
    ============================================================ */

    if (env.DENO_DEPLOYMENT_ID || env.DENO_REGION || env.DENO_PROJECT) {
        info.isDeploy = true;

        info.deploy = {
            deploymentId: env.DENO_DEPLOYMENT_ID ?? null,
            project: env.DENO_PROJECT ?? null,
            region: env.DENO_REGION ?? null,
            url: env.DENO_DEPLOYMENT_URL ?? null,
            environment: env.DENO_ENV ?? null,   // e.g. production
        };
    }

    // Deno Deploy has no "process", Node, or fs
    if (typeof process === "undefined" && typeof globalThis?.WebSocketPair !== "undefined") {
        info.runtime.isIsolate = true;
    }

    // Deploy exposes fetch caching
    info.runtime.hasEdgeCache = typeof globalThis?.caches !== "undefined";

    /* ============================================================
       3. Detect Deno Features (capability detection)
    ============================================================ */

    const D = globalThis.Deno ?? {};
    info.features = {
        httpServer: typeof D.serve === "function",
        kvAvailable: typeof D.openKv === "function",
        fsReadable: !!D.readFile,
        subprocess: typeof D.run === "function",
        broadcastChannel: typeof globalThis.BroadcastChannel === "function",
        webCrypto: typeof globalThis.crypto?.subtle !== "undefined",
        unstableApis: !!env.DENO_UNSTABLE ?? false,
        importMeta: typeof import?.meta !== "undefined"
    };

    /* ============================================================
       4. Detect Deno KV
    ============================================================ */

    if (typeof D.openKv === "function") {
        info.kv = {
            available: true,
            namespace: env.DENO_KV_NAMESPACE ?? null,
            dbPath: env.DENO_KV_PATH ?? null
        };
    }

    /* ============================================================
       5. Detect Permissions
          (Deploy isolates block most permissions)
    ============================================================ */
    info.permissions = {
        env: D.permissions?.query ? undefined : "blocked",
        read: D.permissions?.query ? undefined : "blocked",
        write: D.permissions?.query ? undefined : "blocked",
        net: D.permissions?.query ? undefined : "blocked",
        ffi: D.permissions?.query ? undefined : "blocked",
        run: D.permissions?.query ? undefined : "blocked"
    };

    /* ============================================================
       6. Regions (multi-region Deploy)
    ============================================================ */

    info.regions = {
        region: env.DENO_REGION ?? null,
        deploymentRegion: env.DENO_DEPLOYMENT_REGION ?? null,
        geolocation: {
            city: env.DENO_CITY ?? null,
            country: env.DENO_COUNTRY ?? null,
            latitude: env.DENO_LATITUDE ?? null,
            longitude: env.DENO_LONGITUDE ?? null
        }
    };

    /* ============================================================
       7. Import Map Detection
    ============================================================ */

    if (env.DENO_IMPORT_MAP) {
        info.importMap = {
            path: env.DENO_IMPORT_MAP,
            loaded: true
        };
    }

    /* ============================================================
       8. Unstable API Detection
    ============================================================ */

    info.unstable = {
        enabled: env.DENO_UNSTABLE === "true",
        flags: env.DENO_OPTS ?? null
    };

    /* ============================================================
       9. Global Deno Deploy Signatures
           These ONLY exist in Deploy isolates:
    ============================================================ */

    info.globals = {
        webSocketPair: typeof globalThis.WebSocketPair !== "undefined",
        eventTarget: typeof globalThis.EventTarget !== "undefined",
        compression: typeof globalThis.CompressionStream !== "undefined",
        deCompression: typeof globalThis.DecompressionStream !== "undefined",
        importMeta: typeof import?.meta !== "undefined",
        crypto: typeof globalThis.crypto !== "undefined",
        fetch: typeof globalThis.fetch === "function"
    };

    /* ============================================================
       10. Raw Environment (Deploy-only)
    ============================================================ */

    info.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("DENO") ||
            k.includes("DEPLOY") ||
            k.includes("KV")
        )
    );

    return info;
}

export function extractFastlyComputeInfo(env: Record<string, string>) {
    const info: any = {
        isFastly: false,
        isViceroy: false,
        runtime: {},
        metadata: {},
        apis: {},
        wasm: {},
        raw: {}
    };

    /* ============================================================
       1. Detect Fastly or Viceroy Environment
       ============================================================ */

    // Fastly Compute@Edge real deployment variables
    if (
        env.FASTLY_SERVICE_ID ||
        env.FASTLY_SERVICE_VERSION ||
        env.FASTLY_REGION ||
        env.FASTLY_POP
    ) {
        info.isFastly = true;
    }

    // Viceroy = local Fastly emulator
    if (env.VICEROY === "1" || env.FASTLY_LOCAL === "1") {
        info.isViceroy = true;
    }

    // Neither Fastly nor Viceroy? Stop early.
    if (!info.isFastly && !info.isViceroy) return null;


    /* ============================================================
       2. Runtime Detection (JS/WASM Execution Context)
       ============================================================ */

    const isNode = typeof process !== "undefined" && process.versions?.node;
    const isDeno = typeof globalThis?.Deno !== "undefined";
    const isCloudflare = typeof globalThis?.WebSocketPair !== "undefined";

    // Fastly Compute@Edge is ALWAYS isolate/WASM, never Node/Deno/CF
    info.runtime = {
        isWasm: !isNode && !isDeno && !isCloudflare,
        isNode: isNode,
        isDeno: isDeno,
        isCloudflare: isCloudflare,
        hasGlobalThis: typeof globalThis !== "undefined",
        hasCrypto: typeof globalThis.crypto !== "undefined",
        hasFetch: typeof globalThis.fetch !== "undefined",
        hasReadableStream: typeof globalThis.ReadableStream !== "undefined"
    };


    /* ============================================================
       3. Fastly-specific Metadata
       ============================================================ */

    info.metadata = {
        serviceId: env.FASTLY_SERVICE_ID ?? null,
        serviceVersion: env.FASTLY_SERVICE_VERSION ?? null,
        region: env.FASTLY_REGION ?? null,
        pop: env.FASTLY_POP ?? null,
        traceId: env.FASTLY_TRACE_ID ?? null,
        // When using Viceroy locally:
        isLocal: env.FASTLY_LOCAL === "1" || env.VICEROY === "1",
        jsEntrypoint: env.FASTLY_JS_ENTRYPOINT ?? null
    };


    /* ============================================================
       4. API/Module Detection (Fastly WASM modules)
       ============================================================ */

    // These modules appear in JS import lists inside Fastly Viceroy/Edge
    const fastlyModules = [
        "fastly:geo",
        "fastly:logger",
        "fastly:cache",
        "fastly:acl",
        "fastly:dictionary",
        "fastly:object-store",
        "fastly:secret-store",
        "fastly:cache-override",
        "fastly:experimental",
        "fastly:http-req",
        "fastly:http-resp",
        "fastly:kv-store"
    ];

    info.apis = {};

    for (const mod of fastlyModules) {
        try {
            // Try importing module (only works in supported runtimes)
            import(mod)
                .then(() => info.apis[mod] = true)
                .catch(() => info.apis[mod] = false);
        } catch {
            info.apis[mod] = false;
        }
    }

    // Dictionary bindings exposed as env vars
    info.apis.dictionaryBindings = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("FASTLY_DICTIONARY_"))
    );

    // Object store bindings
    info.apis.objectStoreBindings = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("FASTLY_OBJECT_STORE_"))
    );

    // KV store bindings (experimental)
    info.apis.kvStoreBindings = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("FASTLY_KV_"))
    );


    /* ============================================================
       5. WASM Execution Capabilities
       ============================================================ */

    info.wasm = {
        wasmAvailable: typeof WebAssembly !== "undefined",
        supportsStreamingCompile:
            typeof WebAssembly.instantiateStreaming === "function",
        supportsBulkMemory:
            WebAssembly?.validate?.(
                new Uint8Array([0x00, 0x61, 0x73, 0x6d])
            ) ?? null
    };


    /* ============================================================
       6. Raw Env Variables
       ============================================================ */

    info.raw = Object.fromEntries(
        Object.entries(env).filter(([key]) =>
            key.startsWith("FASTLY") ||
            key.startsWith("VICEROY")
        )
    );

    return info;
}

export function extractWasmerEdgeInfo(env: Record<string, string>) {
    const info: any = {
        isWasmer: false,
        isWasm: false,
        runtime: {},
        wasi: {},
        features: {},
        metadata: {},
        deployment: {},
        filesystem: {},
        sockets: {},
        limits: {},
        modules: {},
        raw: {}
    };

    /* ============================================================
       1. Wasmer Detection (Env Vars)
       ============================================================ */
    const isWasmer =
        env.WASMER_APP_ID ||
        env.WASMER_DEPLOYMENT_ID ||
        env.WASMER_ENVIRONMENT ||
        env.WASMER_REGION ||
        env.WASMER_PACKAGE_NAME ||
        env.WASMER_MODULE_NAME;

    if (!isWasmer) return null;
    info.isWasmer = true;


    /* ============================================================
       2. WASM Runtime Detection
       ============================================================ */

    const isNode = typeof process !== "undefined" && process.versions?.node;
    const isDeno = typeof globalThis?.Deno !== "undefined";
    const isCF = typeof globalThis?.WebSocketPair !== "undefined";

    // Wasmer Edge = pure WebAssembly isolate
    info.isWasm = !isNode && !isDeno && !isCF;

    info.runtime = {
        isNode,
        isDeno,
        isCloudflare: isCF,
        isWasm: info.isWasm,
        hasGlobalThis: typeof globalThis !== "undefined",
        hasCrypto: typeof globalThis?.crypto !== "undefined",
        hasTimers:
            typeof globalThis?.setTimeout !== "undefined" &&
            typeof setInterval !== "undefined",
        hasStreams:
            typeof globalThis?.ReadableStream !== "undefined" &&
            typeof globalThis?.WritableStream !== "undefined",
        supportsWASI: typeof globalThis?.process === "undefined" && !!env.WASMER_WASI
    };


    /* ============================================================
       3. WASI Capabilities Detection
       ============================================================ */

    // WASI detection via available imports
    info.wasi = {
        fs: !!env.WASI_FS || !!env.WASMER_WASIFS,
        http: !!env.WASI_HTTP || !!env.WASMER_WASIHTTP,
        sockets: !!env.WASI_SOCKETS || !!env.WASMER_WASISOCKETS,
        random: !!env.WASI_RANDOM || !!env.WASMER_RANDOM,
        clock: !!env.WASI_CLOCK || !!env.WASMER_WASI_CLOCK
    };


    /* ============================================================
       4. General Features
       ============================================================ */
    info.features = {
        // true WASI-backed FS
        filesystem: info.wasi.fs,
        // WASI sockets allow outbound TCP/UDP
        allowSockets: info.wasi.sockets,
        // WASI HTTP outbound requests
        wasiHttp: info.wasi.http,
        // geolocation (experimental)
        geo: env.WASMER_GEO === "1",
        // low-level runtime info
        wasiRuntime: env.WASMER_RUNTIME ?? null
    };


    /* ============================================================
       5. Deployment Metadata
       ============================================================ */
    info.deployment = {
        appId: env.WASMER_APP_ID ?? null,
        deploymentId: env.WASMER_DEPLOYMENT_ID ?? null,
        environment: env.WASMER_ENVIRONMENT ?? null,
        project: env.WASMER_PROJECT_ID ?? null,
        package: env.WASMER_PACKAGE_NAME ?? null,
        module: env.WASMER_MODULE_NAME ?? null,
        region: env.WASMER_REGION ?? null,
        replicaId: env.WASMER_REPLICA_ID ?? null,
        git: {
            sha: env.WASMER_GIT_SHA ?? null,
            branch: env.WASMER_GIT_BRANCH ?? null,
            tag: env.WASMER_GIT_TAG ?? null
        }
    };


    /* ============================================================
       6. Filesystem Capabilities
       ============================================================ */
    info.filesystem = {
        enabled: info.wasi.fs,
        root: env.WASMER_FS_ROOT ?? null,
        readOnly: env.WASMER_FS_READONLY === "1",
        mountCount: env.WASMER_FS_MOUNTS ? Number(env.WASMER_FS_MOUNTS) : null
    };


    /* ============================================================
       7. Socket / Network Capabilities
       ============================================================ */
    info.sockets = {
        enabled: info.wasi.sockets,
        allowTcp: env.WASMER_SOCKETS_TCP === "1",
        allowUdp: env.WASMER_SOCKETS_UDP === "1",
        maxConnections: env.WASMER_SOCKETS_MAX
            ? Number(env.WASMER_SOCKETS_MAX)
            : null
    };


    /* ============================================================
       8. Limits (Memory, CPU, etc.)
       ============================================================ */
    info.limits = {
        memoryMb: env.WASMER_MEMORY_MB
            ? Number(env.WASMER_MEMORY_MB)
            : null,
        cpuMs: env.WASMER_CPU_MS ? Number(env.WASMER_CPU_MS) : null,
        requestTimeoutMs: env.WASMER_REQUEST_TIMEOUT
            ? Number(env.WASMER_REQUEST_TIMEOUT)
            : null,
        maxConcurrentRequests: env.WASMER_MAX_CONCURRENCY
            ? Number(env.WASMER_MAX_CONCURRENCY)
            : null
    };


    /* ============================================================
       9. Module Bindings (Wasmer Runtime)
       ============================================================ */
    info.modules = {
        userModules:
            env.WASMER_USER_MODULES
                ? env.WASMER_USER_MODULES.split(",")
                : null,
        systemModules:
            env.WASMER_SYSTEM_MODULES
                ? env.WASMER_SYSTEM_MODULES.split(",")
                : null,
        wasiModules:
            env.WASMER_WASI_MODULES
                ? env.WASMER_WASI_MODULES.split(",")
                : null
    };


    /* ============================================================
       10. Raw Env Variables
       ============================================================ */
    info.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("WASMER") ||
            k.startsWith("WASI") ||
            k.includes("WAPM")
        )
    );

    return info;
}

export function extractWasmEdgeInfo(env: Record<string, string>) {
    const info: any = {
        isWasmEdge: false,
        runtime: {},
        wasi: {},
        features: {},
        ai: {},
        networking: {},
        filesystem: {},
        deployment: {},
        container: {},
        plugins: {},
        raw: {}
    };

    /* ============================================================
       1. Identity Detection
       ============================================================ */

    const isWasmEdge =
        env.WASMEDGE_VERSION ||
        env.WASMEDGE_PLUGIN_PATH ||
        env.WASMEDGE_REPL ||
        env.WASMEDGE_RUNTIME ||
        env.WASMEDGE_FORCE ||
        env.WASMEDGE_DISABLE_SLOW ||
        env.WASMEDGE_DUMP_EXEC ||
        env.WASMEDGE_PROFILE ||
        env.WASM_EDGE_ENV;

    if (!isWasmEdge) return null;

    info.isWasmEdge = true;


    /* ============================================================
       2. Runtime Context
       ============================================================ */

    const isNode = typeof process !== "undefined" && process.versions?.node;
    const isDeno = typeof globalThis?.Deno !== "undefined";
    const isCF = typeof globalThis?.WebSocketPair !== "undefined";

    info.runtime = {
        isNode,
        isDeno,
        isCloudflare: isCF,
        isPureWasm: !isNode && !isDeno && !isCF,
        supportsWASI: typeof globalThis?.process === "undefined",
        hasCrypto: typeof globalThis?.crypto !== "undefined",
        hasFetch: typeof globalThis?.fetch !== "undefined",
        hasStreams: typeof globalThis?.ReadableStream !== "undefined"
    };


    /* ============================================================
       3. WASI Core Features
       ============================================================ */

    info.wasi = {
        fs: !!env.WASMEDGE_WASI_FS || !!env.WASI_FS,
        sockets: !!env.WASMEDGE_WASI_SOCKETS,
        http: !!env.WASMEDGE_WASI_HTTP,
        envVars: !!env.WASMEDGE_WASI_ENVVARS,
        random: !!env.WASMEDGE_WASI_RANDOM,
        threading: !!env.WASMEDGE_WASI_THREADS
    };


    /* ============================================================
       4. Advanced Features (Crypto, TLS, etc.)
       ============================================================ */

    info.features = {
        tls: !!env.WASMEDGE_TLS || !!env.WASMEDGE_PLUGIN_TLS,
        crypto: !!env.WASMEDGE_CRYPTO || !!env.WASMEDGE_PLUGIN_CRYPTO,
        sqlite: !!env.WASMEDGE_PLUGIN_SQLITE,
        zlib: !!env.WASMEDGE_PLUGIN_ZLIB,
        json: !!env.WASMEDGE_PLUGIN_JSON,
        toml: !!env.WASMEDGE_PLUGIN_TOML,
        yaml: !!env.WASMEDGE_PLUGIN_YAML,
        pythonEmbedding: !!env.WASMEDGE_PLUGIN_PYTHON
    };


    /* ============================================================
       5. WASI-NN / AI / ML Modules
       ============================================================ */

    info.ai = {
        wasiNN: !!env.WASMEDGE_PLUGIN_WASI_NN,
        supportedBackends: env.WASMEDGE_WASI_NN_BACKENDS
            ? env.WASMEDGE_WASI_NN_BACKENDS.split(",")
            : null,
        wasmAOT: !!env.WASMEDGE_AOT,
        wasmedgeGpu: !!env.WASMEDGE_GPU
    };


    /* ============================================================
       6. Networking Capabilities
       ============================================================ */

    info.networking = {
        sockets: !!env.WASMEDGE_WASI_SOCKETS,
        http: !!env.WASMEDGE_WASI_HTTP,
        dns: !!env.WASMEDGE_DNS,
        outboundAllowed: env.WASMEDGE_NET_OUTBOUND ?? null
    };


    /* ============================================================
       7. Filesystem Capabilities
       ============================================================ */

    info.filesystem = {
        enabled: !!env.WASMEDGE_WASI_FS,
        mounts: env.WASMEDGE_FS_MOUNTS
            ? env.WASMEDGE_FS_MOUNTS.split(",")
            : null,
        readWrite: env.WASMEDGE_FS_RW === "1",
        home: env.WASMEDGE_HOME ?? null
    };


    /* ============================================================
       8. Deployment Metadata (Cloud, Edge, K8s)
       ============================================================ */

    info.deployment = {
        project: env.WASMEDGE_PROJECT ?? null,
        environment: env.WASMEDGE_ENVIRONMENT ?? null,
        region: env.WASMEDGE_REGION ?? null,
        instanceId: env.WASMEDGE_INSTANCE_ID ?? null,
        executionId: env.WASMEDGE_EXECUTION_ID ?? null,
        git: {
            sha: env.WASMEDGE_GIT_SHA ?? null,
            branch: env.WASMEDGE_GIT_BRANCH ?? null
        }
    };


    /* ============================================================
       9. Container / K8s Integration
       ============================================================ */

    info.container = {
        isDocker: !!env.WASMEDGE_DOCKER || !!env.CONTAINER_ID,
        isKubernetes: !!env.KUBERNETES_SERVICE_HOST,
        k8sPod: env.HOSTNAME ?? null,
        k8sNamespace: env.KUBERNETES_NAMESPACE ?? null,
        cloudProvider: env.WASMEDGE_CLOUD_PROVIDER ?? null
    };


    /* ============================================================
       10. WasmEdge Plugin System
       ============================================================ */

    // Everything loaded under the plugin path
    info.plugins = {
        pluginPath: env.WASMEDGE_PLUGIN_PATH ?? null,
        loadedPlugins: env.WASMEDGE_PLUGINS
            ? env.WASMEDGE_PLUGINS.split(",")
            : null,
        systemPlugins: env.WASMEDGE_SYSTEM_PLUGINS
            ? env.WASMEDGE_SYSTEM_PLUGINS.split(",")
            : null
    };


    /* ============================================================
       11. Raw Environment Vars (WasmEdge / WASI / WASI-NN)
       ============================================================ */

    info.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("WASMEDGE") ||
            k.startsWith("WASI") ||
            k.includes("WASI_NN")
        )
    );

    return info;
}

export function extractOpenShiftKnativeInfo(env: Record<string, string>) {
    const info: any = {
        isKubernetes: false,
        isOpenShift: false,
        isKnative: false,
        serving: {},
        revision: {},
        configuration: {},
        autoscaling: {},
        eventing: {},
        openshift: {},
        mesh: {},
        pod: {},
        build: {},
        raw: {}
    };

    /* ============================================================
       1. Kubernetes Base Detection
       ============================================================ */

    if (env.KUBERNETES_SERVICE_HOST || env.KUBERNETES_PORT) {
        info.isKubernetes = true;
    }

    /* ============================================================
       2. Knative Serving Detection
       ============================================================ */

    const isKnative =
        env.K_SERVICE ||
        env.K_REVISION ||
        env.K_CONFIGURATION ||
        env.KNATIVE_RUNTIME ||
        env.KNATIVE_AUTOSCALER ||
        env.KNATIVE_CAMEL;

    if (isKnative) {
        info.isKnative = true;
    }

    if (!info.isKubernetes && !info.isKnative) return null;


    /* ============================================================
       3. Knative Serving Metadata
       ============================================================ */

    info.serving = {
        service: env.K_SERVICE ?? null,
        configuration: env.K_CONFIGURATION ?? null,
        revision: env.K_REVISION ?? null,
        port: env.PORT ? Number(env.PORT) : null,
    };

    info.configuration = {
        configurationGeneration: env.K_CONFIGURATION_GENERATION ?? null,
        serviceGeneration: env.K_SERVICE_GENERATION ?? null,
    };

    info.revision = {
        revisionUrl: env.K_REVISION_URL ?? null,
        revisionId: env.K_REVISION ?? null,
        minScale: env.K_REVISION_MIN_SCALE ?? null,
        maxScale: env.K_REVISION_MAX_SCALE ?? null,
        containerConcurrency: env.K_REVISION_CONTAINER_CONCURRENCY
            ? Number(env.K_REVISION_CONTAINER_CONCURRENCY)
            : null,
    };


    /* ============================================================
       4. Autoscaling (KPA/HPA)
       ============================================================ */

    info.autoscaling = {
        class: env.KNATIVE_AUTOSCALER_CLASS ?? null, // kpa.autoscaling.knative.dev / hpa.autoscaling.knative.dev
        metric: env.KNATIVE_AUTOSCALER_METRIC ?? null,
        window: env.KNATIVE_AUTOSCALER_WINDOW ?? null,
        target: env.KNATIVE_AUTOSCALER_TARGET ?? null,
        containerConcurrency: env.CONTAINER_CONCURRENCY
            ? Number(env.CONTAINER_CONCURRENCY)
            : null,
    };


    /* ============================================================
       5. Knative Eventing (CloudEvents, Brokers, Triggers)
       ============================================================ */

    info.eventing = {
        isCloudEvent: !!env.CE_ID,
        cloudEvent: {
            id: env.CE_ID ?? null,
            type: env.CE_TYPE ?? null,
            source: env.CE_SOURCE ?? null,
            specversion: env.CE_SPECVERSION ?? null,
            subject: env.CE_SUBJECT ?? null,
            datacontenttype: env.CE_DATACONTENTTYPE ?? null,
            time: env.CE_TIME ?? null
        },
        broker: env.KNATIVE_BROKER ?? null,
        trigger: env.KNATIVE_TRIGGER ?? null
    };


    /* ============================================================
       6. OpenShift Detection & Metadata
       ============================================================ */

    const isOpenShift =
        env.OPENSHIFT_BUILD_NAME ||
        env.OPENSHIFT_BUILD_NAMESPACE ||
        env.OPENSHIFT_BUILD_REFERENCE ||
        env.OPENSHIFT_BUILD_SOURCE ||
        env.OPENSHIFT_IO ||
        env.OPENSHIFT_DEPLOYMENT_NAME;

    if (isOpenShift) info.isOpenShift = true;

    info.openshift = {
        build: {
            name: env.OPENSHIFT_BUILD_NAME ?? null,
            namespace: env.OPENSHIFT_BUILD_NAMESPACE ?? null,
            reference: env.OPENSHIFT_BUILD_REFERENCE ?? null,
            source: env.OPENSHIFT_BUILD_SOURCE ?? null,
        },
        deployment: {
            name: env.OPENSHIFT_DEPLOYMENT_NAME ?? null,
            namespace: env.OPENSHIFT_DEPLOYMENT_NAMESPACE ?? null,
            version: env.OPENSHIFT_DEPLOYMENT_VERSION ?? null
        }
    };


    /* ============================================================
       7. Mesh Networking (Istio/Kourier)
       ============================================================ */

    const meshEnv = {
        istio: env.ISTIO_VERSION || env.PILOT_CERT_PROVIDER || env.ISTIO_META_WORKLOAD_NAME,
        kourier: env.KOURIER_GATEWAY || env.KOURIER_POD_NAME,
    };

    info.mesh = {
        istio: !!meshEnv.istio,
        kourier: !!meshEnv.kourier,
        versionIstio: env.ISTIO_VERSION ?? null,
        kourierVersion: env.KOURIER_VERSION ?? null
    };


    /* ============================================================
       8. Pod Metadata (Downward API)
       ============================================================ */

    info.pod = {
        podName: env.HOSTNAME ?? null,
        namespace: env.KUBERNETES_NAMESPACE ?? env.OPENSHIFT_BUILD_NAMESPACE ?? null,
        nodeName: env.KUBE_NODE_NAME ?? null,
        podIp: env.KUBERNETES_POD_IP ?? null,
        serviceAccount: env.KUBERNETES_SERVICE_ACCOUNT ?? null,
    };


    /* ============================================================
       9. RAW: Everything Knative/OpenShift
       ============================================================ */

    info.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("K_") ||
            k.startsWith("KNATIVE") ||
            k.startsWith("OPENSHIFT") ||
            k.includes("ISTIO") ||
            k.includes("KOURIER")
        )
    );

    return info;
}

export function extractIBMCodeEngineInfo(env: Record<string, string>) {
    const info: any = {
        isCodeEngine: false,
        isKubernetes: false,
        isCEApp: false,
        isCEJob: false,
        metadata: {},
        project: {},
        runtime: {},
        autoscaling: {},
        app: {},
        job: {},
        build: {},
        pod: {},
        ibmCloud: {},
        raw: {}
    };

    /* ============================================================
       1. Kubernetes Base Detection
       ============================================================ */

    if (env.KUBERNETES_SERVICE_HOST) {
        info.isKubernetes = true;
    }

    /* ============================================================
       2. IBM Code Engine Detection (Core Signals)
       ============================================================ */

    const isCE =
        env.CE_APP ||
        env.CE_JOB ||
        env.CE_PROJECT ||
        env.CE_SUBSCRIPTION ||
        env.CE_DOMAIN ||
        env.CE_REGION ||
        env.CE_CONFIGMAP ||
        env.CE_SECRET ||
        env.CE_BUILD;

    if (!isCE) return null;

    info.isCodeEngine = true;


    /* ============================================================
       3. IBM Cloud (Global Metadata)
       ============================================================ */

    info.ibmCloud = {
        region: env.CE_REGION ?? env.REGION ?? null,
        resourceGroup: env.CE_RESOURCE_GROUP ?? null,
        projectId: env.CE_PROJECT ?? null,
        subscription: env.CE_SUBSCRIPTION ?? null,
        domain: env.CE_DOMAIN ?? null
    };


    /* ============================================================
       4. Project Metadata
       ============================================================ */

    info.project = {
        projectId: env.CE_PROJECT ?? null,
        projectName: env.CE_PROJECT_NAME ?? null,
        orgGuid: env.CE_ORG_GUID ?? null,
        spaceGuid: env.CE_SPACE_GUID ?? null
    };


    /* ============================================================
       5. Runtime Context
       ============================================================ */

    info.runtime = {
        isContainer: true, // CE always runs containers
        isKNative: env.K_SERVICE || env.K_REVISION ? true : false,
        nodeName: env.KUBE_NODE_NAME ?? null,
        containerName: env.CE_CONTAINER ?? null,
        concurrency: env.CE_CONCURRENCY ? Number(env.CE_CONCURRENCY) : null,
        timeoutSec: env.CE_TIMEOUT ? Number(env.CE_TIMEOUT) : null
    };


    /* ============================================================
       6. Code Engine App (Serverless Container) Detection
       ============================================================ */

    if (env.CE_APP || env.CE_APP_ID) {
        info.isCEApp = true;

        info.app = {
            name: env.CE_APP ?? env.CE_APP_NAME ?? null,
            id: env.CE_APP_ID ?? null,
            revision: env.CE_REVISION ?? null,
            url: env.CE_APP_URL ?? null,
            port: env.CE_PORT ? Number(env.CE_PORT) : null,
            maxScale: env.CE_MAX_SCALE ? Number(env.CE_MAX_SCALE) : null,
            minScale: env.CE_MIN_SCALE ? Number(env.CE_MIN_SCALE) : null,
            memory: env.CE_MEMORY ?? null,
            cpu: env.CE_CPU ?? null,
            instances: env.CE_INSTANCES
                ? Number(env.CE_INSTANCES)
                : null
        };
    }


    /* ============================================================
       7. Code Engine Job Detection
       ============================================================ */

    if (env.CE_JOB || env.CE_JOB_ID) {
        info.isCEJob = true;

        info.job = {
            name: env.CE_JOB ?? env.CE_JOB_NAME ?? null,
            id: env.CE_JOB_ID ?? null,
            instance: env.CE_JOB_INSTANCE ?? null,
            concurrency: env.CE_JOB_CONCURRENCY
                ? Number(env.CE_JOB_CONCURRENCY)
                : null,
            retries: env.CE_JOB_RETRIES
                ? Number(env.CE_JOB_RETRIES)
                : null,
            timeout: env.CE_JOB_TIMEOUT
                ? Number(env.CE_JOB_TIMEOUT)
                : null,
            executionId: env.CE_EXECUTION_ID ?? null,
            executionName: env.CE_EXECUTION_NAME ?? null
        };
    }


    /* ============================================================
       8. Code Engine Build Detection
       ============================================================ */

    if (env.CE_BUILD || env.CE_BUILD_ID) {
        info.build = {
            name: env.CE_BUILD ?? null,
            id: env.CE_BUILD_ID ?? null,
            source: env.CE_BUILD_SOURCE ?? null,
            strategy: env.CE_BUILD_STRATEGY ?? null,
            image: env.CE_BUILD_IMAGE ?? null
        };
    }


    /* ============================================================
       9. Autoscaling
       ============================================================ */

    info.autoscaling = {
        isKnative:
            env.KNATIVE_AUTOSCALER_CLASS ||
                env.KNATIVE_AUTOSCALER_METRIC
                ? true
                : false,

        class: env.KNATIVE_AUTOSCALER_CLASS ?? null,
        metric: env.KNATIVE_AUTOSCALER_METRIC ?? null,
        window: env.KNATIVE_AUTOSCALER_WINDOW ?? null,
        target: env.KNATIVE_AUTOSCALER_TARGET ?? null,

        ceScaling: {
            enabled: !!env.CE_AUTO_SCALE,
            autoscale: env.CE_AUTO_SCALE ?? null,
            min: env.CE_MIN_SCALE ?? null,
            max: env.CE_MAX_SCALE ?? null
        }
    };


    /* ============================================================
       10. Pod Metadata (Downward API)
       ============================================================ */

    info.pod = {
        podName: env.HOSTNAME ?? null,
        namespace: env.KUBERNETES_NAMESPACE ?? null,
        serviceAccount: env.KUBERNETES_SERVICE_ACCOUNT ?? null,
        podIp: env.KUBERNETES_POD_IP ?? null,
        nodeName: env.KUBE_NODE_NAME ?? null
    };


    /* ============================================================
       11. Raw Environment Vars
       ============================================================ */

    info.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("CE_") ||
            k.startsWith("KNATIVE") ||
            k.startsWith("K_") ||
            k.startsWith("KUBERNETES") ||
            k.startsWith("OPENSHIFT")
        )
    );

    return info;
}

export function extractOracleCloudInfo(env: Record<string, string>) {
    const info: any = {
        isOracle: false,
        isOCIFunction: false,
        isOCIContainer: false,
        isOCICompute: false,
        isOKE: false,
        functions: {},
        container: {},
        compute: {},
        oke: {},
        metadata: {},
        auth: {},
        triggers: {},
        runtime: {},
        raw: {}
    };

    /* ============================================================
       1. OCI Function Detection (Fn Project-based)
       ============================================================ */

    const isFn =
        env.FN_APP_ID ||
        env.FN_FN_ID ||
        env.FN_FORMAT ||
        env.FN_LISTENER ||
        env.FN_MEMORY ||
        env.FN_TYPE ||
        env.FN_CPUS ||
        env.FN_ID;

    if (isFn) {
        info.isOCIFunction = true;
        info.isOracle = true;
    }

    /* ============================================================
       2. OCI Container Instance Detection
       ============================================================ */

    const isContainerInstance =
        env.OCI_CONTAINER_ID ||
        env.OCI_CONTAINER_INSTANCE_ID ||
        env.OCI_CI_ID ||
        env.OCI_CI_IMAGE ||
        env.OCI_CI_SHAPE;

    if (isContainerInstance) {
        info.isOCIContainer = true;
        info.isOracle = true;
    }

    /* ============================================================
       3. OCI Compute (VM) Detection via OCI metadata
       ============================================================ */

    const isOCICompute =
        env.OCI_INSTANCE_ID ||
        env.OCI_TENANCY_OCID ||
        env.OCI_COMPARTMENT_ID ||
        env.OCI_REGION ||
        env.OCI_SHAPE;

    if (isOCICompute) {
        info.isOCICompute = true;
        info.isOracle = true;
    }

    /* ============================================================
       4. Oracle Kubernetes Engine (OKE)
       ============================================================ */

    if (env.OKE_CLUSTER_ID || env.KUBERNETES_SERVICE_HOST) {
        info.isOKE = true;
        info.isOracle = true;
    }

    if (!info.isOracle) return null;


    /* ============================================================
       5. OCI Function Metadata
       ============================================================ */

    if (info.isOCIFunction) {
        info.functions = {
            fnId: env.FN_FN_ID ?? null,
            appId: env.FN_APP_ID ?? null,
            memory: env.FN_MEMORY ? Number(env.FN_MEMORY) : null,
            cpus: env.FN_CPUS ? Number(env.FN_CPUS) : null,
            format: env.FN_FORMAT ?? null,
            listener: env.FN_LISTENER ?? null,
            type: env.FN_TYPE ?? null,
            requestUrl: env.FN_REQUEST_URL ?? null,
            callId: env.FN_CALL_ID ?? null,
        };
    }


    /* ============================================================
       6. OCI Container Instance Metadata
       ============================================================ */

    if (info.isOCIContainer) {
        info.container = {
            containerId: env.OCI_CONTAINER_ID ?? null,
            instanceId: env.OCI_CONTAINER_INSTANCE_ID ?? env.OCI_CI_ID ?? null,
            region: env.OCI_REGION ?? null,
            shape: env.OCI_CI_SHAPE ?? null,
            image: env.OCI_CI_IMAGE ?? null,
            restartPolicy: env.OCI_CI_RESTART ?? null,
            compartment: env.OCI_COMPARTMENT_ID ?? null
        };
    }


    /* ============================================================
       7. OCI Compute Metadata
       ============================================================ */

    info.compute = {
        instanceId: env.OCI_INSTANCE_ID ?? null,
        region: env.OCI_REGION ?? null,
        availabilityDomain: env.OCI_AVAILABILITY_DOMAIN ?? null,
        faultDomain: env.OCI_FAULT_DOMAIN ?? null,
        shape: env.OCI_SHAPE ?? null,
        ocpus: env.OCI_OCPUS ? Number(env.OCI_OCPUS) : null,
        memoryMb: env.OCI_MEMORY_MB ? Number(env.OCI_MEMORY_MB) : null,
        compartmentId: env.OCI_COMPARTMENT_ID ?? null,
        tenancyOcid: env.OCI_TENANCY_OCID ?? null
    };


    /* ============================================================
       8. OKE (Oracle Kubernetes Engine)
       ============================================================ */

    info.oke = {
        clusterId: env.OKE_CLUSTER_ID ?? null,
        nodePoolId: env.OKE_NODE_POOL_ID ?? null,
        nodeName: env.KUBE_NODE_NAME ?? null,
        namespace: env.KUBERNETES_NAMESPACE ?? null,
        podName: env.HOSTNAME ?? null,
        podIp: env.KUBERNETES_POD_IP ?? null
    };


    /* ============================================================
       9. Oracle Metadata Service / Instance Metadata
       ============================================================ */

    info.metadata = {
        iamRole: env.OCI_IAM_ROLE ?? null,
        region: env.OCI_REGION ?? null,
        project: env.OCI_PROJECT_ID ?? null,
        configFile: env.OCI_CONFIG_FILE ?? null,
        cloudShell: env.OCI_CLOUD_SHELL ?? null,
        authType: env.OCI_AUTH_TYPE ?? null,
    };


    /* ============================================================
       10. Auth & Resource Principals
       ============================================================ */

    info.auth = {
        resourcePrincipal: !!env.OCI_RESOURCE_PRINCIPAL_VERSION,
        rpVersion: env.OCI_RESOURCE_PRINCIPAL_VERSION ?? null,
        tokens: {
            privateKey: !!env.OCI_RESOURCE_PRINCIPAL_PRIVATE_PEM,
            token: !!env.OCI_RESOURCE_PRINCIPAL_RPST,
            sessionToken: !!env.OCI_RESOURCE_PRINCIPAL_SESSION_TOKEN
        }
    };


    /* ============================================================
       11. Trigger Detection (Events/Streaming/Objects)
       ============================================================ */

    info.triggers = {
        objectStorage: !!env.OCI_OBJECT_EVENT_TYPE,
        streaming: !!env.OCI_STREAM_EVENT,
        apiGateway: !!env.OCI_API_GATEWAY_ID,
        scheduled: !!env.OCI_CRON_SCHEDULE,
        eventMesh: !!env.OCI_EVENT_MESH,
        raw: {
            objectEventType: env.OCI_OBJECT_EVENT_TYPE ?? null,
            streamEvent: env.OCI_STREAM_EVENT ?? null,
            apiGateway: env.OCI_API_GATEWAY_ID ?? null,
            cron: env.OCI_CRON_SCHEDULE ?? null,
            eventMesh: env.OCI_EVENT_MESH ?? null
        }
    };


    /* ============================================================
       12. Runtime Features
       ============================================================ */

    info.runtime = {
        hasFileSystem: !!env.OCI_FS,
        hasNetwork: !!env.OCI_NET,
        timeoutSec: env.OCI_TIMEOUT ? Number(env.OCI_TIMEOUT) : null,
        concurrency: env.OCI_CONCURRENCY ? Number(env.OCI_CONCURRENCY) : null,
        signature: env.OCI_RUNTIME_SIGNATURE ?? null
    };


    /* ============================================================
       13. RAW Variables (Anything OCI-related)
       ============================================================ */

    info.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("OCI_") ||
            k.startsWith("FN_") ||
            k.startsWith("OKE_")
        )
    );

    return info;
}

export function extractDigitalOceanInfo(env: Record<string, string>) {
    const info: any = {
        isDigitalOcean: false,
        appPlatform: null,
        functions: null,
        droplet: null,
        doks: null,
        metadata: {},
        triggers: {},
        registry: {},
        raw: {},
    };

    /* ============================================================
       1: DigitalOcean App Platform (Detected by build & runtime vars)
       ============================================================ */
    const isAppPlatform =
        env.DYNO ??
        env.DO_APP_ID ||
        env.DO_DEPLOYMENT_ID ||
        env.DO_SERVICE_TYPE ||
        env.DO_RUNTIME_VERSION ||
        env.DO_BUILD_ID ||
        env.DO_METADATA_PATH ||
        env.PORT; // App Platform assigns PORT always

    if (isAppPlatform) {
        info.isDigitalOcean = true;
        info.appPlatform = {
            appId: env.DO_APP_ID ?? null,
            deployId: env.DO_DEPLOYMENT_ID ?? null,
            serviceName: env.DO_SERVICE_NAME ?? null,
            serviceId: env.DO_SERVICE_ID ?? null,
            serviceType: env.DO_SERVICE_TYPE ?? null,     // web / worker / function proxy
            region: env.DO_REGION ?? null,
            commit: env.COMMIT_SHA ?? env.GIT_SHA ?? null,
            repo: env.REPO_NAME ?? null,
            branch: env.BRANCH ?? null,
            buildId: env.DO_BUILD_ID ?? null,
            buildConfigPath: env.DO_BUILD_CONFIG ?? null,
            port: env.PORT ? Number(env.PORT) : null,
            scale: {
                size: env.DO_SERVICE_SIZE ?? null,
                count: env.DO_SERVICE_INSTANCE_COUNT
                    ? Number(env.DO_SERVICE_INSTANCE_COUNT)
                    : null,
            },
        };
    }


    /* ============================================================
       2: DigitalOcean Functions (OpenWhisk / DO Functions)
       ============================================================ */
    const isDOFunction =
        env.__OW_ACTION_NAME ||
        env.__OW_ACTIVATION_ID ||
        env.__OW_NAMESPACE ||
        env.__OW_API_HOST ||
        env.__OW_API_KEY ||
        env.__OW_DEADLINE;

    if (isDOFunction) {
        info.isDigitalOcean = true;
        info.functions = {
            actionName: env.__OW_ACTION_NAME ?? null,
            namespace: env.__OW_NAMESPACE ?? null,
            activationId: env.__OW_ACTIVATION_ID ?? null,
            apiHost: env.__OW_API_HOST ?? null,
            deadlineMs: env.__OW_DEADLINE ? Number(env.__OW_DEADLINE) : null,
            apiKeyPresent: !!env.__OW_API_KEY
        };
    }


    /* ============================================================
       3: DigitalOcean Droplet (VM via metadata hints)
       ============================================================ */
    const isDroplet =
        env.DO_DROPLET_ID ||
        env.DIGITALOCEAN ||
        env.DROPLET_ID ||
        env.DROPLET_REGION ||
        env.DROPLET_NAME;

    if (isDroplet) {
        info.isDigitalOcean = true;
        info.droplet = {
            dropletId: env.DO_DROPLET_ID ?? env.DROPLET_ID ?? null,
            name: env.DROPLET_NAME ?? null,
            region: env.DROPLET_REGION ?? null,
            size: env.DROPLET_SIZE ?? null,
            ipv4: env.DROPLET_IPv4 ?? null,
            ipv6: env.DROPLET_IPv6 ?? null
        };
    }


    /* ============================================================
       4: DigitalOcean Kubernetes (DOKS)
       ============================================================ */
    const isDOKS =
        env.KUBERNETES_SERVICE_HOST &&
        (env.DOKS_CLUSTER_ID || env.DOKS_NODE_ID || env.DOKS_CLUSTER_NAME);

    if (isDOKS) {
        info.isDigitalOcean = true;
        info.doks = {
            clusterId: env.DOKS_CLUSTER_ID ?? null,
            clusterName: env.DOKS_CLUSTER_NAME ?? null,
            nodeId: env.DOKS_NODE_ID ?? null,
            nodeName: env.KUBE_NODE_NAME ?? null,
            namespace: env.KUBERNETES_NAMESPACE ?? null,
            podName: env.HOSTNAME ?? null,
            serviceHost: env.KUBERNETES_SERVICE_HOST ?? null,
        };
    }


    /* ============================================================
       5: Metadata Service (DigitalOcean IMDS)
          DO exposes metadata at:
          http://169.254.169.254/metadata/v1/
       ============================================================ */
    info.metadata = {
        metadataUrl: "http://169.254.169.254/metadata/v1/",
        hintIMDS: !!(
            env.DO_DROPLET_ID ||
            env.DROPLET_ID ||
            env.DROPLET_NAME
        ),
        region: env.DO_REGION ?? env.DROPLET_REGION ?? null,
        project: env.DO_PROJECT_ID ?? null,
    };


    /* ============================================================
       6: Trigger Detection
       ============================================================ */
    info.triggers = {
        scheduler: env.DO_CRON_SCHEDULE ?? null,
        repoDeploy: env.DO_REPO_DEPLOY ?? null
    };


    /* ============================================================
       7: DigitalOcean Container Registry (DOR)
       ============================================================ */
    info.registry = {
        registry: env.DO_REGISTRY ?? null,
        image: env.DO_IMAGE ?? null,
        tag: env.DO_IMAGE_TAG ?? null
    };


    /* ============================================================
       8: Raw (capture all DO*)
       ============================================================ */
    info.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("DO_") ||
            k.startsWith("DROPLET_") ||
            k.startsWith("DOKS_") ||
            k.startsWith("__OW_")
        )
    );

    return info.isDigitalOcean ? info : null;
}

/* ============================================================
   HEROKU – FULL RUNTIME / DYNO / RELEASE / PIPELINE DETECTOR
============================================================ */
export function extractHerokuInfo(env: Record<string, string>) {
    const herokuSignals = [
        "DYNO",
        "HEROKU_APP_ID",
        "HEROKU_RELEASE_VERSION",
        "HEROKU_RELEASE_CREATED_AT",
        "HEROKU_SLUG_COMMIT",
        "HEROKU_SLUG_DESCRIPTION",
        "HEROKU_APP_NAME",
        "HEROKU_DYNO_ID",
        "HEROKU_LOGPLEX_URL",
        "HEROKU_POSTGRESQL",
        "HEROKU_TELEMETRY",
        "HEROKU_NUMBER",
        "HEROKU_DYNO_STARTED_AT",
        "HEROKU_REGION",
        "HEROKU_STACK",
        "HEROKU_SLUG",
        "HEROKU_ADDONS",
        "HEROKU_APP_DIR",
        "HEROKU_APP_USER",
        "HEROKU_RUNTIME_URL"
    ];

    const isHeroku = herokuSignals.some(sig => env[sig] !== undefined);

    if (!isHeroku) return null;

    const info: any = {
        isHeroku: true,
        dyno: {},
        release: {},
        slug: {},
        routing: {},
        metadata: {},
        addons: {},
        build: {},
        telemetry: {},
        postgres: {},
        raw: {}
    };

    /* ------------------------------------------------------------
       1: DYNO INFO
       ------------------------------------------------------------ */
    info.dyno = {
        dynoName: env.DYNO ?? null,            // e.g. "web.1"
        dynoId: env.HEROKU_DYNO_ID ?? null,    // UUID
        dynoNumber: env.HEROKU_NUMBER ?? null, // Dyno index
        startedAt: env.HEROKU_DYNO_STARTED_AT ?? null,
        dynoSize: env.HEROKU_SIZE ?? null,
        processType: env.DYNO?.split(".")[0] ?? null, // "web", "worker", etc.
        instance: env.DYNO?.split(".")[1] ?? null,
        region: env.HEROKU_REGION ?? null,
        stack: env.HEROKU_STACK ?? null,
        appDir: env.HEROKU_APP_DIR ?? null,
        user: env.HEROKU_APP_USER ?? null,
    };

    /* ------------------------------------------------------------
       2: RELEASE INFO
       ------------------------------------------------------------ */
    info.release = {
        version: env.HEROKU_RELEASE_VERSION ?? null,
        createdAt: env.HEROKU_RELEASE_CREATED_AT ?? null,
        releaseCommand: env.HEROKU_RELEASE_COMMAND ?? null,
        appName: env.HEROKU_APP_NAME ?? null,
        appId: env.HEROKU_APP_ID ?? null,
        runtimeUrl: env.HEROKU_RUNTIME_URL ?? null,
    };

    /* ------------------------------------------------------------
       3: SLUG INFO
       ------------------------------------------------------------ */
    info.slug = {
        commit: env.HEROKU_SLUG_COMMIT ?? null,
        description: env.HEROKU_SLUG_DESCRIPTION ?? null,
        slugId: env.HEROKU_SLUG ?? null,
        buildpack: env.HEROKU_BUILDPACK_ENV ?? null,
        pythonpath: env.PYTHONPATH ?? null,
        nodeOptions: env.NODE_OPTIONS ?? null,
    };

    /* ------------------------------------------------------------
       4: ROUTING / ROUTER INFO
       ------------------------------------------------------------ */
    info.routing = {
        dynoRegion: env.HEROKU_REGION ?? null,
        port: env.PORT ? Number(env.PORT) : null,
        routerId: env.HEROKU_ROUTER_ID ?? null,
        routerEndpoint: env.HEROKU_ROUTER_ENDPOINT ?? null,
        dynoHost: env.HOSTNAME ?? null,
        ipv6Enabled:
            env.HEROKU_IPV6 === "1" || env.HEROKU_IPV6_ENABLED === "true"
                ? true
                : false,
    };

    /* ------------------------------------------------------------
       5: METADATA (Heroku internal)
       ------------------------------------------------------------ */
    info.metadata = {
        telemetry: env.HEROKU_TELEMETRY ?? null,
        shellEnv: env.HEROKU_SHELL_ENV ?? null,
        container: env.HEROKU_CONTAINER_METADATA ?? null,
        imageId: env.HEROKU_IMAGE_ID ?? null,
        buildId: env.HEROKU_BUILD_ID ?? null,
    };

    /* ------------------------------------------------------------
       6: ADDONS (Postgres, Redis, Kafka, etc.)
       ------------------------------------------------------------ */
    info.addons = {
        list: env.HEROKU_ADDONS ? env.HEROKU_ADDONS.split(",") : [],
        redis: env.HEROKU_REDIS_URL ?? null,
        redisGreen: env.HEROKU_REDIS_GREEN_URL ?? null,
        redisOrange: env.HEROKU_REDIS_ORANGE_URL ?? null,
        postgresDefault: env.DATABASE_URL ?? null,
        postgresConfigs: Object.fromEntries(
            Object.entries(env)
                .filter(([k]) => k.startsWith("HEROKU_POSTGRESQL"))
        )
    };

    /* ------------------------------------------------------------
       7: POSTGRES INFO
       ------------------------------------------------------------ */
    info.postgres = {
        primary: env.DATABASE_URL ?? null,
        vars: Object.fromEntries(
            Object.entries(env).filter(([k]) =>
                k.startsWith("HEROKU_POSTGRESQL")
            )
        )
    };

    /* ------------------------------------------------------------
       8: TELEMETRY (LogPlex + internal)
       ------------------------------------------------------------ */
    info.telemetry = {
        logplexUrl: env.HEROKU_LOGPLEX_URL ?? null,
        logSession: env.HEROKU_LOG_SESSION_ID ?? null,
        logToken: env.HEROKU_LOG_TOKEN ?? null,
    };

    /* ------------------------------------------------------------
       9: RAW DOUMP — All HEROKU_* and related vars
       ------------------------------------------------------------ */
    info.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("HEROKU_") ||
            k === "DYNO" ||
            k === "PORT"
        )
    );

    return info;
}

/* ============================================================
   FIREBASE – Hosting + Cloud Functions Gen1 + Gen2 + Emulator
============================================================ */
export function extractFirebaseInfo(env: Record<string, string>) {
    const out: any = {
        isFirebase: false,
        functions: null,
        hosting: null,
        emulator: null,
        gen1: null,
        gen2: null,
        project: null,
        gcp: null,
        raw: {}
    };

    /* ============================================================
       1: Detect Firebase Emulator Suite
       ------------------------------------------------------------
       Firebase emulators ALWAYS expose these:
       - FIREBASE_EMULATOR_HUB
       - FIREBASE_AUTH_EMULATOR_HOST
       - FIRESTORE_EMULATOR_HOST
       - FUNCTIONS_EMULATOR
       ============================================================ */

    const isEmulator =
        env.FIREBASE_EMULATOR_HUB ||
        env.FIREBASE_AUTH_EMULATOR_HOST ||
        env.FIRESTORE_EMULATOR_HOST ||
        env.FIREBASE_DATABASE_EMULATOR_HOST ||
        env.STORAGE_EMULATOR_HOST ||
        env.FUNCTIONS_EMULATOR === "true";

    if (isEmulator) {
        out.isFirebase = true;
        out.emulator = {
            hub: env.FIREBASE_EMULATOR_HUB ?? null,
            auth: env.FIREBASE_AUTH_EMULATOR_HOST ?? null,
            firestore: env.FIRESTORE_EMULATOR_HOST ?? null,
            database: env.FIREBASE_DATABASE_EMULATOR_HOST ?? null,
            storage: env.STORAGE_EMULATOR_HOST ?? null,
            functions: env.FUNCTIONS_EMULATOR === "true",
            ui: env.FIREBASE_EMULATOR_UI ?? null,
        };
    }

    /* ============================================================
       2: Detect Firebase Hosting (Production or Preview)
       ------------------------------------------------------------
       Firebase Hosting sets:
       - FIREBASE_CONFIG
       - GCLOUD_PROJECT
       - FIREBASE_DATABASE_URL
       ============================================================ */

    const isHosting =
        env.FIREBASE_CONFIG ||
        env.FIREBASE_APP_CHECK_DEBUG_TOKEN ||
        env.FIREBASE_DATABASE_URL ||
        env.GCLOUD_PROJECT?.includes("firebaseapp.com");

    if (isHosting) {
        out.isFirebase = true;

        let parsedConfig = null;
        if (env.FIREBASE_CONFIG) {
            try {
                parsedConfig = JSON.parse(env.FIREBASE_CONFIG);
            } catch {
                parsedConfig = env.FIREBASE_CONFIG;
            }
        }

        out.hosting = {
            firebaseConfig: parsedConfig,
            databaseURL: env.FIREBASE_DATABASE_URL ?? null,
            projectId: env.GCLOUD_PROJECT ?? null,
            appId: parsedConfig?.appId ?? null,
            apiKey: parsedConfig?.apiKey ?? null,
            storageBucket: parsedConfig?.storageBucket ?? null,
            measurementId: parsedConfig?.measurementId ?? null,
            hostingChannel: env.FIREBASE_DEPLOY_TARGET ?? null, // preview channels
        };
    }

    /* ============================================================
       3: Cloud Functions (GEN 1)
       ------------------------------------------------------------
       Functions Gen1 exposes:
       - FUNCTION_TARGET
       - FUNCTION_SIGNATURE_TYPE
       - FUNCTION_REGION
       - FIREBASE_CONFIG
       ============================================================ */

    const isGen1 =
        env.FUNCTION_TARGET &&
        env.FUNCTION_SIGNATURE_TYPE &&
        !env.K_SERVICE; // Gen2 uses Cloud Run env vars

    if (isGen1) {
        out.isFirebase = true;
        out.gen1 = {
            functionTarget: env.FUNCTION_TARGET,
            signatureType: env.FUNCTION_SIGNATURE_TYPE,
            region: env.FUNCTION_REGION ?? null,
            serviceAccount: env.FUNCTION_IDENTITY ?? null,
        };
    }

    /* ============================================================
       4: Cloud Functions (GEN 2 – Cloud Run–based)
       ------------------------------------------------------------
       Gen2 exposes GCP/Cloud Run vars:
       - K_SERVICE
       - K_REVISION
       - K_CONFIGURATION
       - GCLOUD_PROJECT or GOOGLE_CLOUD_PROJECT
       - FIREBASE_CONFIG also present
       ============================================================ */

    const isGen2 = env.K_SERVICE || env.K_REVISION;

    if (isGen2) {
        out.isFirebase = true;
        out.gen2 = {
            service: env.K_SERVICE ?? null,
            revision: env.K_REVISION ?? null,
            configuration: env.K_CONFIGURATION ?? null,
            port: env.PORT ? Number(env.PORT) : null,
            region: env.X_GOOGLE_FUNCTION_REGION ?? null, // Only Gen2
            taskExecution: env.KF_TASK_EXECUTION ?? null,
            memoryLimit: env.FUNCTION_MEMORY_MB ?? null,
            timeoutSeconds: env.FUNCTION_TIMEOUT_SEC ?? null,
        };
    }

    /* ============================================================
       5: Combined Cloud Functions Info (Gen1 + Gen2)
       ============================================================ */

    const isFunctions = isGen1 || isGen2 || env.FUNCTION_TARGET;

    if (isFunctions) {
        out.isFirebase = true;
        out.functions = {
            projectId:
                env.GOOGLE_CLOUD_PROJECT ??
                env.GCLOUD_PROJECT ??
                out.hosting?.projectId ??
                null,

            region:
                env.FUNCTION_REGION ??
                env.X_GOOGLE_FUNCTION_REGION ??
                null,

            functionTarget: env.FUNCTION_TARGET ?? null,
            signatureType: env.FUNCTION_SIGNATURE_TYPE ?? null,

            runtime: env.FUNCTIONS_NODE_VERSION ?? null,
            memory: env.FUNCTION_MEMORY_MB ?? null,
            timeout: env.FUNCTION_TIMEOUT_SEC ?? null,
            serviceAccount: env.FUNCTION_IDENTITY ?? null,
        };
    }

    /* ============================================================
       6: Firebase Project Metadata (universal)
       ============================================================ */

    out.project = {
        projectId:
            env.GOOGLE_CLOUD_PROJECT ??
            env.GCLOUD_PROJECT ??
            out.hosting?.projectId ??
            null,
        emulator: isEmulator,
        isProd: env.FUNCTION_SIGNATURE_TYPE === "http" && !isEmulator,
    };

    /* ============================================================
       7: Underlying GCP Metadata (Cloud Run)
       ============================================================ */

    out.gcp = {
        kService: env.K_SERVICE ?? null,
        kRevision: env.K_REVISION ?? null,
        region: env.GCP_REGION ?? env.FUNCTION_REGION ?? null,
        projectId:
            env.GOOGLE_CLOUD_PROJECT ??
            env.GCLOUD_PROJECT ??
            null,
    };

    /* ============================================================
       8: RAW DUMP (All Firebase-related vars)
       ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("FIREBASE") ||
            k.startsWith("FUNCTION_") ||
            k.startsWith("GCLOUD") ||
            k.startsWith("GOOGLE_CLOUD") ||
            k.startsWith("K_") // Cloud Run (Gen2)
        )
    );

    return out.isFirebase ? out : null;
}

/* ============================================================
   CLOUDFLARE PAGES (NODE + EDGE) - FULL RUNTIME DETECTOR
============================================================ */

export function extractCloudflarePagesInfo(env: Record<string, string>) {
    const out: any = {
        isCloudflarePages: false,
        mode: null,
        nodeRuntime: null,
        edgeRuntime: null,
        pagesMetadata: null,
        workersMetadata: null,
        dev: null,
        assets: null,
        durableObjects: null,
        d1: null,
        kv: null,
        queues: null,
        r2: null,
        colo: null,
        raw: {}
    };


    /* ============================================================
       1: Does this look like Cloudflare Pages at all?
       ============================================================ */

    const pagesSignals = [
        "CF_PAGES",
        "CF_PAGES_BRANCH",
        "CF_PAGES_COMMIT_SHA",
        "CF_PAGES_URL",
        "CF_PAGES_WORKER",
        "CF_BUNDLE",
        "CF_PAGES_BUILD_ID",
    ];

    const isPages = pagesSignals.some(s => env[s] !== undefined) ||
        typeof (globalThis as any)?.__STATIC_CONTENT !== "undefined" ||
        typeof (globalThis as any)?.caches !== "undefined"; // edge caching env

    if (!isPages) return null;

    out.isCloudflarePages = true;


    /* ============================================================
       2: PAGES METADATA (header-level knowledge)
       ============================================================ */

    out.pagesMetadata = {
        branch: env.CF_PAGES_BRANCH ?? null,
        commitSHA: env.CF_PAGES_COMMIT_SHA ?? null,
        commitMessage: env.CF_PAGES_COMMIT_MESSAGE ?? null,
        projectName: env.CF_PAGES_PROJECT_NAME ?? null,
        url: env.CF_PAGES_URL ?? null,
        buildId: env.CF_PAGES_BUILD_ID ?? null,
        buildCommand: env.CF_PAGES_BUILD_COMMAND ?? null,
        owner: env.CF_PAGES_ACCOUNT_ID ?? env.CF_ACCOUNT_ID ?? null,
    };


    /* ============================================================
       3: DEV MODE (wrangler dev , miniflare)
       ============================================================ */

    const isWranglerDev = env.WRANGLER_DEV === "1" || env.LOCAL_DEV === "1";
    const isMiniflare = env.MINIFLARE === "1" || env.MINIFLARE === "true";

    out.dev = {
        wrangler: isWranglerDev,
        miniflare: isMiniflare,
        local: isWranglerDev || isMiniflare,
        localPort: env.CF_PAGES_PORT ?? null,
    };


    /* ============================================================
       4: EDGE RUNTIME (real deploy)
          Cloudflare Edge exposes:
           - globalThis.WebSocketPair
           - globalThis.caches
           - globalThis.Headers
       ============================================================ */

    const isEdge =
        typeof (globalThis as any).WebSocketPair !== "undefined" &&
        typeof (globalThis as any).caches !== "undefined";

    if (isEdge) {
        out.mode = "edge";
        out.edgeRuntime = {
            websocketPair: true,
            hasCachesAPI: true,
            hasAI: typeof (globalThis as any).Ai !== "undefined",
            hasHTMLRewriter: typeof (globalThis as any).HTMLRewriter !== "undefined",
            fastlyCompat: typeof (globalThis as any).Fastly !== "undefined",
        };
    }


    /* ============================================================
       5: NODE RUNTIME (Pages Functions in node18 mode)
       ------------------------------------------------------------
       Cloudflare Pages Node runtime exposes:
        - process.versions.node (>=16)
        - no WebSocketPair/caches initially
       ============================================================ */

    const isNodeRuntime =
        typeof process !== "undefined" &&
        typeof process.versions?.node !== "undefined" &&
        !isEdge;

    if (isNodeRuntime) {
        out.mode = "node";
        out.nodeRuntime = {
            nodeVersion: process.versions.node,
            platform: process.platform,
            arch: process.arch,
            isPagesNode: !!env.CF_PAGES_WORKER,
        };
    }


    /* ============================================================
       6: WORKERS METADATA (cloudflare worker behind pages)
       ============================================================ */
    out.workersMetadata = {
        workerName: env.CF_PAGES_WORKER ?? null,
        bundle: env.CF_BUNDLE ?? null,
        workerBase: env.CF_WORKER_BASE ?? null,
    };


    /* ============================================================
       7: ASSETS (static file injection via __STATIC_CONTENT)
       ============================================================ */

    out.assets = {
        hasStaticContentBinding:
            typeof (globalThis as any).__STATIC_CONTENT !== "undefined",
        hasStaticManifest:
            typeof (globalThis as any).__STATIC_CONTENT_MANIFEST !== "undefined",
        bundleId: env.CF_BUNDLE ?? null,
    };


    /* ============================================================
       8: Durable Objects, D1, KV, Queues, R2 detection
       ============================================================ */

    // Durable Objects
    try {
        if ("DurableObjectNamespace" in globalThis) {
            out.durableObjects = { supported: true };
        }
    } catch { }

    // D1 binding
    if (env.D1 || env.DB || env.DB_NAME) {
        out.d1 = {
            present: true,
            binding: env.DB ?? env.D1 ?? null,
            name: env.DB_NAME ?? null,
        };
    }

    // KV namespaces
    const kvVars = Object.entries(env).filter(([k]) =>
        k.endsWith("_KV") || k.includes("KV_NAMESPACE")
    );
    if (kvVars.length > 0) {
        out.kv = {
            namespaces: kvVars.map(([k, v]) => ({ key: k, value: v })),
        };
    }

    // Queues
    if (env.CF_QUEUE || env.QUEUE || env.QUEUE_NAME) {
        out.queues = {
            name: env.CF_QUEUE ?? env.QUEUE_NAME ?? null,
        };
    }

    // R2
    const r2Vars = Object.entries(env).filter(([k]) =>
        k.includes("R2") || k.includes("_BUCKET")
    );
    if (r2Vars.length > 0) {
        out.r2 = {
            buckets: r2Vars.map(([k, v]) => ({ key: k, value: v })),
        };
    }


    /* ============================================================
       9: Colo / Region detection
       ------------------------------------------------------------
       Cloudflare sets:
         CF_REGION
         CF_COL0_ID
         HTTP_CF_IPCOUNTRY
       ============================================================ */

    out.colo = {
        region: env.CF_REGION ?? null,
        colo: env.CF_COL0_ID ?? null,
        country: env.HTTP_CF_IPCOUNTRY ?? null,
        city: env.HTTP_CF_CITY ?? null,
        timezone: env.HTTP_CF_TIMEZONE ?? null,
    };


    /* ============================================================
       10: RAW listing
       ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("CF_") ||
            k.startsWith("CLOUDFLARE") ||
            k.startsWith("D1") ||
            k.includes("_KV") ||
            k.includes("R2") ||
            k.includes("QUEUE") ||
            k.includes("PAGES")
        )
    );

    return out;
}

/* ============================================================
   SUPABASE EDGE FUNCTIONS (DENO RUNTIME) - FULL DETECTOR
============================================================ */

export function extractSupabaseEdgeInfo(env: Record<string, string>) {
    const out: any = {
        isSupabase: false,
        environment: null,
        project: null,
        function: null,
        runtime: null,
        platform: null,
        localDev: null,
        deno: null,
        raw: {}
    };


    /* ------------------------------------------------------------
       1: Supabase Signals (ALL known variables)
       ------------------------------------------------------------ */

    const supabaseVars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_ANON_KEY",
        "SUPABASE_DB_URL",
        "SUPABASE_PROJECT_REF",
        "SUPABASE_FUNCTION_SIGNATURE",
        "SUPABASE_AUTH_EXTERNAL_GITHUB_ENABLED",
        "SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED",
        "SUPABASE_INTERNAL_URL",
        "SUPABASE_INTERNAL_KEYS",
        "SUPABASE_CONFIGURATION_ID",
        "SUPABASE_REGION",
        "SUPABASE_API_URL",
        "EDGE_FUNCTIONS",
        "EDGE_CONFIG",
        "EDGE_PORT"
    ];

    const isSupabase = supabaseVars.some(k => env[k] !== undefined);

    if (!isSupabase) return null;

    out.isSupabase = true;


    /* ------------------------------------------------------------
       2: Supabase Project Metadata
       ------------------------------------------------------------ */

    out.project = {
        projectRef: env.SUPABASE_PROJECT_REF ?? null,
        region: env.SUPABASE_REGION ?? null,
        url: env.SUPABASE_URL ?? env.SUPABASE_INTERNAL_URL ?? null,
        apiUrl: env.SUPABASE_API_URL ?? null,
        dbURL: env.SUPABASE_DB_URL ?? null,
        configId: env.SUPABASE_CONFIGURATION_ID ?? null,
        internalKeys: env.SUPABASE_INTERNAL_KEYS ?? null,
        envLoaded: !!env.SUPABASE_URL
    };


    /* ------------------------------------------------------------
       3: Supabase Auth Keys
       ------------------------------------------------------------ */

    out.environment = {
        anonKeyPresent: !!env.SUPABASE_ANON_KEY,
        serviceRolePresent: !!env.SUPABASE_SERVICE_ROLE_KEY,
        anonKeyPreview: env.SUPABASE_ANON_KEY?.slice(0, 8) ?? null,
        serviceRolePreview: env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 8) ?? null
    };


    /* ------------------------------------------------------------
       4: Supabase Functions
       ------------------------------------------------------------ */

    out.function = {
        signature: env.SUPABASE_FUNCTION_SIGNATURE ?? null,
        id: env.SUPABASE_FUNCTION_ID ?? null,
        invocationId: env.SUPABASE_FUNCTION_INVOCATION_ID ?? null,
        region: env.SUPABASE_REGION ?? null,
        internalURL: env.SUPABASE_INTERNAL_URL ?? null,
        signatureType:
            env.SUPABASE_FUNCTION_SIGNATURE_ORIGIN ??
            env.SUPABASE_FUNCTION_SIGNATURE ?? null,
        runtimeConfig: env.EDGE_CONFIG ?? null
    };


    /* ------------------------------------------------------------
       5: LOCAL DEV (supabase functions serve)
       ------------------------------------------------------------ */

    const isLocalCLI =
        env.SUPABASE_URL?.includes("localhost") ||
        env.EDGE_PORT ||
        env.SUPABASE_LOCAL_DEV === "1" ||
        env.SUPABASE_LOCAL_DEV === "true";

    if (isLocalCLI) {
        out.localDev = {
            isLocal: true,
            edgePort: env.EDGE_PORT ? Number(env.EDGE_PORT) : null,
            cli: env.SUPABASE_LOCAL_DEV === "1" || env.SUPABASE_LOCAL_DEV === "true",
            serviceRolePresent: !!env.SUPABASE_SERVICE_ROLE_KEY
        };
    }


    /* ------------------------------------------------------------
       6: Deno Runtime Info (Supabase Functions run in Deno)
       ------------------------------------------------------------ */

    const isDeno = typeof (globalThis as any).Deno !== "undefined";
    if (isDeno) {
        const D = (globalThis as any).Deno;
        out.deno = {
            version: D.version ?? null,
            runtime: "deno",
            permissions:
            {
                env: D.permissions.querySync({ name: "env" })?.state ?? null,
                net: D.permissions.querySync({ name: "net" })?.state ?? null,
                read: D.permissions.querySync({ name: "read" })?.state ?? null,
                write: D.permissions.querySync({ name: "write" })?.state ?? null
            },
            features: {
                hasFfi: typeof D.dlopen === "function",
                hasServe: typeof D.serve === "function",
                hasReload: typeof D.reload === "function",
            }
        };
    }


    /* ------------------------------------------------------------
       7: Platform Info (Supabase → Deno Deploy / custom isolate)
       ------------------------------------------------------------ */

    out.platform = {
        edgeRuntime:
            typeof (globalThis as any).EdgeRuntime !== "undefined" ||
            typeof (globalThis as any).WebSocketPair !== "undefined",
        runsInIsolate: typeof (globalThis as any).navigator === "undefined", // true for Supabase isolate
        possibleDenoDeploy:
            typeof (globalThis as any).Deno !== "undefined" &&
            !(env.K_SERVICE || env.X_GOOGLE_FUNCTION_REGION) // avoid Firebase Gen2
    };


    /* ------------------------------------------------------------
       8: Raw Env Dump (all SUPABASE_*, EDGE_*)
       ------------------------------------------------------------ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("SUPABASE") ||
            k.startsWith("EDGE_")
        )
    );

    return out;
}

/* ============================================================
   A34 — CLOUDFLARE WORKERS FOR PLATFORMS (WFP)
   Full detection for:
   - WFP Entrypoint workers
   - Bound workers (subworkers)
   - Dispatch workers
   - Cloudflare platform worker hosting
============================================================ */

export function extractCloudflareWorkersForPlatformsInfo(env: Record<string, string>) {
    const out: any = {
        isWFP: false,
        wfpRuntime: null,
        platform: null,
        dispatch: null,
        subrequests: null,
        boundWorkers: null,
        bindings: null,
        ai: null,
        dataServices: null,
        assets: null,
        colo: null,
        debug: null,
        raw: {}
    };


    /* ============================================================
       1: WFP Detection Signals
       ------------------------------------------------------------
       These vars only exist when:
       - A Worker is running inside Workers for Platforms
       - A Worker is bound to another Worker via `dispatch` binding
       - A Worker is invoked as a subrequest from another Worker
       ------------------------------------------------------------ */

    const signals = [
        "CF_WORKER_PLATFORM",
        "CF_WORKER_PLATFORM_SERVICE",
        "CF_WORKER_PLATFORM_SERVICE_ID",
        "CF_WORKER_PLATFORM_ENV",
        "CF_WORKER_PLATFORM_ORIGIN",
        "CF_WORKER_PLATFORM_PROJECT",
        "CF_WORKER_PLATFORM_DEBUG",
        "CF_WORKER_METADATA",
        "CF_WORKER_BOUND",
        "CF_WORKER_DISPATCH",
        "CF_WORKER_BINDINGS",
    ];

    const detected = signals.some(s => env[s] !== undefined);

    if (!detected) return null;
    out.isWFP = true;


    /* ============================================================
       2: Core WFP Platform Info
       ------------------------------------------------------------ */

    out.platform = {
        platform: env.CF_WORKER_PLATFORM ?? null,
        service: env.CF_WORKER_PLATFORM_SERVICE ?? null,
        serviceId: env.CF_WORKER_PLATFORM_SERVICE_ID ?? null,
        project: env.CF_WORKER_PLATFORM_PROJECT ?? null,
        environment: env.CF_WORKER_PLATFORM_ENV ?? null,
        origin: env.CF_WORKER_PLATFORM_ORIGIN ?? null,
        accountId: env.CF_ACCOUNT_ID ?? null
    };


    /* ============================================================
       3: WFP Runtime Info
       ------------------------------------------------------------ */

    const isEdgeRuntime =
        typeof (globalThis as any).WebSocketPair !== "undefined" &&
        typeof (globalThis as any).caches !== "undefined";

    out.wfpRuntime = {
        edgeRuntime: isEdgeRuntime,
        aiAvailable: typeof (globalThis as any).Ai !== "undefined",
        htmlRewriter: typeof (globalThis as any).HTMLRewriter !== "undefined",
        durableObjects: typeof (globalThis as any).DurableObjectNamespace !== "undefined",
    };


    /* ============================================================
       4: Dispatch Workers (Worker-to-Worker dispatch)
       ------------------------------------------------------------
       Triggered by:
       - env.CF_WORKER_DISPATCH
       - env.CF_WORKER_BOUND
       - Bound services (cf.dispatchRequest)
       ============================================================ */

    if (env.CF_WORKER_DISPATCH || env.CF_WORKER_BOUND) {
        out.dispatch = {
            isDispatchWorker: !!env.CF_WORKER_DISPATCH,
            isBoundWorker: !!env.CF_WORKER_BOUND,
            bound: env.CF_WORKER_BOUND ?? null,
            dispatch: env.CF_WORKER_DISPATCH ?? null,
            entrypoint: env.CF_WORKER_PLATFORM_SERVICE ?? null
        };
    }


    /* ============================================================
       5: Subrequests (Worker → Worker)
       ------------------------------------------------------------
       CF uses metadata:
       - CF_WORKER_SUBREQUEST
       - CF_WORKER_PARENT
       ============================================================ */

    const subRequests = {
        isSubrequest: !!env.CF_WORKER_SUBREQUEST,
        parentService: env.CF_WORKER_PARENT ?? null
    };

    if (subRequests.isSubrequest) {
        out.subrequests = subRequests;
    }


    /* ============================================================
       6: Bound Workers List (Service Bindings)
       ------------------------------------------------------------
       Cloudflare bindings for:
       - Services
       - Workers
       - AI models
       - Queues
       - KV
       - R2
       - D1
       ============================================================ */

    const boundServices = Object.entries(env)
        .filter(([k, v]) => k.startsWith("BINDING_") || k.endsWith("_SERVICE"))
        .map(([k, v]) => ({ name: k, target: v }));

    if (boundServices.length > 0) {
        out.boundWorkers = boundServices;
    }


    /* ============================================================
       7: Bindings (full dump)
       ------------------------------------------------------------ */

    out.bindings = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.includes("KV") ||
            k.includes("R2") ||
            k.includes("QUEUE") ||
            k.includes("D1") ||
            k.includes("AI") ||
            k.includes("SERVICE")
        )
    );


    /* ============================================================
       8: AI Model Bindings
       ------------------------------------------------------------ */

    const aiVars = Object.entries(env).filter(([k]) =>
        k.startsWith("AI_") || k.includes("AI_MODEL")
    );

    if (aiVars.length > 0) {
        out.ai = Object.fromEntries(aiVars);
    }


    /* ============================================================
       9: Data Services (KV / R2 / D1 / Queues)
       ============================================================ */

    out.dataServices = {
        kv: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.includes("KV"))
        ),
        r2: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.includes("R2"))
        ),
        d1: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.includes("D1"))
        ),
        queues: Object.fromEntries(
            Object.entries(env).filter(([k]) => k.includes("QUEUE"))
        )
    };


    /* ============================================================
       10: Assets (static content distributed via WFP)
       ============================================================ */

    out.assets = {
        hasStaticContent:
            typeof (globalThis as any).__STATIC_CONTENT !== "undefined",
        hasManifest:
            typeof (globalThis as any).__STATIC_CONTENT_MANIFEST !== "undefined",
        bundle: env.CF_BUNDLE ?? null
    };


    /* ============================================================
       11: Colo / Region Metadata (Smart Placement)
       ============================================================ */

    out.colo = {
        region: env.CF_REGION ?? null,
        colo: env.CF_COL0_ID ?? null,
        country: env.HTTP_CF_IPCOUNTRY ?? null
    };


    /* ============================================================
       12: Debug Mode
       ------------------------------------------------------------
       Wrangler / Preview / WFP Local Dev
       ============================================================ */

    out.debug = {
        wranglerDev: env.WRANGLER_DEV === "1",
        miniflare: env.MINIFLARE === "true" || env.MINIFLARE === "1",
        wfpDebug: env.CF_WORKER_PLATFORM_DEBUG ?? null
    };


    /* ============================================================
       13: RAW dump of all WFP vars
       ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("CF_WORKER") ||
            k.startsWith("CF_BUNDLE") ||
            k.startsWith("BINDING_") ||
            k.includes("_SERVICE")
        )
    );

    return out;
}

/* ============================================================
   A35 — FASTLY COMPUTE@EDGE — FULL RUNTIME DETECTOR
============================================================ */

export function extractFastlyComputeInfo(env: Record<string, string>) {
    const out: any = {
        isFastly: false,
        runtime: null,
        compute: null,
        fanout: null,
        objectStore: null,
        kvStore: null,
        secrets: null,
        backends: null,
        logging: null,
        localDev: null,
        wasm: null,
        metadata: null,
        raw: {}
    };


    /* ============================================================
       1: CORE FASTLY RUNTIME DETECTION
       ------------------------------------------------------------
       Fastly exposes:
         FASTLY_SERVICE_ID
         FASTLY_SERVICE_VERSION
         FASTLY_COMPUTE_RUNTIME
         FASTLY_FANOUT
         FASTLY_TRACE_ID
       ============================================================ */

    const fastlySignals = [
        "FASTLY_SERVICE_ID",
        "FASTLY_SERVICE_VERSION",
        "FASTLY_COMPUTE_RUNTIME",
        "FASTLY_FANOUT",
        "FASTLY_TRACE_ID",
        "FASTLY_LOG",
        "FASTLY_OBJECT_STORE",
        "FASTLY_KV_STORE",
        "FASTLY_SECRET_STORE"
    ];

    if (fastlySignals.some(k => env[k] !== undefined)) {
        out.isFastly = true;
    }

    /* If still nothing, check global Fastly API presence */
    if (!out.isFastly) {
        const g = globalThis as any;
        if (g.fastly || g.Fastly || g.env?.FASTLY_SERVICE_ID) {
            out.isFastly = true;
        }
    }

    if (!out.isFastly) return null;


    /* ============================================================
       2: FASTLY COMPUTE RUNTIME INFO
       ------------------------------------------------------------
       Rust Wasm runtime exposes:
         - globalThis.fastly.env
         - version via FASTLY_COMPUTE_RUNTIME
         - backend APIs
       ============================================================ */

    const g = globalThis as any;

    out.runtime = {
        isCompute: !!env.FASTLY_COMPUTE_RUNTIME || !!g.fastly,
        runtimeVersion: env.FASTLY_COMPUTE_RUNTIME ?? null,
        serviceId: env.FASTLY_SERVICE_ID ?? null,
        serviceVersion: env.FASTLY_SERVICE_VERSION ?? null,
        traceId: env.FASTLY_TRACE_ID ?? null,
        edgeContext: typeof g.fastly !== "undefined",
        hasFanout: !!env.FASTLY_FANOUT,
        hasFastlyAPI: typeof g.fastly !== "undefined",
        hasBackendAPI: !!g.fastly?.connectBackend,
        hasGeolocationAPI: !!g.fastly?.geolocation,
        hasRateLimitAPI: !!g.fastly?.ratelimit,
        hasKV: !!g.fastly?.kvStore,
        hasObjectStore: !!g.fastly?.objectStore,
        hasSecretStore: !!g.fastly?.secretStore,
    };


    /* ============================================================
       3: FANOUT INFORMATION
       ------------------------------------------------------------ */

    out.fanout = {
        enabled: !!env.FASTLY_FANOUT,
        fanoutKey: env.FASTLY_FANOUT ?? null
    };


    /* ============================================================
       4: OBJECT STORE BINDINGS
       ------------------------------------------------------------ */

    const objectStoreVars = Object.entries(env).filter(([k]) =>
        k.startsWith("FASTLY_OBJECT_STORE")
    );

    if (objectStoreVars.length > 0) {
        out.objectStore = Object.fromEntries(objectStoreVars);
    }


    /* ============================================================
       5: KV STORE (Edge Dictionaries)
       ------------------------------------------------------------ */

    const kvVars = Object.entries(env).filter(([k]) =>
        k.startsWith("FASTLY_KV_STORE") ||
        k.includes("DICT") ||
        k.includes("DICTIONARY")
    );

    if (kvVars.length > 0) {
        out.kvStore = Object.fromEntries(kvVars);
    }


    /* ============================================================
       6: SECRET STORES
       ============================================================ */

    const secretVars = Object.entries(env).filter(([k]) =>
        k.startsWith("FASTLY_SECRET") ||
        k.includes("SECRET_STORE")
    );

    if (secretVars.length > 0) {
        out.secrets = Object.fromEntries(secretVars);
    }


    /* ============================================================
       7: BACKENDS (Fastly backend services)
       ------------------------------------------------------------
       Only visible inside Compute runtime:
       ============================================================ */

    const backendSignals = Object.entries(env).filter(([k]) =>
        k.includes("FASTLY_BACKEND") || k.endsWith("_BACKEND")
    );

    if (backendSignals.length > 0) {
        out.backends = backendSignals.map(([k, v]) => ({ name: k, target: v }));
    }


    /* ============================================================
       8: LOGGING PIPELINES
       ------------------------------------------------------------ */

    const loggingVars = Object.entries(env).filter(([k]) =>
        k.startsWith("FASTLY_LOG") || k.includes("LOGGING")
    );

    if (loggingVars.length > 0) {
        out.logging = Object.fromEntries(loggingVars);
    }


    /* ============================================================
       9: WASM RUNTIME INFO (Compute@Edge uses Wasmtime)
       ------------------------------------------------------------
       Detect:
         - Wasm memory
         - Maximum Wasm page count
         - Edge API presence
       ============================================================ */

    out.wasm = {
        isWasm: typeof WebAssembly !== "undefined",
        wasmMemoryPresent: !!g.WebAssembly?.Memory,
        wasmTablePresent: !!g.WebAssembly?.Table,
        wasmCompile: !!g.WebAssembly?.compile,
        wasmRuntime: "wasmtime", // ALL Compute@Edge uses Wasmtime
        hasWasi: !!g?.fastly?.wasi, // Fastly exposes limited WASI
        memoryLimitMB: env.FASTLY_WASM_MEMORY_MB ?? null
    };


    /* ============================================================
       10: LOCAL DEV (fastly compute serve / wasmtime CLI)
       ------------------------------------------------------------ */

    const isLocal =
        env.FASTLY_LOCAL_SERVER === "1" ||
        env.FASTLY_LOCAL === "1" ||
        env.FASTLY_EMULATOR === "true" ||
        env.FASTLY_CLI === "1" ||
        env.FASTLY_DEV === "1";

    out.localDev = {
        isLocal,
        cliMode:
            env.FASTLY_CLI === "1" ||
            env.FASTLY_LOCAL_SERVER === "1",
        wasmtime: !!env.WASMTIME_HOME,
        servePort: env.FASTLY_LOCAL_PORT ?? null,
    };


    /* ============================================================
       11: Edge Metadata (region, POP, colo)
       ============================================================ */

    out.metadata = {
        region: env.FASTLY_REGION ?? null,
        pop: env.FASTLY_POP ?? null,
        colo: env.FASTLY_COLO ?? null,
        requestId: env.FASTLY_REQUEST_ID ?? null,
    };


    /* ============================================================
       12: Raw Dump (FASTLY_*)
       ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("FASTLY_") ||
            k.includes("FASTLY_") ||
            k.includes("_FASTLY")
        )
    );

    return out;
}

/* ============================================================
   A36 — AKAMAI EDGEWORKERS — FULL RUNTIME DETECTOR
============================================================ */

export function extractAkamaiEdgeWorkersInfo(env: Record<string, string>) {
    const out: any = {
        isAkamai: false,
        runtime: null,
        worker: null,
        edgekv: null,
        propertyManager: null,
        activation: null,
        requestContext: null,
        sandbox: null,
        localDev: null,
        raw: {}
    };

    /* ============================================================
       1: Core Runtime Detection
       ------------------------------------------------------------
       Akamai EdgeWorkers have:
         - EW_OFFLINE
         - AKAMAI_EDGEWORKER
         - PMUSER_* property vars
         - EdgeKV globals
         - EW_DEBUG
         - EW_ACTIVATION_ID
       ============================================================ */

    const ewSignals = [
        "AKAMAI_EDGEWORKER",
        "EW_OFFLINE",
        "EW_ACTIVATION_ID",
        "EW_ACTIVATION_VERSION",
        "EW_RESOURCE_STATUS",
        "EDGEKV_NAMESPACE",
        "EDGEKV_DATASET",
        "PMUSER_GUID",
        "PMUSER_ENVIRONMENT",
        "PMUSER_SITE"
    ];

    const detected = ewSignals.some(k => env[k] !== undefined);

    if (detected) out.isAkamai = true;

    /* Extra detection via globals */
    const g = globalThis as any;
    if (!out.isAkamai) {
        if (
            g?.Response && g?.Request &&
            typeof g?.createResponse === "function"
        ) {
            // Akamai-specific fetch-like API
            out.isAkamai = true;
        }
    }

    if (!out.isAkamai) return null;


    /* ============================================================
       2: Runtime Information
       ------------------------------------------------------------
       Akamai EdgeWorkers use:
       - Secure ECMAScript isolate runtime
       - Custom fetch API: createResponse, Request, Response
       ============================================================ */

    out.runtime = {
        edgeRuntime: true,
        isolateEngine: "Akamai ECMAScript isolate",
        hasRequest: typeof g.Request !== "undefined",
        hasResponse: typeof g.Response !== "undefined",
        hasCreateResponse: typeof g.createResponse === "function",
        hasCrypto: typeof g.crypto !== "undefined",
        supportsSubrequests: typeof g.httpRequest !== "undefined",
        offlineMode: env.EW_OFFLINE === "1" || env.EW_OFFLINE === "true",
        version: env.AKAMAI_EDGEWORKER_VERSION ?? null,
    };


    /* ============================================================
       3: Worker Metadata (Bundle + Activation)
       ============================================================ */

    out.worker = {
        edgeWorkerId: env.AKAMAI_EDGEWORKER ?? null,
        activationId: env.EW_ACTIVATION_ID ?? null,
        version: env.EW_ACTIVATION_VERSION ?? null,
        resourceStatus: env.EW_RESOURCE_STATUS ?? null,
        bundleHash: env.EW_BUNDLE_HASH ?? null,
        bundleVersion: env.EW_BUNDLE_VERSION ?? null,
        eventHandler: env.EW_HANDLER ?? null,
    };


    /* ============================================================
       4: EdgeKV
       ------------------------------------------------------------
       EdgeKV bindings typically expose:
           EDGEKV_NAMESPACE
           EDGEKV_DATASET
           EDGEKV_ACCESS_TOKEN
       ============================================================ */

    const ekvVars = Object.entries(env).filter(([k]) =>
        k.startsWith("EDGEKV")
    );

    if (ekvVars.length > 0) {
        out.edgekv = Object.fromEntries(ekvVars);
    }


    /* ============================================================
       5: Property Manager Variables (PMUSER_*)
       ------------------------------------------------------------
       These are user-defined property variables set in Akamai PM:
       PMUSER_*  
       ============================================================ */

    const pmVars = Object.entries(env).filter(([k]) =>
        k.startsWith("PMUSER_")
    );

    if (pmVars.length > 0) {
        out.propertyManager = Object.fromEntries(pmVars);
    }


    /* ============================================================
       6: Activation / Deployment Metadata
       ------------------------------------------------------------
       EdgeWorkers activation API injects:
           EW_ACTIVATION_ID
           EW_BUNDLE_VERSION
           EW_RESOURCE_STATUS
       ============================================================ */

    out.activation = {
        activationId: env.EW_ACTIVATION_ID ?? null,
        activationVersion: env.EW_ACTIVATION_VERSION ?? null,
        resourceStatus: env.EW_RESOURCE_STATUS ?? null,
        bundleHash: env.EW_BUNDLE_HASH ?? null,
        bundleVersion: env.EW_BUNDLE_VERSION ?? null
    };


    /* ============================================================
       7: Request Context (Edge-only)
       ------------------------------------------------------------
       Akamai uses:
         Request
         Response
         createResponse()
         httpRequest()
       ============================================================ */

    out.requestContext = {
        hasRequest: typeof g.Request !== "undefined",
        hasResponse: typeof g.Response !== "undefined",
        hasHttpRequest: typeof g.httpRequest !== "undefined",
        hasEventContext: typeof g.event !== "undefined",
        hasFetch: typeof g.fetch === "function" // POSSIBLE in future runtimes
    };


    /* ============================================================
       8: Sandbox Detection
       ------------------------------------------------------------
       Akamai has sandbox/local testing:
         - EW_SANDBOX
         - AKAMAI_SANDBOX
         - EW_LOCAL_TEST
       ============================================================ */

    const sandbox = env.EW_SANDBOX || env.AKAMAI_SANDBOX || env.EW_LOCAL_TEST;

    if (sandbox) {
        out.sandbox = {
            sandboxEnabled: true,
            info: sandbox ?? null
        };
    }


    /* ============================================================
       9: Local Development (ew CLI debug)
       ------------------------------------------------------------
       EW_OFFLINE=1 or EW_LOCAL_TEST=1 or ew CLI
       ============================================================ */

    const isLocal =
        env.EW_OFFLINE === "1" ||
        env.EW_LOCAL_TEST === "1" ||
        env.EW_CLI_DEBUG === "1";

    out.localDev = {
        isLocal,
        cliDebug: env.EW_CLI_DEBUG === "1",
        offline: env.EW_OFFLINE === "1",
        localTest: env.EW_LOCAL_TEST === "1"
    };


    /* ============================================================
       10: Raw Dump (All Akamai vars)
       ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("AKAMAI") ||
            k.startsWith("EDGEKV") ||
            k.startsWith("PMUSER_") ||
            k.startsWith("EW_")
        )
    );

    return out;
}

/* ============================================================
   A37 — Tencent Cloud SCF (Serverless Cloud Functions)
   Full detection of SCF cloud runtime, triggers, metadata
============================================================ */

export function extractTencentCloudSCFInfo(env: Record<string, string>) {
    const out: any = {
        isSCF: false,
        function: null,
        region: null,
        runtime: null,
        triggers: null,
        tempCredentials: null,
        container: null,
        logging: null,
        project: null,
        localDev: null,
        raw: {}
    };


    /* ============================================================
       1: Core SCF Runtime Signals
       ------------------------------------------------------------
       Tencent Cloud SCF exposes:
         - TENCENTCLOUD_FUNCTION_NAME
         - TENCENTCLOUD_REGION
         - SCF_RUNTIME
         - TENCENTCLOUD_FUNCTION_MEMORY
         - TENCENTCLOUD_RUNENV
       ============================================================ */

    const scfSignals = [
        "TENCENTCLOUD_FUNCTION_NAME",
        "TENCENTCLOUD_REGION",
        "TENCENTCLOUD_FUNCTION_MEMORY",
        "TENCENTCLOUD_FUNCTION_TIMEOUT",
        "SCF_RUNTIME",
        "TENCENTCLOUD_RUNENV",
        "TENCENTCLOUD_NAMESPACE",
        "TENCENTCLOUD_FUNCTION_VERSION"
    ];

    const detected = scfSignals.some(k => env[k] !== undefined);

    if (!detected) return null;

    out.isSCF = true;


    /* ============================================================
       2: Function Metadata
       ============================================================ */

    out.function = {
        name: env.TENCENTCLOUD_FUNCTION_NAME ?? null,
        namespace: env.TENCENTCLOUD_NAMESPACE ?? null,
        version: env.TENCENTCLOUD_FUNCTION_VERSION ?? null,
        memoryMB: env.TENCENTCLOUD_FUNCTION_MEMORY
            ? Number(env.TENCENTCLOUD_FUNCTION_MEMORY)
            : null,
        timeoutSec: env.TENCENTCLOUD_FUNCTION_TIMEOUT
            ? Number(env.TENCENTCLOUD_FUNCTION_TIMEOUT)
            : null,
        handler: env.TENCENTCLOUD_FUNCTION_HANDLER ?? null,
        qualifier: env.TENCENTCLOUD_FUNCTION_QUALIFIER ?? null,
        alias: env.TENCENTCLOUD_FUNCTION_ALIAS ?? null,
        runtime: env.SCF_RUNTIME ?? env.TENCENTCLOUD_RUNTIME ?? null
    };


    /* ============================================================
       3: Region / Project Metadata
       ============================================================ */

    out.region = {
        region: env.TENCENTCLOUD_REGION ?? null,
        availabilityZone: env.TENCENTCLOUD_ZONE ?? null
    };

    out.project = {
        appid: env.TENCENTCLOUD_APPID ?? null,
        uin: env.TENCENTCLOUD_UIN ?? null,
        region: env.TENCENTCLOUD_REGION ?? null,
        ownerUin: env.TENCENTCLOUD_OWNER_UIN ?? null,
        accountId: env.TENCENTCLOUD_ACCOUNT_ID ?? null
    };


    /* ============================================================
       4: SCF Triggers
       ------------------------------------------------------------
       Tencent Cloud SCF triggers:
         - API Gateway: SCF_API_REQUEST_ID, SCF_GATEWAY_CONTEXT
         - Timer/Cron: SCF_TIMER_TRIGGER
         - COS Bucket: SCF_COS_BUCKET
         - Kafka / CKafka: SCF_CKAFKA_TOPIC, SCF_CKAFKA_MSG_ID
         - CMQ (Queue)
         - CLB/ALB proxy events
       ============================================================ */

    out.triggers = {
        apiGateway: {
            enabled: !!env.SCF_API_REQUEST_ID,
            requestId: env.SCF_API_REQUEST_ID ?? null,
            stage: env.SCF_API_STAGE ?? null,
            method: env.SCF_API_METHOD ?? null,
            path: env.SCF_API_PATH ?? null,
            context: env.SCF_GATEWAY_CONTEXT ?? null
        },
        timer: env.SCF_TIMER_TRIGGER === "true",
        cos: {
            bucket: env.SCF_COS_BUCKET ?? null,
            region: env.SCF_COS_REGION ?? null,
            key: env.SCF_COS_OBJECT_KEY ?? null,
            trigger: !!env.SCF_COS_BUCKET
        },
        cKafka: {
            topic: env.SCF_CKAFKA_TOPIC ?? null,
            partition: env.SCF_CKAFKA_PARTITION ?? null,
            msgId: env.SCF_CKAFKA_MSG_ID ?? null,
            trigger: !!env.SCF_CKAFKA_TOPIC
        },
        cmq: {
            queue: env.SCF_CMQ_QUEUE ?? null,
            msgId: env.SCF_CMQ_MSG_ID ?? null,
            trigger: !!env.SCF_CMQ_QUEUE
        }
    };


    /* ============================================================
       5: Temporary Credentials (Role-based)
       ------------------------------------------------------------
       SCF injects:
         - TENCENTCLOUD_SECRETID
         - TENCENTCLOUD_SECRETKEY
         - TENCENTCLOUD_SESSIONTOKEN
       ============================================================ */

    out.tempCredentials = {
        hasTempCreds:
            !!env.TENCENTCLOUD_SECRETID &&
            !!env.TENCENTCLOUD_SESSIONTOKEN,
        secretId: env.TENCENTCLOUD_SECRETID ?? null,
        secretKeyPresent: !!env.TENCENTCLOUD_SECRETKEY,
        sessionToken: env.TENCENTCLOUD_SESSIONTOKEN ?? null
    };


    /* ============================================================
       6: SCF Container Runtime Mode (镜像部署)
       ------------------------------------------------------------
       Container-based SCF functions expose:
         - SCF_RUNTIME=image
         - SCF_IMAGE_VERSION
       ============================================================ */

    if (env.SCF_RUNTIME === "image" || env.SCF_IMAGE_VERSION) {
        out.container = {
            isContainer: true,
            imageVersion: env.SCF_IMAGE_VERSION ?? null,
            imageName: env.SCF_IMAGE_NAME ?? null
        };
    }


    /* ============================================================
       7: Logging / Trace / CLS / CVM integration
       ============================================================ */

    out.logging = {
        requestId: env.SCF_REQUEST_ID ?? null,
        clsTopic: env.TENCENTCLOUD_LOG_TOPIC ?? null,
        clsRegion: env.TENCENTCLOUD_LOG_REGION ?? null,
        traceId: env.TENCENTCLOUD_TRACE_ID ?? null
    };


    /* ============================================================
       8: Local Development
       ------------------------------------------------------------
       Local SCF simulators expose:
         - SCF_LOCAL=1
         - TENCENTCLOUD_RUNENV=SCF_LOCAL
       ============================================================ */

    const isLocal =
        env.SCF_LOCAL === "1" ||
        env.TENCENTCLOUD_RUNENV === "SCF_LOCAL";

    out.localDev = {
        isLocal,
        runEnv: env.TENCENTCLOUD_RUNENV ?? null
    };


    /* ============================================================
       9: Raw Dump (TENCENTCLOUD_*, SCF_*)
       ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("TENCENTCLOUD_") ||
            k.startsWith("SCF_")
        )
    );

    return out;
}

/* ============================================================
   A38 — ALIBABA CLOUD FUNCTION COMPUTE (FC)
   Full runtime, trigger, container, credential detection
============================================================ */

export function extractAlibabaFCInfo(env: Record<string, string>) {
    const out: any = {
        isFC: false,
        function: null,
        region: null,
        project: null,
        runtime: null,
        triggers: null,
        tempCredentials: null,
        container: null,
        logging: null,
        asyncTask: null,
        edge: null,
        localDev: null,
        raw: {}
    };

    /* ============================================================
       1: Core FC Runtime Signals
       ------------------------------------------------------------
       Alibaba FC exposes:
         - FC_FUNCTION_NAME
         - FC_SERVICE_NAME
         - FC_REGION
         - FC_RUNTIME
         - FC_HANDLER
         - FC_TIMEOUT
         - FC_MEMORY_SIZE
         - FC_ACCOUNT_ID
         - FC_INSTANCE_ID
         - FC_INSTANCE_LOCAL_IP
         - FC_INSTANCE_PORT
       ============================================================ */

    const fcSignals = [
        "FC_FUNCTION_NAME",
        "FC_SERVICE_NAME",
        "FC_REGION",
        "FC_ACCOUNT_ID",
        "FC_RUNTIME",
        "FC_INSTANCE_ID",
        "FC_FUNCTION_MEMORY_SIZE",
        "FC_FUNCTION_TIMEOUT",
        "FC_HANDLER",
        "FC_SERVICE_LOG_PROJECT",
        "FC_LOGSTORE"
    ];

    const detected = fcSignals.some(k => env[k] !== undefined);

    if (!detected) return null;

    out.isFC = true;


    /* ============================================================
       2: Function Metadata
       ============================================================ */

    out.function = {
        name: env.FC_FUNCTION_NAME ?? null,
        serviceName: env.FC_SERVICE_NAME ?? null,
        version: env.FC_FUNCTION_BR_VERSION ?? null,  // Function version
        qualifier: env.FC_QUALIFIER ?? null,
        handler: env.FC_HANDLER ?? null,
        timeout: env.FC_FUNCTION_TIMEOUT
            ? Number(env.FC_FUNCTION_TIMEOUT)
            : null,
        memoryMB: env.FC_FUNCTION_MEMORY_SIZE
            ? Number(env.FC_FUNCTION_MEMORY_SIZE)
            : null,
        instanceId: env.FC_INSTANCE_ID ?? null,
        instanceLocalIp: env.FC_INSTANCE_LOCAL_IP ?? null,
        instancePort: env.FC_INSTANCE_PORT
            ? Number(env.FC_INSTANCE_PORT)
            : null,
        cpu: env.FC_CPU ?? null,
        gpu: env.FC_GPU ?? null
    };


    /* ============================================================
       3: Region / Account Metadata
       ============================================================ */

    out.region = {
        region: env.FC_REGION ?? null,
        zone: env.FC_ZONE ?? null
    };

    out.project = {
        accountId: env.FC_ACCOUNT_ID ?? null,
        serviceLogProject: env.FC_SERVICE_LOG_PROJECT ?? null,
        logStore: env.FC_LOGSTORE ?? null,
        tracerProject: env.FC_TRACER_PROJECT ?? null
    };


    /* ============================================================
       4: Runtime Information
       ============================================================ */

    out.runtime = {
        runtime: env.FC_RUNTIME ?? null,
        initializerHandler: env.FC_INITIALIZER_HANDLER ?? null,
        initializerTimeout: env.FC_INITIALIZER_TIMEOUT
            ? Number(env.FC_INITIALIZER_TIMEOUT)
            : null,
        concurrency: env.FC_INSTANCE_CONCURRENCY
            ? Number(env.FC_INSTANCE_CONCURRENCY)
            : null,
        mode: env.FC_FUNCTION_MODE ?? null,  // async, http, event
        startupDurationMs: env.FC_STARTUP_DURATION_MS ?? null
    };


    /* ============================================================
       5: TRIGGERS (ALL SUPPORTED FC TRIGGERS)
       ============================================================ */

    out.triggers = {
        apiGateway: {
            enabled: !!env.FC_REQUEST_ID,
            requestId: env.FC_REQUEST_ID ?? null,
            path: env.FC_REQUEST_PATH ?? null,
            method: env.FC_REQUEST_METHOD ?? null,
            query: env.FC_REQUEST_QUERY ?? null
        },
        timer: {
            enabled: !!env.FC_TIMER_TRIGGER_TIME,
            triggerTime: env.FC_TIMER_TRIGGER_TIME ?? null
        },
        oss: {
            event: env.FC_OSS_EVENT ?? null,
            bucket: env.FC_OSS_BUCKET_NAME ?? null,
            object: env.FC_OSS_OBJECT_NAME ?? null
        },
        log: {
            project: env.FC_LOG_PROJECT ?? null,
            logstore: env.FC_LOG_LOGSTORE ?? null
        },
        mns: {
            queue: env.FC_MNS_QUEUE_NAME ?? null,
            msgHandle: env.FC_MNS_MSG_HANDLE ?? null
        },
        kafka: {
            topic: env.FC_KAFKA_TOPIC ?? null,
            partition: env.FC_KAFKA_PARTITION ?? null,
            offset: env.FC_KAFKA_OFFSET ?? null
        }
    };


    /* ============================================================
       6: Temporary Credentials (RAM Role)
       ------------------------------------------------------------
       Injected by Aliyun FC:
         - ALIBABA_CLOUD_ACCESS_KEY_ID
         - ALIBABA_CLOUD_ACCESS_KEY_SECRET
         - ALIBABA_CLOUD_SECURITY_TOKEN
       ============================================================ */

    out.tempCredentials = {
        hasCredentials:
            !!env.ALIBABA_CLOUD_ACCESS_KEY_ID ||
            !!env.ALIBABA_CLOUD_SECURITY_TOKEN,
        accessKeyId: env.ALIBABA_CLOUD_ACCESS_KEY_ID ?? null,
        accessKeySecretPresent: !!env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
        securityToken: env.ALIBABA_CLOUD_SECURITY_TOKEN ?? null
    };


    /* ============================================================
       7: Custom Container Runtime (Image Mode)
       ------------------------------------------------------------
       FC_IMAGE_* vars appear when using image-based functions
       ============================================================ */

    if (env.FC_RUNTIME === "custom-container" || env.FC_IMAGE_TAG) {
        out.container = {
            isContainer: true,
            imageName: env.FC_IMAGE_NAME ?? null,
            imageTag: env.FC_IMAGE_TAG ?? null,
            imageDigest: env.FC_IMAGE_DIGEST ?? null,
            registry: env.FC_IMAGE_REGISTRY ?? null
        };
    }


    /* ============================================================
       8: Logging / Tracing (SLS)
       ============================================================ */

    out.logging = {
        logProject: env.FC_SERVICE_LOG_PROJECT ?? null,
        logStore: env.FC_LOGSTORE ?? null,
        requestId: env.FC_REQUEST_ID ?? null,
        traceId: env.FC_TRACE_ID ?? null,
        slsEndpoint: env.FC_SLS_ENDPOINT ?? null
    };


    /* ============================================================
       9: Async Task Queue (新异步任务)
       ============================================================ */

    out.asyncTask = {
        enabled: !!env.FC_ASYNC_TASK_ID,
        taskId: env.FC_ASYNC_TASK_ID ?? null,
        progress: env.FC_ASYNC_TASK_PROGRESS ?? null,
        resultStore: env.FC_ASYNC_TASK_RESULT_STORE ?? null
    };


    /* ============================================================
       10: EdgeWorker Mode (FC on Alibaba Edge)
       ============================================================ */

    out.edge = {
        edgeWorker: env.FC_EDGE_WORKER === "1" || env.FC_EDGE_WORKER === "true",
        edgeRegion: env.FC_EDGE_REGION ?? null
    };


    /* ============================================================
       11: Local Development
       ------------------------------------------------------------
       fc local invoke / fc local start
       ============================================================ */

    const isLocal =
        env.FC_LOCAL === "1" ||
        env.ALIBABA_CLOUD_LOCAL === "1" ||
        env.FC_DEBUG === "1";

    out.localDev = {
        isLocal,
        debug: env.FC_DEBUG === "1",
        simulatorEnv: env.FC_LOCAL_ENV ?? null
    };


    /* ============================================================
       12: Raw Environment Dump
       ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("FC_") ||
            k.startsWith("ALIBABA_CLOUD_")
        )
    );

    return out;
}

/* ============================================================
   A39 — HUAWEI CLOUD FUNCTIONGRAPH (FG)
   Full environment and trigger meta extraction
============================================================ */

export function extractHuaweiFunctionGraphInfo(env: Record<string, string>) {
    const out: any = {
        isFunctionGraph: false,
        function: null,
        region: null,
        project: null,
        runtime: null,
        triggers: null,
        tempCredentials: null,
        container: null,
        logging: null,
        asyncExec: null,
        workflow: null,
        edge: null,
        localDev: null,
        raw: {}
    };

    /* ============================================================
       1: Core FG Runtime Indicators
       ------------------------------------------------------------
       Huawei FG exposes:
        - FUNCTION_NAME
        - FUNCTION_HANDLER
        - FUNCTION_TIMEOUT
        - FUNCTION_MEMORY_SIZE
        - REGION
        - PROJECT_ID
        - SERVICE_NAME
        - FUNCTION_VERSION
        - REQUEST_ID
        - STREAM_ID
    ============================================================ */

    const fgSignals = [
        "FUNCTION_NAME",
        "FUNCTION_HANDLER",
        "FUNCTION_TIMEOUT",
        "FUNCTION_MEMORY_SIZE",
        "FUNCTION_VERSION",
        "REGION",
        "PROJECT_ID",
        "SERVICE_NAME",
        "REQUEST_ID"
    ];

    const detected = fgSignals.some(k => env[k] !== undefined);

    if (!detected) return null;

    out.isFunctionGraph = true;


    /* ============================================================
       2: Function Metadata
    ============================================================ */
    out.function = {
        name: env.FUNCTION_NAME ?? null,
        service: env.SERVICE_NAME ?? null,
        version: env.FUNCTION_VERSION ?? null,
        runtime: env.RUNTIME ?? null,
        handler: env.FUNCTION_HANDLER ?? null,
        timeout: env.FUNCTION_TIMEOUT ? Number(env.FUNCTION_TIMEOUT) : null,
        memoryMB: env.FUNCTION_MEMORY_SIZE
            ? Number(env.FUNCTION_MEMORY_SIZE)
            : null,
        instanceId: env.INSTANCE_ID ?? null,
        instanceConcurrency: env.INSTANCE_CONCURRENCY
            ? Number(env.INSTANCE_CONCURRENCY)
            : null
    };


    /* ============================================================
       3: Region & Project / Account Metadata
    ============================================================ */
    out.region = {
        region: env.REGION ?? null,
        availabilityZone: env.AZ ?? null
    };

    out.project = {
        projectId: env.PROJECT_ID ?? null,
        domainId: env.DOMAIN_ID ?? null,
        userId: env.USER_ID ?? null,
        tenantId: env.TENANT_ID ?? null
    };


    /* ============================================================
       4: Runtime Details
    ============================================================ */
    out.runtime = {
        runtime: env.RUNTIME ?? null,
        initializer: env.INIT_HANDLER ?? null,
        initializerTimeout: env.INIT_TIMEOUT
            ? Number(env.INIT_TIMEOUT)
            : null
    };


    /* ============================================================
       5: Triggers (ALL FunctionGraph triggers)
       ------------------------------------------------------------
       - API Gateway
       - OBS Object Storage
       - Timer
       - Kafka
       - DMS Queue
       - CTS (Cloud Trace)
       - Log Tank Service (LTS)
       - IoT Edge triggers
    ============================================================ */

    out.triggers = {
        apiGateway: {
            enabled: !!env.REQUEST_ID,
            requestId: env.REQUEST_ID ?? null,
            httpMethod: env.REQUEST_METHOD ?? null,
            path: env.REQUEST_PATH ?? null,
            query: env.REQUEST_QUERY_STRING ?? null
        },
        obs: {
            bucket: env.OBS_BUCKET_NAME ?? null,
            event: env.OBS_EVENT_TYPE ?? null,
            object: env.OBS_OBJECT_NAME ?? null
        },
        timer: {
            enabled: !!env.FG_TIMER_TRIGGER,
            triggerTime: env.FG_TIMER_TRIGGER_TIME ?? null
        },
        kafka: {
            topic: env.KAFKA_TOPIC ?? null,
            partition: env.KAFKA_PARTITION ?? null,
            offset: env.KAFKA_OFFSET ?? null
        },
        dms: {
            queueName: env.DMS_QUEUE_NAME ?? null,
            msgId: env.DMS_MSG_ID ?? null
        },
        cts: {
            traceId: env.CTS_TRACE_ID ?? null
        },
        logTank: {
            logGroup: env.LTS_LOG_GROUP ?? null,
            logStream: env.LTS_LOG_STREAM ?? null
        }
    };


    /* ============================================================
       6: Temporary Credentials (IAM STS)
    ============================================================ */
    out.tempCredentials = {
        hasCredentials:
            !!env.HUAWEICLOUD_ACCESS_KEY_ID ||
            !!env.HUAWEICLOUD_SECURITY_TOKEN,
        accessKeyId: env.HUAWEICLOUD_ACCESS_KEY_ID ?? null,
        accessKeySecretPresent: !!env.HUAWEICLOUD_ACCESS_KEY_SECRET,
        securityToken: env.HUAWEICLOUD_SECURITY_TOKEN ?? null
    };


    /* ============================================================
       7: Custom Container Runtime
       ------------------------------------------------------------
       FG container functions expose:
        - FCN_DOCKER_IMAGE
        - FCN_CUSTOM_CONTAINER
        - IMAGE_ADDR
    ============================================================ */

    if (env.FCN_DOCKER_IMAGE || env.FCN_CUSTOM_CONTAINER === "true") {
        out.container = {
            isContainer: true,
            image: env.FCN_DOCKER_IMAGE ?? null,
            imageAddress: env.IMAGE_ADDR ?? null
        };
    }


    /* ============================================================
       8: Logging / Trace Metadata
    ============================================================ */
    out.logging = {
        requestId: env.REQUEST_ID ?? null,
        streamId: env.STREAM_ID ?? null,
        ltsLogGroup: env.LTS_LOG_GROUP ?? null,
        ltsLogStream: env.LTS_LOG_STREAM ?? null,
        traceId: env.TRACE_ID ?? null
    };


    /* ============================================================
       9: Async (FunctionGraph Async Invocation)
    ============================================================ */
    out.asyncExec = {
        enabled: !!env.FG_ASYNC_REQUEST_ID,
        asyncRequestId: env.FG_ASYNC_REQUEST_ID ?? null,
        retryCount: env.FG_ASYNC_RETRY_COUNT
            ? Number(env.FG_ASYNC_RETRY_COUNT)
            : null
    };


    /* ============================================================
       10: Workflow Integration (华为云工作流)
    ============================================================ */
    out.workflow = {
        workflowName: env.FG_WORKFLOW_NAME ?? null,
        stateName: env.FG_WORKFLOW_STATE ?? null,
        executionId: env.FG_WORKFLOW_EXECUTION_ID ?? null
    };


    /* ============================================================
       11: Edge Functions (IoT Edge / EdgeNode)
    ============================================================ */
    out.edge = {
        isEdge: env.FG_EDGE === "1" || env.FG_EDGE_MODE === "true",
        node: env.FG_EDGE_NODE_ID ?? null
    };


    /* ============================================================
       12: Local Dev (fg-local)
    ============================================================ */
    const isLocal =
        env.FG_LOCAL === "1" ||
        env.FC_LOCAL_DEV === "1" ||
        env.HUAWEICLOUD_EMULATOR === "1";

    out.localDev = {
        isLocal,
        emulator: env.HUAWEICLOUD_EMULATOR ?? null,
        localWorkspace: env.FG_LOCAL_WORKSPACE ?? null
    };


    /* ============================================================
       13: Raw Environment Dump
    ============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("FG_") ||
            k.startsWith("HUAWEICLOUD_") ||
            k.startsWith("FUNCTION_") ||
            k.startsWith("LTS_") ||
            k.startsWith("OBS_")
        )
    );

    return out;
}

/* ============================================================
   A40 — IBM CLOUD FUNCTIONS (OpenWhisk)
   Full metadata, activation, runtime, triggers, credentials
============================================================ */

export function extractIBMCloudFunctionsInfo(env: Record<string, string>) {
    const out: any = {
        isIBMCloudFunction: false,
        function: null,
        region: null,
        project: null,
        whisk: null,
        triggers: null,
        credentials: null,
        container: null,
        webAction: null,
        composer: null,
        localDev: null,
        codeEngine: null,
        raw: {}
    };

    /* ============================================================
       1: Core IBM/OpenWhisk Runtime Variables
       ------------------------------------------------------------
       These ALWAYS appear in IBM Cloud Functions:
         - __OW_ACTION_NAME
         - __OW_ACTIVATION_ID
         - __OW_TRANSACTION_ID
         - __OW_NAMESPACE
         - __OW_API_HOST
       ============================================================ */

    const owSignals = [
        "__OW_ACTION_NAME",
        "__OW_ACTIVATION_ID",
        "__OW_TRANSACTION_ID",
        "__OW_NAMESPACE",
        "__OW_API_HOST"
    ];

    const detected = owSignals.some(k => env[k] !== undefined);

    if (!detected) return null;
    out.isIBMCloudFunction = true;


    /* ============================================================
       2: Function Metadata
       ============================================================ */

    out.function = {
        actionName: env.__OW_ACTION_NAME ?? null,
        namespace: env.__OW_NAMESPACE ?? null,
        activationId: env.__OW_ACTIVATION_ID ?? null,
        transactionId: env.__OW_TRANSACTION_ID ?? null,
        apiHost: env.__OW_API_HOST ?? null,
        actionVersion: env.__OW_ACTION_VERSION ?? null,
        memoryLimitMB: env.__OW_MEMORY ?? null,
        timeoutMs: env.__OW_DEADLINE ?? null,
        kind: env.__OW_KIND ?? null,   // nodejs:16, python:3.9, etc.
        dockerImage: env.__OW_DOCKER_IMAGE ?? null
    };


    /* ============================================================
       3: IBM Cloud Region / Project
       ============================================================ */

    out.region = {
        region: env.IBM_REGION ?? env.REGION ?? null,
        zone: env.IBM_ZONE ?? null
    };

    out.project = {
        resourceGroup: env.IBM_RESOURCE_GROUP ?? null,
        accountId: env.IBM_ACCOUNT_ID ?? null,
        org: env.CF_ORG ?? null,
        space: env.CF_SPACE ?? null
    };


    /* ============================================================
       4: OpenWhisk Raw Context
       ------------------------------------------------------------
       __OW_* variables contain deep runtime state
       ============================================================ */

    out.whisk = {
        activationId: env.__OW_ACTIVATION_ID ?? null,
        transactionId: env.__OW_TRANSACTION_ID ?? null,
        namespace: env.__OW_NAMESPACE ?? null,
        apiHost: env.__OW_API_HOST ?? null,
        deadline: env.__OW_DEADLINE
            ? Number(env.__OW_DEADLINE)
            : null,
        sourceService: env.__OW_SOURCE_SERVICE ?? null,
        annotations: env.__OW_ANNOTATIONS ?? null,
        // __OW_ENV is a JSON string containing user-provided env
        userEnv:
            env.__OW_ENV
                ? safeJson(env.__OW_ENV)
                : null
    };


    /* ============================================================
       5: TRIGGERS (OpenWhisk)
       ------------------------------------------------------------
       IBM Cloud Functions triggers include:
         - MessageHub (Kafka)
         - Cloudant
         - Alarms (cron)
         - Git webhooks
         - API Gateway triggers
         - Event streams
       ============================================================ */

    out.triggers = {
        kafka: {
            topic: env.__OW_KAFKA_TOPIC ?? null,
            partition: env.__OW_KAFKA_PARTITION ?? null,
            offset: env.__OW_KAFKA_OFFSET ?? null
        },
        cloudant: {
            dbName: env.__OW_CLOUDANT_DB ?? null,
            docId: env.__OW_CLOUDANT_DOC_ID ?? null
        },
        alarm: {
            cron: env.__OW_ALARM_CRON ?? null,
            fireTime: env.__OW_ALARM_FIRE_TIME ?? null
        },
        apiGateway: {
            path: env.__OW_PATH ?? null,
            method: env.__OW_METHOD ?? null,
            headers: env.__OW_HEADERS ? safeJson(env.__OW_HEADERS) : null,
            query: env.__OW_QUERY ? safeJson(env.__OW_QUERY) : null
        }
    };


    /* ============================================================
       6: Web Action Detection (OpenWhisk Web Actions)
       ------------------------------------------------------------
       Web actions set:
         - __OW_BODY
         - __OW_USER
         - __OW_METHOD
       ============================================================ */

    out.webAction = {
        isWebAction: !!env.__OW_METHOD,
        method: env.__OW_METHOD ?? null,
        user: env.__OW_USER ?? null,
        body:
            env.__OW_BODY && env.__OW_IS_RAW_BODY !== "true"
                ? env.__OW_BODY
                : null,
        rawBody: env.__OW_IS_RAW_BODY === "true"
            ? env.__OW_BODY
            : null
    };


    /* ============================================================
       7: IAM / STS Temporary Credentials
       ============================================================ */

    out.credentials = {
        hasCredentials:
            !!env.IBM_IAM_API_KEY || !!env.__OW_API_KEY,
        apiKey: env.IBM_IAM_API_KEY ?? null,
        owApiKeyPresent: !!env.__OW_API_KEY
    };


    /* ============================================================
       8: Docker / Container Runtime (OpenWhisk container)
       ============================================================ */

    out.container = {
        inDocker: !!env.__OW_DOCKER_IMAGE || !!env.__OW_CONTAINER,
        containerImage: env.__OW_DOCKER_IMAGE ?? null,
        containerId: env.__OW_CONTAINER_ID ?? null
    };


    /* ============================================================
       9: Composer (IBM Cloud Functions Workflow)
       ============================================================ */

    out.composer = {
        composition: env.__OW_COMPOSITION ?? null,
        state: env.__OW_COMPOSITION_STATE ?? null
    };


    /* ============================================================
       10: Local Development
       ------------------------------------------------------------
       Local OpenWhisk typically sets:
         - __OW_DEBUG
         - LOCAL_OPENWHISK
         - WHISK_API_HOST set to localhost
       ============================================================ */

    const isLocal =
        env.LOCAL_OPENWHISK === "true" ||
        env.__OW_DEBUG === "true" ||
        env.__OW_API_HOST === "localhost";

    out.localDev = {
        isLocal,
        debug: env.__OW_DEBUG === "true",
        localHost: env.__OW_API_HOST === "localhost"
    };


    /* ============================================================
       11: IBM Code Engine (Serverless containers)
       ------------------------------------------------------------
       Code Engine exposes variables starting with CE_*
       ============================================================ */

    if (env.CE_APP || env.CE_SERVICE || env.CE_SUBSCRIPTION_ID) {
        out.codeEngine = {
            inCodeEngine: true,
            app: env.CE_APP ?? null,
            service: env.CE_SERVICE ?? null,
            instanceId: env.CE_INSTANCE_ID ?? null,
            subscriptionId: env.CE_SUBSCRIPTION_ID ?? null,
            version: env.CE_VERSION ?? null
        };
    }


    /* ============================================================
       12: Raw Environment Dump
       ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("__OW_") ||
            k.startsWith("IBM_") ||
            k.startsWith("CF_") ||
            k.startsWith("CE_")
        )
    );

    return out;
}



/* Helper: safe JSON */
function safeJson(str: string) {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

/* ============================================================
   A41 — ORACLE CLOUD FUNCTIONS (Fn Project / OCI Functions)
   Full metadata, triggers, identity, image, invocation, STS
============================================================ */

export function extractOracleCloudFunctionsInfo(env: Record<string, string>) {
    const out: any = {
        isOracleFunction: false,
        function: null,
        app: null,
        region: null,
        ociIdentity: null,
        runtime: null,
        docker: null,
        gateway: null,
        resourcePrincipal: null,
        container: null,
        localDev: null,
        invoke: null,
        logging: null,
        raw: {}
    };

    /* ============================================================
       1: Fn Project Core Variables
       ------------------------------------------------------------
       Oracle Fn Project sets:
         - FN_APP_ID
         - FN_FN_ID
         - FN_APP_NAME
         - FN_FN_NAME
         - FN_MEMORY
         - FN_FORMAT (http,json,default)
         - FN_LISTENER
    ============================================================ */

    const fnSignals = [
        "FN_APP_ID",
        "FN_FN_ID",
        "FN_APP_NAME",
        "FN_FN_NAME",
        "FN_MEMORY",
        "FN_FORMAT",
        "FN_LISTENER",
        "OCI_REGION",
        "OCI_TENANCY_OCID",
        "OCI_COMPARTMENT_OCID"
    ];

    const detected = fnSignals.some(k => env[k] !== undefined);
    if (!detected) return null;

    out.isOracleFunction = true;

    /* ============================================================
       2: Function Metadata
    ============================================================ */
    out.function = {
        id: env.FN_FN_ID ?? null,
        name: env.FN_FN_NAME ?? null,
        version: env.FN_FN_VERSION ?? null,
        image: env.FN_DOCKER_IMAGE ?? null,
        entrypoint: env.FN_ENTRYPOINT ?? null,
        format: env.FN_FORMAT ?? null, // default|http|json
        timeout: env.FN_TIMEOUT ? Number(env.FN_TIMEOUT) : null,
        idleTimeout: env.FN_IDLE_TIMEOUT ? Number(env.FN_IDLE_TIMEOUT) : null,
        memoryMB: env.FN_MEMORY ? Number(env.FN_MEMORY) : null
    };

    /* ============================================================
       3: Application Metadata
    ============================================================ */
    out.app = {
        id: env.FN_APP_ID ?? null,
        name: env.FN_APP_NAME ?? null,
        config: env.FN_APP_CONFIG ? safeJson(env.FN_APP_CONFIG) : null
    };

    /* ============================================================
       4: Region + OCI Project Metadata
    ============================================================ */
    out.region = {
        region: env.OCI_REGION ?? null,
        availabilityDomain: env.OCI_AVAILABILITY_DOMAIN ?? null,
        faultDomain: env.OCI_FAULT_DOMAIN ?? null
    };

    out.ociIdentity = {
        tenancyOCID: env.OCI_TENANCY_OCID ?? null,
        compartmentOCID: env.OCI_COMPARTMENT_OCID ?? null,
        userOCID: env.OCI_USER_OCID ?? null,
        instanceOCID: env.OCI_INSTANCE_ID ?? null,
        ocirRegistry: env.OCI_REGISTRY ?? null
    };

    /* ============================================================
       5: Runtime Info (Fn Project Runtime)
    ============================================================ */

    out.runtime = {
        listenerPort: env.FN_LISTENER ?? null,
        callId: env.FN_CALL_ID ?? null,
        format: env.FN_FORMAT ?? null,     // json|http|default
        deadline: env.FN_DEADLINE ?? null,
        fnPath: env.FN_PATH ?? null,
        callUrl: env.FN_CALL_URL ?? null
    };

    /* ============================================================
       6: Docker / Container Runtime
    ============================================================ */
    out.docker = {
        image: env.FN_DOCKER_IMAGE ?? null,
        imageDigest: env.FN_IMAGE_DIGEST ?? null,
        containerId: env.FN_CONTAINER_ID ?? null,
        isContainer: !!env.FN_CONTAINER_ID || !!env.FN_DOCKER_IMAGE
    };

    /* ============================================================
       7: OCI API Gateway Integration
       ------------------------------------------------------------
       Gateway-proxied functions expose:
         - X_OCI_GATEWAY_API_ID
         - X_OCI_GATEWAY_REQUEST_ID
         - X_OCI_GATEWAY_STAGE
    ============================================================ */
    out.gateway = {
        apiId: env.X_OCI_GATEWAY_API_ID ?? null,
        requestId: env.X_OCI_GATEWAY_REQUEST_ID ?? null,
        stage: env.X_OCI_GATEWAY_STAGE ?? null,
        invokedViaAPIGateway:
            !!env.X_OCI_GATEWAY_API_ID || !!env.X_OCI_GATEWAY_REQUEST_ID
    };

    /* ============================================================
       8: Oracle Cloud Resource Principals (IAM)
       ------------------------------------------------------------
       OCI_RESOURCE_PRINCIPAL_VERSION = 2.2
       OCI_RESOURCE_PRINCIPAL_PRIVATE_KEY
       OCI_RESOURCE_PRINCIPAL_SESSION_TOKEN
    ============================================================ */
    out.resourcePrincipal = {
        version: env.OCI_RESOURCE_PRINCIPAL_VERSION ?? null,
        publicKeyPresent: !!env.OCI_RESOURCE_PRINCIPAL_PUBLIC_KEY,
        privateKeyPresent: !!env.OCI_RESOURCE_PRINCIPAL_PRIVATE_KEY,
        sessionTokenPresent: !!env.OCI_RESOURCE_PRINCIPAL_SESSION_TOKEN
    };

    /* ============================================================
       9: Invocation Mode
       ------------------------------------------------------------
       Fn I/O protocol modes:
         - pure Fn -> stdin/stdout
         - HTTP event mode (FN_FORMAT=http)
         - JSON event mode
    ============================================================ */
    out.invoke = {
        viaHttp: env.FN_FORMAT === "http",
        viaJson: env.FN_FORMAT === "json",
        viaDefault: env.FN_FORMAT === "default",
        contentType: env.FN_HTTP_CONTENT_TYPE ?? null
    };

    /* ============================================================
       10: Logging and Trace Context
    ============================================================ */
    out.logging = {
        traceId: env.OCI_TRACE_ID ?? null,
        spanId: env.OCI_SPAN_ID ?? null,
        logGroup: env.OCI_LOG_GROUP_ID ?? null,
        logStream: env.OCI_LOG_STREAM_ID ?? null
    };

    /* ============================================================
       11: Container / Sandbox Metadata
    ============================================================ */
    out.container = {
        cpuLimit: env.FN_CPU_QUOTA ?? null,
        cpuShares: env.FN_CPU_SHARES ?? null,
        cgroupPath: env.FN_CGROUP ?? null
    };

    /* ============================================================
       12: LOCAL DEV (fn start / fn invoke local)
    ============================================================ */

    const isLocal =
        env.FN_LOCAL === "true" ||
        env.FN_RUN_LOCAL === "true" ||
        env.FN_LISTENER === "unix:///tmp/fn.sock" ||
        env.FN_API_URL?.includes("localhost");

    out.localDev = {
        isLocal,
        apiUrl: env.FN_API_URL ?? null,
        configFile: env.FN_CONFIG_FILE ?? null
    };

    /* ============================================================
       13: RAW ENV VAR DUMP
    ============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("FN_") ||
            k.startsWith("OCI_") ||
            k.startsWith("X_OCI_")
        )
    );

    return out;
}


/* Helper: safe JSON */
function safeJson(str: string) {
    try { return JSON.parse(str); } catch { return str; }
}

/* ============================================================
   A42 — DIGITALOCEAN FUNCTIONS (OpenWhisk Runtime)
   Full DO + OpenWhisk environment, triggers, gateway, metadata
============================================================ */

export function extractDigitalOceanFunctionsInfo(env: Record<string, string>) {
    const out: any = {
        isDOFunction: false,
        function: null,
        namespace: null,
        region: null,
        doProject: null,
        whisk: null,
        http: null,
        triggers: null,
        container: null,
        composer: null,
        localDev: null,
        raw: {}
    };

    /* ============================================================
       1: Detect DigitalOcean Functions
       ------------------------------------------------------------
       DO-specific variables:
         - DO_FUNCTION_NAME
         - DO_FUNCTION_NAMESPACE
         - DO_REGION
       OpenWhisk variables:
         - __OW_ACTION_NAME
         - __OW_ACTIVATION_ID
    ============================================================ */

    const doSignals = [
        "DO_FUNCTION_NAME",
        "DO_FUNCTION_NAMESPACE",
        "DO_REGION",
        "__OW_ACTION_NAME",
        "__OW_ACTIVATION_ID"
    ];

    const detected = doSignals.some(k => env[k] !== undefined);
    if (!detected) return null;

    out.isDOFunction = true;


    /* ============================================================
       2: Function Metadata
    ============================================================ */

    out.function = {
        name: env.DO_FUNCTION_NAME ?? env.__OW_ACTION_NAME ?? null,
        version: env.DO_FUNCTION_VERSION ?? env.__OW_ACTION_VERSION ?? null,
        memoryMB: env.DO_FUNCTION_MEMORY
            ? Number(env.DO_FUNCTION_MEMORY)
            : env.__OW_MEMORY
                ? Number(env.__OW_MEMORY)
                : null,
        timeoutMs: env.DO_FUNCTION_TIMEOUT
            ? Number(env.DO_FUNCTION_TIMEOUT)
            : env.__OW_DEADLINE
                ? Number(env.__OW_DEADLINE)
                : null,
        dockerImage: env.DO_FUNCTION_IMAGE ?? env.__OW_DOCKER_IMAGE ?? null
    };

    /* ============================================================
       3: Namespace + Region
    ============================================================ */

    out.namespace = {
        doNamespace: env.DO_FUNCTION_NAMESPACE ?? null,
        owNamespace: env.__OW_NAMESPACE ?? null
    };

    out.region = {
        region: env.DO_REGION ?? null,
        // DO only has one region for functions (nyc1), but future-proof.
        zone: env.DO_ZONE ?? null
    };

    /* ============================================================
       4: DigitalOcean Project / Space Metadata
    ============================================================ */

    out.doProject = {
        projectId: env.DO_PROJECT_ID ?? null,
        spaceId: env.DO_SPACE_ID ?? null,
        environment: env.DO_ENVIRONMENT ?? null,
        deploymentId: env.DO_DEPLOYMENT_ID ?? null
    };

    /* ============================================================
       5: OpenWhisk Runtime Deep Context (DO is built on OW)
    ============================================================ */

    out.whisk = {
        activationId: env.__OW_ACTIVATION_ID ?? null,
        transactionId: env.__OW_TRANSACTION_ID ?? null,
        namespace: env.__OW_NAMESPACE ?? null,
        apiHost: env.__OW_API_HOST ?? null,
        deadline: env.__OW_DEADLINE ? Number(env.__OW_DEADLINE) : null,
        kind: env.__OW_KIND ?? null,
        annotations: env.__OW_ANNOTATIONS
            ? safeJson(env.__OW_ANNOTATIONS)
            : null,
        userEnv: env.__OW_ENV ? safeJson(env.__OW_ENV) : null
    };

    /* ============================================================
       6: HTTP Gateway (Full DO Function URL Invocation)
       ------------------------------------------------------------
       OpenWhisk maps DO gateway requests into:
          - __OW_METHOD
          - __OW_HEADERS
          - __OW_PATH
          - __OW_QUERY
          - __OW_BODY
    ============================================================ */

    out.http = {
        method: env.__OW_METHOD ?? null,
        path: env.__OW_PATH ?? null,
        headers: env.__OW_HEADERS ? safeJson(env.__OW_HEADERS) : null,
        query: env.__OW_QUERY ? safeJson(env.__OW_QUERY) : null,
        body:
            env.__OW_IS_RAW_BODY === "true"
                ? env.__OW_BODY // raw binary/webhook mode
                : env.__OW_BODY
                    ? safeJsonBody(env.__OW_BODY)
                    : null,
        isRawBody: env.__OW_IS_RAW_BODY === "true"
    };


    /* ============================================================
       7: Triggers (DigitalOcean uses same triggers as OpenWhisk)
       ------------------------------------------------------------
       - Cron (alarms)
       - Kafka (Event Streams)
       - Cloudant-like (DO Managed DB events)
       - Generic queue events
    ============================================================ */

    out.triggers = {
        cron: {
            cron: env.__OW_ALARM_CRON ?? null,
            fireTime: env.__OW_ALARM_FIRE_TIME ?? null
        },
        kafka: {
            topic: env.__OW_KAFKA_TOPIC ?? null,
            partition: env.__OW_KAFKA_PARTITION ?? null,
            offset: env.__OW_KAFKA_OFFSET ?? null
        },
        db: {
            table: env.__OW_DB_TABLE ?? null,
            recordId: env.__OW_DB_RECORD_ID ?? null
        }
    };


    /* ============================================================
       8: Container Runtime Metadata
    ============================================================ */

    out.container = {
        containerImage: env.__OW_DOCKER_IMAGE ?? env.DO_FUNCTION_IMAGE ?? null,
        containerId: env.__OW_CONTAINER_ID ?? null,
        cpuShares: env.__OW_CPU_SHARES ?? null,
        cpuQuota: env.__OW_CPU_QUOTA ?? null
    };


    /* ============================================================
       9: Composer / Workflows (OpenWhisk sequences)
    ============================================================ */

    out.composer = {
        composition: env.__OW_COMPOSITION ?? null,
        state: env.__OW_COMPOSITION_STATE ?? null
    };


    /* ============================================================
       10: Local Development Detection
       ------------------------------------------------------------
       DO local dev typically uses:
         - LOCAL_OPENWHISK
         - __OW_DEBUG=true
    ============================================================ */

    const isLocal =
        env.LOCAL_OPENWHISK === "true" ||
        env.__OW_DEBUG === "true" ||
        env.__OW_API_HOST === "localhost";

    out.localDev = {
        isLocal,
        debug: env.__OW_DEBUG === "true",
        localHost: env.__OW_API_HOST === "localhost"
    };


    /* ============================================================
       11: Raw Environment Dump
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("DO_") ||
            k.startsWith("__OW_")
        )
    );


    return out;
}


/* ------------------------------------------------------------
   Helper: Parse JSON bodies safely
------------------------------------------------------------ */
function safeJson(str: string) {
    try { return JSON.parse(str); } catch { return str; }
}

function safeJsonBody(str: string) {
    try { return JSON.parse(str); } catch { return str; }
}

/* ============================================================
   A43 — FLY.IO MACHINES + APPS + LITEFS + EDGE PROXY
   Full environment, network, runtime, secrets, metadata
============================================================ */

export function extractFlyIOInfo(env: Record<string, string>) {
    const out: any = {
        isFly: false,
        app: null,
        machine: null,
        region: null,
        organization: null,
        process: null,
        network: null,
        proxy: null,
        litefs: null,
        secrets: null,
        firecracker: null,
        localDev: null,
        raw: {}
    };

    /* ============================================================
       1: Detect Fly.io
       ------------------------------------------------------------
       Fly.io ALWAYS exposes:
         - FLY_APP_NAME
         - FLY_REGION
         - FLY_MACHINE_ID
         - FLY_PUBLIC_IP
         - FLY_ALLOC_ID
         - FLY_PROCESS_GROUP
    ============================================================ */

    const signals = [
        "FLY_APP_NAME",
        "FLY_REGION",
        "FLY_MACHINE_ID",
        "FLY_PUBLIC_IP",
        "FLY_ALLOC_ID"
    ];

    const detected = signals.some(k => env[k] !== undefined);
    if (!detected) return null;

    out.isFly = true;


    /* ============================================================
       2: App / Organization Metadata
    ============================================================ */

    out.app = {
        name: env.FLY_APP_NAME ?? null,
        releaseId: env.FLY_RELEASE_ID ?? null,
        releaseVersion: env.FLY_RELEASE_VERSION ?? null,
        platformVersion: env.FLY_PLATFORM_VERSION ?? null
    };

    out.organization = {
        orgSlug: env.FLY_ORG_SLUG ?? null,
        orgId: env.FLY_ORGANIZATION_ID ?? null
    };


    /* ============================================================
       3: Machine Metadata (Firecracker VM)
    ============================================================ */

    out.machine = {
        id: env.FLY_MACHINE_ID ?? null,
        allocId: env.FLY_ALLOC_ID ?? null,
        gen: env.FLY_MACHINE_GEN
            ? Number(env.FLY_MACHINE_GEN)
            : null,
        instanceId: env.FLY_INSTANCE_ID ?? null,
        processGroup: env.FLY_PROCESS_GROUP ?? null,
        imageRef: env.FLY_IMAGE_REF ?? null,
        vmSize: env.FLY_VM_SIZE ?? null,
        role: env.FLY_MACHINE_ROLE ?? null,
        checkId: env.FLY_CHECK_ID ?? null
    };


    /* ============================================================
       4: Region + Deploy Strategy
    ============================================================ */

    out.region = {
        region: env.FLY_REGION ?? null,
        primaryRegion: env.FLY_PRIMARY_REGION ?? null
    };


    /* ============================================================
       5: Network (6PN, private IPv6, WireGuard, TPROXY)
    ============================================================ */

    out.network = {
        ip6: env.FLY_PRIVATE_IP ?? null,        // 6PN address
        publicIp: env.FLY_PUBLIC_IP ?? null,
        gateway: env.FLY_GATEWAY ?? null,
        hostname: env.FLY_HOSTNAME ?? null,
        dnsRewrites: env.FLY_DNS_REWRITES ? safeJson(env.FLY_DNS_REWRITES) : null,
        ipv6Enabled: !!env.FLY_PUBLIC_IPV6,
        upstreamDns: env.FLY_UPSTREAM_DNS ?? null,
        serviceName: env.FLY_SERVICE_NAME ?? null
    };


    /* ============================================================
       6: Proxy / Edge Request Context (Fly Proxy)
       ------------------------------------------------------------
       When requests come through Fly's global proxy:
         - FLY_FORWARDED_PROTO
         - FLY_CLIENT_IP
         - FLY_FORWARDED_HOST
         - FLY_FORWARDED_PORT
         - FLY_REPLAY_SRC (replay / retry)
    ============================================================ */

    out.proxy = {
        forwardedProto: env.FLY_FORWARDED_PROTO ?? null,
        clientIp: env.FLY_CLIENT_IP ?? null,
        forwardedHost: env.FLY_FORWARDED_HOST ?? null,
        forwardedPort: env.FLY_FORWARDED_PORT ?? null,
        replaySource: env.FLY_REPLAY_SRC ?? null,
        traceId: env.FLY_TRACE_ID ?? null
    };


    /* ============================================================
       7: LiteFS (SQLite global replication)
       ------------------------------------------------------------
       LiteFS environment includes:
         - LITEFS_DIR
         - LITEFS_NODE_ID
         - LITEFS_CLUSTER
         - LITEFS_EXPORT_DIR
         - FUSE metadata
    ============================================================ */

    out.litefs = {
        enabled: !!env.LITEFS_DIR,
        dir: env.LITEFS_DIR ?? null,
        nodeId: env.LITEFS_NODE_ID ?? null,
        cluster: env.LITEFS_CLUSTER ?? null,
        leaseId: env.LEASE_ID ?? null,
        leaseExpiration: env.LEASE_EXPIRES ?? null,
        leasePrimary: env.LEASE_PRIMARY ?? null
    };


    /* ============================================================
       8: Secrets (names only, never values)
       ------------------------------------------------------------
       Fly stores secrets as:
         - FLY_SECRET_<NAME>
       We must NEVER expose secret values.
    ============================================================ */

    const secretNames = Object.keys(env)
        .filter(k => k.startsWith("FLY_SECRET_"))
        .map(k => k.replace("FLY_SECRET_", ""));

    out.secrets = {
        names: secretNames,
        count: secretNames.length
    };


    /* ============================================================
       9: Firecracker VM Metadata (low-level)
       ------------------------------------------------------------
       These appear when running inside Firecracker VM:
         - FIRECRACKER_VM_ID
         - FIRECRACKER_MAX_MEM
         - FIRECRACKER_VCPU_COUNT
    ============================================================ */

    out.firecracker = {
        vmId: env.FIRECRACKER_VM_ID ?? null,
        maxMem: env.FIRECRACKER_MAX_MEM ?? null,
        vcpu: env.FIRECRACKER_VCPU_COUNT ?? null
    };


    /* ============================================================
       10: Local Development (flyctl)
       ------------------------------------------------------------
       - FLY_LOCAL = true
       - flyctl proxy
       - dev mode machines
    ============================================================ */

    const isLocal =
        env.FLY_LOCAL === "1" ||
        env.FLYCTL_LOCAL === "1" ||
        env.FLY_APP_NAME === "local";

    out.localDev = {
        isLocal,
        flyctl: env.FLYCTL ?? null,
        flyctlPath: env.FLYCTL_PATH ?? null
    };


    /* ============================================================
       11: RAW Dump
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("FLY_") ||
            k.startsWith("LITEFS_") ||
            k.startsWith("LEASE_") ||
            k.startsWith("FIRECRACKER_")
        )
    );


    return out;
}


/* Helper: safe JSON */
function safeJson(str: string) {
    try { return JSON.parse(str); } catch { return str; }
}

/* ============================================================
   A44 — HEROKU DYNOS + REVIEW APPS + BUILDPACKS
   Full runtime, metadata, secrets, build, release, FS, metrics
============================================================ */

export function extractHerokuInfo(env: Record<string, string>) {
    const out: any = {
        isHeroku: false,
        dyno: null,
        app: null,
        release: null,
        build: null,
        runtime: null,
        filesystem: null,
        configVars: null,
        buildpacks: null,
        metrics: null,
        privateSpaces: null,
        localDev: null,
        raw: {}
    };

    /* ============================================================
       1: Detect Heroku
       ------------------------------------------------------------
       Heroku sets the following env vars:
         - DYNO
         - HEROKU_APP_ID
         - HEROKU_DYNO_ID
         - HEROKU_RELEASE_VERSION
         - HEROKU_SLUG_COMMIT
    ============================================================ */

    const signals = [
        "DYNO",
        "HEROKU_APP_ID",
        "HEROKU_DYNO_ID",
        "HEROKU_RELEASE_VERSION",
        "HEROKU_SLUG_COMMIT"
    ];

    const detected = signals.some(k => env[k] !== undefined);
    if (!detected) return null;

    out.isHeroku = true;


    /* ============================================================
       2: Dyno Metadata
       ------------------------------------------------------------
       DYNO = "web.1", "worker.2", "release", etc.
    ============================================================ */

    const dynoName = env.DYNO ?? null;
    let dynoType = null;
    let dynoNumber = null;

    if (dynoName && dynoName.includes(".")) {
        const [type, number] = dynoName.split(".");
        dynoType = type;
        dynoNumber = number;
    }

    out.dyno = {
        name: dynoName,
        type: dynoType,
        number: dynoNumber,
        dynoId: env.HEROKU_DYNO_ID ?? null,
        size: env.HEROKU_DYNO_SIZE ?? null,        // eco, standard-1x, etc
        oneOff: dynoType === "run" || dynoType === "oneoff"
    };


    /* ============================================================
       3: App Metadata
    ============================================================ */

    out.app = {
        id: env.HEROKU_APP_ID ?? null,
        name: env.HEROKU_APP_NAME ?? null,
        space: env.HEROKU_SPACE_NAME ?? null,          // Heroku Private Spaces
        pipeline: env.HEROKU_APP_PIPELINE_ID ?? null,
        repoUrl: env.HEROKU_GIT_URL ?? null,
        reviewApp: {
            isReviewApp: !!env.HEROKU_PR_NUMBER,
            prNumber: env.HEROKU_PR_NUMBER ?? null,
            branch: env.HEROKU_BRANCH ?? env.HEROKU_PR_BRANCH ?? null
        }
    };


    /* ============================================================
       4: Release Metadata
    ============================================================ */

    out.release = {
        version: env.HEROKU_RELEASE_VERSION ?? null,
        description: env.HEROKU_RELEASE_DESCRIPTION ?? null,
        createdAt: env.HEROKU_RELEASE_CREATED_AT ?? null,
        commit: env.HEROKU_SLUG_COMMIT ?? null
    };


    /* ============================================================
       5: Build Metadata
    ============================================================ */

    out.build = {
        slugId: env.HEROKU_SLUG_ID ?? null,
        slugCommit: env.HEROKU_SLUG_COMMIT ?? null,
        slugDescription: env.HEROKU_SLUG_DESCRIPTION ?? null,
        buildpackVersion: env.HEROKU_BUILD_VERSION ?? null,
        stack: env.HEROKU_STACK ?? null,               // heroku-20, heroku-22
        buildId: env.HEROKU_BUILD_ID ?? null
    };


    /* ============================================================
       6: Runtime Info
    ============================================================ */

    out.runtime = {
        runtime: env.HEROKU_RUNTIME ?? null,
        runtimeVersion: env.HEROKU_RUNTIME_VERSION ?? null,
        processType: dynoType,
        timezone: env.TZ ?? null,
        nodeEnv: env.NODE_ENV ?? null,
        port: env.PORT ? Number(env.PORT) : null
    };


    /* ============================================================
       7: Filesystem Info
       ------------------------------------------------------------
       Heroku dynos have:
         - Ephemeral FS
         - /app build layer
         - /tmp writable
    ============================================================ */

    out.filesystem = {
        ephemeral: true,                     // ALWAYS ephemeral on Heroku
        buildDir: "/app",
        writableDir: "/tmp",
        dynoMetadataDir: env.HEROKU_META_DIR ?? null
    };


    /* ============================================================
       8: Config Vars (names only!)
       ------------------------------------------------------------
       NEVER return secret values!
       Only expose variable names.
    ============================================================ */

    const configNames = Object.keys(env)
        .filter(k => !k.startsWith("HEROKU_") && !k.startsWith("DYNO"))
        .filter(k => !k.startsWith("PATH") && !k.startsWith("_"));

    out.configVars = {
        names: configNames,
        count: configNames.length
    };


    /* ============================================================
       9: Buildpacks
       ------------------------------------------------------------
       HEROKU_BUILDPACK_ORDER="[nodejs,ruby,...]"
       HEROKU_BUILDPACK_URL_n
    ============================================================ */

    const buildpacks: string[] = [];

    if (env.HEROKU_BUILDPACK_ORDER) {
        try {
            buildpacks.push(...JSON.parse(env.HEROKU_BUILDPACK_ORDER));
        } catch {
            buildpacks.push(env.HEROKU_BUILDPACK_ORDER);
        }
    }

    // Format HEROKU_BUILDPACK_URL_1, etc.
    const numbered = Object.entries(env)
        .filter(([k]) => k.startsWith("HEROKU_BUILDPACK_URL_"))
        .map(([k, v]) => v);

    buildpacks.push(...numbered);

    out.buildpacks = Array.from(new Set(buildpacks));


    /* ============================================================
       10: Metrics Agent
       ------------------------------------------------------------
       Heroku runtime metrics agent environment:
         - HEROKU_METRICS_URL
         - HEROKU_APP_DYNO
         - HEROKU_RUNTIME
    ============================================================ */

    out.metrics = {
        metricsUrl: env.HEROKU_METRICS_URL ?? null,
        dynoName: env.HEROKU_APP_DYNO ?? null
    };


    /* ============================================================
       11: Private Spaces / Shield
       ------------------------------------------------------------
       Variables appear:
         - HEROKU_PRIVATE_SPACES
         - HEROKU_SHIELD
    ============================================================ */

    out.privateSpaces = {
        isPrivateSpace: env.HEROKU_PRIVATE_SPACE === "true",
        isShieldApp: env.HEROKU_SHIELD === "true",
        spaceName: env.HEROKU_SPACE_NAME ?? null
    };


    /* ============================================================
       12: Local Dev Detection (heroku local)
    ============================================================ */

    const isLocal =
        env.HEROKU_LOCAL === "true" ||
        env.HEROKU_ENV === "local" ||
        !env.DYNO; // locally you don't get DYNO

    out.localDev = {
        isLocal,
        procfile: env.HEROKU_PROCFILE ?? null
    };


    /* ============================================================
       13: Raw Heroku Vars
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("HEROKU_") || k === "DYNO"
        )
    );


    return out;
}

/* ============================================================
   A45 — RENDER.COM Web Services / Workers / Cron / PR Previews
   Full detection of all Render signals, runtime, plans, routing,
   instance metadata, build vs runtime separation, preview builds.
============================================================ */

export function extractRenderInfo(env: Record<string, string>) {
    const out: any = {
        isRender: false,
        service: null,
        deployment: null,
        runtime: null,
        preview: null,
        disk: null,
        plan: null,
        git: null,
        raw: {}
    };

    /* ============================================================
       1 — Detect Render
       ------------------------------------------------------------
       Render *only* exposes:
         RENDER = "true"
         RENDER_SERVICE_ID
         RENDER_SERVICE_SLUG
         RENDER_INSTANCE_ID
         RENDER_GIT_BRANCH, RENDER_GIT_COMMIT, etc.
    ============================================================ */

    const keys = [
        "RENDER",
        "RENDER_SERVICE_ID",
        "RENDER_SERVICE_NAME",
        "RENDER_SERVICE_SLUG",
        "RENDER_INSTANCE_ID",
        "RENDER_GIT_BRANCH",
        "RENDER_GIT_COMMIT",
        "RENDER_GIT_REPO",
        "RENDER_GIT_OWNER",
        "RENDER_GIT_ROOT"
    ];

    if (keys.some(k => env[k] !== undefined)) {
        out.isRender = true;
    } else {
        return null;
    }


    /* ============================================================
       2 — Service Metadata
    ============================================================ */

    out.service = {
        id: env.RENDER_SERVICE_ID ?? null,
        name: env.RENDER_SERVICE_NAME ?? null,
        slug: env.RENDER_SERVICE_SLUG ?? null,
        instanceId: env.RENDER_INSTANCE_ID ?? null,
        instanceName: env.RENDER_INSTANCE_NAME ?? null,

        // Web / Worker / Cron are not explicitly declared by Render.
        // We infer based on env + process.
        type: detectRenderServiceType(env)
    };


    /* ============================================================
       3 — Deployment Metadata
    ============================================================ */

    out.deployment = {
        deployId: env.RENDER_DEPLOY_ID ?? null,
        deployCreatedAt: env.RENDER_DEPLOY_CREATED_AT ?? null,
        deployType: env.RENDER_DEPLOY_TYPE ?? null,     // "manual", "commit", "api"
        deployOrigin: env.RENDER_DEPLOY_ORIGIN ?? null,
    };


    /* ============================================================
       4 — Git Metadata
    ============================================================ */

    out.git = {
        repo: env.RENDER_GIT_REPO ?? null,
        owner: env.RENDER_GIT_OWNER ?? null,
        root: env.RENDER_GIT_ROOT ?? null,
        branch: env.RENDER_GIT_BRANCH ?? null,
        commit: env.RENDER_GIT_COMMIT ?? null,
        commitMessage: env.RENDER_GIT_COMMIT_MESSAGE ?? null,
        commitTimestamp: env.RENDER_GIT_COMMIT_TIMESTAMP ?? null,
    };


    /* ============================================================
       5 — Runtime Metadata
       ------------------------------------------------------------
       Render does NOT expose plan or region directly.
       We infer region & plan from patterns.
    ============================================================ */

    out.runtime = {
        renderInternalHost: env.RENDER_EXTERNAL_HOSTNAME ?? null,
        region: inferRenderRegion(env),
        isInContainer: detectContainerRuntime(),
        isBuildPhase: !!env.RENDER_BUILD ?? false,
        isRuntimePhase: env.RENDER === "true",
    };


    /* ============================================================
       6 — Preview Deploys / PR Previews
       ------------------------------------------------------------
       Render sets:
           RENDER_PREVIEW = "true"
           RENDER_PR_NUMBER
           RENDER_PR_URL
    ============================================================ */

    out.preview = {
        isPreview: env.RENDER_PREVIEW === "true",
        prNumber: env.RENDER_PR_NUMBER ?? null,
        prUrl: env.RENDER_PR_URL ?? null,
    };


    /* ============================================================
       7 — Persistent Disk Detection
       ------------------------------------------------------------
       Render mounts disks under /var/www/data or /mnt/data
    ============================================================ */

    out.disk = {
        hasDisk:
            (env.RENDER_DISK === "true") ||
            fs.existsSync("/var/www/data") ||
            fs.existsSync("/mnt/data"),
        mountPath: fs.existsSync("/var/www/data")
            ? "/var/www/data"
            : fs.existsSync("/mnt/data")
                ? "/mnt/data"
                : null
    };


    /* ============================================================
       8 — Plan / Instance Type Inference
       ------------------------------------------------------------
       Render does NOT expose machine type directly.
       We infer from:
         - CPU count
         - RAM if exposed by cgroups
         - Instance ID prefix
    ============================================================ */

    out.plan = inferRenderPlan();


    /* ============================================================
       9 — Raw Dump
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("RENDER"))
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

/* -----------------------------------------
   Detect service type
----------------------------------------- */
function detectRenderServiceType(env: Record<string, string>) {
    if (env.RENDER_CRON) return "cron";
    if (env.RENDER_WORKER === "true") return "worker";
    if (env.RENDER_WEB_SERVICE === "true") return "web";

    // Heuristic:
    if (env.PORT) return "web";

    return "unknown";
}


/* -----------------------------------------
   Infer Region (Render does not expose region)
----------------------------------------- */
function inferRenderRegion(env: Record<string, string>) {
    // Render regions are encoded inside service URLs sometimes
    const host = env.RENDER_EXTERNAL_HOSTNAME;

    if (!host) return null;

    if (host.includes("oregon")) return "oregon";
    if (host.includes("frankfurt")) return "frankfurt";
    if (host.includes("singapore")) return "singapore";

    // fallback for new/unknown regions
    return null;
}


/* -----------------------------------------
   Detect container runtime (Docker / CGroup)
----------------------------------------- */
function detectContainerRuntime() {
    try {
        if (fs.existsSync("/.dockerenv")) return true;
        if (fs.existsSync("/proc/1/cgroup")) return true;
    } catch { }

    return false;
}


/* -----------------------------------------
   Infer plan via CPU / memory heuristics
----------------------------------------- */
function inferRenderPlan() {
    const os = require("os");

    const cpuCount = os.cpus()?.length ?? 1;

    if (cpuCount <= 1) return "starter";
    if (cpuCount <= 2) return "standard";
    if (cpuCount <= 4) return "pro";
    if (cpuCount >= 8) return "enterprise";

    return "unknown";
}

/* ============================================================
   A46 — DIGITALOCEAN APP PLATFORM / FUNCTIONS / WORKERS
   Full detection of all DO signals, app types, functions,
   build environments, deployment metadata, droplets, k8s.
============================================================ */

import fs from "fs";
import os from "os";

export function extractDigitalOceanInfo(env: Record<string, string>) {
    const out: any = {
        isDigitalOcean: false,
        appPlatform: null,
        functions: null,
        deployment: null,
        git: null,
        region: null,
        component: null,
        plan: null,
        runtime: null,
        k8s: null,
        droplet: null,
        raw: {}
    };

    /* ============================================================
       1 — DETECT IF ANY DIGITALOCEAN SIGNAL EXISTS
       ------------------------------------------------------------
       DO App Platform sets:
         - DO_APP_ID
         - DO_DEPLOYMENT_ID
         - DO_COMPONENT
         - DO_REGION
         - DO_APP_NAME
         - DOFunctions set: DO_FUNCTION_NAME
    ============================================================ */

    const keys = [
        "DO_APP_ID",
        "DO_APP_NAME",
        "DO_DEPLOYMENT_ID",
        "DO_COMPONENT",
        "DO_REGION",
        "DO_STAGE",
        "DO_FUNCTION_NAME",
        "DO_FUNCTION_VERSION",
        "K_SERVICE", // Cloud Run compatibility layer (DO Functions Gen 2)
        "OPENFAAS_URL", // DO Functions original runtime
    ];

    if (!keys.some(k => env[k])) {
        // No DO detected
        return null;
    }

    out.isDigitalOcean = true;


    /* ============================================================
       2 — DO APP PLATFORM METADATA
    ============================================================ */

    out.appPlatform = {
        appId: env.DO_APP_ID ?? null,
        appName: env.DO_APP_NAME ?? null,
        service: env.DO_COMPONENT ?? null,
        stage: env.DO_STAGE ?? null,   // deploy stage (build / deploy / run)
    };


    /* ============================================================
       3 — FUNCTIONS (Serverless)
       ------------------------------------------------------------
       DO Functions expose:
         DO_FUNCTION_NAME
         DO_FUNCTION_VERSION
         DO_FUNCTION_TRIGGER
         DO_REGION
         OPENFAAS_URL (original DO Functions implementation)
    ============================================================ */

    if (env.DO_FUNCTION_NAME || env.OPENFAAS_URL) {
        out.functions = {
            name: env.DO_FUNCTION_NAME ?? null,
            version: env.DO_FUNCTION_VERSION ?? null,
            trigger: env.DO_FUNCTION_TRIGGER ?? null, // http / scheduled
            openfaas: !!env.OPENFAAS_URL,
            kService: env.K_SERVICE ?? null, // DO Functions Gen2 (CloudRun runtimes)
        };
    }


    /* ============================================================
       4 — DEPLOYMENT METADATA
       ------------------------------------------------------------
       App Platform:
         DO_DEPLOYMENT_ID
         DO_DEPLOYMENT_SHA
         DO_DEPLOYMENT_TIMESTAMP
    ============================================================ */

    out.deployment = {
        id: env.DO_DEPLOYMENT_ID ?? null,
        sha: env.DO_DEPLOYMENT_SHA ?? null,
        ts: env.DO_DEPLOYMENT_TIMESTAMP ?? null,
        stage: env.DO_STAGE ?? null
    };


    /* ============================================================
       5 — GIT METADATA
    ============================================================ */

    out.git = {
        repo: env.DO_GIT_REPOSITORY ?? null,
        branch: env.DO_GIT_BRANCH ?? null,
        commit: env.DO_GIT_SHA ?? null,
        commitMsg: env.DO_GIT_MESSAGE ?? null,
        commitUser: env.DO_GIT_COMMITTER ?? null,
    };


    /* ============================================================
       6 — REGION (MULTIPLE SOURCES)
       ------------------------------------------------------------
       DO App Platform: DO_REGION
       DO Functions:     DO_REGION
       DO internal hosting: extract from deployment ID
    ============================================================ */

    out.region =
        env.DO_REGION ??
        inferDORegionFromDeployment(env.DO_DEPLOYMENT_ID) ??
        null;


    /* ============================================================
       7 — COMPONENT / SERVICE TYPE DETECTION
       ------------------------------------------------------------
       DO app platform supports:
        - web service
        - worker
        - static site
        - cron tasks
        - background workers
    ============================================================ */

    out.component = detectDOComponent(env);


    /* ============================================================
       8 — PLAN DETECTION (HEURISTIC)
       ------------------------------------------------------------
       DO does NOT expose plan directly.
       Infer based on CPU count, memory, etc.
    ============================================================ */

    out.plan = inferDOPlan();


    /* ============================================================
       9 — RUNTIME DETAILS
       ------------------------------------------------------------
       DO App Platform usually runs on container-based runtime.
       Detect via:
         - cgroups
         - /.dockerenv
    ============================================================ */

    out.runtime = {
        inContainer: detectDockerContainer(),
        buildStage: env.DO_STAGE === "build",
        runStage: env.DO_STAGE === "run"
    };


    /* ============================================================
       10 — DIGITALOCEAN KUBERNETES (DOKS)
       ------------------------------------------------------------
       Detect DOKS cluster nodes/pods.
    ============================================================ */

    out.k8s = detectDOKubernetes(env);


    /* ============================================================
       11 — DROPLET HEURISTIC
       ------------------------------------------------------------
       DO Droplets do NOT set env vars.
       Detect via metadata files.
    ============================================================ */

    out.droplet = detectDODroplet();


    /* ============================================================
       12 — RAW ENV
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("DO_") || k.startsWith("OPENFAAS"))
    );

    return out;
}

/* ============================================================
   HELPERS
============================================================ */

/* -----------------------------------------
   Detect DO Component type
----------------------------------------- */
function detectDOComponent(env: Record<string, string>) {
    if (env.DO_COMPONENT_TYPE) return env.DO_COMPONENT_TYPE;

    const comp = env.DO_COMPONENT?.toLowerCase() ?? "";

    if (comp.includes("web")) return "web";
    if (comp.includes("worker")) return "worker";
    if (comp.includes("cron")) return "cron";
    if (comp.includes("static")) return "static site";

    if (env.DO_FUNCTION_NAME) return "function";

    return "unknown";
}

/* -----------------------------------------
   Infer region from DO deployment ID
----------------------------------------- */
function inferDORegionFromDeployment(id?: string) {
    if (!id) return null;

    // DO encodes region in deploy ID prefix
    if (id.startsWith("nyc")) return "nyc";
    if (id.startsWith("sfo")) return "sfo";
    if (id.startsWith("ams")) return "ams";
    if (id.startsWith("sgp")) return "sgp";
    if (id.startsWith("blr")) return "blr";
    if (id.startsWith("fra")) return "fra";

    return null;
}

/* -----------------------------------------
   Infer DO Plan (CPU heuristic)
----------------------------------------- */
function inferDOPlan() {
    const cpu = os.cpus()?.length ?? 1;

    if (cpu <= 1) return "basic";
    if (cpu <= 2) return "professional";
    if (cpu <= 4) return "enterprise-small";
    if (cpu >= 8) return "enterprise-large";

    return "unknown";
}

/* -----------------------------------------
   Detect Docker container
----------------------------------------- */
function detectDockerContainer() {
    try {
        if (fs.existsSync("/.dockerenv")) return true;
        if (fs.existsSync("/proc/1/cgroup")) {
            const cg = fs.readFileSync("/proc/1/cgroup", "utf8");
            return cg.includes("docker") || cg.includes("kubepods");
        }
    } catch { }
    return false;
}

/* -----------------------------------------
   Detect DOKS (DigitalOcean Kubernetes)
----------------------------------------- */
function detectDOKubernetes(env: Record<string, string>) {
    // DOKS sets "KUBERNETES_SERVICE_HOST"
    if (env.KUBERNETES_SERVICE_HOST) {
        return {
            inDOKS: true,
            namespace: env.KUBERNETES_NAMESPACE ?? null,
            pod: env.HOSTNAME ?? null
        };
    }
    return null;
}

/* -----------------------------------------
   Detect Droplet (Heuristic)
----------------------------------------- */
function detectDODroplet() {
    try {
        // DO metadata service
        if (fs.existsSync("/etc/default/digitalocean")) {
            return { isDroplet: true };
        }

        // older DO images
        if (fs.existsSync("/var/lib/cloud/seed/nocloud-net/meta-data")) {
            const meta = fs.readFileSync("/var/lib/cloud/seed/nocloud-net/meta-data", "utf8");
            if (meta.includes("digitalocean")) return { isDroplet: true };
        }
    } catch { }
    return null;
}

/* ============================================================
   A47 — Platform.sh Environment Detector (FULL COVERAGE)
   Supports all:
     - Web app containers
     - Workers
     - Cron tasks
     - Build hook (build phase)
     - Deploy hook (deploy phase)
     - Runtime phase
     - Multi-app projects
     - Relationships (DB, Redis, Solr, Kafka, etc.)
============================================================ */

import fs from "fs";
import os from "os";

export function extractPlatformShInfo(env: Record<string, string>) {
    const out: any = {
        isPlatformSh: false,
        app: null,
        project: null,
        environment: null,
        routes: null,
        relationships: null,
        variables: null,
        buildInfo: null,
        deployInfo: null,
        runtimeInfo: null,
        preview: null,
        region: null,
        plan: null,
        git: null,
        raw: {}
    };

    /* ============================================================
       1 — BASIC DETECTION
       ------------------------------------------------------------
       True Platform.sh env vars:
         - PLATFORM_PROJECT
         - PLATFORM_ENVIRONMENT
         - PLATFORM_APPLICATION_NAME
         - PLATFORM_RELATIONSHIPS
    ============================================================ */

    const keys = [
        "PLATFORM_PROJECT",
        "PLATFORM_BRANCH",
        "PLATFORM_ENVIRONMENT",
        "PLATFORM_APPLICATION_NAME",
        "PLATFORM_RELATIONSHIPS",
        "PLATFORM_ROUTES",
        "PLATFORM_VARIABLES",
        "PLATFORM_APPLICATION",
        "PLATFORM_TREE_ID",
    ];

    if (!keys.some(k => env[k])) return null;

    out.isPlatformSh = true;


    /* ============================================================
       2 — PROJECT INFO
    ============================================================ */

    out.project = {
        id: env.PLATFORM_PROJECT ?? null,
        treeId: env.PLATFORM_TREE_ID ?? null,
        applicationName: env.PLATFORM_APPLICATION_NAME ?? null,
    };


    /* ============================================================
       3 — ENVIRONMENT INFO
       ------------------------------------------------------------
       Platform.sh environments are Git branches
    ============================================================ */

    out.environment = {
        id: env.PLATFORM_ENVIRONMENT ?? null,
        branch: env.PLATFORM_BRANCH ?? null,
        environmentType: detectEnvironmentType(env), // master / dev / PR / preview
        isMaster: env.PLATFORM_BRANCH === "master",
        isPreview: env.PLATFORM_ENVIRONMENT?.includes("pr-") ?? false,
    };


    /* ============================================================
       4 — PREVIEW / PR DETECTION
    ============================================================ */

    out.preview = detectPreview(env);


    /* ============================================================
       5 — ROUTES (JSON)
    ============================================================ */

    out.routes = safeParseJSON(env.PLATFORM_ROUTES);


    /* ============================================================
       6 — RELATIONSHIPS (JSON)
       ------------------------------------------------------------
       DBs, Redis, Elasticsearch, Solr, RabbitMQ, Kafka, Heavily nested
    ============================================================ */

    out.relationships = safeParseJSON(env.PLATFORM_RELATIONSHIPS);


    /* ============================================================
       7 — VARIABLES (JSON)
    ============================================================ */

    out.variables = safeParseJSON(env.PLATFORM_VARIABLES);


    /* ============================================================
       8 — APPLICATION DEFINITION (JSON)
       ------------------------------------------------------------
       Contains build + deploy hooks, web config, workers
    ============================================================ */

    out.app = safeParseJSON(env.PLATFORM_APPLICATION);


    /* ============================================================
       9 — BUILD / DEPLOY / RUNTIME PHASE DETECTION
    ============================================================ */

    out.buildInfo = {
        isBuild: env.PIPELINE_STAGE === "build",
        buildTime: env.PLATFORM_BUILD_TIME ?? null,
    };

    out.deployInfo = {
        isDeploy: env.PIPELINE_STAGE === "deploy",
        deployId: env.PLATFORM_DEPLOY_ID ?? null,
        deployTime: env.PLATFORM_DEPLOY_TIME ?? null,
    };

    out.runtimeInfo = {
        isRuntime: env.PIPELINE_STAGE === "runtime" || (!env.PIPELINE_STAGE && env.PLATFORM_ENVIRONMENT),
        containerCpu: os.cpus()?.length ?? null,
        containerMemory: detectContainerMemory(),
    };


    /* ============================================================
       10 — REGION DETECTION
       ------------------------------------------------------------
       Region encoded in PLATFORM_PROJECT variable suffix:
         - "us"   => USA
         - "eu"   => Europe
         - "au"   => Australia
         - "ca"   => Canada
         - "uk"   => United Kingdom
         - "ap"   => Asia Pacific
         - etc.
    ============================================================ */

    out.region = inferPlatformRegion(env.PLATFORM_PROJECT);


    /* ============================================================
       11 — PLAN DETECTION (CPU/Memory heuristic)
    ============================================================ */

    out.plan = inferPlatformShPlan();


    /* ============================================================
       12 — GIT DETECTION
    ============================================================ */

    out.git = {
        commit: env.PLATFORM_TREE_ID ?? null,
        branch: env.PLATFORM_BRANCH ?? null,
        repo: inferGitRepoFromVariables(out.variables),
    };


    /* ============================================================
       13 — RAW DUMP
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("PLATFORM_"))
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

function safeParseJSON(str?: string) {
    if (!str) return null;
    try { return JSON.parse(str); }
    catch { return null; }
}


function detectEnvironmentType(env: Record<string, string>) {
    const e = env.PLATFORM_ENVIRONMENT ?? "";
    if (e === "master") return "production";
    if (e.startsWith("pr-")) return "preview";
    if (env.PLATFORM_BRANCH && env.PLATFORM_BRANCH !== "master") return "development";
    return "unknown";
}


function detectPreview(env: Record<string, string>) {
    return {
        isPreview: env.PLATFORM_ENVIRONMENT?.startsWith("pr-") ?? false,
        prNumber: extractPRNumber(env.PLATFORM_ENVIRONMENT),
        url: extractPRRoute(env.PLATFORM_ROUTES)
    };
}

function extractPRNumber(envId?: string) {
    if (!envId) return null;
    if (envId.startsWith("pr-")) return Number(envId.replace("pr-", ""));
    return null;
}

function extractPRRoute(routesJson?: string) {
    const routes = safeParseJSON(routesJson);
    if (!routes || !Array.isArray(routes)) return null;

    for (const r of routes) {
        if (r.serialized?.includes("pr-")) return r.url ?? null;
    }
    return null;
}


/* -----------------------------------------
   Region inference
----------------------------------------- */
function inferPlatformRegion(projectId?: string) {
    if (!projectId) return null;

    const lower = projectId.toLowerCase();

    if (lower.endsWith("eu")) return "eu";
    if (lower.endsWith("us")) return "us";
    if (lower.endsWith("au")) return "australia";
    if (lower.endsWith("ca")) return "canada";
    if (lower.endsWith("uk")) return "united-kingdom";
    if (lower.endsWith("ap")) return "asia-pacific";

    return null;
}


/* -----------------------------------------
   Detect container memory via cgroup
----------------------------------------- */
function detectContainerMemory() {
    try {
        const mem = fs.readFileSync("/sys/fs/cgroup/memory/memory.limit_in_bytes", "utf8");
        return parseInt(mem.trim(), 10);
    } catch { }
    return null;
}


/* -----------------------------------------
   Infer plan by CPU
----------------------------------------- */
function inferPlatformShPlan() {
    const cpu = os.cpus()?.length ?? 1;
    if (cpu <= 1) return "basic";
    if (cpu <= 2) return "standard";
    if (cpu <= 4) return "pro";
    if (cpu >= 8) return "enterprise";
    return "unknown";
}


/* -----------------------------------------
   Git repository inference from Platform Variables
----------------------------------------- */
function inferGitRepoFromVariables(vars: any) {
    if (!vars) return null;

    // Typical example:
    // variables.git.repository.url = "https://github.com/user/repo.git"
    if (vars.git?.repository?.url) return vars.git.repository.url;

    return null;
}

/* ============================================================
   A48 — HEROKU ENVIRONMENT DETECTOR (FULL COVERAGE)
   Supports:
     - Web dynos
     - Worker dynos
     - Release phase
     - One-off "run" dynos
     - Review Apps
     - Pipelines
     - Shield / Private Spaces
     - Build phase detection
     - Heroku Git metadata
     - Add-ons: Redis, Postgres, Kafka, etc.
============================================================ */

import fs from "fs";
import os from "os";

export function extractHerokuInfo(env: Record<string, string>) {
    const out: any = {
        isHeroku: false,
        dyno: null,
        app: null,
        release: null,
        pipeline: null,
        git: null,
        region: null,
        addons: null,
        build: null,
        runtime: null,
        system: null,
        raw: {}
    };

    /* ============================================================
       1 — DETECT HEROKU
       ------------------------------------------------------------
       Heroku always sets:
         DYNO
         PORT
         HEROKU_APP_ID
         HEROKU_DYNO_ID
         HEROKU_RELEASE_VERSION
         HEROKU_SLUG_COMMIT
    ============================================================ */

    const herokuSignals = [
        "HEROKU_APP_ID",
        "DYNO",
        "PORT",
        "HEROKU_SLUG_COMMIT",
        "HEROKU_RELEASE_VERSION",
        "HEROKU_DYNO_ID",
        "HEROKU_APP_NAME",
        "HEROKU_APP_DIR",
        "HEROKU_RELEASE_CREATED_AT",
        "HEROKU_AVAILABLE_MEMORY"
    ];

    if (!herokuSignals.some(k => env[k])) return null;

    out.isHeroku = true;


    /* ============================================================
       2 — DYNO INFO
       ------------------------------------------------------------
       dyno types:
         web.1
         worker.1
         release
         run.1234
    ============================================================ */

    out.dyno = detectDyno(env);


    /* ============================================================
       3 — APP INFO
    ============================================================ */

    out.app = {
        id: env.HEROKU_APP_ID ?? null,
        name: env.HEROKU_APP_NAME ?? null,
        directory: env.HEROKU_APP_DIR ?? null
    };


    /* ============================================================
       4 — RELEASE INFO
    ============================================================ */

    out.release = {
        version: env.HEROKU_RELEASE_VERSION ?? null,
        createdAt: env.HEROKU_RELEASE_CREATED_AT ?? null,
        slugCommit: env.HEROKU_SLUG_COMMIT ?? null,
        slugDescription: env.HEROKU_SLUG_DESCRIPTION ?? null,
        releasePhase: out.dyno.type === "release",
    };


    /* ============================================================
       5 — PIPELINE / REVIEW APPS
       ------------------------------------------------------------
       Heroku Review Apps set:
         HEROKU_TEST_RUN_NUMBER
         HEROKU_PR_NUMBER
         HEROKU_BRANCH
    ============================================================ */

    out.pipeline = {
        isReviewApp: !!env.HEROKU_TEST_RUN_NUMBER || !!env.HEROKU_PR_NUMBER,
        testRunNumber: env.HEROKU_TEST_RUN_NUMBER ?? null,
        prNumber: env.HEROKU_PR_NUMBER ?? null,
        branch: env.HEROKU_BRANCH ?? null,
    };


    /* ============================================================
       6 — GIT METADATA
    ============================================================ */

    out.git = {
        commit: env.HEROKU_SLUG_COMMIT ?? null,
        description: env.HEROKU_SLUG_DESCRIPTION ?? null,
        branch: env.HEROKU_BRANCH ?? null
    };


    /* ============================================================
       7 — REGION DETECTION
       ------------------------------------------------------------
       Heroku does not expose region directly.
       Infer by patterns:
         - runtime hostname ends with “compute-1.amazonaws.com” => US
         - slug IDs sometimes encode region
    ============================================================ */

    out.region = inferHerokuRegion(env);


    /* ============================================================
       8 — ADD-ONS (DATABASES, REDIS, KAFKA)
       ------------------------------------------------------------
       Detect Postgres, Redis, Kafka, MQ, etc.
    ============================================================ */

    out.addons = detectHerokuAddons(env);


    /* ============================================================
       9 — BUILD INFO
       ------------------------------------------------------------
       Heuristic for build environment vs run environment:
         BUILD_DIR set during slug compile
         NODE_HOME or stack info
    ============================================================ */

    out.build = {
        isBuildPhase: detectBuildPhase(env),
        stack: env.HEROKU_STACK ?? null,
        availableMemory: env.HEROKU_AVAILABLE_MEMORY ?? null
    };


    /* ============================================================
       10 — RUNTIME INFO
       ------------------------------------------------------------
       Includes container metrics, port binding, etc.
    ============================================================ */

    out.runtime = {
        port: env.PORT ?? null,
        dynoId: env.HEROKU_DYNO_ID ?? null,
        cpuCount: os.cpus()?.length ?? null,
        memoryLimit: detectCgroupMemory(),
        inContainer: detectDocker()
    };


    /* ============================================================
       11 — SYSTEM INFO
       ============================================================ */

    out.system = {
        os: process.platform,
        arch: process.arch,
        uptime: process.uptime()
    };


    /* ============================================================
       12 — RAW
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("HEROKU_") || k === "DYNO" || k === "PORT"
        )
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

/* -----------------------------------------
   Detect dyno type
----------------------------------------- */
function detectDyno(env: Record<string, string>) {
    const dyno = env.DYNO ?? "";
    if (!dyno) return { type: "unknown", name: null };

    if (dyno.startsWith("web.")) return { type: "web", name: dyno };
    if (dyno.startsWith("worker.")) return { type: "worker", name: dyno };
    if (dyno === "release") return { type: "release", name: dyno };
    if (dyno.startsWith("run.")) return { type: "one-off", name: dyno };

    return { type: "unknown", name: dyno };
}


/* -----------------------------------------
   Infer Heroku region
----------------------------------------- */
function inferHerokuRegion(env: Record<string, string>) {
    const host = os.hostname().toLowerCase();

    // US (common)
    if (host.includes("compute-1")) return "us";

    // EU (Heroku EU region)
    if (host.includes("eu-west")) return "eu";

    // default fallback
    return null;
}


/* -----------------------------------------
   Add-ons detection (DATABASE_URL, REDIS_URL, KAFKA_URL, MQ_URL)
----------------------------------------- */
function detectHerokuAddons(env: Record<string, string>) {
    const addons: any = {};

    const db = env.DATABASE_URL ?? env.HEROKU_POSTGRESQL_URL;
    const redis = env.REDIS_URL ?? env.HEROKU_REDIS_URL;
    const kafka = env.KAFKA_URL;
    const mq = env.CLOUDAMQP_URL;

    if (db) addons.postgres = db;
    if (redis) addons.redis = redis;
    if (kafka) addons.kafka = kafka;
    if (mq) addons.amqp = mq;

    return addons;
}


/* -----------------------------------------
   Detect if in build phase
----------------------------------------- */
function detectBuildPhase(env: Record<string, string>) {
    return !!env.BUILD_DIR ||
        !!env.SOURCE_VERSION ||
        !!env.HEROKU_SLUG_COMPILE;
}


/* -----------------------------------------
   Detect Docker / container runtime
----------------------------------------- */
function detectDocker() {
    try {
        if (fs.existsSync("/.dockerenv")) return true;
        const cg = fs.readFileSync("/proc/1/cgroup", "utf8");
        return cg.includes("docker") || cg.includes("kubepods");
    } catch { }
    return false;
}


/* -----------------------------------------
   Detect memory from cgroup
----------------------------------------- */
function detectCgroupMemory() {
    try {
        const mem = fs.readFileSync("/sys/fs/cgroup/memory/memory.limit_in_bytes", "utf8");
        return parseInt(mem.trim(), 10);
    } catch { }
    return null;
}

/* ============================================================
   A49 — RAILWAY.APP ENVIRONMENT DETECTOR (FULL COVERAGE)
   Supports:
     - Old Railway Deployments
     - New Railway V2 Environments
     - Plugins (Postgres, Redis, Kafka, Mongo, QStash, etc.)
     - Preview Environments
     - Branch-based deployments
     - Cron jobs
     - Static hosting
     - Railway Build environments (Nixpacks / Docker)
     - Railway CLI / local dev
============================================================ */

import fs from "fs";
import os from "os";

export function extractRailwayInfo(env: Record<string, string>) {
    const out: any = {
        isRailway: false,
        project: null,
        service: null,
        deployment: null,
        preview: null,
        git: null,
        region: null,
        runtime: null,
        build: null,
        cron: null,
        plugins: null,
        plan: null,
        localDev: null,
        raw: {}
    };

    /* ============================================================
       1 — DETECT RAILWAY
       ------------------------------------------------------------
       Railway exposes (at least one of):
         - RAILWAY_PROJECT_ID
         - RAILWAY_SERVICE_ID
         - RAILWAY_ENVIRONMENT
         - RAILWAY_DEPLOYMENT_ID
         - RAILWAY_STATIC_URL
         - RAW: RAILWAY_*
    ============================================================ */

    const keys = [
        "RAILWAY_PROJECT_ID",
        "RAILWAY_SERVICE_ID",
        "RAILWAY_ENVIRONMENT",
        "RAILWAY_DEPLOYMENT_ID",
        "RAILWAY_STATIC_URL",
        "RAILWAY_BUILD",
        "RAILWAY_SERVICE_NAME"
    ];

    if (!keys.some(k => env[k])) return null;

    out.isRailway = true;


    /* ============================================================
       2 — PROJECT
    ============================================================ */

    out.project = {
        id: env.RAILWAY_PROJECT_ID ?? null,
        name: env.RAILWAY_PROJECT_NAME ?? null,
        workspace: env.RAILWAY_WORKSPACE_ID ?? null,
        environment: env.RAILWAY_ENVIRONMENT ?? null
    };


    /* ============================================================
       3 — SERVICE METADATA
    ============================================================ */

    out.service = {
        id: env.RAILWAY_SERVICE_ID ?? null,
        name: env.RAILWAY_SERVICE_NAME ?? null,
        serviceType: detectRailwayServiceType(env),
        port: env.PORT ?? null
    };


    /* ============================================================
       4 — DEPLOYMENT METADATA
    ============================================================ */

    out.deployment = {
        id: env.RAILWAY_DEPLOYMENT_ID ?? null,
        time: env.RAILWAY_DEPLOYMENT_TIMESTAMP ?? null,
        source: env.RAILWAY_DEPLOYMENT_SOURCE ?? null,
        version: env.RAILWAY_DEPLOYMENT_VERSION ?? null,
        generation: env.RAILWAY_GENERATION ?? null
    };


    /* ============================================================
       5 — GIT METADATA
    ============================================================ */

    out.git = {
        repo: env.RAILWAY_GIT_REPOSITORY ?? null,
        branch: env.RAILWAY_GIT_BRANCH ?? null,
        commit: env.RAILWAY_GIT_COMMIT_SHA ?? null,
        message: env.RAILWAY_GIT_COMMIT_MESSAGE ?? null,
        author: env.RAILWAY_GIT_AUTHOR ?? null
    };


    /* ============================================================
       6 — PREVIEW ENVIRONMENTS
       ------------------------------------------------------------
       Branch-based Vercel-like:
         RAILWAY_GIT_PR_NUMBER
         RAILWAY_GIT_BRANCH
         RAILWAY_PREVIEW_URL
    ============================================================ */

    out.preview = {
        isPreview: !!env.RAILWAY_PREVIEW_URL || !!env.RAILWAY_GIT_PR_NUMBER,
        branch: env.RAILWAY_GIT_BRANCH ?? null,
        prNumber: env.RAILWAY_GIT_PR_NUMBER ?? null,
        url: env.RAILWAY_PREVIEW_URL ?? null
    };


    /* ============================================================
       7 — CRON JOBS
       ------------------------------------------------------------
       Railway Cron sets:
         RAILWAY_CRON
         RAILWAY_CRON_SCHEDULE
    ============================================================ */

    out.cron = {
        isCron: !!env.RAILWAY_CRON,
        schedule: env.RAILWAY_CRON_SCHEDULE ?? null
    };


    /* ============================================================
       8 — REGION DETECTION
       ------------------------------------------------------------
       Railway exposes region indirectly via:
         RAILWAY_REGION
         deployment ID prefix
         networking hostname or pod info
    ============================================================ */

    out.region = inferRailwayRegion(env);


    /* ============================================================
       9 — RUNTIME INFO
       ------------------------------------------------------------
       Detect container runtime, memory, CPU, etc.
    ============================================================ */

    out.runtime = {
        inContainer: detectDocker(),
        cpuCount: os.cpus()?.length ?? null,
        memoryLimit: detectCgroupMemory(),
        hostname: os.hostname(),
        publicUrl: env.RAILWAY_PUBLIC_URL ?? env.RAILWAY_STATIC_URL ?? null
    };


    /* ============================================================
       10 — BUILD PHASE DETECTION
       ------------------------------------------------------------
       Nixpacks or Docker build:
         RAILWAY_BUILD = "true"
         RAILWAY_DOCKERFILE_PATH
         RAILWAY_NIXPACKS
    ============================================================ */

    out.build = {
        isBuildPhase: env.RAILWAY_BUILD === "true",
        dockerfilePath: env.RAILWAY_DOCKERFILE_PATH ?? null,
        nixpacksEnabled: !!env.RAILWAY_NIXPACKS
    };


    /* ============================================================
       11 — PLUGINS (Postgres, Redis, Kafka, Mongo, ClickHouse)
    ============================================================ */

    out.plugins = detectRailwayPlugins(env);


    /* ============================================================
       12 — PLAN DETECTION (heuristic by CPU)
    ============================================================ */

    out.plan = inferRailwayPlan();


    /* ============================================================
       13 — LOCAL DEV (Railway CLI)
       ------------------------------------------------------------
       When running `railway run`:
         - RAILWAY_RUN_ID
         - RAILWAY_ENVIRONMENT is often undefined
    ============================================================ */

    out.localDev = {
        isLocalRailwayCLI: !!env.RAILWAY_RUN_ID,
        runId: env.RAILWAY_RUN_ID ?? null
    };


    /* ============================================================
       14 — RAW DUMP
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("RAILWAY_"))
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

function detectRailwayServiceType(env: Record<string, string>) {
    if (env.RAILWAY_CRON) return "cron";
    if (env.RAILWAY_STATIC_URL) return "static";
    if (env.RAILWAY_SERVICE_NAME?.toLowerCase().includes("worker")) return "worker";
    if (env.PORT) return "web";
    return "unknown";
}


function inferRailwayRegion(env: Record<string, string>) {
    if (env.RAILWAY_REGION) return env.RAILWAY_REGION;

    const id = env.RAILWAY_DEPLOYMENT_ID ?? "";
    if (id.startsWith("us-")) return "us";
    if (id.startsWith("eu-")) return "eu";
    if (id.startsWith("in-")) return "india";
    if (id.startsWith("ap-")) return "asia-pacific";

    return null;
}


/* -----------------------------------------
   Plugin detection
----------------------------------------- */
function detectRailwayPlugins(env: Record<string, string>) {
    const plugins: any = {};

    const urls = {
        postgres: env.DATABASE_URL ?? env.POSTGRES_URL ?? env.RAILWAY_POSTGRES_URL,
        redis: env.REDIS_URL ?? env.RAILWAY_REDIS_URL,
        mongo: env.MONGODB_URL ?? env.MONGO_URL,
        kafka: env.KAFKA_URL ?? env.RAILWAY_KAFKA_URL,
        clickhouse: env.CLICKHOUSE_URL,
        mysql: env.MYSQL_URL,
        upstashRedis: env.UPSTASH_REDIS_URL,
        qstash: env.QSTASH_URL
    };

    for (const [name, val] of Object.entries(urls)) {
        if (val) plugins[name] = val;
    }

    return plugins;
}


/* -----------------------------------------
   Container detection
----------------------------------------- */
function detectDocker() {
    try {
        if (fs.existsSync("/.dockerenv")) return true;
        const cg = fs.readFileSync("/proc/1/cgroup", "utf8");
        return cg.includes("docker") || cg.includes("kubepods");
    } catch { }
    return false;
}


function detectCgroupMemory() {
    try {
        const mem = fs.readFileSync("/sys/fs/cgroup/memory/memory.limit_in_bytes", "utf8");
        return parseInt(mem.trim(), 10);
    } catch { }
    return null;
}


function inferRailwayPlan() {
    const cpu = os.cpus()?.length ?? 1;

    if (cpu <= 1) return "starter";
    if (cpu <= 2) return "standard";
    if (cpu <= 4) return "pro";
    if (cpu >= 8) return "enterprise";

    return "unknown";
}

/* ============================================================
   A50 — FLY.IO ENVIRONMENT DETECTOR (MAXIMUM COVERAGE)
   Supports detection for:
     - Fly Machines
     - Fly Apps (Nomad)
     - Fly Volumes
     - Regions & Instance Metadata
     - GitHub Deploy metadata
     - LiteFS / Consul / Redis / Postgres plugins
     - Sidecar/Daemon identification
     - Build vs Runtime vs Release commands
============================================================ */

import fs from "fs";
import os from "os";

export function extractFlyInfo(env: Record<string, string>) {
    const out: any = {
        isFly: false,
        app: null,
        machine: null,
        region: null,
        standby: null,
        runtime: null,
        git: null,
        volumes: null,
        networking: null,
        build: null,
        plugins: null,
        plan: null,
        consul: null,
        litefs: null,
        raw: {}
    };

    /* ============================================================
       1 — DETECT FLY.IO
       ------------------------------------------------------------
       True Fly.io env vars:
         FLY_APP_NAME
         FLY_ALLOC_ID
         FLY_REGION
         FLY_VM_MEMORY_MB
         FLY_PUBLIC_IP
         FLY_MACHINE_ID
    ============================================================ */

    const signals = [
        "FLY_APP_NAME",
        "FLY_REGION",
        "FLY_ALLOC_ID",
        "FLY_MACHINE_ID",
        "FLY_PUBLIC_IP",
        "FLY_PRIVATE_IP"
    ];

    if (!signals.some(k => env[k])) return null;
    out.isFly = true;


    /* ============================================================
       2 — APP INFO
    ============================================================ */

    out.app = {
        name: env.FLY_APP_NAME ?? null,
        appRole: detectFlyAppRole(env), // primary/replica/daemon/sidecar
        processGroup: env.FLY_PROCESS_GROUP ?? null,
        releaseId: env.FLY_RELEASE_ID ?? null,
        launchType: env.FLY_LAUNCH ?? null
    };


    /* ============================================================
       3 — MACHINE / ALLOCATION INFORMATION
       ------------------------------------------------------------
       Covers Nomad allocations + Machines V2
    ============================================================ */

    out.machine = {
        allocId: env.FLY_ALLOC_ID ?? null,
        machineId: env.FLY_MACHINE_ID ?? null,
        version: env.FLY_MACHINE_VERSION ?? null,
        instanceId: env.FLY_INSTANCE_ID ?? null,
        vmMemoryMB: parseInt(env.FLY_VM_MEMORY_MB ?? "0", 10),
        vmCpuKind: env.FLY_CPU_KIND ?? null,
        vmCpus: env.FLY_CPU_COUNT ? parseInt(env.FLY_CPU_COUNT) : null,
        host: env.FLY_HOSTNAME ?? os.hostname(),
        isMachine: !!env.FLY_MACHINE_ID,
        isNomad: !!env.FLY_ALLOC_ID
    };


    /* ============================================================
       4 — REGION
    ============================================================ */

    out.region = {
        current: env.FLY_REGION ?? null,
        backupRegion: env.FLY_BACKUP_REGION ?? null,
        preferredRegion: env.FLY_PREFERRED_REGION ?? null
    };


    /* ============================================================
       5 — STANDBY / FAILOVER DETECTION
       ------------------------------------------------------------
       Fly sets:
        FLY_APPS_REMOTE_IP
        FLY_STANDBY
    ============================================================ */

    out.standby = {
        isStandby: env.FLY_STANDBY === "true",
        remoteIp: env.FLY_APPS_REMOTE_IP ?? null,
        failoverAvailable: !!env.FLY_BACKUP_REGION
    };


    /* ============================================================
       6 — RUNTIME METADATA
    ============================================================ */

    out.runtime = {
        inContainer: detectDocker(),
        cpuCount: os.cpus()?.length ?? null,
        memoryLimit: detectCgroupMemory(),
        startTime: env.FLY_MACHINE_STARTED_AT ?? null,
        launchTime: env.FLY_PROCESS_STARTED_AT ?? null,
        role: env.FLY_PROCESS_GROUP ?? null,
    };


    /* ============================================================
       7 — GIT METADATA (Fly GitHub Deploy)
    ============================================================ */

    out.git = {
        commit: env.FLY_GIT_SHA ?? null,
        branch: env.FLY_GIT_BRANCH ?? null,
        repo: env.FLY_GIT_REPOSITORY ?? null,
        author: env.FLY_GIT_AUTHOR ?? null
    };


    /* ============================================================
       8 — VOLUMES DETECTION (Fly Volumes)
       ------------------------------------------------------------
       Mounted in:
         /data
         /mnt/volume_x
         /litefs (for LiteFS)
    ============================================================ */

    out.volumes = detectFlyVolumes();


    /* ============================================================
       9 — NETWORKING
       ------------------------------------------------------------
       Includes IPv4/IPv6, Fly Proxy, WireGuard, Private Network
    ============================================================ */

    out.networking = {
        publicIPv6: env.FLY_PUBLIC_IP ?? null,
        privateIPv6: env.FLY_PRIVATE_IP ?? null,
        privateIPv4: env.FLY_PRIVATE_IP4 ?? null,
        hostname: os.hostname(),
        isEdge: detectFlyEdge(env),
        httpPort: env.PORT ?? env.FLY_APP_PORT ?? null
    };


    /* ============================================================
       10 — BUILD ENVIRONMENT
       ------------------------------------------------------------
       Fly builder (Nixpacks, Docker, Buildpacks):
         FLY_BUILD_NO_CACHE
         FLY_BUILD_TARGET
         FLY_BUILD_IMAGE
    ============================================================ */

    out.build = {
        isBuildPhase: !!env.FLY_BUILD_TARGET || !!env.FLY_BUILD_IMAGE,
        noCache: env.FLY_BUILD_NO_CACHE === "true",
        target: env.FLY_BUILD_TARGET ?? null,
        builderImage: env.FLY_BUILD_IMAGE ?? null
    };


    /* ============================================================
       11 — PLUGINS
       ------------------------------------------------------------
       Fly Postgres, Redis, Consul, LiteFS, Upstash, etc.
    ============================================================ */

    out.plugins = detectFlyPlugins(env);


    /* ============================================================
       12 — CONSUL (internal service mesh)
    ============================================================ */

    out.consul = {
        url: env.CONSUL_HTTP_ADDR ?? null,
        token: !!env.CONSUL_HTTP_TOKEN
    };


    /* ============================================================
       13 — LITEFS (distributed SQLite)
    ============================================================ */

    out.litefs = detectLiteFS(env);


    /* ============================================================
       14 — PLAN DETECTION (CPU, memory, VM type)
    ============================================================ */

    out.plan = inferFlyPlan(out.machine.vmCpus, out.machine.vmMemoryMB);


    /* ============================================================
       15 — RAW DUMP
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("FLY_"))
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

function detectDocker() {
    try {
        if (fs.existsSync("/.dockerenv")) return true;
        const cg = fs.readFileSync("/proc/1/cgroup", "utf8");
        return cg.includes("docker") || cg.includes("kubepods");
    } catch { }
    return false;
}

function detectCgroupMemory() {
    try {
        return parseInt(
            fs.readFileSync("/sys/fs/cgroup/memory/memory.limit_in_bytes", "utf8"),
            10
        );
    } catch { }
    return null;
}

function detectFlyEdge(env: Record<string, string>) {
    // Fly Edge often sets FLY_GLOBAL or reverse-proxy headers
    if (env.FLY_GLOBAL === "true") return true;
    return false;
}

function detectFlyAppRole(env: Record<string, string>) {
    const pg = env.FLY_PROCESS_GROUP?.toLowerCase() ?? "";

    if (pg.includes("primary")) return "primary";
    if (pg.includes("replica")) return "replica";
    if (pg.includes("daemon")) return "daemon";
    if (pg.includes("sidecar")) return "sidecar";
    return "app";
}

function detectFlyVolumes() {
    const vols: string[] = [];
    if (fs.existsSync("/data")) vols.push("/data");
    if (fs.existsSync("/mnt")) {
        const sub = fs.readdirSync("/mnt").map(f => `/mnt/${f}`);
        vols.push(...sub);
    }
    if (fs.existsSync("/litefs")) vols.push("/litefs");

    return { mounts: vols, hasVolumes: vols.length > 0 };
}

function detectFlyPlugins(env: Record<string, string>) {
    const plugins: any = {};

    const urls = {
        postgres: env.DATABASE_URL ?? env.FLY_POSTGRES_URL,
        redis: env.REDIS_URL ?? env.FLY_REDIS_URL,
        consul: env.CONSUL_HTTP_ADDR,
        upstashRedis: env.UPSTASH_REDIS_URL,
        kafka: env.FLY_KAFKA_URL,
        mongo: env.MONGO_URL,
        mysql: env.MYSQL_URL
    };

    for (const [k, v] of Object.entries(urls)) {
        if (v) plugins[k] = v;
    }
    return plugins;
}

function detectLiteFS(env: Record<string, string>) {
    const isLiteFS =
        fs.existsSync("/litefs") ||
        !!env.LITEFS_DIR ||
        !!env.LITEFS_URL;

    if (!isLiteFS) return null;

    return {
        dir: env.LITEFS_DIR ?? "/litefs",
        url: env.LITEFS_URL ?? null,
        cluster: env.LITEFS_CLUSTER ?? null,
        node: env.LITEFS_NODE ?? null
    };
}

function inferFlyPlan(cpu: number | null, memMB: number | null) {
    if (!cpu || !memMB) return "unknown";

    if (cpu <= 1 && memMB <= 512) return "shared-cpu-1x";
    if (cpu === 2 && memMB <= 2048) return "performance-2x";
    if (cpu >= 4 && memMB >= 4096) return "performance-4x";
    if (cpu >= 8) return "dedicated-high-cpu";
    return "unknown";
}

/* ============================================================
   A51 — STACKBLITZ & WEBCONTAINER RUNTIME DETECTOR
   Covers:
     - StackBlitz cloud IDE
     - WebContainer API runtime
     - Browser worker sandbox
     - GitHub import / Project metadata
     - Preview server & port mapping
============================================================ */

export async function extractStackblitzInfo(env: Record<string, string>) {
    const out: any = {
        isStackblitz: false,
        isWebContainer: false,
        environment: null,
        project: null,
        runtime: null,
        preview: null,
        fs: null,
        github: null,
        raw: {}
    };

    /* ============================================================
       1 — CORE STACKBLITZ / WEBCONTAINER DETECTION
       ------------------------------------------------------------
       Signals available inside StackBlitz:
         - WEB_CONTAINER_API="1"
         - WEB_CONTAINER_API_VERSION
         - STACKBLITZ_PROJECT_ID
         - STACKBLITZ_WORKSPACE_ID
         - location.origin = *.stackblitz.io
    ============================================================ */

    const isStackblitzURL =
        typeof location !== "undefined" &&
        /stackblitz\.io/.test(location.origin);

    const isWebContainerAPI =
        env.WEB_CONTAINER_API === "1" ||
        typeof (globalThis as any).WebContainer !== "undefined";

    if (isStackblitzURL || isWebContainerAPI) {
        out.isStackblitz = true;
        out.isWebContainer = isWebContainerAPI;
    } else {
        return null;
    }


    /* ============================================================
       2 — ENVIRONMENT INFO
    ============================================================ */

    out.environment = {
        apiVersion: env.WEB_CONTAINER_API_VERSION ?? null,
        host: isStackblitzURL ? location.origin : null,
        protocol: typeof location !== "undefined" ? location.protocol : null,
        isSandboxed: detectBrowserSandbox(),
        iframeHost: detectIframeHost(),
    };


    /* ============================================================
       3 — PROJECT INFO
       ------------------------------------------------------------
       StackBlitz exposes internally:
         STACKBLITZ_PROJECT_ID
         STACKBLITZ_WORKSPACE_ID
         STACKBLITZ_VM_TOKEN
    ============================================================ */

    out.project = {
        id: env.STACKBLITZ_PROJECT_ID ?? null,
        workspaceId: env.STACKBLITZ_WORKSPACE_ID ?? null,
        vmToken: env.STACKBLITZ_VM_TOKEN ?? null,
        source: detectProjectSource(),   // github | npm | template | unknown
    };


    /* ============================================================
       4 — RUNTIME INFO
    ============================================================ */

    out.runtime = {
        apiAvailable: isWebContainerAPI,
        supportsFS: !!globalThis.navigator?.storage,
        cpuCount: navigator.hardwareConcurrency ?? null,
        memoryEstimate: await estimateBrowserMemory(),
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform: navigator.platform
    };


    /* ============================================================
       5 — PREVIEW SERVER DETECTION
       ------------------------------------------------------------
       WebContainer sets:
         WEB_CONTAINER_API_PORT
         WEB_CONTAINER_API_HOST
    ============================================================ */

    out.preview = {
        host: env.WEB_CONTAINER_API_HOST ?? null,
        port: env.WEB_CONTAINER_API_PORT ?? null,
        url:
            env.WEB_CONTAINER_API_HOST && env.WEB_CONTAINER_API_PORT
                ? `${location.protocol}//${env.WEB_CONTAINER_API_HOST}:${env.WEB_CONTAINER_API_PORT}`
                : null
    };


    /* ============================================================
       6 — FILESYSTEM CAPABILITIES
       ------------------------------------------------------------
       WebContainer FS is fully virtualized.
    ============================================================ */

    out.fs = {
        type: "virtual",
        hasIndexedDB: !!globalThis.indexedDB,
        hasOPFS: !!navigator.storage?.getDirectory,
        persistentStorage: !!navigator.storage?.persisted,
        quota: await getStorageQuota()
    };


    /* ============================================================
       7 — GITHUB IMPORT METADATA
       ------------------------------------------------------------
       StackBlitz URL prefix:
         https://stackblitz.com/github/<user>/<repo>/tree/<branch>
    ============================================================ */

    out.github = detectGitHubImport();


    /* ============================================================
       8 — RAW DUMP
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("WEB_CONTAINER") ||
            k.startsWith("STACKBLITZ")
        )
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

function detectBrowserSandbox() {
    try {
        return (
            window !== window.top ||              // iFrame
            navigator?.storage?.estimate == null  // locked sandbox
        );
    } catch {
        return true;
    }
}

function detectIframeHost() {
    try {
        if (window !== window.top) {
            return document.referrer || "unknown-iframe-host";
        }
    } catch { }
    return null;
}

function detectProjectSource() {
    if (location.href.includes("/github/")) return "github";
    if (location.href.includes("/edit/")) return "template";
    if (location.href.includes("/npm/")) return "npm";
    return "unknown";
}

function detectGitHubImport() {
    const url = location.href;
    if (!url.includes("github")) return null;

    const match = /github\/([^/]+)\/([^/]+)\/tree\/([^/]+)/.exec(url);
    if (!match) return null;

    return {
        user: match[1],
        repo: match[2],
        branch: match[3]
    };
}

async function estimateBrowserMemory() {
    try {
        // Chromium-only
        // @ts-ignore
        if (performance?.memory) {
            // @ts-ignore
            return performance.memory;
        }
    } catch { }
    return null;
}

async function getStorageQuota() {
    try {
        const q = await navigator.storage?.estimate?.();
        return q ?? null;
    } catch {
        return null;
    }
}

/* ============================================================
   A52 — GITHUB ACTIONS RUNTIME DETECTOR (MAX COVERAGE)
   Supports:
     - Standard Actions
     - Workflow dispatch / reruns
     - PR events / push events
     - Matrix builds
     - GitHub-hosted runner vs self-hosted
     - Environments (deployments)
     - GitHub Pages build
     - Service containers
     - Composite actions / reusable workflows
============================================================ */

import fs from "fs";
import os from "os";

export function extractGithubActionsInfo(env: Record<string, string>) {
    const out: any = {
        isGithubActions: false,
        workflow: null,
        run: null,
        event: null,
        repository: null,
        actor: null,
        runner: null,
        permissions: null,
        environment: null,
        services: null,
        matrix: null,
        pages: null,
        debug: null,
        raw: {}
    };

    /* ============================================================
       1 — DETECT GITHUB ACTIONS
       ------------------------------------------------------------
       GitHub sets:
         GITHUB_ACTIONS="true"
         GITHUB_WORKFLOW
         GITHUB_RUN_ID
         GITHUB_REPOSITORY
    ============================================================ */

    if (env.GITHUB_ACTIONS !== "true") return null;
    out.isGithubActions = true;


    /* ============================================================
       2 — WORKFLOW INFO
    ============================================================ */

    out.workflow = {
        name: env.GITHUB_WORKFLOW ?? null,
        runId: env.GITHUB_RUN_ID ?? null,
        runNumber: env.GITHUB_RUN_NUMBER ?? null,
        runAttempt: env.GITHUB_RUN_ATTEMPT ?? null,
        workflowRef: env.GITHUB_WORKFLOW_REF ?? null,
        workflowSha: env.GITHUB_WORKFLOW_SHA ?? null
    };


    /* ============================================================
       3 — EVENT INFO
       ------------------------------------------------------------
       Trigger:
         - push
         - pull_request
         - workflow_dispatch
         - schedule
         - deployment
         - release
         - workflow_run
    ============================================================ */

    out.event = {
        name: env.GITHUB_EVENT_NAME ?? null,
        path: env.GITHUB_EVENT_PATH ?? null,
        payload: readEventPayload(env.GITHUB_EVENT_PATH),
    };


    /* ============================================================
       4 — REPOSITORY INFO
    ============================================================ */

    const [repoOwner, repoName] = (env.GITHUB_REPOSITORY ?? ":").split(":")[0].split("/");

    out.repository = {
        full: env.GITHUB_REPOSITORY ?? null,
        owner: repoOwner ?? null,
        name: repoName ?? null,
        workspace: env.GITHUB_WORKSPACE ?? null,
        sha: env.GITHUB_SHA ?? null,
        ref: env.GITHUB_REF ?? null,
        refName: env.GITHUB_REF_NAME ?? null,
        refType: env.GITHUB_REF_TYPE ?? null,
        headRef: env.GITHUB_HEAD_REF ?? null,
        baseRef: env.GITHUB_BASE_REF ?? null,
    };


    /* ============================================================
       5 — ACTOR / INITIATOR
    ============================================================ */

    out.actor = {
        name: env.GITHUB_ACTOR ?? null,
        email: env.GIT_AUTHOR_EMAIL ?? null,
        initiator: env.GITHUB_TRIGGERING_ACTOR ?? null
    };


    /* ============================================================
       6 — RUNNER INFO
       ------------------------------------------------------------
       Types:
         - GitHub-hosted
         - Self-hosted
         - Docker container runtime
         - Windows / Linux / MacOS
    ============================================================ */

    out.runner = {
        os: env.RUNNER_OS ?? os.platform(),
        arch: env.RUNNER_ARCH ?? os.arch(),
        temp: env.RUNNER_TEMP ?? null,
        toolCache: env.RUNNER_TOOL_CACHE ?? null,
        debug: env.RUNNER_DEBUG === "1",
        ephemeral: env.RUNNER_ENVIRONMENT ?? null,
        selfHosted: env.RUNNER_NAME?.toLowerCase()?.includes("self-hosted") ?? false,
        container: detectContainerRuntime(),
    };


    /* ============================================================
       7 — PERMISSIONS (GitHub Token Scope)
    ============================================================ */

    out.permissions = {
        token: !!env.GITHUB_TOKEN,
        stepSummary: env.GITHUB_STEP_SUMMARY ?? null,
        jobSummary: env.GITHUB_JOB_SUMMARY ?? null,
        apiUrl: env.GITHUB_API_URL ?? null,
        serverUrl: env.GITHUB_SERVER_URL ?? null,
        graphQlUrl: env.GITHUB_GRAPHQL_URL ?? null,
    };


    /* ============================================================
       8 — ENVIRONMENT (GitHub Environments)
    ============================================================ */

    out.environment = {
        name: env.DEPLOYMENT_ENVIRONMENT ?? env.GITHUB_ENVIRONMENT ?? null,
        url: env.DEPLOYMENT_URL ?? null,
        protected: env.GITHUB_ENVIRONMENT !== undefined
    };


    /* ============================================================
       9 — SERVICES (Service Containers)
    ============================================================ */

    out.services = detectServiceContainers();


    /* ============================================================
       10 — MATRIX BUILDS
    ============================================================ */

    out.matrix = detectMatrix(env);


    /* ============================================================
       11 — GITHUB PAGES BUILD
    ============================================================ */

    out.pages = {
        isPagesBuild: env.GITHUB_PAGES === "true",
        deployUrl: env.PAGES_DEPLOY_URL ?? null,
        artifactName: env.PAGES_ARTIFACT_NAME ?? null
    };


    /* ============================================================
       12 — DEBUG
    ============================================================ */

    out.debug = {
        actionsDebug: env.ACTIONS_RUNNER_DEBUG ?? null,
        stepDebug: env.ACTIONS_STEP_DEBUG ?? null
    };


    /* ============================================================
       13 — RAW
    ============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("GITHUB_") || k.startsWith("RUNNER_"))
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

function readEventPayload(path?: string) {
    if (!path) return null;
    try {
        const raw = fs.readFileSync(path, "utf8");
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function detectContainerRuntime() {
    try {
        if (fs.existsSync("/.dockerenv")) return "docker";
        const cg = fs.readFileSync("/proc/1/cgroup", "utf8");
        if (cg.includes("docker")) return "docker";
        if (cg.includes("kubepods")) return "kubernetes";
    } catch { }
    return null;
}

function detectServiceContainers() {
    const services = [];
    for (const key of Object.keys(process.env)) {
        if (key.startsWith("GITHUB_SERVICE_CONTAINER_")) {
            services.push(process.env[key]);
        }
    }
    return services.length ? services : null;
}

function detectMatrix(env: Record<string, string>) {
    const matrixKeys = Object.keys(env).filter(k => k.startsWith("MATRIX_"));
    if (!matrixKeys.length) return null;

    const out: any = {};
    for (const key of matrixKeys) {
        out[key.replace("MATRIX_", "").toLowerCase()] = env[key];
    }
    return out;
}

/* ============================================================
   A53 — GITLAB CI/CD RUNTIME DETECTOR
   Maximum Coverage:
     - GitLab CI
     - Self-hosted GitLab
     - GitLab Runner (all executors)
     - Docker executor
     - Kubernetes executor
     - Shell executor
     - Custom executor
     - Services
     - Environments
     - Review apps
     - Pages deployments
     - Merge request pipelines
     - Parent/child pipelines
     - Multi-project pipelines
     - Manual jobs
     - Protected jobs
     - Trigger/API/ChatOps
============================================================ */

import fs from "fs";
import os from "os";

export function extractGitlabCIInfo(env: Record<string, string>) {
    if (env.GITLAB_CI !== "true") return null;

    const out: any = {
        isGitlabCI: true,
        pipeline: {},
        job: {},
        git: {},
        runner: {},
        execution: {},
        environment: {},
        artifacts: {},
        cache: {},
        services: [],
        triggers: {},
        pages: {},
        meta: {},
        raw: {}
    };


    /* ============================================================
       PIPELINE INFORMATION
    ============================================================ */
    out.pipeline = {
        id: env.CI_PIPELINE_ID,
        url: env.CI_PIPELINE_URL,
        source: env.CI_PIPELINE_SOURCE, // push, merge_request_event, schedule, web, api, chat, external, trigger
        createdAt: env.CI_PIPELINE_CREATED_AT,
        updatedAt: env.CI_PIPELINE_UPDATED_AT,
        projectId: env.CI_PROJECT_ID,
        projectUrl: env.CI_PROJECT_URL,
        projectPath: env.CI_PROJECT_PATH,
        projectNamespace: env.CI_PROJECT_NAMESPACE,
        projectDir: env.CI_PROJECT_DIR,
        commitSha: env.CI_COMMIT_SHA,
        commitShort: env.CI_COMMIT_SHORT_SHA,
        commitMessage: env.CI_COMMIT_MESSAGE,
        commitRefName: env.CI_COMMIT_REF_NAME,
        commitTag: env.CI_COMMIT_TAG,
        commitBranch: env.CI_COMMIT_BRANCH,
        commitBeforeSha: env.CI_COMMIT_BEFORE_SHA,
    };


    /* ============================================================
       JOB INFORMATION
    ============================================================ */
    out.job = {
        id: env.CI_JOB_ID,
        name: env.CI_JOB_NAME,
        stage: env.CI_JOB_STAGE,
        token: !!env.CI_JOB_TOKEN,
        url: env.CI_JOB_URL,
        retry: env.CI_JOB_RETRY,
        manual: env.CI_JOB_MANUAL === "true",
        protected: env.CI_JOB_PROTECTED === "true",
        status: env.CI_JOB_STATUS,
        startedAt: env.CI_JOB_STARTED_AT,
        finishedAt: env.CI_JOB_FINISHED_AT,
    };


    /* ============================================================
       GIT INFORMATION
       (GitLab provides *extremely detailed* metadata)
    ============================================================ */
    out.git = {
        repo: env.CI_REPOSITORY_URL,
        cloneDir: env.CI_BUILDS_DIR,
        defaultBranch: env.CI_DEFAULT_BRANCH,
        tag: env.CI_COMMIT_TAG,
        branch: env.CI_COMMIT_BRANCH,
        ref: env.CI_COMMIT_REF_NAME,
        refSlug: env.CI_COMMIT_REF_SLUG,
        repoUrl: env.CI_REPOSITORY_URL,
        depth: env.GIT_DEPTH,
    };


    /* ============================================================
       RUNNER INFORMATION
    ============================================================ */
    out.runner = {
        id: env.CI_RUNNER_ID,
        description: env.CI_RUNNER_DESCRIPTION,
        tags: env.CI_RUNNER_TAGS?.split(",") ?? [],
        executor: detectGitlabExecutor(),
        version: env.CI_RUNNER_VERSION,
        revision: env.CI_RUNNER_REVISION,
        architecture: env.CI_RUNNER_EXECUTABLE_ARCH,
        platform: env.CI_RUNNER_EXECUTABLE_PLAT,
        features: {
            docker: env.CI_RUNNER_FEATURES_DOCKER_SUPPORTED === "true",
            shell: env.CI_RUNNER_FEATURES_SHELL_SUPPORTED === "true",
            services: env.CI_RUNNER_FEATURES_SERVICES_SUPPORTED === "true",
        }
    };


    /* ============================================================
       EXECUTION CONTEXT
       (Detect docker/k8s/custom/shell executor)
    ============================================================ */

    out.execution = {
        inDocker: fs.existsSync("/.dockerenv") || checkCgroup("docker"),
        inKubernetes: env.KUBERNETES_SERVICE_HOST !== undefined,
        inShell: env.CI_RUNNER_EXECUTOR === "shell",
        inCustom: env.CI_RUNNER_EXECUTOR === "custom",
        executor: env.CI_RUNNER_EXECUTOR,
        shell: env.CI_SHELL,
        runnerRoot: env.CI_RUNNER_ROOT,
    };


    /* ============================================================
       ENVIRONMENT / DEPLOYMENT INFO
    ============================================================ */
    out.environment = {
        name: env.CI_ENVIRONMENT_NAME,
        slug: env.CI_ENVIRONMENT_SLUG,
        url: env.CI_ENVIRONMENT_URL,
        action: env.CI_ENVIRONMENT_ACTION, // start, stop
        tier: env.CI_ENVIRONMENT_TIER, // production/staging/etc
        deploymentId: env.CI_DEPLOYMENT_ID,
        review: env.CI_ENVIRONMENT_NAME?.startsWith("review/") ?? false
    };


    /* ============================================================
       ARTIFACTS
    ============================================================ */
    out.artifacts = {
        expireIn: env.CI_JOB_ARTIFACTS_EXPIRE_IN,
        file: env.CI_JOB_ARTIFACTS_FILE,
        paths: env.CI_ARTIFACTS_PATHS,
    };


    /* ============================================================
       CACHE
    ============================================================ */
    out.cache = {
        key: env.CI_CACHE_KEY,
        keys: env.CI_CACHE_KEYS,
        prefix: env.CI_CACHE_PREFIX,
    };


    /* ============================================================
       SERVICES (Docker/K8s)
    ============================================================ */
    out.services = detectGitlabServiceContainers(env);


    /* ============================================================
       TRIGGERS
       (API, Schedules, ChatOps, manual)
    ============================================================ */
    out.triggers = {
        viaAPI: !!env.CI_PIPELINE_TRIGGERED,
        viaSchedule: env.CI_PIPELINE_SOURCE === "schedule",
        viaChatOps: env.CI_PIPELINE_SOURCE === "chat",
        viaPush: env.CI_PIPELINE_SOURCE === "push",
        viaMR: env.CI_PIPELINE_SOURCE === "merge_request_event",
        viaWeb: env.CI_PIPELINE_SOURCE === "web",
        viaManual: env.CI_JOB_MANUAL === "true",
    };


    /* ============================================================
       PAGES
    ============================================================ */
    out.pages = {
        domain: env.CI_PAGES_DOMAIN,
        url: env.CI_PAGES_URL,
    };


    /* ============================================================
       META
    ============================================================ */
    out.meta = {
        registry: env.CI_REGISTRY,
        registryImage: env.CI_REGISTRY_IMAGE,
        configPath: env.CI_CONFIG_PATH,
        serverVersion: env.GITLAB_FEATURES ?? null,
        apiV4: env.CI_API_V4_URL,
        projectDir: env.CI_PROJECT_DIR,
    };


    /* ============================================================
       RAW
    ============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("CI_") || k.startsWith("GITLAB_")
        )
    );

    return out;
}

/* ============================================================
   HELPERS
============================================================ */

function detectGitlabExecutor() {
    if (fs.existsSync("/.dockerenv")) return "docker";
    if (fs.existsSync("/var/run/secrets/kubernetes.io/serviceaccount")) return "kubernetes";
    return process.env.CI_RUNNER_EXECUTOR ?? "unknown";
}

function detectGitlabServiceContainers(env: Record<string, string>) {
    const services = [];
    for (const key of Object.keys(env)) {
        if (key.startsWith("CI_SERVICE_")) services.push(env[key]);
    }
    return services.length ? services : null;
}

function checkCgroup(keyword: string) {
    try {
        const cg = fs.readFileSync("/proc/1/cgroup", "utf8");
        return cg.includes(keyword);
    } catch {
        return false;
    }
}

/* ============================================================
   A54 — BITBUCKET PIPELINES RUNTIME DETECTOR
   Coverage:
     - Bitbucket Pipelines (cloud)
     - Local Bitbucket Runner
     - Repo metadata
     - Step metadata
     - Deployment metadata
     - Docker service metadata
     - Branch/tag detection
     - Raw env variables
============================================================ */

export function extractBitbucketPipelinesInfo(env: Record<string, string>) {
    // Quick fail — not Bitbucket
    if (!env.BITBUCKET_BUILD_NUMBER && !env.BITBUCKET_PIPELINE_UUID)
        return null;

    const out: any = {
        isBitbucketPipelines: true,
        pipeline: {},
        build: {},
        repository: {},
        deployment: {},
        docker: {},
        step: {},
        user: {},
        raw: {}
    };


    /* ============================================================
       PIPELINE INFO
    ============================================================ */
    out.pipeline = {
        uuid: env.BITBUCKET_PIPELINE_UUID,
        number: env.BITBUCKET_BUILD_NUMBER,
        stage: env.BITBUCKET_PIPELINE_STAGE_NAME,
        stepUuid: env.BITBUCKET_STEP_UUID,
        url: env.BITBUCKET_PIPELINE_URL,
        trigger: env.BITBUCKET_PIPELINE_TRIGGER, // push, pullrequest, schedule, manual
        createdAt: env.BITBUCKET_BUILD_CREATED_AT,
        updatedAt: env.BITBUCKET_BUILD_UPDATED_AT,
        cloneDir: env.BITBUCKET_CLONE_DIR,
    };


    /* ============================================================
       STEP INFO
    ============================================================ */
    out.step = {
        uuid: env.BITBUCKET_STEP_UUID,
        runNumber: env.BITBUCKET_STEP_RUN_NUMBER,
        name: env.BITBUCKET_STEP_NAME,
        retries: env.BITBUCKET_STEP_RETRY_LIMIT,
        oidcToken: !!env.BITBUCKET_STEP_OIDC_TOKEN,
        maxTime: env.BITBUCKET_STEP_TIMEOUT
    };


    /* ============================================================
       BUILD INFO
    ============================================================ */
    out.build = {
        number: env.BITBUCKET_BUILD_NUMBER,
        status: env.BITBUCKET_BUILD_STATUS,
        createdAt: env.BITBUCKET_BUILD_CREATED_AT,
        updatedAt: env.BITBUCKET_BUILD_UPDATED_AT,
        branch: env.BITBUCKET_BRANCH,
        tag: env.BITBUCKET_TAG,
        commit: env.BITBUCKET_COMMIT,
        mergeCommit: env.BITBUCKET_MERGE_COMMIT,
    };


    /* ============================================================
       REPOSITORY INFO
    ============================================================ */
    out.repository = {
        owner: env.BITBUCKET_REPO_OWNER,
        slug: env.BITBUCKET_REPO_SLUG,
        fullName: env.BITBUCKET_REPO_FULL_NAME,
        isPrivate: env.BITBUCKET_REPO_IS_PRIVATE === "true",
        gitUrl: env.BITBUCKET_GIT_SSH_ORIGIN,
        gitHttps: env.BITBUCKET_GIT_HTTP_ORIGIN,
        workspace: env.BITBUCKET_WORKSPACE,
        source: env.BITBUCKET_CLONE_DIR,
    };


    /* ============================================================
       DEPLOYMENT INFO
    ============================================================ */
    out.deployment = {
        environment: env.BITBUCKET_DEPLOYMENT_ENVIRONMENT,
        environmentUuid: env.BITBUCKET_DEPLOYMENT_ENVIRONMENT_UUID,
        environmentType: env.BITBUCKET_DEPLOYMENT_ENVIRONMENT_TYPE,
        release: env.BITBUCKET_DEPLOYMENT_RELEASE,
        releaseId: env.BITBUCKET_DEPLOYMENT_RELEASE_UUID,
    };


    /* ============================================================
       USER/ACTOR INFO
    ============================================================ */
    out.user = {
        uuid: env.BITBUCKET_STEP_TRIGGERER_UUID,
        nickname: env.BITBUCKET_STEP_TRIGGERER_NICKNAME,
        email: env.BITBUCKET_STEP_TRIGGERER_EMAIL,
    };


    /* ============================================================
       DOCKER SERVICE INFO
    ============================================================ */
    out.docker = {
        image: env.BITBUCKET_DOCKER_IMAGE,
        serviceName: env.BITBUCKET_DOCKER_SERVICE_NAME,
        host: env.BITBUCKET_DOCKER_HOST,
    };


    /* ============================================================
       RAW ENV DUMP (all BITBUCKET_* vars)
    ============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("BITBUCKET_"))
    );

    return out;
}

/* ============================================================
   A55 — GITHUB ACTIONS RUNTIME DETECTOR
   Full coverage of GitHub-hosted & self-hosted runners.
============================================================ */

import os from "os";
import fs from "fs";

export function extractGithubActionsInfo(env: Record<string, string>) {
    if (env.GITHUB_ACTIONS !== "true") return null;

    const out: any = {
        isGithubActions: true,
        workflow: {},
        job: {},
        runner: {},
        repository: {},
        git: {},
        event: {},
        deployment: {},
        matrix: {},
        container: {},
        services: {},
        caching: {},
        pages: {},
        oidc: {},
        raw: {}
    };


    /* ============================================================
       WORKFLOW INFORMATION
    ============================================================= */
    out.workflow = {
        name: env.GITHUB_WORKFLOW,
        runId: env.GITHUB_RUN_ID,
        runNumber: env.GITHUB_RUN_NUMBER,
        runAttempt: env.GITHUB_RUN_ATTEMPT,
        workflowRef: env.GITHUB_WORKFLOW_REF,
        workflowSha: env.GITHUB_WORKFLOW_SHA,
        ref: env.GITHUB_REF,
        refName: env.GITHUB_REF_NAME,
        refType: env.GITHUB_REF_TYPE, // branch|tag
        actor: env.GITHUB_ACTOR,
        triggeredBy: env.GITHUB_TRIGGERING_ACTOR,
        repository: env.GITHUB_REPOSITORY,
        repositoryOwner: env.GITHUB_REPOSITORY_OWNER,
        serverUrl: env.GITHUB_SERVER_URL,
        apiUrl: env.GITHUB_API_URL,
        graphQlUrl: env.GITHUB_GRAPHQL_URL,
        workspace: env.GITHUB_WORKSPACE,
    };


    /* ============================================================
       JOB INFORMATION
    ============================================================= */
    out.job = {
        name: env.GITHUB_JOB,
        status: env.GITHUB_JOB_STATUS,
        action: env.GITHUB_ACTION,
        actionPath: env.GITHUB_ACTION_PATH,
        actionRepository: env.GITHUB_ACTION_REPOSITORY,
        actionRef: env.GITHUB_ACTION_REF,
        eventName: env.GITHUB_EVENT_NAME,
        eventPath: env.GITHUB_EVENT_PATH,
        eventPayload: parseEventJSON(env.GITHUB_EVENT_PATH),
    };


    /* ============================================================
       REPOSITORY INFORMATION
    ============================================================= */
    out.repository = {
        repo: env.GITHUB_REPOSITORY,
        owner: env.GITHUB_REPOSITORY_OWNER,
        repoId: env.GITHUB_REPOSITORY_ID,
        ownerId: env.GITHUB_REPOSITORY_OWNER_ID,
        cloneUrl: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}.git`,
    };


    /* ============================================================
       GIT INFORMATION
    ============================================================= */
    out.git = {
        sha: env.GITHUB_SHA,
        ref: env.GITHUB_REF,
        refName: env.GITHUB_REF_NAME,
        refType: env.GITHUB_REF_TYPE,
        baseRef: env.GITHUB_BASE_REF,
        headRef: env.GITHUB_HEAD_REF,
        commitMessage: extractCommitMessage(),
    };


    /* ============================================================
       EVENT METADATA
       (PR / push / schedule / workflow_dispatch / API / webhook)
    ============================================================= */
    out.event = {
        name: env.GITHUB_EVENT_NAME,
        path: env.GITHUB_EVENT_PATH,
        payload: parseEventJSON(env.GITHUB_EVENT_PATH),
    };


    /* ============================================================
       DEPLOYMENT / ENVIRONMENT METADATA
    ============================================================= */
    out.deployment = {
        environment: env.DEPLOYMENT_ENVIRONMENT,
        url: env.DEPLOYMENT_URL,
        state: env.DEPLOYMENT_STATE,
    };


    /* ============================================================
       MATRIX JOBS
    ============================================================= */
    if (env.MATRIX_CONTEXT) {
        try {
            out.matrix = JSON.parse(env.MATRIX_CONTEXT);
        } catch {
            out.matrix = env.MATRIX_CONTEXT;
        }
    }


    /* ============================================================
       RUNNER INFORMATION (hosted or self-hosted)
    ============================================================= */
    out.runner = {
        name: env.GITHUB_RUNNER_NAME,
        os: env.RUNNER_OS ?? os.platform(),
        temp: env.RUNNER_TEMP,
        workspace: env.RUNNER_WORKSPACE,
        arch: env.RUNNER_ARCH ?? os.arch(),
        debug: env.RUNNER_DEBUG,
        toolCache: env.RUNNER_TOOL_CACHE,
        features: {
            ephemeral: env.RUNNER_EPHEMERAL === "1",
            user: env.GITHUB_ACTOR,
        },
        selfHosted: env.RUNNER_ENVIRONMENT === "self-hosted" || env.RUNNER_NAME?.includes("self-hosted")
    };


    /* ============================================================
       JOB CONTAINER (Docker / Runner)
============================================================ */
    out.container = {
        image: env.GITHUB_ACTIONS_RUNTIME_CONTAINER_IMAGE,
        id: env.GITHUB_ACTIONS_RUNTIME_CONTAINER_ID,
        network: env.GITHUB_ACTIONS_RUNTIME_NETWORK,
        inDocker: detectDocker(),
        cgroup: detectCgroup(),
    };


    /* ============================================================
       SERVICE CONTAINERS
============================================================ */
    out.services = detectServices(env);


    /* ============================================================
       GITHUB CACHING SYSTEM
============================================================ */
    out.caching = {
        cacheUrl: env.ACTIONS_CACHE_URL,
        runtimeUrl: env.ACTIONS_RUNTIME_URL,
        cacheKey: env.CACHE_KEY,
        primaryKey: env.CACHE_PRIMARY_KEY,
        restoreKeys: env.CACHE_RESTORE_KEYS,
    };


    /* ============================================================
       GITHUB PAGES DEPLOYMENT
============================================================ */
    out.pages = {
        enabled: !!env.GITHUB_PAGES,
        baseUrl: env.GITHUB_PAGES_BASE_URL,
        buildVersion: env.GITHUB_PAGES_BUILD_VERSION
    };


    /* ============================================================
       OPENID CONNECT TOKENS (OIDC)
============================================================ */
    out.oidc = {
        tokenRequestUrl: env.ACTIONS_ID_TOKEN_REQUEST_URL,
        tokenRequestToken: !!env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
        enabled: !!env.ACTIONS_ID_TOKEN_REQUEST_URL
    };


    /* ============================================================
       RAW DUMP OF ALL GITHUB_ AND ACTIONS_
============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("GITHUB_") ||
            k.startsWith("ACTIONS_")
        )
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */
function parseEventJSON(path: string | undefined) {
    if (!path) return null;
    try {
        if (fs.existsSync(path)) {
            const txt = fs.readFileSync(path, "utf8");
            return JSON.parse(txt);
        }
    } catch { }
    return null;
}

function detectDocker() {
    return fs.existsSync("/.dockerenv");
}

function detectCgroup() {
    try {
        return fs.readFileSync("/proc/1/cgroup", "utf8");
    } catch {
        return null;
    }
}

function detectServices(env: Record<string, string>) {
    const out: Record<string, string> = {};
    for (const k of Object.keys(env)) {
        if (k.startsWith("GITHUB_SERVICE_")) {
            const name = k.replace("GITHUB_SERVICE_", "");
            out[name] = env[k];
        }
    }
    return out;
}

function extractCommitMessage() {
    try {
        const msg = fs.readFileSync(".git/COMMIT_EDITMSG", "utf8");
        return msg.trim();
    } catch {
        return null;
    }
}

/* ============================================================
   A56 — AZURE DEVOPS PIPELINES RUNTIME DETECTOR
   Most complete & exhaustive detector for Azure Pipelines.
============================================================ */

import os from "os";
import fs from "fs";

export function extractAzurePipelinesInfo(env: Record<string, string>) {
    // Quick exit — not Azure DevOps
    if (!env.TF_BUILD && !env.BUILD_BUILDID) return null;

    const out: any = {
        isAzurePipelines: true,
        build: {},
        repository: {},
        agent: {},
        job: {},
        stage: {},
        phase: {},
        system: {},
        release: {},
        artifacts: {},
        pullRequest: {},
        container: {},
        services: {},
        variables: {},
        raw: {}
    };


    /* ============================================================
       BUILD METADATA
       system variables: https://learn.microsoft.com/azure/devops/pipelines/build/variables
    ============================================================= */
    out.build = {
        id: env.BUILD_BUILDID,
        number: env.BUILD_BUILDNUMBER,
        uri: env.BUILD_BUILDURI,
        reason: env.BUILD_REASON,       // Manual, IndividualCI, BatchedCI, Schedule, PullRequest, ResourceTrigger
        sourceBranch: env.BUILD_SOURCEBRANCH,
        sourceBranchName: env.BUILD_SOURCEBRANCHNAME,
        sourceVersion: env.BUILD_SOURCEVERSION,
        requestedFor: env.BUILD_REQUESTEDFOR,
        requestedForEmail: env.BUILD_REQUESTEDFOREMAIL,
        requestedBy: env.BUILD_REQUESTEDBY,
    };


    /* ============================================================
       REPOSITORY METADATA
       Handles Azure Repos Git, GitHub, Bitbucket, TFVC
    ============================================================= */
    out.repository = {
        id: env.BUILD_REPOSITORY_ID,
        name: env.BUILD_REPOSITORY_NAME,
        provider: env.BUILD_REPOSITORY_PROVIDER, // TfsGit | GitHub | Bitbucket | TfsVersionControl
        uri: env.BUILD_REPOSITORY_URI,
        branch: env.BUILD_SOURCEBRANCH,
        commit: env.BUILD_SOURCEVERSION,
        clean: env.BUILD_REPOSITORY_CLEAN,
        localPath: env.BUILD_SOURCESDIRECTORY,
    };


    /* ============================================================
       AGENT INFORMATION (Microsoft-hosted or self-hosted)
    ============================================================= */
    out.agent = {
        name: env.AGENT_NAME,
        machineName: env.AGENT_MACHINENAME,
        os: env.AGENT_OS ?? os.platform(),
        osArchitecture: env.AGENT_OSARCHITECTURE,
        jobStatus: env.AGENT_JOBSTATUS,
        version: env.AGENT_VERSION,
        id: env.AGENT_ID,
        homeDirectory: env.AGENT_HOMEDIRECTORY,
        tempDirectory: env.AGENT_TEMPDIRECTORY,
        workFolder: env.AGENT_WORKFOLDER,
        selfHosted: env.AGENT_NAME?.includes("Hosted") === false
    };


    /* ============================================================
       JOB METADATA
============================================================ */
    out.job = {
        name: env.SYSTEM_JOBDISPLAYNAME,
        id: env.SYSTEM_JOBID,
        positionInPhase: env.SYSTEM_JOBPOSITIONINPHASE,
        attempt: env.SYSTEM_JOBATTEMPT,
        identifier: env.SYSTEM_JOBIDENTIFIER,
    };


    /* ============================================================
       STAGE METADATA
============================================================ */
    out.stage = {
        name: env.SYSTEM_STAGEDISPLAYNAME,
        attempted: env.SYSTEM_STAGEATTEMPT,
        id: env.SYSTEM_STAGEID,
    };


    /* ============================================================
       PHASE METADATA (legacy)
============================================================ */
    out.phase = {
        name: env.SYSTEM_PHASENAME,
        id: env.SYSTEM_PHASEID,
        attempt: env.SYSTEM_PHASEATTEMPT,
    };


    /* ============================================================
       CORE SYSTEM VARIABLES
============================================================ */
    out.system = {
        teamProject: env.SYSTEM_TEAMPROJECT,
        teamProjectId: env.SYSTEM_TEAMPROJECTID,
        collectionUri: env.SYSTEM_COLLECTIONURI,
        definitionId: env.SYSTEM_DEFINITIONID,
        definitionName: env.SYSTEM_DEFINITIONNAME,
        teamFoundationCollectionUri: env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI,
        debug: env.SYSTEM_DEBUG,
        hostType: env.SYSTEM_HOSTTYPE, // build | release
        isRelease: env.SYSTEM_HOSTTYPE === "release",
        isBuild: env.SYSTEM_HOSTTYPE === "build",
    };


    /* ============================================================
       RELEASE PIPELINES (classic release management)
============================================================ */
    out.release = {
        releaseId: env.RELEASE_RELEASEID,
        releaseName: env.RELEASE_RELEASENAME,
        releaseDescription: env.RELEASE_RELEASEDESCRIPTION,
        releaseAttempt: env.RELEASE_ATTEMPTNUMBER,
        releaseEnvironment: env.RELEASE_ENVIRONMENTNAME,
        releaseDefinition: env.RELEASE_DEFINITIONNAME,
        deploymentRequestedFor: env.RELEASE_REQUESTEDFOR,
        deploymentRequestedBy: env.RELEASE_REQUESTEDBY,
    };


    /* ============================================================
       ARTIFACTS
============================================================ */
    out.artifacts = {
        stagingDir: env.BUILD_ARTIFACTSTAGINGDIRECTORY,
        containerId: env.BUILD_CONTAINERID,
        type: env.BUILD_ARTIFACTTYPE,
        name: env.BUILD_ARTIFACTNAME,
    };


    /* ============================================================
       PULL REQUEST METADATA
============================================================ */
    out.pullRequest = {
        isPR: !!env.SYSTEM_PULLREQUEST_PULLREQUESTID,
        id: env.SYSTEM_PULLREQUEST_PULLREQUESTID,
        sourceBranch: env.SYSTEM_PULLREQUEST_SOURCEBRANCH,
        targetBranch: env.SYSTEM_PULLREQUEST_TARGETBRANCH,
        sourceRepositoryUri: env.SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI,
    };


    /* ============================================================
       CONTAINER JOBS (Docker)
============================================================ */
    out.container = {
        jobContainer: env.CONTAINER_JOBIMAGE,
        registry: env.CONTAINER_REGISTRY,
        id: detectDocker(),
        cgroup: detectCgroup(),
    };


    /* ============================================================
       SERVICES (Docker compose style in Azure Pipelines)
============================================================ */
    out.services = detectServices(env);


    /* ============================================================
       VARIABLE GROUPS & CUSTOM VARIABLES
============================================================ */
    out.variables = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("VARIABLE_") ||
            k.startsWith("CUSTOM_") ||
            k.startsWith("SECRET_")
        )
    );


    /* ============================================================
       RAW DUMP OF ALL SYSTEM_, BUILD_, AGENT_, RELEASE_, DEPLOYMENT_
============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("SYSTEM_") ||
            k.startsWith("BUILD_") ||
            k.startsWith("AGENT_") ||
            k.startsWith("RELEASE_") ||
            k.startsWith("DEPLOYMENT_") ||
            k.startsWith("TF_")
        )
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */
function detectDocker() {
    return fs.existsSync("/.dockerenv");
}

function detectCgroup() {
    try {
        return fs.readFileSync("/proc/1/cgroup", "utf8");
    } catch {
        return null;
    }
}

function detectServices(env: Record<string, string>) {
    const out: Record<string, string> = {};
    for (const key of Object.keys(env)) {
        if (key.startsWith("AZP_SERVICE_")) {
            out[key.replace("AZP_SERVICE_", "")] = env[key];
        }
    }
    return out;
}

/* ============================================================
   A57 — TRAVIS CI RUNTIME DETECTOR
   Maximal coverage for Travis CI (legacy + modern)
============================================================ */

import os from "os";
import fs from "fs";

export function extractTravisCIInfo(env: Record<string, string>) {
    if (!env.TRAVIS && !env.CI) return null;
    if (env.CI && env.CI !== "true") return null;
    if (env.CI && !env.TRAVIS) return null; // avoid false detects in GitHub/GitLab/etc.

    const out: any = {
        isTravisCI: true,
        build: {},
        job: {},
        repository: {},
        commit: {},
        matrix: {},
        system: {},
        environment: {},
        services: {},
        docker: {},
        secureVars: {},
        raw: {}
    };


    /* ============================================================
       BUILD METADATA
============================================================ */
    out.build = {
        id: env.TRAVIS_BUILD_ID,
        number: env.TRAVIS_BUILD_NUMBER,
        webUrl: env.TRAVIS_BUILD_WEB_URL,
        apiUrl: env.TRAVIS_API_URL,
        eventType: env.TRAVIS_EVENT_TYPE, // push, pull_request, api, cron
        branch: env.TRAVIS_BRANCH,
        pullRequest: env.TRAVIS_PULL_REQUEST,
        pullRequestSlug: env.TRAVIS_PULL_REQUEST_SLUG,
        pullRequestBranch: env.TRAVIS_PULL_REQUEST_BRANCH,
        repoSlug: env.TRAVIS_REPO_SLUG,
        isCron: env.TRAVIS_EVENT_TYPE === "cron",
        isPR: env.TRAVIS_EVENT_TYPE === "pull_request",
        isPush: env.TRAVIS_EVENT_TYPE === "push",
        isAPI: env.TRAVIS_EVENT_TYPE === "api",
        tag: env.TRAVIS_TAG,
    };


    /* ============================================================
       JOB METADATA
============================================================ */
    out.job = {
        id: env.TRAVIS_JOB_ID,
        number: env.TRAVIS_JOB_NUMBER,
        webUrl: env.TRAVIS_JOB_WEB_URL,
        stage: env.TRAVIS_STAGE_NAME,
        os: env.TRAVIS_OS_NAME,
        dist: env.TRAVIS_DIST,
        group: env.TRAVIS_GROUP,
        sudo: env.TRAVIS_SUDO,
        arch: env.TRAVIS_CPU_ARCH,
        jobName: env.TRAVIS_JOB_NAME,
        includedInBuildMatrix: env.TRAVIS_INCLUSION_REASON === "matrix",
        attempt: env.TRAVIS_JOB_ATTEMPT,
    };


    /* ============================================================
       REPOSITORY INFORMATION
============================================================ */
    out.repository = {
        slug: env.TRAVIS_REPO_SLUG,
        root: env.TRAVIS_BUILD_DIR,
        sha: env.TRAVIS_COMMIT,
        range: env.TRAVIS_COMMIT_RANGE,
    };


    /* ============================================================
       COMMIT INFORMATION
============================================================ */
    out.commit = {
        sha: env.TRAVIS_COMMIT,
        range: env.TRAVIS_COMMIT_RANGE,
        message: env.TRAVIS_COMMIT_MESSAGE,
    };


    /* ============================================================
       MATRIX / ENVIRONMENT INFO
============================================================ */
    out.matrix = {
        compiler: env.TRAVIS_COMPILER,
        nodeVersion: env.TRAVIS_NODE_VERSION,
        rubyVersion: env.TRAVIS_RUBY_VERSION,
        pythonVersion: env.TRAVIS_PYTHON_VERSION,
        goVersion: env.TRAVIS_GO_VERSION,
        jdk: env.TRAVIS_JDK_VERSION,
        phpVersion: env.TRAVIS_PHP_VERSION,
        otpRelease: env.TRAVIS_OTP_RELEASE,
        rustVersion: env.TRAVIS_RUST_VERSION,
        perlVersion: env.TRAVIS_PERL_VERSION,
        hhvmVersion: env.TRAVIS_HHVM_VERSION,
        scalaVersion: env.TRAVIS_SCALA_VERSION,
        monoVersion: env.TRAVIS_MONO_VERSION,
        env: env.TRAVIS_ENV ?? env.TRAVIS_BUILD_STAGE_NAME
    };


    /* ============================================================
       SYSTEM METADATA (Travis infra)
============================================================ */
    out.system = {
        home: env.HOME,
        shell: env.SHELL,
        user: env.USER,
        os: env.TRAVIS_OS_NAME ?? os.platform(),
        arch: env.TRAVIS_CPU_ARCH ?? os.arch(),
        language: env.TRAVIS_LANGUAGE,
        sharedDir: env.TRAVIS_SHARED_DIR,
        tempDir: env.TRAVIS_TMPDIR,
        logFold: env.TRAVIS_FOLD,
        logLevel: env.TRAVIS_LOG_LEVEL,
    };


    /* ============================================================
       TRAVIS ENVIRONMENT TYPE
============================================================ */
    out.environment = {
        image: env.TRAVIS_LINUX_IMAGE,
        stage: env.TRAVIS_STAGE_NAME,
        sudoEnabled: env.TRAVIS_SUDO === "required",
        containerBased: env.TRAVIS_SUDO === "false",
        enterprise: env.TRAVIS_ENTERPRISE == "true",
        enterpriseHostname: env.TRAVIS_ENTERPRISE_HOSTNAME,
    };


    /* ============================================================
       DOCKER DETECTION
============================================================ */
    out.docker = {
        inDocker: fs.existsSync("/.dockerenv"),
        cgroup: detectCgroup(),
        services: detectDockerServices(env)
    };


    /* ============================================================
       TRAVIS SERVICES (databases, caches, etc.)
============================================================ */
    out.services = detectServices(env);


    /* ============================================================
       SECURE ENVIRONMENT VARIABLES
       These are masked in logs but detectable by env prefix.
============================================================ */
    out.secureVars = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.includes("SECURE") || k.includes("ENCRYPTED")
        )
    );


    /* ============================================================
       RAW ENV DUMP (all TRAVIS_ variables)
============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("TRAVIS_"))
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */
function detectCgroup() {
    try {
        return fs.readFileSync("/proc/1/cgroup", "utf8");
    } catch {
        return null;
    }
}

function detectDockerServices(env: Record<string, string>) {
    const out: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith("DOCKER_")) {
            out[key] = env[key];
        }
    }
    return out;
}

function detectServices(env: Record<string, string>) {
    const out: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith("TRAVIS_") && key.includes("SERVICE")) {
            out[key] = env[key];
        }
    }
    return out;
}

/* ============================================================
   A58 — CIRCLECI RUNTIME DETECTOR
   Fully exhaustive CircleCI environment metadata extraction.
============================================================ */

import os from "os";
import fs from "fs";

export function extractCircleCIInfo(env: Record<string, string>) {
    if (!env.CIRCLECI && !env.CI) return null;
    if (env.CIRCLECI !== "true") return null; // Avoid false detect in GitHub/GitLab/etc.

    const out: any = {
        isCircleCI: true,
        build: {},
        pipeline: {},
        workflow: {},
        job: {},
        executor: {},
        repo: {},
        git: {},
        vcs: {},
        parallelism: {},
        cache: {},
        context: {},
        ssh: {},
        docker: {},
        machine: {},
        remoteDocker: {},
        metadata: {},
        raw: {}
    };


    /* ============================================================
       BUILD INFORMATION
============================================================ */
    out.build = {
        id: env.CIRCLE_BUILD_NUM,
        url: env.CIRCLE_BUILD_URL,
        user: env.CIRCLE_USERNAME,
        queuedAt: env.CIRCLE_BUILD_CREATED_AT,
        finishedAt: env.CIRCLE_BUILD_FINISHED_AT,
        status: env.CIRCLE_JOB,
        pullRequest: env.CI_PULL_REQUEST,
        pullRequests: env.CI_PULL_REQUESTS,
        branch: env.CIRCLE_BRANCH,
        tag: env.CIRCLE_TAG,
    };


    /* ============================================================
       PIPELINE INFORMATION
============================================================ */
    out.pipeline = {
        id: env.CIRCLE_PIPELINE_ID,
        number: env.CIRCLE_PIPELINE_NUMBER,
        triggerSource: env.CIRCLE_PIPELINE_TRIGGER_SOURCE, // api / webhook / scheduler
        parameters: parseJSON(env.CIRCLE_PIPELINE_PARAMETERS),
    };


    /* ============================================================
       WORKFLOW INFORMATION
============================================================ */
    out.workflow = {
        id: env.CIRCLE_WORKFLOW_ID,
        name: env.CIRCLE_WORKFLOW_NAME,
        jobId: env.CIRCLE_WORKFLOW_JOB_ID,
        upstream: env.CIRCLE_WORKFLOW_UPSTREAM_JOB_IDS
            ? env.CIRCLE_WORKFLOW_UPSTREAM_JOB_IDS.split(",")
            : [],
    };


    /* ============================================================
       JOB INFORMATION
============================================================ */
    out.job = {
        name: env.CIRCLE_JOB,
        id: env.CIRCLE_BUILD_NUM,
        step: env.CIRCLE_STEP_NAME,
        project: env.CIRCLE_PROJECT_REPONAME,
        parallelIndex: env.CIRCLE_NODE_INDEX,
        parallelTotal: env.CIRCLE_NODE_TOTAL,
        isParallel: Number(env.CIRCLE_NODE_TOTAL || 1) > 1,
    };


    /* ============================================================
       EXECUTOR INFORMATION
============================================================ */
    out.executor = {
        type: detectExecutor(env),
        resourceClass: env.CIRCLE_RESOURCES_CLASS,
        os: env.CIRCLE_OS ?? os.platform(),
        shell: env.SHELL,
        home: env.HOME,
    };


    /* ============================================================
       REPOSITORY (GITHUB, BITBUCKET)
============================================================ */
    out.repo = {
        vcs: env.CIRCLE_REPOSITORY_URL?.includes("github") ? "github"
            : env.CIRCLE_REPOSITORY_URL?.includes("bitbucket") ? "bitbucket"
                : "unknown",
        url: env.CIRCLE_REPOSITORY_URL,
        username: env.CIRCLE_PROJECT_USERNAME,
        reponame: env.CIRCLE_PROJECT_REPONAME,
        root: env.CIRCLE_WORKING_DIRECTORY,
    };


    /* ============================================================
       GIT INFORMATION
============================================================ */
    out.git = {
        sha: env.CIRCLE_SHA1,
        branch: env.CIRCLE_BRANCH,
        tag: env.CIRCLE_TAG,
        compareUrl: env.CIRCLE_COMPARE_URL,
    };


    /* ============================================================
       PARALLELISM
============================================================ */
    out.parallelism = {
        index: env.CIRCLE_NODE_INDEX,
        total: env.CIRCLE_NODE_TOTAL,
        isParallel: Number(env.CIRCLE_NODE_TOTAL || 1) > 1,
    };


    /* ============================================================
       CACHING AND WORKSPACE
============================================================ */
    out.cache = {
        workspaceRoot: env.CIRCLE_WORKING_DIRECTORY,
        cacheDirectory: env.CIRCLE_CACHE_DIR,
    };


    /* ============================================================
       CONTEXTS (API-driven secret groups)
============================================================ */
    out.context = {
        context: env.CIRCLE_CONTEXT,
        contexts: env.CIRCLE_CONTEXTS
            ? env.CIRCLE_CONTEXTS.split(",")
            : []
    };


    /* ============================================================
       SSH (CircleCI allows “Rerun with SSH”)
============================================================ */
    out.ssh = {
        sshEnabled: env.CIRCLE_SSH_ENABLED === "true",
        sshUser: env.CIRCLE_SSH_USER,
        sshHost: env.CIRCLE_SSH_HOST,
    };


    /* ============================================================
       DOCKER EXECUTOR
============================================================ */
    out.docker = {
        image: env.CIRCLE_JOB_IMAGE,
        dockerized: fs.existsSync("/.dockerenv"),
        cgroup: getCgroup(),
        remoteDocker: env.CIRCLE_REMOTE_DOCKER === "true"
    };


    /* ============================================================
       MACHINE EXECUTOR
============================================================ */
    out.machine = {
        machine: env.CIRCLE_MACHINE,
        machineImage: env.CIRCLE_MACHINE_IMAGE,
        executor: env.CIRCLE_EXECUTOR,
    };


    /* ============================================================
       REMOTE DOCKER (docker layer caching)
============================================================ */
    out.remoteDocker = {
        enabled: env.CIRCLE_REMOTE_DOCKER === "true",
        dylib: env.CIRCLE_REMOTE_DOCKER_DAEMON ?? null,
    };


    /* ============================================================
       METADATA (CircleCI metadata storage)
============================================================ */
    out.metadata = {
        circleciHost: env.CIRCLECI,
        ci: env.CI,
        ciName: env.CIRCLECI === "true" ? "CircleCI" : null,
        workflowId: env.CIRCLE_WORKFLOW_ID,
        apiHost: env.CIRCLE_INTERNAL_CONFIG ?? null,
        executor: detectExecutor(env),
    };


    /* ============================================================
       RAW ENVIRONMENT DUMP (CIRCLE_ and CI_)
============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([key]) =>
            key.startsWith("CIRCLE_") ||
            key.startsWith("CI_")
        )
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */
function parseJSON(v?: string) {
    if (!v) return null;
    try { return JSON.parse(v); } catch { return v; }
}

function getCgroup() {
    try {
        return fs.readFileSync("/proc/1/cgroup", "utf8");
    } catch {
        return null;
    }
}

function detectExecutor(env: Record<string, string>) {
    if (env.CIRCLE_JOB_IMAGE) return "docker";
    if (env.CIRCLE_MACHINE) return "machine";
    if (env.CIRCLE_OS === "windows") return "windows";
    if (env.CIRCLE_OS === "darwin") return "macos";
    return "unknown";
}

/* ============================================================
   A59 — BUILDKITE RUNTIME DETECTOR
   Comprehensive Buildkite environment extraction.
============================================================ */

import fs from "fs";
import os from "os";

export function extractBuildkiteInfo(env: Record<string, string>) {
    if (!env.BUILDKITE || env.BUILDKITE !== "true") return null;

    const out: any = {
        isBuildkite: true,
        pipeline: {},
        build: {},
        job: {},
        agent: {},
        repository: {},
        git: {},
        meta: {},
        plugins: {},
        annotations: {},
        container: {},
        docker: {},
        ssh: {},
        raw: {}
    };


    /* ============================================================
       PIPELINE METADATA
============================================================ */
    out.pipeline = {
        name: env.BUILDKITE_PIPELINE_NAME,
        slug: env.BUILDKITE_PIPELINE_SLUG,
        id: env.BUILDKITE_PIPELINE_ID,
        url: env.BUILDKITE_PIPELINE_URL,
    };


    /* ============================================================
       BUILD METADATA
============================================================ */
    out.build = {
        id: env.BUILDKITE_BUILD_ID,
        number: env.BUILDKITE_BUILD_NUMBER,
        url: env.BUILDKITE_BUILD_URL,
        creator: env.BUILDKITE_BUILD_CREATOR,
        creatorEmail: env.BUILDKITE_BUILD_CREATOR_EMAIL,
        createdAt: env.BUILDKITE_BUILD_CREATED_AT,
        message: env.BUILDKITE_MESSAGE,
        commit: env.BUILDKITE_COMMIT,
        branch: env.BUILDKITE_BRANCH,
        tag: env.BUILDKITE_TAG,
        pullRequest: env.BUILDKITE_PULL_REQUEST,
        pullRequestBaseBranch: env.BUILDKITE_PULL_REQUEST_BASE_BRANCH,
        pullRequestRepo: env.BUILDKITE_PULL_REQUEST_REPO,
        isPR: env.BUILDKITE_PULL_REQUEST && env.BUILDKITE_PULL_REQUEST !== "false",
        source: env.BUILDKITE_BUILD_SOURCE, // web, api, schedule, webhook
        rebuild: env.BUILDKITE_RETRY_COUNT
    };


    /* ============================================================
       JOB METADATA
============================================================ */
    out.job = {
        id: env.BUILDKITE_JOB_ID,
        url: env.BUILDKITE_JOB_URL,
        state: env.BUILDKITE_JOB_STATE,
        retries: env.BUILDKITE_JOB_RETRY,
        attempt: env.BUILDKITE_JOB_ATTEMPT,
        label: env.BUILDKITE_LABEL,
        stepKey: env.BUILDKITE_STEP_KEY,
        stepId: env.BUILDKITE_STEP_ID,
        stepUuid: env.BUILDKITE_STEP_UUID,
        commandParts: env.BUILDKITE_COMMAND?.split(" ") ?? null
    };


    /* ============================================================
       AGENT METADATA
============================================================ */
    out.agent = {
        name: env.BUILDKITE_AGENT_NAME,
        pid: env.BUILDKITE_AGENT_PID,
        id: env.BUILDKITE_AGENT_ID,
        meta: extractAgentMeta(env),
        queue: env.BUILDKITE_AGENT_META_DATA_QUEUE ?? null,
        os: os.platform(),
        arch: os.arch(),
        version: env.BUILDKITE_AGENT_VERSION,
        binaryPath: env.BUILDKITE_AGENT_BINARY_PATH,
    };


    /* ============================================================
       REPOSITORY METADATA
============================================================ */
    out.repository = {
        url: env.BUILDKITE_REPO,
        checkoutPath: env.BUILDKITE_BUILD_CHECKOUT_PATH,
        provider: detectRepoProvider(env.BUILDKITE_REPO),
    };


    /* ============================================================
       GIT METADATA
============================================================ */
    out.git = {
        branch: env.BUILDKITE_BRANCH,
        commit: env.BUILDKITE_COMMIT,
        tag: env.BUILDKITE_TAG,
        baseRef: env.BUILDKITE_PULL_REQUEST_BASE_BRANCH,
        repo: env.BUILDKITE_REPO,
    };


    /* ============================================================
       PIPELINE META-DATA (passed via pipeline.yml)
============================================================ */
    out.meta = extractMeta(env);


    /* ============================================================
       BUILDKITE PLUGINS
============================================================ */
    out.plugins = extractPlugins(env);


    /* ============================================================
       BUILDKITE ANNOTATIONS
============================================================ */
    out.annotations = {
        path: env.BUILDKITE_ANNOTATIONS_PATH,
        enabled: !!env.BUILDKITE_ANNOTATIONS_PATH
    };


    /* ============================================================
       CONTAINER INFO (Docker, LXC, Kubernetes)
============================================================ */
    out.container = {
        inDocker: fs.existsSync("/.dockerenv"),
        inCgroup: readCgroup(),
        dockerImage: env.BUILDKITE_DOCKER_IMAGE,
        kubernetesPod: env.BUILDKITE_K8S_POD_NAME,
        kubernetesNamespace: env.BUILDKITE_K8S_NAMESPACE,
    };


    /* ============================================================
       DOCKER SETTINGS (docker plugin, container steps)
============================================================ */
    out.docker = extractDocker(env);


    /* ============================================================
       SSH ACCESS
============================================================ */
    out.ssh = {
        sshEnabled: env.BUILDKITE_SSH_KEYSCAN ?? null,
        sshUser: env.BUILDKITE_SSH_USER,
        sshHost: env.BUILDKITE_SSH_HOST,
    };


    /* ============================================================
       RAW ENVIRONMENT DUMP
============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) => k.startsWith("BUILDKITE_"))
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */
function extractMeta(env: Record<string, string>) {
    const meta: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith("BUILDKITE_META_")) {
            meta[key.replace("BUILDKITE_META_", "")] = env[key];
        }
    }
    return meta;
}

function extractAgentMeta(env: Record<string, string>) {
    const meta: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith("BUILDKITE_AGENT_META_DATA_")) {
            meta[key.replace("BUILDKITE_AGENT_META_DATA_", "")] = env[key];
        }
    }
    return meta;
}

function extractPlugins(env: Record<string, string>) {
    const plugins: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith("BUILDKITE_PLUGIN_")) {
            plugins[key.replace("BUILDKITE_PLUGIN_", "")] = env[key];
        }
    }
    return plugins;
}

function extractDocker(env: Record<string, string>) {
    const docker: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith("BUILDKITE_DOCKER_")) {
            docker[key.replace("BUILDKITE_DOCKER_", "")] = env[key];
        }
    }
    return docker;
}

function detectRepoProvider(repoUrl: string | undefined) {
    if (!repoUrl) return null;
    if (repoUrl.includes("github.com")) return "github";
    if (repoUrl.includes("gitlab.com")) return "gitlab";
    if (repoUrl.includes("bitbucket.org")) return "bitbucket";
    if (repoUrl.includes("dev.azure.com")) return "azure";
    return "unknown";
}

function readCgroup() {
    try { return fs.readFileSync("/proc/1/cgroup", "utf8"); }
    catch { return null; }
}

/* ============================================================
   A60 — TEAMCITY RUNTIME DETECTOR
   Covers ALL known TeamCity metadata: agent, build, runner,
   parameters, pipelines, artifacts, dependencies, and more.
============================================================ */

import os from "os";
import fs from "fs";

export function extractTeamCityInfo(env: Record<string, string>) {
    // TeamCity exposes TEAMCITY_VERSION when running inside an agent
    if (!env.TEAMCITY_VERSION) return null;

    const out: any = {
        isTeamCity: true,
        agent: {},
        build: {},
        project: {},
        config: {},
        runner: {},
        vcs: {},
        trigger: {},
        checkout: {},
        parameters: {},
        artifacts: {},
        dependencies: {},
        docker: {},
        raw: {}
    };


    /* ============================================================
       1. AGENT METADATA
============================================================ */
    out.agent = {
        name: env.TEAMCITY_BUILDCONF_NAME,        // build config name shown on agent
        version: env.TEAMCITY_VERSION,            // TeamCity server version
        home: env.AGENT_HOME_DIR,
        workDir: env.AGENT_WORK_DIR,
        tempDir: env.TEMP,
        javaHome: env.JAVA_HOME,
        os: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        user: env.USER ?? env.LOGNAME,
        agentName: env.AGENT_NAME,
        agentId: env.AGENT_ID,
        tools: detectTeamCityAgentTools(env)
    };


    /* ============================================================
       2. BUILD METADATA
============================================================ */
    out.build = {
        id: env.BUILD_ID,
        number: env.BUILD_NUMBER,
        name: env.BUILD_NAME,
        branch: env.BRANCH_NAME ?? env.TEAMCITY_GIT_BRANCH,
        status: env.BUILD_STATUS,
        triggeredBy: env.BUILD_TRIGGERED_BY,
        checkoutDir: env.BUILD_CHECKOUTDIR,
        workingDir: env.BUILD_WORKINGDIR,
        typeId: env.TEAMCITY_BUILDCONF_ID,
        typeName: env.TEAMCITY_BUILDCONF_NAME,
        isPersonal: env.BUILD_IS_PERSONAL === "true",
        buildTypeInternalId: env.BUILD_TYPE_ID,
    };


    /* ============================================================
       3. PROJECT METADATA
============================================================ */
    out.project = {
        id: env.TEAMCITY_PROJECT_ID,
        name: env.TEAMCITY_PROJECT_NAME,
        externalId: env.TEAMCITY_PROJECT_EXTERNAL_ID,
        description: env.TEAMCITY_PROJECT_DESCRIPTION,
        projectPath: env.TEAMCITY_PROJECT_PATH,
    };


    /* ============================================================
       4. CONFIG METADATA
============================================================ */
    out.config = {
        configId: env.TEAMCITY_BUILDCONF_ID,
        configName: env.TEAMCITY_BUILDCONF_NAME,
        configFile: env.TEAMCITY_BUILDCONF_FILE,
        buildPropertiesFile: env.TEAMCITY_BUILD_PROPERTIES_FILE,
        internalProperties: loadProperties(env.TEAMCITY_BUILD_PROPERTIES_FILE),
    };


    /* ============================================================
       5. RUNNER METADATA (steps)
============================================================ */
    out.runner = {
        type: env.BUILD_RUNNER_TYPE,
        typeName: env.BUILD_RUNNER_TYPE_NAME,
        parameters: extractRunnerParams(env)
    };


    /* ============================================================
       6. VCS METADATA
============================================================ */
    out.vcs = {
        branch: env.TEAMCITY_GIT_BRANCH,
        commit: env.TEAMCITY_GIT_COMMIT,
        root: env.TEAMCITY_BUILD_VCS_ROOTS,
        repoUrl: env.TEAMCITY_GIT_REPOSITORY_URL,
    };


    /* ============================================================
       7. TRIGGER METADATA
============================================================ */
    out.trigger = {
        type: env.TEAMCITY_TRIGGER_TYPE,       // VCS, FinishBuild, Schedule, API
        details: env.TEAMCITY_TRIGGERED_BY,
        userId: env.TEAMCITY_TRIGGERS_USERID,
        username: env.BUILD_TRIGGERED_BY,
    };


    /* ============================================================
       8. CHECKOUT RULES
============================================================ */
    out.checkout = {
        rules: env.TEAMCITY_VCS_CHECKOUT_RULES,
        mode: env.TEAMCITY_VCS_CHECKOUT_MODE, // on agent, on server
    };


    /* ============================================================
       9. PARAMETERS
       Includes system/env/config parameters. Detects encrypted.
============================================================ */
    out.parameters = {
        system: extractPrefixed(env, "SYSTEM_"),
        env: extractPrefixed(env, "ENV_"),
        config: extractPrefixed(env, "CONFIG_"),
        secure: detectSecureParams(env),
    };


    /* ============================================================
       10. ARTIFACTS
============================================================ */
    out.artifacts = {
        path: env.ARTIFACTS_DIR,
        publishing: env.ARTIFACT_PUBLISHING === "true",
    };


    /* ============================================================
       11. DEPENDENCIES / BUILD CHAINS
============================================================ */
    out.dependencies = {
        snapshotDependencies: env.BUILD_SNAPSHOT_DEPENDENCIES,
        artifactDependencies: env.BUILD_ARTIFACT_DEPENDENCIES,
    };


    /* ============================================================
       12. DOCKER / CONTAINER DETECTION
============================================================ */
    out.docker = {
        inDocker: fs.existsSync("/.dockerenv"),
        cgroup: detectCgroup(),
        dockerImage: env.TEAMCITY_DOCKER_IMAGE,
        containerName: env.TEAMCITY_DOCKER_CONTAINER_NAME,
    };


    /* ============================================================
       13. RAW ENV DUMP (TEAMCITY_*, SYSTEM_*, ENV_*, AGENT_*)
============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([key]) =>
            key.startsWith("TEAMCITY_") ||
            key.startsWith("SYSTEM_") ||
            key.startsWith("ENV_") ||
            key.startsWith("AGENT_") ||
            key.startsWith("BUILD_")
        )
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

function extractPrefixed(env: Record<string, string>, prefix: string) {
    const out: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith(prefix)) {
            out[key.replace(prefix, "")] = env[key];
        }
    }
    return out;
}

function detectSecureParams(env: Record<string, string>) {
    const out: Record<string, string> = {};
    for (const key in env) {
        if (key.toLowerCase().includes("secure") || key.includes("PASSWORD")) {
            out[key] = env[key];
        }
    }
    return out;
}

function detectTeamCityAgentTools(env: Record<string, string>) {
    const tools: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith("TEAMCITY_AGENT_TOOL_")) {
            tools[key.replace("TEAMCITY_AGENT_TOOL_", "")] = env[key];
        }
    }
    return tools;
}

function extractRunnerParams(env: Record<string, string>) {
    const params: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith("BUILD_RUNNER_PARAM_")) {
            params[key.replace("BUILD_RUNNER_PARAM_", "")] = env[key];
        }
    }
    return params;
}

function loadProperties(file?: string) {
    if (!file || !fs.existsSync(file)) return null;
    const data = fs.readFileSync(file, "utf8");
    const props: Record<string, string> = {};

    for (const line of data.split("\n")) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            props[match[1]] = match[2];
        }
    }
    return props;
}

function detectCgroup() {
    try { return fs.readFileSync("/proc/1/cgroup", "utf8"); }
    catch { return null; }
}

/* ============================================================
   A61 — JENKINS RUNTIME DETECTOR
   Covers Jenkins Freestyle, Pipeline, Multibranch, Blue Ocean,
   Agents, Docker agents, Kubernetes agents, and SCM metadata.
============================================================ */

import fs from "fs";
import os from "os";

export function extractJenkinsInfo(env: Record<string, string>) {
    // Jenkins always sets JENKINS_URL OR BUILD_ID
    if (!env.JENKINS_URL && !env.BUILD_ID) return null;

    const out: any = {
        isJenkins: true,
        controller: {},
        build: {},
        job: {},
        scm: {},
        pipeline: {},
        node: {},
        triggers: {},
        workspace: {},
        agent: {},
        blueocean: {},
        raw: {}
    };


    /* ============================================================
       1. CONTROLLER (MASTER) INFO
============================================================ */
    out.controller = {
        url: env.JENKINS_URL,
        home: env.JENKINS_HOME,
        serverCookie: env.JENKINS_SERVER_COOKIE,
        executorNumber: env.EXECUTOR_NUMBER,
    };


    /* ============================================================
       2. BUILD INFO
============================================================ */
    out.build = {
        id: env.BUILD_ID,
        number: env.BUILD_NUMBER,
        tag: env.BUILD_TAG,
        url: env.BUILD_URL,
        displayName: env.BUILD_DISPLAY_NAME,
        timestamp: env.BUILD_TIMESTAMP,
        user: env.BUILD_USER ?? env.BUILD_USER_ID,
        cause: env.BUILD_CAUSE,
        isMultibranch: !!env.JENKINS_BRANCH,
        branchName: env.BRANCH_NAME ?? env.GIT_BRANCH ?? env.JENKINS_BRANCH,
        isPR: !!env.CHANGE_ID,
        change: extractPRInfo(env),
    };


    /* ============================================================
       3. JOB INFO
============================================================ */
    out.job = {
        name: env.JOB_NAME,
        baseName: env.JOB_BASE_NAME,
        url: env.JOB_URL,
        workspace: env.WORKSPACE,
        multibranchIndexing: env.MULTIBRANCH_INDEXING === "true",
        jobType: detectJobType(env),
        parent: env.JOB_PARENT_NAME,
    };


    /* ============================================================
       4. SCM INFO — Git, SVN, Hg
============================================================ */
    out.scm = {
        git: extractGitSCM(env),
        svn: extractSVN(env),
        hg: extractHg(env)
    };


    /* ============================================================
       5. PIPELINE INFO (Jenkinsfile)
============================================================ */
    out.pipeline = {
        isPipeline: !!env.PIPELINE_VERSION || !!env.JENKINS_PIPELINE,
        scriptPath: env.JENKINSFILE ?? env.PIPELINE_SCRIPT,
        runNode: env.NODE_NAME,
        runExecutor: env.EXECUTOR_NUMBER,
        workspace: env.WORKSPACE,
    };


    /* ============================================================
       6. NODE/AGENT INFO
============================================================ */
    out.node = {
        name: env.NODE_NAME,
        labels: env.NODE_LABELS,
        root: env.JENKINS_AGENT_ROOT ?? env.NODE_ROOT,
        home: env.HOME,
        type: detectNodeType(env),
    };


    /* ============================================================
       7. TRIGGERS
============================================================ */
    out.triggers = {
        cron: env.BUILD_CAUSE_CRONTRIGGER,
        scm: env.BUILD_CAUSE_SCMTRIGGER,
        upstream: env.BUILD_CAUSE_UPSTREAMTRIGGER,
        userId: env.BUILD_USER_ID,
    };


    /* ============================================================
       8. WORKSPACE INFO
============================================================ */
    out.workspace = {
        path: env.WORKSPACE,
        temp: env.TMPDIR ?? env.TMP ?? env.TEMP,
        fs: extractWorkspaceFS(env),
    };


    /* ============================================================
       9. AGENT RUNTIME (Docker, K8s, SSH)
============================================================ */
    out.agent = {
        dockerAgent: !!env.DOCKER_CONTAINER_ID || fs.existsSync("/.dockerenv"),
        dockerImage: env.DOCKER_IMAGE,
        k8sAgent: !!env.KUBERNETES_PORT || env.JENKINS_K8S_POD,
        sshAgent: !!env.JENKINS_SSH_AGENT,
        nodeJsPath: env.NODEJS_HOME,
        javaHome: env.JAVA_HOME,
        shell: env.SHELL,
        tools: extractAgentTools(env)
    };


    /* ============================================================
       10. BLUE OCEAN INFO
============================================================ */
    out.blueocean = {
        isBlueOcean: !!env.BLUEOCEAN_FEATURE,
        pipelineName: env.BLUEOCEAN_PIPELINE_NAME,
        runId: env.BLUEOCEAN_RUN_ID,
        branch: env.BLUEOCEAN_BRANCH_NAME,
        org: env.BLUEOCEAN_ORGANIZATION,
    };


    /* ============================================================
       11. RAW JENKINS-RELATED VARIABLES
============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([key]) =>
            key.startsWith("JENKINS_") ||
            key.startsWith("BUILD_") ||
            key.startsWith("JOB_") ||
            key.startsWith("GIT_") ||
            key.startsWith("SVN_") ||
            key.startsWith("HG_")
        )
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

function detectJobType(env: Record<string, string>) {
    if (env.CHANGE_ID) return "Pull Request";
    if (env.MULTIBRANCH_INDEXING === "true") return "Multibranch Indexing";
    if (env.JENKINS_PIPELINE) return "Pipeline Job";
    if (env.JOB_NAME?.includes("matrix")) return "Matrix Job";
    return "Freestyle/Classic Job";
}

function detectNodeType(env: Record<string, string>) {
    if (env.JENKINS_URL?.includes("localhost")) return "Controller";
    if (env.NODE_NAME === "master" || env.NODE_NAME === "built-in") return "Controller";
    return "Agent Node";
}

function extractGitSCM(env: Record<string, string>) {
    if (!env.GIT_COMMIT && !env.GIT_URL) return null;
    return {
        commit: env.GIT_COMMIT,
        branch: env.GIT_BRANCH,
        url: env.GIT_URL,
        previousCommit: env.GIT_PREVIOUS_COMMIT,
        previousSuccessfulCommit: env.GIT_PREVIOUS_SUCCESSFUL_COMMIT,
    };
}

function extractSVN(env: Record<string, string>) {
    if (!env.SVN_REVISION) return null;
    return {
        revision: env.SVN_REVISION,
        url: env.SVN_URL,
        root: env.SVN_ROOT,
    };
}

function extractHg(env: Record<string, string>) {
    if (!env.HG_REVISION) return null;
    return {
        revision: env.HG_REVISION,
        branch: env.HG_BRANCH,
        url: env.HG_URL,
    };
}

function extractPRInfo(env: Record<string, string>) {
    if (!env.CHANGE_ID) return null;
    return {
        id: env.CHANGE_ID,
        target: env.CHANGE_TARGET,
        branch: env.CHANGE_BRANCH,
        author: env.CHANGE_AUTHOR,
        url: env.CHANGE_URL,
    };
}

function extractWorkspaceFS(env: Record<string, string>) {
    const ws = env.WORKSPACE;
    if (!ws || !fs.existsSync(ws)) return null;

    try {
        const stat = fs.statSync(ws);
        return {
            type: stat.isDirectory() ? "directory" : "file",
            size: stat.size,
            uid: stat.uid,
            gid: stat.gid,
            mode: stat.mode,
        };
    } catch {
        return null;
    }
}

function extractAgentTools(env: Record<string, string>) {
    const out: Record<string, string> = {};
    for (const key in env) {
        if (key.startsWith("TOOL_") || key.endsWith("_HOME") || key.endsWith("_ROOT")) {
            out[key] = env[key];
        }
    }
    return out;
}

/* ============================================================
   A62 — DOCKER SWARM RUNTIME DETECTOR
   Detects:
   - Swarm node role
   - Service Name / Task ID / Slot
   - Cluster metadata
   - Engine labels
   - Container metadata
   - Placement constraints
   - Overlay network metadata
   - Raw swarm signals
============================================================ */

import fs from "fs";
import os from "os";

export function extractDockerSwarmInfo(env: Record<string, string>) {
    const out: any = {
        inSwarm: false,
        node: {},
        service: {},
        task: {},
        container: {},
        engine: {},
        raw: {}
    };

    /* ============================================================
       1. BASIC SWARM SIGNALS
============================================================ */

    // If ANY of these exist, we are inside Swarm
    const swarmIndicators = [
        "SWARM_NODE_ID",
        "SWARM_SERVICE_ID",
        "SWARM_TASK_ID",
        "SERVICENAME",
        "TASKID",
        "TASKNAME"
    ];

    const isSwarm = swarmIndicators.some(key => env[key]);
    if (!isSwarm) return null;

    out.inSwarm = true;


    /* ============================================================
       2. NODE INFO
============================================================ */

    out.node = {
        id: env.SWARM_NODE_ID ?? env.NODE_ID ?? null,
        hostname: env.NODE_HOSTNAME ?? os.hostname(),
        role: env.SWARM_NODE_ROLE ?? env.NODE_ROLE ?? detectNodeRole(env),
        advertiseAddr: env.SWARM_ADVERTISE_ADDR ?? null,
        platform: {
            os: env.NODE_PLATFORM_OS ?? null,
            arch: env.NODE_PLATFORM_ARCH ?? null,
        },
        availability: env.SWARM_NODE_AVAILABILITY ?? null
    };


    /* ============================================================
       3. SERVICE INFO (docker service)
============================================================ */

    out.service = {
        id: env.SWARM_SERVICE_ID ?? env.SERVICE_ID ?? null,
        name: env.SWARM_SERVICE_NAME ?? env.SERVICE_NAME ?? env.SERVICENAME ?? null,
        labels: extractServiceLabels(env),
        mode: env.SWARM_SERVICE_MODE ?? null,
        replicas: env.SWARM_SERVICE_REPLICAS ?? null,
        updateStatus: env.SWARM_SERVICE_UPDATE_STATUS ?? null,
        version: env.SWARM_SERVICE_VERSION ?? null,
        createdAt: env.SWARM_SERVICE_CREATED ?? null,
        updatedAt: env.SWARM_SERVICE_UPDATED ?? null,
        endpoint: extractServiceEndpoint(env),
        placement: extractPlacement(env),
    };


    /* ============================================================
       4. TASK INFO (docker service ps)
============================================================ */

    out.task = {
        id: env.SWARM_TASK_ID ?? env.TASK_ID ?? env.TASKID ?? null,
        name: env.SWARM_TASK_NAME ?? env.TASK_NAME ?? env.TASKNAME ?? null,
        slot: env.SWARM_TASK_SLOT ?? env.TASK_SLOT ?? null,
        attempt: env.SWARM_TASK_ATTEMPT ?? null,
        state: env.SWARM_TASK_STATE ?? env.TASK_STATE ?? null,
        desiredState: env.SWARM_TASK_DESIRED_STATE ?? null,
        nodeId: env.SWARM_TASK_NODE_ID ?? env.TASK_NODE_ID ?? null,
        exitCode: env.SWARM_TASK_EXIT_CODE ?? null,
        errorMessage: env.SWARM_TASK_ERROR ?? null,
        timestamp: env.SWARM_TASK_TIMESTAMP ?? null,
        containerSpec: extractContainerSpec(env),
    };


    /* ============================================================
       5. CONTAINER INFO (runtime context)
============================================================ */

    out.container = {
        id: extractContainerID(),
        name: env.CONTAINER_NAME ?? null,
        image: env.CONTAINER_IMAGE ?? null,
        networks: extractNetworks(),
        mounts: extractMounts(),
    };


    /* ============================================================
       6. ENGINE INFO
============================================================ */

    out.engine = {
        labels: extractEngineLabels(),
        cgroupDriver: detectCgroupDriver(),
        dockerRootDir: detectDockerRootDir(),
        version: env.DOCKER_ENGINE_VERSION ?? null,
    };


    /* ============================================================
       7. RAW SWARM-RELATED ENV
============================================================ */

    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.includes("SWARM") ||
            k.includes("SERVICE") ||
            k.includes("TASK") ||
            k.includes("NODE_")
        )
    );

    return out;
}

/* ============================================================
   HELPERS
============================================================ */

function detectNodeRole(env: Record<string, string>) {
    if (env.SWARM_NODE_ROLE) return env.SWARM_NODE_ROLE;
    if (env.NODE_ROLE) return env.NODE_ROLE;
    // If we see manager-specific env, return manager
    if (env.SWARM_MANAGER) return "manager";
    return "worker";
}

function extractServiceLabels(env: Record<string, string>) {
    const out: any = {};
    for (const key in env) {
        if (key.startsWith("SERVICE_LABEL_")) {
            const name = key.replace("SERVICE_LABEL_", "").toLowerCase();
            out[name] = env[key];
        }
    }
    return out;
}

function extractContainerSpec(env: Record<string, string>) {
    return {
        image: env.SWARM_TASK_CONTAINER_IMAGE ?? env.TASK_CONTAINER_IMAGE,
        command: env.SWARM_TASK_CONTAINER_COMMAND,
        env: env.SWARM_TASK_ENV,
    };
}

function extractPlacement(env: Record<string, string>) {
    return {
        constraints: env.SWARM_PLACEMENT_CONSTRAINTS,
        prefs: env.SWARM_PLACEMENT_PREFS,
    };
}

function extractServiceEndpoint(env: Record<string, string>) {
    return {
        ports: env.SWARM_SERVICE_PORTS,
        virtualIPs: env.SWARM_SERVICE_VIRTUAL_IPS,
    };
}

function extractContainerID() {
    try {
        const cg = fs.readFileSync("/proc/self/cgroup", "utf8");
        const match = cg.match(/docker[-/](\w{12,64})/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function extractNetworks() {
    const networks: string[] = [];
    try {
        const files = fs.readdirSync("/sys/class/net");
        return files;
    } catch {
        return [];
    }
}

function extractMounts() {
    try {
        const mounts = fs.readFileSync("/proc/self/mountinfo", "utf8");
        return mounts.split("\n").filter(Boolean);
    } catch {
        return [];
    }
}

function extractEngineLabels() {
    const out: any = {};
    try {
        const info = fs.readFileSync("/etc/docker/daemon.json", "utf8");
        const parsed = JSON.parse(info);
        if (parsed.labels) {
            for (const label of parsed.labels) {
                const [k, v] = label.split("=");
                out[k] = v;
            }
        }
    } catch { }
    return out;
}

function detectCgroupDriver() {
    try {
        const cg = fs.readFileSync("/proc/self/cgroup", "utf8");
        return cg.includes("systemd") ? "systemd" : "cgroupfs";
    } catch {
        return null;
    }
}

function detectDockerRootDir() {
    try {
        if (fs.existsSync("/var/lib/docker")) return "/var/lib/docker";
        if (fs.existsSync("/mnt/data/docker")) return "/mnt/data/docker";
        return null;
    } catch {
        return null;
    }
}

/* ============================================================
   A63 — OPENSHIFT SERVERLESS (KNATIVE + OPENSHIFT) DETECTOR

   Covers:
   - Knative Serving (services, revisions, traffic, autoscaler)
   - Knative Eventing (brokers, triggers, channels)
   - OpenShift BuildConfig / DeploymentConfig
   - OpenShift Route + Project + Namespace
   - Pod/Revision mapping
   - KNative autoscaler signals
   - Full cluster/env metadata

   Works in OpenShift 3.x, 4.x, and Knative upstream.
============================================================ */

import fs from "fs";
import os from "os";

export function extractOpenShiftServerlessInfo(env: Record<string, string>) {
    const isKnative = detectKnative(env);
    const isOpenShift = detectOpenShift(env);

    if (!isKnative && !isOpenShift) return null;

    const out: any = {
        isKnative,
        isOpenShift,
        service: {},
        revision: {},
        route: {},
        autoscaler: {},
        eventing: {},
        build: {},
        deployment: {},
        project: {},
        pod: {},
        raw: {}
    };

    /* ============================================================
       1. POD / WORKLOAD INFO
============================================================ */
    out.pod = {
        name: env.HOSTNAME ?? null,
        namespace: env.POD_NAMESPACE ?? env.OPENSHIFT_BUILD_NAMESPACE ?? env.KNATIVE_NAMESPACE ?? null,
        uid: env.POD_UID ?? null,
        nodeName: env.K8S_NODE_NAME ?? env.KUBERNETES_NODE_NAME ?? env.NODE_NAME ?? null,
        ip: env.POD_IP ?? null
    };


    /* ============================================================
       2. OPENSHIFT PROJECT INFO
============================================================ */
    out.project = {
        name: env.OPENSHIFT_BUILD_NAMESPACE ?? env.PROJECT_NAME ?? env.POD_NAMESPACE ?? null,
        annotations: extractAnnotations("/var/run/secrets/kubernetes.io/serviceaccount/namespace")
    };


    /* ============================================================
       3. KNATIVE SERVICE INFO
============================================================ */
    out.service = {
        name: env.K_SERVICE ?? env.SERVING_SERVICE ?? null,
        namespace: env.K_CONFIGURATION ?? env.KNATIVE_NAMESPACE ?? env.POD_NAMESPACE ?? null,
        url: env.K_SERVICE_URL ?? null,
        trafficTarget: env.K_TRAFFIC_TARGET ?? null,
        rollout: env.K_ROLLOUT ?? env.SERVING_ROLLOUT ?? null
    };


    /* ============================================================
       4. KNATIVE REVISION INFO
============================================================ */
    out.revision = {
        name: env.K_REVISION ?? env.SERVING_REVISION ?? null,
        generation: env.K_REVISION_GENERATION ?? null,
        isLatestReady: env.K_REVISION_IS_LATEST_READY === "true",
        service: env.K_SERVICE,
        containerConcurrency: env.K_CONTAINER_CONCURRENCY ?? null,
        timeoutSeconds: env.K_REVISION_TIMEOUT ?? null,
    };


    /* ============================================================
       5. KNATIVE ROUTE INFO
============================================================ */
    out.route = {
        name: env.K_ROUTE ?? env.SERVING_ROUTE ?? null,
        url: env.K_ROUTE_URL ?? null,
        domain: env.K_ROUTE_DOMAIN ?? null,
        trafficSplit: env.K_TRAFFIC_SPLIT ?? null
    };


    /* ============================================================
       6. KNATIVE AUTOSCALER METADATA
============================================================ */
    out.autoscaler = {
        class: env.K_AUTOSCALER_CLASS ?? null,
        metric: env.K_AUTOSCALER_METRIC ?? null,
        window: env.K_AUTOSCALER_WINDOW ?? null,
        target: env.K_AUTOSCALER_TARGET ?? null,
        initialScale: env.K_AUTOSCALER_INITIAL_SCALE ?? null,
        maxScale: env.K_AUTOSCALER_MAX_SCALE ?? env.SERVING_MAX_SCALE ?? null,
        minScale: env.K_AUTOSCALER_MIN_SCALE ?? env.SERVING_MIN_SCALE ?? null,
        panicWindow: env.K_AUTOSCALER_PANIC_WINDOW ?? null,
        panicThreshold: env.K_AUTOSCALER_PANIC_THRESHOLD ?? null,
    };


    /* ============================================================
       7. KNATIVE EVENTING
============================================================ */
    out.eventing = {
        broker: env.K_BROKER ?? null,
        triggerName: env.K_TRIGGER ?? null,
        channelName: env.K_CHANNEL ?? null,
        eventType: env.CE_TYPE ?? env.EVENT_TYPE ?? null,
        eventSource: env.CE_SOURCE ?? null,
        eventId: env.CE_ID ?? null
    };


    /* ============================================================
       8. OPENSHIFT BUILDCONFIG
============================================================ */
    if (env.OPENSHIFT_BUILD_NAME || env.OPENSHIFT_BUILD_NAMESPACE) {
        out.build = {
            name: env.OPENSHIFT_BUILD_NAME,
            namespace: env.OPENSHIFT_BUILD_NAMESPACE,
            sourceRepo: env.SOURCE_REPOSITORY_URL,
            commit: env.SOURCE_REPOSITORY_REF,
            contextDir: env.SOURCE_CONTEXT_DIR,
            buildNumber: env.OPENSHIFT_BUILD_NUMBER,
            strategy: env.OPENSHIFT_BUILD_STRATEGY,
            outputImage: env.OUTPUT_IMAGE ?? null,
        };
    }


    /* ============================================================
       9. OPENSHIFT DEPLOYMENTCONFIG
============================================================ */
    out.deployment = {
        name: env.DEPLOYMENT_CONFIG_NAME ?? null,
        id: env.DEPLOYMENT_ID ?? null,
        namespace: env.DEPLOYMENT_NAMESPACE ?? null,
        version: env.DEPLOYMENT_VERSION ?? null,
        podTemplateHash: env.POD_TEMPLATE_HASH ?? null,
    };


    /* ============================================================
       10. RAW SIGNALS
============================================================ */
    out.raw = Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("K_") ||
            k.startsWith("KNATIVE") ||
            k.startsWith("SERVING_") ||
            k.startsWith("OPENSHIFT") ||
            k.startsWith("DEPLOYMENT") ||
            k.startsWith("SOURCE_REPOSITORY")
        )
    );

    return out;
}


/* ============================================================
   HELPERS
============================================================ */

function detectKnative(env: Record<string, string>) {
    return (
        !!env.K_SERVICE ||
        !!env.K_REVISION ||
        !!env.K_CONFIGURATION ||
        !!env.SERVING_SERVICE ||
        !!env.SERVING_REVISION
    );
}

function detectOpenShift(env: Record<string, string>) {
    return (
        !!env.OPENSHIFT_BUILD_NAME ||
        !!env.OPENSHIFT_BUILD_NAMESPACE ||
        !!env.DEPLOYMENT_CONFIG_NAME
    );
}

function extractAnnotations(path: string) {
    try {
        if (!fs.existsSync(path)) return null;
        return fs.readFileSync(path, "utf8").trim();
    } catch {
        return null;
    }
}

/* ============================================================
   A64 — FIREBASE CLOUD FUNCTIONS RUNTIME DETECTOR
   Full coverage of:
   - Firebase Functions v1
   - Firebase Functions v2 (Cloud Run backend)
   - Triggers (auth, db, firestore, pubsub, storage, scheduler)
   - Hosting rewrites
   - Emulator Suite
   - Firebase Tools / Local serve
   - Env injection (FIREBASE_CONFIG)
   - Callable Functions metadata
   - Cross-project deployment
   - Cloud Run layer for gen2
============================================================ */

export function extractFirebaseFunctionsInfo(env: Record<string, string>) {
    const isFirebase =
        !!env.FIREBASE_CONFIG ||
        !!env.FUNCTION_TARGET ||
        !!env.FUNCTION_SIGNATURE_TYPE ||
        !!env.FUNCTION_TRIGGER_TYPE ||
        !!env.FUNCTIONS_EMULATOR;

    if (!isFirebase) return null;

    const out: any = {
        isFirebase: true,
        version: detectFirebaseVersion(env),
        emulator: extractEmulatorInfo(env),
        hosting: extractHostingRewriteInfo(env),
        target: extractFunctionTarget(env),
        trigger: extractFunctionTrigger(env),
        callable: extractCallableInfo(env),
        firebaseConfig: extractFirebaseConfig(env),
        project: extractFirebaseProjectInfo(env),
        cloudRunLayer: extractCloudRunBackend(env),   // v2 only
        raw: extractRawFirebaseVars(env)
    };

    return out;
}

/* ============================================================
   1. VERSION DETECTION (v1 vs v2)
============================================================ */
function detectFirebaseVersion(env: Record<string, string>) {
    // v2 has Cloud Run environment
    if (env.K_SERVICE || env.K_REVISION || env.GCP_REGION) return "v2";

    // v1 has classic Function metadata
    if (env.FUNCTION_TARGET && env.FUNCTION_SIGNATURE_TYPE) return "v1";

    // Emulator may set both
    if (env.FUNCTIONS_EMULATOR) return "emulator";

    return "unknown";
}

/* ============================================================
   2. EMULATOR SUITE DETECTION
============================================================ */
function extractEmulatorInfo(env: Record<string, string>) {
    if (!env.FUNCTIONS_EMULATOR) return null;

    return {
        isEmulator: true,
        emulatorPort: env.FUNCTIONS_EMULATOR_PORT,
        hub: env.FIREBASE_EMULATOR_HUB,
        auth: env.FIREBASE_AUTH_EMULATOR_HOST,
        firestore: env.FIRESTORE_EMULATOR_HOST,
        database: env.FIREBASE_DATABASE_EMULATOR_HOST,
        pubsub: env.PUBSUB_EMULATOR_HOST,
        storage: env.FIREBASE_STORAGE_EMULATOR_HOST,
        ui: env.FIREBASE_EMULATOR_UI,
        projectId: env.GCLOUD_PROJECT ?? env.FIREBASE_PROJECT,
    };
}

/* ============================================================
   3. HOSTING REWRITE → FUNCTIONS
============================================================ */
function extractHostingRewriteInfo(env: Record<string, string>) {
    if (!env.FIREBASE_DEPLOY_TARGET || !env.FIREBASE_CONFIG) return null;

    return {
        usesRewrite: true,
        target: env.FIREBASE_DEPLOY_TARGET,
        site: env.FIREBASE_SITE_NAME,
    };
}

/* ============================================================
   4. FUNCTION TARGET METADATA (FUNCTION_TARGET)
============================================================ */
function extractFunctionTarget(env: Record<string, string>) {
    return {
        name: env.FUNCTION_TARGET ?? null,
        signatureType: env.FUNCTION_SIGNATURE_TYPE ?? null,
        region: env.FUNCTION_REGION ?? env.GCLOUD_REGION ?? null,
    };
}

/* ============================================================
   5. TRIGGER DETECTION
============================================================ */
function extractFunctionTrigger(env: Record<string, string>) {
    const type = env.FUNCTION_TRIGGER_TYPE ?? null;

    if (!type) return null;

    const base = { type };

    switch (type) {
        case "google.firestore.document.write":
            return { ...base, firestorePath: env.FIRESTORE_PATH };

        case "google.pubsub.topic.publish":
            return { ...base, topic: env.PUBSUB_TOPIC };

        case "google.storage.object.change":
            return {
                ...base,
                bucket: env.FIREBASE_STORAGE_BUCKET,
                eventType: env.EVENT_TYPE,
            };

        case "google.firebase.auth.user.create":
        case "google.firebase.auth.user.delete":
            return { ...base, authEventType: env.EVENT_TYPE };

        case "google.firebase.database.ref.write":
            return {
                ...base,
                dbUrl: env.DATABASE_URL,
                dbPath: env.DATABASE_PATH,
            };

        case "google.scheduler.job.execute":
            return { ...base, schedule: env.CLOUD_SCHEDULER_SCHEDULE };

        default:
            return base;
    }
}

/* ============================================================
   6. CALLABLE FUNCTIONS DETECTION (signature=cloudevent/http)
============================================================ */
function extractCallableInfo(env: Record<string, string>) {
    if (env.FUNCTION_SIGNATURE_TYPE !== "http") return null;

    return {
        callable: true,
        origin: env.HTTP_HOST ?? null,
        protocol: env.HTTP_PROTOCOL ?? null,
        requestId: env.REQUEST_ID ?? null,
    };
}

/* ============================================================
   7. FIREBASE CONFIG (API key, App ID, Measurement ID, etc.)
============================================================ */
function extractFirebaseConfig(env: Record<string, string>) {
    if (!env.FIREBASE_CONFIG) return null;

    try {
        return JSON.parse(env.FIREBASE_CONFIG);
    } catch {
        return env.FIREBASE_CONFIG;
    }
}

/* ============================================================
   8. PROJECT METADATA
============================================================ */
function extractFirebaseProjectInfo(env: Record<string, string>) {
    return {
        projectId: env.GCLOUD_PROJECT ?? env.FIREBASE_PROJECT ?? null,
        storageBucket: env.STORAGE_BUCKET ?? null,
        databaseUrl: env.DATABASE_URL ?? null,
        emulatorProjectId: env.FIREBASE_EMULATOR_PROJECT ?? null,
    };
}

/* ============================================================
   9. CLOUD RUN BACKEND LAYER (for v2)
============================================================ */
function extractCloudRunBackend(env: Record<string, string>) {
    if (!env.K_SERVICE) return null;

    return {
        isCloudRun: true,
        service: env.K_SERVICE,
        revision: env.K_REVISION,
        config: env.K_CONFIGURATION,
        port: env.PORT ?? null,
        url: env.K_SERVICE_URL ?? null,
        timeout: env.K_REVISION_TIMEOUT ?? null,
    };
}

/* ============================================================
   10. RAW FIREBASE VARIABLES
============================================================ */
function extractRawFirebaseVars(env: Record<string, string>) {
    return Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("FIREBASE") ||
            k.startsWith("FUNCTION") ||
            k.startsWith("GCLOUD_PROJECT") ||
            k.startsWith("FIRESTORE") ||
            k.startsWith("DATABASE") ||
            k.startsWith("PUBSUB") ||
            k.startsWith("CLOUD_SCHEDULER") ||
            k.startsWith("K_")
        )
    );
}

/* ============================================================
   A65 — SHOPIFY OXYGEN RUNTIME DETECTOR
   Covers:
   - Shopify Oxygen runtime (prod/preview)
   - Hydrogen worker environment
   - Shopify Storefront runtime variables
   - C3 deployment pipeline
   - Hydrogen dev vs Oxygen deploy
   - Cloudflare Worker fallback signals
   - Shopify preview channels
   - H2 internals
============================================================ */

export function extractShopifyOxygenInfo(env: Record<string, string>) {
    const isOxygen = detectOxygen(env);
    const isHydrogenDev = detectHydrogenDev(env);
    const isCloudflare = detectCloudflareWorker(env); // fallback

    if (!isOxygen && !isHydrogenDev && !isCloudflare) return null;

    const out: any = {
        isOxygen,
        isHydrogenDev,
        isCloudflareWorker: isCloudflare,
        runtime: extractRuntimeLayer(env),
        storefront: extractStorefrontInfo(env),
        deployment: extractDeploymentInfo(env),
        caching: extractOxygenCaching(env),
        regions: extractOxygenRegion(env),
        h2: extractH2Internals(env),
        raw: extractRawOxygenEnv(env)
    };

    return out;
}

/* ============================================================
   DETECTORS
============================================================ */

function detectOxygen(env: Record<string, string>) {
    return !!env.OXYGEN_DEPLOYMENT_ID ||
        !!env.SHOPIFY_OXYGEN_REGION ||
        !!env.SHOPIFY_OXYGEN_VERSION ||
        !!env.OXYGEN_ENVIRONMENT;
}

function detectHydrogenDev(env: Record<string, string>) {
    return env.HYDROGEN_DEV === "true" ||
        env.HYDROGEN_SESSION_SECRET ||
        env.VITE_USER_NODE_ENV === "development";
}

function detectCloudflareWorker(env: Record<string, string>) {
    return (
        typeof globalThis.WebSocketPair !== "undefined" ||
        typeof globalThis.caches !== "undefined" ||
        !!env.CF_PAGES
    );
}

/* ============================================================
   1. RUNTIME METADATA
============================================================ */
function extractRuntimeLayer(env: Record<string, string>) {
    return {
        oxygenVersion: env.SHOPIFY_OXYGEN_VERSION ?? null,
        environment: env.OXYGEN_ENVIRONMENT ?? null, // production | preview | development
        deploymentId: env.OXYGEN_DEPLOYMENT_ID ?? null,
        workerEntrypoint: env.WORKER_ENTRY ?? env.HYDROGEN_ENTRY ?? null,
        channel: env.HYDROGEN_CHANNEL ?? "stable",
        userAgent: env.OXYGEN_USER_AGENT ?? null,
    };
}

/* ============================================================
   2. STOREFRONT METADATA (PUBLIC + PRIVATE)
============================================================ */
function extractStorefrontInfo(env: Record<string, string>) {
    return {
        // Public Storefront API
        storeDomain: env.PUBLIC_STORE_DOMAIN ?? env.STORE_DOMAIN ?? null,
        apiVersion: env.PUBLIC_STOREFRONT_API_VERSION ?? null,
        publicToken: env.PUBLIC_STOREFRONT_API_TOKEN ?? null,

        // Private Storefront API (server only)
        privateToken: env.PRIVATE_STOREFRONT_API_TOKEN ?? null,
        customerAccountUrl: env.CUSTOMER_ACCOUNT_API_URL ?? null,

        // Hydrogen Storefront metadata
        storefrontId: env.STOREFRONT_ID ?? null,
        storefrontPreviewToken: env.STOREFRONT_PREVIEW_TOKEN ?? null,
        storefrontPreviewChannel: env.STOREFRONT_PREVIEW_CHANNEL ?? null,

        // Markets
        defaultCountry: env.DEFAULT_COUNTRY ?? null,
        defaultLanguage: env.DEFAULT_LANGUAGE ?? null,
    };
}

/* ============================================================
   3. DEPLOYMENT METADATA (C3 PIPELINE)
============================================================ */
function extractDeploymentInfo(env: Record<string, string>) {
    return {
        c3BuildId: env.C3_BUILD_ID ?? null,
        c3CommitSha: env.C3_GIT_SHA ?? null,
        branch: env.C3_GIT_BRANCH ?? null,
        repo: env.C3_GIT_REPOSITORY ?? null,
        deployedBy: env.C3_USER ?? null,
        deploymentUrl: env.OXYGEN_DEPLOYMENT_URL ?? null
    };
}

/* ============================================================
   4. OXYGEN CACHING LAYER
============================================================ */
function extractOxygenCaching(env: Record<string, string>) {
    return {
        cacheEnabled: env.OXYGEN_CACHE_ENABLED === "true",
        cacheTtl: env.OXYGEN_CACHE_TTL ?? null,
        cacheTagsEnabled: env.OXYGEN_CACHE_TAGS_ENABLED === "true",
        cacheKey: env.OXYGEN_CACHE_KEY ?? null,
    };
}

/* ============================================================
   5. OXYGEN REGION / EDGE LOCATION
============================================================ */
function extractOxygenRegion(env: Record<string, string>) {
    return {
        region: env.SHOPIFY_OXYGEN_REGION ?? env.CF_REGION ?? null,
        colo: env.CF_COL ?? env.CF_CI_COL ?? null,
    };
}

/* ============================================================
   6. H2 INTERNAL RUNTIME METADATA
   (Shopify's hidden Hydrogen/Oxygen integration layer)
============================================================ */
function extractH2Internals(env: Record<string, string>) {
    const keys = [
        "H2_RUNTIME_VERSION",
        "H2_WORKER_MODE",
        "H2_ROUTER_MODE",
        "H2_SESSION_KEY",
        "H2_COMPONENT_CACHE",
        "H2_SSR_MODE",
        "H2_REACT_RUNTIME",
        "H2_DATA_RUNTIME"
    ];

    const internals: Record<string, string> = {};
    for (const k of keys) {
        if (env[k]) internals[k] = env[k];
    }
    return internals;
}

/* ============================================================
   7. RAW VARIABLES (full safe dump)
============================================================ */
function extractRawOxygenEnv(env: Record<string, string>) {
    return Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.includes("OXYGEN") ||
            k.includes("HYDROGEN") ||
            k.includes("SHOPIFY") ||
            k.includes("STOREFRONT") ||
            k.includes("H2_")
        )
    );
}

/* ============================================================
   A66 — CLOUDFLARE WORKERS FOR PLATFORMS DETECTOR

   Covers:
   - Workers for Platforms (WFP)
   - Dispatch Workers
   - Tenant-bound service Workers
   - Platform isolation boundaries
   - KV / DO / R2 tenant bindings
   - Account/project metadata
   - Routing metadata
   - Full platform-level env signals
============================================================ */

export function extractCloudflareWFPInfo(env: Record<string, string>) {
    const isWFP = detectWFP(env);
    const isDispatch = detectDispatchWorker(env);
    const isCFWorker = detectBaseWorker(env);

    if (!isWFP && !isDispatch && !isCFWorker) return null;

    const out: any = {
        isCloudflareWorker: isCFWorker,
        isWFP: isWFP,
        isDispatchWorker: isDispatch,
        platform: extractPlatformMetadata(env),
        tenant: extractTenantMetadata(env),
        bindings: extractWFPBindings(env),
        routing: extractRoutingInfo(env),
        resources: extractResourceIsolation(env),
        regions: extractRegionInfo(env),
        raw: extractRawCFVars(env),
    };

    return out;
}

/* ============================================================
   1. DETECT BASE CLOUDFLARE WORKER
============================================================ */
function detectBaseWorker(env: Record<string, string>) {
    return (
        typeof globalThis.WebSocketPair !== "undefined" ||
        typeof globalThis.caches !== "undefined" ||
        env.CF_PAGES === "1" ||
        !!env.CF_ACCOUNT_ID
    );
}

/* ============================================================
   2. DETECT WORKERS FOR PLATFORMS (WFP)
============================================================ */
function detectWFP(env: Record<string, string>) {
    return (
        !!env.CF_WORKER_PLATFORM ||
        !!env.CF_TENANT_ID ||
        !!env.CF_TENANT_NAME ||
        !!env.CF_APP_ID ||
        !!env.CF_APP_NAME
    );
}

/* ============================================================
   3. DETECT DISPATCH WORKER
============================================================ */
function detectDispatchWorker(env: Record<string, string>) {
    return (
        !!env.CF_DISPATCH_NAMESPACE ||
        !!env.CF_DISPATCH_WORKER ||
        !!env.CF_DISPATCH_ORIGIN ||
        !!env.CF_DISPATCH_SERVICE
    );
}

/* ============================================================
   4. PLATFORM METADATA
============================================================ */
function extractPlatformMetadata(env: Record<string, string>) {
    return {
        platformId: env.CF_WORKER_PLATFORM ?? null,
        platformName: env.CF_PLATFORM_NAME ?? null,
        accountId: env.CF_ACCOUNT_ID ?? null,
        projectName: env.CF_PROJECT_NAME ?? null,
        appId: env.CF_APP_ID ?? null,
        appName: env.CF_APP_NAME ?? null,
        environment: env.CF_ENVIRONMENT ?? null,
        deploymentId: env.CF_DEPLOYMENT_ID ?? null,
    };
}

/* ============================================================
   5. TENANT METADATA
============================================================ */
function extractTenantMetadata(env: Record<string, string>) {
    return {
        tenantId: env.CF_TENANT_ID ?? null,
        tenantName: env.CF_TENANT_NAME ?? null,
        tenantTag: env.CF_TENANT_TAG ?? null,
        userWorkerBinding: env.CF_TENANT_WORKER ?? null,
        userWorkerEntrypoint: env.CF_TENANT_ENTRY ?? null,
    };
}

/* ============================================================
   6. BINDINGS (KV / DO / R2 / SERVICE)
============================================================ */
function extractWFPBindings(env: Record<string, string>) {
    const bindings: Record<string, string> = {};

    for (const k in env) {
        if (
            k.includes("CF_BINDING") ||
            k.includes("CF_KV") ||
            k.includes("CF_DO") ||
            k.includes("CF_R2") ||
            k.includes("SERVICE") ||
            k.includes("BINDING")
        ) {
            bindings[k] = env[k];
        }
    }

    return bindings;
}

/* ============================================================
   7. ROUTING METADATA
============================================================ */
function extractRoutingInfo(env: Record<string, string>) {
    return {
        dispatchNamespace: env.CF_DISPATCH_NAMESPACE ?? null,
        dispatchWorker: env.CF_DISPATCH_WORKER ?? null,
        dispatchOrigin: env.CF_DISPATCH_ORIGIN ?? null,
        dispatchService: env.CF_DISPATCH_SERVICE ?? null,
        routePattern: env.CF_ROUTE_PATTERN ?? null,
        zoneId: env.CF_ZONE_ID ?? null,
    };
}

/* ============================================================
   8. RESOURCE ISOLATION (TENANT ISOLATED STORAGE)
============================================================ */
function extractResourceIsolation(env: Record<string, string>) {
    return {
        kvNamespace: env.CF_TENANT_KV ?? null,
        durableObjectNamespace: env.CF_TENANT_DO ?? null,
        r2Bucket: env.CF_TENANT_R2 ?? null,
        analyticsEngine: env.CF_TENANT_AE ?? null,
        queues: env.CF_TENANT_QUEUE ?? null,
    };
}

/* ============================================================
   9. REGION / COL LOCATION
============================================================ */
function extractRegionInfo(env: Record<string, string>) {
    return {
        region: env.CF_REGION ?? null,
        colo: env.CF_COL ?? null,
    };
}

/* ============================================================
   10. RAW CF VARIABLES
============================================================ */
function extractRawCFVars(env: Record<string, string>) {
    return Object.fromEntries(
        Object.entries(env).filter(([k]) =>
            k.startsWith("CF_") ||
            k.includes("WORKER") ||
            k.includes("TENANT") ||
            k.includes("DISPATCH")
        )
    );
}

/* ============================================================
   A67 — LINODE / AKAMAI CLOUD COMPUTE DETECTOR
============================================================ */

import fs from "fs";

export function extractLinodeInfo(env: Record<string, string>) {
    const isLinode = detectLinode(env);
    if (!isLinode) return null;

    return {
        isLinodeInstance: detectLinodeInstance(env),
        isLinodeFunctions: detectLinodeFunctions(env),
        isLishConsole: detectLishConsole(env),
        akamaiRebrand: detectAkamaiRebrand(env),
        userDataSignals: extractUserDataSignals(),
        envSignals: extractLinodeEnvSignals(env),
        hostname: getHostname(),
    };
}

/* ============================================================
   1. CORE DETECTION
============================================================ */
function detectLinode(env: Record<string, string>) {
    return (
        detectLinodeInstance(env) ||
        detectLinodeFunctions(env) ||
        detectLishConsole(env) ||
        detectAkamaiRebrand(env)
    );
}

/* ============================================================
   2. STANDARD LINUX VM (LINODE INSTANCE)
============================================================ */

function detectLinodeInstance(env: Record<string, string>) {
    // LISH and cloud-init signals
    if (env.LINODE_ID || env.LINODE_LABEL) return true;

    // Cloud-init datasource for Linode
    if (fs.existsSync("/var/lib/cloud/instances/linode-init")) return true;
    if (fs.existsSync("/var/lib/cloud/instance/obj.pkl")) {
        try {
            const data = fs.readFileSync("/var/lib/cloud/instance/obj.pkl", "utf8");
            if (data.includes("Linode")) return true;
        } catch { }
    }

    // Linode metadata agent
    if (fs.existsSync("/run/linode-agent")) return true;

    return false;
}

/* ============================================================
   3. LINODE FUNCTIONS (SERVERLESS)
============================================================ */

function detectLinodeFunctions(env: Record<string, string>) {
    return (
        !!env.LINODE_FUNCTION &&
        !!env.LINODE_FUNCTION_REGION
    );
}

/* ============================================================
   4. LISH CONSOLE DETECTION (LINODE SHELL)
============================================================ */

function detectLishConsole(env: Record<string, string>) {
    return (
        env.SSH_CONNECTION?.includes("lish") ||
        env.TERM?.toLowerCase().includes("linux-lish")
    );
}

/* ============================================================
   5. AKAMAI (LINODE REBRAND) SIGNALS
============================================================ */

function detectAkamaiRebrand(env: Record<string, string>) {
    return (
        !!env.AKAMAI_CLOUD ||
        !!env.AKAMAI_EDGEWORKERS ||
        !!env.AKAMAI_SERVICE_ID
    );
}

/* ============================================================
   6. ENVIRONMENT SIGNALS
============================================================ */

function extractLinodeEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};

    const patterns = [
        "LINODE",
        "LINODE_",
        "AKAMAI",
        "AKAMAI_",
        "LINODE_FUNCTION",
        "LINODE_REGION",
        "LINODE_METADATA",
        "LINODE_INSTANCE",
        "LINODE_INIT",
        "LISH",
    ];

    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   7. CLOUD-INIT / USER DATA SIGNALS
============================================================ */

function extractUserDataSignals() {
    const out: any = {};

    const paths = [
        "/var/lib/cloud/instance/user-data.txt",
        "/var/lib/cloud/instance/cloud-config.txt",
        "/var/lib/cloud/instance/obj.pkl",
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            out[p] = true;
        }
    }

    return out;
}

/* ============================================================
   8. HOSTNAME (LINODE HOSTNAMES ARE UNIQUE)
============================================================ */

function getHostname() {
    try {
        return require("os").hostname();
    } catch {
        return null;
    }
}

/* ============================================================
   A68 — VULTR CLOUD COMPUTE / VKE / SERVERLESS DETECTOR
============================================================ */
import fs from "fs";
import os from "os";

export function extractVultrInfo(env: Record<string, string>) {
    const isVultr = detectVultr(env);
    if (!isVultr) return null;

    return {
        isVultr,
        computeInstance: detectVultrCompute(env),
        kubernetes: detectVultrKubernetes(env),
        serverless: detectVultrServerless(env),
        startupScripts: detectVultrStartupScripts(),
        cloudInit: detectCloudInitVultr(),
        metadataSignals: extractVultrEnvSignals(env),
        hostname: os.hostname(),
        virtioEntropy: detectVirtioEntropyDevice(),
        vpcSignals: detectVultrVPC(env),
    };
}

/* ============================================================
   1. CORE DETECTION
============================================================ */
function detectVultr(env: Record<string, string>) {
    return (
        detectVultrCompute(env) ||
        detectVultrKubernetes(env) ||
        detectVultrServerless(env) ||
        detectCloudInitVultr() ||
        detectVirtioEntropyDevice()
    );
}

/* ============================================================
   2. VULTR CLOUD COMPUTE INSTANCE DETECTION
============================================================ */
function detectVultrCompute(env: Record<string, string>) {
    // Marketplace & metadata
    if (env.VULTR_API_KEY || env.VULTR_SUBID) return true;

    // Cloud-init serial device patterns unique to Vultr:
    if (fs.existsSync("/var/lib/cloud/instance/obj.pkl")) {
        try {
            const content = fs.readFileSync("/var/lib/cloud/instance/obj.pkl", "utf8");
            if (content.includes("Vultr")) return true;
        } catch { }
    }

    // Some Vultr images expose this
    if (fs.existsSync("/etc/vultr")) return true;

    // Vultr metadata vendor string
    if (fs.existsSync("/sys/devices/virtual/dmi/id/bios_vendor")) {
        try {
            const vendor = fs.readFileSync("/sys/devices/virtual/dmi/id/bios_vendor", "utf8");
            if (vendor.includes("Vultr")) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   3. VULTR MANAGED KUBERNETES (VKE) DETECTION
============================================================ */
function detectVultrKubernetes(env: Record<string, string>) {
    return (
        env.VKE_CLUSTER_ID ||
        env.VKE_NODEPOOL_ID ||
        env.VKE_NODE_ID ||
        process.env.KUBERNETES_SERVICE_HOST && (
            // VKE nodes always have this path
            fs.existsSync("/etc/vultr") ||
            env.VULTR_K8S === "true"
        )
    );
}

/* ============================================================
   4. VULTR SERVERLESS FUNCTIONS DETECTION
============================================================ */
function detectVultrServerless(env: Record<string, string>) {
    return (
        !!env.VULTR_FUNCTION_NAME ||
        !!env.VULTR_FUNCTION_VERSION ||
        !!env.VULTR_FUNCTION_REGION
    );
}

/* ============================================================
   5. CLOUD-INIT / STARTUP SCRIPTS (VULTR-SPECIFIC)
============================================================ */
function detectCloudInitVultr() {
    // Vultr uses cloud-init but bundles custom metadata
    const paths = [
        "/var/lib/cloud/instance/user-data.txt",
        "/var/lib/cloud/instance/vendor-data.txt",
        "/var/lib/cloud/instance/scripts/user",
        "/var/lib/cloud/scripts/per-once",
        "/etc/cloud/cloud.cfg.d/90_vultr.cfg",
    ];

    return paths.some(p => fs.existsSync(p));
}

function detectVultrStartupScripts() {
    const out: any = {};
    const paths = [
        "/var/lib/cloud/scripts/per-instance",
        "/var/lib/cloud/scripts/per-boot",
        "/var/lib/cloud/scripts/per-once",
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) out[p] = true;
    }

    return out;
}

/* ============================================================
   6. VULTR VPC SIGNALS
============================================================ */
function detectVultrVPC(env: Record<string, string>) {
    const keys = [
        "VULTR_VPC_ID",
        "VULTR_VPC2_ID",
        "VULTR_VPC_CIDR",
        "VULTR_VPC_NAME",
    ];

    const out: Record<string, string> = {};
    let found = false;

    for (const k of keys) {
        if (env[k]) {
            out[k] = env[k]!;
            found = true;
        }
    }

    return found ? out : null;
}

/* ============================================================
   7. VIRTIO ENTROPY DEVICE DETECTION (HYPERVISOR SIGNAL)
============================================================ */
function detectVirtioEntropyDevice() {
    const paths = [
        "/dev/hwrng",
        "/sys/devices/virtio-pci",
        "/sys/devices/virtual/misc/hw_random",
    ];

    return paths.some(p => fs.existsSync(p));
}

/* ============================================================
   8. ENVIRONMENT VARIABLE SIGNALS (FULL SCAN)
============================================================ */
function extractVultrEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const patterns = [
        "VULTR",
        "VULTR_",
        "VKE_",
        "VULTR_FUNCTION",
        "VULTR_VPC",
    ];

    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A69 — UPCLOUD VM / METADATA / KUBERNETES DETECTOR
============================================================ */

import fs from "fs";
import os from "os";

export function extractUpCloudInfo(env: Record<string, string>) {
    if (!detectUpCloud(env)) return null;

    return {
        isUpCloud: true,
        computeInstance: detectUpCloudVM(env),
        kubernetes: detectUpCloudKubernetes(env),
        vendorFiles: detectUpCloudVendorFiles(),
        metadataSignals: extractUpCloudEnvSignals(env),
        dmi: detectUpCloudDMI(),
        hostname: os.hostname(),
    };
}

/* ============================================================
   1. MASTER DETECTOR
============================================================ */
function detectUpCloud(env: Record<string, string>) {
    return (
        detectUpCloudVM(env) ||
        detectUpCloudKubernetes(env) ||
        detectUpCloudVendorFiles() ||
        detectUpCloudDMI()
    );
}

/* ============================================================
   2. UPCLOUD STANDARD VM DETECTION
============================================================ */
function detectUpCloudVM(env: Record<string, string>) {
    // Cloud-init UpCloud vendor config
    if (fs.existsSync("/var/lib/cloud/instance/vendor-data.json")) {
        try {
            const d = fs.readFileSync("/var/lib/cloud/instance/vendor-data.json", "utf8");
            if (d.includes("upcloud")) return true;
        } catch { }
    }

    // UpCloud exposes unique datasource name
    if (fs.existsSync("/run/cloud-init/ds-identify.log")) {
        try {
            const log = fs.readFileSync("/run/cloud-init/ds-identify.log", "utf8");
            if (log.toLowerCase().includes("upcloud")) return true;
        } catch { }
    }

    // UpCloud metadata token is exposed in some images
    if (env.UPCLOUD_API_TOKEN) return true;

    // Marketplace images sometimes expose this path
    if (fs.existsSync("/etc/upcloud")) return true;

    return false;
}

/* ============================================================
   3. UPCLOUD MANAGED KUBERNETES (UKS)
============================================================ */
function detectUpCloudKubernetes(env: Record<string, string>) {
    return (
        env.UPCLOUD_CLUSTER_UUID ||
        env.UPCLOUD_NODE_UUID ||
        (
            process.env.KUBERNETES_SERVICE_HOST &&
            fs.existsSync("/etc/upcloud")
        )
    );
}

/* ============================================================
   4. VENDOR FILES (CLOUD-INIT)
============================================================ */
function detectUpCloudVendorFiles() {
    const indicators = [
        "/var/lib/cloud/instance/vendor-data",
        "/var/lib/cloud/instance/vendor-data.json",
        "/etc/cloud/cloud.cfg.d/90_upcloud.cfg",
    ];

    return indicators.some(p => fs.existsSync(p));
}

/* ============================================================
   5. UPCLOUD DMI IDENTIFIERS
============================================================ */
function detectUpCloudDMI() {
    const dmiPaths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of dmiPaths) {
        if (fs.existsSync(p)) {
            try {
                const t = fs.readFileSync(p, "utf8").toLowerCase();
                if (t.includes("upcloud")) return true;
            } catch { }
        }
    }

    return false;
}

/* ============================================================
   6. ENVIRONMENT VARIABLES
============================================================ */
function extractUpCloudEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const patterns = [
        "UPCLOUD",
        "UPCLOUD_",
        "UP_CLOUD",
        "UP_CLOUD_",
    ];

    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A70 — IONOS CLOUD (Compute + IKS + Functions) DETECTOR
============================================================ */

import fs from "fs";
import os from "os";

export function extractIonosInfo(env: Record<string, string>) {
    if (!detectIonos(env)) return null;

    return {
        isIonos: true,
        computeInstance: detectIonosCompute(env),
        kubernetes: detectIonosKubernetes(env),
        serverless: detectIonosFunctions(env),
        vendorFiles: detectIonosVendorFiles(),
        dmi: detectIonosDMI(),
        network: detectIonosNetwork(),
        envSignals: extractIonosEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   1. MASTER DETECTOR
============================================================ */
function detectIonos(env: Record<string, string>) {
    return (
        detectIonosCompute(env) ||
        detectIonosKubernetes(env) ||
        detectIonosFunctions(env) ||
        detectIonosVendorFiles() ||
        detectIonosDMI() ||
        detectIonosNetwork()
    );
}

/* ============================================================
   2. IONOS COMPUTE INSTANCES
============================================================ */
function detectIonosCompute(env: Record<string, string>) {
    // Cloud-init vendor (ionos.cfg)
    const vendorCfg = "/etc/cloud/cloud.cfg.d/99_ionos.cfg";
    if (fs.existsSync(vendorCfg)) return true;

    // Ionos ConfigDrive data
    if (fs.existsSync("/var/lib/cloud/seed/configdrive/openstack/latest/user_data")) {
        const content = fs.readFileSync("/var/lib/cloud/seed/configdrive/openstack/latest/user_data", "utf8");
        if (content.includes("IONOS") || content.includes("1&1")) return true;
    }

    // Ionos metadata exposed in cloud-init
    if (fs.existsSync("/var/lib/cloud/instance/user-data.txt")) {
        try {
            const data = fs.readFileSync("/var/lib/cloud/instance/user-data.txt", "utf8");
            if (data.includes("ionos")) return true;
        } catch { }
    }

    // Classic API tokens
    if (env.IONOS_USERNAME || env.IONOS_PASSWORD) return true;

    return false;
}

/* ============================================================
   3. IONOS MANAGED KUBERNETES (IKS)
============================================================ */
function detectIonosKubernetes(env: Record<string, string>) {
    return (
        !!env.IONOS_K8S_CLUSTER_ID ||
        !!env.IONOS_K8S_NODEPOOL_ID ||
        !!env.IONOS_K8S_NODE_ID ||
        (
            process.env.KUBERNETES_SERVICE_HOST &&
            fs.existsSync("/etc/ionos")
        )
    );
}

/* ============================================================
   4. IONOS SERVERLESS FUNCTIONS
============================================================ */
function detectIonosFunctions(env: Record<string, string>) {
    return (
        !!env.IONOS_FUNCTION_NAME ||
        !!env.IONOS_FUNCTION_REGION ||
        !!env.IONOS_FUNCTION_VERSION
    );
}

/* ============================================================
   5. VENDOR FILES
============================================================ */
function detectIonosVendorFiles() {
    const files = [
        "/etc/ionos",
        "/etc/cloud/cloud.cfg.d/99_ionos.cfg",
        "/var/lib/cloud/seed/configdrive/openstack/latest/vendor_data.json",
    ];

    return files.some(f => fs.existsSync(f));
}

/* ============================================================
   6. DMI (BIOS / PRODUCT) IDENTIFIERS
============================================================ */
function detectIonosDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const id = fs.readFileSync(p, "utf8").toLowerCase();

            if (
                id.includes("ionos") ||
                id.includes("1&1") ||
                id.includes("profitbricks") ||     // older branding
                id.includes("virt") ||             // Virtuozzo hypervisor
                id.includes("vioscsi")             // VirtIO SCSI
            ) {
                return true;
            }
        } catch { }
    }

    return false;
}

/* ============================================================
   7. NETWORK INTERFACE DETECTION (Unique NIC Model)
============================================================ */
function detectIonosNetwork() {
    const path = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(path)) {
        try {
            const modalias = fs.readFileSync(path, "utf8").toLowerCase();

            // Many IONOS VMs run on Virtuozzo / KVM hybrid
            if (modalias.includes("virtio") || modalias.includes("vioscsi")) {
                return { virtio: true, modalias };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   8. ENVIRONMENT VARIABLES
============================================================ */
function extractIonosEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};

    const patterns = [
        "IONOS_",
        "PROFITBRICKS_",
        "PB_API",              // legacy API SDK
    ];

    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A71 — HETZNER CLOUD / HETZNER KUBERNETES (HCloud + IKS)
   Covers:
   - HCloud VMs
   - Firecracker VMs (Hetzner CPX)
   - Hetzner Managed K8s (IKS)
   - Metadata service indicators (cloud-init)
   - DMI identifiers ("Hetzner", "HCloud", "QEMU", "KVM")
   - Network fingerprinting
============================================================ */

import fs from "fs";
import os from "os";

export function extractHetznerCloudInfo(env: Record<string, string>) {
    if (!detectHetznerCloud(env)) return null;

    return {
        isHetzner: true,
        computeInstance: detectHetznerCompute(env),
        kubernetes: detectHetznerKubernetes(env),
        firecracker: detectHetznerFirecracker(),
        vendorFiles: detectHetznerVendorFiles(),
        dmi: detectHetznerDMI(),
        network: detectHetznerNetwork(),
        envSignals: extractHetznerEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   1. MASTER DETECTOR
============================================================ */
function detectHetznerCloud(env: Record<string, string>) {
    return (
        detectHetznerCompute(env) ||
        detectHetznerKubernetes(env) ||
        detectHetznerFirecracker() ||
        detectHetznerVendorFiles() ||
        detectHetznerDMI()
    );
}

/* ============================================================
   2. STANDARD HCLOUD VM DETECTION
============================================================ */
function detectHetznerCompute(env: Record<string, string>) {
    // Hetzner cloud-init vendor file
    if (fs.existsSync("/etc/cloud/cloud.cfg.d/99_hcloud.cfg")) return true;

    // Metadata path (cloud-init seed)
    if (fs.existsSync("/var/lib/cloud/seed/nocloud-net/meta-data")) {
        try {
            const data = fs.readFileSync("/var/lib/cloud/seed/nocloud-net/meta-data", "utf8");
            if (data.includes("hcloud") || data.includes("hetzner")) return true;
        } catch { }
    }

    // Boot cloud-init marker
    if (fs.existsSync("/run/cloud-init/hcloud")) return true;

    // CLI tokens exist on some images
    if (env.HCLOUD_TOKEN) return true;

    return false;
}

/* ============================================================
   3. HETZNER KUBERNETES (IKS)
============================================================ */
function detectHetznerKubernetes(env: Record<string, string>) {
    return (
        env.HCLOUD_K8S_CLUSTER_ID ||
        env.HCLOUD_K8S_NODEPOOL_ID ||
        (
            process.env.KUBERNETES_SERVICE_HOST &&
            fs.existsSync("/etc/hcloud")     // present on IKS worker nodes
        )
    );
}

/* ============================================================
   4. FIRECRACKER VM DETECTION (CPX + MicroVMs)
============================================================ */
function detectHetznerFirecracker() {
    // Firecracker exposes unique CPU model
    const cpu = "/proc/cpuinfo";
    if (fs.existsSync(cpu)) {
        try {
            const content = fs.readFileSync(cpu, "utf8").toLowerCase();
            if (content.includes("firecracker") || content.includes("fc_vcpu")) {
                return true;
            }
        } catch { }
    }

    // Some Hetzner CPX use fc init markers
    if (fs.existsSync("/dev/vhost-vsock")) return true;

    return false;
}

/* ============================================================
   5. VENDOR FILES (cloud-init)
============================================================ */
function detectHetznerVendorFiles() {
    const files = [
        "/etc/cloud/cloud.cfg.d/99_hcloud.cfg",
        "/etc/hcloud",
        "/run/cloud-init/hcloud",
        "/var/lib/cloud/seed/nocloud-net/user-data",
    ];

    return files.some(f => fs.existsSync(f));
}

/* ============================================================
   6. DMI (BIOS / PRODUCT) IDENTIFIERS
============================================================ */
function detectHetznerDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const id = fs.readFileSync(p, "utf8").toLowerCase();

            if (
                id.includes("hetzner") ||
                id.includes("hcloud") ||
                id.includes("firecracker") ||
                id.includes("qemu") ||
                id.includes("kvm")          // common on Hetzner VMs
            ) {
                return true;
            }
        } catch { }
    }

    return false;
}

/* ============================================================
   7. NETWORK INTERFACE FINGERPRINT
============================================================ */
function detectHetznerNetwork() {
    const modaliasPath = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(modaliasPath)) {
        try {
            const alias = fs.readFileSync(modaliasPath, "utf8").toLowerCase();

            if (
                alias.includes("virtio") ||     // HCLOUD/QEMU
                alias.includes("firecracker")   // CPX Firecracker
            ) {
                return { virtio: true, alias };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   8. ENVIRONMENT VARIABLES
============================================================ */
function extractHetznerEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};

    const patterns = [
        "HCLOUD_",
        "HETZNER_",
        "HCLOUD_K8S",
    ];

    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A72 — OVHCloud (Compute + Kubernetes + Serverless) Detector
   Covers:
   - OVH Public Cloud Instances
   - OVH Managed Kubernetes (MKS)
   - OVHCloud Functions
   - vendor-data cloud-init
   - DMI hypervisor profiling
   - OpenStack-based identifiers
============================================================ */

import fs from "fs";
import os from "os";

export function extractOVHCloudInfo(env: Record<string, string>) {
    if (!detectOVHCloud(env)) return null;

    return {
        isOVH: true,
        computeInstance: detectOVHCompute(env),
        kubernetes: detectOVHKubernetes(env),
        serverless: detectOVHFunctions(env),
        vendorFiles: detectOVHVendorFiles(),
        dmi: detectOVHDMI(),
        openstackSignals: detectOpenStackSignals(),
        network: detectOVHNetwork(),
        envSignals: extractOVHEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   1. MASTER DETECTOR
============================================================ */
function detectOVHCloud(env: Record<string, string>) {
    return (
        detectOVHCompute(env) ||
        detectOVHKubernetes(env) ||
        detectOVHFunctions(env) ||
        detectOVHVendorFiles() ||
        detectOVHDMI() ||
        detectOpenStackSignals()
    );
}

/* ============================================================
   2. OVH COMPUTE INSTANCE (OpenStack-based VM)
============================================================ */
function detectOVHCompute(env: Record<string, string>) {
    // Cloud-init OVH vendor data
    const vendorFiles = [
        "/etc/cloud/cloud.cfg.d/99-ovh.cfg",
        "/var/lib/cloud/seed/nocloud-net/user-data",
        "/var/lib/cloud/seed/nocloud-net/meta-data",
    ];

    for (const f of vendorFiles) {
        if (fs.existsSync(f)) {
            try {
                const data = fs.readFileSync(f, "utf8").toLowerCase();
                if (data.includes("ovh") || data.includes("ovhcloud")) return true;
            } catch { }
        }
    }

    // OVH API credentials sometimes present
    if (env.OVH_ENDPOINT || env.OVH_APPLICATION_KEY) return true;

    return false;
}

/* ============================================================
   3. OVH MANAGED KUBERNETES (MKS)
============================================================ */
function detectOVHKubernetes(env: Record<string, string>) {
    return (
        !!env.OVH_KUBE_CLUSTER_ID ||
        !!env.OVH_KUBE_NODEPOOL_ID ||
        (
            process.env.KUBERNETES_SERVICE_HOST &&
            fs.existsSync("/etc/ovh")     // present on MKS worker nodes
        )
    );
}

/* ============================================================
   4. OVH CLOUD FUNCTIONS (Serverless)
============================================================ */
function detectOVHFunctions(env: Record<string, string>) {
    return (
        !!env.OVH_FUNCTION_NAME ||
        !!env.OVH_FUNCTION_REGION ||
        !!env.OVH_FUNCTION_VERSION
    );
}

/* ============================================================
   5. CLOUD-INIT VENDOR SIGNALS
============================================================ */
function detectOVHVendorFiles() {
    const vendorIndicators = [
        "/etc/cloud/cloud.cfg.d/99-ovh.cfg",
        "/etc/ovh",
        "/run/cloud-init/ovh",
    ];

    return vendorIndicators.some(f => fs.existsSync(f));
}

/* ============================================================
   6. DMI (BIOS / PRODUCT) IDENTIFIERS
============================================================ */
function detectOVHDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const id = fs.readFileSync(p, "utf8").toLowerCase();

            if (
                id.includes("ovh") ||
                id.includes("ovhcloud") ||
                id.includes("openstack") ||   // OVH Public Cloud is OpenStack
                id.includes("qemu") ||
                id.includes("kvm")
            ) {
                return true;
            }
        } catch { }
    }

    return false;
}

/* ============================================================
   7. OPENSTACK SIGNALS (OVH PUBLIC CLOUD IS OPENSTACK)
============================================================ */
function detectOpenStackSignals() {
    const paths = [
        "/var/lib/cloud/instance/obj.pkl",
        "/var/lib/cloud/seed/nocloud-net/meta-data",
        "/etc/openstack-release",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const data = fs.readFileSync(p, "utf8").toLowerCase();
            if (
                data.includes("openstack") ||
                data.includes("cloud-init") ||
                data.includes("meta-data")
            ) {
                return true;
            }
        } catch { }
    }

    return false;
}

/* ============================================================
   8. NETWORK FINGERPRINT (VirtIO / OpenStack)
============================================================ */
function detectOVHNetwork() {
    const modaliasPath = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(modaliasPath)) {
        try {
            const alias = fs.readFileSync(modaliasPath, "utf8").toLowerCase();

            if (
                alias.includes("virtio") ||         // OVH VMs use virtio NICs
                alias.includes("openstack")         // sometimes present
            ) {
                return { virtio: true, alias };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   9. ENVIRONMENT VARIABLE SIGNALS
============================================================ */
function extractOVHEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};

    const patterns = [
        "OVH_",
        "OVHCLOUD_",
        "OVH_KUBE",
        "OPENSTACK_",
        "OS_",
    ];

    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A73 — SCALEWAY (Compute + Kapsule Kubernetes + Functions)
   Covers:
   - Scaleway Instances (VM)
   - Scaleway Kapsule Kubernetes
   - Scaleway Functions (serverless)
   - Vendor cloud-init files
   - Metadata service fingerprints
   - DMI identifiers
   - Network fingerprinting
============================================================ */

import fs from "fs";
import os from "os";

export function extractScalewayInfo(env: Record<string, string>) {
    if (!detectScaleway(env)) return null;

    return {
        isScaleway: true,
        computeInstance: detectScalewayCompute(env),
        kubernetes: detectScalewayKubernetes(env),
        serverless: detectScalewayFunctions(env),
        vendorFiles: detectScalewayVendorFiles(),
        dmi: detectScalewayDMI(),
        network: detectScalewayNetwork(),
        envSignals: extractScalewayEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   1. MASTER DETECTOR
============================================================ */
function detectScaleway(env: Record<string, string>) {
    return (
        detectScalewayCompute(env) ||
        detectScalewayKubernetes(env) ||
        detectScalewayFunctions(env) ||
        detectScalewayVendorFiles() ||
        detectScalewayDMI()
    );
}

/* ============================================================
   2. SCALEWAY COMPUTE INSTANCES (VM)
============================================================ */
function detectScalewayCompute(env: Record<string, string>) {
    // Scaleway cloud-init vendor configs
    const vendorPaths = [
        "/etc/cloud/cloud.cfg.d/99_scaleway.cfg",
        "/etc/cloud/cloud.cfg.d/90_digitalocean.cfg", // sometimes present in marketplace images
        "/var/lib/cloud/seed/nocloud-net/meta-data",
        "/var/lib/cloud/seed/nocloud-net/user-data",
    ];

    for (const file of vendorPaths) {
        if (fs.existsSync(file)) {
            try {
                const content = fs.readFileSync(file, "utf8").toLowerCase();
                if (content.includes("scaleway") || content.includes("scw")) return true;
            } catch { }
        }
    }

    // Scaleway API variables
    if (env.SCW_SECRET_KEY || env.SCW_ACCESS_KEY || env.SCW_DEFAULT_PROJECT_ID) {
        return true;
    }

    return false;
}

/* ============================================================
   3. SCALEWAY KAPSULE — MANAGED KUBERNETES
============================================================ */
function detectScalewayKubernetes(env: Record<string, string>) {
    return (
        !!env.SCW_K8S_CLUSTER_ID ||
        !!env.SCW_K8S_NODEPOOL_ID ||
        (
            process.env.KUBERNETES_SERVICE_HOST &&
            fs.existsSync("/etc/scaleway") // present on worker nodes
        )
    );
}

/* ============================================================
   4. SCALEWAY SERVERLESS FUNCTIONS
============================================================ */
function detectScalewayFunctions(env: Record<string, string>) {
    return (
        !!env.SCW_FUNCTION_NAME ||
        !!env.SCW_FUNCTION_NAMESPACE ||
        !!env.SCW_FUNCTION_RUNTIME ||
        !!env.SCW_FUNCTION_REGION
    );
}

/* ============================================================
   5. CLOUD-INIT VENDOR SIGNALS
============================================================ */
function detectScalewayVendorFiles() {
    const indicators = [
        "/etc/cloud/cloud.cfg.d/99_scaleway.cfg",
        "/etc/scaleway",
        "/run/cloud-init/scaleway",
        "/var/lib/cloud/seed/nocloud-net/meta-data",
    ];

    return indicators.some(f => fs.existsSync(f));
}

/* ============================================================
   6. DMI (BIOS / PRODUCT NAME) IDENTIFIERS
============================================================ */
function detectScalewayDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const text = fs.readFileSync(p, "utf8").toLowerCase();

            if (
                text.includes("scaleway") ||
                text.includes("scw") ||
                text.includes("qemu") ||     // KVM/QEMU hypervisor (Scaleway)
                text.includes("kvm")
            ) {
                return true;
            }
        } catch { }
    }

    return false;
}

/* ============================================================
   7. NETWORK FINGERPRINT (VirtIO / Scaleway NICs)
============================================================ */
function detectScalewayNetwork() {
    const modaliasPath = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(modaliasPath)) {
        try {
            const alias = fs.readFileSync(modaliasPath, "utf8").toLowerCase();

            if (
                alias.includes("virtio") ||
                alias.includes("scaleway") ||
                alias.includes("scw")
            ) {
                return { virtio: true, alias };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   8. ENV VARIABLE SCAN
============================================================ */
function extractScalewayEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};

    const patterns = [
        "SCW_",
        "SCALEWAY_",
        "SCW_K8S",
        "SCW_FUNCTION",
    ];

    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A74 — DIGITALOCEAN DROPLETS (Compute) Detector
   Covers:
   - DigitalOcean Droplets (VM compute)
   - Metadata service files
   - cloud-init vendor configs
   - DMI identifiers ("DigitalOcean")
   - DO-VPC detections
   - Network fingerprinting (virtio)
============================================================ */

import fs from "fs";
import os from "os";

export function extractDigitalOceanDropletInfo(env: Record<string, string>) {
    if (!detectDigitalOceanDroplet(env)) return null;

    return {
        isDigitalOcean: true,
        computeInstance: detectDODropletInstance(env),
        vendorFiles: detectDOVendorFiles(),
        dmi: detectDODMI(),
        network: detectDONetwork(),
        envSignals: extractDOEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   1. MASTER DETECTOR
============================================================ */
function detectDigitalOceanDroplet(env: Record<string, string>) {
    return (
        detectDODropletInstance(env) ||
        detectDOVendorFiles() ||
        detectDODMI() ||
        detectDONetwork()
    );
}

/* ============================================================
   2. COMPUTE VM INSTANCE DETECTION
============================================================ */
function detectDODropletInstance(env: Record<string, string>) {
    // DO cloud-init vendor config
    const cfg = "/etc/cloud/cloud.cfg.d/99-digitalocean.cfg";
    if (fs.existsSync(cfg)) return true;

    // DO's meta-data files
    const metadataPaths = [
        "/var/lib/cloud/seed/digitalocean/meta-data",
        "/var/lib/cloud/seed/nocloud-net/meta-data", // sometimes used in DO
    ];

    for (const file of metadataPaths) {
        if (fs.existsSync(file)) {
            try {
                const content = fs.readFileSync(file, "utf8").toLowerCase();
                if (content.includes("digitalocean") ||
                    content.includes("droplet") ||
                    content.includes("do-")) {
                    return true;
                }
            } catch { }
        }
    }

    // DO env vars (rare but possible)
    if (env.DO_REGION || env.DIGITALOCEAN_TOKEN) return true;

    return false;
}

/* ============================================================
   3. VENDOR FILES (cloud-init)
============================================================ */
function detectDOVendorFiles() {
    const paths = [
        "/etc/cloud/cloud.cfg.d/99-digitalocean.cfg",
        "/var/lib/cloud/seed/digitalocean/meta-data",
        "/var/lib/cloud/seed/digitalocean/user-data",
        "/var/lib/cloud/instance/user-data.txt",
        "/run/cloud-init/digitalocean",
    ];

    return paths.some(p => fs.existsSync(p));
}

/* ============================================================
   4. DMI (SYSTEM IDENTIFICATION)
============================================================ */
function detectDODMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
        "/sys/devices/virtual/dmi/id/bios_vendor",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const text = fs.readFileSync(p, "utf8").toLowerCase();

            if (
                text.includes("digitalocean") ||
                text.includes("droplet") ||
                text.includes("do-") ||
                text.includes("qemu") ||
                text.includes("kvm")
            ) {
                return true;
            }
        } catch { }
    }

    return false;
}

/* ============================================================
   5. NETWORK FINGERPRINTING (VirtIO / DO-VPC)
============================================================ */
function detectDONetwork() {
    // VirtIO NIC + DO overlays
    const modalias = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(modalias)) {
        try {
            const alias = fs.readFileSync(modalias, "utf8").toLowerCase();

            if (
                alias.includes("virtio") || alias.includes("virtual") ||
                alias.includes("digitalocean") ||
                alias.includes("do-vpc")
            ) {
                return { alias };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   6. ENVIRONMENT VARIABLE SIGNALS
============================================================ */
function extractDOEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const patterns = [
        "DO_",
        "DIGITALOCEAN_",
    ];

    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A75 — ALIBABA CLOUD (ECS + ACK/ASK + FC Serverless) Detector
   Covers:
   - ECS compute instances
   - Managed Kubernetes (ACK)
   - Serverless Function Compute (FC)
   - Metadata service cloud-init fingerprints
   - DMI hypervisor & BIOS vendor detection
   - Network NIC fingerprinting
   - Aliyun environment variable signals
============================================================ */

import fs from "fs";
import os from "os";

export function extractAlibabaCloudInfo(env: Record<string, string>) {
    if (!detectAlibabaCloud(env)) return null;

    return {
        isAlibabaCloud: true,
        computeInstance: detectECSInstance(env),
        kubernetes: detectAlibabaKubernetes(env),
        serverless: detectFunctionCompute(env),
        vendorFiles: detectAliyunVendorFiles(),
        dmi: detectAliyunDMI(),
        network: detectAliyunNetwork(),
        envSignals: extractAliyunEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   1. MASTER DETECTOR
============================================================ */
function detectAlibabaCloud(env: Record<string, string>) {
    return (
        detectECSInstance(env) ||
        detectAlibabaKubernetes(env) ||
        detectFunctionCompute(env) ||
        detectAliyunVendorFiles() ||
        detectAliyunDMI()
    );
}

/* ============================================================
   2. ALIBABA ECS INSTANCE (COMPUTE VM)
============================================================ */
function detectECSInstance(env: Record<string, string>) {
    // Aliyun cloud-init vendor config
    const vendorCfgs = [
        "/etc/cloud/cloud.cfg.d/99-aliyun.cfg",
        "/var/lib/cloud/instance/vendor-data",
        "/var/lib/cloud/instance/vendor-data.json",
    ];

    for (const p of vendorCfgs) {
        if (fs.existsSync(p)) {
            try {
                const data = fs.readFileSync(p, "utf8").toLowerCase();
                if (data.includes("aliyun") || data.includes("alibaba")) return true;
            } catch { }
        }
    }

    // ECS metadata presence
    if (fs.existsSync("/var/lib/cloud/seed/nocloud-net/meta-data")) {
        try {
            const content = fs.readFileSync("/var/lib/cloud/seed/nocloud-net/meta-data", "utf8");
            if (content.includes("aliyun") || content.includes("ecs")) return true;
        } catch { }
    }

    // Aliyun API keys (rare but present in some automation setups)
    if (env.ALIYUN_ACCESS_KEY_ID || env.ALIYUN_ACCESS_KEY_SECRET) return true;

    return false;
}

/* ============================================================
   3. ALIBABA CLOUD KUBERNETES (ACK / ASK)
============================================================ */
function detectAlibabaKubernetes(env: Record<string, string>) {
    return (
        !!env.ACK_CLUSTER_ID ||
        !!env.ACK_NODEPOOL_ID ||
        !!env.ACK_NODE_ID ||
        (
            process.env.KUBERNETES_SERVICE_HOST &&
            (
                fs.existsSync("/etc/aliyun") ||
                fs.existsSync("/var/lib/aliyun") ||
                env.ALIYUN_K8S === "true"
            )
        )
    );
}

/* ============================================================
   4. ALIBABA FUNCTION COMPUTE (FC)
============================================================ */
function detectFunctionCompute(env: Record<string, string>) {
    return (
        !!env.FC_FUNCTION_NAME ||
        !!env.FC_SERVICE_NAME ||
        !!env.FC_REGION ||
        !!env.FC_INSTANCE_ID ||
        !!env.FC_ACCOUNT_ID
    );
}

/* ============================================================
   5. CLOUD-INIT VENDOR SIGNALS
============================================================ */
function detectAliyunVendorFiles() {
    const vendorFiles = [
        "/etc/cloud/cloud.cfg.d/99-aliyun.cfg",
        "/etc/aliyun",
        "/var/lib/aliyun",
        "/run/cloud-init/aliyun",
        "/var/lib/cloud/instance/vendor-data.json",
    ];

    return vendorFiles.some(f => fs.existsSync(f));
}

/* ============================================================
   6. DMI (BIOS / PRODUCT NAME) IDENTIFIERS
============================================================ */
function detectAliyunDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
        "/sys/devices/virtual/dmi/id/bios_vendor",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const text = fs.readFileSync(p, "utf8").toLowerCase();

            if (
                text.includes("alibaba") ||
                text.includes("aliyun") ||
                text.includes("ecs") ||
                text.includes("alicloud") ||
                text.includes("alibaba cloud") ||
                text.includes("kvm") ||
                text.includes("qemu")
            ) {
                return true;
            }
        } catch { }
    }

    return false;
}

/* ============================================================
   7. NETWORK FINGERPRINT (VirtIO / Alibaba VPC)
============================================================ */
function detectAliyunNetwork() {
    const modaliasPath = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(modaliasPath)) {
        try {
            const alias = fs.readFileSync(modaliasPath, "utf8").toLowerCase();

            if (
                alias.includes("virtio") ||           // ECS hypervisor
                alias.includes("alibaba") ||
                alias.includes("aliyun")
            ) {
                return { alias };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   8. ENV SIGNAL SCANNING
============================================================ */
function extractAliyunEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const patterns = [
        "ALIYUN_",
        "ALICLOUD_",
        "ACK_",
        "FC_",
    ];

    for (const key in env) {
        if (patterns.some(prefix => key.startsWith(prefix))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A76 — TENCENT CLOUD (CVM + TKE + SCF) DETECTOR
   Covers:
   - Tencent CVM compute instances
   - Tencent TKE managed Kubernetes
   - Tencent SCF serverless
   - cloud-init metadata signals
   - DMI hypervisor identification
   - Network fingerprints (virtio + tencent)
   - Tencent Cloud-specific environment variables
============================================================ */

import fs from "fs";
import os from "os";

export function extractTencentCloudInfo(env: Record<string, string>) {
    if (!detectTencentCloud(env)) return null;

    return {
        isTencentCloud: true,
        computeInstance: detectTencentCVM(env),
        kubernetes: detectTencentTKE(env),
        serverless: detectTencentSCF(env),
        vendorFiles: detectTencentVendorFiles(),
        dmi: detectTencentDMI(),
        network: detectTencentNetwork(),
        envSignals: extractTencentEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   1. MASTER DETECTOR
============================================================ */
function detectTencentCloud(env: Record<string, string>) {
    return (
        detectTencentCVM(env) ||
        detectTencentTKE(env) ||
        detectTencentSCF(env) ||
        detectTencentVendorFiles() ||
        detectTencentDMI()
    );
}

/* ============================================================
   2. TENCENT CVM (COMPUTE VM)
============================================================ */
function detectTencentCVM(env: Record<string, string>) {
    // cloud-init vendor files
    const vendorPaths = [
        "/etc/cloud/cloud.cfg.d/99_tencent.cfg",
        "/etc/tencentcloud",
        "/var/lib/cloud/instance/vendor-data",
        "/var/lib/cloud/instance/vendor-data.json",
    ];

    for (const file of vendorPaths) {
        if (fs.existsSync(file)) {
            try {
                const data = fs.readFileSync(file, "utf8").toLowerCase();
                if (data.includes("tencent") || data.includes("tencentcloud") || data.includes("cvm")) {
                    return true;
                }
            } catch { }
        }
    }

    // Tencent metadata seed
    const metadata = "/var/lib/cloud/seed/nocloud-net/meta-data";
    if (fs.existsSync(metadata)) {
        try {
            const content = fs.readFileSync(metadata, "utf8").toLowerCase();
            if (content.includes("tencent") || content.includes("cvm")) return true;
        } catch { }
    }

    // Tencent Cloud API keys
    if (env.TENCENTCLOUD_SECRET_ID || env.TENCENTCLOUD_SECRET_KEY) return true;

    return false;
}

/* ============================================================
   3. TENCENT TKE (KUBERNETES)
============================================================ */
function detectTencentTKE(env: Record<string, string>) {
    return (
        !!env.TKE_CLUSTER_ID ||
        !!env.TKE_NODEPOOL_ID ||
        !!env.TKE_NODE_ID ||
        (
            process.env.KUBERNETES_SERVICE_HOST &&
            (
                fs.existsSync("/etc/tencentcloud") ||
                env.TENCENTCLOUD_K8S === "true"
            )
        )
    );
}

/* ============================================================
   4. TENCENT SERVERLESS FUNCTIONS (SCF)
============================================================ */
function detectTencentSCF(env: Record<string, string>) {
    return (
        !!env.SCF_FUNCTION_NAME ||
        !!env.SCF_NAMESPACE ||
        !!env.SCF_REGION ||
        !!env.SCF_FUNCTION_VERSION ||
        !!env.TENCENTCLOUD_RUN_REGION // Cloud Run for Tencent (TCBR)
    );
}

/* ============================================================
   5. CLOUD-INIT VENDOR SIGNALS
============================================================ */
function detectTencentVendorFiles() {
    const files = [
        "/etc/cloud/cloud.cfg.d/99_tencent.cfg",
        "/etc/tencentcloud",
        "/var/lib/tencentcloud",
        "/run/cloud-init/tencent",
        "/var/lib/cloud/instance/vendor-data.json",
    ];

    return files.some(f => fs.existsSync(f));
}

/* ============================================================
   6. DMI (Hypervisor / BIOS / Product) IDENTIFIERS
============================================================ */
function detectTencentDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
        "/sys/devices/virtual/dmi/id/bios_vendor",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const text = fs.readFileSync(p, "utf8").toLowerCase();

            if (
                text.includes("tencent") ||
                text.includes("tencentcloud") ||
                text.includes("cvm") ||
                text.includes("tcb") ||             // Tencent CloudBase
                text.includes("qemu") ||            // Used in CVM hypervisor
                text.includes("kvm")
            ) {
                return true;
            }
        } catch { }
    }

    return false;
}

/* ============================================================
   7. NETWORK FINGERPRINT (VirtIO / Tencent VPC)
============================================================ */
function detectTencentNetwork() {
    const path = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(path)) {
        try {
            const alias = fs.readFileSync(path, "utf8").toLowerCase();

            if (
                alias.includes("virtio") ||
                alias.includes("tencent") ||
                alias.includes("cvm")
            ) {
                return { alias };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   8. ENVIRONMENT VARIABLE SIGNALS
============================================================ */
function extractTencentEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};

    const patterns = [
        "TENCENTCLOUD_",
        "TKE_",
        "SCF_",
        "TCBR_",       // Tencent CloudBase Run
    ];

    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A77 — HUAWEI CLOUD (ECS Compute + CCE Kubernetes + FunctionGraph)
   Covers:
   - ECS (Elastic Cloud Servers)
   - CCE (Cloud Container Engine / Managed Kubernetes)
   - FunctionGraph serverless functions
   - Vendor cloud-init configs
   - Metadata service identifiers
   - Huawei DMI hypervisor identification
   - NIC fingerprinting
   - Environment variable detection
============================================================ */

import fs from "fs";
import os from "os";

export function extractHuaweiCloudInfo(env: Record<string, string>) {
    if (!detectHuaweiCloud(env)) return null;

    return {
        isHuaweiCloud: true,
        computeInstance: detectHCECS(env),
        kubernetes: detectHCCCE(env),
        serverless: detectHCFunctionGraph(env),
        vendorFiles: detectHuaweiVendorFiles(),
        dmi: detectHuaweiDMI(),
        network: detectHuaweiNetwork(),
        envSignals: extractHuaweiEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   1. MASTER DETECTOR
============================================================ */
function detectHuaweiCloud(env: Record<string, string>) {
    return (
        detectHCECS(env) ||
        detectHCCCE(env) ||
        detectHCFunctionGraph(env) ||
        detectHuaweiVendorFiles() ||
        detectHuaweiDMI()
    );
}

/* ============================================================
   2. HUAWEI CLOUD ECS (COMPUTE)
============================================================ */
function detectHCECS(env: Record<string, string>) {
    const vendorPaths = [
        "/etc/cloud/cloud.cfg.d/99-huaweicloud.cfg",
        "/etc/huawei",
        "/var/lib/cloud/instance/vendor-data",
        "/var/lib/cloud/instance/vendor-data.json",
    ];

    for (const file of vendorPaths) {
        if (fs.existsSync(file)) {
            try {
                const data = fs.readFileSync(file, "utf8").toLowerCase();
                if (
                    data.includes("huawei") ||
                    data.includes("huaweicloud") ||
                    data.includes("ecs")
                ) return true;
            } catch { }
        }
    }

    // ECS metadata seed
    const metadata = "/var/lib/cloud/seed/nocloud-net/meta-data";
    if (fs.existsSync(metadata)) {
        try {
            const content = fs.readFileSync(metadata, "utf8").toLowerCase();
            if (content.includes("ecs") || content.includes("huawei")) return true;
        } catch { }
    }

    // SDK / API credentials
    if (env.HW_ACCESS_KEY || env.HW_SECRET_KEY) return true;

    return false;
}

/* ============================================================
   3. HUAWEI CLOUD CCE (KUBERNETES)
============================================================ */
function detectHCCCE(env: Record<string, string>) {
    return (
        !!env.CCE_CLUSTER_ID ||
        !!env.CCE_NODEPOOL_ID ||
        !!env.CCE_NODE_ID ||
        (
            process.env.KUBERNETES_SERVICE_HOST &&
            (
                fs.existsSync("/etc/huawei") ||
                fs.existsSync("/var/lib/huawei") ||
                env.HUAWEICLOUD_K8S === "true"
            )
        )
    );
}

/* ============================================================
   4. HUAWEI CLOUD FUNCTIONGRAPH (SERVERLESS)
============================================================ */
function detectHCFunctionGraph(env: Record<string, string>) {
    return (
        !!env.FG_FUNCTION_NAME ||
        !!env.FG_VERSION ||
        !!env.FG_REGION ||
        !!env.FG_PROJECT_ID ||
        !!env.HUAWEICLOUD_FUNCTION_NAME
    );
}

/* ============================================================
   5. CLOUD-INIT VENDOR SIGNALS
============================================================ */
function detectHuaweiVendorFiles() {
    const vendorFiles = [
        "/etc/cloud/cloud.cfg.d/99-huaweicloud.cfg",
        "/etc/huawei",
        "/var/lib/huawei",
        "/run/cloud-init/huawei",
        "/var/lib/cloud/instance/vendor-data.json",
    ];

    return vendorFiles.some(f => fs.existsSync(f));
}

/* ============================================================
   6. DMI IDENTIFICATION
============================================================ */
function detectHuaweiDMI() {
    const dmiPaths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of dmiPaths) {
        if (!fs.existsSync(p)) continue;

        try {
            const text = fs.readFileSync(p, "utf8").toLowerCase();

            if (
                text.includes("huawei") ||
                text.includes("huaweicloud") ||
                text.includes("ecs") ||
                text.includes("qemu") ||
                text.includes("kvm")
            ) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   7. NETWORK FINGERPRINT (VirtIO / Huawei VPC)
============================================================ */
function detectHuaweiNetwork() {
    const modaliasPath = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(modaliasPath)) {
        try {
            const alias = fs.readFileSync(modaliasPath, "utf8").toLowerCase();

            if (
                alias.includes("virtio") ||
                alias.includes("huawei") ||
                alias.includes("huaweicloud")
            ) {
                return { alias };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   8. ENVIRONMENT VARIABLES
============================================================ */
function extractHuaweiEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const patterns = [
        "HUAWEI_",
        "HUAWEICLOUD_",
        "HW_",
        "CCE_",
        "FG_",
    ];

    for (const key in env) {
        if (patterns.some(prefix => key.startsWith(prefix))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A78 — ORACLE CLOUD INFRASTRUCTURE (OCI)
   Covers:
   - OCI Compute (VM Standard Shapes / Bare Metal)
   - OCI Container Instances
   - OCI Functions (Serverless)
   - Oracle Kubernetes Engine (OKE)
   - OCI Cloud Shell
   - OCI Resource Manager (Terraform Runner)
   - Full OCI metadata API detection
   - vendor cloud-init files
   - DMI / BIOS detection
   - VNIC / network fingerprinting
============================================================ */

import fs from "fs";
import os from "os";

export function extractOracleCloudInfo(env: Record<string, string>) {
    if (!detectOCI(env)) return null;

    return {
        isOracleCloud: true,
        computeInstance: detectOCICompute(),
        kubernetes: detectOCI_OKE(env),
        serverless: detectOCIFunctions(env),
        containerInstance: detectOCIContainerInstance(env),
        cloudShell: detectOCICloudShell(env),
        resourceManagerJob: detectOCIResourceManager(env),
        metadataService: detectOCIMetadataService(),
        vendorFiles: detectOCIVendorFiles(),
        dmi: detectOCIDMI(),
        network: detectOCIVnicFingerprint(),
        envSignals: extractOCIEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   MASTER DETECTOR
============================================================ */
function detectOCI(env: Record<string, string>) {
    return (
        detectOCIMetadataService() ||
        detectOCIDMI() ||
        detectOCIVendorFiles() ||
        detectOCIFunctions(env) ||
        detectOCI_OKE(env) ||
        detectOCICloudShell(env) ||
        detectOCIContainerInstance(env)
    );
}

/* ============================================================
   1. OCI METADATA SERVICE
============================================================ */
function detectOCIMetadataService() {
    // Oracle metadata endpoint
    const m = "/sys/devices/virtual/dmi/id/product_uuid";

    if (fs.existsSync(m)) {
        try {
            const content = fs.readFileSync(m, "utf8").toLowerCase();
            if (content.startsWith("ocid")) return { productUUID: content.trim() };
        } catch { }
    }

    // Optional extra metadata path
    const meta2 = "/sys/devices/virtual/dmi/id/chassis_asset_tag";
    if (fs.existsSync(meta2)) {
        try {
            const tag = fs.readFileSync(meta2, "utf8").toLowerCase();
            if (tag.includes("oracle") || tag.includes("oci")) return { assetTag: tag.trim() };
        } catch { }
    }

    return null;
}

/* ============================================================
   2. OCI COMPUTE (VM Shapes / Bare Metal)
============================================================ */
function detectOCICompute() {
    const vendorPaths = [
        "/etc/oracle-cloud",
        "/var/lib/cloud/instance/sem/config/ocid",
        "/var/lib/cloud/instance/ocimds",
    ];

    for (const f of vendorPaths) {
        if (fs.existsSync(f)) return true;
    }

    // Look for Shape file
    const shapePath = "/sys/devices/virtual/dmi/id/product_name";
    if (fs.existsSync(shapePath)) {
        try {
            const shape = fs.readFileSync(shapePath, "utf8").toLowerCase();
            if (shape.includes("oracle") || shape.includes("ocid")) {
                return { shape };
            }
        } catch { }
    }

    return false;
}

/* ============================================================
   3. OCI FUNCTIONS (SERVERLESS)
============================================================ */
function detectOCIFunctions(env: Record<string, string>) {
    if (
        env.FN_APP_ID ||
        env.FN_FN_ID ||
        env.FN_FORMAT ||
        env.FN_MEMORY ||
        env.FN_TYPE ||
        env.FDK_VERSION
    ) return {
        fnApp: env.FN_APP_ID,
        fnId: env.FN_FN_ID,
        mem: env.FN_MEMORY,
        runtime: env.FN_FORMAT,
        fdk: env.FDK_VERSION,
    };

    return null;
}

/* ============================================================
   4. ORACLE KUBERNETES ENGINE (OKE)
============================================================ */
function detectOCI_OKE(env: Record<string, string>) {
    if (env.OCI_OKE_CLUSTER || env.OCI_OKE_NODEPOOL || env.OCI_OKE_NODE) {
        return {
            cluster: env.OCI_OKE_CLUSTER ?? null,
            nodepool: env.OCI_OKE_NODEPOOL ?? null,
            node: env.OCI_OKE_NODE ?? null,
        };
    }

    // Secondary detection: runtime files
    const k8sFlag = "/etc/oci-oke";
    if (fs.existsSync(k8sFlag)) return { cluster: "unknown", nodepool: "unknown" };

    return null;
}

/* ============================================================
   5. OCI CONTAINER INSTANCES
============================================================ */
function detectOCIContainerInstance(env: Record<string, string>) {
    if (
        env.OCI_CONTAINER_INSTANCE_ID ||
        env.OCI_COMPARTMENT_ID ||
        env.OCI_RESOURCE_PRINCIPAL_VERSION === "2.2"
    ) {
        return {
            instanceId: env.OCI_CONTAINER_INSTANCE_ID ?? null,
            compartment: env.OCI_COMPARTMENT_ID ?? null,
            rpVersion: env.OCI_RESOURCE_PRINCIPAL_VERSION ?? null,
        };
    }

    return null;
}

/* ============================================================
   6. OCI CLOUD SHELL
============================================================ */
function detectOCICloudShell(env: Record<string, string>) {
    if (env.OCI_CLOUDSHELL === "true") {
        return { isCloudShell: true };
    }

    // Oracle Cloud Shell sets specific nonstandard $HOME patterns:
    if (env.HOME?.includes("/home/cloudshell_user")) {
        return { isCloudShell: true };
    }

    return null;
}

/* ============================================================
   7. OCI RESOURCE MANAGER (Terraform managed jobs)
============================================================ */
function detectOCIResourceManager(env: Record<string, string>) {
    if (
        env.OCI_RMS_JOB_ID ||
        env.OCI_RMS_STACK_ID ||
        env.OCI_RMS_COMPARTMENT_ID
    ) {
        return {
            job: env.OCI_RMS_JOB_ID,
            stack: env.OCI_RMS_STACK_ID,
            compartment: env.OCI_RMS_COMPARTMENT_ID,
        };
    }

    return null;
}

/* ============================================================
   8. OCI CLOUD-INIT VENDOR FILES
============================================================ */
function detectOCIVendorFiles() {
    const paths = [
        "/etc/oracle-cloud-agent",
        "/var/lib/oracle-cloud",
        "/etc/cloud/cloud.cfg.d/99-oracle-cloud.cfg",
    ];

    return paths.some(p => fs.existsSync(p));
}

/* ============================================================
   9. DMI DETECTION
============================================================ */
function detectOCIDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const text = fs.readFileSync(p, "utf8").toLowerCase();
            if (
                text.includes("oracle") ||
                text.includes("oci") ||
                text.includes("oracl")
            ) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   10. VNIC / NETWORK FINGERPRINT
============================================================ */
function detectOCIVnicFingerprint() {
    const vendor = "/sys/class/dmi/id/chassis_vendor";
    if (fs.existsSync(vendor)) {
        try {
            const text = fs.readFileSync(vendor, "utf8").toLowerCase();
            if (text.includes("oracle") || text.includes("oci")) {
                return { chassisVendor: text.trim() };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   11. ENVIRONMENT VARIABLE DETECTION
============================================================ */
function extractOCIEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const patterns = [
        "OCI_",
        "FN_",
        "FDK_",
    ];

    for (const k in env) {
        if (patterns.some(p => k.startsWith(p))) out[k] = env[k]!;
    }

    return out;
}

/* ============================================================
   A79 — IBM CLOUD (Full Detection)
   Covers:
   - IBM Cloud Functions (Apache OpenWhisk)
   - IBM Code Engine (Apps + Containers + Jobs)
   - IBM VPC Compute VM
   - IBM Classic Infrastructure VM
   - IBM Kubernetes Service (IKS)
   - IBM Cloud Shell (CLI-injected container)
   - Metadata service, DMI, cloud-init
============================================================ */

import fs from "fs";
import os from "os";

export function extractIBMCloudInfo(env: Record<string, string>) {
    if (!detectIBMCloud(env)) return null;

    return {
        isIBMCloud: true,
        functions: detectIBMCloudFunctions(env),
        codeEngine: detectIBMCodeEngine(env),
        vpcCompute: detectIBMVPCCompute(),
        classicCompute: detectIBMClassicVM(),
        kubernetes: detectIBMIKS(env),
        cloudShell: detectIBMCloudShell(env),
        metadata: detectIBMMetadataService(),
        vendorFiles: detectIBMVendors(),
        dmi: detectIBMDMI(),
        network: detectIBMNetwork(),
        envSignals: extractIBMEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   MASTER DETECTOR
============================================================ */
function detectIBMCloud(env: Record<string, string>) {
    return (
        detectIBMCloudFunctions(env) ||
        detectIBMCodeEngine(env) ||
        detectIBMVPCCompute() ||
        detectIBMClassicVM() ||
        detectIBMIKS(env) ||
        detectIBMCloudShell(env) ||
        detectIBMVendors() ||
        detectIBMDMI()
    );
}

/* ============================================================
   1. IBM CLOUD FUNCTIONS (APACHE OPENWHISK)
============================================================ */
function detectIBMCloudFunctions(env: Record<string, string>) {
    if (
        env.__OW_ACTION_NAME ||
        env.__OW_ACTIVATION_ID ||
        env.__OW_DEADLINE ||
        env.__OW_NAMESPACE ||
        env.__OW_API_HOST
    ) {
        return {
            actionName: env.__OW_ACTION_NAME,
            activationId: env.__OW_ACTIVATION_ID,
            namespace: env.__OW_NAMESPACE,
            deadline: env.__OW_DEADLINE,
            apiHost: env.__OW_API_HOST,
        };
    }

    return null;
}

/* ============================================================
   2. IBM CODE ENGINE (SERVERLESS CONTAINERS + JOBS)
============================================================ */
function detectIBMCodeEngine(env: Record<string, string>) {
    if (
        env.CE_PROJECT ||
        env.CE_APP ||
        env.CE_SERVICE ||
        env.CE_CONFIGURATION ||
        env.CE_REVISION ||
        env.CE_JOB ||
        env.CE_TASK ||
        env.CE_BATCH_JOB
    ) {
        return {
            project: env.CE_PROJECT ?? null,
            app: env.CE_APP ?? null,
            service: env.CE_SERVICE ?? null,
            configuration: env.CE_CONFIGURATION ?? null,
            revision: env.CE_REVISION ?? null,
            job: env.CE_JOB ?? env.CE_BATCH_JOB ?? null,
            task: env.CE_TASK ?? null,
            region: env.CE_REGION ?? null,
        };
    }

    return null;
}

/* ============================================================
   3. IBM VPC COMPUTE (VM)
============================================================ */
function detectIBMVPCCompute() {
    const vendorFiles = [
        "/etc/ibmcloud",
        "/var/lib/ibm",
        "/var/lib/cloud/instance/sem/config/ibmcloud",
    ];

    for (const file of vendorFiles) {
        if (fs.existsSync(file)) return true;
    }

    // IBM VPC metadata via cloud-init
    const vendorData = "/var/lib/cloud/instance/vendor-data";
    if (fs.existsSync(vendorData)) {
        try {
            const t = fs.readFileSync(vendorData, "utf8").toLowerCase();
            if (t.includes("ibmcloud")) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   4. CLASSIC INFRASTRUCTURE (SoftLayer) VM
============================================================ */
function detectIBMClassicVM() {
    const softlayerPaths = [
        "/etc/softlayer",
        "/usr/local/softlayer",
        "/var/lib/softlayer",
    ];

    return softlayerPaths.some(f => fs.existsSync(f));
}

/* ============================================================
   5. IBM KUBERNETES SERVICE (IKS)
============================================================ */
function detectIBMIKS(env: Record<string, string>) {
    if (env.IKS_CLUSTER || env.IKS_REGION || env.IKS_SUBNET) {
        return {
            cluster: env.IKS_CLUSTER ?? null,
            region: env.IKS_REGION ?? null,
            subnet: env.IKS_SUBNET ?? null,
        };
    }

    // Additional indicator for IKS:
    const iksFlag = "/etc/iks";
    if (fs.existsSync(iksFlag)) return { cluster: "unknown" };

    return null;
}

/* ============================================================
   6. IBM CLOUD SHELL
============================================================ */
function detectIBMCloudShell(env: Record<string, string>) {
    if (env.IBMCLOUD_SHELL === "true") {
        return { isCloudShell: true };
    }

    // CloudShell home path
    if (env.HOME?.includes("/home/cloudshell")) {
        return { isCloudShell: true };
    }

    return null;
}

/* ============================================================
   7. METADATA SERVICE
============================================================ */
function detectIBMMetadataService() {
    const path = "/sys/devices/virtual/dmi/id/product_serial";
    if (!fs.existsSync(path)) return null;

    try {
        const text = fs.readFileSync(path, "utf8").toLowerCase();
        if (text.includes("ibm")) return { productSerial: text.trim() };
    } catch { }

    return null;
}

/* ============================================================
   8. VENDOR FILES (cloud-init)
============================================================ */
function detectIBMVendors() {
    const vendorFiles = [
        "/etc/ibmcloud-agent",
        "/etc/cloud/cloud.cfg.d/99-ibmcloud.cfg",
        "/var/lib/ibm",
    ];
    return vendorFiles.some(f => fs.existsSync(f));
}

/* ============================================================
   9. DMI HYPERVISOR IDENTIFICATION
============================================================ */
function detectIBMDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/chassis_vendor",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const t = fs.readFileSync(p, "utf8").toLowerCase();
            if (
                t.includes("ibm") ||
                t.includes("softlayer") ||
                t.includes("classic") ||
                t.includes("bluemix")
            ) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   10. NETWORK FINGERPRINT
============================================================ */
function detectIBMNetwork() {
    const modaliasPath = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(modaliasPath)) {
        try {
            const alias = fs.readFileSync(modaliasPath, "utf8").toLowerCase();
            if (
                alias.includes("ibm") ||
                alias.includes("classic") ||
                alias.includes("softlayer")
            ) return { alias };
        } catch { }
    }

    return null;
}

/* ============================================================
   11. ENVIRONMENT VARS
============================================================ */
function extractIBMEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const prefixes = [
        "__OW_", // Cloud Functions
        "CE_",   // Code Engine
        "IKS_",  // Kubernetes
        "IBMCLOUD_",
        "SOFTLAYER_",
    ];

    for (const key in env) {
        if (prefixes.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A80 — ALIBABA CLOUD (Aliyun)
   Covers:
   - ECS (Elastic Compute Service)
   - Function Compute (FC)
   - ACK Kubernetes
   - Elastic Container Instance (ECI)
   - Container Service (Docker Swarm legacy)
   - Cloud Shell
   - Metadata service (100.100.100.200)
   - DMI/bios/hypervisor detection
   - Vendor files via cloud-init
   - VirtIO network modalias matching
============================================================ */

import fs from "fs";
import os from "os";

export function extractAlibabaCloudInfo(env: Record<string, string>) {
    if (!detectAlibabaCloud(env)) return null;

    return {
        isAlibabaCloud: true,
        ecs: detectAliECS(env),
        functionCompute: detectAliFunctionCompute(env),
        kubernetes: detectAliACK(env),
        elasticContainerInstance: detectAliECI(env),
        swarm: detectAliDockerSwarm(),
        cloudShell: detectAliCloudShell(env),
        metadata: detectAliMetadata(),
        vendorFiles: detectAliVendorFiles(),
        dmi: detectAliDMI(),
        network: detectAliNetwork(),
        envSignals: extractAliEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   MASTER DETECTOR
============================================================ */
function detectAlibabaCloud(env: Record<string, string>) {
    return (
        detectAliECS(env) ||
        detectAliFunctionCompute(env) ||
        detectAliACK(env) ||
        detectAliECI(env) ||
        detectAliDockerSwarm() ||
        detectAliCloudShell(env) ||
        detectAliMetadata() ||
        detectAliVendorFiles() ||
        detectAliDMI()
    );
}

/* ============================================================
   1. ECS (Elastic Compute Service)
============================================================ */
function detectAliECS(env: Record<string, string>) {
    // ECS cloud-init vendor markers
    const paths = [
        "/etc/aliyun",
        "/var/lib/aliyun",
        "/etc/cloud/cloud.cfg.d/99-aliyun.cfg",
        "/var/log/aliyun",
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) return true;
    }

    // ECS metadata (usually 100.100.100.200 but we detect file fallback)
    const meta = "/sys/devices/virtual/dmi/id/product_uuid";
    if (fs.existsSync(meta)) {
        try {
            const t = fs.readFileSync(meta, "utf8").toLowerCase();
            if (t.startsWith("aliyun") || t.includes("alibaba")) return true;
        } catch { }
    }

    // Aliyun RAM credentials (ECI, ECS, Function Compute)
    if (env.ALIYUN_ACCESS_KEY_ID || env.ALIYUN_SECRET_ACCESS_KEY) return true;

    return false;
}

/* ============================================================
   2. FUNCTION COMPUTE (Serverless FC)
============================================================ */
function detectAliFunctionCompute(env: Record<string, string>) {
    if (
        env.FC_FUNCTION_NAME ||
        env.FC_SERVICE_NAME ||
        env.FC_VERSION_ID ||
        env.FC_MEMORY_SIZE ||
        env.FC_INSTANCE_ID
    ) {
        return {
            function: env.FC_FUNCTION_NAME,
            service: env.FC_SERVICE_NAME,
            version: env.FC_VERSION_ID,
            memory: env.FC_MEMORY_SIZE,
            instanceId: env.FC_INSTANCE_ID,
            region: env.FC_REGION ?? null,
        };
    }

    // Legacy env pattern
    if (env.ALIYUN_REGION || env.ALIYUN_SERVICE_NAME || env.ALIYUN_FUNCTION_NAME) {
        return {
            function: env.ALIYUN_FUNCTION_NAME ?? null,
            service: env.ALIYUN_SERVICE_NAME ?? null,
            region: env.ALIYUN_REGION ?? null,
        };
    }

    return null;
}

/* ============================================================
   3. ACK (Alibaba Cloud Kubernetes)
============================================================ */
function detectAliACK(env: Record<string, string>) {
    if (
        env.ACK_CLUSTER_ID ||
        env.ACK_NODEPOOL_ID ||
        env.ACK_NODE_NAME ||
        env.ACK_REGION
    ) {
        return {
            cluster: env.ACK_CLUSTER_ID ?? null,
            nodepool: env.ACK_NODEPOOL_ID ?? null,
            node: env.ACK_NODE_NAME ?? null,
            region: env.ACK_REGION ?? null,
        };
    }

    // Secondary detect: Alibaba cloud-init folder exists inside K8s node
    const ackPaths = [
        "/etc/aliyun/cloud-config",
        "/var/lib/aliyun-k8s",
    ];

    if (ackPaths.some(f => fs.existsSync(f))) {
        return { cluster: "unknown" };
    }

    return null;
}

/* ============================================================
   4. ECI (Elastic Container Instance)
============================================================ */
function detectAliECI(env: Record<string, string>) {
    if (
        env.ECI_INSTANCE_ID ||
        env.ECI_REGION_ID ||
        env.ECI_VPC_ID ||
        env.ECI_CONTAINER_GROUP_ID
    ) {
        return {
            instanceId: env.ECI_INSTANCE_ID ?? null,
            region: env.ECI_REGION_ID ?? null,
            vpc: env.ECI_VPC_ID ?? null,
            group: env.ECI_CONTAINER_GROUP_ID ?? null,
        };
    }

    return null;
}

/* ============================================================
   5. Container Service (Docker Swarm legacy)
============================================================ */
function detectAliDockerSwarm() {
    // Old Alibaba / Aliyun swarm images shipped with this
    const swarmPath = "/etc/aliyun-docker";
    if (fs.existsSync(swarmPath)) return true;

    return false;
}

/* ============================================================
   6. Alibaba Cloud Shell
============================================================ */
function detectAliCloudShell(env: Record<string, string>) {
    if (env.ALIYUN_CLOUDSHELL === "true") {
        return { isCloudShell: true };
    }
    if (env.HOME?.includes("/home/cloudshell")) {
        return { isCloudShell: true };
    }
    return null;
}

/* ============================================================
   7. Metadata Service (100.100.100.200) — offline detection
============================================================ */
function detectAliMetadata() {
    const metaPaths = [
        "/etc/aliyun",
        "/var/lib/cloud/instance/sem/config/aliyun",
        "/var/lib/aliyun-metadata",
    ];

    return metaPaths.some(p => fs.existsSync(p)) ? true : null;
}

/* ============================================================
   8. Vendor Files
============================================================ */
function detectAliVendorFiles() {
    const files = [
        "/etc/aliyun",
        "/etc/cloud/cloud.cfg.d/99-aliyun.cfg",
        "/var/lib/aliyun",
        "/usr/local/aliyun",
    ];
    return files.some(f => fs.existsSync(f));
}

/* ============================================================
   9. DMI / BIOS / hypervisor detection
============================================================ */
function detectAliDMI() {
    const dmiFiles = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const f of dmiFiles) {
        if (!fs.existsSync(f)) continue;

        try {
            const t = fs.readFileSync(f, "utf8").toLowerCase();
            if (
                t.includes("alibaba") ||
                t.includes("aliyun") ||
                t.includes("ecs")
            ) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   10. Network (VirtIO + Aliyun NIC fingerprints)
============================================================ */
function detectAliNetwork() {
    const modalias = "/sys/class/net/eth0/device/modalias";
    if (fs.existsSync(modalias)) {
        try {
            const text = fs.readFileSync(modalias, "utf8").toLowerCase();
            if (
                text.includes("aliyun") ||
                text.includes("ecs") ||
                text.includes("virtio")
            ) {
                return { alias: text.trim() };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   11. Environment Variables
============================================================ */
function extractAliEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const prefixes = [
        "ALIYUN_",
        "ACK_",
        "ECI_",
        "FC_",
        "ESS_",
    ];

    for (const key in env) {
        if (prefixes.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A81 — TENCENT CLOUD (QCloud)
   Covers:
   - CVM (Compute Virtual Machine)
   - SCF (Serverless Cloud Functions)
   - TKE (Tencent Kubernetes Engine)
   - ECI (Elastic Container Instance)
   - Lighthouse (Lightweight Server)
   - TCB CloudBase (Functions + Containers)
   - Metadata service
   - DMI hypervisor checks
   - NIC modalias fingerprints
   - cloud-init vendor files
============================================================ */

import fs from "fs";
import os from "os";

export function extractTencentCloudInfo(env: Record<string, string>) {
    if (!detectTencentCloud(env)) return null;

    return {
        isTencentCloud: true,
        cvm: detectTC_CVM(),
        lighthouse: detectTC_Lighthouse(),
        scf: detectTC_SCF(env),
        tke: detectTC_TKE(env),
        eci: detectTC_ECI(env),
        cloudbase: detectTC_CloudBase(env),
        metadata: detectTC_Metadata(),
        vendorFiles: detectTC_VendorFiles(),
        dmi: detectTC_DMI(),
        network: detectTC_Network(),
        envSignals: extractTC_EnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   MASTER DETECTOR
============================================================ */
function detectTencentCloud(env: Record<string, string>) {
    return (
        detectTC_CVM() ||
        detectTC_SCF(env) ||
        detectTC_TKE(env) ||
        detectTC_ECI(env) ||
        detectTC_Lighthouse() ||
        detectTC_CloudBase(env) ||
        detectTC_Metadata() ||
        detectTC_VendorFiles() ||
        detectTC_DMI()
    );
}

/* ============================================================
   1. CVM (Tencent Compute Virtual Machine)
============================================================ */
function detectTC_CVM() {
    const vendorFiles = [
        "/etc/qcloud",
        "/var/lib/qcloud",
        "/etc/cloud/cloud.cfg.d/99-qcloud.cfg",
        "/etc/tencentcloud",
        "/usr/local/qcloud",
    ];

    for (const f of vendorFiles) {
        if (fs.existsSync(f)) return true;
    }

    // DMI product_name often includes "Tencent"
    const dmi = "/sys/devices/virtual/dmi/id/product_name";
    if (fs.existsSync(dmi)) {
        try {
            const t = fs.readFileSync(dmi, "utf8").toLowerCase();
            if (t.includes("tencent") || t.includes("qcloud") || t.includes("cvm"))
                return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   2. LIGHTHOUSE (Lightweight Server)
============================================================ */
function detectTC_Lighthouse() {
    const lh = "/etc/tencent/lighthouse";
    if (fs.existsSync(lh)) return true;

    const dmi = "/sys/devices/virtual/dmi/id/product_name";
    if (fs.existsSync(dmi)) {
        try {
            const t = fs.readFileSync(dmi, "utf8").toLowerCase();
            if (t.includes("lighthouse")) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   3. SCF (Serverless Cloud Functions)
============================================================ */
function detectTC_SCF(env: Record<string, string>) {
    if (
        env.TENCENTCLOUD_RUNENV === "SCF" ||
        env.SCF_FUNCTION_NAME ||
        env.SCF_FUNCTION_VERSION ||
        env.SCF_NAMESPACE ||
        env.SCF_REGION ||
        env.SCF_FUNCTION_MEMORY_SIZE ||
        env.SCF_LOG_ID
    ) {
        return {
            function: env.SCF_FUNCTION_NAME,
            version: env.SCF_FUNCTION_VERSION,
            namespace: env.SCF_NAMESPACE,
            region: env.SCF_REGION,
            memory: env.SCF_FUNCTION_MEMORY_SIZE,
            logId: env.SCF_LOG_ID,
        };
    }

    return null;
}

/* ============================================================
   4. TKE (Tencent Kubernetes Engine)
============================================================ */
function detectTC_TKE(env: Record<string, string>) {
    if (
        env.TKE_CLUSTER_ID ||
        env.TKE_NODEPOOL_ID ||
        env.TKE_NODE_ID ||
        env.TKE_REGION
    ) {
        return {
            cluster: env.TKE_CLUSTER_ID ?? null,
            nodepool: env.TKE_NODEPOOL_ID ?? null,
            node: env.TKE_NODE_ID ?? null,
            region: env.TKE_REGION ?? null,
        };
    }

    const tkePaths = [
        "/etc/tencent/tke",
        "/var/lib/tencent/tke",
    ];

    if (tkePaths.some(f => fs.existsSync(f))) {
        return { cluster: "unknown" };
    }

    return null;
}

/* ============================================================
   5. ECI (Elastic Container Instance)
============================================================ */
function detectTC_ECI(env: Record<string, string>) {
    if (
        env.ECI_INSTANCE_ID ||
        env.ECI_REGION ||
        env.ECI_ZONE ||
        env.ECI_VPC_ID ||
        env.ECI_SUBNET_ID
    ) {
        return {
            instanceId: env.ECI_INSTANCE_ID ?? null,
            region: env.ECI_REGION ?? null,
            zone: env.ECI_ZONE ?? null,
            vpc: env.ECI_VPC_ID ?? null,
            subnet: env.ECI_SUBNET_ID ?? null,
        };
    }
    return null;
}

/* ============================================================
   6. CloudBase (TCB Functions + Containers)
============================================================ */
function detectTC_CloudBase(env: Record<string, string>) {
    if (
        env.TCB_ENV_ID ||
        env.TCB_SERVICE_NAME ||
        env.TCB_REGION ||
        env.TCB_FUNCTION_NAME ||
        env.TCB_CLOUDRUN_SERVICE
    ) {
        return {
            envId: env.TCB_ENV_ID ?? null,
            service: env.TCB_SERVICE_NAME ?? env.TCB_CLOUDRUN_SERVICE ?? null,
            region: env.TCB_REGION ?? null,
            function: env.TCB_FUNCTION_NAME ?? null,
        };
    }

    return null;
}

/* ============================================================
   7. Metadata Service Detection
============================================================ */
function detectTC_Metadata() {
    const metaPaths = [
        "/etc/qcloud",
        "/var/lib/qcloud",
        "/var/lib/tencentcloud",
        "/var/lib/cloud/instance/sem/config/tencent",
    ];

    return metaPaths.some(p => fs.existsSync(p)) ? true : null;
}

/* ============================================================
   8. Vendor Files
============================================================ */
function detectTC_VendorFiles() {
    const files = [
        "/etc/tencentcloud",
        "/etc/cloud/cloud.cfg.d/99-tencentcloud.cfg",
        "/var/lib/tencentcloud",
        "/etc/qcloud",
    ];
    return files.some(p => fs.existsSync(p));
}

/* ============================================================
   9. DMI Vendor Detection
============================================================ */
function detectTC_DMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const t = fs.readFileSync(p, "utf8").toLowerCase();
            if (
                t.includes("tencent") ||
                t.includes("qcloud") ||
                t.includes("tencent cloud")
            ) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   10. Network Fingerprint (VirtIO, Tencent NIC)
============================================================ */
function detectTC_Network() {
    const modalias = "/sys/class/net/eth0/device/modalias";
    if (fs.existsSync(modalias)) {
        try {
            const alias = fs.readFileSync(modalias, "utf8").toLowerCase();
            if (
                alias.includes("tencent") ||
                alias.includes("qcloud") ||
                alias.includes("virtio")
            ) {
                return { alias };
            }
        } catch { }
    }
    return null;
}

/* ============================================================
   11. Environment Variables
============================================================ */
function extractTC_EnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const prefixes = [
        "TENCENTCLOUD_",
        "TCB_",
        "TKE_",
        "SCF_",
        "ECI_",
    ];

    for (const key in env) {
        if (prefixes.some(p => key.startsWith(p))) out[key] = env[key]!;
    }

    return out;
}

/* ============================================================
   A82 — OVH CLOUD (Full Detection)
   Covers:
   - OVH Public Cloud (OpenStack-based VMs)
   - OVH Managed Kubernetes (MKS)
   - OVH Cloud Functions (FaaS)
   - OVH Cloud Web hosting
   - OVH RunOn (serverless containers)
   - OVH CloudDB (managed databases with env var markers)
   - Metadata service
   - DMI vendor identification
   - Network NIC modalias fingerprint
   - cloud-init vendor files
============================================================ */

import fs from "fs";
import os from "os";

export function extractOVHCloudInfo(env: Record<string, string>) {
    if (!detectOVHCloud(env)) return null;

    return {
        isOVHCloud: true,
        publicCloudInstance: detectOVHCompute(),
        mks: detectOVHMKS(env),
        cloudFunctions: detectOVHFunctions(env),
        cloudWeb: detectOVHCloudWeb(env),
        runOn: detectOVHRunOn(env),
        cloudDB: detectOVHCloudDB(env),
        metadata: detectOVHMetadata(),
        vendorFiles: detectOVHVendorFiles(),
        dmi: detectOVHDMI(),
        network: detectOVHNetwork(),
        envSignals: extractOVHEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   MASTER DETECTOR
============================================================ */
function detectOVHCloud(env: Record<string, string>) {
    return (
        detectOVHCompute() ||
        detectOVHMKS(env) ||
        detectOVHFunctions(env) ||
        detectOVHCloudWeb(env) ||
        detectOVHRunOn(env) ||
        detectOVHCloudDB(env) ||
        detectOVHMetadata() ||
        detectOVHVendorFiles() ||
        detectOVHDMI()
    );
}

/* ============================================================
   1. OVH PUBLIC CLOUD VM (OpenStack-based Compute)
============================================================ */
function detectOVHCompute() {
    // OVH cloud-init vendor markers
    const vendorFiles = [
        "/etc/ovh",
        "/etc/ovhcloud",
        "/var/lib/ovh",
        "/etc/cloud/cloud.cfg.d/99-ovh.cfg",
    ];

    if (vendorFiles.some(f => fs.existsSync(f))) return true;

    // OVH uses OpenStack metadata — detect OpenStack DMI strings
    const dmi = "/sys/devices/virtual/dmi/id/sys_vendor";
    if (fs.existsSync(dmi)) {
        try {
            const t = fs.readFileSync(dmi, "utf8").toLowerCase();
            if (
                t.includes("ovh") ||
                t.includes("ovhcloud") ||
                t.includes("openstack")
            ) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   2. OVH MANAGED KUBERNETES (MKS)
============================================================ */
function detectOVHMKS(env: Record<string, string>) {
    if (
        env.OVH_MKS_CLUSTER_ID ||
        env.OVH_MKS_NODEPOOL_ID ||
        env.OVH_MKS_REGION
    ) {
        return {
            cluster: env.OVH_MKS_CLUSTER_ID ?? null,
            nodepool: env.OVH_MKS_NODEPOOL_ID ?? null,
            region: env.OVH_MKS_REGION ?? null,
        };
    }

    // Vendor marker for OVH node images
    const mksPaths = [
        "/etc/ovh/kubernetes",
        "/var/lib/ovhcloud/k8s",
    ];

    if (mksPaths.some(p => fs.existsSync(p))) {
        return { cluster: "unknown" };
    }

    return null;
}

/* ============================================================
   3. OVH CLOUD FUNCTIONS (FaaS)
============================================================ */
function detectOVHFunctions(env: Record<string, string>) {
    if (
        env.OVH_FUNCTION_NAME ||
        env.OVH_FUNCTION_VERSION ||
        env.OVH_FUNCTION_REGION ||
        env.OVH_FUNCTION_MEMORY
    ) {
        return {
            function: env.OVH_FUNCTION_NAME,
            version: env.OVH_FUNCTION_VERSION,
            region: env.OVH_FUNCTION_REGION,
            memory: env.OVH_FUNCTION_MEMORY,
        };
    }

    // Legacy OpenWhisk pattern (OVH uses OpenWhisk under-the-hood)
    if (
        env.__OW_ACTION_NAME ||
        env.__OW_NAMESPACE ||
        env.__OW_API_HOST
    ) {
        return {
            function: env.__OW_ACTION_NAME,
            namespace: env.__OW_NAMESPACE,
            apiHost: env.__OW_API_HOST,
        };
    }

    return null;
}

/* ============================================================
   4. OVH CLOUD WEB HOSTING
   (Managed Hosting: Node/PHP/Static — OVH_WWW_* vars)
============================================================ */
function detectOVHCloudWeb(env: Record<string, string>) {
    if (
        env.OVH_WWW_SITE ||
        env.OVH_WWW_DOMAIN ||
        env.OVH_WWW_ENV ||
        env.OVH_WWW_ROOT
    ) {
        return {
            site: env.OVH_WWW_SITE ?? null,
            domain: env.OVH_WWW_DOMAIN ?? null,
            env: env.OVH_WWW_ENV ?? null,
            root: env.OVH_WWW_ROOT ?? null,
        };
    }

    return null;
}

/* ============================================================
   5. OVH RUNON (Container Runtime — Beta)
============================================================ */
function detectOVHRunOn(env: Record<string, string>) {
    if (
        env.OVH_RUNON_PROJECT ||
        env.OVH_RUNON_REGION ||
        env.OVH_RUNON_JOB ||
        env.OVH_RUNON_APP
    ) {
        return {
            project: env.OVH_RUNON_PROJECT ?? null,
            region: env.OVH_RUNON_REGION ?? null,
            job: env.OVH_RUNON_JOB ?? null,
            app: env.OVH_RUNON_APP ?? null,
        };
    }

    return null;
}

/* ============================================================
   6. OVH CLOUDDB (Managed Databases)
============================================================ */
function detectOVHCloudDB(env: Record<string, string>) {
    if (
        env.OVH_DB_HOST ||
        env.OVH_DB_NAME ||
        env.OVH_DB_USER ||
        env.OVH_DB_TYPE
    ) {
        return {
            type: env.OVH_DB_TYPE ?? null,
            host: env.OVH_DB_HOST ?? null,
            name: env.OVH_DB_NAME ?? null,
            user: env.OVH_DB_USER ?? null,
            port: env.OVH_DB_PORT ?? null,
        };
    }

    return null;
}

/* ============================================================
   7. METADATA SERVICE DETECTION
============================================================ */
function detectOVHMetadata() {
    const paths = [
        "/etc/ovh",
        "/etc/ovhcloud",
        "/var/lib/ovh",
        "/var/lib/cloud/instance/sem/config/ovh",
    ];

    return paths.some(p => fs.existsSync(p)) ? true : null;
}

/* ============================================================
   8. Vendor Files (cloud-init)
============================================================ */
function detectOVHVendorFiles() {
    const files = [
        "/etc/cloud/cloud.cfg.d/99-ovh.cfg",
        "/etc/ovh",
        "/etc/ovhcloud",
        "/var/lib/ovh",
    ];

    return files.some(f => fs.existsSync(f));
}

/* ============================================================
   9. DMI / BIOS vendor detection
============================================================ */
function detectOVHDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;
        try {
            const t = fs.readFileSync(p, "utf8").toLowerCase();
            if (
                t.includes("ovh") ||
                t.includes("ovhcloud") ||
                t.includes("openstack") ||
                t.includes("ovh sas")
            ) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   10. Network fingerprint (VirtIO + OVH NIC markers)
============================================================ */
function detectOVHNetwork() {
    const modalias = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(modalias)) {
        try {
            const text = fs.readFileSync(modalias, "utf8").toLowerCase();
            if (
                text.includes("virtio") ||
                text.includes("ovh") ||
                text.includes("openstack")
            ) {
                return { alias: text.trim() };
            }
        } catch { }
    }

    return null;
}

/* ============================================================
   11. Environment variables
============================================================ */
function extractOVHEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const prefixes = [
        "OVH_",
        "__OW_",   // OVH Cloud Functions (OpenWhisk)
        "OPENSTACK_",
    ];

    for (const key in env) {
        if (prefixes.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A83 — DIGITALOCEAN (Full Detection)
   Covers:
   - Droplets (Compute VM)
   - DigitalOcean Kubernetes (DOKS)
   - DigitalOcean Functions (Serverless)
   - App Platform (Apps, Workers, Jobs, Static Sites)
   - Container Registry (DOCR)
   - Managed Databases (via env signals)
   - Metadata service
   - DMI / BIOS vendor checks
   - NIC modalias detection
   - cloud-init OVF/vendor files
============================================================ */

import fs from "fs";
import os from "os";

export function extractDigitalOceanInfo(env: Record<string, string>) {
    if (!detectDigitalOcean(env)) return null;

    return {
        isDigitalOcean: true,
        droplet: detectDODroplet(),
        doks: detectDOKS(env),
        functions: detectDOFunctions(env),
        appPlatform: detectDOAppPlatform(env),
        containerRegistry: detectDOContainerRegistry(env),
        managedDB: detectDOManagedDB(env),
        metadata: detectDOMetadata(),
        vendorFiles: detectDOVendorFiles(),
        dmi: detectDODMI(),
        network: detectDONetwork(),
        envSignals: extractDOEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   MASTER DETECTOR
============================================================ */
function detectDigitalOcean(env: Record<string, string>) {
    return (
        detectDODroplet() ||
        detectDOKS(env) ||
        detectDOFunctions(env) ||
        detectDOAppPlatform(env) ||
        detectDOContainerRegistry(env) ||
        detectDOManagedDB(env) ||
        detectDOMetadata() ||
        detectDOVendorFiles() ||
        detectDODMI()
    );
}

/* ============================================================
   1. DROPLETS (Virtual Machines)
============================================================ */
function detectDODroplet() {
    const paths = [
        "/etc/digitalocean",
        "/var/lib/cloud/instance/sem/config/digitalocean",
        "/var/lib/digitalocean",
    ];

    if (paths.some(p => fs.existsSync(p))) return true;

    // DMI: "DigitalOcean"
    const dmi = "/sys/devices/virtual/dmi/id/sys_vendor";
    if (fs.existsSync(dmi)) {
        try {
            const t = fs.readFileSync(dmi, "utf8").toLowerCase();
            if (t.includes("digitalocean")) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   2. DOKS — DigitalOcean Kubernetes
============================================================ */
function detectDOKS(env: Record<string, string>) {
    if (
        env.DOKS_CLUSTER_ID ||
        env.DOKS_NODEPOOL_ID ||
        env.DOKS_REGION ||
        env.DOKS_VERSION
    ) {
        return {
            cluster: env.DOKS_CLUSTER_ID ?? null,
            nodepool: env.DOKS_NODEPOOL_ID ?? null,
            region: env.DOKS_REGION ?? null,
            version: env.DOKS_VERSION ?? null,
        };
    }

    const vendorPaths = [
        "/etc/doks",
        "/var/lib/doks",
        "/etc/digitalocean/k8s",
    ];

    if (vendorPaths.some(f => fs.existsSync(f))) {
        return { cluster: "unknown" };
    }

    return null;
}

/* ============================================================
   3. DIGITALOCEAN FUNCTIONS (Serverless)
============================================================ */
function detectDOFunctions(env: Record<string, string>) {
    if (
        env.FUNCTIONS_FUNCTION_NAME ||
        env.FUNCTIONS_FUNCTION_ID ||
        env.FUNCTIONS_PROJECT ||
        env.FUNCTIONS_REGION ||
        env.FUNCTIONS_ENTRYPOINT
    ) {
        return {
            function: env.FUNCTIONS_FUNCTION_NAME ?? null,
            id: env.FUNCTIONS_FUNCTION_ID ?? null,
            project: env.FUNCTIONS_PROJECT ?? null,
            region: env.FUNCTIONS_REGION ?? null,
            entrypoint: env.FUNCTIONS_ENTRYPOINT ?? null,
        };
    }

    return null;
}

/* ============================================================
   4. APP PLATFORM (Apps, Workers, Jobs, Static Sites)
============================================================ */
function detectDOAppPlatform(env: Record<string, string>) {
    if (
        env.DIGITALOCEAN_APP_ID ||
        env.DIGITALOCEAN_APP_NAME ||
        env.DIGITALOCEAN_APP_REGION ||
        env.DIGITALOCEAN_DEPLOYMENT_ID ||
        env.DIGITALOCEAN_SERVICE_NAME ||
        env.DIGITALOCEAN_COMPONENT_NAME ||
        env.DIGITALOCEAN_COMPONENT_TYPE
    ) {
        return {
            appId: env.DIGITALOCEAN_APP_ID ?? null,
            name: env.DIGITALOCEAN_APP_NAME ?? null,
            region: env.DIGITALOCEAN_APP_REGION ?? null,
            deploymentId: env.DIGITALOCEAN_DEPLOYMENT_ID ?? null,
            service: env.DIGITALOCEAN_SERVICE_NAME ?? null,
            component: env.DIGITALOCEAN_COMPONENT_NAME ?? null,
            componentType: env.DIGITALOCEAN_COMPONENT_TYPE ?? null,
        };
    }

    return null;
}

/* ============================================================
   5. DO CONTAINER REGISTRY (DOCR)
============================================================ */
function detectDOContainerRegistry(env: Record<string, string>) {
    if (
        env.DIGITALOCEAN_REGISTRY ||
        env.DIGITALOCEAN_REGISTRY_URL ||
        env.DIGITALOCEAN_REGISTRY_NAMESPACE
    ) {
        return {
            registry: env.DIGITALOCEAN_REGISTRY ?? null,
            url: env.DIGITALOCEAN_REGISTRY_URL ?? null,
            namespace: env.DIGITALOCEAN_REGISTRY_NAMESPACE ?? null,
        };
    }
    return null;
}

/* ============================================================
   6. MANAGED DATABASES (Postgres/MySQL/Redis)
============================================================ */
function detectDOManagedDB(env: Record<string, string>) {
    if (
        env.DATABASE_URL ||
        env.DATABASE_HOST ||
        env.MYSQLHOST ||
        env.PGHOST ||
        env.REDISHOST
    ) {
        return {
            url: env.DATABASE_URL ?? null,
            host: env.DATABASE_HOST ?? env.PGHOST ?? env.MYSQLHOST ?? env.REDISHOST ?? null,
            port: env.DATABASE_PORT ?? null,
            user: env.DATABASE_USER ?? null,
            type: detectDBType(env),
        };
    }

    return null;
}

function detectDBType(env: Record<string, string>) {
    if (env.PGHOST) return "postgres";
    if (env.MYSQLHOST) return "mysql";
    if (env.REDISHOST) return "redis";
    if (env.DATABASE_URL?.startsWith("postgres://")) return "postgres";
    if (env.DATABASE_URL?.startsWith("mysql://")) return "mysql";
    return null;
}

/* ============================================================
   7. METADATA SERVICE DETECTION
============================================================ */
function detectDOMetadata() {
    const paths = [
        "/etc/digitalocean",
        "/var/lib/digitalocean",
        "/var/lib/cloud/instance/sem/config/digitalocean",
    ];

    return paths.some(f => fs.existsSync(f)) ? true : null;
}

/* ============================================================
   8. Vendor Files (cloud-init)
============================================================ */
function detectDOVendorFiles() {
    const files = [
        "/etc/digitalocean",
        "/etc/cloud/cloud.cfg.d/99-digitalocean.cfg",
        "/var/lib/digitalocean",
    ];

    return files.some(f => fs.existsSync(f));
}

/* ============================================================
   9. DMI Vendor Detection
============================================================ */
function detectDODMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;

        try {
            const t = fs.readFileSync(p, "utf8").toLowerCase();
            if (t.includes("digitalocean")) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   10. Network Modalias Fingerprinting
============================================================ */
function detectDONetwork() {
    const modalias = "/sys/class/net/eth0/device/modalias";

    if (fs.existsSync(modalias)) {
        try {
            const text = fs.readFileSync(modalias, "utf8").toLowerCase();
            if (
                text.includes("digitalocean") ||
                text.includes("virtio")
            ) return { alias: text.trim() };
        } catch { }
    }

    return null;
}

/* ============================================================
   11. Environment Variables Scanning
============================================================ */
function extractDOEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const prefixes = [
        "DIGITALOCEAN_",
        "DO_",
        "DOKS_",
        "FUNCTIONS_",
    ];

    for (const key in env) {
        if (prefixes.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }

    return out;
}

/* ============================================================
   A84 — LINODE / AKAMAI CLOUD (Full Detection)
   Covers:
   - Linode Compute Instances (VMs)
   - Linode Bare Metal
   - Linode Kubernetes Engine (LKE)
   - Akamai EdgeWorkers / EdgeFunctions (serverless)
   - Linode Marketplace Apps
   - Linode StackScripts (cloud-init)
   - Metadata service (OpenStack-based)
   - cloud-init vendor markers
   - DMI hypervisor / vendor fingerprints
   - NIC modalias fingerprints
============================================================ */

import fs from "fs";
import os from "os";

export function extractLinodeCloudInfo(env: Record<string, string>) {
    if (!detectLinodeCloud(env)) return null;

    return {
        isLinodeCloud: true,
        compute: detectLinodeCompute(),
        bareMetal: detectLinodeBareMetal(),
        lke: detectLinodeKubernetes(env),
        functions: detectLinodeFunctions(env),
        marketplace: detectLinodeMarketplace(env),
        stackScripts: detectLinodeStackScript(),
        metadata: detectLinodeMetadata(),
        vendorFiles: detectLinodeVendorFiles(),
        dmi: detectLinodeDMI(),
        network: detectLinodeNetwork(),
        envSignals: extractLinodeEnvSignals(env),
        hostname: os.hostname(),
    };
}

/* ============================================================
   MASTER DETECTOR
============================================================ */
function detectLinodeCloud(env: Record<string, string>) {
    return (
        detectLinodeCompute() ||
        detectLinodeBareMetal() ||
        detectLinodeKubernetes(env) ||
        detectLinodeFunctions(env) ||
        detectLinodeMarketplace(env) ||
        detectLinodeStackScript() ||
        detectLinodeMetadata() ||
        detectLinodeVendorFiles() ||
        detectLinodeDMI()
    );
}

/* ============================================================
   1. LINODE COMPUTE (VM)
============================================================ */
function detectLinodeCompute() {
    const vendorPaths = [
        "/etc/linode",
        "/var/lib/linode",
        "/etc/cloud/cloud.cfg.d/99-linode.cfg",
    ];

    if (vendorPaths.some((p) => fs.existsSync(p))) return true;

    // DMI detection
    const dmi = "/sys/devices/virtual/dmi/id/sys_vendor";
    if (fs.existsSync(dmi)) {
        try {
            const t = fs.readFileSync(dmi, "utf8").toLowerCase();
            if (
                t.includes("linode") ||
                t.includes("akamai") ||
                t.includes("openstack")
            ) return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   2. LINODE BARE METAL
============================================================ */
function detectLinodeBareMetal() {
    const product = "/sys/devices/virtual/dmi/id/product_name";
    if (fs.existsSync(product)) {
        try {
            const t = fs.readFileSync(product, "utf8").toLowerCase();
            if (t.includes("bare metal") || t.includes("metal")) {
                return { isBareMetal: true, product: t.trim() };
            }
        } catch { }
    }
    return false;
}

/* ============================================================
   3. LKE — Linode Kubernetes Engine
============================================================ */
function detectLinodeKubernetes(env: Record<string, string>) {
    if (
        env.LKE_CLUSTER_ID ||
        env.LKE_NODEPOOL_ID ||
        env.LKE_NODE_ID ||
        env.LKE_REGION
    ) {
        return {
            cluster: env.LKE_CLUSTER_ID ?? null,
            nodepool: env.LKE_NODEPOOL_ID ?? null,
            node: env.LKE_NODE_ID ?? null,
            region: env.LKE_REGION ?? null,
        };
    }

    // vendor fallback
    if (
        fs.existsSync("/etc/linode/kubernetes") ||
        fs.existsSync("/var/lib/linode/kubernetes")
    ) {
        return { cluster: "unknown" };
    }

    return null;
}

/* ============================================================
   4. AKAMAI / LINODE SERVERLESS
   (EdgeWorkers / EdgeFunctions unified)
============================================================ */
function detectLinodeFunctions(env: Record<string, string>) {
    if (
        env.AKAMAI_EDGEWORKERS_ID ||
        env.AKAMAI_EDGEWORKERS_GROUP ||
        env.AKAMAI_EDGEREGION ||
        env.LINODE_FUNCTION_NAME ||
        env.LINODE_FUNCTION_REGION
    ) {
        return {
            edgeWorkersId: env.AKAMAI_EDGEWORKERS_ID ?? null,
            group: env.AKAMAI_EDGEWORKERS_GROUP ?? null,
            region: env.AKAMAI_EDGEREGION ?? env.LINODE_FUNCTION_REGION ?? null,
            function: env.LINODE_FUNCTION_NAME ?? null,
        };
    }

    return null;
}

/* ============================================================
   5. LINODE MARKETPLACE
   (Marketplace apps always set env markers)
============================================================ */
function detectLinodeMarketplace(env: Record<string, string>) {
    if (
        env.LINODE_MARKETPLACE_APP ||
        env.LINODE_MARKETPLACE_VENDOR ||
        env.LINODE_MARKETPLACE_VERSION
    ) {
        return {
            app: env.LINODE_MARKETPLACE_APP ?? null,
            vendor: env.LINODE_MARKETPLACE_VENDOR ?? null,
            version: env.LINODE_MARKETPLACE_VERSION ?? null,
        };
    }

    return null;
}

/* ============================================================
   6. LINODE STACKSCRIPTS (cloud-init)
============================================================ */
function detectLinodeStackScript() {
    const paths = [
        "/var/lib/cloud/instance/sem/config/linode",
        "/etc/linode-stackscript",
        "/var/lib/linode/stackscript",
    ];

    return paths.some((p) => fs.existsSync(p));
}

/* ============================================================
   7. METADATA SERVICE (OpenStack-based)
============================================================ */
function detectLinodeMetadata() {
    const metadataFiles = [
        "/etc/linode",
        "/var/lib/linode",
        "/var/lib/cloud/instance/sem/config/linode",
    ];

    return metadataFiles.some((p) => fs.existsSync(p)) ? true : null;
}

/* ============================================================
   8. Vendor Files (cloud-init)
============================================================ */
function detectLinodeVendorFiles() {
    const files = [
        "/etc/linode",
        "/etc/cloud/cloud.cfg.d/99-linode.cfg",
        "/var/lib/linode",
    ];

    return files.some((f) => fs.existsSync(f));
}

/* ============================================================
   9. DMI / BIOS detection (Linode/Akamai/OpenStack)
============================================================ */
function detectLinodeDMI() {
    const paths = [
        "/sys/devices/virtual/dmi/id/sys_vendor",
        "/sys/devices/virtual/dmi/id/bios_vendor",
        "/sys/devices/virtual/dmi/id/product_name",
    ];

    for (const p of paths) {
        if (!fs.existsSync(p)) continue;
        try {
            const t = fs.readFileSync(p, "utf8").toLowerCase();
            if (
                t.includes("linode") ||
                t.includes("akamai") ||
                t.includes("openstack")
            )
                return true;
        } catch { }
    }

    return false;
}

/* ============================================================
   10. Network fingerprint (VirtIO + Linode patterns)
============================================================ */
function detectLinodeNetwork() {
    const modalias = "/sys/class/net/eth0/device/modalias";
    if (fs.existsSync(modalias)) {
        try {
            const t = fs.readFileSync(modalias, "utf8").toLowerCase();
            if (
                t.includes("virtio") ||
                t.includes("linode") ||
                t.includes("akamai") ||
                t.includes("openstack")
            ) {
                return { alias: t.trim() };
            }
        } catch { }
    }
    return null;
}

/* ============================================================
   11. Environment Variables
============================================================ */
function extractLinodeEnvSignals(env: Record<string, string>) {
    const out: Record<string, string> = {};
    const prefixes = [
        "LINODE_",
        "LKE_",
        "AKAMAI_",
    ];

    for (const k in env) {
        if (prefixes.some((p) => k.startsWith(p))) {
            out[k] = env[k]!;
        }
    }

    return out;
}

/* ============================================================
   A85 — HEROKU (Dynos, Release Phase, Review Apps, CI)
============================================================ */
import fs from "fs";
import os from "os";

export function extractHerokuInfo(env: Record<string, string>) {
    if (!detectHeroku(env)) return null;

    return {
        isHeroku: true,
        dyno: env.DYNO ?? null,
        dynoType: classifyHerokuDyno(env),
        release: {
            version: env.HEROKU_RELEASE_VERSION ?? null,
            createdAt: env.HEROKU_RELEASE_CREATED_AT ?? null,
        },
        slug: env.SOURCE_VERSION ?? null,
        app: env.HEROKU_APP_NAME ?? null,
        commit: env.HEROKU_SLUG_COMMIT ?? env.SOURCE_VERSION ?? null,
        region: env.HEROKU_REGION ?? null,
        reviewApp: detectHerokuReviewApp(env),
        herokuCI: detectHerokuCI(env),
        stack: detectHerokuStack(),
        osHostname: os.hostname(),
    };
}

function detectHeroku(env: Record<string, string>) {
    return (
        !!env.HEROKU_APP_DIR ||
        !!env.DYNO ||
        !!env.HEROKU_SLUG_COMMIT ||
        !!env.HEROKU_APP_NAME ||
        fs.existsSync("/etc/heroku")
    );
}

function classifyHerokuDyno(env: Record<string, string>) {
    const dyno = env.DYNO ?? "";
    if (dyno.startsWith("web.")) return "web";
    if (dyno.startsWith("worker.")) return "worker";
    if (dyno.startsWith("run.")) return "one-off";
    return dyno || null;
}

function detectHerokuReviewApp(env: Record<string, string>) {
    return env.HEROKU_PARENT_APP_NAME ? {
        baseApp: env.HEROKU_PARENT_APP_NAME,
        prNumber: env.HEROKU_PR_NUMBER ?? null
    } : null;
}

function detectHerokuCI(env: Record<string, string>) {
    return env.HEROKU_TEST_RUN_ID ? {
        testRunId: env.HEROKU_TEST_RUN_ID,
        pr: env.HEROKU_TEST_RUN_PR_NUMBER,
        commit: env.HEROKU_TEST_RUN_COMMIT_VERSION,
    } : null;
}

function detectHerokuStack() {
    const stacks = ["/etc/heroku/stacks/heroku-22", "/etc/heroku/stacks/heroku-20"];
    for (const s of stacks) if (fs.existsSync(s)) return s.split("/").pop();
    return null;
}

/* ============================================================
   A86 — RENDER.COM (Services, Cron, Background Workers)
============================================================ */

export function extractRenderInfo(env: Record<string, string>) {
    if (!detectRender(env)) return null;

    return {
        isRender: true,
        serviceId: env.RENDER_SERVICE_ID ?? null,
        deployId: env.RENDER_DEPLOY_ID ?? null,
        serviceName: env.RENDER_SERVICE_NAME ?? null,
        environment: env.RENDER_SERVICE_ENV ?? null,
        plan: env.RENDER_SERVICE_PLAN ?? null,
        commit: env.RENDER_GIT_COMMIT ?? null,
        repo: env.RENDER_GIT_REPO ?? null,
        branch: env.RENDER_GIT_BRANCH ?? null,
        cron: env.RENDER_CRON ?? null,
    };
}

function detectRender(env: Record<string, string>) {
    return (
        !!env.RENDER_SERVICE_ID ||
        !!env.RENDER_SERVICE_ENV ||
        !!env.RENDER_GIT_COMMIT
    );
}

/* ============================================================
   A87 — FLY.IO (Machines, Nomad, Private Networking)
============================================================ */
import fs from "fs";

export function extractFlyInfo(env: Record<string, string>) {
    if (!detectFly(env)) return null;

    return {
        isFly: true,
        app: env.FLY_APP_NAME ?? null,
        machineId: env.FLY_MACHINE_ID ?? null,
        region: env.FLY_REGION ?? null,
        privateIp: env.FLY_PRIVATE_IP ?? null,
        nomad: {
            allocation: env.NOMAD_ALLOC_ID ?? null,
            region: env.NOMAD_REGION ?? null,
            datacenter: env.NOMAD_DC ?? null,
            namespace: env.NOMAD_NAMESPACE ?? null
        },
        volumes: detectFlyVolumes(),
    };
}

function detectFly(env: Record<string, string>) {
    return (
        !!env.FLY_APP_NAME ||
        !!env.FLY_MACHINE_ID ||
        fs.existsSync("/.fly/") ||
        fs.existsSync("/etc/fly")
    );
}

function detectFlyVolumes() {
    const dir = "/var/lib/fly/volumes";
    return fs.existsSync(dir) ? fs.readdirSync(dir) : null;
}

/* ============================================================
   A88 — PLANETSCALE
============================================================ */

export function extractPlanetScaleInfo(env: Record<string, string>) {
    if (!detectPlanetScale(env)) return null;

    return {
        isPlanetScale: true,
        branch: env.PLANETSCALE_BRANCH ?? null,
        org: env.PLANETSCALE_ORG ?? null,
        database: env.PLANETSCALE_DATABASE ?? null,
        production: env.PLANETSCALE_PRODUCTION_BRANCH ?? null,
    };
}

function detectPlanetScale(env: Record<string, string>) {
    return (
        !!env.PLANETSCALE_BRANCH ||
        !!env.PLANETSCALE_DATABASE ||
        !!env.PLANETSCALE_ORG
    );
}

/* ============================================================
   A89 — SUPABASE (Hosting, Functions, Edge Runtime)
============================================================ */

export function extractSupabaseInfo(env: Record<string, string>) {
    if (!detectSupabase(env)) return null;

    return {
        isSupabase: true,
        projectId: env.SUPABASE_PROJECT_ID ?? null,
        ref: env.SUPABASE_REF ?? null,
        url: env.SUPABASE_URL ?? null,
        anonKey: !!env.SUPABASE_ANON_KEY,
        serviceRole: !!env.SUPABASE_SERVICE_ROLE_KEY,
        edgeRuntime: detectSupabaseEdge(env),
        localStudio: detectSupabaseLocal(env),
    };
}

function detectSupabase(env: Record<string, string>) {
    return (
        !!env.SUPABASE_URL ||
        !!env.SUPABASE_REF ||
        !!env.SUPABASE_PROJECT_ID ||
        !!env.SUPABASE_DB_URL
    );
}

function detectSupabaseEdge(env: Record<string, string>) {
    return env.SUPABASE_FUNCTIONS_URL || env.SUPABASE_EDGE_RUNTIME ? true : false;
}

function detectSupabaseLocal(env: Record<string, string>) {
    return env.SUPABASE_LOCAL_DEV === "true" || env.SUPABASE_STUDIO === "1";
}

/* ============================================================
   A90 — RAILWAY.APP
============================================================ */

export function extractRailwayInfo(env: Record<string, string>) {
    if (!detectRailway(env)) return null;

    return {
        isRailway: true,
        project: env.RAILWAY_PROJECT_ID ?? null,
        environment: env.RAILWAY_ENVIRONMENT ?? null,
        service: env.RAILWAY_SERVICE_ID ?? null,
        publicUrl: env.RAILWAY_PUBLIC_DOMAIN ?? null,
        repo: env.RAILWAY_GIT_REPO ?? null,
        branch: env.RAILWAY_GIT_BRANCH ?? null,
        commit: env.RAILWAY_GIT_COMMIT_SHA ?? null,
    };
}

function detectRailway(env: Record<string, string>) {
    return (
        !!env.RAILWAY_ENVIRONMENT ||
        !!env.RAILWAY_DEPLOYMENT_ID ||
        !!env.RAILWAY_PROJECT_ID
    );
}

/* ============================================================
   A90 — RAILWAY.APP
============================================================ */

export function extractRailwayInfo(env: Record<string, string>) {
    if (!detectRailway(env)) return null;

    return {
        isRailway: true,
        project: env.RAILWAY_PROJECT_ID ?? null,
        environment: env.RAILWAY_ENVIRONMENT ?? null,
        service: env.RAILWAY_SERVICE_ID ?? null,
        publicUrl: env.RAILWAY_PUBLIC_DOMAIN ?? null,
        repo: env.RAILWAY_GIT_REPO ?? null,
        branch: env.RAILWAY_GIT_BRANCH ?? null,
        commit: env.RAILWAY_GIT_COMMIT_SHA ?? null,
    };
}

function detectRailway(env: Record<string, string>) {
    return (
        !!env.RAILWAY_ENVIRONMENT ||
        !!env.RAILWAY_DEPLOYMENT_ID ||
        !!env.RAILWAY_PROJECT_ID
    );
}

/* ============================================================
   A92 — QOVERY
============================================================ */

export function extractQoveryInfo(env: Record<string, string>) {
    if (!detectQovery(env)) return null;

    return {
        isQovery: true,
        organization: env.QOVERY_ORGANIZATION_ID ?? null,
        project: env.QOVERY_PROJECT_ID ?? null,
        environment: env.QOVERY_ENVIRONMENT_ID ?? null,
        application: env.QOVERY_APPLICATION_ID ?? null,
        deployment: env.QOVERY_DEPLOYMENT_ID ?? null,
        branch: env.QOVERY_GIT_BRANCH ?? null,
        commit: env.QOVERY_GIT_COMMIT_SHA ?? null,
    };
}

function detectQovery(env: Record<string, string>) {
    return !!env.QOVERY_APPLICATION_ID;
}

/* ============================================================
   A93 — NORTHFLANK
============================================================ */

export function extractNorthflankInfo(env: Record<string, string>) {
    if (!detectNorthflank(env)) return null;

    return {
        isNorthflank: true,
        project: env.NF_PROJECT ?? null,
        service: env.NF_SERVICE ?? null,
        deployment: env.NF_DEPLOYMENT ?? null,
        commit: env.NF_GIT_COMMIT ?? null,
        branch: env.NF_GIT_BRANCH ?? null,
    };
}

function detectNorthflank(env: Record<string, string>) {
    return !!env.NF_PROJECT || !!env.NF_SERVICE || !!env.NF_DEPLOYMENT;
}

/* ============================================================
   A94 — KOYEB
============================================================ */

export function extractKoyebInfo(env: Record<string, string>) {
    if (!detectKoyeb(env)) return null;

    return {
        isKoyeb: true,
        service: env.KOYEB_SERVICE_ID ?? null,
        app: env.KOYEB_APP_NAME ?? null,
        region: env.KOYEB_REGION ?? null,
        revision: env.KOYEB_REVISION ?? null,
        deployment: env.KOYEB_DEPLOYMENT_ID ?? null,
        platform: env.KOYEB_PLATFORM ?? null,
    };
}

function detectKoyeb(env: Record<string, string>) {
    return !!env.KOYEB_SERVICE_ID || !!env.KOYEB_PLATFORM;
}

/* ============================================================
   A95 — GITHUB ACTIONS
============================================================ */

export function extractGitHubActionsInfo(env: Record<string, string>) {
    if (!detectGitHubActions(env)) return null;

    return {
        isGitHubActions: true,
        workflow: env.GITHUB_WORKFLOW ?? null,
        runId: env.GITHUB_RUN_ID ?? null,
        runNumber: env.GITHUB_RUN_NUMBER ?? null,
        actor: env.GITHUB_ACTOR ?? null,
        repository: env.GITHUB_REPOSITORY ?? null,
        eventName: env.GITHUB_EVENT_NAME ?? null,
        eventPath: env.GITHUB_EVENT_PATH ?? null,
        ref: env.GITHUB_REF ?? null,
        sha: env.GITHUB_SHA ?? null,
        job: env.GITHUB_JOB ?? null,
        runner: {
            name: env.RUNNER_NAME ?? null,
            os: env.RUNNER_OS ?? null,
            arch: env.RUNNER_ARCH ?? null,
            temp: env.RUNNER_TEMP ?? null,
            toolCache: env.RUNNER_TOOL_CACHE ?? null
        }
    };
}

function detectGitHubActions(env: Record<string, string>) {
    return !!env.GITHUB_ACTIONS;
}

/* ============================================================
   A96 — CIRCLECI
============================================================ */

export function extractCircleCIInfo(env: Record<string, string>) {
    if (!detectCircleCI(env)) return null;

    return {
        isCircleCI: true,
        buildNum: env.CIRCLE_BUILD_NUM ?? null,
        branch: env.CIRCLE_BRANCH ?? null,
        sha: env.CIRCLE_SHA1 ?? null,
        workflowId: env.CIRCLE_WORKFLOW_ID ?? null,
        job: env.CIRCLE_JOB ?? null,
        repo: env.CIRCLE_PROJECT_REPONAME ?? null,
        username: env.CIRCLE_PROJECT_USERNAME ?? null,
        isPR: !!env.CI_PULL_REQUEST,
        nodeIndex: env.CIRCLE_NODE_INDEX ?? null,
        nodeTotal: env.CIRCLE_NODE_TOTAL ?? null,
        executor: env.CIRCLE_EXECUTOR ?? null
    };
}

function detectCircleCI(env: Record<string, string>) {
    return !!env.CIRCLECI;
}

/* ============================================================
   A97 — BITBUCKET PIPELINES
============================================================ */

export function extractBitbucketPipelinesInfo(env: Record<string, string>) {
    if (!detectBitbucket(env)) return null;

    return {
        isBitbucketPipelines: true,
        repo: env.BITBUCKET_REPO_FULL_NAME ?? null,
        branch: env.BITBUCKET_BRANCH ?? null,
        commit: env.BITBUCKET_COMMIT ?? null,
        buildNumber: env.BITBUCKET_BUILD_NUMBER ?? null,
        stepUuid: env.BITBUCKET_STEP_UUID ?? null,
        cloneDepth: env.BITBUCKET_CLONE_DEPTH ?? null,
        prId: env.BITBUCKET_PR_ID ?? null
    };
}

function detectBitbucket(env: Record<string, string>) {
    return !!env.BITBUCKET_BUILD_NUMBER || !!env.BITBUCKET_PIPELINE_UUID;
}

/* ============================================================
   A98 — JENKINS
============================================================ */

export function extractJenkinsInfo(env: Record<string, string>) {
    if (!detectJenkins(env)) return null;

    return {
        isJenkins: true,
        jobName: env.JOB_NAME ?? null,
        buildId: env.BUILD_ID ?? null,
        buildNumber: env.BUILD_NUMBER ?? null,
        executorNumber: env.EXECUTOR_NUMBER ?? null,
        workspace: env.WORKSPACE ?? null,
        nodeName: env.NODE_NAME ?? null,
        branch: env.GIT_BRANCH ?? null,
        commit: env.GIT_COMMIT ?? null,
        url: env.JENKINS_URL ?? null
    };
}

function detectJenkins(env: Record<string, string>) {
    return !!env.JENKINS_HOME || !!env.JENKINS_URL;
}

/* ============================================================
   A99 — DRONE CI
============================================================ */

export function extractDroneInfo(env: Record<string, string>) {
    if (!detectDrone(env)) return null;

    return {
        isDrone: true,
        build: env.DRONE_BUILD_NUMBER ?? null,
        repo: env.DRONE_REPO ?? null,
        branch: env.DRONE_BRANCH ?? null,
        target: env.DRONE_TARGET ?? null,
        commit: env.DRONE_COMMIT ?? null,
        event: env.DRONE_BUILD_EVENT ?? null,
        stage: env.DRONE_STAGE_NAME ?? null,
        step: env.DRONE_STEP_NAME ?? null
    };
}

function detectDrone(env: Record<string, string>) {
    return !!env.DRONE === true || !!env.DRONE_BUILD_NUMBER;
}

/* ============================================================
   A100 — BUILDKITE
============================================================ */

export function extractBuildkiteInfo(env: Record<string, string>) {
    if (!detectBuildkite(env)) return null;

    return {
        isBuildkite: true,
        buildId: env.BUILDKITE_BUILD_ID ?? null,
        buildNumber: env.BUILDKITE_BUILD_NUMBER ?? null,
        branch: env.BUILDKITE_BRANCH ?? null,
        commit: env.BUILDKITE_COMMIT ?? null,
        jobId: env.BUILDKITE_JOB_ID ?? null,
        agent: env.BUILDKITE_AGENT_NAME ?? null,
        pipelineSlug: env.BUILDKITE_PIPELINE_SLUG ?? null
    };
}

function detectBuildkite(env: Record<string, string>) {
    return !!env.BUILDKITE;
}

/* ============================================================
   A101 — TEAMCITY
============================================================ */

export function extractTeamCityInfo(env: Record<string, string>) {
    if (!detectTeamCity(env)) return null;

    return {
        isTeamCity: true,
        buildId: env.TEAMCITY_BUILD_ID ?? null,
        buildNumber: env.BUILD_NUMBER ?? null,
        branch: env.BRANCH_NAME ?? null,
        buildType: env.TEAMCITY_BUILDCONF_NAME ?? null,
        agentName: env.AGENT_NAME ?? null,
    };
}

function detectTeamCity(env: Record<string, string>) {
    return !!env.TEAMCITY_VERSION;
}

/* ============================================================
   A102 — FASTLY COMPUTE@EDGE
============================================================ */

export function extractFastlyComputeEdgeInfo(env: Record<string, string>) {
    if (!detectFastlyCompute(env)) return null;

    return {
        isFastlyCompute: true,
        serviceId: env.FASTLY_SERVICE_ID ?? null,
        deployment: env.FASTLY_DEPLOYMENT_ID ?? null,
        region: env.FASTLY_POP ?? null,
        fastlyScript: isFastlyCoreRuntime()
    };
}

function detectFastlyCompute(env: Record<string, string>) {
    return (
        !!env.FASTLY_SERVICE_ID ||
        typeof globalThis.fastly !== "undefined" ||
        typeof globalThis.Fastly !== "undefined"
    );
}

function isFastlyCoreRuntime() {
    return typeof (globalThis as any).fastly !== "undefined";
}

/* ============================================================
   A103 — NETLIFY EDGE FUNCTIONS
============================================================ */

export function extractNetlifyEdgeInfo(env: Record<string, string>) {
    if (!detectNetlifyEdge(env)) return null;

    return {
        isNetlifyEdge: true,
        functionName: env.NETLIFY_EDGE_FUNCTION_NAME ?? null,
        region: env.NETLIFY_EDGE_REGION ?? null,
        deployment: env.NETLIFY_EDGE_DEPLOY_ID ?? null
    };
}

function detectNetlifyEdge(env: Record<string, string>) {
    return (
        !!env.NETLIFY_EDGE_FUNCTION_NAME ||
        !!env.NETLIFY_EDGE_HANDLER ||
        typeof (globalThis as any).Netlify !== "undefined"
    );
}

/* ============================================================
   A105 — AKAMAI EDGEWORKERS
============================================================ */

export function extractAkamaiEdgeWorkersInfo(env: Record<string, string>) {
    if (!detectAkamaiEdgeWorkers(env)) return null;

    return {
        isAkamaiEdgeWorkers: true,
        activationId: env.EW_ACTIVATION_ID ?? null,
        network: env.EW_NETWORK ?? null,
        version: env.EW_VERSION ?? null,
        product: env.EW_PRODUCT ?? null,
        edgeworkerId: env.EW_ID ?? null,
        sandbox: detectAkamaiSandbox(env),
    };
}

function detectAkamaiEdgeWorkers(env: Record<string, string>) {
    return (
        env.EW_VERSION ||
        env.EW_PRODUCT ||
        typeof (globalThis as any).Akamai !== "undefined"
    );
}

function detectAkamaiSandbox(env: Record<string, string>) {
    return env.AKAMAI_SANDBOX || env.EDGESCAPE ?? null;
}

/* ============================================================
   A106 — NEON (Serverless Postgres)
============================================================ */

export function extractNeonInfo(env: Record<string, string>) {
    if (!detectNeon(env)) return null;

    return {
        isNeon: true,
        projectId: env.NEON_PROJECT_ID ?? null,
        branch: env.NEON_BRANCH ?? null,
        database: env.NEON_DATABASE ?? null,
        role: env.NEON_ROLE ?? null,
        compute: env.NEON_COMPUTE_ID ?? null,
    };
}

function detectNeon(env: Record<string, string>) {
    return (
        !!env.NEON_PROJECT_ID ||
        !!env.NEON_BRANCH ||
        !!env.NEON_DATABASE ||
        !!env.NEON_COMPUTE_ID
    );
}

/* ============================================================
   A107 — COCKROACHDB SERVERLESS
============================================================ */

export function extractCockroachServerlessInfo(env: Record<string, string>) {
    if (!detectCockroachServerless(env)) return null;

    return {
        isCockroachServerless: true,
        project: env.COCKROACH_PROJECT ?? null,
        cluster: env.COCKROACH_CLUSTER ?? null,
        tenant: env.COCKROACH_TENANT ?? null,
        routingId: env.COCKROACH_ROUTING_ID ?? null,
        region: env.COCKROACH_REGION ?? null,
    };
}

function detectCockroachServerless(env: Record<string, string>) {
    return (
        !!env.COCKROACH_ROUTING_ID ||
        !!env.COCKROACH_CLUSTER ||
        !!env.COCKROACH_TENANT
    );
}

/* ============================================================
   A108 — UPSTASH (Redis / Kafka / QStash)
============================================================ */

export function extractUpstashInfo(env: Record<string, string>) {
    if (!detectUpstash(env)) return null;

    return {
        isUpstash: true,
        redis: detectUpstashRedis(env),
        kafka: detectUpstashKafka(env),
        qstash: detectUpstashQStash(env),
        region: env.UPSTASH_REGION ?? null,
    };
}

function detectUpstash(env: Record<string, string>) {
    return (
        !!env.UPSTASH_REDIS_REST_URL ||
        !!env.UPSTASH_KAFKA_BROKERS ||
        !!env.QSTASH_URL
    );
}

function detectUpstashRedis(env: Record<string, string>) {
    return env.UPSTASH_REDIS_REST_URL
        ? {
            restUrl: env.UPSTASH_REDIS_REST_URL,
            token: !!env.UPSTASH_REDIS_REST_TOKEN,
        }
        : null;
}

function detectUpstashKafka(env: Record<string, string>) {
    return env.UPSTASH_KAFKA_BROKERS
        ? {
            brokers: env.UPSTASH_KAFKA_BROKERS.split(","),
            topic: env.UPSTASH_KAFKA_TOPIC ?? null,
        }
        : null;
}

function detectUpstashQStash(env: Record<string, string>) {
    return env.QSTASH_URL
        ? {
            url: env.QSTASH_URL,
            token: !!env.QSTASH_TOKEN,
        }
        : null;
}

/* ============================================================
   A109 — TIDB CLOUD
============================================================ */

export function extractTiDBCloudInfo(env: Record<string, string>) {
    if (!detectTiDBCloud(env)) return null;

    return {
        isTiDBCloud: true,
        projectId: env.TIDB_PROJECT_ID ?? null,
        clusterId: env.TIDB_CLUSTER_ID ?? null,
        clusterName: env.TIDB_CLUSTER_NAME ?? null,
        region: env.TIDB_REGION ?? null,
        sqlEndpoint: env.TIDB_ENDPOINT ?? null,
    };
}

function detectTiDBCloud(env: Record<string, string>) {
    return (
        !!env.TIDB_CLUSTER_ID ||
        !!env.TIDB_PROJECT_ID ||
        !!env.TIDB_ENDPOINT
    );
}

/* ============================================================
   A110 — MONGODB ATLAS FUNCTIONS
============================================================ */

export function extractMongoDBAtlasFunctionsInfo(env: Record<string, string>) {
    if (!detectAtlasFunctions(env)) return null;

    return {
        isMongoDBAtlasFunctions: true,
        functionName: env.ATLAS_FUNCTION_NAME ?? null,
        service: env.ATLAS_SERVICE_NAME ?? null,
        deployment: env.ATLAS_DEPLOYMENT ?? null,
        region: env.ATLAS_REGION ?? null,
        apiVersion: env.ATLAS_API_VERSION ?? null
    };
}

function detectAtlasFunctions(env: Record<string, string>) {
    return (
        !!env.ATLAS_FUNCTION_NAME ||
        typeof (globalThis as any).context !== "undefined"
    );
}

/* ============================================================
   A111 — PODMAN
============================================================ */
import fs from "fs";

export function extractPodmanInfo() {
    if (!detectPodman()) return null;

    return {
        isPodman: true,
        cgroup: readCgroup(),
        machine: detectPodmanMachine(),
    };
}

function detectPodman() {
    const path = "/run/.containerenv";
    if (fs.existsSync(path)) {
        const txt = fs.readFileSync(path, "utf8");
        return txt.includes("podman");
    }
    return false;
}

function readCgroup() {
    const path = "/proc/1/cgroup";
    if (!fs.existsSync(path)) return null;
    return fs.readFileSync(path, "utf8");
}

function detectPodmanMachine() {
    return fs.existsSync("/run/podman/machine") ? true : null;
}

/* ============================================================
   A112 — LXC / LXD
============================================================ */
import fs from "fs";

export function extractLXCInfo() {
    if (!detectLXC()) return null;

    return {
        isLXC: true,
        config: readLXCConfig(),
        containerName: process.env.HOSTNAME ?? null,
    };
}

function detectLXC() {
    return (
        fs.existsSync("/.lxc") ||
        fs.existsSync("/dev/lxd/sock") ||
        fs.existsSync("/run/lxc") ||
        process.env.ROOTFS ?? false
    );
}

function readLXCConfig() {
    const path = "/etc/lxc/lxc.conf";
    if (!fs.existsSync(path)) return null;
    return fs.readFileSync(path, "utf8");
}

/* ============================================================
   A113 — SYSTEMD-NSPAWN
============================================================ */
import fs from "fs";

export function extractSystemdNspawnInfo() {
    if (!detectSystemdNspawn()) return null;

    return {
        isSystemdNspawn: true,
        machineName: readMachineName(),
        cgroup: readCgroup(),
    };
}

function detectSystemdNspawn() {
    const indicator = "/run/systemd/nspawn/boot";
    return fs.existsSync(indicator);
}

function readMachineName() {
    const p = "/run/systemd/nspawn/machine";
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, "utf8").trim();
}

function readCgroup() {
    const path = "/proc/1/cgroup";
    if (!fs.existsSync(path)) return null;
    return fs.readFileSync(path, "utf8");
}

/* ============================================================
   A114 — RANCHER
============================================================ */
import fs from "fs";

export function extractRancherInfo(env: Record<string, string>) {
    if (!detectRancher(env)) return null;

    return {
        isRancher: true,
        nodeName: env.CATTLE_NODE_NAME ?? null,
        clusterId: env.CATTLE_CLUSTER ?? null,
        projectId: env.CATTLE_PROJECT ?? null,
        agent: detectRancherAgent(),
    };
}

function detectRancher(env: Record<string, string>) {
    return (
        !!env.CATTLE_CLUSTER ||
        !!env.CATTLE_NODE_NAME ||
        !!env.CATTLE_PROJECT ||
        fs.existsSync("/etc/rancher")
    );
}

function detectRancherAgent() {
    return fs.existsSync("/var/lib/rancher") ? true : null;
}

/* ============================================================
   A115 — HASHICORP NOMAD (Full environment & FS detection)
============================================================ */
import fs from "fs";

export function extractNomadInfo(env: Record<string, string>) {
    if (!detectNomad(env)) return null;

    return {
        isNomad: true,
        alloc: env.NOMAD_ALLOC_ID ?? null,
        allocName: env.NOMAD_ALLOC_NAME ?? null,
        allocDir: env.NOMAD_ALLOC_DIR ?? null,
        task: env.NOMAD_TASK_NAME ?? null,
        taskDir: env.NOMAD_TASK_DIR ?? null,
        namespace: env.NOMAD_NAMESPACE ?? null,
        region: env.NOMAD_REGION ?? null,
        datacenter: env.NOMAD_DC ?? null,
        node: env.NOMAD_NODE_NAME ?? null,
        job: {
            id: env.NOMAD_JOB_ID ?? null,
            name: env.NOMAD_JOB_NAME ?? null,
            type: env.NOMAD_JOB_TYPE ?? null,
            group: env.NOMAD_GROUP_NAME ?? null
        },
        fs: detectNomadFS(),
        cgroup: detectNomadCgroup(),
        system: {
            memoryLimit: env.NOMAD_MEMORY_LIMIT ?? null,
            cpuLimit: env.NOMAD_CPU_LIMIT ?? null
        }
    };
}

function detectNomad(env: Record<string, string>) {
    return (
        !!env.NOMAD_ALLOC_ID ||
        !!env.NOMAD_TASK_NAME ||
        fs.existsSync("/secrets/nomad") ||
        fs.existsSync("/alloc")
    );
}

function detectNomadFS() {
    const paths = [
        "/alloc",
        "/secrets/nomad",
        "/local/alloc",
        "/local/task",
        "/nomad/data"
    ];
    const found = {};
    for (const p of paths) found[p] = fs.existsSync(p);
    return found;
}

function detectNomadCgroup() {
    const cg = "/proc/1/cgroup";
    if (!fs.existsSync(cg)) return null;
    return fs.readFileSync(cg, "utf8");
}

/* ============================================================
   A116 — NETLIFY (Build System, Deploy Context, Functions, Edge)
============================================================ */
import fs from "fs";

export function extractNetlifyFullInfo(env: Record<string, string>) {
    if (!detectNetlify(env)) return null;

    return {
        isNetlify: true,
        build: {
            id: env.BUILD_ID ?? null,
            version: env.NETLIFY_BUILD_VERSION ?? null,
            context: env.CONTEXT ?? null,
            branch: env.BRANCH ?? null,
            commit: env.COMMIT_REF ?? null,
            deployUrl: env.DEPLOY_URL ?? null,
            deployPrimeUrl: env.DEPLOY_PRIME_URL ?? null,
            functionsDir: env.NETLIFY_FUNCTIONS_SRC ?? null
        },
        site: {
            id: env.SITE_ID ?? null,
            name: env.SITE_NAME ?? null
        },
        runtime: {
            edge: detectNetlifyEdgeRuntime(env),
            serverlessFunctions: detectNetlifyFunctions(env)
        },
        fs: {
            manifest: readNetlifyManifest(),
            edgeManifest: readNetlifyEdgeManifest()
        }
    };
}

function detectNetlify(env: Record<string, string>) {
    return (
        !!env.NETLIFY ||
        !!env.DEPLOY_URL ||
        fs.existsSync("./.netlify/state.json") ||
        fs.existsSync("./netlify.toml")
    );
}

function detectNetlifyEdgeRuntime(env: Record<string, string>) {
    return env.NETLIFY_EDGE_HANDLER || env.NETLIFY_EDGE_FUNCTION_NAME || null;
}

function detectNetlifyFunctions(env: Record<string, string>) {
    if (env.NETLIFY_FUNCTIONS_SRC) return env.NETLIFY_FUNCTIONS_SRC;
    const f1 = "./netlify/functions";
    const f2 = "./functions";
    return fs.existsSync(f1) ? f1 : fs.existsSync(f2) ? f2 : null;
}

function readNetlifyManifest() {
    const m = "./.netlify/state.json";
    if (!fs.existsSync(m)) return null;
    try { return JSON.parse(fs.readFileSync(m, "utf8")); } catch { return null; }
}

function readNetlifyEdgeManifest() {
    const p = "./.netlify/edge-functions/manifest.json";
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

/* ============================================================
   A117 — VERCEL BUILD RUNTIME (Build env, output env, system)
============================================================ */
import fs from "fs";

export function extractVercelBuildInfo(env: Record<string, string>) {
    if (!detectVercelBuild(env)) return null;

    return {
        isVercelBuild: true,
        build: {
            env: env.VERCEL_ENV ?? null,
            url: env.VERCEL_URL ?? null,
            gitRepo: env.VERCEL_GIT_REPO_SLUG ?? null,
            gitOrg: env.VERCEL_GIT_ORG_SLUG ?? null,
            gitProvider: env.VERCEL_GIT_PROVIDER ?? null,
            commit: env.VERCEL_GIT_COMMIT_SHA ?? null,
            branch: env.VERCEL_GIT_COMMIT_REF ?? null
        },
        output: detectVercelOutputFS(),
        config: detectVercelConfig(),
        internal: {
            cli: env.VERCEL_CLI ?? null,
            isDev: env.VERCEL_DEV === "1",
            analyticsId: env.VERCEL_ANALYTICS_ID ?? null
        }
    };
}

function detectVercelBuild(env: Record<string, string>) {
    return (
        !!env.VERCEL ||
        !!env.VERCEL_ENV ||
        fs.existsSync("./vercel.json") ||
        fs.existsSync(".vercel/project.json")
    );
}

function detectVercelOutputFS() {
    const outputs = [
        ".vercel/output",
        ".vercel/project.json",
        ".vercel/output/functions",
        ".vercel/output/static"
    ];
    const result = {};
    for (const p of outputs) result[p] = fs.existsSync(p);
    return result;
}

function detectVercelConfig() {
    const p = "./vercel.json";
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

/* ============================================================
   A118 — SVELTEKIT ADAPTER DETECTION
============================================================ */
import fs from "fs";

export function extractSvelteKitAdapterInfo() {
    const adapter = detectSvelteKitAdapter();
    if (!adapter) return null;

    return {
        isSvelteKit: true,
        adapter,
        config: readSvelteConfig()
    };
}

function detectSvelteKitAdapter() {
    const pkg = "./package.json";
    if (!fs.existsSync(pkg)) return null;

    try {
        const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
        const deps = { ...json.dependencies, ...json.devDependencies };
        const keys = Object.keys(deps);

        const adapters = [
            "adapter-auto",
            "adapter-node",
            "adapter-static",
            "adapter-vercel",
            "adapter-netlify",
            "adapter-cloudflare",
            "adapter-deno",
            "adapter-aws",
            "adapter-bun"
        ];

        for (const a of adapters) {
            const name = `@sveltejs/${a}`;
            if (keys.includes(name)) return name;
        }
    } catch { }

    return null;
}

function readSvelteConfig() {
    const f1 = "svelte.config.js";
    const f2 = "svelte.config.ts";
    if (fs.existsSync(f1)) return fs.readFileSync(f1, "utf8");
    if (fs.existsSync(f2)) return fs.readFileSync(f2, "utf8");
    return null;
}

/* ============================================================
   A119 — GATSBY CLOUD (Build, Preview, Functions)
============================================================ */
import fs from "fs";

export function extractGatsbyCloudInfo(env: Record<string, string>) {
    if (!detectGatsbyCloud(env)) return null;

    return {
        isGatsbyCloud: true,
        buildId: env.GATSBY_CLOUD_BUILD_ID ?? null,
        siteId: env.GATSBY_CLOUD_SITE_ID ?? null,
        preview: env.GATSBY_CLOUD_PREVIEW ?? null,
        functionsDir: detectGatsbyFunctions(),
        manifest: readGatsbyManifest()
    };
}

function detectGatsbyCloud(env: Record<string, string>) {
    return (
        !!env.GATSBY_CLOUD_BUILD_ID ||
        !!env.GATSBY_CLOUD_PREVIEW ||
        fs.existsSync(".cache/gatsby-state.json")
    );
}

function detectGatsbyFunctions() {
    const dir = "src/api";
    return fs.existsSync(dir) ? dir : null;
}

function readGatsbyManifest() {
    const p = ".cache/gatsby-state.json";
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

/* ============================================================
   A120 — WEBFLOW (CMS, Designer, Editor, Logic)
============================================================ */

export function extractWebflowInfo(env: Record<string, string>) {
    if (!detectWebflow(env)) return null;

    return {
        isWebflow: true,
        environment: env.WEBFLOW_ENV ?? null,
        siteId: env.WEBFLOW_SITE_ID ?? null,
        userId: env.WEBFLOW_USER_ID ?? null,
        cms: {
            id: env.WEBFLOW_CMS_SITE_ID ?? null,
            collection: env.WEBFLOW_COLLECTION_ID ?? null
        },
        logic: {
            runId: env.WEBFLOW_LOGIC_RUN_ID ?? null
        }
    };
}

function detectWebflow(env: Record<string, string>) {
    return (
        !!env.WEBFLOW_ENV ||
        !!env.WEBFLOW_SITE_ID ||
        !!env.WEBFLOW_LOGIC_RUN_ID
    );
}

/* ============================================================
   A121 — HUBSPOT CMS (Serverless Functions, HubL)
============================================================ */

export function extractHubSpotCMSInfo(env: Record<string, string>) {
    if (!detectHubSpot(env)) return null;

    return {
        isHubSpotCMS: true,
        portalId: env.HUBSPOT_PORTAL_ID ?? null,
        functionName: env.HUBSPOT_FUNCTION_NAME ?? null,
        region: env.HUBSPOT_REGION ?? null,
        runtime: env.HUBSPOT_RUNTIME ?? null,
        hublEnv: detectHubLRuntime(env)
    };
}

function detectHubSpot(env: Record<string, string>) {
    return (
        !!env.HUBSPOT_PORTAL_ID ||
        !!env.HUBSPOT_RUNTIME ||
        !!env.HUBSPOT_FUNCTION_NAME
    );
}

function detectHubLRuntime(env: Record<string, string>) {
    return env.HUBSPOT_CMS_HUBL_ENV ?? null;
}

/* ============================================================
   A122 — WORDPRESS VIP GO
============================================================ */
import fs from "fs";

export function extractWordPressVIPInfo(env: Record<string, string>) {
    if (!detectVIP(env)) return null;

    return {
        isVIPGo: true,
        appId: env.WP_APP_ID ?? null,
        env: env.WP_ENV ?? null,
        commit: env.WP_REVISION ?? null,
        domain: env.WP_DOMAIN ?? null,
        fs: {
            vipConfig: readVIPConfig(),
            vipMeta: readVIPMeta()
        }
    };
}

function detectVIP(env: Record<string, string>) {
    return (
        !!env.WP_APP_ID ||
        fs.existsSync("/usr/local/bin/vip-init") ||
        fs.existsSync("/opt/vip")
    );
}

function readVIPConfig() {
    const p = "/opt/vip/vip-config.json";
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function readVIPMeta() {
    const p = "/opt/vip/vip-meta.json";
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

/* ============================================================
   A123 — DRUPAL ACQUIA (Cloud Site Factory, Hosting)
============================================================ */
import fs from "fs";

export function extractAcquiaInfo(env: Record<string, string>) {
    if (!detectAcquia(env)) return null;

    return {
        isAcquia: true,
        siteGroup: env.ACQUIA_SITE_GROUP ?? null,
        envName: env.ACQUIA_ENVIRONMENT ?? null,
        realm: env.ACQUIA_REALM ?? null,
        repo: env.ACQUIA_REPO_URL ?? null,
        fs: detectAcquiaFS()
    };
}

function detectAcquia(env: Record<string, string>) {
    return (
        !!env.ACQUIA_ENVIRONMENT ||
        fs.existsSync("/var/www/site-php") ||
        fs.existsSync("/mnt/www/html")
    );
}

function detectAcquiaFS() {
    const paths = [
        "/var/www/site-php",
        "/mnt/www/html",
        "/var/www/html",
        "/acquia"
    ];
    const out = {};
    for (const p of paths) out[p] = fs.existsSync(p);
    return out;
}

/* ============================================================
   A124 — CONTENTFUL APP RUNTIME
============================================================ */

export function extractContentfulAppInfo(env: Record<string, string>) {
    if (!detectContentful(env)) return null;

    return {
        isContentfulApp: true,
        spaceId: env.CONTENTFUL_SPACE_ID ?? null,
        environmentId: env.CONTENTFUL_ENVIRONMENT_ID ?? null,
        appDefinitionId: env.CONTENTFUL_APP_DEFINITION_ID ?? null,
        location: env.CONTENTFUL_APP_LOCATION ?? null, // entry-sidebar, page, dialog, etc.
        userId: env.CONTENTFUL_USER_ID ?? null,
        apiHost: env.CONTENTFUL_API_HOST ?? null
    };
}

function detectContentful(env: Record<string, string>) {
    return (
        !!env.CONTENTFUL_SPACE_ID ||
        !!env.CONTENTFUL_APP_LOCATION ||
        !!env.CONTENTFUL_APP_DEFINITION_ID
    );
}

/* ============================================================
   A125 — SANITY STUDIO (Studio Env, Workspace, Dataset)
============================================================ */
import fs from "fs";

export function extractSanityStudioInfo(env: Record<string, string>) {
    if (!detectSanity(env)) return null;

    return {
        isSanity: true,
        projectId: env.SANITY_STUDIO_PROJECT_ID ?? null,
        dataset: env.SANITY_STUDIO_DATASET ?? null,
        preview: env.SANITY_STUDIO_PREVIEW_SECRET ?? null,
        studioRoot: detectSanityStudioRoot(),
        workspaces: detectSanityWorkspaces(),
        config: readSanityConfig()
    };
}

function detectSanity(env: Record<string, string>) {
    if (env.SANITY_STUDIO_PROJECT_ID) return true;
    if (fs.existsSync("sanity.config.ts")) return true;
    if (fs.existsSync("sanity.config.js")) return true;
    if (fs.existsSync("sanity.cli.js")) return true;
    return false;
}

function detectSanityStudioRoot() {
    return fs.existsSync("sanity.config.ts") ? "sanity.config.ts"
        : fs.existsSync("sanity.config.js") ? "sanity.config.js"
            : null;
}

function detectSanityWorkspaces() {
    const p = "sanity.config.ts";
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, "utf8");
}

function readSanityConfig() {
    const ts = "sanity.config.ts";
    const js = "sanity.config.js";
    if (fs.existsSync(ts)) return fs.readFileSync(ts, "utf8");
    if (fs.existsSync(js)) return fs.readFileSync(js, "utf8");
    return null;
}

/* ============================================================
   A126 — STRAPI CLOUD (Hosted Strapi Runtime)
============================================================ */

export function extractStrapiCloudInfo(env: Record<string, string>) {
    if (!detectStrapiCloud(env)) return null;

    return {
        isStrapiCloud: true,
        projectId: env.STRAPI_CLOUD_PROJECT_ID ?? null,
        region: env.STRAPI_CLOUD_REGION ?? null,
        environment: env.STRAPI_CLOUD_ENV ?? null,
        commit: env.STRAPI_CLOUD_COMMIT_SHA ?? null,
        workspace: env.STRAPI_CLOUD_WORKSPACE ?? null
    };
}

function detectStrapiCloud(env: Record<string, string>) {
    return (
        !!env.STRAPI_CLOUD_PROJECT_ID ||
        !!env.STRAPI_CLOUD_REGION ||
        !!env.STRAPI_CLOUD_ENV
    );
}

/* ============================================================
   A127 — GHOST(PRO) (Managed Ghost CMS)
============================================================ */
import fs from "fs";

export function extractGhostProInfo(env: Record<string, string>) {
    if (!detectGhostPro(env)) return null;

    return {
        isGhostPro: true,
        instance: env.GHOST_INSTANCE ?? null,
        url: env.GHOST_URL ?? null,
        theme: detectGhostTheme(),
        config: readGhostConfig()
    };
}

function detectGhostPro(env: Record<string, string>) {
    return (
        !!env.GHOST_URL ||
        fs.existsSync("/var/lib/ghost") ||
        fs.existsSync("config.production.json")
    );
}

function detectGhostTheme() {
    const themes = "./content/themes";
    if (!fs.existsSync(themes)) return null;
    return fs.readdirSync(themes);
}

function readGhostConfig() {
    const p = "config.production.json";
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

/* ============================================================
   A128 — DEVBOX / JETPACK.IO
============================================================ */
import fs from "fs";

export function extractDevboxInfo(env: Record<string, string>) {
    if (!detectDevbox(env)) return null;

    return {
        isDevbox: true,
        shell: env.DEVBOX_SHELL ?? null,
        projectRoot: env.DEVBOX_PROJECT_ROOT ?? null,
        config: readDevboxConfig()
    };
}

function detectDevbox(env: Record<string, string>) {
    return (
        !!env.DEVBOX_SHELL ||
        !!env.DEVBOX_PROJECT_ROOT ||
        fs.existsSync("devbox.json")
    );
}

function readDevboxConfig() {
    const p = "devbox.json";
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

/* ============================================================
   A129 — TILT / GARDEN (Local DevOps Simulators)
============================================================ */
import fs from "fs";

export function extractTiltGardenInfo(env: Record<string, string>) {
    if (!detectTilt(env) && !detectGarden(env)) return null;

    return {
        isTilt: detectTilt(env),
        isGarden: detectGarden(env),
        tilt: detectTiltInfo(env),
        garden: detectGardenInfo(env)
    };
}

function detectTilt(env: Record<string, string>) {
    return (
        !!env.TILTfile ||
        fs.existsSync("Tiltfile") ||
        !!env.TILT_BUILD_ID
    );
}

function detectGarden(env: Record<string, string>) {
    return (
        !!env.GARDEN_SESSION ||
        fs.existsSync("garden.yml") ||
        fs.existsSync("garden.yaml")
    );
}

function detectTiltInfo(env: Record<string, string>) {
    if (!detectTilt(env)) return null;
    return {
        buildId: env.TILT_BUILD_ID ?? null,
        trigger: env.TILT_TRIGGER ?? null
    };
}

function detectGardenInfo(env: Record<string, string>) {
    if (!detectGarden(env)) return null;
    return {
        session: env.GARDEN_SESSION ?? null,
        projectRoot: env.GARDEN_ROOT ?? null
    };
}

/* ============================================================
   A130 — MINIKUBE
============================================================ */
import fs from "fs";

export function extractMinikubeInfo() {
    if (!detectMinikube()) return null;

    return {
        isMinikube: true,
        profiles: detectMinikubeProfiles(),
        config: readMinikubeConfig()
    };
}

function detectMinikube() {
    return (
        fs.existsSync("~/.minikube") ||
        fs.existsSync("/etc/kubernetes/minikube")
    );
}

function detectMinikubeProfiles() {
    const dir = `${process.env.HOME}/.minikube/profiles`;
    if (!fs.existsSync(dir)) return null;
    return fs.readdirSync(dir);
}

function readMinikubeConfig() {
    const p = `${process.env.HOME}/.minikube/config/config.json`;
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

/* ============================================================
   A131 — COLIMA (Container Runtime)
============================================================ */
import fs from "fs";

export function extractColimaInfo() {
    if (!detectColima()) return null;

    return {
        isColima: true,
        stateDir: readColimaState(),
        profiles: detectColimaProfiles()
    };
}

function detectColima() {
    const root = `${process.env.HOME}/.colima`;
    return fs.existsSync(root);
}

function readColimaState() {
    const p = `${process.env.HOME}/.colima/default/state.json`;
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function detectColimaProfiles() {
    const dir = `${process.env.HOME}/.colima`;
    if (!fs.existsSync(dir)) return null;
    return fs.readdirSync(dir);
}

/* ============================================================
   A132 — PARALLELS (Virtualization detection)
============================================================ */
import fs from "fs";

export function extractParallelsInfo() {
    if (!detectParallels()) return null;

    return {
        isParallels: true,
        dmi: readDMI(),
        sharedFolders: detectParallelsSharedFolders()
    };
}

function detectParallels() {
    const vendor = "/sys/devices/virtual/dmi/id/sys_vendor";
    if (!fs.existsSync(vendor)) return false;
    try {
        const v = fs.readFileSync(vendor, "utf8").toLowerCase();
        return v.includes("parallels");
    } catch { return false; }
}

function readDMI() {
    const path = "/sys/devices/virtual/dmi/id/";
    const out: any = {};
    ["sys_vendor", "product_name", "bios_vendor"].forEach((f) => {
        const p = path + f;
        if (fs.existsSync(p)) out[f] = fs.readFileSync(p, "utf8").trim();
    });
    return out;
}

function detectParallelsSharedFolders() {
    const p = "/media/psf";
    return fs.existsSync(p) ? fs.readdirSync(p) : null;
}

/* ============================================================
   A133 — VMWARE FUSION / ESXI DETECTION
============================================================ */
import fs from "fs";

export function extractVMwareInfo() {
    if (!detectVMware()) return null;

    return {
        isVMware: true,
        dmi: readVMwareDMI(),
        tools: detectVMwareTools(),
        sharedFolders: detectVMwareSharedFolders()
    };
}

function detectVMware() {
    const vendor = "/sys/devices/virtual/dmi/id/sys_vendor";
    if (!fs.existsSync(vendor)) return false;

    try {
        const v = fs.readFileSync(vendor, "utf8").toLowerCase();
        return v.includes("vmware");
    } catch { return false; }
}

function readVMwareDMI() {
    const path = "/sys/devices/virtual/dmi/id/";
    const out: any = {};
    ["sys_vendor", "product_name", "bios_vendor"].forEach((f) => {
        const p = path + f;
        if (fs.existsSync(p)) out[f] = fs.readFileSync(p, "utf8").trim();
    });
    return out;
}

function detectVMwareTools() {
    return fs.existsSync("/usr/bin/vmware-toolbox-cmd") ||
        fs.existsSync("/usr/bin/vmtoolsd");
}

function detectVMwareSharedFolders() {
    const p = "/mnt/hgfs";
    return fs.existsSync(p) ? fs.readdirSync(p) : null;
}

/* ============================================================
   A134 — PROXMOX VE
============================================================ */
import fs from "fs";

export function extractProxmoxInfo(env: Record<string, string>) {
    if (!detectProxmox(env)) return null;

    return {
        isProxmox: true,
        nodeName: env.PVE_NODE_NAME ?? null,
        cluster: env.PVE_CLUSTER ?? null,
        vmid: env.PVE_VMID ?? null,
        dmi: readProxmoxDMI(),
        fs: detectProxmoxFS()
    };
}

function detectProxmox(env: Record<string, string>) {
    return (
        !!env.PVE_CLUSTER ||
        fs.existsSync("/etc/pve") ||
        fs.existsSync("/usr/bin/pvesh")
    );
}

function readProxmoxDMI() {
    const path = "/sys/devices/virtual/dmi/id/";
    const out: any = {};
    ["sys_vendor", "product_name", "board_vendor"].forEach((f) => {
        const p = path + f;
        if (fs.existsSync(p)) out[f] = fs.readFileSync(p, "utf8").trim();
    });
    return out;
}

function detectProxmoxFS() {
    const dirs = ["/etc/pve", "/var/lib/pve-cluster"];
    const out = {};
    for (const d of dirs) out[d] = fs.existsSync(d);
    return out;
}

/* ============================================================
   A135 — PANTHEON (Drupal / WordPress)
============================================================ */
import fs from "fs";

export function extractPantheonInfo(env: Record<string, string>) {
    if (!detectPantheon(env)) return null;

    return {
        isPantheon: true,
        siteId: env.PANTHEON_SITE ?? null,
        siteName: env.PANTHEON_SITE_NAME ?? null,
        environment: env.PANTHEON_ENVIRONMENT ?? null,
        binding: env.PANTHEON_BINDING ?? null,
        redis: env.PANTHEON_REDIS_HOST ? {
            host: env.PANTHEON_REDIS_HOST,
            port: env.PANTHEON_REDIS_PORT
        } : null,
        phpInfo: detectPantheonPHP()
    };
}

function detectPantheon(env: Record<string, string>) {
    return (
        !!env.PANTHEON_ENVIRONMENT ||
        fs.existsSync("/srv/bindings") ||
        fs.existsSync("/srv/bindings/*/code")
    );
}

function detectPantheonPHP() {
    const p = "/srv/bindings";
    if (!fs.existsSync(p)) return null;
    return fs.readdirSync(p);
}

/* ============================================================
   A136 — CPANEL / WHM
============================================================ */
import fs from "fs";

export function extractCPanelInfo() {
    if (!detectCPanel()) return null;

    return {
        isCPanel: true,
        user: readCPanelUser(),
        features: detectCPanelFeatures(),
        paths: detectCPanelPaths()
    };
}

function detectCPanel() {
    return (
        fs.existsSync("/usr/local/cpanel") ||
        fs.existsSync("/var/cpanel") ||
        fs.existsSync("/usr/local/cpanel/bin")
    );
}

function readCPanelUser() {
    const p = "/var/cpanel/userdata";
    if (!fs.existsSync(p)) return null;
    return fs.readdirSync(p);
}

function detectCPanelFeatures() {
    const f = "/var/cpanel/features";
    if (!fs.existsSync(f)) return null;
    return fs.readdirSync(f);
}

function detectCPanelPaths() {
    return {
        cpanelRoot: fs.existsSync("/usr/local/cpanel"),
        userData: fs.existsSync("/var/cpanel/userdata")
    };
}

/* ============================================================
   A137 — PLESK
============================================================ */
import fs from "fs";

export function extractPleskInfo() {
    if (!detectPlesk()) return null;

    return {
        isPlesk: true,
        psaConf: detectPsaConf(),
        domains: detectPleskDomains(),
        components: detectPleskComponents()
    };
}

function detectPlesk() {
    return fs.existsSync("/usr/local/psa");
}

function detectPsaConf() {
    const p = "/etc/psa/psa.conf";
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, "utf8");
}

function detectPleskDomains() {
    const d = "/var/www/vhosts";
    if (!fs.existsSync(d)) return null;
    return fs.readdirSync(d);
}

function detectPleskComponents() {
    const dir = "/usr/local/psa";
    if (!fs.existsSync(dir)) return null;
    return fs.readdirSync(dir);
}

/* ============================================================
   A138 — SHOPIFY HYDROGEN / OXYGEN
============================================================ */
import fs from "fs";

export function extractShopifyHydrogenInfo(env: Record<string, string>) {
    if (!detectShopifyHydrogen(env)) return null;

    return {
        isHydrogen: true,
        shop: env.SHOPIFY_SHOP_DOMAIN ?? null,
        storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION ?? null,
        storefrontToken: !!env.PUBLIC_STOREFRONT_API_TOKEN,
        oxygenDeployment: detectOxygen(env)
    };
}

function detectShopifyHydrogen(env: Record<string, string>) {
    return (
        !!env.PUBLIC_STOREFRONT_API_VERSION ||
        fs.existsSync("hydrogen.config.ts") ||
        fs.existsSync("shopify.config.js")
    );
}

function detectOxygen(env: Record<string, string>) {
    if (env.EDGE_REGION || env.EDGE_LIGHT_STATUS) {
        return {
            isOxygenEdge: true,
            region: env.EDGE_REGION,
            lightStatus: env.EDGE_LIGHT_STATUS
        };
    }
    return null;
}

/* ============================================================
   A139 — DIRECTUS (Self-hosted or Cloud)
============================================================ */
import fs from "fs";

export function extractDirectusInfo(env: Record<string, string>) {
    if (!detectDirectus(env)) return null;

    return {
        isDirectus: true,
        url: env.DIRECTUS_URL ?? null,
        project: env.DIRECTUS_PROJECT ?? null,
        authTokenExists: !!env.DIRECTUS_TOKEN,
        config: readDirectusConfig()
    };
}

function detectDirectus(env: Record<string, string>) {
    return (
        !!env.DIRECTUS_URL ||
        fs.existsSync("./directus.config.js") ||
        fs.existsSync("./.env") && fs.readFileSync(".env", "utf8").includes("DIRECTUS")
    );
}

function readDirectusConfig() {
    const p = "directus.config.js";
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, "utf8");
}

/* ============================================================
   A140 — DATOCMS
============================================================ */
export function extractDatoCMSInfo(env: Record<string, string>) {
    if (!detectDato(env)) return null;

    return {
        isDato: true,
        apiToken: !!env.DATOCMS_API_TOKEN,
        environment: env.DATOCMS_ENVIRONMENT ?? null,
        site: env.DATOCMS_SITE ?? null
    };
}

function detectDato(env: Record<string, string>) {
    return (
        !!env.DATOCMS_API_TOKEN ||
        !!env.DATOCMS_SITE
    );
}

/* ============================================================
   A141 — PAYLOAD CMS
============================================================ */
import fs from "fs";

export function extractPayloadCMSInfo() {
    if (!detectPayload()) return null;

    return {
        isPayload: true,
        config: readPayloadConfig(),
        collections: detectPayloadCollections()
    };
}

function detectPayload() {
    return (
        fs.existsSync("./payload.config.ts") ||
        fs.existsSync("./payload.config.js") ||
        fs.existsSync("src/payload.config.ts")
    );
}

function readPayloadConfig() {
    const files = [
        "payload.config.ts",
        "payload.config.js",
        "src/payload.config.ts"
    ];
    for (const f of files) {
        if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
    }
    return null;
}

function detectPayloadCollections() {
    const d = "./collections";
    if (!fs.existsSync(d)) return null;
    return fs.readdirSync(d);
}

/* ============================================================
   A142 — FORESTRY.IO / TINACMS
============================================================ */
import fs from "fs";

export function extractTinaCMSInfo() {
    if (!detectTina()) return null;

    return {
        isTina: true,
        config: readTinaConfig(),
        schema: readTinaSchema()
    };
}

function detectTina() {
    return (
        fs.existsSync(".tina") ||
        fs.existsSync("tina/config.ts") ||
        fs.existsSync("tina/schema.ts")
    );
}

function readTinaConfig() {
    const f = "tina/config.ts";
    if (!fs.existsSync(f)) return null;
    return fs.readFileSync(f, "utf8");
}

function readTinaSchema() {
    const f = "tina/schema.ts";
    if (!fs.existsSync(f)) return null;
    return fs.readFileSync(f, "utf8");
}

/* ============================================================
   A143 — CONTENTFUL (Headless CMS)
============================================================ */
export function extractContentfulInfo(env: Record<string, string>) {
    if (!detectContentful(env)) return null;

    return {
        isContentful: true,
        space: env.CONTENTFUL_SPACE_ID ?? null,
        env: env.CONTENTFUL_ENVIRONMENT ?? null,
        deliveryTokenExists: !!env.CONTENTFUL_DELIVERY_TOKEN,
        previewTokenExists: !!env.CONTENTFUL_PREVIEW_TOKEN,
        managementTokenExists: !!env.CONTENTFUL_MANAGEMENT_TOKEN
    };
}

function detectContentful(env: Record<string, string>) {
    return (
        !!env.CONTENTFUL_SPACE_ID ||
        !!env.CONTENTFUL_MANAGEMENT_TOKEN ||
        !!env.CONTENTFUL_DELIVERY_TOKEN
    );
}


/* ============================================================
   A144 — PRISMIC (Headless CMS)
============================================================ */
export function extractPrismicInfo(env: Record<string, string>) {
    if (!detectPrismic(env)) return null;

    return {
        isPrismic: true,
        repo: env.PRISMIC_REPOSITORY_NAME ?? null,
        apiEndpoint: env.PRISMIC_API_ENDPOINT ?? null,
        tokenExists: !!env.PRISMIC_ACCESS_TOKEN
    };
}

function detectPrismic(env: Record<string, string>) {
    return (
        !!env.PRISMIC_REPOSITORY_NAME ||
        !!env.PRISMIC_API_ENDPOINT ||
        !!env.PRISMIC_ACCESS_TOKEN
    );
}

