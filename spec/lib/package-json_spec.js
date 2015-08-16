import PackageJson from 'dist-es6/lib/package-json';

describe('PackageJson', () => {
  describe('making the paths relative to another directory', () => {
    it('returns a new PackageJson with the updated paths', () => {
      const packageJson = new PackageJson({
        name: 'project',
        files: ['LICENSE', 'README.md', 'src'],
        main: 'src/index.js',
        bin: {
          project: 'src/bin/project.js'
        }
      });

      const movedPackageJson = packageJson.moveTo('src');
      expect(movedPackageJson instanceof PackageJson).toBe(true);
      expect(movedPackageJson.toJSON()).toEqual({
        name: 'project',
        files: ['../LICENSE', '../README.md', ''],
        main: 'index.js',
        bin: {
          project: 'bin/project.js'
        }
      });
    });

    it('ignores missing keys', () => {
      expect(
        new PackageJson({
          name: 'project',
          main: 'src/index.js',
          bin: {
            project: 'src/bin/project.js'
          }
        }).moveTo('src').toJSON()
      ).toEqual(
        {
          name: 'project',
          main: 'index.js',
          bin: {
            project: 'bin/project.js'
          }
        }
      );

      expect(
        new PackageJson({
          name: 'project',
          files: ['LICENSE', 'README.md', 'src'],
          bin: {
            project: 'src/bin/project.js'
          }
        }).moveTo('src').toJSON()
      ).toEqual(
        {
          name: 'project',
          files: ['../LICENSE', '../README.md', ''],
          bin: {
            project: 'bin/project.js'
          }
        }
      );

      expect(
        new PackageJson({
          name: 'project',
          files: ['LICENSE', 'README.md', 'src'],
          main: 'src/index.js'
        }).moveTo('src').toJSON()
      ).toEqual(
        {
          name: 'project',
          files: ['../LICENSE', '../README.md', ''],
          main: 'index.js'
        }
      );
    });
  });

  it('can return only the keys that are relevant for production', () => {
    const packageJson = new PackageJson({
      name: 'project',
      files: ['LICENSE', 'README.md', 'src'],
      main: 'src/index.js',
      bin: {
        project: 'src/bin/project.js'
      },
      scripts: {
        prepublish: 'dist-es6',
        test: 'eslint && jasmine'
      }
    });

    expect(packageJson.toProduction().toJSON()).toEqual({
      name: 'project',
      main: 'src/index.js',
      bin: {
        project: 'src/bin/project.js'
      },
      scripts: {
        test: 'eslint && jasmine'
      }
    });
  });

  it('adds the babel-runtime as a dependency', () => {
    expect(
      new PackageJson({
        name: 'project'
      }).addBabelRuntime().toJSON()
    ).toEqual({
      name: 'project',
      dependencies: {
        'babel-runtime': `<= ${require('babel/package.json').version}`
      }
    });

    expect(
      new PackageJson({
        name: 'project',
        dependencies: {
          'foo-bar': '1.0.0'
        }
      }).addBabelRuntime().toJSON()
    ).toEqual({
      name: 'project',
      dependencies: {
        'foo-bar': '1.0.0',
        'babel-runtime': `<= ${require('babel/package.json').version}`
      }
    });
  });
});
