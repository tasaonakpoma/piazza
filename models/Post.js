const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: String,
  text: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200, trim: true },
  content: { type: String, required: true, maxlength: 2000 },
  topic: {
    type: String,
    enum: ['Politics', 'Health', 'Sport', 'Tech'],
    required: true
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorUsername: String,
  expirationTime: { type: Date, required: true },
  status: { type: String, enum: ['Live', 'Expired'], default: 'Live' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

// Check if post expired
postSchema.methods.isExpired = function() {
  return new Date() > this.expirationTime;
};

// Total engagement score
postSchema.methods.getActivity = function() {
  return this.likes.length + this.dislikes.length;
};

module.exports = mongoose.model('Post', postSchema);
