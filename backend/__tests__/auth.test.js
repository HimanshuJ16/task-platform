const request = require("supertest")
const mongoose = require("mongoose")
const app = require("../server")
const User = require("../models/User")
const Organization = require("../models/Organization")

describe("Authentication", () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/task-platform-test")
  })

  beforeEach(async () => {
    // Clean database before each test
    await User.deleteMany({})
    await Organization.deleteMany({})
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  describe("POST /api/auth/register", () => {
    it("should register a new user with organization", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        organizationName: "Test Org",
      }

      const response = await request(app).post("/api/auth/register").send(userData).expect(201)

      expect(response.body.message).toBe("User registered successfully")
      expect(response.body.token).toBeDefined()
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.role).toBe("admin")
    })

    it("should not register user with invalid email", async () => {
      const userData = {
        email: "invalid-email",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        organizationName: "Test Org",
      }

      await request(app).post("/api/auth/register").send(userData).expect(400)
    })

    it("should not register user with short password", async () => {
      const userData = {
        email: "test@example.com",
        password: "123",
        firstName: "John",
        lastName: "Doe",
        organizationName: "Test Org",
      }

      await request(app).post("/api/auth/register").send(userData).expect(400)
    })
  })

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create test organization and user
      const org = new Organization({
        name: "Test Org",
        slug: "test-org",
      })
      await org.save()

      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        organization: org._id,
        role: "admin",
      })
      await user.save()
    })

    it("should login with valid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "password123",
      }

      const response = await request(app).post("/api/auth/login").send(loginData).expect(200)

      expect(response.body.message).toBe("Login successful")
      expect(response.body.token).toBeDefined()
      expect(response.body.user.email).toBe(loginData.email)
    })

    it("should not login with invalid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "wrongpassword",
      }

      await request(app).post("/api/auth/login").send(loginData).expect(401)
    })
  })
})
