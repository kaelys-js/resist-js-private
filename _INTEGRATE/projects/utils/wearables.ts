/* =======================================================================
   UNIVERSAL WATCH OS DETECTORS
   Covers all watches where JavaScript can run (browser or runtime).
======================================================================= */

import fs from "fs";

function exists(path: string) {
    try { return fs.existsSync(path); } catch { return false; }
}

/* =======================================================================
   1. APPLE WATCH (browser-based JS only)
   Safari WebView inside WatchOS
======================================================================= */
function detectAppleWatch() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    // Safari-on-watch exposes "watch" in platform and a tiny viewport size
    const isAw = (
        ua.includes("watch") ||
        (navigator.platform === "Watch1,1") ||
        (screen?.width <= 200 && screen?.height <= 200 && ua.includes("safari"))
    );

    if (isAw) {
        return {
            watch: "Apple Watch",
            browser: true,
            safariVersion: navigator.userAgent,
            screen: { w: screen.width, h: screen.height }
        };
    }

    return null;
}

/* =======================================================================
   2. WEAR OS (Android-based smartwatches)
======================================================================= */
function detectWearOS() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("wear os") || ua.includes("sm-r8") || ua.includes("watch")) {
        return {
            watch: "Wear OS",
            browser: true,
            vendor: navigator.vendor,
            model: navigator.userAgent
        };
    }

    return null;
}

/* =======================================================================
   3. TIZEN WATCH (Samsung Galaxy Watch older generation)
======================================================================= */
function detectTizenWatch() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("tizen") && ua.includes("watch")) {
        return {
            watch: "Samsung Tizen Watch",
            browser: true,
            engine: "Tizen WebEngine"
        };
    }

    return null;
}

/* =======================================================================
   4. webOS WATCH (rare but some LG experimental)
======================================================================= */
function detectWebOSWatch() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("webos") && ua.includes("watch")) {
        return {
            watch: "webOS Watch",
            browser: true
        };
    }
    return null;
}

/* =======================================================================
   5. FITBIT (JS runtime = Fitbit SDK QuickJS)
======================================================================= */
function detectFitbit() {
    // Fitbit JS environment has globals from Fitbit SDK
    if (typeof globalThis !== "undefined") {
        const g = globalThis as any;
        if (g.messaging || g.settingsStorage || g.document?.location) {
            return {
                watch: "Fitbit",
                sdk: true,
                environment: "Fitbit SDK QuickJS"
            };
        }
    }
    return null;
}

/* =======================================================================
   6. GARMIN CONNECT IQ (MonkeyC + JS companion)
======================================================================= */
function detectGarmin() {
    // Garmin ConnectIQ JS companion app runs on the paired phone,
    // but exposes unique environment variables.
    if (typeof navigator !== "undefined") {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes("garmin connectiq") || ua.includes("connectiq")) {
            return {
                watch: "Garmin Connect IQ",
                companionJS: true
            };
        }
    }

    // device-side monkey C cannot run JS, but companion does.
    return null;
}

/* =======================================================================
   7. AMAZFIT / ZEPP (JS runtime: Zepp OS uses QuickJS)
======================================================================= */
function detectZepp() {
    if (typeof globalThis !== "undefined") {
        const g = globalThis as any;
        if (g.DeviceRuntime || g.App || g.Service) {
            return {
                watch: "Amazfit / Zepp OS",
                environment: "QuickJS-based Zepp Runtime"
            };
        }
    }
    return null;
}

/* =======================================================================
   8. ASTEROIDOS (Linux-based open smartwatch, runs QtWebEngine)
======================================================================= */
function detectAsteroidOS() {
    if (typeof navigator !== "undefined") {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes("asteroidos")) {
            return {
                watch: "AsteroidOS",
                browser: true
            };
        }
    }

    // File signature on device (if running Node)
    if (exists("/etc/asteroid-release")) {
        return {
            watch: "AsteroidOS",
            linux: true
        };
    }

    return null;
}

/* =======================================================================
   9. PEBBLE (JS companion via PebbleKit JS)
======================================================================= */
function detectPebble() {
    // Pebble’s JS runs on the paired phone with PebbleKit JS runtime.
    if (typeof navigator !== "undefined") {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes("pebble app") || ua.includes("pebblekit")) {
            return {
                watch: "Pebble",
                companionJS: true
            };
        }
    }
    return null;
}

/* =======================================================================
   10. HUAWEI WATCH (LiteOS / HarmonyOS with JS APIs)
======================================================================= */
function detectHuaweiWatch() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("harmonyos") && ua.includes("watch")) {
        return {
            watch: "Huawei HarmonyOS Watch",
            browser: true
        };
    }

    return null;
}

/* =======================================================================
   MASTER AGGREGATOR
======================================================================= */
export function getAllWatchInfo() {
    return {
        appleWatch: detectAppleWatch(),
        wearOS: detectWearOS(),
        tizen: detectTizenWatch(),
        webOS: detectWebOSWatch(),
        fitbit: detectFitbit(),
        garmin: detectGarmin(),
        zepp: detectZepp(),
        asteroid: detectAsteroidOS(),
        pebble: detectPebble(),
        huawei: detectHuaweiWatch()
    };
}