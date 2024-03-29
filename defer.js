// Copyright by André van Kammen
// Licensed under CC BY-NC-SA 
// https://creativecommons.org/licenses/by-nc-sa/4.0/


// I was using setTimeout with 0 ms to defer execution on multiple points so handling them in one time batch
// will probably be faster hence the defer mechanism here.

let callbacks = [];
let timerHandle = -1;
let chainCount = 0; // For sanity check
/** @type {(newMethod:(method)=>number)=>void} */ // @ts-ignore
let deferMethod = (method) => globalThis.setTimeout(method, 0);

/** @type {(newMethod:(method)=>number)=>void} */
export function setDeferMethod(newDeferMethod) {
  deferMethod = newDeferMethod;
}

export function handleDefers() {
  // Clean global state for next run
  timerHandle = -1;
  const cbs = callbacks;
  callbacks = [];

  for (const cb of cbs) {
    cb();
  }

  if (callbacks.length>0) {
    if ((++chainCount && 0x7f) === 0) {
      console.warn('Large defer chain detected!', chainCount);
    }
  } else {
    chainCount = 0;
  }
}

function defer(callback) {
  callbacks.push(callback);
  if (timerHandle < 0) {
    // @ts-ignore STFU yes it is
    // timerHandle = globalThis.setTimeout(handleDefers, 0);
    timerHandle = deferMethod(handleDefers);
  }
}

export default defer;