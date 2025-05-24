const express = require("express")
const { body, validationResult } = require("express-validator")
const Organization = require("../models/Organization")
const User = require("../models/User")
const Invite = require("../models/Invite")
const { auth, authorize } = require("../middleware/auth")

const router = express.Router()

// Get current organization
router.get("/me", auth, async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization._id)

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" })
    }

    res.json({ organization })
  } catch (error) {
    console.error("Get organization error:", error)
    res.status(500).json({ message: "Server error while fetching organization" })
  }
})

// Update organization settings
router.put(
  "/me",
  auth,
  authorize("admin"),
  [
    body("name").optional().trim().isLength({ min: 1, max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),
    body("settings.theme").optional().isIn(["light", "dark", "auto"]),
    body("settings.allowMemberInvites").optional().isBoolean(),
    body("settings.taskCategories").optional().isArray(),
    body("settings.taskPriorities").optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const updates = {}
      const allowedFields = ["name", "description", "settings"]

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (field === "settings") {
            updates.settings = { ...req.user.organization.settings, ...req.body.settings }
          } else {
            updates[field] = req.body[field]
          }
        }
      })

      const organization = await Organization.findByIdAndUpdate(req.user.organization._id, updates, {
        new: true,
        runValidators: true,
      })

      res.json({
        message: "Organization updated successfully",
        organization,
      })
    } catch (error) {
      console.error("Update organization error:", error)
      res.status(500).json({ message: "Server error while updating organization" })
    }
  },
)

// Get organization members
router.get("/members", auth, authorize("admin", "manager"), async (req, res) => {
  try {
    const members = await User.find({
      organization: req.user.organization._id,
      isActive: true,
    })
      .select("-password")
      .sort({ createdAt: -1 })

    const memberStats = await User.aggregate([
      { $match: { organization: req.user.organization._id, isActive: true } },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ])

    res.json({
      members,
      stats: memberStats,
      total: members.length,
    })
  } catch (error) {
    console.error("Get members error:", error)
    res.status(500).json({ message: "Server error while fetching members" })
  }
})

// Update member role
router.put(
  "/members/:userId/role",
  auth,
  authorize("admin"),
  [body("role").isIn(["admin", "manager", "member"])],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { userId } = req.params
      const { role } = req.body

      // Prevent user from changing their own role
      if (userId === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot change your own role" })
      }

      const user = await User.findOne({
        _id: userId,
        organization: req.user.organization._id,
      })

      if (!user) {
        return res.status(404).json({ message: "User not found in organization" })
      }

      user.role = role
      await user.save()

      res.json({
        message: "User role updated successfully",
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      })
    } catch (error) {
      console.error("Update member role error:", error)
      res.status(500).json({ message: "Server error while updating member role" })
    }
  },
)

// Deactivate member
router.put("/members/:userId/deactivate", auth, authorize("admin"), async (req, res) => {
  try {
    const { userId } = req.params

    // Prevent user from deactivating themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot deactivate your own account" })
    }

    const user = await User.findOne({
      _id: userId,
      organization: req.user.organization._id,
    })

    if (!user) {
      return res.status(404).json({ message: "User not found in organization" })
    }

    user.isActive = false
    await user.save()

    res.json({ message: "User deactivated successfully" })
  } catch (error) {
    console.error("Deactivate member error:", error)
    res.status(500).json({ message: "Server error while deactivating member" })
  }
})

// Send invitation
router.post(
  "/invite",
  auth,
  authorize("admin", "manager"),
  [
    body("email").isEmail().normalizeEmail(),
    body("role").isIn(["admin", "manager", "member"]),
    body("message").optional().trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, role, message } = req.body

      // Check if user already exists in the organization
      const existingUser = await User.findOne({
        email,
        organization: req.user.organization._id,
      })

      if (existingUser) {
        return res.status(400).json({
          message: "User is already a member of this organization",
        })
      }

      // Check if there's already a pending invite
      const existingInvite = await Invite.findOne({
        email,
        organization: req.user.organization._id,
        status: "pending",
      })

      if (existingInvite) {
        return res.status(400).json({
          message: "An invitation has already been sent to this email",
        })
      }

      // Create invitation
      const invite = new Invite({
        email,
        organization: req.user.organization._id,
        invitedBy: req.user._id,
        role,
        message,
      })

      await invite.save()

      res.status(201).json({
        message: "Invitation sent successfully",
        invite: {
          _id: invite._id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
        },
      })
    } catch (error) {
      console.error("Create invite error:", error)
      res.status(500).json({ message: "Server error while creating invitation" })
    }
  },
)

// Get organization statistics
router.get("/stats", auth, authorize("admin", "manager"), async (req, res) => {
  try {
    const organizationId = req.user.organization._id

    // Get member count by role
    const memberStats = await User.aggregate([
      { $match: { organization: organizationId, isActive: true } },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ])

    // Get task statistics
    const Task = require("../models/Task")
    const taskStats = await Task.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentActivity = await Task.aggregate([
      {
        $match: {
          organization: organizationId,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    res.json({
      members: memberStats,
      tasks: taskStats,
      activity: recentActivity,
    })
  } catch (error) {
    console.error("Get organization stats error:", error)
    res.status(500).json({ message: "Server error while fetching organization statistics" })
  }
})

module.exports = router
