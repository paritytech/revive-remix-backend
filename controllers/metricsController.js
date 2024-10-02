const client = require('prom-client');
const log = require('../middleware/logger');

const {
  requestsQueueLength,
  httpRequestCount,
  httpRequestErrors,
  httpRequestDuration,
} = require('../utils/metrics');

// Initialize Prometheus registry and metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
register.registerMetric(requestsQueueLength);
register.registerMetric(httpRequestCount);
register.registerMetric(httpRequestErrors);
register.registerMetric(httpRequestDuration);

// Function to get Prometheus metrics
const getMetrics = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    log('error', 'Failed to get metrics', {
      method: req.method,
      endpoint: req.path,
      error: ex.message,
    });
    res.status(500).end(ex.message);
  }
};

module.exports = {
  getMetrics,
};
