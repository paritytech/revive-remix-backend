const { httpRequestCount, httpRequestErrors } = require('../utils/metrics');
const log = require('./logger');

// Error messages mapping
const errorMessages = {
  400: 'Bad Request: The request could not be understood or was missing required parameters.',
  429: 'Server busy, too many requests. Please try again later.',
  500: 'Internal Server Error.',
};

// Function to get user-friendly error message
function getErrorMessage(statusCode) {
  return errorMessages[statusCode] || 'An unexpected error occurred.';
}

function handleError(request, response, end, status, error = null) {
  httpRequestCount.inc({
    method: request.method,
    endpoint: request.originalUrl,
    status,
  });
  httpRequestErrors.inc({
    method: request.method,
    endpoint: request.originalUrl,
    status,
  });

  log('error', 'Request processing failed', {
    method: request.method,
    endpoint: request.originalUrl,
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
      endpoint: request.originalUrl,
      status,
      error: sendError.message,
    });
  } finally {
    end({ method: request.method, endpoint: request.originalUrl, status });
  }
}

function handleResult(request, response, end, result) {
  const status = 200;
  httpRequestCount.inc({
    method: request.method,
    endpoint: request.originalUrl,
    status,
  });
  log('info', 'Request processed successfully', {
    method: request.method,
    endpoint: request.originalUrl,
    command: request.body.cmd,
    status,
  });

  try {
    response.status(status).send(result);
  } catch (sendError) {
    // Log the sending failure
    log('error', 'Failed to send error response', {
      method: request.method,
      endpoint: request.originalUrl,
      status,
      error: sendError.message,
    });
    httpRequestErrors.inc({
      method: request.method,
      endpoint: request.originalUrl,
      status,
    });
  } finally {
    end({ method: request.method, endpoint: request.originalUrl, status });
  }
}

// Export the function so it can be used in other files
module.exports = {
  handleError,
  handleResult,
};
