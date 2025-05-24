const express = require("express")
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Get current user profile
router.get("/profile", auth, async (req, res) => {
  try {
    res.json({ user: req.user })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Server error while fetching profile" })
  }
})

// Update user profile
router.put(
  "/profile",
  auth,
  [
    body("firstName").optional().trim().isLength({ min: 1, max: 50 }),
    body("lastName").optional().trim().isLength({ min: 1, max: 50 }),
    body("email").optional().isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { firstName, lastName, email } = req.body
      const updates = {}

      if (firstName) updates.firstName = firstName
      if (lastName) updates.lastName = lastName
      if (email && email !== req.user.email) {
        // Check if email is already taken
        const existingUser = await User.findOne({
          email,
          _id: { $ne: req.user._id },
        })

        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" })
        }
        updates.email = email
      }

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      })
        .populate("organization")
        .select("-password")

      res.json({
        message: "Profile updated successfully",
        user,
      })
    } catch (error) {
      console.error("Update profile error:", error)
      res.status(500).json({ message: "Server error while updating profile" })
    }
  },
)

// Change password
router.put(
  "/password",
  auth,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { currentPassword, newPassword } = req.body

      // Get user with password
      const user = await User.findById(req.user._id)

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword)
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" })
      }

      // Update password
      user.password = newPassword
      await user.save()

      res.json({ message: "Password updated successfully" })
    } catch (error) {
      console.error("Change password error:", error)
      res.status(500).json({ message: "Server error while changing password" })
    }
  },
)

// Get user notifications
router.get("/notifications", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("notifications")

    // Sort notifications by creation date (newest first)
    const notifications = user.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    res.json({ notifications })
  } catch (error) {
    console.error("Get notifications error:", error)
    res.status(500).json({ message: "Server error while fetching notifications" })
  }
})

// Mark notification as read
router.put("/notifications/:notificationId/read", auth, async (req, res) => {
  try {
    const { notificationId } = req.params

    const user = await User.findById(req.user._id)
    const notification = user.notifications.id(notificationId)

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" })
    }

    notification.read = true
    await user.save()

    res.json({ message: "Notification marked as read" })
  } catch (error) {
    console.error("Mark notification read error:", error)
    res.status(500).json({ message: "Server error while marking notification as read" })
  }
})

// Mark all notifications as read
router.put("/notifications/read-all", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        "notifications.$[].read": true,
      },
    })

    res.json({ message: "All notifications marked as read" })
  } catch (error) {
    console.error("Mark all notifications read error:", error)
    res.status(500).json({ message: "Server error while marking all notifications as read" })
  }
})

// Delete notification
router.delete("/notifications/:notificationId", auth, async (req, res) => {
  try {
    const { notificationId } = req.params

    const user = await User.findById(req.user._id)
    user.notifications.id(notificationId).remove()
    await user.save()

    res.json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Delete notification error:", error)
    res.status(500).json({ message: "Server error while deleting notification" })
  }
})

// Get user activity/stats
router.get("/stats", auth, async (req, res) => {
  try {
    const Task = require("../models/Task")

    // Get user's task statistics
    const taskStats = await Task.aggregate([
      { $match: { assignedTo: req.user._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    // Get tasks completed this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const completedThisMonth = await Task.countDocuments({
      assignedTo: req.user._id,
      status: "completed",
      completedAt: { $gte: startOfMonth },
    })

    // Get average completion time
    const completedTasks = await Task.find({
      assignedTo: req.user._id,
      status: "completed",
      completedAt: { $exists: true },
    }).select("createdAt completedAt")

    let avgCompletionTime = 0
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, task) => {
        return sum + (new Date(task.completedAt) - new Date(task.createdAt))
      }, 0)
      avgCompletionTime = Math.round(totalTime / completedTasks.length / (1000 * 60 * 60 * 24)) // in days
    }

    res.json({
      tasksByStatus: taskStats,
      completedThisMonth,
      avgCompletionTime,
      totalCompleted: completedTasks.length,
    })
  } catch (error) {
    console.error("Get user stats error:", error)
    res.status(500).json({ message: "Server error while fetching user statistics" })
  }
})

module.exports = router
