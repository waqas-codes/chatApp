const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const router = express.Router();

router.post('/', upload.single('media'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the file path so the frontend can send it as a message or use as avatar
    res.status(200).json({
        message: 'File Uploaded',
        filePath: `/${req.file.path.replace(/\\/g, '/')}`
    });
});

module.exports = router;
