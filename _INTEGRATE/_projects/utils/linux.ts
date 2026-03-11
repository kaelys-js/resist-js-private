import { execSync } from "child_process";
import fs from "fs";

function safe(cmd: string) {
    try {
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch {
        return null;
    }
}

export function getLinuxInfo() {
    if (process.platform !== "linux") {
        return { isLinux: false };
    }

    // Helper: read file if exists
    const read = (p: string) => {
        try { return fs.readFileSync(p, "utf8").trim(); }
        catch { return null; }
    };

    return {
        isLinux: true,

        // ---------------------------------------------------------
        // OS + DISTRO IDENTIFICATION
        // ---------------------------------------------------------
        distro: {
            osRelease: read("/etc/os-release"),
            distroID: safe("grep '^ID=' /etc/os-release"),
            distroLike: safe("grep '^ID_LIKE=' /etc/os-release"),
            version: safe("grep '^VERSION=' /etc/os-release"),
            name: safe("lsb_release -a"),
            hostnameCtl: safe("hostnamectl"),
            ubuntuCodename: safe("grep '^UBUNTU_CODENAME=' /etc/os-release"),
            prettyName: safe("grep '^PRETTY_NAME=' /etc/os-release"),
        },

        // ---------------------------------------------------------
        // KERNEL
        // ---------------------------------------------------------
        kernel: {
            uname: safe("uname -a"),
            version: safe("uname -r"),
            release: safe("uname -v"),
            architecture: safe("uname -m"),
            modules: safe("lsmod"),
            sysctl: safe("sysctl -a 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // CPU INFO
        // ---------------------------------------------------------
        cpu: {
            cpuinfo: read("/proc/cpuinfo"),
            lscpu: safe("lscpu"),
            cores: safe("nproc"),
            governor: safe("cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"),
            topology: safe("lstopo-no-graphics 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // MEMORY
        // ---------------------------------------------------------
        memory: {
            meminfo: read("/proc/meminfo"),
            free: safe("free -h"),
        },

        // ---------------------------------------------------------
        // STORAGE / FILESYSTEM
        // ---------------------------------------------------------
        storage: {
            mounts: read("/proc/mounts"),
            diskUsage: safe("df -h"),
            blockDevices: safe("lsblk -f"),
            fstab: read("/etc/fstab"),
            mdraid: safe("cat /proc/mdstat"),
            smartctl: safe("smartctl --scan 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // NETWORK
        // ---------------------------------------------------------
        network: {
            ip: safe("ip addr"),
            route: safe("ip route"),
            ifconfig: safe("ifconfig -a"),
            resolv: read("/etc/resolv.conf"),
            hosts: read("/etc/hosts"),
            firewall: {
                ufw: safe("ufw status 2>/dev/null"),
                firewalld: safe("firewall-cmd --state 2>/dev/null"),
                iptables: safe("iptables -L 2>/dev/null"),
                nftables: safe("nft list ruleset 2>/dev/null"),
            },
            netstat: safe("netstat -tulnp 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // GPU
        // ---------------------------------------------------------
        gpu: {
            lspciGPU: safe("lspci | grep -i 'vga\\|3d\\|display'"),
            nvidiaSmi: safe("nvidia-smi 2>/dev/null"),
            vulkan: safe("vulkaninfo 2>/dev/null"),
            glxinfo: safe("glxinfo -B 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // SECURITY
        // ---------------------------------------------------------
        security: {
            selinux: read("/sys/fs/selinux/enforce") ?? safe("getenforce"),
            apparmor: safe("aa-status 2>/dev/null"),
            capabilities: safe("capsh --print 2>/dev/null"),
            pam: safe("grep -r '' /etc/pam.d 2>/dev/null"),
            sudoers: read("/etc/sudoers"),
            fail2ban: safe("fail2ban-client status 2>/dev/null"),
            firejail: safe("firejail --list 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // CONTAINER DETECTION
        // ---------------------------------------------------------
        container: {
            dockerEnv: fs.existsSync("/.dockerenv"),
            dockerCGroup: safe("grep -i docker /proc/1/cgroup"),
            kubernetesCGroup: safe("grep -i kube /proc/1/cgroup"),
            containerType: safe("systemd-detect-virt --container 2>/dev/null"),
            podman: safe("grep -i podman /proc/1/environ"),
            lxc: safe("grep -i lxc /proc/1/environ"),
            cgroup: read("/proc/1/cgroup"),
        },

        // ---------------------------------------------------------
        // VIRTUALIZATION DETECTION
        // ---------------------------------------------------------
        virtualization: {
            hvType: safe("systemd-detect-virt"),
            dmidecode: safe("dmidecode 2>/dev/null"),
            virtWhat: safe("virt-what 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // WSL DETECTION
        // ---------------------------------------------------------
        wsl: {
            isWSL: fs.existsSync("/proc/sys/fs/binfmt_misc/WSLInterop"),
            version: safe("grep -i microsoft /proc/version"),
            kernel: read("/proc/sys/kernel/osrelease"),
        },

        // ---------------------------------------------------------
        // SERVICES + SYSTEMD
        // ---------------------------------------------------------
        services: {
            systemctlList: safe("systemctl list-units --type=service --all 2>/dev/null"),
            initSystem: safe("ps -p 1 -o comm="),
            sysV: safe("ls /etc/init.d 2>/dev/null"),
            timers: safe("systemctl list-timers --all 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // USER + AUTH
        // ---------------------------------------------------------
        users: {
            current: safe("whoami"),
            groups: safe("groups"),
            passwd: read("/etc/passwd"),
            shadowExists: fs.existsSync("/etc/shadow"),
            loginctl: safe("loginctl list-sessions 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // SOFTWARE + PACKAGE MANAGEMENT
        // ---------------------------------------------------------
        packages: {
            apt: safe("apt list --installed 2>/dev/null"),
            dpkg: safe("dpkg -l 2>/dev/null"),
            rpm: safe("rpm -qa 2>/dev/null"),
            pacman: safe("pacman -Q 2>/dev/null"),
            apk: safe("apk info 2>/dev/null"),
            flatpak: safe("flatpak list 2>/dev/null"),
            snap: safe("snap list 2>/dev/null"),
            nix: safe("nix-env -q 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // DESKTOP / GRAPHICAL ENVIRONMENT
        // ---------------------------------------------------------
        desktop: {
            environment: process.env.XDG_CURRENT_DESKTOP ?? null,
            session: process.env.DESKTOP_SESSION ?? null,
            displayServer: safe("loginctl show-session $(loginctl | grep $(whoami) | awk '{print $1}') -p Type 2>/dev/null"),
            x11: safe("xset q 2>/dev/null"),
            wayland: safe("echo $WAYLAND_DISPLAY"),
            gsettings: safe("gsettings list-recursively 2>/dev/null"),
        },

        // ---------------------------------------------------------
        // TIME / LOCALE
        // ---------------------------------------------------------
        locale: {
            locale: safe("locale"),
            timezone: read("/etc/timezone") ?? safe("timedatectl"),
        },

        // ---------------------------------------------------------
        // LOGGING SYSTEMS
        // ---------------------------------------------------------
        logs: {
            journald: safe("journalctl -n 50 2>/dev/null"),
            syslog: safe("tail -n 50 /var/log/syslog 2>/dev/null"),
            messages: safe("tail -n 50 /var/log/messages 2>/dev/null"),
            dmesg: safe("dmesg | tail -n 50"),
        },

        // ---------------------------------------------------------
        // ENVIRONMENT VARIABLES
        // ---------------------------------------------------------
        environment: {
            path: process.env.PATH,
            shell: process.env.SHELL,
            home: process.env.HOME,
            user: process.env.USER,
            lang: process.env.LANG,
            term: process.env.TERM,
        },
    };
}