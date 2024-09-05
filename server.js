//! This is a simple express server that proxies requests to the solc compiler.

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const cors = require('cors');
const compression = require('compression');
const client = require('prom-client');

const app = express();
const port = 3000;

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

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

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());
app.use(compression());

app.use((req, res, next) => {
    // Set Connection: close header
    res.setHeader('Connection', 'close');
    next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
		res.set('Content-Type', register.contentType);
		res.end(await register.metrics());
	} catch (ex) {
		res.status(500).end(ex);
	}
});

app.post('/solc', (req, res) => {
    const end = httpRequestDuration.startTimer();
    const {cmd, input} = req.body
    log('info', 'Received request', { method: req.method, endpoint: req.path, command: cmd });
    const solc = spawn('resolc', [cmd], {timeout: 5 * 1000});
    let stdout = '';
    let stderr = '';

    solc.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    solc.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    solc.stdin.write(input ?? '');
    solc.stdin.end();

    solc.on('close', (code, signal) => {
        let status = (code === 0) ? 200 : 500;
        let text = (status === 200) ? stdout : stderr || 'Internal error';

        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
            status = 504;
            text = 'Request to compiler timed out';
        }

        processResponse(req, res, status, text, end)
    });
});

function processResponse(request, response, status, text, end) {
    httpRequestCount.inc({ method: request.method, endpoint: request.path, status });
    if (status !== 200) {
        httpRequestErrors.inc({ method: request.method, endpoint: request.path, status });
        response.status(status).send(text);
        log('error', 'Request processing failed', { method: request.method, endpoint: request.path, status, error: text });
    }
    else {
        response.status(status).send(text);
        log('info', 'Request processed successfully', { method: request.method, endpoint: request.path, status });
    }
    end({ method: request.method, endpoint: request.path, status });
}

const server = app.listen(port, () => {
    log('info', `solc proxy server listening to ${port}`);
});

server.requestTimeout = 5000;
server.headersTimeout = 2000;
server.keepAliveTimeout = 3000;
server.setTimeout(10000, (socket) => {
    log('warn', 'solc proxy server timeout');
    socket.destroy();
});
