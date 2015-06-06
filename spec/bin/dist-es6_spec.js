import Directory from '../../src/lib/directory';
import Project from '../../src/lib/project';

import install from 'jasmine-es6';
install();

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
      private: true,
      scripts: {
        prepublish: 'dist-es6'
      }
    });
    await project.directory.writeFile(
      'index.js',
      `module.exports = 'project main'`
    );
    await project.link('.');
    await project.directory.execSh('npm install');

    expect(await project.directory.execNode(`require('project')`))
      .toBe('project main');
  });

  it('enables linkDependencies to be imported by name', async function() {
    const linkDependency = new Project('link-dependency');
    await linkDependency.directory.writeFile('package.json', {
      name: 'link-dependency',
      private: true
    });
    await linkDependency.directory.writeFile(
      'index.js',
      `module.exports = 'link dependency main'`
    );

    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      private: true,
      linkDependencies: {
        'link-dependency': linkDependency.directory.path
      },
      scripts: {
        prepublish: 'dist-es6'
      }
    });
    await project.directory.writeFile(
      'index.js',
      `module.exports = require('link-dependency')`
    );
    await project.link('.');
    await project.directory.execSh('npm install');

    expect(await project.directory.execNode(`require('project')`))
      .toBe('link dependency main');
  });

  it('compiles JS from the src directory to the dist directory', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      private: true,
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
    await project.link('.');
    await project.directory.execSh('npm install');

    expect(await project.directory.execNode(`require('./dist')`))
      .toBe('main');
  });

  it('maps executables correctly', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      private: true,
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
    await project.link('.');
    await project.directory.execSh('npm install');

    const distDirectory = await project.directory.mkdir('dist');
    const {bin: binConfig} = await distDirectory.readFile('package.json');
    expect(binConfig).toEqual({'bin-name': 'bin-file.js'});
    expect(await distDirectory.execSh('./bin-file.js')).toBe('bin text');
  });

  it('adds other whitelisted files to dist', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      private: true,
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
    await project.directory.writeFile('README.md', '# Project');
    await project.directory.writeFile('.travis.yml', '---');
    await project.link('.');
    await project.directory.execSh('npm install');

    const distDirectory = await project.directory.mkdir('dist');
    const distDirectoryFiles = await distDirectory.ls();
    expect(await distDirectory.readFile('README.md')).toBe('# Project');
    expect(distDirectoryFiles.sort())
      .toEqual(['README.md', 'main.js', 'package.json'].sort());
  });

  it('clears the dist directory before compilation', async function() {
    const project = new Project('project');
    await project.directory.writeFile('package.json', {
      name: 'project',
      private: true,
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
    await project.link('.');

    const distDirectory = await project.directory.mkdir('dist');
    await distDirectory.writeFile('extra-file', 'extra text');

    await project.directory.execSh('npm install');
    const distDirectoryFiles = await distDirectory.ls();
    expect(distDirectoryFiles).not.toContain('extra-file');
  });
});
