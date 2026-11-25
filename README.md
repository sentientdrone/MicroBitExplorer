# micro:bit Manager (v1)

A local web app for the BBC micro:bit v1 that runs on your own computer. It connects to the board from the browser, and is designed so kids can code it and learn how it works inside.

## Features

| Tab | What it does |
|---|---|
| 🧰 **Manager** | Serial console and MicroPython REPL, flash `.hex` files (WebUSB or the `MICROBIT` drive), one-click **Install MicroPython**, live sensor readings (°C/°F), LED drawing, a Python code editor, and a file manager (list, edit, upload, download, delete). |
| 🧩 **Blocks** | A kid-friendly block editor (Blockly) that turns blocks into MicroPython. It has blocks for every v1 sensor (buttons, accelerometer and gestures, tilt, compass, magnetometer, temperature, light, touch pins), plus music, radio, pins, a timer and 7 example programs. |
| 🔬 **Inside** | A clickable map of the chips on the board and how they're wired, with live readings and animated "watch how it works" walkthroughs. **How it works** mode has animated circuits for buttons, touch pins, accelerometer, compass, light sensing, temperature, the LED screen and binary, each with a live signal graph and the bits the processor receives. |
| 🏆 **Quiz** | **🧒 Kid quiz**: 29 built-in questions plus hands-on challenges checked on the real micro:bit; wins the original outfits. **🏫 Teacher quiz**: the teacher writes their own quiz, gets a **quiz code**, and kids type it in to take it. Answers are checked on the class server, the teacher sees each kid's score and a per-question breakdown, and it wins the newer outfits. **🎮 Live class games:** the teacher can also start a timed game with a quiz. In **⛏️ Mining**, every right answer digs up a random ore (🪨 1, 🌑 3, 🔩 6, 🪙 12, 💎 25, 💚 50) and the most valuable haul wins. In **🏎️ Speed race**, right answers score 100 points plus up to 100 for speed. Kids join with the quiz code, the teacher gets a live leaderboard (for the projector) and can end early, and when time's up everyone sees the top 3 on a podium and their own place. The server picks ores and keeps score; players earn Bit Bucks for right answers plus a podium bonus (50/30/20). Answers are chosen and then submitted (button A on the board works too). |
| 🌍 **Explorer** | The class gallery. Kids share builds from Blocks or the Python editor, browse classmates' builds (blocks shown as real blocks), clap 👏, remix a copy, and run it on their own micro:bit. The teacher sees everything and can hide, feature or delete builds and manage kid accounts. |
| 🎓 **Tour** | A guided walkthrough of every part of the connected board, with live readings. |

Also:
- 🎮 **micro:bit simulator** (the small icon at the bottom right of every tab). It's a pretend micro:bit with LEDs, A/B buttons (also the A and B keys), touchable pins, tilt, shake and other gestures, temperature, light, compass, magnet, a speaker and a radio. Press **🔌 Use the simulator as my micro:bit** and the whole app talks to it like a real board on the serial line: Run in Blocks and the code editor, the console's `>>>` prompt, sensor readings, the Tour, the Inside lessons, quiz challenges, Save as main.py (Ctrl-D runs it) and Bit's error help. It shows what the program is doing: the board tilts, notes float up from the speaker, pins light up, radio waves pulse, and there's an activity log. Python runs in the browser with Skulpt, so a few advanced MicroPython features aren't available, and some built-in pictures and tunes are close approximations. If the browser has no Web Serial (Firefox, Safari), the simulator is used automatically.
- 🤖 **Bit, the coding helper** (Blocks and Manager tabs). Bit checks blocks or Python for common mistakes, explains micro:bit error messages, answers "how do I…?" questions and can add example blocks or code. Bit works offline.
- 👗 **Outfits** (43) dress Bit up. Kid quizzes win the original 22, teacher quizzes the other 21. The better the score, the better the prize (0% gets a junk item, starting with a trash can).
- 🎨 **Looks**: change Bit's body colour, eyes, glow colour, mouth and antenna. The starter look is free; the other 35 looks are unlocked as a bonus prize from quizzes (a look of the same tier as the outfit prize) or bought in the shop.
- 🪙 **Bit Bucks and the 🛒 Shop** (open with **🤖 Bit** in the top bar): start with 100 Bit Bucks and earn more from quizzes (5 per right answer on a Kid quiz, 10 on a teacher quiz, plus a perfect-score bonus). Buy any outfit or look (10 to 300 by tier) or sell an outfit back for half price.
- 🕹️ **Arcade games** (buy them in the 🛒 Shop, play them from Bit's **🕹️ Games** tab). They're pricey: **💎 Diamond Dig** 500, **🐍 Quiz Snake** 700, **🎈 Balloon Pop** 900 Bit Bucks. Each game has a 🔋 battery with 3 plays. A play uses one charge, and one charge comes back every 15 minutes. Games take a few seconds to "charge up" before they start. Quiz questions are part of every game: in Diamond Dig you mine down for gems, and hard rocks only break if you answer right (watch out for TNT, grab ⚡ for extra swings). In Quiz Snake you steer into the food with the right answer to grow and speed up. In Balloon Pop you pop the right balloon before it floats away and build combos. Your best score is saved, and you win a few Bit Bucks back (up to 40 per game). Games and batteries are saved with the kid's account.
- 🔍 **Search** across every lesson, part, Tour step and quiz question. Press `/` to jump to it.
- 👩‍🏫 **Parent / teacher code**. A grown-up creates their own code, which unlocks quiz answers in search and opens an answer key.
- 🔑 **Kid accounts** (Explorer). Each kid unlocks their account with a 4–6 digit PIN on a number pad, and locks it when done (it also auto-locks after 30 minutes idle, or when the browser closes). **Making a new account needs the teacher password.** 5 wrong PINs block the account for a minute. The teacher can reset PINs, rename or delete accounts.
- 🔒 **Lock screen.** While a kid is logged in, **🔒 Lock screen** (top bar) covers the whole app until that kid types their PIN, or the teacher types the class password (which doesn't log the teacher in on that computer). It also locks by itself after 5 idle minutes, and stays locked after a page reload. **Not you?** logs the kid out so someone else can use the computer. Locking also ends the kid's login on the class server, so getting past the screen without the PIN just leaves you logged out. After 30 idle minutes the kid is logged out completely.

## Start

```bash
./start.sh
```

This opens http://localhost:8321. Use **Chrome, Chromium or Edge**: Firefox and Safari don't support Web Serial or WebUSB. Options: `--port 9000`, `--no-browser`.

You need Python 3, standard library only. Everything else (Blockly, DAPjs, the MicroPython firmware) is bundled in `static/vendor/`, so it works offline.

## Run with Docker Compose

```bash
docker compose up -d --build
```

Then open http://localhost:8321 in Chrome, Chromium or Edge on the **same computer** the micro:bit is plugged into. Stop it with `docker compose down`.

How it works:
- The browser on your computer talks to the micro:bit directly (Web Serial and WebUSB). The container only serves the app, so it needs **no USB devices**. You still need the udev rule below on the host.
- The port is published on `127.0.0.1` only. Web Serial and WebUSB only work on `localhost` (or HTTPS), so opening the app from another machine wouldn't be able to reach a micro:bit anyway.
- **Flash via USB drive** works because compose mounts the host's `/media` and `/run/media`. That includes a micro:bit plugged in after the container starts.
- The container runs as your user ID so it can write to your `MICROBIT` drive. It defaults to 1000. If `id -u` shows something else, run `UID=$(id -u) GID=$(id -g) docker compose up -d`.
- To use another port, run `MICROBIT_PORT=9000 docker compose up -d`.
- The container is locked down: read-only filesystem, no Linux capabilities, `no-new-privileges`.

### Class server (for the 🌍 Explorer)

Run this on **one** computer, usually the teacher's:

```bash
docker compose --profile class up -d --build
```

- In the Explorer tab, choose **👩‍🏫 Teacher → Set up or manage a class**, type this computer's network address with port 8330 (for example `192.168.1.20:8330`), then pick a class name and teacher password. You get a **class code** to give the students.
- Students run the app on their own computers (their micro:bit is plugged in there) and join with that address and the class code.
- Builds and accounts are kept in the `class-data` Docker volume.
- The class server is reachable from the network, so its USB-drive flashing is turned off (`MICROBIT_DRIVE_API=0`). Use `CLASS_PORT` to change the port, or `CLASS_BIND=127.0.0.1` to keep it on this computer only.
- Without Docker: `MICROBIT_DRIVE_API=0 python3 server.py --host 0.0.0.0 --port 8330 --no-browser`. Data goes in `./data` (or set `MICROBIT_DATA`).
- Using one shared computer for the whole class? Skip the class server: leave the server address empty in the Explorer and it uses this computer.

### Behind a Cloudflare Tunnel (or another HTTPS reverse proxy)

Point the tunnel at the **class server** (`--profile class`, port 8330):

- On the tunnel's `https://` address, the whole app works, **including the micro:bit**. Web Serial and WebUSB work on any HTTPS page, so students can simply open that address in Chrome with their micro:bit plugged in.
- In the Explorer, leave the server address empty when you're using the tunnel address itself. From a local copy of the app, type the tunnel's domain (it's assumed to be `https://`).
- Cloudflare Tunnel keeps the public host name, so nothing else needs configuring. If your proxy rewrites the `Host` header instead, set `MICROBIT_ALLOWED_ORIGINS=https://your.domain`.
- Requests that arrive through a tunnel or proxy can never use USB-drive flashing, whatever `MICROBIT_DRIVE_API` is set to.
- After 10 wrong teacher passwords in 10 minutes, teacher logins pause. Kid PINs lock for a minute after 5 wrong tries.

### Forgot the teacher password?

There's no email reset. Instead, whoever can run commands on the class server's computer sets a new password. The class code, kid accounts, builds and quizzes all stay the same, and the server doesn't need a restart:

```bash
docker compose --profile class exec class-server python server.py --reset-teacher-password
```

Without Docker, run `python3 server.py --reset-teacher-password` in the project folder (with the same `MICROBIT_DATA` setting as the running server, if you changed it). It asks you to type the new password twice. If it can't ask, for example with `docker compose exec -T`, it makes up a password and prints it: log in with that, then choose your own with **🔑 Change password**.

After 10 wrong passwords in 10 minutes, teacher logins pause for a few minutes. Kids who forget their PIN: the teacher resets it in **👥 Kid accounts**.

If you get `permission denied ... docker.sock`, either add yourself to the `docker` group (`sudo usermod -aG docker $USER`, then log out and back in) or put `sudo` in front of the docker commands.

The server itself can also be configured with environment variables (`MICROBIT_HOST`, `MICROBIT_PORT`, `MICROBIT_NO_BROWSER=1`, `MICROBIT_MEDIA_ROOTS`) or flags (`--host`, `--port`, `--no-browser`).

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
- **Bit and Bit Bucks follow the kid.** While a kid's account is unlocked, their Bit (name, outfits, looks) and Bit Bucks are saved to their account on the class server, so they get them back on any computer. Without an unlocked account, the computer's own Bit is saved in the browser. A kid's first login starts with a fresh Bit and 100 Bit Bucks. The teacher sees each kid's Bit Bucks and outfit count in 👥 Kid accounts.
- Quiz progress, the parent/teacher code and saved blocks are stored in the browser (per computer and browser). The teacher code is stored hashed. It's a simple lock to stop peeking, not strong security.
- Explorer data (builds, kid accounts, class settings) is stored on the class server as JSON files. The teacher password and kid PINs are stored hashed (PBKDF2). On a school network the class server uses plain HTTP. To reach it from the internet, put it behind HTTPS (for example a Cloudflare Tunnel, see above) and use a strong teacher password: the class code and kid PINs are made for convenience, not for strong security.

## Bundled third-party files

| File | Source | License |
|---|---|---|
| `static/vendor/dap.umd.js` | [DAPjs](https://github.com/ARMmbed/dapjs) 2.3.0 | MIT |
| `static/vendor/blockly/` | [Blockly](https://github.com/google/blockly) 11.2.1 | Apache-2.0 |
| `static/vendor/skulpt/` | [Skulpt](https://skulpt.org) 1.2.0 (Python in the browser, for the simulator) | MIT |
| `static/vendor/micropython-microbit-v1.1.1.hex` | [MicroPython for micro:bit](https://github.com/bbcmicrobit/micropython) v1.1.1 | MIT |
