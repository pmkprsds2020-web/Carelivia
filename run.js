const { spawn } = require('child_process');
const fs = require('fs');

const logFile = '/home/z/my-project/dev.log';
fs.writeFileSync(logFile, '');

function start() {
  const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')],
    detached: true,
  });
  
  child.unref();
  fs.writeFileSync('/tmp/next-pid', child.pid.toString());
  
  child.on('error', (err) => {
    fs.appendFileSync(logFile, `Error: ${err.message}\n`);
  });
}

start();
