import Directory from 'dist-es6/lib/directory';
import Project from 'dist-es6/lib/project';

describe('Project', () => {
  it('can read the package.json', async () => {
    const project = new Project();
    expect(await project.packageJson())
      .toEqual(await new Directory().readFile('package.json'));
  });

  describe('creating bin adapters for the project', () => {
    afterEach(async () => {
      await new Directory().rm('project');
    });

    it('creates adapters for each executable', async () => {
      const projectDirectory = await new Directory().mkdir('project');
      await projectDirectory.writeFile('package.json', {
        name: 'project',
        bin: {
          'esnext': 'src/esnext.js',
          'es5': 'src/es5.js'
        },
        scripts: {
          "esnext": "esnext",
          "es5": "es5"
        }
      });

      const srcDirectory = await projectDirectory.mkdir('src');
      await srcDirectory.writeFile(
        'lib.js',
        `
        import * as path from 'path';
        export default function() {
          return path.resolve();
        }
        `
      )
      await srcDirectory.writeFile(
        'esnext.js',
        `
        import lib from 'project/src/lib';

        function classDecorator() {}

        @classDecorator
        class Foo {}

        process.stdout.write(lib());`
      );
      await srcDirectory.writeFile(
        'es5.js',
        [
          '#!/usr/bin/env node',
          "require('babel-register')({presets: ['es2015', 'stage-0']});",
          "process.stdout.write('es5');"
        ].join('\n')
      );

      const project = new Project('project');
      await project.linkBins();

      const esnextOutput = await projectDirectory.execSh('npm run esnext');
      expect(esnextOutput.split('\n').slice(-1)[0]).toBe(projectDirectory.path);

      const es5Output = await projectDirectory.execSh('npm run es5');
      expect(es5Output.split('\n').slice(-1)[0]).toBe('es5');
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

      /* eslint-disable lines-around-comment, global-require */
      const [, runtimeVersion] = require('babel/package.json').version
        .match(/^(\d+\.\d+)\.\d+$/);
      /* eslint-enable lines-around-comment, global-require */

      const distDirectory = await projectDirectory.mkdir('dist');
      expect(await distDirectory.readFile('package.json')).toEqual({
        name: 'project',
        main: 'main.js',
        scripts: {
          test: 'eslint && jasmine'
        },
        dependencies: {
          'foo': '1.0.0',
          'babel-runtime': `^${runtimeVersion}`
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
          function methodDecorator() {}
          export class Foo {
            @methodDecorator
            method() {}
          }
          export async function fn() {}
          export default 'main code';
        `
      );

      const project = new Project('project');
      await project.compile();

      const distDirectory = await projectDirectory.mkdir('dist');
      await distDirectory.execSh('npm install');
      expect(await distDirectory.execNode("require('./').default"))
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
          function methodDecorator() {}
          class Foo {
            @methodDecorator
            method() {}
          }
          async function fn() {
            console.log('1, 2, 3');
          }
          fn();
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
        .toContain('1, 2, 3');
    }, 60000);
  });
});
