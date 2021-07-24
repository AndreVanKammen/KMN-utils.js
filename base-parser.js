// Copyright by André van Kammen
// Licensed under CC BY-NC-SA 
// https://creativecommons.org/licenses/by-nc-sa/4.0/
const defaultOptions = {
  whiteSpacePerLine: false,
};
const CRLFregEx = new RegExp('\r\n', 'g');

export class BaseParser {
  constructor(options) {
    this.options = { ...defaultOptions, ...options };
    this.str = '';
    this.pos = 0;
    this.lineCount = 0;
  }

  setSource(str) {
    str = str.replace(CRLFregEx, '\n');
    this.str = str;
    this.pos = 0;
    this.lineCount = 0;
  }

  skipCharCode(charCode) {
    if (this.str.charCodeAt(this.pos) === charCode) {
      this.pos++;
    }
  }

  collectUntil(endCharCode) {
    let s = this.str;
    let start, p = (start = this.pos);
    let c;
    // TODO: Options for skipping escaped chars
    while ((c = s.charCodeAt(p)) !== endCharCode && p < s.length) {
      // this.lineCount += (c === 10);
      p++;
      if ((c === 10)) {
        this.lineCount++;
      }
    }
    this.pos = p;
    return this.str.substr(start, this.pos - start);
  }

  collectWhiteSpace() {
    let s = this.str;
    let start,
    p = (start = this.pos);

    const wpl = this.options.whiteSpacePerLine;
    let c;
    while ((c = s.charCodeAt(p)) <= 32 && p < s.length) {
      // this.lineCount += (c === 10);
      p++;
      if ((c === 10)) {
        this.lineCount++;
        // only one line per whitespace block to make postitiong go better
        // but didn't work as well as expected so not for now
        if (wpl) {
          break;
        }
      }
    }

    this.pos = p;
    return this.str.substr(start, this.pos - start);
  }

  collectWord() {
    let s = this.str;
    let start,
      p = (start = this.pos);

    let c;
    while (
      ((c = s[p]) >= 'A' && c <= 'Z') ||
      (c >= 'a' && c <= 'z') ||
      (c >= '0' && c <= '9') ||
      c === '_' ||
      c === '#'
    ) {
      p++;
    }

    this.pos = p;
    return s.substr(start, p - start);
  }

  collectNumber() {
    let s = this.str;
    let start,
      p = (start = this.pos);
    let hadNumber = false;

    let c = s[p];
    if (c === '+' || c === '-') {
      p++;
    }
    while (((c = s[p]) >= '0' && c <= '9') || c === '.') {
      p++;
      hadNumber = true;
    }
    c = s[p];
    if (hadNumber && (c === 'E' || c === 'e')) {
      p++;
      c = s[p];
      if (c === '+' || c === '-') {
        p++;
      }
      while ((c = s[p]) >= '0' && c <= '9') {
        p++;
      }
    }
    this.pos = p;
    return s.substr(start, p - start);
  }

}