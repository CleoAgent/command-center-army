module.exports = {
  apps: [{
    name: 'command-center-api',
    script: './index.js',
    cwd: '/home/node/.openclaw/workspace/command-center/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    log_file: '/home/node/.openclaw/workspace/command-center/server/logs/combined.log',
    out_file: '/home/node/.openclaw/workspace/command-center/server/logs/out.log',
    error_file: '/home/node/.openclaw/workspace/command-center/server/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
