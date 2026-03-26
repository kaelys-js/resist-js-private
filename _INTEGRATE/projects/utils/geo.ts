import { execSync } from "child_process";
import fs from "fs";

function safe(cmd: string) {
    try { return execSync(cmd, { encoding: "utf8" }).trim(); }
    catch { return null; }
}

export async function getGeoInfo() {
    const env = process.env;

    return {
        environment: detectGeoEnvironment(env),
        localSystem: detectLocalSystemGeo(),
        cloudMetadata: await detectCloudProviderGeoMetadata(env),
        container: detectContainerGeo(),
        browser: detectBrowserGeoHints(env),
        network: detectNetworkGeo(),
        localeBased: detectLocaleBasedGeo(env),
        ipGeo: await detectExternalIPGeo(),
    };
}

/* ============================================================
   1. ENVIRONMENT GEO CONTEXT
============================================================ */
function detectGeoEnvironment(env: Record<string, string>) {
    return {
        isCloudflareWorker:
            !!env.CF_REGION ||
            (typeof caches !== "undefined" && typeof WebSocketPair !== "undefined"),
        isVercel: !!env.VERCEL,
        isNetlify: !!env.NETLIFY,
        isAWSLambda: !!env.AWS_REGION,
        isGCP: !!env.GOOGLE_CLOUD_PROJECT || !!env.FUNCTION_REGION,
        isAzure: !!env.WEBSITE_INSTANCE_ID || !!env.FUNCTIONS_WORKER_RUNTIME,
        isFlyIO: !!env.FLY_REGION,
        isDenoDeploy: !!env.DENO_REGION,
        isRender: !!env.RENDER ?? null,
        isRailway: !!env.RAILWAY_ENVIRONMENT ?? null,
        isDocker: fs.existsSync("/.dockerenv"),
        isKubernetes: fs.existsSync("/var/run/secrets/kubernetes.io/serviceaccount"),
        region:
            env.CF_REGION ||
            env.VERCEL_REGION ||
            env.AWS_REGION ||
            env.FUNCTION_REGION ||
            env.FLY_REGION ||
            env.DENO_REGION ||
            null,
    };
}

/* ============================================================
   2. LOCAL SYSTEM GEO (OS SETTINGS)
============================================================ */
function detectLocalSystemGeo() {
    return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
    };
}

/* ============================================================
   3. CLOUD PROVIDER GEO METADATA
============================================================ */
async function detectCloudProviderGeoMetadata(env: Record<string, string>) {
    return {
        cloudflare: extractCloudflareGeo(env),
        vercel: extractVercelGeo(env),
        netlify: extractNetlifyGeo(env),
        aws: extractAWSGeo(env),
        gcp: extractGCPGeo(env),
        azure: extractAzureGeo(env),
        fly: extractFlyGeo(env),
        deno: extractDenoGeo(env),
    };
}

function extractCloudflareGeo(env: Record<string, string>) {
    return env.CF_REGION
        ? {
              region: env.CF_REGION,
              city: env.CF_CITY,
              latitude: env.CF_LATITUDE,
              longitude: env.CF_LONGITUDE,
              country: env.CF_COUNTRY,
          }
        : null;
}

function extractVercelGeo(env: Record<string, string>) {
    return env.VERCEL
        ? {
              region: env.VERCEL_REGION ?? null,
              edge: env.VERCEL_EDGE_FUNCTIONS ?? null,
          }
        : null;
}

function extractNetlifyGeo(env: Record<string, string>) {
    return env.NETLIFY
        ? {
              region: env.NETLIFY_IMAGES_CDN_REGION ?? null,
          }
        : null;
}

function extractAWSGeo(env: Record<string, string>) {
    return env.AWS_REGION
        ? {
              region: env.AWS_REGION,
              functionName: env.AWS_LAMBDA_FUNCTION_NAME ?? null,
          }
        : null;
}

function extractGCPGeo(env: Record<string, string>) {
    return env.FUNCTION_REGION || env.GCP_REGION
        ? {
              region: env.FUNCTION_REGION ?? env.GCP_REGION,
              project: env.GOOGLE_CLOUD_PROJECT ?? null,
          }
        : null;
}

function extractAzureGeo(env: Record<string, string>) {
    return env.WEBSITE_SITE_NAME
        ? {
              region: env.REGION_NAME ?? null,
              site: env.WEBSITE_SITE_NAME ?? null,
          }
        : null;
}

function extractFlyGeo(env: Record<string, string>) {
    return env.FLY_REGION
        ? {
              region: env.FLY_REGION,
          }
        : null;
}

function extractDenoGeo(env: Record<string, string>) {
    return env.DENO_REGION
        ? {
              region: env.DENO_REGION,
          }
        : null;
}

/* ============================================================
   4. CONTAINER GEO HINTS
============================================================ */
function detectContainerGeo() {
    return {
        inDocker: fs.existsSync("/.dockerenv"),
        kubernetesNamespace: fs.existsSync(
            "/var/run/secrets/kubernetes.io/serviceaccount/namespace"
        )
            ? fs.readFileSync(
                  "/var/run/secrets/kubernetes.io/serviceaccount/namespace",
                  "utf8"
              )
            : null,
    };
}

/* ============================================================
   5. BROWSER GEO HINTS (Node env ONLY)
============================================================ */
function detectBrowserGeoHints(env: Record<string, string>) {
    return {
        cloudflareHeaders: {
            city: env.CF_CITY ?? null,
            country: env.CF_COUNTRY ?? null,
            asn: env.CF_ASN ?? null,
        },
        vercelHeaders: {
            city: env.X_VERCEL_IP_CITY ?? null,
            country: env.X_VERCEL_IP_COUNTRY ?? null,
            region: env.X_VERCEL_IP_REGION ?? null,
        },
    };
}

/* ============================================================
   6. NETWORK GEO
     - hostname TLD
     - domain-based region inference
============================================================ */
function detectNetworkGeo() {
    const hostname = safe("hostname");
    const domain = safe("dnsdomainname");

    return {
        hostname,
        domain,
        inferredFromDomain: inferRegionFromTLD(domain),
    };
}

function inferRegionFromTLD(domain: string | null) {
    if (!domain) return null;

    const tld = domain.split(".").pop();

    const map: Record<string, string> = {
        ca: "Canada",
        us: "United States",
        uk: "United Kingdom",
        jp: "Japan",
        au: "Australia",
        de: "Germany",
        fr: "France",
        in: "India",
    };

    return map[tld] ?? null;
}

/* ============================================================
   7. LOCALE-BASED GEO HINTS
============================================================ */
function detectLocaleBasedGeo(env: Record<string, string>) {
    return {
        lang: env.LANG ?? null,
        language: env.LANGUAGE ?? null,
        lcAll: env.LC_ALL ?? null,
        lcMessages: env.LC_MESSAGES ?? null,
    };
}

/* ============================================================
   8. EXTERNAL IP GEO (ANON, NO API KEY)
============================================================ */
async function detectExternalIPGeo() {
    try {
        const https = await import("https");

        const ip = await new Promise<string>((resolve, reject) => {
            https.get("https://api.ipify.org", res => {
                let data = "";
                res.on("data", chunk => (data += chunk));
                res.on("end", () => resolve(data.trim()));
            }).on("error", reject);
        });

        return { ip };
    } catch {
        return null;
    }
}

console.log(await getGeoInfo())