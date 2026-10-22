import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Helper to ensure Cloudinary always has latest configuration from .env
export const ensureCloudinaryConfig = () => {
    dotenv.config({ override: true });
    if (process.env.CLOUDINARY_URL) {
        cloudinary.config();
    } else {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true
        });
    }
    return cloudinary;
};

// Initial config
ensureCloudinaryConfig();

/**
 * Checks if Cloudinary is configured
 */
export const isCloudinaryConfigured = () => {
    ensureCloudinaryConfig();
    return Boolean(
        process.env.CLOUDINARY_URL ||
        ((process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME) &&
         process.env.CLOUDINARY_API_KEY &&
         process.env.CLOUDINARY_API_SECRET)
    );
};

/**
 * Uploads an image buffer directly to Cloudinary using a stream.
 * Automatically applies face-gravity center crop, webp format optimization, and quality tuning.
 * 
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - Custom upload options
 * @returns {Promise<{ url: string, publicId: string, secureUrl: string }>}
 */
export const uploadImageStream = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        if (!isCloudinaryConfigured()) {
            return reject(new Error('Cloudinary is not configured. Please provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env'));
        }

        const c = ensureCloudinaryConfig();

        const uploadOptions = {
            folder: options.folder || 'appointly/avatars',
            resource_type: 'image',
            transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            ...options
        };

        const uploadStream = c.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary Stream Upload Error]:', error);
                    const errMsg = error.message || error.error?.message || (typeof error === 'string' ? error : 'Cloudinary upload failed');
                    return reject(new Error(errMsg));
                }
                resolve({
                    url: result.secure_url || result.url,
                    secureUrl: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                    format: result.format
                });
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Uploads a document (PDF, PNG, JPEG, etc.) directly to Cloudinary using a stream.
 * Automatically handles PDFs and image documents via resource_type: 'auto'.
 * 
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - Custom upload options
 * @returns {Promise<{ url: string, publicId: string, secureUrl: string, format: string }>}
 */
export const uploadDocumentStream = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        if (!isCloudinaryConfigured()) {
            return reject(new Error('Cloudinary is not configured. Please provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env'));
        }

        const c = ensureCloudinaryConfig();

        const uploadOptions = {
            folder: options.folder || 'appointly/verifications',
            resource_type: 'auto',
            ...options
        };

        const uploadStream = c.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary Document Upload Error]:', error);
                    const errMsg = error.message || error.error?.message || (typeof error === 'string' ? error : 'Cloudinary document upload failed');
                    return reject(new Error(errMsg));
                }
                resolve({
                    url: result.secure_url || result.url,
                    secureUrl: result.secure_url,
                    publicId: result.public_id,
                    format: result.format
                });
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Deletes an image or document from Cloudinary by public ID
 */
export const deleteImage = async (publicId, resourceType = 'image') => {
    if (!isCloudinaryConfigured() || !publicId) return;
    try {
        return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.warn('[Cloudinary Delete Error]:', err.message);
    }
};

export default cloudinary;
