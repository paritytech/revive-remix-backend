const path = require('path');
const { validationResult } = require('express-validator');
const { handleError, handleResult } = require('../middleware/reposnseHandler');
const log = require('../middleware/logger');
const { httpRequestDuration } = require('../utils/metrics');
const TaskQueue = require('../utils/taskQueue');

const processTask = (binName) => (req, res) => {
  const end = httpRequestDuration.startTimer();
  log('info', 'Received request', {
    method: req.method,
    endpoint: req.originalUrl,
    command: req.body.cmd || 'unknown',
  });

  // Check if the queue is overloaded
  if (TaskQueue.isOverloaded()) {
    return handleError(req, res, end, 429);
  }

  // Validate the request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((err) => err.msg)
      .join(', ');
    return handleError(req, res, end, 400, message);
  }

  // Default to 0.1.0 if no version provided
  const version = req.query.version || '0.1.0';
  // Push the task to the queue
  TaskQueue.addTask({ bin: path.resolve(__dirname, `../bin/${version}/${binName}`), ...req.body }, (err, result) => {
    if (err) {
      return handleError(req, res, end, 500, err.message);
    }
    handleResult(req, res, end, result);
  });
};

module.exports = { processTask };
