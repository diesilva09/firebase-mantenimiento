module.exports = {
  apps: [
    {
      name: 'mi-plataforma',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3000',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
