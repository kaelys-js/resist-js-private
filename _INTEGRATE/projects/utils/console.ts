/* =======================================================================
   UNIVERSAL CONSOLE DETECTORS — FULL SUITE
   Covers all consoles where JavaScript can run.
   Works in Node, Bun, Deno, Browser, Homebrew JS engines.
======================================================================= */

import os from "os";
import fs from "fs";

/** Safe FS check */
function exists(path: string) {
    try { return fs.existsSync(path); } catch { return false; }
}

/** Safe read file */
function read(path: string) {
    try { return fs.readFileSync(path, "utf8"); } catch { return null; }
}

/* =======================================================================
   1. PLAYSTATION (PS5 / PS4 / PS3) – Browser only
   Browser JS can detect limited fingerprint from navigator + userAgent
======================================================================= */
function detectPlayStationBrowser() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("playstation 5")) return { console: "PS5", browser: true };
    if (ua.includes("playstation 4")) return { console: "PS4", browser: true };
    if (ua.includes("playstation 3")) return { console: "PS3", browser: true };

    return null;
}

/* =======================================================================
   2. XBOX (Series X/S / One) – Browser JS
======================================================================= */
function detectXboxBrowser() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("xbox")) {
        return {
            console: "Xbox",
            browser: true,
            edgeEngine: navigator.userAgent
        };
    }
    return null;
}

/* =======================================================================
   3. NINTENDO SWITCH — Browser Mode (Captive Portal)
======================================================================= */
function detectSwitchBrowser() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("nintendo switch")) {
        return {
            console: "Nintendo Switch",
            browser: true,
            captivePortal: true
        };
    }
    return null;
}

/* =======================================================================
   4. NINTENDO SWITCH — Homebrew Mode (Node/QuickJS)
======================================================================= */
function detectSwitchHomebrew() {
    // Typical Switch homebrew paths
    const candidates = [
        "/switch/.overlays",
        "/atmosphere/config",
        "/config/system_settings.ini"
    ];

    if (candidates.some(exists)) {
        return {
            console: "Nintendo Switch",
            homebrew: true,
            atmosphere: exists("/atmosphere") || exists("/atmosphere/config"),
            sysmodules: exists("/atmosphere/contents")
        };
    }

    return null;
}

/* =======================================================================
   5. Wii U — Browser JS & Homebrew
======================================================================= */
function detectWiiU() {
    if (typeof navigator !== "undefined" &&
        navigator.userAgent.includes("WiiU")) {
        return { console: "Wii U", browser: true };
    }

    // Homebrew hack possible detection:
    if (exists("/wiiu/apps")) {
        return { console: "Wii U", homebrew: true };
    }

    return null;
}

/* =======================================================================
   6. Wii — Browser and Homebrew
======================================================================= */
function detectWii() {
    if (typeof navigator !== "undefined" &&
        navigator.userAgent.toLowerCase().includes("wii")) {
        return { console: "Wii", browser: true };
    }

    if (exists("/apps") && exists("/boot.elf")) {
        return { console: "Wii", homebrew: true };
    }

    return null;
}

/* =======================================================================
   7. PlayStation Vita — Browser + HENkaku homebrew
======================================================================= */
function detectVita() {
    if (typeof navigator !== "undefined" &&
        navigator.userAgent.includes("PlayStation Vita")) {
        return { console: "PS Vita", browser: true };
    }

    // Vita HENkaku homebrew FS markers
    if (exists("/ur0") || exists("/ux0")) {
        return {
            console: "PS Vita",
            homebrew: true,
            ux0Exists: exists("/ux0"),
            ur0Exists: exists("/ur0")
        };
    }

    return null;
}

/* =======================================================================
   8. PSP — Browser + CFW homebrew
======================================================================= */
function detectPSP() {
    if (typeof navigator !== "undefined" &&
        navigator.userAgent.includes("PSP")) {
        return { console: "PSP", browser: true };
    }

    if (exists("/PSP") || exists("/seplugins")) {
        return { console: "PSP", homebrew: true };
    }

    return null;
}

/* =======================================================================
   9. Nintendo 3DS — Browser + Homebrew
======================================================================= */
function detect3DS() {
    if (typeof navigator !== "undefined" &&
        navigator.userAgent.includes("Nintendo 3DS")) {
        return { console: "3DS", browser: true };
    }

    if (exists("/3ds")) {
        return { console: "3DS", homebrew: true };
    }

    return null;
}

/* =======================================================================
   10. Nintendo DS / DSi — Homebrew
======================================================================= */
function detectDS() {
    if (exists("/_nds") || exists("/moonshl2") || exists("/TTMenu")) {
        return { console: "Nintendo DS/DSi", homebrew: true };
    }
    return null;
}

/* =======================================================================
   11. Steam Deck — Native Linux
======================================================================= */
function detectSteamDeck() {
    if (os.platform() === "linux") {
        const hw = read("/sys/devices/virtual/dmi/id/product_name");
        if (hw?.toLowerCase().includes("jupiter")) { // Steam Deck codename
            return {
                console: "Steam Deck",
                linux: true,
                dmiProduct: hw.trim()
            };
        }
    }
    return null;
}

/* =======================================================================
   12. Dreamcast — PlanetWeb JS
======================================================================= */
function detectDreamcast() {
    if (typeof navigator !== "undefined" &&
        navigator.userAgent.includes("DreamPassport")) {
        return { console: "Dreamcast", browser: true };
    }
    return null;
}

/* =======================================================================
   13. Smart TV JS Engines (Tizen / webOS) — Consoles-in-practice
======================================================================= */
function detectSmartTV() {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("tizen")) return { console: "Samsung Tizen TV" };
    if (ua.includes("web0s") || ua.includes("webos")) return { console: "LG webOS TV" };

    return null;
}

/* =======================================================================
   14. Minecraft Bedrock Script Engine
   JS API → Only runtime indicator is script engine globals
======================================================================= */
function detectMinecraftBedrock() {
    if (typeof globalThis !== "undefined") {
        if (globalThis["system"] && globalThis["system"].runTimeout) {
            return {
                console: "Minecraft Bedrock Engine",
                scripting: true
            };
        }
    }
    return null;
}

/* =======================================================================
   MASTER AGGREGATOR
======================================================================= */
export function getAllConsoleInfo() {
    return {
        playstation: detectPlayStationBrowser(),
        xbox: detectXboxBrowser(),
        switchBrowser: detectSwitchBrowser(),
        switchHomebrew: detectSwitchHomebrew(),
        wiiu: detectWiiU(),
        wii: detectWii(),
        vita: detectVita(),
        psp: detectPSP(),
        _3ds: detect3DS(),
        ds: detectDS(),
        steamDeck: detectSteamDeck(),
        dreamcast: detectDreamcast(),
        smartTV: detectSmartTV(),
        minecraft: detectMinecraftBedrock()
    };
}