module.exports = function run(modulePath) {
  /* eslint-disable lines-around-comment, global-require */
  require('babel-register')({
    presets: ['es2015', 'stage-0'],
    plugins: ['transform-decorators-legacy', 'transform-runtime']
  });
  require(modulePath);
  /* eslint-enable lines-around-comment, global-require */
};
