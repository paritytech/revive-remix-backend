//! This is a simple express server that proxies requests to the solc compiler.

const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const config = require('./config/config');
const resolcRouter = require('./routes/resolc');
const metricsRouter = require('./routes/metrics');
const log = require('./middleware/logger');

const app = express();

app.use(cors());
app.use(express.json());
app.use(compression());

app.use((req, res, next) => {
  // Set Connection: close header
  res.setHeader('Connection', 'close');
  next();
});

if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  log('info', 'soljson.js endpoint enabled');
}


app.use('/metrics', metricsRouter);
app.use('/solc', resolcRouter);

if (require.main === module) {
  const server = app.listen(config.server.port, () => {
    log('info', `solc proxy server listening to ${config.server.port}`);
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 2000;
  server.keepAliveTimeout = 3000;
}

// Expose the app for testing
module.exports = app;
