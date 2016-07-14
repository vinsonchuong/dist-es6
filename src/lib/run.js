const path = require('path');

const babelOptions = {
  presets: ['es2015', 'stage-0'],
  plugins: ['transform-decorators-legacy', 'transform-runtime']
};

exports.module = function runModule(modulePath) {
  /* eslint-disable lines-around-comment, global-require */
  const packageJson = require(path.resolve('package.json'));
  require('register-module')({
    name: packageJson.name,
    path: path.resolve('src'),
    main: packageJson.main ?
      packageJson.main.replace('src/', '') :
      'index.js'
  });
  require('babel-register')(babelOptions);
  require(modulePath);
  /* eslint-enable lines-around-comment, global-require */
};

exports.stdin = function runStdin() {
  /* eslint-disable lines-around-comment, no-var */
  var code = '';
  /* eslint-enable lines-around-comment, no-var */

  process.stdin.setEncoding('utf8');
  process.stdin.on('readable', () => {
    const data = process.stdin.read();
    if (data) {
      code += data;
    } else {
      /* eslint-disable lines-around-comment, global-require, no-underscore-dangle */
      const compiled = require('babel-core').transform(code, babelOptions);
      require('babel-register')(babelOptions);
      module._compile(compiled.code, 'stdin');
      /* eslint-enable lines-around-comment, global-require, no-underscore-dangle */
    }
  });
};
