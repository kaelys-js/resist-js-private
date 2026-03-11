/* ============================================================================
   ACCESSIBILITY INFO COLLECTOR
   Works in all browsers, PWAs, tablets, mobile devices, WebViews.
   Will not throw in non-browser environments.
============================================================================ */

export function getAccessibilityInfo() {
    try {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return {
                environment: "server",
                reducedMotion: null,
                forcedColors: null,
                contrast: null,
                prefersDark: null,
                prefersLight: null,
                highResolutionTime: null,
                touchCapability: null,
                screenReader: null,
                ariaLiveElements: [],
                accessibilityTreeSize: null,
                zoomLevel: null,
                textScale: null,
                platformAPI: null
            };
        }

        const mq = (query: string) =>
            window.matchMedia ? window.matchMedia(query).matches : null;

        /* -------------------------------------------------------------
           1. Media Queries (WCAG + OS accessibility hooks)
        ------------------------------------------------------------- */
        const reducedMotion = mq("(prefers-reduced-motion: reduce)");
        const forcedColors = mq("(forced-colors: active)");
        const highContrast = mq("(prefers-contrast: more)") || mq("(contrast: more)");
        const lowContrast = mq("(prefers-contrast: less)") || mq("(contrast: less)");
        const prefersDark = mq("(prefers-color-scheme: dark)");
        const prefersLight = mq("(prefers-color-scheme: light)");
        const prefersInvertedColors = mq("(inverted-colors: inverted)");

        /* -------------------------------------------------------------
           2. Touch + Pointer
        ------------------------------------------------------------- */
        const touchCap =
            "maxTouchPoints" in navigator ? navigator.maxTouchPoints : null;

        const pointerCoarse = mq("(pointer: coarse)");
        const pointerFine = mq("(pointer: fine)");

        /* -------------------------------------------------------------
           3. Screen Reader Detection (soft signals)
           NOTE: There is no guaranteed JS API — this is best-effort.
        ------------------------------------------------------------- */
        const ariaLiveNodes = Array.from(
            document.querySelectorAll("[aria-live]")
        ).map((el: any) => ({
            tag: el.tagName,
            role: el.getAttribute("role"),
            ariaLive: el.getAttribute("aria-live"),
            text: el.textContent?.slice(0, 200) ?? null
        }));

        const screenReaderMaybe =
            forcedColors ||
            highContrast ||
            ariaLiveNodes.length > 0 ||
            prefersInvertedColors ||
            reducedMotion;

        /* -------------------------------------------------------------
           4. Accessibility Tree Size (approximate)
        ------------------------------------------------------------- */
        const accessibilityTreeSize = (() => {
            try {
                return document.querySelectorAll("*").length;
            } catch {
                return null;
            }
        })();

        /* -------------------------------------------------------------
           5. System Zoom Level
        ------------------------------------------------------------- */
        const zoomLevel = (() => {
            try {
                return window.devicePixelRatio || null;
            } catch {
                return null;
            }
        })();

        /* -------------------------------------------------------------
           6. Text Scaling (mobile accessibility)
        ------------------------------------------------------------- */
        const textScale = (() => {
            try {
                // Android WebView → default 1..2 range
                // iOS Safari usually returns 1
                return parseFloat(
                    window.getComputedStyle(document.documentElement).fontSize
                );
            } catch {
                return null;
            }
        })();

        /* -------------------------------------------------------------
           7. High-Resolution Timer Capability (for animation assists)
        ------------------------------------------------------------- */
        const highResolutionTime =
            typeof performance !== "undefined" &&
            typeof performance.now === "function";

        /* -------------------------------------------------------------
           8. Platform Accessibility APIs (limited detection)
        ------------------------------------------------------------- */
        const platformAPI = {
            voiceOver:
                navigator.userAgent.includes("Mac OS X") &&
                reducedMotion &&
                prefersInvertedColors,
            talkBack:
                navigator.userAgent.includes("Android") && reducedMotion,
            windowsNarrator:
                navigator.userAgent.includes("Windows") &&
                forcedColors === true
        };

        /* -------------------------------------------------------------
           FINAL OUTPUT
        ------------------------------------------------------------- */
        return {
            environment: "browser",

            // Media Query Accessibility Flags
            reducedMotion,
            forcedColors,
            highContrast,
            lowContrast,
            prefersDark,
            prefersLight,
            prefersInvertedColors,

            // Interaction / Pointer
            touchCapability: touchCap,
            pointerCoarse,
            pointerFine,

            // Soft Screen Reader Approximation
            screenReader: screenReaderMaybe,
            ariaLiveElements: ariaLiveNodes,

            // Layout-Based Indicators
            accessibilityTreeSize,
            zoomLevel,
            textScale,

            // Other capabilities
            highResolutionTime,
            platformAPI
        };
    } catch (err: any) {
        return {
            environment: "error",
            error: err?.message ?? String(err)
        };
    }
}