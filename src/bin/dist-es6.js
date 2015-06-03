#!/usr/bin/env node
var fs = require('fs');
var path = require('path');

function linkPackage(packagePath, packageName) {
  fs.symlink(
    path.resolve(packagePath),
    path.resolve('node_modules', packageName),
    function(error) {
      if (error) { throw error; }
    }
  );
  readJson(path.resolve(packagePath, 'package.json'), function(packageJson) {
    Object.keys(Object(packageJson.bin))
      .forEach(function(binName) {
        fs.symlink(
          path.resolve(packagePath, packageJson.bin[binName]),
          path.resolve('node_modules/.bin', binName),
          function(error) {
            if (error) { throw error; }
          }
        );
      });
  });
}

function readJson(jsonPath, callback) {
  fs.readFile(path.resolve(jsonPath), 'utf8', function(error, contents) {
    if (error) { throw error; }
    callback(JSON.parse(contents));
  });
}

function mkdir(directoryPath, callback) {
  fs.mkdir(path.resolve(directoryPath), function(error) {
    if (error && error.code !== 'EEXIST') { throw error; }
    if (callback) { callback(); }
  });
}

readJson('package.json', function(packageJson) {
  mkdir('node_modules', function() {
    mkdir('node_modules/.bin', function() {
      linkPackage('.', packageJson.name);
      Object.keys(Object(packageJson.linkDependencies))
        .forEach(function(packageName) {
          linkPackage(packageJson.linkDependencies[packageName], packageName);
        });
    });
  });
});
