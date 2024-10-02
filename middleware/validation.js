const { body } = require('express-validator');

const validateResolcInput = [
  // Validate cmd
  body('cmd')
    .isString()
    .notEmpty()
    .custom((value) => {
      if (!['--standard-json', '--license', '--version'].includes(value)) {
        throw new Error('Invalid compiler command');
      }
      return true;
    }),

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
  // Validate cmd
  body('cmd')
    .isString()
    .notEmpty()
    .custom((value) => {
      if (value != '--version') {
        throw new Error('Invalid compiler command');
      }
      return true;
    }),
];

module.exports = {
  validateResolcInput,
  validateSolcInput,
};
