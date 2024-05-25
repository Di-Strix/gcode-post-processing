import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { modules } from './modules';

const yargsInstance = yargs(hideBin(process.argv));
buildCommands(yargsInstance).demandCommand().help().parse();

function buildCommands(yargs: yargs.Argv<any>) {
  return modules.reduce((yargs, module) => yargs.command(module), yargs);
}
