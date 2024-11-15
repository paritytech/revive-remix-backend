const async = require('async');
const { spawn } = require('child_process');
const { getCPUsNumber } = require('../utils/cpusNumber');
const config = require('../config/config');
const log = require('../middleware/logger');

class TaskQueue {
  constructor() {
    this.numCPUs = getCPUsNumber();
    log('info', `Set number of workers to ${this.numCPUs}`);

    // Create the async queue
    this.queue = async.queue(this.processTask.bind(this), this.numCPUs);
  }

  generateCompilerError(message) {
    return {
      sources: {},
      errors: [
        {
          component: 'general',
          errorCode: '9999',
          formattedMessage: 'InternalCompilerError: ' + message,
          message: 'InternalCompilerError: ' + message,
          severity: 'error',
          sourceLocation: {
            file: '',
            start: -1,
            end: -1,
          },
          type: 'CompilerCrash',
        },
      ],
    };
  }

  // Worker function to handle tasks
  processTask(task, done) {
    const { bin, cmd, input } = task;
    const process = spawn(bin, [cmd], {
      timeout: config.server.compilationTimeout,
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    if (input) {
      process.stdin.write(input);
    }
    process.stdin.end();

    process.on('close', (code, signal) => {
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
        case 'SIGABRT':
        case null:
          // The revive compiler crash
          return done(null, this.generateCompilerError(stderr));
        default:
          error = stderr || 'Internal error';
      }

      return done(new Error(error));
    });
  }

  // Method to add a task to the queue
  addTask(task, callback) {
    this.queue.push(task, callback);
  }

  // Method to get the current queue length
  getLength() {
    return this.queue.length();
  }

  // Method to check if the queue is overloaded
  isOverloaded() {
    // The maximum delay for processing is 20 seconds, after which requests are dropped.
    return this.getLength() >= this.numCPUs * 4;
  }
}

// Export a singleton instance of TaskQueue
module.exports = new TaskQueue();
