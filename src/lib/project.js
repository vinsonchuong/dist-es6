import Directory from 'dist-es6/lib/directory';

const babelRegisterPath = require.resolve('babel/register');
function babelAdapter(jsFilePath) {
  return `#!/usr/bin/env node
'use strict';
require('${babelRegisterPath}')({
  stage: 0,
  optional: ['runtime']
});
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
        await bin.writeFile(
          binName,
          babelAdapter(packageDir.join(packageJson.bin[binName]))
        );
        await bin.chmod(binName, '755');
      });
  }
}
