module.exports = {
  apps: [
    {
      name: "Compiler",
      script: "./server.js",
      instances: "max",
      exec_mode: "cluster",
    }
  ]
};
