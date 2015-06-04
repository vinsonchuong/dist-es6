import path from 'path';
import fs from 'fs-promise';
import {exec} from 'child-process-promise';
import rimraf from 'rimraf-promise';

export default class Directory {
  constructor(...directoryPath) {
    this.path = path.resolve(...directoryPath);
    fs.readdirSync(this.path);
  }

  async execNode(code) {
    const child = await exec(`node -e 'console.log(eval(process.env.code))'`, {
      cwd: this.path,
      env: {code}
    });
    return child.stdout.trim();
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
    const childFileContents = (
      typeof contents === 'object' ? JSON.stringify(contents) :
      contents
    );
    await rimraf(childFilePath);
    await fs.writeFile(childFilePath, childFileContents);
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
