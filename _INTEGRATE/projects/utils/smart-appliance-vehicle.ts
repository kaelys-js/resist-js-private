/* =======================================================================
   UNIVERSAL VEHICLE OS DETECTORS
======================================================================= */

function detectAndroidAutomotive() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("android") &&
        (ua.includes("automotive") || ua.includes("car") || ua.includes("aaos"))
    ) {
        return {
            os: "Android Automotive OS (AAOS)",
            browser: true,
            webEngine: "Chromium/WebView",
            manufacturer: navigator.vendor || null,
            model: navigator.userAgent
        };
    }
    return null;
}

function detectCarPlay() {
    if (typeof navigator === "undefined") return null;
    // CarPlay doesn't expose official UA, but CarPlay WebViews leak Safari hints:
    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("carplay") ||
        (ua.includes("iphone") && ua.includes("safari") && screen.width < 700 && navigator.maxTouchPoints > 0)
    ) {
        return {
            os: "Apple CarPlay",
            browser: true,
            engine: "WebKit",
            model: navigator.userAgent
        };
    }
    return null;
}

function detectMirrorLink() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("mirrorlink") || ua.includes("mlbrowser")) {
        return {
            os: "MirrorLink",
            browser: true
        };
    }
    return null;
}

function detectFordSyncJS() {
    // Ford Sync 3 / Sync 4 uses a JS-capable embedded WebKit UI
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("ford") || ua.includes("sync 3") || ua.includes("syncbrowser")) {
        return {
            os: "Ford Sync",
            browser: true,
            engine: "WebKit Embedded"
        };
    }
    return null;
}

function detectTesla() {
    // Tesla browser is Chromium with unique tokens
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("tesla") ||
        (navigator.vendor === "" && ua.includes("chrome") && screen.width > 1500)
    ) {
        return {
            os: "Tesla Browser",
            browser: true,
            engine: "Chromium"
        };
    }
    return null;
}

function detectGMUltium() {
    // GM Ultium UI based on Android Automotive
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("ultium") || ua.includes("gm-ivi")) {
        return {
            os: "GM Ultium IVI",
            browser: true,
            engine: "Android Automotive Chromium"
        };
    }
    return null;
}

function detectMBUX() {
    // Mercedes MBUX includes a WebKit WebView for apps
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("mbux") || ua.includes("mercedes")) {
        return {
            os: "Mercedes MBUX",
            browser: true,
            engine: "WebKit"
        };
    }
    return null;
}

function detectBMWiDrive() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("bmw") || ua.includes("idrive") || ua.includes("bmw-webkit")) {
        return {
            os: "BMW iDrive",
            browser: true
        };
    }
    return null;
}

function detectVolvoSPAAuto() {
    // Volvo uses Android Automotive directly
    return detectAndroidAutomotive() ? {
        os: "Volvo SPA2 / Android Automotive",
        browser: true
    } : null;
}

function detectCarBrowserGeneric() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("ivi") ||
        ua.includes("in-vehicle") ||
        ua.includes("automotive") ||
        ua.includes("headunit")
    ) {
        return {
            os: "Generic Car IVI Browser",
            browser: true
        };
    }

    return null;
}

/* =======================================================================
   AGGREGATE VEHICLE OS DETECTION
======================================================================= */
export function getAllVehicleOSInfo() {
    return {
        androidAutomotive: detectAndroidAutomotive(),
        carPlay: detectCarPlay(),
        mirrorLink: detectMirrorLink(),
        fordSync: detectFordSyncJS(),
        tesla: detectTesla(),
        gmUltium: detectGMUltium(),
        mbux: detectMBUX(),
        bmw: detectBMWiDrive(),
        volvo: detectVolvoSPAAuto(),
        genericCar: detectCarBrowserGeneric()
    };
}

/* =======================================================================
   UNIVERSAL SMART APPLIANCE OS DETECTORS
======================================================================= */

function detectTizenTV() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("tizen") && ua.includes("tv")) {
        return {
            appliance: "Samsung Tizen Smart TV",
            browser: true,
            engine: "Tizen WebEngine"
        };
    }
    return null;
}

function detectWebOSTV() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("webos") && ua.includes("smarttv")) {
        return {
            appliance: "LG webOS TV",
            browser: true,
            engine: "WebKit / V8"
        };
    }
    return null;
}

function detectRoku() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("roku") || ua.includes("rdk")) {
        return {
            appliance: "Roku TV",
            browser: true,
            engine: "Chromium overlay"
        };
    }
    return null;
}

function detectFireTV() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("aft") || ua.includes("amazon-fireos") || ua.includes("fire tv")) {
        return {
            appliance: "Fire TV",
            browser: true,
            engine: "Android WebView"
        };
    }
    return null;
}

function detectAndroidTV() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("android tv")) {
        return {
            appliance: "Android TV",
            browser: true,
            engine: "Chromium/WebView"
        };
    }
    return null;
}

function detectAlexaDevice() {
    if (typeof navigator === "undefined") return null;
    // Echo Show browser reports weird WebKit UA
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("echo show") || ua.includes("alexa")) {
        return {
            appliance: "Amazon Alexa / Echo Show",
            browser: true,
            engine: "WebKit"
        };
    }
    return null;
}

function detectGoogleNestHub() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("cr-key") || ua.includes("nesthub")) {
        return {
            appliance: "Google Nest Hub",
            browser: true,
            engine: "Chromium"
        };
    }
    return null;
}

function detectSmartFridge() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    // Samsung Family Hub
    if (ua.includes("familyhub") || ua.includes("fridge") || ua.includes("tizen")) {
        return {
            appliance: "Smart Fridge (Samsung Family Hub)",
            browser: true,
            engine: "Tizen WebView"
        };
    }

    return null;
}

function detectGenericIoTJS() {
    // Detect embedded JS engines (iotjs, jerryscript, quickjs)
    const g: any = globalThis;

    if (g.IoTJS || g.iotjs) return { appliance: "IoT.js Device", engine: "IoT.js (JerryScript)" };
    if (g.JerryScript) return { appliance: "JerryScript IoT Device", engine: "JerryScript" };
    if (g.QuickJS) return { appliance: "QuickJS IoT Device", engine: "QuickJS" };
    if (g.Duktape) return { appliance: "Duktape Device", engine: "Duktape" };

    return null;
}

/* =======================================================================
   AGGREGATE SMART APPLIANCE INFO
======================================================================= */
export function getAllSmartApplianceInfo() {
    return {
        tizenTV: detectTizenTV(),
        webOSTV: detectWebOSTV(),
        roku: detectRoku(),
        fireTV: detectFireTV(),
        androidTV: detectAndroidTV(),
        alexa: detectAlexaDevice(),
        nestHub: detectGoogleNestHub(),
        smartFridge: detectSmartFridge(),
        genericIoT: detectGenericIoTJS(),
    };
}

/* =======================================================================
   TV & SET-TOP BOX JS RUNTIME DETECTORS (MISSING ONES)
======================================================================= */

/* --------------------------
   ROKU (SceneGraph + JS Apps)
--------------------------- */
export function detectRokuOS() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("roku") ||
        ua.includes("rokutv") ||
        ua.includes("rokudev")
    ) {
        return {
            platform: "Roku",
            os: "Roku OS",
            browser: true,
            engine: "Roku Browser / RSG / limited WebKit"
        };
    }
    return null;
}

/* --------------------------
   APPLE TV (tvOS)
--------------------------- */
export function detectAppleTV() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("apple tv") ||
        ua.includes("tvos") ||
        ua.includes("appletv")
    ) {
        return {
            platform: "Apple tvOS",
            engine: "WebKit (TVMLKit / JavaScriptCore)",
            browser: true
        };
    }
    return null;
}

/* --------------------------
   VIDAA (Hisense)
--------------------------- */
export function detectVidaaOS() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("vidaa")) {
        return {
            platform: "Hisense VIDAA TV",
            engine: "VIDAA HTML5 Engine",
            browser: true
        };
    }
    return null;
}

/* --------------------------
   OPERA TV / VEWD
--------------------------- */
export function detectVewdOS() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("vewd") ||
        ua.includes("opera tv") ||
        ua.includes("otvwebview")
    ) {
        return {
            platform: "Opera TV / Vewd",
            engine: "Opera / Chromium fork",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   FIRE TV (Android-based)
--------------------------- */
export function detectFireTV() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("aft") ||          // Amazon Fire Tablet/TV codes
        ua.includes("amazon-fireos") ||
        ua.includes("fire tv")
    ) {
        return {
            platform: "Amazon Fire TV",
            engine: "Chromium WebView",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   CHROMECAST (receiver apps)
--------------------------- */
export function detectChromecastReceiver() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("crkey") || ua.includes("chromecast")) {
        return {
            platform: "Chromecast Receiver",
            engine: "Chrome Embedded Web Runtime",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   SKY Q / SKY GLASS (LightningJS)
--------------------------- */
export function detectSkyQ() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("skyq") ||
        ua.includes("sky glass") ||
        ua.includes("lightningjs") ||
        ua.includes("sky-sspl")
    ) {
        return {
            platform: "Sky Q / Sky Glass",
            engine: "LightningJS (JavaScript UI)",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   XFINITY X1 / FLEX / RDK
--------------------------- */
export function detectRDK() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("rdk") ||
        ua.includes("comcast") ||
        ua.includes("x1") ||
        ua.includes("xfinit") ||
        ua.includes("cableapp")
    ) {
        return {
            platform: "RDK STB (Xfinity / Sky / Cox / Rogers)",
            engine: "LightningJS + WebKit/Chromium hybrid",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   TIVO HYDRA UI (HTML5)
--------------------------- */
export function detectTiVo() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("tivo") || ua.includes("hydra")) {
        return {
            platform: "TiVo (Hydra UI)",
            engine: "Chromium-based HTML5 engine",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   AMINO IPTV (AminoOS)
--------------------------- */
export function detectAminoOS() {
    if (typeof navigator === "undefined") return null;

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("amino")) {
        return {
            platform: "Amino IPTV",
            engine: "HTML5 Browser (JS Enabled)",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   MAG BOX (Infomir)
--------------------------- */
export function detectMAGBox() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("mag") &&
        (ua.includes("stb") || ua.includes("infomir"))
    ) {
        return {
            platform: "Infomir MAG IPTV Box",
            engine: "WebKit Portal Browser",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   HUAWEI / ZTE IPTV BOXES
--------------------------- */
export function detectHuaweiOrZTEIPTV() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("zte-stb") ||
        ua.includes("zte-tv") ||
        ua.includes("huawei") ||
        ua.includes("huaweistb")
    ) {
        return {
            platform: "Huawei/ZTE IPTV Box",
            engine: "WebKit Browser",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   ARRIS / PACE IPTV (RDK-based)
--------------------------- */
export function detectArrisPace() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("arris") ||
        ua.includes("pace") ||
        ua.includes("arris-stb") ||
        ua.includes("pace-stb")
    ) {
        return {
            platform: "Arris/Pace IPTV Box",
            engine: "RDK / LightningJS",
            browser: true
        };
    }

    return null;
}

/* --------------------------
   FREEBOX / BBOX / FRENCH IPTV
--------------------------- */
export function detectFrenchIPTV() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (
        ua.includes("freebox") ||
        ua.includes("bbox") ||
        ua.includes("bouygues") ||
        ua.includes("sfr-stb")
    ) {
        return {
            platform: "French IPTV (Freebox / Bbox / SFR)",
            engine: "Android TV / WebKit (varies)",
            browser: true
        };
    }

    return null;
}

/* =======================================================================
   AGGREGATE DETECTOR (TV + STB + IPTV)
======================================================================= */

export function getAllTVAndSTBInfo() {
    return {
        roku: detectRokuOS(),
        appleTV: detectAppleTV(),
        vidaa: detectVidaaOS(),
        vewd: detectVewdOS(),
        fireTV: detectFireTV(),
        chromecast: detectChromecastReceiver(),
        skyQ: detectSkyQ(),
        rdk: detectRDK(),
        tivo: detectTiVo(),
        amino: detectAminoOS(),
        mag: detectMAGBox(),
        huaweiZTE: detectHuaweiOrZTEIPTV(),
        arrisPace: detectArrisPace(),
        frenchIPTV: detectFrenchIPTV()
    };
}