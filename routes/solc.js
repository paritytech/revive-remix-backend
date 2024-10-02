const express = require('express');
const { validateSolcInput } = require('../middleware/validation');
const { processTask } = require('../controllers/taskController');

const router = express.Router();
router.post('/', validateSolcInput, processTask('solc'));

module.exports = router;
