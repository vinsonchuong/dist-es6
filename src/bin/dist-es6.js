import path from 'path';
import fs from 'node-promise-es6/fs';
import Project from '../lib/project';
import PackageJson from '../lib/package-json';

async function run() {
  const project = new Project();

  const projectDirectoryContents = await project.directory.ls();
  if (projectDirectoryContents.indexOf('src') === -1) {
    process.stderr.write('No src directory found. Exiting.\n');
    return;
  }

  const packageJson = await project.packageJson();

  await project.link('.');

  const {linkDependencies = {}} = packageJson;
  for (const name of Object.keys(linkDependencies)) {
    await project.link(path.resolve(linkDependencies[name]));
  }

  await project.directory.rm('dist');
  const distDirectory = await project.directory.mkdir('dist');

  const distPackageJson = new PackageJson(packageJson)
    .moveTo('src')
    .toProduction()
    .addBabelRuntime();
  await distDirectory.writeFile('package.json', distPackageJson);

  await project.directory.execSh([
    `'${require.resolve('babel/bin/babel')}'`,
    '--stage 0',
    '--optional runtime',
    'src',
    '--out-dir dist'
  ].join(' '));

  for (const fileName of packageJson.files || []) {
    if (fileName.indexOf('src') === 0) { continue; }
    await distDirectory.cp(fileName, fileName);
  }

  const {bin: distBins = {}} = distPackageJson.toJSON();
  for (const binName of Object.keys(distBins)) {
    const binPath = distDirectory.join(distBins[binName]);
    const binContents = await fs.readFile(binPath);
    await fs.writeFile(binPath, '#!/usr/bin/env node\n' + binContents);
    await fs.chmod(binPath, '755');
  }
}

run().catch(e => process.stderr.write(e.stack + '\n'));
