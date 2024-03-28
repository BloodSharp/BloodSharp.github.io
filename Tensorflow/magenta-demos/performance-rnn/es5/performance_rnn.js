"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var tf = require("@tensorflow/tfjs-core");
var keyboard_element_1 = require("./keyboard_element");
var Piano = require('tone-piano').Piano;
var lstmKernel1;
var lstmBias1;
var lstmKernel2;
var lstmBias2;
var lstmKernel3;
var lstmBias3;
var c;
var h;
var fcB;
var fcW;
var forgetBias = tf.scalar(1.0);
var activeNotes = new Map();
var STEPS_PER_GENERATE_CALL = 10;
var GENERATION_BUFFER_SECONDS = .5;
var MAX_GENERATION_LAG_SECONDS = 1;
var MAX_NOTE_DURATION_SECONDS = 3;
var NOTES_PER_OCTAVE = 12;
var DENSITY_BIN_RANGES = [1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0];
var PITCH_HISTOGRAM_SIZE = NOTES_PER_OCTAVE;
var RESET_RNN_FREQUENCY_MS = 30000;
var pitchHistogramEncoding;
var noteDensityEncoding;
var conditioned = false;
var currentPianoTimeSec = 0;
var pianoStartTimestampMs = 0;
var currentVelocity = 100;
var MIN_MIDI_PITCH = 0;
var MAX_MIDI_PITCH = 127;
var VELOCITY_BINS = 32;
var MAX_SHIFT_STEPS = 100;
var STEPS_PER_SECOND = 100;
var MIDI_EVENT_ON = 0x90;
var MIDI_EVENT_OFF = 0x80;
var MIDI_NO_OUTPUT_DEVICES_FOUND_MESSAGE = 'No midi output devices found.';
var MIDI_NO_INPUT_DEVICES_FOUND_MESSAGE = 'No midi input devices found.';
var MID_IN_CHORD_RESET_THRESHOLD_MS = 1000;
var currentLoopId = 0;
var EVENT_RANGES = [
    ['note_on', MIN_MIDI_PITCH, MAX_MIDI_PITCH],
    ['note_off', MIN_MIDI_PITCH, MAX_MIDI_PITCH],
    ['time_shift', 1, MAX_SHIFT_STEPS],
    ['velocity_change', 1, VELOCITY_BINS],
];
function calculateEventSize() {
    var eventOffset = 0;
    for (var _i = 0, EVENT_RANGES_1 = EVENT_RANGES; _i < EVENT_RANGES_1.length; _i++) {
        var eventRange = EVENT_RANGES_1[_i];
        var minValue = eventRange[1];
        var maxValue = eventRange[2];
        eventOffset += maxValue - minValue + 1;
    }
    return eventOffset;
}
var EVENT_SIZE = calculateEventSize();
var PRIMER_IDX = 355;
var lastSample = tf.scalar(PRIMER_IDX, 'int32');
var container = document.querySelector('#keyboard');
var keyboardInterface = new keyboard_element_1.KeyboardElement(container);
var piano = new Piano({ velocities: 4 }).toMaster();
var SALAMANDER_URL = 'https://storage.googleapis.com/' +
    'download.magenta.tensorflow.org/demos/SalamanderPiano/';
var CHECKPOINT_URL = 'https://storage.googleapis.com/' +
    'download.magenta.tensorflow.org/models/performance_rnn/tfjs';
var isDeviceSupported = tf.ENV.get('WEBGL_VERSION') >= 1;
if (!isDeviceSupported) {
    document.querySelector('#status').innerHTML =
        'We do not yet support your device. Please try on a desktop ' +
            'computer with Chrome/Firefox, or an Android phone with WebGL support.';
}
else {
    start();
}
var modelReady = false;
function start() {
    piano.load(SALAMANDER_URL)
        .then(function () {
        return fetch(CHECKPOINT_URL + "/weights_manifest.json")
            .then(function (response) { return response.json(); })
            .then(function (manifest) {
            return tf.loadWeights(manifest, CHECKPOINT_URL);
        });
    })
        .then(function (vars) {
        document.querySelector('#status').classList.add('hidden');
        document.querySelector('#controls').classList.remove('hidden');
        document.querySelector('#keyboard').classList.remove('hidden');
        lstmKernel1 =
            vars['rnn/multi_rnn_cell/cell_0/basic_lstm_cell/kernel'];
        lstmBias1 = vars['rnn/multi_rnn_cell/cell_0/basic_lstm_cell/bias'];
        lstmKernel2 =
            vars['rnn/multi_rnn_cell/cell_1/basic_lstm_cell/kernel'];
        lstmBias2 = vars['rnn/multi_rnn_cell/cell_1/basic_lstm_cell/bias'];
        lstmKernel3 =
            vars['rnn/multi_rnn_cell/cell_2/basic_lstm_cell/kernel'];
        lstmBias3 = vars['rnn/multi_rnn_cell/cell_2/basic_lstm_cell/bias'];
        fcB = vars['fully_connected/biases'];
        fcW = vars['fully_connected/weights'];
        modelReady = true;
        resetRnn();
    });
}
function resetRnn() {
    c = [
        tf.zeros([1, lstmBias1.shape[0] / 4]),
        tf.zeros([1, lstmBias2.shape[0] / 4]),
        tf.zeros([1, lstmBias3.shape[0] / 4]),
    ];
    h = [
        tf.zeros([1, lstmBias1.shape[0] / 4]),
        tf.zeros([1, lstmBias2.shape[0] / 4]),
        tf.zeros([1, lstmBias3.shape[0] / 4]),
    ];
    if (lastSample != null) {
        lastSample.dispose();
    }
    lastSample = tf.scalar(PRIMER_IDX, 'int32');
    currentPianoTimeSec = piano.now();
    pianoStartTimestampMs = performance.now() - currentPianoTimeSec * 1000;
    currentLoopId++;
    generateStep(currentLoopId);
}
window.addEventListener('resize', resize);
function resize() {
    keyboardInterface.resize();
}
resize();
var densityControl = document.getElementById('note-density');
var densityDisplay = document.getElementById('note-density-display');
var conditioningOffElem = document.getElementById('conditioning-off');
conditioningOffElem.onchange = disableConditioning;
var conditioningOnElem = document.getElementById('conditioning-on');
conditioningOnElem.onchange = enableConditioning;
setTimeout(function () { return disableConditioning(); });
var conditioningControlsElem = document.getElementById('conditioning-controls');
var gainSliderElement = document.getElementById('gain');
var gainDisplayElement = document.getElementById('gain-display');
var globalGain = +gainSliderElement.value;
gainDisplayElement.innerText = globalGain.toString();
gainSliderElement.addEventListener('input', function () {
    globalGain = +gainSliderElement.value;
    gainDisplayElement.innerText = globalGain.toString();
});
var notes = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b'];
var pitchHistogramElements = notes.map(function (note) { return document.getElementById('pitch-' + note); });
var histogramDisplayElements = notes.map(function (note) { return document.getElementById('hist-' + note); });
var preset1 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
var preset2 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
try {
    parseHash();
}
catch (e) {
    console.warn(e);
}
function parseHash() {
    if (!window.location.hash) {
        return;
    }
    var params = window.location.hash.substr(1).split('|');
    densityControl.value = params[0];
    var pitches = params[1].split(',');
    for (var i = 0; i < pitchHistogramElements.length; i++) {
        pitchHistogramElements[i].value = pitches[i];
    }
    var preset1Values = params[2].split(',');
    for (var i = 0; i < preset1.length; i++) {
        preset1[i] = parseInt(preset1Values[i], 10);
    }
    var preset2Values = params[3].split(',');
    for (var i = 0; i < preset2.length; i++) {
        preset2[i] = parseInt(preset2Values[i], 10);
    }
    if (params[4] === 'true') {
        enableConditioning();
    }
    else if (params[4] === 'false') {
        disableConditioning();
    }
}
function enableConditioning() {
    conditioned = true;
    conditioningOffElem.checked = false;
    conditioningOnElem.checked = true;
    conditioningControlsElem.classList.remove('inactive');
    conditioningControlsElem.classList.remove('midicondition');
    updateConditioningParams();
}
function disableConditioning() {
    conditioned = false;
    conditioningOffElem.checked = true;
    conditioningOnElem.checked = false;
    conditioningControlsElem.classList.add('inactive');
    conditioningControlsElem.classList.remove('midicondition');
    updateConditioningParams();
}
function updateConditioningParams() {
    var pitchHistogram = pitchHistogramElements.map(function (e) {
        return parseInt(e.value, 10) || 0;
    });
    updateDisplayHistogram(pitchHistogram);
    if (noteDensityEncoding != null) {
        noteDensityEncoding.dispose();
        noteDensityEncoding = null;
    }
    window.location.assign('#' + densityControl.value + '|' + pitchHistogram.join(',') + '|' +
        preset1.join(',') + '|' + preset2.join(',') + '|' +
        (conditioned ? 'true' : 'false'));
    var noteDensityIdx = parseInt(densityControl.value, 10) || 0;
    var noteDensity = DENSITY_BIN_RANGES[noteDensityIdx];
    densityDisplay.innerHTML = noteDensity.toString();
    noteDensityEncoding =
        tf.oneHot(tf.tensor1d([noteDensityIdx + 1], 'int32'), DENSITY_BIN_RANGES.length + 1).as1D();
    if (pitchHistogramEncoding != null) {
        pitchHistogramEncoding.dispose();
        pitchHistogramEncoding = null;
    }
    var buffer = tf.buffer([PITCH_HISTOGRAM_SIZE], 'float32');
    var pitchHistogramTotal = pitchHistogram.reduce(function (prev, val) {
        return prev + val;
    });
    for (var i = 0; i < PITCH_HISTOGRAM_SIZE; i++) {
        buffer.set(pitchHistogram[i] / pitchHistogramTotal, i);
    }
    pitchHistogramEncoding = buffer.toTensor();
}
document.getElementById('note-density').oninput = updateConditioningParams;
pitchHistogramElements.forEach(function (e) {
    e.oninput = updateConditioningParams;
});
updateConditioningParams();
function updatePitchHistogram(newHist) {
    var allZero = true;
    for (var i = 0; i < newHist.length; i++) {
        allZero = allZero && newHist[i] === 0;
    }
    if (allZero) {
        newHist = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    for (var i = 0; i < newHist.length; i++) {
        pitchHistogramElements[i].value = newHist[i].toString();
    }
    updateConditioningParams();
}
function updateDisplayHistogram(hist) {
    var sum = 0;
    for (var i = 0; i < hist.length; i++) {
        sum += hist[i];
    }
    for (var i = 0; i < hist.length; i++) {
        histogramDisplayElements[i].style.height =
            (100 * (hist[i] / sum)).toString() + 'px';
    }
}
document.getElementById('c-major').onclick = function () {
    updatePitchHistogram([2, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]);
};
document.getElementById('f-major').onclick = function () {
    updatePitchHistogram([1, 0, 1, 0, 1, 2, 0, 1, 0, 1, 1, 0]);
};
document.getElementById('d-minor').onclick = function () {
    updatePitchHistogram([1, 0, 2, 0, 1, 1, 0, 1, 0, 1, 1, 0]);
};
document.getElementById('whole-tone').onclick = function () {
    updatePitchHistogram([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
};
document.getElementById('pentatonic').onclick = function () {
    updatePitchHistogram([0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]);
};
document.getElementById('reset-rnn').onclick = function () {
    resetRnn();
};
document.getElementById('preset-1').onclick = function () {
    updatePitchHistogram(preset1);
};
document.getElementById('preset-2').onclick = function () {
    updatePitchHistogram(preset2);
};
document.getElementById('save-1').onclick = function () {
    preset1 = pitchHistogramElements.map(function (e) {
        return parseInt(e.value, 10) || 0;
    });
    updateConditioningParams();
};
document.getElementById('save-2').onclick = function () {
    preset2 = pitchHistogramElements.map(function (e) {
        return parseInt(e.value, 10) || 0;
    });
    updateConditioningParams();
};
function getConditioning() {
    return tf.tidy(function () {
        if (!conditioned) {
            var size = 1 + noteDensityEncoding.shape[0] +
                pitchHistogramEncoding.shape[0];
            var conditioning = tf.oneHot(tf.tensor1d([0], 'int32'), size).as1D();
            return conditioning;
        }
        else {
            var axis = 0;
            var conditioningValues = noteDensityEncoding.concat(pitchHistogramEncoding, axis);
            return tf.tensor1d([0], 'int32').concat(conditioningValues, axis);
        }
    });
}
function generateStep(loopId) {
    return __awaiter(this, void 0, void 0, function () {
        var lstm1, lstm2, lstm3, outputs, i, delta, _a;
        return __generator(this, function (_b) {
            if (loopId < currentLoopId) {
                return [2];
            }
            lstm1 = function (data, c, h) {
                return tf.basicLSTMCell(forgetBias, lstmKernel1, lstmBias1, data, c, h);
            };
            lstm2 = function (data, c, h) {
                return tf.basicLSTMCell(forgetBias, lstmKernel2, lstmBias2, data, c, h);
            };
            lstm3 = function (data, c, h) {
                return tf.basicLSTMCell(forgetBias, lstmKernel3, lstmBias3, data, c, h);
            };
            outputs = [];
            _a = tf.tidy(function () {
                var innerOuts = [];
                for (var i = 0; i < STEPS_PER_GENERATE_CALL; i++) {
                    var eventInput = tf.oneHot(lastSample.as1D(), EVENT_SIZE).as1D();
                    if (i === 0) {
                        lastSample.dispose();
                    }
                    var conditioning = getConditioning();
                    var axis = 0;
                    var input = conditioning.concat(eventInput, axis).toFloat();
                    var output = tf.multiRNNCell([lstm1, lstm2, lstm3], input.as2D(1, -1), c, h);
                    c.forEach(function (c) { return c.dispose(); });
                    h.forEach(function (h) { return h.dispose(); });
                    c = output[0];
                    h = output[1];
                    var outputH = h[2];
                    var logits = outputH.matMul(fcW).add(fcB);
                    var sampledOutput = tf.multinomial(logits.as1D(), 1).asScalar();
                    innerOuts.push(sampledOutput);
                    lastSample = sampledOutput;
                }
                return [c, h, innerOuts];
            }), c = _a[0], h = _a[1], outputs = _a[2];
            for (i = 0; i < outputs.length; i++) {
                playOutput(outputs[i].dataSync()[0]);
            }
            if (piano.now() - currentPianoTimeSec > MAX_GENERATION_LAG_SECONDS) {
                console.warn("Generation is " + (piano.now() - currentPianoTimeSec) + " seconds behind, " +
                    ("which is over " + MAX_NOTE_DURATION_SECONDS + ". Resetting time!"));
                currentPianoTimeSec = piano.now();
            }
            delta = Math.max(0, currentPianoTimeSec - piano.now() - GENERATION_BUFFER_SECONDS);
            setTimeout(function () { return generateStep(loopId); }, delta * 1000);
            return [2];
        });
    });
}
var midi;
var activeMidiOutputDevice = null;
var activeMidiInputDevice = null;
(function () { return __awaiter(_this, void 0, void 0, function () {
    var midiOutDropdownContainer, midiInDropdownContainer, navigator_1, midiOutDropdown_1, midiInDropdown_1, outputDeviceCount_1, midiOutputDevices_1, inputDeviceCount_1, midiInputDevices_1, setActiveMidiInputDevice_1, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                midiOutDropdownContainer = document.getElementById('midi-out-container');
                midiInDropdownContainer = document.getElementById('midi-in-container');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                navigator_1 = window.navigator;
                return [4, navigator_1.requestMIDIAccess()];
            case 2:
                midi = _a.sent();
                midiOutDropdown_1 = document.getElementById('midi-out');
                midiInDropdown_1 = document.getElementById('midi-in');
                outputDeviceCount_1 = 0;
                midiOutputDevices_1 = [];
                midi.outputs.forEach(function (output) {
                    console.log("\n          Output midi device [type: '" + output.type + "']\n          id: " + output.id + "\n          manufacturer: " + output.manufacturer + "\n          name:" + output.name + "\n          version: " + output.version);
                    midiOutputDevices_1.push(output);
                    var option = document.createElement('option');
                    option.innerText = output.name;
                    midiOutDropdown_1.appendChild(option);
                    outputDeviceCount_1++;
                });
                midiOutDropdown_1.addEventListener('change', function () {
                    activeMidiOutputDevice =
                        midiOutputDevices_1[midiOutDropdown_1.selectedIndex - 1];
                });
                if (outputDeviceCount_1 === 0) {
                    midiOutDropdownContainer.innerText = MIDI_NO_OUTPUT_DEVICES_FOUND_MESSAGE;
                }
                inputDeviceCount_1 = 0;
                midiInputDevices_1 = [];
                midi.inputs.forEach(function (input) {
                    console.log("\n        Input midi device [type: '" + input.type + "']\n        id: " + input.id + "\n        manufacturer: " + input.manufacturer + "\n        name:" + input.name + "\n        version: " + input.version);
                    midiInputDevices_1.push(input);
                    var option = document.createElement('option');
                    option.innerText = input.name;
                    midiInDropdown_1.appendChild(option);
                    inputDeviceCount_1++;
                });
                setActiveMidiInputDevice_1 = function (device) {
                    if (activeMidiInputDevice != null) {
                        activeMidiInputDevice.onmidimessage = function () { };
                    }
                    activeMidiInputDevice = device;
                    device.onmidimessage = function (event) {
                        var data = event.data;
                        var type = data[0] & 0xf0;
                        var note = data[1];
                        var velocity = data[2];
                        if (type === 144) {
                            midiInNoteOn(note, velocity);
                        }
                    };
                };
                midiInDropdown_1.addEventListener('change', function () {
                    setActiveMidiInputDevice_1(midiInputDevices_1[midiInDropdown_1.selectedIndex - 1]);
                });
                if (inputDeviceCount_1 === 0) {
                    midiInDropdownContainer.innerText = MIDI_NO_INPUT_DEVICES_FOUND_MESSAGE;
                }
                return [3, 4];
            case 3:
                e_1 = _a.sent();
                midiOutDropdownContainer.innerText = MIDI_NO_OUTPUT_DEVICES_FOUND_MESSAGE;
                midi = null;
                return [3, 4];
            case 4: return [2];
        }
    });
}); })();
var CONDITIONING_OFF_TIME_MS = 30000;
var lastNotePressedTime = performance.now();
var midiInPitchHistogram = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function midiInNoteOn(midiNote, velocity) {
    var now = performance.now();
    if (now - lastNotePressedTime > MID_IN_CHORD_RESET_THRESHOLD_MS) {
        midiInPitchHistogram = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        resetRnn();
    }
    lastNotePressedTime = now;
    if (!conditioned) {
        resetRnn();
        enableConditioning();
    }
    setTimeout(function () {
        if (performance.now() - lastNotePressedTime > CONDITIONING_OFF_TIME_MS) {
            disableConditioning();
            resetRnn();
        }
    }, CONDITIONING_OFF_TIME_MS);
    var note = midiNote % 12;
    midiInPitchHistogram[note]++;
    updateMidiInConditioning();
}
function updateMidiInConditioning() {
    updatePitchHistogram(midiInPitchHistogram);
}
function playOutput(index) {
    var offset = 0;
    var _loop_1 = function (eventRange) {
        var eventType = eventRange[0];
        var minValue = eventRange[1];
        var maxValue = eventRange[2];
        if (offset <= index && index <= offset + maxValue - minValue) {
            if (eventType === 'note_on') {
                var noteNum_1 = index - offset;
                setTimeout(function () {
                    keyboardInterface.keyDown(noteNum_1);
                    setTimeout(function () {
                        keyboardInterface.keyUp(noteNum_1);
                    }, 100);
                }, (currentPianoTimeSec - piano.now()) * 1000);
                activeNotes.set(noteNum_1, currentPianoTimeSec);
                if (activeMidiOutputDevice != null) {
                    try {
                        activeMidiOutputDevice.send([
                            MIDI_EVENT_ON, noteNum_1,
                            Math.min(Math.floor(currentVelocity * globalGain), 127)
                        ], Math.floor(1000 * currentPianoTimeSec) - pianoStartTimestampMs);
                    }
                    catch (e) {
                        console.log('Error sending midi note on event to midi output device:');
                        console.log(e);
                    }
                }
                return { value: piano.keyDown(noteNum_1, currentPianoTimeSec, currentVelocity * globalGain / 100) };
            }
            else if (eventType === 'note_off') {
                var noteNum = index - offset;
                var activeNoteEndTimeSec = activeNotes.get(noteNum);
                if (activeNoteEndTimeSec == null) {
                    return { value: void 0 };
                }
                var timeSec = Math.max(currentPianoTimeSec, activeNoteEndTimeSec + .5);
                if (activeMidiOutputDevice != null) {
                    activeMidiOutputDevice.send([
                        MIDI_EVENT_OFF, noteNum,
                        Math.min(Math.floor(currentVelocity * globalGain), 127)
                    ], Math.floor(timeSec * 1000) - pianoStartTimestampMs);
                }
                piano.keyUp(noteNum, timeSec);
                activeNotes.delete(noteNum);
                return { value: void 0 };
            }
            else if (eventType === 'time_shift') {
                currentPianoTimeSec += (index - offset + 1) / STEPS_PER_SECOND;
                activeNotes.forEach(function (timeSec, noteNum) {
                    if (currentPianoTimeSec - timeSec > MAX_NOTE_DURATION_SECONDS) {
                        console.info("Note " + noteNum + " has been active for " + (currentPianoTimeSec - timeSec) + ", " +
                            ("seconds which is over " + MAX_NOTE_DURATION_SECONDS + ", will ") +
                            "release.");
                        if (activeMidiOutputDevice != null) {
                            activeMidiOutputDevice.send([
                                MIDI_EVENT_OFF, noteNum,
                                Math.min(Math.floor(currentVelocity * globalGain), 127)
                            ]);
                        }
                        piano.keyUp(noteNum, currentPianoTimeSec);
                        activeNotes.delete(noteNum);
                    }
                });
                return { value: currentPianoTimeSec };
            }
            else if (eventType === 'velocity_change') {
                currentVelocity = (index - offset + 1) * Math.ceil(127 / VELOCITY_BINS);
                currentVelocity = currentVelocity / 127;
                return { value: currentVelocity };
            }
            else {
                throw new Error('Could not decode eventType: ' + eventType);
            }
        }
        offset += maxValue - minValue + 1;
    };
    for (var _i = 0, EVENT_RANGES_2 = EVENT_RANGES; _i < EVENT_RANGES_2.length; _i++) {
        var eventRange = EVENT_RANGES_2[_i];
        var state_1 = _loop_1(eventRange);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    throw new Error("Could not decode index: " + index);
}
var resettingText = document.getElementById('resettingText');
function resetRnnRepeatedly() {
    if (modelReady) {
        resetRnn();
        resettingText.style.opacity = '100';
    }
    setTimeout(function () {
        resettingText.style.opacity = '0';
    }, 1000);
    setTimeout(resetRnnRepeatedly, RESET_RNN_FREQUENCY_MS);
}
setTimeout(resetRnnRepeatedly, RESET_RNN_FREQUENCY_MS);
