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

// Export the function so it can be used in other files
module.exports = {
  getErrorMessage,
};
