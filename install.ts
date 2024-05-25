import os from 'os';
import fs from 'fs';
import path from 'path';
import clc from 'cli-color';

// Writing .cmd for all systems to allow cross-platform profile sync in PrusaSlicer
const outputFilePath = path.resolve('./run-post-processing.cmd');
const entryPointPath = path.resolve('./dist/index.js');

switch (os.type()) {
  case 'Linux':
  case 'Darwin':
    installShellScript();
    break;

  case 'Windows_NT':
    installCMDScript();
    break;

  default:
    throw new Error(`Your system type is not supported (${os.type})`);
}

function installShellScript() {
  const nodeExecutablePath = process.execPath;
  const dirPath = path.parse(path.resolve(process.argv[1])).dir;
  const payload = `
#!/bin/bash

if !("${nodeExecutablePath}" "${entryPointPath}" $@); then
  echo 
  echo "Post-processing script has encountered an error."
  echo "Press enter to close..."
  read
fi
`;

  fs.writeFileSync(outputFilePath, payload.trim());
  fs.chmodSync(outputFilePath, 0o755);

  console.log();
  console.log();
  console.log(clc.bold.green('GCode post-processing script was successfully installed!'));
  console.log('You can add the following command to the PrusaSlicer to use it:');
  console.log(clc.bold(`  ${outputFilePath}`));
  console.log();

  console.log('To see available available arguments, run:');
  console.log(clc.yellow(`  npm run start -- --help`));
  console.log();
}

function installCMDScript() {
  const nodeExecutablePath = process.execPath;
  const dirPath = path.parse(path.resolve(process.argv[1])).dir;
  const payload = `
@echo off

"${nodeExecutablePath}" "${entryPointPath}" %*

if %errorlevel% neq 0 (
  echo.
  echo Post-processing script has encountered an error.
  pause
)
`;

  fs.writeFileSync(outputFilePath, payload.trim());

  console.log();
  console.log();
  console.log(clc.bold.green('GCode post-processing script was successfully installed!'));
  console.log('You can add the following command to the PrusaSlicer to use it:');
  console.log(clc.bold(`  ${outputFilePath}`));
  console.log();

  console.log('To see available available arguments, run:');
  console.log(clc.yellow(`  npm run start -- --help`));
  console.log();
}
