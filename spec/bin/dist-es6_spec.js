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
});
