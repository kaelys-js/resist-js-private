#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <linux/uinput.h>

int main() {
    struct uinput_setup usetup;
    int fd = open("/dev/uinput", O_WRONLY | O_NONBLOCK);
    if (fd < 0) {
        perror("open");
        return 1;
    }

    // Enable event types
    ioctl(fd, UI_SET_EVBIT, EV_KEY);
    ioctl(fd, UI_SET_EVBIT, EV_ABS);
    ioctl(fd, UI_SET_EVBIT, EV_FF); // optional haptics

    // Enable gamepad buttons (A, B, X, Y, etc.)
    int buttons[] = {
        BTN_A, BTN_B, BTN_X, BTN_Y,
        BTN_TL, BTN_TR, BTN_SELECT, BTN_START,
        BTN_THUMBL, BTN_THUMBR,
        BTN_LEFT, BTN_RIGHT, BTN_TOUCH
    };
    for (int i = 0; i < sizeof(buttons)/sizeof(int); i++) {
        ioctl(fd, UI_SET_KEYBIT, buttons[i]);
    }

    // Enable keyboard keys
    int keys[] = {
        KEY_Z, KEY_X, KEY_A, KEY_S, KEY_Q, KEY_W,
        KEY_ENTER, KEY_BACKSPACE,
        KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT
    };
    for (int i = 0; i < sizeof(keys)/sizeof(int); i++) {
        ioctl(fd, UI_SET_KEYBIT, keys[i]);
    }

    // Enable axes
    int axes[] = {
        ABS_X, ABS_Y, ABS_Z,
        ABS_RX, ABS_RY, ABS_RZ,
        ABS_MISC, ABS_PRESSURE, ABS_DISTANCE,
        0x10, 0x11, 0x12, // gyro (non-standard codes)
        0x13, 0x14, 0x15  // accel (non-standard codes)
    };
    for (int i = 0; i < sizeof(axes)/sizeof(int); i++) {
        ioctl(fd, UI_SET_ABSBIT, axes[i]);
    }

    // Describe device
    memset(&usetup, 0, sizeof(usetup));
    snprintf(usetup.name, UINPUT_MAX_NAME_SIZE, "Virtual Gamepad");
    usetup.id.bustype = BUS_USB;
    usetup.id.vendor  = 0x1234;
    usetup.id.product = 0x5678;
    usetup.id.version = 1;

    // Setup ABS ranges (example: 0-255 for joystick, -32768 to 32767 for gyro/accel)
    struct uinput_abs_setup abs_setup = {
        .code = ABS_X,
        .absinfo = { .minimum = 0, .maximum = 255 }
    };
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = ABS_Y;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = ABS_Z;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = ABS_RX;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = ABS_RY;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = ABS_RZ;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);

    abs_setup.code = 0x10; abs_setup.absinfo.minimum = -32768; abs_setup.absinfo.maximum = 32767;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = 0x11;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = 0x12;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = 0x13;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = 0x14;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);
    abs_setup.code = 0x15;
    ioctl(fd, UI_ABS_SETUP, &abs_setup);

    // Create device
    if (ioctl(fd, UI_DEV_SETUP, &usetup) < 0) {
        perror("UI_DEV_SETUP");
        close(fd);
        return 1;
    }

    if (ioctl(fd, UI_DEV_CREATE) < 0) {
        perror("UI_DEV_CREATE");
        close(fd);
        return 1;
    }

    printf("✅ Virtual Gamepad created. You can now write to /dev/uinput\n");
    printf("🔄 Keeping fd open... (Press Ctrl+C to close and destroy device)\n");

    pause(); // Keeps fd open; device will persist while this process runs

    ioctl(fd, UI_DEV_DESTROY);
    close(fd);
    printf("🛑 Virtual Gamepad destroyed\n");
    return 0;
}
