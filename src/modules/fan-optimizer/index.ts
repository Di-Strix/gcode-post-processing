import yargs from 'yargs';

import { GCodeProcessor } from '../../shared/gcode-processor/gcode-processor';
import { withFilepathValidator } from '../../shared/helpers';

import { PrematureFanPipe } from './pipes/premature-fan.pipe';
import { SmoothFanPipe } from './pipes/smooth-fan.pipe';

type FanOptimizerArgs = {
  filepath: string;
  smoothTime: number;
  smoothingResetThreshold: number;
  speedupTime: number;
};

export const FanOptimizerModule: yargs.CommandModule<{}, FanOptimizerArgs> = {
  command: 'fan-optimizer <filepath>',
  describe:
    'Allows smoothing of rapid fan speed changes. Allows for premature fan speedup to give fan some time to gain requested ',
  builder: (yargs) => {
    const args = yargs
      .positional('filepath', {
        description: 'Path to the file to process',
        type: 'string',
      })
      .options({
        smoothTime: {
          type: 'number',
          default: 300,
          description: '[ms] Smooths frequent fan speed changes over specified time period.',
        },
        smoothingResetThreshold: {
          type: 'number',
          default: 20,
          description:
            '[mm] Reset fan smoothing if non-print move longer than this value was performed.',
        },
        speedupTime: {
          type: 'number',
          default: 500,
          description: '[ms] Activate fan N ms before to let it gain requested speed.',
        },
      });

    return withFilepathValidator('filepath', args);
  },
  handler: async (args) => {
    const processor = new GCodeProcessor();

    if (args.speedupTime > 0) processor.addPipe(new PrematureFanPipe(args.speedupTime));
    if (args.smoothTime > 0)
      processor.addPipe(new SmoothFanPipe(args.smoothTime, args.smoothingResetThreshold));

    await processor.run(args.filepath);
  },
};
