const express = require('express');
const router = express.Router();
const client = require('prom-client');
const log = require('../middleware/logger');
const { requestsQueueLength, httpRequestCount, httpRequestErrors, httpRequestDuration} = require('../utils/metrics');

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
register.registerMetric(requestsQueueLength);
register.registerMetric(httpRequestCount);
register.registerMetric(httpRequestErrors);
register.registerMetric(httpRequestDuration);

// Prometheus metrics endpoint
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    log('error', 'Failed to get metrics', {
      method: request.method,
      endpoint: request.path,
      error: ex.message,
    });
    res.status(500).end(ex.message);
  }
});

module.exports = router;
