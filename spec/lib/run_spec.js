import * as path from 'path';
import {fs, childProcess} from 'node-promise-es6';
import * as fse from 'fs-extra-promise-es6';

describe('run', () => {
  afterEach(async () => {
    await fse.remove(path.resolve('project'));
  });

  it('runs ES.next code', async () => {
    const projectPath = path.resolve('project');

    await fs.mkdir(projectPath);
    await fs.writeFile(path.join(projectPath, 'bin.js'), `
      require('dist-es6/lib/run').module('${path.join(projectPath, 'lib.js')}');
    `);
    await fs.writeFile(path.join(projectPath, 'lib.js'), `
      import * as path from 'path';
      console.log(path.resolve());
    `);

    const {stdout: output} = await childProcess.exec('node bin.js', {
      cwd: projectPath
    });
    expect(output.trim()).toBe(projectPath);
  });
});
