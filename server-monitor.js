const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  console.log('[monitor] Starting Next.js server...');
  const child = spawn('node', [path.join(__dirname, 'node_modules/.bin/next'), 'dev', '-p', '3000'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  child.stdout.on('data', (data) => {
    const msg = data.toString();
    // Only log important messages, skip Prisma queries
    if (!msg.includes('prisma:query') && msg.trim()) {
      console.log('[next]', msg.trim());
    }
  });

  child.stderr.on('data', (data) => {
    const msg = data.toString();
    if (!msg.includes('prisma:query') && msg.trim()) {
      console.error('[next:err]', msg.trim());
    }
  });

  child.on('close', (code) => {
    console.log(`[monitor] Server exited with code ${code}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    console.error('[monitor] Error:', err.message);
    setTimeout(startServer, 3000);
  });
}

startServer();

// Keep the process alive
process.on('SIGTERM', () => { console.log('[monitor] Received SIGTERM'); });
process.on('SIGINT', () => { console.log('[monitor] Received SIGINT'); process.exit(0); });
