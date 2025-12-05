# Piazza API Test Guide

## Unable to Run Tests? Follow These Steps

### Quick Fix - Common Issues

#### Issue 1: "npm test" command not working
**Solution**: Make sure you're in the correct directory
```bash
cd piazza
npm test
```

#### Issue 2: Server not running
**Error**: `ECONNREFUSED` or connection errors
**Solution**: Start the server first
```bash
# Terminal 1 - Start server
npm start

# Terminal 2 - Run tests  
npm test
```

#### Issue 3: MongoDB connection error
**Error**: `MongoDB connection error`
**Solution**: Check your `.env` file has correct MongoDB URI
```bash
MONGODB_URI=your_mongodb_connection_string_here
```

#### Issue 4: Missing dependencies
**Error**: `Cannot find module`
**Solution**: Install dependencies
```bash
npm install
```

### Step-by-Step Test Execution

#### Method 1: Using npm (Recommended)
```bash
# 1. Clone and navigate to project
cd piazza

# 2. Install dependencies
npm install

# 3. Create/check .env file
cat .env  # Check if it exists and has MongoDB URI

# 4. Start server (Terminal 1)
npm start
# You should see: "Piazza server running on port 3000"
# And: "MongoDB connected successfully"

# 5. Run tests (Terminal 2 - open a NEW terminal)
npm test
```

#### Method 2: Direct node command
```bash
# Run the test file directly
node tests/piazza-api-tests.js
```

#### Method 3: Test against deployed server
If your API is deployed at http://35.239.120.252:3000:
```bash
# The test will automatically use this URL
# Just run:
npm test
```

### Expected Test Output

When tests run successfully, you'll see:
```
🚀 Starting Piazza API Tests...
📍 Target: http://35.239.120.252:3000/api
==================================================

=== TEST 1: Register 4 Test Users ===

✅ PASS: Register user: olga
✅ PASS: Register user: nick
✅ PASS: Register user: mary
✅ PASS: Register user: nestor

=== TEST 2: Login Users ===

✅ PASS: Login user: olga
✅ PASS: Login user: nick
... (continues for all 20 tests)

==================================================
📊 TEST SUMMARY
==================================================
✅ Passed: 20
❌ Failed: 0
📝 Total: 20
```

### Troubleshooting by Error Message

#### "ECONNREFUSED"
- Server is not running
- Start with `npm start` first

#### "Invalid token" or "Not authorized"
- JWT_SECRET not set in .env
- Add: `JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345`

#### "User already exists"
- This is OK! Tests handle existing users
- The test will pass either way

#### "MongoDB connection error"
- Check MongoDB URI in .env
- Verify your IP is whitelisted in MongoDB Atlas
- Check database name is correct

### Environment Variables Required

Make sure your `.env` file contains:
```
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
NODE_ENV=development
```

### Testing Individual Scenarios

To test only TC1 (Register Users), modify the test file to comment out other tests:

```javascript
// In piazza-api-tests.js, comment out tests you don't want:
async function runAllTests() {
  await test1_RegisterUsers();  // TC1 - Keep this
  // await test2_LoginUsers();   // Comment out others
  // await test3_UnauthorizedAccess();
  // ... etc
}
```

### Alternative: Use curl to test manually

Test TC1 (Register Users) manually:
```bash
# Register Olga
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"olga","email":"olga@test.com","password":"password123"}'

# Register Nick
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"nick","email":"nick@test.com","password":"password123"}'

# Register Mary
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"mary","email":"mary@test.com","password":"password123"}'

# Register Nestor
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"nestor","email":"nestor@test.com","password":"password123"}'
```

Expected response for each:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "olga",
    "email": "olga@test.com"
  }
}
```

### Still Having Issues?

1. **Check server logs**: Look at the terminal where `npm start` is running
2. **Check test file**: Verify `tests/piazza-api-tests.js` exists
3. **Check package.json**: Verify test script exists: `"test": "node tests/piazza-api-tests.js"`
4. **Check Node version**: Run `node --version` (should be v16+ recommended)
5. **Check npm version**: Run `npm --version`

### Need Help?

1. Note the exact error message you're seeing
2. Check if server is running: `curl http://localhost:3000/health`
3. Verify MongoDB connection in server logs
4. Make sure PORT 3000 is not being used by another process
