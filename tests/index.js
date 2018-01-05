const execSync = require('child_process').execSync;
const join = require('path').join;

const cwd = join(process.cwd(), 'examples');
const stdio = 'inherit';

execSync('yarn install', { cwd, stdio });
execSync('yarn test', { cwd, stdio });
