import { execSync } from "child_process";
import fs from "fs";

function safe(cmd: string) {
    try {
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch {
        return null;
    }
}

export function getWindowsInfo() {
    if (process.platform !== "win32") {
        return { isWindows: false };
    }

    return {
        isWindows: true,

        // ---------------------------------------------------------
        // CORE WINDOWS VERSION INFO
        // ---------------------------------------------------------
        version: {
            systemInfo: safe("systeminfo"),
            osName: safe("wmic os get Caption"),
            osVersion: safe("wmic os get Version"),
            buildNumber: safe("wmic os get BuildNumber"),
            architecture: safe("wmic os get OSArchitecture"),
            registeredOwner: safe("wmic os get RegisteredUser"),
            registeredOrganization: safe("wmic os get Organization"),
        },

        // ---------------------------------------------------------
        // HARDWARE INFO
        // ---------------------------------------------------------
        hardware: {
            cpu: safe("wmic cpu get Name,NumberOfCores,NumberOfLogicalProcessors /format:list"),
            memory: safe("wmic memorychip get capacity /format:list"),
            bios: safe("wmic bios get Manufacturer,SMBIOSBIOSVersion,ReleaseDate /format:list"),
            motherboard: safe("wmic baseboard get Manufacturer,Product,SerialNumber /format:list"),
            battery: safe("wmic path Win32_Battery get EstimatedChargeRemaining,BatteryStatus /format:list"),
            virtualizationFirmware: safe("wmic computersystem get Model,Manufacturer /format:list"),
            firmwareType: safe("powershell \"(Get-ItemProperty HKLM:\\System\\CurrentControlSet\\Control).PEFirmwareType\""),
        },

        // ---------------------------------------------------------
        // GPU + GRAPHICS INFO
        // ---------------------------------------------------------
        graphics: {
            gpus: safe("wmic path win32_VideoController get Name,DriverVersion /format:list"),
            directX: safe("dxdiag /t dxdiag_output.txt") ? safe("type dxdiag_output.txt") : null,
        },

        // ---------------------------------------------------------
        // DISK / FILESYSTEM / BITLOCKER
        // ---------------------------------------------------------
        storage: {
            disks: safe("wmic diskdrive get Model,Size,Status /format:list"),
            volumes: safe("wmic logicaldisk get Name,FileSystem,Size,FreeSpace /format:list"),
            bitlocker: safe("manage-bde -status C:"),
        },

        // ---------------------------------------------------------
        // NETWORKING
        // ---------------------------------------------------------
        network: {
            ipconfig: safe("ipconfig /all"),
            wmicNic: safe("wmic nic get Name,MACAddress,Speed /format:list"),
            routingTable: safe("route print"),
            firewallStatus: safe("netsh advfirewall show allprofiles"),
            dnsCache: safe("ipconfig /displaydns"),
            hostsFileExists: fs.existsSync("C:\\Windows\\System32\\drivers\\etc\\hosts"),
            hostsFile: safe("type C:\\Windows\\System32\\drivers\\etc\\hosts"),
        },

        // ---------------------------------------------------------
        // USER & SECURITY
        // ---------------------------------------------------------
        security: {
            uacStatus: safe("reg query HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v EnableLUA"),
            defenderStatus: safe("powershell \"Get-MpComputerStatus\""),
            defenderThreats: safe("powershell \"Get-MpThreat\""),
            firewallProfiles: safe("netsh advfirewall show allprofiles"),
            domain: safe("wmic computersystem get Domain /format:list"),
            domainRole: safe("wmic computersystem get DomainRole /format:list"),
            loggedInUser: safe("whoami"),
            sid: safe("wmic useraccount where name='%USERNAME%' get sid"),
        },

        // ---------------------------------------------------------
        // ACTIVE SESSIONS
        // ---------------------------------------------------------
        sessions: {
            querySessions: safe("query session"),
            loggedUsers: safe("query user"),
        },

        // ---------------------------------------------------------
        // PROCESS + SERVICES
        // ---------------------------------------------------------
        system: {
            services: safe("sc query state= all"),
            tasks: safe("tasklist"),
            drivers: safe("driverquery"),
            installedPrograms: safe("wmic product get Name,Version /format:list"),
        },

        // ---------------------------------------------------------
        // WINDOWS FEATURES
        // ---------------------------------------------------------
        features: {
            installedFeatures: safe("powershell \"Get-WindowsOptionalFeature -Online\""),
            hyperV: safe("powershell \"Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All\""),
            wslInstalled: safe("wsl -l -v"),
        },

        // ---------------------------------------------------------
        // VIRTUALIZATION DETECTION
        // ---------------------------------------------------------
        virtualization: {
            hyperV: safe("powershell \"Get-VMHost\""),
            virtualBox: safe("VBoxManage.exe --version 2>null"),
            vmware: safe("vmware -v 2>null"),
            qemu: safe("wmic path Win32_PnPEntity get Name | findstr /i \"QEMU\""),
            parallels: safe("prlctl --version 2>null"),
            azureVM: !!safe("powershell \"Get-AzVM 2>$null\""),
            awsEC2: safe("powershell \"(Get-EC2InstanceMetadata -Category InstanceId)\""),
        },

        // ---------------------------------------------------------
        // WSL DETECTION
        // ---------------------------------------------------------
        wsl: {
            isWSL: !!process.env.WSL_DISTRO_NAME,
            version: safe("wsl -l -v"),
        },

        // ---------------------------------------------------------
        // POWER SETTINGS
        // ---------------------------------------------------------
        power: {
            powercfg: safe("powercfg /batteryreport /output battery.html") ? "battery.html" : null,
            sleepSettings: safe("powercfg /a"),
            energyReport: safe("powercfg /energy"),
        },

        // ---------------------------------------------------------
        // TIME / TIMEZONE
        // ---------------------------------------------------------
        datetime: {
            timezone: safe("tzutil /g"),
            ntpStatus: safe("w32tm /query /status"),
        },

        // ---------------------------------------------------------
        // ENVIRONMENT
        // ---------------------------------------------------------
        environment: {
            path: process.env.PATH,
            systemRoot: process.env.SystemRoot,
            temp: process.env.TEMP,
            userProfile: process.env.USERPROFILE,
            programFiles: process.env.ProgramFiles,
            programFilesX86: process.env["ProgramFiles(x86)"],
        },

        // ---------------------------------------------------------
        // REGISTRY (READ-ONLY SAFE KEYS)
        // ---------------------------------------------------------
        registry: {
            startupApproved: safe("reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run"),
            policies: safe("reg query HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies"),
            uninstallKeys: safe("reg query HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall"),
        },

        // ---------------------------------------------------------
        // WINDOWS SHELL (Explorer)
        // ---------------------------------------------------------
        explorer: {
            folders: {
                desktop: process.env.USERPROFILE + "\\Desktop",
                documents: process.env.USERPROFILE + "\\Documents",
                downloads: process.env.USERPROFILE + "\\Downloads",
                startMenu: process.env.APPDATA + "\\Microsoft\\Windows\\Start Menu",
            },
            taskbar: safe("reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Taskband"),
        },

        // ---------------------------------------------------------
        // PACKAGE MANAGERS
        // ---------------------------------------------------------
        packageManagers: {
            winget: safe("winget --version"),
            chocolatey: safe("choco --version"),
            scoop: safe("scoop --version"),
            nuget: safe("nuget help"),
            pip: safe("pip --version"),
            npm: safe("npm --version"),
            yarn: safe("yarn --version"),
            pnpm: safe("pnpm --version"),
        },
    };
}