/* =======================================================================
   MOBILE PHONE / SMARTPHONE JS RUNTIME DETECTORS
======================================================================= */

/* --------------------------
   iOS
--------------------------- */
export function detectIOS() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    // iPhones identify as "iPhone" or "Mac" with multi-touch
    const isIOS =
        ua.includes("iphone") ||
        (ua.includes("macintosh") && navigator.maxTouchPoints > 1);

    if (isIOS) {
        return {
            device: "iPhone",
            os: "iOS",
            engine: "WebKit",
            browser: true,
            model: navigator.userAgent
        };
    }
    return null;
}

/* --------------------------
   ANDROID
--------------------------- */
export function detectAndroidPhone() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android") && ua.includes("mobile")) {
        return {
            device: "Android Phone",
            os: "Android",
            engine: "Chromium/WebView",
            browser: true,
            vendor: navigator.vendor
        };
    }
    return null;
}

/* --------------------------
   HARMONYOS (Huawei)
--------------------------- */
export function detectHarmonyOS() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("harmonyos") || ua.includes("hmscore")) {
        return {
            device: "Huawei Phone",
            os: "HarmonyOS",
            engine: "Huawei WebEngine (Chromium)",
            browser: true
        };
    }
    return null;
}

/* --------------------------
   KAIOS (Nokia / Feature Phone)
--------------------------- */
export function detectKaiOS() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("kaios")) {
        return {
            device: "KaiOS Feature Phone",
            os: "KaiOS",
            engine: "Gecko / GeckoView",
            browser: true
        };
    }
    return null;
}

/* --------------------------
   TIZEN MOBILE (Samsung Z-series)
--------------------------- */
export function detectTizenMobile() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("tizen") && ua.includes("mobile")) {
        return {
            device: "Samsung Tizen Phone",
            os: "Tizen",
            engine: "Tizen WebKit",
            browser: true
        };
    }
    return null;
}

/* --------------------------
   SAILFISHOS (Jolla Phones)
--------------------------- */
export function detectSailfishPhone() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("sailfish") || ua.includes("jolla")) {
        return {
            device: "Jolla / SailfishOS Phone",
            os: "SailfishOS",
            engine: "WebKit",
            browser: true
        };
    }
    return null;
}

/* --------------------------
   UBUNTU TOUCH (Mobile)
--------------------------- */
export function detectUbuntuTouchPhone() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("ubuntu") && ua.includes("touch")) {
        return {
            device: "Ubuntu Touch Phone",
            os: "Ubuntu Touch",
            engine: "QtWebKit",
            browser: true
        };
    }
    return null;
}

/* --------------------------
   WINDOWS PHONE (Legacy)
--------------------------- */
export function detectWindowsPhone() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("windows phone") || ua.includes("iemobile")) {
        return {
            device: "Windows Phone",
            os: "Windows Phone / Windows Mobile",
            engine: "Trident / EdgeHTML",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   BLACKBERRY OS + BB10
--------------------------- */
export function detectBlackBerry() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("blackberry") ||
        ua.includes("bb10") ||
        ua.includes("rim")
    ) {
        return {
            device: "BlackBerry Phone",
            os: ua.includes("bb10") ? "BlackBerry 10" : "BlackBerry OS",
            engine: "WebKit / QNX Web Browser",
            browser: true
        };
    }
    return null;
}

/* --------------------------
   FIRE PHONE (Legacy)
--------------------------- */
export function detectFirePhone() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("silk") && ua.includes("mobile")) {
        return {
            device: "Amazon Fire Phone",
            os: "Fire OS",
            engine: "Silk Browser (Chromium fork)",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   LINEAGEOS / CUSTOM ROM
--------------------------- */
export function detectLineageOS() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("lineage")) {
        return {
            device: "Android (LineageOS)",
            os: "LineageOS",
            engine: "Chromium/WebView",
            browser: true
        };
    }
    return null;
}

/* --------------------------
   FIREFOX OS (Legacy)
--------------------------- */
export function detectFirefoxOS() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("firefox") && ua.includes("mobile") && ua.includes("gecko")) {
        return {
            device: "Firefox OS Phone",
            os: "Firefox OS",
            engine: "Gecko",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   GENERIC MOBILE WEBVIEW
--------------------------- */
export function detectGenericMobileWebView() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        navigator.maxTouchPoints > 0 &&
        (ua.includes("mobile") ||
         ua.includes("mobi") ||
         ua.includes("phone") ||
         ua.includes("handheld"))
    ) {
        return {
            device: "Generic Mobile WebView",
            os: "Unknown Mobile OS",
            engine: "WebView",
            browser: true
        };
    }

    return null;
}

/* =======================================================================
   AGGREGATED FULL MOBILE DETECTOR
======================================================================= */

export function getAllMobileInfo() {
    return {
        ios: detectIOS(),
        android: detectAndroidPhone(),
        harmony: detectHarmonyOS(),
        kaios: detectKaiOS(),
        tizenMobile: detectTizenMobile(),
        sailfish: detectSailfishPhone(),
        ubuntuTouch: detectUbuntuTouchPhone(),
        windowsPhone: detectWindowsPhone(),
        blackberry: detectBlackBerry(),
        firePhone: detectFirePhone(),
        lineage: detectLineageOS(),
        firefoxOS: detectFirefoxOS(),
        genericMobile: detectGenericMobileWebView()
    };
}