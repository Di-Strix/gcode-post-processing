import { GCode, GCommand } from './gcode';

/**
 * Abstract Pipe class.
 * Provides basic functionality to allow for connecting pipes sequentially.
 *
 * @export
 * @abstract
 * @class Pipe
 */
export abstract class Pipe {
  /**
   * Set of commands supported by this pipe
   *
   * @private
   * @type {Set<GCommand>}
   */
  private _SUPPORTED_COMMANDS: Set<GCommand> = new Set();
  /**
   * List of commands supported by this pipe
   *
   * @public
   * @readonly
   * @type {GCommand[]}
   */
  public get SUPPORTED_COMMANDS(): GCommand[] {
    return Array.from(this._SUPPORTED_COMMANDS);
  }

  /**
   * Adds provided commands to this pipe's supported commands.
   * Child classes should call this function from their constructor
   *
   * @protected
   * @param {GCommand[]} commands
   */
  protected addSupportedGcodes(commands: GCommand[]) {
    commands.forEach((gcode) => this._SUPPORTED_COMMANDS.add(gcode));
  }

  /**
   * Next pipe
   *
   * @type {?Pipe}
   */
  nextPipe?: Pipe;

  /**
   * This hook is called prior the pipe destroy
   */
  protected onCooldown(): void {}

  /**
   * This hook is called before the first input
   */
  protected onWarmup(): void {}

  /**
   * This function must be called before the first input.
   * Recursively calls `warmup` of all connected pipes
   */
  public warmup(): void {
    this.onWarmup();

    if (this.nextPipe) this.nextPipe.warmup();
  }

  /**
   * This function must be called prior pipe destroy.
   * Recursively calls `cooldown` of all connected pipes
   */
  public cooldown(): void {
    this.onCooldown();

    if (this.nextPipe) this.nextPipe.cooldown();
  }

  /**
   * Should be overridden by child class to process incoming data
   *
   * @public
   * @abstract
   * @param {GCode} gcode
   */
  public abstract input(gcode: GCode): void;

  /**
   * Can be called by child class to check whether the given gcode command in supported
   *
   * @param gcode gcode to test against
   * @param supportedCommands optionally can specify list of commands to test with. Defaults to pipe's supported commands
   * @returns {boolean} whether the given gcode command is the supported one
   */
  protected supportsCommand(
    gcode: GCode,
    supportedCommands: GCommand[] = this.SUPPORTED_COMMANDS
  ): boolean {
    return supportedCommands.includes(gcode.command as GCommand);
  }

  /**
   * Child class can call this function to forward processed data to the next pipe
   *
   * @protected
   * @param {GCode} gcode data to forward
   */
  protected output(gcode: GCode): void {
    if (!this.nextPipe) return;

    this.nextPipe.input(gcode);
  }
}
