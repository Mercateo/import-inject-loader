const execSync = require('child_process').execSync;
const join = require('path').join;

const cwd = join(process.cwd(), 'examples');
const stdio = 'inherit';

execSync('npm install', { cwd, stdio });
execSync('npm install import-inject-loader', { cwd, stdio });
execSync('npm -s test', { cwd, stdio });
