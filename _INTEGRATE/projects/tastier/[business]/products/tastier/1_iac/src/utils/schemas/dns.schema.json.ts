import {
    parse,
    object,
    strict,
    string,
    number,
    boolean,
    array,
    optional,
    pipe,
    regex,
    picklist,
    minValue,
    maxValue,
    minLength,
    union,
    inferOutput,
} from "valibot";

/* ============================================================
 * Primitives
 * ============================================================ */

const DomainSchema = pipe(
    string(),
    regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Invalid domain")
);

/**
 * Relative DNS name (Cloudflare-style)
 * "" = apex, "www", "_dmarc", "_smtp._tls"
 */
const RelativeNameSchema = pipe(
    string(),
    regex(
        /^(?:$|[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?(?:\.[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?)*)$/i,
        "Invalid relative DNS name"
    )
);

/**
 * Absolute FQDN (no trailing dot)
 */
const FqdnSchema = pipe(
    string(),
    regex(
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
        "Invalid FQDN"
    )
);

const IPv4Schema = pipe(
    string(),
    regex(
        /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/,
        "Invalid IPv4"
    )
);

const IPv6Schema = pipe(
    string(),
    regex(/^[0-9a-f:]+$/i, "Invalid IPv6")
);

const TTLSchema = pipe(number(), minValue(60), maxValue(86400));

const EmailSchema = pipe(
    string(),
    regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email")
);

/* ============================================================
 * DNS Record Intents
 * ============================================================ */

const ARecordSchema = strict(object({
    type: picklist(["A"]),
    name: RelativeNameSchema,
    value: IPv4Schema,
    ttl: TTLSchema,
    proxied: boolean(),
}));

const AAAARecordSchema = strict(object({
    type: picklist(["AAAA"]),
    name: RelativeNameSchema,
    value: IPv6Schema,
    ttl: TTLSchema,
    proxied: boolean(),
}));

const CNAMERecordSchema = strict(object({
    type: picklist(["CNAME"]),
    name: RelativeNameSchema,
    target: pipe(string(), regex(/^[^\s]+$/, "Invalid CNAME target")),
    ttl: TTLSchema,
    proxied: boolean(),
}));

const TXTRecordSchema = strict(object({
    type: picklist(["TXT"]),
    name: RelativeNameSchema,
    value: string(),
    ttl: TTLSchema,
}));

const CAARecordSchema = strict(object({
    type: picklist(["CAA"]),
    name: RelativeNameSchema,
    flag: picklist([0]),
    tag: picklist(["issue", "issuewild", "iodef"]),
    value: string(),
    ttl: TTLSchema,
}));

/* ============================================================
 * Email Intent
 * ============================================================ */

const MXIntentSchema = strict(object({
    priority: pipe(number(), minValue(0), maxValue(65535)),
    host: FqdnSchema,
    ttl: TTLSchema,
}));

const SPFSchema = strict(object({
    includes: array(
        pipe(string(), regex(/^(?:[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?\.)+[a-z]{2,}$/i,
            "Invalid SPF include hostname"))
    ),
    policy: picklist(["~all", "-all"]),
}));

const DKIMSchema = strict(object({
    selector: string(),
    publicKey: pipe(
        string(),
        regex(/^[A-Za-z0-9+/=]+$/, "Invalid DKIM public key")
    ),
}));

const DMARCSchema = strict(object({
    policy: picklist(["none", "quarantine", "reject"]),
    rua: EmailSchema,
    ruf: optional(EmailSchema),
    adkim: picklist(["r", "s"]),
    aspf: picklist(["r", "s"]),
}));

const MTASTSSchema = strict(object({
    enabled: boolean(),
    id: string(),
}));

const TLSRPTSchema = strict(object({
    enabled: boolean(),
    rua: EmailSchema,
}));

/* ============================================================
 * Root Intent + Invariants
 * ============================================================ */

export const CloudflareDnsIntentSchema = pipe(
    strict(object({
        domain: DomainSchema,

        web: strict(object({
            apexIPv4: IPv4Schema,
            apexIPv6: optional(IPv6Schema),
            wwwRedirect: boolean(),
            apiCname: optional(FqdnSchema),
        })),

        email: strict(object({
            mx: pipe(array(MXIntentSchema), minLength(1)),
            spf: optional(SPFSchema),
            dkim: array(DKIMSchema),
            dmarc: optional(DMARCSchema),
            mtaSts: optional(MTASTSSchema),
            tlsRpt: optional(TLSRPTSchema),
        })),

        security: strict(object({
            caa: array(CAARecordSchema),
        })),

        verification: strict(object({
            google: optional(pipe(string(), regex(/^google-site-verification=/))),
            apple: optional(pipe(string(), regex(/^apple-domain-verification=/))),
            microsoft: optional(pipe(string(), regex(/^ms-domain-verification=/))),
        })),

        extras: optional(array(
            union([
                ARecordSchema,
                AAAARecordSchema,
                CNAMERecordSchema,
                TXTRecordSchema,
                CAARecordSchema,
            ])
        )),
    })),

    value => {
        const e = value.email;

        if (e.dmarc && !e.spf) return "DMARC requires SPF";
        if (e.dmarc && e.dkim.length === 0) return "DMARC requires DKIM";
        if (e.mtaSts?.enabled && !e.tlsRpt?.enabled)
            return "MTA-STS requires TLS-RPT";

        const spfCount =
            (e.spf ? 1 : 0) +
            (value.extras?.filter(
                r => r.type === "TXT" && /^\s*v=spf1\b/i.test(r.value)
            ).length ?? 0);

        if (spfCount > 1) return "Multiple SPF records are not allowed";

        const reserved = ["", "_dmarc", "_smtp._tls", "_mta-sts", "_domainkey"];
        for (const r of value.extras ?? []) {
            if (r.type === "CNAME" && r.name === "") {
                return "Apex CNAME records are not allowed";
            }

            if (reserved.some(p => r.name === p || r.name.startsWith(`${p}.`))) {
                return `extras may not define reserved name: ${r.name}`;
            }

            if (["A", "AAAA", "CNAME"].includes(r.type) && r.name.includes("_")) {
                return `${r.type} record names may not contain underscores: ${r.name}`;
            }

            if (r.name.includes(value.domain)) {
                return `extras names must be relative, not absolute: ${r.name}`;
            }
        }

        return true;
    }
);

export type CloudflareDnsIntent =
    inferOutput<typeof CloudflareDnsIntentSchema>;

/* ============================================================
 * Cloudflare API
 * ============================================================ */

const CF_API = "https://api.cloudflare.com/client/v4";
const MANAGED_TAG = "managed-by=dns-intent";

async function cfFetch(path: string, init: RequestInit = {}) {
    const res = await fetch(`${CF_API}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
        },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
        throw new Error(JSON.stringify(json.errors ?? json, null, 2));
    }
    return json;
}

/* ============================================================
 * Desired Record Model
 * ============================================================ */

type DesiredRecord = {
    name: string;
    type: string;
    content: string;
    ttl: number;
    priority?: number;
    proxied?: boolean;
};

/* ============================================================
 * Compile Intent → Records
 * ============================================================ */

function compileIntent(intent: CloudflareDnsIntent): DesiredRecord[] {
    const r: DesiredRecord[] = [];
    const d = intent.domain;

    r.push({ name: d, type: "A", content: intent.web.apexIPv4, ttl: 300, proxied: true });

    if (intent.web.apexIPv6) {
        r.push({ name: d, type: "AAAA", content: intent.web.apexIPv6, ttl: 300, proxied: true });
    }

    if (intent.web.wwwRedirect) {
        r.push({ name: `www.${d}`, type: "CNAME", content: d, ttl: 300, proxied: true });
    }

    if (intent.web.apiCname) {
        r.push({ name: `api.${d}`, type: "CNAME", content: intent.web.apiCname, ttl: 300, proxied: false });
    }

    for (const mx of intent.email.mx) {
        r.push({ name: d, type: "MX", content: mx.host, priority: mx.priority, ttl: mx.ttl, proxied: false });
    }

    if (intent.email.spf) {
        r.push({
            name: d,
            type: "TXT",
            content: `v=spf1 ${intent.email.spf.includes.map(i => `include:${i}`).join(" ")} ${intent.email.spf.policy}`,
            ttl: 300,
            proxied: false,
        });
    }

    for (const dkim of intent.email.dkim) {
        r.push({
            name: `${dkim.selector}._domainkey.${d}`,
            type: "TXT",
            content: `v=DKIM1; k=rsa; p=${dkim.publicKey}`,
            ttl: 300,
            proxied: false,
        });
    }

    if (intent.email.dmarc) {
        r.push({
            name: `_dmarc.${d}`,
            type: "TXT",
            content: `v=DMARC1; p=${intent.email.dmarc.policy}; rua=mailto:${intent.email.dmarc.rua}; adkim=${intent.email.dmarc.adkim}; aspf=${intent.email.dmarc.aspf}`,
            ttl: 300,
            proxied: false,
        });
    }

    if (intent.email.mtaSts?.enabled) {
        r.push({
            name: `_mta-sts.${d}`,
            type: "TXT",
            content: `v=STSv1; id=${intent.email.mtaSts.id}`,
            ttl: 300,
            proxied: false,
        });
    }

    if (intent.email.tlsRpt?.enabled) {
        r.push({
            name: `_smtp._tls.${d}`,
            type: "TXT",
            content: `v=TLSRPTv1; rua=mailto:${intent.email.tlsRpt.rua}`,
            ttl: 300,
            proxied: false,
        });
    }

    for (const caa of intent.security.caa) {
        r.push({
            name: d,
            type: "CAA",
            content: `${caa.flag} ${caa.tag} "${caa.value}"`,
            ttl: caa.ttl,
            proxied: false,
        });
    }

    if (intent.verification.google) r.push({ name: d, type: "TXT", content: intent.verification.google, ttl: 300, proxied: false });
    if (intent.verification.apple) r.push({ name: d, type: "TXT", content: intent.verification.apple, ttl: 300, proxied: false });
    if (intent.verification.microsoft) r.push({ name: d, type: "TXT", content: intent.verification.microsoft, ttl: 300, proxied: false });

    if (intent.extras) {
        for (const e of intent.extras) {
            r.push({
                name: e.name ? `${e.name}.${d}` : d,
                type: e.type,
                content: (e as any).value ?? (e as any).target,
                ttl: e.ttl,
                proxied: ["A", "AAAA", "CNAME"].includes(e.type)
                    ? Boolean((e as any).proxied)
                    : false,
            });
        }
    }

    return r;
}

/* ============================================================
 * Pagination-aware fetch
 * ============================================================ */

async function fetchAllRecords(zoneId: string) {
    const out: any[] = [];
    let page = 1;

    while (true) {
        const res = await cfFetch(`/zones/${zoneId}/dns_records?page=${page}&per_page=100`);
        out.push(...res.result);
        if (!res.result_info || page >= res.result_info.total_pages) break;
        page++;
    }

    return out;
}

/* ============================================================
 * Reconciliation
 * ============================================================ */

function recordIdentity(r: { name: string; type: string; content: string; priority?: number }) {
    if (r.type === "TXT" || r.type === "CAA") return `${r.name}|${r.type}|${r.content}`;
    if (r.type === "CNAME") return `${r.name}|CNAME`;
    return `${r.name}|${r.type}|${r.priority ?? ""}`;
}

const MAIL_TXT_PREFIXES = ["v=spf1", "v=DKIM1", "v=DMARC1", "v=STSv1", "v=TLSRPTv1"];

export async function reconcileCloudflareDns(rawIntent: unknown) {
    const intent = parse(CloudflareDnsIntentSchema, rawIntent);

    const zoneId = process.env.CLOUDFLARE_ZONE_ID!;
    const dryRun = process.env.DNS_DRY_RUN === "1";
    const authoritative = process.env.DNS_AUTHORITATIVE === "1";
    const allowMailDeletes = process.env.DNS_ALLOW_MAIL_DELETES === "1";

    const desired = compileIntent(intent);
    const desiredById = new Map(desired.map(r => [recordIdentity(r), r]));

    const existing = await fetchAllRecords(zoneId);

    for (const r of existing) {
        if (r.comment !== MANAGED_TAG && desiredById.has(recordIdentity(r))) {
            throw new Error(`Unmanaged record collision: ${r.name} ${r.type}`);
        }
    }

    const managed = existing.filter(r => r.comment === MANAGED_TAG);
    const existingById = new Map(managed.map(r => [recordIdentity(r), r]));

    const toCreate = desired.filter(r => !existingById.has(recordIdentity(r)));
    const toUpdate = desired.filter(r => {
        const e = existingById.get(recordIdentity(r));
        return e && (e.ttl !== r.ttl || e.proxied !== r.proxied || e.content !== r.content);
    });

    const toDelete = authoritative
        ? managed.filter(r => {
            if (desiredById.has(recordIdentity(r))) return false;
            if (r.name === intent.domain && (r.type === "A" || r.type === "AAAA")) return false;
            if (r.type === "TXT" && MAIL_TXT_PREFIXES.some(p => r.content.startsWith(p)) && !allowMailDeletes) return false;
            if (r.name.startsWith("_acme-challenge")) return false;
            return true;
        })
        : [];

    if (toDelete.length > 10 && !process.env.DNS_FORCE_DELETE) {
        throw new Error(`Refusing to delete ${toDelete.length} records without DNS_FORCE_DELETE=1`);
    }

    if (dryRun) {
        console.log("DRY RUN");
        console.log("Create:", toCreate);
        console.log("Update:", toUpdate.map(r => r.name));
        console.log("Delete:", toDelete.map(r => r.name));
        return;
    }

    for (const r of toCreate) {
        await cfFetch(`/zones/${zoneId}/dns_records`, {
            method: "POST",
            body: JSON.stringify({ ...r, comment: MANAGED_TAG }),
        });
    }

    for (const r of toUpdate) {
        const e = existingById.get(recordIdentity(r))!;
        await cfFetch(`/zones/${zoneId}/dns_records/${e.id}`, {
            method: "PUT",
            body: JSON.stringify({ ...r, comment: MANAGED_TAG }),
        });
    }

    for (const r of toDelete) {
        await cfFetch(`/zones/${zoneId}/dns_records/${r.id}`, { method: "DELETE" });
    }
}

// TODO: verify records post-fact