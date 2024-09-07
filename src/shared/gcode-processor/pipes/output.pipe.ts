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
   * Stream for writing data to the file
   *
   * @type {number}
   */
  writeStream: fs.WriteStream;

  /**
   * Creates an instance of OutputPipe.
   *
   * @constructor
   * @param {string} outFilePath Path to the output file. Creates file if it does not exist. Overwrites contents if it exists
   */
  constructor(outFilePath: string) {
    super();

    this.outFilePath = outFilePath;
    this.writeStream = fs.createWriteStream(outFilePath);
  }

  /**
   * @inheritdoc
   */
  override onWarmup(): void {}

  /**
   * @inheritdoc
   */
  override onCooldown(): void {
    this.writeStream.close();
  }

  /**
   * @inheritdoc
   *
   * @param {GCode} gcode
   */
  override input(gcode: GCode): void {
    this.writeStream.write(gcode.toString());
  }
}
