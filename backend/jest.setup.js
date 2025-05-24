const jest = require("jest")

// Global test setup
process.env.NODE_ENV = "test"
process.env.JWT_SECRET = "test-jwt-secret"
process.env.MONGODB_TEST_URI = "mongodb://localhost:27017/task-platform-test"

// Increase timeout for database operations
jest.setTimeout(30000)
