import path from 'path';
import Fixture from '../helpers/fixture';

import install from 'jasmine-es6';
install();

describe('dist-es6', function() {
  afterEach(async function() {
    await Fixture.clean();
  });

  it('enables the current package to be imported by name', async function() {
    const fixture = new Fixture({
      name: 'project',
      scripts: {
        prepublish: 'dist-es6'
      }
    });

    await fixture.link('.');
    await fixture.install();
    expect(await fixture.resolve()).toBe(path.resolve('project/index.js'));
  });

  it('enables linkDependencies to be imported via symlink', async function() {
    const linkDependency1 = new Fixture({name: 'link-dependency-1'});
    await linkDependency1.install();

    const linkDependency2 = new Fixture({name: 'link-dependency-2'});
    await linkDependency2.install();

    const fixture = new Fixture({
      name: 'project',
      scripts: {
        prepublish: 'dist-es6'
      },
      linkDependencies: {
        'link-dependency-1': linkDependency1.path,
        'link-dependency-2': linkDependency2.path
      }
    });

    await fixture.link('.');
    await fixture.install();
    expect(await fixture.resolve('link-dependency-1'))
      .toBe(path.join(linkDependency1.path, 'index.js'));
    expect(await fixture.resolve('link-dependency-2'))
      .toBe(path.join(linkDependency2.path, 'index.js'));
  });

  it('links bins provided by the current package and its linkDependencies', async function() {
    const linkDependency = new Fixture({
      name: 'link-dependency',
      bin: {
        'link-bin-1': 'link-bin-1.js',
        'link-bin-2': 'link-bin-2.js'
      }
    });
    await linkDependency.install();

    const fixture = new Fixture({
      name: 'project',
      bin: {
        'project-bin': 'project-bin.js'
      },
      scripts: {
        prepublish: 'dist-es6',
        'link-bin-1': 'link-bin-1',
        'link-bin-2': 'link-bin-2',
        'project-bin': 'project-bin'
      },
      linkDependencies: {
        'link-dependency': linkDependency.path
      }
    });
    await fixture.link('.');
    await fixture.install();

    expect(await fixture.script('link-bin-1')).toBe('link-bin-1');
    expect(await fixture.script('link-bin-2')).toBe('link-bin-2');
    expect(await fixture.script('project-bin')).toBe('project-bin');
  });

  xit('replaces files and directories that already exist', async function() {
    const linkDependency = new Fixture({
      name: 'link-dependency',
      bin: {
        'link-bin': 'link-bin.js'
      }
    });
    await linkDependency.install();

    const fixture = new Fixture({
      name: 'project',
      bin: {
        'project-bin': 'project-bin.js'
      },
      scripts: {
        prepublish: 'dist-es6',
        'link-bin': 'link-bin',
        'project-bin': 'project-bin'
      },
      linkDependencies: {
        'link-dependency': linkDependency.path
      }
    });
    await fixture.link('.');
    await fixture.install();

    await linkDependency.install();
    await fixture.install();

    expect(await fixture.script('link-bin-1')).toBe('link-bin-1');
    expect(await fixture.script('link-bin-2')).toBe('link-bin-2');
    expect(await fixture.script('project-bin')).toBe('project-bin');
  });
});
