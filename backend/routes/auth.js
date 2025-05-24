const express = require("express")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const Organization = require("../models/Organization")
const Invite = require("../models/Invite")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" })
}

// Create organization slug
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

// Register new user with organization
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").trim().isLength({ min: 1 }),
    body("lastName").trim().isLength({ min: 1 }),
    body("organizationName").optional().trim().isLength({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password, firstName, lastName, organizationName, inviteToken } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" })
      }

      let organization
      let userRole = "member"

      if (inviteToken) {
        // Join existing organization via invite
        const invite = await Invite.findOne({
          token: inviteToken,
          status: "pending",
          email: email,
        }).populate("organization")

        if (!invite || invite.isExpired) {
          return res.status(400).json({ message: "Invalid or expired invite" })
        }

        organization = invite.organization
        userRole = invite.role

        // Mark invite as accepted
        invite.status = "accepted"
        invite.acceptedAt = new Date()
        await invite.save()
      } else if (organizationName) {
        // Create new organization
        const slug = createSlug(organizationName)

        // Check if organization slug exists
        const existingOrg = await Organization.findOne({ slug })
        if (existingOrg) {
          return res.status(400).json({ message: "Organization name already taken" })
        }

        organization = new Organization({
          name: organizationName,
          slug,
        })
        await organization.save()
        userRole = "admin" // First user becomes admin
      } else {
        return res.status(400).json({
          message: "Either provide organization name or invite token",
        })
      }

      // Create user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        organization: organization._id,
        role: userRole,
      })

      await user.save()

      // Generate token
      const token = generateToken(user._id)

      // Populate user for response
      await user.populate("organization")

      res.status(201).json({
        message: "User registered successfully",
        token,
        user,
      })
    } catch (error) {
      console.error("Registration error:", error)
      res.status(500).json({ message: "Server error during registration" })
    }
  },
)

// Login
router.post("/login", [body("email").isEmail().normalizeEmail(), body("password").exists()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email, isActive: true }).populate("organization")

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.json({
      message: "Login successful",
      token,
      user,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
})

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    res.json({ user: req.user })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Refresh token
router.post("/refresh", auth, async (req, res) => {
  try {
    const token = generateToken(req.user._id)
    res.json({ token })
  } catch (error) {
    console.error("Token refresh error:", error)
    res.status(500).json({ message: "Server error during token refresh" })
  }
})

// Logout (client-side token removal)
router.post("/logout", auth, async (req, res) => {
  try {
    res.json({ message: "Logout successful" })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({ message: "Server error during logout" })
  }
})

module.exports = router
