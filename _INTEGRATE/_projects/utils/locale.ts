export function getLocaleInfo() {
    return {
        runtime: detectRuntime(),

        // Primary locale signals
        locale: detectPrimaryLocale(),
        locales: detectAllLocales(),
        timezone: detectTimezone(),
        timezoneOffset: detectTimezoneOffset(),

        // Intl engine & ICU
        intl: detectIntlCapabilities(),
        numbering: detectNumberingSystems(),
        calendars: detectCalendars(),
        rtf: detectRelativeTime(),
        pluralRules: detectPluralRules(),

        // Formatting tests
        sampleFormatting: {
            date: sampleDateFormatting(),
            number: sampleNumberFormatting(),
            currency: sampleCurrencyFormatting(),
        },

        // Unicode support
        unicode: detectUnicodeSupport(),

        // Directionality (RTL/LTR)
        direction: detectDirectionality(),

        // Environment-specific locale hints
        envSignals: detectLocaleEnvSignals(),
    };
}

/* ============================================================
   RUNTIME DETECTION
============================================================ */
function detectRuntime() {
    if (typeof Bun !== "undefined") return "bun";
    if (typeof Deno !== "undefined") return "deno";
    if (typeof window !== "undefined") return "browser";
    if (typeof WebSocketPair !== "undefined" && typeof caches !== "undefined")
        return "cloudflare-worker";
    if (typeof process !== "undefined" && process.versions?.node)
        return "node";
    return "unknown";
}

/* ============================================================
   PRIMARY LOCALE (best guess)
============================================================ */
function detectPrimaryLocale() {
    // Browser
    if (typeof navigator !== "undefined") {
        return navigator.language || navigator.languages?.[0] || null;
    }

    // Node / Bun
    if (typeof process !== "undefined" && process.env) {
        return (
            process.env.LANG ||
            process.env.LANGUAGE ||
            process.env.LC_ALL ||
            process.env.LC_MESSAGES ||
            null
        );
    }

    // Cloudflare Worker
    if (globalThis?.navigator?.languages) {
        return navigator.languages[0];
    }

    return null;
}

/* ============================================================
   ALL LOCALES AVAILABLE
============================================================ */
function detectAllLocales() {
    // Browser
    if (typeof navigator !== "undefined") {
        return navigator.languages || [navigator.language];
    }

    // Node / Bun
    if (process?.env?.LANG) {
        return [process.env.LANG];
    }

    return [];
}

/* ============================================================
   TIMEZONE
============================================================ */
function detectTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    } catch {
        return null;
    }
}

function detectTimezoneOffset() {
    try {
        return new Date().getTimezoneOffset();
    } catch {
        return null;
    }
}

/* ============================================================
   INTL CAPABILITIES (ICU)
============================================================ */
function detectIntlCapabilities() {
    return {
        hasIntl: typeof Intl !== "undefined",
        dateTimeFormat: typeof Intl.DateTimeFormat !== "undefined",
        numberFormat: typeof Intl.NumberFormat !== "undefined",
        collator: typeof Intl.Collator !== "undefined",
        pluralRules: typeof Intl.PluralRules !== "undefined",
        rtf: typeof Intl.RelativeTimeFormat !== "undefined",
        displayNames: typeof Intl.DisplayNames !== "undefined",
        listFormat: typeof Intl.ListFormat !== "undefined",
        segmenter: typeof Intl.Segmenter !== "undefined",
        localeMatcher: Intl?.DateTimeFormat?.supportedLocalesOf?.(["en"]) ? "supported" : "unknown",
    };
}

/* ============================================================
   NUMBERING SYSTEMS
============================================================ */
function detectNumberingSystems() {
    try {
        const fmt = new Intl.NumberFormat();
        const ops = fmt.resolvedOptions();
        return {
            numberingSystem: ops.numberingSystem ?? null,
            currency: ops.currency ?? null,
        };
    } catch {
        return {};
    }
}

/* ============================================================
   CALENDAR SUPPORT
============================================================ */
function detectCalendars() {
    try {
        const opts = Intl.DateTimeFormat().resolvedOptions();
        return {
            calendar: opts.calendar ?? null,
            hour12: opts.hour12 ?? null,
        };
    } catch {
        return {};
    }
}

/* ============================================================
   RELATIVE TIME FORMAT
============================================================ */
function detectRelativeTime() {
    if (!Intl.RelativeTimeFormat) return null;

    try {
        const rtf = new Intl.RelativeTimeFormat();
        return {
            style: rtf.resolvedOptions().style,
            numeric: rtf.resolvedOptions().numeric,
        };
    } catch {
        return null;
    }
}

/* ============================================================
   PLURAL RULES
============================================================ */
function detectPluralRules() {
    if (!Intl.PluralRules) return null;

    try {
        const pr = new Intl.PluralRules();
        return {
            type: pr.resolvedOptions().type,
            categories: pr.resolvedOptions().pluralCategories,
        };
    } catch {
        return null;
    }
}

/* ============================================================
   SAMPLE FORMATTING
============================================================ */
function sampleDateFormatting() {
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
        }).format(new Date());
    } catch {
        return null;
    }
}

function sampleNumberFormatting() {
    try {
        return new Intl.NumberFormat(undefined).format(1234567.89);
    } catch {
        return null;
    }
}

function sampleCurrencyFormatting() {
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "USD",
        }).format(1234.56);
    } catch {
        return null;
    }
}

/* ============================================================
   UNICODE SUPPORT
============================================================ */
function detectUnicodeSupport() {
    return {
        basic: /\p{L}/u.test("A"),
        emoji: /\p{Emoji}/u.test("😀"),
        rtl: /[\u0590-\u08FF]/.test("שלום"),
    };
}

/* ============================================================
   TEXT DIRECTION (RTL/LTR)
============================================================ */
function detectDirectionality() {
    const primary = detectPrimaryLocale();
    if (!primary) return null;

    const rtlLocales = [
        "ar", "he", "fa", "ur", "ps", "sd", "dv", "ha"
    ];

    const short = primary.split("-")[0].toLowerCase();
    return rtlLocales.includes(short) ? "rtl" : "ltr";
}

/* ============================================================
   ENVIRONMENT-BASED LOCALE SIGNALS
============================================================ */
function detectLocaleEnvSignals() {
    const env = typeof process !== "undefined" ? process.env : {};

    return {
        LANG: env?.LANG ?? null,
        LANGUAGE: env?.LANGUAGE ?? null,
        LC_ALL: env?.LC_ALL ?? null,
        LC_MESSAGES: env?.LC_MESSAGES ?? null,
        TZ: env?.TZ ?? null,
    };
}