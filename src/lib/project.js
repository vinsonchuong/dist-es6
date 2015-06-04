import Directory from './directory';

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
    await nodeModules.symlink(packagePath, packageJson.name);

    const bin = await nodeModules.mkdir('.bin');
    for (const binName of Object.keys(Object(packageJson.bin))) {
      await bin.symlink(
        packageDir.join(packageJson.bin[binName]),
        binName
      );
    }
  }
}
