
export class TouchTracker {

  /**
   * @param {Element} element 
   * @param {*} options 
   */
  constructor (element, options = {}) {
    this.element = element;
    this.options = options;

    // 
    this.touchInfo = {}
    this.element.addEventListener('touchstart',this._handleTouchStart);
    this.element.addEventListener('touchend',this._handleTouchEnd);
    this.element.addEventListener('touchmove',this._handleTouchMove);
    this.element.addEventListener('touchcancel',this._handleTouchEnd);
  }
  /** @param {TouchEvent} evt */
  stopEvent(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  }

  /** @param {Touch} evt */
  getTouchInfo(evt) {
    let touchInfo = this.touchInfo[evt.identifier];
    if (touchInfo === undefined) {
      touchInfo = this.touchInfo[evt.identifier] = {};
      touchInfo.buttons = {};
      touchInfo.isDown = 0;
      touchInfo.eventCount = 0;
    }
    touchInfo.eventCount++;
    return touchInfo
  }

  /** @param {Touch} evt */
  updateTouchInfo(touchInfo, evt, type) {
    touchInfo.id = evt.identifier;
    touchInfo.currentX = evt.clientX;
    touchInfo.currentY = evt.clientY;
    touchInfo.radiusX = evt.radiusX;
    touchInfo.radiusY = evt.radiusY;
    touchInfo.rotationAngle = evt.rotationAngle;
    touchInfo.force = evt.force;
    if (type==='start') {
      touchInfo.downInfo = { x: evt.clientX, y: evt.clientY };
    }
  }

  /** @param {TouchList} touchList */
  handleUpdate(touchList, type) {
    for (let touch of touchList) {
      if (type === 'end') {
        delete this.touchInfo[touch.identifier];
      } else {
        let touchInfo = this.getTouchInfo(touch)
        this.updateTouchInfo(touchInfo, touch, type);
      }
    }
  }

  /** @param {TouchEvent} evt */
  _handleTouchStart = (evt) => {
    this.stopEvent(evt);
    this.handleUpdate(evt.changedTouches,'start');
  }

  /** @param {TouchEvent} evt */
  _handleTouchEnd = (evt) => {
    this.stopEvent(evt);
    this.handleUpdate(evt.changedTouches,'end');
  }

  /** @param {TouchEvent} evt */
  _handleTouchMove = (evt) => {
    this.stopEvent(evt);
    this.handleUpdate(evt.touches,'move');
  }

}