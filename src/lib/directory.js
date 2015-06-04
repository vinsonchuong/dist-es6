import path from 'path';
import fs from 'fs-promise';
import rimraf from 'rimraf-promise';

export default class Directory {
  constructor(...directoryPath) {
    this.path = path.resolve(...directoryPath);
    fs.readdirSync(this.path);
  }

  async readFile(childFileName) {
    const contents = await fs.readFile(
      path.join(this.path, childFileName), 'utf8');
    return path.extname(childFileName) === '.json' ?
      JSON.parse(contents) :
      contents;
  }

  async writeFile(childFileName, contents) {
    const childFilePath = path.join(this.path, childFileName);
    await rimraf(childFilePath);
    await fs.writeFile(childFilePath, contents);
  }

  async mkdir(childDirectoryName) {
    try {
      await fs.mkdir(path.join(this.path, childDirectoryName));
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
    return new Directory(this.path, childDirectoryName);
  }

  async rm(childName = '') {
    await rimraf(path.join(this.path, childName));
  }

  async symlink(sourcePath, name) {
    const destinationPath = path.resolve(this.path, name);
    await rimraf(destinationPath);
    await fs.symlink(path.resolve(sourcePath), destinationPath);
  }
}
