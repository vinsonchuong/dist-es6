import path from 'path';
import fs from 'node-promise-es6/fs';
import Directory from 'dist-es6/lib/directory';

describe('Directory', () => {
  it('requires the given directory to exist', async () => {
    const existingDirectory = new Directory();
    expect(existingDirectory.path).toBe(path.resolve());

    expect(() => new Directory('missing')).toThrowError(/ENOENT/);
  });

  it('provides a path.join shortcut', () => {
    const directory = new Directory();
    expect(directory.join()).toBe(directory.path);
    expect(directory.join('foo')).toBe(path.join(directory.path, 'foo'));
    expect(directory.join('foo', 'bar'))
      .toBe(path.join(directory.path, 'foo', 'bar'));
  });

  describe('creating child directories', () => {
    afterEach(async () => {
      await new Directory().rm('child-directory');
    });

    it('creates a child directory if one with the same name does not already exist', async () => {
      const directory = new Directory();
      await directory.mkdir('child-directory');
      expect(await fs.readdir(path.resolve())).toContain('child-directory');
    });

    it('returns an instance of Directory', async () => {
      const directory = new Directory();
      const childDirectory = await directory.mkdir('child-directory');
      expect(childDirectory.path).toBe(path.resolve('child-directory'));
      expect(childDirectory instanceof Directory).toBe(true);
    });

    it('does nothing if a child directory with the same name already exists', async () => {
      const directory = new Directory();
      const childDirectoryPath = path.resolve('node_modules');
      const childDirectoryContents = await fs.readdir(childDirectoryPath);
      await directory.mkdir('node_modules');
      expect(await fs.readdir(childDirectoryPath))
        .toEqual(childDirectoryContents);
    });

    it('still returns an instance of Directory if a child directory with the same name already exists', async () => {
      const directory = new Directory();
      const childDirectory = await directory.mkdir('node_modules');
      expect(childDirectory.path).toBe(path.resolve('node_modules'));
      expect(childDirectory instanceof Directory).toBe(true);
    });
  });

  describe('listing the contents of the directory', () => {
    it('lists every child file', async () => {
      expect(await new Directory().ls())
        .toEqual(await fs.readdir(path.resolve()));
    });
  });

  describe('reading child files', () => {
    beforeEach(async () => {
      const directory = new Directory();
      await directory.mkdir('child-directory');
    });

    afterEach(async () => {
      await new Directory().rm('child-directory');
    });

    it('returns the text of the child file', async () => {
      const childDirectory = new Directory('child-directory');
      await fs.writeFile(childDirectory.join('file'), 'text');
      expect(await childDirectory.readFile('file')).toBe('text');
    });

    it('returns an object if the child file has a .json extension', async () => {
      const childDirectory = new Directory('child-directory');
      await fs.writeFile(
        childDirectory.join('file.json'),
        JSON.stringify({key: 'value'})
      );
      expect(await childDirectory.readFile('file.json'))
        .toEqual({key: 'value'});
    });
  });

  describe('writing child files', () => {
    beforeEach(async () => {
      await new Directory().mkdir('directory');
    });

    afterEach(async () => {
      await new Directory().rm('directory');
    });

    it('creates a file with the given name and contents if a child file with the given name does not already exist', async () => {
      const directory = new Directory('directory');
      await directory.writeFile('child-file', 'text');
      expect(await directory.readFile('child-file')).toBe('text');
    });

    it('writes JSON if given an object', async () => {
      const directory = new Directory('directory');
      await directory.writeFile('child-file.json', {key: 'value'});
      expect(await directory.readFile('child-file.json'))
        .toEqual({key: 'value'});
    });

    it('overwrites any existing file with the same name', async () => {
      const directory = new Directory('directory');
      await directory.writeFile('child-file', 'text');
      await directory.writeFile('child-file', 'other text');
      expect(await directory.readFile('child-file')).toBe('other text');
    });

    it('overwrites any existing symlink with the same name', async () => {
      const directory = new Directory('directory');
      await directory.symlink('node_modules', 'child-file');
      await directory.writeFile('child-file', 'text');
      expect(await directory.readFile('child-file')).toBe('text');
    });

    it('overwrites any existing directory with the same name', async () => {
      const directory = new Directory('directory');
      const childDirectory = await directory.mkdir('child');
      await childDirectory.writeFile('grandchild', 'some text');
      await directory.writeFile('child', 'text');
      expect(await directory.readFile('child')).toBe('text');
    });
  });

  describe('copying files and directories', () => {
    beforeEach(async () => {
      await new Directory().mkdir('from-directory');
      await new Directory().mkdir('to-directory');
    });

    afterEach(async () => {
      await new Directory().rm('from-directory');
      await new Directory().rm('to-directory');
    });

    it('copies the source file into the destination directory as a child', async () => {
      const fromDirectory = new Directory('from-directory');
      await fromDirectory.writeFile('file', 'text');

      const toDirectory = new Directory('to-directory');
      await toDirectory.cp(fromDirectory.join('file'), 'file');
      expect(await toDirectory.readFile('file')).toBe('text');
    });

    it('copies the source directory into the destination directory as a child', async () => {
      const fromDirectory = new Directory('from-directory');
      await fromDirectory.writeFile('file', 'text');

      const toDirectory = new Directory('to-directory');
      await toDirectory.cp(fromDirectory.path, 'copied-directory');

      const copiedDirectory = await toDirectory.mkdir('copied-directory');
      expect(await copiedDirectory.readFile('file')).toBe('text');
    });
  });

  describe('creating symlinks', () => {
    beforeEach(async () => {
      const projectDirectory = new Directory();
      await projectDirectory.mkdir('directory');
    });

    afterEach(async () => {
      await new Directory().rm('directory');
    });

    it('creates a symlink with the given name if a child file with the given name does not already exist', async () => {
      const directory = new Directory('directory');
      await directory.symlink('node_modules', 'child');
      expect(await fs.readlink(directory.join('child')))
        .toBe(path.resolve('node_modules'));
    });

    it('overwrites any existing file with the same name', async () => {
      const directory = new Directory('directory');
      await fs.writeFile(directory.join('child'), 'text');
      await directory.symlink('node_modules', 'child');
      expect(await fs.readlink(directory.join('child')))
        .toBe(path.resolve('node_modules'));
    });

    it('overwrites any existing symlink with the same name', async () => {
      const directory = new Directory('directory');
      await fs.symlink(
        path.resolve('node_modules'), directory.join('child'));
      await directory.symlink('node_modules', 'child');
      expect(await fs.readlink(directory.join('child')))
        .toBe(path.resolve('node_modules'));
    });

    it('overwrites any existing directory with the same name', async () => {
      const directory = new Directory('directory');
      await fs.mkdir(directory.join('child'));
      await fs.writeFile(directory.join('child/file'), 'text');
      await directory.symlink('node_modules', 'child');
      expect(await fs.readlink(directory.join('child')))
        .toBe(path.resolve('node_modules'));
    });
  });

  describe('removing files and directories', () => {
    beforeEach(async () => {
      await new Directory().mkdir('directory');
    });

    afterEach(async () => {
      await new Directory().rm('directory');
    });

    it('removes the directory passed to the constructor by default', async () => {
      const directory = new Directory('directory');
      await directory.rm();
      expect(await fs.readdir(path.resolve())).not.toContain('directory');
    });

    it('can remove a child file', async () => {
      const directory = new Directory('directory');
      await directory.writeFile('child-file');
      await directory.rm('child-file');
      expect(await fs.readdir(path.resolve('directory')))
        .not.toContain('child-file');
    });

    it('can remove a child directory', async () => {
      const directory = new Directory('directory');
      const childDirectory = await directory.mkdir('child-directory');
      childDirectory.writeFile('grandchild', 'text');
      await directory.rm('child-directory');
      expect(await fs.readdir(path.resolve('directory')))
        .not.toContain('child-directory');
    });
  });

  describe('making files executable', () => {
    beforeEach(async () => {
      await new Directory().mkdir('directory');
    });

    afterEach(async () => {
      await new Directory().rm('directory');
    });

    it('updates sets the permissions of a file', async () => {
      const directory = new Directory('directory');
      await directory.writeFile('script', '#!/bin/sh\necho running in sh');
      await directory.chmod('script', '755');
      expect(await directory.execSh('./script')).toBe('running in sh');
    });
  });

  describe('executing shell commands', () => {
    beforeEach(async () => {
      await new Directory().mkdir('directory');
    });

    afterEach(async () => {
      await new Directory().rm('directory');
    });

    it('executes the command from the given directory', async () => {
      const directory = new Directory('directory');
      expect(await directory.execSh('pwd')).toBe(directory.path);
    });

    it('passes the environment to the command', async () => {
      const directory = new Directory('directory');

      /* eslint-disable */
      process.env.testVal = '42';
      /* eslint-enable */

      expect(await directory.execSh('printenv')).toContain('testVal=42');

      /* eslint-disable */
      Reflect.deleteProperty(process.env, 'testVal')
      /* eslint-enable */
    });
  });

  describe('executing JavaScript in node', () => {
    beforeEach(async () => {
      await new Directory().mkdir('directory');
    });

    afterEach(async () => {
      await new Directory().rm('directory');
    });

    it('executes node from the given directory', async () => {
      const directory = new Directory('directory');
      expect(await directory.execNode('process.cwd()')).toBe(directory.path);
    });
  });
});
