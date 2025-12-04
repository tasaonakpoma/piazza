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

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Piazza API Tests...');
  console.log(`📍 Target: ${BASE_URL}${API_PREFIX}`);
  console.log('='.repeat(50));

  try {
    await test1_RegisterUsers();
    await test2_LoginUsers();
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
