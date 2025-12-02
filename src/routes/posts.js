const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

const router = express.Router();

const createPostValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 2000 }).withMessage('Content cannot exceed 2000 characters'),
  body('topic').isIn(['Politics', 'Health', 'Sport', 'Tech']).withMessage('Topic must be one of: Politics, Health, Sport, Tech')
];

router.post('/', protect, createPostValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error while creating post' });
  }
});

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({ status: 'Live' })
      .sort({ createdAt: -1 })
      .populate('author', 'username');

    res.json({ success: true, count: posts.length, posts });
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ error: 'Server error while fetching posts' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('comments.user', 'username');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ success: true, post });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ error: 'Server error while fetching post' });
  }
});

router.get('/topic/:topic', async (req, res) => {
  const topic = req.params.topic;

  if (!['Politics', 'Health', 'Sport', 'Tech'].includes(topic)) {
    return res.status(400).json({ error: 'Invalid topic' });
  }

  try {
    const posts = await Post.find({ topic, status: 'Live' })
      .sort({ createdAt: -1 })
      .populate('author', 'username');

    res.json({ success: true, count: posts.length, posts });
  } catch (err) {
    console.error('Get posts by topic error:', err);
    res.status(500).json({ error: 'Server error while fetching posts by topic' });
  }
});

router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.dislikes = post.dislikes.filter(
      (userId) => userId.toString() !== req.user._id.toString()
    );

    if (post.likes.some((userId) => userId.toString() === req.user._id.toString())) {
      post.likes = post.likes.filter(
        (userId) => userId.toString() !== req.user._id.toString()
      );
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();

    res.json({
      success: true,
      message: 'Post like status updated',
      likeCount: post.likes.length,
      dislikeCount: post.dislikes.length
    });
  } catch (err) {
    console.error('Like post error:', err);
    res.status(500).json({ error: 'Server error while liking post' });
  }
});

router.post('/:id/dislike', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.likes = post.likes.filter(
      (userId) => userId.toString() !== req.user._id.toString()
    );

    if (post.dislikes.some((userId) => userId.toString() === req.user._id.toString())) {
      post.dislikes = post.dislikes.filter(
        (userId) => userId.toString() !== req.user._id.toString()
      );
    } else {
      post.dislikes.push(req.user._id);
    }

    await post.save();

    res.json({
      success: true,
      message: 'Post dislike status updated',
      likeCount: post.likes.length,
      dislikeCount: post.dislikes.length
    });
  } catch (err) {
    console.error('Dislike post error:', err);
    res.status(500).json({ error: 'Server error while disliking post' });
  }
});

router.post('/:id/comment', protect, [
  body('text').trim().notEmpty().withMessage('Comment text is required').isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

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
      comments: post.comments,
      commentCount: post.comments.length
    });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Server error while adding comment' });
  }
});

// GET /api/posts/topic/:topic - Get all posts by topic (Action 3)
router.get('/topic/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    
    // Find all live posts for the specified topic
    const posts = await Post.find({ 
      topic: topic,
      status: 'Live'
    })
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: posts.length, 
      posts 
    });
  } catch (err) {
    console.error('Get posts by topic error:', err);
    res.status(500).json({ error: 'Server error while fetching posts by topic' });
  }
});

// GET /api/posts/topic/:topic/active - Get most active post in topic (Action 5)
router.get('/topic/:topic/active', async (req, res) => {
  try {
    const { topic } = req.params;
    
    // Find the most active live post (highest likes + dislikes)
    const posts = await Post.find({ 
      topic: topic,
      status: 'Live'
    })
      .populate('author', 'username');

    if (posts.length === 0) {
      return res.status(404).json({ error: 'No active posts found for this topic' });
    }

    // Calculate activity score (likes + dislikes) and find the most active
    const mostActive = posts.reduce((max, post) => {
      const currentActivity = post.likes.length + post.dislikes.length;
      const maxActivity = max.likes.length + max.dislikes.length;
      return currentActivity > maxActivity ? post : max;
    });

    res.json({ 
      success: true, 
      post: mostActive,
      activityScore: mostActive.likes.length + mostActive.dislikes.length
    });
  } catch (err) {
    console.error('Get most active post error:', err);
    res.status(500).json({ error: 'Server error while fetching most active post' });
  }
});

// GET /api/posts/topic/:topic/expired - Get expired posts history for topic (Action 6)
router.get('/topic/:topic/expired', async (req, res) => {
  try {
    const { topic } = req.params;
    
    // Find all expired posts for the specified topic
    const posts = await Post.find({ 
      topic: topic,
      status: 'Expired'
    })
      .populate('author', 'username')
      .sort({ expiresAt: -1 }); // Sort by expiration date, most recent first

    res.json({ 
      success: true, 
      count: posts.length, 
      posts 
    });
  } catch (err) {
    console.error('Get expired posts error:', err);
    res.status(500).json({ error: 'Server error while fetching expired posts' });
  }
});
'/like'

module.exports = router;
