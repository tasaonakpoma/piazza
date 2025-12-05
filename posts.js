/**
 * Piazza API - Post Routes
 * 
 * Handles all CRUD operations and interactions for posts including:
 * - Creating, reading posts
 * - Filtering by topic
 * - Like/dislike functionality
 * - Comments
 * 
 * All write operations require authentication via the protect middleware.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

const router = express.Router();

// =============================================================================
// CONFIGURATION
// =============================================================================

// Centralizing these makes them easy to update and keeps validation consistent
const VALID_TOPICS = ['Politics', 'Health', 'Sport', 'Tech'];

const LIMITS = {
    titleMaxLength: 200,
    contentMaxLength: 2000,
    commentMaxLength: 500
};

// =============================================================================
// VALIDATION CHAINS
// =============================================================================

const validatePost = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ max: LIMITS.titleMaxLength })
        .withMessage(`Title cannot exceed ${LIMITS.titleMaxLength} characters`),
    
    body('content')
        .trim()
        .notEmpty().withMessage('Content is required')
        .isLength({ max: LIMITS.contentMaxLength })
        .withMessage(`Content cannot exceed ${LIMITS.contentMaxLength} characters`),
    
    body('topic')
        .isIn(VALID_TOPICS)
        .withMessage(`Topic must be one of: ${VALID_TOPICS.join(', ')}`)
];

const validateComment = [
    body('text')
        .trim()
        .notEmpty().withMessage('Comment text is required')
        .isLength({ max: LIMITS.commentMaxLength })
        .withMessage(`Comment cannot exceed ${LIMITS.commentMaxLength} characters`)
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks validation results and sends error response if validation failed.
 * Returns true if there were errors (and response was sent), false otherwise.
 */
function handleValidationErrors(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
        return true;
    }
    return false;
}

/**
 * Finds a post by ID and sends 404 if not found.
 * Returns the post if found, null otherwise.
 */
async function findPostOrFail(postId, res) {
    try {
        const post = await Post.findById(postId);
        
        if (!post) {
            res.status(404).json({
                success: false,
                error: 'Post not found'
            });
            return null;
        }
        
        return post;
    } catch (err) {
        // Handle invalid ObjectId format
        if (err.name === 'CastError') {
            res.status(400).json({
                success: false,
                error: 'Invalid post ID format'
            });
            return null;
        }
        throw err;
    }
}

/**
 * Toggles a user's presence in a reaction array (likes or dislikes).
 * Also removes the user from the opposite array to prevent liking AND disliking.
 * 
 * @param {Array} targetArray - The array to toggle the user in (likes or dislikes)
 * @param {Array} oppositeArray - The other array to remove the user from
 * @param {string} userId - The user's ID
 * @returns {Object} Updated arrays
 */
function toggleReaction(targetArray, oppositeArray, userId) {
    const userIdStr = userId.toString();
    
    // Remove from opposite array first (can't like AND dislike)
    const cleanedOpposite = oppositeArray.filter(
        id => id.toString() !== userIdStr
    );
    
    // Check if user already reacted
    const alreadyReacted = targetArray.some(
        id => id.toString() === userIdStr
    );
    
    let updatedTarget;
    if (alreadyReacted) {
        // Remove the reaction (toggle off)
        updatedTarget = targetArray.filter(id => id.toString() !== userIdStr);
    } else {
        // Add the reaction
        updatedTarget = [...targetArray, userId];
    }
    
    return {
        target: updatedTarget,
        opposite: cleanedOpposite
    };
}

/**
 * Standard error handler for route catch blocks.
 * Logs the error and sends a generic 500 response.
 */
function handleServerError(res, err, context) {
    console.error(`[Posts] ${context}:`, err.message);
    res.status(500).json({
        success: false,
        error: 'An unexpected error occurred. Please try again later.'
    });
}

// =============================================================================
// ROUTES - POST CRUD
// =============================================================================

/**
 * POST /
 * Create a new post
 * Requires authentication
 */
router.post('/', protect, validatePost, async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    
    const { title, content, topic } = req.body;
    
    try {
        const post = await Post.create({
            title,
            content,
            topic,
            author: req.user._id,
            authorUsername: req.user.username
        });
        
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post
        });
    } catch (err) {
        handleServerError(res, err, 'Error creating post');
    }
});

/**
 * GET /
 * Retrieve all live posts, sorted by newest first
 */
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find({ status: 'Live' })
            .sort({ createdAt: -1 })
            .populate('author', 'username');
        
        res.json({
            success: true,
            count: posts.length,
            posts
        });
    } catch (err) {
        handleServerError(res, err, 'Error fetching posts');
    }
});

/**
 * GET /:id
 * Retrieve a single post by ID with full details
 */
router.get('/:id', async (req, res) => {
    try {
        const post = await findPostOrFail(req.params.id, res);
        if (!post) return;
        
        // Populate author and comment users for display
        await post.populate([
            { path: 'author', select: 'username' },
            { path: 'comments.user', select: 'username' }
        ]);
        
        res.json({ success: true, post });
    } catch (err) {
        handleServerError(res, err, 'Error fetching post');
    }
});

/**
 * GET /topic/:topic
 * Retrieve all live posts for a specific topic
 */
router.get('/topic/:topic', async (req, res) => {
    const { topic } = req.params;
    
    // Validate topic before querying
    if (!VALID_TOPICS.includes(topic)) {
        return res.status(400).json({
            success: false,
            error: `Invalid topic. Must be one of: ${VALID_TOPICS.join(', ')}`
        });
    }
    
    try {
        const posts = await Post.find({ topic, status: 'Live' })
            .sort({ createdAt: -1 })
            .populate('author', 'username');
        
        res.json({
            success: true,
            count: posts.length,
            posts
        });
    } catch (err) {
        handleServerError(res, err, 'Error fetching posts by topic');
    }
});

// =============================================================================
// ROUTES - REACTIONS (LIKE/DISLIKE)
// =============================================================================

/**
 * POST /:id/like
 * Toggle like on a post. Removes dislike if present.
 * Requires authentication
 */
router.post('/:id/like', protect, async (req, res) => {
    try {
        const post = await findPostOrFail(req.params.id, res);
        if (!post) return;
        
        const { target, opposite } = toggleReaction(
            post.likes,
            post.dislikes,
            req.user._id
        );
        
        post.likes = target;
        post.dislikes = opposite;
        await post.save();
        
        res.json({
            success: true,
            message: 'Like status updated',
            likeCount: post.likes.length,
            dislikeCount: post.dislikes.length
        });
    } catch (err) {
        handleServerError(res, err, 'Error updating like');
    }
});

/**
 * POST /:id/dislike
 * Toggle dislike on a post. Removes like if present.
 * Requires authentication
 */
router.post('/:id/dislike', protect, async (req, res) => {
    try {
        const post = await findPostOrFail(req.params.id, res);
        if (!post) return;
        
        const { target, opposite } = toggleReaction(
            post.dislikes,
            post.likes,
            req.user._id
        );
        
        post.dislikes = target;
        post.likes = opposite;
        await post.save();
        
        res.json({
            success: true,
            message: 'Dislike status updated',
            likeCount: post.likes.length,
            dislikeCount: post.dislikes.length
        });
    } catch (err) {
        handleServerError(res, err, 'Error updating dislike');
    }
});

// =============================================================================
// ROUTES - COMMENTS
// =============================================================================

/**
 * POST /:id/comment
 * Add a comment to a post
 * Requires authentication
 */
router.post('/:id/comment', protect, validateComment, async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    
    try {
        const post = await findPostOrFail(req.params.id, res);
        if (!post) return;
        
        const comment = {
            user: req.user._id,
            username: req.user.username,
            text: req.body.text
        };
        
        post.comments.push(comment);
        await post.save();
        
        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            comment: post.comments[post.comments.length - 1],
            commentCount: post.comments.length
        });
    } catch (err) {
        handleServerError(res, err, 'Error adding comment');
    }
});

module.exports = router;
