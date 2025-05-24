const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).populate("organization").select("-password")

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid token or user inactive." })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token." })
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." })
    }
    res.status(500).json({ message: "Server error during authentication." })
  }
}

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
      })
    }

    next()
  }
}

// Organization isolation middleware
const organizationAccess = async (req, res, next) => {
  try {
    const { organizationId } = req.params

    if (organizationId && organizationId !== req.user.organization._id.toString()) {
      return res.status(403).json({
        message: "Access denied. Organization mismatch.",
      })
    }

    next()
  } catch (error) {
    res.status(500).json({ message: "Server error during organization check." })
  }
}

module.exports = { auth, authorize, organizationAccess }
