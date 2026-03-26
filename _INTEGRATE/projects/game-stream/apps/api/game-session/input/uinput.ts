import { openSync } from "node:fs";

// === Event Types ===
export const EV_SYN = 0x00;
export const EV_KEY_TYPE = 0x01;
export const EV_ABS = 0x03;
export const EV_FF = 0x15; // Force Feedback

// === UInput Commands ===
export const UI_DEV_CREATE = 0x5501;
export const UI_DEV_DESTROY = 0x5502;

// === Key Codes (Partial) ===
export const EV_KEY = {
  BTN_A: 0x130,
  BTN_B: 0x131,
  BTN_X: 0x133,
  BTN_Y: 0x134,
  BTN_TL: 0x136,
  BTN_TR: 0x137,
  BTN_SELECT: 0x13a,
  BTN_START: 0x13b,
  BTN_THUMBL: 0x13d,
  BTN_THUMBR: 0x13e,
  BTN_LEFT: 0x110,
  BTN_RIGHT: 0x111,
  BTN_TOUCH: 0x14a,
  KEY_Z: 44,
  KEY_X: 45,
  KEY_A: 30,
  KEY_S: 31,
  KEY_Q: 16,
  KEY_W: 17,
  KEY_ENTER: 28,
  KEY_BACKSPACE: 14,
  KEY_UP: 103,
  KEY_DOWN: 108,
  KEY_LEFT: 105,
  KEY_RIGHT: 106,
};

// === Absolute Axis Codes ===
export const EV_ABS_CODES = {
  ABS_X: 0x00,
  ABS_Y: 0x01,
  ABS_Z: 0x02,
  ABS_RX: 0x03,
  ABS_RY: 0x04,
  ABS_RZ: 0x05,
  ABS_GYRO_X: 0x10,
  ABS_GYRO_Y: 0x11,
  ABS_GYRO_Z: 0x12,
  ABS_ACCEL_X: 0x13,
  ABS_ACCEL_Y: 0x14,
  ABS_ACCEL_Z: 0x15,
};

/**
 * Creates a uinput virtual device and returns the file descriptor.
 * Make sure `/dev/uinput` is writable (`chmod 666 /dev/uinput`) or run as root.
 * ❗ NOTE: Bun does not support ioctl — you must preconfigure uinput with EV_KEY, EV_ABS, EV_FF externally or with a native helper.
 */
export async function createUInputDevice(): Promise<number> {
  console.warn("⚠️  createUInputDevice: ioctl not supported in Bun. Device must be preconfigured with EV_KEY, EV_ABS, EV_FF via native helper.");

  const fd = openSync('/dev/uinput', 'w+').fd;

  const uinput_user_dev = Buffer.alloc(1112); // uinput_user_dev struct
  const name = Buffer.alloc(80);
  name.write('Virtual Gamepad');
  name.copy(uinput_user_dev, 0, 0, 80);

  // Define ABS axis ranges (min/max for each index)
  const setAbsRange = (index: number, min: number, max: number) => {
    const base = 80 + index * 8;
    uinput_user_dev.writeInt32LE(min, base);
    uinput_user_dev.writeInt32LE(max, base + 4);
  };

  // Apply all used axes
  setAbsRange(0x00, 0, 255); // ABS_X
  setAbsRange(0x01, 0, 255); // ABS_Y
  setAbsRange(0x02, 0, 255); // ABS_Z
  setAbsRange(0x03, 0, 255); // ABS_RX
  setAbsRange(0x04, 0, 255); // ABS_RY
  setAbsRange(0x05, 0, 255); // ABS_RZ

  setAbsRange(0x10, -32768, 32767); // GYRO X
  setAbsRange(0x11, -32768, 32767); // GYRO Y
  setAbsRange(0x12, -32768, 32767); // GYRO Z

  setAbsRange(0x13, -32768, 32767); // ACCEL X
  setAbsRange(0x14, -32768, 32767); // ACCEL Y
  setAbsRange(0x15, -32768, 32767); // ACCEL Z

  await Bun.write(fd, uinput_user_dev);

  const createBuf = Buffer.alloc(4);
  createBuf.writeInt32LE(UI_DEV_CREATE);
  await Bun.write(fd, createBuf);

  return fd;
}

/**
 * Emits a single input event to the uinput device.
 * Automatically flushes with EV_SYN.
 */
export async function emit(fd: number, type: number, code: number, value: number): Promise<void> {
  const event = Buffer.alloc(24);
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  const usec = (now % 1000) * 1000;

  event.writeUInt32LE(sec, 0);     // timeval.tv_sec
  event.writeUInt32LE(usec, 8);    // timeval.tv_usec
  event.writeUInt16LE(type, 16);   // type
  event.writeUInt16LE(code, 18);   // code
  event.writeInt32LE(value, 20);   // value

  await Bun.write(fd, event);

  const syn = Buffer.alloc(24);
  syn.writeUInt16LE(EV_SYN, 16);   // EV_SYN
  syn.writeUInt16LE(0, 18);        // SYN_REPORT
  syn.writeInt32LE(0, 20);

  await Bun.write(fd, syn);
}

/**
 * Gracefully destroys the virtual uinput device.
 */
export async function destroyUInputDevice(fd: number): Promise<void> {
  const destroyBuf = Buffer.alloc(4);
  destroyBuf.writeInt32LE(UI_DEV_DESTROY);
  await Bun.write(fd, destroyBuf);
}
