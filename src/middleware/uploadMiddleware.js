import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Single file upload middleware
const singleUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new ApiError(400, 'Only image files are allowed'));
    }
    cb(null, true);
  }
}).single('image');

// Multiple files upload middleware with expanded file type support
const multipleUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Accept both images and documents
    if (file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Unsupported file type'), false);
    }
  }
}).array('images', 5);

// Wrapper functions to handle multer errors
export const handleSingleUpload = (req, res, next) => {
  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      next(new ApiError(400, `Upload error: ${err.message}`));
      return;
    } else if (err) {
      next(err);
      return;
    }
    next();
  });
};

// Create a new multer instance for fields upload
const fieldsUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Accept both images and documents
    if (file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Unsupported file type'), false);
    }
  }
});

// Export handleMultipleUpload with both array and fields capabilities
export const handleMultipleUpload = (req, res, next) => {
  // Specific routes that require document field uploads
  const documentUploadRoutes = [
    '/api/business/register',
    '/api/business/update',
    '/api/property/verify',
    '/api/documents/upload'
  ];

  if (documentUploadRoutes.includes(req.route.path)) {
    return fieldsUpload.fields([
      { name: 'companyCertificate', maxCount: 1 },
      { name: 'representativeId', maxCount: 1 },
      { name: 'ownershipProof', maxCount: 1 },
      { name: 'utilityBill', maxCount: 1 },
      { name: 'authorizationLetter', maxCount: 1 },
      { name: 'frontImage', maxCount: 1 },
      { name: 'backImage', maxCount: 1 }
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        next(new ApiError(400, `Upload error: ${err.message}`));
        return;
      } else if (err) {
        next(err);
        return;
      }
      next();
    });
  }

  // Default to array upload for other routes
  multipleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      next(new ApiError(400, `Upload error: ${err.message}`));
      return;
    } else if (err) {
      next(err);
      return;
    }
    next();
  });
};

// Community image upload middleware
const communityUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new ApiError(400, 'Only image files are allowed'));
    }
    cb(null, true);
  }
}).single('avatar');

export const handleCommunityUpload = (req, res, next) => {
  communityUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      next(new ApiError(400, `Upload error: ${err.message}`));
      return;
    } else if (err) {
      next(err);
      return;
    }
    next();
  });
};

// Add support for document types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Create a new multer instance for verification documents
const verificationUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 3 // Allow up to 3 files (front, back, and proof document)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only images and PDF files are allowed'), false);
    }
  }
}).fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 },
  { name: 'proofDocument', maxCount: 1 }
]);

export const handleVerificationUpload = (req, res, next) => {
  verificationUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      next(new ApiError(400, `Upload error: ${err.message}`));
      return;
    } else if (err) {
      next(err);
      return;
    }
    next();
  });
};

// Add new configuration for business verification uploads while keeping existing code
const businessVerificationUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 2 // Allow up to 2 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only images and PDF files are allowed'), false);
    }
  }
}).fields([
  { name: 'companyCertificate', maxCount: 1 },
  { name: 'representativeId', maxCount: 1 }
]);

// Add new handler while keeping existing code
export const handleBusinessVerificationUpload = (req, res, next) => {
  businessVerificationUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      next(new ApiError(400, `Upload error: ${err.message}`));
      return;
    } else if (err) {
      next(err);
      return;
    }
    next();
  });
};

// Add new property verification upload configuration while keeping existing code
const propertyVerificationUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 3 // Allow up to 3 files (ownership proof, utility bill, and optional authorization letter)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only images and PDF files are allowed'), false);
    }
  }
}).fields([
  { name: 'ownershipProof', maxCount: 1 },
  { name: 'utilityBill', maxCount: 1 },
  { name: 'authorizationLetter', maxCount: 1 }
]);

// Add new handler for property verification uploads
export const handlePropertyVerificationUpload = (req, res, next) => {
  propertyVerificationUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      next(new ApiError(400, `Upload error: ${err.message}`));
      return;
    } else if (err) {
      next(err);
      return;
    }
    next();
  });
};

export const handleCommunityEventUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Allow only one file
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new ApiError(400, 'Only image files are allowed'));
    }
    cb(null, true);
  }
}).single('image'); // Use 'image' as the field name