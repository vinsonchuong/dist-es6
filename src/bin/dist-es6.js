import posix from 'posix';
import Project from '../lib/project';

async function run() {
  const project = new Project();
  const currentNpmCommand = JSON.parse(process.env.npm_config_argv).original[0];
  if (currentNpmCommand === 'install') {
    await project.linkAll();
  } else if (currentNpmCommand === 'publish') {
    await project.compile();
    const output = await project.directory.execSh('npm publish dist');
    process.stdout.write(`${output}\n`);
    process.kill(posix.getppid());
    await project.directory.rm('dist');
  }
}

run().catch(e => {
  process.stderr.write(e.stack + '\n');
  process.exit(1);
});
