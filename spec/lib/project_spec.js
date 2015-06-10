import Directory from 'dist-es6/lib/directory';
import Project from 'dist-es6/lib/project';

import install from 'jasmine-es6';
install();

describe('Project', function() {
  it('can read the package.json', async function() {
    const project = new Project();
    expect(await project.packageJson())
      .toEqual(await new Directory().readFile('package.json'));
  });

  describe('linking local packages', function() {
    afterEach(async function() {
      await new Directory().rm('project');
      await new Directory().rm('linked');
    });

    it('links a package into a project', async function() {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project'
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked'
      });
      linkedDirectory.writeFile(
        'index.js',
        `module.exports = 'linked package'`
      );

      const project = new Project(projectDirectory.path);
      await project.link(linkedDirectory.path);

      expect(await projectDirectory.execNode(`require('linked')`))
        .toBe('linked package');
    });

    it('also links any executables provided by the package', async function() {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        scripts: {
          'linked-bin': 'bin-name'
        }
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked',
        bin: {
          'bin-name': 'bin-file.js'
        }
      });
      await linkedDirectory.writeFile('index.js', `console.log('linked')`);
      await linkedDirectory.writeFile(
        'bin-file.js',
        `#!/usr/bin/env node\nconsole.log('linked-bin')`
      );

      const project = new Project(projectDirectory.path);
      await project.link(linkedDirectory.path);

      const output = await projectDirectory.execSh(`npm run linked-bin`);
      expect(output.split('\n').slice(-1)[0]).toBe('linked-bin');
    });

    it('can link packages containing ES6 executables', async function() {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        scripts: {
          'linked-bin': 'bin-name'
        }
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked',
        bin: {
          'bin-name': 'bin-file.js'
        }
      });
      await linkedDirectory.writeFile(
        'bin-file.js',
        `const {name} = {name: 'linked-bin'}; console.log(name)`
      );

      const project = new Project(projectDirectory.path);
      await project.link(linkedDirectory.path);

      const output = await projectDirectory.execSh(`npm run linked-bin`);
      expect(output.split('\n').slice(-1)[0]).toBe('linked-bin');
    });

    it('can change the root directory of a linked package', async function() {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        scripts: {
          'linked-bin': 'bin-name'
        }
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked',
        main: 'src/index.js',
        bin: {
          'bin-name': 'src/bin/bin-file.js'
        }
      });
      const srcDirectory = await linkedDirectory.mkdir('src');
      srcDirectory.writeFile(
        'index.js',
        `module.exports = 'linked package'`
      );
      const libDirectory = await srcDirectory.mkdir('lib');
      await libDirectory.writeFile(
        'lib.js',
        `module.exports = 'lib code'`
      );
      const binDirectory = await srcDirectory.mkdir('bin');
      await binDirectory.writeFile(
        'bin-file.js',
        `#!/usr/bin/env node\nconsole.log('linked-bin')`
      );

      const project = new Project(projectDirectory.path);
      await project.link(linkedDirectory.path, 'src');

      expect(await projectDirectory.execNode(`require('linked')`))
        .toBe('linked package');
      expect(await projectDirectory.execNode(`require('linked/lib/lib')`))
        .toBe('lib code');

      const output = await projectDirectory.execSh(`npm run linked-bin`);
      expect(output.split('\n').slice(-1)[0]).toBe('linked-bin');
    });
  });
});
