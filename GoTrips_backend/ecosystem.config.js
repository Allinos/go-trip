// PM2 process file:  pm2 start ecosystem.config.js --env production
// Cluster mode uses every CPU core. Background jobs run only on instance 0 (see server.js),
// and each job also takes a Postgres advisory lock, so it is safe across several servers.
module.exports = {
  apps: [
    {
      name: 'gotrip-api',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '600M',
      kill_timeout: 12000,
      env_production: { NODE_ENV: 'production' },
    },
  ],
};
