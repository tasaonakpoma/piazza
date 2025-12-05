const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
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
  postId: {
    type: String,
    unique: true,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  topic: [{
    type: String,
    enum: ['Politics', 'Health', 'Sport', 'Tech'],
    required: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorUsername: {
    type: String,
    required: true
  },
  expirationTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Live', 'Expired'],
    default: 'Live'
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to auto-update status based on expiration
postSchema.pre('save', function (next) {
  if (this.expirationTime && new Date() > this.expirationTime) {
    this.status = 'Expired';
  }
  next();
});

// Virtual to check if post is expired
postSchema.virtual('isExpired').get(function () {
  return this.expirationTime && new Date() > this.expirationTime;
});

// Method to get total activity (likes + dislikes)
postSchema.methods.getTotalActivity = function () {
  return this.likes + this.dislikes;
};

// Static method to update expired posts
postSchema.statics.updateExpiredPosts = async function () {
  const now = new Date();
  await this.updateMany(
    { expirationTime: { $lt: now }, status: 'Live' },
    { $set: { status: 'Expired' } }
  );
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
