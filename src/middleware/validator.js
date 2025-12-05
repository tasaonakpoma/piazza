const { body, validationResult } = require('express-validator');

/**
 * Validation Middleware
 * Centralized validation rules and error handler for the Piazza API
 */

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  next();
};

// User registration validation rules
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

// User login validation rules
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Post creation validation rules
const validateCreatePost = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 2000 })
    .withMessage('Content cannot exceed 2000 characters'),
  
  body('topic')
    .isIn(['Politics', 'Health', 'Sport', 'Tech'])
    .withMessage('Topic must be one of: Politics, Health, Sport, Tech'),
  
  handleValidationErrors
];

// Comment validation rules
const validateComment = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        error: `Invalid ${paramName} format` 
      });
    }
    next();
  };
};

module.exports = {
  validateRegister,
  validateLogin,
  validateCreatePost,
  validateComment,
  validateObjectId,
  handleValidationErrors
};
