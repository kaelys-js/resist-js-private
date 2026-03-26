/* ============================================================================
   BROWSER INFO COLLECTOR — FULL, MAXIMUM DETAIL VERSION
   Works in any browser, PWA, WebView, iframe, or embed.
============================================================================ */
export const browserInfoCollector = {
    name: "browser-info",
    tags: ["browser", "client", "environment"],
    when: ["client-ready"],

    run: async () => {
        try {
            // -----------------------------
            // Basic browser identification
            // -----------------------------
            const ua = navigator.userAgent || "";
            const platform = navigator.platform || "";
            const vendor = navigator.vendor || "";
            const language = navigator.language || "";
            const languages = navigator.languages || [];
            const standalone = (navigator as any).standalone || false; // iOS PWA

            // -----------------------------
            // Browser capabilities
            // -----------------------------
            const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

            const connection = (navigator as any).connection ?? null;

            const deviceMemory = (navigator as any).deviceMemory ?? null;
            const hardwareConcurrency = navigator.hardwareConcurrency ?? null;

            const cookieEnabled = navigator.cookieEnabled ?? null;

            const doNotTrack =
                navigator.doNotTrack ||
                (window as any).doNotTrack ||
                (navigator as any).msDoNotTrack ||
                null;

            // -----------------------------
            // Permissions (safe attempt)
            // -----------------------------
            async function getPermission(name: PermissionName) {
                try {
                    // Safari doesn't support PermissionStatus.state for many items
                    const result = await (navigator as any).permissions.query({ name });
                    return result?.state ?? null;
                } catch {
                    return null;
                }
            }

            const permissions = {
                camera: await getPermission("camera" as PermissionName),
                microphone: await getPermission("microphone" as PermissionName),
                geolocation: await getPermission("geolocation" as PermissionName),
                notifications: await getPermission("notifications" as PermissionName),
                midi: await getPermission("midi" as PermissionName),
                push: await getPermission("push" as PermissionName)
            };

            // -----------------------------
            // Screen / viewport
            // -----------------------------
            const screenInfo = {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                orientation: (screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation)?.type ?? null,
                pixelRatio: window.devicePixelRatio ?? 1,
            };

            const viewport = {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight,
            };

            // -----------------------------
            // Storage
            // -----------------------------
            async function getStorageEstimate() {
                try {
                    if (navigator.storage?.estimate) {
                        const est = await navigator.storage.estimate();
                        return {
                            quota: est.quota ?? null,
                            usage: est.usage ?? null,
                            percentUsed: est.quota && est.usage ? est.usage / est.quota : null
                        };
                    }
                } catch { }
                return null;
            }

            const storage = await getStorageEstimate();

            // -----------------------------
            // WebGL / GPU detection
            // -----------------------------
            function getWebGLInfo() {
                try {
                    const canvas = document.createElement("canvas");
                    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
                    if (!gl) return null;

                    const debug = gl.getExtension("WEBGL_debug_renderer_info");
                    return {
                        vendor:
                            debug && gl.getParameter(debug.UNMASKED_VENDOR_WEBGL),
                        renderer:
                            debug && gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),
                        webglVersion: gl.getParameter(gl.VERSION),
                        shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
                    };
                } catch {
                    return null;
                }
            }

            const webgl = getWebGLInfo();

            // -----------------------------
            // WebRTC capabilities
            // -----------------------------
            function getWebRTCInfo() {
                try {
                    const support = {
                        RTCPeerConnection: !!window.RTCPeerConnection,
                        mediaDevices: !!navigator.mediaDevices,
                        getUserMedia: !!navigator.mediaDevices?.getUserMedia,
                        getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
                        connectionState:
                            (navigator as any).connection?.type || null
                    };
                    return support;
                } catch {
                    return null;
                }
            }

            const webrtc = getWebRTCInfo();

            // -----------------------------
            // Browser features support matrix
            // -----------------------------
            const features = {
                serviceWorker: "serviceWorker" in navigator,
                bluetooth: "bluetooth" in navigator,
                usb: "usb" in navigator,
                battery: "getBattery" in navigator,
                nfc: "NDEFReader" in window,
                clipboard: "clipboard" in navigator,
                share: "share" in navigator,
                fullscreen: document.fullscreenEnabled ?? false,
                vibration: "vibrate" in navigator,
                webshare: "share" in navigator,
            };

            // -----------------------------
            // Battery (optional)
            // -----------------------------
            async function getBattery() {
                try {
                    if ("getBattery" in navigator) {
                        const b = await (navigator as any).getBattery();
                        return {
                            charging: b.charging,
                            level: b.level,
                            chargingTime: b.chargingTime,
                            dischargingTime: b.dischargingTime,
                        };
                    }
                } catch { }
                return null;
            }
            const battery = await getBattery();

            // -----------------------------
            // PWA detection
            // -----------------------------
            const isStandalone =
                window.matchMedia("(display-mode: standalone)").matches ||
                (navigator as any).standalone === true;

            // -----------------------------
            // Network info
            // -----------------------------
            const network = connection
                ? {
                    downlink: connection.downlink,
                    effectiveType: connection.effectiveType,
                    rtt: connection.rtt,
                    saveData: connection.saveData,
                }
                : null;

            // -----------------------------
            // Performance metrics
            // -----------------------------
            const perf = performance?.timing
                ? {
                    navigationStart: performance.timing.navigationStart,
                    domInteractive: performance.timing.domInteractive,
                    domContentLoaded: performance.timing.domContentLoadedEventEnd,
                    load: performance.timing.loadEventEnd,
                }
                : null;

            // -----------------------------
            // Return final object
            // -----------------------------
            return {
                ua,
                platform,
                vendor,
                language,
                languages,
                standalone,
                hasTouch,
                connection: network,
                deviceMemory,
                hardwareConcurrency,
                cookieEnabled,
                doNotTrack,
                permissions,
                screen: screenInfo,
                viewport,
                storage,
                webgl,
                webrtc,
                battery,
                features,
                pwa: isStandalone
            };

        } catch (err: any) {
            return {
                error: err?.message ?? "Unknown error",
                stack: err?.stack ?? null
            };
        }
    }
};

export const browserIdentityCollector = {
    name: "browser-identity",
    tags: ["browser", "identity"],
    when: ["client-ready"],

    run() {
        return {
            userAgent: navigator.userAgent || null,
            platform: navigator.platform || null,
            vendor: navigator.vendor || null,
            appVersion: navigator.appVersion || null,
            product: navigator.product || null,
            productSub: navigator.productSub || null,
            vendorSub: navigator.vendorSub || null,
        };
    }
};

export const browserOSCollector = {
    name: "browser-os",
    tags: ["browser", "os"],
    when: ["client-ready"],

    run() {
        const ua = navigator.userAgent || "";
        const platform = navigator.platform || "";

        const isIOS = /iP(ad|hone|od)/i.test(ua);
        const isAndroid = /Android/i.test(ua);
        const isWindows = /Win/i.test(platform);
        const isMac = /Mac/i.test(platform);
        const isLinux = /Linux/i.test(platform);

        return {
            ua,
            platform,
            isIOS,
            isAndroid,
            isWindows,
            isMac,
            isLinux,
        };
    }
};

export const browserDeviceTypeCollector = {
    name: "browser-device-type",
    tags: ["browser", "device"],
    when: ["client-ready"],

    run() {
        const ua = navigator.userAgent;

        return {
            isMobile: /Mobi|Android/i.test(ua),
            isTablet: /Tablet|iPad/i.test(ua),
            isDesktop: !/Mobi|Android|Tablet|iPad/i.test(ua),
        };
    }
};

export const browserEngineCollector = {
    name: "browser-engine",
    tags: ["browser", "engine"],
    when: ["client-ready"],

    run() {
        const ua = navigator.userAgent;

        return {
            blink: /Chrome|Chromium|Edge/i.test(ua),
            webkit: /Safari/i.test(ua) && !/Chrome|Chromium/i.test(ua),
            gecko: /Firefox/i.test(ua),
        };
    }
};

export const browserBrandCollector = {
    name: "browser-brand",
    tags: ["browser", "brand"],
    when: ["client-ready"],

    run() {
        const nav = navigator as any;

        return {
            brands: nav.userAgentData?.brands ?? null,
            mobile: nav.userAgentData?.mobile ?? null,
            platform: nav.userAgentData?.platform ?? null,
        };
    }
};

export const browserCPUCollector = {
    name: "browser-cpu",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        return {
            hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        };
    }
};

export const browserMemoryCollector = {
    name: "browser-memory",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        const nav = navigator as any;
        return {
            deviceMemoryGB: nav.deviceMemory ?? null, // Chrome & Android only
        };
    }
};

export const browserGPUCollector = {
    name: "browser-gpu",
    tags: ["browser", "gpu"],
    when: ["client-ready"],

    run() {
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (!gl) return null;

            const debug = gl.getExtension("WEBGL_debug_renderer_info");

            return {
                vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
                renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
                version: gl.getParameter(gl.VERSION),
                shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
            };
        } catch {
            return null;
        }
    }
};

export const browserHardwareFeaturesCollector = {
    name: "browser-hardware-features",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        return {
            touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
            vibration: "vibrate" in navigator,
            bluetooth: "bluetooth" in navigator,
            usb: "usb" in navigator,
            nfc: "NDEFReader" in window,
        };
    }
};

export const browserBatteryCollector = {
    name: "browser-battery",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    async run() {
        try {
            const n = navigator as any;
            if (!n.getBattery) return null;
            const b = await n.getBattery();

            return {
                charging: b.charging,
                level: b.level,
                chargingTime: b.chargingTime,
                dischargingTime: b.dischargingTime,
            };
        } catch {
            return null;
        }
    }
};

export const browserScreenCollector = {
    name: "browser-screen-info",
    tags: ["browser", "screen", "display"],
    when: ["client-ready"],

    run() {
        return {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            orientation:
                screen.orientation?.type ??
                (screen as any).mozOrientation ??
                (screen as any).msOrientation ??
                null,
        };
    }
};

export const browserViewportCollector = {
    name: "browser-viewport-info",
    tags: ["browser", "viewport", "display"],
    when: ["client-ready"],

    run() {
        return {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
            pixelRatio: window.devicePixelRatio ?? 1,
        };
    }
};

export const browserColorProfileCollector = {
    name: "browser-color-profile",
    tags: ["browser", "display"],
    when: ["client-ready"],

    run() {
        return {
            colorGamut: {
                srgb: matchMedia("(color-gamut: srgb)").matches,
                p3: matchMedia("(color-gamut: p3)").matches,
                rec2020: matchMedia("(color-gamut: rec2020)").matches,
            },
            hdr: {
                hdr: matchMedia("(dynamic-range: high)").matches,
                standard: matchMedia("(dynamic-range: standard)").matches,
            },
        };
    }
};

export const browserDisplayModeCollector = {
    name: "browser-display-mode",
    tags: ["browser", "display", "pwa"],
    when: ["client-ready"],

    run() {
        return {
            standalone: matchMedia("(display-mode: standalone)").matches,
            fullscreen: matchMedia("(display-mode: fullscreen)").matches,
            minimalUi: matchMedia("(display-mode: minimal-ui)").matches,
            browser: matchMedia("(display-mode: browser)").matches,
            isPWA: (navigator as any).standalone === true ||
                matchMedia("(display-mode: standalone)").matches,
        };
    }
};

export const browserTouchCollector = {
    name: "browser-touch-info",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        return {
            hasTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
            maxTouchPoints: navigator.maxTouchPoints || 0,
            touchEventSupport: "TouchEvent" in window,
            pointerEventSupport: "PointerEvent" in window,
        };
    }
};

export const browserPointerTypeCollector = {
    name: "browser-pointer-type",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        const types = {
            finePointer: matchMedia("(pointer: fine)").matches,     // mouse
            coarsePointer: matchMedia("(pointer: coarse)").matches, // touchscreen
            none: matchMedia("(pointer: none)").matches,
        };

        const hovers = {
            canHover: matchMedia("(hover: hover)").matches,
            cannotHover: matchMedia("(hover: none)").matches,
        };

        return { types, hovers };
    }
};

export const browserGamepadCollector = {
    name: "browser-gamepad-info",
    tags: ["browser", "input", "gamepad"],
    when: ["client-ready"],

    run() {
        return {
            supported: "getGamepads" in navigator,
            connected: navigator.getGamepads
                ? navigator.getGamepads().filter(g => g).length
                : 0,
        };
    }
};

export const browserMotionSensorCollector = {
    name: "browser-motion-sensors",
    tags: ["browser", "sensors"],
    when: ["client-ready"],

    run() {
        return {
            deviceMotion: "DeviceMotionEvent" in window,
            deviceOrientation: "DeviceOrientationEvent" in window,
            absoluteOrientation: "AbsoluteOrientationSensor" in window,
            relativeOrientation: "RelativeOrientationSensor" in window,
            accelerometer: "Accelerometer" in window,
            gyroscope: "Gyroscope" in window,
        };
    }
};

export const browserAmbientLightCollector = {
    name: "browser-ambient-light",
    tags: ["browser", "sensors"],
    when: ["client-ready"],

    run() {
        return {
            supported: "AmbientLightSensor" in window,
        };
    }
};

export const browserStylusCollector = {
    name: "browser-stylus-info",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        return {
            pointerEvents: "PointerEvent" in window,
            stylusPressure: matchMedia("(pointer: fine)").matches
                ? "maybe"
                : null, // real detection requires PointerEvent sampling
            penSupport: matchMedia("(any-pointer: fine)").matches,
        };
    }
};

export const browserNetworkCollector = {
    name: "browser-network-info",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const conn = (navigator as any).connection || null;

        return conn
            ? {
                supported: true,
                downlink: conn.downlink ?? null,
                downlinkMax: conn.downlinkMax ?? null,
                effectiveType: conn.effectiveType ?? null,
                rtt: conn.rtt ?? null,
                saveData: conn.saveData ?? false,
            }
            : { supported: false };
    }
};

export const browserOnlineStatusCollector = {
    name: "browser-online-status",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        return {
            online: navigator.onLine,
        };
    }
};

export const browserConnectionTypeCollector = {
    name: "browser-connection-type",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const conn = (navigator as any).connection;
        return {
            type: conn?.type ?? null,
            effectiveType: conn?.effectiveType ?? null,
        };
    }
};

export const browserDataSaverCollector = {
    name: "browser-data-saver",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const conn = (navigator as any).connection;
        return {
            saveData: conn?.saveData ?? false,
        };
    }
};

export const browserPermissionsCollector = {
    name: "browser-permissions",
    tags: ["browser", "permissions"],
    when: ["client-ready"],

    async run() {
        async function get(name) {
            try {
                const p = await (navigator as any).permissions.query({ name });
                return p?.state ?? null;
            } catch {
                return null;
            }
        }

        return {
            geolocation: await get("geolocation"),
            camera: await get("camera"),
            microphone: await get("microphone"),
            notifications: await get("notifications"),
            midi: await get("midi"),
            push: await get("push"),
            backgroundSync: await get("background-sync"),
            clipboardRead: await get("clipboard-read"),
            clipboardWrite: await get("clipboard-write"),
        };
    }
};

export const browserClipboardCollector = {
    name: "browser-clipboard-info",
    tags: ["browser", "permissions"],
    when: ["client-ready"],

    run() {
        return {
            supported: "clipboard" in navigator,
            read: "read" in (navigator.clipboard || {}),
            write: "write" in (navigator.clipboard || {}),
        };
    }
};

export const browserPushCollector = {
    name: "browser-push-info",
    tags: ["browser", "permissions"],
    when: ["client-ready"],

    run() {
        return {
            pushManager: "PushManager" in window,
            notificationSupported: "Notification" in window,
            permission: typeof Notification !== "undefined"
                ? Notification.permission
                : null
        };
    }
};

export const browserMidiCollector = {
    name: "browser-midi-info",
    tags: ["browser", "permissions"],
    when: ["client-ready"],

    run() {
        return {
            supported: "requestMIDIAccess" in navigator,
        };
    }
};

export const browserNFCCollector = {
    name: "browser-nfc-info",
    tags: ["browser", "permissions", "nfc"],
    when: ["client-ready"],

    run() {
        return {
            supported: "NDEFReader" in window,
        };
    }
};

export const browserDeviceConnectorsCollector = {
    name: "browser-device-connectors",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        return {
            bluetooth: "bluetooth" in navigator,
            usb: "usb" in navigator,
            serial: "serial" in navigator,
            hid: "hid" in navigator, // game controllers, keyboards etc.
        };
    }
};

export const browserSecureContextCollector = {
    name: "browser-secure-context",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        return {
            isSecureContext: window.isSecureContext ?? null,
            protocol: location.protocol,
            origin: location.origin,
        };
    }
};

export const browserPrivateModeCollector = {
    name: "browser-private-mode",
    tags: ["browser", "privacy"],
    when: ["client-ready"],

    async run() {
        try {
            // Safari private mode: fails on IndexedDB
            const test = indexedDB.open("test");
            return new Promise(resolve => {
                test.onsuccess = () => resolve({ private: false, method: "indexedDB" });
                test.onerror = () => resolve({ private: true, method: "indexedDB" });
            });
        } catch {
            return { private: true, method: "try/catch" };
        }
    }
};

export const browserReferrerPolicyCollector = {
    name: "browser-referrer-policy",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        return {
            referrer: document.referrer || null,
            referrerPolicy: document?.referrerPolicy ?? null,
        };
    }
};

export const browserCookieCollector = {
    name: "browser-cookie-support",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        return {
            cookiesEnabled: navigator.cookieEnabled ?? null,
            thirdPartyCookieTestPossible: "cookieStore" in window,
        };
    }
};

export const browserStorageQuotaCollector = {
    name: "browser-storage-quota",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        try {
            const est = await navigator.storage?.estimate?.();
            return {
                quota: est?.quota ?? null,
                usage: est?.usage ?? null,
                percentUsed:
                    est?.quota && est?.usage ? est.usage / est.quota : null
            };
        } catch {
            return null;
        }
    }
};

export const browserWebStorageCollector = {
    name: "browser-web-storage",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    run() {
        function canUse(fn) {
            try {
                fn();
                return true;
            } catch {
                return false;
            }
        }

        return {
            localStorage: canUse(() => localStorage.setItem("_t", "1")),
            sessionStorage: canUse(() => sessionStorage.setItem("_t", "1"))
        };
    }
};

export const browserIndexedDBCollector = {
    name: "browser-indexeddb",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        try {
            if (!("indexedDB" in window)) return { supported: false };

            const req = indexedDB.open("test-idb-support");
            return await new Promise(resolve => {
                req.onsuccess = () => resolve({ supported: true });
                req.onerror = () => resolve({ supported: false });
            });
        } catch {
            return { supported: false };
        }
    }
};

export const browserCacheAPICOllector = {
    name: "browser-cache-api",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        try {
            const supported = "caches" in window;
            return { supported };
        } catch {
            return { supported: false };
        }
    }
};

export const browserIframeContextCollector = {
    name: "browser-iframe-context",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        return {
            inIframe: window.self !== window.top,
            sameOrigin:
                (() => {
                    try {
                        return window.top?.location.host === location.host;
                    } catch {
                        return false;
                    }
                })(),
            frameAncestors: document.referrer || null,
        };
    }
};

export const browserStorageAvailabilityCollector = {
    name: "browser-storage-availability",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        const results = {
            localStorage: false,
            sessionStorage: false,
            indexedDB: false,
            cacheAPI: false,
        };

        // localStorage
        try {
            localStorage.setItem("_t", "1");
            localStorage.removeItem("_t");
            results.localStorage = true;
        } catch { }

        // sessionStorage
        try {
            sessionStorage.setItem("_t", "1");
            sessionStorage.removeItem("_t");
            results.sessionStorage = true;
        } catch { }

        // IndexedDB
        try {
            const req = indexedDB.open("test-idb");
            await new Promise(resolve => {
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            });
            results.indexedDB = true;
        } catch { }

        // Cache API
        try {
            results.cacheAPI = "caches" in window;
        } catch { }

        return results;
    }
};

export const browserServiceWorkerCollector = {
    name: "browser-service-worker",
    tags: ["browser", "features", "pwa"],
    when: ["client-ready"],

    run() {
        return {
            supported: "serviceWorker" in navigator,
            controller: navigator.serviceWorker?.controller ? true : false,
            state: navigator.serviceWorker?.controller?.state ?? null
        };
    }
};

export const browserWebRTCSupportCollector = {
    name: "browser-webrtc-support",
    tags: ["browser", "features", "webrtc"],
    when: ["client-ready"],

    run() {
        return {
            RTCPeerConnection: "RTCPeerConnection" in window,
            getUserMedia: !!navigator.mediaDevices?.getUserMedia,
            getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
            mediaDevices: "mediaDevices" in navigator,
        };
    }
};

export const browserWebAuthnCollector = {
    name: "browser-webauthn-support",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        return {
            webauthn: "PublicKeyCredential" in window,
            conditionalUI: (window as any).PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable
                ? "supported"
                : "unknown",
        };
    }
};

export const browserWebGPUCollector = {
    name: "browser-webgpu-support",
    tags: ["browser", "gpu"],
    when: ["client-ready"],

    run() {
        return {
            supported: !!(navigator as any).gpu,
            adapter: null,
        };
    }
};

export const browserWebShareCollector = {
    name: "browser-webshare",
    tags: ["browser", "features"],
    when: ["client-ready"],

    run() {
        const nav = navigator as any;

        return {
            webShare: "share" in nav,
            webShareFiles: "canShare" in nav,
            shareTarget: "launchQueue" in window, // Web Share Target API
        };
    }
};

export const browserFSAccessCollector = {
    name: "browser-fs-access",
    tags: ["browser", "features"],
    when: ["client-ready"],

    run() {
        return {
            filePicker: "showOpenFilePicker" in window,
            directoryPicker: "showDirectoryPicker" in window,
            saveFilePicker: "showSaveFilePicker" in window,
            legacyFileInput: "FileReader" in window,
        };
    }
};

export const browserDeviceAPIsCollector = {
    name: "browser-device-apis",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        return {
            bluetooth: "bluetooth" in navigator,
            usb: "usb" in navigator,
            hid: "hid" in navigator,
            serial: "serial" in navigator,
            nfc: "NDEFReader" in window
        };
    }
};

export const browserSpeechCollector = {
    name: "browser-speech-apis",
    tags: ["browser", "audio"],
    when: ["client-ready"],

    run() {
        return {
            speechSynthesis: "speechSynthesis" in window,
            speechRecognition:
                "webkitSpeechRecognition" in window ||
                "SpeechRecognition" in window,
        };
    }
};

export const browserPaymentAPICollector = {
    name: "browser-payment-api",
    tags: ["browser", "payments"],
    when: ["client-ready"],

    run() {
        return {
            supported: "PaymentRequest" in window,
        };
    }
};

export const browserMediaCapabilitiesCollector = {
    name: "browser-media-capabilities",
    tags: ["browser", "media"],
    when: ["client-ready"],

    run() {
        const video = document.createElement("video");

        function can(codec: string) {
            try {
                return video.canPlayType(codec) || "no";
            } catch {
                return "no";
            }
        }

        return {
            codecs: {
                h264: can('video/mp4; codecs="avc1.42E01E"'),
                vp9: can('video/webm; codecs="vp9"'),
                av1: can('video/mp4; codecs="av01.0.05M.08"'),
                hevc: can('video/mp4; codecs="hvc1.1.6.L93"'),
            },
            hdr: {
                hlg: matchMedia("(dynamic-range: high)").matches,   // simplified
                pq: matchMedia("(dynamic-range: high)").matches,
            }
        };
    }
};

export const browserNavigationTimingCollector = {
    name: "browser-navigation-timing",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const timing = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        if (!timing) return { available: false };

        return {
            available: true,
            type: timing.type,
            startTime: timing.startTime,
            duration: timing.duration,
            domContentLoaded: timing.domContentLoadedEventEnd,
            loadEvent: timing.loadEventEnd,
            redirectCount: timing.redirectCount,
            transferSize: timing.transferSize,
            encodedBodySize: timing.encodedBodySize,
            decodedBodySize: timing.decodedBodySize,
        };
    }
};

export const browserPaintTimingCollector = {
    name: "browser-paint-timing",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const paints = performance.getEntriesByType("paint") as PerformanceEntry[];
        const out: any = {};

        for (const p of paints) {
            out[p.name] = p.startTime;
        }

        return out;
    }
};

export const browserLongTasksCollector = {
    name: "browser-long-tasks",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const entries = performance.getEntriesByType("longtask") as any[];
        return entries.map(e => ({
            start: e.startTime,
            duration: e.duration,
            attribution: e.attribution
        }));
    }
};

export const browserMemoryInfoCollector = {
    name: "browser-memory-info",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const mem = (performance as any).memory;
        return mem
            ? {
                jsHeapSizeLimit: mem.jsHeapSizeLimit,
                totalJSHeapSize: mem.totalJSHeapSize,
                usedJSHeapSize: mem.usedJSHeapSize,
            }
            : { available: false };
    }
};

export const browserBatteryCollector = {
    name: "browser-battery-info",
    tags: ["browser", "device", "power"],
    when: ["client-ready"],

    async run() {
        if (!navigator.getBattery) return { available: false };

        const b = await navigator.getBattery();

        return {
            charging: b.charging,
            level: b.level,
            chargingTime: b.chargingTime,
            dischargingTime: b.dischargingTime,
        };
    }
};

export const browserCPUInfoCollector = {
    name: "browser-cpu-info",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        return {
            cores: navigator.hardwareConcurrency ?? null,
            deviceMemory: (navigator as any).deviceMemory ?? null,
            cpuThreads: navigator.hardwareConcurrency ?? null,
        };
    }
};

export const browserResourceTimingCollector = {
    name: "browser-resource-timing",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

        return entries.map(r => ({
            name: r.name,
            startTime: r.startTime,
            duration: r.duration,
            transferSize: r.transferSize,
            encodedBodySize: r.encodedBodySize,
            decodedBodySize: r.decodedBodySize,
            initiatorType: r.initiatorType,
        }));
    }
};

export const browserPWAInstallabilityCollector = {
    name: "browser-pwa-installability",
    tags: ["browser", "pwa"],
    when: ["client-ready"],

    run() {
        return {
            standalone: window.matchMedia("(display-mode: standalone)").matches,
            installed: (navigator as any).standalone === true,
            manifestLink: document.querySelector("link[rel='manifest']")?.getAttribute("href") ?? null,
        };
    }
};

export const browserManifestCollector = {
    name: "browser-manifest-info",
    tags: ["browser", "pwa"],
    when: ["client-ready"],

    async run() {
        const link = document.querySelector("link[rel='manifest']")?.href;
        if (!link) return { manifest: null };

        try {
            const res = await fetch(link);
            const json = await res.json();
            return { manifest: json };
        } catch {
            return { manifest: "failed-to-load" };
        }
    }
};

export const browserWebVitalsCollector = {
    name: "browser-web-vitals",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const result: any = {};

        // CLS
        try {
            const obs = new PerformanceObserver(list => {
                for (const e of list.getEntries()) {
                    if (e.entryType === "layout-shift" && !e.hadRecentInput) {
                        result.cls = (result.cls || 0) + e.value;
                    }
                }
            });
            obs.observe({ type: "layout-shift", buffered: true });
        } catch { }

        // LCP
        try {
            const obs = new PerformanceObserver(list => {
                const last = list.getEntries().pop();
                if (last) result.lcp = last.renderTime || last.loadTime;
            });
            obs.observe({ type: "largest-contentful-paint", buffered: true });
        } catch { }

        // INP (FID successor)
        try {
            const obs = new PerformanceObserver(list => {
                const last = list.getEntries().pop();
                if (last) result.inp = last.duration;
            });
            obs.observe({ type: "event", buffered: true, durationThreshold: 40 });
        } catch { }

        return result;
    }
};

export const browserNetworkInfoCollector = {
    name: "browser-network-info",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

        if (!conn) return { available: false };

        return {
            available: true,
            type: conn.type ?? null,
            effectiveType: conn.effectiveType ?? null,
            downlink: conn.downlink ?? null,
            rtt: conn.rtt ?? null,
            saveData: conn.saveData ?? null
        };
    }
};

export const browserRTTCollector = {
    name: "browser-rtt-estimate",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const nav = performance.getEntriesByType("navigation")[0] as any;
        if (!nav) return { available: false };

        const rtt =
            (nav.domainLookupEnd - nav.domainLookupStart) +
            (nav.connectEnd - nav.connectStart);

        return {
            available: true,
            rttEstimate: Math.max(0, rtt),
            navTimingSource: true
        };
    }
};

export const browserIndexedDBQuotaCollector = {
    name: "browser-indexeddb-quota",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        if (!navigator.storage || !navigator.storage.estimate)
            return { available: false };

        const { quota, usage } = await navigator.storage.estimate();
        return {
            available: true,
            quota,
            usage,
            percentUsed: quota ? (usage / quota) : null,
        };
    }
};

export const browserStorageCapacityCollector = {
    name: "browser-storage-capacity",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    run() {
        function testStorage(type: "localStorage" | "sessionStorage") {
            try {
                const s = window[type];
                const testKey = "__test__";
                let data = "x";
                while (true) {
                    s.setItem(testKey, data);
                    data = data + data; // grow exponentially
                }
            } catch (err: any) {
                return {
                    supported: true,
                    approxLimit: err?.length ?? null
                };
            }
        }

        return {
            localStorage: testStorage("localStorage"),
            sessionStorage: testStorage("sessionStorage"),
        };
    }
};

export const browserCookieSupportCollector = {
    name: "browser-cookie-support",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        let basic = false;
        try {
            document.cookie = "cookietest=1";
            basic = document.cookie.indexOf("cookietest=") !== -1;
        } catch { }

        return {
            cookiesEnabled: navigator.cookieEnabled,
            basicCookieSet: basic,
            sameSiteLax: "sameSite" in (document as any),
            secureSupported: location.protocol === "https:"
        };
    }
};

export const browserCacheStorageCollector = {
    name: "browser-cache-storage",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        if (!("caches" in window)) return { available: false };

        const names = await caches.keys();
        return {
            available: true,
            cacheNames: names,
        };
    }
};

export const browserFontCollector = {
    name: "browser-installed-fonts",
    tags: ["browser", "fonts"],
    when: ["client-ready"],

    run() {
        // Known system fonts to test
        const candidates = [
            "Arial", "Verdana", "Times New Roman", "Georgia", "Courier New",
            "Roboto", "Inter", "Helvetica", "Monaco", "Menlo"
        ];

        const testString = "mmmmmmmmmmlli";
        const baseFonts = ["monospace", "sans-serif", "serif"];

        const span = document.createElement("span");
        span.style.fontSize = "72px";
        span.innerText = testString;
        document.body.appendChild(span);

        const baseWidths: Record<string, number> = {};
        for (const base of baseFonts) {
            span.style.fontFamily = base;
            baseWidths[base] = span.getBoundingClientRect().width;
        }

        const detected: string[] = [];

        for (const font of candidates) {
            for (const base of baseFonts) {
                span.style.fontFamily = `"${font}", ${base}`;
                if (span.getBoundingClientRect().width !== baseWidths[base]) {
                    detected.push(font);
                    break;
                }
            }
        }

        span.remove();

        return { detected };
    }
};

export const browserInputCapabilitiesCollector = {
    name: "browser-input-capabilities",
    tags: ["browser", "device"],
    when: ["client-ready"],

    run() {
        return {
            hasTouch: "ontouchstart" in window,
            pointer: matchMedia("(pointer: fine)").matches ? "fine" :
                matchMedia("(pointer: coarse)").matches ? "coarse" :
                    "none",
            hover: matchMedia("(hover: hover)").matches,
            maxTouchPoints: navigator.maxTouchPoints ?? 0
        };
    }
};

export const browserGPUInfoCollector = {
    name: "browser-gpu-info",
    tags: ["browser", "gpu", "graphics"],
    when: ["client-ready"],

    run() {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!gl) return { available: false };

        const dbg = gl.getExtension("WEBGL_debug_renderer_info");

        return {
            available: true,
            vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null,
            renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null,
            shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            webglVersion: gl.getParameter(gl.VERSION)
        };
    }
};

export const browserWebGPUCollector = {
    name: "browser-webgpu-info",
    tags: ["browser", "gpu"],
    when: ["client-ready"],

    async run() {
        if (!("gpu" in navigator)) return { available: false };

        const adapter = await (navigator as any).gpu.requestAdapter().catch(() => null);

        if (!adapter) return { available: false };

        return {
            available: true,
            name: adapter.name,
            features: Array.from(adapter.features),
            limits: adapter.limits
        };
    }
};

export const browserTouchHeatmapCapabilityCollector = {
    name: "browser-touch-heatmap-capability",
    tags: ["browser", "touch", "input"],
    when: ["client-ready"],

    run() {
        const touchSupport =
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            (navigator as any).msMaxTouchPoints > 0;

        return {
            touchSupport,
            maxTouchPoints: navigator.maxTouchPoints ?? 0,
            estimatedTouchRadius:
                touchSupport
                    ? (matchMedia("(pointer: coarse)").matches ? "large (~8–12mm)" : "small/fine")
                    : null,
        };
    }
};

export const browserPointerLatencyCollector = {
    name: "browser-pointer-latency",
    tags: ["browser", "input", "performance"],
    when: ["client-ready"],

    run() {
        return new Promise(resolve => {
            let latency = null;

            const handler = () => {
                const t0 = performance.now();
                requestAnimationFrame(() => {
                    latency = performance.now() - t0;
                    window.removeEventListener("pointerdown", handler);
                    resolve({ latency });
                });
            };

            window.addEventListener("pointerdown", handler, { once: true });

            // Timeout fallback
            setTimeout(() => resolve({ latency: null }), 2000);
        });
    }
};

export const browserLayoutStructureCollector = {
    name: "browser-layout-structure",
    tags: ["browser", "layout", "dom"],
    when: ["client-ready"],

    run() {
        const elements = document.querySelectorAll("*");
        let flex = 0, grid = 0, table = 0, abs = 0;

        elements.forEach(el => {
            const style = getComputedStyle(el);
            if (!style) return;

            if (style.display.includes("flex")) flex++;
            if (style.display.includes("grid")) grid++;
            if (style.display.includes("table")) table++;
            if (style.position === "absolute") abs++;
        });

        return {
            totalElements: elements.length,
            flexCount: flex,
            gridCount: grid,
            tableCount: table,
            absoluteCount: abs
        };
    }
};

export const browserDOMComplexityCollector = {
    name: "browser-dom-complexity",
    tags: ["browser", "dom", "performance"],
    when: ["client-ready"],

    run() {
        function getDepth(node: Node, depth = 0): number {
            let max = depth;
            node.childNodes.forEach(child => {
                const d = getDepth(child, depth + 1);
                if (d > max) max = d;
            });
            return max;
        }

        const root = document.documentElement;
        return {
            totalNodes: document.getElementsByTagName("*").length,
            domDepth: getDepth(root),
            childElementCount: root.childElementCount,
        };
    }
};

export const browserShadowDOMCollector = {
    name: "browser-shadow-dom-info",
    tags: ["browser", "dom"],
    when: ["client-ready"],

    run() {
        const elements = document.querySelectorAll("*");
        let shadowRoots = 0;

        elements.forEach(el => {
            if ((el as any).shadowRoot) shadowRoots++;
        });

        return {
            totalElements: elements.length,
            shadowRoots,
            percentShadow:
                elements.length ? shadowRoots / elements.length : 0
        };
    }
};

export const browserRenderPipelineCollector = {
    name: "browser-render-pipeline",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    async run() {
        // FPS measurement
        let frames = 0;
        const start = performance.now();

        const fps = await new Promise(resolve => {
            function frame() {
                frames++;
                if (performance.now() - start < 1000) {
                    requestAnimationFrame(frame);
                } else {
                    resolve(frames);
                }
            }
            requestAnimationFrame(frame);
        });

        // Layout shift info
        let cls = 0;
        const observer = new (window as any).LayoutShiftObserver?.((entries: any) => {
            for (const e of entries) if (!e.hadRecentInput) cls += e.value;
        });

        if (observer) observer.observe();

        return {
            fps,
            layoutShiftScore: cls,
            paintTiming:
                performance.getEntriesByType("paint").map(p => ({
                    name: p.name,
                    startTime: p.startTime
                }))
        };
    }
};

export const browserResourceHintCollector = {
    name: "browser-resource-hints",
    tags: ["browser", "resource"],
    when: ["client-ready"],

    run() {
        const linkSupports = (rel: string) => {
            const link = document.createElement("link");
            try { return link.relList.supports(rel); }
            catch { return false; }
        };

        return {
            prefetch: linkSupports("prefetch"),
            preload: linkSupports("preload"),
            prerender: linkSupports("prerender"),
            modulePreload: linkSupports("modulepreload")
        };
    }
};

export const browserCSSFeatureCollector = {
    name: "browser-css-features",
    tags: ["browser", "css"],
    when: ["client-ready"],

    run() {
        const supports = (feat: string) => CSS.supports(feat);

        return {
            grid: supports("display: grid"),
            flex: supports("display: flex"),
            subgrid: supports("grid-template-columns: subgrid"),
            containerQueries: supports("container-type: inline-size"),
            backdropFilter: supports("backdrop-filter: blur(2px)"),
            positionSticky: supports("position: sticky"),
            clamp: supports("width: clamp(1px, 2vw, 10px)"),
            logicalProps: supports("margin-inline: 1rem"),
            colorMix: supports("color: color-mix(in srgb, red 50%, blue)"),
            hasSelector: CSS.supports("selector(:has(*))"),
        };
    }
};

export const browserJSEngineCollector = {
    name: "browser-js-engine",
    tags: ["browser", "js"],
    when: ["client-ready"],

    run() {
        const engine =
            (navigator as any).userAgentData?.brands?.find((b: any) =>
                ["Chromium", "Google Chrome", "Firefox", "Safari"].includes(b.brand)
            )?.brand ?? "Unknown";

        return {
            engine,
            bigInt: typeof BigInt !== "undefined",
            sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
            atomics: typeof Atomics !== "undefined",
            webAssembly: typeof WebAssembly !== "undefined",
            importMaps: "importmap" in document.createElement("script"),
            esmDynamicImport: !!import("data:text/javascript,export default 1").catch(() => false)
        };
    }
};

export const browserExtensionDetectorCollector = {
    name: "browser-extension-detector",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        const known = {
            adblock: !!document.querySelector(".adblock") || !!document.getElementById("adblock"),
            darkReader: !!document.querySelector("meta[name='darkreader']"),
            reactDevTools: !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
            vueDevTools: !!(window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__,
            reduxDevTools: !!(window as any).__REDUX_DEVTOOLS_EXTENSION__,
        };

        return known;
    }
};

export const browserDOMMutationRateCollector = {
    name: "browser-dom-mutation-rate",
    tags: ["browser", "dom", "performance"],
    when: ["client-ready"],

    run() {
        return new Promise(resolve => {
            let count = 0;

            const observer = new MutationObserver(() => { count++; });

            observer.observe(document.documentElement, {
                subtree: true,
                childList: true,
                attributes: false,
            });

            setTimeout(() => {
                observer.disconnect();
                resolve({ mutationsPerSecond: count });
            }, 1000);
        });
    }
};

export const browserMemoryPressureCollector = {
    name: "browser-memory-pressure",
    tags: ["browser", "performance", "memory"],
    when: ["client-ready"],

    run() {
        const nav: any = performance.memory || null;

        const heapTotal = nav?.totalJSHeapSize ?? null;
        const heapUsed = nav?.usedJSHeapSize ?? null;
        const heapLimit = nav?.jsHeapSizeLimit ?? null;

        const pressure =
            heapLimit && heapUsed
                ? heapUsed / heapLimit
                : null;

        return {
            heapTotal,
            heapUsed,
            heapLimit,
            pressureLevel:
                pressure == null
                    ? "unknown"
                    : pressure > 0.9
                        ? "critical"
                        : pressure > 0.75
                            ? "high"
                            : "normal"
        };
    }
};

export const browserCPUThrottlingCollector = {
    name: "browser-cpu-throttling",
    tags: ["browser", "cpu", "performance"],
    when: ["client-ready"],

    async run() {
        // Baseline timed loop
        const baseline = 80_000; // iterations expected in ~16ms on normal speed

        const start = performance.now();
        let x = 0;
        while (performance.now() - start < 16) x++;

        const throttleRatio = x / baseline;

        return {
            iterations: x,
            throttleRatio,
            throttled:
                throttleRatio < 0.7
                    ? "severe"
                    : throttleRatio < 0.9
                        ? "moderate"
                        : "none"
        };
    }
};

export const browserBatteryInfoCollector = {
    name: "browser-battery-info",
    tags: ["browser", "battery", "mobile"],
    when: ["client-ready"],

    async run() {
        try {
            const manager = await (navigator as any).getBattery?.();
            if (!manager) return { supported: false };

            return {
                supported: true,
                charging: manager.charging,
                level: manager.level,
                chargingTime: manager.chargingTime,
                dischargingTime: manager.dischargingTime,
            };
        } catch {
            return { supported: false };
        }
    }
};

export const browserNetworkRouteCollector = {
    name: "browser-network-route",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const connection = (navigator as any).connection || {};
        return {
            type: connection.type ?? null,
            effectiveType: connection.effectiveType ?? null,
            rtt: connection.rtt ?? null,
            downlink: connection.downlink ?? null,
            saveData: connection.saveData ?? false,

            // Soft VPN signals → NOT definitive, never label user as VPN.
            vpnSignals: {
                privateIp: /^10\.|^192\.168/.test(location.host) || null,
                proxyHeaderExposed: !!navigator.userAgent?.includes("Proxy") || null,
                httpsOnly: location.protocol === "https:" || null,
            }
        };
    }
};

export const browserStorageBreakdownCollector = {
    name: "browser-storage-breakdown",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        // Count IndexedDB databases
        const dbCount = await indexedDB.databases?.().then(d => d.length).catch(() => null);

        return {
            localStorage: {
                entries: localStorage.length,
                approxBytes: JSON.stringify(localStorage).length
            },
            sessionStorage: {
                entries: sessionStorage.length,
                approxBytes: JSON.stringify(sessionStorage).length
            },
            cookies: document.cookie.split(";").filter(Boolean).length,
            indexedDB: {
                count: dbCount
            }
        };
    }
};

export const browserTLSCapabilitiesCollector = {
    name: "browser-tls-capabilities",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        return {
            https: location.protocol === "https:",
            hsts:
                document.cookie.includes("Strict-Transport-Security") ||
                null, // not reliable but safe

            protocol:
                (performance.getEntriesByType("navigation")[0] as any)?.nextHopProtocol ??
                null,

            cipherInfo: navigator.userAgent.includes("Chrome")
                ? "Available (Chrome exposes nextHopProtocol; cipher suite hidden)"
                : "Restricted by browser"
        };
    }
};

export const browserWebRTCCollector = {
    name: "browser-webrtc-diagnostics",
    tags: ["browser", "network", "webrtc"],
    when: ["client-ready"],

    async run() {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        let stunLatency = null;
        let supportsIPv6 = false;

        const t0 = performance.now();

        pc.onicecandidate = ev => {
            if (ev.candidate) {
                const cand = ev.candidate.candidate;
                stunLatency = performance.now() - t0;
                if (cand.includes("::")) supportsIPv6 = true;
            }
        };

        await pc.setLocalDescription(await pc.createOffer());
        await new Promise(r => setTimeout(r, 300));

        pc.close();

        return { stunLatency, supportsIPv6 };
    }
};

export const browserWasmBenchmarkCollector = {
    name: "browser-wasm-benchmark",
    tags: ["browser", "wasm", "performance"],
    when: ["client-ready"],

    async run() {
        const wasmCode = new Uint8Array([
            0x00, 0x61, 0x73, 0x6D, // WASM header
            0x01, 0x00, 0x00, 0x00
        ]);

        const t0 = performance.now();
        try {
            await WebAssembly.compile(wasmCode);
            return {
                compiled: true,
                compileTimeMs: performance.now() - t0,
            };
        } catch {
            return {
                compiled: false,
                compileTimeMs: null,
            };
        }
    }
};

export const browserAIHardwareCollector = {
    name: "browser-ai-hardware",
    tags: ["browser", "ai", "gpu"],
    when: ["client-ready"],

    async run() {
        const gpuAdapter = await (navigator as any).gpu?.requestAdapter?.().catch(() => null);

        return {
            webNN: "ml" in navigator,
            webGPU: !!gpuAdapter,
            gpuInfo: gpuAdapter
                ? {
                    vendor: gpuAdapter.vendor,
                    architecture: gpuAdapter.architecture,
                    features: [...gpuAdapter.features],
                    limits: gpuAdapter.limits,
                }
                : null
        };
    }
};

export const browserNavigationTimingCollector = {
    name: "browser-navigation-timing",
    tags: ["browser", "performance", "metrics"],
    when: ["client-ready"],

    async run() {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;

        let lcp = null, fid = null, cls = 0;

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver(list => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1] as any;
            lcp = last.renderTime || last.loadTime || last.startTime;
        });
        try { lcpObserver.observe({ type: "largest-contentful-paint", buffered: true }); } catch { }

        // First Input Delay
        const fidObserver = new PerformanceObserver(list => {
            const first = list.getEntries()[0] as any;
            fid = first.processingStart - first.startTime;
        });
        try { fidObserver.observe({ type: "first-input", buffered: true }); } catch { }

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver(list => {
            for (const e of list.getEntries() as any) {
                if (!e.hadRecentInput) cls += e.value;
            }
        });
        try { clsObserver.observe({ type: "layout-shift", buffered: true }); } catch { }

        // Wait a bit to allow observers to flush
        await new Promise(r => setTimeout(r, 250));

        return {
            navigation: nav ? {
                type: nav.type,
                startTime: nav.startTime,
                duration: nav.duration,
                dns: nav.domainLookupEnd - nav.domainLookupStart,
                tcp: nav.connectEnd - nav.connectStart,
                ttfb: nav.responseStart - nav.requestStart,
                requestTime: nav.responseEnd - nav.requestStart,
            } : null,
            lcp,
            fid,
            cls,
            fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null,
        };
    }
};

export const browserFontLoadingCollector = {
    name: "browser-font-loading",
    tags: ["browser", "fonts", "performance"],
    when: ["client-ready"],

    async run() {
        if (!document.fonts) return { supported: false };

        const entries = [];
        for (const font of document.fonts) {
            entries.push({
                family: font.family,
                status: font.status,
                stretch: font.stretch,
                style: font.style,
                weight: font.weight,
            });
        }

        return {
            supported: true,
            fonts: entries,
            ready: document.fonts.ready ? await Promise.resolve(document.fonts.ready).then(() => true).catch(() => false) : null,
        };
    }
};

export const browserIdleCallbackCollector = {
    name: "browser-idle-callback",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        return new Promise(resolve => {
            if (!("requestIdleCallback" in window)) {
                resolve({
                    supported: false
                });
                return;
            }

            const t0 = performance.now();
            (window as any).requestIdleCallback(() => {
                resolve({
                    supported: true,
                    idleLatency: performance.now() - t0
                });
            });
        });
    }
};

export const browserEventLoopLagCollector = {
    name: "browser-event-loop-lag",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    async run() {
        const start = performance.now();
        await Promise.resolve();
        const end = performance.now();

        return {
            lagMs: end - start
        };
    }
};

export const browserClipboardInfoCollector = {
    name: "browser-clipboard-info",
    tags: ["browser", "clipboard"],
    when: ["client-ready"],

    run() {
        const nav: any = navigator;

        return {
            read: !!nav.clipboard?.read,
            readText: !!nav.clipboard?.readText,
            write: !!nav.clipboard?.write,
            writeText: !!nav.clipboard?.writeText,
            permissions: nav.permissions ? true : false
        };
    }
};

export const browserSpeechCollector = {
    name: "browser-speech-capabilities",
    tags: ["browser", "speech"],
    when: ["client-ready"],

    run() {
        return {
            speechSynthesis: typeof window.speechSynthesis !== "undefined",
            speechVoices: window.speechSynthesis?.getVoices?.().map(v => ({
                name: v.name,
                lang: v.lang,
                local: v.localService
            })) ?? null,
            speechRecognition:
                "webkitSpeechRecognition" in window ||
                "SpeechRecognition" in window
        };
    }
};

export const browserAccessibilityStructureCollector = {
    name: "browser-accessibility-structure",
    tags: ["browser", "a11y"],
    when: ["client-ready"],

    run() {
        const nodes = document.querySelectorAll("*");

        let ariaCount = 0, labelledCount = 0, roleCount = 0;

        nodes.forEach(el => {
            const attrs = el.getAttributeNames();
            if (attrs.some(a => a.startsWith("aria-"))) ariaCount++;
            if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) labelledCount++;
            if (el.getAttribute("role")) roleCount++;
        });

        return {
            totalElements: nodes.length,
            withAria: ariaCount,
            labelledElements: labelledCount,
            withRole: roleCount
        };
    }
};

export const browserAnimationCapabilitiesCollector = {
    name: "browser-animation-capabilities",
    tags: ["browser", "animation"],
    when: ["client-ready"],

    run() {
        return {
            webAnimations: typeof Element.prototype.animate === "function",
            scrollTimeline: "ScrollTimeline" in window,
            viewTimeline: "ViewTimeline" in window,
            prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        };
    }
};

export const browserFileSystemAPICapabilityCollector = {
    name: "browser-filesystem-api",
    tags: ["browser", "filesystem"],
    when: ["client-ready"],

    run() {
        const nav: any = navigator;

        return {
            showOpenFilePicker: "showOpenFilePicker" in window,
            showDirectoryPicker: "showDirectoryPicker" in window,
            showSaveFilePicker: "showSaveFilePicker" in window,
            storageFoundation: !!(window as any).storageFoundation,
            opfs: !!(navigator as any).storage?.getDirectory,
        };
    }
};

export const browserWebGPUComputeBenchmarkCollector = {
    name: "browser-webgpu-compute-benchmark",
    tags: ["browser", "gpu", "compute"],
    when: ["client-ready"],

    async run() {
        if (!("gpu" in navigator)) return { supported: false };

        try {
            const adapter: any = await (navigator as any).gpu.requestAdapter();
            const device: any = await adapter.requestDevice();

            const t0 = performance.now();

            const shader = device.createShaderModule({
                code: `
                @compute @workgroup_size(1)
                fn main(@builtin(global_invocation_id) gid : vec3<u32>) {}
                `
            });

            device.createComputePipeline({
                layout: "auto",
                compute: {
                    module: shader,
                    entryPoint: "main"
                }
            });

            const execMs = performance.now() - t0;

            return {
                supported: true,
                execMs,
                vendor: adapter.vendor,
                architecture: adapter.architecture
            };
        } catch {
            return { supported: false };
        }
    }
};

export const browserGlobalErrorCollector = {
    name: "browser-global-errors",
    tags: ["browser", "errors"],
    when: ["client-ready"],

    run() {
        const errors: any[] = [];

        const handler = (event: ErrorEvent) => {
            errors.push({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack ?? null
            });
        };

        window.addEventListener("error", handler);
        window.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
            errors.push({
                type: "unhandledrejection",
                reason: String(ev.reason),
                stack: ev.reason?.stack ?? null
            });
        });

        return {
            subscribed: true,
            errors
        };
    }
};

export const browserUnhandledRejectionCollector = {
    name: "browser-unhandled-rejections",
    tags: ["browser", "errors"],
    when: ["client-ready"],

    run() {
        const rejections: any[] = [];

        const handler = (ev: PromiseRejectionEvent) => {
            rejections.push({
                reason: String(ev.reason),
                stack: ev.reason?.stack ?? null
            });
        };

        window.addEventListener("unhandledrejection", handler);

        return { subscribed: true, rejections };
    }
};

export const browserErrorFrequencyCollector = {
    name: "browser-error-frequency",
    tags: ["browser", "errors"],
    when: ["client-ready"],

    run() {
        const counter: Record<string, number> = {};
        const handler = (ev: ErrorEvent) => {
            const type = ev.error?.name ?? "Error";
            counter[type] = (counter[type] || 0) + 1;
        };

        window.addEventListener("error", handler);

        return { tracking: true, counter };
    }
};

export const browserLongTaskCollector = {
    name: "browser-long-tasks",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const tasks: any[] = [];

        try {
            const obs = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    tasks.push({
                        name: entry.name,
                        duration: entry.duration,
                        startTime: entry.startTime
                    });
                }
            });
            obs.observe({ type: "longtask", buffered: true });
        } catch { }

        return { tasks };
    }
};

export const browserResourceTimingCollector = {
    name: "browser-resource-timing",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const entries = performance.getEntriesByType("resource");

        return entries.map((e: PerformanceResourceTiming) => ({
            name: e.name,
            initiatorType: e.initiatorType,
            duration: e.duration,
            transferSize: e.transferSize,
            encodedBodySize: e.encodedBodySize,
            decodedBodySize: e.decodedBodySize,
            startTime: e.startTime,
        }));
    }
};

export const browserThirdPartyScriptCollector = {
    name: "browser-third-party-scripts",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const resources = performance.getEntriesByType("resource");
        const scripts = resources.filter((r: any) => r.initiatorType === "script");

        const thirdParty = scripts.filter((s: any) => {
            try {
                return new URL(s.name).host !== location.host;
            } catch {
                return false;
            }
        });

        return {
            firstPartyScripts: scripts.length - thirdParty.length,
            thirdPartyScripts: thirdParty.map(s => ({
                name: s.name,
                duration: s.duration,
                transferSize: s.transferSize
            }))
        };
    }
};

export const browserNetworkInstrumentationCollector = {
    name: "browser-network-instrumentation",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const requests: any[] = [];

        // Patch fetch
        const origFetch = window.fetch;
        window.fetch = async (...args) => {
            const start = performance.now();
            try {
                const res = await origFetch(...args);
                requests.push({
                    url: args[0],
                    status: res.status,
                    duration: performance.now() - start
                });
                return res;
            } catch (err) {
                requests.push({
                    url: args[0],
                    status: "NETWORK_ERROR",
                    duration: performance.now() - start
                });
                throw err;
            }
        };

        // Patch XHR
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (...args) {
            (this as any).__url = args[1];
            return origOpen.apply(this, args as any);
        };
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (...args) {
            const xhr = this as any;
            const start = performance.now();

            xhr.addEventListener("loadend", () => {
                requests.push({
                    url: xhr.__url,
                    status: xhr.status,
                    duration: performance.now() - start
                });
            });

            return origSend.apply(this, args as any);
        };

        return { hooked: true, requests };
    }
};

export const browserFrameworkHydrationCollector = {
    name: "browser-framework-hydration",
    tags: ["browser", "framework"],
    when: ["client-ready"],

    run() {
        const marks = performance.getEntriesByName("hydration");
        return {
            hydrationMarks: marks.map(m => ({ name: m.name, start: m.startTime, dur: m.duration }))
        };
    }
};

export const browserScrollVelocityCollector = {
    name: "browser-scroll-velocity",
    tags: ["browser", "interaction"],
    when: ["client-ready"],

    run() {
        let lastY = window.scrollY;
        let lastT = performance.now();

        const samples: number[] = [];

        const handler = () => {
            const now = performance.now();
            const dy = Math.abs(window.scrollY - lastY);
            const dt = now - lastT;

            if (dt > 0) samples.push(dy / dt);

            lastY = window.scrollY;
            lastT = now;
        };

        window.addEventListener("scroll", handler);

        return { samples };
    }
};

export const browserRageClickCollector = {
    name: "browser-rage-clicks",
    tags: ["browser", "interaction"],
    when: ["client-ready"],

    run() {
        const clicks: { x: number; y: number; t: number }[] = [];

        window.addEventListener("click", e => {
            clicks.push({ x: e.clientX, y: e.clientY, t: performance.now() });
        });

        return {
            clicks,
            isRageClick() {
                if (clicks.length < 3) return false;
                const last = clicks.slice(-3);
                const dt = last[2].t - last[0].t;
                const dx = Math.abs(last[2].x - last[0].x);
                const dy = Math.abs(last[2].y - last[0].y);
                return dt < 800 && dx < 5 && dy < 5;
            }
        };
    }
};

export const browserDeadClickCollector = {
    name: "browser-dead-clicks",
    tags: ["browser", "interaction"],
    when: ["client-ready"],

    run() {
        const deadClicks: any[] = [];

        window.addEventListener("click", e => {
            const target = e.target as HTMLElement;
            if (target && !target.onclick && target.tagName !== "A") {
                deadClicks.push({
                    x: e.clientX,
                    y: e.clientY,
                    element: target.tagName
                });
            }
        });

        return { deadClicks };
    }
};

export const browserNavigationFlowCollector = {
    name: "browser-navigation-flow",
    tags: ["browser", "navigation"],
    when: ["client-ready"],

    run() {
        const history: string[] = [];

        history.push(location.pathname + location.search);

        window.addEventListener("popstate", () => {
            history.push(location.pathname + location.search);
        });

        return { history };
    }
};

export const browserExperimentExposureCollector = {
    name: "browser-experiment-exposures",
    tags: ["browser", "experimentation"],
    when: ["client-ready"],

    run() {
        return {
            experiments: window.__EXPERIMENTS__ ?? null,
            variants: window.__EXPERIMENT_VARIANTS__ ?? null
        };
    }
};

export const browserBuildMetadataCollector = {
    name: "browser-build-metadata",
    tags: ["browser", "app"],
    when: ["client-ready"],

    run() {
        return {
            buildId: (window as any).__BUILD_ID__ ?? null,
            gitCommit: (window as any).__GIT_COMMIT__ ?? null,
            deployEnv: (window as any).__DEPLOY_ENV__ ?? null
        };
    }
};

export const browserStorageQuotaCollector = {
    name: "browser-storage-quota",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        if (!navigator.storage?.estimate) return { supported: false };

        const est = await navigator.storage.estimate();

        return {
            supported: true,
            quota: est.quota,
            usage: est.usage,
            ratio: est.quota && est.usage ? est.usage / est.quota : null
        };
    }
};

export const browserPreloadPrefetchCollector = {
    name: "browser-preload-prefetch",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const resources = performance.getEntriesByType("resource");
        const prefetches = resources.filter((r: any) => r.initiatorType === "prefetch");
        const preloads = resources.filter((r: any) => r.initiatorType === "preload");

        return {
            preloadCount: preloads.length,
            prefetchCount: prefetches.length,
            preloadDurations: preloads.map(p => p.duration),
            prefetchDurations: prefetches.map(p => p.duration)
        };
    }
};

export const browserPageLifecycleCollector = {
    name: "browser-page-lifecycle",
    tags: ["browser", "lifecycle"],
    when: ["client-ready"],

    run() {
        const events: string[] = [];

        document.addEventListener("visibilitychange", () => {
            events.push(document.visibilityState);
        });

        document.addEventListener("freeze", () => events.push("freeze"));
        document.addEventListener("resume", () => events.push("resume"));

        return { events };
    }
};

export const browserIMECollector = {
    name: "browser-ime-info",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        return {
            languages: navigator.languages ?? null,
            keyboard: (navigator as any).keyboard ?? null
        };
    }
};

export const browserOfflinePWACollector = {
    name: "browser-offline-pwa",
    tags: ["browser", "pwa"],
    when: ["client-ready"],

    run() {
        return {
            online: navigator.onLine,
            serviceWorker: !!navigator.serviceWorker,
            serviceWorkerController: !!navigator.serviceWorker?.controller,
            installPrompt: (window as any).beforeInstallPromptFired ?? false
        };
    }
};

export const browserServiceWorkerLifecycleCollector = {
    name: "browser-service-worker-lifecycle",
    tags: ["browser", "pwa"],
    when: ["client-ready"],

    async run() {
        const reg = await navigator.serviceWorker?.getRegistration?.();
        if (!reg) return { registered: false };

        return {
            registered: true,
            scope: reg.scope,
            active: !!reg.active,
            waiting: !!reg.waiting,
            installing: !!reg.installing
        };
    }
};

export const browserServiceWorkerMessageCollector = {
    name: "browser-service-worker-messages",
    tags: ["browser", "pwa"],
    when: ["client-ready"],

    run() {
        const messages: any[] = [];

        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener("message", (event) => {
                messages.push({
                    data: event.data,
                    origin: event.origin,
                    ports: event.ports?.length || 0
                });
            });
        }

        return { messages };
    }
};

export const browserWebSocketCollector = {
    name: "browser-websocket-activity",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const log: any[] = [];
        const OriginalWS = window.WebSocket;

        window.WebSocket = function (...args: any[]) {
            const ws: WebSocket = new (OriginalWS as any)(...args);

            log.push({ type: "created", url: args[0] });

            ws.addEventListener("open", () => log.push({ type: "open" }));
            ws.addEventListener("close", (e) => log.push({ type: "close", code: e.code }));
            ws.addEventListener("error", () => log.push({ type: "error" }));

            return ws;
        } as any;

        return { log };
    }
};

export const browserEventLoopLagCollector = {
    name: "browser-event-loop-lag",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const samples: number[] = [];

        function measure() {
            const start = performance.now();
            setTimeout(() => {
                const end = performance.now();
                samples.push(end - start - 50);
                measure();
            }, 50);
        }

        measure();
        return { samples };
    }
};

export const browserWebGLCollector = {
    name: "browser-webgl-info",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (!gl) return { supported: false };

            const ext = gl.getExtension("WEBGL_debug_renderer_info");

            return {
                supported: true,
                vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null,
                renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
                shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                version: gl.getParameter(gl.VERSION),
            };
        } catch {
            return { supported: false };
        }
    }
};

export const browserCanvasFingerprintMetricsCollector = {
    name: "browser-canvas-fingerprint-metrics",
    tags: ["browser", "fingerprint"],
    when: ["client-ready"],

    run() {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return { supported: false };

        ctx.textBaseline = "top";
        ctx.font = "16px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillText("FP_TEST_123", 2, 2);

        const url = canvas.toDataURL();

        return {
            supported: true,
            length: url.length,
            checksum: [...url].reduce((a, c) => a + c.charCodeAt(0), 0)
        };
    }
};

export const browserMediaQueryEnvCollector = {
    name: "browser-media-query-environment",
    tags: ["browser", "ui"],
    when: ["client-ready"],

    run() {
        return {
            prefersDark: matchMedia("(prefers-color-scheme: dark)").matches,
            prefersReducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            prefersContrastMore: matchMedia("(prefers-contrast: more)").matches,
            colorGamut: ["srgb", "p3", "rec2020"].filter(g => matchMedia(`(color-gamut: ${g})`).matches)
        };
    }
};

export const browserHardwareConcurrencyCollector = {
    name: "browser-hardware-concurrency",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        return {
            cpuCores: navigator.hardwareConcurrency ?? null,
            deviceMemory: (navigator as any).deviceMemory ?? null
        };
    }
};

export const browserTouchscreenCollector = {
    name: "browser-touchscreen-info",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        return {
            touchPoints: navigator.maxTouchPoints ?? 0,
            touchSupport: "ontouchstart" in window,
            pointerTypes: (navigator as any).pointerEnabled ? "pointer" : null
        };
    }
};

export const browserSensorSupportCollector = {
    name: "browser-sensor-support",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        return {
            deviceMotion: "DeviceMotionEvent" in window,
            deviceOrientation: "DeviceOrientationEvent" in window,
            genericSensors: {
                accelerometer: "Accelerometer" in window,
                gyroscope: "Gyroscope" in window,
                magnetometer: "Magnetometer" in window,
                absoluteOrientation: "AbsoluteOrientationSensor" in window,
                relativeOrientation: "RelativeOrientationSensor" in window
            }
        };
    }
};

export const browserINPCollector = {
    name: "browser-inp",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const inp: any[] = [];

        try {
            const obs = new PerformanceObserver(list => {
                list.getEntries().forEach(e => {
                    inp.push({
                        duration: e.duration,
                        interactionId: (e as any).interactionId,
                        event: (e as any).processingStart
                    });
                });
            });
            obs.observe({ type: "event", buffered: true });
        } catch { }

        return { inp };
    }
};

export const browserJankCollector = {
    name: "browser-animation-jank",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const deltas: number[] = [];
        let last = performance.now();

        function tick() {
            const now = performance.now();
            deltas.push(now - last);
            last = now;
            requestAnimationFrame(tick);
        }

        tick();
        return { deltas };
    }
};

export const browserWebRTCSupportCollector = {
    name: "browser-webrtc-support",
    tags: ["browser", "network", "media"],
    when: ["client-ready"],

    run() {
        return {
            rtcPeerConnection: "RTCPeerConnection" in window,
            mediaDevices: !!navigator.mediaDevices,
            enumerateDevices: navigator.mediaDevices?.enumerateDevices ? true : false,
            dataChannel: "RTCDataChannel" in window
        };
    }
};

export const browserMemoryCollector = {
    name: "browser-memory",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        // Chrome-only, but safe everywhere
        const mem = (performance as any).memory;

        return mem
            ? {
                jsHeapSizeLimit: mem.jsHeapSizeLimit,
                totalJSHeapSize: mem.totalJSHeapSize,
                usedJSHeapSize: mem.usedJSHeapSize
            }
            : { supported: false };
    }
};

export const browserFontAvailabilityCollector = {
    name: "browser-fonts",
    tags: ["browser", "ui"],
    when: ["client-ready"],

    async run() {
        if (!("fonts" in document)) return { supported: false };

        const fonts = await (document as any).fonts?.ready;
        const loaded = Array.from((document as any).fonts).map((f: any) => ({
            family: f.family,
            full: f.full,
            status: f.status
        }));

        return { supported: true, count: loaded.length, loaded };
    }
};

export const browserAnimationCollector = {
    name: "browser-animation-api",
    tags: ["browser", "ui"],
    when: ["client-ready"],

    run() {
        const anims = document.getAnimations?.() ?? [];
        return anims.map(a => ({
            id: a.id,
            playState: a.playState,
            effect: a.effect?.constructor.name
        }));
    }
};

export const browserPaintTimingCollector = {
    name: "browser-paint-timing",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const entries = performance.getEntriesByType("paint");
        return entries.map(e => ({
            name: e.name,
            startTime: e.startTime
        }));
    }
};

export const browserCSSSupportCollector = {
    name: "browser-css-support",
    tags: ["browser", "ui"],
    when: ["client-ready"],

    run() {
        return {
            grid: CSS.supports("display", "grid"),
            flex: CSS.supports("display", "flex"),
            containerQueries: CSS.supports("container-type: inline-size"),
            subgrid: CSS.supports("grid-template-columns: subgrid"),
            okLab: CSS.supports("color", "oklab(40% 0.2 0.2)")
        };
    }
};

export const browserSpeechSupportCollector = {
    name: "browser-speech-support",
    tags: ["browser", "api"],
    when: ["client-ready"],

    run() {
        return {
            speechRecognition:
                (window as any).SpeechRecognition ||
                    (window as any).webkitSpeechRecognition
                    ? true
                    : false,
            speechSynthesis: "speechSynthesis" in window
        };
    }
};

export const browserClipboardCollector = {
    name: "browser-clipboard-support",
    tags: ["browser", "permissions"],
    when: ["client-ready"],

    run() {
        return {
            write: !!navigator.clipboard?.writeText,
            read: !!navigator.clipboard?.readText,
            permissions: (navigator as any).permissions ? true : false
        };
    }
};

export const browserBatteryCollector = {
    name: "browser-battery-status",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    async run() {
        try {
            const mgr = await (navigator as any).getBattery?.();
            if (!mgr) return { supported: false };

            return {
                supported: true,
                charging: mgr.charging,
                level: mgr.level,
                chargingTime: mgr.chargingTime,
                dischargingTime: mgr.dischargingTime
            };
        } catch {
            return { supported: false };
        }
    }
};

export const browserPermissionsSummaryCollector = {
    name: "browser-permissions-summary",
    tags: ["browser", "permissions"],
    when: ["client-ready"],

    async run() {
        if (!(navigator as any).permissions) return { supported: false };

        const names = [
            "geolocation",
            "notifications",
            "camera",
            "microphone",
            "clipboard-read",
            "clipboard-write",
            "persistent-storage"
        ];

        const results: Record<string, string> = {};

        for (const n of names) {
            try {
                const p = await (navigator as any).permissions.query({ name: n as any });
                results[n] = p.state;
            } catch {
                results[n] = "unknown";
            }
        }

        return { supported: true, entries: results };
    }
};

export const browserScreenMetricsCollector = {
    name: "browser-screen-metrics",
    tags: ["browser", "hardware"],
    when: ["client-ready"],

    run() {
        return {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            pixelRatio: window.devicePixelRatio,
            orientation:
                (screen.orientation && screen.orientation.type) ?? null
        };
    }
};

export const browserHistoryCollector = {
    name: "browser-history-depth",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        return {
            length: history.length,
            state: history.state ?? null
        };
    }
};

export const browserStorageCollector = {
    name: "browser-storage-info",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        const lsKeys = [];
        const ssKeys = [];

        try {
            for (let i = 0; i < localStorage.length; i++)
                lsKeys.push(localStorage.key(i));
        } catch { }

        try {
            for (let i = 0; i < sessionStorage.length; i++)
                ssKeys.push(sessionStorage.key(i));
        } catch { }

        return {
            localStorageKeys: lsKeys,
            sessionStorageKeys: ssKeys
        };
    }
};

export const browserIndexedDBCollector = {
    name: "browser-indexeddb-databases",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        if (!(indexedDB as any).databases) return { supported: false };

        const dbs = await (indexedDB as any).databases();
        return { supported: true, dbs };
    }
};

export const browserNavTimingCollector = {
    name: "browser-navigation-timing",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const entry = performance.getEntriesByType("navigation")[0];
        if (!entry) return { supported: false };

        return {
            supported: true,
            type: (entry as any).type,
            domInteractive: entry.domInteractive,
            domComplete: entry.domComplete,
            loadEventEnd: entry.loadEventEnd,
            redirectCount: entry.redirectCount,
            transferSize: (entry as any).transferSize
        };
    }
};

export const browserLockManagerCollector = {
    name: "browser-lock-manager",
    tags: ["browser", "api"],
    when: ["client-ready"],

    async run() {
        if (!navigator.locks) return { supported: false };

        const state = await (navigator.locks as any).query();
        return { supported: true, state };
    }
};

export const browserBroadcastChannelCollector = {
    name: "browser-broadcastchannel",
    tags: ["browser", "communication"],
    when: ["client-ready"],

    run() {
        const supported = "BroadcastChannel" in window;
        return { supported };
    }
};

export const browserShareAPICollector = {
    name: "browser-share-api",
    tags: ["browser", "mobile"],
    when: ["client-ready"],

    run() {
        return {
            supported: !!navigator.share,
            canShareFiles: navigator.canShare
                ? navigator.canShare({ files: [] })
                : false
        };
    }
};

export const browserPaymentAPICollector = {
    name: "browser-payment-api",
    tags: ["browser", "commerce"],
    when: ["client-ready"],

    run() {
        return {
            supported: "PaymentRequest" in window
        };
    }
};

export const browserWebAuthnCollector = {
    name: "browser-webauthn-support",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        return {
            webauthn: !!window.PublicKeyCredential,
            platformAuthenticator:
                !!navigator.credentials &&
                "isUserVerifyingPlatformAuthenticatorAvailable" in navigator.credentials
        };
    }
};

export const browserNotificationCollector = {
    name: "browser-notification-info",
    tags: ["browser", "ui"],
    when: ["client-ready"],

    run() {
        return {
            supported: "Notification" in window,
            permission: Notification.permission
        };
    }
};

export const browserUserPreferencesCollector = {
    name: "browser-user-preferences",
    tags: ["browser", "ui"],
    when: ["client-ready"],

    run() {
        return {
            reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            darkMode: matchMedia("(prefers-color-scheme: dark)").matches,
            highContrast: matchMedia("(prefers-contrast: more)").matches
        };
    }
};

export const browserNavigatorCollector = {
    name: "browser-navigator-info",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        const n: any = navigator;

        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages,
            platform: navigator.platform,
            vendor: navigator.vendor,
            pdfViewerEnabled: n.pdfViewerEnabled ?? null,
            hardwareConcurrency: n.hardwareConcurrency,
            deviceMemory: n.deviceMemory ?? null
        };
    }
};

export const browserClipboardActivityCollector = {
    name: "browser-clipboard-activity",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        const events: any[] = [];

        document.addEventListener("copy", () => events.push("copy"));
        document.addEventListener("cut", () => events.push("cut"));
        document.addEventListener("paste", () => events.push("paste"));

        return { events };
    }
};

export const browserLifecycleCollector = {
    name: "browser-lifecycle-events",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        const events: any[] = [];

        window.addEventListener("focus", () => events.push("focus"));
        window.addEventListener("blur", () => events.push("blur"));
        document.addEventListener("visibilitychange", () =>
            events.push(`visibility:${document.visibilityState}`)
        );

        return { events };
    }
};

export const browserDOMMutationCollector = {
    name: "browser-dom-mutations",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        const mutations: any[] = [];

        const obs = new MutationObserver((list) => {
            list.forEach(m => {
                mutations.push({
                    type: m.type,
                    added: m.addedNodes.length,
                    removed: m.removedNodes.length
                });
            });
        });

        obs.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        return { mutations };
    }
};

export const browserPointerDeviceCollector = {
    name: "browser-pointer-device-info",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        return {
            pointerRaw: matchMedia("(pointer: coarse)").matches
                ? "coarse"
                : matchMedia("(pointer: fine)").matches
                    ? "fine"
                    : "none",

            hover: matchMedia("(hover: hover)").matches
                ? true
                : matchMedia("(hover: none)").matches
                    ? false
                    : null
        };
    }
};

export const browserClipboardCapabilitiesCollector = {
    name: "browser-clipboard-capabilities",
    tags: ["browser", "clipboard"],
    when: ["client-ready"],

    async run() {
        const result: any = {
            readText: !!navigator.clipboard?.readText,
            writeText: !!navigator.clipboard?.writeText,
            read: !!navigator.clipboard?.read,
            write: !!navigator.clipboard?.write
        };

        if ((navigator as any).permissions) {
            try {
                const read = await (navigator as any).permissions.query({ name: "clipboard-read" });
                const write = await (navigator as any).permissions.query({ name: "clipboard-write" });

                result.permissionRead = read.state;
                result.permissionWrite = write.state;
            } catch { }
        }

        return result;
    }
};

export const browserPreloadHintCollector = {
    name: "browser-preload-hints",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        return Array.from(document.querySelectorAll("link[rel='preload'], link[rel='prefetch'], link[rel='modulepreload']"))
            .map(el => ({
                rel: el.getAttribute("rel"),
                href: el.getAttribute("href"),
                as: el.getAttribute("as")
            }));
    }
};

export const browserCSSMediaFeaturesCollector = {
    name: "browser-css-media-features",
    tags: ["browser", "ui"],
    when: ["client-ready"],

    run() {
        const queries = [
            "(prefers-color-scheme: dark)",
            "(prefers-color-scheme: light)",
            "(prefers-reduced-motion: reduce)",
            "(prefers-reduced-transparency: reduce)",
            "(prefers-contrast: more)",
            "(inverted-colors: inverted)",
            "(forced-colors: active)"
        ];

        return queries.map(q => ({
            query: q,
            matches: matchMedia(q).matches
        }));
    }
};

export const browserViewportResizeCollector = {
    name: "browser-viewport-resize-events",
    tags: ["browser", "ui"],
    when: ["client-ready"],

    run() {
        const events: any[] = [];
        window.addEventListener("resize", () => {
            events.push({
                width: window.innerWidth,
                height: window.innerHeight,
                ts: Date.now()
            });
        });

        return { events };
    }
};

export const browserFontLoadCollector = {
    name: "browser-font-loading-info",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    async run() {
        if (!document.fonts) return { supported: false };

        await document.fonts.ready;

        return {
            supported: true,
            loaded: document.fonts.size,
            status: Array.from(document.fonts).map((f: any) => ({
                family: f.family,
                style: f.style,
                weight: f.weight,
                stretch: f.stretch,
                loaded: f.status
            }))
        };
    }
};

export const browserInputDeviceCollector = {
    name: "browser-input-device-enumeration",
    tags: ["browser", "input"],
    when: ["client-ready"],

    async run() {
        if (!navigator.hid) return { hidSupported: false };

        try {
            const devices = await navigator.hid.getDevices();
            return {
                hidSupported: true,
                devices: devices.map(d => ({
                    vendorId: d.vendorId,
                    productId: d.productId,
                    opened: d.opened
                }))
            };
        } catch {
            return { hidSupported: false };
        }
    }
};

export const browserWebGPUCollector = {
    name: "browser-webgpu-info",
    tags: ["browser", "graphics"],
    when: ["client-ready"],

    async run() {
        const supported = !!(navigator as any).gpu;

        if (!supported) return { supported: false };

        const adapter = await (navigator as any).gpu.requestAdapter?.();

        return {
            supported: true,
            adapter: adapter ? {
                name: adapter.name,
                features: Array.from(adapter.features),
                isFallback: adapter.isFallbackAdapter ?? false
            } : null
        };
    }
};

export const browserWebGLCollector = {
    name: "browser-webgl-capabilities",
    tags: ["browser", "graphics"],
    when: ["client-ready"],

    run() {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

        if (!gl) return { supported: false };

        return {
            supported: true,
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shading: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
        };
    }
};

export const browserWebSocketLatencyCollector = {
    name: "browser-websocket-latency",
    tags: ["browser", "network"],
    when: ["client-ready"],

    async run() {
        try {
            const ws = new WebSocket("wss://echo.websocket.events");
            const start = Date.now();

            return await new Promise(resolve => {
                ws.onopen = () => ws.send("ping");
                ws.onmessage = () =>
                    resolve({
                        ok: true,
                        roundtripMs: Date.now() - start
                    });
                ws.onerror = () => resolve({ ok: false });
            });
        } catch {
            return { ok: false };
        }
    }
};

export const browserGPUMemoryCollector = {
    name: "browser-gpu-memory",
    tags: ["browser", "graphics"],
    when: ["client-ready"],

    run() {
        const nav: any = navigator;

        return {
            jsHeapLimit: performance?.memory?.jsHeapSizeLimit ?? null,
            totalJSHeap: performance?.memory?.totalJSHeapSize ?? null,
            usedJSHeap: performance?.memory?.usedJSHeapSize ?? null,
            deviceMemory: nav.deviceMemory ?? null
        };
    }
};

export const browserEventLoopLagCollector = {
    name: "browser-event-loop-lag",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let worst = 0;
        let samples = 0;

        const check = () => {
            const start = performance.now();
            setTimeout(() => {
                const lag = performance.now() - start;
                if (lag > worst) worst = lag;
                samples++;
            }, 0);
        };

        for (let i = 0; i < 20; i++) check();

        return { samples, worstLagMs: worst };
    }
};

export const browserMotionCapabilitiesCollector = {
    name: "browser-motion-capabilities",
    tags: ["browser", "sensors"],
    when: ["client-ready"],

    run() {
        return {
            accelerometer: "DeviceMotionEvent" in window,
            gyroscope: "DeviceOrientationEvent" in window
        };
    }
};

export const browserPWACollector = {
    name: "browser-pwa-status",
    tags: ["browser", "pwa"],
    when: ["client-ready"],

    run() {
        return {
            standalone: matchMedia("(display-mode: standalone)").matches,
            minimalUi: matchMedia("(display-mode: minimal-ui)").matches,
            fullscreen: matchMedia("(display-mode: fullscreen)").matches
        };
    }
};

export const browserPointerEventsCollector = {
    name: "browser-pointer-events",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        const events: any[] = [];
        window.addEventListener("pointerdown", e => events.push({ type: "down", x: e.clientX, y: e.clientY }));
        window.addEventListener("pointermove", e => events.push({ type: "move", x: e.clientX, y: e.clientY }));
        window.addEventListener("pointerup", e => events.push({ type: "up", x: e.clientX, y: e.clientY }));
        return { events };
    }
};

export const browserKeyboardLayoutCollector = {
    name: "browser-keyboard-layout",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        return {
            layoutMapSupported: !!navigator.keyboard?.getLayoutMap,
            lockSupported: !!navigator.keyboard?.lock,
            autoRepeat: "KeyboardEvent" in window ? "repeat" in new KeyboardEvent("x") : null
        };
    }
};

export const browserFIDCollector = {
    name: "browser-first-input-delay",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const metrics: any = {};

        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                metrics.fid = entry.processingStart - entry.startTime;
            }
        }).observe({ type: "first-input", buffered: true });

        return metrics;
    }
};

export const browserLCPCollector = {
    name: "browser-lcp",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const data: any = {};

        new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            data.lcp = last.renderTime || last.loadTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });

        return data;
    }
};

export const browserNetworkEventsCollector = {
    name: "browser-network-events",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const events: string[] = [];

        window.addEventListener("online", () => events.push("online"));
        window.addEventListener("offline", () => events.push("offline"));

        return { events };
    }
};

export const browserWebSocketCollector = {
    name: "browser-websocket-support",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        const supported = "WebSocket" in window;
        return { supported };
    }
};

export const browserStorageQuotaCollector = {
    name: "browser-storage-quota",
    tags: ["browser", "storage"],
    when: ["client-ready"],

    async run() {
        if (!navigator.storage?.estimate) return { supported: false };

        const est = await navigator.storage.estimate();
        return {
            supported: true,
            quota: est.quota,
            usage: est.usage
        };
    }
};

export const browserServiceWorkerCollector = {
    name: "browser-serviceworker-info",
    tags: ["browser", "worker"],
    when: ["client-ready"],

    async run() {
        if (!("serviceWorker" in navigator)) return { supported: false };

        const reg = await navigator.serviceWorker.getRegistration();
        return {
            supported: true,
            active: reg?.active?.state ?? null,
            installing: reg?.installing?.state ?? null,
            waiting: reg?.waiting?.state ?? null
        };
    }
};

export const browserPushAPICollector = {
    name: "browser-push-api",
    tags: ["browser", "push"],
    when: ["client-ready"],

    async run() {
        if (!("PushManager" in window)) return { supported: false };

        return {
            supported: true,
            permission: Notification.permission
        };
    }
};

export const browserDeviceMotionCollector = {
    name: "browser-device-motion",
    tags: ["browser", "mobile"],
    when: ["client-ready"],

    run() {
        const out: any = { supported: false };

        window.addEventListener("deviceorientation", (e) => {
            out.supported = true;
            out.orientation = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
        });

        window.addEventListener("devicemotion", (e) => {
            out.supported = true;
            out.motion = {
                acceleration: e.acceleration,
                rotationRate: e.rotationRate
            };
        });

        return out;
    }
};

export const browserTouchCapabilitiesCollector = {
    name: "browser-touch-capabilities",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        return {
            touchSupported: "ontouchstart" in window,
            maxTouchPoints: navigator.maxTouchPoints
        };
    }
};

export const browserAmbientLightCollector = {
    name: "browser-ambient-light",
    tags: ["browser", "sensors"],
    when: ["client-ready"],

    async run() {
        try {
            const sensor = new (window as any).AmbientLightSensor();
            let value = null;

            sensor.addEventListener("reading", () => {
                value = sensor.illuminance;
            });
            sensor.start();

            return { supported: true, value };
        } catch {
            return { supported: false };
        }
    }
};

export const browserProximityCollector = {
    name: "browser-proximity-sensor",
    tags: ["browser", "sensors"],
    when: ["client-ready"],

    async run() {
        try {
            const sensor = new (window as any).ProximitySensor();
            let near = null;

            sensor.addEventListener("reading", () => {
                near = sensor.near;
            });
            sensor.start();

            return { supported: true, near };
        } catch {
            return { supported: false };
        }
    }
};

export const browserVirtualKeyboardCollector = {
    name: "browser-virtual-keyboard",
    tags: ["browser", "mobile"],
    when: ["client-ready"],

    run() {
        return {
            supported: !!(navigator as any).virtualKeyboard,
            overlaysContent: (navigator as any).virtualKeyboard?.overlaysContent ?? null
        };
    }
};

export const browserNavigationAPICollector = {
    name: "browser-navigation-api",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        return {
            supported: !!(window.navigation),
            canIntercept: !!(window.navigation?.canGoBack)
        };
    }
};

export const browserWebRTCCollector = {
    name: "browser-webrtc-info",
    tags: ["browser", "media", "network"],
    when: ["client-ready"],

    run() {
        return {
            RTCPeerConnection: !!window.RTCPeerConnection,
            RTCDataChannel: !!(window as any).RTCDataChannel,
            getUserMedia: !!navigator.mediaDevices?.getUserMedia,
            enumerateDevices: !!navigator.mediaDevices?.enumerateDevices
        };
    }
};

export const browserMediaDevicesCollector = {
    name: "browser-media-devices",
    tags: ["browser", "media"],
    when: ["client-ready"],

    async run() {
        if (!navigator.mediaDevices?.enumerateDevices) return { supported: false };

        const devices = await navigator.mediaDevices.enumerateDevices();

        return {
            supported: true,
            devices: devices.map(d => ({
                kind: d.kind,
                label: d.label,
                deviceId: d.deviceId,
                groupId: d.groupId
            }))
        };
    }
};

export const browserFingerprintSignalsCollector = {
    name: "browser-fingerprint-signals",
    tags: ["browser", "security"],
    when: ["client-ready"],

    run() {
        return {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: navigator.language,
            cpu: navigator.hardwareConcurrency,
            deviceMemory: (navigator as any).deviceMemory ?? null,
            plugins: Array.from(navigator.plugins).map(p => p.name),
            mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type),
            screen: {
                width: screen.width,
                height: screen.height,
                pixelRatio: devicePixelRatio
            }
        };
    }
};
export const browserPermissionsCollector = {
    name: "browser-permissions",
    tags: ["browser", "security"],
    when: ["client-ready"],

    async run() {
        if (!navigator.permissions) return { supported: false };

        const queries = [
            "geolocation",
            "notifications",
            "camera",
            "microphone",
            "clipboard-read",
            "clipboard-write",
            "background-sync",
            "persistent-storage"
        ];

        const results: Record<string, string> = {};

        for (const q of queries) {
            try {
                const status = await navigator.permissions.query({ name: q as any });
                results[q] = status.state;
            } catch {
                results[q] = "unknown";
            }
        }

        return { supported: true, permissions: results };
    }
};


export const browserBFCacheCollector = {
    name: "browser-bfcache-info",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        return {
            supported: "onpageshow" in window,
            persistedEvents: []
        };
    }
};

export const browserCSSSupportCollector = {
    name: "browser-css-support",
    tags: ["browser", "css"],
    when: ["client-ready"],

    run() {
        const tests = [
            "display:grid",
            "display:flex",
            "backdrop-filter:blur(2px)",
            "position:sticky",
            "aspect-ratio:1/1",
            "scroll-timeline-name:none",
            "view-transition-name:none"
        ];

        const results: Record<string, boolean> = {};
        tests.forEach(t => (results[t] = CSS.supports(t)));

        return { supported: true, features: results };
    }
};

export const browserWebAnimationsCollector = {
    name: "browser-web-animations-api",
    tags: ["browser", "animation"],
    when: ["client-ready"],

    run() {
        return {
            animateMethod: typeof (Element.prototype as any).animate === "function",
            animationTimeline: typeof (window as any).AnimationTimeline !== "undefined",
            supportsViewTransitions: typeof (document as any).startViewTransition === "function"
        };
    }
};

export const browserMutationPressureCollector = {
    name: "browser-mutation-pressure",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let mutationCount = 0;

        const obs = new MutationObserver(() => mutationCount++);
        obs.observe(document.documentElement, { childList: true, subtree: true });

        return {
            supported: true,
            mutationCount
        };
    }
};

export const browserResizeObserverCollector = {
    name: "browser-resize-observer-stats",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let resizeCount = 0;
        if ("ResizeObserver" in window) {
            const ro = new ResizeObserver(() => resizeCount++);
            ro.observe(document.body);
        }

        return {
            supported: "ResizeObserver" in window,
            resizeCount
        };
    }
};

export const browserScrollPerformanceCollector = {
    name: "browser-scroll-performance",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let scrollEvents = 0;
        window.addEventListener("scroll", () => scrollEvents++);

        return {
            supported: true,
            scrollEvents
        };
    }
};

export const browserFormInteractionCollector = {
    name: "browser-form-interactions",
    tags: ["browser", "ux"],
    when: ["client-ready"],

    run() {
        let inputs = 0;
        let submits = 0;

        document.addEventListener("input", () => inputs++);
        document.addEventListener("submit", () => submits++);

        return {
            supported: true,
            inputEvents: inputs,
            formSubmits: submits
        };
    }
};

export const browserMemoryPressureCollector = {
    name: "browser-memory-pressure",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let pressureEvents = 0;
        window.addEventListener("memorypressure", () => pressureEvents++);
        return {
            supported: true,
            pressureEvents
        };
    }
};

export const browserVisibilityCollector = {
    name: "browser-visibility",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        let hiddenCount = 0;
        let visibleCount = 0;

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) hiddenCount++;
            else visibleCount++;
        });

        return {
            supported: true,
            hiddenCount,
            visibleCount
        };
    }
};

export const browserFocusCollector = {
    name: "browser-focus-blur",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        let focusEvents = 0;
        let blurEvents = 0;

        window.addEventListener("focus", () => focusEvents++);
        window.addEventListener("blur", () => blurEvents++);

        return { supported: true, focusEvents, blurEvents };
    }
};

export const browserLongTaskCollector = {
    name: "browser-long-tasks",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const tasks: number[] = [];
        if ("PerformanceObserver" in window) {
            const po = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    tasks.push(entry.duration);
                }
            });
            po.observe({ type: "longtask", buffered: true });
        }

        return { supported: true, tasks };
    }
};

export const browserCPUBenchmarkCollector = {
    name: "browser-cpu-benchmark",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const t0 = performance.now();
        let x = 0;
        for (let i = 0; i < 5_000_000; i++) x += i % 3;
        const t1 = performance.now();

        return { supported: true, durationMs: t1 - t0 };
    }
};

export const browserAllocationStressCollector = {
    name: "browser-memory-stress",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        try {
            const arr = new Array(50_000).fill(0).map(() => Math.random());
            return { supported: true, allocated: arr.length };
        } catch (e: any) {
            return { supported: true, error: e?.message };
        }
    }
};

export const browserWebAuthnCollector = {
    name: "browser-webauthn",
    tags: ["browser", "security", "auth"],
    when: ["client-ready"],

    run() {
        return {
            supported: !!(
                window.PublicKeyCredential &&
                navigator.credentials &&
                navigator.credentials.create
            ),
            conditionalUI: !!(PublicKeyCredential as any)?.isConditionalMediationAvailable
        };
    }
}; export const browserCredentialManagementCollector = {
    name: "browser-credential-management",
    tags: ["browser", "security", "auth"],
    when: ["client-ready"],

    run() {
        return {
            supported: !!navigator.credentials,
            passwordSupport: !!(navigator.credentials as any)?.get,
            federatedSupport: !!(window.FederatedCredential),
            publicKeySupport: !!(window.PublicKeyCredential)
        };
    }
}; export const browserClipboardEventsCollector = {
    name: "browser-clipboard-events",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        let copy = 0, paste = 0, cut = 0;

        document.addEventListener("copy", () => copy++);
        document.addEventListener("paste", () => paste++);
        document.addEventListener("cut", () => cut++);

        return {
            supported: true,
            copy,
            paste,
            cut
        };
    }
}; export const browserDOMEventVolumeCollector = {
    name: "browser-dom-event-volume",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let count = 0;
        const events = ["click", "input", "scroll", "mousemove", "keydown", "keyup"];
        events.forEach(e => document.addEventListener(e, () => count++));
        return { supported: true, count };
    }
}; export const browserIdleCallbackCollector = {
    name: "browser-idle-callback",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        return {
            supported: !!window.requestIdleCallback,
        };
    }
}; export const browserPaintTimingCollector = {
    name: "browser-paint-timing",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const entries = performance.getEntriesByType("paint");
        return {
            supported: entries.length > 0,
            entries: entries.map(e => ({ name: e.name, start: e.startTime }))
        };
    }
}; export const browserRenderBlockingCollector = {
    name: "browser-render-blocking",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const blocking = performance.getEntriesByType("resource")
            .filter((e: any) => e.initiatorType === "link" && e.renderBlockingStatus === "blocking")
            .map(e => e.name);

        return { supported: true, blocking };
    }
}; export const browserNavigationTimingCollector = {
    name: "browser-navigation-timing-full",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const nav = performance.getEntriesByType("navigation")[0] as any;
        if (!nav) return { supported: false };

        return {
            supported: true,
            timing: JSON.parse(JSON.stringify(nav))
        };
    }
}; export const browserResourceTimingCompressedCollector = {
    name: "browser-resource-timing-compressed",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const resources = performance.getEntriesByType("resource");
        const out = resources.map(r => ({
            n: r.name,
            d: r.duration,
            t: r.initiatorType,
            s: r.transferSize
        }));

        return { supported: true, resources: out };
    }
}; export const browserNavigatorFeaturesCollector = {
    name: "browser-navigator-features",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        const nav = navigator as any;
        return {
            supported: true,
            features: {
                bluetooth: !!nav.bluetooth,
                hid: !!nav.hid,
                usb: !!nav.usb,
                midi: !!nav.requestMIDIAccess,
                serial: !!nav.serial,
                share: !!nav.share,
                contacts: !!nav.contacts,
                scheduling: !!nav.scheduling
            }
        };
    }
}; export const browserCookieCapabilityCollector = {
    name: "browser-cookie-capabilities",
    tags: ["browser"],
    when: ["client-ready"],

    run() {
        return {
            supported: navigator.cookieEnabled,
            canWrite: (() => {
                try {
                    document.cookie = "x=y";
                    return true;
                } catch {
                    return false;
                }
            })()
        };
    }
}; export const browserScriptTimingCollector = {
    name: "browser-script-exec-timing",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const t0 = performance.now();
        for (let i = 0; i < 1_000_000; i++);
        const t1 = performance.now();

        return { supported: true, durationMs: t1 - t0 };
    }
}; export const browserWebGPUAdvancedCollector = {
    name: "browser-webgpu-advanced",
    tags: ["browser", "gpu"],
    when: ["client-ready"],

    async run() {
        if (!(navigator as any).gpu) return { supported: false };
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) return { supported: false };

        return {
            supported: true,
            features: [...adapter.features],
            limits: adapter.limits
        };
    }
}; export const browserNetworkActivityCollector = {
    name: "browser-network-activity",
    tags: ["browser", "network"],
    when: ["client-ready"],

    run() {
        let fetches = 0;

        const orig = window.fetch;
        window.fetch = (...args) => {
            fetches++;
            return orig(...args);
        };

        return { supported: true, fetches };
    }
}; export const browserFPSCollector = {
    name: "browser-fps",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let fps = 0, last = performance.now();

        function tick() {
            const now = performance.now();
            if (now - last >= 1000) {
                last = now;
            }
            fps++;
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);

        return { supported: true, fps };
    }
}; export const browserSlowDeviceHeuristicCollector = {
    name: "browser-slow-device-heuristic",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const cores = navigator.hardwareConcurrency || 1;
        const mem = (navigator as any).deviceMemory || 2;

        const score = cores * mem;
        return {
            supported: true,
            lowEnd: score <= 4,
            score
        };
    }
}; export const browserMediaRecorderCollector = {
    name: "browser-media-recorder",
    tags: ["browser", "media"],
    when: ["client-ready"],

    run() {
        return {
            supported: "MediaRecorder" in window,
            mimeTypes: [
                "video/webm;codecs=vp8",
                "video/webm;codecs=vp9",
                "video/mp4",
                "audio/webm",
                "audio/mp4"
            ].filter(m => MediaRecorder.isTypeSupported(m))
        };
    }
}; export const browserPaintWorkletCollector = {
    name: "browser-paint-worklet-support",
    tags: ["browser", "css"],
    when: ["client-ready"],

    run() {
        return {
            supported: !!(CSS as any).paintWorklet
        };
    }
}; export const browserWebAudioCollector = {
    name: "browser-web-audio",
    tags: ["browser", "audio"],
    when: ["client-ready"],

    run() {
        return {
            supported: !!window.AudioContext || !!(window as any).webkitAudioContext,
            sampleRate: (new (window.AudioContext || (window as any).webkitAudioContext)()).sampleRate
        };
    }
}; export const browserAudioOutputCollector = {
    name: "browser-audio-output-devices",
    tags: ["browser", "audio", "media"],
    when: ["client-ready"],

    async run() {
        if (!navigator.mediaDevices?.enumerateDevices) return { supported: false };
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            supported: true,
            outputs: devices
                .filter(d => d.kind === "audiooutput")
                .map(d => ({
                    label: d.label,
                    deviceId: d.deviceId,
                    groupId: d.groupId
                }))
        };
    }
}; export const browserTouchPressureCollector = {
    name: "browser-touch-pressure",
    tags: ["browser", "mobile", "input"],
    when: ["client-ready"],

    run() {
        let pressures: number[] = [];

        window.addEventListener("touchstart", e => {
            pressures.push(e.touches[0].force ?? 0);
        });

        window.addEventListener("touchmove", e => {
            pressures.push(e.touches[0].force ?? 0);
        });

        return { supported: true, pressures };
    }
}; export const browserPointerTypeCollector = {
    name: "browser-pointer-types",
    tags: ["browser", "input"],
    when: ["client-ready"],

    run() {
        let lastType = null;
        window.addEventListener("pointerdown", e => { lastType = e.pointerType; });
        return { supported: true, lastType };
    }
}; export const browserScrollEndCollector = {
    name: "browser-scroll-end",
    tags: ["browser", "ux"],
    when: ["client-ready"],

    run() {
        let hits = 0;
        window.addEventListener("scroll", () => {
            const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
            if (nearBottom) hits++;
        });

        return { supported: true, hits };
    }
}; export const browserTextSelectionCollector = {
    name: "browser-text-selection",
    tags: ["browser", "ux"],
    when: ["client-ready"],

    run() {
        let selections = 0;

        document.addEventListener("selectionchange", () => {
            const sel = window.getSelection();
            if (sel && sel.toString().length > 0) selections++;
        });

        return { supported: true, selections };
    }
}; export const browserInputLatencyCollector = {
    name: "browser-input-latency",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let latencies: number[] = [];

        window.addEventListener("pointerdown", () => {
            const start = performance.now();
            requestAnimationFrame(() => latencies.push(performance.now() - start));
        });

        return { supported: true, latencies };
    }
}; export const browserDOMNodeCountCollector = {
    name: "browser-dom-node-count",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const count = document.getElementsByTagName("*").length;
        return { supported: true, count };
    }
}; export const browserViewportResizeCollector = {
    name: "browser-viewport-resize",
    tags: ["browser", "ux"],
    when: ["client-ready"],

    run() {
        let resizeEvents = 0;
        window.addEventListener("resize", () => resizeEvents++);
        return {
            supported: true,
            resizeEvents
        };
    }
}; export const browserIntersectionObserverCollector = {
    name: "browser-intersection-observer",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const observed: number[] = [];

        if ("IntersectionObserver" in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) observed.push(performance.now());
                });
            });

            document.querySelectorAll("img,video").forEach(el => io.observe(el));
        }

        return { supported: true, observed };
    }
}; export const browserScrollDepthCollector = {
    name: "browser-scroll-depth",
    tags: ["browser", "ux"],
    when: ["client-ready"],

    run() {
        let maxDepth = 0;
        window.addEventListener("scroll", () => {
            const current = window.scrollY;
            if (current > maxDepth) maxDepth = current;
        });
        return { supported: true, maxDepth };
    }
}; export const browserICECandidateCollector = {
    name: "browser-webrtc-ice-candidates",
    tags: ["browser", "network"],
    when: ["client-ready"],

    async run() {
        if (!window.RTCPeerConnection) return { supported: false };

        const pc = new RTCPeerConnection({ iceServers: [] });
        const candidates: string[] = [];

        pc.onicecandidate = (e) => {
            if (e.candidate) candidates.push(e.candidate.candidate);
        };

        await pc.createDataChannel("x");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        return { supported: true, candidates };
    }
}; export const browserFontDetectionCollector = {
    name: "browser-font-detection",
    tags: ["browser", "ui"],
    when: ["client-ready"],

    async run() {
        if (!("queryLocalFonts" in navigator)) return { supported: false };

        try {
            const fonts = await (navigator as any).queryLocalFonts();
            return {
                supported: true,
                count: fonts.length,
                sample: fonts.slice(0, 20).map(f => f.fullName)
            };
        } catch {
            return { supported: false };
        }
    }
}; export const browserSpeechSynthesisCollector = {
    name: "browser-speech-synthesis",
    tags: ["browser", "audio"],
    when: ["client-ready"],

    run() {
        return {
            supported: "speechSynthesis" in window,
            voices: speechSynthesis.getVoices().map(v => ({
                name: v.name,
                lang: v.lang
            }))
        };
    }
}; export const browserSpeechRecognitionCollector = {
    name: "browser-speech-recognition",
    tags: ["browser", "audio"],
    when: ["client-ready"],

    run() {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        return { supported: !!SR };
    }
}; export const browserPrefetchCollector = {
    name: "browser-prefetch-info",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        const links = [...document.querySelectorAll("link[rel=prefetch], link[rel=prerender]")];
        return {
            supported: true,
            entries: links.map(l => ({
                rel: l.rel,
                href: l.href
            }))
        };
    }
}; export const browserPagePersistCollector = {
    name: "browser-page-persist",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let persistedEvents = 0;

        window.addEventListener("pageshow", (e: PageTransitionEvent) => {
            if (e.persisted) persistedEvents++;
        });

        return { supported: true, persistedEvents };
    }
}; export const browserDOMContentMutationCollector = {
    name: "browser-dom-content-mutation-volume",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let count = 0;
        const obs = new MutationObserver(() => count++);
        obs.observe(document.body, { characterData: true, subtree: true });

        return { supported: true, count };
    }
}; export const browserCPUIdleCollector = {
    name: "browser-cpu-idle",
    tags: ["browser", "performance"],
    when: ["client-ready"],

    run() {
        let idle: number[] = [];

        function measure() {
            const start = performance.now();
            requestIdleCallback((deadline) => {
                idle.push(deadline.timeRemaining());
                measure();
            });
        }

        if ("requestIdleCallback" in window) measure();

        return { supported: !!window.requestIdleCallback, idle };
    }
}; export const browserJSErrorCollector = {
    name: "browser-js-errors",
    tags: ["browser", "errors"],
    when: ["client-ready"],

    run() {
        const errors: any[] = [];

        window.addEventListener("error", e => {
            errors.push({
                message: e.message,
                file: e.filename,
                line: e.lineno,
                col: e.colno
            });
        });

        return { supported: true, errors };
    }
}; export const browserPromiseRejectionCollector = {
    name: "browser-unhandled-rejections",
    tags: ["browser", "errors"],
    when: ["client-ready"],

    run() {
        const rejections: any[] = [];

        window.addEventListener("unhandledrejection", e => {
            rejections.push({
                reason: (e.reason && e.reason.message) || String(e.reason)
            });
        });

        return { supported: true, rejections };
    }
};

export const frameworkDetectorCollector = {
    name: "framework-detector",
    tags: ["browser", "framework", "ui"],
    when: ["client-ready"],

    run() {
        const found: Record<string, any> = {};

        const check = (name: string, condition: boolean, extra: any = {}) => {
            if (condition) found[name] = { detected: true, ...extra };
        };

        const g = globalThis as any;

        /* ------------------------------------------------------------
           REACT
        ------------------------------------------------------------ */
        check("react",
            !!g.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
            !!g.React ||
            !!document.querySelector("[data-reactroot], [data-reactid]"),
            {
                version: g?.React?.version ?? null,
                devtools: !!g.__REACT_DEVTOOLS_GLOBAL_HOOK__,
            }
        );

        /* ------------------------------------------------------------
           VUE
        ------------------------------------------------------------ */
        check("vue",
            !!g.__VUE__ ||
            !!g.__VUE_DEVTOOLS_GLOBAL_HOOK__ ||
            !!document.querySelector("[data-v-app]"),
            {
                version: g?.Vue?.version ?? null,
            }
        );

        /* ------------------------------------------------------------
           SVELTE
        ------------------------------------------------------------ */
        check("svelte",
            // Svelte injects comment nodes like <!--!$Svelte$-->
            !![...document.querySelectorAll("*")].some(el =>
                [...el.childNodes].some(n =>
                    n.nodeType === 8 && /svelte/i.test(n.textContent || "")
                )
            ) ||
            !!g.__SVELTE_HMR__ ||
            !!g.__SVELTE__
        );

        /* ------------------------------------------------------------
           SOLIDJS
        ------------------------------------------------------------ */
        check("solid",
            !!g._$afterUpdate ||
            !!g._$effect ||
            !!g._$createRoot
        );

        /* ------------------------------------------------------------
           ANGULAR
        ------------------------------------------------------------ */
        check("angular",
            !!g.ng ||
            !!document.querySelector("[ng-version]"),
            { version: document.querySelector("[ng-version]")?.getAttribute("ng-version") }
        );

        /* ------------------------------------------------------------
           PREACT
        ------------------------------------------------------------ */
        check("preact",
            !!g.preact ||
            !!g.__PREACT_DEVTOOLS__
        );

        /* ------------------------------------------------------------
           LIT
        ------------------------------------------------------------ */
        check("lit",
            !!g.litHtmlVersions ||
            !!g.litElementVersions
        );

        /* ------------------------------------------------------------
           ALPINE.JS
        ------------------------------------------------------------ */
        check("alpine",
            !!g.Alpine ||
            !!document.querySelector("[x-data]")
        );

        /* ------------------------------------------------------------
           HTMX
        ------------------------------------------------------------ */
        check("htmx", !!g.htmx);

        /* ------------------------------------------------------------
           STIMULUS
        ------------------------------------------------------------ */
        check("stimulus",
            !!g.Stimulus ||
            !!document.querySelector("[data-controller]")
        );

        /* ------------------------------------------------------------
           EMBER
        ------------------------------------------------------------ */
        check("ember",
            !!g.Ember ||
            !!g.__EMBER_INSPECTOR__
        );

        /* ------------------------------------------------------------
           MITHRIL
        ------------------------------------------------------------ */
        check("mithril",
            !!g.m ||
            !!g.mithril
        );

        /* ------------------------------------------------------------
           MARKO
        ------------------------------------------------------------ */
        check("marko",
            !!g.$marko ||
            !!document.querySelector("meta[name=marko]")
        );

        /* ------------------------------------------------------------
           BACKBONE
        ------------------------------------------------------------ */
        check("backbone",
            !!g.Backbone
        );

        /* ------------------------------------------------------------
           KNOCKOUT
        ------------------------------------------------------------ */
        check("knockout",
            !!g.ko
        );

        /* ------------------------------------------------------------
           POLYMER
        ------------------------------------------------------------ */
        check("polymer",
            !!g.Polymer
        );

        /* ------------------------------------------------------------
           JSTEMPLATE / CLIENT‐SIDE TEMPLATING ENGINES
        ------------------------------------------------------------ */
        check("handlebars", !!g.Handlebars);
        check("mustache", !!g.Mustache);
        check("nunjucks", !!g.nunjucks);

        /* ------------------------------------------------------------
           WEB COMPONENTS DETECTION
        ------------------------------------------------------------ */
        const customTags = [...document.querySelectorAll("*")]
            .map(el => el.tagName.toLowerCase())
            .filter(tag => tag.includes("-"));

        if (customTags.length > 0) {
            check("web-components", true, { customElements: customTags });
        }

        /* ------------------------------------------------------------
           ASTRO (client-side hydrate markers)
        ------------------------------------------------------------ */
        check("astro",
            !!document.querySelector("[astro-root]") ||
            !!document.querySelector("astro-island")
        );

        /* ------------------------------------------------------------
           QWIK
        ------------------------------------------------------------ */
        check("qwik",
            !!document.querySelector("[q\\:container]") ||
            !!g.qwikCity ||
            !!g.qwik
        );

        return found;
    }
};

export const thirdPartyScriptCollector = {
    name: "third-party-scripts",
    tags: ["browser", "security", "scripts"],
    when: ["client-ready"],

    run() {
        const results: any = {
            initialScripts: [],
            dynamicScripts: [],
            evalScripts: [],
            workerScripts: [],
            importScripts: [],
            iframeScripts: [],
            allKnown: new Set<string>(),
        };

        const add = (group: string, src: string | null, extra: any = {}) => {
            const record = { src, ...extra };
            results[group].push(record);
            if (src) results.allKnown.add(src);
        };

        /* ------------------------------------------------------------
           1. INITIAL SCRIPTS PRESENT IN DOM
        ------------------------------------------------------------ */
        document.querySelectorAll("script").forEach(scr => {
            add("initialScripts", scr.src || null, {
                type: scr.type || null,
                async: scr.async,
                defer: scr.defer,
                integrity: scr.integrity || null,
                crossorigin: scr.crossOrigin || null,
                inlineSize: scr.src ? null : scr.textContent?.length ?? 0,
            });
        });

        /* ------------------------------------------------------------
           2. DYNAMIC SCRIPT INJECTION INTERCEPTION
           - appendChild
           - insertBefore
           - dynamic <script>
        ------------------------------------------------------------ */
        const origAppend = Element.prototype.appendChild;
        Element.prototype.appendChild = function (el: any) {
            if (el?.tagName === "SCRIPT") {
                add("dynamicScripts", el.src || null, {
                    type: el.type ?? null,
                    inlineSize: el.src ? null : el.textContent?.length ?? 0,
                    timestamp: Date.now(),
                });
            }
            return origAppend.call(this, el);
        };

        const origInsert = Element.prototype.insertBefore;
        Element.prototype.insertBefore = function (el: any) {
            if (el?.tagName === "SCRIPT") {
                add("dynamicScripts", el.src || null, {
                    type: el.type ?? null,
                    inlineSize: el.src ? null : el.textContent?.length ?? 0,
                    timestamp: Date.now(),
                });
            }
            return origInsert.call(this, el);
        };

        /* ------------------------------------------------------------
           3. INTERCEPT document.write SCRIPT TAGS
        ------------------------------------------------------------ */
        const origWrite = document.write;
        document.write = function (...args: any[]) {
            const html = args.join("");
            if (html.includes("<script")) {
                const srcMatch = html.match(/src=["']([^"']+)["']/);
                add("dynamicScripts", srcMatch ? srcMatch[1] : null, {
                    source: "document.write",
                    raw: html,
                });
            }
            return origWrite.apply(document, args as any);
        };

        /* ------------------------------------------------------------
           4. INLINE EVAL / new Function DETECTION
        ------------------------------------------------------------ */
        const origEval = globalThis.eval;
        globalThis.eval = function (code: string) {
            add("evalScripts", null, {
                size: code.length,
                timestamp: Date.now(),
            });
            return origEval(code);
        };

        const OrigFunction = globalThis.Function;
        globalThis.Function = function (...args: any[]) {
            const body = args[args.length - 1];
            add("evalScripts", null, {
                size: body.length,
                timestamp: Date.now(),
            });
            return new OrigFunction(...args);
        } as any;

        /* ------------------------------------------------------------
           5. WORKER / SHARED WORKER / SERVICE WORKER DETECTION
        ------------------------------------------------------------ */
        const origWorker = globalThis.Worker;
        if (origWorker) {
            globalThis.Worker = function (src: string, opts: any) {
                add("workerScripts", src, {
                    type: "worker",
                    options: opts ?? null,
                });
                return new origWorker(src, opts);
            } as any;
        }

        const origShared = globalThis.SharedWorker;
        if (origShared) {
            globalThis.SharedWorker = function (src: string, opts: any) {
                add("workerScripts", src, {
                    type: "shared-worker",
                    options: opts ?? null,
                });
                return new origShared(src, opts);
            } as any;
        }

        if (navigator.serviceWorker) {
            const origRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
            navigator.serviceWorker.register = function (src: string, opts: any) {
                add("workerScripts", src, {
                    type: "service-worker",
                    options: opts ?? null,
                });
                return origRegister(src, opts);
            };
        }

        /* ------------------------------------------------------------
           6. import() DYNAMIC MODULE DETECTION
        ------------------------------------------------------------ */
        const origImport = globalThis.import ?? null;
        if (origImport) {
            globalThis.import = async (...args: any[]) => {
                add("importScripts", args[0], { timestamp: Date.now() });
                return await origImport(...args);
            };
        }

        /* ------------------------------------------------------------
           7. INTERCEPT XHR / FETCH-RETURNED JAVASCRIPT
              (External script loaders like Hubspot, GTM, Hotjar, etc)
        ------------------------------------------------------------ */
        const origFetch = fetch;
        globalThis.fetch = async (...args: any[]) => {
            const res = await origFetch(...args);
            const url = typeof args[0] === "string" ? args[0] : args[0].url;

            const contentType = res.headers.get("content-type");
            if (contentType?.includes("javascript")) {
                add("dynamicScripts", url, {
                    type: "fetch-js",
                    timestamp: Date.now(),
                });
            }
            return res;
        };

        const origXHR = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (...args: any[]) {
            this.__scriptUrl = args[1];
            return origXHR.apply(this, args as any);
        };

        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (...args: any[]) {
            this.addEventListener("load", () => {
                const ct = this.getResponseHeader("content-type");
                if (ct?.includes("javascript")) {
                    add("dynamicScripts", this.__scriptUrl ?? null, {
                        type: "xhr-js",
                    });
                }
            });
            return origSend.apply(this, args as any);
        };

        /* ------------------------------------------------------------
           8. IFRAME SCRIPT DETECTION
        ------------------------------------------------------------ */
        const observeIframes = () => {
            document.querySelectorAll("iframe").forEach(iframe => {
                try {
                    const doc = iframe.contentDocument;
                    if (!doc) return;
                    doc.querySelectorAll("script").forEach(scr => {
                        add("iframeScripts", scr.src || null, {
                            iframe: iframe.src || null,
                        });
                    });
                } catch {/* cross origin */ }
            });
        };
        observeIframes();

        /* Auto-recheck iframes periodically */
        setInterval(observeIframes, 3000);

        /* ------------------------------------------------------------
           FINAL OUTPUT
        ------------------------------------------------------------ */
        return {
            ...results,
            allKnown: [...results.allKnown],
        };
    }
};

export const cookieConsentCollector = {
    name: "cookie-consent-status",
    tags: ["browser", "privacy", "cookies", "consent"],
    when: ["client-ready"],

    run() {
        const res: any = {
            status: "unknown",
            source: null,
            details: {},
        };

        const cookies = Object.fromEntries(
            document.cookie.split(";").map(c => {
                const [k, v] = c.trim().split("=");
                return [k, decodeURIComponent(v ?? "")];
            })
        );

        const ls = { ...localStorage };
        const ss = { ...sessionStorage };

        /* ------------------------------------------------------------
           1. IAB TCF v2 CMP Detection (Standardized)
           __tcfapi("getTCData", 2, ...)
        ------------------------------------------------------------ */
        try {
            if (typeof (window as any).__tcfapi === "function") {
                return new Promise(resolve => {
                    (window as any).__tcfapi("getTCData", 2, (tcData: any) => {
                        res.source = "IAB TCF v2";
                        res.details = tcData || {};

                        if (!tcData) {
                            res.status = "pending";
                        } else if (tcData.eventStatus === "useractioncomplete") {
                            res.status = tcData.purpose.consents["1"] ? "accepted" : "declined";
                        } else if (tcData.eventStatus === "cmpuishown") {
                            res.status = "pending";
                        } else {
                            res.status = "unknown";
                        }

                        resolve(res);
                    });
                });
            }
        } catch { }

        /* ------------------------------------------------------------
           2. Google Consent Mode v2
           gtag("get", "consent", ...)
           cookies: "CONSENT="
        ------------------------------------------------------------ */
        if ("CONSENT" in cookies) {
            res.source = "Google Consent Mode";
            const value = cookies.CONSENT;

            if (value.includes("YES+")) res.status = "accepted";
            else if (value.includes("NO+")) res.status = "declined";
            else res.status = "pending";

            res.details.cookie = value;
            return res;
        }

        /* ------------------------------------------------------------
           3. OneTrust
           Cookies: OptanonConsent, OptanonAlertBoxClosed
        ------------------------------------------------------------ */
        if (cookies.OptanonConsent) {
            res.source = "OneTrust";
            res.details.cookie = cookies.OptanonConsent;

            if (cookies.OptanonAlertBoxClosed) {
                res.status = "accepted";
            } else {
                res.status = "pending";
            }

            return res;
        }

        /* ------------------------------------------------------------
           4. Cookiebot
           Cookies: CookieConsent
           LocalStorage: CookieConsentBulkSetting
        ------------------------------------------------------------ */
        if (cookies.CookieConsent) {
            res.source = "Cookiebot";
            res.details.cookie = cookies.CookieConsent;

            try {
                const parsed = JSON.parse(cookies.CookieConsent);
                res.status = parsed.consented ? "accepted" : "declined";
            } catch {
                res.status = cookies.CookieConsent.includes("true")
                    ? "accepted"
                    : "declined";
            }

            return res;
        }

        /* ------------------------------------------------------------
           5. Osano
           Cookie: osano_consentmanager
           LocalStorage: osano_consent
        ------------------------------------------------------------ */
        if (ls.osano_consentmanager || cookies.osano_consentmanager) {
            res.source = "Osano";
            res.details = {
                cookie: cookies.osano_consentmanager ?? null,
                localStorage: ls.osano_consentmanager ?? null,
            };

            const raw = ls.osano_consentmanager || cookies.osano_consentmanager;

            if (raw?.includes("accepted")) res.status = "accepted";
            else if (raw?.includes("denied")) res.status = "declined";
            else res.status = "pending";

            return res;
        }

        /* ------------------------------------------------------------
           6. TrustArc
           cookie: notice_gdpr_prefs
        ------------------------------------------------------------ */
        if (cookies.notice_gdpr_prefs) {
            res.source = "TrustArc";
            const prefs = cookies.notice_gdpr_prefs;

            if (prefs.includes("1:1")) res.status = "accepted";
            else if (prefs.includes("1:0")) res.status = "declined";
            else res.status = "pending";

            res.details.cookie = prefs;
            return res;
        }

        /* ------------------------------------------------------------
           7. Enzuzo (your platform)
           LocalStorage: enzuzo-consent, enzuzo-preferences
        ------------------------------------------------------------ */
        if (ls["enzuzo-consent"] || ls["enzuzo-preferences"]) {
            res.source = "Enzuzo";
            const raw = ls["enzuzo-consent"] ?? ls["enzuzo-preferences"];

            try {
                const parsed = JSON.parse(raw);
                if (parsed.accepted) res.status = "accepted";
                else if (parsed.declined) res.status = "declined";
                else res.status = "pending";
                res.details = parsed;
            } catch {
                res.status = raw.includes("true") ? "accepted" : "declined";
            }

            return res;
        }

        /* ------------------------------------------------------------
           8. CookieYes
           cookieyes-consent
        ------------------------------------------------------------ */
        if (ls["cookieyes-consent"] || cookies["cookieyes-consent"]) {
            res.source = "CookieYes";
            const raw = ls["cookieyes-consent"] ?? cookies["cookieyes-consent"];

            res.status = raw.includes("yes") ? "accepted" : "declined";
            res.details = { raw };
            return res;
        }

        /* ------------------------------------------------------------
           9. Complianz
           cmplz_choice / cmplz_preferences
        ------------------------------------------------------------ */
        if (cookies.cmplz_choice) {
            res.source = "Complianz";
            const c = cookies.cmplz_choice;

            if (c.includes("allowall")) res.status = "accepted";
            else if (c.includes("dismissed")) res.status = "declined";
            else res.status = "pending";

            res.details.cookie = c;
            return res;
        }

        /* ------------------------------------------------------------
           10. Hubspot Privacy Banner
           hubspotutk + __hs_opt_out
        ------------------------------------------------------------ */
        if ("__hs_opt_out" in cookies) {
            res.source = "HubSpot Privacy";
            res.status = cookies.__hs_opt_out === "yes" ? "declined" : "accepted";
            res.details.cookie = cookies.__hs_opt_out;
            return res;
        }

        /* ------------------------------------------------------------
           11. Shopify / Squarespace / Wix
           (use generic heuristics)
        ------------------------------------------------------------ */
        const heuristicMatch = [
            "cookie_consent",
            "user_accepts_cookies",
            "accept_cookies",
            "cookie_policy",
            "privacy_consent",
        ].find(k =>
            Object.keys(cookies).some(x => x.toLowerCase().includes(k))
        );

        if (heuristicMatch) {
            res.source = "Generic Heuristic";
            const val = cookies[heuristicMatch];

            res.status =
                val.includes("true") || val.includes("accept") ? "accepted"
                    : val.includes("deny") || val.includes("0") ? "declined"
                        : "pending";

            res.details.cookie = { [heuristicMatch]: val };
            return res;
        }

        /* ------------------------------------------------------------
           12. No CMP detected
        ------------------------------------------------------------ */
        res.status = "no-banner";
        return res;
    }
};

export const longTasksCollector = {
    name: "long-tasks",
    tags: ["browser", "performance"],
    when: ["client-ready"],
    run() {
        try {
            if (typeof PerformanceObserver === "undefined") return null;
            if (!("longtask" in PerformanceObserver.supportedEntryTypes ?? []))
                return null;

            const tasks: any[] = [];
            const obs = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    tasks.push({
                        name: entry.name,
                        duration: entry.duration,
                        start: entry.startTime,
                        attribution: entry.attribution ?? null
                    });
                }
            });

            obs.observe({ entryTypes: ["longtask"] });

            return { supported: true, tasks };
        } catch {
            return null;
        }
    }
}; export const layoutShiftCollector = {
    name: "layout-shift",
    tags: ["browser", "performance"],
    when: ["client-ready"],
    run() {
        try {
            if (!("layout-shift" in PerformanceObserver.supportedEntryTypes)) return null;

            const shifts: any[] = [];

            const obs = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        shifts.push({
                            value: entry.value,
                            start: entry.startTime,
                            impactedNodes: entry.sources?.map(s => ({
                                node: s.node?.tagName,
                                previous: s.previousRect,
                                current: s.currentRect,
                            }))
                        });
                    }
                }
            });

            obs.observe({ type: "layout-shift", buffered: true });
            return { supported: true, shifts };
        } catch {
            return null;
        }
    }
}; export const elementTimingCollector = {
    name: "element-timing",
    tags: ["browser", "performance"],
    when: ["client-ready"],
    run() {
        try {
            if (!("element" in PerformanceObserver.supportedEntryTypes)) return null;

            const elements: any[] = [];

            const obs = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    elements.push({
                        id: entry.identifier,
                        url: entry.url,
                        renderTime: entry.renderTime || entry.loadTime,
                        start: entry.startTime,
                        naturalWidth: entry.naturalWidth,
                        naturalHeight: entry.naturalHeight
                    });
                }
            });

            obs.observe({ type: "element", buffered: true });

            return { supported: true, elements };
        } catch {
            return null;
        }
    }
}; export const navigationCollector = {
    name: "navigation-api",
    tags: ["browser"],
    when: ["client-ready"],
    run() {
        try {
            if (typeof navigation === "undefined") return null;

            return {
                canGoBack: navigation.canGoBack ?? null,
                canGoForward: navigation.canGoForward ?? null,
                entries: navigation.entries?.().map(e => ({
                    index: e.index,
                    url: e.url,
                    key: e.key,
                    sameDocument: e.sameDocument,
                    state: e.getState?.() ?? null
                })) ?? null
            };
        } catch {
            return null;
        }
    }
}; export const computePressureCollector = {
    name: "compute-pressure",
    tags: ["browser", "performance"],
    when: ["client-ready"],
    async run() {
        try {
            if (!("ComputePressureObserver" in window)) return null;

            const readings: any[] = [];

            const obs = new (window as any).ComputePressureObserver((updates: any[]) => {
                readings.push(...updates);
            });

            await obs.observe("cpu");

            return { supported: true, readings };
        } catch {
            return null;
        }
    }
}; export const idleDetectorCollector = {
    name: "idle-detector",
    tags: ["browser"],
    when: ["client-ready"],
    async run() {
        try {
            if (!("IdleDetector" in window)) return null;

            const detector = new (window as any).IdleDetector();
            await detector.start({ threshold: 60000 });

            return {
                userState: detector.userState,
                screenState: detector.screenState
            };

        } catch {
            return null;
        }
    }
}; export const keyboardLayoutCollector = {
    name: "keyboard-layout",
    tags: ["browser", "input"],
    when: ["client-ready"],
    async run() {
        try {
            if (!navigator.keyboard || !navigator.keyboard.getLayoutMap) return null;
            const map = await navigator.keyboard.getLayoutMap();
            const out: any = {};
            map.forEach((val, key) => { out[key] = val; });

            return out;
        } catch {
            return null;
        }
    }
}; export const heatmapCollector = {
    name: "interaction-heatmap",
    tags: ["browser", "ui"],
    when: ["client-ready"],
    run() {
        try {
            const heat: Record<string, number> = {};

            function record(e: Element | null) {
                if (!e) return;
                const key = e.tagName + (e.id ? `#${e.id}` : "");
                heat[key] = (heat[key] ?? 0) + 1;
            }

            document.addEventListener("click", (e) => record(e.target as Element));
            document.addEventListener("mousemove", (e) => record(document.elementFromPoint(e.clientX, e.clientY)));

            return heat;
        } catch {
            return null;
        }
    }
}; export const gestureCollector = {
    name: "gesture-navigation",
    tags: ["browser", "mobile"],
    when: ["client-ready"],
    run() {
        try {
            const gestures: any[] = [];

            let startX = 0, startY = 0;

            window.addEventListener("touchstart", e => {
                const t = e.touches[0];
                startX = t.clientX;
                startY = t.clientY;
            });

            window.addEventListener("touchend", e => {
                const t = e.changedTouches[0];
                const dx = t.clientX - startX;
                const dy = t.clientY - startY;

                const absX = Math.abs(dx);
                const absY = Math.abs(dy);

                if (absX > 50 || absY > 50) {
                    gestures.push({
                        direction:
                            absX > absY
                                ? dx > 0 ? "swipe-right" : "swipe-left"
                                : dy > 0 ? "swipe-down" : "swipe-up",
                        magnitude: { x: dx, y: dy }
                    });
                }
            });

            return { gestures };
        } catch {
            return null;
        }
    }
}; export const domMemoryCollector = {
    name: "dom-memory",
    tags: ["browser", "performance"],
    when: ["client-ready"],
    run() {
        try {
            return {
                nodeCount: document.getElementsByTagName("*").length,
                listenerCount: (() => {
                    try {
                        // Best-effort detection
                        return (window as any).getEventListeners
                            ? Object.keys((window as any).getEventListeners(document) || {}).length
                            : null;
                    } catch {
                        return null;
                    }
                })()
            };
        } catch {
            return null;
        }
    }
}; export const renderingPipelineCollector = {
    name: "rendering-pipeline",
    tags: ["browser", "performance"],
    when: ["client-ready"],
    run() {
        try {
            if (!performance || !performance.getEntriesByType) return null;

            const frames = performance.getEntriesByType("render") as any[];
            return frames.map(f => ({
                duration: f.duration,
                start: f.startTime,
                dropped: f.droppedFrameCount ?? null
            }));
        } catch {
            return null;
        }
    }
}; export const paintTimingCollector = {
    name: "paint-timing",
    tags: ["browser", "performance"],
    when: ["client-ready"],
    run() {
        try {
            const paints = performance.getEntriesByType("paint");
            return paints.map(p => ({
                name: p.name,
                start: p.startTime
            }));
        } catch {
            return null;
        }
    }
}; export const preloadDiagnosticsCollector = {
    name: "preload-diagnostics",
    tags: ["browser", "performance"],
    when: ["client-ready"],
    run() {
        try {
            const resources = performance.getEntriesByType("resource");

            const preloads = resources.filter((r: any) => r.initiatorType === "preload");
            const unused = preloads.filter((p: any) => !p.responseEnd);

            return { preloads, unused };
        } catch {
            return null;
        }
    }
}; export const serviceWorkerCollector = {
    name: "service-worker",
    tags: ["browser"],
    when: ["client-ready"],
    async run() {
        try {
            if (!navigator.serviceWorker) return null;

            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return null;

            return {
                scope: reg.scope,
                active: !!reg.active,
                installing: !!reg.installing,
                waiting: !!reg.waiting,
                updateViaCache: reg.updateViaCache,
                installingState: reg.installing?.state ?? null,
                waitingState: reg.waiting?.state ?? null,
                activeState: reg.active?.state ?? null
            };
        } catch {
            return null;
        }
    }
}; export const featureFlagsCollector = {
    name: "feature-flags",
    tags: ["browser"],
    when: ["client-ready"],
    run() {
        const api = (x: string) => x in window;

        return {
            webgpu: api("GPU"),
            webtransport: api("WebTransport"),
            webcodecs: api("VideoEncoder"),
            payments: api("PaymentRequest"),
            filesystemAccess: api("showSaveFilePicker"),
            popover: api("Popover"),
            navigationAPI: api("navigation"),
            storageBuckets: navigator.storage && "getDirectory" in navigator.storage,
            schedulingPriorities: api("scheduler")
        };
    }
}; export const installedAppsCollector = {
    name: "installed-related-apps",
    tags: ["browser"],
    when: ["client-ready"],
    async run() {
        try {
            if (!navigator.getInstalledRelatedApps) return null;
            return await navigator.getInstalledRelatedApps();
        } catch {
            return null;
        }
    }
}; export const hapticsCollector = {
    name: "haptics-support",
    tags: ["browser", "mobile"],
    when: ["client-ready"],
    run() {
        try {
            return {
                vibration: !!navigator.vibrate,
                haptics: "Haptics" in window
            };
        } catch {
            return null;
        }
    }
}; export const mediaSessionCollector = {
    name: "media-session",
    tags: ["browser", "media"],
    when: ["client-ready"],
    run() {
        try {
            if (!("mediaSession" in navigator)) return null;
            const ms: any = navigator.mediaSession;

            return {
                playbackState: ms.playbackState ?? null,
                metadata: ms.metadata ? {
                    title: ms.metadata.title,
                    artist: ms.metadata.artist,
                    album: ms.metadata.album
                } : null
            };
        } catch {
            return null;
        }
    }
}; export const speechCollector = {
    name: "speech-api",
    tags: ["browser"],
    when: ["client-ready"],
    run() {
        try {
            return {
                ttsSupported: typeof speechSynthesis !== "undefined",
                voices: typeof speechSynthesis !== "undefined"
                    ? speechSynthesis.getVoices().map(v => ({
                        name: v.name, lang: v.lang, local: v.localService
                    }))
                    : null,
                sttSupported: "webkitSpeechRecognition" in window
            };
        } catch {
            return null;
        }
    }
}; export const storagePressureCollector = {
    name: "storage-pressure",
    tags: ["browser"],
    when: ["client-ready"],
    async run() {
        try {
            if (!navigator.storage?.estimate) return null;
            const est = await navigator.storage.estimate();
            return est;
        } catch {
            return null;
        }
    }
}; export const credentialCollector = {
    name: "credential-management",
    tags: ["browser", "auth"],
    when: ["client-ready"],
    run() {
        try {
            return {
                passwordCredential: "PasswordCredential" in window,
                federatedCredential: "FederatedCredential" in window,
                webauthnPlatformAuthenticator:
                    !!(navigator.credentials?.create) &&
                    (PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable
                        ? PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                        : null)
            };
        } catch {
            return null;
        }
    }
};

export function detectThirdPartyPlatforms() {
    const results: Record<string, any> = {};
    const w: any = window;

    const cookies = Object.fromEntries(
        document.cookie.split(";").map(c => {
            const [k, v] = c.trim().split("=");
            return [k, decodeURIComponent(v ?? "")];
        })
    );

    const scripts = Array.from(document.scripts).map(s => s.src || "");
    const iframes = Array.from(document.querySelectorAll("iframe")).map(f => f.src || "");

    const resources = performance.getEntriesByType("resource").map((r: any) => r.name);

    // Helper to check if any source contains a match
    const match = (...patterns: string[]) => {
        const lower = patterns.map(p => p.toLowerCase());
        const has = (arr: string[]) => arr.some(url => lower.some(p => url.toLowerCase().includes(p)));

        return has(scripts) || has(iframes) || has(resources);
    };

    const hasCookie = (...names: string[]) =>
        names.some(n => n in cookies);

    const hasGlobal = (...names: string[]) =>
        names.some(n => n in w);

    /* ============================================================
       1. HUBSPOT
    ============================================================ */
    results.hubspot = (
        hasGlobal("_hsq", "hbspt", "__hsqOnReady") ||
        match("hs-scripts.com", "hsforms", "hubspot", "hs-banner") ||
        hasCookie("hubspotutk", "__hssrc", "__hssc", "__hstc")
    );

    /* ============================================================
       2. GOOGLE TAG MANAGER / ANALYTICS / CONSENT MODE
    ============================================================ */
    results.google = {
        gtm: match("gtm.js", "googletagmanager.com"),
        analytics: match("google-analytics.com", "ga.js", "analytics.js"),
        tag: match("gtag/js"),
        ads: match("doubleclick.net", "googleads"),
        consent: hasCookie("CONSENT") || hasGlobal("dataLayer")
    };

    /* ============================================================
       3. META / FACEBOOK PIXEL
    ============================================================ */
    results.facebook = (
        match("connect.facebook.net/en_US/fbevents.js") ||
        hasCookie("_fbp") ||
        hasGlobal("fbq")
    );

    /* ============================================================
       4. TIKTOK PIXEL
    ============================================================ */
    results.tiktok = match("analytics.tiktok.com", "tiktok", "ttq") || hasGlobal("ttq");

    /* ============================================================
       5. LINKEDIN INSIGHT
    ============================================================ */
    results.linkedin = (
        match("snap.licdn.com") ||
        hasCookie("li_fat_id")
    );

    /* ============================================================
       6. TWITTER PIXEL
    ============================================================ */
    results.twitter = (
        match("static.ads-twitter.com") ||
        hasCookie("twclid") ||
        hasGlobal("twq")
    );

    /* ============================================================
       7. KLAVIYO
    ============================================================ */
    results.klaviyo = (
        match("klaviyo.com", "static.klaviyo") ||
        hasGlobal("_learnq")
    );

    /* ============================================================
       8. SEGMENT (Analytics.js)
    ============================================================ */
    results.segment = (
        match("cdn.segment.com", "segment") ||
        hasGlobal("analytics")
    );

    /* ============================================================
       9. INTERCOM
    ============================================================ */
    results.intercom = (
        match("widget.intercom.io") ||
        hasCookie("intercom-id", "intercom-session") ||
        hasGlobal("Intercom")
    );

    /* ============================================================
       10. DRIFT
    ============================================================ */
    results.drift = (
        match("js.driftt.com") ||
        hasGlobal("drift", "dft")
    );

    /* ============================================================
       11. CRISP
    ============================================================ */
    results.crisp = match("client.crisp.chat") || hasGlobal("$crisp");

    /* ============================================================
       12. FULLSTORY
    ============================================================ */
    results.fullstory = (
        match("fullstory.com", "fs.js") ||
        hasGlobal("FS")
    );

    /* ============================================================
       13. HOTJAR
    ============================================================ */
    results.hotjar = (
        match("static.hotjar.com") ||
        hasCookie("_hjSession", "_hjSessionUser") ||
        hasGlobal("hj")
    );

    /* ============================================================
       14. AMPLITUDE
    ============================================================ */
    results.amplitude = match("amplitude.com", "amplitude") || hasGlobal("amplitude");

    /* ============================================================
       15. MIXPANEL
    ============================================================ */
    results.mixpanel = (
        match("cdn.mixpanel.com") ||
        hasGlobal("mixpanel")
    );

    /* ============================================================
       16. HEAP
    ============================================================ */
    results.heap = match("cdn.heapanalytics.com") || hasGlobal("heap");

    /* ============================================================
       17. POSTHOG
    ============================================================ */
    results.posthog = (
        match("app.posthog.com", "posthog") ||
        hasGlobal("posthog")
    );

    /* ============================================================
       18. CRAZY EGG
    ============================================================ */
    results.crazyegg = match("script.crazyegg.com");

    /* ============================================================
       19. OPTIMIZELY
    ============================================================ */
    results.optimizely = (
        match("cdn.optimizely.com") ||
        hasGlobal("optimizely")
    );

    /* ============================================================
       20. VWO (Visual Website Optimizer)
    ============================================================ */
    results.vwo = (
        match("dev.visualwebsiteoptimizer.com", "vwo.com") ||
        hasGlobal("_vwo_code")
    );

    /* ============================================================
       21. COOKIEBOT
    ============================================================ */
    results.cookiebot = (
        match("cookiebot.com", "consent.cookiebot") ||
        hasGlobal("Cookiebot")
    );

    /* ============================================================
       22. ONETRUST
    ============================================================ */
    results.onetrust = (
        hasGlobal("Optanon") ||
        match("onetrust.com") ||
        hasCookie("OptanonConsent")
    );

    /* ============================================================
       23. TRUSTARC
    ============================================================ */
    results.trustarc = (
        match("trustarc", "truste") ||
        hasCookie("notice_gdpr_prefs")
    );

    /* ============================================================
       24. ENZUZO (your platform)
    ============================================================ */
    results.enzuzo = (
        hasGlobal("Enzuzo") ||
        hasCookie("enzuzo-consent", "enzuzo-preferences") ||
        match("enzuzo.com")
    );

    /* ============================================================
       25. MAILCHIMP
    ============================================================ */
    results.mailchimp = match("mc.yandex") || match("list-manage.com") || match("mailchimp");

    /* ============================================================
       26. MARKETO
    ============================================================ */
    results.marketo = match("munchkin.js") || hasCookie("_mkto_trk");

    /* ============================================================
       27. SALESFORCE (Pardot, etc.)
    ============================================================ */
    results.salesforce = {
        pardot: match("pardot.com", "pi.pardot") || hasCookie("visitor_id"),
        marketingCloud: match("exacttarget.com", "salesforce.com/mc")
    };

    /* ============================================================
       28. ADOBE ANALYTICS / TARGET
    ============================================================ */
    results.adobe = {
        analytics: match("omtrdc.net", "adobedc.net", "s_code.js"),
        target: match("adobetarget")
    };

    /* ============================================================
       29. MATOMO
    ============================================================ */
    results.matomo = match("matomo", "piwik") || hasGlobal("_paq");

    /* ============================================================
       30. YANDEX METRICA
    ============================================================ */
    results.yandex = match("mc.yandex.ru") || hasGlobal("ym");


    return results;
}