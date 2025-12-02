const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  text: {
    type: String,
    required: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: [2000, 'Content cannot exceed 2000 characters']
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    enum: ['Politics', 'Health', 'Sport', 'Tech'],
    message: 'Topic must be one of: Politics, Health, Sport, Tech'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorUsername: String,
  status: {
    type: String,
    enum: ['Live', 'Expired'],
    default: 'Live'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000)
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

postSchema.virtual('dislikeCount').get(function() {
  return this.dislikes.length;
});

postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

postSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

postSchema.pre('save', function(next) {
  if (this.isExpired()) {
    this.status = 'Expired';
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);
