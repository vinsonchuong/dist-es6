import Directory from './directory';

const babelRegisterPath = require.resolve('babel/register');
function babelAdapter(jsFilePath) {
  return `#!/usr/bin/env node
'use strict';
require('${babelRegisterPath}');
module.exports = require('${jsFilePath}');
`;
}

export default class Project {
  constructor(...projectPath) {
    this.directory = new Directory(...projectPath);
  }

  async packageJson() {
    return await this.directory.readFile('package.json');
  }

  async link(packagePath) {
    const packageDir = new Directory(packagePath);
    const packageJson = await packageDir.readFile('package.json');

    const nodeModules = await this.directory.mkdir('node_modules');

    const linkedPackageDir = await nodeModules.mkdir(packageJson.name);
    await linkedPackageDir.writeFile(
      'index.js',
      babelAdapter(packageDir.path)
    );

    const bin = await nodeModules.mkdir('.bin');
    for (const binName of Object.keys(Object(packageJson.bin))) {
      await bin.writeFile(
        binName,
        babelAdapter(packageDir.join(packageJson.bin[binName]))
      );
      await bin.chmod(binName, '755');
    }
  }
}
