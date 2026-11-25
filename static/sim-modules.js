/* Python sources for the simulated micro:bit, run by Skulpt (vendor/skulpt). They call into the
 * native `_sim` module that sim.js provides. Kept in their own file so they read as Python. */
'use strict';

const SIM_PY = {};

SIM_PY.microbit = String.raw`
import _sim

class Image:
    def __init__(self, *args):
        if len(args) == 0:
            self._w, self._h, self._p = 5, 5, [0] * 25
        elif len(args) == 1 and isinstance(args[0], str):
            rows = [r for r in args[0].replace('\n', ':').split(':') if r != '']
            self._h = len(rows)
            self._w = max([len(r) for r in rows]) if rows else 0
            self._p = []
            for r in rows:
                for x in range(self._w):
                    self._p.append(int(r[x]) if x < len(r) and r[x] in '0123456789' else 0)
        else:
            self._w, self._h = args[0], args[1]
            buf = args[2] if len(args) > 2 else None
            self._p = [min(9, max(0, int(buf[i]))) if buf else 0 for i in range(self._w * self._h)]

    def width(self):
        return self._w

    def height(self):
        return self._h

    def get_pixel(self, x, y):
        return self._p[y * self._w + x]

    def set_pixel(self, x, y, v):
        if not (0 <= x < self._w and 0 <= y < self._h):
            raise ValueError('index out of bounds')
        if not 0 <= v <= 9:
            raise ValueError('brightness out of bounds')
        self._p[y * self._w + x] = v

    def copy(self):
        i = Image(self._w, self._h)
        i._p = list(self._p)
        return i

    def invert(self):
        i = self.copy()
        i._p = [9 - v for v in self._p]
        return i

    def fill(self, v):
        self._p = [v] * (self._w * self._h)

    def _shift(self, dx, dy):
        i = Image(self._w, self._h)
        for y in range(self._h):
            for x in range(self._w):
                sx, sy = x + dx, y + dy
                if 0 <= sx < self._w and 0 <= sy < self._h:
                    i._p[y * self._w + x] = self._p[sy * self._w + sx]
        return i

    def shift_left(self, n):
        return self._shift(n, 0)

    def shift_right(self, n):
        return self._shift(-n, 0)

    def shift_up(self, n):
        return self._shift(0, n)

    def shift_down(self, n):
        return self._shift(0, -n)

    def crop(self, x, y, w, h):
        i = Image(w, h)
        for yy in range(h):
            for xx in range(w):
                if 0 <= x + xx < self._w and 0 <= y + yy < self._h:
                    i._p[yy * w + xx] = self._p[(y + yy) * self._w + x + xx]
        return i

    def __add__(self, other):
        i = self.copy()
        i._p = [min(9, a + b) for a, b in zip(self._p, other._p)]
        return i

    def __mul__(self, n):
        i = self.copy()
        i._p = [min(9, max(0, int(round(v * n)))) for v in self._p]
        return i

    def __repr__(self):
        rows = [''.join([str(self._p[y * self._w + x]) for x in range(self._w)]) for y in range(self._h)]
        return "Image('" + ':'.join(rows) + ":')"

    def __str__(self):
        return self.__repr__()

    def _five(self):
        out = [0] * 25
        for y in range(min(5, self._h)):
            for x in range(min(5, self._w)):
                out[y * 5 + x] = self._p[y * self._w + x]
        return out

_IMAGES = {
    'HEART': '09090:99999:99999:09990:00900', 'HEART_SMALL': '00000:09090:09990:00900:00000',
    'HAPPY': '00000:09090:00000:90009:09990', 'SMILE': '00000:00000:00000:90009:09990',
    'SAD': '00000:09090:00000:09990:90009', 'CONFUSED': '00000:09090:00000:09090:90909',
    'ANGRY': '90009:09090:00000:99999:90909', 'ASLEEP': '00000:99099:00000:09990:00000',
    'SURPRISED': '09090:00000:00900:09090:00900', 'SILLY': '90009:00000:99999:00909:00999',
    'FABULOUS': '99999:99099:00000:09090:09990', 'MEH': '09090:00000:00090:00900:09000',
    'YES': '00000:00009:00090:90900:09000', 'NO': '90009:09090:00900:09090:90009',
    'TRIANGLE': '00000:00900:09090:99999:00000', 'TRIANGLE_LEFT': '90000:99000:90900:90090:99999',
    'CHESSBOARD': '09090:90909:09090:90909:09090', 'DIAMOND': '00900:09090:90009:09090:00900',
    'DIAMOND_SMALL': '00000:00900:09090:00900:00000', 'SQUARE': '99999:90009:90009:90009:99999',
    'SQUARE_SMALL': '00000:09990:09090:09990:00000', 'RABBIT': '90900:90900:99990:99090:99990',
    'COW': '90009:90009:99999:09990:00900', 'MUSIC_CROTCHET': '00900:00900:00900:99900:99900',
    'MUSIC_QUAVER': '00900:00990:00909:99900:99900', 'MUSIC_QUAVERS': '09999:09009:09009:99099:99099',
    'PITCHFORK': '90909:90909:99999:00900:00900', 'XMAS': '00900:09990:00900:09990:99999',
    'PACMAN': '09999:99090:99900:99990:09999', 'TARGET': '00900:09990:99099:09990:00900',
    'TSHIRT': '99099:99999:09990:09990:09990', 'ROLLERSKATE': '00099:00099:99999:99999:09090',
    'DUCK': '09900:99900:09999:09990:00000', 'HOUSE': '00900:09990:99999:09990:09090',
    'TORTOISE': '00000:09990:99999:09090:00000', 'BUTTERFLY': '99099:99999:00900:99999:99099',
    'STICKFIGURE': '00900:99999:00900:09090:90009', 'GHOST': '99999:90909:99999:99999:90909',
    'SWORD': '00900:00900:00900:09990:00900', 'GIRAFFE': '99000:09000:09000:09990:09090',
    'SKULL': '09990:90909:99999:09990:09990', 'UMBRELLA': '09990:99999:00900:90900:09900',
    'SNAKE': '99000:99099:09090:09990:00000',
    'ARROW_N': '00900:09990:90909:00900:00900', 'ARROW_NE': '00999:00099:00909:09000:90000',
    'ARROW_E': '00900:00090:99999:00090:00900', 'ARROW_SE': '90000:09000:00909:00099:00999',
    'ARROW_S': '00900:00900:90909:09990:00900', 'ARROW_SW': '00009:00090:90900:99000:99900',
    'ARROW_W': '00900:09000:99999:09000:00900', 'ARROW_NW': '99900:99000:90900:00090:00009',
    'CLOCK12': '00900:00900:00900:00000:00000', 'CLOCK1': '00090:00090:00900:00000:00000',
    'CLOCK2': '00000:00099:00900:00000:00000', 'CLOCK3': '00000:00000:00999:00000:00000',
    'CLOCK4': '00000:00000:00900:00099:00000', 'CLOCK5': '00000:00000:00900:00090:00090',
    'CLOCK6': '00000:00000:00900:00900:00900', 'CLOCK7': '00000:00000:00900:09000:09000',
    'CLOCK8': '00000:00000:00900:99000:00000', 'CLOCK9': '00000:00000:99900:00000:00000',
    'CLOCK10': '00000:99000:00900:00000:00000', 'CLOCK11': '09000:09000:00900:00000:00000',
}
for _n in _IMAGES:
    setattr(Image, _n, Image(_IMAGES[_n]))
Image.ALL_CLOCKS = [getattr(Image, 'CLOCK' + str(i)) for i in [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]
Image.ALL_ARROWS = [getattr(Image, 'ARROW_' + d) for d in ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']]

class _Display:
    def show(self, value, delay=400, wait=True, loop=False, clear=False):
        if isinstance(value, Image):
            _sim.show_image(value._five())
            if clear:
                sleep(delay)
                _sim.clear()
        elif isinstance(value, (int, float)):
            _sim.show_text(str(value), delay, wait, loop, clear)
        elif isinstance(value, str):
            _sim.show_text(value, delay, wait, loop, clear)
        else:
            frames = [v._five() if isinstance(v, Image) else str(v) for v in value]
            _sim.show_frames(frames, delay, wait, loop, clear)

    def scroll(self, text, delay=150, wait=True, loop=False, monospace=False):
        _sim.scroll(str(text), delay, wait, loop)

    def clear(self):
        _sim.clear()

    def set_pixel(self, x, y, value):
        if not (0 <= x <= 4 and 0 <= y <= 4):
            raise ValueError('index out of range')
        if not (0 <= value <= 9):
            raise ValueError('brightness out of range')
        _sim.set_pixel(x, y, value)

    def get_pixel(self, x, y):
        if not (0 <= x <= 4 and 0 <= y <= 4):
            raise ValueError('index out of range')
        return _sim.get_pixel(x, y)

    def read_light_level(self):
        return _sim.light()

    def on(self):
        _sim.display_on(True)

    def off(self):
        _sim.display_on(False)

    def is_on(self):
        return _sim.display_is_on()

display = _Display()

class _Button:
    def __init__(self, name):
        self._n = name

    def is_pressed(self):
        return _sim.button(self._n, 'pressed')

    def was_pressed(self):
        return _sim.button(self._n, 'was')

    def get_presses(self):
        return _sim.button(self._n, 'presses')

button_a = _Button('a')
button_b = _Button('b')

class _Accelerometer:
    def get_x(self):
        return _sim.accel('x')

    def get_y(self):
        return _sim.accel('y')

    def get_z(self):
        return _sim.accel('z')

    def get_values(self):
        return (_sim.accel('x'), _sim.accel('y'), _sim.accel('z'))

    def current_gesture(self):
        return _sim.gesture()

    def is_gesture(self, name):
        return _sim.gesture() == name

    def was_gesture(self, name):
        return _sim.was_gesture(name)

    def get_gestures(self):
        return tuple(_sim.gestures())

accelerometer = _Accelerometer()

class _Compass:
    def calibrate(self):
        _sim.calibrate()

    def is_calibrated(self):
        return _sim.calibrated()

    def clear_calibration(self):
        _sim.clear_calibration()

    def heading(self):
        if not _sim.calibrated():
            _sim.calibrate()
        return _sim.heading()

    def get_x(self):
        return _sim.field('x')

    def get_y(self):
        return _sim.field('y')

    def get_z(self):
        return _sim.field('z')

    def get_field_strength(self):
        return _sim.field('strength')

compass = _Compass()

class MicroBitPin:
    def __init__(self, n):
        self._n = n

    def read_digital(self):
        return _sim.pin_read_digital(self._n)

    def write_digital(self, value):
        _sim.pin_write_digital(self._n, 1 if value else 0)

    def read_analog(self):
        return _sim.pin_read_analog(self._n)

    def write_analog(self, value):
        _sim.pin_write_analog(self._n, int(value))

    def set_analog_period(self, period):
        pass

    def set_analog_period_microseconds(self, period):
        pass

    def is_touched(self):
        return _sim.pin_touched(self._n)

    def set_pull(self, value):
        pass

    PULL_UP = 1
    PULL_DOWN = 2
    NO_PULL = 0

pin0 = MicroBitPin(0)
pin1 = MicroBitPin(1)
pin2 = MicroBitPin(2)
pin3 = MicroBitPin(3)
pin4 = MicroBitPin(4)
pin5 = MicroBitPin(5)
pin6 = MicroBitPin(6)
pin7 = MicroBitPin(7)
pin8 = MicroBitPin(8)
pin9 = MicroBitPin(9)
pin10 = MicroBitPin(10)
pin11 = MicroBitPin(11)
pin12 = MicroBitPin(12)
pin13 = MicroBitPin(13)
pin14 = MicroBitPin(14)
pin15 = MicroBitPin(15)
pin16 = MicroBitPin(16)
pin19 = MicroBitPin(19)
pin20 = MicroBitPin(20)

def sleep(ms):
    _sim.sleep(ms)

def running_time():
    return _sim.running_time()

def temperature():
    return _sim.temperature()

def panic(n=0):
    _sim.panic(n)

def reset():
    _sim.reset()

def scale(value, from_, to):
    return to[0] + (value - from_[0]) * (to[1] - to[0]) / (from_[1] - from_[0])
`;

SIM_PY.music = String.raw`
import _sim

DADADADUM = ['r4:2', 'g', 'g', 'g', 'eb:8', 'r:2', 'f', 'f', 'f', 'd:8']
ENTERTAINER = ['d4:1', 'd#', 'e', 'c5:2', 'e4:1', 'c5:2', 'e4:1', 'c5:3', 'c:1', 'd', 'd#', 'e', 'c', 'd', 'e:2', 'b4:1', 'd5:2', 'c:4']
PRELUDE = ['c4:1', 'e', 'g', 'c5', 'e', 'g4', 'c5', 'e', 'c4', 'e', 'g', 'c5', 'e', 'g4', 'c5', 'e', 'c4', 'd', 'a', 'd5', 'f', 'a4', 'd5', 'f']
ODE = ['e4', 'e', 'f', 'g', 'g', 'f', 'e', 'd', 'c', 'c', 'd', 'e', 'e:6', 'd:2', 'd:8']
NYAN = ['f#5:2', 'g#', 'c#:1', 'd#:2', 'b4:1', 'd5:1', 'c#', 'b4:2', 'b', 'c#5', 'd', 'd:1', 'c#', 'b4:1', 'c#5:1', 'd#', 'f#', 'g#', 'd#', 'f#', 'c#', 'd', 'b4', 'c#5', 'b4']
RINGTONE = ['c4:1', 'd', 'e:2', 'g', 'd:1', 'e', 'f:2', 'a', 'e:1', 'f', 'g:2', 'b', 'c5:4']
FUNK = ['c2:2', 'c', 'd#', 'c:1', 'f:2', 'c:1', 'f:2', 'f#', 'g', 'c', 'c', 'g', 'c:1', 'f#:2', 'c:1', 'f#:2', 'f', 'd#']
BLUES = ['c2:2', 'e', 'g', 'a', 'a#', 'a', 'g', 'e', 'c2:2', 'e', 'g', 'a', 'a#', 'a', 'g', 'e', 'f', 'a', 'c3', 'd', 'd#', 'd', 'c', 'a2', 'c2:2', 'e', 'g', 'a', 'a#', 'a', 'g', 'e', 'g', 'b', 'd3', 'f', 'f2', 'a', 'c3', 'd#', 'c2:2', 'e', 'g', 'e', 'g', 'f', 'e', 'd']
BIRTHDAY = ['c4:3', 'c:1', 'd:4', 'c:4', 'f', 'e:8', 'c:3', 'c:1', 'd:4', 'c:4', 'g', 'f:8', 'c:3', 'c:1', 'c5:4', 'a4', 'f', 'e', 'd', 'a#:3', 'a#:1', 'a:4', 'f', 'g', 'f:8']
WEDDING = ['c4:4', 'f:3', 'f:1', 'f:8', 'c:4', 'g:3', 'e:1', 'f:8', 'c:4', 'f:3', 'a:1', 'c5:4', 'a4:3', 'f:1', 'f:4', 'e:3', 'f:1', 'g:8']
FUNERAL = ['c3:4', 'c:3', 'c:1', 'c:4', 'd#:3', 'd:1', 'd:3', 'c:1', 'c:3', 'b2:1', 'c3:4']
PUNCHLINE = ['c4:3', 'g3:1', 'f#', 'g', 'g#:3', 'g', 'r', 'b', 'c4']
PYTHON = ['d5:1', 'b4', 'r', 'b', 'b', 'a#', 'b', 'g5', 'r', 'd', 'd', 'r', 'b4', 'c5', 'r', 'c', 'c', 'r', 'd', 'e:5', 'c:1', 'a4', 'r', 'a', 'a', 'g#', 'a', 'f#5', 'r', 'e', 'e', 'r', 'c', 'b4:4', 'b', 'b', 'c5', 'd', 'd', 'r', 'b4', 'g:4']
BADDY = ['c3:3', 'r', 'd:2', 'd#', 'r', 'c', 'r', 'f#:8']
CHASE = ['a4:1', 'b', 'c5', 'b4', 'a:2', 'r', 'a:1', 'b', 'c5', 'b4', 'a:2', 'r', 'a:2', 'e5', 'd#', 'e', 'f', 'e', 'd#', 'e', 'b4:1', 'c5', 'd', 'c', 'b4:2', 'r', 'b:1', 'c5', 'd', 'c', 'b4:2', 'r', 'b:2', 'e5', 'd#', 'e', 'f', 'e', 'd#', 'e']
BA_DING = ['b5:1', 'e6:3']
WAWAWAWAA = ['e3:3', 'r:1', 'd#:3', 'r:1', 'd:4', 'r:1', 'c#:8']
JUMP_UP = ['c5:1', 'd', 'e', 'f', 'g']
JUMP_DOWN = ['g5:1', 'f', 'e', 'd', 'c']
POWER_UP = ['g4:1', 'c5', 'e', 'g:2', 'e:1', 'g:3']
POWER_DOWN = ['g5:1', 'd#', 'c', 'g4:2', 'b:1', 'c5:3']

def play(music, pin=None, wait=True, loop=False):
    if isinstance(music, str):
        music = [music]
    _sim.music_play(list(music), wait, loop)

def pitch(frequency, duration=-1, pin=None, wait=True):
    _sim.music_pitch(int(frequency), int(duration), wait)

def stop(pin=None):
    _sim.music_stop()

def set_tempo(ticks=4, bpm=120):
    _sim.music_tempo(ticks, bpm)

def get_tempo():
    return tuple(_sim.music_get_tempo())

def reset():
    _sim.music_tempo(4, 120)
`;

SIM_PY.radio = String.raw`
import _sim

RATE_1MBIT = 0
RATE_2MBIT = 1

def on():
    _sim.radio_on(True)

def off():
    _sim.radio_on(False)

def config(**kwargs):
    if 'group' in kwargs:
        _sim.radio_group(kwargs['group'])

def reset():
    _sim.radio_group(0)

def send(message):
    _sim.radio_send(str(message))

def receive():
    return _sim.radio_receive()

def send_bytes(message):
    _sim.radio_send(str(message))

def receive_bytes():
    m = _sim.radio_receive()
    return None if m is None else m
`;

SIM_PY.machine = String.raw`
import _sim

def freq():
    return 16000000

def unique_id():
    return 'microbit-sim'

def reset():
    _sim.reset()

def time_pulse_us(pin, level, timeout_us=1000000):
    return -1
`;

SIM_PY.gc = String.raw`
import _sim

def collect():
    pass

def mem_free():
    return _sim.mem_free()

def mem_alloc():
    return 16384 - _sim.mem_free()

def enable():
    pass

def disable():
    pass
`;

SIM_PY.os = String.raw`
import _sim

class _Uname:
    sysname = 'microbit'
    nodename = 'microbit'
    release = '1.1.1'
    version = 'micro:bit v1.1.1 (simulator); MicroPython v1.9.2'
    machine = 'micro:bit simulator'

def uname():
    return _Uname()

def listdir():
    return _sim.fs_list()

def remove(name):
    _sim.fs_remove(name)

def size(name):
    return _sim.fs_size(name)
`;

// open() for the simulated file system (text and simple bytes), used by programs and the REPL.
SIM_PY._simfs = String.raw`
import _sim

class _File:
    def __init__(self, name, mode):
        self._name, self._mode = name, mode
        if 'w' in mode:
            self._data = ''
            _sim.fs_write(name, '')
        else:
            d = _sim.fs_read(name)
            if d is None:
                raise OSError('ENOENT: no such file ' + name)
            self._data = d
        self._pos = 0

    def read(self, n=-1):
        if n is None or n < 0:
            out = self._data[self._pos:]
        else:
            out = self._data[self._pos:self._pos + n]
        self._pos += len(out)
        return out

    def readline(self):
        i = self._data.find('\n', self._pos)
        end = len(self._data) if i < 0 else i + 1
        out = self._data[self._pos:end]
        self._pos = end
        return out

    def write(self, s):
        self._data += str(s)
        _sim.fs_write(self._name, self._data)
        return len(str(s))

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()

def open(name, mode='r'):
    return _File(name, mode)
`;
