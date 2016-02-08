require('babel-register')({
  presets: ['es2015', 'stage-0'],
  plugins: ['transform-decorators-legacy', 'transform-runtime']
});
require('dist-es6/bin/dist-es6');
