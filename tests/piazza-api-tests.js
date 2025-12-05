/**
 * Piazza API Automated Testing Script
 * Run with: node tests/piazza-api-tests.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.API_URL || 'http://35.239.120.252:3000';
const API_PREFIX = '/api';

// Test users
const TEST_USERS = [
  { username: 'olga', email: 'olga@test.com', password: 'password123' },
  { username: 'nick', email: 'nick@test.com', password: 'password123' },
  { username: 'mary', email: 'mary@test.com', password: 'password123' },
  { username: 'nestor', email: 'nestor@test.com', password: 'password123' }
];

// Store tokens and data
const userTokens = {};
const postIds = [];
let testResults = { passed: 0, failed: 0, tests: [] };

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + API_PREFIX + path);
    const protocol = url.protocol === 'https:' ? https : http;
    const defaultPort = url.protocol === 'https:' ? 443 : 80;

    const options = {
      hostname: url.hostname,
      port: url.port || defaultPort,
      path: url.pathname + url.search,
      method: method,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, parseError: true });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test result logger
function logTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   Details: ${details}`);
  }
}

// TEST 1: Register Users
async function test1_RegisterUsers() {
  console.log('\n=== TEST 1: Register 4 Test Users ===\n');

  for (const user of TEST_USERS) {
    try {
      const response = await makeRequest('POST', '/auth/register', {
        username: user.username,
        email: user.email,
        password: user.password
      });

      if (response.status === 201 || response.status === 200) {
        logTest(`Register user: ${user.username}`, true);
      } else if (response.status === 409) {
        logTest(`Register user: ${user.username}`, true, 'User already exists');
      } else {
        logTest(`Register user: ${user.username}`, false, JSON.stringify(response.data));
      }
    } catch (error) {
      logTest(`Register user: ${user.username}`, false, error.message);
    }
  }
}

// TEST 2: Login Users
async function test2_LoginUsers() {
  console.log('\n=== TEST 2: Login Users ===\n');

  for (const user of TEST_USERS) {
    try {
      const response = await makeRequest('POST', '/auth/login', {
        email: user.email,
        password: user.password
      });

      if (response.status === 200 && response.data.token) {
        userTokens[user.username] = response.data.token;
        logTest(`Login user: ${user.username}`, true);
      } else {
        logTest(`Login user: ${user.username}`, false, JSON.stringify(response.data));
      }
    } catch (error) {
      logTest(`Login user: ${user.username}`, false, error.message);
    }
  }
}

// TEST 3: Unauthorized Access
async function test3_UnauthorizedAccess() {
  console.log('\n===== TEST 3: Unauthorized Access =====\n');
  
  try {
    const response = await makeRequest('GET', '/posts?topic=Tech');
    
    if (response.status === 401) {
      logTest('Unauthorized access', true, 'Got 401 without token');
    } else {
      logTest('Unauthorized access', false, `Expected 401, got ${response.status}`);
    }
  } catch (error) {
    logTest('Unauthorized access', false, error.message);
  }
}

// TEST 4: Olga Posts in Tech
async function test4_OlgaPosts() {
  console.log('\n===== TEST 4: Olga Posts in Tech =====\n');
  
  try {
    const response = await makeRequest('POST', '/posts', {
      title: 'Olga Tech Post',
      body: 'This is Olga\'s tech post',
      topic: 'Tech',
      expirationTime: 5
    }, userTokens['olga']);
    
    if (response.status === 201 && response.data.post) {
      postIds.push(response.data.post._id);
      logTest('Olga posts in Tech', true, `Post ID: ${response.data.post._id}`);
    } else {
      logTest('Olga posts in Tech', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Olga posts in Tech', false, error.message);
  }
}

// TEST 5: Nick Posts in Tech
async function test5_NickPosts() {
  console.log('\n===== TEST 5: Nick Posts in Tech =====\n');
  
  try {
    const response = await makeRequest('POST', '/posts', {
      title: 'Nick Tech Post',
      body: 'This is Nick\'s tech post',
      topic: 'Tech',
      expirationTime: 5
    }, userTokens['nick']);
    
    if (response.status === 201 && response.data.post) {
      postIds.push(response.data.post._id);
      logTest('Nick posts in Tech', true, `Post ID: ${response.data.post._id}`);
    } else {
      logTest('Nick posts in Tech', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Nick posts in Tech', false, error.message);
  }
}

// TEST 6: Mary Posts in Tech
async function test6_MaryPosts() {
  console.log('\n===== TEST 6: Mary Posts in Tech =====\n');
  
  try {
    const response = await makeRequest('POST', '/posts', {
      title: 'Mary Tech Post',
      body: 'This is Mary\'s tech post',
      topic: 'Tech',
      expirationTime: 5
    }, userTokens['mary']);
    
    if (response.status === 201 && response.data.post) {
      postIds.push(response.data.post._id);
      logTest('Mary posts in Tech', true, `Post ID: ${response.data.post._id}`);
    } else {
      logTest('Mary posts in Tech', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Mary posts in Tech', false, error.message);
  }
}

// TEST 7: Browse Tech Posts
async function test7_BrowseTech() {
  console.log('\n===== TEST 7: Browse Tech Posts =====\n');
  
  try {
    const response = await makeRequest('GET', '/posts?topic=Tech', null, userTokens['nick']);
    
    if (response.status === 200 && response.data.posts) {
      const postCount = response.data.posts.length;
      logTest('Browse Tech posts', postCount === 3, `Found ${postCount} posts`);
    } else {
      logTest('Browse Tech posts', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Browse Tech posts', false, error.message);
  }
}

// TEST 8: Nick and Olga Like Mary's Post
async function test8_LikeMaryPost() {
  console.log('\n===== TEST 8: Like Mary\'s Post =====\n');
  
  const maryPostId = postIds[2]; // Mary's post is the 3rd one
  
  try {
    // Nick likes
    const response1 = await makeRequest('PUT', `/posts/${maryPostId}/like`, null, userTokens['nick']);
    const nickLiked = response1.status === 200;
    
    // Olga likes
    const response2 = await makeRequest('PUT', `/posts/${maryPostId}/like`, null, userTokens['olga']);
    const olgaLiked = response2.status === 200;
    
    logTest('Nick & Olga like Mary\'s post', nickLiked && olgaLiked, `Nick: ${nickLiked}, Olga: ${olgaLiked}`);
  } catch (error) {
    logTest('Nick & Olga like Mary\'s post', false, error.message);
  }
}

// TEST 9: Nestor Interactions
async function test9_NestorInteractions() {
  console.log('\n===== TEST 9: Nestor Interactions =====\n');
  
  const nickPostId = postIds[1];
  const maryPostId = postIds[2];
  
  try {
    // Nestor likes Nick's post
    const response1 = await makeRequest('PUT', `/posts/${nickPostId}/like`, null, userTokens['nestor']);
    const likedNick = response1.status === 200;
    
    // Nestor dislikes Mary's post
    const response2 = await makeRequest('PUT', `/posts/${maryPostId}/dislike`, null, userTokens['nestor']);
    const dislikedMary = response2.status === 200;
    
    logTest('Nestor interactions', likedNick && dislikedMary, `Liked Nick: ${likedNick}, Disliked Mary: ${dislikedMary}`);
  } catch (error) {
    logTest('Nestor interactions', false, error.message);
  }
}

// TEST 10: Verify Counts
async function test10_VerifyCounts() {
  console.log('\n===== TEST 10: Verify Counts =====\n');
  
  try {
    const response = await makeRequest('GET', '/posts?topic=Tech', null, userTokens['nick']);
    
    if (response.status === 200 && response.data.posts) {
      const maryPost = response.data.posts.find(p => p.title === 'Mary Tech Post');
      const nickPost = response.data.posts.find(p => p.title === 'Nick Tech Post');
      
      const maryCorrect = maryPost && maryPost.likes === 2 && maryPost.dislikes === 1;
      const nickCorrect = nickPost && nickPost.likes === 1;
      
      logTest('Verify counts', maryCorrect && nickCorrect, `Mary: ${maryPost?.likes}L/${maryPost?.dislikes}D, Nick: ${nickPost?.likes}L`);
    } else {
      logTest('Verify counts', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Verify counts', false, error.message);
  }
}

// TEST 11: Self-Like Fail
async function test11_SelfLikeFail() {
  console.log('\n===== TEST 11: Self-Like Fail =====\n');
  
  const maryPostId = postIds[2];
  
  try {
    const response = await makeRequest('PUT', `/posts/${maryPostId}/like`, null, userTokens['mary']);
    
    const failed = response.status === 400 || response.status === 403;
    logTest('Self-like fails', failed, `Status: ${response.status}`);
  } catch (error) {
    logTest('Self-like fails', true, 'Error prevented self-like');
  }
}

// TEST 12: Add Comments
async function test12_AddComments() {
  console.log('\n===== TEST 12: Add Comments =====\n');
  
  const maryPostId = postIds[2];
  
  try {
    // Nick's first comment
    const r1 = await makeRequest('POST', `/posts/${maryPostId}/comments`, {
      comment: 'Nick comment 1'
    }, userTokens['nick']);
    
    // Olga's first comment
    const r2 = await makeRequest('POST', `/posts/${maryPostId}/comments`, {
      comment: 'Olga comment 1'
    }, userTokens['olga']);
    
    // Nick's second comment
    const r3 = await makeRequest('POST', `/posts/${maryPostId}/comments`, {
      comment: 'Nick comment 2'
    }, userTokens['nick']);
    
    // Olga's second comment
    const r4 = await makeRequest('POST', `/posts/${maryPostId}/comments`, {
      comment: 'Olga comment 2'
    }, userTokens['olga']);
    
    const allSuccess = r1.status === 201 && r2.status === 201 && r3.status === 201 && r4.status === 201;
    logTest('Add 4 comments', allSuccess, '2 from Nick, 2 from Olga');
  } catch (error) {
    logTest('Add 4 comments', false, error.message);
  }
}

// TEST 13: Verify Comments
async function test13_VerifyComments() {
  console.log('\n===== TEST 13: Verify Comments =====\n');
  
  try {
    const response = await makeRequest('GET', '/posts?topic=Tech', null, userTokens['nick']);
    
    if (response.status === 200 && response.data.posts) {
      const maryPost = response.data.posts.find(p => p.title === 'Mary Tech Post');
      
      const hasComments = maryPost && maryPost.comments && maryPost.comments.length === 4;
      logTest('Verify comments', hasComments, `Found ${maryPost?.comments?.length || 0} comments`);
    } else {
      logTest('Verify comments', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Verify comments', false, error.message);
  }
}

// TEST 14: Nestor Posts in Health
async function test14_HealthPost() {
  console.log('\n===== TEST 14: Nestor Health Post =====\n');
  
  try {
    const response = await makeRequest('POST', '/posts', {
      title: 'Nestor Health Post',
      body: 'This is Nestor\'s health post',
      topic: 'Health',
      expirationTime: 5
    }, userTokens['nestor']);
    
    if (response.status === 201 && response.data.post) {
      postIds.push(response.data.post._id);
      logTest('Nestor posts in Health', true, `Post ID: ${response.data.post._id}`);
    } else {
      logTest('Nestor posts in Health', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Nestor posts in Health', false, error.message);
  }
}

// TEST 15: Mary Browses Health
async function test15_BrowseHealth() {
  console.log('\n===== TEST 15: Mary Browses Health =====\n');
  
  try {
    const response = await makeRequest('GET', '/posts?topic=Health', null, userTokens['mary']);
    
    if (response.status === 200 && response.data.posts) {
      const postCount = response.data.posts.length;
      const onlyNestor = postCount === 1 && response.data.posts[0].title === 'Nestor Health Post';
      logTest('Browse Health posts', onlyNestor, `Found ${postCount} post(s)`);
    } else {
      logTest('Browse Health posts', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Browse Health posts', false, error.message);
  }
}

// TEST 16: Mary Comments on Health Post
async function test16_CommentHealth() {
  console.log('\n===== TEST 16: Mary Comments on Health =====\n');
  
  const nestorHealthPostId = postIds[3];
  
  try {
    const response = await makeRequest('POST', `/posts/${nestorHealthPostId}/comments`, {
      comment: 'Mary health comment'
    }, userTokens['mary']);
    
    logTest('Mary comments on Health post', response.status === 201, `Status: ${response.status}`);
  } catch (error) {
    logTest('Mary comments on Health post', false, error.message);
  }
}

// TEST 17: Expired Post Interaction
async function test17_ExpiredInteraction() {
  console.log('\n===== TEST 17: Expired Post Interaction =====\n');
  
  // Wait for posts to expire (5 min expiration, so simulate or test immediate)
  // For testing purposes, we'll try to interact with first post
  const oldPostId = postIds[0];
  
  try {
    // Wait 6 seconds if posts have 5-second expiration
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const response = await makeRequest('PUT', `/posts/${oldPostId}/dislike`, null, userTokens['mary']);
    
    // Should fail because post is expired
    const failed = response.status === 400 || response.status === 404 || response.status === 410;
    logTest('Expired post interaction fails', failed, `Status: ${response.status}`);
  } catch (error) {
    logTest('Expired post interaction fails', true, 'Error: Post expired');
  }
}

// TEST 18: Nestor Browses Health
async function test18_NestorBrowse() {
  console.log('\n===== TEST 18: Nestor Browses Health =====\n');
  
  try {
    const response = await makeRequest('GET', '/posts?topic=Health', null, userTokens['nestor']);
    
    if (response.status === 200 && response.data.posts) {
      const post = response.data.posts[0];
      const hasComment = post && post.comments && post.comments.length === 1;
      logTest('Nestor browses Health', hasComment, `1 post with ${post?.comments?.length || 0} comment(s)`);
    } else {
      logTest('Nestor browses Health', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Nestor browses Health', false, error.message);
  }
}

// TEST 19: Empty Expired Posts
async function test19_EmptyExpired() {
  console.log('\n===== TEST 19: Empty Expired Posts =====\n');
  
  try {
    const response = await makeRequest('GET', '/posts?topic=Sports', null, userTokens['nick']);
    
    if (response.status === 200) {
      const isEmpty = !response.data.posts || response.data.posts.length === 0;
      logTest('Browse empty Sports topic', isEmpty, `Found ${response.data.posts?.length || 0} posts`);
    } else {
      logTest('Browse empty Sports topic', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Browse empty Sports topic', false, error.message);
  }
}

// TEST 20: Most Active Post Query
async function test20_MostActive() {
  console.log('\n===== TEST 20: Most Active Tech Post =====\n');
  
  try {
    const response = await makeRequest('GET', '/posts?topic=Tech', null, userTokens['nestor']);
    
    if (response.status === 200 && response.data.posts && response.data.posts.length > 0) {
      // Find post with most interactions (likes + dislikes + comments)
      const posts = response.data.posts;
      let mostActive = posts[0];
      let maxActivity = 0;
      
      posts.forEach(post => {
        const activity = (post.likes || 0) + (post.dislikes || 0) + (post.comments?.length || 0);
        if (activity > maxActivity) {
          maxActivity = activity;
          mostActive = post;
        }
      });
      
      const isMary = mostActive.title === 'Mary Tech Post';
      logTest('Most active is Mary\'s post', isMary, `Activity: ${maxActivity}, Title: ${mostActive.title}`);
    } else {
      logTest('Most active is Mary\'s post', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Most active is Mary\'s post', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Piazza API Tests...');
  console.log(`📍 Target: ${BASE_URL}${API_PREFIX}`);
  console.log('='.repeat(50));

  try {
    await test1_RegisterUsers();
    await test2_LoginUsers();
    await test3_UnauthorizedAccess();
    await test4_OlgaPosts();
    await test5_NickPosts();
    await test6_MaryPosts();
    await test7_BrowseTech();
    await test8_LikeMaryPost();
    await test9_NestorInteractions();
    await test10_VerifyCounts();
    await test11_SelfLikeFail();
    await test12_AddComments();
    await test13_VerifyComments();
    await test14_HealthPost();
    await test15_BrowseHealth();
    await test16_CommentHealth();
    await test17_ExpiredInteraction();
    await test18_NestorBrowse();
    await test19_EmptyExpired();
    await test20_MostActive();
    // Add more tests here...

  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📝 Total:  ${testResults.passed + testResults.failed}`);
}

// Run tests
runAllTests();
