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

module.exports = log;
