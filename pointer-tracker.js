
export class PointerTracker {

  /**
   * @param {Element} element 
   * @param {*} options 
   */
  constructor (element, options = {}) {
    this.element = element;
    this.options = options;

    this.lastPrimary = undefined;

    // 
    this.pointerInfo = {}
    this.element.addEventListener('pointerenter',this._handlePointerEnter); 
    this.element.addEventListener('pointerleave',this._handlePointerLeave);
    this.element.addEventListener('pointerover',this._handlePointerOver);
    this.element.addEventListener('pointerout',this._handlePointerOut);
    this.element.addEventListener('pointerdown',this._handlePointerDown);
    this.element.addEventListener('pointerup',this._handlePointerUp);
    this.element.addEventListener('pointermove',this._handlePointerMove);
    this.element.addEventListener('pointerrawupdate',this._handlePointerRawUpdate);

    this.element.addEventListener('contextmenu',this._handlecontextmenu);
  }

  remove() {
    this.element.removeEventListener('pointerenter',this._handlePointerEnter); 
    this.element.removeEventListener('pointerleave',this._handlePointerLeave);
    this.element.removeEventListener('pointerover',this._handlePointerOver);
    this.element.removeEventListener('pointerout',this._handlePointerOut);
    this.element.removeEventListener('pointerdown',this._handlePointerDown);
    this.element.removeEventListener('pointerup',this._handlePointerUp);
    this.element.removeEventListener('pointermove',this._handlePointerMove);
    this.element.removeEventListener('pointerrawupdate',this._handlePointerRawUpdate);

    this.element.removeEventListener('contextmenu',this._handlecontextmenu);
  }
  
  /** @param {PointerEvent} evt */
  stopEvent(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  }

  getLastPrimary() {
    if (this.lastPrimary) {
      return this.pointerInfo[this.lastPrimary];
    } else {
      return {};
    }
  }

  /** @param {PointerEvent} evt */
  getPointerInfo(evt) {
    let pointerInfo = this.pointerInfo[evt.pointerId];
    if (pointerInfo === undefined) {
      pointerInfo = this.pointerInfo[evt.pointerId] = {};
      pointerInfo.buttons = {};
      pointerInfo.isOver = 0;
      pointerInfo.isInside = 0;
      pointerInfo.isDown = 0;
      pointerInfo.eventCount = 0;
    }
    if (evt.isPrimary) {
      this.lastPrimary = evt.pointerId
    }
    pointerInfo.eventCount++;
    return pointerInfo
  }

  updatePointerInfo(pointerInfo, evt) {
    pointerInfo.pointerType = evt.pointerType
    pointerInfo.isPrimary = evt.isPrimary
    pointerInfo.currentX = evt.offsetX;
    pointerInfo.currentY = evt.offsetY;
    pointerInfo.pointerId = evt.pointerId;
    if (pointerInfo.pointerType.toLowerCase() === 'pen') {
      pointerInfo.tangentialPressure = evt.tangentialPressure
      pointerInfo.pressure = evt.pressure
      pointerInfo.tiltX = evt.tiltX
      pointerInfo.tiltY = evt.tiltY
      pointerInfo.twist = evt.twist
    }
  }

  stopGetAndUpdate(evt) {
    this.stopEvent(evt);
    let pointerInfo = this.getPointerInfo(evt)
    this.updatePointerInfo(pointerInfo, evt);
    return pointerInfo
  }
  _handlecontextmenu = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    return false;
  }

  /** @param {PointerEvent} evt */
  _handlePointerEnter = (evt) => {
    this.stopGetAndUpdate(evt).isInside++;
  }

  /** @param {PointerEvent} evt */
  _handlePointerLeave = (evt) => {
    this.stopGetAndUpdate(evt).isInside--;
  }

  /** @param {PointerEvent} evt */
  _handlePointerOver = (evt) => {
    this.stopGetAndUpdate(evt).isOver++;
  }

  /** @param {PointerEvent} evt */
  _handlePointerOut = (evt) => {
    this.stopGetAndUpdate(evt).isOver--;
  }

  /** @param {PointerEvent} evt */
  _handlePointerDown = (evt) => {
    // console.log('down');
    let pointerInfo = this.stopGetAndUpdate(evt);
    if (pointerInfo.buttons[evt.button]?.down !== true) {
      pointerInfo.isDown++;
    }
    // @ts-ignore yes it exists
    evt.target.setPointerCapture(evt.pointerId);
    pointerInfo.buttons[evt.button] = { down: true, x: evt.offsetX, y: evt.offsetY };
  }

  /** @param {PointerEvent} evt */
  _handlePointerUp = (evt) => {
    // console.log('up');
    let pointerInfo = this.stopGetAndUpdate(evt);
    if (pointerInfo.buttons[evt.button]?.down) {
      pointerInfo.isDown--;
    }
    // @ts-ignore yes it exists on target which is an element
    evt.target.releasePointerCapture(evt.pointerId);
    pointerInfo.buttons[evt.button] = { down: false, x: evt.offsetX, y: evt.offsetY };
  }

  /** @param {PointerEvent} evt */
  _handlePointerMove = (evt) => {
    // console.log('move', evt.buttons);
    this.stopGetAndUpdate(evt);
  }

  /** @param {PointerEvent} evt */
  _handlePointerRawUpdate = (evt) => {
    this.stopGetAndUpdate(evt);
  }
}