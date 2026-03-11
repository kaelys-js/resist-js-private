import { EV_KEY } from './uinput';

export const RetroArchKeyMap = {
  // Index-mapped gamepad buttons
  gamepad: [
    EV_KEY.BTN_A,         // A
    EV_KEY.BTN_B,         // B
    EV_KEY.BTN_X,         // X
    EV_KEY.BTN_Y,         // Y
    EV_KEY.BTN_TL,        // L1
    EV_KEY.BTN_TR,        // R1
    EV_KEY.BTN_SELECT,    // Select
    EV_KEY.BTN_START,     // Start
    EV_KEY.BTN_THUMBL,    // L3
    EV_KEY.BTN_THUMBR,    // R3
    EV_KEY.BTN_TL2,       // L2
    EV_KEY.BTN_TR2,       // R2
    EV_KEY.BTN_DPAD_UP,
    EV_KEY.BTN_DPAD_DOWN,
    EV_KEY.BTN_DPAD_LEFT,
    EV_KEY.BTN_DPAD_RIGHT,
  ],

  // Keyboard mappings with game aliases
  keyboard: {
    A: EV_KEY.KEY_A,
    B: EV_KEY.KEY_B,
    C: EV_KEY.KEY_C,
    D: EV_KEY.KEY_D,
    E: EV_KEY.KEY_E,
    F: EV_KEY.KEY_F,
    G: EV_KEY.KEY_G,
    H: EV_KEY.KEY_H,
    I: EV_KEY.KEY_I,
    J: EV_KEY.KEY_J,
    K: EV_KEY.KEY_K,
    L: EV_KEY.KEY_L,
    M: EV_KEY.KEY_M,
    N: EV_KEY.KEY_N,
    O: EV_KEY.KEY_O,
    P: EV_KEY.KEY_P,
    Q: EV_KEY.KEY_Q,
    R: EV_KEY.KEY_R,
    S: EV_KEY.KEY_S,
    T: EV_KEY.KEY_T,
    U: EV_KEY.KEY_U,
    V: EV_KEY.KEY_V,
    W: EV_KEY.KEY_W,
    X: EV_KEY.KEY_X,
    Y: EV_KEY.KEY_Y,
    Z: EV_KEY.KEY_Z,

    '1': EV_KEY.KEY_1,
    '2': EV_KEY.KEY_2,
    '3': EV_KEY.KEY_3,
    '4': EV_KEY.KEY_4,
    '5': EV_KEY.KEY_5,
    '6': EV_KEY.KEY_6,
    '7': EV_KEY.KEY_7,
    '8': EV_KEY.KEY_8,
    '9': EV_KEY.KEY_9,
    '0': EV_KEY.KEY_0,

    ENTER: EV_KEY.KEY_ENTER,
    ESC: EV_KEY.KEY_ESC,
    SPACE: EV_KEY.KEY_SPACE,
    BACKSPACE: EV_KEY.KEY_BACKSPACE,
    TAB: EV_KEY.KEY_TAB,
    SHIFT: EV_KEY.KEY_LEFTSHIFT,
    CTRL: EV_KEY.KEY_LEFTCTRL,
    ALT: EV_KEY.KEY_LEFTALT,

    // Arrow keys
    UP: EV_KEY.KEY_UP,
    DOWN: EV_KEY.KEY_DOWN,
    LEFT: EV_KEY.KEY_LEFT,
    RIGHT: EV_KEY.KEY_RIGHT,

    // RetroArch aliases
    START: EV_KEY.KEY_ENTER,
    SELECT: EV_KEY.KEY_BACKSPACE,
    L1: EV_KEY.KEY_Q,
    R1: EV_KEY.KEY_W,
    L2: EV_KEY.KEY_E,
    R2: EV_KEY.KEY_R,
    L3: EV_KEY.KEY_C,
    R3: EV_KEY.KEY_V,

    // D-Pad keyboard fallback to gamepad
    DPAD_UP: EV_KEY.BTN_DPAD_UP,
    DPAD_DOWN: EV_KEY.BTN_DPAD_DOWN,
    DPAD_LEFT: EV_KEY.BTN_DPAD_LEFT,
    DPAD_RIGHT: EV_KEY.BTN_DPAD_RIGHT,
  },
};

/**
 * Returns the uinput keycode for a given string name.
 * Case-insensitive. Supports alias fallback.
 */
export function getKeyCode(name: string): number | undefined {
  return (RetroArchKeyMap.keyboard as Record<string, number>)[name.toUpperCase()];
}
