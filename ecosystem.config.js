module.exports = {
    apps: [{
      name: 'my-express-app',
      script: 'dist/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      out_file: "/home/eric/.pm2/logs/combined-err-out.log",
      error_file: "/home/eric/.pm2/logs/combined-err-out.log",
      env: {
        NODE_ENV: 'production'
      }
    }]
  };