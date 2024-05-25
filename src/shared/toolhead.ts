import { GCommand, GCode } from './gcode';

namespace Toolhead {
  /**
   * Toolhead position
   * [X, Y, Z, E]
   */
  export type Position = [number, number, number, number];
}

/**
 * Toolhead class can process GCode related to the movement/extrusion
 *
 * @export
 * @class Toolhead
 */
export class Toolhead {
  /**
   * Gcodes supported by this class
   *
   * @public
   * @static
   * @readonly
   */
  public static readonly SUPPORTED_GCODES = [
    GCommand.ABSOLUTE_POSITIONING,
    GCommand.RELATIVE_POSITIONING,
    GCommand.ABSOLUTE_EXTRUSION,
    GCommand.RELATIVE_EXTRUSION,
    GCommand.MOVE,
    GCommand.SET_POSITION,
    GCommand.SET_DEFAULT_ACCELERATION,
  ];

  /**
   * Current toolhead position
   *
   * @public
   * @type {Toolhead.Position}
   */
  public position: Toolhead.Position;
  /**
   * Toolhead's positioning mode
   *
   * @public
   * @type {(GCommand.ABSOLUTE_POSITIONING | GCommand.RELATIVE_POSITIONING)}
   */
  public positioningMode: GCommand.ABSOLUTE_POSITIONING | GCommand.RELATIVE_POSITIONING;
  /**
   * Toolhead's extrusion mode
   *
   * @public
   * @type {(GCommand.ABSOLUTE_EXTRUSION | GCommand.RELATIVE_EXTRUSION)}
   */
  public extrusionMode: GCommand.ABSOLUTE_EXTRUSION | GCommand.RELATIVE_EXTRUSION;

  /**
   * Toolhead's displacement after last move
   *
   * @public
   * @type {Toolhead.Position}
   */
  public lastMoveDisplacement: typeof this.position;

  /**
   * Current toolhead's velocity in mm/s
   *
   * @public
   * @type {number}
   */
  public currentVelocity: number;

  /**
   * Roughly estimated time in ms needed for toolhead to perform all given moves
   *
   * @public
   * @type {number}
   */
  public currentTime_ms: number;

  /**
   * Creates an instance of Toolhead.
   *
   * @constructor
   */
  constructor() {
    this.position = [0, 0, 0, 0];
    this.positioningMode = GCommand.ABSOLUTE_POSITIONING;
    this.extrusionMode = GCommand.ABSOLUTE_EXTRUSION;

    this.lastMoveDisplacement = [0, 0, 0, 0];

    this.currentVelocity = 0;
    this.currentTime_ms = 0;
  }

  /**
   * Returns whether the given displacement vector represents non-print move
   *
   * @static
   * @param {Toolhead.Position} vector displacement vector
   * @returns {boolean}
   */
  static isFreeMove(vector: Toolhead.Position): boolean {
    const xySum = vector.slice(0, 1).reduce((a, b) => a + b, 0);

    return xySum !== 0 && vector[3] === 0;
  }

  /**
   * Returns whether the given displacement vector represents layer-change move
   *
   * @static
   * @param {Toolhead.Position} vector displacement vector
   * @returns {boolean}
   */
  static isLayerChange(vector: Toolhead.Position): boolean {
    const xySum = vector.slice(0, 1).reduce((a, b) => a + b, 0);

    return xySum === 0 && vector[2] !== 0;
  }

  /**
   * Returns length of the displacement vector, excluding E dimension
   *
   * @static
   * @param {Toolhead.Position} vector displacement vector
   * @returns {number}
   */
  static moveLength(vector: Toolhead.Position): number {
    return Math.hypot(...vector.slice(0, 3));
  }

  /**
   * Executes provided G1 command
   *
   * @param {GCode} gcode
   * @returns {(Toolhead.Position | null)} returns null if provided gcode is not a G1 command,
   *                                       displacement vector otherwise
   */
  move(gcode: GCode): Toolhead.Position | null {
    if (gcode.command !== GCommand.MOVE) return null;

    this.lastMoveDisplacement = [0, 0, 0, 0];

    const { X, Y, Z, E, F } = gcode.params;

    if (F) {
      this.currentVelocity = Number(F) / 60;
    }

    if (this.positioningMode == GCommand.ABSOLUTE_POSITIONING) {
      if (X) {
        const _x = Number(X);
        this.lastMoveDisplacement[0] = _x - this.position[0];
        this.position[0] = _x;
      }

      if (Y) {
        const _y = Number(Y);
        this.lastMoveDisplacement[1] = _y - this.position[1];
        this.position[1] = _y;
      }

      if (Z) {
        const _z = Number(Z);
        this.lastMoveDisplacement[2] = _z - this.position[2];
        this.position[2] = _z;
      }
    } else {
      if (X) {
        const _x = Number(X);
        this.lastMoveDisplacement[0] = _x;
        this.position[0] += _x;
      }

      if (Y) {
        const _y = Number(Y);
        this.lastMoveDisplacement[1] = _y;
        this.position[1] += _y;
      }

      if (Z) {
        const _z = Number(Z);
        this.lastMoveDisplacement[2] = _z;
        this.position[2] += _z;
      }
    }

    if (this.extrusionMode == GCommand.ABSOLUTE_EXTRUSION) {
      if (E) {
        const _e = Number(E);
        this.lastMoveDisplacement[3] = _e - this.position[3];
        this.position[3] = _e;
      }
    } else {
      if (E) {
        const _e = Number(E);
        this.lastMoveDisplacement[3] = _e;
        this.position[3] += _e;
      }
    }

    this._updateTime();

    return this.lastMoveDisplacement;
  }

  /**
   * Sets toolhead positioning mode according to the provided gcode.
   *
   * @param {GCode} gcode
   * @returns {GCommand.ABSOLUTE_POSITIONING | GCommand.RELATIVE_POSITIONING} Current positioning mode.
   */
  setPositioningMode(gcode: GCode): typeof this.positioningMode {
    type PositioningMode = typeof this.positioningMode;

    const allowedCommands = [
      GCommand.ABSOLUTE_POSITIONING,
      GCommand.RELATIVE_POSITIONING,
    ] satisfies Array<PositioningMode>;

    if (allowedCommands.includes(gcode.command as PositioningMode)) {
      this.positioningMode = gcode.command as PositioningMode;
    }

    return this.positioningMode;
  }

  /**
   * Sets toolhead extrusion mode according to the provided gcode.
   *
   * @param {GCode} gcode
   * @returns {GCommand.ABSOLUTE_EXTRUSION | GCommand.RELATIVE_EXTRUSION} Current extrusion mode.
   */
  setExtrusionMode(gcode: GCode): typeof this.extrusionMode {
    type ExtrusionMode = typeof this.extrusionMode;

    const allowedCommands = [
      GCommand.ABSOLUTE_EXTRUSION,
      GCommand.RELATIVE_EXTRUSION,
    ] satisfies Array<ExtrusionMode>;

    if (allowedCommands.includes(gcode.command as ExtrusionMode)) {
      this.extrusionMode = gcode.command as ExtrusionMode;
    }

    return this.extrusionMode;
  }

  /**
   * Overwrites toolhead position according to the provided G92 command.
   *
   * @param {GCode} gcode
   * @returns {Toolhead.Position} Current toolhead position.
   */
  setPosition(gcode: GCode): typeof this.position {
    if (gcode.command === GCommand.SET_POSITION) {
      const { X, Y, Z } = gcode.params;

      if (X) this.position[0] = Number(X);
      if (Y) this.position[1] = Number(Y);
      if (Z) this.position[2] = Number(Z);
    }

    return this.position;
  }

  /**
   * Executes provided gcode if it is supported
   *
   * @param {GCode} gcode
   */
  exec(gcode: GCode): void {
    this.setPosition(gcode);
    this.setPositioningMode(gcode);
    this.setExtrusionMode(gcode);

    this.move(gcode);
  }

  /**
   * Calculates current toolhead's time based on the current velocity and displacement
   *
   * @private
   */
  private _updateTime(): void {
    const distance = Toolhead.moveLength(this.lastMoveDisplacement);
    this.currentTime_ms += (distance / this.currentVelocity) * 1000;
  }
}
