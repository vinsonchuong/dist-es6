import Directory from './directory';
import fs from 'node-promise-es6/fs';

const babelRegisterPath = require.resolve('babel/register');
function binAdapter(jsFilePath, babel = true) {
  return `#!/usr/bin/env node
'use strict';
${babel ? `require('${babelRegisterPath}')({stage: 0});` : ''}
require('${jsFilePath}');
`;
}

export default class Project {
  constructor(...projectPath) {
    this.directory = new Directory(...projectPath);
  }

  async packageJson() {
    if (!this.cachedPackageJson) {
      this.cachedPackageJson = await this.directory.readFile('package.json');
    }
    return this.cachedPackageJson;
  }

  async link(packagePath, rootDirectory = '') {
    const packageDir = new Directory(packagePath);
    const [packageJson, nodeModules] = await* [
      packageDir.readFile('package.json'),
      this.directory.mkdir('node_modules')
    ];
    const [bin] = await* [
      await nodeModules.mkdir('.bin'),
      nodeModules.symlink(packageDir.join(rootDirectory), packageJson.name)
    ];
    await* Object.keys(Object(packageJson.bin))
      .map(async binName => {
        const binPath = packageDir.join(packageJson.bin[binName]);
        const binContents = await fs.readFile(binPath, 'utf8');
        await bin.writeFile(
          binName,
          binAdapter(
            binPath,
            binContents.indexOf('#!/usr/bin/env node') !== 0
          )
        );
        await bin.chmod(binName, '755');
      });
  }
}
