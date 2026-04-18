const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(
            null,
            `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

function checkFileType(file, cb) {
    const allowedExtensions = /jpg|jpeg|png|gif|mp4|webm|pdf|doc|docx|ogg|wav|mp3/;
    const allowedMimetypes = /image\/(jpeg|png|gif|webp)|video\/(mp4|webm)|audio\/(mpeg|ogg|wav|mp3)|application\/(pdf|msword|vnd\.openxmlformats)/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Allowed: images, videos, documents, and audio files only'));
    }
}

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

module.exports = upload;
