import fs from 'fs';
import path from 'path';
import readline from 'readline';

import { GCode, GCommand } from '../gcode';
import { Pipe } from '../pipe';

import { OutputPipe } from './pipes/output.pipe';

/**
 * GCode Processor provides complete gcode file processing feature,
 * utilizing user-provided processing pipes.
 *
 * @export
 * @class GCodeProcessor
 */
export class GCodeProcessor {
  /**
   * Stores user-supplied pipes.
   *
   * @type {Pipe[]}
   */
  private pipeline: Pipe[] = [];

  /**
   * Connects provided pipe to the end of the processor's pipeline.
   *
   * @param {Pipe} pipe Fresh Pipe instance.
   */
  addPipe(pipe: Pipe) {
    this.pipeline.push(pipe);
  }

  /**
   * Runs file-processing routine:
   *  1. Warmups all the pipes
   *  2. Feeds all the data, contained in the file under `inputFilePath`
   *  3. Collects output data and overwrites original file
   *  4. Cooldowns all the pipes
   *
   * @async
   * @param {string} inputFilePath path to the input file. Assumes that file exists.
   * @returns {Promise<void>}
   */
  async run(inputFilePath: string): Promise<void> {
    const inPath = path.resolve(inputFilePath);
    const parsedInPath = path.parse(inPath);
    const outFilePath = path.join(parsedInPath.dir, parsedInPath.name + '-out' + parsedInPath.ext);

    const pipeline = this.pipeline.slice();
    pipeline.push(new OutputPipe(outFilePath));

    const allSupportedCommands = this.connectPipes(pipeline);

    try {
      pipeline[0].warmup();

      for await (const line of this.readLines(inPath)) {
        let gcode = new GCode(line, true);
        if (allSupportedCommands.has(gcode.command as GCommand)) gcode = new GCode(line);

        pipeline[0].input(gcode);
      }
    } finally {
      pipeline[0].cooldown();
    }

    fs.renameSync(outFilePath, inPath);
  }

  /**
   * Converts input file stream into readline interface
   *
   * @private
   * @param {fs.PathLike} path path to the file
   * @returns {readline.Interface} readline interface with data from the input file
   */
  private readLines(path: fs.PathLike): readline.Interface {
    const fileStream = fs.createReadStream(path);

    const input = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    return input;
  }

  /**
   * Connects pipes to the each other in the provided pipeline.
   *
   * @private
   * @param {Pipe[]} pipeline
   * @returns {Set<GCommand>} list of all commands supported by the pipes in the pipeline
   */
  private connectPipes(pipeline: Pipe[]): Set<GCommand> {
    const allSupportedCommands = new Set<GCommand>();

    pipeline.forEach((pipe, index) => {
      pipe.SUPPORTED_COMMANDS.forEach((command) => allSupportedCommands.add(command));

      const prevPipe = pipeline[index - 1];
      if (prevPipe) {
        prevPipe.nextPipe = pipe;
      }
    });

    return allSupportedCommands;
  }
}
