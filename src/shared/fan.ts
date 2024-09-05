import { GCode, GCommand } from './gcode';

/**
 * Fan class can process GCode related to the part cooling fan
 *
 * @export
 * @class Fan
 */
export class Fan {
  /**
   * Gcodes supported by this class
   *
   * @public
   * @static
   * @readonly
   */
  public static readonly SUPPORTED_GCODES = [GCommand.SET_FAN_SPEED, GCommand.TURN_OFF_FAN];

  /**
   * Current fan speed [0-255]
   *
   * @private
   * @type {number}
   */
  private speed: number = 0;
  /**
   * Change in fan speed after last gcode
   *
   * @public
   * @type {number}
   */
  public speedDelta: number = 0;

  /**
   * Executes provided gcode if it is supported
   *
   * @param {GCode} gcode
   */
  exec(gcode: GCode): void {
    if (gcode.command === GCommand.SET_FAN_SPEED) {
      const { S } = gcode.params;
      if (S) {
        this.setSpeed(Number(S));
      }
    } else if (gcode.command === GCommand.TURN_OFF_FAN) {
      this.setSpeed(0);
    }
  }

  /**
   * Sets fan speed
   *
   * @param {number} newSpeed
   */
  setSpeed(newSpeed: number): void {
    this.speedDelta = newSpeed - this.speed;
    this.speed = newSpeed;
  }

  /**
   * Returns current fan speed [0-255]
   *
   * @returns {number}
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Bakes current fan speed into fan gcode (M106)
   *
   * @returns {GCode}
   */
  getSpeedCommand(): GCode {
    const gcode = new GCode();
    gcode.command = GCommand.SET_FAN_SPEED;
    gcode.params.S = this.speed.toFixed(2).toString();

    return gcode;
  }
}
