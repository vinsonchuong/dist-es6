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
    if (Object.is(value, undefined)) {
      delete obj[key];
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
      return (
        Array.isArray(value) ? value.map(mapper) :
        value !== null && typeof value === 'object' ? mapObj(mapper, value) :
        value === null || Object.is(value, undefined) ? undefined :
        mapper(value)
      );
    } else {
      const overrides = mapObj((subMapper, subKey) =>
        typeof subMapper === 'function' ?
          this.map(subMapper, subKey) :
          subMapper,
        mapper
      );
      return new PackageJson(Object.assign({}, this.packageJson, overrides));
    }
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
      files: undefined,
      scripts: (value, key) => key === 'prepublish' ? undefined : value
    });
  }

  addBabelRuntime() {
    return this.map({
      dependencies: Object.assign({}, this.packageJson.dependencies, {
        'babel-runtime': `<= ${require('babel/package.json').version}`
      })
    });
  }
}
