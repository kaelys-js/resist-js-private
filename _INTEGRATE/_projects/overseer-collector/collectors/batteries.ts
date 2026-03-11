import { register } from '../src/registry.js';
import type { CollectorDefinition, LocalContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY, isLocalContext } from '../src/types.js';

interface BatteryHealth {
  cycleCount: number;
  designCapacity: number; // mAh
  maxCapacity: number; // mAh (current max)
  healthPercent: number; // maxCapacity / designCapacity * 100
  isCharging: boolean;
  fullyCharged: boolean;
  externalConnected: boolean;
}

interface BatteryInfo {
  name: string;
  type: 'keyboard' | 'mouse' | 'airpods' | 'airpods_pro' | 'iphone' | 'ipad' | 'watch' | 'mac' | 'unknown';
  connected: boolean;
  battery: number | null;
  // For AirPods with separate levels
  batteryLeft?: number | null;
  batteryRight?: number | null;
  batteryCase?: number | null;
  // For Mac battery health
  health?: BatteryHealth;
}

interface BatteriesData {
  devices: BatteryInfo[];
  collectedAt: string;
}

// Parse battery percentage from string like "99%" or number
function parseBattery(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Determine device type from name and product ID
function getDeviceType(name: string, productId?: string): BatteryInfo['type'] {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('keyboard')) return 'keyboard';
  if (nameLower.includes('mouse') || nameLower.includes('trackpad')) return 'mouse';
  if (nameLower.includes('airpods pro')) return 'airpods_pro';
  if (nameLower.includes('airpods')) return 'airpods';
  if (nameLower.includes('iphone')) return 'iphone';
  if (nameLower.includes('ipad')) return 'ipad';
  if (nameLower.includes('watch')) return 'watch';
  if (nameLower.includes('mac')) return 'mac';
  return 'unknown';
}

// Get HID device batteries (keyboard, mouse, trackpad)
async function getHidBatteries(exec: LocalContext['exec']): Promise<BatteryInfo[]> {
  const result = await exec(
    `ioreg -r -c AppleDeviceManagementHIDEventService 2>/dev/null | grep -E '"Product"|"BatteryPercent"' | paste - -`
  );

  if (result.exitCode !== 0) return [];

  const devices: BatteryInfo[] = [];
  const lines = result.stdout.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    const productMatch = line.match(/"Product"\s*=\s*"([^"]+)"/);
    const batteryMatch = line.match(/"BatteryPercent"\s*=\s*(\d+)/);

    if (productMatch) {
      const name = productMatch[1];
      devices.push({
        name,
        type: getDeviceType(name),
        connected: true,
        battery: batteryMatch ? parseInt(batteryMatch[1], 10) : null,
      });
    }
  }

  return devices;
}

// Get Bluetooth device batteries (AirPods, etc.)
async function getBluetoothBatteries(exec: LocalContext['exec']): Promise<BatteryInfo[]> {
  const result = await exec(`system_profiler SPBluetoothDataType -json 2>/dev/null`);

  if (result.exitCode !== 0) return [];

  const devices: BatteryInfo[] = [];

  try {
    const data = JSON.parse(result.stdout);
    const btData = data.SPBluetoothDataType?.[0];

    if (!btData) return [];

    // Process connected devices
    const connected = btData.device_connected || [];
    for (const deviceObj of connected) {
      const [name, info] = Object.entries(deviceObj)[0] as [string, Record<string, string>];
      const type = getDeviceType(name, info.device_productID);

      // Skip devices we already got from HID (keyboard, mouse)
      if (type === 'keyboard' || type === 'mouse') continue;

      const device: BatteryInfo = {
        name,
        type,
        connected: true,
        battery: null,
      };

      // Handle AirPods battery levels
      if (info.device_batteryLevelLeft) {
        device.batteryLeft = parseBattery(info.device_batteryLevelLeft);
      }
      if (info.device_batteryLevelRight) {
        device.batteryRight = parseBattery(info.device_batteryLevelRight);
      }
      if (info.device_batteryLevelCase) {
        device.batteryCase = parseBattery(info.device_batteryLevelCase);
      }
      // If there's a single battery level
      if (info.device_batteryLevel) {
        device.battery = parseBattery(info.device_batteryLevel);
      }
      // For AirPods, use average of left/right as main battery
      if (device.batteryLeft !== undefined && device.batteryRight !== undefined) {
        const left = device.batteryLeft ?? 0;
        const right = device.batteryRight ?? 0;
        device.battery = Math.round((left + right) / 2);
      }

      devices.push(device);
    }

    // Process not connected devices (may still have battery info from last sync)
    const notConnected = btData.device_not_connected || [];
    for (const deviceObj of notConnected) {
      const [name, info] = Object.entries(deviceObj)[0] as [string, Record<string, string>];
      const type = getDeviceType(name, info.device_productID);

      // Only include Apple devices we care about
      if (!['airpods', 'airpods_pro', 'iphone', 'ipad', 'watch'].includes(type)) continue;

      const device: BatteryInfo = {
        name,
        type,
        connected: false,
        battery: null,
      };

      // Handle AirPods battery levels (sometimes available even when not connected)
      if (info.device_batteryLevelLeft) {
        device.batteryLeft = parseBattery(info.device_batteryLevelLeft);
      }
      if (info.device_batteryLevelRight) {
        device.batteryRight = parseBattery(info.device_batteryLevelRight);
      }
      if (info.device_batteryLevelCase) {
        device.batteryCase = parseBattery(info.device_batteryLevelCase);
      }
      if (device.batteryLeft !== undefined && device.batteryRight !== undefined) {
        const left = device.batteryLeft ?? 0;
        const right = device.batteryRight ?? 0;
        device.battery = Math.round((left + right) / 2);
      }

      devices.push(device);
    }
  } catch {
    // JSON parse error, return empty
  }

  return devices;
}

// Get Mac battery health info from ioreg
async function getMacBatteryHealth(exec: LocalContext['exec']): Promise<BatteryHealth | null> {
  const result = await exec(`ioreg -r -c AppleSmartBattery 2>/dev/null`);

  if (result.exitCode !== 0) return null;

  const output = result.stdout;

  // Extract values using regex
  const cycleMatch = output.match(/"CycleCount"\s*=\s*(\d+)/);
  const designMatch = output.match(/"DesignCapacity"\s*=\s*(\d+)/);
  const maxMatch = output.match(/"MaxCapacity"\s*=\s*(\d+)/);
  const chargingMatch = output.match(/"IsCharging"\s*=\s*(Yes|No)/);
  const fullyChargedMatch = output.match(/"FullyCharged"\s*=\s*(Yes|No)/);
  const externalMatch = output.match(/"ExternalConnected"\s*=\s*(Yes|No)/);

  const cycleCount = cycleMatch ? parseInt(cycleMatch[1], 10) : 0;
  const designCapacity = designMatch ? parseInt(designMatch[1], 10) : 0;
  const maxCapacity = maxMatch ? parseInt(maxMatch[1], 10) : 0;

  // No battery if design capacity is 0
  if (designCapacity === 0) return null;

  const healthPercent = Math.round((maxCapacity / designCapacity) * 100);

  return {
    cycleCount,
    designCapacity,
    maxCapacity,
    healthPercent,
    isCharging: chargingMatch?.[1] === 'Yes',
    fullyCharged: fullyChargedMatch?.[1] === 'Yes',
    externalConnected: externalMatch?.[1] === 'Yes',
  };
}

// Get Mac battery (for MacBooks)
async function getMacBattery(exec: LocalContext['exec']): Promise<BatteryInfo | null> {
  const result = await exec(`pmset -g batt 2>/dev/null`);

  if (result.exitCode !== 0) return null;

  // Check if running on battery or AC
  const onBattery = result.stdout.includes('Battery Power');
  const onAc = result.stdout.includes('AC Power');

  // For Mac mini (desktop), no battery
  if (!onBattery && onAc && !result.stdout.includes('%')) {
    return null;
  }

  // Parse battery percentage
  const match = result.stdout.match(/(\d+)%/);
  if (!match) return null;

  // Get battery health info
  const health = await getMacBatteryHealth(exec);

  return {
    name: 'Mac',
    type: 'mac',
    connected: true,
    battery: parseInt(match[1], 10),
    health: health ?? undefined,
  };
}

const batteriesCollector: CollectorDefinition<BatteriesData> = {
  id: 'batteries',
  schedule: {
    type: 'cron',
    expression: '*/15 * * * *', // Every 15 minutes
  },
  mode: 'local', // Requires exec()
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2, // Battery checks are quick, less retries needed
    timeoutMs: 10000,
  },

  async collect(ctx) {
    if (!isLocalContext(ctx)) {
      throw new Error('batteries collector requires local runtime with exec()');
    }

    const [hidDevices, btDevices, macBattery] = await Promise.all([
      getHidBatteries(ctx.exec),
      getBluetoothBatteries(ctx.exec),
      getMacBattery(ctx.exec),
    ]);

    const devices: BatteryInfo[] = [...hidDevices, ...btDevices];

    if (macBattery) {
      devices.push(macBattery);
    }

    return {
      devices,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(batteriesCollector);
