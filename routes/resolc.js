const express = require('express');
const { validateResolcInput } = require('../middleware/validation');
const { processTask } = require('../controllers/taskController');

const router = express.Router();
router.post('/', validateResolcInput, processTask('resolc'));

module.exports = router;
