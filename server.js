//! This is a simple express server that proxies requests to the solc compiler.

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const cors = require('cors');
const compression = require('compression');
const client = require('prom-client');
const { body, validationResult } = require('express-validator');
const async = require('async');
const os = require('os');
const { getErrorMessage } = require('./utils/errorHandler');
const config = require('./config/config');

const app = express();

// Logger function for JSON format
const log = (level, message, meta = {}) => {
  const logEntry = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(logEntry));
};

if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  log('info', 'soljson.js endpoint enabled');
}

app.use(cors());
app.use(express.json());
app.use(compression());

app.use((req, res, next) => {
  // Set Connection: close header
  res.setHeader('Connection', 'close');
  next();
});

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Queue length metric
const requestsQueueLength = new client.Gauge({
  name: 'requests_queue_length',
  help: 'Current number of requests in the queue',
  collect() {
    // This function is called every time Prometheus scrapes the metrics
    this.set(queue.length());
  },
});
register.registerMetric(requestsQueueLength);

// Traffic metric (Request count)
const httpRequestCount = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests made',
  labelNames: ['method', 'endpoint', 'status'],
});
register.registerMetric(httpRequestCount);

// Error metric (Request errors)
const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP requests that resulted in an error',
  labelNames: ['method', 'endpoint', 'status'],
});
register.registerMetric(httpRequestErrors);

// Latency metric (Request duration in seconds)
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'endpoint', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // Buckets for response time
});
register.registerMetric(httpRequestDuration);

// Get the number of CPUs
const numCPUs = os.cpus().length;

// Create an async queue that processes compilation tasks
const queue = async.queue((task, done) => {
  const { cmd, input } = task;
  const solc = spawn('resolc', [cmd], {
    timeout: config.server.compilationTimeout,
  });
  let stdout = '';
  let stderr = '';

  solc.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  solc.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  if (input) {
    solc.stdin.write(input);
  }
  solc.stdin.end();

  solc.on('close', (code, signal) => {
    if (code === 0) {
      return done(null, stdout);
    }
    let error;
    switch (signal) {
      case 'SIGTERM':
        error = 'Request terminated. Compilation timed out';
        break;
      case 'SIGKILL':
        error = 'Out of resources';
        break;
      default:
        error = stderr || 'Internal error';
    }

    return done(new Error(error));
  });
}, numCPUs); // Limit concurrency to number of CPUs

// Metrics endpoint
app.get('/metrics', async (req, res) => {
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

app.post(
  '/solc',
  [
    // Validate cmd
    body('cmd')
      .isString()
      .notEmpty()
      .custom((value) => {
        const allowedCommands = ['--standard-json', '--license', '--version'];
        if (!allowedCommands.includes(value)) {
          throw new Error('Invalid compiler command');
        }
        return true;
      }),

    // Validate input: optional, but if present, must be valid JSON
    body('input')
      .optional()
      .custom((value) => {
        if (value === '') {
          return true; // Allow empty string
        }
        try {
          JSON.parse(value); // Check if input is valid JSON
          return true;
        } catch (error) {
          throw new Error('input must be valid JSON');
        }
      }),
  ],
  (req, res) => {
    const end = httpRequestDuration.startTimer();
    log('info', 'Received request', {
      method: req.method,
      endpoint: req.path,
      command: req.body.cmd || 'unknown',
    });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors
        .array()
        .map((err) => err.msg)
        .join(', ');
      return handleError(req, res, end, 400, message);
    }

    // Check if the queue is overloaded. The maximum delay for processing is 20 seconds,
    // after which requests are dropped.
    if (queue.length() >= numCPUs * 4) {
      return handleError(req, res, end, 429);
    }
    // Push the task to the queue
    queue.push(req.body, (err, result) => {
      if (err) {
        return handleError(req, res, end, 500, err.message);
      }
      handleResult(req, res, end, result);
    });
  },
);

function handleError(request, response, end, status, error = null) {
  httpRequestCount.inc({
    method: request.method,
    endpoint: request.path,
    status,
  });
  httpRequestErrors.inc({
    method: request.method,
    endpoint: request.path,
    status,
  });

  log('error', 'Request processing failed', {
    method: request.method,
    endpoint: request.path,
    command: request.body.cmd || 'unknown',
    status,
    error: error || getErrorMessage(status),
  });

  try {
    response.status(status).send(getErrorMessage(status));
  } catch (sendError) {
    // Log the sending failure
    log('error', 'Failed to send error response', {
      method: request.method,
      endpoint: request.path,
      status,
      error: sendError.message,
    });
  } finally {
    end({ method: request.method, endpoint: request.path, status });
  }
}

function handleResult(request, response, end, result) {
  const status = 200;
  httpRequestCount.inc({
    method: request.method,
    endpoint: request.path,
    status,
  });
  log('info', 'Request processed successfully', {
    method: request.method,
    endpoint: request.path,
    command: request.body.cmd,
    status,
  });

  try {
    response.status(status).send(result);
  } catch (sendError) {
    // Log the sending failure
    log('error', 'Failed to send error response', {
      method: request.method,
      endpoint: request.path,
      status,
      error: sendError.message,
    });
    httpRequestErrors.inc({
      method: request.method,
      endpoint: request.path,
      status,
    });
  } finally {
    end({ method: request.method, endpoint: request.path, status });
  }
}

if (require.main === module) {
  const server = app.listen(config.server.port, () => {
    log('info', `solc proxy server listening to ${config.server.port}`);
    log('info', `Set number of workers to ${numCPUs}`);
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 2000;
  server.keepAliveTimeout = 3000;
}

// Expose the app for testing
module.exports = app;
