const express = require('express');
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', authenticate, upload.single('file'), uploadController.uploadSingle);

module.exports = router;
