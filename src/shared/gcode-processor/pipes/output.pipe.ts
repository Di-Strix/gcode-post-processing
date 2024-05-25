import * as fs from 'fs';

import { GCode } from '../../gcode';
import { Pipe } from '../../pipe';

/**
 * Pipe writes any incoming gcode into a file
 *
 * @export
 * @class OutputPipe
 * @extends {Pipe}
 */
export class OutputPipe extends Pipe {
  /**
   * Output file path
   *
   * @type {string}
   */
  outFilePath: string;
  /**
   * Opened file descriptor
   *
   * @type {number}
   */
  fileDescriptor: number;

  /**
   * Creates an instance of OutputPipe.
   *
   * @constructor
   * @param {string} outFilePath Path to the output file. Creates file if it does not exist. Overwrites contents if it exists
   */
  constructor(outFilePath: string) {
    super();

    this.outFilePath = outFilePath;
    this.fileDescriptor = fs.openSync(outFilePath, 'w');
  }

  /**
   * @inheritdoc
   */
  override onWarmup(): void {
    fs.writeFileSync(this.fileDescriptor, '');
  }

  /**
   * @inheritdoc
   */
  override onCooldown(): void {
    fs.closeSync(this.fileDescriptor);
  }

  /**
   * @inheritdoc
   *
   * @param {GCode} gcode
   */
  override input(gcode: GCode): void {
    fs.appendFileSync(this.fileDescriptor, gcode.toString());
  }
}
