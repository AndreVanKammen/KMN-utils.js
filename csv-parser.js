// Copyright by André van Kammen
// Licensed under CC BY-NC-SA 
// https://creativecommons.org/licenses/by-nc-sa/4.0/
import { BaseParser } from "./base-parser.js";

const quoteCharCode = '"'.charCodeAt(0)
const commaCharCode = ','.charCodeAt(0)
export class CSVParser extends BaseParser {
  constructor () {
    super()
  }

  collectLine() {
    let s = this.str;
    if (this.pos >= s.length) {
      return null;
    }
    let result = [];
    let c;
    let lineResult 
    while (((c = s.charCodeAt(this.pos)) !== 10) && (this.pos < s.length)) {
      if (c === quoteCharCode) {
        this.skipCharCode(quoteCharCode);
        let str = this.collectUntil(quoteCharCode);
        this.skipCharCode(quoteCharCode);
        result.push(str);
      } else {
        let str = this.collectUntil(commaCharCode);
        this.pos++;
        result.push(str);
      }
      const lc = this.lineCount;
      this.collectWhiteSpace();
      if (lc !== this.lineCount) {
        break;
      }

      this.skipCharCode(commaCharCode);
    }
    return result;
  }

  setSource(str) {
    super.setSource(str);
  }
  
}