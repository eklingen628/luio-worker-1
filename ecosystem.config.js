module.exports = {
    apps: [{
      name: 'my-express-app',
      script: 'dist/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }]
  };