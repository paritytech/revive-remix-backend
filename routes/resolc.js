const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const { handleError, handleResult } = require('../middleware/reposnseHandler');
const config = require('../config/config');
const log = require('../middleware/logger');
const { httpRequestDuration } = require('../utils/metrics');
const TaskQueue = require('../utils/taskQueue');
const { validateInput } = require('../middleware/validation');

router.post('/', validateInput, (req, res) => {
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

  // Check if the queue is overloaded.
  if (TaskQueue.isOverloaded()) {
    return handleError(req, res, end, 429);
  }
  // Push the task to the queue
  TaskQueue.addTask(
    { bin: 'resolc', cmd: req.body.cmd, input: req.body.input },
    (err, result) => {
      if (err) {
        return handleError(req, res, end, 500, err.message);
      }
      handleResult(req, res, end, result);
    },
  );
});

module.exports = router;
