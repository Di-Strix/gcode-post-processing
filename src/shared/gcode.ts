/**
 * Set of GCode commands
 *
 * @export
 * @enum {number}
 */
export enum GCommand {
  COMMENT = ';',
  SET_FAN_SPEED = 'M106',
  MOVE = 'G1',
  ABSOLUTE_POSITIONING = 'G90',
  RELATIVE_POSITIONING = 'G91',
  ABSOLUTE_EXTRUSION = 'M82',
  RELATIVE_EXTRUSION = 'M83',
  SET_POSITION = 'G92',
  SET_DEFAULT_ACCELERATION = 'M204',
}

/**
 * GCode class represents gcode command with its parameters
 *
 * @export
 * @class GCommand
 */
export class GCode {
  /**
   * GCode command
   *
   * @public
   * @type {(GCommand | string)}
   */
  public command: GCommand | string = '';
  /**
   * GCode that constructor was provided with if `commandOnly` set to `true`
   *
   * @public
   * @type {string}
   */
  public rawCode: string = '';
  /**
   * Parameters of this gcode
   *
   * @public
   * @type {Record<string, string>}
   */
  public params: Record<string, string> = {};

  /**
   * Creates an instance of GCode.
   *
   * @constructor
   * @param {string} [encodedCommand=''] GCode to parse if any
   * @param {boolean} [commandOnly=false] Whether to parse only command and skip parameters.
   */
  constructor(encodedCommand: string = '', commandOnly: boolean = false) {
    if (commandOnly) this.rawCode = encodedCommand;

    if (!encodedCommand.trim()) return;

    let commentBegan = false;
    for (const [index, part] of encodedCommand.split(' ').entries()) {
      if (!part && !commentBegan) continue;

      const isComment = part.startsWith(GCommand.COMMENT);

      if (index === 0) {
        this.command = isComment ? GCommand.COMMENT : part;

        if (commandOnly) break;
      }

      if (commentBegan || isComment) {
        commentBegan = true;

        if (GCommand.COMMENT in this.params) this.params[GCommand.COMMENT] += ' ' + part;
        else this.params[GCommand.COMMENT] = part.substring(1);

        continue;
      }

      if (index > 0) {
        let variable = '',
          value = '';

        if (part.includes('=')) {
          // Klipper-style
          [variable, value] = part.split('=');
        } else {
          // RepRap-style
          [variable, value] = [part[0], part.slice(1)];
        }

        this.params[variable.toUpperCase()] = value;
      }
    }
  }

  /**
   * Encodes gcode command and its parameters into a string with trailing newline character.
   * 
   * If gcode was constructed with `commandOnly = true`, function outputs original string
   *
   * @returns {string}
   */
  toString(): string {
    if (this.rawCode) return this.rawCode.trim() + '\n';

    const commandParts: string[] = [];

    if (this.command !== GCommand.COMMENT) commandParts.push(this.command);

    for (const param in this.params) {
      let encodedParam = param;
      if (this.params[param]) {
        encodedParam += param.length > 1 ? '=' : '';
        encodedParam += this.params[param];
      }

      commandParts.push(encodedParam);
    }

    return commandParts.join(' ') + '\n';
  }
}
