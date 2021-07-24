// Copyright by André van Kammen
// Licensed under CC BY-NC-SA 
// https://creativecommons.org/licenses/by-nc-sa/4.0/
import { BaseParser } from './base-parser.js';

const defaultOptions = {
  maxSymbolLength: 3,
  whiteSpacePerLine: false,
  symbols: {}
};

class CodeParser extends BaseParser {
  constructor(options) {
    super ( { ...defaultOptions, ...options } );

    this.lastSymbol = { key: '', type: '' };
    this.lastResult = { str: '', type: '', symbol: this.lastSymbol };

    this.lastWasWord = false;
  }

  setSource(str) {
    super.setSource(str)
    this.lastWasWord = false;
  }

  collectSymbol() {
    let start = this.pos;
    let len = this.options.maxSymbolLength;
    
    let symbolOption
    let key 
    do {
      key = this.str.substr(start, len);
      symbolOption = this.options.symbols[key];
    } while (!symbolOption && --len>=1);
    if (symbolOption) {
      this.pos += key.length;
      this.lastSymbol.key = key;
      this.lastSymbol.type = symbolOption.type;
      return this.lastSymbol;
    }
  }

  getNext() {
    let s = this.str;
    let p = this.pos;
    if (p >= s.length) {
      return null;
    }
    let c = s[p];
    if (c <= ' ') {
      this.lastResult.type = 'whitespace';
      this.lastResult.str = this.collectWhiteSpace();
      return this.lastResult;
    }

    // TODO # is glsl c specific but used in more languages as part of identifier $ also in js
    //      this set shouold be configurable
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_' || c === '#') {
      this.lastWasWord = true;
      this.lastResult.type = 'word';
      this.lastResult.str = this.collectWord();
      return this.lastResult;
    }
    if (
      (c >= '0' && c <= '9') ||
      (!this.lastWasWord && (c === '-' || c === '+')) ||
      c === '.'
    ) {
      this.lastResult.type = 'number';
      this.lastResult.str = this.collectNumber();
      if (this.lastResult.str === '.' || this.lastResult.str === '..' || this.lastResult.str === '...') {
        this.lastResult.type = 'symbol';
      }
      return this.lastResult;
    }

    let symbol = this.collectSymbol();
    if (symbol) {
      this.lastResult.type = 'symbol';
      this.lastResult.str = symbol.key;
      this.lastResult.symbol = symbol;
      return this.lastResult;
    }
    this.pos++;
    this.lastResult.type = 'unknown';
    this.lastResult.str = c;
    return this.lastResult;
  }
}

export default CodeParser;
