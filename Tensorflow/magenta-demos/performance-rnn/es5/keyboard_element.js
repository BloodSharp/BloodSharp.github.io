"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var offsets = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
var minNote = 21;
var maxNote = 108;
var KeyboardElement = (function () {
    function KeyboardElement(container) {
        this.container = container;
        this.keys = {};
        this.resize();
        this.notes = {};
    }
    KeyboardElement.prototype.resize = function () {
        this.keys = {};
        this.container.innerHTML = '';
        var keyWidth = 1 / 52;
        for (var i = minNote; i <= maxNote; i++) {
            var key = document.createElement('div');
            key.classList.add('key');
            var isSharp = ([1, 3, 6, 8, 10].indexOf(i % 12) !== -1);
            key.classList.add(isSharp ? 'black' : 'white');
            this.container.appendChild(key);
            var noteOctave = Math.floor(i / 12) - Math.floor(minNote / 12);
            var offset = offsets[i % 12] + noteOctave * 7 - 5;
            key.style.width = keyWidth * 100 + "%";
            key.style.left = offset * keyWidth * 100 + "%";
            key.id = i.toString();
            var fill = document.createElement('div');
            fill.classList.add('fill');
            key.appendChild(fill);
            this.keys[i] = key;
        }
    };
    KeyboardElement.prototype.keyDown = function (noteNum) {
        if (noteNum in this.keys) {
            var key = this.keys[noteNum];
            var note = new Note(key.querySelector('.fill'));
            if (!this.notes[noteNum]) {
                this.notes[noteNum] = [];
            }
            this.notes[noteNum].push(note);
        }
    };
    KeyboardElement.prototype.keyUp = function (noteNum) {
        if (noteNum in this.keys) {
            if (!(this.notes[noteNum] && this.notes[noteNum].length)) {
                console.warn('note off before note on');
            }
            else {
                this.notes[noteNum].shift().noteOff();
            }
        }
    };
    return KeyboardElement;
}());
exports.KeyboardElement = KeyboardElement;
var Note = (function () {
    function Note(element) {
        this.element = element;
        this.element.classList.add('active');
    }
    Note.prototype.noteOff = function () {
        this.element.classList.remove('active');
    };
    return Note;
}());
