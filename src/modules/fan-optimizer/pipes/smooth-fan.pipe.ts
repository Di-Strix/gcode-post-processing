import { Fan } from '../../../shared/fan';
import { GCode } from '../../../shared/gcode';
import { Pipe } from '../../../shared/pipe';
import { Timeline } from '../../../shared/timeline';
import { Toolhead } from '../../../shared/toolhead';

/**
 * Pipe smooths rapid fan speed changes over period of `AppConfig.fan.smoothTime_ms`
 * by picking max encountered speed on that interval.
 *
 * @export
 * @class SmoothFanPipe
 * @extends {Pipe}
 */
export class SmoothFanPipe extends Pipe {
  /**
   * Smoothing time-frame size
   */
  smoothTime: number;

  /**
   * Smoothing should reset when non-print move is longer than this value
   */
  smoothingResetThreshold: number;

  /**
   * Fan instance to keep original fan speed
   */
  fan = new Fan();

  /**
   * Gcode timeline. Contains gcode to be emitted
   */
  gcodeTimeline = new Timeline<GCode>(Infinity);

  /**
   * Fan timeline. Used to track fan speeds over smoothing time-frame
   */
  fanTimeline = new Timeline<number>(Infinity);

  /**
   * Toolhead instance. Needed for time-tracking
   */
  toolhead = new Toolhead();

  /**
   * Whether the pipe in smoothing mode
   *
   * @readonly
   */
  get isSmoothing(): boolean {
    return !!this.fanTimeline.getSize();
  }

  /**
   * Keeps last emitted fan speed.
   * null means no value has been emitted yet.
   */
  lastEmittedSpeed: number | null = null;

  /**
   * Array of predicates each of which checks
   * whether the fan speed should be emitted or not.
   */
  fanEmitConditions: Array<() => boolean> = [];

  /**
   * Creates an instance of SmoothFanPipe.
   *
   * @param smoothTime Smoothing time-frame size
   * @param smoothingResetThreshold Smoothing should reset when non-print move is longer than this value
   */
  constructor(smoothTime: number, smoothingResetThreshold: number) {
    super();

    this.smoothTime = smoothTime;
    this.smoothingResetThreshold = smoothingResetThreshold;

    this.addSupportedGcodes(Toolhead.SUPPORTED_GCODES);
    this.addSupportedGcodes(Fan.SUPPORTED_GCODES);
  }

  /**
   * @inheritdoc
   */
  override onWarmup(): void {
    this.gcodeTimeline.registerOnExpiry((_, gcode) => {
      this.output(gcode);
    });

    const smoothTimeCondition = () => {
      const timeline = this.fanTimeline.getRawTimeline();
      const [lastTimestamp] = timeline.at(-1) || [];

      return !!lastTimestamp && this.toolhead.currentTime_ms - lastTimestamp >= this.smoothTime;
    };

    const freeMoveThresholdCondition = () =>
      Toolhead.isFreeMove(this.toolhead.lastMoveDisplacement) &&
      Toolhead.moveLength(this.toolhead.lastMoveDisplacement) > this.smoothingResetThreshold;

    const layerChangeCondition = () => Toolhead.isLayerChange(this.toolhead.lastMoveDisplacement);

    this.fanEmitConditions.push(smoothTimeCondition);
    this.fanEmitConditions.push(freeMoveThresholdCondition);
    this.fanEmitConditions.push(layerChangeCondition);
  }

  /**
   * @inheritdoc
   */
  override onCooldown(): void {
    if (this.isSmoothing) this.emitFan(), this.emitFan();

    this.fanTimeline.reset();
    this.gcodeTimeline.reset();
  }

  /**
   * @inheritdoc
   *
   * @param {GCode} gcode
   */
  input(gcode: GCode): void {
    if (this.supportsCommand(gcode, Toolhead.SUPPORTED_GCODES)) this.toolhead.exec(gcode);

    if (this.isSmoothing) {
      const shouldEmitFan = this.fanEmitConditions.map((condition) => condition()).includes(true);
      if (shouldEmitFan) {
        this.emitFan();
      }
    }

    if (this.supportsCommand(gcode, Fan.SUPPORTED_GCODES)) {
      const prevSpeed = this.fan.getSpeed();
      this.fan.exec(gcode);

      if (prevSpeed !== this.fan.getSpeed())
        this.fanTimeline.step(this.toolhead.currentTime_ms, this.fan.getSpeed());
    } else {
      this.gcodeTimeline.step(this.toolhead.currentTime_ms, gcode);
    }

    if (!this.isSmoothing) this.gcodeTimeline.reset();
  }

  /**
   * Does processing of collected fan speeds and emits smoothed value
   */
  private emitFan(): void {
    const rawFanTimeline = this.fanTimeline.getRawTimeline();
    const fanSpeeds = rawFanTimeline.map(([_, speed]) => speed);
    const maxFanSpeed = Math.max(...fanSpeeds);

    if (maxFanSpeed >= 0 && maxFanSpeed !== this.lastEmittedSpeed) {
      // If max fan speed valid and was not already emitted
      const tmpFan = new Fan();
      tmpFan.setSpeed(maxFanSpeed);

      // Insert new fan speed to the very beginning of the current gcode timeline
      this.gcodeTimeline.step(-1, tmpFan.getSpeedCommand());
    }

    if (this.fanTimeline.getSize() > 1) {
      // If more than one fan gcode was in the fan timeline

      // Needed to look ahead (withing smoothing time-frame) for any fan changes
      // and restore original fan speed if there weren't any

      // Remove all recorded fan speeds except the last one
      const [timestamp, speed] = rawFanTimeline.at(-1) as Timeline.Item<number>;
      this.fanTimeline.reset();
      this.fanTimeline.step(timestamp, speed);

      // Release gcodes until last fan gcode
      this.gcodeTimeline.trimLeft(timestamp + 0.000001); // Trim slightly ahead to release gcode preceding the last fan gcode
    } else {
      // If this time-frame had only fan gcode - reset
      // Means that original fan speed was emitted,
      // hence no need to track anything till the next fan gcode
      this.fanTimeline.reset();
      this.gcodeTimeline.reset();
    }

    this.lastEmittedSpeed = maxFanSpeed;
  }
}
