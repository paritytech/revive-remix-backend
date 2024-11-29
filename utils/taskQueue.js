const async = require('async');
const { spawn } = require('child_process');
const { getCPUsNumber } = require('../utils/cpusNumber');
const config = require('../config/config');
const log = require('../middleware/logger');
const soljson = require('solc/soljson');
const createRevive = require('./resolc.js')

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
          type: 'InternalCompilerError',
        },
      ],
    };
  }

  // Worker function to handle tasks
  processTask(task, done) {
    const { bin, cmd, input } = task;

    const revive = createRevive()
    revive.soljson = soljson

    let stdout = ''
    revive.setStdoutCallback(function (char) {
        stdout += char
    })

    let stderr = ''
    revive.setStderrCallback(function (char) {
        stderr += char
    })

    revive.setStdinData(input)


    // Compile the Solidity source code
    const code = revive.callMain([cmd])
    if (code === 0) {
      return done(null, stdout);
    }
    return done(new Error(stderr));
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
