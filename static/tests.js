/* Prebuilt tests a teacher can turn into a class quiz with one click (or tweak first).
   Each question lists the RIGHT answer first; prebuiltQuiz() moves it to a different
   spot in each question so it isn't always answer A. */

const PREBUILT_TESTS = [
  {
    id: 'meet', emoji: '👋', title: 'Meet the micro:bit', level: 'Starter',
    blurb: 'The basics: what is on the board and what it can do.',
    questions: [
      ['How many LEDs are on the front of the micro:bit?', ['25', '16', '10', '36'], 'It is a 5 × 5 grid, and 5 × 5 = 25.'],
      ['How many buttons can your program read on the front?', ['2 (A and B)', '1', '3', '5'], 'Buttons A and B are for your programs. The button on the back is reset.'],
      ['What does the button on the back of the board do?', ['Restarts (resets) the micro:bit', 'Turns on the radio', 'Takes a photo', 'Makes the LEDs brighter'], 'Reset starts your program again from the beginning.'],
      ['How do you get a program onto the micro:bit?', ['Plug in the USB cable and flash it', 'Shout at it', 'Shake it three times', 'Press A and B for 10 seconds'], 'Flashing copies your program into the micro:bit over USB.'],
      ['What can power the micro:bit when it is NOT plugged into a computer?', ['A battery pack', 'Sunlight on the LEDs', 'The compass', 'Nothing, it always needs a computer'], 'A battery pack (2 × AAA) plugs into the small white socket.'],
      ['Which of these can the micro:bit sense?', ['Tilt, light and temperature', 'Smell', 'Taste', 'Colour of your shirt'], 'It has an accelerometer, a compass, a temperature sensor and can sense light with its LEDs.'],
      ['What are the gold strips at the bottom edge for?', ['Pins to connect wires, buzzers and other parts', 'Decoration', 'Charging a phone', 'Cooling the board'], 'They are the edge connector. Big holes 0, 1, 2, 3V and GND are easy to clip onto.'],
      ['Can two micro:bits talk to each other without wires?', ['Yes, using the radio', 'No, never', 'Only through the USB cable', 'Only if they touch'], 'The micro:bit has a built-in radio for sending messages to other micro:bits.'],
    ],
  },
  {
    id: 'buttons', emoji: '🔘', title: 'Buttons and touch pins', level: 'Starter',
    blurb: 'How presses and touches become signals for the processor.',
    questions: [
      ['Button A is being pressed. What does its processor pin read?', ['0', '1', '255', '3.3'], 'Pressing connects the wire to GND (0 V), so the pin reads 0. On the micro:bit, 0 means pressed!'],
      ['What keeps a button wire reading 1 when nobody presses it?', ['A pull-up resistor', 'A battery inside the button', 'The compass', 'The radio'], 'The pull-up resistor holds the wire at 3 V until a press connects it to GND.'],
      ['To use touch pin 0, what should your other hand hold?', ['GND', '3V', 'Button B', 'The USB cable'], 'Your body completes the circuit from the pin to GND.'],
      ['In Python, which check notices a press that happened while your program was busy?', ['button_a.was_pressed()', 'button_a.is_pressed()', 'button_a.get_x()', 'button_a.scroll()'], 'was_pressed() remembers a press since you last asked. is_pressed() only checks right now.'],
      ['What does button_a.is_pressed() give back?', ['True or False', 'A number from 0 to 255', 'A picture', 'A sound'], 'It answers a yes/no question: is the button down right now?'],
      ['Which pins are the easy "touch pins"?', ['0, 1 and 2', '3, 4 and 5', 'A and B', '3V and GND'], 'The big holes 0, 1 and 2 can tell when you touch them.'],
      ['A button "bounces" when pressed. What does that mean?', ['The metal contacts click on and off a few times very fast', 'The button jumps off the board', 'The LEDs flash', 'The program restarts'], 'Real switches wobble for a moment. The micro:bit software smooths this out for you.'],
      ['What happens if you press A and B together?', ['Your program can check for both at once', 'The micro:bit turns off', 'It always resets', 'Nothing can ever detect it'], 'You can test button_a.is_pressed() and button_b.is_pressed() together.'],
    ],
  },
  {
    id: 'sensors', emoji: '📡', title: 'Sensors detective', level: 'Explorer',
    blurb: 'Accelerometer, compass, temperature and light.',
    questions: [
      ['Which sensor knows when you shake or tilt the micro:bit?', ['The accelerometer', 'The compass', 'The temperature sensor', 'The radio'], 'The accelerometer measures movement and which way gravity pulls.'],
      ['What is inside an accelerometer chip?', ['A tiny weight on springs', 'A tiny compass needle', 'A tiny camera', 'A tiny battery'], 'When the board moves, the weight moves and the chip measures how far.'],
      ['The board lies flat and still. About what does accelerometer.get_z() read?', ['About −1024 (gravity pulling down)', '0 exactly', '500', '9999'], 'Gravity pulls about 1 g, which the micro:bit reports as about 1024 milli-g.'],
      ['What must you usually do before the compass works well?', ['Calibrate it by tilting to fill the screen', 'Put it in the fridge', 'Press reset 5 times', 'Unplug the battery'], 'Calibrating teaches the compass about magnets near it.'],
      ['Where is the temperature sensor?', ['Inside the processor chip', 'In button A', 'In the USB socket', 'In the LEDs'], 'It measures the chip, so it reads a little warmer than the room.'],
      ['How does the micro:bit measure light?', ['It uses its LEDs backwards as light sensors', 'With a solar panel', 'With a camera', 'With the temperature sensor'], 'LEDs make a tiny current when light hits them, so they can sense light too.'],
      ['display.read_light_level() gives a number from 0 to what?', ['255', '10', '100', '1024'], '0 is very dark and 255 is very bright.'],
      ['Which sensor would you use to build a "which way is north" app?', ['The compass (magnetometer)', 'The accelerometer', 'The light sensor', 'Button B'], 'The magnetometer senses Earth\'s magnetic field.'],
    ],
  },
  {
    id: 'leds', emoji: '💡', title: 'The LED screen', level: 'Explorer',
    blurb: 'Pictures, scrolling text and how 25 LEDs are wired.',
    questions: [
      ['How are the 25 LEDs actually wired?', ['As 3 rows × 9 columns', 'In one long chain', 'Each with its own wire (25 wires)', 'As 5 rows × 5 columns'], 'The layout looks like 5 × 5, but the wiring is a 3 × 9 grid to save pins.'],
      ['The screen lights the rows one after another very fast. Why does it look steady?', ['Our eyes can\'t see the flicker', 'The LEDs never turn off', 'The compass holds them on', 'It doesn\'t look steady'], 'It switches faster than eyes can notice, so you see a still picture.'],
      ['Which Python line scrolls words across the screen?', ['display.scroll("Hi")', 'display.show(Image.HAPPY)', 'print("Hi")', 'radio.send("Hi")'], 'scroll() slides text across. show() shows a picture or one character at a time.'],
      ['How bright can one LED be with display.set_pixel(x, y, b)?', ['0 (off) to 9 (brightest)', '0 to 255', '1 to 100', 'Only on or off'], 'Brightness goes from 0 to 9.'],
      ['Where is pixel (0, 0)?', ['Top-left corner', 'Bottom-right corner', 'The middle', 'Top-right corner'], 'x counts left to right and y counts top to bottom, both starting at 0.'],
      ['Which line clears the screen?', ['display.clear()', 'display.scroll("")', 'display.off()', 'Image.CLEAR()'], 'clear() turns every LED off.'],
      ['What does display.show(Image.HEART) do?', ['Shows a heart picture', 'Plays a heartbeat sound', 'Sends a heart over radio', 'Measures your pulse'], 'Image has many built-in pictures like HEART, HAPPY and SAD.'],
      ['The middle LED is at which (x, y)?', ['(2, 2)', '(3, 3)', '(5, 5)', '(1, 1)'], 'Counting from 0, the middle of 0–4 is 2.'],
    ],
  },
  {
    id: 'inside', emoji: '🔬', title: 'Inside the micro:bit', level: 'Explorer',
    blurb: 'The processor, the interface chip and how parts talk.',
    questions: [
      ['Which part actually runs your program?', ['The processor (nRF51822)', 'The interface chip', 'The accelerometer', 'The LED screen'], 'The processor is the brain. MicroPython and your program live there.'],
      ['What is the interface chip\'s job?', ['Handling USB and copying programs into the processor', 'Running your program', 'Measuring temperature', 'Lighting the LEDs'], 'It acts like a USB drive and flashes programs into the processor.'],
      ['When you plug in the micro:bit, what drive appears on the computer?', ['MICROBIT', 'C:', 'PROCESSOR', 'RADIO'], 'The interface chip pretends to be a USB drive called MICROBIT.'],
      ['How do the accelerometer and compass send readings to the processor?', ['Over two shared wires called I²C', 'By radio', 'Through the LEDs', 'Over the USB cable'], 'I²C lets several chips share the same two wires, each with its own address.'],
      ['About how fast is the micro:bit v1 processor?', ['16 MHz (16 million ticks a second)', '16 ticks a second', '3 GHz like a gaming PC', '1 tick a minute'], 'It is slow next to a laptop, but plenty for buttons, LEDs and sensors.'],
      ['Which is bigger on the v1: program memory (flash) or working memory (RAM)?', ['Flash (256 KB) is bigger than RAM (16 KB)', 'RAM is bigger', 'They are the same', 'It has no memory'], 'Flash keeps your program when the power is off. RAM is the small scratch space while it runs.'],
      ['Which memory keeps your program after you unplug the power?', ['Flash memory', 'RAM', 'The LEDs', 'The battery'], 'Flash stays put without power. RAM forgets everything.'],
      ['What does the processor use to tell the time and keep a steady beat?', ['A clock signal', 'The compass', 'Button A', 'The temperature sensor'], 'A clock ticks millions of times a second, and every step of the program happens on a tick.'],
    ],
  },
  {
    id: 'binary', emoji: '🔢', title: 'Binary and bits', level: 'Challenge',
    blurb: 'How computers count with only 0s and 1s.',
    questions: [
      ['What are the only two digits in binary?', ['0 and 1', '1 and 2', '0 and 9', 'A and B'], 'Binary uses just 0 and 1, like a switch that is off or on.'],
      ['What is binary 101 in normal numbers?', ['5', '101', '3', '6'], '1×4 + 0×2 + 1×1 = 5.'],
      ['What is binary 1010 in normal numbers?', ['10', '1010', '8', '12'], '1×8 + 0×4 + 1×2 + 0×1 = 10.'],
      ['How many bits are in one byte?', ['8', '2', '10', '16'], 'A byte is 8 bits.'],
      ['What is the biggest number one byte can hold?', ['255', '256', '100', '8'], '11111111 in binary is 128+64+32+16+8+4+2+1 = 255.'],
      ['How do you write 6 in binary?', ['110', '6', '101', '011'], '6 = 4 + 2, so 1×4 + 1×2 + 0×1 → 110.'],
      ['Each place in binary is worth how much more than the place to its right?', ['2 times as much', '10 times as much', '1 more', 'The same'], 'Places go 1, 2, 4, 8, 16… doubling each time.'],
      ['Why do computers use binary?', ['Electronics can easily tell "on" from "off"', 'It looks cool', 'It uses less paint', 'Numbers above 1 are illegal'], 'A wire is either high voltage (1) or low voltage (0), which is easy and reliable to detect.'],
    ],
  },
  {
    id: 'radio', emoji: '📻', title: 'Radio messages', level: 'Challenge',
    blurb: 'Sending messages between micro:bits.',
    questions: [
      ['What must your program do before it can send or receive radio messages?', ['Turn the radio on with radio.on()', 'Shake the board', 'Unplug the USB', 'Calibrate the compass'], 'The radio is off by default to save power.'],
      ['Two micro:bits can\'t hear each other. What might be different?', ['Their radio group number', 'Their LED colour', 'Their temperature', 'Their button size'], 'Only micro:bits set to the same group can hear each other.'],
      ['Which line sends a message?', ['radio.send("hi")', 'radio.receive()', 'display.scroll("hi")', 'radio.off()'], 'send() broadcasts to every micro:bit in the same group.'],
      ['What does radio.receive() give back when no message has arrived?', ['None', 'An error that crashes', '"hello"', '0'], 'It returns None, so check for that before using the message.'],
      ['Who hears a radio message?', ['Every micro:bit nearby in the same group', 'Only one chosen micro:bit', 'Only the computer', 'Nobody, it is stored'], 'Radio broadcasts like a walkie-talkie: everyone on the channel hears it.'],
      ['The micro:bit radio is the same kind of radio used by…', ['Bluetooth (2.4 GHz)', 'FM car radios', 'TV satellites', 'Walkie-talkies on 27 MHz'], 'It works in the 2.4 GHz band, the same band as Bluetooth and Wi-Fi.'],
      ['Why might a message not arrive even when the groups match?', ['The micro:bits are too far apart', 'The LEDs are off', 'Button A was pressed', 'It is too cold'], 'Radio signals get weaker with distance and walls.'],
      ['What can you send with radio.send()?', ['Text (a string)', 'A photo', 'A sound file', 'Another micro:bit'], 'In MicroPython, radio.send() sends text. Turn numbers into text with str().'],
    ],
  },
  {
    id: 'python', emoji: '🐍', title: 'Python on the micro:bit', level: 'Challenge',
    blurb: 'Reading and fixing short MicroPython programs.',
    questions: [
      ['What is usually the first line of a micro:bit Python program?', ['from microbit import *', 'import python', 'start()', 'begin microbit'], 'It loads display, buttons, sensors and sleep so you can use them.'],
      ['What does sleep(1000) do?', ['Waits for 1 second', 'Waits for 1000 seconds', 'Turns the board off', 'Counts to 1000'], 'sleep() counts in milliseconds, and 1000 ms = 1 second.'],
      ['Which loop keeps running forever?', ['while True:', 'for i in range(3):', 'if True:', 'loop once:'], 'while True: repeats its indented lines over and over.'],
      ['Why do lines inside an if or loop start with spaces?', ['Indenting shows which lines belong inside', 'It makes the code faster', 'Python ignores spaces', 'To save memory'], 'Python uses indentation to know which lines are inside the block.'],
      ['What is wrong with: display.scroll("Score: " + 5)?', ['You can\'t add text and a number; use str(5)', 'Nothing', 'scroll needs a picture', 'The quotes should be removed'], 'Turn the number into text first: "Score: " + str(5).'],
      ['What does temperature() give back?', ['The temperature in °C', 'The temperature in °F', 'True or False', 'The time'], 'It returns whole degrees Celsius.'],
      ['Which symbol checks if two things are equal in an if?', ['==', '=', '=>', '!='], 'One = stores a value. Two == compares.'],
      ['count = count + 1 does what?', ['Adds one to count', 'Makes count equal 1', 'Checks if count is 1', 'Deletes count'], 'It takes the old value, adds one, and stores it back.'],
    ],
  },
  {
    id: 'coding', emoji: '🧩', title: 'Coding ideas', level: 'Starter',
    blurb: 'Loops, ifs, variables and events, with blocks or Python.',
    questions: [
      ['What is a loop?', ['Code that repeats', 'A broken program', 'A kind of sensor', 'A picture on the LEDs'], 'Loops repeat steps so you don\'t have to write them many times.'],
      ['What is a variable?', ['A named box that stores a value', 'A kind of LED', 'A loop that never ends', 'A radio channel'], 'Variables remember things, like a score.'],
      ['"If button A is pressed, show a heart". What kind of block is the "if"?', ['A decision (condition)', 'A loop', 'A variable', 'A sound'], 'An if only runs its inside steps when the condition is true.'],
      ['What is a bug?', ['A mistake in a program', 'A tiny robot', 'A fast computer', 'A kind of sensor'], 'Finding and fixing bugs is called debugging.'],
      ['Code inside a "forever" block runs…', ['Again and again until the power is off', 'Exactly once', 'Only when you press reset', 'Never'], 'Forever loops are perfect for checking sensors all the time.'],
      ['An algorithm is…', ['A list of steps to solve a problem', 'A type of battery', 'A broken wire', 'A computer brand'], 'A recipe is an algorithm for cooking!'],
      ['You want a dice app. Which sensor event fits best?', ['On shake', 'On temperature', 'On compass north', 'On light dark'], 'Shake it like a real dice, then show a random number.'],
      ['The steps run in the wrong order. What is that kind of bug called?', ['A sequence bug', 'A hardware bug', 'A battery bug', 'A radio bug'], 'Sequence means order. Computers do exactly the order you give them.'],
    ],
  },
];

/* Turn a prebuilt test into the shape the class server stores. */
function prebuiltQuiz(t) {
  return {
    title: t.title,
    questions: t.questions.map(([q, answers, why], i) => {
      // the right answer moves to a spot picked from the question's text: no pattern to spot, but the same every time
      let h = i + 7; for (const ch of q) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const shift = h % answers.length;
      const rotated = answers.map((_, k) => answers[(k - shift + answers.length) % answers.length]);
      return { q, answers: rotated, correct: shift, why };
    }),
  };
}

function openPrebuiltTests() {
  exDialog(`<div class="tdlg-head"><h2>📚 Prebuilt tests</h2><button id="pbt-back">← Back</button></div>
    <p class="muted">Ready-made tests about the micro:bit. Pick one to see the questions, then use it as it is or change it first. It becomes one of your class quizzes, with its own quiz code, results and live games.</p>
    <div class="pbt-grid">${PREBUILT_TESTS.map((t) => `<button class="pbt-card" data-id="${t.id}">
        <span class="pbt-emoji">${t.emoji}</span><b>${esc(t.title)}</b>
        <span class="muted">${esc(t.blurb)}</span>
        <span class="pbt-meta"><span class="pbt-level pbt-${t.level.toLowerCase()}">${t.level}</span> ${t.questions.length} questions</span>
      </button>`).join('')}</div>`, () => {
    $('pbt-back').onclick = () => openQuizManager();
    exDlg.querySelectorAll('.pbt-card').forEach((b) => (b.onclick = () => previewPrebuilt(b.dataset.id)));
  });
}

function previewPrebuilt(id) {
  const t = PREBUILT_TESTS.find((x) => x.id === id), quiz = prebuiltQuiz(t);
  exDialog(`<div class="tdlg-head"><h2>${t.emoji} ${esc(t.title)}</h2><button id="pbt-back">← All tests</button></div>
    <p class="muted">${esc(t.blurb)} · ${t.level} · ${quiz.questions.length} questions. ✅ marks the right answer (kids won't see these marks).</p>
    <ol class="pbt-qs">${quiz.questions.map((q) => `<li><b>${esc(q.q)}</b>
        <ul>${q.answers.map((a, k) => `<li class="${k === q.correct ? 'pbt-right' : ''}">${k === q.correct ? '✅' : '◻️'} ${esc(a)}</li>`).join('')}</ul>
        <div class="muted">${esc(q.why)}</div></li>`).join('')}</ol>
    <div class="row"><button class="primary" id="pbt-use">✅ Use this test</button><button id="pbt-edit">✏️ Change it first</button></div>
    <p class="tdlg-err" id="pbt-err"></p>`, () => {
    $('pbt-back').onclick = openPrebuiltTests;
    $('pbt-edit').onclick = () => editQuiz(null, prebuiltQuiz(t));
    $('pbt-use').onclick = async () => {
      $('pbt-use').disabled = true;
      try {
        const j = await exApi('/quizzes', { method: 'POST', body: quiz });
        exDialog(`<h2>🎉 Quiz ready!</h2><p><b>${esc(t.title)}</b> is now one of your class quizzes. Kids type this <b>quiz code</b> in the 🏆 Quiz tab:</p><div class="ex-bigcode">${esc(j.code)}</div>
          <div class="row"><button class="primary" id="pbt-ok">Done</button></div>`, () => { $('pbt-ok').onclick = () => openQuizManager(); });
      } catch (e) { $('pbt-use').disabled = false; exErr('pbt-err', e.message); }
    };
  });
}
