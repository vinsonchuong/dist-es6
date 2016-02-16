import path from 'path';
import {fs, childProcess} from 'node-promise-es6';
import * as fse from 'fs-extra-promise-es6';

export default class Directory {
  constructor(...directoryPath) {
    this.path = path.resolve(...directoryPath);

    /* eslint-disable */
    fs.readdirSync(this.path);
    /* eslint-enable */
  }

  join(...joinPaths) {
    return path.resolve(this.path, ...joinPaths);
  }

  async execSh(command) {
    const child = await childProcess.exec(command, {cwd: this.path});
    return child.stdout.trim();
  }

  async execNode(code) {
    const child = await childProcess.exec("node -e 'console.log(eval(process.env.code))'", {
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
    const childFileContents = typeof contents === 'object' ?
      JSON.stringify(contents) :
      contents;
    await fse.remove(childFilePath);
    await fs.writeFile(childFilePath, childFileContents);
  }

  async cp(sourcePath, name) {
    await fse.copy(path.resolve(sourcePath), this.join(name));
  }

  async mkdir(childDirectoryName) {
    try {
      await fs.mkdir(this.join(childDirectoryName));
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
    return new Directory(this.path, childDirectoryName);
  }

  async rm(childName = '') {
    await fse.remove(this.join(childName));
  }

  async symlink(sourcePath, name) {
    const destinationPath = this.join(name);
    await fse.remove(destinationPath);
    await fs.symlink(path.resolve(sourcePath), destinationPath);
  }
}
