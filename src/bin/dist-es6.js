import path from 'path';
import fs from 'fs-promise';
import Project from '../lib/project';

async function run() {
  const project = new Project();
  const packageJson = await project.packageJson();

  await project.link('.');

  const {linkDependencies = {}} = packageJson;
  for (const name of Object.keys(linkDependencies)) {
    await project.link(path.resolve(linkDependencies[name]));
  }

  await project.directory.rm('dist');
  const distDirectory = await project.directory.mkdir('dist');
  const distPackageJson = Object.assign({}, packageJson, {
    main: packageJson.main && packageJson.main.replace(/^src\//, ''),
    files: undefined,
    bin: packageJson.bin && Object.keys(packageJson.bin)
      .reduce(
        (memo, binName) => Object.assign(memo, {
          [binName]: packageJson.bin[binName].replace(/^src\//, '')
        }),
        {}
      ),
    scripts: Object.assign({}, packageJson.scripts, {
      prepublish: undefined
    })
  });
  await distDirectory.writeFile('package.json', distPackageJson);
  await project.directory.execSh('babel src --out-dir dist');
  for (const fileName of packageJson.files || []) {
    if (fileName.indexOf('src') === 0) { continue; }
    await distDirectory.cp(fileName, fileName);
  }

  const {bin: distBins = {}} = distPackageJson;
  for (const binName of Object.keys(distBins)) {
    const binPath = distDirectory.join(distBins[binName]);
    const binContents = await fs.readFile(binPath);
    await fs.writeFile(binPath, '#!/usr/bin/env node\n' + binContents);
    await fs.chmod(binPath, '755');
  }
}

run().catch(e => console.log(e.stack));
