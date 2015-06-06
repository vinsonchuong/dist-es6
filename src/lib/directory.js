import path from 'path';
import fs from 'fs-promise';
import {exec} from 'child-process-promise';
import rimraf from 'rimraf-promise';

export default class Directory {
  constructor(...directoryPath) {
    this.path = path.resolve(...directoryPath);
    fs.readdirSync(this.path);
  }

  join(...joinPaths) {
    return path.join(this.path, ...joinPaths);
  }

  async execSh(command) {
    const child = await exec(command, {cwd: this.path});
    return child.stdout.trim();
  }

  async execNode(code) {
    const child = await exec(`node -e 'console.log(eval(process.env.code))'`, {
      cwd: this.path,
      env: Object.assign({}, process.env, {code})
    });
    return child.stdout.trim();
  }

  async chmod(childFileName, mode) {
    return await fs.chmod(this.join(childFileName), mode);
  }

  async ls() {
    return await fs.readdir(this.path);
  }

  async readFile(childFileName) {
    const contents = await fs.readFile(this.join(childFileName), 'utf8');
    return path.extname(childFileName) === '.json' ?
      JSON.parse(contents) :
      contents;
  }

  async writeFile(childFileName, contents) {
    const childFilePath = this.join(childFileName);
    const childFileContents = (
      typeof contents === 'object' ? JSON.stringify(contents) :
      contents
    );
    await rimraf(childFilePath);
    await fs.writeFile(childFilePath, childFileContents);
  }

  async mkdir(childDirectoryName) {
    try {
      await fs.mkdir(this.join(childDirectoryName));
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
    return new Directory(this.path, childDirectoryName);
  }

  async rm(childName = '') {
    await rimraf(this.join(childName));
  }

  async symlink(sourcePath, name) {
    const destinationPath = this.join(name);
    await rimraf(destinationPath);
    await fs.symlink(path.resolve(sourcePath), destinationPath);
  }
}
