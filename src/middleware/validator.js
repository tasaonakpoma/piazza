/**

/**
 * Validation chain for creating a new post.
 * 
 * Content length limits are important here to prevent abuse and ensure
 * the UI can display posts properly.
 */
const validateCreatePost = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ max: LIMITS.postTitle.max })
        .withMessage(`Title cannot exceed ${LIMITS.postTitle.max} characters`),
    
    body('content')
        .trim()
        .notEmpty()
        .withMessage('Content is required')
        .isLength({ max: LIMITS.postContent.max })
        .withMessage(`Content cannot exceed ${LIMITS.postContent.max} characters`),
    
    body('topic')
        .isIn(VALID_TOPICS)
        .withMessage(`Topic must be one of: ${VALID_TOPICS.join(', ')}`),
    
    handleValidationErrors
];

/**
 * Validation chain for adding a comment to a post.
 */
const validateComment = [
    body('text')
        .trim()
        .notEmpty()
        .withMessage('Comment text is required')
        .isLength({ max: LIMITS.comment.max })
        .withMessage(`Comment cannot exceed ${LIMITS.comment.max} characters`),
    
    handleValidationErrors
];

// =============================================================================
// PARAMETER VALIDATION
// =============================================================================

/**
 * Factory function that creates middleware to validate MongoDB ObjectIds
 * in route parameters.
 * 
 * Usage: router.get('/posts/:postId', validateObjectId('postId'), getPost)
 * 
 * @param {string} paramName - The name of the route parameter to validate
 * @returns {Function} Express middleware function
 */
const validateObjectId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id || !PATTERNS.objectId.test(id)) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${paramName} format. Expected a valid MongoDB ObjectId.`
            });
        }
        
        next();
    };
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // Validation chains
    validateRegister,
    validateLogin,
    validateCreatePost,
    validateComment,
    
    // Utility validators
    validateObjectId,
    handleValidationErrors,
    
    // Export config for potential use in tests or other modules
    VALID_TOPICS,
    LIMITS
};
