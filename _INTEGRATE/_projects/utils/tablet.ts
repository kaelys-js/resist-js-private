/* =======================================================================
   TABLET OS & DEVICE DETECTORS
======================================================================= */

function detectIPadOS() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    // iPadOS Safari identifies as MacOS + touch events
    const isIPadOS =
        (ua.includes("ipad") ||
         (ua.includes("macintosh") && navigator.maxTouchPoints > 1));

    if (isIPadOS) {
        return {
            device: "iPad",
            os: "iPadOS",
            engine: "WebKit",
            browser: true,
            model: navigator.userAgent
        };
    }
    return null;
}

function detectAndroidTablet() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    const isAndroidTablet =
        ua.includes("android") &&
        !ua.includes("mobile"); // tablets omit "mobile"

    if (isAndroidTablet) {
        return {
            device: "Android Tablet",
            os: "Android",
            engine: "Chromium/WebView",
            browser: true,
            vendor: navigator.vendor
        };
    }
    return null;
}

function detectFireTablet() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("kf") ||            // Kindle Fire codes: KFMAWI, KFMUWI, etc
        ua.includes("silk") ||          // Silk Browser
        ua.includes("amazon")
    ) {
        return {
            device: "Amazon Fire Tablet",
            os: "Fire OS (Android fork)",
            engine: "Silk Browser / Chromium",
            browser: true
        };
    }

    return null;
}

function detectChromeOSTablet() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();
    const isChromeOS = ua.includes("cros");

    // Tablet mode: touch & browser
    if (isChromeOS && navigator.maxTouchPoints > 0) {
        return {
            device: "ChromeOS Tablet",
            os: "ChromeOS",
            engine: "Chromium",
            browser: true
        };
    }
    return null;
}

function detectSurfaceTablet() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    // Windows tablets report Win + touch
    if (
        ua.includes("windows") &&
        navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 0
    ) {
        return {
            device: "Microsoft Surface / Windows Tablet",
            os: "Windows",
            engine: "Edge / Chromium",
            browser: true
        };
    }
    return null;
}

function detectEInkTablet() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("boox") ||
        ua.includes("onyx") ||
        ua.includes("remarkable")
    ) {
        return {
            device: "E-ink Tablet",
            os: "Android or custom Linux",
            engine: "Embedded WebView",
            browser: true
        };
    }

    return null;
}

function detectSailfishTablet() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("sailfish") || ua.includes("jolla")) {
        return {
            device: "Jolla Tablet",
            os: "SailfishOS",
            engine: "WebKit",
            browser: true
        };
    }
    return null;
}

function detectUbuntuTouchTablet() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("ubuntu") && (ua.includes("touch") || ua.includes("tablet"))) {
        return {
            device: "Ubuntu Touch Tablet",
            os: "Ubuntu Touch",
            engine: "QtWebKit",
            browser: true
        };
    }
    return null;
}

function detectLegacyTabletOS() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("hp-touchpad") || ua.includes("webos")) {
        return {
            device: "HP TouchPad",
            os: "webOS",
            engine: "WebKit",
            browser: true
        };
    }

    if (ua.includes("playbook")) {
        return {
            device: "BlackBerry PlayBook",
            os: "QNX / PlayBookOS",
            engine: "WebKit",
            browser: true
        };
    }

    return null;
}

/* =======================================================================
   AGGREGATED TABLET DETECTION
======================================================================= */

export function getAllTabletInfo() {
    return {
        iPadOS: detectIPadOS(),
        androidTablet: detectAndroidTablet(),
        fireTablet: detectFireTablet(),
        chromeOSTablet: detectChromeOSTablet(),
        surfaceTablet: detectSurfaceTablet(),
        einkTablet: detectEInkTablet(),
        sailfish: detectSailfishTablet(),
        ubuntuTouch: detectUbuntuTouchTablet(),
        legacyTablet: detectLegacyTabletOS()
    };
}