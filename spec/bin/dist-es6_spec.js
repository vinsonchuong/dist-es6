import Directory from 'dist-es6/lib/directory';
import Project from 'dist-es6/lib/project';

describe('dist-es6', function() {
  beforeEach(async function() {
    const cwd = new Directory();
    await cwd.mkdir('project');
    await cwd.mkdir('link-dependency');
  });

  afterEach(async function() {
    const cwd = new Directory();
    await cwd.rm('project');
    await cwd.rm('link-dependency');
  });

  it('enables the current package to be imported by name', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      main: 'src/index.js',
      scripts: {
        prepublish: 'dist-es6'
      }
    });
    const srcDirectory = await project.directory.mkdir('src');
    await srcDirectory.writeFile(
      'index.js',
      `module.exports = 'project main'`
    );
    const libDirectory = await srcDirectory.mkdir('lib');
    await libDirectory.writeFile(
      'lib.js',
      `module.exports = 'lib code'`
    );

    await project.link('.', 'src');
    await project.directory.execSh('npm install');

    expect(await project.directory.execNode(`require('project')`))
      .toBe('project main');
    expect(await project.directory.execNode(`require('project/lib/lib')`))
      .toBe('lib code');
  }, 30000);

  it('compiles ES6+ JS from the src directory to the dist directory', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      main: 'src/main.js',
      scripts: {
        prepublish: 'dist-es6'
      }
    });
    const srcDirectory = await project.directory.mkdir('src');
    await srcDirectory.writeFile(
      'main.js',
      `
        const nums = [1, 2, 3];
        export const x2 = [for (x of nums) 2 * x]
        export async function fn() {}
        export default 'main';
      `
    );
    await project.link('.', 'src');
    await project.directory.execSh('npm install');

    const distDirectory = await project.directory.mkdir('dist');
    await distDirectory.execSh('npm install');
    expect(await project.directory.execNode(`require('./dist').default`))
      .toBe('main');
    expect(await distDirectory.readFile('main.js'))
      .toContain('babel-runtime');
    expect(await distDirectory.readFile('package.json'))
      .toEqual(jasmine.objectContaining({
        dependencies: {
          'babel-runtime': jasmine.any(String)
        }
      }));
  }, 30000);

  it('maps executables correctly', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      main: 'src/main.js',
      bin: {
        'bin-name': 'src/bin-file.js'
      },
      scripts: {
        prepublish: 'dist-es6'
      }
    });
    const srcDirectory = await project.directory.mkdir('src');
    await srcDirectory.writeFile(
      'main.js',
      `export default 'main'`
    );
    await srcDirectory.writeFile(
      'bin-file.js',
      `console.log('bin text')`
    );
    await project.link('.', 'src');
    await project.directory.execSh('npm install');

    const distDirectory = await project.directory.mkdir('dist');
    const {bin: binConfig} = await distDirectory.readFile('package.json');
    expect(binConfig).toEqual({'bin-name': 'bin-file.js'});
    expect(await distDirectory.execSh('./bin-file.js')).toBe('bin text');
  }, 30000);

  it('adds other whitelisted files to dist', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      files: ['src', 'README.md'],
      main: 'src/main.js',
      scripts: {
        prepublish: 'dist-es6'
      }
    });
    const srcDirectory = await project.directory.mkdir('src');
    await srcDirectory.writeFile(
      'main.js',
      `export default 'main'`
    );
    await srcDirectory.writeFile(
      'config.json',
      {foo: 'bar'}
    );
    await project.directory.writeFile('README.md', '# Project');
    await project.directory.writeFile('.travis.yml', '---');
    await project.link('.', 'src');
    await project.directory.execSh('npm install');

    const distDirectory = await project.directory.mkdir('dist');
    const distDirectoryFiles = await distDirectory.ls();
    expect(await distDirectory.readFile('README.md')).toBe('# Project');
    expect(await distDirectory.readFile('config.json')).toEqual({foo: 'bar'});
    expect(distDirectoryFiles.sort())
      .toEqual(['README.md', 'main.js', 'package.json', 'config.json'].sort());
  }, 30000);

  it('clears the dist directory before compilation', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      main: 'src/main.js',
      scripts: {
        prepublish: 'dist-es6'
      }
    });
    const srcDirectory = await project.directory.mkdir('src');
    await srcDirectory.writeFile(
      'main.js',
      `export default 'main'`
    );
    await project.link('.', 'src');

    const distDirectory = await project.directory.mkdir('dist');
    await distDirectory.writeFile('extra-file', 'extra text');

    await project.directory.execSh('npm install');
    const distDirectoryFiles = await distDirectory.ls();
    expect(distDirectoryFiles).not.toContain('extra-file');
  }, 30000);

  it('removes unnecessary keys from the package.json', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      files: ['src', 'README.md'],
      main: 'src/main.js',
      scripts: {
        prepublish: 'dist-es6'
      }
    });
    await project.directory.writeFile('README.md', '# Project');

    const srcDirectory = await project.directory.mkdir('src');
    await srcDirectory.writeFile(
      'main.js',
      `export default 'main'`
    );

    await project.link('.', 'src');
    await project.directory.execSh('npm install');

    const distDirectory = await project.directory.mkdir('dist');
    expect(await distDirectory.readFile('package.json')).toEqual({
      name: 'project',
      main: 'main.js',
      scripts: {},
      dependencies: jasmine.any(Object)
    });
  }, 30000);
});
