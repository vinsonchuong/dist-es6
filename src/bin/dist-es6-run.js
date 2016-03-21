const babel = require('babel-core');

let code = '';
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  const data = process.stdin.read();
  if (data) {
    code += data;
  } else {
    const compiled = babel.transform(code, {
      presets: ['es2015', 'stage-0'],
      plugins: ['transform-decorators-legacy', 'transform-runtime']
    });

    /* eslint-disable lines-around-comment, no-underscore-dangle */
    module._compile(compiled.code, 'inline.js');
    /* eslint-enable lines-around-comment, no-underscore-dangle */
  }
});
