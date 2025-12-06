const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

const router = express.Router();

const TOPICS = ['Politics', 'Health', 'Sport', 'Tech'];
const DEFAULT_EXPIRY = 5; // minutes

// Create post (Action 2)
router.post('/', protect, [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('content').trim().notEmpty().isLength({ max: 2000 }),
  body('topic').isIn(TOPICS)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content, topic, expirationMins } = req.body;
  
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + (expirationMins || DEFAULT_EXPIRY));

  try {
    const post = await Post.create({
      title,
      content,
      topic,
      author: req.user._id,
      authorUsername: req.user.username,
      expirationTime: expiry
    });

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error('Create post error:', err.message);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get all live posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({ status: 'Live' })
      .sort({ createdAt: -1 })
      .populate('author', 'username');

    res.json({ success: true, count: posts.length, posts });
  } catch (err) {
    console.error('Get posts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get single post
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
    console.error('Get post error:', err.message);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Browse by topic (Action 3)
router.get('/topic/:topic', async (req, res) => {
  const { topic } = req.params;

  if (!TOPICS.includes(topic)) {
    return res.status(400).json({ error: `Invalid topic. Use: ${TOPICS.join(', ')}` });
  }

  try {
    const posts = await Post.find({ topic, status: 'Live' })
      .sort({ createdAt: -1 })
      .populate('author', 'username');

    res.json({ success: true, count: posts.length, posts });
  } catch (err) {
    console.error('Get topic posts:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Like post (Action 4)
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Check expiry
    if (post.status === 'Expired' || new Date() > post.expirationTime) {
      return res.status(400).json({ error: 'Post expired' });
    }

    // Can't like own post
    if (post.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot like own post' });
    }

    const userId = req.user._id.toString();
    
    // Remove from dislikes first
    post.dislikes = post.dislikes.filter(id => id.toString() !== userId);
    
    // Toggle like
    const liked = post.likes.some(id => id.toString() === userId);
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();
    res.json({ success: true, likes: post.likes.length, dislikes: post.dislikes.length });
  } catch (err) {
    console.error('Like error:', err.message);
    res.status(500).json({ error: 'Failed to like' });
  }
});

// Dislike post (Action 4)
router.post('/:id/dislike', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.status === 'Expired' || new Date() > post.expirationTime) {
      return res.status(400).json({ error: 'Post expired' });
    }

    const userId = req.user._id.toString();
    
    // Remove from likes first
    post.likes = post.likes.filter(id => id.toString() !== userId);
    
    // Toggle dislike
    const disliked = post.dislikes.some(id => id.toString() === userId);
    if (disliked) {
      post.dislikes = post.dislikes.filter(id => id.toString() !== userId);
    } else {
      post.dislikes.push(req.user._id);
    }

    await post.save();
    res.json({ success: true, likes: post.likes.length, dislikes: post.dislikes.length });
  } catch (err) {
    console.error('Dislike error:', err.message);
    res.status(500).json({ error: 'Failed to dislike' });
  }
});

// Comment on post (Action 4)
router.post('/:id/comment', protect, [
  body('text').trim().notEmpty().isLength({ max: 500 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.status === 'Expired' || new Date() > post.expirationTime) {
      return res.status(400).json({ error: 'Post expired' });
    }

    post.comments.push({
      user: req.user._id,
      username: req.user.username,
      text: req.body.text
    });

    await post.save();
    res.status(201).json({
      success: true,
      comment: post.comments[post.comments.length - 1],
      total: post.comments.length
    });
  } catch (err) {
    console.error('Comment error:', err.message);
    res.status(500).json({ error: 'Failed to comment' });
  }
});

// Most active post in topic (Action 5)
router.get('/topic/:topic/active', protect, async (req, res) => {
  const { topic } = req.params;

  if (!TOPICS.includes(topic)) {
    return res.status(400).json({ error: 'Invalid topic' });
  }

  try {
    const posts = await Post.find({ topic, status: 'Live' })
      .populate('author', 'username');

    if (!posts.length) {
      return res.status(404).json({ error: 'No posts found' });
    }

    // Find most active (highest likes + dislikes)
    let mostActive = posts[0];
    let maxScore = mostActive.likes.length + mostActive.dislikes.length;

    for (const p of posts) {
      const score = p.likes.length + p.dislikes.length;
      if (score > maxScore) {
        mostActive = p;
        maxScore = score;
      }
    }

    res.json({ success: true, post: mostActive, activity: maxScore });
  } catch (err) {
    console.error('Active post error:', err.message);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// Expired posts history (Action 6)
router.get('/topic/:topic/expired', protect, async (req, res) => {
  const { topic } = req.params;

  if (!TOPICS.includes(topic)) {
    return res.status(400).json({ error: 'Invalid topic' });
  }

  try {
    // Update expired posts first
    await Post.updateMany(
      { expirationTime: { $lt: new Date() }, status: 'Live' },
      { status: 'Expired' }
    );

    const posts = await Post.find({ topic, status: 'Expired' })
      .sort({ expirationTime: -1 })
      .populate('author', 'username');

    res.json({ success: true, count: posts.length, posts });
  } catch (err) {
    console.error('Expired posts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

module.exports = router;
