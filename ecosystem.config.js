
module.exports = {
  apps: [{
    name: 'brillprime-api',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
