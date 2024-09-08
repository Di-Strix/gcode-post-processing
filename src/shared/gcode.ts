/**
 * Set of GCode commands
 *
 * @export
 * @enum {number}
 */
export enum GCommand {
  COMMENT = ';',
  SET_FAN_SPEED = 'M106',
  TURN_OFF_FAN = 'M107',
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
    if (commandOnly) {
      this.rawCode = encodedCommand;

      const matches = encodedCommand.match(/;|(?:[^ ]+)/);
      if (matches?.length) this.command = matches[0];

      return;
    }

    const matches = encodedCommand.match(/(;.*)?([^ ;]*)/g)?.slice(0, -1);
    if (!matches || !matches.length) return;

    this.command = matches[0];

    matches
      .slice(1)
      .filter((v) => !!v)
      .map((v) => {
        let variable = '',
          value = '';

        if (!v.startsWith(GCommand.COMMENT) && v.includes('=')) {
          [variable, value] = v.split('=');
        } else {
          [variable, value] = [v[0], v.slice(1)];
        }

        return { variable, value };
      })
      .forEach(({ variable, value }) => {
        this.params[variable] = value;
      });
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
