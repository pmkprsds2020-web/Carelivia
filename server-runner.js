const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'dev.log');

function startServer() {
  const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('exit', (code, signal) => {
    const msg = `Server exited with code=${code} signal=${signal} at ${new Date().toISOString()}\n`;
    fs.appendFileSync(logFile, msg);
    console.log(msg);
    
    // Restart after 3 seconds
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    const msg = `Server error: ${err.message} at ${new Date().toISOString()}\n`;
    fs.appendFileSync(logFile, msg);
    console.error(msg);
  });
}

// Clear old log
fs.writeFileSync(logFile, '');

startServer();

// Keep the process alive
setInterval(() => {
  // Heartbeat
}, 60000);

// Handle signals
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, ignoring to keep server alive');
});
process.on('SIGINT', () => {
  console.log('Received SIGINT, ignoring to keep server alive');
});
