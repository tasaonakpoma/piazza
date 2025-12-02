# Piazza API - Twitter-like Social Platform

RESTful API for a Twitter-like system supporting posts, likes, dislikes, comments, and topic filtering.

## Features
- User authentication with JWT
- Post creation with topic categorization (Politics, Health, Sport, Tech)
- Post expiration system (5 minutes default)
- Like/dislike functionality
- Comment system
- Topic-based browsing

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Docker & Kubernetes

## Installation

### Local Setup

```
npm install
npm start
```

### With Docker

```
docker build -t piazza-api .
docker run -p 3000:3000 piazza-api
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Posts
- `POST /api/posts` - Create post (Auth required)
- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get single post
- `GET /api/posts/topic/:topic` - Get posts by topic
- `POST /api/posts/:id/like` - Like a post
- `POST /api/posts/:id/dislike` - Dislike a post
- `POST /api/posts/:id/comment` - Comment on post

## Environment Variables

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/piazza
JWT_SECRET=your_secret_key
```

## Author
Tasa Onakpoma - Cloud Computing Coursework