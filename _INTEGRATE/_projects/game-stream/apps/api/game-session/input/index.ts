import { createServer } from 'net';
import { existsSync, unlinkSync } from 'fs';
import { createUInputDevice, destroyUInputDevice, emit, EV_KEY, EV_ABS, EV_SYN, EV_FF } from './uinput';
import { RetroArchKeyMap, getKeyCode } from './mapping';

const SOCKET_PATH = '/tmp/retroarch.sock';

// Clean up old socket if it exists
if (existsSync(SOCKET_PATH)) unlinkSync(SOCKET_PATH);

// Create and cache the uinput device
const devicePromise = createUInputDevice();

// Haptics throttle (basic 100ms lock)
let lastHapticsTime = 0;

// Clamping utility
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const server = createServer(async socket => {
  const device = await devicePromise;

  socket.on('data', async data => {
    try {
      const input: any = JSON.parse(data.toString());
      console.log('[input]', input);

      // === Gamepad Buttons ===
      if (Array.isArray(input.buttons)) {
        await Promise.all(
          input.buttons
            .map((pressed, i) => {
              const code = RetroArchKeyMap.gamepad[i];
              return code !== undefined ? emit(device, EV_KEY, code, pressed ? 1 : 0) : null;
            })
            .filter(Boolean)
        );
      }

      // === Analog Triggers ===
      if (Array.isArray(input.triggers)) {
        await Promise.all(
          [
            input.triggers[0] !== undefined
              ? emit(device, EV_ABS, 0x02, clamp(Math.floor(input.triggers[0] * 255), 0, 255))
              : null,
            input.triggers[1] !== undefined
              ? emit(device, EV_ABS, 0x05, clamp(Math.floor(input.triggers[1] * 255), 0, 255))
              : null
          ].filter(Boolean)
        );
      }

      // === Analog Sticks ===
      if (Array.isArray(input.axes)) {
        const [lx, ly, rx, ry] = input.axes;
        await Promise.all(
          [
            lx !== undefined ? emit(device, EV_ABS, 0x00, clamp(Math.floor((lx + 1) * 127), 0, 255)) : null,
            ly !== undefined ? emit(device, EV_ABS, 0x01, clamp(Math.floor((ly + 1) * 127), 0, 255)) : null,
            rx !== undefined ? emit(device, EV_ABS, 0x03, clamp(Math.floor((rx + 1) * 127), 0, 255)) : null,
            ry !== undefined ? emit(device, EV_ABS, 0x04, clamp(Math.floor((ry + 1) * 127), 0, 255)) : null
          ].filter(Boolean)
        );
      }

      // === Keyboard Events ===
      if (input.keyboard) {
        await Promise.all(
          Object.entries(input.keyboard)
            .map(([code, pressed]) => {
              const keyCode = getKeyCode(code);
              return keyCode !== undefined ? emit(device, EV_KEY, keyCode, pressed ? 1 : 0) : null;
            })
            .filter(Boolean)
        );
      }

      // === Mouse ===
      if (input.mouse) {
        const { x, y, left, right, middle } = input.mouse;
        await Promise.all(
          [
            x !== undefined ? emit(device, EV_ABS, 0x00, clamp(x, 0, 255)) : null,
            y !== undefined ? emit(device, EV_ABS, 0x01, clamp(y, 0, 255)) : null,
            left !== undefined ? emit(device, EV_KEY, 0x110, left ? 1 : 0) : null,
            right !== undefined ? emit(device, EV_KEY, 0x111, right ? 1 : 0) : null,
            middle !== undefined ? emit(device, EV_KEY, 0x112, middle ? 1 : 0) : null
          ].filter(Boolean)
        );
      }

      // === Touch ===
      if (input.touch) {
        const { x, y, active } = input.touch;
        await Promise.all(
          [
            x !== undefined ? emit(device, EV_ABS, 0x00, clamp(x, 0, 255)) : null,
            y !== undefined ? emit(device, EV_ABS, 0x01, clamp(y, 0, 255)) : null,
            active !== undefined ? emit(device, EV_KEY, 0x14a, active ? 1 : 0) : null
          ].filter(Boolean)
        );
      }

      // === Gyroscope ===
      if (input.gyro) {
        const { x, y, z } = input.gyro;
        await Promise.all(
          [
            x !== undefined ? emit(device, EV_ABS, 0x10, clamp(Math.floor(x * 1000), -32768, 32767)) : null,
            y !== undefined ? emit(device, EV_ABS, 0x11, clamp(Math.floor(y * 1000), -32768, 32767)) : null,
            z !== undefined ? emit(device, EV_ABS, 0x12, clamp(Math.floor(z * 1000), -32768, 32767)) : null
          ].filter(Boolean)
        );
      }

      // === Accelerometer ===
      if (input.accel) {
        const { x, y, z } = input.accel;
        await Promise.all(
          [
            x !== undefined ? emit(device, EV_ABS, 0x13, clamp(Math.floor(x * 1000), -32768, 32767)) : null,
            y !== undefined ? emit(device, EV_ABS, 0x14, clamp(Math.floor(y * 1000), -32768, 32767)) : null,
            z !== undefined ? emit(device, EV_ABS, 0x15, clamp(Math.floor(z * 1000), -32768, 32767)) : null
          ].filter(Boolean)
        );
      }

      // === Haptics (Vibration) ===
      if (input.haptics) {
        const { strong, weak } = input.haptics;
        const strength = clamp(Math.max(strong || 0, weak || 0), 0, 255);
        const now = Date.now();
        if (strength > 0 && now - lastHapticsTime > 100) {
          await emit(device, EV_FF, 0x60, strength);
          lastHapticsTime = now;
        }
      }

      // Finalize event batch
      await emit(device, EV_SYN, 0, 0);

    } catch (e) {
      console.error('❌ Invalid input:', e);
    }
  });

  socket.on('close', () => {
    console.log('🔌 Client disconnected');
  });

  socket.on('error', err => {
    console.error('❌ Socket error:', err);
  });
});

server.listen(SOCKET_PATH, () => {
  console.log('🎮 RetroArch input receiver listening at', SOCKET_PATH);
});

// === Graceful shutdown ===
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  const device = await devicePromise;
  await destroyUInputDevice(device);
  process.exit(0);
});
