import fs from 'fs';
import yargs from 'yargs';

/**
 * Adds path validation to an yargs option.
 * Checks if `key` is provided and leads to a file.
 *
 * @param key key, under which filepath is intended to be
 * @param yargs yargs instance
 * @returns yargs instance with applied validators
 */
export function withFilepathValidator<
  K extends string,
  Args extends { [key in K]: string | undefined },
>(key: K, yargs: yargs.Argv<Args>) {
  return yargs
    .demandOption(key)
    .normalize(key)
    .check((args) => {
      const filepath = args[key].trim();
      if (!filepath || !fs.existsSync(filepath))
        throw new Error(`File by path '${filepath}' does not exist!`);
      if (!fs.lstatSync(filepath).isFile())
        throw new Error(`Entity by path '${filepath}' is not a file!`);

      return true;
    });
}
