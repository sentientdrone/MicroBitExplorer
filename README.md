# micro:bit Manager (v1)

A local web app for the BBC micro:bit v1 that runs on your own computer. It connects to the board from the browser, and is designed so kids can code it and learn how it works inside.

## Features

| Tab | What it does |
|---|---|
| 🧰 **Manager** | Serial console and MicroPython REPL, flash `.hex` files (WebUSB or the `MICROBIT` drive), one-click **Install MicroPython**, live sensor readings (°C/°F), LED drawing, a Python code editor, and a file manager (list, edit, upload, download, delete). |
| 🧩 **Blocks** | A kid-friendly block editor (Blockly) that turns blocks into MicroPython. It has blocks for every v1 sensor (buttons, accelerometer and gestures, tilt, compass, magnetometer, temperature, light, touch pins), plus music, radio, pins, a timer and 7 example programs. |
| 🔬 **Inside** | A clickable map of the chips on the board and how they're wired, with live readings and animated "watch how it works" walkthroughs. **How it works** mode has animated circuits for buttons, touch pins, accelerometer, compass, light sensing, temperature, the LED screen and binary, each with a live signal graph and the bits the processor receives. |
| 🏆 **Quiz** | 29 questions plus hands-on challenges checked on the real micro:bit. Answers are chosen and then submitted (button A on the board works too). Scores win accessories for Bit, the helper. |
| 🎓 **Tour** | A guided walkthrough of every part of the connected board, with live readings. |

Also:
- 🤖 **Bit, the coding helper** (Blocks and Manager tabs). Bit checks blocks or Python for common mistakes, explains micro:bit error messages, answers "how do I…?" questions and can add example blocks or code. Bit works offline.
- 👗 **Accessories** won in the quiz dress Bit up. The better the score, the better the prize (0% gets a trash can).
- 🔍 **Search** across every lesson, part, Tour step and quiz question. Press `/` to jump to it.
- 👩‍🏫 **Parent / teacher code**. A grown-up creates their own code, which unlocks quiz answers in search and opens an answer key.

## Start

```bash
./start.sh
```

This opens http://localhost:8321. Use **Chrome, Chromium or Edge**: Firefox and Safari don't support Web Serial or WebUSB. Options: `--port 9000`, `--no-browser`.

You need Python 3, standard library only. Everything else (Blockly, DAPjs, the MicroPython firmware) is bundled in `static/vendor/`, so it works offline.

## One-time Linux setup

Let your user open the micro:bit from the browser:

```bash
sudo cp 99-microbit.rules /etc/udev/rules.d/ && sudo udevadm control --reload-rules && sudo udevadm trigger
```

Then unplug and replug the micro:bit. A snap-packaged Chromium also needs `sudo snap connect chromium:raw-usb`.

## Notes

- The MicroPython, Blocks, Inside (live), Quiz challenges and Bit's error help all need MicroPython on the board. Use **Install MicroPython** in the Manager tab.
- WebUSB flashing needs DAPLink interface firmware 0249 or newer (shown in the Device card). Flashing through the USB drive works with any version.
- The server listens only on 127.0.0.1 and refuses cross-site requests.
- Quiz progress, Bit's accessories, the parent/teacher code and saved blocks are stored in the browser (per computer and browser). The teacher code is stored hashed. It's a simple lock to stop peeking, not strong security.

## Bundled third-party files

| File | Source | License |
|---|---|---|
| `static/vendor/dap.umd.js` | [DAPjs](https://github.com/ARMmbed/dapjs) 2.3.0 | MIT |
| `static/vendor/blockly/` | [Blockly](https://github.com/google/blockly) 11.2.1 | Apache-2.0 |
| `static/vendor/micropython-microbit-v1.1.1.hex` | [MicroPython for micro:bit](https://github.com/bbcmicrobit/micropython) v1.1.1 | MIT |
