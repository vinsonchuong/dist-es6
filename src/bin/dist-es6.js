import posix from 'posix';
import Project from '../lib/project';

async function run() {
  const project = new Project();
  await* [
    project.linkAll(),
    project.compile()
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
