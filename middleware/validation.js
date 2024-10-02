const { body } = require('express-validator');

const validateAllowedKeys = (allowedKeys) => {
  return body().custom((value) => {
    const keys = Object.keys(value);
    keys.forEach((key) => {
      if (!allowedKeys.includes(key)) {
        throw new Error(`Unexpected property: ${key}`);
      }
    });
    return true;
  });
};

const validateCommand = (allowedCommands) => {
  return body('cmd')
    .isString()
    .notEmpty()
    .custom((value) => {
      if (!allowedCommands.includes(value)) {
        throw new Error('Invalid compiler command');
      }
      return true;
    });
};

const validateResolcInput = [
  validateAllowedKeys(['cmd', 'input']),
  validateCommand(['--standard-json', '--license', '--version']),
  // Validate input: optional, but if present, must be valid JSON
  body('input')
    .optional()
    .custom((value) => {
      if (value === '') {
        return true; // Allow empty string
      }
      try {
        JSON.parse(value); // Check if input is valid JSON
        return true;
      } catch (error) {
        throw new Error('Input must be valid JSON');
      }
    }),
];

const validateSolcInput = [
  validateAllowedKeys(['cmd']),
  validateCommand(['--version']),
];

module.exports = {
  validateResolcInput,
  validateSolcInput,
};
