// Prometheus metrics
const client = require('prom-client');
const TaskQueue = require('../utils/taskQueue');

// Queue length metric
const requestsQueueLength = new client.Gauge({
  name: 'requests_queue_length',
  help: 'Current number of requests in the queue',
  collect() {
    // This function is called every time Prometheus scrapes the metrics
    this.set(TaskQueue.getLength());
  },
});

// Traffic metric (Request count)
const httpRequestCount = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests made',
  labelNames: ['method', 'endpoint', 'status'],
});

// Error metric (Request errors)
const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP requests that resulted in an error',
  labelNames: ['method', 'endpoint', 'status'],
});

// Latency metric (Request duration in seconds)
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'endpoint', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // Buckets for response time
});

module.exports = {
    requestsQueueLength,
    httpRequestCount,
    httpRequestErrors,
    httpRequestDuration
};
