//! This is a simple express server that proxies requests to the solc compiler.

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json()); 

app.post('/solc', (req, res) => {
    const {cmd, input} = req.body

    const solc = spawn('resolc', [cmd]);
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
            res.status(200).json({ error: stderr });
        }
    });
});

app.listen(port, () => {
    console.log(`solc proxy server listening at http://localhost:${port}`);
});
