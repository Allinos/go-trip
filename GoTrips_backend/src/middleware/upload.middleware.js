const multer = require('multer');
const multerS3 = require('multer-s3');
const s3Client  = require('../config/aws.js');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { sendError } = require('../utils/response.utils');


/**
 * S3 Upload Configuration
 */
const s3Storage = (folderPath = 'uploads') => {
  return multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    // acl: 'public-read', // Make files publicly accessible
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        uploadedBy: req.userId ? req.userId.toString() : 'anonymous',
        uploadedAt: new Date().toISOString(),
      });
    },
    key: (req, file, cb) => {
      const fileName = generateFileName(file.originalname);
      const filePath = `${folderPath}/${fileName}`;
      cb(null, filePath);
    },
  });
};

// File filter function
const fileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    // Check file type
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  };
};

// Generate unique filename
const generateFileName = (originalname, prefix = '') => {
  const ext = path.extname(originalname);
  const name = path.basename(originalname, ext);
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);

  return `${prefix}${name}-${timestamp}-${uuid}${ext}`;
};

/**
 * Local storage (fallback/development)
 */
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fileName = generateFileName(file.originalname);
    cb(null, fileName);
  },
});

/**
 * Memory storage (for processing before upload)
 */
const memoryStorage = multer.memoryStorage();

// File size limits
const limits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
};

/**
 * Upload configurations for different use cases
 */

// Single image upload (profile photos, etc.)
const uploadImage = multer({
  storage: s3Storage('images'),
  limits,
  fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
});

// Multiple images upload (vehicle photos, etc.)
const uploadMultipleImages = multer({
  storage: s3Storage('images'),
  limits,
  fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
});

// Document upload (PDF, images)
const uploadDocument = multer({
  storage: s3Storage('documents'),
  limits,
  fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']),
});

// Multiple documents upload
const uploadMultipleDocuments = multer({
  storage: s3Storage('documents'),
  limits,
  fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']),
});

// Vehicle-specific uploads
const uploadVehiclePhoto = multer({
  storage: s3Storage('vehicles'),
  limits,
  fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
});

// User profile photo
const uploadProfilePhoto = multer({
  storage: s3Storage('users/profiles'),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for profile photos
  },
  fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
});

// Partner document uploads
const uploadPartnerDocument = multer({
  storage: s3Storage('partners/documents'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for documents
  },
  fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']),
});

/**
 * Middleware wrappers with error handling
 */

// Single file upload middleware
const singleUpload = (fieldName, uploadConfig) => {
  return (req, res, next) => {
    const upload = uploadConfig.single(fieldName);

    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, `File size too large. Maximum size: ${limits.fileSize / (1024 * 1024)}MB`, 400, 'FILE_TOO_LARGE');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return sendError(res, `Unexpected field: ${err.field}`, 400, 'UNEXPECTED_FIELD');
        }
        return sendError(res, err.message, 400, 'UPLOAD_ERROR');
      } else if (err) {
        // Custom errors from fileFilter
        console.log(err);
        return sendError(res, err.message, 400, 'INVALID_FILE');
        
      }

      // Add file URL to request
      if (req.file) {
        req.file.url = req.file.location || `/uploads/${req.file.filename}`;
      }

      next();
    });
  };
};

// Multiple files upload middleware
const multipleUpload = (fieldName, maxCount, uploadConfig) => {
  return (req, res, next) => {
    const upload = uploadConfig.array(fieldName, maxCount);

    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, `File size too large. Maximum size: ${limits.fileSize / (1024 * 1024)}MB`, 400, 'FILE_TOO_LARGE');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return sendError(res, `Too many files. Maximum: ${maxCount}`, 400, 'TOO_MANY_FILES');
        }
        return sendError(res, err.message, 400, 'UPLOAD_ERROR');
      } else if (err) {
        console.log(err);
        
        return sendError(res, err.message, 400, 'INVALID_FILE');
      }

      // Add URLs to files
      if (req.files && req.files.length > 0) {
        req.files = req.files.map((file) => ({
          ...file,
          url: file.location || `/uploads/${file.filename}`,
        }));
      }

      next();
    });
  };
};

// Multiple fields upload (different field names)
const fieldsUpload = (fields, uploadConfig) => {
  return (req, res, next) => {
    const upload = uploadConfig.fields(fields);

    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, `File size too large. Maximum size: ${limits.fileSize / (1024 * 1024)}MB`, 400, 'FILE_TOO_LARGE');
        }
        return sendError(res, err.message, 400, 'UPLOAD_ERROR');
      } else if (err) {
        console.log(err);
        
        return sendError(res, err.message, 400, 'INVALID_FILE');
      }

      // Add URLs to files
      if (req.files) {
        Object.keys(req.files).forEach((fieldName) => {
          req.files[fieldName] = req.files[fieldName].map((file) => ({
            ...file,
            url: file.location || `/uploads/${file.filename}`,
          }));
        });
      }

      next();
    });
  };
};

/**
 * Ready-to-use upload middlewares
 */

// Profile photo upload
const uploadProfilePhotoMiddleware = singleUpload('profilePhoto', uploadProfilePhoto);

// Vehicle photos upload (up to 10 photos)
const uploadVehiclePhotosMiddleware = multipleUpload('vehiclePhotos', 10, uploadVehiclePhoto);

// Partner documents upload (multiple types)
const uploadPartnerDocumentsMiddleware = fieldsUpload(
  [
    { name: 'driving_license', maxCount: 2 },
    { name: 'vehicleRC', maxCount: 2 },
    { name: 'insurance', maxCount: 2 },
    { name: 'aadhar', maxCount: 2 },
    { name: 'pan', maxCount: 1 },
  ],
  uploadPartnerDocument
);

// Single document upload
const uploadSingleDocumentMiddleware = singleUpload('document', uploadDocument);

// Generic single image
const uploadSingleImageMiddleware = singleUpload('image', uploadImage);

// Generic multiple images
const uploadMultipleImagesMiddleware = (maxCount = 10) => multipleUpload('images', maxCount, uploadMultipleImages);

module.exports = {
  // Upload configurations
  uploadImage,
  uploadMultipleImages,
  uploadDocument,
  uploadMultipleDocuments,
  uploadVehiclePhoto,
  uploadProfilePhoto,
  uploadPartnerDocument,

  // Middleware wrappers
  singleUpload,
  multipleUpload,
  fieldsUpload,

  // Ready-to-use middlewares
  uploadProfilePhotoMiddleware,
  uploadVehiclePhotosMiddleware,
  uploadPartnerDocumentsMiddleware,
  uploadSingleDocumentMiddleware,
  uploadSingleImageMiddleware,
  uploadMultipleImagesMiddleware,

  // Utilities
  generateFileName,
  s3Client,
};
