const Post = require('../models/Post');
const User = require('../models/User');

// Helper function to validate topic
const validateTopic = (topic) => {
  const validTopics = ['Politics', 'Health', 'Sport', 'Tech'];
  return validTopics.includes(topic);
};

// Helper function to check if post is expired
const checkPostExpiration = (post) => {
  if (new Date() > new Date(post.expirationTime) && post.status === 'Live') {
    post.status = 'Expired';
    post.save();
    return true;
  }
  return post.status === 'Expired';
};

// Helper function to check if user is post owner
const checkPostOwnership = (post, userId) => {
  return post.author.toString() === userId.toString();
};

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { title, content, topic, expirationTime } = req.body;

    // Validate required fields
    if (!title || !content || !topic || !expirationTime) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Validate topic(s)
    const topicsArray = Array.isArray(topic) ? topic : [topic];
    for (let t of topicsArray) {
      if (!validateTopic(t)) {
        return res.status(400).json({ error: `Invalid topic: ${t}. Must be one of: Politics, Health, Sport, Tech` });
      }
    }

    // Validate expiration time is in the future
    if (new Date(expirationTime) <= new Date()) {
      return res.status(400).json({ error: 'Expiration time must be in the future' });
    }

    // Get author username
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create post
    const post = await Post.create({
      title,
      content,
      topic: topicsArray,
      author: req.user._id,
      authorUsername: user.username,
      expirationTime,
      status: 'Live'
    });

    // Populate author details
    await post.populate('author', 'username email');

    res.status(201).json({
      success: true,
      post
    });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error creating post' });
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
const getPosts = async (req, res) => {
  try {
    // Update expired posts before fetching
    await Post.updateExpiredPosts();

    const posts = await Post.find()
      .populate('author', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ error: 'Server error fetching posts' });
  }
};

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Private
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username email')
      .populate('comments.user', 'username');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check and update expiration status
    checkPostExpiration(post);

    res.json({
      success: true,
      post
    });
  } catch (err) {
    console.error('Get post by ID error:', err);
    res.status(500).json({ error: 'Server error fetching post' });
  }
};

// @desc    Get posts by topic
// @route   GET /api/posts/topic/:topic
// @access  Private
const getPostsByTopic = async (req, res) => {
  try {
    const { topic } = req.params;

    // Validate topic
    if (!validateTopic(topic)) {
      return res.status(400).json({ error: `Invalid topic: ${topic}. Must be one of: Politics, Health, Sport, Tech` });
    }

    // Update expired posts before fetching
    await Post.updateExpiredPosts();

    const posts = await Post.find({ topic: topic })
      .populate('author', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      topic,
      count: posts.length,
      posts
    });
  } catch (err) {
    console.error('Get posts by topic error:', err);
    res.status(500).json({ error: 'Server error fetching posts by topic' });
  }
};

// @desc    Like a post
// @route   POST /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username email');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if post is expired
    if (checkPostExpiration(post)) {
      return res.status(400).json({ error: 'Cannot like an expired post' });
    }

    // Check if user is the post owner
    if (checkPostOwnership(post, req.user._id)) {
      return res.status(400).json({ error: 'Cannot like your own post' });
    }

    const userId = req.user._id.toString();

    // Check if user already liked the post
    if (post.likedBy.includes(userId)) {
      return res.status(400).json({ error: 'You have already liked this post' });
    }

    // If user has disliked, remove the dislike first
    if (post.dislikedBy.includes(userId)) {
      post.dislikedBy = post.dislikedBy.filter(id => id.toString() !== userId);
      post.dislikes = Math.max(0, post.dislikes - 1);
    }

    // Add like
    post.likedBy.push(userId);
    post.likes += 1;

    await post.save();

    res.json({
      success: true,
      message: 'Post liked successfully',
      likes: post.likes,
      dislikes: post.dislikes
    });
  } catch (err) {
    console.error('Like post error:', err);
    res.status(500).json({ error: 'Server error liking post' });
  }
};

// @desc    Dislike a post
// @route   POST /api/posts/:id/dislike
// @access  Private
const dislikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username email');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if post is expired
    if (checkPostExpiration(post)) {
      return res.status(400).json({ error: 'Cannot dislike an expired post' });
    }

    // Check if user is the post owner
    if (checkPostOwnership(post, req.user._id)) {
      return res.status(400).json({ error: 'Cannot dislike your own post' });
    }

    const userId = req.user._id.toString();

    // Check if user already disliked the post
    if (post.dislikedBy.includes(userId)) {
      return res.status(400).json({ error: 'You have already disliked this post' });
    }

    // If user has liked, remove the like first
    if (post.likedBy.includes(userId)) {
      post.likedBy = post.likedBy.filter(id => id.toString() !== userId);
      post.likes = Math.max(0, post.likes - 1);
    }

    // Add dislike
    post.dislikedBy.push(userId);
    post.dislikes += 1;

    await post.save();

    res.json({
      success: true,
      message: 'Post disliked successfully',
      likes: post.likes,
      dislikes: post.dislikes
    });
  } catch (err) {
    console.error('Dislike post error:', err);
    res.status(500).json({ error: 'Server error disliking post' });
  }
};

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comment
// @access  Private
const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id)
      .populate('author', 'username email')
      .populate('comments.user', 'username');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if post is expired
    if (checkPostExpiration(post)) {
      return res.status(400).json({ error: 'Cannot comment on an expired post' });
    }

    // Add comment
    post.comments.push({
      user: req.user._id,
      text,
      createdAt: new Date()
    });

    await post.save();

    // Re-populate to get the new comment's user details
    await post.populate('comments.user', 'username');

    res.json({
      success: true,
      message: 'Comment added successfully',
      comments: post.comments
    });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Server error adding comment' });
  }
};

// @desc    Get most active post per topic (highest likes + dislikes)
// @route   GET /api/posts/topic/:topic/active
// @access  Private
const getMostActivePost = async (req, res) => {
  try {
    const { topic } = req.params;

    // Validate topic
    if (!validateTopic(topic)) {
      return res.status(400).json({ error: `Invalid topic: ${topic}. Must be one of: Politics, Health, Sport, Tech` });
    }

    // Update expired posts before fetching
    await Post.updateExpiredPosts();

    // Find all posts for the topic
    const posts = await Post.find({ topic: topic })
      .populate('author', 'username email');

    if (posts.length === 0) {
      return res.status(404).json({ error: `No posts found for topic: ${topic}` });
    }

    // Find the post with highest total activity (likes + dislikes)
    let mostActivePost = posts[0];
    let maxActivity = mostActivePost.getTotalActivity();

    for (let post of posts) {
      const activity = post.getTotalActivity();
      if (activity > maxActivity) {
        maxActivity = activity;
        mostActivePost = post;
      }
    }

    res.json({
      success: true,
      topic,
      totalActivity: maxActivity,
      post: mostActivePost
    });
  } catch (err) {
    console.error('Get most active post error:', err);
    res.status(500).json({ error: 'Server error fetching most active post' });
  }
};

// @desc    Get expired posts per topic
// @route   GET /api/posts/topic/:topic/expired
// @access  Private
const getExpiredPosts = async (req, res) => {
  try {
    const { topic } = req.params;

    // Validate topic
    if (!validateTopic(topic)) {
      return res.status(400).json({ error: `Invalid topic: ${topic}. Must be one of: Politics, Health, Sport, Tech` });
    }

    // Update expired posts before fetching
    await Post.updateExpiredPosts();

    const posts = await Post.find({
      topic: topic,
      status: 'Expired'
    })
      .populate('author', 'username email')
      .sort({ expirationTime: -1 });

    res.json({
      success: true,
      topic,
      count: posts.length,
      posts
    });
  } catch (err) {
    console.error('Get expired posts error:', err);
    res.status(500).json({ error: 'Server error fetching expired posts' });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  getPostsByTopic,
  likePost,
  dislikePost,
  addComment,
  getMostActivePost,
  getExpiredPosts
};
