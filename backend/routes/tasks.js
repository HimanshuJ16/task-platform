const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Task = require("../models/Task")
const User = require("../models/User")
const { auth, authorize } = require("../middleware/auth")

const router = express.Router()

// Get all tasks for organization with filtering and pagination
router.get(
  "/",
  auth,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status").optional().isIn(["todo", "in_progress", "completed", "expired"]),
    query("priority").optional().isIn(["low", "medium", "high", "critical"]),
    query("category").optional().isIn(["bug", "feature", "improvement", "documentation"]),
    query("assignedTo").optional().isMongoId(),
    query("search").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const {
        page = 1,
        limit = 20,
        status,
        priority,
        category,
        assignedTo,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query

      // Build filter query
      const filter = { organization: req.user.organization._id }

      // Role-based filtering
      if (req.user.role === "member") {
        filter.assignedTo = req.user._id
      }

      if (status) filter.status = status
      if (priority) filter.priority = priority
      if (category) filter.category = category
      if (assignedTo) filter.assignedTo = assignedTo

      // Search functionality
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ]
      }

      // Sort options
      const sortOptions = {}
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1

      // Execute query with pagination
      const skip = (page - 1) * limit
      const tasks = await Task.find(filter)
        .populate("assignedTo", "firstName lastName email")
        .populate("createdBy", "firstName lastName email")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number.parseInt(limit))

      const total = await Task.countDocuments(filter)

      res.json({
        tasks,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: Number.parseInt(limit),
        },
      })
    } catch (error) {
      console.error("Get tasks error:", error)
      res.status(500).json({ message: "Server error while fetching tasks" })
    }
  },
)

// Get task statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const filter = { organization: req.user.organization._id }

    // Role-based filtering
    if (req.user.role === "member") {
      filter.assignedTo = req.user._id
    }

    const stats = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", new Date()] },
                    { $ne: ["$status", "completed"] },
                    { $ne: ["$status", "expired"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])

    const categoryStats = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ])

    const priorityStats = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ])

    res.json({
      overview: stats[0] || {
        total: 0,
        todo: 0,
        inProgress: 0,
        completed: 0,
        expired: 0,
        overdue: 0,
      },
      byCategory: categoryStats,
      byPriority: priorityStats,
    })
  } catch (error) {
    console.error("Get task stats error:", error)
    res.status(500).json({ message: "Server error while fetching task statistics" })
  }
})

// Get single task
router.get("/:id", auth, async (req, res) => {
  try {
    const filter = {
      _id: req.params.id,
      organization: req.user.organization._id,
    }

    // Role-based filtering
    if (req.user.role === "member") {
      filter.assignedTo = req.user._id
    }

    const task = await Task.findOne(filter)
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy", "firstName lastName email")
      .populate("comments.user", "firstName lastName email")

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    res.json({ task })
  } catch (error) {
    console.error("Get task error:", error)
    res.status(500).json({ message: "Server error while fetching task" })
  }
})

// Create new task
router.post(
  "/",
  auth,
  authorize("admin", "manager"),
  [
    body("title").trim().isLength({ min: 1, max: 200 }),
    body("description").optional().trim().isLength({ max: 2000 }),
    body("priority").optional().isIn(["low", "medium", "high", "critical"]),
    body("category").optional().isIn(["bug", "feature", "improvement", "documentation"]),
    body("assignedTo").optional().isMongoId(),
    body("dueDate").isISO8601(),
    body("tags").optional().isArray(),
    body("estimatedHours").optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const {
        title,
        description,
        priority = "medium",
        category = "feature",
        assignedTo,
        dueDate,
        tags = [],
        estimatedHours,
      } = req.body

      // Validate assigned user belongs to same organization
      if (assignedTo) {
        const assignedUser = await User.findOne({
          _id: assignedTo,
          organization: req.user.organization._id,
          isActive: true,
        })

        if (!assignedUser) {
          return res.status(400).json({
            message: "Assigned user not found in organization",
          })
        }
      }

      const task = new Task({
        title,
        description,
        priority,
        category,
        assignedTo,
        createdBy: req.user._id,
        organization: req.user.organization._id,
        dueDate: new Date(dueDate),
        tags,
        estimatedHours,
      })

      await task.save()

      // Populate for response
      await task.populate("assignedTo", "firstName lastName email")
      await task.populate("createdBy", "firstName lastName email")

      // Send notification to assigned user
      if (assignedTo && assignedTo !== req.user._id.toString()) {
        await User.findByIdAndUpdate(assignedTo, {
          $push: {
            notifications: {
              message: `You have been assigned a new task: ${title}`,
              type: "task_assigned",
            },
          },
        })
      }

      res.status(201).json({
        message: "Task created successfully",
        task,
      })
    } catch (error) {
      console.error("Create task error:", error)
      res.status(500).json({ message: "Server error while creating task" })
    }
  },
)

// Update task
router.put(
  "/:id",
  auth,
  [
    body("title").optional().trim().isLength({ min: 1, max: 200 }),
    body("description").optional().trim().isLength({ max: 2000 }),
    body("status").optional().isIn(["todo", "in_progress", "completed"]),
    body("priority").optional().isIn(["low", "medium", "high", "critical"]),
    body("category").optional().isIn(["bug", "feature", "improvement", "documentation"]),
    body("assignedTo").optional().isMongoId(),
    body("dueDate").optional().isISO8601(),
    body("tags").optional().isArray(),
    body("actualHours").optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const filter = {
        _id: req.params.id,
        organization: req.user.organization._id,
      }

      // Role-based access control
      if (req.user.role === "member") {
        filter.assignedTo = req.user._id
      }

      const task = await Task.findOne(filter)
      if (!task) {
        return res.status(404).json({ message: "Task not found" })
      }

      // Members can only update status and actualHours
      const allowedUpdates = req.user.role === "member" ? ["status", "actualHours"] : Object.keys(req.body)

      const updates = {}
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field]
        }
      })

      // Validate assigned user if being updated
      if (updates.assignedTo) {
        const assignedUser = await User.findOne({
          _id: updates.assignedTo,
          organization: req.user.organization._id,
          isActive: true,
        })

        if (!assignedUser) {
          return res.status(400).json({
            message: "Assigned user not found in organization",
          })
        }
      }

      // Update task
      Object.assign(task, updates)
      await task.save()

      // Populate for response
      await task.populate("assignedTo", "firstName lastName email")
      await task.populate("createdBy", "firstName lastName email")

      res.json({
        message: "Task updated successfully",
        task,
      })
    } catch (error) {
      console.error("Update task error:", error)
      res.status(500).json({ message: "Server error while updating task" })
    }
  },
)

// Add comment to task
router.post("/:id/comments", auth, [body("content").trim().isLength({ min: 1, max: 1000 })], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const filter = {
      _id: req.params.id,
      organization: req.user.organization._id,
    }

    // Role-based filtering
    if (req.user.role === "member") {
      filter.assignedTo = req.user._id
    }

    const task = await Task.findOne(filter)
    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    task.comments.push({
      user: req.user._id,
      content: req.body.content,
    })

    await task.save()

    // Populate the new comment
    await task.populate("comments.user", "firstName lastName email")

    res.json({
      message: "Comment added successfully",
      comment: task.comments[task.comments.length - 1],
    })
  } catch (error) {
    console.error("Add comment error:", error)
    res.status(500).json({ message: "Server error while adding comment" })
  }
})

// Delete task
router.delete("/:id", auth, authorize("admin", "manager"), async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organization._id,
    })

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    res.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Delete task error:", error)
    res.status(500).json({ message: "Server error while deleting task" })
  }
})

module.exports = router
