import path from 'path';
import fs from 'node-promise-es6/fs';
import posix from 'posix';
import Project from 'dist-es6/lib/project';
import PackageJson from 'dist-es6/lib/package-json';

async function linkLocalPackages(project) {
  const {linkDependencies = {}} = await project.packageJson();
  await* [
    project.link('.', 'src'),
    ...Object.keys(linkDependencies)
      .map(name => path.resolve(linkDependencies[name]))
      .map(linkDependencyPath => project.link(linkDependencyPath))
  ];
}

async function compileJs(project) {
  const projectDirectoryContents = await project.directory.ls();
  if (projectDirectoryContents.indexOf('src') === -1) {
    process.stderr.write('No src directory found.\n');
    return;
  }

  await project.directory.execSh([
    `'${require.resolve('babel/bin/babel')}'`,
    '--stage 0',
    '--optional runtime',
    '--copy-files',
    'src',
    '--out-dir dist'
  ].join(' '));
}

async function compileExecutables(bins, distDirectory) {
  await* Object.keys(bins)
    .map(binName => distDirectory.join(bins[binName]))
    .map(async binPath => {
      const binContents = await fs.readFile(binPath);
      await fs.writeFile(binPath, '#!/usr/bin/env node\n' + binContents);
      await fs.chmod(binPath, '755');
    });
}

async function copyFiles(files, distDirectory) {
  await* files
    .filter(fileName => fileName.indexOf('src') !== 0)
    .map(fileName => distDirectory.cp(fileName, fileName));
}

async function productionPackageJson(project) {
  const packageJson = await project.packageJson();
  return new PackageJson(packageJson)
    .moveTo('src')
    .toProduction()
    .addBabelRuntime()
    .toJSON();
}

async function compile(project) {
  await project.directory.rm('dist');
  const [packageJson, distDirectory, distPackageJson] = await* [
    project.packageJson(),
    project.directory.mkdir('dist'),
    productionPackageJson(project),
    compileJs(project)
  ];
  await* [
    distDirectory.writeFile('package.json', distPackageJson),
    copyFiles(packageJson.files || [], distDirectory),
    compileExecutables(Object(distPackageJson.bin), distDirectory)
  ];
}

async function run() {
  const project = new Project();
  await* [
    linkLocalPackages(project),
    compile(project)
  ];

  const currentNpmCommand = JSON.parse(process.env.npm_config_argv).original[0];
  if (currentNpmCommand === 'publish') {
    const output = await project.directory.execSh('npm publish dist');
    process.stdout.write(`${output}\n`);
    process.kill(posix.getppid());
  }
}

run().catch(e => {
  process.stderr.write(e.stack + '\n');
  process.exit(1);
});
