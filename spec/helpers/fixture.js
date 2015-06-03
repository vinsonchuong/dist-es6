import path from 'path';
import fs from 'fs-promise';
import {exec} from 'child-process-promise';
import rimraf from 'rimraf-promise';

const fixtures = [];

export default class Fixture {
  static async clean() {
    while (fixtures.length > 0) {
      const directory = fixtures.pop().path;
      if (!directory) { continue; }
      await rimraf(directory);
    }
  }

  constructor(packageJson) {
    this.packageJson = Object.assign({
      version: '0.0.1',
      private: true
    }, packageJson);
    fixtures.push(this);
  }

  async mkdir(directoryPath = '') {
    if (!this.path) { return; }
    await fs.mkdir(path.join(this.path, directoryPath));
  }

  async writeFile(filePath, contents) {
    if (!this.path) { return; }
    const contentString = (
      typeof contents === 'string' ? contents :
      JSON.stringify(contents, null, 2)
    );
    await fs.writeFile(path.join(this.path, filePath), contentString);
  }

  async write() {
    if (this.path) { return; }
    this.path = path.resolve(this.packageJson.name);
    await this.mkdir();
    await this.writeFile('package.json', this.packageJson);
    await this.writeFile(
      'index.js',
      `#!/usr/bin/env node\nprocess.stdout.write('index.js\\n')`
    );
    for (const binName of Object.keys(Object(this.packageJson.bin))) {
      await this.writeFile(
        this.packageJson.bin[binName],
        `#!/usr/bin/env node\nprocess.stdout.write('${binName}\\n')`
      );
      await fs.chmod(
        path.join(this.path, this.packageJson.bin[binName]),
        '755'
      );
    }
  }

  async exec(command) {
    await this.write();
    const child = await exec(command, {cwd: this.path});
    return child.stdout.trim();
  }

  async link(packageDirectory) {
    await this.write();
    await this.mkdir('node_modules');
    await this.mkdir('node_modules/.bin');

    const packagePath = path.resolve(packageDirectory);
    const packageJson = JSON.parse(await fs.readFile(
      path.join(packagePath, 'package.json'),
      'utf8'
    ));

    await fs.symlink(
      packagePath,
      path.join(this.path, 'node_modules', packageJson.name)
    );

    for (const bin of Object.keys(packageJson.bin)) {
      const binPath = path.join(packagePath, packageJson.bin[bin]);
      await fs.symlink(binPath, path.join(this.path, 'node_modules/.bin', bin));
      await fs.chmod(binPath, '755');
    }
  }

  async install() {
    await this.write();
    return await this.exec('npm install');
  }

  async resolve(modulePath = this.packageJson.name) {
    await this.write();
    return await this.exec(
      `node -e 'console.log(require.resolve("${modulePath}"))'`
    );
  }

  async script(scriptName) {
    await this.write();
    const stdout = await this.exec(`npm run-script ${scriptName}`);
    return stdout.split('\n').splice(-1)[0];
  }
}
