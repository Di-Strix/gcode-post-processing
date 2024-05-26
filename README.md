# GCode Post-Processing

### Modular gcode post-processing script

### Description

This repo contains set of tools for gcode post-processing, enabling you to
easily create your own scripts.
This script should be compatible with all slicers that support post-processing,
however it was written for PrusaSlicer and was not tested in other slicers.

There are also some modules available out-of-the-box

### Contents

1. [Installation](#installation)
2. [Entities](#entities)
3. [Built-in Modules](#built-in-modules)
   1. [Fan Optimizer](#fan-optimizer)
4. [Writing your own modules](#custom-modules)
5. [Writing your own pipes](#custom-pipes)

### Installation

1. Install [LTS version of NodeJS](https://nodejs.org/en)
2. Clone this repo
3. Open Terminal in the cloned directory
4. Run `npm i`
5. npm will automatically download all required dependencies, compile and
   create a 'proxy' script to run post-processing conveniently.

   If nothing goes wrong, you will see message like this:

```
GCode post-processing script was successfully installed!
You can add the following command to the PrusaSlicer to use it:
  /Users/Shared/PrusaSlicer-post-processing/v2/run-post-processing.cmd

To see available available arguments, run:
  npm run start -- --help
```

6. Copy provided command and insert it into slicer
7. After the command insert module name you want to use and (optionally)
   additional module options. Example (single line):

```
/Users/Shared/PrusaSlicer-post-processing/v2/run-post-processing.cmd fan-optimizer
```

## Entities

- [Gcode Processor](src/shared/gcode-processor/gcode-processor.ts) - wrapper for convenient gcode processing
- [GCommand](src/shared/gcode.ts) - set of GCode commands
- [GCode](src/shared/gcode.ts) - convenient gcode parsing/serializing
- [Pipe](src/shared/pipe.ts) - processes and modifies gcode
- [Timeline](src/shared/timeline.ts) - stores data in chronological order
- [Toolhead](src/shared/toolhead.ts) - emulates toolhead and does very basic time approximation
- [Fan](src/shared/fan.ts) - emulates part cooling fan
- [Various helpers](src/shared/helpers.ts)

## Built-in Modules

### Fan Optimizer

Eliminates annoying "we-we-we-we-we" that fan makes because of PrusaSlicer's command spamming
when dynamic overhang fan speed is enabled.
It also features premature fan speedup that will give fan some time to speedup before overhang.

#### Features:

- Smoothing of rapid and frequent fan speed changes.
- Premature fan speedup to give fan some time to gain requested speed.

### Command and arguments

```bash
index.js fan-optimizer <filepath> [--smoothTime] [--smoothingResetThreshold] [--speedupTime]
```

#### Positionals:

`filepath` Path to the file to process [required]

#### Options:

- `--smoothTime` [ms] Smooths frequent fan speed changes over specified time period. [default: 300]
- `--smoothingResetThreshold` [mm] Reset fan smoothing if non-print move longer than this value was performed. [default: 20]
- `--speedupTime` [ms] Activate fan N ms before to let it gain requested speed. [default: 500]

## Custom Modules

Modules are independent sub-programs that can be run from a single place (namely single post-processing script)
implementing various features.

### Example of building a custom module

To begin with, create new folder for your module in [`src/modules`](/src//modules/).

Create `index.ts` file inside this folder, it will export your module's configuration.
You can refer to [yargs official documentation](https://github.com/yargs/yargs/blob/main/docs/advanced.md#providing-a-command-module)
for more detailed documentation on modules

Define and export your module

```ts
// my-custom-module/index.ts
import yargs from 'yargs';

export const MyCustomModule: yargs.CommandModule = {};
```

Inside module provide `command` entry and `handler` function

```ts
// my-custom-module/index.ts
import yargs from 'yargs';

export const MyCustomModule: yargs.CommandModule = {
  command: 'my-custom-module',
  handler: async (args) => {},
};
```

Your module must accept path to the file as positional argument
in order to modify gcode.

Let's create your module's args type which will contain only filepath for now

```ts
// my-custom-module/index.ts
import yargs from 'yargs';

type MyCustomModuleArgs = {
  filepath: string;
};

export const MyCustomModule: yargs.CommandModule<{}, MyCustomModuleArgs> = {
  command: 'my-custom-module',
  handler: async (args) => {},
};
```

Optionally, you can add description to your module

```ts
// my-custom-module/index.ts
import yargs from 'yargs';

type MyCustomModuleArgs = {
  filepath: string;
};

export const MyCustomModule: yargs.CommandModule<{}, MyCustomModuleArgs> = {
  command: 'my-custom-module',
  describe: 'My custom module',
  handler: async (args) => {},
};
```

To let yargs know what arguments your module accepts, create builder function

You can utilize `withFilepathValidator` helper function which will do path
validating for you

```ts
// my-custom-module/index.ts
import yargs from 'yargs';

import { withFilepathValidator } from '../../shared/helpers';

type MyCustomModuleArgs = {
  filepath: string;
};

export const MyCustomModule: yargs.CommandModule<{}, MyCustomModuleArgs> = {
  command: 'my-custom-module <filepath>',
  describe: 'My custom module',
  builder: (yargs) => {
    const args = yargs.positional('filepath', {
      description: 'Path to the file to process',
      type: 'string',
    });

    return withFilepathValidator('filepath', args);
  },
  handler: async (args) => {},
};
```

Implement handler function utilizing neat `GCodeProcessor` class

```ts
// my-custom-module/index.ts
import yargs from 'yargs';

import { GCodeProcessor } from '../../shared/gcode-processor/gcode-processor';
import { withFilepathValidator } from '../../shared/helpers';

type MyCustomModuleArgs = {
  filepath: string;
};

export const MyCustomModule: yargs.CommandModule<{}, MyCustomModuleArgs> = {
  command: 'my-custom-module <filepath>',
  describe: 'My custom module',
  builder: (yargs) => {
    let args = yargs.positional('filepath', {
      description: 'Path to the file to process',
      type: 'string',
    });

    return withFilepathValidator('filepath', args);
  },
  handler: async (args) => {
    const processor = new GCodeProcessor();
    await processor.run(args.filepath);
  },
};
```

Currently, this module does't do much. It just forwards input to the output
without any modifications. Let's connect `CustomPipe` that removes all the
comment-only lines from the file. See [pipe chapter](#custom-pipes)

```ts
// my-custom-module/index.ts
import yargs from 'yargs';

import { GCodeProcessor } from '../../shared/gcode-processor/gcode-processor';
import { withFilepathValidator } from '../../shared/helpers';

import { CustomPipe } from './pipes/custom.pipe';

type MyCustomModuleArgs = {
  filepath: string;
};

export const MyCustomModule: yargs.CommandModule<{}, MyCustomModuleArgs> = {
  command: 'my-custom-module <filepath>',
  describe: 'My custom module',
  builder: (yargs) => {
    let args = yargs.positional('filepath', {
      description: 'Path to the file to process',
      type: 'string',
    });

    return withFilepathValidator('filepath', args);
  },
  handler: async (args) => {
    const processor = new GCodeProcessor();

    processor.addPipe(new CustomPipe());

    await processor.run(args.filepath);
  },
};
```

Now, build and test!

```bash
npm run build
npm run start -- my-custom-module ./test-gcode/3DBenchy.gcode
```

After running the script we can observe that all comment-only
lines were removed

```diff
  ...
  M107
- ;LAYER_CHANGE
- ;Z:0.25
- ;HEIGHT:0.25
  G10 ; retract
  G1 Z.25 F36000
  G1 X79.8 Y97.769
  G11 ; unretract
  M204 S4000
- ;TYPE:Skirt/Brim
- ;WIDTH:0.6
  G1 F3600
  ...
```

## Custom pipes

Pipes are essential part of any module.
These reusable parts can be stacked together to achieve your desired behavior.

- Every pipe must extend `Pipe` base class, as well as implement `input` method.
  Resulting data, after processing, should be forwarded into `output` method.

- Pipes have list of their supported gcodes. To be precise, this list should include
  all gcode commands that pipe somehow relies on (f.e reads command's arguments).

  If command is not on the list - only the command will be parsed (skipping any its arguments, etc...)

  To add command to the list of supported - pipe should call `this.addSupportedGcodes` in its constructor

- To perform any prepare or finishing tasks, respective `onWarmup` and `onCooldown` hooks are available.
  After `onCooldown` method is called, pipe must output all the data it wants to be outputted.

### Example of building a custom pipe

In this example we will build `CustomPipe` for our `MyCustomModule`

In the module's folder create `pipes` folder to better organize code.
Inside his folder create `custom.pipe.ts` file and export `CustomPipe` class

```ts
// my-custom-module/pipes/custom.pipe.ts
import { Pipe } from '../../../shared/pipe';

export class CustomPipe extends Pipe {}
```

Every pipe must implement `input` method, so add it

```ts
// my-custom-module/pipes/custom.pipe.ts
import { GCode } from '../../../shared/gcode';
import { Pipe } from '../../../shared/pipe';

export class CustomPipe extends Pipe {
  input(gcode: GCode): void {}
}
```

Notify gcode processor that our pipe supports gcode comments

```ts
// my-custom-module/pipes/custom.pipe.ts
import { GCode, GCommand } from '../../../shared/gcode';
import { Pipe } from '../../../shared/pipe';

export class CustomPipe extends Pipe {
  constructor() {
    super();

    this.addSupportedGcodes([GCommand.COMMENT]);
  }

  input(gcode: GCode): void {}
}
```

To remove all the comment-only lines from the input
we can check if input command is a comment. If not - forward it
to the output. Otherwise, do nothing (effectively removing it)

```ts
// my-custom-module/pipes/custom.pipe.ts
import { GCode, GCommand } from '../../../shared/gcode';
import { Pipe } from '../../../shared/pipe';

export class CustomPipe extends Pipe {
  constructor() {
    super();

    this.addSupportedGcodes([GCommand.COMMENT]);
  }

  input(gcode: GCode): void {
    if (gcode.command !== GCommand.COMMENT) {
      this.output(gcode);
    }
  }
}
```
