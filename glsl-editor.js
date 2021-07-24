// Copyright by André van Kammen
// Licensed under CC BY-NC-SA 
// https://creativecommons.org/licenses/by-nc-sa/4.0/

import CodeParser from './code-parser.js';
import languageDefs from './code-glsl-def.js';
import { addCSS } from '../KMN-varstack.js/browser/html-utils.js';

const defaultOptions = {
  parser: {
    symbols: languageDefs.symbols,
    whiteSpacePerLine: true
  }
};
const 
  inputChars = '_:;,.$@#(){}[]<>?!&|^*+-=/\\%=~\'"` \t' +
               '0123456789' +
               'abcdefghijklmnopqrstuvwxyz' +
               'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
function debugCharCodes(str) {
  if (!str) {
    console.log('nostr');
    return;
  }
  let result = '';
  for (let ix = 0; ix < str.length; ix++) {
    result += ' ' + str.charCodeAt(ix);
  }
  console.log(result);
}

let glslWords = null
function createWordLookUp() {
  if (!glslWords) {
    // Used new Object.create(null) here because otherwise it would get a constructor and other stuff in it's keys
    // TODO Maybe the new Map object would be better
    glslWords = Object.create(null);
    for (let wordType of Object.keys(languageDefs.words)) {
      for (let word of Object.keys(languageDefs.words[wordType])) {
        glslWords[word] = wordType;
      }
    }
  }
}

// Exactly what I wanted to try next, thanks:
// https://medium.com/compass-true-north/a-dancing-caret-the-unknown-perils-of-adjusting-cursor-position-f252734f595e
function getCaretPosition(el) {
  var caretOffset = 0, sel;
  var range = window.getSelection().getRangeAt(0);
  var selectedLength = range.toString().length;
  var preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(el);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  caretOffset = preCaretRange.toString().length - selectedLength;
  return {
    selectedLength,
    caretOffset
  }}

const tabRegEx =  new RegExp('\t', 'g');
const CRLFregEx = new RegExp('\r\n', 'g');

const cssStr = `/*css*/
:root {
  --gutterWidth: 48px;
  --statusHeight: 22px;
  --codeText: rgb(200, 200, 200);
  --lineNumber: rgb(128, 128, 128);
}
.codeElement {
  position: absolute;
  border: 0;
  outline: 0;
  margin: 0;
  resize: none;
  width: 100%;
  height: calc(100% - var(--statusHeight));
  background: var(--codeBackground);
  color: var(--codeText);
  font-family: 'Fira Code', monospace;
  font-size: 18px;
  overflow-x: auto;
  overflow-y: auto;
  white-space: pre;
}
.codeStatus {
  position: absolute;
  bottom: 0;
  height: calc(var(--statusHeight) - 2px);
  width: calc(100% - 24px);
  overflow: hidden;
  padding: 1px 12px;
  background: var(--tableHeaderBackground);
}
.codeStatusLabel {
  position: absolute;
  top: 4px;
  left: 12px;
}
.codePositionLabel {
  position: absolute;
  top: 4px;
  right: 12px;
  text-align: right;
}

.codeGutter {
  position: absolute;
  display: block;
  top: 0;
  width: calc(var(--gutterWidth) - 1px);
  height: calc(100% - 16px);
  padding: 8px 0;
  text-align: right;
  border-right: 1px solid var(--headerBackground);
  background: var(--backgroundColor);
  overflow: hidden;
}
.codeGutter .lineNumber {
  display: block;
  color: var(--lineNumber);
  padding: 0 8px;
  font-family: 'Fira Code', monospace;
  font-size: 18px;
  top: 0;
}
.codeGutter .lineNumber .error {
  background: rgb(192, 32, 32);
}

.codeEditor {
  position: absolute;
  border: 0;
  outline: 0;
  margin: 0;
  left: var(--gutterWidth);
  top: 0;
  margin: 0 0 0 12px;
  padding: 8px 0;
  height: calc(100% - 16px);
  resize: none;
  width: calc(100% - 12px - var(--gutterWidth));
  background: var(--codeBackground);
  color: var(--codeText);
  font-family: 'Fira Code', monospace;
  font-size: 18px;
  overflow-x: auto;
  overflow-y: visible;
  white-space: pre;
}
.codeEditor div {
  display: flow-root;
  position: initial;
  width: initial;
  height: initial;
  font: inherit;
}
.code .symbol {   color: rgb(240,240,240); }
.code .number {   color: rgb(180,180,240); }
.code .word {     color: rgb(240,240,120); }
.code .reserved { color: rgb(230,230,230); }
.code .reserved_type { color: rgb(0 ,240,120); }
.code .type {     color: rgb(  0,240,  0); }
.code .function { color: rgb(240,180, 60); }
.code .unknown,
.code .other {    color: rgb(255,128,128); }
.code .pre_process {    color: rgb(255,170,170); }
.code .comment {  color: rgb(96 ,160, 96); }
/* .code .highlight { outline: 3px solid rgb(96,96,255,0.7); background: black; } */
.code .reserved.highlight,
.code .symbol.highlight { 
  font-weight: 800;
  background: black; 
  color: rgb(255,255,255); 
}
.code .word.highlight { 
  background: rgb(16,16,128); 
  color: rgb(255,255,128);
}
.code .error { background: rgb(212,0,0); }
/* .code .selected { outline: 1px solid rgba(0,0,255,0.5); } */
/* .code:focus,
.code:focus-within { outline: px solid rgba(0,0,255,0.9); } this including tabindex messes up browser, 
                     shows how stupid and ambiguous HTML is :) */
/*!css*/`


class GlslEditor {

  constructor(options) {
    options = options || {}
    this.options = {...defaultOptions, ...options};

    // this.options = { ...defaultOptions, ...options };
    this.codeParser = new CodeParser(this.options.parser);
    this.compileErrors = {};
    this.lastOffset = 0;

    //this.lastLineCount = 
    this.lineCount = 0;

    this.currentSpanData = [];
    this.currentSpanDataLength = 0;
    this.newSpanData = [];
    this.newSpanDataLength = 0;
    this.selected = { spanData:null, offset:0 };
    this.growSpanData();

    createWordLookUp();
  }
  
  /**
   * @param {HTMLElement} parentElement
   */
  initializeDOM(parentElement) {
    this.parentElement = parentElement;
    addCSS('glsl-editor', cssStr);

    // this.parentElement = parentElement; 
    this.parentElement.classList.add('code');
    // TODO add classes codeArea code

    this.codeElement = this.parentElement.$el({ cls: 'codeElement' });
    this.gutterElement = this.codeElement.$el({ cls: 'codeGutter' });
    this.textElement = this.codeElement.$el({ cls: 'codeEditor' });

    this.statusElement = this.parentElement.$el({ cls: 'codeStatus' });
    this.codeStatusLabel = this.statusElement.$el({ cls: 'codeStatusLabel' });
    this.codePositionLabel = this.statusElement.$el({ cls: 'codePositionLabel' });

    this.textElement.onscroll = () =>
      this.gutterElement.scrollTop = this.textElement.scrollTop;

    this.textElement.setAttribute('contenteditable', 'true');
    this.textElement.setAttribute('wrap', 'soft');
    this.textElement.setAttribute('autocorrect', 'off');
    this.textElement.setAttribute('autocapitalize', 'off');
    this.textElement.setAttribute('spellcheck', 'false');
    this.textElement.oninput = (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      // console.log('input: ', evt.data, evt.inputType, evt);
      this.reformatCode();
    }
    this.textElement.onpaste = (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      let txt = evt.clipboardData.getData('text');
      // console.log('paste: ', evt, '"' + txt + '"');
      this.reformatCode(txt);
    }
    // this.textElement.oncut = (evt) => {
    //   evt.stopPropagation();
    //   evt.preventDefault();
    //   console.log('oncut: ',evt);
    // }
    this.textElement.onkeydown = (evt) => {
      if ((evt.altKey && evt.key.toLowerCase() === 'enter') ||
        (evt.ctrlKey && evt.key.toLowerCase() === 's')) {
        evt.stopPropagation();
        evt.preventDefault()
        this.options.onCompile();
        return;
      }
      if (!evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.isComposing) {
        // Enters in contenteditable are an accident waiting to happen
        if (evt.key.toLowerCase() === 'enter') {
          evt.stopPropagation();
          evt.preventDefault();
          this.reformatCode('\n');
        } else if (evt.key.length === 1 && inputChars.indexOf(evt.key) !== -1) {
          evt.stopPropagation();
          evt.preventDefault();
          this.reformatCode(evt.key);
        } else if (evt.key === '}') {
          evt.stopPropagation();
          evt.preventDefault();
          this.reformatCode('}');
        } else if (evt.key === 'F12') {
          evt.stopPropagation();
          evt.preventDefault();
          this.findSelected();
          if (this.selected.spanData.linkIx !== -1) {
            this.selected.spanData = this.currentSpanData[this.selected.spanData.linkIx];
            this.selected.offset = 0;
            this.updateSelect();
          }
        }
      }

      // this.reformatCode();
      console.log('down', evt);
      // console.log(evt);
    };
    this.textElement.onkeyup = (evt) => {
      // console.log('up');
      // let start = performance.now();
      this.findSelected();
      this.updateHighlights();
      // let stop = performance.now();
      // console.log('highlight: ',(stop - start).toFixed(2));
    }
    this.textElement.onmouseup = (evt) => {
      this.findSelected();
      this.updateHighlights();
    }
  }

  reformatCode(insertText) {
    // let start = performance.now();
    let sourceStr = this.textElement.innerText;
    let { caretOffset, selectedLength} = getCaretPosition(this.textElement);
    // let stop = performance.now();
    // console.log('reformat: ', stop - start);

    this.parseSource(sourceStr, ~~caretOffset, insertText, selectedLength);

    this.updateSelect();
  }

  updateSelect () {
    let select = this.selected;
    let range = document.createRange();
    let offset = select.offset;
    let ix = 0;
    let found = false;

    // TODO see if this can be done simpler, range,setStart acts different on nodes with children it expects the child offset
    // like solution from Liam here https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
    if (select.spanData?.el) {
      try {
        for (let child of select.spanData.el.childNodes) {
          // BR's innerText returns empty instead of \n 
          let len = (child.nodeName === 'BR') ? 1 : ~~(child.nodeValue?.length || child.innerText?.length);
          if (offset < len || ix === select.spanData.el.childNodes.length - 1) {
            // set range on BR fails in firefox, it gives a cursor that doesn't work :(
            // so in this case we need to select the child
            if (child.nodeName === 'BR') {
              // And now for another exception on the exception if the previous was a text node
              // we need to select the end of that one because it gives visualy the same cursor
              // but makes the insert position fail.
              if (child.previousSibling?.nodeType === Node.TEXT_NODE) {
                range.setStart(child.previousSibling, child.previousSibling.nodeValue.length);
                // console.log('BR before text selection found!', window.lastChild);
              } else {
                range.setStart(select.spanData.el, ix);
                // console.log('BR selection found!', window.lastChild);
              }
            } else {
              range.setStart(child, (child.nodeName === 'BR') ? 0 : offset);
              // console.log('child selection found!', window.lastChild);
            }
            found = true;
            // console.log('child: ',child, offset, len, select.node);
            break;
          } else {
            offset -= len;
          }
          ix++;
        }
      } catch (exc) {
        console.error('Set range error: ', exc);
      }
    }
    if (!found) {
      console.log('no selection found!', select);
    }

    range.collapse(false);
    let sel = window.getSelection();
    sel.removeAllRanges();
    try {
      sel.addRange(range);
    } catch (annoyingShit) {
      console.log(select, range, annoyingShit)
    }

    // scroll into view is a blundering mess we will make our own :(
    // select.node?.scrollIntoView(false);//, { behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    if (select.spanData?.el) {
      console.log('select: ',select);
      // select.node.classList.add('selected');
      let box = select.spanData.el.getBoundingClientRect();
      let viewBox = this.textElement.getBoundingClientRect();
      let upShortage = box.y - viewBox.y;
      let downShortage = (box.y + box.height) - (viewBox.y + viewBox.height - 32); // 32 is for scrollbar+ margin
      let leftShortage = box.x - viewBox.x;
      if (downShortage > 0) {
        this.textElement.scrollTop += downShortage;
        console.log('downShortage: ', downShortage, box, viewBox);
      }
      if (leftShortage < 0) {
        console.log('leftShortage: ', leftShortage, box, viewBox);
        this.textElement.scrollLeft += leftShortage;
      }
      if (upShortage < 0) {
        console.log('upShortage: ', upShortage, box, viewBox);
        this.textElement.scrollTop += upShortage;
      }
      // TODO right shortage
    }
  }

  updateLineNumbers() {
    // TODO rewrite
    // this.gutterElement.innerHTML = '';
    let start = performance.now();
    for (let ix = 0; ix <= this.lineCount; ix++) {
      /** @type {HTMLElement} */ /*@ts-ignore:*/
      let nrEl = this.gutterElement.children[ix];
      if (!nrEl) {
        nrEl = this.gutterElement.$el({ tag: 'span', cls: 'lineNumber' });
        nrEl.innerText = (ix + 1).toString();
      }
      let error = this.compileErrors[ix + 1];
      /*@ts-ignore:*/
      if (error !== nrEl.dataError) {
        if (error) {
          nrEl.classList.add('error');
        } else {
          nrEl.classList.remove('error');
        }
        /*@ts-ignore:*/
        nrEl.dataError = error;
      }
    }
    let el
    while (el = this.gutterElement.children[this.lineCount + 1]) {
      el.remove();
    }
    let stop = performance.now();
    console.log('updateLineCount: ',stop - start);
    // this.lastLineCount = this.lineCount;
  }

  growSpanData() {
    // Lets keep 2 static array's for better memory management
    let len = this.currentSpanData.length;
    for (let ix = 0; ix < 1024; ix++) {
      this.currentSpanData.push({ type: '', error: false, str: '', el: null, uc: 0, ix: len + ix, col:0, line:0, symbolType: ' ', linkIx:-1 });
    }
    for (let ix = 0; ix < 1024; ix++) {
      this.newSpanData.push({ type: '', error: false, str: '', el: null, uc: 0, ix: len + ix, col:0, line:0, symbolType: ' ', linkIx:-1 });
    }
    this.spanDataLength = this.newSpanData.length;
  }

  updateSpan(spanData) {
    /** @type {HTMLElement} */
    const el = spanData.el;
    // el.innerText = spanData.str; // This creates Annoying BR elements :(
    el.$removeChildren();
    el.appendChild(document.createTextNode(spanData.str));
    // @ts-ignore: TODO beter class list handling
    el.classList = [];
    el.classList.add(spanData.type);
    // el.setAttribute("tabindex", spanData.ix.toString());
    if (spanData.error) {
      el.classList.add('error');
    }
  }

  findSelected() {
    try {
      var range = window.getSelection()?.getRangeAt(0);
      if (range) {
        let search = range.endContainer;
        while (search && search.nodeName !== 'SPAN') {
          search = search.parentElement;
        }
        if (search) {
          for (let ix = 0; ix < this.currentSpanDataLength; ix++) {
            let csd = this.currentSpanData[ix];
            // TODO move to update highlight
            csd.highlight = false;
            if (csd.el === search) {
              this.selected.spanData = csd;
              this.selected.offset = getCaretPosition(csd.el).caretOffset;
              // firefox gives 2 possible outcomes based on how you navigate 
              // to the point. Pressing end will put it before the enter in
              // the whitespace span while going there with arrow right causes 
              // it to be in the last postion of the span before the enter.
              // chrome always put's it in the last pos of the span before.
              // except if it ends with \n.
              // I want it to be at 0 of the next for highlight consitency
              if (this.selected.offset === csd.str.length && 
                  ix < this.currentSpanDataLength - 1) {
                let nextCsd = this.currentSpanData[ix + 1]
                this.selected.spanData = nextCsd;
                this.selected.offset = nextCsd.str.length;
              }
            }
          }
        }
      }
    } catch (exc) {
      console.error('findSelected failed: ', exc);
    }
  }

  updateHighlights() {
    let newCursorSpanData = this.selected.spanData;
    if (newCursorSpanData) {
      this.codePositionLabel.innerText = 
        'Ln'+ ~~(newCursorSpanData.line + 1) + ', Col'
         + ~~(newCursorSpanData.col + this.selected.offset + 1);
      if (newCursorSpanData.linkIx !== -1) {
        newCursorSpanData.highlight = true;
        let endIx = newCursorSpanData.ix;
        let searchIx = newCursorSpanData.linkIx;
        while (searchIx !== endIx && searchIx !== -1) {
          let csd = this.currentSpanData[searchIx]
          if (csd.highlight) {
            break;
          }
          csd.highlight = true;
          searchIx = csd.linkIx;
        }
      }
    }

    // Update class status
    for (let ix = 0; ix < this.currentSpanDataLength; ix++) {
      let csd = this.currentSpanData[ix];

      if (csd.error !== csd.el.dataError) {
        if (csd.error) {
          csd.el.classList.add('error');
        } else {
          csd.el.classList.remove('error');
        }
        csd.el.dataError = csd.error
      }
      if (csd.highlight !== csd.el.dataHighlight) {
        if (csd.highlight) {
          csd.el.classList.add('highlight');
        } else {
          csd.el.classList.remove('highlight');
        }
        csd.el.dataHighlight = csd.highlight
      }
    }
  }

  createSpan(spanData) {
    spanData.el = document.createElement('span');
    this.updateSpan(spanData);
    return spanData.el;
  }

  parseSource(source, cursorOffset, insertText, selectLength) {
    let start = performance.now();

    cursorOffset = ~~cursorOffset;
    this.source = source;
    // console.log('cursorNode before: ',cursorOffset);

    // TODO this can not be handled if there was an edit at the same time in the content editable
    if (insertText) {
      insertText = insertText.replace(CRLFregEx, '\n');
      let preStr = source.substring(0, cursorOffset);
      console.log('selectLength: ',selectLength);
      source = preStr + insertText + source.substring(cursorOffset + ~~selectLength);
      cursorOffset += insertText.length;
    }

    let keywords = Object.create(null);

    // Parse the code and make an new array with the data for all the spans
    {
      this.codeParser.setSource(source);
      let spanIx = 0;
      // Initialize to right type
      let part = this.codeParser.lastResult;
      let colCount = 0;
      let lastLine = 0;
      while (!!(part = this.codeParser.getNext())) {
        if (spanIx >= this.spanDataLength) {
          this.growSpanData();
        }
        const spanData = this.newSpanData[spanIx++];
        spanData.error = false;
        spanData.highlight = false;
        spanData.el = null;
        spanData.line = lastLine;
        spanData.col = colCount;
        spanData.linkIx = -1;
        let isSymbol = part.type === 'symbol';
        spanData.symbolType = isSymbol ? part.symbol.type : ' ';
        if (part.type === 'symbol' && part.symbol && part.symbol.type === '/') {
          spanData.type = 'comment';
          spanData.str = part.str;
          let commentPart = this.codeParser.lastResult;
          if (part.str === '/*') {
            while ((commentPart = this.codeParser.getNext())) {
              spanData.str += commentPart.str;
              if (commentPart.str === '*/') {
                break;
              }
            }
          } else {
            while ((commentPart = this.codeParser.getNext())) {
              spanData.str += commentPart.str;
              if (spanData.line !== this.codeParser.lineCount) {
                break;
              }
            }
          }
        } else {
          spanData.str = part.str;
          spanData.type = (part.type === 'word')
            ? (glslWords[part.str] || part.type)
            : part.type;
          if (spanData.type === 'word') {
            let keywordData = keywords[spanData.str];
            if (!keywordData) {
              keywords[spanData.str] = keywordData = { first: spanData, last: spanData };
            } else {
              keywordData.last.linkIx = spanData.ix;
              keywordData.last = spanData;
              spanData.linkIx = keywordData.first.ix;
            }
          }
          let err = this.compileErrors[this.codeParser.lineCount + 1];
          if (err) {
            spanData.error = err.error.indexOf('\'' + spanData.str + '\'') !== -1;
            if (spanData.error) {
              console.log('Found error', spanData);
            }
          }
        }
        colCount += spanData.str.length;
        if (lastLine !== this.codeParser.lineCount) {
          colCount=0
          lastLine = this.codeParser.lineCount;
        }
      }
      this.lineCount = this.codeParser.lineCount;
      this.newSpanDataLength = spanIx;
    }

    // Autoformat
    {
      const indentSize = 2;
      let symbolStack = [];
      let startWhiteSpace = null;
      let lastEndLine = null;
      let lastNsd = null;
      let totalPos = 0;
      const cleanStack = (nsd) => {
        // Now for some nasty stuff else is a continuation of the previous an could come behind the close
        // making the close behave differently
        let nextIx = nsd.ix + 1;
        let elseFound = false;
        while (nextIx < this.newSpanDataLength) {
          let nextNsd = this.newSpanData[nextIx++]
          if (nextNsd.type !== 'whitespace') {
            if (nextNsd.str === 'else') {
              elseFound = true;
            }
            break;
          }
        }

        if (elseFound && nsd.str === '}') {
          return;
        }

        let stackLen = symbolStack.length;
        while (stackLen > 0) {
          let stackPeek = symbolStack[stackLen - 1];
          if (stackPeek.symbolType === '=' ||
              stackPeek.type === 'reserved') {
            let popData = symbolStack.pop();
            nsd.linkIx = popData.ix;
            popData.linkIx = nsd.ix;
            stackLen--;
            if (stackPeek.str === 'if' && elseFound) {
              break;
            }
          } else {
            break;
          }
        }
      }
      for (let ix = 0; ix < this.newSpanDataLength; ix++) {
        const nsd = this.newSpanData[ix];
        if (nsd.line !== ~~lastNsd?.line) {
          lastEndLine = lastNsd;
          startWhiteSpace = (nsd.type === 'whitespace') ? nsd : lastEndLine;
          if (startWhiteSpace) {
            startWhiteSpace.str = startWhiteSpace.str.replace(tabRegEx,' '.repeat(indentSize));
          }
        }
        if (nsd.type === 'reserved') {
          // TODO This list is also in glsl keywords
          if (['if', 'else', 'while', 'for', 'do','switch','case','return'].indexOf(nsd.str) !== -1) {
            if (symbolStack.length>0 && symbolStack[symbolStack.length-1].str === 'else') {
              symbolStack[symbolStack.length-1] = nsd;
            } else {
              symbolStack.push(nsd);
            }
          }
        }
        if (nsd.type === 'symbol') {
          if (nsd.str === '{') {
            let stackLen = symbolStack.length;
            if (stackLen > 0 && symbolStack[stackLen-1].type === 'reserved') {
              // Replace reserved word with block open
              symbolStack[stackLen-1] = nsd;
            } else {
              symbolStack.push(nsd);
            }
          } else if (nsd.str === '}') {
            // Todo scan stack for }
            cleanStack(nsd);
            let popData = symbolStack.pop();
            if (popData?.str !== '{') {
              nsd.error = true;
            } else {
              nsd.linkIx = popData.ix;
              popData.linkIx = nsd.ix;
            }
            // remove any open naked if for etc. and also assign I guess
            cleanStack(nsd);
          } else if (nsd.str === '(') {
            symbolStack.push(nsd);
          } else if (nsd.str === ')') {
            // Todo scan stack for )
            cleanStack(nsd);
            let popData = symbolStack.pop();
            if (popData?.str !== '(') {
              nsd.error = true;
            } else {
              nsd.linkIx = popData.ix;
              popData.linkIx = nsd.ix;
            }
          } else if (nsd.symbolType === '=') {
            symbolStack.push(nsd);
          } else if (nsd.symbolType === ';') {
            cleanStack(nsd);
          }
        }
        if (nsd.type !== 'whitespace') {
          if (startWhiteSpace) {
            let spaceCount = 0;
            let len = startWhiteSpace.str.length;
            let ix = len-1;
            while (ix >= 0 && startWhiteSpace.str[ix--] === ' ') {
              spaceCount++
            }
            let stackLen = symbolStack.length;
            let newSpaceCount = spaceCount;
            if (nsd.type === 'pre_process') {
              newSpaceCount = 0;
            } else if (stackLen > 0) {
              let ss = symbolStack[stackLen-1];
              if (ss !== nsd) {
                newSpaceCount = stackLen * indentSize;
                if ((ss.str === '(' || ss.symbolType === '=')) {
                  if ((ss.ix < this.newSpanDataLength-1) &&
                      (this.newSpanData[ss.ix+1].type === 'whitespace') &&
                      (this.newSpanData[ss.ix+1].str.indexOf('\n') !== -1)) {
                    newSpaceCount = stackLen * indentSize;
                  } else {
                    newSpaceCount = symbolStack[stackLen-1].col + ss.str.length + 1;
                  }
                }
              } else {
                newSpaceCount = (stackLen-1) * indentSize;
              }
            } else {
              newSpaceCount = 0;
            }
            if (newSpaceCount !== spaceCount) {
              // if (totalPos >= cursorOffset && totalPos < cursorOffset + nsd.str.length) {
              //   console.log('Whitespace adjust skipped because cursor is in it');
              // } else {
              {
                startWhiteSpace.str = startWhiteSpace.str.substring(0, len - spaceCount) + ' '.repeat(newSpaceCount);
                if (totalPos <= cursorOffset) {
                  cursorOffset += newSpaceCount - spaceCount;
                  console.log('increase cursorOffset ', newSpaceCount - spaceCount);
                }
                totalPos += newSpaceCount - spaceCount;
              }
            }
            startWhiteSpace = null;
          }
        }
        totalPos += nsd.str.length;
        lastNsd = nsd;
      }
    }

    // Find cursor element
    let newCursorPos = ~~cursorOffset;
    let newCursorSpanData = null;
    {
      let totalPos = 0;
      for (let ix = 0; ix < this.newSpanDataLength; ix++) {
        const nsd = this.newSpanData[ix];

        let len = nsd.str.length;
        totalPos += len;
        // posLeft = len;
        let delta = totalPos - cursorOffset
        if (!newCursorSpanData && (delta > 0)) { // && ((delta === 0) || !nsd.str.endsWith('\n'))) {
          newCursorSpanData = nsd;
          newCursorPos = Math.max(0,nsd.str.length - delta);
        }
      }
    }

    let firstChange = -1;
    let lastChange = -1;
    let allChanged = false;
    const newLastOffset = this.newSpanDataLength - 1;
    const currentLastOffset = this.currentSpanDataLength - 1;
    if (this.newSpanDataLength !== this.currentSpanDataLength) {
      let minLen = Math.min(this.newSpanDataLength, this.currentSpanDataLength);
      if (minLen === 0) {
        allChanged = true;
      } else {
        for (let ix = 0; ix < minLen; ix++) {
          const nsd = this.newSpanData[newLastOffset - ix];
          const csd = this.currentSpanData[currentLastOffset - ix];
          if (nsd.str !== csd.str) {
            lastChange = ix;
            // console.log('last: ', nsd, csd, ix);
            break;
          }
          nsd.el = csd.el;
        }

        for (let ix = 0; ix < minLen; ix++) {
          const nsd = this.newSpanData[ix];
          const csd = this.currentSpanData[ix];
          if (nsd.str !== csd.str) {
            // console.log('first: ', nsd, csd, ix);
            firstChange = ix;
            break;
          }
          nsd.el = csd.el
        }
      }
    } else {
      for (let ix = 0; ix < this.newSpanDataLength; ix++) {
        const nsd = this.newSpanData[ix];
        const csd = this.currentSpanData[ix];
        nsd.el = csd.el;
        if (nsd.str !== csd.str) {
          if (nsd.str === csd.el?.innerText) {
            continue;
          }
          nsd.el = null;
          if (firstChange === -1) {
            firstChange = ix;
          }
          lastChange = newLastOffset - ix;
        }
      }
    }
    if (firstChange !== -1 || lastChange !== -1) {

      // No 1st change found means the end has changed
      if (firstChange === -1) {
        firstChange = Math.min(newLastOffset, currentLastOffset);
      }

      let lastNewChange = newLastOffset - lastChange;
      let lastCurrentChange = currentLastOffset - lastChange;

      // If there is repeats in the middle 1st and last change can be reversed
      if (lastNewChange < firstChange || lastCurrentChange < firstChange) {
        let oldFs = firstChange;
        firstChange = Math.min(lastNewChange, lastCurrentChange);
        let delta = oldFs - firstChange
        lastNewChange += delta;
        lastCurrentChange += delta;
      }

      // Inserting nodes is slow so refresh the whole end if it's close
      if (lastChange < 20) {
        lastChange = 0;
        lastNewChange = newLastOffset;
        lastCurrentChange = currentLastOffset;
      }

      // decrease firstChange because there could be typed in the previous span
      firstChange = Math.max(0, firstChange - 2);

      // increase lastChange because there could be typed in the next span
      lastChange = Math.max(0, lastChange - 2);
      console.log('Change found new:     ', firstChange, '-', lastNewChange, ' of ', this.newSpanDataLength);
      console.log('Change found current: ', firstChange, '-', lastCurrentChange, ' of ', this.currentSpanDataLength);

      // let deletedSpans = [];
      // let addedSpans = [];

      // Deleted the changed spands from the DOM and get a cursor offset within this deleted part 
      // using the real innertext, thatt should reflect our position in the new insert
      for (let ix = lastCurrentChange; ix >= firstChange; ix--) {
        const csd = this.currentSpanData[ix];
        csd.el?.remove();
        csd.el = null; // re-use doesn't make it faster so delete them
      }

      let fragment = document.createDocumentFragment();
      for (let ix = firstChange; ix <= lastNewChange; ix++) {
        const nsd = this.newSpanData[ix];
        let newSpan = this.createSpan(nsd);
        fragment.appendChild(newSpan);
      }
      if (lastCurrentChange < this.currentSpanDataLength-1) {
        this.textElement.insertBefore(fragment, this.currentSpanData[lastCurrentChange + 1].el);
      } else {
        this.textElement.appendChild(fragment);
      }

      // console.log('Deleted spans: ', deletedSpans);
      // console.log('Added spans: ', addedSpans);

    }
    // if everything changed, just refill
    if (allChanged) {
      console.log('All changed');
      let el;
      while ((el = this.textElement.lastChild)) {
        this.textElement.removeChild(el);
      }
      for (let ix = 0; ix < this.newSpanDataLength; ix++) {
        let spanData = this.newSpanData[ix]
        let newSpan = this.createSpan(spanData);
        this.textElement.appendChild(newSpan);
      }
    }

    // Switch to the new array
    let swap = this.currentSpanData;
    this.currentSpanData = this.newSpanData;
    this.newSpanData = swap;
    this.currentSpanDataLength = this.newSpanDataLength;
    this.newSpanDataLength = 0;

    // Add 2 enters at the end because contenteditable causes problems otherwise
    let lastSpan = this.currentSpanData[this.currentSpanDataLength - 1]
    if (lastSpan?.type === 'whitespace') {
      let add2enters = true;
      if (this.currentSpanDataLength>=2) {
        let beforeLastSpan = this.currentSpanData[this.currentSpanDataLength - 2];
        if (beforeLastSpan.type === 'whitespace' && beforeLastSpan.str.endsWith('\n')) {
          add2enters = false;
        }
      }
      console.log('enter add1 ',add2enters, lastSpan.str);
      let changed = false;
      if (!lastSpan.str.endsWith('\n')) {
        lastSpan.str += '\n';
        changed = true;
      }
      if (add2enters) {
        lastSpan.str += '\n';
        changed = true;
      }
      if (changed) {
        this.updateSpan(lastSpan);
        lastSpan.el.innerText = lastSpan.str;
      }
    } else {
      let csd = this.currentSpanData[this.currentSpanDataLength++];
      csd.type = 'whitespace';
      csd.str = '\n\n';
      this.createSpan(csd);
      console.log('enter add2 ',csd);
      this.textElement.appendChild(csd.el);
    }

    if (newCursorSpanData) {
      console.log('newCursorSpanData: ',newCursorSpanData);
      this.updateSpan(newCursorSpanData);
      // Update 1 extra because it still can contain contenteditable mess
      if (newCursorSpanData.ix < this.currentSpanDataLength-2) {
        this.updateSpan(this.currentSpanData[newCursorSpanData.ix+1]);
      }
    }

    this.updateHighlights();

    this.updateLineNumbers();

    let stop = performance.now();
    let delta = stop - start
    if (delta >10) {
      console.log('Change found new:     ', firstChange, '-', this.newSpanDataLength-1-lastChange, ' of ', this.newSpanDataLength);
      console.log('Change found current: ', firstChange, '-', this.currentSpanDataLength-1-lastChange, ' of ', this.currentSpanDataLength);
      console.log('Slow reparse >10ms: ', delta.toFixed(2) + 'ms');
    }


    if (newCursorSpanData?.el) {
      this.selected.spanData = newCursorSpanData;
      this.selected.offset = newCursorPos;
    } else {
      let lastNode = this.currentSpanData[this.currentSpanDataLength - 1];
      this.selected.spanData = lastNode; // cursorNode,
      this.selected.offset = lastNode?.str.length; // cursorOffset
    }
  }

  loadSource(source) {
    if (this.source !== source) {
      this.source = source;
      this.codeStatusLabel.innerText = '';
      this.codePositionLabel.innerText = '';
      this.compileErrors = {};
      this.parseSource(this.source);
    }
  }
  
  getSource() {
    return this.textElement.innerText;
  }

  setStatus(compileInfo, compileSource) {
    const splitError = /ERROR: ([\d])+:([\d]+): (.+)/gim;
    this.compileErrors = {};
    if (!compileInfo.compileStatus) {
      // const shaderLines = compileInfo.shaderSource.split('\n');
      const ourOffset = compileInfo.shaderSource.indexOf(compileSource);
      const lineOffset = compileInfo.shaderSource.substring(0, ourOffset).split('\n').length - 1;
      const logErrors = compileInfo.shaderLog.split('\n');

      let firstError = ''

      for (let logError of logErrors) {
        const m = splitError.exec(logError);
        if (m && m.length > 3) {
          if (!firstError) {
            firstError = m[3];
          }
          this.compileErrors[(~~m[2]) - lineOffset] = { pos: ~~m[1], error: m[3] };
          console.log(logError, this.compileErrors[m[2]]);
          // console.log(shaderLines[~~m[2] - 1]);
          // console.log(' '.repeat(~~m[1])+'^^');
        }
      }

      this.codeStatusLabel.innerText = firstError || compileInfo.shaderLog;
    } else {
      this.codeStatusLabel.innerText = 'Compiled OK ('+ compileInfo.compileTime.toFixed(1) +'ms)'
    }
    this.parseSource(compileSource);
    this.updateHighlights();
  }

}

export default GlslEditor;
