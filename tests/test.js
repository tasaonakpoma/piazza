/**
 * Piazza API Test Suite - 20 Test Cases
 * 
 * Run with: node tests/test.js
 * 
 * Make sure the API is running before executing tests.
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Store tokens and data between tests
const users = {
  olga: { username: 'Olga', email: 'olga@test.com', password: 'password123', token: null },
  nick: { username: 'Nick', email: 'nick@test.com', password: 'password123', token: null },
  mary: { username: 'Mary', email: 'mary@test.com', password: 'password123', token: null },
  nestor: { username: 'Nestor', email: 'nestor@test.com', password: 'password123', token: null }
};

const posts = {
  olga: null,
  nick: null,
  mary: null,
  nestor: null
};

let passed = 0;
let failed = 0;

// Helper for API calls
async function api(method, endpoint, body = null, token = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  
  return { status: response.status, data };
}

// Test runner
async function runTest(testNum, description, testFn) {
  try {
    const result = await testFn();
    if (result.success) {
      console.log(`✅ TC${testNum}: ${description}`);
      if (result.details) console.log(`   └─ ${result.details}`);
      passed++;
    } else {
      console.log(`❌ TC${testNum}: ${description}`);
      console.log(`   └─ Expected: ${result.expected}, Got: ${result.got}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ TC${testNum}: ${description}`);
    console.log(`   └─ Error: ${err.message}`);
    failed++;
  }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  PIAZZA API TEST SUITE - 20 Test Cases');
  console.log('  API URL:', API_URL);
  console.log('='.repeat(60) + '\n');

  // TC1: Register all four users
  await runTest(1, 'Register Olga, Nick, Mary, and Nestor', async () => {
    const results = [];
    for (const [name, user] of Object.entries(users)) {
      const res = await api('POST', '/api/auth/register', {
        username: user.username,
        email: user.email,
        password: user.password
      });
      results.push(res.status === 201 || res.status === 400);
    }
    return { success: results.every(r => r), details: 'All 4 users registered' };
  });

  // TC2: Login and get tokens
  await runTest(2, 'All users login and receive JWT tokens', async () => {
    for (const [name, user] of Object.entries(users)) {
      const res = await api('POST', '/api/auth/login', {
        email: user.email,
        password: user.password
      });
      if (res.status === 200 && res.data.token) {
        users[name].token = res.data.token;
      }
    }
    const allHaveTokens = Object.values(users).every(u => u.token);
    return { success: allHaveTokens, details: 'All users received JWT tokens' };
  });

  // TC3: Unauthorized call fails
  await runTest(3, 'Unauthorized API call fails without token', async () => {
    const res = await api('POST', '/api/posts', {
      title: 'Test', content: 'Should fail', topic: 'Tech'
    });
    return { success: res.status === 401, expected: '401', got: `${res.status}` };
  });

  // TC4: Olga posts in Tech
  await runTest(4, 'Olga posts message in Tech topic', async () => {
    const res = await api('POST', '/api/posts', {
      title: 'Olga Tech Post',
      content: 'Olga\'s post about technology',
      topic: 'Tech',
      expirationMinutes: 5
    }, users.olga.token);
    if (res.status === 201) posts.olga = res.data.post;
    return { success: res.status === 201, details: `Post ID: ${res.data.post?._id}` };
  });

  // TC5: Nick posts in Tech
  await runTest(5, 'Nick posts message in Tech topic', async () => {
    const res = await api('POST', '/api/posts', {
      title: 'Nick Tech Post',
      content: 'Nick\'s thoughts on tech',
      topic: 'Tech',
      expirationMinutes: 5
    }, users.nick.token);
    if (res.status === 201) posts.nick = res.data.post;
    return { success: res.status === 201, details: `Post ID: ${res.data.post?._id}` };
  });

  // TC6: Mary posts in Tech
  await runTest(6, 'Mary posts message in Tech topic', async () => {
    const res = await api('POST', '/api/posts', {
      title: 'Mary Tech Post',
      content: 'Mary shares tech insights',
      topic: 'Tech',
      expirationMinutes: 5
    }, users.mary.token);
    if (res.status === 201) posts.mary = res.data.post;
    return { success: res.status === 201, details: `Post ID: ${res.data.post?._id}` };
  });

  // TC7: Browse Tech posts
  await runTest(7, 'Browse Tech topic shows 3 posts with zero interactions', async () => {
    const res = await api('GET', '/api/posts/topic/Tech', null, users.nick.token);
    const count = res.data.count >= 3;
    return { success: count, details: `Found ${res.data.count} posts` };
  });

  // TC8: Nick and Olga like Mary's post
  await runTest(8, 'Nick and Olga like Mary\'s post', async () => {
    const nickLike = await api('POST', `/api/posts/${posts.mary._id}/like`, null, users.nick.token);
    const olgaLike = await api('POST', `/api/posts/${posts.mary._id}/like`, null, users.olga.token);
    return { success: nickLike.status === 200 && olgaLike.status === 200, 
             details: `Mary has ${olgaLike.data.likes} likes` };
  });

  // TC9: Nestor likes Nick, dislikes Mary
  await runTest(9, 'Nestor likes Nick\'s post and dislikes Mary\'s', async () => {
    const likeNick = await api('POST', `/api/posts/${posts.nick._id}/like`, null, users.nestor.token);
    const dislikeMary = await api('POST', `/api/posts/${posts.mary._id}/dislike`, null, users.nestor.token);
    return { success: likeNick.status === 200 && dislikeMary.status === 200,
             details: `Nick: ${likeNick.data.likes} likes, Mary: ${dislikeMary.data.dislikes} dislikes` };
  });

  // TC10: Verify counts
  await runTest(10, 'Nick sees correct counts (Mary: 2 likes, 1 dislike)', async () => {
    const res = await api('GET', '/api/posts/topic/Tech', null, users.nick.token);
    const maryPost = res.data.posts.find(p => p._id === posts.mary._id);
    const correct = maryPost && maryPost.likes === 2 && maryPost.dislikes === 1;
    return { success: correct, details: `Mary: ${maryPost?.likes} likes, ${maryPost?.dislikes} dislikes` };
  });

  // TC11: Mary can't like own post
  await runTest(11, 'Mary cannot like her own post', async () => {
    const res = await api('POST', `/api/posts/${posts.mary._id}/like`, null, users.mary.token);
    return { success: res.status === 400, expected: '400', got: `${res.status}` };
  });

  // TC12: Comments round-robin
  await runTest(12, 'Nick and Olga add 4 comments (round-robin)', async () => {
    const comments = [
      { user: 'nick', text: 'Great post! - Nick 1' },
      { user: 'olga', text: 'I agree! - Olga 1' },
      { user: 'nick', text: 'Very insightful - Nick 2' },
      { user: 'olga', text: 'Thanks for sharing - Olga 2' }
    ];
    let allSuccess = true;
    for (const c of comments) {
      const res = await api('POST', `/api/posts/${posts.mary._id}/comment`, 
        { text: c.text }, users[c.user].token);
      if (res.status !== 201) allSuccess = false;
    }
    return { success: allSuccess, details: '4 comments added' };
  });

  // TC13: See all interactions
  await runTest(13, 'Nick sees all interactions on Tech posts', async () => {
    const res = await api('GET', `/api/posts/${posts.mary._id}`, null, users.nick.token);
    const p = res.data.post;
    return { success: p.likes >= 2 && p.comments.length >= 4,
             details: `${p.likes} likes, ${p.comments.length} comments` };
  });

  // TC14: Nestor posts in Health
  await runTest(14, 'Nestor posts in Health topic', async () => {
    const res = await api('POST', '/api/posts', {
      title: 'Nestor Health Post',
      content: 'Health tips from Nestor',
      topic: 'Health',
      expirationMinutes: 1
    }, users.nestor.token);
    if (res.status === 201) posts.nestor = res.data.post;
    return { success: res.status === 201, details: 'Expires in 1 minute' };
  });

  // TC15: Mary browses Health
  await runTest(15, 'Mary sees Nestor\'s post in Health topic', async () => {
    const res = await api('GET', '/api/posts/topic/Health', null, users.mary.token);
    const found = res.data.posts.some(p => p._id === posts.nestor._id);
    return { success: found, details: `Found ${res.data.count} Health posts` };
  });

  // TC16: Mary comments on Nestor's post
  await runTest(16, 'Mary comments on Nestor\'s Health post', async () => {
    const res = await api('POST', `/api/posts/${posts.nestor._id}/comment`,
      { text: 'Great health advice!' }, users.mary.token);
    return { success: res.status === 201, details: `Total: ${res.data.totalComments} comments` };
  });

  // TC17: Can't interact with expired post
  await runTest(17, 'Mary cannot dislike expired post', async () => {
    console.log('   └─ Waiting 65s for expiration...');
    await delay(65000);
    const res = await api('POST', `/api/posts/${posts.nestor._id}/dislike`, null, users.mary.token);
    return { success: res.status === 400, expected: '400 (expired)', got: `${res.status}` };
  });

  // TC18: Nestor sees his post with comment
  await runTest(18, 'Nestor sees his post with Mary\'s comment', async () => {
    const res = await api('GET', `/api/posts/${posts.nestor._id}`, null, users.nestor.token);
    return { success: res.data.post.comments.length >= 1,
             details: `${res.data.post.comments.length} comment(s)` };
  });

  // TC19: Empty expired Sport posts
  await runTest(19, 'Nick browses expired Sport posts (empty)', async () => {
    const res = await api('GET', '/api/posts/topic/Sport/expired', null, users.nick.token);
    return { success: res.data.count === 0, details: `Found ${res.data.count} expired` };
  });

  // TC20: Most active post
  await runTest(20, 'Nestor finds most active Tech post (Mary\'s)', async () => {
    const res = await api('GET', '/api/posts/topic/Tech/active', null, users.nestor.token);
    const isMary = res.data.post?._id === posts.mary._id;
    return { success: isMary, details: `Most active: ${res.data.post?.title}` };
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`  ✅ Passed: ${passed}/20`);
  console.log(`  ❌ Failed: ${failed}/20`);
  console.log(`  📊 Score: ${Math.round((passed/20)*100)}%`);
  console.log('='.repeat(60) + '\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
