import path from 'path';
import fs from 'fs-promise';
import rimraf from 'rimraf-promise';
import Directory from '../../src/lib/directory';

import install from 'jasmine-es6';
install();

describe('Directory', function() {
  it('requires the given directory to exist', async function() {
    const existingDirectory = new Directory();
    expect(existingDirectory.path).toBe(path.resolve());

    expect(() => new Directory('missing')).toThrowError(/ENOENT/);
  });

  describe('creating child directories', function() {
    afterEach(async function() {
      await rimraf(path.resolve('child-directory'));
    });

    it('creates a child directory if one with the same name does not already exist', async function() {
      const directory = new Directory();
      await directory.mkdir('child-directory');
      expect(await fs.readdir(path.resolve())).toContain('child-directory');
    });

    it('returns an instance of Directory', async function() {
      const directory = new Directory();
      const childDirectory = await directory.mkdir('child-directory');
      expect(childDirectory.path).toBe(path.resolve('child-directory'));
      expect(childDirectory instanceof Directory).toBe(true);
    });

    it('does nothing if a child directory with the same name already exists', async function() {
      const directory = new Directory();
      const childDirectoryPath = path.resolve('node_modules');
      const childDirectoryContents = await fs.readdir(childDirectoryPath);
      await directory.mkdir('node_modules');
      expect(await fs.readdir(childDirectoryPath))
        .toEqual(childDirectoryContents);
    });

    it('still returns an instance of Directory if a child directory with the same name already exists', async function() {
      const directory = new Directory();
      const childDirectory = await directory.mkdir('node_modules');
      expect(childDirectory.path).toBe(path.resolve('node_modules'));
      expect(childDirectory instanceof Directory).toBe(true);
    });
  });

  describe('reading child files', function() {
    beforeEach(async function() {
      const directory = new Directory();
      await directory.mkdir('child-directory');
    });

    afterEach(async function() {
      await rimraf(path.resolve('child-directory'));
    });

    it('returns the text of the child file', async function() {
      const childDirectory = new Directory('child-directory');
      await fs.writeFile(path.join(childDirectory.path, 'file'), 'text');
      expect(await childDirectory.readFile('file')).toBe('text');
    });

    it('returns an object if the child file has a .json extension', async function() {
      const childDirectory = new Directory('child-directory');
      await fs.writeFile(
        path.join(childDirectory.path, 'file.json'),
        JSON.stringify({key: 'value'})
      );
      expect(await childDirectory.readFile('file.json'))
        .toEqual({key: 'value'});
    });
  });

  describe('creating symlinks', function() {
    beforeEach(async function() {
      const projectDirectory = new Directory();
      await projectDirectory.mkdir('directory');
    });

    afterEach(async function() {
      await rimraf(path.resolve('directory'));
    });

    it('creates a symlink with the given name if a child file with the given name does not already exist', async function() {
      const directory = new Directory('directory');
      await directory.symlink('node_modules', 'child');
      expect(await fs.readlink(path.join(directory.path, 'child')))
        .toBe(path.resolve('node_modules'));
    });

    it('overwrites any existing file with the same name', async function() {
      const directory = new Directory('directory');
      await fs.writeFile(path.join(directory.path, 'child'), 'text');
      await directory.symlink('node_modules', 'child');
      expect(await fs.readlink(path.join(directory.path, 'child')))
        .toBe(path.resolve('node_modules'));
    });

    it('overwrites any existing symlink with the same name', async function() {
      const directory = new Directory('directory');
      await fs.symlink(
        path.resolve('node_modules'), path.join(directory.path, 'child'));
      await directory.symlink('node_modules', 'child');
      expect(await fs.readlink(path.join(directory.path, 'child')))
        .toBe(path.resolve('node_modules'));
    });

    it('overwrites any existing directory with the same name', async function() {
      const directory = new Directory('directory');
      await fs.mkdir(path.join(directory.path, 'child'));
      await fs.writeFile(path.join(directory.path, 'child/file'), 'text');
      await directory.symlink('node_modules', 'child');
      expect(await fs.readlink(path.join(directory.path, 'child')))
        .toBe(path.resolve('node_modules'));
    });
  });
});
