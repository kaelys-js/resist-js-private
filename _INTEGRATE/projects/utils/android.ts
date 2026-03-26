/* =======================================================================
   FULL ANDROID RUNTIME & DEVICE INTELLIGENCE DETECTOR
   (Client-side; works in Chrome, Firefox, Samsung Browser, WebViews,
   In-app browsers, PWAs, hybrid apps, Chromebook ARC++ containers)
======================================================================= */

export async function getAndroidInfo() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent;
    const lowerUA = ua.toLowerCase();

    const isAndroid =
        lowerUA.includes("android") ||
        lowerUA.includes("adr") ||
        lowerUA.includes("linux;") && navigator.vendor === "Google Inc.";

    if (!isAndroid) return null;

    /* --------------------------
       ANDROID VERSION
    --------------------------- */
    function getAndroidVersion() {
        const match = ua.match(/Android\s+(\d+)\.?(\d+)?\.?(\d+)?/i);
        if (match) {
            return {
                major: Number(match[1]),
                minor: Number(match[2] || 0),
                patch: Number(match[3] || 0)
            };
        }
        return null;
    }

    /* --------------------------
       DEVICE TYPE DETECTION
    --------------------------- */
    function detectAndroidDeviceType() {
        if (lowerUA.includes("mobile")) return "Phone";
        if (lowerUA.includes("tablet")) return "Tablet";
        if (lowerUA.includes("tv")) return "TV";
        if (lowerUA.includes("vr")) return "VR Headset";
        if (lowerUA.includes("car")) return "Android Auto";
        if (lowerUA.includes("wear")) return "WearOS Watch";

        // Chromebooks running ARC++
        if (ua.includes("CrOS") || ua.includes("Chromebook")) return "Chromebook";

        // Heuristics
        if (navigator.maxTouchPoints > 1 && screen.width > 1000) return "Tablet";
        return "Phone";
    }

    /* --------------------------
       BROWSER / ENGINE DETECTION
    --------------------------- */
    function detectBrowser() {
        return {
            chrome: lowerUA.includes("chrome") && !lowerUA.includes("edg"),
            chromiumWebView:
                lowerUA.includes("wv") ||
                lowerUA.includes("; wv") ||
                lowerUA.includes("version/") && lowerUA.includes("chrome"),

            samsungBrowser: lowerUA.includes("samsungbrowser"),
            firefox: lowerUA.includes("firefox"),
            opera: lowerUA.includes("opr"),
            edge: lowerUA.includes("edg"),
            brave: lowerUA.includes("brave"),
            ucBrowser: lowerUA.includes("ucbrowser"),
            qqBrowser: lowerUA.includes("mqqbrowser"),
            vivoBrowser: lowerUA.includes("vivobrowser"),
            miuiBrowser: lowerUA.includes("miuibrowser"),

            facebookInApp: lowerUA.includes("fbav"),
            instagramInApp: lowerUA.includes("instagram"),
            tiktokInApp: lowerUA.includes("tiktok"),
            redditInApp: lowerUA.includes("reddit"),
            twitterInApp: lowerUA.includes("twitter"),
            discordInApp: lowerUA.includes("discord"),
            linkedinInApp: lowerUA.includes("linkedin"),

            engine: {
                webkit: lowerUA.includes("applewebkit"),
                blink: lowerUA.includes("chrome"),
                gecko: lowerUA.includes("firefox")
            }
        };
    }

    /* --------------------------
       PWA MODE
    --------------------------- */
    function getPWAMode() {
        return {
            isStandalone: window.matchMedia("(display-mode: standalone)").matches,
            installed:
                window.matchMedia("(display-mode: standalone)").matches ||
                (navigator as any).standalone === true
        };
    }

    /* --------------------------
       HARDWARE INFO
    --------------------------- */
    function getHardware() {
        return {
            cpuCores: navigator.hardwareConcurrency ?? null,
            memoryGB: (navigator as any).deviceMemory ?? null,
            maxTouchPoints: navigator.maxTouchPoints,
            devicePixelRatio: window.devicePixelRatio,
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth
            }
        };
    }

    /* --------------------------
       GPU INFO
    --------------------------- */
    function getGPUInfo() {
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") ||
                       canvas.getContext("experimental-webgl");
            if (!gl) return null;

            const debug = gl.getExtension("WEBGL_debug_renderer_info");
            if (!debug) return null;

            return {
                vendor: gl.getParameter(debug.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
            };
        } catch {
            return null;
        }
    }

    /* --------------------------
       BATTERY INFO
    --------------------------- */
    async function getBatteryInfo() {
        try {
            if (navigator.getBattery) {
                const b = await navigator.getBattery();
                return {
                    level: b.level,
                    charging: b.charging,
                    chargingTime: b.chargingTime,
                    dischargingTime: b.dischargingTime
                };
            }
        } catch {}
        return null;
    }

    /* --------------------------
       NETWORK INFO
    --------------------------- */
    function getNetwork() {
        const conn = (navigator as any).connection || {};
        return {
            type: conn.type || null,
            effectiveType: conn.effectiveType || null,
            downlink: conn.downlink || null,
            rtt: conn.rtt || null,
            saveData: conn.saveData || false
        };
    }

    /* --------------------------
       LOCALE INFO
    --------------------------- */
    function getLocale() {
        return {
            language: navigator.language,
            languages: navigator.languages,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: Intl.DateTimeFormat().resolvedOptions().locale
        };
    }

    /* --------------------------
       MEDIA CAPABILITIES
    --------------------------- */
    function getMediaCapabilities() {
        const video = document.createElement("video");

        function can(type: string) {
            return !!video.canPlayType(type);
        }

        return {
            h264: can("video/mp4; codecs='avc1.42E01E'"),
            h265: can("video/mp4; codecs='hev1.1.6.L93.B0'"),
            vp9: can("video/webm; codecs='vp9'"),
            av1: can("video/mp4; codecs='av01.0.05M.08'")
        };
    }

    /* --------------------------
       ACCESSIBILITY
    --------------------------- */
    function getAccessibility() {
        return {
            prefersReducedMotion:
                window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
            highContrast: window.matchMedia("(prefers-contrast: more)").matches,
            invertedColors: window.matchMedia("(inverted-colors: inverted)").matches
        };
    }

    /* --------------------------
       SECURITY SIGNALS
    --------------------------- */
    function getSecurity() {
        return {
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            javaEnabled: navigator.javaEnabled?.() ?? null,
            webdriver: navigator.webdriver ?? false,
            sandboxed: window.self !== window.top
        };
    }

    /* --------------------------
       UTILITY: Is Samsung/Pixel?
    --------------------------- */
    function detectOEM() {
        return {
            isSamsung: lowerUA.includes("samsung") || lowerUA.includes("sm-"),
            isXiaomi: lowerUA.includes("xiaomi") || lowerUA.includes("mi "),
            isHuawei: lowerUA.includes("huawei") || lowerUA.includes("honor"),
            isPixel: lowerUA.includes("pixel"),
            isOppo: lowerUA.includes("oppo"),
            isVivo: lowerUA.includes("vivo"),
            isSony: lowerUA.includes("xperia"),
            isLenovo: lowerUA.includes("lenovo"),
            isLG: lowerUA.includes("lg-"),
        };
    }


    /* --------------------------
       ASSEMBLE ALL
    --------------------------- */
    const battery = await getBatteryInfo();

    return {
        deviceType: detectAndroidDeviceType(),
        osVersion: getAndroidVersion(),
        browser: detectBrowser(),
        pwa: getPWAMode(),
        hardware: getHardware(),
        gpu: getGPUInfo(),
        battery,
        network: getNetwork(),
        locale: getLocale(),
        media: getMediaCapabilities(),
        accessibility: getAccessibility(),
        security: getSecurity(),
        oem: detectOEM(),
        userAgent: ua,
        vendor: navigator.vendor,
        platform: navigator.platform
    };
}