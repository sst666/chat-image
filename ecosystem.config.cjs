module.exports = {
  apps: [
    {
      name: "chat-image",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: "3018",
        HOST: "0.0.0.0",
      },
    },
  ],
};
