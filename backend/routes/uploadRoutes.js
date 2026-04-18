const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/userModel');
const generateToken = require('../config/generateToken');
const router = express.Router();

// General file upload (for chat media etc.)
router.post('/', protect, upload.single('media'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the file path so the frontend can send it as a message
    res.status(200).json({
        message: 'File Uploaded',
        filePath: `/${req.file.path.replace(/\\/g, '/')}`
    });
});

// Avatar upload — uploads the file + updates the user's avatar in DB
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const avatarPath = `/${req.file.path.replace(/\\/g, '/')}`;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.avatar = avatarPath;
        const updatedUser = await user.save();

        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            avatar: updatedUser.avatar,
            about: updatedUser.about,
            token: generateToken(updatedUser._id),
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ message: 'Server error during avatar upload' });
    }
});

module.exports = router;
