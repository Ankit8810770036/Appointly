import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'verification');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
        const safeFieldName = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '');
        cb(null, `${safeFieldName}-${uniqueSuffix}${safeExt}`);
    }
});

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.pdf']);
const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']);

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype.toLowerCase();

    if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIMETYPES.has(mimetype)) {
        return cb(null, true);
    } else {
        const error = new Error('Invalid file type. Only JPEG, PNG, and PDF files are permitted.');
        error.statusCode = 400;
        cb(error);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    }
});

// Memory storage for avatar images direct-streamed to Cloudinary
const avatarFileFilter = (req, file, cb) => {
    const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']);
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

    if (allowedMimes.has(file.mimetype.toLowerCase()) && allowedExts.has(ext)) {
        return cb(null, true);
    }
    const error = new Error('Invalid file format. Please upload a JPEG, PNG, WEBP, or GIF image.');
    error.statusCode = 400;
    cb(error);
};

export const uploadAvatarMiddleware = multer({
    storage: multer.memoryStorage(),
    fileFilter: avatarFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
        files: 1
    }
});

export const uploadDocMiddleware = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max for documents
        files: 1
    }
});

/**
 * Validates a buffer's binary magic numbers (file signature).
 * Returns true if the header matches JPEG, PNG, WEBP, or PDF signatures.
 */
export const validateBufferSignature = (buffer) => {
    try {
        if (!buffer || buffer.length < 4) return false;
        const hex = buffer.subarray(0, 8).toString('hex').toLowerCase();

        // JPEG: ffd8ff
        const isJpeg = hex.startsWith('ffd8ff');
        // PNG: 89504e47
        const isPng = hex.startsWith('89504e47');
        // PDF: 25504446 (%PDF)
        const isPdf = hex.startsWith('25504446');
        // WEBP: 52494646 (RIFF)
        const isWebp = hex.startsWith('52494646');

        return isJpeg || isPng || isPdf || isWebp;
    } catch (err) {
        console.error('[validateBufferSignature Error]:', err);
        return false;
    }
};

/**
 * Validates the file's binary magic numbers (file signature) on disk.
 * Returns true if the file header matches JPEG, PNG, or PDF signatures.
 */
export const validateFileSignature = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return false;
        const buffer = Buffer.alloc(8);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 8, 0);
        fs.closeSync(fd);

        const hex = buffer.toString('hex').toLowerCase();

        // JPEG: ffd8ff
        const isJpeg = hex.startsWith('ffd8ff');
        // PNG: 89504e470d0a1a0a
        const isPng = hex.startsWith('89504e47');
        // PDF: 25504446 (%PDF)
        const isPdf = hex.startsWith('25504446');

        return isJpeg || isPng || isPdf;
    } catch (err) {
        console.error('[validateFileSignature Error]:', err);
        return false;
    }
};



