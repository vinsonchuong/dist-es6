import Directory from '../../src/lib/directory';
import Project from '../../src/lib/project';

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
        name: 'project',
        private: true
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked',
        private: true
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
        private: true,
        scripts: {
          'linked-bin': 'bin-name'
        }
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked',
        private: true,
        bin: {
          'bin-name': 'bin-file.js'
        }
      });
      await linkedDirectory.writeFile('index.js', `console.log('linked')`);
      await linkedDirectory.writeFile(
        'bin-file.js',
        `#!/usr/bin/env node\nconsole.log('linked-bin')`
      );
      await linkedDirectory.chmod('bin-file.js', '755');

      const project = new Project(projectDirectory.path);
      await project.link(linkedDirectory.path);

      const output = await projectDirectory.execSh(`npm run linked-bin`);
      expect(output.split('\n').slice(-1)[0]).toBe('linked-bin');
    });

    it('can link packages containing ES6 executables', async function() {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        private: true,
        scripts: {
          'linked-bin': 'bin-name'
        }
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked',
        private: true,
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
  });
});
