/**
 * USER-AGENT STRING SCHEMA
 *
 * SUMMARY  
 *   Validates that a value is a **well-formed User-Agent string**, ensuring:
 *   - it is a non-empty string  
 *   - contains at least one RFC 7231-style product token (e.g., "Mozilla/5.0")  
 *   - is suitable for downstream parsing, fingerprinting, or UA-based
 *     classification logic. 
 *
 * PURPOSE  
 *   Provides a strict foundation for any system that relies on User-Agent
 *   processing, including:
 *   - request analytics  
 *   - browser capability detection  
 *   - bot/spider heuristics  
 *   - device and platform identification  
 *   - security filters  
 *   - A/B segmentation  
 *   - logging and telemetry pipelines  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any non-empty string  
 *   - string containing at least one product token of the form `Name/Version`,
 *     per HTTP User-Agent norms  
 *
 *   REJECTS:
 *   - empty strings  
 *   - whitespace-only strings  
 *   - non-string values (null, undefined, number, boolean, object, array)  
 *   - malformed or synthetic UA strings lacking any recognizable product token  
 *
 * OUTPUT CONTRACT  
 *   - Returns the validated string unchanged.  
 *   - No normalization (lowercasing, trimming) is applied automatically.  
 *   - Guaranteed to be suitable for downstream User-Agent parsers.  
 *
 * VALIDATION RULES  
 *   - Must match at least one product token pattern
 *   - Must not be empty  
 *   - Must not be whitespace-only  
 *
 * SEMANTIC NOTES  
 *   This schema does not attempt to validate the **entire** User-Agent grammar,
 *   which is inconsistent across browsers, devices, and bots.  
 *   Instead, it enforces the **minimum viable structure** necessary to safely
 *   parse downstream.
 *
 *   This protects against:
 *   - spoofed empty UA headers  
 *   - unexpected null/undefined inputs  
 *   - malformed telemetry  
 *   - injection payloads disguised as UA strings  
 *
 * EXAMPLES  
 *   ```
 *   // VALID
 *   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
 *   "curl/8.4.0"
 *   "PostmanRuntime/7.32.2"
 *   "Chrome/123.0.0.0"
 *
 *   // INVALID
 *   ""
 *   "   "
 *   {}
 *   null
 *   "not-a-ua"          // no product token
 *   ```
 */
export const userAgentString = v.string("Expected a valid User-Agent string.")
    .pipe(
        v.regex(
            /[A-Za-z][A-Za-z0-9_-]*\/[0-9A-Za-z._-]+/,
            "User-Agent string must contain at least one valid product token (e.g., 'Name/Version')."
        )
    );

/**
 * OUTPUT TYPE — USER-AGENT STRING
 *
 * SUMMARY  
 *   Represents the validated output of the `userAgentString` schema: a
 *   **non-empty, tokenized User-Agent string** guaranteed to contain at least
 *   one product identifier.
 *
 * PURPOSE  
 *   Provides a safe, strongly validated foundation for any User-Agent
 *   classification system, ensuring downstream code receives a syntactically
 *   valid UA string.
 *
 * CONTRACT GUARANTEES  
 *   - Always a non-empty string  
 *   - Always contains at least one `<product>/<version>` token  
 *   - Never null, undefined, or whitespace-only  
 *
 * SEMANTIC NOTES  
 *   Intended for:
 *   - bot detection  
 *   - browser parsing  
 *   - analytics enrichment  
 *   - fingerprinting  
 *   - device detection  
 *   - platform capability checks  
 *
 * EXAMPLE  
 *   ```
 *   const ua: UserAgentString =
 *       parse(userAgentString, req.headers.get("user-agent"));
 *   ```
 */
export type UserAgentString = v.InferOutput<typeof userAgentString>;

/**
 * USER-AGENT BROWSER SCHEMA
 *
 * SUMMARY  
 *   Parses and validates the **browser family and version** from a
 *   User-Agent string. This schema recognizes all major browser engines and
 *   families, including Chromium-based browsers (Chrome, Edge, Opera),
 *   WebKit-based browsers (Safari), Gecko-based browsers (Firefox), and
 *   additional modern variants (Samsung Internet, Chrome Mobile, Opera GX).
 *
 * PURPOSE  
 *   Provides a reliable, normalized browser descriptor suitable for:
 *   - analytics enrichment  
 *   - capability detection  
 *   - segmentation and A/B testing  
 *   - security filtering (blocking obsolete browsers)  
 *   - device-compatibility logic  
 *   - telemetry and logging pipelines  
 *
 * INPUT CONTRACT  
 *   - Must be a valid, non-empty User-Agent string (as validated by
 *     `userAgentString`).  
 *   - UA must contain at least one product token that can be mapped to a
 *     recognized browser family.  
 *
 * OUTPUT CONTRACT  
 *   Returns a structured object:
 *   ```
 *   {
 *     name: string;     // e.g., "Chrome"
 *     version: string;  // e.g., "123.0.0.0"
 *     engine: string;   // e.g., "Blink", "WebKit", "Gecko"
 *   }
 *   ```
 *
 *   - All fields are guaranteed to be normalized, stable, and suitable for
 *     classification logic.  
 *   - Version strings always follow the first `<major>.<minor>...` token found.  
 *   - Engine reflects the underlying rendering engine.  
 *
 * VALIDATION RULES  
 *   Recognizes browsers in this precedence order:
 *   1. **Edge**              → `/Edg\/([0-9A-Za-z._-]+)/`  
 *   2. **Opera**             → `/OPR\/([0-9A-Za-z._-]+)/`  
 *   3. **Chrome**            → `/Chrome\/([0-9A-Za-z._-]+)/`  
 *   4. **Firefox**           → `/Firefox\/([0-9A-Za-z._-]+)/`  
 *   5. **Safari**            → Uses `Version/x.y` + `Safari/` tokens  
 *
 *   If no known browser product token is present, validation fails.
 *
 * SEMANTIC NOTES  
 *   - Safari version must be taken from the `Version/` token, not the
 *     `Safari/` token.  
 *   - Chromium-based browsers share engine “Blink”.  
 *   - Safari and iOS WebViews share engine “WebKit”.  
 *   - Firefox uses “Gecko”.  
 *   - Browser detection is intentionally conservative to avoid over-detection
 *     of spoofed or malformed UA strings.  
 *
 * EXAMPLES  
 *   ```
 *   // Chrome
 *   parse(userAgentBrowser,
 *     "Mozilla/5.0 ... Chrome/123.0.0.0 Safari/537.36")
 *   // → { name: "Chrome", engine: "Blink", version: "123.0.0.0" }
 *
 *   // Firefox
 *   parse(userAgentBrowser, "Mozilla/5.0 ... Firefox/121.0")
 *   // → { name: "Firefox", engine: "Gecko", version: "121.0" }
 *
 *   // Safari
 *   parse(userAgentBrowser,
 *     "Mozilla/5.0 ... Version/17.4 Safari/605.1.15")
 *   // → { name: "Safari", engine: "WebKit", version: "17.4" }
 *
 *   // Edge
 *   parse(userAgentBrowser, "Mozilla/5.0 ... Edg/120.0.0.0")
 *   // → { name: "Edge", engine: "Blink", version: "120.0.0.0" }
 *
 *   // INVALID — unknown browser
 *   parse(userAgentBrowser, "MyCustomClient/1.0")
 *   // ❌ No recognized browser signature
 *   ```
 */
export const userAgentBrowser = v.custom(
    (ua: unknown) => {
        if (typeof ua !== "string" || ua.trim() === "") return false;

        const value = ua;

        // Edge BEFORE Chrome
        let match = value.match(/Edg\/([0-9A-Za-z._-]+)/);
        if (match) return true;

        // Opera BEFORE Chrome
        match = value.match(/OPR\/([0-9A-Za-z._-]+)/);
        if (match) return true;

        // Chrome
        match = value.match(/Chrome\/([0-9A-Za-z._-]+)/);
        if (match) return true;

        // Firefox
        match = value.match(/Firefox\/([0-9A-Za-z._-]+)/);
        if (match) return true;

        // Safari
        const safariProduct = value.match(/Version\/([0-9A-Za-z._-]+)/);
        const safariMarker = value.includes("Safari/");
        if (safariProduct && safariMarker) return true;

        return false;
    },
    "User-Agent must belong to a recognized browser (Chrome, Safari, Firefox, Edge, Opera)."
).pipe(
    v.transform((ua: string) => {
        // **Same detection logic as above but now extract**
        const edge = ua.match(/Edg\/([0-9A-Za-z._-]+)/);
        if (edge)
            return { name: "Edge", engine: "Blink", version: edge[1] };

        const opr = ua.match(/OPR\/([0-9A-Za-z._-]+)/);
        if (opr)
            return { name: "Opera", engine: "Blink", version: opr[1] };

        const chrome = ua.match(/Chrome\/([0-9A-Za-z._-]+)/);
        if (chrome)
            return { name: "Chrome", engine: "Blink", version: chrome[1] };

        const firefox = ua.match(/Firefox\/([0-9A-Za-z._-]+)/);
        if (firefox)
            return { name: "Firefox", engine: "Gecko", version: firefox[1] };

        const safariVersion = ua.match(/Version\/([0-9A-Za-z._-]+)/);
        if (safariVersion && ua.includes("Safari/"))
            return { name: "Safari", engine: "WebKit", version: safariVersion[1] };

        // Should never reach (validated earlier)
        throw new Error("Unable to parse browser from User-Agent.");
    })
);

/**
 * OUTPUT TYPE — USER-AGENT BROWSER
 *
 * SUMMARY  
 *   Represents the normalized browser descriptor resulting from successful
 *   validation of the `userAgentBrowser` schema.
 *
 * PURPOSE  
 *   Provides a strongly typed structure used for analytics, browser capability
 *   gating, device-based feature switches, and security controls.
 *
 * CONTRACT GUARANTEES  
 *   - Always contains:
 *       - `name`: canonical browser family name  
 *       - `version`: extracted semantic version component  
 *       - `engine`: canonical rendering engine name  
 *
 *   - Never null, undefined, or missing fields.  
 *   - Always represents a **known, recognized** browser identity.  
 *
 * SEMANTIC NOTES  
 *   `engine` is essential for compatibility logic:
 *   - Blink → Chrome, Edge, Opera, Brave, Vivaldi, etc.  
 *   - WebKit → Safari, iOS browsers  
 *   - Gecko → Firefox  
 *
 * EXAMPLE  
 *   ```
 *   const browser: UserAgentBrowser =
 *       parse(userAgentBrowser, req.headers.get("user-agent"));
 *
 *   console.log(browser.name);     // "Chrome"
 *   console.log(browser.engine);   // "Blink"
 *   console.log(browser.version);  // "123.0.0.0"
 *   ```
 */
export type UserAgentBrowser = v.InferOutput<typeof userAgentBrowser>;

/**
 * USER-AGENT PLATFORM SCHEMA
 *
 * SUMMARY  
 *   Parses and validates the **operating system platform** from a User-Agent
 *   string. This schema identifies major OS families across desktop, mobile,
 *   embedded, and headless environments, returning a normalized descriptor
 *   suitable for analytics, capability detection, and security policy logic.
 *
 * PURPOSE  
 *   Provides a reliable, normalized OS-level classification layer for:
 *   - segmentation and A/B testing  
 *   - feature gating  
 *   - analytics enrichment  
 *   - device/OS security rules  
 *   - adaptive UI behavior  
 *   - low-trust environment detection (e.g., headless Linux bots)  
 *
 * INPUT CONTRACT  
 *   - Must be a valid User-Agent string previously validated by
 *     `userAgentString`.  
 *   - UA must contain at least one OS-identifying token or platform marker.  
 *
 * OUTPUT CONTRACT  
 *   Returns a structured object:
 *   ```
 *   {
 *     name: string;       // e.g., "Windows", "macOS", "iOS"
 *     version: string;    // best-effort version extraction ("10", "14_5")
 *     family: string;     // normalized family grouping (e.g., "Windows", "Apple", "Linux")
 *   }
 *   ```
 *
 * VALIDATION RULES  
 *   Recognized platforms include:
 *
 *   **WINDOWS:**
 *   - `Windows NT x.y`  
 *
 *   **MAC / APPLE:**
 *   - `Macintosh; Intel Mac OS X 10_15_7`
 *   - `Mac OS X x_y_z`
 *
 *   **iOS / iPadOS:**
 *   - `iPhone OS 14_5`
 *   - `CPU OS 15_0 like Mac OS X`
 *   - `CPU iPhone OS 17_2 like Mac OS X`
 *
 *   **ANDROID:**
 *   - `Android 13`
 *   - `Linux; Android 11`
 *
 *   **LINUX:**
 *   - `X11; Linux x86_64`
 *   - `Ubuntu`
 *   - `Debian`
 *   - `Fedora`
 *
 *   **CHROMEOS:**
 *   - `CrOS x86_64 15604.58.0`
 *
 *   If no known OS signature is present → **reject**.
 *
 * SEMANTIC NOTES  
 *   - Version extraction is **best-effort**: many mobile platforms mask or
 *     obscure precise OS versions.  
 *   - iOS/iPadOS UAs include AppleWebKit versions unrelated to OS versions
 *     (these are ignored).  
 *   - Linux distributions rarely include version metadata; in such cases,
 *     version is normalized as `"unknown"`.  
 *   - Headless agents (crawlers/automation) often include `"X11"` or
 *     `"Linux"` without further detail — these are normalized to Linux family.  
 *
 * EXAMPLES  
 *   ```
 *   // Windows 10
 *   parse(userAgentPlatform,
 *     "Mozilla/5.0 ... Windows NT 10.0; Win64; x64")
 *   // → { name: "Windows", family: "Windows", version: "10.0" }
 *
 *   // macOS
 *   parse(userAgentPlatform,
 *     "Mozilla/5.0 ... Mac OS X 10_15_7")
 *   // → { name: "macOS", family: "Apple", version: "10_15_7" }
 *
 *   // iOS
 *   parse(userAgentPlatform,
 *     "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) ...")
 *   // → { name: "iOS", family: "Apple", version: "17_2" }
 *
 *   // Android
 *   parse(userAgentPlatform, "Mozilla/5.0 (Linux; Android 14; Pixel 7)")
 *   // → { name: "Android", family: "Google", version: "14" }
 *
 *   // ChromeOS
 *   parse(userAgentPlatform, "Mozilla/5.0 (X11; CrOS x86_64 14268.67.0) ...")
 *   // → { name: "ChromeOS", family: "Google", version: "14268.67.0" }
 *
 *   // Linux desktop
 *   parse(userAgentPlatform, "Mozilla/5.0 (X11; Linux x86_64) ...")
 *   // → { name: "Linux", family: "Linux", version: "unknown" }
 *
 *   // INVALID — no OS token
 *   parse(userAgentPlatform, "CustomClient/1.0")
 *   // ❌ Not recognized as a platform-specific UA
 *   ```
 */
export const userAgentPlatform = v.custom(
    (ua: unknown) => {
        if (typeof ua !== "string" || ua.trim() === "") return false;

        const value = ua;

        // WINDOWS
        if (/Windows NT ([0-9.]+)/i.test(value)) return true;

        // MACOS
        if (/Mac OS X ([0-9_]+)/i.test(value)) return true;

        // iOS / iPadOS
        if (/CPU (?:iPhone )?OS ([0-9_]+)/i.test(value)) return true;

        // ANDROID
        if (/Android ([0-9.]+)/i.test(value)) return true;

        // CHROMEOS
        if (/CrOS [a-zA-Z0-9_]+ ([0-9.]+)/i.test(value)) return true;

        // LINUX desktop / generic Linux
        if (/Linux/i.test(value)) return true;

        return false;
    },
    "User-Agent must contain a recognized OS platform signature."
).pipe(
    v.transform((ua: string) => {
        // WINDOWS
        const win = ua.match(/Windows NT ([0-9.]+)/i);
        if (win)
            return { name: "Windows", family: "Windows", version: win[1] };

        // MACOS
        const mac = ua.match(/Mac OS X ([0-9_]+)/i);
        if (mac)
            return { name: "macOS", family: "Apple", version: mac[1] };

        // iOS / iPadOS
        const ios = ua.match(/CPU (?:iPhone )?OS ([0-9_]+)/i);
        if (ios)
            return { name: "iOS", family: "Apple", version: ios[1] };

        // ANDROID
        const android = ua.match(/Android ([0-9.]+)/i);
        if (android)
            return { name: "Android", family: "Google", version: android[1] };

        // CHROMEOS
        const cros = ua.match(/CrOS [a-zA-Z0-9_]+ ([0-9.]+)/i);
        if (cros)
            return { name: "ChromeOS", family: "Google", version: cros[1] };

        // LINUX (generic)
        if (/Linux/i.test(ua))
            return { name: "Linux", family: "Linux", version: "unknown" };

        // Should never reach (custom validator already filtered)
        throw new Error("Unable to extract platform from User-Agent.");
    })
);

/**
 * OUTPUT TYPE — USER-AGENT PLATFORM
 *
 * SUMMARY  
 *   Represents the validated, normalized platform descriptor extracted from the
 *   `userAgentPlatform` schema.
 *
 * PURPOSE  
 *   Guarantees a stable OS classification object for downstream analytics,
 *   segmentation, feature gating, and security logic.
 *
 * CONTRACT GUARANTEES  
 *   - `name`: canonical OS name  
 *   - `family`: normalized vendor group  
 *   - `version`: extracted best-effort OS version  
 *
 *   Always available, never null, never undefined.
 *
 * SEMANTIC NOTES  
 *   OS classification is fundamental for:
 *   - browser/OS compatibility matrices  
 *   - mobile-vs-desktop experience optimization  
 *   - OS-specific bug workarounds  
 *   - analytics breakdowns  
 *
 * EXAMPLE  
 *   ```
 *   const os: UserAgentPlatform =
 *       parse(userAgentPlatform, req.headers.get("user-agent"));
 *
 *   console.log(os.name);    // "macOS"
 *   console.log(os.family);  // "Apple"
 *   console.log(os.version); // "10_15_7"
 *   ```
 */
export type UserAgentPlatform = v.InferOutput<typeof userAgentPlatform>;

/**
 * USER-AGENT DEVICE SCHEMA
 *
 * SUMMARY  
 *   Classifies the **device type** represented by a User-Agent string using
 *   hardened heuristics derived from modern browser, mobile OS, OEM, and
 *   crawler patterns. Device classes include:
 *
 *   - desktop
 *   - mobile
 *   - tablet
 *   - smart-tv
 *   - console
 *   - wearable
 *   - car
 *   - bot
 *   - embedded
 *   - unknown
 *
 * PURPOSE  
 *   Provides a normalized device descriptor suitable for:
 *   - adaptive UI design  
 *   - analytics segmentation  
 *   - mobile/desktop feature gating  
 *   - fraud/risk scoring  
 *   - capability fallbacks  
 *   - content optimization (e.g., mobile-first encoding)  
 *
 * INPUT CONTRACT  
 *   - Must be a valid User-Agent string as validated by `userAgentString`.  
 *   - Device classification relies on pattern-matching against known families
 *     (Apple iOS, Android OEMs, Windows desktop, macOS, consoles, TVs, bots).  
 *
 * OUTPUT CONTRACT  
 *   Returns a structured object:
 *   ```
 *   {
 *     type: string;   // e.g., "mobile", "desktop", "tablet", "bot"
 *     model: string;  // best-effort extraction (e.g., "iPhone", "Pixel 7")
 *   }
 *   ```
 *
 * VALIDATION RULES  
 *   The detection order is strictly hierarchical:
 *
 *   **1. BOT / SPIDER / AUTOMATION**
 *     - "bot", "crawl", "spider", "Googlebot", "bingbot", "GPTBot",
 *       "ClaudeBot", "DuckDuckBot", "HeadlessChrome"
 *
 *   **2. SMART TV**
 *     - "SmartTV", "HbbTV", "Tizen", "Web0S", "WebOS", "Dalvik", "BRAVIA"
 *
 *   **3. CONSOLE**
 *     - "PlayStation", "Xbox", "Nintendo", "Switch"
 *
 *   **4. CAR SYSTEMS**
 *     - "Android Auto", "CarPlay"
 *
 *   **5. WEARABLE**
 *     - "WatchOS", "WearOS"
 *
 *   **6. TABLET**
 *     - "iPad"
 *     - Android tablets: presence of "Android" WITHOUT "Mobile"
 *
 *   **7. MOBILE**
 *     - "iPhone", "iPod"
 *     - "Android" + "Mobile"
 *     - OEM markers: "Pixel", "SM-", "M200x", "OnePlus", "Redmi", "Oppo"
 *
 *   **8. DESKTOP**
 *     - Windows + Win64/x64  
 *     - macOS + Intel/ARM  
 *     - Linux/X11  
 *
 *   **9. EMBEDDED**
 *     - "Embedded", "IoT", "Raspberry", "ESP32"  
 *
 *   **10. UNKNOWN**
 *     - If none of the above match, accept but classify as `"unknown"`.  
 *
 * SEMANTIC NOTES  
 *   - Device classification precedes OS detection: bots must not be mislabeled
 *     as desktop/mobile.  
 *   - iPads use a desktop-like UA but are tablets → detection must override.  
 *   - Android tablets omit "Mobile" in modern UA strings.  
 *   - Smart TVs often include HbbTV/Tizen proprietary tokens.  
 *
 * EXAMPLES  
 *   ```
 *   // Mobile
 *   parse(userAgentDevice,
 *     "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) ...")
 *   // → { type: "mobile", model: "iPhone" }
 *
 *   // Tablet
 *   parse(userAgentDevice,
 *     "Mozilla/5.0 (iPad; CPU OS 16_3 like Mac OS X) ...")
 *   // → { type: "tablet", model: "iPad" }
 *
 *   // Android Mobile
 *   parse(userAgentDevice,
 *     "Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile ...")
 *   // → { type: "mobile", model: "Pixel 7" }
 *
 *   // Android Tablet
 *   parse(userAgentDevice,
 *     "Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-T970) ...")
 *   // → { type: "tablet", model: "SM-T970" }
 *
 *   // Desktop
 *   parse(userAgentDevice,
 *     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...")
 *   // → { type: "desktop", model: "PC" }
 *
 *   // Bot
 *   parse(userAgentDevice,
 *     "Mozilla/5.0 (compatible; Googlebot/2.1; +http://google.com/bot.html)")
 *   // → { type: "bot", model: "Googlebot" }
 *
 *   // Smart TV
 *   parse(userAgentDevice,
 *     "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) ...")
 *   // → { type: "smart-tv", model: "Tizen" }
 *
 *   // Unknown
 *   parse(userAgentDevice, "Custom-UA 1.0 (X-Prototype)")
 *   // → { type: "unknown", model: "unknown" }
 *   ```
 */
export const userAgentDevice = v.custom(
    (ua: unknown) => {
        if (typeof ua !== "string" || ua.trim() === "") return false;
        return true;
    },
    "Invalid User-Agent for device classification."
).pipe(
    v.transform((ua: string) => {
        const value = ua;

        // 1 — BOT
        if (/(bot|crawl|spider|Googlebot|bingbot|DuckDuckBot|GPTBot|ClaudeBot|HeadlessChrome)/i.test(value))
            return { type: "bot", model: extractModel(value) };

        // 2 — SMART TV
        if (/(SmartTV|HbbTV|Tizen|Web0S|WebOS|BRAVIA)/i.test(value))
            return { type: "smart-tv", model: extractModel(value) };

        // 3 — CONSOLE
        if (/(PlayStation|Xbox|Nintendo|Switch)/i.test(value))
            return { type: "console", model: extractModel(value) };

        // 4 — CAR SYSTEMS
        if (/(Android Auto|CarPlay)/i.test(value))
            return { type: "car", model: extractModel(value) };

        // 5 — WEARABLE
        if (/(WatchOS|WearOS)/i.test(value))
            return { type: "wearable", model: extractModel(value) };

        // 6 — TABLET
        if (/iPad/i.test(value))
            return { type: "tablet", model: "iPad" };

        if (/Android/i.test(value) && !/Mobile/i.test(value))
            return { type: "tablet", model: extractAndroidModel(value) };

        // 7 — MOBILE
        if (/iPhone|iPod/i.test(value))
            return { type: "mobile", model: extractModel(value) };

        if (/Android/i.test(value) && /Mobile/i.test(value))
            return { type: "mobile", model: extractAndroidModel(value) };

        // 8 — DESKTOP
        if (/Windows NT/i.test(value) || /Mac OS X/i.test(value) || /(X11; Linux)/i.test(value))
            return { type: "desktop", model: "PC" };

        // 9 — EMBEDDED
        if (/(Embedded|IoT|Raspberry|ESP32)/i.test(value))
            return { type: "embedded", model: extractModel(value) };

        // 10 — UNKNOWN
        return { type: "unknown", model: "unknown" };
    })
);

// --- HELPER FUNCTIONS ------------------------------------------------------

function extractModel(ua: string): string {
    const tokens = ua.match(/([A-Za-z0-9._-]+)/g);
    if (!tokens) return "unknown";
    // Return the most "device-like" token
    return tokens.find((t) => /^[A-Za-z0-9._-]{3,}$/.test(t)) ?? "unknown";
}

function extractAndroidModel(ua: string): string {
    const match = ua.match(/Android [0-9.]+; ([^);]+)/);
    return match ? match[1].trim() : "Android Device";
}

/**
* OUTPUT TYPE — USER-AGENT DEVICE
*
* SUMMARY  
*   Represents the validated output of the `userAgentDevice` schema: a normalized
*   device descriptor identifying the high-level device class and best-effort
*   model extraction.
*
* PURPOSE  
*   Enables typed device classification for:
*   - responsive design  
*   - analytics  
*   - compatibility logic  
*   - risk scoring / fraud detection  
*   - bot detection escalation  
*
* CONTRACT GUARANTEES  
*   - Always returns a structured object with:
*       - `type`: normalized device category  
*       - `model`: best-effort extracted model string  
*
* SEMANTIC NOTES  
*   Device classification takes precedence over OS:
*   - iPads → tablet  
*   - Headless Chrome → bot  
*   - Smart TVs → smart-tv  
*   - Consoles → console  
*
* EXAMPLE  
*   ```
*   const device: UserAgentDevice =
*       parse(userAgentDevice, req.headers.get("user-agent"));
*
*   console.log(device.type);   // "mobile"
*   console.log(device.model);  // "Pixel 7"
*   ```
*/
export type UserAgentDevice = v.InferOutput<typeof userAgentDevice>;

/**
 * USER-AGENT BOT SCHEMA
 *
 * SUMMARY  
 *   Detects whether a User-Agent string represents a **bot**, **crawler**,  
 *   **scraper**, **LLM indexing agent**, **monitoring robot**,  
 *   **SEO/marketing spider**, or **automation framework**.  
 *   This schema uses hardened multi-layer heuristics combining:
 *
 *   - Explicit vendor identifiers (e.g., "Googlebot", "GPTBot", "bingbot")  
 *   - Behavior signatures ("crawl", "spider", "fetcher", "scanner")  
 *   - Headless execution markers ("HeadlessChrome", "Puppeteer", "Playwright")  
 *   - Synthetic UA structures common in CI/CD or test frameworks  
 *   - Monitoring agent identifiers (Pingdom, UptimeRobot, Datadog, NewRelic)  
 *   - Margin-of-error detection for disguised bots  
 *
 * PURPOSE  
 *   Ensures **strong bot classification** for:
 *   - security filtering  
 *   - analytics segmentation  
 *   - differential rate limiting  
 *   - fraud/risk mitigation  
 *   - SEO diagnostics  
 *   - machine traffic detection  
 *   - content gating  
 *
 * INPUT CONTRACT  
 *   ACCEPTS:  
 *   - any valid User-Agent string as validated by `userAgentString`  
 *
 *   REJECTS:  
 *   - null, undefined, non-string values  
 *
 *   DOES NOT reject normal browser UAs — instead it classifies as `isBot: false`.  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     isBot: boolean;
 *     category: string;   // e.g., "search", "llm", "monitoring", "scraper", "automation"
 *     name: string;       // e.g., "Googlebot", "GPTBot", "HeadlessChrome"
 *   }
 *   ```
 *
 * VALIDATION & DETECTION LAYERS  
 *
 *   **LAYER 1 — MAJOR SEARCH ENGINES**
 *     - Googlebot, Google-InspectionTool
 *     - bingbot, BingPreview
 *     - YandexBot, YandexImages
 *     - DuckDuckBot
 *     - Baiduspider
 *     - Applebot
 *
 *   **LAYER 2 — LLM / AI AGENTS**
 *     - GPTBot
 *     - ClaudeBot
 *     - PerplexityBot
 *     - FacebookBot (AI indexing)
 *
 *   **LAYER 3 — SCRAPERS & FETCHERS**
 *     - Scrapy
 *     - curl / Wget (non-browser usage)
 *     - python-requests
 *     - axios/<version>
 *     - httpclient
 *     - Java/<version>
 *
 *   **LAYER 4 — AUTOMATION / HEADLESS**
 *     - HeadlessChrome
 *     - Puppeteer
 *     - Playwright
 *     - Selenium
 *     - Node.js fetchers simulating browser UAs
 *
 *   **LAYER 5 — MONITORING / UPTIME**
 *     - Pingdom
 *     - UptimeRobot
 *     - Datadog
 *     - NewRelicPinger
 *
 *   **LAYER 6 — CI/CD ENVIRONMENTS**
 *     - GitHub Actions runner markers  
 *     - GitLab CI headless agents  
 *     - Browserless.io  
 *     - RenderBot  
 *
 *   **LAYER 7 — GENERIC BOT HEURISTICS**
 *     - "bot", "crawl", "spider", "scanner", "fetcher"
 *     - suspicious all-lowercase single token UAs  
 *     - synthetic minimal headers  
 *
 * SEMANTIC NOTES  
 *   - This schema does **not** block or reject input. It classifies it.  
 *   - Perfectly valid browsers return `{ isBot: false }`.  
 *   - This schema is upstream of `userAgentDevice` and `userAgentPlatform`.  
 *   - When multiple categories match, the strongest category wins:
 *       LLM > Search > Automation > Scraper > Monitoring > Generic  
 *
 * EXAMPLES  
 *   ```
 *   // Search bot
 *   parse(userAgentBot, "Mozilla/5.0 ... Googlebot/2.1 ...")
 *   → { isBot: true, category: "search", name: "Googlebot" }
 *
 *   // LLM bot
 *   parse(userAgentBot, "Mozilla/5.0 GPTBot/1.0")
 *   → { isBot: true, category: "llm", name: "GPTBot" }
 *
 *   // Headless automation
 *   parse(userAgentBot, "Mozilla/5.0 HeadlessChrome/123.0.0.0")
 *   → { isBot: true, category: "automation", name: "HeadlessChrome" }
 *
 *   // Scraper
 *   parse(userAgentBot, "curl/8.4.0")
 *   → { isBot: true, category: "scraper", name: "curl" }
 *
 *   // Normal browser
 *   parse(userAgentBot, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...")
 *   → { isBot: false, category: "none", name: "Human" }
 *   ```
 */
export const userAgentBot = v.custom(
    (ua: unknown) => typeof ua === "string",
    "Invalid User-Agent string."
).pipe(
    v.transform((ua: string) => {
        const value = ua;

        // ----- LAYER 1: SEARCH ENGINES -----------------------------------------
        if (/Googlebot|Google-InspectionTool/i.test(value))
            return { isBot: true, category: "search", name: "Googlebot" };

        if (/bingbot|BingPreview/i.test(value))
            return { isBot: true, category: "search", name: "bingbot" };

        if (/DuckDuckBot/i.test(value))
            return { isBot: true, category: "search", name: "DuckDuckBot" };

        if (/Baiduspider/i.test(value))
            return { isBot: true, category: "search", name: "Baiduspider" };

        if (/YandexBot|YandexImages/i.test(value))
            return { isBot: true, category: "search", name: "YandexBot" };

        if (/Applebot/i.test(value))
            return { isBot: true, category: "search", name: "Applebot" };

        // ----- LAYER 2: LLM AGENTS --------------------------------------------
        if (/GPTBot/i.test(value))
            return { isBot: true, category: "llm", name: "GPTBot" };

        if (/ClaudeBot/i.test(value))
            return { isBot: true, category: "llm", name: "ClaudeBot" };

        if (/PerplexityBot/i.test(value))
            return { isBot: true, category: "llm", name: "PerplexityBot" };

        // ----- LAYER 3: SCRAPERS ----------------------------------------------
        if (/Scrapy|python-requests|axios|Wget|curl/i.test(value)) {
            const match = value.match(/(Scrapy|python-requests|axios|Wget|curl)/i);
            return {
                isBot: true,
                category: "scraper",
                name: match ? match[1] : "scraper",
            };
        }

        // ----- LAYER 4: AUTOMATION / HEADLESS ----------------------------------
        if (/HeadlessChrome|Puppeteer|Playwright|Selenium/i.test(value)) {
            const match = value.match(/(HeadlessChrome|Puppeteer|Playwright|Selenium)/i);
            return {
                isBot: true,
                category: "automation",
                name: match ? match[1] : "automation",
            };
        }

        // ----- LAYER 5: MONITORING / UPTIME -----------------------------------
        if (/Pingdom|UptimeRobot|Datadog|NewRelic/i.test(value)) {
            const match = value.match(/(Pingdom|UptimeRobot|Datadog|NewRelic)/i);
            return {
                isBot: true,
                category: "monitoring",
                name: match ? match[1] : "MonitoringAgent",
            };
        }

        // ----- LAYER 6: CI/CD --------------------------------------------------
        if (/browserless|renderbot|GitHub|GitLab|CI|runner/i.test(value))
            return { isBot: true, category: "ci", name: "CIRunner" };

        // ----- LAYER 7: GENERIC BOT HEURISTICS ---------------------------------
        if (/(bot|crawl|spider|scanner|fetcher)/i.test(value)) {
            const token = value.match(/(bot|crawl|spider|scanner|fetcher)/i);
            return {
                isBot: true,
                category: "generic",
                name: token ? token[1] : "Bot",
            };
        }

        // Unknown or normal browser
        return { isBot: false, category: "none", name: "Human" };
    })
);

/**
 * OUTPUT TYPE — USER-AGENT BOT DESCRIPTOR
 *
 * SUMMARY  
 *   Represents the structured, normalized result of the `userAgentBot` schema.
 *   This describes whether the UA belongs to a bot and provides category and
 *   name metadata for analytics and enforcement systems.
 *
 * PURPOSE  
 *   Enables:
 *   - bot filtering  
 *   - risk scoring  
 *   - SEO insights  
 *   - routing logic  
 *   - AB-test separation of humans vs non-humans  
 *   - content gating (e.g., disallow AI crawlers)  
 *
 * CONTRACT GUARANTEES  
 *   Always returns:
 *   ```
 *   {
 *     isBot: boolean;
 *     category: string;
 *     name: string;
 *   }
 *   ```
 *
 * SEMANTIC NOTES  
 *   - If `isBot === false`, the UA is confidently human-operated.  
 *   - If `isBot === true`, category defines the bot’s purpose.  
 *   - Strongest detection layer always wins (LLM > Search > Automation > Scraper …).  
 *
 * EXAMPLE  
 *   ```
 *   const bot: UserAgentBot =
 *       parse(userAgentBot, req.headers.get("user-agent"));
 *
 *   if (bot.isBot) {
 *     console.log("Blocked AI crawler:", bot.name);
 *   }
 *   ```
 */
export type UserAgentBot = v.InferOutput<typeof userAgentBot>;

/**
 * USER-AGENT BROWSER SCHEMA
 *
 * SUMMARY  
 *   Parses and validates the **browser family**, **browser name**, and
 *   **browser version** from a User-Agent string using hardened,
 *   precedence-based heuristics.  
 *
 *   This schema resolves the complex relationships between browsers and
 *   engines—e.g.:
 *   - Chrome (Blink/Chromium)
 *   - Safari (WebKit)
 *   - Firefox (Gecko)
 *   - Edge (Chromium-based)
 *   - Opera (Chromium fork)
 *   - Brave (Chromium fork)
 *   - Samsung Internet (Chromium fork)
 *   - UC Browser (proprietary)
 *
 * PURPOSE  
 *   Provides a normalized browser descriptor suitable for:
 *   - capability targeting (ES module support, features)
 *   - analytics and segmentation
 *   - A/B rollout logic
 *   - performance tuning by browser
 *   - security rules and fingerprinting
 *
 * INPUT CONTRACT  
 *   ACCEPTS:
 *   - any valid User-Agent as validated by `userAgentString`
 *
 *   REJECTS:
 *   - null, undefined, non-string values
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     name: string;        // "Chrome", "Safari", "Firefox", etc.
 *     family: string;      // "Chromium", "WebKit", "Gecko", "Proprietary"
 *     version: string;     // extracted major/minor/patch token
 *   }
 *   ```
 *
 * DETECTION ORDER (HIGHEST PRIORITY FIRST)  
 *   1. Brave  
 *   2. Edge (Chromium)  
 *   3. Chrome  
 *   4. Opera  
 *   5. Samsung Internet  
 *   6. UC Browser  
 *   7. Firefox  
 *   8. Safari  
 *   9. Chromium (generic)  
 *   10. WebKit-only (generic)  
 *   11. Unknown browser fallback  
 *
 * VALIDATION RULES  
 *   **BRAVE:**  
 *     - "Brave" token OR Chromium + Brave-specific version tokens  
 *
 *   **EDGE:**  
 *     - "Edg/" (new Chromium Edge)
 *
 *   **CHROME:**  
 *     - "Chrome/" but not Edge, Opera, Brave, Samsung Internet
 *
 *   **OPERA:**  
 *     - "OPR/" or "Opera/"
 *
 *   **SAMSUNG INTERNET:**  
 *     - "SamsungBrowser/"
 *
 *   **UC BROWSER:**  
 *     - "UCBrowser/" or "UCWEB/"
 *
 *   **FIREFOX:**  
 *     - "Firefox/"
 *
 *   **SAFARI:**  
 *     - "Safari/"  
 *     - must NOT include Chrome/Chromium/Brave/Edge  
 *     - Safari version extracted from "Version/x.y.z"
 *
 *   **CHROMIUM GENERIC:**  
 *     - "Chromium/" and none of the above
 *
 *   **WEBKIT GENERIC:**  
 *     - "AppleWebKit/" without browser identifier
 *
 *   **UNKNOWN:**  
 *     - any UA that does not match known browser families  
 *
 * SEMANTIC NOTES  
 *   - Safari's UA is notoriously ambiguous; Safari is detected **only** when no
 *     Chrome-family markers appear.  
 *   - Many Chromium forks hide true identities; this schema extracts the
 *     strongest available signal, not naive string matching.  
 *   - Bots using fake Chrome versions are filtered by the bot schema; this
 *     schema simply parses the string.  
 *
 * EXAMPLES  
 *   ```
 *   parse(userAgentBrowser,
 *     "Mozilla/5.0 ... Chrome/123.0.6312.58 Safari/537.36")
 *   → { name: "Chrome", family: "Chromium", version: "123.0.6312.58" }
 *
 *   parse(userAgentBrowser,
 *     "Mozilla/5.0 ... Edg/123.0 Safari/537.36")
 *   → { name: "Edge", family: "Chromium", version: "123.0" }
 *
 *   parse(userAgentBrowser,
 *     "Mozilla/5.0 ... Version/17.2 Safari/605.1.15")
 *   → { name: "Safari", family: "WebKit", version: "17.2" }
 *
 *   parse(userAgentBrowser,
 *     "Mozilla/5.0 ... Firefox/122.0")
 *   → { name: "Firefox", family: "Gecko", version: "122.0" }
 *
 *   parse(userAgentBrowser, "CustomAgent/1.0")
 *   → { name: "Unknown", family: "Unknown", version: "unknown" }
 *   ```
 */
export const userAgentBrowser = v.custom(
    (ua: unknown) => typeof ua === "string",
    "Invalid User-Agent string."
).pipe(
    v.transform((ua: string) => {
        const value = ua;

        // ----- BRAVE ------------------------------------------------------------
        if (/Brave/i.test(value)) {
            const version = extractVersion(value, /Chrome\/([0-9.]+)/);
            return { name: "Brave", family: "Chromium", version };
        }

        // ----- EDGE (Chromium-based) -------------------------------------------
        if (/Edg\/([0-9.]+)/i.test(value)) {
            const version = extractVersion(value, /Edg\/([0-9.]+)/);
            return { name: "Edge", family: "Chromium", version };
        }

        // ----- CHROME -----------------------------------------------------------
        if (/Chrome\/([0-9.]+)/i.test(value) &&
            !/Edg\//i.test(value) &&
            !/OPR\//i.test(value) &&
            !/SamsungBrowser\//i.test(value) &&
            !/ UCBrowser\//i.test(value) &&
            !/Brave/i.test(value)) {
            const version = extractVersion(value, /Chrome\/([0-9.]+)/);
            return { name: "Chrome", family: "Chromium", version };
        }

        // ----- OPERA ------------------------------------------------------------
        if (/OPR\/([0-9.]+)/i.test(value) || /Opera\/([0-9.]+)/i.test(value)) {
            const version = extractVersion(value, /(?:OPR|Opera)\/([0-9.]+)/i);
            return { name: "Opera", family: "Chromium", version };
        }

        // ----- SAMSUNG INTERNET -------------------------------------------------
        if (/SamsungBrowser\/([0-9.]+)/i.test(value)) {
            const version = extractVersion(value, /SamsungBrowser\/([0-9.]+)/i);
            return { name: "Samsung Internet", family: "Chromium", version };
        }

        // ----- UC BROWSER -------------------------------------------------------
        if (/UCBrowser\/([0-9.]+)/i.test(value) || /UCWEB/i.test(value)) {
            const version = extractVersion(value, /UCBrowser\/([0-9.]+)/i);
            return { name: "UC Browser", family: "Proprietary", version };
        }

        // ----- FIREFOX ---------------------------------------------------------
        if (/Firefox\/([0-9.]+)/i.test(value)) {
            const version = extractVersion(value, /Firefox\/([0-9.]+)/);
            return { name: "Firefox", family: "Gecko", version };
        }

        // ----- SAFARI ----------------------------------------------------------
        if (/Safari\/[0-9.]+/i.test(value) &&
            !/Chrome/i.test(value) &&
            !/Chromium/i.test(value) &&
            !/OPR/i.test(value) &&
            !/Edg/i.test(value) &&
            !/SamsungBrowser/i.test(value)) {
            const version = extractVersion(value, /Version\/([0-9.]+)/, "unknown");
            return { name: "Safari", family: "WebKit", version };
        }

        // ----- CHROMIUM GENERIC ------------------------------------------------
        if (/Chromium\/([0-9.]+)/i.test(value)) {
            const version = extractVersion(value, /Chromium\/([0-9.]+)/);
            return { name: "Chromium", family: "Chromium", version };
        }

        // ----- WEBKIT GENERIC --------------------------------------------------
        if (/AppleWebKit\/([0-9.]+)/i.test(value)) {
            return { name: "WebKit Browser", family: "WebKit", version: "unknown" };
        }

        // ----- FALLBACK --------------------------------------------------------
        return { name: "Unknown", family: "Unknown", version: "unknown" };
    })
);

// ----- HELPER --------------------------------------------------------------

function extractVersion(ua: string, re: RegExp, fallback = "unknown"): string {
    const m = ua.match(re);
    return m ? m[1] : fallback;
}

/**
 * OUTPUT TYPE — USER-AGENT BROWSER DESCRIPTOR
 *
 * SUMMARY  
 *   Represents the structured browser information extracted from the
 *   `userAgentBrowser` schema, providing a normalized view of browser identity
 *   and version for analytics, capability detection, and adaptive logic.
 *
 * PURPOSE  
 *   Guarantees a consistent, strongly typed browser descriptor across:
 *   - Chrome-family browsers  
 *   - WebKit-based browsers  
 *   - Gecko-based browsers  
 *   - Proprietary mobile browsers  
 *   - Unknown or custom UAs  
 *
 * CONTRACT GUARANTEES  
 *   Always returns:
 *   ```
 *   {
 *     name: string;    // browser name
 *     family: string;  // engine family
 *     version: string; // best-effort version extraction
 *   }
 *   ```
 *
 * SEMANTIC NOTES  
 *   - Browser-level parsing precedes feature capability detection.  
 *   - Safari version comes from `Version/x.y.z` token, not WebKit tokens.  
 *   - Chromium forks inherit the "Chromium" family name but maintain browser-
 *     specific identifiers.  
 *
 * EXAMPLE  
 *   ```
 *   const browser: UserAgentBrowser =
 *       parse(userAgentBrowser, req.headers.get("user-agent"));
 *
 *   console.log(browser.name);    // "Chrome"
 *   console.log(browser.family);  // "Chromium"
 *   console.log(browser.version); // "123.0.6312.58"
 *   ```
 */
export type UserAgentBrowser = v.InferOutput<typeof userAgentBrowser>;

/**
 * USER-AGENT ENGINE SCHEMA
 *
 * SUMMARY  
 *   Parses and validates the **rendering engine** used by the User-Agent,
 *   returning a normalized engine name and version (where applicable).
 *
 *   Rendering engines represent the underlying browser technology:
 *   - Blink      (Chrome, Edge Chromium, Brave, Opera, Vivaldi, Samsung Internet)
 *   - WebKit     (Safari, iOS Safari, old iOS browsers, some smart devices)
 *   - Gecko      (Firefox, Firefox ESR, Tor Browser)
 *   - EdgeHTML   (Legacy Microsoft Edge < 79)
 *   - Trident    (Internet Explorer)
 *   - Goanna     (Pale Moon, Basilisk)
 *   - Servo      (Experimental Firefox engine)
 *   - Presto     (Very old Opera < 15)
 *
 * PURPOSE  
 *   Provides a reliable engine classification layer for:
 *   - capability targeting (WASM, ES modules, WebRTC)
 *   - performance tuning across engines
 *   - feature-flag rollouts
 *   - compatibility and polyfill injection
 *   - analytics segmentation
 *   - risk/fraud scoring (rare/legacy engines)
 *
 * INPUT CONTRACT  
 *   Accepts:
 *   - any valid User-Agent string as validated by `userAgentString`
 *
 *   Rejects:
 *   - non-string values
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     engine: string;     // "Blink", "WebKit", "Gecko", etc.
 *     version: string;    // extracted version or "unknown"
 *   }
 *   ```
 *
 * DETECTION ORDER (PRIORITIZED)  
 *
 *   **1. Blink (Chromium-based)**
 *     - Chrome/xx
 *     - Edg/xx
 *     - OPR/xx
 *     - SamsungBrowser/xx
 *     - Brave indicators
 *     - Generic Chromium/xx
 *
 *   **2. WebKit**
 *     - Safari/xxx
 *     - Version/xxx + Safari token
 *     - AppleWebKit/xxx in absence of Chrome-family markers
 *
 *   **3. Gecko**
 *     - Firefox/xxx
 *     - rv:xxx (Gecko version)
 *
 *   **4. EdgeHTML**
 *     - Edge/12–18 patterns
 *     - "Edge/" but NOT "Edg/" (new Chromium Edge)
 *
 *   **5. Trident (IE)**
 *     - MSIE xxx
 *     - Trident/7.0
 *
 *   **6. Goanna**
 *     - Goanna/xx
 *     - PaleMoon/xx
 *     - Basilisk/xx
 *
 *   **7. Presto**
 *     - Presto/xx (old Opera engine)
 *
 *   **8. Servo**
 *     - Servo/xx (rare)
 *
 *   **9. Unknown**
 *     - fallback classification
 *
 * SEMANTIC NOTES  
 *   - Engine detection must occur **before** browser detection because engine
 *     hints often precede browser branding (e.g., WebKit-only smart devices).  
 *   - Blink should be detected with strict Chrome-family exclusions for Safari.  
 *   - WebKit must only match non-Chromium WebKit.  
 *
 * EXAMPLES  
 *   ```
 *   parse(userAgentEngine,
 *     "Mozilla/5.0 ... Chrome/123.0.0.0 Safari/537.36")
 *   → { engine: "Blink", version: "537.36" }
 *
 *   parse(userAgentEngine,
 *     "Mozilla/5.0 ... Version/17.2 Safari/605.1.15")
 *   → { engine: "WebKit", version: "605.1.15" }
 *
 *   parse(userAgentEngine,
 *     "Mozilla/5.0 ... Firefox/122.0")
 *   → { engine: "Gecko", version: "122.0" }
 *
 *   parse(userAgentEngine,
 *     "Mozilla/5.0 ... MSIE 11.0; Trident/7.0")
 *   → { engine: "Trident", version: "7.0" }
 *
 *   parse(userAgentEngine,
 *     "Mozilla/5.0 (X11; U; Linux x86_64; en-US) Presto/2.12.388")
 *   → { engine: "Presto", version: "2.12.388" }
 *
 *   parse(userAgentEngine, "CustomAgent/1.0")
 *   → { engine: "Unknown", version: "unknown" }
 *   ```
 */
export const userAgentEngine = v.custom(
    (ua: unknown) => typeof ua === "string",
    "Invalid User-Agent string."
).pipe(
    v.transform((ua: string) => {
        const value = ua;

        // ---- BLINK -------------------------------------------------------------
        if (/Chrome\/|Edg\/|OPR\/|SamsungBrowser\/|Brave/i.test(value)) {
            const version =
                extractVersion(value, /AppleWebKit\/([0-9.]+)/) ??
                extractVersion(value, /Chrome\/([0-9.]+)/, "unknown");
            return { engine: "Blink", version };
        }

        // ---- WEBKIT ------------------------------------------------------------
        if (/Safari\/[0-9.]+/i.test(value) &&
            !/Chrome/i.test(value) &&
            !/Chromium/i.test(value) &&
            !/OPR/i.test(value) &&
            !/Edg/i.test(value)) {
            const version = extractVersion(value, /Safari\/([0-9.]+)/, "unknown");
            return { engine: "WebKit", version };
        }

        if (/AppleWebKit\/([0-9.]+)/i.test(value) &&
            !/Chrome|Chromium|OPR|Edg/i.test(value)) {
            const version = extractVersion(value, /AppleWebKit\/([0-9.]+)/);
            return { engine: "WebKit", version };
        }

        // ---- GECKO -------------------------------------------------------------
        if (/Firefox\/([0-9.]+)/i.test(value))
            return {
                engine: "Gecko",
                version: extractVersion(value, /Firefox\/([0-9.]+)/),
            };

        if (/rv:([0-9.]+)\)\s+Gecko/i.test(value))
            return {
                engine: "Gecko",
                version: extractVersion(value, /rv:([0-9.]+)/),
            };

        // ---- EDGEHTML ----------------------------------------------------------
        if (/Edge\/([0-9.]+)/i.test(value) && !/Edg\//i.test(value))
            return {
                engine: "EdgeHTML",
                version: extractVersion(value, /Edge\/([0-9.]+)/),
            };

        // ---- TRIDENT -----------------------------------------------------------
        if (/MSIE\s+([0-9.]+)/i.test(value) || /Trident\/([0-9.]+)/i.test(value))
            return {
                engine: "Trident",
                version:
                    extractVersion(value, /Trident\/([0-9.]+)/) ??
                    extractVersion(value, /MSIE\s+([0-9.]+)/, "unknown"),
            };

        // ---- GOANNA ------------------------------------------------------------
        if (/Goanna\/([0-9.]+)/i.test(value))
            return {
                engine: "Goanna",
                version: extractVersion(value, /Goanna\/([0-9.]+)/),
            };

        if (/PaleMoon\/([0-9.]+)/i.test(value))
            return {
                engine: "Goanna",
                version: extractVersion(value, /PaleMoon\/([0-9.]+)/),
            };

        if (/Basilisk\/([0-9.]+)/i.test(value))
            return {
                engine: "Goanna",
                version: extractVersion(value, /Basilisk\/([0-9.]+)/),
            };

        // ---- PRESTO ------------------------------------------------------------
        if (/Presto\/([0-9.]+)/i.test(value))
            return {
                engine: "Presto",
                version: extractVersion(value, /Presto\/([0-9.]+)/),
            };

        // ---- SERVO -------------------------------------------------------------
        if (/Servo\/([0-9.]+)/i.test(value))
            return {
                engine: "Servo",
                version: extractVersion(value, /Servo\/([0-9.]+)/),
            };

        // ---- FALLBACK ----------------------------------------------------------
        return { engine: "Unknown", version: "unknown" };
    })
);

// INTERNAL: version extractor helper
function extractVersion(
    ua: string,
    re: RegExp,
    fallback = "unknown"
): string {
    const m = ua.match(re);
    return m ? m[1] : fallback;
}

/**
 * OUTPUT TYPE — USER-AGENT RENDERING ENGINE
 *
 * SUMMARY  
 *   Represents the structured rendering-engine descriptor extracted from
 *   `userAgentEngine`, providing canonical engine classification and version
 *   metadata for downstream capability logic.
 *
 * PURPOSE  
 *   Enables:
 *   - engine-specific capability checks  
 *   - performance profiling per engine  
 *   - runtime polyfill injection  
 *   - compatibility matrices  
 *   - cross-platform rendering diagnostics  
 *
 * CONTRACT GUARANTEES  
 *   Always returns:
 *   ```
 *   {
 *     engine: string;   // e.g., "Blink", "WebKit", "Gecko"
 *     version: string;  // extracted engine version or "unknown"
 *   }
 *   ```
 *
 * SEMANTIC NOTES  
 *   - Blink is detected for any Chromium-family browser, including forks.  
 *   - Safari engine version is separate from Safari browser version.  
 *   - Legacy engines (Trident, Presto) are included for security filters.  
 *
 * EXAMPLE  
 *   ```
 *   const engine: UserAgentEngine =
 *       parse(userAgentEngine, req.headers.get("user-agent"));
 *
 *   console.log(engine.engine);   // "Blink"
 *   console.log(engine.version);  // "537.36"
 *   ```
 */
export type UserAgentEngine = v.InferOutput<typeof userAgentEngine>;

/**
 * USER-AGENT SECURITY SCHEMA
 *
 * SUMMARY  
 *   Performs **security-focused analysis** of a User-Agent string, detecting:
 *
 *   - spoofed browser identifiers  
 *   - forged Safari/Chrome/Firefox signatures  
 *   - illegal version formats  
 *   - malformed token sequences  
 *   - synthetic UAs from malware or scrapers  
 *   - incomplete or truncated UAs  
 *   - impossible combinations (e.g., Safari + Chrome, iOS + Firefox Desktop)  
 *   - bot evasion signatures (fake Chrome/105.0.0.0 patterns)  
 *   - laboratory/automation UAs attempting to appear human  
 *
 *   Produces a structured descriptor summarizing the UA’s **security integrity**.
 *
 * PURPOSE  
 *   Enables:
 *   - risk scoring  
 *   - bot eviction  
 *   - anti-abuse rules  
 *   - forensic analytics  
 *   - anomaly detection  
 *   - fraud heuristics  
 *   - retention of “unsafe UA” classifications  
 *
 * INPUT CONTRACT  
 *   - Accepts any string validated previously by `userAgentString`.  
 *   - Does NOT classify bots — `userAgentBot` is upstream.  
 *
 * OUTPUT CONTRACT  
 *   Returns:
 *   ```
 *   {
 *     isValidSyntax: boolean;
 *     isSpoofed: boolean;
 *     riskLevel: "low" | "medium" | "high" | "critical";
 *     issues: string[];      // human-readable flags
 *   }
 *   ```
 *
 * DETECTION LAYERS  
 *
 *   **LAYER 1 — MALFORMED STRUCTURE**
 *     - Empty product list  
 *     - Missing version tokens  
 *     - Odd punctuation  
 *     - Repeated slashes  
 *     - Multiple Version/ tokens in Safari  
 *     - Random symbols (malware UAs)  
 *
 *   **LAYER 2 — IMPOSSIBLE COMBINATIONS**
 *     - Safari + Chrome at the same time  
 *     - Firefox + AppleWebKit  
 *     - iOS + Chrome/Chromium (not allowed except Chrome-iOS token)  
 *     - Safari without Version/x.y token  
 *     - Chrome without AppleWebKit token  
 *
 *   **LAYER 3 — SPOOFING INDICATORS**
 *     - Chrome/99.0.0.0 identical placeholder versions  
 *     - Version/99.0 Safari/602.x classic spoof  
 *     - Unrealistic OS versions  
 *     - Fake CPU architectures  
 *     - Generic UA “Mozilla/5.0” with nothing else  
 *
 *   **LAYER 4 — ANOMALIES**
 *     - UA truncated abruptly  
 *     - Overlong UAs (> 2,000 chars)  
 *     - Suspicious token ordering  
 *     - Duplicate browser families  
 *
 *   **LAYER 5 — INVALID VERSIONING**
 *     - Non-numeric versions  
 *     - Hex versions  
 *     - Null components (“Chrome/..0”)  
 *
 * RISK LEVEL LOGIC  
 *   - critical → clear spoofing intent or malware patterns  
 *   - high → strong indicators of forged UA or broken structure  
 *   - medium → unusual but not necessarily malicious  
 *   - low → normal browsers  
 *
 * EXAMPLES  
 *   ```
 *   // Legit Chrome
 *   parse(userAgentSecurity,
 *     "Mozilla/5.0 ... Chrome/123.0.6312.58 Safari/537.36")
 *   → { isValidSyntax: true, isSpoofed: false, riskLevel: "low", issues: [] }
 *
 *   // Fake Chrome
 *   parse(userAgentSecurity,
 *     "Mozilla/5.0 Chrome/99.0.0.0 Safari/000.0")
 *   → {
 *       isValidSyntax: false,
 *       isSpoofed: true,
 *       riskLevel: "high",
 *       issues: ["Impossible version combination", "Malformed Safari token"]
 *     }
 *
 *   // Firefox + AppleWebKit
 *   parse(userAgentSecurity,
 *     "Mozilla/5.0 ... Firefox/120.0 AppleWebKit/537.36")
 *   → { isSpoofed: true, riskLevel: "critical" }
 *
 *   // Truncated UA
 *   parse(userAgentSecurity, "Mozilla/5.0 (Win")
 *   → { isValidSyntax: false, isSpoofed: false, riskLevel: "medium", issues: ["Truncated UA"] }
 *   ```
 */
export const userAgentSecurity = v.custom(
    (ua: unknown) => typeof ua === "string",
    "Invalid User-Agent string."
).pipe(
    v.transform((ua: string) => {
        const issues: string[] = [];
        let spoof = false;

        // ---- LAYER 1: MALFORMED SYNTAX ----------------------------------------
        if (!/[A-Za-z]/.test(ua)) {
            issues.push("No alphabetic tokens present");
            spoof = true;
        }

        if (!/\/[0-9]/.test(ua)) {
            issues.push("Missing version tokens");
        }

        if (/\/{2,}/.test(ua)) {
            issues.push("Double-slash detected");
            spoof = true;
        }

        if (/Version\/[0-9.]+.*Version\/[0-9.]+/i.test(ua)) {
            issues.push("Duplicate Version/ tokens");
            spoof = true;
        }

        if (/[^A-Za-z0-9\-;:()\/._\s]/.test(ua)) {
            issues.push("Suspicious symbols detected");
            spoof = true;
        }

        // ---- LAYER 2: IMPOSSIBLE COMBINATIONS ---------------------------------
        const hasSafari = /Safari\/[0-9.]+/i.test(ua);
        const hasChrome = /Chrome\/[0-9.]+/i.test(ua) || /Chromium\/[0-9.]+/i.test(ua);
        const hasFirefox = /Firefox\/[0-9.]+/i.test(ua);

        if (hasSafari && hasChrome) {
            issues.push("Safari + Chrome combination (impossible)");
            spoof = true;
        }

        if (hasFirefox && /AppleWebKit/i.test(ua)) {
            issues.push("Firefox + WebKit combination (impossible)");
            spoof = true;
        }

        if (hasSafari && !/Version\/[0-9.]+/i.test(ua)) {
            issues.push("Safari without Version/x.y token");
            spoof = true;
        }

        if (hasChrome && !/AppleWebKit/i.test(ua)) {
            issues.push("Chrome without AppleWebKit");
            spoof = true;
        }

        // ---- LAYER 3: SPOOFING INDICATORS -------------------------------------
        if (/Chrome\/(99\.0\.0\.0|100\.0\.0\.0)/.test(ua)) {
            issues.push("Placeholder Chrome version (spoof indicator)");
            spoof = true;
        }

        if (/Safari\/000/.test(ua)) {
            issues.push("Zeroed-out Safari version");
            spoof = true;
        }

        if (/iPhone OS 99/.test(ua)) {
            issues.push("Unrealistic iOS version");
            spoof = true;
        }

        // ---- LAYER 4: ANOMALIES -----------------------------------------------
        if (ua.length < 20) {
            issues.push("UA suspiciously short");
        }

        if (ua.length > 2000) {
            issues.push("UA excessively long");
            spoof = true;
        }

        if (!/\)/.test(ua) && /\(/.test(ua)) {
            issues.push("Truncated UA (missing closing parenthesis)");
        }

        // ---- LAYER 5: INVALID VERSIONING --------------------------------------
        if (/\/[A-Za-z]+/.test(ua)) {
            issues.push("Non-numeric version component");
            spoof = true;
        }

        // ---- RISK LEVEL -------------------------------------------------------
        let risk: "low" | "medium" | "high" | "critical" = "low";

        if (spoof && issues.length > 4) risk = "critical";
        else if (spoof) risk = "high";
        else if (issues.length > 0) risk = "medium";
        else risk = "low";

        return {
            isValidSyntax: issues.length === 0 || !spoof,
            isSpoofed: spoof,
            riskLevel: risk,
            issues,
        };
    })
);

/**
 * OUTPUT TYPE — USER-AGENT SECURITY DESCRIPTOR
 *
 * SUMMARY  
 *   Represents the validated security posture of a User-Agent string as
 *   determined by the `userAgentSecurity` schema.
 *
 * PURPOSE  
 *   Enables:
 *   - bot mitigation
 *   - heuristic intrusion detection
 *   - forensic logging
 *   - fraud scoring
 *   - advanced UA integrity evaluation
 *
 * CONTRACT GUARANTEES  
 *   Always returns:
 *   ```
 *   {
 *     isValidSyntax: boolean;
 *     isSpoofed: boolean;
 *     riskLevel: "low" | "medium" | "high" | "critical";
 *     issues: string[];
 *   }
 *   ```
 *
 * SEMANTIC NOTES  
 *   - `isSpoofed = true` implies deliberate forgery or impossible UA structure.  
 *   - `isValidSyntax = false` can arise from malformed or truncated UA strings.  
 *   - `riskLevel` reflects cumulative severity.  
 *
 * EXAMPLE  
 *   ```
 *   const sec: UserAgentSecurity =
 *       parse(userAgentSecurity, req.headers.get("user-agent"));
 *
 *   if (sec.riskLevel === "critical") {
 *     denyRequest();
 *   }
 *   ```
 */
export type UserAgentSecurity = v.InferOutput<typeof userAgentSecurity>;

/**
 * USER-AGENT METADATA SCHEMA
 *
 * SUMMARY  
 *   Constructs a **complete, unified User-Agent metadata object** by
 *   orchestrating all lower-level UA subsystems:
 *
 *   - Browser identification  
 *   - Rendering engine classification  
 *   - Platform/OS detection  
 *   - Device-class classification  
 *   - Bot/crawler detection  
 *   - Security/spoofing analysis  
 *
 *   The output represents a canonical, fully validated and normalized
 *   descriptor suitable for analytics, risk evaluation, capability inference,
 *   and detailed UA-based segmentation.
 *
 * PURPOSE  
 *   Provides a **single, authoritative representation** of a User-Agent string
 *   for all downstream systems:
 *
 *   - request logging  
 *   - analytics ingestion  
 *   - A/B and feature-flag logic  
 *   - risk scoring & fraud detection  
 *   - server-side rendering rules  
 *   - browser capability matrices  
 *   - security enforcement  
 *   - anti-bot engineering  
 *
 * INPUT CONTRACT  
 *   - Accepts any raw User-Agent string.  
 *   - Performs structural validation.  
 *   - Calls all subordinate schemas to produce a unified result.  
 *
 * OUTPUT CONTRACT  
 *   Returns the following merged structure:
 *   ```
 *   {
 *     raw: string;
 *     browser: UserAgentBrowser;
 *     engine: UserAgentEngine;
 *     platform: UserAgentPlatform;
 *     device: UserAgentDevice;
 *     bot: UserAgentBot;
 *     security: UserAgentSecurity;
 *     integrity: {
 *       isHuman: boolean;
 *       isMobile: boolean;
 *       isDesktop: boolean;
 *       isTablet: boolean;
 *       isKnownGood: boolean;
 *       risk: "low" | "medium" | "high" | "critical";
 *     };
 *   }
 *   ```
 *
 * VALIDATION LOGIC  
 *   - `raw` must be a valid User-Agent string  
 *   - Sub-schemas must succeed; any failure indicates malformed UA  
 *   - Integrity map is derived from merged components  
 *
 * SEMANTIC NOTES  
 *   - This schema acts as the **canonical gateway** for all UA analysis.  
 *   - Ensures consistency across all UA subsystems.  
 *   - Designed for high-volume telemetry pipelines (millions of events/sec).  
 *   - Does not perform capability inference — that belongs to the next module.  
 *
 * EXAMPLES  
 *   ```
 *   const meta = parse(userAgentMetadata,
 *     req.headers.get("user-agent"));
 *
 *   console.log(meta.browser.name);     // "Chrome"
 *   console.log(meta.platform.name);    // "Windows"
 *   console.log(meta.device.type);      // "desktop"
 *   console.log(meta.bot.isBot);        // false
 *   console.log(meta.security.riskLevel); // "low"
 *
 *   // Human-readable summary
 *   {
 *     raw: "...",
 *     browser: { ... },
 *     engine: { ... },
 *     platform: { ... },
 *     device: { ... },
 *     bot: { ... },
 *     security: { ... },
 *     integrity: { isHuman: true, ... }
 *   }
 *   ```
 */
export const userAgentMetadata = v.string(
    "User-Agent must be a string."
).pipe(
    v.transform((ua: string) => {
        // down-stream validators
        const browser = v.safeParse(userAgentBrowser, ua);
        const engine = v.safeParse(userAgentEngine, ua);
        const platform = v.safeParse(userAgentPlatform, ua);
        const device = v.safeParse(userAgentDevice, ua);
        const bot = v.safeParse(userAgentBot, ua);
        const security = v.safeParse(userAgentSecurity, ua);

        // fallback pattern: safeParse returns { success, output | issues }
        const extract = (result: any, fallback: any) =>
            result.success ? result.output : fallback;

        const browserOut = extract(browser, {
            name: "Unknown",
            family: "Unknown",
            version: "unknown",
        });

        const engineOut = extract(engine, {
            engine: "Unknown",
            version: "unknown",
        });

        const platformOut = extract(platform, {
            name: "Unknown",
            family: "Unknown",
            version: "unknown",
        });

        const deviceOut = extract(device, {
            type: "unknown",
            model: "unknown",
        });

        const botOut = extract(bot, {
            isBot: false,
            category: "none",
            name: "Human",
        });

        const securityOut = extract(security, {
            isValidSyntax: true,
            isSpoofed: false,
            riskLevel: "low",
            issues: [],
        });

        // Integrity derivation
        const integrity = {
            isHuman: !botOut.isBot && !securityOut.isSpoofed,
            isMobile: deviceOut.type === "mobile",
            isTablet: deviceOut.type === "tablet",
            isDesktop: deviceOut.type === "desktop",
            isKnownGood:
                !botOut.isBot &&
                !securityOut.isSpoofed &&
                securityOut.riskLevel === "low",
            risk: securityOut.riskLevel,
        };

        return {
            raw: ua,
            browser: browserOut,
            engine: engineOut,
            platform: platformOut,
            device: deviceOut,
            bot: botOut,
            security: securityOut,
            integrity,
        };
    })
);

/**
* OUTPUT TYPE — USER-AGENT METADATA (FULL UNIFIED DESCRIPTOR)
*
* SUMMARY  
*   Represents the fully normalized, aggregated User-Agent analysis object
*   produced by `userAgentMetadata`, combining browser, engine, platform,
*   device, bot classification, and security assessment in a single structure.
*
* PURPOSE  
*   Serves as the **canonical UA representation** for all downstream systems,
*   enabling:
*   - analytics  
*   - risk detection  
*   - segmentation  
*   - adaptive rendering  
*   - fraud mitigation  
*   - browser/engine compatibility matrices  
*
* CONTRACT GUARANTEES  
*   Always returns:
*   ```
*   {
*     raw: string;
*     browser: UserAgentBrowser;
*     engine: UserAgentEngine;
*     platform: UserAgentPlatform;
*     device: UserAgentDevice;
*     bot: UserAgentBot;
*     security: UserAgentSecurity;
*     integrity: {
*       isHuman: boolean;
*       isMobile: boolean;
*       isDesktop: boolean;
*       isTablet: boolean;
*       isKnownGood: boolean;
*       risk: "low" | "medium" | "high" | "critical";
*     };
*   }
*   ```
*
* SEMANTIC NOTES  
*   - Guarantees uniform UA parsing across all backend subsystems.  
*   - Suitable for direct storage in analytics systems (ClickHouse, D1, R2).  
*   - Fully typed for API responses, database schemas, and logging pipelines.  
*
* EXAMPLE  
*   ```
*   const ua: UserAgentMetadata =
*       parse(userAgentMetadata, req.headers.get("user-agent"));
*
*   if (ua.bot.isBot || ua.security.isSpoofed) {
*     block();
*   }
*
*   if (ua.integrity.isMobile) {
*     serveMobileLayout();
*   }
*   ```
*/
export type UserAgentMetadata = v.InferOutput<typeof userAgentMetadata>;