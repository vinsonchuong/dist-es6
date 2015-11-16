import Directory from 'dist-es6/lib/directory';
import Project from 'dist-es6/lib/project';

describe('Project', () => {
  it('can read the package.json', async () => {
    const project = new Project();
    expect(await project.packageJson())
      .toEqual(await new Directory().readFile('package.json'));
  });

  describe('linking local packages', () => {
    afterEach(async () => {
      await new Directory().rm('project');
      await new Directory().rm('linked');
    });

    it('links a package into a project', async () => {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project'
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked'
      });
      const srcDirectory = await linkedDirectory.mkdir('src');
      await srcDirectory.writeFile(
        'index.js',
        `module.exports = 'linked package'`
      );

      const project = new Project(projectDirectory.path);
      await project.link(linkedDirectory.path);

      expect(await projectDirectory.execNode(`require('linked')`))
        .toBe('linked package');
    });

    it('also links any executables provided by the package', async () => {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        scripts: {
          'linked-bin': 'bin-name',
          'es6-bin': 'es6-bin'
        }
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked',
        bin: {
          'bin-name': 'src/bin-file.js',
          'es6-bin': 'src/es6-bin-file.js'
        }
      });
      const srcDirectory = await linkedDirectory.mkdir('src');
      await srcDirectory.writeFile(
        'bin-file.js',
        `#!/usr/bin/env node
        require('babel-core/register')({presets: ['es2015', 'stage-0']});
        console.log('linked-bin')`
      );
      await srcDirectory.writeFile(
        'es6-bin-file.js',
        `const {text} = {text: 'es6 bin'}; console.log(text)`
      );

      const project = new Project(projectDirectory.path);
      await project.link(linkedDirectory.path);

      const binOutput = await projectDirectory.execSh(`npm run linked-bin`);
      expect(binOutput.split('\n').slice(-1)[0]).toBe('linked-bin');

      const es6BinOutput = await projectDirectory.execSh(`npm run es6-bin`);
      expect(es6BinOutput.split('\n').slice(-1)[0]).toBe('es6 bin');
    });

    it('installs any runtime dependencies of the linked package', async () => {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project'
      });

      const linkedDirectory = await new Directory().mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked',
        dependencies: {
          jquery: '2.1.4'
        }
      });

      const project = new Project(projectDirectory.path);
      await project.link(linkedDirectory.path);

      expect(
        await projectDirectory.readFile('node_modules/jquery/package.json')
      ).toEqual(jasmine.objectContaining({version: '2.1.4'}));
    }, 60000);

    it('can link packages containing ES6 executables', async () => {
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
          'bin-name': 'src/bin-file.js'
        }
      });
      const srcDirectory = await linkedDirectory.mkdir('src');
      await srcDirectory.writeFile(
        'bin-file.js',
        `const {name} = {name: 'linked-bin'}; console.log(name)`
      );

      const project = new Project(projectDirectory.path);
      await project.link(linkedDirectory.path);

      const output = await projectDirectory.execSh(`npm run linked-bin`);
      expect(output.split('\n').slice(-1)[0]).toBe('linked-bin');
    });

    it('can change the root directory of a linked package', async () => {
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

    it('can link packages listed in linkDependencies as well as the current package', async () => {
      const rootDirectory = new Directory();

      const linkedDirectory = await rootDirectory.mkdir('linked');
      await linkedDirectory.writeFile('package.json', {
        name: 'linked'
      });
      const linkedSrcDirectory = await linkedDirectory.mkdir('src');
      await linkedSrcDirectory.writeFile(
        'index.js',
        `module.exports = 'link dependency main'`
      );

      const projectDirectory = await rootDirectory.mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        main: 'src/index.js',
        linkDependencies: {
          linked: linkedDirectory.path
        }
      });
      const srcDirectory = await projectDirectory.mkdir('src');
      await srcDirectory.writeFile(
        'index.js',
        `module.exports = require('linked')`
      );
      const project = new Project('project');

      await project.linkAll();

      expect(await projectDirectory.execNode(`require('project')`))
        .toBe('link dependency main');
    });
  });

  describe('compiling the project', () => {
    afterEach(async () => {
      await new Directory().rm('project');
      await new Directory().rm('user');
    });

    it('clears the dist directory', async () => {
      const projectDirectory = await new Directory().mkdir('project');
      const distDirectory = await projectDirectory.mkdir('dist');
      await projectDirectory.writeFile('package.json', {
        name: 'project'
      });
      await distDirectory.writeFile('file', 'file text');

      const project = new Project('project');
      await project.compile();
      expect(await distDirectory.ls()).not.toContain('file');
    });

    it('copies package.json to dist, excluding unnecessary keys and adding the babel-runtime', async () => {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        files: ['src'],
        main: 'src/main.js',
        scripts: {
          prepublish: 'dist-es6',
          test: 'eslint && jasmine'
        },
        dependencies: {
          foo: '1.0.0'
        }
      });

      const project = new Project('project');
      await project.compile();

      const distDirectory = await projectDirectory.mkdir('dist');
      expect(await distDirectory.readFile('package.json')).toEqual({
        name: 'project',
        main: 'main.js',
        scripts: {
          test: 'eslint && jasmine'
        },
        dependencies: {
          'foo': '1.0.0',
          'babel-runtime': `^${require('babel/package.json').version}`
        }
      });
    });

    it('copies whitelisted files to dist', async () => {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        files: ['LICENSE', 'README.md', 'src']
      });
      await projectDirectory.writeFile('LICENSE', 'license text');
      await projectDirectory.writeFile('README.md', '# Project');
      const srcDirectory = await projectDirectory.mkdir('src');
      await srcDirectory.writeFile('config.json', {foo: 'bar'});

      const project = new Project('project');
      await project.compile();

      const distDirectory = await projectDirectory.mkdir('dist');
      expect(await distDirectory.readFile('LICENSE')).toBe('license text');
      expect(await distDirectory.readFile('README.md')).toBe('# Project');
      expect(await distDirectory.readFile('config.json')).toEqual({foo: 'bar'});
    });

    it('compiles ES6+ JS from src into dist', async () => {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        files: ['src'],
        main: 'src/main.js'
      });
      const srcDirectory = await projectDirectory.mkdir('src');
      await srcDirectory.writeFile(
        'main.js',
        `
          export async function fn() {}
          export default 'main code';
        `
      );

      const project = new Project('project');
      await project.compile();

      const distDirectory = await projectDirectory.mkdir('dist');
      await distDirectory.execSh('npm install');
      expect(await distDirectory.execNode(`require('./').default`))
        .toBe('main code');
      expect(await distDirectory.readFile('main.js'))
        .toContain('babel-runtime');
    }, 60000);

    it('compiles executables correctly', async () => {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        version: '0.0.1',
        files: ['src'],
        bin: {
          'bin-name': 'src/bin/bin-file.js'
        }
      });
      const srcDirectory = await projectDirectory.mkdir('src');
      const binDirectory = await srcDirectory.mkdir('bin');
      await binDirectory.writeFile(
        'bin-file.js',
        `
          export async function fn() {}
          export default 'main code';
        `
      );

      const project = new Project('project');
      await project.compile();

      const userDirectory = await new Directory().mkdir('user');
      await userDirectory.writeFile('package.json', {
        name: 'user',
        scripts: {
          'bin-name': 'bin-name'
        },
        dependencies: {
          project: 'file:../project/dist'
        }
      });
      await userDirectory.execSh('npm install');
      expect(await userDirectory.execSh('npm run bin-name'))
        .toContain('2, 4, 6');
    }, 60000);
  });
});
