export namespace Timeline {
  /**
   * Timeline item type
   * [timestamp, T]
   */
  export type Item<T> = [number, T];

  /**
   * Type of callback to be called with expired item
   */
  export type ExpiryCallback<T> = (timestamp: number, data: T) => void;

  /**
   * Unsubscribe function type
   */
  export type UnsubscribeFn = () => void;
}

/**
 * Stores items in chronological order within specified time window
 *
 * @export
 * @class Timeline
 * @template T type of timeline item
 */
export class Timeline<T> {
  /**
   * Time window size in ms
   *
   * @private
   * @type {number}
   */
  private windowSize_ms: number = 0;
  /**
   * Collection of ordered items
   *
   * @private
   * @type {Array<Timeline.Item<T>>}
   */
  private timeline: Array<Timeline.Item<T>> = [];
  /**
   * Collection of callbacks that should be called when an item is expired
   *
   * @private
   * @type {Array<Timeline.ExpiryCallback<T>>}
   */
  private expiryCbs: Array<Timeline.ExpiryCallback<T>> = [];

  /**
   * Creates an instance of Timeline.
   *
   * @constructor
   * @param {number} windowSize_ms Size of the time window.
   *                      Item is kept unless difference between it and
   *                      the most recent item is greater `windowSize_ms`
   */
  constructor(windowSize_ms: number) {
    this.setWindowSize(windowSize_ms);
  }

  /**
   * Adds new item to the timeline
   *
   * @param {number} newTimestamp timestamp of the new item
   * @param {T} data item's data
   */
  step(newTimestamp: number, data: T): void {
    const item: Timeline.Item<T> = [newTimestamp, data];

    if (this.timeline.length) {
      const maxIndex = this.timeline.length - 1;
      let index = maxIndex;

      while (index >= 0 && this.timeline[index][0] > newTimestamp) index -= 1;

      if (index == maxIndex) this.timeline.push(item);
      else if (index < 0) this.timeline.unshift(item);
      else this.timeline.splice(index, 0, item);

      this.trimWindow();
    } else {
      this.timeline.push(item);
    }
  }

  /**
   * Registers callback which is called when a certain item is expired
   * (being removed) from the timeline
   *
   * @param {Timeline.ExpiryCallback<T>} cb Callback
   * @param {boolean} [once=false] Remove callback after first call. Defaults to false.
   * @returns {Timeline.UnsubscribeFn} Unsubscribe function
   */
  registerOnExpiry(cb: Timeline.ExpiryCallback<T>, once: boolean = false): Timeline.UnsubscribeFn {
    const unsubscribe = () => {
      this.expiryCbs = this.expiryCbs.filter((_cb) => _cb !== cb);
    };

    if (!this.expiryCbs.includes(cb))
      this.expiryCbs.push((...args) => {
        cb(...args);
        if (once) unsubscribe();
      });

    return unsubscribe;
  }

  /**
   * Removes all items in the timeline.
   * This will call expire callbacks for every item
   */
  reset() {
    while (this.timeline.length) this.expire(0);
  }

  /**
   * Returns raw collection of timeline items
   *
   * @returns {Timeline.Item<T>}
   */
  getRawTimeline(): typeof this.timeline {
    return this.timeline.slice();
  }

  /**
   * Removes all items that are strictly older than specified timestamp
   *
   * @param {number} upTo
   */
  trimLeft(upTo: number) {
    while (this.timeline.length && this.timeline[0][0] < upTo) {
      this.expire(0);
    }
  }

  /**
   * Removes all items that are strictly newer than specified timestamp
   *
   * @param {number} downTo
   */
  trimRight(downTo: number) {
    let item = this.timeline.at(-1);
    while (item && item[0] > downTo) {
      this.expire(this.timeline.length - 1);
      item = this.timeline.at(-1);
    }
  }

  /**
   * Returns current time window size
   *
   * @returns {typeof this.windowSize_ms}
   */
  getWindowSize(): typeof this.windowSize_ms {
    return this.windowSize_ms;
  }

  /**
   * Sets new time window size
   *
   * @param {number} windowSize_ms
   */
  setWindowSize(windowSize_ms: number): void {
    if (windowSize_ms < 0) return;

    this.windowSize_ms = windowSize_ms;
    this.trimWindow();
  }

  /**
   * Returns number of items in the timeline
   *
   * @returns {number}
   */
  getSize(): number {
    return this.timeline.length;
  }

  /**
   * Removes all older items that are strictly older than `the newest item` - `time window`
   *
   * @private
   */
  private trimWindow(): void {
    while (this.getFactualTimeWindow() > this.windowSize_ms) {
      this.expire(0);
    }
  }

  /**
   * Removes element from the timeline.
   * Calls respective callbacks
   *
   * @private
   * @param {number} index index of the item to remove
   */
  private expire(index: number): void {
    if (this.timeline.length <= 0) return;

    let item: Timeline.Item<T>;
    if (index === 0) item = this.timeline.shift() as typeof item;
    else item = this.timeline.splice(index, 1)[0];

    this.expiryCbs.forEach((cb) => cb(...item));
  }

  /**
   * Returns difference in time between the newest
   * and the oldest item in the timeline
   *
   * @private
   * @returns {number}
   */
  private getFactualTimeWindow(): number {
    const lastItem = this.timeline.at(-1);
    if (!lastItem) return 0;

    return lastItem[0] - this.timeline[0][0];
  }
}
