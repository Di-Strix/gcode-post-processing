import { Fan } from '../../../shared/fan';
import { GCode } from '../../../shared/gcode';
import { Pipe } from '../../../shared/pipe';
import { Timeline } from '../../../shared/timeline';
import { Toolhead } from '../../../shared/toolhead';

/**
 * Pipe moves fan commands (only those increasing fan speed) back in time by `speedupTime`.
 * Does this in a very dumb way and is intended to be used before `SmoothFanPipe`
 *
 * @export
 * @class PredictiveFanPipe
 * @extends {Pipe}
 */
export class PrematureFanPipe extends Pipe {
  /**
   * Offset size in ms
   */
  speedupTime: number;
  /**
   * Gcode timeline. Contains gcode to be emitted
   */
  timeline: Timeline<GCode>;
  /**
   * Fan instance to process and emit fan speed
   */
  fan = new Fan();
  /**
   * Toolhead instance. Needed for time-tracking
   */
  toolhead = new Toolhead();

  /**
   * Creates an instance of PredictiveFanPipe.
   *
   * @constructor
   */
  constructor(speedupTime: number) {
    super();

    this.speedupTime = speedupTime;
    this.timeline = new Timeline<GCode>(this.speedupTime);

    this.addSupportedGcodes(Toolhead.SUPPORTED_GCODES);
    this.addSupportedGcodes(Fan.SUPPORTED_GCODES);
  }

  /**
   * @inheritdoc
   */
  override onWarmup(): void {
    this.timeline.registerOnExpiry((_, data) => this.output(data));
  }

  /**
   * @inheritdoc
   */
  override onCooldown(): void {
    this.timeline.reset();
  }

  /**
   * @inheritdoc
   *
   * @param {GCode} gcode
   */
  input(gcode: GCode): void {
    if (this.supportsCommand(gcode, Toolhead.SUPPORTED_GCODES)) this.toolhead.exec(gcode);

    if (this.supportsCommand(gcode, Fan.SUPPORTED_GCODES)) {
      this.fan.exec(gcode);
    }

    const timestamp = this.toolhead.currentTime_ms;
    if (this.fan.speedDelta > 0) {
      const fanGcode = this.fan.getSpeedCommand();
      this.timeline.step(timestamp - this.speedupTime, fanGcode);
    }

    this.timeline.step(timestamp, gcode);
  }
}
