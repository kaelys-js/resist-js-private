/* =======================================================================
   FULL IOS RUNTIME & DEVICE INTELLIGENCE DETECTOR
   (Client-side only; works in Safari, WebViews, PWAs, In-App browsers)
======================================================================= */

export async function getIOSInfo() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent;
    const lowerUA = ua.toLowerCase();
    const platform = navigator.platform || "";
    const vendor = navigator.vendor || "";

    const isTouch = typeof navigator.maxTouchPoints !== "undefined" &&
                    navigator.maxTouchPoints > 1;

    const isIOS = (
        /iphone|ipad|ipod/.test(lowerUA) ||
        (platform === "MacIntel" && isTouch) || // iPadOS in Mac disguise
        lowerUA.includes("ios")
    );

    if (!isIOS) return null;

    /* --------------------------
       iOS VERSION PARSING
    --------------------------- */
    function getIOSVersion() {
        // iOS (Safari UA format)
        const match = ua.match(/OS (\d+)_?(\d+)?_?(\d+)?/);
        if (match) {
            return {
                major: Number(match[1]),
                minor: Number(match[2] || 0),
                patch: Number(match[3] || 0)
            };
        }

        // iPadOS masquerades as MacOS: force guess via screen size
        if (platform === "MacIntel" && isTouch) {
            return {
                major: 13, // minimum for iPadOS disguise
                minor: 0,
                patch: 0
            };
        }

        return null;
    }

    /* --------------------------
       Device Type
    --------------------------- */
    function detectDeviceType() {
        if (lowerUA.includes("iphone")) return "iPhone";
        if (lowerUA.includes("ipod")) return "iPod";
        if (lowerUA.includes("ipad")) return "iPad";

        // iPadOS 13+ pretending to be MacOS
        if (platform === "MacIntel" && isTouch) return "iPad";

        return "iOS Device (Unknown)";
    }

    /* --------------------------
       Browser / Engine Detection
    --------------------------- */
    function detectBrowserEngine() {
        // ALWAYS WebKit-based on iOS, regardless of browser shell
        const isWKWebView =
            !(window as any).safari ||
            lowerUA.includes("wkwebview");

        return {
            engine: "WebKit",
            wkWebView: isWKWebView,

            // Chromium-styled browsers still use WKWebView underneath
            chromeSkin: lowerUA.includes("crios"),
            firefoxSkin: lowerUA.includes("fxios"),
            operaSkin: lowerUA.includes("opios"),

            // In-app browsers:
            facebookInApp: lowerUA.includes("fbav"),
            instagramInApp: lowerUA.includes("instagram"),
            tikTokInApp: lowerUA.includes("tiktok"),
            redditInApp: lowerUA.includes("reddit"),
            twitterInApp: lowerUA.includes("twitter") && lowerUA.includes("like mac"),

            nativeSafari: !!(window as any).safari
        };
    }

    /* --------------------------
       WebApp / PWA Mode
    --------------------------- */
    function getPWAMode() {
        return {
            standalone: (window as any).navigator.standalone || false,
            displayMode: getComputedStyle(document.documentElement)
                .getPropertyValue("--display-mode") || null,
            isInstalledPWA:
                window.matchMedia("(display-mode: standalone)").matches ||
                (window as any).navigator.standalone === true
        };
    }

    /* --------------------------
       Hardware / Performance
    --------------------------- */
    function getHardware() {
        return {
            cpuCores: navigator.hardwareConcurrency || null,
            memoryGB: (navigator as any).deviceMemory || null,
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
       GPU Info
    --------------------------- */
    function getGPUInfo() {
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (!gl) return null;

            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            if (!debugInfo) return null;

            return {
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            };
        } catch {
            return null;
        }
    }

    /* --------------------------
       Battery (Safari supports it)
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
       Network Info
    --------------------------- */
    function getNetworkInfo() {
        const conn = (navigator as any).connection || {};
        return {
            effectiveType: conn.effectiveType || null,
            downlink: conn.downlink || null,
            rtt: conn.rtt || null,
            saveData: conn.saveData || false
        };
    }

    /* --------------------------
       Locale
    --------------------------- */
    function getLocaleInfo() {
        return {
            language: navigator.language,
            languages: navigator.languages,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: Intl.DateTimeFormat().resolvedOptions().locale
        };
    }

    /* --------------------------
       Media Capabilities
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
       Accessibility & Preferences
    --------------------------- */
    function getAccessibility() {
        return {
            prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
            highContrast: window.matchMedia("(prefers-contrast: more)").matches,
            invertedColors: window.matchMedia("(inverted-colors: inverted)").matches
        };
    }

    /* --------------------------
       iOS Security & Policy Signals
    --------------------------- */
    function getSecuritySignals() {
        return {
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            safariITPEnabled: true, // ALWAYS on for Safari
            privateMode: false // Hard to truly detect – disabled for reliability
        };
    }

    /* --------------------------
       Build full object
    --------------------------- */
    const battery = await getBatteryInfo();

    return {
        deviceType: detectDeviceType(),
        osVersion: getIOSVersion(),
        engine: detectBrowserEngine(),
        hardware: getHardware(),
        gpu: getGPUInfo(),
        battery,
        network: getNetworkInfo(),
        locale: getLocaleInfo(),
        media: getMediaCapabilities(),
        accessibility: getAccessibility(),
        pwa: getPWAMode(),
        security: getSecuritySignals(),
        userAgent: ua,
        platform,
        vendor
    };
}