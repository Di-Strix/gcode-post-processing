import yargs from 'yargs';

import { FanOptimizerModule } from './modules/fan-optimizer';

export const modules: yargs.CommandModule<{}, any>[] = [FanOptimizerModule];
