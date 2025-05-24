const mongoose = require("mongoose")

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "completed", "expired"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    category: {
      type: String,
      enum: ["bug", "feature", "improvement", "documentation"],
      default: "feature",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        filename: String,
        url: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        content: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    estimatedHours: {
      type: Number,
      min: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for multi-tenant queries and performance
taskSchema.index({ organization: 1, status: 1 })
taskSchema.index({ organization: 1, assignedTo: 1 })
taskSchema.index({ organization: 1, dueDate: 1 })
taskSchema.index({ organization: 1, createdBy: 1 })
taskSchema.index({ organization: 1, category: 1 })
taskSchema.index({ organization: 1, priority: 1 })

// Compound index for expiry job
taskSchema.index({
  status: 1,
  dueDate: 1,
})

// Virtual for overdue status
taskSchema.virtual("isOverdue").get(function () {
  return this.dueDate < new Date() && this.status !== "completed" && this.status !== "expired"
})

// Update completedAt when status changes to completed
taskSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "completed" && !this.completedAt) {
      this.completedAt = new Date()
    } else if (this.status !== "completed") {
      this.completedAt = undefined
    }
  }
  next()
})

module.exports = mongoose.model("Task", taskSchema)
