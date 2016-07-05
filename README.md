# dist-es6
[![Build Status](https://travis-ci.org/vinsonchuong/dist-es6.svg?branch=master)](https://travis-ci.org/vinsonchuong/dist-es6)

Utilities to support development of npm packages in ES6+.

While developing, `dist-es6` modifies the Node.js module search path so that you
can import files by module name as a user of your package would, instead of
having to figure out relative paths.

When you're ready to publish your package, `dist-es6` compiles ES6+ code from
the `src` directory, copies the `package.json`, and copies other whitelisted
files (from the `files` field in `package.json`) into the `dist` directory; it
then publishes the `dist` directory, ensuring that users only deal with the
compiled code.

## Installing
`dist-es6` is available as an
[npm package](https://www.npmjs.com/package/dist-es6).

## Usage
In your `package.json`, run the `dist-es6` command from the `prepublish`
script as follows:

```json
{
  "name": "project",
  "scripts": {
    "prepublish": "dist-es6"
  }
}
```

Then, run `npm install`.

Note that your project must have all of its JavaScript inside of the `src`
directory. The `main` and `bin` fields must only refer to files inside of the
`src` directory:

```json
{
  "name": "project",
  "main": "src/index.js",
  "bin": {
    "project": "src/bin/project.js"
  },
  "scripts": {
    "prepublish": "dist-es6"
  }
}
```

For executables written in ES6+, do not add a shebang to the file; `dist-es6`
will automatically add a shebang after compilation or linking. For executables
not written in ES6+ (that can run as is via `node`), you still need to add a
shebang.

Remember to run `npm install` after any changes to `package.json`.

Now, you'll be able to directly run executables from the current project on
the command line. You'll also be able to require files from the current project
via module path instead of relative path:

```js
import code from 'project/lib/code';
```

For publishing, files outside of the `src` directory that need to be published
must be whitelisted in the `files` field as follows:

```json
{
  "name": "project",
  "files": ["LICENSE", "README.md", "docs"],
  "main": "src/index.js",
  "bin": {
    "project": "src/bin/project.js"
  },
  "scripts": {
    "prepublish": "dist-es6"
  },
}
```

Note that a dependency on the `babel-runtime` will be added to the compiled
version of the package.

To publish the compiled version of the package:

```sh
npm publish
```

The above will compile the package into the `dist` directory and run
`npm publish` on the `dist` directory. Note that as an implementation detail,
the command will return code `143`, which will probably cause deployment
scripts to fail. You need to explicitly check the error code.

## Development
### Getting Started
The application requires the following external dependencies:
* Node.js

The rest of the dependencies are handled through:
```bash
npm install
```

Run tests with:
```bash
npm test
```
