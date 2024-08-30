//! This is a simple express server that proxies requests to the solc compiler.

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const cors = require('cors');
const compression = require('compression');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json()); 
app.use(compression());

app.use((req, res, next) => {
    // Set Connection: close header
    res.setHeader('Connection', 'close');
    next();
});

app.post('/solc', (req, res) => {
    const {cmd, input} = req.body

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

    solc.on('close', (code) => {
        if (code === 0) {
            res.status(200).send(stdout);
        } else {
            res.status(200).json({ error: stderr || 'Internal error' });
        }
    });
});

const server = app.listen(port, () => {
    console.log(`solc proxy server listening at http://localhost:${port}`);
});

server.requestTimeout = 5000;
server.headersTimeout = 2000;
server.keepAliveTimeout = 3000;
server.setTimeout(10000, (socket) => {
  console.log('solc proxy server timeout');
  socket.destroy();
});
