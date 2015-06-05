import path from 'path';
import Project from '../lib/project';

(async () => {
  const project = new Project();

  await project.link('.');

  const packageJson = await project.packageJson();
  const {linkDependencies = {}} = await project.packageJson();
  for (const name of Object.keys(linkDependencies)) {
    await project.link(path.resolve(linkDependencies[name]));
  }
})();
