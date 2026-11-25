/* 📺 Video lessons: short narrated, animated lessons that play right in the app (no video files,
 * so they work offline). Bit reads each scene aloud with the browser's speech voice, captions show
 * the words, a cartoon micro:bit acts it out, and the code (Blocks or Python) builds up on screen.
 * At the end, "Try it yourself" loads the program into Blocks or the Python editor.
 * Uses $/esc/glyph/showView/initBlocks/ws/ex/stack/tidy/openSim/simConnect/runCode/port/botSVG from other files. */
'use strict';

const VID_IMG = {
  HEART: '09090:99999:99999:09990:00900', HEART_SMALL: '00000:09090:09990:00900:00000', HAPPY: '00000:09090:00000:90009:09990',
  SAD: '00000:09090:00000:09990:90009', YES: '00000:00009:00090:90900:09000', SURPRISED: '09090:00000:00900:09090:00900',
  ARROW_E: '00900:00090:99999:00090:00900', ARROW_W: '00900:09000:99999:09000:00900', ASLEEP: '00000:99099:00000:09990:00000',
};
const VID_SEEN_KEY = 'microbit-videos-seen';

// A scene: what Bit says, what's on the code panel, and what the cartoon micro:bit does.
//   code: Python lines shown so far (the new ones type themselves in); hl: line numbers to highlight
//   blocks: [text, kind, indent] rows; board: [[ms, action], …]
const VIDEOS = [
  {
    id: 'blocks', icon: '🧩', title: 'Your first program with Blocks', mins: 2, kind: 'blocks',
    blurb: 'Make the micro:bit show a heart, react to a button and make a beating heart.',
    scenes: [
      { say: 'Hi, I\'m Bit! In this lesson you\'ll write your very first micro:bit program, with blocks. Let\'s make the micro:bit show a heart.',
        board: [[400, { img: 'HEART' }]] },
      { say: 'A program is a list of instructions. The micro:bit follows them one at a time, from top to bottom, really fast.',
        blocks: [['on start', 'event', 0]], board: [[0, { clear: true }]] },
      { say: 'Open the Blocks tab. Drag an "on start" block onto the workspace. Its blocks run once, when the micro:bit starts.',
        blocks: [['🟢 on start', 'event', 0]] },
      { say: 'Now drag a "show icon" block inside it, and pick the heart.',
        blocks: [['🟢 on start', 'event', 0], ['show icon ❤️', 'basic', 1]], board: [[1200, { img: 'HEART' }]] },
      { say: 'Press Run. Your program travels down the USB cable into the micro:bit, and the heart lights up!',
        blocks: [['🟢 on start', 'event', 0], ['show icon ❤️', 'basic', 1]], run: true, board: [[300, { clear: true }], [1300, { img: 'HEART' }]] },
      { say: 'Let\'s use a button. Blocks inside "on button A pressed" run every time you press button A. Here it shows a happy face.',
        blocks: [['🟢 on start', 'event', 0], ['show icon ❤️', 'basic', 1], ['🔘 on button A pressed', 'event', 0], ['show icon 😀', 'basic', 1]],
        board: [[1800, { press: 'A' }], [1900, { img: 'HAPPY' }], [4200, { press: 'A' }], [4300, { img: 'HAPPY' }]] },
      { say: 'The "forever" block repeats its blocks again and again. Show a big heart, pause, show a small heart, pause. That\'s a beating heart!',
        blocks: [['🔁 forever', 'loop', 0], ['show icon ❤️', 'basic', 1], ['pause 500 ms', 'basic', 1], ['show icon 💗', 'basic', 1], ['pause 500 ms', 'basic', 1]],
        board: [[0, { beat: true }]] },
      { say: 'Now it\'s your turn! Press "Try it yourself" to load these blocks, then press Run. Change the pictures and make it your own.',
        blocks: [['🔁 forever', 'loop', 0], ['show icon ❤️', 'basic', 1], ['pause 500 ms', 'basic', 1], ['show icon 💗', 'basic', 1], ['pause 500 ms', 'basic', 1]],
        board: [[0, { beat: true }]], end: true },
    ],
  },
  {
    id: 'python', icon: '🐍', title: 'Python on the micro:bit', mins: 3, kind: 'python',
    blurb: 'Type real code: scroll words, show pictures, loops, buttons, and how to fix mistakes.',
    scenes: [
      { say: 'Blocks are great, but real programmers type their code. The micro:bit speaks a kind of Python called MicroPython. Let\'s learn it!',
        code: [], board: [[300, { scroll: 'PYTHON' }]] },
      { say: 'Every micro:bit program starts with this line. "from microbit import star" brings in the display, the buttons, the sensors, and sleep.',
        code: ['from microbit import *'], hl: [0] },
      { say: 'display dot scroll slides words across the LEDs. The words go inside quote marks, and the brackets hold what you give it.',
        code: ['from microbit import *', '', 'display.scroll("Hello!")'], hl: [2], board: [[1400, { scroll: 'Hello!' }]] },
      { say: 'display dot show shows a picture. sleep 1000 waits for 1000 milliseconds. That\'s one second.',
        code: ['from microbit import *', '', 'display.show(Image.HEART)', 'sleep(1000)', 'display.show(Image.HAPPY)'], hl: [2, 3, 4],
        board: [[1500, { img: 'HEART' }], [3500, { img: 'HAPPY' }]] },
      { say: '"while True" repeats forever. See the four spaces at the start of the next lines? That\'s called indentation. It tells Python which lines are inside the loop.',
        code: ['from microbit import *', '', 'while True:', '    display.show(Image.HEART)', '    sleep(500)', '    display.show(Image.HEART_SMALL)', '    sleep(500)'], hl: [2, 3, 4, 5, 6],
        board: [[0, { beat: true }]] },
      { say: '"if" makes a decision. If button A is pressed, show a happy face. "else" says what to do otherwise. Don\'t forget the colon at the end of those lines!',
        code: ['from microbit import *', '', 'while True:', '    if button_a.is_pressed():', '        display.show(Image.HAPPY)', '    else:', '        display.show(Image.SAD)'], hl: [3, 4, 5, 6],
        board: [[0, { img: 'SAD' }], [1800, { hold: 'A', ms: 1800 }], [1850, { img: 'HAPPY' }], [3650, { img: 'SAD' }], [5000, { hold: 'A', ms: 1500 }], [5050, { img: 'HAPPY' }], [6550, { img: 'SAD' }]] },
      { say: 'Python is picky. Capital letters matter, every bracket needs a partner, and lines that end a "while" or "if" need a colon. Can you spot the two mistakes here?',
        code: ['from microbit import *', '', 'display.Scroll("Hi"'], hl: [2], bad: true, board: [[600, { img: 'SAD' }]] },
      { say: 'Scroll needs a small s, and the bracket needs closing. If you get an error message, ask me, Bit! I\'ll explain what it means.',
        code: ['from microbit import *', '', 'display.scroll("Hi")'], hl: [2], board: [[900, { scroll: 'Hi' }]] },
      { say: 'Now you try! Press "Try it yourself" to put this program in the code editor and run it on your micro:bit, or on the simulator.',
        code: ['from microbit import *', '', 'display.scroll("Hello!")', 'while True:', '    if button_a.is_pressed():', '        display.show(Image.HAPPY)', '    else:', '        display.show(Image.HEART)'],
        board: [[0, { img: 'HEART' }], [1500, { hold: 'A', ms: 1200 }], [1550, { img: 'HAPPY' }], [2750, { img: 'HEART' }]], end: true },
    ],
  },
  {
    id: 'sensors', icon: '🎲', title: 'Sensors in Python', mins: 2, kind: 'python',
    blurb: 'Read the temperature, use the tilt sensor, and build a shake-to-roll dice.',
    scenes: [
      { say: 'The micro:bit is full of sensors. Let\'s use them from Python! First, temperature. temperature brackets gives the temperature in degrees Celsius.',
        code: ['from microbit import *', '', 'display.scroll(temperature())'], hl: [2], board: [[1500, { scroll: '22' }]] },
      { say: 'The accelerometer tells you how the micro:bit is tilted. accelerometer dot get x gets bigger when you tilt it to the right, and goes below zero to the left.',
        code: ['from microbit import *', '', 'while True:', '    x = accelerometer.get_x()'], hl: [3], board: [[1500, { tilt: 15 }], [3500, { tilt: -15 }], [5500, { tilt: 0 }]] },
      { say: 'Store the reading in a variable called x, then use "if" to choose an arrow. Tilt right, the arrow points right. Tilt left, it points left.',
        code: ['from microbit import *', '', 'while True:', '    x = accelerometer.get_x()', '    if x > 300:', '        display.show(Image.ARROW_E)', '    elif x < -300:', '        display.show(Image.ARROW_W)', '    else:', '        display.show(Image.HAPPY)'], hl: [4, 5, 6, 7],
        board: [[0, { img: 'HAPPY' }], [1500, { tilt: 15 }], [1600, { img: 'ARROW_E' }], [3200, { tilt: -15 }], [3300, { img: 'ARROW_W' }], [5000, { tilt: 0 }], [5100, { img: 'HAPPY' }]] },
      { say: 'Gestures are even easier. "was gesture shake" is True when someone has shaken the micro:bit. Let\'s make a dice!',
        code: ['from microbit import *', 'import random', '', 'while True:', '    if accelerometer.was_gesture("shake"):'], hl: [4], board: [[1500, { shake: true }]] },
      { say: 'import random brings in random numbers. random dot randint 1 comma 6 picks a whole number from one to six. Shake it, and roll!',
        code: ['from microbit import *', 'import random', '', 'while True:', '    if accelerometer.was_gesture("shake"):', '        display.show(random.randint(1, 6))'], hl: [1, 5],
        board: [[1200, { shake: true }], [1500, { num: '4' }], [3500, { shake: true }], [3800, { num: '2' }], [5800, { shake: true }], [6100, { num: '6' }]] },
      { say: 'Your turn! Press "Try it yourself", run it, and shake your micro:bit. On the simulator, press the shake button.',
        code: ['from microbit import *', 'import random', '', 'display.scroll("Shake me!")', 'while True:', '    if accelerometer.was_gesture("shake"):', '        display.show(random.randint(1, 6))'],
        board: [[600, { shake: true }], [900, { num: '5' }]], end: true },
    ],
  },
  {
    id: 'variables', icon: '🔢', title: 'Variables: make a counter', mins: 2, kind: 'python',
    blurb: 'Store a number in a variable and count button presses.',
    scenes: [
      { say: 'A variable is a box with a name, that remembers a value. Let\'s make a counter that counts how many times you press button A.',
        code: ['from microbit import *', '', 'count = 0', 'display.show(count)'], hl: [2, 3], board: [[1200, { num: '0' }]] },
      { say: 'count equals zero makes a box called count and puts zero inside. display dot show count shows what\'s in the box.',
        code: ['from microbit import *', '', 'count = 0', 'display.show(count)'], hl: [2], board: [[0, { num: '0' }]] },
      { say: 'Inside the loop: if button A was pressed, count equals count plus one. That takes the old number, adds one, and puts it back in the box.',
        code: ['from microbit import *', '', 'count = 0', 'display.show(count)', 'while True:', '    if button_a.was_pressed():', '        count = count + 1', '        display.show(count)'], hl: [5, 6, 7],
        board: [[0, { num: '0' }], [2200, { press: 'A' }], [2300, { num: '1' }], [3800, { press: 'A' }], [3900, { num: '2' }], [5400, { press: 'A' }], [5500, { num: '3' }]] },
      { say: 'Why "was pressed" and not "is pressed"? was pressed remembers a press even if the program was busy, and counts each press only once.',
        code: ['from microbit import *', '', 'count = 0', 'display.show(count)', 'while True:', '    if button_a.was_pressed():', '        count = count + 1', '        display.show(count)'], hl: [5],
        board: [[0, { num: '3' }], [1500, { press: 'A' }], [1600, { num: '4' }]] },
      { say: 'Let\'s use button B to start again. If B was pressed, count equals zero puts zero back in the box.',
        code: ['from microbit import *', '', 'count = 0', 'display.show(count)', 'while True:', '    if button_a.was_pressed():', '        count = count + 1', '        display.show(count)', '    if button_b.was_pressed():', '        count = 0', '        display.show(count)'], hl: [8, 9, 10],
        board: [[0, { num: '4' }], [2500, { press: 'B' }], [2600, { num: '0' }]] },
      { say: 'Try it yourself! Count your jumps, your claps, or how many times a friend smiles.',
        code: ['from microbit import *', '', 'count = 0', 'display.show(count)', 'while True:', '    if button_a.was_pressed():', '        count = count + 1', '        display.show(count)', '    if button_b.was_pressed():', '        count = 0', '        display.show(count)'],
        board: [[600, { press: 'A' }], [700, { num: '1' }]], end: true },
    ],
  },
  {
    id: 'pictures', icon: '🖼️', title: 'Draw your own pictures', mins: 2, kind: 'python',
    blurb: 'Design your own LED pictures, light single LEDs and make a flip-book animation.',
    scenes: [
      { say: 'The built-in pictures are fun, but you can draw your own! Each LED gets a number: zero is off, and nine is the brightest.',
        code: ['from microbit import *', '', 'boat = Image("05050:05050:05050:99999:09990")', 'display.show(boat)'], hl: [2, 3],
        board: [[1500, { pix: '05050:05050:05050:99999:09990' }]] },
      { say: 'There are five rows of five numbers, split up by colons. The first five numbers are the top row. The fives are half bright, like the sails of this boat.',
        code: ['from microbit import *', '', 'boat = Image("05050:05050:05050:99999:09990")', 'display.show(boat)'], hl: [2],
        board: [[0, { pix: '05050:05050:05050:99999:09990' }], [2500, { pix: '99999:00000:00000:00000:00000' }], [4500, { pix: '05050:05050:05050:99999:09990' }]] },
      { say: 'display dot set pixel lights just one LED. x goes across and y goes down, and both start counting at zero. So 2, 2 is the middle.',
        code: ['from microbit import *', '', 'display.clear()', 'display.set_pixel(2, 2, 9)', 'display.set_pixel(0, 0, 5)'], hl: [3, 4],
        board: [[0, { clear: true }], [1800, { pix: '00000:00000:00900:00000:00000' }], [3200, { pix: '50000:00000:00900:00000:00000' }]] },
      { say: 'Put some pictures in a list, and display dot show plays them one after another, like a flip-book. loop equals True keeps it going.',
        code: ['from microbit import *', '', 'frames = [Image("00000:00000:00900:00000:00000"),', '          Image("00000:09990:09090:09990:00000"),', '          Image("99999:90009:90009:90009:99999")]', 'display.show(frames, delay=300, loop=True)'], hl: [2, 3, 4, 5],
        board: [[1500, { anim: ['00000:00000:00900:00000:00000', '00000:09990:09090:09990:00000', '99999:90009:90009:90009:99999'], ms: 300 }]] },
      { say: 'Your turn! Draw a cat, a rocket, or your initials. Grab some squared paper and plan it first.',
        code: ['from microbit import *', '', 'boat = Image("05050:05050:05050:99999:09990")', 'display.show(boat)', 'sleep(1500)', 'frames = [Image("00000:00000:00900:00000:00000"),', '          Image("00000:09990:09090:09990:00000"),', '          Image("99999:90009:90009:90009:99999")]', 'display.show(frames, delay=300, loop=True)'],
        board: [[0, { pix: '05050:05050:05050:99999:09990' }], [1500, { anim: ['00000:00000:00900:00000:00000', '00000:09990:09090:09990:00000', '99999:90009:90009:90009:99999'], ms: 300 }]], end: true },
    ],
  },
  {
    id: 'music', icon: '🎵', title: 'Make music', mins: 2, kind: 'python',
    blurb: 'Play built-in tunes, write your own melody and make beeps with any pitch.',
    scenes: [
      { say: 'The micro:bit version one has no speaker of its own. Clip headphones or a buzzer to pin zero and GND. The simulator has a speaker built in!',
        code: ['from microbit import *', 'import music'], hl: [1], board: [[1500, { pins: ['0', 'GND'], ms: 5000 }]] },
      { say: 'import music brings in the music tools. music dot play plays a tune. BA DING is one of the built-in ones.',
        code: ['from microbit import *', 'import music', '', 'music.play(music.BA_DING)'], hl: [3], board: [[1600, { tones: [[988, 130], [1319, 450]] }]] },
      { say: 'You can write your own tune as a list of notes. C4 means the note C, in octave 4, and the number after the colon says how long it lasts.',
        code: ['from microbit import *', 'import music', '', 'music.play(["C4:4", "E4:4", "G4:4", "C5:8"])'], hl: [3],
        board: [[2000, { tones: [[262, 400], [330, 400], [392, 400], [523, 800]] }]] },
      { say: 'music dot pitch plays any sound you like. The first number is how many times the sound wiggles every second. Bigger numbers sound higher!',
        code: ['from microbit import *', 'import music', '', 'music.pitch(440, 500)', 'music.pitch(880, 500)'], hl: [3, 4],
        board: [[1500, { tones: [[440, 500]] }], [2300, { tones: [[880, 500]] }]] },
      { say: 'Try it yourself! Button A plays BA DING, and button B beeps. Can you make a doorbell, or a happy birthday sound?',
        code: ['from microbit import *', 'import music', '', 'music.play(["C4:4", "E4:4", "G4:4", "C5:8"])', 'while True:', '    if button_a.was_pressed():', '        music.play(music.BA_DING)', '    if button_b.was_pressed():', '        music.pitch(880, 300)'],
        board: [[1000, { press: 'A' }], [1100, { tones: [[988, 130], [1319, 450]] }]], end: true },
    ],
  },
  {
    id: 'radio', icon: '📻', title: 'Radio messages', mins: 2, kind: 'python',
    blurb: 'Send messages between micro:bits: switch the radio on, pick a group, send and receive.',
    scenes: [
      { say: 'micro:bits can talk to each other by radio, with no wires! Every micro:bit in the same group hears the message, like walkie-talkies.',
        code: [], board: [[800, { send: true }], [2500, { recv: true }]] },
      { say: 'import radio, then radio dot on switches the radio on. radio dot config group equals 7 picks a group. Your friend must pick the same number, from 0 to 255.',
        code: ['from microbit import *', 'import radio', '', 'radio.on()', 'radio.config(group=7)'], hl: [1, 3, 4] },
      { say: 'To send: if button A was pressed, radio dot send "hi". The message flies out to every micro:bit in group 7.',
        code: ['from microbit import *', 'import radio', '', 'radio.on()', 'radio.config(group=7)', 'while True:', '    if button_a.was_pressed():', '        radio.send("hi")'], hl: [6, 7],
        board: [[2000, { press: 'A' }], [2100, { send: true }], [4000, { press: 'A' }], [4100, { send: true }]] },
      { say: 'To receive: radio dot receive gives you the next message, or None if nothing has arrived. If the message is "hi", show a happy face!',
        code: ['from microbit import *', 'import radio', '', 'radio.on()', 'radio.config(group=7)', 'while True:', '    if button_a.was_pressed():', '        radio.send("hi")', '    msg = radio.receive()', '    if msg == "hi":', '        display.show(Image.HAPPY)'], hl: [8, 9, 10],
        board: [[0, { clear: true }], [2500, { recv: true }], [3200, { img: 'HAPPY' }]] },
      { say: 'Try it yourself! Put the same program on two micro:bits, or use the radio buttons in the simulator, and send each other smiles.',
        code: ['from microbit import *', 'import radio', '', 'radio.on()', 'radio.config(group=7)', 'while True:', '    if button_a.was_pressed():', '        radio.send("hi")', '    msg = radio.receive()', '    if msg == "hi":', '        display.show(Image.HAPPY)', '        sleep(1000)', '        display.clear()'],
        board: [[600, { press: 'A' }], [700, { send: true }], [2200, { recv: true }], [2800, { img: 'HAPPY' }]], end: true },
    ],
  },
  {
    id: 'touch', icon: '👆', title: 'Touch pins', mins: 2, kind: 'python',
    blurb: 'Use pins 0, 1 and 2 as touch buttons, and make a fruit piano.',
    scenes: [
      { say: 'The big gold pins 0, 1 and 2 can feel your touch! Hold GND with one hand, and touch a pin with your other hand.',
        code: [], board: [[1500, { touch: '0', ms: 3000 }]] },
      { say: 'A tiny bit of electricity goes through your body to GND, and the micro:bit notices. pin zero dot is touched gives True or False.',
        code: ['from microbit import *', '', 'while True:', '    if pin0.is_touched():', '        display.show(Image.HAPPY)', '    else:', '        display.show(Image.SAD)'], hl: [3, 4, 5, 6],
        board: [[0, { img: 'SAD' }], [2500, { touch: '0', ms: 2000 }], [2600, { img: 'HAPPY' }], [4600, { img: 'SAD' }]] },
      { say: 'Use elif to check more pins. Touch pin one to see a heart. If nothing is touched, display dot clear turns all the LEDs off.',
        code: ['from microbit import *', '', 'while True:', '    if pin0.is_touched():', '        display.show(Image.HAPPY)', '    elif pin1.is_touched():', '        display.show(Image.HEART)', '    else:', '        display.clear()'], hl: [5, 6, 7, 8],
        board: [[0, { clear: true }], [1800, { touch: '1', ms: 1800 }], [1900, { img: 'HEART' }], [3700, { clear: true }]] },
      { say: 'Here\'s a fun idea: clip each pin to a banana and play music when you touch them. A fruit piano! Bananas conduct electricity, just like you.',
        code: ['from microbit import *', 'import music', '', 'while True:', '    if pin0.is_touched():', '        music.pitch(262, 200)', '    elif pin1.is_touched():', '        music.pitch(330, 200)', '    elif pin2.is_touched():', '        music.pitch(392, 200)'], hl: [4, 5, 6, 7, 8, 9],
        board: [[1500, { touch: '0', ms: 600 }], [1550, { tones: [[262, 300]] }], [2300, { touch: '1', ms: 600 }], [2350, { tones: [[330, 300]] }], [3100, { touch: '2', ms: 600 }], [3150, { tones: [[392, 300]] }]] },
      { say: 'Try it yourself! On the simulator, click a gold pin to touch it.',
        code: ['from microbit import *', '', 'while True:', '    if pin0.is_touched():', '        display.show(Image.HAPPY)', '    elif pin1.is_touched():', '        display.show(Image.HEART)', '    else:', '        display.clear()'],
        board: [[600, { touch: '0', ms: 1500 }], [700, { img: 'HAPPY' }]], end: true },
    ],
  },
];

// What "Try it yourself" loads
const VID_BLOCKS_PROGRAM = () => ex([
  { type: 'mb_on_start', x: 20, y: 20, inputs: { DO: { block: { type: 'mb_show_icon', fields: { ICON: 'HEART' } } } } },
  { type: 'mb_on_button', x: 20, y: 140, fields: { BTN: 'a' }, inputs: { DO: { block: { type: 'mb_show_icon', fields: { ICON: 'HAPPY' } } } } },
  { type: 'mb_forever', x: 300, y: 20, inputs: { DO: { block: stack([
    { type: 'mb_show_icon', fields: { ICON: 'HEART' } },
    { type: 'mb_pause', inputs: { MS: { shadow: { type: 'math_number', fields: { NUM: 500 } } } } },
    { type: 'mb_show_icon', fields: { ICON: 'HEART_SMALL' } },
    { type: 'mb_pause', inputs: { MS: { shadow: { type: 'math_number', fields: { NUM: 500 } } } } }]) } } },
]);

/* ----- voices: a fun style (pitch + speed) on top of any speech voice installed on the computer ----- */
const VID_STYLES = [
  { id: 'bit', name: '🤖 Bit (cheerful)', pitch: 1.15, rate: 0.98 },
  { id: 'teacher', name: '🧑‍🏫 Teacher (calm)', pitch: 1.0, rate: 0.9 },
  { id: 'slow', name: '🐢 Slow and clear', pitch: 1.0, rate: 0.72 },
  { id: 'speedy', name: '⚡ Speedy', pitch: 1.2, rate: 1.35 },
  { id: 'robot', name: '🔩 Robot', pitch: 0.45, rate: 0.85 },
  { id: 'tiny', name: '🐭 Tiny mouse', pitch: 1.9, rate: 1.1 },
  { id: 'giant', name: '🐻 Giant bear', pitch: 0.15, rate: 0.8 },
];
const VID_VOICE_KEY = 'microbit-video-voice';
function vidVoicePrefs() { try { return { style: 'bit', voice: '', ...JSON.parse(localStorage.getItem(VID_VOICE_KEY) || '{}') }; } catch { return { style: 'bit', voice: '' }; } }
function vidSaveVoicePrefs(p) { try { localStorage.setItem(VID_VOICE_KEY, JSON.stringify(p)); } catch {} }
const vidVoices = () => { try { return speechSynthesis.getVoices(); } catch { return []; } };
function vidUtter(text) {
  const prefs = vidVoicePrefs(), voices = vidVoices();
  const style = VID_STYLES.find((st) => st.id === prefs.style) || VID_STYLES[0];
  const u = new SpeechSynthesisUtterance(text);
  u.voice = (prefs.voice && voices.find((vo) => vo.voiceURI === prefs.voice))
    || voices.find((vo) => /^en/i.test(vo.lang) && /female|samantha|google us|aria|jenny|zira/i.test(vo.name))
    || voices.find((vo) => /^en/i.test(vo.lang)) || null;
  if (u.voice) u.lang = u.voice.lang;
  u.pitch = style.pitch; u.rate = style.rate;
  return u;
}
function vidVoicePanel() {
  const box = $('vid-vpanel'); if (!box) return;
  const prefs = vidVoicePrefs(), voices = vidVoices();
  const en = voices.filter((vo) => /^en/i.test(vo.lang)), other = voices.filter((vo) => !/^en/i.test(vo.lang));
  const opt = (vo) => `<option value="${esc(vo.voiceURI)}" ${vo.voiceURI === prefs.voice ? 'selected' : ''}>${esc(vo.name)} (${esc(vo.lang)})</option>`;
  box.innerHTML = `<label>🎭 Style <select id="vid-style">${VID_STYLES.map((st) => `<option value="${st.id}" ${st.id === prefs.style ? 'selected' : ''}>${st.name}</option>`).join('')}</select></label>
    <label>🗣️ Voice <select id="vid-vsel"><option value="">✨ Automatic</option>${en.length ? `<optgroup label="English">${en.map(opt).join('')}</optgroup>` : ''}${other.length ? `<optgroup label="Other languages">${other.map(opt).join('')}</optgroup>` : ''}</select></label>
    <button id="vid-vtest">🔈 Test</button>
    ${voices.length ? `<span class="muted">${voices.length} voice${voices.length === 1 ? '' : 's'} on this computer</span>` : '<span class="muted">This browser has no speech voices installed, so lessons show captions only. Windows, Mac, ChromeOS, Android and iPad come with voices.</span>'}`;
  const save = () => vidSaveVoicePrefs({ style: $('vid-style').value, voice: $('vid-vsel').value });
  $('vid-style').onchange = () => { save(); vidTestVoice(); };
  $('vid-vsel').onchange = () => { save(); vidTestVoice(); };
  $('vid-vtest').onclick = vidTestVoice;
}
function vidTestVoice() {
  try {
    speechSynthesis.cancel();
    const st = VID_STYLES.find((x) => x.id === vidVoicePrefs().style) || VID_STYLES[0];
    speechSynthesis.speak(vidUtter(`Hi! I'm Bit, with my ${st.name.replace(/^\S+\s/, '').replace(/\(.*\)/, '')} voice.`));
  } catch {}
}
try { speechSynthesis.addEventListener('voiceschanged', () => { if ($('vid-vpanel') && !$('vid-vpanel').hidden) vidVoicePanel(); }); } catch {}

const vidSeen = () => { try { return JSON.parse(localStorage.getItem(VID_SEEN_KEY) || '[]'); } catch { return []; } };
const vidMarkSeen = (id) => { try { const s = vidSeen(); if (!s.includes(id)) localStorage.setItem(VID_SEEN_KEY, JSON.stringify([...s, id])); } catch {} };

/* ------------------------------------------------------------- the list of videos */
function renderVideoList() {
  vidStop();
  const seen = vidSeen();
  $('videos-main').innerHTML = `<div class="vid-wrap"><h2>📺 Video lessons</h2>
    <p class="muted">Short lessons with Bit. Turn your sound on! Each one ends with a program you can try yourself.</p>
    <div class="vid-list">${VIDEOS.map((v, i) => `<button class="vid-card" data-v="${i}">
      <span class="vid-thumb vid-k-${v.kind}"><span>${v.icon}</span><i>▶</i></span>
      <b>${i + 1}. ${esc(v.title)}</b><span class="muted">${esc(v.blurb)}</span>
      <span class="vid-meta">⏱️ about ${v.mins} min · ${v.kind === 'blocks' ? '🧩 Blocks' : '🐍 Python'}${seen.includes(v.id) ? ' · <b class="vid-seen">✓ watched</b>' : ''}</span></button>`).join('')}</div></div>`;
  document.querySelectorAll('.vid-card').forEach((b) => (b.onclick = () => playVideo(+b.dataset.v)));
}

/* ------------------------------------------------------------- the player */
const VP = { v: null, i: 0, playing: false, timers: [], typing: 0, voice: true, cc: true, token: 0, beat: 0 };
function vidStop() {
  VP.playing = false; VP.token++;
  VP.timers.forEach(clearTimeout); VP.timers = []; clearInterval(VP.typing); clearInterval(VP.beat); clearInterval(VP.scrolling);
  try { speechSynthesis.cancel(); } catch {}
}

function playVideo(n) {
  vidStop();
  VP.v = VIDEOS[n]; VP.n = n; VP.i = 0; VP.finished = false;
  const v = VP.v;
  $('videos-main').innerHTML = `<div class="vid-wrap"><div class="vid-top"><button id="vid-back">← All videos</button><h2>${v.icon} ${esc(v.title)}</h2></div>
    <div class="vid-player" id="vid-player">
      <div class="vid-stage">
        <div class="vid-left"><div class="vid-board" id="vid-board">
          <div class="vid-leds" id="vid-leds">${'<i></i>'.repeat(25)}</div>
          <span class="vid-btn a" id="vid-ba">A</span><span class="vid-btn b" id="vid-bb">B</span>
          <span class="vid-run" id="vid-run" hidden>⚡ USB</span>
          <div class="vid-pins">${['0', '1', '2', '3V', 'GND'].map((p) => `<span data-pin="${p}">${p}</span>`).join('')}</div>
          <div class="vid-fx" id="vid-fx"></div></div>
          <div class="vid-bit">${typeof botSVG === 'function' ? botSVG() : '🤖'}</div></div>
        <div class="vid-right"><div class="vid-code ${v.kind === 'blocks' ? 'blocks' : ''}" id="vid-code"></div></div>
        <div class="vid-cc" id="vid-cc"></div>
        <button class="vid-bigplay" id="vid-bigplay" aria-label="Play">▶</button>
      </div>
      <div class="vid-bar" id="vid-bar">${v.scenes.map((_, i) => `<button data-s="${i}" aria-label="Scene ${i + 1}"><i></i></button>`).join('')}</div>
      <div class="vid-ctrl">
        <button id="vid-prev" aria-label="Previous scene">⏮</button><button id="vid-play" class="primary" aria-label="Play">▶ Play</button><button id="vid-next" aria-label="Next scene">⏭</button>
        <span class="vid-count" id="vid-count"></span>
        <button id="vid-voice" aria-pressed="true" title="Bit's voice">🔊 Voice</button><button id="vid-vcfg" aria-expanded="false" title="Choose a voice">🗣️ Change voice</button><button id="vid-ccbtn" aria-pressed="true" title="Captions">💬 Captions</button>
      </div>
      <div class="vid-vpanel" id="vid-vpanel" hidden></div>
    </div>
    <div class="vid-try" id="vid-try" hidden><b>🎉 Lesson done!</b> <span>Now try it yourself:</span>
      <button class="primary" id="vid-tryit">${v.kind === 'blocks' ? '🧩 Open these blocks' : '🐍 Load this code and run it'}</button>
      ${VIDEOS[VP.n + 1] ? `<button id="vid-nextvid">Next video: ${VIDEOS[VP.n + 1].icon} ${esc(VIDEOS[VP.n + 1].title)} ▶</button>` : ''}</div></div>`;
  $('vid-back').onclick = renderVideoList;
  $('vid-play').onclick = $('vid-bigplay').onclick = () => (VP.playing ? vidPause() : vidPlay());
  $('vid-prev').onclick = () => vidGo(Math.max(0, VP.i - 1), VP.playing);
  $('vid-next').onclick = () => vidGo(Math.min(v.scenes.length - 1, VP.i + 1), VP.playing);
  $('vid-bar').querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => vidGo(+b.dataset.s, VP.playing)));
  $('vid-voice').onclick = () => { VP.voice = !VP.voice; vidButtons(); if (!VP.voice) try { speechSynthesis.cancel(); } catch {} if (VP.playing) vidGo(VP.i, true); };
  $('vid-ccbtn').onclick = () => { VP.cc = !VP.cc; vidButtons(); };
  $('vid-vcfg').onclick = () => { const p = $('vid-vpanel'); p.hidden = !p.hidden; $('vid-vcfg').setAttribute('aria-expanded', !p.hidden); if (!p.hidden) vidVoicePanel(); };
  $('vid-tryit').onclick = () => vidTryIt(v);
  $('vid-nextvid')?.addEventListener('click', () => playVideo(VP.n + 1));
  vidButtons();
  vidScene(0, false);   // show the first scene, waiting for Play (browsers only allow sound after a click)
}

function vidButtons() {
  if (!$('vid-play')) return;
  $('vid-play').textContent = VP.playing ? '⏸ Pause' : '▶ Play';
  $('vid-bigplay').hidden = VP.playing;
  $('vid-voice').textContent = VP.voice ? '🔊 Voice' : '🔇 Voice off'; $('vid-voice').setAttribute('aria-pressed', VP.voice);
  $('vid-ccbtn').setAttribute('aria-pressed', VP.cc); $('vid-ccbtn').classList.toggle('off', !VP.cc);
  $('vid-cc').hidden = !VP.cc;
  $('vid-count').textContent = `Scene ${VP.i + 1} of ${VP.v.scenes.length}`;
  $('vid-bar').querySelectorAll('[data-s]').forEach((b, i) => { b.classList.toggle('done', i < VP.i); b.classList.toggle('now', i === VP.i); });
}
function vidPlay() {
  if (VP.finished && VP.i >= VP.v.scenes.length - 1) { VP.i = 0; VP.finished = false; }   // replay from the start
  vidGo(VP.i, true);
}
function vidPause() { vidStop(); vidButtons(); }
function vidGo(i, play) { vidStop(); vidScene(i, play); }

function vidScene(i, play) {
  const v = VP.v, s = v.scenes[i], token = ++VP.token;
  VP.i = i; VP.playing = play;
  $('vid-try').hidden = !(VP.finished && i === v.scenes.length - 1 && !play);
  vidButtons();
  $('vid-cc').textContent = s.say;
  // the code panel: lines (or blocks) from before stay, the new ones appear one by one
  const prev = i > 0 ? v.scenes[i - 1] : null;
  if (v.kind === 'blocks') vidDrawBlocks(s.blocks || [], prev?.blocks || [], play);
  else vidDrawCode(s.code || prev?.code || [], prev?.code || [], s.hl || [], s.bad, play);
  // the cartoon micro:bit
  clearInterval(VP.beat); clearInterval(VP.scrolling);
  $('vid-board').style.transform = ''; $('vid-run').hidden = true;
  if (!play) { vidBoardStill(s); return; }
  if (s.run) { $('vid-run').hidden = false; VP.timers.push(setTimeout(() => { if ($('vid-run')) $('vid-run').hidden = true; }, 1300)); }
  (s.board || []).forEach(([ms, act]) => VP.timers.push(setTimeout(() => { if (VP.token === token) vidAct(act); }, ms)));
  // narration, then the next scene
  const next = () => {
    if (VP.token !== token) return;
    if (i + 1 < v.scenes.length) vidScene(i + 1, true);
    else { VP.finished = true; vidMarkSeen(v.id); vidStop(); vidButtons(); $('vid-try').hidden = false; $('vid-try').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  };
  // each scene lasts long enough to watch the animation AND read the caption, even with no voice
  const minMs = Math.max(Math.max(...(s.board || [[0]]).map(([ms]) => ms)) + 1200, s.say.split(/\s+/).length * 300 + 800);
  const t0 = performance.now();
  const after = () => { const left = Math.max(800, minMs - (performance.now() - t0)); VP.timers.push(setTimeout(next, left)); };
  if (VP.voice && 'speechSynthesis' in window) {
    try {
      speechSynthesis.cancel();
      const u = vidUtter(s.say);
      let done = false;
      const fin = () => { if (!done) { done = true; after(); } };
      u.onend = fin; u.onerror = fin;
      speechSynthesis.speak(u);
      // if the speech engine never answers, carry on anyway
      VP.timers.push(setTimeout(fin, s.say.split(/\s+/).length * 520 + 4000));
      return;
    } catch { /* fall through to reading time */ }
  }
  after();
}

/* ----- the cartoon micro:bit ----- */
const vidLeds = () => [...document.querySelectorAll('#vid-leds i')];
function vidFrame(rows) {   // rows: '09090:99999:…' or 25 numbers
  const vals = Array.isArray(rows) ? rows : rows.replace(/:/g, '').split('').map(Number);
  vidLeds().forEach((el, k) => { el.style.opacity = vals[k] ? 0.25 + vals[k] / 12 : ''; el.classList.toggle('on', !!vals[k]); });
}
function vidScroll(text) {
  clearInterval(VP.scrolling);
  const cols = [];   // columns of the whole message, with a gap after each letter
  for (const ch of ` ${text} `) { const g = typeof glyph === 'function' ? glyph(ch) : ['.....', '.....', '.....', '.....', '.....']; for (let c = 0; c < 5; c++) cols.push(g.map((r) => (r[c] === '#' ? 9 : 0))); cols.push([0, 0, 0, 0, 0]); }
  let off = 0;
  VP.scrolling = setInterval(() => {
    if (off + 5 > cols.length) { clearInterval(VP.scrolling); vidFrame(Array(25).fill(0)); return; }
    const vals = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) vals.push(cols[off + c][r]);
    vidFrame(vals); off++;
  }, 110);
}
function vidAct(a) {
  if (!$('vid-board')) return;
  if (a.clear) vidFrame(Array(25).fill(0));
  if (a.img) { clearInterval(VP.beat); clearInterval(VP.scrolling); vidFrame(VID_IMG[a.img]); }
  if (a.scroll) { clearInterval(VP.beat); vidScroll(a.scroll); }
  if (a.num) { clearInterval(VP.scrolling); const g = glyph(a.num); vidFrame(g.map((r) => r.replace(/#/g, '9').replace(/\./g, '0')).join(':')); }
  if (a.press || a.hold) {
    const el = $(a.press === 'B' || a.hold === 'B' ? 'vid-bb' : 'vid-ba');
    el.classList.add('down'); VP.timers.push(setTimeout(() => el?.classList.remove('down'), a.ms || 350));
  }
  if (a.beat) { let big = true; vidFrame(VID_IMG.HEART); clearInterval(VP.beat); VP.beat = setInterval(() => { big = !big; vidFrame(VID_IMG[big ? 'HEART' : 'HEART_SMALL']); }, 500); }
  if (a.pix) { clearInterval(VP.beat); clearInterval(VP.scrolling); vidFrame(a.pix); }
  if (a.anim) {   // a flip-book of pictures
    clearInterval(VP.beat); clearInterval(VP.scrolling);
    let k = 0; vidFrame(a.anim[0]);
    VP.beat = setInterval(() => { k = (k + 1) % a.anim.length; vidFrame(a.anim[k]); }, a.ms || 300);
  }
  if (a.pins || a.touch) {   // light up pins (a finger on a touch pin)
    const list = a.pins || [a.touch, 'GND'];
    list.forEach((p) => document.querySelector(`#vid-board [data-pin="${p}"]`)?.classList.add('lit'));
    if (a.touch) vidFx('👆', 'touch');
    VP.timers.push(setTimeout(() => list.forEach((p) => document.querySelector(`#vid-board [data-pin="${p}"]`)?.classList.remove('lit')), a.ms || 2500));
  }
  if (a.tones) {   // really play the notes, with ♪ floating up
    let t = 0;
    a.tones.forEach(([f, ms]) => {
      VP.timers.push(setTimeout(() => { if (typeof bwTone === 'function') bwTone(f, ms * 0.9, 'square'); vidFx('♪', 'note'); }, t));
      t += ms;
    });
  }
  if (a.send) { vidFx('', 'wave out'); vidFx('', 'wave out d2'); }
  if (a.recv) { vidFx('', 'wave in'); vidFx('', 'wave in d2'); }
  if (a.tilt !== undefined) $('vid-board').style.transform = `rotate(${a.tilt}deg)`;
  if (a.shake) { const b = $('vid-board'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
}
function vidFx(text, cls) {   // a little effect that floats off the board, then disappears
  const fx = $('vid-fx'); if (!fx) return;
  const el = document.createElement('span'); el.className = 'vid-f ' + cls; el.textContent = text;
  if (cls === 'note') el.style.left = (30 + Math.random() * 40) + '%';
  fx.appendChild(el); setTimeout(() => el.remove(), 1600);
}
function vidBoardStill(s) {   // paused: show how the board ends up in this scene
  const acts = (s.board || []).map(([, a]) => a);
  vidFrame(Array(25).fill(0));
  for (const a of acts) {
    if (a.img) vidFrame(VID_IMG[a.img]);
    if (a.beat) vidFrame(VID_IMG.HEART);
    if (a.pix) vidFrame(a.pix);
    if (a.anim) vidFrame(a.anim[a.anim.length - 1]);
    if (a.num) vidFrame(glyph(a.num).map((r) => r.replace(/#/g, '9').replace(/\./g, '0')).join(':'));
    if (a.scroll) vidFrame(glyph(a.scroll[0]).map((r) => r.replace(/#/g, '9').replace(/\./g, '0')).join(':'));
  }
}

/* ----- the code panel ----- */
function vidHighlight(line) {   // a tiny Python colourer
  return esc(line)
    .replace(/(&quot;[^&]*?&quot;|"[^"]*")/g, '<span class="py-str">$1</span>')
    .replace(/\b(from|import|while|if|elif|else|True|False|None|for|in|def|return)\b/g, '<span class="py-kw">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="py-num">$1</span>');
}
function vidDrawCode(lines, prevLines, hl, bad, animate) {
  clearInterval(VP.typing);
  const box = $('vid-code');
  const same = (k) => prevLines[k] === lines[k];
  const render = (upto) => {
    box.innerHTML = `<div class="vid-file">🐍 main.py</div>` + (lines.length ? lines.map((l, k) => {
      const typed = same(k) ? l : k < upto.line ? l : k === upto.line ? l.slice(0, upto.ch) : '';
      if (!same(k) && k > upto.line) return '';
      return `<div class="vid-line${hl.includes(k) ? ' hl' : ''}${bad && hl.includes(k) ? ' bad' : ''}"><span class="vid-ln">${k + 1}</span><code>${vidHighlight(typed) || '&nbsp;'}</code>${k === upto.line && !same(k) && animate ? '<span class="vid-caret"></span>' : ''}</div>`;
    }).join('') : '<p class="muted vid-empty">The code will appear here…</p>');
  };
  const firstNew = lines.findIndex((_, k) => !same(k));
  if (!animate || firstNew < 0) { render({ line: lines.length, ch: 0 }); return; }
  let line = firstNew, ch = 0;
  VP.typing = setInterval(() => {
    while (line < lines.length && same(line)) line++;
    if (line >= lines.length) { clearInterval(VP.typing); render({ line: lines.length, ch: 0 }); return; }
    ch += 2;
    if (ch > lines[line].length) { line++; ch = 0; }
    render({ line, ch });
  }, 45);
}
function vidDrawBlocks(blocks, prevBlocks, animate) {
  clearInterval(VP.typing);
  const box = $('vid-code');
  const same = (k) => prevBlocks[k] && prevBlocks[k][0] === blocks[k][0];
  const render = (n) => {
    box.innerHTML = `<div class="vid-file">🧩 Blocks</div>` + (blocks.length ? blocks.map(([t, kind, ind], k) => (k < n || same(k)
      ? `<div class="vid-block k-${kind}${!same(k) && animate && k === n - 1 ? ' pop' : ''}" style="margin-left:${ind * 22}px">${esc(t)}</div>` : '')).join('') : '<p class="muted vid-empty">The blocks will appear here…</p>');
  };
  if (!animate) { render(blocks.length); return; }
  let n = blocks.findIndex((_, k) => !same(k)); if (n < 0) { render(blocks.length); return; }
  render(n);
  VP.typing = setInterval(() => { n++; render(n); if (n >= blocks.length) clearInterval(VP.typing); }, 700);
}

/* ----- try it yourself ----- */
function vidTryIt(v) {
  vidStop();
  if (v.kind === 'blocks') {
    showView('blocks');
    setTimeout(() => {
      if (typeof ws === 'undefined' || !ws) return;
      if (ws.getAllBlocks(false).length && !confirm('Load the lesson\'s blocks? Your current blocks will be replaced.')) return;
      Blockly.serialization.workspaces.load(VID_BLOCKS_PROGRAM(), ws);
      if (typeof tidy === 'function') tidy();
    }, 200);
    return;
  }
  const code = v.scenes[v.scenes.length - 1].code.join('\n') + '\n';
  const box = $('code');
  if (box.value.trim() && box.value.trim() !== code.trim() && !confirm('Put the lesson\'s code in the Python editor? What\'s in the editor now will be replaced.')) return;
  box.value = code; box.dispatchEvent(new Event('input'));
  showView('manager');
  box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  // run it on the connected micro:bit, or on the simulator if nothing is connected
  if (!port && typeof simConnect === 'function') { if (typeof openSim === 'function') openSim(); simConnect(); }
  setTimeout(() => { try { Promise.resolve(runCode(code)).catch(() => {}); } catch {} }, 400);
}

/* ----- the tab ----- */
window.onVideosShow = () => { if (!$('vid-player')) renderVideoList(); };
window.onVideosHide = () => { if (VP.playing) vidPause(); };
// if the app opened straight onto this tab (it remembers the last tab), draw the list now
if (!$('view-videos').hidden) renderVideoList();
