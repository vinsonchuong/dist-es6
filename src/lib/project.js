import Directory from './directory';
import PackageJson from '../lib/package-json';

function binAdapter(packageJson, packagePath, binPath, babel = true) {
  if (!babel) {
    return `#!/usr/bin/env node
'use strict';
require('register-module')({
  name: ${JSON.stringify(packageJson.name)},
  path: ${JSON.stringify(packagePath)},
  main: ${JSON.stringify(packageJson.main || 'index.js')}
});
require('${binPath}');
`;
  }

  return `#!/usr/bin/env node
'use strict';
require('dist-es6/lib/run').module('${binPath}');
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

  async linkBins() {
    const packageJson = await this.packageJson();
    const nodeModules = await this.directory.mkdir('node_modules');
    const bin = await nodeModules.mkdir('.bin');

    await Promise.all(Object.entries(Object(packageJson.bin))
      .map(async ([binName, binPath]) => {
        const binContents = await this.directory.readFile(binPath);
        await bin.writeFile(
          binName,
          binAdapter(
            packageJson,
            this.directory.join('src'),
            this.directory.join(binPath),
            binContents.indexOf('#!/usr/bin/env node') !== 0
          )
        );
        await bin.chmod(binName, '755');
      }));
  }

  async compile() {
    await this.directory.rm('dist');
    const distDirectory = await this.directory.mkdir('dist');

    const packageJson = await this.packageJson();
    const distPackageJson = new PackageJson(packageJson)
      .moveTo('src')
      .toProduction()
      .addBabelRuntime()
      .toJSON();

    await distDirectory.writeFile('package.json', distPackageJson);

    await Promise.all(
      (packageJson.files || [])
      .filter((fileName) => fileName.indexOf('src') !== 0)
      .map((fileName) => distDirectory.cp(this.directory.join(fileName), fileName))
    );

    await this.directory.mkdir('src');
    await this.directory.execSh([
      `'${require.resolve('babel-cli/bin/babel')}'`,
      '--presets es2015,stage-0',
      '--plugins transform-decorators-legacy,transform-runtime',
      '--copy-files',
      'src',
      '--out-dir dist'
    ].join(' '));

    const {bin = {}} = distPackageJson;
    const shebang = '#!/usr/bin/env node';
    await Promise.all(
      Object.keys(bin).map(async (binName) => {
        const binPath = bin[binName];
        const binContents = await distDirectory.readFile(binPath);
        await distDirectory.writeFile(
          binPath,
          binContents.indexOf(shebang) === 0 ?
            binContents :
            `${shebang}\n${binContents}`
        );
        await distDirectory.chmod(binPath, '755');
      })
    );
  }
}
