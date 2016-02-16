import path from 'path';

function mapObj(mapper, obj) {
  return Object.keys(obj)
    .reduce((memo, key) => Object.assign(memo, {
      [key]: mapper(obj[key], key)
    }), {});
}

function removeUndefinedValues(obj) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === null || typeof value === 'undefined') {
      Reflect.deleteProperty(obj, key);
    } else if (typeof value === 'object' && !Array.isArray(obj)) {
      removeUndefinedValues(value);
    }
  }
}

export default class PackageJson {
  constructor(packageJson) {
    removeUndefinedValues(packageJson);
    this.packageJson = packageJson;
  }

  toJSON() {
    return this.packageJson;
  }

  map(mapper, key) {
    if (key) {
      const value = this.packageJson[key];
      if (Array.isArray(value)) {
        return value.map(mapper);
      } else if (value !== null && typeof value === 'object') {
        return mapObj(mapper, value);
      } else if (value === null || typeof value === 'undefined') {
        return null;
      }

      return mapper(value);
    }

    const overrides = mapObj(
      (subMapper, subKey) => {
        if (typeof subMapper === 'function') {
          return this.map(subMapper, subKey);
        }

        return subMapper;
      },
      mapper
    );
    return new PackageJson(Object.assign({}, this.packageJson, overrides));
  }

  moveTo(destinationPath) {
    function moveFile(filePath) {
      return path.relative(destinationPath, filePath);
    }
    return this.map({
      files: moveFile,
      main: moveFile,
      bin: moveFile
    });
  }

  toProduction() {
    return this.map({
      files: null,
      scripts: (value, key) => {
        if (key === 'prepublish') {
          return null;
        }
        return value;
      }
    });
  }

  addBabelRuntime() {
    /* eslint-disable lines-around-comment, global-require */
    const [, runtimeVersion] = require('babel/package.json').version
      .match(/^(\d+\.\d+)\.\d+$/);
    /* eslint-enable lines-around-comment, global-require */

    return this.map({
      dependencies: Object.assign({}, this.packageJson.dependencies, {
        'babel-runtime': `^${runtimeVersion}`
      })
    });
  }
}
