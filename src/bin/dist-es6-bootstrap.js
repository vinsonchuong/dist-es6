require('babel-core/register')({
  presets: ['es2015', 'stage-0'],
  plugins: ['transform-runtime']
});
require('dist-es6/bin/dist-es6');
