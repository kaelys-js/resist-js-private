import { execSync } from "child_process";
import fs from "fs";

function safe(cmd: string) {
    try {
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch {
        return null;
    }
}

export function getMacOSInfo() {
    if (process.platform !== "darwin") {
        return { isMacOS: false };
    }

    return {
        isMacOS: true,

        // --------------------------------------------------
        // CORE OS INFO
        // --------------------------------------------------
        version: safe("sw_vers"),
        productName: safe("sw_vers -productName"),
        productVersion: safe("sw_vers -productVersion"),
        buildVersion: safe("sw_vers -buildVersion"),

        // --------------------------------------------------
        // HARDWARE INFO
        // --------------------------------------------------
        hardware: {
            cpuBrand: safe("sysctl -n machdep.cpu.brand_string"),
            cpuCores: safe("sysctl -n hw.ncpu"),
            cpuPerf: safe("sysctl -a | grep cpu"),
            memBytes: safe("sysctl -n hw.memsize"),
            chip: safe("sysctl -n machdep.cpu.brand_string") ?? safe("sysctl -n machdep.cpu.vendor"),
            machineModel: safe("sysctl -n hw.model"),
            machineName: safe("scutil --get ComputerName"),
            machineHost: safe("scutil --get HostName"),
            localHost: safe("scutil --get LocalHostName"),
            serial: safe("system_profiler SPHardwareDataType | grep 'Serial Number'"),
            firmware: safe("system_profiler SPHardwareDataType | grep 'Boot ROM Version'"),
            socID: safe("system_profiler SPiBridgeDataType 2>/dev/null"),
        },

        // --------------------------------------------------
        // ARCH + ROSETTA
        // --------------------------------------------------
        architecture: {
            arch: process.arch,
            uname: safe("uname -a"),
            isAppleSilicon: process.arch === "arm64",
            isIntel: process.arch === "x64",
            rosetta: safe("sysctl -n sysctl.proc_translated") === "1" ? true : false,
        },

        // --------------------------------------------------
        // SYSTEM PROFILER (HIGH-DETAIL)
        // --------------------------------------------------
        systemProfiler: {
            hardware: safe("system_profiler SPHardwareDataType"),
            software: safe("system_profiler SPSoftwareDataType"),
            storage: safe("system_profiler SPStorageDataType"),
            network: safe("system_profiler SPNetworkDataType"),
            thunderbolt: safe("system_profiler SPThunderboltDataType"),
            bluetooth: safe("system_profiler SPBluetoothDataType"),
        },

        // --------------------------------------------------
        // POWER / BATTERY / ENERGY
        // --------------------------------------------------
        power: {
            pmset: safe("pmset -g"),
            smc: safe("pmset -g thermlog") ?? null,
            battery: safe("pmset -g batt"),
            assertions: safe("pmset -g assertions"),
        },

        // --------------------------------------------------
        // SECURITY STATUS
        // --------------------------------------------------
        security: {
            sip: safe("csrutil status"),
            gatekeeper: safe("spctl --status"),
            xprotect: safe("system_profiler SPInstallHistoryDataType | grep -i xprotect"),
            firewall: safe("/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate"),
            tccDbExists: fs.existsSync("/Library/Application Support/com.apple.TCC/TCC.db"),
        },

        // --------------------------------------------------
        // FILESYSTEM / VOLUMES
        // --------------------------------------------------
        filesystem: {
            apfs: safe("diskutil apfs list"),
            volumes: safe("df -h"),
            fstab: safe("grep -v '#' /etc/fstab 2>/dev/null"),
            mountInfo: safe("mount"),
            timeMachine: safe("tmutil destinationinfo") ?? null,
        },

        // --------------------------------------------------
        // NVRAM INFO
        // --------------------------------------------------
        nvram: safe("nvram -p"),

        // --------------------------------------------------
        // NETWORK
        // --------------------------------------------------
        network: {
            interfaces: safe("ifconfig -a"),
            hardwarePorts: safe("networksetup -listallhardwareports"),
            wifiInfo: safe("/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I"),
            proxySettings: safe("scutil --proxy"),
            dns: safe("scutil --dns"),
        },

        // --------------------------------------------------
        // BLUETOOTH / AUDIO
        // --------------------------------------------------
        audio: {
            output: safe("system_profiler SPAudioDataType"),
            bluetoothDevices: safe("system_profiler SPBluetoothDataType"),
        },

        // --------------------------------------------------
        // INSTALLED APPLICATIONS
        // --------------------------------------------------
        applications: {
            userApplications: safe("ls /Applications"),
            systemApplications: safe("ls /System/Applications"),
            developerTools: safe("xcode-select -p"),
            xcodeBuild: safe("xcodebuild -version"),
        },

        // --------------------------------------------------
        // VIRTUALIZATION (VM / PARALLELS / VMWare)
        // --------------------------------------------------
        virtualization: {
            hypervisorFramework: safe("sysctl kern.hv_support"),
            parallels: safe("prlctl list 2>/dev/null"),
            vmware: safe("vmware-toolbox-cmd -v 2>/dev/null"),
            virtualBox: safe("VBoxManage --version 2>/dev/null"),
        },

        // --------------------------------------------------
        // SANDBOX / ENTITLEMENTS
        // --------------------------------------------------
        sandbox: {
            containerized: !!process.env.APP_SANDBOX_CONTAINER_ID,
            sandboxID: process.env.APP_SANDBOX_CONTAINER_ID ?? null,
        },

        // --------------------------------------------------
        // SPOTLIGHT / INDEXING
        // --------------------------------------------------
        spotlight: {
            indexingStatus: safe("mdutil -s /"),
            disabledVolumes: safe("mdutil -a -s"),
        },

        // --------------------------------------------------
        // PRIVACY / TCC
        // --------------------------------------------------
        tcc: {
            camera: safe("tccutil check Camera") ?? null,
            microphone: safe("tccutil check Microphone") ?? null,
            screenRecording: safe("tccutil check ScreenCapture") ?? null,
        },

        // --------------------------------------------------
        // WINDOW SERVER INFO
        // --------------------------------------------------
        windowServer: {
            displayInfo: safe("system_profiler SPDisplaysDataType"),
            quartzDebug: safe("defaults read com.apple.QuartzDebug 2>/dev/null"),
        },

        // --------------------------------------------------
        // PACKAGE MANAGERS
        // --------------------------------------------------
        packageManagers: {
            brewPath: safe("which brew"),
            brewInfo: safe("brew --version"),
            brewList: safe("brew list 2>/dev/null"),
            macPorts: safe("port version 2>/dev/null"),
        },

        // --------------------------------------------------
        // LAUNCH DAEMONS / AGENTS
        // --------------------------------------------------
        launch: {
            agents: safe("ls ~/Library/LaunchAgents"),
            daemons: safe("ls /Library/LaunchDaemons 2>/dev/null"),
            systemAgents: safe("ls /System/Library/LaunchAgents 2>/dev/null"),
        },
    };
}