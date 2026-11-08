// Production-like launcher for the load test (same layout as `pm2 start ecosystem.config.js`, 4 workers).
const cluster = require('cluster');
const path = require('path');
const N = Number(process.env.WORKERS || 4);
if (cluster.isPrimary) {
  for (let i = 0; i < N; i++) cluster.fork({ NODE_APP_INSTANCE: String(i) });
  cluster.on('exit', (w, code) => console.log('worker exit', w.process.pid, code));
} else {
  process.chdir(path.join(__dirname, '..', '..'));
  require(path.join(__dirname, '..', '..', 'server.js'));
}
